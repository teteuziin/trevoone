/**
-- TREVO ONE — NUTRITION V2 PRE-QUESTIONNAIRE REPOSITORY (ETAPA 10)
-- Multi-tenant repository for clinical pre-questionnaires:
-- sending, draft autosaving, student submission, side-by-side diff comparison,
-- and selective integration into the Patient General Record.
*/

import crypto from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";
import { createNotificationInTransaction } from "@/services/notification-service";
import type {
  PreQuestionnaireDto,
  PreQuestionnaireSummaryDto,
  PreQuestionnaireQuestionConfig,
  PreQuestionnaireDiffComparisonItem,
  SendPreQuestionnaireInput,
  ReviewPreQuestionnaireDiffInput,
  PreQuestionnaireAppliedDiffItem,
} from "./pre-questionnaire-types";
import { PRE_QUESTIONNAIRE_STATUS_LABELS } from "./pre-questionnaire-types";
import { CANONICAL_PRE_QUESTIONNAIRE_QUESTIONS } from "./pre-questionnaire-catalog";
import {
  getPatientRecordDetail,
  updatePatientRecord,
  markPatientFieldReviewed,
} from "./patient-record-repository";
import type { UpdatePatientRecordInput } from "./patient-record-types";

interface RawPreQuestionnaireRow extends RowDataPacket {
  id: number;
  public_id: string;
  consultancy_id: number;
  student_membership_id: number;
  requested_by_membership_id: number;
  consultation_id: number | null;
  title: string;
  instructions: string | null;
  status: string;
  questions_json: string | PreQuestionnaireQuestionConfig[];
  draft_responses_json: string | Record<string, unknown> | null;
  responses_json: string | Record<string, unknown> | null;
  applied_diff_json: string | PreQuestionnaireAppliedDiffItem[] | null;
  reviewer_notes: string | null;
  sent_at: Date | string | null;
  started_at: Date | string | null;
  submitted_at: Date | string | null;
  reviewed_at: Date | string | null;
  reviewed_by_membership_id: number | null;
  canceled_at: Date | string | null;
  canceled_by_membership_id: number | null;
  cancel_reason: string | null;
  created_at: Date | string;
  updated_at: Date | string;

  // Joined fields
  student_membership_public_id?: string;
  student_name?: string;
  student_email?: string;
  student_user_id?: number;
  requested_by_name?: string;
  reviewed_by_name?: string;
  consultation_public_id?: string;
  consultation_date?: Date | string;
}

function parseJsonField<T>(val: unknown, fallback: T): T {
  if (!val) return fallback;
  if (typeof val === "object") return val as T;
  try {
    return JSON.parse(String(val)) as T;
  } catch {
    return fallback;
  }
}

function mapRowToPreQuestionnaireDto(row: RawPreQuestionnaireRow): PreQuestionnaireDto {
  const status = (row.status || "SENT") as PreQuestionnaireDto["status"];
  const questions = parseJsonField<PreQuestionnaireQuestionConfig[]>(row.questions_json, []);
  const draftResponses = parseJsonField<Record<string, unknown> | null>(row.draft_responses_json, null);
  const responses = parseJsonField<Record<string, unknown> | null>(row.responses_json, null);
  const appliedDiff = parseJsonField<PreQuestionnaireAppliedDiffItem[] | null>(row.applied_diff_json, null);

  const toIso = (d: Date | string | null | undefined): string | null => {
    if (!d) return null;
    return typeof d === "string" ? d : d.toISOString();
  };

  return {
    publicId: row.public_id,
    consultancyId: Number(row.consultancy_id),
    studentMembershipId: Number(row.student_membership_id),
    studentMembershipPublicId: String(row.student_membership_public_id || ""),
    studentName: String(row.student_name || "Paciente"),
    studentEmail: String(row.student_email || ""),
    requestedByMembershipId: Number(row.requested_by_membership_id),
    requestedByName: String(row.requested_by_name || "Nutricionista"),
    consultationId: row.consultation_id ? Number(row.consultation_id) : null,
    consultationPublicId: row.consultation_public_id ? String(row.consultation_public_id) : null,
    consultationDate: toIso(row.consultation_date),
    title: String(row.title || "Pré-Questionário Nutricional"),
    instructions: row.instructions ? String(row.instructions) : null,
    status,
    statusLabel: PRE_QUESTIONNAIRE_STATUS_LABELS[status] || status,
    questions,
    draftResponses,
    responses,
    appliedDiff,
    reviewerNotes: row.reviewer_notes ? String(row.reviewer_notes) : null,
    sentAt: toIso(row.sent_at),
    startedAt: toIso(row.started_at),
    submittedAt: toIso(row.submitted_at),
    reviewedAt: toIso(row.reviewed_at),
    reviewedByName: row.reviewed_by_name ? String(row.reviewed_by_name) : null,
    canceledAt: toIso(row.canceled_at),
    cancelReason: row.cancel_reason ? String(row.cancel_reason) : null,
    createdAt: toIso(row.created_at) || new Date().toISOString(),
    updatedAt: toIso(row.updated_at) || new Date().toISOString(),
  };
}

