/**
 * Utilitários puros e determinísticos para agregação e cálculo de totais nutricionais.
 *
 * Regras semânticas fundamentais:
 * - Food Item: valor calculado exato (min = max).
 * - Choice Group: envelope de alternativas entre Food Items (min/max independente por nutriente).
 * - Section: soma aditiva de Choice Groups componentes.
 * - Meal Option: soma aditiva de Sections componentes.
 * - Meal: envelope de alternativas entre Meal Options (min/max independente por nutriente). NUNCA somar opções.
 * - Plan / Dia: soma aditiva de Meals ao longo do dia.
 * - Estruturas vazias ou incompletas: retornam null (unavailable), nunca falso zero numérico.
 */

export type NutritionMacroValues = {
  calories: number;
  protein: number;
  carbohydrate: number;
  fat: number;
};

export type NutritionMacroRange = {
  min: NutritionMacroValues;
  max: NutritionMacroValues;
  isExact: {
    calories: boolean;
    protein: boolean;
    carbohydrate: boolean;
    fat: boolean;
    all: boolean;
  };
};

export type ItemLike = {
  calculatedCalories?: number | null;
  calculatedProtein?: number | null;
  calculatedCarbohydrate?: number | null;
  calculatedFat?: number | null;
};

export type ChoiceGroupLike = {
  items?: ItemLike[] | null;
};

export type SectionLike = {
  choiceGroups?: ChoiceGroupLike[] | null;
};

export type MealOptionLike = {
  sections?: SectionLike[] | null;
};

export type MealLike = {
  options?: MealOptionLike[] | null;
};

export type PlanLike = {
  meals?: MealLike[] | null;
};

/**
 * Arredonda um número para 2 casas decimais de forma determinística evitando drift binário.
 */
export function round2Decimals(value: number): number {
  if (!Number.isFinite(value) || Number.isNaN(value) || value < 0) {
    return 0;
  }
  return Math.round(value * 100) / 100;
}

/**
 * Constrói o objeto NutritionMacroRange a partir de valores min e max calculados.
 */
function buildRange(min: NutritionMacroValues, max: NutritionMacroValues): NutritionMacroRange {
  const isExactCalories = min.calories === max.calories;
  const isExactProtein = min.protein === max.protein;
  const isExactCarb = min.carbohydrate === max.carbohydrate;
  const isExactFat = min.fat === max.fat;

  return {
    min: {
      calories: round2Decimals(min.calories),
      protein: round2Decimals(min.protein),
      carbohydrate: round2Decimals(min.carbohydrate),
      fat: round2Decimals(min.fat),
    },
    max: {
      calories: round2Decimals(max.calories),
      protein: round2Decimals(max.protein),
      carbohydrate: round2Decimals(max.carbohydrate),
      fat: round2Decimals(max.fat),
    },
    isExact: {
      calories: isExactCalories,
      protein: isExactProtein,
      carbohydrate: isExactCarb,
      fat: isExactFat,
      all: isExactCalories && isExactProtein && isExactCarb && isExactFat,
    },
  };
}

/**
 * Agrega totais de um Choice Group.
 * Se contiver 1 item: valor exato.
 * Se contiver 2+ itens: envelope min/max independente por nutriente entre alternativas.
 * Se vazio: retorna null (unavailable).
 */
export function calculateChoiceGroupTotals(group: ChoiceGroupLike): NutritionMacroRange | null {
  if (!group || !Array.isArray(group.items) || group.items.length === 0) {
    return null;
  }

  const validItems: NutritionMacroValues[] = [];

  for (const item of group.items) {
    if (
      item.calculatedCalories === null ||
      item.calculatedCalories === undefined ||
      !Number.isFinite(Number(item.calculatedCalories)) ||
      Number(item.calculatedCalories) < 0 ||
      item.calculatedProtein === null ||
      item.calculatedProtein === undefined ||
      !Number.isFinite(Number(item.calculatedProtein)) ||
      Number(item.calculatedProtein) < 0 ||
      item.calculatedCarbohydrate === null ||
      item.calculatedCarbohydrate === undefined ||
      !Number.isFinite(Number(item.calculatedCarbohydrate)) ||
      Number(item.calculatedCarbohydrate) < 0 ||
      item.calculatedFat === null ||
      item.calculatedFat === undefined ||
      !Number.isFinite(Number(item.calculatedFat)) ||
      Number(item.calculatedFat) < 0
    ) {
      // Item com snapshot incompleto/inválido
      return null;
    }

    validItems.push({
      calories: round2Decimals(Number(item.calculatedCalories)),
      protein: round2Decimals(Number(item.calculatedProtein)),
      carbohydrate: round2Decimals(Number(item.calculatedCarbohydrate)),
      fat: round2Decimals(Number(item.calculatedFat)),
    });
  }

  if (validItems.length === 0) {
    return null;
  }

  const calories = validItems.map((i) => i.calories);
  const protein = validItems.map((i) => i.protein);
  const carbohydrate = validItems.map((i) => i.carbohydrate);
  const fat = validItems.map((i) => i.fat);

  const min: NutritionMacroValues = {
    calories: Math.min(...calories),
    protein: Math.min(...protein),
    carbohydrate: Math.min(...carbohydrate),
    fat: Math.min(...fat),
  };

  const max: NutritionMacroValues = {
    calories: Math.max(...calories),
    protein: Math.max(...protein),
    carbohydrate: Math.max(...carbohydrate),
    fat: Math.max(...fat),
  };

  return buildRange(min, max);
}

