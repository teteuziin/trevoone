/**
 * TREVO ONE — NUTRITION V2 EQUIVALENTS MODULE
 * Pure, side-effect-free module for calculating nutritional equivalence
 * based on a single selected macro/energy criterion.
 *
 * All functions are strictly deterministic with no DB, React, or Server Action dependencies.
 */

// ============================================================================
// TYPES
// ============================================================================

export type EquivalentCriterion = "ENERGY" | "PROTEIN" | "CARBS" | "FAT";

export const ALL_EQUIVALENT_CRITERIA: readonly EquivalentCriterion[] = [
  "ENERGY",
  "PROTEIN",
  "CARBS",
  "FAT",
] as const;

export const EQUIVALENT_CRITERIA_LABELS: Record<EquivalentCriterion, string> = {
  ENERGY: "Energia (Calorias)",
  PROTEIN: "Proteína",
  CARBS: "Carboidratos",
  FAT: "Gordura",
};

export const EQUIVALENT_CRITERIA_SHORT_LABELS: Record<EquivalentCriterion, string> = {
  ENERGY: "Calorias",
  PROTEIN: "Proteína",
  CARBS: "Carboidratos",
  FAT: "Gorduras",
};

export const EQUIVALENT_CRITERIA_UNITS: Record<EquivalentCriterion, string> = {
  ENERGY: "kcal",
  PROTEIN: "g",
  CARBS: "g",
  FAT: "g",
};

export type EquivalentResultStatus =
  | "READY"
  | "MISSING_DATA"
  | "NOT_APPLICABLE"
  | "INVALID_REFERENCE"
  | "IMPRACTICAL";

export interface ReferenceFoodPrescription {
  name: string;
  prescribedQuantity: number | null;
  prescribedUnitCode: string | null;
  prescribedUnitLabel: string | null;
  caloriesKcalSnapshot: number | null;
  proteinGSnapshot: number | null;
  carbohydrateGSnapshot: number | null;
  fatGSnapshot: number | null;
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
}

export interface MacroSnapshots {
  caloriesKcal: number | null;
  proteinG: number | null;
  carbohydrateG: number | null;
  fatG: number | null;
}

export interface EquivalentCalculationResult {
  status: EquivalentResultStatus;
  criterion: EquivalentCriterion;
  criterionLabel: string;
  targetNutrientValue: number | null;
  substituteNutrientValue: number | null;
  rawEquivalentGrams: number | null;
  roundedGrams: number | null;
  formattedGrams: string | null;
  macroSnapshotsForEquivalent: MacroSnapshots | null;
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

  // Incompatible or unknown conversion - no guessing!
  return null;
}

/**
 * Validates that reference unit is compatible with mass (G or KG)
 * and returns reference amount converted to grams.
 * Does NOT guess or convert volume (ML/L) to mass without reliable conversion.
 */
export function convertRefAmountToGrams(
  refAmount: number,
  refUnit: string
): number | null {
  if (!refAmount || refAmount <= 0 || !refUnit) return null;

  const normalized = refUnit.trim().toUpperCase();
  if (normalized === "G") {
    return refAmount;
  }
  if (normalized === "KG") {
    return refAmount * 1000;
  }

  // Not directly convertible to grams without density assumption
  return null;
}

/**
 * Extracts target nutrient value from the prescribed item's existing snapshots.
 * Uses snapshots directly without re-fetching or recalculating from DB.
 */
export function getTargetNutrientValue(
  reference: ReferenceFoodPrescription,
  criterion: EquivalentCriterion
): number | null {
  switch (criterion) {
    case "ENERGY":
      return reference.caloriesKcalSnapshot != null ? Number(reference.caloriesKcalSnapshot) : null;
    case "PROTEIN":
      return reference.proteinGSnapshot != null ? Number(reference.proteinGSnapshot) : null;
    case "CARBS":
      return reference.carbohydrateGSnapshot != null ? Number(reference.carbohydrateGSnapshot) : null;
    case "FAT":
      return reference.fatGSnapshot != null ? Number(reference.fatGSnapshot) : null;
    default:
      return null;
  }
}

/**
 * Extracts candidate nutrient value from the food's reference composition.
 */
export function getCandidateNutrientValue(
  candidate: CandidateFoodItem,
  criterion: EquivalentCriterion
): number | null {
  switch (criterion) {
    case "ENERGY":
      return candidate.caloriesKcal != null ? Number(candidate.caloriesKcal) : null;
    case "PROTEIN":
      return candidate.proteinG != null ? Number(candidate.proteinG) : null;
    case "CARBS":
      return candidate.carbohydrateG != null ? Number(candidate.carbohydrateG) : null;
    case "FAT":
      return candidate.fatG != null ? Number(candidate.fatG) : null;
    default:
      return null;
  }
}

