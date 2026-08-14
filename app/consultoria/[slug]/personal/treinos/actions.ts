"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import {
  createDraftTrainingPlan,
  updateDraftTrainingPlanMetadata,
  createTrainingWorkout,
  updateTrainingWorkout,
  moveTrainingWorkout,
  removeTrainingWorkout,
  createTrainingWorkoutSection,
  updateTrainingWorkoutSection,
  moveTrainingWorkoutSection,
  removeTrainingWorkoutSection,
  createTrainingWorkoutBlock,
  updateTrainingWorkoutBlock,
  moveTrainingWorkoutBlock,
  removeTrainingWorkoutBlock,
  addTrainingBlockExerciseFromLibrary,
  addCustomTrainingBlockExercise,
  updateTrainingBlockExercise,
  moveTrainingBlockExercise,
  removeTrainingBlockExercise,
  checkTrainingPlanActivationReadiness,
  activateTrainingPlan,
  type TrainingBlockType,
  type ValidationIssue,
} from "@/lib/consultancies/training";

export type PlanActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  planPublicId?: string;
};

export async function createDraftTrainingPlanAction(
  _prevState: PlanActionState,
  formData: FormData
): Promise<PlanActionState> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const slug = String(formData.get("slug") || "").trim();
  const studentMembershipPublicId = String(
    formData.get("studentMembershipPublicId") || ""
  ).trim();
  const title = String(formData.get("title") || "").trim().normalize("NFC");
  const subtitle = String(formData.get("subtitle") || "").trim().normalize("NFC") || null;
  const description = String(formData.get("description") || "").trim().normalize("NFC") || null;
  const startsOn = String(formData.get("startsOn") || "").trim() || null;
  const endsOn = String(formData.get("endsOn") || "").trim() || null;

  if (!slug || !studentMembershipPublicId) {
    return { success: false, error: "Selecione um aluno para o plano." };
  }
  if (!title) {
    return { success: false, error: "O título do plano é obrigatório." };
  }

  const result = await createDraftTrainingPlan({
    actorUserId: session.userId,
    consultancySlug: slug,
    studentMembershipPublicId,
    title,
    subtitle,
    description,
    startsOn,
    endsOn,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(`/consultoria/${slug}/personal/treinos`);
  return {
    success: true,
    planPublicId: result.planPublicId,
    message: "Rascunho criado com sucesso!",
  };
}

export async function updateDraftTrainingPlanMetadataAction(
  _prevState: PlanActionState,
  formData: FormData
): Promise<PlanActionState> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada." };
  }

  const slug = String(formData.get("slug") || "").trim();
  const planPublicId = String(formData.get("planPublicId") || "").trim();
  const title = String(formData.get("title") || "").trim().normalize("NFC");
  const subtitle = String(formData.get("subtitle") || "").trim().normalize("NFC") || null;
  const description = String(formData.get("description") || "").trim().normalize("NFC") || null;
  const startsOn = String(formData.get("startsOn") || "").trim() || null;
  const endsOn = String(formData.get("endsOn") || "").trim() || null;

  if (!slug || !planPublicId || !title) {
    return { success: false, error: "Dados inválidos." };
  }

  const result = await updateDraftTrainingPlanMetadata({
    actorUserId: session.userId,
    consultancySlug: slug,
    planPublicId,
    title,
    subtitle,
    description,
    startsOn,
    endsOn,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(`/consultoria/${slug}/personal/treinos/${planPublicId}`);
  return {
    success: true,
    message: result.message || "Informações do plano atualizadas.",
  };
}

export async function createTrainingWorkoutAction(
  slug: string,
  planPublicId: string,
  data: {
    title: string;
    subtitle?: string | null;
    scheduledWeekday?: number | null;
    notes?: string | null;
  }
): Promise<{ success: boolean; error?: string; workoutPublicId?: string }> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Sessão expirada." };

  const result = await createTrainingWorkout({
    actorUserId: session.userId,
    consultancySlug: slug,
    planPublicId,
    ...data,
  });

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/personal/treinos/${planPublicId}`);
  }
  return result;
}

export async function updateTrainingWorkoutAction(
  slug: string,
  planPublicId: string,
  workoutPublicId: string,
  data: {
    title: string;
    subtitle?: string | null;
    scheduledWeekday?: number | null;
    notes?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Sessão expirada." };

  const result = await updateTrainingWorkout({
    actorUserId: session.userId,
    consultancySlug: slug,
    workoutPublicId,
    ...data,
  });

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/personal/treinos/${planPublicId}`);
  }
  return result;
}

