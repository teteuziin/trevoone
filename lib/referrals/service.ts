import crypto from "node:crypto";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { getDbConnection } from "@/lib/db/mysql";
import { recordConsultancyActivity } from "@/lib/consultancies/activity-log";
import { encryptPixKey, decryptPixKey } from "@/lib/security/encryption";
import { createNotificationInTransaction } from "@/services/notification-service";
import { ensurePromotionalCampaignsSchema } from "./schema-assurance";

export type PixKeyType = "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "RANDOM_KEY";
export type CommissionType = "FIXED_AMOUNT" | "PERCENTAGE";
export type CommissionStatus = "PENDING" | "APPROVED" | "PAID" | "CANCELLED";

export interface ConsultancyReferralSettings {
  id: number;
  consultancyId: number;
  isEnabled: boolean;
  commissionType: CommissionType;
  commissionAmountCents: number;
  commissionRateBasisPoints: number;
  // Preserved for backwards compatibility / UI display
  commissionValue: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReferralCodeRecord {
  id: number;
  publicId: string;
  consultancyId: number;
  referrerMemberId: number;
  code: string;
  isActive: boolean;
  createdAt: Date;
}

export interface MemberPayoutProfile {
  id: number;
  publicId: string;
  consultancyId: number;
  memberId: number;
  pixKeyType: PixKeyType;
  pixKey: string;
  pixKeyMasked: string;
  receiverName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Monetary safety helpers: Zero JavaScript floating-point arithmetic.
 * All monetary amounts are handled as integer cents (BigInt).
 * All percentage rates are handled as integer basis points (1% = 100 bp, 10.5% = 1050 bp).
 */
export function brlToCents(amount: number | string): bigint {
  if (typeof amount === "number") {
    const fixed = amount.toFixed(2);
    const [intPart, decPart = "00"] = fixed.split(".");
    return BigInt(intPart) * BigInt(100) + BigInt(decPart.padEnd(2, "0").slice(0, 2));
  }
  const clean = amount.replace(/[^0-9,.-]/g, "").replace(",", ".");
  const [intPart = "0", decPart = "00"] = clean.split(".");
  const sign = intPart.startsWith("-") ? BigInt(-1) : BigInt(1);
  const absInt = intPart.replace("-", "");
  return sign * (BigInt(absInt || "0") * BigInt(100) + BigInt(decPart.padEnd(2, "0").slice(0, 2)));
}

export function centsToBrl(cents: bigint | number | null | undefined): string {
  if (cents === null || cents === undefined) return "0.00";
  const c = BigInt(cents);
  const sign = c < BigInt(0) ? "-" : "";
  const absC = c < BigInt(0) ? (-c) : c;
  const intPart = absC / BigInt(100);
  const decPart = (absC % BigInt(100)).toString().padStart(2, "0");
  return `${sign}${intPart}.${decPart}`;
}

export function percentToBasisPoints(percent: number | string): number {
  if (typeof percent === "number") {
    const fixed = percent.toFixed(2);
    const [intPart, decPart = "00"] = fixed.split(".");
    return Number(intPart) * 100 + Number(decPart.padEnd(2, "0").slice(0, 2));
  }
  const clean = percent.replace(/[^0-9,.-]/g, "").replace(",", ".");
  const [intPart = "0", decPart = "00"] = clean.split(".");
  return Number(intPart) * 100 + Number(decPart.padEnd(2, "0").slice(0, 2));
}

export function basisPointsToPercent(bp: number): number {
  return bp / 100;
}

export function calculatePercentageCommissionExact(
  baseAmountCents: bigint,
  rateBasisPoints: number
): bigint {
  if (baseAmountCents <= BigInt(0) || rateBasisPoints <= 0) return BigInt(0);
  return (baseAmountCents * BigInt(rateBasisPoints) + BigInt(5000)) / BigInt(10000);
}

export function maskPixKey(type: PixKeyType | string, rawKey: string): string {
  if (!rawKey || typeof rawKey !== "string") return "***";
  const clean = rawKey.trim();

  switch (type) {
    case "EMAIL": {
      const parts = clean.split("@");
      if (parts.length === 2 && parts[0].length > 0) {
        const first = parts[0][0];
        return `${first}***@${parts[1]}`;
      }
      return "***@***";
    }
    case "CPF": {
      const digits = clean.replace(/\D/g, "");
      if (digits.length >= 4) {
        return `***.***.${digits.slice(-5, -2)}-${digits.slice(-2)}`;
      }
      return "***";
    }
    case "CNPJ": {
      const digits = clean.replace(/\D/g, "");
      if (digits.length >= 6) {
        return `**.***.***/${digits.slice(-6, -2)}-${digits.slice(-2)}`;
      }
      return "***";
    }
    case "PHONE": {
      const digits = clean.replace(/\D/g, "");
      if (digits.length >= 4) {
        return `(**) *****-${digits.slice(-4)}`;
      }
      return "***";
    }
    case "RANDOM_KEY":
    default: {
      if (clean.length > 8) {
        return `${clean.slice(0, 4)}...-...${clean.slice(-4)}`;
      }
      return "****";
    }
  }
}

export function generateReferralCodeString(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  const randomBytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  return result;
}

export async function getConsultancyReferralSettings(
  consultancyId: number
): Promise<ConsultancyReferralSettings> {
  const connection = await getDbConnection();
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, consultancy_id, is_enabled, commission_type, commission_value,
              commission_amount_cents, commission_rate_basis_points,
              created_at, updated_at
       FROM consultancy_referral_settings
       WHERE consultancy_id = ?
       LIMIT 1;`,
      [consultancyId]
    );

    if (Array.isArray(rows) && rows.length > 0) {
      const r = rows[0];
      const commType = r.commission_type as CommissionType;
      const amountCents = r.commission_amount_cents != null
        ? Number(r.commission_amount_cents)
        : Number(brlToCents(Number(r.commission_value || 50)));
      const rateBp = r.commission_rate_basis_points != null
        ? Number(r.commission_rate_basis_points)
        : percentToBasisPoints(Number(r.commission_value || 10));

      return {
        id: Number(r.id),
        consultancyId: Number(r.consultancy_id),
        isEnabled: Boolean(r.is_enabled),
        commissionType: commType,
        commissionAmountCents: amountCents,
        commissionRateBasisPoints: rateBp,
        commissionValue: commType === "FIXED_AMOUNT"
          ? amountCents / 100
          : rateBp / 100,
        createdAt: new Date(r.created_at),
        updatedAt: new Date(r.updated_at),
      };
    }

    // SAFE DEFAULT: isEnabled is FALSE when no settings row exists.
    // No consultancy accidentally owes referral commissions merely because the feature is deployed.
    return {
      id: 0,
      consultancyId,
      isEnabled: false,
      commissionType: "FIXED_AMOUNT",
      commissionAmountCents: 5000, // R$ 50,00
      commissionRateBasisPoints: 1000, // 10.00%
      commissionValue: 50.0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } finally {
    connection.release();
  }
}

export async function updateConsultancyReferralSettings(
  consultancyId: number,
  isEnabled: boolean,
  commissionType: CommissionType,
  commissionValue: number,
  adminMemberId: number,
  adminUserId: number
): Promise<{ success: boolean; error?: string }> {
  if (commissionValue < 0) {
    return { success: false, error: "O valor da comissão não pode ser negativo." };
  }
  if (!["FIXED_AMOUNT", "PERCENTAGE"].includes(commissionType)) {
    return { success: false, error: "Tipo de comissão inválido." };
  }
  if (commissionType === "PERCENTAGE" && commissionValue > 100) {
    return { success: false, error: "A comissão percentual não pode exceder 100%." };
  }

  const commissionAmountCents = commissionType === "FIXED_AMOUNT"
    ? brlToCents(commissionValue)
    : BigInt(5000);
  const commissionRateBasisPoints = commissionType === "PERCENTAGE"
    ? percentToBasisPoints(commissionValue)
    : 1000;
  const safeCommissionValue = commissionType === "FIXED_AMOUNT"
    ? Number(commissionAmountCents) / 100
    : commissionRateBasisPoints / 100;

  const connection = await getDbConnection();
  try {
    await connection.execute(
      `INSERT INTO consultancy_referral_settings (
         consultancy_id, is_enabled, commission_type, commission_value,
         commission_amount_cents, commission_rate_basis_points
       ) VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         is_enabled = VALUES(is_enabled),
         commission_type = VALUES(commission_type),
         commission_value = VALUES(commission_value),
         commission_amount_cents = VALUES(commission_amount_cents),
         commission_rate_basis_points = VALUES(commission_rate_basis_points),
         updated_at = UTC_TIMESTAMP(3);`,
      [
        consultancyId,
        isEnabled ? 1 : 0,
        commissionType,
        safeCommissionValue,
        commissionAmountCents.toString(),
        commissionRateBasisPoints,
      ]
    );

    await recordConsultancyActivity({
      consultancyId,
      actorUserId: adminUserId,
      actorMembershipId: adminMemberId,
      actorRole: "CONSULTANCY_ADMIN",
      action: "UPDATE_REFERRAL_SETTINGS",
      module: "ADMIN",
      resourceType: "consultancy_referral_settings",
      summary: `Configurações do programa de indicações atualizadas: ${isEnabled ? "Ativo" : "Pausado"}, tipo: ${commissionType}, valor: ${safeCommissionValue}`,
      metadata: { isEnabled, commissionType, safeCommissionValue, commissionAmountCents: commissionAmountCents.toString(), commissionRateBasisPoints },
    });

    return { success: true };
  } finally {
    connection.release();
  }
}

/**
 * VIP Eligibility:
 * In TREVO ONE, 'INFLUENCER' is the canonical member role representing Influencer/VIP (role label: "Influenciador / VIP").
 * We also accept 'VIP' as a string if defined.
 */
export async function getOrCreateReferralCode(
  consultancyId: number,
  memberId: number
): Promise<{ success: boolean; code?: string; publicId?: string; error?: string }> {
  const connection = await getDbConnection();
  try {
    // 1. Verify membership is ACTIVE and has role STUDENT, INFLUENCER, or VIP
    const [memberRows] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id, cm.status, cm.user_id
       FROM consultancy_members cm
       JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.id = ? AND cm.consultancy_id = ? AND cm.status = 'ACTIVE'
         AND cmr.role IN ('STUDENT', 'INFLUENCER', 'VIP')
       LIMIT 1;`,
      [memberId, consultancyId]
    );

