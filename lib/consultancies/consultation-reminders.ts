import crypto from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";
import { formatConsultancyDateTime } from "./timezone";
import { deliverNotificationAfterCommit } from "@/services/notification-service";
import type { NotificationPriority } from "@/types/notifications";

export interface ProcessRemindersResult {
  success: boolean;
  processed: number;
  created: number;
  skipped: number;
}

interface RawUpcomingConsultationRow extends RowDataPacket {
  id: number;
  public_id: string;
  consultancy_id: number;
  title: string;
  scheduled_start_at: Date | string;
  scheduled_end_at: Date | string;
  status: string;
  consultancy_slug: string;
  consultancy_name: string;
  consultancy_timezone: string;
  student_user_id: number;
  student_name: string;
  professional_user_id: number;
  professional_name: string;
  professional_type: string;
}

function generateNotificationPublicId(): string {
  return crypto.randomBytes(16).toString("hex");
}

function extractFormattedTimeOnly(formattedDateTime: string): string {
  // Format is DD/MM/AAAA HH:mm -> extract HH:mm
  const parts = formattedDateTime.trim().split(" ");
  if (parts.length >= 2) {
    return parts[parts.length - 1];
  }
  return formattedDateTime;
}

/**
 * Global Consultation Reminders Processor.
 * Evaluates all upcoming SCHEDULED consultations across all consultancies
 * within bounded temporal windows (20m, 10m, 5m).
 *
 * Rules:
 * - Deterministic, set-based query (no full-table scans).
 * - Exact participants only: Student and designated Professional.
 * - Prevents reminder flooding: if processor executes late (e.g. T-3m), only the closest valid window (5m) fires.
 * - Deduplication: Uses UNIQUE KEY (user_id, dedupe_key) in database to guarantee single delivery.
 */
export async function processConsultationReminders(
  now: Date = new Date()
): Promise<ProcessRemindersResult> {
  const connection = await getDbConnection();
  let processed = 0;
  let created = 0;
  let skipped = 0;

  try {
    // Bounded temporal lookahead: from now (0m) to now + 20m
    const minTarget = new Date(now.getTime() - 1000); // 1s tolerance
    const maxTarget = new Date(now.getTime() + 20 * 60 * 1000 + 1000);

    const [rows] = await connection.query<RawUpcomingConsultationRow[]>(
      `SELECT c.id,
              c.public_id,
              c.consultancy_id,
              c.title,
              c.scheduled_start_at,
              c.scheduled_end_at,
              c.status,
              con.slug AS consultancy_slug,
              con.name AS consultancy_name,
              COALESCE(con.timezone, 'America/Sao_Paulo') AS consultancy_timezone,
              su.id AS student_user_id,
              su.full_name AS student_name,
              pu.id AS professional_user_id,
              pu.full_name AS professional_name,
              c.professional_type
       FROM consultations c
       JOIN consultancies con ON con.id = c.consultancy_id
       JOIN consultancy_members sm ON sm.id = c.student_membership_id
       JOIN users su ON su.id = sm.user_id
       JOIN consultancy_members pm ON pm.id = c.professional_membership_id
       JOIN users pu ON pu.id = pm.user_id
       WHERE c.status = 'SCHEDULED'
         AND sm.status = 'ACTIVE'
         AND pm.status = 'ACTIVE'
         AND su.deleted_at IS NULL
         AND pu.deleted_at IS NULL
         AND c.scheduled_start_at >= ?
         AND c.scheduled_start_at <= ?
       ORDER BY c.scheduled_start_at ASC`,
      [minTarget, maxTarget]
    );

    const consultations = rows || [];
    processed = consultations.length;

    const createdNotificationIds: number[] = [];

    for (const row of consultations) {
      const scheduledStart = new Date(row.scheduled_start_at);
      const diffMs = scheduledStart.getTime() - now.getTime();

      let reminderOffset: 20 | 10 | 5 | null = null;
      let priority: NotificationPriority = "NORMAL";
      let title = "";

      // Deterministic window classification
      if (diffMs > 15 * 60 * 1000 && diffMs <= 20 * 60 * 1000) {
        reminderOffset = 20;
        priority = "NORMAL";
        title = "Consulta em 20 minutos";
      } else if (diffMs > 5 * 60 * 1000 && diffMs <= 10 * 60 * 1000) {
        reminderOffset = 10;
        priority = "HIGH";
        title = "Consulta em 10 minutos";
      } else if (diffMs >= 0 && diffMs <= 5 * 60 * 1000) {
        reminderOffset = 5;
        priority = "HIGH";
        title = "Consulta em 5 minutos";
      } else {
        // Outside active reminder windows (e.g. between 10m and 15m) -> skip for next cycle
        skipped++;
        continue;
      }

      const fullFormatted = formatConsultancyDateTime(
        row.consultancy_timezone,
        scheduledStart
      );
      const timeOnly = extractFormattedTimeOnly(fullFormatted);
      const startMs = scheduledStart.getTime();
      const deepLink = `/consultoria/${encodeURIComponent(row.consultancy_slug)}/consultas/${encodeURIComponent(row.public_id)}/preflight`;

      const eventType = `CONSULTATION_REMINDER_${reminderOffset}M`;

      const studentBody = `Sua consulta com ${row.professional_name} começa às ${timeOnly}.`;
      const profBody = `Sua consulta com ${row.student_name} começa às ${timeOnly}.`;

      const studentDedupeKey = `consultation:${row.public_id}:reminder:${reminderOffset}:${startMs}:${row.student_user_id}`;
      const profDedupeKey = `consultation:${row.public_id}:reminder:${reminderOffset}:${startMs}:${row.professional_user_id}`;

      // Insert Student Notification
      const studentNotifPublicId = generateNotificationPublicId();
      const [sRes] = await connection.query<ResultSetHeader>(
        `INSERT IGNORE INTO user_notifications (
           public_id, user_id, consultancy_id, priority, event_type,
           title, body, deep_link, dedupe_key, source_type, source_public_id, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONSULTATION', ?, NOW())`,
        [
          studentNotifPublicId,
          row.student_user_id,
          row.consultancy_id,
          priority,
          eventType,
          title,
          studentBody,
          deepLink,
          studentDedupeKey,
          row.public_id,
        ]
      );

      if (sRes.affectedRows > 0) {
        created++;
        createdNotificationIds.push(sRes.insertId);
      } else {
        skipped++;
      }

      // Insert Professional Notification
      const profNotifPublicId = generateNotificationPublicId();
      const [pRes] = await connection.query<ResultSetHeader>(
        `INSERT IGNORE INTO user_notifications (
           public_id, user_id, consultancy_id, priority, event_type,
           title, body, deep_link, dedupe_key, source_type, source_public_id, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONSULTATION', ?, NOW())`,
        [
          profNotifPublicId,
          row.professional_user_id,
          row.consultancy_id,
          priority,
          eventType,
          title,
          profBody,
          deepLink,
          profDedupeKey,
          row.public_id,
        ]
      );

      if (pRes.affectedRows > 0) {
        created++;
        createdNotificationIds.push(pRes.insertId);
      } else {
        skipped++;
      }
    }

    // Deliver Web Push notifications for newly inserted records
    for (const notifId of createdNotificationIds) {
      try {
        await deliverNotificationAfterCommit(notifId);
      } catch {
        // Push failures must never crash processor
      }
    }

    return {
      success: true,
      processed,
      created,
      skipped,
    };
  } finally {
    connection.release();
  }
}
