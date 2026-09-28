import * as crypto from "node:crypto";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { getDbConnection } from "@/lib/db/mysql";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { createPhotoEvaluationRequest, type PhotoEvaluationPose } from "@/lib/consultancies/photo-evaluations";
import { requestFormForStudent } from "@/lib/consultancies/custom-forms";
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
  const conn = await getDbConnection();
  try {
    const isAnamnesis = formKey === "complete-anamnesis";
    const title = isAnamnesis ? "Anamnese & Histórico de Saúde" : "Avaliação Física & Medidas";
    const description = isAnamnesis
      ? "Questionário detalhado de saúde, histórico médico, rotina e preferências."
      : "Avaliação física padronizada e histórico de medidas corporais.";
    const schemaDef = isAnamnesis ? COMPLETE_ANAMNESIS_FORM_V1 : PHYSICAL_ASSESSMENT_FORM_V1;

    // Check if template already exists
    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT id, public_id, title
       FROM consultancy_custom_form_templates
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
    const fields = schemaDef.fields.map((f) => ({
      id: f.key,
      label: f.label,
      type: f.type === "SINGLE_CHOICE" ? "SELECT" : f.type === "LONG_TEXT" ? "TEXTAREA" : "TEXT",
      required: f.required,
      options: f.options || [],
    }));

    const [res] = await conn.execute<ResultSetHeader>(
      `INSERT INTO consultancy_custom_form_templates (
        public_id, consultancy_id, title, description, fields_json,
        is_active, is_onboarding_required, created_by_user_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 1, 0, ?, NOW(3), NOW(3));`,
      [publicId, consultancyId, title, description, JSON.stringify(fields), userId]
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
  const conn = await getDbConnection();
  try {
    const [rows] = await conn.execute<RowDataPacket[]>(
      `SELECT id, public_id, title, description, fields_json
       FROM consultancy_custom_form_templates
       WHERE consultancy_id = ? AND is_active = 1 AND deleted_at IS NULL
       ORDER BY created_at ASC;`,
      [consultancyId]
    );

    const templates: AvailableFormTemplateOption[] = rows.map((r) => {
      let fields: unknown[] = [];
      try {
        fields = typeof r.fields_json === "string" ? JSON.parse(r.fields_json) : (r.fields_json || []);
      } catch {
        fields = [];
      }

      const titleLower = String(r.title).toLowerCase();
      let category: AvailableFormTemplateOption["category"] = "CUSTOM";
      if (titleLower.includes("anamnes")) category = "ANAMNESIS";
      else if (titleLower.includes("avalia") || titleLower.includes("medid")) category = "ASSESSMENT";

      return {
        publicId: String(r.public_id),
        title: String(r.title),
        description: r.description ? String(r.description) : null,
        fieldsCount: Array.isArray(fields) ? fields.length : 0,
        category,
      };
    });

    return templates;
  } finally {
    conn.release();
  }
}

/**
 * Requests photos from an active student in the consultancy.
 */
export async function requestStudentPhotos(params: {
  userId: number;
  consultancySlug: string;
  studentMembershipPublicId: string;
  requestedPoses?: PhotoEvaluationPose[];
  instructions?: string;
}): Promise<{ success: boolean; requestPublicId?: string; error?: string }> {
  const { userId, consultancySlug, studentMembershipPublicId, instructions } = params;

  return createPhotoEvaluationRequest({
    professionalUserId: userId,
    consultancySlug,
    studentPublicId: studentMembershipPublicId,
    instructions: instructions || null,
  });
}

/**
 * Requests Anamnese from an active student.
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

  // Ensure system template exists for complete-anamnesis
  const template = await ensureSystemFormTemplate(context.consultancyId, userId, "complete-anamnesis");

  try {
    const req = await requestFormForStudent(
      userId,
      consultancySlug,
      template.publicId,
      studentMembershipPublicId
    );

    return { success: true, requestPublicId: req.publicId };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao solicitar anamnese." };
  }
}

/**
 * Requests Physical Assessment from an active student.
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

  // Ensure system template exists for physical-assessment
  const template = await ensureSystemFormTemplate(context.consultancyId, userId, "physical-assessment");

  try {
    const req = await requestFormForStudent(
      userId,
      consultancySlug,
      template.publicId,
      studentMembershipPublicId
    );

    return { success: true, requestPublicId: req.publicId };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erro ao solicitar avaliação." };
  }
}

/**
 * Lists all pending requests for a student within a tenancy.
 */
export async function listStudentPendingRequests(
  consultancyId: number,
  studentUserId: number,
  consultancySlug: string
): Promise<StudentPendingRequestDto[]> {
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

    // 2. Pending Custom Form Requests (including Anamnese and Assessment)
    const [formRows] = await conn.execute<RowDataPacket[]>(
      `SELECT
        r.public_id,
        r.created_at,
        t.title AS template_title,
        t.description AS template_description,
        u_prof.full_name AS requester_name
       FROM consultancy_custom_form_requests r
       JOIN consultancy_custom_form_templates t ON t.id = r.template_id
       LEFT JOIN users u_prof ON u_prof.id = r.requested_by_user_id
       WHERE r.consultancy_id = ?
         AND r.student_user_id = ?
         AND r.status = 'PENDING'
       ORDER BY r.created_at DESC;`,
      [consultancyId, studentUserId]
    );

    for (const r of formRows) {
      const title = String(r.template_title);
      const titleLower = title.toLowerCase();
      let type: StudentPendingRequestDto["type"] = "CUSTOM_FORM";
      if (titleLower.includes("anamnes")) type = "ANAMNESIS";
      else if (titleLower.includes("avalia") || titleLower.includes("medid")) type = "ASSESSMENT";

      requests.push({
        publicId: String(r.public_id),
        type,
        title: `Formulário: ${title}`,
        description: r.template_description ? String(r.template_description) : "Preencha as informações solicitadas pelo seu profissional.",
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
