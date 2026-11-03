import crypto from "node:crypto";
import type { RowDataPacket, ResultSetHeader, PoolConnection } from "mysql2/promise";
import { getDbConnection } from "@/lib/db/mysql";
import { recordConsultancyActivity } from "@/lib/consultancies/activity-log";
import { brlToCents, centsToBrl, percentToBasisPoints, basisPointsToPercent } from "./service";
import { createNotificationInTransaction } from "@/services/notification-service";
import { ensurePromotionalCampaignsSchema } from "./schema-assurance";

export type CampaignLinkStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "ENDED";
export type AnnouncedDiscountType = "PERCENTAGE" | "FIXED" | "CUSTOM_TEXT" | "NONE";
export type CampaignCommissionType = "PERCENTAGE" | "FIXED";
export type MediaFormat = "STORY" | "FEED" | "BANNER" | "VIDEO";
export type MaterialStatus = "ACTIVE" | "ARCHIVED";

export interface PromotionalCampaignLinkRecord {
  id: number;
  publicId: string;
  consultancyId: number;
  referrerMemberId: number;
  referrerName?: string;
  referrerRole?: string;
  referrerUserPublicId?: string;
  referrerHasProfilePhoto?: boolean;
  referrerProfilePhotoUpdatedAt?: Date | string | null;
  code: string;
  title: string;
  description: string | null;
  destinationUrl: string;
  announcedDiscountType: AnnouncedDiscountType;
  announcedDiscountValue: string | null;
  eligiblePlans: string | null;
  commissionType: CampaignCommissionType;
  commissionAmountCents: number | null;
  commissionRateBasisPoints: number | null;
  commissionValueFormatted: string;
  commissionConditions: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  maxUses: number | null;
  currentUses: number;
  clickCount: number;
  conversionsCount?: number;
  status: CampaignLinkStatus;
  shareableUrl: string;
  createdAt: Date;
  updatedAt: Date;
  associatedMaterials?: PromotionalMarketingMaterialRecord[];
}

export interface PromotionalMarketingMaterialRecord {
  id: number;
  publicId: string;
  consultancyId: number;
  title: string;
  description: string | null;
  mediaFormat: MediaFormat;
  fileUrl: string | null;
  storageKey: string | null;
  fileSizeBytes: number | null;
  mimeType: string | null;
  suggestedCaption: string | null;
  isGlobal: boolean;
  targetMemberId: number | null;
  campaignLinkId: number | null;
  status: MaterialStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface EligiblePromotionParticipant {
  memberId: number;
  userId: number;
  userPublicId: string;
  name: string;
  role: string;
  status: string;
  hasProfilePhoto: boolean;
  profilePhotoUpdatedAt: Date | string | null;
  defaultCode: string | null;
  isPromotionEnabled: boolean;
  totalCampaignLinks: number;
  activeCampaignLinks: number;
  totalClicks: number;
  totalConversions: number;
  pendingAmount: number;
  paidAmount: number;
  hasPix: boolean;
}

import {
  isWhatsAppUrl,
  buildWhatsAppUrl,
  validateDestinationUrl,
  sanitizeCampaignCode,
} from "./url-utils";

export {
  isWhatsAppUrl,
  buildWhatsAppUrl,
  validateDestinationUrl,
  sanitizeCampaignCode,
};

/**
 * Generates an alphanumeric campaign code if not explicitly given.
 */
export function generateCampaignCode(prefix = "L"): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = prefix;
  const randomBytes = crypto.randomBytes(5);
  for (let i = 0; i < 5; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  return result;
}

/**
 * Dispatches an in-app notification to a participant safely.
 */
export async function notifyParticipant(
  connection: PoolConnection,
  params: {
    userId: number;
    consultancyId: number;
    eventType: string;
    title: string;
    body: string;
    deepLink?: string | null;
    dedupeKey?: string | null;
  }
): Promise<void> {
  try {
    await createNotificationInTransaction(connection, {
      userId: params.userId,
      consultancyId: params.consultancyId,
      priority: "NORMAL",
      eventType: params.eventType,
      title: params.title,
      body: params.body,
      deepLink: params.deepLink || null,
      dedupeKey: params.dedupeKey || null,
    });
  } catch (err) {
    // Notification failure must not roll back main business transaction
    console.error("[NOTIFY_PARTICIPANT_ERROR]", err);
  }
}

/**
 * Lists participants eligible for referral/promotional campaigns in this consultancy:
 * Scoped to active members with role STUDENT, INFLUENCER, or VIP in this consultancy.
 */
export async function listConsultancyParticipantsForPromotion(
  consultancyId: number
): Promise<EligiblePromotionParticipant[]> {
  await ensurePromotionalCampaignsSchema();
  const connection = await getDbConnection();
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
         cm.id AS member_id,
         cm.user_id,
         cm.status AS member_status,
         u.public_id AS user_public_id,
         u.full_name,
         u.has_profile_photo,
         u.profile_photo_updated_at,
         cmr.role,
         rc.code AS default_code,
         rc.is_active AS code_is_active,
         (SELECT COUNT(*) FROM promotional_campaign_links pcl WHERE pcl.consultancy_id = cm.consultancy_id AND pcl.referrer_member_id = cm.id) AS total_links,
         (SELECT COUNT(*) FROM promotional_campaign_links pcl WHERE pcl.consultancy_id = cm.consultancy_id AND pcl.referrer_member_id = cm.id AND pcl.status = 'ACTIVE') AS active_links,
         COALESCE((SELECT SUM(pcl.click_count) FROM promotional_campaign_links pcl WHERE pcl.consultancy_id = cm.consultancy_id AND pcl.referrer_member_id = cm.id), 0) AS total_clicks,
         (SELECT COUNT(*) FROM referral_attributions ra WHERE ra.consultancy_id = cm.consultancy_id AND ra.referrer_member_id = cm.id AND ra.status = 'CONVERTED') AS total_conversions,
         COALESCE((SELECT SUM(COALESCE(rcm.final_amount_cents, 0)) FROM referral_commissions rcm WHERE rcm.consultancy_id = cm.consultancy_id AND rcm.referrer_member_id = cm.id AND rcm.status IN ('PENDING', 'APPROVED')), 0) AS pending_cents,
         COALESCE((SELECT SUM(COALESCE(rcm.final_amount_cents, 0)) FROM referral_commissions rcm WHERE rcm.consultancy_id = cm.consultancy_id AND rcm.referrer_member_id = cm.id AND rcm.status = 'PAID'), 0) AS paid_cents,
         mpp.id IS NOT NULL AS has_pix
       FROM consultancy_members cm
       JOIN users u ON u.id = cm.user_id
       JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       LEFT JOIN referral_codes rc ON rc.consultancy_id = cm.consultancy_id AND rc.referrer_member_id = cm.id
       LEFT JOIN member_payout_profiles mpp ON mpp.consultancy_id = cm.consultancy_id AND mpp.member_id = cm.id
       WHERE cm.consultancy_id = ?
         AND cm.status = 'ACTIVE'
         AND cmr.role IN ('STUDENT', 'INFLUENCER', 'VIP')
       GROUP BY cm.id, cm.user_id, cm.status, u.public_id, u.full_name, u.has_profile_photo, u.profile_photo_updated_at, cmr.role, rc.code, rc.is_active, mpp.id
       ORDER BY (cmr.role = 'INFLUENCER') DESC, total_conversions DESC, u.full_name ASC;`,
      [consultancyId]
    );

    return rows.map((r) => ({
      memberId: Number(r.member_id),
      userId: Number(r.user_id),
      userPublicId: r.user_public_id,
      name: r.full_name,
      role: r.role,
      status: r.member_status,
      hasProfilePhoto: Boolean(r.has_profile_photo),
      profilePhotoUpdatedAt: r.profile_photo_updated_at ? new Date(r.profile_photo_updated_at) : null,
      defaultCode: r.default_code || null,
      isPromotionEnabled: r.code_is_active === 1 || r.code_is_active === true,
      totalCampaignLinks: Number(r.total_links || 0),
      activeCampaignLinks: Number(r.active_links || 0),
      totalClicks: Number(r.total_clicks || 0),
      totalConversions: Number(r.total_conversions || 0),
      pendingAmount: Number(BigInt(r.pending_cents || 0)) / 100,
      paidAmount: Number(BigInt(r.paid_cents || 0)) / 100,
      hasPix: Boolean(r.has_pix),
    }));
  } finally {
    connection.release();
  }
}

/**
 * Toggles a participant's promotion participation in this consultancy:
 * Habilitar ou pausar participação.
 */
export async function toggleParticipantPromotionStatus(
  consultancyId: number,
  memberId: number,
  isEnabled: boolean,
  adminMemberId: number,
  adminUserId: number
): Promise<{ success: boolean; error?: string }> {
  const connection = await getDbConnection();
  try {
    // 1. Validate target member belongs to this consultancy
    const [memberRows] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id, cm.user_id, u.full_name
       FROM consultancy_members cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.id = ? AND cm.consultancy_id = ? AND cm.status = 'ACTIVE'
       LIMIT 1;`,
      [memberId, consultancyId]
    );

