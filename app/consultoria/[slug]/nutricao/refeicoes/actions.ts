"use server";

import { getCurrentSession } from "@/lib/auth/session";
import { getDbConnection } from "@/lib/db/mysql";
import type { RowDataPacket } from "mysql2/promise";
import {
  validateMealTrackingInput,
} from "@/lib/nutrition-v2/meal-tracking-validation";
import {
  saveMealTrackingPhoto,
} from "@/lib/nutrition-v2/meal-tracking-storage";
import {
  upsertMealTrackingLog,
  getMealTrackingLogsForStudentAndDate,
  getMealTrackingSummaryForStudent,
} from "@/lib/nutrition-v2/meal-tracking-repository";
import type {
  MealTrackingLogDto,
  MealTrackingPeriodSummaryDto,
} from "@/lib/nutrition-v2/meal-tracking-types";

export interface SaveMealTrackingActionResult {
  success: boolean;
  error?: string;
  log?: MealTrackingLogDto;
}

export async function saveMealTrackingAction(
  slug: string,
  formData: FormData
): Promise<SaveMealTrackingActionResult> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const connection = await getDbConnection();
  try {
    // 1. Resolve student membership
    const [members] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id AS membership_id, cm.consultancy_id, c.slug
       FROM consultancies c
       JOIN consultancy_members cm ON cm.consultancy_id = c.id
       WHERE c.slug = ?
         AND cm.user_id = ?
         AND cm.role = 'STUDENT'
         AND cm.status = 'ACTIVE'
       LIMIT 1;`,
      [slug, session.userId]
    );

    if (!Array.isArray(members) || members.length === 0) {
      return { success: false, error: "Aluno não encontrado ou inativo nesta consultoria." };
    }

    const studentMembershipId = Number(members[0].membership_id);
    const consultancyId = Number(members[0].consultancy_id);

    // 2. Parse payload
    const rawPayload = formData.get("payload");
    if (!rawPayload || typeof rawPayload !== "string") {
      return { success: false, error: "Dados da refeição ausentes." };
    }

    let parsedPayload: unknown;
    try {
      parsedPayload = JSON.parse(rawPayload);
    } catch {
      return { success: false, error: "Payload da refeição corrompido." };
    }

    const validatedInput = validateMealTrackingInput(parsedPayload);
    const removePhoto = formData.get("removePhoto") === "true";

    // 3. Process photo if attached
    const photoFile = formData.get("photo");
    let photoData = null;

    if (photoFile && typeof photoFile === "object" && "arrayBuffer" in photoFile) {
      const file = photoFile as File;
      if (file.size > 0) {
        try {
          const buffer = Buffer.from(await file.arrayBuffer());
          photoData = await saveMealTrackingPhoto(buffer, file.name || "refeicao.jpg", file.type);
        } catch (photoError: unknown) {
          const msg =
            photoError instanceof Error
              ? photoError.message
              : "Erro ao processar imagem da refeição.";
          return { success: false, error: msg };
        }
      }
    }

    // 4. Upsert log
    const savedLog = await upsertMealTrackingLog({
      consultancyId,
      studentMembershipId,
      authorMembershipId: studentMembershipId,
      consultancySlug: slug,
      input: validatedInput,
      photoData,
      removePhoto,
    });

    return {
      success: true,
      log: savedLog,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Erro inesperado ao registrar refeição.";
    return { success: false, error: errorMsg };
  } finally {
    connection.release();
  }
}

export interface GetStudentMealTrackingResult {
  success: boolean;
  error?: string;
  logs?: MealTrackingLogDto[];
}

export async function getStudentMealTrackingForDateAction(
  slug: string,
  dateStr: string
): Promise<GetStudentMealTrackingResult> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada." };
  }

  const connection = await getDbConnection();
  try {
    const [members] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id AS membership_id, cm.consultancy_id
       FROM consultancies c
       JOIN consultancy_members cm ON cm.consultancy_id = c.id
       WHERE c.slug = ?
         AND cm.user_id = ?
         AND cm.role = 'STUDENT'
         AND cm.status = 'ACTIVE'
       LIMIT 1;`,
      [slug, session.userId]
    );

    if (!Array.isArray(members) || members.length === 0) {
      return { success: false, error: "Aluno não encontrado nesta consultoria." };
    }

    const studentMembershipId = Number(members[0].membership_id);
    const consultancyId = Number(members[0].consultancy_id);

    const logs = await getMealTrackingLogsForStudentAndDate(
      consultancyId,
      studentMembershipId,
      dateStr,
      slug
    );

    return { success: true, logs };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro ao carregar registros.";
    return { success: false, error: errorMsg };
  } finally {
    connection.release();
  }
}

export interface GetNutritionistMealTrackingSummaryResult {
  success: boolean;
  error?: string;
  summary?: MealTrackingPeriodSummaryDto;
}

export async function getNutritionistMealTrackingSummaryAction(
  slug: string,
  studentPublicId: string,
  startDate?: string,
  endDate?: string
): Promise<GetNutritionistMealTrackingSummaryResult> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada." };
  }

  const connection = await getDbConnection();
  try {
    // 1. Verify caller has professional permissions in this consultancy
    const [profMembers] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id, cm.consultancy_id, cm.role, c.slug
       FROM consultancies c
       JOIN consultancy_members cm ON cm.consultancy_id = c.id
       WHERE c.slug = ?
         AND cm.user_id = ?
         AND cm.status = 'ACTIVE'
         AND cm.role IN ('NUTRITIONIST', 'CONSULTANCY_ADMIN', 'PERSONAL', 'PLATFORM_ADMIN')
       LIMIT 1;`,
      [slug, session.userId]
    );

    if (!Array.isArray(profMembers) || profMembers.length === 0) {
      return { success: false, error: "Acesso restrito aos profissionais da consultoria." };
    }

    const consultancyId = Number(profMembers[0].consultancy_id);

    // 2. Resolve student membership by studentPublicId (user.public_id or cm.public_id)
    const [studentRows] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id AS student_membership_id
       FROM consultancy_members cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.consultancy_id = ?
         AND (cm.public_id = ? OR u.public_id = ?)
         AND cm.role = 'STUDENT'
       LIMIT 1;`,
      [consultancyId, studentPublicId, studentPublicId]
    );

    if (!Array.isArray(studentRows) || studentRows.length === 0) {
      return { success: false, error: "Aluno não encontrado nesta consultoria." };
    }

    const studentMembershipId = Number(studentRows[0].student_membership_id);

    // Default dates: last 7 days including today
    const now = new Date();
    const defaultEnd = now.toISOString().slice(0, 10);
    const past7 = new Date();
    past7.setDate(past7.getDate() - 6);
    const defaultStart = past7.toISOString().slice(0, 10);

    const actualStart = startDate || defaultStart;
    const actualEnd = endDate || defaultEnd;

    const summary = await getMealTrackingSummaryForStudent(
      consultancyId,
      studentMembershipId,
      slug,
      actualStart,
      actualEnd
    );

    return { success: true, summary };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Erro ao carregar acompanhamento do aluno.";
    return { success: false, error: errorMsg };
  } finally {
    connection.release();
  }
}
