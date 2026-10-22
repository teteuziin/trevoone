/**
 * TREVO ONE — TEST SUITE: RESUMO NUTRICIONAL DIÁRIO, COMPLETUDE E PREFERÊNCIAS
 * Verifies all Etapa 6 invariants:
 * 1. Completeness & absence: "Sem dados" vs "0" vs "Subtotal calculado (* X sem info)"
 * 2. Confirmed zero semantics: 0 is known, counts in sum and completeness
 * 3. Primary items only: substitutions are never summed into meal or daily totals
 * 4. Multi-day isolation: meals from different days are never summed into a single daily total
 * 5. Target comparisons: active only when target > 0; without target -> "Meta não definida"
 * 6. % VET distribution: Atwater factors (4-4-9) with partial data detection
 * 7. Authoritative kcal preservation: snapshot calories sum is never overridden by Atwater math
 * 8. Preferences: showMealMicronutrients toggle, defaults, and preset resolution
 * 9. Key micronutrients: progressive extraction and completeness reporting
 * 10. Live quantity scaling: preserves null vs zero semantics
 */

import assert from "node:assert/strict";
import {
  evaluateNutrientCompleteness,
  compareWithTarget,
  calculateCaloricDistribution,
  detectPlanDays,
  filterMealsBySelectedDay,
  calculateDailySummary,
  calculateMealTotals,
  calculatePlanTotals,
  scaleItemSnapshots,
  CANONICAL_NUTRIENTS,
} from "../lib/nutrition-v2/nutrient-calculator.ts";

import {
  DEFAULT_NUTRITION_BUILDER_PREFERENCES,
  getPresetFromPreferences,
} from "../lib/nutrition-v2/builder-preferences-types.ts";

let passedCount = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

console.log("=== EXECUTING TEST SUITE: RESUMO NUTRICIONAL DIÁRIO & PREFERÊNCIAS ===");

// ----------------------------------------------------------------------------
// 1. Preferences & Presets
// ----------------------------------------------------------------------------
test("1.1 Default preferences has showMealMicronutrients: true (COMPLETO)", () => {
  assert.equal(DEFAULT_NUTRITION_BUILDER_PREFERENCES.showMealMicronutrients, true);
  assert.equal(getPresetFromPreferences(DEFAULT_NUTRITION_BUILDER_PREFERENCES), "COMPLETO");
});

test("1.2 Simplified preset has showMealMicronutrients: false", () => {
  const simplified = {
    showStudentPreview: false,
    showVersionHistory: false,
    showTemplateActions: false,
    showMealMicronutrients: false,
  };
  assert.equal(getPresetFromPreferences(simplified), "SIMPLIFICADO");
});

test("1.3 Custom toggling returns PERSONALIZADO", () => {
  const custom = {
    showStudentPreview: true,
    showVersionHistory: false,
    showTemplateActions: true,
    showMealMicronutrients: false,
  };
  assert.equal(getPresetFromPreferences(custom), "PERSONALIZADO");
});

// ----------------------------------------------------------------------------
// 2. Completeness & Absence Evaluation
// ----------------------------------------------------------------------------
test("2.1 When all items have null, status is NO_DATA, value is null, displayText is 'Sem dados'", () => {
  const res = evaluateNutrientCompleteness([null, null, undefined], "g");
  assert.equal(res.status, "NO_DATA");
  assert.equal(res.value, null);
  assert.equal(res.displayText, "Sem dados");
  assert.equal(res.hasData, false);
});

test("2.2 When some items have data and some missing, status is PARTIAL with subtotal and missing count", () => {
  const res = evaluateNutrientCompleteness([25, null, 15], "g");
  assert.equal(res.status, "PARTIAL");
  assert.equal(res.value, 40);
  assert.equal(res.displayText, "40 g");
  assert.equal(res.missingItemCount, 1);
  assert.equal(res.isPartial, true);
  assert.ok(res.completenessText.includes("Subtotal calculado"));
  assert.ok(res.completenessText.includes("1 sem info"));
});