    if (!Array.isArray(memberRows) || memberRows.length === 0) {
      return { success: false, error: "Participante não encontrado nesta consultoria." };
    }

    const member = memberRows[0];

    // 2. Ensure referral_codes row exists and toggle is_active
    const [codeRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM referral_codes WHERE consultancy_id = ? AND referrer_member_id = ? LIMIT 1;`,
      [consultancyId, memberId]
    );

    if (Array.isArray(codeRows) && codeRows.length > 0) {
      await connection.execute(
        `UPDATE referral_codes SET is_active = ?, updated_at = UTC_TIMESTAMP(3) WHERE consultancy_id = ? AND referrer_member_id = ?;`,
        [isEnabled ? 1 : 0, consultancyId, memberId]
      );
    } else {
      // Create code if not existing yet
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let code = "";
      const rb = crypto.randomBytes(6);
      for (let i = 0; i < 6; i++) code += chars[rb[i] % chars.length];
      const publicId = crypto.randomUUID();

      await connection.execute(
        `INSERT INTO referral_codes (public_id, consultancy_id, referrer_member_id, code, is_active)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE is_active = VALUES(is_active);`,
        [publicId, consultancyId, memberId, code, isEnabled ? 1 : 0]
      );
    }

    // 3. Update status of promotional links if pausing
    if (!isEnabled) {
      await connection.execute(
        `UPDATE promotional_campaign_links
         SET status = 'PAUSED', updated_at = UTC_TIMESTAMP(3)
         WHERE consultancy_id = ? AND referrer_member_id = ? AND status = 'ACTIVE';`,
        [consultancyId, memberId]
      );
    }

    // 4. Record activity
    await recordConsultancyActivity({
      consultancyId,
      actorUserId: adminUserId,
      actorMembershipId: adminMemberId,
      actorRole: "CONSULTANCY_ADMIN",
      action: isEnabled ? "ENABLE_PARTICIPANT_PROMOTION" : "PAUSE_PARTICIPANT_PROMOTION",
      module: "ADMIN",
      resourceType: "consultancy_members",
      subjectMembershipId: memberId,
      summary: `Participação no programa de divulgação de ${member.full_name} foi ${isEnabled ? "habilitada" : "pausada"}.`,
      metadata: { targetMemberId: memberId, isEnabled },
    });

    return { success: true };
  } finally {
    connection.release();
  }
}

export interface CreateCampaignLinkInput {
  consultancyId: number;
  referrerMemberId: number;
  title: string;
  destinationUrl: string;
  description?: string | null;
  code?: string | null;
  announcedDiscountType?: AnnouncedDiscountType;
  announcedDiscountValue?: string | null;
  eligiblePlans?: string | null;
  commissionType: CampaignCommissionType;
  commissionValue: number; // % (e.g. 10) or R$ (e.g. 50)
  commissionConditions?: string | null;
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
  maxUses?: number | null;
  status?: CampaignLinkStatus;
  materialIds?: number[];
}

/**
 * Creates an individual promotional campaign link manually configured by the admin:
 * - Scoped to consultancy and member
 * - Validates destination URL (never picked automatically by system)
 * - Discount and commission configured separately
 */
export async function createPromotionalCampaignLink(
  input: CreateCampaignLinkInput,
  adminMemberId: number,
  adminUserId: number
): Promise<{ success: boolean; linkId?: number; publicId?: string; code?: string; error?: string }> {
  await ensurePromotionalCampaignsSchema();
  // 1. Validate destination URL
  const urlCheck = validateDestinationUrl(input.destinationUrl);
  if (!urlCheck.valid || !urlCheck.normalized) {
    return { success: false, error: urlCheck.error || "URL de destino inválida." };
  }

  // 2. Validate title
  if (!input.title || !input.title.trim()) {
    return { success: false, error: "O título da divulgação é obrigatório." };
  }
  const cleanTitle = input.title.trim().slice(0, 191);

  // 3. Commission values
  if (input.commissionValue < 0) {
    return { success: false, error: "O valor da comissão não pode ser negativo." };
  }
  if (input.commissionType === "PERCENTAGE" && input.commissionValue > 100) {
    return { success: false, error: "A comissão percentual não pode exceder 100%." };
  }

  const commissionAmountCents = input.commissionType === "FIXED"
    ? brlToCents(input.commissionValue)
    : null;
  const commissionRateBasisPoints = input.commissionType === "PERCENTAGE"
    ? percentToBasisPoints(input.commissionValue)
    : null;

  const connection = await getDbConnection();
  try {
    // 4. Verify member belongs to consultancy and is active
    const [memberRows] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id, cm.user_id, u.full_name
       FROM consultancy_members cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.id = ? AND cm.consultancy_id = ? AND cm.status = 'ACTIVE'
       LIMIT 1;`,
      [input.referrerMemberId, input.consultancyId]
    );

