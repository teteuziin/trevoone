/**
 * TREVO ONE — NUTRITION PROFESSIONAL V2
 * RELEASE G — REUSABLE PLAN TEMPLATES DOMAIN FOUNDATION
 * Pure domain logic: blueprint extraction, canonical food revalidation,
 * patient neutrality, and fresh snapshot derivation.
 * Pure functions: No database queries, no side effects, 100% unit-testable.
 */

export interface CanonicalFoodRecord {
  id: number;
  publicId: string;
  name: string;
  displayNamePtBr?: string | null;
  category?: string | null;
  scope: string;
  consultancyId?: number | null;
  status: string;
  deletedAt?: string | null;
  referenceAmount: number;
  referenceUnitCode: string;
  caloriesKcal?: number | null;
  proteinG?: number | null;
  carbohydrateG?: number | null;
  fatG?: number | null;
  portions?: Array<{
    id: number;
    publicId: string;
    label: string;
    equivalentReferenceAmount: number;
    status: string;
    deletedAt?: string | null;
  }>;
}

export interface ValidationIssue {
  itemType: "ITEM" | "SUBSTITUTION";
  identifier: string;
  foodName: string;
  reason: string;
}

/**
 * Validates that all foods referenced in template items and substitutions
 * are active, not deleted, accessible to the tenancy, and portions are valid.
 */
const MASS_UNITS = new Set(["G", "KG"]);
const VOLUME_UNITS = new Set(["ML", "L"]);

