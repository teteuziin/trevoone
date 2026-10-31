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
  role?: string;
  mediaAssetPublicId?: string | null;
  mimeType?: string | null;
  mediaType?: "VIDEO" | "IMAGE";
}

export interface ResolvedExecutionMedia {
  source: ExecutionMediaSource;
  hasMedia: boolean;
  media: ResolvedMediaPayload | null;
  url: string | null;
  isVideo: boolean;
  isGif: boolean;
  thumbnailUrl: string | null;
  role?: string;
  allAvailableMedia: ResolvedMediaPayload[];
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
  consultancySlug?: string | null;
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
  const consultancySuffix = input.consultancySlug
    ? `?consultancy=${encodeURIComponent(input.consultancySlug)}`
    : "";

  const allAvailableMedia: ResolvedMediaPayload[] = [];

  // Helper to build media payload from asset
  const toPayload = (
    m: BlockItemMediaDto | ExerciseMediaDto,
    candidateList: (BlockItemMediaDto | ExerciseMediaDto)[]
  ): ResolvedMediaPayload | null => {
    const pubId = m.mediaAsset?.publicId;
    if (!pubId) return null;

    const mime = (m.mediaAsset?.mimeType || "").toLowerCase();
    const isGif = mime === "image/gif" || mime.includes("gif") || (m.role as string) === "EXECUTION_GIF" || (m.role as string) === "ALTERNATE_GIF";
    const isVid = !isGif && (m.mediaAsset?.mediaType === "VIDEO" || mime === "video/mp4" || mime.startsWith("video/"));
    const url = `/api/training-v2/media/${pubId}${consultancySuffix}`;

    let thumbUrl: string | null = null;
    if (isVid) {
      const thumb = candidateList.find(
        (c) => c.role === "START_IMAGE" || c.role === "VIDEO_POSTER"
      );
      if (thumb?.mediaAsset?.publicId) {
        thumbUrl = `/api/training-v2/media/${thumb.mediaAsset.publicId}${consultancySuffix}`;
      }
    } else {
      thumbUrl = url;
    }

    return {
      url,
      isVideo: isVid,
      isGif,
      thumbnailUrl: thumbUrl,
      role: m.role,
      mediaAssetPublicId: pubId,
      mimeType: mime || (isGif ? "image/gif" : isVid ? "video/mp4" : "image/jpeg"),
      mediaType: isVid ? "VIDEO" : "IMAGE",
    };
  };

  // Helper to score media role priority
  const scoreRole = (role?: string, mediaType?: string, mimeType?: string): number => {
    const isGif = (mimeType || "").toLowerCase().includes("gif") || role === "EXECUTION_GIF";
    if (role === "EXECUTION_VIDEO" || role === "EXECUTION_GIF") return 1;
    if (role === "ALTERNATE_VIDEO" || role === "ALTERNATE_GIF") return 2;
    if (mediaType === "VIDEO" || isGif) return 3;
    if (role === "START_IMAGE") return 4;
    if (role === "VIDEO_POSTER") return 5;
    if (role === "ALTERNATE_IMAGE") return 6;
    return 10;
  };