    if (!Array.isArray(memberRows) || memberRows.length === 0) {
      return { success: false, error: "Participante não encontrado ou inativo nesta consultoria." };
    }

    const participant = memberRows[0];

    // 5. Code resolution & uniqueness
    let cleanCode = sanitizeCampaignCode(input.code || undefined);
    if (!cleanCode) {
      // Generate clean code
      const nameParts = participant.full_name.trim().split(/\s+/);
      const prefix = (nameParts[0] || "PROMO").replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase();
      cleanCode = generateCampaignCode(prefix || "PROMO");
    }

    // Verify code uniqueness in promotional_campaign_links and referral_codes
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      attempts++;
      const [existingPromo] = await connection.execute<RowDataPacket[]>(
        `SELECT id FROM promotional_campaign_links WHERE code = ? LIMIT 1;`,
        [cleanCode]
      );
      const [existingRef] = await connection.execute<RowDataPacket[]>(
        `SELECT id FROM referral_codes WHERE code = ? LIMIT 1;`,
        [cleanCode]
      );

      if (existingPromo.length === 0 && existingRef.length === 0) {
        isUnique = true;
      } else {
        cleanCode = generateCampaignCode("L");
      }
    }

    if (!isUnique) {
      return { success: false, error: "Não foi possível gerar um código único para esta campanha." };
    }

    const publicId = crypto.randomUUID();
    const status: CampaignLinkStatus = input.status || "ACTIVE";
    const discountType: AnnouncedDiscountType = input.announcedDiscountType || "PERCENTAGE";
    const discountValue = input.announcedDiscountValue?.trim() || null;
    const eligiblePlans = input.eligiblePlans?.trim().slice(0, 255) || null;
    const conditions = input.commissionConditions?.trim() || null;
    const description = input.description?.trim() || null;
    const startsAt = input.startsAt ? new Date(input.startsAt) : null;
    const endsAt = input.endsAt ? new Date(input.endsAt) : null;
    const maxUses = input.maxUses != null && Number(input.maxUses) > 0 ? Number(input.maxUses) : null;

    const [res] = await connection.execute<ResultSetHeader>(
      `INSERT INTO promotional_campaign_links (
         public_id, consultancy_id, referrer_member_id, code, title, description,
         destination_url, announced_discount_type, announced_discount_value, eligible_plans,
         commission_type, commission_amount_cents, commission_rate_basis_points,
         commission_conditions, starts_at, ends_at, max_uses, status, created_by_member_id
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        publicId,
        input.consultancyId,
        input.referrerMemberId,
        cleanCode,
        cleanTitle,
        description,
        urlCheck.normalized,
        discountType,
        discountValue,
        eligiblePlans,
        input.commissionType,
        commissionAmountCents ? commissionAmountCents.toString() : null,
        commissionRateBasisPoints,
        conditions,
        startsAt,
        endsAt,
        maxUses,
        status,
        adminMemberId,
      ]
    );

    const linkId = res.insertId;

    // Link materials if specified
    if (input.materialIds && Array.isArray(input.materialIds) && input.materialIds.length > 0) {
      for (const matId of input.materialIds) {
        if (Number(matId) > 0) {
          await connection.execute(
            `INSERT IGNORE INTO promotional_campaign_link_materials (campaign_link_id, material_id) VALUES (?, ?);`,
            [linkId, Number(matId)]
          );
        }
      }
    }

    // Record activity
    await recordConsultancyActivity({
      consultancyId: input.consultancyId,
      actorUserId: adminUserId,
      actorMembershipId: adminMemberId,
      actorRole: "CONSULTANCY_ADMIN",
      action: "CREATE_PROMOTIONAL_CAMPAIGN_LINK",
      module: "ADMIN",
      resourceType: "promotional_campaign_links",
      resourcePublicId: publicId,
      subjectMembershipId: input.referrerMemberId,
      summary: `Novo link de divulgação "${cleanTitle}" cadastrado para ${participant.full_name}.`,
      metadata: {
        linkId,
        code: cleanCode,
        title: cleanTitle,
        destinationUrl: urlCheck.normalized,
        commissionType: input.commissionType,
        commissionValue: input.commissionValue,
      },
    });

    return {
      success: true,
      linkId,
      publicId,
      code: cleanCode,
    };
  } finally {
    connection.release();
  }
}

export interface UpdateCampaignLinkInput {
  linkId: number;
  consultancyId: number;
  title: string;
  destinationUrl: string;
  description?: string | null;
  announcedDiscountType?: AnnouncedDiscountType;
  announcedDiscountValue?: string | null;
  eligiblePlans?: string | null;
  commissionType: CampaignCommissionType;
  commissionValue: number;
  commissionConditions?: string | null;
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
  maxUses?: number | null;
  status: CampaignLinkStatus;
  materialIds?: number[];
}

/**
 * Updates an individual campaign link.
 * Existing attributions/commissions maintain their snapshotted terms.
 */
export async function updatePromotionalCampaignLink(
  input: UpdateCampaignLinkInput,
  adminMemberId: number,
  adminUserId: number
): Promise<{ success: boolean; error?: string }> {
  await ensurePromotionalCampaignsSchema();
  const urlCheck = validateDestinationUrl(input.destinationUrl);
  if (!urlCheck.valid || !urlCheck.normalized) {
    return { success: false, error: urlCheck.error || "URL de destino inválida." };
  }

  if (!input.title || !input.title.trim()) {
    return { success: false, error: "O título da divulgação é obrigatório." };
  }
  const cleanTitle = input.title.trim().slice(0, 191);

  if (input.commissionValue < 0) {
    return { success: false, error: "O valor da comissão não pode ser negativo." };
  }
  if (input.commissionType === "PERCENTAGE" && input.commissionValue > 100) {
    return { success: false, error: "A comissão percentual não pode exceder 100%." };
  }

  const commissionAmountCents = input.commissionType === "FIXED"
    ? brlToCents(input.commissionValue)
    : null;
  const commissionRateBasisPoints = input.commissionType === "PERCENTAGE"
    ? percentToBasisPoints(input.commissionValue)
    : null;

  const connection = await getDbConnection();
  try {
    const [existing] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, referrer_member_id, code FROM promotional_campaign_links
       WHERE id = ? AND consultancy_id = ? LIMIT 1;`,
      [input.linkId, input.consultancyId]
    );

    if (!Array.isArray(existing) || existing.length === 0) {
      return { success: false, error: "Link de divulgação não encontrado nesta consultoria." };
    }

    const current = existing[0];
    const startsAt = input.startsAt ? new Date(input.startsAt) : null;
    const endsAt = input.endsAt ? new Date(input.endsAt) : null;
    const maxUses = input.maxUses != null && Number(input.maxUses) > 0 ? Number(input.maxUses) : null;

    await connection.execute(
      `UPDATE promotional_campaign_links
       SET title = ?,
           description = ?,
           destination_url = ?,
           announced_discount_type = ?,
           announced_discount_value = ?,
           eligible_plans = ?,
           commission_type = ?,
           commission_amount_cents = ?,
           commission_rate_basis_points = ?,
           commission_conditions = ?,
           starts_at = ?,
           ends_at = ?,
           max_uses = ?,
           status = ?,
           updated_at = UTC_TIMESTAMP(3)
       WHERE id = ? AND consultancy_id = ?;`,
      [
        cleanTitle,
        input.description?.trim() || null,
        urlCheck.normalized,
        input.announcedDiscountType || "PERCENTAGE",
        input.announcedDiscountValue?.trim() || null,
        input.eligiblePlans?.trim().slice(0, 255) || null,
        input.commissionType,
        commissionAmountCents ? commissionAmountCents.toString() : null,
        commissionRateBasisPoints,
        input.commissionConditions?.trim() || null,
        startsAt,
        endsAt,
        maxUses,
        input.status,
        input.linkId,
        input.consultancyId,
      ]
    );

    // Sync materials if provided
    if (input.materialIds && Array.isArray(input.materialIds)) {
      await connection.execute(
        `DELETE FROM promotional_campaign_link_materials WHERE campaign_link_id = ?;`,
        [input.linkId]
      );
      for (const matId of input.materialIds) {
        if (Number(matId) > 0) {
          await connection.execute(
            `INSERT IGNORE INTO promotional_campaign_link_materials (campaign_link_id, material_id) VALUES (?, ?);`,
            [input.linkId, Number(matId)]
          );
        }
      }
    }

    await recordConsultancyActivity({
      consultancyId: input.consultancyId,
      actorUserId: adminUserId,
      actorMembershipId: adminMemberId,
      actorRole: "CONSULTANCY_ADMIN",
      action: "UPDATE_PROMOTIONAL_CAMPAIGN_LINK",
      module: "ADMIN",
      resourceType: "promotional_campaign_links",
      resourcePublicId: current.public_id,
      subjectMembershipId: current.referrer_member_id,
      summary: `Link de divulgação "${cleanTitle}" atualizado pelo administrador.`,
      metadata: {
        linkId: input.linkId,
        code: current.code,
        destinationUrl: urlCheck.normalized,
        status: input.status,
      },
    });

    return { success: true };
  } finally {
    connection.release();
  }
}

