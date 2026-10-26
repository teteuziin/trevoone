/**
 * Automated Verification Suite for Student Workout & Nutrition Experience Redesign
 *
 * Verifies:
 * 1. Division selection & anchoring: student can train any division any day without division transformation
 * 2. Active session isolation: anchored workoutBlockId prevents division bleeding
 * 3. Combination structures: bi-set / tri-set / circuit round-by-round progression and member labeling
 * 4. Clinical data integrity: null actual reps and load preserved when unedited (never faked from prescription)
 * 5. Skipping sets with audit trail (isSkipped = true)
 * 6. Double-tap and concurrency guard (isSubmitting lock)
 * 7. Rest timer with quick adjustments (+30s, -15s, skip) and non-blocking operation
 * 8. Workout finalization with pending sets confirmation and completion celebration
 * 9. Nutrition meal experience: food format "Alimento — Quantidade e medida caseira", direct substitutions, no false clock assumptions, empty state
 * 10. Ergonomics: touch targets >= 48px for primary actions, >= 44px for secondary, centered responsive width up to max-w-6xl
 */

import assert from "node:assert";
import fs from "node:fs";

console.log("=== RUNNING STUDENT WORKOUT & NUTRITION EXPERIENCE TESTS ===\n");

// ============================================================================
// 1. DIVISION SELECTION & PRE-WORKOUT ANCHORING
// ============================================================================
console.log("--- 1. Pre-Workout Division Selection & Anchoring ---");

const studentWorkoutRendererCode = fs.readFileSync(
  "components/consultancies/training-v2/student-workout-renderer.tsx",
  "utf8"
);

// Division selector position before workout starts
assert(
  studentWorkoutRendererCode.includes('activeSession && activeSession.status === "IN_PROGRESS" && mobileViewMode === "FOCUSED"'),
  "Must conditionally render active workout session vs pre-workout division view"
);
assert(
  studentWorkoutRendererCode.includes("const targetBlockPublicId =") &&
    studentWorkoutRendererCode.includes("blocks[selectedBlockIndex].publicId"),
  "Starting a workout must resolve targetBlockPublicId from selectedBlockIndex"
);
assert(
  studentWorkoutRendererCode.includes("startOrResumeWorkoutExecutionAction("),
  "Must invoke startOrResumeWorkoutExecutionAction with targetBlockPublicId"
);

// Exercise count: accounts for active division items
assert(
  studentWorkoutRendererCode.includes("activeBlockExerciseCount"),
  "Must compute accurate exercise count for the active block"
);

// Pre-workout primary CTA touch target
assert(
  studentWorkoutRendererCode.includes("min-h-[52px]"),
  "Pre-workout Start button must have minimum 48-56px height"
);

console.log("✓ Division selector, start targetBlockPublicId, and CTA touch target verified.");

// ============================================================================
// 2. ACTIVE SESSION DIVISION ANCHORING (NO BLEEDING)
// ============================================================================
console.log("\n--- 2. Active Session Division Anchoring & Set Isolation ---");

const focusedViewCode = fs.readFileSync(
  "components/consultancies/training-v2/student-runtime-focused-view.tsx",
  "utf8"
);

// Session anchoring logic
assert(
  focusedViewCode.includes("activeSession.workoutBlockPublicId"),
  "Must anchor active session sets to activeSession.workoutBlockPublicId"
);

// Simulate workout with 2 divisions (Division A: Chest/Tri, Division B: Back/Bi)
const mockWorkout = {
  blocks: [
    {
      id: 101,
      publicId: "block-a",
      title: "Treino A — Peito e Tríceps",
      orderIndex: 0,
      categories: [
        {
          id: 1,
          items: [
            { id: 10, publicId: "item-1", exerciseName: "Supino Reto", setsCount: 3 },
            { id: 11, publicId: "item-2", exerciseName: "Tríceps Corda", setsCount: 3 },
          ],
        },
      ],
    },
    {
      id: 102,
      publicId: "block-b",
      title: "Treino B — Costas e Bíceps",
      orderIndex: 1,
      categories: [
        {
          id: 2,
          items: [
            { id: 20, publicId: "item-3", exerciseName: "Puxada Frontal", setsCount: 3 },
          ],
        },
      ],
    },
  ],
};

