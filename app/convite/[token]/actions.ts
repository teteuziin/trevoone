"use server";

import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { acceptConsultancyInvitation } from "@/lib/consultancies/invitations";
import { validateInvitationReturnTo } from "@/lib/auth/invitation-return-to";

export type AcceptInvitationState = {
  success: boolean;
  error?: string;
};

export async function acceptInvitationAction(
  token: string
): Promise<AcceptInvitationState> {
  const session = await getCurrentSession();
  if (!session) {
    const safeReturnTo = validateInvitationReturnTo(`/convite/${token}`);
    if (safeReturnTo) {
      redirect(`/login?returnTo=${encodeURIComponent(safeReturnTo)}`);
    }
    redirect("/login");
  }

  const result = await acceptConsultancyInvitation({
    token,
    userId: session.userId,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    };
  }

  redirect(`/consultoria/${result.consultancySlug}`);
}

export async function logoutAndReturnToInvitationAction(
  token: string
): Promise<never> {
  const { revokeCurrentSession } = await import("@/lib/auth/session");
  await revokeCurrentSession();

  const safeReturnTo = validateInvitationReturnTo(`/convite/${token}`);
  if (safeReturnTo) {
    redirect(safeReturnTo);
  }

  redirect("/login");
}