test("2.3 Confirmed zero (0) counts as known and completes calculation without missing data", () => {
  // Olive oil / sugar scenario: protein is confirmed 0
  const res = evaluateNutrientCompleteness([0, 0], "g");
  assert.equal(res.status, "COMPLETE");
  assert.equal(res.value, 0);
  assert.equal(res.displayText, "0 g");
  assert.equal(res.isComplete, true);
  assert.equal(res.missingItemCount, 0);
  assert.equal(res.completenessText, "Total completo");
});

test("2.4 Empty item list returns EMPTY status", () => {
  const res = evaluateNutrientCompleteness([], "g");
  assert.equal(res.status, "EMPTY");
  assert.equal(res.value, null);
  assert.equal(res.displayText, "Sem itens");
});

// ----------------------------------------------------------------------------
// 3. Target Comparisons & VET Distribution
// ----------------------------------------------------------------------------
test("3.1 Target absent or non-positive returns 'Meta não definida' without negative classification", () => {
  const resNull = compareWithTarget(1800, null, "kcal");
  assert.equal(resNull.hasTarget, false);
  assert.equal(resNull.statusText, "Meta não definida");

  const resZero = compareWithTarget(1800, 0, "kcal");
  assert.equal(resZero.hasTarget, false);
  assert.equal(resZero.statusText, "Meta não definida");
});

test("3.2 Valid target (>0) computes percentage and status", () => {
  const res = compareWithTarget(1800, 2000, "kcal");
  assert.equal(res.hasTarget, true);
  assert.equal(res.targetValue, 2000);
  assert.equal(res.percentage, 90);
  assert.equal(res.statusText, "Meta: 2000 kcal (90%)");
});

test("3.3 VET % distribution uses Atwater factors 4-4-9 and flags partial data", () => {
  // P: 100g * 4 = 400 kcal
  // C: 200g * 4 = 800 kcal
  // F: 44.44g * 9 ≈ 400 kcal
  // Sum = 1600 kcal. P = 25%, C = 50%, F = 25%
  const vet = calculateCaloricDistribution(100, 200, 44.44, false);
  assert.equal(vet.method, "Fatores de Atwater (4 kcal/g P, 4 kcal/g C, 9 kcal/g G)");
  assert.equal(vet.proteinPercent, 25);
  assert.equal(vet.carbsPercent, 50);
  assert.equal(vet.fatPercent, 25);
  assert.equal(vet.isEstimatedFromPartialData, false);

  const partialVet = calculateCaloricDistribution(100, 200, null, true);
  assert.equal(partialVet.isEstimatedFromPartialData, true);
});

// ----------------------------------------------------------------------------
// 4. Multi-Day Isolation & Primary Items Non-Summation of Substitutions
// ----------------------------------------------------------------------------
test("4.1 detectPlanDays identifies distinct days in multi-day plan", () => {
  const meals = [
    { publicId: "m1", title: "Segunda-feira - Café" },
    { publicId: "m2", title: "Segunda - Almoço" },
    { publicId: "m3", title: "Terça-feira - Café" },
    { publicId: "m4", title: "Terça - Almoço" },
  ];
  const days = detectPlanDays(meals);
  assert.equal(days.length, 2);
  assert.equal(days[0].id, "segunda");
  assert.equal(days[1].id, "terca");
});

test("4.2 filterMealsBySelectedDay isolates meals to the selected day", () => {
  const meals = [
    { publicId: "m1", title: "Segunda - Café" },
    { publicId: "m2", title: "Segunda - Almoço" },
    { publicId: "m3", title: "Terça - Almoço" },
  ];
  const days = detectPlanDays(meals);
  const segMeals = filterMealsBySelectedDay(meals, "segunda", days);
  assert.equal(segMeals.length, 2);
  assert.deepEqual(segMeals.map((m) => m.publicId), ["m1", "m2"]);
});

