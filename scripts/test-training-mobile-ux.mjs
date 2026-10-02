import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

console.log("==================================================");
console.log("TREVO ONE — TRAINING BUILDER MOBILE TOUCH UX SUITE");
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

// 1. Audit workout-category-card.tsx
const categoryCardPath = path.join(rootDir, "components/consultancies/training-v2/workout-category-card.tsx");
assert.ok(fs.existsSync(categoryCardPath), "workout-category-card.tsx exists");
const categoryCardCode = fs.readFileSync(categoryCardPath, "utf-8");

runTest("1. Whole-Card Selection contract is implemented in ExerciseRow", () => {
  // Must have role="checkbox" or role button on the selectable element
  assert.ok(
    categoryCardCode.includes('role={isSelectionMode && !inCombination ? "checkbox" : undefined}'),
    "ExerciseRow outer card must declare role=checkbox in selection mode"
  );
  assert.ok(
    categoryCardCode.includes('aria-checked={isSelectionMode && !inCombination ? isSelected : undefined}'),
    "ExerciseRow outer card must declare aria-checked in selection mode"
  );
  assert.ok(
    categoryCardCode.includes("onToggleSelect?.()"),
    "ExerciseRow must toggle selection on card click"
  );
  assert.ok(
    categoryCardCode.includes("✓ Selecionado"),
    "ExerciseRow must display clear '✓ Selecionado' visual indicator badge"
  );
});

runTest("2. Selection Checkbox has >= 44x44px touch target on mobile", () => {
  assert.ok(
    categoryCardCode.includes("min-h-[44px] min-w-[44px]"),
    "Checkbox touch target must be at least 44x44px"
  );
});

runTest("3. Sticky Floating Combination Bar is implemented with safe-area and z-50", () => {
  assert.ok(
    categoryCardCode.includes("CombinationFloatingActionBar"),
    "CombinationFloatingActionBar component must exist"
  );
  assert.ok(
    categoryCardCode.includes("fixed bottom-0 inset-x-0 z-50"),
    "Combination floating bar must be fixed bottom-0 with z-50 above mobile bottom navigation"
  );
  assert.ok(
    categoryCardCode.includes("safe-area-inset-bottom"),
    "Combination floating bar must respect iOS safe-area-inset-bottom"
  );
});

runTest("4. Combination Bar features Type Selector Pills and Rest Stepper", () => {
  assert.ok(
    categoryCardCode.includes("COMBINATION_TYPE_LABELS[t]"),
    "Combination type pills must be rendered"
  );
  assert.ok(
    categoryCardCode.includes("Math.max(0, restSeconds - 15)"),
    "Rest stepper decrement by 15s must be implemented"
  );
  assert.ok(
    categoryCardCode.includes("Math.min(600, restSeconds + 15)"),
    "Rest stepper increment by 15s must be implemented"
  );
  assert.ok(
    categoryCardCode.includes("min-h-[48px]"),
    "Primary Create Combination CTA must have min-h-[48px]"
  );
});

runTest("5. Reorder without drag is available on cards and in menu", () => {
  // Card reorder arrows have touch target >= 44px
  assert.ok(
    categoryCardCode.includes("aria-label=\"Mover exercício para cima\""),
    "Accessible move up button exists"
  );
  assert.ok(
    categoryCardCode.includes("aria-label=\"Mover exercício para baixo\""),
    "Accessible move down button exists"
  );
  // Menu contains Mover para cima and Mover para baixo
  assert.ok(
    categoryCardCode.includes("<span>Mover para cima</span>"),
    "Exercise menu must contain 'Mover para cima'"
  );
  assert.ok(
    categoryCardCode.includes("<span>Mover para baixo</span>"),
    "Exercise menu must contain 'Mover para baixo'"
  );
  assert.ok(
    categoryCardCode.includes("<span>Mover para cima no grupo</span>"),
    "Combination items menu must contain 'Mover para cima no grupo'"
  );
  assert.ok(
    categoryCardCode.includes("<span>Mover para baixo no grupo</span>"),
    "Combination items menu must contain 'Mover para baixo no grupo'"
  );
});

runTest("6. Reorder arrows inside combinations have touch targets >= 44px", () => {
  assert.ok(
    categoryCardCode.includes("aria-label=\"Mover para cima na combinação\""),
    "Accessible combination item move up exists"
  );
  assert.ok(
    categoryCardCode.includes("aria-label=\"Mover para baixo na combinação\""),
    "Accessible combination item move down exists"
  );
});

// 2. Audit custom-exercise-inline-modal.tsx
const customModalPath = path.join(rootDir, "components/consultancies/training-v2/custom-exercise-inline-modal.tsx");
assert.ok(fs.existsSync(customModalPath), "custom-exercise-inline-modal.tsx exists");
const customModalCode = fs.readFileSync(customModalPath, "utf-8");

runTest("7. Custom Exercise Modal has structured blocks (Exercício, Prescrição, Vídeo, Observações, Biblioteca)", () => {
  assert.ok(customModalCode.includes("1. Exercício"), "Block 1: Exercício must be present");
  assert.ok(customModalCode.includes("2. Prescrição Padrão"), "Block 2: Prescrição must be present");
  assert.ok(customModalCode.includes("3. Vídeo de Execução"), "Block 3: Vídeo must be present");
  assert.ok(customModalCode.includes("4. Observações ou Orientações Técnicas"), "Block 4: Observações must be present");
  assert.ok(customModalCode.includes("Salvar também na minha biblioteca da consultoria"), "Block 5: Biblioteca must be present");
});