    if (!Array.isArray(memberRows) || memberRows.length === 0) {
      return { success: false, error: "Membro não elegível ou inativo para o programa de indicação." };
    }

    // 2. Check if a code already exists for this consultancy membership
    const [codeRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, code, is_active
       FROM referral_codes
       WHERE consultancy_id = ? AND referrer_member_id = ?
       LIMIT 1;`,
      [consultancyId, memberId]
    );

    if (Array.isArray(codeRows) && codeRows.length > 0) {
      const existing = codeRows[0];
      return {
        success: true,
        code: existing.code,
        publicId: existing.public_id,
      };
    }

    // 3. Generate unique code
    let attempts = 0;
    while (attempts < 5) {
      attempts++;
      const code = generateReferralCodeString();
      const publicId = crypto.randomUUID();

      try {
        await connection.execute(
          `INSERT INTO referral_codes (public_id, consultancy_id, referrer_member_id, code, is_active)
           VALUES (?, ?, ?, ?, 1);`,
          [publicId, consultancyId, memberId, code]
        );

        return {
          success: true,
          code,
          publicId,
        };
      } catch (err: unknown) {
        const errCode = (err as { code?: string })?.code;
        if (errCode === "ER_DUP_ENTRY" || (err as { errno?: number })?.errno === 1062) {
          const [retryRows] = await connection.execute<RowDataPacket[]>(
            `SELECT id, public_id, code FROM referral_codes WHERE consultancy_id = ? AND referrer_member_id = ? LIMIT 1;`,
            [consultancyId, memberId]
          );
          if (Array.isArray(retryRows) && retryRows.length > 0) {
            return {
              success: true,
              code: retryRows[0].code,
              publicId: retryRows[0].public_id,
            };
          }
          continue;
        }
        throw err;
      }
    }

    return { success: false, error: "Falha ao gerar código de indicação único." };
  } finally {
    connection.release();
  }
}

export async function validateReferralCode(code: string): Promise<{
  valid: boolean;
  codeId?: number;
  code?: string;
  consultancyId?: number;
  consultancySlug?: string;
  referrerMemberId?: number;
  referrerUserId?: number;
  error?: string;
}> {
  if (!code || typeof code !== "string") {
    return { valid: false, error: "Código de indicação não fornecido." };
  }
  const cleanCode = code.trim().toUpperCase();

  const connection = await getDbConnection();
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT rc.id AS code_id, rc.code, rc.is_active,
              c.id AS consultancy_id, c.slug AS consultancy_slug, c.status AS consultancy_status,
              cm.id AS referrer_member_id, cm.status AS referrer_status,
              cm.user_id AS referrer_user_id,
              crs.is_enabled AS program_is_enabled
       FROM referral_codes rc
       JOIN consultancies c ON c.id = rc.consultancy_id
       JOIN consultancy_members cm ON cm.id = rc.referrer_member_id
       LEFT JOIN consultancy_referral_settings crs ON crs.consultancy_id = c.id
       WHERE rc.code = ? AND c.deleted_at IS NULL
       LIMIT 1;`,
      [cleanCode]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return { valid: false, error: "Código de indicação inexistente." };
    }

    const row = rows[0];

    if (!row.is_active) {
      return { valid: false, error: "Código de indicação inativo." };
    }

    if (row.consultancy_status !== "ACTIVE") {
      return { valid: false, error: "Consultoria inativa." };
    }

    if (row.referrer_status !== "ACTIVE") {
      return { valid: false, error: "Indicador não está mais ativo nesta consultoria." };
    }

    // If no row exists in crs, program_is_enabled is null => default is FALSE
    if (!row.program_is_enabled || Number(row.program_is_enabled) === 0) {
      return { valid: false, error: "Programa de indicações atualmente suspenso." };
    }

    return {
      valid: true,
      codeId: Number(row.code_id),
      code: row.code,
      consultancyId: Number(row.consultancy_id),
      consultancySlug: row.consultancy_slug,
      referrerMemberId: Number(row.referrer_member_id),
      referrerUserId: Number(row.referrer_user_id),
    };
  } finally {
    connection.release();
  }
}

/**
 * Anonymous first-touch attribution:
 * Server validates referral code, generates cryptographically random token,
 * stores ONLY token SHA-256 hash in DB with 30-day expiration.
 * FIRST VALID REFERRAL WINS: opening another link does not overwrite existing valid attribution.
 */
export async function createAnonymousReferralAttribution(
  code: string,
  existingToken?: string
): Promise<{
  valid: boolean;
  token?: string;
  consultancyId?: number;
  consultancySlug?: string;
  error?: string;
}> {
  const validation = await validateReferralCode(code);
  if (!validation.valid || !validation.consultancyId || !validation.codeId || !validation.referrerMemberId) {
    return { valid: false, error: validation.error || "Código de indicação inválido." };
  }

  const connection = await getDbConnection();
  try {
    // 1. Check if existing visitor token is already valid for this consultancy (First-Touch wins)
    if (existingToken && typeof existingToken === "string" && existingToken.length === 64) {
      const existingHash = crypto.createHash("sha256").update(existingToken).digest("hex");
      const [existingRows] = await connection.execute<RowDataPacket[]>(
        `SELECT id, expires_at FROM referral_attributions
         WHERE consultancy_id = ? AND visitor_token_hash = ?
           AND (expires_at IS NULL OR expires_at > UTC_TIMESTAMP(3))
         LIMIT 1;`,
        [validation.consultancyId, existingHash]
      );

      if (Array.isArray(existingRows) && existingRows.length > 0) {
        // First valid referral attribution preserved
        return {
          valid: true,
          token: existingToken,
          consultancyId: validation.consultancyId,
          consultancySlug: validation.consultancySlug,
        };
      }
    }

    // 2. Generate new opaque token (32 bytes = 64 hex chars)
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const publicId = crypto.randomUUID();

    await connection.execute(
      `INSERT INTO referral_attributions (
         public_id, consultancy_id, referral_code_id, referrer_member_id,
         visitor_token_hash, first_click_at, expires_at, status
       ) VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP(3), DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 30 DAY), 'PENDING');`,
      [publicId, validation.consultancyId, validation.codeId, validation.referrerMemberId, tokenHash]
    );

    return {
      valid: true,
      token: rawToken,
      consultancyId: validation.consultancyId,
      consultancySlug: validation.consultancySlug,
    };
  } finally {
    connection.release();
  }
}

/**
 * Binds an anonymous visitor attribution token to a registered user ID.
 */
export async function bindReferralAttributionToUser(
  token: string,
  userId: number
): Promise<{ success: boolean; boundCount?: number }> {
  if (!token || typeof token !== "string" || !userId) {
    return { success: false, boundCount: 0 };
  }

  const tokenHash = crypto.createHash("sha256").update(token.trim()).digest("hex");
  const connection = await getDbConnection();
  try {
    const [result] = await connection.execute<ResultSetHeader>(
      `UPDATE referral_attributions
       SET referred_user_id = ?,
           registered_at = UTC_TIMESTAMP(3),
           status = 'REGISTERED',
           updated_at = UTC_TIMESTAMP(3)
       WHERE visitor_token_hash = ?
         AND status = 'PENDING'
         AND (expires_at IS NULL OR expires_at > UTC_TIMESTAMP(3));`,
      [userId, tokenHash]
    );

    if (result.affectedRows > 0) {
      try {
        const [refRows] = await connection.execute<RowDataPacket[]>(
          `SELECT ra.consultancy_id, cm.user_id AS referrer_user_id, c.slug AS consultancy_slug
           FROM referral_attributions ra
           JOIN consultancy_members cm ON cm.id = ra.referrer_member_id
           JOIN consultancies c ON c.id = ra.consultancy_id
           WHERE ra.visitor_token_hash = ?
           LIMIT 1;`,
          [tokenHash]
        );
        if (Array.isArray(refRows) && refRows.length > 0) {
          const rRow = refRows[0];
          await createNotificationInTransaction(connection, {
            userId: Number(rRow.referrer_user_id),
            consultancyId: Number(rRow.consultancy_id),
            priority: "NORMAL",
            eventType: "REFERRAL_IDENTIFIED",
            title: "Nova indicação identificada",
            body: "Você recebeu uma nova indicação pelo seu link.",
            deepLink: `/consultoria/${rRow.consultancy_slug}/indicacoes`,
            dedupeKey: `ref_registered_${userId}_${rRow.consultancy_id}`,
          });
        }
      } catch {
        // Non-blocking
      }
    }

    return { success: true, boundCount: result.affectedRows };
  } finally {
    connection.release();
  }
}

