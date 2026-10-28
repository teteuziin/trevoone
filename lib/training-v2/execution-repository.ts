/**
 * TREVO ONE — TRAINING V2 EXECUTION REPOSITORY
 * Student workout execution session management, set completion snapshots, and progress tracking.
 * Strictly decoupled from immutable professional prescription domain.
 */

import crypto from "node:crypto";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getDbConnection, getDbPool } from "../db/mysql";
import {
  TrainingAuthorizationError,
  type TrainingAccessContext,
  assertStudentContext,
} from "./access";
import {
  createNotificationInTransaction,
  deliverNotificationAfterCommit,
} from "@/services/notification-service";
import { isMissingColumnError, isMissingTableError } from "./schema-resilience";
export class TrainingSessionConflictError extends Error {
  public readonly code = "ACTIVE_SESSION_CONFLICT";
  public readonly statusCode = 409;
  public readonly activeSession: {
    publicId: string;
    workoutBlockId: number | null;
    workoutBlockPublicId: string | null;
    workoutBlockTitle: string | null;
    startedAt: Date;
  };
  public readonly targetBlock: {
    id: number;
    publicId: string;
    title: string;
  };
  constructor(
    message: string,
    activeSession: {
      publicId: string;
      workoutBlockId: number | null;
      workoutBlockPublicId: string | null;
      workoutBlockTitle: string | null;
      startedAt: Date;
    },
    targetBlock: {
      id: number;
      publicId: string;
      title: string;
    }
  ) {
    super(message);
    this.name = "TrainingSessionConflictError";
    this.activeSession = activeSession;
    this.targetBlock = targetBlock;
  }
}

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
    isSkipped: Boolean(r.is_skipped),
    completedAt: r.completed_at ? new Date(r.completed_at) : null,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  };
}

/**
 * Sanitizes execution timestamps so started_at <= completed_at across all timezones and clocks.
 */
function parseSanitizedExecutionDates(startedAtRaw: unknown, completedAtRaw: unknown): {
  startedAt: Date;
  completedAt: Date | null;
} {
  const startedAt = new Date(startedAtRaw as string | number | Date);
  const rawCompleted = completedAtRaw ? new Date(completedAtRaw as string | number | Date) : null;
  const completedAt = rawCompleted
    ? new Date(Math.max(rawCompleted.getTime(), startedAt.getTime()))
    : null;
  return { startedAt, completedAt };
}

type ResolvedAssignmentRow = {
  id: number;
  public_id: string;
  consultancy_id: number;
  student_membership_id: number;
  workout_version_id: number;
  status: string;
};

async function verifyUserMembershipOwnership(
  connection: PoolConnection,
  membershipId: number | string,
  userId: number,
  consultancyId?: number | null
): Promise<boolean> {
  if (!userId || !membershipId) return false;
  const [rows] = await connection.execute(
    `SELECT 1 FROM consultancy_members cm
     WHERE cm.id = ? AND cm.user_id = ? AND cm.status = 'ACTIVE'
       ${consultancyId ? "AND cm.consultancy_id = ?" : ""}
     LIMIT 1;`,
    consultancyId ? [membershipId, userId, consultancyId] : [membershipId, userId]
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function queryExecutionSessionWithBlock(
  connection: PoolConnection,
  whereClause: string,
  params: (string | number | boolean | null | Date)[],
  forUpdate = false,
  orderByClause?: string
): Promise<RowDataPacket[]> {
  const lock = forUpdate ? " FOR UPDATE" : "";
  const order = orderByClause ? ` ORDER BY ${orderByClause}` : "";
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        wes.id,
        wes.public_id,
        wes.consultancy_id,
        wes.student_membership_id,
        wes.workout_assignment_id,
        wes.workout_version_id,
        wes.workout_block_id,
        wes.status,
        wes.student_completion_state,
        wes.student_feedback_notes,
        wes.started_at,
        wes.completed_at,
        wes.created_at,
        wes.updated_at,
        wa.public_id AS assignment_public_id,
        wv.public_id AS version_public_id,
        wv.public_id AS session_version_public_id,
        wb.public_id AS workout_block_public_id,
        wb.title AS workout_block_title
       FROM workout_execution_sessions wes
       INNER JOIN workout_assignments wa ON wa.id = wes.workout_assignment_id
       INNER JOIN workout_versions wv ON wv.id = wes.workout_version_id
       LEFT JOIN workout_blocks wb ON wb.id = wes.workout_block_id
       WHERE ${whereClause}${order}
       LIMIT 1${lock};`,
      params
    );
    return rows;
  } catch (err: unknown) {
    if (isMissingColumnError(err, ["workout_block_id"])) {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT
          wes.id,
          wes.public_id,
          wes.consultancy_id,
          wes.student_membership_id,
          wes.workout_assignment_id,
          wes.workout_version_id,
          NULL AS workout_block_id,
          wes.status,
          wes.student_completion_state,
          wes.student_feedback_notes,
          wes.started_at,
          wes.completed_at,
          wes.created_at,
          wes.updated_at,
          wa.public_id AS assignment_public_id,
          wv.public_id AS version_public_id,
          wv.public_id AS session_version_public_id,
          NULL AS workout_block_public_id,
          NULL AS workout_block_title
         FROM workout_execution_sessions wes
         INNER JOIN workout_assignments wa ON wa.id = wes.workout_assignment_id
         INNER JOIN workout_versions wv ON wv.id = wes.workout_version_id
         WHERE ${whereClause}${order}
         LIMIT 1${lock};`,
        params
      );
      return rows;
    }
    throw err;
  }
}

async function queryExecutionSetsBySessionId(
  connection: PoolConnection,
  sessionId: number
): Promise<RowDataPacket[]> {
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
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
        wex.is_skipped,
        wex.completed_at,
        wex.created_at,
        wex.updated_at
       FROM workout_execution_sets wex
       INNER JOIN workout_block_items wbi ON wbi.id = wex.block_item_id
       WHERE wex.execution_session_id = ?
       ORDER BY wex.set_number ASC;`,
      [sessionId]
    );
    return rows;
  } catch (err: unknown) {
    if (isMissingColumnError(err, ["is_skipped"])) {
      const [rows] = await connection.execute<RowDataPacket[]>(
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
          0 AS is_skipped,
          wex.completed_at,
          wex.created_at,
          wex.updated_at
         FROM workout_execution_sets wex
         INNER JOIN workout_block_items wbi ON wbi.id = wex.block_item_id
         WHERE wex.execution_session_id = ?
         ORDER BY wex.set_number ASC;`,
        [sessionId]
      );
      return rows;
    }
    throw err;
  }
}

