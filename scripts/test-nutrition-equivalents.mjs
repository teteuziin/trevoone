/**
 * TREVO ONE — NUTRITION EQUIVALENTS MATHEMATICAL TEST SUITE
 * Tests all mathematical formulas, dynamic reference amounts, edge cases,
 * division-by-zero protection, mass conversion, and impractical gating.
 */

import assert from "node:assert/strict";
import {
  calculateNutrientEquivalence,
  convertRefAmountToGrams,
  roundMacro,
} from "../lib/nutrition-v2/equivalents.ts";

console.log("=== INICIANDO SUÍTE DE TESTES: EQUIVALENTES DE ALIMENTOS ===");

// ----------------------------------------------------------------------------
// TEST 1: ENERGIA (CALORIAS)
// Target = 273 kcal, Reference = 100g, Substitute = 170 kcal
// Expected: 273 * 100 / 170 = 160.588235... -> UI: 161 g
// ----------------------------------------------------------------------------
{
  const ref = {
    name: "Ovo de galinha, cozido",
    prescribedQuantity: 3,
    prescribedUnitCode: "UNIDADE",
    prescribedUnitLabel: "unidades",
    caloriesKcalSnapshot: 273,
    proteinGSnapshot: 18,
    carbohydrateGSnapshot: 1.5,
    fatGSnapshot: 20,
  };

  const candidate = {
    publicId: "food_chicken",
    name: "Filé de frango grelhado",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 170,
    proteinG: 31,
    carbohydrateG: 0,
    fatG: 5,
  };

  const result = calculateNutrientEquivalence(ref, candidate, "ENERGY");
  assert.equal(result.status, "READY");
  assert.equal(result.canApply, true);
  assert.equal(result.isImpractical, false);
  assert.equal(result.roundedGrams, 161);
  assert.equal(result.formattedGrams, "161 g");
  assert(Math.abs(result.rawEquivalentGrams - 160.588235) < 0.001);

  // Snapshots must be calculated with 161g (displayed quantity = snapshot quantity)
  // factor = 161 / 100 = 1.61
  // calories: 170 * 1.61 = 273.7 -> round to 273.7
  // protein: 31 * 1.61 = 49.91
  // fat: 5 * 1.61 = 8.05
  assert.equal(result.macroSnapshotsForEquivalent.caloriesKcal, 273.7);
  assert.equal(result.macroSnapshotsForEquivalent.proteinG, 49.91);
  assert.equal(result.macroSnapshotsForEquivalent.carbohydrateG, 0);
  assert.equal(result.macroSnapshotsForEquivalent.fatG, 8.05);

  console.log("✓ TEST 1 PASS: Energia (273 / 170 * 100 = 160.588... -> 161 g)");
}

// ----------------------------------------------------------------------------
// TEST 2: PROTEÍNA
// Target = 18g, Reference = 100g, Substitute = 31g
// Expected: 18 * 100 / 31 = 58.064516... -> UI: 58 g
// ----------------------------------------------------------------------------
{
  const ref = {
    name: "Ovo",
    prescribedQuantity: 3,
    prescribedUnitCode: "UNIDADE",
    prescribedUnitLabel: "unidades",
    caloriesKcalSnapshot: 273,
    proteinGSnapshot: 18,
    carbohydrateGSnapshot: 1.5,
    fatGSnapshot: 20,
  };

  const candidate = {
    publicId: "food_chicken",
    name: "Filé de frango",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 170,
    proteinG: 31,
    carbohydrateG: 0,
    fatG: 5,
  };

  const result = calculateNutrientEquivalence(ref, candidate, "PROTEIN");
  assert.equal(result.status, "READY");
  assert.equal(result.canApply, true);
  assert.equal(result.roundedGrams, 58);
  assert.equal(result.formattedGrams, "58 g");
  assert(Math.abs(result.rawEquivalentGrams - 58.064516) < 0.001);

  // Snapshots with 58g:
  // factor = 58 / 100 = 0.58
  // protein: 31 * 0.58 = 17.98 -> 17.98
  assert.equal(result.macroSnapshotsForEquivalent.proteinG, 17.98);

  console.log("✓ TEST 2 PASS: Proteína (18 / 31 * 100 = 58.064... -> 58 g)");
}