/**
 * Record referral conversion upon becoming an ACTIVE STUDENT member in the SAME consultancy.
 * Idempotent, handles FIXED_AMOUNT (immediate cents) and PERCENTAGE (rate basis points snapshot, final amount pending admin base approval).
 */
export async function recordReferralConversion(
  consultancyId: number,
  studentMemberId: number,
  studentUserId?: number,
  referralCode?: string
): Promise<{ success: boolean; commissionCreated?: boolean; commissionId?: number; error?: string }> {
  await ensurePromotionalCampaignsSchema();
  const connection = await getDbConnection();
  try {
    // 1. Verify student membership in this consultancy
    const [studentRows] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id, cm.user_id, cm.status
       FROM consultancy_members cm
       JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.id = ? AND cm.consultancy_id = ? AND cm.status = 'ACTIVE' AND cmr.role = 'STUDENT'
       LIMIT 1;`,
      [studentMemberId, consultancyId]
    );

    if (!Array.isArray(studentRows) || studentRows.length === 0) {
      return { success: false, error: "Aluno não elegível ou inativo na consultoria." };
    }

    const resolvedStudentUserId = studentUserId ? Number(studentUserId) : Number(studentRows[0].user_id);

    // 2. Check if a commission already exists for this student member (Idempotency)
    const [existingComm] = await connection.execute<RowDataPacket[]>(
      `SELECT id, status, final_amount, final_amount_cents
       FROM referral_commissions
       WHERE consultancy_id = ? AND referred_member_id = ?
       LIMIT 1;`,
      [consultancyId, studentMemberId]
    );

    if (Array.isArray(existingComm) && existingComm.length > 0) {
      return { success: true, commissionCreated: false, commissionId: Number(existingComm[0].id) };
    }

    // 3. Locate attribution row
    let attributionRow: RowDataPacket | null = null;

    if (referralCode && typeof referralCode === "string" && referralCode.trim().length > 0) {
      const [attrByCode] = await connection.execute<RowDataPacket[]>(
        `SELECT ra.id, rc.consultancy_id, rc.referrer_member_id,
                cm.user_id AS referrer_user_id, cm.status AS referrer_status,
                rc.id AS referral_code_id
         FROM referral_codes rc
         JOIN consultancy_members cm ON cm.id = rc.referrer_member_id
         LEFT JOIN referral_attributions ra ON ra.referral_code_id = rc.id AND (ra.referred_user_id = ? OR ra.referred_member_id = ?)
         WHERE rc.code = ? AND rc.consultancy_id = ? AND rc.is_active = 1
         LIMIT 1;`,
        [resolvedStudentUserId, studentMemberId, referralCode.trim().toUpperCase(), consultancyId]
      );
      if (Array.isArray(attrByCode) && attrByCode.length > 0) {
        attributionRow = attrByCode[0];
      }
    }

    if (!attributionRow || !attributionRow.id) {
      const [attrByUser] = await connection.execute<RowDataPacket[]>(
        `SELECT ra.id, ra.consultancy_id, ra.referrer_member_id,
                cm.user_id AS referrer_user_id, cm.status AS referrer_status,
                ra.referral_code_id
         FROM referral_attributions ra
         JOIN consultancy_members cm ON cm.id = ra.referrer_member_id
         WHERE ra.consultancy_id = ? AND (ra.referred_user_id = ? OR ra.referred_member_id = ?)
           AND ra.status IN ('PENDING', 'REGISTERED')
           AND (ra.expires_at IS NULL OR ra.expires_at > UTC_TIMESTAMP(3))
         ORDER BY ra.first_click_at ASC
         LIMIT 1;`,
        [consultancyId, resolvedStudentUserId, studentMemberId]
      );
      if (Array.isArray(attrByUser) && attrByUser.length > 0) {
        attributionRow = attrByUser[0];
      }
    }

    if (!attributionRow) {
      return { success: false, error: "Nenhuma atribuição válida de indicação encontrada." };
    }

    // 4. Validate self-referral
    if (
      Number(attributionRow.referrer_member_id) === studentMemberId ||
      Number(attributionRow.referrer_user_id) === resolvedStudentUserId
    ) {
      return { success: false, error: "Auto-indicação não é permitida." };
    }

    // 5. Validate cross-tenant & referrer status
    if (Number(attributionRow.consultancy_id) !== consultancyId) {
      return { success: false, error: "Atribuição pertence a outra consultoria." };
    }
    if (attributionRow.referrer_status !== "ACTIVE") {
      return { success: false, error: "Indicador não está ativo." };
    }

    // 6. Check consultancy referral program settings (must be explicitly enabled)
    const settings = await getConsultancyReferralSettings(consultancyId);
    if (!settings.isEnabled) {
      return { success: false, error: "Programa de indicações desativado nesta consultoria." };
    }

    let attributionId = Number(attributionRow.id);
    const referrerMemberId = Number(attributionRow.referrer_member_id);

    // If attribution wasn't in DB yet (direct conversion with code):
    if (!attributionId && attributionRow.referral_code_id) {
      const publicId = crypto.randomUUID();
      const [insertRes] = await connection.execute<ResultSetHeader>(
        `INSERT INTO referral_attributions (
          public_id, consultancy_id, referral_code_id, referrer_member_id,
          referred_user_id, referred_member_id, first_click_at, registered_at, converted_at, status
        ) VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3), UTC_TIMESTAMP(3), 'CONVERTED');`,
        [publicId, consultancyId, attributionRow.referral_code_id, referrerMemberId, resolvedStudentUserId, studentMemberId]
      );
      attributionId = insertRes.insertId;
    } else {
      await connection.execute(
        `UPDATE referral_attributions
         SET status = 'CONVERTED',
             referred_member_id = ?,
             referred_user_id = ?,
             converted_at = UTC_TIMESTAMP(3),
             updated_at = UTC_TIMESTAMP(3)
         WHERE id = ?;`,
        [studentMemberId, resolvedStudentUserId, attributionId]
      );
    }

    // 7. Check if attribution came from a specific promotional campaign link
    let commTypeToUse = settings.commissionType;
    let commValueToUse = settings.commissionValue;
    let commAmountCentsToUse = BigInt(settings.commissionAmountCents);
    let commRateBpToUse = settings.commissionRateBasisPoints;
    let campaignLinkIdToRecord: number | null = null;

    if (attributionRow.campaign_link_id) {
      const [campRows] = await connection.execute<RowDataPacket[]>(
        `SELECT id, commission_type, commission_amount_cents, commission_rate_basis_points
         FROM promotional_campaign_links
         WHERE id = ? AND consultancy_id = ?
         LIMIT 1;`,
        [attributionRow.campaign_link_id, consultancyId]
      );
      if (Array.isArray(campRows) && campRows.length > 0) {
        const cLink = campRows[0];
        campaignLinkIdToRecord = Number(cLink.id);
        if (cLink.commission_type === "FIXED" && cLink.commission_amount_cents != null) {
          commTypeToUse = "FIXED_AMOUNT";
          commAmountCentsToUse = BigInt(cLink.commission_amount_cents);
          commValueToUse = Number(commAmountCentsToUse) / 100;
        } else if (cLink.commission_type === "PERCENTAGE" && cLink.commission_rate_basis_points != null) {
          commTypeToUse = "PERCENTAGE";
          commRateBpToUse = Number(cLink.commission_rate_basis_points);
          commValueToUse = commRateBpToUse / 100;
        }

        // Increment campaign link uses
        await connection.execute(
          `UPDATE promotional_campaign_links SET current_uses = current_uses + 1 WHERE id = ?;`,
          [cLink.id]
        );
      }
    }

    // 7. Snapshot rule & create commission
    const commissionPublicId = crypto.randomUUID();

    if (commTypeToUse === "PERCENTAGE") {
      // Percentage Commission: rate basis points is snapshotted.
      // Final monetary amount remains unset until admin approves with legitimate base amount.
      await connection.execute(
        `INSERT INTO referral_commissions (
           public_id, consultancy_id, campaign_link_id, attribution_id, referrer_member_id, referred_member_id,
           commission_type_snapshot, commission_rate_snapshot, rate_basis_points,
           base_amount_cents, final_amount_cents, final_amount, currency, status
         ) VALUES (?, ?, ?, ?, ?, ?, 'PERCENTAGE', ?, ?, NULL, NULL, NULL, 'BRL', 'PENDING')
         ON DUPLICATE KEY UPDATE updated_at = UTC_TIMESTAMP(3);`,
        [
          commissionPublicId,
          consultancyId,
          campaignLinkIdToRecord,
          attributionId,
          referrerMemberId,
          studentMemberId,
          commValueToUse,
          commRateBpToUse,
        ]
      );
    } else {
      // Fixed Amount: exact cents snapshotted
      const finalAmountFormatted = centsToBrl(commAmountCentsToUse);

      await connection.execute(
        `INSERT INTO referral_commissions (
           public_id, consultancy_id, campaign_link_id, attribution_id, referrer_member_id, referred_member_id,
           commission_type_snapshot, commission_rate_snapshot, rate_basis_points,
           base_amount_cents, final_amount_cents, final_amount, currency, status
         ) VALUES (?, ?, ?, ?, ?, ?, 'FIXED_AMOUNT', ?, NULL, NULL, ?, ?, 'BRL', 'PENDING')
         ON DUPLICATE KEY UPDATE updated_at = UTC_TIMESTAMP(3);`,
        [
          commissionPublicId,
          consultancyId,
          campaignLinkIdToRecord,
          attributionId,
          referrerMemberId,
          studentMemberId,
          commValueToUse,
          commAmountCentsToUse.toString(),
          finalAmountFormatted,
        ]
      );
    }

    const [newCommRows] = await connection.execute<RowDataPacket[]>(
      "SELECT id FROM referral_commissions WHERE consultancy_id = ? AND referred_member_id = ? ORDER BY id DESC LIMIT 1;",
      [consultancyId, studentMemberId]
    );
    const commissionId = newCommRows[0]?.id ? Number(newCommRows[0].id) : undefined;

    try {
      await createNotificationInTransaction(connection, {
        userId: Number(attributionRow.referrer_user_id),
        consultancyId,
        priority: "NORMAL",
        eventType: "REFERRAL_CONVERSION_CONFIRMED",
        title: "Contratação confirmada",
        body: "Contratação confirmada: sua comissão está em análise.",
        deepLink: `/consultoria/${attributionRow.consultancy_slug || ""}/indicacoes`,
        dedupeKey: `comm_conversion_${commissionPublicId}`,
      });
    } catch {
      // Non-blocking
    }

    return { success: true, commissionCreated: true, commissionId };
  } finally {
    connection.release();
  }
}

/**
 * Register referral lead upon student accepting invitation or joining consultancy.
 * Updates attribution row to REGISTERED status. NEVER creates a commission or sends
 * "Contratação confirmada" prematurely without real financial confirmation.
 */
export async function registerReferralLeadOnStudentAccept(
  consultancyId: number,
  studentMemberId: number,
  studentUserId: number
): Promise<{ success: boolean; leadRegistered?: boolean; error?: string }> {
  const connection = await getDbConnection();
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT ra.id, ra.referrer_member_id, cm.user_id AS referrer_user_id, c.slug AS consultancy_slug
       FROM referral_attributions ra
       JOIN consultancy_members cm ON cm.id = ra.referrer_member_id
       JOIN consultancies c ON c.id = ra.consultancy_id
       WHERE ra.consultancy_id = ? AND ra.referred_user_id = ?
         AND ra.status = 'PENDING'
         AND (ra.expires_at IS NULL OR ra.expires_at > UTC_TIMESTAMP(3))
       ORDER BY ra.first_click_at ASC
       LIMIT 1;`,
      [consultancyId, studentUserId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return { success: true, leadRegistered: false };
    }

    const attr = rows[0];

    // Prevent self-referral
    if (Number(attr.referrer_member_id) === studentMemberId || Number(attr.referrer_user_id) === studentUserId) {
      return { success: false, error: "Auto-indicação não é permitida." };
    }

    await connection.execute(
      `UPDATE referral_attributions
       SET referred_member_id = ?,
           registered_at = UTC_TIMESTAMP(3),
           status = 'REGISTERED',
           updated_at = UTC_TIMESTAMP(3)
       WHERE id = ?;`,
      [studentMemberId, attr.id]
    );

    try {
      await createNotificationInTransaction(connection, {
        userId: Number(attr.referrer_user_id),
        consultancyId,
        priority: "NORMAL",
        eventType: "REFERRAL_IDENTIFIED",
        title: "Nova indicação identificada",
        body: "Um novo aluno se cadastrou pelo seu link de indicação.",
        deepLink: `/consultoria/${attr.consultancy_slug || ""}/indicacoes`,
        dedupeKey: `ref_registered_${studentUserId}_${consultancyId}`,
      });
    } catch {
      // Non-blocking
    }

    return { success: true, leadRegistered: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    connection.release();
  }
}

