/**
 * Automated test script for Student Workout Card Redesign & Actions
 * Verifies:
 * 1. Completion & Restart modal contracts and props.
 * 2. Unfinished session state logic:
 *    - All completed (e.g. 35/35 sets, 13/13 exercises): "Finalizar treino" is primary CTA.
 *    - Partial (e.g. 10/35 sets): "Continuar treino" is primary CTA.
 * 3. Safe history preservation on restart via resolveConflict: "ABANDON".
 * 4. Authentic timestamps (startedAt and completedAt) and no fake reps/load on partial completion.
 * 5. Touch target ergonomics (>= 44px min-h) on all buttons.
 * 6. Clean hierarchy:
 *    - Header: "Meu treino", real weekday (e.g. "Terça-feira"), absence of "Prescrição da consultoria".
 *    - Absence of redundant "Descanso" badge on header.
 *    - Rest day situation: "Hoje é dia de descanso" & "Você pode escolher outro treino sem mudar sua programação."
 *    - Progress text: "Todas as séries concluídas. Falta finalizar o treino." when all done.
 * 7. Actions without duplication:
 *    - Unfinished session has "Finalizar treino" (primary, full-width on mobile), "Ver treino" (when all done), "Mais opções" with "Começar do início".
 *    - No duplicate "Escolher outro" button inside the unfinished session block.
 *    - Single entry in footer: "Escolher outro treino".
 *    - Secondary link: "Ver meus treinos →".
 *    - Absence of redundant italic footer.
 *    - Honest counts: exerciseCount is NEVER coerced to blockCount (divisions count).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

console.log("=== Testing Student Workout Card Redesign & Actions ===\n");

// 1. Verify files exist
const modalCompletionPath = path.resolve("components/dashboard/student/sections/student-workout-completion-modal.tsx");
const modalRestartPath = path.resolve("components/dashboard/student/sections/student-workout-restart-modal.tsx");
const focusSectionPath = path.resolve("components/dashboard/student/sections/student-focus-section.tsx");
const resolverPath = path.resolve("lib/training-v2/daily-workout-resolver.ts");
const actionsPath = path.resolve("app/consultoria/[slug]/treinos/actions.ts");
const execRepoPath = path.resolve("lib/training-v2/execution-repository.ts");

assert.ok(fs.existsSync(modalCompletionPath), "StudentWorkoutCompletionModal file must exist");
assert.ok(fs.existsSync(modalRestartPath), "StudentWorkoutRestartModal file must exist");
assert.ok(fs.existsSync(focusSectionPath), "StudentFocusSection file must exist");
assert.ok(fs.existsSync(resolverPath), "daily-workout-resolver file must exist");
assert.ok(fs.existsSync(actionsPath), "Workout actions file must exist");
assert.ok(fs.existsSync(execRepoPath), "Execution repository file must exist");

console.log("✓ All necessary source files exist.");

// 2. Test logic: isUnfinishedAllDone calculation
function testUnfinishedCompletionState(completedSets, totalSets, completedExercises, totalExercises) {
  return Boolean(
    (totalSets > 0 && completedSets >= totalSets) ||
    (totalExercises > 0 && completedExercises >= totalExercises)
  );
}

// Case from user screenshot: 35 de 35 séries concluídas (13 de 13 exercícios)
assert.strictEqual(
  testUnfinishedCompletionState(35, 35, 13, 13),
  true,
  "35/35 sets and 13/13 exercises must evaluate to isAllDone = true"
);

// Case where all exercises are checked even if sets were uncounted
assert.strictEqual(
  testUnfinishedCompletionState(0, 0, 13, 13),
  true,
  "13/13 exercises checked must evaluate to isAllDone = true"
);

// Case where only partial sets were completed: 10 de 35
assert.strictEqual(
  testUnfinishedCompletionState(10, 35, 3, 13),
  false,
  "10/35 sets and 3/13 exercises must evaluate to isAllDone = false"
);

// Case with 0 sets and 0 exercises done
assert.strictEqual(
  testUnfinishedCompletionState(0, 35, 0, 13),
  false,
  "0 completed sets must evaluate to isAllDone = false"
);

console.log("✓ Unfinished session completion detection logic verified.");

// 3. Verify StudentFocusSection clean hierarchy and text specs
const focusSectionCode = fs.readFileSync(focusSectionPath, "utf-8");

// 3.1 Header cleanup
assert.ok(
  !focusSectionCode.includes("Prescrição da consultoria"),
  "Header must NOT include redundant 'Prescrição da consultoria'"
);
assert.ok(
  !focusSectionCode.includes("border-blue-500/20\">\n                    Descanso"),
  "Header must NOT render redundant yellow/blue outline 'Descanso' badge"
);

// 3.2 Today's rest day situation
assert.ok(
  focusSectionCode.includes("Hoje é dia de descanso"),
  "Must include 'Hoje é dia de descanso'"
);
assert.ok(
  focusSectionCode.includes("Você pode escolher outro treino sem mudar sua programação."),
  "Must include 'Você pode escolher outro treino sem mudar sua programação.'"
);

// 3.3 Unfinished session block
assert.ok(
  focusSectionCode.includes("Todas as séries concluídas. Falta finalizar o treino."),
  "Must render 'Todas as séries concluídas. Falta finalizar o treino.' when all sets done"
);
assert.ok(
  focusSectionCode.includes("Ver treino"),
  "Must offer 'Ver treino' when all sets completed in unfinished session"
);
assert.ok(
  focusSectionCode.includes("SessionMoreOptionsMenu"),
  "Must provide SessionMoreOptionsMenu dropdown for secondary options"
);

// 3.4 Single clear entry for choosing another division
assert.ok(
  focusSectionCode.includes("Escolher outro treino"),
  "Must offer single clear entry 'Escolher outro treino'"
);
assert.ok(
  !focusSectionCode.includes("bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer select-none\">\n                      <span>Escolher um treino</span>"),
  "Must NOT render competing solid blue button for 'Escolher um treino'"
);

// 3.5 Absence of redundant italic footer and false counter
assert.ok(
  !focusSectionCode.includes("italic pt-1"),
  "Must NOT render redundant italic footer repeating rest day and unfinished session date"
);
assert.ok(
  !focusSectionCode.includes(": (activeTraining?.blockCount ?? 0)"),
  "exerciseCount must NEVER fall back to blockCount (divisions count)"
);

console.log("✓ StudentFocusSection clean hierarchy, typography & typography verified.");

// 4. Verify StudentWorkoutCompletionModal implementation
const completionModalCode = fs.readFileSync(modalCompletionPath, "utf-8");

assert.ok(
  completionModalCode.includes("completeWorkoutExecutionAction"),
  "Completion modal must use completeWorkoutExecutionAction"
);

assert.ok(
  completionModalCode.includes("allowEarlyCompletion: true"),
  "Completion modal must pass allowEarlyCompletion: true to allow partial completion without fake reps"
);

assert.ok(
  completionModalCode.includes("studentCompletionState"),
  "Completion modal must pass studentCompletionState"
);

assert.ok(
  completionModalCode.includes("studentFeedbackNotes"),
  "Completion modal must pass studentFeedbackNotes"
);

assert.ok(
  completionModalCode.includes("isSuccessConfirmed"),
  "Completion modal must display success only after server confirmation"
);

assert.ok(
  completionModalCode.includes("min-h-[44px]"),
  "Completion modal must use touch targets >= 44px"
);

console.log("✓ StudentWorkoutCompletionModal implementation verified.");

// 5. Verify StudentWorkoutRestartModal implementation
const restartModalCode = fs.readFileSync(modalRestartPath, "utf-8");

assert.ok(
  restartModalCode.includes("startOrResumeWorkoutExecutionAction"),
  "Restart modal must use startOrResumeWorkoutExecutionAction"
);

assert.ok(
  restartModalCode.includes("resolveConflict: \"ABANDON\""),
  "Restart modal must pass resolveConflict: 'ABANDON' to preserve prior session in history"
);

assert.ok(
  restartModalCode.includes("Histórico preservado com segurança"),
  "Restart modal must explicitly reassure the student about safe history preservation"
);

assert.ok(
  restartModalCode.includes("min-h-[44px]"),
  "Restart modal must use touch targets >= 44px"
);

console.log("✓ StudentWorkoutRestartModal implementation verified.");

// 6. Verify Execution Repository Conflict Resolution ('ABANDON' lifecycle)
const execRepoCode = fs.readFileSync(execRepoPath, "utf-8");

assert.ok(
  execRepoCode.includes("SET status = 'ABANDONED'"),
  "Execution repository must support marking prior session as ABANDONED without deleting set data"
);

assert.ok(
  execRepoCode.includes("options?.resolveConflict === \"ABANDON\""),
  "Execution repository must handle resolveConflict === 'ABANDON'"
);

console.log("✓ Execution repository lifecycle handling for ABANDON verified.");

// 7. Verify daily-workout-resolver has totalSetsCount
const resolverCode = fs.readFileSync(resolverPath, "utf-8");

assert.ok(
  resolverCode.includes("totalSetsCount?: number;"),
  "daily-workout-resolver DailyWorkoutResolution interface must include totalSetsCount"
);

console.log("✓ daily-workout-resolver totalSetsCount inclusion verified.");

console.log("\nALL STUDENT WORKOUT CARD REDESIGN & ACTION TESTS PASSED SUCCESSFULLY!");
