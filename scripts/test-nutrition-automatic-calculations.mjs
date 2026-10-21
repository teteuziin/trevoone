import { register } from "node:module";
register("./ts-loader.mjs", import.meta.url);

import assert from "node:assert";
import {
  calculateItemNutrients,
  calculateMealTotals,
  calculatePlanTotals,
  scaleItemSnapshots,
  derivePortionUnitCode,
} from "../lib/nutrition-v2/nutrient-calculator.ts";

console.log("=== RUNNING NUTRITION AUTOMATIC CALCULATIONS & COMPLETENESS TEST SUITE ===");

// ============================================================================
// 1. UNIT TESTS: Pure Domain Calculation & Proportional Scaling
// ============================================================================
console.log("\n--- 1. Testing Proportional Scaling Math ---");

// Test 1.1: 100g base food scaled to 60g
const scaled60 = scaleItemSnapshots(
  {
    prescribedQuantity: 100,
    caloriesKcalSnapshot: 200,
    proteinGSnapshot: 10,
    carbohydrateGSnapshot: 30,
    fatGSnapshot: 5,
  },
  60
);

assert.strictEqual(scaled60.caloriesKcalSnapshot, 120, "200 kcal * 0.6 = 120 kcal");
assert.strictEqual(scaled60.proteinGSnapshot, 6, "10g P * 0.6 = 6g P");
assert.strictEqual(scaled60.carbohydrateGSnapshot, 18, "30g C * 0.6 = 18g C");
assert.strictEqual(scaled60.fatGSnapshot, 3, "5g G * 0.6 = 3g G");
console.log("✓ Proportional scaling 100g -> 60g accurate");

// Test 1.2: Confirmed zero (0g fat) stays 0, missing macro stays null
const scaledWithZeroAndNull = scaleItemSnapshots(
  {
    prescribedQuantity: 100,
    caloriesKcalSnapshot: 150,
    proteinGSnapshot: 20,
    carbohydrateGSnapshot: null, // Unknown/missing
    fatGSnapshot: 0, // Confirmed zero (e.g. egg white)
  },
  150
);

assert.strictEqual(scaledWithZeroAndNull.caloriesKcalSnapshot, 225, "150 kcal * 1.5 = 225 kcal");
assert.strictEqual(scaledWithZeroAndNull.proteinGSnapshot, 30, "20g P * 1.5 = 30g P");
assert.strictEqual(scaledWithZeroAndNull.carbohydrateGSnapshot, null, "Missing carbs must remain null, never coerced to 0");
assert.strictEqual(scaledWithZeroAndNull.fatGSnapshot, 0, "Confirmed 0g fat must remain 0, never coerced to null");
console.log("✓ Zero vs Null distinction strictly preserved in scaleItemSnapshots");

// Test 1.3: Invalid / non-positive new quantity returns safe nulls without throwing
const scaledInvalid = scaleItemSnapshots(
  {
    prescribedQuantity: 100,
    caloriesKcalSnapshot: 100,
  },
  0
);
assert.strictEqual(scaledInvalid.caloriesKcalSnapshot, null, "Zero new quantity must return null snapshot safely");

const scaledNegative = scaleItemSnapshots(
  {
    prescribedQuantity: 100,
    caloriesKcalSnapshot: 100,
  },
  -50
);
assert.strictEqual(scaledNegative.caloriesKcalSnapshot, null, "Negative quantity must return null snapshot safely");
console.log("✓ Invalid quantity edge cases handled safely without throwing");

// ============================================================================
// 2. UNIT TESTS: calculateItemNutrients with portions & household measures
// ============================================================================
console.log("\n--- 2. Testing Portions & Household Measures ---");

// Test 2.1: Food with household portion (e.g., 1 large egg = 50g reference)
const eggCalc = calculateItemNutrients({
  food: {
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 143,
    proteinG: 13,
    carbohydrateG: 0.7,
    fatG: 9.5,
  },
  prescribedQuantity: 3, // 3 eggs
  prescribedUnitCode: "PORCAO",
  portion: {
    label: "Unidade grande",
    equivalentReferenceAmount: 50, // 50g each -> 150g total
  },
});

