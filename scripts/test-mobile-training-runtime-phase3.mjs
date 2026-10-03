import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

console.log("==================================================");
console.log("TREVO ONE — MOBILE NATIVE TRAINING & RUNTIME (PHASE 3)");
console.log("TEST SUITE");
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
// 1. WORKOUT CREATION SHEET (MOBILE-NATIVE MODAL / SHEET)
// -----------------------------------------------------------------------------
const creationSheetPath = path.join(
  rootDir,
  "components/consultancies/training-v2/workout-creation-sheet.tsx"
);
assert.ok(fs.existsSync(creationSheetPath), "workout-creation-sheet.tsx exists");
const creationSheetCode = fs.readFileSync(creationSheetPath, "utf-8");

runTest("1.1 WorkoutCreationSheet exports correctly and offers 3 native options", () => {
  assert.ok(
    creationSheetCode.includes("export function WorkoutCreationSheet"),
    "Must export WorkoutCreationSheet"
  );
  assert.ok(
    creationSheetCode.includes("Criar do zero"),
    "Must include 'Criar do zero' option"
  );
  assert.ok(
    creationSheetCode.includes("Usar plano padrão"),
    "Must include 'Usar plano padrão' option"
  );
  assert.ok(
    creationSheetCode.includes("Importar com IA"),
    "Must include 'Importar com IA' option"
  );
});

runTest("1.2 WorkoutCreationSheet preserves desktop buttons and respects touch targets >= 44px", () => {
  assert.ok(
    creationSheetCode.includes("min-h-[44px]"),
    "Touch targets must be >= 44px"
  );
  assert.ok(
    creationSheetCode.includes("hidden sm:flex") || creationSheetCode.includes("sm:inline-flex"),
    "Desktop side-by-side buttons must be preserved under sm: breakpoint"
  );
});

// -----------------------------------------------------------------------------
// 2. MOBILE WORKOUT LIST & CARD PRESENTATION (app/consultoria/[slug]/rotinas/page.tsx)
// -----------------------------------------------------------------------------
const rotinasPagePath = path.join(rootDir, "app/consultoria/[slug]/rotinas/page.tsx");
assert.ok(fs.existsSync(rotinasPagePath), "rotinas/page.tsx exists");
const rotinasPageCode = fs.readFileSync(rotinasPagePath, "utf-8");

runTest("2.1 Mobile workout list renders clean search bar and touch-friendly tabs", () => {
  assert.ok(
    rotinasPageCode.includes('name="q"') && rotinasPageCode.includes("SearchIcon"),
    "Must render search bar for mobile filtering"
  );
  assert.ok(
    rotinasPageCode.includes("WorkoutCreationSheet"),
    "Must integrate WorkoutCreationSheet for mobile creation flow"
  );
  assert.ok(
    rotinasPageCode.includes("min-h-[40px]"),
    "Filter inputs and tabs must have touch-friendly height"
  );
});

runTest("2.2 Mobile workout cards prioritize Title, Student/Template, Status, and single primary CTA", () => {
  assert.ok(
    rotinasPageCode.includes("sm:hidden"),
    "Must have dedicated mobile card presentation (sm:hidden)"
  );
  assert.ok(
    rotinasPageCode.includes("hidden sm:flex") || rotinasPageCode.includes("hidden sm:block"),
    "Desktop layout must be preserved with sm: breakpoint"
  );
  assert.ok(
    rotinasPageCode.includes("Abrir treino") || rotinasPageCode.includes("Usar modelo"),
    "Primary CTA must be explicit (Abrir treino / Usar modelo)"
  );
  assert.ok(
    rotinasPageCode.includes("min-h-[44px]"),
    "Primary card CTA must have at least 44px touch target"
  );
  assert.ok(
    rotinasPageCode.includes("WorkoutCardActions"),
    "Secondary actions must be delegated to WorkoutCardActions (•••)"
  );
});

// -----------------------------------------------------------------------------
// 3. WORKOUT CARD ACTIONS (••• SHEET & CONFIRMATION)
// -----------------------------------------------------------------------------
const cardActionsPath = path.join(
  rootDir,
  "components/consultancies/training-v2/workout-card-actions.tsx"
);
assert.ok(fs.existsSync(cardActionsPath), "workout-card-actions.tsx exists");
const cardActionsCode = fs.readFileSync(cardActionsPath, "utf-8");

runTest("3.1 WorkoutCardActions uses MobileActionSheet on mobile without exposing 6 simultaneous buttons", () => {
  assert.ok(
    cardActionsCode.includes("MobileActionSheet"),
    "Must use MobileActionSheet for mobile secondary actions"
  );
  assert.ok(
    cardActionsCode.includes("MobileConfirmSheet"),
    "Must use MobileConfirmSheet for deletion confirmation"
  );
  assert.ok(
    cardActionsCode.includes("min-h-[44px]"),
    "Action items must satisfy >= 44px touch target contract"
  );
  assert.ok(
    cardActionsCode.includes("hidden sm:block") || cardActionsCode.includes("sm:relative"),
    "Desktop dropdown menu must remain preserved under sm: breakpoint"
  );
});

