/**
 * TREVO ONE — TRAINING V2 MEDIA STORAGE ENGINE
 * Handles private disk writes, temporary file staging, atomic finalization,
 * safe streaming byte-counting, path traversal protection, and failure compensation.
 */

import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getPrivateStorageRoot } from "../storage/private-files";
import { validateMediaMagicBytes, type MediaValidationResult } from "./media-file-validation";
import type { SupportedMediaMime } from "./media-config";

export class MediaStorageError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string = "STORAGE_ERROR", statusCode: number = 500) {
    super(message);
    this.name = "MediaStorageError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Resolves the root directory for Training V2 private media.
 * Supports temporary test-only process overrides via TRAINING_MEDIA_STORAGE_ROOT.
 */
export function getTrainingMediaStorageRoot(): string {
  const customOverride = process.env.TRAINING_MEDIA_STORAGE_ROOT?.trim();
  if (customOverride) {
    return path.resolve(customOverride);
  }
  return getPrivateStorageRoot();
}

/**
 * Generates a cryptographically random, unpredictable storage key.
 * Original user filenames are never included.
 */
export function generateRandomStorageKey(
  mediaType: "VIDEO" | "IMAGE",
  extension: string
): string {
  const cleanExt = extension.startsWith(".") ? extension : `.${extension}`;
  const subFolder = mediaType === "VIDEO" ? "videos" : "images";
  const uniqueId = crypto.randomUUID();
  return path.posix.join("training-v2", subFolder, `${uniqueId}${cleanExt}`);
}

/**
 * Resolves and validates a storage key against the private storage root.
 * Strictly prevents directory traversal (e.g. null bytes, .., absolute paths).
 */
export function resolveSafeTrainingMediaPath(storageKey: string): string {
  if (!storageKey || typeof storageKey !== "string" || !storageKey.trim()) {
    throw new MediaStorageError("Chave de armazenamento inválida.", "INVALID_STORAGE_KEY", 400);
  }

  // Prevent null bytes, .., or absolute path markers
  if (storageKey.includes("\0") || storageKey.includes("..") || path.isAbsolute(storageKey)) {
    throw new MediaStorageError("Tentativa de navegação de diretório inválida detectada.", "PATH_TRAVERSAL_DETECTED", 400);
  }

  const root = path.resolve(getTrainingMediaStorageRoot());
  const normalizedKey = storageKey.replace(/^[/\\]+/, "");
  const resolved = path.resolve(root, normalizedKey);

  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw new MediaStorageError("O caminho do arquivo ultrapassa o diretório de armazenamento privado.", "PATH_OUT_OF_BOUNDS", 403);
  }

  return resolved;
}

export type StreamUploadResult = {
  tempFilePath: string;
  sizeBytes: number;
  detectedMime: SupportedMediaMime;
  mediaType: "VIDEO" | "IMAGE";
  extension: string;
};

/**
 * Streams incoming bytes incrementally to a temporary file.
 * Verifies magic bytes early from the initial chunk buffer.
 * Increments and enforces byte count against maxSizeBytes in real time without buffering the whole file in RAM.
 */
export async function streamUploadToTempFile(
  readableStream: ReadableStream<Uint8Array>,
  declaredMimeType: string,
  maxSizeBytes: number
): Promise<StreamUploadResult> {
  const root = getTrainingMediaStorageRoot();
  const tempDir = path.resolve(root, "training-v2", "temp");
  await fs.mkdir(tempDir, { recursive: true });

  const tempFileName = `tmp_${crypto.randomUUID()}.tmp`;
  const tempFilePath = path.join(tempDir, tempFileName);

  const fileWriteStream = createWriteStream(tempFilePath, { flags: "wx" });

  let totalBytes = 0;
  let prefixBuffer = Buffer.alloc(0);
  let magicVerified = false;
  let validationResult: MediaValidationResult | null = null;

  const reader = readableStream.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (value && value.length > 0) {
        const chunk = Buffer.from(value);
        totalBytes += chunk.length;

        // 1. Enforce size limit immediately on streamed bytes
        if (totalBytes > maxSizeBytes) {
          throw new MediaStorageError(
            `O arquivo excede o limite máximo permitido de ${Math.round(maxSizeBytes / (1024 * 1024))} MiB.`,
            "PAYLOAD_TOO_LARGE",
            413
          );
        }

        // 2. Accumulate initial prefix for magic-byte verification
        if (!magicVerified) {
          prefixBuffer = Buffer.concat([prefixBuffer, chunk]);
          if (prefixBuffer.length >= 12) {
            validationResult = validateMediaMagicBytes(prefixBuffer, declaredMimeType);
            if (!validationResult.valid) {
              throw new MediaStorageError(
                validationResult.error || "Formato de arquivo incompatível com a assinatura binária.",
                "UNSUPPORTED_MEDIA_TYPE",
                415
              );
            }
            magicVerified = true;
          }
        }

        // 3. Write chunk to disk
        const canWrite = fileWriteStream.write(chunk);
        if (!canWrite) {
          await new Promise<void>((resolve) => fileWriteStream.once("drain", resolve));
        }
      }
    }

    // Check if stream was empty
    if (totalBytes === 0) {
      throw new MediaStorageError("Nenhum dado foi enviado no corpo da requisição.", "EMPTY_PAYLOAD", 400);
    }

    // If stream ended before 12 bytes were read, attempt validation now
    if (!magicVerified) {
      validationResult = validateMediaMagicBytes(prefixBuffer, declaredMimeType);
      if (!validationResult.valid) {
        throw new MediaStorageError(
          validationResult.error || "Formato de arquivo não reconhecido.",
          "UNSUPPORTED_MEDIA_TYPE",
          415
        );
      }
      magicVerified = true;
    }

    await new Promise<void>((resolve, reject) => {
      fileWriteStream.end((err?: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });

    return {
      tempFilePath,
      sizeBytes: totalBytes,
      detectedMime: validationResult!.detectedMime!,
      mediaType: validationResult!.mediaType!,
      extension: validationResult!.extension!,
    };
  } catch (error) {
    // Cleanup temporary file on any error - wait for stream close to release Windows file handle
    await new Promise<void>((resolve) => {
      fileWriteStream.on("close", () => resolve());
      fileWriteStream.destroy();
    });
    try {
      await fs.unlink(tempFilePath);
    } catch {
      // Ignore if file doesn't exist
    }
    throw error;
  }
}

/**
 * Atomically renames the temporary file to its final randomized storage key.
 */
export async function finalizeStorageFile(
  tempFilePath: string,
  storageKey: string
): Promise<string> {
  const finalPath = resolveSafeTrainingMediaPath(storageKey);
  const targetDir = path.dirname(finalPath);
  await fs.mkdir(targetDir, { recursive: true });

  try {
    await fs.rename(tempFilePath, finalPath);
  } catch (err: unknown) {
    // Fallback if cross-device link
    if (err && typeof err === "object" && "code" in err && err.code === "EXDEV") {
      await fs.copyFile(tempFilePath, finalPath);
      await fs.unlink(tempFilePath);
    } else {
      throw err;
    }
  }

  return finalPath;
}

/**
 * Cleans up a physical file (used for compensation on DB failure or test teardown).
 */
export async function cleanupPhysicalFile(storageKeyOrPath: string): Promise<void> {
  try {
    const targetPath = storageKeyOrPath.includes(path.sep)
      ? storageKeyOrPath
      : resolveSafeTrainingMediaPath(storageKeyOrPath);
    await fs.unlink(targetPath);
  } catch {
    // Ignore ENOENT
  }
}
