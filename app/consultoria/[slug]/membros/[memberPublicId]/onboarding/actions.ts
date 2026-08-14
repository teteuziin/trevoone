"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import { confirmStudentOnboardingRequirement } from "@/lib/consultancies/student-onboarding";

export type ConfirmRequirementActionState = {
  success: boolean;
  message?: string;
  error?: string;
};

export async function confirmRequirementAction(
  slug: string,
  memberPublicId: string,
  requirementPublicId: string
): Promise<ConfirmRequirementActionState> {
  const session = await getCurrentSession();

  if (!session) {
    return {
      success: false,
      error: "Sessão expirada. Faça login novamente.",
    };
  }

  if (!slug || typeof slug !== "string" || !slug.trim()) {
    return {
      success: false,
      error: "Consultoria inválida.",
    };
  }

  if (!memberPublicId || typeof memberPublicId !== "string" || !memberPublicId.trim()) {
    return {
      success: false,
      error: "Membro inválido.",
    };
  }

  if (!requirementPublicId || typeof requirementPublicId !== "string" || !requirementPublicId.trim()) {
    return {
      success: false,
      error: "Requisito inválido.",
    };
  }

  const result = await confirmStudentOnboardingRequirement(
    session.userId,
    slug.trim(),
    memberPublicId.trim(),
    requirementPublicId.trim()
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error || "Não foi possível confirmar o requisito.",
    };
  }

  revalidatePath(`/consultoria/${slug}/membros/${memberPublicId}/onboarding`);
  revalidatePath(`/consultoria/${slug}/membros`);
  revalidatePath(`/consultoria/${slug}/onboarding`);
  revalidatePath(`/consultoria/${slug}`);

  return {
    success: true,
    message: result.message || "Requisito confirmado com sucesso.",
  };
}
