"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveTrainingAccessContext, TrainingAuthorizationError } from "@/lib/training-v2/access";
import {
  createConsultancyExercise,
  updateExercise,
  getExerciseByIdOrPublicId,
  changeExerciseVisibility,
  type CreateExerciseInput,
  type UpdateExerciseInput,
} from "@/lib/training-v2/exercise-repository";
import {
  attachMediaToExercise,
  detachMediaFromExercise,
} from "@/lib/training-v2/media-repository";
import type {
  ExerciseItemDto,
  MediaRole,
  MovementPattern,
  DifficultyLevel,
} from "@/lib/training-v2/types";

export type ActionResponse<T = unknown> = {
  ok: boolean;
  data?: T;
  error?: string;
  requiresMediaPromotion?: boolean;
};

const VALID_DIFFICULTIES: DifficultyLevel[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];
const VALID_MOVEMENT_PATTERNS: MovementPattern[] = [
  "PUSH",
  "PULL",
  "SQUAT",
  "HINGE",
  "LUNGE",
  "ISOLATION",
  "CARDIO",
  "MOBILITY",
];
const VALID_ROLES: MediaRole[] = [
  "START_IMAGE",
  "EXECUTION_VIDEO",
  "VIDEO_POSTER",
  "ALTERNATE_IMAGE",
  "ALTERNATE_VIDEO",
];

async function requireConsultancyProfessionalContext(slug: string) {
  const session = await getCurrentSession();
  if (!session) {
    throw new Error("Não autenticado.");
  }

  const context = await resolveConsultancyContext(session.userId, slug);
  if (!context) {
    throw new Error("Consultoria não encontrada ou acesso revogado.");
  }

  const isProfessional =
    context.roles.includes("PERSONAL") || context.roles.includes("CONSULTANCY_ADMIN");
  if (!isProfessional) {
    throw new Error("Acesso restrito a profissionais ou administradores da consultoria.");
  }

  const ctx = await resolveTrainingAccessContext(slug);
  if (!ctx || !ctx.canAuthorTraining) {
    throw new Error("Sem autorização para gerenciar exercícios nesta consultoria.");
  }

  return { ctx, context, session };
}

/**
 * Creates a new Consultancy exercise in DRAFT status.
 * Defaults to CREATOR_ONLY visibility to prevent tenant library pollution.
 */
export async function createConsultancyExerciseDraftAction(
  slug: string,
  input: CreateExerciseInput & { visibility?: "CREATOR_ONLY" | "CONSULTANCY" }
): Promise<ActionResponse<ExerciseItemDto>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);

    if (!input.name || !input.name.trim()) {
      return { ok: false, error: "O nome do exercício é obrigatório." };
    }
    if (input.name.trim().length > 255) {
      return { ok: false, error: "O nome não pode exceder 255 caracteres." };
    }
    if (!input.muscleGroupPrimary || !input.muscleGroupPrimary.trim()) {
      return { ok: false, error: "O grupo muscular principal é obrigatório." };
    }
    if (!input.equipment || !input.equipment.trim()) {
      return { ok: false, error: "O equipamento é obrigatório." };
    }

    let difficulty: DifficultyLevel = "INTERMEDIATE";
    if (input.difficultyLevel) {
      if (!VALID_DIFFICULTIES.includes(input.difficultyLevel as DifficultyLevel)) {
        return { ok: false, error: "Nível de dificuldade inválido." };
      }
      difficulty = input.difficultyLevel as DifficultyLevel;
    }

    let movementPattern: MovementPattern | null = null;
    if (input.movementPattern) {
      if (!VALID_MOVEMENT_PATTERNS.includes(input.movementPattern as MovementPattern)) {
        return { ok: false, error: "Padrão de movimento inválido." };
      }
      movementPattern = input.movementPattern as MovementPattern;
    }

    const visibility = input.visibility === "CONSULTANCY" ? "CONSULTANCY" : "CREATOR_ONLY";

    const created = await createConsultancyExercise(ctx, {
      name: input.name.trim(),
      muscleGroupPrimary: input.muscleGroupPrimary.trim(),
      muscleGroupsSecondary: Array.isArray(input.muscleGroupsSecondary)
        ? input.muscleGroupsSecondary.filter((s) => typeof s === "string" && s.trim())
        : null,
      equipment: input.equipment.trim(),
      movementPattern,
      difficultyLevel: difficulty,
      description: input.description?.trim() || null,
      instructions: input.instructions?.trim() || null,
      executionTips: input.executionTips?.trim() || null,
      commonMistakes: input.commonMistakes?.trim() || null,
      progressions: input.progressions?.trim() || null,
      regressions: input.regressions?.trim() || null,
      visibility,
      status: "DRAFT",
    });

    revalidatePath(`/consultoria/${slug}/exercicios`);
    return { ok: true, data: created };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao criar rascunho de exercício.",
    };
  }
}

/**
 * Updates an existing consultancy exercise's metadata.
 */
export async function updateConsultancyExerciseAction(
  slug: string,
  publicId: string,
  input: UpdateExerciseInput
): Promise<ActionResponse<ExerciseItemDto>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);

    if (!publicId || typeof publicId !== "string") {
      return { ok: false, error: "Identificador de exercício inválido." };
    }

    if (input.name !== undefined && !input.name.trim()) {
      return { ok: false, error: "O nome do exercício não pode ser vazio." };
    }
    if (input.difficultyLevel && !VALID_DIFFICULTIES.includes(input.difficultyLevel as DifficultyLevel)) {
      return { ok: false, error: "Nível de dificuldade inválido." };
    }
    if (input.movementPattern && !VALID_MOVEMENT_PATTERNS.includes(input.movementPattern as MovementPattern)) {
      return { ok: false, error: "Padrão de movimento inválido." };
    }

    const updated = await updateExercise(ctx, publicId, {
      ...input,
      muscleGroupsSecondary: Array.isArray(input.muscleGroupsSecondary)
        ? input.muscleGroupsSecondary.filter((s) => typeof s === "string" && s.trim())
        : input.muscleGroupsSecondary,
    });

    revalidatePath(`/consultoria/${slug}/exercicios`);
    revalidatePath(`/consultoria/${slug}/exercicios/${publicId}`);
    return { ok: true, data: updated };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao atualizar exercício.",
    };
  }
}