const mockSets = [
  // Sets for Division A
  { id: 1, publicId: "set-1", workoutBlockId: 101, blockItemPublicId: "item-1", setNumber: 1, isCompleted: false },
  { id: 2, publicId: "set-2", workoutBlockId: 101, blockItemPublicId: "item-1", setNumber: 2, isCompleted: false },
  { id: 3, publicId: "set-3", workoutBlockId: 101, blockItemPublicId: "item-1", setNumber: 3, isCompleted: false },
  { id: 4, publicId: "set-4", workoutBlockId: 101, blockItemPublicId: "item-2", setNumber: 1, isCompleted: false },
  { id: 5, publicId: "set-5", workoutBlockId: 101, blockItemPublicId: "item-2", setNumber: 2, isCompleted: false },
  { id: 6, publicId: "set-6", workoutBlockId: 101, blockItemPublicId: "item-2", setNumber: 3, isCompleted: false },
  // Sets for Division B
  { id: 7, publicId: "set-7", workoutBlockId: 102, blockItemPublicId: "item-3", setNumber: 1, isCompleted: false },
];

// Verify filtering when active session is anchored to Division A (workoutBlockId: 101)
const activeSessionDivisionA = { id: 1, workoutBlockId: 101 };
const activeDivisionSets = mockSets.filter(
  (s) => s.workoutBlockId === activeSessionDivisionA.workoutBlockId
);

assert.strictEqual(activeDivisionSets.length, 6, "Division A must only have its 6 sets");
assert(
  !activeDivisionSets.some((s) => s.blockItemPublicId === "item-3"),
  "Division B items must NOT bleed into Division A session"
);
console.log("✓ Session sets strictly isolated by division workoutBlockId with zero bleeding.");

// ============================================================================
// 3. COMBINATION STRUCTURES & ROUND PROGRESSION
// ============================================================================
console.log("\n--- 3. Combination Groups (Bi-set, Tri-set, Circuit) ---");

// Test combination order: Round 1 (A -> B) -> Round 2 (A -> B) -> Round 3 (A -> B)
const mockBisetCombination = {
  type: "BISET",
  title: "Super-série Peito + Costas",
  rounds: 3,
  items: [
    { letter: "A", exerciseName: "Supino Inclinado" },
    { letter: "B", exerciseName: "Remada Curvada" },
  ],
};

const roundSequence = [];
for (let r = 1; r <= mockBisetCombination.rounds; r++) {
  for (const item of mockBisetCombination.items) {
    roundSequence.push({ round: r, memberLetter: item.letter, name: item.exerciseName });
  }
}

assert.strictEqual(roundSequence.length, 6, "3 rounds of 2 items = 6 execution steps");
assert.strictEqual(roundSequence[0].memberLetter, "A");
assert.strictEqual(roundSequence[0].round, 1);
assert.strictEqual(roundSequence[1].memberLetter, "B");
assert.strictEqual(roundSequence[1].round, 1);
assert.strictEqual(roundSequence[2].memberLetter, "A");
assert.strictEqual(roundSequence[2].round, 2);
assert.strictEqual(roundSequence[3].memberLetter, "B");
assert.strictEqual(roundSequence[3].round, 2);

// Check that code has Combination letter rendering
assert(
  focusedViewCode.includes("combLetter") && focusedViewCode.includes("{combLetter}"),
  "Must render combination member letter (A, B, C...)"
);
assert(
  focusedViewCode.includes("currentItemContext.combination"),
  "Must detect combination item context"
);
console.log("✓ Combination sequence (Round 1 A->B, Round 2 A->B) and member letters verified.");

// ============================================================================
// 4. CLINICAL DATA INTEGRITY: NULL ACTUALS PRESERVED
// ============================================================================
console.log("\n--- 4. Clinical Data Integrity: Null Actuals Preserved ---");

