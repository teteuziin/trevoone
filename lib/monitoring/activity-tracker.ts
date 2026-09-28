import type { RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "@/lib/db/mysql";

// In-memory throttling cache: memberId -> timestamp of last DB write
// Prevents spamming the database on rapid requests within 10 minutes
const activityWriteThrottle = new Map<string, number>();
const THROTTLE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export async function recordMemberActivity(
  consultancyId: number,
  memberId: number
): Promise<void> {
  if (!consultancyId || !memberId) return;

  const key = `${consultancyId}:${memberId}`;
  const now = Date.now();
  const lastWrite = activityWriteThrottle.get(key);

  if (lastWrite && now - lastWrite < THROTTLE_WINDOW_MS) {
    return; // Throttled, low-write design
  }

  activityWriteThrottle.set(key, now);

  try {
    const connection = await getDbConnection();
    try {
      await connection.execute(
        `INSERT INTO member_activity_tracking (consultancy_id, member_id, last_active_at)
         VALUES (?, ?, UTC_TIMESTAMP(3))
         ON DUPLICATE KEY UPDATE
           last_active_at = UTC_TIMESTAMP(3),
           updated_at = UTC_TIMESTAMP(3);`,
        [consultancyId, memberId]
      );
    } finally {
      connection.release();
    }
  } catch (err) {
    // Non-fatal background activity recording error: do not crash user requests
    console.error("[ActivityTracker] Failed to record member activity:", err);
  }
}

export async function getMemberLastActive(
  consultancyId: number,
  memberId: number
): Promise<Date | null> {
  const connection = await getDbConnection();
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT last_active_at
       FROM member_activity_tracking
       WHERE consultancy_id = ? AND member_id = ?
       LIMIT 1;`,
      [consultancyId, memberId]
    );

    if (Array.isArray(rows) && rows.length > 0 && rows[0].last_active_at) {
      return new Date(rows[0].last_active_at);
    }
    return null;
  } finally {
    connection.release();
  }
}

export const trackMemberActivity = recordMemberActivity;
export const getMemberLastActivity = getMemberLastActive;
