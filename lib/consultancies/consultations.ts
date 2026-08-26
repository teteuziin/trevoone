import crypto from "node:crypto";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";
import { formatConsultancyDateTime } from "./timezone";

// ==========================================
// CONSTANTS & TYPES
// ==========================================

export type ConsultationStatus =
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELED";

export const VALID_CONSULTATION_STATUSES: readonly ConsultationStatus[] = [
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELED",
] as const;

export const CONSULTATION_STATUS_LABELS: Record<ConsultationStatus, string> = {
  SCHEDULED: "Agendada",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluída",
  CANCELED: "Cancelada",
};

export type ConsultationProfessionalType = "PERSONAL" | "NUTRITIONIST";

export const VALID_PROFESSIONAL_TYPES: readonly ConsultationProfessionalType[] = [
  "PERSONAL",
  "NUTRITIONIST",
] as const;

export const PROFESSIONAL_TYPE_LABELS: Record<ConsultationProfessionalType, string> = {
  PERSONAL: "Personal Trainer",
  NUTRITIONIST: "Nutricionista",
};

export interface ConsultationParticipantDto {
  membershipPublicId: string;
  userPublicId: string;
  fullName: string;
  email: string;
  role: string;
}

export interface ConsultationDto {
  publicId: string;
  consultancyPublicId: string;
  consultancySlug: string;
  consultancyName: string;
  professionalType: ConsultationProfessionalType;
  title: string;
  scheduledStartAt: Date;
  scheduledEndAt: Date;
  scheduledStartFormatted: string;
  scheduledEndFormatted: string;
  status: ConsultationStatus;
  startedAt: Date | null;
  endedAt: Date | null;
  canceledAt: Date | null;
  cancelReason: string | null;
  student: ConsultationParticipantDto;
  professional: ConsultationParticipantDto;
  canJoinNow: boolean;
}

export interface ConsultationListItemDto {
  publicId: string;
  professionalType: ConsultationProfessionalType;
  title: string;
  scheduledStartAt: Date;
  scheduledEndAt: Date;
  scheduledStartFormatted: string;
  scheduledEndFormatted: string;
  status: ConsultationStatus;
  counterpartName: string;
  counterpartRole: string;
  canJoinNow: boolean;
}

// ==========================================
// PURE DOMAIN HELPERS
// ==========================================

/**
 * Validates whether a status transition is permitted by the state machine.
 */
export function canTransitionConsultationStatus(
  from: ConsultationStatus,
  to: ConsultationStatus
): boolean {
  if (from === to) return false;

  switch (from) {
    case "SCHEDULED":
      return to === "IN_PROGRESS" || to === "CANCELED";
    case "IN_PROGRESS":
      return to === "COMPLETED" || to === "CANCELED";
    case "COMPLETED":
    case "CANCELED":
      return false;
    default:
      return false;
  }
}

/**
 * Checks whether the scheduled time range is valid (end must be strictly after start).
 */
export function isValidConsultationTimeRange(start: Date, end: Date): boolean {
  return (
    start instanceof Date &&
    end instanceof Date &&
    !Number.isNaN(start.getTime()) &&
    !Number.isNaN(end.getTime()) &&
    end.getTime() > start.getTime()
  );
}

/**
 * Calculates whether a consultation is currently within the active join window.
 * Default policy: from 10 minutes before start until 30 minutes after scheduled end.
 */
export function isWithinJoinWindow(
  scheduledStart: Date,
  scheduledEnd: Date,
  now: Date = new Date()
): boolean {
  const windowStart = new Date(scheduledStart.getTime() - 10 * 60 * 1000);
  const windowEnd = new Date(scheduledEnd.getTime() + 30 * 60 * 1000);
  const nowMs = now.getTime();
  return nowMs >= windowStart.getTime() && nowMs <= windowEnd.getTime();
}

// ==========================================
// PERSISTENCE & QUERY FOUNDATION
// ==========================================

