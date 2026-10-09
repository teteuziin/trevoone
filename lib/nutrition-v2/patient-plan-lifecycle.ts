/**
 * TREVO ONE — NUTRITION V2 PATIENT PLAN LIFECYCLE
 *
 * Implements Phase 2: Frictionless Patient Plan Editing & Publication
 * - Patient-driven Draft creation / reuse (One working draft per patient)
 * - Safe shared-plan handling: Fork-on-edit when plan is shared among multiple students
 * - Atomic publication: Validates tree, marks version PUBLISHED, ends previous active assignment,
 *   and activates new assignment for the patient in a single transactional unit.
 * - Strict isolation: Editing Patient A never affects Patient B.
 * - Draft protection: Drafts are never exposed to students or to other patients.
 * - Tenancy and authoring RBAC enforced on every call.
 */

import type { RowDataPacket, ResultSetHeader, PoolConnection } from "mysql2/promise";
import crypto from "node:crypto";
import { getDbConnection } from "../db/mysql";
import {
  type NutritionAccessContext,
  assertCanAuthorNutrition,
  assertCanViewNutrition,
  NutritionAuthorizationError,
} from "./access";
import { getConsultancyLocalDate } from "../consultancies/timezone";
import {
  getPlanVersionTreeByPlanPublicId,
  validatePlanTreeForPublication,
} from "./plan-repository";
import {
  getActiveNutritionPlanForStudentMembership,
  type ActiveNutritionPlanSummary,
} from "./assignment-repository";
import {
  createNotificationInTransaction,
} from "@/services/notification-service";

export interface PatientPlanDraftSummary {
  assignmentPublicId: string;
  planPublicId: string;
  versionPublicId: string;
  versionNumber: number;
  title: string;
  planTitle?: string;
  subtitle?: string | null;
  updatedAt: string;
  totals?: {
    caloriesKcal: number | null;
    proteinG: number | null;
    carbohydrateG: number | null;
    fatG: number | null;
  } | null;
}


export interface PatientPlanStateResult {
  activePlan: ActiveNutritionPlanSummary | null;
  draftPlan: PatientPlanDraftSummary | null;
  isShared: boolean;
  student: {
    membershipId: number;
    membershipPublicId: string;
    studentPublicId: string;
    fullName: string;
  };
}

/**
 * Soft-deletes all existing meals, items, and substitutions for a version.
 */
export async function clearVersionMealsAndItems(
  connection: PoolConnection,
  versionId: number
): Promise<void> {
  const [sourceMeals] = await connection.query<RowDataPacket[]>(
    `SELECT id FROM nutrition_v2_meals WHERE nutrition_plan_version_id = ? AND deleted_at IS NULL`,
    [versionId]
  );
  if (sourceMeals.length > 0) {
    const mealIds = sourceMeals.map((m) => m.id);
    const [sourceItems] = await connection.query<RowDataPacket[]>(
      `SELECT id FROM nutrition_v2_meal_items WHERE meal_id IN (?) AND deleted_at IS NULL`,
      [mealIds]
    );
    if (sourceItems.length > 0) {
      const itemIds = sourceItems.map((i) => i.id);
      await connection.query(
        `UPDATE nutrition_v2_item_substitutions SET deleted_at = UTC_TIMESTAMP(3) WHERE meal_item_id IN (?) AND deleted_at IS NULL`,
        [itemIds]
      );
      await connection.query(
        `UPDATE nutrition_v2_meal_items SET deleted_at = UTC_TIMESTAMP(3) WHERE id IN (?) AND deleted_at IS NULL`,
        [itemIds]
      );
    }
    await connection.query(
      `UPDATE nutrition_v2_meals SET deleted_at = UTC_TIMESTAMP(3) WHERE id IN (?) AND deleted_at IS NULL`,
      [mealIds]
    );
  }
}

/**
 * Deep clones meals, items, and substitutions from a source version to a target version.
 */
