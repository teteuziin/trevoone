/**
 * TREVO ONE — UNIFIED EXERCISE EXECUTION MEDIA RESOLVER
 *
 * Implements the single canonical hierarchy of execution media resolution:
 * 1. ITEM / PRESCRIÇÃO — Specific override for this workout routine item (item.customVideoUrl)
 * 2. CUSTOM EXERCISE — Media attached to custom exercise entity
 * 3. LIBRARY EXERCISE — Official canonical media from exercise library (EXECUTION_VIDEO / GIF)
 * 4. IMAGEM / FRAME — Static image fallback (START_IMAGE, VIDEO_POSTER, ALTERNATE_IMAGE)
 * 5. TEXTO / INSTRUÇÕES — No media available, fallback to instructions
 */

import type { BlockItemMediaDto, ExerciseMediaDto } from "./types";

export type ExecutionMediaSource =
  | "ITEM_OVERRIDE"
  | "CUSTOM_EXERCISE"
  | "LIBRARY"
  | "IMAGE"
  | "NONE";

export interface ResolvedMediaPayload {
  url: string;
  isVideo: boolean;
  isGif: boolean;
  thumbnailUrl?: string | null;
}

export interface ResolvedExecutionMedia {
  source: ExecutionMediaSource;
  hasMedia: boolean;
  media: ResolvedMediaPayload | null;
  url: string | null;
  isVideo: boolean;
  isGif: boolean;
  thumbnailUrl: string | null;
}

export interface ResolveMediaInput {
  item?: {
    customVideoUrl?: string | null;
    pinnedMedia?: (BlockItemMediaDto | ExerciseMediaDto)[] | null;
    isCustomExercise?: boolean | null;
    customExercisePublicId?: string | null;
    exercisePublicId?: string | null;
  } | null;
  customExercise?: {
    customVideoUrl?: string | null;
    media?: ExerciseMediaDto[] | null;
  } | null;
  libraryExercise?: {
    media?: ExerciseMediaDto[] | null;
  } | null;
}

export function isValidMediaUrl(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("/api/training-v2/media/")
  );
}

export function resolveExerciseExecutionMedia(input: ResolveMediaInput): ResolvedExecutionMedia {
  const item = input.item;
  const customExercise = input.customExercise;
  const libraryExercise = input.libraryExercise;

  // 1. ITEM / PRESCRIÇÃO (Highest Priority: Item-level override)
  if (item?.customVideoUrl && item.customVideoUrl.trim().length > 0) {
    const rawUrl = item.customVideoUrl.trim();
    const isGif = rawUrl.toLowerCase().endsWith(".gif");
    const isVideo = !isGif;
    const thumbItem = item.pinnedMedia?.find(
      (m) => m.role === "START_IMAGE" || m.role === "VIDEO_POSTER" || m.role === "ALTERNATE_IMAGE"
    );
    const thumbnailUrl = thumbItem?.mediaAsset?.publicId
      ? `/api/training-v2/media/${thumbItem.mediaAsset.publicId}`
      : null;

    const payload: ResolvedMediaPayload = {
      url: rawUrl,
      isVideo,
      isGif,
      thumbnailUrl,
    };

    return {
      source: "ITEM_OVERRIDE",
      hasMedia: true,
      media: payload,
      url: rawUrl,
      isVideo,
      isGif,
      thumbnailUrl,
    };
  }

  // 2. CUSTOM EXERCISE
  const isCustom = Boolean(
    item?.isCustomExercise ||
    item?.customExercisePublicId ||
    customExercise != null
  );

  if (isCustom) {
    if (customExercise?.customVideoUrl && customExercise.customVideoUrl.trim().length > 0) {
      const url = customExercise.customVideoUrl.trim();
      const isGif = url.toLowerCase().endsWith(".gif");
      const isVideo = !isGif;
      return {
        source: "CUSTOM_EXERCISE",
        hasMedia: true,
        media: { url, isVideo, isGif, thumbnailUrl: null },
        url,
        isVideo,
        isGif,
        thumbnailUrl: null,
      };
    }

    const customMediaList = customExercise?.media || (item?.pinnedMedia ?? []);
    const customExec = customMediaList.find((m) => m.role === "EXECUTION_VIDEO");
    if (customExec?.mediaAsset?.publicId) {
      const isVid = customExec.mediaAsset.mediaType === "VIDEO" || customExec.mediaAsset.mimeType === "video/mp4";
      const isGif = customExec.mediaAsset.mimeType === "image/gif";
      const url = `/api/training-v2/media/${customExec.mediaAsset.publicId}`;
      const thumb = customMediaList.find((m) => m.role === "START_IMAGE" || m.role === "VIDEO_POSTER");
      const thumbnailUrl = thumb?.mediaAsset?.publicId
        ? `/api/training-v2/media/${thumb.mediaAsset.publicId}`
        : null;

      return {
        source: "CUSTOM_EXERCISE",
        hasMedia: true,
        media: { url, isVideo: isVid, isGif, thumbnailUrl },
        url,
        isVideo: isVid,
        isGif,
        thumbnailUrl,
      };
    }
  }

  // 3. LIBRARY EXERCISE (EXECUTION_VIDEO / GIF)
  const candidateMediaList = (item?.pinnedMedia && item.pinnedMedia.length > 0)
    ? item.pinnedMedia
    : (libraryExercise?.media || []);

  const libraryExec = candidateMediaList.find((m) => m.role === "EXECUTION_VIDEO");
  if (libraryExec?.mediaAsset?.publicId) {
    const isVid = libraryExec.mediaAsset.mediaType === "VIDEO" || libraryExec.mediaAsset.mimeType === "video/mp4";
    const isGif = libraryExec.mediaAsset.mimeType === "image/gif";
    const url = `/api/training-v2/media/${libraryExec.mediaAsset.publicId}`;
    const thumb = candidateMediaList.find((m) => m.role === "START_IMAGE" || m.role === "VIDEO_POSTER");
    const thumbnailUrl = thumb?.mediaAsset?.publicId
      ? `/api/training-v2/media/${thumb.mediaAsset.publicId}`
      : null;

    return {
      source: "LIBRARY",
      hasMedia: true,
      media: { url, isVideo: isVid, isGif, thumbnailUrl },
      url,
      isVideo: isVid,
      isGif,
      thumbnailUrl,
    };
  }

  // 4. IMAGEM / FRAME (Static image fallback)
  const imageFallback = candidateMediaList.find(
    (m) => m.role === "START_IMAGE" || m.role === "VIDEO_POSTER" || m.role === "ALTERNATE_IMAGE"
  ) || candidateMediaList[0];

  if (imageFallback?.mediaAsset?.publicId) {
    const isGif = imageFallback.mediaAsset.mimeType === "image/gif";
    const isVid = imageFallback.mediaAsset.mediaType === "VIDEO" || imageFallback.mediaAsset.mimeType === "video/mp4";
    const url = `/api/training-v2/media/${imageFallback.mediaAsset.publicId}`;

    return {
      source: "IMAGE",
      hasMedia: true,
      media: { url, isVideo: isVid, isGif, thumbnailUrl: url },
      url,
      isVideo: isVid,
      isGif,
      thumbnailUrl: url,
    };
  }

  // 5. NONE (No media, text/instructions fallback)
  return {
    source: "NONE",
    hasMedia: false,
    media: null,
    url: null,
    isVideo: false,
    isGif: false,
    thumbnailUrl: null,
  };
}
