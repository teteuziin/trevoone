import * as crypto from "node:crypto";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { getDbConnection } from "@/lib/db/mysql";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { createPhotoEvaluationRequest, type PhotoEvaluationPose } from "@/lib/consultancies/photo-evaluations";
import {
  assignFormToStudents,
  ensureConsultancyFormsSchema,
  type FormQuestionDefinition,
} from "@/lib/consultancies/forms";
import { COMPLETE_ANAMNESIS_FORM_V1, PHYSICAL_ASSESSMENT_FORM_V1 } from "@/lib/consultancies/intake-schemas";

export interface StudentPendingRequestDto {
  publicId: string;
  type: "PHOTOS" | "ANAMNESIS" | "ASSESSMENT" | "CUSTOM_FORM";
  title: string;
  description: string | null;
  requestedByName: string;
  requestedAt: string;
  deepLink: string;
  ctaText: string;
}

export interface AvailableFormTemplateOption {
  publicId: string;
  title: string;
  description: string | null;
  fieldsCount: number;
  category: "CUSTOM" | "ANAMNESIS" | "ASSESSMENT";
}

/**
 * Ensures system form templates (Anamnese Completa, Avaliação Física) exist for a consultancy.
 */
export async function ensureSystemFormTemplate(
  consultancyId: number,
  userId: number,
  formKey: "complete-anamnesis" | "physical-assessment"
): Promise<{ id: number; publicId: string; title: string }> {
  await ensureConsultancyFormsSchema();
  const conn = await getDbConnection();
  try {
    const isAnamnesis = formKey === "complete-anamnesis";
    const title = isAnamnesis ? "Anamnese & Histórico de Saúde" : "Avaliação Física & Medidas";
    const description = isAnamnesis
      ? "Questionário detalhado de saúde, histórico médico, rotina e preferências."
      : "Avaliação física padronizada e histórico de medidas corporais.";
    const schemaDef = isAnamnesis ? COMPLETE_ANAMNESIS_FORM_V1 : PHYSICAL_ASSESSMENT_FORM_V1;

    // Check if form already exists
    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT id, public_id, title
       FROM consultancy_forms
       WHERE consultancy_id = ? AND title = ? AND deleted_at IS NULL
       LIMIT 1;`,
      [consultancyId, title]
    );

    if (rows.length > 0) {
      return {
        id: Number(rows[0].id),
        publicId: String(rows[0].public_id),
        title: String(rows[0].title),
      };
    }

    const publicId = crypto.randomUUID();
    const questions: FormQuestionDefinition[] = schemaDef.fields.map((f) => ({
      id: f.key,
      title: f.label,
      type: f.type === "SINGLE_CHOICE" ? "SINGLE_CHOICE" : f.type === "LONG_TEXT" ? "LONG_TEXT" : "SHORT_TEXT",
      required: f.required,
      options: (f.options || []).map((o) => ({ id: o, label: o })),
      description: f.description,
    }));

    const [res] = await conn.execute<ResultSetHeader>(
      `INSERT INTO consultancy_forms (
        public_id, consultancy_id, title, description, questions_json,
        status, is_recurring, created_by_user_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'PUBLISHED', 0, ?, NOW(3), NOW(3));`,
      [publicId, consultancyId, title, description, JSON.stringify(questions), userId]
    );

    return { id: res.insertId, publicId, title };
  } finally {
    conn.release();
  }
}

/**
 * Lists available form templates for a professional to request from a student.
 */
export async function listAvailableFormTemplatesForRequest(
  consultancyId: number
): Promise<AvailableFormTemplateOption[]> {
  await ensureConsultancyFormsSchema();
  const conn = await getDbConnection();
  try {
    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT id, public_id, title, description, questions_json
       FROM consultancy_forms
       WHERE consultancy_id = ? AND status = 'PUBLISHED' AND deleted_at IS NULL
       ORDER BY created_at ASC;`,
      [consultancyId]
    );

    return rows.map((r) => {
      let fieldsCount = 0;
      try {
        const raw = typeof r.questions_json === "string" ? JSON.parse(r.questions_json) : r.questions_json;
        if (Array.isArray(raw)) fieldsCount = raw.length;
      } catch {
        fieldsCount = 0;
      }

      const title = String(r.title);
      const titleLower = title.toLowerCase();
      let category: AvailableFormTemplateOption["category"] = "CUSTOM";
      if (titleLower.includes("anamnes")) category = "ANAMNESIS";
      else if (titleLower.includes("avalia") || titleLower.includes("medid")) category = "ASSESSMENT";

      return {
        publicId: String(r.public_id),
        title,
        description: r.description ? String(r.description) : null,
        fieldsCount,
        category,
      };
    });
  } finally {
    conn.release();
  }
}

/**
 * Requests photo evaluation from student.
 */
export async function requestStudentPhotos(params: {
  userId: number;
  consultancySlug: string;
  studentMembershipPublicId: string;
  instructions?: string;
  poses?: PhotoEvaluationPose[];
}): Promise<{ success: boolean; requestPublicId?: string; error?: string }> {
  return createPhotoEvaluationRequest({
    professionalUserId: params.userId,
    consultancySlug: params.consultancySlug,
    studentPublicId: params.studentMembershipPublicId,
    instructions: params.instructions,
  });
}

/**
 * Requests an anamnesis form for a student.
 */
