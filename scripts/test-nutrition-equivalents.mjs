/**
 * TREVO ONE — NUTRITION EQUIVALENTS MATHEMATICAL TEST SUITE (RELEASE F)
 * Tests all mathematical formulas, dynamic reference amounts, edge cases,
 * division-by-zero protection, mass & volume preservation, portion suggestions,
 * anchor semantics, and non-regression guarantees (Tests A through R).
 */

import assert from "node:assert/strict";
import {
  calculateNutrientEquivalence,
  convertRefAmountToCanonical,
  convertRefAmountToGrams,
  roundMacro,
  calculateMacroFactor,
  normalizeCriterion,
  findBestPortionSuggestion,
  ALL_EQUIVALENT_CRITERIA,
  EQUIVALENT_CRITERIA_LABELS,
} from "../lib/nutrition-v2/equivalents.ts";

console.log("=== INICIANDO SUÍTE DE TESTES MATEMÁTICOS: EQUIVALENTES V2 (RELEASE F) ===\n");

// ----------------------------------------------------------------------------
// TEST A: 100g ref / 100g candidate
// ----------------------------------------------------------------------------
{
  const ref = {
    name: "Arroz Branco Cozido",
    prescribedQuantity: 100,
    prescribedUnitCode: "G",
    caloriesKcalSnapshot: 130,
    proteinGSnapshot: 2.5,
    carbohydrateGSnapshot: 28,
    fatGSnapshot: 0.3,
  };

  const candidate = {
    publicId: "food_cand_a",
    name: "Batata Doce",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 86,
    proteinG: 1.6,
    carbohydrateG: 14,
    fatG: 0.1,
  };

  const result = calculateNutrientEquivalence(ref, candidate, "CARBOHYDRATE");
  assert.equal(result.status, "READY");
  assert.equal(result.canApply, true);
  assert.equal(result.unitCode, "G");
  // 28 * 100 / 14 = 200 g
  assert.equal(result.calculatedQuantity, 200);
  assert.equal(result.roundedQuantity, 200);
  assert.equal(result.formattedQuantity, "200 g");
  assert.equal(result.differenceMetrics.targetValue, 28);
  assert.equal(result.differenceMetrics.candidateCalculatedValue, 28);
  assert.equal(result.differenceMetrics.absoluteDifference, 0);
  assert.equal(result.differenceMetrics.percentageDifference, 0);

  console.log("✓ TEST A PASS: 100g ref / 100g candidate (28 / 14 * 100 = 200 g)");
}

// ----------------------------------------------------------------------------
// TEST B: 150g reference scales target
// Reference: 20g protein per 100g, prescribed = 150g -> target = 30g
// Candidate: 15g protein per 100g -> 30 * 100 / 15 = 200 g
// ----------------------------------------------------------------------------
{
  const ref = {
    name: "Frango de Referência",
    referenceAmount: 100,
    referenceUnitCode: "G",
    proteinG: 20,
    prescribedQuantity: 150,
    prescribedUnitCode: "G",
  };

  const candidate = {
    publicId: "food_cand_b",
    name: "Peixe Candidato",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 120,
    proteinG: 15,
    carbohydrateG: 0,
    fatG: 2,
  };

  const result = calculateNutrientEquivalence(ref, candidate, "PROTEIN");
  assert.equal(result.status, "READY");
  assert.equal(result.targetNutrientValue, 30);
  assert.equal(result.roundedQuantity, 200);
  assert.equal(result.unitCode, "G");
  assert.equal(result.formattedQuantity, "200 g");

  console.log("✓ TEST B PASS: 150g reference scales target (target = 30g -> candidate = 200 g)");
}

// ----------------------------------------------------------------------------
// TEST C: candidate reference_amount != 100
// Candidate: referenceAmount = 50g, 10g protein
// Target: 20g protein
// Expected: 20 * 50 / 10 = 100 g
// ----------------------------------------------------------------------------
{
  const ref = {
    name: "Ovo Cozido",
    prescribedQuantity: 2,
    prescribedUnitCode: "UNIDADE",
    proteinGSnapshot: 20,
  };

  const candidate = {
    publicId: "food_cand_c",
    name: "Barra de Proteína",
    referenceAmount: 50, // Reference is 50g, NOT 100g!
    referenceUnitCode: "G",
    caloriesKcal: 200,
    proteinG: 10,
    carbohydrateG: 15,
    fatG: 5,
  };

  const result = calculateNutrientEquivalence(ref, candidate, "PROTEIN");
  assert.equal(result.status, "READY");
  assert.equal(result.calculatedQuantity, 100);
  assert.equal(result.roundedQuantity, 100);
  assert.equal(result.formattedQuantity, "100 g");

  console.log("✓ TEST C PASS: candidate reference_amount != 100 (50g ref -> 100 g)");
}

