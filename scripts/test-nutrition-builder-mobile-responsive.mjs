import fs from "fs";
import path from "path";
import assert from "assert";

console.log("=== RUNNING NUTRITION BUILDER MOBILE RESPONSIVE TEST SUITE ===\n");

let allPassed = true;
function runGate(name, fn) {
  try {
    fn();
    console.log(`${name}:\nPASS\n`);
  } catch (err) {
    console.error(`${name}:\nFAIL -> ${err.message}\n`);
    allPassed = false;
  }
}

const rootLayoutPath = "app/layout.tsx";
const pagePath = "app/consultoria/[slug]/planos-v2/[planPublicId]/page.tsx";
const globalsCssPath = "app/globals.css";
const appShellPath = "components/consultancies/consultancy-app-shell.tsx";
const builderPath = "components/consultancies/nutrition-v2/nutrition-plan-builder.tsx";
const mealEditorPath = "components/consultancies/nutrition-v2/nutrition-meal-editor.tsx";
const itemEditorPath = "components/consultancies/nutrition-v2/nutrition-item-editor.tsx";
const subEditorPath = "components/consultancies/nutrition-v2/nutrition-substitution-editor.tsx";
const assignmentsPath = "components/consultancies/nutrition-v2/nutrition-assignments-list.tsx";

const rootLayoutContent = fs.readFileSync(rootLayoutPath, "utf8");
const pageContent = fs.readFileSync(pagePath, "utf8");
const globalsCssContent = fs.readFileSync(globalsCssPath, "utf8");
const appShellContent = fs.readFileSync(appShellPath, "utf8");
const builderContent = fs.readFileSync(builderPath, "utf8");
const mealEditorContent = fs.readFileSync(mealEditorPath, "utf8");
const itemEditorContent = fs.readFileSync(itemEditorPath, "utf8");
const subEditorContent = fs.readFileSync(subEditorPath, "utf8");
const assignmentsContent = fs.readFileSync(assignmentsPath, "utf8");

// 1. NUTRITION PAGE ROOT MIN-W-0
runGate("NUTRITION PAGE ROOT MIN-W-0", () => {
  // globals.css html, body contract
  assert.ok(
    globalsCssContent.includes("max-width: 100%;") && globalsCssContent.includes("min-width: 0;"),
    "globals.css must constrain html and body with max-width: 100% and min-width: 0"
  );

  // app/layout.tsx body contract
  assert.ok(
    rootLayoutContent.includes("<body className=\"min-h-full flex flex-col font-sans bg-[var(--background)] text-[var(--foreground)] relative w-full max-w-full min-w-0\">"),
    "Root layout body must include w-full max-w-full min-w-0"
  );

  // app/layout.tsx content wrapper contract
  assert.ok(
    rootLayoutContent.includes("<div className=\"relative z-10 flex-1 flex flex-col w-full max-w-full min-w-0\">{children}</div>"),
    "Root layout content wrapper must include w-full max-w-full min-w-0"
  );

  // page wrapper contract
  assert.ok(
    pageContent.includes("<main className=\"w-full max-w-full min-w-0 flex-1 flex flex-col\">"),
    "Builder page route must wrap builder in main with w-full max-w-full min-w-0"
  );

  // builder root container contract
  assert.ok(
    builderContent.includes("<div className=\"w-full max-w-full min-w-0 min-h-[calc(100vh-4rem)]"),
    "Builder root container must enforce w-full max-w-full min-w-0"
  );
});

// 2. NUTRITION MOBILE SINGLE COLUMN
runGate("NUTRITION MOBILE SINGLE COLUMN", () => {
  assert.ok(
    builderContent.includes("flex flex-col lg:grid lg:grid-cols-12"),
    "Workspace must use single-column flex-col on mobile and lg:grid lg:grid-cols-12 on desktop"
  );
  assert.ok(
    !builderContent.includes("grid-cols-2") || builderContent.includes("sm:grid-cols-2"),
    "Multi-column grids must not be unconstrained on mobile"
  );
});

// 3. CONTEXT BANNER WRAPS
runGate("CONTEXT BANNER WRAPS", () => {
  assert.ok(
    builderContent.includes("flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1 w-full max-w-full"),
    "Context banner content must stack vertically on mobile (avatar then student info)"
  );
  assert.ok(
    builderContent.includes("flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 min-w-0 w-full max-w-full"),
    "Title and status badge must stack vertically on mobile and horizontally on desktop"
  );
  assert.ok(
    builderContent.includes("Plano alimentar de {patientContext.studentName}"),
    "Context banner must show student name"
  );
  assert.ok(
    builderContent.includes("break-words [overflow-wrap:anywhere]"),
    "Context banner text must have break-words and overflow-wrap:anywhere"
  );
  assert.ok(
    !builderContent.includes("shrink-0\n                    {tree.version.status === \"DRAFT\""),
    "Mobile status badge in context banner must not force container width via shrink-0"
  );
});

