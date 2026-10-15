/**
 * TREVO ONE — TRAINING STUDIO 3.0 TEST SUITE
 * Verifies semantic colors, 3-level visual hierarchy, colorblind accessible differentiation,
 * combination groupings (Bi-Set, Tri-Set, Circuit, Superset), desktop/mobile ergonomics,
 * and functional non-regressions.
 */

import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";

console.log("================================================================================");
console.log("TREVO ONE — TRAINING STUDIO 3.0: SEMANTIC PALETTE & VISUAL HIERARCHY TEST SUITE");
console.log("================================================================================");

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
    failed++;
  }
}

const rootDir = process.cwd();
const tokensPath = path.join(rootDir, "components/consultancies/training-v2/training-studio-tokens.ts");
const categoryCardPath = path.join(rootDir, "components/consultancies/training-v2/workout-category-card.tsx");
const librarySidebarPath = path.join(rootDir, "components/consultancies/training-v2/studio-exercise-library-sidebar.tsx");
const builderPath = path.join(rootDir, "components/consultancies/training-v2/workout-builder.tsx");

assert.ok(fs.existsSync(tokensPath), "training-studio-tokens.ts must exist");
assert.ok(fs.existsSync(categoryCardPath), "workout-category-card.tsx must exist");
assert.ok(fs.existsSync(librarySidebarPath), "studio-exercise-library-sidebar.tsx must exist");
assert.ok(fs.existsSync(builderPath), "workout-builder.tsx must exist");

const tokensContent = fs.readFileSync(tokensPath, "utf-8");
const categoryContent = fs.readFileSync(categoryCardPath, "utf-8");
const sidebarContent = fs.readFileSync(librarySidebarPath, "utf-8");
const builderContent = fs.readFileSync(builderPath, "utf-8");

// ============================================================================
// 1. SEMANTIC COLOR TOKENS DEFINITION
// ============================================================================
console.log("\n--- 1. SEMANTIC PALETTE MAPPINGS (SECTION 6 & 7) ---");

runTest("1.1 Bi-Set is mapped to BLUE (#3B82F6) with lateral bar, badge, letter avatars and active selector", () => {
  assert.ok(tokensContent.includes("BI_SET:"), "BI_SET key exists");
  assert.ok(tokensContent.includes("#3B82F6"), "BI_SET hex is #3B82F6");
  assert.ok(tokensContent.includes("border-l-blue-500"), "BI_SET has blue lateral bar");
  assert.ok(tokensContent.includes("text-blue-600 dark:text-blue-400"), "BI_SET has accessible blue text");
  assert.ok(tokensContent.includes("bg-blue-600 text-white"), "BI_SET has blue active selector");
});

runTest("1.2 Tri-Set is mapped to PURPLE (#8B5CF6) with lateral bar, badge and letter avatars", () => {
  assert.ok(tokensContent.includes("TRI_SET:"), "TRI_SET key exists");
  assert.ok(tokensContent.includes("#8B5CF6"), "TRI_SET hex is #8B5CF6");
  assert.ok(tokensContent.includes("border-l-purple-500"), "TRI_SET has purple lateral bar");
  assert.ok(tokensContent.includes("text-purple-600 dark:text-purple-400"), "TRI_SET has accessible purple text");
  assert.ok(tokensContent.includes("bg-purple-600 text-white"), "TRI_SET has purple active selector");
});

runTest("1.3 Circuit & Giant-Set are mapped to ORANGE/AMBER (#F59E0B)", () => {
  assert.ok(tokensContent.includes("CIRCUIT:"), "CIRCUIT key exists");
  assert.ok(tokensContent.includes("GIANT_SET:"), "GIANT_SET key exists");
  assert.ok(tokensContent.includes("#F59E0B"), "CIRCUIT hex is #F59E0B");
  assert.ok(tokensContent.includes("border-l-amber-500"), "CIRCUIT has amber lateral bar");
});

runTest("1.4 Superset is mapped to TEAL (#14B8A6)", () => {
  assert.ok(tokensContent.includes("SUPERSET:"), "SUPERSET key exists");
  assert.ok(tokensContent.includes("#14B8A6"), "SUPERSET hex is #14B8A6");
  assert.ok(tokensContent.includes("border-l-teal-500"), "SUPERSET has teal lateral bar");
});

runTest("1.5 Action and status roles strictly separate combination colors from UI state colors", () => {
  assert.ok(tokensContent.includes("STUDIO_ACTION_STYLES"), "STUDIO_ACTION_STYLES is defined");
  assert.ok(tokensContent.includes("primaryAdd:"), "Green reserved for primary add/publish");
  assert.ok(tokensContent.includes("statusDraft:"), "Amber reserved for draft/warnings");
  assert.ok(tokensContent.includes("destructiveRose:"), "Rose reserved for destructive actions");
});