// ----------------------------------------------------------------------------
// TEST D: ML candidate remains ML
// Candidate: referenceAmount = 200 ML, protein = 10g
// Target: 5g protein
// Expected: 5 * 200 / 10 = 100 ML
// ----------------------------------------------------------------------------
{
  const ref = {
    name: "Alimento Sólido",
    prescribedQuantity: 50,
    prescribedUnitCode: "G",
    proteinGSnapshot: 5,
  };

  const candidate = {
    publicId: "food_cand_d",
    name: "Bebida Láctea",
    referenceAmount: 200,
    referenceUnitCode: "ML",
    caloriesKcal: 140,
    proteinG: 10,
    carbohydrateG: 15,
    fatG: 2,
  };

  const result = calculateNutrientEquivalence(ref, candidate, "PROTEIN");
  assert.equal(result.status, "READY");
  assert.equal(result.unitCode, "ML");
  assert.equal(result.calculatedQuantity, 100);
  assert.equal(result.roundedQuantity, 100);
  assert.equal(result.formattedQuantity, "100 ml");

  console.log("✓ TEST D PASS: ML candidate remains ML (100 ml, never converted to grams)");
}

// ----------------------------------------------------------------------------
// TEST E: G candidate remains G
// Candidate: referenceAmount = 100 G, protein = 25g
// Target: 50g protein
// Expected: 50 * 100 / 25 = 200 G
// ----------------------------------------------------------------------------
{
  const ref = {
    name: "Whey Protein",
    prescribedQuantity: 60,
    prescribedUnitCode: "G",
    proteinGSnapshot: 50,
  };

  const candidate = {
    publicId: "food_cand_e",
    name: "Peito de Frango",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 165,
    proteinG: 25,
    carbohydrateG: 0,
    fatG: 3.5,
  };

  const result = calculateNutrientEquivalence(ref, candidate, "PROTEIN");
  assert.equal(result.status, "READY");
  assert.equal(result.unitCode, "G");
  assert.equal(result.calculatedQuantity, 200);
  assert.equal(result.roundedQuantity, 200);
  assert.equal(result.formattedQuantity, "200 g");

  console.log("✓ TEST E PASS: G candidate remains G (200 g)");
}

// ----------------------------------------------------------------------------
// TEST F: no ML -> G universal
// Unconvertible dimensions (e.g. UNIDADE without portion/mass) are strictly rejected
// ----------------------------------------------------------------------------
{
  const ref = {
    name: "Alimento Padrão",
    prescribedQuantity: 100,
    prescribedUnitCode: "G",
    caloriesKcalSnapshot: 200,
    proteinGSnapshot: 20,
  };

  const candidate = {
    publicId: "food_cand_f",
    name: "Item Unitário Sem Massa",
    referenceAmount: 1,
    referenceUnitCode: "UNIDADE",
    caloriesKcal: 100,
    proteinG: 10,
    carbohydrateG: 10,
    fatG: 2,
  };

  const result = calculateNutrientEquivalence(ref, candidate, "PROTEIN");
  assert.equal(result.status, "INCOMPATIBLE_DIMENSIONS");
  assert.equal(result.canApply, false);
  assert(result.message.includes("não é compatível para cálculo canônico direto"));

  console.log("✓ TEST F PASS: no ML -> G universal (rejeita unidades arbitrárias sem conversão canônica)");
}

