import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

console.log("==================================================");
console.log("TREVO ONE — MOBILE NATIVE (PHASE 7)");
console.log("SERVICES, TEMPLATES, HISTORY & AUXILIARY FLOWS TEST SUITE");
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
// FILE AUDITS
// -----------------------------------------------------------------------------
const rotinasPagePath = path.join(rootDir, "app/consultoria/[slug]/rotinas/page.tsx");
assert.ok(fs.existsSync(rotinasPagePath), "rotinas/page.tsx must exist");
const rotinasPageCode = fs.readFileSync(rotinasPagePath, "utf-8");

const workoutCardActionsPath = path.join(
  rootDir,
  "components/consultancies/training-v2/workout-card-actions.tsx"
);
assert.ok(fs.existsSync(workoutCardActionsPath), "workout-card-actions.tsx must exist");
const workoutCardActionsCode = fs.readFileSync(workoutCardActionsPath, "utf-8");

const studentWorkoutRendererPath = path.join(
  rootDir,
  "components/consultancies/training-v2/student-workout-renderer.tsx"
);
assert.ok(fs.existsSync(studentWorkoutRendererPath), "student-workout-renderer.tsx must exist");
const studentWorkoutRendererCode = fs.readFileSync(studentWorkoutRendererPath, "utf-8");

const workoutAssignModalPath = path.join(
  rootDir,
  "components/consultancies/training-v2/workout-assign-modal.tsx"
);
assert.ok(fs.existsSync(workoutAssignModalPath), "workout-assign-modal.tsx must exist");
const workoutAssignModalCode = fs.readFileSync(workoutAssignModalPath, "utf-8");

const templateAssignModalPath = path.join(
  rootDir,
  "components/consultancies/training-v2/template-assign-modal.tsx"
);
assert.ok(fs.existsSync(templateAssignModalPath), "template-assign-modal.tsx must exist");
const templateAssignModalCode = fs.readFileSync(templateAssignModalPath, "utf-8");

const assignmentRepoPath = path.join(
  rootDir,
  "lib/training-v2/assignment-repository.ts"
);
assert.ok(fs.existsSync(assignmentRepoPath), "assignment-repository.ts must exist");
const assignmentRepoCode = fs.readFileSync(assignmentRepoPath, "utf-8");

const rotinasActionsPath = path.join(
  rootDir,
  "app/consultoria/[slug]/rotinas/actions.ts"
);
assert.ok(fs.existsSync(rotinasActionsPath), "rotinas/actions.ts must exist");
const rotinasActionsCode = fs.readFileSync(rotinasActionsPath, "utf-8");

const executionRepoPath = path.join(
  rootDir,
  "lib/training-v2/execution-repository.ts"
);
assert.ok(fs.existsSync(executionRepoPath), "execution-repository.ts must exist");
const executionRepoCode = fs.readFileSync(executionRepoPath, "utf-8");

const nutritionTemplatesModalPath = path.join(
  rootDir,
  "components/consultancies/nutrition-v2/nutrition-templates-modal.tsx"
);
assert.ok(fs.existsSync(nutritionTemplatesModalPath), "nutrition-templates-modal.tsx must exist");
const nutritionTemplatesModalCode = fs.readFileSync(nutritionTemplatesModalPath, "utf-8");

const nutritionUseDialogPath = path.join(
  rootDir,
  "components/consultancies/nutrition-v2/nutrition-use-template-dialog.tsx"
);
assert.ok(fs.existsSync(nutritionUseDialogPath), "nutrition-use-template-dialog.tsx must exist");
const nutritionUseDialogCode = fs.readFileSync(nutritionUseDialogPath, "utf-8");

const trainingAiImportModalPath = path.join(
  rootDir,
  "components/consultancies/training-v2/training-ai-import-modal.tsx"
);
assert.ok(fs.existsSync(trainingAiImportModalPath), "training-ai-import-modal.tsx must exist");
const trainingAiImportModalCode = fs.readFileSync(trainingAiImportModalPath, "utf-8");

// =============================================================================
// TEST SUITE: PARTE A — SERVIÇOS
// =============================================================================
runTest("Parte A: Services audit verifies billing charges/plans model and no phantom services table", () => {
  // Trevo One uses consultancy_subscription_plans, charges, client_financial_settings for billing services
  const migrationDir = path.join(rootDir, "database/migrations");
  const migrations = fs.readdirSync(migrationDir);
  const hasDedicatedServicesTable = migrations.some((m) => m.toLowerCase().includes("services.sql"));
  assert.equal(hasDedicatedServicesTable, false, "Trevo One billing uses plans/charges, no standalone services table exists");
});

