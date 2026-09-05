/**
 * TREVO ONE — TRAINING V2 ASSIGNMENT REPOSITORY
 * Student prescription binding, schedule management, version locking, and student view generation.
 */

import crypto from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getDbConnection, getDbPool } from "../db/mysql";
import {
  TrainingAuthorizationError,
  type TrainingAccessContext,
  assertCanAuthorTraining,
  assertStudentContext,
} from "./access";
import { getWorkoutVersionTree } from "./workout-repository";
import type {
  WorkoutAssignmentDto,
  StudentWorkoutViewContract,
  WorkoutAssignmentStatus,
} from "./types";

export type CreateAssignmentInput = {
  workoutPublicId?: string;
  studentMembershipPublicId: string;
  workoutVersionPublicId: string;
  startsOn: string;
  endsOn?: string | null;
  notesForStudent?: string | null;
};

export type UpdateAssignmentScheduleInput = {
  startsOn?: string;
  endsOn?: string | null;
  notesForStudent?: string | null;
};

export type StudentSearchResult = {
  membershipPublicId: string;
  userPublicId: string;
  name: string;
  email: string;
};

export type ProfessionalAssignmentListItem = {
  assignmentPublicId: string;
  studentMembershipPublicId: string;
  studentName: string;
  studentEmail: string;
  workoutPublicId: string;
  workoutTitle: string;
  assignedVersionPublicId: string;
  assignedVersionNumber: number;
  currentPublishedVersionPublicId: string | null;
  currentPublishedVersionNumber: number | null;
  hasNewerPublishedVersion: boolean;
  startsOn: string;
  endsOn: string | null;
  status: "ACTIVE" | "ENDED";
  notesForStudent: string | null;
  createdAt: Date;
};

export type StudentWorkoutCardDto = {
  assignmentPublicId: string;
  workoutTitle: string;
  subtitle: string | null;
  objective: string | null;
  versionNumber: number;
  estimatedDurationMinutes: number | null;
  difficultyLevel: string | null;
  blockCount: number;
  startsOn: string;
  endsOn: string | null;
  notesForStudent: string | null;
};

function isValidDateString(d: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  const parsed = new Date(d + "T00:00:00Z");
  return !isNaN(parsed.getTime());
}

/**
 * Creates an assignment binding a PUBLISHED workout version to a student membership.
 * Enforces strict consultancy tenant consistency, verifies student role,
 * validates date intervals, rejects templates and drafts, and enforces
 * serialization for the (student, workout root, ACTIVE) pair.
 */
