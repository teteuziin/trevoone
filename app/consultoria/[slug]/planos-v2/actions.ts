"use server";

import { revalidatePath } from "next/cache";
import { resolveNutritionAccessContext, assertCanAuthorNutrition } from "@/lib/nutrition-v2/access";
import {
  createPlanWithDraftVersion,
  updatePlanVersionMetadata,
  addMeal,
  updateMeal,
  removeMeal,
  reorderMeals,
  addMealItem,
  updateMealItem,
  removeMealItem,
  reorderMealItems,
  addSubstitution,
  updateSubstitution,
  removeSubstitution,
  reorderSubstitutions,
  publishPlanVersion,
  createNextDraftVersion,
  getPlanVersionHistory,
  type AddMealItemInput,
  type UpdateMealItemInput,
  type AddSubstitutionInput,
  type UpdateSubstitutionInput,
  type PlanVersionHistoryItemDto,
} from "@/lib/nutrition-v2/plan-repository";
import {
  listUnifiedFoodsForNutritionist,
  getFoodWithPortions,
} from "@/lib/nutrition-v2/food-repository";

export type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
};

// ============================================================================
// PLAN CREATION & METADATA
// ============================================================================

export async function createPlanAction(
  slug: string,
  formData: FormData
): Promise<ActionResult<{ planPublicId: string; versionPublicId: string }>> {
  try {
    const ctx = await resolveNutritionAccessContext(slug);
    if (!ctx) return { success: false, error: "Sessão expirada ou não autorizada.", code: "UNAUTHORIZED" };
    assertCanAuthorNutrition(ctx);

    const title = String(formData.get("title") || "").trim();
    const subtitle = String(formData.get("subtitle") || "").trim() || null;
    const objective = String(formData.get("objective") || "").trim() || null;
    const generalGuidance = String(formData.get("generalGuidance") || "").trim() || null;
    const notes = String(formData.get("notes") || "").trim() || null;

    if (!title) {
      return { success: false, error: "O título do plano é obrigatório.", code: "VALIDATION_ERROR" };
    }

    const res = await createPlanWithDraftVersion(ctx, {
      title,
      subtitle,
      objective,
      generalGuidance,
      notes,
    });

    revalidatePath(`/consultoria/${slug}/planos-v2`);
    return { success: true, data: res };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao criar plano.";
    return { success: false, error: message };
  }
}

