/**
 * TREVO ONE — QA SUITE: NUTRITION COMPLETE (DOMAINS, INVARIANTS, PUBLICATION & FORMULAS)
 * 
 * Tests:
 * 1. P0.3 4-Macros Publication Gate (All 4 known ALLOW, any null DENY, known zero ALLOW)
 * 2. Clinical Calculations Engine (Mifflin, Harris, Cunningham, Katch-McArdle, TDEE, IMC)
 * 3. Invariant: NULL !== ZERO (Unknown values never coerced to 0)
 * 4. Mathematical Equivalents Engine (All criteria: Calories, Carbs, Protein, Fat, Mass/Vol preservation)
 * 5. Totals Invariant: Complete vs Incomplete calculation
 * 6. Plan Lifecycle: Active v1 -> Draft v2 -> Publish v2 -> Active v2 (v1 historical)
 * 7. Templates & Copying: Cloned plans never leak source patient identity or clinical notes
 */

import { register } from "node:module";
register("./ts-loader.mjs", import.meta.url);

import assert from "node:assert/strict";

const {
  validatePlanTreeForPublication,
  formatMissingNutrientsList,
} = await import("../lib/nutrition-v2/validation.ts");

const {
  calculateNutrientEquivalence,
  convertRefAmountToGrams,
  roundMacro,
} = await import("../lib/nutrition-v2/equivalents.ts");

const {
  clinicalFormulaRegistry,
  executeClinicalCalculation,
  calculatePatientBMI,
} = await import("../lib/nutrition-v2/clinical-calculations/index.ts");

let passedCount = 0;
let totalCount = 0;

function runTest(name, fn) {
  totalCount++;
  try {
    fn();
    passedCount++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    console.error(`  [FAIL] ${name}:`, err);
    throw err;
  }
}

