export type PregnancyStatus =
  | "NOT_APPLICABLE"
  | "NOT_PREGNANT"
  | "PREGNANT"
  | "POSTPARTUM";

export const ALL_PREGNANCY_STATUSES: readonly PregnancyStatus[] = [
  "NOT_APPLICABLE",
  "NOT_PREGNANT",
  "PREGNANT",
  "POSTPARTUM",
] as const;

export type UpdatePatientRecordInput = {
  occupation?: string | null;
  routineNotes?: string | null;
  followUpReason?: string | null;
  reasonForFollowup?: string | null;
  mainObjective?: string | null;
  clinicalObservations?: string | null;
  diagnosedConditions?: string | null;
  previousSurgeries?: string | null;
  hospitalizations?: string | null;
  allergies?: string | null;
  foodAllergiesIntolerances?: string | null;
  currentMedications?: string | null;
  supplements?: string | null;
  familyHistory?: string | null;
  familyHealthHistory?: string | null;
  gastrointestinalNotes?: string | null;
  gastrointestinalObservations?: string | null;
  bowelHabit?: string | null;
  sleepNotes?: string | null;
  hydrationNotes?: string | null;
  foodPreferences?: string | null;
  dislikedFoods?: string | null;
  dietaryRestrictions?: string | null;
  usualEatingRoutine?: string | null;
  mealScheduleNotes?: string | null;
  mealScheduleObservations?: string | null;
  appetiteNotes?: string | null;
  appetiteObservations?: string | null;
  previousDiets?: string | null;
  difficultiesAdherenceNotes?: string | null;
  difficultiesAdherence?: string | null;
  physicalActivityNotes?: string | null;
  physicalActivityDescription?: string | null;
  smokingStatus?: string | null;
  alcoholNotes?: string | null;
  sleepRoutine?: string | null;
  workStudyRoutine?: string | null;
};

export type AddAnthropometricEntryInput = {
  measurementDate: string;
  weightKg?: number | null;
  heightCm?: number | null;
  waistCm?: number | null;
  hipCm?: number | null;
  armCm?: number | null;
  thighCm?: number | null;
  calfCm?: number | null;
  chestCm?: number | null;
  notes?: string | null;
};

export type UpdatePregnancyInput = {
  pregnancyStatus: PregnancyStatus;
  estimatedDueDate?: string | null;
  gestationalWeeks?: number | null;
  lastMenstrualPeriodDate?: string | null;
  prePregnancyWeightKg?: number | null;
  currentPregnancyWeightKg?: number | null;
  pregnancyType?: string | null;
  pregnancyNotes?: string | null;
  obstetricNotes?: string | null;
  supplementationNotes?: string | null;
  deliveryDate?: string | null;
  breastfeedingStatus?: string | null;
  postpartumNotes?: string | null;
};

/**
 * TREVO ONE ? NUTRITION V2 PATIENT RECORD VALIDATION
 * Validation rules for patient clinical data, anthropometric measurements, and pregnancy history.
 */