export interface RawConsultationRow extends RowDataPacket {
  id: number;
  public_id: string;
  consultancy_id: number;
  consultancy_public_id: string;
  consultancy_slug: string;
  consultancy_name: string;
  consultancy_timezone: string;
  student_membership_id: number;
  student_membership_public_id: string;
  student_user_id: number;
  student_user_public_id: string;
  student_name: string;
  student_email: string;
  professional_membership_id: number;
  professional_membership_public_id: string;
  professional_user_id: number;
  professional_user_public_id: string;
  professional_name: string;
  professional_email: string;
  professional_type: string;
  title: string;
  scheduled_start_at: Date | string;
  scheduled_end_at: Date | string;
  status: string;
  started_at: Date | string | null;
  ended_at: Date | string | null;
  canceled_at: Date | string | null;
  canceled_by_user_id: number | null;
  cancel_reason: string | null;
  created_by_user_id: number;
  created_at: Date | string;
  updated_at: Date | string;
}

/**
 * Maps a raw database row to a canonical ConsultationDto.
 */
export function mapRowToConsultationDto(
  row: RawConsultationRow,
  timezone: string
): ConsultationDto {
  const startAt = new Date(row.scheduled_start_at);
  const endAt = new Date(row.scheduled_end_at);
  const status = row.status as ConsultationStatus;
  const now = new Date();

  const canJoinNow =
    (status === "SCHEDULED" || status === "IN_PROGRESS") &&
    isWithinJoinWindow(startAt, endAt, now);

  return {
    publicId: row.public_id,
    consultancyPublicId: row.consultancy_public_id,
    consultancySlug: row.consultancy_slug,
    consultancyName: row.consultancy_name,
    professionalType: row.professional_type as ConsultationProfessionalType,
    title: row.title,
    scheduledStartAt: startAt,
    scheduledEndAt: endAt,
    scheduledStartFormatted: formatConsultancyDateTime(timezone, startAt),
    scheduledEndFormatted: formatConsultancyDateTime(timezone, endAt),
    status,
    startedAt: row.started_at ? new Date(row.started_at) : null,
    endedAt: row.ended_at ? new Date(row.ended_at) : null,
    canceledAt: row.canceled_at ? new Date(row.canceled_at) : null,
    cancelReason: row.cancel_reason,
    student: {
      membershipPublicId: row.student_membership_public_id,
      userPublicId: row.student_user_public_id,
      fullName: row.student_name,
      email: row.student_email,
      role: "STUDENT",
    },
    professional: {
      membershipPublicId: row.professional_membership_public_id,
      userPublicId: row.professional_user_public_id,
      fullName: row.professional_name,
      email: row.professional_email,
      role: row.professional_type,
    },
    canJoinNow,
  };
}

/**
 * Validates participant memberships for a new consultation.
 * Ensures:
 * 1. Both memberships exist in the specified consultancy.
 * 2. Student membership has active STUDENT role.
 * 3. Professional membership has active role matching professionalType (PERSONAL or NUTRITIONIST).
 * 4. Student and Professional belong to different physical users.
 */
