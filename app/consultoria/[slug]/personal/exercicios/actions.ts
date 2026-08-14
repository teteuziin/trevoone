"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import {
  createTrainingExercise,
  updateTrainingExercise,
  deactivateTrainingExercise,
  reactivateTrainingExercise,
} from "@/lib/consultancies/training";

export type ExerciseActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export async function createTrainingExerciseAction(
  _prevState: ExerciseActionState,
  formData: FormData
): Promise<ExerciseActionState> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const slug = String(formData.get("slug") || "").trim();
  const name = String(formData.get("name") || "").trim().normalize("NFC");
  const muscleGroup = String(formData.get("muscleGroup") || "").trim().normalize("NFC") || null;
  const equipment = String(formData.get("equipment") || "").trim().normalize("NFC") || null;
  const description = String(formData.get("description") || "").trim().normalize("NFC") || null;
  const instructions = String(formData.get("instructions") || "").trim().normalize("NFC") || null;

  if (!slug) {
    return { success: false, error: "Contexto da consultoria inválido." };
  }

  if (!name) {
    return {
      success: false,
      fieldErrors: { name: "O nome do exercício é obrigatório." },
    };
  }

  if (name.length > 255) {
    return {
      success: false,
      fieldErrors: { name: "O nome deve ter no máximo 255 caracteres." },
    };
  }

  if (muscleGroup && muscleGroup.length > 100) {
    return {
      success: false,
      fieldErrors: { muscleGroup: "O grupo muscular deve ter no máximo 100 caracteres." },
    };
  }

  if (equipment && equipment.length > 100) {
    return {
      success: false,
      fieldErrors: { equipment: "O equipamento deve ter no máximo 100 caracteres." },
    };
  }

  const result = await createTrainingExercise({
    actorUserId: session.userId,
    consultancySlug: slug,
    name,
    description,
    muscleGroup,
    equipment,
    instructions,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(`/consultoria/${slug}/personal/exercicios`);
  return { success: true, message: "Exercício cadastrado com sucesso!" };
}

export async function updateTrainingExerciseAction(
  _prevState: ExerciseActionState,
  formData: FormData
): Promise<ExerciseActionState> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const slug = String(formData.get("slug") || "").trim();
  const exercisePublicId = String(formData.get("exercisePublicId") || "").trim();
  const name = String(formData.get("name") || "").trim().normalize("NFC");
  const muscleGroup = String(formData.get("muscleGroup") || "").trim().normalize("NFC") || null;
  const equipment = String(formData.get("equipment") || "").trim().normalize("NFC") || null;
  const description = String(formData.get("description") || "").trim().normalize("NFC") || null;
  const instructions = String(formData.get("instructions") || "").trim().normalize("NFC") || null;

  if (!slug || !exercisePublicId) {
    return { success: false, error: "Parâmetros da requisição inválidos." };
  }

  if (!name) {
    return {
      success: false,
      fieldErrors: { name: "O nome do exercício é obrigatório." },
    };
  }

  if (name.length > 255) {
    return {
      success: false,
      fieldErrors: { name: "O nome deve ter no máximo 255 caracteres." },
    };
  }

  if (muscleGroup && muscleGroup.length > 100) {
    return {
      success: false,
      fieldErrors: { muscleGroup: "O grupo muscular deve ter no máximo 100 caracteres." },
    };
  }

  if (equipment && equipment.length > 100) {
    return {
      success: false,
      fieldErrors: { equipment: "O equipamento deve ter no máximo 100 caracteres." },
    };
  }

  const result = await updateTrainingExercise({
    actorUserId: session.userId,
    consultancySlug: slug,
    exercisePublicId,
    name,
    description,
    muscleGroup,
    equipment,
    instructions,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(`/consultoria/${slug}/personal/exercicios`);
  return {
    success: true,
    message: result.message || "Exercício atualizado com sucesso!",
  };
}

export async function deactivateTrainingExerciseAction(
  exercisePublicId: string,
  slug: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada." };
  }

  const result = await deactivateTrainingExercise({
    actorUserId: session.userId,
    consultancySlug: slug,
    exercisePublicId,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(`/consultoria/${slug}/personal/exercicios`);
  return { success: true, message: "Exercício desativado." };
}

export async function reactivateTrainingExerciseAction(
  exercisePublicId: string,
  slug: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada." };
  }

  const result = await reactivateTrainingExercise({
    actorUserId: session.userId,
    consultancySlug: slug,
    exercisePublicId,
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(`/consultoria/${slug}/personal/exercicios`);
  return { success: true, message: "Exercício reativado." };
}
