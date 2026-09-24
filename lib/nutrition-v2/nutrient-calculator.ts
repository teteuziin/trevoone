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
