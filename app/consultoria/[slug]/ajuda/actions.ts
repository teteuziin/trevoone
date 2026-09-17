"use server";

import { getCurrentSession } from "@/lib/auth/session";
import {
  sendStudentSupportMessage,
  type SupportRole,
} from "@/lib/consultancies/support";

export interface SendSupportMessageActionInput {
  recipientMembershipPublicId?: string;
  targetRole?: SupportRole;
  subject: string;
  message: string;
}

export interface SendSupportMessageActionResult {
  success: boolean;
  recipientName?: string;
  recipientRoleLabel?: string;
  error?: string;
}

export async function sendSupportMessageAction(
  consultancySlug: string,
  input: SendSupportMessageActionInput
): Promise<SendSupportMessageActionResult> {
  const session = await getCurrentSession();

  if (!session) {
    return {
      success: false,
      error: "Sua sessão expirou. Faça login novamente.",
    };
  }

  try {
    const result = await sendStudentSupportMessage({
      studentUserId: session.userId,
      consultancySlug,
      recipientMembershipPublicId: input.recipientMembershipPublicId,
      targetRole: input.targetRole,
      subject: input.subject,
      message: input.message,
    });

    return {
      success: true,
      recipientName: result.recipientName,
      recipientRoleLabel: result.recipientRoleLabel,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";

    if (message === "NOT_AUTHORIZED_STUDENT") {
      return {
        success: false,
        error: "Você não possui permissão para enviar mensagens nesta consultoria.",
      };
    }
    if (message === "NO_ACTIVE_ADMIN_AVAILABLE") {
      return {
        success: false,
        error: "Não há administradores ativos na consultoria para receber solicitações no momento.",
      };
    }
    if (message === "SUBJECT_INVALID") {
      return {
        success: false,
        error: "O assunto deve ter entre 3 e 120 caracteres.",
      };
    }
    if (message === "MESSAGE_INVALID") {
      return {
        success: false,
        error: "A mensagem deve ter entre 5 e 1000 caracteres.",
      };
    }

    return {
      success: false,
      error: "Não foi possível enviar a solicitação no momento. Tente novamente.",
    };
  }
}
