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
  getPlanVersionTreeByPlanPublicId,
  type AddMealItemInput,
  type UpdateMealItemInput,
  type AddSubstitutionInput,
  type UpdateSubstitutionInput,
  type PlanVersionHistoryItemDto,
  type PlanVersionTreeDto,
} from "@/lib/nutrition-v2/plan-repository";
import {
  listUnifiedFoodsForNutritionist,
  getFoodWithPortions,
} from "@/lib/nutrition-v2/food-repository";
import {
  listEligibleStudentsForNutrition,
  assignPlanVersion,
  updateAssignmentVersion,
  endAssignment,
  listPlanAssignments,
  type EligibleStudentDto,
  type AssignmentListItemDto,
} from "@/lib/nutrition-v2/assignment-repository";
import {
  calculateNutrientEquivalence,
  normalizeCriterion,
  getTargetNutrientValue,
  EQUIVALENT_CRITERIA_LABELS,
  EQUIVALENT_CRITERIA_UNITS,
  type ReferenceFoodPrescription,
  type CandidateFoodItem,
  type FoodPortionItem,
} from "@/lib/nutrition-v2/equivalents";
import { getDbConnection } from "@/lib/db/mysql";
import type { RowDataPacket } from "mysql2/promise";

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
  page: number = 1,
  source?: "ALL" | "TACO" | "USDA" | "CONSULTANCY"
) {
  try {
    const ctx = await resolveNutritionAccessContext(slug);
    if (!ctx) return { success: false, error: "Sessão expirada ou não autorizada." };
    assertCanAuthorNutrition(ctx);

    const res = await listUnifiedFoodsForNutritionist(ctx, {
      query,
      scope,
      source,
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

export interface CalculateEquivalentsCandidateResultDto {
  foodPublicId: string;
  displayName: string;
  originalName: string | null;
  source: string;
  scope: string;
  category: string | null;
  dataQuality: string;
  calculatedQuantity: number | null;
  roundedQuantity: number | null;
  unitCode: string | null;
  formattedQuantity: string | null;
  portionSuggestion: {
    portionLabel: string;
    portionAmount: number;
    portionCount: number;
    formattedText: string;
  } | null;
  targetValue: number | null;
  candidateValue: number | null;
  absoluteDifference: number | null;
  percentageDifference: number | null;
  status: string;
  canApply: boolean;
  isImpractical: boolean;
  message?: string;
  macroSnapshots: {
    caloriesKcal: number | null;
    proteinG: number | null;
    carbohydrateG: number | null;
    fatG: number | null;
  } | null;
}

export interface CalculateEquivalentsResponseDto {
  criterion: string;
  criterionLabel: string;
  criterionUnit: string;
  reference: {
    name: string;
    prescribedQuantity: number | null;
    prescribedUnitCode: string | null;
    prescribedUnitLabel: string | null;
    targetNutrientValue: number | null;
  };
  results: CalculateEquivalentsCandidateResultDto[];
}

export interface CalculateEquivalentsInput {
  reference: {
    mealItemPublicId?: string;
    foodPublicId?: string;
    prescribedQuantity?: number;
    prescribedUnitCode?: string;
    prescribedUnitLabel?: string;
    portionPublicId?: string;
  };
  candidateFoodPublicIds: string[];
  criterion: string;
}

export async function calculateEquivalentsAction(
  slug: string,
  input: CalculateEquivalentsInput
): Promise<ActionResult<CalculateEquivalentsResponseDto>> {
  let connection;
  try {
    const ctx = await resolveNutritionAccessContext(slug);
    if (!ctx) return { success: false, error: "Sessão expirada ou não autorizada.", code: "UNAUTHORIZED" };
    assertCanAuthorNutrition(ctx);

    let normCriterion: "CALORIES" | "PROTEIN" | "CARBOHYDRATE" | "FAT";
    try {
      normCriterion = normalizeCriterion(input.criterion);
    } catch {
      return { success: false, error: `Critério inválido: ${input.criterion}`, code: "INVALID_CRITERION" };
    }

    const uniqueCandidateIds = Array.isArray(input.candidateFoodPublicIds)
      ? Array.from(new Set(input.candidateFoodPublicIds.filter((id) => typeof id === "string" && id.trim().length > 0))).slice(0, 50)
      : [];

    connection = await getDbConnection();

    let refPrescription: ReferenceFoodPrescription;

    if (input.reference.mealItemPublicId && input.reference.mealItemPublicId.trim()) {
      const [itemRows] = await connection.query<RowDataPacket[]>(
        `SELECT
          mi.id,
          mi.food_name_snapshot,
          mi.prescribed_quantity,
          mi.prescribed_unit_code,
          mi.prescribed_unit_label,
          mi.calories_kcal_snapshot,
          mi.protein_g_snapshot,
          mi.carbohydrate_g_snapshot,
          mi.fat_g_snapshot,
          p.consultancy_id
         FROM nutrition_v2_meal_items mi
         INNER JOIN nutrition_v2_meals m ON m.id = mi.meal_id
         INNER JOIN nutrition_v2_plan_versions v ON v.id = m.nutrition_plan_version_id
         INNER JOIN nutrition_plans p ON p.id = v.nutrition_plan_id
         WHERE mi.public_id = ?
           AND mi.deleted_at IS NULL
           AND m.deleted_at IS NULL
           AND v.deleted_at IS NULL
           AND p.deleted_at IS NULL`,
        [input.reference.mealItemPublicId.trim()]
      );

      if (itemRows.length === 0) {
        return { success: false, error: "Item de refeição de referência não encontrado.", code: "ITEM_NOT_FOUND" };
      }

      const item = itemRows[0];
      if (Number(item.consultancy_id) !== ctx.consultancyId) {
        return { success: false, error: "Acesso negado a este item da consultoria.", code: "FORBIDDEN_TENANT_ITEM" };
      }

      refPrescription = {
        name: String(item.food_name_snapshot),
        prescribedQuantity: item.prescribed_quantity != null ? Number(item.prescribed_quantity) : null,
        prescribedUnitCode: item.prescribed_unit_code ? String(item.prescribed_unit_code) : null,
        prescribedUnitLabel: item.prescribed_unit_label ? String(item.prescribed_unit_label) : null,
        caloriesKcalSnapshot: item.calories_kcal_snapshot != null ? Number(item.calories_kcal_snapshot) : null,
        proteinGSnapshot: item.protein_g_snapshot != null ? Number(item.protein_g_snapshot) : null,
        carbohydrateGSnapshot: item.carbohydrate_g_snapshot != null ? Number(item.carbohydrate_g_snapshot) : null,
        fatGSnapshot: item.fat_g_snapshot != null ? Number(item.fat_g_snapshot) : null,
      };
    } else if (input.reference.foodPublicId && input.reference.foodPublicId.trim()) {
      const [foodRows] = await connection.query<RowDataPacket[]>(
        `SELECT * FROM nutrition_v2_foods
         WHERE public_id = ?
           AND deleted_at IS NULL
           AND status = 'ACTIVE'
           AND (scope = 'GLOBAL' OR (scope = 'CONSULTANCY' AND consultancy_id = ?))`,
        [input.reference.foodPublicId.trim(), ctx.consultancyId]
      );

      if (foodRows.length === 0) {
        return { success: false, error: "Alimento de referência não encontrado ou inativo.", code: "REF_FOOD_NOT_FOUND" };
      }

      const rf = foodRows[0];
      let portionEquivalentAmount: number | null = null;
      if (input.reference.portionPublicId && input.reference.portionPublicId.trim()) {
        const [portionRows] = await connection.query<RowDataPacket[]>(
          `SELECT equivalent_reference_amount FROM nutrition_v2_food_portions
           WHERE public_id = ? AND food_id = ? AND deleted_at IS NULL AND status = 'ACTIVE'`,
          [input.reference.portionPublicId.trim(), rf.id]
        );
        if (portionRows.length > 0) {
          portionEquivalentAmount = Number(portionRows[0].equivalent_reference_amount);
        }
      }

      refPrescription = {
        name: String(rf.display_name_pt_br || rf.name),
        prescribedQuantity: input.reference.prescribedQuantity != null ? Number(input.reference.prescribedQuantity) : Number(rf.reference_amount),
        prescribedUnitCode: input.reference.prescribedUnitCode ? String(input.reference.prescribedUnitCode).toUpperCase() : String(rf.reference_unit_code).toUpperCase(),
        prescribedUnitLabel: input.reference.prescribedUnitLabel || null,
        referenceAmount: Number(rf.reference_amount),
        referenceUnitCode: String(rf.reference_unit_code).toUpperCase(),
        caloriesKcal: rf.calories_kcal != null ? Number(rf.calories_kcal) : null,
        proteinG: rf.protein_g != null ? Number(rf.protein_g) : null,
        carbohydrateG: rf.carbohydrate_g != null ? Number(rf.carbohydrate_g) : null,
        fatG: rf.fat_g != null ? Number(rf.fat_g) : null,
        portionEquivalentAmount,
      };
    } else {
      return { success: false, error: "Alimento de referência não informado.", code: "MISSING_REFERENCE" };
    }

    const refSummary = {
      name: refPrescription.name,
      prescribedQuantity: refPrescription.prescribedQuantity ?? null,
      prescribedUnitCode: refPrescription.prescribedUnitCode ?? null,
      prescribedUnitLabel: refPrescription.prescribedUnitLabel ?? null,
      targetNutrientValue: getTargetNutrientValue(refPrescription, normCriterion),
    };

    if (uniqueCandidateIds.length === 0) {
      return {
        success: true,
        data: {
          criterion: normCriterion,
          criterionLabel: EQUIVALENT_CRITERIA_LABELS[normCriterion],
          criterionUnit: EQUIVALENT_CRITERIA_UNITS[normCriterion],
          reference: refSummary,
          results: [],
        },
      };
    }

    const [candRows] = await connection.query<RowDataPacket[]>(
      `SELECT
        id,
        public_id,
        scope,
        consultancy_id,
        name,
        display_name_pt_br,
        category,
        reference_amount,
        reference_unit_code,
        calories_kcal,
        protein_g,
        carbohydrate_g,
        fat_g,
        data_quality,
        status,
        source_type
       FROM nutrition_v2_foods
       WHERE public_id IN (?)
         AND deleted_at IS NULL
         AND status = 'ACTIVE'
         AND (scope = 'GLOBAL' OR (scope = 'CONSULTANCY' AND consultancy_id = ?))`,
      [uniqueCandidateIds, ctx.consultancyId]
    );

    const foodIds = (candRows as RowDataPacket[]).map((r) => r.id);
    const portionsByFoodId = new Map<number, FoodPortionItem[]>();

    if (foodIds.length > 0) {
      const [portionRows] = await connection.query<RowDataPacket[]>(
        `SELECT
          id,
          public_id,
          food_id,
          label,
          equivalent_reference_amount,
          status
         FROM nutrition_v2_food_portions
         WHERE food_id IN (?)
           AND deleted_at IS NULL
           AND status = 'ACTIVE'
         ORDER BY sort_order ASC, label ASC`,
        [foodIds]
      );

      for (const p of portionRows) {
        const fid = Number(p.food_id);
        const list = portionsByFoodId.get(fid) || [];
        list.push({
          publicId: String(p.public_id),
          label: String(p.label),
          equivalentReferenceAmount: Number(p.equivalent_reference_amount),
          status: String(p.status),
        });
        portionsByFoodId.set(fid, list);
      }
    }

    const results: CalculateEquivalentsCandidateResultDto[] = [];

    for (const row of candRows) {
      const candidateItem: CandidateFoodItem = {
        publicId: String(row.public_id),
        name: String(row.name),
        displayNamePtBr: row.display_name_pt_br != null ? String(row.display_name_pt_br) : null,
        category: row.category != null ? String(row.category) : null,
        referenceAmount: Number(row.reference_amount),
        referenceUnitCode: String(row.reference_unit_code),
        caloriesKcal: row.calories_kcal != null ? Number(row.calories_kcal) : null,
        proteinG: row.protein_g != null ? Number(row.protein_g) : null,
        carbohydrateG: row.carbohydrate_g != null ? Number(row.carbohydrate_g) : null,
        fatG: row.fat_g != null ? Number(row.fat_g) : null,
        scope: String(row.scope),
        portions: portionsByFoodId.get(Number(row.id)) || [],
      };

      const calc = calculateNutrientEquivalence(refPrescription, candidateItem, normCriterion);

      results.push({
        foodPublicId: candidateItem.publicId,
        displayName: candidateItem.displayNamePtBr || candidateItem.name,
        originalName:
          candidateItem.name !== (candidateItem.displayNamePtBr || candidateItem.name)
            ? candidateItem.name
            : null,
        source: String(row.source_type || "CUSTOM"),
        scope: candidateItem.scope || "GLOBAL",
        category: candidateItem.category ?? null,
        dataQuality: String(row.data_quality || "UNCLASSIFIED"),
        calculatedQuantity: calc.calculatedQuantity,
        roundedQuantity: calc.roundedQuantity,
        unitCode: calc.unitCode,
        formattedQuantity: calc.formattedQuantity,
        portionSuggestion: calc.portionSuggestion || null,
        targetValue: calc.differenceMetrics?.targetValue ?? null,
        candidateValue: calc.candidateNutrientValue,
        absoluteDifference: calc.differenceMetrics?.absoluteDifference ?? null,
        percentageDifference: calc.differenceMetrics?.percentageDifference ?? null,
        status: calc.status,
        canApply: calc.canApply,
        isImpractical: calc.isImpractical,
        message: calc.message,
        macroSnapshots: calc.macroSnapshotsForEquivalent,
      });
    }

    return {
      success: true,
      data: {
        criterion: normCriterion,
        criterionLabel: EQUIVALENT_CRITERIA_LABELS[normCriterion],
        criterionUnit: EQUIVALENT_CRITERIA_UNITS[normCriterion],
        reference: refSummary,
        results,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao calcular equivalências de alimentos.";
    return { success: false, error: message };
  } finally {
    if (connection) connection.release();
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

export async function getPlanVersionTreeAction(
  slug: string,
  planPublicId: string,
  versionPublicId?: string
): Promise<ActionResult<PlanVersionTreeDto>> {
  try {
    const ctx = await resolveNutritionAccessContext(slug);
    if (!ctx) return { success: false, error: "Sessão expirada ou não autorizada.", code: "UNAUTHORIZED" };
    assertCanAuthorNutrition(ctx);

    const data = await getPlanVersionTreeByPlanPublicId(ctx, planPublicId, versionPublicId);
    if (!data) return { success: false, error: "Plano não encontrado." };
    return { success: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao carregar dados do plano.";
    return { success: false, error: message };
  }
}

// ============================================================================
// ASSIGNMENTS & PRESCRIPTIONS
// ============================================================================

export async function listEligibleStudentsAction(
  slug: string,
  search?: string
): Promise<ActionResult<EligibleStudentDto[]>> {
  try {
    const ctx = await resolveNutritionAccessContext(slug);
    if (!ctx) return { success: false, error: "Sessão expirada ou não autorizada.", code: "UNAUTHORIZED" };
    assertCanAuthorNutrition(ctx);

    const data = await listEligibleStudentsForNutrition(ctx, search);
    return { success: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao listar alunos.";
    return { success: false, error: message };
  }
}

export async function assignPlanVersionAction(
  slug: string,
  params: {
    planPublicId: string;
    versionPublicId: string;
    studentMembershipPublicId: string;
    notesForStudent?: string | null;
    forceReplace?: boolean;
  }
): Promise<ActionResult<{ assignmentPublicId: string; isExistingAssignment?: boolean; replacedPrevious?: boolean }>> {
  try {
    const ctx = await resolveNutritionAccessContext(slug);
    if (!ctx) return { success: false, error: "Sessão expirada ou não autorizada.", code: "UNAUTHORIZED" };
    assertCanAuthorNutrition(ctx);

    const res = await assignPlanVersion(ctx, params);

    revalidatePath(`/consultoria/${slug}/planos-v2/${params.planPublicId}`);
    return { success: true, data: res };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao prescrever plano.";
    const code = err instanceof Error && "code" in err ? (err as { code: string }).code : undefined;
    return { success: false, error: message, code };
  }
}

export async function updateAssignmentVersionAction(
  slug: string,
  planPublicId: string,
  assignmentPublicId: string,
  targetVersionPublicId: string
): Promise<ActionResult<{ newAssignmentPublicId: string }>> {
  try {
    const ctx = await resolveNutritionAccessContext(slug);
    if (!ctx) return { success: false, error: "Sessão expirada ou não autorizada.", code: "UNAUTHORIZED" };
    assertCanAuthorNutrition(ctx);

    const res = await updateAssignmentVersion(ctx, {
      assignmentPublicId,
      targetVersionPublicId,
    });

    revalidatePath(`/consultoria/${slug}/planos-v2/${planPublicId}`);
    return { success: true, data: res };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao atualizar versão da prescrição.";
    return { success: false, error: message };
  }
}

export async function endAssignmentAction(
  slug: string,
  planPublicId: string,
  assignmentPublicId: string
): Promise<ActionResult<{ status: "ENDED" }>> {
  try {
    const ctx = await resolveNutritionAccessContext(slug);
    if (!ctx) return { success: false, error: "Sessão expirada ou não autorizada.", code: "UNAUTHORIZED" };
    assertCanAuthorNutrition(ctx);

    const res = await endAssignment(ctx, assignmentPublicId);

    revalidatePath(`/consultoria/${slug}/planos-v2/${planPublicId}`);
    return { success: true, data: res };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao encerrar prescrição.";
    return { success: false, error: message };
  }
}

export async function listPlanAssignmentsAction(
  slug: string,
  planPublicId: string
): Promise<ActionResult<AssignmentListItemDto[]>> {
  try {
    const ctx = await resolveNutritionAccessContext(slug);
    if (!ctx) return { success: false, error: "Sessão expirada ou não autorizada.", code: "UNAUTHORIZED" };
    assertCanAuthorNutrition(ctx);

    const data = await listPlanAssignments(ctx, planPublicId);
    return { success: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao carregar prescrições.";
    return { success: false, error: message };
  }
}
