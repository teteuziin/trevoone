/**
 * TREVO ONE — TRAINING V2 MEDIA FILE VALIDATION
 * Strictly validates file container magic bytes against declared MIME type.
 * Supports MP4 container signatures, JPEG, PNG, and WebP.
 * Rejects SVGs, executables, HTML, text, and corrupted/mismatched binaries.
 */

import type { SupportedMediaMime } from "./media-config";

export type MediaValidationResult = {
  valid: boolean;
  detectedMime?: SupportedMediaMime;
  mediaType?: "VIDEO" | "IMAGE";
  extension?: string;
  error?: string;
};

/**
 * Validates binary buffer by inspecting magic bytes signature.
 * Enforces that declared MIME matches the detected binary structure.
 */
export function validateMediaMagicBytes(
  buffer: Buffer,
  declaredMimeType: string
): MediaValidationResult {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: "Arquivo vazio ou buffer de leitura zerado." };
  }

  const normalizedDeclared = declaredMimeType.toLowerCase().trim();
  let detectedMime: SupportedMediaMime | null = null;
  let mediaType: "VIDEO" | "IMAGE" | null = null;
  let extension: string | null = null;

  // 1. JPEG signature: FF D8 FF
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    detectedMime = "image/jpeg";
    mediaType = "IMAGE";
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
    mediaType = "IMAGE";
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
    mediaType = "IMAGE";
    extension = ".webp";
  }
  // 4. MP4 container signature: bytes 4..7 must be 'ftyp'
  else if (
    buffer.length >= 8 &&
    buffer[4] === 0x66 && // f
    buffer[5] === 0x74 && // t
    buffer[6] === 0x79 && // y
    buffer[7] === 0x70 // p
  ) {
    detectedMime = "video/mp4";
    mediaType = "VIDEO";
    extension = ".mp4";
  }

  if (!detectedMime || !mediaType || !extension) {
    return {
      valid: false,
      error: "Assinatura de arquivo não reconhecida ou formato não suportado. Envie vídeo em MP4 ou imagem em JPG, PNG ou WEBP.",
    };
  }

  // Enforce declared MIME matches detected MIME
  if (normalizedDeclared !== detectedMime) {
    return {
      valid: false,
      error: `Incompatibilidade de formato: o cabeçalho declara '${normalizedDeclared}', mas o conteúdo binário corresponde a '${detectedMime}'.`,
    };
  }

  return {
    valid: true,
    detectedMime,
    mediaType,
    extension,
  };
}