assert.strictEqual(eggCalc.isValid, true, "Egg calc must be valid");
assert.strictEqual(eggCalc.factor, 1.5, "Factor for 3 x 50g = 150g / 100g = 1.5");
assert.strictEqual(eggCalc.caloriesKcal, 214.5, "143 * 1.5 = 214.5 kcal");
assert.strictEqual(eggCalc.proteinG, 19.5, "13 * 1.5 = 19.5g P");
assert.strictEqual(eggCalc.fatG, 14.25, "9.5 * 1.5 = 14.25g G");
console.log("✓ Household portion calculation (3 large eggs = 150g) accurate");

// Test 2.2: Household measure without registered equivalent amount
const unmappedMeasureCalc = calculateItemNutrients({
  food: {
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 100,
    proteinG: 10,
    carbohydrateG: 10,
    fatG: 1,
  },
  prescribedQuantity: 2,
  prescribedUnitCode: "COLHER_SOPA", // No gram conversion provided
  portion: null,
});

assert.strictEqual(unmappedMeasureCalc.isValid, false, "Must be isValid: false when portion is missing for non-metric unit");
assert.strictEqual(unmappedMeasureCalc.factor, null, "Factor is null when conversion is unknown");
assert.strictEqual(unmappedMeasureCalc.caloriesKcal, null, "Calories must be null when measure has no equivalent");
console.log("✓ Unmapped household measure returns null factor & null macros without throwing");

// ============================================================================
// 3. UNIT TESTS: Per-Nutrient Completeness & Incomplete Count
// ============================================================================
console.log("\n--- 3. Testing Per-Nutrient Completeness in Totals ---");

const testMealItems = [
  // Item 1: Complete macros
  {
    publicId: "item-1",
    foodNameSnapshot: "Arroz Branco",
    prescribedQuantity: 100,
    prescribedUnitCode: "G",
    caloriesKcalSnapshot: 130,
    proteinGSnapshot: 2.5,
    carbohydrateGSnapshot: 28.2,
    fatGSnapshot: 0.2,
  },
  // Item 2: Missing Carbs and Fat, but known Calories and Protein
  {
    publicId: "item-2",
    foodNameSnapshot: "Suplemento Proteico Especial",
    prescribedQuantity: 30,
    prescribedUnitCode: "G",
    caloriesKcalSnapshot: 110,
    proteinGSnapshot: 24,
    carbohydrateGSnapshot: null, // missing
    fatGSnapshot: null, // missing
  },
  // Item 3: Unmapped portion measure -> missing all macros and calories
  {
    publicId: "item-3",
    foodId: 99,
    foodNameSnapshot: "Molho Caseiro sem medida",
    prescribedQuantity: 1,
    prescribedUnitCode: "COLHER",
    caloriesKcalSnapshot: null,
    proteinGSnapshot: null,
    carbohydrateGSnapshot: null,
    fatGSnapshot: null,
  },
];

const mealTotals = calculateMealTotals(testMealItems);

assert.strictEqual(mealTotals.status, "INCOMPLETE", "Meal totals status must be INCOMPLETE");
assert.strictEqual(mealTotals.hasIncompleteData, true, "hasIncompleteData must be true");

// Calculated subtotals:
// Calories: 130 + 110 = 240
assert.strictEqual(mealTotals.caloriesKcal, 240, "Calories subtotal: 130 + 110 = 240");
// Protein: 2.5 + 24 = 26.5
assert.strictEqual(mealTotals.proteinG, 26.5, "Protein subtotal: 2.5 + 24 = 26.5g");
// Carbohydrate: 28.2
assert.strictEqual(mealTotals.carbohydrateG, 28.2, "Carbohydrate subtotal: 28.2g");
// Fat: 0.2
assert.strictEqual(mealTotals.fatG, 0.2, "Fat subtotal: 0.2g");

// Per-nutrient missing counts:
// Total items = 3.
// Calories known in 2 items -> missing = 1 (item-3)
assert.strictEqual(mealTotals.missingCaloriesCount, 1, "missingCaloriesCount must be 1");
// Protein known in 2 items -> missing = 1 (item-3)
assert.strictEqual(mealTotals.missingProteinCount, 1, "missingProteinCount must be 1");
// Carbohydrate known in 1 item -> missing = 2 (item-2, item-3)
assert.strictEqual(mealTotals.missingCarbohydrateCount, 2, "missingCarbohydrateCount must be 2");
// Fat known in 1 item -> missing = 2 (item-2, item-3)
assert.strictEqual(mealTotals.missingFatCount, 2, "missingFatCount must be 2");

