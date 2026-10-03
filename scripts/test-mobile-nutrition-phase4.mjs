import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

console.log("==================================================");
console.log("TREVO ONE — MOBILE NATIVE NUTRITION (PHASE 4)");
console.log("COMPREHENSIVE TEST SUITE");
console.log("==================================================");

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    failed++;
  }
}

// -----------------------------------------------------------------------------
// 1. MOBILE PLAN LIST & HEADER (app/consultoria/[slug]/planos-v2/page.tsx)
// -----------------------------------------------------------------------------
const planListPagePath = path.join(rootDir, "app/consultoria/[slug]/planos-v2/page.tsx");
assert.ok(fs.existsSync(planListPagePath), "planos-v2/page.tsx exists");
const planListPageCode = fs.readFileSync(planListPagePath, "utf-8");

runTest("1.1 Plan list uses NutritionPlanCreationSheet for mobile-first creation", () => {
  assert.ok(
    planListPageCode.includes("NutritionPlanCreationSheet"),
    "Must import and use NutritionPlanCreationSheet"
  );
});

runTest("1.2 Plan list renders dedicated mobile native card with >=44px touch targets", () => {
  assert.ok(
    planListPageCode.includes("sm:hidden space-y-3"),
    "Must have dedicated mobile cards container (sm:hidden)"
  );
  assert.ok(
    planListPageCode.includes("min-h-[44px]"),
    "Mobile action CTA must have >= 44px min-height"
  );
  assert.ok(
    planListPageCode.includes("NutritionPlanCardActions"),
    "Must use NutritionPlanCardActions for secondary actions sheet"
  );
  assert.ok(
    planListPageCode.includes("hidden sm:grid"),
    "Desktop 2-column grid must be preserved intact under hidden sm:grid"
  );
});

// -----------------------------------------------------------------------------
// 2. PLAN CREATION SHEET (nutrition-plan-creation-sheet.tsx)
// -----------------------------------------------------------------------------
const creationSheetPath = path.join(
  rootDir,
  "components/consultancies/nutrition-v2/nutrition-plan-creation-sheet.tsx"
);
assert.ok(fs.existsSync(creationSheetPath), "nutrition-plan-creation-sheet.tsx exists");
const creationSheetCode = fs.readFileSync(creationSheetPath, "utf-8");

runTest("2.1 NutritionPlanCreationSheet offers zero and AI import options", () => {
  assert.ok(
    creationSheetCode.includes("Criar do zero"),
    "Must include 'Criar do zero' option"
  );
  assert.ok(
    creationSheetCode.includes("Importar com IA"),
    "Must include 'Importar com IA' option"
  );
});

runTest("2.2 NutritionPlanCreationSheet respects mobile touch targets >= 48px and safe-area", () => {
  assert.ok(
    creationSheetCode.includes("min-h-[48px]"),
    "Primary button must have min-h-[48px]"
  );
  assert.ok(
    creationSheetCode.includes("MobileBottomSheet"),
    "Must use MobileBottomSheet on mobile"
  );
  assert.ok(
    creationSheetCode.includes("hidden sm:flex"),
    "Desktop side-by-side buttons must be preserved intact"
  );
});

// -----------------------------------------------------------------------------
// 3. PLAN CARD ACTIONS (nutrition-plan-card-actions.tsx)
// -----------------------------------------------------------------------------
const cardActionsPath = path.join(
  rootDir,
  "components/consultancies/nutrition-v2/nutrition-plan-card-actions.tsx"
);
assert.ok(fs.existsSync(cardActionsPath), "nutrition-plan-card-actions.tsx exists");
const cardActionsCode = fs.readFileSync(cardActionsPath, "utf-8");

runTest("3.1 NutritionPlanCardActions provides mobile action sheet with 3 options", () => {
  assert.ok(
    cardActionsCode.includes("Abrir editor"),
    "Must include 'Abrir editor'"
  );
  assert.ok(
    cardActionsCode.includes("Baixar plano em PDF"),
    "Must include 'Baixar plano em PDF'"
  );
  assert.ok(
    cardActionsCode.includes("Copiar link do editor"),
    "Must include 'Copiar link do editor'"
  );
  assert.ok(
    cardActionsCode.includes("min-h-[44px]"),
    "Trigger button must have min-h-[44px]"
  );
});

