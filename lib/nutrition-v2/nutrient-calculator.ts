/**
 * TREVO ONE — NUTRITION V2 NUTRIENT & PORTION CALCULATOR
 * Pure, authoritative, side-effect-free module for calculating nutritional
 * values based on canonical food references, household portions, and safe mass/volume conversions.
 *
 * Rules:
 * 1. NEVER assume universal 100g reference amount. Use food.referenceAmount and food.referenceUnitCode.
 * 2. Household portions are strictly food-specific (from nutrition_v2_food_portions).
 *    NEVER apply universal conversion rules (e.g., 1 colher = 15g, 1 xicara = X g, 1 unidade = X g).
 * 3. Pure mass conversions (G <-> KG) are allowed deterministically (1 KG = 1000 G).
 * 4. Volume <-> mass conversions (ML <-> G) are strictly forbidden without food-specific portion.
 * 5. Pure volume conversions (ML <-> L) are allowed if food's canonical reference is volume.
 * 6. Non-positive, NaN, or infinite quantities are rejected.
 * 7. Strictly preserve null vs 0 semantics: UNKNOWN/null macro remains null; zero real remains 0.
 */

export interface CanonicalFoodSource {
  referenceAmount: number;
  referenceUnitCode: string;
  caloriesKcal?: number | null;
  proteinG?: number | null;
  carbohydrateG?: number | null;
  fatG?: number | null;
  fiberG?: number | null;
}

export interface CanonicalPortionSource {
  publicId?: string;
  label: string;
  equivalentReferenceAmount: number;
  status?: string;
}

export interface NutrientCalculationInput {
  food: CanonicalFoodSource;
  prescribedQuantity: number;
  prescribedUnitCode?: string | null;
  portion?: CanonicalPortionSource | null;
}

export interface NutrientCalculationResult {
  isValid: boolean;
  errorMessage?: string;
  factor: number | null;
  /** Effective canonical quantity expressed in the food's canonical referenceUnitCode */
  effectiveCanonicalAmount: number | null;
  /**
   * Effective mass in grams.
   * Strictly NULL if the food's canonical reference unit is volume (ML, L) or non-mass.
   * Universal conversion between ML and G is prohibited without food-specific density.
   */
  effectiveGrams: number | null;
  /** Preserved alias for effectiveCanonicalAmount */
  effectiveQuantityInReferenceUnit: number | null;
  effectiveReferenceUnitCode: string | null;
  /** Formatted string of effective quantity with appropriate unit (e.g. "50 g", "0.5 kg", "200 mL") */
  formattedEffectiveQuantity: string | null;
  caloriesKcal: number | null;
  proteinG: number | null;
  carbohydrateG: number | null;
  fatG: number | null;
  fiberG: number | null;
}

const MASS_UNITS = new Set(["G", "KG"]);
const VOLUME_UNITS = new Set(["ML", "L"]);

/**
 * Safely parses human-entered quantities, supporting:
 * - integers: "100" -> 100
 * - decimal dots: "1.5" -> 1.5
 * - decimal commas: "1,5" -> 1.5
 * - simple fractions: "1/2" -> 0.5, "1/4" -> 0.25, "3/4" -> 0.75, "1/3" -> 0.3333333333333333
 * - mixed numbers: "1 1/2" -> 1.5, "2 1/4" -> 2.25
 * Returns null if input is empty, non-positive, or unparseable.
 */
