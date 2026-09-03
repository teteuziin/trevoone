/**
 * TREVO ONE — TRAINING V2 MEDIA CONFIGURATION
 * Centralizes provisional upload limits, allowed MIME types, and container settings.
 * All limits are PROVISIONAL pending production content benchmarks.
 */

// Provisional defaults
export const PROVISIONAL_MAX_VIDEO_BYTES = 25 * 1024 * 1024; // 25 MiB
export const PROVISIONAL_MAX_IMAGE_BYTES = 5 * 1024 * 1024;  // 5 MiB
export const PROVISIONAL_MAGIC_BYTE_BUFFER_SIZE = 128;        // Bytes to sniff container signatures

export const SUPPORTED_VIDEO_MIMES = ["video/mp4"] as const;
export const SUPPORTED_IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type SupportedVideoMime = (typeof SUPPORTED_VIDEO_MIMES)[number];
export type SupportedImageMime = (typeof SUPPORTED_IMAGE_MIMES)[number];
export type SupportedMediaMime = SupportedVideoMime | SupportedImageMime;

export function isSupportedVideoMime(mime: string): mime is SupportedVideoMime {
  return (SUPPORTED_VIDEO_MIMES as readonly string[]).includes(mime.toLowerCase().trim());
}

export function isSupportedImageMime(mime: string): mime is SupportedImageMime {
  return (SUPPORTED_IMAGE_MIMES as readonly string[]).includes(mime.toLowerCase().trim());
}

export function isSupportedMediaMime(mime: string): mime is SupportedMediaMime {
  return isSupportedVideoMime(mime) || isSupportedImageMime(mime);
}

/**
 * Returns the provisional max upload size in bytes for a given media category.
 * Allows safe environment overrides (e.g. for testing) without altering production configs.
 */
export function getMaxUploadSizeBytes(mediaType: "VIDEO" | "IMAGE"): number {
  if (mediaType === "VIDEO") {
    const envLimit = process.env.TRAINING_MEDIA_MAX_VIDEO_BYTES;
    if (envLimit && !isNaN(Number(envLimit)) && Number(envLimit) > 0) {
      return Number(envLimit);
    }
    return PROVISIONAL_MAX_VIDEO_BYTES;
  }

  const envLimit = process.env.TRAINING_MEDIA_MAX_IMAGE_BYTES;
  if (envLimit && !isNaN(Number(envLimit)) && Number(envLimit) > 0) {
    return Number(envLimit);
  }
  return PROVISIONAL_MAX_IMAGE_BYTES;
}