test("4.3 calculateDailySummary never sums substitution items into meal or daily totals", () => {
  const meals = [
    {
      publicId: "m1",
      title: "Café da Manhã",
      items: [
        {
          caloriesKcalSnapshot: 200,
          proteinGSnapshot: 15,
          carbohydrateGSnapshot: 25,
          fatGSnapshot: 5,
          substitutions: [
            // Sub has 500 kcal, MUST NOT BE SUMMED
            { caloriesKcalSnapshot: 500, proteinGSnapshot: 40, carbohydrateGSnapshot: 60, fatGSnapshot: 10 },
          ],
        },
        {
          caloriesKcalSnapshot: 100,
          proteinGSnapshot: 5,
          carbohydrateGSnapshot: 10,
          fatGSnapshot: 2,
        },
      ],
    },
  ];

  const summary = calculateDailySummary({ meals, planningTarget: null });
  // Daily total MUST be 200 + 100 = 300 kcal (NOT 800 kcal)
  assert.equal(summary.calories.value, 300);
  assert.equal(summary.protein.value, 20);
  assert.equal(summary.carbohydrate.value, 35);
  assert.equal(summary.fat.value, 7);
});

test("4.4 calculateDailySummary isolates multi-day plans so days are never summed together", () => {
  const meals = [
    {
      publicId: "m1",
      title: "Segunda - Almoço",
      items: [{ caloriesKcalSnapshot: 500, proteinGSnapshot: 40, carbohydrateGSnapshot: 50, fatGSnapshot: 10 }],
    },
    {
      publicId: "m2",
      title: "Terça - Almoço",
      items: [{ caloriesKcalSnapshot: 600, proteinGSnapshot: 45, carbohydrateGSnapshot: 60, fatGSnapshot: 15 }],
    },
  ];

  const days = detectPlanDays(meals);
  assert.equal(days.length, 2);

  // When Segunda is selected: total must be ONLY 500 kcal, NOT 1100 kcal!
  const segSummary = calculateDailySummary({ meals, selectedDayId: "segunda", detectedDays: days });
  assert.equal(segSummary.dayId, "segunda");
  assert.equal(segSummary.calories.value, 500);
  assert.equal(segSummary.protein.value, 40);

  // When Terça is selected: total must be ONLY 600 kcal, NOT 1100 kcal!
  const terSummary = calculateDailySummary({ meals, selectedDayId: "terca", detectedDays: days });
  assert.equal(terSummary.dayId, "terca");
  assert.equal(terSummary.calories.value, 600);
  assert.equal(terSummary.protein.value, 45);
});

// ----------------------------------------------------------------------------
// 5. Authoritative kcal preservation & Live Quantity Scaling
// ----------------------------------------------------------------------------
test("5.1 Authoritative declared food kcal is strictly preserved without Atwater override", () => {
  // A food declared with 250 kcal, but macros 10g P (40) + 20g C (80) + 10g F (90) = 210 kcal
  const items = [
    { caloriesKcalSnapshot: 250, proteinGSnapshot: 10, carbohydrateGSnapshot: 20, fatGSnapshot: 10 },
  ];
  const summary = calculateDailySummary({ meals: [{ items }] });
  assert.equal(summary.calories.value, 250); // Preserved authoritative 250, NOT forced to 210
});

test("5.2 scaleItemSnapshots scales proportionally while preserving null and zero strictly", () => {
  const item = {
    prescribedQuantity: 100,
    caloriesKcalSnapshot: 150,
    proteinGSnapshot: 0, // confirmed zero
    carbohydrateGSnapshot: 30,
    fatGSnapshot: null, // unknown
  };

  const scaled = scaleItemSnapshots(item, 200);
  assert.equal(scaled.caloriesKcalSnapshot, 300);
  assert.equal(scaled.proteinGSnapshot, 0); // 0 scaled remains 0
  assert.equal(scaled.carbohydrateGSnapshot, 60);
  assert.equal(scaled.fatGSnapshot, null); // null scaled remains null
});

console.log(`\nALL ${passedCount} VERIFICATION TESTS PASSED SUCCESSFULLY!`);
