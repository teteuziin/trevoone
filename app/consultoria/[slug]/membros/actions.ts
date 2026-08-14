"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import {
  createConsultancyInvitation,
  revokeConsultancyInvitation,
} from "@/lib/consultancies/invitations";

export type InvitationFormState = {
  success: boolean;
  message?: string;
  error?: string;
  invitationPath?: string;
};

export type RevokeInvitationState = {
  success: boolean;
  error?: string;
};

export async function createInvitationAction(
  slug: string,
  _prevState: InvitationFormState,
  formData: FormData
): Promise<InvitationFormState> {
  const session = await getCurrentSession();
  if (!session) {
    return {
      success: false,
      error: "Sessão expirada. Faça login novamente.",
    };
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context || !context.roles.includes("CONSULTANCY_ADMIN")) {
    return {
      success: false,
      error: "Você não possui permissão de administrador nesta consultoria.",
    };
  }

  const email = formData.get("email")?.toString() || "";
  const roles = formData.getAll("roles").map((r) => r.toString());

  const result = await createConsultancyInvitation({
    consultancyId: context.consultancyId,
    actorUserId: session.userId,
    email,
    roles,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    };
  }

  try {
    revalidatePath(`/consultoria/${slug}/membros`);
  } catch {
    // Ignorado fora do contexto HTTP
  }

  return {
    success: true,
    message: "Convite gerado com sucesso.",
    invitationPath: result.invitationPath,
  };
}

export async function revokeInvitationAction(
  slug: string,
  invitationPublicId: string
): Promise<RevokeInvitationState> {
  const session = await getCurrentSession();
  if (!session) {
    return {
      success: false,
      error: "Sessão expirada. Faça login novamente.",
    };
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context || !context.roles.includes("CONSULTANCY_ADMIN")) {
    return {
      success: false,
      error: "Você não possui permissão de administrador nesta consultoria.",
    };
  }

  const result = await revokeConsultancyInvitation({
    consultancyId: context.consultancyId,
    actorUserId: session.userId,
    invitationPublicId,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    };
  }

  try {
    revalidatePath(`/consultoria/${slug}/membros`);
  } catch {
    // Ignorado fora do contexto HTTP
  }

  return {
    success: true,
  };
}