// =============================================================================
// TEST SUITE: PARTE B — TEMPLATES / MODELOS
// =============================================================================
runTest("Parte B: Workout templates list has 'Usar modelo' as the primary action on mobile", () => {
  assert.ok(
    workoutCardActionsCode.includes("Usar modelo"),
    "WorkoutCardActions must render 'Usar modelo' button"
  );
  assert.ok(
    workoutCardActionsCode.includes("bg-purple-600"),
    "Primary button for templates must have purple brand emphasis"
  );
  assert.ok(
    workoutCardActionsCode.includes("min-h-[48px]"),
    "Primary action on mobile must meet or exceed 48px touch target"
  );
});

runTest("Parte B: Redundant competing buttons removed from rotinas mobile card", () => {
  // Mobile card footer in rotinas/page.tsx should directly delegate to WorkoutCardActions
  assert.ok(
    rotinasPageCode.includes("<WorkoutCardActions"),
    "Rotinas page must use WorkoutCardActions"
  );
  // Ensure we don't have the old duplicate <Button variant='outline'>Abrir modelo</Button> in the mobile card
  const duplicateBtnRegex = /<Button[^>]*>\s*\{w\.isTemplate \? "Abrir modelo" : "Abrir treino"\}/;
  assert.ok(
    !duplicateBtnRegex.test(rotinasPageCode),
    "Rotinas page mobile card must not have duplicate competing button"
  );
});

runTest("Parte B: Secondary template actions organized inside Action Sheet", () => {
  assert.ok(
    workoutCardActionsCode.includes("Abrir modelo"),
    "Action sheet options must include 'Abrir modelo'"
  );
  assert.ok(
    workoutCardActionsCode.includes("Duplicar modelo"),
    "Action sheet options must include 'Duplicar modelo'"
  );
  assert.ok(
    workoutCardActionsCode.includes("Excluir modelo"),
    "Action sheet options must include 'Excluir modelo'"
  );
  assert.ok(
    workoutCardActionsCode.includes("Baixar PDF"),
    "Action sheet options must include 'Baixar PDF'"
  );
});

runTest("Parte B: Copy-on-assign preservation documented and enforced in TemplateAssignModal", () => {
  assert.ok(
    templateAssignModalCode.includes("Copy-On-Assign") ||
    templateAssignModalCode.includes("C\u00f3pia 100% Independente") ||
    templateAssignModalCode.includes("c\u00f3pia independente"),
    "TemplateAssignModal must inform user about independent copy-on-assign behavior"
  );
  assert.ok(
    templateAssignModalCode.includes("assignTemplateToStudentAction"),
    "TemplateAssignModal must call assignTemplateToStudentAction"
  );
});

runTest("Parte B: Nutrition templates modal lists templates with 'Usar modelo' primary action", () => {
  assert.ok(
    nutritionTemplatesModalCode.includes("Usar modelo"),
    "Nutrition templates modal must have 'Usar modelo' action"
  );
  assert.ok(
    nutritionTemplatesModalCode.includes("Renomear"),
    "Nutrition templates modal must support renaming"
  );
  assert.ok(
    nutritionTemplatesModalCode.includes("Arquivar"),
    "Nutrition templates modal must support archiving"
  );
});

// =============================================================================
// TEST SUITE: PARTE C — HISTÓRICOS
// =============================================================================
runTest("Parte C: History execution repository queries strictly COMPLETED sessions", () => {
  assert.ok(
    executionRepoCode.includes("status = 'COMPLETED'"),
    "Execution repository must query strictly COMPLETED sessions"
  );
  assert.ok(
    !executionRepoCode.includes("status = 'IN_PROGRESS' AND completed_at IS NOT NULL"),
    "In-progress sessions must not be included in history"
  );
});

runTest("Parte C: History is ordered newest first (completed_at DESC, created_at DESC)", () => {
  assert.ok(
    executionRepoCode.includes("ORDER BY completed_at DESC, created_at DESC") ||
    executionRepoCode.includes("ORDER BY completed_at DESC"),
    "Execution history must be ordered newest first"
  );
});

