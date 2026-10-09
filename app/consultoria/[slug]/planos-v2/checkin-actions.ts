"use server";

import { revalidatePath } from "next/cache";
import type { RowDataPacket, PoolConnection } from "mysql2/promise";
import { getDbConnection } from "@/lib/db/mysql";
import { resolveNutritionAccessContext } from "@/lib/nutrition-v2/access";
import {
  createCheckinRequest,
  cancelCheckinRequest,
  submitCheckinResponse,
  getPatientCheckinsHubSummary,
  getCheckinDetailByPublicId,
  getPendingCheckinForStudent,
} from "@/lib/nutrition-v2/checkin-repository";
import type {
  CheckinRequestDto,
  CheckinResponseDto,
  CheckinDetailDto,
  PatientCheckinsHubSummaryDto,
  SubmitCheckinResponseInput,
} from "@/lib/nutrition-v2/checkin-types";
import {
  createNotificationInTransaction,
  deliverNotificationAfterCommit,
} from "@/services/notification-service";

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
       JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.public_id = ?
         AND cm.consultancy_id = ?
         AND cm.status = 'ACTIVE'
         AND cmr.role = 'STUDENT'
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
 * Professional action: creates a new check-in request for a patient.
 */
export async function createCheckinRequestAction(
  slug: string,
  studentPublicId: string,
  dueAt?: string | null
): Promise<ActionResult<CheckinRequestDto>> {
  if (!slug || !studentPublicId) {
    return { success: false, error: "Parâmetros obrigatórios ausentes.", code: "INVALID_INPUT" };
  }

  const access = await resolveNutritionAccessContext(slug);
  if (!access || !access.canAuthorNutrition || !access.consultancyId || !access.membershipId) {
    return { success: false, error: "Acesso negado: apenas nutricionistas podem solicitar check-ins.", code: "FORBIDDEN" };
  }

  const student = await resolveStudentMembership(access.consultancyId, studentPublicId);
  if (!student) {
    return { success: false, error: "Aluno não encontrado nesta consultoria.", code: "STUDENT_NOT_FOUND" };
  }

  try {
    const request = await createCheckinRequest({
      consultancyId: access.consultancyId,
      studentMembershipId: student.id,
      requestedByMembershipId: access.membershipId,
      dueAt: dueAt || null,
    });

    // Notify student resiliently (do not roll back if notification delivery fails)
    try {
      const conn = await getDbConnection();
      try {
        const notification = await createNotificationInTransaction(conn, {
          userId: student.userId,
          consultancyId: access.consultancyId,
          eventType: "NUTRITION_CHECKIN_REQUESTED",
          title: "Novo check-in de acompanhamento",
          body: "Sua nutricionista solicitou um novo check-in de acompanhamento.",
          deepLink: `/consultoria/${slug}/nutricao/checkin/${request.publicId}`,
          priority: "NORMAL",
          sourceType: "NUTRITION_CHECKIN_REQUEST",
          sourcePublicId: request.publicId,
        });

        // Trigger commit delivery asynchronously
        deliverNotificationAfterCommit(notification.id).catch(() => {});
      } finally {
        conn.release();
      }
    } catch {
      // Resilient: persistence of clinical request is authoritative
    }

    revalidatePath(`/consultoria/${slug}/planos-v2/prontuario/${studentPublicId}`);
    return { success: true, data: request };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao criar solicitação.";
    if (message === "EXISTING_PENDING_CHECKIN") {
      return { success: false, error: "Já existe um check-in aguardando resposta.", code: "EXISTING_PENDING_CHECKIN" };
    }
    if (message === "DUE_DATE_MUST_BE_FUTURE") {
      return { success: false, error: "O prazo deve ser uma data no futuro.", code: "DUE_DATE_MUST_BE_FUTURE" };
    }
    return { success: false, error: "Não foi possível criar a solicitação de check-in.", code: "INTERNAL_ERROR" };
  }
}

/**
 * Professional action: cancels a pending check-in request.
 */
export async function cancelCheckinRequestAction(
  slug: string,
  studentPublicId: string,
  requestPublicId: string
): Promise<ActionResult<CheckinRequestDto>> {
  if (!slug || !requestPublicId) {
    return { success: false, error: "Parâmetros obrigatórios ausentes.", code: "INVALID_INPUT" };
  }

  const access = await resolveNutritionAccessContext(slug);
  if (!access || !access.canAuthorNutrition || !access.consultancyId || !access.membershipId) {
    return { success: false, error: "Acesso negado para cancelar check-in.", code: "FORBIDDEN" };
  }

  try {
    const request = await cancelCheckinRequest({
      consultancyId: access.consultancyId,
      requestPublicId,
      canceledByMembershipId: access.membershipId,
    });

    revalidatePath(`/consultoria/${slug}/planos-v2/prontuario/${studentPublicId}`);
    return { success: true, data: request };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao cancelar solicitação.";
    if (message === "CANNOT_CANCEL_COMPLETED") {
      return { success: false, error: "Não é possível cancelar um check-in que já foi respondido.", code: "CANNOT_CANCEL_COMPLETED" };
    }
    return { success: false, error: "Erro ao cancelar solicitação.", code: "INTERNAL_ERROR" };
  }
}

/**
 * Student action: submits the response for a pending check-in.
 */