/**
 * Lists campaign links for the administrator view:
 * Optionally filtered by participant (memberId).
 */
export async function listCampaignLinksForAdmin(
  consultancyId: number,
  memberId?: number
): Promise<PromotionalCampaignLinkRecord[]> {
  await ensurePromotionalCampaignsSchema();
  const connection = await getDbConnection();
  try {
    const params: (number | string)[] = [consultancyId];
    let memberFilter = "";
    if (memberId && Number(memberId) > 0) {
      memberFilter = "AND pcl.referrer_member_id = ?";
      params.push(Number(memberId));
    }

    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
         pcl.id,
         pcl.public_id,
         pcl.consultancy_id,
         pcl.referrer_member_id,
         pcl.code,
         pcl.title,
         pcl.description,
         pcl.destination_url,
         pcl.announced_discount_type,
         pcl.announced_discount_value,
         pcl.eligible_plans,
         pcl.commission_type,
         pcl.commission_amount_cents,
         pcl.commission_rate_basis_points,
         pcl.commission_conditions,
         pcl.starts_at,
         pcl.ends_at,
         pcl.max_uses,
         pcl.current_uses,
         pcl.click_count,
         pcl.status,
         pcl.created_at,
         pcl.updated_at,
         u.full_name AS referrer_name,
         u.public_id AS referrer_user_public_id,
         u.has_profile_photo AS referrer_has_profile_photo,
         u.profile_photo_updated_at AS referrer_profile_photo_updated_at,
         cmr.role AS referrer_role,
         (SELECT COUNT(*) FROM referral_attributions ra WHERE ra.campaign_link_id = pcl.id AND ra.status = 'CONVERTED') AS conversions_count
       FROM promotional_campaign_links pcl
       JOIN consultancy_members cm ON cm.id = pcl.referrer_member_id
       JOIN users u ON u.id = cm.user_id
       JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE pcl.consultancy_id = ?
         ${memberFilter}
       ORDER BY pcl.created_at DESC;`,
      params
    );

    return rows.map((r) => {
      const commType = r.commission_type as CampaignCommissionType;
      const amountCents = r.commission_amount_cents != null ? Number(r.commission_amount_cents) : null;
      const rateBp = r.commission_rate_basis_points != null ? Number(r.commission_rate_basis_points) : null;
      const formattedVal = commType === "FIXED"
        ? (amountCents != null ? `R$ ${centsToBrl(amountCents)}` : "R$ 0,00")
        : (rateBp != null ? `${basisPointsToPercent(rateBp)}%` : "0%");

      return {
        id: Number(r.id),
        publicId: r.public_id,
        consultancyId: Number(r.consultancy_id),
        referrerMemberId: Number(r.referrer_member_id),
        referrerName: r.referrer_name,
        referrerRole: r.referrer_role,
        referrerUserPublicId: r.referrer_user_public_id,
        referrerHasProfilePhoto: Boolean(r.referrer_has_profile_photo),
        referrerProfilePhotoUpdatedAt: r.referrer_profile_photo_updated_at ? new Date(r.referrer_profile_photo_updated_at) : null,
        code: r.code,
        title: r.title,
        description: r.description,
        destinationUrl: r.destination_url,
        announcedDiscountType: r.announced_discount_type as AnnouncedDiscountType,
        announcedDiscountValue: r.announced_discount_value,
        eligiblePlans: r.eligible_plans,
        commissionType: commType,
        commissionAmountCents: amountCents,
        commissionRateBasisPoints: rateBp,
        commissionValueFormatted: formattedVal,
        commissionConditions: r.commission_conditions,
        startsAt: r.starts_at ? new Date(r.starts_at) : null,
        endsAt: r.ends_at ? new Date(r.ends_at) : null,
        maxUses: r.max_uses != null ? Number(r.max_uses) : null,
        currentUses: Number(r.current_uses || 0),
        clickCount: Number(r.click_count || 0),
        conversionsCount: Number(r.conversions_count || 0),
        status: r.status as CampaignLinkStatus,
        shareableUrl: `/r/${r.code}`,
        createdAt: new Date(r.created_at),
        updatedAt: new Date(r.updated_at),
      };
    });
  } finally {
    connection.release();
  }
}

/**
 * Lists campaign links for a specific participant ("Meus links"):
 */
export async function listCampaignLinksForParticipant(
  consultancyId: number,
  memberId: number
): Promise<PromotionalCampaignLinkRecord[]> {
  await ensurePromotionalCampaignsSchema();
  const connection = await getDbConnection();
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
         pcl.id,
         pcl.public_id,
         pcl.consultancy_id,
         pcl.referrer_member_id,
         pcl.code,
         pcl.title,
         pcl.description,
         pcl.destination_url,
         pcl.announced_discount_type,
         pcl.announced_discount_value,
         pcl.eligible_plans,
         pcl.commission_type,
         pcl.commission_amount_cents,
         pcl.commission_rate_basis_points,
         pcl.commission_conditions,
         pcl.starts_at,
         pcl.ends_at,
         pcl.max_uses,
         pcl.current_uses,
         pcl.click_count,
         pcl.status,
         pcl.created_at,
         pcl.updated_at,
         (SELECT COUNT(*) FROM referral_attributions ra WHERE ra.campaign_link_id = pcl.id AND ra.status = 'CONVERTED') AS conversions_count
       FROM promotional_campaign_links pcl
       WHERE pcl.consultancy_id = ? AND pcl.referrer_member_id = ?
       ORDER BY (pcl.status = 'ACTIVE') DESC, pcl.created_at DESC;`,
      [consultancyId, memberId]
    );

    return rows.map((r) => {
      const commType = r.commission_type as CampaignCommissionType;
      const amountCents = r.commission_amount_cents != null ? Number(r.commission_amount_cents) : null;
      const rateBp = r.commission_rate_basis_points != null ? Number(r.commission_rate_basis_points) : null;
      const formattedVal = commType === "FIXED"
        ? (amountCents != null ? `R$ ${centsToBrl(amountCents)}` : "R$ 0,00")
        : (rateBp != null ? `${basisPointsToPercent(rateBp)}%` : "0%");

      return {
        id: Number(r.id),
        publicId: r.public_id,
        consultancyId: Number(r.consultancy_id),
        referrerMemberId: Number(r.referrer_member_id),
        code: r.code,
        title: r.title,
        description: r.description,
        destinationUrl: r.destination_url,
        announcedDiscountType: r.announced_discount_type as AnnouncedDiscountType,
        announcedDiscountValue: r.announced_discount_value,
        eligiblePlans: r.eligible_plans,
        commissionType: commType,
        commissionAmountCents: amountCents,
        commissionRateBasisPoints: rateBp,
        commissionValueFormatted: formattedVal,
        commissionConditions: r.commission_conditions,
        startsAt: r.starts_at ? new Date(r.starts_at) : null,
        endsAt: r.ends_at ? new Date(r.ends_at) : null,
        maxUses: r.max_uses != null ? Number(r.max_uses) : null,
        currentUses: Number(r.current_uses || 0),
        clickCount: Number(r.click_count || 0),
        conversionsCount: Number(r.conversions_count || 0),
        status: r.status as CampaignLinkStatus,
        shareableUrl: `/r/${r.code}`,
        createdAt: new Date(r.created_at),
        updatedAt: new Date(r.updated_at),
      };
    });
  } finally {
    connection.release();
  }
}

