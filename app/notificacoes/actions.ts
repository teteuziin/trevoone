"use server";

import { getCurrentSession } from "@/lib/auth/session";
import {
  markNotificationRead,
  markAllNotificationsRead,
  registerPushSubscription,
  revokePushSubscriptionByEndpoint,
} from "@/services/notification-service";
import { getVapidPublicKey } from "@/lib/notifications/web-push-sender";
import type { RegisterPushSubscriptionInput } from "@/types/notifications";

export async function markNotificationReadAction(
  publicId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  if (!publicId || typeof publicId !== "string") {
    return { success: false, error: "INVALID_PUBLIC_ID" };
  }

  return markNotificationRead(session.userId, publicId);
}

export async function markAllNotificationsReadAction(): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  const { count } = await markAllNotificationsRead(session.userId);
  return { success: true, count };
}

export async function registerPushSubscriptionAction(
  input: RegisterPushSubscriptionInput
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  return registerPushSubscription(session.userId, input);
}

export async function revokePushSubscriptionAction(
  endpoint: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  if (!endpoint || typeof endpoint !== "string") {
    return { success: false, error: "INVALID_ENDPOINT" };
  }

  const safeReason = reason === "LOGOUT" ? "LOGOUT" : "USER_DISABLED";
  return revokePushSubscriptionByEndpoint(session.userId, endpoint, safeReason);
}

export async function getVapidPublicKeyAction(): Promise<{
  publicKey: string | null;
}> {
  const publicKey = getVapidPublicKey();
  return { publicKey };
}