export async function deepCloneVersionMealsAndItems(
  connection: PoolConnection,
  sourceVersionId: number,
  targetVersionId: number
): Promise<void> {
  const [sourceMeals] = await connection.query<RowDataPacket[]>(
    `SELECT id, public_id, title, scheduled_time, notes, sort_order
     FROM nutrition_v2_meals
     WHERE nutrition_plan_version_id = ? AND deleted_at IS NULL
     ORDER BY sort_order ASC, id ASC`,
    [sourceVersionId]
  );

  for (const sm of sourceMeals) {
    const newMealPublicId = crypto.randomUUID();
    const [mInsertRes] = await connection.query<ResultSetHeader>(
      `INSERT INTO nutrition_v2_meals (
        public_id, nutrition_plan_version_id, title, scheduled_time, notes, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [newMealPublicId, targetVersionId, sm.title, sm.scheduled_time, sm.notes, sm.sort_order]
    );
    const newMealId = mInsertRes.insertId;

    const [sourceItems] = await connection.query<RowDataPacket[]>(
      `SELECT
        id, public_id, food_id, sort_order,
        food_name_snapshot, category_snapshot,
        prescribed_quantity, prescribed_unit_code, prescribed_unit_label,
        calories_kcal_snapshot, protein_g_snapshot, carbohydrate_g_snapshot, fat_g_snapshot,
        micronutrients_snapshot_json,
        notes
       FROM nutrition_v2_meal_items
       WHERE meal_id = ? AND deleted_at IS NULL
       ORDER BY sort_order ASC, id ASC`,
      [sm.id]
    );

    for (const si of sourceItems) {
      const rawItemMicro = si.micronutrients_snapshot_json;
      const serializedItemMicro = rawItemMicro
        ? typeof rawItemMicro === "object"
          ? JSON.stringify(rawItemMicro)
          : String(rawItemMicro)
        : null;

      const newItemPublicId = crypto.randomUUID();
      const [iInsertRes] = await connection.query<ResultSetHeader>(
        `INSERT INTO nutrition_v2_meal_items (
          public_id, meal_id, food_id, sort_order,
          food_name_snapshot, category_snapshot,
          prescribed_quantity, prescribed_unit_code, prescribed_unit_label,
          calories_kcal_snapshot, protein_g_snapshot, carbohydrate_g_snapshot, fat_g_snapshot,
          micronutrients_snapshot_json, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newItemPublicId,
          newMealId,
          si.food_id,
          si.sort_order,
          si.food_name_snapshot,
          si.category_snapshot,
          si.prescribed_quantity,
          si.prescribed_unit_code,
          si.prescribed_unit_label,
          si.calories_kcal_snapshot,
          si.protein_g_snapshot,
          si.carbohydrate_g_snapshot,
          si.fat_g_snapshot,
          serializedItemMicro,
          si.notes,
        ]
      );
      const newItemId = iInsertRes.insertId;

      let sourceSubs: RowDataPacket[] = [];
      try {
        const [subsWithEq] = await connection.query<RowDataPacket[]>(
          `SELECT
            id, public_id, food_id, sort_order,
            food_name_snapshot, prescribed_quantity, prescribed_unit_code, prescribed_unit_label,
            calories_kcal_snapshot, protein_g_snapshot, carbohydrate_g_snapshot, fat_g_snapshot,
            micronutrients_snapshot_json, notes,
            equivalence_criterion, is_stale, stale_reason,
            base_food_id_snapshot, base_quantity_snapshot, base_unit_code_snapshot,
            equivalence_target_value_snapshot
           FROM nutrition_v2_item_substitutions
           WHERE meal_item_id = ? AND deleted_at IS NULL
           ORDER BY sort_order ASC, id ASC`,
          [si.id]
        );
        sourceSubs = subsWithEq;
      } catch {
        const [subsLegacy] = await connection.query<RowDataPacket[]>(
          `SELECT
            id, public_id, food_id, sort_order,
            food_name_snapshot, prescribed_quantity, prescribed_unit_code, prescribed_unit_label,
            calories_kcal_snapshot, protein_g_snapshot, carbohydrate_g_snapshot, fat_g_snapshot,
            micronutrients_snapshot_json, notes
           FROM nutrition_v2_item_substitutions
           WHERE meal_item_id = ? AND deleted_at IS NULL
           ORDER BY sort_order ASC, id ASC`,
          [si.id]
        );
        sourceSubs = subsLegacy;
      }

      for (const ss of sourceSubs) {
        const rawSubMicro = ss.micronutrients_snapshot_json;
        const serializedSubMicro = rawSubMicro
          ? typeof rawSubMicro === "object"
            ? JSON.stringify(rawSubMicro)
            : String(rawSubMicro)
          : null;

        const newSubPublicId = crypto.randomUUID();
        try {
          await connection.query(
            `INSERT INTO nutrition_v2_item_substitutions (
              public_id, meal_item_id, food_id, sort_order,
              food_name_snapshot, prescribed_quantity, prescribed_unit_code, prescribed_unit_label,
              calories_kcal_snapshot, protein_g_snapshot, carbohydrate_g_snapshot, fat_g_snapshot,
              micronutrients_snapshot_json, notes,
              equivalence_criterion, is_stale, stale_reason,
              base_food_id_snapshot, base_quantity_snapshot, base_unit_code_snapshot,
              equivalence_target_value_snapshot
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              newSubPublicId,
              newItemId,
              ss.food_id,
              ss.sort_order,
              ss.food_name_snapshot,
              ss.prescribed_quantity,
              ss.prescribed_unit_code,
              ss.prescribed_unit_label,
              ss.calories_kcal_snapshot,
              ss.protein_g_snapshot,
              ss.carbohydrate_g_snapshot,
              ss.fat_g_snapshot,
              serializedSubMicro,
              ss.notes,
              ss.equivalence_criterion ?? null,
              ss.is_stale ?? null,
              ss.stale_reason ?? null,
              ss.base_food_id_snapshot ?? null,
              ss.base_quantity_snapshot ?? null,
              ss.base_unit_code_snapshot ?? null,
              ss.equivalence_target_value_snapshot ?? null,
            ]
          );
        } catch {
          await connection.query(
            `INSERT INTO nutrition_v2_item_substitutions (
              public_id, meal_item_id, food_id, sort_order,
              food_name_snapshot, prescribed_quantity, prescribed_unit_code, prescribed_unit_label,
              calories_kcal_snapshot, protein_g_snapshot, carbohydrate_g_snapshot, fat_g_snapshot,
              micronutrients_snapshot_json, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              newSubPublicId,
              newItemId,
              ss.food_id,
              ss.sort_order,
              ss.food_name_snapshot,
              ss.prescribed_quantity,
              ss.prescribed_unit_code,
              ss.prescribed_unit_label,
              ss.calories_kcal_snapshot,
              ss.protein_g_snapshot,
              ss.carbohydrate_g_snapshot,
              ss.fat_g_snapshot,
              serializedSubMicro,
              ss.notes,
            ]
          );
        }
      }
    }
  }
}

/**
 * Resolves full patient plan state (active published plan + any in-progress draft).
 */
