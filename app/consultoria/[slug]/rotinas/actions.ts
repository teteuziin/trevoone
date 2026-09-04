"use server";

/**
 * TREVO ONE — TRAINING V2 WORKOUT BUILDER SERVER ACTIONS
 * Server Actions for workout routines, version drafts, block/item manipulation,
 * inline custom exercises, reordering, duplication, and simple set foundation.
 */

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveTrainingAccessContext } from "@/lib/training-v2/access";
import {
  createWorkout,
  updateWorkoutDraftMetadata,
  addBlockToDraft,
  addItemToDraftBlock,
  addSetToDraftItem,
  duplicateBlockInDraft,
  reorderBlocksInDraft,
  removeBlockFromDraft,
  removeItemFromDraft,
  reorderItemsInDraft,
  replaceNormalSetsForDraftItem,
  updateBlockTitleInDraft,
  updateBlockConfigurationInDraft,
  replaceDropSetStructureForDraftItem,
  replaceRestPauseStructureForDraftItem,
  updateCardioConfigurationForDraftItem,
  updateWarmupConfigurationForDraftItem,
  archiveWorkout,
  type CreateWorkoutInput,
  type UpdateWorkoutDraftMetadataInput,
  type SimpleNormalSetInput,
  type UpdateBlockConfigurationInput,
  type ReplaceDropSetStructureInput,
  type ReplaceRestPauseStructureInput,
  type UpdateCardioConfigurationInput,
  type UpdateWarmupConfigurationInput,
} from "@/lib/training-v2/workout-repository";
import type {
  WorkoutVersionDto,
  WorkoutBlockDto,
  WorkoutBlockItemDto,
  WorkoutItemSetDto,
  WorkoutBlockType,
} from "@/lib/training-v2/types";
import { workoutBlockTypeSchema } from "@/lib/training-v2/validation";

export type ActionResponse<T = unknown> = {
  ok: boolean;
  data?: T;
  error?: string;
};

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
    throw new Error("Sem autorização para gerenciar treinos nesta consultoria.");
  }

  return { ctx, context, session };
}

/**
 * Creates a new Workout routine root and its initial DRAFT Version (v1).
 */
export async function createWorkoutDraftAction(
  slug: string,
  input: CreateWorkoutInput
): Promise<ActionResponse<{ workoutPublicId: string; versionPublicId: string }>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);

    if (!input.title || !input.title.trim()) {
      return { ok: false, error: "O título do treino é obrigatório." };
    }

    const { workout, version } = await createWorkout(ctx, {
      title: input.title.trim(),
      subtitle: input.subtitle?.trim() || null,
      objective: input.objective?.trim() || null,
      estimatedDurationMinutes: input.estimatedDurationMinutes ? Number(input.estimatedDurationMinutes) : null,
      difficultyLevel: input.difficultyLevel || "INTERMEDIATE",
      notes: input.notes?.trim() || null,
    });

    revalidatePath(`/consultoria/${slug}/rotinas`);
    return {
      ok: true,
      data: {
        workoutPublicId: workout.publicId,
        versionPublicId: version.publicId,
      },
    };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao criar treino.",
    };
  }
}

/**
 * Updates presentation metadata on an active DRAFT version.
 */
export async function updateWorkoutDraftMetadataAction(
  slug: string,
  versionPublicId: string,
  input: UpdateWorkoutDraftMetadataInput
): Promise<ActionResponse<WorkoutVersionDto>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);

    if (input.title !== undefined && !input.title.trim()) {
      return { ok: false, error: "O título do treino não pode ser vazio." };
    }

    const updated = await updateWorkoutDraftMetadata(ctx, versionPublicId, input);

    revalidatePath(`/consultoria/${slug}/rotinas`);
    revalidatePath(`/consultoria/${slug}/rotinas/${updated.workoutPublicId}`);
    return { ok: true, data: updated };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao atualizar metadados do treino.",
    };
  }
}

/**
 * Adds a new SINGLE block to a DRAFT version.
 */
export async function addBlockToDraftAction(
  slug: string,
  versionPublicId: string,
  input?: { title?: string | null; instructions?: string | null }
): Promise<ActionResponse<WorkoutBlockDto>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);

    const block = await addBlockToDraft(ctx, versionPublicId, {
      blockType: "SINGLE",
      title: input?.title?.trim() || null,
      instructions: input?.instructions?.trim() || null,
    });

    revalidatePath(`/consultoria/${slug}/rotinas`);
    return { ok: true, data: block };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao adicionar bloco ao treino.",
    };
  }
}

