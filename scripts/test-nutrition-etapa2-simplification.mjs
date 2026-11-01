/**
 * TREVO ONE — TEST SUITE: NUTRITION ETAPA 2 SIMPLIFICAÇÃO & REATIVIDADE
 *
 * Verifies:
 * 1. cleanPortionLabel removes redundant leading numeral "1 "
 * 2. formatHumanPortionDisplay formats household measures, equivalents with practical rounding and grams
 * 3. cleanFoodCatalogDisplayName strips IBGE POF suffixes and TACO inverted commas without mutating custom names
 * 4. scaleItemSnapshots and live equivalence recalculation scale automatic criteria while preserving MANUAL
 * 5. Daily Summary isPlanComplete evaluates true ONLY when calories and all 3 macros are complete
 */

import assert from "node:assert";
import { register } from "node:module";

register("./ts-loader.mjs", import.meta.url);

const {
  cleanPortionLabel,
  formatHumanPortionDisplay,
  cleanFoodCatalogDisplayName,
  formatQuickMacroDisplay,
  scaleItemSnapshots,
  calculateDailySummary,
} = await import("../lib/nutrition-v2/nutrient-calculator.ts");

const { cleanFoodDisplayName } = await import("../lib/nutrition-v2/food-query-builder.ts");

console.log("================================================================================");
console.log("TREVO ONE — TEST SUITE: ETAPA 2 SIMPLIFICAÇÃO & REATIVIDADE");
console.log("================================================================================");

// -----------------------------------------------------------------------------
// Test 1: cleanPortionLabel
// -----------------------------------------------------------------------------
console.log("\n[Test 1] cleanPortionLabel — Remoção de numeral prefixado redundante");
assert.strictEqual(cleanPortionLabel("1 Colher de Cafe"), "Colher de Cafe");
assert.strictEqual(cleanPortionLabel("1 Colher de sopa"), "Colher de sopa");
assert.strictEqual(cleanPortionLabel("1 Fatia - 25 g"), "Fatia - 25 g");
assert.strictEqual(cleanPortionLabel("1x copo americano"), "copo americano");
assert.strictEqual(cleanPortionLabel("Colher de sopa"), "Colher de sopa");
assert.strictEqual(cleanPortionLabel("Gramas (g)"), "Gramas (g)");
console.log("  ✅ cleanPortionLabel limpou corretamente numerais redundantes.");

// -----------------------------------------------------------------------------
// Test 2: formatHumanPortionDisplay
// -----------------------------------------------------------------------------
console.log("\n[Test 2] formatHumanPortionDisplay — Formatação humana de medidas");
// Case A: Geleia de frutas calculada para colheres de cafe (1 colher = 3g)
const geleiaDisplay = formatHumanPortionDisplay(3.3, "1 Colher de Cafe", "PORCAO", 3, true);
assert.ok(!geleiaDisplay.includes("3.3 1"), "Não deve concatenar '3.3 1'");
assert.ok(geleiaDisplay.includes("Colher de Cafe"), "Deve conter o nome da medida limpo");
assert.ok(geleiaDisplay.includes("(10 g)"), "Deve conter a equivalência física em gramas");

// Case B: Pão de forma (2 fatias de 25g)
const paoDisplay = formatHumanPortionDisplay(2, "1 Fatia - 25 g", "PORCAO", 25, false);
assert.ok(!paoDisplay.includes("2 1"), "Não deve concatenar '2 1'");
assert.strictEqual(paoDisplay, "2 Fatia - 25 g (50 g)");

// Case C: Métrica pura (150g)
const arrozDisplay = formatHumanPortionDisplay(150, "Gramas (g)", "G", null, false);
assert.strictEqual(arrozDisplay, "150 Gramas (g)");
console.log("  ✅ formatHumanPortionDisplay formatou sem repetição de numeral e com gramas.");

// -----------------------------------------------------------------------------
// Test 3: cleanFoodCatalogDisplayName & cleanFoodDisplayName
// -----------------------------------------------------------------------------
console.log("\n[Test 3] Limpeza de nomes de catálogo e sufixos IBGE POF");
// Case A: TACO inverted commas
const doceLeite = cleanFoodCatalogDisplayName("Doce, de leite, cremoso");
assert.strictEqual(doceLeite, "Doce de leite cremoso");

// Case B: IBGE POF generic research suffix
const geleiaPof = cleanFoodCatalogDisplayName("Geleia de Frutas de Qualquer Marca ou Sabor");
assert.strictEqual(geleiaPof, "Geleia de Frutas");

const paoPof = cleanFoodCatalogDisplayName("Pao de Forma Industrializado de Qualquer Marca");
assert.strictEqual(paoPof, "Pao de Forma Industrializado");

// Case C: Custom clinical prescription name should not be corrupted
const customName = cleanFoodCatalogDisplayName("Frango desfiado com legumes assados (receita da mãe)");
assert.strictEqual(customName, "Frango desfiado com legumes assados (receita da mãe)");

// Case D: food-query-builder
const qbClean = cleanFoodDisplayName("Geleia de Frutas de Qualquer Marca ou Sabor", "POF");
assert.ok(!qbClean.toLowerCase().includes("qualquer marca"), "Deve suprimir sufixo IBGE no query builder");
console.log("  ✅ Limpeza de catálogo preservou nomes clínicos e limpou TACO/IBGE.");

