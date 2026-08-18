import crypto from "node:crypto";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";

export type PixKeyType = "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "RANDOM";

export const VALID_PIX_KEY_TYPES: readonly PixKeyType[] = [
  "CPF",
  "CNPJ",
  "EMAIL",
  "PHONE",
  "RANDOM",
] as const;

export const PIX_KEY_TYPE_LABELS: Record<PixKeyType, string> = {
  CPF: "CPF",
  CNPJ: "CNPJ",
  EMAIL: "E-mail",
  PHONE: "Telefone / Celular",
  RANDOM: "Chave Aleatória (EVP)",
};

export type ChargePersistedState = "OPEN" | "CANCELED";
export type ReceiptStatus = "SUBMITTED" | "APPROVED" | "REJECTED";
export type PaymentMethod = "PIX_MANUAL";

export type StudentChargeDerivedStatus =
  | "PENDING"
  | "OVERDUE"
  | "UNDER_REVIEW"
  | "PAID"
  | "CANCELED";

export const STATUS_LABELS: Record<StudentChargeDerivedStatus, string> = {
  PENDING: "Pendente",
  OVERDUE: "Vencido",
  UNDER_REVIEW: "Em análise",
  PAID: "Pago",
  CANCELED: "Cancelado",
};

export const MAX_CHARGE_AMOUNT_CENTS = 100_000_000; // R$ 1.000.000,00

export type ConsultancyFinanceSettings = {
  publicId: string;
  consultancyId: number;
  pixKeyType: PixKeyType;
  pixKey: string;
  pixReceiverName: string;
  paymentInstructions: string | null;
  billingTimezone: string;
  createdAt: string;
  updatedAt: string;
};

export function isValidPixKeyType(type: unknown): type is PixKeyType {
  return typeof type === "string" && VALID_PIX_KEY_TYPES.includes(type as PixKeyType);
}

export function isValidIanaTimezone(tz: unknown): boolean {
  if (typeof tz !== "string" || !tz.trim()) {
    return false;
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz.trim() });
    return true;
  } catch {
    return false;
  }
}

export function getConsultancyLocalDate(timeZone: string, instant: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZone.trim(),
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(instant); // Returns YYYY-MM-DD in en-CA
  } catch {
    return instant.toISOString().slice(0, 10);
  }
}

export function isValidIsoCalendarDate(dateStr: unknown): boolean {
  if (typeof dateStr !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }

  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return false;
  }

  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day <= daysInMonth;
}

export function validatePixKey(type: PixKeyType, rawKey: unknown): { valid: boolean; error?: string } {
  if (typeof rawKey !== "string" || !rawKey.trim()) {
    return { valid: false, error: "A chave Pix é obrigatória." };
  }

  const key = rawKey.trim();

  if (key.length > 255) {
    return { valid: false, error: "A chave Pix excede o limite de caracteres." };
  }

  switch (type) {
    case "CPF": {
      const digits = key.replace(/\D/g, "");
      if (digits.length !== 11) {
        return { valid: false, error: "CPF deve conter exatamente 11 dígitos numéricos." };
      }
      return { valid: true };
    }
    case "CNPJ": {
      const digits = key.replace(/\D/g, "");
      if (digits.length !== 14) {
        return { valid: false, error: "CNPJ deve conter exatamente 14 dígitos numéricos." };
      }
      return { valid: true };
    }
    case "EMAIL": {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(key) || key.length > 100) {
        return { valid: false, error: "E-mail para chave Pix inválido." };
      }
      return { valid: true };
    }
    case "PHONE": {
      const digits = key.replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 14) {
        return { valid: false, error: "Telefone para chave Pix deve conter entre 10 e 14 dígitos (com DDD)." };
      }
      return { valid: true };
    }
    case "RANDOM": {
      const randomRegex = /^[0-9a-fA-F-]{32,36}$/;
      if (!randomRegex.test(key)) {
        return { valid: false, error: "Chave aleatória Pix inválida (formato EVP esperado)." };
      }
      return { valid: true };
    }
    default:
      return { valid: false, error: "Tipo de chave Pix não suportado." };
  }
}

/**
 * Pure string-based money parser.
 * Converts Brazilian Real formatted strings to integer cents without floating point arithmetic.
 * Examples: "297", "297,00", "1.297,50", "0,01", "1.000.000,00" -> cents.
 */
export function parseBrlToCents(raw: unknown): { valid: boolean; cents?: number; error?: string } {
  if (typeof raw !== "string" || !raw.trim()) {
    return { valid: false, error: "O valor é obrigatório." };
  }

  const trimmed = raw.trim();

  // Validate format: integer or dot-grouped thousands, comma with 1 or 2 decimals
  const brlRegex = /^(?:\d{1,3}(?:\.\d{3})*|\d+)(?:,\d{1,2})?$/;
  if (!brlRegex.test(trimmed)) {
    return { valid: false, error: "Formato de valor inválido. Exemplo: 297,00 ou 1.250,50" };
  }

  const withoutDots = trimmed.replace(/\./g, "");
  const [integers, decimals = ""] = withoutDots.split(",");
  const paddedDecimals = (decimals + "00").slice(0, 2);
  const centsStr = integers + paddedDecimals;
  const cents = parseInt(centsStr, 10);

  if (!Number.isSafeInteger(cents) || cents <= 0) {
    return { valid: false, error: "O valor deve ser maior que zero." };
  }

  if (cents > MAX_CHARGE_AMOUNT_CENTS) {
    return { valid: false, error: "O valor máximo permitido é de R$ 1.000.000,00." };
  }

  return { valid: true, cents };
}

/**
 * Formats integer cents to Brazilian Real string (R$ 1.250,00).
 */
export function formatCentsToBrl(amountCents: number): string {
  if (!Number.isSafeInteger(amountCents) || amountCents < 0) {
    return "R$ 0,00";
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amountCents / 100);
}

/**
 * Calculates start and end UTC bounds for the current month in the consultancy's billing timezone.
 */
export function getLocalMonthUtcBounds(
  timeZone: string,
  now: Date = new Date()
): { startUtc: string; nextMonthStartUtc: string } {
  const localDateStr = getConsultancyLocalDate(timeZone, now);
  const [yearStr, monthStr] = localDateStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;

  function localToUtc(y: number, m: number, d: number): Date {
    const guess = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone.trim(),
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    }).formatToParts(guess);

    const p: Record<string, number> = {};
    for (const part of parts) {
      if (part.type !== "literal") {
        p[part.type] = parseInt(part.value, 10);
      }
    }
    if (p.hour === 24) p.hour = 0;

    const targetLocalUtc = Date.UTC(y, m - 1, d, 0, 0, 0, 0);
    const parsedLocalUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, 0);
    const diffMs = targetLocalUtc - parsedLocalUtc;

    return new Date(guess.getTime() + diffMs);
  }

  const startUtcDate = localToUtc(year, month, 1);
  const nextStartUtcDate = localToUtc(nextYear, nextMonth, 1);

  return {
    startUtc: startUtcDate.toISOString().slice(0, 19).replace("T", " "),
    nextMonthStartUtc: nextStartUtcDate.toISOString().slice(0, 19).replace("T", " "),
  };
}

export type DeriveStatusParams = {
  state: ChargePersistedState;
  dueOn: string;
  localToday: string;
  hasConfirmedPayment: boolean;
  hasSubmittedReceipt: boolean;
};

