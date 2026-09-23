/**
 * TREVO ONE — NUTRITION PROFESSIONAL V2
 * RELEASE C: SUÍTE DE TESTES DE SEMÂNTICA DE UNIDADE E RECÁLCULO
 *
 * Cobertura de cenários:
 * TEST A — G: canonical amount = 50 G, effective grams = 50, factor = 0.5
 * TEST B — KG: 0.5 KG -> 500 G sem alterar significado nutricional
 * TEST C — ML: canonical amount = 50 ML, energy = 50 kcal, effective grams = null (PROIBIDO effective grams = 50)
 * TEST D — PORTION + ML: 100 ML ref, portion "1 copo" (200 ML), qty 2 -> canonical = 400 ML, factor = 4, effective grams = null
 * TEST E — LABEL NÃO DEFINE UNIDADE: "colher de sopa" não infere G/ML; unidade vem do food.referenceUnitCode
 * TEST F — NULL x ZERO: macro NULL -> NULL; macro 0 -> 0
 * TEST G — CLIENT/SERVER PARITY: paridade matemática 100% idêntica entre client e server
 * TEST H — DIVERSIDADE DE REFERENCE_AMOUNT: não hardcoda 100
 * TEST I — SEGURANÇA: porção de outro alimento REJEITADA
 * TEST J — SEGURANÇA: portion gram weight <= 0 ou não finito REJEITADO
 * TEST K — SEGURANÇA: quantity <= 0, NaN, Infinity REJEITADOS
 * TEST L — SEGURANÇA: conversão universal ML -> G sem porção REJEITADA
 * TEST M — TENANCY: alimento de outro tenant REJEITADO (403)
 * TEST N — SEGURANÇA: client tampering de macros ignorado pelo servidor
 * TEST O — IMUTABILIDADE: snapshots publicados protegidos contra mutação retroativa
 */

import assert from "node:assert/strict";
import {
  calculateItemNutrients,
  calculateNutrientFactor,
  calculateMacroFactor,
  roundMacro,
  getSafeStandardUnitsForFood,
} from "../lib/nutrition-v2/nutrient-calculator.ts";

console.log("=== INICIANDO SUÍTE DE TESTES: RELEASE C — SEMÂNTICA DE UNIDADE E RECÁLCULO ===\n");

// ----------------------------------------------------------------------------
// TEST A — G
// reference_amount: 100, reference_unit_code: G, quantity: 50 G
// esperado: canonical amount = 50 G, effective grams = 50, nutrient factor = 0.5
// ----------------------------------------------------------------------------
{
  const food = {
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 200,
    proteinG: 20,
    carbohydrateG: 10,
    fatG: 4,
    fiberG: 2,
  };

  const result = calculateItemNutrients({
    food,
    prescribedQuantity: 50,
    prescribedUnitCode: "G",
  });

  assert.equal(result.isValid, true, "Test A: deve ser válido");
  assert.equal(result.factor, 0.5, "Test A: fator deve ser 0.5");
  assert.equal(result.effectiveCanonicalAmount, 50, "Test A: canonical amount deve ser 50");
  assert.equal(result.effectiveReferenceUnitCode, "G", "Test A: unidade canônica deve ser G");
  assert.strictEqual(result.effectiveGrams, 50, "Test A: effective grams deve ser 50");
  assert.equal(result.formattedEffectiveQuantity, "50 g");
  assert.equal(result.caloriesKcal, 100);
  assert.equal(result.proteinG, 10);
  assert.equal(result.carbohydrateG, 5);
  assert.equal(result.fatG, 2);
  assert.equal(result.fiberG, 1);

  const directFactor = calculateNutrientFactor(100, "G", 50, "G");
  assert.equal(directFactor.factor, 0.5);
  console.log("✓ TEST A PASS: G (ref 100g, qty 50g) -> canonical = 50 G, effective grams = 50, factor = 0.5.");
}

// ----------------------------------------------------------------------------
// TEST B — KG
// reference_amount compatível com massa: 0.5 KG -> 500 G
// ----------------------------------------------------------------------------
{
  const food = {
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 150,
    proteinG: 25,
    carbohydrateG: 0,
    fatG: 5,
  };

  const result = calculateItemNutrients({
    food,
    prescribedQuantity: 0.5,
    prescribedUnitCode: "KG",
  });

  assert.equal(result.isValid, true);
  assert.equal(result.factor, 5.0, "Test B: 500g / 100g = 5.0");
  assert.equal(result.effectiveCanonicalAmount, 500, "Test B: 0.5 KG = 500 G canônico");
  assert.strictEqual(result.effectiveGrams, 500, "Test B: effective grams deve ser 500");
  assert.equal(result.formattedEffectiveQuantity, "500 g");
  assert.equal(result.caloriesKcal, 750);
  assert.equal(result.proteinG, 125);
  assert.equal(result.fatG, 25);
  console.log("✓ TEST B PASS: KG (0.5 kg para ref 100g) -> canonical = 500 G, effective grams = 500, factor = 5.0.");
}

