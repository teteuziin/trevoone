/**
 * TREVO ONE — PATIENT FOLLOW-UP & TIMELINE REPOSITORY (V1)
 *
 * Rules:
 * - Zero check-in duplication: Phase 7 check-ins are composed in memory from existing tables.
 * - Strict multi-tenancy & ownership validation.
 * - File consistency: calling action cleans up file if DB insert fails.
 * - In-app notification with deduplication key to avoid spam.
 */

import crypto from "node:crypto";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";
import {
  type FollowupEventType,
  type FollowupMealType,
  type FollowupEventRowDto,
  type CreateFoodPhotoEventInput,
  type CreatePatientNoteEventInput,
  type FollowupTimelineItemDto,
  type PatientFollowupHubSummaryDto,
  type CheckinRequestTimelinePayload,
  FOLLOWUP_MEAL_TYPE_LABELS,
  validateFoodPhotoInput,
  validatePatientNoteInput,
  validateOccurredAt,
} from "./followup-types";
import {
  CHECKIN_ADHERENCE_LABELS,
  deriveCheckinRequestState,
  type CheckinAdherenceLevel,
  type PersistedCheckinRequestStatus,
} from "./checkin-types";
import { createNotificationInTransaction, deliverNotificationAfterCommit } from "../../services/notification-service";

function formatDateIso(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (typeof val === "string") return val;
  if (val instanceof Date) return val.toISOString();
  return new Date(String(val)).toISOString();
}

/**
 * Inserts a new FOOD_PHOTO follow-up event into the database.
 */
