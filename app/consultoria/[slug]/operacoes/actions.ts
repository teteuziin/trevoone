"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import {
  createProfessionalAdminAction,
  resolveProfessionalAdminAction,
  ProfessionalAdminActionType,
} from "@/lib/monitoring/admin-actions";
import {
  acknowledgeAlert,
  resolveAlert,
} from "@/lib/monitoring/evaluator";

export async function createAdminActionAction(
  slug: string,
  professionalMemberId: number,
  actionType: ProfessionalAdminActionType,
  reason: string,
  expiresAt?: string | null
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Usuário não autenticado." };

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context || !context.roles.includes("CONSULTANCY_ADMIN")) {
    return { success: false, error: "Apenas administradores podem registrar ações." };
  }

  const expDate = expiresAt ? new Date(expiresAt) : null;

  const result = await createProfessionalAdminAction(
    context.consultancyId,
    professionalMemberId,
    context.membershipId,
    session.userId,
    actionType,
    reason,
    expDate
  );

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/operacoes`);
  }

  return result;
}

export async function resolveAdminActionAction(
  slug: string,
  actionId: number,
  resolutionNote?: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Usuário não autenticado." };

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context || !context.roles.includes("CONSULTANCY_ADMIN")) {
    return { success: false, error: "Apenas administradores podem resolver ações." };
  }

  const result = await resolveProfessionalAdminAction(
    context.consultancyId,
    actionId,
    context.membershipId,
    session.userId,
    resolutionNote
  );

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/operacoes`);
  }

  return result;
}

export async function acknowledgeMonitoringAlertAction(
  slug: string,
  alertId: number
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Usuário não autenticado." };

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context || !context.roles.includes("CONSULTANCY_ADMIN")) {
    return { success: false, error: "Acesso restrito à coordenação." };
  }

  const result = await acknowledgeAlert(context.consultancyId, alertId, context.membershipId);
  if (result.success) {
    revalidatePath(`/consultoria/${slug}/operacoes`);
  }
  return result;
}

export async function resolveMonitoringAlertAction(
  slug: string,
  alertId: number
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Usuário não autenticado." };

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context || !context.roles.includes("CONSULTANCY_ADMIN")) {
    return { success: false, error: "Acesso restrito à coordenação." };
  }

  const result = await resolveAlert(context.consultancyId, alertId, context.membershipId);
  if (result.success) {
    revalidatePath(`/consultoria/${slug}/operacoes`);
  }
  return result;
}
