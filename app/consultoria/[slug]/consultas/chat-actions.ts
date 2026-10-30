"use server";

import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import { revalidatePath } from "next/cache";
import type { RowDataPacket } from "mysql2/promise";
import { getDbPool } from "@/lib/db/mysql";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { getPlatformAdminAccess } from "@/lib/platform-admin/access";
import {
  sendChatMessage,
  markChatMessagesAsRead,
  updateChatConsultationStatus,
  refreshAiAnamnesisForConsultation,
  confirmAiAnamnesisProposal,
  getOrCreateChatConsultation,
  getChatConsultationByPublicId,
  proposeChatConsultation,
  respondToChatProposal,
  cancelChatConsultation,
  closeChatConsultation,
  savePrivateNotes,
  requestReturnConsultation,
  generateAiConsultationSummary,
  generateAiProntuarioNotes,
  generateAiPendingQuestions,
  hideConsultationFromUser,
  restoreConsultationForUser,
  type ChatConsultationStatus,
  type ChatMessageType,
} from "@/lib/consultancies/trevo-chat";
import { validateChatAttachmentBuffer } from "@/lib/storage/chat-attachment-validator";
import { getPrivateStorageRoot, resolveSafeStoragePath } from "@/lib/storage/private-files";

export interface ActionResult<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

/**
 * Sends a message in Trevo Chat with optional media attachment (image, audio, video, document).
 */
export async function sendChatMessageAction(
  consultancySlug: string,
  chatPublicId: string,
  formData: FormData
): Promise<ActionResult> {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return { ok: false, error: "Não autenticado." };
    }

    const context = await resolveConsultancyContext(session.userId, consultancySlug);
    if (!context) {
      return { ok: false, error: "Consultoria não encontrada." };
    }

    const chat = await getChatConsultationByPublicId(context.consultancyId, chatPublicId);
    if (!chat) {
      return { ok: false, error: "Atendimento não encontrado." };
    }

    // Role check
    const isStudent = context.membershipId === chat.studentMembershipId;
    const isProf = context.membershipId === chat.professionalMembershipId;
    const { isPlatformAdmin } = await getPlatformAdminAccess(session.userId);
    const isAdmin = context.roles.includes("CONSULTANCY_ADMIN") || isPlatformAdmin;

    if (!isStudent && !isProf && !isAdmin) {
      return { ok: false, error: "Acesso não autorizado para esta conversa." };
    }

    const senderRole = isStudent ? "STUDENT" : isProf ? chat.professionalType : "ADMIN";

    const contentRaw = formData.get("content");
    const content = typeof contentRaw === "string" ? contentRaw.trim() : "";

    const rawMessageType = formData.get("messageType");
    const VALID_MESSAGE_TYPES = [
      "TEXT",
      "IMAGE",
      "AUDIO",
      "VIDEO",
      "DOCUMENT",
      "FORM_REQUEST",
      "PHOTO_REQUEST",
      "DOCUMENT_REQUEST",
      "CLINICAL_GUIDANCE",
      "WORKOUT_CARD",
      "MEAL_PLAN_CARD",
      "CLOSURE_CARD",
    ];

    let messageType: ChatMessageType =
      typeof rawMessageType === "string" && VALID_MESSAGE_TYPES.includes(rawMessageType)
        ? (rawMessageType as ChatMessageType)
        : "TEXT";

    const clientMessageId = formData.get("clientMessageId") ? String(formData.get("clientMessageId")) : undefined;
    const replyToMessageIdRaw = formData.get("replyToMessageId");
    const replyToMessageId = replyToMessageIdRaw ? Number(replyToMessageIdRaw) : undefined;

    const payloadJsonRaw = formData.get("payloadJson");
    let payloadJson: Record<string, unknown> | undefined = undefined;
    if (payloadJsonRaw && typeof payloadJsonRaw === "string") {
      try {
        payloadJson = JSON.parse(payloadJsonRaw);
      } catch {}
    }

    const audioDurationRaw = formData.get("audioDurationSeconds");
    const audioDurationSeconds = audioDurationRaw ? Number(audioDurationRaw) : undefined;

    let attachmentUrl: string | null = null;
    let attachmentName: string | null = null;
    let attachmentSizeBytes: number | null = null;
    let attachmentMimeType: string | null = null;

    const file = formData.get("file");
    if (file && file instanceof File && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const validation = validateChatAttachmentBuffer(buffer, file.type);
      if (!validation.valid) {
        return { ok: false, error: validation.error || "Arquivo inválido ou não suportado." };
      }

      if (validation.category) {
        messageType = validation.category;
      }

      const storageRoot = getPrivateStorageRoot();
      const fileExt = validation.extension || path.extname(file.name) || ".bin";
      const fileKey = path.join("chat", `${context.consultancyId}`, `${crypto.randomUUID()}${fileExt}`);
      const fullPath = resolveSafeStoragePath(storageRoot, fileKey);

      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, buffer);

      attachmentUrl = fileKey;
      attachmentName = file.name ? file.name.slice(0, 255) : `anexo${fileExt}`;
      attachmentSizeBytes = buffer.length;
      attachmentMimeType = validation.mimeType || file.type || "application/octet-stream";
    }

    if (!content && !attachmentUrl && !payloadJson) {
      return { ok: false, error: "A mensagem não pode ser vazia." };
    }

    const inserted = await sendChatMessage({
      consultancyId: context.consultancyId,
      consultationPublicId: chatPublicId,
      senderUserId: session.userId,
      senderRole,
      content: content || null,
      messageType,
      clientMessageId,
      replyToMessageId,
      payloadJson,
      attachmentUrl,
      attachmentName,
      attachmentSizeBytes,
      attachmentMimeType,
      audioDurationSeconds,
      consultancySlug,
    });

    revalidatePath(`/consultoria/${consultancySlug}/consultas`);
    return { ok: true, data: inserted };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro ao enviar mensagem.";
    console.error("[sendChatMessageAction] Error:", err);
    return { ok: false, error: errorMsg };
  }
}