/**
 * Creates and sends a pre-questionnaire to a patient.
 */
export async function sendPreQuestionnaire(
  consultancyId: number,
  consultancySlug: string,
  requestedByMembershipId: number,
  input: SendPreQuestionnaireInput
): Promise<PreQuestionnaireDto> {
  const connection = await getDbConnection();
  try {
    // 1. Verify student membership
    const [students] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id, cm.public_id, cm.user_id, u.full_name, u.email
       FROM consultancy_members cm
       JOIN users u ON u.id = cm.user_id
       JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.public_id = ? AND cm.consultancy_id = ? AND cm.status = 'ACTIVE'
         AND cmr.role IN ('STUDENT', 'INFLUENCER')
       LIMIT 1;`,
      [input.studentMembershipPublicId, consultancyId]
    );

    if (students.length === 0) {
      throw new Error("Paciente não encontrado ou inativo nesta consultoria.");
    }
    const student = students[0];

    // 2. Check consultation if provided
    let consultationId: number | null = null;
    if (input.consultationPublicId) {
      const [consultations] = await connection.execute<RowDataPacket[]>(
        `SELECT id FROM nutrition_v2_consultations
         WHERE public_id = ? AND consultancy_id = ? AND student_membership_id = ?
         LIMIT 1;`,
        [input.consultationPublicId, consultancyId, student.id]
      );
      if (consultations.length > 0) {
        consultationId = Number(consultations[0].id);
      }
    }

    // 3. Build snapshot of chosen questions
    const catalogMap = new Map(CANONICAL_PRE_QUESTIONNAIRE_QUESTIONS.map((q) => [q.id, q]));
    const requiredSet = new Set(input.requiredQuestionIds || []);

    const snapshotQuestions: PreQuestionnaireQuestionConfig[] = input.selectedQuestionIds.map((id) => {
      const canonical = catalogMap.get(id);
      if (!canonical) {
        throw new Error(`Pergunta '${id}' não encontrada no catálogo.`);
      }
      return {
        ...canonical,
        required: requiredSet.has(id) || canonical.required,
      };
    });

    const publicId = crypto.randomUUID();
    const title = input.title || "Pré-Questionário Nutricional";
    const instructions = input.instructions || null;

    await connection.beginTransaction();

    await connection.execute<ResultSetHeader>(
      `INSERT INTO nutrition_v2_pre_questionnaires (
        public_id, consultancy_id, student_membership_id, requested_by_membership_id,
        consultation_id, title, instructions, status, questions_json,
        sent_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'SENT', ?, NOW(3), NOW(3), NOW(3));`,
      [
        publicId,
        consultancyId,
        student.id,
        requestedByMembershipId,
        consultationId,
        title,
        instructions,
        JSON.stringify(snapshotQuestions),
      ]
    );

    // 4. Send internal in-app notification (deduplicated, no external health data)
    try {
      await createNotificationInTransaction(connection, {
        userId: Number(student.user_id),
        consultancyId,
        title: "Novo pré-questionário nutricional",
        body: `Sua nutricionista enviou um pré-questionário para preparar sua consulta: "${title}".`,
        eventType: "PRE_QUESTIONNAIRE_SENT",
        priority: "NORMAL",
        deepLink: `/consultoria/${consultancySlug}/nutricao/pre-questionario/${publicId}`,
        dedupeKey: `pre_quest:${publicId}`,
      });
    } catch {
      // Non-blocking notification creation
    }

    await connection.commit();

    return getPreQuestionnaireByPublicId(publicId, consultancyId);
  } catch (err) {
    await connection.rollback().catch(() => {});
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Gets a pre-questionnaire by public ID with complete multi-tenant security.
 */
export async function getPreQuestionnaireByPublicId(
  publicId: string,
  consultancyId: number
): Promise<PreQuestionnaireDto> {
  const connection = await getDbConnection();
  try {
    const [rows] = await connection.execute<RawPreQuestionnaireRow[]>(
      `SELECT
        pq.*,
        cm_stu.public_id AS student_membership_public_id,
        u_stu.full_name AS student_name,
        u_stu.email AS student_email,
        u_stu.id AS student_user_id,
        u_req.full_name AS requested_by_name,
        u_rev.full_name AS reviewed_by_name,
        c.public_id AS consultation_public_id,
        c.consultation_date AS consultation_date
      FROM nutrition_v2_pre_questionnaires pq
      JOIN consultancy_members cm_stu ON cm_stu.id = pq.student_membership_id
      JOIN users u_stu ON u_stu.id = cm_stu.user_id
      JOIN consultancy_members cm_req ON cm_req.id = pq.requested_by_membership_id
      JOIN users u_req ON u_req.id = cm_req.user_id
      LEFT JOIN consultancy_members cm_rev ON cm_rev.id = pq.reviewed_by_membership_id
      LEFT JOIN users u_rev ON u_rev.id = cm_rev.user_id
      LEFT JOIN nutrition_v2_consultations c ON c.id = pq.consultation_id
      WHERE pq.public_id = ? AND pq.consultancy_id = ?
      LIMIT 1;`,
      [publicId, consultancyId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error("Pré-questionário não encontrado.");
    }

    return mapRowToPreQuestionnaireDto(rows[0]);
  } finally {
    connection.release();
  }
}

/**
 * Lists all pre-questionnaires for a patient in a consultancy.
 */
export async function listPreQuestionnairesForStudent(
  consultancyId: number,
  studentMembershipId: number
): Promise<PreQuestionnaireDto[]> {
  const connection = await getDbConnection();
  try {
    const [rows] = await connection.execute<RawPreQuestionnaireRow[]>(
      `SELECT
        pq.*,
        cm_stu.public_id AS student_membership_public_id,
        u_stu.full_name AS student_name,
        u_stu.email AS student_email,
        u_req.full_name AS requested_by_name,
        u_rev.full_name AS reviewed_by_name,
        c.public_id AS consultation_public_id,
        c.consultation_date AS consultation_date
      FROM nutrition_v2_pre_questionnaires pq
      JOIN consultancy_members cm_stu ON cm_stu.id = pq.student_membership_id
      JOIN users u_stu ON u_stu.id = cm_stu.user_id
      JOIN consultancy_members cm_req ON cm_req.id = pq.requested_by_membership_id
      JOIN users u_req ON u_req.id = cm_req.user_id
      LEFT JOIN consultancy_members cm_rev ON cm_rev.id = pq.reviewed_by_membership_id
      LEFT JOIN users u_rev ON u_rev.id = cm_rev.user_id
      LEFT JOIN nutrition_v2_consultations c ON c.id = pq.consultation_id
      WHERE pq.consultancy_id = ? AND pq.student_membership_id = ?
      ORDER BY pq.created_at DESC;`,
      [consultancyId, studentMembershipId]
    );

    return (Array.isArray(rows) ? rows : []).map(mapRowToPreQuestionnaireDto);
  } catch {
    // Fallback if table not yet created
    return [];
  } finally {
    connection.release();
  }
}

/**
 * Saves draft responses during patient filling (Autosave).
 * Moves status to IN_PROGRESS and records started_at.
 */
export async function savePreQuestionnaireDraft(
  publicId: string,
  consultancyId: number,
  studentMembershipId: number,
  responses: Record<string, unknown>
): Promise<{ success: boolean; startedAt: string | null }> {
  const connection = await getDbConnection();
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, status, started_at
       FROM nutrition_v2_pre_questionnaires
       WHERE public_id = ? AND consultancy_id = ? AND student_membership_id = ?
       LIMIT 1;`,
      [publicId, consultancyId, studentMembershipId]
    );

    if (rows.length === 0) {
      throw new Error("Questionário não encontrado ou não pertence a este aluno.");
    }

    const row = rows[0];
    if (row.status === "ANSWERED" || row.status === "REVIEWED" || row.status === "CANCELLED") {
      throw new Error("Este questionário já foi finalizado e não aceita mais edições.");
    }

    const nextStatus = row.status === "SENT" ? "IN_PROGRESS" : row.status;

    await connection.execute<ResultSetHeader>(
      `UPDATE nutrition_v2_pre_questionnaires
       SET
         draft_responses_json = ?,
         status = ?,
         started_at = COALESCE(started_at, NOW(3)),
         updated_at = NOW(3)
       WHERE id = ?;`,
      [JSON.stringify(responses), nextStatus, row.id]
    );

    return {
      success: true,
      startedAt: row.started_at ? new Date(row.started_at).toISOString() : new Date().toISOString(),
    };
  } finally {
    connection.release();
  }
}

