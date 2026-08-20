import { randomUUID } from "node:crypto";
import type { PoolConnection, RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { getDbConnection } from "@/lib/db/mysql";
import { resolveConsultancyContext } from "./context";
import { resolveStudentModuleAccess } from "./student-module-access";

// --- Domain Types & DTOs ---

export interface StudentProgressEntryDto {
  publicId: string;
  recordedOn: string; // YYYY-MM-DD
  weightKg: number | null;
  waistCm: number | null;
  abdomenCm: number | null;
  hipCm: number | null;
  armCm: number | null;
  thighCm: number | null;
  note: string | null;
  createdAt: string; // ISO String
  createdByName?: string;
}

export interface ProgressTargetStudentDto {
  publicId: string;
  fullName: string;
  email: string;
}

export const PROGRESS_HISTORY_PAGE_SIZE = 20;

export interface ProgressPaginationDto {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface StudentProgressHistoryDto {
  student: ProgressTargetStudentDto;
  entries: StudentProgressEntryDto[];
  totalCount: number;
  pagination: ProgressPaginationDto;
  latestEntry: StudentProgressEntryDto | null;
}

export interface CreateProgressEntryInput {
  recordedOn: string;
  weightKg?: string | number | null;
  waistCm?: string | number | null;
  abdomenCm?: string | number | null;
  hipCm?: string | number | null;
  armCm?: string | number | null;
  thighCm?: string | number | null;
  note?: string | null;
}

export interface ParsedProgressMetrics {
  recordedOn: string;
  weightKg: number | null;
  waistCm: number | null;
  abdomenCm: number | null;
  hipCm: number | null;
  armCm: number | null;
  thighCm: number | null;
  note: string | null;
}

// --- Validation Helpers ---

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function parseAndValidateDate(value: unknown): string {
  if (typeof value !== "string" || !ISO_DATE_REGEX.test(value.trim())) {
    throw new Error("Data inválida. Use o formato AAAA-MM-DD.");
  }
  const trimmed = value.trim();
  const [yearStr, monthStr, dayStr] = trimmed.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error("Data fora do intervalo válido.");
  }

  // Check valid date for specific month/day (e.g., Feb 30)
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    throw new Error("Data do calendário inválida.");
  }

  return trimmed;
}

export function parseAndValidateDecimal(value: unknown, fieldName: string): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const str = String(value).trim();
  if (str === "") {
    return null;
  }

  // Reject scientific notation
  if (str.toLowerCase().includes("e")) {
    throw new Error(`Valor de ${fieldName} inválido (notação científica não permitida).`);
  }

  // Normalize Brazilian comma to dot
  const normalized = str.replace(",", ".");

  // Strict format check: digits with at most 2 decimal places
  const decimalRegex = /^\d+(\.\d{1,2})?$/;
  if (!decimalRegex.test(normalized)) {
    throw new Error(`Valor de ${fieldName} deve ser um número positivo com no máximo 2 casas decimais.`);
  }

  const num = Number(normalized);
  if (isNaN(num) || !isFinite(num) || num <= 0) {
    throw new Error(`Valor de ${fieldName} deve ser maior que zero.`);
  }

  // Max fits in DECIMAL(6,2) -> max 9999.99
  if (num > 9999.99) {
    throw new Error(`Valor de ${fieldName} excede o limite máximo permitido.`);
  }

  return Math.round(num * 100) / 100;
}

export function parseAndValidateNote(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const str = String(value).trim();
  if (str === "") {
    return null;
  }
  if (str.length > 500) {
    throw new Error("A observação deve ter no máximo 500 caracteres.");
  }
  return str;
}