export interface RegisterManualSaleParams {
  consultancyId: number;
  adminMemberId: number;
  adminUserId: number;
  referrerMemberId: number;
  campaignLinkId?: number | null;
  buyerStudentMemberId?: number | null;
  buyerName?: string | null;
  saleAmountCents: bigint | number;
  customCommissionAmountCents?: bigint | number | null;
  notes?: string | null;
  status?: "APPROVED" | "PENDING";
  externalReference?: string | null;
}

/**
 * Registers an audited, confirmed manual referral sale (e.g. from external checkouts).
 * Never relies on browser cookies. Strictly validates tenancy, calculates cents exactly,
 * provides concurrent deduplication on externalReference and logs audit activity.
 */
export async function registerManualReferralSale(
  params: RegisterManualSaleParams
): Promise<{
  success: boolean;
  commissionPublicId?: string;
  commissionId?: number;
  amountFormatted?: string;
  error?: string;
}> {
  await ensurePromotionalCampaignsSchema();
  const {
    consultancyId,
    adminMemberId,
    adminUserId,
    referrerMemberId,
    campaignLinkId,
    buyerStudentMemberId,
    buyerName,
    saleAmountCents,
    customCommissionAmountCents,
    notes,
    status = "APPROVED",
    externalReference,
  } = params;

  if (!consultancyId || !adminMemberId || !referrerMemberId) {
    return { success: false, error: "Parâmetros obrigatórios incompletos." };
  }

  const baseCents = BigInt(saleAmountCents);
  if (baseCents <= BigInt(0)) {
    return { success: false, error: "O valor da venda deve ser maior que zero." };
  }

  const cleanBuyerName = buyerName ? buyerName.trim() : null;
  if (!buyerStudentMemberId && !cleanBuyerName) {
    return { success: false, error: "Informe o aluno comprador ou o nome do comprador externo." };
  }

  const cleanExternalRef = externalReference && typeof externalReference === "string" ? externalReference.trim() : null;

  const connection = await getDbConnection();
  try {
    await connection.beginTransaction();

    // 1. Concurrency and Deduplication Lock on external reference if provided
    if (cleanExternalRef) {
      try {
        const [existingRefRows] = await connection.execute<RowDataPacket[]>(
          `SELECT id, public_id FROM referral_commissions
           WHERE consultancy_id = ? AND external_reference = ?
           LIMIT 1 FOR UPDATE;`,
          [consultancyId, cleanExternalRef]
        );
        if (Array.isArray(existingRefRows) && existingRefRows.length > 0) {
          await connection.rollback();
          return {
            success: false,
            error: `Uma comissão já foi registrada para esta referência externa (${cleanExternalRef}).`,
          };
        }
      } catch {
        // Non-blocking if column does not exist yet
      }
    }

    // 2. Validate Referrer Member belongs to consultancy and is ACTIVE
    const [referrerRows] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id, cm.user_id, cm.status, u.full_name, c.slug AS consultancy_slug
       FROM consultancy_members cm
       JOIN users u ON u.id = cm.user_id
       JOIN consultancies c ON c.id = cm.consultancy_id
       WHERE cm.id = ? AND cm.consultancy_id = ? AND cm.status = 'ACTIVE'
       LIMIT 1 FOR UPDATE;`,
      [referrerMemberId, consultancyId]
    );

    if (!Array.isArray(referrerRows) || referrerRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Participante indicador não encontrado ou inativo nesta consultoria." };
    }
    const referrer = referrerRows[0];

    // 3. Self-referral prevention
    if (buyerStudentMemberId && Number(buyerStudentMemberId) === Number(referrerMemberId)) {
      await connection.rollback();
      return { success: false, error: "Auto-indicação não é permitida." };
    }

    // 4. Resolve Commission rules and amounts
    let commType: CommissionType = "FIXED_AMOUNT";
    let commRateSnapshot = 0;
    let rateBp: number | null = null;
    let finalCents: bigint;

    if (
      customCommissionAmountCents !== undefined &&
      customCommissionAmountCents !== null &&
      BigInt(customCommissionAmountCents) >= BigInt(0)
    ) {
      finalCents = BigInt(customCommissionAmountCents);
      commType = "FIXED_AMOUNT";
      commRateSnapshot = Number(finalCents) / 100;
    } else if (campaignLinkId) {
      const [linkRows] = await connection.execute<RowDataPacket[]>(
        `SELECT id, commission_type, commission_amount_cents, commission_rate_basis_points
         FROM promotional_campaign_links
         WHERE id = ? AND consultancy_id = ?
         LIMIT 1 FOR UPDATE;`,
        [campaignLinkId, consultancyId]
      );

      if (Array.isArray(linkRows) && linkRows.length > 0) {
        const cLink = linkRows[0];
        if (cLink.commission_type === "PERCENTAGE" && cLink.commission_rate_basis_points != null) {
          commType = "PERCENTAGE";
          rateBp = Number(cLink.commission_rate_basis_points);
          commRateSnapshot = rateBp / 100;
          finalCents = calculatePercentageCommissionExact(baseCents, rateBp);
        } else {
          commType = "FIXED_AMOUNT";
          finalCents = BigInt(cLink.commission_amount_cents || 5000);
          commRateSnapshot = Number(finalCents) / 100;
        }

        // Increment current uses of link
        await connection.execute(
          `UPDATE promotional_campaign_links SET current_uses = current_uses + 1 WHERE id = ?;`,
          [cLink.id]
        );
      } else {
        finalCents = BigInt(5000);
      }
    } else {
      const settings = await getConsultancyReferralSettings(consultancyId);
      if (settings.commissionType === "PERCENTAGE") {
        commType = "PERCENTAGE";
        rateBp = settings.commissionRateBasisPoints;
        commRateSnapshot = rateBp / 100;
        finalCents = calculatePercentageCommissionExact(baseCents, rateBp);
      } else {
        commType = "FIXED_AMOUNT";
        finalCents = BigInt(settings.commissionAmountCents);
        commRateSnapshot = Number(finalCents) / 100;
      }
    }

    const finalAmountStr = centsToBrl(finalCents);
    const commissionPublicId = crypto.randomUUID();

    // 5. Attribution lookup or creation
    let attributionId: number = 0;
    if (buyerStudentMemberId) {
      const [attrRows] = await connection.execute<RowDataPacket[]>(
        `SELECT id FROM referral_attributions
         WHERE consultancy_id = ? AND referrer_member_id = ? AND referred_member_id = ?
         LIMIT 1;`,
        [consultancyId, referrerMemberId, buyerStudentMemberId]
      );
      if (Array.isArray(attrRows) && attrRows.length > 0) {
        attributionId = Number(attrRows[0].id);
        await connection.execute(
          `UPDATE referral_attributions
           SET status = 'CONVERTED', converted_at = UTC_TIMESTAMP(3), updated_at = UTC_TIMESTAMP(3)
           WHERE id = ?;`,
          [attributionId]
        );
      }
    }

    if (!attributionId) {
      const attrPublicId = crypto.randomUUID();
      let referralCodeId: number = 0;
      const [rcRows] = await connection.execute<RowDataPacket[]>(
        `SELECT id FROM referral_codes WHERE consultancy_id = ? AND referrer_member_id = ? LIMIT 1;`,
        [consultancyId, referrerMemberId]
      );
      if (Array.isArray(rcRows) && rcRows.length > 0) {
        referralCodeId = Number(rcRows[0].id);
      } else {
        const [insCode] = await connection.execute<ResultSetHeader>(
          `INSERT INTO referral_codes (public_id, consultancy_id, referrer_member_id, code, is_active)
           VALUES (?, ?, ?, ?, 1);`,
          [crypto.randomUUID(), consultancyId, referrerMemberId, generateReferralCodeString()]
        );
        referralCodeId = insCode.insertId;
      }

      const [insAttr] = await connection.execute<ResultSetHeader>(
        `INSERT INTO referral_attributions (
           public_id, consultancy_id, referral_code_id, campaign_link_id, referrer_member_id,
           referred_member_id, first_click_at, registered_at, converted_at, status
         ) VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3), UTC_TIMESTAMP(3), 'CONVERTED');`,
        [
          attrPublicId,
          consultancyId,
          referralCodeId,
          campaignLinkId || null,
          referrerMemberId,
          buyerStudentMemberId || null,
        ]
      );
      attributionId = insAttr.insertId;
    }

    // 6. Insert Commission with defensive fallback for optional columns
    const initialStatus = status === "APPROVED" ? "APPROVED" : "PENDING";
    const paymentNoteVal = notes ? notes.trim() : "Venda manual registrada pelo administrador";

    try {
      await connection.execute(
        `INSERT INTO referral_commissions (
           public_id, consultancy_id, campaign_link_id, attribution_id, referrer_member_id,
           referred_member_id, buyer_name, external_reference, commission_type_snapshot,
           commission_rate_snapshot, rate_basis_points, base_amount_cents, final_amount_cents,
           final_amount, currency, status, approved_at, approved_by_member_id, payment_note
         ) VALUES (
           ?, ?, ?, ?, ?,
           ?, ?, ?, ?,
           ?, ?, ?, ?,
           ?, 'BRL', ?, ${initialStatus === "APPROVED" ? "UTC_TIMESTAMP(3)" : "NULL"}, ?, ?
         );`,
        [
          commissionPublicId,
          consultancyId,
          campaignLinkId || null,
          attributionId,
          referrerMemberId,
          buyerStudentMemberId || null,
          cleanBuyerName,
          cleanExternalRef,
          commType,
          commRateSnapshot,
          rateBp,
          baseCents.toString(),
          finalCents.toString(),
          finalAmountStr,
          initialStatus,
          initialStatus === "APPROVED" ? adminMemberId : null,
          paymentNoteVal,
        ]
      );
    } catch {
      // Defensive fallback if buyer_name or external_reference columns don't exist in DB schema yet
      const combinedNote = [
        paymentNoteVal,
        cleanBuyerName ? `Comprador: ${cleanBuyerName}` : null,
        cleanExternalRef ? `Ref: ${cleanExternalRef}` : null,
      ]
        .filter(Boolean)
        .join(" | ");

      await connection.execute(
        `INSERT INTO referral_commissions (
           public_id, consultancy_id, campaign_link_id, attribution_id, referrer_member_id,
           referred_member_id, commission_type_snapshot, commission_rate_snapshot,
           rate_basis_points, base_amount_cents, final_amount_cents, final_amount,
           currency, status, approved_at, approved_by_member_id, payment_note
         ) VALUES (
           ?, ?, ?, ?, ?,
           ?, ?, ?,
           ?, ?, ?, ?,
           'BRL', ?, ${initialStatus === "APPROVED" ? "UTC_TIMESTAMP(3)" : "NULL"}, ?, ?
         );`,
        [
          commissionPublicId,
          consultancyId,
          campaignLinkId || null,
          attributionId,
          referrerMemberId,
          buyerStudentMemberId || null,
          commType,
          commRateSnapshot,
          rateBp,
          baseCents.toString(),
          finalCents.toString(),
          finalAmountStr,
          initialStatus,
          initialStatus === "APPROVED" ? adminMemberId : null,
          combinedNote,
        ]
      );
    }

    const [idRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM referral_commissions WHERE public_id = ? LIMIT 1;`,
      [commissionPublicId]
    );
    const commissionId = idRows[0]?.id ? Number(idRows[0].id) : undefined;

    // 7. Audit log
    await recordConsultancyActivity({
      consultancyId,
      actorUserId: adminUserId,
      actorMembershipId: adminMemberId,
      actorRole: "CONSULTANCY_ADMIN",
      action: "MANUAL_REFERRAL_SALE_RECORDED",
      module: "ADMIN",
      resourceType: "referral_commission",
      resourcePublicId: commissionPublicId,
      summary: `Venda manual registrada (R$ ${centsToBrl(baseCents)}) para parceiro ${referrer.full_name} — Comissão: R$ ${finalAmountStr}`,
      connection,
    }).catch(() => {});

    // 8. Notification to Referrer
    try {
      await createNotificationInTransaction(connection, {
        userId: Number(referrer.user_id),
        consultancyId,
        priority: "NORMAL",
        eventType: initialStatus === "APPROVED" ? "REFERRAL_COMMISSION_APPROVED" : "REFERRAL_CONVERSION_CONFIRMED",
        title: initialStatus === "APPROVED" ? "Comissão aprovada" : "Nova comissão registrada",
        body: `Uma venda de R$ ${centsToBrl(baseCents)} foi confirmada para seu link. Comissão: R$ ${finalAmountStr}.`,
        deepLink: `/consultoria/${referrer.consultancy_slug || ""}/indicacoes`,
        dedupeKey: `comm_manual_${commissionPublicId}`,
      });
    } catch {
      // Non-blocking
    }

    await connection.commit();
    return {
      success: true,
      commissionPublicId,
      commissionId,
      amountFormatted: finalAmountStr,
    };
  } catch (err: unknown) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro interno ao registrar venda manual.",
    };
  } finally {
    connection.release();
  }
}

