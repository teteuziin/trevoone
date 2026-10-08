/**
 * TREVO ONE — NUTRITION PROFESSIONAL V2
 * RELEASE J — PATIENT PLANNING REPOSITORY
 *
 * Implements Phase 3 Nutritional Planning persistence:
 * - Tenancy-isolated repository for patient-level metabolic and target planning
 * - Single stable active row per student membership (safe UPSERT)
 * - Authorship audit: created_by stays intact on updates, updated_by tracks latest editor
 * - Snapshot preservation and stale detection (never silent recalculation)
 * - UNKNOWN != ZERO enforcement
 */

import type { RowDataPacket, ResultSetHeader, PoolConnection } from "mysql2/promise";
import crypto from "node:crypto";
import { getDbConnection } from "../db/mysql";
import type {
  PatientPlanning,
  SavePatientPlanningInput,
  PatientPlanningStaleStatus,
  BmrFormulaCode,
  ActivityLevelCode,
  GoalTypeCode,
  TargetCalorieSource,
  BiologicalSex,
} from "./patient-planning-types";


export class PlanningTenancyError extends Error {
  public readonly code = "TENANCY_VIOLATION";
  public readonly statusCode = 403;
  constructor(message = "Violação de isolamento entre consultorias.") {
    super(message);
    this.name = "PlanningTenancyError";
  }
}

export class PlanningValidationError extends Error {
  public readonly code = "INVALID_PLANNING_DATA";
  public readonly statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = "PlanningValidationError";
  }
}

