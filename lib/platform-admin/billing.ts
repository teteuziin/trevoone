import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";
import {
  writePrivateFile,
  readVerifiedPrivateFile,
  deletePrivateFile,
  detectReceiptFileType,
} from "../storage/private-files";

// ==========================================
// CONSTANTS & TYPES
// ==========================================

export const PLATFORM_GRACE_DAYS_DEFAULT = 5;
export const MAX_PLATFORM_RECEIPT_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MiB
export const MAX_PLATFORM_RECEIPT_EARLY_BODY_BYTES = 6 * 1024 * 1024; // 6 MiB

export const PIX_KEY_TYPES = ["CPF", "CNPJ", "EMAIL", "PHONE", "RANDOM"] as const;
export type PixKeyType = (typeof PIX_KEY_TYPES)[number];

export const SUBSCRIPTION_ADMIN_STATUSES = ["ACTIVE", "SUSPENDED", "CANCELED"] as const;
export type SubscriptionAdminStatus = (typeof SUBSCRIPTION_ADMIN_STATUSES)[number];

export const EFFECTIVE_PLATFORM_STATUSES = ["ACTIVE", "GRACE", "SUSPENDED", "CANCELED"] as const;
export type EffectivePlatformStatus = (typeof EFFECTIVE_PLATFORM_STATUSES)[number];

export const PLATFORM_CHARGE_STATUSES = ["OPEN", "CANCELED"] as const;
export type PlatformChargeStatus = (typeof PLATFORM_CHARGE_STATUSES)[number];

export const PLATFORM_RECEIPT_STATUSES = ["SUBMITTED", "APPROVED", "REJECTED"] as const;
export type PlatformReceiptStatus = (typeof PLATFORM_RECEIPT_STATUSES)[number];

export type PlatformBillingSettingsView = {
  publicId: string;
  pixKeyType: PixKeyType;
  pixKey: string;
  receiverName: string;
  instructions: string | null;
  updatedAt: Date;
};

export type PlatformEffectiveAccessState = {
  effectiveStatus: EffectivePlatformStatus;
  administrativeStatus: SubscriptionAdminStatus;
  effectiveReason: "ADMINISTRATIVE" | "NONPAYMENT" | "NONE";
  isOperationalAllowed: boolean; // true for ACTIVE or GRACE
  manualSuspensionReason?: string | null;
  cancellationReason?: string | null;
  blockingCharge?: {
    publicId: string;
    title: string;
    amountCents: number;
    dueOn: string;
    graceEndsOn: string;
    diffDays: number;
  };
};

export type ConsultancySubscriptionDetailView = {
  consultancyId: number;
  consultancyPublicId: string;
  consultancyName: string;
  consultancySlug: string;
  consultancyTimezone: string;
  subscriptionPublicId: string;
  administrativeStatus: SubscriptionAdminStatus;
  effectiveStatus: EffectivePlatformStatus;
  effectiveReason: "ADMINISTRATIVE" | "NONPAYMENT" | "NONE";
  manualSuspensionReason: string | null;
  cancellationReason: string | null;
  openCharges: PlatformChargeListItemView[];
  paidCharges: PlatformChargeListItemView[];
  canceledCharges: PlatformChargeListItemView[];
  pendingReceipts: PlatformReceiptItemView[];
  recentPayments: PlatformPaymentItemView[];
  blockingCharge?: PlatformEffectiveAccessState["blockingCharge"];
};

export type PlatformChargeListItemView = {
  publicId: string;
  consultancyPublicId: string;
  consultancyName?: string;
  consultancySlug?: string;
  title: string;
  description: string | null;
  amountCents: number;
  currency: string;
  dueOn: string; // YYYY-MM-DD
  periodStart: string | null;
  periodEnd: string | null;
  graceDaysSnapshot: number;
  status: PlatformChargeStatus;
  isPaid: boolean;
  paymentPublicId?: string;
  paidAt?: Date;
  submittedReceiptPublicId?: string;
  submittedReceiptFileName?: string;
  submittedReceiptAt?: Date;
  createdAt: Date;
};

export type PlatformReceiptItemView = {
  publicId: string;
  consultancyPublicId: string;
  consultancyName: string;
  consultancySlug: string;
  chargePublicId: string;
  chargeTitle: string;
  chargeAmountCents: number;
  chargeDueOn: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  status: PlatformReceiptStatus;
  rejectionReason: string | null;
  submitterName: string;
  reviewerName: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
};

export type PlatformPaymentItemView = {
  publicId: string;
  consultancyPublicId: string;
  chargePublicId: string;
  chargeTitle: string;
  receiptPublicId: string;
  amountCents: number;
  currency: string;
  method: string;
  confirmerName: string;
  confirmedAt: Date;
};

// ==========================================
// PURE CALCULATION & FORMATTING HELPERS
// ==========================================

export function formatBrlCents(cents: number): string {
  const safe = typeof cents === "number" && !Number.isNaN(cents) ? cents : 0;
  return (safe / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Returns today's civil date (YYYY-MM-DD) in the specified IANA timezone.
 */
export function getLocalTodayDateString(timezone: string, nowUtc = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(nowUtc);
  } catch {
    // Fallback safe UTC
    return nowUtc.toISOString().slice(0, 10);
  }
}

/**
 * Computes difference in calendar days between two YYYY-MM-DD strings.
 * Returns positive if dateA > dateB, 0 if equal, negative if dateA < dateB.
 */
export function diffCalendarDays(dateA: string, dateB: string): number {
  const [yA, mA, dA] = dateA.split("-").map(Number);
  const [yB, mB, dB] = dateB.split("-").map(Number);
  const utcA = Date.UTC(yA, mA - 1, dA);
  const utcB = Date.UTC(yB, mB - 1, dB);
  return Math.floor((utcA - utcB) / (24 * 60 * 60 * 1000));
}

/**
 * Adds N calendar days to a YYYY-MM-DD string, returning YYYY-MM-DD.
 */
export function addCalendarDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  return utc.toISOString().slice(0, 10);
}

export function formatIsoDateToBr(dateStr: string | null | undefined): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return "-";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

// ==========================================
// PLATFORM BILLING SETTINGS QUERIES
// ==========================================

