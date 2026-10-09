import crypto from "node:crypto";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";
import { formatConsultancyDateTime } from "../consultancies/timezone";
import type {
  ClinicalConsultationRecord,
  ClinicalConsultationStatus,
  ConsultationType,
  AdherenceLevel,
  ClinicalConsultationSummaryDto,
  ClinicalConsultationDetailDto,
  ClinicalConsultationEvolutionComparison,
  PatientConsultationHubSummaryDto,
  CreateClinicalConsultationInput,
  UpdateClinicalConsultationInput,
} from "./clinical-consultation-types";
import {
  VALID_CONSULTATION_TYPES,
  VALID_ADHERENCE_LEVELS,
  CONSULTATION_TYPE_LABELS,
  CLINICAL_CONSULTATION_STATUS_LABELS,
  ADHERENCE_LABELS,
  computeEvolutionDelta,
  formatDateToPtBr,
} from "./clinical-consultation-types";

export { computeEvolutionDelta, formatDateToPtBr };

interface RawConsultationRow extends RowDataPacket {
  id: number;
  public_id: string;
  consultancy_id: number;
  student_membership_id: number;
  professional_membership_id: number;
  patient_record_id: number | null;
  consultation_appointment_id: number | null;
  consultation_type: string;
  status: string;
  consultation_date: Date | string;
  anthropometric_entry_id: number | null;
  active_plan_version_id: number | null;
  plan_adjusted: number | boolean | null;
  adherence: string;
  adherence_notes: string | null;
  difficulties: string | null;
  symptoms_observations: string | null;
  conduct: string | null;
  next_goals: string | null;
  recommended_return_date: Date | string | null;
  completed_at: Date | string | null;
  completed_by_membership_id: number | null;
  canceled_at: Date | string | null;
  canceled_by_membership_id: number | null;
  cancel_reason: string | null;
  created_at: Date | string;
  updated_at: Date | string;

  // Joined fields
  student_name?: string;
  student_email?: string;
  student_membership_public_id?: string;
  professional_name?: string;
  professional_membership_public_id?: string;
  weight_kg?: number | null;
  height_cm?: number | null;
  appointment_public_id?: string | null;
}

