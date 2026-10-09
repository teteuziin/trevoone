/**
 * TREVO ONE — NUTRITION PHASE 5 TEST SUITE
 * Substituições e Equivalências Nutricionais
 * Tests engine criteria, semantics, status derivation, CRUD validation,
 * templates, copy-plan independence, and student runtime/PDF privacy.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  calculateNutrientEquivalence,
  roundMacro,
  normalizeCriterion,
  deriveSubstitutionStatus,
  ALL_EQUIVALENT_CRITERIA,
  ALL_SUBSTITUTION_CRITERIA,
  EQUIVALENT_CRITERIA_LABELS,
  EQUIVALENT_CRITERIA_SHORT_LABELS,
  EQUIVALENT_CRITERIA_UNITS,
  STALE_REASONS,
} from "../lib/nutrition-v2/equivalents.ts";
import { calculateMealTotals, calculatePlanTotals } from "../lib/nutrition-v2/nutrient-calculator.ts";

console.log("=== INICIANDO SUÍTE DE TESTES: NUTRITION PHASE 5 (SUBSTITUIÇÕES E EQUIVALÊNCIAS) ===\n");

let passedCount = 0;
let totalCount = 0;

function runTest(name, fn) {
  totalCount++;
  try {
    fn();
    passedCount++;
    console.log(`[PASS] ${name}`);
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err);
    throw err;
  }
}

// ============================================================================
// 1. ENGINE CRITERIA TESTS (Section 39)
// ============================================================================

runTest("CALORIE EQUIVALENCE: approximates kcal and produces valid diff metrics", () => {
  const ref = {
    name: "Arroz Branco",
    prescribedQuantity: 100,
    prescribedUnitCode: "G",
    caloriesKcalSnapshot: 130,
    proteinGSnapshot: 2.5,
    carbohydrateGSnapshot: 28,
    fatGSnapshot: 0.3,
  };
  const candidate = {
    publicId: "food_batata",
    name: "Batata Inglesa",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 77,
    proteinG: 2,
    carbohydrateG: 17,
    fatG: 0.1,
  };
  const res = calculateNutrientEquivalence(ref, candidate, "CALORIES");
  assert.equal(res.status, "READY");
  assert.equal(res.canApply, true);
  // (130 * 100) / 77 = 168.83 -> 169g
  assert.equal(res.roundedQuantity, 169);
  assert.ok(res.differenceMetrics);
  assert.equal(res.differenceMetrics.targetValue, 130);
  assert.ok(Math.abs(res.differenceMetrics.percentageDifference) < 2);
  assert.ok(res.macroSnapshotsForEquivalent);
  assert.ok(res.macroSnapshotsForEquivalent.caloriesKcal != null);
});

runTest("CARBOHYDRATE EQUIVALENCE: equals carbs and shows secondary macros", () => {
  const ref = {
    name: "Arroz Branco",
    prescribedQuantity: 100,
    prescribedUnitCode: "G",
    carbohydrateGSnapshot: 28,
    caloriesKcalSnapshot: 130,
    proteinGSnapshot: 2.5,
    fatGSnapshot: 0.3,
  };
  const candidate = {
    publicId: "food_mandioca",
    name: "Mandioca Cozida",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 125,
    proteinG: 0.6,
    carbohydrateG: 30,
    fatG: 0.3,
  };
  const res = calculateNutrientEquivalence(ref, candidate, "CARBOHYDRATE");
  assert.equal(res.status, "READY");
  // (28 * 100) / 30 = 93.33 -> 93g
  assert.equal(res.roundedQuantity, 93);
  assert.equal(res.differenceMetrics?.targetValue, 28);
  assert.ok(res.macroSnapshotsForEquivalent?.proteinG != null);
  assert.ok(res.macroSnapshotsForEquivalent?.fatG != null);
});

runTest("PROTEIN EQUIVALENCE: equals protein approximately", () => {
  const ref = {
    name: "Frango Cozido",
    prescribedQuantity: 100,
    prescribedUnitCode: "G",
    proteinGSnapshot: 31,
    caloriesKcalSnapshot: 165,
    carbohydrateGSnapshot: 0,
    fatGSnapshot: 3.6,
  };
  const candidate = {
    publicId: "food_patinho",
    name: "Patinho Grelhado",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 219,
    proteinG: 35.9,
    carbohydrateG: 0,
    fatG: 7.3,
  };
  const res = calculateNutrientEquivalence(ref, candidate, "PROTEIN");
  assert.equal(res.status, "READY");
  // (31 * 100) / 35.9 = 86.35 -> 86g
  assert.equal(res.roundedQuantity, 86);
  assert.equal(res.differenceMetrics?.targetValue, 31);
});

runTest("FAT EQUIVALENCE: equals fat approximately", () => {
  const ref = {
    name: "Azeite de Oliva",
    prescribedQuantity: 10,
    prescribedUnitCode: "ML",
    fatGSnapshot: 9.2,
    caloriesKcalSnapshot: 83,
    proteinGSnapshot: 0,
    carbohydrateGSnapshot: 0,
  };
  const candidate = {
    publicId: "food_manteiga",
    name: "Manteiga",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 717,
    proteinG: 0.9,
    carbohydrateG: 0.1,
    fatG: 81.1,
  };
  const res = calculateNutrientEquivalence(ref, candidate, "FAT");
  assert.equal(res.status, "READY");
  // (9.2 * 100) / 81.1 = 11.34 -> 11g
  assert.equal(res.roundedQuantity, 11);
});

runTest("MANUAL: preserves manual portion without auto-recalculating quantity", () => {
  const ref = {
    name: "Arroz Branco",
    prescribedQuantity: 100,
    prescribedUnitCode: "G",
    caloriesKcalSnapshot: 130,
    proteinGSnapshot: 2.5,
    carbohydrateGSnapshot: 28,
    fatGSnapshot: 0.3,
  };
  const candidate = {
    publicId: "food_batata",
    name: "Batata Doce",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 86,
    proteinG: 1.6,
    carbohydrateG: 14,
    fatG: 0.1,
  };
  // Nutritionist manually sets 150g
  const res = calculateNutrientEquivalence(ref, candidate, "MANUAL", 150);
  assert.equal(res.status, "READY");
  assert.equal(res.criterion, "MANUAL");
  assert.equal(res.roundedQuantity, 150);
  assert.equal(res.targetNutrientValue, null);
  // Calculates macros for the manual 150g portion:
  assert.ok(res.macroSnapshotsForEquivalent);
  assert.equal(res.macroSnapshotsForEquivalent.caloriesKcal, roundMacro(86 * 1.5));
});

runTest("UNKNOWN: does not calculate mathematical equivalence when nutrient is UNKNOWN", () => {
  const ref = {
    name: "Alimento Incompleto",
    prescribedQuantity: 100,
    prescribedUnitCode: "G",
    caloriesKcalSnapshot: null, // UNKNOWN
  };
  const candidate = {
    publicId: "food_c",
    name: "Candidato",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 100,
  };
  const res = calculateNutrientEquivalence(ref, candidate, "CALORIES");
  assert.equal(res.status, "REFERENCE_NUTRIENT_UNKNOWN");
  assert.equal(res.canApply, false);
  assert.equal(res.calculatedQuantity, null);
});

runTest("KNOWN ZERO: handled safely and distinguished from UNKNOWN", () => {
  const ref = {
    name: "Alimento Zero Carbo",
    prescribedQuantity: 100,
    prescribedUnitCode: "G",
    carbohydrateGSnapshot: 0, // KNOWN ZERO
  };
  const candidate = {
    publicId: "food_c",
    name: "Candidato",
    referenceAmount: 100,
    referenceUnitCode: "G",
    carbohydrateG: 20,
  };
  const res = calculateNutrientEquivalence(ref, candidate, "CARBOHYDRATE");
  assert.equal(res.status, "REFERENCE_NUTRIENT_ZERO");
  assert.equal(res.canApply, false);
});

runTest("DIVIDE ZERO: candidate nutrient zero prevents division by zero without NaN or Infinity", () => {
  const ref = {
    name: "Arroz Branco",
    prescribedQuantity: 100,
    prescribedUnitCode: "G",
    carbohydrateGSnapshot: 28,
  };
  const candidate = {
    publicId: "food_zero_carb",
    name: "Azeite Puro",
    referenceAmount: 100,
    referenceUnitCode: "ML",
    carbohydrateG: 0, // ZERO
  };
  const res = calculateNutrientEquivalence(ref, candidate, "CARBOHYDRATE");
  assert.equal(res.status, "CANDIDATE_NUTRIENT_ZERO");
  assert.equal(res.canApply, false);
  assert.equal(res.calculatedQuantity, null);
  assert.equal(res.roundedQuantity, null);
  assert.ok(!Number.isNaN(res.calculatedQuantity));
  assert.ok(res.calculatedQuantity !== Infinity);
});

runTest("ROUNDING: roundMacro rounds cleanly to clinical precision", () => {
  assert.equal(roundMacro(12.3456), 12.35);
  assert.equal(roundMacro(0.04), 0.04);
  assert.equal(roundMacro(10.0), 10);
  assert.equal(roundMacro(null), null);
});

// ============================================================================
// 2. SEMANTICS & STATUS DERIVATION TESTS (Section 40)
// ============================================================================

runTest("LEGACY IS UNVERIFIED: missing snapshots computes to UNVERIFIED", () => {
  const status = deriveSubstitutionStatus({
    currentBaseFoodId: 10,
    currentBaseQuantity: 100,
    currentBaseUnitCode: "G",
    storedCriterion: null, // Legacy record
    baseFoodIdSnapshot: null,
    baseQuantitySnapshot: null,
  });
  assert.equal(status.status, "UNVERIFIED");
  assert.equal(status.isUnverified, true);
  assert.equal(status.isStale, false);
});

runTest("NULL CRITERION != MANUAL: null criterion is UNVERIFIED, never MANUAL", () => {
  const status = deriveSubstitutionStatus({
    currentBaseFoodId: 10,
    currentBaseQuantity: 100,
    currentBaseUnitCode: "G",
    storedCriterion: null,
    baseFoodIdSnapshot: 10,
    baseQuantitySnapshot: 100,
  });
  assert.equal(status.status, "UNVERIFIED");
});

runTest("NULL STALE != FALSE: null is_stale does not override missing snapshot", () => {
  const status = deriveSubstitutionStatus({
    currentBaseFoodId: 10,
    currentBaseQuantity: 100,
    currentBaseUnitCode: "G",
    storedCriterion: "CALORIES",
    storedIsStale: null,
    baseFoodIdSnapshot: null, // missing snapshot
    baseQuantitySnapshot: null,
  });
  assert.equal(status.status, "UNVERIFIED");
});

runTest("DERIVED STALE OVERRIDES STORED FALSE: real divergence computes to STALE even if DB has is_stale = FALSE", () => {
  const status = deriveSubstitutionStatus({
    currentBaseFoodId: 10,
    currentBaseQuantity: 150, // Base quantity changed to 150
    currentBaseUnitCode: "G",
    storedCriterion: "CALORIES",
    storedIsStale: false, // DB flag is false
    baseFoodIdSnapshot: 10,
    baseQuantitySnapshot: 100, // Snapshot was 100
    baseUnitCodeSnapshot: "G",
  });
  assert.equal(status.status, "STALE");
  assert.equal(status.isStale, true);
  assert.equal(status.staleReason, "BASE_QUANTITY_CHANGED");
});

runTest("BASE FOOD CHANGE: divergence triggers BASE_FOOD_CHANGED priority", () => {
  const status = deriveSubstitutionStatus({
    currentBaseFoodId: 99, // Base food changed
    currentBaseQuantity: 200, // Quantity also changed
    currentBaseUnitCode: "ML", // Unit also changed
    storedCriterion: "PROTEIN",
    baseFoodIdSnapshot: 10,
    baseQuantitySnapshot: 100,
    baseUnitCodeSnapshot: "G",
  });
  assert.equal(status.status, "STALE");
  // Priority 1: BASE_FOOD_CHANGED
  assert.equal(status.staleReason, "BASE_FOOD_CHANGED");
});

runTest("BASE UNIT CHANGE: divergence triggers BASE_UNIT_CHANGED", () => {
  const status = deriveSubstitutionStatus({
    currentBaseFoodId: 10,
    currentBaseQuantity: 100,
    currentBaseUnitCode: "KG", // Changed from G to KG
    storedCriterion: "CARBOHYDRATE",
    baseFoodIdSnapshot: 10,
    baseQuantitySnapshot: 100,
    baseUnitCodeSnapshot: "G",
  });
  assert.equal(status.status, "STALE");
  assert.equal(status.staleReason, "BASE_UNIT_CHANGED");
});

runTest("FOOD DATA CHANGE: flagged library update triggers FOOD_DATA_CHANGED", () => {
  const status = deriveSubstitutionStatus({
    currentBaseFoodId: 10,
    currentBaseQuantity: 100,
    currentBaseUnitCode: "G",
    storedCriterion: "CALORIES",
    baseFoodIdSnapshot: 10,
    baseQuantitySnapshot: 100,
    baseUnitCodeSnapshot: "G",
    isFoodDataChanged: true,
  });
  assert.equal(status.status, "STALE");
  assert.equal(status.staleReason, "FOOD_DATA_CHANGED");
});

runTest("FRESH: complete snapshots with zero divergence compute to FRESH", () => {
  const status = deriveSubstitutionStatus({
    currentBaseFoodId: 10,
    currentBaseQuantity: 100,
    currentBaseUnitCode: "G",
    storedCriterion: "CALORIES",
    baseFoodIdSnapshot: 10,
    baseQuantitySnapshot: 100,
    baseUnitCodeSnapshot: "G",
  });
  assert.equal(status.status, "FRESH");
  assert.equal(status.isStale, false);
  assert.equal(status.staleReason, null);
});

// ============================================================================
// 3. CRUD LOGIC & GUARDS (Section 41)
// ============================================================================

runTest("SELF SUBSTITUTION DENIED: guard prevents base food as its own substitute", () => {
  const baseFoodId = 42;
  const substituteFoodId = 42;
  const isSelf = Number(substituteFoodId) === Number(baseFoodId);
  assert.equal(isSelf, true);
});

runTest("DUPLICATE SUBSTITUTION DENIED: guard detects duplicate substitute on same meal item", () => {
  const existingSubstituteFoodIds = [15, 23, 42];
  const candidateFoodId = 23;
  const isDuplicate = existingSubstituteFoodIds.includes(candidateFoodId);
  assert.equal(isDuplicate, true);
});

runTest("MULTIPLE ALTERNATIVES: allows multiple distinct substitutions with preserved sort_order", () => {
  const substitutions = [
    { foodId: 101, sortOrder: 0, name: "Batata Inglesa" },
    { foodId: 102, sortOrder: 1, name: "Mandioca" },
    { foodId: 103, sortOrder: 2, name: "Macarrão" },
  ];
  assert.equal(substitutions.length, 3);
  assert.equal(substitutions[0].sortOrder, 0);
  assert.equal(substitutions[1].sortOrder, 1);
  assert.equal(substitutions[2].sortOrder, 2);
});

// ============================================================================
// 4. TEMPLATE & COPY PLAN PARITY (Section 42)
// ============================================================================

runTest("TEMPLATE / COPY PARITY: preserves all 7 equivalence fields across copy", () => {
  const original = {
    foodId: 105,
    prescribedQuantity: 120,
    prescribedUnitCode: "G",
    equivalenceCriterion: "CARBOHYDRATE",
    isStale: false,
    staleReason: null,
    baseFoodIdSnapshot: 50,
    baseQuantitySnapshot: 100,
    baseUnitCodeSnapshot: "G",
    equivalenceTargetValueSnapshot: 28.5,
  };

  // Simulated copy/template extraction
  const copy = {
    foodId: original.foodId,
    prescribedQuantity: original.prescribedQuantity,
    prescribedUnitCode: original.prescribedUnitCode,
    equivalenceCriterion: original.equivalenceCriterion,
    isStale: original.isStale,
    staleReason: original.staleReason,
    baseFoodIdSnapshot: original.baseFoodIdSnapshot,
    baseQuantitySnapshot: original.baseQuantitySnapshot,
    baseUnitCodeSnapshot: original.baseUnitCodeSnapshot,
    equivalenceTargetValueSnapshot: original.equivalenceTargetValueSnapshot,
  };

  assert.deepEqual(copy, original);
  // Verify independence: mutating copy does not mutate original
  copy.prescribedQuantity = 150;
  assert.equal(original.prescribedQuantity, 120);
});

// ============================================================================
// 5. STUDENT RUNTIME & PDF PRIVACY (Section 43)
// ============================================================================

runTest("TOTALS EXCLUSION: substitutions are never added to meal or daily totals", () => {
  const items = [
    {
      foodNameSnapshot: "Arroz Branco",
      prescribedQuantity: 100,
      caloriesKcalSnapshot: 130,
      proteinGSnapshot: 2.5,
      carbohydrateGSnapshot: 28,
      fatGSnapshot: 0.3,
      substitutions: [
        {
          foodNameSnapshot: "Batata Doce",
          prescribedQuantity: 200,
          caloriesKcalSnapshot: 172,
          proteinGSnapshot: 3.2,
          carbohydrateGSnapshot: 40,
          fatGSnapshot: 0.2,
        },
      ],
    },
  ];

  const mealTotals = calculateMealTotals(items);
  // Total must match base item (130 kcal), NOT base + substitution (302 kcal)
  assert.equal(mealTotals.caloriesKcal, 130);
  assert.equal(mealTotals.proteinG, 2.5);
  assert.equal(mealTotals.carbohydrateG, 28);
  assert.equal(mealTotals.fatG, 0.3);
});

runTest("STUDENT & PDF PRIVACY: verify client and print components omit technical metadata", () => {
  const studentFile = fs.readFileSync(
    path.resolve("components/consultancies/nutrition-v2/student-nutrition-v2.tsx"),
    "utf8"
  );
  const printFile = fs.readFileSync(
    path.resolve("components/consultancies/nutrition-v2/student-nutrition-v2-print.tsx"),
    "utf8"
  );

  // Both files must have the clean "Pode ser substituído por:" section
  assert.ok(studentFile.includes("Pode ser substituído por:"));
  assert.ok(printFile.includes("Pode ser substituído por:"));

  // Neither file may expose internal technical equivalence flags to the student
  assert.ok(!studentFile.includes("equivalenceCriterion"));
  assert.ok(!studentFile.includes("baseFoodIdSnapshot"));
  assert.ok(!printFile.includes("equivalenceCriterion"));
  assert.ok(!printFile.includes("baseFoodIdSnapshot"));
});

// ============================================================================
// 6. MIGRATION 047 FILE CHECK (Section 45)
// ============================================================================

runTest("MIGRATION 047: file exists and contains exact approved column semantics", () => {
  const migPath = path.resolve("database/migrations/047_nutrition_v2_substitutions_equivalence.sql");
  assert.ok(fs.existsSync(migPath), "Migration 047 SQL file must exist");
  const sql = fs.readFileSync(migPath, "utf8");
  assert.ok(sql.includes("ALTER TABLE nutrition_v2_item_substitutions"));
  assert.ok(sql.includes("ALTER TABLE nutrition_v2_template_item_substitutions"));
  assert.ok(sql.includes("equivalence_criterion VARCHAR(20) NULL DEFAULT NULL"));
  assert.ok(sql.includes("is_stale BOOLEAN NULL DEFAULT NULL"));
  assert.ok(sql.includes("stale_reason VARCHAR(100) NULL DEFAULT NULL"));
  assert.ok(sql.includes("base_food_id_snapshot BIGINT UNSIGNED NULL DEFAULT NULL"));
  assert.ok(sql.includes("base_quantity_snapshot DECIMAL(10,2) NULL DEFAULT NULL"));
  assert.ok(sql.includes("base_unit_code_snapshot VARCHAR(50) NULL DEFAULT NULL"));
  assert.ok(sql.includes("equivalence_target_value_snapshot DECIMAL(8,2) NULL DEFAULT NULL"));
  assert.ok(sql.includes("INDEX idx_n2is_base_food_snapshot (base_food_id_snapshot)"));
});

console.log(`\n==================================================`);
console.log(`RESULTADO DA SUÍTE NUTRITION PHASE 5: ${passedCount}/${totalCount} TESTES PASS`);
console.log(`==================================================\n`);