export async function updatePlanMetadataAction(
  slug: string,
  planPublicId: string,
  versionPublicId: string,
  data: {
    title?: string;
    subtitle?: string | null;
    objective?: string | null;
    generalGuidance?: string | null;
    notes?: string | null;
  }
): Promise<ActionResult> {
  try {
    const ctx = await resolveNutritionAccessContext(slug);
    if (!ctx) return { success: false, error: "Sessão expirada ou não autorizada.", code: "UNAUTHORIZED" };
    assertCanAuthorNutrition(ctx);

    await updatePlanVersionMetadata(ctx, versionPublicId, data);
    revalidatePath(`/consultoria/${slug}/planos-v2/${planPublicId}`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao atualizar dados do plano.";
    return { success: false, error: message };
  }
}

// ============================================================================
// MEALS
// ============================================================================

export async function addMealAction(
  slug: string,
  planPublicId: string,
  versionPublicId: string,
  data: { title: string; scheduledTime?: string | null; notes?: string | null }
): Promise<ActionResult<{ mealPublicId: string }>> {
  try {
    const ctx = await resolveNutritionAccessContext(slug);
    if (!ctx) return { success: false, error: "Sessão expirada ou não autorizada.", code: "UNAUTHORIZED" };
    assertCanAuthorNutrition(ctx);

    const res = await addMeal(ctx, versionPublicId, data);
    revalidatePath(`/consultoria/${slug}/planos-v2/${planPublicId}`);
    return { success: true, data: res };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao adicionar refeição.";
    return { success: false, error: message };
  }
}

export async function updateMealAction(
  slug: string,
  planPublicId: string,
  mealPublicId: string,
  data: { title?: string; scheduledTime?: string | null; notes?: string | null }
): Promise<ActionResult> {
  try {
    const ctx = await resolveNutritionAccessContext(slug);
    if (!ctx) return { success: false, error: "Sessão expirada ou não autorizada.", code: "UNAUTHORIZED" };
    assertCanAuthorNutrition(ctx);

    await updateMeal(ctx, mealPublicId, data);
    revalidatePath(`/consultoria/${slug}/planos-v2/${planPublicId}`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao atualizar refeição.";
    return { success: false, error: message };
  }
}

export async function removeMealAction(
  slug: string,
  planPublicId: string,
  mealPublicId: string
): Promise<ActionResult> {
  try {
    const ctx = await resolveNutritionAccessContext(slug);
    if (!ctx) return { success: false, error: "Sessão expirada ou não autorizada.", code: "UNAUTHORIZED" };
    assertCanAuthorNutrition(ctx);

    await removeMeal(ctx, mealPublicId);
    revalidatePath(`/consultoria/${slug}/planos-v2/${planPublicId}`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao remover refeição.";
    return { success: false, error: message };
  }
}

export async function reorderMealsAction(
  slug: string,
  planPublicId: string,
  versionPublicId: string,
  orderedMealPublicIds: string[]
): Promise<ActionResult> {
  try {
    const ctx = await resolveNutritionAccessContext(slug);
    if (!ctx) return { success: false, error: "Sessão expirada ou não autorizada.", code: "UNAUTHORIZED" };
    assertCanAuthorNutrition(ctx);

    await reorderMeals(ctx, versionPublicId, orderedMealPublicIds);
    revalidatePath(`/consultoria/${slug}/planos-v2/${planPublicId}`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao reordenar refeições.";
    return { success: false, error: message };
  }
}

// ============================================================================
// MEAL ITEMS
// ============================================================================

export async function addMealItemAction(
  slug: string,
  planPublicId: string,
  mealPublicId: string,
  payload: AddMealItemInput
): Promise<ActionResult<{ itemPublicId: string }>> {
  try {
    const ctx = await resolveNutritionAccessContext(slug);
    if (!ctx) return { success: false, error: "Sessão expirada ou não autorizada.", code: "UNAUTHORIZED" };
    assertCanAuthorNutrition(ctx);

    const res = await addMealItem(ctx, mealPublicId, payload);
    revalidatePath(`/consultoria/${slug}/planos-v2/${planPublicId}`);
    return { success: true, data: res };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao adicionar item.";
    return { success: false, error: message };
  }
}

export async function updateMealItemAction(
  slug: string,
  planPublicId: string,
  itemPublicId: string,
  payload: UpdateMealItemInput
): Promise<ActionResult> {
  try {
    const ctx = await resolveNutritionAccessContext(slug);
    if (!ctx) return { success: false, error: "Sessão expirada ou não autorizada.", code: "UNAUTHORIZED" };
    assertCanAuthorNutrition(ctx);

    await updateMealItem(ctx, itemPublicId, payload);
    revalidatePath(`/consultoria/${slug}/planos-v2/${planPublicId}`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao atualizar item.";
    return { success: false, error: message };
  }
}

export async function removeMealItemAction(
  slug: string,
  planPublicId: string,
  itemPublicId: string
): Promise<ActionResult> {
  try {
    const ctx = await resolveNutritionAccessContext(slug);
    if (!ctx) return { success: false, error: "Sessão expirada ou não autorizada.", code: "UNAUTHORIZED" };
    assertCanAuthorNutrition(ctx);

    await removeMealItem(ctx, itemPublicId);
    revalidatePath(`/consultoria/${slug}/planos-v2/${planPublicId}`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao remover item.";
    return { success: false, error: message };
  }
}

export async function reorderMealItemsAction(
  slug: string,
  planPublicId: string,
  mealPublicId: string,
  orderedItemPublicIds: string[]
): Promise<ActionResult> {
  try {
    const ctx = await resolveNutritionAccessContext(slug);
    if (!ctx) return { success: false, error: "Sessão expirada ou não autorizada.", code: "UNAUTHORIZED" };
    assertCanAuthorNutrition(ctx);

    await reorderMealItems(ctx, mealPublicId, orderedItemPublicIds);
    revalidatePath(`/consultoria/${slug}/planos-v2/${planPublicId}`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao reordenar itens.";
    return { success: false, error: message };
  }
}

// ============================================================================
// SUBSTITUTIONS
// ============================================================================

export async function addSubstitutionAction(
  slug: string,
  planPublicId: string,
  itemPublicId: string,
  payload: AddSubstitutionInput
): Promise<ActionResult<{ substitutionPublicId: string }>> {
  try {
    const ctx = await resolveNutritionAccessContext(slug);
    if (!ctx) return { success: false, error: "Sessão expirada ou não autorizada.", code: "UNAUTHORIZED" };
    assertCanAuthorNutrition(ctx);

    const res = await addSubstitution(ctx, itemPublicId, payload);
    revalidatePath(`/consultoria/${slug}/planos-v2/${planPublicId}`);
    return { success: true, data: res };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao adicionar substituição.";
    return { success: false, error: message };
  }
}

export async function updateSubstitutionAction(
  slug: string,
  planPublicId: string,
  substitutionPublicId: string,
  payload: UpdateSubstitutionInput
): Promise<ActionResult> {
  try {
    const ctx = await resolveNutritionAccessContext(slug);
    if (!ctx) return { success: false, error: "Sessão expirada ou não autorizada.", code: "UNAUTHORIZED" };
    assertCanAuthorNutrition(ctx);

    await updateSubstitution(ctx, substitutionPublicId, payload);
    revalidatePath(`/consultoria/${slug}/planos-v2/${planPublicId}`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao atualizar substituição.";
    return { success: false, error: message };
  }
}

export async function removeSubstitutionAction(
  slug: string,
  planPublicId: string,
  substitutionPublicId: string
): Promise<ActionResult> {
  try {
    const ctx = await resolveNutritionAccessContext(slug);
    if (!ctx) return { success: false, error: "Sessão expirada ou não autorizada.", code: "UNAUTHORIZED" };
    assertCanAuthorNutrition(ctx);

    await removeSubstitution(ctx, substitutionPublicId);
    revalidatePath(`/consultoria/${slug}/planos-v2/${planPublicId}`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao remover substituição.";
    return { success: false, error: message };
  }
}

export async function reorderSubstitutionsAction(
  slug: string,
  planPublicId: string,
  itemPublicId: string,
  orderedSubstitutionPublicIds: string[]
): Promise<ActionResult> {
  try {
    const ctx = await resolveNutritionAccessContext(slug);
    if (!ctx) return { success: false, error: "Sessão expirada ou não autorizada.", code: "UNAUTHORIZED" };
    assertCanAuthorNutrition(ctx);

    await reorderSubstitutions(ctx, itemPublicId, orderedSubstitutionPublicIds);
    revalidatePath(`/consultoria/${slug}/planos-v2/${planPublicId}`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao reordenar substituições.";
    return { success: false, error: message };
  }
}

// ============================================================================
// FOOD & PORTION PICKER PROXIES
// ============================================================================

export async function searchFoodsForPickerAction(
  slug: string,
  query: string,
  scope: "ALL" | "GLOBAL" | "CONSULTANCY" = "ALL",
  page: number = 1
) {
  try {
    const ctx = await resolveNutritionAccessContext(slug);
    if (!ctx) return { success: false, error: "Sessão expirada ou não autorizada." };
    assertCanAuthorNutrition(ctx);

    const res = await listUnifiedFoodsForNutritionist(ctx, {
      query,
      scope,
      status: "ACTIVE", // Picker only allows active foods
      page,
      pageSize: 20,
    });

    return { success: true, data: res };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao buscar alimentos.";
    return { success: false, error: message };
  }
}

export async function getFoodPortionsForPickerAction(
  slug: string,
  foodPublicId: string
) {
  try {
    const ctx = await resolveNutritionAccessContext(slug);
    if (!ctx) return { success: false, error: "Sessão expirada ou não autorizada." };
    assertCanAuthorNutrition(ctx);

    const food = await getFoodWithPortions(foodPublicId, ctx);
    if (!food) return { success: false, error: "Alimento não encontrado." };

    return { success: true, data: food };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao carregar porções do alimento.";
    return { success: false, error: message };
  }
}

// ============================================================================
// LIFECYCLE: PUBLISH, NEW VERSION, HISTORY
// ============================================================================

export async function publishPlanVersionAction(
  slug: string,
  planPublicId: string,
  versionPublicId: string
): Promise<ActionResult<{ versionPublicId: string; status: string; publishedAt: string }>> {
  try {
    const ctx = await resolveNutritionAccessContext(slug);
    if (!ctx) return { success: false, error: "Sessão expirada ou não autorizada.", code: "UNAUTHORIZED" };
    assertCanAuthorNutrition(ctx);

    const res = await publishPlanVersion(ctx, planPublicId, versionPublicId);

    revalidatePath(`/consultoria/${slug}/planos-v2`);
    revalidatePath(`/consultoria/${slug}/planos-v2/${planPublicId}`);
    return { success: true, data: res };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao publicar plano.";
    return { success: false, error: message };
  }
}

export async function createNextVersionAction(
  slug: string,
  planPublicId: string
): Promise<ActionResult<{ planPublicId: string; versionPublicId: string; versionNumber: number; isExistingDraft: boolean }>> {
  try {
    const ctx = await resolveNutritionAccessContext(slug);
    if (!ctx) return { success: false, error: "Sessão expirada ou não autorizada.", code: "UNAUTHORIZED" };
    assertCanAuthorNutrition(ctx);

    const res = await createNextDraftVersion(ctx, planPublicId);

    revalidatePath(`/consultoria/${slug}/planos-v2`);
    revalidatePath(`/consultoria/${slug}/planos-v2/${planPublicId}`);
    return { success: true, data: res };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao criar nova versão.";
    return { success: false, error: message };
  }
}

export async function getPlanVersionHistoryAction(
  slug: string,
  planPublicId: string
): Promise<ActionResult<PlanVersionHistoryItemDto[]>> {
  try {
    const ctx = await resolveNutritionAccessContext(slug);
    if (!ctx) return { success: false, error: "Sessão expirada ou não autorizada.", code: "UNAUTHORIZED" };
    assertCanAuthorNutrition(ctx);

    const res = await getPlanVersionHistory(ctx, planPublicId);
    return { success: true, data: res };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao carregar histórico de versões.";
    return { success: false, error: message };
  }
}
