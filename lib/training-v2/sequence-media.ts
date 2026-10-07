/**
 * TREVO ONE — Training V2 Sequence Media Experience
 * Unified domain helper to build structured sequence playlists for:
 * - Custom sequences (methodConfig.customSequence)
 * - Formal combinations (BI_SET, TRI_SET, GIANT_SET, CIRCUIT, COMBINED_SET)
 */

import type {
  WorkoutBlockItemDto,
  WorkoutItemCombinationDto,
  WorkoutBlockDto,
  CustomSequenceMovementDto,
  BlockItemMediaDto,
  ExerciseMediaDto,
} from "./types";

export type SequenceMediaItem = {
  order: number;
  name: string;
  exercisePublicId?: string | null;
  media?: {
    url: string;
    isVideo: boolean;
    isGif: boolean;
  } | null;
  mediaUrl?: string | null;
  hasMedia?: boolean;
  instructions?: string | null;
  repsText?: string | null;
  durationText?: string | null;
  muscleGroup?: string | null;
  equipment?: string | null;
  notes?: string | null;
};

export type SequenceMediaExperience = {
  isSequence: boolean;
  type: "CUSTOM_SEQUENCE" | "BI_SET" | "TRI_SET" | "GIANT_SET" | "CIRCUIT" | "COMBINED_SET";
  title: string;
  hasPlayableMedia: boolean;
  overrideMediaUrl?: string | null;
  restAfterSeconds?: number | null;
  items: SequenceMediaItem[];
  movements: SequenceMediaItem[];
  totalMovements: number;
};

/**
 * Extracts playable video media from pinnedMedia or customVideoUrl.
 */
export function extractItemPlayableMedia(
  pinnedMedia?: (BlockItemMediaDto | ExerciseMediaDto)[] | null,
  customVideoUrl?: string | null
): { url: string; isVideo: boolean; isGif: boolean } | null {
  if (pinnedMedia && pinnedMedia.length > 0) {
    const exec = pinnedMedia.find((m) => m.role === "EXECUTION_VIDEO");
    const fallback =
      pinnedMedia.find(
        (m) => m.role === "START_IMAGE" || m.role === "VIDEO_POSTER" || m.role === "ALTERNATE_IMAGE"
      ) || pinnedMedia[0];

    const target = exec || fallback;
    if (target?.mediaAsset?.publicId) {
      const isVid = target.mediaAsset.mediaType === "VIDEO" || target.mediaAsset.mimeType === "video/mp4";
      const isGif = target.mediaAsset.mimeType === "image/gif";
      return {
        url: `/api/training-v2/media/${target.mediaAsset.publicId}`,
        isVideo: isVid,
        isGif,
      };
    }
  }

  if (customVideoUrl && customVideoUrl.trim().length > 0) {
    return {
      url: customVideoUrl.trim(),
      isVideo: true,
      isGif: false,
    };
  }

  return null;
}

/**
 * Builds a SequenceMediaExperience from a single WorkoutBlockItemDto with customSequence.
 */
