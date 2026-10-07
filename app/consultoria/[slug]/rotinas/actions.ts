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
  duplicateItemInDraft,
  moveItemToBlockInDraft,
  updateItemQuickConfigInDraft,
  type QuickConfigInput,
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
  deleteWorkout,
  deleteWorkoutDraft,
  createWorkoutSubBlock,
  renameWorkoutSubBlock,
  reorderWorkoutSubBlocks,
  deleteWorkoutSubBlock,
  duplicateWorkoutSubBlock,
  createWorkoutItemCombination,
  updateWorkoutItemCombination,
  ungroupWorkoutItemCombination,
  deleteWorkoutItemCombination,
  addItemToCombination,
  removeItemFromCombination,
  reorderWorkoutItemCombination,
  moveItemInCombination,
  duplicateWorkoutItemCombination,
  createCustomExerciseInWorkout,
  convertUnresolvedToCustomExercise,
  resolveUnmatchedExerciseItem,
  publishWorkoutVersion,
  createNewDraftVersionFromPublished,
  duplicateWorkout,
  saveWorkoutAsTemplate,
  createWorkoutFromTemplate,
  assignTemplateToStudent,
  getTemplatePreview,
  listWorkoutVersions,
  listPublishedTemplatesForPicker,
  type CreateWorkoutInput,
  type UpdateWorkoutDraftMetadataInput,
  type SimpleNormalSetInput,
  type UpdateBlockConfigurationInput,
  type ReplaceDropSetStructureInput,
  type ReplaceRestPauseStructureInput,
  type UpdateCardioConfigurationInput,
  type UpdateWarmupConfigurationInput,
  type WorkoutVersionSummaryDto,
  type TemplatePickerItemDto,
  type AssignTemplateToStudentInput,
  type TemplatePreviewDto,
} from "@/lib/training-v2/workout-repository";
import type {
  WorkoutVersionDto,
  WorkoutBlockDto,
  WorkoutSubBlockDto,
  WorkoutBlockItemDto,
  WorkoutItemCombinationDto,
  WorkoutCombinationType,
  WorkoutItemSetDto,
  WorkoutSetType,
  WorkoutBlockType,
} from "@/lib/training-v2/types";
import { workoutBlockTypeSchema } from "@/lib/training-v2/validation";
import {
  createAssignment,
  repointAssignmentToNewVersion,
  getActiveAssignmentForStudentAndWorkout,
  terminateAssignment,
  searchActiveStudents,
  getActiveStudentByMembershipPublicId,
  listAssignmentsForProfessional,
  type StudentSearchResult,
  type ProfessionalAssignmentListItem,
} from "@/lib/training-v2/assignment-repository";

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
      isTemplate: Boolean(input.isTemplate),
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
      error: err instanceof Error ? err.message : "Erro ao adicionar categoria à ficha.",
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
      error: err instanceof Error ? err.message : "Erro ao renomear categoria.",
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
  notes?: string,
  subBlockPublicId?: string | null,
  durationUnit?: "SECONDS" | "MINUTES" | null
): Promise<ActionResponse<WorkoutBlockItemDto>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);

    if (!exercisePublicId || !exercisePublicId.trim()) {
      return { ok: false, error: "Identificador do exercício inválido." };
    }

    const item = await addItemToDraftBlock(ctx, blockPublicId, {
      exercisePublicId: exercisePublicId.trim(),
      subBlockPublicId: subBlockPublicId?.trim() || null,
      durationUnit: durationUnit || null,
      notes: notes?.trim() || null,
    });

    // Provide default initial set if none exist
    try {
      const initialSets: WorkoutItemSetDto[] = [];
      for (let s = 1; s <= 4; s++) {
        await addSetToDraftItem(ctx, item.publicId, {
          setNumber: s,
          setType: "NORMAL",
          targetReps: 10,
          targetRestSeconds: 60,
          durationUnit: durationUnit || null,
        });
        initialSets.push({
          setNumber: s,
          setType: "NORMAL",
          parentSetNumber: null,
          targetReps: 10,
          targetRepsMax: null,
          targetLoadKg: null,
          targetDurationSeconds: null,
          durationUnit: durationUnit || null,
          targetDistanceMeters: null,
          targetRestSeconds: 60,
          intensityIndicator: null,
        });
      }
      item.sets = initialSets;
    } catch {
      // Ignored if initial set creation fails
    }

    revalidatePath(`/consultoria/${slug}/rotinas`);
    return { ok: true, data: item };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao adicionar exercício à categoria.",
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
  notes?: string,
  subBlockPublicId?: string | null
): Promise<ActionResponse<WorkoutBlockItemDto>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);

    if (!customSnapshot.exerciseName || !customSnapshot.exerciseName.trim()) {
      return { ok: false, error: "O nome do exercício personalizado é obrigatório." };
    }
    if (customSnapshot.muscleGroup && customSnapshot.muscleGroup.trim().length > 100) {
      return { ok: false, error: "O grupo muscular não pode exceder 100 caracteres." };
    }
    if (customSnapshot.equipment && customSnapshot.equipment.trim().length > 100) {
      return { ok: false, error: "O equipamento não pode exceder 100 caracteres." };
    }

    const item = await addItemToDraftBlock(ctx, blockPublicId, {
      customSnapshot: {
        exerciseName: customSnapshot.exerciseName.trim(),
        muscleGroup: customSnapshot.muscleGroup?.trim() || null,
        equipment: customSnapshot.equipment?.trim() || null,
        instructions: customSnapshot.instructions?.trim() || null,
      },
      subBlockPublicId: subBlockPublicId?.trim() || null,
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
      error: err instanceof Error ? err.message : "Erro ao duplicar categoria.",
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
      error: err instanceof Error ? err.message : "Erro ao reordenar categorias.",
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
      error: err instanceof Error ? err.message : "Erro ao remover categoria.",
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
        error: "Método de categoria inválido.",
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
      error: err instanceof Error ? err.message : "Erro ao criar categoria.",
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
      error: err instanceof Error ? err.message : "Erro ao atualizar categoria.",
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

/**
 * Publishes a DRAFT workout version with complete 11-method server-side validation.
 */
export async function publishWorkoutAction(
  slug: string,
  versionPublicId: string
): Promise<ActionResponse<WorkoutVersionDto>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);
    const published = await publishWorkoutVersion(ctx, versionPublicId);

    revalidatePath(`/consultoria/${slug}/rotinas`);
    revalidatePath(`/consultoria/${slug}/rotinas/${published.workoutPublicId}`);
    return { ok: true, data: published };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao publicar versão do treino.",
    };
  }
}

