import fs from "fs";
import path from "path";
import assert from "assert";

console.log("=== RUNNING NUTRITION BUILDER MOBILE RESPONSIVE TEST SUITE ===\n");

let allPassed = true;
function runTest(name, fn) {
  try {
    fn();
    console.log(`${name}: PASS`);
  } catch (err) {
    console.error(`${name}: FAIL ->`, err.message);
    allPassed = false;
  }
}

const builderPath = "components/consultancies/nutrition-v2/nutrition-plan-builder.tsx";
const mealEditorPath = "components/consultancies/nutrition-v2/nutrition-meal-editor.tsx";
const itemEditorPath = "components/consultancies/nutrition-v2/nutrition-item-editor.tsx";
const subEditorPath = "components/consultancies/nutrition-v2/nutrition-substitution-editor.tsx";

const builderContent = fs.readFileSync(builderPath, "utf8");
const mealEditorContent = fs.readFileSync(mealEditorPath, "utf8");
const itemEditorContent = fs.readFileSync(itemEditorPath, "utf8");
const subEditorContent = fs.readFileSync(subEditorPath, "utf8");

// 1. MOBILE BUILDER ONE COLUMN
runTest("MOBILE BUILDER ONE COLUMN", () => {
  // Checks that the main workspace grid uses 1 column on mobile (grid-cols-1) and expands to 12 cols on desktop (lg:grid-cols-12)
  assert.ok(
    builderContent.includes("grid grid-cols-1 lg:grid-cols-12"),
    "Builder grid must use grid-cols-1 on mobile and lg:grid-cols-12 on desktop"
  );
  assert.ok(
    builderContent.includes("lg:col-span-8"),
    "Main column must be lg:col-span-8"
  );
  assert.ok(
    builderContent.includes("hidden lg:block lg:col-span-4 lg:sticky"),
    "Sidebar totals panel must be hidden on mobile and visible on desktop"
  );
});

// 2. NO MOBILE MIN WIDTH OVERFLOW
runTest("NO MOBILE MIN WIDTH OVERFLOW", () => {
  // Check that containers have min-w-0 and w-full
  assert.ok(
    builderContent.includes("w-full min-w-0"),
    "Builder containers must have w-full and min-w-0"
  );
  // Ensure the top compact row that forced >400px width is removed
  assert.ok(
    !builderContent.includes("showMobileAnalysis"),
    "Old top mobile compact totals row with fixed flex items must be removed"
  );
  // Ensure meal, item, and substitution containers have min-w-0 and w-full
  assert.ok(
    mealEditorContent.includes("w-full min-w-0"),
    "Meal editor container must have w-full min-w-0"
  );
  assert.ok(
    itemEditorContent.includes("w-full min-w-0"),
    "Item editor container must have w-full min-w-0"
  );
  assert.ok(
    subEditorContent.includes("w-full min-w-0"),
    "Substitution editor container must have w-full min-w-0"
  );
  // Check substitution has reduced mobile padding pl-3 sm:pl-6
  assert.ok(
    subEditorContent.includes("pl-3 sm:pl-6"),
    "Substitution editor must use pl-3 on mobile and sm:pl-6 on desktop"
  );
});

// 3. CONTEXT HEADER RESPONSIVE
runTest("CONTEXT HEADER RESPONSIVE", () => {
  // Check that patient context banner allows flex-col sm:flex-row
  assert.ok(
    builderContent.includes("flex flex-col sm:flex-row sm:items-center justify-between"),
    "Context banner must wrap vertically on mobile"
  );
  // Check that the buttons in context banner are hidden on mobile to avoid horizontal overflow
  assert.ok(
    builderContent.includes("hidden sm:flex items-center gap-2 shrink-0"),
    "Context banner buttons must be hidden on mobile (delegated to mobile action bar / sheet)"
  );
  // Check break-words on student name and text
  assert.ok(
    builderContent.includes("Plano alimentar de {patientContext.studentName}"),
    "Context banner must show student name"
  );
  assert.ok(
    builderContent.includes("break-words"),
    "Context banner text must have break-words"
  );
});

// 4. PUBLISH CTA MOBILE
runTest("PUBLISH CTA MOBILE", () => {
  // Check that single mobile sticky bar has touch targets >= 48px
  assert.ok(
    builderContent.includes("min-h-[48px] min-w-[48px] rounded-xl"),
    "Mobile action button must have touch target >= 48px"
  );
  assert.ok(
    builderContent.includes("min-h-[48px] shadow-sm flex items-center justify-center"),
    "Mobile publish CTA must have min-h-[48px]"
  );
  assert.ok(
    builderContent.includes('patientContext ? "Publicar atualização" : "Publicar Versão"'),
    "Mobile CTA must show 'Publicar atualização' when patientContext is present"
  );
  // Check that duplicate mobile sticky footer is eliminated
  const stickyBarCount = (builderContent.match(/fixed.*bottom-0/g) || []).length;
  assert.strictEqual(stickyBarCount, 1, "There must be exactly 1 sticky bottom bar on mobile");
  // Check that MobileActionSheet includes discard option for patientContext draft
  assert.ok(
    builderContent.includes('id: "discard-draft"'),
    "MobileActionSheet must include discard-draft option"
  );
  assert.ok(
    builderContent.includes('label: "Descartar alterações"'),
    "MobileActionSheet must have 'Descartar alterações' label"
  );
  assert.ok(
    builderContent.includes('variant: "danger"'),
    "Discard draft option must have variant danger"
  );
});

