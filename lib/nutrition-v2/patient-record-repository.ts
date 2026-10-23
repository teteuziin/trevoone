/**
 * TREVO ONE — NUTRITION V2 PATIENT RECORD REPOSITORY
 * Clinical history, lifestyle, historical anthropometrics, pregnancy, clinical notes, provenance, and field audit.
 */

import crypto from "node:crypto";
import type { RowDataPacket, ResultSetHeader, PoolConnection } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";
import { NutritionAuthorizationError } from "./access";
import {
  type PatientRecord,
  type PatientAnthropometricEntry,
  type PatientPregnancyRecord,
  type PatientRecordDetail,
  type OnboardingReferenceData,
  type UpdatePatientRecordInput,
  type AddAnthropometricEntryInput,
  type UpdateAnthropometricEntryInput,
  type SkinfoldProtocol,
  type AnthropometricSourceType,
  type UpdatePregnancyInput,
  type BiologicalSex,
  type UpdatePatientPhysiologicalInput,
  type ClinicalFieldProvenance,
  type PatientClinicalNoteDto,
  type SaveClinicalNoteInput,
  type PatientRecordAuditEntryDto,
  type ClinicalNoteContextType,
  type ClinicalNoteStatus,
  type PatientRecordPreQuestionnaireItem,
  CLINICAL_NOTE_CONTEXT_LABELS,
  CLINICAL_NOTE_STATUS_LABELS,
} from "./patient-record-types";
import {
  validatePatientRecordInput,
  validateAnthropometricEntryInput,
  validateUpdateAnthropometricEntryInput,
  validatePregnancyInput,
  validatePhysiologicalInput,
  validateClinicalNoteInput,
} from "./patient-record-validation";
import { listPatientLabExams } from "./patient-lab-exams-repository";
import { getPlanningFieldPreferences } from "./planning-preferences-repository";
import type { PatientLabExamRecord } from "./clinical-measurements-catalog";

function normalizeBioSex(raw: unknown): BiologicalSex | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim().toUpperCase();
  if (s === "MALE" || s === "MASCULINO" || s === "M" || s === "HOMEM") return "MALE";
  if (s === "FEMALE" || s === "FEMININO" || s === "F" || s === "MULHER") return "FEMALE";
  return null;
}

export class PatientRecordNotFoundError extends Error {
  public readonly code = "PATIENT_RECORD_NOT_FOUND";
  public readonly statusCode = 404;
  constructor(message = "Prontuário do paciente não encontrado.") {
    super(message);
    this.name = "PatientRecordNotFoundError";
  }
}

export class StudentNotFoundError extends Error {
  public readonly code = "STUDENT_NOT_FOUND";
  public readonly statusCode = 404;
  constructor(message = "Aluno/paciente não encontrado na consultoria.") {
    super(message);
    this.name = "StudentNotFoundError";
  }
}

function mapRowToPatientRecord(row: RowDataPacket): PatientRecord {
  return {
    id: Number(row.id),
    publicId: String(row.public_id),
    consultancyId: Number(row.consultancy_id),
    studentMembershipId: Number(row.student_membership_id),
    createdByMembershipId: Number(row.created_by_membership_id),
    birthDate: row.birth_date
      ? (typeof row.birth_date === "string"
          ? row.birth_date.slice(0, 10)
          : new Date(row.birth_date).toISOString().slice(0, 10))
      : null,
    biologicalSex: (row.biological_sex as BiologicalSex) || null,
    occupation: row.occupation ? String(row.occupation) : null,
    routineNotes: row.routine_notes ? String(row.routine_notes) : null,
    followUpReason: row.follow_up_reason ? String(row.follow_up_reason) : null,
    mainObjective: row.main_objective ? String(row.main_objective) : null,
    clinicalObservations: row.clinical_observations ? String(row.clinical_observations) : null,
    diagnosedConditions: row.diagnosed_conditions ? String(row.diagnosed_conditions) : null,
    previousSurgeries: row.previous_surgeries ? String(row.previous_surgeries) : null,
    hospitalizations: row.hospitalizations ? String(row.hospitalizations) : null,
    allergies: row.allergies ? String(row.allergies) : null,
    foodAllergiesIntolerances: row.food_allergies_intolerances ? String(row.food_allergies_intolerances) : null,
    foodIntolerances: row.food_intolerances
      ? String(row.food_intolerances)
      : (row.food_allergies_intolerances ? String(row.food_allergies_intolerances) : null),
    currentMedications: row.current_medications ? String(row.current_medications) : null,
    supplements: row.supplements ? String(row.supplements) : null,
    familyHistory: row.family_history ? String(row.family_history) : null,
    gastrointestinalNotes: row.gastrointestinal_notes ? String(row.gastrointestinal_notes) : null,
    bowelHabit: row.bowel_habit ? String(row.bowel_habit) : null,
    sleepNotes: row.sleep_notes ? String(row.sleep_notes) : null,
    hydrationNotes: row.hydration_notes ? String(row.hydration_notes) : null,
    foodPreferences: row.food_preferences ? String(row.food_preferences) : null,
    dislikedFoods: row.disliked_foods ? String(row.disliked_foods) : null,
    dietaryRestrictions: row.dietary_restrictions ? String(row.dietary_restrictions) : null,
    usualEatingRoutine: row.usual_eating_routine ? String(row.usual_eating_routine) : null,
    mealScheduleNotes: row.meal_schedule_notes ? String(row.meal_schedule_notes) : null,
    appetiteNotes: row.appetite_notes ? String(row.appetite_notes) : null,
    difficultiesAdherenceNotes: row.difficulties_adherence_notes ? String(row.difficulties_adherence_notes) : null,
    physicalActivityNotes: row.physical_activity_notes ? String(row.physical_activity_notes) : null,
    smokingStatus: row.smoking_status ? String(row.smoking_status) : null,
    alcoholNotes: row.alcohol_notes ? String(row.alcohol_notes) : null,
    sleepRoutine: row.sleep_routine ? String(row.sleep_routine) : null,
    workStudyRoutine: row.work_study_routine ? String(row.work_study_routine) : null,
    fieldProvenanceJson: row.field_provenance_json
      ? (typeof row.field_provenance_json === "string" ? row.field_provenance_json : JSON.stringify(row.field_provenance_json))
      : null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    deletedAt: row.deleted_at ? new Date(row.deleted_at).toISOString() : null,
  };
}

function mapRowToAnthropometricEntry(row: RowDataPacket): PatientAnthropometricEntry {
  const getNum = (val: unknown): number | null => {
    if (val === null || val === undefined || val === "") return null;
    const n = Number(val);
    return isNaN(n) ? null : n;
  };

  return {
    id: Number(row.id),
    publicId: String(row.public_id),
    patientRecordId: Number(row.patient_record_id),
    measurementDate: typeof row.measurement_date === "string" ? row.measurement_date : new Date(row.measurement_date).toISOString().slice(0, 10),
    weightKg: getNum(row.weight_kg),
    heightCm: getNum(row.height_cm),
    waistCm: getNum(row.waist_cm),
    hipCm: getNum(row.hip_cm),
    armCm: getNum(row.arm_cm),
    thighCm: getNum(row.thigh_cm),
    calfCm: getNum(row.calf_cm),
    chestCm: getNum(row.chest_cm),

    // Circunferências adicionais (cm)
    neckCm: getNum(row.neck_cm),
    forearmCm: getNum(row.forearm_cm),
    abdomenCm: getNum(row.abdomen_cm),
    relaxedArmCm: getNum(row.relaxed_arm_cm),
    contractedArmCm: getNum(row.contracted_arm_cm),

    // Dobras cutâneas (mm)
    tricepsMm: getNum(row.triceps_mm),
    bicepsMm: getNum(row.biceps_mm),
    subscapularMm: getNum(row.subscapular_mm),
    suprailiacMm: getNum(row.suprailiac_mm),
    abdominalFoldMm: getNum(row.abdominal_fold_mm),
    chestFoldMm: getNum(row.chest_fold_mm),
    thighFoldMm: getNum(row.thigh_fold_mm),
    midaxillaryMm: getNum(row.midaxillary_mm),
    calfFoldMm: getNum(row.calf_fold_mm),
    skinfoldProtocol: row.skinfold_protocol ? (String(row.skinfold_protocol) as SkinfoldProtocol) : null,

    // Composição corporal informada ou medida
    bodyFatPct: getNum(row.body_fat_pct),
    fatMassKg: getNum(row.fat_mass_kg),
    leanMassKg: getNum(row.lean_mass_kg),
    muscleMassKg: getNum(row.muscle_mass_kg),
    bodyWaterPct: getNum(row.body_water_pct),
    bodyWaterKg: getNum(row.body_water_kg),
    boneMassValue: getNum(row.bone_mass_value),
    boneMassUnit: row.bone_mass_unit ? String(row.bone_mass_unit) : null,
    boneMassMethod: row.bone_mass_method ? String(row.bone_mass_method) : null,

    // Metadados clínicos
    sourceType: (row.source_type || "PROFESSIONAL_RECORDED") as AnthropometricSourceType,
    equipmentMethod: row.equipment_method ? String(row.equipment_method) : null,
    notes: row.notes ? String(row.notes) : null,
    createdByMembershipId: Number(row.created_by_membership_id),
    createdByName: row.created_by_name ? String(row.created_by_name) : null,
    updatedByMembershipId: row.updated_by_membership_id ? Number(row.updated_by_membership_id) : null,
    updatedByName: row.updated_by_name ? String(row.updated_by_name) : null,
    editReason: row.edit_reason ? String(row.edit_reason) : null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),

    // Medidas ampliadas estruturadas (Release Etapa 14)
    perimeters: (() => {
      if (row.perimeters_json) {
        try {
          return typeof row.perimeters_json === "string" ? JSON.parse(row.perimeters_json) : row.perimeters_json;
        } catch {}
      }
      return {
        neckCm: getNum(row.neck_cm),
        chestCm: getNum(row.chest_cm),
        waistCm: getNum(row.waist_cm),
        abdomenCm: getNum(row.abdomen_cm),
        hipCm: getNum(row.hip_cm),
        relaxedArmRightCm: getNum(row.relaxed_arm_cm) ?? getNum(row.arm_cm),
        contractedArmRightCm: getNum(row.contracted_arm_cm),
        forearmRightCm: getNum(row.forearm_cm),
        midThighRightCm: getNum(row.thigh_cm),
        calfRightCm: getNum(row.calf_cm),
      };
    })(),
    diameters: (() => {
      if (row.diameters_json) {
        try {
          return typeof row.diameters_json === "string" ? JSON.parse(row.diameters_json) : row.diameters_json;
        } catch {}
      }
      return null;
    })(),
    bodyComposition: (() => {
      if (row.body_composition_json) {
        try {
          return typeof row.body_composition_json === "string" ? JSON.parse(row.body_composition_json) : row.body_composition_json;
        } catch {}
      }
      return {
        weightKg: getNum(row.weight_kg),
        bodyFatPct: getNum(row.body_fat_pct),
        bodyFatKg: getNum(row.fat_mass_kg),
        leanMassKg: getNum(row.lean_mass_kg),
        muscleMassKg: getNum(row.muscle_mass_kg),
        bodyWaterPct: getNum(row.body_water_pct),
        bodyWaterKg: getNum(row.body_water_kg),
        boneMassValue: getNum(row.bone_mass_value),
        boneMassUnit: row.bone_mass_unit ? String(row.bone_mass_unit) : null,
        boneMassMethod: row.bone_mass_method ? String(row.bone_mass_method) : null,
        method: row.equipment_method || "OTHER",
        origin: "RECORDED",
      };
    })(),
  };
}

