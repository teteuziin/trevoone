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

  // 2. Food-specific household portion provided
  if (portionEquivalentAmount != null) {
    if (!Number.isFinite(portionEquivalentAmount) || portionEquivalentAmount <= 0) {
      return { factor: null, effectiveQty: null, error: "O peso/equivalência da porção deve ser maior que zero e finito." };
    }
    const effectiveQty = prescribedQty * portionEquivalentAmount;
    const factor = effectiveQty / refAmount;
    return { factor, effectiveQty };
  }

  // 3. Direct mass conversion (G <-> KG)
  if (MASS_UNITS.has(rUnit) && MASS_UNITS.has(pUnit)) {
    let rInG = refAmount;
    if (rUnit === "KG") rInG = refAmount * 1000;

    let pInG = prescribedQty;
    if (pUnit === "KG") pInG = prescribedQty * 1000;

    const factor = pInG / rInG;
    const effectiveQty = rUnit === "KG" ? pInG / 1000 : pInG;
    return { factor, effectiveQty };
  }

  // 4. Direct volume conversion (ML <-> L)
  if (VOLUME_UNITS.has(rUnit) && VOLUME_UNITS.has(pUnit)) {
    let rInMl = refAmount;
    if (rUnit === "L") rInMl = refAmount * 1000;

    let pInMl = prescribedQty;
    if (pUnit === "L") pInMl = prescribedQty * 1000;

    const factor = pInMl / rInMl;
    const effectiveQty = rUnit === "L" ? pInMl / 1000 : pInMl;
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
  totalItemsCount: number;
  empty: boolean;
  details: {
    calories: NutrientTotalDetail;
    protein: NutrientTotalDetail;
    carbohydrate: NutrientTotalDetail;
    fat: NutrientTotalDetail;
  };
}

export interface SnapshotItemSource {
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

  const hasIncompleteData = totalItemsCount > 0 && (
    !calDetail.isComplete ||
    !protDetail.isComplete ||
    !carbDetail.isComplete ||
    !fatDetail.isComplete
  );

  return {
    caloriesKcal: calDetail.value,
    proteinG: protDetail.value,
    carbohydrateG: carbDetail.value,
    fatG: fatDetail.value,
    hasIncompleteData,
    totalItemsCount,
    empty: totalItemsCount === 0,
    details: {
      calories: calDetail,
      protein: protDetail,
      carbohydrate: carbDetail,
      fat: fatDetail,
    },
  };
}

export function calculatePlanTotals(
  mealsOrTotals: Array<MacroTotals | { mealTotals: MacroTotals }>
): MacroTotals {
  const totalsList: MacroTotals[] = mealsOrTotals.map((item) =>
    "mealTotals" in item ? item.mealTotals : item
  );

  let rawCalories = 0;
  let rawProtein = 0;
  let rawCarbs = 0;
  let rawFat = 0;

  let totalItemsCount = 0;
  let calKnown = 0;
  let protKnown = 0;
  let carbKnown = 0;
  let fatKnown = 0;

  for (const m of totalsList) {
    rawCalories += m.caloriesKcal;
    rawProtein += m.proteinG;
    rawCarbs += m.carbohydrateG;
    rawFat += m.fatG;

    totalItemsCount += m.totalItemsCount;
    calKnown += m.details.calories.knownItemCount;
    protKnown += m.details.protein.knownItemCount;
    carbKnown += m.details.carbohydrate.knownItemCount;
    fatKnown += m.details.fat.knownItemCount;
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

  const hasIncompleteData = !isEmpty && (!calComplete || !protComplete || !carbComplete || !fatComplete);

  return {
    caloriesKcal: calValue,
    proteinG: protValue,
    carbohydrateG: carbValue,
    fatG: fatValue,
    hasIncompleteData,
    totalItemsCount,
    empty: isEmpty,
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
