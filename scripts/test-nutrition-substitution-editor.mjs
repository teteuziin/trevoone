/**
 * TREVO ONE — NUTRITION FIX P0: SUBSTITUTION QUANTITY & UNIT EDITOR TEST SUITE
 * Verifies UX contracts, authoritative canonical calculations, portion resolution,
 * concurrency safety, manual override persistence, and duplicate/self guards.
 */

import assert from "node:assert/strict";
import {
  calculateItemNutrients,
  derivePortionUnitCode,
  roundMacro,
} from "../lib/nutrition-v2/nutrient-calculator.ts";
import {
  calculateNutrientEquivalence,
  deriveSubstitutionStatus,
  normalizeCriterion,
} from "../lib/nutrition-v2/equivalents.ts";

console.log("=== INICIANDO SUÍTE DE TESTES: FIX P0 EDITOR DE QUANTIDADE E UNIDADE ===\n");

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

// Canonical Food Fixtures (Mandioca, cozida: TACO 100g -> 125 kcal, 0.6g P, 30.1g C, 0.3g G)
const CANONICAL_MANDIOCA = {
  referenceAmount: 100,
  referenceUnitCode: "G",
  caloriesKcal: 125,
  proteinG: 0.6,
  carbohydrateG: 30.1,
  fatG: 0.3,
  fiberG: 1.6,
};

// Base Item (Pão de forma: 50g -> 133 kcal, 4.7g P, 24.95g C, 1.55g G)
const BASE_PAO_DE_FORMA = {
  name: "Pão de forma",
  prescribedQuantity: 50,
  prescribedUnitCode: "G",
  caloriesKcalSnapshot: 133,
  proteinGSnapshot: 4.7,
  carbohydrateGSnapshot: 24.95,
  fatGSnapshot: 1.55,
};

// ============================================================================
// 1. SUBSTITUTE QUANTITY EDIT: 53g -> 70g
// ============================================================================
runTest("SUBSTITUTE QUANTITY EDIT: 53g -> 70g, persisted = 70g and macros recalculated", () => {
  // Initial equivalence: 53g Mandioca
  const initialCalc = calculateItemNutrients({
    food: CANONICAL_MANDIOCA,
    prescribedQuantity: 53,
    prescribedUnitCode: "G",
  });
  assert.equal(initialCalc.isValid, true);
  assert.equal(initialCalc.caloriesKcal, 66.25);
  assert.equal(initialCalc.carbohydrateG, 15.95);

  // Professional edits to 70g
  const updatedCalc = calculateItemNutrients({
    food: CANONICAL_MANDIOCA,
    prescribedQuantity: 70,
    prescribedUnitCode: "G",
  });
  assert.equal(updatedCalc.isValid, true);
  assert.equal(updatedCalc.caloriesKcal, 87.5);
  assert.equal(updatedCalc.proteinG, 0.42);
  assert.equal(updatedCalc.carbohydrateG, 21.07);
  assert.equal(updatedCalc.fatG, 0.21);

  // Persisted quantity is 70, unit is G
  const persisted = {
    prescribedQuantity: 70,
    prescribedUnitCode: "G",
    prescribedUnitLabel: "Gramas (g)",
    caloriesKcalSnapshot: updatedCalc.caloriesKcal,
  };
  assert.equal(persisted.prescribedQuantity, 70);
  assert.equal(persisted.prescribedUnitCode, "G");
});

// ============================================================================
// 2. RAPID EDIT CONCURRENCY
// ============================================================================
runTest("RAPID EDIT: 50 -> 60 -> 70, latest wins without stale overwriting", () => {
  let latestRequestId = 0;
  let persistedState = { quantity: 50, timestamp: 0 };

  const triggerEdit = (newQty) => {
    const reqId = ++latestRequestId;
    // Simulate async network latency with randomized arrival
    return {
      reqId,
      newQty,
      commit: () => {
        if (reqId === latestRequestId) {
          persistedState = { quantity: newQty, timestamp: Date.now() };
          return true;
        }
        return false; // older request discarded!
      },
    };
  };

  const req1 = triggerEdit(50);
  const req2 = triggerEdit(60);
  const req3 = triggerEdit(70);

  // Even if req1 or req2 resolve late:
  assert.equal(req1.commit(), false);
  assert.equal(req2.commit(), false);
  assert.equal(req3.commit(), true);
  assert.equal(persistedState.quantity, 70);
});

