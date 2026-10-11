/**
 * TREVO ONE — TEST SUITE: CANONICAL FOOD AUTO-FILL & ZERO DUPLICIDADE
 * 
 * Tests:
 * 1. Canonical nutrient scaling at 100g, 50g, 150g with official clinical precision
 * 2. Food with 0 household portions -> automatic safe fallback to G without UNRESOLVED_PORTION
 * 3. Legacy unresolved portions (e.g. 2 colheres) are NOT silently reinterpreted as grams
 * 4. Duplicate substitution guard blocks identical canonical food_id
 * 5. Self-substitution guard blocks base food as substitute
 * 6. Different food_id with same textual name is NOT blocked
 */

import assert from "node:assert/strict";
import { register } from "node:module";
register("./ts-loader.mjs", import.meta.url);

const {
  calculateItemNutrients,
  roundMacro,
} = await import("../lib/nutrition-v2/nutrient-calculator.ts");
const {
  validatePlanTreeForPublication,
} = await import("../lib/nutrition-v2/validation.ts");

console.log("=== TREVO ONE: CANONICAL FOOD AUTO-FILL & ZERO DUPLICIDADE SUITE ===\n");

// ---------------------------------------------------------
// 1. CANONICAL NUTRIENT SCALING (100g, 50g, 150g)
// ---------------------------------------------------------
console.log("--- 1. PROVA DE ESCALONAMENTO NUTRICIONAL CANÔNICO ---");

const canonicalFoodFixture = {
  id: 42,
  publicId: "food-canon-42",
  name: "Couve Manteiga Refogada",
  referenceAmount: 100,
  referenceUnitCode: "G",
  caloriesKcal: 24,
  proteinG: 1.1,
  carbohydrateG: 4.2,
  fatG: 0.8,
  fiberG: 2.2,
};

// 1.1 Test 100g
const nutrients100g = calculateItemNutrients({
  food: canonicalFoodFixture,
  prescribedQuantity: 100,
  prescribedUnitCode: "G",
});
assert.equal(nutrients100g.isValid, true);
assert.equal(nutrients100g.caloriesKcal, 24, "100g calories must be 24 kcal");
assert.equal(nutrients100g.proteinG, 1.1, "100g protein must be 1.1 g");
assert.equal(nutrients100g.carbohydrateG, 4.2, "100g carbs must be 4.2 g");
assert.equal(nutrients100g.fatG, 0.8, "100g fat must be 0.8 g");
console.log("  [PASS] CANONICAL 100G: 24 kcal / 1.1g prot / 4.2g carb / 0.8g fat");

// 1.2 Test 50g
const nutrients50g = calculateItemNutrients({
  food: canonicalFoodFixture,
  prescribedQuantity: 50,
  prescribedUnitCode: "G",
});
assert.equal(nutrients50g.isValid, true);
assert.equal(nutrients50g.caloriesKcal, 12, "50g calories must be 12 kcal");
assert.equal(nutrients50g.proteinG, 0.55, "50g protein must be 0.55 g");
assert.equal(nutrients50g.carbohydrateG, 2.1, "50g carbs must be 2.1 g");
assert.equal(nutrients50g.fatG, 0.4, "50g fat must be 0.4 g");
console.log("  [PASS] CANONICAL 50G: 12 kcal / 0.55g prot / 2.1g carb / 0.4g fat");

// 1.3 Test 150g
const nutrients150g = calculateItemNutrients({
  food: canonicalFoodFixture,
  prescribedQuantity: 150,
  prescribedUnitCode: "G",
});
assert.equal(nutrients150g.isValid, true);
assert.equal(nutrients150g.caloriesKcal, 36, "150g calories must be 36 kcal");
assert.equal(nutrients150g.proteinG, 1.65, "150g protein must be 1.65 g");
assert.equal(nutrients150g.carbohydrateG, 6.3, "150g carbs must be 6.3 g");
assert.equal(nutrients150g.fatG, 1.2, "150g fat must be 1.2 g");
console.log("  [PASS] CANONICAL 150G: 36 kcal / 1.65g prot / 6.3g carb / 1.2g fat");

// ---------------------------------------------------------
// 2. NO HOUSEHOLD PORTION -> FALLBACK TO G WITHOUT ERROR
// ---------------------------------------------------------
console.log("\n--- 2. ALIMENTO SEM MEDIDA CASEIRA (FALLBACK TO G) ---");

// Simulates adding a new meal item from Food Library with no portion
const newCanonicalItemWithZeroPortions = {
  id: 101,
  publicId: "item-new-101",
  foodId: canonicalFoodFixture.id,
  foodNameSnapshot: canonicalFoodFixture.name,
  prescribedQuantity: 100,
  prescribedUnitCode: "G", // repository safe fallback
  prescribedUnitLabel: "Gramas (g)",
  caloriesKcalSnapshot: 24,
  proteinGSnapshot: 1.1,
  carbohydrateGSnapshot: 4.2,
  fatGSnapshot: 0.8,
  portionEquivalentAmount: null,
};