/**
 * Publishes a DRAFT workout version, automatically converting any remaining
 * UNRESOLVED exercises to tenant-scoped CUSTOM exercises with full prescription preservation.
 * Requires explicit human confirmation from the professional.
 */
export async function publishWorkoutWithAutoCustomAction(
  slug: string,
  versionPublicId: string
): Promise<ActionResponse<WorkoutVersionDto>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);
    const published = await publishWorkoutVersion(ctx, versionPublicId, {
      autoConvertUnresolved: true,
    });

    revalidatePath(`/consultoria/${slug}/rotinas`);
    revalidatePath(`/consultoria/${slug}/rotinas/${published.workoutPublicId}`);
    return { ok: true, data: published };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao publicar versão do treino como personalizados.",
    };
  }
}

/**
 * Creates a new DRAFT version (Version N+1) from an immutable published version.
 * If an active draft already exists, idempotently returns the existing draft.
 */
export async function createNewWorkoutVersionAction(
  slug: string,
  workoutPublicId: string
): Promise<ActionResponse<WorkoutVersionDto>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);
    const newDraft = await createNewDraftVersionFromPublished(ctx, workoutPublicId);

    revalidatePath(`/consultoria/${slug}/rotinas`);
    revalidatePath(`/consultoria/${slug}/rotinas/${workoutPublicId}`);
    return { ok: true, data: newDraft };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao criar nova versão em rascunho.",
    };
  }
}

/**
 * Duplicates a complete workout routine from an explicit source version into a new workout root.
 */