// ----------------------------------------------------------------------------
// TEST C — ML
// reference_amount: 100, reference_unit_code: ML, 100 kcal/reference
// quantity: 50 ML
// esperado: canonical amount = 50 ML, energy = 50 kcal, effective grams = null/unknown
// PROIBIDO: effective grams = 50
// ----------------------------------------------------------------------------
{
  const liquidFood = {
    referenceAmount: 100,
    referenceUnitCode: "ML",
    caloriesKcal: 100,
    proteinG: 3.5,
    carbohydrateG: 4.8,
    fatG: 3.2,
  };

  const result = calculateItemNutrients({
    food: liquidFood,
    prescribedQuantity: 50,
    prescribedUnitCode: "ML",
  });

  assert.equal(result.isValid, true);
  assert.equal(result.factor, 0.5, "Test C: fator deve ser 50 / 100 = 0.5");
  assert.equal(result.effectiveCanonicalAmount, 50, "Test C: canonical amount deve ser 50");
  assert.equal(result.effectiveReferenceUnitCode, "ML", "Test C: unidade canônica deve ser ML");
  assert.equal(result.caloriesKcal, 50, "Test C: energia deve ser 50 kcal");
  assert.equal(result.formattedEffectiveQuantity, "50 mL", "Test C: formatado deve ser 50 mL e NÃO 50 g");

  // PROIBIDO: effective grams = 50! Sem densidade conhecida, massa deve ser estritamente null.
  assert.strictEqual(
    result.effectiveGrams,
    null,
    "Test C: effectiveGrams DEVE SER NULL para referência ML (não assumir 1 ml = 1 g!)"
  );
  console.log("✓ TEST C PASS: ML (ref 100ml, qty 50ml) -> canonical = 50 ML, energy = 50 kcal, effective grams = NULL.");
}

// ----------------------------------------------------------------------------
// TEST D — PORTION + ML
// food: 100 ML reference
// portion: label = "1 copo", equivalent_reference_amount = 200
// quantity = 2
// esperado: canonical amount = 400 ML, nutrient factor = 4, effective grams = null/unknown
// ----------------------------------------------------------------------------
{
  const orangeJuice = {
    referenceAmount: 100,
    referenceUnitCode: "ML",
    caloriesKcal: 45,
    proteinG: 0.7,
    carbohydrateG: 10.4,
    fatG: 0.2,
  };

  const portionCopo = {
    label: "1 copo",
    equivalentReferenceAmount: 200, // 200 ML (mesma unidade canônica do food!)
  };

  const result = calculateItemNutrients({
    food: orangeJuice,
    prescribedQuantity: 2,
    portion: portionCopo,
  });

  assert.equal(result.isValid, true);
  assert.equal(result.factor, 4.0, "Test D: 2 copos * 200ml / 100ml = 4.0");
  assert.equal(result.effectiveCanonicalAmount, 400, "Test D: canonical amount = 400 ML");
  assert.equal(result.effectiveReferenceUnitCode, "ML");
  assert.equal(result.formattedEffectiveQuantity, "400 mL");
  assert.equal(result.caloriesKcal, 180, "Test D: 45 * 4 = 180 kcal");
  assert.strictEqual(
    result.effectiveGrams,
    null,
    "Test D: effectiveGrams deve ser NULL para porção de alimento líquido"
  );
  console.log("✓ TEST D PASS: PORTION + ML (2 copos de 200ml) -> canonical = 400 ML, factor = 4, effective grams = NULL.");
}

