"use server";

import { revalidatePath } from "next/cache";
import type { RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "@/lib/db/mysql";
import { resolveNutritionAccessContext } from "@/lib/nutrition-v2/access";
import {
  getPatientPlanningByStudent,
  upsertPatientPlanning,
  checkPlanningStaleStatus,
} from "@/lib/nutrition-v2/patient-planning-repository";
import type {
  PatientPlanning,
  SavePatientPlanningInput,
  PatientPlanningWithStatus,
} from "@/lib/nutrition-v2/patient-planning-types";

import {
  getPatientRecordDetail,
} from "@/lib/nutrition-v2/patient-record-repository";
import {
  calculateAgeFromBirthDate,
  normalizeBiologicalSex,
} from "@/lib/nutrition-v2/clinical-calculations";

export type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
};

async function resolveNutritionContextAndStudent(
  slug: string,
  studentPublicId: string,
  requireAuthor = false
) {
  const ctx = await resolveNutritionAccessContext(slug);
  if (!ctx || !ctx.consultancyId || !ctx.membershipId) {
    throw new Error("Não autorizado ou sessão inválida.");
  }

  if (requireAuthor && !ctx.canAuthorNutrition) {
    throw new Error("Acesso negado: apenas Nutricionistas da consultoria podem salvar o planejamento.");
  }

  if (!ctx.canViewNutrition) {
    throw new Error("Acesso restrito aos profissionais de nutrição e administradores.");
  }

  const connection = await getDbConnection();
  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT cm.id AS student_membership_id, cm.status
     FROM consultancy_members cm
     INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id AND cmr.role = 'STUDENT'
     WHERE cm.public_id = ? AND cm.consultancy_id = ? AND cm.status = 'ACTIVE';`,
    [studentPublicId.trim(), ctx.consultancyId]
  );

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("Paciente não encontrado ou inativo nesta consultoria.");
  }

  const studentMembershipId = Number(rows[0].student_membership_id);

  return {
    ctx,
    studentMembershipId,
  };
}

/**
 * Loads patient nutritional planning and calculates current stale status based on latest anthropometrics.
 */
export async function getPatientPlanningAction(
  slug: string,
  studentPublicId: string
): Promise<ActionResult<PatientPlanningWithStatus>> {
  try {
    const { ctx, studentMembershipId } = await resolveNutritionContextAndStudent(slug, studentPublicId, false);

    const [planning, detail] = await Promise.all([
      getPatientPlanningByStudent(ctx.consultancyId!, studentMembershipId),
      getPatientRecordDetail(ctx.consultancyId!, studentMembershipId, ctx.membershipId!).catch(() => null),
    ]);

    const latestAnthro = detail && detail.anthropometrics.length > 0 ? detail.anthropometrics[0] : null;

    const currentWeightKg = latestAnthro?.weightKg ?? detail?.onboardingReference.reportedWeightKg ?? null;
    const currentHeightCm = latestAnthro?.heightCm ?? detail?.onboardingReference.reportedHeightCm ?? null;
    const currentAgeYears = calculateAgeFromBirthDate(detail?.onboardingReference.birthDate);
    const currentBiologicalSex = normalizeBiologicalSex(detail?.onboardingReference.sex);

    const staleStatus = checkPlanningStaleStatus(planning, {
      weightKg: currentWeightKg,
      heightCm: currentHeightCm,
      ageYears: currentAgeYears,
      biologicalSex: currentBiologicalSex,
    });

    return {
      success: true,
      data: {
        planning,
        staleStatus,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao carregar planejamento do paciente.";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Saves patient nutritional planning. Enforces server-side authoring RBAC and multi-tenancy.
 */
export async function savePatientPlanningAction(
  slug: string,
  studentPublicId: string,
  input: SavePatientPlanningInput
): Promise<ActionResult<PatientPlanning>> {
  try {
    const { ctx, studentMembershipId } = await resolveNutritionContextAndStudent(slug, studentPublicId, true);

    const updated = await upsertPatientPlanning(
      ctx.consultancyId!,
      studentMembershipId,
      input,
      ctx.membershipId!
    );

    revalidatePath(`/consultoria/${slug}/planos-v2/prontuario/${studentPublicId}`);

    return {
      success: true,
      data: updated,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao salvar planejamento do paciente.";
    return {
      success: false,
      error: message,
    };
  }
}
