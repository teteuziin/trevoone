"use server";

import { getCurrentSession } from "@/lib/auth/session";
import {
  markAnnouncementRead,
  publishConsultancyAnnouncement,
  type PublishAnnouncementInput,
  type PublishAnnouncementResult,
} from "@/lib/consultancies/announcements";

export async function markAnnouncementReadAction(
  publicId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "UNAUTHORIZED" };
  }

  if (!publicId || typeof publicId !== "string" || publicId.trim().length === 0) {
    return { success: false, error: "INVALID_PUBLIC_ID" };
  }

  const success = await markAnnouncementRead(session.userId, publicId.trim());
  return { success };
}

export async function publishAnnouncementAction(
  input: PublishAnnouncementInput
): Promise<PublishAnnouncementResult> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, recipientsCount: 0, error: "UNAUTHORIZED" };
  }

  return publishConsultancyAnnouncement(session.userId, input);
}