/**
 * Finalizes patient submission of the pre-questionnaire.
 * Moves status to ANSWERED with submitted_at timestamp.
 */
export async function submitPreQuestionnaireResponses(
  publicId: string,
  consultancyId: number,
  consultancySlug: string,
  studentMembershipId: number,
  responses: Record<string, unknown>
): Promise<PreQuestionnaireDto> {
  const connection = await getDbConnection();
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        pq.id, pq.status, pq.requested_by_membership_id, pq.title,
        cm_stu.user_id AS student_user_id,
        u_stu.full_name AS student_name,
        cm_req.user_id AS requested_by_user_id
       FROM nutrition_v2_pre_questionnaires pq
       JOIN consultancy_members cm_stu ON cm_stu.id = pq.student_membership_id
       JOIN users u_stu ON u_stu.id = cm_stu.user_id
       JOIN consultancy_members cm_req ON cm_req.id = pq.requested_by_membership_id
       WHERE pq.public_id = ? AND pq.consultancy_id = ? AND pq.student_membership_id = ?
       LIMIT 1;`,
      [publicId, consultancyId, studentMembershipId]
    );

    if (rows.length === 0) {
      throw new Error("Questionário não encontrado.");
    }

    const row = rows[0];
    if (row.status === "ANSWERED" || row.status === "REVIEWED") {
      throw new Error("Este questionário já foi respondido e submetido.");
    }
    if (row.status === "CANCELLED") {
      throw new Error("Este questionário foi cancelado pelo profissional.");
    }

    await connection.beginTransaction();

    await connection.execute<ResultSetHeader>(
      `UPDATE nutrition_v2_pre_questionnaires
       SET
         responses_json = ?,
         draft_responses_json = ?,
         status = 'ANSWERED',
         submitted_at = NOW(3),
         updated_at = NOW(3)
       WHERE id = ?;`,
      [JSON.stringify(responses), JSON.stringify(responses), row.id]
    );

    // Notify the requesting nutritionist
    try {
      await createNotificationInTransaction(connection, {
        userId: Number(row.requested_by_user_id),
        consultancyId,
        title: "Pré-questionário nutricional respondido",
        body: `${row.student_name} respondeu ao pré-questionário: "${row.title}". Revise as respostas no prontuário.`,
        eventType: "PRE_QUESTIONNAIRE_ANSWERED",
        priority: "NORMAL",
        deepLink: `/consultoria/${consultancySlug}/planos-v2/prontuario/${studentMembershipId}?tab=registro-geral`,
        dedupeKey: `pre_quest_resp:${publicId}`,
      });
    } catch {
      // Non-blocking notification
    }

    await connection.commit();

    return getPreQuestionnaireByPublicId(publicId, consultancyId);
  } catch (err) {
    await connection.rollback().catch(() => {});
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Computes side-by-side Diff between current PatientRecord and submitted questionnaire responses.
 */
export async function computePreQuestionnaireDiff(
  publicId: string,
  consultancyId: number
): Promise<{
  questionnaire: PreQuestionnaireDto;
  diffItems: PreQuestionnaireDiffComparisonItem[];
}> {
  const questionnaire = await getPreQuestionnaireByPublicId(publicId, consultancyId);
  const patientRecord = await getPatientRecordDetail(
    consultancyId,
    questionnaire.studentMembershipId,
    questionnaire.requestedByMembershipId
  );

  const responses = questionnaire.responses || questionnaire.draftResponses || {};
  const currentRecord = patientRecord?.record;

  const diffItems: PreQuestionnaireDiffComparisonItem[] = questionnaire.questions.map((q) => {
    const targetField = q.targetRecordField;
    const rawNewValue = responses[q.id];

    let formattedNewValue: string | null = null;
    if (rawNewValue !== undefined && rawNewValue !== null) {
      if (typeof rawNewValue === "object") {
        formattedNewValue = JSON.stringify(rawNewValue);
      } else {
        formattedNewValue = String(rawNewValue).trim();
      }
    }

    let currentValue: string | null = null;
    let currentProvenanceLabel: string | null = null;

    if (targetField && currentRecord) {
      const val = (currentRecord as Record<string, unknown>)[targetField];
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        currentValue = String(val).trim();
      }
      const prov = patientRecord.fieldProvenance[targetField];
      if (prov) {
        currentProvenanceLabel = prov.label;
      }
    }

    const isDifferent =
      (formattedNewValue || "") !== (currentValue || "") && formattedNewValue !== null;

    return {
      questionId: q.id,
      questionTitle: q.title,
      categoryLabel: q.category,
      targetField,
      currentValue,
      currentProvenanceLabel,
      newValue: formattedNewValue,
      isDifferent,
      canAccept: Boolean(targetField && formattedNewValue !== null),
      clinicalNotice: q.clinicalNotice,
    };
  });

  return {
    questionnaire,
    diffItems,
  };
}

/**
 * Professional reviews responses, selectively accepts updates into PatientRecord,
 * and updates questionnaire status to REVIEWED.
 */
export async function reviewPreQuestionnaireDiff(
  consultancyId: number,
  consultancySlug: string,
  reviewerMembershipId: number,
  input: ReviewPreQuestionnaireDiffInput
): Promise<PreQuestionnaireDto> {
  const questionnaire = await getPreQuestionnaireByPublicId(input.publicId, consultancyId);

  if (questionnaire.status !== "ANSWERED" && questionnaire.status !== "REVIEWED") {
    throw new Error("Apenas questionários já respondidos pelo paciente podem ser revisados.");
  }

  const patientRecord = await getPatientRecordDetail(
    consultancyId,
    questionnaire.studentMembershipId,
    reviewerMembershipId
  );
  if (!patientRecord) {
    throw new Error("Prontuário do paciente não encontrado.");
  }

  // 1. Prepare fields to update
  const updates: UpdatePatientRecordInput = {};
  const appliedDiff: PreQuestionnaireAppliedDiffItem[] = [];

  for (const decision of input.decisions) {
    if (decision.accept && decision.targetField) {
      const valToApply = decision.valueToApply !== undefined ? decision.valueToApply : null;
      (updates as Record<string, unknown>)[decision.targetField] = valToApply;

      appliedDiff.push({
        questionId: decision.questionId,
        targetField: decision.targetField,
        accepted: true,
        appliedValue: valToApply,
        appliedAt: new Date().toISOString(),
      });
    } else {
      appliedDiff.push({
        questionId: decision.questionId,
        targetField: decision.targetField,
        accepted: false,
        appliedValue: null,
        appliedAt: new Date().toISOString(),
      });
    }
  }

  // 2. Apply accepted updates to patient record if any were chosen
  if (Object.keys(updates).length > 0) {
    await updatePatientRecord(
      consultancyId,
      questionnaire.studentMembershipId,
      reviewerMembershipId,
      updates
    );

    // Mark updated fields as REVIEWED
    for (const item of appliedDiff) {
      if (item.accepted && item.targetField) {
        await markPatientFieldReviewed(
          consultancyId,
          questionnaire.studentMembershipId,
          reviewerMembershipId,
          String(item.targetField),
          questionnaire.reviewedByName || "Nutricionista"
        ).catch(() => {});
      }
    }
  }

  // 3. Update questionnaire to REVIEWED
  const connection = await getDbConnection();
  try {
    await connection.execute<ResultSetHeader>(
      `UPDATE nutrition_v2_pre_questionnaires
       SET
         status = 'REVIEWED',
         reviewed_at = NOW(3),
         reviewed_by_membership_id = ?,
         applied_diff_json = ?,
         reviewer_notes = ?,
         updated_at = NOW(3)
       WHERE public_id = ? AND consultancy_id = ?;`,
      [
        reviewerMembershipId,
        JSON.stringify(appliedDiff),
        input.reviewerNotes || null,
        input.publicId,
        consultancyId,
      ]
    );
  } finally {
    connection.release();
  }

  return getPreQuestionnaireByPublicId(input.publicId, consultancyId);
}

/**
 * Cancels a pre-questionnaire.
 */
export async function cancelPreQuestionnaire(
  publicId: string,
  consultancyId: number,
  cancelerMembershipId: number,
  cancelReason?: string | null
): Promise<PreQuestionnaireDto> {
  const connection = await getDbConnection();
  try {
    await connection.execute<ResultSetHeader>(
      `UPDATE nutrition_v2_pre_questionnaires
       SET
         status = 'CANCELLED',
         canceled_at = NOW(3),
         canceled_by_membership_id = ?,
         cancel_reason = ?,
         updated_at = NOW(3)
       WHERE public_id = ? AND consultancy_id = ?;`,
      [cancelerMembershipId, cancelReason || "Cancelado pelo profissional", publicId, consultancyId]
    );

    return getPreQuestionnaireByPublicId(publicId, consultancyId);
  } finally {
    connection.release();
  }
}

/**
 * Gets the latest pending or in-progress pre-questionnaire for a student.
 */
export async function getPendingPreQuestionnaireForStudent(
  consultancyId: number,
  studentMembershipId: number
): Promise<PreQuestionnaireSummaryDto | null> {
  const connection = await getDbConnection();
  try {
    const [rows] = await connection.execute<RawPreQuestionnaireRow[]>(
      `SELECT
        pq.*,
        u_req.full_name AS requested_by_name,
        c.consultation_date AS consultation_date
      FROM nutrition_v2_pre_questionnaires pq
      JOIN consultancy_members cm_req ON cm_req.id = pq.requested_by_membership_id
      JOIN users u_req ON u_req.id = cm_req.user_id
      LEFT JOIN nutrition_v2_consultations c ON c.id = pq.consultation_id
      WHERE pq.consultancy_id = ? AND pq.student_membership_id = ?
        AND pq.status IN ('SENT', 'IN_PROGRESS')
      ORDER BY pq.created_at DESC
      LIMIT 1;`,
      [consultancyId, studentMembershipId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    const r = rows[0];
    const questions = parseJsonField<PreQuestionnaireQuestionConfig[]>(r.questions_json, []);

    const toIso = (d: Date | string | null | undefined): string | null => {
      if (!d) return null;
      return typeof d === "string" ? d : d.toISOString();
    };

    return {
      publicId: r.public_id,
      title: r.title,
      status: r.status as PreQuestionnaireSummaryDto["status"],
      statusLabel: PRE_QUESTIONNAIRE_STATUS_LABELS[r.status as PreQuestionnaireSummaryDto["status"]] || r.status,
      studentName: "",
      requestedByName: String(r.requested_by_name || "Nutricionista"),
      consultationDate: toIso(r.consultation_date),
      sentAt: toIso(r.sent_at),
      submittedAt: toIso(r.submitted_at),
      reviewedAt: toIso(r.reviewed_at),
      questionsCount: questions.length,
    };
  } catch {
    return null;
  } finally {
    connection.release();
  }
}
