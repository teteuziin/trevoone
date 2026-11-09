"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import { getDbConnection } from "@/lib/db/mysql";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import {
  createPhotoEvaluationWithImagesByProfessional,
  deletePhotoEvaluationByProfessional,
  createPhotoEvaluationRequest,
  type PhotoEvaluationPose,
} from "@/lib/consultancies/photo-evaluations";
import {
  createConsultancyForm,
  assignFormToStudents,
  submitFormResponses,
  type FormQuestionDefinition,
} from "@/lib/consultancies/forms";

function sanitizeActionError(err: unknown, defaultMessage: string): string {
  if (err instanceof Error && err.message) {
    const msg = err.message;
    const isTechnicalSqlError =
      /SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN|ER_|SQL|column|table|database|syntax|deadlock|foreign key|constraint|handshake|packet|ECONNREFUSED|PROTOCOL_/i.test(
        msg
      );
    if (!isTechnicalSqlError && msg.trim().length > 0 && msg.length < 250) {
      return msg;
    }
  }
  return defaultMessage;
}

// ============================================================================
// 1. ADD PHOTO EVALUATION BY PROFESSIONAL
// ============================================================================

export async function addPhotoEvaluationAction(
  slug: string,
  studentPublicId: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const evaluationDate = formData.get("evaluationDate") as string | null;
  const reviewerNotes = formData.get("reviewerNotes") as string | null;

  const poses: Array<{ pose: PhotoEvaluationPose; field: string }> = [
    { pose: "FRONT", field: "pose_FRONT" },
    { pose: "BACK", field: "pose_BACK" },
    { pose: "RIGHT_SIDE", field: "pose_RIGHT_SIDE" },
    { pose: "LEFT_SIDE", field: "pose_LEFT_SIDE" },
  ];

  const images: Array<{
    pose: PhotoEvaluationPose;
    buffer: Buffer;
    clientMimeType?: string;
  }> = [];

  for (const item of poses) {
    const file = formData.get(item.field);
    if (file && file instanceof File && file.size > 0) {
      const arrayBuffer = await file.arrayBuffer();
      images.push({
        pose: item.pose,
        buffer: Buffer.from(arrayBuffer),
        clientMimeType: file.type,
      });
    }
  }

  if (images.length === 0) {
    return { success: false, error: "Nenhuma foto foi selecionada para envio." };
  }

  const result = await createPhotoEvaluationWithImagesByProfessional({
    professionalUserId: session.userId,
    consultancySlug: slug,
    studentMembershipPublicId: studentPublicId,
    evaluationDate: evaluationDate || undefined,
    reviewerNotes: reviewerNotes || undefined,
    images,
  });

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/progresso/alunos/${studentPublicId}`);
  }

  return result;
}

// ============================================================================
// 2. DELETE PHOTO EVALUATION BY PROFESSIONAL
// ============================================================================

export async function deletePhotoEvaluationAction(
  slug: string,
  studentPublicId: string,
  requestPublicId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const result = await deletePhotoEvaluationByProfessional({
    professionalUserId: session.userId,
    consultancySlug: slug,
    requestPublicId,
  });

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/progresso/alunos/${studentPublicId}`);
  }

  return result;
}

// ============================================================================
// 3. REQUEST PHOTO EVALUATION FROM STUDENT
// ============================================================================