export async function duplicateWorkoutAction(
  slug: string,
  workoutPublicId: string,
  versionPublicId?: string,
  options?: { title?: string; isTemplate?: boolean }
): Promise<ActionResponse<{ workoutPublicId: string; versionPublicId: string }>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);
    let targetVersionPublicId = versionPublicId;
    if (!targetVersionPublicId) {
      const versions = await listWorkoutVersions(ctx, workoutPublicId);
      if (!versions || versions.length === 0) {
        return { ok: false, error: "Nenhuma versão encontrada para duplicar." };
      }
      const published = versions.find((v) => v.status === "PUBLISHED");
      targetVersionPublicId = (published || versions[0]).publicId;
    }
    const result = await duplicateWorkout(ctx, workoutPublicId, targetVersionPublicId, options);

    revalidatePath(`/consultoria/${slug}/rotinas`);
    return {
      ok: true,
      data: {
        workoutPublicId: result.workout.publicId,
        versionPublicId: result.version.publicId,
      },
    };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao duplicar rotina de treino.",
    };
  }
}

/**
 * Saves a workout routine as a template (is_template = true) from an explicit source version.
 */
export async function saveWorkoutAsTemplateAction(
  slug: string,
  workoutPublicId: string,
  versionPublicId: string,
  options?: { title?: string }
): Promise<ActionResponse<{ templatePublicId: string; versionPublicId: string }>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);
    const result = await saveWorkoutAsTemplate(ctx, workoutPublicId, versionPublicId, options);

    revalidatePath(`/consultoria/${slug}/rotinas`);
    return {
      ok: true,
      data: {
        templatePublicId: result.workout.publicId,
        versionPublicId: result.version.publicId,
      },
    };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao salvar rotina como modelo.",
    };
  }
}

/**
 * Creates a new normal workout routine (is_template = false, Version 1 DRAFT) from a published template.
 */
export async function createWorkoutFromTemplateAction(
  slug: string,
  templatePublicId: string,
  options?: { title?: string; targetStudentMembershipPublicId?: string }
): Promise<ActionResponse<{ workoutPublicId: string; versionPublicId: string }>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);
    const result = await createWorkoutFromTemplate(ctx, templatePublicId, options);

    revalidatePath(`/consultoria/${slug}/rotinas`);
    return {
      ok: true,
      data: {
        workoutPublicId: result.workout.publicId,
        versionPublicId: result.version.publicId,
      },
    };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao criar treino a partir do modelo.",
    };
  }
}

/**
 * Assigns a PUBLISHED workout template directly to a student.
 * Creates an independent workout copy (Copy-On-Assign), publishes Version 1,
 * and links the student via workout_assignments.
 */
export async function assignTemplateToStudentAction(
  slug: string,
  templatePublicId: string,
  studentMembershipPublicId: string,
  options?: AssignTemplateToStudentInput
): Promise<
  ActionResponse<{
    workoutPublicId: string;
    versionPublicId: string;
    assignmentPublicId: string;
  }>
> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);
    const result = await assignTemplateToStudent(
      ctx,
      templatePublicId,
      studentMembershipPublicId,
      options
    );

    revalidatePath(`/consultoria/${slug}/rotinas`);
    revalidatePath(`/consultoria/${slug}/progresso/alunos/${studentMembershipPublicId}`);

    return {
      ok: true,
      data: {
        workoutPublicId: result.workout.publicId,
        versionPublicId: result.version.publicId,
        assignmentPublicId: result.assignmentPublicId,
      },
    };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao atribuir modelo ao aluno.",
    };
  }
}

/**
 * Retrieves a preview summary of a published template (categories and exercises).
 */
export async function getTemplatePreviewAction(
  slug: string,
  templatePublicId: string
): Promise<ActionResponse<TemplatePreviewDto>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);
    const preview = await getTemplatePreview(ctx, templatePublicId);
    if (!preview) {
      return { ok: false, error: "Modelo não encontrado ou ainda não publicado." };
    }
    return { ok: true, data: preview };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao carregar prévia do modelo.",
    };
  }
}

/**
 * Lists version history for a workout routine.
 */
export async function listWorkoutVersionsAction(
  slug: string,
  workoutPublicId: string
): Promise<ActionResponse<WorkoutVersionSummaryDto[]>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);
    const versions = await listWorkoutVersions(ctx, workoutPublicId);
    return { ok: true, data: versions };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao carregar histórico de versões.",
    };
  }
}

/**
 * Lists published templates in the current consultancy for the Template Picker.
 */
export async function listPublishedTemplatesAction(
  slug: string,
  query?: string
): Promise<ActionResponse<TemplatePickerItemDto[]>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);
    const templates = await listPublishedTemplatesForPicker(ctx, query);
    return { ok: true, data: templates };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao carregar modelos de treino.",
    };
  }
}

