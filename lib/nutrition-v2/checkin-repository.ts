/**
 * TREVO ONE — NUTRITION V2 CHECK-IN REPOSITORY
 * Persistent transactions, atomic submissions, state derivations, and tenant security.
 *
 * Rules:
 * - Atomic submit: single transaction locking request row and updating request to COMPLETED.
 * - Concurrency guard: stable row lock on student membership before creating request.
 * - Immutability: responses cannot be updated once inserted.
 * - UNKNOWN != ZERO | UNKNOWN != FALSE
 * - Request-driven: every response is tied 1:1 to a request.
 */

import crypto from "node:crypto";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";
import {
  type CheckinRequestDto,
  type CheckinResponseDto,
  type CheckinDetailDto,
  type PatientCheckinsHubSummaryDto,
  type CreateCheckinRequestInput,
  type SubmitCheckinResponseInput,
  type CancelCheckinRequestInput,
  type CheckinAdherenceLevel,
  type PersistedCheckinRequestStatus,
  CHECKIN_ADHERENCE_LEVELS,
  deriveCheckinRequestState,
} from "./checkin-types";

function mapRowToCheckinRequest(row: RowDataPacket | Record<string, unknown>, now = new Date()): CheckinRequestDto {
  const status = row.status as PersistedCheckinRequestStatus;
  const dueAt = row.due_at
    ? typeof row.due_at === "string"
      ? row.due_at
      : new Date(row.due_at).toISOString()
    : null;
  const requestedAt = row.requested_at
    ? typeof row.requested_at === "string"
      ? row.requested_at
      : new Date(row.requested_at).toISOString()
    : new Date().toISOString();

  return {
    id: Number(row.id),
    publicId: String(row.public_id),
    consultancyId: Number(row.consultancy_id),
    studentMembershipId: Number(row.student_membership_id),
    studentName: row.student_name ? String(row.student_name) : undefined,
    studentPublicId: row.student_public_id ? String(row.student_public_id) : undefined,
    requestedByMembershipId: Number(row.requested_by_membership_id),
    requestedByName: row.requested_by_name ? String(row.requested_by_name) : undefined,
    status,
    derivedState: deriveCheckinRequestState(status, dueAt, now),
    requestedAt,
    dueAt,
    canceledAt: row.canceled_at
      ? typeof row.canceled_at === "string"
        ? row.canceled_at
        : new Date(row.canceled_at).toISOString()
      : null,
    canceledByMembershipId: row.canceled_by_membership_id ? Number(row.canceled_by_membership_id) : null,
    createdAt: row.created_at
      ? typeof row.created_at === "string"
        ? row.created_at
        : new Date(row.created_at).toISOString()
      : new Date().toISOString(),
    updatedAt: row.updated_at
      ? typeof row.updated_at === "string"
        ? row.updated_at
        : new Date(row.updated_at).toISOString()
      : new Date().toISOString(),
    hasResponse: Boolean(row.response_id),
    responsePublicId: row.response_public_id ? String(row.response_public_id) : null,
  };
}

function mapRowToCheckinResponse(row: RowDataPacket): CheckinResponseDto {
  return {
    id: Number(row.id),
    publicId: String(row.public_id),
    requestId: Number(row.request_id),
    requestPublicId: String(row.request_public_id),
    consultancyId: Number(row.consultancy_id),
    studentMembershipId: Number(row.student_membership_id),
    studentName: row.student_name ? String(row.student_name) : undefined,
    submittedAt: row.submitted_at
      ? typeof row.submitted_at === "string"
        ? row.submitted_at
        : new Date(row.submitted_at).toISOString()
      : new Date().toISOString(),
    adherence: row.adherence as CheckinAdherenceLevel,
    hungerRating: row.hunger_rating !== null && row.hunger_rating !== undefined ? Number(row.hunger_rating) : null,
    energyRating: row.energy_rating !== null && row.energy_rating !== undefined ? Number(row.energy_rating) : null,
    sleepRating: row.sleep_rating !== null && row.sleep_rating !== undefined ? Number(row.sleep_rating) : null,
    trainingRating: row.training_rating !== null && row.training_rating !== undefined ? Number(row.training_rating) : null,
    hydrationLiters: row.hydration_liters !== null && row.hydration_liters !== undefined ? Number(row.hydration_liters) : null,
    selfReportedWeightKg: row.self_reported_weight_kg !== null && row.self_reported_weight_kg !== undefined ? Number(row.self_reported_weight_kg) : null,
    difficultyText: row.difficulty_text ? String(row.difficulty_text) : null,
    studentNotes: row.student_notes ? String(row.student_notes) : null,
    requestsHelp: row.requests_help !== null && row.requests_help !== undefined ? Boolean(row.requests_help) : null,
    createdAt: row.created_at
      ? typeof row.created_at === "string"
        ? row.created_at
        : new Date(row.created_at).toISOString()
      : new Date().toISOString(),
  };
}

