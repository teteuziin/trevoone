"use server";

import { revalidatePath } from "next/cache";
import type { RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "@/lib/db/mysql";
import { resolveNutritionAccessContext } from "@/lib/nutrition-v2/access";
import {
  recordStudentFoodPhoto,
  recordStudentPatientNote,
  getFollowupTimelineForPatient,
} from "@/lib/nutrition-v2/followup-service";
import type {
  FollowupMealType,
  FollowupEventRowDto,
  PatientFollowupHubSummaryDto,
} from "@/lib/nutrition-v2/followup-types";

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

/**
 * Resolves a student's internal membership ID from their public ID within a consultancy.
 */
async function resolveStudentMembership(
  consultancyId: number,
  studentPublicId: string
): Promise<{ id: number; userId: number; fullName: string } | null> {
  const connection = await getDbConnection();
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id, cm.user_id, u.full_name
       FROM consultancy_members cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.public_id = ?
         AND cm.consultancy_id = ?
         AND cm.status = 'ACTIVE'
       LIMIT 1;`,
      [studentPublicId, consultancyId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    return {
      id: Number(rows[0].id),
      userId: Number(rows[0].user_id),
      fullName: String(rows[0].full_name),
    };
  } finally {
    connection.release();
  }
}

/**
 * Action: Student uploads and records a food photo.
 */
export async function recordStudentFoodPhotoAction(
  slug: string,
  formData: FormData
): Promise<ActionResult<FollowupEventRowDto>> {
  if (!slug || !formData) {
    return { success: false, error: "Dados incompletos para envio.", code: "INVALID_INPUT" };
  }

  const access = await resolveNutritionAccessContext(slug);
  if (!access || !access.isStudent || !access.consultancyId || !access.membershipId) {
    return {
      success: false,
      error: "Apenas alunos vinculados podem registrar fotos de alimentação.",
      code: "FORBIDDEN",
    };
  }

  const file = formData.get("photo") as File | null;
  if (!file || !(file instanceof File) || file.size === 0) {
    return { success: false, error: "Selecione uma foto da refeição para enviar.", code: "NO_FILE" };
  }

  const mealTypeRaw = formData.get("mealType") as string | null;
  const captionRaw = formData.get("caption") as string | null;
  const occurredAtRaw = formData.get("occurredAt") as string | null;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const event = await recordStudentFoodPhoto({
      consultancyId: access.consultancyId,
      studentMembershipId: access.membershipId,
      authorMembershipId: access.membershipId,
      buffer,
      originalFileName: file.name || "refeicao.jpg",
      clientMimeType: file.type,
      mealType: (mealTypeRaw as FollowupMealType) || null,
      caption: captionRaw || null,
      occurredAt: occurredAtRaw || undefined,
    });

    revalidatePath(`/consultoria/${slug}/nutricao`);
    return { success: true, data: event };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro ao salvar foto da refeição.";
    return { success: false, error: errorMsg, code: "SAVE_FAILED" };
  }
}

/**
 * Action: Student records a clinical observation / note.
 */
export async function recordStudentPatientNoteAction(
  slug: string,
  input: { caption: string; occurredAt?: string }
): Promise<ActionResult<FollowupEventRowDto>> {
  if (!slug || !input || !input.caption?.trim()) {
    return { success: false, error: "A observação é obrigatória.", code: "INVALID_INPUT" };
  }

  const access = await resolveNutritionAccessContext(slug);
  if (!access || !access.isStudent || !access.consultancyId || !access.membershipId) {
    return {
      success: false,
      error: "Apenas alunos vinculados podem registrar anotações.",
      code: "FORBIDDEN",
    };
  }

  try {
    const event = await recordStudentPatientNote({
      consultancyId: access.consultancyId,
      studentMembershipId: access.membershipId,
      authorMembershipId: access.membershipId,
      caption: input.caption,
      occurredAt: input.occurredAt || undefined,
    });

    revalidatePath(`/consultoria/${slug}/nutricao`);
    return { success: true, data: event };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro ao salvar anotação.";
    return { success: false, error: errorMsg, code: "SAVE_FAILED" };
  }
}

/**
 * Action: Fetches unified followup timeline for a student.
 * Accessible by authorized professionals or by the student themselves.
 */
export async function getPatientFollowupTimelineAction(
  slug: string,
  studentPublicId?: string
): Promise<ActionResult<PatientFollowupHubSummaryDto>> {
  if (!slug) {
    return { success: false, error: "Consultoria não informada.", code: "INVALID_INPUT" };
  }

  const access = await resolveNutritionAccessContext(slug);
  if (!access || !access.consultancyId) {
    return { success: false, error: "Acesso não autorizado.", code: "FORBIDDEN" };
  }

  let targetStudentMembershipId: number | null = null;

  if (studentPublicId && access.canViewNutrition) {
    // Professional viewing a student
    const student = await resolveStudentMembership(access.consultancyId, studentPublicId);
    if (!student) {
      return { success: false, error: "Paciente não encontrado.", code: "NOT_FOUND" };
    }
    targetStudentMembershipId = student.id;
  } else if (access.isStudent && access.membershipId) {
    // Student viewing their own timeline
    targetStudentMembershipId = access.membershipId;
  } else {
    return { success: false, error: "Acesso negado à linha do tempo.", code: "FORBIDDEN" };
  }

  try {
    const summary = await getFollowupTimelineForPatient(
      access.consultancyId,
      targetStudentMembershipId
    );
    return { success: true, data: summary };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro ao carregar acompanhamento.";
    return { success: false, error: errorMsg, code: "LOAD_FAILED" };
  }
}
