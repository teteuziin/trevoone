"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { submitDailyCheckin, getTodayCheckin, DailyCheckinInput } from "@/lib/checkins/service";
import { evaluateStudentMonitoring } from "@/lib/monitoring/evaluator";

export async function submitDailyCheckinAction(
  slug: string,
  data: DailyCheckinInput
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Usuário não autenticado." };
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context || !context.roles.includes("STUDENT")) {
    return { success: false, error: "Acesso restrito ao perfil de aluno desta consultoria." };
  }

  const result = await submitDailyCheckin(
    context.consultancyId,
    context.membershipId,
    session.userId,
    data
  );

  if (result.success) {
    // Opportunistic monitoring evaluation after check-in
    try {
      await evaluateStudentMonitoring(context.consultancyId, context.membershipId);
    } catch {
      // Background non-blocking
    }

    revalidatePath(`/consultoria/${slug}`);
    revalidatePath(`/consultoria/${slug}/operacoes`);
  }

  return result;
}

export async function getTodayCheckinAction(
  slug: string
) {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Não autenticado." };
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    return { success: false, error: "Consultoria não encontrada." };
  }

  const checkin = await getTodayCheckin(context.consultancyId, context.membershipId);
  return { success: true, checkin };
}
