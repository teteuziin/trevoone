/**
 * TREVO ONE — NUTRITION V2 MEAL TRACKING DOMAIN TYPES
 *
 * Etapa 12: Acompanhamento das Refeições
 *
 * Rules:
 * - 3 explicit completion states: COMPLETED, COMPLETED_WITH_CHANGES, NOT_DONE.
 * - Non-punitive unlogged state: UNREGISTERED (never infer absence as "Não fez").
 * - Optional reasons for NOT_DONE (including FORGOT).
 * - Optional photo (JPEG, PNG, WebP up to 8MB).
 * - Structured substitutions support for COMPLETED_WITH_CHANGES.
 * - Strict prescription snapshot immutability.
 */

export const MEAL_TRACKING_STATUSES = [
  "COMPLETED",
  "COMPLETED_WITH_CHANGES",
  "NOT_DONE",
] as const;
export type MealTrackingStatus = (typeof MEAL_TRACKING_STATUSES)[number];

export const MEAL_TRACKING_STATUS_LABELS: Record<MealTrackingStatus, string> = {
  COMPLETED: "Fiz conforme o plano",
  COMPLETED_WITH_CHANGES: "Fiz com alterações",
  NOT_DONE: "Não fiz a refeição",
};

export const MEAL_NOT_DONE_REASONS = [
  "FORGOT",
  "NO_TIME",
  "NOT_HUNGRY",
  "UNAVAILABLE_FOOD",
  "INDISPOSED",
  "OTHER",
] as const;
export type MealNotDoneReason = (typeof MEAL_NOT_DONE_REASONS)[number];

export const MEAL_NOT_DONE_REASON_LABELS: Record<MealNotDoneReason, string> = {
  FORGOT: "Esqueci de fazer a refeição",
  NO_TIME: "Falta de tempo / rotina corrida",
  NOT_HUNGRY: "Sem fome ou apetite no horário",
  UNAVAILABLE_FOOD: "Sem os ingredientes ou fora de casa",
  INDISPOSED: "Indisposição / enjoo",
  OTHER: "Outro motivo",
};

export const ALLOWED_MEAL_PHOTO_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export type AllowedMealPhotoMime = (typeof ALLOWED_MEAL_PHOTO_MIMES)[number];

export const MAX_MEAL_PHOTO_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

export interface MealTrackingSubstitutionItem {
  mealItemId?: string;
  originalFoodName: string;
  substitutedWith: string;
  quantityFormatted?: string;
}

export interface MealTrackingLogRow {
  id: number;
  public_id: string;
  consultancy_id: number;
  student_membership_id: number;
  author_membership_id: number;
  meal_date: string;
  plan_id: number | null;
  plan_version_id: number | null;
  plan_version_number: number | null;
  meal_id: number | null;
  meal_public_id: string;
  meal_title: string;
  meal_scheduled_time: string | null;
  status: MealTrackingStatus;
  not_done_reason: MealNotDoneReason | null;
  consumed_at_time: string | null;
  notes: string | null;
  selected_substitutions_json: string | null;
  photo_storage_key: string | null;
  photo_sha256: string | null;
  photo_size_bytes: number | null;
  photo_mime_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface MealTrackingLogDto {
  publicId: string;
  mealDate: string; // YYYY-MM-DD
  mealPublicId: string;
  mealTitle: string;
  mealScheduledTime?: string | null;
  status: MealTrackingStatus;
  statusLabel: string;
  notDoneReason?: MealNotDoneReason | null;
  notDoneReasonLabel?: string | null;
  consumedAtTime?: string | null;
  notes?: string | null;
  substitutions: MealTrackingSubstitutionItem[];
  hasPhoto: boolean;
  photoUrl?: string | null;
  photoSizeBytes?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaveMealTrackingInput {
  mealDate: string; // YYYY-MM-DD
  mealPublicId: string;
  mealTitle: string;
  mealScheduledTime?: string | null;
  planId?: number | null;
  planVersionId?: number | null;
  planVersionNumber?: number | null;
  mealId?: number | null;
  status: MealTrackingStatus;
  notDoneReason?: MealNotDoneReason | null;
  consumedAtTime?: string | null;
  notes?: string | null;
  substitutions?: MealTrackingSubstitutionItem[];
}

export interface MealTrackingDayItemDto {
  mealPublicId: string;
  mealTitle: string;
  mealScheduledTime?: string | null;
  itemsDescription?: string[];
  substitutionsAvailable?: {
    originalFoodName: string;
    options: { foodName: string; quantityFormatted?: string }[];
  }[];
  tracking: MealTrackingLogDto | null;
}

export interface MealTrackingDayGroupDto {
  date: string; // YYYY-MM-DD
  dateFormatted: string; // "Quinta-feira, 22 de Outubro"
  hasActivePlan: boolean;
  planTitle?: string | null;
  planVersionNumber?: number | null;
  meals: MealTrackingDayItemDto[];
  adherenceRate: number; // 0..100
  completedCount: number;
  completedWithChangesCount: number;
  notDoneCount: number;
  unregisteredCount: number;
}

export interface MealTrackingPeriodSummaryDto {
  startDate: string;
  endDate: string;
  totalDaysWithPlan: number;
  totalExpectedMeals: number;
  totalCompleted: number;
  totalCompletedWithChanges: number;
  totalNotDone: number;
  totalUnregistered: number;
  totalAdheredMeals: number; // COMPLETED + COMPLETED_WITH_CHANGES
  adherencePercentage: number; // 0..100
  hasSufficientData: boolean;
  days: MealTrackingDayGroupDto[];
}