/**
 * State Machine Transition: PENDING -> APPROVED
 * For PERCENTAGE commissions: baseAmountCents is required to compute exact final amount.
 */
export async function approveCommission(
  consultancyId: number,
  commissionId: number,
  adminMemberId: number,
  adminUserId: number,
  baseAmountCents?: bigint | number
): Promise<{ success: boolean; error?: string }> {
  const connection = await getDbConnection();
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, status, commission_type_snapshot, rate_basis_points,
              base_amount_cents, final_amount_cents, final_amount, referrer_member_id
       FROM referral_commissions
       WHERE id = ? AND consultancy_id = ?
       LIMIT 1;`,
      [commissionId, consultancyId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return { success: false, error: "Comissão não encontrada." };
    }

    const comm = rows[0];

    // State machine check: only PENDING can transition to APPROVED
    if (comm.status === "APPROVED") {
      return { success: false, error: "Comissão já foi aprovada." };
    }
    if (comm.status === "PAID") {
      return { success: false, error: "Comissões pagas não podem ser modificadas." };
    }
    if (comm.status === "CANCELLED") {
      return { success: false, error: "Comissões canceladas não podem ser aprovadas." };
    }
    if (comm.status !== "PENDING") {
      return { success: false, error: "Status inválido para aprovação." };
    }

    let finalCents: bigint;
    let finalAmountStr: string;
    let baseCentsToRecord: bigint | null = null;

    if (comm.commission_type_snapshot === "PERCENTAGE") {
      if (baseAmountCents === undefined || baseAmountCents === null || BigInt(baseAmountCents) <= BigInt(0)) {
        return {
          success: false,
          error: "Para comissões percentuais, é obrigatório informar o valor base legítimo da comissão.",
        };
      }
      baseCentsToRecord = BigInt(baseAmountCents);
      const rateBp = Number(comm.rate_basis_points || 1000);
      finalCents = calculatePercentageCommissionExact(baseCentsToRecord, rateBp);
      finalAmountStr = centsToBrl(finalCents);
    } else {
      finalCents = comm.final_amount_cents != null
        ? BigInt(comm.final_amount_cents)
        : brlToCents(Number(comm.final_amount || 50));
      finalAmountStr = centsToBrl(finalCents);
    }

    // Conditional atomic update
    const [updateResult] = await connection.execute<ResultSetHeader>(
      `UPDATE referral_commissions
       SET status = 'APPROVED',
           approved_at = UTC_TIMESTAMP(3),
           approved_by_member_id = ?,
           base_amount_cents = ?,
           final_amount_cents = ?,
           final_amount = ?,
           updated_at = UTC_TIMESTAMP(3)
       WHERE id = ? AND consultancy_id = ? AND status = 'PENDING';`,
      [
        adminMemberId,
        baseCentsToRecord != null ? baseCentsToRecord.toString() : null,
        finalCents.toString(),
        finalAmountStr,
        commissionId,
        consultancyId,
      ]
    );

    if (updateResult.affectedRows !== 1) {
      return { success: false, error: "Não foi possível aprovar a comissão (concorrência ou status alterado)." };
    }

    try {
      const [refUserRows] = await connection.execute<RowDataPacket[]>(
        `SELECT cm.user_id, c.slug AS consultancy_slug
         FROM consultancy_members cm
         JOIN consultancies c ON c.id = cm.consultancy_id
         WHERE cm.id = ? AND cm.consultancy_id = ? LIMIT 1;`,
        [comm.referrer_member_id, consultancyId]
      );
      if (Array.isArray(refUserRows) && refUserRows.length > 0) {
        await createNotificationInTransaction(connection, {
          userId: Number(refUserRows[0].user_id),
          consultancyId,
          priority: "NORMAL",
          eventType: "REFERRAL_COMMISSION_APPROVED",
          title: "Comissão aprovada",
          body: `Comissão aprovada: R$ ${finalAmountStr}.`,
          deepLink: `/consultoria/${refUserRows[0].consultancy_slug}/indicacoes`,
          dedupeKey: `comm_approved_${commissionId}`,
        });
      }
    } catch {
      // Non-blocking
    }

    await recordConsultancyActivity({
      consultancyId,
      actorUserId: adminUserId,
      actorMembershipId: adminMemberId,
      actorRole: "CONSULTANCY_ADMIN",
      action: "APPROVE_REFERRAL_COMMISSION",
      module: "ADMIN",
      resourceType: "referral_commissions",
      resourcePublicId: String(commissionId),
      subjectMembershipId: comm.referrer_member_id,
      summary: `Comissão de indicação no valor de R$ ${finalAmountStr} aprovada pelo administrador.`,
      metadata: { commissionId, amount: finalAmountStr, amountCents: finalCents.toString() },
    });

    return { success: true };
  } finally {
    connection.release();
  }
}

/**
 * State Machine Transition: PENDING/APPROVED -> CANCELLED
 * Terminal state: CANCELLED cannot transition to anything.
 * PAID commissions cannot be cancelled.
 */
export async function cancelCommission(
  consultancyId: number,
  commissionId: number,
  adminMemberId: number,
  adminUserId: number,
  cancellationReason: string
): Promise<{ success: boolean; error?: string }> {
  if (!cancellationReason || !cancellationReason.trim()) {
    return { success: false, error: "É obrigatório informar o motivo do cancelamento." };
  }

  const connection = await getDbConnection();
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, status, final_amount, referrer_member_id
       FROM referral_commissions
       WHERE id = ? AND consultancy_id = ?
       LIMIT 1;`,
      [commissionId, consultancyId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return { success: false, error: "Comissão não encontrada." };
    }

    const comm = rows[0];
    if (comm.status === "PAID") {
      return { success: false, error: "Comissões já pagas não podem ser canceladas." };
    }
    if (comm.status === "CANCELLED") {
      return { success: false, error: "Comissão já está cancelada." };
    }

    const [updateResult] = await connection.execute<ResultSetHeader>(
      `UPDATE referral_commissions
       SET status = 'CANCELLED',
           cancelled_at = UTC_TIMESTAMP(3),
           cancelled_by_member_id = ?,
           cancellation_reason = ?,
           updated_at = UTC_TIMESTAMP(3)
       WHERE id = ? AND consultancy_id = ? AND status IN ('PENDING', 'APPROVED');`,
      [adminMemberId, cancellationReason.trim(), commissionId, consultancyId]
    );

    if (updateResult.affectedRows !== 1) {
      return { success: false, error: "Não foi possível cancelar a comissão." };
    }

    try {
      const [refUserRows] = await connection.execute<RowDataPacket[]>(
        `SELECT cm.user_id, c.slug AS consultancy_slug
         FROM consultancy_members cm
         JOIN consultancies c ON c.id = cm.consultancy_id
         WHERE cm.id = ? AND cm.consultancy_id = ? LIMIT 1;`,
        [comm.referrer_member_id, consultancyId]
      );
      if (Array.isArray(refUserRows) && refUserRows.length > 0) {
        await createNotificationInTransaction(connection, {
          userId: Number(refUserRows[0].user_id),
          consultancyId,
          priority: "NORMAL",
          eventType: "REFERRAL_COMMISSION_CANCELLED",
          title: "Comissão cancelada",
          body: `Comissão cancelada: ${cancellationReason.trim()}.`,
          deepLink: `/consultoria/${refUserRows[0].consultancy_slug}/indicacoes`,
          dedupeKey: `comm_cancelled_${commissionId}`,
        });
      }
    } catch {
      // Non-blocking
    }

    await recordConsultancyActivity({
      consultancyId,
      actorUserId: adminUserId,
      actorMembershipId: adminMemberId,
      actorRole: "CONSULTANCY_ADMIN",
      action: "CANCEL_REFERRAL_COMMISSION",
      module: "ADMIN",
      resourceType: "referral_commissions",
      resourcePublicId: String(commissionId),
      subjectMembershipId: comm.referrer_member_id,
      summary: `Comissão de indicação cancelada. Motivo: ${cancellationReason.trim()}`,
      metadata: { commissionId, reason: cancellationReason.trim() },
    });

    return { success: true };
  } finally {
    connection.release();
  }
}

