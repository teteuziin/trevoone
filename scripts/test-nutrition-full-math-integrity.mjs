import assert from "node:assert";
import { register } from "node:module";

register("./ts-loader.mjs", import.meta.url);

const {
  calculateItemNutrients,
  calculateMealTotals,
  calculatePlanTotals,
  calculateDailySummary,
  resolveItemEffectiveMacros,
  scaleItemSnapshots,
  isUncookedStapleFood,
  suggestCookedEquivalentTerm,
  isPureProteinFood,
} = await import("../lib/nutrition-v2/nutrient-calculator.ts");

const {
  USER_SEARCH_ALIASES,
  buildFoodSearchOrderClause,
} = await import("../lib/nutrition-v2/food-query-builder.ts");

console.log("=== TREVO ONE NUTRITION V2 — FULL MATHEMATICAL INTEGRITY SUITE ===\n");

// ---------------------------------------------------------------------------
// 1. REFEIÇÃO COM ITENS SANITIZADOS: SOMA DAS LINHAS === MEAL TOTAL
// ---------------------------------------------------------------------------
console.log("[Test 1] Meal Subtotal === Exact Sum of Resolved Item Lines");

// Item 1: 4 Ovos de galinha cozidos (sanitized to 50g per egg, TACO: 146 kcal / 100g -> 292 kcal, 26.6g P, 1.2g C, 19g G)
const rawEggItem = {
  id: 1,
  publicId: "item-egg",
  foodNameSnapshot: "Ovo inteiro cozido ou mexido",
  prescribedQuantity: 4,
  prescribedUnitCode: "PORCAO",
  prescribedUnitLabel: "Unidade",
  portionEquivalentAmount: 50,
  caloriesKcalSnapshot: 1232, // corrupted in legacy DB row
  proteinGSnapshot: 192,
  carbohydrateGSnapshot: 4.8,
  fatGSnapshot: 80,
  substitutions: [
    {
      publicId: "sub-egg-1",
      foodNameSnapshot: "Clara de ovo",
      prescribedQuantity: 6,
      caloriesKcalSnapshot: 102,
      proteinGSnapshot: 21.6,
      carbohydrateGSnapshot: 0,
      fatGSnapshot: 0,
      equivalenceCriterion: "PROTEIN",
    },
  ],
};

// Item 2: 150g Carne Moída (Patinho) - pure protein, null carbs in legacy data
const rawMeatItem = {
  id: 2,
  publicId: "item-meat",
  foodNameSnapshot: "Carne bovina moída refogada",
  prescribedQuantity: 150,
  prescribedUnitCode: "G",
  prescribedUnitLabel: "Gramas (g)",
  caloriesKcalSnapshot: 328.5,
  proteinGSnapshot: 48,
  carbohydrateGSnapshot: null, // should resolve to 0g
  fatGSnapshot: 15,
  substitutions: [
    {
      publicId: "sub-meat-1",
      foodNameSnapshot: "Frango desfiado",
      prescribedQuantity: 150,
      caloriesKcalSnapshot: 240,
      proteinGSnapshot: 45,
      carbohydrateGSnapshot: 0,
      fatGSnapshot: 6,
    },
  ],
};

// Item 3: 2 fatias de Pão de Forma (50g, 133 kcal, 3.8g P, 25.3g C, 1.7g G)
const breadItem = {
  id: 3,
  publicId: "item-bread",
  foodNameSnapshot: "Pão de forma tradicional",
  prescribedQuantity: 2,
  prescribedUnitCode: "PORCAO",
  prescribedUnitLabel: "Fatia",
  portionEquivalentAmount: 25,
  caloriesKcalSnapshot: 133,
  proteinGSnapshot: 3.8,
  carbohydrateGSnapshot: 25.3,
  fatGSnapshot: 1.7,
  substitutions: [],
};

const eggResolved = resolveItemEffectiveMacros(rawEggItem);
assert.strictEqual(eggResolved.calories, 292, "Egg 4 units calories must resolve to 292 kcal");
assert.strictEqual(eggResolved.protein, 26.6, "Egg 4 units protein must resolve to 26.6g");

const meatResolved = resolveItemEffectiveMacros(rawMeatItem);
assert.strictEqual(meatResolved.carbohydrate, 0, "Pure meat null carbs must resolve to 0g");

const breadResolved = resolveItemEffectiveMacros(breadItem);