/**
 * Updates title and optional instructions of a block in DRAFT.
 */
export async function updateBlockTitleAction(
  slug: string,
  blockPublicId: string,
  title: string | null,
  instructions?: string | null
): Promise<ActionResponse<WorkoutBlockDto>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);

    const updated = await updateBlockTitleInDraft(ctx, blockPublicId, title, instructions);

    revalidatePath(`/consultoria/${slug}/rotinas`);
    return { ok: true, data: updated };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao atualizar título do bloco.",
    };
  }
}

/**
 * Adds a library-backed exercise item to a draft block.
 * Freezes DB exercise snapshot and pins approved media.
 */
export async function addExerciseItemToBlockAction(
  slug: string,
  blockPublicId: string,
  exercisePublicId: string,
  notes?: string
): Promise<ActionResponse<WorkoutBlockItemDto>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);

    if (!exercisePublicId || !exercisePublicId.trim()) {
      return { ok: false, error: "Identificador do exercício inválido." };
    }

    const item = await addItemToDraftBlock(ctx, blockPublicId, {
      exercisePublicId: exercisePublicId.trim(),
      notes: notes?.trim() || null,
    });

    // Provide default initial set if none exist
    try {
      await addSetToDraftItem(ctx, item.publicId, {
        setNumber: 1,
        setType: "NORMAL",
        targetReps: 10,
        targetRepsMax: 12,
        targetRestSeconds: 60,
      });
      item.sets = [
        {
          setNumber: 1,
          setType: "NORMAL",
          parentSetNumber: null,
          targetReps: 10,
          targetRepsMax: 12,
          targetLoadKg: null,
          targetDurationSeconds: null,
          targetDistanceMeters: null,
          targetRestSeconds: 60,
          intensityIndicator: null,
        },
      ];
    } catch {
      // Ignored if initial set creation fails
    }

    revalidatePath(`/consultoria/${slug}/rotinas`);
    return { ok: true, data: item };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao adicionar exercício ao bloco.",
    };
  }
}

/**
 * Adds an inline custom exercise item to a draft block.
 * Does NOT pollute the global or consultancy exercises table.
 */
export async function addCustomItemToBlockAction(
  slug: string,
  blockPublicId: string,
  customSnapshot: {
    exerciseName: string;
    muscleGroup?: string | null;
    equipment?: string | null;
    instructions?: string | null;
  },
  notes?: string
): Promise<ActionResponse<WorkoutBlockItemDto>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);

    if (!customSnapshot.exerciseName || !customSnapshot.exerciseName.trim()) {
      return { ok: false, error: "O nome do exercício personalizado é obrigatório." };
    }

    const item = await addItemToDraftBlock(ctx, blockPublicId, {
      customSnapshot: {
        exerciseName: customSnapshot.exerciseName.trim(),
        muscleGroup: customSnapshot.muscleGroup?.trim() || null,
        equipment: customSnapshot.equipment?.trim() || null,
        instructions: customSnapshot.instructions?.trim() || null,
      },
      notes: notes?.trim() || null,
    });

    // Provide default initial set
    try {
      await addSetToDraftItem(ctx, item.publicId, {
        setNumber: 1,
        setType: "NORMAL",
        targetReps: 10,
        targetRepsMax: 12,
        targetRestSeconds: 60,
      });
      item.sets = [
        {
          setNumber: 1,
          setType: "NORMAL",
          parentSetNumber: null,
          targetReps: 10,
          targetRepsMax: 12,
          targetLoadKg: null,
          targetDurationSeconds: null,
          targetDistanceMeters: null,
          targetRestSeconds: 60,
          intensityIndicator: null,
        },
      ];
    } catch {
      // Ignored if initial set creation fails
    }

    revalidatePath(`/consultoria/${slug}/rotinas`);
    return { ok: true, data: item };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao adicionar exercício personalizado.",
    };
  }
}

/**
 * Duplicates a block within the draft version.
 */
export async function duplicateBlockAction(
  slug: string,
  blockPublicId: string
): Promise<ActionResponse<WorkoutBlockDto>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);

    const duplicated = await duplicateBlockInDraft(ctx, blockPublicId);

    revalidatePath(`/consultoria/${slug}/rotinas`);
    return { ok: true, data: duplicated };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao duplicar bloco.",
    };
  }
}

