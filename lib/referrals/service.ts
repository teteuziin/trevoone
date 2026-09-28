import crypto from "node:crypto";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { getDbConnection } from "@/lib/db/mysql";
import { recordConsultancyActivity } from "@/lib/consultancies/activity-log";

export type PixKeyType = "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "RANDOM_KEY";
export type CommissionType = "FIXED_AMOUNT" | "PERCENTAGE";
export type CommissionStatus = "PENDING" | "APPROVED" | "PAID" | "CANCELLED";

export interface ConsultancyReferralSettings {
  id: number;
  consultancyId: number;
  isEnabled: boolean;
  commissionType: CommissionType;
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
        return `***-****-${digits.slice(-4)}`;
      }
      return "***";
    }
    case "RANDOM_KEY":
    default: {
      if (clean.length > 8) {
        return `***${clean.slice(-6)}`;
      }
      return "***";
    }
  }
}

export function generateReferralCodeString(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let result = "";
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

export async function getConsultancyReferralSettings(
  consultancyId: number
): Promise<ConsultancyReferralSettings> {
  const connection = await getDbConnection();
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, consultancy_id, is_enabled, commission_type, commission_value, created_at, updated_at
       FROM consultancy_referral_settings
       WHERE consultancy_id = ?
       LIMIT 1;`,
      [consultancyId]
    );

    if (Array.isArray(rows) && rows.length > 0) {
      const r = rows[0];
      return {
        id: Number(r.id),
        consultancyId: Number(r.consultancy_id),
        isEnabled: Boolean(r.is_enabled),
        commissionType: r.commission_type as CommissionType,
        commissionValue: Number(r.commission_value),
        createdAt: new Date(r.created_at),
        updatedAt: new Date(r.updated_at),
      };
    }

    // Default configuration if not yet initialized
    return {
      id: 0,
      consultancyId,
      isEnabled: true,
      commissionType: "FIXED_AMOUNT",
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

  // Safe rounding to 2 decimal places (cents)
  const safeCommissionValue = Math.round(commissionValue * 100) / 100;

  const connection = await getDbConnection();
  try {
    await connection.execute(
      `INSERT INTO consultancy_referral_settings (consultancy_id, is_enabled, commission_type, commission_value)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         is_enabled = VALUES(is_enabled),
         commission_type = VALUES(commission_type),
         commission_value = VALUES(commission_value),
         updated_at = UTC_TIMESTAMP(3);`,
      [consultancyId, isEnabled ? 1 : 0, commissionType, safeCommissionValue]
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
      metadata: { isEnabled, commissionType, safeCommissionValue },
    });

    return { success: true };
  } finally {
    connection.release();
  }
}

export async function getOrCreateReferralCode(
  consultancyId: number,
  memberId: number
): Promise<{ success: boolean; code?: string; publicId?: string; error?: string }> {
  const connection = await getDbConnection();
  try {
    // 1. Verify membership is ACTIVE and has role STUDENT or INFLUENCER
    const [memberRows] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id, cm.status, cm.user_id
       FROM consultancy_members cm
       JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.id = ? AND cm.consultancy_id = ? AND cm.status = 'ACTIVE'
         AND cmr.role IN ('STUDENT', 'INFLUENCER')
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

    if (row.program_is_enabled === 0) {
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

export async function recordReferralConversion(
  consultancyId: number,
  studentMemberId: number,
  studentUserId: number,
  referralCode?: string
): Promise<{ success: boolean; commissionCreated?: boolean; error?: string }> {
  const connection = await getDbConnection();
  try {
    // 1. Revalidate student membership in this consultancy
    const [studentRows] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id, cm.user_id, cm.status
       FROM consultancy_members cm
       JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.id = ? AND cm.consultancy_id = ? AND cm.status = 'ACTIVE' AND cmr.role = 'STUDENT'
       LIMIT 1;`,
      [studentMemberId, consultancyId]
    );

    if (!Array.isArray(studentRows) || studentRows.length === 0) {
      return { success: false, error: "Membro indicado não é um aluno ativo na consultoria." };
    }

    // 2. Check if student already has a conversion in this consultancy (idempotency)
    const [existingConversion] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM referral_attributions
       WHERE consultancy_id = ? AND referred_member_id = ? AND status = 'CONVERTED'
       LIMIT 1;`,
      [consultancyId, studentMemberId]
    );

    if (Array.isArray(existingConversion) && existingConversion.length > 0) {
      return { success: true, commissionCreated: false };
    }

    // 3. Find attribution
    let attributionRow: RowDataPacket | null = null;

    if (referralCode) {
      const [attrByCode] = await connection.execute<RowDataPacket[]>(
        `SELECT ra.id, rc.consultancy_id, rc.referrer_member_id,
                cm.user_id AS referrer_user_id, cm.status AS referrer_status,
                rc.id AS referral_code_id
         FROM referral_codes rc
         JOIN consultancy_members cm ON cm.id = rc.referrer_member_id
         LEFT JOIN referral_attributions ra ON ra.referral_code_id = rc.id AND (ra.referred_user_id = ? OR ra.referred_member_id = ?)
         WHERE rc.code = ? AND rc.consultancy_id = ? AND rc.is_active = 1
         LIMIT 1;`,
        [studentUserId, studentMemberId, referralCode.trim().toUpperCase(), consultancyId]
      );
      if (Array.isArray(attrByCode) && attrByCode.length > 0) {
        attributionRow = attrByCode[0];
      }
    }

    if (!attributionRow || !attributionRow.id) {
      const [attrByUser] = await connection.execute<RowDataPacket[]>(
        `SELECT ra.id, ra.consultancy_id, ra.referrer_member_id,
                cm.user_id AS referrer_user_id, cm.status AS referrer_status
         FROM referral_attributions ra
         JOIN consultancy_members cm ON cm.id = ra.referrer_member_id
         WHERE ra.consultancy_id = ? AND (ra.referred_user_id = ? OR ra.referred_member_id = ?)
           AND ra.status IN ('PENDING', 'REGISTERED')
         ORDER BY ra.first_click_at ASC
         LIMIT 1;`,
        [consultancyId, studentUserId, studentMemberId]
      );
      if (Array.isArray(attrByUser) && attrByUser.length > 0) {
        attributionRow = attrByUser[0];
      }
    }

    // If still no attribution row, but referral code was valid: create attribution row
    if (!attributionRow) {
      return { success: false, error: "Nenhuma atribuição válida de indicação encontrada." };
    }

    // 4. Validate self-referral
    if (
      Number(attributionRow.referrer_member_id) === studentMemberId ||
      Number(attributionRow.referrer_user_id) === studentUserId
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

    // 6. Check consultancy referral program settings
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
        [publicId, consultancyId, attributionRow.referral_code_id, referrerMemberId, studentUserId, studentMemberId]
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
        [studentMemberId, studentUserId, attributionId]
      );
    }

    // 7. Snapshot rule and create commission proposal
    const commissionRateSnapshot = settings.commissionValue;
    const commissionTypeSnapshot = settings.commissionType;
    const finalAmount = Math.round(commissionRateSnapshot * 100) / 100;
    const commissionPublicId = crypto.randomUUID();

    await connection.execute(
      `INSERT INTO referral_commissions (
         public_id, consultancy_id, attribution_id, referrer_member_id, referred_member_id,
         commission_type_snapshot, commission_rate_snapshot, final_amount, currency, status
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'BRL', 'PENDING')
       ON DUPLICATE KEY UPDATE updated_at = UTC_TIMESTAMP(3);`,
      [
        commissionPublicId,
        consultancyId,
        attributionId,
        referrerMemberId,
        studentMemberId,
        commissionTypeSnapshot,
        commissionRateSnapshot,
        finalAmount,
      ]
    );

    return { success: true, commissionCreated: true };
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
      `SELECT status, SUM(final_amount) AS total
       FROM referral_commissions
       WHERE consultancy_id = ? AND referrer_member_id = ?
       GROUP BY status;`,
      [consultancyId, memberId]
    );

    let pendingAmount = 0;
    let approvedAmount = 0;
    let paidAmount = 0;

    for (const r of commAmounts) {
      const amt = Number(r.total || 0);
      if (r.status === "PENDING") pendingAmount = amt;
      else if (r.status === "APPROVED") approvedAmount = amt;
      else if (r.status === "PAID") paidAmount = amt;
    }

    const pixProfile = await getMemberPayoutProfile(consultancyId, memberId);

    const [commList] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, final_amount, status, created_at, paid_at
       FROM referral_commissions
       WHERE consultancy_id = ? AND referrer_member_id = ?
       ORDER BY created_at DESC
       LIMIT 50;`,
      [consultancyId, memberId]
    );

    const commissions = commList.map((c) => ({
      id: Number(c.id),
      publicId: c.public_id,
      amount: Number(c.final_amount),
      status: c.status as CommissionStatus,
      createdAt: new Date(c.created_at),
      paidAt: c.paid_at ? new Date(c.paid_at) : null,
    }));

    return {
      code,
      publicId,
      referralUrl: `/r/${code}`,
      registrationsCount,
      conversionsCount,
      pendingAmount: Math.round(pendingAmount * 100) / 100,
      approvedAmount: Math.round(approvedAmount * 100) / 100,
      paidAmount: Math.round(paidAmount * 100) / 100,
      pixProfile,
      commissions,
    };
  } finally {
    connection.release();
  }
}

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
    amount: number;
    status: CommissionStatus;
    pixMasked: string;
    createdAt: Date;
    approvedAt: Date | null;
    paidAt: Date | null;
  }>;
}> {
  const settings = await getConsultancyReferralSettings(consultancyId);
  const connection = await getDbConnection();
  try {
    const [kpiRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
         (SELECT COUNT(DISTINCT referrer_member_id) FROM referral_codes WHERE consultancy_id = ?) AS total_referrers,
         (SELECT COUNT(*) FROM referral_attributions WHERE consultancy_id = ? AND referred_user_id IS NOT NULL) AS total_registrations,
         (SELECT COUNT(*) FROM referral_attributions WHERE consultancy_id = ? AND status = 'CONVERTED') AS total_conversions,
         COALESCE((SELECT SUM(final_amount) FROM referral_commissions WHERE consultancy_id = ? AND status = 'PENDING'), 0) AS pending_amount,
         COALESCE((SELECT SUM(final_amount) FROM referral_commissions WHERE consultancy_id = ? AND status = 'APPROVED'), 0) AS approved_amount,
         COALESCE((SELECT SUM(final_amount) FROM referral_commissions WHERE consultancy_id = ? AND status = 'PAID'), 0) AS paid_amount;`,
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
         COALESCE((SELECT SUM(final_amount) FROM referral_commissions rcm WHERE rcm.consultancy_id = ? AND rcm.referrer_member_id = cm.id AND rcm.status IN ('PENDING', 'APPROVED')), 0) AS pending_amount,
         COALESCE((SELECT SUM(final_amount) FROM referral_commissions rcm WHERE rcm.consultancy_id = ? AND rcm.referrer_member_id = cm.id AND rcm.status = 'PAID'), 0) AS paid_amount,
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
      pendingAmount: Number(r.pending_amount || 0),
      paidAmount: Number(r.paid_amount || 0),
      hasPix: Boolean(r.has_pix),
    }));

    const [commissionRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
         rcm.id,
         rcm.public_id,
         rcm.referrer_member_id,
         u_ref.full_name AS referrer_name,
         cmr_ref.role AS referrer_role,
         u_stud.full_name AS student_name,
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
       JOIN consultancy_members cm_stud ON cm_stud.id = rcm.referred_member_id
       JOIN users u_stud ON u_stud.id = cm_stud.user_id
       LEFT JOIN member_payout_profiles mpp ON mpp.consultancy_id = ? AND mpp.member_id = rcm.referrer_member_id
       WHERE rcm.consultancy_id = ?
       ORDER BY rcm.created_at DESC
       LIMIT 100;`,
      [consultancyId, consultancyId]
    );

    const commissions = commissionRows.map((c) => ({
      id: Number(c.id),
      publicId: c.public_id,
      referrerMemberId: Number(c.referrer_member_id),
      referrerName: c.referrer_name,
      referrerRole: c.referrer_role,
      studentName: c.student_name,
      amount: Number(c.final_amount),
      status: c.status as CommissionStatus,
      pixMasked: c.pix_key ? maskPixKey(c.pix_key_type, c.pix_key) : "Sem PIX cadastrado",
      createdAt: new Date(c.created_at),
      approvedAt: c.approved_at ? new Date(c.approved_at) : null,
      paidAt: c.paid_at ? new Date(c.paid_at) : null,
    }));

    return {
      settings,
      kpis: {
        totalReferrers: Number(kpi?.total_referrers || 0),
        totalRegistrations: Number(kpi?.total_registrations || 0),
        totalConversions: Number(kpi?.total_conversions || 0),
        pendingAmount: Number(kpi?.pending_amount || 0),
        approvedAmount: Number(kpi?.approved_amount || 0),
        paidAmount: Number(kpi?.paid_amount || 0),
      },
      referrers,
      commissions,
    };
  } finally {
    connection.release();
  }
}