// Sum of item lines:
const expectedMealKcal = Math.round((eggResolved.calories + meatResolved.calories + breadResolved.calories) * 100) / 100;
const expectedMealProt = Math.round((eggResolved.protein + meatResolved.protein + breadResolved.protein) * 100) / 100;
const expectedMealCarb = Math.round((eggResolved.carbohydrate + meatResolved.carbohydrate + breadResolved.carbohydrate) * 100) / 100;
const expectedMealFat = Math.round((eggResolved.fat + meatResolved.fat + breadResolved.fat) * 100) / 100;

const mealTotals = calculateMealTotals([rawEggItem, rawMeatItem, breadItem]);

assert.strictEqual(mealTotals.caloriesKcal, expectedMealKcal, "Meal calories must exactly match sum of item lines");
assert.strictEqual(mealTotals.proteinG, expectedMealProt, "Meal protein must exactly match sum of item lines");
assert.strictEqual(mealTotals.carbohydrateG, expectedMealCarb, "Meal carbs must exactly match sum of item lines");
assert.strictEqual(mealTotals.fatG, expectedMealFat, "Meal fat must exactly match sum of item lines");
assert.strictEqual(mealTotals.missingCarbohydrateCount, 0, "No missing carb count after pure meat resolution");
assert.strictEqual(mealTotals.status, "COMPLETE", "Meal status must be COMPLETE");
console.log(`  ✓ Meal subtotal (${mealTotals.caloriesKcal} kcal) exactly matches sum of 3 item lines (${expectedMealKcal} kcal)`);
console.log(`  ✓ Macros match: P ${mealTotals.proteinG}g, C ${mealTotals.carbohydrateG}g, G ${mealTotals.fatG}g`);

// ---------------------------------------------------------------------------
// 2. EXCLUSÃO ESTRITA DE SUBSTITUIÇÕES E EQUIVALENTES DA SOMA
// ---------------------------------------------------------------------------
console.log("\n[Test 2] Substitutions & Equivalents Excluded from Sum");

// The substitutions had 102 kcal (egg sub) and 240 kcal (meat sub) = +342 kcal if accidentally summed
assert.ok(
  mealTotals.caloriesKcal < 1000,
  "Substitutions must NEVER inflate meal total"
);
assert.strictEqual(mealTotals.totalItemsCount, 3, "Only primary items counted (3 items, not 5)");
console.log("  ✓ Substitutions inside items are strictly ignored by calculateMealTotals");

// ---------------------------------------------------------------------------
// 3. SOMA DAS REFEIÇÕES === RESUMO DIÁRIO
// ---------------------------------------------------------------------------
console.log("\n[Test 3] Daily Summary === Sum of Meal Subtotals");

// Meal 2 (Almoço)
const lunchMeal = {
  publicId: "meal-lunch",
  title: "Almoço",
  scheduledTime: "12:30",
  items: [
    {
      foodNameSnapshot: "Arroz, tipo 1, cozido",
      prescribedQuantity: 150,
      prescribedUnitCode: "G",
      caloriesKcalSnapshot: 192,
      proteinGSnapshot: 3.8,
      carbohydrateGSnapshot: 42.2,
      fatGSnapshot: 0.3,
    },
    {
      foodNameSnapshot: "Feijão, carioca, cozido",
      prescribedQuantity: 100,
      prescribedUnitCode: "G",
      caloriesKcalSnapshot: 76,
      proteinGSnapshot: 4.8,
      carbohydrateGSnapshot: 13.6,
      fatGSnapshot: 0.5,
    },
    {
      foodNameSnapshot: "Peito de frango grelhado",
      prescribedQuantity: 150,
      prescribedUnitCode: "G",
      caloriesKcalSnapshot: 238.5,
      proteinGSnapshot: 48,
      carbohydrateGSnapshot: null, // pure protein -> 0g
      fatGSnapshot: 3.8,
    },
  ],
};

const breakfastMeal = {
  publicId: "meal-breakfast",
  title: "Café da Manhã",
  scheduledTime: "07:00",
  items: [rawEggItem, rawMeatItem, breadItem],
  mealTotals,
};

const lunchTotals = calculateMealTotals(lunchMeal.items);
lunchMeal.mealTotals = lunchTotals;

const dailySummary = calculateDailySummary({
  meals: [breakfastMeal, lunchMeal],
  planningTarget: null,
});

