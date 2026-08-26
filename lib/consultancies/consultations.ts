import crypto from "node:crypto";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";
import { formatConsultancyDateTime } from "./timezone";
import { resolveConsultancyContext } from "./context";
import { resolveStudentModuleAccess } from "./student-module-access";
import type { StudentFinancialBlockingCharge } from "./finance";

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
 * Lists past / finalized consultation history (COMPLETED, CANCELED, or ended SCHEDULED) for a student membership.
 */
export async function listConsultationHistoryForStudent(
  consultancyId: number,
  studentMembershipId: number,
  limit: number = 20
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
         AND (
           c.status IN ('COMPLETED', 'CANCELED')
           OR (c.status = 'SCHEDULED' AND c.scheduled_end_at < NOW())
         )
       ORDER BY c.scheduled_start_at DESC
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
 * Lists past / finalized consultation history (COMPLETED, CANCELED, or ended SCHEDULED) for a professional membership.
 */
export async function listConsultationHistoryForProfessional(
  consultancyId: number,
  professionalMembershipId: number,
  limit: number = 20
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
         AND (
           c.status IN ('COMPLETED', 'CANCELED')
           OR (c.status = 'SCHEDULED' AND c.scheduled_end_at < NOW())
         )
       ORDER BY c.scheduled_start_at DESC
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

export interface ActiveStudentOptionDto {
  membershipPublicId: string;
  userPublicId: string;
  fullName: string;
}

/**
 * Lists active students in the consultancy available for consultation scheduling.
 * Privacy-focused: only exposes public identifiers and name.
 */
export async function listActiveStudentsForConsultationScheduling(
  consultancyId: number
): Promise<ActiveStudentOptionDto[]> {
  const connection = await getDbConnection();
  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT cm.public_id AS membership_public_id,
              u.public_id AS user_public_id,
              u.full_name
       FROM consultancy_members cm
       JOIN users u ON u.id = cm.user_id
       JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.consultancy_id = ?
         AND cm.status = 'ACTIVE'
         AND u.status = 'ACTIVE'
         AND cmr.role = 'STUDENT'
       GROUP BY cm.id, cm.public_id, u.public_id, u.full_name
       ORDER BY u.full_name ASC`,
      [consultancyId]
    );

    return (rows || []).map((row: RowDataPacket) => ({
      membershipPublicId: String(row.membership_public_id),
      userPublicId: String(row.user_public_id),
      fullName: String(row.full_name),
    }));
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

// ==========================================
// SCHEDULING MUTATION API
// ==========================================

export type ScheduleConsultationInput = {
  actorUserId: number;
  consultancySlug: string;
  studentMembershipPublicId: string;
  professionalMembershipPublicId?: string;
  professionalType: ConsultationProfessionalType;
  title?: string;
  scheduledStartAt: Date;
  scheduledEndAt: Date;
};

export type ScheduleConsultationResult =
  | { success: true; consultation: ConsultationDto }
  | { success: false; error: string; code?: string };

/**
 * Creates a new consultation with strict actor authorization, participant validation,
 * deterministic row locks, and overlap prevention.
 */
export async function scheduleConsultation(
  input: ScheduleConsultationInput
): Promise<ScheduleConsultationResult> {
  const {
    actorUserId,
    consultancySlug,
    studentMembershipPublicId,
    professionalMembershipPublicId,
    professionalType,
    title,
    scheduledStartAt,
    scheduledEndAt,
  } = input;

  if (!actorUserId || actorUserId <= 0) {
    return {
      success: false,
      error: "Usuário não autenticado.",
      code: "CONSULTATION_UNAUTHENTICATED",
    };
  }

  if (!VALID_PROFESSIONAL_TYPES.includes(professionalType)) {
    return {
      success: false,
      error: "Tipo de profissional inválido.",
      code: "CONSULTATION_INVALID_ROLE",
    };
  }

  const now = new Date();
  if (!(scheduledStartAt instanceof Date) || isNaN(scheduledStartAt.getTime()) || scheduledStartAt.getTime() <= now.getTime()) {
    return {
      success: false,
      error: "O horário de início deve ser em um momento futuro.",
      code: "CONSULTATION_PAST_DATE",
    };
  }

  if (!isValidConsultationTimeRange(scheduledStartAt, scheduledEndAt)) {
    return {
      success: false,
      error: "O horário de término deve ser posterior ao horário de início.",
      code: "CONSULTATION_INVALID_TIME_RANGE",
    };
  }

  // Resolve consultancy tenancy context for actor
  const context = await resolveConsultancyContext(actorUserId, consultancySlug);
  if (!context) {
    return {
      success: false,
      error: "Contexto de consultoria inválido ou acesso não autorizado.",
      code: "CONSULTATION_FORBIDDEN",
    };
  }

  if (context.platformAccess && !context.platformAccess.isOperationalAllowed) {
    return {
      success: false,
      error: "A consultoria está com acesso suspenso pela plataforma.",
      code: "PLATFORM_SUSPENDED",
    };
  }

  const isAdmin = context.roles.includes("CONSULTANCY_ADMIN");
  const isPersonal = context.roles.includes("PERSONAL");
  const isNutritionist = context.roles.includes("NUTRITIONIST");

  let effectiveProfMembershipPublicId: string;

  if (isAdmin) {
    if (!professionalMembershipPublicId) {
      return {
        success: false,
        error: "Selecione o profissional para a consulta.",
        code: "CONSULTATION_MISSING_PROFESSIONAL",
      };
    }
    effectiveProfMembershipPublicId = professionalMembershipPublicId;
  } else if (professionalType === "PERSONAL" && isPersonal) {
    // Professional can only schedule for themselves
    effectiveProfMembershipPublicId = context.membershipPublicId;
  } else if (professionalType === "NUTRITIONIST" && isNutritionist) {
    // Nutritionist can only schedule for themselves
    effectiveProfMembershipPublicId = context.membershipPublicId;
  } else {
    return {
      success: false,
      error: "Você não tem permissão para agendar consultas nesta consultoria.",
      code: "CONSULTATION_FORBIDDEN",
    };
  }

  const normalizedTitle =
    title && title.trim().length > 0
      ? title.trim().slice(0, 200)
      : professionalType === "PERSONAL"
      ? "Consulta com Personal Trainer"
      : "Consulta com Nutricionista";

  let connection: PoolConnection | null = null;

  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 1. Resolve student membership in this consultancy
    const [studentRows] = await connection.query<RowDataPacket[]>(
      `SELECT id FROM consultancy_members WHERE consultancy_id = ? AND public_id = ?`,
      [context.consultancyId, studentMembershipPublicId]
    );

    if (!studentRows || studentRows.length === 0) {
      await connection.rollback();
      return {
        success: false,
        error: "Aluno não encontrado nesta consultoria.",
        code: "CONSULTATION_STUDENT_NOT_FOUND",
      };
    }

    const studentMembershipId = Number(studentRows[0].id);

    // 2. Resolve professional membership in this consultancy
    const [profRows] = await connection.query<RowDataPacket[]>(
      `SELECT id FROM consultancy_members WHERE consultancy_id = ? AND public_id = ?`,
      [context.consultancyId, effectiveProfMembershipPublicId]
    );

    if (!profRows || profRows.length === 0) {
      await connection.rollback();
      return {
        success: false,
        error: "Profissional não encontrado nesta consultoria.",
        code: "CONSULTATION_PROFESSIONAL_NOT_FOUND",
      };
    }

    const professionalMembershipId = Number(profRows[0].id);

    // 3. Validate participant roles and active status
    const validation = await validateConsultationParticipants(
      connection,
      context.consultancyId,
      studentMembershipId,
      professionalMembershipId,
      professionalType
    );

    if (!validation.valid) {
      await connection.rollback();
      return {
        success: false,
        error: validation.error || "Participantes inválidos para o agendamento.",
        code: "CONSULTATION_INVALID_PARTICIPANTS",
      };
    }

    // 4. Deterministic participant row locks to serialize concurrent bookings
    const lockIds = [studentMembershipId, professionalMembershipId].sort((a, b) => a - b);
    await connection.query(
      `SELECT id FROM consultancy_members WHERE id IN (?, ?) ORDER BY id ASC FOR UPDATE`,
      lockIds
    );

    // 5. Check overlap on both student and professional
    const overlap = await checkConsultationOverlap(
      connection,
      context.consultancyId,
      studentMembershipId,
      professionalMembershipId,
      scheduledStartAt,
      scheduledEndAt
    );

    if (overlap.hasConflict) {
      await connection.rollback();
      const conflictMsg =
        overlap.conflictParty === "STUDENT"
          ? "O aluno já possui outro agendamento neste mesmo horário."
          : "O profissional já possui outro agendamento neste mesmo horário.";
      return {
        success: false,
        error: conflictMsg,
        code: "CONSULTATION_TIME_CONFLICT",
      };
    }

    // 6. Insert new consultation
    const { publicId } = await insertConsultation(connection, {
      consultancyId: context.consultancyId,
      studentMembershipId,
      professionalMembershipId,
      professionalType,
      title: normalizedTitle,
      scheduledStartAt,
      scheduledEndAt,
      createdByUserId: actorUserId,
    });

    await connection.commit();

    // 7. Return complete DTO
    const created = await findConsultationByPublicIdForConsultancy(
      context.consultancyId,
      publicId
    );

    if (!created) {
      return {
        success: false,
        error: "Falha ao recuperar a consulta recém-criada.",
        code: "CONSULTATION_ERROR",
      };
    }

    return {
      success: true,
      consultation: created,
    };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    console.error("[scheduleConsultation] Error:", err);
    return {
      success: false,
      error: "Ocorreu um erro interno ao agendar a consulta.",
      code: "CONSULTATION_INTERNAL_ERROR",
    };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// ==========================================
// RESCHEDULING MUTATION API
// ==========================================

export type RescheduleConsultationInput = {
  actorUserId: number;
  consultancySlug: string;
  consultationPublicId: string;
  scheduledStartAt: Date;
  scheduledEndAt: Date;
};

export type RescheduleConsultationResult =
  | { success: true; consultation: ConsultationDto }
  | { success: false; error: string; code?: string };

/**
 * Reschedules an existing consultation.
 * Only the designated professional or a consultancy admin can reschedule.
 * Only consultations in SCHEDULED status can be rescheduled.
 */
export async function rescheduleConsultation(
  input: RescheduleConsultationInput
): Promise<RescheduleConsultationResult> {
  const {
    actorUserId,
    consultancySlug,
    consultationPublicId,
    scheduledStartAt,
    scheduledEndAt,
  } = input;

  if (!actorUserId || actorUserId <= 0) {
    return {
      success: false,
      error: "Usuário não autenticado.",
      code: "CONSULTATION_UNAUTHENTICATED",
    };
  }

  const now = new Date();
  if (!(scheduledStartAt instanceof Date) || isNaN(scheduledStartAt.getTime()) || scheduledStartAt.getTime() <= now.getTime()) {
    return {
      success: false,
      error: "O novo horário de início deve ser em um momento futuro.",
      code: "CONSULTATION_PAST_DATE",
    };
  }

  if (!isValidConsultationTimeRange(scheduledStartAt, scheduledEndAt)) {
    return {
      success: false,
      error: "O novo horário de término deve ser posterior ao horário de início.",
      code: "CONSULTATION_INVALID_TIME_RANGE",
    };
  }

  const context = await resolveConsultancyContext(actorUserId, consultancySlug);
  if (!context) {
    return {
      success: false,
      error: "Contexto de consultoria inválido ou acesso não autorizado.",
      code: "CONSULTATION_FORBIDDEN",
    };
  }

  if (context.platformAccess && !context.platformAccess.isOperationalAllowed) {
    return {
      success: false,
      error: "A consultoria está com acesso suspenso pela plataforma.",
      code: "PLATFORM_SUSPENDED",
    };
  }

  const isAdmin = context.roles.includes("CONSULTANCY_ADMIN");

  let connection: PoolConnection | null = null;

  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 1. Fetch consultation for update (tenant-scoped)
    const [rows] = await connection.query<RawConsultationRow[]>(
      `SELECT c.*,
              pm.user_id AS professional_user_id
       FROM consultations c
       JOIN consultancy_members pm ON pm.id = c.professional_membership_id
       WHERE c.consultancy_id = ? AND c.public_id = ?
       FOR UPDATE`,
      [context.consultancyId, consultationPublicId]
    );

    if (!rows || rows.length === 0) {
      await connection.rollback();
      return {
        success: false,
        error: "Consulta não encontrada.",
        code: "CONSULTATION_NOT_FOUND",
      };
    }

    const consultation = rows[0];

    // 2. Validate status: only SCHEDULED can be rescheduled
    if (consultation.status !== "SCHEDULED") {
      await connection.rollback();
      return {
        success: false,
        error: "Apenas consultas com status 'Agendada' podem ser remarcadas.",
        code: "CONSULTATION_NOT_SCHEDULED",
      };
    }

    // 3. Validate actor: designated professional or admin only (student is blocked)
    const isDesignatedProfessional = Number(consultation.professional_user_id) === actorUserId;
    if (!isDesignatedProfessional && !isAdmin) {
      await connection.rollback();
      return {
        success: false,
        error: "Você não tem permissão para remarcar esta consulta.",
        code: "CONSULTATION_FORBIDDEN",
      };
    }

    // 4. Deterministic participant row locks
    const lockIds = [
      Number(consultation.student_membership_id),
      Number(consultation.professional_membership_id),
    ].sort((a, b) => a - b);

    await connection.query(
      `SELECT id FROM consultancy_members WHERE id IN (?, ?) ORDER BY id ASC FOR UPDATE`,
      lockIds
    );

    // 5. Check overlap excluding this consultation
    const overlap = await checkConsultationOverlap(
      connection,
      context.consultancyId,
      Number(consultation.student_membership_id),
      Number(consultation.professional_membership_id),
      scheduledStartAt,
      scheduledEndAt,
      Number(consultation.id)
    );

    if (overlap.hasConflict) {
      await connection.rollback();
      const conflictMsg =
        overlap.conflictParty === "STUDENT"
          ? "O aluno já possui outro agendamento neste mesmo horário."
          : "O profissional já possui outro agendamento neste mesmo horário.";
      return {
        success: false,
        error: conflictMsg,
        code: "CONSULTATION_TIME_CONFLICT",
      };
    }

    // 6. Update scheduled times
    await connection.query(
      `UPDATE consultations
       SET scheduled_start_at = ?,
           scheduled_end_at = ?
       WHERE id = ?`,
      [scheduledStartAt, scheduledEndAt, consultation.id]
    );

    await connection.commit();

    const updated = await findConsultationByPublicIdForConsultancy(
      context.consultancyId,
      consultationPublicId
    );

    if (!updated) {
      return {
        success: false,
        error: "Falha ao recuperar a consulta atualizada.",
        code: "CONSULTATION_ERROR",
      };
    }

    return {
      success: true,
      consultation: updated,
    };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    console.error("[rescheduleConsultation] Error:", err);
    return {
      success: false,
      error: "Ocorreu um erro interno ao remarcar a consulta.",
      code: "CONSULTATION_INTERNAL_ERROR",
    };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// ==========================================
// CANCELLATION MUTATION API
// ==========================================

export type CancelConsultationInput = {
  actorUserId: number;
  consultancySlug: string;
  consultationPublicId: string;
  cancelReason?: string | null;
};

export type CancelConsultationResult =
  | { success: true; consultation: ConsultationDto }
  | { success: false; error: string; code?: string };

/**
 * Cancels a consultation.
 * - Student participant: can cancel own SCHEDULED consultation (does NOT require billing clearance).
 * - Designated professional: can cancel own SCHEDULED or IN_PROGRESS consultation.
 * - Consultancy Admin: can cancel SCHEDULED consultation.
 */
export async function cancelConsultation(
  input: CancelConsultationInput
): Promise<CancelConsultationResult> {
  const {
    actorUserId,
    consultancySlug,
    consultationPublicId,
    cancelReason,
  } = input;

  if (!actorUserId || actorUserId <= 0) {
    return {
      success: false,
      error: "Usuário não autenticado.",
      code: "CONSULTATION_UNAUTHENTICATED",
    };
  }

  const context = await resolveConsultancyContext(actorUserId, consultancySlug);
  if (!context) {
    return {
      success: false,
      error: "Contexto de consultoria inválido ou acesso não autorizado.",
      code: "CONSULTATION_FORBIDDEN",
    };
  }

  if (context.platformAccess && !context.platformAccess.isOperationalAllowed) {
    return {
      success: false,
      error: "A consultoria está com acesso suspenso pela plataforma.",
      code: "PLATFORM_SUSPENDED",
    };
  }

  const isAdmin = context.roles.includes("CONSULTANCY_ADMIN");

  let connection: PoolConnection | null = null;

  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 1. Fetch consultation for update
    const [rows] = await connection.query<RawConsultationRow[]>(
      `SELECT c.*,
              sm.user_id AS student_user_id,
              pm.user_id AS professional_user_id
       FROM consultations c
       JOIN consultancy_members sm ON sm.id = c.student_membership_id
       JOIN consultancy_members pm ON pm.id = c.professional_membership_id
       WHERE c.consultancy_id = ? AND c.public_id = ?
       FOR UPDATE`,
      [context.consultancyId, consultationPublicId]
    );

    if (!rows || rows.length === 0) {
      await connection.rollback();
      return {
        success: false,
        error: "Consulta não encontrada.",
        code: "CONSULTATION_NOT_FOUND",
      };
    }

    const consultation = rows[0];

    // 2. Validate final states
    if (consultation.status === "COMPLETED") {
      await connection.rollback();
      return {
        success: false,
        error: "Consultas concluídas não podem ser canceladas.",
        code: "CONSULTATION_FINALIZED",
      };
    }

    if (consultation.status === "CANCELED") {
      await connection.rollback();
      return {
        success: false,
        error: "Esta consulta já foi cancelada anteriormente.",
        code: "CONSULTATION_ALREADY_CANCELED",
      };
    }

    const isStudentParticipant = Number(consultation.student_user_id) === actorUserId;
    const isProfParticipant = Number(consultation.professional_user_id) === actorUserId;

    // 3. Authorize actor
    if (isStudentParticipant) {
      // Student can only cancel SCHEDULED consultations (cannot cancel IN_PROGRESS)
      if (consultation.status !== "SCHEDULED") {
        await connection.rollback();
        return {
          success: false,
          error: "Alunos não podem cancelar consultas em andamento.",
          code: "CONSULTATION_FORBIDDEN",
        };
      }
    } else if (isProfParticipant) {
      // Professional can cancel SCHEDULED or IN_PROGRESS
      if (consultation.status !== "SCHEDULED" && consultation.status !== "IN_PROGRESS") {
        await connection.rollback();
        return {
          success: false,
          error: "Esta consulta não pode ser cancelada neste estado.",
          code: "CONSULTATION_FORBIDDEN",
        };
      }
    } else if (isAdmin) {
      // Admin can cancel SCHEDULED consultations in V1
      if (consultation.status !== "SCHEDULED") {
        await connection.rollback();
        return {
          success: false,
          error: "Administradores não podem cancelar consultas em andamento.",
          code: "CONSULTATION_FORBIDDEN",
        };
      }
    } else {
      await connection.rollback();
      return {
        success: false,
        error: "Você não tem permissão para cancelar esta consulta.",
        code: "CONSULTATION_FORBIDDEN",
      };
    }

    const normalizedReason =
      cancelReason && typeof cancelReason === "string" && cancelReason.trim().length > 0
        ? cancelReason.trim().slice(0, 500)
        : null;

    // 4. Update status to CANCELED
    await connection.query(
      `UPDATE consultations
       SET status = 'CANCELED',
           canceled_at = CURRENT_TIMESTAMP(3),
           canceled_by_user_id = ?,
           cancel_reason = ?
       WHERE id = ?`,
      [actorUserId, normalizedReason, consultation.id]
    );

    await connection.commit();

    const updated = await findConsultationByPublicIdForConsultancy(
      context.consultancyId,
      consultationPublicId
    );

    if (!updated) {
      return {
        success: false,
        error: "Falha ao recuperar a consulta cancelada.",
        code: "CONSULTATION_ERROR",
      };
    }

    return {
      success: true,
      consultation: updated,
    };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    console.error("[cancelConsultation] Error:", err);
    return {
      success: false,
      error: "Ocorreu um erro interno ao cancelar a consulta.",
      code: "CONSULTATION_INTERNAL_ERROR",
    };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// ==========================================
// JOIN ACCESS FOUNDATION
// ==========================================

export type ConsultationJoinAccessResult =
  | {
      allowed: true;
      participantKind: "STUDENT" | "PROFESSIONAL";
      consultation: ConsultationDto;
    }
  | {
      allowed: false;
      reason:
        | "UNAUTHENTICATED"
        | "INVALID_CONTEXT"
        | "PLATFORM_SUSPENDED"
        | "CONSULTATION_NOT_FOUND"
        | "CONSULTATION_FORBIDDEN"
        | "STUDENT_BILLING_BLOCKED"
        | "CONSULTATION_CANCELED"
        | "CONSULTATION_COMPLETED"
        | "TOO_EARLY"
        | "JOIN_WINDOW_CLOSED";
      consultation?: ConsultationDto;
      blockingCharge?: StudentFinancialBlockingCharge;
      earliestJoinAt?: Date;
      latestJoinAt?: Date;
    };

/**
 * Evaluates whether an authenticated user is currently eligible to join the consultation room.
 * Enforces participant validation, student billing obligations, consultation state, and operational time window.
 * Does NOT generate tokens, WebRTC/signaling data, or mutate call state.
 */
export async function resolveConsultationJoinAccess(
  actorUserId: number,
  consultancySlug: string,
  consultationPublicId: string,
  now: Date = new Date()
): Promise<ConsultationJoinAccessResult> {
  if (!actorUserId || actorUserId <= 0) {
    return { allowed: false, reason: "UNAUTHENTICATED" };
  }

  if (!consultancySlug || !consultationPublicId) {
    return { allowed: false, reason: "INVALID_CONTEXT" };
  }

  const context = await resolveConsultancyContext(actorUserId, consultancySlug);
  if (!context) {
    return { allowed: false, reason: "INVALID_CONTEXT" };
  }

  if (context.platformAccess && !context.platformAccess.isOperationalAllowed) {
    return { allowed: false, reason: "PLATFORM_SUSPENDED" };
  }

  const connection = await getDbConnection();
  let row: RawConsultationRow | null = null;

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
      [context.consultancyId, consultationPublicId]
    );

    if (rows && rows.length > 0) {
      row = rows[0];
    }
  } finally {
    connection.release();
  }

  if (!row) {
    return { allowed: false, reason: "CONSULTATION_NOT_FOUND" };
  }

  const consultation = mapRowToConsultationDto(row, row.consultancy_timezone);

  const isStudent = Number(row.student_user_id) === actorUserId;
  const isProfessional = Number(row.professional_user_id) === actorUserId;

  if (!isStudent && !isProfessional) {
    // Only exact participants can join. Consultancy admins and other users are denied media join.
    return { allowed: false, reason: "CONSULTATION_FORBIDDEN", consultation };
  }

  const participantKind: "STUDENT" | "PROFESSIONAL" = isStudent ? "STUDENT" : "PROFESSIONAL";

  // For Student participant: check student billing authority
  if (isStudent) {
    const studentAccess = await resolveStudentModuleAccess(actorUserId, consultancySlug);
    if (!studentAccess.allowed) {
      return {
        allowed: false,
        reason: "STUDENT_BILLING_BLOCKED",
        consultation,
        blockingCharge: studentAccess.blockingCharge,
      };
    }
  }

  // Check state machine
  if (consultation.status === "CANCELED") {
    return { allowed: false, reason: "CONSULTATION_CANCELED", consultation };
  }

  if (consultation.status === "COMPLETED") {
    return { allowed: false, reason: "CONSULTATION_COMPLETED", consultation };
  }

  // Check operational time window
  // Earliest join: 10 minutes before scheduled start
  // Latest join: 30 minutes after scheduled end
  const earliestJoinAt = new Date(consultation.scheduledStartAt.getTime() - 10 * 60 * 1000);
  const latestJoinAt = new Date(consultation.scheduledEndAt.getTime() + 30 * 60 * 1000);
  const nowMs = now.getTime();

  if (consultation.status === "SCHEDULED") {
    if (nowMs < earliestJoinAt.getTime()) {
      return {
        allowed: false,
        reason: "TOO_EARLY",
        consultation,
        earliestJoinAt,
        latestJoinAt,
      };
    }
    if (nowMs > latestJoinAt.getTime()) {
      return {
        allowed: false,
        reason: "JOIN_WINDOW_CLOSED",
        consultation,
        earliestJoinAt,
        latestJoinAt,
      };
    }
  } else if (consultation.status === "IN_PROGRESS") {
    if (nowMs > latestJoinAt.getTime()) {
      return {
        allowed: false,
        reason: "JOIN_WINDOW_CLOSED",
        consultation,
        earliestJoinAt,
        latestJoinAt,
      };
    }
  }

  return {
    allowed: true,
    participantKind,
    consultation,
  };
}