/**
 * Assigns a PUBLISHED workout version to an active student membership.
 */
export async function assignWorkoutVersionAction(
  slug: string,
  workoutPublicId: string,
  versionPublicId: string,
  studentMembershipPublicId: string,
  options?: {
    startsOn?: string;
    endsOn?: string | null;
    notesForStudent?: string | null;
  }
): Promise<ActionResponse<{ assignmentPublicId: string }>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);

    if (!workoutPublicId || !workoutPublicId.trim()) {
      return { ok: false, error: "Identificador do treino é obrigatório." };
    }
    if (!versionPublicId || !versionPublicId.trim()) {
      return { ok: false, error: "Identificador da versão é obrigatório." };
    }
    if (!studentMembershipPublicId || !studentMembershipPublicId.trim()) {
      return { ok: false, error: "Selecione um aluno para prescrever o treino." };
    }

    const startsOn = options?.startsOn?.trim() || new Date().toISOString().slice(0, 10);

    const assignment = await createAssignment(ctx, {
      workoutPublicId: workoutPublicId.trim(),
      workoutVersionPublicId: versionPublicId.trim(),
      studentMembershipPublicId: studentMembershipPublicId.trim(),
      startsOn,
      endsOn: options?.endsOn?.trim() || null,
      notesForStudent: options?.notesForStudent?.trim() || null,
    });

    revalidatePath(`/consultoria/${slug}/rotinas`);
    revalidatePath(`/consultoria/${slug}/treinos`);

    return {
      ok: true,
      data: { assignmentPublicId: assignment.publicId },
    };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao prescrever treino para o aluno.",
    };
  }
}

/**
 * Explicitly updates an active assignment to a newer PUBLISHED version of the same workout routine.
 */
export async function updateWorkoutAssignmentVersionAction(
  slug: string,
  assignmentPublicId: string,
  targetVersionPublicId: string
): Promise<ActionResponse<{ success: boolean }>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);

    if (!assignmentPublicId || !assignmentPublicId.trim()) {
      return { ok: false, error: "Identificador da prescrição é obrigatório." };
    }
    if (!targetVersionPublicId || !targetVersionPublicId.trim()) {
      return { ok: false, error: "Identificador da versão de destino é obrigatório." };
    }

    await repointAssignmentToNewVersion(
      ctx,
      assignmentPublicId.trim(),
      targetVersionPublicId.trim()
    );

    revalidatePath(`/consultoria/${slug}/rotinas`);
    revalidatePath(`/consultoria/${slug}/treinos`);

    return { ok: true, data: { success: true } };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao atualizar versão da prescrição.",
    };
  }
}

/**
 * Checks if a student already has an active assignment for a workout routine.
 */
export async function getStudentActiveWorkoutAssignmentAction(
  slug: string,
  workoutPublicId: string,
  studentMembershipPublicId: string
): Promise<ActionResponse<{
  assignmentPublicId: string;
  versionPublicId: string;
  versionNumber: number;
  startsOn: string;
  endsOn: string | null;
} | null>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);
    const existing = await getActiveAssignmentForStudentAndWorkout(
      ctx,
      workoutPublicId,
      studentMembershipPublicId
    );
    return { ok: true, data: existing };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao verificar prescrição existente.",
    };
  }
}

/**
 * Terminates an active assignment (Encerrar prescrição).
 */
export async function terminateWorkoutAssignmentAction(
  slug: string,
  assignmentPublicId: string,
  endDate?: string | null
): Promise<ActionResponse<{ success: boolean }>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);

    if (!assignmentPublicId || !assignmentPublicId.trim()) {
      return { ok: false, error: "Identificador da prescrição é obrigatório." };
    }

    const success = await terminateAssignment(ctx, assignmentPublicId.trim(), endDate);

    revalidatePath(`/consultoria/${slug}/rotinas`);
    revalidatePath(`/consultoria/${slug}/treinos`);

    return { ok: true, data: { success } };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao encerrar prescrição.",
    };
  }
}

/**
 * Searches active student members in current consultancy for student picker.
 */
export async function searchActiveStudentsAction(
  slug: string,
  query?: string
): Promise<ActionResponse<StudentSearchResult[]>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);
    const students = await searchActiveStudents(ctx, query);
    return { ok: true, data: students };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao buscar alunos.",
    };
  }
}

/**
 * Lists assignments for professional management.
 */
