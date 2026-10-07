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

// 1. ROOT MOBILE ANCESTOR CONTRACT (< 640px)
runTest("ROOT MOBILE ANCESTOR CONTRACT", () => {
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

  // app/consultoria/.../page.tsx page wrapper contract
  assert.ok(
    pageContent.includes("<main className=\"w-full max-w-full min-w-0 flex-1 flex flex-col\">"),
    "Builder page route must wrap builder in main with w-full max-w-full min-w-0"
  );
});

// 2. MOBILE BUILDER ONE COLUMN AND LAYOUT CONTAINMENT
runTest("MOBILE BUILDER ONE COLUMN AND LAYOUT CONTAINMENT", () => {
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
  assert.ok(
    builderContent.includes("px-4 sm:px-6 md:px-8 py-4 sm:py-8"),
    "Builder root must use predictable mobile padding px-4 without viewport overrides"
  );
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
});

// 3. CONTEXT HEADER RESPONSIVE NATURAL STACK (SECTION 8)
runTest("CONTEXT HEADER RESPONSIVE NATURAL STACK", () => {
  assert.ok(
    builderContent.includes("flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1 w-full max-w-full"),
    "Context banner content must stack vertically on mobile (avatar then student info)"
  );
  assert.ok(
    builderContent.includes("flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0 max-w-full"),
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
    builderContent.includes("break-words [overflow-wrap:anywhere]"),
    "Context banner text must have break-words and overflow-wrap:anywhere"
  );
});

// 4. TOP NAV / BACK LINK MOBILE RESPONSIVE (SECTION 9)
runTest("TOP NAV / BACK LINK MOBILE RESPONSIVE", () => {
  assert.ok(
    builderContent.includes("Voltar para ${patientContext.studentName}"),
    "Mobile back link must render compact student name"
  );
  assert.ok(
    builderContent.includes("Voltar para paciente (${patientContext.studentName})"),
    "Desktop back link must render full patient name"
  );
  assert.ok(
    builderContent.includes("break-words [overflow-wrap:anywhere] min-w-0 max-w-full sm:hidden"),
    "Mobile back link must wrap with break-words and overflow-wrap:anywhere"
  );
  assert.ok(
    !builderContent.includes("max-w-[calc(100%-110px)]"),
    "Fixed calc max-width on back link must be removed"
  );
});

// 5. DESKTOP ACTION BAR CLEANLY SEPARATED
runTest("DESKTOP ACTION BAR CLEANLY SEPARATED", () => {
  assert.ok(
    builderContent.includes("hidden lg:flex items-center gap-2.5 flex-wrap shrink-0"),
    "Desktop action toolbar must be hidden below lg"
  );
  assert.ok(
    builderContent.includes("lg:hidden flex items-center gap-2 shrink-0"),
    "Mobile status badge must be displayed below lg"
  );
  assert.ok(
    builderContent.includes("lg:hidden fixed bottom-0 inset-x-0 z-40"),
    "Mobile sticky action bar must be active below lg"
  );
});

// 6. NO NESTED W-SCREEN OR 100VW
runTest("NO NESTED W-SCREEN OR 100VW", () => {
  const allContents = [rootLayoutContent, pageContent, builderContent, mealEditorContent, itemEditorContent, subEditorContent];
  for (const content of allContents) {
    assert.ok(!content.includes("w-screen"), "Prohibited w-screen found in layout or builder");
    assert.ok(!content.includes("100vw"), "Prohibited 100vw found in layout or builder");
    assert.ok(!content.includes("calc(100vw"), "Prohibited calc(100vw...) found in layout or builder");
  }
});

// 7. NO SCALE OR ZOOM ON BUILDER CONTAINERS
runTest("NO SCALE OR ZOOM ON BUILDER CONTAINERS", () => {
  assert.ok(!builderContent.includes("zoom:"), "Prohibited zoom: found in builder");
  assert.ok(!builderContent.includes("transform: scale("), "Prohibited transform: scale() found in builder");
  // Active press scales on buttons like active:scale-95 are allowed, container scales like scale-105 are not
  const containerScaleMatches = builderContent.match(/\b(?<!active:)scale-\d+/g) || [];
  assert.strictEqual(containerScaleMatches.length, 0, "Prohibited scale utility on container found");
});

// 8. APP SHELL NO DESKTOP SIDEBAR OFFSET ON MOBILE
runTest("APP SHELL NO DESKTOP SIDEBAR OFFSET ON MOBILE", () => {
  assert.ok(
    appShellContent.includes("lg:pl-72"),
    "App Shell desktop sidebar padding must be restricted to lg:pl-72"
  );
  assert.ok(
    !appShellContent.match(/\b(?<!lg:)pl-72/),
    "App Shell must NOT have unconditional pl-72 on mobile"
  );
});

// 9. STRUCTURAL ANTI-PATTERN AUDIT (PROHIBITED MIN-WIDTHS)
runTest("STRUCTURAL ANTI-PATTERN AUDIT", () => {
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

if (!allPassed) {
  process.exit(1);
} else {
  console.log("\nALL NUTRITION BUILDER MOBILE RESPONSIVE STRUCTURAL TESTS PASSED SUCCESSFULLY!");
}
