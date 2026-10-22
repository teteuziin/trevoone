import type {
  BiologicalSex,
  UpdatePatientPhysiologicalInput,
  SaveClinicalNoteInput,
  ClinicalNoteContextType,
  ClinicalNoteStatus,
  AddAnthropometricEntryInput,
  UpdateAnthropometricEntryInput,
  SkinfoldProtocol,
  AnthropometricSourceType,
} from "./patient-record-types";

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
  birthDate?: string | null;
  biologicalSex?: BiologicalSex | null;
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
  foodIntolerances?: string | null;
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
  fieldProvenanceJson?: string | null;
};

export type { AddAnthropometricEntryInput };

export type UpdatePregnancyInput = {
  pregnancyStatus: PregnancyStatus;
  estimatedDueDate?: string | null;
  gestationalWeeks?: number | null;
  gestationalReferenceDate?: string | null;
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
 * TREVO ONE — NUTRITION V2 PATIENT RECORD VALIDATION
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
 * Validates a numeric measurement field with allowed range bounds.
 */
export function validateNumericMeasurement(
  val: unknown,
  fieldName: string,
  min: number,
  max: number
): number | null {
  if (val === null || val === undefined || val === "") {
    return null;
  }

  const num = typeof val === "number" ? val : Number(String(val).replace(",", "."));
  if (isNaN(num)) {
    throw new PatientRecordValidationError(
      `O valor de ${fieldName} deve ser um número válido.`,
      "INVALID_NUMERIC_VALUE"
    );
  }

  if (num < min || num > max) {
    throw new PatientRecordValidationError(
      `O valor de ${fieldName} deve estar entre ${min} e ${max}.`,
      "VALUE_OUT_OF_RANGE"
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
      `A data de ${fieldName} deve ser uma string válida.`,
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
      `A data de ${fieldName} é inválida.`,
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
      `A data de ${fieldName} é um calendário inválido.`,
      "INVALID_DATE_VALUE"
    );
  }

  return trimmed;
}

/**
 * Validates birth date.
 * Rules:
 * - Must be valid calendar date in YYYY-MM-DD format
 * - Cannot be in the future
 * - Year must be >= 1900
 */
export function validateBirthDate(val: unknown): string | null {
  if (val === null || val === undefined || val === "") {
    return null;
  }
  const dateStr = validateDate(val, "nascimento");
  if (!dateStr) return null;
  const todayStr = new Date().toISOString().slice(0, 10);
  if (dateStr > todayStr) {
    throw new PatientRecordValidationError(
      "A data de nascimento não pode estar no futuro.",
      "BIRTH_DATE_IN_FUTURE"
    );
  }
  return dateStr;
}

/**
 * Canonical biological sex validator & normalizer.
 * Accepts only domain values: MALE/FEMALE and common PT-BR aliases.
 * Rejects unknown non-empty values.
 */
export function canonicalBiologicalSex(val: unknown): BiologicalSex | null {
  if (val === null || val === undefined || val === "") {
    return null;
  }
  const s = String(val).trim().toUpperCase();
  if (s === "MALE" || s === "MASCULINO" || s === "M" || s === "HOMEM") {
    return "MALE";
  }
  if (s === "FEMALE" || s === "FEMININO" || s === "F" || s === "MULHER") {
    return "FEMALE";
  }
  throw new PatientRecordValidationError(
    "Sexo biológico inválido. Valores aceitos: Masculino ('MALE') ou Feminino ('FEMALE').",
    "INVALID_BIOLOGICAL_SEX"
  );
}

/**
 * Sanitizes and trims optional text fields. Empty string returns null.
 */
export function sanitizeOptionalText(val: unknown, maxLength = 65535): string | null {
  if (val === null || val === undefined) {
    return null;
  }
  const s = String(val).trim();
  if (s.length === 0) {
    return null;
  }
  if (s.length > maxLength) {
    return s.slice(0, maxLength);
  }
  return s;
}

/**
 * Validates anthropometric entry input.
 */
export function validateAnthropometricEntryInput(input: unknown): AddAnthropometricEntryInput {
  if (!input || typeof input !== "object") {
    throw new PatientRecordValidationError(
      "Dados antropométricos inválidos.",
      "INVALID_PAYLOAD"
    );
  }

  const raw = input as Record<string, unknown>;

  if (!raw.measurementDate) {
    throw new PatientRecordValidationError(
      "A data da medição é obrigatória.",
      "REQUIRED_MEASUREMENT_DATE"
    );
  }

  const measurementDate = validateDate(raw.measurementDate, "medição");
  if (!measurementDate) {
    throw new PatientRecordValidationError(
      "A data da medição é obrigatória e deve ser válida.",
      "REQUIRED_MEASUREMENT_DATE"
    );
  }

  const weightKg = validateNumericMeasurement(raw.weightKg, "peso", 10, 500);
  const heightCm = validateNumericMeasurement(raw.heightCm, "altura", 40, 300);
  const waistCm = validateNumericMeasurement(raw.waistCm, "cintura", 10, 300);
  const hipCm = validateNumericMeasurement(raw.hipCm, "quadril", 10, 300);
  const armCm = validateNumericMeasurement(raw.armCm, "braço", 5, 150);
  const thighCm = validateNumericMeasurement(raw.thighCm, "coxa", 10, 150);
  const calfCm = validateNumericMeasurement(raw.calfCm, "panturrilha", 10, 150);
  const chestCm = validateNumericMeasurement(raw.chestCm, "peitoral/tórax", 10, 300);

  // Additional circumferences
  const neckCm = validateNumericMeasurement(raw.neckCm, "pescoço", 10, 100);
  const forearmCm = validateNumericMeasurement(raw.forearmCm, "antebraço", 5, 100);
  const abdomenCm = validateNumericMeasurement(raw.abdomenCm, "abdômen", 10, 300);
  const relaxedArmCm = validateNumericMeasurement(raw.relaxedArmCm, "braço relaxado", 5, 150);
  const contractedArmCm = validateNumericMeasurement(raw.contractedArmCm, "braço contraído", 5, 150);

  // Skinfolds (mm)
  const tricepsMm = validateNumericMeasurement(raw.tricepsMm, "dobra tríceps", 1, 80);
  const bicepsMm = validateNumericMeasurement(raw.bicepsMm, "dobra bíceps", 1, 80);
  const subscapularMm = validateNumericMeasurement(raw.subscapularMm, "dobra subescapular", 1, 80);
  const suprailiacMm = validateNumericMeasurement(raw.suprailiacMm, "dobra suprailíaca", 1, 80);
  const abdominalFoldMm = validateNumericMeasurement(raw.abdominalFoldMm, "dobra abdominal", 1, 80);
  const chestFoldMm = validateNumericMeasurement(raw.chestFoldMm, "dobra peitoral", 1, 80);
  const thighFoldMm = validateNumericMeasurement(raw.thighFoldMm, "dobra coxa", 1, 80);
  const midaxillaryMm = validateNumericMeasurement(raw.midaxillaryMm, "dobra axilar média", 1, 80);
  const calfFoldMm = validateNumericMeasurement(raw.calfFoldMm, "dobra panturrilha", 1, 80);

  const rawProtocol = String(raw.skinfoldProtocol || "").trim().toUpperCase();
  const skinfoldProtocol: SkinfoldProtocol | null =
    rawProtocol === "POLLOCK_3" ||
    rawProtocol === "POLLOCK_7" ||
    rawProtocol === "FAULKNER_4" ||
    rawProtocol === "PETROSKI_4" ||
    rawProtocol === "DURNIN_WOMERSLEY_4" ||
    rawProtocol === "NONE"
      ? (rawProtocol as SkinfoldProtocol)
      : null;

  // Body Composition
  const bodyFatPct = validateNumericMeasurement(raw.bodyFatPct, "% gordura", 1, 75);
  const fatMassKg = validateNumericMeasurement(raw.fatMassKg, "massa gorda", 0.5, 300);
  const leanMassKg = validateNumericMeasurement(raw.leanMassKg, "massa livre de gordura", 5, 300);
  const muscleMassKg = validateNumericMeasurement(raw.muscleMassKg, "massa muscular", 5, 300);
  const bodyWaterPct = validateNumericMeasurement(raw.bodyWaterPct, "água corporal (%)", 10, 85);
  const bodyWaterKg = validateNumericMeasurement(raw.bodyWaterKg, "água corporal (kg)", 5, 200);
  const boneMassValue = validateNumericMeasurement(raw.boneMassValue, "massa óssea", 0.1, 50);
  const boneMassUnit = sanitizeOptionalText(raw.boneMassUnit, 20);
  const boneMassMethod = sanitizeOptionalText(raw.boneMassMethod, 100);

  // Metadata
  const rawSource = String(raw.sourceType || "").trim().toUpperCase();
  const sourceType: AnthropometricSourceType =
    rawSource === "PATIENT_REPORTED" ? "PATIENT_REPORTED" : "PROFESSIONAL_RECORDED";
  const equipmentMethod = sanitizeOptionalText(raw.equipmentMethod, 150);
  const notes = sanitizeOptionalText(raw.notes, 500);

  const hasAnyMeasurement =
    weightKg !== null ||
    heightCm !== null ||
    waistCm !== null ||
    hipCm !== null ||
    armCm !== null ||
    thighCm !== null ||
    calfCm !== null ||
    chestCm !== null ||
    neckCm !== null ||
    forearmCm !== null ||
    abdomenCm !== null ||
    relaxedArmCm !== null ||
    contractedArmCm !== null ||
    tricepsMm !== null ||
    bicepsMm !== null ||
    subscapularMm !== null ||
    suprailiacMm !== null ||
    abdominalFoldMm !== null ||
    chestFoldMm !== null ||
    thighFoldMm !== null ||
    midaxillaryMm !== null ||
    calfFoldMm !== null ||
    bodyFatPct !== null ||
    fatMassKg !== null ||
    leanMassKg !== null ||
    muscleMassKg !== null ||
    bodyWaterPct !== null ||
    bodyWaterKg !== null ||
    boneMassValue !== null ||
    notes !== null;

  if (!hasAnyMeasurement) {
    throw new PatientRecordValidationError(
      "Informe ao menos uma medição antropométrica ou observação.",
      "EMPTY_ANTHROPOMETRICS"
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
    neckCm,
    forearmCm,
    abdomenCm,
    relaxedArmCm,
    contractedArmCm,
    tricepsMm,
    bicepsMm,
    subscapularMm,
    suprailiacMm,
    abdominalFoldMm,
    chestFoldMm,
    thighFoldMm,
    midaxillaryMm,
    calfFoldMm,
    skinfoldProtocol,
    bodyFatPct,
    fatMassKg,
    leanMassKg,
    muscleMassKg,
    bodyWaterPct,
    bodyWaterKg,
    boneMassValue,
    boneMassUnit,
    boneMassMethod,
    sourceType,
    equipmentMethod,
    notes,
  };
}

/**
 * Validates update input for an existing anthropometric entry.
 */
export function validateUpdateAnthropometricEntryInput(
  input: unknown
): UpdateAnthropometricEntryInput {
  if (!input || typeof input !== "object") {
    throw new PatientRecordValidationError(
      "Dados de atualização de medição inválidos.",
      "INVALID_PAYLOAD"
    );
  }

  const raw = input as Record<string, unknown>;
  const entryPublicId = String(raw.entryPublicId || "").trim();
  if (!entryPublicId) {
    throw new PatientRecordValidationError(
      "O identificador da medição é obrigatório.",
      "REQUIRED_ENTRY_PUBLIC_ID"
    );
  }

  const editReason = String(raw.editReason || "").trim();
  if (!editReason || editReason.length < 3) {
    throw new PatientRecordValidationError(
      "Informe uma justificativa para a correção da medição (mínimo de 3 caracteres).",
      "REQUIRED_EDIT_REASON"
    );
  }

  const baseValidated = validateAnthropometricEntryInput(input);

  return {
    ...baseValidated,
    entryPublicId,
    editReason: editReason.slice(0, 255),
  };
}

/**
 * Validates pregnancy record input.
 */
export function validatePregnancyInput(input: unknown): UpdatePregnancyInput {
  if (!input || typeof input !== "object") {
    throw new PatientRecordValidationError(
      "Dados de gestação inválidos.",
      "INVALID_PAYLOAD"
    );
  }

  const raw = input as Record<string, unknown>;

  const statusRaw = String(raw.pregnancyStatus || "").trim().toUpperCase();
  if (!ALL_PREGNANCY_STATUSES.includes(statusRaw as PregnancyStatus)) {
    throw new PatientRecordValidationError(
      `Status gestacional inválido. Valores aceitos: ${ALL_PREGNANCY_STATUSES.join(", ")}.`,
      "INVALID_PREGNANCY_STATUS"
    );
  }

  const pregnancyStatus = statusRaw as PregnancyStatus;

  const estimatedDueDate = validateDate(raw.estimatedDueDate, "data provável do parto");
  const lastMenstrualPeriodDate = validateDate(raw.lastMenstrualPeriodDate, "data da última menstruação (DUM)");
  const deliveryDate = validateDate(raw.deliveryDate, "data do parto");
  const gestationalReferenceDate = validateDate(raw.gestationalReferenceDate, "data de referência gestacional");

  let gestationalWeeks: number | null = null;
  if (raw.gestationalWeeks !== null && raw.gestationalWeeks !== undefined && raw.gestationalWeeks !== "") {
    const gw = Number(raw.gestationalWeeks);
    if (!Number.isInteger(gw) || gw < 1 || gw > 45) {
      throw new PatientRecordValidationError(
        "A semana gestacional deve ser um número inteiro entre 1 e 45.",
        "INVALID_GESTATIONAL_WEEKS"
      );
    }
    gestationalWeeks = gw;
  }

  const prePregnancyWeightKg = validateNumericMeasurement(
    raw.prePregnancyWeightKg,
    "peso pré-gestacional",
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
    gestationalReferenceDate,
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
      "Dados do prontuário inválidos.",
      "INVALID_PAYLOAD"
    );
  }

  const raw = input as Record<string, unknown>;

  return {
    birthDate: raw.birthDate !== undefined ? validateBirthDate(raw.birthDate) : undefined,
    biologicalSex: raw.biologicalSex !== undefined ? canonicalBiologicalSex(raw.biologicalSex) : undefined,
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
    foodIntolerances: sanitizeOptionalText(raw.foodIntolerances),
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
    fieldProvenanceJson: sanitizeOptionalText(raw.fieldProvenanceJson),
  };
}

/**
 * Validates discrete physiological data input for patient record (Release 3.1).
 * Differentiates omitted fields (undefined) from explicitly cleared fields (null / empty string).
 */
export function validatePhysiologicalInput(input: unknown): UpdatePatientPhysiologicalInput {
  if (!input || typeof input !== "object") {
    throw new PatientRecordValidationError(
      "Dados fisiológicos inválidos.",
      "INVALID_PAYLOAD"
    );
  }

  const raw = input as Record<string, unknown>;
  const result: UpdatePatientPhysiologicalInput = {};

  if ("birthDate" in raw && raw.birthDate !== undefined) {
    result.birthDate = validateBirthDate(raw.birthDate);
  }

  if ("biologicalSex" in raw && raw.biologicalSex !== undefined) {
    result.biologicalSex = canonicalBiologicalSex(raw.biologicalSex);
  }

  return result;
}

/**
 * Validates clinical note input for clinical records.
 */
export function validateClinicalNoteInput(input: unknown): SaveClinicalNoteInput {
  if (!input || typeof input !== "object") {
    throw new PatientRecordValidationError(
      "Dados da anotação clínica inválidos.",
      "INVALID_PAYLOAD"
    );
  }

  const raw = input as Record<string, unknown>;
  const publicId = raw.publicId ? String(raw.publicId).trim() : null;

  const noteDate = validateDate(raw.noteDate, "data da anotação");
  if (!noteDate) {
    throw new PatientRecordValidationError(
      "Data da anotação clínica é obrigatória.",
      "REQUIRED_NOTE_DATE"
    );
  }

  const validContexts: ClinicalNoteContextType[] = [
    "INITIAL",
    "FOLLOW_UP",
    "ROUTINE",
    "SPONTANEOUS",
    "INTERDISCIPLINARY",
  ];
  const contextTypeRaw = String(raw.contextType || "ROUTINE").trim().toUpperCase();
  const contextType = validContexts.includes(contextTypeRaw as ClinicalNoteContextType)
    ? (contextTypeRaw as ClinicalNoteContextType)
    : "ROUTINE";

  const content = sanitizeOptionalText(raw.content, 65535);
  if (!content) {
    throw new PatientRecordValidationError(
      "O conteúdo da anotação clínica é obrigatório.",
      "REQUIRED_NOTE_CONTENT"
    );
  }

  const conduct = sanitizeOptionalText(raw.conduct, 65535);

  const statusRaw = String(raw.status || "DRAFT").trim().toUpperCase();
  const status: ClinicalNoteStatus = statusRaw === "FINALIZED" ? "FINALIZED" : "DRAFT";

  return {
    publicId,
    noteDate,
    contextType,
    content,
    conduct,
    status,
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
