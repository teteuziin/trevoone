"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import { submitStudentOnboardingRequirement } from "@/lib/consultancies/student-onboarding";

export type SubmitRequirementActionState = {
  success: boolean;
  message?: string;
  error?: string;
};

export async function submitRequirementAction(
  slug: string,
  requirementPublicId: string
): Promise<SubmitRequirementActionState> {
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

  if (!requirementPublicId || typeof requirementPublicId !== "string" || !requirementPublicId.trim()) {
    return {
      success: false,
      error: "Requisito inválido.",
    };
  }

  const result = await submitStudentOnboardingRequirement(
    session.userId,
    slug.trim(),
    requirementPublicId.trim()
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error || "Não foi possível registrar o envio.",
    };
  }

  revalidatePath(`/consultoria/${slug}/onboarding`);
  revalidatePath(`/consultoria/${slug}`);

  return {
    success: true,
    message: result.message || "Envio registrado com sucesso.",
  };
}
