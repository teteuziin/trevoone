"use server";

import { revalidatePath } from "next/cache";
import type { RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "@/lib/db/mysql";
import { resolveNutritionAccessContext } from "@/lib/nutrition-v2/access";
import {
  getPatientRecordDetail,
  updatePatientRecord,
  addAnthropometricEntry,
  deleteAnthropometricEntry,
  upsertPregnancyRecord,
  listPatientsForConsultancy,
  savePatientClinicalNote,
  listPatientClinicalNotes,
  finalizePatientClinicalNote,
  deletePatientClinicalNote,
  markPatientFieldReviewed,
  StudentNotFoundError,
} from "@/lib/nutrition-v2/patient-record-repository";
import type {
  UpdatePatientRecordInput,
  AddAnthropometricEntryInput,
  UpdatePregnancyInput,
  PatientRecordDetail,
  SaveClinicalNoteInput,
  PatientClinicalNoteDto,
} from "@/lib/nutrition-v2/patient-record-types";

async function resolveProfessionalStudentContext(
  slug: string,
  studentPublicId: string,
  requireAuthor = false
) {
  const ctx = await resolveNutritionAccessContext(slug);
  if (!ctx || !ctx.consultancyId || !ctx.membershipId) {
    throw new Error("Não autorizado ou sessão inválida.");
  }

  if (requireAuthor && !ctx.canAuthorNutrition) {
    throw new Error("Acesso negado: apenas Nutricionistas da consultoria podem editar prontuários clínicos.");
  }

  const canAccess = ctx.canViewNutrition;
  if (!canAccess) {
    throw new Error("Acesso restrito aos profissionais de nutrição e administradores.");
  }

  // Resolve student membership strictly within the authorized tenancy
  const connection = await getDbConnection();
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id AS student_membership_id, cm.status
       FROM consultancy_members cm
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id AND cmr.role = 'STUDENT'
       WHERE cm.public_id = ? AND cm.consultancy_id = ? AND cm.status = 'ACTIVE';`,
      [studentPublicId.trim(), ctx.consultancyId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      throw new StudentNotFoundError("Paciente não encontrado ou inativo nesta consultoria.");
    }

    return {
      ctx,
      studentMembershipId: Number(rows[0].student_membership_id),
    };
  } finally {
    connection.release();
  }
}

export async function getPatientRecordDetailAction(
  slug: string,
  studentPublicId: string
): Promise<{ success: boolean; error?: string; detail?: PatientRecordDetail }> {
  try {
    const { ctx, studentMembershipId } = await resolveProfessionalStudentContext(slug, studentPublicId, false);
    const detail = await getPatientRecordDetail(ctx.consultancyId!, studentMembershipId, ctx.membershipId!);
    return { success: true, detail };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao carregar prontuário do paciente.";
    return { success: false, error: message };
  }
}

export async function updatePatientRecordAction(
  slug: string,
  studentPublicId: string,
  input: UpdatePatientRecordInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const { ctx, studentMembershipId } = await resolveProfessionalStudentContext(slug, studentPublicId, true);
    await updatePatientRecord(ctx.consultancyId!, studentMembershipId, ctx.membershipId!, input);
    revalidatePath(`/consultoria/${slug}/planos-v2/prontuario/${studentPublicId}`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao salvar prontuário.";
    return { success: false, error: message };
  }
}

export async function addAnthropometricEntryAction(
  slug: string,
  studentPublicId: string,
  input: AddAnthropometricEntryInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const { ctx, studentMembershipId } = await resolveProfessionalStudentContext(slug, studentPublicId, true);
    await addAnthropometricEntry(ctx.consultancyId!, studentMembershipId, ctx.membershipId!, input);
    revalidatePath(`/consultoria/${slug}/planos-v2/prontuario/${studentPublicId}`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao adicionar medição antropométrica.";
    return { success: false, error: message };
  }
}

export async function deleteAnthropometricEntryAction(
  slug: string,
  studentPublicId: string,
  anthropometricPublicId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { ctx, studentMembershipId } = await resolveProfessionalStudentContext(slug, studentPublicId, true);
    await deleteAnthropometricEntry(ctx.consultancyId!, studentMembershipId, ctx.membershipId!, anthropometricPublicId);
    revalidatePath(`/consultoria/${slug}/planos-v2/prontuario/${studentPublicId}`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao remover medição.";
    return { success: false, error: message };
  }
}

export async function updatePregnancyAction(
  slug: string,
  studentPublicId: string,
  input: UpdatePregnancyInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const { ctx, studentMembershipId } = await resolveProfessionalStudentContext(slug, studentPublicId, true);
    await upsertPregnancyRecord(ctx.consultancyId!, studentMembershipId, ctx.membershipId!, input);
    revalidatePath(`/consultoria/${slug}/planos-v2/prontuario/${studentPublicId}`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao atualizar dados gestacionais.";
    return { success: false, error: message };
  }
}

export async function savePatientClinicalNoteAction(
  slug: string,
  studentPublicId: string,
  input: SaveClinicalNoteInput
): Promise<{ success: boolean; error?: string; note?: PatientClinicalNoteDto }> {
  try {
    const { ctx, studentMembershipId } = await resolveProfessionalStudentContext(slug, studentPublicId, true);
    const note = await savePatientClinicalNote(ctx.consultancyId!, studentMembershipId, ctx.membershipId!, input);
    revalidatePath(`/consultoria/${slug}/planos-v2/prontuario/${studentPublicId}`);
    return { success: true, note };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao salvar anotação clínica.";
    return { success: false, error: message };
  }
}

export async function finalizePatientClinicalNoteAction(
  slug: string,
  studentPublicId: string,
  notePublicId: string
): Promise<{ success: boolean; error?: string; note?: PatientClinicalNoteDto }> {
  try {
    const { ctx, studentMembershipId } = await resolveProfessionalStudentContext(slug, studentPublicId, true);
    const note = await finalizePatientClinicalNote(ctx.consultancyId!, studentMembershipId, ctx.membershipId!, notePublicId);
    revalidatePath(`/consultoria/${slug}/planos-v2/prontuario/${studentPublicId}`);
    return { success: true, note };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao finalizar anotação clínica.";
    return { success: false, error: message };
  }
}

export async function deletePatientClinicalNoteAction(
  slug: string,
  studentPublicId: string,
  notePublicId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { ctx, studentMembershipId } = await resolveProfessionalStudentContext(slug, studentPublicId, true);
    await deletePatientClinicalNote(ctx.consultancyId!, studentMembershipId, ctx.membershipId!, notePublicId);
    revalidatePath(`/consultoria/${slug}/planos-v2/prontuario/${studentPublicId}`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao excluir anotação.";
    return { success: false, error: message };
  }
}

export async function listPatientClinicalNotesAction(
  slug: string,
  studentPublicId: string
): Promise<{ success: boolean; error?: string; notes?: PatientClinicalNoteDto[] }> {
  try {
    const { ctx, studentMembershipId } = await resolveProfessionalStudentContext(slug, studentPublicId, false);
    const notes = await listPatientClinicalNotes(
      ctx.consultancyId!,
      studentMembershipId,
      ctx.canAuthorNutrition || ctx.canManageConsultancy || ctx.isPlatformAdmin,
      ctx.membershipId!
    );
    return { success: true, notes };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao listar anotações clínicas.";
    return { success: false, error: message };
  }
}

export async function markPatientFieldReviewedAction(
  slug: string,
  studentPublicId: string,
  fieldName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { ctx, studentMembershipId } = await resolveProfessionalStudentContext(slug, studentPublicId, true);
    const connection = await getDbConnection();
    let reviewerName = "Nutricionista Responsável";
    try {
      const [uRows] = await connection.execute<RowDataPacket[]>(
        `SELECT u.full_name FROM users u WHERE u.id = ?;`,
        [ctx.userId]
      );
      if (Array.isArray(uRows) && uRows.length > 0 && uRows[0].full_name) {
        reviewerName = String(uRows[0].full_name);
      }
    } finally {
      connection.release();
    }

    await markPatientFieldReviewed(
      ctx.consultancyId!,
      studentMembershipId,
      ctx.membershipId!,
      fieldName,
      reviewerName
    );
    revalidatePath(`/consultoria/${slug}/planos-v2/prontuario/${studentPublicId}`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao marcar campo como revisado.";
    return { success: false, error: message };
  }
}

export async function listPatientsAction(
  slug: string,
  search?: string
): Promise<{ success: boolean; error?: string; patients?: Awaited<ReturnType<typeof listPatientsForConsultancy>> }> {
  try {
    const ctx = await resolveNutritionAccessContext(slug);
    if (!ctx || !ctx.consultancyId || !ctx.membershipId) {
      throw new Error("Não autorizado ou sessão inválida.");
    }
    const isProfessional = ctx.canAuthorNutrition || ctx.canManageConsultancy || ctx.isPlatformAdmin;
    if (!isProfessional) {
      throw new Error("Acesso restrito.");
    }
    const patients = await listPatientsForConsultancy(ctx.consultancyId, search);
    return { success: true, patients };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao listar pacientes.";
    return { success: false, error: message };
  }
}