export async function getPlatformBillingSettings(): Promise<PlatformBillingSettingsView | null> {
  let connection;
  try {
    connection = await getDbConnection();
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT public_id, pix_key_type, pix_key, receiver_name, instructions, updated_at
       FROM platform_billing_settings
       ORDER BY id ASC
       LIMIT 1;`
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    const r = rows[0];
    return {
      publicId: String(r.public_id),
      pixKeyType: r.pix_key_type as PixKeyType,
      pixKey: String(r.pix_key),
      receiverName: String(r.receiver_name),
      instructions: r.instructions ? String(r.instructions) : null,
      updatedAt: new Date(r.updated_at),
    };
  } catch {
    return null;
  } finally {
    if (connection) connection.release();
  }
}

export async function updatePlatformBillingSettings(params: {
  actorUserId: number;
  pixKeyType: PixKeyType;
  pixKey: string;
  receiverName: string;
  instructions?: string | null;
}): Promise<{ success: true } | { success: false; error: string; field?: string }> {
  const { actorUserId, pixKeyType, pixKey, receiverName, instructions } = params;

  if (!PIX_KEY_TYPES.includes(pixKeyType)) {
    return { success: false, error: "Tipo de chave Pix inválido.", field: "pixKeyType" };
  }

  const normalizedPixKey = (pixKey || "").trim();
  if (normalizedPixKey.length < 3 || normalizedPixKey.length > 255) {
    return { success: false, error: "Chave Pix deve ter entre 3 e 255 caracteres.", field: "pixKey" };
  }

  const normalizedReceiver = (receiverName || "").trim().replace(/\s+/g, " ");
  if (normalizedReceiver.length < 2 || normalizedReceiver.length > 255) {
    return { success: false, error: "Nome do favorecido deve ter entre 2 e 255 caracteres.", field: "receiverName" };
  }

  const normalizedInstructions = instructions ? instructions.trim().slice(0, 4000) : null;

  let connection;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [existing] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id FROM platform_billing_settings ORDER BY id ASC LIMIT 1 FOR UPDATE;`
    );

    let settingsPublicId = "";
    if (Array.isArray(existing) && existing.length > 0) {
      settingsPublicId = existing[0].public_id;
      await connection.execute(
        `UPDATE platform_billing_settings
         SET pix_key_type = ?, pix_key = ?, receiver_name = ?, instructions = ?, updated_by_user_id = ?, updated_at = UTC_TIMESTAMP(3)
         WHERE id = ?;`,
        [pixKeyType, normalizedPixKey, normalizedReceiver, normalizedInstructions, actorUserId, existing[0].id]
      );
    } else {
      settingsPublicId = randomUUID();
      await connection.execute(
        `INSERT INTO platform_billing_settings
         (public_id, pix_key_type, pix_key, receiver_name, instructions, updated_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [settingsPublicId, pixKeyType, normalizedPixKey, normalizedReceiver, normalizedInstructions, actorUserId]
      );
    }

    // Audit event without sensitive raw keys
    await connection.execute(
      `INSERT INTO audit_events
       (public_id, actor_user_id, action, target_type, target_public_id, metadata_json)
       VALUES (?, ?, 'PLATFORM_BILLING_SETTINGS_UPDATED', 'PLATFORM_SETTINGS', ?, ?);`,
      [
        randomUUID(),
        actorUserId,
        settingsPublicId,
        JSON.stringify({ pixKeyType, receiverName: normalizedReceiver }),
      ]
    );

    await connection.commit();
    return { success: true };
  } catch (err: unknown) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    const msg = err instanceof Error ? err.message : "Erro desconhecido.";
    return { success: false, error: `Erro ao salvar configurações Pix: ${msg}` };
  } finally {
    if (connection) connection.release();
  }
}

// ==========================================
// CENTRAL EFFECTIVE PLATFORM ACCESS LOGIC
// ==========================================

/**
 * Calculates effective platform access status for a consultancy:
 * ACTIVE | GRACE | SUSPENDED | CANCELED
 */
export async function getPlatformEffectiveAccessState(
  consultancyId: number,
  consultancyTimezone: string
): Promise<PlatformEffectiveAccessState> {
  let connection;
  try {
    connection = await getDbConnection();

    // 1. Fetch platform subscription row
    const [subRows] = await connection.execute<RowDataPacket[]>(
      `SELECT administrative_status, manual_suspension_reason, cancellation_reason
       FROM consultancy_platform_subscriptions
       WHERE consultancy_id = ?
       LIMIT 1;`,
      [consultancyId]
    );

    if (!Array.isArray(subRows) || subRows.length === 0) {
      // Configuration / integrity missing subscription -> safe fail closed
      return {
        effectiveStatus: "SUSPENDED",
        administrativeStatus: "SUSPENDED",
        effectiveReason: "ADMINISTRATIVE",
        isOperationalAllowed: false,
        manualSuspensionReason: "Assinatura da plataforma não configurada.",
      };
    }

    const sub = subRows[0];
    const adminStatus = (sub.administrative_status || "ACTIVE") as SubscriptionAdminStatus;
    const manualReason = sub.manual_suspension_reason ? String(sub.manual_suspension_reason) : null;
    const cancelReason = sub.cancellation_reason ? String(sub.cancellation_reason) : null;

    // Rule 1: CANCELED is terminal
    if (adminStatus === "CANCELED") {
      return {
        effectiveStatus: "CANCELED",
        administrativeStatus: "CANCELED",
        effectiveReason: "ADMINISTRATIVE",
        isOperationalAllowed: false,
        cancellationReason: cancelReason,
      };
    }

    // Rule 2: Manual SUSPENDED
    if (adminStatus === "SUSPENDED") {
      return {
        effectiveStatus: "SUSPENDED",
        administrativeStatus: "SUSPENDED",
        effectiveReason: "ADMINISTRATIVE",
        isOperationalAllowed: false,
        manualSuspensionReason: manualReason,
      };
    }

    // 2. Fetch OPEN unpaid charges for this consultancy
    const [chargeRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        cpc.id,
        cpc.public_id,
        cpc.title,
        cpc.amount_cents,
        DATE_FORMAT(cpc.due_on, '%Y-%m-%d') AS due_on_str,
        cpc.grace_days_snapshot
       FROM consultancy_platform_charges cpc
       LEFT JOIN consultancy_platform_payments cpp ON cpp.charge_id = cpc.id
       WHERE cpc.consultancy_id = ?
         AND cpc.status = 'OPEN'
         AND cpp.id IS NULL
       ORDER BY cpc.due_on ASC, cpc.id ASC;`,
      [consultancyId]
    );

    if (!Array.isArray(chargeRows) || chargeRows.length === 0) {
      // No open unpaid charges -> ACTIVE
      return {
        effectiveStatus: "ACTIVE",
        administrativeStatus: "ACTIVE",
        effectiveReason: "NONE",
        isOperationalAllowed: true,
      };
    }

    const localTodayStr = getLocalTodayDateString(consultancyTimezone);

    let mostSevereStatus: EffectivePlatformStatus = "ACTIVE";
    let blockingChargeInfo: PlatformEffectiveAccessState["blockingCharge"] | undefined;

    for (const ch of chargeRows) {
      const dueOnStr = String(ch.due_on_str);
      const graceDays = Number(ch.grace_days_snapshot || PLATFORM_GRACE_DAYS_DEFAULT);
      const diffDays = diffCalendarDays(localTodayStr, dueOnStr);
      const graceEndsOn = addCalendarDays(dueOnStr, graceDays);

      if (diffDays > graceDays) {
        // Beyond grace -> SUSPENDED due to nonpayment (most severe)
        mostSevereStatus = "SUSPENDED";
        blockingChargeInfo = {
          publicId: String(ch.public_id),
          title: String(ch.title),
          amountCents: Number(ch.amount_cents),
          dueOn: dueOnStr,
          graceEndsOn,
          diffDays,
        };
        break; // Cannot get more severe than SUSPENDED
      } else if (diffDays > 0 && mostSevereStatus === "ACTIVE") {
        // Past due but within grace -> GRACE
        mostSevereStatus = "GRACE";
        blockingChargeInfo = {
          publicId: String(ch.public_id),
          title: String(ch.title),
          amountCents: Number(ch.amount_cents),
          dueOn: dueOnStr,
          graceEndsOn,
          diffDays,
        };
      }
    }

    if (mostSevereStatus === "SUSPENDED") {
      return {
        effectiveStatus: "SUSPENDED",
        administrativeStatus: "ACTIVE",
        effectiveReason: "NONPAYMENT",
        isOperationalAllowed: false,
        blockingCharge: blockingChargeInfo,
      };
    }

    if (mostSevereStatus === "GRACE") {
      return {
        effectiveStatus: "GRACE",
        administrativeStatus: "ACTIVE",
        effectiveReason: "NONPAYMENT",
        isOperationalAllowed: true, // Operational modules remain functional during GRACE
        blockingCharge: blockingChargeInfo,
      };
    }

    return {
      effectiveStatus: "ACTIVE",
      administrativeStatus: "ACTIVE",
      effectiveReason: "NONE",
      isOperationalAllowed: true,
    };
  } catch {
    return {
      effectiveStatus: "SUSPENDED",
      administrativeStatus: "SUSPENDED",
      effectiveReason: "ADMINISTRATIVE",
      isOperationalAllowed: false,
      manualSuspensionReason: "Falha ao verificar status da assinatura.",
    };
  } finally {
    if (connection) connection.release();
  }
}

