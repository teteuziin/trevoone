/**
 * TREVO ONE — AI QUOTAS AND USAGE LEDGER ENGINE
 * Multi-tenant quota management, atomic reservations, role/member limits,
 * and usage event tracking with timezone-aware daily resets.
 */

import crypto from "node:crypto";
import type { PoolConnection, RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";
import { getConsultancyLocalDate } from "../consultancies/timezone";
import { ensureAiSchemaBootstrapped } from "../db/ai-schema-bootstrap";

export interface ConsultancyAiQuotaInfo {
  consultancyId: number;
  dailyLimit: number;
  isEnabled: boolean;
  notes: string | null;
  usedToday: number;
  remainingToday: number;
  dateBucket: string;
  timezone: string;
}

export interface MemberEffectiveAiQuotaInfo {
  consultancyId: number;
  memberId: number;
  userId: number;
  role: string;
  consultancyLimit: number;
  consultancyUsedToday: number;
  consultancyRemainingToday: number;
  isConsultancyEnabled: boolean;
  memberLimit: number;
  memberLimitSource: "MEMBER_OVERRIDE" | "ROLE_DEFAULT" | "SYSTEM_DEFAULT";
  memberUsedToday: number;
  memberRemainingToday: number;
  effectiveRemaining: number;
  canImport: boolean;
  blockReason?: "AI_DISABLED" | "CONSULTANCY_LIMIT_EXHAUSTED" | "MEMBER_LIMIT_EXHAUSTED";
  dateBucket: string;
}

export interface ReserveAiQuotaParams {
  consultancyId: number | bigint;
  memberId: number | bigint;
  userId: number | bigint;
  role: string;
  feature: "TRAINING_IMPORT" | "NUTRITION_IMPORT";
  model: string;
  importJobPublicId: string;
}

export interface ReserveAiQuotaResult {
  success: boolean;
  usageEventPublicId?: string;
  dateBucket?: string;
  blockReason?: "AI_DISABLED" | "CONSULTANCY_LIMIT_EXHAUSTED" | "MEMBER_LIMIT_EXHAUSTED" | "UNKNOWN";
  message?: string;
}

const DEFAULT_PLATFORM_DAILY_LIMIT = 20;
const DEFAULT_ROLE_LIMITS: Record<string, number> = {
  PERSONAL: 3,
  NUTRITIONIST: 5,
};

/**
 * Resolves the consultancy's canonical timezone and current local date bucket (YYYY-MM-DD).
 */
export async function getConsultancyDateBucket(
  consultancyId: number | bigint,
  conn?: PoolConnection
): Promise<{ timeZone: string; dateBucket: string }> {
  const shouldRelease = !conn;
  const db = conn || (await getDbConnection());
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT timezone FROM consultancies WHERE id = ? LIMIT 1`,
      [consultancyId]
    );
    const timeZone = (rows && rows[0]?.timezone) ? String(rows[0].timezone) : "America/Sao_Paulo";
    const dateBucket = getConsultancyLocalDate(timeZone);
    return { timeZone, dateBucket };
  } finally {
    if (shouldRelease) db.release();
  }
}

/**
 * Retrieves the platform-level daily quota and today's usage for a consultancy.
 */
export async function getConsultancyAiQuotaInfo(
  consultancyId: number | bigint,
  conn?: PoolConnection
): Promise<ConsultancyAiQuotaInfo> {
  await ensureAiSchemaBootstrapped();
  const shouldRelease = !conn;
  const db = conn || (await getDbConnection());
  try {
    const { timeZone, dateBucket } = await getConsultancyDateBucket(consultancyId, db);

    const [quotaRows] = await db.query<RowDataPacket[]>(
      `SELECT daily_limit, is_enabled, notes FROM consultancy_ai_quotas WHERE consultancy_id = ? LIMIT 1`,
      [consultancyId]
    );

    const dailyLimit = quotaRows.length > 0 ? Number(quotaRows[0].daily_limit) : DEFAULT_PLATFORM_DAILY_LIMIT;
    const isEnabled = quotaRows.length > 0 ? Boolean(quotaRows[0].is_enabled) : true;
    const notes = quotaRows.length > 0 ? (quotaRows[0].notes ? String(quotaRows[0].notes) : null) : null;

    const [usageRows] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS used_today FROM ai_usage_events
       WHERE consultancy_id = ? AND date_bucket = ? AND status IN ('RESERVED', 'CONSUMED')`,
      [consultancyId, dateBucket]
    );

    const usedToday = Number(usageRows[0]?.used_today || 0);
    const effectiveLimit = isEnabled ? dailyLimit : 0;
    const remainingToday = Math.max(0, effectiveLimit - usedToday);

    return {
      consultancyId: Number(consultancyId),
      dailyLimit,
      isEnabled,
      notes,
      usedToday,
      remainingToday,
      dateBucket,
      timezone: timeZone,
    };
  } finally {
    if (shouldRelease) db.release();
  }
}