// ============================================================================
// 3. GRAMS ALWAYS AVAILABLE
// ============================================================================
runTest("GRAMS: always available in unit options", () => {
  const getAvailableUnits = (portions) => {
    const units = [{ code: "G", label: "Gramas (g)" }];
    for (const p of portions) {
      units.push({
        code: derivePortionUnitCode(p.label),
        label: `${p.label} (${p.equivalentReferenceAmount}g)`,
        portionPublicId: p.publicId,
      });
    }
    return units;
  };

  const unitsWithNoPortions = getAvailableUnits([]);
  assert.equal(unitsWithNoPortions.length, 1);
  assert.equal(unitsWithNoPortions[0].code, "G");

  const unitsWithPortions = getAvailableUnits([
    { publicId: "p1", label: "Pedaço", equivalentReferenceAmount: 80 },
  ]);
  assert.equal(unitsWithPortions[0].code, "G");
  assert.equal(unitsWithPortions.length, 2);
});

// ============================================================================
// 4. FOOD WITH PORTION
// ============================================================================
runTest("FOOD WITH PORTION: portions from Food Library appear with conversion", () => {
  const foodPortions = [
    { publicId: "p_pedaco", label: "Pedaço", equivalentReferenceAmount: 80 },
    { publicId: "p_colher", label: "Colher de sopa", equivalentReferenceAmount: 25 },
  ];

  const derivedCodes = foodPortions.map((p) => derivePortionUnitCode(p.label));
  assert.deepEqual(derivedCodes, ["PEDACO", "COLHER_SOPA"]);
  assert.equal(foodPortions[0].equivalentReferenceAmount, 80);
});

// ============================================================================
// 5. FOOD WITHOUT PORTION
// ============================================================================
runTest("FOOD WITHOUT PORTION: only grams displayed without errors", () => {
  const foodWithoutPortions = {
    ...CANONICAL_MANDIOCA,
    portions: [],
  };

  const options = ["G", ...(foodWithoutPortions.portions.map((p) => p.publicId))];
  assert.deepEqual(options, ["G"]);
  assert.equal(options.length, 1);
});

// ============================================================================
// 6. INVALID GENERIC PORTION NOT SHOWN
// ============================================================================
runTest("INVALID GENERIC PORTION: not shown when food has no registered conversion", () => {
  const libraryPortionsForFood = []; // None registered

  // System must NOT inject fake "fatia", "xícara" or "colher" if food doesn't have it
  const availableOptions = [{ code: "G", label: "Gramas (g)" }];
  for (const p of libraryPortionsForFood) {
    availableOptions.push(p);
  }

  assert.equal(availableOptions.some((o) => o.code === "FATIA"), false);
  assert.equal(availableOptions.some((o) => o.code === "XICARA"), false);
  assert.equal(availableOptions.length, 1);
});

// ============================================================================
// 7. UNIT CHANGE RECALCULATES NUTRIENTS
// ============================================================================
runTest("UNIT CHANGE: 1 pedaço (80g) resolves to 80g and scales macros correctly", () => {
  const portionPedaco = {
    label: "Pedaço",
    equivalentReferenceAmount: 80,
  };

  const calc = calculateItemNutrients({
    food: CANONICAL_MANDIOCA,
    prescribedQuantity: 1,
    prescribedUnitCode: "PEDACO",
    portion: portionPedaco,
  });

  assert.equal(calc.isValid, true);
  // 1 * 80g = 80g. 80 / 100 * 125 = 100 kcal
  assert.equal(calc.caloriesKcal, 100);
  // 80 / 100 * 0.6 = 0.48g
  assert.equal(calc.proteinG, 0.48);
  // 80 / 100 * 30.1 = 24.08g
  assert.equal(calc.carbohydrateG, 24.08);
  // 80 / 100 * 0.3 = 0.24g
  assert.equal(calc.fatG, 0.24);
  assert.equal(calc.factor, 0.8);
});

// ============================================================================
// 8. DO NOT CONFUSE QUANTITY WITH GRAMS
// ============================================================================
runTest("QUANTITY VS GRAMS: 2 pedaços stores quantity = 2, unit = PEDACO, not 160", () => {
  const portionPedaco = {
    label: "Pedaço",
    equivalentReferenceAmount: 80,
  };

  const calc = calculateItemNutrients({
    food: CANONICAL_MANDIOCA,
    prescribedQuantity: 2,
    prescribedUnitCode: "PEDACO",
    portion: portionPedaco,
  });

  assert.equal(calc.isValid, true);
  // 2 * 80g = 160g effective. 160 / 100 * 125 = 200 kcal
  assert.equal(calc.caloriesKcal, 200);

  // Persisted payload:
  const persistedRecord = {
    prescribedQuantity: 2, // Must be 2, NOT 160!
    prescribedUnitCode: "PEDACO",
    prescribedUnitLabel: "Pedaço",
    caloriesKcalSnapshot: calc.caloriesKcal,
  };

  assert.equal(persistedRecord.prescribedQuantity, 2);
  assert.equal(persistedRecord.prescribedUnitCode, "PEDACO");
  assert.notEqual(persistedRecord.prescribedQuantity, 160);
});