// ==========================================
// SUBSCRIPTION & BILLING QUERIES
// ==========================================

export async function getConsultancySubscriptionDetail(
  consultancyId: number,
  consultancyTimezone: string
): Promise<ConsultancySubscriptionDetailView | null> {
  let connection;
  try {
    connection = await getDbConnection();

    // 1. Consultancy & Subscription
    const [subRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        c.id AS consultancy_id,
        c.public_id AS consultancy_public_id,
        c.name AS consultancy_name,
        c.slug AS consultancy_slug,
        c.timezone AS consultancy_timezone,
        cps.public_id AS subscription_public_id,
        cps.administrative_status,
        cps.manual_suspension_reason,
        cps.cancellation_reason
       FROM consultancies c
       INNER JOIN consultancy_platform_subscriptions cps ON cps.consultancy_id = c.id
       WHERE c.id = ?
       LIMIT 1;`,
      [consultancyId]
    );

    if (!Array.isArray(subRows) || subRows.length === 0) {
      return null;
    }

    const r = subRows[0];
    const accessState = await getPlatformEffectiveAccessState(consultancyId, consultancyTimezone);

    // 2. Charges
    const [chargeRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        cpc.id,
        cpc.public_id,
        cpc.title,
        cpc.description,
        cpc.amount_cents,
        cpc.currency,
        DATE_FORMAT(cpc.due_on, '%Y-%m-%d') AS due_on_str,
        DATE_FORMAT(cpc.period_start, '%Y-%m-%d') AS period_start_str,
        DATE_FORMAT(cpc.period_end, '%Y-%m-%d') AS period_end_str,
        cpc.grace_days_snapshot,
        cpc.status,
        cpc.created_at,
        cpp.public_id AS payment_public_id,
        cpp.confirmed_at AS paid_at,
        cpr_sub.public_id AS submitted_receipt_public_id,
        cpr_sub.file_name AS submitted_receipt_file_name,
        cpr_sub.created_at AS submitted_receipt_at
       FROM consultancy_platform_charges cpc
       LEFT JOIN consultancy_platform_payments cpp ON cpp.charge_id = cpc.id
       LEFT JOIN consultancy_platform_receipts cpr_sub ON cpr_sub.charge_id = cpc.id AND cpr_sub.status = 'SUBMITTED'
       WHERE cpc.consultancy_id = ?
       ORDER BY cpc.due_on DESC, cpc.id DESC;`,
      [consultancyId]
    );

    const openCharges: PlatformChargeListItemView[] = [];
    const paidCharges: PlatformChargeListItemView[] = [];
    const canceledCharges: PlatformChargeListItemView[] = [];

    if (Array.isArray(chargeRows)) {
      for (const ch of chargeRows) {
        const item: PlatformChargeListItemView = {
          publicId: String(ch.public_id),
          consultancyPublicId: String(r.consultancy_public_id),
          title: String(ch.title),
          description: ch.description ? String(ch.description) : null,
          amountCents: Number(ch.amount_cents),
          currency: String(ch.currency),
          dueOn: String(ch.due_on_str),
          periodStart: ch.period_start_str ? String(ch.period_start_str) : null,
          periodEnd: ch.period_end_str ? String(ch.period_end_str) : null,
          graceDaysSnapshot: Number(ch.grace_days_snapshot),
          status: ch.status as PlatformChargeStatus,
          isPaid: !!ch.payment_public_id,
          paymentPublicId: ch.payment_public_id ? String(ch.payment_public_id) : undefined,
          paidAt: ch.paid_at ? new Date(ch.paid_at) : undefined,
          submittedReceiptPublicId: ch.submitted_receipt_public_id ? String(ch.submitted_receipt_public_id) : undefined,
          submittedReceiptFileName: ch.submitted_receipt_file_name ? String(ch.submitted_receipt_file_name) : undefined,
          submittedReceiptAt: ch.submitted_receipt_at ? new Date(ch.submitted_receipt_at) : undefined,
          createdAt: new Date(ch.created_at),
        };

        if (item.status === "CANCELED") {
          canceledCharges.push(item);
        } else if (item.isPaid) {
          paidCharges.push(item);
        } else {
          openCharges.push(item);
        }
      }
    }

    // 3. Pending Receipts
    const [receiptRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        cpr.public_id,
        cpr.file_name,
        cpr.file_size_bytes,
        cpr.mime_type,
        cpr.status,
        cpr.rejection_reason,
        cpr.created_at,
        cpr.reviewed_at,
        cpc.public_id AS charge_public_id,
        cpc.title AS charge_title,
        cpc.amount_cents AS charge_amount_cents,
        DATE_FORMAT(cpc.due_on, '%Y-%m-%d') AS charge_due_on,
        u_sub.full_name AS submitter_name,
        u_rev.full_name AS reviewer_name
       FROM consultancy_platform_receipts cpr
       INNER JOIN consultancy_platform_charges cpc ON cpc.id = cpr.charge_id
       INNER JOIN users u_sub ON u_sub.id = cpr.submitted_by_user_id
       LEFT JOIN users u_rev ON u_rev.id = cpr.reviewed_by_user_id
       WHERE cpr.consultancy_id = ? AND cpr.status = 'SUBMITTED'
       ORDER BY cpr.id ASC;`,
      [consultancyId]
    );

    const pendingReceipts: PlatformReceiptItemView[] = Array.isArray(receiptRows)
      ? receiptRows.map((rc) => ({
          publicId: String(rc.public_id),
          consultancyPublicId: String(r.consultancy_public_id),
          consultancyName: String(r.consultancy_name),
          consultancySlug: String(r.consultancy_slug),
          chargePublicId: String(rc.charge_public_id),
          chargeTitle: String(rc.charge_title),
          chargeAmountCents: Number(rc.charge_amount_cents),
          chargeDueOn: String(rc.charge_due_on),
          fileName: String(rc.file_name),
          fileSizeBytes: Number(rc.file_size_bytes),
          mimeType: String(rc.mime_type),
          status: rc.status as PlatformReceiptStatus,
          rejectionReason: rc.rejection_reason ? String(rc.rejection_reason) : null,
          submitterName: String(rc.submitter_name),
          reviewerName: rc.reviewer_name ? String(rc.reviewer_name) : null,
          reviewedAt: rc.reviewed_at ? new Date(rc.reviewed_at) : null,
          createdAt: new Date(rc.created_at),
        }))
      : [];

    // 4. Payments History
    const [payRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        cpp.public_id,
        cpp.amount_cents,
        cpp.currency,
        cpp.method,
        cpp.confirmed_at,
        cpc.public_id AS charge_public_id,
        cpc.title AS charge_title,
        cpr.public_id AS receipt_public_id,
        u.full_name AS confirmer_name
       FROM consultancy_platform_payments cpp
       INNER JOIN consultancy_platform_charges cpc ON cpc.id = cpp.charge_id
       INNER JOIN consultancy_platform_receipts cpr ON cpr.id = cpp.receipt_id
       INNER JOIN users u ON u.id = cpp.confirmed_by_user_id
       WHERE cpp.consultancy_id = ?
       ORDER BY cpp.confirmed_at DESC
       LIMIT 20;`,
      [consultancyId]
    );

    const recentPayments: PlatformPaymentItemView[] = Array.isArray(payRows)
      ? payRows.map((p) => ({
          publicId: String(p.public_id),
          consultancyPublicId: String(r.consultancy_public_id),
          chargePublicId: String(p.charge_public_id),
          chargeTitle: String(p.charge_title),
          receiptPublicId: String(p.receipt_public_id),
          amountCents: Number(p.amount_cents),
          currency: String(p.currency),
          method: String(p.method),
          confirmerName: String(p.confirmer_name),
          confirmedAt: new Date(p.confirmed_at),
        }))
      : [];

    return {
      consultancyId: Number(r.consultancy_id),
      consultancyPublicId: String(r.consultancy_public_id),
      consultancyName: String(r.consultancy_name),
      consultancySlug: String(r.consultancy_slug),
      consultancyTimezone: String(r.consultancy_timezone),
      subscriptionPublicId: String(r.subscription_public_id),
      administrativeStatus: r.administrative_status as SubscriptionAdminStatus,
      effectiveStatus: accessState.effectiveStatus,
      effectiveReason: accessState.effectiveReason,
      manualSuspensionReason: r.manual_suspension_reason ? String(r.manual_suspension_reason) : null,
      cancellationReason: r.cancellation_reason ? String(r.cancellation_reason) : null,
      openCharges,
      paidCharges,
      canceledCharges,
      pendingReceipts,
      recentPayments,
      blockingCharge: accessState.blockingCharge,
    };
  } catch {
    return null;
  } finally {
    if (connection) connection.release();
  }
}