export function validateProgressMetricsInput(input: CreateProgressEntryInput): ParsedProgressMetrics {
  const recordedOn = parseAndValidateDate(input.recordedOn);
  const weightKg = parseAndValidateDecimal(input.weightKg, "Peso");
  const waistCm = parseAndValidateDecimal(input.waistCm, "Cintura");
  const abdomenCm = parseAndValidateDecimal(input.abdomenCm, "Abdômen");
  const hipCm = parseAndValidateDecimal(input.hipCm, "Quadril");
  const armCm = parseAndValidateDecimal(input.armCm, "Braço");
  const thighCm = parseAndValidateDecimal(input.thighCm, "Coxa");
  const note = parseAndValidateNote(input.note);

  // Must have at least ONE numeric measurement
  const hasAtLeastOneMetric =
    weightKg !== null ||
    waistCm !== null ||
    abdomenCm !== null ||
    hipCm !== null ||
    armCm !== null ||
    thighCm !== null;

  if (!hasAtLeastOneMetric) {
    throw new Error("Informe pelo menos uma medida corporal para registrar a evolução.");
  }

  return {
    recordedOn,
    weightKg,
    waistCm,
    abdomenCm,
    hipCm,
    armCm,
    thighCm,
    note,
  };
}

// --- Domain Services ---

/**
 * Creates a progress entry for the authenticated Student (self-recorded).
 */
export async function createStudentOwnProgressEntry(params: {
  userId: number;
  consultancySlug: string;
  input: CreateProgressEntryInput;
}): Promise<{ publicId: string }> {
  const { userId, consultancySlug, input } = params;

  const access = await resolveStudentModuleAccess(userId, consultancySlug);
  if (!access.allowed || !access.context) {
    throw new Error("Acesso não autorizado para registrar progresso.");
  }

  const validated = validateProgressMetricsInput(input);
  const entryPublicId = randomUUID();
  const auditPublicId = randomUUID();

  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // Verify own student membership
    const [members] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id
       FROM consultancy_members cm
       JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.user_id = ?
         AND cm.consultancy_id = ?
         AND cm.status = 'ACTIVE'
         AND cmr.role IN ('STUDENT', 'INFLUENCER')
       LIMIT 1;`,
      [userId, access.context.consultancyId]
    );

    if (!members || members.length === 0) {
      throw new Error("Membro de aluno não encontrado ou inativo nesta consultoria.");
    }

    const studentMembershipId = Number(members[0].id);

    // Insert progress entry
    await connection.execute<ResultSetHeader>(
      `INSERT INTO student_progress_entries (
        public_id,
        consultancy_id,
        student_membership_id,
        recorded_on,
        weight_kg,
        waist_cm,
        abdomen_cm,
        hip_cm,
        arm_cm,
        thigh_cm,
        note,
        created_by_user_id,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3));`,
      [
        entryPublicId,
        access.context.consultancyId,
        studentMembershipId,
        validated.recordedOn,
        validated.weightKg,
        validated.waistCm,
        validated.abdomenCm,
        validated.hipCm,
        validated.armCm,
        validated.thighCm,
        validated.note,
        userId,
      ]
    );

    // Insert audit event (without sensitive health metrics values)
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
      ) VALUES (?, ?, ?, 'STUDENT_PROGRESS_ENTRY_CREATED', 'STUDENT_PROGRESS_ENTRY', ?, ?, NOW(3));`,
      [
        auditPublicId,
        userId,
        access.context.consultancyId,
        entryPublicId,
        JSON.stringify({
          recordedOn: validated.recordedOn,
          selfRecorded: true,
        }),
      ]
    );

    await connection.commit();
    return { publicId: entryPublicId };
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Creates a progress entry for a target Student recorded by a Personal Trainer.
 */
