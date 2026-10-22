/**
 * TREVO ONE — NUTRITION V2 MEAL TRACKING VALIDATION
 *
 * Etapa 12: Acompanhamento das Refeições
 */

import {
  MEAL_TRACKING_STATUSES,
  MEAL_NOT_DONE_REASONS,
  ALLOWED_MEAL_PHOTO_MIMES,
  MAX_MEAL_PHOTO_SIZE_BYTES,
  type MealTrackingStatus,
  type MealNotDoneReason,
  type SaveMealTrackingInput,
} from "./meal-tracking-types";
import { detectReceiptFileType } from "../storage/private-files";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export interface ValidatedMealTrackingInput {
  mealDate: string;
  mealPublicId: string;
  mealTitle: string;
  mealScheduledTime: string | null;
  planId: number | null;
  planVersionId: number | null;
  planVersionNumber: number | null;
  mealId: number | null;
  status: MealTrackingStatus;
  notDoneReason: MealNotDoneReason | null;
  consumedAtTime: string | null;
  notes: string | null;
  substitutions: {
    mealItemId?: string;
    originalFoodName: string;
    substitutedWith: string;
    quantityFormatted?: string;
  }[];
}

export function validateMealTrackingInput(input: unknown): ValidatedMealTrackingInput {
  if (!input || typeof input !== "object") {
    throw new Error("Dados de registro de refeição inválidos.");
  }

  const raw = input as Partial<SaveMealTrackingInput>;

  // 1. mealDate
  if (!raw.mealDate || typeof raw.mealDate !== "string" || !DATE_REGEX.test(raw.mealDate.trim())) {
    throw new Error("Data da refeição inválida. Use o formato AAAA-MM-DD.");
  }
  const mealDate = raw.mealDate.trim();

  // 2. mealPublicId & mealTitle
  if (!raw.mealPublicId || typeof raw.mealPublicId !== "string" || !raw.mealPublicId.trim()) {
    throw new Error("Identificador da refeição é obrigatório.");
  }
  const mealPublicId = raw.mealPublicId.trim();

  if (!raw.mealTitle || typeof raw.mealTitle !== "string" || !raw.mealTitle.trim()) {
    throw new Error("Título da refeição é obrigatório.");
  }
  const mealTitle = raw.mealTitle.trim().slice(0, 255);

  // 3. status
  if (!raw.status || !MEAL_TRACKING_STATUSES.includes(raw.status as MealTrackingStatus)) {
    throw new Error("Estado da refeição inválido. Selecione 'Fiz', 'Fiz com alterações' ou 'Não fiz'.");
  }
  const status = raw.status as MealTrackingStatus;

  // 4. notDoneReason
  let notDoneReason: MealNotDoneReason | null = null;
  if (status === "NOT_DONE" && raw.notDoneReason) {
    if (MEAL_NOT_DONE_REASONS.includes(raw.notDoneReason as MealNotDoneReason)) {
      notDoneReason = raw.notDoneReason as MealNotDoneReason;
    } else {
      notDoneReason = "OTHER";
    }
  }

  // 5. consumedAtTime
  let consumedAtTime: string | null = null;
  if (raw.consumedAtTime && typeof raw.consumedAtTime === "string") {
    const trimmedTime = raw.consumedAtTime.trim();
    if (TIME_REGEX.test(trimmedTime)) {
      consumedAtTime = trimmedTime;
    }
  }

  // 6. mealScheduledTime
  let mealScheduledTime: string | null = null;
  if (raw.mealScheduledTime && typeof raw.mealScheduledTime === "string") {
    mealScheduledTime = raw.mealScheduledTime.trim().slice(0, 20);
  }

  // 7. notes
  let notes: string | null = null;
  if (raw.notes && typeof raw.notes === "string") {
    const trimmedNotes = raw.notes.trim();
    if (trimmedNotes.length > 0) {
      notes = trimmedNotes.slice(0, 2000);
    }
  }

  // 8. substitutions
  const substitutions: {
    mealItemId?: string;
    originalFoodName: string;
    substitutedWith: string;
    quantityFormatted?: string;
  }[] = [];

  if (Array.isArray(raw.substitutions)) {
    for (const sub of raw.substitutions) {
      if (
        sub &&
        typeof sub === "object" &&
        typeof sub.originalFoodName === "string" &&
        typeof sub.substitutedWith === "string"
      ) {
        const orig = sub.originalFoodName.trim();
        const dest = sub.substitutedWith.trim();
        if (orig && dest) {
          substitutions.push({
            mealItemId: typeof sub.mealItemId === "string" ? sub.mealItemId.trim() : undefined,
            originalFoodName: orig.slice(0, 200),
            substitutedWith: dest.slice(0, 200),
            quantityFormatted:
              typeof sub.quantityFormatted === "string"
                ? sub.quantityFormatted.trim().slice(0, 100)
                : undefined,
          });
        }
      }
    }
  }

  return {
    mealDate,
    mealPublicId,
    mealTitle,
    mealScheduledTime,
    planId: typeof raw.planId === "number" ? raw.planId : null,
    planVersionId: typeof raw.planVersionId === "number" ? raw.planVersionId : null,
    planVersionNumber: typeof raw.planVersionNumber === "number" ? raw.planVersionNumber : null,
    mealId: typeof raw.mealId === "number" ? raw.mealId : null,
    status,
    notDoneReason,
    consumedAtTime,
    notes,
    substitutions,
  };
}

export function validateMealPhotoBuffer(
  buffer: Buffer,
  clientMimeType?: string
): { mimeType: string; extension: string } {
  if (!buffer || buffer.length === 0) {
    throw new Error("Arquivo da foto está vazio.");
  }
  if (buffer.length > MAX_MEAL_PHOTO_SIZE_BYTES) {
    throw new Error("A foto excede o tamanho máximo permitido de 8 MB.");
  }

  const detection = detectReceiptFileType(buffer, clientMimeType);
  if (!detection.valid || !detection.mimeType || !detection.extension) {
    throw new Error(detection.error || "Formato de arquivo não suportado.");
  }

  if (!ALLOWED_MEAL_PHOTO_MIMES.includes(detection.mimeType as (typeof ALLOWED_MEAL_PHOTO_MIMES)[number])) {
    throw new Error(
      "Formato de imagem inválido. As fotos das refeições devem ser enviadas em JPG, PNG ou WEBP (documentos em PDF não são permitidos)."
    );
  }

  return {
    mimeType: detection.mimeType,
    extension: detection.extension,
  };
}