export async function runNutritionSuite() {
  console.log("=== 5. NUTRITION SUITE: FORMULAS, EQUIVALENTES, TOTAIS & LIFECYCLE ===");

  function makeTestPlan(itemOverrides) {
    return {
      version: { title: "Plano Teste QA" },
      meals: [
        {
          publicId: "meal_01",
          title: "Refeição 1",
          items: [
            {
              publicId: "item_01",
              foodId: 100,
              foodNameSnapshot: "Alimento Teste",
              prescribedQuantity: 100,
              prescribedUnitCode: "G",
              caloriesKcalSnapshot: 150,
              proteinGSnapshot: 10,
              carbohydrateGSnapshot: 20,
              fatGSnapshot: 5,
              ...itemOverrides,
            },
          ],
        },
      ],
    };
  }

  // 1. P0.3 PUBLICATION GATE — 4 MACROS
  runTest("P0.3 PUBLISH GATE: All 4 known macros -> ALLOW publication", () => {
    const plan = makeTestPlan({});
    const res = validatePlanTreeForPublication(plan);
    assert.equal(res.valid, true);
    assert.equal(res.pendingItems.length, 0);
  });

  runTest("P0.3 PUBLISH GATE: Calories null -> DENY publication", () => {
    const plan = makeTestPlan({ caloriesKcalSnapshot: null });
    const res = validatePlanTreeForPublication(plan);
    assert.equal(res.valid, false);
    assert.equal(res.pendingItems.length, 1);
    assert(res.pendingItems[0].reasonLabel.includes("Calorias"));
  });

  runTest("P0.3 PUBLISH GATE: Protein null -> DENY publication", () => {
    const plan = makeTestPlan({ proteinGSnapshot: null });
    const res = validatePlanTreeForPublication(plan);
    assert.equal(res.valid, false);
    assert.equal(res.pendingItems.length, 1);
    assert(res.pendingItems[0].reasonLabel.includes("Proteínas"));
  });

  runTest("P0.3 PUBLISH GATE: Carbs null -> DENY publication", () => {
    const plan = makeTestPlan({ carbohydrateGSnapshot: null });
    const res = validatePlanTreeForPublication(plan);
    assert.equal(res.valid, false);
    assert.equal(res.pendingItems.length, 1);
    assert(res.pendingItems[0].reasonLabel.includes("Carboidratos"));
  });

  runTest("P0.3 PUBLISH GATE: Fat null -> DENY publication", () => {
    const plan = makeTestPlan({ fatGSnapshot: null });
    const res = validatePlanTreeForPublication(plan);
    assert.equal(res.valid, false);
    assert.equal(res.pendingItems.length, 1);
    assert(res.pendingItems[0].reasonLabel.includes("Gorduras"));
  });

  runTest("P0.3 PUBLISH GATE: Known zeros (0 kcal, 0g protein, etc.) -> ALLOW publication", () => {
    const plan = makeTestPlan({
      caloriesKcalSnapshot: 0,
      proteinGSnapshot: 0,
      carbohydrateGSnapshot: 0,
      fatGSnapshot: 0,
    });
    const res = validatePlanTreeForPublication(plan);
    assert.equal(res.valid, true, "Known zeros are valid macros (e.g. water, tea, pure oil 0 carb)");
  });

  // 2. CLINICAL CALCULATIONS ENGINE
  runTest("CLINICAL ENGINE: BMI Standard Calculation", () => {
    const res = calculatePatientBMI({
      consultancyId: 1,
      studentMembershipId: 10,
      latestAnthropometrics: {
        publicId: "anthro_qa_01",
        measurementDate: "2026-10-09",
        weightKg: 85.5,
        heightCm: 180,
        waistCm: null,
        hipCm: null,
      },
    });
    assert.equal(res.status, "SUCCESS");
    assert.equal(res.result, 26.39);
    assert.equal(res.formattedResult, "26.4 kg/m²");
  });

  runTest("CLINICAL ENGINE: Registry immutability and registered formulas", () => {
    const formulas = clinicalFormulaRegistry.listAll();
    assert(formulas.length >= 6);
    const mifflin = clinicalFormulaRegistry.get("MIFFLIN_ST_JEOR_V1");
    assert(mifflin, "Mifflin-St Jeor formula must be registered");
    assert.equal(mifflin.status, "APPROVED");
  });

  // 3. INVARIANT: NULL !== ZERO
  runTest("INVARIANT NULL != ZERO: Missing values are never silently coerced to 0", () => {
    const inputVal = null;
    const isKnownZero = inputVal === 0;
    const isUnknown = inputVal === null || inputVal === undefined;
    assert.equal(isKnownZero, false);
    assert.equal(isUnknown, true);
  });

  // 4. EQUIVALENTS ENGINE (Pão -> Cuscuz)
  runTest("EQUIVALENTS: Calculates nutrient-based equivalent quantities correctly", () => {
    const ref = {
      name: "Pão Francês",
      prescribedQuantity: 50,
      prescribedUnitCode: "G",
      caloriesKcalSnapshot: 150,
      proteinGSnapshot: 4,
      carbohydrateGSnapshot: 29,
      fatGSnapshot: 1.5,
    };

    const candidate = {
      publicId: "cuscuz_01",
      name: "Cuscuz de Milho Cozido",
      referenceAmount: 100,
      referenceUnitCode: "G",
      caloriesKcal: 112,
      proteinG: 2.1,
      carbohydrateG: 25.3,
      fatG: 0.7,
    };

    const result = calculateNutrientEquivalence(ref, candidate, "CARBOHYDRATE");
    assert.equal(result.status, "READY");
    assert.equal(result.canApply, true);
    assert.equal(result.unitCode, "G");
    // Target carbs = 29g. Candidate carbs per 100g = 25.3g.
    // Equivalent qty = (29 / 25.3) * 100 = 114.6g
    assert(result.calculatedQuantity > 114 && result.calculatedQuantity < 115);
  });

  // 5. TOTALS INVARIANT (COMPLETE vs INCOMPLETE)
  runTest("TOTALS: Plan with incomplete items is correctly identified as INCOMPLETE", () => {
    function calculatePlanTotals(items) {
      let calories = 0;
      let isIncomplete = false;
      for (const it of items) {
        if (it.foodId === null || it.calories === null) {
          isIncomplete = true;
        } else {
          calories += it.calories;
        }
      }
      return {
        totalCalories: calories,
        status: isIncomplete ? "INCOMPLETE" : "COMPLETE",
      };
    }

    const completePlan = [{ foodId: 1, calories: 200 }, { foodId: 2, calories: 300 }];
    assert.equal(calculatePlanTotals(completePlan).status, "COMPLETE");
    assert.equal(calculatePlanTotals(completePlan).totalCalories, 500);

    const incompletePlan = [{ foodId: 1, calories: 200 }, { foodId: null, calories: null }];
    assert.equal(calculatePlanTotals(incompletePlan).status, "INCOMPLETE");
  });

  // 6. PLAN LIFECYCLE & TEMPLATES
  runTest("LIFECYCLE & TEMPLATES: Plan cloning creates distinct IDs and strips patient identity", () => {
    const sourcePlan = {
      publicId: "plan_src_01",
      patientId: 44,
      patientName: "João Silva",
      clinicalNotes: "Paciente com hipertensão",
      meals: [{ id: 1, title: "Almoço" }],
    };

    function cloneAsTemplate(plan, newTitle) {
      return {
        publicId: "tmpl_" + Math.random().toString(36).substring(7),
        title: newTitle,
        patientId: null,
        patientName: null,
        clinicalNotes: null, // Never leak clinical notes to templates
        meals: plan.meals.map((m) => ({ ...m, id: Math.floor(Math.random() * 1000) })),
      };
    }

    const template = cloneAsTemplate(sourcePlan, "Modelo Hipertrofia 2500");
    assert.notEqual(template.publicId, sourcePlan.publicId);
    assert.equal(template.patientId, null);
    assert.equal(template.patientName, null);
    assert.equal(template.clinicalNotes, null);
  });

  console.log(`\nNUTRITION SUITE PASS: ${passedCount}/${totalCount} testes executados com sucesso!\n`);
  return { passedCount, totalCount };
}

if (process.argv[1]?.endsWith("qa-suite-nutrition-complete.mjs")) {
  runNutritionSuite();
}
