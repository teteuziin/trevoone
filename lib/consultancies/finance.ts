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
    // Fallback to UTC if timezone is invalid
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

  // Days per month check including leap year
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
      // UUID / EVP random key
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

    // Check if existing settings row exists
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

    // Record audit event without exposing full sensitive key
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

    // 1. If blocksAccess is true, verify finance settings exist
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

    // 2. Resolve and verify target student membership in the same consultancy
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

    // 3. Insert student charge
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

    // 4. Audit event
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

    // 1. Select and lock charge FOR UPDATE
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

    // 2. Mark charge as canceled
    await connection.execute(
      `UPDATE student_charges
       SET state = 'CANCELED',
           canceled_by_user_id = ?,
           canceled_at = UTC_TIMESTAMP(3),
           cancel_reason = ?
       WHERE id = ?;`,
      [userId, cleanReason, Number(row.id)]
    );

    // 3. Audit event
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

    // 1. Get finance settings to obtain billing timezone
    const [settingsRows] = await connection.execute<RowDataPacket[]>(
      `SELECT billing_timezone FROM consultancy_finance_settings WHERE consultancy_id = ? LIMIT 1;`,
      [consultancyId]
    );

    if (!Array.isArray(settingsRows) || settingsRows.length === 0) {
      return { isConfigured: false, isRestricted: false, overdueChargeCount: 0 };
    }

    const billingTimezone = String(settingsRows[0].billing_timezone);
    const localToday = getConsultancyLocalDate(billingTimezone);

    // 2. Query overdue, unpaid, blocking charges
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