export class PatientRecordValidationError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code = "INVALID_PATIENT_RECORD", statusCode = 400) {
    super(message);
    this.name = "PatientRecordValidationError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Validates a numeric anthropometric or physiological measurement.
 * Rules:
 * - null, undefined, or empty string remains NULL (never coerced to 0).
 * - Must be a finite number.
 * - Must be strictly greater than 0.
 * - Must be within technically plausible anatomical/physical bounds.
 */
export function validateNumericMeasurement(
  val: unknown,
  fieldName: string,
  min = 1,
  max = 500
): number | null {
  if (val === null || val === undefined || val === "") {
    return null;
  }

  const num = typeof val === "number" ? val : Number(val);

  if (typeof num !== "number" || Number.isNaN(num) || !Number.isFinite(num)) {
    throw new PatientRecordValidationError(
      `O valor de ${fieldName} deve ser um n?mero v?lido e finito.`,
      "INVALID_NUMERIC_VALUE"
    );
  }

  if (num <= 0) {
    throw new PatientRecordValidationError(
      `O valor de ${fieldName} deve ser maior que zero.`,
      "NON_POSITIVE_MEASUREMENT"
    );
  }

  if (num < min || num > max) {
    throw new PatientRecordValidationError(
      `O valor de ${fieldName} (${num}) est? fora dos limites plaus?veis (${min} a ${max}).`,
      "MEASUREMENT_OUT_OF_BOUNDS"
    );
  }

  return Math.round(num * 100) / 100;
}

/**
 * Validates an optional date string in YYYY-MM-DD format.
 */
export function validateDate(val: unknown, fieldName: string): string | null {
  if (val === null || val === undefined || val === "") {
    return null;
  }

  if (typeof val !== "string") {
    throw new PatientRecordValidationError(
      `A data de ${fieldName} deve ser uma string v?lida.`,
      "INVALID_DATE_FORMAT"
    );
  }

  const trimmed = val.trim();
  if (!trimmed) {
    return null;
  }

  // Format YYYY-MM-DD
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) {
    throw new PatientRecordValidationError(
      `A data de ${fieldName} deve estar no formato AAAA-MM-DD (ex: 2026-05-15).`,
      "INVALID_DATE_FORMAT"
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
    throw new PatientRecordValidationError(
      `A data de ${fieldName} ? inv?lida.`,
      "INVALID_DATE_VALUE"
    );
  }

  const dateObj = new Date(Date.UTC(year, month - 1, day));
  if (
    dateObj.getUTCFullYear() !== year ||
    dateObj.getUTCMonth() !== month - 1 ||
    dateObj.getUTCDate() !== day
  ) {
    throw new PatientRecordValidationError(
      `A data de ${fieldName} ? um calend?rio inv?lido.`,
      "INVALID_DATE_VALUE"
    );
  }

  return trimmed;
}

/**
 * Sanitizes and trims optional text fields. Empty string returns null.
 */
export function sanitizeOptionalText(val: unknown, maxLength = 65535): string | null {
  if (val === null || val === undefined) {
    return null;
  }
  const str = String(val).trim();
  if (!str) {
    return null;
  }
  return str.length > maxLength ? str.slice(0, maxLength) : str;
}

/**
 * Validates anthropometric entry input.
 */
export function validateAnthropometricEntryInput(
  input: unknown
): AddAnthropometricEntryInput {
  if (!input || typeof input !== "object") {
    throw new PatientRecordValidationError(
      "Dados de medidas antropom?tricas inv?lidos.",
      "INVALID_PAYLOAD"
    );
  }

  const raw = input as Record<string, unknown>;

  const measurementDate = validateDate(raw.measurementDate, "data da medi??o");
  if (!measurementDate) {
    throw new PatientRecordValidationError(
      "A data da medi??o ? obrigat?ria.",
      "MISSING_MEASUREMENT_DATE"
    );
  }

  const weightKg = validateNumericMeasurement(raw.weightKg, "peso (kg)", 10, 500);
  const heightCm = validateNumericMeasurement(raw.heightCm, "altura (cm)", 40, 260);
  const waistCm = validateNumericMeasurement(raw.waistCm, "cintura (cm)", 20, 300);
  const hipCm = validateNumericMeasurement(raw.hipCm, "quadril (cm)", 20, 300);
  const armCm = validateNumericMeasurement(raw.armCm, "bra?o (cm)", 10, 150);
  const thighCm = validateNumericMeasurement(raw.thighCm, "coxa (cm)", 10, 150);
  const calfCm = validateNumericMeasurement(raw.calfCm, "panturrilha (cm)", 10, 100);
  const chestCm = validateNumericMeasurement(raw.chestCm, "t?rax (cm)", 20, 300);
  const notes = sanitizeOptionalText(raw.notes, 500);

  // At least one measurement or note must be present
  const hasMeasurement =
    weightKg !== null ||
    heightCm !== null ||
    waistCm !== null ||
    hipCm !== null ||
    armCm !== null ||
    thighCm !== null ||
    calfCm !== null ||
    chestCm !== null ||
    notes !== null;

  if (!hasMeasurement) {
    throw new PatientRecordValidationError(
      "Pelo menos uma medi??o ou observa??o deve ser informada.",
      "EMPTY_MEASUREMENT_ENTRY"
    );
  }

  return {
    measurementDate,
    weightKg,
    heightCm,
    waistCm,
    hipCm,
    armCm,
    thighCm,
    calfCm,
    chestCm,
    notes,
  };
}

/**
 * Validates pregnancy record input.
 */
export function validatePregnancyInput(input: unknown): UpdatePregnancyInput {
  if (!input || typeof input !== "object") {
    throw new PatientRecordValidationError(
      "Dados de gesta??o inv?lidos.",
      "INVALID_PAYLOAD"
    );
  }

  const raw = input as Record<string, unknown>;

  const statusRaw = String(raw.pregnancyStatus || "NOT_APPLICABLE").toUpperCase();
  if (!ALL_PREGNANCY_STATUSES.includes(statusRaw as PregnancyStatus)) {
    throw new PatientRecordValidationError(
      `Status gestacional inv?lido: '${raw.pregnancyStatus}'. Valores permitidos: ${ALL_PREGNANCY_STATUSES.join(", ")}.`,
      "INVALID_PREGNANCY_STATUS"
    );
  }

  const pregnancyStatus = statusRaw as PregnancyStatus;

  const estimatedDueDate = validateDate(raw.estimatedDueDate, "data prov?vel do parto");
  const lastMenstrualPeriodDate = validateDate(raw.lastMenstrualPeriodDate, "data da ?ltima menstrua??o (DUM)");
  const deliveryDate = validateDate(raw.deliveryDate, "data do parto");

  let gestationalWeeks: number | null = null;
  if (raw.gestationalWeeks !== null && raw.gestationalWeeks !== undefined && raw.gestationalWeeks !== "") {
    const gw = Number(raw.gestationalWeeks);
    if (!Number.isInteger(gw) || gw < 1 || gw > 45) {
      throw new PatientRecordValidationError(
        "A semana gestacional deve ser um n?mero inteiro entre 1 e 45.",
        "INVALID_GESTATIONAL_WEEKS"
      );
    }
    gestationalWeeks = gw;
  }

  const prePregnancyWeightKg = validateNumericMeasurement(
    raw.prePregnancyWeightKg,
    "peso pr?-gestacional",
    20,
    300
  );
  const currentPregnancyWeightKg = validateNumericMeasurement(
    raw.currentPregnancyWeightKg,
    "peso gestacional atual",
    20,
    300
  );

  const pregnancyType = sanitizeOptionalText(raw.pregnancyType, 50);
  const pregnancyNotes = sanitizeOptionalText(raw.pregnancyNotes, 65535);
  const obstetricNotes = sanitizeOptionalText(raw.obstetricNotes, 65535);
  const supplementationNotes = sanitizeOptionalText(raw.supplementationNotes, 65535);
  const breastfeedingStatus = sanitizeOptionalText(raw.breastfeedingStatus, 50);
  const postpartumNotes = sanitizeOptionalText(raw.postpartumNotes, 65535);

  return {
    pregnancyStatus,
    estimatedDueDate,
    gestationalWeeks,
    lastMenstrualPeriodDate,
    prePregnancyWeightKg,
    currentPregnancyWeightKg,
    pregnancyType,
    pregnancyNotes,
    obstetricNotes,
    supplementationNotes,
    deliveryDate,
    breastfeedingStatus,
    postpartumNotes,
  };
}

/**
 * Validates and sanitizes patient clinical record input.
 */
export function validatePatientRecordInput(input: unknown): UpdatePatientRecordInput {
  if (!input || typeof input !== "object") {
    throw new PatientRecordValidationError(
      "Dados do prontu?rio inv?lidos.",
      "INVALID_PAYLOAD"
    );
  }

  const raw = input as Record<string, unknown>;

  return {
    occupation: sanitizeOptionalText(raw.occupation, 255),
    routineNotes: sanitizeOptionalText(raw.routineNotes),
    followUpReason: sanitizeOptionalText(raw.followUpReason),
    mainObjective: sanitizeOptionalText(raw.mainObjective),
    clinicalObservations: sanitizeOptionalText(raw.clinicalObservations),
    diagnosedConditions: sanitizeOptionalText(raw.diagnosedConditions),
    previousSurgeries: sanitizeOptionalText(raw.previousSurgeries),
    hospitalizations: sanitizeOptionalText(raw.hospitalizations),
    allergies: sanitizeOptionalText(raw.allergies),
    foodAllergiesIntolerances: sanitizeOptionalText(raw.foodAllergiesIntolerances),
    currentMedications: sanitizeOptionalText(raw.currentMedications),
    supplements: sanitizeOptionalText(raw.supplements),
    familyHistory: sanitizeOptionalText(raw.familyHistory),
    gastrointestinalNotes: sanitizeOptionalText(raw.gastrointestinalNotes),
    bowelHabit: sanitizeOptionalText(raw.bowelHabit, 100),
    sleepNotes: sanitizeOptionalText(raw.sleepNotes),
    hydrationNotes: sanitizeOptionalText(raw.hydrationNotes),
    foodPreferences: sanitizeOptionalText(raw.foodPreferences),
    dislikedFoods: sanitizeOptionalText(raw.dislikedFoods),
    dietaryRestrictions: sanitizeOptionalText(raw.dietaryRestrictions),
    usualEatingRoutine: sanitizeOptionalText(raw.usualEatingRoutine),
    mealScheduleNotes: sanitizeOptionalText(raw.mealScheduleNotes),
    appetiteNotes: sanitizeOptionalText(raw.appetiteNotes),
    difficultiesAdherenceNotes: sanitizeOptionalText(raw.difficultiesAdherenceNotes),
    physicalActivityNotes: sanitizeOptionalText(raw.physicalActivityNotes),
    smokingStatus: sanitizeOptionalText(raw.smokingStatus, 50),
    alcoholNotes: sanitizeOptionalText(raw.alcoholNotes),
    sleepRoutine: sanitizeOptionalText(raw.sleepRoutine),
    workStudyRoutine: sanitizeOptionalText(raw.workStudyRoutine),
  };
}

/**
 * Simple deterministic helper for displaying gestational trimester.
 * NOTE: PURELY DESCRIPTIVE DISPLAY ONLY. NO METABOLIC OR CLINICAL RECOMMENDATIONS.
 */
export function deriveTrimester(gestationalWeeks: number | null): string | null {
  if (gestationalWeeks === null || gestationalWeeks === undefined || gestationalWeeks < 1) {
    return null;
  }
  if (gestationalWeeks <= 13) {
    return "1º Trimestre (1 a 13 semanas)";
  }
  if (gestationalWeeks <= 27) {
    return "2º Trimestre (14 a 27 semanas)";
  }
  return "3º Trimestre (28 a 40+ semanas)";
}
