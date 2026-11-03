"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import {
  requestStudentPhotos,
  requestStudentAnamnesis,
  requestStudentAssessment,
  requestFormForStudent,
  listAvailableFormTemplatesForRequest,
  type AvailableFormTemplateOption,
} from "@/lib/consultancies/student-requests";
import {
  getPersonalStudentDetail,
  type PersonalStudentDetail,
} from "@/lib/consultancies/personal-student-hub";

export async function requestStudentPhotosAction(
  slug: string,
  studentMembershipPublicId: string,
  instructions?: string
): Promise<{ success: boolean; requestPublicId?: string; error?: string }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const result = await requestStudentPhotos({
    userId: session.userId,
    consultancySlug: slug,
    studentMembershipPublicId,
    instructions,
  });

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/progresso/alunos/${studentMembershipPublicId}`);
    revalidatePath(`/consultoria/${slug}/progresso`);
  }

  return result;
}

export async function requestStudentAnamnesisAction(
  slug: string,
  studentMembershipPublicId: string
): Promise<{ success: boolean; requestPublicId?: string; error?: string }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const result = await requestStudentAnamnesis({
    userId: session.userId,
    consultancySlug: slug,
    studentMembershipPublicId,
  });

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/progresso/alunos/${studentMembershipPublicId}`);
    revalidatePath(`/consultoria/${slug}/progresso`);
    revalidatePath(`/consultoria/${slug}/formularios`);
  }

  return result;
}

export async function requestStudentAssessmentAction(
  slug: string,
  studentMembershipPublicId: string
): Promise<{ success: boolean; requestPublicId?: string; error?: string }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const result = await requestStudentAssessment({
    userId: session.userId,
    consultancySlug: slug,
    studentMembershipPublicId,
  });

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/progresso/alunos/${studentMembershipPublicId}`);
    revalidatePath(`/consultoria/${slug}/progresso`);
    revalidatePath(`/consultoria/${slug}/formularios`);
  }

  return result;
}

export async function requestStudentCustomFormAction(
  slug: string,
  studentMembershipPublicId: string,
  templatePublicId: string
): Promise<{ success: boolean; requestPublicId?: string; error?: string }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  try {
    const req = await requestFormForStudent(
      session.userId,
      slug,
      templatePublicId,
      studentMembershipPublicId
    );

    revalidatePath(`/consultoria/${slug}/progresso/alunos/${studentMembershipPublicId}`);
    revalidatePath(`/consultoria/${slug}/progresso`);
    revalidatePath(`/consultoria/${slug}/formularios`);

    return { success: req.success, requestPublicId: req.requestPublicId, error: req.error };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao solicitar formulário." };
  }
}

export async function getAvailableFormTemplatesAction(
  slug: string
): Promise<{ success: boolean; templates?: AvailableFormTemplateOption[]; error?: string }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    return { success: false, error: "Acesso negado." };
  }

  try {
    const templates = await listAvailableFormTemplatesForRequest(context.consultancyId);
    return { success: true, templates };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao listar formulários." };
  }
}

export async function getPersonalStudentDetailAction(
  slug: string,
  studentMembershipPublicId: string
): Promise<{ success: boolean; detail?: PersonalStudentDetail | null; error?: string }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    return { success: false, error: "Acesso negado." };
  }

  try {
    const detail = await getPersonalStudentDetail({
      consultancyId: context.consultancyId,
      consultancySlug: slug,
      studentMembershipPublicId,
    });
    return { success: true, detail };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao carregar detalhes do aluno." };
  }
}
