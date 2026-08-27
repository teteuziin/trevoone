export const MAX_PROFILE_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MiB = 5,242,880 bytes
export const MAX_PROFILE_PHOTO_DIMENSION = 4096; // 4096 px max width or height
export const MAX_PROFILE_PHOTO_PIXEL_AREA = 16_777_216; // 4096 * 4096 max pixels

export type SupportedProfileImageMime = "image/jpeg" | "image/png" | "image/webp";

export type ImageValidationResult = {
  valid: boolean;
  mimeType?: SupportedProfileImageMime;
  extension?: string;
  width?: number;
  height?: number;
  error?: string;
};

/**
 * Parses JPEG segments to extract image dimensions from SOF marker.
 */
function parseJpegDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  const len = buffer.length;

  while (offset < len) {
    if (buffer[offset] !== 0xff) {
      return null;
    }

    // Skip padding 0xFF bytes
    while (offset < len && buffer[offset] === 0xff) {
      offset++;
    }

    if (offset >= len) return null;

    const marker = buffer[offset];
    offset++;

    // Standalone markers without length
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue;
    }

    if (offset + 2 > len) return null;
    const segmentLength = buffer.readUInt16BE(offset);

    // SOF Markers (Start of Frame): 0xC0..0xC3, 0xC5..0xC7, 0xC9..0xCB, 0xCD..0xCF
    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);

    if (isSof) {
      if (offset + segmentLength > len || segmentLength < 7) {
        return null;
      }
      const height = buffer.readUInt16BE(offset + 3);
      const width = buffer.readUInt16BE(offset + 5);
      return { width, height };
    }

    offset += segmentLength;
  }

  return null;
}

/**
 * Parses PNG header to extract image dimensions from IHDR chunk.
 */
function parsePngDimensions(buffer: Buffer): { width: number; height: number } | null {
  // Signature: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length < 24 ||
    buffer[0] !== 0x89 ||
    buffer[1] !== 0x50 ||
    buffer[2] !== 0x4e ||
    buffer[3] !== 0x47 ||
    buffer[4] !== 0x0d ||
    buffer[5] !== 0x0a ||
    buffer[6] !== 0x1a ||
    buffer[7] !== 0x0a
  ) {
    return null;
  }

  // IHDR chunk starts at byte 12 (ASCII: IHDR)
  if (
    buffer[12] !== 0x49 ||
    buffer[13] !== 0x48 ||
    buffer[14] !== 0x44 ||
    buffer[15] !== 0x52
  ) {
    return null;
  }

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

/**
 * Parses WebP header to extract image dimensions from VP8, VP8L, or VP8X chunk.
 */
function parseWebpDimensions(buffer: Buffer): { width: number; height: number } | null {
  // RIFF (bytes 0..3) ... WEBP (bytes 8..11)
  if (
    buffer.length < 30 ||
    buffer[0] !== 0x52 || // R
    buffer[1] !== 0x49 || // I
    buffer[2] !== 0x46 || // F
    buffer[3] !== 0x46 || // F
    buffer[8] !== 0x57 || // W
    buffer[9] !== 0x45 || // E
    buffer[10] !== 0x42 || // B
    buffer[11] !== 0x50 // P
  ) {
    return null;
  }

  const chunkType = buffer.toString("ascii", 12, 16);

  // 1. Lossy WebP (VP8 )
  if (chunkType === "VP8 ") {
    if (buffer.length < 30) return null;
    // Check 3-byte start code at offset 23: 9D 01 2A
    if (buffer[23] !== 0x9d || buffer[24] !== 0x01 || buffer[25] !== 0x2a) {
      return null;
    }
    const width = buffer.readUInt16LE(26) & 0x3fff;
    const height = buffer.readUInt16LE(28) & 0x3fff;
    return { width, height };
  }

  // 2. Lossless WebP (VP8L)
  if (chunkType === "VP8L") {
    if (buffer.length < 25) return null;
    // Signature byte at byte 20: 0x2F
    if (buffer[20] !== 0x2f) return null;
    const b1 = buffer[21];
    const b2 = buffer[22];
    const b3 = buffer[23];
    const b4 = buffer[24];
    const width = 1 + (b1 | ((b2 & 0x3f) << 8));
    const height = 1 + ((b2 >> 6) | (b3 << 2) | ((b4 & 0x0f) << 10));
    return { width, height };
  }

  // 3. Extended WebP (VP8X)
  if (chunkType === "VP8X") {
    if (buffer.length < 30) return null;
    const width = 1 + buffer.readUIntLE(24, 3);
    const height = 1 + buffer.readUIntLE(27, 3);
    return { width, height };
  }

  return null;
}