function mapRowToPregnancyRecord(row: RowDataPacket): PatientPregnancyRecord {
  return {
    id: Number(row.id),
    publicId: String(row.public_id),
    patientRecordId: Number(row.patient_record_id),
    pregnancyStatus: row.pregnancy_status as PatientPregnancyRecord["pregnancyStatus"],
    estimatedDueDate: row.estimated_due_date ? (typeof row.estimated_due_date === "string" ? row.estimated_due_date : new Date(row.estimated_due_date).toISOString().slice(0, 10)) : null,
    gestationalWeeks: row.gestational_weeks !== null && row.gestational_weeks !== undefined ? Number(row.gestational_weeks) : null,
    gestationalReferenceDate: row.gestational_reference_date
      ? (typeof row.gestational_reference_date === "string"
          ? row.gestational_reference_date.slice(0, 10)
          : new Date(row.gestational_reference_date).toISOString().slice(0, 10))
      : (row.updated_at ? new Date(row.updated_at).toISOString().slice(0, 10) : null),
    lastMenstrualPeriodDate: row.last_menstrual_period_date ? (typeof row.last_menstrual_period_date === "string" ? row.last_menstrual_period_date : new Date(row.last_menstrual_period_date).toISOString().slice(0, 10)) : null,
    prePregnancyWeightKg: row.pre_pregnancy_weight_kg !== null && row.pre_pregnancy_weight_kg !== undefined ? Number(row.pre_pregnancy_weight_kg) : null,
    currentPregnancyWeightKg: row.current_pregnancy_weight_kg !== null && row.current_pregnancy_weight_kg !== undefined ? Number(row.current_pregnancy_weight_kg) : null,
    pregnancyType: row.pregnancy_type ? String(row.pregnancy_type) : null,
    pregnancyNotes: row.pregnancy_notes ? String(row.pregnancy_notes) : null,
    obstetricNotes: row.obstetric_notes ? String(row.obstetric_notes) : null,
    supplementationNotes: row.supplementation_notes ? String(row.supplementation_notes) : null,
    deliveryDate: row.delivery_date ? (typeof row.delivery_date === "string" ? row.delivery_date : new Date(row.delivery_date).toISOString().slice(0, 10)) : null,
    breastfeedingStatus: row.breastfeeding_status ? String(row.breastfeeding_status) : null,
    postpartumNotes: row.postpartum_notes ? String(row.postpartum_notes) : null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}

function mapRowToClinicalNote(row: RowDataPacket, currentAuthorMembershipId?: number): PatientClinicalNoteDto {
  const contextType = (row.context_type as ClinicalNoteContextType) || "ROUTINE";
  const status = (row.status as ClinicalNoteStatus) || "DRAFT";
  return {
    publicId: String(row.public_id),
    noteDate: typeof row.note_date === "string" ? row.note_date.slice(0, 10) : new Date(row.note_date).toISOString().slice(0, 10),
    contextType,
    contextTypeLabel: CLINICAL_NOTE_CONTEXT_LABELS[contextType] || "Observação clínica",
    status,
    statusLabel: CLINICAL_NOTE_STATUS_LABELS[status] || "Rascunho",
    conduct: row.conduct ? String(row.conduct) : null,
    content: String(row.content || ""),
    authorName: row.author_name ? String(row.author_name) : "Profissional Responsável",
    authorMembershipPublicId: row.author_membership_public_id ? String(row.author_membership_public_id) : "",
    isAuthor: currentAuthorMembershipId ? Number(row.author_membership_id) === currentAuthorMembershipId : false,
    confidentialInternal: Boolean(row.confidential_internal ?? 1),
    finalizedAt: row.finalized_at ? new Date(row.finalized_at).toISOString() : null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}

function mapRowToAuditEntry(row: RowDataPacket): PatientRecordAuditEntryDto {
  const fieldLabels: Record<string, string> = {
    mainObjective: "Objetivo nutricional",
    diagnosedConditions: "Patologias relatadas",
    previousSurgeries: "Cirurgias prévias",
    hospitalizations: "Internações",
    allergies: "Alergias",
    foodAllergiesIntolerances: "Alergias e intolerâncias",
    foodIntolerances: "Intolerâncias alimentares",
    currentMedications: "Medicamentos de uso contínuo",
    supplements: "Suplementação habitual",
    familyHistory: "Histórico familiar",
    gastrointestinalNotes: "Função intestinal",
    bowelHabit: "Hábito intestinal",
    sleepNotes: "Qualidade do sono",
    hydrationNotes: "Ingestão de água",
    foodPreferences: "Alimentos preferidos",
    dislikedFoods: "Alimentos mal aceitos",
    dietaryRestrictions: "Restrições alimentares",
    usualEatingRoutine: "Rotina alimentar",
    mealScheduleNotes: "Horários das refeições",
    appetiteNotes: "Apetite",
    difficultiesAdherenceNotes: "Dificuldades de adesão",
    physicalActivityNotes: "Atividade física",
    smokingStatus: "Tabagismo",
    alcoholNotes: "Consumo alcoólico",
    sleepRoutine: "Rotina de sono",
    workStudyRoutine: "Rotina de trabalho/estudos",
    clinicalObservations: "Observações clínicas",
  };

  const rawField = String(row.field_name);
  return {
    publicId: String(row.public_id),
    fieldName: rawField,
    fieldLabel: fieldLabels[rawField] || rawField,
    previousValue: row.previous_value ? String(row.previous_value) : null,
    newValue: row.new_value ? String(row.new_value) : null,
    changeSource: String(row.change_source || "PROFESSIONAL_EDIT"),
    changedByName: row.changed_by_name ? String(row.changed_by_name) : "Profissional",
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

/**
 * Resolves Clinical Data Origin & Provenance (Release Etapa 9).
 * Distinguishes:
 * - Informação relatada pelo paciente
 * - Informação registrada pelo profissional
 * - Informação revisada pelo profissional
 * - Não informado (campo vazio NUNCA significa "não")
 * - Não se aplica (ex: gestação para sexo masculino)
 */
export function resolveClinicalFieldsProvenance(
  record: PatientRecord,
  onboarding: OnboardingReferenceData,
  pregnancy: PatientPregnancyRecord | null
): Record<string, ClinicalFieldProvenance> {
  let explicitProvenance: Record<string, { origin?: string; reviewedBy?: string; note?: string }> = {};
  if (record.fieldProvenanceJson) {
    try {
      explicitProvenance = JSON.parse(record.fieldProvenanceJson);
    } catch {}
  }

  const resolveField = (
    fieldName: string,
    recordVal?: string | null,
    onboardingVal?: string | null,
    isNotApplicable = false
  ): ClinicalFieldProvenance => {
    if (isNotApplicable) {
      return { origin: "NOT_APPLICABLE", label: "Não se aplica" };
    }

    const explicit = explicitProvenance[fieldName];
    if (explicit?.origin === "PROFESSIONAL_REVIEWED") {
      return {
        origin: "PROFESSIONAL_REVIEWED",
        label: "Revisado pelo profissional",
        reviewedBy: explicit.reviewedBy || null,
        note: explicit.note || null,
      };
    }
    if (explicit?.origin === "PROFESSIONAL_RECORDED") {
      return { origin: "PROFESSIONAL_RECORDED", label: "Registrado pelo profissional" };
    }
    if (explicit?.origin === "NOT_APPLICABLE") {
      return { origin: "NOT_APPLICABLE", label: "Não se aplica" };
    }

    const hasRecord = Boolean(recordVal && recordVal.trim().length > 0);
    const hasOnboarding = Boolean(onboardingVal && onboardingVal.trim().length > 0);

    if (hasRecord) {
      if (hasOnboarding && recordVal?.trim() === onboardingVal?.trim()) {
        return {
          origin: "PATIENT_REPORTED",
          label: "Relatado pelo paciente",
          sourceDate: onboarding.submittedAt ? onboarding.submittedAt.slice(0, 10) : null,
        };
      }
      return { origin: "PROFESSIONAL_RECORDED", label: "Registrado pelo profissional" };
    }

    if (hasOnboarding) {
      return {
        origin: "PATIENT_REPORTED",
        label: "Relatado pelo paciente",
        sourceDate: onboarding.submittedAt ? onboarding.submittedAt.slice(0, 10) : null,
      };
    }

    // EMPTY NEVER MEANS "NO" — STRICT TRI-STATE INVARIANT
    return { origin: "NOT_INFORMED", label: "Não informado" };
  };

  const isMale = record.biologicalSex === "MALE" || onboarding.sex === "MALE";
  const isNotPregnant =
    pregnancy?.pregnancyStatus === "NOT_APPLICABLE" || pregnancy?.pregnancyStatus === "NOT_PREGNANT";

  return {
    mainObjective: resolveField("mainObjective", record.mainObjective, onboarding.mainObjective),
    diagnosedConditions: resolveField("diagnosedConditions", record.diagnosedConditions, onboarding.healthConditions),
    familyHistory: resolveField("familyHistory", record.familyHistory, null),
    currentMedications: resolveField("currentMedications", record.currentMedications, onboarding.medications),
    supplements: resolveField("supplements", record.supplements, null),
    hydrationNotes: resolveField("hydrationNotes", record.hydrationNotes, onboarding.waterIntake),
    sleepNotes: resolveField("sleepNotes", record.sleepNotes, onboarding.sleepQuality),
    bowelHabit: resolveField("bowelHabit", record.bowelHabit || record.gastrointestinalNotes, onboarding.bowelHabit),
    smokingStatus: resolveField("smokingStatus", record.smokingStatus, onboarding.smoking),
    alcoholNotes: resolveField("alcoholNotes", record.alcoholNotes, onboarding.alcoholFrequency),
    dislikedFoods: resolveField("dislikedFoods", record.dislikedFoods, onboarding.dislikedFoods),
    foodPreferences: resolveField("foodPreferences", record.foodPreferences, onboarding.preferredFoods),
    allergies: resolveField("allergies", record.allergies, onboarding.foodAllergies),
    foodIntolerances: resolveField(
      "foodIntolerances",
      record.foodIntolerances || record.foodAllergiesIntolerances,
      onboarding.foodIntolerances
    ),
    pregnancyStatus: resolveField(
      "pregnancyStatus",
      pregnancy ? pregnancy.pregnancyStatus : null,
      null,
      isMale
    ),
    gestationalWeeks: resolveField(
      "gestationalWeeks",
      pregnancy?.gestationalWeeks ? String(pregnancy.gestationalWeeks) : null,
      null,
      isMale || isNotPregnant
    ),
  };
}

/**
 * Non-mutating read-only onboarding reference extractor.
 */
export async function getOnboardingReferenceData(
  connection: PoolConnection,
  consultancyId: number,
  studentMembershipId: number
): Promise<OnboardingReferenceData> {
  const [subRows] = await connection.execute<RowDataPacket[]>(
    `SELECT
      sis.form_key,
      sis.responses_json,
      sis.submitted_at
    FROM student_intake_submissions sis
    WHERE sis.consultancy_id = ?
      AND sis.membership_id = ?
      AND sis.status = 'SUBMITTED'
    ORDER BY sis.submitted_at DESC, sis.id DESC
    LIMIT 2;`,
    [consultancyId, studentMembershipId]
  );

  let mergedResponses: Record<string, unknown> = {};
  let submittedAt: string | null = null;

  if (Array.isArray(subRows) && subRows.length > 0) {
    for (const row of subRows) {
      if (row.submitted_at && !submittedAt) {
        submittedAt = new Date(row.submitted_at).toISOString();
      }
      try {
        const parsed = typeof row.responses_json === "string"
          ? JSON.parse(row.responses_json)
          : (row.responses_json || {});
        mergedResponses = { ...parsed, ...mergedResponses };
      } catch {
        // Safe fallback for malformed JSON
      }
    }
  }

  // Also query student_progress_entries for last reported weight if not in onboarding
  const [progressRows] = await connection.execute<RowDataPacket[]>(
    `SELECT weight_kg
     FROM student_progress_entries
     WHERE consultancy_id = ? AND student_membership_id = ?
     ORDER BY recorded_on DESC, id DESC
     LIMIT 1;`,
    [consultancyId, studentMembershipId]
  );

  const fallbackWeight = progressRows.length > 0 && progressRows[0].weight_kg
    ? Number(progressRows[0].weight_kg)
    : null;

  const rawWeight = mergedResponses.weight ? Number(String(mergedResponses.weight).replace(/[^0-9.]/g, "")) : null;
  const rawHeight = mergedResponses.height ? Number(String(mergedResponses.height).replace(/[^0-9.]/g, "")) : null;

  const hasOnboardingData = Object.keys(mergedResponses).length > 0 || fallbackWeight !== null;

  return {
    hasOnboardingData,
    fullName: mergedResponses.full_name ? String(mergedResponses.full_name) : null,
    birthDate: mergedResponses.birth_date ? String(mergedResponses.birth_date) : null,
    sex: mergedResponses.sex ? String(mergedResponses.sex) : null,
    phone: mergedResponses.phone ? String(mergedResponses.phone) : null,
    email: mergedResponses.email ? String(mergedResponses.email) : null,
    occupation: mergedResponses.profession ? String(mergedResponses.profession) : null,
    mainObjective: mergedResponses.main_goal ? String(mergedResponses.main_goal) : null,
    reportedWeightKg: rawWeight && !Number.isNaN(rawWeight) && rawWeight > 0 ? rawWeight : fallbackWeight,
    reportedHeightCm: rawHeight && !Number.isNaN(rawHeight) && rawHeight > 0 ? rawHeight : null,
    dietaryRestrictions: mergedResponses.food_intolerances ? String(mergedResponses.food_intolerances) : null,
    foodAllergies: mergedResponses.food_allergies ? String(mergedResponses.food_allergies) : null,
    foodIntolerances: mergedResponses.food_intolerances ? String(mergedResponses.food_intolerances) : null,
    preferredFoods: mergedResponses.preferred_foods ? String(mergedResponses.preferred_foods) : null,
    dislikedFoods: mergedResponses.disliked_foods ? String(mergedResponses.disliked_foods) : null,
    medications: mergedResponses.continuous_medications ? String(mergedResponses.continuous_medications) : null,
    healthConditions: mergedResponses.health_problems ? String(mergedResponses.health_problems) : null,
    surgeries: mergedResponses.surgery_history ? String(mergedResponses.surgery_history) : null,
    bowelHabit: mergedResponses.bowel_function ? String(mergedResponses.bowel_function) : null,
    sleepQuality: mergedResponses.sleep_quality ? String(mergedResponses.sleep_quality) : null,
    waterIntake: mergedResponses.daily_water_intake ? String(mergedResponses.daily_water_intake) : null,
    physicalActivity: mergedResponses.physical_activity ? String(mergedResponses.physical_activity) : null,
    alcoholFrequency: mergedResponses.alcohol_consumption_frequency ? String(mergedResponses.alcohol_consumption_frequency) : null,
    smoking: mergedResponses.smoking ? String(mergedResponses.smoking) : null,
    submittedAt,
  };
}

/**
 * Gets or creates the patient clinical record for a student in a consultancy.
 */
export async function getOrCreatePatientRecord(
  connection: PoolConnection,
  consultancyId: number,
  studentMembershipId: number,
  authorMembershipId: number
): Promise<PatientRecord> {
  // 1. Verify student membership exists in consultancy
  const [studentRows] = await connection.execute<RowDataPacket[]>(
    `SELECT cm.id, cm.consultancy_id, cm.user_id
     FROM consultancy_members cm
     WHERE cm.id = ? AND cm.consultancy_id = ?;`,
    [studentMembershipId, consultancyId]
  );

  if (!Array.isArray(studentRows) || studentRows.length === 0) {
    throw new StudentNotFoundError("Aluno não encontrado nesta consultoria.");
  }

  // 2. Fetch existing patient record
  const [existingRows] = await connection.execute<RowDataPacket[]>(
    `SELECT * FROM nutrition_v2_patient_records
     WHERE consultancy_id = ? AND student_membership_id = ? AND deleted_at IS NULL;`,
    [consultancyId, studentMembershipId]
  );

  if (Array.isArray(existingRows) && existingRows.length > 0) {
    return mapRowToPatientRecord(existingRows[0]);
  }

  // 3. Create new patient record if absent (clinical fields remain strictly NULL)
  const publicId = crypto.randomUUID();

  await connection.execute<ResultSetHeader>(
    `INSERT INTO nutrition_v2_patient_records (
      public_id,
      consultancy_id,
      student_membership_id,
      created_by_membership_id
    ) VALUES (?, ?, ?, ?);`,
    [
      publicId,
      consultancyId,
      studentMembershipId,
      authorMembershipId,
    ]
  );

  const [createdRows] = await connection.execute<RowDataPacket[]>(
    `SELECT * FROM nutrition_v2_patient_records WHERE public_id = ?;`,
    [publicId]
  );

  return mapRowToPatientRecord(createdRows[0]);
}

/**
 * Returns full patient record detail including pregnancy, anthropometrics, onboarding reference,
 * clinical provenance map, clinical notes, and recent field audit trail.
 */
export async function getPatientRecordDetail(
  consultancyId: number,
  studentMembershipId: number,
  authorMembershipId: number
): Promise<PatientRecordDetail> {
  const connection = await getDbConnection();
  try {
    // 1. Get student profile & membership
    const [studentRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        cm.id AS membership_id,
        cm.public_id AS membership_public_id,
        cm.joined_at,
        u.id AS user_id,
        u.full_name,
        u.email
      FROM consultancy_members cm
      INNER JOIN users u ON u.id = cm.user_id
      WHERE cm.id = ? AND cm.consultancy_id = ?;`,
      [studentMembershipId, consultancyId]
    );

    if (!Array.isArray(studentRows) || studentRows.length === 0) {
      throw new StudentNotFoundError();
    }

    const s = studentRows[0];
    const studentInfo = {
      membershipId: Number(s.membership_id),
      membershipPublicId: String(s.membership_public_id),
      userId: Number(s.user_id),
      fullName: String(s.full_name),
      email: String(s.email),
      joinedAt: s.joined_at ? new Date(s.joined_at).toISOString() : new Date().toISOString(),
    };

    // 2. Get or create record
    const record = await getOrCreatePatientRecord(
      connection,
      consultancyId,
      studentMembershipId,
      authorMembershipId
    );

    // 3. Get pregnancy record
    const [pregRows] = await connection.execute<RowDataPacket[]>(
      `SELECT * FROM nutrition_v2_patient_pregnancy WHERE patient_record_id = ?;`,
      [record.id]
    );

    const pregnancy = Array.isArray(pregRows) && pregRows.length > 0
      ? mapRowToPregnancyRecord(pregRows[0])
      : null;

    // 4. Get anthropometrics history
    let anthroRows: RowDataPacket[] = [];
    try {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT
          pa.*,
          u_cr.full_name AS created_by_name,
          u_up.full_name AS updated_by_name
         FROM nutrition_v2_patient_anthropometrics pa
         LEFT JOIN consultancy_members cm_cr ON cm_cr.id = pa.created_by_membership_id
         LEFT JOIN users u_cr ON u_cr.id = cm_cr.user_id
         LEFT JOIN consultancy_members cm_up ON cm_up.id = pa.updated_by_membership_id
         LEFT JOIN users u_up ON u_up.id = cm_up.user_id
         WHERE pa.patient_record_id = ?
         ORDER BY pa.measurement_date DESC, pa.id DESC;`,
        [record.id]
      );
      anthroRows = Array.isArray(rows) ? rows : [];
    } catch {
      // Fallback query if updated_by columns not yet applied
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT * FROM nutrition_v2_patient_anthropometrics
         WHERE patient_record_id = ?
         ORDER BY measurement_date DESC, id DESC;`,
        [record.id]
      );
      anthroRows = Array.isArray(rows) ? rows : [];
    }

    const anthropometrics = (Array.isArray(anthroRows) ? anthroRows : []).map(mapRowToAnthropometricEntry);

    // 5. Get onboarding reference data
    const onboardingReference = await getOnboardingReferenceData(
      connection,
      consultancyId,
      studentMembershipId
    );

    const resolvedBirthDate = record.birthDate ?? onboardingReference.birthDate ?? null;
    const birthDateProvenance: "PATIENT_RECORD" | "ONBOARDING" | "MISSING" =
      record.birthDate ? "PATIENT_RECORD" : onboardingReference.birthDate ? "ONBOARDING" : "MISSING";

    const recordSex = normalizeBioSex(record.biologicalSex);
    const onboardingSex = normalizeBioSex(onboardingReference.sex);
    const resolvedBiologicalSex = recordSex ?? onboardingSex ?? null;
    const biologicalSexProvenance: "PATIENT_RECORD" | "ONBOARDING" | "MISSING" =
      recordSex ? "PATIENT_RECORD" : onboardingSex ? "ONBOARDING" : "MISSING";

    // 6. Clinical Field Provenance Map (Etapa 9)
    const fieldProvenance = resolveClinicalFieldsProvenance(record, onboardingReference, pregnancy);

    // 7. Clinical Notes & Audit Trail (Etapa 9)
    let clinicalNotes: PatientClinicalNoteDto[] = [];
    try {
      const [noteRows] = await connection.execute<RowDataPacket[]>(
        `SELECT
          n.*,
          u.full_name AS author_name,
          cm.public_id AS author_membership_public_id
        FROM nutrition_v2_patient_clinical_notes n
        INNER JOIN consultancy_members cm ON cm.id = n.author_membership_id
        INNER JOIN users u ON u.id = cm.user_id
        WHERE n.consultancy_id = ? AND n.student_membership_id = ?
        ORDER BY n.note_date DESC, n.id DESC
        LIMIT 50;`,
        [consultancyId, studentMembershipId]
      );
      clinicalNotes = (Array.isArray(noteRows) ? noteRows : []).map((r) =>
        mapRowToClinicalNote(r, authorMembershipId)
      );
    } catch {
      // Table may not yet be migrated
      clinicalNotes = [];
    }

    let recentAuditTrail: PatientRecordAuditEntryDto[] = [];
    try {
      const [auditRows] = await connection.execute<RowDataPacket[]>(
        `SELECT
          a.*,
          u.full_name AS changed_by_name
        FROM nutrition_v2_patient_record_audit a
        INNER JOIN consultancy_members cm ON cm.id = a.changed_by_membership_id
        INNER JOIN users u ON u.id = cm.user_id
        WHERE a.consultancy_id = ? AND a.patient_record_id = ?
        ORDER BY a.created_at DESC
        LIMIT 20;`,
        [consultancyId, record.id]
      );
      recentAuditTrail = (Array.isArray(auditRows) ? auditRows : []).map(mapRowToAuditEntry);
    } catch {
      recentAuditTrail = [];
    }

    // 8. Pre-Questionnaires (Etapa 10)
    let preQuestionnaires: PatientRecordPreQuestionnaireItem[] = [];
    try {
      const [pqRows] = await connection.execute<RowDataPacket[]>(
        `SELECT
          pq.*,
          u_req.full_name AS requested_by_name,
          u_rev.full_name AS reviewed_by_name,
          c.public_id AS consultation_public_id,
          c.consultation_date AS consultation_date
        FROM nutrition_v2_pre_questionnaires pq
        JOIN consultancy_members cm_req ON cm_req.id = pq.requested_by_membership_id
        JOIN users u_req ON u_req.id = cm_req.user_id
        LEFT JOIN consultancy_members cm_rev ON cm_rev.id = pq.reviewed_by_membership_id
        LEFT JOIN users u_rev ON u_rev.id = cm_rev.user_id
        LEFT JOIN nutrition_v2_consultations c ON c.id = pq.consultation_id
        WHERE pq.consultancy_id = ? AND pq.student_membership_id = ?
        ORDER BY pq.created_at DESC;`,
        [consultancyId, studentMembershipId]
      );

      preQuestionnaires = (Array.isArray(pqRows) ? pqRows : []).map((r) => {
        let qJson = [];
        try {
          qJson = typeof r.questions_json === "string" ? JSON.parse(r.questions_json) : r.questions_json;
        } catch {}
        return {
          publicId: r.public_id,
          title: r.title || "Pré-Questionário Nutricional",
          status: r.status,
          statusLabel: r.status === "ANSWERED" ? "Respondido pelo paciente" : r.status === "REVIEWED" ? "Revisado pelo profissional" : r.status === "IN_PROGRESS" ? "Em preenchimento" : r.status === "CANCELLED" ? "Cancelado" : "Enviado ao paciente",
          studentMembershipPublicId: studentInfo.membershipPublicId,
          studentName: studentInfo.fullName,
          studentEmail: studentInfo.email,
          requestedByName: r.requested_by_name || "Nutricionista",
          consultationDate: r.consultation_date ? new Date(r.consultation_date).toISOString() : null,
          questions: qJson,
          responses: typeof r.responses_json === "string" ? JSON.parse(r.responses_json) : r.responses_json,
          sentAt: r.sent_at ? new Date(r.sent_at).toISOString() : null,
          submittedAt: r.submitted_at ? new Date(r.submitted_at).toISOString() : null,
          reviewedAt: r.reviewed_at ? new Date(r.reviewed_at).toISOString() : null,
          reviewedByName: r.reviewed_by_name || null,
          createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        };
      });
    } catch {
      preQuestionnaires = [];
    }

    // 12. Lab Exams (Etapa 14)
    let labExams: PatientLabExamRecord[] = [];
    try {
      labExams = await listPatientLabExams(consultancyId, studentMembershipId);
    } catch (err: unknown) {
      const isMissingTable =
        (err as { code?: string })?.code === "ER_NO_SUCH_TABLE" ||
        String(err).includes("doesn't exist");
      if (!isMissingTable) {
        throw err;
      }
      labExams = [];
    }

    // 13. Planning Field Preferences (Etapa 14)
    let fieldPreferences = undefined;
    try {
      const [authorRows] = await connection.execute<RowDataPacket[]>(
        `SELECT user_id FROM consultancy_members WHERE id = ? LIMIT 1;`,
        [authorMembershipId]
      );
      const authorUserId = authorRows && authorRows[0] ? Number(authorRows[0].user_id) : 0;
      if (authorUserId > 0) {
        fieldPreferences = await getPlanningFieldPreferences(consultancyId, authorUserId);
      }
    } catch (err: unknown) {
      const isMissingTable =
        (err as { code?: string })?.code === "ER_NO_SUCH_TABLE" ||
        String(err).includes("doesn't exist");
      if (!isMissingTable) {
        throw err;
      }
      fieldPreferences = undefined;
    }

    return {
      record,
      student: studentInfo,
      pregnancy,
      anthropometrics,
      onboardingReference,
      resolvedBirthDate,
      resolvedBiologicalSex,
      birthDateProvenance,
      biologicalSexProvenance,
      fieldProvenance,
      clinicalNotes,
      recentAuditTrail,
      preQuestionnaires,
      labExams,
      fieldPreferences,
    };
  } finally {
    connection.release();
  }
}

/**
 * Logs changes to patient record audit trail for historical traceability.
 */
async function logPatientRecordAudit(
  connection: PoolConnection,
  consultancyId: number,
  patientRecordId: number,
  authorMembershipId: number,
  changedFields: Array<{ fieldName: string; previousValue: string | null; newValue: string | null }>
) {
  if (changedFields.length === 0) return;
  try {
    for (const change of changedFields) {
      const publicId = crypto.randomUUID();
      await connection.execute<ResultSetHeader>(
        `INSERT INTO nutrition_v2_patient_record_audit (
          public_id,
          consultancy_id,
          patient_record_id,
          changed_by_membership_id,
          field_name,
          previous_value,
          new_value,
          change_source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PROFESSIONAL_EDIT');`,
        [
          publicId,
          consultancyId,
          patientRecordId,
          authorMembershipId,
          change.fieldName,
          change.previousValue,
          change.newValue,
        ]
      );
    }
  } catch {
    // Non-blocking: table might not be migrated yet in all environments
  }
}

/**
 * Updates patient clinical record with full field audit traceability.
 */
export async function updatePatientRecord(
  consultancyId: number,
  studentMembershipId: number,
  authorMembershipId: number,
  input: UpdatePatientRecordInput
): Promise<PatientRecord> {
  const validated = validatePatientRecordInput(input);
  const connection = await getDbConnection();

  try {
    await connection.beginTransaction();

    // 1. Fetch & lock existing patient record atomically
    const [existingRows] = await connection.execute<RowDataPacket[]>(
      `SELECT * FROM nutrition_v2_patient_records
       WHERE consultancy_id = ? AND student_membership_id = ? AND deleted_at IS NULL
       FOR UPDATE;`,
      [consultancyId, studentMembershipId]
    );

    let record: PatientRecord;
    if (Array.isArray(existingRows) && existingRows.length > 0) {
      record = mapRowToPatientRecord(existingRows[0]);
    } else {
      record = await getOrCreatePatientRecord(
        connection,
        consultancyId,
        studentMembershipId,
        authorMembershipId
      );
      const [lockedRows] = await connection.execute<RowDataPacket[]>(
        `SELECT * FROM nutrition_v2_patient_records WHERE id = ? FOR UPDATE;`,
        [record.id]
      );
      if (Array.isArray(lockedRows) && lockedRows.length > 0) {
        record = mapRowToPatientRecord(lockedRows[0]);
      }
    }

    // Compute changed fields for audit logging and idempotency detection
    const changedFields: Array<{ fieldName: string; previousValue: string | null; newValue: string | null }> = [];
    const checkChange = (fieldName: keyof PatientRecord, newVal: unknown) => {
      if (newVal === undefined) return;
      const prev = record[fieldName] ?? null;
      const next = (newVal ?? null) as string | null;
      if (prev !== next) {
        changedFields.push({
          fieldName: String(fieldName),
          previousValue: prev !== null ? String(prev) : null,
          newValue: next !== null ? String(next) : null,
        });
      }
    };

    checkChange("occupation", validated.occupation);
    checkChange("routineNotes", validated.routineNotes);
    checkChange("followUpReason", validated.followUpReason);
    checkChange("mainObjective", validated.mainObjective);
    checkChange("clinicalObservations", validated.clinicalObservations);
    checkChange("diagnosedConditions", validated.diagnosedConditions);
    checkChange("previousSurgeries", validated.previousSurgeries);
    checkChange("hospitalizations", validated.hospitalizations);
    checkChange("allergies", validated.allergies);
    checkChange("foodAllergiesIntolerances", validated.foodAllergiesIntolerances);
    checkChange("foodIntolerances", validated.foodIntolerances);
    checkChange("currentMedications", validated.currentMedications);
    checkChange("supplements", validated.supplements);
    checkChange("familyHistory", validated.familyHistory);
    checkChange("gastrointestinalNotes", validated.gastrointestinalNotes);
    checkChange("bowelHabit", validated.bowelHabit);
    checkChange("sleepNotes", validated.sleepNotes);
    checkChange("hydrationNotes", validated.hydrationNotes);
    checkChange("foodPreferences", validated.foodPreferences);
    checkChange("dislikedFoods", validated.dislikedFoods);
    checkChange("dietaryRestrictions", validated.dietaryRestrictions);
    checkChange("usualEatingRoutine", validated.usualEatingRoutine);
    checkChange("mealScheduleNotes", validated.mealScheduleNotes);
    checkChange("appetiteNotes", validated.appetiteNotes);
    checkChange("difficultiesAdherenceNotes", validated.difficultiesAdherenceNotes);
    checkChange("physicalActivityNotes", validated.physicalActivityNotes);
    checkChange("smokingStatus", validated.smokingStatus);
    checkChange("alcoholNotes", validated.alcoholNotes);
    checkChange("sleepRoutine", validated.sleepRoutine);
    checkChange("workStudyRoutine", validated.workStudyRoutine);

    // Concurrency validation against server-side revision
    const serverTimeMs = record.updatedAt ? new Date(record.updatedAt).getTime() : 0;
    const expectedTimeMs = validated.expectedUpdatedAt ? new Date(validated.expectedUpdatedAt).getTime() : 0;

    if (validated.expectedUpdatedAt && serverTimeMs > 0 && expectedTimeMs > 0 && Math.abs(serverTimeMs - expectedTimeMs) > 1000) {
      // If there are no modified fields, this is an idempotent retry (e.g. repeated save after lost ACK)
      if (changedFields.length === 0) {
        await connection.commit();
        return record;
      }

      // True concurrent edit conflict
      await connection.rollback();
      throw new NutritionAuthorizationError(
        "O prontuário foi alterado em outra sessão ou aba. Suas alterações foram preservadas na tela; verifique antes de salvar novamente.",
        "CONCURRENT_MODIFICATION",
        409
      );
    }

    // If no changes compared to locked state, return current record without unnecessary write
    if (changedFields.length === 0) {
      await connection.commit();
      return record;
    }

    // Attempt primary UPDATE with new columns (Migration 060)
    try {
      await connection.execute<ResultSetHeader>(
        `UPDATE nutrition_v2_patient_records
         SET
           occupation = ?,
           routine_notes = ?,
           follow_up_reason = ?,
           main_objective = ?,
           clinical_observations = ?,
           diagnosed_conditions = ?,
           previous_surgeries = ?,
           hospitalizations = ?,
           allergies = ?,
           food_allergies_intolerances = ?,
           food_intolerances = ?,
           current_medications = ?,
           supplements = ?,
           family_history = ?,
           gastrointestinal_notes = ?,
           bowel_habit = ?,
           sleep_notes = ?,
           hydration_notes = ?,
           food_preferences = ?,
           disliked_foods = ?,
           dietary_restrictions = ?,
           usual_eating_routine = ?,
           meal_schedule_notes = ?,
           appetite_notes = ?,
           difficulties_adherence_notes = ?,
           physical_activity_notes = ?,
           smoking_status = ?,
           alcohol_notes = ?,
           sleep_routine = ?,
           work_study_routine = ?,
           field_provenance_json = COALESCE(?, field_provenance_json)
         WHERE id = ? AND consultancy_id = ?;`,
        [
          validated.occupation ?? null,
          validated.routineNotes ?? null,
          validated.followUpReason ?? null,
          validated.mainObjective ?? null,
          validated.clinicalObservations ?? null,
          validated.diagnosedConditions ?? null,
          validated.previousSurgeries ?? null,
          validated.hospitalizations ?? null,
          validated.allergies ?? null,
          validated.foodAllergiesIntolerances ?? null,
          validated.foodIntolerances ?? null,
          validated.currentMedications ?? null,
          validated.supplements ?? null,
          validated.familyHistory ?? null,
          validated.gastrointestinalNotes ?? null,
          validated.bowelHabit ?? null,
          validated.sleepNotes ?? null,
          validated.hydrationNotes ?? null,
          validated.foodPreferences ?? null,
          validated.dislikedFoods ?? null,
          validated.dietaryRestrictions ?? null,
          validated.usualEatingRoutine ?? null,
          validated.mealScheduleNotes ?? null,
          validated.appetiteNotes ?? null,
          validated.difficultiesAdherenceNotes ?? null,
          validated.physicalActivityNotes ?? null,
          validated.smokingStatus ?? null,
          validated.alcoholNotes ?? null,
          validated.sleepRoutine ?? null,
          validated.workStudyRoutine ?? null,
          validated.fieldProvenanceJson ?? null,
          record.id,
          consultancyId,
        ]
      );
    } catch {
      // Fallback for pre-060 schema without food_intolerances or field_provenance_json
      await connection.execute<ResultSetHeader>(
        `UPDATE nutrition_v2_patient_records
         SET
           occupation = ?,
           routine_notes = ?,
           follow_up_reason = ?,
           main_objective = ?,
           clinical_observations = ?,
           diagnosed_conditions = ?,
           previous_surgeries = ?,
           hospitalizations = ?,
           allergies = ?,
           food_allergies_intolerances = ?,
           current_medications = ?,
           supplements = ?,
           family_history = ?,
           gastrointestinal_notes = ?,
           bowel_habit = ?,
           sleep_notes = ?,
           hydration_notes = ?,
           food_preferences = ?,
           disliked_foods = ?,
           dietary_restrictions = ?,
           usual_eating_routine = ?,
           meal_schedule_notes = ?,
           appetite_notes = ?,
           difficulties_adherence_notes = ?,
           physical_activity_notes = ?,
           smoking_status = ?,
           alcohol_notes = ?,
           sleep_routine = ?,
           work_study_routine = ?
         WHERE id = ? AND consultancy_id = ?;`,
        [
          validated.occupation ?? null,
          validated.routineNotes ?? null,
          validated.followUpReason ?? null,
          validated.mainObjective ?? null,
          validated.clinicalObservations ?? null,
          validated.diagnosedConditions ?? null,
          validated.previousSurgeries ?? null,
          validated.hospitalizations ?? null,
          validated.allergies ?? null,
          validated.foodAllergiesIntolerances ?? null,
          validated.currentMedications ?? null,
          validated.supplements ?? null,
          validated.familyHistory ?? null,
          validated.gastrointestinalNotes ?? null,
          validated.bowelHabit ?? null,
          validated.sleepNotes ?? null,
          validated.hydrationNotes ?? null,
          validated.foodPreferences ?? null,
          validated.dislikedFoods ?? null,
          validated.dietaryRestrictions ?? null,
          validated.usualEatingRoutine ?? null,
          validated.mealScheduleNotes ?? null,
          validated.appetiteNotes ?? null,
          validated.difficultiesAdherenceNotes ?? null,
          validated.physicalActivityNotes ?? null,
          validated.smokingStatus ?? null,
          validated.alcoholNotes ?? null,
          validated.sleepRoutine ?? null,
          validated.workStudyRoutine ?? null,
          record.id,
          consultancyId,
        ]
      );
    }

    // Record audit trail asynchronously
    await logPatientRecordAudit(
      connection,
      consultancyId,
      record.id,
      authorMembershipId,
      changedFields
    );

    const [updatedRows] = await connection.execute<RowDataPacket[]>(
      `SELECT * FROM nutrition_v2_patient_records WHERE id = ?;`,
      [record.id]
    );

    await connection.commit();
    return mapRowToPatientRecord(updatedRows[0]);
  } catch (err) {
    try {
      await connection.rollback();
    } catch {
      // Ignore rollback failure on dead connection
    }
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Updates or sets patient canonical physiological data (Release 3.1).
 */
export async function updatePatientPhysiologicalData(
  consultancyId: number,
  studentMembershipId: number,
  authorMembershipId: number,
  input: UpdatePatientPhysiologicalInput
): Promise<{
  record: PatientRecord;
  resolvedBirthDate: string | null;
  resolvedBiologicalSex: BiologicalSex | null;
  birthDateProvenance: "PATIENT_RECORD" | "ONBOARDING" | "MISSING";
  biologicalSexProvenance: "PATIENT_RECORD" | "ONBOARDING" | "MISSING";
}> {
  const validated = validatePhysiologicalInput(input);
  const connection = await getDbConnection();

  try {
    const record = await getOrCreatePatientRecord(
      connection,
      consultancyId,
      studentMembershipId,
      authorMembershipId
    );

    const setClauses: string[] = [];
    const params: (string | null | number)[] = [];

    if (validated.birthDate !== undefined) {
      setClauses.push("birth_date = ?");
      params.push(validated.birthDate);
    }

    if (validated.biologicalSex !== undefined) {
      setClauses.push("biological_sex = ?");
      params.push(validated.biologicalSex);
    }

    if (setClauses.length > 0) {
      setClauses.push("updated_at = CURRENT_TIMESTAMP(3)");
      params.push(record.id, consultancyId);

      await connection.execute<ResultSetHeader>(
        `UPDATE nutrition_v2_patient_records
         SET ${setClauses.join(", ")}
         WHERE id = ? AND consultancy_id = ?;`,
        params
      );
    }

    const [updatedRows] = await connection.execute<RowDataPacket[]>(
      `SELECT * FROM nutrition_v2_patient_records WHERE id = ?;`,
      [record.id]
    );

    const updatedRecord = mapRowToPatientRecord(updatedRows[0]);
    const onboardingReference = await getOnboardingReferenceData(
      connection,
      consultancyId,
      studentMembershipId
    );

    const resolvedBirthDate = updatedRecord.birthDate ?? onboardingReference.birthDate ?? null;
    const birthDateProvenance: "PATIENT_RECORD" | "ONBOARDING" | "MISSING" =
      updatedRecord.birthDate ? "PATIENT_RECORD" : onboardingReference.birthDate ? "ONBOARDING" : "MISSING";

    const recordSex = normalizeBioSex(updatedRecord.biologicalSex);
    const onboardingSex = normalizeBioSex(onboardingReference.sex);
    const resolvedBiologicalSex = recordSex ?? onboardingSex ?? null;
    const biologicalSexProvenance: "PATIENT_RECORD" | "ONBOARDING" | "MISSING" =
      recordSex ? "PATIENT_RECORD" : onboardingSex ? "ONBOARDING" : "MISSING";

    return {
      record: updatedRecord,
      resolvedBirthDate,
      resolvedBiologicalSex,
      birthDateProvenance,
      biologicalSexProvenance,
    };
  } finally {
    connection.release();
  }
}

/**
 * Adds an anthropometric measurement entry for a patient record.
 */
export async function addAnthropometricEntry(
  consultancyId: number,
  studentMembershipId: number,
  authorMembershipId: number,
  input: AddAnthropometricEntryInput
): Promise<PatientAnthropometricEntry> {
  const validated = validateAnthropometricEntryInput(input);
  const connection = await getDbConnection();

  try {
    const record = await getOrCreatePatientRecord(
      connection,
      consultancyId,
      studentMembershipId,
      authorMembershipId
    );

    const publicId = crypto.randomUUID();
    const perimetersJson = validated.perimeters ? JSON.stringify(validated.perimeters) : null;
    const diametersJson = validated.diameters ? JSON.stringify(validated.diameters) : null;
    const bodyCompJson = validated.bodyComposition ? JSON.stringify(validated.bodyComposition) : null;

    const hasExpandedData = Boolean(
      (validated.perimeters && Object.values(validated.perimeters).some((v) => v !== null && v !== undefined && (!Array.isArray(v) || v.length > 0))) ||
      (validated.diameters && Object.values(validated.diameters).some((v) => v !== null && v !== undefined && (!Array.isArray(v) || v.length > 0))) ||
      (validated.bodyComposition && (
        validated.bodyComposition.equipment ||
        validated.bodyComposition.protocol ||
        validated.bodyComposition.origin ||
        validated.bodyComposition.notes ||
        validated.bodyComposition.isInconsistent
      ))
    );

    try {
      // 1. Expanded schema (migration 065)
      await connection.execute<ResultSetHeader>(
        `INSERT INTO nutrition_v2_patient_anthropometrics (
          public_id,
          patient_record_id,
          measurement_date,
          weight_kg,
          height_cm,
          waist_cm,
          hip_cm,
          arm_cm,
          thigh_cm,
          calf_cm,
          chest_cm,
          neck_cm,
          forearm_cm,
          abdomen_cm,
          relaxed_arm_cm,
          contracted_arm_cm,
          triceps_mm,
          biceps_mm,
          subscapular_mm,
          suprailiac_mm,
          abdominal_fold_mm,
          chest_fold_mm,
          thigh_fold_mm,
          midaxillary_mm,
          calf_fold_mm,
          skinfold_protocol,
          body_fat_pct,
          fat_mass_kg,
          lean_mass_kg,
          muscle_mass_kg,
          body_water_pct,
          body_water_kg,
          bone_mass_value,
          bone_mass_unit,
          bone_mass_method,
          source_type,
          equipment_method,
          notes,
          created_by_membership_id,
          perimeters_json,
          diameters_json,
          body_composition_json
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?
        );`,
        [
          publicId,
          record.id,
          validated.measurementDate,
          validated.weightKg ?? null,
          validated.heightCm ?? null,
          validated.waistCm ?? null,
          validated.hipCm ?? null,
          validated.armCm ?? null,
          validated.thighCm ?? null,
          validated.calfCm ?? null,
          validated.chestCm ?? null,
          validated.neckCm ?? null,
          validated.forearmCm ?? null,
          validated.abdomenCm ?? null,
          validated.relaxedArmCm ?? null,
          validated.contractedArmCm ?? null,
          validated.tricepsMm ?? null,
          validated.bicepsMm ?? null,
          validated.subscapularMm ?? null,
          validated.suprailiacMm ?? null,
          validated.abdominalFoldMm ?? null,
          validated.chestFoldMm ?? null,
          validated.thighFoldMm ?? null,
          validated.midaxillaryMm ?? null,
          validated.calfFoldMm ?? null,
          validated.skinfoldProtocol ?? null,
          validated.bodyFatPct ?? null,
          validated.fatMassKg ?? null,
          validated.leanMassKg ?? null,
          validated.muscleMassKg ?? null,
          validated.bodyWaterPct ?? null,
          validated.bodyWaterKg ?? null,
          validated.boneMassValue ?? null,
          validated.boneMassUnit ?? null,
          validated.boneMassMethod ?? null,
          validated.sourceType ?? "PROFESSIONAL_RECORDED",
          validated.equipmentMethod ?? null,
          validated.notes ?? null,
          authorMembershipId,
          perimetersJson,
          diametersJson,
          bodyCompJson,
        ]
      );
    } catch {
      if (hasExpandedData) {
        throw new Error(
          "As medidas corporais ampliadas (perímetros bilaterais, diâmetros ósseos ou composição estruturada) requerem a aplicação da Migration 065 no banco de dados. Os dados digitados foram preservados para evitar perda de informações."
        );
      }
      try {
        // 2. Schema 062 without 065 columns
        await connection.execute<ResultSetHeader>(
          `INSERT INTO nutrition_v2_patient_anthropometrics (
            public_id,
            patient_record_id,
            measurement_date,
            weight_kg,
            height_cm,
            waist_cm,
            hip_cm,
            arm_cm,
            thigh_cm,
            calf_cm,
            chest_cm,
            neck_cm,
            forearm_cm,
            abdomen_cm,
            relaxed_arm_cm,
            contracted_arm_cm,
            triceps_mm,
            biceps_mm,
            subscapular_mm,
            suprailiac_mm,
            abdominal_fold_mm,
            chest_fold_mm,
            thigh_fold_mm,
            midaxillary_mm,
            calf_fold_mm,
            skinfold_protocol,
            body_fat_pct,
            fat_mass_kg,
            lean_mass_kg,
            muscle_mass_kg,
            body_water_pct,
            body_water_kg,
            bone_mass_value,
            bone_mass_unit,
            bone_mass_method,
            source_type,
            equipment_method,
            notes,
            created_by_membership_id
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?
          );`,
          [
            publicId,
            record.id,
            validated.measurementDate,
            validated.weightKg ?? null,
            validated.heightCm ?? null,
            validated.waistCm ?? null,
            validated.hipCm ?? null,
            validated.armCm ?? null,
            validated.thighCm ?? null,
            validated.calfCm ?? null,
            validated.chestCm ?? null,
            validated.neckCm ?? null,
            validated.forearmCm ?? null,
            validated.abdomenCm ?? null,
            validated.relaxedArmCm ?? null,
            validated.contractedArmCm ?? null,
            validated.tricepsMm ?? null,
            validated.bicepsMm ?? null,
            validated.subscapularMm ?? null,
            validated.suprailiacMm ?? null,
            validated.abdominalFoldMm ?? null,
            validated.chestFoldMm ?? null,
            validated.thighFoldMm ?? null,
            validated.midaxillaryMm ?? null,
            validated.calfFoldMm ?? null,
            validated.skinfoldProtocol ?? null,
            validated.bodyFatPct ?? null,
            validated.fatMassKg ?? null,
            validated.leanMassKg ?? null,
            validated.muscleMassKg ?? null,
            validated.bodyWaterPct ?? null,
            validated.bodyWaterKg ?? null,
            validated.boneMassValue ?? null,
            validated.boneMassUnit ?? null,
            validated.boneMassMethod ?? null,
            validated.sourceType ?? "PROFESSIONAL_RECORDED",
            validated.equipmentMethod ?? null,
            validated.notes ?? null,
            authorMembershipId,
          ]
        );
      } catch {
        // 3. Fallback for pre-062 schema without expanded skinfolds / composition columns
        await connection.execute<ResultSetHeader>(
          `INSERT INTO nutrition_v2_patient_anthropometrics (
            public_id,
            patient_record_id,
            measurement_date,
            weight_kg,
            height_cm,
            waist_cm,
            hip_cm,
            arm_cm,
            thigh_cm,
            calf_cm,
            chest_cm,
            notes,
            created_by_membership_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            publicId,
            record.id,
            validated.measurementDate,
            validated.weightKg ?? null,
            validated.heightCm ?? null,
            validated.waistCm ?? null,
            validated.hipCm ?? null,
            validated.armCm ?? null,
            validated.thighCm ?? null,
            validated.calfCm ?? null,
            validated.chestCm ?? null,
            validated.notes ?? null,
            authorMembershipId,
          ]
        );
      }
    }

    const [createdRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        pa.*,
        u_cr.full_name AS created_by_name
       FROM nutrition_v2_patient_anthropometrics pa
       LEFT JOIN consultancy_members cm_cr ON cm_cr.id = pa.created_by_membership_id
       LEFT JOIN users u_cr ON u_cr.id = cm_cr.user_id
       WHERE pa.public_id = ?;`,
      [publicId]
    );

    return mapRowToAnthropometricEntry(createdRows[0]);
  } finally {
    connection.release();
  }
}

/**
 * Updates an anthropometric entry with clinical audit tracking.
 */
export async function updateAnthropometricEntry(
  consultancyId: number,
  studentMembershipId: number,
  authorMembershipId: number,
  input: UpdateAnthropometricEntryInput
): Promise<PatientAnthropometricEntry> {
  const validated = validateUpdateAnthropometricEntryInput(input);
  const connection = await getDbConnection();

  try {
    // 1. Verify existence and authorization
    const [existingRows] = await connection.execute<RowDataPacket[]>(
      `SELECT pa.*, pr.id AS record_id
       FROM nutrition_v2_patient_anthropometrics pa
       INNER JOIN nutrition_v2_patient_records pr ON pr.id = pa.patient_record_id
       WHERE pa.public_id = ? AND pr.consultancy_id = ? AND pr.student_membership_id = ?;`,
      [validated.entryPublicId, consultancyId, studentMembershipId]
    );

    if (!Array.isArray(existingRows) || existingRows.length === 0) {
      throw new Error("Medição não encontrada ou acesso não autorizado.");
    }

    const current = existingRows[0];
    const previousEntry = mapRowToAnthropometricEntry(current);
    const perimetersJson = validated.perimeters ? JSON.stringify(validated.perimeters) : null;
    const diametersJson = validated.diameters ? JSON.stringify(validated.diameters) : null;
    const bodyCompJson = validated.bodyComposition ? JSON.stringify(validated.bodyComposition) : null;

    const hasExpandedData = Boolean(
      (validated.perimeters && Object.values(validated.perimeters).some((v) => v !== null && v !== undefined && (!Array.isArray(v) || v.length > 0))) ||
      (validated.diameters && Object.values(validated.diameters).some((v) => v !== null && v !== undefined && (!Array.isArray(v) || v.length > 0))) ||
      (validated.bodyComposition && (
        validated.bodyComposition.equipment ||
        validated.bodyComposition.protocol ||
        validated.bodyComposition.origin ||
        validated.bodyComposition.notes ||
        validated.bodyComposition.isInconsistent
      ))
    );

    // 2. Perform UPDATE with fallback
    try {
      // 2.1 Full schema update (migration 065)
      await connection.execute<ResultSetHeader>(
        `UPDATE nutrition_v2_patient_anthropometrics
         SET
           measurement_date = ?,
           weight_kg = ?,
           height_cm = ?,
           waist_cm = ?,
           hip_cm = ?,
           arm_cm = ?,
           thigh_cm = ?,
           calf_cm = ?,
           chest_cm = ?,
           neck_cm = ?,
           forearm_cm = ?,
           abdomen_cm = ?,
           relaxed_arm_cm = ?,
           contracted_arm_cm = ?,
           triceps_mm = ?,
           biceps_mm = ?,
           subscapular_mm = ?,
           suprailiac_mm = ?,
           abdominal_fold_mm = ?,
           chest_fold_mm = ?,
           thigh_fold_mm = ?,
           midaxillary_mm = ?,
           calf_fold_mm = ?,
           skinfold_protocol = ?,
           body_fat_pct = ?,
           fat_mass_kg = ?,
           lean_mass_kg = ?,
           muscle_mass_kg = ?,
           body_water_pct = ?,
           body_water_kg = ?,
           bone_mass_value = ?,
           bone_mass_unit = ?,
           bone_mass_method = ?,
           source_type = ?,
           equipment_method = ?,
           notes = ?,
           perimeters_json = ?,
           diameters_json = ?,
           body_composition_json = ?,
           updated_by_membership_id = ?,
           edit_reason = ?,
           updated_at = NOW(3)
         WHERE id = ?;`,
        [
          validated.measurementDate,
          validated.weightKg ?? null,
          validated.heightCm ?? null,
          validated.waistCm ?? null,
          validated.hipCm ?? null,
          validated.armCm ?? null,
          validated.thighCm ?? null,
          validated.calfCm ?? null,
          validated.chestCm ?? null,
          validated.neckCm ?? null,
          validated.forearmCm ?? null,
          validated.abdomenCm ?? null,
          validated.relaxedArmCm ?? null,
          validated.contractedArmCm ?? null,
          validated.tricepsMm ?? null,
          validated.bicepsMm ?? null,
          validated.subscapularMm ?? null,
          validated.suprailiacMm ?? null,
          validated.abdominalFoldMm ?? null,
          validated.chestFoldMm ?? null,
          validated.thighFoldMm ?? null,
          validated.midaxillaryMm ?? null,
          validated.calfFoldMm ?? null,
          validated.skinfoldProtocol ?? null,
          validated.bodyFatPct ?? null,
          validated.fatMassKg ?? null,
          validated.leanMassKg ?? null,
          validated.muscleMassKg ?? null,
          validated.bodyWaterPct ?? null,
          validated.bodyWaterKg ?? null,
          validated.boneMassValue ?? null,
          validated.boneMassUnit ?? null,
          validated.boneMassMethod ?? null,
          validated.sourceType ?? "PROFESSIONAL_RECORDED",
          validated.equipmentMethod ?? null,
          validated.notes ?? null,
          perimetersJson,
          diametersJson,
          bodyCompJson,
          authorMembershipId,
          validated.editReason,
          current.id,
        ]
      );
    } catch {
      if (hasExpandedData) {
        throw new Error(
          "As medidas corporais ampliadas (perímetros bilaterais, diâmetros ósseos ou composição estruturada) requerem a aplicação da Migration 065 no banco de dados. Os dados digitados foram preservados para evitar perda de informações."
        );
      }
      try {
        // 2.2 Schema 062 update without 065 columns
        await connection.execute<ResultSetHeader>(
          `UPDATE nutrition_v2_patient_anthropometrics
           SET
             measurement_date = ?,
             weight_kg = ?,
             height_cm = ?,
             waist_cm = ?,
             hip_cm = ?,
             arm_cm = ?,
             thigh_cm = ?,
             calf_cm = ?,
             chest_cm = ?,
             neck_cm = ?,
             forearm_cm = ?,
             abdomen_cm = ?,
             relaxed_arm_cm = ?,
             contracted_arm_cm = ?,
             triceps_mm = ?,
             biceps_mm = ?,
             subscapular_mm = ?,
             suprailiac_mm = ?,
             abdominal_fold_mm = ?,
             chest_fold_mm = ?,
             thigh_fold_mm = ?,
             midaxillary_mm = ?,
             calf_fold_mm = ?,
             skinfold_protocol = ?,
             body_fat_pct = ?,
             fat_mass_kg = ?,
             lean_mass_kg = ?,
             muscle_mass_kg = ?,
             body_water_pct = ?,
             body_water_kg = ?,
             bone_mass_value = ?,
             bone_mass_unit = ?,
             bone_mass_method = ?,
             source_type = ?,
             equipment_method = ?,
             notes = ?,
             updated_by_membership_id = ?,
             edit_reason = ?,
             updated_at = NOW(3)
           WHERE id = ?;`,
          [
            validated.measurementDate,
            validated.weightKg ?? null,
            validated.heightCm ?? null,
            validated.waistCm ?? null,
            validated.hipCm ?? null,
            validated.armCm ?? null,
            validated.thighCm ?? null,
            validated.calfCm ?? null,
            validated.chestCm ?? null,
            validated.neckCm ?? null,
            validated.forearmCm ?? null,
            validated.abdomenCm ?? null,
            validated.relaxedArmCm ?? null,
            validated.contractedArmCm ?? null,
            validated.tricepsMm ?? null,
            validated.bicepsMm ?? null,
            validated.subscapularMm ?? null,
            validated.suprailiacMm ?? null,
            validated.abdominalFoldMm ?? null,
            validated.chestFoldMm ?? null,
            validated.thighFoldMm ?? null,
            validated.midaxillaryMm ?? null,
            validated.calfFoldMm ?? null,
            validated.skinfoldProtocol ?? null,
            validated.bodyFatPct ?? null,
            validated.fatMassKg ?? null,
            validated.leanMassKg ?? null,
            validated.muscleMassKg ?? null,
            validated.bodyWaterPct ?? null,
            validated.bodyWaterKg ?? null,
            validated.boneMassValue ?? null,
            validated.boneMassUnit ?? null,
            validated.boneMassMethod ?? null,
            validated.sourceType ?? "PROFESSIONAL_RECORDED",
            validated.equipmentMethod ?? null,
            validated.notes ?? null,
            authorMembershipId,
            validated.editReason,
            current.id,
          ]
        );
      } catch {
        // 2.3 Fallback update
        await connection.execute<ResultSetHeader>(
          `UPDATE nutrition_v2_patient_anthropometrics
           SET
             measurement_date = ?,
             weight_kg = ?,
             height_cm = ?,
             waist_cm = ?,
             hip_cm = ?,
             arm_cm = ?,
             thigh_cm = ?,
             calf_cm = ?,
             chest_cm = ?,
             notes = ?,
             updated_at = NOW(3)
           WHERE id = ?;`,
          [
            validated.measurementDate,
            validated.weightKg ?? null,
            validated.heightCm ?? null,
            validated.waistCm ?? null,
            validated.hipCm ?? null,
            validated.armCm ?? null,
            validated.thighCm ?? null,
            validated.calfCm ?? null,
            validated.chestCm ?? null,
            validated.notes ?? null,
            current.id,
          ]
        );
      }
    }

    // 3. Log audit trail for changed fields
    try {
      const auditFields: Array<{ field: string; prev: unknown; next: unknown }> = [
        { field: "weightKg", prev: previousEntry.weightKg, next: validated.weightKg },
        { field: "heightCm", prev: previousEntry.heightCm, next: validated.heightCm },
        { field: "waistCm", prev: previousEntry.waistCm, next: validated.waistCm },
        { field: "hipCm", prev: previousEntry.hipCm, next: validated.hipCm },
        { field: "bodyFatPct", prev: previousEntry.bodyFatPct, next: validated.bodyFatPct },
        { field: "measurementDate", prev: previousEntry.measurementDate, next: validated.measurementDate },
      ];

      for (const item of auditFields) {
        const prevStr = item.prev !== undefined && item.prev !== null ? String(item.prev) : null;
        const nextStr = item.next !== undefined && item.next !== null ? String(item.next) : null;
        if (prevStr !== nextStr) {
          const auditPublicId = crypto.randomUUID();
          await connection.execute<ResultSetHeader>(
            `INSERT INTO nutrition_v2_patient_anthropometrics_audit (
              public_id,
              consultancy_id,
              patient_record_id,
              anthropometric_id,
              changed_by_membership_id,
              field_name,
              previous_value,
              new_value,
              edit_reason
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
              auditPublicId,
              consultancyId,
              current.record_id,
              current.id,
              authorMembershipId,
              item.field,
              prevStr,
              nextStr,
              validated.editReason,
            ]
          );
        }
      }
    } catch {
      // Non-blocking if audit table is still syncing
    }

    // 4. Return updated entry
    const [updatedRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        pa.*,
        u_cr.full_name AS created_by_name,
        u_up.full_name AS updated_by_name
       FROM nutrition_v2_patient_anthropometrics pa
       LEFT JOIN consultancy_members cm_cr ON cm_cr.id = pa.created_by_membership_id
       LEFT JOIN users u_cr ON u_cr.id = cm_cr.user_id
       LEFT JOIN consultancy_members cm_up ON cm_up.id = pa.updated_by_membership_id
       LEFT JOIN users u_up ON u_up.id = cm_up.user_id
       WHERE pa.id = ?;`,
      [current.id]
    );

    return mapRowToAnthropometricEntry(updatedRows[0]);
  } finally {
    connection.release();
  }
}

/**
 * Deletes an anthropometric entry safely scoped by consultancy and student.
 */
export async function deleteAnthropometricEntry(
  consultancyId: number,
  studentMembershipId: number,
  _authorMembershipId: number,
  entryPublicId: string
): Promise<void> {
  const connection = await getDbConnection();
  try {
    const [entryRows] = await connection.execute<RowDataPacket[]>(
      `SELECT pa.id, pr.consultancy_id
       FROM nutrition_v2_patient_anthropometrics pa
       INNER JOIN nutrition_v2_patient_records pr ON pr.id = pa.patient_record_id
       WHERE pa.public_id = ? AND pr.consultancy_id = ? AND pr.student_membership_id = ?;`,
      [entryPublicId, consultancyId, studentMembershipId]
    );

    if (!Array.isArray(entryRows) || entryRows.length === 0) {
      throw new Error("Medição não encontrada ou acesso não autorizado.");
    }

    await connection.execute(
      `DELETE FROM nutrition_v2_patient_anthropometrics WHERE id = ?;`,
      [entryRows[0].id]
    );
  } finally {
    connection.release();
  }
}

/**
 * Upserts a pregnancy record for a patient.
 * Preserves the gestational reference date when gestational age is informed.
 */
export async function upsertPregnancyRecord(
  consultancyId: number,
  studentMembershipId: number,
  authorMembershipId: number,
  input: UpdatePregnancyInput
): Promise<PatientPregnancyRecord> {
  const validated = validatePregnancyInput(input);
  const connection = await getDbConnection();

  try {
    const record = await getOrCreatePatientRecord(
      connection,
      consultancyId,
      studentMembershipId,
      authorMembershipId
    );

    const [existing] = await connection.execute<RowDataPacket[]>(
      `SELECT * FROM nutrition_v2_patient_pregnancy WHERE patient_record_id = ?;`,
      [record.id]
    );

    const effectiveRefDate =
      validated.gestationalReferenceDate ||
      (validated.gestationalWeeks !== null
        ? new Date().toISOString().slice(0, 10)
        : null);

    if (Array.isArray(existing) && existing.length > 0) {
      try {
        await connection.execute<ResultSetHeader>(
          `UPDATE nutrition_v2_patient_pregnancy
           SET
             pregnancy_status = ?,
             estimated_due_date = ?,
             gestational_weeks = ?,
             gestational_reference_date = ?,
             last_menstrual_period_date = ?,
             pre_pregnancy_weight_kg = ?,
             current_pregnancy_weight_kg = ?,
             pregnancy_type = ?,
             pregnancy_notes = ?,
             obstetric_notes = ?,
             supplementation_notes = ?,
             delivery_date = ?,
             breastfeeding_status = ?,
             postpartum_notes = ?
           WHERE patient_record_id = ?;`,
          [
            validated.pregnancyStatus,
            validated.estimatedDueDate ?? null,
            validated.gestationalWeeks ?? null,
            effectiveRefDate,
            validated.lastMenstrualPeriodDate ?? null,
            validated.prePregnancyWeightKg ?? null,
            validated.currentPregnancyWeightKg ?? null,
            validated.pregnancyType ?? null,
            validated.pregnancyNotes ?? null,
            validated.obstetricNotes ?? null,
            validated.supplementationNotes ?? null,
            validated.deliveryDate ?? null,
            validated.breastfeedingStatus ?? null,
            validated.postpartumNotes ?? null,
            record.id,
          ]
        );
      } catch {
        // Fallback for pre-060 schema without gestational_reference_date
        await connection.execute<ResultSetHeader>(
          `UPDATE nutrition_v2_patient_pregnancy
           SET
             pregnancy_status = ?,
             estimated_due_date = ?,
             gestational_weeks = ?,
             last_menstrual_period_date = ?,
             pre_pregnancy_weight_kg = ?,
             current_pregnancy_weight_kg = ?,
             pregnancy_type = ?,
             pregnancy_notes = ?,
             obstetric_notes = ?,
             supplementation_notes = ?,
             delivery_date = ?,
             breastfeeding_status = ?,
             postpartum_notes = ?
           WHERE patient_record_id = ?;`,
          [
            validated.pregnancyStatus,
            validated.estimatedDueDate ?? null,
            validated.gestationalWeeks ?? null,
            validated.lastMenstrualPeriodDate ?? null,
            validated.prePregnancyWeightKg ?? null,
            validated.currentPregnancyWeightKg ?? null,
            validated.pregnancyType ?? null,
            validated.pregnancyNotes ?? null,
            validated.obstetricNotes ?? null,
            validated.supplementationNotes ?? null,
            validated.deliveryDate ?? null,
            validated.breastfeedingStatus ?? null,
            validated.postpartumNotes ?? null,
            record.id,
          ]
        );
      }
    } else {
      const publicId = crypto.randomUUID();
      try {
        await connection.execute<ResultSetHeader>(
          `INSERT INTO nutrition_v2_patient_pregnancy (
            public_id,
            patient_record_id,
            pregnancy_status,
            estimated_due_date,
            gestational_weeks,
            gestational_reference_date,
            last_menstrual_period_date,
            pre_pregnancy_weight_kg,
            current_pregnancy_weight_kg,
            pregnancy_type,
            pregnancy_notes,
            obstetric_notes,
            supplementation_notes,
            delivery_date,
            breastfeeding_status,
            postpartum_notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            publicId,
            record.id,
            validated.pregnancyStatus,
            validated.estimatedDueDate ?? null,
            validated.gestationalWeeks ?? null,
            effectiveRefDate,
            validated.lastMenstrualPeriodDate ?? null,
            validated.prePregnancyWeightKg ?? null,
            validated.currentPregnancyWeightKg ?? null,
            validated.pregnancyType ?? null,
            validated.pregnancyNotes ?? null,
            validated.obstetricNotes ?? null,
            validated.supplementationNotes ?? null,
            validated.deliveryDate ?? null,
            validated.breastfeedingStatus ?? null,
            validated.postpartumNotes ?? null,
          ]
        );
      } catch {
        // Fallback for pre-060 schema without gestational_reference_date
        await connection.execute<ResultSetHeader>(
          `INSERT INTO nutrition_v2_patient_pregnancy (
            public_id,
            patient_record_id,
            pregnancy_status,
            estimated_due_date,
            gestational_weeks,
            last_menstrual_period_date,
            pre_pregnancy_weight_kg,
            current_pregnancy_weight_kg,
            pregnancy_type,
            pregnancy_notes,
            obstetric_notes,
            supplementation_notes,
            delivery_date,
            breastfeeding_status,
            postpartum_notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            publicId,
            record.id,
            validated.pregnancyStatus,
            validated.estimatedDueDate ?? null,
            validated.gestationalWeeks ?? null,
            validated.lastMenstrualPeriodDate ?? null,
            validated.prePregnancyWeightKg ?? null,
            validated.currentPregnancyWeightKg ?? null,
            validated.pregnancyType ?? null,
            validated.pregnancyNotes ?? null,
            validated.obstetricNotes ?? null,
            validated.supplementationNotes ?? null,
            validated.deliveryDate ?? null,
            validated.breastfeedingStatus ?? null,
            validated.postpartumNotes ?? null,
          ]
        );
      }
    }

    const [updatedRows] = await connection.execute<RowDataPacket[]>(
      `SELECT * FROM nutrition_v2_patient_pregnancy WHERE patient_record_id = ?;`,
      [record.id]
    );

    return mapRowToPregnancyRecord(updatedRows[0]);
  } finally {
    connection.release();
  }
}

/**
 * Saves a patient clinical note (Draft autosave or Finalize).
 * Enforces historical immutability on finalized notes.
 */
export async function savePatientClinicalNote(
  consultancyId: number,
  studentMembershipId: number,
  authorMembershipId: number,
  input: SaveClinicalNoteInput
): Promise<PatientClinicalNoteDto> {
  const validated = validateClinicalNoteInput(input);
  const connection = await getDbConnection();

  try {
    const record = await getOrCreatePatientRecord(
      connection,
      consultancyId,
      studentMembershipId,
      authorMembershipId
    );

    if (validated.publicId) {
      // Update existing draft
      const [existingRows] = await connection.execute<RowDataPacket[]>(
        `SELECT * FROM nutrition_v2_patient_clinical_notes
         WHERE public_id = ? AND consultancy_id = ?;`,
        [validated.publicId, consultancyId]
      );

      if (!Array.isArray(existingRows) || existingRows.length === 0) {
        throw new Error("Anotação clínica não encontrada.");
      }

      const existing = existingRows[0];
      if (existing.status === "FINALIZED") {
        throw new Error("Anotações clínicas finalizadas são imutáveis e auditadas.");
      }

      await connection.execute<ResultSetHeader>(
        `UPDATE nutrition_v2_patient_clinical_notes
         SET
           note_date = ?,
           context_type = ?,
           content = ?,
           conduct = ?,
           status = ?,
           finalized_at = CASE WHEN ? = 'FINALIZED' THEN CURRENT_TIMESTAMP(3) ELSE finalized_at END
         WHERE id = ? AND consultancy_id = ?;`,
        [
          validated.noteDate,
          validated.contextType,
          validated.content,
          validated.conduct ?? null,
          validated.status ?? "DRAFT",
          validated.status ?? "DRAFT",
          existing.id,
          consultancyId,
        ]
      );

      const [updatedRows] = await connection.execute<RowDataPacket[]>(
        `SELECT
          n.*,
          u.full_name AS author_name,
          cm.public_id AS author_membership_public_id
        FROM nutrition_v2_patient_clinical_notes n
        INNER JOIN consultancy_members cm ON cm.id = n.author_membership_id
        INNER JOIN users u ON u.id = cm.user_id
        WHERE n.id = ?;`,
        [existing.id]
      );

      return mapRowToClinicalNote(updatedRows[0], authorMembershipId);
    } else {
      // Create new clinical note
      const publicId = crypto.randomUUID();
      const isFinalized = validated.status === "FINALIZED";

      await connection.execute<ResultSetHeader>(
        `INSERT INTO nutrition_v2_patient_clinical_notes (
          public_id,
          consultancy_id,
          student_membership_id,
          author_membership_id,
          patient_record_id,
          note_date,
          context_type,
          status,
          conduct,
          content,
          confidential_internal,
          finalized_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?);`,
        [
          publicId,
          consultancyId,
          studentMembershipId,
          authorMembershipId,
          record.id,
          validated.noteDate,
          validated.contextType,
          validated.status ?? "DRAFT",
          validated.conduct ?? null,
          validated.content,
          isFinalized ? new Date() : null,
        ]
      );

      const [createdRows] = await connection.execute<RowDataPacket[]>(
        `SELECT
          n.*,
          u.full_name AS author_name,
          cm.public_id AS author_membership_public_id
        FROM nutrition_v2_patient_clinical_notes n
        INNER JOIN consultancy_members cm ON cm.id = n.author_membership_id
        INNER JOIN users u ON u.id = cm.user_id
        WHERE n.public_id = ?;`,
        [publicId]
      );

      return mapRowToClinicalNote(createdRows[0], authorMembershipId);
    }
  } finally {
    connection.release();
  }
}

/**
 * Lists clinical notes for a patient.
 * Patient-facing requests are strictly blocked from receiving confidential internal notes.
 */
export async function listPatientClinicalNotes(
  consultancyId: number,
  studentMembershipId: number,
  isInternalProfessionalViewer: boolean,
  authorMembershipId?: number
): Promise<PatientClinicalNoteDto[]> {
  if (!isInternalProfessionalViewer) {
    // Zero confidential leaks: patient or non-authorized views receive empty list
    return [];
  }

  const connection = await getDbConnection();
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        n.*,
        u.full_name AS author_name,
        cm.public_id AS author_membership_public_id
      FROM nutrition_v2_patient_clinical_notes n
      INNER JOIN consultancy_members cm ON cm.id = n.author_membership_id
      INNER JOIN users u ON u.id = cm.user_id
      WHERE n.consultancy_id = ? AND n.student_membership_id = ?
      ORDER BY n.note_date DESC, n.id DESC;`,
      [consultancyId, studentMembershipId]
    );

    return (Array.isArray(rows) ? rows : []).map((r) =>
      mapRowToClinicalNote(r, authorMembershipId)
    );
  } catch {
    return [];
  } finally {
    connection.release();
  }
}

/**
 * Finalizes an existing draft clinical note.
 */
export async function finalizePatientClinicalNote(
  consultancyId: number,
  studentMembershipId: number,
  authorMembershipId: number,
  notePublicId: string
): Promise<PatientClinicalNoteDto> {
  const connection = await getDbConnection();
  try {
    const [existingRows] = await connection.execute<RowDataPacket[]>(
      `SELECT * FROM nutrition_v2_patient_clinical_notes
       WHERE public_id = ? AND consultancy_id = ? AND student_membership_id = ?;`,
      [notePublicId, consultancyId, studentMembershipId]
    );

    if (!Array.isArray(existingRows) || existingRows.length === 0) {
      throw new Error("Anotação clínica não encontrada.");
    }

    const existing = existingRows[0];
    if (existing.status === "FINALIZED") {
      return mapRowToClinicalNote(existing, authorMembershipId);
    }

    await connection.execute<ResultSetHeader>(
      `UPDATE nutrition_v2_patient_clinical_notes
       SET
         status = 'FINALIZED',
         finalized_at = CURRENT_TIMESTAMP(3)
       WHERE id = ? AND consultancy_id = ?;`,
      [existing.id, consultancyId]
    );

    const [updatedRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        n.*,
        u.full_name AS author_name,
        cm.public_id AS author_membership_public_id
      FROM nutrition_v2_patient_clinical_notes n
      INNER JOIN consultancy_members cm ON cm.id = n.author_membership_id
      INNER JOIN users u ON u.id = cm.user_id
      WHERE n.id = ?;`,
      [existing.id]
    );

    return mapRowToClinicalNote(updatedRows[0], authorMembershipId);
  } finally {
    connection.release();
  }
}

/**
 * Deletes a draft clinical note. Finalized notes CANNOT be deleted (immutable).
 */
export async function deletePatientClinicalNote(
  consultancyId: number,
  studentMembershipId: number,
  _authorMembershipId: number,
  notePublicId: string
): Promise<boolean> {
  const connection = await getDbConnection();
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, status FROM nutrition_v2_patient_clinical_notes
       WHERE public_id = ? AND consultancy_id = ? AND student_membership_id = ?;`,
      [notePublicId, consultancyId, studentMembershipId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error("Anotação não encontrada.");
    }

    if (rows[0].status === "FINALIZED") {
      throw new Error("Registros clínicos finalizados não podem ser excluídos.");
    }

    await connection.execute(
      `DELETE FROM nutrition_v2_patient_clinical_notes WHERE id = ?;`,
      [rows[0].id]
    );
    return true;
  } finally {
    connection.release();
  }
}

/**
 * Marks a patient-reported field as reviewed and verified by the professional.
 */
export async function markPatientFieldReviewed(
  consultancyId: number,
  studentMembershipId: number,
  authorMembershipId: number,
  fieldName: string,
  reviewerName: string
): Promise<void> {
  const connection = await getDbConnection();
  try {
    const record = await getOrCreatePatientRecord(
      connection,
      consultancyId,
      studentMembershipId,
      authorMembershipId
    );

    let provMap: Record<string, { origin: string; reviewedBy?: string; reviewedAt?: string }> = {};
    if (record.fieldProvenanceJson) {
      try {
        provMap = JSON.parse(record.fieldProvenanceJson);
      } catch {}
    }

    provMap[fieldName] = {
      origin: "PROFESSIONAL_REVIEWED",
      reviewedBy: reviewerName,
      reviewedAt: new Date().toISOString(),
    };

    const newJson = JSON.stringify(provMap);

    await connection.execute(
      `UPDATE nutrition_v2_patient_records
       SET field_provenance_json = ?
       WHERE id = ? AND consultancy_id = ?;`,
      [newJson, record.id, consultancyId]
    );

    await logPatientRecordAudit(
      connection,
      consultancyId,
      record.id,
      authorMembershipId,
      [
        {
          fieldName,
          previousValue: "PATIENT_REPORTED",
          newValue: `PROFESSIONAL_REVIEWED (por ${reviewerName})`,
        },
      ]
    );
  } finally {
    connection.release();
  }
}

/**
 * Lists patients in the consultancy for nutritionists to browse and access records.
 */
export async function listPatientsForConsultancy(
  consultancyId: number,
  search?: string
): Promise<
  Array<{
    studentMembershipId: number;
    studentPublicId: string;
    fullName: string;
    email: string;
    joinedAt: string;
    recordPublicId: string | null;
    pregnancyStatus: string | null;
    lastRecordedWeightKg: number | null;
    lastMeasuredDate: string | null;
    hasOnboarding: boolean;
  }>
> {
  const connection = await getDbConnection();
  try {
    let query = `
      SELECT
        cm.id AS student_membership_id,
        cm.public_id AS student_public_id,
        u.full_name,
        u.email,
        cm.joined_at,
        pr.public_id AS record_public_id,
        pp.pregnancy_status,
        (
          SELECT pa.weight_kg
          FROM nutrition_v2_patient_anthropometrics pa
          WHERE pa.patient_record_id = pr.id
          ORDER BY pa.measurement_date DESC, pa.id DESC
          LIMIT 1
        ) AS last_weight_kg,
        (
          SELECT pa.measurement_date
          FROM nutrition_v2_patient_anthropometrics pa
          WHERE pa.patient_record_id = pr.id
          ORDER BY pa.measurement_date DESC, pa.id DESC
          LIMIT 1
        ) AS last_measured_date,
        EXISTS(
          SELECT 1 FROM student_intake_submissions sis
          WHERE sis.consultancy_id = cm.consultancy_id AND sis.membership_id = cm.id
        ) AS has_onboarding
      FROM consultancy_members cm
      INNER JOIN users u ON u.id = cm.user_id
      INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id AND cmr.role = 'STUDENT'
      LEFT JOIN nutrition_v2_patient_records pr ON pr.consultancy_id = cm.consultancy_id AND pr.student_membership_id = cm.id AND pr.deleted_at IS NULL
      LEFT JOIN nutrition_v2_patient_pregnancy pp ON pp.patient_record_id = pr.id
      WHERE cm.consultancy_id = ?
        AND cm.status = 'ACTIVE'
    `;

    const params: (string | number)[] = [consultancyId];

    if (search && search.trim()) {
      query += ` AND (u.full_name LIKE ? OR u.email LIKE ?)`;
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    query += ` ORDER BY u.full_name ASC LIMIT 100;`;

    const [rows] = await connection.execute<RowDataPacket[]>(query, params);

    return (Array.isArray(rows) ? rows : []).map((r) => ({
      studentMembershipId: Number(r.student_membership_id),
      studentPublicId: String(r.student_public_id),
      fullName: String(r.full_name),
      email: String(r.email),
      joinedAt: r.joined_at ? new Date(r.joined_at).toISOString() : new Date().toISOString(),
      recordPublicId: r.record_public_id ? String(r.record_public_id) : null,
      pregnancyStatus: r.pregnancy_status ? String(r.pregnancy_status) : null,
      lastRecordedWeightKg: r.last_weight_kg ? Number(r.last_weight_kg) : null,
      lastMeasuredDate: r.last_measured_date ? (typeof r.last_measured_date === "string" ? r.last_measured_date : new Date(r.last_measured_date).toISOString().slice(0, 10)) : null,
      hasOnboarding: Boolean(r.has_onboarding),
    }));
  } finally {
    connection.release();
  }
}