export async function requestStudentAnamnesis(params: {
  userId: number;
  consultancySlug: string;
  studentMembershipPublicId: string;
}): Promise<{ success: boolean; requestPublicId?: string; error?: string }> {
  const { userId, consultancySlug, studentMembershipPublicId } = params;
  const context = await resolveConsultancyContext(userId, consultancySlug);
  if (!context) {
    return { success: false, error: "Acesso negado à consultoria." };
  }

  const template = await ensureSystemFormTemplate(context.consultancyId, userId, "complete-anamnesis");

  try {
    const assignRes = await assignFormToStudents(consultancySlug, userId, {
      formPublicId: template.publicId,
      studentMembershipPublicIds: [studentMembershipPublicId],
    });

    if (!assignRes.success) {
      return { success: false, error: assignRes.error || "Erro ao solicitar anamnese." };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao solicitar anamnese." };
  }
}

/**
 * Requests a physical assessment form for a student.
 */
export async function requestStudentAssessment(params: {
  userId: number;
  consultancySlug: string;
  studentMembershipPublicId: string;
}): Promise<{ success: boolean; requestPublicId?: string; error?: string }> {
  const { userId, consultancySlug, studentMembershipPublicId } = params;
  const context = await resolveConsultancyContext(userId, consultancySlug);
  if (!context) {
    return { success: false, error: "Acesso negado à consultoria." };
  }

  const template = await ensureSystemFormTemplate(context.consultancyId, userId, "physical-assessment");

  try {
    const assignRes = await assignFormToStudents(consultancySlug, userId, {
      formPublicId: template.publicId,
      studentMembershipPublicIds: [studentMembershipPublicId],
    });

    if (!assignRes.success) {
      return { success: false, error: assignRes.error || "Erro ao solicitar avaliação." };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao solicitar avaliação." };
  }
}

/**
 * Requests a custom form for a student.
 */
export async function requestFormForStudent(
  userId: number,
  consultancySlug: string,
  formPublicId: string,
  studentMembershipPublicId: string
): Promise<{ success: boolean; requestPublicId?: string; error?: string }> {
  const res = await assignFormToStudents(consultancySlug, userId, {
    formPublicId,
    studentMembershipPublicIds: [studentMembershipPublicId],
  });
  return { success: res.success, error: res.error };
}

/**
 * Lists all pending requests for a student within a tenancy.
 */
export async function listStudentPendingRequests(
  consultancyId: number,
  studentUserId: number,
  consultancySlug: string
): Promise<StudentPendingRequestDto[]> {
  await ensureConsultancyFormsSchema();
  const conn = await getDbConnection();
  try {
    const requests: StudentPendingRequestDto[] = [];

    // 1. Pending Photo Evaluation Requests
    const [photoRows] = await conn.execute<RowDataPacket[]>(
      `SELECT
        r.public_id,
        r.instructions,
        r.created_at,
        u_prof.full_name AS requester_name
       FROM student_photo_evaluation_requests r
       JOIN consultancy_members cm ON cm.id = r.student_membership_id
       LEFT JOIN users u_prof ON u_prof.id = r.requested_by_user_id
       WHERE r.consultancy_id = ?
         AND cm.user_id = ?
         AND r.status IN ('PENDING', 'CHANGES_REQUESTED')
       ORDER BY r.created_at DESC;`,
      [consultancyId, studentUserId]
    );

    for (const r of photoRows) {
      requests.push({
        publicId: String(r.public_id),
        type: "PHOTOS",
        title: "Envio de Fotos de Avaliação",
        description: r.instructions ? String(r.instructions) : "Envie as 4 fotos padronizadas para acompanhamento da sua evolução.",
        requestedByName: r.requester_name ? String(r.requester_name) : "Seu treinador",
        requestedAt: new Date(r.created_at).toISOString(),
        deepLink: `/consultoria/${consultancySlug}/progresso?tab=fotos`,
        ctaText: "Enviar fotos",
      });
    }

    // 2. Pending Form Assignments (consultancy_form_assignments)
    const [formRows] = await conn.execute<RowDataPacket[]>(
      `SELECT
        cfa.public_id,
        cfa.created_at,
        cf.title AS form_title,
        cf.description AS form_description,
        u_prof.full_name AS requester_name
       FROM consultancy_form_assignments cfa
       JOIN consultancy_forms cf ON cf.id = cfa.form_id
       LEFT JOIN users u_prof ON u_prof.id = cfa.assigned_by_user_id
       WHERE cfa.consultancy_id = ?
         AND cfa.student_user_id = ?
         AND cfa.status = 'PENDING'
       ORDER BY cfa.created_at DESC;`,
      [consultancyId, studentUserId]
    );

    for (const r of formRows) {
      const title = String(r.form_title);
      const titleLower = title.toLowerCase();
      let type: StudentPendingRequestDto["type"] = "CUSTOM_FORM";
      if (titleLower.includes("anamnes")) type = "ANAMNESIS";
      else if (titleLower.includes("avalia") || titleLower.includes("medid")) type = "ASSESSMENT";

      requests.push({
        publicId: String(r.public_id),
        type,
        title: `Formulário: ${title}`,
        description: r.form_description ? String(r.form_description) : "Preencha as informações solicitadas pelo seu profissional.",
        requestedByName: r.requester_name ? String(r.requester_name) : "Seu profissional",
        requestedAt: new Date(r.created_at).toISOString(),
        deepLink: `/consultoria/${consultancySlug}/formularios/${r.public_id}`,
        ctaText: "Preencher formulário",
      });
    }

    return requests;
  } finally {
    conn.release();
  }
}
