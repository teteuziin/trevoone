"use server";

import { revalidatePath } from "next/cache";
import {
  resolveNutritionAccessContext,
  NutritionAuthorizationError,
} from "@/lib/nutrition-v2/access";
import {
  listGlobalFoodsForAdmin,
  getFoodWithPortions,
  createGlobalFood,
  updateGlobalFood,
  archiveGlobalFood,
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

export async function listGlobalFoodsAction(
  filter: ListFoodsFilter = {}
): Promise<ActionResult> {
  try {
    const ctx = await resolveNutritionAccessContext();
    if (!ctx || !ctx.canManageGlobal) {
      return { success: false, error: "Acesso restrito ao Administrador da Plataforma.", code: "UNAUTHORIZED" };
    }

    const result = await listGlobalFoodsForAdmin(ctx, filter);
    return { success: true, data: result };
  } catch (err: unknown) {
    return handleError(err, "Erro ao carregar alimentos globais.");
  }
}

export async function getGlobalFoodDetailsAction(
  foodPublicId: string
): Promise<ActionResult> {
  try {
    const ctx = await resolveNutritionAccessContext();
    if (!ctx || !ctx.canManageGlobal) {
      return { success: false, error: "Acesso restrito ao Administrador da Plataforma.", code: "UNAUTHORIZED" };
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

export async function createGlobalFoodAction(
  rawInput: CreateFoodInput
): Promise<ActionResult<{ publicId: string }>> {
  try {
    const ctx = await resolveNutritionAccessContext();
    if (!ctx || !ctx.canManageGlobal) {
      return { success: false, error: "Acesso restrito ao Administrador da Plataforma.", code: "UNAUTHORIZED" };
    }

    const parsed = nutritionV2FoodInputSchema.safeParse({
      ...rawInput,
      scope: "GLOBAL",
      consultancyId: null,
    });

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Dados inválidos.",
        code: "VALIDATION_ERROR",
      };
    }

    const result = await createGlobalFood(ctx, rawInput);
    revalidatePath("/admin/alimentos");
    return { success: true, data: result };
  } catch (err: unknown) {
    return handleError(err, "Erro ao cadastrar alimento global.");
  }
}

export async function updateGlobalFoodAction(
  foodPublicId: string,
  rawInput: UpdateFoodInput
): Promise<ActionResult> {
  try {
    const ctx = await resolveNutritionAccessContext();
    if (!ctx || !ctx.canManageGlobal) {
      return { success: false, error: "Acesso restrito ao Administrador da Plataforma.", code: "UNAUTHORIZED" };
    }

    if (rawInput.referenceAmount != null && rawInput.referenceAmount <= 0) {
      return { success: false, error: "Quantidade de referência deve ser maior que zero.", code: "VALIDATION_ERROR" };
    }

    await updateGlobalFood(ctx, foodPublicId, rawInput);
    revalidatePath("/admin/alimentos");
    return { success: true };
  } catch (err: unknown) {
    return handleError(err, "Erro ao atualizar alimento global.");
  }
}

export async function archiveGlobalFoodAction(
  foodPublicId: string
): Promise<ActionResult> {
  try {
    const ctx = await resolveNutritionAccessContext();
    if (!ctx || !ctx.canManageGlobal) {
      return { success: false, error: "Acesso restrito ao Administrador da Plataforma.", code: "UNAUTHORIZED" };
    }

    await archiveGlobalFood(ctx, foodPublicId);
    revalidatePath("/admin/alimentos");
    return { success: true };
  } catch (err: unknown) {
    return handleError(err, "Erro ao arquivar alimento global.");
  }
}

export async function createGlobalPortionAction(
  foodPublicId: string,
  rawInput: CreatePortionInput
): Promise<ActionResult<{ publicId: string }>> {
  try {
    const ctx = await resolveNutritionAccessContext();
    if (!ctx || !ctx.canManageGlobal) {
      return { success: false, error: "Acesso restrito ao Administrador da Plataforma.", code: "UNAUTHORIZED" };
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
    revalidatePath("/admin/alimentos");
    return { success: true, data: result };
  } catch (err: unknown) {
    return handleError(err, "Erro ao criar porção global.");
  }
}

export async function updateGlobalPortionAction(
  portionPublicId: string,
  rawInput: UpdatePortionInput
): Promise<ActionResult> {
  try {
    const ctx = await resolveNutritionAccessContext();
    if (!ctx || !ctx.canManageGlobal) {
      return { success: false, error: "Acesso restrito ao Administrador da Plataforma.", code: "UNAUTHORIZED" };
    }

    if (rawInput.equivalentReferenceAmount != null && rawInput.equivalentReferenceAmount <= 0) {
      return { success: false, error: "Quantidade equivalente deve ser maior que zero.", code: "VALIDATION_ERROR" };
    }

    await updateFoodPortion(ctx, portionPublicId, rawInput);
    revalidatePath("/admin/alimentos");
    return { success: true };
  } catch (err: unknown) {
    return handleError(err, "Erro ao atualizar porção global.");
  }
}

export async function archiveGlobalPortionAction(
  portionPublicId: string
): Promise<ActionResult> {
  try {
    const ctx = await resolveNutritionAccessContext();
    if (!ctx || !ctx.canManageGlobal) {
      return { success: false, error: "Acesso restrito ao Administrador da Plataforma.", code: "UNAUTHORIZED" };
    }

    await archiveFoodPortion(ctx, portionPublicId);
    revalidatePath("/admin/alimentos");
    return { success: true };
  } catch (err: unknown) {
    return handleError(err, "Erro ao arquivar porção global.");
  }
}
