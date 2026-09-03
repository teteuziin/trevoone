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

/**
 * Creates an assignment binding a PUBLISHED workout version to a student membership.
 * Enforces strict consultancy tenant consistency and verifies the target is a genuine student.
 */
export async function createAssignment(
  ctx: TrainingAccessContext,
  input: CreateAssignmentInput
): Promise<WorkoutAssignmentDto> {
  assertCanAuthorTraining(ctx);

  let connection;
  try {
    connection = await getDbConnection();

    // 1. Verify target student membership belongs to current consultancy and possesses the 'STUDENT' role
    const [studentRows] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id, cm.public_id, cm.consultancy_id, cmr.role
       FROM consultancy_members cm
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.public_id = ? AND cm.consultancy_id = ? AND cm.status = 'ACTIVE' AND cmr.role = 'STUDENT'
       LIMIT 1;`,
      [input.studentMembershipPublicId, ctx.consultancyId!]
    );

    if (!studentRows || studentRows.length === 0) {
      throw new TrainingAuthorizationError(
        "Membro de aluno não encontrado nesta consultoria ou não possui papel de aluno.",
        "INVALID_STUDENT_MEMBERSHIP",
        404
      );
    }
    const student = studentRows[0];

    // 2. Verify workout version belongs to a workout in the current consultancy and is PUBLISHED
    const [vRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wv.id, wv.public_id, wv.status, w.id AS workout_id, w.public_id AS workout_public_id, w.consultancy_id
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

    if (v.status !== "PUBLISHED") {
      throw new TrainingAuthorizationError(
        "Apenas versões de treino publicadas (PUBLISHED) podem ser prescritas para alunos.",
        "INVALID_VERSION_STATUS",
        400
      );
    }

    // 3. Insert assignment
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
        input.startsOn,
        input.endsOn || null,
        input.notesForStudent?.trim() || null,
      ]
    );

    const versionTree = await getWorkoutVersionTree(ctx, v.public_id);

    return {
      publicId: assignmentPublicId,
      consultancyPublicId: ctx.consultancyPublicId!,
      studentMembershipPublicId: input.studentMembershipPublicId,
      workoutPublicId: v.workout_public_id,
      workoutVersionPublicId: v.public_id,
      assignedByMembershipPublicId: ctx.membershipPublicId!,
      startsOn: input.startsOn,
      endsOn: input.endsOn || null,
      status: "ACTIVE",
      notesForStudent: input.notesForStudent?.trim() || null,
      version: versionTree!,
      createdAt: new Date(),
    };
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
 */
export async function getStudentWorkoutView(
  ctx: TrainingAccessContext,
  assignmentPublicId: string
): Promise<StudentWorkoutViewContract | null> {
  let connection;
  try {
    connection = await getDbConnection();

    // 1. Fetch assignment and verify ownership
    const [assignRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        wa.id,
        wa.public_id,
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

    // Authorization: student owner or authorized consultancy coach
    const isStudentOwner = ctx.membershipId && Number(a.student_membership_id) === ctx.membershipId;
    const isConsultancyCoach = ctx.consultancyId && Number(a.consultancy_id) === ctx.consultancyId && ctx.canAuthorTraining;

    if (!isStudentOwner && !isConsultancyCoach) {
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
      `SELECT wa.id, wa.consultancy_id, wv.workout_id
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

    // 2. Fetch target version and verify it belongs to the SAME workout_id and is PUBLISHED
    const [vRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, workout_id, status FROM workout_versions WHERE public_id = ? LIMIT 1;`,
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
      updates.push("starts_on = ?");
      values.push(input.startsOn);
    }
    if (input.endsOn !== undefined) {
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
