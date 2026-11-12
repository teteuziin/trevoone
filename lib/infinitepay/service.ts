/**
 * TREVO ONE — INFINITEPAY CORE SERVICE
 *
 * Implements plan management, charge creation, checkout link generation,
 * webhook processing, payment verification via POST /payment_check,
 * and automatic plan activation.
 */

import crypto from "node:crypto";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";
import { InfinitePayClient } from "./client";
import type {
  ConsultancyPlan,
  ConsultancyPlanStatus,
  InfinitePayConfig,
  PlanBillingCycle,
  PlanPaymentMethods,
  StudentPlanSubscription,
} from "./types";

// ============================================================================
// 1. CONFIGURATION MANAGEMENT
// ============================================================================

/**
 * Resolves the authorized pilot consultancy ID from environment in a strict FAIL-CLOSED manner.
 * Returns null if the variable is absent, not an integer, zero, or negative.
 */
export function getAuthorizedPilotConsultancyId(): number | null {
  const raw = process.env.INFINITEPAY_PILOT_CONSULTANCY_ID;
  if (!raw || typeof raw !== "string" || !raw.trim()) {
    return null;
  }
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  const parsed = parseInt(trimmed, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

export async function getInfinitePayConfig(consultancyId: number): Promise<InfinitePayConfig | null> {
  if (!consultancyId || consultancyId <= 0) return null;

  // FAIL-CLOSED REQUIREMENT 1, 2, 3:
  // Integration operates ONLY when INFINITEPAY_PILOT_CONSULTANCY_ID is set,
  // is a valid positive integer, and exactly matches the consultancyId.
  const authorizedPilotId = getAuthorizedPilotConsultancyId();
  if (authorizedPilotId === null || consultancyId !== authorizedPilotId) {
    return null;
  }

  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
         infinitepay_handle,
         infinitepay_api_key,
         infinitepay_enabled,
         infinitepay_environment
       FROM consultancy_finance_settings
       WHERE consultancy_id = ?
       LIMIT 1;`,
      [consultancyId]
    );

    const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    const handle = (row?.infinitepay_handle ? String(row.infinitepay_handle).trim() : (process.env.INFINITEPAY_HANDLE || "")).trim();
    const apiKey = (row?.infinitepay_api_key ? String(row.infinitepay_api_key).trim() : (process.env.INFINITEPAY_API_KEY || "")).trim();
    const environment = (process.env.INFINITEPAY_ENVIRONMENT as "SIMULATION" | "PRODUCTION") || (row?.infinitepay_environment as "SIMULATION" | "PRODUCTION") || "SIMULATION";
    const isDbEnabled = Boolean(row?.infinitepay_enabled);
    const isEnabled = isDbEnabled || Boolean(handle && apiKey);

    // Requirement 4 & 5: Adequate authorization & valid environment
    if (!isEnabled || !handle || !apiKey) {
      return null;
    }

    return {
      consultancyId,
      handle,
      apiKey,
      enabled: isEnabled,
      environment,
    };
  } catch (err: unknown) {
    console.error("[InfinitePay] Error fetching config:", err instanceof Error ? err.message : err);
    return null;
  } finally {
    if (connection) connection.release();
  }
}

export async function saveInfinitePaySettings(params: {
  consultancyId: number;
  userId: number;
  handle: string;
  apiKey?: string | null;
  enabled: boolean;
  environment: "SIMULATION" | "PRODUCTION";
}): Promise<{ success: boolean; error?: string }> {
  const { consultancyId, userId, handle, apiKey, enabled, environment } = params;

  if (!consultancyId || consultancyId <= 0) {
    return { success: false, error: "Consultoria inválida." };
  }

  // FAIL-CLOSED: Block non-pilot consultancies from saving InfinitePay settings
  const authorizedPilotId = getAuthorizedPilotConsultancyId();
  if (authorizedPilotId === null || consultancyId !== authorizedPilotId) {
    return {
      success: false,
      error: "Esta consultoria não está autorizada para a fase piloto da InfinitePay.",
    };
  }

  const cleanHandle = handle.replace(/^\$/, "").trim();
  if (enabled && !cleanHandle) {
    return { success: false, error: "O identificador InfiniteTag (handle) é obrigatório para ativar a integração." };
  }

  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();

    // Check if finance settings exist
    const [existing] = await connection.execute<RowDataPacket[]>(
      `SELECT id, infinitepay_api_key FROM consultancy_finance_settings WHERE consultancy_id = ? LIMIT 1;`,
      [consultancyId]
    );

    if (!Array.isArray(existing) || existing.length === 0) {
      return {
        success: false,
        error: "Configure primeiro os dados financeiros básicos da consultoria antes de ativar a InfinitePay.",
      };
    }

    // Preserve existing API key if not supplied
    const currentApiKey = existing[0].infinitepay_api_key;
    const finalApiKey = apiKey && apiKey.trim() ? apiKey.trim() : (currentApiKey || null);

    await connection.execute(
      `UPDATE consultancy_finance_settings
       SET infinitepay_handle = ?,
           infinitepay_api_key = ?,
           infinitepay_enabled = ?,
           infinitepay_environment = ?,
           updated_by_user_id = ?,
           updated_at = NOW(3)
       WHERE consultancy_id = ?;`,
      [cleanHandle, finalApiKey, enabled ? 1 : 0, environment, userId, consultancyId]
    );

    return { success: true };
  } catch (err: unknown) {
    console.error("[InfinitePay] Error saving settings:", err instanceof Error ? err.message : err);
    return { success: false, error: "Não foi possível salvar as configurações da InfinitePay." };
  } finally {
    if (connection) connection.release();
  }
}

// ============================================================================
// 2. COMMERCIAL PLANS MANAGEMENT
// ============================================================================

export async function listConsultancyPlans(params: {
  consultancyId: number;
  includeInactive?: boolean;
}): Promise<ConsultancyPlan[]> {
  const { consultancyId, includeInactive = false } = params;
  if (!consultancyId || consultancyId <= 0) return [];

  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();
    const statusClause = includeInactive ? "status IN ('ACTIVE', 'INACTIVE')" : "status = 'ACTIVE'";

    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
         id,
         public_id,
         consultancy_id,
         name,
         description,
         amount_cents,
         currency_code,
         duration_days,
         duration_months,
         billing_cycle,
         assured_installments,
         is_available_for_purchase,
         payment_methods,
         status,
         created_by_user_id,
         DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
         DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at
       FROM consultancy_plans
       WHERE consultancy_id = ? AND ${statusClause}
       ORDER BY amount_cents ASC, name ASC;`,
      [consultancyId]
    );

    if (!Array.isArray(rows)) return [];

    return rows.map((r) => ({
      id: Number(r.id),
      publicId: String(r.public_id),
      consultancyId: Number(r.consultancy_id),
      name: String(r.name),
      description: r.description ? String(r.description) : null,
      amountCents: Number(r.amount_cents),
      currencyCode: String(r.currency_code),
      durationDays: r.duration_days ? Number(r.duration_days) : null,
      durationMonths: r.duration_months ? Number(r.duration_months) : null,
      billingCycle: r.billing_cycle as PlanBillingCycle,
      assuredInstallments: Number(r.assured_installments || 0),
      isAvailableForPurchase: Boolean(r.is_available_for_purchase),
      paymentMethods: (r.payment_methods as PlanPaymentMethods) || "PIX_AND_CARD",
      status: r.status as ConsultancyPlanStatus,
      createdByUserId: Number(r.created_by_user_id),
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    }));
  } catch (err: unknown) {
    console.error("[InfinitePay] Error listing plans:", err instanceof Error ? err.message : err);
    return [];
  } finally {
    if (connection) connection.release();
  }
}

