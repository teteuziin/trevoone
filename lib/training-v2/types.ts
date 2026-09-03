/**
 * TREVO ONE — TRAINING V2 DOMAIN TYPES
 * Authoritative type definitions for exercises, media, workouts, immutable versions,
 * blocks, items, normalized sets, and student assignments.
 */

// ============================================================================
// ENUMS & LITERAL TYPES
// ============================================================================

export type ExerciseScope = "GLOBAL" | "CONSULTANCY";
export type ExerciseVisibility = "GLOBAL" | "CREATOR_ONLY" | "CONSULTANCY";
export type ExerciseStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type MediaScope = "GLOBAL" | "CONSULTANCY";
export type MediaVisibility = "GLOBAL" | "CREATOR_ONLY" | "CONSULTANCY";
export type MediaType = "VIDEO" | "IMAGE";
export type MediaRole =
  | "EXECUTION_VIDEO"
  | "START_IMAGE"
  | "VIDEO_POSTER"
  | "ALTERNATE_VIDEO"
  | "ALTERNATE_IMAGE";
export type StorageProvider = "HOSTINGER_LOCAL" | "CLOUDFLARE_R2";

export type WorkoutStatus = "ACTIVE" | "ARCHIVED";
export type WorkoutVersionStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type WorkoutBlockType =
  | "SINGLE"
  | "BI_SET"
  | "TRI_SET"
  | "SUPER_SET"
  | "CIRCUIT"
  | "DROP_SET"
  | "REST_PAUSE"
  | "COMBINED_SET"
  | "WARMUP"
  | "CARDIO"
  | "CUSTOM";

export const ALL_WORKOUT_BLOCK_TYPES: readonly WorkoutBlockType[] = [
  "SINGLE",
  "BI_SET",
  "TRI_SET",
  "SUPER_SET",
  "CIRCUIT",
  "DROP_SET",
  "REST_PAUSE",
  "COMBINED_SET",
  "WARMUP",
  "CARDIO",
  "CUSTOM",
] as const;

export type PrescriptionMode = "SETS" | "TIME" | "DISTANCE" | "INTERVALS";

export type WorkoutSetType =
  | "WARMUP"
  | "FEEDER"
  | "NORMAL"
  | "DROP_STAGE"
  | "REST_PAUSE_MINI"
  | "FAILURE";

export type WorkoutAssignmentStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED";

export type HeartRateZone = "Z1" | "Z2" | "Z3" | "Z4" | "Z5";

export type MovementPattern =
  | "PUSH"
  | "PULL"
  | "SQUAT"
  | "HINGE"
  | "LUNGE"
  | "ISOLATION"
  | "CARDIO"
  | "MOBILITY";

export type DifficultyLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

// ============================================================================
// METHOD CONFIGURATION OBJECTS (BOUNDED JSON)
// ============================================================================

export type CardioMethodConfig = {
  speedKmh?: number | null;
  paceSecondsPerKm?: number | null;
  inclinePercent?: number | null;
  heartRateZone?: HeartRateZone | null;
  intensityLabel?: string | null;
};

export type RestPauseMethodConfig = {
  intraPauseSeconds?: number | null;
  targetTotalReps?: number | null;
};

export type WarmupMethodConfig = {
  focus?: string | null;
  targetJoint?: string | null;
};

export type ItemMethodConfig =
  | CardioMethodConfig
  | RestPauseMethodConfig
  | WarmupMethodConfig
  | Record<string, unknown>;

// ============================================================================
// MEDIA DOMAIN MODELS
// ============================================================================

export type MediaAssetDto = {
  publicId: string;
  scope: MediaScope;
  visibility: MediaVisibility;
  consultancyPublicId: string | null;
  mediaType: MediaType;
  storageProvider: StorageProvider;
  mimeType: string;
  fileSizeBytes: number;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  createdAt: Date;
};

export type ExerciseMediaDto = {
  role: MediaRole;
  sortOrder: number;
  mediaAsset: MediaAssetDto;
};

// ============================================================================
// EXERCISE CATALOG DOMAIN MODELS
// ============================================================================

