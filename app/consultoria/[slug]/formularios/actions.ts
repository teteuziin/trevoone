"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import {
  createFormTemplate,
  updateFormTemplate,
  requestFormForStudent,
  submitFormResponses,
  reviewFormRequest,
  type CreateFormTemplateInput,
  type UpdateFormTemplateInput,
  type SubmitFormResponsesInput,
  type ReviewFormRequestInput,
} from "@/lib/consultancies/custom-forms";

export async function createFormTemplateAction(
  slug: string,
  input: CreateFormTemplateInput
) {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Não autenticado." };
  }

  try {
    const template = await createFormTemplate(session.userId, slug, input);
    revalidatePath(`/consultoria/${slug}/formularios`);
    return { success: true, template };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao criar formulário." };
  }
}

export async function updateFormTemplateAction(
  slug: string,
  templatePublicId: string,
  input: UpdateFormTemplateInput
) {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Não autenticado." };
  }

  try {
    const ok = await updateFormTemplate(session.userId, slug, templatePublicId, input);
    revalidatePath(`/consultoria/${slug}/formularios`);
    return { success: ok };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao atualizar formulário." };
  }
}

export async function requestFormForStudentAction(
  slug: string,
  templatePublicId: string,
  studentMembershipPublicId: string
) {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Não autenticado." };
  }

  try {
    const req = await requestFormForStudent(
      session.userId,
      slug,
      templatePublicId,
      studentMembershipPublicId
    );
    revalidatePath(`/consultoria/${slug}/formularios`);
    return { success: true, request: req };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao solicitar formulário." };
  }
}

export async function submitFormResponsesAction(
  slug: string,
  requestPublicId: string,
  input: SubmitFormResponsesInput
) {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Não autenticado." };
  }

  try {
    const ok = await submitFormResponses(session.userId, slug, requestPublicId, input);
    revalidatePath(`/consultoria/${slug}/formularios`);
    revalidatePath(`/consultoria/${slug}/formularios/${requestPublicId}`);
    return { success: ok };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao enviar respostas." };
  }
}

export async function reviewFormRequestAction(
  slug: string,
  requestPublicId: string,
  input: ReviewFormRequestInput
) {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Não autenticado." };
  }

  try {
    const ok = await reviewFormRequest(session.userId, slug, requestPublicId, input);
    revalidatePath(`/consultoria/${slug}/formularios`);
    revalidatePath(`/consultoria/${slug}/formularios/${requestPublicId}`);
    return { success: ok };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao avaliar formulário." };
  }
}