export interface CreateMarketingMaterialInput {
  consultancyId: number;
  title: string;
  description?: string | null;
  mediaFormat: MediaFormat;
  fileUrl?: string | null;
  storageKey?: string | null;
  fileSizeBytes?: number | null;
  mimeType?: string | null;
  suggestedCaption?: string | null;
  isGlobal?: boolean;
  targetMemberId?: number | null;
  campaignLinkId?: number | null;
}

/**
 * Creates marketing material (Story, Feed, Banner, Video).
 */
export async function createMarketingMaterial(
  input: CreateMarketingMaterialInput,
  adminMemberId: number,
  adminUserId: number
): Promise<{ success: boolean; materialId?: number; publicId?: string; error?: string }> {
  await ensurePromotionalCampaignsSchema();
  if (!input.title || !input.title.trim()) {
    return { success: false, error: "O título do material é obrigatório." };
  }
  const cleanTitle = input.title.trim().slice(0, 191);

  const connection = await getDbConnection();
  try {
    const publicId = crypto.randomUUID();
    const isGlobal = input.isGlobal !== false;
    const targetMemberId = !isGlobal && input.targetMemberId && Number(input.targetMemberId) > 0
      ? Number(input.targetMemberId)
      : null;
    const campaignLinkId = input.campaignLinkId && Number(input.campaignLinkId) > 0
      ? Number(input.campaignLinkId)
      : null;

    const [res] = await connection.execute<ResultSetHeader>(
      `INSERT INTO promotional_marketing_materials (
         public_id, consultancy_id, title, description, media_format,
         file_url, storage_key, file_size_bytes, mime_type, suggested_caption,
         is_global, target_member_id, campaign_link_id, status, created_by_member_id
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?);`,
      [
        publicId,
        input.consultancyId,
        cleanTitle,
        input.description?.trim() || null,
        input.mediaFormat || "STORY",
        input.fileUrl?.trim() || null,
        input.storageKey?.trim() || null,
        input.fileSizeBytes != null ? Number(input.fileSizeBytes) : null,
        input.mimeType?.trim() || null,
        input.suggestedCaption?.trim() || null,
        isGlobal ? 1 : 0,
        targetMemberId,
        campaignLinkId,
        adminMemberId,
      ]
    );

    const materialId = res.insertId;

    // If campaignLinkId was specified, also insert into junction table
    if (campaignLinkId) {
      await connection.execute(
        `INSERT IGNORE INTO promotional_campaign_link_materials (campaign_link_id, material_id) VALUES (?, ?);`,
        [campaignLinkId, materialId]
      );
    }

    await recordConsultancyActivity({
      consultancyId: input.consultancyId,
      actorUserId: adminUserId,
      actorMembershipId: adminMemberId,
      actorRole: "CONSULTANCY_ADMIN",
      action: "CREATE_MARKETING_MATERIAL",
      module: "ADMIN",
      resourceType: "promotional_marketing_materials",
      resourcePublicId: publicId,
      summary: `Material de divulgação "${cleanTitle}" (${input.mediaFormat}) cadastrado.`,
      metadata: { materialId, title: cleanTitle, mediaFormat: input.mediaFormat, isGlobal },
    });

    return { success: true, materialId, publicId };
  } finally {
    connection.release();
  }
}