const expectedDailyKcal = Math.round((mealTotals.caloriesKcal + lunchTotals.caloriesKcal) * 100) / 100;
const expectedDailyProt = Math.round((mealTotals.proteinG + lunchTotals.proteinG) * 100) / 100;
const expectedDailyCarb = Math.round((mealTotals.carbohydrateG + lunchTotals.carbohydrateG) * 100) / 100;
const expectedDailyFat = Math.round((mealTotals.fatG + lunchTotals.fatG) * 100) / 100;

assert.strictEqual(dailySummary.calories.value, expectedDailyKcal, "Daily summary calories must equal sum of meals");
assert.strictEqual(dailySummary.protein.value, expectedDailyProt, "Daily summary protein must equal sum of meals");
assert.strictEqual(dailySummary.carbohydrate.value, expectedDailyCarb, "Daily summary carbs must equal sum of meals");
assert.strictEqual(dailySummary.fat.value, expectedDailyFat, "Daily summary fat must equal sum of meals");
console.log(`  ✓ Daily calories (${dailySummary.calories.value} kcal) === Breakfast (${mealTotals.caloriesKcal}) + Lunch (${lunchTotals.caloriesKcal})`);
console.log(`  ✓ Daily macros === Sum of meals: P ${dailySummary.protein.value}g, C ${dailySummary.carbohydrate.value}g, G ${dailySummary.fat.value}g`);

// ---------------------------------------------------------------------------
// 4. CONSISTÊNCIA DE PORCENTAGEM (SOMA DAS REFEIÇÕES === EXATAMENTE 100%)
// ---------------------------------------------------------------------------
console.log("\n[Test 4] Meal Percentage Breakdown Sums to Exactly 100%");

const sumPercent = dailySummary.meals.reduce((acc, m) => acc + m.percentOfDay, 0);
assert.strictEqual(sumPercent, 100, "Sum of percentOfDay across meals must be exactly 100%");
console.log(`  ✓ Meal percentages: ${dailySummary.meals.map((m) => `${m.title}: ${m.percentOfDay}%`).join(", ")} (Total: ${sumPercent}%)`);

// Test with 3 equal meals (100 kcal each -> 33.33% each): Largest Remainder guarantees exactly 100%
const summary3Equal = calculateDailySummary({
  meals: [
    { publicId: "m1", title: "Ref 1", items: [{ caloriesKcalSnapshot: 100, proteinGSnapshot: 10, carbohydrateGSnapshot: 10, fatGSnapshot: 2 }] },
    { publicId: "m2", title: "Ref 2", items: [{ caloriesKcalSnapshot: 100, proteinGSnapshot: 10, carbohydrateGSnapshot: 10, fatGSnapshot: 2 }] },
    { publicId: "m3", title: "Ref 3", items: [{ caloriesKcalSnapshot: 100, proteinGSnapshot: 10, carbohydrateGSnapshot: 10, fatGSnapshot: 2 }] },
  ],
});
const sum3 = summary3Equal.meals.reduce((acc, m) => acc + m.percentOfDay, 0);
assert.strictEqual(sum3, 100, "3 equal meals must sum to exactly 100% (never 99%)");
console.log(`  ✓ 3 equal meals (33.33% each) sum to: ${summary3Equal.meals.map((m) => m.percentOfDay).join("% + ")}% = ${sum3}%`);

// ---------------------------------------------------------------------------
// 5. DETECÇÃO DE ALIMENTO CRU PRESCRITO EM MEDIDA DE CONSUMO
// ---------------------------------------------------------------------------
console.log("\n[Test 5] Raw Staple Food Detection");

assert.strictEqual(isUncookedStapleFood("Arroz tipo 2 cru"), true, "'Arroz tipo 2 cru' must be detected as raw staple");
assert.strictEqual(isUncookedStapleFood("Arroz, tipo 1, cru"), true, "'Arroz, tipo 1, cru' must be detected as raw staple");
assert.strictEqual(isUncookedStapleFood("Feijão carioca cru"), true, "'Feijão carioca cru' must be detected");
assert.strictEqual(isUncookedStapleFood("Macarrão espaguete cru"), true, "'Macarrão espaguete cru' must be detected");
assert.strictEqual(isUncookedStapleFood("Mandioca crua"), true, "'Mandioca crua' must be detected");
assert.strictEqual(isUncookedStapleFood("Batata doce crua"), true, "'Batata doce crua' must be detected");
assert.strictEqual(isUncookedStapleFood("Peito de frango cru"), true, "'Peito de frango cru' must be detected");
assert.strictEqual(isUncookedStapleFood("Patinho moído cru"), true, "'Patinho moído cru' must be detected");