/**
 * Calculates the effective quota for a specific member today, taking into account:
 * 1. Platform limit (consultancy ceiling)
 * 2. Member override in consultancy_ai_member_limits (if present)
 * 3. Role default in consultancy_ai_role_limits (if present, else fallback)
 * 4. Member's own consumption today
 */
export async function getMemberEffectiveAiQuota(params: {
  consultancyId: number | bigint;
  memberId: number | bigint;
  userId: number | bigint;
  role: string;
  conn?: PoolConnection;
}): Promise<MemberEffectiveAiQuotaInfo> {
  const { consultancyId, memberId, userId, role, conn } = params;
  const shouldRelease = !conn;
  const db = conn || (await getDbConnection());
  try {
    const consultancyInfo = await getConsultancyAiQuotaInfo(consultancyId, db);

    // 1. Check member override
    const [overrideRows] = await db.query<RowDataPacket[]>(
      `SELECT daily_limit FROM consultancy_ai_member_limits
       WHERE consultancy_id = ? AND membership_id = ? LIMIT 1`,
      [consultancyId, memberId]
    );

    let memberLimit: number;
    let memberLimitSource: "MEMBER_OVERRIDE" | "ROLE_DEFAULT" | "SYSTEM_DEFAULT";

    if (overrideRows.length > 0) {
      memberLimit = Number(overrideRows[0].daily_limit);
      memberLimitSource = "MEMBER_OVERRIDE";
    } else {
      // 2. Check role limit
      const [roleRows] = await db.query<RowDataPacket[]>(
        `SELECT daily_limit FROM consultancy_ai_role_limits
         WHERE consultancy_id = ? AND role = ? LIMIT 1`,
        [consultancyId, role]
      );
      if (roleRows.length > 0) {
        memberLimit = Number(roleRows[0].daily_limit);
        memberLimitSource = "ROLE_DEFAULT";
      } else {
        memberLimit = DEFAULT_ROLE_LIMITS[role] ?? 3;
        memberLimitSource = "SYSTEM_DEFAULT";
      }
    }

    // 3. Check member's consumption today
    const [memberUsageRows] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS member_used_today FROM ai_usage_events
       WHERE consultancy_id = ? AND member_id = ? AND date_bucket = ? AND status IN ('RESERVED', 'CONSUMED')`,
      [consultancyId, memberId, consultancyInfo.dateBucket]
    );

    const memberUsedToday = Number(memberUsageRows[0]?.member_used_today || 0);
    const memberRemainingToday = Math.max(0, memberLimit - memberUsedToday);

    // 4. Effective remaining is bound by BOTH consultancy ceiling and member ceiling
    const effectiveRemaining = Math.min(consultancyInfo.remainingToday, memberRemainingToday);

    let canImport = true;
    let blockReason: "AI_DISABLED" | "CONSULTANCY_LIMIT_EXHAUSTED" | "MEMBER_LIMIT_EXHAUSTED" | undefined;

    if (!consultancyInfo.isEnabled || consultancyInfo.dailyLimit === 0) {
      canImport = false;
      blockReason = "AI_DISABLED";
    } else if (consultancyInfo.remainingToday <= 0) {
      canImport = false;
      blockReason = "CONSULTANCY_LIMIT_EXHAUSTED";
    } else if (memberRemainingToday <= 0) {
      canImport = false;
      blockReason = "MEMBER_LIMIT_EXHAUSTED";
    }

    return {
      consultancyId: Number(consultancyId),
      memberId: Number(memberId),
      userId: Number(userId),
      role,
      consultancyLimit: consultancyInfo.dailyLimit,
      consultancyUsedToday: consultancyInfo.usedToday,
      consultancyRemainingToday: consultancyInfo.remainingToday,
      isConsultancyEnabled: consultancyInfo.isEnabled,
      memberLimit,
      memberLimitSource,
      memberUsedToday,
      memberRemainingToday,
      effectiveRemaining,
      canImport,
      blockReason,
      dateBucket: consultancyInfo.dateBucket,
    };
  } finally {
    if (shouldRelease) db.release();
  }
}

/**
 * Atomically reserves 1 AI quota unit inside a database transaction.
 * Uses SELECT ... FOR UPDATE to avoid race conditions.
 */
export async function reserveAiQuota(params: ReserveAiQuotaParams): Promise<ReserveAiQuotaResult> {
  const { consultancyId, memberId, userId, role, feature, model, importJobPublicId } = params;
  const recordedModel = model || process.env.OPENAI_IMPORT_MODEL || "gpt-4o";
  const db = await getDbConnection();

  try {
    await db.beginTransaction();

    // 1. Ensure consultancy_ai_quotas row exists with FOR UPDATE lock
    const [existingQuota] = await db.query<RowDataPacket[]>(
      `SELECT id, daily_limit, is_enabled FROM consultancy_ai_quotas WHERE consultancy_id = ? FOR UPDATE`,
      [consultancyId]
    );

    let dailyLimit = DEFAULT_PLATFORM_DAILY_LIMIT;
    let isEnabled = true;

    if (existingQuota.length === 0) {
      await db.query(
        `INSERT INTO consultancy_ai_quotas (consultancy_id, daily_limit, is_enabled) VALUES (?, ?, 1)`,
        [consultancyId, DEFAULT_PLATFORM_DAILY_LIMIT]
      );
    } else {
      dailyLimit = Number(existingQuota[0].daily_limit);
      isEnabled = Boolean(existingQuota[0].is_enabled);
    }

    // 2. Check consultancy enabled
    if (!isEnabled || dailyLimit === 0) {
      await db.rollback();
      return {
        success: false,
        blockReason: "AI_DISABLED",
        message: "O uso de IA está desativado para esta consultoria.",
      };
    }

    // 3. Resolve date bucket
    const [consRow] = await db.query<RowDataPacket[]>(
      `SELECT timezone FROM consultancies WHERE id = ? LIMIT 1`,
      [consultancyId]
    );
    const timeZone = (consRow && consRow[0]?.timezone) ? String(consRow[0].timezone) : "America/Sao_Paulo";
    const dateBucket = getConsultancyLocalDate(timeZone);

    // 4. Lock and count today's usage for the consultancy
    const [consUsageRows] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM ai_usage_events
       WHERE consultancy_id = ? AND date_bucket = ? AND status IN ('RESERVED', 'CONSUMED') FOR UPDATE`,
      [consultancyId, dateBucket]
    );
    const consultancyUsedToday = Number(consUsageRows[0]?.total || 0);

    if (consultancyUsedToday >= dailyLimit) {
      await db.rollback();
      return {
        success: false,
        blockReason: "CONSULTANCY_LIMIT_EXHAUSTED",
        message: "A cota diária de IA da consultoria foi atingida. Tente novamente amanhã ou contate a plataforma.",
      };
    }

    // 5. Check member limit
    const [memberOverride] = await db.query<RowDataPacket[]>(
      `SELECT daily_limit FROM consultancy_ai_member_limits WHERE consultancy_id = ? AND membership_id = ? LIMIT 1`,
      [consultancyId, memberId]
    );

    let memberLimit: number;
    if (memberOverride.length > 0) {
      memberLimit = Number(memberOverride[0].daily_limit);
    } else {
      const [roleLimitRow] = await db.query<RowDataPacket[]>(
        `SELECT daily_limit FROM consultancy_ai_role_limits WHERE consultancy_id = ? AND role = ? LIMIT 1`,
        [consultancyId, role]
      );
      memberLimit = roleLimitRow.length > 0 ? Number(roleLimitRow[0].daily_limit) : (DEFAULT_ROLE_LIMITS[role] ?? 3);
    }

    // Count member's usage today
    const [memberUsageRows] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM ai_usage_events
       WHERE consultancy_id = ? AND member_id = ? AND date_bucket = ? AND status IN ('RESERVED', 'CONSUMED') FOR UPDATE`,
      [consultancyId, memberId, dateBucket]
    );
    const memberUsedToday = Number(memberUsageRows[0]?.total || 0);

    if (memberUsedToday >= memberLimit) {
      await db.rollback();
      return {
        success: false,
        blockReason: "MEMBER_LIMIT_EXHAUSTED",
        message: "Você atingiu o limite de importações com IA de hoje. Fale com o administrador da sua consultoria.",
      };
    }

    // 6. Insert usage reservation
    const usageEventPublicId = crypto.randomUUID();
    await db.query<ResultSetHeader>(
      `INSERT INTO ai_usage_events (
        public_id, consultancy_id, member_id, user_id, role, feature,
        provider, model, import_job_public_id, status, date_bucket, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'OPENAI', ?, ?, 'RESERVED', ?, NOW(3), NOW(3))`,
      [
        usageEventPublicId,
        consultancyId,
        memberId,
        userId,
        role,
        feature,
        recordedModel,
        importJobPublicId,
        dateBucket,
      ]
    );

    await db.commit();

    return {
      success: true,
      usageEventPublicId,
      dateBucket,
    };
  } catch (err) {
    await db.rollback();
    throw err;
  } finally {
    db.release();
  }
}

/**
 * Transitions a RESERVED usage event to CONSUMED when OpenAI returns valid structured output.
 */
export async function markAiQuotaConsumed(
  usageEventPublicId: string,
  tokens?: { inputTokens?: number; outputTokens?: number; totalTokens?: number }
): Promise<boolean> {
  const db = await getDbConnection();
  try {
    const input = tokens?.inputTokens ?? null;
    const output = tokens?.outputTokens ?? null;
    const total = tokens?.totalTokens ?? (input && output ? input + output : null);

    const [res] = await db.query<ResultSetHeader>(
      `UPDATE ai_usage_events
       SET status = 'CONSUMED',
           input_tokens = COALESCE(?, input_tokens),
           output_tokens = COALESCE(?, output_tokens),
           total_tokens = COALESCE(?, total_tokens),
           updated_at = NOW(3)
       WHERE public_id = ? AND status = 'RESERVED'`,
      [input, output, total, usageEventPublicId]
    );

    return res.affectedRows > 0;
  } finally {
    db.release();
  }
}

/**
 * Automatically refunds a quota reservation if an internal error, timeout, or provider 5xx occurs.
 */
export async function refundAiQuota(
  usageEventPublicId: string
): Promise<boolean> {
  const db = await getDbConnection();
  try {
    const [res] = await db.query<ResultSetHeader>(
      `UPDATE ai_usage_events
       SET status = 'REFUNDED',
           updated_at = NOW(3)
       WHERE public_id = ? AND status = 'RESERVED'`,
      [usageEventPublicId]
    );

    return res.affectedRows > 0;
  } finally {
    db.release();
  }
}

/**
 * Platform Admin function to set or update a consultancy's global daily quota.
 */
export async function setConsultancyPlatformAiLimit(params: {
  consultancyId: number | bigint;
  dailyLimit: number;
  isEnabled?: boolean;
  notes?: string | null;
}): Promise<void> {
  const { consultancyId, dailyLimit, isEnabled = true, notes = null } = params;
  const db = await getDbConnection();
  try {
    await db.query(
      `INSERT INTO consultancy_ai_quotas (consultancy_id, daily_limit, is_enabled, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(3), NOW(3))
       ON DUPLICATE KEY UPDATE
         daily_limit = VALUES(daily_limit),
         is_enabled = VALUES(is_enabled),
         notes = VALUES(notes),
         updated_at = NOW(3)`,
      [consultancyId, Math.max(0, dailyLimit), isEnabled ? 1 : 0, notes]
    );
  } finally {
    db.release();
  }
}

/**
 * Consultancy Admin function to configure role limits (PERSONAL or NUTRITIONIST).
 */
export async function setConsultancyRoleAiLimit(params: {
  consultancyId: number | bigint;
  role: "PERSONAL" | "NUTRITIONIST";
  dailyLimit: number;
}): Promise<void> {
  const { consultancyId, role, dailyLimit } = params;
  const db = await getDbConnection();
  try {
    await db.query(
      `INSERT INTO consultancy_ai_role_limits (consultancy_id, role, daily_limit, created_at, updated_at)
       VALUES (?, ?, ?, NOW(3), NOW(3))
       ON DUPLICATE KEY UPDATE
         daily_limit = VALUES(daily_limit),
         updated_at = NOW(3)`,
      [consultancyId, role, Math.max(0, dailyLimit)]
    );
  } finally {
    db.release();
  }
}

/**
 * Consultancy Admin function to set a member-specific daily override.
 */
export async function setConsultancyMemberAiOverride(params: {
  consultancyId: number | bigint;
  membershipId?: number | bigint;
  memberId?: number | bigint;
  dailyLimit: number;
}): Promise<void> {
  const { consultancyId, dailyLimit } = params;
  const membershipId = params.membershipId ?? params.memberId;
  if (!membershipId) throw new Error("membershipId é obrigatório");
  const db = await getDbConnection();
  try {
    await db.query(
      `INSERT INTO consultancy_ai_member_limits (consultancy_id, membership_id, daily_limit, created_at, updated_at)
       VALUES (?, ?, ?, NOW(3), NOW(3))
       ON DUPLICATE KEY UPDATE
         daily_limit = VALUES(daily_limit),
         updated_at = NOW(3)`,
      [consultancyId, membershipId, Math.max(0, dailyLimit)]
    );
  } finally {
    db.release();
  }
}

/**
 * Consultancy Admin function to remove a member-specific override.
 */
export async function removeConsultancyMemberAiOverride(params: {
  consultancyId: number | bigint;
  membershipId?: number | bigint;
  memberId?: number | bigint;
}): Promise<void> {
  const { consultancyId } = params;
  const membershipId = params.membershipId ?? params.memberId;
  if (!membershipId) throw new Error("membershipId é obrigatório");
  const db = await getDbConnection();
  try {
    await db.query(
      `DELETE FROM consultancy_ai_member_limits WHERE consultancy_id = ? AND membership_id = ?`,
      [consultancyId, membershipId]
    );
  } finally {
    db.release();
  }
}

/**
 * Lists all consultancies with their AI limits and today's usage for the Platform Admin dashboard.
 */
export async function listPlatformAiUsageSummary(): Promise<Array<{
  consultancyId: number;
  consultancyPublicId: string;
  consultancyName: string;
  consultancySlug: string;
  timezone: string;
  dailyLimit: number;
  isEnabled: boolean;
  usedToday: number;
  remainingToday: number;
  lastUsedAt: string | null;
  status: string;
}>> {
  await ensureAiSchemaBootstrapped();
  const db = await getDbConnection();
  const defaultDateBucket = getConsultancyLocalDate("America/Sao_Paulo");
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT 
        c.id AS consultancy_id,
        c.public_id AS consultancy_public_id,
        c.name AS consultancy_name,
        c.slug AS consultancy_slug,
        COALESCE(c.timezone, 'America/Sao_Paulo') AS timezone,
        COALESCE(q.daily_limit, ${DEFAULT_PLATFORM_DAILY_LIMIT}) AS daily_limit,
        COALESCE(q.is_enabled, 1) AS is_enabled,
        (
          SELECT COUNT(*) 
          FROM ai_usage_events ue
          WHERE ue.consultancy_id = c.id
            AND ue.status IN ('RESERVED', 'CONSUMED')
            AND ue.date_bucket = ?
        ) AS used_today,
        (
          SELECT MAX(ue.created_at)
          FROM ai_usage_events ue
          WHERE ue.consultancy_id = c.id
        ) AS last_used_at
      FROM consultancies c
      LEFT JOIN consultancy_ai_quotas q ON q.consultancy_id = c.id
      ORDER BY c.name ASC`,
      [defaultDateBucket]
    );

    return rows.map((r) => {
      const dailyLimit = Number(r.daily_limit);
      const isEnabled = Boolean(r.is_enabled);
      const usedToday = Number(r.used_today || 0);
      const remainingToday = isEnabled ? Math.max(0, dailyLimit - usedToday) : 0;

      return {
        consultancyId: Number(r.consultancy_id),
        consultancyPublicId: String(r.consultancy_public_id),
        consultancyName: String(r.consultancy_name),
        consultancySlug: String(r.consultancy_slug),
        timezone: String(r.timezone),
        dailyLimit,
        isEnabled,
        usedToday,
        remainingToday,
        lastUsedAt: r.last_used_at ? new Date(r.last_used_at).toISOString() : null,
        status: !isEnabled ? "Desativado" : remainingToday === 0 ? "Esgotado" : "Ativo",
      };
    });
  } finally {
    db.release();
  }
}