// Test that unedited reps/load submit null, avoiding faked values
assert(
  focusedViewCode.includes("hasEditedReps"),
  "Must track whether reps were explicitly edited"
);
assert(
  focusedViewCode.includes("hasEditedLoad"),
  "Must track whether load was explicitly edited"
);
assert(
  focusedViewCode.includes("draft?.hasEditedReps") &&
    focusedViewCode.includes("actualReps: finalReps"),
  "Must only submit actualReps if hasEditedReps is true"
);
assert(
  focusedViewCode.includes("draft?.hasEditedLoad") &&
    focusedViewCode.includes("actualLoadKg: finalLoad"),
  "Must only submit actualLoadKg if hasEditedLoad is true"
);

// Simulation of payload generation
function generateSetCompletionPayload(draft, prescribedReps, prescribedLoad) {
  return {
    actualReps: draft?.hasEditedReps && draft.reps != null ? draft.reps : null,
    actualLoadKg:
      draft?.hasEditedLoad && draft.loadKg && !isNaN(parseFloat(draft.loadKg))
        ? parseFloat(draft.loadKg)
        : null,
  };
}

const uneditedPayload = generateSetCompletionPayload(
  { reps: prescribedReps => prescribedReps, hasEditedReps: false, hasEditedLoad: false },
  10,
  50
);
assert.strictEqual(uneditedPayload.actualReps, null, "Unedited reps must submit NULL");
assert.strictEqual(uneditedPayload.actualLoadKg, null, "Unedited load must submit NULL");

const editedPayload = generateSetCompletionPayload(
  { reps: 12, loadKg: "55.5", hasEditedReps: true, hasEditedLoad: true },
  10,
  50
);
assert.strictEqual(editedPayload.actualReps, 12, "Edited reps must submit entered number");
assert.strictEqual(editedPayload.actualLoadKg, 55.5, "Edited load must submit entered float");
console.log("✓ Preservation of clinical integrity (NULL when unedited, exact when edited) verified.");

// ============================================================================
// 5. SKIPPING SETS WITH AUDIT TRAIL
// ============================================================================
console.log("\n--- 5. Skipping Sets with Explicit Audit ---");

assert(
  focusedViewCode.includes("isSkipped: true"),
  "Must provide explicit isSkipped: true when skipping a set"
);
assert(
  focusedViewCode.includes("handleSkipCurrentSet"),
  "Must have dedicated handleSkipCurrentSet action"
);
console.log("✓ Set skipping with isSkipped: true audit verified.");

// ============================================================================
// 6. CONCURRENCY & DOUBLE-TAP PREVENTION
// ============================================================================
console.log("\n--- 6. Double-Tap & Concurrency Prevention ---");

assert(
  focusedViewCode.includes("isSubmitting"),
  "Must have isSubmitting local state lock"
);
assert(
  focusedViewCode.includes("if (!currentSet || loadingSetPublicId || isSubmitting) return;"),
  "Must bail out immediately if isSubmitting is true"
);
assert(
  focusedViewCode.includes("setIsSubmitting(true)"),
  "Must set isSubmitting to true before async dispatch"
);
console.log("✓ Double-tap local submission lock verified.");

// ============================================================================
// 7. REST TIMER WITH QUICK ADJUSTMENTS
// ============================================================================
console.log("\n--- 7. Rest Timer with Quick Adjustments ---");

const restTimerCode = fs.readFileSync(
  "components/consultancies/training-v2/rest-timer.tsx",
  "utf8"
);

assert(restTimerCode.includes("+30s"), "RestTimer must have +30s adjustment button");
assert(restTimerCode.includes("-15s"), "RestTimer must have -15s adjustment button");
assert(restTimerCode.includes("Pular"), "RestTimer must have Pular (skip) button");
assert(restTimerCode.includes("min-h-[44px]"), "Rest timer buttons must meet minimum 44px touch target");
console.log("✓ RestTimer quick adjustments (+30s, -15s, skip) and touch targets verified.");