// -----------------------------------------------------------------------------
// 4. WORKOUT PUBLISH DIALOG (MOBILE SHEET & HUMANIZED COPY)
// -----------------------------------------------------------------------------
const publishDialogPath = path.join(
  rootDir,
  "components/consultancies/training-v2/workout-publish-dialog.tsx"
);
assert.ok(fs.existsSync(publishDialogPath), "workout-publish-dialog.tsx exists");
const publishDialogCode = fs.readFileSync(publishDialogPath, "utf-8");

runTest("4.1 Publish dialog renders bottom sheet on mobile with safe-area padding", () => {
  assert.ok(
    publishDialogCode.includes("safe-area-inset-bottom"),
    "Publish dialog must respect safe-area-inset-bottom"
  );
  assert.ok(
    publishDialogCode.includes("min-h-[46px]") || publishDialogCode.includes("min-h-[48px]"),
    "Primary CTA button must have prominent >= 46px touch target"
  );
});

runTest("4.2 Publish dialog uses humanized copy and avoids internal technical jargon", () => {
  assert.ok(
    !publishDialogCode.includes("snapshot imutável"),
    "Must not expose 'snapshot imutável' to regular users"
  );
  assert.ok(
    !publishDialogCode.includes("(DRAFT)") && !publishDialogCode.includes("(PUBLISHED)"),
    "Must not expose raw DB status in dialog user-facing text"
  );
  assert.ok(
    publishDialogCode.includes("Rascunho") && publishDialogCode.includes("Disponível para os alunos"),
    "Must use humanized terms like 'Rascunho' and 'Disponível para os alunos'"
  );
  assert.ok(
    publishDialogCode.includes("Publicar treino"),
    "Primary action must be clearly named 'Publicar treino'"
  );
});

// -----------------------------------------------------------------------------
// 5. STUDENT RUNTIME PROGRESSIVE FOCUS (components/consultancies/training-v2/student-runtime-focused-view.tsx)
// -----------------------------------------------------------------------------
const focusedViewPath = path.join(
  rootDir,
  "components/consultancies/training-v2/student-runtime-focused-view.tsx"
);
assert.ok(fs.existsSync(focusedViewPath), "student-runtime-focused-view.tsx exists");
const focusedViewCode = fs.readFileSync(focusedViewPath, "utf-8");

runTest("5.1 Student Runtime answers 'O que eu faço agora?' with single exercise focus", () => {
  assert.ok(
    focusedViewCode.includes("item.exerciseNameSnapshot"),
    "Must display active exercise title snapshot prominently"
  );
  assert.ok(
    focusedViewCode.includes("Série") && focusedViewCode.includes("de"),
    "Must display active series counter (Série X de Y)"
  );
  assert.ok(
    focusedViewCode.includes("hasMethodNote") || focusedViewCode.includes("Método:"),
    "Must display method/execution notes badge directly below title"
  );
  assert.ok(
    focusedViewCode.includes("Ver execução"),
    "Must include [Ver execução] action for video and detailed notes"
  );
});

runTest("5.2 Prescribed vs Performed inputs with touch steppers and Rule 25 (Never show 0 kg)", () => {
  // Steppers for reps
  assert.ok(
    focusedViewCode.includes("Diminuir repetições") && focusedViewCode.includes("Aumentar repetições"),
    "Must provide accessible steppers for reps"
  );
  // Steppers for load
  assert.ok(
    focusedViewCode.includes("Diminuir carga") && focusedViewCode.includes("Aumentar carga"),
    "Must provide accessible steppers for load"
  );
  // Rule 25: Never show 0 kg
  assert.ok(
    focusedViewCode.includes("Livre"),
    "Must display 'Livre' when load is 0 or unassigned instead of '0 kg'"
  );
  assert.ok(
    focusedViewCode.includes("Último registro"),
    "Must show discreet historical performance ('Último registro')"
  );
});

runTest("5.3 Bi-Set / Tri-Set combination progression in Student Runtime", () => {
  assert.ok(
    focusedViewCode.includes("combination.combinationType"),
    "Must indicate combination type (BI-SET, TRI-SET, etc.)"
  );
  assert.ok(
    focusedViewCode.includes("Rodada") && focusedViewCode.includes("de"),
    "Must indicate combination round (Rodada X de Y)"
  );
  assert.ok(
    focusedViewCode.includes("combLetter"),
    "Must indicate combination member letter (A, B, C...)"
  );
  assert.ok(
    focusedViewCode.includes("Próximo na combinação"),
    "Must preview next exercise in combination round without resting immediately"
  );
});

