/**
 * TEST SUITE: TREVO ONE — NUTRIÇÃO P0.3
 * HARDENING FINAL DOS 4 MACROS (CALORIAS, PROTEÍNAS, CARBOIDRATOS, GORDURAS)
 */

import { register } from "node:module";
register("./ts-loader.mjs", import.meta.url);

const { validatePlanTreeForPublication, formatMissingNutrientsList } = await import("../lib/nutrition-v2/validation.ts");

let passedCount = 0;
let totalCount = 0;

function assert(condition, message) {
  totalCount++;
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`[PASS] ${message}`);
  passedCount++;
}

console.log("=== INICIANDO SUÍTE DE TESTES: NUTRIÇÃO P0.3 HARDENING DOS 4 MACROS ===\n");

function createSingleItemPlan(itemData) {
  return {
    version: { title: "Plano Teste P0.3" },
    meals: [
      {
        publicId: "meal-1",
        title: "Almoço",
        items: [
          {
            publicId: "item-1",
            foodId: 101,
            foodNameSnapshot: "Alimento Teste",
            prescribedQuantity: 100,
            prescribedUnitCode: "G",
            caloriesKcalSnapshot: 150,
            proteinGSnapshot: 10,
            carbohydrateGSnapshot: 20,
            fatGSnapshot: 5,
            ...itemData,
          },
        ],
      },
    ],
  };
}

// ----------------------------------------------------------------------------
// TEST 1 — PUBLISH WITH ALL 4 KNOWN: PASS
// ----------------------------------------------------------------------------
{
  const plan = createSingleItemPlan({
    caloriesKcalSnapshot: 150,
    proteinGSnapshot: 10,
    carbohydrateGSnapshot: 20,
    fatGSnapshot: 5,
  });
  const res = validatePlanTreeForPublication(plan);
  assert(res.valid === true, "PUBLISH WITH ALL 4 KNOWN: PASS");
  assert(res.pendingItems.length === 0, "No pending items when all 4 macros are known");
}

// ----------------------------------------------------------------------------
// TEST 2 — CALORIES NULL: DENIED PASS
// ----------------------------------------------------------------------------
{
  const plan = createSingleItemPlan({
    caloriesKcalSnapshot: null,
    proteinGSnapshot: 10,
    carbohydrateGSnapshot: 20,
    fatGSnapshot: 5,
  });
  const res = validatePlanTreeForPublication(plan);
  assert(res.valid === false, "CALORIES NULL: DENIED PASS");
  assert(res.pendingItems.length === 1, "Calories null flags 1 pending item");
  assert(res.pendingItems[0].missingNutrients.includes("Calorias"), "Calories reported in missingNutrients");
  assert(res.pendingItems[0].reasonLabel.includes("Dados ausentes: Calorias"), "reasonLabel displays 'Dados ausentes: Calorias'");
}

// ----------------------------------------------------------------------------
// TEST 3 — PROTEIN NULL: DENIED PASS
// ----------------------------------------------------------------------------
{
  const plan = createSingleItemPlan({
    caloriesKcalSnapshot: 150,
    proteinGSnapshot: null,
    carbohydrateGSnapshot: 20,
    fatGSnapshot: 5,
  });
  const res = validatePlanTreeForPublication(plan);
  assert(res.valid === false, "PROTEIN NULL: DENIED PASS");
  assert(res.pendingItems.length === 1, "Protein null flags 1 pending item");
  assert(res.pendingItems[0].missingNutrients.includes("Proteínas"), "Protein reported in missingNutrients");
  assert(res.pendingItems[0].reasonLabel.includes("Dados ausentes: Proteínas"), "reasonLabel displays 'Dados ausentes: Proteínas'");
}

// ----------------------------------------------------------------------------
// TEST 4 — CARBS NULL: DENIED PASS
// ----------------------------------------------------------------------------
{
  const plan = createSingleItemPlan({
    caloriesKcalSnapshot: 150,
    proteinGSnapshot: 10,
    carbohydrateGSnapshot: null,
    fatGSnapshot: 5,
  });
  const res = validatePlanTreeForPublication(plan);
  assert(res.valid === false, "CARBS NULL: DENIED PASS");
  assert(res.pendingItems.length === 1, "Carbs null flags 1 pending item");
  assert(res.pendingItems[0].missingNutrients.includes("Carboidratos"), "Carbs reported in missingNutrients");
  assert(res.pendingItems[0].reasonLabel.includes("Dados ausentes: Carboidratos"), "reasonLabel displays 'Dados ausentes: Carboidratos'");
}

// ----------------------------------------------------------------------------
// TEST 5 — FAT NULL: DENIED PASS
// ----------------------------------------------------------------------------
{
  const plan = createSingleItemPlan({
    caloriesKcalSnapshot: 150,
    proteinGSnapshot: 10,
    carbohydrateGSnapshot: 20,
    fatGSnapshot: null,
  });
  const res = validatePlanTreeForPublication(plan);
  assert(res.valid === false, "FAT NULL: DENIED PASS");
  assert(res.pendingItems.length === 1, "Fat null flags 1 pending item");
  assert(res.pendingItems[0].missingNutrients.includes("Gorduras"), "Fat reported in missingNutrients");
  assert(res.pendingItems[0].reasonLabel.includes("Dados ausentes: Gorduras"), "reasonLabel displays 'Dados ausentes: Gorduras'");
}