/**
 * Resolves an active student strictly by membership public ID for preselection.
 */
export async function getActiveStudentByMembershipAction(
  slug: string,
  membershipPublicId: string
): Promise<ActionResponse<StudentSearchResult | null>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);
    const student = await getActiveStudentByMembershipPublicId(ctx, membershipPublicId);
    return { ok: true, data: student };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao buscar aluno por vinculo.",
    };
  }
}

export async function listProfessionalAssignmentsAction(
  slug: string,
  options?: {
    workoutPublicId?: string;
    studentMembershipPublicId?: string;
    status?: "ACTIVE" | "ENDED" | "ALL";
    page?: number;
  }
): Promise<ActionResponse<{ items: ProfessionalAssignmentListItem[]; total: number }>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);
    const page = Math.max(1, options?.page || 1);
    const limit = 50;
    const offset = (page - 1) * limit;

    const res = await listAssignmentsForProfessional(ctx, {
      workoutPublicId: options?.workoutPublicId,
      studentMembershipPublicId: options?.studentMembershipPublicId,
      status: options?.status,
      limit,
      offset,
    });

    return { ok: true, data: res };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao carregar prescrições.",
    };
  }
}

// ============================================================================
// SIMPLIFIED CATEGORY & EXERCISE ACTIONS (TREVO ONE — TRAINING V2)
// ============================================================================

export async function createCategoryAction(
  slug: string,
  versionPublicId: string,
  title: string
): Promise<ActionResponse<WorkoutBlockDto>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);
    if (!title || !title.trim()) {
      return { ok: false, error: "Nome da categoria é obrigatório." };
    }
    const block = await addBlockToDraft(ctx, versionPublicId, {
      blockType: "CUSTOM",
      title: title.trim(),
    });
    revalidatePath(`/consultoria/${slug}/rotinas`);
    return { ok: true, data: block };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao criar categoria.",
    };
  }
}

export async function renameCategoryAction(
  slug: string,
  blockPublicId: string,
  title: string
): Promise<ActionResponse<WorkoutBlockDto>> {
  return updateBlockTitleAction(slug, blockPublicId, title);
}

export async function duplicateCategoryAction(
  slug: string,
  blockPublicId: string
): Promise<ActionResponse<WorkoutBlockDto>> {
  return duplicateBlockAction(slug, blockPublicId);
}

export async function deleteCategoryAction(
  slug: string,
  blockPublicId: string
): Promise<ActionResponse<{ success: boolean }>> {
  return removeBlockAction(slug, blockPublicId);
}

export async function reorderCategoriesAction(
  slug: string,
  versionPublicId: string,
  categoryPublicIds: string[]
): Promise<ActionResponse<{ success: boolean }>> {
  return reorderBlocksAction(slug, versionPublicId, categoryPublicIds);
}

export async function duplicateExerciseAction(
  slug: string,
  itemPublicId: string
): Promise<ActionResponse<WorkoutBlockItemDto>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);
    const newItem = await duplicateItemInDraft(ctx, itemPublicId);
    revalidatePath(`/consultoria/${slug}/rotinas`);
    return { ok: true, data: newItem };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao duplicar exercício.",
    };
  }
}

export async function moveExerciseToCategoryAction(
  slug: string,
  itemPublicId: string,
  targetCategoryPublicId: string
): Promise<ActionResponse<void>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);
    await moveItemToBlockInDraft(ctx, itemPublicId, targetCategoryPublicId);
    revalidatePath(`/consultoria/${slug}/rotinas`);
    return { ok: true };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao mover exercício para outra categoria.",
    };
  }
}

export async function deleteExerciseAction(
  slug: string,
  itemPublicId: string
): Promise<ActionResponse<{ success: boolean }>> {
  return removeItemAction(slug, itemPublicId);
}

export async function reorderExercisesAction(
  slug: string,
  categoryPublicId: string,
  itemPublicIds: string[]
): Promise<ActionResponse<{ success: boolean }>> {
  return reorderItemsAction(slug, categoryPublicId, itemPublicIds);
}

export async function updateExerciseQuickConfigAction(
  slug: string,
  itemPublicId: string,
  config: QuickConfigInput
): Promise<ActionResponse<WorkoutItemSetDto[]>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);
    const sets = await updateItemQuickConfigInDraft(ctx, itemPublicId, config);
    revalidatePath(`/consultoria/${slug}/rotinas`);
    return { ok: true, data: sets };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao salvar configurações do exercício.",
    };
  }
}

