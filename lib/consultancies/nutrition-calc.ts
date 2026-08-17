/**
 * Funções puras e determinísticas para cálculo nutricional.
 * Seguro para uso em Server Components, Client Components e Server Actions.
 */

export type MacroCalculationInput = {
  referenceAmount: number;
  caloriesKcal: number;
  proteinG: number;
  carbohydrateG: number;
  fatG: number;
  portionEquivalentAmount?: number | null;
  prescribedQuantity: number;
};

export type CalculatedMacros = {
  totalReferenceAmountUsed: number;
  calculatedCalories: number;
  calculatedProtein: number;
  calculatedCarbohydrate: number;
  calculatedFat: number;
};

/**
 * Calcula macros proporcionais de forma determinística e segura contra NaN, Infinity e valores negativos.
 */
export function calculateItemMacros(input: MacroCalculationInput): CalculatedMacros {
  const refAmount = Number(input.referenceAmount);
  const qty = Number(input.prescribedQuantity);

  if (!Number.isFinite(refAmount) || refAmount <= 0 || !Number.isFinite(qty) || qty <= 0) {
    return {
      totalReferenceAmountUsed: 0,
      calculatedCalories: 0,
      calculatedProtein: 0,
      calculatedCarbohydrate: 0,
      calculatedFat: 0,
    };
  }

  const portionEq = input.portionEquivalentAmount ? Number(input.portionEquivalentAmount) : null;
  const totalRefUsed = portionEq && Number.isFinite(portionEq) && portionEq > 0
    ? qty * portionEq
    : qty;

  const ratio = totalRefUsed / refAmount;

  const round2 = (v: number): number => {
    if (!Number.isFinite(v) || v < 0) return 0;
    return Math.round(v * 100) / 100;
  };

  return {
    totalReferenceAmountUsed: round2(totalRefUsed),
    calculatedCalories: round2(Number(input.caloriesKcal || 0) * ratio),
    calculatedProtein: round2(Number(input.proteinG || 0) * ratio),
    calculatedCarbohydrate: round2(Number(input.carbohydrateG || 0) * ratio),
    calculatedFat: round2(Number(input.fatG || 0) * ratio),
  };
}