// ----------------------------------------------------------------------------
// TEST 6 — MULTIPLE MACROS NULL: DENIED PASS
// ----------------------------------------------------------------------------
{
  const plan = createSingleItemPlan({
    caloriesKcalSnapshot: 150,
    proteinGSnapshot: 10,
    carbohydrateGSnapshot: null,
    fatGSnapshot: null,
  });
  const res = validatePlanTreeForPublication(plan);
  assert(res.valid === false, "MULTIPLE MACROS NULL: DENIED PASS");
  assert(res.pendingItems.length === 1, "Multiple macros null flags 1 pending item");
  assert(
    res.pendingItems[0].reasonLabel.includes("Dados ausentes: Carboidratos e Gorduras"),
    "Exact UX match: 'Dados ausentes: Carboidratos e Gorduras'"
  );
  assert(
    res.pendingItems[0].reasonLabel.startsWith("Dados nutricionais incompletos"),
    "reasonLabel starts with 'Dados nutricionais incompletos'"
  );
}

// ----------------------------------------------------------------------------
// TEST 7 — CALORIES ZERO: ALLOWED PASS
// ----------------------------------------------------------------------------
{
  const plan = createSingleItemPlan({
    caloriesKcalSnapshot: 0,
    proteinGSnapshot: 0,
    carbohydrateGSnapshot: 0,
    fatGSnapshot: 0,
  });
  const res = validatePlanTreeForPublication(plan);
  assert(res.valid === true, "CALORIES ZERO: ALLOWED PASS");
  assert(res.pendingItems.length === 0, "Zero calories is a known valid macro");
}

// ----------------------------------------------------------------------------
// TEST 8 — PROTEIN ZERO: ALLOWED PASS
// ----------------------------------------------------------------------------
{
  const plan = createSingleItemPlan({
    caloriesKcalSnapshot: 80,
    proteinGSnapshot: 0,
    carbohydrateGSnapshot: 20,
    fatGSnapshot: 0,
  });
  const res = validatePlanTreeForPublication(plan);
  assert(res.valid === true, "PROTEIN ZERO: ALLOWED PASS");
  assert(res.pendingItems.length === 0, "Zero protein (e.g. pure carb) is allowed");
}

// ----------------------------------------------------------------------------
// TEST 9 — CARBS ZERO: ALLOWED PASS
// ----------------------------------------------------------------------------
{
  const plan = createSingleItemPlan({
    caloriesKcalSnapshot: 130,
    proteinGSnapshot: 25,
    carbohydrateGSnapshot: 0,
    fatGSnapshot: 3,
  });
  const res = validatePlanTreeForPublication(plan);
  assert(res.valid === true, "CARBS ZERO: ALLOWED PASS");
  assert(res.pendingItems.length === 0, "Zero carbs (e.g. lean meat/oil) is allowed");
}

// ----------------------------------------------------------------------------
// TEST 10 — FAT ZERO: ALLOWED PASS
// ----------------------------------------------------------------------------
{
  const plan = createSingleItemPlan({
    caloriesKcalSnapshot: 100,
    proteinGSnapshot: 20,
    carbohydrateGSnapshot: 5,
    fatGSnapshot: 0,
  });
  const res = validatePlanTreeForPublication(plan);
  assert(res.valid === true, "FAT ZERO: ALLOWED PASS");
  assert(res.pendingItems.length === 0, "Zero fat (e.g. fat-free whey/egg whites) is allowed");
}

// ----------------------------------------------------------------------------
// TEST 11 — ALL 4 MACROS ZERO: ALLOWED PASS
// ----------------------------------------------------------------------------
{
  const plan = createSingleItemPlan({
    caloriesKcalSnapshot: 0,
    proteinGSnapshot: 0,
    carbohydrateGSnapshot: 0,
    fatGSnapshot: 0,
  });
  const res = validatePlanTreeForPublication(plan);
  assert(res.valid === true, "ALL 4 MACROS ZERO: ALLOWED PASS");
}

// ----------------------------------------------------------------------------
// TEST 12 — HELPER FORMATTING
// ----------------------------------------------------------------------------
{
  assert(formatMissingNutrientsList(["Calorias"]) === "Calorias", "Format 1 nutrient");
  assert(formatMissingNutrientsList(["Carboidratos", "Gorduras"]) === "Carboidratos e Gorduras", "Format 2 nutrients");
  assert(
    formatMissingNutrientsList(["Calorias", "Proteínas", "Gorduras"]) === "Calorias, Proteínas e Gorduras",
    "Format 3 nutrients"
  );
  assert(
    formatMissingNutrientsList(["Calorias", "Proteínas", "Carboidratos", "Gorduras"]) ===
      "Calorias, Proteínas, Carboidratos e Gorduras",
    "Format all 4 nutrients"
  );
}

console.log(`\n==================================================`);
console.log(`P0.3 MACROS HARDENING: ${passedCount}/${totalCount} TESTES PASS!`);
console.log(`==================================================`);
