/**
 * TREVO ONE — Offline Core Data Types & Contracts
 */

import type {
  StudentWorkoutViewContract,
  WorkoutExecutionSessionDto,
  WorkoutExecutionHistorySessionDto,
} from "@/lib/training-v2/types";

export type OfflineOperationStatus =
  | "PENDING"
  | "SYNCING"
  | "SYNCED"
  | "FAILED"
  | "CONFLICT";

export type OfflineEntityType =
  | "WORKOUT_EXECUTION"
  | "FORM_SUBMISSION";

export type OfflineOperationType =
  | "COMPLETE_WORKOUT"
  | "SUBMIT_FORM";

/**
 * Queue item for idempotent offline mutation synchronization.
 */
export interface PendingOperation<TPayload = Record<string, unknown>> {
  operationId: string; // UUID v4
  clientOperationId: string; // Alias / canonical persistent UUID v4
  userPublicId: string;
  consultancyPublicId: string;
  consultancySlug: string;
  role: string;
  entityType: OfflineEntityType;
  entityId: string; // e.g. assignmentPublicId or formRequestPublicId
  operationType: OfflineOperationType;
  payload: TPayload;
  createdAt: string; // ISO 8601
  baseVersion?: string | number | null;
  retryCount: number;
  status: OfflineOperationStatus;
  lastAttemptAt?: string | null;
  errorMessage?: string | null;
  conflictDetails?: {
    serverStatus?: string;
    reason?: string;
    serverTimestamp?: string;
  } | null;
}

/**
 * Snapshot of a student's assigned workout routine.
 */
export interface WorkoutOfflineSnapshot {
  userPublicId: string;
  consultancyPublicId: string;
  role: string;
  assignmentPublicId: string;
  workout: StudentWorkoutViewContract;
  initialExecution: WorkoutExecutionSessionDto | null;
  initialHistory: WorkoutExecutionHistorySessionDto[];
  updatedAt: string; // ISO 8601
  sourceVersion?: string | number | null;
}

/**
 * Local offline execution session for a workout.
 */
export interface WorkoutOfflineSession {
  clientExecutionId: string; // UUID v4
  sessionPublicId?: string; // Existing server session ID if started online, or clientExecutionId
  userPublicId: string;
  consultancyPublicId: string;
  role: string;
  assignmentPublicId: string;
  status: "IN_PROGRESS" | "PENDING_SYNC" | "SYNCED";
  startedAt: string;
  completedAt?: string | null;
  sets: Array<{
    setPublicId: string;
    blockItemPublicId: string;
    setNumber: number;
    setType: string;
    prescribedReps?: number | null;
    prescribedRepsMax?: number | null;
    prescribedLoadKg?: number | null;
    prescribedRestSeconds?: number | null;
    actualReps?: number | null;
    actualLoadKg?: number | null;
    completedAt?: string | null;
  }>;
  updatedAt: string;
}

/**
 * Snapshot of a student's authoritative meal plan.
 */
export interface NutritionOfflineSnapshot {
  userPublicId: string;
  consultancyPublicId: string;
  role: string;
  planPublicId: string;
  planTitle: string;
  planSubtitle?: string | null;
  data: unknown; // Complete StudentAssignedPlanTreeDto structure
  syncedAt: string;
  updatedAt: string;
}

/**
 * Snapshot of a custom form template.
 */
export interface FormOfflineSnapshot {
  userPublicId: string;
  consultancyPublicId: string;
  role: string;
  templatePublicId: string;
  title: string;
  description: string | null;
  fields: unknown[];
  isOnboardingRequired: boolean;
  syncedAt: string;
  updatedAt: string;
}

/**
 * Student's in-progress form responses draft.
 */
export interface FormOfflineDraft {
  userPublicId: string;
  consultancyPublicId: string;
  role: string;
  requestPublicId: string;
  templatePublicId: string;
  responses: Record<string, unknown>;
  isSubmittedOffline: boolean;
  updatedAt: string;
}

/**
 * Snapshot of a student's scalar evolution metrics (strictly NO photos/blobs).
 */
export interface EvolutionOfflineSnapshot {
  userPublicId: string;
  consultancyPublicId: string;
  role: string;
  metrics: {
    latestWeightKg: number | null;
    weightGoalKg: number | null;
    weightHistory: Array<{ date: string; weightKg: number }>;
    bodyMeasurements: Array<{
      date: string;
      chestCm?: number | null;
      waistCm?: number | null;
      hipCm?: number | null;
      armsCm?: number | null;
      thighsCm?: number | null;
      calvesCm?: number | null;
    }>;
    chartPoints: Array<{ date: string; value: number; label: string }>;
    lastEvaluationMetadata: {
      evaluationPublicId: string;
      evaluatedAt: string;
      evaluatorName: string | null;
    } | null;
  };
  syncedAt: string;
  updatedAt: string;
}

/**
 * Metadata record for sync status and client state.
 */
export interface OfflineMetadataRecord {
  key: string;
  value: unknown;
  updatedAt: string;
}
