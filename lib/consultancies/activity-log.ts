import crypto from "node:crypto";
import type { PoolConnection, RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";

export * from "./activity-formatters";
import type {
  ConsultancyActivityModule,
  ActivityFilterOptions,
  ActivityEventRow,
} from "./activity-formatters";

export interface RecordActivityParams {
  consultancyId: number | bigint;
  actorUserId: number | bigint;
  actorMembershipId?: number | bigint | null;
  actorRole: string;
  action: string;
  module: ConsultancyActivityModule;
  resourceType: string;
  resourcePublicId?: string | null;
  subjectMembershipId?: number | bigint | null;
  summary: string;
  metadata?: Record<string, unknown> | null;
  connection?: PoolConnection;
}

const FORBIDDEN_KEY_PATTERNS = [
  /pass/i,
  /secret/i,
  /token/i,
  /key/i,
  /auth/i,
  /cookie/i,
  /hash/i,
  /salt/i,
  /credential/i,
  /bearer/i,
];

const SENSITIVE_HEALTH_PAYLOAD_KEYS = [
  /responses_json/i,
  /answers/i,
  /clinical/i,
  /anamnesis_content/i,
  /medical/i,
  /diagnosis/i,
  /pathology/i,
  /medication/i,
  /symptoms/i,
];

export function sanitizeMetadata(data: unknown, depth = 0): unknown {
  if (depth > 5) return "[NESTED_MAX_DEPTH]";
  if (data === null || data === undefined) return null;
  if (typeof data !== "object") {
    if (typeof data === "string" && data.length > 500) {
      return data.slice(0, 500) + "... [TRUNCATED]";
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.slice(0, 20).map((item) => sanitizeMetadata(item, depth + 1));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (FORBIDDEN_KEY_PATTERNS.some((pat) => pat.test(key))) {
      continue;
    }
    if (SENSITIVE_HEALTH_PAYLOAD_KEYS.some((pat) => pat.test(key))) {
      sanitized[key] = "[REDACTED_CLINICAL_PAYLOAD]";
      continue;
    }
    sanitized[key] = sanitizeMetadata(value, depth + 1);
  }
  return sanitized;
}

export async function recordConsultancyActivity(
  params: RecordActivityParams
): Promise<string | null> {
  const {
    consultancyId,
    actorUserId,
    actorMembershipId = null,
    actorRole,
    action,
    module,
    resourceType,
    resourcePublicId = null,
    subjectMembershipId = null,
    summary,
    metadata = null,
    connection,
  } = params;

  if (!consultancyId || !actorUserId || !actorRole || !action || !module || !resourceType || !summary) {
    console.warn("[ActivityLog] Missing required parameters to record activity", {
      consultancyId,
      actorUserId,
      actorRole,
      action,
      module,
      resourceType,
    });
    return null;
  }

  const publicId = crypto.randomUUID();
  const sanitizedMeta = metadata ? sanitizeMetadata(metadata) : null;
  const metadataJson = sanitizedMeta ? JSON.stringify(sanitizedMeta) : null;

  const insertSql = `
    INSERT INTO consultancy_activity_events (
      public_id,
      consultancy_id,
      actor_membership_id,
      actor_user_id,
      actor_role,
      action,
      module,
      resource_type,
      resource_public_id,
      subject_membership_id,
      summary,
      metadata_json,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3))
  `;

  const values = [
    publicId,
    consultancyId,
    actorMembershipId,
    actorUserId,
    actorRole,
    action,
    module,
    resourceType,
    resourcePublicId,
    subjectMembershipId,
    summary.slice(0, 255),
    metadataJson,
  ];

  if (connection) {
    await connection.query<ResultSetHeader>(insertSql, values);
    return publicId;
  }

  const conn = await getDbConnection();
  try {
    await conn.query<ResultSetHeader>(insertSql, values);
    return publicId;
  } finally {
    conn.release();
  }
}

// Types imported and re-exported from ./activity-formatters

export async function listConsultancyActivityEvents(
  consultancyIdOrOptions:
    | number
    | bigint
    | (ActivityFilterOptions & { consultancyId: number | bigint; limit?: number; offset?: number }),
  filtersOrUndefined?: ActivityFilterOptions,
  limitArg = 50,
  offsetArg = 0
): Promise<{ events: ActivityEventRow[]; total: number }> {
  let consultancyId: number | bigint;
  let filters: ActivityFilterOptions = {};
  let limit = limitArg;
  let offset = offsetArg;

  if (typeof consultancyIdOrOptions === "object" && consultancyIdOrOptions !== null) {
    consultancyId = consultancyIdOrOptions.consultancyId;
    limit = consultancyIdOrOptions.limit ?? limitArg;
    offset = consultancyIdOrOptions.offset ?? offsetArg;
    filters = {
      actorMembershipId: consultancyIdOrOptions.actorMembershipId,
      actorUserId: consultancyIdOrOptions.actorUserId,
      actorRole: consultancyIdOrOptions.actorRole,
      action: consultancyIdOrOptions.action,
      module: consultancyIdOrOptions.module,
      subjectMembershipId: consultancyIdOrOptions.subjectMembershipId,
      startDate: consultancyIdOrOptions.startDate,
      endDate: consultancyIdOrOptions.endDate,
      search: consultancyIdOrOptions.search,
    };
  } else {
    consultancyId = consultancyIdOrOptions;
    filters = filtersOrUndefined ?? {};
  }

  const conn = await getDbConnection();
  try {
    const whereClauses: string[] = ["cae.consultancy_id = ?"];
    const whereValues: unknown[] = [consultancyId];

    if (filters.actorMembershipId) {
      whereClauses.push("cae.actor_membership_id = ?");
      whereValues.push(filters.actorMembershipId);
    }
    if (filters.actorUserId) {
      whereClauses.push("cae.actor_user_id = ?");
      whereValues.push(filters.actorUserId);
    }
    if (filters.actorRole) {
      whereClauses.push("cae.actor_role = ?");
      whereValues.push(filters.actorRole);
    }
    if (filters.module) {
      whereClauses.push("cae.module = ?");
      whereValues.push(filters.module);
    }
    if (filters.action) {
      whereClauses.push("cae.action = ?");
      whereValues.push(filters.action);
    }
    if (filters.subjectMembershipId) {
      whereClauses.push("cae.subject_membership_id = ?");
      whereValues.push(filters.subjectMembershipId);
    }
    if (filters.startDate) {
      whereClauses.push("cae.created_at >= ?");
      whereValues.push(filters.startDate);
    }
    if (filters.endDate) {
      whereClauses.push("cae.created_at <= ?");
      whereValues.push(filters.endDate);
    }
    if (filters.search && filters.search.trim().length > 0) {
      const searchTerm = `%${filters.search.trim()}%`;
      whereClauses.push(
        "(cae.summary LIKE ? OR u_actor.full_name LIKE ? OR u_actor.email LIKE ? OR u_subject.full_name LIKE ? OR u_subject.email LIKE ? OR cae.resource_public_id LIKE ?)"
      );
      whereValues.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const whereSql = whereClauses.join(" AND ");

    const countSql = `
      SELECT COUNT(*) AS total
      FROM consultancy_activity_events cae
      LEFT JOIN users u_actor ON u_actor.id = cae.actor_user_id
      LEFT JOIN consultancy_members cm_subject ON cm_subject.id = cae.subject_membership_id
      LEFT JOIN users u_subject ON u_subject.id = cm_subject.user_id
      WHERE ${whereSql}
    `;

    const [countRows] = await conn.query<RowDataPacket[]>(countSql, whereValues);
    const total = Number(countRows[0]?.total ?? 0);

    const safeLimit = Math.max(1, Math.min(100, limit));
    const safeOffset = Math.max(0, offset);

    const selectSql = `
      SELECT
        cae.id,
        cae.public_id,
        cae.consultancy_id,
        cae.actor_membership_id,
        cae.actor_user_id,
        cae.actor_role,
        cae.action,
        cae.module,
        cae.resource_type,
        cae.resource_public_id,
        cae.subject_membership_id,
        cae.summary,
        cae.metadata_json,
        cae.created_at,
        u_actor.full_name AS actor_name,
        u_actor.email AS actor_email,
        u_subject.full_name AS subject_name,
        u_subject.email AS subject_email
      FROM consultancy_activity_events cae
      LEFT JOIN users u_actor ON u_actor.id = cae.actor_user_id
      LEFT JOIN consultancy_members cm_subject ON cm_subject.id = cae.subject_membership_id
      LEFT JOIN users u_subject ON u_subject.id = cm_subject.user_id
      WHERE ${whereSql}
      ORDER BY cae.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await conn.query<RowDataPacket[]>(selectSql, [...whereValues, safeLimit, safeOffset]);

    const events: ActivityEventRow[] = rows.map((r) => {
      let meta: Record<string, unknown> | null = null;
      if (r.metadata_json) {
        try {
          const parsed = typeof r.metadata_json === "string" ? JSON.parse(r.metadata_json) : r.metadata_json;
          meta = typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : null;
        } catch {
          meta = null;
        }
      }
      return {
        id: Number(r.id),
        public_id: String(r.public_id),
        consultancy_id: Number(r.consultancy_id),
        actor_membership_id: r.actor_membership_id ? Number(r.actor_membership_id) : null,
        actor_user_id: Number(r.actor_user_id),
        actor_role: String(r.actor_role),
        action: String(r.action),
        module: String(r.module),
        resource_type: String(r.resource_type),
        resource_public_id: r.resource_public_id ? String(r.resource_public_id) : null,
        subject_membership_id: r.subject_membership_id ? Number(r.subject_membership_id) : null,
        summary: String(r.summary),
        metadata_json: meta,
        created_at: new Date(r.created_at).toISOString(),
        actor_name: r.actor_name ? String(r.actor_name) : null,
        actor_email: r.actor_email ? String(r.actor_email) : null,
        subject_name: r.subject_name ? String(r.subject_name) : null,
        subject_email: r.subject_email ? String(r.subject_email) : null,
      };
    });

    return { events, total };
  } finally {
    conn.release();
  }
}

// formatActivityEventNaturalSentence imported and re-exported from ./activity-formatters



export async function getConsultancyActivityEventDetail(
  consultancyId: number | bigint,
  eventPublicId: string
): Promise<ActivityEventRow | null> {
  const conn = await getDbConnection();
  try {
    const sql = `
      SELECT
        cae.id,
        cae.public_id,
        cae.consultancy_id,
        cae.actor_membership_id,
        cae.actor_user_id,
        cae.actor_role,
        cae.action,
        cae.module,
        cae.resource_type,
        cae.resource_public_id,
        cae.subject_membership_id,
        cae.summary,
        cae.metadata_json,
        cae.created_at,
        u_actor.full_name AS actor_name,
        u_actor.email AS actor_email,
        u_subject.full_name AS subject_name,
        u_subject.email AS subject_email
      FROM consultancy_activity_events cae
      LEFT JOIN users u_actor ON u_actor.id = cae.actor_user_id
      LEFT JOIN consultancy_members cm_subject ON cm_subject.id = cae.subject_membership_id
      LEFT JOIN users u_subject ON u_subject.id = cm_subject.user_id
      WHERE cae.consultancy_id = ? AND cae.public_id = ?
      LIMIT 1
    `;

    const [rows] = await conn.query<RowDataPacket[]>(sql, [consultancyId, eventPublicId]);
    if (!rows || rows.length === 0) return null;

    const r = rows[0];
    let meta: Record<string, unknown> | null = null;
    if (r.metadata_json) {
      try {
        const parsed = typeof r.metadata_json === "string" ? JSON.parse(r.metadata_json) : r.metadata_json;
        meta = typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : null;
      } catch {
        meta = null;
      }
    }

    return {
      id: Number(r.id),
      public_id: String(r.public_id),
      consultancy_id: Number(r.consultancy_id),
      actor_membership_id: r.actor_membership_id ? Number(r.actor_membership_id) : null,
      actor_user_id: Number(r.actor_user_id),
      actor_role: String(r.actor_role),
      action: String(r.action),
      module: String(r.module),
      resource_type: String(r.resource_type),
      resource_public_id: r.resource_public_id ? String(r.resource_public_id) : null,
      subject_membership_id: r.subject_membership_id ? Number(r.subject_membership_id) : null,
      summary: String(r.summary),
      metadata_json: meta,
      created_at: new Date(r.created_at).toISOString(),
      actor_name: r.actor_name ? String(r.actor_name) : null,
      actor_email: r.actor_email ? String(r.actor_email) : null,
      subject_name: r.subject_name ? String(r.subject_name) : null,
      subject_email: r.subject_email ? String(r.subject_email) : null,
    };
  } finally {
    conn.release();
  }
}