export function validateTemplateFoods(
  canonicalFoodsMap: Map<number, CanonicalFoodRecord>,
  items: Array<{
    id?: string | number;
    foodId: number | null;
    foodNameSnapshot: string;
    prescribedQuantity?: number | null;
    prescribedUnitCode: string | null;
    prescribedUnitLabel: string | null;
  }>,
  substitutions: Array<{
    id?: string | number;
    foodId: number | null;
    foodNameSnapshot: string;
    prescribedQuantity?: number | null;
    prescribedUnitCode: string | null;
    prescribedUnitLabel: string | null;
  }>,
  consultancyId: number
): { valid: boolean; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];

  for (const item of items) {
    if (!item.foodId) continue; // Custom text item
    const food = canonicalFoodsMap.get(item.foodId);
    if (!food || food.deletedAt) {
      issues.push({
        itemType: "ITEM",
        identifier: String(item.id || item.foodNameSnapshot),
        foodName: item.foodNameSnapshot,
        reason: "Alimento exclu?do ou n?o encontrado no cat?logo.",
      });
      continue;
    }
    if (food.status !== "ACTIVE") {
      issues.push({
        itemType: "ITEM",
        identifier: String(item.id || item.foodNameSnapshot),
        foodName: item.foodNameSnapshot,
        reason: "Alimento arquivado ou inativo.",
      });
      continue;
    }
    if (food.scope === "CONSULTANCY" && food.consultancyId !== consultancyId) {
      issues.push({
        itemType: "ITEM",
        identifier: String(item.id || item.foodNameSnapshot),
        foodName: item.foodNameSnapshot,
        reason: "Alimento pertence a outra consultoria.",
      });
      continue;
    }

    // Validate prescribed quantity
    if (item.prescribedQuantity == null || !Number.isFinite(Number(item.prescribedQuantity)) || Number(item.prescribedQuantity) <= 0) {
      issues.push({
        itemType: "ITEM",
        identifier: String(item.id || item.foodNameSnapshot),
        foodName: item.foodNameSnapshot,
        reason: "Quantidade prescrita inv?lida (deve ser um n?mero positivo e finito).",
      });
      continue;
    }

    // Validate prescribed unit
    const unitCode = (item.prescribedUnitCode || "").trim().toUpperCase();
    if (!unitCode) {
      issues.push({
        itemType: "ITEM",
        identifier: String(item.id || item.foodNameSnapshot),
        foodName: item.foodNameSnapshot,
        reason: "Unidade prescrita ? obrigat?ria.",
      });
      continue;
    }

    const refUnit = (food.referenceUnitCode || "").trim().toUpperCase();

    if (unitCode === "PORCAO") {
      const activePortion = food.portions?.find(
        (p) =>
          p.label.trim().toLowerCase() === (item.prescribedUnitLabel || "").trim().toLowerCase() &&
          p.status === "ACTIVE" &&
          !p.deletedAt
      );
      if (!activePortion) {
        issues.push({
          itemType: "ITEM",
          identifier: String(item.id || item.foodNameSnapshot),
          foodName: item.foodNameSnapshot,
          reason: "Por??o prescrita n?o est? mais ativa ou dispon?vel para este alimento.",
        });
        continue;
      }
      if (!Number.isFinite(activePortion.equivalentReferenceAmount) || activePortion.equivalentReferenceAmount <= 0) {
        issues.push({
          itemType: "ITEM",
          identifier: String(item.id || item.foodNameSnapshot),
          foodName: item.foodNameSnapshot,
          reason: "Por??o prescrita com equival?ncia inv?lida.",
        });
        continue;
      }
    } else if (MASS_UNITS.has(refUnit) && MASS_UNITS.has(unitCode)) {
      // Safe direct mass conversion (G <-> KG)
    } else if (VOLUME_UNITS.has(refUnit) && VOLUME_UNITS.has(unitCode)) {
      // Safe direct volume conversion (ML <-> L)
    } else if ((MASS_UNITS.has(refUnit) && VOLUME_UNITS.has(unitCode)) || (VOLUME_UNITS.has(refUnit) && MASS_UNITS.has(unitCode))) {
      issues.push({
        itemType: "ITEM",
        identifier: String(item.id || item.foodNameSnapshot),
        foodName: item.foodNameSnapshot,
        reason: "Convers?o n?o suportada entre 'ML' e 'G' sem medida caseira espec?fica para este alimento.",
      });
    } else if (refUnit !== unitCode) {
      issues.push({
        itemType: "ITEM",
        identifier: String(item.id || item.foodNameSnapshot),
        foodName: item.foodNameSnapshot,
        reason: "Unidade prescrita incompat?vel com a unidade de refer?ncia do alimento.",
      });
    }
  }

  for (const sub of substitutions) {
    if (!sub.foodId) continue;
    const food = canonicalFoodsMap.get(sub.foodId);
    if (!food || food.deletedAt) {
      issues.push({
        itemType: "SUBSTITUTION",
        identifier: String(sub.id || sub.foodNameSnapshot),
        foodName: sub.foodNameSnapshot,
        reason: "Alimento substituto exclu?do ou n?o encontrado no cat?logo.",
      });
      continue;
    }
    if (food.status !== "ACTIVE") {
      issues.push({
        itemType: "SUBSTITUTION",
        identifier: String(sub.id || sub.foodNameSnapshot),
        foodName: sub.foodNameSnapshot,
        reason: "Alimento substituto arquivado ou inativo.",
      });
      continue;
    }
    if (food.scope === "CONSULTANCY" && food.consultancyId !== consultancyId) {
      issues.push({
        itemType: "SUBSTITUTION",
        identifier: String(sub.id || sub.foodNameSnapshot),
        foodName: sub.foodNameSnapshot,
        reason: "Alimento substituto pertence a outra consultoria.",
      });
      continue;
    }

    // Validate prescribed quantity
    if (sub.prescribedQuantity == null || !Number.isFinite(Number(sub.prescribedQuantity)) || Number(sub.prescribedQuantity) <= 0) {
      issues.push({
        itemType: "SUBSTITUTION",
        identifier: String(sub.id || sub.foodNameSnapshot),
        foodName: sub.foodNameSnapshot,
        reason: "Quantidade prescrita da substitui??o inv?lida (deve ser um n?mero positivo e finito).",
      });
      continue;
    }

    // Validate prescribed unit
    const unitCode = (sub.prescribedUnitCode || "").trim().toUpperCase();
    if (!unitCode) {
      issues.push({
        itemType: "SUBSTITUTION",
        identifier: String(sub.id || sub.foodNameSnapshot),
        foodName: sub.foodNameSnapshot,
        reason: "Unidade prescrita da substitui??o ? obrigat?ria.",
      });
      continue;
    }

    const refUnit = (food.referenceUnitCode || "").trim().toUpperCase();

    if (unitCode === "PORCAO") {
      const activePortion = food.portions?.find(
        (p) =>
          p.label.trim().toLowerCase() === (sub.prescribedUnitLabel || "").trim().toLowerCase() &&
          p.status === "ACTIVE" &&
          !p.deletedAt
      );
      if (!activePortion) {
        issues.push({
          itemType: "SUBSTITUTION",
          identifier: String(sub.id || sub.foodNameSnapshot),
          foodName: sub.foodNameSnapshot,
          reason: "Por??o prescrita da substitui??o n?o est? mais ativa ou dispon?vel.",
        });
        continue;
      }
      if (!Number.isFinite(activePortion.equivalentReferenceAmount) || activePortion.equivalentReferenceAmount <= 0) {
        issues.push({
          itemType: "SUBSTITUTION",
          identifier: String(sub.id || sub.foodNameSnapshot),
          foodName: sub.foodNameSnapshot,
          reason: "Por??o prescrita da substitui??o com equival?ncia inv?lida.",
        });
        continue;
      }
    } else if (MASS_UNITS.has(refUnit) && MASS_UNITS.has(unitCode)) {
      // Safe direct mass conversion (G <-> KG)
    } else if (VOLUME_UNITS.has(refUnit) && VOLUME_UNITS.has(unitCode)) {
      // Safe direct volume conversion (ML <-> L)
    } else if ((MASS_UNITS.has(refUnit) && VOLUME_UNITS.has(unitCode)) || (VOLUME_UNITS.has(refUnit) && MASS_UNITS.has(unitCode))) {
      issues.push({
        itemType: "SUBSTITUTION",
        identifier: String(sub.id || sub.foodNameSnapshot),
        foodName: sub.foodNameSnapshot,
        reason: "Convers?o n?o suportada entre 'ML' e 'G' sem medida caseira espec?fica para este alimento.",
      });
    } else if (refUnit !== unitCode) {
      issues.push({
        itemType: "SUBSTITUTION",
        identifier: String(sub.id || sub.foodNameSnapshot),
        foodName: sub.foodNameSnapshot,
        reason: "Unidade prescrita da substitui??o incompat?vel com a unidade de refer?ncia.",
      });
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}


export function extractNutritionalBlueprintFromPlan(planTree: {
  version: {
    title: string;
    notes?: string | null;
    meals: Array<{
      title: string;
      scheduledTime?: string | null;
      notes?: string | null;
      sortOrder: number;
      items: Array<{
        foodId?: number | null;
        foodNameSnapshot: string;
        categorySnapshot?: string | null;
        prescribedQuantity: number | null;
        prescribedUnitCode: string | null;
        prescribedUnitLabel: string | null;
        notes?: string | null;
        substitutions?: Array<{
          foodId?: number | null;
          foodNameSnapshot: string;
          prescribedQuantity: number | null;
          prescribedUnitCode: string | null;
          prescribedUnitLabel: string | null;
          notes?: string | null;
          sortOrder: number;
        }>;
      }>;
    }>;
  };
  student?: unknown;
  patient?: unknown;
  assignment?: unknown;
}) {
  const blueprintMeals = (planTree.version.meals || []).map((m, mIndex) => ({
    title: m.title,
    scheduledTime: m.scheduledTime || null,
    sortOrder: m.sortOrder ?? mIndex,
    notes: m.notes || null,
    items: (m.items || []).map((item, iIndex) => ({
      foodId: item.foodId ?? null,
      foodNameSnapshot: item.foodNameSnapshot,
      categorySnapshot: item.categorySnapshot || null,
      prescribedQuantity: item.prescribedQuantity != null ? Number(item.prescribedQuantity) : null,
      prescribedUnitCode: item.prescribedUnitCode || null,
      prescribedUnitLabel: item.prescribedUnitLabel || null,
      sortOrder: iIndex,
      notes: item.notes || null,
      substitutions: (item.substitutions || []).map((s, sIndex) => ({
        foodId: s.foodId ?? null,
        foodNameSnapshot: s.foodNameSnapshot,
        prescribedQuantity: s.prescribedQuantity != null ? Number(s.prescribedQuantity) : null,
        prescribedUnitCode: s.prescribedUnitCode || null,
        prescribedUnitLabel: s.prescribedUnitLabel || null,
        sortOrder: s.sortOrder ?? sIndex,
        notes: s.notes || null,
      })),
    })),
  }));

  return {
    defaultTitle: planTree.version.title,
    meals: blueprintMeals,
  };
}

export class NutritionAuthorizationError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string = "FORBIDDEN", statusCode: number = 403) {
    super(message);
    this.name = "NutritionAuthorizationError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function assertCanAuthorNutrition(ctx: {
  consultancyId?: number | null;
  membershipId?: number | null;
  canAuthorNutrition?: boolean;
}): void {
  if (!ctx.consultancyId || !ctx.membershipId || !ctx.canAuthorNutrition) {
    throw new NutritionAuthorizationError(
      "Acesso negado: apenas Nutricionistas da consultoria podem gerenciar a biblioteca de alimentos.",
      "UNAUTHORIZED_NUTRITION_AUTHOR",
      403
    );
  }
}