/**
 * Strictly validates profile photo buffer size, binary magic bytes signature,
 * structural headers, and pixel dimensions.
 */
export function validateProfileImageBuffer(
  buffer: Buffer,
  clientMimeType?: string
): ImageValidationResult {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: "Arquivo de imagem vazio." };
  }

  if (buffer.length > MAX_PROFILE_PHOTO_SIZE_BYTES) {
    return {
      valid: false,
      error: `A imagem excede o tamanho máximo permitido de 5 MB (${(buffer.length / (1024 * 1024)).toFixed(1)} MB enviados).`,
    };
  }

  let detectedMime: SupportedProfileImageMime | null = null;
  let extension: string | null = null;
  let dimensions: { width: number; height: number } | null = null;

  // 1. JPEG signature: FF D8 FF
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    detectedMime = "image/jpeg";
    extension = ".jpg";
    dimensions = parseJpegDimensions(buffer);
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
    dimensions = parsePngDimensions(buffer);
  }
  // 3. WEBP signature: RIFF ... WEBP
  else if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    detectedMime = "image/webp";
    extension = ".webp";
    dimensions = parseWebpDimensions(buffer);
  }

  if (!detectedMime || !extension) {
    return {
      valid: false,
      error: "Formato de imagem não suportado. Por favor, envie uma foto em JPG, PNG ou WEBP.",
    };
  }

  // Client MIME consistency validation (if provided)
  if (clientMimeType && typeof clientMimeType === "string") {
    const norm = clientMimeType.trim().toLowerCase();
    const isJpegMatch =
      detectedMime === "image/jpeg" &&
      (norm === "image/jpeg" || norm === "image/jpg" || norm === "image/pjpeg");
    const isPngMatch =
      detectedMime === "image/png" &&
      (norm === "image/png" || norm === "image/x-png");
    const isWebpMatch =
      detectedMime === "image/webp" && norm === "image/webp";

    if (!isJpegMatch && !isPngMatch && !isWebpMatch && norm !== "application/octet-stream" && norm !== "") {
      return {
        valid: false,
        error: "O formato binário da imagem não corresponde ao tipo declarado pelo navegador.",
      };
    }
  }

  if (!dimensions || dimensions.width <= 0 || dimensions.height <= 0) {
    return {
      valid: false,
      error: "Não foi possível verificar a estrutura ou dimensões da imagem. O arquivo pode estar corrompido.",
    };
  }

  const { width, height } = dimensions;

  if (width > MAX_PROFILE_PHOTO_DIMENSION || height > MAX_PROFILE_PHOTO_DIMENSION) {
    return {
      valid: false,
      error: `As dimensões da imagem (${width}x${height}px) ultrapassam o limite máximo de ${MAX_PROFILE_PHOTO_DIMENSION}x${MAX_PROFILE_PHOTO_DIMENSION}px.`,
    };
  }

  const pixelArea = width * height;
  if (pixelArea > MAX_PROFILE_PHOTO_PIXEL_AREA) {
    return {
      valid: false,
      error: `A resolução da imagem (${width}x${height}px) ultrapassa a área máxima permitida.`,
    };
  }

  return {
    valid: true,
    mimeType: detectedMime,
    extension,
    width,
    height,
  };
}
