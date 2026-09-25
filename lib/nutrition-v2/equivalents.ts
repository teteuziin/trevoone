/**
 * TREVO ONE — NUTRITION V2 EQUIVALENTS MODULE
 * Pure, side-effect-free engine for calculating nutritional equivalence
 * based on a single selected macro/energy criterion.
 *
 * Strictly deterministic: no DB, React, or Server Action dependencies.
 * Conforms to Release F requirements: dynamic reference amounts, dimension-aware (ML/G),
 * explicit difference metrics, food-specific portion suggestions, and comprehensive guards.
 */

// ============================================================================
// TYPES
// ============================================================================

export type EquivalentCriterion =
  | "CALORIES"
  | "PROTEIN"
  | "CARBOHYDRATE"
  | "FAT";

export const ALL_EQUIVALENT_CRITERIA = [
  "CALORIES",
  "PROTEIN",
  "CARBOHYDRATE",
  "FAT",
] as const;

export const EQUIVALENT_CRITERIA_LABELS: Record<EquivalentCriterion, string> = {
  CALORIES: "Calorias (Energia)",
  PROTEIN: "Proteína",
  CARBOHYDRATE: "Carboidrato",
  FAT: "Gordura",
};

export const EQUIVALENT_CRITERIA_SHORT_LABELS: Record<EquivalentCriterion, string> = {
  CALORIES: "Calorias",
  PROTEIN: "Proteína",
  CARBOHYDRATE: "Carboidrato",
  FAT: "Gordura",
};

export const EQUIVALENT_CRITERIA_UNITS: Record<EquivalentCriterion, string> = {
  CALORIES: "kcal",
  PROTEIN: "g",
  CARBOHYDRATE: "g",
  FAT: "g",
};

export type EquivalentResultStatus =
  | "READY"
  | "REFERENCE_NUTRIENT_UNKNOWN"
  | "REFERENCE_NUTRIENT_ZERO"
  | "CANDIDATE_NUTRIENT_UNKNOWN"
  | "CANDIDATE_NUTRIENT_ZERO"
  | "INCOMPATIBLE_DIMENSIONS"
  | "INVALID_QUANTITY"
  | "IMPRACTICAL"
  // Legacy status aliases for compatibility:
  | "MISSING_DATA"
  | "NOT_APPLICABLE"
  | "INVALID_REFERENCE";

export interface FoodPortionItem {
  publicId?: string;
  label: string;
  equivalentReferenceAmount: number;
  status?: string;
}

export interface ReferenceFoodPrescription {
  name: string;
  prescribedQuantity?: number | null;
  prescribedUnitCode?: string | null;
  prescribedUnitLabel?: string | null;
  caloriesKcalSnapshot?: number | null;
  proteinGSnapshot?: number | null;
  carbohydrateGSnapshot?: number | null;
  fatGSnapshot?: number | null;
  // Base food composition for scaling when snapshots are omitted:
  referenceAmount?: number | null;
  referenceUnitCode?: string | null;
  caloriesKcal?: number | null;
  proteinG?: number | null;
  carbohydrateG?: number | null;
  fatG?: number | null;
  portionEquivalentAmount?: number | null;
}

export interface CandidateFoodItem {
  publicId: string;
  name: string;
  displayNamePtBr?: string | null;
  category?: string | null;
  referenceAmount: number;
  referenceUnitCode: string;
  caloriesKcal: number | null;
  proteinG: number | null;
  carbohydrateG: number | null;
  fatG: number | null;
  scope?: string | null;
  portions?: FoodPortionItem[];
}

export interface MacroSnapshots {
  caloriesKcal: number | null;
  proteinG: number | null;
  carbohydrateG: number | null;
  fatG: number | null;
}

export interface PortionSuggestion {
  portionLabel: string;
  portionAmount: number;
  portionCount: number;
  formattedText: string;
}

export interface DifferenceMetrics {
  targetValue: number;
  candidateCalculatedValue: number;
  absoluteDifference: number;
  percentageDifference: number;
}

