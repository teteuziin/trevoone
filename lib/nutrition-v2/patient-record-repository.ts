/**
 * TREVO ONE — NUTRITION V2 PATIENT RECORD REPOSITORY
 * Clinical history, lifestyle, historical anthropometrics, pregnancy, and onboarding integration.
 */

import crypto from "node:crypto";
import type { RowDataPacket, ResultSetHeader, PoolConnection } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";
import {
  type PatientRecord,
  type PatientAnthropometricEntry,
  type PatientPregnancyRecord,
  type PatientRecordDetail,
  type OnboardingReferenceData,
  type UpdatePatientRecordInput,
  type AddAnthropometricEntryInput,
  type UpdatePregnancyInput,
} from "./patient-record-types";
import {
  validatePatientRecordInput,
  validateAnthropometricEntryInput,
  validatePregnancyInput,
  PatientRecordValidationError,
} from "./patient-record-validation";

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
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    deletedAt: row.deleted_at ? new Date(row.deleted_at).toISOString() : null,
  };
}

function mapRowToAnthropometricEntry(row: RowDataPacket): PatientAnthropometricEntry {
  return {
    id: Number(row.id),
    publicId: String(row.public_id),
    patientRecordId: Number(row.patient_record_id),
    measurementDate: typeof row.measurement_date === "string" ? row.measurement_date : new Date(row.measurement_date).toISOString().slice(0, 10),
    weightKg: row.weight_kg !== null && row.weight_kg !== undefined ? Number(row.weight_kg) : null,
    heightCm: row.height_cm !== null && row.height_cm !== undefined ? Number(row.height_cm) : null,
    waistCm: row.waist_cm !== null && row.waist_cm !== undefined ? Number(row.waist_cm) : null,
    hipCm: row.hip_cm !== null && row.hip_cm !== undefined ? Number(row.hip_cm) : null,
    armCm: row.arm_cm !== null && row.arm_cm !== undefined ? Number(row.arm_cm) : null,
    thighCm: row.thigh_cm !== null && row.thigh_cm !== undefined ? Number(row.thigh_cm) : null,
    calfCm: row.calf_cm !== null && row.calf_cm !== undefined ? Number(row.calf_cm) : null,
    chestCm: row.chest_cm !== null && row.chest_cm !== undefined ? Number(row.chest_cm) : null,
    notes: row.notes ? String(row.notes) : null,
    createdByMembershipId: Number(row.created_by_membership_id),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
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

/**
 * Extracts read-only reference data from canonical onboarding intake submissions and progress entries.
 * Strictly non-mutating: does not alter onboarding submissions or user identity.
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
  // Onboarding data is exposed through onboardingReference as canonical read-only reference.
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
 * Returns full patient record detail including pregnancy, anthropometrics, and onboarding reference data.
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
    const [anthroRows] = await connection.execute<RowDataPacket[]>(
      `SELECT * FROM nutrition_v2_patient_anthropometrics
       WHERE patient_record_id = ?
       ORDER BY measurement_date DESC, id DESC;`,
      [record.id]
    );

    const anthropometrics = (Array.isArray(anthroRows) ? anthroRows : []).map(mapRowToAnthropometricEntry);

    // 5. Get onboarding reference data
    const onboardingReference = await getOnboardingReferenceData(
      connection,
      consultancyId,
      studentMembershipId
    );

    return {
      record,
      student: studentInfo,
      pregnancy,
      anthropometrics,
      onboardingReference,
    };
  } finally {
    connection.release();
  }
}

/**
 * Updates patient clinical and lifestyle record.
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
    const record = await getOrCreatePatientRecord(
      connection,
      consultancyId,
      studentMembershipId,
      authorMembershipId
    );

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

    const [updatedRows] = await connection.execute<RowDataPacket[]>(
      `SELECT * FROM nutrition_v2_patient_records WHERE id = ?;`,
      [record.id]
    );

    return mapRowToPatientRecord(updatedRows[0]);
  } finally {
    connection.release();
  }
}

/**
 * Adds an anthropometric measurement entry to the patient record.
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

    const [createdRows] = await connection.execute<RowDataPacket[]>(
      `SELECT * FROM nutrition_v2_patient_anthropometrics WHERE public_id = ?;`,
      [publicId]
    );

    return mapRowToAnthropometricEntry(createdRows[0]);
  } finally {
    connection.release();
  }
}

/**
 * Deletes an anthropometric measurement entry.
 */
export async function deleteAnthropometricEntry(
  consultancyId: number,
  studentMembershipId: number,
  authorMembershipId: number,
  anthropometricPublicId: string
): Promise<{ success: boolean }> {
  const connection = await getDbConnection();

  try {
    const record = await getOrCreatePatientRecord(
      connection,
      consultancyId,
      studentMembershipId,
      authorMembershipId
    );

    const [res] = await connection.execute<ResultSetHeader>(
      `DELETE FROM nutrition_v2_patient_anthropometrics
       WHERE public_id = ? AND patient_record_id = ?;`,
      [anthropometricPublicId, record.id]
    );

    if (res.affectedRows === 0) {
      throw new PatientRecordValidationError("Medição antropométrica não encontrada.", "MEASUREMENT_NOT_FOUND", 404);
    }

    return { success: true };
  } finally {
    connection.release();
  }
}

/**
 * Upserts pregnancy/gestation and postpartum information for the patient record.
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
      `SELECT id FROM nutrition_v2_patient_pregnancy WHERE patient_record_id = ?;`,
      [record.id]
    );

    if (Array.isArray(existing) && existing.length > 0) {
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
    } else {
      const publicId = crypto.randomUUID();
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