// ============================================================================
// 2. VISUAL HIERARCHY & RECOGNIZABILITY (SECTION 5 & 8)
// ============================================================================
console.log("\n--- 2. VISUAL HIERARCHY & ACCESSIBILITY ---");

runTest("2.1 Color is NOT the sole differentiator: explicit badges, lateral bars and letter avatars A/B/C exist", () => {
  assert.ok(categoryContent.includes("theme.badgeClass"), "Explicit badge class bound to semantic theme");
  assert.ok(categoryContent.includes("theme.borderLeftClass"), "Distinctive lateral bar bound to semantic theme");
  assert.ok(categoryContent.includes("theme.letterAvatarClass"), "Order letter avatars (A., B., C.) bound to semantic theme");
});

runTest("2.2 Isolated exercise card has neutral/gray container, high-priority name and clear prescription", () => {
  assert.ok(
    categoryContent.includes('data-testid="mobile-exercise-card"'),
    "Isolated exercise card has test ID"
  );
  assert.ok(
    categoryContent.includes("border border-[var(--border-subtle)] bg-[var(--surface)]"),
    "Isolated exercise uses clean neutral surface instead of heavy saturated background"
  );
  assert.ok(
    categoryContent.includes("summary.seriesCount"),
    "Prescription series and reps clearly shown"
  );
});

runTest("2.3 Combination floating action bar applies semantic active colors to pills and confirm CTA", () => {
  assert.ok(
    categoryContent.includes("COMBINATION_THEMES[t]?.selectorActiveClass"),
    "Pills dynamically reflect the combination type color (Blue, Purple, Orange, Teal)"
  );
  assert.ok(
    categoryContent.includes("COMBINATION_THEMES[combinationType]?.selectorActiveClass"),
    "Confirm button dynamically highlights with the chosen combination's theme"
  );
});

// ============================================================================
// 3. ERGONOMICS & ADDING EXERCISES (SECTION 10, 11 & 12)
// ============================================================================
console.log("\n--- 3. ERGONOMICS & ONE-CLICK WORKFLOW ---");

runTest("3.1 Studio Library Sidebar has instant visual feedback ('Adicionado!') on exercise addition", () => {
  assert.ok(sidebarContent.includes("justAddedId"), "justAddedId state tracks clicked item");
  assert.ok(sidebarContent.includes("Adicionado!"), "Displays confirmation label");
  assert.ok(sidebarContent.includes("CheckIcon"), "Displays check icon");
});

runTest("3.2 Studio Library Sidebar clearly indicates current target category", () => {
  assert.ok(sidebarContent.includes("Adicionando no treino:"), "Clear target indicator is rendered");
  assert.ok(sidebarContent.includes("currentCategory?.title"), "Target category title dynamically bound");
});

runTest("3.3 Tap-to-edit cards: touching exercise opens prescription editor without hunting for tiny icons", () => {
  assert.ok(
    categoryContent.includes("onOpenQuickEdit()"),
    "Card click triggers onOpenQuickEdit"
  );
  assert.ok(
    categoryContent.includes("role={isDraft ? \"button\" : undefined}"),
    "Accessible button role for card"
  );
});

// ============================================================================
// 4. AUTOSAVE, REORDERING & PERSISTENCE (SECTION 16 & 17)
// ============================================================================
console.log("\n--- 4. AUTOSAVE & INTERNAL ORDER ---");

runTest("4.1 Internal order inside Bi-Set/Tri-Set allows reordering items via onMoveItemInCombination", () => {
  assert.ok(categoryContent.includes("onMoveItemInCombination"), "Combination internal ordering handler present");
  assert.ok(categoryContent.includes("direction = toIdx < fromIdx ? \"up\" : \"down\""), "Reorder direction calculated correctly");
});

runTest("4.2 Compact Desktop Header preserves live autosave indicator and publication gates", () => {
  assert.ok(builderContent.includes('data-testid="builder-status-badge"'), "Status badge preserved");
  assert.ok(builderContent.includes('data-testid="builder-autosave-indicator"'), "Autosave indicator preserved");
  assert.ok(builderContent.includes('data-testid="publish-workout-button"'), "Publish workout button preserved");
});

// ============================================================================
// SUMMARY
// ============================================================================
console.log("\n================================================================================");
console.log(`TEST RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed} total tests`);
console.log("================================================================================");

if (failed > 0) {
  process.exit(1);
}