/**
 * Lists all AI limits and overrides for a single consultancy for the Consultancy Admin view.
 */
export async function getConsultancyAiSettings(consultancyId: number | bigint): Promise<{
  consultancyQuota: ConsultancyAiQuotaInfo;
  roleLimits: {
    personal: number;
    nutritionist: number;
  };
  memberOverrides: Array<{
    membershipId: number;
    userFullName: string;
    userEmail: string;
    role: string;
    dailyLimit: number;
  }>;
}> {
  await ensureAiSchemaBootstrapped();
  const db = await getDbConnection();
  try {
    const quotaInfo = await getConsultancyAiQuotaInfo(consultancyId, db);

    const [roleRows] = await db.query<RowDataPacket[]>(
      `SELECT role, daily_limit FROM consultancy_ai_role_limits WHERE consultancy_id = ?`,
      [consultancyId]
    );

    let personal = DEFAULT_ROLE_LIMITS.PERSONAL;
    let nutritionist = DEFAULT_ROLE_LIMITS.NUTRITIONIST;

    for (const r of roleRows) {
      if (r.role === "PERSONAL") personal = Number(r.daily_limit);
      if (r.role === "NUTRITIONIST") nutritionist = Number(r.daily_limit);
    }

    const [memberRows] = await db.query<RowDataPacket[]>(
      `SELECT
        ml.membership_id,
        ml.daily_limit,
        u.full_name,
        u.email,
        GROUP_CONCAT(cmr.role) AS roles
       FROM consultancy_ai_member_limits ml
       INNER JOIN consultancy_members cm ON cm.id = ml.membership_id
       INNER JOIN users u ON u.id = cm.user_id
       LEFT JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE ml.consultancy_id = ?
       GROUP BY ml.membership_id, ml.daily_limit, u.full_name, u.email
       ORDER BY u.full_name ASC`,
      [consultancyId]
    );

    const memberOverrides = memberRows.map((r) => ({
      membershipId: Number(r.membership_id),
      userFullName: String(r.full_name),
      userEmail: String(r.email),
      role: String(r.roles || "PERSONAL"),
      dailyLimit: Number(r.daily_limit),
    }));

    return {
      consultancyQuota: quotaInfo,
      roleLimits: { personal, nutritionist },
      memberOverrides,
    };
  } finally {
    db.release();
  }
}
