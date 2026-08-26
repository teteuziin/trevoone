"use server";

import { getCurrentSession } from "@/lib/auth/session";
import {
  scheduleConsultation,
  rescheduleConsultation,
  cancelConsultation,
  type ConsultationProfessionalType,
  VALID_PROFESSIONAL_TYPES,
} from "@/lib/consultancies/consultations";

export type ConsultationActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  consultationPublicId?: string;
};

export async function scheduleConsultationAction(
  _prevState: ConsultationActionState,
  formData: FormData
): Promise<ConsultationActionState> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const slug = String(formData.get("slug") || "").trim();
  const studentMembershipPublicId = String(
    formData.get("studentMembershipPublicId") || ""
  ).trim();
  const professionalMembershipPublicId =
    String(formData.get("professionalMembershipPublicId") || "").trim() || undefined;
  const rawProfessionalType = String(formData.get("professionalType") || "").trim();
  const title = String(formData.get("title") || "").trim() || undefined;
  const rawStartAt = String(formData.get("scheduledStartAt") || "").trim();
  const rawEndAt = String(formData.get("scheduledEndAt") || "").trim();

  if (!slug) {
    return { success: false, error: "Identificador da consultoria não fornecido." };
  }

  if (!studentMembershipPublicId) {
    return { success: false, error: "Selecione um aluno para a consulta." };
  }

  if (!VALID_PROFESSIONAL_TYPES.includes(rawProfessionalType as ConsultationProfessionalType)) {
    return { success: false, error: "Tipo de profissional inválido." };
  }

  const professionalType = rawProfessionalType as ConsultationProfessionalType;

  if (!rawStartAt || !rawEndAt) {
    return { success: false, error: "Informe os horários de início e término da consulta." };
  }

  const scheduledStartAt = new Date(rawStartAt);
  const scheduledEndAt = new Date(rawEndAt);

  if (isNaN(scheduledStartAt.getTime()) || isNaN(scheduledEndAt.getTime())) {
    return { success: false, error: "Formato de data/hora inválido. Envie no padrão ISO 8601." };
  }

  const result = await scheduleConsultation({
    actorUserId: session.userId,
    consultancySlug: slug,
    studentMembershipPublicId,
    professionalMembershipPublicId,
    professionalType,
    title,
    scheduledStartAt,
    scheduledEndAt,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    consultationPublicId: result.consultation.publicId,
    message: "Consulta agendada com sucesso!",
  };
}

export async function rescheduleConsultationAction(
  _prevState: ConsultationActionState,
  formData: FormData
): Promise<ConsultationActionState> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const slug = String(formData.get("slug") || "").trim();
  const consultationPublicId = String(
    formData.get("consultationPublicId") || ""
  ).trim();
  const rawStartAt = String(formData.get("scheduledStartAt") || "").trim();
  const rawEndAt = String(formData.get("scheduledEndAt") || "").trim();

  if (!slug || !consultationPublicId) {
    return { success: false, error: "Identificador da consulta não fornecido." };
  }

  if (!rawStartAt || !rawEndAt) {
    return { success: false, error: "Informe os novos horários de início e término." };
  }

  const scheduledStartAt = new Date(rawStartAt);
  const scheduledEndAt = new Date(rawEndAt);

  if (isNaN(scheduledStartAt.getTime()) || isNaN(scheduledEndAt.getTime())) {
    return { success: false, error: "Formato de data/hora inválido. Envie no padrão ISO 8601." };
  }

  const result = await rescheduleConsultation({
    actorUserId: session.userId,
    consultancySlug: slug,
    consultationPublicId,
    scheduledStartAt,
    scheduledEndAt,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    consultationPublicId: result.consultation.publicId,
    message: "Consulta remarcada com sucesso!",
  };
}

export async function cancelConsultationAction(
  _prevState: ConsultationActionState,
  formData: FormData
): Promise<ConsultationActionState> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const slug = String(formData.get("slug") || "").trim();
  const consultationPublicId = String(
    formData.get("consultationPublicId") || ""
  ).trim();
  const cancelReason = String(formData.get("cancelReason") || "").trim() || undefined;

  if (!slug || !consultationPublicId) {
    return { success: false, error: "Identificador da consulta não fornecido." };
  }

  const result = await cancelConsultation({
    actorUserId: session.userId,
    consultancySlug: slug,
    consultationPublicId,
    cancelReason,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    consultationPublicId: result.consultation.publicId,
    message: "Consulta cancelada com sucesso.",
  };
}
