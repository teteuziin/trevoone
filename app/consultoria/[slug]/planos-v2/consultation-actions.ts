"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveNutritionAccessContext } from "@/lib/nutrition-v2/access";
import { getDbConnection } from "@/lib/db/mysql";
import type { RowDataPacket } from "mysql2/promise";
import type {
  CreateClinicalConsultationInput,
  UpdateClinicalConsultationInput,
  ClinicalConsultationDetailDto,
  PatientConsultationHubSummaryDto,
} from "@/lib/nutrition-v2/clinical-consultation-types";
import {
  findDraftConsultationForStudent,
  createClinicalConsultationDraft,
  updateClinicalConsultationDraft,
  completeClinicalConsultation,
  cancelClinicalConsultation,
  getClinicalConsultationDetail,
  getPatientConsultationHubSummary,
} from "@/lib/nutrition-v2/clinical-consultation-repository";

export type ConsultationActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string; existingDraftPublicId?: string };

/**
 * Resolves a student's membership ID from public identifier within a tenancy context.
 */
async function resolveStudentMembershipId(
  consultancyId: number,
  studentPublicId: string
): Promise<{ id: number; publicId: string } | null> {
  const connection = await getDbConnection();
  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT cm.id, cm.public_id
       FROM consultancy_members cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.consultancy_id = ? AND cm.public_id = ?
       LIMIT 1`,
      [consultancyId, studentPublicId]
    );

    if (!rows || rows.length === 0) return null;
    return { id: Number(rows[0].id), publicId: String(rows[0].public_id) };
  } finally {
    connection.release();
  }
}

/**
 * Fetches summary of clinical consultations for Patient Hub.
 */
export async function getPatientConsultationsHubAction(
  slug: string,
  studentPublicId: string
): Promise<ConsultationActionResult<PatientConsultationHubSummaryDto>> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente.", code: "UNAUTHENTICATED" };
  }

  const access = await resolveNutritionAccessContext(slug);
  if (!access || !access.canViewNutrition || !access.consultancyId) {
    return { success: false, error: "Acesso negado às consultas clínicas.", code: "FORBIDDEN" };
  }

  const student = await resolveStudentMembershipId(access.consultancyId, studentPublicId);
  if (!student) {
    return { success: false, error: "Aluno não encontrado nesta consultoria.", code: "STUDENT_NOT_FOUND" };
  }

  try {
    const summary = await getPatientConsultationHubSummary(access.consultancyId, student.id);
    return { success: true, data: summary };
  } catch (err) {
    console.error("[getPatientConsultationsHubAction] Error:", err);
    return { success: false, error: "Erro ao buscar histórico de consultas.", code: "INTERNAL_ERROR" };
  }
}

/**
 * Creates a new clinical consultation DRAFT.
 * If an active draft already exists for this student, alerts caller with existing draft public ID.
 */
export async function createClinicalConsultationAction(
  slug: string,
  studentPublicId: string,
  input: CreateClinicalConsultationInput
): Promise<ConsultationActionResult<{ consultationPublicId: string }>> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente.", code: "UNAUTHENTICATED" };
  }

  const access = await resolveNutritionAccessContext(slug);
  if (!access || !access.canAuthorNutrition || !access.consultancyId || !access.membershipId) {
    return { success: false, error: "Você não tem permissão para registrar consultas clínicas.", code: "FORBIDDEN" };
  }

  const student = await resolveStudentMembershipId(access.consultancyId, studentPublicId);
  if (!student) {
    return { success: false, error: "Aluno não encontrado nesta consultoria.", code: "STUDENT_NOT_FOUND" };
  }

  try {
    // Check if an active draft already exists for this student
    const existingDraft = await findDraftConsultationForStudent(access.consultancyId, student.id);
    if (existingDraft) {
      return {
        success: false,
        error: "Já existe uma consulta em andamento para este paciente.",
        code: "ACTIVE_DRAFT_EXISTS",
        existingDraftPublicId: existingDraft.publicId,
      };
    }

    const created = await createClinicalConsultationDraft({
      consultancyId: access.consultancyId,
      studentMembershipId: student.id,
      professionalMembershipId: access.membershipId,
      input,
    });

    revalidatePath(`/consultoria/${slug}/planos-v2/prontuario/${studentPublicId}`);
    revalidatePath(`/consultoria/${slug}/consultas`);

    return {
      success: true,
      data: { consultationPublicId: created.publicId },
    };
  } catch (err: unknown) {
    console.error("[createClinicalConsultationAction] Error:", err instanceof Error ? err.message : err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao criar consulta.",
      code: "INTERNAL_ERROR",
    };
  }
}

/**
 * Updates an ongoing clinical consultation DRAFT.
 */
export async function updateClinicalConsultationDraftAction(
  slug: string,
  consultationPublicId: string,
  input: UpdateClinicalConsultationInput
): Promise<ConsultationActionResult<boolean>> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente.", code: "UNAUTHENTICATED" };
  }

  const access = await resolveNutritionAccessContext(slug);
  if (!access || !access.canAuthorNutrition || !access.consultancyId) {
    return { success: false, error: "Você não tem permissão para editar esta consulta.", code: "FORBIDDEN" };
  }

  try {
    await updateClinicalConsultationDraft({
      consultancyId: access.consultancyId,
      publicId: consultationPublicId,
      input,
    });

    revalidatePath(`/consultoria/${slug}/planos-v2/prontuario`);
    revalidatePath(`/consultoria/${slug}/consultas`);

    return { success: true, data: true };
  } catch (err: unknown) {
    console.error("[updateClinicalConsultationDraftAction] Error:", err instanceof Error ? err.message : err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao atualizar consulta.",
      code: "INTERNAL_ERROR",
    };
  }
}

/**
 * Completes a clinical consultation DRAFT.
 * Once completed, the consultation becomes historically immutable.
 */
export async function completeClinicalConsultationAction(
  slug: string,
  consultationPublicId: string
): Promise<ConsultationActionResult<boolean>> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente.", code: "UNAUTHENTICATED" };
  }

  const access = await resolveNutritionAccessContext(slug);
  if (!access || !access.canAuthorNutrition || !access.consultancyId || !access.membershipId) {
    return { success: false, error: "Você não tem permissão para finalizar consultas.", code: "FORBIDDEN" };
  }

  try {
    await completeClinicalConsultation({
      consultancyId: access.consultancyId,
      publicId: consultationPublicId,
      completedByMembershipId: access.membershipId,
    });

    revalidatePath(`/consultoria/${slug}/planos-v2/prontuario`);
    revalidatePath(`/consultoria/${slug}/consultas`);

    return { success: true, data: true };
  } catch (err: unknown) {
    console.error("[completeClinicalConsultationAction] Error:", err instanceof Error ? err.message : err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao finalizar consulta.",
      code: "INTERNAL_ERROR",
    };
  }
}

/**
 * Cancels a clinical consultation DRAFT.
 */
export async function cancelClinicalConsultationAction(
  slug: string,
  consultationPublicId: string,
  cancelReason?: string
): Promise<ConsultationActionResult<boolean>> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente.", code: "UNAUTHENTICATED" };
  }

  const access = await resolveNutritionAccessContext(slug);
  if (!access || !access.canAuthorNutrition || !access.consultancyId || !access.membershipId) {
    return { success: false, error: "Você não tem permissão para cancelar consultas.", code: "FORBIDDEN" };
  }

  try {
    await cancelClinicalConsultation({
      consultancyId: access.consultancyId,
      publicId: consultationPublicId,
      canceledByMembershipId: access.membershipId,
      cancelReason,
    });

    revalidatePath(`/consultoria/${slug}/planos-v2/prontuario`);
    revalidatePath(`/consultoria/${slug}/consultas`);

    return { success: true, data: true };
  } catch (err: unknown) {
    console.error("[cancelClinicalConsultationAction] Error:", err instanceof Error ? err.message : err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao cancelar consulta.",
      code: "INTERNAL_ERROR",
    };
  }
}

/**
 * Fetches full details of a clinical consultation.
 */
export async function getClinicalConsultationDetailAction(
  slug: string,
  consultationPublicId: string
): Promise<ConsultationActionResult<ClinicalConsultationDetailDto>> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente.", code: "UNAUTHENTICATED" };
  }

  const access = await resolveNutritionAccessContext(slug);
  if (!access || !access.canViewNutrition || !access.consultancyId) {
    return { success: false, error: "Acesso negado às consultas clínicas.", code: "FORBIDDEN" };
  }

  try {
    const detail = await getClinicalConsultationDetail(access.consultancyId, consultationPublicId);
    if (!detail) {
      return { success: false, error: "Consulta não encontrada.", code: "NOT_FOUND" };
    }
    return { success: true, data: detail };
  } catch (err: unknown) {
    console.error("[getClinicalConsultationDetailAction] Error:", err instanceof Error ? err.message : err);
    return {
      success: false,
      error: "Erro ao carregar detalhes da consulta.",
      code: "INTERNAL_ERROR",
    };
  }
}