export async function moveTrainingWorkoutAction(
  slug: string,
  planPublicId: string,
  workoutPublicId: string,
  direction: "UP" | "DOWN"
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Sessão expirada." };

  const result = await moveTrainingWorkout({
    actorUserId: session.userId,
    consultancySlug: slug,
    workoutPublicId,
    direction,
  });

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/personal/treinos/${planPublicId}`);
  }
  return result;
}

export async function removeTrainingWorkoutAction(
  slug: string,
  planPublicId: string,
  workoutPublicId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Sessão expirada." };

  const result = await removeTrainingWorkout({
    actorUserId: session.userId,
    consultancySlug: slug,
    workoutPublicId,
  });

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/personal/treinos/${planPublicId}`);
  }
  return result;
}

export async function createTrainingWorkoutSectionAction(
  slug: string,
  planPublicId: string,
  workoutPublicId: string,
  data: { title: string; description?: string | null }
): Promise<{ success: boolean; error?: string; sectionPublicId?: string }> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Sessão expirada." };

  const result = await createTrainingWorkoutSection({
    actorUserId: session.userId,
    consultancySlug: slug,
    workoutPublicId,
    ...data,
  });

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/personal/treinos/${planPublicId}`);
  }
  return result;
}

export async function updateTrainingWorkoutSectionAction(
  slug: string,
  planPublicId: string,
  sectionPublicId: string,
  data: { title: string; description?: string | null }
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Sessão expirada." };

  const result = await updateTrainingWorkoutSection({
    actorUserId: session.userId,
    consultancySlug: slug,
    sectionPublicId,
    ...data,
  });

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/personal/treinos/${planPublicId}`);
  }
  return result;
}

export async function moveTrainingWorkoutSectionAction(
  slug: string,
  planPublicId: string,
  sectionPublicId: string,
  direction: "UP" | "DOWN"
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Sessão expirada." };

  const result = await moveTrainingWorkoutSection({
    actorUserId: session.userId,
    consultancySlug: slug,
    sectionPublicId,
    direction,
  });

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/personal/treinos/${planPublicId}`);
  }
  return result;
}

export async function removeTrainingWorkoutSectionAction(
  slug: string,
  planPublicId: string,
  sectionPublicId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Sessão expirada." };

  const result = await removeTrainingWorkoutSection({
    actorUserId: session.userId,
    consultancySlug: slug,
    sectionPublicId,
  });

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/personal/treinos/${planPublicId}`);
  }
  return result;
}

export async function createTrainingWorkoutBlockAction(
  slug: string,
  planPublicId: string,
  sectionPublicId: string,
  data: {
    blockType: TrainingBlockType;
    title?: string | null;
    rounds?: number | null;
    restBetweenExercisesSeconds?: number | null;
    restAfterBlockSeconds?: number | null;
    instructions?: string | null;
  }
): Promise<{ success: boolean; error?: string; blockPublicId?: string }> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Sessão expirada." };

  const result = await createTrainingWorkoutBlock({
    actorUserId: session.userId,
    consultancySlug: slug,
    sectionPublicId,
    ...data,
  });

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/personal/treinos/${planPublicId}`);
  }
  return result;
}

export async function updateTrainingWorkoutBlockAction(
  slug: string,
  planPublicId: string,
  blockPublicId: string,
  data: {
    blockType: TrainingBlockType;
    title?: string | null;
    rounds?: number | null;
    restBetweenExercisesSeconds?: number | null;
    restAfterBlockSeconds?: number | null;
    instructions?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Sessão expirada." };

  const result = await updateTrainingWorkoutBlock({
    actorUserId: session.userId,
    consultancySlug: slug,
    blockPublicId,
    ...data,
  });

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/personal/treinos/${planPublicId}`);
  }
  return result;
}

export async function moveTrainingWorkoutBlockAction(
  slug: string,
  planPublicId: string,
  blockPublicId: string,
  direction: "UP" | "DOWN"
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Sessão expirada." };

  const result = await moveTrainingWorkoutBlock({
    actorUserId: session.userId,
    consultancySlug: slug,
    blockPublicId,
    direction,
  });

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/personal/treinos/${planPublicId}`);
  }
  return result;
}

export async function removeTrainingWorkoutBlockAction(
  slug: string,
  planPublicId: string,
  blockPublicId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Sessão expirada." };

  const result = await removeTrainingWorkoutBlock({
    actorUserId: session.userId,
    consultancySlug: slug,
    blockPublicId,
  });

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/personal/treinos/${planPublicId}`);
  }
  return result;
}