// 5. TOTALS MOBILE INLINE
runTest("TOTALS MOBILE INLINE", () => {
  // Check that mobile in-flow totals block exists below meals
  assert.ok(
    builderContent.includes("Mobile In-Flow Totals Block (Below Meals)"),
    "Mobile in-flow totals block comment must be present"
  );
  assert.ok(
    builderContent.includes("Total Diário"),
    "Mobile totals block must show 'Total Diário'"
  );
  assert.ok(
    builderContent.includes("grid grid-cols-3 gap-2 text-center"),
    "Mobile totals block must use 3-column macro grid"
  );
  assert.ok(
    builderContent.includes("Proteínas") && builderContent.includes("Carboidratos") && builderContent.includes("Gorduras"),
    "Mobile totals block must show Proteínas, Carboidratos, and Gorduras"
  );
  assert.ok(
    builderContent.includes("setIsMicronutrientsDrawerOpen(true)"),
    "Mobile totals block must have button opening micronutrients drawer"
  );
});

// 6. MEALS MOBILE RESPONSIVE
runTest("MEALS MOBILE RESPONSIVE", () => {
  // Check meal header wraps on mobile
  assert.ok(
    mealEditorContent.includes("flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"),
    "Meal header must be flex-col on mobile and sm:flex-row on desktop"
  );
  // Check mobile collapse toggle in title row
  assert.ok(
    mealEditorContent.includes("sm:hidden p-2 text-[var(--text-muted)]"),
    "Meal header must have dedicated mobile collapse button"
  );
  // Check actions have responsive touch targets
  assert.ok(
    mealEditorContent.includes("min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"),
    "Meal action buttons must have min-h-[44px] min-w-[44px] on mobile"
  );
});

// 7. SUBSTITUTIONS MOBILE RESPONSIVE
runTest("SUBSTITUTIONS MOBILE RESPONSIVE", () => {
  // Check substitution header wraps on mobile
  assert.ok(
    subEditorContent.includes("flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2"),
    "Substitution header must allow two lines on mobile with flex-col sm:flex-row"
  );
  assert.ok(
    subEditorContent.includes("self-end sm:self-auto"),
    "Substitution action icons must align properly on line 2 on mobile"
  );
  assert.ok(
    subEditorContent.includes("min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"),
    "Substitution actions must maintain min-h-[44px] min-w-[44px] touch targets on mobile"
  );
});

// 8. DESKTOP TWO COLUMN PRESERVED
runTest("DESKTOP TWO COLUMN PRESERVED", () => {
  assert.ok(
    builderContent.includes("lg:col-span-8"),
    "Desktop main area must occupy 8 columns"
  );
  assert.ok(
    builderContent.includes("lg:col-span-4"),
    "Desktop sticky totals panel must occupy 4 columns"
  );
  assert.ok(
    builderContent.includes("lg:sticky lg:top-6"),
    "Desktop totals panel must remain sticky at top-6"
  );
  assert.ok(
    builderContent.includes("Totais Nutricionais"),
    "Desktop totals panel header must be preserved"
  );
  assert.ok(
    builderContent.includes("hidden sm:flex items-center gap-2.5 flex-wrap"),
    "Desktop action toolbar at top must be preserved"
  );
});

// 9. PATIENT CONTEXT PRESERVED
runTest("PATIENT CONTEXT PRESERVED", () => {
  assert.ok(
    builderContent.includes("patientContext ? patientContext.returnToUrl : `/consultoria/${slug}/planos-v2`"),
    "Back link must preserve returnToUrl when patientContext is present"
  );
  assert.ok(
    builderContent.includes("patientContext ? `Voltar para paciente (${patientContext.studentName})`"),
    "Back link must show patient name when patientContext is present"
  );
  assert.ok(
    builderContent.includes("patientName={patientContext?.studentName}"),
    "Publish dialog must receive patientContext?.studentName"
  );
  assert.ok(
    builderContent.includes("handleDiscardDraft"),
    "Draft discard handler must be preserved"
  );
});

// 10. PHASE 2 LIFECYCLE
runTest("PHASE 2 LIFECYCLE", () => {
  assert.ok(
    builderContent.includes("publishPatientPlanUpdateAction"),
    "publishPatientPlanUpdateAction must be imported and intact"
  );
  assert.ok(
    builderContent.includes("publishPlanVersionAction"),
    "publishPlanVersionAction must be imported and intact"
  );
  assert.ok(
    builderContent.includes("discardPatientPlanDraftAction"),
    "discardPatientPlanDraftAction must be imported and intact"
  );
  assert.ok(
    builderContent.includes("createNextVersionAction"),
    "createNextVersionAction must be imported and intact"
  );
  assert.ok(
    builderContent.includes("tree.version.status === \"DRAFT\""),
    "Draft status checks must be intact"
  );
  assert.ok(
    builderContent.includes("tree.version.status === \"PUBLISHED\""),
    "Published status checks must be intact"
  );
});

if (!allPassed) {
  process.exit(1);
} else {
  console.log("\nALL NUTRITION BUILDER MOBILE RESPONSIVE TESTS PASSED SUCCESSFULLY!");
}
