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
const assignmentsPath = "components/consultancies/nutrition-v2/nutrition-assignments-list.tsx";

const builderContent = fs.readFileSync(builderPath, "utf8");
const mealEditorContent = fs.readFileSync(mealEditorPath, "utf8");
const itemEditorContent = fs.readFileSync(itemEditorPath, "utf8");
const subEditorContent = fs.readFileSync(subEditorPath, "utf8");
const assignmentsContent = fs.readFileSync(assignmentsPath, "utf8");

// 1. MOBILE BUILDER ONE COLUMN
runTest("MOBILE BUILDER ONE COLUMN", () => {
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

// 2. ROOT WRAPPERS AND OVERFLOW CONTAINMENT
runTest("ROOT WRAPPERS AND OVERFLOW CONTAINMENT", () => {
  // Check that containers have max-w-full, min-w-0 and w-full
  assert.ok(
    builderContent.includes("w-full max-w-full min-w-0"),
    "Builder root containers must have w-full max-w-full min-w-0"
  );
  assert.ok(
    mealEditorContent.includes("w-full max-w-full min-w-0"),
    "Meal editor container must have w-full max-w-full min-w-0"
  );
  assert.ok(
    itemEditorContent.includes("w-full max-w-full min-w-0"),
    "Item editor container must have w-full max-w-full min-w-0"
  );
  assert.ok(
    subEditorContent.includes("w-full max-w-full min-w-0"),
    "Substitution editor container must have w-full max-w-full min-w-0"
  );
  assert.ok(
    assignmentsContent.includes("w-full max-w-full min-w-0"),
    "Assignments list container must have w-full max-w-full min-w-0"
  );
  assert.ok(
    subEditorContent.includes("pl-3 sm:pl-6"),
    "Substitution editor must use pl-3 on mobile and sm:pl-6 on desktop"
  );
});

// 3. CONTEXT HEADER RESPONSIVE NATURAL STACK
runTest("CONTEXT HEADER RESPONSIVE NATURAL STACK", () => {
  // Check that patient context banner stacks naturally on mobile
  assert.ok(
    builderContent.includes("flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3"),
    "Context banner content must stack vertically on mobile (avatar then student info)"
  );
  assert.ok(
    builderContent.includes("flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2"),
    "Title and status badge must stack vertically on mobile and horizontally on desktop"
  );
  assert.ok(
    builderContent.includes("self-start sm:self-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--brand)]"),
    "Status badge on mobile must align self-start without forcing container width"
  );
  assert.ok(
    builderContent.includes("hidden lg:flex items-center gap-2 shrink-0"),
    "Context banner desktop action buttons must be hidden below lg"
  );
  assert.ok(
    builderContent.includes("Plano alimentar de {patientContext.studentName}"),
    "Context banner must show student name"
  );
  assert.ok(
    builderContent.includes("break-words"),
    "Context banner text must have break-words"
  );
});

// 4. TOP NAV / BACK LINK MOBILE RESPONSIVE
runTest("TOP NAV / BACK LINK MOBILE RESPONSIVE", () => {
  // Mobile uses compact 'Voltar para {name}', desktop uses 'Voltar para paciente ({name})'
  assert.ok(
    builderContent.includes("Voltar para ${patientContext.studentName}"),
    "Mobile back link must render compact student name"
  );
  assert.ok(
    builderContent.includes("Voltar para paciente (${patientContext.studentName})"),
    "Desktop back link must render full patient name"
  );
  assert.ok(
    builderContent.includes("break-words sm:hidden"),
    "Mobile back link must wrap with break-words"
  );
  assert.ok(
    !builderContent.includes("max-w-[calc(100%-110px)]"),
    "Fixed calc max-width on back link must be removed"
  );
});

// 5. DESKTOP ACTION BAR CLEANLY SEPARATED
runTest("DESKTOP ACTION BAR CLEANLY SEPARATED", () => {
  // Desktop action toolbar hidden on mobile (<lg)
  assert.ok(
    builderContent.includes("hidden lg:flex items-center gap-2.5 flex-wrap shrink-0"),
    "Desktop action toolbar must be hidden below lg"
  );
  // Mobile badge visible below lg
  assert.ok(
    builderContent.includes("lg:hidden flex items-center gap-2 shrink-0"),
    "Mobile status badge must be displayed below lg"
  );
  // Mobile sticky bottom action bar active below lg
  assert.ok(
    builderContent.includes("lg:hidden fixed bottom-0 inset-x-0 z-40"),
    "Mobile sticky action bar must be active below lg"
  );
});

// 6. PLAN HEADER MOBILE WRAP AND BUTTON PLACEMENT
runTest("PLAN HEADER MOBILE WRAP AND BUTTON PLACEMENT", () => {
  assert.ok(
    builderContent.includes("[overflow-wrap:anywhere]"),
    "Plan title must support overflow-wrap:anywhere"
  );
  assert.ok(
    builderContent.includes("w-full sm:w-auto pt-1 sm:pt-0 shrink-0"),
    "Edit metadata button must be placed on its own row on mobile"
  );
});

// 7. MEALS MOBILE RESPONSIVE
runTest("MEALS MOBILE RESPONSIVE", () => {
  assert.ok(
    mealEditorContent.includes("flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"),
    "Meal header must be flex-col on mobile and sm:flex-row on desktop"
  );
  assert.ok(
    mealEditorContent.includes("sm:hidden p-2 text-[var(--text-muted)]"),
    "Meal header must have dedicated mobile collapse button"
  );
  assert.ok(
    mealEditorContent.includes("min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"),
    "Meal action buttons must have min-h-[44px] min-w-[44px] on mobile"
  );
  assert.ok(
    mealEditorContent.includes("pt-1 sm:pt-0 border-t sm:border-t-0"),
    "Meal actions must be on separate line on mobile"
  );
});

// 8. ITEMS AND SUBSTITUTIONS 2-LINE FOOD NAME AND MOBILE ACTIONS
runTest("ITEMS AND SUBSTITUTIONS 2-LINE FOOD NAME AND MOBILE ACTIONS", () => {
  assert.ok(
    itemEditorContent.includes("line-clamp-2 break-words [overflow-wrap:anywhere] min-w-0"),
    "Food name in items must allow 2 lines with line-clamp-2 and overflow-wrap:anywhere"
  );
  assert.ok(
    subEditorContent.includes("line-clamp-2 break-words [overflow-wrap:anywhere] min-w-0"),
    "Food name in substitutions must allow 2 lines with line-clamp-2 and overflow-wrap:anywhere"
  );
  assert.ok(
    itemEditorContent.includes("pt-1 sm:pt-0 border-t sm:border-t-0"),
    "Item action icons must be on separate line on mobile"
  );
  assert.ok(
    subEditorContent.includes("pt-1 sm:pt-0 border-t sm:border-t-0"),
    "Substitution action icons must be on separate line on mobile"
  );
});

// 9. TOTALS AND MICRONUTRIENTS DRAWER PLACEMENT
runTest("TOTALS AND MICRONUTRIENTS DRAWER PLACEMENT", () => {
  assert.ok(
    builderContent.includes("Mobile In-Flow Totals Block (Below Meals)"),
    "Mobile in-flow totals block must be present"
  );
  assert.ok(
    builderContent.includes("grid grid-cols-3 gap-2 text-center"),
    "Mobile totals block must use 3-column macro grid"
  );
  assert.ok(
    builderContent.includes("setIsMicronutrientsDrawerOpen(true)"),
    "Mobile totals block must have button opening micronutrients drawer"
  );
  // Drawer must NOT be nested inside the hidden lg:block sidebar
  const sidebarIndex = builderContent.indexOf("hidden lg:block lg:col-span-4 lg:sticky");
  const drawerIndex = builderContent.indexOf("Micronutrients Drawer (Mobile & Modal)");
  assert.ok(
    drawerIndex > sidebarIndex,
    "Micronutrients drawer must be outside the hidden lg:block sidebar"
  );
});

// 10. ASSIGNMENTS LIST ROBUST WRAPPING
runTest("ASSIGNMENTS LIST ROBUST WRAPPING", () => {
  assert.ok(
    assignmentsContent.includes("break-all"),
    "Student email must have break-all to prevent horizontal container push"
  );
});

// 11. DESKTOP LAYOUT PRESERVED
runTest("DESKTOP LAYOUT PRESERVED", () => {
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
    builderContent.includes("hidden lg:flex items-center gap-2.5 flex-wrap"),
    "Desktop action toolbar at top must be preserved at lg:flex"
  );
});

// 12. STRUCTURAL ANTI-PATTERN AUDIT
runTest("STRUCTURAL ANTI-PATTERN AUDIT", () => {
  const allContents = [builderContent, mealEditorContent, itemEditorContent, subEditorContent];
  
  for (const content of allContents) {
    // Check for fixed width styles like w-[500px] or w-[600px] without responsive prefix
    const fixedWidthMatches = content.match(/\b(?<!sm:|md:|lg:|xl:)w-\[(\d+)px\]/g) || [];
    for (const match of fixedWidthMatches) {
      const num = parseInt(match.replace(/[^0-9]/g, ""), 10);
      assert.ok(num < 320, `Found mobile incompatible fixed width: ${match}`);
    }

    // Check for fixed min-width styles like min-w-[500px]
    const fixedMinWidthMatches = content.match(/\b(?<!sm:|md:|lg:|xl:)min-w-\[(\d+)px\]/g) || [];
    for (const match of fixedMinWidthMatches) {
      const num = parseInt(match.replace(/[^0-9]/g, ""), 10);
      assert.ok(num < 320, `Found mobile incompatible fixed min-width: ${match}`);
    }
  }
});

if (!allPassed) {
  process.exit(1);
} else {
  console.log("\nALL NUTRITION BUILDER MOBILE RESPONSIVE STRUCTURAL TESTS PASSED SUCCESSFULLY!");
}