/**
 * Agrega totais de uma Section (soma aditiva dos Choice Groups componentes).
 */
export function calculateSectionTotals(section: SectionLike): NutritionMacroRange | null {
  if (!section || !Array.isArray(section.choiceGroups) || section.choiceGroups.length === 0) {
    return null;
  }

  let minCaloriesCents = 0;
  let maxCaloriesCents = 0;
  let minProteinCents = 0;
  let maxProteinCents = 0;
  let minCarbCents = 0;
  let maxCarbCents = 0;
  let minFatCents = 0;
  let maxFatCents = 0;

  for (const group of section.choiceGroups) {
    const groupTotals = calculateChoiceGroupTotals(group);
    if (!groupTotals) {
      return null;
    }

    minCaloriesCents += Math.round(groupTotals.min.calories * 100);
    maxCaloriesCents += Math.round(groupTotals.max.calories * 100);

    minProteinCents += Math.round(groupTotals.min.protein * 100);
    maxProteinCents += Math.round(groupTotals.max.protein * 100);

    minCarbCents += Math.round(groupTotals.min.carbohydrate * 100);
    maxCarbCents += Math.round(groupTotals.max.carbohydrate * 100);

    minFatCents += Math.round(groupTotals.min.fat * 100);
    maxFatCents += Math.round(groupTotals.max.fat * 100);
  }

  const min: NutritionMacroValues = {
    calories: minCaloriesCents / 100,
    protein: minProteinCents / 100,
    carbohydrate: minCarbCents / 100,
    fat: minFatCents / 100,
  };

  const max: NutritionMacroValues = {
    calories: maxCaloriesCents / 100,
    protein: maxProteinCents / 100,
    carbohydrate: maxCarbCents / 100,
    fat: maxFatCents / 100,
  };

  return buildRange(min, max);
}

/**
 * Agrega totais de uma Meal Option (soma aditiva das Sections componentes).
 */
export function calculateMealOptionTotals(option: MealOptionLike): NutritionMacroRange | null {
  if (!option || !Array.isArray(option.sections) || option.sections.length === 0) {
    return null;
  }

  let minCaloriesCents = 0;
  let maxCaloriesCents = 0;
  let minProteinCents = 0;
  let maxProteinCents = 0;
  let minCarbCents = 0;
  let maxCarbCents = 0;
  let minFatCents = 0;
  let maxFatCents = 0;

  for (const section of option.sections) {
    const sectionTotals = calculateSectionTotals(section);
    if (!sectionTotals) {
      return null;
    }

    minCaloriesCents += Math.round(sectionTotals.min.calories * 100);
    maxCaloriesCents += Math.round(sectionTotals.max.calories * 100);

    minProteinCents += Math.round(sectionTotals.min.protein * 100);
    maxProteinCents += Math.round(sectionTotals.max.protein * 100);

    minCarbCents += Math.round(sectionTotals.min.carbohydrate * 100);
    maxCarbCents += Math.round(sectionTotals.max.carbohydrate * 100);

    minFatCents += Math.round(sectionTotals.min.fat * 100);
    maxFatCents += Math.round(sectionTotals.max.fat * 100);
  }

  const min: NutritionMacroValues = {
    calories: minCaloriesCents / 100,
    protein: minProteinCents / 100,
    carbohydrate: minCarbCents / 100,
    fat: minFatCents / 100,
  };

  const max: NutritionMacroValues = {
    calories: maxCaloriesCents / 100,
    protein: maxProteinCents / 100,
    carbohydrate: maxCarbCents / 100,
    fat: maxFatCents / 100,
  };

  return buildRange(min, max);
}