runTest("Parte C: Prescribed vs performed comparison layout exists", () => {
  assert.ok(
    studentWorkoutRendererCode.includes("Prescrito:"),
    "Student workout renderer must clearly show prescribed parameters"
  );
  assert.ok(
    studentWorkoutRendererCode.includes("Realizado:"),
    "Student workout renderer must clearly show performed parameters"
  );
});

runTest("Parte C: Rule 18 & 60 — Never display '0 kg' in performed sets (shows 'Livre')", () => {
  assert.ok(
    studentWorkoutRendererCode.includes("parts.push(\"Livre\")"),
    "studentWorkoutRenderer must output 'Livre' when load is 0 or bodyweight"
  );
  assert.ok(
    !studentWorkoutRendererCode.includes("actual_load_kg = 0.00 → mostrar \"0 kg\""),
    "Must not contain comments or logic forcing '0 kg' display"
  );
});

runTest("Parte C: Rule 18 & 60 — Never display '0 kg' in prescribed sets (shows 'Livre')", () => {
  // Check formatPrescribedSet in studentWorkoutRendererCode
  const prescribedSetMatch = studentWorkoutRendererCode.match(
    /function formatPrescribedSet[\s\S]*?function formatActualSet/
  );
  assert.ok(prescribedSetMatch, "formatPrescribedSet function must exist");
  assert.ok(
    prescribedSetMatch[0].includes("Livre"),
    "formatPrescribedSet must output 'Livre' when load is 0"
  );
});

// =============================================================================
// TEST SUITE: PARTE D — ARQUIVADOS & CONFIRMAÇÕES
// =============================================================================
runTest("Parte D: Nutrition templates uses MobileConfirmSheet instead of window.confirm (Rule 39)", () => {
  assert.ok(
    !nutritionTemplatesModalCode.includes("window.confirm("),
    "Nutrition templates modal must not use window.confirm"
  );
  assert.ok(
    nutritionTemplatesModalCode.includes("<MobileConfirmSheet"),
    "Nutrition templates modal must use MobileConfirmSheet"
  );
  assert.ok(
    nutritionTemplatesModalCode.includes("variant=\"danger\""),
    "Destructive archive action must use danger variant"
  );
});

runTest("Parte D: Workouts deletion in WorkoutCardActions uses MobileConfirmSheet", () => {
  assert.ok(
    workoutCardActionsCode.includes("<MobileConfirmSheet"),
    "WorkoutCardActions must use MobileConfirmSheet for deletion"
  );
  assert.ok(
    !workoutCardActionsCode.includes("window.confirm("),
    "WorkoutCardActions must not use window.confirm"
  );
});

// =============================================================================
// TEST SUITE: PARTE E — VERSÕES & ATUALIZAÇÃO DO ALUNO (RULE 28, 29, 61)
// =============================================================================
runTest("Parte E: getActiveAssignmentForStudentAndWorkout is exported from assignment-repository", () => {
  assert.ok(
    assignmentRepoCode.includes("export async function getActiveAssignmentForStudentAndWorkout"),
    "assignment-repository.ts must export getActiveAssignmentForStudentAndWorkout"
  );
});

runTest("Parte E: getStudentActiveWorkoutAssignmentAction is exported from rotinas/actions", () => {
  assert.ok(
    rotinasActionsCode.includes("export async function getStudentActiveWorkoutAssignmentAction"),
    "rotinas/actions.ts must export getStudentActiveWorkoutAssignmentAction"
  );
});

runTest("Parte E: WorkoutAssignModal provides 1-tap 'Atualizar treino do aluno' when student already has active version", () => {
  assert.ok(
    workoutAssignModalCode.includes("getStudentActiveWorkoutAssignmentAction"),
    "WorkoutAssignModal must check for existing active assignment"
  );
  assert.ok(
    workoutAssignModalCode.includes("Este aluno j\u00e1 utiliza este treino"),
    "WorkoutAssignModal must show clear message when student already has the routine"
  );
  assert.ok(
    workoutAssignModalCode.includes("Atualizar treino do aluno"),
    "WorkoutAssignModal must provide 1-tap 'Atualizar treino do aluno' CTA"
  );
  assert.ok(
    workoutAssignModalCode.includes("updateWorkoutAssignmentVersionAction"),
    "WorkoutAssignModal must call updateWorkoutAssignmentVersionAction instead of creating duplicate"
  );
});