/**
 * Creates a new sub-block (Grupo) inside a workout block.
 */
export async function createSubBlockAction(
  slug: string,
  blockPublicId: string,
  title: string
): Promise<ActionResponse<WorkoutSubBlockDto>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);
    if (!title || !title.trim()) {
      return { ok: false, error: "O nome do grupo é obrigatório." };
    }
    const subBlock = await createWorkoutSubBlock(ctx, blockPublicId, { title: title.trim() });
    revalidatePath(`/consultoria/${slug}/rotinas`);
    return { ok: true, data: subBlock };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao criar grupo.",
    };
  }
}

/**
 * Renames a sub-block (Grupo).
 */
export async function renameSubBlockAction(
  slug: string,
  subBlockPublicId: string,
  title: string
): Promise<ActionResponse<WorkoutSubBlockDto>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);
    if (!title || !title.trim()) {
      return { ok: false, error: "O nome do grupo não pode ser vazio." };
    }
    const subBlock = await renameWorkoutSubBlock(ctx, subBlockPublicId, title.trim());
    revalidatePath(`/consultoria/${slug}/rotinas`);
    return { ok: true, data: subBlock };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao renomear grupo.",
    };
  }
}

/**
 * Reorders sub-blocks (Grupos) inside a workout block.
 */
export async function reorderSubBlocksAction(
  slug: string,
  blockPublicId: string,
  subBlockPublicIds: string[]
): Promise<ActionResponse<{ success: boolean }>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);
    await reorderWorkoutSubBlocks(ctx, blockPublicId, subBlockPublicIds);
    revalidatePath(`/consultoria/${slug}/rotinas`);
    return { ok: true, data: { success: true } };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao reordenar grupos.",
    };
  }
}

/**
 * Deletes a sub-block (Grupo) and its contained exercises.
 */
export async function deleteSubBlockAction(
  slug: string,
  subBlockPublicId: string
): Promise<ActionResponse<{ success: boolean }>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);
    await deleteWorkoutSubBlock(ctx, subBlockPublicId);
    revalidatePath(`/consultoria/${slug}/rotinas`);
    return { ok: true, data: { success: true } };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao excluir grupo.",
    };
  }
}

/**
 * Duplicates a sub-block (Grupo) and all its exercises, media, and sets.
 */
export async function duplicateSubBlockAction(
  slug: string,
  subBlockPublicId: string
): Promise<ActionResponse<WorkoutSubBlockDto>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);
    const duplicated = await duplicateWorkoutSubBlock(ctx, subBlockPublicId);
    revalidatePath(`/consultoria/${slug}/rotinas`);
    return { ok: true, data: duplicated };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao duplicar grupo.",
    };
  }
}

/**
 * Resolves an unmatched or needs-review exercise item in a draft by associating a real library exercise.
 */
export async function resolveUnmatchedExerciseItemAction(
  slug: string,
  itemPublicId: string,
  exercisePublicId: string
): Promise<ActionResponse<WorkoutBlockItemDto>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);
    const item = await resolveUnmatchedExerciseItem(ctx, itemPublicId, exercisePublicId);
    revalidatePath(`/consultoria/${slug}/rotinas`);
    return { ok: true, data: item };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao vincular exercício da biblioteca.",
    };
  }
}

/**
 * Deletes or archives a workout root (Ficha).
 * Preserves completed student execution history.
 */
export async function deleteWorkoutAction(
  slug: string,
  workoutPublicId: string
): Promise<ActionResponse<{ success: boolean }>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);
    await deleteWorkout(ctx, workoutPublicId);
    revalidatePath(`/consultoria/${slug}/rotinas`);
    return { ok: true, data: { success: true } };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao excluir treino.",
    };
  }
}

/**
 * Deletes a draft version of a workout.
 * If the workout has no published versions, soft-deletes the workout root entirely.
 */
export async function deleteWorkoutDraftAction(
  slug: string,
  versionPublicId: string
): Promise<ActionResponse<{ success: boolean }>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);
    await deleteWorkoutDraft(ctx, versionPublicId);
    revalidatePath(`/consultoria/${slug}/rotinas`);
    return { ok: true, data: { success: true } };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao excluir rascunho.",
    };
  }
}