// ----------------------------------------------------------------------------
// TEST G: reference UNKNOWN (null/undefined)
// ----------------------------------------------------------------------------
{
  const ref = {
    name: "Alimento sem informação de carboidrato",
    prescribedQuantity: 100,
    prescribedUnitCode: "G",
    caloriesKcalSnapshot: 100,
    proteinGSnapshot: 20,
    carbohydrateGSnapshot: null, // UNKNOWN!
    fatGSnapshot: 5,
  };

  const candidate = {
    publicId: "food_cand_g",
    name: "Arroz",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 130,
    proteinG: 2.5,
    carbohydrateG: 28,
    fatG: 0.3,
  };

  const result = calculateNutrientEquivalence(ref, candidate, "CARBOHYDRATE");
  assert.equal(result.status, "REFERENCE_NUTRIENT_UNKNOWN");
  assert.equal(result.canApply, false);
  assert.equal(result.targetNutrientValue, null);

  console.log("✓ TEST G PASS: reference UNKNOWN returns REFERENCE_NUTRIENT_UNKNOWN (null != 0)");
}

// ----------------------------------------------------------------------------
// TEST H: candidate UNKNOWN (null/undefined)
// ----------------------------------------------------------------------------
{
  const ref = {
    name: "Alimento Completo",
    prescribedQuantity: 100,
    prescribedUnitCode: "G",
    caloriesKcalSnapshot: 200,
    proteinGSnapshot: 20,
    carbohydrateGSnapshot: 15,
    fatGSnapshot: 5,
  };

  const candidate = {
    publicId: "food_cand_h",
    name: "Alimento Candidato Incompleto",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 100,
    proteinG: null, // UNKNOWN!
    carbohydrateG: 20,
    fatG: 2,
  };

  const result = calculateNutrientEquivalence(ref, candidate, "PROTEIN");
  assert.equal(result.status, "CANDIDATE_NUTRIENT_UNKNOWN");
  assert.equal(result.canApply, false);

  console.log("✓ TEST H PASS: candidate UNKNOWN returns CANDIDATE_NUTRIENT_UNKNOWN");
}

// ----------------------------------------------------------------------------
// TEST I: reference zero
// Target nutrient is 0 -> REFERENCE_NUTRIENT_ZERO (no useless 0g results)
// ----------------------------------------------------------------------------
{
  const ref = {
    name: "Azeite de Oliva",
    prescribedQuantity: 15,
    prescribedUnitCode: "ML",
    caloriesKcalSnapshot: 120,
    proteinGSnapshot: 0, // 0g protein!
    carbohydrateGSnapshot: 0,
    fatGSnapshot: 14,
  };

  const candidate = {
    publicId: "food_cand_i",
    name: "Frango",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 165,
    proteinG: 31,
    carbohydrateG: 0,
    fatG: 3.5,
  };

  const result = calculateNutrientEquivalence(ref, candidate, "PROTEIN");
  assert.equal(result.status, "REFERENCE_NUTRIENT_ZERO");
  assert.equal(result.canApply, false);
  assert(result.message.includes("igual a zero ou insignificante"));

  console.log("✓ TEST I PASS: reference zero returns REFERENCE_NUTRIENT_ZERO");
}

// ----------------------------------------------------------------------------
// TEST J: candidate zero
// Candidate nutrient is 0 -> CANDIDATE_NUTRIENT_ZERO (division by zero protected)
// ----------------------------------------------------------------------------
{
  const ref = {
    name: "Frango",
    prescribedQuantity: 100,
    prescribedUnitCode: "G",
    proteinGSnapshot: 31,
  };

  const candidate = {
    publicId: "food_cand_j",
    name: "Açúcar",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 387,
    proteinG: 0, // 0g protein!
    carbohydrateG: 100,
    fatG: 0,
  };

  const result = calculateNutrientEquivalence(ref, candidate, "PROTEIN");
  assert.equal(result.status, "CANDIDATE_NUTRIENT_ZERO");
  assert.equal(result.canApply, false);
  assert(result.message.includes("Divisão por zero prevenida"));

  console.log("✓ TEST J PASS: candidate zero returns CANDIDATE_NUTRIENT_ZERO (no division by zero)");
}

// ----------------------------------------------------------------------------
// TEST K: decimal result
// Raw calculation retains floating point precision without premature rounding
// ----------------------------------------------------------------------------
{
  const ref = {
    name: "Item",
    prescribedQuantity: 100,
    prescribedUnitCode: "G",
    proteinGSnapshot: 10,
  };

  const candidate = {
    publicId: "food_cand_k",
    name: "Candidato",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 100,
    proteinG: 3, // 10 * 100 / 3 = 333.3333333333333
    carbohydrateG: 10,
    fatG: 2,
  };

  const result = calculateNutrientEquivalence(ref, candidate, "PROTEIN");
  assert.equal(result.status, "READY");
  assert(Math.abs(result.calculatedQuantity - 333.333333) < 0.001);
  assert.equal(result.roundedQuantity, 333);

  console.log("✓ TEST K PASS: decimal result (raw float precision 333.333... retained)");
}

