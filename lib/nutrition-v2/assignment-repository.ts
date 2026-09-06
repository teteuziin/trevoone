/**
 * TREVO ONE — NUTRITION V2 ASSIGNMENT & STUDENT REPOSITORY
 *
 * Implements:
 * - Exact PUBLISHED version prescription
 * - One active Nutrition V2 assignment per student per consultancy
 * - Explicit version updates (same root)
 * - Different plan replacement with explicit intent
 * - Assignment termination (status = 'ENDED', ends_on = effectiveDate, deleted_at = NULL)
 * - Professional assignment list and history queries (no N+1)
 * - Student authoritative state resolution (V2 active -> V2, V2 history no active -> V2 empty state, zero V2 -> V1 legacy)
 * - Frozen snapshot tree loading for Student and Print views (strictly ordered by sort_order)
 */

import type { RowDataPacket, PoolConnection } from "mysql2/promise";
import crypto from "node:crypto";
import { getDbConnection } from "../db/mysql";
import {
  type NutritionAccessContext,
  assertCanAuthorNutrition,
  NutritionAuthorizationError,
} from "./access";
import { getConsultancyLocalDate } from "../consultancies/timezone";

export type EligibleStudentDto = {
  membershipPublicId: string;
  studentName: string;
  studentEmail: string;
  activeAssignment?: {
    assignmentPublicId: string;
    planPublicId: string;
    planTitle: string;
    versionNumber: number;
    versionPublicId: string;
    startsOn: string;
  } | null;
};

export type AssignmentListItemDto = {
  assignmentPublicId: string;
  studentMembershipPublicId: string;
  studentName: string;
  studentEmail: string;
  planPublicId: string;
  planTitle: string;
  versionPublicId: string;
  versionNumber: number;
  status: "ACTIVE" | "ENDED";
  startsOn: string;
  endsOn: string | null;
  notesForStudent: string | null;
  assignedByMemberName: string;
  isCurrentPublishedVersion: boolean;
  newerPublishedVersion: {
    publicId: string;
    versionNumber: number;
  } | null;
  createdAt: string;
};

export type StudentNutritionMealItemDto = {
  id: number;
  publicId: string;
  foodId: number | null;
  sortOrder: number;
  foodNameSnapshot: string;
  categorySnapshot: string | null;
  prescribedQuantity: number | null;
  prescribedUnitCode: string | null;
  prescribedUnitLabel: string | null;
  caloriesKcalSnapshot: number | null;
  proteinGSnapshot: number | null;
  carbohydrateGSnapshot: number | null;
  fatGSnapshot: number | null;
  notes: string | null;
  substitutions: StudentNutritionSubstitutionDto[];
};

export type StudentNutritionSubstitutionDto = {
  id: number;
  publicId: string;
  foodId: number | null;
  sortOrder: number;
  foodNameSnapshot: string;
  prescribedQuantity: number | null;
  prescribedUnitCode: string | null;
  prescribedUnitLabel: string | null;
  caloriesKcalSnapshot: number | null;
  proteinGSnapshot: number | null;
  carbohydrateGSnapshot: number | null;
  fatGSnapshot: number | null;
  notes: string | null;
};

export type StudentNutritionMealDto = {
  id: number;
  publicId: string;
  title: string;
  scheduledTime: string | null;
  notes: string | null;
  sortOrder: number;
  items: StudentNutritionMealItemDto[];
};

export type StudentAssignedPlanTreeDto = {
  assignmentPublicId: string;
  startsOn: string;
  endsOn: string | null;
  notesForStudent: string | null;
  plan: {
    publicId: string;
    title: string;
  };
  version: {
    publicId: string;
    versionNumber: number;
    title: string;
    subtitle: string | null;
    objective: string | null;
    generalGuidance: string | null;
    notes: string | null;
  };
  meals: StudentNutritionMealDto[];
  totals: {
    caloriesKcal: number | null;
    proteinG: number | null;
    carbohydrateG: number | null;
    fatG: number | null;
  };
};

export type StudentAuthoritativeNutritionResult = {
  hasV2History: boolean;
  activeAssignment: StudentAssignedPlanTreeDto | null;
};

// ============================================================================
// PROFESSIONAL OPERATIONS
// ============================================================================

/**
 * List eligible students (STUDENT or INFLUENCER) in the consultancy with their
 * current active Nutrition V2 assignment summary to avoid N+1 queries.
 */
