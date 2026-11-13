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
import {
  saveInfinitePaySettings,
  createConsultancyPlan,
  toggleConsultancyPlanStatus,
  createPlanChargeForStudent,
} from "@/lib/infinitepay/service";
import type { PlanPaymentMethods } from "@/lib/infinitepay/types";

export type ActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  chargePublicId?: string;
  checkoutUrl?: string;
  whatsAppHref?: string;
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
  const isStaff =
    context &&
    (context.roles.includes("CONSULTANCY_ADMIN") ||
      context.roles.includes("PERSONAL"));
  if (!context || !isStaff) {
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
  const isStaff =
    context &&
    (context.roles.includes("CONSULTANCY_ADMIN") ||
      context.roles.includes("PERSONAL"));
  if (!context || !isStaff) {
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
    return { success: false, error: "Apenas administradores da consultoria podem cancelar cobranças." };
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

export async function saveInfinitePaySettingsAction(
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
    return { success: false, error: "Acesso não autorizado para configurar InfinitePay." };
  }

  const handle = String(formData.get("handle") || "").trim();
  const apiKey = formData.get("apiKey") ? String(formData.get("apiKey")).trim() : undefined;
  const enabled = formData.get("enabled") === "true" || formData.get("enabled") === "on";
  const environment = (formData.get("environment") as "SIMULATION" | "PRODUCTION") || "SIMULATION";

  const result = await saveInfinitePaySettings({
    consultancyId: context.consultancyId,
    userId: session.userId,
    handle,
    apiKey,
    enabled,
    environment,
  });

  if (!result.success) {
    return { success: false, error: result.error || "Não foi possível salvar as configurações da InfinitePay." };
  }

  revalidatePath(`/consultoria/${slug}/financeiro`);
  return { success: true, message: "Configurações da InfinitePay salvas com sucesso!" };
}

export async function createConsultancyPlanAction(
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
    return { success: false, error: "Apenas administradores da consultoria podem cadastrar planos." };
  }

  const name = String(formData.get("name") || "").trim();
  const description = formData.get("description") ? String(formData.get("description")).trim() : null;
  const amountBrl = String(formData.get("amountBrl") || "").trim();
  const durationMonthsRaw = formData.get("durationMonths") ? Number(formData.get("durationMonths")) : null;
  const durationDaysRaw = formData.get("durationDays") ? Number(formData.get("durationDays")) : null;
  const assuredInstallmentsRaw = formData.get("assuredInstallments") ? Number(formData.get("assuredInstallments")) : 0;
  const paymentMethods = (String(formData.get("paymentMethods") || "PIX_AND_CARD")) as PlanPaymentMethods;
  const isAvailable = formData.get("isAvailableForPurchase") !== "false";

  const parseResult = parseBrlToCents(amountBrl);
  if (!parseResult.valid || !parseResult.cents) {
    return { success: false, error: parseResult.error || "Valor do plano inválido." };
  }

  const result = await createConsultancyPlan({
    consultancyId: context.consultancyId,
    userId: session.userId,
    name,
    description,
    amountCents: parseResult.cents,
    durationMonths: durationMonthsRaw,
    durationDays: durationDaysRaw,
    assuredInstallments: assuredInstallmentsRaw,
    isAvailableForPurchase: isAvailable,
    paymentMethods,
  });

  if (!result.success) {
    return { success: false, error: result.error || "Não foi possível cadastrar o plano." };
  }

  revalidatePath(`/consultoria/${slug}/financeiro`);
  return { success: true, message: "Plano comercial criado com sucesso!" };
}

export async function createStudentPlanChargeAction(
  slug: string,
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    return { success: false, error: "Consultoria não encontrada." };
  }

  const isStaff =
    context.roles.includes("CONSULTANCY_ADMIN") ||
    context.roles.includes("PERSONAL");

  if (!isStaff) {
    return { success: false, error: "Acesso não autorizado para emitir cobrança de plano." };
  }

  const studentMembershipPublicId = String(formData.get("studentMembershipPublicId") || "").trim();
  const planPublicId = String(formData.get("planPublicId") || "").trim();

  if (!studentMembershipPublicId) {
    return { success: false, error: "Selecione o aluno para a cobrança." };
  }

  if (!planPublicId) {
    return { success: false, error: "Selecione o plano desejado." };
  }

  const appBaseUrl =
    (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://trevoone.com").replace(/\/+$/, "");

  const result = await createPlanChargeForStudent({
    consultancyId: context.consultancyId,
    consultancySlug: slug,
    userId: session.userId,
    studentMembershipPublicId,
    planPublicId,
    appBaseUrl,
  });

  if (!result.success || !result.chargePublicId) {
    return { success: false, error: result.error || "Não foi possível gerar a cobrança do plano." };
  }

  revalidatePath(`/consultoria/${slug}/financeiro`);
  revalidatePath(`/consultoria/${slug}/progresso/alunos/${studentMembershipPublicId}`);

  return {
    success: true,
    message: "Cobrança gerada com sucesso!",
    chargePublicId: result.chargePublicId,
    checkoutUrl: result.checkoutUrl,
    whatsAppHref: result.whatsAppHref,
  };
}

export async function toggleConsultancyPlanStatusAction(
  slug: string,
  planPublicId: string,
  newStatus: "ACTIVE" | "INACTIVE"
): Promise<ActionState> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context || !context.roles.includes("CONSULTANCY_ADMIN")) {
    return { success: false, error: "Apenas administradores da consultoria podem alterar a situação dos planos." };
  }

  const result = await toggleConsultancyPlanStatus({
    consultancyId: context.consultancyId,
    userId: session.userId,
    planPublicId,
    status: newStatus,
  });

  if (!result.success) {
    return { success: false, error: result.error || "Não foi possível alterar a situação do plano." };
  }

  revalidatePath(`/consultoria/${slug}/financeiro`);
  return {
    success: true,
    message: `Plano ${newStatus === "ACTIVE" ? "ativado" : "desativado"} com sucesso!`,
  };
}