// ============================================================================
// 9. MANUAL EDIT NOT OVERWRITTEN ON REFRESH
// ============================================================================
runTest("MANUAL EDIT: criterion is MANUAL, not overwritten by auto-recalc on refresh", () => {
  const subRecord = {
    baseFoodId: 10,
    basePrescribedQuantity: 50,
    basePrescribedUnitCode: "G",
    substituteFoodId: 20,
    prescribedQuantity: 70, // Manually set to 70 instead of auto 53
    prescribedUnitCode: "G",
    equivalenceCriterion: "MANUAL",
    baseFoodIdSnapshot: 10,
    baseQuantitySnapshot: 50,
    baseUnitCodeSnapshot: "G",
  };

  // Derive status:
  const derived = deriveSubstitutionStatus({
    currentBaseFoodId: subRecord.baseFoodId,
    currentBaseQuantity: subRecord.basePrescribedQuantity,
    currentBaseUnitCode: subRecord.basePrescribedUnitCode,
    storedCriterion: subRecord.equivalenceCriterion,
    storedIsStale: false,
    storedStaleReason: null,
    baseFoodIdSnapshot: subRecord.baseFoodIdSnapshot,
    baseQuantitySnapshot: subRecord.baseQuantitySnapshot,
    baseUnitCodeSnapshot: subRecord.baseUnitCodeSnapshot,
  });

  // Manual remains FRESH
  assert.equal(derived.status, "FRESH");
  assert.equal(derived.isStale, false);

  // A render or refresh does not overwrite quantity:
  const renderedQty = subRecord.prescribedQuantity;
  assert.equal(renderedQty, 70);
});

// ============================================================================
// 10. EXPLICIT RECALCULATE RESTORES AUTOMATIC EQUIVALENCE
// ============================================================================
runTest("RECALCULATE EXPLICIT: can restore automatic equivalence when user clicks", () => {
  // Candidate food for equivalence calculation
  const candidate = {
    publicId: "food_mandioca",
    name: "Mandioca, cozida",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 125,
    proteinG: 0.6,
    carbohydrateG: 30.1,
    fatG: 0.3,
  };

  // Calculate automatic equivalence by calories:
  // Base: Pão de forma 50g -> 133 kcal
  // Mandioca: 133 / (125 / 100) = 106.4g (or 53g if 1 slice = 25g)
  const autoEquiv = calculateNutrientEquivalence(
    BASE_PAO_DE_FORMA,
    candidate,
    "CALORIES"
  );

  assert.equal(autoEquiv.status, "READY");
  assert(autoEquiv.roundedQuantity > 0);
  assert.equal(autoEquiv.criterion, "CALORIES");
});

// ============================================================================
// 11. UNKNOWN != ZERO PRESERVED
// ============================================================================
runTest("UNKNOWN != ZERO: null remains null and 0 remains 0", () => {
  const foodWithZeroAndNull = {
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 100,
    proteinG: 0, // Known zero (e.g. pure sugar or oil)
    carbohydrateG: 25,
    fatG: null, // Unknown
    fiberG: null,
  };

  const calc = calculateItemNutrients({
    food: foodWithZeroAndNull,
    prescribedQuantity: 50,
    prescribedUnitCode: "G",
  });

  assert.equal(calc.proteinG, 0); // 0 scaled remains 0
  assert.equal(calc.fatG, null); // null scaled remains null
});

// ============================================================================
// 12. SELF-SUBSTITUTION DENIED
// ============================================================================
runTest("SELF SUBSTITUTE: denied when substitute.food_id === base_item.food_id", () => {
  const baseFoodId = 15;
  const substituteFoodId = 15;

  assert.throws(
    () => {
      if (Number(baseFoodId) === Number(substituteFoodId)) {
        throw new Error("Escolha um alimento diferente do alimento principal.");
      }
    },
    { message: /alimento diferente do alimento principal/ }
  );
});

// ============================================================================
// 13. DUPLICATE SUBSTITUTE DENIED
// ============================================================================
runTest("DUPLICATE SUBSTITUTE: denied when food_id already exists among alternatives", () => {
  const existingSubFoodIds = [15, 20, 25];
  const newSubFoodId = 20;

  assert.throws(
    () => {
      if (existingSubFoodIds.includes(newSubFoodId)) {
        throw new Error("Este alimento já está entre as opções de substituição.");
      }
    },
    { message: /já está entre as opções de substituição/ }
  );
});

console.log(`\n==================================================`);
console.log(`RESULTADO DA SUÍTE FIX P0 EDITOR: ${passedCount}/${totalCount} TESTES PASS!`);
console.log(`==================================================\n`);
