import crypto from "node:crypto";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";
import {
  formatConsultancyDateTime,
  parseConsultancyLocalDateTime,
} from "./timezone";
import {
  deletePrivateFile,
  detectReceiptFileType,
  readVerifiedPrivateFile,
  sanitizeOriginalFileName,
  writePrivateFile,
} from "../storage/private-files";
import {
  createNotificationInTransaction,
  deliverNotificationAfterCommit,
} from "@/services/notification-service";

// ==========================================
// CONSTANTS & TYPES
// ==========================================

export type MissionStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "REVISION_REQUESTED"
  | "APPROVED"
  | "CANCELED";

export const VALID_MISSION_STATUSES: readonly MissionStatus[] = [
  "PENDING",
  "IN_PROGRESS",
  "SUBMITTED",
  "REVISION_REQUESTED",
  "APPROVED",
  "CANCELED",
] as const;

export const MISSION_STATUS_LABELS: Record<MissionStatus, string> = {
  PENDING: "Pendente",
  IN_PROGRESS: "Em andamento",
  SUBMITTED: "Aguardando revisão",
  REVISION_REQUESTED: "Revisão solicitada",
  APPROVED: "Aprovada",
  CANCELED: "Cancelada",
};

export type MissionPriority = "LOW" | "NORMAL" | "HIGH";

export const VALID_MISSION_PRIORITIES: readonly MissionPriority[] = [
  "LOW",
  "NORMAL",
  "HIGH",
] as const;

export const MISSION_PRIORITY_LABELS: Record<MissionPriority, string> = {
  LOW: "Baixa",
  NORMAL: "Normal",
  HIGH: "Alta",
};

export type SubmissionReviewDecision = "REVISION_REQUESTED" | "APPROVED";

// Limits
export const MAX_MISSION_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MiB = 10,485,760 bytes
export const MAX_MISSION_AGGREGATE_FILE_BYTES = 20 * 1024 * 1024; // 20 MiB = 20,971,520 bytes
export const MAX_MISSION_FILES_PER_OP = 3;
export const MAX_MISSION_EARLY_REQUEST_BYTES = 23 * 1024 * 1024; // 22+ MiB = 23,068,672 bytes
export const MAX_LINKS_PER_SUBMISSION = 10;
export const MAX_LINK_LENGTH = 2048;

export type MissionAttachmentView = {
  publicId: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  createdAt: Date;
};

export type MissionSubmissionLinkView = {
  url: string;
  createdAt: Date;
};

export type MissionSubmissionView = {
  publicId: string;
  sequenceNo: number;
  notes: string | null;
  submitterName: string;
  reviewDecision: SubmissionReviewDecision | null;
  reviewNote: string | null;
  reviewerName: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  links: MissionSubmissionLinkView[];
  attachments: MissionAttachmentView[];
};

export type MissionDetailView = {
  id: number;
  publicId: string;
  consultancyId: number;
  assigneeMembershipId: number;
  assigneeMembershipPublicId: string;
  assigneeName: string;
  assigneeEmail: string;
  title: string;
  objective: string;
  instructions: string;
  priority: MissionPriority;
  status: MissionStatus;
  dueAtUtc: Date;
  timezoneSnapshot: string;
  formattedDueAt: string;
  isLate: boolean;
  creatorName: string;
  startedAt: Date | null;
  canceledAt: Date | null;
  cancelerName: string | null;
  createdAt: Date;
  referenceAttachments: MissionAttachmentView[];
  submissions: MissionSubmissionView[];
};

export type MissionListItemView = {
  publicId: string;
  assigneeMembershipPublicId: string;
  assigneeName: string;
  assigneeEmail: string;
  title: string;
  priority: MissionPriority;
  status: MissionStatus;
  dueAtUtc: Date;
  timezoneSnapshot: string;
  formattedDueAt: string;
  isLate: boolean;
  createdAt: Date;
};

export type EligibleInfluencerOption = {
  membershipPublicId: string;
  name: string;
  email: string;
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

export function isMissionLate(dueAtUtc: Date, status: MissionStatus, nowUtc: Date = new Date()): boolean {
  if (status === "APPROVED" || status === "CANCELED") {
    return false;
  }
  return nowUtc.getTime() > dueAtUtc.getTime();
}

export function validateHttpsUrl(rawUrl: unknown): { valid: boolean; normalized?: string; error?: string } {
  if (typeof rawUrl !== "string") {
    return { valid: false, error: "Link inválido." };
  }
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > MAX_LINK_LENGTH) {
    return { valid: false, error: `O link deve ter no máximo ${MAX_LINK_LENGTH} caracteres.` };
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") {
      return { valid: false, error: "O link deve utilizar o protocolo HTTPS (ex: https://...)." };
    }
    return { valid: true, normalized: parsed.toString() };
  } catch {
    return { valid: false, error: "URL inválida. Forneça um link HTTPS completo." };
  }
}

// ==========================================
// DOMAIN QUERIES & MUTATIONS
// ==========================================

/**
 * Lists eligible members with INFLUENCER role in the given consultancy.
 */