export type ExerciseItemDto = {
  publicId: string;
  scope: ExerciseScope;
  visibility: ExerciseVisibility;
  consultancyPublicId: string | null;
  name: string;
  normalizedName: string;
  description: string | null;
  muscleGroupPrimary: string;
  muscleGroupsSecondary: string[] | null;
  equipment: string;
  movementPattern: MovementPattern | string | null;
  difficultyLevel: DifficultyLevel | string;
  instructions: string | null;
  executionTips: string | null;
  commonMistakes: string | null;
  progressions: string | null;
  regressions: string | null;
  rightsNotes: string | null;
  status: ExerciseStatus;
  media: ExerciseMediaDto[];
  createdAt: Date;
  updatedAt: Date;
};

// ============================================================================
// WORKOUT IMMUTABLE VERSION DOMAIN MODELS
// ============================================================================

export type WorkoutItemSetDto = {
  setNumber: number;
  setType: WorkoutSetType;
  parentSetNumber?: number | null;
  targetReps?: number | null;
  targetRepsMax?: number | null;
  targetLoadKg?: number | null;
  targetDurationSeconds?: number | null;
  targetDistanceMeters?: number | null;
  targetRestSeconds?: number | null;
  intensityIndicator?: string | null;
};

export type BlockItemMediaDto = {
  role: MediaRole;
  sortOrder: number;
  mediaAsset: MediaAssetDto;
};

export type WorkoutBlockItemDto = {
  publicId: string;
  exercisePublicId: string | null;
  sortOrder: number;
  exerciseNameSnapshot: string;
  muscleGroupSnapshot: string | null;
  equipmentSnapshot: string | null;
  instructionsSnapshot: string | null;
  prescriptionMode: PrescriptionMode;
  targetCadence: string | null;
  targetRpe: number | null;
  targetRir: number | null;
  methodConfig: ItemMethodConfig | null;
  customVideoUrl: string | null;
  notes: string | null;
  pinnedMedia: BlockItemMediaDto[];
  sets: WorkoutItemSetDto[];
};

export type WorkoutBlockDto = {
  publicId: string;
  blockType: WorkoutBlockType;
  title: string | null;
  sortOrder: number;
  rounds: number | null;
  restBetweenItemsSeconds: number | null;
  restBetweenRoundsSeconds: number | null;
  restAfterBlockSeconds: number | null;
  instructions: string | null;
  items: WorkoutBlockItemDto[];
};

export type WorkoutVersionDto = {
  publicId: string;
  workoutPublicId: string;
  versionNumber: number;
  status: WorkoutVersionStatus;
  publishedAt: Date | null;
  title: string;
  subtitle: string | null;
  objective: string | null;
  estimatedDurationMinutes: number | null;
  difficultyLevel: string | null;
  notes: string | null;
  blocks: WorkoutBlockDto[];
  createdAt: Date;
  updatedAt: Date;
};

export type WorkoutRootDto = {
  publicId: string;
  consultancyPublicId: string;
  title: string;
  subtitle: string | null;
  objective: string | null;
  estimatedDurationMinutes: number | null;
  difficultyLevel: string;
  isTemplate: boolean;
  status: WorkoutStatus;
  currentPublishedVersion: WorkoutVersionDto | null;
  createdAt: Date;
  updatedAt: Date;
};

// ============================================================================
// ASSIGNMENT & STUDENT RENDER CONTRACTS
// ============================================================================

export type WorkoutAssignmentDto = {
  publicId: string;
  consultancyPublicId: string;
  studentMembershipPublicId: string;
  workoutPublicId: string;
  workoutVersionPublicId: string;
  assignedByMembershipPublicId: string;
  startsOn: string;
  endsOn: string | null;
  status: WorkoutAssignmentStatus;
  notesForStudent: string | null;
  version: WorkoutVersionDto;
  createdAt: Date;
};

/**
 * Shape consumed by student workout viewer.
 * Derived purely from the assigned workout_version snapshot + pinned media.
 * Zero live dependency on mutable library rows.
 */
export type StudentWorkoutViewContract = {
  assignmentPublicId: string;
  consultancyName: string;
  startsOn: string;
  endsOn: string | null;
  versionNumber: number;
  title: string;
  subtitle: string | null;
  objective: string | null;
  estimatedDurationMinutes: number | null;
  difficultyLevel: string | null;
  notesForStudent: string | null;
  blocks: WorkoutBlockDto[];
};
