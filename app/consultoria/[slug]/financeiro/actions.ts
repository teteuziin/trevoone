"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import {
  saveConsultancyFinanceSettings,
  createStudentCharge,
  cancelStudentCharge,
  searchConsultancyStudents,
  parseBrlToCents,
  type PixKeyType,
  type StudentSearchItem,
} from "@/lib/consultancies/finance";

export type ActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  chargePublicId?: string;
};

export async function saveFinanceSettingsAction(
  slug: string,
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context || !context.roles.includes("CONSULTANCY_ADMIN")) {
    return { success: false, error: "Acesso não autorizado para gerenciar finanças." };
  }

  const pixKeyType = String(formData.get("pixKeyType") || "") as PixKeyType;
  const pixKey = String(formData.get("pixKey") || "");
  const pixReceiverName = String(formData.get("pixReceiverName") || "");
  const paymentInstructions = formData.get("paymentInstructions")
    ? String(formData.get("paymentInstructions"))
    : null;
  const billingTimezone = String(formData.get("billingTimezone") || "America/Sao_Paulo");

  const result = await saveConsultancyFinanceSettings({
    consultancyId: context.consultancyId,
    userId: session.userId,
    pixKeyType,
    pixKey,
    pixReceiverName,
    paymentInstructions,
    billingTimezone,
  });

  if (!result.success) {
    return { success: false, error: result.error || "Não foi possível salvar as configurações." };
  }

  revalidatePath(`/consultoria/${slug}/financeiro`);
  return { success: true, message: "Configurações Pix salvas com sucesso!" };
}

export async function searchStudentsAction(
  slug: string,
  query: string
): Promise<StudentSearchItem[]> {
  const session = await getCurrentSession();
  if (!session) {
    return [];
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context || !context.roles.includes("CONSULTANCY_ADMIN")) {
    return [];
  }

  return searchConsultancyStudents({
    consultancyId: context.consultancyId,
    query,
    limit: 20,
  });
}

export async function createStudentChargeAction(
  slug: string,
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context || !context.roles.includes("CONSULTANCY_ADMIN")) {
    return { success: false, error: "Acesso não autorizado para criar cobranças." };
  }

  const studentMembershipPublicId = String(formData.get("studentMembershipPublicId") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const description = formData.get("description") ? String(formData.get("description")).trim() : null;
  const amountBrl = String(formData.get("amountBrl") || "").trim();
  const dueOn = String(formData.get("dueOn") || "").trim();
  const referencePeriodStart = formData.get("referencePeriodStart")
    ? String(formData.get("referencePeriodStart")).trim()
    : null;
  const referencePeriodEnd = formData.get("referencePeriodEnd")
    ? String(formData.get("referencePeriodEnd")).trim()
    : null;
  const blocksAccess = formData.get("blocksAccess") === "true" || formData.get("blocksAccess") === "on";

  if (!studentMembershipPublicId) {
    return { success: false, error: "Selecione um aluno para a cobrança." };
  }

  const parseResult = parseBrlToCents(amountBrl);
  if (!parseResult.valid || !parseResult.cents) {
    return { success: false, error: parseResult.error || "Valor da cobrança inválido." };
  }

  const result = await createStudentCharge({
    consultancyId: context.consultancyId,
    userId: session.userId,
    studentMembershipPublicId,
    title,
    description: description || null,
    amountCents: parseResult.cents,
    dueOn,
    referencePeriodStart: referencePeriodStart || null,
    referencePeriodEnd: referencePeriodEnd || null,
    blocksAccess,
  });

  if (!result.success || !result.chargePublicId) {
    return { success: false, error: result.error || "Não foi possível criar a cobrança." };
  }

  revalidatePath(`/consultoria/${slug}/financeiro`);
  return { success: true, chargePublicId: result.chargePublicId };
}

export async function cancelStudentChargeAction(
  slug: string,
  chargePublicId: string,
  cancelReason?: string
): Promise<ActionState> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context || !context.roles.includes("CONSULTANCY_ADMIN")) {
    return { success: false, error: "Acesso não autorizado para cancelar cobranças." };
  }

  const result = await cancelStudentCharge({
    consultancyId: context.consultancyId,
    userId: session.userId,
    chargePublicId,
    cancelReason: cancelReason?.trim() || null,
  });

  if (!result.success) {
    return { success: false, error: result.error || "Não foi possível cancelar a cobrança." };
  }

  revalidatePath(`/consultoria/${slug}/financeiro`);
  revalidatePath(`/consultoria/${slug}/financeiro/cobrancas/${chargePublicId}`);
  return { success: true, message: "Cobrança cancelada com sucesso." };
}
