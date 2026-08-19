import webpush from "web-push";
import { isValidWebPushEndpoint } from "./endpoint-validator";
import type { NotificationDeliveryStatus } from "@/types/notifications";

export interface WebPushPayload {
  notificationPublicId: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
}

export interface WebPushSendResult {
  success: boolean;
  status: NotificationDeliveryStatus;
  statusCode: number | null;
  error?: string;
}

export function getVapidConfig(): {
  publicKey: string;
  privateKey: string;
  subject: string;
} | null {
  const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.WEB_PUSH_VAPID_SUBJECT?.trim();

  if (!publicKey || !privateKey || !subject) {
    return null;
  }

  return { publicKey, privateKey, subject };
}

export function isWebPushConfigured(): boolean {
  return getVapidConfig() !== null;
}

export function getVapidPublicKey(): string | null {
  return process.env.WEB_PUSH_VAPID_PUBLIC_KEY?.trim() || null;
}

/**
 * Sends a standards-compliant Web Push notification via server-side VAPID.
 */
export async function sendWebPushNotification(
  subscription: {
    endpoint: string;
    p256dh: string;
    auth: string;
  },
  payload: WebPushPayload
): Promise<WebPushSendResult> {
  if (!isValidWebPushEndpoint(subscription.endpoint)) {
    return {
      success: false,
      status: "FAILED",
      statusCode: null,
      error: "INVALID_PUSH_ENDPOINT",
    };
  }

  const vapidConfig = getVapidConfig();
  if (!vapidConfig) {
    return {
      success: false,
      status: "FAILED",
      statusCode: null,
      error: "VAPID_NOT_CONFIGURED",
    };
  }

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  const payloadString = JSON.stringify({
    notificationPublicId: payload.notificationPublicId,
    title: payload.title || "Trevo One",
    body: payload.body,
    icon: payload.icon || "/icons/icon-192x192.png",
    badge: payload.badge || "/icons/icon-192x192.png",
    timestamp: Date.now(),
  });

  try {
    const response = await webpush.sendNotification(
      pushSubscription,
      payloadString,
      {
        vapidDetails: {
          subject: vapidConfig.subject,
          publicKey: vapidConfig.publicKey,
          privateKey: vapidConfig.privateKey,
        },
        TTL: 86400, // 24 hours
        urgency: "high",
      }
    );

    return {
      success: true,
      status: "ACCEPTED",
      statusCode: response.statusCode || 201,
    };
  } catch (err: unknown) {
    const errorObj = err as { statusCode?: number; message?: string };
    const statusCode = typeof errorObj?.statusCode === "number" ? errorObj.statusCode : null;

    // 404 or 410 indicates the subscription is permanently gone/unregistered
    if (statusCode === 404 || statusCode === 410) {
      return {
        success: false,
        status: "GONE",
        statusCode,
        error: "SUBSCRIPTION_GONE",
      };
    }

    return {
      success: false,
      status: "FAILED",
      statusCode,
      error: "PUSH_DELIVERY_FAILED",
    };
  }
}