async function queryExecutionSetsBySessionIdsBatch(
  connection: PoolConnection,
  sessionIds: number[]
): Promise<RowDataPacket[]> {
  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT
        wex.public_id,
        wex.execution_session_id,
        wex.block_item_id,
        wex.set_number,
        wex.set_type,
        wex.prescribed_reps,
        wex.prescribed_reps_max,
        wex.prescribed_load_kg,
        wex.prescribed_rest_seconds,
        wex.actual_reps,
        wex.actual_load_kg,
        wex.is_skipped,
        wex.completed_at,
        wbi.public_id AS block_item_public_id,
        wbi.exercise_name_snapshot
       FROM workout_execution_sets wex
       INNER JOIN workout_block_items wbi ON wbi.id = wex.block_item_id
       WHERE wex.execution_session_id IN (?)
       ORDER BY wex.execution_session_id ASC, wex.set_number ASC;`,
      [sessionIds]
    );
    return rows;
  } catch (err: unknown) {
    if (isMissingColumnError(err, ["is_skipped"])) {
      const [rows] = await connection.query<RowDataPacket[]>(
        `SELECT
          wex.public_id,
          wex.execution_session_id,
          wex.block_item_id,
          wex.set_number,
          wex.set_type,
          wex.prescribed_reps,
          wex.prescribed_reps_max,
          wex.prescribed_load_kg,
          wex.prescribed_rest_seconds,
          wex.actual_reps,
          wex.actual_load_kg,
          0 AS is_skipped,
          wex.completed_at,
          wbi.public_id AS block_item_public_id,
          wbi.exercise_name_snapshot
         FROM workout_execution_sets wex
         INNER JOIN workout_block_items wbi ON wbi.id = wex.block_item_id
         WHERE wex.execution_session_id IN (?)
         ORDER BY wex.execution_session_id ASC, wex.set_number ASC;`,
        [sessionIds]
      );
      return rows;
    }
    throw err;
  }
}

async function insertExecutionSessionSafely(
  connection: PoolConnection,
  params: {
    publicId: string;
    consultancyId: number;
    membershipId: number;
    assignmentId: number;
    versionId: number;
    blockId: number;
  }
): Promise<number> {
  try {
    const [res] = await connection.execute<ResultSetHeader>(
      `INSERT INTO workout_execution_sessions (
        public_id,
        consultancy_id,
        student_membership_id,
        workout_assignment_id,
        workout_version_id,
        workout_block_id,
        status,
        started_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'IN_PROGRESS', NOW(3));`,
      [
        params.publicId,
        params.consultancyId,
        params.membershipId,
        params.assignmentId,
        params.versionId,
        params.blockId,
      ]
    );
    return res.insertId;
  } catch (err: unknown) {
    if (isMissingColumnError(err, ["workout_block_id"])) {
      const [res] = await connection.execute<ResultSetHeader>(
        `INSERT INTO workout_execution_sessions (
          public_id,
          consultancy_id,
          student_membership_id,
          workout_assignment_id,
          workout_version_id,
          status,
          started_at
        ) VALUES (?, ?, ?, ?, ?, 'IN_PROGRESS', NOW(3));`,
        [
          params.publicId,
          params.consultancyId,
          params.membershipId,
          params.assignmentId,
          params.versionId,
        ]
      );
      return res.insertId;
    }
    throw err;
  }
}

export type LegacyBlockResolution = {
  kind: "SINGLE_BLOCK_CONFIRMED" | "MULTI_BLOCK_LEGACY" | "INSUFFICIENT_DATA";
  blockId: number | null;
  blockPublicId: string | null;
  blockTitle: string | null;
  participatingBlocks: Array<{
    blockId: number;
    blockPublicId: string;
    blockTitle: string;
    completedSetsCount: number;
    totalSetsCount: number;
  }>;
};

/**
 * Resolves the block identity for historical/legacy sessions where workout_block_id is NULL.
 * Criteria:
 * 1. SINGLE_BLOCK_CONFIRMED: Unequivocal evidence — all completed sets (completed_at != null and is_skipped = 0)
 *    belong to exactly ONE workout_block_id. Resolves to this block.
 * 2. MULTI_BLOCK_LEGACY: Multiple blocks have completed sets. All sets are preserved; block identity indicates multi-division.
 * 3. INSUFFICIENT_DATA: No completed sets exist in any block of the session.
 */
export async function resolveLegacySessionBlocks(
  connection: PoolConnection,
  sessionId: number
): Promise<LegacyBlockResolution> {
  let rows: RowDataPacket[] = [];
  try {
    const [result] = await connection.execute<RowDataPacket[]>(
      `SELECT
        wb.id AS block_id,
        wb.public_id AS block_public_id,
        wb.title AS block_title,
        COUNT(wex.id) AS total_sets,
        COUNT(CASE WHEN wex.completed_at IS NOT NULL AND (wex.is_skipped = 0 OR wex.is_skipped IS NULL) THEN 1 END) AS completed_sets
       FROM workout_execution_sets wex
       INNER JOIN workout_block_items wbi ON wbi.id = wex.block_item_id
       INNER JOIN workout_blocks wb ON wb.id = wbi.block_id
       WHERE wex.execution_session_id = ?
       GROUP BY wb.id, wb.public_id, wb.title, wb.sort_order
       ORDER BY completed_sets DESC, wb.sort_order ASC;`,
      [sessionId]
    );
    rows = result;
  } catch (err: unknown) {
    if (isMissingColumnError(err, ["is_skipped"])) {
      const [result] = await connection.execute<RowDataPacket[]>(
        `SELECT
          wb.id AS block_id,
          wb.public_id AS block_public_id,
          wb.title AS block_title,
          COUNT(wex.id) AS total_sets,
          COUNT(CASE WHEN wex.completed_at IS NOT NULL THEN 1 END) AS completed_sets
         FROM workout_execution_sets wex
         INNER JOIN workout_block_items wbi ON wbi.id = wex.block_item_id
         INNER JOIN workout_blocks wb ON wb.id = wbi.block_id
         WHERE wex.execution_session_id = ?
         GROUP BY wb.id, wb.public_id, wb.title, wb.sort_order
         ORDER BY completed_sets DESC, wb.sort_order ASC;`,
        [sessionId]
      );
      rows = result;
    } else {
      throw err;
    }
  }

  const participatingBlocks = (rows || []).map((r) => ({
    blockId: Number(r.block_id),
    blockPublicId: String(r.block_public_id),
    blockTitle: String(r.block_title),
    completedSetsCount: Number(r.completed_sets || 0),
    totalSetsCount: Number(r.total_sets || 0),
  }));

  const executedBlocks = participatingBlocks.filter((b) => b.completedSetsCount > 0);

  if (executedBlocks.length === 1) {
    return {
      kind: "SINGLE_BLOCK_CONFIRMED",
      blockId: executedBlocks[0].blockId,
      blockPublicId: executedBlocks[0].blockPublicId,
      blockTitle: executedBlocks[0].blockTitle,
      participatingBlocks,
    };
  }

  if (executedBlocks.length > 1) {
    return {
      kind: "MULTI_BLOCK_LEGACY",
      blockId: null,
      blockPublicId: null,
      blockTitle: "Sessão Multi-divisões (Legada)",
      participatingBlocks,
    };
  }

  return {
    kind: "INSUFFICIENT_DATA",
    blockId: null,
    blockPublicId: null,
    blockTitle: "Sessão anterior sem divisão definida",
    participatingBlocks,
  };
}

async function resolveAssignmentForExecution(
  connection: PoolConnection,
  rawIdentifier: string,
  consultancyId: number,
  membershipId: number,
  userId: number
): Promise<ResolvedAssignmentRow | null> {
  const cleanId = (rawIdentifier || "").trim();
  if (!cleanId) return null;

  // Direct assignment public_id
  const [byAssign] = await connection.execute(
    `SELECT wa.id, wa.public_id, wa.consultancy_id, wa.student_membership_id, wa.workout_version_id, wa.status
     FROM workout_assignments wa
     INNER JOIN workout_versions wv ON wv.id = wa.workout_version_id
     INNER JOIN workouts w ON w.id = wv.workout_id
     WHERE wa.public_id = ? AND wa.deleted_at IS NULL AND w.deleted_at IS NULL
     LIMIT 1;`,
    [cleanId]
  );
  if (Array.isArray(byAssign) && byAssign.length > 0) {
    return byAssign[0] as unknown as ResolvedAssignmentRow;
  }

  // Session public_id
  const [bySession] = await connection.execute(
    `SELECT wa.id, wa.public_id, wa.consultancy_id, wa.student_membership_id, wa.workout_version_id, wa.status
     FROM workout_execution_sessions wes
     INNER JOIN workout_assignments wa ON wa.id = wes.workout_assignment_id
     INNER JOIN workout_versions wv ON wv.id = wes.workout_version_id
     INNER JOIN workouts w ON w.id = wv.workout_id
     WHERE wes.public_id = ? AND wa.deleted_at IS NULL AND w.deleted_at IS NULL
     LIMIT 1;`,
    [cleanId]
  );
  if (Array.isArray(bySession) && bySession.length > 0) {
    return bySession[0] as unknown as ResolvedAssignmentRow;
  }

  // Workout root public_id
  const [byWorkout] = await connection.execute(
    `SELECT wa.id, wa.public_id, wa.consultancy_id, wa.student_membership_id, wa.workout_version_id, wa.status
     FROM workouts w
     INNER JOIN workout_versions wv ON wv.workout_id = w.id
     INNER JOIN workout_assignments wa ON wa.workout_version_id = wv.id
     WHERE w.public_id = ? AND wa.consultancy_id = ?
       AND (wa.student_membership_id = ? OR wa.student_membership_id IN (SELECT id FROM consultancy_members WHERE user_id = ? AND consultancy_id = ?))
       AND wa.deleted_at IS NULL AND w.deleted_at IS NULL
     ORDER BY (wa.status = 'ACTIVE') DESC, wa.starts_on DESC, wa.created_at DESC
     LIMIT 1;`,
    [cleanId, consultancyId, membershipId, userId, consultancyId]
  );
  if (Array.isArray(byWorkout) && byWorkout.length > 0) {
    return byWorkout[0] as unknown as ResolvedAssignmentRow;
  }

  // Version public_id
  const [byVersion] = await connection.execute(
    `SELECT wa.id, wa.public_id, wa.consultancy_id, wa.student_membership_id, wa.workout_version_id, wa.status
     FROM workout_versions wv
     INNER JOIN workout_assignments wa ON wa.workout_version_id = wv.id
     INNER JOIN workouts w ON w.id = wv.workout_id
     WHERE wv.public_id = ? AND wa.consultancy_id = ?
       AND (wa.student_membership_id = ? OR wa.student_membership_id IN (SELECT id FROM consultancy_members WHERE user_id = ? AND consultancy_id = ?))
       AND wa.deleted_at IS NULL AND w.deleted_at IS NULL
     ORDER BY (wa.status = 'ACTIVE') DESC, wa.starts_on DESC, wa.created_at DESC
     LIMIT 1;`,
    [cleanId, consultancyId, membershipId, userId, consultancyId]
  );
  if (Array.isArray(byVersion) && byVersion.length > 0) {
    return byVersion[0] as unknown as ResolvedAssignmentRow;
  }

  return null;
}

/**
 * Starts or resumes a student workout execution session.
 * Enforces:
 * 1. Strict tenancy and student ownership checks.
 * 2. Active assignment validation.
 * 3. Concurrency-safe single IN_PROGRESS session per assignment via row lock.
 * 4. Automatic cloning of prescribed sets into execution snapshots.
 */
export type StartOrResumeWorkoutExecutionOptions = {
  resolveConflict?: "COMPLETE_EARLY" | "ABANDON" | "RESUME";
};

/**
 * Starts or resumes a student workout execution session.
 * Enforces:
 * 1. Strict tenancy and student ownership checks.
 * 2. Active assignment validation.
 * 3. Scoped strictly to the target division/block (workout_blocks).
 * 4. Automatic cloning of prescribed sets for that division only (not other divisions).
 * 5. Safe division switching without silent overwrites or cross-division set mixing.
 */
export async function startOrResumeWorkoutExecution(
  ctx: TrainingAccessContext,
  assignmentPublicId: string,
  targetBlockPublicId?: string | null,
  options?: StartOrResumeWorkoutExecutionOptions
): Promise<WorkoutExecutionSessionDto> {
  assertStudentContext(ctx);

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Resolve polymorphic identifier if needed (assignment, session, workout, version)
    const resolved = await resolveAssignmentForExecution(
      connection,
      assignmentPublicId,
      ctx.consultancyId!,
      ctx.membershipId!,
      ctx.userId
    );
    const assignTargetId = resolved ? resolved.id : null;

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
       WHERE ${assignTargetId ? "wa.id = ?" : "wa.public_id = ?"} AND wa.deleted_at IS NULL
       LIMIT 1
       FOR UPDATE;`,
      [assignTargetId ? assignTargetId : assignmentPublicId]
    );

    if (!assignRows || assignRows.length === 0) {
      throw new TrainingAuthorizationError("Prescrição de treino não encontrada.", "NOT_FOUND", 404);
    }

    const a = assignRows[0];

    // Tenancy isolation
    if (Number(a.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado: consultoria incompatível.", "FORBIDDEN", 403);
    }

    // Student ownership with multi-membership verification
    const isOwner =
      Number(a.student_membership_id) === ctx.membershipId ||
      (await verifyUserMembershipOwnership(connection, a.student_membership_id, ctx.userId, ctx.consultancyId));

    if (!isOwner) {
      throw new TrainingAuthorizationError("Acesso negado: prescrição não pertence a este aluno.", "FORBIDDEN", 403);
    }

    // 2. Resolve requested target block (if specified)
    let requestedTargetBlock: { id: number; public_id: string; title: string; sort_order: number } | null = null;
    if (targetBlockPublicId && targetBlockPublicId.trim()) {
      const [blockRows] = await connection.execute<RowDataPacket[]>(
        `SELECT id, public_id, title, sort_order
         FROM workout_blocks
         WHERE public_id = ? AND workout_version_id = ?
         LIMIT 1;`,
        [targetBlockPublicId.trim(), a.workout_version_id]
      );
      if (!blockRows || blockRows.length === 0) {
        throw new TrainingAuthorizationError(
          "Divisão de treino prescrita não encontrada nesta versão.",
          "BLOCK_NOT_FOUND",
          404
        );
      }
      requestedTargetBlock = blockRows[0] as unknown as {
        id: number;
        public_id: string;
        title: string;
        sort_order: number;
      };
    }

    // 3. Check for an existing IN_PROGRESS execution session for this assignment
    const existingSessions = await queryExecutionSessionWithBlock(
      connection,
      "wes.workout_assignment_id = ? AND wes.status = 'IN_PROGRESS'",
      [a.id],
      true
    );

    if (existingSessions && existingSessions.length > 0) {
      const activeSession = existingSessions[0];

      // Identify active session block (supporting legacy sessions where workout_block_id is NULL)
      let activeBlockId = activeSession.workout_block_id != null ? Number(activeSession.workout_block_id) : null;
      let activeBlockPublicId = activeSession.workout_block_public_id
        ? String(activeSession.workout_block_public_id)
        : null;
      let activeBlockTitle = activeSession.workout_block_title
        ? String(activeSession.workout_block_title)
        : null;

      let legacyResolution: LegacyBlockResolution | null = null;
      if (activeBlockId == null) {
        legacyResolution = await resolveLegacySessionBlocks(connection, activeSession.id);
        activeBlockId = legacyResolution.blockId;
        activeBlockPublicId = legacyResolution.blockPublicId;
        activeBlockTitle = legacyResolution.blockTitle;
      }

      // Conflict logic:
      // A conflict occurs if the student requested a target division AND:
      // (a) The active session belongs to a different block (activeBlockId !== requestedTargetBlock.id), OR
      // (b) The active session is a legacy session where activeBlockId is null (multi-block or insufficient data).
      const isConflict =
        requestedTargetBlock != null &&
        (activeBlockId == null || requestedTargetBlock.id !== activeBlockId);

      if (options?.resolveConflict === "ABANDON") {
        // End previous session as interrupted: mark ABANDONED (preserves all sets, reps, and loads)
        await connection.execute<ResultSetHeader>(
          `UPDATE workout_execution_sessions
           SET status = 'ABANDONED', updated_at = NOW(3)
           WHERE id = ?;`,
          [activeSession.id]
        );
        // If no explicit requestedTargetBlock was passed, restart the same block that was active
        if (!requestedTargetBlock && activeBlockId != null) {
          const [bRows] = await connection.execute<RowDataPacket[]>(
            `SELECT id, public_id, title, sort_order
             FROM workout_blocks
             WHERE id = ?
             LIMIT 1;`,
            [activeBlockId]
          );
          if (bRows && bRows.length > 0) {
            requestedTargetBlock = bRows[0] as unknown as {
              id: number;
              public_id: string;
              title: string;
              sort_order: number;
            };
          }
        }
        // Proceed to create new session for targetBlock below!
      } else if (options?.resolveConflict === "COMPLETE_EARLY") {
        // Conclude previous session early: mark pending sets as skipped and session COMPLETED
        try {
          await connection.execute<ResultSetHeader>(
            `UPDATE workout_execution_sets
             SET completed_at = NOW(3), is_skipped = 1, updated_at = NOW(3)
             WHERE execution_session_id = ? AND completed_at IS NULL;`,
            [activeSession.id]
          );
        } catch (err: unknown) {
          if (isMissingColumnError(err, ["is_skipped"])) {
            await connection.execute<ResultSetHeader>(
              `UPDATE workout_execution_sets
               SET completed_at = NOW(3), updated_at = NOW(3)
               WHERE execution_session_id = ? AND completed_at IS NULL;`,
              [activeSession.id]
            );
          } else {
            throw err;
          }
        }

        await connection.execute<ResultSetHeader>(
          `UPDATE workout_execution_sessions
           SET status = 'COMPLETED', completed_at = GREATEST(NOW(3), started_at), updated_at = NOW(3)
           WHERE id = ?;`,
          [activeSession.id]
        );
        // If no explicit requestedTargetBlock was passed, restart the same block that was active
        if (!requestedTargetBlock && activeBlockId != null) {
          const [bRows] = await connection.execute<RowDataPacket[]>(
            `SELECT id, public_id, title, sort_order
             FROM workout_blocks
             WHERE id = ?
             LIMIT 1;`,
            [activeBlockId]
          );
          if (bRows && bRows.length > 0) {
            requestedTargetBlock = bRows[0] as unknown as {
              id: number;
              public_id: string;
              title: string;
              sort_order: number;
            };
          }
        }
        // Proceed to create new session for targetBlock below!
      } else if (isConflict) {
        if (options?.resolveConflict === "RESUME") {
          // Explicit resume of active session
          const setRows = await queryExecutionSetsBySessionId(connection, Number(activeSession.id));

          await connection.commit();

          return {
            publicId: String(activeSession.public_id),
            consultancyId: Number(activeSession.consultancy_id),
            studentMembershipId: Number(activeSession.student_membership_id),
            workoutAssignmentPublicId: String(a.public_id),
            workoutVersionPublicId: String(activeSession.session_version_public_id || a.version_public_id),
            workoutBlockId: activeBlockId,
            workoutBlockPublicId: activeBlockPublicId,
            workoutBlockTitle: activeBlockTitle,
            status: activeSession.status as WorkoutExecutionSessionStatus,
            ...parseSanitizedExecutionDates(activeSession.started_at, activeSession.completed_at),
            createdAt: new Date(activeSession.created_at),
            updatedAt: new Date(activeSession.updated_at),
            sets: setRows.map(mapExecutionSetRow),
          };
        } else {
          // No resolution specified: throw conflict error for explicit user choice
          await connection.commit();
          let conflictMsg = `Já existe uma sessão de treino em andamento para a divisão "${activeBlockTitle || "Divisão ativa"}". Deseja retomar a sessão ativa, concluí-la antecipadamente ou encerrá-la como interrompida para iniciar a divisão "${requestedTargetBlock!.title}"?`;
          if (legacyResolution?.kind === "MULTI_BLOCK_LEGACY") {
            conflictMsg = `Identificamos uma sessão em andamento do formato anterior contendo exercícios de múltiplas divisões. Deseja retomar a sessão para visualizar todas as séries, concluí-la antecipadamente ou encerrá-la como interrompida para iniciar a divisão "${requestedTargetBlock!.title}"?`;
          } else if (legacyResolution?.kind === "INSUFFICIENT_DATA") {
            conflictMsg = `Você possui uma sessão em andamento do formato anterior sem séries realizadas. Deseja retomar esta sessão, concluí-la ou encerrá-la como interrompida para iniciar a divisão "${requestedTargetBlock!.title}"?`;
          }

          throw new TrainingSessionConflictError(
            conflictMsg,
            {
              publicId: String(activeSession.public_id),
              workoutBlockId: activeBlockId,
              workoutBlockPublicId: activeBlockPublicId,
              workoutBlockTitle: activeBlockTitle,
              startedAt: new Date(activeSession.started_at),
            },
            {
              id: requestedTargetBlock!.id,
              publicId: String(requestedTargetBlock!.public_id),
              title: String(requestedTargetBlock!.title),
            }
          );
        }
      } else {
        // No conflict: student is resuming the active session
        const setRows = await queryExecutionSetsBySessionId(connection, Number(activeSession.id));

        await connection.commit();

        return {
          publicId: String(activeSession.public_id),
          consultancyId: Number(activeSession.consultancy_id),
          studentMembershipId: Number(activeSession.student_membership_id),
          workoutAssignmentPublicId: String(a.public_id),
          workoutVersionPublicId: String(activeSession.session_version_public_id || a.version_public_id),
          workoutBlockId: activeBlockId,
          workoutBlockPublicId: activeBlockPublicId,
          workoutBlockTitle: activeBlockTitle,
          status: activeSession.status as WorkoutExecutionSessionStatus,
          ...parseSanitizedExecutionDates(activeSession.started_at, activeSession.completed_at),
          createdAt: new Date(activeSession.created_at),
          updatedAt: new Date(activeSession.updated_at),
          sets: setRows.map(mapExecutionSetRow),
        };
      }
    }

    // 4. No IN_PROGRESS session (or resolved): validate assignment is ACTIVE
    if (a.status !== "ACTIVE") {
      throw new TrainingAuthorizationError(
        "Apenas prescrições ativas podem ser iniciadas para execução.",
        "INVALID_ASSIGNMENT_STATUS",
        400
      );
    }

    // Determine target block: use requestedTargetBlock or fallback to first block of version
    let targetBlock = requestedTargetBlock;
    if (!targetBlock) {
      const [firstBlockRows] = await connection.execute<RowDataPacket[]>(
        `SELECT id, public_id, title, sort_order
         FROM workout_blocks
         WHERE workout_version_id = ?
         ORDER BY sort_order ASC
         LIMIT 1;`,
        [a.workout_version_id]
      );
      if (!firstBlockRows || firstBlockRows.length === 0) {
        throw new TrainingAuthorizationError(
          "A rotina prescrita não possui divisões para execução.",
          "WORKOUT_HAS_NO_BLOCKS",
          400
        );
      }
      targetBlock = firstBlockRows[0] as unknown as {
        id: number;
        public_id: string;
        title: string;
        sort_order: number;
      };
    }

    // 5. Snapshot prescribed sets strictly for the target division (targetBlock.id)
    const [prescribedRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        wis.id AS workout_item_set_id,
        wis.block_item_id,
        wbi.public_id AS block_item_public_id,
        wbi.block_id,
        wbi.combination_id,
        wic.rest_after_seconds AS combination_rest_after_seconds,
        wic.sort_order AS combination_sort_order,
        wbi.sort_order AS item_sort_order,
        wb.sort_order AS block_sort_order,
        wis.set_number,
        wis.set_type,
        wis.target_reps,
        wis.target_reps_max,
        wis.target_load_kg,
        wis.target_rest_seconds
       FROM workout_blocks wb
       INNER JOIN workout_block_items wbi ON wbi.block_id = wb.id
       LEFT JOIN workout_item_combinations wic ON wic.id = wbi.combination_id
       INNER JOIN workout_item_sets wis ON wis.block_item_id = wbi.id
       WHERE wb.id = ?
       ORDER BY COALESCE(wic.sort_order, wbi.sort_order) ASC, wbi.sort_order ASC, wis.set_number ASC;`,
      [targetBlock.id]
    );

    if (!prescribedRows || prescribedRows.length === 0) {
      throw new TrainingAuthorizationError(
        "A divisão selecionada não possui séries prescritas para execução.",
        "WORKOUT_HAS_NO_EXECUTABLE_SETS",
        400
      );
    }

    type ExecutionRawRow = {
      workout_item_set_id: number;
      block_item_id: number;
      block_item_public_id: string;
      set_type: string;
      target_reps: number | null;
      target_reps_max: number | null;
      target_load_kg: number | null;
      target_rest_seconds: number | null;
      combination_id: number | null;
      combination_rest_after_seconds: number | null;
    };

    const itemsMap = new Map<
      number,
      {
        blockItemId: number;
        blockItemPublicId: string;
        combinationId: number | null;
        combinationRestAfterSeconds: number | null;
        sets: ExecutionRawRow[];
      }
    >();

    for (const r of prescribedRows) {
      const bId = Number(r.block_item_id);
      if (!itemsMap.has(bId)) {
        itemsMap.set(bId, {
          blockItemId: bId,
          blockItemPublicId: String(r.block_item_public_id),
          combinationId: r.combination_id != null ? Number(r.combination_id) : null,
          combinationRestAfterSeconds:
            r.combination_rest_after_seconds != null ? Number(r.combination_rest_after_seconds) : null,
          sets: [],
        });
      }
      itemsMap.get(bId)!.sets.push({
        workout_item_set_id: Number(r.workout_item_set_id),
        block_item_id: bId,
        block_item_public_id: String(r.block_item_public_id),
        set_type: String(r.set_type),
        target_reps: r.target_reps != null ? Number(r.target_reps) : null,
        target_reps_max: r.target_reps_max != null ? Number(r.target_reps_max) : null,
        target_load_kg: r.target_load_kg != null ? Number(r.target_load_kg) : null,
        target_rest_seconds: r.target_rest_seconds != null ? Number(r.target_rest_seconds) : null,
        combination_id: r.combination_id != null ? Number(r.combination_id) : null,
        combination_rest_after_seconds:
          r.combination_rest_after_seconds != null ? Number(r.combination_rest_after_seconds) : null,
      });
    }

    type ExecUnit =
      | { kind: "single"; item: (typeof itemsMap extends Map<number, infer V> ? V : never) }
      | {
          kind: "combination";
          combinationId: number;
          restAfterSeconds: number | null;
          items: (typeof itemsMap extends Map<number, infer V> ? V : never)[];
        };

    const execUnits: ExecUnit[] = [];
    const itemEntries = Array.from(itemsMap.values());
    let currentCombId: number | null = null;
    let currentCombItems: typeof itemEntries = [];
    let currentCombRest: number | null = null;

    for (const item of itemEntries) {
      if (item.combinationId != null) {
        if (currentCombId === item.combinationId) {
          currentCombItems.push(item);
        } else {
          if (currentCombId != null && currentCombItems.length > 0) {
            execUnits.push({
              kind: "combination",
              combinationId: currentCombId,
              restAfterSeconds: currentCombRest,
              items: currentCombItems,
            });
          }
          currentCombId = item.combinationId;
          currentCombItems = [item];
          currentCombRest = item.combinationRestAfterSeconds;
        }
      } else {
        if (currentCombId != null && currentCombItems.length > 0) {
          execUnits.push({
            kind: "combination",
            combinationId: currentCombId,
            restAfterSeconds: currentCombRest,
            items: currentCombItems,
          });
          currentCombId = null;
          currentCombItems = [];
          currentCombRest = null;
        }
        execUnits.push({ kind: "single", item });
      }
    }
    if (currentCombId != null && currentCombItems.length > 0) {
      execUnits.push({
        kind: "combination",
        combinationId: currentCombId,
        restAfterSeconds: currentCombRest,
        items: currentCombItems,
      });
    }

    type OrderedExecutionSet = {
      workout_item_set_id: number;
      block_item_id: number;
      block_item_public_id: string;
      set_type: string;
      target_reps: number | null;
      target_reps_max: number | null;
      target_load_kg: number | null;
      prescribed_rest_seconds: number | null;
    };

    const orderedSetsToSnapshot: OrderedExecutionSet[] = [];

    for (const unit of execUnits) {
      if (unit.kind === "single") {
        for (const s of unit.item.sets) {
          orderedSetsToSnapshot.push({
            workout_item_set_id: s.workout_item_set_id,
            block_item_id: s.block_item_id,
            block_item_public_id: s.block_item_public_id,
            set_type: s.set_type,
            target_reps: s.target_reps,
            target_reps_max: s.target_reps_max,
            target_load_kg: s.target_load_kg,
            prescribed_rest_seconds: s.target_rest_seconds,
          });
        }
      } else {
        const maxRounds = Math.max(...unit.items.map((i) => i.sets.length));
        for (let round = 0; round < maxRounds; round++) {
          const itemsInRound = unit.items.filter((it) => round < it.sets.length);
          itemsInRound.forEach((it, idx) => {
            const s = it.sets[round];
            const isLastInRound = idx === itemsInRound.length - 1;
            const rest = isLastInRound
              ? (unit.restAfterSeconds ?? s.target_rest_seconds ?? 60)
              : 0;
            orderedSetsToSnapshot.push({
              workout_item_set_id: s.workout_item_set_id,
              block_item_id: s.block_item_id,
              block_item_public_id: s.block_item_public_id,
              set_type: s.set_type,
              target_reps: s.target_reps,
              target_reps_max: s.target_reps_max,
              target_load_kg: s.target_load_kg,
              prescribed_rest_seconds: rest,
            });
          });
        }
      }
    }

    const sessionPublicId = crypto.randomUUID();

    const sessionId = await insertExecutionSessionSafely(connection, {
      publicId: sessionPublicId,
      consultancyId: ctx.consultancyId!,
      membershipId: ctx.membershipId!,
      assignmentId: a.id,
      versionId: a.workout_version_id,
      blockId: targetBlock.id,
    });

    // Snapshot each prescribed set with sequential set_number
    const createdSets: WorkoutExecutionSetDto[] = [];
    let executionSetIndex = 1;
    for (const ps of orderedSetsToSnapshot) {
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
          executionSetIndex,
          ps.set_type,
          ps.target_reps,
          ps.target_reps_max,
          ps.target_load_kg,
          ps.prescribed_rest_seconds,
        ]
      );

      const now = new Date();
      createdSets.push({
        publicId: setPublicId,
        workoutItemSetId: Number(ps.workout_item_set_id),
        blockItemId: Number(ps.block_item_id),
        blockItemPublicId: String(ps.block_item_public_id),
        setNumber: executionSetIndex,
        setType: ps.set_type as WorkoutSetType,
        prescribedReps: ps.target_reps != null ? Number(ps.target_reps) : null,
        prescribedRepsMax: ps.target_reps_max != null ? Number(ps.target_reps_max) : null,
        prescribedLoadKg: ps.target_load_kg != null ? Number(ps.target_load_kg) : null,
        prescribedRestSeconds: ps.prescribed_rest_seconds != null ? Number(ps.prescribed_rest_seconds) : null,
        actualReps: null,
        actualLoadKg: null,
        isSkipped: false,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      });

      executionSetIndex++;
    }

    await connection.commit();

    const now = new Date();
    return {
      publicId: sessionPublicId,
      consultancyId: ctx.consultancyId!,
      studentMembershipId: ctx.membershipId!,
      workoutAssignmentPublicId: String(a.public_id),
      workoutVersionPublicId: String(a.version_public_id),
      workoutBlockId: targetBlock.id,
      workoutBlockPublicId: String(targetBlock.public_id),
      workoutBlockTitle: String(targetBlock.title),
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

    const resolved = await resolveAssignmentForExecution(
      connection,
      assignmentPublicId,
      ctx.consultancyId || 0,
      ctx.membershipId || 0,
      ctx.userId
    );
    const assignTargetId = resolved ? resolved.id : null;

    const sessionRows = await queryExecutionSessionWithBlock(
      connection,
      `${assignTargetId ? "wa.id = ?" : "wa.public_id = ?"} AND wes.status = 'IN_PROGRESS' AND wa.deleted_at IS NULL`,
      [assignTargetId ? assignTargetId : assignmentPublicId]
    );

    if (!sessionRows || sessionRows.length === 0) return null;
    const s = sessionRows[0];

    // Tenancy isolation
    if (ctx.consultancyId && Number(s.consultancy_id) !== ctx.consultancyId) {
      return null;
    }

    // Ownership check: student owner or coach/admin in same consultancy
    const isStudentOwner =
      (ctx.membershipId && Number(s.student_membership_id) === ctx.membershipId) ||
      (await verifyUserMembershipOwnership(connection, s.student_membership_id, ctx.userId, ctx.consultancyId));
    const isCoachOrAdmin =
      ctx.consultancyId &&
      Number(s.consultancy_id) === ctx.consultancyId &&
      (ctx.canAuthorTraining || ctx.canManageConsultancy);

    if (!isStudentOwner && !isCoachOrAdmin) {
      return null;
    }

    const setRows = await queryExecutionSetsBySessionId(connection, Number(s.id));

    let activeBlockId = s.workout_block_id != null ? Number(s.workout_block_id) : null;
    let activeBlockPublicId = s.workout_block_public_id ? String(s.workout_block_public_id) : null;
    let activeBlockTitle = s.workout_block_title ? String(s.workout_block_title) : null;

    if (activeBlockId == null && setRows.length > 0) {
      const legacyRes = await resolveLegacySessionBlocks(connection, s.id);
      activeBlockId = legacyRes.blockId;
      activeBlockPublicId = legacyRes.blockPublicId;
      activeBlockTitle = legacyRes.blockTitle;
    }

    return {
      publicId: String(s.public_id),
      consultancyId: Number(s.consultancy_id),
      studentMembershipId: Number(s.student_membership_id),
      workoutAssignmentPublicId: String(s.assignment_public_id),
      workoutVersionPublicId: String(s.version_public_id),
      workoutBlockId: activeBlockId,
      workoutBlockPublicId: activeBlockPublicId,
      workoutBlockTitle: activeBlockTitle,
      status: s.status as WorkoutExecutionSessionStatus,
      studentCompletionState: (s.student_completion_state as "ALL" | "PARTIAL" | "NONE") || null,
      studentFeedbackNotes: s.student_feedback_notes ? String(s.student_feedback_notes) : null,
      ...parseSanitizedExecutionDates(s.started_at, s.completed_at),
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

    const resolved = await resolveAssignmentForExecution(
      connection,
      assignmentPublicId,
      ctx.consultancyId || 0,
      ctx.membershipId || 0,
      ctx.userId
    );
    const assignTargetId = resolved ? resolved.id : null;

    const sessionRows = await queryExecutionSessionWithBlock(
      connection,
      `${assignTargetId ? "wa.id = ?" : "wa.public_id = ?"} AND wa.deleted_at IS NULL AND wes.status IN ('IN_PROGRESS', 'COMPLETED')`,
      [assignTargetId ? assignTargetId : assignmentPublicId],
      false,
      "CASE WHEN wes.status = 'IN_PROGRESS' THEN 0 ELSE 1 END ASC, wes.completed_at DESC, wes.created_at DESC"
    );

    if (!sessionRows || sessionRows.length === 0) return null;
    const s = sessionRows[0];

    // Tenancy isolation
    if (ctx.consultancyId && Number(s.consultancy_id) !== ctx.consultancyId) {
      return null;
    }

    // Ownership check: student owner or coach/admin in same consultancy
    const isStudentOwner =
      (ctx.membershipId && Number(s.student_membership_id) === ctx.membershipId) ||
      (await verifyUserMembershipOwnership(connection, s.student_membership_id, ctx.userId, ctx.consultancyId));
    const isCoachOrAdmin =
      ctx.consultancyId &&
      Number(s.consultancy_id) === ctx.consultancyId &&
      (ctx.canAuthorTraining || ctx.canManageConsultancy);

    if (!isStudentOwner && !isCoachOrAdmin) {
      return null;
    }

    const setRows = await queryExecutionSetsBySessionId(connection, Number(s.id));

    let activeBlockId = s.workout_block_id != null ? Number(s.workout_block_id) : null;
    let activeBlockPublicId = s.workout_block_public_id ? String(s.workout_block_public_id) : null;
    let activeBlockTitle = s.workout_block_title ? String(s.workout_block_title) : null;

    if (activeBlockId == null && setRows.length > 0) {
      const legacyRes = await resolveLegacySessionBlocks(connection, s.id);
      activeBlockId = legacyRes.blockId;
      activeBlockPublicId = legacyRes.blockPublicId;
      activeBlockTitle = legacyRes.blockTitle;
    }

    return {
      publicId: String(s.public_id),
      consultancyId: Number(s.consultancy_id),
      studentMembershipId: Number(s.student_membership_id),
      workoutAssignmentPublicId: String(s.assignment_public_id),
      workoutVersionPublicId: String(s.version_public_id),
      workoutBlockId: activeBlockId,
      workoutBlockPublicId: activeBlockPublicId,
      workoutBlockTitle: activeBlockTitle,
      status: s.status as WorkoutExecutionSessionStatus,
      ...parseSanitizedExecutionDates(s.started_at, s.completed_at),
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

    const sessionRows = await queryExecutionSessionWithBlock(
      connection,
      "wes.public_id = ?",
      [sessionPublicId]
    );

    if (!sessionRows || sessionRows.length === 0) return null;
    const s = sessionRows[0];

    // Tenancy isolation
    if (ctx.consultancyId && Number(s.consultancy_id) !== ctx.consultancyId) {
      return null;
    }

    // Ownership check: student owner or coach/admin in same consultancy
    const isStudentOwner =
      (ctx.membershipId && Number(s.student_membership_id) === ctx.membershipId) ||
      (await verifyUserMembershipOwnership(connection, s.student_membership_id, ctx.userId, ctx.consultancyId));
    const isCoachOrAdmin =
      ctx.consultancyId &&
      Number(s.consultancy_id) === ctx.consultancyId &&
      (ctx.canAuthorTraining || ctx.canManageConsultancy);

    if (!isStudentOwner && !isCoachOrAdmin) {
      return null;
    }

    const setRows = await queryExecutionSetsBySessionId(connection, Number(s.id));

    let activeBlockId = s.workout_block_id != null ? Number(s.workout_block_id) : null;
    let activeBlockPublicId = s.workout_block_public_id ? String(s.workout_block_public_id) : null;
    let activeBlockTitle = s.workout_block_title ? String(s.workout_block_title) : null;

    if (activeBlockId == null && setRows.length > 0) {
      const legacyRes = await resolveLegacySessionBlocks(connection, s.id);
      activeBlockId = legacyRes.blockId;
      activeBlockPublicId = legacyRes.blockPublicId;
      activeBlockTitle = legacyRes.blockTitle;
    }

    return {
      publicId: String(s.public_id),
      consultancyId: Number(s.consultancy_id),
      studentMembershipId: Number(s.student_membership_id),
      workoutAssignmentPublicId: String(s.assignment_public_id),
      workoutVersionPublicId: String(s.version_public_id),
      workoutBlockId: activeBlockId,
      workoutBlockPublicId: activeBlockPublicId,
      workoutBlockTitle: activeBlockTitle,
      status: s.status as WorkoutExecutionSessionStatus,
      ...parseSanitizedExecutionDates(s.started_at, s.completed_at),
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
 * Supports optional actualReps and actualLoadKg (never coerces empty values to 0 or prescribed values).
 * Supports isSkipped marking.
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

  // Validate actualReps (optional: null or integer between 0 and 65535)
  let validatedActualReps: number | null = null;
  if (input.actualReps !== undefined && input.actualReps !== null) {
    const rawR = input.actualReps;
    const r = typeof rawR === "string" ? Number(rawR) : rawR;
    if (typeof r !== "number" || !Number.isFinite(r) || !Number.isInteger(r) || r < 0 || r > 65535) {
      throw new TrainingAuthorizationError(
        "Valor inválido de repetições realizadas (esperado número inteiro entre 0 e 65535).",
        "INVALID_ACTUAL_REPS",
        400
      );
    }
    validatedActualReps = r;
  }

  // Validate actualLoadKg (optional: null or number between 0 and 9999.99 with at most 2 decimals)
  let validatedActualLoadKg: number | null = null;
  if (input.actualLoadKg !== undefined && input.actualLoadKg !== null) {
    let rawL = input.actualLoadKg;
    if (typeof rawL === "string") {
      rawL = Number(String(rawL).replace(",", "."));
    }
    if (typeof rawL !== "number" || !Number.isFinite(rawL) || rawL < 0 || rawL > 9999.99) {
      throw new TrainingAuthorizationError(
        "Valor inválido de carga realizada (esperado entre 0 e 9999.99 kg).",
        "INVALID_ACTUAL_LOAD",
        400
      );
    }
    const rounded = Math.round(rawL * 100) / 100;
    if (Math.abs(rawL - rounded) > 1e-7) {
      throw new TrainingAuthorizationError(
        "Carga deve ter no máximo 2 casas decimais.",
        "INVALID_ACTUAL_LOAD",
        400
      );
    }
    validatedActualLoadKg = rounded;
  }

  const isSkipped = Boolean(input.isSkipped);

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

    const isSessionOwner =
      Number(session.student_membership_id) === ctx.membershipId ||
      (await verifyUserMembershipOwnership(connection, session.student_membership_id, ctx.userId, ctx.consultancyId));

    if (!isSessionOwner) {
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
    let setRows: RowDataPacket[];
    try {
      const [rows] = await connection.execute<RowDataPacket[]>(
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
          wex.is_skipped,
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
      setRows = rows;
    } catch (err: unknown) {
      if (isMissingColumnError(err, ["is_skipped"])) {
        const [rows] = await connection.execute<RowDataPacket[]>(
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
            0 AS is_skipped,
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
        setRows = rows;
      } else {
        throw err;
      }
    }

    if (!setRows || setRows.length === 0) {
      throw new TrainingAuthorizationError("Série de execução não encontrada nesta sessão.", "NOT_FOUND", 404);
    }

    const targetSet = setRows[0];

    // 3. Apply completion idempotently: atomic update of completed_at, actual_reps, actual_load_kg, is_skipped
    const now = new Date();
    if (targetSet.completed_at == null) {
      try {
        await connection.execute<ResultSetHeader>(
          `UPDATE workout_execution_sets
           SET completed_at = ?, actual_reps = ?, actual_load_kg = ?, is_skipped = ?, updated_at = NOW(3)
           WHERE id = ?;`,
          [now, validatedActualReps, validatedActualLoadKg, isSkipped ? 1 : 0, targetSet.id]
        );
      } catch (err: unknown) {
        if (isMissingColumnError(err, ["is_skipped"])) {
          await connection.execute<ResultSetHeader>(
            `UPDATE workout_execution_sets
             SET completed_at = ?, actual_reps = ?, actual_load_kg = ?, updated_at = NOW(3)
             WHERE id = ?;`,
            [now, validatedActualReps, validatedActualLoadKg, targetSet.id]
          );
        } else {
          throw err;
        }
      }
      targetSet.completed_at = now;
      targetSet.actual_reps = validatedActualReps;
      targetSet.actual_load_kg = validatedActualLoadKg;
      targetSet.is_skipped = isSkipped ? 1 : 0;
      targetSet.updated_at = now;
    }

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
      isSkipped: Boolean(targetSet.is_skipped),
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

export type CompleteWorkoutExecutionOptions = {
  allowEarlyCompletion?: boolean;
  studentCompletionState?: "ALL" | "PARTIAL" | "NONE" | null;
  studentFeedbackNotes?: string | null;
};

/**
 * Completes a workout execution session.
 * Evaluates only the prescribed sets belonging to this scoped session.
 * Supports early completion (options.allowEarlyCompletion: true) marking pending sets as is_skipped = 1.
 * Idempotent: repeated calls on a COMPLETED session return safe completed state.
 * Leaves assignment intact.
 */
export async function completeWorkoutExecution(
  ctx: TrainingAccessContext,
  sessionPublicId: string,
  options?: CompleteWorkoutExecutionOptions
): Promise<WorkoutExecutionSessionDto> {
  assertStudentContext(ctx);

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Lock and validate session
    const sessionRows = await queryExecutionSessionWithBlock(
      connection,
      "wes.public_id = ?",
      [sessionPublicId],
      true
    );

    if (!sessionRows || sessionRows.length === 0) {
      throw new TrainingAuthorizationError("Sessão de treino não encontrada.", "NOT_FOUND", 404);
    }

    const s = sessionRows[0];

    if (Number(s.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado: sessão de outra consultoria.", "FORBIDDEN", 403);
    }

    const isSessionOwner =
      Number(s.student_membership_id) === ctx.membershipId ||
      (await verifyUserMembershipOwnership(connection, s.student_membership_id, ctx.userId, ctx.consultancyId));

    if (!isSessionOwner) {
      throw new TrainingAuthorizationError("Acesso negado: sessão pertence a outro aluno.", "FORBIDDEN", 403);
    }

    if (s.status === "ABANDONED") {
      throw new TrainingAuthorizationError(
        "Esta sessão de treino foi encerrada como interrompida e não pode ser finalizada.",
        "SESSION_ABANDONED",
        400
      );
    }

    let activeBlockId = s.workout_block_id != null ? Number(s.workout_block_id) : null;
    let activeBlockPublicId = s.workout_block_public_id ? String(s.workout_block_public_id) : null;
    let activeBlockTitle = s.workout_block_title ? String(s.workout_block_title) : null;

    if (activeBlockId == null) {
      const legacyRes = await resolveLegacySessionBlocks(connection, s.id);
      activeBlockId = legacyRes.blockId;
      activeBlockPublicId = legacyRes.blockPublicId;
      activeBlockTitle = legacyRes.blockTitle;
    }

    // Idempotent: already completed
    if (s.status === "COMPLETED") {
      const setRows = await queryExecutionSetsBySessionId(connection, Number(s.id));
      await connection.commit();
      const sDate = new Date(s.started_at);
      const rawCDate = s.completed_at ? new Date(s.completed_at) : new Date();
      const cDate = new Date(Math.max(rawCDate.getTime(), sDate.getTime()));
      return {
        publicId: String(s.public_id),
        consultancyId: Number(s.consultancy_id),
        studentMembershipId: Number(s.student_membership_id),
        workoutAssignmentPublicId: String(s.assignment_public_id),
        workoutVersionPublicId: String(s.version_public_id),
        workoutBlockId: activeBlockId,
        workoutBlockPublicId: activeBlockPublicId,
        workoutBlockTitle: activeBlockTitle,
        status: "COMPLETED",
        startedAt: sDate,
        completedAt: cDate,
        createdAt: new Date(s.created_at),
        updatedAt: new Date(s.updated_at),
        sets: setRows.map(mapExecutionSetRow),
      };
    }

    // 2. Pending sets handling
    if (options?.allowEarlyCompletion) {
      // Validate that at least one set was performed
      let performedCount = 0;
      try {
        const [performedRows] = await connection.execute<RowDataPacket[]>(
          `SELECT COUNT(*) AS performed_count
           FROM workout_execution_sets
           WHERE execution_session_id = ?
             AND completed_at IS NOT NULL
             AND (is_skipped = 0 OR is_skipped IS NULL);`,
          [s.id]
        );
        performedCount = Number(performedRows[0]?.performed_count || 0);
      } catch (err: unknown) {
        if (isMissingColumnError(err, ["is_skipped"])) {
          const [performedRows] = await connection.execute<RowDataPacket[]>(
            `SELECT COUNT(*) AS performed_count
             FROM workout_execution_sets
             WHERE execution_session_id = ?
               AND completed_at IS NOT NULL;`,
            [s.id]
          );
          performedCount = Number(performedRows[0]?.performed_count || 0);
        } else {
          throw err;
        }
      }

      if (performedCount === 0) {
        throw new TrainingAuthorizationError(
          "Nenhuma série foi realizada nesta sessão. Para encerrar sem realizar exercícios, encerre a sessão como interrompida.",
          "WORKOUT_EXECUTION_NO_SETS_PERFORMED",
          400
        );
      }

      // Mark all remaining pending sets as skipped
      try {
        await connection.execute<ResultSetHeader>(
          `UPDATE workout_execution_sets
           SET completed_at = NOW(3), is_skipped = 1, updated_at = NOW(3)
           WHERE execution_session_id = ? AND completed_at IS NULL;`,
          [s.id]
        );
      } catch (err: unknown) {
        if (isMissingColumnError(err, ["is_skipped"])) {
          await connection.execute<ResultSetHeader>(
            `UPDATE workout_execution_sets
             SET completed_at = NOW(3), updated_at = NOW(3)
             WHERE execution_session_id = ? AND completed_at IS NULL;`,
            [s.id]
          );
        } else {
          throw err;
        }
      }
    } else {
      // Pending sets guard: reject if any set is not completed
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
    }

    // 3. Mark session COMPLETED with optional student feedback
    const studentCompletionState = options?.studentCompletionState || null;
    const studentFeedbackNotes = options?.studentFeedbackNotes?.trim() || null;
    try {
      await connection.execute<ResultSetHeader>(
        `UPDATE workout_execution_sessions
         SET status = 'COMPLETED',
             completed_at = GREATEST(NOW(3), started_at),
             student_completion_state = ?,
             student_feedback_notes = ?,
             student_feedback_at = CASE WHEN ? IS NOT NULL OR ? IS NOT NULL THEN NOW(3) ELSE NULL END,
             updated_at = NOW(3)
         WHERE id = ?;`,
        [studentCompletionState, studentFeedbackNotes, studentCompletionState, studentFeedbackNotes, s.id]
      );
    } catch (updErr: unknown) {
      if (isMissingColumnError(updErr, ["student_completion_state", "student_feedback_notes", "student_feedback_at"])) {
        if (studentCompletionState || studentFeedbackNotes) {
          throw new TrainingAuthorizationError(
            "Não foi possível salvar o feedback ou conclusão do treino pois as colunas necessárias não existem no banco de dados (Migration 068 pendente).",
            "MIGRATION_068_REQUIRED",
            500
          );
        }
        await connection.execute<ResultSetHeader>(
          `UPDATE workout_execution_sessions
           SET status = 'COMPLETED', completed_at = GREATEST(NOW(3), started_at), updated_at = NOW(3)
           WHERE id = ?;`,
          [s.id]
        );
      } else {
        throw updErr;
      }
    }

    const setRows = await queryExecutionSetsBySessionId(connection, Number(s.id));

    // 4. Dispatch notification to responsible Personal Trainer
    let notifIdToDeliver: number | null = null;
    try {
      const [relRows] = await connection.execute<RowDataPacket[]>(
        `SELECT
          wa.assigned_by_user_id,
          u.name AS student_name,
          cm.public_id AS student_membership_public_id,
          c.slug AS consultancy_slug,
          COALESCE(NULLIF(TRIM(wa.custom_title), ''), wv.title) AS workout_title
         FROM workout_assignments wa
         JOIN consultancy_members cm ON cm.id = wa.student_membership_id
         JOIN users u ON u.id = cm.user_id
         JOIN consultancies c ON c.id = wa.consultancy_id
         JOIN workout_versions wv ON wv.id = wa.workout_version_id
         WHERE wa.id = ? AND wa.assigned_by_user_id IS NOT NULL
         LIMIT 1;`,
        [s.workout_assignment_id]
      );

      if (Array.isArray(relRows) && relRows.length > 0 && relRows[0].assigned_by_user_id) {
        const rel = relRows[0];
        const feedbackSnippet = studentFeedbackNotes
          ? ` • Observação: "${studentFeedbackNotes.slice(0, 75)}${studentFeedbackNotes.length > 75 ? "..." : ""}"`
          : "";
        const notif = await createNotificationInTransaction(connection, {
          userId: Number(rel.assigned_by_user_id),
          consultancyId: Number(s.consultancy_id),
          title: "Treino Concluído pelo Aluno",
          body: `${rel.student_name || "Seu aluno"} concluiu o treino "${rel.workout_title || "Prescrição"}".${feedbackSnippet}`,
          eventType: "WORKOUT_COMPLETED",
          priority: "NORMAL",
          deepLink: `/consultoria/${rel.consultancy_slug}/progresso/alunos/${rel.student_membership_public_id}`,
          dedupeKey: `workout_completed:${s.public_id}`,
        });
        notifIdToDeliver = notif.id;
      }
    } catch {
      // Non-blocking notification
    }

    await connection.commit();

    if (notifIdToDeliver) {
      await deliverNotificationAfterCommit(notifIdToDeliver);
    }

    const now = new Date();
    const sessionStartedAt = new Date(s.started_at);
    const sessionCompletedAt = new Date(Math.max(now.getTime(), sessionStartedAt.getTime()));

    return {
      publicId: String(s.public_id),
      consultancyId: Number(s.consultancy_id),
      studentMembershipId: Number(s.student_membership_id),
      workoutAssignmentPublicId: String(s.assignment_public_id),
      workoutVersionPublicId: String(s.version_public_id),
      workoutBlockId: activeBlockId,
      workoutBlockPublicId: activeBlockPublicId,
      workoutBlockTitle: activeBlockTitle,
      status: "COMPLETED",
      studentCompletionState: (studentCompletionState as "ALL" | "PARTIAL" | "NONE") || null,
      studentFeedbackNotes: studentFeedbackNotes,
      startedAt: sessionStartedAt,
      completedAt: sessionCompletedAt,
      createdAt: new Date(s.created_at),
      updatedAt: sessionCompletedAt,
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
    const resolved = await resolveAssignmentForExecution(
      connection,
      assignmentPublicId,
      ctx.consultancyId || 0,
      ctx.membershipId || 0,
      ctx.userId
    );
    const assignTargetId = resolved ? resolved.id : null;

    // 1. Validate assignment ownership and tenancy
    const [assignRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, consultancy_id, student_membership_id
       FROM workout_assignments
       WHERE ${assignTargetId ? "id = ?" : "public_id = ?"} AND deleted_at IS NULL
       LIMIT 1;`,
      [assignTargetId ? assignTargetId : assignmentPublicId]
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

    const isAssignOwner =
      Number(assign.student_membership_id) === ctx.membershipId ||
      (await verifyUserMembershipOwnership(connection, assign.student_membership_id, ctx.userId, ctx.consultancyId));

    if (!isAssignOwner) {
      throw new TrainingAuthorizationError(
        "Acesso negado: prescrição pertence a outro aluno.",
        "FORBIDDEN",
        403
      );
    }

    // 2. Fetch COMPLETED sessions for this assignment (newest first, limit bounded)
    const safeLimit = Math.max(1, Math.min(limit, 100));
    let sessionRows: RowDataPacket[] = [];
    try {
      const [rows] = await connection.query<RowDataPacket[]>(
        `SELECT id, public_id, started_at, completed_at, student_completion_state, student_feedback_notes
         FROM workout_execution_sessions
         WHERE workout_assignment_id = ? AND status = 'COMPLETED'
         ORDER BY completed_at DESC, created_at DESC
         LIMIT ?;`,
        [assign.id, safeLimit]
      );
      sessionRows = rows;
    } catch (err: unknown) {
      if (isMissingColumnError(err, ["student_completion_state", "student_feedback_notes"])) {
        const [rows] = await connection.query<RowDataPacket[]>(
          `SELECT id, public_id, started_at, completed_at
           FROM workout_execution_sessions
           WHERE workout_assignment_id = ? AND status = 'COMPLETED'
           ORDER BY completed_at DESC, created_at DESC
           LIMIT ?;`,
          [assign.id, safeLimit]
        );
        sessionRows = rows;
      } else {
        throw err;
      }
    }

    if (!sessionRows || sessionRows.length === 0) {
      return [];
    }

    // 3. Batch fetch all execution sets for these sessions in ONE single query (zero N+1)
    const sessionIds = sessionRows.map((s) => Number(s.id));
    const setRows = await queryExecutionSetsBySessionIdsBatch(connection, sessionIds);

    // 4. Batch fetch substitutions for these sessions
    const subsBySessionId = new Map<number, Array<{
      blockItemId: number;
      blockItemPublicId: string;
      originalExerciseName: string;
      performedExerciseName: string;
      reason: string;
      source: string;
      sequenceNumber: number;
    }>>();

    try {
      const [subRows] = await connection.query<RowDataPacket[]>(
        `SELECT
          wees.execution_session_id,
          wees.block_item_id,
          wees.reason,
          wees.source,
          wees.sequence_number,
          wbi.public_id AS block_item_public_id,
          orig_ex.name AS original_exercise_name,
          perf_ex.name AS performed_exercise_name
         FROM workout_execution_exercise_substitutions wees
         INNER JOIN workout_block_items wbi ON wbi.id = wees.block_item_id
         INNER JOIN exercises orig_ex ON orig_ex.id = wees.original_exercise_id
         INNER JOIN exercises perf_ex ON perf_ex.id = wees.performed_exercise_id
         WHERE wees.execution_session_id IN (?)
         ORDER BY wees.execution_session_id ASC, wees.sequence_number ASC;`,
        [sessionIds]
      );

      for (const sub of subRows) {
        const sId = Number(sub.execution_session_id);
        if (!subsBySessionId.has(sId)) {
          subsBySessionId.set(sId, []);
        }
        subsBySessionId.get(sId)!.push({
          blockItemId: Number(sub.block_item_id),
          blockItemPublicId: String(sub.block_item_public_id),
          originalExerciseName: String(sub.original_exercise_name),
          performedExerciseName: String(sub.performed_exercise_name),
          reason: String(sub.reason),
          source: String(sub.source || "STUDENT_AI_SUGGESTION"),
          sequenceNumber: Number(sub.sequence_number),
        });
      }
    } catch {
      // Table might not have records or safe fallback
    }

    // Group sets by execution_session_id
    const setsBySessionId = new Map<number, WorkoutExecutionHistorySetDto[]>();
    for (const r of setRows) {
      const sId = Number(r.execution_session_id);
      if (!setsBySessionId.has(sId)) {
        setsBySessionId.set(sId, []);
      }

      // Check if this block item has a substitution in this session
      const sessionSubs = subsBySessionId.get(sId) || [];
      const matchingSub = sessionSubs.find((s) => s.blockItemId === Number(r.block_item_id));

      const prescribedName = matchingSub ? matchingSub.originalExerciseName : String(r.exercise_name_snapshot || "Exercício");
      const performedName = matchingSub ? matchingSub.performedExerciseName : prescribedName;

      setsBySessionId.get(sId)!.push({
        publicId: String(r.public_id),
        setNumber: Number(r.set_number),
        exerciseName: performedName,
        prescribedExerciseName: matchingSub ? prescribedName : undefined,
        performedExerciseName: matchingSub ? performedName : undefined,
        isSubstituted: Boolean(matchingSub),
        substitutionReason: matchingSub ? matchingSub.reason : undefined,
        substitutionSource: matchingSub ? matchingSub.source : undefined,
        blockItemPublicId: r.block_item_public_id ? String(r.block_item_public_id) : undefined,
        setType: r.set_type as WorkoutSetType,
        prescribedReps: r.prescribed_reps != null ? Number(r.prescribed_reps) : null,
        prescribedRepsMax: r.prescribed_reps_max != null ? Number(r.prescribed_reps_max) : null,
        prescribedLoadKg: r.prescribed_load_kg != null ? Number(r.prescribed_load_kg) : null,
        prescribedRestSeconds: r.prescribed_rest_seconds != null ? Number(r.prescribed_rest_seconds) : null,
        actualReps: r.actual_reps != null ? Number(r.actual_reps) : null,
        actualLoadKg: r.actual_load_kg != null ? Number(r.actual_load_kg) : null,
        isSkipped: Boolean(r.is_skipped),
        completedAt: r.completed_at ? new Date(r.completed_at) : null,
      });
    }

    return sessionRows.map((s) => {
      const sId = Number(s.id);
      const sessionSubs = (subsBySessionId.get(sId) || []).map((sub) => ({
        blockItemPublicId: sub.blockItemPublicId,
        originalExerciseName: sub.originalExerciseName,
        performedExerciseName: sub.performedExerciseName,
        reason: sub.reason,
        source: sub.source,
        sequenceNumber: sub.sequenceNumber,
      }));

      return {
        publicId: String(s.public_id),
        ...parseSanitizedExecutionDates(s.started_at, s.completed_at),
        studentCompletionState: (s.student_completion_state as "ALL" | "PARTIAL" | "NONE") || null,
        studentFeedbackNotes: s.student_feedback_notes ? String(s.student_feedback_notes) : null,
        sets: setsBySessionId.get(sId) || [],
        substitutions: sessionSubs.length > 0 ? sessionSubs : undefined,
      };
    });
  } finally {
    connection.release();
  }
}