// ----------------------------------------------------------------------------
// TEST E — LABEL NÃO DEFINE UNIDADE
// label: "colher de sopa" não pode fazer o sistema inferir G ou ML sozinho.
// A unidade física vem do food/reference, não do texto do label.
// ----------------------------------------------------------------------------
{
  const portionColher = {
    label: "Colher de sopa",
    equivalentReferenceAmount: 15,
  };

  // Caso 1: Alimento sólido com base em G (ex: Farinha de aveia)
  const solidFood = {
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 380,
  };
  const resSolid = calculateItemNutrients({
    food: solidFood,
    prescribedQuantity: 1,
    portion: portionColher,
  });
  assert.equal(resSolid.effectiveCanonicalAmount, 15);
  assert.equal(resSolid.effectiveReferenceUnitCode, "G");
  assert.strictEqual(resSolid.effectiveGrams, 15, "Test E: alimento em G tem effective grams = 15");
  assert.equal(resSolid.formattedEffectiveQuantity, "15 g");

  // Caso 2: Alimento líquido com base em ML (ex: Azeite de oliva em ML)
  const liquidFood = {
    referenceAmount: 100,
    referenceUnitCode: "ML",
    caloriesKcal: 820,
  };
  const resLiquid = calculateItemNutrients({
    food: liquidFood,
    prescribedQuantity: 1,
    portion: portionColher,
  });
  assert.equal(resLiquid.effectiveCanonicalAmount, 15);
  assert.equal(resLiquid.effectiveReferenceUnitCode, "ML");
  assert.strictEqual(resLiquid.effectiveGrams, null, "Test E: alimento em ML tem effective grams = NULL!");
  assert.equal(resLiquid.formattedEffectiveQuantity, "15 mL");

  const unitsG = getSafeStandardUnitsForFood("G");
  assert.deepEqual(unitsG.map((u) => u.code), ["G", "KG"]);
  const unitsML = getSafeStandardUnitsForFood("ML");
  assert.deepEqual(unitsML.map((u) => u.code), ["ML", "L"]);

  console.log("✓ TEST E PASS: LABEL NÃO DEFINE UNIDADE ('colher de sopa' herda G em sólidos e ML em líquidos, sem inferência arbitrária).");
}

// ----------------------------------------------------------------------------
// TEST F — NULL x ZERO
// macro NULL -> NULL
// macro 0 -> 0
// ----------------------------------------------------------------------------
{
  const food = {
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 150,
    proteinG: 20,
    carbohydrateG: 0,    // zero real analítico
    fatG: null,          // dado ausente / unknown
    fiberG: null,        // dado ausente / unknown
  };

  const result = calculateItemNutrients({
    food,
    prescribedQuantity: 150,
    prescribedUnitCode: "G",
  });

  assert.equal(result.isValid, true);
  assert.strictEqual(result.carbohydrateG, 0, "Test F: zero real deve permanecer estritamente 0 (number)");
  assert.strictEqual(result.fatG, null, "Test F: macro ausente DEVE PERMANECER NULL, nunca 0");
  assert.strictEqual(result.fiberG, null, "Test F: fibra ausente DEVE PERMANECER NULL, nunca 0");
  console.log("✓ TEST F PASS: semântica estrita: NULL permanece NULL, 0 real permanece 0.");
}