export function buildSequenceMediaFromCustomItem(
  item: WorkoutBlockItemDto
): SequenceMediaExperience | null {
  const isSequence = Boolean(item.methodConfig?.isSequence || item.methodConfig?.customSequence);
  if (!isSequence) return null;

  const seqConfig = item.methodConfig?.customSequence;
  const rawMovements = seqConfig?.movements;
  if (!Array.isArray(rawMovements) || rawMovements.length < 1) {
    return null;
  }

  const overrideMedia = extractItemPlayableMedia(item.pinnedMedia, seqConfig?.overrideMediaUrl || item.customVideoUrl);

  const items: SequenceMediaItem[] = rawMovements.map((m, idx) => {
    if (typeof m === "string") {
      return {
        order: idx + 1,
        name: m.trim(),
        exercisePublicId: null,
        media: null,
        mediaUrl: null,
        hasMedia: false,
        instructions: null,
        repsText: null,
        durationText: null,
        muscleGroup: null,
        equipment: null,
      };
    }

    const obj = m as CustomSequenceMovementDto;
    const movementMedia = extractItemPlayableMedia(obj.pinnedMedia, obj.customVideoUrl);
    const mediaUrl = movementMedia?.url || null;
    const hasMedia = Boolean(mediaUrl || obj.exercisePublicId);

    return {
      order: obj.order || idx + 1,
      name: obj.label || `Movimento ${idx + 1}`,
      exercisePublicId: obj.exercisePublicId || null,
      media: movementMedia,
      mediaUrl,
      hasMedia,
      instructions: obj.instructionsSnapshot || null,
      repsText: obj.repsText || null,
      durationText: obj.durationText || null,
      muscleGroup: obj.muscleGroupSnapshot || null,
      equipment: obj.equipmentSnapshot || null,
    };
  });

  // Playable if there is an override video OR at least one movement has media OR has a library reference that can resolve a video
  const hasPlayableMedia = Boolean(
    overrideMedia?.isVideo ||
    items.some((it) => it.media != null || Boolean(it.exercisePublicId))
  );

  return {
    isSequence: true,
    type: "CUSTOM_SEQUENCE",
    title: item.exerciseNameSnapshot,
    hasPlayableMedia,
    overrideMediaUrl: overrideMedia?.url || null,
    restAfterSeconds: item.sets?.[0]?.targetRestSeconds ?? null,
    items,
    movements: items,
    totalMovements: items.length,
  };
}

/**
 * Common builder for sequence media experiences given ordered movements.
 */