/**
 * Agrega totais de uma Meal.
 * As Meal Options são ALTERNATIVAS completas.
 * NUNCA somar opções entre si.
 * Calcula o envelope min/max independente por nutriente entre as opções disponíveis.
 */
export function calculateMealTotals(meal: MealLike): NutritionMacroRange | null {
  if (!meal || !Array.isArray(meal.options) || meal.options.length === 0) {
    return null;
  }

  const optionTotalsList: NutritionMacroRange[] = [];

  for (const option of meal.options) {
    const optTotals = calculateMealOptionTotals(option);
    if (!optTotals) {
      return null;
    }
    optionTotalsList.push(optTotals);
  }

  if (optionTotalsList.length === 0) {
    return null;
  }

  const minCalories = Math.min(...optionTotalsList.map((o) => o.min.calories));
  const maxCalories = Math.max(...optionTotalsList.map((o) => o.max.calories));

  const minProtein = Math.min(...optionTotalsList.map((o) => o.min.protein));
  const maxProtein = Math.max(...optionTotalsList.map((o) => o.max.protein));

  const minCarb = Math.min(...optionTotalsList.map((o) => o.min.carbohydrate));
  const maxCarb = Math.max(...optionTotalsList.map((o) => o.max.carbohydrate));

  const minFat = Math.min(...optionTotalsList.map((o) => o.min.fat));
  const maxFat = Math.max(...optionTotalsList.map((o) => o.max.fat));

  const min: NutritionMacroValues = {
    calories: minCalories,
    protein: minProtein,
    carbohydrate: minCarb,
    fat: minFat,
  };

  const max: NutritionMacroValues = {
    calories: maxCalories,
    protein: maxProtein,
    carbohydrate: maxCarb,
    fat: maxFat,
  };

  return buildRange(min, max);
}

/**
 * Agrega totais diários de um Plano Nutricional (soma aditiva das Meals do dia).
 */
export function calculatePlanTotals(plan: PlanLike): NutritionMacroRange | null {
  if (!plan || !Array.isArray(plan.meals) || plan.meals.length === 0) {
    return null;
  }

  let minCaloriesCents = 0;
  let maxCaloriesCents = 0;
  let minProteinCents = 0;
  let maxProteinCents = 0;
  let minCarbCents = 0;
  let maxCarbCents = 0;
  let minFatCents = 0;
  let maxFatCents = 0;

  for (const meal of plan.meals) {
    const mealTotals = calculateMealTotals(meal);
    if (!mealTotals) {
      return null;
    }

    minCaloriesCents += Math.round(mealTotals.min.calories * 100);
    maxCaloriesCents += Math.round(mealTotals.max.calories * 100);

    minProteinCents += Math.round(mealTotals.min.protein * 100);
    maxProteinCents += Math.round(mealTotals.max.protein * 100);

    minCarbCents += Math.round(mealTotals.min.carbohydrate * 100);
    maxCarbCents += Math.round(mealTotals.max.carbohydrate * 100);

    minFatCents += Math.round(mealTotals.min.fat * 100);
    maxFatCents += Math.round(mealTotals.max.fat * 100);
  }

  const min: NutritionMacroValues = {
    calories: minCaloriesCents / 100,
    protein: minProteinCents / 100,
    carbohydrate: minCarbCents / 100,
    fat: minFatCents / 100,
  };

  const max: NutritionMacroValues = {
    calories: maxCaloriesCents / 100,
    protein: maxProteinCents / 100,
    carbohydrate: maxCarbCents / 100,
    fat: maxFatCents / 100,
  };

  return buildRange(min, max);
}

// ============================================================================
// FORMATTING HELPERS (pt-BR)
// ============================================================================

const numberFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
});

/**
 * Formata um valor numérico para pt-BR (ex: 1500 -> "1.500", 25.5 -> "25,5").
 */
export function formatMacroValue(val: number): string {
  if (!Number.isFinite(val) || Number.isNaN(val)) {
    return "0";
  }
  return numberFormatter.format(val);
}

/**
 * Formata uma faixa de valores. Se min === max, retorna apenas um valor.
 * Ex: (100, 100, "kcal") -> "100 kcal"
 * Ex: (100, 120, "kcal") -> "100–120 kcal"
 */
export function formatMacroRange(min: number, max: number, unit?: string): string {
  const formattedMin = formatMacroValue(min);
  const formattedMax = formatMacroValue(max);
  const suffix = unit ? ` ${unit}` : "";

  if (min === max) {
    return `${formattedMin}${suffix}`;
  }

  return `${formattedMin}–${formattedMax}${suffix}`;
}