export async function createProfessionalProgressEntry(params: {
  userId: number;
  consultancySlug: string;
  studentPublicId: string;
  input: CreateProgressEntryInput;
}): Promise<{ publicId: string }> {
  const { userId, consultancySlug, studentPublicId, input } = params;

  if (!studentPublicId || typeof studentPublicId !== "string" || !studentPublicId.trim()) {
    throw new Error("Identificador do aluno é obrigatório.");
  }

  const context = await resolveConsultancyContext(userId, consultancySlug);
  if (!context) {
    throw new Error("Contexto de consultoria inválido.");
  }

  // Only PERSONAL is allowed to create progress entries for students
  if (!context.roles.includes("PERSONAL")) {
    throw new Error("Apenas o Personal Trainer pode registrar evolução para alunos.");
  }

  const validated = validateProgressMetricsInput(input);
  const entryPublicId = randomUUID();
  const auditPublicId = randomUUID();

  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // Verify target student membership in same consultancy
    const [students] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id, cm.public_id
       FROM consultancy_members cm
       JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.public_id = ?
         AND cm.consultancy_id = ?
         AND cm.status = 'ACTIVE'
         AND cmr.role IN ('STUDENT', 'INFLUENCER')
       LIMIT 1;`,
      [studentPublicId.trim(), context.consultancyId]
    );

    if (!students || students.length === 0) {
      throw new Error("Aluno não encontrado ou inativo nesta consultoria.");
    }

    const studentMembershipId = Number(students[0].id);

    // Insert progress entry
    await connection.execute<ResultSetHeader>(
      `INSERT INTO student_progress_entries (
        public_id,
        consultancy_id,
        student_membership_id,
        recorded_on,
        weight_kg,
        waist_cm,
        abdomen_cm,
        hip_cm,
        arm_cm,
        thigh_cm,
        note,
        created_by_user_id,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3));`,
      [
        entryPublicId,
        context.consultancyId,
        studentMembershipId,
        validated.recordedOn,
        validated.weightKg,
        validated.waistCm,
        validated.abdomenCm,
        validated.hipCm,
        validated.armCm,
        validated.thighCm,
        validated.note,
        userId,
      ]
    );

    // Insert audit event (without sensitive health metrics values)
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
      ) VALUES (?, ?, ?, 'STUDENT_PROGRESS_ENTRY_CREATED', 'STUDENT_PROGRESS_ENTRY', ?, ?, NOW(3));`,
      [
        auditPublicId,
        userId,
        context.consultancyId,
        entryPublicId,
        JSON.stringify({
          recordedOn: validated.recordedOn,
          studentMembershipPublicId: studentPublicId.trim(),
          professionalRecorded: true,
        }),
      ]
    );

    await connection.commit();
    return { publicId: entryPublicId };
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Parses and normalizes page number query parameter safely.
 */
export function parseProgressPageNumber(rawPage: string | string[] | undefined | null): number {
  if (rawPage === undefined || rawPage === null) {
    return 1;
  }
  const value = Array.isArray(rawPage) ? rawPage[0] : rawPage;
  if (typeof value !== "string") {
    return 1;
  }
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return 1;
  }
  const parsed = parseInt(trimmed, 10);
  if (isNaN(parsed) || parsed < 1 || parsed > 100000) {
    return 1;
  }
  return parsed;
}

/**
 * Retrieves the authenticated Student's own progress history with server-side pagination.
 */
