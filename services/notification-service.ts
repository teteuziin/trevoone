import type { Pool, PoolConnection } from "mysql2/promise";
import crypto from "crypto";
import {
  createNotification,
  getNotificationById,
  getNotificationByPublicId,
  listUserNotifications,
  countUnreadNotifications,
  markAsRead,
  markAllAsRead,
  upsertPushSubscription,
  revokePushSubscription,
  revokeSubscriptionById,
  getActiveSubscriptionsForUser,
  recordDeliveryAttempt,
  hasDeliveryAttempt,
  getUserEmailAndName,
} from "@/repositories/notification-repository";
import { isValidWebPushEndpoint, computeEndpointFingerprint } from "@/lib/notifications/endpoint-validator";
import { sendWebPushNotification } from "@/lib/notifications/web-push-sender";
import { sendNotificationFallbackEmail } from "@/lib/notifications/email-sender";
import type {
  CreateNotificationInput,
  RegisterPushSubscriptionInput,
  UserNotificationDTO,
  UserNotificationRecord,
} from "@/types/notifications";

function sanitizeDeepLink(deepLink: string | null | undefined): string | null {
  if (!deepLink || typeof deepLink !== "string") return null;

  const trimmed = deepLink.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return null;
  }

  // Reject javascript, data, or file schemes
  const lower = trimmed.toLowerCase();
  if (
    lower.includes("javascript:") ||
    lower.includes("data:") ||
    lower.includes("vbscript:")
  ) {
    return null;
  }

  return trimmed.slice(0, 2048);
}

export async function createNotificationInTransaction(
  client: Pool | PoolConnection,
  input: CreateNotificationInput
): Promise<UserNotificationRecord> {
  const title = input.title?.trim();
  const body = input.body?.trim();
  const eventType = input.eventType?.trim();

  if (!title || title.length > 160) {
    throw new Error("NOTIFICATION_TITLE_INVALID");
  }
  if (!body || body.length > 1000) {
    throw new Error("NOTIFICATION_BODY_INVALID");
  }
  if (!eventType || eventType.length > 80) {
    throw new Error("NOTIFICATION_EVENT_TYPE_INVALID");
  }

  const priority = input.priority || "NORMAL";
  if (!["NORMAL", "HIGH", "CRITICAL"].includes(priority)) {
    throw new Error("NOTIFICATION_PRIORITY_INVALID");
  }

  const sanitizedLink = sanitizeDeepLink(input.deepLink);

  return createNotification(client, {
    ...input,
    title,
    body,
    eventType,
    priority,
    deepLink: sanitizedLink,
    dedupeKey: input.dedupeKey?.slice(0, 191) || null,
    sourceType: input.sourceType?.slice(0, 80) || null,
    sourcePublicId: input.sourcePublicId?.slice(0, 64) || null,
  });
}

/**
 * Dispatches external delivery (Web Push and/or CRITICAL email fallback) after
 * the business transaction has successfully committed.
 */
