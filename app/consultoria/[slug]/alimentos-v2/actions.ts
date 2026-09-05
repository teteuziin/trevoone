"use server";

import { revalidatePath } from "next/cache";
import {
  resolveNutritionAccessContext,
  NutritionAuthorizationError,
} from "@/lib/nutrition-v2/access";
import {
  listUnifiedFoodsForNutritionist,
  getFoodWithPortions,
  createConsultancyFood,
  updateConsultancyFood,
  archiveConsultancyFood,
  createFoodPortion,
  updateFoodPortion,
  archiveFoodPortion,
  type ListFoodsFilter,
  type CreateFoodInput,
  type UpdateFoodInput,
  type CreatePortionInput,
  type UpdatePortionInput,
} from "@/lib/nutrition-v2/food-repository";
import {
  nutritionV2FoodInputSchema,
  nutritionV2FoodPortionInputSchema,
} from "@/lib/nutrition-v2/validation";

export type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
};

function handleError(err: unknown, defaultMessage: string): ActionResult<never> {
  if (err instanceof NutritionAuthorizationError) {
    return { success: false, error: err.message, code: err.code };
  }
  if (err instanceof Error) {
    return { success: false, error: err.message, code: "OPERATION_FAILED" };
  }
  return { success: false, error: defaultMessage, code: "INTERNAL_ERROR" };
}

export async function listUnifiedFoodsAction(
  slug: string,
  filter: ListFoodsFilter = {}
): Promise<ActionResult> {
  try {
    const ctx = await resolveNutritionAccessContext(slug);
    if (!ctx || !ctx.canAuthorNutrition) {
      return {
        success: false,
        error: "Acesso não autorizado.",
        code: "UNAUTHORIZED",
      };
    }

    const result = await listUnifiedFoodsForNutritionist(ctx, filter);
    return { success: true, data: result };
  } catch (err: unknown) {
    return handleError(err, "Erro ao carregar alimentos.");
  }
}

export async function getFoodDetailsAction(
  slug: string,
  foodPublicId: string
): Promise<ActionResult> {
  try {
    const ctx = await resolveNutritionAccessContext(slug);
    if (!ctx || !ctx.canAuthorNutrition) {
      return { success: false, error: "Acesso não autorizado.", code: "UNAUTHORIZED" };
    }

    const food = await getFoodWithPortions(foodPublicId, ctx);
    if (!food) {
      return { success: false, error: "Alimento não encontrado.", code: "NOT_FOUND" };
    }

    return { success: true, data: food };
  } catch (err: unknown) {
    return handleError(err, "Erro ao carregar alimento.");
  }
}

export async function createConsultancyFoodAction(
  slug: string,
  rawInput: CreateFoodInput
): Promise<ActionResult<{ publicId: string }>> {
  try {
    const ctx = await resolveNutritionAccessContext(slug);
    if (!ctx || !ctx.canAuthorNutrition) {
      return { success: false, error: "Apenas nutricionistas da consultoria podem cadastrar alimentos.", code: "UNAUTHORIZED" };
    }

    const parsed = nutritionV2FoodInputSchema.safeParse({
      ...rawInput,
      scope: "CONSULTANCY",
      consultancyId: String(ctx.consultancyId),
    });

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Dados inválidos.",
        code: "VALIDATION_ERROR",
      };
    }

    const result = await createConsultancyFood(ctx, rawInput);
    revalidatePath(`/consultoria/${slug}/alimentos-v2`);
    return { success: true, data: result };
  } catch (err: unknown) {
    return handleError(err, "Erro ao cadastrar alimento.");
  }
}

export async function updateConsultancyFoodAction(
  slug: string,
  foodPublicId: string,
  rawInput: UpdateFoodInput
): Promise<ActionResult> {
  try {
    const ctx = await resolveNutritionAccessContext(slug);
    if (!ctx || !ctx.canAuthorNutrition) {
      return { success: false, error: "Apenas nutricionistas da consultoria podem editar alimentos.", code: "UNAUTHORIZED" };
    }

    if (rawInput.referenceAmount != null && rawInput.referenceAmount <= 0) {
      return { success: false, error: "Quantidade de referência deve ser maior que zero.", code: "VALIDATION_ERROR" };
    }

    await updateConsultancyFood(ctx, foodPublicId, rawInput);
    revalidatePath(`/consultoria/${slug}/alimentos-v2`);
    return { success: true };
  } catch (err: unknown) {
    return handleError(err, "Erro ao atualizar alimento.");
  }
}

export async function archiveConsultancyFoodAction(
  slug: string,
  foodPublicId: string
): Promise<ActionResult> {
  try {
    const ctx = await resolveNutritionAccessContext(slug);
    if (!ctx || !ctx.canAuthorNutrition) {
      return { success: false, error: "Apenas nutricionistas da consultoria podem arquivar alimentos.", code: "UNAUTHORIZED" };
    }

    await archiveConsultancyFood(ctx, foodPublicId);
    revalidatePath(`/consultoria/${slug}/alimentos-v2`);
    return { success: true };
  } catch (err: unknown) {
    return handleError(err, "Erro ao arquivar alimento.");
  }
}

export async function createPortionAction(
  slug: string,
  foodPublicId: string,
  rawInput: CreatePortionInput
): Promise<ActionResult<{ publicId: string }>> {
  try {
    const ctx = await resolveNutritionAccessContext(slug);
    if (!ctx || !ctx.canAuthorNutrition) {
      return { success: false, error: "Acesso não autorizado.", code: "UNAUTHORIZED" };
    }

    const parsed = nutritionV2FoodPortionInputSchema.safeParse({
      label: rawInput.label,
      equivalentReferenceAmount: Number(rawInput.equivalentReferenceAmount),
      sortOrder: rawInput.sortOrder || 0,
    });

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Dados da porção inválidos.",
        code: "VALIDATION_ERROR",
      };
    }

    const result = await createFoodPortion(ctx, foodPublicId, rawInput);
    revalidatePath(`/consultoria/${slug}/alimentos-v2`);
    return { success: true, data: result };
  } catch (err: unknown) {
    return handleError(err, "Erro ao criar porção.");
  }
}

export async function updatePortionAction(
  slug: string,
  portionPublicId: string,
  rawInput: UpdatePortionInput
): Promise<ActionResult> {
  try {
    const ctx = await resolveNutritionAccessContext(slug);
    if (!ctx || !ctx.canAuthorNutrition) {
      return { success: false, error: "Acesso não autorizado.", code: "UNAUTHORIZED" };
    }

    if (rawInput.equivalentReferenceAmount != null && rawInput.equivalentReferenceAmount <= 0) {
      return { success: false, error: "Quantidade equivalente deve ser maior que zero.", code: "VALIDATION_ERROR" };
    }

    await updateFoodPortion(ctx, portionPublicId, rawInput);
    revalidatePath(`/consultoria/${slug}/alimentos-v2`);
    return { success: true };
  } catch (err: unknown) {
    return handleError(err, "Erro ao atualizar porção.");
  }
}

export async function archivePortionAction(
  slug: string,
  portionPublicId: string
): Promise<ActionResult> {
  try {
    const ctx = await resolveNutritionAccessContext(slug);
    if (!ctx || !ctx.canAuthorNutrition) {
      return { success: false, error: "Acesso não autorizado.", code: "UNAUTHORIZED" };
    }

    await archiveFoodPortion(ctx, portionPublicId);
    revalidatePath(`/consultoria/${slug}/alimentos-v2`);
    return { success: true };
  } catch (err: unknown) {
    return handleError(err, "Erro ao arquivar porção.");
  }
}
