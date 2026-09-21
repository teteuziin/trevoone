"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveEffectiveViewMode } from "@/lib/consultancies/view-mode-server";
import {
  createPhotoEvaluationRequest,
  submitPhotoEvaluation,
  reviewPhotoEvaluation,
  getStudentPhotoEvaluationsData,
  getProfessionalStudentPhotoEvaluationsData,
  getPhotoEvaluationComparisonData,
  type PhotoEvaluationPose,
  type PhotoEvaluationRequestDto,
  type PhotoEvaluationComparisonDto,
} from "@/lib/consultancies/photo-evaluations";

export interface ActionState {
  success?: boolean;
  error?: string;
  requestPublicId?: string;
}

/**
 * Professional creates a photo evaluation request for an active student.
 */
export async function createPhotoEvaluationRequestAction(
  prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const consultancySlug = formData.get("consultancySlug") as string;
  const studentPublicId = formData.get("studentPublicId") as string;
  const instructions = formData.get("instructions") as string | null;
  const dueAt = formData.get("dueAt") as string | null;

  if (!consultancySlug || !studentPublicId) {
    return { success: false, error: "Dados incompletos para solicitação." };
  }

  const result = await createPhotoEvaluationRequest({
    professionalUserId: session.userId,
    consultancySlug,
    studentPublicId,
    instructions,
    dueAt: dueAt || null,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(`/consultoria/${consultancySlug}/progresso/alunos/${studentPublicId}`);
  revalidatePath(`/consultoria/${consultancySlug}/progresso`);

  return { success: true, requestPublicId: result.requestPublicId };
}

/**
 * Student submits the completed photo evaluation (all 4 poses uploaded).
 */
export async function submitPhotoEvaluationAction(
  prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const consultancySlug = formData.get("consultancySlug") as string;
  const requestPublicId = formData.get("requestPublicId") as string;
  const consent = formData.get("hasAgreedToGuidelines");
  const hasAgreedToGuidelines = consent === "true" || consent === "on" || consent === "1";

  if (!consultancySlug || !requestPublicId) {
    return { success: false, error: "Dados incompletos para envio." };
  }

  if (!hasAgreedToGuidelines) {
    return {
      success: false,
      error: "É necessário confirmar o termo de consentimento para enviar as fotos.",
    };
  }

  const result = await submitPhotoEvaluation({
    userId: session.userId,
    consultancySlug,
    requestPublicId,
    hasAgreedToGuidelines,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(`/consultoria/${consultancySlug}/progresso`);
  revalidatePath(`/consultoria/${consultancySlug}`);

  return { success: true };
}

/**
 * Professional reviews evaluation (APPROVE or CHANGES_REQUESTED).
 */
export async function reviewPhotoEvaluationAction(
  prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const consultancySlug = formData.get("consultancySlug") as string;
  const requestPublicId = formData.get("requestPublicId") as string;
  const studentPublicId = formData.get("studentPublicId") as string;
  const decision = formData.get("decision") as "APPROVE" | "CHANGES_REQUESTED";
  const reviewerNotes = formData.get("reviewerNotes") as string | null;
  const posesRaw = formData.getAll("posesToRetake") as string[];

  if (!consultancySlug || !requestPublicId || !decision) {
    return { success: false, error: "Dados incompletos para revisão." };
  }

  const posesToRetake = posesRaw as PhotoEvaluationPose[];

  const result = await reviewPhotoEvaluation({
    professionalUserId: session.userId,
    consultancySlug,
    requestPublicId,
    decision,
    reviewerNotes,
    posesToRetake,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  if (studentPublicId) {
    revalidatePath(`/consultoria/${consultancySlug}/progresso/alunos/${studentPublicId}`);
  }
  revalidatePath(`/consultoria/${consultancySlug}/progresso`);

  return { success: true };
}

export interface PhotoEvaluationTabDataResult {
  success: boolean;
  error?: string;
  data?: {
    activeRequest?: PhotoEvaluationRequestDto | null;
    history?: PhotoEvaluationRequestDto[];
    requests?: PhotoEvaluationRequestDto[];
    comparisonData?: PhotoEvaluationComparisonDto | null;
  };
}

/**
 * Loads detailed photo evaluations on demand when entering the Fotos tab.
 * Keeps photo queries and N+1 images out of the critical initial page render path.
 * Determines authorized operational identity strictly server-side from session, consultancy context,
 * and effective view mode (the client does NOT decide the mode).
 */
export async function loadPhotoEvaluationTabDataAction(params: {
  consultancySlug: string;
  studentPublicId?: string;
}): Promise<PhotoEvaluationTabDataResult> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const { consultancySlug, studentPublicId } = params;

  if (!consultancySlug || typeof consultancySlug !== "string" || !consultancySlug.trim()) {
    return { success: false, error: "Consultoria inválida." };
  }

  const normalizedSlug = consultancySlug.trim();
  const normalizedStudentPublicId =
    studentPublicId && typeof studentPublicId === "string" && studentPublicId.trim().length > 0
      ? studentPublicId.trim()
      : null;

  try {
    // 1. Resolve consultancy context server-side
    const context = await resolveConsultancyContext(session.userId, normalizedSlug);
    if (!context) {
      return {
        success: false,
        error: "Acesso não autorizado para esta consultoria.",
      };
    }

    // 2. Resolve active/effective view mode server-side (cookie validated against allowed roles)
    const viewModeState = await resolveEffectiveViewMode(normalizedSlug, context.roles);
    const { effectiveMode } = viewModeState;

    // 3. Operational mode decision strictly governed server-side
    if (effectiveMode === "STUDENT" || effectiveMode === "INFLUENCER") {
      const hasStudentRole =
        context.roles.includes("STUDENT") || context.roles.includes("INFLUENCER");
      if (!hasStudentRole) {
        return {
          success: false,
          error: "Acesso não autorizado para visualização de fotos de aluno.",
        };
      }

      // Student flow: ignore/reject any studentPublicId from client.
      // Exclusively use session.userId to load own student photos.
      const [photoData, comparisonData] = await Promise.all([
        getStudentPhotoEvaluationsData({
          userId: session.userId,
          consultancySlug: normalizedSlug,
        }),
        getPhotoEvaluationComparisonData({
          userId: session.userId,
          consultancySlug: normalizedSlug,
        }),
      ]);

      if (!photoData) {
        return {
          success: false,
          error: "Acesso não autorizado para visualização de fotos de aluno.",
        };
      }

      return {
        success: true,
        data: {
          activeRequest: photoData.activeRequest || null,
          history: photoData.history || [],
          comparisonData,
        },
      };
    }

    if (
      effectiveMode === "ADMIN" ||
      (effectiveMode as string) === "CONSULTANCY_ADMIN" ||
      effectiveMode === "PERSONAL" ||
      effectiveMode === "NUTRITIONIST"
    ) {
      const isAllowedProfessional =
        context.roles.includes("CONSULTANCY_ADMIN") ||
        (effectiveMode === "PERSONAL" && context.roles.includes("PERSONAL")) ||
        (effectiveMode === "NUTRITIONIST" && context.roles.includes("NUTRITIONIST"));

      if (!isAllowedProfessional) {
        return {
          success: false,
          error: "Permissão insuficiente para visualização profissional.",
        };
      }

      // Professional/Admin inspection requires a target student public ID
      if (!normalizedStudentPublicId) {
        return {
          success: false,
          error: "Identificador do aluno é obrigatório para visualização profissional.",
        };
      }

      // Professional / Admin caller requesting a target student's evaluations
      const [photoData, comparisonData] = await Promise.all([
        getProfessionalStudentPhotoEvaluationsData({
          userId: session.userId,
          consultancySlug: normalizedSlug,
          studentPublicId: normalizedStudentPublicId,
        }),
        getPhotoEvaluationComparisonData({
          userId: session.userId,
          consultancySlug: normalizedSlug,
          studentPublicId: normalizedStudentPublicId,
        }),
      ]);

      if (!photoData) {
        return {
          success: false,
          error: "Acesso não autorizado para visualização de fotos deste aluno.",
        };
      }

      return {
        success: true,
        data: {
          requests: photoData.requests || [],
          comparisonData,
        },
      };
    }

    return {
      success: false,
      error: "Modo de visualização não autorizado para carregar fotos.",
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao carregar fotos.",
    };
  }
}
