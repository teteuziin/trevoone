"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import {
  setConsultancyRoleAiLimit,
  setConsultancyMemberAiOverride,
  removeConsultancyMemberAiOverride,
} from "@/lib/ai/quotas";
import { recordConsultancyActivity } from "@/lib/consultancies/activity-log";

export async function updateConsultancyRoleAiLimitsAction(
  slug: string,
  personalLimit: number,
  nutritionistLimit: number
) {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Não autenticado." };
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context || !context.roles.includes("CONSULTANCY_ADMIN")) {
    return { success: false, error: "Apenas administradores da consultoria podem alterar os limites de IA." };
  }

  try {
    const pLimit = Math.max(0, Number(personalLimit));
    const nLimit = Math.max(0, Number(nutritionistLimit));

    await setConsultancyRoleAiLimit({
      consultancyId: context.consultancyId,
      role: "PERSONAL",
      dailyLimit: pLimit,
    });

    await setConsultancyRoleAiLimit({
      consultancyId: context.consultancyId,
      role: "NUTRITIONIST",
      dailyLimit: nLimit,
    });

    await recordConsultancyActivity({
      consultancyId: context.consultancyId,
      actorUserId: session.userId,
      actorMembershipId: context.membershipId,
      actorRole: "CONSULTANCY_ADMIN",
      action: "AI_LIMIT_CHANGED",
      module: "AI",
      resourceType: "CONSULTANCY_AI_ROLE_LIMITS",
      resourcePublicId: String(context.consultancyId),
      summary: `alterou as cotas padrão de IA para Personal (${pLimit}/dia) e Nutricionista (${nLimit}/dia)`,
      metadata: {
        personalDailyLimit: pLimit,
        nutritionistDailyLimit: nLimit,
      },
    });

    revalidatePath(`/consultoria/${slug}/configuracoes/ia`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao salvar limites padrão." };
  }
}

export async function updateConsultancyMemberAiOverrideAction(
  slug: string,
  membershipId: number,
  dailyLimit: number,
  memberFullName?: string
) {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Não autenticado." };
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context || !context.roles.includes("CONSULTANCY_ADMIN")) {
    return { success: false, error: "Apenas administradores da consultoria podem configurar limites individuais." };
  }

  try {
    const limit = Math.max(0, Number(dailyLimit));

    await setConsultancyMemberAiOverride({
      consultancyId: context.consultancyId,
      membershipId,
      dailyLimit: limit,
    });

    await recordConsultancyActivity({
      consultancyId: context.consultancyId,
      actorUserId: session.userId,
      actorMembershipId: context.membershipId,
      actorRole: "CONSULTANCY_ADMIN",
      action: "AI_MEMBER_LIMIT_CHANGED",
      module: "AI",
      resourceType: "CONSULTANCY_AI_MEMBER_LIMIT",
      resourcePublicId: String(membershipId),
      subjectMembershipId: membershipId,
      summary: `configurou o limite individual de IA de ${memberFullName || "membro"} para ${limit} utilizações/dia`,
      metadata: {
        membershipId,
        memberFullName,
        dailyLimit: limit,
      },
    });

    revalidatePath(`/consultoria/${slug}/configuracoes/ia`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao salvar limite individual." };
  }
}

export async function removeConsultancyMemberAiOverrideAction(
  slug: string,
  membershipId: number,
  memberFullName?: string
) {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Não autenticado." };
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context || !context.roles.includes("CONSULTANCY_ADMIN")) {
    return { success: false, error: "Apenas administradores da consultoria podem remover limites individuais." };
  }

  try {
    await removeConsultancyMemberAiOverride({
      consultancyId: context.consultancyId,
      membershipId,
    });

    await recordConsultancyActivity({
      consultancyId: context.consultancyId,
      actorUserId: session.userId,
      actorMembershipId: context.membershipId,
      actorRole: "CONSULTANCY_ADMIN",
      action: "AI_MEMBER_LIMIT_CHANGED",
      module: "AI",
      resourceType: "CONSULTANCY_AI_MEMBER_LIMIT",
      resourcePublicId: String(membershipId),
      subjectMembershipId: membershipId,
      summary: `removeu o limite individual de IA de ${memberFullName || "membro"}, retornando ao padrão da função`,
      metadata: {
        membershipId,
        memberFullName,
      },
    });

    revalidatePath(`/consultoria/${slug}/configuracoes/ia`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Erro ao remover limite individual." };
  }
}
