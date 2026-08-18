import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export const MAX_RECEIPT_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MiB = 5,242,880 bytes

export type SupportedReceiptMimeType =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "application/pdf";

export const SUPPORTED_MIME_TYPES: readonly SupportedReceiptMimeType[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export type FileTypeDetectionResult = {
  valid: boolean;
  mimeType?: SupportedReceiptMimeType;
  extension?: string;
  error?: string;
};

/**
 * Validates binary buffer by inspecting magic bytes signature.
 * Strictly enforces supported formats: JPEG, PNG, WEBP, and PDF.
 * Rejects SVG, HEIC, ZIP, Office docs, executables, and corrupted/unknown binaries.
 */
export function detectReceiptFileType(
  buffer: Buffer,
  clientMimeType?: string
): FileTypeDetectionResult {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: "Arquivo vazio." };
  }

  let detectedMime: SupportedReceiptMimeType | null = null;
  let extension: string | null = null;

  // 1. JPEG signature: FF D8 FF
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    detectedMime = "image/jpeg";
    extension = ".jpg";
  }
  // 2. PNG signature: 89 50 4E 47 0D 0A 1A 0A
  else if (
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
    detectedMime = "image/png";
    extension = ".png";
  }
  // 3. WEBP signature: RIFF (bytes 0..3) ... WEBP (bytes 8..11)
  else if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && // R
    buffer[1] === 0x49 && // I
    buffer[2] === 0x46 && // F
    buffer[3] === 0x46 && // F
    buffer[8] === 0x57 && // W
    buffer[9] === 0x45 && // E
    buffer[10] === 0x42 && // B
    buffer[11] === 0x50 // P
  ) {
    detectedMime = "image/webp";
    extension = ".webp";
  }
  // 4. PDF signature: starts with %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
  else if (
    buffer.length >= 5 &&
    buffer[0] === 0x25 && // %
    buffer[1] === 0x50 && // P
    buffer[2] === 0x44 && // D
    buffer[3] === 0x46 && // F
    buffer[4] === 0x2d // -
  ) {
    detectedMime = "application/pdf";
    extension = ".pdf";
  }

  if (!detectedMime || !extension) {
    return {
      valid: false,
      error: "Formato de arquivo não suportado. Envie um comprovante em JPG, PNG, WEBP ou PDF.",
    };
  }

  // Client MIME consistency validation
  if (clientMimeType && typeof clientMimeType === "string") {
    const normalizedClientMime = clientMimeType.trim().toLowerCase();
    const genericMimes = ["application/octet-stream", "binary/octet-stream", ""];
    if (!genericMimes.includes(normalizedClientMime)) {
      // If client provided a specific MIME type, ensure it doesn't contradict the detected magic bytes
      const isJpegMatch =
        detectedMime === "image/jpeg" &&
        (normalizedClientMime === "image/jpeg" || normalizedClientMime === "image/jpg" || normalizedClientMime === "image/pjpeg");
      const isPngMatch =
        detectedMime === "image/png" &&
        (normalizedClientMime === "image/png" || normalizedClientMime === "image/x-png");
      const isWebpMatch =
        detectedMime === "image/webp" && normalizedClientMime === "image/webp";
      const isPdfMatch =
        detectedMime === "application/pdf" &&
        (normalizedClientMime === "application/pdf" || normalizedClientMime === "application/x-pdf");

      if (!isJpegMatch && !isPngMatch && !isWebpMatch && !isPdfMatch) {
        return {
          valid: false,
          error: "O tipo declarado do arquivo não corresponde ao conteúdo binário detectado.",
        };
      }
    }
  }

  return {
    valid: true,
    mimeType: detectedMime,
    extension,
  };
}

/**
 * Validates receipt buffer size and content integrity.
 */