export async function validateConsultationParticipants(
  connection: PoolConnection,
  consultancyId: number,
  studentMembershipId: number,
  professionalMembershipId: number,
  professionalType: ConsultationProfessionalType
): Promise<{
  valid: boolean;
  error?: string;
  studentUserId?: number;
  professionalUserId?: number;
}> {
  if (studentMembershipId === professionalMembershipId) {
    return {
      valid: false,
      error: "O aluno e o profissional não podem ser o mesmo participante.",
    };
  }

  // Fetch student membership details
  const [studentRows] = await connection.query<RowDataPacket[]>(
    `SELECT cm.id, cm.user_id, cm.consultancy_id, cm.status,
            EXISTS(
              SELECT 1 FROM consultancy_member_roles cmr
              WHERE cmr.member_id = cm.id AND cmr.role = 'STUDENT'
            ) AS is_student
     FROM consultancy_members cm
     WHERE cm.id = ? AND cm.consultancy_id = ?`,
    [studentMembershipId, consultancyId]
  );

  if (!studentRows || studentRows.length === 0) {
    return {
      valid: false,
      error: "Participante Aluno não encontrado nesta consultoria.",
    };
  }

  const student = studentRows[0];
  if (student.status !== "ACTIVE" || !student.is_student) {
    return {
      valid: false,
      error: "O participante selecionado como aluno não possui papel de aluno ativo.",
    };
  }

  // Fetch professional membership details
  const [profRows] = await connection.query<RowDataPacket[]>(
    `SELECT cm.id, cm.user_id, cm.consultancy_id, cm.status,
            EXISTS(
              SELECT 1 FROM consultancy_member_roles cmr
              WHERE cmr.member_id = cm.id AND cmr.role = ?
            ) AS has_role
     FROM consultancy_members cm
     WHERE cm.id = ? AND cm.consultancy_id = ?`,
    [professionalType, professionalMembershipId, consultancyId]
  );

  if (!profRows || profRows.length === 0) {
    return {
      valid: false,
      error: `Participante Profissional não encontrado nesta consultoria.`,
    };
  }

  const prof = profRows[0];
  if (prof.status !== "ACTIVE" || !prof.has_role) {
    return {
      valid: false,
      error: `O profissional selecionado não possui o papel ativo de ${PROFESSIONAL_TYPE_LABELS[professionalType]}.`,
    };
  }

  if (Number(student.user_id) === Number(prof.user_id)) {
    return {
      valid: false,
      error: "O mesmo usuário não pode participar simultaneamente como aluno e profissional da mesma consulta.",
    };
  }

  return {
    valid: true,
    studentUserId: Number(student.user_id),
    professionalUserId: Number(prof.user_id),
  };
}

/**
 * Checks whether scheduling a consultation creates a time overlap/conflict
 * for either the student or the professional in active appointments (SCHEDULED or IN_PROGRESS).
 * Uses semi-open interval comparison [start, end).
 */
export async function checkConsultationOverlap(
  connection: PoolConnection,
  consultancyId: number,
  studentMembershipId: number,
  professionalMembershipId: number,
  startUtc: Date,
  endUtc: Date,
  excludeConsultationId?: number
): Promise<{
  hasConflict: boolean;
  conflictParty?: "STUDENT" | "PROFESSIONAL";
}> {
  // Check student overlap
  const studentExcludeClause = excludeConsultationId ? "AND id != ?" : "";
  const studentParams: (number | Date)[] = [
    consultancyId,
    studentMembershipId,
    endUtc,
    startUtc,
  ];
  if (excludeConsultationId) studentParams.push(excludeConsultationId);

  const [studentOverlap] = await connection.query<RowDataPacket[]>(
    `SELECT id FROM consultations
     WHERE consultancy_id = ?
       AND student_membership_id = ?
       AND status IN ('SCHEDULED', 'IN_PROGRESS')
       AND scheduled_start_at < ?
       AND scheduled_end_at > ?
       ${studentExcludeClause}
     LIMIT 1`,
    studentParams
  );

  if (studentOverlap && studentOverlap.length > 0) {
    return { hasConflict: true, conflictParty: "STUDENT" };
  }

  // Check professional overlap
  const profExcludeClause = excludeConsultationId ? "AND id != ?" : "";
  const profParams: (number | Date)[] = [
    consultancyId,
    professionalMembershipId,
    endUtc,
    startUtc,
  ];
  if (excludeConsultationId) profParams.push(excludeConsultationId);

  const [profOverlap] = await connection.query<RowDataPacket[]>(
    `SELECT id FROM consultations
     WHERE consultancy_id = ?
       AND professional_membership_id = ?
       AND status IN ('SCHEDULED', 'IN_PROGRESS')
       AND scheduled_start_at < ?
       AND scheduled_end_at > ?
       ${profExcludeClause}
     LIMIT 1`,
    profParams
  );

  if (profOverlap && profOverlap.length > 0) {
    return { hasConflict: true, conflictParty: "PROFESSIONAL" };
  }

  return { hasConflict: false };
}

/**
 * Finds a consultation by public ID within a specific consultancy context.
 * Enforces strict multi-tenant isolation.
 */