export function parseQuantityInput(val: string | number | null | undefined): number | null {
  if (val == null) return null;
  if (typeof val === "number") {
    return Number.isFinite(val) && val > 0 ? val : null;
  }
  const str = String(val).trim();
  if (!str) return null;

  // Replace comma with dot
  const sanitized = str.replace(",", ".");

  // Mixed number with space: "1 1/2" or "2 1/4"
  const mixedMatch = sanitized.match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if (mixedMatch) {
    const whole = parseFloat(mixedMatch[1]);
    const num = parseFloat(mixedMatch[2]);
    const den = parseFloat(mixedMatch[3]);
    if (den > 0) {
      const result = whole + num / den;
      return Number.isFinite(result) && result > 0 ? result : null;
    }
  }

  // Simple fraction: "1/2", "3/4"
  const fracMatch = sanitized.match(/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if (fracMatch) {
    const num = parseFloat(fracMatch[1]);
    const den = parseFloat(fracMatch[2]);
    if (den > 0) {
      const result = num / den;
      return Number.isFinite(result) && result > 0 ? result : null;
    }
  }

  // Standard float
  const parsed = parseFloat(sanitized);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return null;
}

/**
 * Cleanly formats a quantity number for display in Brazilian Portuguese (comma decimal, max 2 decimals).
 */
export function formatQuantityForDisplay(num: number | null | undefined): string {
  if (num == null || !Number.isFinite(num) || num <= 0) return "";
  if (Number.isInteger(num)) return String(num);
  const rounded = Math.round(num * 100) / 100;
  return String(rounded).replace(".", ",");
}

export function roundMacro(val: number | null | undefined): number | null {
  if (val == null || !Number.isFinite(Number(val))) return null;
  return Math.round(Number(val) * 100) / 100;
}

export function calculateMacroFactor(
  refAmount: number,
  refUnit: string,
  prescribedQty: number,
  prescribedUnit: string,
  portionEquivalentAmount?: number | null
): number | null {
  return calculateNutrientFactor(refAmount, refUnit, prescribedQty, prescribedUnit, portionEquivalentAmount).factor;
}

/**
 * Calculates the multiplication factor and effective quantity relative to the food's canonical reference.
 */
export function calculateNutrientFactor(
  refAmount: number,
  refUnit: string,
  prescribedQty: number,
  prescribedUnit: string,
  portionEquivalentAmount?: number | null
): { factor: number | null; effectiveQty: number | null; error?: string } {
  // 1. Validate numbers
  if (!Number.isFinite(refAmount) || refAmount <= 0) {
    return { factor: null, effectiveQty: null, error: "A quantidade de referência do alimento deve ser maior que zero." };
  }
  if (!Number.isFinite(prescribedQty) || prescribedQty <= 0) {
    return { factor: null, effectiveQty: null, error: "A quantidade prescrita deve ser um número positivo e finito." };
  }

  const rUnit = (refUnit || "").trim().toUpperCase();
  const pUnit = (prescribedUnit || "").trim().toUpperCase();

  // 2. Direct mass conversion (G <-> KG)
  // If prescribed unit is directly a metric mass (e.g. G, KG, GR, GRAMA, GRAMAS),
  // the prescribed quantity is ALREADY an absolute physical measure.
  // Never multiply by portionEquivalentAmount when prescribed unit is already metric mass!
  if (MASS_UNITS.has(rUnit) && MASS_UNITS.has(pUnit)) {
    let rInG = refAmount;
    if (rUnit === "KG") rInG = refAmount * 1000;

    let pInG = prescribedQty;
    if (pUnit === "KG") pInG = prescribedQty * 1000;

    const factor = pInG / rInG;
    const effectiveQty = rUnit === "KG" ? pInG / 1000 : pInG;
    return { factor, effectiveQty };
  }

  // 3. Direct volume conversion (ML <-> L)
  // Never multiply by portionEquivalentAmount when prescribed unit is already metric volume!
  if (VOLUME_UNITS.has(rUnit) && VOLUME_UNITS.has(pUnit)) {
    let rInMl = refAmount;
    if (rUnit === "L") rInMl = refAmount * 1000;

    let pInMl = prescribedQty;
    if (pUnit === "L") pInMl = prescribedQty * 1000;

    const factor = pInMl / rInMl;
    const effectiveQty = rUnit === "L" ? pInMl / 1000 : pInMl;
    return { factor, effectiveQty };
  }

  // 4. Food-specific household portion provided (unidades, fatias, colheres, etc.)
  if (portionEquivalentAmount != null) {
    if (!Number.isFinite(portionEquivalentAmount) || portionEquivalentAmount <= 0) {
      return { factor: null, effectiveQty: null, error: "O peso/equivalência da porção deve ser maior que zero e finito." };
    }
    const effectiveQty = prescribedQty * portionEquivalentAmount;
    const factor = effectiveQty / refAmount;
    return { factor, effectiveQty };
  }

  // 5. Same unit match
  if (rUnit === pUnit) {
    const factor = prescribedQty / refAmount;
    return { factor, effectiveQty: prescribedQty };
  }

  // 6. Incompatible unit without food-specific portion
  return {
    factor: null,
    effectiveQty: null,
    error: `Conversão não suportada entre '${pUnit}' e '${rUnit}' sem medida caseira específica para este alimento.`,
  };
}

/**
 * Authoritative recalculation of all nutrients based on food, portion, and quantity.
 */
export function calculateItemNutrients(input: NutrientCalculationInput): NutrientCalculationResult {
  const { food, prescribedQuantity, prescribedUnitCode, portion } = input;

  if (!food) {
    return {
      isValid: false,
      errorMessage: "Dados do alimento ausentes.",
      factor: null,
      effectiveCanonicalAmount: null,
      effectiveGrams: null,
      effectiveQuantityInReferenceUnit: null,
      effectiveReferenceUnitCode: null,
      formattedEffectiveQuantity: null,
      caloriesKcal: null,
      proteinG: null,
      carbohydrateG: null,
      fatG: null,
      fiberG: null,
    };
  }

  const portionEquivalent = portion ? portion.equivalentReferenceAmount : null;
  const unit = portion ? "PORCAO" : (prescribedUnitCode || food.referenceUnitCode);

  const { factor, effectiveQty, error } = calculateNutrientFactor(
    food.referenceAmount,
    food.referenceUnitCode,
    prescribedQuantity,
    unit,
    portionEquivalent
  );

  if (factor == null || error || effectiveQty == null) {
    return {
      isValid: false,
      errorMessage: error || "Não foi possível calcular os nutrientes para a quantidade especificada.",
      factor: null,
      effectiveCanonicalAmount: null,
      effectiveGrams: null,
      effectiveQuantityInReferenceUnit: null,
      effectiveReferenceUnitCode: food.referenceUnitCode,
      formattedEffectiveQuantity: null,
      caloriesKcal: null,
      proteinG: null,
      carbohydrateG: null,
      fatG: null,
      fiberG: null,
    };
  }

  // Strictly preserve null vs 0
  const scale = (val: number | null | undefined): number | null => {
    if (val == null) return null;
    const num = Number(val);
    if (!Number.isFinite(num)) return null;
    if (num === 0) return 0;
    return roundMacro(num * factor);
  };

  const rUnit = (food.referenceUnitCode || "").trim().toUpperCase();
  const isMass = MASS_UNITS.has(rUnit);
  let effectiveGrams: number | null = null;
  if (isMass && effectiveQty != null) {
    if (rUnit === "G") {
      effectiveGrams = roundMacro(effectiveQty);
    } else if (rUnit === "KG") {
      effectiveGrams = roundMacro(effectiveQty * 1000);
    }
  } else {
    // For volume (ML, L) or non-mass, effective grams is strictly NULL/unknown
    effectiveGrams = null;
  }

  const roundedEffectiveAmount = roundMacro(effectiveQty);
  let formattedEffectiveQuantity: string | null = null;
  if (roundedEffectiveAmount != null) {
    if (rUnit === "G") {
      formattedEffectiveQuantity = `${roundedEffectiveAmount} g`;
    } else if (rUnit === "KG") {
      formattedEffectiveQuantity = `${roundedEffectiveAmount} kg`;
    } else if (rUnit === "ML") {
      formattedEffectiveQuantity = `${roundedEffectiveAmount} mL`;
    } else if (rUnit === "L") {
      formattedEffectiveQuantity = `${roundedEffectiveAmount} L`;
    } else {
      formattedEffectiveQuantity = `${roundedEffectiveAmount} ${food.referenceUnitCode}`;
    }
  }

  return {
    isValid: true,
    factor,
    effectiveCanonicalAmount: roundedEffectiveAmount,
    effectiveGrams,
    effectiveQuantityInReferenceUnit: roundedEffectiveAmount,
    effectiveReferenceUnitCode: food.referenceUnitCode,
    formattedEffectiveQuantity,
    caloriesKcal: scale(food.caloriesKcal),
    proteinG: scale(food.proteinG),
    carbohydrateG: scale(food.carbohydrateG),
    fatG: scale(food.fatG),
    fiberG: scale(food.fiberG),
  };
}

/**
 * Returns the list of standard safe measurement units allowed for a given food.
 * Only deterministic mass units (G, KG) are allowed for mass-based foods.
 * Only deterministic volume units (ML, L) are allowed for volume-based foods.
 * Other units (e.g. UNIDADE) only if the food itself is canonically registered with that unit.
 * Household measures MUST come exclusively from food.portions.
 */
export function getSafeStandardUnitsForFood(referenceUnitCode: string): Array<{ code: string; label: string }> {
  const rUnit = (referenceUnitCode || "G").trim().toUpperCase();

  if (MASS_UNITS.has(rUnit)) {
    if (rUnit === "KG") {
      return [
        { code: "KG", label: "Quilogramas (kg)" },
        { code: "G", label: "Gramas (g)" },
      ];
    }
    return [
      { code: "G", label: "Gramas (g)" },
      { code: "KG", label: "Quilogramas (kg)" },
    ];
  }

  if (VOLUME_UNITS.has(rUnit)) {
    if (rUnit === "L") {
      return [
        { code: "L", label: "Litros (l)" },
        { code: "ML", label: "Mililitros (ml)" },
      ];
    }
    return [
      { code: "ML", label: "Mililitros (ml)" },
      { code: "L", label: "Litros (l)" },
    ];
  }

  return [{ code: rUnit, label: rUnit }];
}

// ============================================================================
// RELEASE D: MEAL & PLAN MACRO TOTALS AGGREGATION
// ============================================================================

export type MacroTotalsStatus = "COMPLETE" | "INCOMPLETE" | "EMPTY";

export interface IncompleteFoodItemInfo {
  id?: number | string | null;
  publicId?: string | null;
  foodId?: number | null;
  name: string;
  prescribedQuantityText: string;
  reason: string;
  reasonCode?: "FOOD_NOT_LINKED" | "PORTION_NOT_FOUND" | "MACROS_INCOMPLETE" | "QUANTITY_MISSING";
  missingCalories: boolean;
  missingMacros: boolean;
  missingProtein?: boolean;
  missingCarbs?: boolean;
  missingFat?: boolean;
}

export interface NutrientTotalDetail {
  value: number;
  knownItemCount: number;
  totalItemCount: number;
  isComplete: boolean;
  hasUnknown: boolean;
  empty: boolean;
}

export interface MacroTotals {
  caloriesKcal: number;
  proteinG: number;
  carbohydrateG: number;
  fatG: number;
  hasIncompleteData: boolean;
  isComplete: boolean;
  status: MacroTotalsStatus;
  totalItemsCount: number;
  incompleteItemsCount: number;
  incompleteItems: IncompleteFoodItemInfo[];
  empty: boolean;
  missingCaloriesCount: number;
  missingProteinCount: number;
  missingCarbohydrateCount: number;
  missingFatCount: number;
  details: {
    calories: NutrientTotalDetail;
    protein: NutrientTotalDetail;
    carbohydrate: NutrientTotalDetail;
    fat: NutrientTotalDetail;
  };
}

export interface SnapshotItemSource {
  id?: number | string;
  publicId?: string;
  foodId?: number | null;
  foodNameSnapshot?: string | null;
  name?: string | null;
  prescribedQuantity?: number | null;
  prescribedUnitCode?: string | null;
  prescribedUnitLabel?: string | null;
  caloriesKcalSnapshot?: number | null;
  proteinGSnapshot?: number | null;
  carbohydrateGSnapshot?: number | null;
  fatGSnapshot?: number | null;
  substitutions?: unknown[];
}

export function calculateSingleNutrientTotal(
  values: Array<number | null | undefined>
): NutrientTotalDetail {
  const totalItemCount = values.length;
  if (totalItemCount === 0) {
    return {
      value: 0,
      knownItemCount: 0,
      totalItemCount: 0,
      isComplete: false,
      hasUnknown: false,
      empty: true,
    };
  }

  let knownItemCount = 0;
  let rawSum = 0;

  for (const v of values) {
    if (v != null && Number.isFinite(Number(v))) {
      knownItemCount += 1;
      rawSum += Number(v);
    }
  }

  const isComplete = knownItemCount === totalItemCount;
  const hasUnknown = knownItemCount < totalItemCount;
  const value = Math.round(rawSum * 100) / 100;

  return {
    value,
    knownItemCount,
    totalItemCount,
    isComplete,
    hasUnknown,
    empty: false,
  };
}

export function calculateMealTotals(
  items: SnapshotItemSource[]
): MacroTotals {
  const totalItemsCount = items.length;
  const calDetail = calculateSingleNutrientTotal(items.map((i) => i.caloriesKcalSnapshot));
  const protDetail = calculateSingleNutrientTotal(items.map((i) => i.proteinGSnapshot));
  const carbDetail = calculateSingleNutrientTotal(items.map((i) => i.carbohydrateGSnapshot));
  const fatDetail = calculateSingleNutrientTotal(items.map((i) => i.fatGSnapshot));

  const incompleteItems: IncompleteFoodItemInfo[] = [];

  for (const item of items) {
    const isCalUnknown = item.caloriesKcalSnapshot == null || !Number.isFinite(Number(item.caloriesKcalSnapshot));
    const isProtUnknown = item.proteinGSnapshot == null || !Number.isFinite(Number(item.proteinGSnapshot));
    const isCarbUnknown = item.carbohydrateGSnapshot == null || !Number.isFinite(Number(item.carbohydrateGSnapshot));
    const isFatUnknown = item.fatGSnapshot == null || !Number.isFinite(Number(item.fatGSnapshot));

    if (isCalUnknown || isProtUnknown || isCarbUnknown || isFatUnknown) {
      const name = item.foodNameSnapshot || item.name || "Alimento sem nome";
      const unit = item.prescribedUnitLabel || item.prescribedUnitCode || "g";
      const qtyText = item.prescribedQuantity != null
        ? `${item.prescribedQuantity} ${unit}`
        : "Quantidade não informada";

      let reason = "Informação nutricional incompleta";
      let reasonCode: "FOOD_NOT_LINKED" | "PORTION_NOT_FOUND" | "MACROS_INCOMPLETE" | "QUANTITY_MISSING" = "MACROS_INCOMPLETE";
      if (item.foodId == null) {
        reason = "Alimento sem vínculo com a biblioteca";
        reasonCode = "FOOD_NOT_LINKED";
      } else if (item.prescribedQuantity == null || Number(item.prescribedQuantity) <= 0) {
        reason = "Quantidade prescrita não informada";
        reasonCode = "QUANTITY_MISSING";
      } else if (isCalUnknown) {
        const u = (item.prescribedUnitCode || "").trim().toUpperCase();
        if (u !== "G" && u !== "KG" && u !== "ML" && u !== "L") {
          reason = "Medida sem equivalência cadastrada";
        } else {
          reason = "Calorias indisponíveis na tabela nutricional";
        }
        reasonCode = "PORTION_NOT_FOUND";
      } else {
        reason = "Macronutrientes incompletos na tabela nutricional";
        reasonCode = "MACROS_INCOMPLETE";
      }

      incompleteItems.push({
        id: item.id ?? null,
        publicId: item.publicId ?? null,
        foodId: item.foodId ?? null,
        name,
        prescribedQuantityText: qtyText,
        reason,
        reasonCode,
        missingCalories: isCalUnknown,
        missingMacros: isProtUnknown || isCarbUnknown || isFatUnknown,
        missingProtein: isProtUnknown,
        missingCarbs: isCarbUnknown,
        missingFat: isFatUnknown,
      });
    }
  }

  const hasIncompleteData = totalItemsCount > 0 && (
    !calDetail.isComplete ||
    !protDetail.isComplete ||
    !carbDetail.isComplete ||
    !fatDetail.isComplete ||
    incompleteItems.length > 0
  );

  const isComplete = totalItemsCount > 0 && !hasIncompleteData;
  const status: MacroTotalsStatus = totalItemsCount === 0 ? "EMPTY" : isComplete ? "COMPLETE" : "INCOMPLETE";

  return {
    caloriesKcal: calDetail.value,
    proteinG: protDetail.value,
    carbohydrateG: carbDetail.value,
    fatG: fatDetail.value,
    hasIncompleteData,
    isComplete,
    status,
    totalItemsCount,
    incompleteItemsCount: incompleteItems.length,
    incompleteItems,
    empty: totalItemsCount === 0,
    missingCaloriesCount: totalItemsCount - calDetail.knownItemCount,
    missingProteinCount: totalItemsCount - protDetail.knownItemCount,
    missingCarbohydrateCount: totalItemsCount - carbDetail.knownItemCount,
    missingFatCount: totalItemsCount - fatDetail.knownItemCount,
    details: {
      calories: calDetail,
      protein: protDetail,
      carbohydrate: carbDetail,
      fat: fatDetail,
    },
  };
}

export function calculatePlanTotals(
  mealsOrTotals: Array<
    | MacroTotals
    | { mealTotals: MacroTotals }
    | { items: SnapshotItemSource[] }
    | SnapshotItemSource[]
  >
): MacroTotals {
  const totalsList: MacroTotals[] = mealsOrTotals.map((item) => {
    if (Array.isArray(item)) {
      return calculateMealTotals(item);
    }
    if ("mealTotals" in item && item.mealTotals) {
      return item.mealTotals;
    }
    if ("items" in item && Array.isArray(item.items)) {
      return calculateMealTotals(item.items);
    }
    return item as MacroTotals;
  });

  let rawCalories = 0;
  let rawProtein = 0;
  let rawCarbs = 0;
  let rawFat = 0;

  let totalItemsCount = 0;
  let calKnown = 0;
  let protKnown = 0;
  let carbKnown = 0;
  let fatKnown = 0;

  const incompleteItems: IncompleteFoodItemInfo[] = [];

  for (const m of totalsList) {
    rawCalories += m.caloriesKcal;
    rawProtein += m.proteinG;
    rawCarbs += m.carbohydrateG;
    rawFat += m.fatG;

    totalItemsCount += m.totalItemsCount;
    calKnown += m.details?.calories?.knownItemCount ?? 0;
    protKnown += m.details?.protein?.knownItemCount ?? 0;
    carbKnown += m.details?.carbohydrate?.knownItemCount ?? 0;
    fatKnown += m.details?.fat?.knownItemCount ?? 0;

    if (Array.isArray(m.incompleteItems)) {
      incompleteItems.push(...m.incompleteItems);
    }
  }

  const isEmpty = totalItemsCount === 0;
  const totalItemCount = totalItemsCount;
  const calValue = Math.round(rawCalories * 100) / 100;
  const protValue = Math.round(rawProtein * 100) / 100;
  const carbValue = Math.round(rawCarbs * 100) / 100;
  const fatValue = Math.round(rawFat * 100) / 100;

  const calComplete = !isEmpty && calKnown === totalItemsCount;
  const protComplete = !isEmpty && protKnown === totalItemsCount;
  const carbComplete = !isEmpty && carbKnown === totalItemsCount;
  const fatComplete = !isEmpty && fatKnown === totalItemsCount;

  const hasIncompleteData = !isEmpty && (
    !calComplete ||
    !protComplete ||
    !carbComplete ||
    !fatComplete ||
    incompleteItems.length > 0
  );

  const isComplete = !isEmpty && !hasIncompleteData;
  const status: MacroTotalsStatus = isEmpty ? "EMPTY" : isComplete ? "COMPLETE" : "INCOMPLETE";

  return {
    caloriesKcal: calValue,
    proteinG: protValue,
    carbohydrateG: carbValue,
    fatG: fatValue,
    hasIncompleteData,
    isComplete,
    status,
    totalItemsCount,
    incompleteItemsCount: incompleteItems.length,
    incompleteItems,
    empty: isEmpty,
    missingCaloriesCount: totalItemsCount - calKnown,
    missingProteinCount: totalItemsCount - protKnown,
    missingCarbohydrateCount: totalItemsCount - carbKnown,
    missingFatCount: totalItemsCount - fatKnown,
    details: {
      calories: {
        value: calValue,
        knownItemCount: calKnown,
        totalItemCount,
        isComplete: calComplete,
        hasUnknown: !isEmpty && calKnown < totalItemsCount,
        empty: isEmpty,
      },
      protein: {
        value: protValue,
        knownItemCount: protKnown,
        totalItemCount,
        isComplete: protComplete,
        hasUnknown: !isEmpty && protKnown < totalItemsCount,
        empty: isEmpty,
      },
      carbohydrate: {
        value: carbValue,
        knownItemCount: carbKnown,
        totalItemCount,
        isComplete: carbComplete,
        hasUnknown: !isEmpty && carbKnown < totalItemsCount,
        empty: isEmpty,
      },
      fat: {
        value: fatValue,
        knownItemCount: fatKnown,
        totalItemCount,
        isComplete: fatComplete,
        hasUnknown: !isEmpty && fatKnown < totalItemsCount,
        empty: isEmpty,
      },
    },
  };
}

/**
 * Safely scales an item's macronutrient snapshots proportionally when quantity changes.
 * Preserves nulls strictly: unknown stays null, zero stays 0.
 * Does not invent numbers or substitute declared calories with derived math.
 */
export function scaleItemSnapshots(
  item: {
    prescribedQuantity?: number | null;
    caloriesKcalSnapshot?: number | null;
    proteinGSnapshot?: number | null;
    carbohydrateGSnapshot?: number | null;
    fatGSnapshot?: number | null;
  },
  newQuantity: number
): {
  caloriesKcalSnapshot: number | null;
  proteinGSnapshot: number | null;
  carbohydrateGSnapshot: number | null;
  fatGSnapshot: number | null;
} {
  if (!Number.isFinite(newQuantity) || newQuantity <= 0) {
    return {
      caloriesKcalSnapshot: null,
      proteinGSnapshot: null,
      carbohydrateGSnapshot: null,
      fatGSnapshot: null,
    };
  }

  const baseQty = Number(item.prescribedQuantity);
  if (!Number.isFinite(baseQty) || baseQty <= 0) {
    return {
      caloriesKcalSnapshot: item.caloriesKcalSnapshot ?? null,
      proteinGSnapshot: item.proteinGSnapshot ?? null,
      carbohydrateGSnapshot: item.carbohydrateGSnapshot ?? null,
      fatGSnapshot: item.fatGSnapshot ?? null,
    };
  }

  const ratio = newQuantity / baseQty;

  const scaleValue = (val: number | null | undefined): number | null => {
    if (val == null) return null;
    const num = Number(val);
    if (!Number.isFinite(num)) return null;
    if (num === 0) return 0;
    return roundMacro(num * ratio);
  };

  return {
    caloriesKcalSnapshot: scaleValue(item.caloriesKcalSnapshot),
    proteinGSnapshot: scaleValue(item.proteinGSnapshot),
    carbohydrateGSnapshot: scaleValue(item.carbohydrateGSnapshot),
    fatGSnapshot: scaleValue(item.fatGSnapshot),
  };
}

// ============================================================================
// RELEASE E: MICRONUTRIENT TOTALS AGGREGATION & COMPLETENESS
// ============================================================================

export type MicronutrientCategory = "MACRO_SUB" | "MINERAL" | "VITAMIN" | "OTHER";

export type FoodNutrientStatus = "KNOWN" | "KNOWN_ZERO" | "TRACE";

export type MicronutrientStatus = "KNOWN" | "KNOWN_ZERO" | "TRACE" | "UNKNOWN";

export interface CanonicalNutrientDefinition {
  code: string;
  namePtBr: string;
  unit: string;
  category: MicronutrientCategory;
  sortOrder: number;
  usdaNutrientNumber: string;
}

export const CANONICAL_NUTRIENTS: readonly CanonicalNutrientDefinition[] = Object.freeze([
  { code: "FIBER", namePtBr: "Fibra Alimentar", unit: "g", category: "MACRO_SUB", sortOrder: 10, usdaNutrientNumber: "291" },
  { code: "CA", namePtBr: "Cálcio", unit: "mg", category: "MINERAL", sortOrder: 20, usdaNutrientNumber: "301" },
  { code: "FE", namePtBr: "Ferro", unit: "mg", category: "MINERAL", sortOrder: 30, usdaNutrientNumber: "303" },
  { code: "MG", namePtBr: "Magnésio", unit: "mg", category: "MINERAL", sortOrder: 40, usdaNutrientNumber: "304" },
  { code: "P", namePtBr: "Fósforo", unit: "mg", category: "MINERAL", sortOrder: 50, usdaNutrientNumber: "305" },
  { code: "K", namePtBr: "Potássio", unit: "mg", category: "MINERAL", sortOrder: 60, usdaNutrientNumber: "306" },
  { code: "NA", namePtBr: "Sódio", unit: "mg", category: "MINERAL", sortOrder: 70, usdaNutrientNumber: "307" },
  { code: "ZN", namePtBr: "Zinco", unit: "mg", category: "MINERAL", sortOrder: 80, usdaNutrientNumber: "309" },
  { code: "CU", namePtBr: "Cobre", unit: "mg", category: "MINERAL", sortOrder: 90, usdaNutrientNumber: "312" },
  { code: "MN", namePtBr: "Manganês", unit: "mg", category: "MINERAL", sortOrder: 100, usdaNutrientNumber: "315" },
  { code: "SE", namePtBr: "Selênio", unit: "mcg", category: "MINERAL", sortOrder: 110, usdaNutrientNumber: "317" },
  { code: "VIT_A", namePtBr: "Vitamina A (RAE)", unit: "mcg", category: "VITAMIN", sortOrder: 120, usdaNutrientNumber: "320" },
  { code: "VIT_C", namePtBr: "Vitamina C", unit: "mg", category: "VITAMIN", sortOrder: 130, usdaNutrientNumber: "401" },
  { code: "VIT_D", namePtBr: "Vitamina D", unit: "mcg", category: "VITAMIN", sortOrder: 140, usdaNutrientNumber: "328" },
  { code: "VIT_E", namePtBr: "Vitamina E", unit: "mg", category: "VITAMIN", sortOrder: 150, usdaNutrientNumber: "323" },
  { code: "VIT_K", namePtBr: "Vitamina K", unit: "mcg", category: "VITAMIN", sortOrder: 160, usdaNutrientNumber: "430" },
  { code: "VIT_B1", namePtBr: "Vitamina B1 (Tiamina)", unit: "mg", category: "VITAMIN", sortOrder: 170, usdaNutrientNumber: "404" },
  { code: "VIT_B2", namePtBr: "Vitamina B2 (Riboflavina)", unit: "mg", category: "VITAMIN", sortOrder: 180, usdaNutrientNumber: "405" },
  { code: "VIT_B3", namePtBr: "Vitamina B3 (Niacina)", unit: "mg", category: "VITAMIN", sortOrder: 190, usdaNutrientNumber: "406" },
  { code: "VIT_B5", namePtBr: "Vitamina B5 (Ácido Pantotênico)", unit: "mg", category: "VITAMIN", sortOrder: 200, usdaNutrientNumber: "410" },
  { code: "VIT_B6", namePtBr: "Vitamina B6", unit: "mg", category: "VITAMIN", sortOrder: 210, usdaNutrientNumber: "415" },
  { code: "FOLATE", namePtBr: "Folato Total", unit: "mcg", category: "VITAMIN", sortOrder: 220, usdaNutrientNumber: "417" },
  { code: "VIT_B12", namePtBr: "Vitamina B12", unit: "mcg", category: "VITAMIN", sortOrder: 230, usdaNutrientNumber: "418" },
]);

export const CANONICAL_NUTRIENTS_BY_CODE = Object.freeze(
  new Map(CANONICAL_NUTRIENTS.map((n) => [n.code, n]))
);

export interface MicronutrientSnapshotItem {
  code: string;
  value: number | null;
  unit: string;
  status: MicronutrientStatus;
}

export interface MicronutrientsSnapshotEnvelope {
  schemaVersion: 1;
  catalogVersion: "1.0";
  sourceUid: string | null;
  sourceType: string;
  sourceKey: string | null;
  sourceVersion: string | null;
  dataQuality: string | null;
  capturedAt: string;
  nutrients: MicronutrientSnapshotItem[];
}

export interface BuildSnapshotOptions {
  sourceUid?: string | null;
  sourceType?: string;
  sourceKey?: string | null;
  sourceVersion?: string | null;
  dataQuality?: string | null;
  capturedAt?: string;
}

export function buildMicronutrientsSnapshotEnvelope(
  valuesMap: Map<string, { value: number | null; status: MicronutrientStatus }>,
  options: BuildSnapshotOptions = {}
): MicronutrientsSnapshotEnvelope {
  const nutrients: MicronutrientSnapshotItem[] = CANONICAL_NUTRIENTS.map((defn) => {
    const entry = valuesMap.get(defn.code);
    if (!entry) {
      return {
        code: defn.code,
        value: null,
        unit: defn.unit,
        status: "UNKNOWN",
      };
    }

    if (entry.status === "TRACE") {
      return {
        code: defn.code,
        value: null,
        unit: defn.unit,
        status: "TRACE",
      };
    }

    if (entry.status === "KNOWN_ZERO" || (entry.value === 0 && entry.status !== "UNKNOWN")) {
      return {
        code: defn.code,
        value: 0,
        unit: defn.unit,
        status: "KNOWN_ZERO",
      };
    }

    if (entry.status === "KNOWN" && entry.value != null && Number.isFinite(entry.value)) {
      return {
        code: defn.code,
        value: Math.round(Number(entry.value) * 10000) / 10000,
        unit: defn.unit,
        status: "KNOWN",
      };
    }

    return {
      code: defn.code,
      value: null,
      unit: defn.unit,
      status: "UNKNOWN",
    };
  });

  return {
    schemaVersion: 1,
    catalogVersion: "1.0",
    sourceUid: options.sourceUid ?? null,
    sourceType: options.sourceType ?? "MANUAL",
    sourceKey: options.sourceKey ?? null,
    sourceVersion: options.sourceVersion ?? null,
    dataQuality: options.dataQuality ?? null,
    capturedAt: options.capturedAt || new Date().toISOString(),
    nutrients,
  };
}

export interface MicronutrientTotalDetail {
  code: string;
  namePtBr: string;
  unit: string;
  category: MicronutrientCategory;
  value: number; // Subtotal quantificado (KNOWN + KNOWN_ZERO)
  quantifiedItemCount: number;
  traceItemCount: number;
  unknownItemCount: number;
  totalItemCount: number;
  isFullyQuantified: boolean;
  hasTrace: boolean;
  hasUnknown: boolean;
  empty: boolean;
  dataCompletenessPercent: number;
}

export interface MicronutrientTotalsSummary {
  totalItemsCount: number;
  empty: boolean;
  nutrients: Record<string, MicronutrientTotalDetail>;
}

export interface FoodNutrientDensityItem {
  nutrientCode: string;
  amountPerReference: number | null;
  unitCode: string;
  status: FoodNutrientStatus;
}

/**
 * Authoritative scaling of food library nutrient densities by calculated portion/quantity factor.
 * Returns a 23-nutrient deterministic snapshot envelope v1.
 */
export function scaleMicronutrientsForFood(
  nutrientDensities: FoodNutrientDensityItem[],
  factor: number | null,
  options?: BuildSnapshotOptions
): MicronutrientsSnapshotEnvelope {
  const valuesMap = new Map<string, { value: number | null; status: MicronutrientStatus }>();

  if (factor != null && Number.isFinite(factor) && factor > 0) {
    for (const item of nutrientDensities) {
      if (item.status === "TRACE") {
        valuesMap.set(item.nutrientCode, { value: null, status: "TRACE" });
      } else if (item.status === "KNOWN_ZERO" || item.amountPerReference === 0) {
        valuesMap.set(item.nutrientCode, { value: 0, status: "KNOWN_ZERO" });
      } else if (item.status === "KNOWN" && item.amountPerReference != null && Number.isFinite(item.amountPerReference)) {
        const scaled = Math.round(Number(item.amountPerReference) * factor * 10000) / 10000;
        valuesMap.set(item.nutrientCode, { value: scaled, status: "KNOWN" });
      } else {
        valuesMap.set(item.nutrientCode, { value: null, status: "UNKNOWN" });
      }
    }
  }

  return buildMicronutrientsSnapshotEnvelope(valuesMap, options);
}

/**
 * Authoritative meal micronutrient aggregation.
 * Historical items with null snapshot are treated as UNKNOWN for all 23 nutrients without DB backfill.
 */
export function calculateMealMicronutrientTotals(
  items: Array<{ micronutrientsSnapshotJson?: MicronutrientsSnapshotEnvelope | null }>
): MicronutrientTotalsSummary {
  const totalItemsCount = items.length;
  const empty = totalItemsCount === 0;

  const nutrientsMap: Record<string, MicronutrientTotalDetail> = {};

  for (const defn of CANONICAL_NUTRIENTS) {
    let rawSum = 0;
    let quantifiedItemCount = 0;
    let traceItemCount = 0;
    let unknownItemCount = 0;

    for (const item of items) {
      const envelope = item.micronutrientsSnapshotJson;
      // Historical item without snapshot: counted as UNKNOWN for completeness
      if (!envelope || !Array.isArray(envelope.nutrients)) {
        unknownItemCount += 1;
        continue;
      }

      const nut = envelope.nutrients.find((n) => n.code === defn.code);
      if (!nut || nut.status === "UNKNOWN") {
        unknownItemCount += 1;
      } else if (nut.status === "TRACE") {
        traceItemCount += 1;
      } else if (nut.status === "KNOWN_ZERO") {
        quantifiedItemCount += 1;
      } else if (nut.status === "KNOWN" && nut.value != null && Number.isFinite(Number(nut.value))) {
        quantifiedItemCount += 1;
        rawSum += Number(nut.value);
      } else {
        unknownItemCount += 1;
      }
    }

    const value = Math.round(rawSum * 100) / 100;
    const isFullyQuantified = !empty && quantifiedItemCount === totalItemsCount;
    const hasTrace = !empty && traceItemCount > 0;
    const hasUnknown = !empty && unknownItemCount > 0;
    const dataCompletenessPercent = empty ? 0 : Math.round((quantifiedItemCount / totalItemsCount) * 100);

    nutrientsMap[defn.code] = {
      code: defn.code,
      namePtBr: defn.namePtBr,
      unit: defn.unit,
      category: defn.category,
      value,
      quantifiedItemCount,
      traceItemCount,
      unknownItemCount,
      totalItemCount: totalItemsCount,
      isFullyQuantified,
      hasTrace,
      hasUnknown,
      empty,
      dataCompletenessPercent,
    };
  }

  return {
    totalItemsCount,
    empty,
    nutrients: nutrientsMap,
  };
}

/**
 * Authoritative plan micronutrient aggregation across meals.
 */
export function calculatePlanMicronutrientTotals(
  mealsOrTotals: Array<
    | MicronutrientTotalsSummary
    | { micronutrientTotals: MicronutrientTotalsSummary }
    | { items: Array<{ micronutrientsSnapshotJson?: MicronutrientsSnapshotEnvelope | null }> }
  >
): MicronutrientTotalsSummary {
  const summaries: MicronutrientTotalsSummary[] = mealsOrTotals.map((item) => {
    if ("micronutrientTotals" in item && item.micronutrientTotals) {
      return item.micronutrientTotals;
    }
    if ("items" in item && Array.isArray(item.items)) {
      return calculateMealMicronutrientTotals(item.items);
    }
    return item as MicronutrientTotalsSummary;
  });

  let totalItemsCount = 0;
  for (const s of summaries) {
    totalItemsCount += s.totalItemsCount;
  }
  const empty = totalItemsCount === 0;

  const nutrientsMap: Record<string, MicronutrientTotalDetail> = {};

  for (const defn of CANONICAL_NUTRIENTS) {
    let rawSum = 0;
    let quantifiedItemCount = 0;
    let traceItemCount = 0;
    let unknownItemCount = 0;

    for (const s of summaries) {
      const d = s.nutrients?.[defn.code];
      if (d) {
        rawSum += d.value;
        quantifiedItemCount += d.quantifiedItemCount;
        traceItemCount += d.traceItemCount;
        unknownItemCount += d.unknownItemCount;
      }
    }

    const value = Math.round(rawSum * 100) / 100;
    const isFullyQuantified = !empty && quantifiedItemCount === totalItemsCount;
    const hasTrace = !empty && traceItemCount > 0;
    const hasUnknown = !empty && unknownItemCount > 0;
    const dataCompletenessPercent = empty ? 0 : Math.round((quantifiedItemCount / totalItemsCount) * 100);

    nutrientsMap[defn.code] = {
      code: defn.code,
      namePtBr: defn.namePtBr,
      unit: defn.unit,
      category: defn.category,
      value,
      quantifiedItemCount,
      traceItemCount,
      unknownItemCount,
      totalItemCount: totalItemsCount,
      isFullyQuantified,
      hasTrace,
      hasUnknown,
      empty,
      dataCompletenessPercent,
    };
  }

  return {
    totalItemsCount,
    empty,
    nutrients: nutrientsMap,
  };
}

/**
 * Derives a standard or normalized unit code from a portion label (e.g. "Fatia" -> "FATIA", "Pedaço" -> "PEDACO").
 */
export function derivePortionUnitCode(label: string): string {
  const norm = (label || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "_");

  if (norm.includes("FATIA")) return "FATIA";
  if (norm.includes("COLHER") && norm.includes("SOPA")) return "COLHER_SOPA";
  if (norm.includes("COLHER") && (norm.includes("CHA") || norm.includes("SOBREMESA"))) return "COLHER_CHA";
  if (norm.includes("XICARA") || norm.includes("COPO")) return "XICARA";
  if (norm.includes("SCOOP")) return "SCOOP";
  if (norm.includes("UNIDADE")) return "UNIDADE";
  if (norm.includes("PEDACO")) return "PEDACO";
  return norm || "PORCAO";
}


// ============================================================================
// RELEASE F: DAILY NUTRITIONAL SUMMARY, MULTI-DAY ISOLATION & TARGETS
// ============================================================================

export type NutrientCompletenessStatus = "NO_DATA" | "PARTIAL" | "COMPLETE" | "EMPTY";

export interface NutrientCompletenessDetail {
  value: number | null;
  unit: string;
  knownItemCount: number;
  totalItemCount: number;
  missingItemCount: number;
  status: NutrientCompletenessStatus;
  displayText: string;
  completenessText: string;
  isPartial: boolean;
  isComplete: boolean;
  hasData: boolean;
}

export function evaluateNutrientCompleteness(
  values: Array<number | null | undefined>,
  unit: string
): NutrientCompletenessDetail {
  const totalItemCount = values.length;
  if (totalItemCount === 0) {
    return {
      value: null,
      unit,
      knownItemCount: 0,
      totalItemCount: 0,
      missingItemCount: 0,
      status: "EMPTY",
      displayText: "Sem itens",
      completenessText: "Nenhum alimento cadastrado",
      isPartial: false,
      isComplete: false,
      hasData: false,
    };
  }

  let knownItemCount = 0;
  let rawSum = 0;

  for (const v of values) {
    if (v !== null && v !== undefined && Number.isFinite(Number(v))) {
      knownItemCount += 1;
      rawSum += Number(v);
    }
  }

  const missingItemCount = totalItemCount - knownItemCount;

  // Case 1: No items have data for this nutrient
  if (knownItemCount === 0) {
    return {
      value: null,
      unit,
      knownItemCount: 0,
      totalItemCount,
      missingItemCount,
      status: "NO_DATA",
      displayText: "Sem dados",
      completenessText: "Sem dados",
      isPartial: false,
      isComplete: false,
      hasData: false,
    };
  }

  const value = Math.round(rawSum * 100) / 100;

  // Case 2: Partial data (some items known, some missing)
  if (missingItemCount > 0) {
    return {
      value,
      unit,
      knownItemCount,
      totalItemCount,
      missingItemCount,
      status: "PARTIAL",
      displayText: `${value} ${unit}`,
      completenessText: `Subtotal calculado (${missingItemCount} sem info)`,
      isPartial: true,
      isComplete: false,
      hasData: true,
    };
  }

  // Case 3: Complete data (all items known, including confirmed 0)
  return {
    value,
    unit,
    knownItemCount,
    totalItemCount,
    missingItemCount: 0,
    status: "COMPLETE",
    displayText: `${value} ${unit}`,
    completenessText: "Total completo",
    isPartial: false,
    isComplete: true,
    hasData: true,
  };
}

export interface TargetComparisonDetail {
  hasTarget: boolean;
  targetValue: number | null;
  targetUnit: string;
  percentage: number | null;
  statusText: string;
  isAboveTarget?: boolean;
  isMet?: boolean;
}

export function compareWithTarget(
  currentValue: number | null,
  targetValue: number | null | undefined,
  unit: string
): TargetComparisonDetail {
  if (targetValue == null || !Number.isFinite(Number(targetValue)) || Number(targetValue) <= 0) {
    return {
      hasTarget: false,
      targetValue: null,
      targetUnit: unit,
      percentage: null,
      statusText: "Meta não definida",
    };
  }

  const target = Number(targetValue);
  if (currentValue == null) {
    return {
      hasTarget: true,
      targetValue: target,
      targetUnit: unit,
      percentage: null,
      statusText: `Meta: ${target} ${unit} (Sem dados)`,
    };
  }

  const pct = Math.round((currentValue / target) * 100);
  return {
    hasTarget: true,
    targetValue: target,
    targetUnit: unit,
    percentage: pct,
    statusText: `Meta: ${target} ${unit} (${pct}%)`,
    isAboveTarget: pct > 105,
    isMet: pct >= 95 && pct <= 105,
  };
}

export interface CaloricDistributionDetail {
  method: string;
  proteinKcal: number;
  carbsKcal: number;
  fatKcal: number;
  calculatedSumKcal: number;
  proteinPercent: number;
  carbsPercent: number;
  fatPercent: number;
  isEstimatedFromPartialData: boolean;
}

export function calculateCaloricDistribution(
  proteinG: number | null,
  carbsG: number | null,
  fatG: number | null,
  isPartial: boolean
): CaloricDistributionDetail {
  const pG = proteinG ?? 0;
  const cG = carbsG ?? 0;
  const fG = fatG ?? 0;

  const proteinKcal = Math.round(pG * 4 * 100) / 100;
  const carbsKcal = Math.round(cG * 4 * 100) / 100;
  const fatKcal = Math.round(fG * 9 * 100) / 100;
  const calculatedSumKcal = Math.round((proteinKcal + carbsKcal + fatKcal) * 100) / 100;

  let proteinPercent = 0;
  let carbsPercent = 0;
  let fatPercent = 0;

  if (calculatedSumKcal > 0) {
    proteinPercent = Math.round((proteinKcal / calculatedSumKcal) * 100);
    carbsPercent = Math.round((carbsKcal / calculatedSumKcal) * 100);
    fatPercent = Math.max(0, 100 - proteinPercent - carbsPercent);
  }

  return {
    method: "Fatores de Atwater (4 kcal/g P, 4 kcal/g C, 9 kcal/g G)",
    proteinKcal,
    carbsKcal,
    fatKcal,
    calculatedSumKcal,
    proteinPercent,
    carbsPercent,
    fatPercent,
    isEstimatedFromPartialData: isPartial,
  };
}

export interface PlanDayInfo {
  id: string;
  label: string;
  mealCount: number;
  mealPublicIds: string[];
}

const DAY_PATTERNS: Array<{ id: string; label: string; regex: RegExp }> = [
  { id: "segunda", label: "Segunda-feira", regex: /\b(segunda(-feira)?|seg)\b/i },
  { id: "terca", label: "Terça-feira", regex: /\b(ter[cç]a(-feira)?|ter)\b/i },
  { id: "quarta", label: "Quarta-feira", regex: /\b(quarta(-feira)?|qua)\b/i },
  { id: "quinta", label: "Quinta-feira", regex: /\b(quinta(-feira)?|qui)\b/i },
  { id: "sexta", label: "Sexta-feira", regex: /\b(sexta(-feira)?|sex)\b/i },
  { id: "sabado", label: "Sábado", regex: /\b(s[aá]bado|sab)\b/i },
  { id: "domingo", label: "Domingo", regex: /\b(domingo|dom)\b/i },
  { id: "dia-1", label: "Dia 1", regex: /\bdia\s*1\b/i },
  { id: "dia-2", label: "Dia 2", regex: /\bdia\s*2\b/i },
  { id: "dia-3", label: "Dia 3", regex: /\bdia\s*3\b/i },
  { id: "dia-4", label: "Dia 4", regex: /\bdia\s*4\b/i },
  { id: "dia-5", label: "Dia 5", regex: /\bdia\s*5\b/i },
  { id: "dia-6", label: "Dia 6", regex: /\bdia\s*6\b/i },
  { id: "dia-7", label: "Dia 7", regex: /\bdia\s*7\b/i },
  { id: "treino", label: "Dia de Treino", regex: /\b(dia\s+de\s+treino|treino)\b/i },
  { id: "descanso", label: "Dia de Descanso", regex: /\b(descanso|n[aã]o\s+treino)\b/i },
];

export function detectPlanDays(meals: Array<{ publicId?: string; title?: string; notes?: string | null }>): PlanDayInfo[] {
  const dayBuckets = new Map<string, { label: string; mealPublicIds: string[] }>();

  for (const m of meals) {
    const text = `${m.title || ""} ${m.notes || ""}`;
    let matchedDay: { id: string; label: string } | null = null;

    for (const pat of DAY_PATTERNS) {
      if (pat.regex.test(text)) {
        matchedDay = pat;
        break;
      }
    }

    if (matchedDay && m.publicId) {
      if (!dayBuckets.has(matchedDay.id)) {
        dayBuckets.set(matchedDay.id, { label: matchedDay.label, mealPublicIds: [] });
      }
      dayBuckets.get(matchedDay.id)!.mealPublicIds.push(m.publicId);
    }
  }

  // If at least 2 distinct days detected, return detected days
  if (dayBuckets.size >= 2) {
    const result: PlanDayInfo[] = [];
    for (const [id, data] of dayBuckets.entries()) {
      result.push({
        id,
        label: data.label,
        mealCount: data.mealPublicIds.length,
        mealPublicIds: data.mealPublicIds,
      });
    }
    return result;
  }

  // Single daily cardápio (standard plan)
  return [
    {
      id: "ALL_DAYS",
      label: "Cardápio Diário",
      mealCount: meals.length,
      mealPublicIds: meals.map((m) => m.publicId || "").filter(Boolean),
    },
  ];
}

export function filterMealsBySelectedDay<T extends { publicId?: string }>(
  meals: T[],
  selectedDayId: string,
  detectedDays: PlanDayInfo[]
): T[] {
  if (selectedDayId === "ALL_DAYS" || !detectedDays || detectedDays.length <= 1) {
    return meals;
  }

  const targetDay = detectedDays.find((d) => d.id === selectedDayId);
  if (!targetDay || targetDay.mealPublicIds.length === 0) {
    return meals;
  }

  const allowedIds = new Set(targetDay.mealPublicIds);
  return meals.filter((m) => m.publicId && allowedIds.has(m.publicId));
}

export interface KeyMicronutrientItem {
  code: string;
  namePtBr: string;
  value: number | null;
  unit: string;
  statusText: string;
  isPartial: boolean;
  hasData: boolean;
}

export interface DailyNutritionalSummary {
  dayId: string;
  dayLabel: string;
  totalItemsCount: number;
  empty: boolean;
  calories: NutrientCompletenessDetail;
  protein: NutrientCompletenessDetail;
  carbohydrate: NutrientCompletenessDetail;
  fat: NutrientCompletenessDetail;
  fiber: NutrientCompletenessDetail;
  micronutrients: {
    nutrients: Record<string, MicronutrientTotalDetail>;
    keyMicronutrients: KeyMicronutrientItem[];
  };
  caloricDistribution: CaloricDistributionDetail;
  targets: {
    calories: TargetComparisonDetail;
    protein: TargetComparisonDetail;
    carbohydrates: TargetComparisonDetail;
    fats: TargetComparisonDetail;
  };
  meals: Array<{
    publicId: string;
    title: string;
    scheduledTime: string | null;
    caloriesKcal: number;
    proteinG: number;
    carbohydrateG: number;
    fatG: number;
    percentOfDay: number;
    itemsCount: number;
    hasIncompleteData: boolean;
  }>;
}

const KEY_MICRONUTRIENT_CODES = ["NA", "K", "CA", "FE", "VIT_C", "ZN", "MG", "VIT_D", "VIT_A"] as const;

export function calculateDailySummary(params: {
  meals: Array<{
    publicId?: string;
    title?: string;
    scheduledTime?: string | null;
    items?: Array<{
      caloriesKcalSnapshot?: number | null;
      proteinGSnapshot?: number | null;
      carbohydrateGSnapshot?: number | null;
      fatGSnapshot?: number | null;
      micronutrientsSnapshotJson?: MicronutrientsSnapshotEnvelope | null;
      substitutions?: unknown[];
    }>;
    mealTotals?: MacroTotals;
  }>;
  planningTarget?: {
    caloriesKcal?: number | null;
    proteinG?: number | null;
    carbsG?: number | null;
    fatsG?: number | null;
  } | null;
  selectedDayId?: string;
  detectedDays?: PlanDayInfo[];
}): DailyNutritionalSummary {
  const detectedDays = params.detectedDays || detectPlanDays(params.meals);
  const selectedDayId = params.selectedDayId || (detectedDays[0]?.id || "ALL_DAYS");
  const filteredMeals = filterMealsBySelectedDay(params.meals, selectedDayId, detectedDays);

  const activeDayInfo = detectedDays.find((d) => d.id === selectedDayId) || detectedDays[0] || {
    id: "ALL_DAYS",
    label: "Cardápio Diário",
    mealCount: filteredMeals.length,
    mealPublicIds: [],
  };

  // 1. Extract ONLY primary prescribed items from filtered meals. NEVER sum substitutions.
  const primaryItems: Array<{
    caloriesKcalSnapshot?: number | null;
    proteinGSnapshot?: number | null;
    carbohydrateGSnapshot?: number | null;
    fatGSnapshot?: number | null;
    micronutrientsSnapshotJson?: MicronutrientsSnapshotEnvelope | null;
  }> = [];

  for (const m of filteredMeals) {
    if (Array.isArray(m.items)) {
      for (const it of m.items) {
        primaryItems.push({
          caloriesKcalSnapshot: it.caloriesKcalSnapshot,
          proteinGSnapshot: it.proteinGSnapshot,
          carbohydrateGSnapshot: it.carbohydrateGSnapshot,
          fatGSnapshot: it.fatGSnapshot,
          micronutrientsSnapshotJson: it.micronutrientsSnapshotJson,
        });
      }
    }
  }

  const totalItemsCount = primaryItems.length;
  const empty = totalItemsCount === 0;

  // 2. Authoritative food snapshot totals (never overridden by Atwater math)
  const calories = evaluateNutrientCompleteness(
    primaryItems.map((i) => i.caloriesKcalSnapshot),
    "kcal"
  );
  const protein = evaluateNutrientCompleteness(
    primaryItems.map((i) => i.proteinGSnapshot),
    "g"
  );
  const carbohydrate = evaluateNutrientCompleteness(
    primaryItems.map((i) => i.carbohydrateGSnapshot),
    "g"
  );
  const fat = evaluateNutrientCompleteness(
    primaryItems.map((i) => i.fatGSnapshot),
    "g"
  );

  // Fiber from micronutrient envelope
  const fiberValues: Array<number | null | undefined> = primaryItems.map((it) => {
    if (!it.micronutrientsSnapshotJson || !Array.isArray(it.micronutrientsSnapshotJson.nutrients)) {
      return null;
    }
    const fn = it.micronutrientsSnapshotJson.nutrients.find((n) => n.code === "FIBER");
    if (!fn) return null;
    if (fn.status === "KNOWN_ZERO") return 0;
    if (fn.status === "KNOWN" && fn.value != null && Number.isFinite(Number(fn.value))) {
      return Number(fn.value);
    }
    return null;
  });
  const fiber = evaluateNutrientCompleteness(fiberValues, "g");

  // 3. Caloric distribution (% VET) via Atwater method
  const isPartialMacros =
    protein.isPartial ||
    carbohydrate.isPartial ||
    fat.isPartial ||
    !protein.hasData ||
    !carbohydrate.hasData ||
    !fat.hasData;

  const caloricDistribution = calculateCaloricDistribution(
    protein.value,
    carbohydrate.value,
    fat.value,
    isPartialMacros
  );

  // 4. Targets comparison (only when target > 0)
  const targets = {
    calories: compareWithTarget(calories.value, params.planningTarget?.caloriesKcal, "kcal"),
    protein: compareWithTarget(protein.value, params.planningTarget?.proteinG, "g"),
    carbohydrates: compareWithTarget(carbohydrate.value, params.planningTarget?.carbsG, "g"),
    fats: compareWithTarget(fat.value, params.planningTarget?.fatsG, "g"),
  };

  // 5. Plan micronutrient aggregation across meals
  const microTotals = calculatePlanMicronutrientTotals(
    filteredMeals.map((m) => ({ items: m.items || [] }))
  );

  const keyMicronutrients: KeyMicronutrientItem[] = [];
  for (const code of KEY_MICRONUTRIENT_CODES) {
    const d = microTotals.nutrients?.[code];
    const defn = CANONICAL_NUTRIENTS_BY_CODE.get(code);
    if (d && defn) {
      const hasData = d.quantifiedItemCount > 0;
      const isPartial = d.hasUnknown && hasData;
      let statusText = "Sem dados";
      if (hasData) {
        statusText = isPartial
          ? `${d.value} ${defn.unit} (* ${d.unknownItemCount} sem info)`
          : `${d.value} ${defn.unit}`;
      }
      keyMicronutrients.push({
        code,
        namePtBr: defn.namePtBr,
        value: hasData ? d.value : null,
        unit: defn.unit,
        statusText,
        isPartial,
        hasData,
      });
    }
  }

  // 6. Meal breakdown with % of day
  const mealsBreakdown = filteredMeals.map((m) => {
    const mTotals = m.mealTotals || calculateMealTotals((m.items as SnapshotItemSource[]) || []);
    const mealKcal = mTotals.caloriesKcal || 0;
    const dayKcal = calories.value || 0;
    const percentOfDay = dayKcal > 0 ? Math.round((mealKcal / dayKcal) * 100) : 0;

    return {
      publicId: m.publicId || "",
      title: m.title || "Refeição",
      scheduledTime: m.scheduledTime || null,
      caloriesKcal: mealKcal,
      proteinG: mTotals.proteinG || 0,
      carbohydrateG: mTotals.carbohydrateG || 0,
      fatG: mTotals.fatG || 0,
      percentOfDay,
      itemsCount: m.items?.length || 0,
      hasIncompleteData: mTotals.hasIncompleteData,
    };
  });

  return {
    dayId: activeDayInfo.id,
    dayLabel: activeDayInfo.label,
    totalItemsCount,
    empty,
    calories,
    protein,
    carbohydrate,
    fat,
    fiber,
    micronutrients: {
      nutrients: microTotals.nutrients,
      keyMicronutrients,
    },
    caloricDistribution,
    targets,
    meals: mealsBreakdown,
  };
}
