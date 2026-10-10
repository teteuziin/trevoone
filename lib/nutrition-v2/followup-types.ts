/**
 * TREVO ONE — PATIENT FOLLOW-UP & CLINICAL TIMELINE DOMAIN TYPES (V1)
 *
 * Rules:
 * - Event Types V1: 'FOOD_PHOTO' | 'PATIENT_NOTE'
 * - Meal Types: BREAKFAST, MORNING_SNACK, LUNCH, AFTERNOON_SNACK, DINNER, SUPPER, OTHER
 * - Strict Invariants:
 *   - FOOD_PHOTO: photo metadata required, mime in (jpeg, png, webp), caption optional, meal_type optional.
 *   - PATIENT_NOTE: caption required, photo metadata null, meal_type null.
 * - Reverse-chronological timeline composition with Phase 7 check-ins without duplication.
 */

export const FOLLOWUP_EVENT_TYPES = ["FOOD_PHOTO", "PATIENT_NOTE"] as const;
export type FollowupEventType = (typeof FOLLOWUP_EVENT_TYPES)[number];

export const FOLLOWUP_MEAL_TYPES = [
  "BREAKFAST",
  "MORNING_SNACK",
  "LUNCH",
  "AFTERNOON_SNACK",
  "DINNER",
  "SUPPER",
  "OTHER",
] as const;
export type FollowupMealType = (typeof FOLLOWUP_MEAL_TYPES)[number];

export const FOLLOWUP_MEAL_TYPE_LABELS: Record<FollowupMealType, string> = {
  BREAKFAST: "Café da manhã",
  MORNING_SNACK: "Lanche da manhã",
  LUNCH: "Almoço",
  AFTERNOON_SNACK: "Lanche da tarde",
  DINNER: "Jantar",
  SUPPER: "Ceia",
  OTHER: "Outro",
};

export const ALLOWED_FOOD_PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export type AllowedFoodPhotoMimeType = (typeof ALLOWED_FOOD_PHOTO_MIME_TYPES)[number];

export const MAX_FOOD_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export interface FollowupEventRowDto {
  id: number;
  publicId: string;
  consultancyId: number;
  studentMembershipId: number;
  authorMembershipId: number;
  authorName?: string;
  authorRole?: string;
  eventType: FollowupEventType;
  occurredAt: string;
  mealType: FollowupMealType | null;
  caption: string | null;
  photoStorageKey: string | null;
  photoSha256: string | null;
  photoSizeBytes: number | null;
  photoMimeType: string | null;
  createdAt: string;
}

export interface CreateFoodPhotoEventInput {
  consultancyId: number;
  studentMembershipId: number;
  authorMembershipId: number;
  occurredAt?: string | Date;
  mealType?: FollowupMealType | null;
  caption?: string | null;
  photoStorageKey: string;
  photoSha256: string;
  photoSizeBytes: number;
  photoMimeType: string;
}

export interface CreatePatientNoteEventInput {
  consultancyId: number;
  studentMembershipId: number;
  authorMembershipId: number;
  occurredAt?: string | Date;
  caption: string;
}

export type TimelineItemType =
  | "FOOD_PHOTO"
  | "PATIENT_NOTE"
  | "CHECKIN_REQUEST"
  | "CHECKIN_RESPONSE";

export interface FoodPhotoTimelinePayload {
  mealType: FollowupMealType | null;
  mealTypeLabel: string | null;
  caption: string | null;
  photoEventPublicId: string;
}

export interface PatientNoteTimelinePayload {
  text: string;
}

export interface CheckinRequestTimelinePayload {
  requestPublicId: string;
  status: string;
  derivedState: string;
  dueAt: string | null;
  requestedByName: string;
}

export interface CheckinResponseTimelinePayload {
  responsePublicId: string;
  requestPublicId: string;
  adherence: string;
  adherenceLabel: string;
  ratings: {
    hunger: number | null;
    energy: number | null;
    sleep: number | null;
    training: number | null;
  };
  hydrationLiters: number | null;
  selfReportedWeightKg: number | null;
  difficultyText: string | null;
  studentNotes: string | null;
  requestsHelp: boolean | null;
}