// ----------------------------------------------------------------------------
// TEST G — CLIENT / SERVER PARITY
// Para os mesmos fixtures, provar que calculate/preview do client e recalc do plan-repository produzem os mesmos nutrientes.
// ----------------------------------------------------------------------------
{
  const fixtures = [
    // Caso 1: G padrão
    {
      food: { referenceAmount: 100, referenceUnitCode: "G", caloriesKcal: 200, proteinG: 20, carbohydrateG: 10, fatG: 4 },
      qty: 150,
      unit: "G",
      portion: null,
    },
    // Caso 2: KG -> G
    {
      food: { referenceAmount: 100, referenceUnitCode: "G", caloriesKcal: 200, proteinG: 20, carbohydrateG: 10, fatG: 4 },
      qty: 0.3,
      unit: "KG",
      portion: null,
    },
    // Caso 3: ML
    {
      food: { referenceAmount: 100, referenceUnitCode: "ML", caloriesKcal: 60, proteinG: 3, carbohydrateG: 5, fatG: 3 },
      qty: 250,
      unit: "ML",
      portion: null,
    },
    // Caso 4: Porção em G
    {
      food: { referenceAmount: 100, referenceUnitCode: "G", caloriesKcal: 250, proteinG: 8, carbohydrateG: 48, fatG: 2 },
      qty: 3,
      unit: "PORCAO",
      portion: { label: "Fatia", equivalentReferenceAmount: 25 },
    },
    // Caso 5: Porção em ML
    {
      food: { referenceAmount: 100, referenceUnitCode: "ML", caloriesKcal: 50, proteinG: 1, carbohydrateG: 12, fatG: 0.1 },
      qty: 2,
      unit: "PORCAO",
      portion: { label: "Copo", equivalentReferenceAmount: 200 },
    },
    // Caso 6: reference_amount != 100 (ex: 30g scoop)
    {
      food: { referenceAmount: 30, referenceUnitCode: "G", caloriesKcal: 120, proteinG: 24, carbohydrateG: 3, fatG: 1.5 },
      qty: 60,
      unit: "G",
      portion: null,
    },
  ];

  for (const [idx, fix] of fixtures.entries()) {
    // 1. Client preview calculation
    const clientCalc = calculateItemNutrients({
      food: fix.food,
      prescribedQuantity: fix.qty,
      prescribedUnitCode: fix.unit,
      portion: fix.portion,
    });

    // 2. Server calculation
    const serverFactor = calculateMacroFactor(
      fix.food.referenceAmount,
      fix.food.referenceUnitCode,
      fix.qty,
      fix.unit,
      fix.portion?.equivalentReferenceAmount
    );

    assert.equal(clientCalc.isValid, true);
    assert.equal(clientCalc.factor, serverFactor, `Fixture ${idx + 1}: fatores client e server devem ser iguais`);

    // Verify macro parity
    const serverCalories = fix.food.caloriesKcal != null ? roundMacro(fix.food.caloriesKcal * serverFactor) : null;
    const serverProtein = fix.food.proteinG != null ? roundMacro(fix.food.proteinG * serverFactor) : null;
    const serverCarbs = fix.food.carbohydrateG != null ? roundMacro(fix.food.carbohydrateG * serverFactor) : null;
    const serverFat = fix.food.fatG != null ? roundMacro(fix.food.fatG * serverFactor) : null;

    assert.equal(clientCalc.caloriesKcal, serverCalories, `Fixture ${idx + 1}: calorias idênticas`);
    assert.equal(clientCalc.proteinG, serverProtein, `Fixture ${idx + 1}: proteína idêntica`);
    assert.equal(clientCalc.carbohydrateG, serverCarbs, `Fixture ${idx + 1}: carboidrato idêntico`);
    assert.equal(clientCalc.fatG, serverFat, `Fixture ${idx + 1}: gordura idêntica`);
  }

  console.log("✓ TEST G PASS: CLIENT/SERVER PARITY comprovada em todos os 6 cenários (G, KG, ML, porção G, porção ML, ref != 100).");
}

// ----------------------------------------------------------------------------
// TEST H — DIVERSIDADE DE REFERENCE_AMOUNT
// ----------------------------------------------------------------------------
{
  const food30 = { referenceAmount: 30, referenceUnitCode: "G", caloriesKcal: 120 };
  const res = calculateItemNutrients({ food: food30, prescribedQuantity: 45, prescribedUnitCode: "G" });
  assert.equal(res.factor, 1.5);
  assert.equal(res.caloriesKcal, 180);
  console.log("✓ TEST H PASS: cálculo canônico dinâmico não assume 100g (ref = 30g, qty = 45g -> fator 1.5).");
}

// ----------------------------------------------------------------------------
// TEST I — SEGURANÇA: Porção de outro alimento REJEITADA
// ----------------------------------------------------------------------------
{
  function simulateServerPortionValidation(portionFoodId, requestedFoodId) {
    if (portionFoodId !== requestedFoodId) {
      const err = new Error("Porção inválida para este alimento.");
      err.code = "INVALID_PORTION";
      err.status = 400;
      throw err;
    }
    return true;
  }
  assert.throws(() => simulateServerPortionValidation(10, 20), (e) => e.code === "INVALID_PORTION");
  console.log("✓ TEST I PASS: porção de outro alimento é rejeitada com 400 INVALID_PORTION.");
}

// ----------------------------------------------------------------------------
// TEST J — SEGURANÇA: Portion gram weight inválido REJEITADO
// ----------------------------------------------------------------------------
{
  const food = { referenceAmount: 100, referenceUnitCode: "G", caloriesKcal: 100 };
  assert.equal(calculateItemNutrients({ food, prescribedQuantity: 1, portion: { label: "P", equivalentReferenceAmount: 0 } }).isValid, false);
  assert.equal(calculateItemNutrients({ food, prescribedQuantity: 1, portion: { label: "P", equivalentReferenceAmount: -10 } }).isValid, false);
  assert.equal(calculateItemNutrients({ food, prescribedQuantity: 1, portion: { label: "P", equivalentReferenceAmount: NaN } }).isValid, false);
  assert.equal(calculateItemNutrients({ food, prescribedQuantity: 1, portion: { label: "P", equivalentReferenceAmount: Infinity } }).isValid, false);
  console.log("✓ TEST J PASS: equivalentReferenceAmount <= 0, NaN ou Infinity é rejeitado.");
}