// ==========================================
// PLATFORM ADMIN CHARGES & SUBSCRIPTIONS
// ==========================================

export async function listAllPlatformSubscriptions(): Promise<
  {
    consultancyId: number;
    consultancyPublicId: string;
    consultancyName: string;
    consultancySlug: string;
    consultancyTimezone: string;
    subscriptionPublicId: string;
    administrativeStatus: SubscriptionAdminStatus;
    effectiveStatus: EffectivePlatformStatus;
    openChargesCount: number;
    pendingReceiptsCount: number;
  }[]
> {
  let connection;
  try {
    connection = await getDbConnection();
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        c.id AS consultancy_id,
        c.public_id AS consultancy_public_id,
        c.name AS consultancy_name,
        c.slug AS consultancy_slug,
        c.timezone AS consultancy_timezone,
        cps.public_id AS subscription_public_id,
        cps.administrative_status,
        (
          SELECT COUNT(*)
          FROM consultancy_platform_charges cpc
          LEFT JOIN consultancy_platform_payments cpp ON cpp.charge_id = cpc.id
          WHERE cpc.consultancy_id = c.id AND cpc.status = 'OPEN' AND cpp.id IS NULL
        ) AS open_charges_count,
        (
          SELECT COUNT(*)
          FROM consultancy_platform_receipts cpr
          WHERE cpr.consultancy_id = c.id AND cpr.status = 'SUBMITTED'
        ) AS pending_receipts_count
       FROM consultancies c
       INNER JOIN consultancy_platform_subscriptions cps ON cps.consultancy_id = c.id
       WHERE c.deleted_at IS NULL
       ORDER BY c.name ASC;`
    );

    if (!Array.isArray(rows)) return [];

    const result = [];
    for (const r of rows) {
      const tz = String(r.consultancy_timezone);
      const accessState = await getPlatformEffectiveAccessState(Number(r.consultancy_id), tz);
      result.push({
        consultancyId: Number(r.consultancy_id),
        consultancyPublicId: String(r.consultancy_public_id),
        consultancyName: String(r.consultancy_name),
        consultancySlug: String(r.consultancy_slug),
        consultancyTimezone: tz,
        subscriptionPublicId: String(r.subscription_public_id),
        administrativeStatus: r.administrative_status as SubscriptionAdminStatus,
        effectiveStatus: accessState.effectiveStatus,
        openChargesCount: Number(r.open_charges_count || 0),
        pendingReceiptsCount: Number(r.pending_receipts_count || 0),
      });
    }

    return result;
  } catch {
    return [];
  } finally {
    if (connection) connection.release();
  }
}

export async function listPendingPlatformReceipts(): Promise<PlatformReceiptItemView[]> {
  let connection;
  try {
    connection = await getDbConnection();
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        cpr.public_id,
        cpr.file_name,
        cpr.file_size_bytes,
        cpr.mime_type,
        cpr.status,
        cpr.rejection_reason,
        cpr.created_at,
        cpr.reviewed_at,
        c.public_id AS consultancy_public_id,
        c.name AS consultancy_name,
        c.slug AS consultancy_slug,
        cpc.public_id AS charge_public_id,
        cpc.title AS charge_title,
        cpc.amount_cents AS charge_amount_cents,
        DATE_FORMAT(cpc.due_on, '%Y-%m-%d') AS charge_due_on,
        u_sub.full_name AS submitter_name,
        u_rev.full_name AS reviewer_name
       FROM consultancy_platform_receipts cpr
       INNER JOIN consultancies c ON c.id = cpr.consultancy_id
       INNER JOIN consultancy_platform_charges cpc ON cpc.id = cpr.charge_id
       INNER JOIN users u_sub ON u_sub.id = cpr.submitted_by_user_id
       LEFT JOIN users u_rev ON u_rev.id = cpr.reviewed_by_user_id
       WHERE cpr.status = 'SUBMITTED'
       ORDER BY cpr.id ASC;`
    );

    if (!Array.isArray(rows)) return [];

    return rows.map((rc) => ({
      publicId: String(rc.public_id),
      consultancyPublicId: String(rc.consultancy_public_id),
      consultancyName: String(rc.consultancy_name),
      consultancySlug: String(rc.consultancy_slug),
      chargePublicId: String(rc.charge_public_id),
      chargeTitle: String(rc.charge_title),
      chargeAmountCents: Number(rc.charge_amount_cents),
      chargeDueOn: String(rc.charge_due_on),
      fileName: String(rc.file_name),
      fileSizeBytes: Number(rc.file_size_bytes),
      mimeType: String(rc.mime_type),
      status: rc.status as PlatformReceiptStatus,
      rejectionReason: rc.rejection_reason ? String(rc.rejection_reason) : null,
      submitterName: String(rc.submitter_name),
      reviewerName: rc.reviewer_name ? String(rc.reviewer_name) : null,
      reviewedAt: rc.reviewed_at ? new Date(rc.reviewed_at) : null,
      createdAt: new Date(rc.created_at),
    }));
  } catch {
    return [];
  } finally {
    if (connection) connection.release();
  }
}