  // 1. ITEM / PRESCRIÇÃO (Highest Priority: Item-level override)
  if (item?.customVideoUrl && item.customVideoUrl.trim().length > 0) {
    const rawUrl = item.customVideoUrl.trim();
    const matchingPinned = item.pinnedMedia?.find((m) => {
      const pubId = m.mediaAsset?.publicId;
      return pubId && rawUrl.includes(pubId);
    });
    const isGif =
      rawUrl.toLowerCase().endsWith(".gif") ||
      rawUrl.toLowerCase().includes(".gif") ||
      matchingPinned?.mediaAsset?.mimeType === "image/gif" ||
      (matchingPinned?.mediaAsset?.mediaType === "IMAGE" && matchingPinned.role !== "START_IMAGE" && matchingPinned.role !== "VIDEO_POSTER");
    const isVideo = !isGif;
    const thumbItem = item.pinnedMedia?.find(
      (m) => m.role === "START_IMAGE" || m.role === "VIDEO_POSTER" || m.role === "ALTERNATE_IMAGE"
    );
    const thumbnailUrl = thumbItem?.mediaAsset?.publicId
      ? `/api/training-v2/media/${thumbItem.mediaAsset.publicId}${consultancySuffix}`
      : null;

    const payload: ResolvedMediaPayload = {
      url: rawUrl,
      isVideo,
      isGif,
      thumbnailUrl,
      role: "ITEM_OVERRIDE",
      mediaAssetPublicId: matchingPinned?.mediaAsset?.publicId || null,
      mimeType: matchingPinned?.mediaAsset?.mimeType || null,
      mediaType: isVideo ? "VIDEO" : "IMAGE",
    };

    allAvailableMedia.push(payload);

    // Also collect remaining pinned media as potential fallbacks
    if (item.pinnedMedia && item.pinnedMedia.length > 0) {
      const sorted = [...item.pinnedMedia].sort(
        (a, b) =>
          scoreRole(a.role, a.mediaAsset?.mediaType, a.mediaAsset?.mimeType) -
          scoreRole(b.role, b.mediaAsset?.mediaType, b.mediaAsset?.mimeType)
      );
      for (const m of sorted) {
        const p = toPayload(m, item.pinnedMedia);
        if (p && !allAvailableMedia.some((x) => x.url === p.url)) {
          allAvailableMedia.push(p);
        }
      }
    }

    return {
      source: "ITEM_OVERRIDE",
      hasMedia: true,
      media: payload,
      url: rawUrl,
      isVideo,
      isGif,
      thumbnailUrl,
      role: "ITEM_OVERRIDE",
      allAvailableMedia,
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
      const payload: ResolvedMediaPayload = {
        url,
        isVideo,
        isGif,
        thumbnailUrl: null,
        role: "CUSTOM_OVERRIDE",
        mediaType: isVideo ? "VIDEO" : "IMAGE",
      };
      allAvailableMedia.push(payload);

      return {
        source: "CUSTOM_EXERCISE",
        hasMedia: true,
        media: payload,
        url,
        isVideo,
        isGif,
        thumbnailUrl: null,
        role: "CUSTOM_OVERRIDE",
        allAvailableMedia,
      };
    }

    const customMediaList = customExercise?.media || (item?.pinnedMedia ?? []);
    if (customMediaList.length > 0) {
      const sorted = [...customMediaList].sort(
        (a, b) =>
          scoreRole(a.role, a.mediaAsset?.mediaType, a.mediaAsset?.mimeType) -
          scoreRole(b.role, b.mediaAsset?.mediaType, b.mediaAsset?.mimeType)
      );
      for (const m of sorted) {
        const p = toPayload(m, customMediaList);
        if (p && !allAvailableMedia.some((x) => x.url === p.url)) {
          allAvailableMedia.push(p);
        }
      }

      if (allAvailableMedia.length > 0) {
        const primary = allAvailableMedia[0];
        return {
          source: "CUSTOM_EXERCISE",
          hasMedia: true,
          media: primary,
          url: primary.url,
          isVideo: primary.isVideo,
          isGif: primary.isGif,
          thumbnailUrl: primary.thumbnailUrl || null,
          role: primary.role,
          allAvailableMedia,
        };
      }
    }
  }

  // 3. LIBRARY EXERCISE (EXECUTION_VIDEO / GIF / ALTERNATE_VIDEO / IMAGES)
  const candidateMediaList = (item?.pinnedMedia && item.pinnedMedia.length > 0)
    ? item.pinnedMedia
    : (libraryExercise?.media || []);

  if (candidateMediaList.length > 0) {
    const sorted = [...candidateMediaList].sort(
      (a, b) =>
        scoreRole(a.role, a.mediaAsset?.mediaType, a.mediaAsset?.mimeType) -
        scoreRole(b.role, b.mediaAsset?.mediaType, b.mediaAsset?.mimeType)
    );
    for (const m of sorted) {
      const p = toPayload(m, candidateMediaList);
      if (p && !allAvailableMedia.some((x) => x.url === p.url)) {
        allAvailableMedia.push(p);
      }
    }

    if (allAvailableMedia.length > 0) {
      const primary = allAvailableMedia[0];
      const source: ExecutionMediaSource = primary.isVideo || primary.isGif ? "LIBRARY" : "IMAGE";
      return {
        source,
        hasMedia: true,
        media: primary,
        url: primary.url,
        isVideo: primary.isVideo,
        isGif: primary.isGif,
        thumbnailUrl: primary.thumbnailUrl || null,
        role: primary.role,
        allAvailableMedia,
      };
    }
  }

  // 4. NONE (No media, text/instructions fallback)
  return {
    source: "NONE",
    hasMedia: false,
    media: null,
    url: null,
    isVideo: false,
    isGif: false,
    thumbnailUrl: null,
    allAvailableMedia: [],
  };
}