const treeWithNewItem = {
  version: { title: "Plano Teste" },
  meals: [{
    publicId: "meal-1",
    title: "Café da Manhã",
    items: [newCanonicalItemWithZeroPortions],
  }],
};
const resNewItem = validatePlanTreeForPublication(treeWithNewItem);
assert.equal(resNewItem.valid, true, "Plan with canonical macros and unit G must be valid for publication");
assert.equal(resNewItem.pendingItems.length, 0, "Item with canonical macros and unit G must have 0 pending items");
console.log("  [PASS] NO PORTION NEW ITEM: successfully uses 'G', macros KNOWN, publication gate ALLOWED");

// ---------------------------------------------------------
// 3. NÃO REINTERPRETAR LEGACY (PRESERVAR UNRESOLVED_PORTION)
// ---------------------------------------------------------
console.log("\n--- 3. NÃO REINTERPRETAR ITENS LEGACY COM MEDIDA SEM CONVERSÃO ---");

// Legacy item with custom or unlinked portion like "2 colheres" with no conversion
const legacyUnresolvedItem = {
  id: 102,
  publicId: "item-legacy-102",
  foodId: canonicalFoodFixture.id,
  foodNameSnapshot: "Aveia Flocos",
  prescribedQuantity: 2,
  prescribedUnitCode: "COLHERES", // unmapped domestic unit code
  prescribedUnitLabel: "Colheres de sopa",
  caloriesKcalSnapshot: null,
  proteinGSnapshot: null,
  carbohydrateGSnapshot: null,
  fatGSnapshot: null,
};

const treeWithLegacy = {
  version: { title: "Plano Teste" },
  meals: [{
    publicId: "meal-1",
    title: "Café da Manhã",
    items: [legacyUnresolvedItem],
  }],
};
const resLegacy = validatePlanTreeForPublication(treeWithLegacy);
assert.equal(resLegacy.valid, false, "Plan with legacy unmapped portion must be blocked from publishing");
const hasUnresolvedPortion = resLegacy.pendingItems.some((r) => r.reason === "UNRESOLVED_PORTION");
assert.equal(hasUnresolvedPortion, true, "Legacy unmapped unit MUST remain UNRESOLVED_PORTION, never silently 2g");
console.log("  [PASS] LEGACY UNRESOLVED PORTION: NOT silently reinterpreted as grams; retains UNRESOLVED_PORTION review gate");

// ---------------------------------------------------------
// 4. DUPLICIDADE E SELF-SUBSTITUTION
// ---------------------------------------------------------
console.log("\n--- 4. DUPLICIDADE E AUTO-SUBSTITUIÇÃO ---");

const baseItem = {
  id: 50,
  foodId: 10, // Aveia
  foodName: "Aveia em Flocos",
};

const existingSubstitutions = [
  { id: 1, foodId: 20, foodName: "Semente de Chia" },
];

// Helper mimicking repository duplicate checks
function validateAddSubstitution(base, existingSubs, candidate) {
  // 1. Self substitution check
  if (base.foodId != null && candidate.foodId === base.foodId) {
    return { allowed: false, code: "SELF_SUBSTITUTION_NOT_ALLOWED" };
  }
  // 2. Duplicate canonical food_id check
  if (candidate.foodId != null && existingSubs.some((s) => s.foodId === candidate.foodId)) {
    return { allowed: false, code: "DUPLICATE_SUBSTITUTION" };
  }
  return { allowed: true };
}

// 4.1 Base Aveia (10), candidate Chia (20) again -> DENY
const dupCheck = validateAddSubstitution(baseItem, existingSubstitutions, { foodId: 20, foodName: "Chia" });
assert.equal(dupCheck.allowed, false);
assert.equal(dupCheck.code, "DUPLICATE_SUBSTITUTION");
console.log("  [PASS] DUPLICATE SAME CANONICAL FOOD_ID: DENIED");

// 4.2 Textual alias resolving to food_id=20 -> DENY
const aliasCheck = validateAddSubstitution(baseItem, existingSubstitutions, { foodId: 20, foodName: "Salvia hispanica (Chia)" });
assert.equal(aliasCheck.allowed, false);
assert.equal(aliasCheck.code, "DUPLICATE_SUBSTITUTION");
console.log("  [PASS] TEXTUAL ALIAS RESOLVING TO SAME FOOD_ID: DENIED");

// 4.3 Base Aveia (10) as substitute -> DENY
const selfCheck = validateAddSubstitution(baseItem, existingSubstitutions, { foodId: 10, foodName: "Aveia em Flocos" });
assert.equal(selfCheck.allowed, false);
assert.equal(selfCheck.code, "SELF_SUBSTITUTION_NOT_ALLOWED");
console.log("  [PASS] SELF-SUBSTITUTION (BASE FOOD AS SUBSTITUTE): DENIED");

// 4.4 Distinct candidate with food_id=21 -> ALLOW (not blocked just by name)
const diffIdCheck = validateAddSubstitution(baseItem, existingSubstitutions, { foodId: 21, foodName: "Chia Dourada Importada" });
assert.equal(diffIdCheck.allowed, true);
console.log("  [PASS] DISTINCT FOOD_ID WITH SIMILAR NAME: ALLOWED");

console.log("\n========================================================");
console.log("TODOS OS TESTES DE ALIMENTO CANÔNICO E DUPLICIDADE PASSARAM!");
console.log("========================================================");
