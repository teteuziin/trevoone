"use server";

import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { trackMemberActivity } from "@/lib/monitoring/activity-tracker";

/**
 * Lightweight global activity heartbeat.
 * Called opportunistically when a user navigates within a consultancy.
 * Throttled to ~10-15 minutes both client-side and server-side.
 */
export async function recordActivityHeartbeatAction(slug: string): Promise<void> {
  if (!slug || typeof slug !== "string") return;

  try {
    const session = await getCurrentSession();
    if (!session) return;

    const context = await resolveConsultancyContext(session.userId, slug);
    if (!context || !context.consultancyId || !context.membershipId) return;

    await trackMemberActivity(context.consultancyId, context.membershipId);
  } catch {
    // Non-blocking background heartbeat
  }
}
