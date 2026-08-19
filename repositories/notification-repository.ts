import crypto from "crypto";
import type { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { getDbPool } from "@/lib/db/mysql";
import { computeEndpointFingerprint } from "@/lib/notifications/endpoint-validator";
import type {
  UserNotificationRecord,
  WebPushSubscriptionRecord,
  NotificationDeliveryAttemptRecord,
  CreateNotificationInput,
  RegisterPushSubscriptionInput,
  NotificationDeliveryChannel,
  NotificationDeliveryStatus,
} from "@/types/notifications";

type DbClient = Pool | PoolConnection;

function generatePublicId(): string {
  return crypto.randomBytes(16).toString("hex");
}

export async function createNotification(
  client: DbClient,
  input: CreateNotificationInput
): Promise<UserNotificationRecord> {
  const publicId = generatePublicId();
  const priority = input.priority || "NORMAL";

  const [result] = await client.execute<ResultSetHeader>(
    `INSERT INTO user_notifications (
      public_id,
      user_id,
      consultancy_id,
      priority,
      event_type,
      title,
      body,
      deep_link,
      dedupe_key,
      source_type,
      source_public_id,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      publicId,
      input.userId,
      input.consultancyId || null,
      priority,
      input.eventType,
      input.title,
      input.body,
      input.deepLink || null,
      input.dedupeKey || null,
      input.sourceType || null,
      input.sourcePublicId || null,
    ]
  );

  return {
    id: result.insertId,
    public_id: publicId,
    user_id: input.userId,
    consultancy_id: input.consultancyId || null,
    priority,
    event_type: input.eventType,
    title: input.title,
    body: input.body,
    deep_link: input.deepLink || null,
    dedupe_key: input.dedupeKey || null,
    source_type: input.sourceType || null,
    source_public_id: input.sourcePublicId || null,
    read_at: null,
    created_at: new Date(),
  };
}

export async function getNotificationById(
  id: number
): Promise<UserNotificationRecord | null> {
  const pool = getDbPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM user_notifications WHERE id = ? LIMIT 1`,
    [id]
  );

  if (rows.length === 0) return null;
  return rows[0] as UserNotificationRecord;
}

export async function getNotificationByPublicId(
  userId: number,
  publicId: string
): Promise<UserNotificationRecord | null> {
  const pool = getDbPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM user_notifications WHERE user_id = ? AND public_id = ? LIMIT 1`,
    [userId, publicId]
  );

  if (rows.length === 0) return null;
  return rows[0] as UserNotificationRecord;
}

export interface ListNotificationsOptions {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
}

export async function listUserNotifications(
  userId: number,
  options: ListNotificationsOptions = {}
): Promise<{ notifications: (UserNotificationRecord & { consultancy_name?: string | null })[]; total: number }> {
  const pool = getDbPool();
  const limit = Math.min(Math.max(options.limit || 20, 1), 100);
  const offset = Math.max(options.offset || 0, 0);
  const unreadOnly = !!options.unreadOnly;

  const whereClause = unreadOnly
    ? "WHERE un.user_id = ? AND un.read_at IS NULL"
    : "WHERE un.user_id = ?";

  const [countRows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) as total FROM user_notifications un ${whereClause}`,
    [userId]
  );
  const total = Number(countRows[0]?.total || 0);

  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT un.*, c.name as consultancy_name
     FROM user_notifications un
     LEFT JOIN consultancies c ON un.consultancy_id = c.id
     ${whereClause}
     ORDER BY un.created_at DESC
     LIMIT ? OFFSET ?`,
    [userId, String(limit), String(offset)]
  );

  return {
    notifications: rows as (UserNotificationRecord & { consultancy_name?: string | null })[],
    total,
  };
}

export async function countUnreadNotifications(userId: number): Promise<number> {
  const pool = getDbPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) as unread_count FROM user_notifications WHERE user_id = ? AND read_at IS NULL`,
    [userId]
  );

  return Number(rows[0]?.unread_count || 0);
}

export async function markAsRead(
  userId: number,
  publicId: string
): Promise<boolean> {
  const pool = getDbPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE user_notifications
     SET read_at = NOW()
     WHERE user_id = ? AND public_id = ? AND read_at IS NULL`,
    [userId, publicId]
  );

  return result.affectedRows > 0;
}

export async function markAllAsRead(userId: number): Promise<number> {
  const pool = getDbPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE user_notifications
     SET read_at = NOW()
     WHERE user_id = ? AND read_at IS NULL`,
    [userId]
  );

  return result.affectedRows;
}