export function validateReceiptBuffer(
  buffer: Buffer,
  clientMimeType?: string
): FileTypeDetectionResult {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: "Arquivo vazio não permitido." };
  }

  if (buffer.length > MAX_RECEIPT_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: "O arquivo excede o limite máximo permitido de 5 MB.",
    };
  }

  return detectReceiptFileType(buffer, clientMimeType);
}

/**
 * Sanitizes original file name for safe storage and metadata display.
 * Strips path components, control chars, null chars, and trims.
 * Truncates safely to max 255 chars (matching column VARCHAR(255)).
 */
export function sanitizeOriginalFileName(rawName: unknown): string {
  if (typeof rawName !== "string" || !rawName.trim()) {
    return "comprovante";
  }

  // Remove path traversal and directory markers
  const baseName = path.basename(rawName.trim());

  // Remove null bytes, control characters, CR, LF, etc.
  const cleaned = baseName
    .replace(/[\x00-\x1F\x7F]/g, "")
    .replace(/[/\\]/g, "")
    .trim()
    .normalize("NFC");

  if (!cleaned) {
    return "comprovante";
  }

  // Enforce max 255 chars
  return cleaned.slice(0, 255);
}

/**
 * Resolves the private storage root lazily.
 * In production: PRIVATE_STORAGE_ROOT environment variable MUST be explicitly set.
 * In development: falls back to <project_root>/.data/private.
 */
export function getPrivateStorageRoot(): string {
  const envRoot = process.env.PRIVATE_STORAGE_ROOT?.trim();
  if (envRoot) {
    return path.resolve(envRoot);
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "A variável de ambiente PRIVATE_STORAGE_ROOT não está configurada no ambiente de produção."
    );
  }

  return path.resolve(process.cwd(), ".data", "private");
}

/**
 * Resolves and validates a storage key inside the private storage root.
 * Guarantees that target path cannot escape the storage root (path traversal defense).
 */
export function resolveSafeStoragePath(storageRoot: string, storageKey: string): string {
  if (!storageKey || typeof storageKey !== "string" || !storageKey.trim()) {
    throw new Error("Chave de armazenamento inválida.");
  }

  // Ensure key does not contain null bytes or path traversal sequences
  if (
    storageKey.includes("\0") ||
    storageKey.includes("..") ||
    path.isAbsolute(storageKey)
  ) {
    throw new Error("Tentativa de navegação de diretório inválida detectada.");
  }

  const normalizedKey = storageKey.replace(/^[/\\]+/, "");
  const resolved = path.resolve(storageRoot, normalizedKey);

  const normalizedRoot = path.resolve(storageRoot);
  if (!resolved.startsWith(normalizedRoot + path.sep) && resolved !== normalizedRoot) {
    throw new Error("O caminho resolvido ultrapassa o diretório raiz de armazenamento privado.");
  }

  return resolved;
}

export type WritePrivateFileParams = {
  buffer: Buffer;
  extension: string;
  originalFileName: string;
  namespace?: string;
};

export type WritePrivateFileResult = {
  fileStorageKey: string;
  fileSha256: string;
  sizeBytes: number;
  originalFileName: string;
};

/**
 * Writes a validated file buffer to private storage root.
 * Generates a random UUID storage key under the specified namespace.
 * Computes SHA-256 hash server-side.
 */
export async function writePrivateFile(
  params: WritePrivateFileParams
): Promise<WritePrivateFileResult> {
  const { buffer, extension, originalFileName, namespace = "payment-receipts" } = params;

  const storageRoot = getPrivateStorageRoot();
  const fileId = crypto.randomUUID();
  const safeExt = extension.startsWith(".") ? extension : `.${extension}`;
  const cleanNamespace = namespace.replace(/[^a-zA-Z0-9_-]/g, "");

  const fileStorageKey = `${cleanNamespace}/${fileId}${safeExt}`;
  const targetPath = resolveSafeStoragePath(storageRoot, fileStorageKey);

  const fileSha256 = crypto.createHash("sha256").update(buffer).digest("hex");
  const sizeBytes = buffer.length;

  const dir = path.dirname(targetPath);
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  await fs.writeFile(targetPath, buffer, { mode: 0o600 });

  return {
    fileStorageKey,
    fileSha256,
    sizeBytes,
    originalFileName: sanitizeOriginalFileName(originalFileName),
  };
}