// -----------------------------------------------------------------------------
// 4. AI IMPORT MODAL (nutrition-ai-import-modal.tsx)
// -----------------------------------------------------------------------------
const aiModalPath = path.join(
  rootDir,
  "components/consultancies/nutrition-v2/nutrition-ai-import-modal.tsx"
);
assert.ok(fs.existsSync(aiModalPath), "nutrition-ai-import-modal.tsx exists");
const aiModalCode = fs.readFileSync(aiModalPath, "utf-8");

runTest("4.1 AI Import Modal transforms into slide-up bottom sheet on mobile", () => {
  assert.ok(
    aiModalCode.includes("items-end sm:items-center"),
    "Must be bottom-aligned on mobile and center-aligned on desktop"
  );
  assert.ok(
    aiModalCode.includes("rounded-t-3xl sm:rounded-2xl"),
    "Must have rounded top sheet on mobile"
  );
  assert.ok(
    aiModalCode.includes("w-10 h-1.5 rounded-full"),
    "Must include mobile drag handle indicator"
  );
});

runTest("4.2 AI Import Modal has safe-area inset and min-h-[48px] CTA footer", () => {
  assert.ok(
    aiModalCode.includes("safe-area-inset-bottom"),
    "Footer must respect safe-area-inset-bottom"
  );
  assert.ok(
    aiModalCode.includes("min-h-[48px]"),
    "Primary CTA must have min-h-[48px]"
  );
});

// -----------------------------------------------------------------------------
// 5. FOOD PICKER (nutrition-food-picker.tsx)
// -----------------------------------------------------------------------------
const foodPickerPath = path.join(
  rootDir,
  "components/consultancies/nutrition-v2/nutrition-food-picker.tsx"
);
assert.ok(fs.existsSync(foodPickerPath), "nutrition-food-picker.tsx exists");
const foodPickerCode = fs.readFileSync(foodPickerPath, "utf-8");

runTest("5.1 Food Picker transforms into bottom sheet on mobile with drag handle", () => {
  assert.ok(
    foodPickerCode.includes("items-end sm:items-center"),
    "Must be bottom-aligned on mobile"
  );
  assert.ok(
    foodPickerCode.includes("rounded-t-3xl sm:rounded-3xl"),
    "Must have top rounded corners on mobile"
  );
  assert.ok(
    foodPickerCode.includes("w-10 h-1.5 rounded-full"),
    "Must include drag handle indicator"
  );
});

runTest("5.2 Food Picker includes touch steppers with >=44px and decimal inputMode", () => {
  assert.ok(
    foodPickerCode.includes('inputMode="decimal"'),
    "Quantity input must have inputMode decimal for mobile numeric keyboard"
  );
  assert.ok(
    foodPickerCode.includes("min-h-[44px] min-w-[44px]"),
    "Stepper buttons (- and +) must be at least 44x44px"
  );
  assert.ok(
    foodPickerCode.includes("min-h-[48px]"),
    "Confirm button must have min-h-[48px]"
  );
  assert.ok(
    foodPickerCode.includes("safe-area-inset-bottom"),
    "Sticky footer must respect safe-area-inset-bottom"
  );
});

// -----------------------------------------------------------------------------
// 6. ITEM & MEAL EDITORS (nutrition-item-editor, meal-editor, substitution)
// -----------------------------------------------------------------------------
const itemEditorPath = path.join(
  rootDir,
  "components/consultancies/nutrition-v2/nutrition-item-editor.tsx"
);
const mealEditorPath = path.join(
  rootDir,
  "components/consultancies/nutrition-v2/nutrition-meal-editor.tsx"
);
const subEditorPath = path.join(
  rootDir,
  "components/consultancies/nutrition-v2/nutrition-substitution-editor.tsx"
);
const itemEditorCode = fs.readFileSync(itemEditorPath, "utf-8");
const mealEditorCode = fs.readFileSync(mealEditorPath, "utf-8");
const subEditorCode = fs.readFileSync(subEditorPath, "utf-8");