// ----------------------------------------------------------------------------
// TEST L: percentage difference
// Explicit difference metrics: targetValue, candidateCalculatedValue, absoluteDifference, percentageDifference
// ----------------------------------------------------------------------------
{
  const ref = {
    name: "3 Ovos",
    prescribedQuantity: 3,
    prescribedUnitCode: "UNIDADE",
    caloriesKcalSnapshot: 273,
    proteinGSnapshot: 18,
    carbohydrateGSnapshot: 1.5,
    fatGSnapshot: 20,
  };

  const candidate = {
    publicId: "food_chicken",
    name: "Filé de Frango",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 170,
    proteinG: 31,
    carbohydrateG: 0,
    fatG: 5,
  };

  const result = calculateNutrientEquivalence(ref, candidate, "CALORIES");
  assert.equal(result.status, "READY");
  assert.equal(result.roundedQuantity, 161);
  // target = 273 kcal
  // candidate 161g calories = 170 * (161/100) = 273.7 kcal
  // absoluteDifference = 273.7 - 273 = 0.7 kcal
  // percentageDifference = (0.7 / 273) * 100 = +0.3%
  assert.equal(result.differenceMetrics.targetValue, 273);
  assert.equal(result.differenceMetrics.candidateCalculatedValue, 273.7);
  assert.equal(result.differenceMetrics.absoluteDifference, 0.7);
  assert.equal(result.differenceMetrics.percentageDifference, 0.3);

  console.log("✓ TEST L PASS: percentage difference (target 273, calc 273.7 -> diff +0.7 kcal / +0.3%)");
}

// ----------------------------------------------------------------------------
// TEST M: first food always anchor
// Calculating A -> B, A -> C, A -> D: A remains constant anchor
// ----------------------------------------------------------------------------
{
  const anchorA = {
    name: "Arroz Branco",
    prescribedQuantity: 100,
    prescribedUnitCode: "G",
    carbohydrateGSnapshot: 28,
  };

  const foodB = {
    publicId: "b",
    name: "Batata Doce",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 86,
    proteinG: 1.6,
    carbohydrateG: 14,
    fatG: 0.1,
  };

  const foodC = {
    publicId: "c",
    name: "Mandioca",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 160,
    proteinG: 1.4,
    carbohydrateG: 38,
    fatG: 0.3,
  };

  const resB = calculateNutrientEquivalence(anchorA, foodB, "CARBOHYDRATE");
  const resC = calculateNutrientEquivalence(anchorA, foodC, "CARBOHYDRATE");

  assert.equal(resB.targetNutrientValue, 28);
  assert.equal(resC.targetNutrientValue, 28);
  assert.equal(resB.roundedQuantity, 200); // 28 * 100 / 14 = 200
  assert.equal(resC.roundedQuantity, 74);  // 28 * 100 / 38 = 73.68 -> 74

  console.log("✓ TEST M PASS: first food always anchor (A -> B: 200g, A -> C: 74g)");
}

// ----------------------------------------------------------------------------
// TEST N: changing criterion recalculates
// Switching from PROTEIN to CALORIES recalcs candidate quantity
// ----------------------------------------------------------------------------
{
  const ref = {
    name: "Ovo Cozido",
    prescribedQuantity: 2,
    prescribedUnitCode: "UNIDADE",
    caloriesKcalSnapshot: 140,
    proteinGSnapshot: 12,
  };

  const candidate = {
    publicId: "food_whey",
    name: "Whey Protein 80%",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 400,
    proteinG: 80,
    carbohydrateG: 5,
    fatG: 6,
  };

  const resProtein = calculateNutrientEquivalence(ref, candidate, "PROTEIN");
  // 12 * 100 / 80 = 15 g
  assert.equal(resProtein.roundedQuantity, 15);

  const resCalories = calculateNutrientEquivalence(ref, candidate, "CALORIES");
  // 140 * 100 / 400 = 35 g
  assert.equal(resCalories.roundedQuantity, 35);

  assert.notEqual(resProtein.roundedQuantity, resCalories.roundedQuantity);

  console.log("✓ TEST N PASS: changing criterion recalculates (PROTEIN: 15g vs CALORIES: 35g)");
}