export async function createPlatformCharge(params: {
  actorUserId: number;
  consultancyPublicId: string;
  title: string;
  description?: string | null;
  amountCents: number;
  dueOn: string; // YYYY-MM-DD
  periodStart?: string | null;
  periodEnd?: string | null;
}): Promise<{ success: true; chargePublicId: string } | { success: false; error: string; field?: string }> {
  const { actorUserId, consultancyPublicId, title, description, amountCents, dueOn, periodStart, periodEnd } = params;

  const normalizedTitle = (title || "").trim();
  if (normalizedTitle.length < 1 || normalizedTitle.length > 160) {
    return { success: false, error: "O título da cobrança deve ter entre 1 e 160 caracteres.", field: "title" };
  }

  if (typeof amountCents !== "number" || amountCents < 1 || amountCents > 100_000_000 || !Number.isInteger(amountCents)) {
    return { success: false, error: "O valor da cobrança deve ser entre R$ 0,01 e R$ 1.000.000,00.", field: "amountCents" };
  }

  const normalizedDueOn = (dueOn || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDueOn)) {
    return { success: false, error: "Data de vencimento inválida (use AAAA-MM-DD).", field: "dueOn" };
  }

  const normalizedPeriodStart = periodStart && /^\d{4}-\d{2}-\d{2}$/.test(periodStart.trim()) ? periodStart.trim() : null;
  const normalizedPeriodEnd = periodEnd && /^\d{4}-\d{2}-\d{2}$/.test(periodEnd.trim()) ? periodEnd.trim() : null;
  const normalizedDesc = description ? description.trim().slice(0, 2000) : null;

  let connection;
  try {
    connection = await getDbConnection();

    // 1. Ensure platform settings exist
    const [settingsRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM platform_billing_settings LIMIT 1;`
    );
    if (!Array.isArray(settingsRows) || settingsRows.length === 0) {
      return {
        success: false,
        error: "As configurações Pix da plataforma ainda não foram configuradas. Configure-as antes de emitir cobranças.",
      };
    }

    // 2. Fetch target consultancy & subscription
    const [consRows] = await connection.execute<RowDataPacket[]>(
      `SELECT c.id, c.status, cps.administrative_status
       FROM consultancies c
       LEFT JOIN consultancy_platform_subscriptions cps ON cps.consultancy_id = c.id
       WHERE c.public_id = ? AND c.deleted_at IS NULL
       LIMIT 1;`,
      [consultancyPublicId]
    );

    if (!Array.isArray(consRows) || consRows.length === 0) {
      return { success: false, error: "Consultoria não encontrada.", field: "consultancyPublicId" };
    }

    const cons = consRows[0];
    if (cons.administrative_status === "CANCELED") {
      return { success: false, error: "Não é permitido gerar cobranças para uma consultoria cancelada." };
    }

    const consultancyId = Number(cons.id);
    const chargePublicId = randomUUID();

    await connection.beginTransaction();

    await connection.execute(
      `INSERT INTO consultancy_platform_charges
       (public_id, consultancy_id, title, description, amount_cents, currency, due_on, period_start, period_end, grace_days_snapshot, status, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, 'BRL', ?, ?, ?, ?, 'OPEN', ?);`,
      [
        chargePublicId,
        consultancyId,
        normalizedTitle,
        normalizedDesc,
        amountCents,
        normalizedDueOn,
        normalizedPeriodStart,
        normalizedPeriodEnd,
        PLATFORM_GRACE_DAYS_DEFAULT,
        actorUserId,
      ]
    );

    await connection.execute(
      `INSERT INTO audit_events
       (public_id, actor_user_id, consultancy_id, action, target_type, target_public_id, metadata_json)
       VALUES (?, ?, ?, 'PLATFORM_CHARGE_CREATED', 'PLATFORM_CHARGE', ?, ?);`,
      [
        randomUUID(),
        actorUserId,
        consultancyId,
        chargePublicId,
        JSON.stringify({ title: normalizedTitle, amountCents, dueOn: normalizedDueOn }),
      ]
    );

    await connection.commit();
    return { success: true, chargePublicId };
  } catch (err: unknown) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    const msg = err instanceof Error ? err.message : "Erro desconhecido.";
    return { success: false, error: `Erro ao criar cobrança da plataforma: ${msg}` };
  } finally {
    if (connection) connection.release();
  }
}

export async function cancelPlatformCharge(params: {
  actorUserId: number;
  chargePublicId: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const { actorUserId, chargePublicId } = params;

  let connection;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 1. Lock charge
    const [chargeRows] = await connection.execute<RowDataPacket[]>(
      `SELECT cpc.id, cpc.consultancy_id, cpc.status, cpp.id AS payment_id
       FROM consultancy_platform_charges cpc
       LEFT JOIN consultancy_platform_payments cpp ON cpp.charge_id = cpc.id
       WHERE cpc.public_id = ?
       LIMIT 1
       FOR UPDATE;`,
      [chargePublicId]
    );

    if (!Array.isArray(chargeRows) || chargeRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Cobrança não encontrada." };
    }

    const ch = chargeRows[0];
    if (ch.status === "CANCELED") {
      await connection.rollback();
      return { success: false, error: "A cobrança já está cancelada." };
    }
    if (ch.payment_id) {
      await connection.rollback();
      return { success: false, error: "Não é permitido cancelar uma cobrança já quitada." };
    }

    // 2. Check for active SUBMITTED receipt
    const [receiptRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM consultancy_platform_receipts
       WHERE charge_id = ? AND status = 'SUBMITTED'
       LIMIT 1
       FOR UPDATE;`,
      [ch.id]
    );

    if (Array.isArray(receiptRows) && receiptRows.length > 0) {
      await connection.rollback();
      return {
        success: false,
        error: "Esta cobrança possui um comprovante em análise. Avalie ou rejeite o comprovante antes de cancelar a cobrança.",
      };
    }

    await connection.execute(
      `UPDATE consultancy_platform_charges
       SET status = 'CANCELED', canceled_by_user_id = ?, canceled_at = UTC_TIMESTAMP(3), updated_at = UTC_TIMESTAMP(3)
       WHERE id = ?;`,
      [actorUserId, ch.id]
    );

    await connection.execute(
      `INSERT INTO audit_events
       (public_id, actor_user_id, consultancy_id, action, target_type, target_public_id, metadata_json)
       VALUES (?, ?, ?, 'PLATFORM_CHARGE_CANCELED', 'PLATFORM_CHARGE', ?, ?);`,
      [randomUUID(), actorUserId, ch.consultancy_id, chargePublicId, JSON.stringify({ previousStatus: "OPEN" })]
    );

    await connection.commit();
    return { success: true };
  } catch (err: unknown) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    const msg = err instanceof Error ? err.message : "Erro desconhecido.";
    return { success: false, error: `Erro ao cancelar cobrança: ${msg}` };
  } finally {
    if (connection) connection.release();
  }
}

