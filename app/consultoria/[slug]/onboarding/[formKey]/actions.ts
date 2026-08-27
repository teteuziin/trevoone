"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import {
  saveStudentIntakeDraft,
  submitStudentIntake,
  type SaveIntakeDraftResult,
  type SubmitIntakeResult,
} from "@/lib/consultancies/student-intake";

export async function saveIntakeDraftAction(
  slug: string,
  formKey: string,
  responses: Record<string, unknown>
): Promise<SaveIntakeDraftResult> {
  const session = await getCurrentSession();
  if (!session) {
    return {
      success: false,
      error: "Sessão expirada. Por favor, faça login novamente.",
    };
  }

  if (!slug || typeof slug !== "string" || !slug.trim()) {
    return {
      success: false,
      error: "Consultoria inválida.",
    };
  }

  if (!formKey || typeof formKey !== "string" || !formKey.trim()) {
    return {
      success: false,
      error: "Formulário não informado.",
    };
  }

  const result = await saveStudentIntakeDraft(
    session.userId,
    slug.trim(),
    formKey.trim(),
    responses
  );

  return result;
}

export async function submitIntakeAction(
  slug: string,
  formKey: string,
  responses: Record<string, unknown>
): Promise<SubmitIntakeResult> {
  const session = await getCurrentSession();
  if (!session) {
    return {
      success: false,
      error: "Sessão expirada. Por favor, faça login novamente.",
    };
  }

  if (!slug || typeof slug !== "string" || !slug.trim()) {
    return {
      success: false,
      error: "Consultoria inválida.",
    };
  }

  if (!formKey || typeof formKey !== "string" || !formKey.trim()) {
    return {
      success: false,
      error: "Formulário não informado.",
    };
  }

  const result = await submitStudentIntake(
    session.userId,
    slug.trim(),
    formKey.trim(),
    responses
  );

  if (result.success) {
    const cleanSlug = slug.trim();
    revalidatePath(`/consultoria/${cleanSlug}/onboarding`);
    revalidatePath(`/consultoria/${cleanSlug}/onboarding/${formKey.trim()}`);
    revalidatePath(`/consultoria/${cleanSlug}`);
  }

  return result;
}