// ============================================================================
// TRAINING BUILDER V3.1 — COMBINATIONS (BI-SET / TRI-SET / CIRCUITO) & CUSTOM EXERCISES
// ============================================================================

/**
 * Creates a combination (BI_SET, TRI_SET, SUPERSET, GIANT_SET, CIRCUIT) grouping multiple items.
 */
export async function createItemCombinationAction(
  slug: string,
  input: {
    blockPublicId: string;
    subBlockPublicId?: string;
    combinationType: WorkoutCombinationType;
    title?: string;
    restAfterSeconds?: number;
    restAfterUnit?: "s" | "min";
    itemPublicIds: string[];
  }
): Promise<ActionResponse<WorkoutItemCombinationDto>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);
    if (!input.itemPublicIds || input.itemPublicIds.length < 2) {
      return { ok: false, error: "Selecione pelo menos 2 exercícios para criar uma combinação." };
    }
    const combination = await createWorkoutItemCombination(ctx, input);
    revalidatePath(`/consultoria/${slug}/rotinas`);
    return { ok: true, data: combination };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao criar combinação de exercícios.",
    };
  }
}

/**
 * Updates an existing combination (type, title, rest after combination).
 */
export async function updateItemCombinationAction(
  slug: string,
  combinationPublicId: string,
  input: {
    combinationType?: WorkoutCombinationType;
    title?: string;
    restAfterSeconds?: number;
    restAfterUnit?: "s" | "min";
  }
): Promise<ActionResponse<WorkoutItemCombinationDto>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);
    const updated = await updateWorkoutItemCombination(ctx, combinationPublicId, input);
    revalidatePath(`/consultoria/${slug}/rotinas`);
    return { ok: true, data: updated };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao atualizar combinação.",
    };
  }
}

/**
 * Ungroups a combination, returning all its exercises to individual state in the group without deleting them.
 */
export async function ungroupItemCombinationAction(
  slug: string,
  combinationPublicId: string
): Promise<ActionResponse<{ success: boolean }>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);
    await ungroupWorkoutItemCombination(ctx, combinationPublicId);
    revalidatePath(`/consultoria/${slug}/rotinas`);
    return { ok: true, data: { success: true } };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao desagrupar combinação.",
    };
  }
}

/**
 * Deletes a combination. Can either ungroup items (deleteItems = false) or delete all grouped items (deleteItems = true).
 */
export async function deleteItemCombinationAction(
  slug: string,
  combinationPublicId: string,
  deleteItems: boolean = false
): Promise<ActionResponse<{ success: boolean }>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);
    await deleteWorkoutItemCombination(ctx, combinationPublicId, deleteItems);
    revalidatePath(`/consultoria/${slug}/rotinas`);
    return { ok: true, data: { success: true } };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao excluir combinação.",
    };
  }
}

/**
 * Reorders items inside a combination.
 */
export async function reorderItemCombinationAction(
  slug: string,
  combinationPublicId: string,
  direction: "up" | "down"
): Promise<ActionResponse<{ success: boolean }>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);
    await reorderWorkoutItemCombination(ctx, combinationPublicId, direction.toUpperCase() as "UP" | "DOWN");
    revalidatePath(`/consultoria/${slug}/rotinas`);
    return { ok: true, data: { success: true } };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao reordenar exercícios da combinação.",
    };
  }
}

/**
 * Moves an item inside a combination up or down.
 */
export async function moveItemInCombinationAction(
  slug: string,
  combinationPublicId: string,
  itemPublicId: string,
  direction: "up" | "down"
): Promise<ActionResponse<{ success: boolean }>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);
    await moveItemInCombination(ctx, combinationPublicId, itemPublicId, direction.toUpperCase() as "UP" | "DOWN");
    revalidatePath(`/consultoria/${slug}/rotinas`);
    return { ok: true, data: { success: true } };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao mover exercício na combinação.",
    };
  }
}

/**
 * Duplicates a combination and its items.
 */
export async function duplicateItemCombinationAction(
  slug: string,
  combinationPublicId: string
): Promise<ActionResponse<WorkoutItemCombinationDto>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);
    const duplicated = await duplicateWorkoutItemCombination(ctx, combinationPublicId);
    revalidatePath(`/consultoria/${slug}/rotinas`);
    return { ok: true, data: duplicated };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao duplicar combinação.",
    };
  }
}