export async function findConsultationByPublicIdForConsultancy(
  consultancyId: number,
  consultationPublicId: string
): Promise<ConsultationDto | null> {
  const connection = await getDbConnection();
  try {
    const [rows] = await connection.query<RawConsultationRow[]>(
      `SELECT c.*,
              con.public_id AS consultancy_public_id,
              con.slug AS consultancy_slug,
              con.name AS consultancy_name,
              COALESCE(con.timezone, 'America/Sao_Paulo') AS consultancy_timezone,
              sm.public_id AS student_membership_public_id,
              su.id AS student_user_id,
              su.public_id AS student_user_public_id,
              su.full_name AS student_name,
              su.email AS student_email,
              pm.public_id AS professional_membership_public_id,
              pu.id AS professional_user_id,
              pu.public_id AS professional_user_public_id,
              pu.full_name AS professional_name,
              pu.email AS professional_email
       FROM consultations c
       JOIN consultancies con ON con.id = c.consultancy_id
       JOIN consultancy_members sm ON sm.id = c.student_membership_id
       JOIN users su ON su.id = sm.user_id
       JOIN consultancy_members pm ON pm.id = c.professional_membership_id
       JOIN users pu ON pu.id = pm.user_id
       WHERE c.consultancy_id = ? AND c.public_id = ?
       LIMIT 1`,
      [consultancyId, consultationPublicId]
    );

    if (!rows || rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return mapRowToConsultationDto(row, row.consultancy_timezone);
  } finally {
    connection.release();
  }
}

/**
 * Lists upcoming active consultations (SCHEDULED or IN_PROGRESS) for a student membership.
 */
export async function listUpcomingConsultationsForStudent(
  consultancyId: number,
  studentMembershipId: number,
  limit: number = 10
): Promise<ConsultationListItemDto[]> {
  const connection = await getDbConnection();
  try {
    const [rows] = await connection.query<RawConsultationRow[]>(
      `SELECT c.*,
              con.public_id AS consultancy_public_id,
              con.slug AS consultancy_slug,
              con.name AS consultancy_name,
              COALESCE(con.timezone, 'America/Sao_Paulo') AS consultancy_timezone,
              sm.public_id AS student_membership_public_id,
              su.id AS student_user_id,
              su.public_id AS student_user_public_id,
              su.full_name AS student_name,
              su.email AS student_email,
              pm.public_id AS professional_membership_public_id,
              pu.id AS professional_user_id,
              pu.public_id AS professional_user_public_id,
              pu.full_name AS professional_name,
              pu.email AS professional_email
       FROM consultations c
       JOIN consultancies con ON con.id = c.consultancy_id
       JOIN consultancy_members sm ON sm.id = c.student_membership_id
       JOIN users su ON su.id = sm.user_id
       JOIN consultancy_members pm ON pm.id = c.professional_membership_id
       JOIN users pu ON pu.id = pm.user_id
       WHERE c.consultancy_id = ?
         AND c.student_membership_id = ?
         AND c.status IN ('SCHEDULED', 'IN_PROGRESS')
       ORDER BY c.scheduled_start_at ASC
       LIMIT ?`,
      [consultancyId, studentMembershipId, limit]
    );

    const now = new Date();
    return (rows || []).map((row: RawConsultationRow) => {
      const startAt = new Date(row.scheduled_start_at);
      const endAt = new Date(row.scheduled_end_at);
      const status = row.status as ConsultationStatus;
      const canJoinNow =
        (status === "SCHEDULED" || status === "IN_PROGRESS") &&
        isWithinJoinWindow(startAt, endAt, now);

      return {
        publicId: row.public_id,
        professionalType: row.professional_type as ConsultationProfessionalType,
        title: row.title,
        scheduledStartAt: startAt,
        scheduledEndAt: endAt,
        scheduledStartFormatted: formatConsultancyDateTime(
          row.consultancy_timezone,
          startAt
        ),
        scheduledEndFormatted: formatConsultancyDateTime(
          row.consultancy_timezone,
          endAt
        ),
        status,
        counterpartName: row.professional_name,
        counterpartRole:
          PROFESSIONAL_TYPE_LABELS[
            row.professional_type as ConsultationProfessionalType
          ] || row.professional_type,
        canJoinNow,
      };
    });
  } finally {
    connection.release();
  }
}

/**
 * Lists upcoming active consultations (SCHEDULED or IN_PROGRESS) for a professional membership.
 */
export async function listUpcomingConsultationsForProfessional(
  consultancyId: number,
  professionalMembershipId: number,
  limit: number = 10
): Promise<ConsultationListItemDto[]> {
  const connection = await getDbConnection();
  try {
    const [rows] = await connection.query<RawConsultationRow[]>(
      `SELECT c.*,
              con.public_id AS consultancy_public_id,
              con.slug AS consultancy_slug,
              con.name AS consultancy_name,
              COALESCE(con.timezone, 'America/Sao_Paulo') AS consultancy_timezone,
              sm.public_id AS student_membership_public_id,
              su.id AS student_user_id,
              su.public_id AS student_user_public_id,
              su.full_name AS student_name,
              su.email AS student_email,
              pm.public_id AS professional_membership_public_id,
              pu.id AS professional_user_id,
              pu.public_id AS professional_user_public_id,
              pu.full_name AS professional_name,
              pu.email AS professional_email
       FROM consultations c
       JOIN consultancies con ON con.id = c.consultancy_id
       JOIN consultancy_members sm ON sm.id = c.student_membership_id
       JOIN users su ON su.id = sm.user_id
       JOIN consultancy_members pm ON pm.id = c.professional_membership_id
       JOIN users pu ON pu.id = pm.user_id
       WHERE c.consultancy_id = ?
         AND c.professional_membership_id = ?
         AND c.status IN ('SCHEDULED', 'IN_PROGRESS')
       ORDER BY c.scheduled_start_at ASC
       LIMIT ?`,
      [consultancyId, professionalMembershipId, limit]
    );

    const now = new Date();
    return (rows || []).map((row: RawConsultationRow) => {
      const startAt = new Date(row.scheduled_start_at);
      const endAt = new Date(row.scheduled_end_at);
      const status = row.status as ConsultationStatus;
      const canJoinNow =
        (status === "SCHEDULED" || status === "IN_PROGRESS") &&
        isWithinJoinWindow(startAt, endAt, now);

      return {
        publicId: row.public_id,
        professionalType: row.professional_type as ConsultationProfessionalType,
        title: row.title,
        scheduledStartAt: startAt,
        scheduledEndAt: endAt,
        scheduledStartFormatted: formatConsultancyDateTime(
          row.consultancy_timezone,
          startAt
        ),
        scheduledEndFormatted: formatConsultancyDateTime(
          row.consultancy_timezone,
          endAt
        ),
        status,
        counterpartName: row.student_name,
        counterpartRole: "Aluno",
        canJoinNow,
      };
    });
  } finally {
    connection.release();
  }
}

/**
 * Inserts a new consultation record inside a transaction.
 */
export async function insertConsultation(
  connection: PoolConnection,
  params: {
    consultancyId: number;
    studentMembershipId: number;
    professionalMembershipId: number;
    professionalType: ConsultationProfessionalType;
    title: string;
    scheduledStartAt: Date;
    scheduledEndAt: Date;
    createdByUserId: number;
  }
): Promise<{ id: number; publicId: string }> {
  const publicId = crypto.randomUUID();

  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO consultations (
       public_id,
       consultancy_id,
       student_membership_id,
       professional_membership_id,
       professional_type,
       title,
       scheduled_start_at,
       scheduled_end_at,
       status,
       created_by_user_id
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SCHEDULED', ?)`,
    [
      publicId,
      params.consultancyId,
      params.studentMembershipId,
      params.professionalMembershipId,
      params.professionalType,
      params.title.trim(),
      params.scheduledStartAt,
      params.scheduledEndAt,
      params.createdByUserId,
    ]
  );

  return { id: result.insertId, publicId };
}