export async function getConsultancyPlanById(params: {
  consultancyId: number;
  planPublicId: string;
}): Promise<ConsultancyPlan | null> {
  const { consultancyId, planPublicId } = params;
  if (!consultancyId || !planPublicId) return null;

  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
         id,
         public_id,
         consultancy_id,
         name,
         description,
         amount_cents,
         currency_code,
         duration_days,
         duration_months,
         billing_cycle,
         assured_installments,
         is_available_for_purchase,
         payment_methods,
         status,
         created_by_user_id,
         DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
         DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at
       FROM consultancy_plans
       WHERE consultancy_id = ? AND public_id = ?
       LIMIT 1;`,
      [consultancyId, planPublicId]
    );

    if (!Array.isArray(rows) || rows.length === 0) return null;
    const r = rows[0];

    return {
      id: Number(r.id),
      publicId: String(r.public_id),
      consultancyId: Number(r.consultancy_id),
      name: String(r.name),
      description: r.description ? String(r.description) : null,
      amountCents: Number(r.amount_cents),
      currencyCode: String(r.currency_code),
      durationDays: r.duration_days ? Number(r.duration_days) : null,
      durationMonths: r.duration_months ? Number(r.duration_months) : null,
      billingCycle: r.billing_cycle as PlanBillingCycle,
      assuredInstallments: Number(r.assured_installments || 0),
      isAvailableForPurchase: Boolean(r.is_available_for_purchase),
      paymentMethods: (r.payment_methods as PlanPaymentMethods) || "PIX_AND_CARD",
      status: r.status as ConsultancyPlanStatus,
      createdByUserId: Number(r.created_by_user_id),
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    };
  } catch (err: unknown) {
    console.error("[InfinitePay] Error fetching plan:", err instanceof Error ? err.message : err);
    return null;
  } finally {
    if (connection) connection.release();
  }
}

export async function createConsultancyPlan(params: {
  consultancyId: number;
  userId: number;
  name: string;
  description?: string | null;
  amountCents: number;
  durationMonths?: number | null;
  durationDays?: number | null;
  billingCycle?: PlanBillingCycle;
  assuredInstallments?: number;
  isAvailableForPurchase?: boolean;
  paymentMethods?: PlanPaymentMethods;
}): Promise<{ success: boolean; planPublicId?: string; error?: string }> {
  const {
    consultancyId,
    userId,
    name,
    description = null,
    amountCents,
    durationMonths = null,
    durationDays = null,
    billingCycle = "CUSTOM",
    assuredInstallments = 0,
    isAvailableForPurchase = true,
    paymentMethods = "PIX_AND_CARD",
  } = params;

  if (!name || !name.trim()) {
    return { success: false, error: "O nome do plano é obrigatório." };
  }

  if (!amountCents || amountCents <= 0) {
    return { success: false, error: "O valor do plano deve ser maior que zero." };
  }

  // Sanitizar assured_installments: 0 a 12
  const safeAssuredInstallments = Math.max(0, Math.min(12, Math.floor(assuredInstallments || 0)));

  const publicId = crypto.randomUUID();
  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();
    await connection.execute(
      `INSERT INTO consultancy_plans (
         public_id,
         consultancy_id,
         name,
         description,
         amount_cents,
         currency_code,
         duration_days,
         duration_months,
         billing_cycle,
         assured_installments,
         is_available_for_purchase,
         payment_methods,
         status,
         created_by_user_id,
         created_at,
         updated_at
       ) VALUES (?, ?, ?, ?, ?, 'BRL', ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, NOW(3), NOW(3));`,
      [
        publicId,
        consultancyId,
        name.trim(),
        description?.trim() || null,
        amountCents,
        durationDays || null,
        durationMonths || null,
        billingCycle,
        safeAssuredInstallments,
        isAvailableForPurchase ? 1 : 0,
        paymentMethods,
        userId,
      ]
    );

    return { success: true, planPublicId: publicId };
  } catch (err: unknown) {
    console.error("[InfinitePay] Error creating plan:", err instanceof Error ? err.message : err);
    return { success: false, error: "Não foi possível criar o plano." };
  } finally {
    if (connection) connection.release();
  }
}

// ============================================================================
// 3. CHARGE WITH PLAN & CHECKOUT LINK CREATION
// ============================================================================

export async function createPlanChargeForStudent(params: {
  consultancyId: number;
  consultancySlug: string;
  userId: number;
  studentMembershipPublicId: string;
  planPublicId: string;
  appBaseUrl: string;
}): Promise<{
  success: boolean;
  chargePublicId?: string;
  checkoutUrl?: string;
  whatsAppHref?: string;
  error?: string;
}> {
  const {
    consultancyId,
    consultancySlug,
    userId,
    studentMembershipPublicId,
    planPublicId,
    appBaseUrl,
  } = params;

  // FAIL-CLOSED: Strictly block any charge creation if pilot protection fails
  const authorizedPilotId = getAuthorizedPilotConsultancyId();
  if (authorizedPilotId === null || consultancyId !== authorizedPilotId) {
    return {
      success: false,
      error: "A integração InfinitePay não está habilitada para esta consultoria.",
    };
  }

  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();

    // 1. Fetch Plan strictly from backend
    const [planRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, name, amount_cents, duration_months, duration_days, assured_installments, status
       FROM consultancy_plans
       WHERE consultancy_id = ? AND public_id = ?
       LIMIT 1;`,
      [consultancyId, planPublicId]
    );

    if (!Array.isArray(planRows) || planRows.length === 0) {
      return { success: false, error: "Plano não encontrado." };
    }

    const plan = planRows[0];
    if (plan.status !== "ACTIVE") {
      return { success: false, error: "Este plano está inativo e não pode receber novas cobranças." };
    }

    // 2. Resolve Student Membership
    const [memberRows] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id, u.full_name, u.phone
       FROM consultancy_members cm
       INNER JOIN users u ON u.id = cm.user_id
       WHERE cm.consultancy_id = ? AND (cm.public_id = ? OR u.public_id = ?)
       LIMIT 1;`,
      [consultancyId, studentMembershipPublicId, studentMembershipPublicId]
    );

    if (!Array.isArray(memberRows) || memberRows.length === 0) {
      return { success: false, error: "Aluno não encontrado nesta consultoria." };
    }

    const member = memberRows[0];
    const studentMembershipId = Number(member.id);
    const studentName = String(member.full_name);
    const studentPhone = member.phone ? String(member.phone) : null;

    // 3. Prevent duplicate creation within 15 minutes (Double-click & duplicate intention protection)
    // Only reuse if charge is still OPEN and NOT overdue
    const [dupRows] = await connection.execute<RowDataPacket[]>(
      `SELECT public_id, infinitepay_checkout_url
       FROM student_charges
       WHERE consultancy_id = ?
         AND student_membership_id = ?
         AND plan_id = ?
         AND state = 'OPEN'
         AND due_on >= CURDATE()
         AND created_at >= DATE_SUB(NOW(3), INTERVAL 15 MINUTE)
       LIMIT 1;`,
      [consultancyId, studentMembershipId, plan.id]
    );

    if (Array.isArray(dupRows) && dupRows.length > 0) {
      const existingCharge = dupRows[0];
      const checkoutUrl = existingCharge.infinitepay_checkout_url || "";
      const waHref = generateWhatsAppPaymentMessage(studentPhone, studentName, plan.name, Number(plan.amount_cents), checkoutUrl);
      return {
        success: true,
        chargePublicId: String(existingCharge.public_id),
        checkoutUrl,
        whatsAppHref: waHref,
      };
    }

    // 4. Calculate validity reference dates based on plan duration
    const today = new Date();
    const periodStart = today.toISOString().slice(0, 10);
    const periodEnd = new Date(today);
    if (plan.duration_months) {
      periodEnd.setMonth(periodEnd.getMonth() + Number(plan.duration_months));
    } else if (plan.duration_days) {
      periodEnd.setDate(periodEnd.getDate() + Number(plan.duration_days));
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1); // default 1 month
    }
    const periodEndStr = periodEnd.toISOString().slice(0, 10);

    // Due date: default 3 days from today
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 3);
    const dueOnStr = dueDate.toISOString().slice(0, 10);

    const chargePublicId = crypto.randomUUID();

    // 5. Insert Student Charge
    await connection.execute(
      `INSERT INTO student_charges (
         public_id,
         consultancy_id,
         student_membership_id,
         plan_id,
         title,
         description,
         amount_cents,
         currency_code,
         due_on,
         reference_period_start,
         reference_period_end,
         blocks_access,
         state,
         created_by_user_id,
         created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 'BRL', ?, ?, ?, 0, 'OPEN', ?, NOW(3));`,
      [
        chargePublicId,
        consultancyId,
        studentMembershipId,
        plan.id,
        plan.name,
        `Contratação de ${plan.name}`,
        plan.amount_cents,
        dueOnStr,
        periodStart,
        periodEndStr,
        userId,
      ]
    );

    // 6. Request hosted checkout link from InfinitePay
    const config = await getInfinitePayConfig(consultancyId);
    let checkoutUrl = "";
    let slug = "";

    if (config && config.enabled) {
      const canonicalBase = (appBaseUrl && !appBaseUrl.includes("trevo.one") ? appBaseUrl : "https://trevoone.com").replace(/\/+$/, "");
      const redirectUrl = `${canonicalBase}/consultoria/${consultancySlug}/pagamentos/retorno?chargeId=${chargePublicId}`;
      const webhookUrl = `${canonicalBase}/api/webhooks/infinitepay`;

      const linkRes = await InfinitePayClient.createLink(config, {
        handle: config.handle,
        items: [
          {
            quantity: 1,
            price: Number(plan.amount_cents),
            description: String(plan.name),
          },
        ],
        order_nsu: chargePublicId,
        redirect_url: redirectUrl,
        webhook_url: webhookUrl,
        options: {
          single_payment: true,
          assured_installments: Number(plan.assured_installments || 0),
          valid_until: `${dueOnStr}T23:59:59Z`,
        },
      });

      if (linkRes.success) {
        checkoutUrl = linkRes.url;
        slug = linkRes.slug;

        await connection.execute(
          `UPDATE student_charges
           SET infinitepay_checkout_url = ?,
               infinitepay_slug = ?,
               infinitepay_order_nsu = ?
           WHERE public_id = ?;`,
          [checkoutUrl, slug, chargePublicId, chargePublicId]
        );
      }
    }

    const whatsAppHref = generateWhatsAppPaymentMessage(
      studentPhone,
      studentName,
      plan.name,
      Number(plan.amount_cents),
      checkoutUrl
    );

    return {
      success: true,
      chargePublicId,
      checkoutUrl,
      whatsAppHref,
    };
  } catch (err: unknown) {
    console.error("[InfinitePay] Error creating plan charge:", err instanceof Error ? err.message : err);
    return { success: false, error: "Não foi possível gerar a cobrança do plano." };
  } finally {
    if (connection) connection.release();
  }
}

function generateWhatsAppPaymentMessage(
  phone: string | null,
  studentName: string,
  planName: string,
  amountCents: number,
  checkoutUrl: string
): string | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, "");
  if (!digits || digits.length < 8) return undefined;
  const fullPhone = digits.length <= 11 ? `55${digits}` : digits;

  const brl = (amountCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const text = encodeURIComponent(
    `Olá, ${studentName}! Aqui está o link seguro para pagamento do seu plano *${planName}* (${brl}):\n\n${checkoutUrl || "Acesse sua área no Trevo One para pagar por Pix ou Cartão."}\n\nApós a confirmação, seu plano será liberado automaticamente!`
  );

  return `https://wa.me/${fullPhone}?text=${text}`;
}