export async function deliverNotificationAfterCommit(
  notificationId: number
): Promise<void> {
  const notification = await getNotificationById(notificationId);
  if (!notification) {
    return;
  }

  // NORMAL notifications are in-app only
  if (notification.priority === "NORMAL") {
    return;
  }

  let anyPushAccepted = false;

  // Retrieve active Web Push subscriptions
  const activeSubscriptions = await getActiveSubscriptionsForUser(notification.user_id);

  for (const sub of activeSubscriptions) {
    const alreadyAttempted = await hasDeliveryAttempt(
      notification.id,
      "PUSH",
      sub.endpoint_fingerprint
    );

    if (alreadyAttempted) {
      continue;
    }

    const result = await sendWebPushNotification(
      {
        endpoint: sub.endpoint,
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
      {
        notificationPublicId: notification.public_id,
        title: "Trevo One",
        body: notification.title,
      }
    );

    await recordDeliveryAttempt({
      notificationId: notification.id,
      channel: "PUSH",
      subscriptionId: sub.id,
      targetFingerprint: sub.endpoint_fingerprint,
      status: result.status,
      statusCode: result.statusCode,
      errorMessage: result.error || null,
    });

    if (result.status === "ACCEPTED") {
      anyPushAccepted = true;
    } else if (result.status === "GONE") {
      await revokeSubscriptionById(sub.id, "SUBSCRIPTION_GONE");
    }
  }

  // CRITICAL Priority: if no Push was accepted, trigger fallback email
  if (notification.priority === "CRITICAL" && !anyPushAccepted) {
    const userMeta = await getUserEmailAndName(notification.user_id);
    if (userMeta && userMeta.email) {
      const emailFingerprint = crypto
        .createHash("sha256")
        .update(userMeta.email.toLowerCase().trim())
        .digest("hex");

      const alreadyAttemptedEmail = await hasDeliveryAttempt(
        notification.id,
        "EMAIL",
        emailFingerprint
      );

      if (!alreadyAttemptedEmail) {
        const emailResult = await sendNotificationFallbackEmail({
          toEmail: userMeta.email,
          recipientName: userMeta.fullName,
          notificationTitle: notification.title,
        });

        await recordDeliveryAttempt({
          notificationId: notification.id,
          channel: "EMAIL",
          subscriptionId: null,
          targetFingerprint: emailFingerprint,
          status: emailResult.status,
          statusCode: null,
          errorMessage: emailResult.error || null,
        });
      }
    }
  }
}

export async function getUserNotificationCenter(
  userId: number,
  page = 1,
  limit = 20,
  unreadOnly = false
): Promise<{
  notifications: UserNotificationDTO[];
  total: number;
  unreadCount: number;
  currentPage: number;
  totalPages: number;
}> {
  const safePage = Math.max(page, 1);
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const offset = (safePage - 1) * safeLimit;

  const [{ notifications, total }, unreadCount] = await Promise.all([
    listUserNotifications(userId, { limit: safeLimit, offset, unreadOnly }),
    countUnreadNotifications(userId),
  ]);

  const dtos: UserNotificationDTO[] = notifications.map((n) => ({
    publicId: n.public_id,
    priority: n.priority,
    eventType: n.event_type,
    title: n.title,
    body: n.body,
    deepLink: n.deep_link,
    sourceType: n.source_type,
    sourcePublicId: n.source_public_id,
    readAt: n.read_at ? n.read_at.toISOString() : null,
    createdAt: n.created_at ? n.created_at.toISOString() : new Date().toISOString(),
    consultancyName: n.consultancy_name || null,
  }));

  const totalPages = Math.max(Math.ceil(total / safeLimit), 1);

  return {
    notifications: dtos,
    total,
    unreadCount,
    currentPage: safePage,
    totalPages,
  };
}

export async function getUnreadCount(userId: number): Promise<number> {
  return countUnreadNotifications(userId);
}

export async function markNotificationRead(
  userId: number,
  publicId: string
): Promise<{ success: boolean }> {
  const success = await markAsRead(userId, publicId);
  return { success };
}

export async function markAllNotificationsRead(
  userId: number
): Promise<{ count: number }> {
  const count = await markAllAsRead(userId);
  return { count };
}

export async function registerPushSubscription(
  userId: number,
  input: RegisterPushSubscriptionInput
): Promise<{ success: boolean; publicId?: string; error?: string }> {
  if (!isValidWebPushEndpoint(input.endpoint)) {
    return { success: false, error: "INVALID_ENDPOINT" };
  }

  if (!input.p256dh || !input.auth) {
    return { success: false, error: "INVALID_KEYS" };
  }

  const sub = await upsertPushSubscription(userId, {
    endpoint: input.endpoint.trim(),
    p256dh: input.p256dh.trim(),
    auth: input.auth.trim(),
    expirationTime: input.expirationTime || null,
    userAgent: input.userAgent?.slice(0, 512) || null,
  });

  return { success: true, publicId: sub.public_id };
}

export async function revokePushSubscriptionByEndpoint(
  userId: number,
  endpoint: string,
  reason = "USER_DISABLED"
): Promise<{ success: boolean }> {
  if (!endpoint) return { success: false };
  const fingerprint = computeEndpointFingerprint(endpoint);
  const success = await revokePushSubscription(userId, fingerprint, reason);
  return { success };
}

export async function resolveNotificationDeepLink(
  userId: number,
  notificationPublicId: string
): Promise<string> {
  const notification = await getNotificationByPublicId(userId, notificationPublicId);
  if (!notification || !notification.deep_link) {
    return "/notificacoes";
  }

  const sanitized = sanitizeDeepLink(notification.deep_link);
  return sanitized || "/notificacoes";
}