export async function listEligibleStudentsForNutrition(
  ctx: NutritionAccessContext,
  search?: string,
  limit: number = 25
): Promise<EligibleStudentDto[]> {
  assertCanAuthorNutrition(ctx);

  const validLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);
  const rawSearch = (search || "").trim().normalize("NFC");
  const hasSearch = rawSearch.length > 0;
  const escapedSearch = rawSearch.replace(/[%_\\]/g, "\\$&");
  const searchPattern = `%${escapedSearch}%`;

  let connection;
  try {
    connection = await getDbConnection();

    const whereConditions = [
      "cm.consultancy_id = ?",
      "cm.status = 'ACTIVE'",
      "u.status = 'ACTIVE'",
      "u.deleted_at IS NULL",
      "cmr.role IN ('STUDENT', 'INFLUENCER')",
    ];
    const queryParams: (string | number)[] = [ctx.consultancyId!];

    if (hasSearch) {
      whereConditions.push("(u.full_name LIKE ? OR u.email LIKE ?)");
      queryParams.push(searchPattern, searchPattern);
    }

    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT DISTINCT
        cm.id AS membership_id,
        cm.public_id AS membership_public_id,
        u.full_name AS student_name,
        u.email AS student_email,
        curr.public_id AS current_assignment_public_id,
        curr.plan_public_id,
        curr.version_title,
        curr.version_number,
        curr.version_public_id,
        DATE_FORMAT(curr.starts_on, '%Y-%m-%d') AS current_starts_on
       FROM consultancy_members cm
       INNER JOIN users u ON u.id = cm.user_id
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       LEFT JOIN (
         SELECT
           a.student_membership_id,
           a.public_id,
           p.public_id AS plan_public_id,
           v.title AS version_title,
           v.version_number,
           v.public_id AS version_public_id,
           a.starts_on
         FROM nutrition_v2_assignments a
         INNER JOIN nutrition_v2_plan_versions v ON v.id = a.nutrition_plan_version_id
         INNER JOIN nutrition_v2_plans p ON p.id = v.nutrition_plan_id
         WHERE a.consultancy_id = ?
           AND a.status = 'ACTIVE'
           AND a.deleted_at IS NULL
       ) curr ON curr.student_membership_id = cm.id
       WHERE ${whereConditions.join(" AND ")}
       ORDER BY u.full_name ASC, u.id ASC
       LIMIT ?`,
      [ctx.consultancyId!, ...queryParams, validLimit]
    );

    return rows.map((r) => ({
      membershipPublicId: String(r.membership_public_id),
      studentName: String(r.student_name),
      studentEmail: String(r.student_email),
      activeAssignment: r.current_assignment_public_id
        ? {
            assignmentPublicId: String(r.current_assignment_public_id),
            planPublicId: String(r.plan_public_id),
            planTitle: String(r.version_title),
            versionNumber: Number(r.version_number),
            versionPublicId: String(r.version_public_id),
            startsOn: String(r.current_starts_on),
          }
        : null,
    }));
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Prescribes an exact PUBLISHED Nutrition V2 plan version to an eligible student.
 * If student already has an active assignment:
 * - If pointing to same exact version: idempotent success / no-op.
 * - If pointing to different plan or older version: requires forceReplace = true.
 * Transactionally ends old assignment and creates new active assignment.
 */
export async function assignPlanVersion(
  ctx: NutritionAccessContext,
  params: {
    planPublicId: string;
    versionPublicId: string;
    studentMembershipPublicId: string;
    notesForStudent?: string | null;
    forceReplace?: boolean;
    testHook?: "FAIL_BEFORE_COMMIT" | "FAIL_AFTER_OLD_END";
  }
): Promise<{
  success: boolean;
  assignmentPublicId: string;
  isExistingAssignment?: boolean;
  replacedPrevious?: boolean;
}> {
  assertCanAuthorNutrition(ctx);

  const { planPublicId, versionPublicId, studentMembershipPublicId, notesForStudent, forceReplace, testHook } = params;

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 1. Resolve consultancy timezone for canonical effective business date
    const [consultancyRows] = await connection.query<RowDataPacket[]>(
      `SELECT timezone FROM consultancies WHERE id = ? FOR UPDATE`,
      [ctx.consultancyId!]
    );
    const tz = consultancyRows[0]?.timezone || "America/Sao_Paulo";
    const effectiveDate = getConsultancyLocalDate(tz);

    // 2. Authoritative check on plan root and target version
    const [planRows] = await connection.query<RowDataPacket[]>(
      `SELECT id, consultancy_id, is_template, status FROM nutrition_v2_plans
       WHERE public_id = ? AND deleted_at IS NULL FOR UPDATE`,
      [planPublicId]
    );
    if (planRows.length === 0) {
      throw new NutritionAuthorizationError("Plano não encontrado.", "PLAN_NOT_FOUND", 404);
    }
    const plan = planRows[0];
    if (Number(plan.consultancy_id) !== ctx.consultancyId!) {
      throw new NutritionAuthorizationError("Acesso negado ao plano desta consultoria.", "FORBIDDEN_TENANT_PLAN", 403);
    }
    if (Boolean(plan.is_template)) {
      throw new NutritionAuthorizationError("Planos modelo não podem ser prescritos a alunos.", "CANNOT_ASSIGN_TEMPLATE", 400);
    }
    if (plan.status !== "ACTIVE") {
      throw new NutritionAuthorizationError("Apenas planos ativos podem ser prescritos.", "PLAN_NOT_ACTIVE", 400);
    }

    const [versionRows] = await connection.query<RowDataPacket[]>(
      `SELECT id, nutrition_plan_id, status, version_number FROM nutrition_v2_plan_versions
       WHERE public_id = ? AND deleted_at IS NULL FOR UPDATE`,
      [versionPublicId]
    );
    if (versionRows.length === 0) {
      throw new NutritionAuthorizationError("Versão do plano não encontrada.", "VERSION_NOT_FOUND", 404);
    }
    const version = versionRows[0];
    if (Number(version.nutrition_plan_id) !== Number(plan.id)) {
      throw new NutritionAuthorizationError("Versão não pertence a este plano.", "VERSION_PLAN_MISMATCH", 400);
    }
    if (version.status !== "PUBLISHED") {
      throw new NutritionAuthorizationError("Apenas versões publicadas podem ser prescritas a alunos.", "VERSION_NOT_PUBLISHED", 400);
    }

    // 3. Lock student membership and verify eligibility in same tenancy
    const [memberRows] = await connection.query<RowDataPacket[]>(
      `SELECT cm.id, cm.consultancy_id, cm.status
       FROM consultancy_members cm
       WHERE cm.public_id = ? FOR UPDATE`,
      [studentMembershipPublicId]
    );
    if (memberRows.length === 0) {
      throw new NutritionAuthorizationError("Aluno não encontrado.", "STUDENT_NOT_FOUND", 404);
    }
    const studentMember = memberRows[0];
    if (Number(studentMember.consultancy_id) !== ctx.consultancyId!) {
      throw new NutritionAuthorizationError("Aluno pertence a outra consultoria.", "FORBIDDEN_TENANT_STUDENT", 403);
    }
    if (studentMember.status !== "ACTIVE") {
      throw new NutritionAuthorizationError("Matrícula do aluno não está ativa.", "STUDENT_NOT_ACTIVE", 400);
    }

    const [roleRows] = await connection.query<RowDataPacket[]>(
      `SELECT role FROM consultancy_member_roles WHERE member_id = ? AND role IN ('STUDENT', 'INFLUENCER')`,
      [studentMember.id]
    );
    if (roleRows.length === 0) {
      throw new NutritionAuthorizationError("Membro não possui perfil de aluno.", "NOT_A_STUDENT", 403);
    }

    // 4. Lock active assignments for this student in this tenancy
    const [activeAssignments] = await connection.query<RowDataPacket[]>(
      `SELECT a.id, a.public_id, a.nutrition_plan_version_id, v.nutrition_plan_id
       FROM nutrition_v2_assignments a
       INNER JOIN nutrition_v2_plan_versions v ON v.id = a.nutrition_plan_version_id
       WHERE a.consultancy_id = ?
         AND a.student_membership_id = ?
         AND a.status = 'ACTIVE'
         AND a.deleted_at IS NULL
       FOR UPDATE`,
      [ctx.consultancyId!, studentMember.id]
    );

    let replacedPrevious = false;

    if (activeAssignments.length > 0) {
      const current = activeAssignments[0];

      // Same exact version check: idempotent success
      if (Number(current.nutrition_plan_version_id) === Number(version.id)) {
        await connection.commit();
        return {
          success: true,
          assignmentPublicId: String(current.public_id),
          isExistingAssignment: true,
          replacedPrevious: false,
        };
      }

      // Different plan or version requires explicit replacement
      if (!forceReplace) {
        throw new NutritionAuthorizationError(
          "O aluno já possui um plano alimentar ativo. Confirme a substituição do plano atual.",
          "ACTIVE_ASSIGNMENT_EXISTS",
          409
        );
      }

      // Mark previous assignment as ENDED using the same effective calendar date
      await connection.query(
        `UPDATE nutrition_v2_assignments
         SET status = 'ENDED', ends_on = ?, updated_at = UTC_TIMESTAMP(3)
         WHERE id = ?`,
        [effectiveDate, current.id]
      );

      replacedPrevious = true;

      if (testHook === "FAIL_AFTER_OLD_END") {
        throw new Error("TEST_HOOK_FAIL_AFTER_OLD_END");
      }
    }

    // 5. Insert new active assignment
    const newAssignmentPublicId = crypto.randomUUID();
    await connection.query(
      `INSERT INTO nutrition_v2_assignments (
        public_id, consultancy_id, student_membership_id, nutrition_plan_version_id,
        assigned_by_membership_id, starts_on, ends_on, status, notes_for_student
      ) VALUES (?, ?, ?, ?, ?, ?, NULL, 'ACTIVE', ?)`,
      [
        newAssignmentPublicId,
        ctx.consultancyId!,
        studentMember.id,
        version.id,
        ctx.membershipId!,
        effectiveDate,
        notesForStudent ? notesForStudent.trim() : null,
      ]
    );

    if (testHook === "FAIL_BEFORE_COMMIT") {
      throw new Error("TEST_HOOK_FAIL_BEFORE_COMMIT");
    }

    await connection.commit();

    return {
      success: true,
      assignmentPublicId: newAssignmentPublicId,
      isExistingAssignment: false,
      replacedPrevious,
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
 * Updates an active assignment to a newer published version of the SAME stable plan root.
 * Preserves history: sets old assignment status = 'ENDED', ends_on = effectiveDate,
 * and creates a new assignment row with status = 'ACTIVE', starts_on = effectiveDate.
 */
export async function updateAssignmentVersion(
  ctx: NutritionAccessContext,
  params: {
    assignmentPublicId: string;
    targetVersionPublicId: string;
    testHook?: "FAIL_AFTER_OLD_END" | "FAIL_BEFORE_COMMIT";
  }
): Promise<{ success: boolean; newAssignmentPublicId: string }> {
  assertCanAuthorNutrition(ctx);

  const { assignmentPublicId, targetVersionPublicId, testHook } = params;

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 1. Resolve timezone for canonical date
    const [consultancyRows] = await connection.query<RowDataPacket[]>(
      `SELECT timezone FROM consultancies WHERE id = ? FOR UPDATE`,
      [ctx.consultancyId!]
    );
    const tz = consultancyRows[0]?.timezone || "America/Sao_Paulo";
    const effectiveDate = getConsultancyLocalDate(tz);

    // 2. Lock current assignment
    const [assignmentRows] = await connection.query<RowDataPacket[]>(
      `SELECT a.id, a.public_id, a.consultancy_id, a.student_membership_id,
              a.nutrition_plan_version_id, a.status, a.notes_for_student,
              v.nutrition_plan_id, v.version_number
       FROM nutrition_v2_assignments a
       INNER JOIN nutrition_v2_plan_versions v ON v.id = a.nutrition_plan_version_id
       WHERE a.public_id = ? AND a.deleted_at IS NULL FOR UPDATE`,
      [assignmentPublicId]
    );
    if (assignmentRows.length === 0) {
      throw new NutritionAuthorizationError("Prescrição não encontrada.", "ASSIGNMENT_NOT_FOUND", 404);
    }
    const current = assignmentRows[0];
    if (Number(current.consultancy_id) !== ctx.consultancyId!) {
      throw new NutritionAuthorizationError("Acesso negado à prescrição desta consultoria.", "FORBIDDEN_TENANT_ASSIGNMENT", 403);
    }
    if (current.status !== "ACTIVE") {
      throw new NutritionAuthorizationError("Apenas prescrições ativas podem ser atualizadas.", "ASSIGNMENT_NOT_ACTIVE", 400);
    }

    // 3. Lock student membership
    const [memberRows] = await connection.query<RowDataPacket[]>(
      `SELECT id, status FROM consultancy_members WHERE id = ? FOR UPDATE`,
      [current.student_membership_id]
    );
    if (memberRows.length === 0 || memberRows[0].status !== "ACTIVE") {
      throw new NutritionAuthorizationError("Aluno não possui matrícula ativa.", "STUDENT_NOT_ACTIVE", 400);
    }

    // 4. Lock target version and verify it belongs to SAME plan root and is PUBLISHED
    const [targetVersionRows] = await connection.query<RowDataPacket[]>(
      `SELECT id, nutrition_plan_id, version_number, status
       FROM nutrition_v2_plan_versions
       WHERE public_id = ? AND deleted_at IS NULL FOR UPDATE`,
      [targetVersionPublicId]
    );
    if (targetVersionRows.length === 0) {
      throw new NutritionAuthorizationError("Versão alvo não encontrada.", "VERSION_NOT_FOUND", 404);
    }
    const target = targetVersionRows[0];
    if (Number(target.nutrition_plan_id) !== Number(current.nutrition_plan_id)) {
      throw new NutritionAuthorizationError(
        "A atualização de versão deve ser para o mesmo plano base. Utilize a substituição de plano para trocar de plano.",
        "CANNOT_CHANGE_ROOT_ON_VERSION_UPDATE",
        400
      );
    }
    if (target.status !== "PUBLISHED") {
      throw new NutritionAuthorizationError("Apenas versões publicadas podem ser prescritas a alunos.", "VERSION_NOT_PUBLISHED", 400);
    }
    if (Number(target.id) === Number(current.nutrition_plan_version_id)) {
      throw new NutritionAuthorizationError("O aluno já está na versão selecionada.", "ALREADY_ON_TARGET_VERSION", 400);
    }

    // 5. End current assignment using canonical effective date
    await connection.query(
      `UPDATE nutrition_v2_assignments
       SET status = 'ENDED', ends_on = ?, updated_at = UTC_TIMESTAMP(3)
       WHERE id = ?`,
      [effectiveDate, current.id]
    );

    if (testHook === "FAIL_AFTER_OLD_END") {
      throw new Error("TEST_HOOK_FAIL_AFTER_OLD_END");
    }

    // 6. Insert new active assignment pointing to target version
    const newAssignmentPublicId = crypto.randomUUID();
    await connection.query(
      `INSERT INTO nutrition_v2_assignments (
        public_id, consultancy_id, student_membership_id, nutrition_plan_version_id,
        assigned_by_membership_id, starts_on, ends_on, status, notes_for_student
      ) VALUES (?, ?, ?, ?, ?, ?, NULL, 'ACTIVE', ?)`,
      [
        newAssignmentPublicId,
        ctx.consultancyId!,
        current.student_membership_id,
        target.id,
        ctx.membershipId!,
        effectiveDate,
        current.notes_for_student,
      ]
    );

    if (testHook === "FAIL_BEFORE_COMMIT") {
      throw new Error("TEST_HOOK_FAIL_BEFORE_COMMIT");
    }

    await connection.commit();

    return {
      success: true,
      newAssignmentPublicId,
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
 * Explicitly terminates an active assignment.
 * Sets status = 'ENDED', ends_on = effectiveDate, deleted_at = NULL (never hard deletes).
 * Idempotent: safe if already ENDED.
 */
export async function endAssignment(
  ctx: NutritionAccessContext,
  assignmentPublicId: string
): Promise<{ success: boolean; status: "ENDED" }> {
  assertCanAuthorNutrition(ctx);

  let connection: PoolConnection | undefined;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 1. Resolve timezone for canonical date
    const [consultancyRows] = await connection.query<RowDataPacket[]>(
      `SELECT timezone FROM consultancies WHERE id = ? FOR UPDATE`,
      [ctx.consultancyId!]
    );
    const tz = consultancyRows[0]?.timezone || "America/Sao_Paulo";
    const effectiveDate = getConsultancyLocalDate(tz);

    // 2. Lock assignment
    const [assignmentRows] = await connection.query<RowDataPacket[]>(
      `SELECT id, consultancy_id, status FROM nutrition_v2_assignments
       WHERE public_id = ? AND deleted_at IS NULL FOR UPDATE`,
      [assignmentPublicId]
    );
    if (assignmentRows.length === 0) {
      throw new NutritionAuthorizationError("Prescrição não encontrada.", "ASSIGNMENT_NOT_FOUND", 404);
    }
    const current = assignmentRows[0];
    if (Number(current.consultancy_id) !== ctx.consultancyId!) {
      throw new NutritionAuthorizationError("Acesso negado à prescrição desta consultoria.", "FORBIDDEN_TENANT_ASSIGNMENT", 403);
    }

    if (current.status === "ENDED") {
      // Idempotent success
      await connection.commit();
      return { success: true, status: "ENDED" };
    }

    await connection.query(
      `UPDATE nutrition_v2_assignments
       SET status = 'ENDED', ends_on = ?, updated_at = UTC_TIMESTAMP(3)
       WHERE id = ?`,
      [effectiveDate, current.id]
    );

    await connection.commit();
    return { success: true, status: "ENDED" };
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
 * List all assignments (ACTIVE and ENDED) for a given plan root across all its versions.
 * Identifies if a newer published version exists on the same root for active assignments.
 * Set-based query, no N+1.
 */
export async function listPlanAssignments(
  ctx: NutritionAccessContext,
  planPublicId: string
): Promise<AssignmentListItemDto[]> {
  assertCanAuthorNutrition(ctx);

  let connection;
  try {
    connection = await getDbConnection();

    // 1. Verify plan root
    const [plans] = await connection.query<RowDataPacket[]>(
      `SELECT id, public_id, consultancy_id FROM nutrition_v2_plans
       WHERE public_id = ? AND deleted_at IS NULL`,
      [planPublicId]
    );
    if (plans.length === 0) {
      throw new NutritionAuthorizationError("Plano não encontrado.", "PLAN_NOT_FOUND", 404);
    }
    const plan = plans[0];
    if (Number(plan.consultancy_id) !== ctx.consultancyId!) {
      throw new NutritionAuthorizationError("Acesso negado ao plano desta consultoria.", "FORBIDDEN_TENANT_PLAN", 403);
    }

    // 2. Find latest published version for this plan root
    const [latestPubRows] = await connection.query<RowDataPacket[]>(
      `SELECT id, public_id, version_number
       FROM nutrition_v2_plan_versions
       WHERE nutrition_plan_id = ? AND status = 'PUBLISHED' AND deleted_at IS NULL
       ORDER BY version_number DESC LIMIT 1`,
      [plan.id]
    );
    const latestPublished = latestPubRows.length > 0 ? latestPubRows[0] : null;

    // 3. Query assignments across all versions of this plan root
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT
        a.id,
        a.public_id,
        a.status,
        DATE_FORMAT(a.starts_on, '%Y-%m-%d') AS starts_on,
        DATE_FORMAT(a.ends_on, '%Y-%m-%d') AS ends_on,
        a.notes_for_student,
        a.created_at,
        cm_student.public_id AS student_membership_public_id,
        u_student.full_name AS student_name,
        u_student.email AS student_email,
        v.id AS version_id,
        v.public_id AS version_public_id,
        v.version_number,
        v.title AS version_title,
        u_author.full_name AS author_name
       FROM nutrition_v2_assignments a
       INNER JOIN nutrition_v2_plan_versions v ON v.id = a.nutrition_plan_version_id
       INNER JOIN consultancy_members cm_student ON cm_student.id = a.student_membership_id
       INNER JOIN users u_student ON u_student.id = cm_student.user_id
       INNER JOIN consultancy_members cm_author ON cm_author.id = a.assigned_by_membership_id
       INNER JOIN users u_author ON u_author.id = cm_author.user_id
       WHERE v.nutrition_plan_id = ?
         AND a.deleted_at IS NULL
       ORDER BY (a.status = 'ACTIVE') DESC, a.created_at DESC`,
      [plan.id]
    );

    return rows.map((r) => {
      const isCurrentPublished = latestPublished
        ? Number(r.version_id) === Number(latestPublished.id)
        : false;

      const newerPublished =
        r.status === "ACTIVE" && latestPublished && Number(latestPublished.version_number) > Number(r.version_number)
          ? {
              publicId: String(latestPublished.public_id),
              versionNumber: Number(latestPublished.version_number),
            }
          : null;

      return {
        assignmentPublicId: String(r.public_id),
        studentMembershipPublicId: String(r.student_membership_public_id),
        studentName: String(r.student_name),
        studentEmail: String(r.student_email),
        planPublicId: String(plan.public_id),
        planTitle: String(r.version_title),
        versionPublicId: String(r.version_public_id),
        versionNumber: Number(r.version_number),
        status: r.status as "ACTIVE" | "ENDED",
        startsOn: String(r.starts_on),
        endsOn: r.ends_on ? String(r.ends_on) : null,
        notesForStudent: r.notes_for_student ? String(r.notes_for_student) : null,
        assignedByMemberName: String(r.author_name),
        isCurrentPublishedVersion: isCurrentPublished,
        newerPublishedVersion: newerPublished,
        createdAt: new Date(r.created_at).toISOString(),
      };
    });
  } finally {
    if (connection) connection.release();
  }
}