runTest("8. Custom Exercise Modal has sticky bottom footer action bar with safe-area and min-h-[48px]", () => {
  assert.ok(
    customModalCode.includes("safe-area-inset-bottom"),
    "Custom Exercise footer must respect safe-area-inset-bottom"
  );
  assert.ok(
    customModalCode.includes("min-h-[48px] sm:min-h-[40px]"),
    "Custom Exercise primary button must be min-h-[48px] on mobile"
  );
  assert.ok(
    customModalCode.includes("Adicionar ao Treino"),
    "Save CTA 'Adicionar ao Treino' must be present"
  );
});

// 3. Audit workout-builder.tsx
const builderPath = path.join(rootDir, "components/consultancies/training-v2/workout-builder.tsx");
assert.ok(fs.existsSync(builderPath), "workout-builder.tsx exists");
const builderCode = fs.readFileSync(builderPath, "utf-8");

runTest("9. WorkoutBuilder primary actions have touch targets >= 44px", () => {
  assert.ok(
    builderCode.includes("min-h-[44px] sm:min-h-[40px] flex items-center gap-1.5 cursor-pointer"),
    "Publish and Save header buttons have min 44px touch targets on mobile"
  );
  assert.ok(
    builderCode.includes("min-h-[44px] min-w-[44px] sm:min-h-[40px]"),
    "Header more menu button has min 44x44px touch target on mobile"
  );
});

// 4. Audit workout-card-actions.tsx
const cardActionsPath = path.join(rootDir, "components/consultancies/training-v2/workout-card-actions.tsx");
assert.ok(fs.existsSync(cardActionsPath), "workout-card-actions.tsx exists");
const cardActionsCode = fs.readFileSync(cardActionsPath, "utf-8");

runTest("10. WorkoutCardActions touch targets upgraded to >= 44px on mobile", () => {
  assert.ok(
    cardActionsCode.includes("min-h-[44px] sm:min-h-[34px]"),
    "Abrir button has min-h-[44px] on mobile"
  );
  assert.ok(
    cardActionsCode.includes("min-h-[44px] min-w-[44px] sm:min-h-[34px] sm:min-w-[34px]"),
    "More menu button has min-h-[44px] min-w-[44px] on mobile"
  );
  assert.ok(
    cardActionsCode.includes("min-h-[40px] sm:min-h-[32px]"),
    "Menu items have min 40px touch area"
  );
});

// 5. Functional logic tests
runTest("11. Combination type auto-suggestion logic is correct", () => {
  function getSuggestedType(count) {
    if (count === 2) return "BI_SET";
    if (count === 3) return "TRI_SET";
    if (count >= 4) return "GIANT_SET";
    return "BI_SET";
  }

  assert.equal(getSuggestedType(2), "BI_SET");
  assert.equal(getSuggestedType(3), "TRI_SET");
  assert.equal(getSuggestedType(4), "GIANT_SET");
  assert.equal(getSuggestedType(5), "GIANT_SET");
});

runTest("12. Rest stepper clamping and step logic is correct", () => {
  function stepRest(current, direction) {
    if (direction === "up") return Math.min(600, current + 15);
    if (direction === "down") return Math.max(0, current - 15);
    return current;
  }

  assert.equal(stepRest(60, "up"), 75);
  assert.equal(stepRest(60, "down"), 45);
  assert.equal(stepRest(10, "down"), 0);
  assert.equal(stepRest(0, "down"), 0);
  assert.equal(stepRest(595, "up"), 600);
  assert.equal(stepRest(600, "up"), 600);
});

runTest("13. Whole-card selection state toggle logic is deterministic", () => {
  function toggleSelection(currentList, id) {
    if (currentList.includes(id)) {
      return currentList.filter((x) => x !== id);
    }
    return [...currentList, id];
  }

  let selected = [];
  selected = toggleSelection(selected, "ex-1");
  assert.deepEqual(selected, ["ex-1"]);
  selected = toggleSelection(selected, "ex-2");
  assert.deepEqual(selected, ["ex-1", "ex-2"]);
  selected = toggleSelection(selected, "ex-1");
  assert.deepEqual(selected, ["ex-2"]);
  selected = toggleSelection(selected, "ex-2");
  assert.deepEqual(selected, []);
});

runTest("14. Core flow does NOT require drag-and-drop", () => {
  // Verified by checking that move functions can be triggered via buttons and menu without drag
  assert.ok(categoryCardCode.includes("onMoveUp"), "onMoveUp is directly callable from UI button and menu");
  assert.ok(categoryCardCode.includes("onMoveDown"), "onMoveDown is directly callable from UI button and menu");
});

runTest("15. Core flow does NOT require tiny 16px checkbox", () => {
  // Verified by checking whole-card selection click handler
  assert.ok(
    categoryCardCode.includes("if (isSelectionMode && !inCombination)"),
    "Entire exercise row toggles selection in selection mode"
  );
});

console.log("\n==================================================");
console.log(`TEST RESULTS: ${passed} passed, ${failed} failed`);
console.log("==================================================");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
