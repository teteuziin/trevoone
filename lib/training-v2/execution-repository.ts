/**
 * TREVO ONE — TRAINING V2 EXECUTION REPOSITORY
 * Student workout execution session management, set completion snapshots, and progress tracking.
 * Strictly decoupled from immutable professional prescription domain.
 */

import crypto from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getDbConnection, getDbPool } from "../db/mysql";
import {
  TrainingAuthorizationError,
  type TrainingAccessContext,
  assertStudentContext,
} from "./access";
import type {
  WorkoutExecutionSessionDto,
  WorkoutExecutionSetDto,
  WorkoutExecutionSessionStatus,
  CompleteExecutionSetInput,
  WorkoutSetType,
  WorkoutExecutionHistorySessionDto,
  WorkoutExecutionHistorySetDto,
} from "./types";

function mapExecutionSetRow(r: RowDataPacket): WorkoutExecutionSetDto {
  return {
    publicId: String(r.public_id),
    executionSessionPublicId: r.session_public_id ? String(r.session_public_id) : undefined,
    workoutItemSetId: r.workout_item_set_id != null ? Number(r.workout_item_set_id) : undefined,
    blockItemId: Number(r.block_item_id),
    blockItemPublicId: r.block_item_public_id != null ? String(r.block_item_public_id) : undefined,
    setNumber: Number(r.set_number),
    setType: r.set_type as WorkoutSetType,
    prescribedReps: r.prescribed_reps != null ? Number(r.prescribed_reps) : null,
    prescribedRepsMax: r.prescribed_reps_max != null ? Number(r.prescribed_reps_max) : null,
    prescribedLoadKg: r.prescribed_load_kg != null ? Number(r.prescribed_load_kg) : null,
    prescribedRestSeconds: r.prescribed_rest_seconds != null ? Number(r.prescribed_rest_seconds) : null,
    actualReps: r.actual_reps != null ? Number(r.actual_reps) : null,
    actualLoadKg: r.actual_load_kg != null ? Number(r.actual_load_kg) : null,
    completedAt: r.completed_at ? new Date(r.completed_at) : null,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  };
}

/**
 * Starts or resumes a student workout execution session.
 * Enforces:
 * 1. Strict tenancy and student ownership checks.
 * 2. Active assignment validation.
 * 3. Concurrency-safe single IN_PROGRESS session per assignment via row lock.
 * 4. Automatic cloning of prescribed sets into execution snapshots.
 */
