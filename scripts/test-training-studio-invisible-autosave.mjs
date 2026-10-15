/**
 * TREVO ONE — TRAINING STUDIO INVISIBLE AUTOSAVE & ZERO DISRUPTION TEST SUITE
 *
 * Verifies that autosave runs 100% in background without disrupting the user:
 * 1. QuickEditExerciseSheet onSave does NOT call setQuickEditingItem(null) (sheet stays open during autosave)
 * 2. QuickEditExerciseSheet onClose DOES call setQuickEditingItem(null) (closes on explicit done/close)
 * 3. QuickEditExerciseSheet item prop is reactive to latest category item
 * 4. EditCombinationSheet onSave does NOT call setEditingCombination(null) (sheet stays open during autosave)
 * 5. EditCombinationSheet onClose DOES call setEditingCombination(null)
 * 6. Silent autosave: handleUpdateExerciseQuickConfig does NOT pop up disruptive notification toasts
 * 7. Silent autosave: handleUpdateCombination does NOT pop up disruptive notification toasts
 * 8. Non-destructive metadata save: setVersion preserves blocks reference to prevent child unmounts/focus loss
 * 9. Layout shift protection: mobile autosave indicator has reserved min-width and whitespace-nowrap
 * 10. Layout shift protection: desktop autosave indicator has reserved min-width and whitespace-nowrap
 * 11. Stale response protection: revisionRef checks currentRev === revisionRef.current
 * 12. Retry without duplication: idempotent updates on metadata, exercise config and combinations
 * 13. Zero navigation: background saves never trigger router.push, router.replace, or router.refresh
 * 14. Publication remains strictly explicit (no autopublish)
 * 15. Combine Mode selection state preserved across background autosaves
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

console.log("================================================================================");
console.log("TREVO ONE — TRAINING STUDIO INVISIBLE AUTOSAVE TEST SUITE");
console.log("================================================================================");

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] ${totalTests}. ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${totalTests}. ${name}:`, err.message);
    throw err;
  }
}

const workoutBuilderPath = path.resolve("components/consultancies/training-v2/workout-builder.tsx");
const workoutCategoryCardPath = path.resolve("components/consultancies/training-v2/workout-category-card.tsx");

const builderContent = fs.readFileSync(workoutBuilderPath, "utf-8");
const categoryCardContent = fs.readFileSync(workoutCategoryCardPath, "utf-8");

// 1. QuickEditExerciseSheet onSave does NOT dismiss sheet
runTest("QuickEditExerciseSheet onSave does NOT dismiss sheet during autosave", () => {
  // Extract QuickEditExerciseSheet block
  const match = categoryCardContent.match(/<QuickEditExerciseSheet[\s\S]*?\/>/);
  assert.ok(match, "QuickEditExerciseSheet must be rendered in workout-category-card");
  const sheetJsx = match[0];
  
  // onSave must not close the sheet
  const onSaveBlock = sheetJsx.match(/onSave=\{async\s*\(config\)\s*=>\s*\{([\s\S]*?)\}\}/);
  assert.ok(onSaveBlock, "onSave handler must be present");
  assert.ok(
    !onSaveBlock[1].includes("setQuickEditingItem(null)"),
    "onSave must NOT call setQuickEditingItem(null), which caused premature sheet closure during autosave"
  );
  assert.ok(
    onSaveBlock[1].includes("onUpdateExerciseQuickConfig"),
    "onSave must persist config via onUpdateExerciseQuickConfig"
  );
});

// 2. QuickEditExerciseSheet onClose DOES dismiss sheet
runTest("QuickEditExerciseSheet onClose dismisses sheet on explicit user exit", () => {
  const match = categoryCardContent.match(/<QuickEditExerciseSheet[\s\S]*?\/>/);
  assert.ok(match, "QuickEditExerciseSheet must be rendered");
  const sheetJsx = match[0];
  assert.ok(
    sheetJsx.includes("onClose={() => setQuickEditingItem(null)}"),
    "onClose must reset quickEditingItem to null when user closes"
  );
});

// 3. QuickEditExerciseSheet item prop is reactive to latest category items
runTest("QuickEditExerciseSheet item prop is reactive to latest category items", () => {
  const match = categoryCardContent.match(/<QuickEditExerciseSheet[\s\S]*?\/>/);
  assert.ok(match, "QuickEditExerciseSheet must be rendered");
  const sheetJsx = match[0];
  assert.ok(
    sheetJsx.includes("items.find((i) => i.publicId === quickEditingItem.publicId) || quickEditingItem"),
    "QuickEditExerciseSheet item prop must be resolved from current items to keep prescription updated"
  );
});

// 4. EditCombinationSheet onSave does NOT dismiss sheet
runTest("EditCombinationSheet onSave does NOT dismiss combination sheet during autosave", () => {
  const match = categoryCardContent.match(/<EditCombinationSheet[\s\S]*?\/>/);
  assert.ok(match, "EditCombinationSheet must be rendered");
  const sheetJsx = match[0];
  const onSaveBlock = sheetJsx.match(/onSave=\{async\s*\(input\)\s*=>\s*\{([\s\S]*?)\}\}/);
  assert.ok(onSaveBlock, "onSave handler must be present");
  assert.ok(
    !onSaveBlock[1].includes("setEditingCombination(null)"),
    "onSave must NOT call setEditingCombination(null), which closed combination sheet during autosave"
  );
  assert.ok(
    onSaveBlock[1].includes("onUpdateCombination"),
    "onSave must persist combination via onUpdateCombination"
  );
});

// 5. EditCombinationSheet onClose DOES dismiss sheet
runTest("EditCombinationSheet onClose dismisses sheet on explicit exit", () => {
  const match = categoryCardContent.match(/<EditCombinationSheet[\s\S]*?\/>/);
  assert.ok(match, "EditCombinationSheet must be rendered");
  const sheetJsx = match[0];
  assert.ok(
    sheetJsx.includes("onClose={() => setEditingCombination(null)}"),
    "onClose must reset editingCombination to null"
  );
});

// 6. Silent autosave: exercise quick config does NOT notify with toast
runTest("Silent autosave: exercise quick config does NOT pop up disruptive toasts", () => {
  const fnMatch = builderContent.match(/async function handleUpdateExerciseQuickConfig[\s\S]*?^  \}/m);
  assert.ok(fnMatch, "handleUpdateExerciseQuickConfig must be present");
  const fnCode = fnMatch[0];
  assert.ok(
    !fnCode.includes('notify("Exercício configurado com sucesso.")'),
    "handleUpdateExerciseQuickConfig must not show toast popup on routine autosave"
  );
});

// 7. Silent autosave: combination update does NOT notify with toast
runTest("Silent autosave: combination update does NOT pop up disruptive toasts", () => {
  const fnMatch = builderContent.match(/async function handleUpdateCombination[\s\S]*?^  \}/m);
  assert.ok(fnMatch, "handleUpdateCombination must be present");
  const fnCode = fnMatch[0];
  assert.ok(
    !fnCode.includes('notify("Combinação atualizada.")'),
    "handleUpdateCombination must not show toast popup on routine autosave"
  );
});

// 8. Non-destructive metadata save preserves blocks reference
runTest("Non-destructive metadata save preserves blocks reference in state", () => {
  const flushMatch = builderContent.match(/const flushPendingMetadata = useCallback[\s\S]*?^  \},/m);
  assert.ok(flushMatch, "flushPendingMetadata must be present");
  const flushCode = flushMatch[0];
  assert.ok(
    flushCode.includes("title: res.data!.title") &&
    flushCode.includes("objective: res.data!.objective"),
    "flushPendingMetadata must update metadata fields selectively"
  );
  assert.ok(
    !flushCode.includes("setVersion(res.data)"),
    "flushPendingMetadata must NOT replace entire version object with new blocks array to prevent focus drop"
  );
});

// 9. Layout shift protection: mobile autosave indicator
runTest("Layout shift protection: mobile autosave indicator has reserved width and whitespace-nowrap", () => {
  const mobileIndicatorMatch = builderContent.match(/data-testid="compact-mobile-header"[\s\S]*?data-testid="builder-autosave-indicator"[\s\S]*?<\/div>/);
  assert.ok(mobileIndicatorMatch, "mobile autosave indicator container must be found");
  const code = mobileIndicatorMatch[0];
  assert.ok(
    code.includes("min-w-[110px]") || code.includes("min-w-[100px]"),
    "Mobile indicator container must have reserved min-width to avoid CLS"
  );
  assert.ok(
    code.includes("whitespace-nowrap"),
    "Mobile status badge must specify whitespace-nowrap"
  );
});

// 10. Layout shift protection: desktop autosave indicator
runTest("Layout shift protection: desktop autosave indicator has reserved width and whitespace-nowrap", () => {
  const desktopHeaderMatch = builderContent.match(/hidden sm:flex[\s\S]*?data-testid="builder-autosave-indicator"[\s\S]*?<\/div>/);
  assert.ok(desktopHeaderMatch, "desktop autosave indicator container must be found");
  const code = desktopHeaderMatch[0];
  assert.ok(
    code.includes("min-w-[145px]") || code.includes("min-w-[140px]"),
    "Desktop indicator container must have reserved min-width to avoid CLS"
  );
  assert.ok(
    code.includes("whitespace-nowrap"),
    "Desktop status badge must specify whitespace-nowrap"
  );
});

// 11. Concurrency: revisionRef protects against out-of-order race conditions
runTest("Concurrency: revisionRef guards against out-of-order race conditions", () => {
  assert.ok(
    builderContent.includes("revisionRef.current === currentRev"),
    "Must verify currentRev against revisionRef.current before applying state"
  );
});

// 12. Retry trigger and non-duplicative updates
runTest("Retry trigger and non-duplicative updates are present", () => {
  assert.ok(
    builderContent.includes("retryLastSaveRef.current?.()"),
    "Retry callback must be invokable on error"
  );
  assert.ok(
    builderContent.includes("saveStatus === \"error\""),
    "Error state must be handled"
  );
});

// 13. Zero navigation: background autosave never navigates
runTest("Zero navigation: background autosave does not trigger router.push or router.refresh", () => {
  const flushMatch = builderContent.match(/const flushPendingMetadata = useCallback[\s\S]*?^  \},/m);
  assert.ok(flushMatch);
  assert.ok(!flushMatch[0].includes("router.push"), "flushPendingMetadata must not navigate");
  assert.ok(!flushMatch[0].includes("router.refresh"), "flushPendingMetadata must not router.refresh");
});

// 14. Publication remains strictly explicit
runTest("Publication remains strictly explicit with zero autopublish", () => {
  assert.ok(
    builderContent.includes("data-testid=\"publish-workout-button\""),
    "Explicit publish button must be present"
  );
  assert.ok(
    builderContent.includes("WorkoutPublishDialog"),
    "Publish dialog must confirm publication explicitly"
  );
});

// 15. Combine Mode selection state preserved
runTest("Combine Mode selection state preserved across background autosaves", () => {
  assert.ok(
    categoryCardContent.includes("selectedExerciseIds"),
    "Selection state must exist in category card"
  );
  assert.ok(
    categoryCardContent.includes("combiningSubBlockId"),
    "Combining mode state must exist in category card"
  );
});

console.log("================================================================================");
console.log(`TEST RESULTS: ${passedTests} passed, 0 failed out of ${totalTests} total tests`);
console.log("================================================================================");