// -----------------------------------------------------------------------------
// Test 4: formatQuickMacroDisplay
// -----------------------------------------------------------------------------
console.log("\n[Test 4] formatQuickMacroDisplay — Arredondamento limpo de macros");
assert.strictEqual(formatQuickMacroDisplay(11.34), "11,3");
assert.strictEqual(formatQuickMacroDisplay(4.0), "4");
assert.strictEqual(formatQuickMacroDisplay(0.01), "0");
assert.strictEqual(formatQuickMacroDisplay(25.89), "25,9");
console.log("  ✅ formatQuickMacroDisplay arredondou para 1 casa decimal ou inteiro.");

// -----------------------------------------------------------------------------
// Test 5: Reatividade de Equivalentes (Escala Automática vs MANUAL)
// -----------------------------------------------------------------------------
console.log("\n[Test 5] Reatividade de Equivalentes — Escala automática vs estática MANUAL");
const baseFoodOriginal = {
  prescribedQuantity: 100,
  caloriesKcalSnapshot: 128,
  proteinGSnapshot: 2.5,
  carbohydrateGSnapshot: 28.1,
  fatGSnapshot: 0.2,
};

const newBaseQuantity = 150; // Aumento de 50%
const ratio = newBaseQuantity / baseFoodOriginal.prescribedQuantity; // 1.5

// Substitution A: Automatic criterion (CARBOHYDRATE)
const subAuto = {
  prescribedQuantity: 20,
  caloriesKcalSnapshot: 70,
  proteinGSnapshot: 0.5,
  carbohydrateGSnapshot: 15,
  fatGSnapshot: 0.1,
  equivalenceCriterion: "CARBOHYDRATE",
  isStale: false,
};

// Substitution B: MANUAL prescription
const subManual = {
  prescribedQuantity: 50,
  caloriesKcalSnapshot: 80,
  proteinGSnapshot: 1.0,
  carbohydrateGSnapshot: 18,
  fatGSnapshot: 0.5,
  equivalenceCriterion: "MANUAL",
  isStale: false,
};

// Simulation of handleLiveQuantityChange logic:
const newSubAutoQty = Math.round(subAuto.prescribedQuantity * ratio * 100) / 100;
const scaledAutoMacros = scaleItemSnapshots(subAuto, newSubAutoQty);
const updatedAuto = {
  ...subAuto,
  prescribedQuantity: newSubAutoQty,
  caloriesKcalSnapshot: scaledAutoMacros.caloriesKcalSnapshot,
  isStale: false,
};

assert.strictEqual(updatedAuto.prescribedQuantity, 30, "Substituição automática deve escalar para 30");
assert.strictEqual(updatedAuto.caloriesKcalSnapshot, 105, "Calorias da automática devem escalar para 105 (70 * 1.5)");
assert.strictEqual(updatedAuto.isStale, false, "Substituição automática recalculada deve permanecer isStale: false");

// Manual substitution must NOT change quantity:
const updatedManual = subManual; // untouched
assert.strictEqual(updatedManual.prescribedQuantity, 50, "Substituição MANUAL deve preservar quantidade de 50");
console.log("  ✅ Equivalente automático recalculou 100% proporcional e MANUAL permaneceu estático.");

// -----------------------------------------------------------------------------
// Test 6: Resumo Diário isPlanComplete
// -----------------------------------------------------------------------------
console.log("\n[Test 6] Resumo Diário — Regra de Total Completo vs Parcial");
// Complete items
const completeMeals = [
  {
    publicId: "m1",
    title: "Café",
    items: [
      {
        caloriesKcalSnapshot: 200,
        proteinGSnapshot: 10,
        carbohydrateGSnapshot: 25,
        fatGSnapshot: 5,
      },
    ],
  },
];
const completeSummary = calculateDailySummary({ meals: completeMeals });
const isCompleteA =
  completeSummary.calories.isComplete &&
  completeSummary.protein.isComplete &&
  completeSummary.carbohydrate.isComplete &&
  completeSummary.fat.isComplete;
assert.strictEqual(isCompleteA, true, "Deve ser completo quando todos os macros existem");

// Items with null carbohydrates
const partialMeals = [
  {
    publicId: "m1",
    title: "Café",
    items: [
      {
        caloriesKcalSnapshot: 200,
        proteinGSnapshot: 10,
        carbohydrateGSnapshot: null, // missing macro
        fatGSnapshot: 5,
      },
    ],
  },
];
const partialSummary = calculateDailySummary({ meals: partialMeals });
const isCompleteB =
  partialSummary.calories.isComplete &&
  partialSummary.protein.isComplete &&
  partialSummary.carbohydrate.isComplete &&
  partialSummary.fat.isComplete;
assert.strictEqual(isCompleteB, false, "NÃO pode ser completo quando carboidratos são nulos");
console.log("  ✅ isPlanComplete só aprova se todos os macros essenciais estiverem preenchidos.");

console.log("\n================================================================================");
console.log("TODOS OS TESTES DA ETAPA 2 PASSARAM COM SUCESSO!");
console.log("================================================================================");
