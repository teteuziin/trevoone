"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { parseConsultancyLocalDateTime } from "@/lib/consultancies/timezone";
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

  // Supports both (date + startTime + endTime) local inputs and (scheduledStartAt + scheduledEndAt) ISO strings
  const dateStr = String(formData.get("date") || "").trim();
  const startTimeStr = String(formData.get("startTime") || "").trim();
  const endTimeStr = String(formData.get("endTime") || "").trim();
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

  let scheduledStartAt: Date;
  let scheduledEndAt: Date;

  if (dateStr && startTimeStr && endTimeStr) {
    const context = await resolveConsultancyContext(session.userId, slug);
    if (!context) {
      return { success: false, error: "Consultoria não encontrada." };
    }
    const timezone = context.consultancyTimezone || "America/Sao_Paulo";
    const parsedStart = parseConsultancyLocalDateTime(timezone, dateStr, startTimeStr);
    const parsedEnd = parseConsultancyLocalDateTime(timezone, dateStr, endTimeStr);

    if (!parsedStart.success) {
      return { success: false, error: `Horário inicial inválido: ${parsedStart.error}` };
    }
    if (!parsedEnd.success) {
      return { success: false, error: `Horário final inválido: ${parsedEnd.error}` };
    }

    scheduledStartAt = parsedStart.dateUtc;
    scheduledEndAt = parsedEnd.dateUtc;
  } else if (rawStartAt && rawEndAt) {
    scheduledStartAt = new Date(rawStartAt);
    scheduledEndAt = new Date(rawEndAt);
  } else {
    return { success: false, error: "Informe a data e os horários de início e término da consulta." };
  }

  if (isNaN(scheduledStartAt.getTime()) || isNaN(scheduledEndAt.getTime())) {
    return { success: false, error: "Formato de data/hora inválido." };
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

  revalidatePath(`/consultoria/${slug}/consultas`);

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

  const dateStr = String(formData.get("date") || "").trim();
  const startTimeStr = String(formData.get("startTime") || "").trim();
  const endTimeStr = String(formData.get("endTime") || "").trim();
  const rawStartAt = String(formData.get("scheduledStartAt") || "").trim();
  const rawEndAt = String(formData.get("scheduledEndAt") || "").trim();

  if (!slug || !consultationPublicId) {
    return { success: false, error: "Identificador da consulta não fornecido." };
  }

  let scheduledStartAt: Date;
  let scheduledEndAt: Date;

  if (dateStr && startTimeStr && endTimeStr) {
    const context = await resolveConsultancyContext(session.userId, slug);
    if (!context) {
      return { success: false, error: "Consultoria não encontrada." };
    }
    const timezone = context.consultancyTimezone || "America/Sao_Paulo";
    const parsedStart = parseConsultancyLocalDateTime(timezone, dateStr, startTimeStr);
    const parsedEnd = parseConsultancyLocalDateTime(timezone, dateStr, endTimeStr);

    if (!parsedStart.success) {
      return { success: false, error: `Novo horário inicial inválido: ${parsedStart.error}` };
    }
    if (!parsedEnd.success) {
      return { success: false, error: `Novo horário final inválido: ${parsedEnd.error}` };
    }

    scheduledStartAt = parsedStart.dateUtc;
    scheduledEndAt = parsedEnd.dateUtc;
  } else if (rawStartAt && rawEndAt) {
    scheduledStartAt = new Date(rawStartAt);
    scheduledEndAt = new Date(rawEndAt);
  } else {
    return { success: false, error: "Informe a nova data e os horários de início e término." };
  }

  if (isNaN(scheduledStartAt.getTime()) || isNaN(scheduledEndAt.getTime())) {
    return { success: false, error: "Formato de data/hora inválido." };
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

  revalidatePath(`/consultoria/${slug}/consultas`);

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

  revalidatePath(`/consultoria/${slug}/consultas`);

  return {
    success: true,
    consultationPublicId: result.consultation.publicId,
    message: "Consulta cancelada com sucesso.",
  };
}

