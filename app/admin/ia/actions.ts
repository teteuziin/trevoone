"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import { getPlatformAdminAccess } from "@/lib/platform-admin/access";
import { setConsultancyPlatformAiLimit } from "@/lib/ai/quotas";

export async function updateConsultancyPlatformAiLimitAction(
  consultancyId: number,
  dailyLimit: number,
  isEnabled = true,
  notes: string | null = null
) {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Não autenticado." };
  }

  const { isPlatformAdmin } = await getPlatformAdminAccess(session.userId);
  if (!isPlatformAdmin) {
    return { success: false, error: "Apenas Platform Admins podem alterar cotas globais de IA." };
  }

  try {
    await setConsultancyPlatformAiLimit({
      consultancyId,
      dailyLimit: Math.max(0, Number(dailyLimit)),
      isEnabled,
      notes,
    });

    revalidatePath("/admin/ia");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao salvar limite da consultoria.";
    return { success: false, error: message };
  }
}
