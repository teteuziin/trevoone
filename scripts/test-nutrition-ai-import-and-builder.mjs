/**
 * TREVO ONE — TEST SUITE: NUTRITION AI IMPORT & BUILDER CONVERSIONS
 * 
 * Verifies:
 * 1. Metric units detection (grams, ml, kg, liters) vs household/portion units
 * 2. Quantity & unit parsing without size adjectives bleeding into food names
 * 3. Authoritative nutrient calculation without double factor on metric units (e.g. 60g != 3600g)
 * 4. Deduplication of AI-extracted food substitutions (no 12 instead of 6)
 * 5. Word/DOCX text continuity without word merging
 */

import { register } from "node:module";
register("./ts-loader.mjs", import.meta.url);

import assert from "node:assert/strict";

const {
  isMetricUnit,
  parseQuantityAndUnit,
  calculateAuthoritativeItemNutrients,
  groupMealFoodsAndAlternatives,
  extractExplicitGrams,
} = await import("../lib/nutrition-v2/nutrition-ai-importer.ts");

const {
  calculateNutrientFactor,
} = await import("../lib/nutrition-v2/nutrient-calculator.ts");

const {
  detectMealSectionHeaders,
  splitTextIntoMealSections,
} = await import("../lib/ai/openai-client.ts");

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

