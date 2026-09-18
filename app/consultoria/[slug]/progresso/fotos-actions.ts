"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import {
  createPhotoEvaluationRequest,
  submitPhotoEvaluation,
  reviewPhotoEvaluation,
  type PhotoEvaluationPose,
} from "@/lib/consultancies/photo-evaluations";

export interface ActionState {
  success?: boolean;
  error?: string;
  requestPublicId?: string;
}

/**
 * Professional creates a photo evaluation request for an active student.
 */
export async function createPhotoEvaluationRequestAction(
  prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const consultancySlug = formData.get("consultancySlug") as string;
  const studentPublicId = formData.get("studentPublicId") as string;
  const instructions = formData.get("instructions") as string | null;
  const dueAt = formData.get("dueAt") as string | null;

  if (!consultancySlug || !studentPublicId) {
    return { success: false, error: "Dados incompletos para solicitação." };
  }

  const result = await createPhotoEvaluationRequest({
    professionalUserId: session.userId,
    consultancySlug,
    studentPublicId,
    instructions,
    dueAt: dueAt || null,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(`/consultoria/${consultancySlug}/progresso/alunos/${studentPublicId}`);
  revalidatePath(`/consultoria/${consultancySlug}/progresso`);

  return { success: true, requestPublicId: result.requestPublicId };
}

/**
 * Student submits the completed photo evaluation (all 4 poses uploaded).
 */
export async function submitPhotoEvaluationAction(
  prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const consultancySlug = formData.get("consultancySlug") as string;
  const requestPublicId = formData.get("requestPublicId") as string;
  const consent = formData.get("hasAgreedToGuidelines");
  const hasAgreedToGuidelines = consent === "true" || consent === "on" || consent === "1";

  if (!consultancySlug || !requestPublicId) {
    return { success: false, error: "Dados incompletos para envio." };
  }

  if (!hasAgreedToGuidelines) {
    return {
      success: false,
      error: "É necessário confirmar o termo de consentimento para enviar as fotos.",
    };
  }

  const result = await submitPhotoEvaluation({
    userId: session.userId,
    consultancySlug,
    requestPublicId,
    hasAgreedToGuidelines,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(`/consultoria/${consultancySlug}/progresso`);
  revalidatePath(`/consultoria/${consultancySlug}`);

  return { success: true };
}

/**
 * Professional reviews evaluation (APPROVE or CHANGES_REQUESTED).
 */
export async function reviewPhotoEvaluationAction(
  prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const consultancySlug = formData.get("consultancySlug") as string;
  const requestPublicId = formData.get("requestPublicId") as string;
  const studentPublicId = formData.get("studentPublicId") as string;
  const decision = formData.get("decision") as "APPROVE" | "CHANGES_REQUESTED";
  const reviewerNotes = formData.get("reviewerNotes") as string | null;
  const posesRaw = formData.getAll("posesToRetake") as string[];

  if (!consultancySlug || !requestPublicId || !decision) {
    return { success: false, error: "Dados incompletos para revisão." };
  }

  const posesToRetake = posesRaw as PhotoEvaluationPose[];

  const result = await reviewPhotoEvaluation({
    professionalUserId: session.userId,
    consultancySlug,
    requestPublicId,
    decision,
    reviewerNotes,
    posesToRetake,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  if (studentPublicId) {
    revalidatePath(`/consultoria/${consultancySlug}/progresso/alunos/${studentPublicId}`);
  }
  revalidatePath(`/consultoria/${consultancySlug}/progresso`);

  return { success: true };
}
