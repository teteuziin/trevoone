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
  createFormTemplate,
  requestFormForStudent,
  submitFormResponses,
  cancelOrDeleteFormRequest,
  type CustomFormFieldDefinition,
} from "@/lib/consultancies/custom-forms";

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
  fields?: CustomFormFieldDefinition[];
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

    // 1. If no existing template public ID provided, create template first
    if (!targetTemplatePublicId) {
      if (!params.title || !params.title.trim()) {
        return { success: false, error: "O título do formulário é obrigatório." };
      }
      if (!params.fields || params.fields.length === 0) {
        return { success: false, error: "Adicione pelo menos uma pergunta ao formulário." };
      }

      const createdTemplate = await createFormTemplate(session.userId, slug, {
        title: params.title.trim(),
        description: params.description?.trim() || undefined,
        fields: params.fields,
      });

      targetTemplatePublicId = createdTemplate.publicId;
    }

    // 2. Request form for the student
    const formRequest = await requestFormForStudent(
      session.userId,
      slug,
      targetTemplatePublicId,
      studentPublicId
    );

    // 3. If mode is "FILL_WITH_STUDENT", immediately submit answers on student's behalf
    if (params.mode === "FILL_WITH_STUDENT" && params.responses) {
      await submitFormResponses(
        session.userId,
        slug,
        formRequest.publicId,
        { responses: params.responses }
      );
    }

    revalidatePath(`/consultoria/${slug}/progresso/alunos/${studentPublicId}`);
    return { success: true, requestPublicId: formRequest.publicId };
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
    await submitFormResponses(session.userId, slug, requestPublicId, { responses });
    revalidatePath(`/consultoria/${slug}/progresso/alunos/${studentPublicId}`);
    return { success: true };
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

  try {
    await cancelOrDeleteFormRequest(session.userId, slug, requestPublicId);
    revalidatePath(`/consultoria/${slug}/progresso/alunos/${studentPublicId}`);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao excluir solicitação.";
    return { success: false, error: message };
  }
}