/**
 * Best-effort compensation cleanup for a stored file if a DB transaction aborts.
 * Never throws outward and never leaks storage paths.
 */
export async function deletePrivateFile(storageKey: string): Promise<boolean> {
  if (!storageKey || typeof storageKey !== "string" || !storageKey.trim()) {
    return false;
  }

  try {
    const storageRoot = getPrivateStorageRoot();
    const targetPath = resolveSafeStoragePath(storageRoot, storageKey);
    await fs.unlink(targetPath);
    return true;
  } catch {
    return false;
  }
}

export type ReadVerifiedPrivateFileParams = {
  fileStorageKey: string;
  expectedSizeBytes: number;
  expectedFileSha256: string;
  expectedMimeType: string;
};

export type ReadVerifiedPrivateFileResult = {
  success: boolean;
  buffer?: Buffer;
  mimeType?: SupportedReceiptMimeType;
  error?: string;
  code?: "NOT_FOUND" | "INTEGRITY_MISMATCH" | "STORAGE_ERROR";
};

/**
 * Reads a private receipt file and strictly re-verifies its integrity before serving:
 * 1. Safe storage path containment.
 * 2. Exact file size matching DB metadata.
 * 3. Exact SHA-256 hash matching DB metadata.
 * 4. Binary magic bytes signature matching approved receipt types.
 */
export async function readVerifiedPrivateFile(
  params: ReadVerifiedPrivateFileParams
): Promise<ReadVerifiedPrivateFileResult> {
  const { fileStorageKey, expectedSizeBytes, expectedFileSha256, expectedMimeType } = params;

  if (!fileStorageKey || !expectedFileSha256 || !expectedSizeBytes || expectedSizeBytes <= 0) {
    return { success: false, code: "INTEGRITY_MISMATCH", error: "Metadados de arquivo inválidos." };
  }

  let storageRoot: string;
  let targetPath: string;
  try {
    storageRoot = getPrivateStorageRoot();
    targetPath = resolveSafeStoragePath(storageRoot, fileStorageKey);
  } catch {
    return { success: false, code: "STORAGE_ERROR", error: "Caminho de armazenamento inválido." };
  }

  let buffer: Buffer;
  try {
    buffer = await fs.readFile(/*turbopackIgnore: true*/ targetPath);
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "ENOENT") {
      return { success: false, code: "NOT_FOUND", error: "Arquivo não encontrado no armazenamento." };
    }
    return { success: false, code: "STORAGE_ERROR", error: "Erro ao ler arquivo do armazenamento." };
  }

  // 1. Size integrity check
  if (buffer.length !== Number(expectedSizeBytes)) {
    return {
      success: false,
      code: "INTEGRITY_MISMATCH",
      error: "Inconsistência no tamanho do arquivo armazenado.",
    };
  }

  // 2. SHA-256 integrity check
  const actualSha256 = crypto.createHash("sha256").update(buffer).digest("hex");
  if (actualSha256.toLowerCase() !== expectedFileSha256.trim().toLowerCase()) {
    return {
      success: false,
      code: "INTEGRITY_MISMATCH",
      error: "Inconsistência no checksum do arquivo armazenado.",
    };
  }

  // 3. Format/magic bytes integrity check
  const detection = detectReceiptFileType(buffer, expectedMimeType);
  if (!detection.valid || !detection.mimeType) {
    return {
      success: false,
      code: "INTEGRITY_MISMATCH",
      error: "O conteúdo do arquivo não corresponde ao formato esperado.",
    };
  }

  return {
    success: true,
    buffer,
    mimeType: detection.mimeType,
  };
}