/**
 * Lists marketing materials available for the consultancy:
 * If memberId is passed, returns global materials + materials targeted specifically to that member.
 */
export async function listMarketingMaterials(
  consultancyId: number,
  memberId?: number,
  campaignLinkId?: number
): Promise<PromotionalMarketingMaterialRecord[]> {
  await ensurePromotionalCampaignsSchema();
  const connection = await getDbConnection();
  try {
    let query = `
      SELECT
        id, public_id, consultancy_id, title, description, media_format,
        file_url, storage_key, file_size_bytes, mime_type, suggested_caption,
        is_global, target_member_id, campaign_link_id, status, created_at, updated_at
      FROM promotional_marketing_materials
      WHERE consultancy_id = ? AND status = 'ACTIVE'
    `;
    const params: (number | string)[] = [consultancyId];

    if (campaignLinkId && Number(campaignLinkId) > 0) {
      query += ` AND (campaign_link_id = ? OR id IN (SELECT material_id FROM promotional_campaign_link_materials WHERE campaign_link_id = ?))`;
      params.push(Number(campaignLinkId), Number(campaignLinkId));
    } else if (memberId && Number(memberId) > 0) {
      query += ` AND (is_global = 1 OR target_member_id = ?)`;
      params.push(Number(memberId));
    }

    query += ` ORDER BY created_at DESC;`;

    const [rows] = await connection.execute<RowDataPacket[]>(query, params);

    return rows.map((r) => ({
      id: Number(r.id),
      publicId: r.public_id,
      consultancyId: Number(r.consultancy_id),
      title: r.title,
      description: r.description,
      mediaFormat: r.media_format as MediaFormat,
      fileUrl: r.file_url,
      storageKey: r.storage_key,
      fileSizeBytes: r.file_size_bytes != null ? Number(r.file_size_bytes) : null,
      mimeType: r.mime_type,
      suggestedCaption: r.suggested_caption,
      isGlobal: Boolean(r.is_global),
      targetMemberId: r.target_member_id != null ? Number(r.target_member_id) : null,
      campaignLinkId: r.campaign_link_id != null ? Number(r.campaign_link_id) : null,
      status: r.status as MaterialStatus,
      createdAt: new Date(r.created_at),
      updatedAt: new Date(r.updated_at),
    }));
  } finally {
    connection.release();
  }
}

/**
 * Archives or deactivates marketing material.
 */