export async function approveCommission(
  consultancyId: number,
  commissionId: number,
  adminMemberId: number,
  adminUserId: number
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
    if (comm.status !== "PENDING") {
      return { success: false, error: `Comissão não está pendente (status atual: ${comm.status}).` };
    }

    await connection.execute(
      `UPDATE referral_commissions
       SET status = 'APPROVED',
           approved_at = UTC_TIMESTAMP(3),
           approved_by_member_id = ?,
           updated_at = UTC_TIMESTAMP(3)
       WHERE id = ? AND consultancy_id = ?;`,
      [adminMemberId, commissionId, consultancyId]
    );

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
      summary: `Comissão de indicação no valor de R$ ${comm.final_amount} aprovada pelo administrador.`,
      metadata: { commissionId, amount: comm.final_amount },
    });

    return { success: true };
  } finally {
    connection.release();
  }
}

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

    await connection.execute(
      `UPDATE referral_commissions
       SET status = 'CANCELLED',
           cancelled_at = UTC_TIMESTAMP(3),
           cancelled_by_member_id = ?,
           cancellation_reason = ?,
           updated_at = UTC_TIMESTAMP(3)
       WHERE id = ? AND consultancy_id = ?;`,
      [adminMemberId, cancellationReason.trim(), commissionId, consultancyId]
    );

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
      summary: `Comissão de indicação de R$ ${comm.final_amount} cancelada. Motivo: ${cancellationReason.trim()}`,
      metadata: { commissionId, amount: comm.final_amount, reason: cancellationReason.trim() },
    });

    return { success: true };
  } finally {
    connection.release();
  }
}

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
    if (comm.status === "PAID") {
      return { success: false, error: "Comissão já foi marcada como paga." };
    }
    if (comm.status === "CANCELLED") {
      return { success: false, error: "Comissão cancelada não pode ser paga." };
    }

    await connection.execute(
      `UPDATE referral_commissions
       SET status = 'PAID',
           paid_at = UTC_TIMESTAMP(3),
           paid_by_member_id = ?,
           payment_note = ?,
           updated_at = UTC_TIMESTAMP(3)
       WHERE id = ? AND consultancy_id = ?;`,
      [adminMemberId, paymentNote?.trim() || null, commissionId, consultancyId]
    );

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
      [publicId, consultancyId, memberId, pixKeyType, cleanKey, receiverName?.trim() || null]
    );

    return { success: true };
  } finally {
    connection.release();
  }
}

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
    return {
      id: Number(r.id),
      publicId: r.public_id,
      consultancyId: Number(r.consultancy_id),
      memberId: Number(r.member_id),
      pixKeyType: r.pix_key_type as PixKeyType,
      pixKey: r.pix_key,
      pixKeyMasked: maskPixKey(r.pix_key_type, r.pix_key),
      receiverName: r.receiver_name,
      createdAt: new Date(r.created_at),
      updatedAt: new Date(r.updated_at),
    };
  } finally {
    connection.release();
  }
}

export async function getRevealedPayoutProfileForAdmin(
  consultancyId: number,
  targetMemberId: number,
  adminMemberId: number,
  adminUserId: number
): Promise<{ success: boolean; pixKey?: string; pixKeyType?: PixKeyType; receiverName?: string | null; error?: string }> {
  const connection = await getDbConnection();
  try {
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
      pixKey: row.pix_key,
      pixKeyType: row.pix_key_type as PixKeyType,
      receiverName: row.receiver_name,
    };
  } finally {
    connection.release();
  }
}