/**
 * Pure helper for deriving student charge status from persisted facts.
 * Precedence:
 * 1. charge.state === "CANCELED" -> CANCELED
 * 2. confirmed payment exists -> PAID
 * 3. submitted receipt exists -> UNDER_REVIEW
 * 4. charge OPEN and dueOn < localToday -> OVERDUE
 * 5. otherwise -> PENDING
 */
export function deriveStudentChargeStatus(params: DeriveStatusParams): StudentChargeDerivedStatus {
  if (params.state === "CANCELED") {
    return "CANCELED";
  }

  if (params.hasConfirmedPayment) {
    return "PAID";
  }

  if (params.hasSubmittedReceipt) {
    return "UNDER_REVIEW";
  }

  if (params.dueOn < params.localToday) {
    return "OVERDUE";
  }

  return "PENDING";
}

export type EvaluateAccessChargeItem = {
  state: ChargePersistedState;
  dueOn: string;
  blocksAccess: boolean;
  hasConfirmedPayment: boolean;
};

/**
 * Pure helper for evaluating whether overdue unpaid blocking charges restrict a student's access.
 * Returns isRestricted = true only if at least one charge is OPEN, blocks_access = true, due_on < localToday, and has NO payment.
 */
export function evaluateStudentFinancialAccess(
  charges: EvaluateAccessChargeItem[],
  localToday: string
): { isRestricted: boolean; overdueBlockingCount: number } {
  let overdueBlockingCount = 0;

  for (const charge of charges) {
    if (
      charge.state === "OPEN" &&
      charge.blocksAccess &&
      charge.dueOn < localToday &&
      !charge.hasConfirmedPayment
    ) {
      overdueBlockingCount++;
    }
  }

  return {
    isRestricted: overdueBlockingCount > 0,
    overdueBlockingCount,
  };
}

// ============================================================================
// SERVER-SIDE DATABASE QUERIES & SERVICES
// ============================================================================

/**
 * Retrieves the finance settings for a specific consultancy.
 */
