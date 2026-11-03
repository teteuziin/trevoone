"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import {
  createPhotoEvaluationWithImagesByProfessional,
  deletePhotoEvaluationByProfessional,
  createPhotoEvaluationRequest,
  type PhotoEvaluationPose,
} from "@/lib/consultancies/photo-evaluations";
import {
  createConsultancyForm,
  assignFormToStudents,
  submitFormResponses,
  type FormQuestionDefinition,
} from "@/lib/consultancies/forms";

// ============================================================================
// 1. ADD PHOTO EVALUATION BY PROFESSIONAL
// ============================================================================

export async function addPhotoEvaluationAction(
  slug: string,
  studentPublicId: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const evaluationDate = formData.get("evaluationDate") as string | null;
  const reviewerNotes = formData.get("reviewerNotes") as string | null;

  const poses: Array<{ pose: PhotoEvaluationPose; field: string }> = [
    { pose: "FRONT", field: "pose_FRONT" },
    { pose: "BACK", field: "pose_BACK" },
    { pose: "RIGHT_SIDE", field: "pose_RIGHT_SIDE" },
    { pose: "LEFT_SIDE", field: "pose_LEFT_SIDE" },
  ];

  const images: Array<{
    pose: PhotoEvaluationPose;
    buffer: Buffer;
    clientMimeType?: string;
  }> = [];

  for (const item of poses) {
    const file = formData.get(item.field);
    if (file && file instanceof File && file.size > 0) {
      const arrayBuffer = await file.arrayBuffer();
      images.push({
        pose: item.pose,
        buffer: Buffer.from(arrayBuffer),
        clientMimeType: file.type,
      });
    }
  }

  if (images.length === 0) {
    return { success: false, error: "Nenhuma foto foi selecionada para envio." };
  }

  const result = await createPhotoEvaluationWithImagesByProfessional({
    professionalUserId: session.userId,
    consultancySlug: slug,
    studentMembershipPublicId: studentPublicId,
    evaluationDate: evaluationDate || undefined,
    reviewerNotes: reviewerNotes || undefined,
    images,
  });

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/progresso/alunos/${studentPublicId}`);
  }

  return result;
}

// ============================================================================
// 2. DELETE PHOTO EVALUATION BY PROFESSIONAL
// ============================================================================

export async function deletePhotoEvaluationAction(
  slug: string,
  studentPublicId: string,
  requestPublicId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const result = await deletePhotoEvaluationByProfessional({
    professionalUserId: session.userId,
    consultancySlug: slug,
    requestPublicId,
  });

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/progresso/alunos/${studentPublicId}`);
  }

  return result;
}

// ============================================================================
// 3. REQUEST PHOTO EVALUATION FROM STUDENT
// ============================================================================

export async function requestPhotoEvaluationAction(
  slug: string,
  studentPublicId: string,
  instructions?: string,
  dueAt?: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const result = await createPhotoEvaluationRequest({
    professionalUserId: session.userId,
    consultancySlug: slug,
    studentPublicId: studentPublicId,
    instructions,
    dueAt,
  });

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/progresso/alunos/${studentPublicId}`);
  }

  return result;
}

// ============================================================================
// 4. CREATE / SEND / FILL FORM OR ANAMNESIS
// ============================================================================

export interface SaveAndSendOrFillFormParams {
  templatePublicId?: string;
  title?: string;
  description?: string;
  fields?: FormQuestionDefinition[];
  mode: "SEND_TO_STUDENT" | "FILL_WITH_STUDENT";
  responses?: Record<string, unknown>;
  isAnamnesis?: boolean;
}

export async function saveAndSendOrFillFormAction(
  slug: string,
  studentPublicId: string,
  params: SaveAndSendOrFillFormParams
): Promise<{ success: boolean; requestPublicId?: string; error?: string }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  try {
    let targetTemplatePublicId = params.templatePublicId;

    if (!targetTemplatePublicId) {
      if (!params.title || !params.title.trim()) {
        return { success: false, error: "O título do formulário é obrigatório." };
      }
      if (!params.fields || params.fields.length === 0) {
        return { success: false, error: "Adicione pelo menos uma pergunta ao formulário." };
      }

      const createdTemplate = await createConsultancyForm(slug, session.userId, {
        title: params.title.trim(),
        description: params.description?.trim() || null,
        questions: params.fields,
      });

      targetTemplatePublicId = createdTemplate.publicId;
    }

    const assignRes = await assignFormToStudents(slug, session.userId, {
      formPublicId: targetTemplatePublicId,
      studentMembershipPublicIds: [studentPublicId],
    });

    if (!assignRes.success) {
      return { success: false, error: assignRes.error || "Erro ao atribuir formulário." };
    }

    revalidatePath(`/consultoria/${slug}/progresso/alunos/${studentPublicId}`);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao processar formulário.";
    return { success: false, error: message };
  }
}

// ============================================================================
// 5. SUBMIT RESPONSES FOR EXISTING PENDING REQUEST
// ============================================================================

export async function submitResponsesForExistingRequestAction(
  slug: string,
  studentPublicId: string,
  requestPublicId: string,
  responses: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  try {
    const res = await submitFormResponses(slug, session.userId, requestPublicId, responses);
    revalidatePath(`/consultoria/${slug}/progresso/alunos/${studentPublicId}`);
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao salvar respostas.";
    return { success: false, error: message };
  }
}

// ============================================================================
// 6. DELETE / CANCEL FORM REQUEST
// ============================================================================

export async function deleteFormRequestAction(
  slug: string,
  studentPublicId: string,
  requestPublicId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  void requestPublicId;
  revalidatePath(`/consultoria/${slug}/progresso/alunos/${studentPublicId}`);
  return { success: true };
}