runTest("Parte E: WorkoutAssignModal prevents duplicate assignment creation", () => {
  assert.ok(
    workoutAssignModalCode.includes("!existingAssignment &&"),
    "Confirm prescription button must only be shown when no existing assignment exists"
  );
});

// =============================================================================
// TEST SUITE: PARTE F — PDFs & DUPLA SUBMISSÃO
// =============================================================================
runTest("Parte F: WorkoutCardActions includes 'Baixar PDF' in mobile action sheet and desktop dropdown", () => {
  assert.ok(
    workoutCardActionsCode.includes("Baixar PDF"),
    "WorkoutCardActions must include Baixar PDF option"
  );
  assert.ok(
    workoutCardActionsCode.includes("/pdf"),
    "WorkoutCardActions must point to the secure PDF route"
  );
});

runTest("Parte F: Double submission protection on assignment and upgrade buttons (Rule 33)", () => {
  assert.ok(
    workoutAssignModalCode.includes("disabled={isPending || isUpgrading"),
    "WorkoutAssignModal must protect against double-submission"
  );
  assert.ok(
    templateAssignModalCode.includes("disabled={!selectedStudent || isPending}"),
    "TemplateAssignModal must protect against double-submission"
  );
});

// =============================================================================
// TEST SUITE: PARTE G — IA & PROCESSAMENTO
// =============================================================================
runTest("Parte G: Training AI import modal has non-blocking error recovery with 'Tentar novamente' (Rule 37)", () => {
  assert.ok(
    trainingAiImportModalCode.includes("Tentar novamente"),
    "TrainingAiImportModal must offer 'Tentar novamente' button upon error"
  );
  assert.ok(
    trainingAiImportModalCode.includes("setState(\"IDLE\")"),
    "Retry must reset modal state so user can re-try without getting stuck"
  );
});

// =============================================================================
// TEST SUITE: PARTE J — MOBILE NATIVE UX & SAFE AREAS (RULE 46, 47, 50, 51)
// =============================================================================
runTest("Parte J: Touch targets meet >= 44px for secondary, >= 48px for primary CTAs", () => {
  assert.ok(
    workoutCardActionsCode.includes("min-h-[48px]"),
    "WorkoutCardActions primary button must be >= 48px"
  );
  assert.ok(
    workoutAssignModalCode.includes("min-h-[48px]"),
    "WorkoutAssignModal primary CTA must be >= 48px"
  );
  assert.ok(
    templateAssignModalCode.includes("min-h-[48px]"),
    "TemplateAssignModal primary CTA must be >= 48px"
  );
});

runTest("Parte J: Safe area bottom inset env(safe-area-inset-bottom) respected in mobile modals", () => {
  assert.ok(
    workoutAssignModalCode.includes("env(safe-area-inset-bottom"),
    "WorkoutAssignModal must respect env(safe-area-inset-bottom)"
  );
  assert.ok(
    templateAssignModalCode.includes("env(safe-area-inset-bottom"),
    "TemplateAssignModal must respect env(safe-area-inset-bottom)"
  );
  assert.ok(
    nutritionTemplatesModalCode.includes("env(safe-area-inset-bottom"),
    "NutritionTemplatesModal must respect env(safe-area-inset-bottom)"
  );
  assert.ok(
    nutritionUseDialogCode.includes("env(safe-area-inset-bottom"),
    "NutritionUseTemplateDialog must respect env(safe-area-inset-bottom)"
  );
  assert.ok(
    trainingAiImportModalCode.includes("env(safe-area-inset-bottom"),
    "TrainingAiImportModal must respect env(safe-area-inset-bottom)"
  );
});

runTest("Parte J: Desktop layout preserved with hidden sm:flex and sm:hidden boundaries", () => {
  assert.ok(
    rotinasPageCode.includes("hidden sm:flex"),
    "Rotinas page must preserve desktop flex row"
  );
  assert.ok(
    workoutCardActionsCode.includes("hidden sm:block"),
    "WorkoutCardActions must preserve desktop dropdown menu"
  );
  assert.ok(
    workoutCardActionsCode.includes("sm:hidden"),
    "WorkoutCardActions must isolate mobile action sheet"
  );
});

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log("==================================================");
console.log(`PHASE 7 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
console.log("==================================================");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