export async function createFoodPhotoFollowupEvent(
  input: CreateFoodPhotoEventInput
): Promise<FollowupEventRowDto> {
  validateFoodPhotoInput(input);
  const occurredAtDate = validateOccurredAt(input.occurredAt);

  const connection = await getDbConnection();
  try {
    await connection.beginTransaction();

    const publicId = crypto.randomUUID();

    const [insertResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO nutrition_v2_patient_followup_events (
        public_id,
        consultancy_id,
        student_membership_id,
        author_membership_id,
        event_type,
        occurred_at,
        meal_type,
        caption,
        photo_storage_key,
        photo_sha256,
        photo_size_bytes,
        photo_mime_type,
        created_at
      ) VALUES (?, ?, ?, ?, 'FOOD_PHOTO', ?, ?, ?, ?, ?, ?, ?, NOW(3));`,
      [
        publicId,
        input.consultancyId,
        input.studentMembershipId,
        input.authorMembershipId,
        occurredAtDate,
        input.mealType || null,
        input.caption ? input.caption.trim() : null,
        input.photoStorageKey,
        input.photoSha256,
        input.photoSizeBytes,
        input.photoMimeType,
      ]
    );

    const insertedId = insertResult.insertId;

    // Dispatch non-blocking in-app notification to consultancy nutritionists
    const notifIdsToDeliver: number[] = [];
    try {
      const [authorRows] = await connection.execute<RowDataPacket[]>(
        `SELECT u.full_name, c.slug AS consultancy_slug
         FROM consultancy_members cm
         JOIN users u ON u.id = cm.user_id
         JOIN consultancies c ON c.id = cm.consultancy_id
         WHERE cm.id = ? LIMIT 1;`,
        [input.authorMembershipId]
      );
      const studentName = authorRows.length > 0 ? authorRows[0].full_name : "Paciente";
      const consultancySlug = authorRows.length > 0 ? authorRows[0].consultancy_slug : "";

      const [profRows] = await connection.execute<RowDataPacket[]>(
        `SELECT DISTINCT cm.user_id
         FROM consultancy_members cm
         WHERE cm.consultancy_id = ?
           AND cm.role IN ('NUTRITIONIST', 'CONSULTANCY_ADMIN')
           AND cm.status = 'ACTIVE'
         LIMIT 5;`,
        [input.consultancyId]
      );

      const mealLabel = input.mealType
        ? FOLLOWUP_MEAL_TYPE_LABELS[input.mealType] || "refeição"
        : "refeição";

      const title = "Nova foto de alimentação";
      const body = `${studentName} registrou uma foto (${mealLabel}).`;
      const todayStr = occurredAtDate.toISOString().split("T")[0];

      for (const prof of profRows) {
        const notif = await createNotificationInTransaction(connection, {
          userId: Number(prof.user_id),
          consultancyId: input.consultancyId,
          title,
          body,
          eventType: "NUTRITION_FOLLOWUP_REGISTERED",
          priority: "NORMAL",
          deepLink: consultancySlug ? `/consultoria/${consultancySlug}/pacientes` : null,
          dedupeKey: `followup_meal:${input.studentMembershipId}:${input.mealType || "meal"}:${todayStr}`,
        });
        notifIdsToDeliver.push(notif.id);
      }
    } catch {
      // Non-blocking notification dispatch failure should never abort the clinical insert
    }

    await connection.commit();

    for (const notifId of notifIdsToDeliver) {
      deliverNotificationAfterCommit(notifId).catch(() => {});
    }

    return {
      id: Number(insertedId),
      publicId,
      consultancyId: input.consultancyId,
      studentMembershipId: input.studentMembershipId,
      authorMembershipId: input.authorMembershipId,
      eventType: "FOOD_PHOTO",
      occurredAt: occurredAtDate.toISOString(),
      mealType: input.mealType || null,
      caption: input.caption ? input.caption.trim() : null,
      photoStorageKey: input.photoStorageKey,
      photoSha256: input.photoSha256,
      photoSizeBytes: input.photoSizeBytes,
      photoMimeType: input.photoMimeType,
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
 * Inserts a new PATIENT_NOTE follow-up event into the database.
 */
export async function createPatientNoteFollowupEvent(
  input: CreatePatientNoteEventInput
): Promise<FollowupEventRowDto> {
  validatePatientNoteInput(input);
  const occurredAtDate = validateOccurredAt(input.occurredAt);

  const connection = await getDbConnection();
  try {
    await connection.beginTransaction();

    const publicId = crypto.randomUUID();

    const [insertResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO nutrition_v2_patient_followup_events (
        public_id,
        consultancy_id,
        student_membership_id,
        author_membership_id,
        event_type,
        occurred_at,
        meal_type,
        caption,
        photo_storage_key,
        photo_sha256,
        photo_size_bytes,
        photo_mime_type,
        created_at
      ) VALUES (?, ?, ?, ?, 'PATIENT_NOTE', ?, NULL, ?, NULL, NULL, NULL, NULL, NOW(3));`,
      [
        publicId,
        input.consultancyId,
        input.studentMembershipId,
        input.authorMembershipId,
        occurredAtDate,
        input.caption.trim(),
      ]
    );

    const insertedId = insertResult.insertId;

    // Dispatch non-blocking in-app notification to consultancy nutritionists
    const notifIdsToDeliver: number[] = [];
    try {
      const [authorRows] = await connection.execute<RowDataPacket[]>(
        `SELECT u.full_name, c.slug AS consultancy_slug
         FROM consultancy_members cm
         JOIN users u ON u.id = cm.user_id
         JOIN consultancies c ON c.id = cm.consultancy_id
         WHERE cm.id = ? LIMIT 1;`,
        [input.authorMembershipId]
      );
      const studentName = authorRows.length > 0 ? authorRows[0].full_name : "Paciente";
      const consultancySlug = authorRows.length > 0 ? authorRows[0].consultancy_slug : "";

      const [profRows] = await connection.execute<RowDataPacket[]>(
        `SELECT DISTINCT cm.user_id
         FROM consultancy_members cm
         WHERE cm.consultancy_id = ?
           AND cm.role IN ('NUTRITIONIST', 'CONSULTANCY_ADMIN')
           AND cm.status = 'ACTIVE'
         LIMIT 5;`,
        [input.consultancyId]
      );

      const title = "Nova observação do paciente";
      const body = `${studentName} registrou uma observação de acompanhamento.`;
      const todayStr = occurredAtDate.toISOString().split("T")[0];

      for (const prof of profRows) {
        const notif = await createNotificationInTransaction(connection, {
          userId: Number(prof.user_id),
          consultancyId: input.consultancyId,
          title,
          body,
          eventType: "NUTRITION_FOLLOWUP_REGISTERED",
          priority: "NORMAL",
          deepLink: consultancySlug ? `/consultoria/${consultancySlug}/pacientes` : null,
          dedupeKey: `followup_note:${input.studentMembershipId}:${todayStr}`,
        });
        notifIdsToDeliver.push(notif.id);
      }
    } catch {
      // Non-blocking notification dispatch failure
    }

    await connection.commit();

    for (const notifId of notifIdsToDeliver) {
      deliverNotificationAfterCommit(notifId).catch(() => {});
    }

    return {
      id: Number(insertedId),
      publicId,
      consultancyId: input.consultancyId,
      studentMembershipId: input.studentMembershipId,
      authorMembershipId: input.authorMembershipId,
      eventType: "PATIENT_NOTE",
      occurredAt: occurredAtDate.toISOString(),
      mealType: null,
      caption: input.caption.trim(),
      photoStorageKey: null,
      photoSha256: null,
      photoSizeBytes: null,
      photoMimeType: null,
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
 * Retrieves a single follow-up event by its publicId within the tenancy scope.
 */
export async function getFollowupEventByPublicId(
  consultancyId: number,
  eventPublicId: string
): Promise<FollowupEventRowDto | null> {
  const connection = await getDbConnection();
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT e.*, u.full_name AS author_name, cm.role AS author_role
       FROM nutrition_v2_patient_followup_events e
       JOIN consultancy_members cm ON cm.id = e.author_membership_id
       JOIN users u ON u.id = cm.user_id
       WHERE e.consultancy_id = ?
         AND e.public_id = ?
       LIMIT 1;`,
      [consultancyId, eventPublicId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      id: Number(row.id),
      publicId: String(row.public_id),
      consultancyId: Number(row.consultancy_id),
      studentMembershipId: Number(row.student_membership_id),
      authorMembershipId: Number(row.author_membership_id),
      authorName: row.author_name ? String(row.author_name) : undefined,
      authorRole: row.author_role ? String(row.author_role) : undefined,
      eventType: row.event_type as FollowupEventType,
      occurredAt: formatDateIso(row.occurred_at),
      mealType: row.meal_type ? (row.meal_type as FollowupMealType) : null,
      caption: row.caption ? String(row.caption) : null,
      photoStorageKey: row.photo_storage_key ? String(row.photo_storage_key) : null,
      photoSha256: row.photo_sha256 ? String(row.photo_sha256) : null,
      photoSizeBytes: row.photo_size_bytes !== null ? Number(row.photo_size_bytes) : null,
      photoMimeType: row.photo_mime_type ? String(row.photo_mime_type) : null,
      createdAt: formatDateIso(row.created_at),
    };
  } finally {
    connection.release();
  }
}

/**
 * Queries and composes the unified clinical timeline for a student.
 * Combines:
 * 1) Spontaneous followup events (FOOD_PHOTO, PATIENT_NOTE)
 * 2) Phase 7 check-in responses (CHECKIN_RESPONSE)
 * 3) Phase 7 pending check-in requests (CHECKIN_REQUEST)
 *
 * Ordered strictly by occurredAt DESC.
 * Guarantees zero duplicate cards for completed check-ins.
 */
export async function getPatientFollowupTimeline(
  consultancyId: number,
  studentMembershipId: number
): Promise<PatientFollowupHubSummaryDto> {
  const connection = await getDbConnection();
  try {
    // 1. Resolve student info
    const [studentRows] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.public_id AS student_public_id, u.full_name AS student_name
       FROM consultancy_members cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.id = ? AND cm.consultancy_id = ?
       LIMIT 1;`,
      [studentMembershipId, consultancyId]
    );

    const studentPublicId = studentRows.length > 0 ? String(studentRows[0].student_public_id) : "";
    const studentName = studentRows.length > 0 ? String(studentRows[0].student_name) : "Paciente";

    const timelineItems: FollowupTimelineItemDto[] = [];

    // 2. Query spontaneous follow-up events
    const [eventRows] = await connection.execute<RowDataPacket[]>(
      `SELECT e.*, u.full_name AS author_name, cm.role AS author_role
       FROM nutrition_v2_patient_followup_events e
       JOIN consultancy_members cm ON cm.id = e.author_membership_id
       JOIN users u ON u.id = cm.user_id
       WHERE e.consultancy_id = ?
         AND e.student_membership_id = ?
       ORDER BY e.occurred_at DESC;`,
      [consultancyId, studentMembershipId]
    );

    for (const row of eventRows) {
      const type = row.event_type as FollowupEventType;
      const occurredAt = formatDateIso(row.occurred_at);
      const authorRole = row.author_role === "STUDENT" ? "STUDENT" : "PROFESSIONAL";
      const authorName = row.author_name ? String(row.author_name) : studentName;

      if (type === "FOOD_PHOTO") {
        const mealType = row.meal_type ? (row.meal_type as FollowupMealType) : null;
        timelineItems.push({
          id: String(row.public_id),
          type: "FOOD_PHOTO",
          occurredAt,
          author: {
            name: authorName,
            role: authorRole,
          },
          payload: {
            kind: "FOOD_PHOTO",
            data: {
              mealType,
              mealTypeLabel: mealType ? FOLLOWUP_MEAL_TYPE_LABELS[mealType] || "Refeição" : null,
              caption: row.caption ? String(row.caption) : null,
              photoEventPublicId: String(row.public_id),
            },
          },
        });
      } else if (type === "PATIENT_NOTE") {
        timelineItems.push({
          id: String(row.public_id),
          type: "PATIENT_NOTE",
          occurredAt,
          author: {
            name: authorName,
            role: authorRole,
          },
          payload: {
            kind: "PATIENT_NOTE",
            data: {
              text: row.caption ? String(row.caption) : "",
            },
          },
        });
      }
    }

    // 3. Query completed check-in responses from Phase 7 (represented ONCE)
    const [checkinRespRows] = await connection.execute<RowDataPacket[]>(
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

    for (const row of checkinRespRows) {
      const adherence = row.adherence as CheckinAdherenceLevel;
      const adherenceLabel = CHECKIN_ADHERENCE_LABELS[adherence] || adherence;
      const occurredAt = formatDateIso(row.submitted_at);

      timelineItems.push({
        id: String(row.public_id),
        type: "CHECKIN_RESPONSE",
        occurredAt,
        author: {
          name: row.student_name ? String(row.student_name) : studentName,
          role: "STUDENT",
        },
        payload: {
          kind: "CHECKIN_RESPONSE",
          data: {
            responsePublicId: String(row.public_id),
            requestPublicId: String(row.request_public_id),
            adherence,
            adherenceLabel,
            ratings: {
              hunger: row.hunger_rating !== null ? Number(row.hunger_rating) : null,
              energy: row.energy_rating !== null ? Number(row.energy_rating) : null,
              sleep: row.sleep_rating !== null ? Number(row.sleep_rating) : null,
              training: row.training_rating !== null ? Number(row.training_rating) : null,
            },
            hydrationLiters: row.hydration_liters !== null ? Number(row.hydration_liters) : null,
            selfReportedWeightKg: row.self_reported_weight_kg !== null ? Number(row.self_reported_weight_kg) : null,
            difficultyText: row.difficulty_text ? String(row.difficulty_text) : null,
            studentNotes: row.student_notes ? String(row.student_notes) : null,
            requestsHelp: row.requests_help !== null ? Boolean(row.requests_help) : null,
          },
        },
      });
    }

    // 4. Query active pending (or canceled) check-in requests
    // Rule: Completed requests are already represented by their responses above.
    const [pendingReqRows] = await connection.execute<RowDataPacket[]>(
      `SELECT r.*, u.full_name AS requester_name
       FROM nutrition_v2_checkin_requests r
       JOIN consultancy_members cm ON cm.id = r.requested_by_membership_id
       JOIN users u ON u.id = cm.user_id
       WHERE r.consultancy_id = ?
         AND r.student_membership_id = ?
         AND r.status = 'PENDING'
       ORDER BY r.requested_at DESC;`,
      [consultancyId, studentMembershipId]
    );

    let pendingCheckinRequestPayload: CheckinRequestTimelinePayload | null = null;

    const now = new Date();
    for (const row of pendingReqRows) {
      const status = row.status as PersistedCheckinRequestStatus;
      const dueAt = row.due_at ? formatDateIso(row.due_at) : null;
      const derivedState = deriveCheckinRequestState(status, dueAt, now);
      const occurredAt = formatDateIso(row.requested_at);
      const requestedByName = row.requester_name ? String(row.requester_name) : "Nutricionista";

      const reqPayload: CheckinRequestTimelinePayload = {
        requestPublicId: String(row.public_id),
        status,
        derivedState,
        dueAt,
        requestedByName,
      };

      if (!pendingCheckinRequestPayload && derivedState === "PENDING") {
        pendingCheckinRequestPayload = reqPayload;
      }

      timelineItems.push({
        id: String(row.public_id),
        type: "CHECKIN_REQUEST",
        occurredAt,
        author: {
          name: requestedByName,
          role: "PROFESSIONAL",
        },
        payload: {
          kind: "CHECKIN_REQUEST",
          data: reqPayload,
        },
      });
    }

    // 5. Sort timeline descending by occurredAt (newest first)
    timelineItems.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

    return {
      studentPublicId,
      studentName,
      timeline: timelineItems,
      totalEventsCount: timelineItems.length,
      pendingCheckinRequest: pendingCheckinRequestPayload,
    };
  } finally {
    connection.release();
  }
}