export interface FollowupTimelineItemDto {
  id: string; // unique item id (event public_id, request public_id, or response public_id)
  type: TimelineItemType;
  occurredAt: string; // ISO
  author: {
    name: string;
    role: "STUDENT" | "PROFESSIONAL";
  };
  payload:
    | { kind: "FOOD_PHOTO"; data: FoodPhotoTimelinePayload }
    | { kind: "PATIENT_NOTE"; data: PatientNoteTimelinePayload }
    | { kind: "CHECKIN_REQUEST"; data: CheckinRequestTimelinePayload }
    | { kind: "CHECKIN_RESPONSE"; data: CheckinResponseTimelinePayload };
}

export interface PatientFollowupHubSummaryDto {
  studentPublicId: string;
  studentName: string;
  timeline: FollowupTimelineItemDto[];
  totalEventsCount: number;
  pendingCheckinRequest: CheckinRequestTimelinePayload | null;
}

export type FollowupTimelineFilter = "all" | "meals" | "checkins" | "notes";

/**
 * Validates occurredAt timestamp against clock drift / absurd future dates.
 * Maximum tolerance: 5 minutes into future.
 */
export function validateOccurredAt(raw: string | Date | undefined): Date {
  const date = raw ? (typeof raw === "string" ? new Date(raw) : raw) : new Date();
  if (isNaN(date.getTime())) {
    throw new Error("Data ou horário inválido.");
  }
  const maxFuture = new Date(Date.now() + 5 * 60 * 1000); // 5 min future tolerance
  if (date.getTime() > maxFuture.getTime()) {
    throw new Error("A data do acompanhamento não pode estar no futuro.");
  }
  return date;
}

/**
 * Domain invariant check for FOOD_PHOTO
 */
export function validateFoodPhotoInput(input: CreateFoodPhotoEventInput): void {
  if (!input.consultancyId || input.consultancyId <= 0) {
    throw new Error("Consultoria inválida.");
  }
  if (!input.studentMembershipId || input.studentMembershipId <= 0) {
    throw new Error("Membro de aluno inválido.");
  }
  if (!input.authorMembershipId || input.authorMembershipId <= 0) {
    throw new Error("Autor inválido.");
  }
  if (!input.photoStorageKey || typeof input.photoStorageKey !== "string" || !input.photoStorageKey.trim()) {
    throw new Error("Foto é obrigatória para o registro de refeição.");
  }
  if (!input.photoSha256 || typeof input.photoSha256 !== "string" || input.photoSha256.length !== 64) {
    throw new Error("Assinatura de segurança da foto inválida.");
  }
  if (!input.photoSizeBytes || input.photoSizeBytes <= 0 || input.photoSizeBytes > MAX_FOOD_PHOTO_SIZE_BYTES) {
    throw new Error("Tamanho da foto excede o limite permitido de 5 MB.");
  }
  if (
    !input.photoMimeType ||
    !ALLOWED_FOOD_PHOTO_MIME_TYPES.includes(input.photoMimeType as AllowedFoodPhotoMimeType)
  ) {
    throw new Error("Formato de imagem inválido. Permitido apenas JPEG, PNG ou WEBP.");
  }
  if (input.mealType && !FOLLOWUP_MEAL_TYPES.includes(input.mealType)) {
    throw new Error("Tipo de refeição inválido.");
  }
  validateOccurredAt(input.occurredAt);
}

/**
 * Domain invariant check for PATIENT_NOTE
 */
export function validatePatientNoteInput(input: CreatePatientNoteEventInput): void {
  if (!input.consultancyId || input.consultancyId <= 0) {
    throw new Error("Consultoria inválida.");
  }
  if (!input.studentMembershipId || input.studentMembershipId <= 0) {
    throw new Error("Membro de aluno inválido.");
  }
  if (!input.authorMembershipId || input.authorMembershipId <= 0) {
    throw new Error("Autor inválido.");
  }
  const text = typeof input.caption === "string" ? input.caption.trim() : "";
  if (!text) {
    throw new Error("O texto da observação é obrigatório.");
  }
  if (text.length > 5000) {
    throw new Error("O texto da observação excede o tamanho máximo de 5000 caracteres.");
  }
  validateOccurredAt(input.occurredAt);
}
