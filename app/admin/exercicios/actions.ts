"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import { getPlatformAdminAccess } from "@/lib/platform-admin/access";
import { resolveTrainingAccessContext } from "@/lib/training-v2/access";
import {
  createGlobalExercise,
  updateExercise,
  getExerciseByIdOrPublicId,
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

async function requirePlatformAdminContext() {
  const session = await getCurrentSession();
  if (!session) {
    throw new Error("Não autenticado.");
  }

  const { isPlatformAdmin } = await getPlatformAdminAccess(session.userId);
  if (!isPlatformAdmin) {
    throw new Error("Acesso negado: apenas Administradores da Plataforma.");
  }

  const ctx = await resolveTrainingAccessContext(null);
  if (!ctx || !ctx.canManageGlobal) {
    throw new Error("Acesso negado à gestão global de exercícios.");
  }

  return { ctx, session };
}

/**
 * Creates a new Global exercise in DRAFT status.
 */
export async function createGlobalExerciseDraftAction(
  input: CreateExerciseInput
): Promise<ActionResponse<ExerciseItemDto>> {
  try {
    const { ctx } = await requirePlatformAdminContext();

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

    const created = await createGlobalExercise(ctx, {
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
      rightsNotes: input.rightsNotes?.trim() || null,
      status: "DRAFT",
    });

    revalidatePath("/admin/exercicios");
    return { ok: true, data: created };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao criar rascunho de exercício.",
    };
  }
}

/**
 * Updates an existing Global exercise's metadata.
 */
export async function updateGlobalExerciseAction(
  publicId: string,
  input: UpdateExerciseInput
): Promise<ActionResponse<ExerciseItemDto>> {
  try {
    const { ctx } = await requirePlatformAdminContext();

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

    revalidatePath("/admin/exercicios");
    revalidatePath(`/admin/exercicios/${publicId}`);
    return { ok: true, data: updated };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao atualizar exercício.",
    };
  }
}

/**
 * Publishes a Global exercise enforcing official P0 completeness:
 * Requires name, primary muscle, equipment, difficulty, execution guidance,
 * START_IMAGE, and EXECUTION_VIDEO.
 */
export async function publishGlobalExerciseAction(
  publicId: string
): Promise<ActionResponse<ExerciseItemDto>> {
  try {
    const { ctx } = await requirePlatformAdminContext();

    const current = await getExerciseByIdOrPublicId(ctx, { publicId });
    if (!current) {
      return { ok: false, error: "Exercício não encontrado." };
    }

    // Completeness validation
    if (!current.name?.trim()) {
      return { ok: false, error: "O exercício precisa de um nome antes de ser publicado." };
    }
    if (!current.muscleGroupPrimary?.trim()) {
      return { ok: false, error: "O grupo muscular principal é obrigatório para publicação." };
    }
    if (!current.equipment?.trim()) {
      return { ok: false, error: "O equipamento é obrigatório para publicação." };
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
        error: "O vídeo de execução (EXECUTION_VIDEO) é obrigatório para publicar um exercício oficial Trevo One.",
      };
    }

    const hasStartImage = current.media.some((m) => m.role === "START_IMAGE");
    if (!hasStartImage) {
      return {
        ok: false,
        error: "A foto da posição inicial (START_IMAGE) é obrigatória para publicar um exercício oficial Trevo One.",
      };
    }

    const published = await updateExercise(ctx, publicId, { status: "PUBLISHED" });

    revalidatePath("/admin/exercicios");
    revalidatePath(`/admin/exercicios/${publicId}`);
    return { ok: true, data: published };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao publicar exercício.",
    };
  }
}

/**
 * Soft-archives a Global exercise.
 */
export async function archiveGlobalExerciseAction(
  publicId: string
): Promise<ActionResponse<{ archived: boolean }>> {
  try {
    const { ctx } = await requirePlatformAdminContext();

    await updateExercise(ctx, publicId, { status: "ARCHIVED" });

    revalidatePath("/admin/exercicios");
    revalidatePath(`/admin/exercicios/${publicId}`);
    return { ok: true, data: { archived: true } };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao arquivar exercício.",
    };
  }
}

/**
 * Attaches or replaces a media asset on an exercise.
 */
export async function attachGlobalExerciseMediaAction(
  exercisePublicId: string,
  mediaPublicId: string,
  role: MediaRole
): Promise<ActionResponse<{ attached: boolean }>> {
  try {
    const { ctx } = await requirePlatformAdminContext();

    if (!VALID_ROLES.includes(role)) {
      return { ok: false, error: "Função de mídia inválida." };
    }

    await attachMediaToExercise(ctx, exercisePublicId, mediaPublicId, role);

    revalidatePath("/admin/exercicios");
    revalidatePath(`/admin/exercicios/${exercisePublicId}`);
    return { ok: true, data: { attached: true } };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao vincular mídia ao exercício.",
    };
  }
}

/**
 * Detaches a media asset association from an exercise.
 */
export async function detachGlobalExerciseMediaAction(
  exercisePublicId: string,
  mediaPublicId: string,
  role: MediaRole
): Promise<ActionResponse<{ detached: boolean }>> {
  try {
    const { ctx } = await requirePlatformAdminContext();

    if (!VALID_ROLES.includes(role)) {
      return { ok: false, error: "Função de mídia inválida." };
    }

    const detached = await detachMediaFromExercise(ctx, exercisePublicId, mediaPublicId, role);

    revalidatePath("/admin/exercicios");
    revalidatePath(`/admin/exercicios/${exercisePublicId}`);
    return { ok: true, data: { detached } };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao desvincular mídia do exercício.",
    };
  }
}