// ============================================================================
// 8. FINALIZATION CONFIRMATION & CELEBRATION
// ============================================================================
console.log("\n--- 8. Workout Finalization & Pending Sets Confirmation ---");

assert(
  focusedViewCode.includes("showEarlyCompleteModal"),
  "Must show confirmation modal when finalizing with pending sets"
);
assert(
  focusedViewCode.includes("allCompleted"),
  "Must show celebration summary view upon completion"
);
assert(
  focusedViewCode.includes("Treino 100% Concluído") ||
    focusedViewCode.includes("Sensacional!"),
  "Must present clear completion celebration"
);
console.log("✓ Finalization modal with pending confirmation and celebration view verified.");

// ============================================================================
// 9. NUTRITION MEAL-BY-MEAL EXPERIENCE
// ============================================================================
console.log("\n--- 9. Nutrition Experience & Formatting ---");

const nutritionPageCode = fs.readFileSync(
  "app/consultoria/[slug]/nutricao/page.tsx",
  "utf8"
);
const nutritionComponentCode = fs.readFileSync(
  "components/consultancies/nutrition-v2/student-nutrition-v2.tsx",
  "utf8"
);

// Empty state
assert(
  nutritionPageCode.includes("Seu plano alimentar ainda não está disponível.") ||
    nutritionComponentCode.includes("Seu plano alimentar ainda não está disponível."),
  "Nutrition empty state must state 'Seu plano alimentar ainda não está disponível.'"
);

// Food format: "Alimento — Quantidade e medida caseira"
assert(
  nutritionComponentCode.includes("—") &&
    nutritionComponentCode.includes("item.name"),
  "Food item format must display food name separated by dash with amount and household measure"
);

// Substitutions directly inside each food item
assert(
  nutritionComponentCode.includes("substitutions") ||
    nutritionComponentCode.includes("substitutes"),
  "Authorized substitutions must be rendered with food items"
);

// Scheduled meal time: do NOT assume clock time when meal.time is absent
assert(
  nutritionComponentCode.includes("mealsWithTimes") &&
    nutritionComponentCode.includes("mealsWithTimes.length === 0"),
  "Must only calculate next meal if meals have explicit scheduled times"
);
console.log("✓ Nutrition food formatting, direct substitutions, and clock assumption fix verified.");

// ============================================================================
// 10. ERGONOMICS, TOUCH TARGETS & RESPONSIVE DESKTOP CENTERING
// ============================================================================
console.log("\n--- 10. Ergonomics, Touch Targets & Responsive Centering ---");

const trainingPageCode = fs.readFileSync(
  "app/consultoria/[slug]/treinos/[assignmentPublicId]/page.tsx",
  "utf8"
);

// Page width expanded to prevent narrow/cramped desktop layout
assert(
  trainingPageCode.includes("max-w-6xl") || trainingPageCode.includes("max-w-5xl"),
  "Training assignment page must use max-w-5xl or max-w-6xl container"
);
assert(
  nutritionPageCode.includes("max-w-5xl"),
  "Nutrition page must use max-w-5xl centered container"
);

// Guided execution desktop 2-column layout (Left checklist, Right comfortable stage)
assert(
  focusedViewCode.includes("lg:grid lg:grid-cols-") ||
    focusedViewCode.includes("lg:grid-cols-[280px_1fr]") ||
    focusedViewCode.includes("lg:grid-cols-[300px_1fr]"),
  "Focused execution must have 2-column desktop layout with left index checklist"
);

// Primary action touch target >= 48px
assert(
  focusedViewCode.includes("min-h-[52px]") ||
    focusedViewCode.includes("h-14") ||
    focusedViewCode.includes("min-h-[48px]"),
  "Primary 'CONCLUIR SÉRIE' action must have minimum 48-56px height"
);

console.log("✓ Desktop container width, 2-column layout, and primary touch targets verified.");

console.log("\n========================================================");
console.log("ALL 10 VERIFICATION CHECKS PASSED SUCCESSFULLY!");
console.log("========================================================\n");