export async function getStudentOwnProgressHistory(params: {
  userId: number;
  consultancySlug: string;
  page?: string | string[] | number;
}): Promise<StudentProgressHistoryDto | null> {
  const { userId, consultancySlug, page } = params;

  const access = await resolveStudentModuleAccess(userId, consultancySlug);
  if (!access.allowed || !access.context) {
    return null;
  }

  const requestedPage = typeof page === "number" ? Math.max(1, Math.floor(page)) : parseProgressPageNumber(page);

  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();

    // Resolve own student info
    const [members] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id, cm.public_id, u.full_name, u.email
       FROM consultancy_members cm
       JOIN users u ON u.id = cm.user_id
       JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.user_id = ?
         AND cm.consultancy_id = ?
         AND cm.status = 'ACTIVE'
         AND cmr.role IN ('STUDENT', 'INFLUENCER')
       LIMIT 1;`,
      [userId, access.context.consultancyId]
    );

    if (!members || members.length === 0) {
      return null;
    }

    const studentMembershipId = Number(members[0].id);
    const targetStudent: ProgressTargetStudentDto = {
      publicId: String(members[0].public_id),
      fullName: String(members[0].full_name),
      email: String(members[0].email),
    };

    // Query total count for pagination
    const [countRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM student_progress_entries
       WHERE consultancy_id = ?
         AND student_membership_id = ?;`,
      [access.context.consultancyId, studentMembershipId]
    );

    const totalItems = Number(countRows[0]?.total || 0);
    const pageSize = PROGRESS_HISTORY_PAGE_SIZE;
    const totalPages = totalItems > 0 ? Math.ceil(totalItems / pageSize) : 1;
    const effectivePage = totalItems > 0 ? Math.min(requestedPage, totalPages) : 1;
    const offset = (effectivePage - 1) * pageSize;

    // Query entries ordered chronologically (newest first)
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        spe.public_id,
        DATE_FORMAT(spe.recorded_on, '%Y-%m-%d') AS recorded_on,
        spe.weight_kg,
        spe.waist_cm,
        spe.abdomen_cm,
        spe.hip_cm,
        spe.arm_cm,
        spe.thigh_cm,
        spe.note,
        spe.created_at,
        creator.full_name AS creator_name
       FROM student_progress_entries spe
       JOIN users creator ON creator.id = spe.created_by_user_id
       WHERE spe.consultancy_id = ?
         AND spe.student_membership_id = ?
       ORDER BY spe.recorded_on DESC, spe.created_at DESC, spe.id DESC
       LIMIT ? OFFSET ?;`,
      [access.context.consultancyId, studentMembershipId, pageSize, offset]
    );

    const entries: StudentProgressEntryDto[] = (rows || []).map((r) => ({
      publicId: String(r.public_id),
      recordedOn: String(r.recorded_on),
      weightKg: r.weight_kg !== null ? Number(r.weight_kg) : null,
      waistCm: r.waist_cm !== null ? Number(r.waist_cm) : null,
      abdomenCm: r.abdomen_cm !== null ? Number(r.abdomen_cm) : null,
      hipCm: r.hip_cm !== null ? Number(r.hip_cm) : null,
      armCm: r.arm_cm !== null ? Number(r.arm_cm) : null,
      thighCm: r.thigh_cm !== null ? Number(r.thigh_cm) : null,
      note: r.note ? String(r.note) : null,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : "",
      createdByName: String(r.creator_name),
    }));

    // Latest entry is shown only on page 1
    const latestEntry = effectivePage === 1 && entries.length > 0 ? entries[0] : null;

    return {
      student: targetStudent,
      entries,
      totalCount: totalItems,
      pagination: {
        page: effectivePage,
        pageSize,
        totalItems,
        totalPages,
        hasPrevious: effectivePage > 1,
        hasNext: effectivePage < totalPages,
      },
      latestEntry,
    };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Retrieves a target Student's progress history for a Personal Trainer or Nutritionist with server-side pagination.
 */
export async function getProfessionalStudentProgressHistory(params: {
  userId: number;
  consultancySlug: string;
  studentPublicId: string;
  page?: string | string[] | number;
}): Promise<StudentProgressHistoryDto | null> {
  const { userId, consultancySlug, studentPublicId, page } = params;

  if (!studentPublicId || typeof studentPublicId !== "string" || !studentPublicId.trim()) {
    return null;
  }

  const context = await resolveConsultancyContext(userId, consultancySlug);
  if (!context) {
    return null;
  }

  const isPersonal = context.roles.includes("PERSONAL");
  const isNutritionist = context.roles.includes("NUTRITIONIST");

  // Only PERSONAL or NUTRITIONIST can read progress history of students
  if (!isPersonal && !isNutritionist) {
    return null;
  }

  const requestedPage = typeof page === "number" ? Math.max(1, Math.floor(page)) : parseProgressPageNumber(page);

  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();

    // Resolve target student
    const [members] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id, cm.public_id, u.full_name, u.email
       FROM consultancy_members cm
       JOIN users u ON u.id = cm.user_id
       JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.public_id = ?
         AND cm.consultancy_id = ?
         AND cm.status = 'ACTIVE'
         AND cmr.role IN ('STUDENT', 'INFLUENCER')
       LIMIT 1;`,
      [studentPublicId.trim(), context.consultancyId]
    );

    if (!members || members.length === 0) {
      return null;
    }

    const studentMembershipId = Number(members[0].id);
    const targetStudent: ProgressTargetStudentDto = {
      publicId: String(members[0].public_id),
      fullName: String(members[0].full_name),
      email: String(members[0].email),
    };

    // Query total count for pagination
    const [countRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM student_progress_entries
       WHERE consultancy_id = ?
         AND student_membership_id = ?;`,
      [context.consultancyId, studentMembershipId]
    );

    const totalItems = Number(countRows[0]?.total || 0);
    const pageSize = PROGRESS_HISTORY_PAGE_SIZE;
    const totalPages = totalItems > 0 ? Math.ceil(totalItems / pageSize) : 1;
    const effectivePage = totalItems > 0 ? Math.min(requestedPage, totalPages) : 1;
    const offset = (effectivePage - 1) * pageSize;

    // Query entries
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        spe.public_id,
        DATE_FORMAT(spe.recorded_on, '%Y-%m-%d') AS recorded_on,
        spe.weight_kg,
        spe.waist_cm,
        spe.abdomen_cm,
        spe.hip_cm,
        spe.arm_cm,
        spe.thigh_cm,
        spe.note,
        spe.created_at,
        creator.full_name AS creator_name
       FROM student_progress_entries spe
       JOIN users creator ON creator.id = spe.created_by_user_id
       WHERE spe.consultancy_id = ?
         AND spe.student_membership_id = ?
       ORDER BY spe.recorded_on DESC, spe.created_at DESC, spe.id DESC
       LIMIT ? OFFSET ?;`,
      [context.consultancyId, studentMembershipId, pageSize, offset]
    );

    const entries: StudentProgressEntryDto[] = (rows || []).map((r) => ({
      publicId: String(r.public_id),
      recordedOn: String(r.recorded_on),
      weightKg: r.weight_kg !== null ? Number(r.weight_kg) : null,
      waistCm: r.waist_cm !== null ? Number(r.waist_cm) : null,
      abdomenCm: r.abdomen_cm !== null ? Number(r.abdomen_cm) : null,
      hipCm: r.hip_cm !== null ? Number(r.hip_cm) : null,
      armCm: r.arm_cm !== null ? Number(r.arm_cm) : null,
      thighCm: r.thigh_cm !== null ? Number(r.thigh_cm) : null,
      note: r.note ? String(r.note) : null,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : "",
      createdByName: String(r.creator_name),
    }));

    // Latest entry is shown only on page 1
    const latestEntry = effectivePage === 1 && entries.length > 0 ? entries[0] : null;

    return {
      student: targetStudent,
      entries,
      totalCount: totalItems,
      pagination: {
        page: effectivePage,
        pageSize,
        totalItems,
        totalPages,
        hasPrevious: effectivePage > 1,
        hasNext: effectivePage < totalPages,
      },
      latestEntry,
    };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Lists active students in the consultancy for the Professional Progress area.
 */
export async function listProfessionalStudentsForProgress(params: {
  userId: number;
  consultancySlug: string;
}): Promise<ProgressTargetStudentDto[]> {
  const { userId, consultancySlug } = params;

  const context = await resolveConsultancyContext(userId, consultancySlug);
  if (!context) {
    return [];
  }

  const isPersonal = context.roles.includes("PERSONAL");
  const isNutritionist = context.roles.includes("NUTRITIONIST");

  if (!isPersonal && !isNutritionist) {
    return [];
  }

  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();

    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        cm.public_id AS membership_public_id,
        u.full_name,
        u.email
       FROM consultancy_members cm
       JOIN users u ON u.id = cm.user_id
       JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.consultancy_id = ?
         AND cm.status = 'ACTIVE'
         AND cmr.role IN ('STUDENT', 'INFLUENCER')
       ORDER BY u.full_name ASC;`,
      [context.consultancyId]
    );

    return (rows || []).map((r) => ({
      publicId: String(r.membership_public_id),
      fullName: String(r.full_name),
      email: String(r.email),
    }));
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