export async function archiveMarketingMaterial(
  consultancyId: number,
  materialId: number,
  adminMemberId: number,
  adminUserId: number
): Promise<{ success: boolean; error?: string }> {
  const connection = await getDbConnection();
  try {
    const [existing] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, title FROM promotional_marketing_materials WHERE id = ? AND consultancy_id = ? LIMIT 1;`,
      [materialId, consultancyId]
    );

    if (!Array.isArray(existing) || existing.length === 0) {
      return { success: false, error: "Material não encontrado nesta consultoria." };
    }

    await connection.execute(
      `UPDATE promotional_marketing_materials SET status = 'ARCHIVED', updated_at = UTC_TIMESTAMP(3) WHERE id = ? AND consultancy_id = ?;`,
      [materialId, consultancyId]
    );

    await recordConsultancyActivity({
      consultancyId,
      actorUserId: adminUserId,
      actorMembershipId: adminMemberId,
      actorRole: "CONSULTANCY_ADMIN",
      action: "ARCHIVE_MARKETING_MATERIAL",
      module: "ADMIN",
      resourceType: "promotional_marketing_materials",
      resourcePublicId: existing[0].public_id,
      summary: `Material de divulgação "${existing[0].title}" arquivado.`,
      metadata: { materialId },
    });

    return { success: true };
  } finally {
    connection.release();
  }
}

export interface ParticipantPromotionalDashboardData {
  isEnrolled: boolean;
  participantName: string;
  defaultCode: string;
  links: PromotionalCampaignLinkRecord[];
  materials: PromotionalMarketingMaterialRecord[];
  results: {
    totalClicks: number;
    registrationsCount: number;
    conversionsCount: number;
    pendingAmount: number;
    approvedAmount: number;
    paidAmount: number;
  };
  commissions: Array<{
    id: number;
    publicId: string;
    campaignTitle: string | null;
    studentName: string;
    amount: number;
    status: string;
    createdAt: Date;
    paidAt: Date | null;
  }>;
}

/**
 * Aggregates complete "Divulgue e Ganhe" dashboard data for an authorized participant:
 * 1. Meus links
 * 2. Materiais para divulgar
 * 3. Meus resultados
 */
export async function getParticipantPromotionalDashboard(
  consultancyId: number,
  memberId: number
): Promise<ParticipantPromotionalDashboardData> {
  await ensurePromotionalCampaignsSchema();
  const connection = await getDbConnection();
  try {
    // 1. Participant info & check enrollment
    const [memberRows] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id, cm.user_id, u.full_name, rc.code, rc.is_active
       FROM consultancy_members cm
       JOIN users u ON u.id = cm.user_id
       LEFT JOIN referral_codes rc ON rc.consultancy_id = cm.consultancy_id AND rc.referrer_member_id = cm.id
       WHERE cm.id = ? AND cm.consultancy_id = ? AND cm.status = 'ACTIVE'
       LIMIT 1;`,
      [memberId, consultancyId]
    );

    if (!Array.isArray(memberRows) || memberRows.length === 0) {
      return {
        isEnrolled: false,
        participantName: "",
        defaultCode: "",
        links: [],
        materials: [],
        results: {
          totalClicks: 0,
          registrationsCount: 0,
          conversionsCount: 0,
          pendingAmount: 0,
          approvedAmount: 0,
          paidAmount: 0,
        },
        commissions: [],
      };
    }

    const member = memberRows[0];
    const defaultCode = member.code || "";
    const isEnrolled = member.is_active === 1 || member.is_active === true;

    // 2. Fetch individual campaign links
    const links = await listCampaignLinksForParticipant(consultancyId, memberId);

    // 3. Fetch materials
    const materials = await listMarketingMaterials(consultancyId, memberId);

    // 4. Results aggregation
    const totalClicks = links.reduce((sum, l) => sum + (l.clickCount || 0), 0);

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

    // 5. Commissions list
    let commList: RowDataPacket[] = [];
    try {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT
           rcm.id,
           rcm.public_id,
           rcm.final_amount,
           rcm.final_amount_cents,
           rcm.status,
           rcm.created_at,
           rcm.paid_at,
           COALESCE(u_stud.full_name, rcm.buyer_name, 'Cliente indicado') AS student_name,
           pcl.title AS campaign_title
         FROM referral_commissions rcm
         LEFT JOIN consultancy_members cm_stud ON cm_stud.id = rcm.referred_member_id
         LEFT JOIN users u_stud ON u_stud.id = cm_stud.user_id
         LEFT JOIN promotional_campaign_links pcl ON pcl.id = rcm.campaign_link_id
         WHERE rcm.consultancy_id = ? AND rcm.referrer_member_id = ?
         ORDER BY rcm.created_at DESC
         LIMIT 50;`,
        [consultancyId, memberId]
      );
      commList = rows;
    } catch {
      // Fallback if buyer_name is missing
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT
           rcm.id,
           rcm.public_id,
           rcm.final_amount,
           rcm.final_amount_cents,
           rcm.status,
           rcm.created_at,
           rcm.paid_at,
           COALESCE(u_stud.full_name, 'Cliente indicado') AS student_name,
           pcl.title AS campaign_title
         FROM referral_commissions rcm
         LEFT JOIN consultancy_members cm_stud ON cm_stud.id = rcm.referred_member_id
         LEFT JOIN users u_stud ON u_stud.id = cm_stud.user_id
         LEFT JOIN promotional_campaign_links pcl ON pcl.id = rcm.campaign_link_id
         WHERE rcm.consultancy_id = ? AND rcm.referrer_member_id = ?
         ORDER BY rcm.created_at DESC
         LIMIT 50;`,
        [consultancyId, memberId]
      );
      commList = rows;
    }

    const commissions = commList.map((c) => {
      const cents = c.final_amount_cents != null
        ? BigInt(c.final_amount_cents)
        : (c.final_amount != null ? brlToCents(Number(c.final_amount)) : BigInt(0));
      return {
        id: Number(c.id),
        publicId: c.public_id,
        campaignTitle: c.campaign_title || null,
        studentName: c.student_name,
        amount: Number(cents) / 100,
        status: c.status,
        createdAt: new Date(c.created_at),
        paidAt: c.paid_at ? new Date(c.paid_at) : null,
      };
    });

    return {
      isEnrolled: isEnrolled || links.length > 0,
      participantName: member.full_name,
      defaultCode,
      links,
      materials,
      results: {
        totalClicks,
        registrationsCount,
        conversionsCount,
        pendingAmount: Number(pendingCents) / 100,
        approvedAmount: Number(approvedCents) / 100,
        paidAmount: Number(paidCents) / 100,
      },
      commissions,
    };
  } finally {
    connection.release();
  }
}

export type RedirectResolutionResult =
  | {
      status: "REDIRECT";
      destinationUrl: string;
      consultancyId: number;
      consultancySlug: string;
      campaignLinkId?: number;
      codeId?: number;
      referrerMemberId: number;
      attributionToken: string;
    }
  | {
      status: "UNAVAILABLE";
      reason: "PAUSED" | "ENDED" | "NOT_STARTED" | "LIMIT_REACHED";
      campaignTitle: string;
      consultancyName: string;
      consultancySlug: string;
    }
  | {
      status: "NOT_FOUND";
    };

/**
 * Resolves redirect for /r/[code]:
 * 1. Checks promotional_campaign_links first.
 * 2. If campaign is PAUSED, ENDED, or EXPIRED, returns UNAVAILABLE without arbitrary fallback.
 * 3. If ACTIVE, increments click counter, creates/attaches attribution token, returns safe destinationUrl.
 * 4. If not in campaign links, falls back to legacy referral_codes.
 */