export async function addTrainingBlockExerciseFromLibraryAction(
  slug: string,
  planPublicId: string,
  blockPublicId: string,
  exercisePublicId: string,
  data: {
    sets?: number | null;
    repetitionsText?: string | null;
    restSeconds?: number | null;
    loadGuidance?: string | null;
    technique?: string | null;
    notes?: string | null;
    videoUrl?: string | null;
  }
): Promise<{ success: boolean; error?: string; blockExercisePublicId?: string }> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Sessão expirada." };

  const result = await addTrainingBlockExerciseFromLibrary({
    actorUserId: session.userId,
    consultancySlug: slug,
    blockPublicId,
    exercisePublicId,
    ...data,
  });

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/personal/treinos/${planPublicId}`);
  }
  return result;
}

export async function addCustomTrainingBlockExerciseAction(
  slug: string,
  planPublicId: string,
  blockPublicId: string,
  data: {
    name: string;
    description?: string | null;
    muscleGroup?: string | null;
    equipment?: string | null;
    instructions?: string | null;
    sets?: number | null;
    repetitionsText?: string | null;
    restSeconds?: number | null;
    loadGuidance?: string | null;
    technique?: string | null;
    notes?: string | null;
    videoUrl?: string | null;
  }
): Promise<{ success: boolean; error?: string; blockExercisePublicId?: string }> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Sessão expirada." };

  const result = await addCustomTrainingBlockExercise({
    actorUserId: session.userId,
    consultancySlug: slug,
    blockPublicId,
    ...data,
  });

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/personal/treinos/${planPublicId}`);
  }
  return result;
}

export async function updateTrainingBlockExerciseAction(
  slug: string,
  planPublicId: string,
  blockExercisePublicId: string,
  data: {
    nameSnapshot: string;
    descriptionSnapshot?: string | null;
    muscleGroupSnapshot?: string | null;
    equipmentSnapshot?: string | null;
    instructionsSnapshot?: string | null;
    sets?: number | null;
    repetitionsText?: string | null;
    restSeconds?: number | null;
    loadGuidance?: string | null;
    technique?: string | null;
    notes?: string | null;
    videoUrl?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Sessão expirada." };

  const result = await updateTrainingBlockExercise({
    actorUserId: session.userId,
    consultancySlug: slug,
    blockExercisePublicId,
    ...data,
  });

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/personal/treinos/${planPublicId}`);
  }
  return result;
}

export async function moveTrainingBlockExerciseAction(
  slug: string,
  planPublicId: string,
  blockExercisePublicId: string,
  direction: "UP" | "DOWN"
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Sessão expirada." };

  const result = await moveTrainingBlockExercise({
    actorUserId: session.userId,
    consultancySlug: slug,
    blockExercisePublicId,
    direction,
  });

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/personal/treinos/${planPublicId}`);
  }
  return result;
}

export async function removeTrainingBlockExerciseAction(
  slug: string,
  planPublicId: string,
  blockExercisePublicId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: "Sessão expirada." };

  const result = await removeTrainingBlockExercise({
    actorUserId: session.userId,
    consultancySlug: slug,
    blockExercisePublicId,
  });

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/personal/treinos/${planPublicId}`);
  }
  return result;
}

/**
 * Server Action de preflight para validação de completude antes de disponibilizar para o aluno.
 */
export async function validateTrainingPlanActivationAction(
  slug: string,
  planPublicId: string
): Promise<
  | {
      success: true;
      valid: boolean;
      issues: ValidationIssue[];
      planTitle: string;
      studentName: string;
    }
  | { success: false; error: string }
> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada." };
  }

  return checkTrainingPlanActivationReadiness({
    actorUserId: session.userId,
    consultancySlug: slug,
    planPublicId,
  });
}

/**
 * Server Action de ativação atômica e transacional de um plano de treino.
 */
export async function activateTrainingPlanAction(
  slug: string,
  planPublicId: string
): Promise<
  | {
      success: true;
      alreadyActive?: boolean;
      activatedPlanPublicId: string;
      studentMembershipPublicId: string;
      studentName: string;
      message: string;
    }
  | { success: false; error: string; issues?: ValidationIssue[] }
> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada." };
  }

  const result = await activateTrainingPlan({
    actorUserId: session.userId,
    consultancySlug: slug,
    planPublicId,
  });

  if (result.success) {
    revalidatePath(`/consultoria/${slug}/personal/treinos`);
    revalidatePath(`/consultoria/${slug}/personal/treinos/${planPublicId}`);
    revalidatePath(`/consultoria/${slug}/treinos`);

    return {
      ...result,
      message: result.alreadyActive
        ? "Este plano já está ativo para o aluno."
        : "Plano de treino disponibilizado para o aluno com sucesso!",
    };
  }

  return result;
}