/**
 * Marks messages in a chat consultation as read for current user.
 */
export async function markChatReadAction(
  consultancySlug: string,
  chatPublicId: string
): Promise<ActionResult> {
  try {
    const session = await getCurrentSession();
    if (!session) return { ok: false, error: "Não autenticado." };

    const context = await resolveConsultancyContext(session.userId, consultancySlug);
    if (!context) return { ok: false, error: "Consultoria não encontrada." };

    const isProfessional =
      context.roles.includes("PERSONAL") ||
      context.roles.includes("NUTRITIONIST") ||
      context.roles.includes("CONSULTANCY_ADMIN");

    await markChatMessagesAsRead(context.consultancyId, chatPublicId, session.userId, isProfessional);
    return { ok: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro ao marcar como lido.";
    return { ok: false, error: errorMsg };
  }
}

/**
 * Updates status of a consultation.
 */
export async function updateChatStatusAction(
  consultancySlug: string,
  chatPublicId: string,
  status: ChatConsultationStatus
): Promise<ActionResult> {
  try {
    const session = await getCurrentSession();
    if (!session) return { ok: false, error: "Não autenticado." };

    const context = await resolveConsultancyContext(session.userId, consultancySlug);
    if (!context) return { ok: false, error: "Consultoria não encontrada." };

    const updated = await updateChatConsultationStatus(context.consultancyId, chatPublicId, status);
    revalidatePath(`/consultoria/${consultancySlug}/consultas`);
    return { ok: updated };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro ao atualizar status.";
    return { ok: false, error: errorMsg };
  }
}

/**
 * Refreshes the AI Anamnesis extraction from conversation messages.
 */
export async function refreshAiAnamnesisAction(
  consultancySlug: string,
  chatPublicId: string
): Promise<ActionResult> {
  try {
    const session = await getCurrentSession();
    if (!session) return { ok: false, error: "Não autenticado." };

    const context = await resolveConsultancyContext(session.userId, consultancySlug);
    if (!context) return { ok: false, error: "Consultoria não encontrada." };

    const { isPlatformAdmin } = await getPlatformAdminAccess(session.userId);
    const isAuthorized =
      context.roles.includes("PERSONAL") ||
      context.roles.includes("NUTRITIONIST") ||
      context.roles.includes("CONSULTANCY_ADMIN") ||
      isPlatformAdmin;

    if (!isAuthorized) {
      return { ok: false, error: "Apenas profissionais podem solicitar organização de anamnese." };
    }

    const proposal = await refreshAiAnamnesisForConsultation(context.consultancyId, chatPublicId);
    revalidatePath(`/consultoria/${consultancySlug}/consultas`);
    return { ok: true, data: proposal };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro ao extrair anamnese.";
    return { ok: false, error: errorMsg };
  }
}

/**
 * Professional confirms the AI Anamnesis proposal.
 */
export async function confirmAiAnamnesisAction(
  consultancySlug: string,
  chatPublicId: string,
  confirmedData: Record<string, unknown>,
  reviewerNotes?: string
): Promise<ActionResult> {
  try {
    const session = await getCurrentSession();
    if (!session) return { ok: false, error: "Não autenticado." };

    const context = await resolveConsultancyContext(session.userId, consultancySlug);
    if (!context) return { ok: false, error: "Consultoria não encontrada." };

    const { isPlatformAdmin } = await getPlatformAdminAccess(session.userId);
    const isAuthorized =
      context.roles.includes("PERSONAL") ||
      context.roles.includes("NUTRITIONIST") ||
      context.roles.includes("CONSULTANCY_ADMIN") ||
      isPlatformAdmin;

    if (!isAuthorized) {
      return { ok: false, error: "Apenas profissionais podem confirmar anamnese." };
    }

    const res = await confirmAiAnamnesisProposal({
      consultancyId: context.consultancyId,
      consultationPublicId: chatPublicId,
      professionalUserId: session.userId,
      confirmedResponses: confirmedData,
      reviewerNotes,
    });

    if (!res.success) {
      return { ok: false, error: res.error || "Erro ao salvar anamnese confirmada." };
    }

    revalidatePath(`/consultoria/${consultancySlug}/consultas`);
    return { ok: true, data: res };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro ao confirmar anamnese.";
    return { ok: false, error: errorMsg };
  }
}

/**
 * Starts or opens a consultation with a student.
 */
export async function startOrOpenChatAction(
  consultancySlug: string,
  studentMembershipId: number,
  professionalType: "PERSONAL" | "NUTRITIONIST",
  title?: string
): Promise<ActionResult> {
  try {
    const session = await getCurrentSession();
    if (!session) return { ok: false, error: "Não autenticado." };

    const context = await resolveConsultancyContext(session.userId, consultancySlug);
    if (!context) return { ok: false, error: "Consultoria não encontrada." };

    const chat = await getOrCreateChatConsultation({
      consultancyId: context.consultancyId,
      studentMembershipId,
      professionalMembershipId: context.membershipId,
      professionalType,
      title,
      createdByUserId: session.userId,
    });

    revalidatePath(`/consultoria/${consultancySlug}/consultas`);
    return { ok: true, data: chat };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro ao abrir atendimento.";
    return { ok: false, error: errorMsg };
  }
}

/**
 * Proposes a new bilateral chat consultation with a reference date and time.
 */
export async function proposeChatConsultationAction(
  consultancySlug: string,
  params: {
    studentMembershipId?: number;
    professionalMembershipId?: number;
    professionalType?: "PERSONAL" | "NUTRITIONIST";
    referenceDate: string;
    referenceTime: string;
    title?: string;
    expectedResponseHours?: number;
    initialMessage?: string;
    linkedPreviousConsultationId?: number;
  }
): Promise<ActionResult> {
  try {
    const session = await getCurrentSession();
    if (!session) return { ok: false, error: "Não autenticado." };

    const context = await resolveConsultancyContext(session.userId, consultancySlug);
    if (!context) return { ok: false, error: "Consultoria não encontrada." };

    const isStudent = context.roles.includes("STUDENT");
    const isPersonal = context.roles.includes("PERSONAL");
    const isNutritionist = context.roles.includes("NUTRITIONIST");

    let studentMemId = params.studentMembershipId;
    let profMemId = params.professionalMembershipId;
    let profType = params.professionalType || "PERSONAL";

    if (isStudent) {
      studentMemId = context.membershipId;
      if (!profMemId) {
        return { ok: false, error: "Profissional não especificado para o agendamento." };
      }
    } else if (isPersonal || isNutritionist) {
      profMemId = context.membershipId;
      profType = isPersonal ? "PERSONAL" : "NUTRITIONIST";
      if (!studentMemId) {
        return { ok: false, error: "Selecione um aluno para propor o agendamento." };
      }
    } else {
      return { ok: false, error: "Perfil não autorizado para propor consultas." };
    }

    if (!params.referenceDate || !params.referenceTime) {
      return { ok: false, error: "Informe a data e o horário de referência para a agenda." };
    }

    const proposedDate = new Date(`${params.referenceDate}T${params.referenceTime}:00`);
    if (isNaN(proposedDate.getTime())) {
      return { ok: false, error: "Data ou horário inválido." };
    }

    const chat = await proposeChatConsultation({
      consultancyId: context.consultancyId,
      studentMembershipId: studentMemId,
      professionalMembershipId: profMemId,
      professionalType: profType,
      proposedByUserId: session.userId,
      proposedStartAt: proposedDate,
      title: params.title,
      expectedResponseHours: params.expectedResponseHours || 24,
      initialMessage: params.initialMessage,
      linkedPreviousConsultationId: params.linkedPreviousConsultationId,
      consultancySlug,
    });

    revalidatePath(`/consultoria/${consultancySlug}/consultas`);
    return { ok: true, data: chat };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro ao propor agendamento.";
    return { ok: false, error: errorMsg };
  }
}

/**
 * Responds to a bilateral chat proposal (ACCEPT, COUNTER, DECLINE).
 */
export async function respondToChatProposalAction(
  consultancySlug: string,
  chatPublicId: string,
  response: "ACCEPT" | "COUNTER" | "DECLINE",
  counterDetails?: {
    date: string;
    time: string;
  },
  declineReason?: string
): Promise<ActionResult> {
  try {
    const session = await getCurrentSession();
    if (!session) return { ok: false, error: "Não autenticado." };

    const context = await resolveConsultancyContext(session.userId, consultancySlug);
    if (!context) return { ok: false, error: "Consultoria não encontrada." };

    let counterDate: Date | undefined = undefined;
    if (response === "COUNTER") {
      if (!counterDetails?.date || !counterDetails?.time) {
        return { ok: false, error: "Informe a nova data e horário sugeridos." };
      }
      counterDate = new Date(`${counterDetails.date}T${counterDetails.time}:00`);
      if (isNaN(counterDate.getTime())) {
        return { ok: false, error: "Data ou horário inválido." };
      }
    }

    const result = await respondToChatProposal({
      consultancyId: context.consultancyId,
      consultationPublicId: chatPublicId,
      responderUserId: session.userId,
      response,
      counterProposedStartAt: counterDate,
      declineReason,
      consultancySlug,
    });

    if (!result.ok) {
      return { ok: false, error: result.error || "Erro ao responder à proposta." };
    }

    revalidatePath(`/consultoria/${consultancySlug}/consultas`);
    return { ok: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro ao responder à proposta.";
    return { ok: false, error: errorMsg };
  }
}

/**
 * Cancels a proposed or confirmed chat consultation.
 */
export async function cancelChatConsultationAction(
  consultancySlug: string,
  chatPublicId: string
): Promise<ActionResult> {
  try {
    const session = await getCurrentSession();
    if (!session) return { ok: false, error: "Não autenticado." };

    const context = await resolveConsultancyContext(session.userId, consultancySlug);
    if (!context) return { ok: false, error: "Consultoria não encontrada." };

    const result = await cancelChatConsultation({
      consultancyId: context.consultancyId,
      consultationPublicId: chatPublicId,
      userId: session.userId,
    });

    if (!result.ok) {
      return { ok: false, error: result.error || "Erro ao cancelar atendimento." };
    }

    revalidatePath(`/consultoria/${consultancySlug}/consultas`);
    return { ok: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro ao cancelar atendimento.";
    return { ok: false, error: errorMsg };
  }
}

/**
 * Formally closes a chat consultation with summary, orientations, prescriptions,
 * return prediction and professional private notes.
 */
export async function closeChatConsultationAction(
  consultancySlug: string,
  chatPublicId: string,
  data: {
    summary: string;
    orientations?: string[];
    prescriptions?: string[];
    returnPredictionDays?: number | null;
    privateNotes?: string | null;
  }
): Promise<ActionResult> {
  try {
    const session = await getCurrentSession();
    if (!session) return { ok: false, error: "Não autenticado." };

    const context = await resolveConsultancyContext(session.userId, consultancySlug);
    if (!context) return { ok: false, error: "Consultoria não encontrada." };

    const isAuthorized =
      context.roles.includes("PERSONAL") ||
      context.roles.includes("NUTRITIONIST") ||
      context.roles.includes("CONSULTANCY_ADMIN");

    if (!isAuthorized) {
      return { ok: false, error: "Apenas profissionais podem finalizar consultas." };
    }

    if (!data.summary || !data.summary.trim()) {
      return { ok: false, error: "O resumo do encerramento é obrigatório." };
    }

    const closed = await closeChatConsultation({
      consultancyId: context.consultancyId,
      consultationPublicId: chatPublicId,
      professionalUserId: session.userId,
      summary: data.summary,
      orientations: data.orientations,
      prescriptions: data.prescriptions,
      returnPredictionDays: data.returnPredictionDays,
      privateNotes: data.privateNotes,
      consultancySlug,
    });

    revalidatePath(`/consultoria/${consultancySlug}/consultas`);
    return { ok: true, data: closed };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro ao finalizar consulta.";
    return { ok: false, error: errorMsg };
  }
}

/**
 * Saves private notes for the professional. Private notes are strictly private and never leaked.
 */
export async function savePrivateNotesAction(
  consultancySlug: string,
  chatPublicId: string,
  notes: string
): Promise<ActionResult> {
  try {
    const session = await getCurrentSession();
    if (!session) return { ok: false, error: "Não autenticado." };

    const context = await resolveConsultancyContext(session.userId, consultancySlug);
    if (!context) return { ok: false, error: "Consultoria não encontrada." };

    const isAuthorized =
      context.roles.includes("PERSONAL") ||
      context.roles.includes("NUTRITIONIST") ||
      context.roles.includes("CONSULTANCY_ADMIN");

    if (!isAuthorized) {
      return { ok: false, error: "Apenas profissionais podem registrar notas privadas." };
    }

    await savePrivateNotes({
      consultancyId: context.consultancyId,
      consultationPublicId: chatPublicId,
      professionalUserId: session.userId,
      notes,
    });

    revalidatePath(`/consultoria/${consultancySlug}/consultas`);
    return { ok: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro ao salvar notas privadas.";
    return { ok: false, error: errorMsg };
  }
}

/**
 * Requests a return consultation linked to a previous consultation.
 */
export async function requestReturnConsultationAction(
  consultancySlug: string,
  previousChatPublicId: string,
  params: {
    referenceDate: string;
    referenceTime: string;
    title?: string;
    expectedResponseHours?: number;
  }
): Promise<ActionResult> {
  try {
    const session = await getCurrentSession();
    if (!session) return { ok: false, error: "Não autenticado." };

    const context = await resolveConsultancyContext(session.userId, consultancySlug);
    if (!context) return { ok: false, error: "Consultoria não encontrada." };

    const created = await requestReturnConsultation({
      consultancyId: context.consultancyId,
      previousConsultationPublicId: previousChatPublicId,
      requestedByUserId: session.userId,
      referenceDate: params.referenceDate,
      referenceTime: params.referenceTime,
      title: params.title,
      expectedResponseHours: params.expectedResponseHours || 24,
      consultancySlug,
    });

    revalidatePath(`/consultoria/${consultancySlug}/consultas`);
    return { ok: true, data: created };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro ao agendar retorno.";
    return { ok: false, error: errorMsg };
  }
}

/**
 * On-Demand AI Action: Generates summary of consultation messages.
 * Only runs upon professional request.
 */
export async function generateAiSummaryAction(
  consultancySlug: string,
  chatPublicId: string
): Promise<ActionResult> {
  try {
    const session = await getCurrentSession();
    if (!session) return { ok: false, error: "Não autenticado." };

    const context = await resolveConsultancyContext(session.userId, consultancySlug);
    if (!context) return { ok: false, error: "Consultoria não encontrada." };

    const isAuthorized =
      context.roles.includes("PERSONAL") ||
      context.roles.includes("NUTRITIONIST") ||
      context.roles.includes("CONSULTANCY_ADMIN");

    if (!isAuthorized) {
      return { ok: false, error: "Apenas profissionais podem solicitar resumo com IA." };
    }

    const summary = await generateAiConsultationSummary(context.consultancyId, chatPublicId);
    return { ok: true, data: summary };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro ao gerar resumo com IA.";
    return { ok: false, error: errorMsg };
  }
}

/**
 * On-Demand AI Action: Generates SOAP format clinical notes.
 * Only runs upon professional request.
 */
export async function generateAiSoapAction(
  consultancySlug: string,
  chatPublicId: string
): Promise<ActionResult> {
  try {
    const session = await getCurrentSession();
    if (!session) return { ok: false, error: "Não autenticado." };

    const context = await resolveConsultancyContext(session.userId, consultancySlug);
    if (!context) return { ok: false, error: "Consultoria não encontrada." };

    const isAuthorized =
      context.roles.includes("PERSONAL") ||
      context.roles.includes("NUTRITIONIST") ||
      context.roles.includes("CONSULTANCY_ADMIN");

    if (!isAuthorized) {
      return { ok: false, error: "Apenas profissionais podem gerar notas SOAP." };
    }

    const soap = await generateAiProntuarioNotes(context.consultancyId, chatPublicId);
    return { ok: true, data: soap };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro ao estruturar SOAP.";
    return { ok: false, error: errorMsg };
  }
}

/**
 * On-Demand AI Action: Detects unanswered questions in the conversation.
 */
export async function generateAiQuestionsAction(
  consultancySlug: string,
  chatPublicId: string
): Promise<ActionResult> {
  try {
    const session = await getCurrentSession();
    if (!session) return { ok: false, error: "Não autenticado." };

    const context = await resolveConsultancyContext(session.userId, consultancySlug);
    if (!context) return { ok: false, error: "Consultoria não encontrada." };

    const questions = await generateAiPendingQuestions(context.consultancyId, chatPublicId);
    return { ok: true, data: questions };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro ao verificar perguntas pendentes.";
    return { ok: false, error: errorMsg };
  }
}

/**
 * Excludes a consultation from the user's personal list ("Excluir da minha lista").
 * Preserves the consultation, messages, and access for the counterpart.
 */
export async function hideConsultationAction(
  consultancySlug: string,
  targetType: "CHAT" | "LEGACY_VIDEO",
  targetPublicId: string
): Promise<ActionResult> {
  try {
    const session = await getCurrentSession();
    if (!session) return { ok: false, error: "Não autenticado." };

    const context = await resolveConsultancyContext(session.userId, consultancySlug);
    if (!context) return { ok: false, error: "Consultoria não encontrada." };

    // Validate ownership/participation in the consultation
    const pool = getDbPool();
    if (targetType === "CHAT") {
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT student_membership_id, professional_membership_id
         FROM chat_consultations
         WHERE public_id = ? AND consultancy_id = ?
         LIMIT 1;`,
        [targetPublicId, context.consultancyId]
      );
      if (!rows || rows.length === 0) {
        return { ok: false, error: "Atendimento não encontrado." };
      }
      const chatRow = rows[0] as { student_membership_id: number; professional_membership_id: number };
      const isParticipant =
        Number(context.membershipId) === Number(chatRow.student_membership_id) ||
        Number(context.membershipId) === Number(chatRow.professional_membership_id) ||
        context.roles.includes("CONSULTANCY_ADMIN");

      if (!isParticipant) {
        return { ok: false, error: "Acesso não autorizado para esta conversa." };
      }
    } else {
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT student_membership_id, professional_membership_id
         FROM consultations
         WHERE public_id = ? AND consultancy_id = ?
         LIMIT 1;`,
        [targetPublicId, context.consultancyId]
      );
      if (!rows || rows.length === 0) {
        return { ok: false, error: "Consulta anterior não encontrada." };
      }
      const consRow = rows[0] as { student_membership_id: number; professional_membership_id: number };
      const isParticipant =
        Number(context.membershipId) === Number(consRow.student_membership_id) ||
        Number(context.membershipId) === Number(consRow.professional_membership_id) ||
        context.roles.includes("CONSULTANCY_ADMIN");

      if (!isParticipant) {
        return { ok: false, error: "Acesso não autorizado para esta consulta." };
      }
    }

    await hideConsultationFromUser(
      context.consultancyId,
      session.userId,
      context.membershipId,
      targetType,
      targetPublicId
    );

    revalidatePath(`/consultoria/${consultancySlug}/consultas`);
    return { ok: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro ao excluir conversa da lista.";
    return { ok: false, error: errorMsg };
  }
}

/**
 * Restores an excluded consultation back to the user's personal list.
 */
export async function restoreConsultationAction(
  consultancySlug: string,
  targetType: "CHAT" | "LEGACY_VIDEO",
  targetPublicId: string
): Promise<ActionResult> {
  try {
    const session = await getCurrentSession();
    if (!session) return { ok: false, error: "Não autenticado." };

    const context = await resolveConsultancyContext(session.userId, consultancySlug);
    if (!context) return { ok: false, error: "Consultoria não encontrada." };

    // Validate ownership/participation in the consultation
    const pool = getDbPool();
    if (targetType === "CHAT") {
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT student_membership_id, professional_membership_id
         FROM chat_consultations
         WHERE public_id = ? AND consultancy_id = ?
         LIMIT 1;`,
        [targetPublicId, context.consultancyId]
      );
      if (rows && rows.length > 0) {
        const chatRow = rows[0] as { student_membership_id: number; professional_membership_id: number };
        const isParticipant =
          Number(context.membershipId) === Number(chatRow.student_membership_id) ||
          Number(context.membershipId) === Number(chatRow.professional_membership_id) ||
          context.roles.includes("CONSULTANCY_ADMIN");

        if (!isParticipant) {
          return { ok: false, error: "Acesso não autorizado para esta conversa." };
        }
      }
    } else {
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT student_membership_id, professional_membership_id
         FROM consultations
         WHERE public_id = ? AND consultancy_id = ?
         LIMIT 1;`,
        [targetPublicId, context.consultancyId]
      );
      if (rows && rows.length > 0) {
        const consRow = rows[0] as { student_membership_id: number; professional_membership_id: number };
        const isParticipant =
          Number(context.membershipId) === Number(consRow.student_membership_id) ||
          Number(context.membershipId) === Number(consRow.professional_membership_id) ||
          context.roles.includes("CONSULTANCY_ADMIN");

        if (!isParticipant) {
          return { ok: false, error: "Acesso não autorizado para esta consulta." };
        }
      }
    }

    await restoreConsultationForUser(
      context.consultancyId,
      session.userId,
      targetType,
      targetPublicId
    );

    revalidatePath(`/consultoria/${consultancySlug}/consultas`);
    return { ok: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro ao restaurar conversa na lista.";
    return { ok: false, error: errorMsg };
  }
}