// ----------------------------------------------------------------------------
// TEST 3: CARBOIDRATO
// Target = 50g, Reference = 100g, Substitute = 25g
// Expected: 50 * 100 / 25 = 200 g
// ----------------------------------------------------------------------------
{
  const ref = {
    name: "Pão integral",
    prescribedQuantity: 100,
    prescribedUnitCode: "G",
    prescribedUnitLabel: "g",
    caloriesKcalSnapshot: 250,
    proteinGSnapshot: 10,
    carbohydrateGSnapshot: 50,
    fatGSnapshot: 2,
  };

  const candidate = {
    publicId: "food_sweet_potato",
    name: "Batata doce cozida",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 100,
    proteinG: 1.5,
    carbohydrateG: 25,
    fatG: 0.2,
  };

  const result = calculateNutrientEquivalence(ref, candidate, "CARBS");
  assert.equal(result.status, "READY");
  assert.equal(result.canApply, true);
  assert.equal(result.roundedGrams, 200);
  assert.equal(result.formattedGrams, "200 g");
  assert.equal(result.rawEquivalentGrams, 200);
  assert.equal(result.macroSnapshotsForEquivalent.carbohydrateG, 50);

  console.log("✓ TEST 3 PASS: Carboidrato (50 / 25 * 100 = 200 g)");
}

// ----------------------------------------------------------------------------
// TEST 4: GORDURA
// Target = 20g, Reference = 100g, Substitute = 10g
// Expected: 20 * 100 / 10 = 200 g
// ----------------------------------------------------------------------------
{
  const ref = {
    name: "Queijo Minas",
    prescribedQuantity: 100,
    prescribedUnitCode: "G",
    prescribedUnitLabel: "g",
    caloriesKcalSnapshot: 280,
    proteinGSnapshot: 15,
    carbohydrateGSnapshot: 2,
    fatGSnapshot: 20,
  };

  const candidate = {
    publicId: "food_avocado",
    name: "Abacate",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 160,
    proteinG: 2,
    carbohydrateG: 8,
    fatG: 10,
  };

  const result = calculateNutrientEquivalence(ref, candidate, "FAT");
  assert.equal(result.status, "READY");
  assert.equal(result.canApply, true);
  assert.equal(result.roundedGrams, 200);
  assert.equal(result.formattedGrams, "200 g");
  assert.equal(result.rawEquivalentGrams, 200);
  assert.equal(result.macroSnapshotsForEquivalent.fatG, 20);

  console.log("✓ TEST 4 PASS: Gordura (20 / 10 * 100 = 200 g)");
}

// ----------------------------------------------------------------------------
// TEST 5: DYNAMIC REFERENCE AMOUNT (NÃO HARDCODED A 100G)
// Target = 100, referenceAmount = 50g, candidate nutrient = 25
// Expected: 100 * 50 / 25 = 200 g
// ----------------------------------------------------------------------------
{
  const ref = {
    name: "Suplemento A",
    prescribedQuantity: 1,
    prescribedUnitCode: "DOSE",
    prescribedUnitLabel: "dose",
    caloriesKcalSnapshot: 100,
    proteinGSnapshot: 20,
    carbohydrateGSnapshot: 0,
    fatGSnapshot: 0,
  };

  const candidate = {
    publicId: "food_bar",
    name: "Barra de proteína",
    referenceAmount: 50, // Reference is 50g, NOT 100g!
    referenceUnitCode: "G",
    caloriesKcal: 25,
    proteinG: 10,
    carbohydrateG: 5,
    fatG: 1,
  };

  const result = calculateNutrientEquivalence(ref, candidate, "ENERGY");
  assert.equal(result.status, "READY");
  assert.equal(result.roundedGrams, 200);
  assert.equal(result.formattedGrams, "200 g");
  assert.equal(result.rawEquivalentGrams, 200);

  console.log("✓ TEST 5 PASS: Dynamic referenceAmount (50g ref != 100g)");
}