export async function findSubscriptionByFingerprint(
  fingerprint: string
): Promise<WebPushSubscriptionRecord | null> {
  const pool = getDbPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM web_push_subscriptions WHERE endpoint_fingerprint = ? LIMIT 1`,
    [fingerprint]
  );

  if (rows.length === 0) return null;
  return rows[0] as WebPushSubscriptionRecord;
}

export async function upsertPushSubscription(
  userId: number,
  input: RegisterPushSubscriptionInput
): Promise<WebPushSubscriptionRecord> {
  const pool = getDbPool();
  const fingerprint = computeEndpointFingerprint(input.endpoint);
  const publicId = generatePublicId();

  await pool.execute<ResultSetHeader>(
    `INSERT INTO web_push_subscriptions (
      public_id,
      user_id,
      endpoint,
      endpoint_fingerprint,
      p256dh,
      auth,
      expiration_time,
      user_agent,
      revoked_at,
      revocation_reason,
      last_seen_at,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NOW(), NOW())
    ON DUPLICATE KEY UPDATE
      user_id = VALUES(user_id),
      p256dh = VALUES(p256dh),
      auth = VALUES(auth),
      expiration_time = VALUES(expiration_time),
      user_agent = VALUES(user_agent),
      revoked_at = NULL,
      revocation_reason = NULL,
      last_seen_at = NOW()`,
    [
      publicId,
      userId,
      input.endpoint,
      fingerprint,
      input.p256dh,
      input.auth,
      input.expirationTime || null,
      input.userAgent || null,
    ]
  );

  const sub = await findSubscriptionByFingerprint(fingerprint);
  if (!sub) {
    throw new Error("Failed to load upserted push subscription");
  }
  return sub;
}

export async function revokePushSubscription(
  userId: number,
  endpointFingerprint: string,
  reason = "USER_DISABLED"
): Promise<boolean> {
  const pool = getDbPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE web_push_subscriptions
     SET revoked_at = NOW(), revocation_reason = ?
     WHERE user_id = ? AND endpoint_fingerprint = ? AND revoked_at IS NULL`,
    [reason, userId, endpointFingerprint]
  );

  return result.affectedRows > 0;
}

export async function revokeSubscriptionById(
  subscriptionId: number,
  reason: string
): Promise<void> {
  const pool = getDbPool();
  await pool.execute(
    `UPDATE web_push_subscriptions
     SET revoked_at = NOW(), revocation_reason = ?
     WHERE id = ? AND revoked_at IS NULL`,
    [reason, subscriptionId]
  );
}

export async function getActiveSubscriptionsForUser(
  userId: number
): Promise<WebPushSubscriptionRecord[]> {
  const pool = getDbPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT * FROM web_push_subscriptions
     WHERE user_id = ? AND revoked_at IS NULL
     ORDER BY last_seen_at DESC`,
    [userId]
  );

  return rows as WebPushSubscriptionRecord[];
}

export async function recordDeliveryAttempt(data: {
  notificationId: number;
  channel: NotificationDeliveryChannel;
  subscriptionId?: number | null;
  targetFingerprint: string;
  status: NotificationDeliveryStatus;
  statusCode?: number | null;
  errorMessage?: string | null;
}): Promise<NotificationDeliveryAttemptRecord> {
  const pool = getDbPool();
  const publicId = generatePublicId();

  await pool.execute(
    `INSERT INTO notification_delivery_attempts (
      public_id,
      notification_id,
      channel,
      subscription_id,
      target_fingerprint,
      status,
      status_code,
      error_message,
      attempted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE
      status = VALUES(status),
      status_code = VALUES(status_code),
      error_message = VALUES(error_message),
      attempted_at = NOW()`,
    [
      publicId,
      data.notificationId,
      data.channel,
      data.subscriptionId || null,
      data.targetFingerprint,
      data.status,
      data.statusCode || null,
      data.errorMessage || null,
    ]
  );

  return {
    id: 0,
    public_id: publicId,
    notification_id: data.notificationId,
    channel: data.channel,
    subscription_id: data.subscriptionId || null,
    target_fingerprint: data.targetFingerprint,
    status: data.status,
    status_code: data.statusCode || null,
    error_message: data.errorMessage || null,
    attempted_at: new Date(),
  };
}

export async function hasDeliveryAttempt(
  notificationId: number,
  channel: NotificationDeliveryChannel,
  targetFingerprint: string
): Promise<boolean> {
  const pool = getDbPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id FROM notification_delivery_attempts
     WHERE notification_id = ? AND channel = ? AND target_fingerprint = ?
     LIMIT 1`,
    [notificationId, channel, targetFingerprint]
  );

  return rows.length > 0;
}

export async function getUserEmailAndName(
  userId: number
): Promise<{ email: string; fullName: string } | null> {
  const pool = getDbPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT email, full_name FROM users WHERE id = ? LIMIT 1`,
    [userId]
  );

  if (rows.length === 0) return null;
  return {
    email: rows[0].email,
    fullName: rows[0].full_name,
  };
}
