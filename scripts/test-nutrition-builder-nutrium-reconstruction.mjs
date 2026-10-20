import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { formatQuantity } from "../lib/nutrition-v2/nutrition-plan-presentation.ts";
import { buildSelectFoodsQuery } from "../lib/nutrition-v2/food-query-builder.ts";

console.log("--- Starting Nutrition Builder & Food Library Reconstruction Tests ---");

// Test 1: Verify f.fiber_g in buildSelectFoodsQuery
console.log("Test 1: Food query builder includes fiber_g in coreFields");
const queryObj = buildSelectFoodsQuery({ query: "arroz", scope: "ALL" }, 1);
assert.ok(
  queryObj.fullSql.includes("f.fiber_g"),
  "fullSql must include f.fiber_g column selection"
);
assert.ok(
  queryObj.noPortionsSql.includes("f.fiber_g"),
  "noPortionsSql must include f.fiber_g column selection"
);
console.log("✓ Test 1 Passed: fiber_g is included in food queries");

// Test 2: Verify formatQuantity deduplicates prefixes like '1 Fatia'
console.log("Test 2: formatQuantity deduplicates duplicate prefixes");
const testSingleSlice = formatQuantity(1, "1 Fatia média (30g)", "PORCAO");
assert.equal(testSingleSlice, "1 Fatia média (30g)", "Should not output '1 1 Fatia média (30g)'");

const testGram = formatQuantity(100, "Gramas (g)", "G");
assert.equal(testGram, "100 g", "Standard gram representation");

const testGramCode = formatQuantity(150, null, "G");
assert.equal(testGramCode, "150 g", "Standard G code representation");
console.log("✓ Test 2 Passed: duplicate prefixes are cleaned and normalized");

// Test 3: Verify formatQuantity pluralizes properly for quantities > 1
console.log("Test 3: formatQuantity pluralization");
const testDoubleSlice = formatQuantity(2, "1 Fatia média (30g)", "PORCAO");
assert.equal(testDoubleSlice, "2 fatias médias (30g)", "Pluralizes 'fatia média' to 'fatias médias'");

const testSpoons = formatQuantity(3, "1 Colher de sopa (15g)", "PORCAO");
assert.equal(testSpoons, "3 colheres de sopa (15g)", "Pluralizes 'colher de sopa' to 'colheres de sopa'");
console.log("✓ Test 3 Passed: unit labels pluralize correctly for qty > 1");

// Test 4: Verify NutritionMealInlineSearch exists and exports cleanly
console.log("Test 4: NutritionMealInlineSearch component file verification");
const inlineSearchPath = path.resolve("components/consultancies/nutrition-v2/nutrition-meal-inline-search.tsx");
assert.ok(fs.existsSync(inlineSearchPath), "nutrition-meal-inline-search.tsx must exist");
const inlineSearchContent = fs.readFileSync(inlineSearchPath, "utf8");
assert.ok(
  inlineSearchContent.includes("export function NutritionMealInlineSearch"),
  "Must export NutritionMealInlineSearch"
);
assert.ok(
  inlineSearchContent.includes("previewKcal"),
  "Must calculate preview macros"
);
console.log("✓ Test 4 Passed: NutritionMealInlineSearch verified");

// Test 5: Verify NutritionPatientPreviewModal exists and exports cleanly
console.log("Test 5: NutritionPatientPreviewModal component file verification");
const previewModalPath = path.resolve("components/consultancies/nutrition-v2/nutrition-patient-preview-modal.tsx");
assert.ok(fs.existsSync(previewModalPath), "nutrition-patient-preview-modal.tsx must exist");
const previewModalContent = fs.readFileSync(previewModalPath, "utf8");
assert.ok(
  previewModalContent.includes("export function NutritionPatientPreviewModal"),
  "Must export NutritionPatientPreviewModal"
);
console.log("✓ Test 5 Passed: NutritionPatientPreviewModal verified");

// Test 6: Verify NutritionMealEditor integrates NutritionMealInlineSearch
console.log("Test 6: NutritionMealEditor integrates inline search and duplicate meal");
const mealEditorPath = path.resolve("components/consultancies/nutrition-v2/nutrition-meal-editor.tsx");
const mealEditorContent = fs.readFileSync(mealEditorPath, "utf8");
assert.ok(
  mealEditorContent.includes("NutritionMealInlineSearch"),
  "nutrition-meal-editor must import and render NutritionMealInlineSearch"
);
assert.ok(
  mealEditorContent.includes("onDuplicateMeal"),
  "nutrition-meal-editor must support onDuplicateMeal"
);
console.log("✓ Test 6 Passed: NutritionMealEditor verified");

// Test 7: Verify NutritionPlanBuilder integrates 3 tabs, autosave, preview and sidebar
console.log("Test 7: NutritionPlanBuilder integration");
const builderPath = path.resolve("components/consultancies/nutrition-v2/nutrition-plan-builder.tsx");
const builderContent = fs.readFileSync(builderPath, "utf8");
assert.ok(
  builderContent.includes("AutosaveIndicator"),
  "Must include AutosaveIndicator"
);
assert.ok(
  builderContent.includes("NutritionPatientPreviewModal"),
  "Must include NutritionPatientPreviewModal"
);
assert.ok(
  builderContent.includes('activeTab === "BUILDER"') &&
  builderContent.includes('activeTab === "ANALYSIS"') &&
  builderContent.includes('activeTab === "GUIDANCE"'),
  "Must support 3 main tabs: BUILDER, ANALYSIS, GUIDANCE"
);
assert.ok(
  builderContent.includes("handleDuplicateMeal"),
  "Must support handleDuplicateMeal"
);
console.log("✓ Test 7 Passed: NutritionPlanBuilder integration verified");

console.log("\nALL 7 RECONSTRUCTION TESTS PASSED SUCCESSFULLY! ✨");