// ----------------------------------------------------------------------------
// TEST O: changing first food recalculates
// Switching anchor from Ref1 to Ref2 updates target and candidate quantity
// ----------------------------------------------------------------------------
{
  const candidate = {
    publicId: "food_chicken",
    name: "Frango",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 165,
    proteinG: 30,
    carbohydrateG: 0,
    fatG: 3,
  };

  const ref1 = {
    name: "Ovo Pequeno",
    prescribedQuantity: 1,
    prescribedUnitCode: "UNIDADE",
    proteinGSnapshot: 6,
  };

  const ref2 = {
    name: "Ovo Triplo",
    prescribedQuantity: 3,
    prescribedUnitCode: "UNIDADE",
    proteinGSnapshot: 18,
  };

  const res1 = calculateNutrientEquivalence(ref1, candidate, "PROTEIN");
  const res2 = calculateNutrientEquivalence(ref2, candidate, "PROTEIN");

  // Ref 1: 6 * 100 / 30 = 20 g
  assert.equal(res1.roundedQuantity, 20);

  // Ref 2: 18 * 100 / 30 = 60 g
  assert.equal(res2.roundedQuantity, 60);

  console.log("✓ TEST O PASS: changing first food recalculates (Anchor 1: 20g vs Anchor 2: 60g)");
}

// ----------------------------------------------------------------------------
// TEST P: portion suggestion uses food-specific conversion
// 45g with 15g portion -> ≈ 3 colheres de sopa (15 g cada)
// ----------------------------------------------------------------------------
{
  const candidateWithPortion = {
    publicId: "food_oil",
    name: "Azeite de Oliva",
    referenceAmount: 100,
    referenceUnitCode: "ML",
    caloriesKcal: 884,
    proteinG: 0,
    carbohydrateG: 0,
    fatG: 100,
    portions: [
      {
        publicId: "portion_colher",
        label: "colheres de sopa",
        equivalentReferenceAmount: 15,
        status: "ACTIVE",
      },
    ],
  };

  const ref = {
    name: "Manteiga",
    prescribedQuantity: 50,
    prescribedUnitCode: "G",
    caloriesKcalSnapshot: 350,
    proteinGSnapshot: 0.5,
    carbohydrateGSnapshot: 0.5,
    fatGSnapshot: 45, // 45g fat
  };

  const result = calculateNutrientEquivalence(ref, candidateWithPortion, "FAT");
  assert.equal(result.status, "READY");
  assert.equal(result.roundedQuantity, 45); // 45 * 100 / 100 = 45 ml
  assert.notEqual(result.portionSuggestion, null);
  assert.equal(result.portionSuggestion.portionCount, 3);
  assert.equal(result.portionSuggestion.formattedText, "≈ 3 colheres de sopa (15 ml cada)");

  console.log("✓ TEST P PASS: portion suggestion uses food-specific conversion (45 ml ≈ 3 colheres de sopa)");
}

// ----------------------------------------------------------------------------
// TEST Q: no portion = canonical quantity only
// ----------------------------------------------------------------------------
{
  const candidateNoPortion = {
    publicId: "food_no_portion",
    name: "Alimento Sem Porções",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 200,
    proteinG: 20,
    carbohydrateG: 0,
    fatG: 2,
    portions: [],
  };

  const ref = {
    name: "Item Ref",
    prescribedQuantity: 100,
    prescribedUnitCode: "G",
    proteinGSnapshot: 20,
  };

  const result = calculateNutrientEquivalence(ref, candidateNoPortion, "PROTEIN");
  assert.equal(result.status, "READY");
  assert.equal(result.roundedQuantity, 100);
  assert.equal(result.portionSuggestion, null);

  console.log("✓ TEST Q PASS: no portion = canonical quantity only (portionSuggestion is null)");
}