// ============================================================================
// 4. STUDENT PLAN & PAYMENT RETRIEVAL
// ============================================================================

export async function getStudentPlanStatus(params: {
  consultancyId: number;
  studentMembershipId: number;
}): Promise<{
  activeSubscription: StudentPlanSubscription | null;
  pendingCharge: {
    publicId: string;
    title: string;
    amountCents: number;
    checkoutUrl: string | null;
    dueOn: string;
    isOverdue: boolean;
  } | null;
}> {
  const { consultancyId, studentMembershipId } = params;
  if (!consultancyId || !studentMembershipId) {
    return { activeSubscription: null, pendingCharge: null };
  }

  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();

    // 1. Check for active subscription
    const [subRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
         sps.id,
         sps.public_id,
         sps.consultancy_id,
         sps.student_membership_id,
         sps.plan_id,
         sps.charge_id,
         sps.status,
         DATE_FORMAT(sps.started_at, '%Y-%m-%dT%H:%i:%sZ') AS started_at,
         DATE_FORMAT(sps.ends_at, '%Y-%m-%dT%H:%i:%sZ') AS ends_at,
         cp.name AS plan_name,
         cp.amount_cents AS plan_amount_cents,
         DATE_FORMAT(sps.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
         DATE_FORMAT(sps.updated_at, '%Y-%m-%dT%H:%i:%sZ') AS updated_at
       FROM student_plan_subscriptions sps
       INNER JOIN consultancy_plans cp ON cp.id = sps.plan_id
       WHERE sps.consultancy_id = ?
         AND sps.student_membership_id = ?
         AND sps.status = 'ACTIVE'
       ORDER BY sps.id DESC
       LIMIT 1;`,
      [consultancyId, studentMembershipId]
    );

    let activeSubscription: StudentPlanSubscription | null = null;
    if (Array.isArray(subRows) && subRows.length > 0) {
      const s = subRows[0];
      activeSubscription = {
        id: Number(s.id),
        publicId: String(s.public_id),
        consultancyId: Number(s.consultancy_id),
        studentMembershipId: Number(s.student_membership_id),
        planId: Number(s.plan_id),
        chargeId: s.charge_id ? Number(s.charge_id) : null,
        status: s.status as "ACTIVE",
        startedAt: String(s.started_at),
        endsAt: s.ends_at ? String(s.ends_at) : null,
        planName: String(s.plan_name),
        planAmountCents: Number(s.plan_amount_cents),
        createdAt: String(s.created_at),
        updatedAt: String(s.updated_at),
      };
    }

    // 2. Check for open pending charge
    const [chargeRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
         public_id,
         title,
         amount_cents,
         infinitepay_checkout_url,
         DATE_FORMAT(due_on, '%Y-%m-%d') AS due_on,
         (due_on < CURDATE()) AS is_overdue
       FROM student_charges
       WHERE consultancy_id = ?
         AND student_membership_id = ?
         AND state = 'OPEN'
         AND plan_id IS NOT NULL
       ORDER BY id DESC
       LIMIT 1;`,
      [consultancyId, studentMembershipId]
    );

    let pendingCharge = null;
    if (Array.isArray(chargeRows) && chargeRows.length > 0) {
      const c = chargeRows[0];
      pendingCharge = {
        publicId: String(c.public_id),
        title: String(c.title),
        amountCents: Number(c.amount_cents),
        checkoutUrl: c.infinitepay_checkout_url ? String(c.infinitepay_checkout_url) : null,
        dueOn: String(c.due_on),
        isOverdue: Boolean(c.is_overdue),
      };
    }

    return { activeSubscription, pendingCharge };
  } catch (err: unknown) {
    console.error("[InfinitePay] Error fetching student plan status:", err instanceof Error ? err.message : err);
    return { activeSubscription: null, pendingCharge: null };
  } finally {
    if (connection) connection.release();
  }
}

