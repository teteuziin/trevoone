"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import {
  VIEW_MODE_COOKIE_NAME,
  getAllowedViewModeOptions,
  type ConsultancyPresentationMode,
} from "@/lib/consultancies/view-mode";

export async function setConsultancyViewModeAction(
  slug: string,
  mode: ConsultancyPresentationMode | "DEFAULT"
): Promise<{ success: boolean; error?: string }> {
  if (!slug || typeof slug !== "string" || !slug.trim()) {
    return { success: false, error: "Identificador da consultoria inválido." };
  }

  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const context = await resolveConsultancyContext(session.userId, slug.trim());
  if (!context) {
    return { success: false, error: "Você não possui acesso ativo a esta consultoria." };
  }

  const cookieStore = await cookies();

  if (mode === "DEFAULT") {
    cookieStore.delete({
      name: VIEW_MODE_COOKIE_NAME,
      path: "/consultoria",
    });
    revalidatePath(`/consultoria/${slug}`);
    return { success: true };
  }

  const allowedOptions = getAllowedViewModeOptions(context.roles);
  const isAllowed = allowedOptions.some((o) => o.mode === mode);

  if (!isAllowed) {
    return {
      success: false,
      error: "O modo de visualização solicitado não é permitido para suas permissões.",
    };
  }

  cookieStore.set(VIEW_MODE_COOKIE_NAME, `${slug.trim()}:${mode}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/consultoria",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  revalidatePath(`/consultoria/${slug}`);
  return { success: true };
}