export async function getPatientPlanState(
  ctx: NutritionAccessContext,
  studentMembershipPublicId: string
): Promise<PatientPlanStateResult> {
  assertCanViewNutrition(ctx);

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();

    // 1. Resolve student member and verify tenancy
    const [memberRows] = await connection.query<RowDataPacket[]>(
      `SELECT cm.id, cm.consultancy_id, cm.public_id, cm.user_id, u.public_id AS user_public_id, u.full_name
       FROM consultancy_members cm
       INNER JOIN users u ON u.id = cm.user_id
       WHERE (cm.public_id = ? OR u.public_id = ?)
         AND cm.consultancy_id = ?
         AND cm.status = 'ACTIVE'
       LIMIT 1`,
      [studentMembershipPublicId, studentMembershipPublicId, ctx.consultancyId!]
    );

    if (!memberRows || memberRows.length === 0) {
      throw new NutritionAuthorizationError("Aluno não encontrado nesta consultoria.", "STUDENT_NOT_FOUND", 404);
    }

    const studentRow = memberRows[0];
    const studentMembershipId = Number(studentRow.id);
    const resolvedMembershipPublicId = String(studentRow.public_id);
    const resolvedUserPublicId = String(studentRow.user_public_id);
    const fullName = String(studentRow.full_name);

    // 2. Resolve active published plan summary
    const activePlan = await getActiveNutritionPlanForStudentMembership(
      ctx.consultancyId!,
      studentMembershipId
    );

    // 3. Resolve pending draft assignment if any
    const [draftRows] = await connection.query<RowDataPacket[]>(
      `SELECT
        a.id AS assignment_id,
        a.public_id AS assignment_public_id,
        p.public_id AS plan_public_id,
        v.id AS version_id,
        v.public_id AS version_public_id,
        v.version_number,
        v.title AS version_title,
        v.subtitle AS version_subtitle,
        v.updated_at
       FROM nutrition_v2_assignments a
       INNER JOIN nutrition_v2_plan_versions v ON v.id = a.nutrition_plan_version_id
       INNER JOIN nutrition_v2_plans p ON p.id = v.nutrition_plan_id
       WHERE a.consultancy_id = ?
         AND a.student_membership_id = ?
         AND a.status = 'DRAFT'
         AND a.deleted_at IS NULL
         AND v.status = 'DRAFT'
         AND v.deleted_at IS NULL
         AND p.deleted_at IS NULL
       ORDER BY a.id DESC
       LIMIT 1`,
      [ctx.consultancyId!, studentMembershipId]
    );

    let draftPlan: PatientPlanDraftSummary | null = null;
    let isShared = false;
    let draftVersionId: number | null = null;

    if (draftRows && draftRows.length > 0) {
      const d = draftRows[0];
      draftVersionId = Number(d.version_id);
      draftPlan = {
        assignmentPublicId: String(d.assignment_public_id),
        planPublicId: String(d.plan_public_id),
        versionPublicId: String(d.version_public_id),
        versionNumber: Number(d.version_number),
        title: String(d.version_title),
        subtitle: d.version_subtitle ? String(d.version_subtitle) : null,
        updatedAt: new Date(d.updated_at).toISOString(),
      };
    } else if (activePlan) {
      // If no draft assignment exists yet, check if the active plan root already has a DRAFT version
      // AND check if the plan is dedicated or shared
      const [otherStudents] = await connection.query<RowDataPacket[]>(
        `SELECT COUNT(DISTINCT a.student_membership_id) AS other_count
         FROM nutrition_v2_assignments a
         INNER JOIN nutrition_v2_plan_versions v ON v.id = a.nutrition_plan_version_id
         INNER JOIN nutrition_v2_plans p ON p.id = v.nutrition_plan_id
         WHERE p.public_id = ?
           AND a.student_membership_id != ?
           AND a.status = 'ACTIVE'
           AND a.deleted_at IS NULL`,
        [activePlan.planPublicId, studentMembershipId]
      );
      const otherCount = Number(otherStudents[0]?.other_count || 0);
      isShared = otherCount > 0;

      if (!isShared) {
        // Dedicated plan: check if a DRAFT exists directly under this root
        const [planDrafts] = await connection.query<RowDataPacket[]>(
          `SELECT v.id, v.public_id, v.version_number, v.title, v.subtitle, v.updated_at, p.public_id AS plan_public_id
           FROM nutrition_v2_plan_versions v
           INNER JOIN nutrition_v2_plans p ON p.id = v.nutrition_plan_id
           WHERE p.public_id = ?
             AND v.status = 'DRAFT'
             AND v.deleted_at IS NULL
             AND p.deleted_at IS NULL
           ORDER BY v.id DESC
           LIMIT 1`,
          [activePlan.planPublicId]
        );

        if (planDrafts && planDrafts.length > 0) {
          const pd = planDrafts[0];
          draftVersionId = Number(pd.id);
          draftPlan = {
            assignmentPublicId: "",
            planPublicId: String(pd.plan_public_id),
            versionPublicId: String(pd.public_id),
            versionNumber: Number(pd.version_number),
            title: String(pd.title),
            subtitle: pd.subtitle ? String(pd.subtitle) : null,
            updatedAt: new Date(pd.updated_at).toISOString(),
          };
        }
      }
    }

    if (draftPlan && draftVersionId) {
      const [draftItemTotals] = await connection.query<RowDataPacket[]>(
        `SELECT
           SUM(mi.calories_kcal_snapshot) AS total_calories,
           SUM(mi.protein_g_snapshot) AS total_protein,
           SUM(mi.carbohydrate_g_snapshot) AS total_carbs,
           SUM(mi.fat_g_snapshot) AS total_fats
         FROM nutrition_v2_meals m
         INNER JOIN nutrition_v2_meal_items mi ON mi.meal_id = m.id AND mi.deleted_at IS NULL
         WHERE m.nutrition_plan_version_id = ? AND m.deleted_at IS NULL`,
        [draftVersionId]
      );
      if (draftItemTotals && draftItemTotals.length > 0 && draftItemTotals[0].total_calories !== null) {
        draftPlan.totals = {
          caloriesKcal: Number(draftItemTotals[0].total_calories) || 0,
          proteinG: Number(draftItemTotals[0].total_protein) || 0,
          carbohydrateG: Number(draftItemTotals[0].total_carbs) || 0,
          fatG: Number(draftItemTotals[0].total_fats) || 0,
        };
      } else {
        draftPlan.totals = {
          caloriesKcal: 0,
          proteinG: 0,
          carbohydrateG: 0,
          fatG: 0,
        };
      }
    }


    if (activePlan && !isShared) {
      const [otherCheck] = await connection.query<RowDataPacket[]>(
        `SELECT COUNT(DISTINCT a.student_membership_id) AS other_count
         FROM nutrition_v2_assignments a
         INNER JOIN nutrition_v2_plan_versions v ON v.id = a.nutrition_plan_version_id
         INNER JOIN nutrition_v2_plans p ON p.id = v.nutrition_plan_id
         WHERE p.public_id = ?
           AND a.student_membership_id != ?
           AND a.status = 'ACTIVE'
           AND a.deleted_at IS NULL`,
        [activePlan.planPublicId, studentMembershipId]
      );
      isShared = Number(otherCheck[0]?.other_count || 0) > 0;
    }

    return {
      activePlan,
      draftPlan,
      isShared,
      student: {
        membershipId: studentMembershipId,
        membershipPublicId: resolvedMembershipPublicId,
        studentPublicId: resolvedUserPublicId,
        fullName,
      },
    };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Starts or reuses a working draft for a patient:
 * - If a working draft already exists for this patient, returns it (NO duplicate drafts).
 * - If the active plan is shared among multiple students, forks the plan safely into a dedicated draft.
 * - If the active plan is dedicated, creates or reuses the next draft on the existing root.
 */
export async function startPatientPlanEdit(
  ctx: NutritionAccessContext,
  studentMembershipPublicId: string
): Promise<{
  planPublicId: string;
  versionPublicId: string;
  versionNumber: number;
  isExistingDraft: boolean;
  studentMembershipPublicId: string;
  studentPublicId: string;
  studentName: string;
}> {
  assertCanAuthorNutrition(ctx);

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 1. Lock student member and check eligibility
    const [memberRows] = await connection.query<RowDataPacket[]>(
      `SELECT cm.id, cm.consultancy_id, cm.public_id, cm.user_id, u.public_id AS user_public_id, u.full_name
       FROM consultancy_members cm
       INNER JOIN users u ON u.id = cm.user_id
       WHERE (cm.public_id = ? OR u.public_id = ?)
         AND cm.status = 'ACTIVE'
       FOR UPDATE`,
      [studentMembershipPublicId, studentMembershipPublicId]
    );

    if (!memberRows || memberRows.length === 0) {
      throw new NutritionAuthorizationError("Aluno não encontrado.", "STUDENT_NOT_FOUND", 404);
    }
    const student = memberRows[0];
    if (Number(student.consultancy_id) !== ctx.consultancyId!) {
      throw new NutritionAuthorizationError("Acesso negado ao aluno desta consultoria.", "FORBIDDEN_TENANT_STUDENT", 403);
    }

    const studentMembershipId = Number(student.id);
    const resolvedMembershipPublicId = String(student.public_id);
    const resolvedUserPublicId = String(student.user_public_id);
    const studentName = String(student.full_name);

    // 2. Check for an existing DRAFT assignment for this student
    const [existingDraftAssignments] = await connection.query<RowDataPacket[]>(
      `SELECT
        a.id AS assignment_id,
        p.public_id AS plan_public_id,
        v.public_id AS version_public_id,
        v.version_number
       FROM nutrition_v2_assignments a
       INNER JOIN nutrition_v2_plan_versions v ON v.id = a.nutrition_plan_version_id
       INNER JOIN nutrition_v2_plans p ON p.id = v.nutrition_plan_id
       WHERE a.consultancy_id = ?
         AND a.student_membership_id = ?
         AND a.status = 'DRAFT'
         AND a.deleted_at IS NULL
         AND v.status = 'DRAFT'
         AND v.deleted_at IS NULL
         AND p.deleted_at IS NULL
       ORDER BY a.id DESC
       LIMIT 1 FOR UPDATE`,
      [ctx.consultancyId!, studentMembershipId]
    );

    if (existingDraftAssignments.length > 0) {
      const ed = existingDraftAssignments[0];
      await connection.commit();
      return {
        planPublicId: String(ed.plan_public_id),
        versionPublicId: String(ed.version_public_id),
        versionNumber: Number(ed.version_number),
        isExistingDraft: true,
        studentMembershipPublicId: resolvedMembershipPublicId,
        studentPublicId: resolvedUserPublicId,
        studentName,
      };
    }

    // 3. Find current active assignment for this student
    const [activeRows] = await connection.query<RowDataPacket[]>(
      `SELECT
        a.id AS assignment_id,
        a.nutrition_plan_version_id,
        a.notes_for_student,
        v.id AS version_id,
        v.version_number,
        v.title AS version_title,
        v.subtitle AS version_subtitle,
        v.objective AS version_objective,
        v.general_guidance AS version_guidance,
        v.notes AS version_notes,
        p.id AS plan_id,
        p.public_id AS plan_public_id,
        p.is_template
       FROM nutrition_v2_assignments a
       INNER JOIN nutrition_v2_plan_versions v ON v.id = a.nutrition_plan_version_id
       INNER JOIN nutrition_v2_plans p ON p.id = v.nutrition_plan_id
       WHERE a.consultancy_id = ?
         AND a.student_membership_id = ?
         AND a.status = 'ACTIVE'
         AND a.deleted_at IS NULL
       LIMIT 1 FOR UPDATE`,
      [ctx.consultancyId!, studentMembershipId]
    );

    if (activeRows.length === 0) {
      throw new NutritionAuthorizationError(
        "A paciente não possui plano alimentar ativo para editar. Prescreva um primeiro plano.",
        "NO_ACTIVE_PLAN_TO_EDIT",
        400
      );
    }

    const source = activeRows[0];

    // 4. Check if plan is shared with OTHER students
    const [otherStudents] = await connection.query<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT a.student_membership_id) AS other_count
       FROM nutrition_v2_assignments a
       INNER JOIN nutrition_v2_plan_versions v ON v.id = a.nutrition_plan_version_id
       WHERE v.nutrition_plan_id = ?
         AND a.student_membership_id != ?
         AND a.status = 'ACTIVE'
         AND a.deleted_at IS NULL`,
      [source.plan_id, studentMembershipId]
    );
    const isSharedPlan = Boolean(source.is_template) || Number(otherStudents[0]?.other_count || 0) > 0;

    let targetPlanPublicId = "";
    let targetVersionPublicId = "";
    let targetVersionNumber = 1;
    let targetVersionId = 0;
    let isExisting = false;

    if (isSharedPlan) {
      // FORK STRATEGY: Create a dedicated plan root for this student
      const forkedPlanPublicId = crypto.randomUUID();
      const [pRes] = await connection.query<ResultSetHeader>(
        `INSERT INTO nutrition_v2_plans (
          public_id, consultancy_id, created_by_membership_id, is_template, status
        ) VALUES (?, ?, ?, 0, 'ACTIVE')`,
        [forkedPlanPublicId, ctx.consultancyId!, ctx.membershipId!]
      );
      const forkedPlanId = pRes.insertId;

      const forkedVersionPublicId = crypto.randomUUID();
      const [vRes] = await connection.query<ResultSetHeader>(
        `INSERT INTO nutrition_v2_plan_versions (
          public_id, nutrition_plan_id, version_number, status,
          title, subtitle, objective, general_guidance, notes,
          created_by_membership_id
        ) VALUES (?, ?, 1, 'DRAFT', ?, ?, ?, ?, ?, ?)`,
        [
          forkedVersionPublicId,
          forkedPlanId,
          source.version_title,
          source.version_subtitle,
          source.version_objective,
          source.version_guidance,
          source.version_notes,
          ctx.membershipId!,
        ]
      );
      targetVersionId = vRes.insertId;
      targetPlanPublicId = forkedPlanPublicId;
      targetVersionPublicId = forkedVersionPublicId;
      targetVersionNumber = 1;
      isExisting = false;

      // Deep clone meals, items, substitutions from source version
      await deepCloneVersionMealsAndItems(connection, Number(source.version_id), targetVersionId);
    } else {
      // DEDICATED STRATEGY: Reuse or create next version on existing plan root
      const [existingDrafts] = await connection.query<RowDataPacket[]>(
        `SELECT id, public_id, version_number FROM nutrition_v2_plan_versions
         WHERE nutrition_plan_id = ? AND status = 'DRAFT' AND deleted_at IS NULL FOR UPDATE`,
        [source.plan_id]
      );

      if (existingDrafts.length > 0) {
        targetPlanPublicId = String(source.plan_public_id);
        targetVersionPublicId = String(existingDrafts[0].public_id);
        targetVersionNumber = Number(existingDrafts[0].version_number);
        targetVersionId = Number(existingDrafts[0].id);
        isExisting = true;
      } else {
        const [maxRows] = await connection.query<RowDataPacket[]>(
          `SELECT COALESCE(MAX(version_number), 0) AS max_v
           FROM nutrition_v2_plan_versions
           WHERE nutrition_plan_id = ?`,
          [source.plan_id]
        );
        const nextVersionNumber = Number(maxRows[0].max_v) + 1;
        const newVersionPublicId = crypto.randomUUID();

        const [vRes] = await connection.query<ResultSetHeader>(
          `INSERT INTO nutrition_v2_plan_versions (
            public_id, nutrition_plan_id, version_number, status,
            title, subtitle, objective, general_guidance, notes,
            created_by_membership_id
          ) VALUES (?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?, ?)`,
          [
            newVersionPublicId,
            source.plan_id,
            nextVersionNumber,
            source.version_title,
            source.version_subtitle,
            source.version_objective,
            source.version_guidance,
            source.version_notes,
            ctx.membershipId!,
          ]
        );
        targetVersionId = vRes.insertId;
        targetPlanPublicId = String(source.plan_public_id);
        targetVersionPublicId = newVersionPublicId;
        targetVersionNumber = nextVersionNumber;
        isExisting = false;

        // Deep clone meals, items, substitutions from source version
        await deepCloneVersionMealsAndItems(connection, Number(source.version_id), targetVersionId);
      }
    }

    // 5. Track the working draft via a DRAFT assignment row for this student
    const draftAssignmentPublicId = crypto.randomUUID();
    await connection.query(
      `INSERT INTO nutrition_v2_assignments (
        public_id, consultancy_id, student_membership_id, nutrition_plan_version_id,
        assigned_by_membership_id, starts_on, ends_on, status, notes_for_student
      ) VALUES (?, ?, ?, ?, ?, CURRENT_DATE, NULL, 'DRAFT', ?)`,
      [
        draftAssignmentPublicId,
        ctx.consultancyId!,
        studentMembershipId,
        targetVersionId,
        ctx.membershipId!,
        source.notes_for_student || null,
      ]
    );

    await connection.commit();

    return {
      planPublicId: targetPlanPublicId,
      versionPublicId: targetVersionPublicId,
      versionNumber: targetVersionNumber,
      isExistingDraft: isExisting,
      studentMembershipPublicId: resolvedMembershipPublicId,
      studentPublicId: resolvedUserPublicId,
      studentName,
    };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    throw err;
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Atomically publishes the patient's draft update and updates the active prescription.
 */
export async function publishPatientPlanUpdate(
  ctx: NutritionAccessContext,
  params: {
    planPublicId: string;
    versionPublicId: string;
    studentMembershipPublicId: string;
  }
): Promise<{
  success: boolean;
  planPublicId: string;
  versionPublicId: string;
  assignmentPublicId: string;
  archivedAssignmentId: number | null;
  studentMembershipPublicId: string;
  publishedAt: string;
}> {
  assertCanAuthorNutrition(ctx);

  const { planPublicId, versionPublicId, studentMembershipPublicId } = params;

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 1. Resolve timezone for canonical effective date
    const [consultancyRows] = await connection.query<RowDataPacket[]>(
      `SELECT timezone FROM consultancies WHERE id = ? FOR UPDATE`,
      [ctx.consultancyId!]
    );
    const tz = consultancyRows[0]?.timezone || "America/Sao_Paulo";
    const effectiveDate = getConsultancyLocalDate(tz);

    // 2. Lock student membership
    const [memberRows] = await connection.query<RowDataPacket[]>(
      `SELECT cm.id, cm.consultancy_id, cm.status, cm.user_id, u.full_name
       FROM consultancy_members cm
       INNER JOIN users u ON u.id = cm.user_id
       WHERE (cm.public_id = ? OR u.public_id = ?)
         AND cm.status = 'ACTIVE'
       FOR UPDATE`,
      [studentMembershipPublicId, studentMembershipPublicId]
    );

    if (!memberRows || memberRows.length === 0) {
      throw new NutritionAuthorizationError("Aluno não encontrado.", "STUDENT_NOT_FOUND", 404);
    }
    const student = memberRows[0];
    if (Number(student.consultancy_id) !== ctx.consultancyId!) {
      throw new NutritionAuthorizationError("Acesso negado ao aluno desta consultoria.", "FORBIDDEN_TENANT_STUDENT", 403);
    }
    if (student.status !== "ACTIVE") {
      throw new NutritionAuthorizationError("Matrícula do aluno não está ativa.", "STUDENT_NOT_ACTIVE", 400);
    }
    const studentMembershipId = Number(student.id);

    // 3. Lock plan root
    const [plans] = await connection.query<RowDataPacket[]>(
      `SELECT id, public_id, consultancy_id, status
       FROM nutrition_v2_plans
       WHERE public_id = ? AND deleted_at IS NULL FOR UPDATE`,
      [planPublicId]
    );
    if (!plans || plans.length === 0) {
      throw new NutritionAuthorizationError("Plano não encontrado.", "PLAN_NOT_FOUND", 404);
    }
    const plan = plans[0];
    if (Number(plan.consultancy_id) !== ctx.consultancyId!) {
      throw new NutritionAuthorizationError("Acesso negado a este plano da consultoria.", "FORBIDDEN_TENANT_PLAN", 403);
    }

    // 4. Lock target version
    const [versionRows] = await connection.query<RowDataPacket[]>(
      `SELECT id, public_id, nutrition_plan_id, version_number, status, title
       FROM nutrition_v2_plan_versions
       WHERE public_id = ? AND nutrition_plan_id = ? AND deleted_at IS NULL FOR UPDATE`,
      [versionPublicId, plan.id]
    );
    if (!versionRows || versionRows.length === 0) {
      throw new NutritionAuthorizationError("Versão do plano não encontrada.", "VERSION_NOT_FOUND", 404);
    }
    const targetVersion = versionRows[0];
    if (targetVersion.status !== "DRAFT" && targetVersion.status !== "PUBLISHED") {
      throw new NutritionAuthorizationError("Apenas versões em rascunho podem ser publicadas.", "CANNOT_PUBLISH_VERSION", 400);
    }

    // 5. Validate persisted tree for publication
    const tree = await getPlanVersionTreeByPlanPublicId(ctx, planPublicId, versionPublicId);
    if (!tree) {
      throw new NutritionAuthorizationError("Erro ao carregar estrutura do plano.", "TREE_LOAD_FAILED", 500);
    }
    const validation = validatePlanTreeForPublication(tree);
    if (!validation.valid) {
      throw new NutritionAuthorizationError(
        validation.errors[0] || "Plano incompleto para publicação.",
        validation.pendingItems && validation.pendingItems.length > 0
          ? "PLAN_NUTRITION_INCOMPLETE"
          : "PUBLICATION_VALIDATION_FAILED",
        400,
        validation.pendingItems
      );
    }

    // 6. Transition target version to PUBLISHED (archive previous published versions under this root)
    if (targetVersion.status === "DRAFT") {
      const [pubRows] = await connection.query<RowDataPacket[]>(
        `SELECT id FROM nutrition_v2_plan_versions
         WHERE nutrition_plan_id = ? AND status = 'PUBLISHED' AND deleted_at IS NULL FOR UPDATE`,
        [plan.id]
      );
      for (const pr of pubRows) {
        await connection.query(
          `UPDATE nutrition_v2_plan_versions SET status = 'ARCHIVED', updated_at = UTC_TIMESTAMP(3) WHERE id = ?`,
          [pr.id]
        );
      }

      await connection.query(
        `UPDATE nutrition_v2_plan_versions
         SET status = 'PUBLISHED', published_at = UTC_TIMESTAMP(3), updated_at = UTC_TIMESTAMP(3)
         WHERE id = ?`,
        [targetVersion.id]
      );
      await connection.query(
        `UPDATE nutrition_v2_plans SET updated_at = UTC_TIMESTAMP(3) WHERE id = ?`,
        [plan.id]
      );
    }

    // 7. Find and end previous active assignment for THIS student ONLY
    const [previousActiveRows] = await connection.query<RowDataPacket[]>(
      `SELECT id FROM nutrition_v2_assignments
       WHERE consultancy_id = ?
         AND student_membership_id = ?
         AND status = 'ACTIVE'
         AND deleted_at IS NULL
       LIMIT 1 FOR UPDATE`,
      [ctx.consultancyId!, studentMembershipId]
    );
    const previousActiveAssignmentId = previousActiveRows.length > 0 ? Number(previousActiveRows[0].id) : null;

    await connection.query(
      `UPDATE nutrition_v2_assignments
       SET status = 'ENDED', ends_on = ?, updated_at = UTC_TIMESTAMP(3)
       WHERE consultancy_id = ?
         AND student_membership_id = ?
         AND status = 'ACTIVE'
         AND deleted_at IS NULL`,
      [effectiveDate, ctx.consultancyId!, studentMembershipId]
    );

    // 8. Transition DRAFT assignment to ACTIVE (or create new ACTIVE assignment)
    const [matchedDraftAssignments] = await connection.query<RowDataPacket[]>(
      `SELECT id, public_id FROM nutrition_v2_assignments
       WHERE consultancy_id = ?
         AND student_membership_id = ?
         AND nutrition_plan_version_id = ?
         AND status = 'DRAFT'
         AND deleted_at IS NULL
       LIMIT 1 FOR UPDATE`,
      [ctx.consultancyId!, studentMembershipId, targetVersion.id]
    );

    let activeAssignmentPublicId = "";

    if (matchedDraftAssignments.length > 0) {
      const da = matchedDraftAssignments[0];
      await connection.query(
        `UPDATE nutrition_v2_assignments
         SET status = 'ACTIVE', starts_on = ?, ends_on = NULL, updated_at = UTC_TIMESTAMP(3)
         WHERE id = ?`,
        [effectiveDate, da.id]
      );
      activeAssignmentPublicId = String(da.public_id);
    } else {
      activeAssignmentPublicId = crypto.randomUUID();
      await connection.query(
        `INSERT INTO nutrition_v2_assignments (
          public_id, consultancy_id, student_membership_id, nutrition_plan_version_id,
          assigned_by_membership_id, starts_on, ends_on, status, notes_for_student
        ) VALUES (?, ?, ?, ?, ?, ?, NULL, 'ACTIVE', NULL)`,
        [
          activeAssignmentPublicId,
          ctx.consultancyId!,
          studentMembershipId,
          targetVersion.id,
          ctx.membershipId!,
          effectiveDate,
        ]
      );
    }

    // 9. Clean up any remaining draft assignments for this student
    await connection.query(
      `UPDATE nutrition_v2_assignments
       SET deleted_at = UTC_TIMESTAMP(3)
       WHERE consultancy_id = ?
         AND student_membership_id = ?
         AND status = 'DRAFT'
         AND deleted_at IS NULL`,
      [ctx.consultancyId!, studentMembershipId]
    );

    // 10. Queue in-app notification to student
    try {
      await createNotificationInTransaction(connection, {
        userId: Number(student.user_id),
        consultancyId: Number(ctx.consultancyId!),
        title: "Novo plano alimentar atualizado!",
        body: `Seu plano alimentar (${targetVersion.title}) foi atualizado pela consultoria.`,
        eventType: "NUTRITION_ASSIGNMENT_UPDATED",
        priority: "NORMAL",
        deepLink: `/app`,
        dedupeKey: `nutrition_updated:${planPublicId}:${versionPublicId}:${student.user_id}`,
      });
    } catch {
      // Non-blocking notification
    }

    await connection.commit();

    return {
      success: true,
      planPublicId: String(plan.public_id),
      versionPublicId: String(targetVersion.public_id),
      assignmentPublicId: activeAssignmentPublicId,
      archivedAssignmentId: previousActiveAssignmentId,
      studentMembershipPublicId,
      publishedAt: new Date().toISOString(),
    };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    throw err;
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Discards in-progress draft for a patient:
 * - If the plan was a forked root (only has version 1 in draft), soft-deletes the plan and version.
 * - If dedicated, soft-deletes the draft version.
 * - Soft-deletes the draft assignment.
 */
export async function discardPatientPlanDraft(
  ctx: NutritionAccessContext,
  studentMembershipPublicId: string
): Promise<{ success: boolean }> {
  assertCanAuthorNutrition(ctx);

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [memberRows] = await connection.query<RowDataPacket[]>(
      `SELECT cm.id, cm.consultancy_id
       FROM consultancy_members cm
       INNER JOIN users u ON u.id = cm.user_id
       WHERE (cm.public_id = ? OR u.public_id = ?)
         AND cm.status = 'ACTIVE'
       FOR UPDATE`,
      [studentMembershipPublicId, studentMembershipPublicId]
    );

    if (!memberRows || memberRows.length === 0) {
      throw new NutritionAuthorizationError("Aluno não encontrado.", "STUDENT_NOT_FOUND", 404);
    }
    const studentMembershipId = Number(memberRows[0].id);

    const [draftRows] = await connection.query<RowDataPacket[]>(
      `SELECT
        a.id AS assignment_id,
        a.nutrition_plan_version_id,
        v.id AS version_id,
        v.version_number,
        p.id AS plan_id
       FROM nutrition_v2_assignments a
       INNER JOIN nutrition_v2_plan_versions v ON v.id = a.nutrition_plan_version_id
       INNER JOIN nutrition_v2_plans p ON p.id = v.nutrition_plan_id
       WHERE a.consultancy_id = ?
         AND a.student_membership_id = ?
         AND a.status = 'DRAFT'
         AND a.deleted_at IS NULL
       FOR UPDATE`,
      [ctx.consultancyId!, studentMembershipId]
    );

    for (const d of draftRows) {
      // Check if plan has ANY published version
      const [pubCheck] = await connection.query<RowDataPacket[]>(
        `SELECT COUNT(*) AS pub_count FROM nutrition_v2_plan_versions
         WHERE nutrition_plan_id = ? AND status = 'PUBLISHED' AND deleted_at IS NULL`,
        [d.plan_id]
      );
      const pubCount = Number(pubCheck[0]?.pub_count || 0);

      if (pubCount === 0) {
        // Pure fork: delete whole plan and versions
        await connection.query(
          `UPDATE nutrition_v2_plans SET deleted_at = UTC_TIMESTAMP(3) WHERE id = ?`,
          [d.plan_id]
        );
        await connection.query(
          `UPDATE nutrition_v2_plan_versions SET deleted_at = UTC_TIMESTAMP(3) WHERE nutrition_plan_id = ?`,
          [d.plan_id]
        );
      } else {
        // Dedicated plan: delete draft version only
        await connection.query(
          `UPDATE nutrition_v2_plan_versions SET deleted_at = UTC_TIMESTAMP(3) WHERE id = ?`,
          [d.version_id]
        );
      }

      await connection.query(
        `UPDATE nutrition_v2_assignments SET deleted_at = UTC_TIMESTAMP(3) WHERE id = ?`,
        [d.assignment_id]
      );
    }

    await connection.commit();
    return { success: true };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    throw err;
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Creates a dedicated individual nutrition plan for a patient directly from scratch:
 * - Title is auto-assigned as "Plano Alimentar - <Nome do Aluno>" (no redundant intermediate form).
 * - Reuses an existing draft assignment if one is already open for this student.
 * - Otherwise, creates plan root, draft version (V1), and draft assignment in a single transaction.
 * - Caller redirects straight to the Builder.
 */
export async function createPatientPlanFromScratch(
  ctx: NutritionAccessContext,
  studentMembershipPublicId: string
): Promise<{
  planPublicId: string;
  versionPublicId: string;
  versionNumber: number;
  isExistingDraft: boolean;
  studentMembershipPublicId: string;
  studentPublicId: string;
  studentName: string;
}> {
  assertCanAuthorNutrition(ctx);

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 1. Lock student member and check eligibility
    const [memberRows] = await connection.query<RowDataPacket[]>(
      `SELECT cm.id, cm.consultancy_id, cm.public_id, cm.user_id, u.public_id AS user_public_id, u.full_name
       FROM consultancy_members cm
       INNER JOIN users u ON u.id = cm.user_id
       WHERE (cm.public_id = ? OR u.public_id = ?)
         AND cm.status = 'ACTIVE'
       FOR UPDATE`,
      [studentMembershipPublicId, studentMembershipPublicId]
    );

    if (!memberRows || memberRows.length === 0) {
      throw new NutritionAuthorizationError("Aluno não encontrado.", "STUDENT_NOT_FOUND", 404);
    }
    const student = memberRows[0];
    if (Number(student.consultancy_id) !== ctx.consultancyId!) {
      throw new NutritionAuthorizationError("Acesso negado ao aluno desta consultoria.", "FORBIDDEN_TENANT_STUDENT", 403);
    }

    const studentMembershipId = Number(student.id);
    const resolvedMembershipPublicId = String(student.public_id);
    const resolvedUserPublicId = String(student.user_public_id);
    const studentName = String(student.full_name);

    // 2. Check for an existing DRAFT assignment for this student
    const [existingDraftAssignments] = await connection.query<RowDataPacket[]>(
      `SELECT
        a.id AS assignment_id,
        p.public_id AS plan_public_id,
        v.public_id AS version_public_id,
        v.version_number
       FROM nutrition_v2_assignments a
       INNER JOIN nutrition_v2_plan_versions v ON v.id = a.nutrition_plan_version_id
       INNER JOIN nutrition_v2_plans p ON p.id = v.nutrition_plan_id
       WHERE a.consultancy_id = ?
         AND a.student_membership_id = ?
         AND a.status = 'DRAFT'
         AND a.deleted_at IS NULL
         AND v.status = 'DRAFT'
         AND v.deleted_at IS NULL
         AND p.deleted_at IS NULL
       ORDER BY a.id DESC
       LIMIT 1 FOR UPDATE`,
      [ctx.consultancyId!, studentMembershipId]
    );

    if (existingDraftAssignments.length > 0) {
      const ed = existingDraftAssignments[0];
      await connection.commit();
      return {
        planPublicId: String(ed.plan_public_id),
        versionPublicId: String(ed.version_public_id),
        versionNumber: Number(ed.version_number),
        isExistingDraft: true,
        studentMembershipPublicId: resolvedMembershipPublicId,
        studentPublicId: resolvedUserPublicId,
        studentName,
      };
    }

    // 3. Create dedicated plan root for this student
    const planPublicId = crypto.randomUUID();
    const [pRes] = await connection.query<ResultSetHeader>(
      `INSERT INTO nutrition_v2_plans (
        public_id, consultancy_id, created_by_membership_id, is_template, status
      ) VALUES (?, ?, ?, 0, 'ACTIVE')`,
      [planPublicId, ctx.consultancyId!, ctx.membershipId!]
    );
    const planId = pRes.insertId;

    // 4. Create version 1 (DRAFT) with title "Plano Alimentar - <studentName>"
    const versionPublicId = crypto.randomUUID();
    const autoTitle = `Plano Alimentar - ${studentName}`.slice(0, 200);
    const [vRes] = await connection.query<ResultSetHeader>(
      `INSERT INTO nutrition_v2_plan_versions (
        public_id, nutrition_plan_id, version_number, status,
        title, subtitle, objective, general_guidance, notes,
        created_by_membership_id
      ) VALUES (?, ?, 1, 'DRAFT', ?, NULL, NULL, NULL, NULL, ?)`,
      [versionPublicId, planId, autoTitle, ctx.membershipId!]
    );
    const versionId = vRes.insertId;

    // 5. Track the working draft via a DRAFT assignment row for this student
    const draftAssignmentPublicId = crypto.randomUUID();
    await connection.query(
      `INSERT INTO nutrition_v2_assignments (
        public_id, consultancy_id, student_membership_id, nutrition_plan_version_id,
        assigned_by_membership_id, starts_on, ends_on, status, notes_for_student
      ) VALUES (?, ?, ?, ?, ?, CURRENT_DATE, NULL, 'DRAFT', NULL)`,
      [
        draftAssignmentPublicId,
        ctx.consultancyId!,
        studentMembershipId,
        versionId,
        ctx.membershipId!,
      ]
    );

    await connection.commit();

    return {
      planPublicId,
      versionPublicId,
      versionNumber: 1,
      isExistingDraft: false,
      studentMembershipPublicId: resolvedMembershipPublicId,
      studentPublicId: resolvedUserPublicId,
      studentName,
    };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    throw err;
  } finally {
    if (connection) connection.release();
  }
}