export async function resolveCampaignRedirect(
  code: string,
  existingToken?: string
): Promise<RedirectResolutionResult> {
  await ensurePromotionalCampaignsSchema();
  if (!code || typeof code !== "string") {
    return { status: "NOT_FOUND" };
  }

  const cleanCode = code.trim().toUpperCase();
  const connection = await getDbConnection();
  try {
    // 1. Look up promotional_campaign_links
    const [promoRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
         pcl.id AS campaign_link_id,
         pcl.code,
         pcl.title,
         pcl.destination_url,
         pcl.starts_at,
         pcl.ends_at,
         pcl.max_uses,
         pcl.current_uses,
         pcl.status,
         pcl.referrer_member_id,
         c.id AS consultancy_id,
         c.name AS consultancy_name,
         c.slug AS consultancy_slug,
         c.status AS consultancy_status,
         cm.status AS member_status
       FROM promotional_campaign_links pcl
       JOIN consultancies c ON c.id = pcl.consultancy_id
       JOIN consultancy_members cm ON cm.id = pcl.referrer_member_id
       WHERE pcl.code = ? AND c.deleted_at IS NULL
       LIMIT 1;`,
      [cleanCode]
    );

    if (Array.isArray(promoRows) && promoRows.length > 0) {
      const p = promoRows[0];

      if (p.consultancy_status !== "ACTIVE" || p.member_status !== "ACTIVE") {
        return {
          status: "UNAVAILABLE",
          reason: "PAUSED",
          campaignTitle: p.title,
          consultancyName: p.consultancy_name,
          consultancySlug: p.consultancy_slug,
        };
      }

      const now = new Date();
      if (p.starts_at && new Date(p.starts_at) > now) {
        return {
          status: "UNAVAILABLE",
          reason: "NOT_STARTED",
          campaignTitle: p.title,
          consultancyName: p.consultancy_name,
          consultancySlug: p.consultancy_slug,
        };
      }
      if (p.ends_at && new Date(p.ends_at) < now) {
        return {
          status: "UNAVAILABLE",
          reason: "ENDED",
          campaignTitle: p.title,
          consultancyName: p.consultancy_name,
          consultancySlug: p.consultancy_slug,
        };
      }
      if (p.max_uses != null && Number(p.current_uses) >= Number(p.max_uses)) {
        return {
          status: "UNAVAILABLE",
          reason: "LIMIT_REACHED",
          campaignTitle: p.title,
          consultancyName: p.consultancy_name,
          consultancySlug: p.consultancy_slug,
        };
      }
      if (p.status !== "ACTIVE") {
        return {
          status: "UNAVAILABLE",
          reason: p.status === "ENDED" ? "ENDED" : "PAUSED",
          campaignTitle: p.title,
          consultancyName: p.consultancy_name,
          consultancySlug: p.consultancy_slug,
        };
      }

      // Increment click count atomically
      await connection.execute(
        `UPDATE promotional_campaign_links SET click_count = click_count + 1 WHERE id = ?;`,
        [p.campaign_link_id]
      );

      // Attribution Token (First-touch preservation or new token)
      let token = existingToken && existingToken.length === 64 ? existingToken : null;
      let tokenHash = token ? crypto.createHash("sha256").update(token).digest("hex") : null;

      // Check if existing token is valid for this consultancy
      let attributionId: number | null = null;
      if (token && tokenHash) {
        const [existingAttr] = await connection.execute<RowDataPacket[]>(
          `SELECT id FROM referral_attributions
           WHERE consultancy_id = ? AND visitor_token_hash = ?
             AND (expires_at IS NULL OR expires_at > UTC_TIMESTAMP(3))
           LIMIT 1;`,
          [p.consultancy_id, tokenHash]
        );
        if (Array.isArray(existingAttr) && existingAttr.length > 0) {
          attributionId = Number(existingAttr[0].id);
        }
      }

      // If no valid existing attribution, create new one
      if (!attributionId) {
        token = crypto.randomBytes(32).toString("hex");
        tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        const publicId = crypto.randomUUID();

        // Get default referral_code_id for foreign key compatibility
        let referralCodeId: number = 0;
        const [codeRows] = await connection.execute<RowDataPacket[]>(
          `SELECT id FROM referral_codes WHERE consultancy_id = ? AND referrer_member_id = ? LIMIT 1;`,
          [p.consultancy_id, p.referrer_member_id]
        );
        if (Array.isArray(codeRows) && codeRows.length > 0) {
          referralCodeId = Number(codeRows[0].id);
        } else {
          // Create fallback default code if not present
          const fcChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
          let fc = "";
          const rb = crypto.randomBytes(6);
          for (let i = 0; i < 6; i++) fc += fcChars[rb[i] % fcChars.length];
          const [insCode] = await connection.execute<ResultSetHeader>(
            `INSERT INTO referral_codes (public_id, consultancy_id, referrer_member_id, code, is_active)
             VALUES (?, ?, ?, ?, 1);`,
            [crypto.randomUUID(), p.consultancy_id, p.referrer_member_id, fc]
          );
          referralCodeId = insCode.insertId;
        }

        await connection.execute(
          `INSERT INTO referral_attributions (
             public_id, consultancy_id, referral_code_id, campaign_link_id, referrer_member_id,
             visitor_token_hash, first_click_at, expires_at, status
           ) VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3), DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 30 DAY), 'PENDING');`,
          [publicId, p.consultancy_id, referralCodeId, p.campaign_link_id, p.referrer_member_id, tokenHash]
        );
      }

      return {
        status: "REDIRECT",
        destinationUrl: p.destination_url,
        consultancyId: Number(p.consultancy_id),
        consultancySlug: p.consultancy_slug,
        campaignLinkId: Number(p.campaign_link_id),
        referrerMemberId: Number(p.referrer_member_id),
        attributionToken: token!,
      };
    }

    // 2. Fall back to legacy referral_codes
    const [legacyRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
         rc.id AS code_id,
         rc.code,
         rc.is_active,
         rc.referrer_member_id,
         c.id AS consultancy_id,
         c.slug AS consultancy_slug,
         c.status AS consultancy_status,
         cm.status AS member_status
       FROM referral_codes rc
       JOIN consultancies c ON c.id = rc.consultancy_id
       JOIN consultancy_members cm ON cm.id = rc.referrer_member_id
       WHERE rc.code = ? AND c.deleted_at IS NULL
       LIMIT 1;`,
      [cleanCode]
    );

    if (Array.isArray(legacyRows) && legacyRows.length > 0) {
      const leg = legacyRows[0];
      if (!leg.is_active || leg.consultancy_status !== "ACTIVE" || leg.member_status !== "ACTIVE") {
        return { status: "NOT_FOUND" };
      }

      let token = existingToken && existingToken.length === 64 ? existingToken : null;
      let tokenHash = token ? crypto.createHash("sha256").update(token).digest("hex") : null;

      let attributionId: number | null = null;
      if (token && tokenHash) {
        const [existingAttr] = await connection.execute<RowDataPacket[]>(
          `SELECT id FROM referral_attributions
           WHERE consultancy_id = ? AND visitor_token_hash = ?
             AND (expires_at IS NULL OR expires_at > UTC_TIMESTAMP(3))
           LIMIT 1;`,
          [leg.consultancy_id, tokenHash]
        );
        if (Array.isArray(existingAttr) && existingAttr.length > 0) {
          attributionId = Number(existingAttr[0].id);
        }
      }

      if (!attributionId) {
        token = crypto.randomBytes(32).toString("hex");
        tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        const publicId = crypto.randomUUID();

        await connection.execute(
          `INSERT INTO referral_attributions (
             public_id, consultancy_id, referral_code_id, referrer_member_id,
             visitor_token_hash, first_click_at, expires_at, status
           ) VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP(3), DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 30 DAY), 'PENDING');`,
          [publicId, leg.consultancy_id, leg.code_id, leg.referrer_member_id, tokenHash]
        );
      }

      return {
        status: "REDIRECT",
        destinationUrl: `/consultoria/${leg.consultancy_slug}`,
        consultancyId: Number(leg.consultancy_id),
        consultancySlug: leg.consultancy_slug,
        codeId: Number(leg.code_id),
        referrerMemberId: Number(leg.referrer_member_id),
        attributionToken: token!,
      };
    }

    return { status: "NOT_FOUND" };
  } finally {
    connection.release();
  }
}