/**
 * Reorders blocks in a draft version.
 */
export async function reorderBlocksAction(
  slug: string,
  versionPublicId: string,
  blockPublicIdsInOrder: string[]
): Promise<ActionResponse<{ success: boolean }>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);

    await reorderBlocksInDraft(ctx, versionPublicId, blockPublicIdsInOrder);

    revalidatePath(`/consultoria/${slug}/rotinas`);
    return { ok: true, data: { success: true } };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao reordenar blocos.",
    };
  }
}

/**
 * Removes a block from a draft version.
 */
export async function removeBlockAction(
  slug: string,
  blockPublicId: string
): Promise<ActionResponse<{ success: boolean }>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);

    await removeBlockFromDraft(ctx, blockPublicId);

    revalidatePath(`/consultoria/${slug}/rotinas`);
    return { ok: true, data: { success: true } };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao remover bloco.",
    };
  }
}

/**
 * Removes an item from a draft block.
 */
export async function removeItemAction(
  slug: string,
  itemPublicId: string
): Promise<ActionResponse<{ success: boolean }>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);

    await removeItemFromDraft(ctx, itemPublicId);

    revalidatePath(`/consultoria/${slug}/rotinas`);
    return { ok: true, data: { success: true } };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao remover item.",
    };
  }
}

/**
 * Reorders items within a draft block.
 */
export async function reorderItemsAction(
  slug: string,
  blockPublicId: string,
  itemPublicIdsInOrder: string[]
): Promise<ActionResponse<{ success: boolean }>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);

    await reorderItemsInDraft(ctx, blockPublicId, itemPublicIdsInOrder);

    revalidatePath(`/consultoria/${slug}/rotinas`);
    return { ok: true, data: { success: true } };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao reordenar itens.",
    };
  }
}

/**
 * Updates simple NORMAL sets for a block item.
 * Strictly guards against mutating advanced set structures.
 */
export async function updateNormalSetsAction(
  slug: string,
  itemPublicId: string,
  sets: SimpleNormalSetInput[]
): Promise<ActionResponse<WorkoutItemSetDto[]>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);

    const updatedSets = await replaceNormalSetsForDraftItem(ctx, itemPublicId, sets);

    revalidatePath(`/consultoria/${slug}/rotinas`);
    return { ok: true, data: updatedSets };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao atualizar séries do exercício.",
    };
  }
}

/**
 * Soft-archives a workout root.
 */
export async function archiveWorkoutAction(
  slug: string,
  workoutPublicId: string
): Promise<ActionResponse<{ archived: boolean }>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);

    await archiveWorkout(ctx, workoutPublicId);

    revalidatePath(`/consultoria/${slug}/rotinas`);
    return { ok: true, data: { archived: true } };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao arquivar treino.",
    };
  }
}

/**
 * Searches published library exercises for the unified exercise picker.
 * Strictly filters out drafts and enforces tenant/creator isolation.
 */
export async function searchExercisesForPickerAction(
  slug: string,
  options?: {
    query?: string;
    source?: "TODOS" | "TREVO_ONE" | "CONSULTORIA" | "MEUS";
    muscle?: string;
    equipment?: string;
  }
): Promise<ActionResponse<import("@/lib/training-v2/types").ExerciseItemDto[]>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);
    const { listExercisesForProfessional } = await import("@/lib/training-v2/exercise-repository");

    let scopeFilter: "GLOBAL" | "CONSULTANCY" | undefined;
    if (options?.source === "TREVO_ONE") {
      scopeFilter = "GLOBAL";
    } else if (options?.source === "CONSULTORIA" || options?.source === "MEUS") {
      scopeFilter = "CONSULTANCY";
    }

    const res = await listExercisesForProfessional(ctx, {
      scope: scopeFilter,
      query: options?.query?.trim() || undefined,
      muscleGroup: options?.muscle?.trim() || undefined,
      equipment: options?.equipment?.trim() || undefined,
      pageSize: 50,
    });

    // Enforce PUBLISHED only for normal workout selection (Section 26)
    let filtered = res.items.filter((ex) => ex.status === "PUBLISHED");

    if (options?.source === "CONSULTORIA") {
      filtered = filtered.filter((ex) => ex.scope === "CONSULTANCY" && ex.visibility === "CONSULTANCY");
    } else if (options?.source === "MEUS") {
      filtered = filtered.filter((ex) => ex.scope === "CONSULTANCY" && ex.visibility === "CREATOR_ONLY");
    }

    return { ok: true, data: filtered };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao buscar exercícios da biblioteca.",
    };
  }
}