// ============================================================================
// 5. OFFICIAL PAYMENT CONFIRMATION & AUTOMATIC ACTIVATION
// ============================================================================

export async function confirmAndActivateCharge(params: {
  consultancyId: number;
  chargeId: number;
  chargePublicId: string;
  studentMembershipId: number;
  planId: number | null;
  amountCents: number;
  paidAmountCents?: number;
  originalOrderAmountCents?: number;
  transactionNsu?: string | null;
  captureMethod?: string;
  installments?: number;
  receiptUrl?: string | null;
}): Promise<{ success: boolean; activated: boolean; error?: string }> {
  const {
    consultancyId,
    chargeId,
    studentMembershipId,
    planId,
    amountCents,
    paidAmountCents,
    originalOrderAmountCents,
    transactionNsu = null,
    captureMethod = "pix",
    installments = 1,
    receiptUrl = null,
  } = params;

  // 0. Security Guard: Prevent simulation tokens from activating real subscriptions in production runtime
  if (process.env.NODE_ENV === "production" && transactionNsu?.startsWith("sim_")) {
    return {
      success: false,
      activated: false,
      error: "Transações simuladas não são permitidas no ambiente de produção.",
    };
  }

  // 0.1 Security Guard: Verify original order amount matches expected amount
  if (
    originalOrderAmountCents !== undefined &&
    originalOrderAmountCents > 0 &&
    originalOrderAmountCents !== amountCents
  ) {
    return {
      success: false,
      activated: false,
      error: `Valor original do pedido (R$ ${(originalOrderAmountCents / 100).toFixed(2)}) diverge do valor da cobrança (R$ ${(amountCents / 100).toFixed(2)}).`,
    };
  }

  // 0.2 Security Guard: Check for underpayment (buyer paid less than expected)
  // NOTE: paidAmountCents can be greater than amountCents if buyer paid credit card installment fees!
  if (paidAmountCents !== undefined && paidAmountCents > 0 && paidAmountCents < amountCents) {
    return {
      success: false,
      activated: false,
      error: `Valor recebido (R$ ${(paidAmountCents / 100).toFixed(2)}) é inferior ao valor da cobrança (R$ ${(amountCents / 100).toFixed(2)}).`,
    };
  }

  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 1. Re-validate charge under lock (Idempotency and student match check)
    const [lockedCharges] = await connection.execute<RowDataPacket[]>(
      `SELECT id, state, plan_id, student_membership_id, amount_cents, reference_period_start, reference_period_end
       FROM student_charges
       WHERE id = ? AND consultancy_id = ?
       FOR UPDATE;`,
      [chargeId, consultancyId]
    );

    if (!Array.isArray(lockedCharges) || lockedCharges.length === 0) {
      await connection.rollback();
      return { success: false, activated: false, error: "Cobrança não encontrada." };
    }

    const currentCharge = lockedCharges[0];
    if (Number(currentCharge.student_membership_id) !== studentMembershipId) {
      await connection.rollback();
      return { success: false, activated: false, error: "Cobrança não pertence ao aluno indicado." };
    }

    if (Number(currentCharge.amount_cents) !== amountCents) {
      await connection.rollback();
      return { success: false, activated: false, error: "Valor da cobrança no banco diverge dos parâmetros informados." };
    }

    if (currentCharge.state === "PAID") {
      // Already paid and activated! Idempotent success.
      await connection.commit();
      return { success: true, activated: false };
    }

    // Check if subscription has already been registered for this charge
    const [existingSub] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM student_plan_subscriptions WHERE charge_id = ? LIMIT 1;`,
      [chargeId]
    );
    if (Array.isArray(existingSub) && existingSub.length > 0) {
      await connection.commit();
      return { success: true, activated: false };
    }

    // 2. Mark charge as PAID
    await connection.execute(
      `UPDATE student_charges
       SET state = 'PAID',
           paid_amount_cents = ?,
           infinitepay_transaction_nsu = ?,
           infinitepay_installments = ?,
           infinitepay_capture_method = ?,
           infinitepay_receipt_url = ?,
           paid_at = NOW(3)
       WHERE id = ?;`,
      [
        paidAmountCents || amountCents,
        transactionNsu,
        installments,
        captureMethod,
        receiptUrl,
        chargeId,
      ]
    );

    // 3. Insert student_payments record
    const paymentPublicId = crypto.randomUUID();
    const finalMethod = captureMethod?.toUpperCase().includes("CREDIT") ? "CREDIT_CARD" : "PIX";

    await connection.execute(
      `INSERT INTO student_payments (
         public_id,
         consultancy_id,
         charge_id,
         receipt_id,
         amount_cents,
         currency_code,
         payment_method,
         confirmed_by_user_id,
         confirmed_at,
         created_at
       ) VALUES (?, ?, ?, NULL, ?, 'BRL', ?, NULL, NOW(3), NOW(3));`,
      [paymentPublicId, consultancyId, chargeId, amountCents, finalMethod]
    );

    // 4. Activate Plan Subscription if a plan is linked
    const targetPlanId = planId || currentCharge.plan_id;
    if (targetPlanId) {
      // Fetch plan duration
      const [planRows] = await connection.execute<RowDataPacket[]>(
        `SELECT duration_months, duration_days FROM consultancy_plans WHERE id = ? LIMIT 1;`,
        [targetPlanId]
      );

      // Check if student has an active subscription in the future to extend smoothly without losing days
      const [activeSubs] = await connection.execute<RowDataPacket[]>(
        `SELECT id, ends_at FROM student_plan_subscriptions
         WHERE consultancy_id = ? AND student_membership_id = ? AND status = 'ACTIVE' AND ends_at > NOW(3)
         ORDER BY ends_at DESC LIMIT 1;`,
        [consultancyId, studentMembershipId]
      );

      const now = new Date();
      let baseDate = now;
      if (Array.isArray(activeSubs) && activeSubs.length > 0 && activeSubs[0].ends_at) {
        const existingEnd = new Date(activeSubs[0].ends_at);
        if (existingEnd > now) {
          baseDate = existingEnd; // Extend from previous end date!
        }
      }

      const startsAt = now.toISOString().slice(0, 19).replace("T", " ");
      const endsDate = new Date(baseDate);
      if (Array.isArray(planRows) && planRows.length > 0) {
        const p = planRows[0];
        if (p.duration_months) {
          endsDate.setMonth(endsDate.getMonth() + Number(p.duration_months));
        } else if (p.duration_days) {
          endsDate.setDate(endsDate.getDate() + Number(p.duration_days));
        } else {
          endsDate.setMonth(endsDate.getMonth() + 1);
        }
      } else {
        endsDate.setMonth(endsDate.getMonth() + 1);
      }
      const endsAt = endsDate.toISOString().slice(0, 19).replace("T", " ");

      const subscriptionPublicId = crypto.randomUUID();

      // Deactivate any prior active subscription for this student
      await connection.execute(
        `UPDATE student_plan_subscriptions
         SET status = 'OVERDUE', updated_at = NOW(3)
         WHERE consultancy_id = ? AND student_membership_id = ? AND status = 'ACTIVE';`,
        [consultancyId, studentMembershipId]
      );

      // Insert new active subscription
      await connection.execute(
        `INSERT INTO student_plan_subscriptions (
           public_id,
           consultancy_id,
           student_membership_id,
           plan_id,
           charge_id,
           status,
           started_at,
           ends_at,
           created_at,
           updated_at
         ) VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?, NOW(3), NOW(3));`,
        [
          subscriptionPublicId,
          consultancyId,
          studentMembershipId,
          targetPlanId,
          chargeId,
          startsAt,
          endsAt,
        ]
      );
    }

    await connection.commit();
    return { success: true, activated: true };
  } catch (err: unknown) {
    if (connection) await connection.rollback();
    console.error("[InfinitePay] Error activating charge:", err instanceof Error ? err.message : err);
    return { success: false, activated: false, error: "Falha na ativação transacional do pagamento." };
  } finally {
    if (connection) connection.release();
  }
}

// ============================================================================
// 6. ACTIVE RECONCILIATION & RETURN VERIFICATION
// ============================================================================

export async function verifyAndReconcileChargePayment(params: {
  consultancySlug: string;
  chargePublicId: string;
  transactionNsu?: string | null;
  slug?: string | null;
}): Promise<{
  success: boolean;
  isPaid: boolean;
  status: string;
  message: string;
}> {
  const { consultancySlug, chargePublicId, transactionNsu, slug } = params;

  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();

    // 1. Fetch charge and consultancy details
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
         sc.id,
         sc.public_id,
         sc.consultancy_id,
         sc.student_membership_id,
         sc.plan_id,
         sc.amount_cents,
         sc.state,
         sc.infinitepay_slug,
         sc.infinitepay_transaction_nsu,
         c.slug AS consultancy_slug
       FROM student_charges sc
       INNER JOIN consultancies c ON c.id = sc.consultancy_id
       WHERE sc.public_id = ? AND c.slug = ?
       LIMIT 1;`,
      [chargePublicId, consultancySlug]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return { success: false, isPaid: false, status: "NOT_FOUND", message: "Cobrança não encontrada." };
    }

    const charge = rows[0];
    if (charge.state === "PAID") {
      return { success: true, isPaid: true, status: "PAID", message: "Pagamento já confirmado e ativo." };
    }

    // 2. Fetch InfinitePay config for direct POST /payment_check
    const config = await getInfinitePayConfig(Number(charge.consultancy_id));
    if (!config || !config.enabled) {
      return {
        success: false,
        isPaid: false,
        status: "NOT_CONFIGURED",
        message: "Integração InfinitePay não ativa para esta consultoria.",
      };
    }

    const finalSlug = slug || charge.infinitepay_slug || undefined;
    const finalTxNsu = transactionNsu || charge.infinitepay_transaction_nsu || undefined;

    // 3. Call official POST /payment_check
    const checkRes = await InfinitePayClient.paymentCheck(config, {
      handle: config.handle,
      order_nsu: charge.public_id,
      slug: finalSlug,
      transaction_nsu: finalTxNsu,
    });

    // 4. Verify original order amount correspondence
    if (
      checkRes.amount !== undefined &&
      checkRes.amount > 0 &&
      checkRes.amount !== Number(charge.amount_cents)
    ) {
      return {
        success: false,
        isPaid: false,
        status: "DIVERGENT_AMOUNT",
        message: "O valor original do pedido na InfinitePay diverge do valor da cobrança no Trevo One.",
      };
    }

    // Check for underpayment (buyer paid less than expected amount)
    // NOTE: checkRes.paid_amount can legitimately be greater than charge.amount_cents
    // when buyer pays installment interest/fees!
    if (
      checkRes.paid_amount !== undefined &&
      checkRes.paid_amount > 0 &&
      checkRes.paid_amount < Number(charge.amount_cents)
    ) {
      return {
        success: false,
        isPaid: false,
        status: "UNDERPAID",
        message: "O valor pago é inferior ao valor do plano contratado.",
      };
    }

    if (checkRes.success === true && checkRes.paid === true) {
      // Payment confirmed by official CloudWalk API! Activate now.
      const activateRes = await confirmAndActivateCharge({
        consultancyId: Number(charge.consultancy_id),
        chargeId: Number(charge.id),
        chargePublicId: String(charge.public_id),
        studentMembershipId: Number(charge.student_membership_id),
        planId: charge.plan_id ? Number(charge.plan_id) : null,
        amountCents: Number(charge.amount_cents),
        paidAmountCents: checkRes.paid_amount,
        originalOrderAmountCents: checkRes.amount,
        transactionNsu: checkRes.transaction_nsu || finalTxNsu,
        captureMethod: checkRes.capture_method || "pix",
        installments: checkRes.installments || 1,
        receiptUrl: checkRes.receipt_url,
      });

      if (activateRes.success) {
        return {
          success: true,
          isPaid: true,
          status: "PAID",
          message: "Pagamento confirmado com sucesso! Seu plano foi ativado.",
        };
      }
    }

    return {
      success: true,
      isPaid: false,
      status: "PENDING",
      message: "Estamos confirmando seu pagamento. Assim que a InfinitePay processar a transação, seu acesso será liberado.",
    };
  } catch (err: unknown) {
    console.error("[InfinitePay] Error reconciling payment:", err instanceof Error ? err.message : err);
    return {
      success: false,
      isPaid: false,
      status: "ERROR",
      message: "Não foi possível verificar a situação do pagamento no momento.",
    };
  } finally {
    if (connection) connection.release();
  }
}
