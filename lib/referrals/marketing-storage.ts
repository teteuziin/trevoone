import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { getPrivateStorageRoot, resolveSafeStoragePath, sanitizeOriginalFileName } from "@/lib/storage/private-files";

export const MAX_MARKETING_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MiB

export type SupportedMarketingMimeType =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "video/mp4"
  | "video/webm"
  | "video/quicktime"
  | "application/pdf";

export interface MarketingFileValidationResult {
  valid: boolean;
  mimeType?: SupportedMarketingMimeType;
  extension?: string;
  error?: string;
}

/**
 * Validates binary buffer by inspecting magic bytes signature.
 * Enforces: JPEG, PNG, WEBP, MP4, WEBM, QuickTime (MOV), and PDF.
 */
export function detectMarketingFileType(buffer: Buffer): MarketingFileValidationResult {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: "Arquivo vazio." };
  }

  if (buffer.length > MAX_MARKETING_FILE_SIZE_BYTES) {
    return { valid: false, error: "O arquivo excede o limite máximo de 25 MB." };
  }

  // 1. JPEG: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, mimeType: "image/jpeg", extension: ".jpg" };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, mimeType: "image/png", extension: ".png" };
  }

  // 3. WEBP: RIFF (0..3) ... WEBP (8..11)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return { valid: true, mimeType: "image/webp", extension: ".webp" };
  }

  // 4. PDF: %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
  if (
    buffer.length >= 5 &&
    buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46 && buffer[4] === 0x2d
  ) {
    return { valid: true, mimeType: "application/pdf", extension: ".pdf" };
  }

  // 5. MP4 / MOV: bytes 4..7 === 'ftyp'
  if (
    buffer.length >= 12 &&
    buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70
  ) {
    const brand = buffer.toString("ascii", 8, 12);
    if (brand === "qt  ") {
      return { valid: true, mimeType: "video/quicktime", extension: ".mov" };
    }
    return { valid: true, mimeType: "video/mp4", extension: ".mp4" };
  }

  // 6. WEBM / MKV: EBML ID 1A 45 DF A3
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3
  ) {
    return { valid: true, mimeType: "video/webm", extension: ".webm" };
  }

  return {
    valid: false,
    error: "Formato de arquivo não suportado. Envie uma imagem (JPG, PNG, WEBP), vídeo (MP4, WEBM) ou PDF.",
  };
}

export interface SaveMarketingFileParams {
  consultancySlug: string;
  buffer: Buffer;
  originalFileName: string;
}

export interface SaveMarketingFileResult {
  fileStorageKey: string;
  fileSizeBytes: number;
  mimeType: string;
  extension: string;
  originalFileName: string;
}

/**
 * Saves a validated marketing material file to disk.
 */
export async function saveMarketingMaterialFile(
  params: SaveMarketingFileParams
): Promise<SaveMarketingFileResult> {
  const { consultancySlug, buffer, originalFileName } = params;

  const detection = detectMarketingFileType(buffer);
  if (!detection.valid || !detection.mimeType || !detection.extension) {
    throw new Error(detection.error || "Arquivo inválido.");
  }

  const storageRoot = getPrivateStorageRoot();
  const fileId = crypto.randomUUID();
  const cleanSlug = consultancySlug.replace(/[^a-zA-Z0-9_-]/g, "");
  const fileStorageKey = `marketing-materials/${cleanSlug}/${fileId}${detection.extension}`;

  const targetPath = resolveSafeStoragePath(storageRoot, fileStorageKey);
  const dir = path.dirname(targetPath);

  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  await fs.writeFile(targetPath, buffer, { mode: 0o600 });

  return {
    fileStorageKey,
    fileSizeBytes: buffer.length,
    mimeType: detection.mimeType,
    extension: detection.extension,
    originalFileName: sanitizeOriginalFileName(originalFileName),
  };
}