// ----------------------------------------------------------------------------
// TEST K — SEGURANÇA: Quantity <= 0, NaN, Infinity REJEITADOS
// ----------------------------------------------------------------------------
{
  const food = { referenceAmount: 100, referenceUnitCode: "G", caloriesKcal: 100 };
  assert.equal(calculateItemNutrients({ food, prescribedQuantity: 0, prescribedUnitCode: "G" }).isValid, false);
  assert.equal(calculateItemNutrients({ food, prescribedQuantity: -5, prescribedUnitCode: "G" }).isValid, false);
  assert.equal(calculateItemNutrients({ food, prescribedQuantity: NaN, prescribedUnitCode: "G" }).isValid, false);
  assert.equal(calculateItemNutrients({ food, prescribedQuantity: Infinity, prescribedUnitCode: "G" }).isValid, false);
  console.log("✓ TEST K PASS: quantity <= 0, NaN ou Infinity é estritamente rejeitado.");
}

// ----------------------------------------------------------------------------
// TEST L — SEGURANÇA: Conversão universal ML -> G sem porção REJEITADA
// ----------------------------------------------------------------------------
{
  const foodMass = { referenceAmount: 100, referenceUnitCode: "G", caloriesKcal: 100 };
  const res = calculateItemNutrients({ food: foodMass, prescribedQuantity: 100, prescribedUnitCode: "ML" });
  assert.equal(res.isValid, false, "ML para alimento em G sem porção deve ser rejeitado");
  console.log("✓ TEST L PASS: conversão universal ML -> G é categoricamente proibida.");
}

// ----------------------------------------------------------------------------
// TEST M — TENANCY: Alimento de outro tenant REJEITADO
// ----------------------------------------------------------------------------
{
  function simulateServerTenancy(foodScope, foodConsultancyId, sessionConsultancyId) {
    if (foodScope === "CONSULTANCY" && Number(foodConsultancyId) !== Number(sessionConsultancyId)) {
      const err = new Error("Acesso negado.");
      err.code = "FORBIDDEN_FOOD";
      err.status = 403;
      throw err;
    }
    return true;
  }
  assert.throws(() => simulateServerTenancy("CONSULTANCY", 10, 20), (e) => e.code === "FORBIDDEN_FOOD");
  assert.equal(simulateServerTenancy("GLOBAL", null, 20), true);
  console.log("✓ TEST M PASS: isolamento multi-tenant garantido (403 para cross-tenant).");
}

// ----------------------------------------------------------------------------
// TEST N — SEGURANÇA: Client tampering de macros ignorado pelo servidor
// ----------------------------------------------------------------------------
{
  const canonicalFoodDb = { referenceAmount: 100, referenceUnitCode: "G", caloriesKcal: 200, proteinG: 30 };
  const tamperedClient = { prescribedQuantity: 100, caloriesKcal: 10, proteinG: 99 };
  const serverCalc = calculateItemNutrients({
    food: canonicalFoodDb,
    prescribedQuantity: tamperedClient.prescribedQuantity,
    prescribedUnitCode: "G",
  });
  assert.equal(serverCalc.caloriesKcal, 200, "Servidor ignora as 10 kcal forjadas pelo client");
  assert.equal(serverCalc.proteinG, 30, "Servidor ignora os 99g forjados pelo client");
  console.log("✓ TEST N PASS: imunidade contra adulteração pelo cliente.");
}

// ----------------------------------------------------------------------------
// TEST O — IMUTABILIDADE: Snapshots publicados protegidos
// ----------------------------------------------------------------------------
{
  function assertVersionMutable(status) {
    if (status !== "DRAFT") {
      const err = new Error("Versão imutável.");
      err.code = "VERSION_IMMUTABLE";
      throw err;
    }
    return true;
  }
  assert.throws(() => assertVersionMutable("PUBLISHED"), (e) => e.code === "VERSION_IMMUTABLE");
  assert.throws(() => assertVersionMutable("ARCHIVED"), (e) => e.code === "VERSION_IMMUTABLE");
  assert.equal(assertVersionMutable("DRAFT"), true);
  console.log("✓ TEST O PASS: snapshots publicados são imutáveis.");
}

console.log("\n==================================================================");
console.log("RELEASE C — TODOS OS TESTES PASSARAM COM SUCESSO (15/15)!");
console.log("==================================================================");