/**
 * State Machine Transition: APPROVED -> PAID
 * STRICT: markCommissionPaid MUST reject PENDING.
 * Terminal state: PAID cannot transition to anything.
 */
export async function markCommissionPaid(
  consultancyId: number,
  commissionId: number,
  adminMemberId: number,
  adminUserId: number,
  paymentNote?: string
): Promise<{ success: boolean; error?: string }> {
  const connection = await getDbConnection();
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, status, final_amount, referrer_member_id
       FROM referral_commissions
       WHERE id = ? AND consultancy_id = ?
       LIMIT 1;`,
      [commissionId, consultancyId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return { success: false, error: "Comissão não encontrada." };
    }

    const comm = rows[0];

    // STRICT: reject PENDING
    if (comm.status === "PENDING") {
      return {
        success: false,
        error: "Apenas comissões aprovadas podem ser marcadas como pagas.",
      };
    }
    if (comm.status === "PAID") {
      return { success: false, error: "Comissão já foi marcada como paga." };
    }
    if (comm.status === "CANCELLED") {
      return { success: false, error: "Comissões canceladas não podem ser pagas." };
    }
    if (comm.status !== "APPROVED") {
      return { success: false, error: "Status inválido para pagamento." };
    }

    // Atomic conditional update
    const [updateResult] = await connection.execute<ResultSetHeader>(
      `UPDATE referral_commissions
       SET status = 'PAID',
           paid_at = UTC_TIMESTAMP(3),
           paid_by_member_id = ?,
           payment_note = ?,
           updated_at = UTC_TIMESTAMP(3)
       WHERE id = ? AND consultancy_id = ? AND status = 'APPROVED';`,
      [adminMemberId, paymentNote?.trim() || null, commissionId, consultancyId]
    );

    if (updateResult.affectedRows !== 1) {
      return { success: false, error: "Não foi possível liquidar o pagamento da comissão." };
    }

    try {
      const [refUserRows] = await connection.execute<RowDataPacket[]>(
        `SELECT cm.user_id, c.slug AS consultancy_slug
         FROM consultancy_members cm
         JOIN consultancies c ON c.id = cm.consultancy_id
         WHERE cm.id = ? AND cm.consultancy_id = ? LIMIT 1;`,
        [comm.referrer_member_id, consultancyId]
      );
      if (Array.isArray(refUserRows) && refUserRows.length > 0) {
        await createNotificationInTransaction(connection, {
          userId: Number(refUserRows[0].user_id),
          consultancyId,
          priority: "NORMAL",
          eventType: "REFERRAL_COMMISSION_PAID",
          title: "Comissão paga",
          body: `Comissão paga: R$ ${comm.final_amount} via PIX.`,
          deepLink: `/consultoria/${refUserRows[0].consultancy_slug}/indicacoes`,
          dedupeKey: `comm_paid_${commissionId}`,
        });
      }
    } catch {
      // Non-blocking
    }

    await recordConsultancyActivity({
      consultancyId,
      actorUserId: adminUserId,
      actorMembershipId: adminMemberId,
      actorRole: "CONSULTANCY_ADMIN",
      action: "PAY_REFERRAL_COMMISSION",
      module: "ADMIN",
      resourceType: "referral_commissions",
      resourcePublicId: String(commissionId),
      subjectMembershipId: comm.referrer_member_id,
      summary: `Comissão de indicação de R$ ${comm.final_amount} marcada como paga.`,
      metadata: { commissionId, amount: comm.final_amount, note: paymentNote },
    });

    return { success: true };
  } finally {
    connection.release();
  }
}

/**
 * PIX Payout Profiles:
 * No homemade encryption: storage isolated behind payout service.
 * Owner can retrieve full PIX key for edit/display.
 * Admin lists receive ONLY masked PIX.
 * Full key reveal requires explicit operation by authorized admin with audit logging.
 */
export async function saveMemberPayoutProfile(
  consultancyId: number,
  memberId: number,
  pixKeyType: PixKeyType,
  pixKey: string,
  receiverName?: string
): Promise<{ success: boolean; error?: string }> {
  if (!pixKey || !pixKey.trim()) {
    return { success: false, error: "Informe a chave PIX." };
  }
  const cleanKey = pixKey.trim();
  const validTypes = ["CPF", "CNPJ", "EMAIL", "PHONE", "RANDOM_KEY"];
  if (!validTypes.includes(pixKeyType)) {
    return { success: false, error: "Tipo de chave PIX inválido." };
  }

  let encryptedKey: string;
  try {
    encryptedKey = encryptPixKey(cleanKey);
  } catch {
    return { success: false, error: "Falha ao proteger a chave PIX para armazenamento." };
  }

  const connection = await getDbConnection();
  try {
    const publicId = crypto.randomUUID();
    await connection.execute(
      `INSERT INTO member_payout_profiles (public_id, consultancy_id, member_id, pix_key_type, pix_key, receiver_name)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         pix_key_type = VALUES(pix_key_type),
         pix_key = VALUES(pix_key),
         receiver_name = VALUES(receiver_name),
         updated_at = UTC_TIMESTAMP(3);`,
      [publicId, consultancyId, memberId, pixKeyType, encryptedKey, receiverName?.trim() || null]
    );

    return { success: true };
  } finally {
    connection.release();
  }
}

/**
 * Returns payout profile for the OWNER (member themselves).
 */
export async function getMemberPayoutProfile(
  consultancyId: number,
  memberId: number
): Promise<MemberPayoutProfile | null> {
  const connection = await getDbConnection();
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, consultancy_id, member_id, pix_key_type, pix_key, receiver_name, created_at, updated_at
       FROM member_payout_profiles
       WHERE consultancy_id = ? AND member_id = ?
       LIMIT 1;`,
      [consultancyId, memberId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    const r = rows[0];
    let decryptedKey = "";
    try {
      decryptedKey = decryptPixKey(r.pix_key);
    } catch {
      decryptedKey = "";
    }

    return {
      id: Number(r.id),
      publicId: r.public_id,
      consultancyId: Number(r.consultancy_id),
      memberId: Number(r.member_id),
      pixKeyType: r.pix_key_type as PixKeyType,
      pixKey: decryptedKey,
      pixKeyMasked: decryptedKey ? maskPixKey(r.pix_key_type, decryptedKey) : "Não cadastrado",
      receiverName: r.receiver_name,
      createdAt: new Date(r.created_at),
      updatedAt: new Date(r.updated_at),
    };
  } finally {
    connection.release();
  }
}