export async function createAssignment(
  ctx: TrainingAccessContext,
  input: CreateAssignmentInput
): Promise<WorkoutAssignmentDto> {
  assertCanAuthorTraining(ctx);

  if (!input.startsOn || !isValidDateString(input.startsOn)) {
    throw new TrainingAuthorizationError(
      "Data de início inválida. Formato esperado: AAAA-MM-DD.",
      "INVALID_DATE_FORMAT",
      400
    );
  }

  if (input.endsOn && input.endsOn.trim()) {
    if (!isValidDateString(input.endsOn.trim())) {
      throw new TrainingAuthorizationError(
        "Data de término inválida. Formato esperado: AAAA-MM-DD.",
        "INVALID_DATE_FORMAT",
        400
      );
    }
    if (input.endsOn.trim() < input.startsOn.trim()) {
      throw new TrainingAuthorizationError(
        "A data de término não pode ser anterior à data de início.",
        "INVALID_DATE_RANGE",
        400
      );
    }
  }

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Resolve target version + workout root (Deterministic lock order: 1. Workout, 2. Student)
    const [vRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wv.id, wv.public_id, wv.version_number, wv.status,
              w.id AS workout_id, w.public_id AS workout_public_id, w.consultancy_id,
              w.is_template, w.deleted_at
       FROM workout_versions wv
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wv.public_id = ? AND w.deleted_at IS NULL
       LIMIT 1;`,
      [input.workoutVersionPublicId]
    );

    if (!vRows || vRows.length === 0) {
      throw new TrainingAuthorizationError("Versão de treino não encontrada.", "NOT_FOUND", 404);
    }
    const v = vRows[0];

    if (Number(v.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado: versão pertence a outra consultoria.", "TENANT_MISMATCH", 403);
    }

    if (v.is_template) {
      throw new TrainingAuthorizationError(
        "Modelos de treino não podem ser atribuídos diretamente a alunos. Crie uma rotina a partir do modelo primeiro.",
        "TEMPLATE_NOT_ASSIGNABLE",
        400
      );
    }

    if (v.status !== "PUBLISHED") {
      throw new TrainingAuthorizationError(
        "Apenas versões de treino publicadas (PUBLISHED) podem ser prescritas para alunos.",
        "INVALID_VERSION_STATUS",
        400
      );
    }

    if (input.workoutPublicId && input.workoutPublicId !== v.workout_public_id) {
      throw new TrainingAuthorizationError(
        "A versão de treino não pertence à rotina especificada.",
        "WORKOUT_VERSION_MISMATCH",
        400
      );
    }

    // Lock workout root row
    await connection.execute<RowDataPacket[]>(
      "SELECT id FROM workouts WHERE id = ? FOR UPDATE;",
      [v.workout_id]
    );

    // 2. Resolve & lock student membership (must belong to current consultancy and possess 'STUDENT' role)
    const [studentRows] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id, cm.public_id, cm.consultancy_id
       FROM consultancy_members cm
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.public_id = ? AND cm.consultancy_id = ? AND cm.status = 'ACTIVE' AND cmr.role = 'STUDENT'
       LIMIT 1
       FOR UPDATE;`,
      [input.studentMembershipPublicId, ctx.consultancyId!]
    );

    if (!studentRows || studentRows.length === 0) {
      throw new TrainingAuthorizationError(
        "Membro de aluno não encontrado nesta consultoria ou não possui papel de aluno ativo.",
        "INVALID_STUDENT_MEMBERSHIP",
        404
      );
    }
    const student = studentRows[0];

    // 3. Query existing ACTIVE assignment for the same student + same workout root
    const [existingRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wa.id, wa.public_id, wa.workout_version_id, wv.public_id AS version_public_id, wv.version_number,
              DATE_FORMAT(wa.starts_on, '%Y-%m-%d') AS starts_on,
              DATE_FORMAT(wa.ends_on, '%Y-%m-%d') AS ends_on,
              wa.notes_for_student, wa.created_at
       FROM workout_assignments wa
       INNER JOIN workout_versions wv ON wv.id = wa.workout_version_id
       WHERE wa.consultancy_id = ?
         AND wa.student_membership_id = ?
         AND wv.workout_id = ?
         AND wa.status = 'ACTIVE'
         AND wa.deleted_at IS NULL
       LIMIT 1
       FOR UPDATE;`,
      [ctx.consultancyId!, student.id, v.workout_id]
    );

    if (existingRows && existingRows.length > 0) {
      const existing = existingRows[0];
      if (Number(existing.workout_version_id) === Number(v.id)) {
        // Idempotent: already assigned to this exact version
        await connection.commit();
        const existingTree = await getWorkoutVersionTree(ctx, v.public_id);
        return {
          publicId: String(existing.public_id),
          consultancyPublicId: ctx.consultancyPublicId!,
          studentMembershipPublicId: input.studentMembershipPublicId,
          workoutPublicId: v.workout_public_id,
          workoutVersionPublicId: v.public_id,
          assignedByMembershipPublicId: ctx.membershipPublicId!,
          startsOn: String(existing.starts_on),
          endsOn: existing.ends_on ? String(existing.ends_on) : null,
          status: "ACTIVE",
          notesForStudent: existing.notes_for_student ? String(existing.notes_for_student) : null,
          version: existingTree!,
          createdAt: new Date(existing.created_at),
        };
      }

      // Conflict: active assignment points to another version (e.g. V1 while attempting to create V2)
      throw new TrainingAuthorizationError(
        `Este aluno já possui uma prescrição ativa deste treino (Versão ${existing.version_number}). Utilize a atualização de versão para alterar.`,
        "ACTIVE_ASSIGNMENT_EXISTS",
        409
      );
    }

    // 4. Insert assignment
    const assignmentPublicId = crypto.randomUUID();
    await connection.execute<ResultSetHeader>(
      `INSERT INTO workout_assignments (
        public_id, consultancy_id, student_membership_id, workout_version_id,
        assigned_by_membership_id, starts_on, ends_on, status, notes_for_student
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?);`,
      [
        assignmentPublicId,
        ctx.consultancyId!,
        student.id,
        v.id,
        ctx.membershipId!,
        input.startsOn.trim(),
        input.endsOn?.trim() || null,
        input.notesForStudent?.trim() || null,
      ]
    );

    await connection.commit();

    const versionTree = await getWorkoutVersionTree(ctx, v.public_id);

    return {
      publicId: assignmentPublicId,
      consultancyPublicId: ctx.consultancyPublicId!,
      studentMembershipPublicId: input.studentMembershipPublicId,
      workoutPublicId: v.workout_public_id,
      workoutVersionPublicId: v.public_id,
      assignedByMembershipPublicId: ctx.membershipPublicId!,
      startsOn: input.startsOn.trim(),
      endsOn: input.endsOn?.trim() || null,
      status: "ACTIVE",
      notesForStudent: input.notesForStudent?.trim() || null,
      version: versionTree!,
      createdAt: new Date(),
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Searches active student members in the current consultancy.
 */
export async function searchActiveStudents(
  ctx: TrainingAccessContext,
  query?: string,
  limit: number = 20
): Promise<StudentSearchResult[]> {
  assertCanAuthorTraining(ctx);

  let connection;
  try {
    connection = await getDbConnection();
    const boundedLimit = Math.max(1, Math.min(limit, 50));
    const conditions = [
      "cm.consultancy_id = ?",
      "cm.status = 'ACTIVE'",
      "u.deleted_at IS NULL",
      "cmr.role = 'STUDENT'",
    ];
    const params: (string | number)[] = [ctx.consultancyId!];

    if (query && query.trim()) {
      const q = `%${query.trim()}%`;
      conditions.push("(u.full_name LIKE ? OR u.email LIKE ?)");
      params.push(q, q);
    }

    params.push(boundedLimit);

    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT DISTINCT
         cm.public_id AS membership_public_id,
         u.public_id AS user_public_id,
         u.full_name,
         u.email
       FROM consultancy_members cm
       INNER JOIN users u ON u.id = cm.user_id
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE ${conditions.join(" AND ")}
       ORDER BY u.full_name ASC
       LIMIT ?;`,
      params
    );

    return rows.map((r) => ({
      membershipPublicId: String(r.membership_public_id),
      userPublicId: String(r.user_public_id),
      name: String(r.full_name),
      email: String(r.email),
    }));
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Lists assignments for professional management, indicating current assigned version
 * vs. latest published version of the same workout routine.
 * No N+1 query: uses subquery aggregation.
 */
export async function listAssignmentsForProfessional(
  ctx: TrainingAccessContext,
  options?: {
    workoutPublicId?: string;
    studentMembershipPublicId?: string;
    status?: "ACTIVE" | "ENDED" | "ALL";
    limit?: number;
    offset?: number;
  }
): Promise<{ items: ProfessionalAssignmentListItem[]; total: number }> {
  assertCanAuthorTraining(ctx);

  let connection;
  try {
    connection = await getDbConnection();
    const conditions = ["wa.consultancy_id = ?", "wa.deleted_at IS NULL"];
    const params: (string | number)[] = [ctx.consultancyId!] ;

    if (options?.workoutPublicId) {
      conditions.push("w.public_id = ?");
      params.push(options.workoutPublicId);
    }

    if (options?.studentMembershipPublicId) {
      conditions.push("cm.public_id = ?");
      params.push(options.studentMembershipPublicId);
    }

    const filterStatus = options?.status || "ACTIVE";
    if (filterStatus !== "ALL") {
      conditions.push("wa.status = ?");
      params.push(filterStatus);
    }

    const limit = Math.max(1, Math.min(options?.limit || 50, 100));
    const offset = Math.max(0, options?.offset || 0);

    const whereClause = conditions.join(" AND ");

    // Count query
    const [countRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM workout_assignments wa
       INNER JOIN consultancy_members cm ON cm.id = wa.student_membership_id
       INNER JOIN users u ON u.id = cm.user_id
       INNER JOIN workout_versions wv ON wv.id = wa.workout_version_id
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE ${whereClause};`,
      params
    );
    const total = Number(countRows[0]?.total || 0);

    // List query
    const listParams = [...params, limit, offset];
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
         wa.public_id AS assignment_public_id,
         cm.public_id AS student_membership_public_id,
         u.full_name AS student_name,
         u.email AS student_email,
         w.public_id AS workout_public_id,
         w.title AS workout_title,
         wv.public_id AS assigned_version_public_id,
         wv.version_number AS assigned_version_number,
         latest_pub.public_id AS current_published_version_public_id,
         latest_pub.version_number AS current_published_version_number,
         DATE_FORMAT(wa.starts_on, '%Y-%m-%d') AS starts_on,
         DATE_FORMAT(wa.ends_on, '%Y-%m-%d') AS ends_on,
         wa.status,
         wa.notes_for_student,
         wa.created_at
       FROM workout_assignments wa
       INNER JOIN consultancy_members cm ON cm.id = wa.student_membership_id
       INNER JOIN users u ON u.id = cm.user_id
       INNER JOIN workout_versions wv ON wv.id = wa.workout_version_id
       INNER JOIN workouts w ON w.id = wv.workout_id
       LEFT JOIN (
         SELECT wv2.workout_id, wv2.public_id, wv2.version_number
         FROM workout_versions wv2
         INNER JOIN (
           SELECT workout_id, MAX(version_number) AS max_version
           FROM workout_versions
           WHERE status = 'PUBLISHED'
           GROUP BY workout_id
         ) m ON m.workout_id = wv2.workout_id AND m.max_version = wv2.version_number
         WHERE wv2.status = 'PUBLISHED'
       ) latest_pub ON latest_pub.workout_id = w.id
       WHERE ${whereClause}
       ORDER BY wa.status ASC, wa.starts_on DESC, wa.created_at DESC
       LIMIT ? OFFSET ?;`,
      listParams
    );

    const items: ProfessionalAssignmentListItem[] = rows.map((r) => {
      const assignedVer = Number(r.assigned_version_number);
      const curPubVer = r.current_published_version_number != null ? Number(r.current_published_version_number) : null;
      const hasNewer = curPubVer != null && curPubVer > assignedVer;

      return {
        assignmentPublicId: String(r.assignment_public_id),
        studentMembershipPublicId: String(r.student_membership_public_id),
        studentName: String(r.student_name),
        studentEmail: String(r.student_email),
        workoutPublicId: String(r.workout_public_id),
        workoutTitle: String(r.workout_title),
        assignedVersionPublicId: String(r.assigned_version_public_id),
        assignedVersionNumber: assignedVer,
        currentPublishedVersionPublicId: r.current_published_version_public_id ? String(r.current_published_version_public_id) : null,
        currentPublishedVersionNumber: curPubVer,
        hasNewerPublishedVersion: hasNewer,
        startsOn: String(r.starts_on),
        endsOn: r.ends_on ? String(r.ends_on) : null,
        status: r.status as "ACTIVE" | "ENDED",
        notesForStudent: r.notes_for_student ? String(r.notes_for_student) : null,
        createdAt: new Date(r.created_at),
      };
    });

    return { items, total };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Lists lightweight workout cards for the authenticated student.
 * Zero per-card tree hydration (avoids N+1).
 * Excludes ended/terminated assignments.
 */
export async function listStudentWorkoutCards(
  ctx: TrainingAccessContext
): Promise<StudentWorkoutCardDto[]> {
  assertStudentContext(ctx);

  let connection;
  try {
    connection = await getDbConnection();

    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
         wa.public_id AS assignment_public_id,
         wv.title AS workout_title,
         wv.subtitle,
         wv.objective,
         wv.version_number,
         wv.estimated_duration_minutes,
         wv.difficulty_level,
         DATE_FORMAT(wa.starts_on, '%Y-%m-%d') AS starts_on,
         DATE_FORMAT(wa.ends_on, '%Y-%m-%d') AS ends_on,
         wa.notes_for_student,
         (
           SELECT COUNT(*)
           FROM workout_blocks wb
           WHERE wb.workout_version_id = wv.id
         ) AS block_count
       FROM workout_assignments wa
       INNER JOIN workout_versions wv ON wv.id = wa.workout_version_id
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wa.consultancy_id = ?
         AND wa.student_membership_id = ?
         AND wa.status = 'ACTIVE'
         AND wa.deleted_at IS NULL
         AND w.deleted_at IS NULL
       ORDER BY wa.starts_on DESC, wa.created_at DESC
       LIMIT 50;`,
      [ctx.consultancyId!, ctx.membershipId!]
    );

    return rows.map((r) => ({
      assignmentPublicId: String(r.assignment_public_id),
      workoutTitle: String(r.workout_title),
      subtitle: r.subtitle ? String(r.subtitle) : null,
      objective: r.objective ? String(r.objective) : null,
      versionNumber: Number(r.version_number),
      estimatedDurationMinutes: r.estimated_duration_minutes != null ? Number(r.estimated_duration_minutes) : null,
      difficultyLevel: r.difficulty_level ? String(r.difficulty_level) : null,
      blockCount: Number(r.block_count || 0),
      startsOn: String(r.starts_on),
      endsOn: r.ends_on ? String(r.ends_on) : null,
      notesForStudent: r.notes_for_student ? String(r.notes_for_student) : null,
    }));
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Lists active/historical assignments for the authenticated student.
 */
export async function listAssignmentsForStudent(
  ctx: TrainingAccessContext,
  statusFilter?: WorkoutAssignmentStatus
): Promise<WorkoutAssignmentDto[]> {
  assertStudentContext(ctx);

  let connection;
  try {
    connection = await getDbConnection();
    const conditions = [
      "wa.consultancy_id = ?",
      "wa.student_membership_id = ?",
      "wa.deleted_at IS NULL",
    ];
    const params: (string | number)[] = [ctx.consultancyId!, ctx.membershipId!];

    if (statusFilter) {
      conditions.push("wa.status = ?");
      params.push(statusFilter);
    }

    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        wa.public_id,
        c.public_id AS consultancy_public_id,
        cm.public_id AS student_membership_public_id,
        w.public_id AS workout_public_id,
        wv.public_id AS workout_version_public_id,
        coach.public_id AS assigned_by_membership_public_id,
        DATE_FORMAT(wa.starts_on, '%Y-%m-%d') AS starts_on,
        DATE_FORMAT(wa.ends_on, '%Y-%m-%d') AS ends_on,
        wa.status,
        wa.notes_for_student,
        wa.created_at
      FROM workout_assignments wa
      INNER JOIN consultancies c ON c.id = wa.consultancy_id
      INNER JOIN consultancy_members cm ON cm.id = wa.student_membership_id
      INNER JOIN consultancy_members coach ON coach.id = wa.assigned_by_membership_id
      INNER JOIN workout_versions wv ON wv.id = wa.workout_version_id
      INNER JOIN workouts w ON w.id = wv.workout_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY wa.starts_on DESC, wa.created_at DESC;`,
      params
    );

    const result: WorkoutAssignmentDto[] = [];
    for (const r of rows) {
      const versionTree = await getWorkoutVersionTree(ctx, r.workout_version_public_id);
      if (versionTree) {
        result.push({
          publicId: String(r.public_id),
          consultancyPublicId: String(r.consultancy_public_id),
          studentMembershipPublicId: String(r.student_membership_public_id),
          workoutPublicId: String(r.workout_public_id),
          workoutVersionPublicId: String(r.workout_version_public_id),
          assignedByMembershipPublicId: String(r.assigned_by_membership_public_id),
          startsOn: String(r.starts_on),
          endsOn: r.ends_on ? String(r.ends_on) : null,
          status: r.status as WorkoutAssignmentStatus,
          notesForStudent: r.notes_for_student ? String(r.notes_for_student) : null,
          version: versionTree,
          createdAt: new Date(r.created_at),
        });
      }
    }

    return result;
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Returns the immutable student workout view contract.
 * Uses frozen snapshots from the assigned version. Zero live joins to mutable exercise library rows.
 * Only ACTIVE assignments are visible to students (ENDED assignments return null for student callers).
 */
export async function getStudentWorkoutView(
  ctx: TrainingAccessContext,
  assignmentPublicId: string
): Promise<StudentWorkoutViewContract | null> {
  let connection;
  try {
    connection = await getDbConnection();

    // 1. Fetch assignment and verify ownership and status
    const [assignRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        wa.id,
        wa.public_id,
        wa.status,
        wa.consultancy_id,
        c.name AS consultancy_name,
        wa.student_membership_id,
        DATE_FORMAT(wa.starts_on, '%Y-%m-%d') AS starts_on,
        DATE_FORMAT(wa.ends_on, '%Y-%m-%d') AS ends_on,
        wa.notes_for_student,
        wv.public_id AS workout_version_public_id,
        wv.version_number,
        wv.title,
        wv.subtitle,
        wv.objective,
        wv.estimated_duration_minutes,
        wv.difficulty_level
      FROM workout_assignments wa
      INNER JOIN consultancies c ON c.id = wa.consultancy_id
      INNER JOIN workout_versions wv ON wv.id = wa.workout_version_id
      WHERE wa.public_id = ? AND wa.deleted_at IS NULL
      LIMIT 1;`,
      [assignmentPublicId]
    );

    if (!assignRows || assignRows.length === 0) return null;
    const a = assignRows[0];

    // Tenancy check
    if (ctx.consultancyId && Number(a.consultancy_id) !== ctx.consultancyId) {
      return null;
    }

    // Authorization: student owner or authorized consultancy coach
    const isStudentOwner = ctx.membershipId && Number(a.student_membership_id) === ctx.membershipId;
    const isConsultancyCoach = ctx.consultancyId && Number(a.consultancy_id) === ctx.consultancyId && ctx.canAuthorTraining;

    if (!isStudentOwner && !isConsultancyCoach) {
      return null;
    }

    // For student callers: ENDED assignments are unavailable in active student experience
    if (isStudentOwner && !isConsultancyCoach && a.status !== "ACTIVE") {
      return null;
    }

    // 2. Fetch the frozen version tree
    const versionTree = await getWorkoutVersionTree(ctx, a.workout_version_public_id);
    if (!versionTree) return null;

    return {
      assignmentPublicId: String(a.public_id),
      consultancyName: String(a.consultancy_name),
      startsOn: String(a.starts_on),
      endsOn: a.ends_on ? String(a.ends_on) : null,
      versionNumber: Number(a.version_number),
      title: String(a.title),
      subtitle: a.subtitle ? String(a.subtitle) : null,
      objective: a.objective ? String(a.objective) : null,
      estimatedDurationMinutes: a.estimated_duration_minutes != null ? Number(a.estimated_duration_minutes) : null,
      difficultyLevel: a.difficulty_level ? String(a.difficulty_level) : null,
      notesForStudent: a.notes_for_student ? String(a.notes_for_student) : null,
      blocks: versionTree.blocks,
    };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Repoints an existing assignment to a new PUBLISHED version of the SAME workout routine.
 * Row-locks the assignment. Denies update if assignment is ENDED.
 */
export async function repointAssignmentToNewVersion(
  ctx: TrainingAccessContext,
  assignmentPublicId: string,
  targetVersionPublicId: string
): Promise<boolean> {
  assertCanAuthorTraining(ctx);

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Fetch assignment and lock row
    const [assignRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wa.id, wa.consultancy_id, wa.status, wv.workout_id
       FROM workout_assignments wa
       INNER JOIN workout_versions wv ON wv.id = wa.workout_version_id
       WHERE wa.public_id = ? AND wa.deleted_at IS NULL
       FOR UPDATE;`,
      [assignmentPublicId]
    );

    if (!assignRows || assignRows.length === 0) {
      throw new TrainingAuthorizationError("Prescrição não encontrada.", "NOT_FOUND", 404);
    }
    const a = assignRows[0];
    if (Number(a.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado: prescrição de outra consultoria.", "FORBIDDEN", 403);
    }

    if (a.status !== "ACTIVE") {
      throw new TrainingAuthorizationError(
        "Apenas prescrições ativas podem ter sua versão atualizada.",
        "INVALID_ASSIGNMENT_STATUS",
        400
      );
    }

    // 2. Fetch target version and verify it belongs to the SAME workout_id and is PUBLISHED
    const [vRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wv.id, wv.workout_id, wv.status
       FROM workout_versions wv
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wv.public_id = ? AND w.deleted_at IS NULL
       LIMIT 1
       FOR UPDATE;`,
      [targetVersionPublicId]
    );

    if (!vRows || vRows.length === 0) {
      throw new TrainingAuthorizationError("Versão de destino não encontrada.", "NOT_FOUND", 404);
    }
    const target = vRows[0];

    if (Number(target.workout_id) !== Number(a.workout_id)) {
      throw new TrainingAuthorizationError(
        "A versão de destino deve pertencer à mesma rotina de treino para atualização de versão.",
        "WORKOUT_MISMATCH",
        400
      );
    }

    if (target.status !== "PUBLISHED") {
      throw new TrainingAuthorizationError(
        "Apenas versões publicadas podem ser associadas a alunos.",
        "INVALID_VERSION_STATUS",
        400
      );
    }

    // 3. Update assignment version
    await connection.execute<ResultSetHeader>(
      `UPDATE workout_assignments
       SET workout_version_id = ?, updated_at = NOW(3)
       WHERE id = ?;`,
      [target.id, a.id]
    );

    await connection.commit();
    return true;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Terminates an assignment (Encerrar prescrição).
 * Sets status = 'ENDED', ends_on = requested date or CURRENT_DATE().
 * deleted_at remains NULL. Historical version rows remain intact.
 */
export async function terminateAssignment(
  ctx: TrainingAccessContext,
  assignmentPublicId: string,
  endDate?: string | null
): Promise<boolean> {
  assertCanAuthorTraining(ctx);

  let formattedEndDate: string;
  if (endDate && endDate.trim()) {
    if (!isValidDateString(endDate.trim())) {
      throw new TrainingAuthorizationError("Data de término inválida.", "INVALID_DATE_FORMAT", 400);
    }
    formattedEndDate = endDate.trim();
  } else {
    formattedEndDate = new Date().toISOString().slice(0, 10);
  }

  let connection;
  try {
    connection = await getDbConnection();
    const [res] = await connection.execute<ResultSetHeader>(
      `UPDATE workout_assignments
       SET status = 'ENDED', ends_on = ?, updated_at = NOW(3)
       WHERE public_id = ? AND consultancy_id = ? AND status = 'ACTIVE' AND deleted_at IS NULL;`,
      [formattedEndDate, assignmentPublicId, ctx.consultancyId!]
    );
    return res.affectedRows > 0;
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Updates assignment schedule dates or notes for student.
 */
export async function updateAssignmentScheduleOrNotes(
  ctx: TrainingAccessContext,
  assignmentPublicId: string,
  input: UpdateAssignmentScheduleInput
): Promise<boolean> {
  assertCanAuthorTraining(ctx);

  let connection;
  try {
    connection = await getDbConnection();
    const updates: string[] = [];
    const values: (string | null)[] = [];

    if (input.startsOn !== undefined) {
      if (!isValidDateString(input.startsOn)) {
        throw new TrainingAuthorizationError("Data de início inválida.", "INVALID_DATE_FORMAT", 400);
      }
      updates.push("starts_on = ?");
      values.push(input.startsOn);
    }
    if (input.endsOn !== undefined) {
      if (input.endsOn && !isValidDateString(input.endsOn)) {
        throw new TrainingAuthorizationError("Data de término inválida.", "INVALID_DATE_FORMAT", 400);
      }
      updates.push("ends_on = ?");
      values.push(input.endsOn || null);
    }
    if (input.notesForStudent !== undefined) {
      updates.push("notes_for_student = ?");
      values.push(input.notesForStudent?.trim() || null);
    }

    if (updates.length === 0) return true;

    values.push(assignmentPublicId, String(ctx.consultancyId!));

    const [res] = await connection.execute<ResultSetHeader>(
      `UPDATE workout_assignments
       SET ${updates.join(", ")}, updated_at = NOW(3)
       WHERE public_id = ? AND consultancy_id = ? AND deleted_at IS NULL;`,
      values
    );
    return res.affectedRows > 0;
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Completes or archives an assignment.
 */
export async function completeOrArchiveAssignment(
  ctx: TrainingAccessContext,
  assignmentPublicId: string,
  newStatus: "COMPLETED" | "ARCHIVED"
): Promise<boolean> {
  assertCanAuthorTraining(ctx);

  let connection;
  try {
    connection = await getDbConnection();
    const [res] = await connection.execute<ResultSetHeader>(
      `UPDATE workout_assignments
       SET status = ?, updated_at = NOW(3)
       WHERE public_id = ? AND consultancy_id = ? AND deleted_at IS NULL;`,
      [newStatus, assignmentPublicId, ctx.consultancyId!]
    );
    return res.affectedRows > 0;
  } finally {
    if (connection) connection.release();
  }
}
