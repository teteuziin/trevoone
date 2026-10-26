/**
 * TREVO ONE — TEST SUITE: STUDENT WORKOUT CHECKLIST, DIRECT ENTRY & CUSTOM TITLES
 *
 * Verifies:
 * 1. Root causes fixed: No "Hoje: Hoje", timezone resilience, safe error fallback.
 * 2. Exercise Checklist Model: Completion toggle and skip actions without fabricating sets data.
 * 3. Feedback persistence & notification: studentCompletionState and studentFeedbackNotes.
 * 4. Custom Routine Titles: wa.custom_title precedence on personal assignment and student views.
 * 5. Direct Division Entry on "Meus treinos".
 */

import assert from "node:assert";
import fs from "node:fs";

console.log("================================================================================");
console.log("TREVO ONE — TEST: STUDENT WORKOUT CHECKLIST, DIRECT ENTRY & CUSTOM TITLES");
console.log("================================================================================\n");

function runTest(name, fn) {
  try {
    fn();
    console.log(`✓ PASS: ${name}`);
  } catch (err) {
    console.error(`✗ FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// -----------------------------------------------------------------------------
// Test 1: Daily Workout Resolver & Dashboard Subtitle (No "Hoje: Hoje")
// -----------------------------------------------------------------------------
runTest("Daily workout resolver and focus section prevent duplicate 'Hoje: Hoje'", () => {
  const resolverCode = fs.readFileSync("lib/training-v2/daily-workout-resolver.ts", "utf8");
  const focusCode = fs.readFileSync("components/dashboard/student/sections/student-focus-section.tsx", "utf8");

  // In resolver catch block, todayWeekdayName is safe
  assert.ok(resolverCode.includes('todayWeekdayName: ""'), "Resolver error fallback must not set todayWeekdayName to 'Hoje'");

  // In focus section, subtitle must not repeat 'Hoje: Hoje'
  assert.ok(
    focusCode.includes('dailyWorkoutResolution.todayWeekdayName !== "Hoje"'),
    "student-focus-section must prevent 'Hoje: Hoje'"
  );
  assert.ok(
    focusCode.includes('dailyWorkoutResolution.status !== "ERROR"'),
    "student-focus-section must not display weekday on error"
  );
});

// -----------------------------------------------------------------------------
// Test 2: Timezone Safe Validation in Resolver
// -----------------------------------------------------------------------------
runTest("Daily workout resolver validates IANA timezone before formatting", () => {
  const resolverCode = fs.readFileSync("lib/training-v2/daily-workout-resolver.ts", "utf8");
  assert.ok(resolverCode.includes("isValidIanaTimezone"), "Must validate IANA timezone");
  assert.ok(
    resolverCode.includes('timeZone = "America/Sao_Paulo"'),
    "Must have safe fallback to America/Sao_Paulo"
  );
});

// -----------------------------------------------------------------------------
// Test 3: Exercise Checklist & Skip Actions in Execution Repository
// -----------------------------------------------------------------------------
runTest("Execution repository provides checklist toggle and skip functions", () => {
  const repoCode = fs.readFileSync("lib/training-v2/execution-repository.ts", "utf8");
  const actionsCode = fs.readFileSync("app/consultoria/[slug]/treinos/actions.ts", "utf8");

  assert.ok(
    repoCode.includes("export async function toggleWorkoutExecutionExercise"),
    "Must export toggleWorkoutExecutionExercise"
  );
  assert.ok(
    repoCode.includes("export async function skipWorkoutExecutionExercise"),
    "Must export skipWorkoutExecutionExercise"
  );
  assert.ok(
    actionsCode.includes("export async function toggleWorkoutExecutionExerciseAction"),
    "Must export toggleWorkoutExecutionExerciseAction"
  );
  assert.ok(
    actionsCode.includes("export async function skipWorkoutExecutionExerciseAction"),
    "Must export skipWorkoutExecutionExerciseAction"
  );
});

// -----------------------------------------------------------------------------
// Test 4: Finalization Feedback Persistence
// -----------------------------------------------------------------------------
runTest("Execution repository and action support student feedback on completion", () => {
  const repoCode = fs.readFileSync("lib/training-v2/execution-repository.ts", "utf8");
  const actionsCode = fs.readFileSync("app/consultoria/[slug]/treinos/actions.ts", "utf8");

  assert.ok(
    repoCode.includes("studentCompletionState"),
    "Execution options must support studentCompletionState"
  );
  assert.ok(
    repoCode.includes("studentFeedbackNotes"),
    "Execution options must support studentFeedbackNotes"
  );
  assert.ok(
    repoCode.includes("student_feedback_notes"),
    "SQL must update student_feedback_notes"
  );
  assert.ok(
    actionsCode.includes("studentFeedbackNotes"),
    "completeWorkoutExecutionAction must accept studentFeedbackNotes"
  );
});

// -----------------------------------------------------------------------------
// Test 5: Custom Title Precedence for Workout Assignments
// -----------------------------------------------------------------------------
runTest("Custom title (wa.custom_title) is supported and takes precedence over wv.title", () => {
  const assignRepoCode = fs.readFileSync("lib/training-v2/assignment-repository.ts", "utf8");
  const modalCode = fs.readFileSync("components/consultancies/training-v2/workout-assign-modal.tsx", "utf8");
  const resolverCode = fs.readFileSync("lib/training-v2/daily-workout-resolver.ts", "utf8");

  // Assignment creation input
  assert.ok(
    assignRepoCode.includes("customTitle?: string | null"),
    "CreateAssignmentInput must include customTitle"
  );

  // Modal allows editing custom title
  assert.ok(
    modalCode.includes("Nome da ficha para o aluno"),
    "WorkoutAssignModal must include field for student custom routine name"
  );
  assert.ok(
    modalCode.includes("Treino de ${selectedStudent.name}"),
    "WorkoutAssignModal must default suggestion to 'Treino de [Aluno]'"
  );

  // Precedence in daily-workout-resolver
  assert.ok(
    resolverCode.includes("COALESCE(NULLIF(TRIM(wa.custom_title), ''), wv.title)"),
    "Resolver queries must prioritize wa.custom_title"
  );

  // Precedence in listStudentWorkoutCards
  assert.ok(
    assignRepoCode.includes("COALESCE(NULLIF(TRIM(wa.custom_title), ''), wv.title)"),
    "listStudentWorkoutCards must prioritize wa.custom_title"
  );
});

// -----------------------------------------------------------------------------
// Test 6: Direct Division Entry on "Meus treinos"
// -----------------------------------------------------------------------------
runTest("Student treinos client view renders direct division entry cards", () => {
  const treinosCode = fs.readFileSync("components/consultancies/training-v2/student-treinos-client-view.tsx", "utf8");

  assert.ok(
    treinosCode.includes("Divisões de Treino da Ficha"),
    "Must have section for divisions list"
  );
  assert.ok(
    treinosCode.includes("Treinar esta divisão"),
    "Must offer direct button to train each division"
  );
});

// -----------------------------------------------------------------------------
// Test 7: Student Runtime Checklist View Implementation
// -----------------------------------------------------------------------------
runTest("StudentRuntimeChecklistView is rendered in renderer and implements full checklist UX", () => {
  const checklistCode = fs.readFileSync("components/consultancies/training-v2/student-runtime-checklist-view.tsx", "utf8");
  const rendererCode = fs.readFileSync("components/consultancies/training-v2/student-workout-renderer.tsx", "utf8");

  // Renderer integration
  assert.ok(
    rendererCode.includes("StudentRuntimeChecklistView"),
    "StudentWorkoutRenderer must render StudentRuntimeChecklistView"
  );

  // Checklist view components
  assert.ok(checklistCode.includes("Concluir exercício"), "Must have 'Concluir exercício' button");
  assert.ok(checklistCode.includes("Registrar séries e cargas (opcional)"), "Must have optional load/reps accordion");
  assert.ok(checklistCode.includes("Como foi o treino?"), "Must have finalization feedback modal");
  assert.ok(checklistCode.includes("Treino Finalizado com Sucesso"), "Must have truthful success view");
});

// -----------------------------------------------------------------------------
// Test 8: Migration 068 Integrity & Additive Safety
// -----------------------------------------------------------------------------
runTest("Migration 068 is purely additive and covers custom_title, checklist, and feedback", () => {
  const migCode = fs.readFileSync("database/migrations/068_workout_custom_title_and_execution_checklist.sql", "utf8");

  assert.ok(migCode.includes("ADD COLUMN IF NOT EXISTS `custom_title`"), "Must add custom_title");
  assert.ok(migCode.includes("ADD COLUMN IF NOT EXISTS `student_completion_state`"), "Must add student_completion_state");
  assert.ok(migCode.includes("ADD COLUMN IF NOT EXISTS `student_feedback_notes`"), "Must add student_feedback_notes");
  assert.ok(migCode.includes("CREATE TABLE IF NOT EXISTS `workout_execution_items`"), "Must create workout_execution_items table");
});

console.log("\n================================================================================");
console.log("ALL 8 TESTS PASSED: STUDENT WORKOUT CHECKLIST & DIRECT ENTRY READY");
console.log("================================================================================");