export function buildSequenceMediaExperience(params: {
  title?: string;
  type?: "CUSTOM_SEQUENCE" | "BI_SET" | "TRI_SET" | "GIANT_SET" | "CIRCUIT" | "COMBINED_SET";
  rawText?: string;
  restAfterSeconds?: number | null;
  overrideMediaUrl?: string | null;
  movements: Array<{
    order?: number;
    name?: string;
    label?: string;
    mediaUrl?: string | null;
    media?: { url: string; isVideo: boolean; isGif: boolean } | null;
    exercisePublicId?: string | null;
    instructions?: string | null;
    reps?: string | null;
    repsText?: string | null;
    duration?: string | null;
    durationText?: string | null;
  }>;
}): SequenceMediaExperience {
  const sorted = [...(params.movements || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const items: SequenceMediaItem[] = sorted.map((m, idx) => {
    const order = m.order ?? idx + 1;
    const name = m.name || m.label || `Movimento ${order}`;
    const media = m.media ?? (m.mediaUrl ? { url: m.mediaUrl, isVideo: true, isGif: false } : null);
    const mediaUrl = media?.url ?? m.mediaUrl ?? null;
    const hasMedia = Boolean(mediaUrl || m.exercisePublicId);
    return {
      order,
      name,
      exercisePublicId: m.exercisePublicId ?? null,
      media,
      mediaUrl,
      hasMedia,
      instructions: m.instructions ?? null,
      repsText: m.repsText ?? m.reps ?? null,
      durationText: m.durationText ?? m.duration ?? null,
    };
  });

  const hasPlayableMedia = Boolean(
    params.overrideMediaUrl ||
    items.some((it) => it.hasMedia)
  );

  return {
    isSequence: true,
    type: params.type || "CUSTOM_SEQUENCE",
    title: params.title || "Sequência",
    hasPlayableMedia,
    overrideMediaUrl: params.overrideMediaUrl ?? null,
    restAfterSeconds: params.restAfterSeconds ?? null,
    items,
    movements: items,
    totalMovements: items.length,
  };
}

/**
 * Builds a SequenceMediaExperience from a formal combination (BI_SET, TRI_SET, etc.).
 */
export function buildSequenceMediaFromCombination(
  combination: WorkoutItemCombinationDto,
  allItems: WorkoutBlockItemDto[]
): SequenceMediaExperience | null {
  const combItems = allItems
    .filter((it) => it.combinationPublicId === combination.publicId)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (combItems.length < 2) return null;

  const items: SequenceMediaItem[] = combItems.map((it, idx) => {
    const media = extractItemPlayableMedia(it.pinnedMedia, it.customVideoUrl);
    const mediaUrl = media?.url || null;
    const hasMedia = Boolean(mediaUrl || it.exercisePublicId);
    const targetSet = it.sets?.[0];
    const repsText = targetSet?.targetRepsMax && targetSet.targetRepsMax !== targetSet.targetReps
      ? `${targetSet.targetReps}-${targetSet.targetRepsMax} reps`
      : targetSet?.targetReps
      ? `${targetSet.targetReps} reps`
      : null;
    const durationText = targetSet?.targetDurationSeconds
      ? `${targetSet.targetDurationSeconds}s`
      : null;

    return {
      order: idx + 1,
      name: it.exerciseNameSnapshot,
      exercisePublicId: it.exercisePublicId || null,
      media,
      mediaUrl,
      hasMedia,
      instructions: it.instructionsSnapshot || null,
      repsText,
      durationText,
      muscleGroup: it.muscleGroupSnapshot || null,
      equipment: it.equipmentSnapshot || null,
      notes: it.notes || null,
    };
  });

  const hasPlayableMedia = items.some((it) => it.media != null || Boolean(it.exercisePublicId));

  const type =
    combination.combinationType === "BI_SET"
      ? "BI_SET"
      : combination.combinationType === "TRI_SET"
      ? "TRI_SET"
      : combination.combinationType === "GIANT_SET"
      ? "GIANT_SET"
      : combination.combinationType === "CIRCUIT"
      ? "CIRCUIT"
      : "COMBINED_SET";

  return {
    isSequence: true,
    type,
    title: combination.title || `${type.replace("_", "-")} (${items.length} exercícios)`,
    hasPlayableMedia,
    restAfterSeconds: combination.restAfterSeconds ?? null,
    items,
    movements: items,
    totalMovements: items.length,
  };
}

/**
 * Builds a SequenceMediaExperience from a WorkoutBlockDto if the block is a formal multi-item block.
 */
export function buildSequenceMediaFromBlock(block: WorkoutBlockDto): SequenceMediaExperience | null {
  if (
    block.blockType === "BI_SET" ||
    block.blockType === "TRI_SET" ||
    block.blockType === "CIRCUIT" ||
    block.blockType === "SUPER_SET" ||
    block.blockType === "COMBINED_SET"
  ) {
    if (block.items.length < 2) return null;

    const items: SequenceMediaItem[] = block.items.map((it, idx) => {
      const media = extractItemPlayableMedia(it.pinnedMedia, it.customVideoUrl);
      const targetSet = it.sets?.[0];
      const repsText = targetSet?.targetReps ? `${targetSet.targetReps} reps` : null;
      const durationText = targetSet?.targetDurationSeconds ? `${targetSet.targetDurationSeconds}s` : null;

      return {
        order: idx + 1,
        name: it.exerciseNameSnapshot,
        exercisePublicId: it.exercisePublicId || null,
        media,
        instructions: it.instructionsSnapshot || null,
        repsText,
        durationText,
        muscleGroup: it.muscleGroupSnapshot || null,
        equipment: it.equipmentSnapshot || null,
        notes: it.notes || null,
      };
    });

    const hasPlayableMedia = items.some((it) => it.media != null || Boolean(it.exercisePublicId));

    const type =
      block.blockType === "BI_SET"
        ? "BI_SET"
        : block.blockType === "TRI_SET"
        ? "TRI_SET"
        : block.blockType === "CIRCUIT"
        ? "CIRCUIT"
        : "COMBINED_SET";

    return {
      isSequence: true,
      type,
      title: block.title || `${type.replace("_", "-")} (${items.length} exercícios)`,
      hasPlayableMedia,
      restAfterSeconds: block.restBetweenRoundsSeconds ?? block.restAfterBlockSeconds ?? null,
      items,
      movements: items,
      totalMovements: items.length,
    };
  }

  return null;
}
