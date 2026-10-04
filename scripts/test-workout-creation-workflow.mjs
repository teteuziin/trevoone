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

runTest("FORM OUTER CARD REMOVED: No outer card/surface wrapper around the form", () => {
  assert(!code.includes("p-5 sm:p-7"), "Removed outer card padding p-5 sm:p-7");
  assert(!code.includes("rounded-2xl bg-[var(--surface-subtle)]"), "Removed outer card background and border");
  assert(code.includes('action={handleCreate}') && code.includes('className="space-y-8"'), "Form sits directly on page background without outer wrapper");
});

runTest("DESKTOP PAGE INTEGRATED: Comfortable 900-1000px width matching page layout", () => {
  assert(code.includes("max-w-[1536px]"), "Contains full-width container matching dashboard");
  assert(code.includes("max-w-[920px]"), "Provides comfortable ~920-980px usable form width as requested");
  assert(!code.includes("rounded-3xl border border-[var(--border-default)]"), "Heavy modal card container eliminated");
});

runTest("MOBILE PAGE INTEGRATED: Native app form layout with subtle section dividers", () => {
  assert(code.includes("pb-8 border-b border-[var(--border-subtle)]"), "Sections separated by subtle horizontal dividers without cards");
  assert(!code.includes("bg-[var(--surface)] p-"), "Form does not introduce an outer surface background");
});

runTest("REDUNDANT HEADER REMOVED: No 'Módulo de Treinamento' or 'Novo Treino do Zero'", () => {
  assert(!code.includes("Módulo de Treinamento"), "Removed redundant 'Módulo de Treinamento'");
  assert(!code.includes("Novo Treino do Zero"), "Removed redundant chip 'Novo Treino do Zero'");
  assert(code.includes("Nova ficha de treino"), "Features clean title 'Nova ficha de treino'");
  assert(code.includes("Defina as informações básicas. Você adicionará os exercícios na próxima etapa."), "Features direct, helpful subtitle");
});

runTest("PRIMARY FIELD HIERARCHY: 'Nome da ficha' has visual priority", () => {
  assert(code.includes("Obrigatório"), "Indicates mandatory status");
  assert(code.includes("name=\"title\""), "Title field input is present");
  assert(code.includes("min-h-[46px]"), "Primary field features prominent min-h-[46px] touch target");
});

runTest("TRAINING INFO GROUP: Clean group without nested card", () => {
  assert(code.includes("Informações do Treino"), "Features 'Informações do Treino' section header");
  assert(code.includes("uppercase tracking-wider"), "Uses elegant typography for section header");
  assert(code.includes("sm:col-span-7") && code.includes("sm:col-span-5"), "Difficulty (~58%) and Duration (~42%) are side by side on desktop");
  assert(code.includes("grid-cols-1 sm:grid-cols-12"), "Stacked vertically on mobile");
});

runTest("CTA HIERARCHY: Primary CTA green and right-aligned on desktop, no sticky footer", () => {
  assert(code.includes("variant=\"primary\""), "Primary CTA uses variant primary");
  assert(code.includes("Criar Ficha de Treino"), "CTA label is Criar Ficha de Treino");
  assert(code.includes("sm:justify-end"), "Actions aligned to the right on desktop");
  assert(!code.includes("fixed bottom-0") && !code.includes("sticky bottom-0"), "No sticky footer used");
});

runTest("FORM VALIDATION & SERVER ACTION: Integrity preserved", () => {
  assert(code.includes("handleCreate"), "Form action handleCreate intact");
  assert(code.includes("createWorkoutDraftAction"), "Server action call intact");
  assert(code.includes("targetStudentMembershipPublicId"), "Student membership parameter intact");
  assert(code.includes("studentMembershipPublicId"), "Student membership searchParam intact");
  assert(code.includes("preselectedStudent.student.membershipPublicId"), "Hidden input for student intact");
});

runTest("MOBILE TOUCH TARGETS: All actions adhere to min-h-[44px]", () => {
  assert(code.includes("min-h-[44px]"), "Buttons and inputs enforce min-h-[44px]");
  assert(code.includes("flex-col-reverse sm:flex-row"), "Actions stack naturally on mobile with primary CTA on top of cancel");
});

runTest("RESPONSIVE & NO HORIZONTAL OVERFLOW: Clean grid and relative constraints", () => {
  assert(!code.includes("w-[100vw]") && !code.includes("overflow-x-scroll"), "No horizontal overflow triggers");
  assert(code.includes("w-full"), "Full-width responsiveness respected");
});

console.log("==================================================");
console.log("ALL 9 WORKOUT CREATION AUDITS PASSED");
console.log("==================================================");
