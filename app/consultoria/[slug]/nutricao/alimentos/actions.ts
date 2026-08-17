"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/auth/session";
import {
  createManualNutritionFood,
  updateManualNutritionFood,
  inactivateManualNutritionFood,
} from "@/lib/consultancies/nutrition";

export type NutritionFoodActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  foodPublicId?: string;
};

export async function createManualNutritionFoodAction(
  _prevState: NutritionFoodActionState,
  formData: FormData
): Promise<NutritionFoodActionState> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const slug = String(formData.get("slug") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const referenceAmount = String(formData.get("referenceAmount") || "").trim();
  const referenceUnit = String(formData.get("referenceUnit") || "").trim();
  const caloriesKcal = String(formData.get("caloriesKcal") || "").trim();
  const proteinG = String(formData.get("proteinG") || "").trim();
  const carbohydrateG = String(formData.get("carbohydrateG") || "").trim();
  const fatG = String(formData.get("fatG") || "").trim();

  if (!slug) {
    return { success: false, error: "Contexto da consultoria inválido." };
  }

  const result = await createManualNutritionFood({
    actorUserId: session.userId,
    consultancySlug: slug,
    name,
    referenceAmount,
    referenceUnit,
    caloriesKcal,
    proteinG,
    carbohydrateG,
    fatG,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePath(`/consultoria/${slug}/nutricao/alimentos`);
  return {
    success: true,
    foodPublicId: result.foodPublicId,
    message: "Alimento cadastrado com sucesso!",
  };
}

export async function updateManualNutritionFoodAction(
  _prevState: NutritionFoodActionState,
  formData: FormData
): Promise<NutritionFoodActionState> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const slug = String(formData.get("slug") || "").trim();
  const foodPublicId = String(formData.get("foodPublicId") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const referenceAmount = String(formData.get("referenceAmount") || "").trim();
  const referenceUnit = String(formData.get("referenceUnit") || "").trim();
  const caloriesKcal = String(formData.get("caloriesKcal") || "").trim();
  const proteinG = String(formData.get("proteinG") || "").trim();
  const carbohydrateG = String(formData.get("carbohydrateG") || "").trim();
  const fatG = String(formData.get("fatG") || "").trim();

  if (!slug) {
    return { success: false, error: "Contexto da consultoria inválido." };
  }
  if (!foodPublicId) {
    return { success: false, error: "Identificador do alimento inválido." };
  }

  const result = await updateManualNutritionFood({
    actorUserId: session.userId,
    consultancySlug: slug,
    foodPublicId,
    name,
    referenceAmount,
    referenceUnit,
    caloriesKcal,
    proteinG,
    carbohydrateG,
    fatG,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  revalidatePath(`/consultoria/${slug}/nutricao/alimentos`);
  revalidatePath(`/consultoria/${slug}/nutricao/alimentos/${foodPublicId}`);
  return {
    success: true,
    foodPublicId: result.foodPublicId,
    message: result.message || "Alimento atualizado com sucesso!",
  };
}

export async function inactivateManualNutritionFoodAction(
  _prevState: NutritionFoodActionState,
  formData: FormData
): Promise<NutritionFoodActionState> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const slug = String(formData.get("slug") || "").trim();
  const foodPublicId = String(formData.get("foodPublicId") || "").trim();

  if (!slug) {
    return { success: false, error: "Contexto da consultoria inválido." };
  }
  if (!foodPublicId) {
    return { success: false, error: "Identificador do alimento inválido." };
  }

  const result = await inactivateManualNutritionFood({
    actorUserId: session.userId,
    consultancySlug: slug,
    foodPublicId,
  });

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    };
  }

  revalidatePath(`/consultoria/${slug}/nutricao/alimentos`);
  return {
    success: true,
    message: result.message || "Alimento inativado com sucesso!",
  };
}