export async function requestPhotoEvaluationAction(
  slug: string,
  studentPublicId: string,
  instructions?: string,
  dueAt?: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const result = await createPhotoEvaluationRequest({
    professionalUserId: session.userId,
    consultancySlug: slug,
    studentPublicId: studentPublicId,
    instructions,
    dueAt,
  });

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/progresso/alunos/${studentPublicId}`);
  }

  return result;
}

// ============================================================================
// 4. CREATE / SEND / FILL FORM OR ANAMNESIS
// ============================================================================

export interface SaveAndSendOrFillFormParams {
  templatePublicId?: string;
  title?: string;
  description?: string;
  fields?: FormQuestionDefinition[];
  mode: "SEND_TO_STUDENT" | "FILL_WITH_STUDENT";
  responses?: Record<string, unknown>;
  isAnamnesis?: boolean;
}

export async function saveAndSendOrFillFormAction(
  slug: string,
  studentPublicId: string,
  params: SaveAndSendOrFillFormParams
): Promise<{ success: boolean; requestPublicId?: string; error?: string }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  try {
    let targetTemplatePublicId = params.templatePublicId;

    if (!targetTemplatePublicId) {
      if (!params.title || !params.title.trim()) {
        return { success: false, error: "O título do formulário é obrigatório." };
      }
      if (!params.fields || params.fields.length === 0) {
        return { success: false, error: "Adicione pelo menos uma pergunta ao formulário." };
      }

      const createdTemplate = await createConsultancyForm(slug, session.userId, {
        title: params.title.trim(),
        description: params.description?.trim() || null,
        questions: params.fields,
      });

      targetTemplatePublicId = createdTemplate.publicId;
    }

    const assignRes = await assignFormToStudents(slug, session.userId, {
      formPublicId: targetTemplatePublicId,
      studentMembershipPublicIds: [studentPublicId],
    });

    if (!assignRes.success) {
      return {
        success: false,
        error: sanitizeActionError(new Error(assignRes.error || ""), "Não foi possível atribuir o formulário ao aluno. Tente novamente."),
      };
    }

    revalidatePath(`/consultoria/${slug}/progresso/alunos/${studentPublicId}`);
    return { success: true };
  } catch (err) {
    console.error("\n======================================================");
    console.error("[saveAndSendOrFillFormAction] CRITICAL ERROR CAUGHT! FULL STACK TRACE:");
    console.error(err instanceof Error ? err.stack : err);
    console.error("======================================================\n");
    return {
      success: false,
      error: sanitizeActionError(err, "Não foi possível processar o formulário. Tente novamente."),
    };
  }
}

// ============================================================================
// 5. SUBMIT RESPONSES FOR EXISTING PENDING REQUEST
// ============================================================================

export async function submitResponsesForExistingRequestAction(
  slug: string,
  studentPublicId: string,
  requestPublicId: string,
  responses: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  try {
    const res = await submitFormResponses(slug, session.userId, requestPublicId, responses);
    revalidatePath(`/consultoria/${slug}/progresso/alunos/${studentPublicId}`);
    return res;
  } catch (err) {
    console.error("[submitResponsesForExistingRequestAction] Error:", err);
    return {
      success: false,
      error: sanitizeActionError(err, "Não foi possível salvar as respostas do formulário. Tente novamente."),
    };
  }
}

// ============================================================================
// 6. DELETE / CANCEL FORM REQUEST
// ============================================================================

export async function deleteFormRequestAction(
  slug: string,
  studentPublicId: string,
  requestPublicId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    return { success: false, error: "Consultoria não encontrada." };
  }

  const connection = await getDbConnection();
  try {
    await connection.execute(
      `DELETE FROM consultancy_form_assignments WHERE public_id = ? AND consultancy_id = ?`,
      [requestPublicId, context.consultancyId]
    );
  } catch (err: unknown) {
    console.error("[deleteFormRequestAction] Error:", err);
  } finally {
    connection.release();
  }

  revalidatePath(`/consultoria/${slug}/progresso/alunos/${studentPublicId}`);
  revalidatePath(`/consultoria/${slug}/formularios`);
  return { success: true };
}


// ============================================================================
// 7. UPDATE STUDENT BIOMETRICS & CADASTRE
// ============================================================================

export async function updateStudentPersonalDataAction(
  slug: string,
  studentPublicId: string,
  data: {
    weightKg?: number | null;
    heightCm?: number | null;
    objective?: string | null;
    phone?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    return { success: false, error: "Consultoria não encontrada." };
  }

  const connection = await getDbConnection();
  try {
    const [mRows] = await connection.execute(
      `SELECT cm.id, cm.user_id FROM consultancy_members cm
       WHERE cm.consultancy_id = ? AND cm.public_id = ? LIMIT 1;`,
      [context.consultancyId, studentPublicId]
    );

    if (!Array.isArray(mRows) || mRows.length === 0) {
      return { success: false, error: "Aluno não encontrado nesta consultoria." };
    }

    const memberId = Number((mRows[0] as { id: number; user_id: number }).id);
    const userId = Number((mRows[0] as { id: number; user_id: number }).user_id);

    if (data.phone !== undefined) {
      await connection.execute(
        `UPDATE users SET phone = ?, updated_at = NOW(3) WHERE id = ?;`,
        [data.phone?.trim() || null, userId]
      );
    }

    if (data.weightKg !== undefined && data.weightKg !== null && !isNaN(data.weightKg)) {
      await connection.execute(
        `INSERT INTO student_progress_records (public_id, consultancy_id, membership_id, recorded_on, weight_kg, created_at, updated_at)
         VALUES (UUID(), ?, ?, CURRENT_DATE(), ?, NOW(3), NOW(3));`,
        [context.consultancyId, memberId, data.weightKg]
      );
    }

    if (data.objective !== undefined || data.heightCm !== undefined || data.weightKg !== undefined) {
      const [intakeRows] = await connection.execute(
        `SELECT id, responses_json FROM student_intake_submissions
         WHERE consultancy_id = ? AND membership_id = ?
         ORDER BY id DESC LIMIT 1;`,
        [context.consultancyId, memberId]
      );

      let currentJson: Record<string, unknown> = {};
      if (Array.isArray(intakeRows) && intakeRows.length > 0) {
        try {
          const raw = (intakeRows[0] as { responses_json: unknown }).responses_json;
          currentJson = typeof raw === "string" ? JSON.parse(raw) : (raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {});
        } catch {}
      }

      if (data.objective !== undefined) currentJson.main_goal = data.objective?.trim() || null;
      if (data.heightCm !== undefined) currentJson.height = data.heightCm;
      if (data.weightKg !== undefined) currentJson.weight = data.weightKg;

      if (Array.isArray(intakeRows) && intakeRows.length > 0) {
        await connection.execute(
          `UPDATE student_intake_submissions SET responses_json = ?, updated_at = NOW(3) WHERE id = ?;`,
          [JSON.stringify(currentJson), (intakeRows[0] as { id: number }).id]
        );
      } else {
        await connection.execute(
          `INSERT INTO student_intake_submissions (public_id, consultancy_id, membership_id, status, submitted_at, responses_json, created_at, updated_at)
           VALUES (UUID(), ?, ?, 'SUBMITTED', NOW(3), ?, NOW(3), NOW(3));`,
          [context.consultancyId, memberId, JSON.stringify(currentJson)]
        );
      }
    }

    revalidatePath(`/consultoria/${slug}/progresso/alunos/${studentPublicId}`);
    return { success: true };
  } catch (err) {
    console.error("[updateStudentPersonalDataAction] Error:", err);
    return { success: false, error: sanitizeActionError(err, "Falha ao salvar dados do aluno.") };
  } finally {
    connection.release();
  }
}
