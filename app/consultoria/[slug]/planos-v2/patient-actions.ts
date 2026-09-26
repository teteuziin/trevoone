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
  StudentNotFoundError,
} from "@/lib/nutrition-v2/patient-record-repository";
import type {
  UpdatePatientRecordInput,
  AddAnthropometricEntryInput,
  UpdatePregnancyInput,
  PatientRecordDetail,
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