function mapRowToRecord(row: RawConsultationRow): ClinicalConsultationRecord {
  return {
    id: Number(row.id),
    publicId: String(row.public_id),
    consultancyId: Number(row.consultancy_id),
    studentMembershipId: Number(row.student_membership_id),
    professionalMembershipId: Number(row.professional_membership_id),
    patientRecordId: row.patient_record_id ? Number(row.patient_record_id) : null,
    consultationAppointmentId: row.consultation_appointment_id
      ? Number(row.consultation_appointment_id)
      : null,
    consultationType: row.consultation_type as ConsultationType,
    status: row.status as ClinicalConsultationStatus,
    consultationDate: new Date(row.consultation_date).toISOString(),
    anthropometricEntryId: row.anthropometric_entry_id ? Number(row.anthropometric_entry_id) : null,
    activePlanVersionId: row.active_plan_version_id ? Number(row.active_plan_version_id) : null,
    planAdjusted:
      row.plan_adjusted === null
        ? null
        : typeof row.plan_adjusted === "boolean"
        ? row.plan_adjusted
        : Boolean(row.plan_adjusted),
    adherence: (row.adherence || "NOT_ASSESSED") as AdherenceLevel,
    adherenceNotes: row.adherence_notes,
    difficulties: row.difficulties,
    symptomsObservations: row.symptoms_observations,
    conduct: row.conduct,
    nextGoals: row.next_goals,
    recommendedReturnDate: row.recommended_return_date
      ? new Date(row.recommended_return_date).toISOString().split("T")[0]
      : null,
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
    completedByMembershipId: row.completed_by_membership_id
      ? Number(row.completed_by_membership_id)
      : null,
    canceledAt: row.canceled_at ? new Date(row.canceled_at).toISOString() : null,
    canceledByMembershipId: row.canceled_by_membership_id
      ? Number(row.canceled_by_membership_id)
      : null,
    cancelReason: row.cancel_reason,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

/**
 * Finds an active draft consultation for a student in a tenancy context.
 * Prevents unintentional concurrent draft duplication.
 */
export async function findDraftConsultationForStudent(
  consultancyId: number,
  studentMembershipId: number,
  connection?: PoolConnection
): Promise<ClinicalConsultationRecord | null> {
  const conn = connection || (await getDbConnection());
  try {
    const [rows] = await conn.query<RawConsultationRow[]>(
      `SELECT * FROM nutrition_v2_consultations
       WHERE consultancy_id = ?
         AND student_membership_id = ?
         AND status = 'DRAFT'
       ORDER BY consultation_date DESC, id DESC
       LIMIT 1`,
      [consultancyId, studentMembershipId]
    );

    if (!rows || rows.length === 0) return null;
    return mapRowToRecord(rows[0]);
  } finally {
    if (!connection) conn.release();
  }
}

/**
 * Finds a clinical consultation by public ID within the tenant scope.
 */
export async function findClinicalConsultationByPublicId(
  consultancyId: number,
  publicId: string,
  connection?: PoolConnection
): Promise<ClinicalConsultationRecord | null> {
  const conn = connection || (await getDbConnection());
  try {
    const [rows] = await conn.query<RawConsultationRow[]>(
      `SELECT * FROM nutrition_v2_consultations
       WHERE consultancy_id = ? AND public_id = ?
       LIMIT 1`,
      [consultancyId, publicId]
    );

    if (!rows || rows.length === 0) return null;
    return mapRowToRecord(rows[0]);
  } finally {
    if (!connection) conn.release();
  }
}

/**
 * Finds the immediately preceding COMPLETED consultation for comparison.
 * Excludes DRAFT and CANCELLED records. Ensures same student and same tenancy.
 */
export async function getPreviousCompletedConsultation(
  consultancyId: number,
  studentMembershipId: number,
  beforeDate: Date,
  excludeId?: number,
  connection?: PoolConnection
): Promise<{
  consultation: ClinicalConsultationRecord;
  weightKg: number | null;
} | null> {
  const conn = connection || (await getDbConnection());
  try {
    const params: (number | Date)[] = [consultancyId, studentMembershipId, beforeDate];
    let excludeSql = "";
    if (excludeId) {
      excludeSql = "AND c.id != ?";
      params.push(excludeId);
    }

    const [rows] = await conn.query<RawConsultationRow[]>(
      `SELECT c.*, a.weight_kg
       FROM nutrition_v2_consultations c
       LEFT JOIN nutrition_v2_patient_anthropometrics a ON a.id = c.anthropometric_entry_id
       WHERE c.consultancy_id = ?
         AND c.student_membership_id = ?
         AND c.status = 'COMPLETED'
         AND c.consultation_date < ?
         ${excludeSql}
       ORDER BY c.consultation_date DESC, c.id DESC
       LIMIT 1`,
      params
    );

    if (!rows || rows.length === 0) return null;
    return {
      consultation: mapRowToRecord(rows[0]),
      weightKg: rows[0].weight_kg !== null && rows[0].weight_kg !== undefined ? Number(rows[0].weight_kg) : null,
    };
  } finally {
    if (!connection) conn.release();
  }
}

/**
 * Creates a new clinical consultation DRAFT.
 * - Requires explicit consultationType (INITIAL vs FOLLOW_UP).
 * - Snapshots the currently published active plan version at the time of creation.
 * - Connects to patient record if one exists (does NOT create an empty one).
 * - Connects to appointment if supplied (enforces 1:1 uniqueness and tenancy).
 */
export async function createClinicalConsultationDraft(
  params: {
    consultancyId: number;
    studentMembershipId: number;
    professionalMembershipId: number;
    input: CreateClinicalConsultationInput;
  },
  connection?: PoolConnection
): Promise<{ id: number; publicId: string }> {
  const conn = connection || (await getDbConnection());
  const shouldManageTx = !connection;

  try {
    if (shouldManageTx) await conn.beginTransaction();

    const { consultancyId, studentMembershipId, professionalMembershipId, input } = params;

    if (!VALID_CONSULTATION_TYPES.includes(input.consultationType)) {
      throw new Error("Tipo de consulta inválido. Informe Consulta inicial ou Retorno explicitamente.");
    }

    const consultationDate = new Date(input.consultationDate);
    if (isNaN(consultationDate.getTime())) {
      throw new Error("Data da consulta inválida.");
    }

    // 1. Resolve patient_record_id if exists for this student
    const [recordRows] = await conn.query<RowDataPacket[]>(
      `SELECT id FROM nutrition_v2_patient_records
       WHERE consultancy_id = ? AND student_membership_id = ? AND deleted_at IS NULL
       LIMIT 1`,
      [consultancyId, studentMembershipId]
    );
    const patientRecordId = recordRows && recordRows.length > 0 ? Number(recordRows[0].id) : null;

    // 2. Resolve active published plan version snapshot at start
    const [assignmentRows] = await conn.query<RowDataPacket[]>(
      `SELECT plan_version_id FROM nutrition_v2_assignments
       WHERE consultancy_id = ? AND student_membership_id = ? AND status = 'ACTIVE'
       LIMIT 1`,
      [consultancyId, studentMembershipId]
    );
    const activePlanVersionId =
      assignmentRows && assignmentRows.length > 0 && assignmentRows[0].plan_version_id
        ? Number(assignmentRows[0].plan_version_id)
        : null;

    // 3. Resolve appointment if provided
    let appointmentId: number | null = null;
    if (input.consultationAppointmentPublicId) {
      const [apptRows] = await conn.query<RowDataPacket[]>(
        `SELECT id, student_membership_id, professional_membership_id, professional_type
         FROM consultations
         WHERE consultancy_id = ? AND public_id = ?
         LIMIT 1`,
        [consultancyId, input.consultationAppointmentPublicId]
      );

      if (!apptRows || apptRows.length === 0) {
        throw new Error("Agendamento não encontrado nesta consultoria.");
      }

      const appt = apptRows[0];
      if (Number(appt.student_membership_id) !== studentMembershipId) {
        throw new Error("O agendamento selecionado pertence a outro aluno.");
      }
      if (appt.professional_type !== "NUTRITIONIST") {
        throw new Error("Apenas agendamentos de nutricionista podem ser vinculados à consulta nutricional.");
      }

      // Check 1:1 uniqueness
      const [existingLinkRows] = await conn.query<RowDataPacket[]>(
        `SELECT id, public_id FROM nutrition_v2_consultations
         WHERE consultation_appointment_id = ?
         LIMIT 1`,
        [Number(appt.id)]
      );

      if (existingLinkRows && existingLinkRows.length > 0) {
        // Return existing consultation for this appointment
        if (shouldManageTx) await conn.commit();
        return {
          id: Number(existingLinkRows[0].id),
          publicId: String(existingLinkRows[0].public_id),
        };
      }

      appointmentId = Number(appt.id);
    }

    // 4. Resolve anthropometric entry if provided
    let anthroId: number | null = null;
    if (input.anthropometricEntryPublicId) {
      const [anthroRows] = await conn.query<RowDataPacket[]>(
        `SELECT a.id FROM nutrition_v2_patient_anthropometrics a
         JOIN nutrition_v2_patient_records pr ON pr.id = a.patient_record_id
         WHERE pr.consultancy_id = ? AND pr.student_membership_id = ? AND a.public_id = ?
         LIMIT 1`,
        [consultancyId, studentMembershipId, input.anthropometricEntryPublicId]
      );
      if (anthroRows && anthroRows.length > 0) {
        anthroId = Number(anthroRows[0].id);
      }
    }

    // 5. Insert new DRAFT
    const publicId = crypto.randomUUID();
    const adherence = input.adherence && VALID_ADHERENCE_LEVELS.includes(input.adherence)
      ? input.adherence
      : "NOT_ASSESSED";

    const recommendedReturn = input.recommendedReturnDate
      ? input.recommendedReturnDate.trim()
      : null;

    const [result] = await conn.query<ResultSetHeader>(
      `INSERT INTO nutrition_v2_consultations (
         public_id,
         consultancy_id,
         student_membership_id,
         professional_membership_id,
         patient_record_id,
         consultation_appointment_id,
         consultation_type,
         status,
         consultation_date,
         anthropometric_entry_id,
         active_plan_version_id,
         plan_adjusted,
         adherence,
         adherence_notes,
         difficulties,
         symptoms_observations,
         conduct,
         next_goals,
         recommended_return_date
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        publicId,
        consultancyId,
        studentMembershipId,
        professionalMembershipId,
        patientRecordId,
        appointmentId,
        input.consultationType,
        consultationDate,
        anthroId,
        activePlanVersionId,
        input.planAdjusted ?? null,
        adherence,
        input.adherenceNotes?.trim() || null,
        input.difficulties?.trim() || null,
        input.symptomsObservations?.trim() || null,
        input.conduct?.trim() || null,
        input.nextGoals?.trim() || null,
        recommendedReturn,
      ]
    );

    if (shouldManageTx) await conn.commit();
    return { id: result.insertId, publicId };
  } catch (err) {
    if (shouldManageTx) await conn.rollback();
    throw err;
  } finally {
    if (!connection) conn.release();
  }
}

/**
 * Updates an ongoing clinical consultation DRAFT.
 * CRITICAL GATE: Throws if consultation is not in 'DRAFT' status.
 */
export async function updateClinicalConsultationDraft(
  params: {
    consultancyId: number;
    publicId: string;
    input: UpdateClinicalConsultationInput;
  },
  connection?: PoolConnection
): Promise<ClinicalConsultationRecord> {
  const conn = connection || (await getDbConnection());
  const shouldManageTx = !connection;

  try {
    if (shouldManageTx) await conn.beginTransaction();

    const { consultancyId, publicId, input } = params;

    // Fetch existing record for update
    const [rows] = await conn.query<RawConsultationRow[]>(
      `SELECT * FROM nutrition_v2_consultations
       WHERE consultancy_id = ? AND public_id = ?
       FOR UPDATE`,
      [consultancyId, publicId]
    );

    if (!rows || rows.length === 0) {
      throw new Error("Consulta não encontrada.");
    }

    const current = rows[0];
    if (current.status !== "DRAFT") {
      throw new Error("Esta consulta já foi finalizada ou cancelada e não pode mais ser editada.");
    }

    // Resolve optional anthropometric entry
    let anthroId = current.anthropometric_entry_id ? Number(current.anthropometric_entry_id) : null;
    if (input.anthropometricEntryPublicId !== undefined) {
      if (!input.anthropometricEntryPublicId) {
        anthroId = null;
      } else {
        const [anthroRows] = await conn.query<RowDataPacket[]>(
          `SELECT a.id FROM nutrition_v2_patient_anthropometrics a
           JOIN nutrition_v2_patient_records pr ON pr.id = a.patient_record_id
           WHERE pr.consultancy_id = ? AND pr.student_membership_id = ? AND a.public_id = ?
           LIMIT 1`,
          [consultancyId, current.student_membership_id, input.anthropometricEntryPublicId]
        );
        if (anthroRows && anthroRows.length > 0) {
          anthroId = Number(anthroRows[0].id);
        }
      }
    }

    const consultationDate = input.consultationDate
      ? new Date(input.consultationDate)
      : new Date(current.consultation_date);

    const consultationType =
      input.consultationType && VALID_CONSULTATION_TYPES.includes(input.consultationType)
        ? input.consultationType
        : (current.consultation_type as ConsultationType);

    const adherence =
      input.adherence && VALID_ADHERENCE_LEVELS.includes(input.adherence)
        ? input.adherence
        : (current.adherence as AdherenceLevel);

    const planAdjusted =
      input.planAdjusted !== undefined
        ? input.planAdjusted
        : current.plan_adjusted === null
        ? null
        : Boolean(current.plan_adjusted);

    const adherenceNotes =
      input.adherenceNotes !== undefined ? input.adherenceNotes?.trim() || null : current.adherence_notes;
    const difficulties =
      input.difficulties !== undefined ? input.difficulties?.trim() || null : current.difficulties;
    const symptomsObservations =
      input.symptomsObservations !== undefined
        ? input.symptomsObservations?.trim() || null
        : current.symptoms_observations;
    const conduct = input.conduct !== undefined ? input.conduct?.trim() || null : current.conduct;
    const nextGoals =
      input.nextGoals !== undefined ? input.nextGoals?.trim() || null : current.next_goals;
    const recommendedReturnDate =
      input.recommendedReturnDate !== undefined
        ? input.recommendedReturnDate?.trim() || null
        : current.recommended_return_date
        ? new Date(current.recommended_return_date).toISOString().split("T")[0]
        : null;

    await conn.query(
      `UPDATE nutrition_v2_consultations
       SET consultation_type = ?,
           consultation_date = ?,
           anthropometric_entry_id = ?,
           plan_adjusted = ?,
           adherence = ?,
           adherence_notes = ?,
           difficulties = ?,
           symptoms_observations = ?,
           conduct = ?,
           next_goals = ?,
           recommended_return_date = ?
       WHERE id = ?`,
      [
        consultationType,
        consultationDate,
        anthroId,
        planAdjusted,
        adherence,
        adherenceNotes,
        difficulties,
        symptomsObservations,
        conduct,
        nextGoals,
        recommendedReturnDate,
        current.id,
      ]
    );

    if (shouldManageTx) await conn.commit();

    const updated = await findClinicalConsultationByPublicId(consultancyId, publicId, conn);
    if (!updated) throw new Error("Erro ao carregar consulta atualizada.");
    return updated;
  } catch (err) {
    if (shouldManageTx) await conn.rollback();
    throw err;
  } finally {
    if (!connection) conn.release();
  }
}

/**
 * Completes a clinical consultation.
 * CRITICAL GATE: Only DRAFT consultations can be completed.
 * Once completed, the consultation becomes historically immutable.
 */
export async function completeClinicalConsultation(
  params: {
    consultancyId: number;
    publicId: string;
    completedByMembershipId: number;
  },
  connection?: PoolConnection
): Promise<ClinicalConsultationRecord> {
  const conn = connection || (await getDbConnection());
  const shouldManageTx = !connection;

  try {
    if (shouldManageTx) await conn.beginTransaction();

    const { consultancyId, publicId, completedByMembershipId } = params;

    const [rows] = await conn.query<RawConsultationRow[]>(
      `SELECT * FROM nutrition_v2_consultations
       WHERE consultancy_id = ? AND public_id = ?
       FOR UPDATE`,
      [consultancyId, publicId]
    );

    if (!rows || rows.length === 0) {
      throw new Error("Consulta não encontrada.");
    }

    const current = rows[0];
    if (current.status !== "DRAFT") {
      throw new Error("Apenas consultas em rascunho podem ser concluídas.");
    }

    const now = new Date();

    await conn.query(
      `UPDATE nutrition_v2_consultations
       SET status = 'COMPLETED',
           completed_at = ?,
           completed_by_membership_id = ?
       WHERE id = ?`,
      [now, completedByMembershipId, current.id]
    );

    // If linked to an appointment, mark it completed as well if still active
    if (current.consultation_appointment_id) {
      await conn.query(
        `UPDATE consultations
         SET status = 'COMPLETED',
             ended_at = COALESCE(ended_at, ?)
         WHERE id = ? AND status IN ('SCHEDULED', 'IN_PROGRESS')`,
        [now, current.consultation_appointment_id]
      );
    }

    if (shouldManageTx) await conn.commit();

    const completed = await findClinicalConsultationByPublicId(consultancyId, publicId, conn);
    if (!completed) throw new Error("Erro ao carregar consulta concluída.");
    return completed;
  } catch (err) {
    if (shouldManageTx) await conn.rollback();
    throw err;
  } finally {
    if (!connection) conn.release();
  }
}

/**
 * Cancels a clinical consultation DRAFT.
 * Does NOT delete the record; marks status = 'CANCELLED'.
 * Notice: COMPLETED consultations cannot be cancelled or deleted.
 */
export async function cancelClinicalConsultation(
  params: {
    consultancyId: number;
    publicId: string;
    canceledByMembershipId: number;
    cancelReason?: string | null;
  },
  connection?: PoolConnection
): Promise<ClinicalConsultationRecord> {
  const conn = connection || (await getDbConnection());
  const shouldManageTx = !connection;

  try {
    if (shouldManageTx) await conn.beginTransaction();

    const { consultancyId, publicId, canceledByMembershipId, cancelReason } = params;

    const [rows] = await conn.query<RawConsultationRow[]>(
      `SELECT * FROM nutrition_v2_consultations
       WHERE consultancy_id = ? AND public_id = ?
       FOR UPDATE`,
      [consultancyId, publicId]
    );

    if (!rows || rows.length === 0) {
      throw new Error("Consulta não encontrada.");
    }

    const current = rows[0];
    if (current.status === "COMPLETED") {
      throw new Error("Consultas concluídas representam registro histórico imutável e não podem ser canceladas.");
    }
    if (current.status === "CANCELLED") {
      throw new Error("Esta consulta já foi cancelada anteriormente.");
    }

    const now = new Date();

    await conn.query(
      `UPDATE nutrition_v2_consultations
       SET status = 'CANCELLED',
           canceled_at = ?,
           canceled_by_membership_id = ?,
           cancel_reason = ?
       WHERE id = ?`,
      [now, canceledByMembershipId, cancelReason?.trim() || null, current.id]
    );

    if (shouldManageTx) await conn.commit();

    const canceled = await findClinicalConsultationByPublicId(consultancyId, publicId, conn);
    if (!canceled) throw new Error("Erro ao carregar consulta cancelada.");
    return canceled;
  } catch (err) {
    if (shouldManageTx) await conn.rollback();
    throw err;
  } finally {
    if (!connection) conn.release();
  }
}

/**
 * Lists clinical consultations timeline for a student.
 * Sorted chronologically descending (most recent first).
 * Injects weight and delta from anthropometrics for each consultation.
 */
export async function listClinicalConsultationsTimeline(
  consultancyId: number,
  studentMembershipId: number,
  connection?: PoolConnection
): Promise<ClinicalConsultationSummaryDto[]> {
  const conn = connection || (await getDbConnection());
  try {
    const [rows] = await conn.query<RawConsultationRow[]>(
      `SELECT c.*,
              u.full_name AS professional_name,
              pm.public_id AS professional_membership_public_id,
              a.weight_kg,
              appt.public_id AS appointment_public_id
       FROM nutrition_v2_consultations c
       JOIN consultancy_members pm ON pm.id = c.professional_membership_id
       JOIN users u ON u.id = pm.user_id
       LEFT JOIN nutrition_v2_patient_anthropometrics a ON a.id = c.anthropometric_entry_id
       LEFT JOIN consultations appt ON appt.id = c.consultation_appointment_id
       WHERE c.consultancy_id = ?
         AND c.student_membership_id = ?
       ORDER BY c.consultation_date DESC, c.id DESC`,
      [consultancyId, studentMembershipId]
    );

    if (!rows || rows.length === 0) return [];

    // Calculate deltas comparing each COMPLETED consultation to the preceding COMPLETED one
    const completedList = rows.filter((r) => r.status === "COMPLETED");

    return rows.map((row) => {
      const isCompleted = row.status === "COMPLETED";
      let weightDeltaKg: number | null = null;
      let weightDeltaPercent: number | null = null;

      if (isCompleted && row.weight_kg !== null && row.weight_kg !== undefined) {
        // Find previous completed consultation in list
        const currentIndex = completedList.findIndex((r) => r.id === row.id);
        const prevCompleted = currentIndex !== -1 && currentIndex + 1 < completedList.length
          ? completedList[currentIndex + 1]
          : null;

        if (prevCompleted && prevCompleted.weight_kg !== null && prevCompleted.weight_kg !== undefined) {
          const delta = computeEvolutionDelta(Number(row.weight_kg), Number(prevCompleted.weight_kg));
          weightDeltaKg = delta.weightDeltaKg;
          weightDeltaPercent = delta.weightDeltaPercent;
        }
      }

      const cDate = new Date(row.consultation_date);
      const recDate = row.recommended_return_date ? new Date(row.recommended_return_date) : null;

      return {
        publicId: String(row.public_id),
        consultationType: row.consultation_type as ConsultationType,
        consultationTypeLabel:
          CONSULTATION_TYPE_LABELS[row.consultation_type as ConsultationType] || row.consultation_type,
        status: row.status as ClinicalConsultationStatus,
        statusLabel:
          CLINICAL_CONSULTATION_STATUS_LABELS[row.status as ClinicalConsultationStatus] || row.status,
        consultationDate: cDate.toISOString(),
        formattedDate: formatDateToPtBr(cDate) || "",
        professionalName: row.professional_name || "Profissional",
        professionalMembershipPublicId: String(row.professional_membership_public_id),
        weightKg: row.weight_kg !== null && row.weight_kg !== undefined ? Number(row.weight_kg) : null,
        weightDeltaKg,
        weightDeltaPercent,
        adherence: (row.adherence || "NOT_ASSESSED") as AdherenceLevel,
        adherenceLabel: ADHERENCE_LABELS[(row.adherence || "NOT_ASSESSED") as AdherenceLevel] || "Não avaliada",
        conduct: row.conduct || null,
        recommendedReturnDate: recDate ? recDate.toISOString().split("T")[0] : null,
        recommendedReturnFormatted: formatDateToPtBr(recDate),
        appointmentPublicId: row.appointment_public_id || null,
      };
    });
  } finally {
    if (!connection) conn.release();
  }
}

/**
 * Fetches detailed view of a clinical consultation.
 */
export async function getClinicalConsultationDetail(
  consultancyId: number,
  publicId: string,
  connection?: PoolConnection
): Promise<ClinicalConsultationDetailDto | null> {
  const conn = connection || (await getDbConnection());
  try {
    const [rows] = await conn.query<RawConsultationRow[]>(
      `SELECT c.*,
              su.full_name AS student_name,
              su.email AS student_email,
              sm.public_id AS student_membership_public_id,
              pu.full_name AS professional_name,
              pm.public_id AS professional_membership_public_id,
              a.weight_kg,
              a.height_cm,
              a.waist_cm,
              a.hip_cm,
              a.arm_cm,
              a.thigh_cm,
              a.calf_cm,
              a.chest_cm,
              a.notes AS anthro_notes,
              a.measurement_date,
              a.public_id AS anthro_public_id,
              pv.version_number,
              p.title AS plan_title,
              p.public_id AS plan_public_id
       FROM nutrition_v2_consultations c
       JOIN consultancy_members sm ON sm.id = c.student_membership_id
       JOIN users su ON su.id = sm.user_id
       JOIN consultancy_members pm ON pm.id = c.professional_membership_id
       JOIN users pu ON pu.id = pm.user_id
       LEFT JOIN nutrition_v2_patient_anthropometrics a ON a.id = c.anthropometric_entry_id
       LEFT JOIN nutrition_v2_plan_versions pv ON pv.id = c.active_plan_version_id
       LEFT JOIN nutrition_v2_plans p ON p.id = pv.plan_id
       WHERE c.consultancy_id = ? AND c.public_id = ?
       LIMIT 1`,
      [consultancyId, publicId]
    );

    if (!rows || rows.length === 0) return null;

    const row = rows[0];
    const record = mapRowToRecord(row);

    // Compute evolution from previous COMPLETED consultation
    const previous = await getPreviousCompletedConsultation(
      consultancyId,
      record.studentMembershipId,
      new Date(record.consultationDate),
      record.id,
      conn
    );

    const currentWeight = row.weight_kg !== null && row.weight_kg !== undefined ? Number(row.weight_kg) : null;
    const previousWeight = previous?.weightKg ?? null;

    let evolution: ClinicalConsultationEvolutionComparison;
    if (!previous) {
      evolution = {
        hasComparison: false,
        previousWeightKg: null,
        currentWeightKg: currentWeight,
        weightDeltaKg: null,
        weightDeltaPercent: null,
        previousConsultationDate: null,
        previousConsultationType: null,
        message: "Primeiro atendimento registrado",
      };
    } else if (currentWeight === null || previousWeight === null) {
      evolution = {
        hasComparison: false,
        previousWeightKg: previousWeight,
        currentWeightKg: currentWeight,
        weightDeltaKg: null,
        weightDeltaPercent: null,
        previousConsultationDate: previous.consultation.consultationDate,
        previousConsultationType: previous.consultation.consultationType,
        message: "Sem comparação disponível",
      };
    } else {
      const delta = computeEvolutionDelta(currentWeight, previousWeight);
      evolution = {
        hasComparison: true,
        previousWeightKg: previousWeight,
        currentWeightKg: currentWeight,
        weightDeltaKg: delta.weightDeltaKg,
        weightDeltaPercent: delta.weightDeltaPercent,
        previousConsultationDate: previous.consultation.consultationDate,
        previousConsultationType: previous.consultation.consultationType,
      };
    }

    // Anthropometrics snapshot
    const anthropometricsSnapshot = row.anthro_public_id
      ? {
          publicId: String(row.anthro_public_id),
          measurementDate: row.measurement_date ? new Date(row.measurement_date).toISOString().split("T")[0] : "",
          weightKg: row.weight_kg !== null && row.weight_kg !== undefined ? Number(row.weight_kg) : null,
          heightCm: row.height_cm !== null && row.height_cm !== undefined ? Number(row.height_cm) : null,
          waistCm: row.waist_cm !== null && row.waist_cm !== undefined ? Number(row.waist_cm) : null,
          hipCm: row.hip_cm !== null && row.hip_cm !== undefined ? Number(row.hip_cm) : null,
          armCm: row.arm_cm !== null && row.arm_cm !== undefined ? Number(row.arm_cm) : null,
          thighCm: row.thigh_cm !== null && row.thigh_cm !== undefined ? Number(row.thigh_cm) : null,
          calfCm: row.calf_cm !== null && row.calf_cm !== undefined ? Number(row.calf_cm) : null,
          chestCm: row.chest_cm !== null && row.chest_cm !== undefined ? Number(row.chest_cm) : null,
          notes: row.anthro_notes || null,
        }
      : null;

    // Plan snapshot
    const planSnapshot = row.plan_public_id
      ? {
          planTitle: row.plan_title || "Plano Alimentar",
          planPublicId: String(row.plan_public_id),
          versionNumber: row.version_number ? Number(row.version_number) : 1,
          isActivePublished: true,
        }
      : null;

    // Planning snapshot (from nutrition_v2_patient_planning if exists)
    const [planningRows] = await conn.query<RowDataPacket[]>(
      `SELECT calculated_at, target_calories_kcal, target_protein_g, target_carbs_g, target_fats_g, goal_type
       FROM nutrition_v2_patient_planning
       WHERE consultancy_id = ? AND student_membership_id = ?
       LIMIT 1`,
      [consultancyId, record.studentMembershipId]
    );

    const planningSnapshot =
      planningRows && planningRows.length > 0
        ? {
            calculatedAt: planningRows[0].calculated_at ? new Date(planningRows[0].calculated_at).toISOString() : null,
            targetCaloriesKcal: planningRows[0].target_calories_kcal ? Number(planningRows[0].target_calories_kcal) : null,
            targetProteinG: planningRows[0].target_protein_g ? Number(planningRows[0].target_protein_g) : null,
            targetCarbsG: planningRows[0].target_carbs_g ? Number(planningRows[0].target_carbs_g) : null,
            targetFatsG: planningRows[0].target_fats_g ? Number(planningRows[0].target_fats_g) : null,
            goalType: planningRows[0].goal_type || null,
          }
        : null;

    // Real next appointment from consultations table
    const [nextApptRows] = await conn.query<RowDataPacket[]>(
      `SELECT public_id, scheduled_start_at
       FROM consultations
       WHERE consultancy_id = ?
         AND student_membership_id = ?
         AND status = 'SCHEDULED'
         AND scheduled_start_at > NOW()
       ORDER BY scheduled_start_at ASC
       LIMIT 1`,
      [consultancyId, record.studentMembershipId]
    );

    const realNextAppointment =
      nextApptRows && nextApptRows.length > 0
        ? {
            publicId: String(nextApptRows[0].public_id),
            scheduledStartAt: new Date(nextApptRows[0].scheduled_start_at).toISOString(),
            formattedStart: formatConsultancyDateTime(
              "America/Sao_Paulo",
              new Date(nextApptRows[0].scheduled_start_at)
            ),
          }
        : null;

    return {
      consultation: record,
      student: {
        membershipId: record.studentMembershipId,
        membershipPublicId: String(row.student_membership_public_id),
        fullName: row.student_name || "",
        email: row.student_email || "",
      },
      professional: {
        membershipId: record.professionalMembershipId,
        membershipPublicId: String(row.professional_membership_public_id),
        fullName: row.professional_name || "",
      },
      evolution,
      anthropometricsSnapshot,
      planSnapshot,
      planningSnapshot,
      realNextAppointment,
    };
  } finally {
    if (!connection) conn.release();
  }
}

/**
 * Returns comprehensive summary for the Patient Hub:
 * - Total completed consultations count
 * - Latest completed consultation with evolution delta
 * - Recommended return date (from latest consultation)
 * - Real next scheduled appointment (from consultations table)
 * - Active draft if one exists
 * - Timeline of all consultations
 * - Suggested next consultation type (INITIAL if 0 completed, FOLLOW_UP if >= 1 completed)
 */
export async function getPatientConsultationHubSummary(
  consultancyId: number,
  studentMembershipId: number,
  connection?: PoolConnection
): Promise<PatientConsultationHubSummaryDto> {
  const conn = connection || (await getDbConnection());
  try {
    const timeline = await listClinicalConsultationsTimeline(consultancyId, studentMembershipId, conn);

    const completed = timeline.filter((c) => c.status === "COMPLETED");
    const activeDraft = timeline.find((c) => c.status === "DRAFT") || null;
    const latestCompleted = completed.length > 0 ? completed[0] : null;

    // Recommended return date from latest completed consultation
    const recommendedReturnDate = latestCompleted?.recommendedReturnDate || null;
    const recommendedReturnFormatted = latestCompleted?.recommendedReturnFormatted || null;

    // Real next scheduled appointment from consultations table
    const [apptRows] = await conn.query<RowDataPacket[]>(
      `SELECT public_id, scheduled_start_at
       FROM consultations
       WHERE consultancy_id = ?
         AND student_membership_id = ?
         AND status = 'SCHEDULED'
         AND scheduled_start_at > NOW()
       ORDER BY scheduled_start_at ASC
       LIMIT 1`,
      [consultancyId, studentMembershipId]
    );

    const realNextAppointment =
      apptRows && apptRows.length > 0
        ? {
            publicId: String(apptRows[0].public_id),
            scheduledStartAt: new Date(apptRows[0].scheduled_start_at).toISOString(),
            formattedStart: formatConsultancyDateTime(
              "America/Sao_Paulo",
              new Date(apptRows[0].scheduled_start_at)
            ),
          }
        : null;

    const suggestedNextType: ConsultationType = completed.length > 0 ? "FOLLOW_UP" : "INITIAL";

    return {
      totalCompletedConsultations: completed.length,
      latestCompletedConsultation: latestCompleted,
      recommendedReturnDate,
      recommendedReturnFormatted,
      realNextAppointment,
      activeDraft,
      consultationsTimeline: timeline,
      suggestedNextType,
    };
  } finally {
    if (!connection) conn.release();
  }
}