export interface EquivalentCalculationResult {
  status: EquivalentResultStatus;
  criterion: EquivalentCriterion;
  criterionLabel: string;
  criterionUnit: string;
  targetNutrientValue: number | null;
  candidateNutrientValue: number | null;
  substituteNutrientValue: number | null; // legacy alias
  calculatedQuantity: number | null;
  roundedQuantity: number | null;
  unitCode: string | null;
  formattedQuantity: string | null;
  // Legacy aliases:
  rawEquivalentGrams: number | null;
  roundedGrams: number | null;
  formattedGrams: string | null;
  macroSnapshotsForEquivalent: MacroSnapshots | null;
  portionSuggestion?: PortionSuggestion | null;
  differenceMetrics?: DifferenceMetrics | null;
  isImpractical: boolean;
  canApply: boolean;
  message?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const IMPRACTICAL_GRAMS_THRESHOLD = 2000;
export const MIN_SIGNIFICANT_NUTRIENT_THRESHOLD = 0.05;

// ============================================================================
// PURE UTILITIES
// ============================================================================

/**
 * Rounds a macro value to 2 decimal places. Returns null if null/undefined/NaN.
 */
export function roundMacro(val: number | null | undefined): number | null {
  if (val == null || isNaN(Number(val))) return null;
  return Math.round(Number(val) * 100) / 100;
}

/**
 * Normalizes criterion string into one of the four supported criteria:
 * CALORIES, PROTEIN, CARBOHYDRATE, FAT.
 */
export function normalizeCriterion(
  criterion: string
): EquivalentCriterion {
  const upper = criterion?.trim().toUpperCase();
  if (upper === "CALORIES" || upper === "ENERGY") return "CALORIES";
  if (upper === "PROTEIN") return "PROTEIN";
  if (upper === "CARBOHYDRATE" || upper === "CARBS") return "CARBOHYDRATE";
  if (upper === "FAT") return "FAT";
  throw new Error(`Critério inválido: ${criterion}`);
}

export type CanonicalDimension = "MASS" | "VOLUME";

export interface CanonicalRefAmount {
  amount: number;
  unitCode: "G" | "ML";
  dimension: CanonicalDimension;
}

/**
 * Validates whether a unit can be canonicalized into MASS (G) or VOLUME (ML).
 * Preserves dimensions: G <-> KG (factor 1000), ML <-> L (factor 1000).
 * Strictly refuses arbitrary ML <-> G conversion.
 */
export function convertRefAmountToCanonical(
  amount: number | null | undefined,
  unitCode: string | null | undefined
): CanonicalRefAmount | null {
  if (amount == null || !Number.isFinite(amount) || amount <= 0 || !unitCode) {
    return null;
  }
  const u = unitCode.trim().toUpperCase();
  if (u === "G") {
    return { amount, unitCode: "G", dimension: "MASS" };
  }
  if (u === "KG") {
    return { amount: amount * 1000, unitCode: "G", dimension: "MASS" };
  }
  if (u === "ML") {
    return { amount, unitCode: "ML", dimension: "VOLUME" };
  }
  if (u === "L") {
    return { amount: amount * 1000, unitCode: "ML", dimension: "VOLUME" };
  }
  return null;
}

/**
 * Legacy helper for mass compatibility.
 */
export function convertRefAmountToGrams(
  refAmount: number,
  refUnit: string
): number | null {
  const canon = convertRefAmountToCanonical(refAmount, refUnit);
  if (canon && canon.dimension === "MASS") {
    return canon.amount;
  }
  return null;
}

const CANONICAL_MASS_UNITS = new Set(["G", "KG"]);
const CANONICAL_VOLUME_UNITS = new Set(["ML", "L"]);

/**
 * Pure calculation of macro factor between reference amount and prescribed quantity.
 */
export function calculateMacroFactor(
  refAmount: number,
  refUnit: string,
  prescribedQty: number,
  prescribedUnit: string,
  portionEquivalentAmount?: number | null
): number | null {
  if (refAmount <= 0 || prescribedQty <= 0) return null;

  const rUnit = refUnit.trim().toUpperCase();
  const pUnit = prescribedUnit.trim().toUpperCase();

  // 1. If portion is provided with equivalent reference amount
  if (portionEquivalentAmount != null && portionEquivalentAmount > 0) {
    const totalRefAmount = prescribedQty * portionEquivalentAmount;
    return totalRefAmount / refAmount;
  }

  // 2. Direct mass conversion (G <-> KG)
  if (CANONICAL_MASS_UNITS.has(rUnit) && CANONICAL_MASS_UNITS.has(pUnit)) {
    let rInG = refAmount;
    if (rUnit === "KG") rInG = refAmount * 1000;

    let pInG = prescribedQty;
    if (pUnit === "KG") pInG = prescribedQty * 1000;

    return pInG / rInG;
  }

  // 3. Direct volume conversion (ML <-> L)
  if (CANONICAL_VOLUME_UNITS.has(rUnit) && CANONICAL_VOLUME_UNITS.has(pUnit)) {
    let rInMl = refAmount;
    if (rUnit === "L") rInMl = refAmount * 1000;

    let pInMl = prescribedQty;
    if (pUnit === "L") pInMl = prescribedQty * 1000;

    return pInMl / rInMl;
  }

  // 4. Same unit match
  if (rUnit === pUnit) {
    return prescribedQty / refAmount;
  }

  return null;
}

/**
 * Extracts target nutrient value from the prescribed item's existing snapshots
 * or dynamically scales from base composition if snapshots are not yet created.
 */
export function getTargetNutrientValue(
  reference: ReferenceFoodPrescription,
  criterion: EquivalentCriterion | string
): number | null {
  const normalized = normalizeCriterion(criterion);

  // 1. Check existing snapshot if present
  let snapshotVal: number | null | undefined = undefined;
  if (normalized === "CALORIES") {
    if (reference.caloriesKcalSnapshot !== undefined && reference.caloriesKcalSnapshot !== null) {
      snapshotVal = reference.caloriesKcalSnapshot;
    }
  } else if (normalized === "PROTEIN") {
    if (reference.proteinGSnapshot !== undefined && reference.proteinGSnapshot !== null) {
      snapshotVal = reference.proteinGSnapshot;
    }
  } else if (normalized === "CARBOHYDRATE") {
    if (reference.carbohydrateGSnapshot !== undefined && reference.carbohydrateGSnapshot !== null) {
      snapshotVal = reference.carbohydrateGSnapshot;
    }
  } else if (normalized === "FAT") {
    if (reference.fatGSnapshot !== undefined && reference.fatGSnapshot !== null) {
      snapshotVal = reference.fatGSnapshot;
    }
  }

  if (snapshotVal !== undefined && snapshotVal !== null) {
    const num = Number(snapshotVal);
    return isNaN(num) ? null : num;
  }

  // 2. Fall back to base composition with scaling by prescribed quantity
  let baseNutrient: number | null | undefined = null;
  if (normalized === "CALORIES") baseNutrient = reference.caloriesKcal;
  else if (normalized === "PROTEIN") baseNutrient = reference.proteinG;
  else if (normalized === "CARBOHYDRATE") baseNutrient = reference.carbohydrateG;
  else if (normalized === "FAT") baseNutrient = reference.fatG;

  if (baseNutrient == null || isNaN(Number(baseNutrient))) {
    return null;
  }

  const baseNum = Number(baseNutrient);

  if (
    reference.prescribedQuantity != null &&
    reference.referenceAmount != null &&
    reference.referenceUnitCode
  ) {
    const factor = calculateMacroFactor(
      reference.referenceAmount,
      reference.referenceUnitCode,
      reference.prescribedQuantity,
      reference.prescribedUnitCode || reference.referenceUnitCode,
      reference.portionEquivalentAmount
    );
    if (factor != null && Number.isFinite(factor)) {
      return baseNum * factor;
    }
  }

  return baseNum;
}

/**
 * Extracts candidate nutrient value from the food's reference composition.
 */
export function getCandidateNutrientValue(
  candidate: CandidateFoodItem,
  criterion: EquivalentCriterion | string
): number | null {
  const normalized = normalizeCriterion(criterion);
  let val: number | null | undefined = null;
  if (normalized === "CALORIES") val = candidate.caloriesKcal;
  else if (normalized === "PROTEIN") val = candidate.proteinG;
  else if (normalized === "CARBOHYDRATE") val = candidate.carbohydrateG;
  else if (normalized === "FAT") val = candidate.fatG;

  if (val == null || isNaN(Number(val))) return null;
  return Number(val);
}

/**
 * Finds if the calculated equivalent quantity cleanly corresponds to an active
 * household measure / food-specific portion (within 12% tolerance of half-steps).
 */
export function findBestPortionSuggestion(
  calculatedQuantity: number,
  outputUnitCode: string,
  portions?: FoodPortionItem[]
): PortionSuggestion | null {
  if (!portions || portions.length === 0 || calculatedQuantity <= 0) return null;

  const validPortions = portions.filter(
    (p) =>
      p &&
      p.status !== "ARCHIVED" &&
      p.equivalentReferenceAmount != null &&
      Number.isFinite(p.equivalentReferenceAmount) &&
      p.equivalentReferenceAmount > 0
  );

  if (validPortions.length === 0) return null;

  let bestSuggestion: PortionSuggestion | null = null;
  let minError = Infinity;

  for (const p of validPortions) {
    const pAmt = Number(p.equivalentReferenceAmount);
    const count = calculatedQuantity / pAmt;
    if (count < 0.25 || count > 30) continue;

    // Nearest half-step (0.5, 1, 1.5, 2, 2.5...)
    const roundedStep = Math.round(count * 2) / 2;
    if (roundedStep <= 0) continue;

    const error = Math.abs(count - roundedStep) / count;

    if (error <= 0.12 && error < minError) {
      minError = error;
      const formattedCount =
        roundedStep % 1 === 0 ? String(roundedStep) : roundedStep.toFixed(1).replace(".", ",");
      const unitLabel = outputUnitCode.toLowerCase();
      bestSuggestion = {
        portionLabel: p.label,
        portionAmount: pAmt,
        portionCount: roundedStep,
        formattedText: `≈ ${formattedCount} ${p.label} (${pAmt} ${unitLabel} cada)`,
      };
    }
  }

  return bestSuggestion;
}

// ============================================================================
// MAIN EQUIVALENCE CALCULATOR
// ============================================================================

/**
 * Calculates nutritional equivalence of a candidate food relative to a reference food.
 *
 * Formula:
 * calculatedQuantity = (targetNutrient * candidateReferenceAmountInCanonicalUnit) / candidateNutrient
 *
 * Key guarantees:
 * - Dynamic referenceAmount (never hardcoded to 100g).
 * - Dimension-aware: Mass stays in G, Volume stays in ML.
 * - No arbitrary ML <-> G conversions.
 * - Strict Division-by-zero & Null != Zero handling:
 *   - Reference null -> REFERENCE_NUTRIENT_UNKNOWN
 *   - Reference <= 0 -> REFERENCE_NUTRIENT_ZERO
 *   - Candidate null -> CANDIDATE_NUTRIENT_UNKNOWN
 *   - Candidate <= 0 -> CANDIDATE_NUTRIENT_ZERO
 * - Negative, NaN, Infinite quantities safely blocked.
 * - Exact difference metrics (target, candidate calculated, absolute, percentage).
 * - Optional food-specific portion suggestion.
 * - Impractical threshold (> 2000 g or > 2000 ml) gating.
 */
export function calculateNutrientEquivalence(
  reference: ReferenceFoodPrescription,
  candidate: CandidateFoodItem,
  criterion: EquivalentCriterion | string
): EquivalentCalculationResult {
  let normalizedCriterion: EquivalentCriterion;
  try {
    normalizedCriterion = normalizeCriterion(criterion);
  } catch {
    return {
      status: "INVALID_REFERENCE",
      criterion: "CALORIES",
      criterionLabel: String(criterion),
      criterionUnit: "",
      targetNutrientValue: null,
      candidateNutrientValue: null,
      substituteNutrientValue: null,
      calculatedQuantity: null,
      roundedQuantity: null,
      unitCode: null,
      formattedQuantity: null,
      rawEquivalentGrams: null,
      roundedGrams: null,
      formattedGrams: null,
      macroSnapshotsForEquivalent: null,
      isImpractical: false,
      canApply: false,
      message: `Critério de equivalência inválido: ${criterion}`,
    };
  }

  const criterionLabel = EQUIVALENT_CRITERIA_LABELS[normalizedCriterion];
  const criterionUnit = EQUIVALENT_CRITERIA_UNITS[normalizedCriterion];

  // 1. Validate reference input quantity if provided
  if (reference.prescribedQuantity != null) {
    const pq = Number(reference.prescribedQuantity);
    if (!Number.isFinite(pq) || pq <= 0) {
      return {
        status: "INVALID_QUANTITY",
        criterion: normalizedCriterion,
        criterionLabel,
        criterionUnit,
        targetNutrientValue: null,
        candidateNutrientValue: null,
        substituteNutrientValue: null,
        calculatedQuantity: null,
        roundedQuantity: null,
        unitCode: null,
        formattedQuantity: null,
        rawEquivalentGrams: null,
        roundedGrams: null,
        formattedGrams: null,
        macroSnapshotsForEquivalent: null,
        isImpractical: false,
        canApply: false,
        message: "A quantidade prescrita do alimento de referência deve ser um número positivo e finito.",
      };
    }
  }

  // 2. Validate candidate canonical dimension (G/KG -> G, ML/L -> ML)
  const candCanon = convertRefAmountToCanonical(
    candidate.referenceAmount,
    candidate.referenceUnitCode
  );

  if (candCanon == null) {
    return {
      status: "INCOMPATIBLE_DIMENSIONS",
      criterion: normalizedCriterion,
      criterionLabel,
      criterionUnit,
      targetNutrientValue: null,
      candidateNutrientValue: null,
      substituteNutrientValue: null,
      calculatedQuantity: null,
      roundedQuantity: null,
      unitCode: null,
      formattedQuantity: null,
      rawEquivalentGrams: null,
      roundedGrams: null,
      formattedGrams: null,
      macroSnapshotsForEquivalent: null,
      isImpractical: false,
      canApply: false,
      message: `A unidade '${candidate.referenceUnitCode || "indefinida"}' deste alimento não é compatível para cálculo canônico direto (esperado: g, kg, ml ou l).`,
    };
  }

  // 3. Resolve target nutrient value from reference
  const target = getTargetNutrientValue(reference, normalizedCriterion);

  if (target === null || target === undefined || isNaN(target)) {
    return {
      status: "REFERENCE_NUTRIENT_UNKNOWN",
      criterion: normalizedCriterion,
      criterionLabel,
      criterionUnit,
      targetNutrientValue: null,
      candidateNutrientValue: null,
      substituteNutrientValue: null,
      calculatedQuantity: null,
      roundedQuantity: null,
      unitCode: candCanon.unitCode,
      formattedQuantity: null,
      rawEquivalentGrams: null,
      roundedGrams: null,
      formattedGrams: null,
      macroSnapshotsForEquivalent: null,
      isImpractical: false,
      canApply: false,
      message: `O alimento de referência não possui informação conhecida de ${criterionLabel.toLowerCase()} para cálculo de equivalência.`,
    };
  }

  if (target <= MIN_SIGNIFICANT_NUTRIENT_THRESHOLD) {
    return {
      status: "REFERENCE_NUTRIENT_ZERO",
      criterion: normalizedCriterion,
      criterionLabel,
      criterionUnit,
      targetNutrientValue: target,
      candidateNutrientValue: null,
      substituteNutrientValue: null,
      calculatedQuantity: null,
      roundedQuantity: null,
      unitCode: candCanon.unitCode,
      formattedQuantity: null,
      rawEquivalentGrams: null,
      roundedGrams: null,
      formattedGrams: null,
      macroSnapshotsForEquivalent: null,
      isImpractical: false,
      canApply: false,
      message: `Este alimento de referência possui ${criterionLabel.toLowerCase()} igual a zero ou insignificante (${target} ${criterionUnit}) para gerar equivalências.`,
    };
  }

  // 4. Resolve candidate nutrient value
  const candidateNutrient = getCandidateNutrientValue(candidate, normalizedCriterion);

  if (candidateNutrient === null || candidateNutrient === undefined || isNaN(candidateNutrient)) {
    return {
      status: "CANDIDATE_NUTRIENT_UNKNOWN",
      criterion: normalizedCriterion,
      criterionLabel,
      criterionUnit,
      targetNutrientValue: target,
      candidateNutrientValue: null,
      substituteNutrientValue: null,
      calculatedQuantity: null,
      roundedQuantity: null,
      unitCode: candCanon.unitCode,
      formattedQuantity: null,
      rawEquivalentGrams: null,
      roundedGrams: null,
      formattedGrams: null,
      macroSnapshotsForEquivalent: null,
      isImpractical: false,
      canApply: false,
      message: `O alimento candidato não possui quantidade conhecida de ${criterionLabel.toLowerCase()} cadastrada.`,
    };
  }

  if (candidateNutrient <= 0) {
    return {
      status: "CANDIDATE_NUTRIENT_ZERO",
      criterion: normalizedCriterion,
      criterionLabel,
      criterionUnit,
      targetNutrientValue: target,
      candidateNutrientValue: candidateNutrient,
      substituteNutrientValue: candidateNutrient,
      calculatedQuantity: null,
      roundedQuantity: null,
      unitCode: candCanon.unitCode,
      formattedQuantity: null,
      rawEquivalentGrams: null,
      roundedGrams: null,
      formattedGrams: null,
      macroSnapshotsForEquivalent: null,
      isImpractical: false,
      canApply: false,
      message: `O alimento candidato possui zero de ${criterionLabel.toLowerCase()} cadastrado. Divisão por zero prevenida: não é possível gerar uma porção finita equivalente.`,
    };
  }

  // 5. Calculate canonical equivalent quantity
  // rawQuantity = (targetNutrient * candRefAmountInBaseUnit) / candidateNutrient
  const rawQuantity = (target * candCanon.amount) / candidateNutrient;

  if (isNaN(rawQuantity) || !Number.isFinite(rawQuantity) || rawQuantity <= 0) {
    return {
      status: "INVALID_QUANTITY",
      criterion: normalizedCriterion,
      criterionLabel,
      criterionUnit,
      targetNutrientValue: target,
      candidateNutrientValue: candidateNutrient,
      substituteNutrientValue: candidateNutrient,
      calculatedQuantity: null,
      roundedQuantity: null,
      unitCode: candCanon.unitCode,
      formattedQuantity: null,
      rawEquivalentGrams: null,
      roundedGrams: null,
      formattedGrams: null,
      macroSnapshotsForEquivalent: null,
      isImpractical: false,
      canApply: false,
      message: "Não foi possível calcular a equivalência nutricional com os dados atuais.",
    };
  }

  // 6. Round quantity for presentation & persistence
  // Rule: Displayed Quantity = Saved Quantity = Snapshot Quantity
  const roundedQuantity = Math.max(1, Math.round(rawQuantity));
  const formattedQuantity = `${roundedQuantity} ${candCanon.unitCode.toLowerCase()}`;

  // 7. Impractical threshold check (> 2000 g or > 2000 ml)
  const isImpractical = roundedQuantity > IMPRACTICAL_GRAMS_THRESHOLD;

  // 8. Calculate resultant macro snapshots based strictly on roundedQuantity
  const macroFactor = roundedQuantity / candCanon.amount;

  const macroSnapshotsForEquivalent: MacroSnapshots = {
    caloriesKcal:
      candidate.caloriesKcal != null
        ? roundMacro(candidate.caloriesKcal * macroFactor)
        : null,
    proteinG:
      candidate.proteinG != null
        ? roundMacro(candidate.proteinG * macroFactor)
        : null,
    carbohydrateG:
      candidate.carbohydrateG != null
        ? roundMacro(candidate.carbohydrateG * macroFactor)
        : null,
    fatG:
      candidate.fatG != null
        ? roundMacro(candidate.fatG * macroFactor)
        : null,
  };

  // 9. Tolerance and Difference Metrics
  let candidateCalculatedNutrient = 0;
  if (normalizedCriterion === "CALORIES") {
    candidateCalculatedNutrient = macroSnapshotsForEquivalent.caloriesKcal ?? 0;
  } else if (normalizedCriterion === "PROTEIN") {
    candidateCalculatedNutrient = macroSnapshotsForEquivalent.proteinG ?? 0;
  } else if (normalizedCriterion === "CARBOHYDRATE") {
    candidateCalculatedNutrient = macroSnapshotsForEquivalent.carbohydrateG ?? 0;
  } else if (normalizedCriterion === "FAT") {
    candidateCalculatedNutrient = macroSnapshotsForEquivalent.fatG ?? 0;
  }

  const roundedTarget = roundMacro(target) ?? target;
  const absoluteDifference = roundMacro(Math.abs(candidateCalculatedNutrient - roundedTarget)) ?? 0;
  const percentageDifference =
    roundedTarget > 0
      ? Math.round(((candidateCalculatedNutrient - roundedTarget) / roundedTarget) * 1000) / 10
      : 0;

  const differenceMetrics: DifferenceMetrics = {
    targetValue: roundedTarget,
    candidateCalculatedValue: candidateCalculatedNutrient,
    absoluteDifference,
    percentageDifference,
  };

  // 10. Food-specific portion suggestion
  const portionSuggestion = findBestPortionSuggestion(
    roundedQuantity,
    candCanon.unitCode,
    candidate.portions
  );

  if (isImpractical) {
    return {
      status: "IMPRACTICAL",
      criterion: normalizedCriterion,
      criterionLabel,
      criterionUnit,
      targetNutrientValue: roundedTarget,
      candidateNutrientValue: candidateNutrient,
      substituteNutrientValue: candidateNutrient,
      calculatedQuantity: rawQuantity,
      roundedQuantity,
      unitCode: candCanon.unitCode,
      formattedQuantity,
      rawEquivalentGrams: candCanon.dimension === "MASS" ? rawQuantity : null,
      roundedGrams: candCanon.dimension === "MASS" ? roundedQuantity : null,
      formattedGrams: candCanon.dimension === "MASS" ? formattedQuantity : null,
      macroSnapshotsForEquivalent,
      portionSuggestion,
      differenceMetrics,
      isImpractical: true,
      canApply: false,
      message: `Quantidade pouco prática (${formattedQuantity}). Não recomendada para substituição direta.`,
    };
  }

  return {
    status: "READY",
    criterion: normalizedCriterion,
    criterionLabel,
    criterionUnit,
    targetNutrientValue: roundedTarget,
    candidateNutrientValue: candidateNutrient,
    substituteNutrientValue: candidateNutrient,
    calculatedQuantity: rawQuantity,
    roundedQuantity,
    unitCode: candCanon.unitCode,
    formattedQuantity,
    rawEquivalentGrams: candCanon.dimension === "MASS" ? rawQuantity : null,
    roundedGrams: candCanon.dimension === "MASS" ? roundedQuantity : null,
    formattedGrams: candCanon.dimension === "MASS" ? formattedQuantity : null,
    macroSnapshotsForEquivalent,
    portionSuggestion,
    differenceMetrics,
    isImpractical: false,
    canApply: true,
  };
}