export async function listEligibleInfluencers(
  consultancyId: number
): Promise<EligibleInfluencerOption[]> {
  let connection;
  try {
    connection = await getDbConnection();
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        cm.public_id AS membership_public_id,
        u.full_name AS name,
        u.email
       FROM consultancy_members cm
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       INNER JOIN users u ON u.id = cm.user_id
       WHERE cm.consultancy_id = ?
         AND cmr.role = 'INFLUENCER'
         AND cm.status = 'ACTIVE'
         AND u.status = 'ACTIVE'
         AND u.deleted_at IS NULL
       GROUP BY cm.id, u.id
       ORDER BY u.full_name ASC, cm.id ASC;`,
      [consultancyId]
    );

    if (!Array.isArray(rows)) {
      return [];
    }

    return rows.map((r) => ({
      membershipPublicId: String(r.membership_public_id),
      name: String(r.name),
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

export type CreateMissionParams = {
  consultancyId: number;
  actorUserId: number;
  timezone: string;
  assigneeMembershipPublicId: string;
  title: string;
  objective: string;
  instructions: string;
  priority: string;
  dueDate: string;
  dueTime: string;
};

export type CreateMissionResult =
  | { success: true; missionPublicId: string }
  | {
      success: false;
      error: string;
      field?: "assigneeMembershipPublicId" | "title" | "objective" | "instructions" | "priority" | "dueDate" | "dueTime";
    };

/**
 * Creates a new Mission in PENDING status for an INFLUENCER member.
 */
export async function createMission(
  params: CreateMissionParams
): Promise<CreateMissionResult> {
  const {
    consultancyId,
    actorUserId,
    timezone,
    assigneeMembershipPublicId,
    title,
    objective,
    instructions,
    priority,
    dueDate,
    dueTime,
  } = params;

  // Validation
  const normalizedTitle = (title || "").trim().normalize("NFC").replace(/\s+/g, " ");
  if (normalizedTitle.length < 1 || normalizedTitle.length > 160) {
    return { success: false, error: "O título da missão deve ter entre 1 e 160 caracteres.", field: "title" };
  }

  const normalizedObjective = (objective || "").trim().normalize("NFC");
  if (normalizedObjective.length < 1 || normalizedObjective.length > 2000) {
    return { success: false, error: "O objetivo deve ter entre 1 e 2000 caracteres.", field: "objective" };
  }

  const normalizedInstructions = (instructions || "").trim().normalize("NFC");
  if (normalizedInstructions.length < 1 || normalizedInstructions.length > 10000) {
    return { success: false, error: "As instruções devem ter entre 1 e 10.000 caracteres.", field: "instructions" };
  }

  const normalizedPriority = (priority || "").trim().toUpperCase() as MissionPriority;
  if (!VALID_MISSION_PRIORITIES.includes(normalizedPriority)) {
    return { success: false, error: "Prioridade inválida. Escolha Baixa, Normal ou Alta.", field: "priority" };
  }

  const parseResult = parseConsultancyLocalDateTime(timezone, dueDate, dueTime);
  if (!parseResult.success) {
    return { success: false, error: parseResult.error, field: "dueDate" };
  }
  const dueAtUtc = parseResult.dateUtc;

  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();

    // Verify assignee membership in same consultancy with INFLUENCER role
    const [assigneeRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        cm.id,
        cm.user_id,
        c.slug AS consultancy_slug
       FROM consultancy_members cm
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       INNER JOIN consultancies c ON c.id = cm.consultancy_id
       WHERE cm.public_id = ?
         AND cm.consultancy_id = ?
         AND cm.status = 'ACTIVE'
         AND cmr.role = 'INFLUENCER'
       LIMIT 1;`,
      [assigneeMembershipPublicId.trim(), consultancyId]
    );

    if (!Array.isArray(assigneeRows) || assigneeRows.length === 0) {
      return {
        success: false,
        error: "O participante selecionado não foi encontrado ou não possui o perfil de Influenciador / VIP ativo.",
        field: "assigneeMembershipPublicId",
      };
    }

    const assigneeMembershipId = Number(assigneeRows[0].id);
    const assigneeUserId = Number(assigneeRows[0].user_id);
    const consultancySlug = String(assigneeRows[0].consultancy_slug);
    const missionPublicId = crypto.randomUUID();
    const auditPublicId = crypto.randomUUID();

    await connection.beginTransaction();

    try {
      await connection.execute<ResultSetHeader>(
        `INSERT INTO missions (
          public_id,
          consultancy_id,
          assignee_membership_id,
          title,
          objective,
          instructions,
          priority,
          status,
          due_at_utc,
          timezone_snapshot,
          created_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?);`,
        [
          missionPublicId,
          consultancyId,
          assigneeMembershipId,
          normalizedTitle,
          normalizedObjective,
          normalizedInstructions,
          normalizedPriority,
          dueAtUtc,
          timezone,
          actorUserId,
        ]
      );

      await connection.execute<ResultSetHeader>(
        `INSERT INTO audit_events (
          public_id,
          actor_user_id,
          consultancy_id,
          action,
          target_type,
          target_public_id,
          metadata_json
        ) VALUES (?, ?, ?, 'MISSION_CREATED', 'MISSION', ?, ?);`,
        [
          auditPublicId,
          actorUserId,
          consultancyId,
          missionPublicId,
          JSON.stringify({ priority: normalizedPriority, status: "PENDING" }),
        ]
      );

      const notification = await createNotificationInTransaction(connection, {
        userId: assigneeUserId,
        consultancyId,
        priority: "NORMAL",
        eventType: "MISSION_ASSIGNED",
        title: "Nova missão disponível",
        body: "Você recebeu uma nova missão. Acesse o Trevo para ver os detalhes.",
        deepLink: `/consultoria/${consultancySlug}/missoes/${missionPublicId}`,
        dedupeKey: `mission:assigned:${missionPublicId}`,
        sourceType: "MISSION",
        sourcePublicId: missionPublicId,
      });

      await connection.commit();

      // Best-effort external delivery after commit
      try {
        await deliverNotificationAfterCommit(notification.id);
      } catch {
        // Push failure must never affect business transaction success
      }

      return { success: true, missionPublicId };
    } catch (txError) {
      await connection.rollback();
      throw txError;
    }
  } catch {
    return {
      success: false,
      error: "Ocorreu um erro ao criar a missão. Tente novamente.",
    };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Lists missions for an INFLUENCER member (own missions only).
 */
export async function listInfluencerMissions(params: {
  consultancyId: number;
  membershipId: number;
  page?: number;
  limit?: number;
}): Promise<{ items: MissionListItemView[]; total: number; page: number; totalPages: number }> {
  const { consultancyId, membershipId, page = 1, limit = 20 } = params;
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(50, Math.max(1, limit));
  const offset = (safePage - 1) * safeLimit;

  let connection;
  try {
    connection = await getDbConnection();

    const [countRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM missions m
       WHERE m.consultancy_id = ?
         AND m.assignee_membership_id = ?;`,
      [consultancyId, membershipId]
    );
    const total = Number(countRows[0]?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / safeLimit));

    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        m.public_id,
        m.title,
        m.priority,
        m.status,
        m.due_at_utc,
        m.timezone_snapshot,
        m.created_at,
        cm.public_id AS assignee_membership_public_id,
        u.full_name AS assignee_name,
        u.email AS assignee_email
       FROM missions m
       INNER JOIN consultancy_members cm ON cm.id = m.assignee_membership_id
       INNER JOIN users u ON u.id = cm.user_id
       WHERE m.consultancy_id = ?
         AND m.assignee_membership_id = ?
       ORDER BY m.due_at_utc ASC, m.id ASC
       LIMIT ? OFFSET ?;`,
      [consultancyId, membershipId, safeLimit, offset]
    );

    const nowUtc = new Date();
    const items: MissionListItemView[] = Array.isArray(rows)
      ? rows.map((r) => {
          const dueAtUtc = new Date(r.due_at_utc);
          const status = r.status as MissionStatus;
          const tz = String(r.timezone_snapshot);
          return {
            publicId: String(r.public_id),
            assigneeMembershipPublicId: String(r.assignee_membership_public_id),
            assigneeName: String(r.assignee_name),
            assigneeEmail: String(r.assignee_email),
            title: String(r.title),
            priority: r.priority as MissionPriority,
            status,
            dueAtUtc,
            timezoneSnapshot: tz,
            formattedDueAt: formatConsultancyDateTime(tz, dueAtUtc),
            isLate: isMissionLate(dueAtUtc, status, nowUtc),
            createdAt: new Date(r.created_at),
          };
        })
      : [];

    return { items, total, page: safePage, totalPages };
  } catch {
    return { items: [], total: 0, page: 1, totalPages: 1 };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Lists all missions in the consultancy for CONSULTANCY_ADMIN.
 */
export async function listAdminMissions(params: {
  consultancyId: number;
  page?: number;
  limit?: number;
}): Promise<{ items: MissionListItemView[]; total: number; page: number; totalPages: number }> {
  const { consultancyId, page = 1, limit = 20 } = params;
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(50, Math.max(1, limit));
  const offset = (safePage - 1) * safeLimit;

  let connection;
  try {
    connection = await getDbConnection();

    const [countRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM missions m
       WHERE m.consultancy_id = ?;`,
      [consultancyId]
    );
    const total = Number(countRows[0]?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / safeLimit));

    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        m.public_id,
        m.title,
        m.priority,
        m.status,
        m.due_at_utc,
        m.timezone_snapshot,
        m.created_at,
        cm.public_id AS assignee_membership_public_id,
        u.full_name AS assignee_name,
        u.email AS assignee_email
       FROM missions m
       INNER JOIN consultancy_members cm ON cm.id = m.assignee_membership_id
       INNER JOIN users u ON u.id = cm.user_id
       WHERE m.consultancy_id = ?
       ORDER BY m.due_at_utc ASC, m.id ASC
       LIMIT ? OFFSET ?;`,
      [consultancyId, safeLimit, offset]
    );

    const nowUtc = new Date();
    const items: MissionListItemView[] = Array.isArray(rows)
      ? rows.map((r) => {
          const dueAtUtc = new Date(r.due_at_utc);
          const status = r.status as MissionStatus;
          const tz = String(r.timezone_snapshot);
          return {
            publicId: String(r.public_id),
            assigneeMembershipPublicId: String(r.assignee_membership_public_id),
            assigneeName: String(r.assignee_name),
            assigneeEmail: String(r.assignee_email),
            title: String(r.title),
            priority: r.priority as MissionPriority,
            status,
            dueAtUtc,
            timezoneSnapshot: tz,
            formattedDueAt: formatConsultancyDateTime(tz, dueAtUtc),
            isLate: isMissionLate(dueAtUtc, status, nowUtc),
            createdAt: new Date(r.created_at),
          };
        })
      : [];

    return { items, total, page: safePage, totalPages };
  } catch {
    return { items: [], total: 0, page: 1, totalPages: 1 };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Loads full Mission detail with reference attachments and submissions history.
 */
export async function getMissionDetail(params: {
  consultancyId: number;
  missionPublicId: string;
  forMembershipId?: number; // If provided, ensures mission belongs to this assignee
}): Promise<MissionDetailView | null> {
  const { consultancyId, missionPublicId, forMembershipId } = params;

  let connection;
  try {
    connection = await getDbConnection();

    let query = `
      SELECT
        m.id,
        m.public_id,
        m.consultancy_id,
        m.assignee_membership_id,
        m.title,
        m.objective,
        m.instructions,
        m.priority,
        m.status,
        m.due_at_utc,
        m.timezone_snapshot,
        m.started_at,
        m.canceled_at,
        m.created_at,
        cm.public_id AS assignee_membership_public_id,
        u_assignee.full_name AS assignee_name,
        u_assignee.email AS assignee_email,
        u_creator.full_name AS creator_name,
        u_canceler.full_name AS canceler_name
      FROM missions m
      INNER JOIN consultancy_members cm ON cm.id = m.assignee_membership_id
      INNER JOIN users u_assignee ON u_assignee.id = cm.user_id
      INNER JOIN users u_creator ON u_creator.id = m.created_by_user_id
      LEFT JOIN users u_canceler ON u_canceler.id = m.canceled_by_user_id
      WHERE m.public_id = ?
        AND m.consultancy_id = ?`;

    const queryParams: (string | number)[] = [missionPublicId, consultancyId];

    if (forMembershipId !== undefined) {
      query += ` AND m.assignee_membership_id = ?`;
      queryParams.push(forMembershipId);
    }
    query += ` LIMIT 1;`;

    const [rows] = await connection.execute<RowDataPacket[]>(query, queryParams);

    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    const r = rows[0];
    const missionId = Number(r.id);
    const dueAtUtc = new Date(r.due_at_utc);
    const status = r.status as MissionStatus;
    const tz = String(r.timezone_snapshot);

    // 1. Fetch reference attachments
    const [attRows] = await connection.execute<RowDataPacket[]>(
      `SELECT public_id, file_name, file_size_bytes, mime_type, created_at
       FROM mission_attachments
       WHERE mission_id = ?
       ORDER BY id ASC;`,
      [missionId]
    );

    const referenceAttachments: MissionAttachmentView[] = Array.isArray(attRows)
      ? attRows.map((a) => ({
          publicId: String(a.public_id),
          fileName: String(a.file_name),
          fileSizeBytes: Number(a.file_size_bytes),
          mimeType: String(a.mime_type),
          createdAt: new Date(a.created_at),
        }))
      : [];

    // 2. Fetch submissions
    const [subRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        ms.id,
        ms.public_id,
        ms.sequence_no,
        ms.notes,
        ms.review_decision,
        ms.review_note,
        ms.reviewed_at,
        ms.created_at,
        u_sub.full_name AS submitter_name,
        u_rev.full_name AS reviewer_name
       FROM mission_submissions ms
       INNER JOIN users u_sub ON u_sub.id = ms.submitted_by_user_id
       LEFT JOIN users u_rev ON u_rev.id = ms.reviewed_by_user_id
       WHERE ms.mission_id = ?
       ORDER BY ms.sequence_no DESC;`,
      [missionId]
    );

    const submissions: MissionSubmissionView[] = [];

    if (Array.isArray(subRows) && subRows.length > 0) {
      const submissionIds = subRows.map((s) => Number(s.id));

      // Batch query links
      const [linkRows] = await connection.query<RowDataPacket[]>(
        `SELECT submission_id, url, created_at
         FROM mission_submission_links
         WHERE submission_id IN (?)
         ORDER BY id ASC;`,
        [submissionIds]
      );

      const linksMap = new Map<number, MissionSubmissionLinkView[]>();
      if (Array.isArray(linkRows)) {
        for (const l of linkRows) {
          const sId = Number(l.submission_id);
          if (!linksMap.has(sId)) linksMap.set(sId, []);
          linksMap.get(sId)!.push({
            url: String(l.url),
            createdAt: new Date(l.created_at),
          });
        }
      }

      // Batch query attachments
      const [subAttRows] = await connection.query<RowDataPacket[]>(
        `SELECT submission_id, public_id, file_name, file_size_bytes, mime_type, created_at
         FROM mission_submission_attachments
         WHERE submission_id IN (?)
         ORDER BY id ASC;`,
        [submissionIds]
      );

      const subAttMap = new Map<number, MissionAttachmentView[]>();
      if (Array.isArray(subAttRows)) {
        for (const sa of subAttRows) {
          const sId = Number(sa.submission_id);
          if (!subAttMap.has(sId)) subAttMap.set(sId, []);
          subAttMap.get(sId)!.push({
            publicId: String(sa.public_id),
            fileName: String(sa.file_name),
            fileSizeBytes: Number(sa.file_size_bytes),
            mimeType: String(sa.mime_type),
            createdAt: new Date(sa.created_at),
          });
        }
      }

      for (const s of subRows) {
        const sId = Number(s.id);
        submissions.push({
          publicId: String(s.public_id),
          sequenceNo: Number(s.sequence_no),
          notes: s.notes ? String(s.notes) : null,
          submitterName: String(s.submitter_name),
          reviewDecision: s.review_decision ? (String(s.review_decision) as SubmissionReviewDecision) : null,
          reviewNote: s.review_note ? String(s.review_note) : null,
          reviewerName: s.reviewer_name ? String(s.reviewer_name) : null,
          reviewedAt: s.reviewed_at ? new Date(s.reviewed_at) : null,
          createdAt: new Date(s.created_at),
          links: linksMap.get(sId) || [],
          attachments: subAttMap.get(sId) || [],
        });
      }
    }

    return {
      id: missionId,
      publicId: String(r.public_id),
      consultancyId: Number(r.consultancy_id),
      assigneeMembershipId: Number(r.assignee_membership_id),
      assigneeMembershipPublicId: String(r.assignee_membership_public_id),
      assigneeName: String(r.assignee_name),
      assigneeEmail: String(r.assignee_email),
      title: String(r.title),
      objective: String(r.objective),
      instructions: String(r.instructions),
      priority: r.priority as MissionPriority,
      status,
      dueAtUtc,
      timezoneSnapshot: tz,
      formattedDueAt: formatConsultancyDateTime(tz, dueAtUtc),
      isLate: isMissionLate(dueAtUtc, status),
      creatorName: String(r.creator_name),
      startedAt: r.started_at ? new Date(r.started_at) : null,
      canceledAt: r.canceled_at ? new Date(r.canceled_at) : null,
      cancelerName: r.canceler_name ? String(r.canceler_name) : null,
      createdAt: new Date(r.created_at),
      referenceAttachments,
      submissions,
    };
  } catch {
    return null;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Transitions mission from PENDING to IN_PROGRESS (Influencer action).
 */
export async function startMission(params: {
  consultancyId: number;
  membershipId: number;
  actorUserId: number;
  missionPublicId: string;
}): Promise<{ success: boolean; error?: string }> {
  const { consultancyId, membershipId, actorUserId, missionPublicId } = params;

  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 1. Lock mission row
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, status, assignee_membership_id
       FROM missions
       WHERE public_id = ?
         AND consultancy_id = ?
       FOR UPDATE;`,
      [missionPublicId, consultancyId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Missão não encontrada." };
    }

    const mission = rows[0];
    if (Number(mission.assignee_membership_id) !== membershipId) {
      await connection.rollback();
      return { success: false, error: "Apenas o influenciador responsável pode iniciar esta missão." };
    }

    if (mission.status !== "PENDING") {
      await connection.rollback();
      return {
        success: false,
        error: `Não é possível iniciar esta missão pois seu estado atual é: ${MISSION_STATUS_LABELS[mission.status as MissionStatus] || mission.status}.`,
      };
    }

    const missionId = Number(mission.id);

    // 2. Update status to IN_PROGRESS
    await connection.execute<ResultSetHeader>(
      `UPDATE missions
       SET status = 'IN_PROGRESS', started_at = UTC_TIMESTAMP(3)
       WHERE id = ?;`,
      [missionId]
    );

    // 3. Insert audit
    const auditPublicId = crypto.randomUUID();
    await connection.execute<ResultSetHeader>(
      `INSERT INTO audit_events (
        public_id,
        actor_user_id,
        consultancy_id,
        action,
        target_type,
        target_public_id,
        metadata_json
      ) VALUES (?, ?, ?, 'MISSION_STARTED', 'MISSION', ?, ?);`,
      [
        auditPublicId,
        actorUserId,
        consultancyId,
        missionPublicId,
        JSON.stringify({ previousStatus: "PENDING", newStatus: "IN_PROGRESS" }),
      ]
    );

    await connection.commit();
    return { success: true };
  } catch {
    if (connection) {
      await connection.rollback();
    }
    return { success: false, error: "Erro ao iniciar a missão. Tente novamente." };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export type SubmissionFileInput = {
  buffer: Buffer;
  fileName: string;
  clientMime?: string;
};

/**
 * Influencer submits a delivery for the mission (IN_PROGRESS or REVISION_REQUESTED -> SUBMITTED).
 */
export async function submitMission(params: {
  consultancyId: number;
  membershipId: number;
  actorUserId: number;
  missionPublicId: string;
  notes?: string;
  links?: string[];
  files?: SubmissionFileInput[];
}): Promise<{ success: boolean; error?: string }> {
  const { consultancyId, membershipId, actorUserId, missionPublicId, notes, links = [], files = [] } = params;

  // Validation
  const normalizedNotes = (notes || "").trim().normalize("NFC");
  if (normalizedNotes.length > 5000) {
    return { success: false, error: "As observações da entrega devem ter no máximo 5000 caracteres." };
  }

  // Validate links
  if (links.length > MAX_LINKS_PER_SUBMISSION) {
    return { success: false, error: `Número máximo de ${MAX_LINKS_PER_SUBMISSION} links excedido.` };
  }

  const validLinks: string[] = [];
  for (const rawUrl of links) {
    const linkCheck = validateHttpsUrl(rawUrl);
    if (!linkCheck.valid || !linkCheck.normalized) {
      return { success: false, error: linkCheck.error || "Link inválido." };
    }
    validLinks.push(linkCheck.normalized);
  }

  // Validate files
  if (files.length > MAX_MISSION_FILES_PER_OP) {
    return { success: false, error: `Número máximo de ${MAX_MISSION_FILES_PER_OP} arquivos por envio excedido.` };
  }

  let totalFileBytes = 0;
  for (const file of files) {
    if (!file.buffer || file.buffer.length === 0) {
      return { success: false, error: "Arquivo vazio não permitido." };
    }
    if (file.buffer.length > MAX_MISSION_FILE_SIZE_BYTES) {
      return { success: false, error: "Cada arquivo deve ter no máximo 10 MB." };
    }
    totalFileBytes += file.buffer.length;
  }
  if (totalFileBytes > MAX_MISSION_AGGREGATE_FILE_BYTES) {
    return { success: false, error: "O tamanho total dos arquivos enviados não pode ultrapassar 20 MB." };
  }

  // Check evidence minimum
  const hasNotes = normalizedNotes.length > 0;
  const hasLinks = validLinks.length > 0;
  const hasFiles = files.length > 0;
  if (!hasNotes && !hasLinks && !hasFiles) {
    return { success: false, error: "A entrega precisa conter ao menos uma observação, link ou arquivo anexado." };
  }

  // Write private files with compensation tracking
  const writtenKeys: string[] = [];
  const preparedAttachments: Array<{
    publicId: string;
    fileName: string;
    fileSizeBytes: number;
    mimeType: string;
    sha256Hash: string;
    storageKey: string;
  }> = [];

  try {
    for (const f of files) {
      const detection = detectReceiptFileType(f.buffer, f.clientMime);
      if (!detection.valid || !detection.mimeType || !detection.extension) {
        throw new Error(detection.error || "Formato de arquivo inválido. Use JPG, PNG, WEBP ou PDF.");
      }

      const writeResult = await writePrivateFile({
        buffer: f.buffer,
        extension: detection.extension,
        originalFileName: f.fileName,
        namespace: "mission-submissions",
      });

      writtenKeys.push(writeResult.fileStorageKey);
      preparedAttachments.push({
        publicId: crypto.randomUUID(),
        fileName: writeResult.originalFileName,
        fileSizeBytes: writeResult.sizeBytes,
        mimeType: detection.mimeType,
        sha256Hash: writeResult.fileSha256,
        storageKey: writeResult.fileStorageKey,
      });
    }
  } catch (err: unknown) {
    // Compensate any written files
    for (const k of writtenKeys) {
      await deletePrivateFile(k);
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao processar anexos.",
    };
  }

  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 1. Lock mission row
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, status, assignee_membership_id
       FROM missions
       WHERE public_id = ?
         AND consultancy_id = ?
       FOR UPDATE;`,
      [missionPublicId, consultancyId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      await connection.rollback();
      for (const k of writtenKeys) await deletePrivateFile(k);
      return { success: false, error: "Missão não encontrada." };
    }

    const mission = rows[0];
    if (Number(mission.assignee_membership_id) !== membershipId) {
      await connection.rollback();
      for (const k of writtenKeys) await deletePrivateFile(k);
      return { success: false, error: "Apenas o influenciador responsável pode enviar entregas." };
    }

    if (mission.status !== "IN_PROGRESS" && mission.status !== "REVISION_REQUESTED") {
      await connection.rollback();
      for (const k of writtenKeys) await deletePrivateFile(k);
      return {
        success: false,
        error: `Não é possível enviar entrega no estado atual: ${MISSION_STATUS_LABELS[mission.status as MissionStatus] || mission.status}.`,
      };
    }

    const missionId = Number(mission.id);

    // 2. Determine sequence number
    const [seqRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COALESCE(MAX(sequence_no), 0) + 1 AS next_seq
       FROM mission_submissions
       WHERE mission_id = ?;`,
      [missionId]
    );
    const nextSeq = Number(seqRows[0]?.next_seq || 1);

    // 3. Insert submission
    const submissionPublicId = crypto.randomUUID();
    const [insertSub] = await connection.execute<ResultSetHeader>(
      `INSERT INTO mission_submissions (
        public_id,
        mission_id,
        sequence_no,
        notes,
        submitted_by_user_id
      ) VALUES (?, ?, ?, ?, ?);`,
      [
        submissionPublicId,
        missionId,
        nextSeq,
        normalizedNotes.length > 0 ? normalizedNotes : null,
        actorUserId,
      ]
    );
    const submissionId = insertSub.insertId;

    // 4. Insert links
    for (const url of validLinks) {
      await connection.execute<ResultSetHeader>(
        `INSERT INTO mission_submission_links (submission_id, url)
         VALUES (?, ?);`,
        [submissionId, url]
      );
    }

    // 5. Insert attachments
    for (const att of preparedAttachments) {
      await connection.execute<ResultSetHeader>(
        `INSERT INTO mission_submission_attachments (
          public_id,
          submission_id,
          file_name,
          file_size_bytes,
          mime_type,
          sha256_hash,
          storage_key
        ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [
          att.publicId,
          submissionId,
          att.fileName,
          att.fileSizeBytes,
          att.mimeType,
          att.sha256Hash,
          att.storageKey,
        ]
      );
    }

    // 6. Update mission status to SUBMITTED
    const previousStatus = mission.status;
    await connection.execute<ResultSetHeader>(
      `UPDATE missions
       SET status = 'SUBMITTED'
       WHERE id = ?;`,
      [missionId]
    );

    // 7. Audit event
    const auditPublicId = crypto.randomUUID();
    await connection.execute<ResultSetHeader>(
      `INSERT INTO audit_events (
        public_id,
        actor_user_id,
        consultancy_id,
        action,
        target_type,
        target_public_id,
        metadata_json
      ) VALUES (?, ?, ?, 'MISSION_SUBMITTED', 'MISSION', ?, ?);`,
      [
        auditPublicId,
        actorUserId,
        consultancyId,
        missionPublicId,
        JSON.stringify({
          submissionPublicId,
          sequenceNo: nextSeq,
          previousStatus,
          newStatus: "SUBMITTED",
        }),
      ]
    );

    await connection.commit();
    return { success: true };
  } catch {
    if (connection) {
      await connection.rollback();
    }
    for (const k of writtenKeys) {
      await deletePrivateFile(k);
    }
    return { success: false, error: "Erro ao registrar a entrega. Tente novamente." };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Consultancy Admin reviews the latest submission (SUBMITTED -> APPROVED or REVISION_REQUESTED).
 */
export async function reviewMission(params: {
  consultancyId: number;
  actorUserId: number;
  missionPublicId: string;
  decision: SubmissionReviewDecision;
  reviewNote?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { consultancyId, actorUserId, missionPublicId, decision, reviewNote } = params;

  if (decision !== "APPROVED" && decision !== "REVISION_REQUESTED") {
    return { success: false, error: "Decisão de revisão inválida." };
  }

  const normalizedReviewNote = (reviewNote || "").trim().normalize("NFC");
  if (decision === "REVISION_REQUESTED" && normalizedReviewNote.length < 1) {
    return { success: false, error: "Informe o motivo/orientação da revisão solicitada." };
  }
  if (normalizedReviewNote.length > 2000) {
    return { success: false, error: "A observação de revisão deve ter no máximo 2000 caracteres." };
  }

  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 1. Lock mission
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        m.id,
        m.status,
        m.assignee_membership_id,
        cm.user_id AS assignee_user_id,
        c.slug AS consultancy_slug
       FROM missions m
       INNER JOIN consultancy_members cm ON cm.id = m.assignee_membership_id
       INNER JOIN consultancies c ON c.id = m.consultancy_id
       WHERE m.public_id = ?
         AND m.consultancy_id = ?
       FOR UPDATE;`,
      [missionPublicId, consultancyId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Missão não encontrada." };
    }

    const mission = rows[0];
    if (mission.status !== "SUBMITTED") {
      await connection.rollback();
      return {
        success: false,
        error: `Apenas missões aguardando revisão podem ser revisadas. Estado atual: ${MISSION_STATUS_LABELS[mission.status as MissionStatus] || mission.status}.`,
      };
    }

    const missionId = Number(mission.id);
    const assigneeUserId = Number(mission.assignee_user_id);
    const consultancySlug = String(mission.consultancy_slug);

    // 2. Lock and fetch the latest unreviewed submission
    const [subRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, sequence_no
       FROM mission_submissions
       WHERE mission_id = ?
         AND review_decision IS NULL
       ORDER BY sequence_no DESC
       LIMIT 1
       FOR UPDATE;`,
      [missionId]
    );

    if (!Array.isArray(subRows) || subRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Nenhuma entrega pendente de revisão foi encontrada para esta missão." };
    }

    const sub = subRows[0];
    const submissionId = Number(sub.id);
    const submissionPublicId = String(sub.public_id);

    // 3. Update submission review columns
    await connection.execute<ResultSetHeader>(
      `UPDATE mission_submissions
       SET review_decision = ?,
           review_note = ?,
           reviewed_by_user_id = ?,
           reviewed_at = UTC_TIMESTAMP(3)
       WHERE id = ?;`,
      [
        decision,
        normalizedReviewNote.length > 0 ? normalizedReviewNote : null,
        actorUserId,
        submissionId,
      ]
    );

    // 4. Update mission status
    const newMissionStatus: MissionStatus = decision === "APPROVED" ? "APPROVED" : "REVISION_REQUESTED";
    await connection.execute<ResultSetHeader>(
      `UPDATE missions
       SET status = ?
       WHERE id = ?;`,
      [newMissionStatus, missionId]
    );

    // 5. Audit
    const auditAction = decision === "APPROVED" ? "MISSION_APPROVED" : "MISSION_REVISION_REQUESTED";
    const auditPublicId = crypto.randomUUID();
    await connection.execute<ResultSetHeader>(
      `INSERT INTO audit_events (
        public_id,
        actor_user_id,
        consultancy_id,
        action,
        target_type,
        target_public_id,
        metadata_json
      ) VALUES (?, ?, ?, ?, 'MISSION', ?, ?);`,
      [
        auditPublicId,
        actorUserId,
        consultancyId,
        auditAction,
        missionPublicId,
        JSON.stringify({
          submissionPublicId,
          decision,
          newStatus: newMissionStatus,
        }),
      ]
    );

    // 6. Persist canonical domain notification
    const notification = await createNotificationInTransaction(connection, {
      userId: assigneeUserId,
      consultancyId,
      priority: decision === "REVISION_REQUESTED" ? "HIGH" : "NORMAL",
      eventType: decision === "REVISION_REQUESTED" ? "MISSION_REVISION_REQUESTED" : "MISSION_APPROVED",
      title: decision === "REVISION_REQUESTED" ? "Sua missão precisa de ajustes" : "Missão aprovada",
      body:
        decision === "REVISION_REQUESTED"
          ? "Foram solicitadas alterações na sua missão. Confira os detalhes no Trevo."
          : "Sua missão foi aprovada.",
      deepLink: `/consultoria/${consultancySlug}/missoes/${missionPublicId}`,
      dedupeKey:
        decision === "REVISION_REQUESTED"
          ? `mission:revision_requested:${submissionPublicId}`
          : `mission:approved:${submissionPublicId}`,
      sourceType: "MISSION",
      sourcePublicId: missionPublicId,
    });

    await connection.commit();

    // Best-effort external delivery after commit
    try {
      await deliverNotificationAfterCommit(notification.id);
    } catch {
      // Push failure must never affect business transaction success
    }

    return { success: true };
  } catch {
    if (connection) {
      await connection.rollback();
    }
    return { success: false, error: "Erro ao processar revisão. Tente novamente." };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Consultancy Admin cancels a mission.
 */
export async function cancelMission(params: {
  consultancyId: number;
  actorUserId: number;
  missionPublicId: string;
}): Promise<{ success: boolean; error?: string }> {
  const { consultancyId, actorUserId, missionPublicId } = params;

  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 1. Lock mission
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, status
       FROM missions
       WHERE public_id = ?
         AND consultancy_id = ?
       FOR UPDATE;`,
      [missionPublicId, consultancyId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Missão não encontrada." };
    }

    const mission = rows[0];
    const previousStatus = mission.status as MissionStatus;
    if (previousStatus === "APPROVED" || previousStatus === "CANCELED") {
      await connection.rollback();
      return {
        success: false,
        error: `Não é possível cancelar uma missão que já está ${MISSION_STATUS_LABELS[previousStatus]}.`,
      };
    }

    const missionId = Number(mission.id);

    // 2. Update to CANCELED
    await connection.execute<ResultSetHeader>(
      `UPDATE missions
       SET status = 'CANCELED',
           canceled_by_user_id = ?,
           canceled_at = UTC_TIMESTAMP(3)
       WHERE id = ?;`,
      [actorUserId, missionId]
    );

    // 3. Audit
    const auditPublicId = crypto.randomUUID();
    await connection.execute<ResultSetHeader>(
      `INSERT INTO audit_events (
        public_id,
        actor_user_id,
        consultancy_id,
        action,
        target_type,
        target_public_id,
        metadata_json
      ) VALUES (?, ?, ?, 'MISSION_CANCELED', 'MISSION', ?, ?);`,
      [
        auditPublicId,
        actorUserId,
        consultancyId,
        missionPublicId,
        JSON.stringify({ previousStatus, newStatus: "CANCELED" }),
      ]
    );

    await connection.commit();
    return { success: true };
  } catch {
    if (connection) {
      await connection.rollback();
    }
    return { success: false, error: "Erro ao cancelar missão. Tente novamente." };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Uploads a reference attachment to a PENDING mission by Consultancy Admin.
 */
export async function uploadAdminReferenceAttachment(params: {
  consultancyId: number;
  actorUserId: number;
  missionPublicId: string;
  file: SubmissionFileInput;
}): Promise<{ success: boolean; error?: string }> {
  const { consultancyId, actorUserId, missionPublicId, file } = params;

  if (!file.buffer || file.buffer.length === 0) {
    return { success: false, error: "Arquivo vazio não permitido." };
  }
  if (file.buffer.length > MAX_MISSION_FILE_SIZE_BYTES) {
    return { success: false, error: "O arquivo deve ter no máximo 10 MB." };
  }

  const detection = detectReceiptFileType(file.buffer, file.clientMime);
  if (!detection.valid || !detection.mimeType || !detection.extension) {
    return { success: false, error: detection.error || "Formato inválido. Use JPG, PNG, WEBP ou PDF." };
  }

  let writeResult;
  try {
    writeResult = await writePrivateFile({
      buffer: file.buffer,
      extension: detection.extension,
      originalFileName: file.fileName,
      namespace: "mission-attachments",
    });
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao gravar arquivo." };
  }

  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, status
       FROM missions
       WHERE public_id = ?
         AND consultancy_id = ?
       FOR UPDATE;`,
      [missionPublicId, consultancyId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      await connection.rollback();
      await deletePrivateFile(writeResult.fileStorageKey);
      return { success: false, error: "Missão não encontrada." };
    }

    const mission = rows[0];
    if (mission.status !== "PENDING") {
      await connection.rollback();
      await deletePrivateFile(writeResult.fileStorageKey);
      return {
        success: false,
        error: "Arquivos de referência só podem ser adicionados enquanto a missão estiver Pendente.",
      };
    }

    const missionId = Number(mission.id);
    const attachmentPublicId = crypto.randomUUID();

    await connection.execute<ResultSetHeader>(
      `INSERT INTO mission_attachments (
        public_id,
        mission_id,
        file_name,
        file_size_bytes,
        mime_type,
        sha256_hash,
        storage_key,
        uploaded_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        attachmentPublicId,
        missionId,
        writeResult.originalFileName,
        writeResult.sizeBytes,
        detection.mimeType,
        writeResult.fileSha256,
        writeResult.fileStorageKey,
        actorUserId,
      ]
    );

    await connection.commit();
    return { success: true };
  } catch {
    if (connection) {
      await connection.rollback();
    }
    await deletePrivateFile(writeResult.fileStorageKey);
    return { success: false, error: "Erro ao anexar arquivo de referência." };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Resolves, authorizes, and returns a verified private mission file for download.
 */
export async function getMissionFileForDownload(params: {
  consultancyId: number;
  actorUserId: number;
  actorMembershipId: number;
  isConsultancyAdmin: boolean;
  filePublicId: string;
}): Promise<{
  success: boolean;
  buffer?: Buffer;
  mimeType?: string;
  fileName?: string;
  error?: string;
  statusCode?: number;
}> {
  const { consultancyId, actorMembershipId, isConsultancyAdmin, filePublicId } = params;

  let connection;
  try {
    connection = await getDbConnection();

    // 1. Try mission_attachments (reference files)
    const [attRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        ma.file_name,
        ma.file_size_bytes,
        ma.mime_type,
        ma.sha256_hash,
        ma.storage_key,
        m.consultancy_id,
        m.assignee_membership_id
       FROM mission_attachments ma
       INNER JOIN missions m ON m.id = ma.mission_id
       WHERE ma.public_id = ?
         AND m.consultancy_id = ?
       LIMIT 1;`,
      [filePublicId, consultancyId]
    );

    let fileRecord: RowDataPacket | null = null;
    if (Array.isArray(attRows) && attRows.length > 0) {
      fileRecord = attRows[0];
    } else {
      // 2. Try mission_submission_attachments
      const [subAttRows] = await connection.execute<RowDataPacket[]>(
        `SELECT
          msa.file_name,
          msa.file_size_bytes,
          msa.mime_type,
          msa.sha256_hash,
          msa.storage_key,
          m.consultancy_id,
          m.assignee_membership_id
         FROM mission_submission_attachments msa
         INNER JOIN mission_submissions ms ON ms.id = msa.submission_id
         INNER JOIN missions m ON m.id = ms.mission_id
         WHERE msa.public_id = ?
           AND m.consultancy_id = ?
         LIMIT 1;`,
        [filePublicId, consultancyId]
      );
      if (Array.isArray(subAttRows) && subAttRows.length > 0) {
        fileRecord = subAttRows[0];
      }
    }

    if (!fileRecord) {
      return { success: false, statusCode: 404, error: "Arquivo não encontrado." };
    }

    // Authorization check: Admin OR exact assignee Influencer
    const isAssignee = Number(fileRecord.assignee_membership_id) === actorMembershipId;
    if (!isConsultancyAdmin && !isAssignee) {
      return { success: false, statusCode: 403, error: "Acesso não autorizado a este arquivo." };
    }

    // Read and verify
    const readResult = await readVerifiedPrivateFile({
      fileStorageKey: String(fileRecord.storage_key),
      expectedSizeBytes: Number(fileRecord.file_size_bytes),
      expectedFileSha256: String(fileRecord.sha256_hash),
      expectedMimeType: String(fileRecord.mime_type),
    });

    if (!readResult.success || !readResult.buffer || !readResult.mimeType) {
      return { success: false, statusCode: 500, error: readResult.error || "Inconsistência no arquivo." };
    }

    return {
      success: true,
      buffer: readResult.buffer,
      mimeType: readResult.mimeType,
      fileName: sanitizeOriginalFileName(fileRecord.file_name),
    };
  } catch {
    return { success: false, statusCode: 500, error: "Erro ao processar download do arquivo." };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