/**
 * Explicit reveal for authorized Admin with mandatory audit logging.
 * NEVER leaks raw PIX in logs or error messages.
 */
export async function getRevealedPayoutProfileForAdmin(
  consultancyId: number,
  targetMemberId: number,
  adminMemberId: number,
  adminUserId: number
): Promise<{ success: boolean; pixKey?: string; pixKeyType?: PixKeyType; receiverName?: string | null; error?: string }> {
  const connection = await getDbConnection();
  try {
    // Revalidate admin: same consultancy, active membership, correct effective role (CONSULTANCY_ADMIN)
    const [adminCheckRows] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id
       FROM consultancy_members cm
       JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.id = ? AND cm.consultancy_id = ? AND cm.user_id = ? AND cm.status = 'ACTIVE'
         AND cmr.role = 'CONSULTANCY_ADMIN'
       LIMIT 1;`,
      [adminMemberId, consultancyId, adminUserId]
    );

    if (!Array.isArray(adminCheckRows) || adminCheckRows.length === 0) {
      return { success: false, error: "Apenas administradores ativos da consultoria podem revelar dados PIX." };
    }

    // Verify target member belongs to the same consultancy
    const [memberRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM consultancy_members WHERE id = ? AND consultancy_id = ? LIMIT 1;`,
      [targetMemberId, consultancyId]
    );

    if (!Array.isArray(memberRows) || memberRows.length === 0) {
      return { success: false, error: "Membro não encontrado nesta consultoria." };
    }

    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, pix_key_type, pix_key, receiver_name
       FROM member_payout_profiles
       WHERE consultancy_id = ? AND member_id = ?
       LIMIT 1;`,
      [consultancyId, targetMemberId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return { success: false, error: "Perfil PIX não encontrado para este membro." };
    }

    const row = rows[0];

    let revealedKey = "";
    try {
      revealedKey = decryptPixKey(row.pix_key);
    } catch {
      return { success: false, error: "Falha ao decodificar a chave PIX protegida." };
    }

    // Audit log without raw PIX key in metadata
    await recordConsultancyActivity({
      consultancyId,
      actorUserId: adminUserId,
      actorMembershipId: adminMemberId,
      actorRole: "CONSULTANCY_ADMIN",
      action: "REVEAL_PIX_PAYOUT_KEY",
      module: "ADMIN",
      resourceType: "member_payout_profiles",
      resourcePublicId: row.public_id,
      subjectMembershipId: targetMemberId,
      summary: "Chave PIX completa consultada pelo administrador para fins de pagamento.",
      metadata: { targetMemberId, pixKeyType: row.pix_key_type },
    });

    return {
      success: true,
      pixKey: revealedKey,
      pixKeyType: row.pix_key_type as PixKeyType,
      receiverName: row.receiver_name,
    };
  } finally {
    connection.release();
  }
}

export async function getReferrerDashboardData(
  consultancyId: number,
  memberId: number
): Promise<{
  code: string;
  publicId: string;
  referralUrl: string;
  registrationsCount: number;
  conversionsCount: number;
  pendingAmount: number;
  approvedAmount: number;
  paidAmount: number;
  pixProfile: MemberPayoutProfile | null;
  commissions: Array<{
    id: number;
    publicId: string;
    amount: number;
    status: CommissionStatus;
    createdAt: Date;
    paidAt: Date | null;
  }>;
}> {
  await ensurePromotionalCampaignsSchema();
  const codeResult = await getOrCreateReferralCode(consultancyId, memberId);
  const code = codeResult.code || "";
  const publicId = codeResult.publicId || "";

  const connection = await getDbConnection();
  try {
    const [regRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM referral_attributions
       WHERE consultancy_id = ? AND referrer_member_id = ? AND referred_user_id IS NOT NULL;`,
      [consultancyId, memberId]
    );
    const registrationsCount = Number(regRows[0]?.total || 0);

    const [convRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM referral_attributions
       WHERE consultancy_id = ? AND referrer_member_id = ? AND status = 'CONVERTED';`,
      [consultancyId, memberId]
    );
    const conversionsCount = Number(convRows[0]?.total || 0);

    const [commAmounts] = await connection.execute<RowDataPacket[]>(
      `SELECT status,
              SUM(COALESCE(final_amount_cents, 0)) AS total_cents,
              SUM(COALESCE(final_amount, 0)) AS total_dec
       FROM referral_commissions
       WHERE consultancy_id = ? AND referrer_member_id = ?
       GROUP BY status;`,
      [consultancyId, memberId]
    );

    let pendingCents = BigInt(0);
    let approvedCents = BigInt(0);
    let paidCents = BigInt(0);

    for (const r of commAmounts) {
      const cents = r.total_cents != null
        ? BigInt(r.total_cents)
        : brlToCents(Number(r.total_dec || 0));
      if (r.status === "PENDING") pendingCents = cents;
      else if (r.status === "APPROVED") approvedCents = cents;
      else if (r.status === "PAID") paidCents = cents;
    }

    const pixProfile = await getMemberPayoutProfile(consultancyId, memberId);

    const [commList] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, final_amount, final_amount_cents, status, created_at, paid_at
       FROM referral_commissions
       WHERE consultancy_id = ? AND referrer_member_id = ?
       ORDER BY created_at DESC
       LIMIT 50;`,
      [consultancyId, memberId]
    );

    const commissions = commList.map((c) => {
      const cents = c.final_amount_cents != null
        ? BigInt(c.final_amount_cents)
        : (c.final_amount != null ? brlToCents(Number(c.final_amount)) : BigInt(0));
      return {
        id: Number(c.id),
        publicId: c.public_id,
        amount: Number(cents) / 100,
        status: c.status as CommissionStatus,
        createdAt: new Date(c.created_at),
        paidAt: c.paid_at ? new Date(c.paid_at) : null,
      };
    });

    return {
      code,
      publicId,
      referralUrl: `/r/${code}`,
      registrationsCount,
      conversionsCount,
      pendingAmount: Number(pendingCents) / 100,
      approvedAmount: Number(approvedCents) / 100,
      paidAmount: Number(paidCents) / 100,
      pixProfile,
      commissions,
    };
  } finally {
    connection.release();
  }
}

/**
 * Returns Admin dashboard data:
 * Masked PIX keys ONLY. Raw PIX keys are strictly excluded from serialization.
 */