// ============================================================================
// STUDENT AUTHORITATIVE READ PATH
// ============================================================================

/**
 * Canonical authority rule (Section 41 & Addendum Section 8):
 * A. If student has ACTIVE Nutrition V2 assignment -> render exact assigned V2.
 * B. Else if student has ANY Nutrition V2 assignment history -> Nutrition V2 is authoritative -> render V2 empty state, NO V1 FALLBACK.
 * C. Else (zero V2 history) -> fallback to existing legacy V1.
 */
export async function getStudentAuthoritativeNutrition(
  userId: number,
  consultancySlug: string
): Promise<StudentAuthoritativeNutritionResult> {
  if (!userId || !consultancySlug) {
    return { hasV2History: false, activeAssignment: null };
  }

  let connection;
  try {
    connection = await getDbConnection();

    // 1. Resolve student membership
    const [memberRows] = await connection.query<RowDataPacket[]>(
      `SELECT cm.id, cm.consultancy_id
       FROM consultancy_members cm
       INNER JOIN consultancies c ON c.id = cm.consultancy_id
       WHERE c.slug = ?
         AND cm.user_id = ?
         AND cm.status = 'ACTIVE'
         AND c.status = 'ACTIVE'
         AND c.deleted_at IS NULL`,
      [consultancySlug, userId]
    );
    if (memberRows.length === 0) {
      return { hasV2History: false, activeAssignment: null };
    }
    const memberId = Number(memberRows[0].id);
    const consultancyId = Number(memberRows[0].consultancy_id);

    // 2. Check for active Nutrition V2 assignment
    const [activeRows] = await connection.query<RowDataPacket[]>(
      `SELECT
        a.id AS assignment_id,
        a.public_id AS assignment_public_id,
        DATE_FORMAT(a.starts_on, '%Y-%m-%d') AS starts_on,
        DATE_FORMAT(a.ends_on, '%Y-%m-%d') AS ends_on,
        a.notes_for_student,
        p.public_id AS plan_public_id,
        v.id AS version_id,
        v.public_id AS version_public_id,
        v.version_number,
        v.status AS version_status,
        v.title AS version_title,
        v.subtitle AS version_subtitle,
        v.objective AS version_objective,
        v.general_guidance AS version_guidance,
        v.notes AS version_notes
       FROM nutrition_v2_assignments a
       INNER JOIN nutrition_v2_plan_versions v ON v.id = a.nutrition_plan_version_id
       INNER JOIN nutrition_v2_plans p ON p.id = v.nutrition_plan_id
       WHERE a.consultancy_id = ?
         AND a.student_membership_id = ?
         AND a.status = 'ACTIVE'
         AND a.deleted_at IS NULL
       LIMIT 1`,
      [consultancyId, memberId]
    );

    if (activeRows.length > 0) {
      const act = activeRows[0];

      // DRAFT must never be student-readable (Section 14)
      if (act.version_status === "DRAFT") {
        return { hasV2History: true, activeAssignment: null };
      }

      // Load full frozen tree for this exact version
      const tree = await loadFrozenTreeForAssignment(connection, act);
      return {
        hasV2History: true,
        activeAssignment: tree,
      };
    }

    // 3. No active assignment. Check if student has ANY prior Nutrition V2 assignment history in this tenancy
    const [historyRows] = await connection.query<RowDataPacket[]>(
      `SELECT 1 FROM nutrition_v2_assignments
       WHERE consultancy_id = ? AND student_membership_id = ?
       LIMIT 1`,
      [consultancyId, memberId]
    );

    const hasV2History = historyRows.length > 0;
    return {
      hasV2History,
      activeAssignment: null,
    };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Loads the frozen meal, item, and substitution tree for an assignment.
 * Strictly adheres to `sort_order` for meals, items, and substitutions.
 * Does NOT live-hydrate from nutrition_v2_foods or nutrition_v2_food_portions.
 */
async function loadFrozenTreeForAssignment(
  connection: PoolConnection,
  assignmentRow: RowDataPacket
): Promise<StudentAssignedPlanTreeDto> {
  const versionId = Number(assignmentRow.version_id);

  // 1. Meals strictly ordered by sort_order
  const [mealRows] = await connection.query<RowDataPacket[]>(
    `SELECT id, public_id, title, scheduled_time, notes, sort_order
     FROM nutrition_v2_meals
     WHERE nutrition_plan_version_id = ? AND deleted_at IS NULL
     ORDER BY sort_order ASC, id ASC`,
    [versionId]
  );

  const mealIds = mealRows.map((m) => Number(m.id));

  // 2. Items strictly ordered by sort_order
  let itemRows: RowDataPacket[] = [];
  if (mealIds.length > 0) {
    const [items] = await connection.query<RowDataPacket[]>(
      `SELECT
        id, public_id, meal_id, food_id, sort_order,
        food_name_snapshot, category_snapshot, prescribed_quantity,
        prescribed_unit_code, prescribed_unit_label,
        calories_kcal_snapshot, protein_g_snapshot, carbohydrate_g_snapshot, fat_g_snapshot,
        notes
       FROM nutrition_v2_meal_items
       WHERE meal_id IN (?) AND deleted_at IS NULL
       ORDER BY sort_order ASC, id ASC`,
      [mealIds]
    );
    itemRows = items;
  }

  const itemIds = itemRows.map((i) => Number(i.id));

  // 3. Substitutions strictly ordered by sort_order
  let subRows: RowDataPacket[] = [];
  if (itemIds.length > 0) {
    const [subs] = await connection.query<RowDataPacket[]>(
      `SELECT
        id, public_id, meal_item_id, food_id, sort_order,
        food_name_snapshot, prescribed_quantity,
        prescribed_unit_code, prescribed_unit_label,
        calories_kcal_snapshot, protein_g_snapshot, carbohydrate_g_snapshot, fat_g_snapshot,
        notes
       FROM nutrition_v2_item_substitutions
       WHERE meal_item_id IN (?) AND deleted_at IS NULL
       ORDER BY sort_order ASC, id ASC`,
      [itemIds]
    );
    subRows = subs;
  }

  // 4. Assemble tree
  const subsByItem = new Map<number, StudentNutritionSubstitutionDto[]>();
  for (const s of subRows) {
    const itemId = Number(s.meal_item_id);
    if (!subsByItem.has(itemId)) subsByItem.set(itemId, []);
    subsByItem.get(itemId)!.push({
      id: Number(s.id),
      publicId: String(s.public_id),
      foodId: s.food_id ? Number(s.food_id) : null,
      sortOrder: Number(s.sort_order),
      foodNameSnapshot: String(s.food_name_snapshot),
      prescribedQuantity: s.prescribed_quantity != null ? Number(s.prescribed_quantity) : null,
      prescribedUnitCode: s.prescribed_unit_code ? String(s.prescribed_unit_code) : null,
      prescribedUnitLabel: s.prescribed_unit_label ? String(s.prescribed_unit_label) : null,
      caloriesKcalSnapshot: s.calories_kcal_snapshot != null ? Number(s.calories_kcal_snapshot) : null,
      proteinGSnapshot: s.protein_g_snapshot != null ? Number(s.protein_g_snapshot) : null,
      carbohydrateGSnapshot: s.carbohydrate_g_snapshot != null ? Number(s.carbohydrate_g_snapshot) : null,
      fatGSnapshot: s.fat_g_snapshot != null ? Number(s.fat_g_snapshot) : null,
      notes: s.notes ? String(s.notes) : null,
    });
  }

  const itemsByMeal = new Map<number, StudentNutritionMealItemDto[]>();
  for (const it of itemRows) {
    const mealId = Number(it.meal_id);
    if (!itemsByMeal.has(mealId)) itemsByMeal.set(mealId, []);
    itemsByMeal.get(mealId)!.push({
      id: Number(it.id),
      publicId: String(it.public_id),
      foodId: it.food_id ? Number(it.food_id) : null,
      sortOrder: Number(it.sort_order),
      foodNameSnapshot: String(it.food_name_snapshot),
      categorySnapshot: it.category_snapshot ? String(it.category_snapshot) : null,
      prescribedQuantity: it.prescribed_quantity != null ? Number(it.prescribed_quantity) : null,
      prescribedUnitCode: it.prescribed_unit_code ? String(it.prescribed_unit_code) : null,
      prescribedUnitLabel: it.prescribed_unit_label ? String(it.prescribed_unit_label) : null,
      caloriesKcalSnapshot: it.calories_kcal_snapshot != null ? Number(it.calories_kcal_snapshot) : null,
      proteinGSnapshot: it.protein_g_snapshot != null ? Number(it.protein_g_snapshot) : null,
      carbohydrateGSnapshot: it.carbohydrate_g_snapshot != null ? Number(it.carbohydrate_g_snapshot) : null,
      fatGSnapshot: it.fat_g_snapshot != null ? Number(it.fat_g_snapshot) : null,
      notes: it.notes ? String(it.notes) : null,
      substitutions: subsByItem.get(Number(it.id)) || [],
    });
  }

  const meals: StudentNutritionMealDto[] = mealRows.map((m) => ({
    id: Number(m.id),
    publicId: String(m.public_id),
    title: String(m.title),
    scheduledTime: m.scheduled_time ? String(m.scheduled_time) : null,
    notes: m.notes ? String(m.notes) : null,
    sortOrder: Number(m.sort_order),
    items: itemsByMeal.get(Number(m.id)) || [],
  }));

  // Calculate totals from main items (if any macros are null, total can still reflect known or null)
  let hasAnyKnown = false;
  let cal = 0;
  let prot = 0;
  let carb = 0;
  let fat = 0;

  for (const it of itemRows) {
    if (it.calories_kcal_snapshot != null) {
      cal += Number(it.calories_kcal_snapshot);
      hasAnyKnown = true;
    }
    if (it.protein_g_snapshot != null) {
      prot += Number(it.protein_g_snapshot);
      hasAnyKnown = true;
    }
    if (it.carbohydrate_g_snapshot != null) {
      carb += Number(it.carbohydrate_g_snapshot);
      hasAnyKnown = true;
    }
    if (it.fat_g_snapshot != null) {
      fat += Number(it.fat_g_snapshot);
      hasAnyKnown = true;
    }
  }

  const totals = {
    caloriesKcal: hasAnyKnown ? Math.round(cal) : null,
    proteinG: hasAnyKnown ? Math.round(prot * 10) / 10 : null,
    carbohydrateG: hasAnyKnown ? Math.round(carb * 10) / 10 : null,
    fatG: hasAnyKnown ? Math.round(fat * 10) / 10 : null,
  };

  return {
    assignmentPublicId: String(assignmentRow.assignment_public_id),
    startsOn: String(assignmentRow.starts_on),
    endsOn: assignmentRow.ends_on ? String(assignmentRow.ends_on) : null,
    notesForStudent: assignmentRow.notes_for_student ? String(assignmentRow.notes_for_student) : null,
    plan: {
      publicId: String(assignmentRow.plan_public_id),
      title: String(assignmentRow.version_title),
    },
    version: {
      publicId: String(assignmentRow.version_public_id),
      versionNumber: Number(assignmentRow.version_number),
      title: String(assignmentRow.version_title),
      subtitle: assignmentRow.version_subtitle ? String(assignmentRow.version_subtitle) : null,
      objective: assignmentRow.version_objective ? String(assignmentRow.version_objective) : null,
      generalGuidance: assignmentRow.version_guidance ? String(assignmentRow.version_guidance) : null,
      notes: assignmentRow.version_notes ? String(assignmentRow.version_notes) : null,
    },
    meals,
    totals,
  };
}