/**
 * Calculates nutritional equivalence of a candidate food relative to a prescribed food.
 *
 * Formula:
 * equivalentAmount = targetNutrient * referenceAmountInGrams / substituteNutrient
 *
 * Key guarantees:
 * - Dynamic referenceAmount (never hardcoded to 100g).
 * - Safe mass validation (no arbitrary ML to G conversions).
 * - Division-by-zero protection.
 * - Near-zero target protection.
 * - Impractical threshold (> 2000g) detection and non-persistable gating.
 * - Displayed quantity = Saved quantity = Snapshot quantity (exact alignment).
 */
export function calculateNutrientEquivalence(
  reference: ReferenceFoodPrescription,
  candidate: CandidateFoodItem,
  criterion: EquivalentCriterion
): EquivalentCalculationResult {
  const criterionLabel = EQUIVALENT_CRITERIA_LABELS[criterion];

  // 1. Check mass compatibility of substitute food
  const refGrams = convertRefAmountToGrams(
    candidate.referenceAmount,
    candidate.referenceUnitCode
  );

  if (refGrams == null) {
    return {
      status: "NOT_APPLICABLE",
      criterion,
      criterionLabel,
      targetNutrientValue: null,
      substituteNutrientValue: null,
      rawEquivalentGrams: null,
      roundedGrams: null,
      formattedGrams: null,
      macroSnapshotsForEquivalent: null,
      isImpractical: false,
      canApply: false,
      message: "Conversão para gramas indisponível para este alimento.",
    };
  }

  // 2. Check target nutrient from reference food's snapshots
  const target = getTargetNutrientValue(reference, criterion);

  if (target == null || isNaN(target) || target <= MIN_SIGNIFICANT_NUTRIENT_THRESHOLD) {
    return {
      status: "NOT_APPLICABLE",
      criterion,
      criterionLabel,
      targetNutrientValue: target,
      substituteNutrientValue: null,
      rawEquivalentGrams: null,
      roundedGrams: null,
      formattedGrams: null,
      macroSnapshotsForEquivalent: null,
      isImpractical: false,
      canApply: false,
      message: `Este alimento não possui quantidade significativa de ${criterionLabel.toLowerCase()} para gerar equivalências.`,
    };
  }

  // 3. Check candidate food's nutrient value
  const substituteNutrient = getCandidateNutrientValue(candidate, criterion);

  if (
    substituteNutrient == null ||
    isNaN(substituteNutrient) ||
    substituteNutrient <= 0
  ) {
    return {
      status: "MISSING_DATA",
      criterion,
      criterionLabel,
      targetNutrientValue: target,
      substituteNutrientValue: substituteNutrient,
      rawEquivalentGrams: null,
      roundedGrams: null,
      formattedGrams: null,
      macroSnapshotsForEquivalent: null,
      isImpractical: false,
      canApply: false,
      message: `O alimento substituto não possui quantidade significativa de ${criterionLabel.toLowerCase()} cadastrada.`,
    };
  }

  // 4. Calculate equivalent grams using generic formula
  // equivalentAmount = target * referenceAmount / substituteNutrient
  const rawGrams = (target * refGrams) / substituteNutrient;

  if (isNaN(rawGrams) || !isFinite(rawGrams) || rawGrams <= 0) {
    return {
      status: "INVALID_REFERENCE",
      criterion,
      criterionLabel,
      targetNutrientValue: target,
      substituteNutrientValue: substituteNutrient,
      rawEquivalentGrams: null,
      roundedGrams: null,
      formattedGrams: null,
      macroSnapshotsForEquivalent: null,
      isImpractical: false,
      canApply: false,
      message: "Não foi possível calcular a equivalência nutricional com os dados atuais.",
    };
  }

  // 5. Compute rounded integer for UI and persistence
  // Rule: Displayed Quantity = Saved Quantity = Snapshot Quantity
  const roundedGrams = Math.max(1, Math.round(rawGrams));
  const formattedGrams = `${roundedGrams} g`;

  // 6. Check impractical threshold (> 2000 g)
  const isImpractical = roundedGrams > IMPRACTICAL_GRAMS_THRESHOLD;

  // 7. Calculate resultant macro snapshots based strictly on roundedGrams
  // factor = roundedGrams / refGrams
  const macroFactor = roundedGrams / refGrams;

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

  if (isImpractical) {
    return {
      status: "IMPRACTICAL",
      criterion,
      criterionLabel,
      targetNutrientValue: target,
      substituteNutrientValue: substituteNutrient,
      rawEquivalentGrams: rawGrams,
      roundedGrams,
      formattedGrams,
      macroSnapshotsForEquivalent,
      isImpractical: true,
      canApply: false,
      message: `Quantidade pouco prática (${formattedGrams}). Não recomendada para substituição.`,
    };
  }

  return {
    status: "READY",
    criterion,
    criterionLabel,
    targetNutrientValue: target,
    substituteNutrientValue: substituteNutrient,
    rawEquivalentGrams: rawGrams,
    roundedGrams,
    formattedGrams,
    macroSnapshotsForEquivalent,
    isImpractical: false,
    canApply: true,
  };
}