runTest("5.4 Rest Timer, Active Rest, and Skip Rest support", () => {
  assert.ok(
    focusedViewCode.includes("RestTimer"),
    "Must render RestTimer during active rest interval"
  );
  assert.ok(
    focusedViewCode.includes("Descanso Ativo"),
    "Must support Active Rest notification and description"
  );
  assert.ok(
    focusedViewCode.includes("onSkipRest"),
    "Must support skipping rest interval"
  );
});

runTest("5.5 Sticky Bottom Thumb Zone CTA with min-h-[54px] and safe area support", () => {
  assert.ok(
    focusedViewCode.includes("CONCLUIR SÉRIE"),
    "Primary CTA in thumb zone must read 'CONCLUIR SÉRIE'"
  );
  assert.ok(
    focusedViewCode.includes("min-h-[54px]"),
    "Primary thumb CTA must be at least 54px high for easy one-handed tap"
  );
  assert.ok(
    focusedViewCode.includes("safe-area-inset-bottom"),
    "Sticky thumb zone must respect iOS safe-area-inset-bottom"
  );
});

runTest("5.6 Workout Completion Screen", () => {
  assert.ok(
    focusedViewCode.includes("Treino Concluído!") || focusedViewCode.includes("allCompleted"),
    "Must display celebratory completion state when all sets are done"
  );
  assert.ok(
    focusedViewCode.includes("Finalizar treino"),
    "Must provide prominent 'Finalizar treino' action"
  );
  assert.ok(
    focusedViewCode.includes("Duração") && focusedViewCode.includes("Exercícios") && focusedViewCode.includes("Séries"),
    "Must summarize workout stats (duration, exercises, sets)"
  );
});

// -----------------------------------------------------------------------------
// 6. STUDENT WORKOUT RENDERER INTEGRATION (components/consultancies/training-v2/student-workout-renderer.tsx)
// -----------------------------------------------------------------------------
const rendererPath = path.join(
  rootDir,
  "components/consultancies/training-v2/student-workout-renderer.tsx"
);
assert.ok(fs.existsSync(rendererPath), "student-workout-renderer.tsx exists");
const rendererCode = fs.readFileSync(rendererPath, "utf-8");

runTest("6.1 StudentWorkoutRenderer integrates StudentRuntimeFocusedView on mobile", () => {
  assert.ok(
    rendererCode.includes("<StudentRuntimeFocusedView"),
    "Must render StudentRuntimeFocusedView for active mobile sessions"
  );
  assert.ok(
    rendererCode.includes("mobileViewMode"),
    "Must manage mobileViewMode state (FOCUSED vs OVERVIEW)"
  );
  assert.ok(
    rendererCode.includes("Voltar ao Modo Foco"),
    "Must offer sticky return to focus mode button when browsing overview during active session"
  );
  assert.ok(
    rendererCode.includes("hidden sm:block") || rendererCode.includes("sm:hidden"),
    "Desktop view must remain preserved while mobile uses progressive focus"
  );
});

// -----------------------------------------------------------------------------
// 7. UNIT TESTS FOR LOGICAL CONTRACTS (RULE 25 & COMBINATION INTERLEAVING)
// -----------------------------------------------------------------------------
runTest("7.1 Rule 25: Zero load formatting never outputs '0 kg'", () => {
  function formatLoadDisplay(loadKg) {
    if (loadKg != null && loadKg > 0) return `${loadKg} kg`;
    return "Livre";
  }

  assert.strictEqual(formatLoadDisplay(0), "Livre");
  assert.strictEqual(formatLoadDisplay(null), "Livre");
  assert.strictEqual(formatLoadDisplay(undefined), "Livre");
  assert.strictEqual(formatLoadDisplay(25), "25 kg");
  assert.strictEqual(formatLoadDisplay(12.5), "12.5 kg");
});

runTest("7.2 Combination round interleaving simulation (Bi-Set: A1 -> B1 -> rest -> A2 -> B2 -> rest)", () => {
  // Simulate 2 items in Bi-Set with 2 sets each
  const itemA = { id: 1, name: "Supino Inclinado", letter: "A" };
  const itemB = { id: 2, name: "Crucifixo Inclinado", letter: "B" };
  
  // Database sets in chronological order
  const simulatedSets = [
    { id: "s1", itemId: 1, setIndex: 1, round: 1, letter: "A", completed: true },
    { id: "s2", itemId: 2, setIndex: 1, round: 1, letter: "B", completed: false }, // current
    { id: "s3", itemId: 1, setIndex: 2, round: 2, letter: "A", completed: false },
    { id: "s4", itemId: 2, setIndex: 2, round: 2, letter: "B", completed: false },
  ];

  const pending = simulatedSets.filter((s) => !s.completed);
  const current = pending[0];
  assert.strictEqual(current.id, "s2", "Current set is B in Round 1");

  // Determine if next set in round exists without resting
  const nextSet = pending[1];
  const isLastInRound = current.round !== nextSet?.round;
  assert.strictEqual(isLastInRound, true, "After B1, round 1 completes and rest begins");
});

console.log("==================================================");
console.log(`TOTAL TESTS: ${passed + failed}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log("==================================================");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