// Foods that are normally eaten raw should NOT trigger:
assert.strictEqual(isUncookedStapleFood("Maçã fuji"), false, "Maçã should not trigger raw warning");
assert.strictEqual(isUncookedStapleFood("Banana prata"), false, "Banana should not trigger raw warning");
assert.strictEqual(isUncookedStapleFood("Alface americana"), false, "Alface should not trigger raw warning");
assert.strictEqual(isUncookedStapleFood("Tomate cru"), false, "Tomate cru should not trigger staple raw warning");
assert.strictEqual(isUncookedStapleFood("Cenoura crua"), false, "Cenoura crua should not trigger staple raw warning");
assert.strictEqual(isUncookedStapleFood("Aveia em flocos"), false, "Aveia should not trigger raw warning");
assert.strictEqual(isUncookedStapleFood("Castanha de caju"), false, "Castanha should not trigger raw warning");
console.log("  ✓ Correctly detects cereals/legumes/tubers/meats with 'cru' while ignoring fruits, salads and oats");

// ---------------------------------------------------------------------------
// 6. SUGESTÃO DE TERMO COZIDO EQUIVALENTE
// ---------------------------------------------------------------------------
console.log("\n[Test 6] Cooked Equivalent Search Term Suggestion");

assert.strictEqual(suggestCookedEquivalentTerm("Arroz tipo 2 cru"), "arroz cozido");
assert.strictEqual(suggestCookedEquivalentTerm("Feijão carioca cru"), "feijao cozido");
assert.strictEqual(suggestCookedEquivalentTerm("Peito de frango cru"), "peito de frango grelhado");
assert.strictEqual(suggestCookedEquivalentTerm("Patinho cru"), "patinho grelhado");
assert.strictEqual(suggestCookedEquivalentTerm("Patinho moído cru"), "carne moida refogada");
assert.strictEqual(suggestCookedEquivalentTerm("Mandioca crua"), "mandioca cozida");
assert.strictEqual(suggestCookedEquivalentTerm("Batata doce crua"), "batata doce cozida");
console.log("  ✓ Correctly generates targeted cooked search terms for 1-click replacement");

// ---------------------------------------------------------------------------
// 7. PRIORIZAÇÃO DE ALIMENTOS COZIDOS NA BUSCA E CHIPS RÁPIDOS
// ---------------------------------------------------------------------------
console.log("\n[Test 7] Cooked Prioritization for Staples & Quick Chips");

// User search alias for arroz / arroz branco
assert.ok(USER_SEARCH_ALIASES["arroz"].includes("arroz tipo 1 cozido"), "arroz alias includes cooked version");
assert.ok(USER_SEARCH_ALIASES["arroz branco"].includes("arroz tipo 1 cozido"), "arroz branco alias includes cooked version");

const arrozOrder = buildFoodSearchOrderClause("arroz branco", ["arroz", "branco"]);
assert.ok(
  arrozOrder.orderClause.includes("LIKE '%cozid%'") && arrozOrder.orderClause.includes("THEN 1"),
  "Search for 'arroz branco' prioritizes cooked forms (THEN 1)"
);
assert.ok(
  arrozOrder.orderClause.includes("LIKE '%cru%'") && arrozOrder.orderClause.includes("THEN 3"),
  "Search for 'arroz branco' demotes raw forms (THEN 3)"
);
console.log("  ✓ Quick chips & staple queries prioritize cooked over raw by default");

// ---------------------------------------------------------------------------
// 8. ESCALONAMENTO DE SNAPSHOTS PRESERVA MACROS EFETIVOS
// ---------------------------------------------------------------------------
console.log("\n[Test 8] scaleItemSnapshots Preserves Effective Macros");

const scaledPureMeat = scaleItemSnapshots(rawMeatItem, 300); // 150g -> 300g (2x)
assert.strictEqual(scaledPureMeat.caloriesKcalSnapshot, 657, "300g meat = 657 kcal");
assert.strictEqual(scaledPureMeat.proteinGSnapshot, 96, "300g meat = 96g protein");
assert.strictEqual(scaledPureMeat.carbohydrateGSnapshot, 0, "300g meat carbs stays 0g (never null)");
assert.strictEqual(scaledPureMeat.fatGSnapshot, 30, "300g meat = 30g fat");
console.log("  ✓ scaleItemSnapshots scales 0g carbs for pure meat without resetting to null");

console.log("\nALL TESTS IN SUITE PASSED SUCCESSFULLY! ✓\n");