// ----------------------------------------------------------------------------
// TEST R: null != zero
// Explicit test proving null nutrient behaves differently from 0 nutrient
// ----------------------------------------------------------------------------
{
  const refNull = {
    name: "Ref Null",
    prescribedQuantity: 100,
    prescribedUnitCode: "G",
    proteinGSnapshot: null,
  };

  const refZero = {
    name: "Ref Zero",
    prescribedQuantity: 100,
    prescribedUnitCode: "G",
    proteinGSnapshot: 0,
  };

  const candValid = {
    publicId: "cand_valid",
    name: "Valid Food",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 100,
    proteinG: 20,
    carbohydrateG: 0,
    fatG: 0,
  };

  const resNull = calculateNutrientEquivalence(refNull, candValid, "PROTEIN");
  const resZero = calculateNutrientEquivalence(refZero, candValid, "PROTEIN");

  assert.equal(resNull.status, "REFERENCE_NUTRIENT_UNKNOWN");
  assert.equal(resZero.status, "REFERENCE_NUTRIENT_ZERO");
  assert.notEqual(resNull.status, resZero.status);

  const candNull = {
    publicId: "cand_null",
    name: "Cand Null",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 100,
    proteinG: null,
    carbohydrateG: 0,
    fatG: 0,
  };

  const candZero = {
    publicId: "cand_zero",
    name: "Cand Zero",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 100,
    proteinG: 0,
    carbohydrateG: 0,
    fatG: 0,
  };

  const refGood = {
    name: "Ref Good",
    prescribedQuantity: 100,
    prescribedUnitCode: "G",
    proteinGSnapshot: 20,
  };

  const resCandNull = calculateNutrientEquivalence(refGood, candNull, "PROTEIN");
  const resCandZero = calculateNutrientEquivalence(refGood, candZero, "PROTEIN");

  assert.equal(resCandNull.status, "CANDIDATE_NUTRIENT_UNKNOWN");
  assert.equal(resCandZero.status, "CANDIDATE_NUTRIENT_ZERO");
  assert.notEqual(resCandNull.status, resCandZero.status);

  console.log("✓ TEST R PASS: null != zero (distinct status codes for null vs zero)");
}

// ----------------------------------------------------------------------------
// TEST S: CANONICAL CRITERIA & BOUNDARY NORMALIZATION CONTRACT
// Proves ENERGY -> CALORIES, CARBS -> CARBOHYDRATE, and canonical output never returns aliases
// ----------------------------------------------------------------------------
{
  assert.equal(normalizeCriterion("ENERGY"), "CALORIES");
  assert.equal(normalizeCriterion("energy"), "CALORIES");
  assert.equal(normalizeCriterion("CARBS"), "CARBOHYDRATE");
  assert.equal(normalizeCriterion("carbs"), "CARBOHYDRATE");
  assert.equal(normalizeCriterion("CALORIES"), "CALORIES");
  assert.equal(normalizeCriterion("PROTEIN"), "PROTEIN");
  assert.equal(normalizeCriterion("CARBOHYDRATE"), "CARBOHYDRATE");
  assert.equal(normalizeCriterion("FAT"), "FAT");

  // Output must never return non-canonical criterion even when called with ENERGY or CARBS
  const ref = {
    name: "Ref Food",
    prescribedQuantity: 100,
    prescribedUnitCode: "G",
    caloriesKcalSnapshot: 200,
    carbohydrateGSnapshot: 50,
  };
  const cand = {
    publicId: "cand_food",
    name: "Cand Food",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 250,
    carbohydrateG: 60,
  };

  const resEnergy = calculateNutrientEquivalence(ref, cand, "ENERGY");
  assert.equal(resEnergy.criterion, "CALORIES");
  assert.notEqual(resEnergy.criterion, "ENERGY");

  const resCarbs = calculateNutrientEquivalence(ref, cand, "CARBS");
  assert.equal(resCarbs.criterion, "CARBOHYDRATE");
  assert.notEqual(resCarbs.criterion, "CARBS");

  // Domain map checks: ONLY the 4 canonical criteria exist in ALL_EQUIVALENT_CRITERIA
  assert.deepEqual([...ALL_EQUIVALENT_CRITERIA].sort(), ["CALORIES", "CARBOHYDRATE", "FAT", "PROTEIN"].sort());
  assert.equal(EQUIVALENT_CRITERIA_LABELS["ENERGY"], undefined);
  assert.equal(EQUIVALENT_CRITERIA_LABELS["CARBS"], undefined);

  console.log("✓ TEST S PASS: ENERGY/CARBS normalized at boundary, canonical output never returns aliases");
}