/**
 * Creates a new check-in request with strict concurrency locking.
 */
export async function createCheckinRequest(
  input: CreateCheckinRequestInput
): Promise<CheckinRequestDto> {
  const connection = await getDbConnection();
  try {
    await connection.beginTransaction();

    // 1. Lock student membership row to ensure mutual exclusion across concurrent requests for the same student
    const [memberRows] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id, cm.consultancy_id, u.full_name AS student_name, cm.public_id AS student_public_id
       FROM consultancy_members cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.id = ? AND cm.consultancy_id = ? AND cm.status = 'ACTIVE'
       FOR UPDATE;`,
      [input.studentMembershipId, input.consultancyId]
    );

    if (!Array.isArray(memberRows) || memberRows.length === 0) {
      await connection.rollback();
      throw new Error("STUDENT_NOT_FOUND");
    }

    // 2. Check for active pending request that is NOT expired
    const [pendingRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, status, due_at
       FROM nutrition_v2_checkin_requests
       WHERE consultancy_id = ?
         AND student_membership_id = ?
         AND status = 'PENDING'
       ORDER BY requested_at DESC;`,
      [input.consultancyId, input.studentMembershipId]
    );

    const now = new Date();
    const hasUnexpiredPending = pendingRows.some((row) => {
      if (row.due_at) {
        const dueTime = new Date(row.due_at).getTime();
        return dueTime >= now.getTime();
      }
      return true; // No due date means open pending
    });

    if (hasUnexpiredPending) {
      await connection.rollback();
      throw new Error("EXISTING_PENDING_CHECKIN");
    }

    // 3. Validate dueAt (must be in the future if provided)
    let formattedDueAt: string | null = null;
    if (input.dueAt) {
      const dueDate = typeof input.dueAt === "string" ? new Date(input.dueAt) : input.dueAt;
      if (isNaN(dueDate.getTime())) {
        await connection.rollback();
        throw new Error("INVALID_DUE_DATE");
      }
      if (dueDate.getTime() <= now.getTime()) {
        await connection.rollback();
        throw new Error("DUE_DATE_MUST_BE_FUTURE");
      }
      formattedDueAt = dueDate.toISOString().slice(0, 19).replace("T", " ");
    }

    const publicId = crypto.randomUUID();

    // 4. Insert request
    const [insertResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO nutrition_v2_checkin_requests (
         public_id, consultancy_id, student_membership_id, requested_by_membership_id,
         status, requested_at, due_at, created_at, updated_at
       ) VALUES (?, ?, ?, ?, 'PENDING', NOW(3), ?, NOW(3), NOW(3));`,
      [
        publicId,
        input.consultancyId,
        input.studentMembershipId,
        input.requestedByMembershipId,
        formattedDueAt,
      ]
    );

    const newId = insertResult.insertId;

    await connection.commit();

    return {
      id: newId,
      publicId,
      consultancyId: input.consultancyId,
      studentMembershipId: input.studentMembershipId,
      studentName: memberRows[0].student_name,
      studentPublicId: memberRows[0].student_public_id,
      requestedByMembershipId: input.requestedByMembershipId,
      status: "PENDING",
      derivedState: "PENDING",
      requestedAt: now.toISOString(),
      dueAt: input.dueAt ? new Date(input.dueAt).toISOString() : null,
      canceledAt: null,
      canceledByMembershipId: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      hasResponse: false,
      responsePublicId: null,
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Cancels a pending check-in request.
 */
export async function cancelCheckinRequest(
  input: CancelCheckinRequestInput
): Promise<CheckinRequestDto> {
  const connection = await getDbConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT r.*, u.full_name AS student_name, cm.public_id AS student_public_id
       FROM nutrition_v2_checkin_requests r
       JOIN consultancy_members cm ON cm.id = r.student_membership_id
       JOIN users u ON u.id = cm.user_id
       WHERE r.public_id = ? AND r.consultancy_id = ?
       FOR UPDATE;`,
      [input.requestPublicId, input.consultancyId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      await connection.rollback();
      throw new Error("REQUEST_NOT_FOUND");
    }

    const row = rows[0];
    if (row.status === "COMPLETED") {
      await connection.rollback();
      throw new Error("CANNOT_CANCEL_COMPLETED");
    }
    if (row.status === "CANCELED") {
      await connection.rollback();
      throw new Error("ALREADY_CANCELED");
    }

    await connection.execute(
      `UPDATE nutrition_v2_checkin_requests
       SET status = 'CANCELED',
           canceled_at = NOW(3),
           canceled_by_membership_id = ?,
           updated_at = NOW(3)
       WHERE id = ?;`,
      [input.canceledByMembershipId, row.id]
    );

    await connection.commit();

    return mapRowToCheckinRequest({
      ...row,
      status: "CANCELED",
      canceled_at: new Date().toISOString(),
      canceled_by_membership_id: input.canceledByMembershipId,
    });
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Validates rating range (1-5 integer, or null).
 */
function validateRating(val?: number | null): number | null {
  if (val === undefined || val === null) return null;
  const num = Number(val);
  if (!Number.isInteger(num) || num < 1 || num > 5) {
    throw new Error("RATING_MUST_BE_1_TO_5");
  }
  return num;
}

/**
 * Submits student check-in response in an atomic single transaction.
 */
export async function submitCheckinResponse(
  consultancyId: number,
  requestPublicId: string,
  authenticatedStudentMembershipId: number,
  input: SubmitCheckinResponseInput
): Promise<CheckinResponseDto> {
  // Validate adherence
  if (!CHECKIN_ADHERENCE_LEVELS.includes(input.adherence)) {
    throw new Error("ADHERENCE_REQUIRED");
  }

  // Validate ratings (1-5, UNKNOWN != ZERO)
  const hunger = validateRating(input.hungerRating);
  const energy = validateRating(input.energyRating);
  const sleep = validateRating(input.sleepRating);
  const training = validateRating(input.trainingRating);

  // Validate hydration (positive decimal or null)
  let hydration: number | null = null;
  if (input.hydrationLiters !== undefined && input.hydrationLiters !== null) {
    const rawHydration = Number(input.hydrationLiters);
    if (isNaN(rawHydration) || rawHydration < 0 || rawHydration > 30) {
      throw new Error("INVALID_HYDRATION_VALUE");
    }
    hydration = Math.round(rawHydration * 100) / 100;
  }

  // Validate weight (positive decimal or null)
  let weight: number | null = null;
  if (input.selfReportedWeightKg !== undefined && input.selfReportedWeightKg !== null) {
    const rawWeight = Number(input.selfReportedWeightKg);
    if (isNaN(rawWeight) || rawWeight < 20 || rawWeight > 500) {
      throw new Error("INVALID_WEIGHT_VALUE");
    }
    weight = Math.round(rawWeight * 100) / 100;
  }

  const difficulty = input.difficultyText?.trim() || null;
  const studentNotes = input.studentNotes?.trim() || null;

  // Requests help: BOOLEAN NULL (UNKNOWN != FALSE)
  let requestsHelp: boolean | null = null;
  if (input.requestsHelp === true) requestsHelp = true;
  else if (input.requestsHelp === false) requestsHelp = false;

  const connection = await getDbConnection();
  try {
    await connection.beginTransaction();

    // 1. SELECT and lock request row
    const [reqRows] = await connection.execute<RowDataPacket[]>(
      `SELECT r.id, r.public_id, r.consultancy_id, r.student_membership_id, r.status, r.due_at,
              u.full_name AS student_name
       FROM nutrition_v2_checkin_requests r
       JOIN consultancy_members cm ON cm.id = r.student_membership_id
       JOIN users u ON u.id = cm.user_id
       WHERE r.public_id = ? AND r.consultancy_id = ?
       FOR UPDATE;`,
      [requestPublicId, consultancyId]
    );

    if (!Array.isArray(reqRows) || reqRows.length === 0) {
      await connection.rollback();
      throw new Error("REQUEST_NOT_FOUND");
    }

    const req = reqRows[0];

    // 2. Validate tenant & student membership ownership
    if (Number(req.student_membership_id) !== authenticatedStudentMembershipId) {
      await connection.rollback();
      throw new Error("FORBIDDEN_STUDENT_MISMATCH");
    }

    // 3. Check status
    if (req.status === "COMPLETED") {
      await connection.rollback();
      throw new Error("ALREADY_SUBMITTED");
    }
    if (req.status === "CANCELED") {
      await connection.rollback();
      throw new Error("REQUEST_CANCELED");
    }

    // 4. Check due_at (expired)
    if (req.due_at) {
      const dueTime = new Date(req.due_at).getTime();
      if (dueTime < Date.now()) {
        await connection.rollback();
        throw new Error("CHECKIN_EXPIRED");
      }
    }

    // 5. Check if response already exists (guarantee 1 response per request)
    const [existingResp] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM nutrition_v2_checkins WHERE request_id = ? FOR UPDATE;`,
      [req.id]
    );
    if (Array.isArray(existingResp) && existingResp.length > 0) {
      await connection.rollback();
      throw new Error("ALREADY_SUBMITTED");
    }

    const responsePublicId = crypto.randomUUID();

    // 6. INSERT response into nutrition_v2_checkins
    const [insertResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO nutrition_v2_checkins (
         public_id, request_id, consultancy_id, student_membership_id,
         submitted_at, adherence, hunger_rating, energy_rating, sleep_rating,
         training_rating, hydration_liters, self_reported_weight_kg,
         difficulty_text, student_notes, requests_help, created_at
       ) VALUES (?, ?, ?, ?, NOW(3), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3));`,
      [
        responsePublicId,
        req.id,
        consultancyId,
        authenticatedStudentMembershipId,
        input.adherence,
        hunger,
        energy,
        sleep,
        training,
        hydration,
        weight,
        difficulty,
        studentNotes,
        requestsHelp === null ? null : requestsHelp ? 1 : 0,
      ]
    );

    // 7. UPDATE request status to COMPLETED
    await connection.execute(
      `UPDATE nutrition_v2_checkin_requests
       SET status = 'COMPLETED',
           updated_at = NOW(3)
       WHERE id = ?;`,
      [req.id]
    );

    await connection.commit();

    return {
      id: insertResult.insertId,
      publicId: responsePublicId,
      requestId: Number(req.id),
      requestPublicId: req.public_id,
      consultancyId,
      studentMembershipId: authenticatedStudentMembershipId,
      studentName: req.student_name,
      submittedAt: new Date().toISOString(),
      adherence: input.adherence,
      hungerRating: hunger,
      energyRating: energy,
      sleepRating: sleep,
      trainingRating: training,
      hydrationLiters: hydration,
      selfReportedWeightKg: weight,
      difficultyText: difficulty,
      studentNotes,
      requestsHelp,
      createdAt: new Date().toISOString(),
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Returns active pending check-in request for a student (if any).
 */
export async function getPendingCheckinForStudent(
  consultancyId: number,
  studentMembershipId: number
): Promise<CheckinRequestDto | null> {
  const connection = await getDbConnection();
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT r.*, u.full_name AS student_name, cm.public_id AS student_public_id,
              resp.public_id AS response_public_id, resp.id AS response_id
       FROM nutrition_v2_checkin_requests r
       JOIN consultancy_members cm ON cm.id = r.student_membership_id
       JOIN users u ON u.id = cm.user_id
       LEFT JOIN nutrition_v2_checkins resp ON resp.request_id = r.id
       WHERE r.consultancy_id = ?
         AND r.student_membership_id = ?
         AND r.status = 'PENDING'
       ORDER BY r.requested_at DESC
       LIMIT 1;`,
      [consultancyId, studentMembershipId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    return mapRowToCheckinRequest(rows[0]);
  } finally {
    connection.release();
  }
}

/**
 * Returns the latest completed check-in response for a student.
 */
export async function getLatestCompletedCheckin(
  consultancyId: number,
  studentMembershipId: number
): Promise<CheckinResponseDto | null> {
  const connection = await getDbConnection();
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT c.*, req.public_id AS request_public_id, u.full_name AS student_name
       FROM nutrition_v2_checkins c
       JOIN nutrition_v2_checkin_requests req ON req.id = c.request_id
       JOIN consultancy_members cm ON cm.id = c.student_membership_id
       JOIN users u ON u.id = cm.user_id
       WHERE c.consultancy_id = ?
         AND c.student_membership_id = ?
       ORDER BY c.submitted_at DESC
       LIMIT 1;`,
      [consultancyId, studentMembershipId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    return mapRowToCheckinResponse(rows[0]);
  } finally {
    connection.release();
  }
}

/**
 * Returns the Patient Hub check-ins summary (latest completed, pending request, history list).
 */
export async function getPatientCheckinsHubSummary(
  consultancyId: number,
  studentMembershipId: number
): Promise<PatientCheckinsHubSummaryDto> {
  const connection = await getDbConnection();
  try {
    // 1. Pending request
    const [pendingRows] = await connection.execute<RowDataPacket[]>(
      `SELECT r.*, u.full_name AS student_name, cm.public_id AS student_public_id,
              resp.public_id AS response_public_id, resp.id AS response_id
       FROM nutrition_v2_checkin_requests r
       JOIN consultancy_members cm ON cm.id = r.student_membership_id
       JOIN users u ON u.id = cm.user_id
       LEFT JOIN nutrition_v2_checkins resp ON resp.request_id = r.id
       WHERE r.consultancy_id = ?
         AND r.student_membership_id = ?
         AND r.status = 'PENDING'
       ORDER BY r.requested_at DESC
       LIMIT 1;`,
      [consultancyId, studentMembershipId]
    );

    const pendingRequest =
      Array.isArray(pendingRows) && pendingRows.length > 0
        ? mapRowToCheckinRequest(pendingRows[0])
        : null;

    // 2. Completed responses history (most recent first)
    const [respRows] = await connection.execute<RowDataPacket[]>(
      `SELECT c.*, req.public_id AS request_public_id, u.full_name AS student_name
       FROM nutrition_v2_checkins c
       JOIN nutrition_v2_checkin_requests req ON req.id = c.request_id
       JOIN consultancy_members cm ON cm.id = c.student_membership_id
       JOIN users u ON u.id = cm.user_id
       WHERE c.consultancy_id = ?
         AND c.student_membership_id = ?
       ORDER BY c.submitted_at DESC;`,
      [consultancyId, studentMembershipId]
    );

    const recentResponses = Array.isArray(respRows)
      ? respRows.map(mapRowToCheckinResponse)
      : [];

    const latestCompletedCheckin = recentResponses[0] || null;
    const requestsHelpCount = recentResponses.filter((r) => r.requestsHelp === true).length;

    return {
      latestCompletedCheckin,
      pendingRequest,
      recentResponses,
      totalCompletedCount: recentResponses.length,
      requestsHelpCount,
    };
  } finally {
    connection.release();
  }
}

/**
 * Returns detail of a checkin response, including previous response for comparative diffs.
 */
export async function getCheckinDetailByPublicId(
  consultancyId: number,
  responsePublicId: string
): Promise<CheckinDetailDto | null> {
  const connection = await getDbConnection();
  try {
    const [respRows] = await connection.execute<RowDataPacket[]>(
      `SELECT c.*, req.public_id AS request_public_id, req.status AS request_status,
              req.requested_at, req.due_at, req.canceled_at, req.canceled_by_membership_id,
              req.created_at AS request_created_at, req.updated_at AS request_updated_at,
              req.requested_by_membership_id,
              u.full_name AS student_name, cm.public_id AS student_public_id,
              prof_user.full_name AS requested_by_name
       FROM nutrition_v2_checkins c
       JOIN nutrition_v2_checkin_requests req ON req.id = c.request_id
       JOIN consultancy_members cm ON cm.id = c.student_membership_id
       JOIN users u ON u.id = cm.user_id
       JOIN consultancy_members prof_cm ON prof_cm.id = req.requested_by_membership_id
       JOIN users prof_user ON prof_user.id = prof_cm.user_id
       WHERE c.public_id = ? AND c.consultancy_id = ?
       LIMIT 1;`,
      [responsePublicId, consultancyId]
    );

    if (!Array.isArray(respRows) || respRows.length === 0) {
      return null;
    }

    const currentResp = mapRowToCheckinResponse(respRows[0]);
    const request = mapRowToCheckinRequest({
      id: respRows[0].request_id,
      public_id: respRows[0].request_public_id,
      consultancy_id: currentResp.consultancyId,
      student_membership_id: currentResp.studentMembershipId,
      student_name: currentResp.studentName,
      student_public_id: respRows[0].student_public_id,
      requested_by_membership_id: respRows[0].requested_by_membership_id,
      requested_by_name: respRows[0].requested_by_name,
      status: respRows[0].request_status,
      requested_at: respRows[0].requested_at,
      due_at: respRows[0].due_at,
      canceled_at: respRows[0].canceled_at,
      canceled_by_membership_id: respRows[0].canceled_by_membership_id,
      created_at: respRows[0].request_created_at,
      updated_at: respRows[0].request_updated_at,
      response_id: currentResp.id,
      response_public_id: currentResp.publicId,
    });

    // Find previous response for comparative metrics
    const [prevRows] = await connection.execute<RowDataPacket[]>(
      `SELECT submitted_at, adherence, hunger_rating, energy_rating, sleep_rating,
              training_rating, hydration_liters, self_reported_weight_kg
       FROM nutrition_v2_checkins
       WHERE consultancy_id = ?
         AND student_membership_id = ?
         AND submitted_at < ?
       ORDER BY submitted_at DESC
       LIMIT 1;`,
      [consultancyId, currentResp.studentMembershipId, currentResp.submittedAt]
    );

    let previousResponseSummary = null;
    if (Array.isArray(prevRows) && prevRows.length > 0) {
      const p = prevRows[0];
      previousResponseSummary = {
        submittedAt: typeof p.submitted_at === "string" ? p.submitted_at : new Date(p.submitted_at).toISOString(),
        adherence: p.adherence as CheckinAdherenceLevel,
        hungerRating: p.hunger_rating !== null ? Number(p.hunger_rating) : null,
        energyRating: p.energy_rating !== null ? Number(p.energy_rating) : null,
        sleepRating: p.sleep_rating !== null ? Number(p.sleep_rating) : null,
        trainingRating: p.training_rating !== null ? Number(p.training_rating) : null,
        hydrationLiters: p.hydration_liters !== null ? Number(p.hydration_liters) : null,
        selfReportedWeightKg: p.self_reported_weight_kg !== null ? Number(p.self_reported_weight_kg) : null,
      };
    }

    return {
      request,
      response: currentResp,
      previousResponseSummary,
    };
  } finally {
    connection.release();
  }
}