// ==========================================
// MANUAL SUBSCRIPTION TRANSITIONS
// ==========================================

export async function updateSubscriptionAdminStatus(params: {
  actorUserId: number;
  consultancyPublicId: string;
  targetStatus: SubscriptionAdminStatus;
  reason: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const { actorUserId, consultancyPublicId, targetStatus, reason } = params;

  const normalizedReason = (reason || "").trim();
  if ((targetStatus === "SUSPENDED" || targetStatus === "CANCELED") && (normalizedReason.length < 2 || normalizedReason.length > 500)) {
    return { success: false, error: "O motivo da alteração é obrigatório (entre 2 e 500 caracteres)." };
  }

  let connection;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT cps.id, cps.consultancy_id, cps.administrative_status
       FROM consultancy_platform_subscriptions cps
       INNER JOIN consultancies c ON c.id = cps.consultancy_id
       WHERE c.public_id = ?
       LIMIT 1
       FOR UPDATE;`,
      [consultancyPublicId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Assinatura da consultoria não encontrada." };
    }

    const sub = rows[0];
    const currentStatus = sub.administrative_status as SubscriptionAdminStatus;

    if (currentStatus === "CANCELED") {
      await connection.rollback();
      return { success: false, error: "A assinatura está cancelada permanentemente e não pode ser reaberta." };
    }

    if (currentStatus === targetStatus) {
      await connection.rollback();
      return { success: false, error: `A assinatura já se encontra no status ${targetStatus}.` };
    }

    let auditAction = "";
    if (targetStatus === "SUSPENDED") {
      await connection.execute(
        `UPDATE consultancy_platform_subscriptions
         SET administrative_status = 'SUSPENDED',
             manual_suspension_reason = ?,
             manual_suspension_by_user_id = ?,
             manual_suspension_at = UTC_TIMESTAMP(3),
             updated_at = UTC_TIMESTAMP(3)
         WHERE id = ?;`,
        [normalizedReason, actorUserId, sub.id]
      );
      auditAction = "PLATFORM_SUBSCRIPTION_SUSPENDED";
    } else if (targetStatus === "ACTIVE") {
      await connection.execute(
        `UPDATE consultancy_platform_subscriptions
         SET administrative_status = 'ACTIVE',
             manual_suspension_reason = NULL,
             manual_suspension_by_user_id = NULL,
             manual_suspension_at = NULL,
             updated_at = UTC_TIMESTAMP(3)
         WHERE id = ?;`,
        [sub.id]
      );
      auditAction = "PLATFORM_SUBSCRIPTION_REACTIVATED";
    } else if (targetStatus === "CANCELED") {
      await connection.execute(
        `UPDATE consultancy_platform_subscriptions
         SET administrative_status = 'CANCELED',
             cancellation_reason = ?,
             canceled_by_user_id = ?,
             canceled_at = UTC_TIMESTAMP(3),
             updated_at = UTC_TIMESTAMP(3)
         WHERE id = ?;`,
        [normalizedReason, actorUserId, sub.id]
      );
      auditAction = "PLATFORM_SUBSCRIPTION_CANCELED";
    }

    await connection.execute(
      `INSERT INTO audit_events
       (public_id, actor_user_id, consultancy_id, action, target_type, target_public_id, metadata_json)
       VALUES (?, ?, ?, ?, 'PLATFORM_SUBSCRIPTION', ?, ?);`,
      [
        randomUUID(),
        actorUserId,
        sub.consultancy_id,
        auditAction,
        consultancyPublicId,
        JSON.stringify({ previousStatus: currentStatus, newStatus: targetStatus, reason: normalizedReason }),
      ]
    );

    await connection.commit();
    return { success: true };
  } catch (err: unknown) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    const msg = err instanceof Error ? err.message : "Erro desconhecido.";
    return { success: false, error: `Erro ao alterar status da assinatura: ${msg}` };
  } finally {
    if (connection) connection.release();
  }
}

// ==========================================
// RECEIPT SUBMISSION & REVIEW
// ==========================================

export async function submitPlatformReceipt(params: {
  actorUserId: number;
  actorMembershipId: number;
  consultancyId: number;
  chargePublicId: string;
  file: {
    buffer: Buffer;
    fileName: string;
    clientMime: string;
  };
}): Promise<{ success: true; receiptPublicId: string } | { success: false; error: string }> {
  const { actorUserId, consultancyId, chargePublicId, file } = params;

  if (!file.buffer || file.buffer.length === 0) {
    return { success: false, error: "Arquivo vazio." };
  }
  if (file.buffer.length > MAX_PLATFORM_RECEIPT_FILE_SIZE_BYTES) {
    return { success: false, error: "O comprovante excede o tamanho máximo de 5 MB." };
  }

  const detection = detectReceiptFileType(file.buffer, file.clientMime);
  if (!detection.valid || !detection.extension || !detection.mimeType) {
    return { success: false, error: detection.error || "Formato de arquivo não suportado." };
  }

  // Write private file first
  let writeResult;
  try {
    writeResult = await writePrivateFile({
      buffer: file.buffer,
      extension: detection.extension,
      originalFileName: file.fileName,
      namespace: "platform-receipts",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Falha ao gravar arquivo.";
    return { success: false, error: msg };
  }

  let connection;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 1. Lock charge
    const [chargeRows] = await connection.execute<RowDataPacket[]>(
      `SELECT cpc.id, cpc.status, cpp.id AS payment_id
       FROM consultancy_platform_charges cpc
       LEFT JOIN consultancy_platform_payments cpp ON cpp.charge_id = cpc.id
       WHERE cpc.public_id = ? AND cpc.consultancy_id = ?
       LIMIT 1
       FOR UPDATE;`,
      [chargePublicId, consultancyId]
    );

    if (!Array.isArray(chargeRows) || chargeRows.length === 0) {
      await connection.rollback();
      await deletePrivateFile(writeResult.fileStorageKey);
      return { success: false, error: "Cobrança não encontrada." };
    }

    const ch = chargeRows[0];
    if (ch.status !== "OPEN") {
      await connection.rollback();
      await deletePrivateFile(writeResult.fileStorageKey);
      return { success: false, error: "Esta cobrança não está mais aberta." };
    }
    if (ch.payment_id) {
      await connection.rollback();
      await deletePrivateFile(writeResult.fileStorageKey);
      return { success: false, error: "Esta cobrança já foi quitada." };
    }

    // 2. Check existing SUBMITTED receipt
    const [subRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM consultancy_platform_receipts
       WHERE charge_id = ? AND status = 'SUBMITTED'
       LIMIT 1
       FOR UPDATE;`,
      [ch.id]
    );

    if (Array.isArray(subRows) && subRows.length > 0) {
      await connection.rollback();
      await deletePrivateFile(writeResult.fileStorageKey);
      return { success: false, error: "Já existe um comprovante em análise para esta cobrança." };
    }

    const receiptPublicId = randomUUID();

    await connection.execute(
      `INSERT INTO consultancy_platform_receipts
       (public_id, consultancy_id, charge_id, file_name, file_size_bytes, mime_type, sha256_hash, storage_key, status, submitted_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', ?);`,
      [
        receiptPublicId,
        consultancyId,
        ch.id,
        writeResult.originalFileName,
        writeResult.sizeBytes,
        detection.mimeType,
        writeResult.fileSha256,
        writeResult.fileStorageKey,
        actorUserId,
      ]
    );

    await connection.execute(
      `INSERT INTO audit_events
       (public_id, actor_user_id, consultancy_id, action, target_type, target_public_id, metadata_json)
       VALUES (?, ?, ?, 'PLATFORM_RECEIPT_SUBMITTED', 'PLATFORM_RECEIPT', ?, ?);`,
      [randomUUID(), actorUserId, consultancyId, receiptPublicId, JSON.stringify({ chargePublicId })]
    );

    await connection.commit();
    return { success: true, receiptPublicId };
  } catch (err: unknown) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    await deletePrivateFile(writeResult.fileStorageKey);
    const msg = err instanceof Error ? err.message : "Erro desconhecido.";
    return { success: false, error: `Erro ao enviar comprovante: ${msg}` };
  } finally {
    if (connection) connection.release();
  }
}