/**
 * Publishes a consultancy exercise enforcing P0 professional usefulness.
 */
export async function publishConsultancyExerciseAction(
  slug: string,
  publicId: string
): Promise<ActionResponse<ExerciseItemDto>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);

    const current = await getExerciseByIdOrPublicId(ctx, { publicId });
    if (!current) {
      return { ok: false, error: "Exercício não encontrado." };
    }

    if (current.scope !== "CONSULTANCY") {
      return { ok: false, error: "Apenas exercícios da consultoria podem ser publicados por este fluxo." };
    }

    if (!current.name?.trim()) {
      return { ok: false, error: "O exercício precisa de um nome antes de ser publicado." };
    }
    if (!current.muscleGroupPrimary?.trim()) {
      return { ok: false, error: "O grupo muscular principal é obrigatório." };
    }
    if (!current.equipment?.trim()) {
      return { ok: false, error: "O equipamento é obrigatório." };
    }

    const hasInstructions = Boolean(
      current.instructions?.trim() || current.executionTips?.trim()
    );
    if (!hasInstructions) {
      return {
        ok: false,
        error: "Para publicar, forneça instruções ou dicas de execução técnica.",
      };
    }

    const hasVideo = current.media.some((m) => m.role === "EXECUTION_VIDEO");
    if (!hasVideo) {
      return {
        ok: false,
        error: "O vídeo de execução técnica (EXECUTION_VIDEO) é obrigatório para publicar o exercício.",
      };
    }

    const published = await updateExercise(ctx, publicId, { status: "PUBLISHED" });

    revalidatePath(`/consultoria/${slug}/exercicios`);
    revalidatePath(`/consultoria/${slug}/exercicios/${publicId}`);
    return { ok: true, data: published };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao publicar exercício.",
    };
  }
}

/**
 * Soft-archives a consultancy exercise.
 */
export async function archiveConsultancyExerciseAction(
  slug: string,
  publicId: string
): Promise<ActionResponse<{ archived: boolean }>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);

    const current = await getExerciseByIdOrPublicId(ctx, { publicId });
    if (!current || current.scope !== "CONSULTANCY") {
      return { ok: false, error: "Exercício não encontrado nesta consultoria." };
    }

    await updateExercise(ctx, publicId, { status: "ARCHIVED" });

    revalidatePath(`/consultoria/${slug}/exercicios`);
    revalidatePath(`/consultoria/${slug}/exercicios/${publicId}`);
    return { ok: true, data: { archived: true } };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao arquivar exercício.",
    };
  }
}

/**
 * Changes visibility of a consultancy exercise between CREATOR_ONLY and CONSULTANCY.
 * If switching to CONSULTANCY, explicitly coordinates media promotion when requested.
 */
export async function changeConsultancyExerciseVisibilityAction(
  slug: string,
  publicId: string,
  newVisibility: "CREATOR_ONLY" | "CONSULTANCY",
  options?: { promoteAttachedMedia?: boolean }
): Promise<ActionResponse<ExerciseItemDto>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);

    const updated = await changeExerciseVisibility(ctx, publicId, newVisibility, options);

    revalidatePath(`/consultoria/${slug}/exercicios`);
    revalidatePath(`/consultoria/${slug}/exercicios/${publicId}`);
    return { ok: true, data: updated };
  } catch (err: unknown) {
    if (err instanceof TrainingAuthorizationError && err.code === "REQUIRES_MEDIA_PROMOTION") {
      return {
        ok: false,
        error: err.message,
        requiresMediaPromotion: true,
      };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao alterar visibilidade do exercício.",
    };
  }
}

/**
 * Attaches a media asset to a consultancy exercise.
 */
export async function attachConsultancyExerciseMediaAction(
  slug: string,
  exercisePublicId: string,
  mediaPublicId: string,
  role: MediaRole
): Promise<ActionResponse<{ attached: boolean }>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);

    if (!VALID_ROLES.includes(role)) {
      return { ok: false, error: "Função de mídia inválida." };
    }

    await attachMediaToExercise(ctx, exercisePublicId, mediaPublicId, role);

    revalidatePath(`/consultoria/${slug}/exercicios`);
    revalidatePath(`/consultoria/${slug}/exercicios/${exercisePublicId}`);
    return { ok: true, data: { attached: true } };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao vincular mídia ao exercício.",
    };
  }
}

/**
 * Detaches a media asset from a consultancy exercise.
 */
export async function detachConsultancyExerciseMediaAction(
  slug: string,
  exercisePublicId: string,
  mediaPublicId: string,
  role: MediaRole
): Promise<ActionResponse<{ detached: boolean }>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);

    if (!VALID_ROLES.includes(role)) {
      return { ok: false, error: "Função de mídia inválida." };
    }

    const detached = await detachMediaFromExercise(ctx, exercisePublicId, mediaPublicId, role);

    revalidatePath(`/consultoria/${slug}/exercicios`);
    revalidatePath(`/consultoria/${slug}/exercicios/${exercisePublicId}`);
    return { ok: true, data: { detached } };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao desvincular mídia do exercício.",
    };
  }
}