function mapRowToPlanning(row: RowDataPacket): PatientPlanning {
  return {
    id: Number(row.id),
    publicId: String(row.public_id),
    consultancyId: Number(row.consultancy_id),
    studentMembershipId: Number(row.student_membership_id),
    patientRecordId: row.patient_record_id !== null ? Number(row.patient_record_id) : null,
    createdByMembershipId: Number(row.created_by_membership_id),
    updatedByMembershipId: row.updated_by_membership_id !== null ? Number(row.updated_by_membership_id) : null,
    calculatedAt: row.calculated_at ? new Date(row.calculated_at).toISOString() : null,

    snapshotWeightKg: row.snapshot_weight_kg !== null ? Number(row.snapshot_weight_kg) : null,
    snapshotHeightCm: row.snapshot_height_cm !== null ? Number(row.snapshot_height_cm) : null,
    snapshotAgeYears: row.snapshot_age_years !== null ? Number(row.snapshot_age_years) : null,
    snapshotBiologicalSex: (row.snapshot_biological_sex as BiologicalSex) || null,

    bmrFormula: (row.bmr_formula as BmrFormulaCode) || null,
    bmrKcal: row.bmr_kcal !== null ? Number(row.bmr_kcal) : null,

    activityLevel: (row.activity_level as ActivityLevelCode) || null,
    activityFactor: row.activity_factor !== null ? Number(row.activity_factor) : null,
    tdeeKcal: row.tdee_kcal !== null ? Number(row.tdee_kcal) : null,

    goalType: (row.goal_type as GoalTypeCode) || null,
    calorieAdjustmentKcal: row.calorie_adjustment_kcal !== null ? Number(row.calorie_adjustment_kcal) : null,
    calculatedTargetCaloriesKcal: row.calculated_target_calories_kcal !== null ? Number(row.calculated_target_calories_kcal) : null,
    targetCaloriesKcal: row.target_calories_kcal !== null ? Number(row.target_calories_kcal) : null,
    targetCaloriesSource: (row.target_calories_source as TargetCalorieSource) || null,

    targetProteinG: row.target_protein_g !== null ? Number(row.target_protein_g) : null,
    targetCarbsG: row.target_carbs_g !== null ? Number(row.target_carbs_g) : null,
    targetFatsG: row.target_fats_g !== null ? Number(row.target_fats_g) : null,

    clinicalNotes: row.clinical_notes !== null ? String(row.clinical_notes) : null,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

/**
 * Loads patient planning for a student within a tenancy.
 */
export async function getPatientPlanningByStudent(
  consultancyId: number,
  studentMembershipId: number,
  connection?: PoolConnection
): Promise<PatientPlanning | null> {
  const conn = connection || (await getDbConnection());

  const [rows] = await conn.execute<RowDataPacket[]>(
    `SELECT * FROM nutrition_v2_patient_planning
     WHERE consultancy_id = ? AND student_membership_id = ?
     LIMIT 1;`,
    [consultancyId, studentMembershipId]
  );

  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  return mapRowToPlanning(rows[0]);
}

/**
 * Checks whether the saved planning snapshot is stale compared to current clinical inputs.
 */
export function checkPlanningStaleStatus(
  planning: PatientPlanning | null,
  currentInputs: {
    weightKg: number | null;
    heightCm: number | null;
    ageYears: number | null;
    biologicalSex: BiologicalSex | null;
  }
): PatientPlanningStaleStatus {
  if (!planning || !planning.calculatedAt) {
    return {
      isStale: false,
      reasons: [],
      currentInputs,
      snapshotInputs: null,
    };
  }

  const snapshotInputs = {
    weightKg: planning.snapshotWeightKg,
    heightCm: planning.snapshotHeightCm,
    ageYears: planning.snapshotAgeYears,
    biologicalSex: planning.snapshotBiologicalSex,
  };

  const reasons: string[] = [];

  if (
    currentInputs.weightKg !== null &&
    snapshotInputs.weightKg !== null &&
    Math.abs(currentInputs.weightKg - snapshotInputs.weightKg) >= 0.1
  ) {
    reasons.push(
      `Peso atual (${currentInputs.weightKg} kg) diverge do cálculo original (${snapshotInputs.weightKg} kg)`
    );
  }

  if (
    currentInputs.heightCm !== null &&
    snapshotInputs.heightCm !== null &&
    Math.abs(currentInputs.heightCm - snapshotInputs.heightCm) >= 0.5
  ) {
    reasons.push(
      `Altura atual (${currentInputs.heightCm} cm) diverge do cálculo original (${snapshotInputs.heightCm} cm)`
    );
  }

  if (
    currentInputs.ageYears !== null &&
    snapshotInputs.ageYears !== null &&
    currentInputs.ageYears !== snapshotInputs.ageYears
  ) {
    reasons.push(
      `Idade atual (${currentInputs.ageYears} anos) diverge do cálculo original (${snapshotInputs.ageYears} anos)`
    );
  }

  if (
    currentInputs.biologicalSex !== null &&
    snapshotInputs.biologicalSex !== null &&
    currentInputs.biologicalSex !== snapshotInputs.biologicalSex
  ) {
    reasons.push(
      `Sexo biológico atual (${currentInputs.biologicalSex}) diverge do cálculo original (${snapshotInputs.biologicalSex})`
    );
  }

  return {
    isStale: reasons.length > 0,
    reasons,
    currentInputs,
    snapshotInputs,
  };
}

/**
 * Upserts patient nutritional planning with strict tenancy checks and authorship auditing.
 */
export async function upsertPatientPlanning(
  consultancyId: number,
  studentMembershipId: number,
  input: SavePatientPlanningInput,
  authorMembershipId: number,
  connection?: PoolConnection
): Promise<PatientPlanning> {
  const conn = connection || (await getDbConnection());

  // 1. Tenancy validation: student membership must belong to consultancy
  const [studentRows] = await conn.execute<RowDataPacket[]>(
    `SELECT id, status FROM consultancy_members
     WHERE id = ? AND consultancy_id = ?;`,
    [studentMembershipId, consultancyId]
  );

  if (!Array.isArray(studentRows) || studentRows.length === 0) {
    throw new PlanningTenancyError("Aluno não encontrado ou não pertence a esta consultoria.");
  }

  // 2. Tenancy validation: author membership must belong to consultancy
  const [authorRows] = await conn.execute<RowDataPacket[]>(
    `SELECT id, status FROM consultancy_members
     WHERE id = ? AND consultancy_id = ?;`,
    [authorMembershipId, consultancyId]
  );

  if (!Array.isArray(authorRows) || authorRows.length === 0) {
    throw new PlanningTenancyError("Profissional autor não pertence a esta consultoria.");
  }

  // 3. Tenancy validation: if patientRecordId is provided, verify it belongs to same student & consultancy
  let resolvedPatientRecordId: number | null = null;
  if (input.patientRecordId) {
    const [recordRows] = await conn.execute<RowDataPacket[]>(
      `SELECT id FROM nutrition_v2_patient_records
       WHERE id = ? AND consultancy_id = ? AND student_membership_id = ?;`,
      [input.patientRecordId, consultancyId, studentMembershipId]
    );

    if (Array.isArray(recordRows) && recordRows.length > 0) {
      resolvedPatientRecordId = Number(recordRows[0].id);
    } else {
      throw new PlanningTenancyError("Prontuário clínico informado não pertence a este aluno nesta consultoria.");
    }
  }

  // 4. Clinical validations (reject negative values where invalid)
  if (input.snapshotWeightKg !== undefined && input.snapshotWeightKg !== null && input.snapshotWeightKg <= 0) {
    throw new PlanningValidationError("Peso do snapshot deve ser estritamente positivo.");
  }
  if (input.snapshotHeightCm !== undefined && input.snapshotHeightCm !== null && input.snapshotHeightCm <= 0) {
    throw new PlanningValidationError("Altura do snapshot deve ser estritamente positiva.");
  }
  if (input.bmrKcal !== undefined && input.bmrKcal !== null && input.bmrKcal <= 0) {
    throw new PlanningValidationError("TMB deve ser maior que zero.");
  }
  if (input.activityFactor !== undefined && input.activityFactor !== null && input.activityFactor <= 0) {
    throw new PlanningValidationError("Fator de atividade deve ser maior que zero.");
  }
  if (input.tdeeKcal !== undefined && input.tdeeKcal !== null && input.tdeeKcal <= 0) {
    throw new PlanningValidationError("GET/TDEE deve ser maior que zero.");
  }
  if (input.targetCaloriesKcal !== undefined && input.targetCaloriesKcal !== null && input.targetCaloriesKcal <= 0) {
    throw new PlanningValidationError("Meta calórica deve ser maior que zero.");
  }
  if (input.targetProteinG !== undefined && input.targetProteinG !== null && input.targetProteinG < 0) {
    throw new PlanningValidationError("Proteína não pode ser negativa.");
  }
  if (input.targetCarbsG !== undefined && input.targetCarbsG !== null && input.targetCarbsG < 0) {
    throw new PlanningValidationError("Carboidrato não pode ser negativo.");
  }
  if (input.targetFatsG !== undefined && input.targetFatsG !== null && input.targetFatsG < 0) {
    throw new PlanningValidationError("Gordura não pode ser negativa.");
  }

  // 5. Check if row already exists
  const existing = await getPatientPlanningByStudent(consultancyId, studentMembershipId, conn);

  if (!existing) {
    // INSERT
    const publicId = crypto.randomUUID();
    const calculatedAt = input.calculatedAt ? new Date(input.calculatedAt) : null;

    await conn.execute<ResultSetHeader>(
      `INSERT INTO nutrition_v2_patient_planning (
        public_id,
        consultancy_id,
        student_membership_id,
        patient_record_id,
        created_by_membership_id,
        updated_by_membership_id,
        calculated_at,
        snapshot_weight_kg,
        snapshot_height_cm,
        snapshot_age_years,
        snapshot_biological_sex,
        bmr_formula,
        bmr_kcal,
        activity_level,
        activity_factor,
        tdee_kcal,
        goal_type,
        calorie_adjustment_kcal,
        calculated_target_calories_kcal,
        target_calories_kcal,
        target_calories_source,
        target_protein_g,
        target_carbs_g,
        target_fats_g,
        clinical_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        publicId,
        consultancyId,
        studentMembershipId,
        resolvedPatientRecordId,
        authorMembershipId,
        authorMembershipId,
        calculatedAt,
        input.snapshotWeightKg ?? null,
        input.snapshotHeightCm ?? null,
        input.snapshotAgeYears ?? null,
        input.snapshotBiologicalSex ?? null,
        input.bmrFormula ?? null,
        input.bmrKcal ?? null,
        input.activityLevel ?? null,
        input.activityFactor ?? null,
        input.tdeeKcal ?? null,
        input.goalType ?? null,
        input.calorieAdjustmentKcal ?? null,
        input.calculatedTargetCaloriesKcal ?? null,
        input.targetCaloriesKcal ?? null,
        input.targetCaloriesSource ?? null,
        input.targetProteinG ?? null,
        input.targetCarbsG ?? null,
        input.targetFatsG ?? null,
        input.clinicalNotes ?? null,
      ]
    );
  } else {
    // UPDATE (preserve created_by_membership_id, public_id, created_at)
    const calculatedAt = input.calculatedAt !== undefined
      ? (input.calculatedAt ? new Date(input.calculatedAt) : null)
      : (existing.calculatedAt ? new Date(existing.calculatedAt) : null);

    await conn.execute<ResultSetHeader>(
      `UPDATE nutrition_v2_patient_planning
       SET
         patient_record_id = COALESCE(?, patient_record_id),
         updated_by_membership_id = ?,
         calculated_at = ?,
         snapshot_weight_kg = ?,
         snapshot_height_cm = ?,
         snapshot_age_years = ?,
         snapshot_biological_sex = ?,
         bmr_formula = ?,
         bmr_kcal = ?,
         activity_level = ?,
         activity_factor = ?,
         tdee_kcal = ?,
         goal_type = ?,
         calorie_adjustment_kcal = ?,
         calculated_target_calories_kcal = ?,
         target_calories_kcal = ?,
         target_calories_source = ?,
         target_protein_g = ?,
         target_carbs_g = ?,
         target_fats_g = ?,
         clinical_notes = ?,
         updated_at = CURRENT_TIMESTAMP(3)
       WHERE id = ? AND consultancy_id = ? AND student_membership_id = ?;`,
      [
        resolvedPatientRecordId,
        authorMembershipId,
        calculatedAt,
        input.snapshotWeightKg !== undefined ? input.snapshotWeightKg : existing.snapshotWeightKg,
        input.snapshotHeightCm !== undefined ? input.snapshotHeightCm : existing.snapshotHeightCm,
        input.snapshotAgeYears !== undefined ? input.snapshotAgeYears : existing.snapshotAgeYears,
        input.snapshotBiologicalSex !== undefined ? input.snapshotBiologicalSex : existing.snapshotBiologicalSex,
        input.bmrFormula !== undefined ? input.bmrFormula : existing.bmrFormula,
        input.bmrKcal !== undefined ? input.bmrKcal : existing.bmrKcal,
        input.activityLevel !== undefined ? input.activityLevel : existing.activityLevel,
        input.activityFactor !== undefined ? input.activityFactor : existing.activityFactor,
        input.tdeeKcal !== undefined ? input.tdeeKcal : existing.tdeeKcal,
        input.goalType !== undefined ? input.goalType : existing.goalType,
        input.calorieAdjustmentKcal !== undefined ? input.calorieAdjustmentKcal : existing.calorieAdjustmentKcal,
        input.calculatedTargetCaloriesKcal !== undefined ? input.calculatedTargetCaloriesKcal : existing.calculatedTargetCaloriesKcal,
        input.targetCaloriesKcal !== undefined ? input.targetCaloriesKcal : existing.targetCaloriesKcal,
        input.targetCaloriesSource !== undefined ? input.targetCaloriesSource : existing.targetCaloriesSource,
        input.targetProteinG !== undefined ? input.targetProteinG : existing.targetProteinG,
        input.targetCarbsG !== undefined ? input.targetCarbsG : existing.targetCarbsG,
        input.targetFatsG !== undefined ? input.targetFatsG : existing.targetFatsG,
        input.clinicalNotes !== undefined ? input.clinicalNotes : existing.clinicalNotes,
        existing.id,
        consultancyId,
        studentMembershipId,
      ]
    );
  }

  const updated = await getPatientPlanningByStudent(consultancyId, studentMembershipId, conn);
  if (!updated) {
    throw new Error("Erro inesperado ao recuperar planejamento nutricional após salvamento.");
  }

  return updated;
}