runTest("6.1 Item & Substitution Editors have comfortable touch targets >= 44px", () => {
  assert.ok(
    itemEditorCode.includes("min-h-[44px] min-w-[44px]"),
    "Item editor action buttons must be at least 44x44px"
  );
  assert.ok(
    subEditorCode.includes("min-h-[44px] min-w-[44px]"),
    "Substitution editor action buttons must be at least 44x44px"
  );
  assert.ok(
    itemEditorCode.includes("min-h-[36px] sm:min-h-0"),
    "Link food button has touch-friendly height"
  );
});

runTest("6.2 Meal Editor add food button is prominent and touch-friendly", () => {
  assert.ok(
    mealEditorCode.includes("min-h-[46px]"),
    "+ Adicionar Alimento button must have min-h-[46px]"
  );
});

// -----------------------------------------------------------------------------
// 7. PLAN BUILDER STICKY BOTTOM BAR (nutrition-plan-builder.tsx)
// -----------------------------------------------------------------------------
const planBuilderPath = path.join(
  rootDir,
  "components/consultancies/nutrition-v2/nutrition-plan-builder.tsx"
);
const planBuilderCode = fs.readFileSync(planBuilderPath, "utf-8");

runTest("7.1 Plan Builder has mobile sticky bottom action bar with safe-area", () => {
  assert.ok(
    planBuilderCode.includes("sm:hidden fixed bottom-0 inset-x-0 z-40"),
    "Must have sticky bottom bar for mobile"
  );
  assert.ok(
    planBuilderCode.includes("safe-area-inset-bottom"),
    "Sticky bottom bar must respect safe-area-inset-bottom"
  );
  assert.ok(
    planBuilderCode.includes("min-h-[48px]"),
    "Primary CTA in bottom bar must have min-h-[48px]"
  );
  assert.ok(
    planBuilderCode.includes("MobileActionSheet"),
    "Secondary actions must use MobileActionSheet"
  );
  assert.ok(
    planBuilderCode.includes("hidden sm:flex"),
    "Desktop top action buttons must be preserved intact"
  );
});

// -----------------------------------------------------------------------------
// 8. PUBLISH DIALOG & ASSIGN MODAL (nutrition-publish-dialog, nutrition-assign-modal)
// -----------------------------------------------------------------------------
const publishDialogPath = path.join(
  rootDir,
  "components/consultancies/nutrition-v2/nutrition-publish-dialog.tsx"
);
const assignModalPath = path.join(
  rootDir,
  "components/consultancies/nutrition-v2/nutrition-assign-modal.tsx"
);
const publishDialogCode = fs.readFileSync(publishDialogPath, "utf-8");
const assignModalCode = fs.readFileSync(assignModalPath, "utf-8");

runTest("8.1 Publish Dialog transforms into bottom sheet on mobile with safe-area", () => {
  assert.ok(
    publishDialogCode.includes("items-end sm:items-center"),
    "Publish dialog must be bottom-aligned on mobile"
  );
  assert.ok(
    publishDialogCode.includes("rounded-t-3xl sm:rounded-2xl"),
    "Must have rounded-t-3xl on mobile"
  );
  assert.ok(
    publishDialogCode.includes("w-10 h-1.5 rounded-full"),
    "Must include drag handle"
  );
  assert.ok(
    publishDialogCode.includes("safe-area-inset-bottom"),
    "Must respect safe-area-inset-bottom"
  );
  assert.ok(
    publishDialogCode.includes("min-h-[48px]"),
    "Confirm publish CTA must be min-h-[48px]"
  );
});

runTest("8.2 Assign Modal transforms into bottom sheet on mobile with safe-area", () => {
  assert.ok(
    assignModalCode.includes("items-end sm:items-center"),
    "Assign modal must be bottom-aligned on mobile"
  );
  assert.ok(
    assignModalCode.includes("rounded-t-3xl sm:rounded-2xl"),
    "Must have rounded-t-3xl on mobile"
  );
  assert.ok(
    assignModalCode.includes("w-10 h-1.5 rounded-full bg-slate-300"),
    "Must include drag handle"
  );
  assert.ok(
    assignModalCode.includes("safe-area-inset-bottom"),
    "Must respect safe-area-inset-bottom"
  );
  assert.ok(
    assignModalCode.includes("min-h-[48px]"),
    "Confirm assign CTA must be min-h-[48px]"
  );
});