export async function getAdminReferralsData(consultancyId: number): Promise<{
  settings: ConsultancyReferralSettings;
  kpis: {
    totalReferrers: number;
    totalRegistrations: number;
    totalConversions: number;
    pendingAmount: number;
    approvedAmount: number;
    paidAmount: number;
  };
  referrers: Array<{
    memberId: number;
    userPublicId: string;
    name: string;
    role: string;
    code: string;
    registrations: number;
    conversions: number;
    pendingAmount: number;
    paidAmount: number;
    hasPix: boolean;
  }>;
  commissions: Array<{
    id: number;
    publicId: string;
    referrerMemberId: number;
    referrerName: string;
    referrerRole: string;
    studentName: string;
    commissionType: CommissionType;
    rateBasisPoints: number | null;
    baseAmount: number | null;
    amount: number | null;
    status: CommissionStatus;
    pixMasked: string;
    createdAt: Date;
    approvedAt: Date | null;
    paidAt: Date | null;
  }>;
}> {
  await ensurePromotionalCampaignsSchema();
  const settings = await getConsultancyReferralSettings(consultancyId);
  const connection = await getDbConnection();
  try {
    const [kpiRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
         (SELECT COUNT(DISTINCT referrer_member_id) FROM referral_codes WHERE consultancy_id = ?) AS total_referrers,
         (SELECT COUNT(*) FROM referral_attributions WHERE consultancy_id = ? AND referred_user_id IS NOT NULL) AS total_registrations,
         (SELECT COUNT(*) FROM referral_attributions WHERE consultancy_id = ? AND status = 'CONVERTED') AS total_conversions,
         COALESCE((SELECT SUM(COALESCE(final_amount_cents, 0)) FROM referral_commissions WHERE consultancy_id = ? AND status = 'PENDING'), 0) AS pending_cents,
         COALESCE((SELECT SUM(COALESCE(final_amount_cents, 0)) FROM referral_commissions WHERE consultancy_id = ? AND status = 'APPROVED'), 0) AS approved_cents,
         COALESCE((SELECT SUM(COALESCE(final_amount_cents, 0)) FROM referral_commissions WHERE consultancy_id = ? AND status = 'PAID'), 0) AS paid_cents;`,
      [consultancyId, consultancyId, consultancyId, consultancyId, consultancyId, consultancyId]
    );
    const kpi = kpiRows[0];

    const [referrerRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
         cm.id AS member_id,
         u.public_id AS user_public_id,
         u.full_name,
         cmr.role,
         rc.code,
         (SELECT COUNT(*) FROM referral_attributions ra WHERE ra.consultancy_id = ? AND ra.referrer_member_id = cm.id AND ra.referred_user_id IS NOT NULL) AS registrations,
         (SELECT COUNT(*) FROM referral_attributions ra WHERE ra.consultancy_id = ? AND ra.referrer_member_id = cm.id AND ra.status = 'CONVERTED') AS conversions,
         COALESCE((SELECT SUM(COALESCE(rcm.final_amount_cents, 0)) FROM referral_commissions rcm WHERE rcm.consultancy_id = ? AND rcm.referrer_member_id = cm.id AND rcm.status IN ('PENDING', 'APPROVED')), 0) AS pending_cents,
         COALESCE((SELECT SUM(COALESCE(rcm.final_amount_cents, 0)) FROM referral_commissions rcm WHERE rcm.consultancy_id = ? AND rcm.referrer_member_id = cm.id AND rcm.status = 'PAID'), 0) AS paid_cents,
         mpp.id IS NOT NULL AS has_pix
       FROM referral_codes rc
       JOIN consultancy_members cm ON cm.id = rc.referrer_member_id
       JOIN users u ON u.id = cm.user_id
       JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       LEFT JOIN member_payout_profiles mpp ON mpp.consultancy_id = ? AND mpp.member_id = cm.id
       WHERE rc.consultancy_id = ?
       GROUP BY cm.id, u.public_id, u.full_name, cmr.role, rc.code, mpp.id
       ORDER BY conversions DESC, registrations DESC
       LIMIT 100;`,
      [consultancyId, consultancyId, consultancyId, consultancyId, consultancyId, consultancyId]
    );

    const referrers = referrerRows.map((r) => ({
      memberId: Number(r.member_id),
      userPublicId: r.user_public_id,
      name: r.full_name,
      role: r.role,
      code: r.code,
      registrations: Number(r.registrations || 0),
      conversions: Number(r.conversions || 0),
      pendingAmount: Number(BigInt(r.pending_cents || 0)) / 100,
      paidAmount: Number(BigInt(r.paid_cents || 0)) / 100,
      hasPix: Boolean(r.has_pix),
    }));

    // Query for commissions: Note that we select mpp.pix_key_type and masked representation, NEVER exposing raw pix_key in the returned structure!
    let commissionRows: RowDataPacket[] = [];
    try {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT
           rcm.id,
           rcm.public_id,
           rcm.referrer_member_id,
           u_ref.full_name AS referrer_name,
           cmr_ref.role AS referrer_role,
           COALESCE(u_stud.full_name, rcm.buyer_name, 'Cliente externo') AS student_name,
           rcm.commission_type_snapshot,
           rcm.rate_basis_points,
           rcm.base_amount_cents,
           rcm.final_amount_cents,
           rcm.final_amount,
           rcm.status,
           rcm.created_at,
           rcm.approved_at,
           rcm.paid_at,
           mpp.pix_key_type,
           mpp.pix_key
         FROM referral_commissions rcm
         JOIN consultancy_members cm_ref ON cm_ref.id = rcm.referrer_member_id
         JOIN users u_ref ON u_ref.id = cm_ref.user_id
         JOIN consultancy_member_roles cmr_ref ON cmr_ref.member_id = cm_ref.id
         LEFT JOIN consultancy_members cm_stud ON cm_stud.id = rcm.referred_member_id
         LEFT JOIN users u_stud ON u_stud.id = cm_stud.user_id
         LEFT JOIN member_payout_profiles mpp ON mpp.consultancy_id = ? AND mpp.member_id = rcm.referrer_member_id
         WHERE rcm.consultancy_id = ?
         ORDER BY rcm.created_at DESC
         LIMIT 100;`,
        [consultancyId, consultancyId]
      );
      commissionRows = rows;
    } catch {
      // Fallback if buyer_name column is not present
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT
           rcm.id,
           rcm.public_id,
           rcm.referrer_member_id,
           u_ref.full_name AS referrer_name,
           cmr_ref.role AS referrer_role,
           COALESCE(u_stud.full_name, 'Cliente externo') AS student_name,
           rcm.commission_type_snapshot,
           rcm.rate_basis_points,
           rcm.base_amount_cents,
           rcm.final_amount_cents,
           rcm.final_amount,
           rcm.status,
           rcm.created_at,
           rcm.approved_at,
           rcm.paid_at,
           mpp.pix_key_type,
           mpp.pix_key
         FROM referral_commissions rcm
         JOIN consultancy_members cm_ref ON cm_ref.id = rcm.referrer_member_id
         JOIN users u_ref ON u_ref.id = cm_ref.user_id
         JOIN consultancy_member_roles cmr_ref ON cmr_ref.member_id = cm_ref.id
         LEFT JOIN consultancy_members cm_stud ON cm_stud.id = rcm.referred_member_id
         LEFT JOIN users u_stud ON u_stud.id = cm_stud.user_id
         LEFT JOIN member_payout_profiles mpp ON mpp.consultancy_id = ? AND mpp.member_id = rcm.referrer_member_id
         WHERE rcm.consultancy_id = ?
         ORDER BY rcm.created_at DESC
         LIMIT 100;`,
        [consultancyId, consultancyId]
      );
      commissionRows = rows;
    }

    const commissions = commissionRows.map((c) => {
      // Calculate masked PIX immediately and drop raw key
      let masked = "Não cadastrado";
      if (c.pix_key) {
        try {
          const decrypted = decryptPixKey(c.pix_key);
          masked = maskPixKey(c.pix_key_type, decrypted);
        } catch {
          masked = "Chave protegida";
        }
      }
      const finalCents = c.final_amount_cents != null
        ? BigInt(c.final_amount_cents)
        : (c.final_amount != null ? brlToCents(Number(c.final_amount)) : null);
      const baseCents = c.base_amount_cents != null ? BigInt(c.base_amount_cents) : null;

      return {
        id: Number(c.id),
        publicId: c.public_id,
        referrerMemberId: Number(c.referrer_member_id),
        referrerName: c.referrer_name,
        referrerRole: c.referrer_role,
        studentName: c.student_name,
        commissionType: c.commission_type_snapshot as CommissionType,
        rateBasisPoints: c.rate_basis_points != null ? Number(c.rate_basis_points) : null,
        baseAmount: baseCents != null ? Number(baseCents) / 100 : null,
        amount: finalCents != null ? Number(finalCents) / 100 : null,
        status: c.status as CommissionStatus,
        pixMasked: masked,
        createdAt: new Date(c.created_at),
        approvedAt: c.approved_at ? new Date(c.approved_at) : null,
        paidAt: c.paid_at ? new Date(c.paid_at) : null,
      };
    });

    return {
      settings,
      kpis: {
        totalReferrers: Number(kpi?.total_referrers || 0),
        totalRegistrations: Number(kpi?.total_registrations || 0),
        totalConversions: Number(kpi?.total_conversions || 0),
        pendingAmount: Number(BigInt(kpi?.pending_cents || 0)) / 100,
        approvedAmount: Number(BigInt(kpi?.approved_cents || 0)) / 100,
        paidAmount: Number(BigInt(kpi?.paid_cents || 0)) / 100,
      },
      referrers,
      commissions,
    };
  } finally {
    connection.release();
  }
}