/**
 * Adds an existing exercise item into an existing combination.
 */
export async function addItemToCombinationAction(
  slug: string,
  combinationPublicId: string,
  itemPublicId: string
): Promise<ActionResponse<{ success: boolean }>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);
    await addItemToCombination(ctx, combinationPublicId, itemPublicId);
    revalidatePath(`/consultoria/${slug}/rotinas`);
    return { ok: true, data: { success: true } };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao adicionar exercício à combinação.",
    };
  }
}

/**
 * Removes an exercise item from a combination. If 1 or fewer items remain, auto-ungroups.
 */
export async function removeItemFromCombinationAction(
  slug: string,
  combinationPublicId: string,
  itemPublicId: string
): Promise<ActionResponse<{ success: boolean }>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);
    await removeItemFromCombination(ctx, combinationPublicId, itemPublicId);
    revalidatePath(`/consultoria/${slug}/rotinas`);
    return { ok: true, data: { success: true } };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao remover exercício da combinação.",
    };
  }
}

/**
 * Creates a custom exercise outside the global catalog and adds it to the workout block/sub-block.
 */
export async function createCustomExerciseAction(
  slug: string,
  categoryPublicId: string,
  input: {
    name: string;
    description?: string | null;
    muscleGroup?: string;
    equipment?: string;
    instructions?: string;
    subBlockPublicId?: string;
    customVideoUrl?: string;
    mediaAssetPublicId?: string;
    saveToLibrary?: boolean;
    sets?: {
      setType?: string;
      targetReps?: number | null;
      targetRepsMax?: number | null;
      targetLoadKg?: number | null;
      targetDurationSeconds?: number | null;
      durationUnit?: string | null;
      targetRestSeconds?: number;
    }[];
    durationUnit?: string;
    notes?: string;
    isSequence?: boolean;
    sequenceMovements?: string[];
  }
): Promise<ActionResponse<WorkoutBlockItemDto>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);
    if (!input.name || !input.name.trim()) {
      return { ok: false, error: "O nome do exercício é obrigatório." };
    }
    const item = await createCustomExerciseInWorkout(ctx, {
      categoryPublicId,
      subBlockPublicId: input.subBlockPublicId,
      name: input.name,
      description: input.description,
      muscleGroupPrimary: input.muscleGroup,
      equipment: input.equipment,
      instructions: input.instructions,
      customVideoUrl: input.customVideoUrl,
      mediaAssetPublicId: input.mediaAssetPublicId,
      saveToLibrary: input.saveToLibrary,
      notes: input.notes,
      durationUnit: input.durationUnit,
      isSequence: input.isSequence,
      sequenceMovements: input.sequenceMovements,
      sets: (input.sets || []).map((s) => ({
        setType: (s.setType as WorkoutSetType) || "NORMAL",
        targetReps: s.targetReps ?? null,
        targetRepsMax: s.targetRepsMax ?? null,
        targetLoadKg: s.targetLoadKg ?? null,
        targetDurationSeconds: s.targetDurationSeconds ?? null,
        durationUnit: s.durationUnit || null,
        targetRestSeconds: s.targetRestSeconds ?? 60,
      })),
    });
    revalidatePath(`/consultoria/${slug}/rotinas`);
    return { ok: true, data: item };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao criar exercício personalizado.",
    };
  }
}

/**
 * Converts an unresolved / needs-review exercise item into a custom exercise.
 * Unblocks publication while preserving sets, reps, load, and order.
 */
export async function convertUnresolvedToCustomExerciseAction(
  slug: string,
  input: {
    itemPublicId: string;
    name: string;
    description?: string | null;
    muscleGroupPrimary?: string | null;
    equipment?: string | null;
    instructions?: string | null;
    customVideoUrl?: string | null;
    mediaAssetPublicId?: string | null;
    saveToLibrary?: boolean;
    notes?: string | null;
    isSequence?: boolean;
    sequenceMovements?: string[];
  }
): Promise<ActionResponse<WorkoutBlockItemDto>> {
  try {
    const { ctx } = await requireConsultancyProfessionalContext(slug);
    const item = await convertUnresolvedToCustomExercise(ctx, input);
    revalidatePath(`/consultoria/${slug}/rotinas`);
    return { ok: true, data: item };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erro ao converter exercício para personalizado.",
    };
  }
}