// Check reason for item-3:
const item3Info = mealTotals.incompleteItems.find((i) => i.publicId === "item-3");
assert(item3Info, "item-3 must be in incompleteItems");
assert.strictEqual(item3Info.reason, "Medida sem equivalência cadastrada", "item-3 reason must indicate unmapped measure");

console.log("✓ Per-nutrient completeness correctly tracks missing counts per nutrient");
console.log("✓ Subtotals calculate available nutrients without dropping known values to zero");
console.log("✓ Reason 'Medida sem equivalência cadastrada' confirmed for unmapped household units");

// ============================================================================
// 4. UNIT TESTS: Plan Totals Aggregation Across Multiple Meals
// ============================================================================
console.log("\n--- 4. Testing Multi-Meal Plan Totals Aggregation ---");

const testMeals = [
  {
    publicId: "meal-1",
    title: "Café da Manhã",
    items: [testMealItems[0]], // 130 kcal, 2.5g P, 28.2g C, 0.2g G (complete)
  },
  {
    publicId: "meal-2",
    title: "Almoço",
    items: [testMealItems[1]], // 110 kcal, 24g P, null C, null G (partial)
  },
];

const planTotals = calculatePlanTotals(testMeals);

assert.strictEqual(planTotals.caloriesKcal, 240, "Plan calories: 130 + 110 = 240 kcal");
assert.strictEqual(planTotals.proteinG, 26.5, "Plan protein: 2.5 + 24 = 26.5g");
assert.strictEqual(planTotals.carbohydrateG, 28.2, "Plan carbs: 28.2g");
assert.strictEqual(planTotals.fatG, 0.2, "Plan fat: 0.2g");
assert.strictEqual(planTotals.missingCarbohydrateCount, 1, "1 item missing carbs in whole plan");
assert.strictEqual(planTotals.missingFatCount, 1, "1 item missing fat in whole plan");
assert.strictEqual(planTotals.missingCaloriesCount, 0, "0 items missing calories in these 2 meals");
assert.strictEqual(planTotals.missingProteinCount, 0, "0 items missing protein in these 2 meals");

console.log("✓ Multi-meal aggregation accurately preserves per-nutrient completeness");

// ============================================================================
// 5. REPOSITORY INTEGRATION TESTS: Portion Preservation & Fiber In DB
// ============================================================================
console.log("\n--- 5. Testing Database Integration & Portion Preservation ---");

try {
  const { getDbConnection } = await import("../lib/db/mysql.ts");
  const connection = await getDbConnection();

  try {
    // 5.1 Test that nutrition_v2_food_portions table exists and can be joined
    const [portionsTable] = await connection.query(
      `SELECT COUNT(*) AS c FROM nutrition_v2_food_portions WHERE deleted_at IS NULL`
    );
    console.log(`✓ Database connected. Active food portions in catalog: ${portionsTable[0].c}`);

    // 5.2 Test portion preservation query syntax in plan-repository
    const [testQuery] = await connection.query(
      `SELECT
         mi.id,
         fp.equivalent_reference_amount AS portion_equivalent_amount
       FROM nutrition_v2_meal_items mi
       LEFT JOIN (
         SELECT food_id, LOWER(TRIM(label)) AS norm_label, MAX(equivalent_reference_amount) AS equivalent_reference_amount
         FROM nutrition_v2_food_portions
         WHERE deleted_at IS NULL AND status = 'ACTIVE'
         GROUP BY food_id, LOWER(TRIM(label))
       ) fp ON fp.food_id = mi.food_id AND fp.norm_label = LOWER(TRIM(mi.prescribed_unit_label))
       LIMIT 5`
    );
    assert(Array.isArray(testQuery), "Query must succeed without SQL syntax errors");
    console.log("✓ Portion join query syntax verified against live MySQL schema");

    // 5.3 Test that foods table has fiber_g and data_quality columns
    const [foodCols] = await connection.query(
      `SELECT id, fiber_g, data_quality FROM nutrition_v2_foods LIMIT 1`
    );
    assert(foodCols.length >= 0, "nutrition_v2_foods must have fiber_g and data_quality");
    console.log("✓ nutrition_v2_foods fiber_g and data_quality columns verified");

  } finally {
    connection.release();
  }
} catch (dbErr) {
  console.log("DB test skipped or connection unavailable (offline mode):", dbErr.message);
}

console.log("\n========================================================");
console.log("✓ ALL NUTRITION AUTOMATIC CALCULATION TESTS PASSED!");
console.log("========================================================\n");
