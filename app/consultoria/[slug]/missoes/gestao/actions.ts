"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import {
  cancelMission,
  createMission,
  MAX_MISSION_EARLY_REQUEST_BYTES,
  reviewMission,
  uploadAdminReferenceAttachment,
  type SubmissionReviewDecision,
} from "@/lib/consultancies/missions";

export type CreateMissionFormState = {
  success: boolean;
  error?: string;
  field?: "assigneeMembershipPublicId" | "title" | "objective" | "instructions" | "priority" | "dueDate" | "dueTime";
};

export async function createMissionAction(
  slug: string,
  _prevState: CreateMissionFormState | null,
  formData: FormData
): Promise<CreateMissionFormState> {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const consultancyContext = await resolveConsultancyContext(session.userId, slug);
  if (!consultancyContext) {
    redirect("/selecionar-consultoria");
  }

  if (!consultancyContext.roles.includes("CONSULTANCY_ADMIN")) {
    return { success: false, error: "Apenas administradores da consultoria podem criar missões." };
  }

  const assigneeMembershipPublicId = String(formData.get("assigneeMembershipPublicId") || "");
  const title = String(formData.get("title") || "");
  const objective = String(formData.get("objective") || "");
  const instructions = String(formData.get("instructions") || "");
  const priority = String(formData.get("priority") || "NORMAL");
  const dueDate = String(formData.get("dueDate") || "");
  const dueTime = String(formData.get("dueTime") || "");

  const result = await createMission({
    consultancyId: consultancyContext.consultancyId,
    actorUserId: session.userId,
    timezone: consultancyContext.consultancyTimezone,
    assigneeMembershipPublicId,
    title,
    objective,
    instructions,
    priority,
    dueDate,
    dueTime,
  });

  if (!result.success) {
    return result;
  }

  revalidatePath(`/consultoria/${slug}/missoes/gestao`);
  redirect(`/consultoria/${slug}/missoes/gestao/${result.missionPublicId}`);
}

export type AdminMissionActionState = {
  success: boolean;
  error?: string;
};

export async function reviewMissionAction(
  slug: string,
  missionPublicId: string,
  decision: SubmissionReviewDecision,
  reviewNote?: string
): Promise<AdminMissionActionState> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const consultancyContext = await resolveConsultancyContext(session.userId, slug);
  if (!consultancyContext) {
    return { success: false, error: "Consultoria não encontrada." };
  }

  if (!consultancyContext.roles.includes("CONSULTANCY_ADMIN")) {
    return { success: false, error: "Apenas administradores da consultoria podem revisar missões." };
  }

  const result = await reviewMission({
    consultancyId: consultancyContext.consultancyId,
    actorUserId: session.userId,
    missionPublicId,
    decision,
    reviewNote,
  });

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/missoes/gestao`);
    revalidatePath(`/consultoria/${slug}/missoes/gestao/${missionPublicId}`);
    revalidatePath(`/consultoria/${slug}/missoes/${missionPublicId}`);
  }

  return result;
}

export async function cancelMissionAction(
  slug: string,
  missionPublicId: string
): Promise<AdminMissionActionState> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const consultancyContext = await resolveConsultancyContext(session.userId, slug);
  if (!consultancyContext) {
    return { success: false, error: "Consultoria não encontrada." };
  }

  if (!consultancyContext.roles.includes("CONSULTANCY_ADMIN")) {
    return { success: false, error: "Apenas administradores da consultoria podem cancelar missões." };
  }

  const result = await cancelMission({
    consultancyId: consultancyContext.consultancyId,
    actorUserId: session.userId,
    missionPublicId,
  });

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/missoes/gestao`);
    revalidatePath(`/consultoria/${slug}/missoes/gestao/${missionPublicId}`);
    revalidatePath(`/consultoria/${slug}/missoes/${missionPublicId}`);
  }

  return result;
}

export async function uploadReferenceAttachmentAction(
  slug: string,
  missionPublicId: string,
  _prevState: AdminMissionActionState | null,
  formData: FormData
): Promise<AdminMissionActionState> {
  // Early Content-Length guard
  const reqHeaders = await headers();
  const rawContentLength = reqHeaders.get("content-length");
  if (rawContentLength !== null) {
    const trimmedCl = rawContentLength.trim();
    if (!/^\d+$/.test(trimmedCl)) {
      return { success: false, error: "Requisição inválida (Content-Length malformado)." };
    }
    const parsedCl = BigInt(trimmedCl);
    if (parsedCl > BigInt(MAX_MISSION_EARLY_REQUEST_BYTES)) {
      return {
        success: false,
        error: "O tamanho do arquivo excede o limite máximo permitido de 22 MB.",
      };
    }
  }

  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const consultancyContext = await resolveConsultancyContext(session.userId, slug);
  if (!consultancyContext) {
    return { success: false, error: "Consultoria não encontrada." };
  }

  if (!consultancyContext.roles.includes("CONSULTANCY_ADMIN")) {
    return { success: false, error: "Apenas administradores da consultoria podem anexar arquivos de referência." };
  }

  const fileEntry = formData.get("file");
  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    return { success: false, error: "Selecione um arquivo válido." };
  }

  const buffer = Buffer.from(await fileEntry.arrayBuffer());
  const result = await uploadAdminReferenceAttachment({
    consultancyId: consultancyContext.consultancyId,
    actorUserId: session.userId,
    missionPublicId,
    file: {
      buffer,
      fileName: fileEntry.name,
      clientMime: fileEntry.type,
    },
  });

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/missoes/gestao/${missionPublicId}`);
    revalidatePath(`/consultoria/${slug}/missoes/${missionPublicId}`);
  }

  return result;
}