export async function submitCheckinResponseAction(
  slug: string,
  requestPublicId: string,
  input: SubmitCheckinResponseInput
): Promise<ActionResult<CheckinResponseDto>> {
  if (!slug || !requestPublicId || !input) {
    return { success: false, error: "Parâmetros obrigatórios ausentes.", code: "INVALID_INPUT" };
  }

  const access = await resolveNutritionAccessContext(slug);
  if (!access || !access.isStudent || !access.consultancyId || !access.membershipId) {
    return { success: false, error: "Acesso negado: apenas o aluno pode enviar seu check-in.", code: "FORBIDDEN" };
  }

  try {
    const response = await submitCheckinResponse(
      access.consultancyId,
      requestPublicId,
      access.membershipId,
      input
    );

    // Notify nutritionist resiliently if professional member exists
    try {
      const conn = await getDbConnection();
      try {
        const info = await connectionToGetRequesterAndStudent(conn, requestPublicId);
        if (info && info.requester_user_id) {
          const notification = await createNotificationInTransaction(conn, {
            userId: Number(info.requester_user_id),
            consultancyId: access.consultancyId,
            eventType: "NUTRITION_CHECKIN_SUBMITTED",
            title: "Novo check-in recebido",
            body: input.requestsHelp
              ? "O aluno solicitou contato no check-in."
              : "Seu paciente enviou um novo check-in de acompanhamento.",
            deepLink: `/consultoria/${slug}/planos-v2/prontuario/${info.student_public_id}?tab=checkins`,
            priority: input.requestsHelp ? "HIGH" : "NORMAL",
            sourceType: "NUTRITION_CHECKIN_RESPONSE",
            sourcePublicId: response.publicId,
          });

          deliverNotificationAfterCommit(notification.id).catch(() => {});
        }
      } finally {
        conn.release();
      }
    } catch {
      // Resilient: submission is authoritative
    }

    revalidatePath(`/consultoria/${slug}`);
    revalidatePath(`/consultoria/${slug}/nutricao`);
    return { success: true, data: response };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao enviar check-in.";
    if (message === "CHECKIN_EXPIRED") {
      return { success: false, error: "Este check-in expirou.", code: "CHECKIN_EXPIRED" };
    }
    if (message === "ALREADY_SUBMITTED") {
      return { success: false, error: "Este check-in já foi enviado.", code: "ALREADY_SUBMITTED" };
    }
    if (message === "ADHERENCE_REQUIRED") {
      return { success: false, error: "A adesão ao plano é obrigatória.", code: "ADHERENCE_REQUIRED" };
    }
    if (message === "REQUEST_CANCELED") {
      return { success: false, error: "Esta solicitação de check-in foi cancelada.", code: "REQUEST_CANCELED" };
    }
    return { success: false, error: "Erro ao processar o envio do check-in.", code: "INTERNAL_ERROR" };
  }
}

interface RequesterAndStudentRow extends RowDataPacket {
  requester_user_id: number;
  student_public_id: string;
}

async function connectionToGetRequesterAndStudent(
  conn: PoolConnection,
  requestPublicId: string
): Promise<RequesterAndStudentRow | null> {
  const [rows] = await conn.execute<RequesterAndStudentRow[]>(
    `SELECT cm.user_id AS requester_user_id, student_cm.public_id AS student_public_id
     FROM nutrition_v2_checkin_requests r
     JOIN consultancy_members cm ON cm.id = r.requested_by_membership_id
     JOIN consultancy_members student_cm ON student_cm.id = r.student_membership_id
     WHERE r.public_id = ?
     LIMIT 1;`,
    [requestPublicId]
  );
  return rows && rows.length > 0 ? rows[0] : null;
}

/**
 * Retrieves the check-ins hub summary for a patient in Patient Hub.
 */
export async function getPatientCheckinsHubAction(
  slug: string,
  studentPublicId: string
): Promise<ActionResult<PatientCheckinsHubSummaryDto>> {
  const access = await resolveNutritionAccessContext(slug);
  if (!access || !access.canViewNutrition || !access.consultancyId) {
    return { success: false, error: "Acesso negado.", code: "FORBIDDEN" };
  }

  const student = await resolveStudentMembership(access.consultancyId, studentPublicId);
  if (!student) {
    return { success: false, error: "Aluno não encontrado.", code: "STUDENT_NOT_FOUND" };
  }

  try {
    const summary = await getPatientCheckinsHubSummary(access.consultancyId, student.id);
    return { success: true, data: summary };
  } catch {
    return { success: false, error: "Erro ao carregar histórico de check-ins.", code: "INTERNAL_ERROR" };
  }
}

/**
 * Retrieves detail of a single check-in response.
 */
export async function getCheckinDetailAction(
  slug: string,
  responsePublicId: string
): Promise<ActionResult<CheckinDetailDto>> {
  const access = await resolveNutritionAccessContext(slug);
  if (!access || !access.canViewNutrition || !access.consultancyId) {
    return { success: false, error: "Acesso negado.", code: "FORBIDDEN" };
  }

  try {
    const detail = await getCheckinDetailByPublicId(access.consultancyId, responsePublicId);
    if (!detail) {
      return { success: false, error: "Check-in não encontrado.", code: "NOT_FOUND" };
    }
    return { success: true, data: detail };
  } catch {
    return { success: false, error: "Erro ao carregar detalhes do check-in.", code: "INTERNAL_ERROR" };
  }
}

/**
 * Retrieves the currently pending check-in request for the logged-in student.
 */
export async function getStudentPendingCheckinAction(
  slug: string
): Promise<ActionResult<CheckinRequestDto | null>> {
  const access = await resolveNutritionAccessContext(slug);
  if (!access || !access.isStudent || !access.consultancyId || !access.membershipId) {
    return { success: false, error: "Acesso negado.", code: "FORBIDDEN" };
  }

  try {
    const pending = await getPendingCheckinForStudent(access.consultancyId, access.membershipId);
    return { success: true, data: pending };
  } catch {
    return { success: false, error: "Erro ao buscar pendência de check-in.", code: "INTERNAL_ERROR" };
  }
}