export async function reviewPlatformReceipt(params: {
  actorUserId: number;
  receiptPublicId: string;
  decision: "APPROVED" | "REJECTED";
  rejectionReason?: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const { actorUserId, receiptPublicId, decision, rejectionReason } = params;

  const normalizedReason = (rejectionReason || "").trim();
  if (decision === "REJECTED" && (normalizedReason.length < 2 || normalizedReason.length > 255)) {
    return { success: false, error: "O motivo da rejeição deve ter entre 2 e 255 caracteres." };
  }

  let connection;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 1. Lock receipt and associated charge
    const [receiptRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        cpr.id AS receipt_id,
        cpr.public_id AS receipt_public_id,
        cpr.consultancy_id,
        cpr.charge_id,
        cpr.status AS receipt_status,
        cpc.public_id AS charge_public_id,
        cpc.amount_cents,
        cpc.currency,
        cpc.status AS charge_status,
        cpp.id AS payment_id
       FROM consultancy_platform_receipts cpr
       INNER JOIN consultancy_platform_charges cpc ON cpc.id = cpr.charge_id
       LEFT JOIN consultancy_platform_payments cpp ON cpp.charge_id = cpc.id
       WHERE cpr.public_id = ?
       LIMIT 1
       FOR UPDATE;`,
      [receiptPublicId]
    );

    if (!Array.isArray(receiptRows) || receiptRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Comprovante não encontrado." };
    }

    const r = receiptRows[0];
    if (r.receipt_status !== "SUBMITTED") {
      await connection.rollback();
      return { success: false, error: "Este comprovante já foi avaliado anteriormente." };
    }
    if (r.charge_status !== "OPEN") {
      await connection.rollback();
      return { success: false, error: "A cobrança associada não está aberta." };
    }
    if (r.payment_id) {
      await connection.rollback();
      return { success: false, error: "A cobrança associada já foi quitada por outro pagamento." };
    }

    if (decision === "APPROVED") {
      // 2. Set receipt APPROVED
      await connection.execute(
        `UPDATE consultancy_platform_receipts
         SET status = 'APPROVED', reviewed_by_user_id = ?, reviewed_at = UTC_TIMESTAMP(3), updated_at = UTC_TIMESTAMP(3)
         WHERE id = ?;`,
        [actorUserId, r.receipt_id]
      );

      // 3. Insert payment row (the sole real authority of payment)
      const paymentPublicId = randomUUID();
      await connection.execute(
        `INSERT INTO consultancy_platform_payments
         (public_id, consultancy_id, charge_id, receipt_id, amount_cents, currency, method, confirmed_by_user_id, confirmed_at)
         VALUES (?, ?, ?, ?, ?, ?, 'PIX_MANUAL', ?, UTC_TIMESTAMP(3));`,
        [paymentPublicId, r.consultancy_id, r.charge_id, r.receipt_id, r.amount_cents, r.currency || "BRL", actorUserId]
      );

      // 4. Audit events
      await connection.execute(
        `INSERT INTO audit_events
         (public_id, actor_user_id, consultancy_id, action, target_type, target_public_id, metadata_json)
         VALUES (?, ?, ?, 'PLATFORM_RECEIPT_APPROVED', 'PLATFORM_RECEIPT', ?, ?);`,
        [randomUUID(), actorUserId, r.consultancy_id, receiptPublicId, JSON.stringify({ chargePublicId: r.charge_public_id })]
      );

      await connection.execute(
        `INSERT INTO audit_events
         (public_id, actor_user_id, consultancy_id, action, target_type, target_public_id, metadata_json)
         VALUES (?, ?, ?, 'PLATFORM_PAYMENT_CONFIRMED', 'PLATFORM_PAYMENT', ?, ?);`,
        [
          randomUUID(),
          actorUserId,
          r.consultancy_id,
          paymentPublicId,
          JSON.stringify({ chargePublicId: r.charge_public_id, amountCents: r.amount_cents }),
        ]
      );
    } else {
      // REJECTED
      await connection.execute(
        `UPDATE consultancy_platform_receipts
         SET status = 'REJECTED', rejection_reason = ?, reviewed_by_user_id = ?, reviewed_at = UTC_TIMESTAMP(3), updated_at = UTC_TIMESTAMP(3)
         WHERE id = ?;`,
        [normalizedReason, actorUserId, r.receipt_id]
      );

      await connection.execute(
        `INSERT INTO audit_events
         (public_id, actor_user_id, consultancy_id, action, target_type, target_public_id, metadata_json)
         VALUES (?, ?, ?, 'PLATFORM_RECEIPT_REJECTED', 'PLATFORM_RECEIPT', ?, ?);`,
        [
          randomUUID(),
          actorUserId,
          r.consultancy_id,
          receiptPublicId,
          JSON.stringify({ chargePublicId: r.charge_public_id, rejectionReason: normalizedReason }),
        ]
      );
    }

    await connection.commit();
    return { success: true };
  } catch (err: unknown) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    const msg = err instanceof Error ? err.message : "Erro desconhecido.";
    return { success: false, error: `Erro ao avaliar comprovante: ${msg}` };
  } finally {
    if (connection) connection.release();
  }
}

// ==========================================
// PRIVATE FILE DOWNLOAD & AUTH
// ==========================================

export async function getPlatformReceiptFileForDownload(params: {
  actorUserId: number;
  actorMembershipId?: number;
  isPlatformAdmin: boolean;
  filePublicId: string;
  consultancySlug?: string;
}): Promise<
  | { success: true; buffer: Buffer; mimeType: string; fileName: string }
  | { success: false; statusCode: number; error: string }
> {
  const { actorMembershipId, isPlatformAdmin, filePublicId, consultancySlug } = params;

  let connection;
  try {
    connection = await getDbConnection();

    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        cpr.file_name,
        cpr.file_size_bytes,
        cpr.mime_type,
        cpr.sha256_hash,
        cpr.storage_key,
        cpr.consultancy_id,
        c.slug AS consultancy_slug
       FROM consultancy_platform_receipts cpr
       INNER JOIN consultancies c ON c.id = cpr.consultancy_id
       WHERE cpr.public_id = ?
       LIMIT 1;`,
      [filePublicId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return { success: false, statusCode: 404, error: "Arquivo de comprovante não encontrado." };
    }

    const fileRecord = rows[0];

    if (consultancySlug && fileRecord.consultancy_slug !== consultancySlug && !isPlatformAdmin) {
      return { success: false, statusCode: 403, error: "Acesso não autorizado ao comprovante desta consultoria." };
    }

    // Authorization check:
    // PLATFORM_ADMIN -> ALLOWED
    // Or same-tenant CONSULTANCY_ADMIN -> ALLOWED
    let isAllowed = isPlatformAdmin;

    if (!isAllowed && actorMembershipId) {
      const [roleRows] = await connection.execute<RowDataPacket[]>(
        `SELECT cmr.role
         FROM consultancy_members cm
         INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
         WHERE cm.id = ? AND cm.consultancy_id = ? AND cm.status = 'ACTIVE' AND cmr.role = 'CONSULTANCY_ADMIN'
         LIMIT 1;`,
        [actorMembershipId, fileRecord.consultancy_id]
      );
      if (Array.isArray(roleRows) && roleRows.length > 0) {
        isAllowed = true;
      }
    }

    if (!isAllowed) {
      return { success: false, statusCode: 403, error: "Acesso não autorizado ao comprovante." };
    }

    const verified = await readVerifiedPrivateFile({
      fileStorageKey: fileRecord.storage_key,
      expectedSizeBytes: fileRecord.file_size_bytes,
      expectedFileSha256: fileRecord.sha256_hash,
      expectedMimeType: fileRecord.mime_type,
    });

    if (!verified.success || !verified.buffer || !verified.mimeType) {
      return { success: false, statusCode: 500, error: verified.error || "Falha na integridade do arquivo." };
    }

    return {
      success: true,
      buffer: verified.buffer,
      mimeType: verified.mimeType,
      fileName: fileRecord.file_name,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao processar arquivo.";
    return { success: false, statusCode: 500, error: msg };
  } finally {
    if (connection) connection.release();
  }
}
