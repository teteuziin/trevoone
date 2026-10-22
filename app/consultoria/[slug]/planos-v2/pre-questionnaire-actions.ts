"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveEffectiveViewMode } from "@/lib/consultancies/view-mode-server";
import {
  validateSendPreQuestionnaireInput,
  validateSaveDraftInput,
  validateSubmitResponsesInput,
  validateReviewDiffInput,
} from "@/lib/nutrition-v2/pre-questionnaire-validation";
import {
  sendPreQuestionnaire,
  getPreQuestionnaireByPublicId,
  savePreQuestionnaireDraft,
  submitPreQuestionnaireResponses,
  computePreQuestionnaireDiff,
  reviewPreQuestionnaireDiff,
  cancelPreQuestionnaire,
} from "@/lib/nutrition-v2/pre-questionnaire-repository";
import type {
  PreQuestionnaireDto,
  PreQuestionnaireDiffComparisonItem,
} from "@/lib/nutrition-v2/pre-questionnaire-types";

export type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Server Action: Professional sends pre-questionnaire to a patient.
 */
export async function sendPreQuestionnaireAction(
  slug: string,
  rawInput: unknown
): Promise<ActionResult<PreQuestionnaireDto>> {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return { success: false, error: "Sessão expirada. Faça login novamente." };
    }

    const context = await resolveConsultancyContext(session.userId, slug);
    if (!context) {
      return { success: false, error: "Acesso negado à consultoria." };
    }

    const effective = await resolveEffectiveViewMode(slug, context.roles);
    const isAllowed =
      effective.effectiveMode === "NUTRITIONIST" ||
      effective.effectiveMode === "ADMIN" ||
      (effective.effectiveMode as string) === "CONSULTANCY_ADMIN" ||
      context.roles.includes("NUTRITIONIST") ||
      context.roles.includes("CONSULTANCY_ADMIN");

    if (!isAllowed) {
      return { success: false, error: "Apenas nutricionistas e administradores podem enviar pré-questionários." };
    }

    const validated = validateSendPreQuestionnaireInput(rawInput);

    const result = await sendPreQuestionnaire(
      context.consultancyId,
      slug,
      context.membershipId,
      validated
    );

    revalidatePath(`/consultoria/${slug}/planos-v2/prontuario/${validated.studentMembershipPublicId}`);
    revalidatePath(`/consultoria/${slug}/nutricao`);
    revalidatePath(`/consultoria/${slug}/formularios`);

    return { success: true, data: result };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao enviar pré-questionário.";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Patient saves draft responses (Autosave).
 */
export async function savePreQuestionnaireDraftAction(
  slug: string,
  rawInput: unknown
): Promise<ActionResult<{ startedAt: string | null }>> {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return { success: false, error: "Sessão expirada." };
    }

    const context = await resolveConsultancyContext(session.userId, slug);
    if (!context) {
      return { success: false, error: "Acesso negado." };
    }

    const validated = validateSaveDraftInput(rawInput);

    const result = await savePreQuestionnaireDraft(
      validated.publicId,
      context.consultancyId,
      context.membershipId,
      validated.responses
    );

    return { success: true, data: result };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao salvar rascunho.";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Patient finalizes submission of questionnaire responses.
 */
export async function submitPreQuestionnaireResponsesAction(
  slug: string,
  rawInput: unknown
): Promise<ActionResult<PreQuestionnaireDto>> {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return { success: false, error: "Sessão expirada. Faça login novamente." };
    }

    const context = await resolveConsultancyContext(session.userId, slug);
    if (!context) {
      return { success: false, error: "Acesso negado à consultoria." };
    }

    const rawData = rawInput as Record<string, unknown>;
    const publicId = String(rawData?.publicId || "").trim();
    if (!publicId) {
      return { success: false, error: "Identificador do questionário inválido." };
    }

    const current = await getPreQuestionnaireByPublicId(publicId, context.consultancyId);

    const validated = validateSubmitResponsesInput(rawInput, current.questions);

    const result = await submitPreQuestionnaireResponses(
      validated.publicId,
      context.consultancyId,
      slug,
      context.membershipId,
      validated.responses
    );

    revalidatePath(`/consultoria/${slug}/nutricao`);
    revalidatePath(`/consultoria/${slug}/formularios`);
    revalidatePath(`/consultoria/${slug}/planos-v2/prontuario/${current.studentMembershipPublicId}`);

    return { success: true, data: result };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao enviar respostas.";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Professional computes side-by-side Diff between current record and questionnaire responses.
 */
export async function computePreQuestionnaireDiffAction(
  slug: string,
  publicId: string
): Promise<ActionResult<{ questionnaire: PreQuestionnaireDto; diffItems: PreQuestionnaireDiffComparisonItem[] }>> {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return { success: false, error: "Sessão expirada." };
    }

    const context = await resolveConsultancyContext(session.userId, slug);
    if (!context) {
      return { success: false, error: "Acesso negado." };
    }

    const result = await computePreQuestionnaireDiff(publicId, context.consultancyId);

    return { success: true, data: result };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao comparar respostas.";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Professional reviews diff and selectively integrates responses into Patient General Record.
 */
export async function reviewPreQuestionnaireDiffAction(
  slug: string,
  rawInput: unknown
): Promise<ActionResult<PreQuestionnaireDto>> {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return { success: false, error: "Sessão expirada." };
    }

    const context = await resolveConsultancyContext(session.userId, slug);
    if (!context) {
      return { success: false, error: "Acesso negado à consultoria." };
    }

    const validated = validateReviewDiffInput(rawInput);

    const result = await reviewPreQuestionnaireDiff(
      context.consultancyId,
      slug,
      context.membershipId,
      validated
    );

    revalidatePath(`/consultoria/${slug}/planos-v2/prontuario/${result.studentMembershipPublicId}`);

    return { success: true, data: result };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao aplicar revisão do questionário.";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Professional cancels a pre-questionnaire.
 */
export async function cancelPreQuestionnaireAction(
  slug: string,
  publicId: string,
  cancelReason?: string | null
): Promise<ActionResult<PreQuestionnaireDto>> {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return { success: false, error: "Sessão expirada." };
    }

    const context = await resolveConsultancyContext(session.userId, slug);
    if (!context) {
      return { success: false, error: "Acesso negado." };
    }

    const result = await cancelPreQuestionnaire(
      publicId,
      context.consultancyId,
      context.membershipId,
      cancelReason
    );

    revalidatePath(`/consultoria/${slug}/planos-v2/prontuario/${result.studentMembershipPublicId}`);

    return { success: true, data: result };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao cancelar pré-questionário.";
    return { success: false, error: msg };
  }
}