export async function getConsultancyFinanceSettings(
  consultancyId: number
): Promise<ConsultancyFinanceSettings | null> {
  if (!consultancyId || typeof consultancyId !== "number" || consultancyId <= 0) {
    return null;
  }

  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        public_id,
        consultancy_id,
        pix_key_type,
        pix_key,
        pix_receiver_name,
        payment_instructions,
        billing_timezone,
        created_at,
        updated_at
      FROM consultancy_finance_settings
      WHERE consultancy_id = ?
      LIMIT 1;`,
      [consultancyId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      publicId: String(row.public_id),
      consultancyId: Number(row.consultancy_id),
      pixKeyType: row.pix_key_type as PixKeyType,
      pixKey: String(row.pix_key),
      pixReceiverName: String(row.pix_receiver_name),
      paymentInstructions: row.payment_instructions ? String(row.payment_instructions) : null,
      billingTimezone: String(row.billing_timezone),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  } catch {
    return null;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export type SaveFinanceSettingsParams = {
  consultancyId: number;
  userId: number;
  pixKeyType: PixKeyType;
  pixKey: string;
  pixReceiverName: string;
  paymentInstructions?: string | null;
  billingTimezone: string;
};

/**
 * Creates or updates consultancy finance settings.
 * Must be called only by an authorized CONSULTANCY_ADMIN.
 */
export async function saveConsultancyFinanceSettings(
  params: SaveFinanceSettingsParams
): Promise<{ success: boolean; error?: string; settings?: ConsultancyFinanceSettings }> {
  const { consultancyId, userId, pixKeyType, pixKey, pixReceiverName, billingTimezone } = params;

  if (!consultancyId || consultancyId <= 0 || !userId || userId <= 0) {
    return { success: false, error: "Identificadores inválidos." };
  }

  if (!isValidPixKeyType(pixKeyType)) {
    return { success: false, error: "Tipo de chave Pix inválido." };
  }

  const pixValidation = validatePixKey(pixKeyType, pixKey);
  if (!pixValidation.valid) {
    return { success: false, error: pixValidation.error || "Chave Pix inválida." };
  }

  const trimmedReceiverName = (pixReceiverName || "").trim();
  if (!trimmedReceiverName || trimmedReceiverName.length > 150) {
    return { success: false, error: "Nome do titular do Pix é obrigatório (máximo 150 caracteres)." };
  }

  if (!isValidIanaTimezone(billingTimezone)) {
    return { success: false, error: "Fuso horário de cobrança inválido (deve ser um IANA timezone válido)." };
  }

  const cleanInstructions = params.paymentInstructions?.trim() || null;
  if (cleanInstructions && cleanInstructions.length > 1000) {
    return { success: false, error: "Instruções de pagamento excedem o limite de 1000 caracteres." };
  }

  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [existingRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id FROM consultancy_finance_settings WHERE consultancy_id = ? FOR UPDATE;`,
      [consultancyId]
    );

    let settingsPublicId: string;

    if (Array.isArray(existingRows) && existingRows.length > 0) {
      settingsPublicId = String(existingRows[0].public_id);
      await connection.execute(
        `UPDATE consultancy_finance_settings
         SET pix_key_type = ?,
             pix_key = ?,
             pix_receiver_name = ?,
             payment_instructions = ?,
             billing_timezone = ?,
             updated_by_user_id = ?,
             updated_at = UTC_TIMESTAMP(3)
         WHERE consultancy_id = ?;`,
        [
          pixKeyType,
          pixKey.trim(),
          trimmedReceiverName,
          cleanInstructions,
          billingTimezone.trim(),
          userId,
          consultancyId,
        ]
      );
    } else {
      settingsPublicId = crypto.randomUUID();
      await connection.execute(
        `INSERT INTO consultancy_finance_settings (
          public_id,
          consultancy_id,
          pix_key_type,
          pix_key,
          pix_receiver_name,
          payment_instructions,
          billing_timezone,
          created_by_user_id,
          updated_by_user_id,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3));`,
        [
          settingsPublicId,
          consultancyId,
          pixKeyType,
          pixKey.trim(),
          trimmedReceiverName,
          cleanInstructions,
          billingTimezone.trim(),
          userId,
          userId,
        ]
      );
    }

    const auditPublicId = crypto.randomUUID();
    await connection.execute(
      `INSERT INTO audit_events (
        public_id,
        actor_user_id,
        consultancy_id,
        action,
        target_type,
        target_public_id,
        metadata_json,
        created_at
      ) VALUES (?, ?, ?, 'FINANCE_SETTINGS_UPDATED', 'CONSULTANCY_FINANCE_SETTINGS', ?, ?, UTC_TIMESTAMP(3));`,
      [
        auditPublicId,
        userId,
        consultancyId,
        settingsPublicId,
        JSON.stringify({
          pixKeyType,
          billingTimezone: billingTimezone.trim(),
        }),
      ]
    );

    await connection.commit();

    return {
      success: true,
      settings: {
        publicId: settingsPublicId,
        consultancyId,
        pixKeyType,
        pixKey: pixKey.trim(),
        pixReceiverName: trimmedReceiverName,
        paymentInstructions: cleanInstructions,
        billingTimezone: billingTimezone.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  } catch {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    return { success: false, error: "Não foi possível salvar as configurações financeiras." };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export type CreateStudentChargeParams = {
  consultancyId: number;
  userId: number;
  studentMembershipPublicId: string;
  title: string;
  description?: string | null;
  amountCents: number;
  dueOn: string;
  referencePeriodStart?: string | null;
  referencePeriodEnd?: string | null;
  blocksAccess?: boolean;
};

/**
 * Creates a financial charge for a student.
 * Validates that student membership belongs to the same consultancy and has the STUDENT role.
 * If blocksAccess is true, verifies that consultancy finance settings exist.
 */
export async function createStudentCharge(
  params: CreateStudentChargeParams
): Promise<{ success: boolean; error?: string; chargePublicId?: string }> {
  const { consultancyId, userId, studentMembershipPublicId, title, amountCents, dueOn } = params;

  if (!consultancyId || consultancyId <= 0 || !userId || userId <= 0) {
    return { success: false, error: "Identificadores inválidos." };
  }

  const cleanTitle = (title || "").trim();
  if (!cleanTitle || cleanTitle.length > 150) {
    return { success: false, error: "Título da cobrança é obrigatório (máximo 150 caracteres)." };
  }

  const cleanDescription = params.description?.trim() || null;
  if (cleanDescription && cleanDescription.length > 500) {
    return { success: false, error: "Descrição da cobrança excede o limite de 500 caracteres." };
  }

  if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || amountCents > MAX_CHARGE_AMOUNT_CENTS) {
    return { success: false, error: "Valor da cobrança inválido (deve ser maior que zero e menor que R$ 1.000.000,00)." };
  }

  if (!isValidIsoCalendarDate(dueOn)) {
    return { success: false, error: "Data de vencimento inválida (formato AAAA-MM-DD esperado)." };
  }

  const refStart = params.referencePeriodStart?.trim() || null;
  const refEnd = params.referencePeriodEnd?.trim() || null;

  if (refStart && !isValidIsoCalendarDate(refStart)) {
    return { success: false, error: "Data inicial do período de referência inválida." };
  }
  if (refEnd && !isValidIsoCalendarDate(refEnd)) {
    return { success: false, error: "Data final do período de referência inválida." };
  }
  if (refStart && refEnd && refStart > refEnd) {
    return { success: false, error: "Data inicial do período de referência não pode ser posterior à data final." };
  }

  const blocksAccess = params.blocksAccess !== undefined ? Boolean(params.blocksAccess) : true;

  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    if (blocksAccess) {
      const [settingsRows] = await connection.execute<RowDataPacket[]>(
        `SELECT id FROM consultancy_finance_settings WHERE consultancy_id = ? LIMIT 1;`,
        [consultancyId]
      );
      if (!Array.isArray(settingsRows) || settingsRows.length === 0) {
        await connection.rollback();
        return {
          success: false,
          error: "A consultoria precisa configurar a chave Pix antes de emitir cobranças com bloqueio de acesso.",
        };
      }
    }

    const [memberRows] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id, cm.status, u.status AS user_status, u.deleted_at
       FROM consultancy_members cm
       INNER JOIN users u ON u.id = cm.user_id
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.public_id = ?
         AND cm.consultancy_id = ?
         AND cmr.role = 'STUDENT'
         AND cm.status = 'ACTIVE'
         AND u.status = 'ACTIVE'
         AND u.deleted_at IS NULL
       LIMIT 1;`,
      [studentMembershipPublicId.trim(), consultancyId]
    );

    if (!Array.isArray(memberRows) || memberRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Aluno não encontrado ou inativo nesta consultoria." };
    }

    const studentMembershipId = Number(memberRows[0].id);
    const chargePublicId = crypto.randomUUID();

    await connection.execute<ResultSetHeader>(
      `INSERT INTO student_charges (
        public_id,
        consultancy_id,
        student_membership_id,
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
      ) VALUES (?, ?, ?, ?, ?, ?, 'BRL', ?, ?, ?, ?, 'OPEN', ?, UTC_TIMESTAMP(3));`,
      [
        chargePublicId,
        consultancyId,
        studentMembershipId,
        cleanTitle,
        cleanDescription,
        amountCents,
        dueOn,
        refStart,
        refEnd,
        blocksAccess ? 1 : 0,
        userId,
      ]
    );

    const auditPublicId = crypto.randomUUID();
    await connection.execute(
      `INSERT INTO audit_events (
        public_id,
        actor_user_id,
        consultancy_id,
        action,
        target_type,
        target_public_id,
        metadata_json,
        created_at
      ) VALUES (?, ?, ?, 'STUDENT_CHARGE_CREATED', 'STUDENT_CHARGE', ?, ?, UTC_TIMESTAMP(3));`,
      [
        auditPublicId,
        userId,
        consultancyId,
        chargePublicId,
        JSON.stringify({
          amountCents,
          dueOn,
          blocksAccess,
          studentMembershipPublicId: studentMembershipPublicId.trim(),
        }),
      ]
    );

    await connection.commit();
    return { success: true, chargePublicId };
  } catch {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    return { success: false, error: "Não foi possível criar a cobrança." };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export type CancelStudentChargeParams = {
  consultancyId: number;
  userId: number;
  chargePublicId: string;
  cancelReason?: string | null;
};

/**
 * Cancels an open student charge.
 * Cannot cancel a charge that has already been confirmed as paid.
 */
export async function cancelStudentCharge(
  params: CancelStudentChargeParams
): Promise<{ success: boolean; error?: string }> {
  const { consultancyId, userId, chargePublicId } = params;

  if (!consultancyId || consultancyId <= 0 || !userId || userId <= 0 || !chargePublicId?.trim()) {
    return { success: false, error: "Identificadores inválidos." };
  }

  const cleanReason = params.cancelReason?.trim() || null;
  if (cleanReason && cleanReason.length > 255) {
    return { success: false, error: "Motivo do cancelamento excede o limite de 255 caracteres." };
  }

  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT sc.id, sc.consultancy_id, sc.state, sp.id AS payment_id
       FROM student_charges sc
       LEFT JOIN student_payments sp ON sp.charge_id = sc.id
       WHERE sc.public_id = ?
         AND sc.consultancy_id = ?
       FOR UPDATE;`,
      [chargePublicId.trim(), consultancyId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Cobrança não encontrada." };
    }

    const row = rows[0];

    if (row.payment_id !== null) {
      await connection.rollback();
      return { success: false, error: "Não é possível cancelar uma cobrança já paga." };
    }

    if (row.state === "CANCELED") {
      await connection.rollback();
      return { success: false, error: "Esta cobrança já se encontra cancelada." };
    }

    await connection.execute(
      `UPDATE student_charges
       SET state = 'CANCELED',
           canceled_by_user_id = ?,
           canceled_at = UTC_TIMESTAMP(3),
           cancel_reason = ?
       WHERE id = ?;`,
      [userId, cleanReason, Number(row.id)]
    );

    const auditPublicId = crypto.randomUUID();
    await connection.execute(
      `INSERT INTO audit_events (
        public_id,
        actor_user_id,
        consultancy_id,
        action,
        target_type,
        target_public_id,
        metadata_json,
        created_at
      ) VALUES (?, ?, ?, 'STUDENT_CHARGE_CANCELED', 'STUDENT_CHARGE', ?, ?, UTC_TIMESTAMP(3));`,
      [
        auditPublicId,
        userId,
        consultancyId,
        chargePublicId.trim(),
        JSON.stringify({
          cancelReason: cleanReason,
        }),
      ]
    );

    await connection.commit();
    return { success: true };
  } catch {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    return { success: false, error: "Não foi possível cancelar a cobrança." };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export type StudentFinancialAccessResult = {
  isConfigured: boolean;
  isRestricted: boolean;
  overdueChargeCount: number;
};

/**
 * Evaluates a student's financial access status in a consultancy.
 * Determines if there are any overdue, unpaid charges with blocks_access = true.
 */
export async function getStudentFinancialAccessState(params: {
  consultancyId: number;
  studentMembershipId: number;
}): Promise<StudentFinancialAccessResult> {
  const { consultancyId, studentMembershipId } = params;

  if (
    !consultancyId ||
    typeof consultancyId !== "number" ||
    consultancyId <= 0 ||
    !studentMembershipId ||
    typeof studentMembershipId !== "number" ||
    studentMembershipId <= 0
  ) {
    return { isConfigured: false, isRestricted: false, overdueChargeCount: 0 };
  }

  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();

    const [settingsRows] = await connection.execute<RowDataPacket[]>(
      `SELECT billing_timezone FROM consultancy_finance_settings WHERE consultancy_id = ? LIMIT 1;`,
      [consultancyId]
    );

    if (!Array.isArray(settingsRows) || settingsRows.length === 0) {
      return { isConfigured: false, isRestricted: false, overdueChargeCount: 0 };
    }

    const billingTimezone = String(settingsRows[0].billing_timezone);
    const localToday = getConsultancyLocalDate(billingTimezone);

    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS overdue_count
       FROM student_charges sc
       WHERE sc.consultancy_id = ?
         AND sc.student_membership_id = ?
         AND sc.state = 'OPEN'
         AND sc.blocks_access = 1
         AND sc.due_on < ?
         AND NOT EXISTS (
           SELECT 1 FROM student_payments sp WHERE sp.charge_id = sc.id
         );`,
      [consultancyId, studentMembershipId, localToday]
    );

    const overdueCount = Number(rows[0]?.overdue_count || 0);

    return {
      isConfigured: true,
      isRestricted: overdueCount > 0,
      overdueChargeCount: overdueCount,
    };
  } catch {
    return { isConfigured: false, isRestricted: false, overdueChargeCount: 0 };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// ============================================================================
// ADMIN READ SERVICES FOR T100B UI
// ============================================================================

export type FinanceDashboardMetrics = {
  toReceiveCents: number;
  overdueCount: number;
  paidThisMonthCents: number;
  underReviewCount: number;
  billingTimezone: string;
};

export async function getConsultancyFinanceDashboard(
  consultancyId: number
): Promise<FinanceDashboardMetrics> {
  if (!consultancyId || typeof consultancyId !== "number" || consultancyId <= 0) {
    return {
      toReceiveCents: 0,
      overdueCount: 0,
      paidThisMonthCents: 0,
      underReviewCount: 0,
      billingTimezone: "America/Sao_Paulo",
    };
  }

  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();

    // 1. Get timezone from settings (default to America/Sao_Paulo)
    const [settingsRows] = await connection.execute<RowDataPacket[]>(
      `SELECT billing_timezone FROM consultancy_finance_settings WHERE consultancy_id = ? LIMIT 1;`,
      [consultancyId]
    );
    const billingTimezone =
      Array.isArray(settingsRows) && settingsRows.length > 0 && settingsRows[0].billing_timezone
        ? String(settingsRows[0].billing_timezone)
        : "America/Sao_Paulo";

    const localToday = getConsultancyLocalDate(billingTimezone);
    const { startUtc, nextMonthStartUtc } = getLocalMonthUtcBounds(billingTimezone);

    // 2. Query metrics in parallel or aggregated safely without cartesian product
    const [openStatsRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        COALESCE(SUM(sc.amount_cents), 0) AS to_receive_cents,
        COUNT(DISTINCT CASE WHEN sc.due_on < ? THEN sc.id END) AS overdue_count,
        COUNT(DISTINCT CASE WHEN EXISTS (
          SELECT 1 FROM student_payment_receipts spr WHERE spr.charge_id = sc.id AND spr.status = 'SUBMITTED'
        ) THEN sc.id END) AS under_review_count
       FROM student_charges sc
       WHERE sc.consultancy_id = ?
         AND sc.state = 'OPEN'
         AND NOT EXISTS (
           SELECT 1 FROM student_payments sp WHERE sp.charge_id = sc.id
         );`,
      [localToday, consultancyId]
    );

    const [paidMonthRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COALESCE(SUM(sp.amount_cents), 0) AS paid_month_cents
       FROM student_payments sp
       WHERE sp.consultancy_id = ?
         AND sp.confirmed_at >= ?
         AND sp.confirmed_at < ?;`,
      [consultancyId, startUtc, nextMonthStartUtc]
    );

    const openRow = openStatsRows[0] || {};
    const paidRow = paidMonthRows[0] || {};

    return {
      toReceiveCents: Number(openRow.to_receive_cents) || 0,
      overdueCount: Number(openRow.overdue_count) || 0,
      paidThisMonthCents: Number(paidRow.paid_month_cents) || 0,
      underReviewCount: Number(openRow.under_review_count) || 0,
      billingTimezone,
    };
  } catch {
    return {
      toReceiveCents: 0,
      overdueCount: 0,
      paidThisMonthCents: 0,
      underReviewCount: 0,
      billingTimezone: "America/Sao_Paulo",
    };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export type StudentSearchItem = {
  membershipPublicId: string;
  fullName: string;
  email: string;
};

export async function searchConsultancyStudents(params: {
  consultancyId: number;
  query: string;
  limit?: number;
}): Promise<StudentSearchItem[]> {
  const { consultancyId, query, limit = 20 } = params;

  if (!consultancyId || consultancyId <= 0 || !query || query.trim().length < 2) {
    return [];
  }

  const rawQuery = query.trim().normalize("NFC").slice(0, 100);
  const escapedQuery = rawQuery.replace(/([\\%_])/g, "\\$1");
  const likeParam = `%${escapedQuery}%`;
  const safeLimit = Math.min(Math.max(1, limit), 50);

  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        cm.public_id AS membership_public_id,
        u.full_name,
        u.email
       FROM consultancy_members cm
       INNER JOIN users u ON u.id = cm.user_id
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.consultancy_id = ?
         AND cm.status = 'ACTIVE'
         AND u.status = 'ACTIVE'
         AND u.deleted_at IS NULL
         AND cmr.role = 'STUDENT'
         AND (u.full_name LIKE ? ESCAPE '\\\\' OR u.email LIKE ? ESCAPE '\\\\')
       ORDER BY u.full_name ASC
       LIMIT ${safeLimit};`,
      [consultancyId, likeParam, likeParam]
    );

    if (!Array.isArray(rows)) {
      return [];
    }

    return rows.map((r) => ({
      membershipPublicId: String(r.membership_public_id),
      fullName: String(r.full_name),
      email: String(r.email),
    }));
  } catch {
    return [];
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export type ChargeListItem = {
  publicId: string;
  studentMembershipPublicId: string;
  studentName: string;
  studentEmail: string;
  title: string;
  amountCents: number;
  currencyCode: string;
  dueOn: string;
  referencePeriodStart: string | null;
  referencePeriodEnd: string | null;
  blocksAccess: boolean;
  state: ChargePersistedState;
  derivedStatus: StudentChargeDerivedStatus;
  createdAt: string;
};

export type ListChargesResult = {
  charges: ChargeListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ListChargesParams = {
  consultancyId: number;
  statusFilter?: string;
  query?: string;
  page?: number;
  pageSize?: number;
};

export async function listConsultancyCharges(
  params: ListChargesParams
): Promise<ListChargesResult> {
  const { consultancyId } = params;

  if (!consultancyId || typeof consultancyId !== "number" || consultancyId <= 0) {
    return { charges: [], total: 0, page: 1, pageSize: 20, totalPages: 1 };
  }

  const pageSize = 20;
  const rawPage = Number(params.page);
  const page = !isNaN(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const offset = (page - 1) * pageSize;

  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();

    // 1. Get timezone from settings to determine localToday
    const [settingsRows] = await connection.execute<RowDataPacket[]>(
      `SELECT billing_timezone FROM consultancy_finance_settings WHERE consultancy_id = ? LIMIT 1;`,
      [consultancyId]
    );
    const billingTimezone =
      Array.isArray(settingsRows) && settingsRows.length > 0 && settingsRows[0].billing_timezone
        ? String(settingsRows[0].billing_timezone)
        : "America/Sao_Paulo";

    const localToday = getConsultancyLocalDate(billingTimezone);

    // 2. Build WHERE clauses
    const whereConditions: string[] = ["sc.consultancy_id = ?"];
    const queryParams: (string | number)[] = [consultancyId];

    // Status filter
    const filter = (params.statusFilter || "").toUpperCase().trim();
    if (filter === "CANCELED") {
      whereConditions.push("sc.state = 'CANCELED'");
    } else if (filter === "PAID") {
      whereConditions.push("EXISTS (SELECT 1 FROM student_payments sp WHERE sp.charge_id = sc.id)");
    } else if (filter === "UNDER_REVIEW") {
      whereConditions.push(
        "sc.state = 'OPEN'",
        "NOT EXISTS (SELECT 1 FROM student_payments sp WHERE sp.charge_id = sc.id)",
        "EXISTS (SELECT 1 FROM student_payment_receipts spr WHERE spr.charge_id = sc.id AND spr.status = 'SUBMITTED')"
      );
    } else if (filter === "OVERDUE") {
      whereConditions.push(
        "sc.state = 'OPEN'",
        "NOT EXISTS (SELECT 1 FROM student_payments sp WHERE sp.charge_id = sc.id)",
        "NOT EXISTS (SELECT 1 FROM student_payment_receipts spr WHERE spr.charge_id = sc.id AND spr.status = 'SUBMITTED')",
        "sc.due_on < ?"
      );
      queryParams.push(localToday);
    } else if (filter === "PENDING") {
      whereConditions.push(
        "sc.state = 'OPEN'",
        "NOT EXISTS (SELECT 1 FROM student_payments sp WHERE sp.charge_id = sc.id)",
        "NOT EXISTS (SELECT 1 FROM student_payment_receipts spr WHERE spr.charge_id = sc.id AND spr.status = 'SUBMITTED')",
        "sc.due_on >= ?"
      );
      queryParams.push(localToday);
    }

    // Search query filter (matches student name, student email, or charge title)
    const rawQ = params.query ? String(params.query).trim().normalize("NFC") : "";
    if (rawQ.length > 0) {
      const escapedQ = rawQ.replace(/([\\%_])/g, "\\$1").slice(0, 100);
      whereConditions.push(
        "(u.full_name LIKE ? ESCAPE '\\\\' OR u.email LIKE ? ESCAPE '\\\\' OR sc.title LIKE ? ESCAPE '\\\\')"
      );
      queryParams.push(`%${escapedQ}%`, `%${escapedQ}%`, `%${escapedQ}%`);
    }

    const whereSql = whereConditions.join(" AND ");

    // 3. Count query
    const countSql = `
      SELECT COUNT(DISTINCT sc.id) AS total
      FROM student_charges sc
      INNER JOIN consultancy_members cm ON cm.id = sc.student_membership_id
      INNER JOIN users u ON u.id = cm.user_id
      WHERE ${whereSql};
    `;

    const [countRows] = await connection.execute<RowDataPacket[]>(countSql, queryParams);
    const total = Array.isArray(countRows) && countRows.length > 0 ? Number(countRows[0].total) || 0 : 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    if (total === 0) {
      return { charges: [], total: 0, page, pageSize, totalPages: 1 };
    }

    // 4. Paginated list query
    const listSql = `
      SELECT
        sc.public_id AS charge_public_id,
        cm.public_id AS student_membership_public_id,
        u.full_name AS student_name,
        u.email AS student_email,
        sc.title,
        sc.amount_cents,
        sc.currency_code,
        DATE_FORMAT(sc.due_on, '%Y-%m-%d') AS due_on,
        DATE_FORMAT(sc.reference_period_start, '%Y-%m-%d') AS reference_period_start,
        DATE_FORMAT(sc.reference_period_end, '%Y-%m-%d') AS reference_period_end,
        sc.blocks_access,
        sc.state,
        sc.created_at,
        EXISTS (SELECT 1 FROM student_payments sp WHERE sp.charge_id = sc.id) AS has_payment,
        EXISTS (SELECT 1 FROM student_payment_receipts spr WHERE spr.charge_id = sc.id AND spr.status = 'SUBMITTED') AS has_submitted_receipt
      FROM student_charges sc
      INNER JOIN consultancy_members cm ON cm.id = sc.student_membership_id
      INNER JOIN users u ON u.id = cm.user_id
      WHERE ${whereSql}
      ORDER BY sc.due_on DESC, sc.created_at DESC, sc.id DESC
      LIMIT ${pageSize} OFFSET ${offset};
    `;

    const [rows] = await connection.execute<RowDataPacket[]>(listSql, queryParams);

    if (!Array.isArray(rows)) {
      return { charges: [], total, page, pageSize, totalPages };
    }

    const charges: ChargeListItem[] = rows.map((r) => {
      const derivedStatus = deriveStudentChargeStatus({
        state: r.state as ChargePersistedState,
        dueOn: String(r.due_on),
        localToday,
        hasConfirmedPayment: Boolean(r.has_payment),
        hasSubmittedReceipt: Boolean(r.has_submitted_receipt),
      });

      return {
        publicId: String(r.charge_public_id),
        studentMembershipPublicId: String(r.student_membership_public_id),
        studentName: String(r.student_name),
        studentEmail: String(r.student_email),
        title: String(r.title),
        amountCents: Number(r.amount_cents),
        currencyCode: String(r.currency_code),
        dueOn: String(r.due_on),
        referencePeriodStart: r.reference_period_start ? String(r.reference_period_start) : null,
        referencePeriodEnd: r.reference_period_end ? String(r.reference_period_end) : null,
        blocksAccess: Boolean(r.blocks_access),
        state: r.state as ChargePersistedState,
        derivedStatus,
        createdAt: String(r.created_at),
      };
    });

    return { charges, total, page, pageSize, totalPages };
  } catch {
    return { charges: [], total: 0, page: 1, pageSize: 20, totalPages: 1 };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export type StudentChargeDetail = {
  publicId: string;
  studentMembershipPublicId: string;
  studentName: string;
  studentEmail: string;
  title: string;
  description: string | null;
  amountCents: number;
  currencyCode: string;
  dueOn: string;
  referencePeriodStart: string | null;
  referencePeriodEnd: string | null;
  blocksAccess: boolean;
  state: ChargePersistedState;
  derivedStatus: StudentChargeDerivedStatus;
  createdAt: string;
  createdByUserName: string;
  canceledAt: string | null;
  canceledByUserName: string | null;
  cancelReason: string | null;
  isPaid: boolean;
  canBeCanceled: boolean;
};

export async function getStudentChargeDetail(params: {
  consultancyId: number;
  chargePublicId: string;
}): Promise<StudentChargeDetail | null> {
  const { consultancyId, chargePublicId } = params;

  if (!consultancyId || consultancyId <= 0 || !chargePublicId?.trim()) {
    return null;
  }

  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();

    // 1. Get timezone
    const [settingsRows] = await connection.execute<RowDataPacket[]>(
      `SELECT billing_timezone FROM consultancy_finance_settings WHERE consultancy_id = ? LIMIT 1;`,
      [consultancyId]
    );
    const billingTimezone =
      Array.isArray(settingsRows) && settingsRows.length > 0 && settingsRows[0].billing_timezone
        ? String(settingsRows[0].billing_timezone)
        : "America/Sao_Paulo";

    const localToday = getConsultancyLocalDate(billingTimezone);

    // 2. Query charge detail with student and creator details
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        sc.public_id AS charge_public_id,
        cm.public_id AS student_membership_public_id,
        u_student.full_name AS student_name,
        u_student.email AS student_email,
        sc.title,
        sc.description,
        sc.amount_cents,
        sc.currency_code,
        DATE_FORMAT(sc.due_on, '%Y-%m-%d') AS due_on,
        DATE_FORMAT(sc.reference_period_start, '%Y-%m-%d') AS reference_period_start,
        DATE_FORMAT(sc.reference_period_end, '%Y-%m-%d') AS reference_period_end,
        sc.blocks_access,
        sc.state,
        sc.created_at,
        u_creator.full_name AS created_by_user_name,
        sc.canceled_at,
        u_canceler.full_name AS canceled_by_user_name,
        sc.cancel_reason,
        EXISTS (SELECT 1 FROM student_payments sp WHERE sp.charge_id = sc.id) AS has_payment,
        EXISTS (SELECT 1 FROM student_payment_receipts spr WHERE spr.charge_id = sc.id AND spr.status = 'SUBMITTED') AS has_submitted_receipt
       FROM student_charges sc
       INNER JOIN consultancy_members cm ON cm.id = sc.student_membership_id
       INNER JOIN users u_student ON u_student.id = cm.user_id
       INNER JOIN users u_creator ON u_creator.id = sc.created_by_user_id
       LEFT JOIN users u_canceler ON u_canceler.id = sc.canceled_by_user_id
       WHERE sc.public_id = ?
         AND sc.consultancy_id = ?
       LIMIT 1;`,
      [chargePublicId.trim(), consultancyId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    const r = rows[0];
    const hasPayment = Boolean(r.has_payment);
    const hasSubmittedReceipt = Boolean(r.has_submitted_receipt);
    const state = r.state as ChargePersistedState;

    const derivedStatus = deriveStudentChargeStatus({
      state,
      dueOn: String(r.due_on),
      localToday,
      hasConfirmedPayment: hasPayment,
      hasSubmittedReceipt,
    });

    const canBeCanceled = state === "OPEN" && !hasPayment;

    return {
      publicId: String(r.charge_public_id),
      studentMembershipPublicId: String(r.student_membership_public_id),
      studentName: String(r.student_name),
      studentEmail: String(r.student_email),
      title: String(r.title),
      description: r.description ? String(r.description) : null,
      amountCents: Number(r.amount_cents),
      currencyCode: String(r.currency_code),
      dueOn: String(r.due_on),
      referencePeriodStart: r.reference_period_start ? String(r.reference_period_start) : null,
      referencePeriodEnd: r.reference_period_end ? String(r.reference_period_end) : null,
      blocksAccess: Boolean(r.blocks_access),
      state,
      derivedStatus,
      createdAt: String(r.created_at),
      createdByUserName: String(r.created_by_user_name),
      canceledAt: r.canceled_at ? String(r.canceled_at) : null,
      canceledByUserName: r.canceled_by_user_name ? String(r.canceled_by_user_name) : null,
      cancelReason: r.cancel_reason ? String(r.cancel_reason) : null,
      isPaid: hasPayment,
      canBeCanceled,
    };
  } catch {
    return null;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// ============================================================================
// STUDENT READ & RECEIPT SUBMISSION SERVICES FOR T100C
// ============================================================================

export type StudentChargeItem = {
  publicId: string;
  title: string;
  amountCents: number;
  currencyCode: string;
  dueOn: string;
  referencePeriodStart: string | null;
  referencePeriodEnd: string | null;
  blocksAccess: boolean;
  state: ChargePersistedState;
  derivedStatus: StudentChargeDerivedStatus;
  createdAt: string;
};

export type StudentChargesListResult = {
  charges: StudentChargeItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type GetStudentChargesPageParams = {
  consultancyId: number;
  studentMembershipId: number;
  view?: "pending" | "history";
  page?: number;
  pageSize?: number;
};

/**
 * Lists charges belonging exclusively to the authenticated student's active membership.
 * - view === "pending": OPEN charges with no confirmed payment (PENDING, OVERDUE, UNDER_REVIEW).
 *   Ordered by due_on ASC, created_at DESC, id DESC (most urgent due dates first).
 * - view === "history": CANCELED charges or charges with confirmed payment (PAID, CANCELED).
 *   Ordered by due_on DESC, created_at DESC, id DESC.
 */
export async function getStudentChargesPage(
  params: GetStudentChargesPageParams
): Promise<StudentChargesListResult> {
  const { consultancyId, studentMembershipId, view = "pending" } = params;

  if (
    !consultancyId ||
    typeof consultancyId !== "number" ||
    consultancyId <= 0 ||
    !studentMembershipId ||
    typeof studentMembershipId !== "number" ||
    studentMembershipId <= 0
  ) {
    return { charges: [], total: 0, page: 1, pageSize: 20, totalPages: 1 };
  }

  const pageSize = 20;
  const rawPage = Number(params.page);
  const page = !isNaN(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const offset = (page - 1) * pageSize;

  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();

    // 1. Get billing timezone for localToday
    const [settingsRows] = await connection.execute<RowDataPacket[]>(
      `SELECT billing_timezone FROM consultancy_finance_settings WHERE consultancy_id = ? LIMIT 1;`,
      [consultancyId]
    );
    const billingTimezone =
      Array.isArray(settingsRows) && settingsRows.length > 0 && settingsRows[0].billing_timezone
        ? String(settingsRows[0].billing_timezone)
        : "America/Sao_Paulo";

    const localToday = getConsultancyLocalDate(billingTimezone);

    // 2. Build WHERE and ORDER conditions strictly isolated to student's membership
    const isHistory = view === "history";
    const whereConditions = [
      "sc.consultancy_id = ?",
      "sc.student_membership_id = ?",
    ];
    const queryParams: (string | number)[] = [consultancyId, studentMembershipId];

    if (isHistory) {
      whereConditions.push(
        "(sc.state = 'CANCELED' OR EXISTS (SELECT 1 FROM student_payments sp WHERE sp.charge_id = sc.id))"
      );
    } else {
      whereConditions.push(
        "sc.state = 'OPEN'",
        "NOT EXISTS (SELECT 1 FROM student_payments sp WHERE sp.charge_id = sc.id)"
      );
    }

    const whereSql = whereConditions.join(" AND ");
    const orderSql = isHistory
      ? "ORDER BY sc.due_on DESC, sc.created_at DESC, sc.id DESC"
      : "ORDER BY sc.due_on ASC, sc.created_at DESC, sc.id DESC";

    // 3. Count query
    const countSql = `
      SELECT COUNT(*) AS total
      FROM student_charges sc
      WHERE ${whereSql};
    `;

    const [countRows] = await connection.execute<RowDataPacket[]>(countSql, queryParams);
    const total = Array.isArray(countRows) && countRows.length > 0 ? Number(countRows[0].total) || 0 : 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    if (total === 0) {
      return { charges: [], total: 0, page, pageSize, totalPages: 1 };
    }

    // 4. Paginated list query with EXISTS subqueries (no N+1)
    const listSql = `
      SELECT
        sc.public_id AS charge_public_id,
        sc.title,
        sc.amount_cents,
        sc.currency_code,
        DATE_FORMAT(sc.due_on, '%Y-%m-%d') AS due_on,
        DATE_FORMAT(sc.reference_period_start, '%Y-%m-%d') AS reference_period_start,
        DATE_FORMAT(sc.reference_period_end, '%Y-%m-%d') AS reference_period_end,
        sc.blocks_access,
        sc.state,
        sc.created_at,
        EXISTS (SELECT 1 FROM student_payments sp WHERE sp.charge_id = sc.id) AS has_payment,
        EXISTS (SELECT 1 FROM student_payment_receipts spr WHERE spr.charge_id = sc.id AND spr.status = 'SUBMITTED') AS has_submitted_receipt
      FROM student_charges sc
      WHERE ${whereSql}
      ${orderSql}
      LIMIT ${pageSize} OFFSET ${offset};
    `;

    const [rows] = await connection.execute<RowDataPacket[]>(listSql, queryParams);

    if (!Array.isArray(rows)) {
      return { charges: [], total, page, pageSize, totalPages };
    }

    const charges: StudentChargeItem[] = rows.map((r) => {
      const derivedStatus = deriveStudentChargeStatus({
        state: r.state as ChargePersistedState,
        dueOn: String(r.due_on),
        localToday,
        hasConfirmedPayment: Boolean(r.has_payment),
        hasSubmittedReceipt: Boolean(r.has_submitted_receipt),
      });

      return {
        publicId: String(r.charge_public_id),
        title: String(r.title),
        amountCents: Number(r.amount_cents),
        currencyCode: String(r.currency_code),
        dueOn: String(r.due_on),
        referencePeriodStart: r.reference_period_start ? String(r.reference_period_start) : null,
        referencePeriodEnd: r.reference_period_end ? String(r.reference_period_end) : null,
        blocksAccess: Boolean(r.blocks_access),
        state: r.state as ChargePersistedState,
        derivedStatus,
        createdAt: String(r.created_at),
      };
    });

    return { charges, total, page, pageSize, totalPages };
  } catch {
    return { charges: [], total: 0, page: 1, pageSize: 20, totalPages: 1 };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export type StudentPaymentChargeDetail = {
  publicId: string;
  title: string;
  description: string | null;
  amountCents: number;
  currencyCode: string;
  dueOn: string;
  referencePeriodStart: string | null;
  referencePeriodEnd: string | null;
  blocksAccess: boolean;
  state: ChargePersistedState;
  derivedStatus: StudentChargeDerivedStatus;
  createdAt: string;
  isPaid: boolean;
  paidAmountCents: number | null;
  paidConfirmedAt: string | null;
  hasSubmittedReceipt: boolean;
  hasPreviousRejection: boolean;
  previousRejectionReason: string | null;
  pixSettings: {
    pixKeyType: PixKeyType;
    pixKey: string;
    pixReceiverName: string;
    paymentInstructions: string | null;
  } | null;
};

/**
 * Retrieves charge details for student resolution with Pix instructions and receipt submission state.
 * Validates strictly that the charge belongs to the student's own membership and active consultancy.
 */
export async function getStudentChargePaymentDetail(params: {
  consultancyId: number;
  studentMembershipId: number;
  chargePublicId: string;
}): Promise<StudentPaymentChargeDetail | null> {
  const { consultancyId, studentMembershipId, chargePublicId } = params;

  if (
    !consultancyId ||
    consultancyId <= 0 ||
    !studentMembershipId ||
    studentMembershipId <= 0 ||
    !chargePublicId?.trim()
  ) {
    return null;
  }

  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();

    // 1. Get billing timezone
    const [settingsRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        pix_key_type,
        pix_key,
        pix_receiver_name,
        payment_instructions,
        billing_timezone
       FROM consultancy_finance_settings
       WHERE consultancy_id = ?
       LIMIT 1;`,
      [consultancyId]
    );

    const financeSettings =
      Array.isArray(settingsRows) && settingsRows.length > 0
        ? settingsRows[0]
        : null;

    const billingTimezone =
      financeSettings && financeSettings.billing_timezone
        ? String(financeSettings.billing_timezone)
        : "America/Sao_Paulo";

    const localToday = getConsultancyLocalDate(billingTimezone);

    // 2. Query charge with own student membership guarantee
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        sc.id AS internal_charge_id,
        sc.public_id AS charge_public_id,
        sc.title,
        sc.description,
        sc.amount_cents,
        sc.currency_code,
        DATE_FORMAT(sc.due_on, '%Y-%m-%d') AS due_on,
        DATE_FORMAT(sc.reference_period_start, '%Y-%m-%d') AS reference_period_start,
        DATE_FORMAT(sc.reference_period_end, '%Y-%m-%d') AS reference_period_end,
        sc.blocks_access,
        sc.state,
        sc.created_at,
        sp.amount_cents AS payment_amount_cents,
        DATE_FORMAT(sp.confirmed_at, '%Y-%m-%d %H:%i:%s') AS payment_confirmed_at,
        EXISTS (
          SELECT 1 FROM student_payment_receipts spr
          WHERE spr.charge_id = sc.id AND spr.status = 'SUBMITTED'
        ) AS has_submitted_receipt
       FROM student_charges sc
       LEFT JOIN student_payments sp ON sp.charge_id = sc.id
       WHERE sc.public_id = ?
         AND sc.consultancy_id = ?
         AND sc.student_membership_id = ?
       LIMIT 1;`,
      [chargePublicId.trim(), consultancyId, studentMembershipId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    const r = rows[0];
    const internalChargeId = Number(r.internal_charge_id);
    const hasPayment = r.payment_amount_cents !== null && r.payment_amount_cents !== undefined;
    const hasSubmittedReceipt = Boolean(r.has_submitted_receipt);
    const state = r.state as ChargePersistedState;

    const derivedStatus = deriveStudentChargeStatus({
      state,
      dueOn: String(r.due_on),
      localToday,
      hasConfirmedPayment: hasPayment,
      hasSubmittedReceipt,
    });

    // Check latest receipt for previous rejection notice if not currently submitted/paid
    let hasPreviousRejection = false;
    let previousRejectionReason: string | null = null;

    if (!hasPayment && !hasSubmittedReceipt && state === "OPEN") {
      const [latestReceiptRows] = await connection.execute<RowDataPacket[]>(
        `SELECT status, rejection_reason
         FROM student_payment_receipts
         WHERE charge_id = ?
         ORDER BY id DESC
         LIMIT 1;`,
        [internalChargeId]
      );

      if (Array.isArray(latestReceiptRows) && latestReceiptRows.length > 0) {
        if (latestReceiptRows[0].status === "REJECTED") {
          hasPreviousRejection = true;
          previousRejectionReason = latestReceiptRows[0].rejection_reason
            ? String(latestReceiptRows[0].rejection_reason)
            : null;
        }
      }
    }

    // Pix settings are exposed only when charge is open and unpaid, returning strictly payment fields
    let pixSettings: StudentPaymentChargeDetail["pixSettings"] = null;
    if (financeSettings && state === "OPEN" && !hasPayment) {
      pixSettings = {
        pixKeyType: financeSettings.pix_key_type as PixKeyType,
        pixKey: String(financeSettings.pix_key),
        pixReceiverName: String(financeSettings.pix_receiver_name),
        paymentInstructions: financeSettings.payment_instructions
          ? String(financeSettings.payment_instructions)
          : null,
      };
    }

    return {
      publicId: String(r.charge_public_id),
      title: String(r.title),
      description: r.description ? String(r.description) : null,
      amountCents: Number(r.amount_cents),
      currencyCode: String(r.currency_code),
      dueOn: String(r.due_on),
      referencePeriodStart: r.reference_period_start ? String(r.reference_period_start) : null,
      referencePeriodEnd: r.reference_period_end ? String(r.reference_period_end) : null,
      blocksAccess: Boolean(r.blocks_access),
      state,
      derivedStatus,
      createdAt: String(r.created_at),
      isPaid: hasPayment,
      paidAmountCents: hasPayment ? Number(r.payment_amount_cents) : null,
      paidConfirmedAt: r.payment_confirmed_at ? String(r.payment_confirmed_at) : null,
      hasSubmittedReceipt,
      hasPreviousRejection,
      previousRejectionReason,
      pixSettings,
    };
  } catch {
    return null;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export type SubmitReceiptParams = {
  consultancyId: number;
  studentMembershipId: number;
  userId: number;
  chargePublicId: string;
  fileStorageKey: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  fileSha256: string;
};

export type SubmitReceiptResult = {
  success: boolean;
  receiptPublicId?: string;
  error?: string;
  code?:
    | "NOT_FOUND"
    | "CHARGE_CANCELED"
    | "ALREADY_PAID"
    | "ALREADY_SUBMITTED"
    | "SETTINGS_MISSING"
    | "DB_ERROR";
};

/**
 * Transactionally inserts a student payment receipt in SUBMITTED status with row-level charge locking.
 * Enforces:
 * 1. Charge exists and strictly belongs to the student's active membership and consultancy.
 * 2. Charge is in OPEN state (cannot submit to canceled charge).
 * 3. Charge has no existing confirmed payment (cannot submit to already paid charge).
 * 4. Charge has no existing receipt in SUBMITTED status (serializes concurrent uploads).
 * 5. Consultancy finance settings exist.
 * 6. Atomically inserts audit event STUDENT_PAYMENT_RECEIPT_SUBMITTED in the same transaction.
 *
 * CRITICAL: This function NEVER inserts into student_payments and NEVER marks a charge as PAID.
 */
export async function submitStudentPaymentReceipt(
  params: SubmitReceiptParams
): Promise<SubmitReceiptResult> {
  const {
    consultancyId,
    studentMembershipId,
    userId,
    chargePublicId,
    fileStorageKey,
    originalFileName,
    mimeType,
    sizeBytes,
    fileSha256,
  } = params;

  if (
    !consultancyId ||
    consultancyId <= 0 ||
    !studentMembershipId ||
    studentMembershipId <= 0 ||
    !userId ||
    userId <= 0 ||
    !chargePublicId?.trim() ||
    !fileStorageKey?.trim() ||
    !originalFileName?.trim() ||
    !mimeType?.trim() ||
    !sizeBytes ||
    sizeBytes <= 0 ||
    !fileSha256?.trim()
  ) {
    return { success: false, code: "DB_ERROR", error: "Parâmetros de comprovante inválidos." };
  }

  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 1. Lock charge row FOR UPDATE and evaluate concurrent state
    const [chargeRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        sc.id,
        sc.state,
        sc.consultancy_id,
        sc.student_membership_id,
        (SELECT 1 FROM student_payments sp WHERE sp.charge_id = sc.id LIMIT 1) AS payment_exists,
        (SELECT 1 FROM student_payment_receipts spr WHERE spr.charge_id = sc.id AND spr.status = 'SUBMITTED' LIMIT 1) AS submitted_exists
       FROM student_charges sc
       WHERE sc.public_id = ?
         AND sc.consultancy_id = ?
         AND sc.student_membership_id = ?
       FOR UPDATE;`,
      [chargePublicId.trim(), consultancyId, studentMembershipId]
    );

    if (!Array.isArray(chargeRows) || chargeRows.length === 0) {
      await connection.rollback();
      return { success: false, code: "NOT_FOUND", error: "Cobrança não encontrada para este aluno." };
    }

    const charge = chargeRows[0];
    const internalChargeId = Number(charge.id);

    if (charge.state === "CANCELED") {
      await connection.rollback();
      return {
        success: false,
        code: "CHARGE_CANCELED",
        error: "Esta cobrança foi cancelada e não aceita envio de comprovantes.",
      };
    }

    if (charge.payment_exists) {
      await connection.rollback();
      return {
        success: false,
        code: "ALREADY_PAID",
        error: "Esta cobrança já foi confirmada como paga.",
      };
    }

    if (charge.submitted_exists) {
      await connection.rollback();
      return {
        success: false,
        code: "ALREADY_SUBMITTED",
        error: "Já existe um comprovante em análise para esta cobrança. Aguarde a validação da consultoria.",
      };
    }

    // 2. Re-verify finance settings exist
    const [settingsRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM consultancy_finance_settings WHERE consultancy_id = ? LIMIT 1;`,
      [consultancyId]
    );

    if (!Array.isArray(settingsRows) || settingsRows.length === 0) {
      await connection.rollback();
      return {
        success: false,
        code: "SETTINGS_MISSING",
        error: "A consultoria ainda não configurou as informações de pagamento Pix.",
      };
    }

    // 3. Insert student_payment_receipts row (status = SUBMITTED only)
    const receiptPublicId = crypto.randomUUID();
    await connection.execute(
      `INSERT INTO student_payment_receipts (
        public_id,
        consultancy_id,
        charge_id,
        submitted_by_user_id,
        file_storage_key,
        original_file_name,
        mime_type,
        size_bytes,
        file_sha256,
        status,
        submitted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', UTC_TIMESTAMP(3));`,
      [
        receiptPublicId,
        consultancyId,
        internalChargeId,
        userId,
        fileStorageKey.trim(),
        originalFileName.trim().slice(0, 255),
        mimeType.trim().slice(0, 100),
        sizeBytes,
        fileSha256.trim().slice(0, 64),
      ]
    );

    // 4. Record audit event atomically in the same transaction
    const auditPublicId = crypto.randomUUID();
    await connection.execute(
      `INSERT INTO audit_events (
        public_id,
        actor_user_id,
        consultancy_id,
        action,
        target_type,
        target_public_id,
        metadata_json,
        created_at
      ) VALUES (?, ?, ?, 'STUDENT_PAYMENT_RECEIPT_SUBMITTED', 'STUDENT_PAYMENT_RECEIPT', ?, ?, UTC_TIMESTAMP(3));`,
      [
        auditPublicId,
        userId,
        consultancyId,
        receiptPublicId,
        JSON.stringify({
          chargePublicId: chargePublicId.trim(),
          receiptPublicId,
        }),
      ]
    );

    await connection.commit();
    return { success: true, receiptPublicId };
  } catch {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    return {
      success: false,
      code: "DB_ERROR",
      error: "Ocorreu um erro ao registrar o comprovante de pagamento no banco de dados.",
    };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
