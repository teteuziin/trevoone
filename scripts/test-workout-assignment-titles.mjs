/**
 * TREVO ONE — TEST SUITE: NOME AUTOMÁTICO DO ALUNO NA FICHA ATRIBUÍDA
 *
 * Verifies end-to-end title resolution and assignment contracts:
 * 1. Pure title resolver logic (title-resolver.ts)
 * 2. Model "DJEAN SILVA" assigned to Patrícia Ramos resolves to "Treino de Patrícia Ramos"
 * 3. Same model assigned to another student resolves to that student's name
 * 4. Explicit personal customizations (different from model title) are preserved
 * 5. Inherited model title is recognized and overridden by student's automatic title
 * 6. Clearing custom title restores dynamic automatic title
 * 7. Name update on student user record automatically updates presentation
 * 8. Model template in trainer library remains untouched with original title
 * 9. Codebase verification across daily-workout-resolver, assignment-repository,
 *    workout-repository, personal-student-hub, and execution-repository
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  resolveWorkoutAssignmentTitle,
  formatAutomaticWorkoutTitle,
  isInheritedModelTitle,
} from "../lib/training-v2/title-resolver.ts";

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✓ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`✗ FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

console.log("================================================================================");
console.log("TREVO ONE — AUTOMATED TEST SUITE: WORKOUT ASSIGNMENT TITLES");
console.log("================================================================================\n");

// -----------------------------------------------------------------------------
// Test 1: Pure Helper Functions
// -----------------------------------------------------------------------------
runTest("formatAutomaticWorkoutTitle returns 'Treino de {nome}' or fallback", () => {
  assert.equal(formatAutomaticWorkoutTitle("Patrícia Ramos"), "Treino de Patrícia Ramos");
  assert.equal(formatAutomaticWorkoutTitle("  Carlos Souza  "), "Treino de Carlos Souza");
  assert.equal(formatAutomaticWorkoutTitle(""), "Treino do Aluno");
  assert.equal(formatAutomaticWorkoutTitle(null), "Treino do Aluno");
  assert.equal(formatAutomaticWorkoutTitle(undefined), "Treino do Aluno");
});

runTest("isInheritedModelTitle detects exact and case-insensitive duplicates", () => {
  assert.equal(isInheritedModelTitle("DJEAN SILVA", "DJEAN SILVA"), true);
  assert.equal(isInheritedModelTitle("djean silva", "DJEAN SILVA"), true);
  assert.equal(isInheritedModelTitle("  DJEAN SILVA  ", "Djean Silva"), true);
  assert.equal(isInheritedModelTitle("Treino de Glúteos", "DJEAN SILVA"), false);
  assert.equal(isInheritedModelTitle(null, "DJEAN SILVA"), false);
  assert.equal(isInheritedModelTitle("", "DJEAN SILVA"), false);
  assert.equal(isInheritedModelTitle("DJEAN SILVA", null), false);
});

// -----------------------------------------------------------------------------
// Test 2: Core Resolution Precedence
// -----------------------------------------------------------------------------
runTest("Assigned workout without custom_title resolves to 'Treino de {studentName}'", () => {
  const result = resolveWorkoutAssignmentTitle({
    customTitle: null,
    studentName: "Patrícia Ramos",
    baseTitle: "DJEAN SILVA",
  });
  assert.equal(result, "Treino de Patrícia Ramos");
});

runTest("Assigned workout inheriting template title 'DJEAN SILVA' resolves to student name", () => {
  // Scenario: template modal or legacy query filled custom_title with template title
  const result = resolveWorkoutAssignmentTitle({
    customTitle: "DJEAN SILVA",
    studentName: "Patrícia Ramos",
    baseTitle: "DJEAN SILVA",
  });
  assert.equal(result, "Treino de Patrícia Ramos");
});

runTest("Same model assigned to another student resolves to that student's name", () => {
  const patriciaResult = resolveWorkoutAssignmentTitle({
    customTitle: null,
    studentName: "Patrícia Ramos",
    baseTitle: "DJEAN SILVA",
  });
  const carlosResult = resolveWorkoutAssignmentTitle({
    customTitle: null,
    studentName: "Carlos Souza",
    baseTitle: "DJEAN SILVA",
  });
  assert.equal(patriciaResult, "Treino de Patrícia Ramos");
  assert.equal(carlosResult, "Treino de Carlos Souza");
});

runTest("Explicit personal customization chosen by coach is respected", () => {
  const result = resolveWorkoutAssignmentTitle({
    customTitle: "Treino Personalizado de Hipertrofia",
    studentName: "Patrícia Ramos",
    baseTitle: "DJEAN SILVA",
  });
  assert.equal(result, "Treino Personalizado de Hipertrofia");
});

runTest("Clearing custom title reverts to automatic 'Treino de {studentName}'", () => {
  // Coach removes custom title -> passes null or empty string
  const reverted = resolveWorkoutAssignmentTitle({
    customTitle: "",
    studentName: "Patrícia Ramos",
    baseTitle: "DJEAN SILVA",
  });
  assert.equal(reverted, "Treino de Patrícia Ramos");
});

runTest("Student name update in users table dynamically reflects in assignment title", () => {
  // Before: student is "Patrícia Ramos"
  const before = resolveWorkoutAssignmentTitle({
    customTitle: null,
    studentName: "Patrícia Ramos",
    baseTitle: "DJEAN SILVA",
  });
  assert.equal(before, "Treino de Patrícia Ramos");

  // After: student updates profile to "Patrícia Ramos da Silva"
  const after = resolveWorkoutAssignmentTitle({
    customTitle: null,
    studentName: "Patrícia Ramos da Silva",
    baseTitle: "DJEAN SILVA",
  });
  assert.equal(after, "Treino de Patrícia Ramos da Silva");
});

runTest("Fallback when student name is absent returns base title or generic label", () => {
  const withBase = resolveWorkoutAssignmentTitle({
    customTitle: null,
    studentName: null,
    baseTitle: "Hipertrofia ABC",
  });
  assert.equal(withBase, "Hipertrofia ABC");

  const withoutBase = resolveWorkoutAssignmentTitle({
    customTitle: null,
    studentName: null,
    baseTitle: null,
  });
  assert.equal(withoutBase, "Treino do Aluno");
});

// -----------------------------------------------------------------------------
// Test 3: Codebase Integration Verification
// -----------------------------------------------------------------------------
runTest("daily-workout-resolver.ts uses resolveWorkoutAssignmentTitle across all priority paths", () => {
  const code = fs.readFileSync("lib/training-v2/daily-workout-resolver.ts", "utf8");
  assert.ok(code.includes('import { resolveWorkoutAssignmentTitle } from "./title-resolver"'), "Must import resolver");
  assert.ok(code.includes("activeSessionRoutineTitle = resolveWorkoutAssignmentTitle"), "Must resolve active session routine title");
  assert.ok(code.includes("currentAssignRoutineTitle = resolveWorkoutAssignmentTitle"), "Must resolve current assignment routine title");
  assert.ok(code.includes("fAssignRoutineTitle = resolveWorkoutAssignmentTitle"), "Must resolve fallback assignment routine title");
  assert.ok(!code.includes("routineTitle: String(activeSession.routine_title)"), "Must not use raw activeSession.routine_title");
  assert.ok(!code.includes("routineTitle: String(currentAssign.routine_title)"), "Must not use raw currentAssign.routine_title");
});

runTest("assignment-repository.ts applies resolveWorkoutAssignmentTitle in cards and student view", () => {
  const code = fs.readFileSync("lib/training-v2/assignment-repository.ts", "utf8");
  assert.ok(code.includes('import { resolveWorkoutAssignmentTitle } from "./title-resolver"'), "Must import resolver");
  assert.ok(code.includes("workoutTitle: resolveWorkoutAssignmentTitle("), "Must resolve workoutTitle in listStudentWorkoutCards and listAssignmentsForProfessional");
  assert.ok(code.includes("baseWorkoutTitle"), "Must expose baseWorkoutTitle for professional comparison");
});

runTest("workout-repository.ts assigns template with automatic student name without altering template root", () => {
  const code = fs.readFileSync("lib/training-v2/workout-repository.ts", "utf8");
  assert.ok(code.includes("autoTitle = studentName ? `Treino de ${studentName}` : baseTitle"), "Must construct autoTitle with student name");
  assert.ok(code.includes("WHERE public_id = ? AND is_template = 1"), "Template query must lock template without updating it");
  assert.ok(!code.includes("UPDATE workouts SET title = ? WHERE is_template = 1"), "Must NEVER rename template root");
});

runTest("personal-student-hub.ts resolves student's assigned and completed session titles", () => {
  const code = fs.readFileSync("lib/consultancies/personal-student-hub.ts", "utf8");
  assert.ok(code.includes("resolveWorkoutAssignmentTitle"), "Must import resolveWorkoutAssignmentTitle");
  assert.ok(code.includes("studentName: student.name"), "Must use student's authoritative name");
});

runTest("execution-repository.ts uses resolveWorkoutAssignmentTitle in trainer completion notification", () => {
  const code = fs.readFileSync("lib/training-v2/execution-repository.ts", "utf8");
  assert.ok(code.includes("resolveWorkoutAssignmentTitle"), "Must import resolveWorkoutAssignmentTitle");
  assert.ok(code.includes("const workoutTitle = resolveWorkoutAssignmentTitle"), "Must resolve notification workoutTitle");
  assert.ok(code.includes('concluiu o treino "${workoutTitle}"'), "Notification body must use resolved title");
});

runTest("template-assign-modal.tsx initializes customTitle as empty with student placeholder", () => {
  const code = fs.readFileSync("components/consultancies/training-v2/template-assign-modal.tsx", "utf8");
  assert.ok(code.includes('const [customTitle, setCustomTitle] = useState("");'), "Must initialize empty");
  assert.ok(code.includes("placeholder={selectedStudent ? `Treino de ${selectedStudent.name}`"), "Must provide dynamic placeholder");
  assert.ok(!code.includes("const [customTitle, setCustomTitle] = useState(templateTitle);"), "Must NOT prefill templateTitle");
});

runTest("workout-assignments-list.tsx allows clearing custom title to restore automatic name", () => {
  const code = fs.readFileSync("components/consultancies/training-v2/workout-assignments-list.tsx", "utf8");
  assert.ok(code.includes("setEditedCustomTitle(item.customTitle || \"\");"), "Must open edit modal with empty if not custom");
  assert.ok(code.includes("Modelo base: {item.baseWorkoutTitle}"), "Must render base template badge when title differs");
});

console.log("\n================================================================================");
console.log(`ALL ${passedTests}/${totalTests} TESTS PASSED CLEANLY!`);
console.log("================================================================================");