export async function startOrResumeWorkoutExecution(
  ctx: TrainingAccessContext,
  assignmentPublicId: string
): Promise<WorkoutExecutionSessionDto> {
  assertStudentContext(ctx);

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Lock and validate assignment row
    const [assignRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        wa.id,
        wa.public_id,
        wa.consultancy_id,
        wa.student_membership_id,
        wa.workout_version_id,
        wa.status,
        wv.public_id AS version_public_id
       FROM workout_assignments wa
       INNER JOIN workout_versions wv ON wv.id = wa.workout_version_id
       WHERE wa.public_id = ? AND wa.deleted_at IS NULL
       LIMIT 1
       FOR UPDATE;`,
      [assignmentPublicId]
    );

    if (!assignRows || assignRows.length === 0) {
      throw new TrainingAuthorizationError("Prescrição de treino não encontrada.", "NOT_FOUND", 404);
    }

    const a = assignRows[0];

    // Tenancy isolation
    if (Number(a.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado: consultoria incompatível.", "FORBIDDEN", 403);
    }

    // Student ownership
    if (Number(a.student_membership_id) !== ctx.membershipId) {
      throw new TrainingAuthorizationError("Acesso negado: prescrição não pertence a este aluno.", "FORBIDDEN", 403);
    }

    // Must be an active assignment
    if (a.status !== "ACTIVE") {
      throw new TrainingAuthorizationError(
        "Apenas prescrições ativas podem ser iniciadas para execução.",
        "INVALID_ASSIGNMENT_STATUS",
        400
      );
    }

    // 2. Check for an existing IN_PROGRESS execution session for this assignment
    const [existingSessions] = await connection.execute<RowDataPacket[]>(
      `SELECT
        wes.id,
        wes.public_id,
        wes.consultancy_id,
        wes.student_membership_id,
        wes.workout_assignment_id,
        wes.workout_version_id,
        wes.status,
        wes.started_at,
        wes.completed_at,
        wes.created_at,
        wes.updated_at
       FROM workout_execution_sessions wes
       WHERE wes.workout_assignment_id = ? AND wes.status = 'IN_PROGRESS'
       LIMIT 1
       FOR UPDATE;`,
      [a.id]
    );

    if (existingSessions && existingSessions.length > 0) {
      const activeSession = existingSessions[0];

      // Fetch sets for existing active session
      const [setRows] = await connection.execute<RowDataPacket[]>(
        `SELECT
          wex.id,
          wex.public_id,
          wex.execution_session_id,
          wex.workout_item_set_id,
          wex.block_item_id,
          wbi.public_id AS block_item_public_id,
          wex.set_number,
          wex.set_type,
          wex.prescribed_reps,
          wex.prescribed_reps_max,
          wex.prescribed_load_kg,
          wex.prescribed_rest_seconds,
          wex.actual_reps,
          wex.actual_load_kg,
          wex.completed_at,
          wex.created_at,
          wex.updated_at
         FROM workout_execution_sets wex
         INNER JOIN workout_block_items wbi ON wbi.id = wex.block_item_id
         WHERE wex.execution_session_id = ?
         ORDER BY wex.set_number ASC;`,
        [activeSession.id]
      );

      await connection.commit();

      return {
        publicId: String(activeSession.public_id),
        consultancyId: Number(activeSession.consultancy_id),
        studentMembershipId: Number(activeSession.student_membership_id),
        workoutAssignmentPublicId: String(a.public_id),
        workoutVersionPublicId: String(a.version_public_id),
        status: activeSession.status as WorkoutExecutionSessionStatus,
        startedAt: new Date(activeSession.started_at),
        completedAt: activeSession.completed_at ? new Date(activeSession.completed_at) : null,
        createdAt: new Date(activeSession.created_at),
        updatedAt: new Date(activeSession.updated_at),
        sets: setRows.map(mapExecutionSetRow),
      };
    }

    // 3. No IN_PROGRESS session: create a new session and snapshot all prescribed sets
    const [prescribedSets] = await connection.execute<RowDataPacket[]>(
      `SELECT
        wis.id AS workout_item_set_id,
        wis.block_item_id,
        wbi.public_id AS block_item_public_id,
        wis.set_number,
        wis.set_type,
        wis.target_reps,
        wis.target_reps_max,
        wis.target_load_kg,
        wis.target_rest_seconds
       FROM workout_blocks wb
       INNER JOIN workout_block_items wbi ON wbi.block_id = wb.id
       INNER JOIN workout_item_sets wis ON wis.block_item_id = wbi.id
       WHERE wb.workout_version_id = ?
       ORDER BY wb.sort_order ASC, wbi.sort_order ASC, wis.set_number ASC;`,
      [a.workout_version_id]
    );

    if (!prescribedSets || prescribedSets.length === 0) {
      throw new TrainingAuthorizationError(
        "A rotina prescrita não possui séries para execução.",
        "WORKOUT_HAS_NO_EXECUTABLE_SETS",
        400
      );
    }

    const sessionPublicId = crypto.randomUUID();

    const [insertSessionRes] = await connection.execute<ResultSetHeader>(
      `INSERT INTO workout_execution_sessions (
        public_id,
        consultancy_id,
        student_membership_id,
        workout_assignment_id,
        workout_version_id,
        status,
        started_at
      ) VALUES (?, ?, ?, ?, ?, 'IN_PROGRESS', NOW(3));`,
      [sessionPublicId, ctx.consultancyId!, ctx.membershipId!, a.id, a.workout_version_id]
    );

    const sessionId = insertSessionRes.insertId;

    // Snapshot each prescribed set
    const createdSets: WorkoutExecutionSetDto[] = [];
    for (const ps of prescribedSets) {
      const setPublicId = crypto.randomUUID();
      await connection.execute<ResultSetHeader>(
        `INSERT INTO workout_execution_sets (
          public_id,
          execution_session_id,
          workout_item_set_id,
          block_item_id,
          set_number,
          set_type,
          prescribed_reps,
          prescribed_reps_max,
          prescribed_load_kg,
          prescribed_rest_seconds
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          setPublicId,
          sessionId,
          ps.workout_item_set_id,
          ps.block_item_id,
          ps.set_number,
          ps.set_type,
          ps.target_reps,
          ps.target_reps_max,
          ps.target_load_kg,
          ps.target_rest_seconds,
        ]
      );

      const now = new Date();
      createdSets.push({
        publicId: setPublicId,
        workoutItemSetId: Number(ps.workout_item_set_id),
        blockItemId: Number(ps.block_item_id),
        blockItemPublicId: String(ps.block_item_public_id),
        setNumber: Number(ps.set_number),
        setType: ps.set_type as WorkoutSetType,
        prescribedReps: ps.target_reps != null ? Number(ps.target_reps) : null,
        prescribedRepsMax: ps.target_reps_max != null ? Number(ps.target_reps_max) : null,
        prescribedLoadKg: ps.target_load_kg != null ? Number(ps.target_load_kg) : null,
        prescribedRestSeconds: ps.target_rest_seconds != null ? Number(ps.target_rest_seconds) : null,
        actualReps: null,
        actualLoadKg: null,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      });
    }

    await connection.commit();

    const now = new Date();
    return {
      publicId: sessionPublicId,
      consultancyId: ctx.consultancyId!,
      studentMembershipId: ctx.membershipId!,
      workoutAssignmentPublicId: String(a.public_id),
      workoutVersionPublicId: String(a.version_public_id),
      status: "IN_PROGRESS",
      startedAt: now,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
      sets: createdSets,
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Resolves the currently active (IN_PROGRESS) execution session for an assignment.
 * Used by the student workout view on initial server-render.
 * Validates consultancy tenancy and student ownership.
 */
export async function getActiveStudentWorkoutExecution(
  ctx: TrainingAccessContext,
  assignmentPublicId: string
): Promise<WorkoutExecutionSessionDto | null> {
  let connection;
  try {
    connection = await getDbConnection();

    const [sessionRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        wes.id,
        wes.public_id,
        wes.consultancy_id,
        wes.student_membership_id,
        wes.status,
        wes.started_at,
        wes.completed_at,
        wes.created_at,
        wes.updated_at,
        wa.public_id AS assignment_public_id,
        wv.public_id AS version_public_id
       FROM workout_execution_sessions wes
       INNER JOIN workout_assignments wa ON wa.id = wes.workout_assignment_id
       INNER JOIN workout_versions wv ON wv.id = wes.workout_version_id
       WHERE wa.public_id = ?
         AND wes.status = 'IN_PROGRESS'
         AND wa.deleted_at IS NULL
       LIMIT 1;`,
      [assignmentPublicId]
    );

    if (!sessionRows || sessionRows.length === 0) return null;
    const s = sessionRows[0];

    // Tenancy isolation
    if (ctx.consultancyId && Number(s.consultancy_id) !== ctx.consultancyId) {
      return null;
    }

    // Ownership check: student owner or coach/admin in same consultancy
    const isStudentOwner = ctx.membershipId && Number(s.student_membership_id) === ctx.membershipId;
    const isCoachOrAdmin =
      ctx.consultancyId &&
      Number(s.consultancy_id) === ctx.consultancyId &&
      (ctx.canAuthorTraining || ctx.canManageConsultancy);

    if (!isStudentOwner && !isCoachOrAdmin) {
      return null;
    }

    const [setRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        wex.id,
        wex.public_id,
        wex.execution_session_id,
        wex.workout_item_set_id,
        wex.block_item_id,
        wbi.public_id AS block_item_public_id,
        wex.set_number,
        wex.set_type,
        wex.prescribed_reps,
        wex.prescribed_reps_max,
        wex.prescribed_load_kg,
        wex.prescribed_rest_seconds,
        wex.actual_reps,
        wex.actual_load_kg,
        wex.completed_at,
        wex.created_at,
        wex.updated_at
       FROM workout_execution_sets wex
       INNER JOIN workout_block_items wbi ON wbi.id = wex.block_item_id
       WHERE wex.execution_session_id = ?
       ORDER BY wex.set_number ASC;`,
      [s.id]
    );

    return {
      publicId: String(s.public_id),
      consultancyId: Number(s.consultancy_id),
      studentMembershipId: Number(s.student_membership_id),
      workoutAssignmentPublicId: String(s.assignment_public_id),
      workoutVersionPublicId: String(s.version_public_id),
      status: s.status as WorkoutExecutionSessionStatus,
      startedAt: new Date(s.started_at),
      completedAt: s.completed_at ? new Date(s.completed_at) : null,
      createdAt: new Date(s.created_at),
      updatedAt: new Date(s.updated_at),
      sets: setRows.map(mapExecutionSetRow),
    };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Resolves the active (IN_PROGRESS) or most recent COMPLETED execution session for an assignment.
 * Prioritizes IN_PROGRESS session if one exists, otherwise returns the most recently completed session.
 * Used by the student workout view on initial server-render to preserve completion state across refresh/re-entry.
 * Validates consultancy tenancy and student ownership.
 */
export async function getActiveOrLatestStudentWorkoutExecution(
  ctx: TrainingAccessContext,
  assignmentPublicId: string
): Promise<WorkoutExecutionSessionDto | null> {
  let connection;
  try {
    connection = await getDbConnection();

    const [sessionRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        wes.id,
        wes.public_id,
        wes.consultancy_id,
        wes.student_membership_id,
        wes.status,
        wes.started_at,
        wes.completed_at,
        wes.created_at,
        wes.updated_at,
        wa.public_id AS assignment_public_id,
        wv.public_id AS version_public_id
       FROM workout_execution_sessions wes
       INNER JOIN workout_assignments wa ON wa.id = wes.workout_assignment_id
       INNER JOIN workout_versions wv ON wv.id = wes.workout_version_id
       WHERE wa.public_id = ?
         AND wa.deleted_at IS NULL
         AND wes.status IN ('IN_PROGRESS', 'COMPLETED')
       ORDER BY
         CASE WHEN wes.status = 'IN_PROGRESS' THEN 0 ELSE 1 END ASC,
         wes.completed_at DESC,
         wes.created_at DESC
       LIMIT 1;`,
      [assignmentPublicId]
    );

    if (!sessionRows || sessionRows.length === 0) return null;
    const s = sessionRows[0];

    // Tenancy isolation
    if (ctx.consultancyId && Number(s.consultancy_id) !== ctx.consultancyId) {
      return null;
    }

    // Ownership check: student owner or coach/admin in same consultancy
    const isStudentOwner = ctx.membershipId && Number(s.student_membership_id) === ctx.membershipId;
    const isCoachOrAdmin =
      ctx.consultancyId &&
      Number(s.consultancy_id) === ctx.consultancyId &&
      (ctx.canAuthorTraining || ctx.canManageConsultancy);

    if (!isStudentOwner && !isCoachOrAdmin) {
      return null;
    }

    const [setRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        wex.id,
        wex.public_id,
        wex.execution_session_id,
        wex.workout_item_set_id,
        wex.block_item_id,
        wbi.public_id AS block_item_public_id,
        wex.set_number,
        wex.set_type,
        wex.prescribed_reps,
        wex.prescribed_reps_max,
        wex.prescribed_load_kg,
        wex.prescribed_rest_seconds,
        wex.actual_reps,
        wex.actual_load_kg,
        wex.completed_at,
        wex.created_at,
        wex.updated_at
       FROM workout_execution_sets wex
       INNER JOIN workout_block_items wbi ON wbi.id = wex.block_item_id
       WHERE wex.execution_session_id = ?
       ORDER BY wex.set_number ASC;`,
      [s.id]
    );

    return {
      publicId: String(s.public_id),
      consultancyId: Number(s.consultancy_id),
      studentMembershipId: Number(s.student_membership_id),
      workoutAssignmentPublicId: String(s.assignment_public_id),
      workoutVersionPublicId: String(s.version_public_id),
      status: s.status as WorkoutExecutionSessionStatus,
      startedAt: new Date(s.started_at),
      completedAt: s.completed_at ? new Date(s.completed_at) : null,
      createdAt: new Date(s.created_at),
      updatedAt: new Date(s.updated_at),
      sets: setRows.map(mapExecutionSetRow),
    };
  } finally {
    if (connection) connection.release();
  }
}


/**
 * Fetches an execution session by its public_id.
 * Validates consultancy tenancy and student ownership (or authorized coach viewing).
 */
export async function getStudentWorkoutExecution(
  ctx: TrainingAccessContext,
  sessionPublicId: string
): Promise<WorkoutExecutionSessionDto | null> {
  let connection;
  try {
    connection = await getDbConnection();

    const [sessionRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        wes.id,
        wes.public_id,
        wes.consultancy_id,
        wes.student_membership_id,
        wes.status,
        wes.started_at,
        wes.completed_at,
        wes.created_at,
        wes.updated_at,
        wa.public_id AS assignment_public_id,
        wv.public_id AS version_public_id
       FROM workout_execution_sessions wes
       INNER JOIN workout_assignments wa ON wa.id = wes.workout_assignment_id
       INNER JOIN workout_versions wv ON wv.id = wes.workout_version_id
       WHERE wes.public_id = ?
       LIMIT 1;`,
      [sessionPublicId]
    );

    if (!sessionRows || sessionRows.length === 0) return null;
    const s = sessionRows[0];

    // Tenancy isolation
    if (ctx.consultancyId && Number(s.consultancy_id) !== ctx.consultancyId) {
      return null;
    }

    // Ownership check: student owner or coach/admin in same consultancy
    const isStudentOwner = ctx.membershipId && Number(s.student_membership_id) === ctx.membershipId;
    const isCoachOrAdmin = ctx.consultancyId && Number(s.consultancy_id) === ctx.consultancyId && (ctx.canAuthorTraining || ctx.canManageConsultancy);

    if (!isStudentOwner && !isCoachOrAdmin) {
      return null;
    }

    const [setRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        wex.id,
        wex.public_id,
        wex.execution_session_id,
        wex.workout_item_set_id,
        wex.block_item_id,
        wbi.public_id AS block_item_public_id,
        wex.set_number,
        wex.set_type,
        wex.prescribed_reps,
        wex.prescribed_reps_max,
        wex.prescribed_load_kg,
        wex.prescribed_rest_seconds,
        wex.actual_reps,
        wex.actual_load_kg,
        wex.completed_at,
        wex.created_at,
        wex.updated_at
       FROM workout_execution_sets wex
       INNER JOIN workout_block_items wbi ON wbi.id = wex.block_item_id
       WHERE wex.execution_session_id = ?
       ORDER BY wex.set_number ASC;`,
      [s.id]
    );

    return {
      publicId: String(s.public_id),
      consultancyId: Number(s.consultancy_id),
      studentMembershipId: Number(s.student_membership_id),
      workoutAssignmentPublicId: String(s.assignment_public_id),
      workoutVersionPublicId: String(s.version_public_id),
      status: s.status as WorkoutExecutionSessionStatus,
      startedAt: new Date(s.started_at),
      completedAt: s.completed_at ? new Date(s.completed_at) : null,
      createdAt: new Date(s.created_at),
      updatedAt: new Date(s.updated_at),
      sets: setRows.map(mapExecutionSetRow),
    };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Marks an individual execution set completed.
 * Idempotent: repeated calls do NOT reset completed_at or duplicate records.
 * Prescription is NEVER mutated; only workout_execution_sets is updated.
 */
export async function completeWorkoutExecutionSet(
  ctx: TrainingAccessContext,
  sessionPublicId: string,
  setPublicId: string,
  input: CompleteExecutionSetInput
): Promise<WorkoutExecutionSetDto> {
  assertStudentContext(ctx);

  if (input == null || typeof input !== "object") {
    throw new TrainingAuthorizationError(
      "Dados de realização da série são obrigatórios.",
      "INVALID_INPUT",
      400
    );
  }

  // Validate actualReps (strictly mandatory)
  if (input.actualReps === undefined || input.actualReps === null) {
    throw new TrainingAuthorizationError(
      "Informe o número de repetições realizadas.",
      "INVALID_ACTUAL_REPS",
      400
    );
  }
  if (
    typeof input.actualReps !== "number" ||
    !Number.isFinite(input.actualReps) ||
    !Number.isInteger(input.actualReps) ||
    input.actualReps < 0 ||
    input.actualReps > 65535
  ) {
    throw new TrainingAuthorizationError(
      "Valor inválido de repetições realizadas (esperado número inteiro entre 0 e 65535).",
      "INVALID_ACTUAL_REPS",
      400
    );
  }

  // Validate actualLoadKg (null or number between 0 and 9999.99 with at most 2 decimals)
  if (input.actualLoadKg !== null) {
    if (
      typeof input.actualLoadKg !== "number" ||
      !Number.isFinite(input.actualLoadKg) ||
      input.actualLoadKg < 0 ||
      input.actualLoadKg > 9999.99
    ) {
      throw new TrainingAuthorizationError(
        "Valor inválido de carga realizada (esperado entre 0 e 9999.99 kg).",
        "INVALID_ACTUAL_LOAD",
        400
      );
    }
    const rounded = Math.round(input.actualLoadKg * 100) / 100;
    if (Math.abs(input.actualLoadKg - rounded) > 1e-7) {
      throw new TrainingAuthorizationError(
        "Carga deve ter no máximo 2 casas decimais.",
        "INVALID_ACTUAL_LOAD",
        400
      );
    }
  }

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Lock and validate session
    const [sessionRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, consultancy_id, student_membership_id, status
       FROM workout_execution_sessions
       WHERE public_id = ?
       LIMIT 1
       FOR UPDATE;`,
      [sessionPublicId]
    );

    if (!sessionRows || sessionRows.length === 0) {
      throw new TrainingAuthorizationError("Sessão de treino não encontrada.", "NOT_FOUND", 404);
    }

    const session = sessionRows[0];

    if (Number(session.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado: sessão de outra consultoria.", "FORBIDDEN", 403);
    }

    if (Number(session.student_membership_id) !== ctx.membershipId) {
      throw new TrainingAuthorizationError("Acesso negado: sessão pertence a outro aluno.", "FORBIDDEN", 403);
    }

    if (session.status !== "IN_PROGRESS") {
      throw new TrainingAuthorizationError(
        "Séries só podem ser concluídas em uma sessão de treino em andamento.",
        "INVALID_SESSION_STATUS",
        400
      );
    }

    // 2. Lock and validate execution set
    const [setRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        wex.id,
        wex.public_id,
        wex.execution_session_id,
        wex.workout_item_set_id,
        wex.block_item_id,
        wbi.public_id AS block_item_public_id,
        wex.set_number,
        wex.set_type,
        wex.prescribed_reps,
        wex.prescribed_reps_max,
        wex.prescribed_load_kg,
        wex.prescribed_rest_seconds,
        wex.actual_reps,
        wex.actual_load_kg,
        wex.completed_at,
        wex.created_at,
        wex.updated_at
       FROM workout_execution_sets wex
       INNER JOIN workout_block_items wbi ON wbi.id = wex.block_item_id
       WHERE wex.public_id = ? AND wex.execution_session_id = ?
       LIMIT 1
       FOR UPDATE;`,
      [setPublicId, session.id]
    );

    if (!setRows || setRows.length === 0) {
      throw new TrainingAuthorizationError("Série de execução não encontrada nesta sessão.", "NOT_FOUND", 404);
    }

    const targetSet = setRows[0];

    // 3. Apply completion idempotently: atomic update of completed_at, actual_reps and actual_load_kg
    const now = new Date();
    const actualReps = input.actualReps;
    const actualLoadKg =
      input.actualLoadKg !== null
        ? Math.round(input.actualLoadKg * 100) / 100
        : null;

    if (targetSet.completed_at == null) {
      // First completion: atomically persist completed_at, actual_reps, and actual_load_kg
      await connection.execute<ResultSetHeader>(
        `UPDATE workout_execution_sets
         SET completed_at = ?, actual_reps = ?, actual_load_kg = ?, updated_at = NOW(3)
         WHERE id = ?;`,
        [now, actualReps, actualLoadKg, targetSet.id]
      );
      targetSet.completed_at = now;
      targetSet.actual_reps = actualReps;
      targetSet.actual_load_kg = actualLoadKg;
      targetSet.updated_at = now;
    }
    // If targetSet.completed_at != null, already completed: idempotent no-op, preserving existing completion

    await connection.commit();

    return {
      publicId: String(targetSet.public_id),
      executionSessionPublicId: sessionPublicId,
      workoutItemSetId: targetSet.workout_item_set_id != null ? Number(targetSet.workout_item_set_id) : undefined,
      blockItemId: Number(targetSet.block_item_id),
      blockItemPublicId: targetSet.block_item_public_id != null ? String(targetSet.block_item_public_id) : undefined,
      setNumber: Number(targetSet.set_number),
      setType: targetSet.set_type as WorkoutSetType,
      prescribedReps: targetSet.prescribed_reps != null ? Number(targetSet.prescribed_reps) : null,
      prescribedRepsMax: targetSet.prescribed_reps_max != null ? Number(targetSet.prescribed_reps_max) : null,
      prescribedLoadKg: targetSet.prescribed_load_kg != null ? Number(targetSet.prescribed_load_kg) : null,
      prescribedRestSeconds: targetSet.prescribed_rest_seconds != null ? Number(targetSet.prescribed_rest_seconds) : null,
      actualReps: targetSet.actual_reps != null ? Number(targetSet.actual_reps) : null,
      actualLoadKg: targetSet.actual_load_kg != null ? Number(targetSet.actual_load_kg) : null,
      completedAt: targetSet.completed_at ? new Date(targetSet.completed_at) : null,
      createdAt: new Date(targetSet.created_at),
      updatedAt: new Date(targetSet.updated_at),
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Completes a workout execution session.
 * Guards:
 * - Every prescribed execution set must be marked completed first.
 * - Rejects completion if pending sets remain.
 * - Idempotent: repeated call on a COMPLETED session returns safe completed state.
 * - Leaves assignment intact.
 */
export async function completeWorkoutExecution(
  ctx: TrainingAccessContext,
  sessionPublicId: string
): Promise<WorkoutExecutionSessionDto> {
  assertStudentContext(ctx);

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Lock and validate session
    const [sessionRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        wes.id,
        wes.public_id,
        wes.consultancy_id,
        wes.student_membership_id,
        wes.status,
        wes.started_at,
        wes.completed_at,
        wes.created_at,
        wes.updated_at,
        wa.public_id AS assignment_public_id,
        wv.public_id AS version_public_id
       FROM workout_execution_sessions wes
       INNER JOIN workout_assignments wa ON wa.id = wes.workout_assignment_id
       INNER JOIN workout_versions wv ON wv.id = wes.workout_version_id
       WHERE wes.public_id = ?
       LIMIT 1
       FOR UPDATE;`,
      [sessionPublicId]
    );

    if (!sessionRows || sessionRows.length === 0) {
      throw new TrainingAuthorizationError("Sessão de treino não encontrada.", "NOT_FOUND", 404);
    }

    const s = sessionRows[0];

    if (Number(s.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado: sessão de outra consultoria.", "FORBIDDEN", 403);
    }

    if (Number(s.student_membership_id) !== ctx.membershipId) {
      throw new TrainingAuthorizationError("Acesso negado: sessão pertence a outro aluno.", "FORBIDDEN", 403);
    }

    // Idempotent: already completed
    if (s.status === "COMPLETED") {
      const [setRows] = await connection.execute<RowDataPacket[]>(
        `SELECT wex.*, wbi.public_id AS block_item_public_id
         FROM workout_execution_sets wex
         INNER JOIN workout_block_items wbi ON wbi.id = wex.block_item_id
         WHERE wex.execution_session_id = ?
         ORDER BY wex.set_number ASC;`,
        [s.id]
      );
      await connection.commit();
      return {
        publicId: String(s.public_id),
        consultancyId: Number(s.consultancy_id),
        studentMembershipId: Number(s.student_membership_id),
        workoutAssignmentPublicId: String(s.assignment_public_id),
        workoutVersionPublicId: String(s.version_public_id),
        status: "COMPLETED",
        startedAt: new Date(s.started_at),
        completedAt: s.completed_at ? new Date(s.completed_at) : new Date(),
        createdAt: new Date(s.created_at),
        updatedAt: new Date(s.updated_at),
        sets: setRows.map(mapExecutionSetRow),
      };
    }

    // 2. Pending sets guard: reject if any set is not completed
    const [pendingRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS pending_count
       FROM workout_execution_sets
       WHERE execution_session_id = ? AND completed_at IS NULL;`,
      [s.id]
    );

    const pendingCount = Number(pendingRows[0]?.pending_count || 0);
    if (pendingCount > 0) {
      throw new TrainingAuthorizationError(
        `Não é possível finalizar o treino com ${pendingCount} ${pendingCount === 1 ? "série pendente" : "séries pendentes"}.`,
        "WORKOUT_EXECUTION_HAS_PENDING_SETS",
        400
      );
    }

    // 3. Mark session COMPLETED
    const now = new Date();
    await connection.execute<ResultSetHeader>(
      `UPDATE workout_execution_sessions
       SET status = 'COMPLETED', completed_at = NOW(3), updated_at = NOW(3)
       WHERE id = ?;`,
      [s.id]
    );

    const [setRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wex.*, wbi.public_id AS block_item_public_id
       FROM workout_execution_sets wex
       INNER JOIN workout_block_items wbi ON wbi.id = wex.block_item_id
       WHERE wex.execution_session_id = ?
       ORDER BY wex.set_number ASC;`,
      [s.id]
    );

    await connection.commit();

    return {
      publicId: String(s.public_id),
      consultancyId: Number(s.consultancy_id),
      studentMembershipId: Number(s.student_membership_id),
      workoutAssignmentPublicId: String(s.assignment_public_id),
      workoutVersionPublicId: String(s.version_public_id),
      status: "COMPLETED",
      startedAt: new Date(s.started_at),
      completedAt: now,
      createdAt: new Date(s.created_at),
      updatedAt: now,
      sets: setRows.map(mapExecutionSetRow),
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Lists previous COMPLETED workout execution sessions for a specific assignment.
 * Read-only, ordered newest first (completed_at DESC, created_at DESC).
 * Zero N+1: executed in maximum 2 batch queries (sessions + execution sets in lote).
 */
export async function listStudentWorkoutExecutionHistory(
  ctx: TrainingAccessContext,
  assignmentPublicId: string,
  limit: number = 20
): Promise<WorkoutExecutionHistorySessionDto[]> {
  assertStudentContext(ctx);

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    // 1. Validate assignment ownership and tenancy
    const [assignRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, consultancy_id, student_membership_id
       FROM workout_assignments
       WHERE public_id = ? AND deleted_at IS NULL
       LIMIT 1;`,
      [assignmentPublicId]
    );

    if (!assignRows || assignRows.length === 0) {
      throw new TrainingAuthorizationError(
        "Prescrição de treino não encontrada.",
        "NOT_FOUND",
        404
      );
    }

    const assign = assignRows[0];
    if (Number(assign.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError(
        "Acesso negado: prescrição de outra consultoria.",
        "FORBIDDEN",
        403
      );
    }

    if (Number(assign.student_membership_id) !== ctx.membershipId) {
      throw new TrainingAuthorizationError(
        "Acesso negado: prescrição pertence a outro aluno.",
        "FORBIDDEN",
        403
      );
    }

    // 2. Fetch COMPLETED sessions for this assignment (newest first, limit bounded)
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const [sessionRows] = await connection.query<RowDataPacket[]>(
      `SELECT id, public_id, started_at, completed_at
       FROM workout_execution_sessions
       WHERE workout_assignment_id = ? AND status = 'COMPLETED'
       ORDER BY completed_at DESC, created_at DESC
       LIMIT ?;`,
      [assign.id, safeLimit]
    );

    if (!sessionRows || sessionRows.length === 0) {
      return [];
    }

    // 3. Batch fetch all execution sets for these sessions in ONE single query (zero N+1)
    const sessionIds = sessionRows.map((s) => Number(s.id));
    const [setRows] = await connection.query<RowDataPacket[]>(
      `SELECT
        wex.public_id,
        wex.execution_session_id,
        wex.set_number,
        wex.set_type,
        wex.prescribed_reps,
        wex.prescribed_reps_max,
        wex.prescribed_load_kg,
        wex.prescribed_rest_seconds,
        wex.actual_reps,
        wex.actual_load_kg,
        wex.completed_at,
        wbi.public_id AS block_item_public_id,
        wbi.exercise_name_snapshot
       FROM workout_execution_sets wex
       INNER JOIN workout_block_items wbi ON wbi.id = wex.block_item_id
       WHERE wex.execution_session_id IN (?)
       ORDER BY wex.execution_session_id ASC, wex.set_number ASC;`,
      [sessionIds]
    );

    // Group sets by execution_session_id
    const setsBySessionId = new Map<number, WorkoutExecutionHistorySetDto[]>();
    for (const r of setRows) {
      const sId = Number(r.execution_session_id);
      if (!setsBySessionId.has(sId)) {
        setsBySessionId.set(sId, []);
      }
      setsBySessionId.get(sId)!.push({
        publicId: String(r.public_id),
        setNumber: Number(r.set_number),
        exerciseName: String(r.exercise_name_snapshot || "Exercício"),
        blockItemPublicId: r.block_item_public_id ? String(r.block_item_public_id) : undefined,
        setType: r.set_type as WorkoutSetType,
        prescribedReps: r.prescribed_reps != null ? Number(r.prescribed_reps) : null,
        prescribedRepsMax: r.prescribed_reps_max != null ? Number(r.prescribed_reps_max) : null,
        prescribedLoadKg: r.prescribed_load_kg != null ? Number(r.prescribed_load_kg) : null,
        prescribedRestSeconds: r.prescribed_rest_seconds != null ? Number(r.prescribed_rest_seconds) : null,
        actualReps: r.actual_reps != null ? Number(r.actual_reps) : null,
        actualLoadKg: r.actual_load_kg != null ? Number(r.actual_load_kg) : null,
        completedAt: r.completed_at ? new Date(r.completed_at) : null,
      });
    }

    return sessionRows.map((s) => ({
      publicId: String(s.public_id),
      startedAt: new Date(s.started_at),
      completedAt: s.completed_at ? new Date(s.completed_at) : null,
      sets: setsBySessionId.get(Number(s.id)) || [],
    }));
  } finally {
    connection.release();
  }
}