export async function runNutritionAiImportAndBuilderSuite() {
  console.log("=== NUTRITION AI IMPORT & BUILDER SUITE ===");

  // 1. isMetricUnit
  runTest("isMetricUnit correctly identifies metric mass and volume units", () => {
    assert.equal(isMetricUnit("g"), true);
    assert.equal(isMetricUnit("G"), true);
    assert.equal(isMetricUnit("gr"), true);
    assert.equal(isMetricUnit("grama"), true);
    assert.equal(isMetricUnit("gramas"), true);
    assert.equal(isMetricUnit("ml"), true);
    assert.equal(isMetricUnit("mililitro"), true);
    assert.equal(isMetricUnit("mililitros"), true);
    assert.equal(isMetricUnit("kg"), true);
    assert.equal(isMetricUnit("quilo"), true);
    assert.equal(isMetricUnit("quilos"), true);
    assert.equal(isMetricUnit("quilograma"), true);
    assert.equal(isMetricUnit("quilogramas"), true);
    assert.equal(isMetricUnit("l"), true);
    assert.equal(isMetricUnit("litro"), true);
    assert.equal(isMetricUnit("litros"), true);
  });

  runTest("isMetricUnit rejects household and portion units", () => {
    assert.equal(isMetricUnit("unidade"), false);
    assert.equal(isMetricUnit("unidades"), false);
    assert.equal(isMetricUnit("colher de sopa"), false);
    assert.equal(isMetricUnit("fatia"), false);
    assert.equal(isMetricUnit("fatias"), false);
    assert.equal(isMetricUnit("escumadeira"), false);
    assert.equal(isMetricUnit("scoop"), false);
    assert.equal(isMetricUnit(null), false);
    assert.equal(isMetricUnit(undefined), false);
  });

  // 2. parseQuantityAndUnit
  runTest("parseQuantityAndUnit extracts 60g cuscuz cleanly", () => {
    const res = parseQuantityAndUnit("60 gramas de cuscuz de milho, cozido com sal");
    assert.equal(res.quantity, 60);
    assert.equal(res.unit, "gramas");
    assert.match(res.foodName.toLowerCase(), /cuscuz/);
    assert.match(res.foodName.toLowerCase(), /cozido/);
  });

  runTest("parseQuantityAndUnit prevents size adjectives like 'grandes' from polluting food name", () => {
    const res = parseQuantityAndUnit("3 unidades grandes de ovo, galinha, inteiro, cozido, mexido (183 g)");
    assert.equal(res.quantity, 3);
    assert.equal(res.unit, "unidades grandes");
    // Food name must NOT be "grandes" or start with "grandes"
    assert.equal(res.foodName.toLowerCase().startsWith("grandes"), false);
    assert.match(res.foodName.toLowerCase(), /ovo/);
  });

  runTest("parseQuantityAndUnit parses concatenated metric quantities (160g de filé de frango)", () => {
    const res = parseQuantityAndUnit("160g de File de frango");
    assert.equal(res.quantity, 160);
    assert.equal(res.unit, "g");
    assert.match(res.foodName.toLowerCase(), /frango/);
  });

  runTest("parseQuantityAndUnit parses household measures (1 escumadeira)", () => {
    const res = parseQuantityAndUnit("1 escumadeira de salada cozida");
    assert.equal(res.quantity, 1);
    assert.equal(res.unit, "escumadeira");
    assert.match(res.foodName.toLowerCase(), /salada/);
  });

  // 3. calculateAuthoritativeItemNutrients
  runTest("calculateAuthoritativeItemNutrients does NOT multiply metric quantity by portion equivalent (no 60*60=3600g bug)", () => {
    const mockTacoFood = {
      referenceAmount: 100,
      caloriesKcal: 112,
      proteinG: 2.2,
      carbsG: 25.3,
      fatG: 0.7,
      fiberG: 1.5,
    };

    // Even if portionEquivalentAmount is 60 (from a portion named 'gramas · 60 g'),
    // since prescribedUnit is 'gramas', effectiveQty must be 60g, NOT 3600g
    const nutrients = calculateAuthoritativeItemNutrients(
      mockTacoFood,
      60,
      "gramas",
      60 // portionEquivalentAmount
    );

    // 60g of 112 kcal/100g = 67.2 kcal, NEVER 4032 or 4068 kcal!
    assert.equal(nutrients.caloriesKcal, 67.2);
    assert.equal(nutrients.proteinG, 1.32);
    assert.equal(nutrients.carbsG, 15.18);
    assert.equal(nutrients.fatG, 0.42);
  });

  runTest("calculateAuthoritativeItemNutrients correctly scales household units (3 units of 61g = 183g)", () => {
    const mockEggFood = {
      referenceAmount: 100,
      caloriesKcal: 143,
      proteinG: 13,
      carbsG: 1.6,
      fatG: 8.9,
      fiberG: 0,
    };

    const nutrients = calculateAuthoritativeItemNutrients(
      mockEggFood,
      3,
      "unidades grandes",
      61 // 61g per egg -> 3 * 61 = 183g
    );

    // 183g of 143 kcal/100g = 261.69 kcal
    assert.equal(nutrients.caloriesKcal, 261.7);
    assert.equal(nutrients.proteinG, 23.79);
    assert.equal(nutrients.carbsG, 2.93);
    assert.equal(nutrients.fatG, 16.29);
  });

  // 4. groupMealFoodsAndAlternatives
  runTest("groupMealFoodsAndAlternatives does not duplicate AI-structured substitutions", () => {
    const rawFoods = [
      {
        originalText: "60 gramas de cuscuz de milho ou 55 gramas de aipim ou 70 gramas de inhame ou 90 gramas de batata doce ou 55 gramas de banana da terra ou 2 torradas ou 1 fatia de pao",
        name: "cuscuz de milho",
        quantity: 60,
        unit: "gramas",
        substitutions: [
          { name: "aipim", quantity: 55, unit: "gramas" },
          { name: "inhame", quantity: 70, unit: "gramas" },
          { name: "batata doce", quantity: 90, unit: "gramas" },
          { name: "banana da terra", quantity: 55, unit: "gramas" },
          { name: "torradas comerciais", quantity: 2, unit: "unidades" },
          { name: "pão de forma", quantity: 1, unit: "fatia" },
        ],
      },
    ];

    const grouped = groupMealFoodsAndAlternatives(rawFoods);
    assert.equal(grouped.length, 1);
    const mainItem = grouped[0].primary;
    assert.equal(mainItem.name, "cuscuz de milho");
    // Substitutions count must be exactly 6, NEVER 12!
    assert.equal(grouped[0].substitutions.length, 6);
  });

  // 5. extractExplicitGrams
  runTest("extractExplicitGrams extracts (183 g) and (20 g) cleanly", () => {
    assert.equal(extractExplicitGrams("3 unidades grandes de ovo, galinha, inteiro, cozido, mexido (183 g)"), 183);
    assert.equal(extractExplicitGrams("2 unidades comerciais de torrada (20 g)"), 20);
    assert.equal(extractExplicitGrams("1 fatia de pão"), null);
    assert.equal(extractExplicitGrams(null), null);
  });

  // 6. calculateNutrientFactor does not multiply metric units by portion equivalent
  runTest("calculateNutrientFactor treats 60g as 60g, never 3600g", () => {
    const res = calculateNutrientFactor(100, "G", 60, "G", 60);
    assert.equal(res.factor, 0.6);
    assert.equal(res.effectiveQty, 60);
  });

  runTest("calculateNutrientFactor correctly converts household units via portion equivalent (3 un * 61g = 183g)", () => {
    const res = calculateNutrientFactor(100, "G", 3, "UNIDADE", 61);
    assert.equal(res.factor, 1.83);
    assert.equal(res.effectiveQty, 183);
  });

  // 7. detectMealSectionHeaders and splitTextIntoMealSections
  runTest("detectMealSectionHeaders identifies all 5 meals from Patricia's document", () => {
    const doc = `Patricia
Café da Manhã
• 60g de cuscuz
LANCHE DA MANHA
• 1 banana
Almoço
• 160g de frango
PRE TREINO
• 1 fatia de pão
Jantar
• 60g de cuscuz
Sugestões, sucos laxantes
• Suco de mamão`;
    const headers = detectMealSectionHeaders(doc);
    assert.equal(headers.length, 5);
    assert.equal(headers[0].title, "Café da Manhã");
    assert.equal(headers[1].title, "LANCHE DA MANHA");
    assert.equal(headers[2].title, "Almoço");
    assert.equal(headers[3].title, "PRE TREINO");
    assert.equal(headers[4].title, "Jantar");

    const split = splitTextIntoMealSections(doc);
    assert.equal(split.sections.length, 5);
    assert.match(split.postamble, /Sugestões/);
  });

  console.log(`\nSUITE RESULT: ${passedCount}/${totalCount} tests passed.\n`);
  return { passedCount, totalCount };
}

// Allow running directly
if (process.argv[1]?.endsWith("test-nutrition-ai-import-and-builder.mjs")) {
  runNutritionAiImportAndBuilderSuite()
    .then((res) => {
      if (res.passedCount !== res.totalCount) process.exit(1);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