// -----------------------------------------------------------------------------
// 9. STUDENT NUTRITION COCKPIT (student-nutrition-v2.tsx)
// -----------------------------------------------------------------------------
const studentNutritionPath = path.join(
  rootDir,
  "components/consultancies/nutrition-v2/student-nutrition-v2.tsx"
);
const studentNutritionCode = fs.readFileSync(studentNutritionPath, "utf-8");

runTest("9.1 Student Nutrition has dedicated mobile cockpit and preserves desktop sheet", () => {
  assert.ok(
    studentNutritionCode.includes("MOBILE NATIVE STUDENT COCKPIT (< sm)"),
    "Must have mobile cockpit marker"
  );
  assert.ok(
    studentNutritionCode.includes("sm:hidden space-y-4"),
    "Mobile cockpit must be visible on mobile (sm:hidden)"
  );
  assert.ok(
    studentNutritionCode.includes("hidden sm:block"),
    "Desktop continuous sheet must be preserved under hidden sm:block"
  );
});

runTest("9.2 Student Nutrition mobile cockpit includes Next Meal highlight card", () => {
  assert.ok(
    studentNutritionCode.includes("Próxima Refeição"),
    "Must display Next Meal highlight card"
  );
  assert.ok(
    studentNutritionCode.includes("nextMeal.items.map"),
    "Next meal card must list items directly"
  );
  assert.ok(
    studentNutritionCode.includes("Ver detalhes no cardápio"),
    "Must have smooth scroll link to full meal details"
  );
});

runTest("9.3 Student Nutrition displays daily macro goals and quick meal switcher", () => {
  assert.ok(
    studentNutritionCode.includes("Metas Nutricionais Diárias"),
    "Must show daily nutritional macro goals"
  );
  assert.ok(
    studentNutritionCode.includes("Refeições do Dia"),
    "Must show meal navigation switcher"
  );
  assert.ok(
    studentNutritionCode.includes("scrollToMeal"),
    "Must implement scrollToMeal for smooth jumps"
  );
});

runTest("9.4 Student Nutrition formats meal rows cleanly with explicit substitutions", () => {
  assert.ok(
    studentNutritionCode.includes("Pode ser substituído por:"),
    "Must clearly label substitutions"
  );
  assert.ok(
    studentNutritionCode.includes("💡"),
    "Must render in-context food notes"
  );
  assert.ok(
    !studentNutritionCode.includes("food_id = null"),
    "Must not leak technical jargon to student"
  );
  assert.ok(
    !studentNutritionCode.includes("needs_review"),
    "Must not leak review flags to student"
  );
});

// -----------------------------------------------------------------------------
// 10. PLAN REPOSITORY MEALS COUNT ENHANCEMENT (plan-repository.ts)
// -----------------------------------------------------------------------------
const planRepoPath = path.join(rootDir, "lib/nutrition-v2/plan-repository.ts");
const planRepoCode = fs.readFileSync(planRepoPath, "utf-8");

runTest("10.1 PlanRepository includes mealsCount in listPlansForConsultancy", () => {
  assert.ok(
    planRepoCode.includes("mealsCount?: number;"),
    "PlanListItemDto must declare mealsCount"
  );
  assert.ok(
    planRepoCode.includes("SELECT COUNT(*) FROM nutrition_v2_meals nm"),
    "SQL query must count active meals per version"
  );
  assert.ok(
    planRepoCode.includes("mealsCount: Number(r.meals_count || 0)"),
    "Mapping must populate mealsCount"
  );
});

// -----------------------------------------------------------------------------
// FINAL SUMMARY
// -----------------------------------------------------------------------------
console.log("\n==================================================");
console.log(`TOTAL PHASE 4 CHECKS: ${passed + failed}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log("==================================================");

if (failed > 0) {
  process.exit(1);
}
