import assert from "node:assert";
import { register } from "node:module";
register("./ts-loader.mjs", import.meta.url);

const {
  parseQuantityAndUnit,
  getCalibratedFallbackPortionGrams,
  calculateAuthoritativeItemNutrients,
} = await import("../lib/nutrition-v2/nutrition-ai-importer.ts");

const {
  calculateMealTotals,
} = await import("../lib/nutrition-v2/nutrient-calculator.ts");

console.log("=== RUNNING NUTRITION IMPORT FIDELITY TESTS ===");

// 1. Parsing: Eggs count vs grams
console.log("1. Testing eggs count extraction...");
const parsedEggs = parseQuantityAndUnit("2 ovos mexidos");
assert.strictEqual(parsedEggs.quantity, 2, "Quantity must be 2");
assert.strictEqual(parsedEggs.unit, "unidade", "Unit must be unidade, NOT g");
const eggGrams = getCalibratedFallbackPortionGrams(parsedEggs.foodName, parsedEggs.unit);
assert.strictEqual(eggGrams, 50, "1 egg must map to 50g fallback");
console.log("✓ Eggs extracted with count and calibrated grams!");

// 2. Category prefix stripping
console.log("2. Testing category prefix stripping...");
const parsedProteinEgg = parseQuantityAndUnit("Proteína: 2 ovos");
assert.strictEqual(parsedProteinEgg.quantity, 2);
assert.strictEqual(parsedProteinEgg.unit, "unidade");
assert.strictEqual(parsedProteinEgg.foodName, "ovo", "Must strip 'Proteína: ' prefix");

const parsedCarbRice = parseQuantityAndUnit("Carboidrato: 3 colheres de arroz");
assert.strictEqual(parsedCarbRice.quantity, 3);
assert.strictEqual(parsedCarbRice.unit, "colheres");
assert.strictEqual(parsedCarbRice.foodName, "arroz", "Must strip 'Carboidrato: ' prefix");
console.log("✓ Category prefixes stripped cleanly!");

// 3. Yogurt and household measures
console.log("3. Testing yogurt household unit...");
const parsedYogurt1 = parseQuantityAndUnit("1 pote de iogurte natural");
assert.strictEqual(parsedYogurt1.quantity, 1);
assert.strictEqual(parsedYogurt1.unit, "pote");
const yogurtGrams1 = getCalibratedFallbackPortionGrams(parsedYogurt1.foodName, parsedYogurt1.unit);
assert.strictEqual(yogurtGrams1, 160, "1 pote of yogurt must map to 160g, NOT 1g");

const parsedYogurt2 = parseQuantityAndUnit("1 iogurte");
assert.strictEqual(parsedYogurt2.quantity, 1);
assert.strictEqual(parsedYogurt2.unit, "pote");
const yogurtGrams2 = getCalibratedFallbackPortionGrams(parsedYogurt2.foodName, parsedYogurt2.unit);
assert.strictEqual(yogurtGrams2, 160);
console.log("✓ Yogurt mapped to 160g portion!");

// 4. Incomplete data & subtotal warning
console.log("4. Testing incomplete meal items totals...");
const mockMealItems = [
  {
    publicId: "item-1",
    foodId: 101,
    name: "Frango grelhado",
    caloriesKcalSnapshot: 165,
    proteinGSnapshot: 31,
    carbohydrateGSnapshot: 0,
    fatGSnapshot: 3.6,
  },
  {
    publicId: "item-2",
    foodId: null, // Unlinked food!
    name: "Alimento especial",
    caloriesKcalSnapshot: null,
    proteinGSnapshot: null,
    carbohydrateGSnapshot: null,
    fatGSnapshot: null,
  },
];

const totals = calculateMealTotals(mockMealItems);
assert.strictEqual(totals.hasIncompleteData, true, "Must flag hasIncompleteData as true");
assert.strictEqual(totals.incompleteItemsCount, 1, "Must report 1 incomplete item");
assert.strictEqual(totals.caloriesKcal, 165, "Subtotal must only sum known items (165 kcal)");
assert.strictEqual(totals.status, "INCOMPLETE", "Status must be INCOMPLETE");
console.log("✓ Incomplete data correctly flagged with subtotal calculation!");

console.log("✓ All nutrition import fidelity tests passed cleanly!");
