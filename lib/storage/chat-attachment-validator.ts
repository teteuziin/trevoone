export type SupportedChatAttachmentType =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "application/pdf"
  | "audio/webm"
  | "audio/ogg"
  | "audio/wav"
  | "audio/mp4"
  | "audio/mpeg"
  | "video/mp4"
  | "video/webm";

export interface ChatAttachmentValidationResult {
  valid: boolean;
  mimeType?: SupportedChatAttachmentType;
  extension?: string;
  category?: "IMAGE" | "AUDIO" | "VIDEO" | "DOCUMENT";
  error?: string;
}

export const MAX_CHAT_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024; // 25 MiB

/**
 * Validates chat attachment buffer using binary signature inspection (magic bytes).
 * Supports images (JPG/PNG/WEBP), documents (PDF), voice/audio (WebM/Ogg/WAV/MP3/M4A),
 * and videos (MP4/WebM). Rejects executables, scripts, and unknown binaries.
 */
export function validateChatAttachmentBuffer(
  buffer: Buffer,
  clientMimeType?: string
): ChatAttachmentValidationResult {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: "Arquivo vazio." };
  }

  if (buffer.length > MAX_CHAT_ATTACHMENT_SIZE_BYTES) {
    return { valid: false, error: "Arquivo excede o limite máximo permitido de 25 MB." };
  }

  // 1. JPEG: FF D8 FF
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { valid: true, mimeType: "image/jpeg", extension: ".jpg", category: "IMAGE" };
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
    return { valid: true, mimeType: "image/png", extension: ".png", category: "IMAGE" };
  }

  // 3. WEBP or WAV (starts with RIFF)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && // R
    buffer[1] === 0x49 && // I
    buffer[2] === 0x46 && // F
    buffer[3] === 0x46 // F
  ) {
    if (
      buffer[8] === 0x57 && // W
      buffer[9] === 0x45 && // E
      buffer[10] === 0x42 && // B
      buffer[11] === 0x50 // P
    ) {
      return { valid: true, mimeType: "image/webp", extension: ".webp", category: "IMAGE" };
    }
    if (
      buffer[8] === 0x57 && // W
      buffer[9] === 0x41 && // A
      buffer[10] === 0x56 && // V
      buffer[11] === 0x45 // E
    ) {
      return { valid: true, mimeType: "audio/wav", extension: ".wav", category: "AUDIO" };
    }
  }

  // 4. PDF: %PDF-
  if (
    buffer.length >= 5 &&
    buffer[0] === 0x25 && // %
    buffer[1] === 0x50 && // P
    buffer[2] === 0x44 && // D
    buffer[3] === 0x46 && // F
    buffer[4] === 0x2d // -
  ) {
    return { valid: true, mimeType: "application/pdf", extension: ".pdf", category: "DOCUMENT" };
  }

  // 5. WebM / Matroska EBML header: 1A 45 DF A3
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    const isAudio = clientMimeType?.includes("audio") ?? false;
    return {
      valid: true,
      mimeType: isAudio ? "audio/webm" : "video/webm",
      extension: isAudio ? ".weba" : ".webm",
      category: isAudio ? "AUDIO" : "VIDEO",
    };
  }

  // 6. OGG: OggS (4F 67 67 53)
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x4f &&
    buffer[1] === 0x67 &&
    buffer[2] === 0x67 &&
    buffer[3] === 0x53
  ) {
    return { valid: true, mimeType: "audio/ogg", extension: ".ogg", category: "AUDIO" };
  }

  // 7. MP4 / M4A: ....ftyp
  if (
    buffer.length >= 12 &&
    buffer[4] === 0x66 && // f
    buffer[5] === 0x74 && // t
    buffer[6] === 0x79 && // y
    buffer[7] === 0x70 // p
  ) {
    const isAudio =
      clientMimeType?.includes("audio") ||
      (buffer[8] === 0x4d && buffer[9] === 0x34 && buffer[10] === 0x41); // M4A
    return {
      valid: true,
      mimeType: isAudio ? "audio/mp4" : "video/mp4",
      extension: isAudio ? ".m4a" : ".mp4",
      category: isAudio ? "AUDIO" : "VIDEO",
    };
  }

  // 8. MP3 (ID3 or sync frame FF FB / FF F3)
  if (
    (buffer.length >= 3 && buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) ||
    (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)
  ) {
    return { valid: true, mimeType: "audio/mpeg", extension: ".mp3", category: "AUDIO" };
  }

  return {
    valid: false,
    error: "Formato de arquivo não suportado. Envie imagens (JPG, PNG, WebP), áudios de voz, vídeos (MP4, WebM) ou documentos (PDF).",
  };
}