/**
 * Creates a method block in a DRAFT version.
 */
export async function createMethodBlockAction(
  slug: string,
  versionPublicId: string,
  input: {
    blockType: WorkoutBlockType;
    title?: string | null;
    rounds?: number | null;
    restBetweenItemsSeconds?: number | null;
    restBetweenRoundsSeconds?: number | null;
    restAfterBlockSeconds?: number | null;
    instructions?: string | null;
  }
): Promise<ActionResponse<WorkoutBlockDto>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);

    const parsedBlockType = workoutBlockTypeSchema.safeParse(input.blockType);
    if (!parsedBlockType.success) {
      return {
        ok: false,
        error: "Método de bloco inválido.",
      };
    }

    const block = await addBlockToDraft(ctx, versionPublicId, {
      blockType: parsedBlockType.data,
      title: input.title?.trim() || null,
      rounds: input.rounds ?? null,
      restBetweenItemsSeconds: input.restBetweenItemsSeconds ?? null,
      restBetweenRoundsSeconds: input.restBetweenRoundsSeconds ?? null,
      restAfterBlockSeconds: input.restAfterBlockSeconds ?? null,
      instructions: input.instructions?.trim() || null,
    });

    revalidatePath(`/consultoria/${slug}/rotinas`);
    return { ok: true, data: block };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao criar bloco metodológico.",
    };
  }
}

/**
 * Updates full configuration parameters of a block in DRAFT.
 */
export async function updateBlockConfigurationAction(
  slug: string,
  blockPublicId: string,
  input: UpdateBlockConfigurationInput
): Promise<ActionResponse<WorkoutBlockDto>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);

    const block = await updateBlockConfigurationInDraft(ctx, blockPublicId, input);

    revalidatePath(`/consultoria/${slug}/rotinas`);
    return { ok: true, data: block };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao atualizar configuração do bloco.",
    };
  }
}

/**
 * Replaces sets for a DROP_SET item, linking each DROP_STAGE to the parent NORMAL set.
 */
export async function replaceDropSetStructureAction(
  slug: string,
  itemPublicId: string,
  input: ReplaceDropSetStructureInput
): Promise<ActionResponse<WorkoutItemSetDto[]>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);

    const sets = await replaceDropSetStructureForDraftItem(ctx, itemPublicId, input);

    revalidatePath(`/consultoria/${slug}/rotinas`);
    return { ok: true, data: sets };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao salvar séries de Drop-Set.",
    };
  }
}

/**
 * Replaces sets for a REST_PAUSE item, saving method config and linking mini sets.
 */
export async function replaceRestPauseStructureAction(
  slug: string,
  itemPublicId: string,
  input: ReplaceRestPauseStructureInput
): Promise<ActionResponse<WorkoutItemSetDto[]>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);

    const sets = await replaceRestPauseStructureForDraftItem(ctx, itemPublicId, input);

    revalidatePath(`/consultoria/${slug}/rotinas`);
    return { ok: true, data: sets };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao salvar séries de Rest-Pause.",
    };
  }
}

/**
 * Updates cardio configuration and sets for a CARDIO item.
 */
export async function updateCardioConfigurationAction(
  slug: string,
  itemPublicId: string,
  input: UpdateCardioConfigurationInput
): Promise<ActionResponse<{ config: import("@/lib/training-v2/types").CardioMethodConfig; sets: WorkoutItemSetDto[] }>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);

    const result = await updateCardioConfigurationForDraftItem(ctx, itemPublicId, input);

    revalidatePath(`/consultoria/${slug}/rotinas`);
    return { ok: true, data: result };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao salvar configuração aeróbia de Cardio.",
    };
  }
}

/**
 * Updates warmup configuration for a WARMUP item.
 */
export async function updateWarmupConfigurationAction(
  slug: string,
  itemPublicId: string,
  input: UpdateWarmupConfigurationInput
): Promise<ActionResponse<import("@/lib/training-v2/types").WarmupMethodConfig>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);

    const result = await updateWarmupConfigurationForDraftItem(ctx, itemPublicId, input);

    revalidatePath(`/consultoria/${slug}/rotinas`);
    return { ok: true, data: result };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao salvar configuração de Aquecimento.",
    };
  }
}