// ----------------------------------------------------------------------------
// TEST 6: KG REFERENCE UNIT CONVERSION
// candidate referenceAmount = 1 KG, calories = 1000 kcal
// ref target = 250 kcal
// Expected: 250 * 1000 / 1000 = 250 g
// ----------------------------------------------------------------------------
{
  const ref = {
    name: "Ref Food",
    prescribedQuantity: 1,
    prescribedUnitCode: "G",
    prescribedUnitLabel: "g",
    caloriesKcalSnapshot: 250,
    proteinGSnapshot: 10,
    carbohydrateGSnapshot: 0,
    fatGSnapshot: 0,
  };

  const candidate = {
    publicId: "food_kg",
    name: "Alimento em KG",
    referenceAmount: 1,
    referenceUnitCode: "KG",
    caloriesKcal: 1000,
    proteinG: 50,
    carbohydrateG: 0,
    fatG: 0,
  };

  const result = calculateNutrientEquivalence(ref, candidate, "ENERGY");
  assert.equal(result.status, "READY");
  assert.equal(result.roundedGrams, 250);
  assert.equal(result.formattedGrams, "250 g");

  console.log("✓ TEST 6 PASS: KG conversion to Grams (1 KG -> 1000 G)");
}

// ----------------------------------------------------------------------------
// TEST 7: SAFE REJECTION OF NON-MASS UNITS (ML, L, UNIDADE)
// Candidate referenceUnitCode = "ML"
// Expected: NOT_APPLICABLE with human message
// ----------------------------------------------------------------------------
{
  const ref = {
    name: "Ref Food",
    prescribedQuantity: 1,
    prescribedUnitCode: "G",
    prescribedUnitLabel: "g",
    caloriesKcalSnapshot: 250,
    proteinGSnapshot: 10,
    carbohydrateGSnapshot: 0,
    fatGSnapshot: 0,
  };

  const candidate = {
    publicId: "food_liquid",
    name: "Leite desnatado",
    referenceAmount: 200,
    referenceUnitCode: "ML",
    caloriesKcal: 70,
    proteinG: 6,
    carbohydrateG: 10,
    fatG: 0,
  };

  const result = calculateNutrientEquivalence(ref, candidate, "ENERGY");
  assert.equal(result.status, "NOT_APPLICABLE");
  assert.equal(result.canApply, false);
  assert.equal(result.message, "Conversão para gramas indisponível para este alimento.");

  console.log("✓ TEST 7 PASS: Rejeição segura de ML/líquidos sem conversão arbitrária");
}

// ----------------------------------------------------------------------------
// TEST 8: TARGET ZERO OU INSIGNIFICANTE
// Prescribed food has 0g carbs (e.g. Pure Whey isolate or Chicken)
// User selects CARBS criterion
// Expected: NOT_APPLICABLE with human message
// ----------------------------------------------------------------------------
{
  const ref = {
    name: "Filé de frango",
    prescribedQuantity: 150,
    prescribedUnitCode: "G",
    prescribedUnitLabel: "g",
    caloriesKcalSnapshot: 255,
    proteinGSnapshot: 46.5,
    carbohydrateGSnapshot: 0, // 0g Carbs
    fatGSnapshot: 7.5,
  };

  const candidate = {
    publicId: "food_rice",
    name: "Arroz branco cozido",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 130,
    proteinG: 2.5,
    carbohydrateG: 28,
    fatG: 0.3,
  };

  const result = calculateNutrientEquivalence(ref, candidate, "CARBS");
  assert.equal(result.status, "NOT_APPLICABLE");
  assert.equal(result.canApply, false);
  assert(result.message.includes("não possui quantidade significativa de"));

  console.log("✓ TEST 8 PASS: Target zero/insignificante bloqueia cálculo inútil");
}

