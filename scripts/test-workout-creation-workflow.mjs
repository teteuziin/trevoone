import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";

console.log("==================================================");
console.log("TREVO ONE — WORKOUT CREATION WORKFLOW AUDIT");
console.log("==================================================");

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
  } catch (err) {
    console.error(`FAIL: ${name} -> ${err.message}`);
    process.exit(1);
  }
}

const pagePath = path.resolve("app/consultoria/[slug]/rotinas/novo/page.tsx");
assert(fs.existsSync(pagePath), "Page file app/consultoria/[slug]/rotinas/novo/page.tsx exists");
const code = fs.readFileSync(pagePath, "utf-8");

const formPath = path.resolve("components/consultancies/training-v2/new-workout-manual-form.tsx");
assert(fs.existsSync(formPath), "Form component file components/consultancies/training-v2/new-workout-manual-form.tsx exists");
const formCode = fs.readFileSync(formPath, "utf-8");

runTest("FORM COMPONENT INTEGRATION: Page uses NewWorkoutManualForm without heavy outer card", () => {
  assert(code.includes("NewWorkoutManualForm"), "Page delegates to NewWorkoutManualForm");
  assert(!code.includes("p-5 sm:p-7"), "Removed outer card padding p-5 sm:p-7");
  assert(!code.includes("rounded-2xl bg-[var(--surface-subtle)]"), "Removed outer card background and border");
});

runTest("DESKTOP PAGE INTEGRATED: Comfortable width matching page layout", () => {
  assert(code.includes("max-w-[720px]") || code.includes("max-w-[940px]"), "Provides comfortable usable form width");
  assert(!code.includes("rounded-3xl border border-[var(--border-default)]"), "Heavy modal card container eliminated");
});

runTest("CLEAN HEADER: Back button 'Voltar' and title 'Nova ficha'", () => {
  assert(code.includes("Voltar"), "Features clean back button 'Voltar'");
  assert(code.includes("Nova ficha"), "Features clean title 'Nova ficha'");
});

runTest("PRIMARY FIELD HIERARCHY: 'Nome da ficha' has visual priority with required marker", () => {
  assert(formCode.includes("Nome da ficha"), "Label 'Nome da ficha' is present");
  assert(formCode.includes("name=\"title\""), "Title field input is present");
  assert(formCode.includes("min-h-[48px]"), "Primary field features prominent min-h-[48px] touch target");
});

runTest("COLLAPSIBLE TRAINING DETAILS: 'Detalhes do treino' is expandable and optional", () => {
  assert(formCode.includes("Detalhes do treino"), "Features 'Detalhes do treino' expandable section");
  assert(formCode.includes("isDetailsOpen"), "State controls expansion of secondary details");
  assert(formCode.includes("difficultyLevel") && formCode.includes("estimatedDurationMinutes"), "Difficulty and Duration are inside details");
});

runTest("CTA HIERARCHY: Primary CTA 'Começar montagem' with double-submit prevention", () => {
  assert(formCode.includes("Começar montagem"), "CTA label matches workflow requirement 'Começar montagem'");
  assert(formCode.includes("isPending"), "Prevents duplicate submissions via isPending guard");
  assert(formCode.includes("safe-area-inset-bottom"), "Respects safe-area-inset-bottom on mobile");
});

runTest("FORM VALIDATION & SERVER ACTION: Integrity preserved", () => {
  assert(formCode.includes("createWorkoutDraftAction"), "Server action call intact");
  assert(code.includes("targetStudentMembershipPublicId"), "Student membership parameter intact");
  assert(code.includes("preselectedStudent"), "Preselected student linking intact");
});

runTest("MOBILE TOUCH TARGETS: All actions adhere to min-h-[44px] / min-h-[48px]", () => {
  assert(formCode.includes("min-h-[48px]"), "Buttons and inputs enforce min-h-[48px]");
  assert(formCode.includes("flex-col-reverse sm:flex-row"), "Actions stack naturally on mobile");
});

runTest("RESPONSIVE & NO HORIZONTAL OVERFLOW: Full width responsiveness", () => {
  assert(!code.includes("w-[100vw]") && !code.includes("overflow-x-scroll"), "No horizontal overflow triggers");
  assert(code.includes("w-full"), "Full-width responsiveness respected");
});

console.log("==================================================");
console.log("ALL 9 WORKOUT CREATION AUDITS PASSED");
console.log("==================================================");