export interface SyncOfflineWorkoutExecutionInput {
  operationId: string;
  clientExecutionId: string;
  assignmentPublicId: string;
  startedAt: string;
  completedAt: string;
  sets: Array<{
    setPublicId?: string;
    actualReps?: number | null;
    actualLoadKg?: number | null;
    isSkipped?: boolean;
    completedAt?: string | null;
  }>;
}

/**
 * Idempotently synchronizes a workout execution completed offline by a student.
 */
export async function syncOfflineWorkoutExecution(
  ctx: TrainingAccessContext,
  input: SyncOfflineWorkoutExecutionInput
): Promise<{ success: boolean; sessionPublicId: string; alreadySynced: boolean }> {
  assertStudentContext(ctx);

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Verify assignment and tenancy
    const [assignmentRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wa.id, wa.consultancy_id, wa.student_membership_id, wa.workout_version_id, wa.status
       FROM workout_assignments wa
       WHERE wa.public_id = ?
       LIMIT 1;`,
      [input.assignmentPublicId]
    );

    if (!assignmentRows || assignmentRows.length === 0) {
      throw new TrainingAuthorizationError("Prescrição de treino não encontrada.", "NOT_FOUND", 404);
    }

    const a = assignmentRows[0];
    if (Number(a.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado à consultoria.", "FORBIDDEN", 403);
    }
    if (Number(a.student_membership_id) !== ctx.membershipId) {
      throw new TrainingAuthorizationError("Prescrição não pertence a este aluno.", "FORBIDDEN", 403);
    }

    // 2. Check if a session with this clientExecutionId already exists
    const [existingSessions] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, status FROM workout_execution_sessions
       WHERE public_id = ?
       LIMIT 1
       FOR UPDATE;`,
      [input.clientExecutionId]
    );

    let notifIdToDeliver: number | null = null;

    if (existingSessions && existingSessions.length > 0) {
      const existing = existingSessions[0];
      if (existing.status === "COMPLETED") {
        await connection.commit();
        return { success: true, sessionPublicId: input.clientExecutionId, alreadySynced: true };
      }

      // Update in-progress session to completed
      const syncStartedAt = new Date(existing.started_at);
      const rawSyncCompletedAt = new Date(input.completedAt);
      const syncCompletedAt = new Date(Math.max(rawSyncCompletedAt.getTime(), syncStartedAt.getTime()));
      await connection.execute<ResultSetHeader>(
        `UPDATE workout_execution_sessions
         SET status = 'COMPLETED', completed_at = ?, updated_at = NOW(3)
         WHERE id = ?;`,
        [syncCompletedAt, existing.id]
      );

      // Update sets
      for (const s of input.sets) {
        if (s.setPublicId) {
          const isSkipped = Boolean(s.isSkipped);
          const actualReps = isSkipped ? null : (s.actualReps ?? null);
          const actualLoad = isSkipped ? null : (s.actualLoadKg ?? null);
          try {
            await connection.execute<ResultSetHeader>(
              `UPDATE workout_execution_sets
               SET actual_reps = ?, actual_load_kg = ?, is_skipped = ?, completed_at = COALESCE(?, NOW(3)), updated_at = NOW(3)
               WHERE execution_session_id = ? AND public_id = ?;`,
              [actualReps, actualLoad, isSkipped ? 1 : 0, s.completedAt ? new Date(s.completedAt) : null, existing.id, s.setPublicId]
            );
          } catch (err: unknown) {
            if (isMissingColumnError(err, ["is_skipped"])) {
              await connection.execute<ResultSetHeader>(
                `UPDATE workout_execution_sets
                 SET actual_reps = ?, actual_load_kg = ?, completed_at = COALESCE(?, NOW(3)), updated_at = NOW(3)
                 WHERE execution_session_id = ? AND public_id = ?;`,
                [actualReps, actualLoad, s.completedAt ? new Date(s.completedAt) : null, existing.id, s.setPublicId]
              );
            } else {
              throw err;
            }
          }
        }
      }

      // Notification
      try {
        const [relRows] = await connection.execute<RowDataPacket[]>(
          `SELECT wa.assigned_by_user_id, u.name AS student_name, cm.public_id AS student_membership_public_id, c.slug AS consultancy_slug, wv.title AS workout_title
           FROM workout_assignments wa
           JOIN consultancy_members cm ON cm.id = wa.student_membership_id
           JOIN users u ON u.id = cm.user_id
           JOIN consultancies c ON c.id = wa.consultancy_id
           JOIN workout_versions wv ON wv.id = wa.workout_version_id
           WHERE wa.id = ? AND wa.assigned_by_user_id IS NOT NULL
           LIMIT 1;`,
          [a.id]
        );
        if (Array.isArray(relRows) && relRows.length > 0 && relRows[0].assigned_by_user_id) {
          const rel = relRows[0];
          const notif = await createNotificationInTransaction(connection, {
            userId: Number(rel.assigned_by_user_id),
            consultancyId: Number(a.consultancy_id),
            title: "Treino Concluído pelo Aluno (Sincronizado)",
            body: `${rel.student_name || "Seu aluno"} sincronizou a conclusão do treino "${rel.workout_title || "Prescrição"}".`,
            eventType: "WORKOUT_COMPLETED",
            priority: "NORMAL",
            deepLink: `/consultoria/${rel.consultancy_slug}/progresso/alunos/${rel.student_membership_public_id}`,
            dedupeKey: `workout_completed:${input.clientExecutionId}`,
          });
          notifIdToDeliver = notif.id;
        }
      } catch {
        // Non-blocking notification
      }

      await connection.commit();

      if (notifIdToDeliver) {
        await deliverNotificationAfterCommit(notifIdToDeliver);
      }

      return { success: true, sessionPublicId: input.clientExecutionId, alreadySynced: false };
    }

    const offlineStartedAt = new Date(input.startedAt);
    const rawOfflineCompletedAt = new Date(input.completedAt);
    const offlineCompletedAt = new Date(Math.max(rawOfflineCompletedAt.getTime(), offlineStartedAt.getTime()));

    // 3. Insert new completed session with clientExecutionId
    const [insertSessionRes] = await connection.execute<ResultSetHeader>(
      `INSERT INTO workout_execution_sessions (
        public_id,
        consultancy_id,
        student_membership_id,
        workout_assignment_id,
        workout_version_id,
        status,
        started_at,
        completed_at
      ) VALUES (?, ?, ?, ?, ?, 'COMPLETED', ?, ?);`,
      [
        input.clientExecutionId,
        ctx.consultancyId!,
        ctx.membershipId!,
        a.id,
        a.workout_version_id,
        offlineStartedAt,
        offlineCompletedAt,
      ]
    );

    const sessionId = insertSessionRes.insertId;

    // Snapshot prescribed sets and attach completed values
    const [prescribedSets] = await connection.execute<RowDataPacket[]>(
      `SELECT
        wis.id AS workout_item_set_id,
        wis.block_item_id,
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

    for (let i = 0; i < prescribedSets.length; i++) {
      const ps = prescribedSets[i];
      const matchSet = input.sets[i];
      const isSkipped = Boolean(matchSet?.isSkipped);
      const actualReps = isSkipped ? null : (matchSet?.actualReps ?? null);
      const actualLoad = isSkipped ? null : (matchSet?.actualLoadKg ?? null);
      const completedAt = matchSet?.completedAt ? new Date(matchSet.completedAt) : new Date(input.completedAt);
      const setPublicId = matchSet?.setPublicId || crypto.randomUUID();

      try {
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
            prescribed_rest_seconds,
            actual_reps,
            actual_load_kg,
            is_skipped,
            completed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
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
            actualReps,
            actualLoad,
            isSkipped ? 1 : 0,
            completedAt,
          ]
        );
      } catch (err: unknown) {
        if (isMissingColumnError(err, ["is_skipped"])) {
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
              prescribed_rest_seconds,
              actual_reps,
              actual_load_kg,
              completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
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
              actualReps,
              actualLoad,
              completedAt,
            ]
          );
        } else {
          throw err;
        }
      }
    }

    // 4. Notification
    try {
      const [relRows] = await connection.execute<RowDataPacket[]>(
        `SELECT wa.assigned_by_user_id, u.name AS student_name, cm.public_id AS student_membership_public_id, c.slug AS consultancy_slug, wv.title AS workout_title
         FROM workout_assignments wa
         JOIN consultancy_members cm ON cm.id = wa.student_membership_id
         JOIN users u ON u.id = cm.user_id
         JOIN consultancies c ON c.id = wa.consultancy_id
         JOIN workout_versions wv ON wv.id = wa.workout_version_id
         WHERE wa.id = ? AND wa.assigned_by_user_id IS NOT NULL
         LIMIT 1;`,
        [a.id]
      );
      if (Array.isArray(relRows) && relRows.length > 0 && relRows[0].assigned_by_user_id) {
        const rel = relRows[0];
        const notif = await createNotificationInTransaction(connection, {
          userId: Number(rel.assigned_by_user_id),
          consultancyId: Number(a.consultancy_id),
          title: "Treino Concluído pelo Aluno (Sincronizado)",
          body: `${rel.student_name || "Seu aluno"} sincronizou a conclusão do treino "${rel.workout_title || "Prescrição"}".`,
          eventType: "WORKOUT_COMPLETED",
          priority: "NORMAL",
          deepLink: `/consultoria/${rel.consultancy_slug}/progresso/alunos/${rel.student_membership_public_id}`,
          dedupeKey: `workout_completed:${input.clientExecutionId}`,
        });
        notifIdToDeliver = notif.id;
      }
    } catch {
      // Non-blocking notification
    }

    await connection.commit();

    if (notifIdToDeliver) {
      await deliverNotificationAfterCommit(notifIdToDeliver);
    }

    return { success: true, sessionPublicId: input.clientExecutionId, alreadySynced: false };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export type ToggleExerciseCompletionResult = {
  sessionPublicId: string;
  blockItemPublicId: string;
  isCompleted: boolean;
  completedAt: string | null;
  sets: WorkoutExecutionSetDto[];
};

/**
 * Toggles exercise completion status on the checklist without fabricating loads or reps.
 * Persists in workout_execution_items and marks corresponding sets in workout_execution_sets.
 */
export async function toggleWorkoutExecutionExercise(
  ctx: TrainingAccessContext,
  sessionPublicId: string,
  blockItemPublicId: string,
  completed: boolean
): Promise<ToggleExerciseCompletionResult> {
  assertStudentContext(ctx);
  const pool = getDbPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const sessionRows = await queryExecutionSessionWithBlock(
      connection,
      "wes.public_id = ?",
      [sessionPublicId],
      true
    );
    if (!sessionRows || sessionRows.length === 0) {
      throw new TrainingAuthorizationError("Sessão não encontrada.", "NOT_FOUND", 404);
    }
    const s = sessionRows[0];
    if (Number(s.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado.", "FORBIDDEN", 403);
    }
    const isSessionOwner =
      Number(s.student_membership_id) === ctx.membershipId ||
      (await verifyUserMembershipOwnership(connection, s.student_membership_id, ctx.userId, ctx.consultancyId));
    if (!isSessionOwner) {
      throw new TrainingAuthorizationError("Acesso negado.", "FORBIDDEN", 403);
    }
    if (s.status !== "IN_PROGRESS") {
      throw new TrainingAuthorizationError("Esta sessão já foi finalizada.", "SESSION_NOT_IN_PROGRESS", 400);
    }

    const [itemRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, block_id FROM workout_block_items WHERE public_id = ? LIMIT 1;`,
      [blockItemPublicId]
    );
    if (!itemRows || itemRows.length === 0) {
      throw new TrainingAuthorizationError("Exercício não encontrado.", "NOT_FOUND", 404);
    }
    const item = itemRows[0];

    const itemPublicId = crypto.randomUUID();
    const completedAtIso = completed ? new Date().toISOString() : null;

    try {
      if (completed) {
        await connection.execute<ResultSetHeader>(
          `INSERT INTO workout_execution_items (
            public_id, execution_session_id, block_item_id, status, completed_at
          ) VALUES (?, ?, ?, 'COMPLETED', NOW(3))
          ON DUPLICATE KEY UPDATE status = 'COMPLETED', completed_at = NOW(3), skip_reason = NULL, updated_at = NOW(3);`,
          [itemPublicId, s.id, item.id]
        );
      } else {
        await connection.execute<ResultSetHeader>(
          `DELETE FROM workout_execution_items
           WHERE execution_session_id = ? AND block_item_id = ?;`,
          [s.id, item.id]
        );
      }
    } catch (itemErr: unknown) {
      if (isMissingTableError(itemErr, ["workout_execution_items"])) {
        throw new TrainingAuthorizationError(
          "Não foi possível salvar o estado do exercício no checklist pois a tabela workout_execution_items não existe no banco de dados (Migration 068 pendente).",
          "MIGRATION_068_REQUIRED",
          500
        );
      }
      throw itemErr;
    }

    if (completed) {
      try {
        await connection.execute<ResultSetHeader>(
          `UPDATE workout_execution_sets
           SET completed_at = COALESCE(completed_at, NOW(3)),
               is_skipped = 0,
               updated_at = NOW(3)
           WHERE execution_session_id = ? AND block_item_id = ?;`,
          [s.id, item.id]
        );
      } catch (setErr: unknown) {
        if (isMissingColumnError(setErr, ["is_skipped"])) {
          await connection.execute<ResultSetHeader>(
            `UPDATE workout_execution_sets
             SET completed_at = COALESCE(completed_at, NOW(3)),
                 updated_at = NOW(3)
             WHERE execution_session_id = ? AND block_item_id = ?;`,
            [s.id, item.id]
          );
        } else {
          throw setErr;
        }
      }
    } else {
      try {
        await connection.execute<ResultSetHeader>(
          `UPDATE workout_execution_sets
           SET completed_at = NULL,
               is_skipped = 0,
               updated_at = NOW(3)
           WHERE execution_session_id = ? AND block_item_id = ?
             AND actual_reps IS NULL AND actual_load_kg IS NULL;`,
          [s.id, item.id]
        );
      } catch (setErr: unknown) {
        if (isMissingColumnError(setErr, ["is_skipped"])) {
          await connection.execute<ResultSetHeader>(
            `UPDATE workout_execution_sets
             SET completed_at = NULL,
                 updated_at = NOW(3)
             WHERE execution_session_id = ? AND block_item_id = ?
               AND actual_reps IS NULL AND actual_load_kg IS NULL;`,
            [s.id, item.id]
          );
        } else {
          throw setErr;
        }
      }
    }

    const setRows = await queryExecutionSetsBySessionId(connection, Number(s.id));
    await connection.commit();

    return {
      sessionPublicId,
      blockItemPublicId,
      isCompleted: completed,
      completedAt: completedAtIso,
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
 * Marks an exercise as skipped in the active checklist session.
 */
export async function skipWorkoutExecutionExercise(
  ctx: TrainingAccessContext,
  sessionPublicId: string,
  blockItemPublicId: string,
  reason?: string | null
): Promise<ToggleExerciseCompletionResult> {
  assertStudentContext(ctx);
  const pool = getDbPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const sessionRows = await queryExecutionSessionWithBlock(
      connection,
      "wes.public_id = ?",
      [sessionPublicId],
      true
    );
    if (!sessionRows || sessionRows.length === 0) {
      throw new TrainingAuthorizationError("Sessão não encontrada.", "NOT_FOUND", 404);
    }
    const s = sessionRows[0];
    if (Number(s.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado.", "FORBIDDEN", 403);
    }
    const isSessionOwner =
      Number(s.student_membership_id) === ctx.membershipId ||
      (await verifyUserMembershipOwnership(connection, s.student_membership_id, ctx.userId, ctx.consultancyId));
    if (!isSessionOwner) {
      throw new TrainingAuthorizationError("Acesso negado.", "FORBIDDEN", 403);
    }
    if (s.status !== "IN_PROGRESS") {
      throw new TrainingAuthorizationError("Esta sessão já foi finalizada.", "SESSION_NOT_IN_PROGRESS", 400);
    }

    const [itemRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, block_id FROM workout_block_items WHERE public_id = ? LIMIT 1;`,
      [blockItemPublicId]
    );
    if (!itemRows || itemRows.length === 0) {
      throw new TrainingAuthorizationError("Exercício não encontrado.", "NOT_FOUND", 404);
    }
    const item = itemRows[0];

    const itemPublicId = crypto.randomUUID();
    const cleanReason = reason?.trim() || null;

    try {
      await connection.execute<ResultSetHeader>(
        `INSERT INTO workout_execution_items (
          public_id, execution_session_id, block_item_id, status, skip_reason, completed_at
        ) VALUES (?, ?, ?, 'SKIPPED', ?, NOW(3))
        ON DUPLICATE KEY UPDATE status = 'SKIPPED', skip_reason = ?, completed_at = NOW(3), updated_at = NOW(3);`,
        [itemPublicId, s.id, item.id, cleanReason, cleanReason]
      );
    } catch (itemErr: unknown) {
      if (isMissingTableError(itemErr, ["workout_execution_items"])) {
        throw new TrainingAuthorizationError(
          "Não foi possível marcar o exercício como pulado no checklist pois a tabela workout_execution_items não existe no banco de dados (Migration 068 pendente).",
          "MIGRATION_068_REQUIRED",
          500
        );
      }
      throw itemErr;
    }

    try {
      await connection.execute<ResultSetHeader>(
        `UPDATE workout_execution_sets
         SET completed_at = NOW(3),
             is_skipped = 1,
             updated_at = NOW(3)
         WHERE execution_session_id = ? AND block_item_id = ?;`,
        [s.id, item.id]
      );
    } catch (setErr: unknown) {
      if (isMissingColumnError(setErr, ["is_skipped"])) {
        await connection.execute<ResultSetHeader>(
          `UPDATE workout_execution_sets
           SET completed_at = NOW(3),
               updated_at = NOW(3)
           WHERE execution_session_id = ? AND block_item_id = ?;`,
          [s.id, item.id]
        );
      } else {
        throw setErr;
      }
    }

    const setRows = await queryExecutionSetsBySessionId(connection, Number(s.id));
    await connection.commit();

    return {
      sessionPublicId,
      blockItemPublicId,
      isCompleted: false,
      completedAt: null,
      sets: setRows.map(mapExecutionSetRow),
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}