// ----------------------------------------------------------------------------
// TEST T: ABSOLUTE DIFFERENCE CONTRACT (ALWAYS >= 0)
// Proves absoluteDifference is positive when candidate > target,
// AND positive when candidate < target.
// ----------------------------------------------------------------------------
{
  // Scenario 1: candidateCalculatedValue > targetValue
  // Reference target = 100 kcal
  // Candidate provides 100.2 kcal -> candidate > target
  const ref1 = {
    name: "Alvo 100",
    prescribedQuantity: 100,
    prescribedUnitCode: "G",
    caloriesKcalSnapshot: 100,
  };
  const cand1 = {
    publicId: "cand_above",
    name: "Cand Above",
    referenceAmount: 100,
    referenceUnitCode: "G",
    // 100 * 100 / 70 = 142.857 -> 143 g -> 70 * 1.43 = 100.1 kcal
    caloriesKcal: 70,
  };
  const resAbove = calculateNutrientEquivalence(ref1, cand1, "CALORIES");
  assert.equal(resAbove.differenceMetrics.candidateCalculatedValue, 100.1);
  assert.equal(resAbove.differenceMetrics.targetValue, 100);
  assert(resAbove.differenceMetrics.candidateCalculatedValue > resAbove.differenceMetrics.targetValue, "Candidate value must be > target");
  assert.equal(resAbove.differenceMetrics.absoluteDifference, 0.1);
  assert(resAbove.differenceMetrics.absoluteDifference > 0, "absoluteDifference must be > 0 when candidate > target");
  assert(resAbove.differenceMetrics.percentageDifference > 0, "percentageDifference must remain directional (+0.1%)");

  // Scenario 2: candidateCalculatedValue < targetValue
  // Reference target = 100 kcal
  // Candidate with rounding produces 99.9 kcal -> candidate < target
  const cand2 = {
    publicId: "cand_below",
    name: "Cand Below",
    referenceAmount: 100,
    referenceUnitCode: "G",
    // 100 * 100 / 90 = 111.11 -> 111 g -> 90 * 1.11 = 99.9 kcal
    caloriesKcal: 90,
  };
  const resBelow = calculateNutrientEquivalence(ref1, cand2, "CALORIES");
  assert(resBelow.differenceMetrics.candidateCalculatedValue < resBelow.differenceMetrics.targetValue, "Candidate value must be < target");
  assert.equal(resBelow.differenceMetrics.candidateCalculatedValue, 99.9);
  assert.equal(resBelow.differenceMetrics.targetValue, 100);
  assert.equal(resBelow.differenceMetrics.absoluteDifference, 0.1);
  assert(resBelow.differenceMetrics.absoluteDifference > 0, "absoluteDifference must be > 0 when candidate < target");
  assert(resBelow.differenceMetrics.percentageDifference < 0, "percentageDifference must remain directional (-0.1%)");

  console.log("✓ TEST T PASS: absoluteDifference is strictly >= 0 (candidate > target AND candidate < target)");
}

// ----------------------------------------------------------------------------
// TEST HELPERS: PURE FUNCTIONS VALIDATION
// ----------------------------------------------------------------------------
{
  assert.equal(roundMacro(10.555), 10.56);
  assert.equal(roundMacro(null), null);
  assert.equal(calculateMacroFactor(100, "G", 150, "G"), 1.5);
  assert.equal(normalizeCriterion("ENERGY"), "CALORIES");
  assert.equal(normalizeCriterion("CARBS"), "CARBOHYDRATE");
  assert.equal(convertRefAmountToGrams(100, "G"), 100);
  assert.equal(convertRefAmountToGrams(200, "ML"), null);
  assert.deepEqual(convertRefAmountToCanonical(200, "ML"), { amount: 200, unitCode: "ML", dimension: "VOLUME" });
  assert.notEqual(
    findBestPortionSuggestion(45, "G", [
      { label: "colher", equivalentReferenceAmount: 15, status: "ACTIVE" },
    ]),
    null
  );
  console.log("✓ TEST HELPERS PASS: pure utility functions verified");
}

console.log("\n=== TODOS OS TESTES MATEMÁTICOS (A a T + HELPERS) PASSARAM COM 100% DE SUCESSO! ===");