// 4. BACK LINK WRAPS
runGate("BACK LINK WRAPS", () => {
  assert.ok(
    builderContent.includes("Voltar para ${patientContext.studentName}"),
    "Mobile back link must render compact student name"
  );
  assert.ok(
    builderContent.includes("Voltar para paciente (${patientContext.studentName})"),
    "Desktop back link must render full patient name"
  );
  assert.ok(
    builderContent.includes("break-words [overflow-wrap:anywhere] sm:hidden"),
    "Mobile back link must wrap with break-words and overflow-wrap:anywhere"
  );
  assert.ok(
    builderContent.includes("flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 min-w-0 w-full max-w-full"),
    "Back link row container must allow flex-wrap on narrow mobile screens"
  );
});

// 5. PLAN HEADER WRAPS
runGate("PLAN HEADER WRAPS", () => {
  assert.ok(
    builderContent.includes("flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 w-full max-w-full min-w-0"),
    "Plan header card must stack on mobile and row on sm+"
  );
  assert.ok(
    builderContent.includes("block break-words [overflow-wrap:anywhere] min-w-0 max-w-full"),
    "Plan title must be constrained with block break-words [overflow-wrap:anywhere] min-w-0 max-w-full"
  );
  assert.ok(
    builderContent.includes("w-full sm:w-auto pt-1 sm:pt-0 shrink-0"),
    "Edit metadata button must take full width on mobile below title"
  );
});

// 6. TOTALS NOT STICKY ON MOBILE
runGate("TOTALS NOT STICKY ON MOBILE", () => {
  assert.ok(
    builderContent.includes("lg:hidden p-4 sm:p-5 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-3 depth-surface w-full max-w-full min-w-0"),
    "Mobile totals block must be in-flow with w-full max-w-full min-w-0 and not sticky"
  );
  assert.ok(
    builderContent.includes("hidden lg:block lg:col-span-4 lg:sticky"),
    "Sticky totals panel must be strictly restricted to desktop (hidden lg:block lg:sticky)"
  );
});

// 7. NO DESKTOP GRID ON MOBILE
runGate("NO DESKTOP GRID ON MOBILE", () => {
  assert.ok(
    !builderContent.match(/\b(?<!lg:)grid-cols-12/),
    "12-column grid must not be applied on mobile"
  );
  assert.ok(
    builderContent.includes("flex flex-col lg:grid lg:grid-cols-12"),
    "Mobile must use flex-col while desktop uses lg:grid lg:grid-cols-12"
  );
});

// 8. NO FIXED MOBILE WIDTH
runGate("NO FIXED MOBILE WIDTH", () => {
  const allContents = [builderContent, mealEditorContent, itemEditorContent, subEditorContent];
  for (const content of allContents) {
    const fixedWidthMatches = content.match(/\b(?<!sm:|md:|lg:|xl:)w-\[(\d+)px\]/g) || [];
    for (const match of fixedWidthMatches) {
      const num = parseInt(match.replace(/[^0-9]/g, ""), 10);
      assert.ok(num < 320, `Found mobile incompatible fixed width: ${match}`);
    }

    const fixedMinWidthMatches = content.match(/\b(?<!sm:|md:|lg:|xl:)min-w-\[(\d+)px\]/g) || [];
    for (const match of fixedMinWidthMatches) {
      const num = parseInt(match.replace(/[^0-9]/g, ""), 10);
      assert.ok(num < 320, `Found mobile incompatible fixed min-width: ${match}`);
    }
  }
});

// 9. NO STRUCTURAL HORIZONTAL OVERFLOW
runGate("NO STRUCTURAL HORIZONTAL OVERFLOW", () => {
  const allContents = [rootLayoutContent, pageContent, builderContent, mealEditorContent, itemEditorContent, subEditorContent];
  for (const content of allContents) {
    assert.ok(!content.includes("w-screen"), "Prohibited w-screen found");
    assert.ok(!content.includes("100vw"), "Prohibited 100vw found");
    assert.ok(!content.includes("calc(100vw"), "Prohibited calc(100vw...) found");
  }
  assert.ok(
    builderContent.includes("w-full max-w-full lg:max-w-7xl mx-auto pb-28 sm:pb-20 min-w-0"),
    "Inner builder container must use max-w-full on mobile"
  );
  assert.ok(
    !builderContent.includes("overflow-x-hidden"),
    "No naive overflow-x-hidden masking in builder"
  );
});

// 10. DESKTOP TWO-COLUMN PRESERVED
runGate("DESKTOP TWO-COLUMN PRESERVED", () => {
  assert.ok(
    builderContent.includes("lg:col-span-8"),
    "Desktop left workspace must be lg:col-span-8"
  );
  assert.ok(
    builderContent.includes("lg:col-span-4"),
    "Desktop right totals panel must be lg:col-span-4"
  );
  assert.ok(
    builderContent.includes("lg:grid lg:grid-cols-12"),
    "Desktop 12-column grid layout must be preserved"
  );
});

if (!allPassed) {
  process.exit(1);
} else {
  console.log("ALL 10 NUTRITION BUILDER MOBILE RESPONSIVE GATES PASSED SUCCESSFULLY!");
}