// ----------------------------------------------------------------------------
// TEST 9: MISSING / ZERO SUBSTITUTE NUTRIENT (DIVISÃO POR ZERO)
// Candidate food has 0g protein (e.g. Sugar / Oil)
// User selects PROTEIN criterion
// Expected: MISSING_DATA without throw or Infinity
// ----------------------------------------------------------------------------
{
  const ref = {
    name: "Ovo",
    prescribedQuantity: 2,
    prescribedUnitCode: "UNIDADE",
    prescribedUnitLabel: "unidades",
    caloriesKcalSnapshot: 180,
    proteinGSnapshot: 12,
    carbohydrateGSnapshot: 1,
    fatGSnapshot: 13,
  };

  const candidate = {
    publicId: "food_oil",
    name: "Azeite de oliva",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 884,
    proteinG: 0, // 0g protein!
    carbohydrateG: 0,
    fatG: 100,
  };

  const result = calculateNutrientEquivalence(ref, candidate, "PROTEIN");
  assert.equal(result.status, "MISSING_DATA");
  assert.equal(result.canApply, false);
  assert(result.message.includes("não possui quantidade significativa de"));

  console.log("✓ TEST 9 PASS: Proteção contra divisão por zero / dado ausente");
}

// ----------------------------------------------------------------------------
// TEST 10: IMPRACTICAL THRESHOLD (> 2000 G)
// Trying to match 45g of protein using apples (which have 0.3g per 100g)
// 45 * 100 / 0.3 = 15000 g!
// Expected: status = IMPRACTICAL, canApply = false, isImpractical = true
// ----------------------------------------------------------------------------
{
  const ref = {
    name: "Peito de Frango",
    prescribedQuantity: 150,
    prescribedUnitCode: "G",
    prescribedUnitLabel: "g",
    caloriesKcalSnapshot: 240,
    proteinGSnapshot: 45,
    carbohydrateGSnapshot: 0,
    fatGSnapshot: 5,
  };

  const candidate = {
    publicId: "food_apple",
    name: "Maçã Fuji",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 52,
    proteinG: 0.3,
    carbohydrateG: 14,
    fatG: 0.2,
  };

  const result = calculateNutrientEquivalence(ref, candidate, "PROTEIN");
  assert.equal(result.status, "IMPRACTICAL");
  assert.equal(result.isImpractical, true);
  assert.equal(result.canApply, false); // V1: CANNOT apply directly!
  assert(result.roundedGrams > 2000);
  assert(result.message.includes("Quantidade pouco prática"));

  console.log("✓ TEST 10 PASS: Quantidade pouco prática (> 2000g) bloqueia aplicação na V1");
}

// ----------------------------------------------------------------------------
// TEST 11: HELPER CONVERT REF AMOUNT TO GRAMS
// ----------------------------------------------------------------------------
{
  assert.equal(convertRefAmountToGrams(100, "G"), 100);
  assert.equal(convertRefAmountToGrams(1, "KG"), 1000);
  assert.equal(convertRefAmountToGrams(200, "ML"), null);
  assert.equal(convertRefAmountToGrams(1, "UNIDADE"), null);
  console.log("✓ TEST 11 PASS: convertRefAmountToGrams");
}

// ----------------------------------------------------------------------------
// TEST 12: HELPER ROUND MACRO
// ----------------------------------------------------------------------------
{
  assert.equal(roundMacro(10.555), 10.56);
  assert.equal(roundMacro(null), null);
  assert.equal(roundMacro(undefined), null);
  assert.equal(roundMacro(0), 0);
  console.log("✓ TEST 12 PASS: roundMacro");
}

console.log("=== TODOS OS 12 TESTES PASSARAM COM 100% DE SUCESSO! ===");
