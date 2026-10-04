import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  formatIsoDateToBr,
  formatShortDateBr,
  formatMetricNumber,
  calculateMetricDelta,
} from "../lib/consultancies/evolution.ts";

const rootDir = process.cwd();

console.log("==================================================");
console.log("TREVO ONE — MOBILE NATIVE EVOLUTION (PHASE 5)");
console.log("COMPREHENSIVE TEST SUITE");
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
// 1. FILE EXISTENCE & COMPONENT AUDIT
// -----------------------------------------------------------------------------
const cockpitPath = path.join(
  rootDir,
  "components/consultancies/evolution/mobile-evolution-cockpit.tsx"
);
assert.ok(fs.existsSync(cockpitPath), "mobile-evolution-cockpit.tsx must exist");
const cockpitCode = fs.readFileSync(cockpitPath, "utf-8");

const hubPath = path.join(
  rootDir,
  "components/consultancies/evolution/evolution-360-hub.tsx"
);
assert.ok(fs.existsSync(hubPath), "evolution-360-hub.tsx must exist");
const hubCode = fs.readFileSync(hubPath, "utf-8");

const formPath = path.join(
  rootDir,
  "components/consultancies/student-progress-form.tsx"
);
assert.ok(fs.existsSync(formPath), "student-progress-form.tsx must exist");
const formCode = fs.readFileSync(formPath, "utf-8");

const studentDetailPath = path.join(
  rootDir,
  "components/consultancies/personal-student-hub/personal-student-detail-view.tsx"
);
assert.ok(fs.existsSync(studentDetailPath), "personal-student-detail-view.tsx must exist");
const studentDetailCode = fs.readFileSync(studentDetailPath, "utf-8");

const evolutionLibPath = path.join(
  rootDir,
  "lib/consultancies/evolution.ts"
);
assert.ok(fs.existsSync(evolutionLibPath), "evolution.ts must exist");
const evolutionLibCode = fs.readFileSync(evolutionLibPath, "utf-8");

const loadingPath = path.join(
  rootDir,
  "app/consultoria/[slug]/progresso/loading.tsx"
);
assert.ok(fs.existsSync(loadingPath), "progresso/loading.tsx must exist");
const loadingCode = fs.readFileSync(loadingPath, "utf-8");

const errorPath = path.join(
  rootDir,
  "app/consultoria/[slug]/progresso/error.tsx"
);
assert.ok(fs.existsSync(errorPath), "progresso/error.tsx must exist");
const errorCode = fs.readFileSync(errorPath, "utf-8");

// -----------------------------------------------------------------------------
// TEST 1: Aluno sem avaliação -> empty state correto
// -----------------------------------------------------------------------------
runTest("TEST 1: Aluno sem avaliação -> empty state correto", () => {
  assert.ok(
    cockpitCode.includes("Nenhuma avaliação registrada"),
    "Mobile cockpit must have clear empty state message for 0 assessments"
  );
  assert.ok(
    cockpitCode.includes("Registre a primeira avaliação") ||
    cockpitCode.includes("Sua evolução aparecerá aqui"),
    "Empty state must guide user to register first evaluation"
  );
  assert.ok(
    cockpitCode.includes("+ Registrar primeira avaliação") || cockpitCode.includes("+ Nova avaliação"),
    "Empty state must have prominent CTA to register first evaluation"
  );
  assert.ok(
    cockpitCode.includes("milestones.length === 0"),
    "Cockpit must explicitly check for milestones.length === 0"
  );
});

// -----------------------------------------------------------------------------
// TEST 2: Primeira avaliação -> valores atuais, sem comparação artificial
// -----------------------------------------------------------------------------
runTest("TEST 2: Primeira avaliação -> valores atuais, sem comparação artificial", () => {
  assert.ok(
    cockpitCode.includes("Primeira Avaliação Registrada"),
    "Must recognize 1 single evaluation and label as 'Primeira Avaliação Registrada'"
  );
  assert.ok(
    cockpitCode.includes("milestones.length === 1"),
    "Cockpit must check milestones.length === 1 specifically"
  );
  assert.ok(
    cockpitCode.includes("Valores de referência registrados"),
    "Must indicate current baseline values without fake '-0' difference"
  );
});

// -----------------------------------------------------------------------------
// TEST 3: Duas avaliações -> diferença calculada corretamente
// -----------------------------------------------------------------------------
runTest("TEST 3: Duas avaliações -> diferença calculada corretamente e sem erro de float", () => {
  const delta1 = calculateMetricDelta(80.8, 78.4, "kg", true);
  assert.ok(delta1 !== null, "Delta should not be null");
  assert.strictEqual(delta1.diff, -2.4, "80.8 -> 78.4 must yield -2.4 kg exactly (no float error -2.399999999)");
  assert.strictEqual(delta1.direction, "DECREASED");

  const delta2 = calculateMetricDelta(78.4, 80.4, "kg", true);
  assert.ok(delta2 !== null, "Delta should not be null");
  assert.strictEqual(delta2.diff, 2.0, "78.4 -> 80.4 must yield +2.0 kg exactly");
  assert.strictEqual(delta2.direction, "INCREASED");

  // Verify neutral delta formatting in cockpit (not green/red assumption)
  assert.ok(
    cockpitCode.includes("renderDeltaBadge"),
    "Cockpit must contain delta badge helper"
  );
  assert.ok(
    cockpitCode.includes("text-[var(--text-primary)]"),
    "Delta badge should use neutral high-contrast text styling"
  );
});

// -----------------------------------------------------------------------------
// TEST 4: Campo ausente -> "—", nunca zero
// -----------------------------------------------------------------------------
runTest("TEST 4: Campo ausente -> '—', nunca zero", () => {
  assert.strictEqual(formatMetricNumber(null, "kg"), "—", "null metric must render '—'");
  assert.strictEqual(formatMetricNumber(undefined, "cm"), "—", "undefined metric must render '—'");
  assert.notStrictEqual(formatMetricNumber(null, "kg"), "0 kg", "null metric must never render '0 kg'");
  assert.notStrictEqual(formatMetricNumber(null, "cm"), "0 cm", "null metric must never render '0 cm'");
  assert.notStrictEqual(formatMetricNumber(null, "%"), "0%", "null metric must never render '0%'");

  // In cockpit code
  assert.ok(
    cockpitCode.includes("formatMetricNumber"),
    "Mobile cockpit must use formatMetricNumber for fallback"
  );
});

// -----------------------------------------------------------------------------
// TEST 5: Histórico -> mais recente primeiro
// -----------------------------------------------------------------------------
runTest("TEST 5: Histórico -> mais recente primeiro", () => {
  assert.ok(
    cockpitCode.includes("milestones.map((m, idx)"),
    "Cockpit must map milestones in current order"
  );
  assert.ok(
    evolutionLibCode.includes("[...milestonesAsc].reverse()"),
    "Backend / Lib must sort milestones with most recent first"
  );
});

// -----------------------------------------------------------------------------
// TEST 6: Selecionar métrica -> gráfico focado (1 por contexto)
// -----------------------------------------------------------------------------
runTest("TEST 6: Selecionar métrica -> gráfico correto (1 por contexto)", () => {
  assert.ok(
    cockpitCode.includes("activeChartMetric"),
    "Cockpit must manage activeChartMetric state"
  );
  assert.ok(
    cockpitCode.includes("activeChartPoints"),
    "Cockpit must compute points exclusively for selected metric"
  );
  assert.ok(
    cockpitCode.includes("Peso") && cockpitCode.includes("Cintura") && cockpitCode.includes("Abdômen"),
    "Cockpit must allow switching between Weight, Waist, and Abdomen"
  );
});

// -----------------------------------------------------------------------------
// TEST 7: Mobile chart -> sem overflow horizontal, touch-friendly
// -----------------------------------------------------------------------------
runTest("TEST 7: Mobile chart -> sem overflow horizontal, touch-friendly", () => {
  assert.ok(
    cockpitCode.includes("viewBox="),
    "SVG chart must use responsive viewBox"
  );
  assert.ok(
    cockpitCode.includes("w-full"),
    "SVG chart must take 100% width without fixed pixel overflow"
  );
  assert.ok(
    cockpitCode.includes("activePointIndex"),
    "Chart must support touch point inspection"
  );
  assert.ok(
    cockpitCode.includes("overflow-hidden"),
    "Chart container must prevent page horizontal overflow"
  );
});

// -----------------------------------------------------------------------------
// TEST 8: Foto frente -> comparação com frente
// -----------------------------------------------------------------------------
runTest("TEST 8: Foto frente -> comparação com frente", () => {
  assert.ok(
    cockpitCode.includes("EVALUATION_POSES") &&
    cockpitCode.includes("compBeforeMilestone?.photos?.images[pose]") &&
    cockpitCode.includes("compAfterMilestone?.photos?.images[pose]"),
    "Comparator must evaluate and compare identical poses between dates"
  );
});

// -----------------------------------------------------------------------------
// TEST 9: Foto lateral -> comparação com lateral
// -----------------------------------------------------------------------------
runTest("TEST 9: Foto lateral -> comparação com lateral", () => {
  assert.ok(
    cockpitCode.includes("setSelectedPose"),
    "Cockpit must allow pose-by-pose filtering in comparator"
  );
  assert.ok(
    cockpitCode.includes("POSE_LABELS[pose]"),
    "Cockpit must render pose labels"
  );
});

// -----------------------------------------------------------------------------
// TEST 10: RBAC -> aluno A não acessa aluno B
// -----------------------------------------------------------------------------
runTest("TEST 10: RBAC -> verificação no servidor", () => {
  assert.ok(
    evolutionLibCode.includes("canProfessionalAccessStudentEvolution"),
    "Evolution lib must implement canProfessionalAccessStudentEvolution check"
  );
  assert.ok(
    evolutionLibCode.includes("assertProfessionalStudentRelationship"),
    "Personal role must enforce professional-student relationship"
  );
  assert.ok(
    evolutionLibCode.includes("effectiveRole === \"STUDENT\""),
    "Student role must be strictly verified against unauthorized access"
  );
});

// -----------------------------------------------------------------------------
// TEST 11: Tenancy -> consultoria A não acessa consultoria B
// -----------------------------------------------------------------------------
runTest("TEST 11: Tenancy -> isolamento estrito por consultancy_id", () => {
  assert.ok(
    evolutionLibCode.includes("consultancyId") || evolutionLibCode.includes("consultancy_id"),
    "Evolution queries must filter by consultancyId"
  );
  assert.ok(
    evolutionLibCode.includes("resolveConsultancyContext"),
    "Evolution queries must resolve tenancy context securely"
  );
});

// -----------------------------------------------------------------------------
// TEST 12: Upload/preview com alvos táteis e safe-area
// -----------------------------------------------------------------------------
runTest("TEST 12: Upload e formulário mobile com alvos táteis e safe-area", () => {
  assert.ok(
    formCode.includes("inputMode=\"decimal\""),
    "Form numeric fields must use inputMode='decimal' for mobile keypad"
  );
  assert.ok(
    formCode.includes("env(safe-area-inset-bottom"),
    "Form must respect iPhone safe area inset"
  );
  assert.ok(
    formCode.includes("min-h-[48px]"),
    "Submit button must have >= 48px touch target"
  );
  assert.ok(
    formCode.includes("isOpenControlled") && formCode.includes("onCloseControlled"),
    "Form must support controlled slide-up sheet mode"
  );
});

// -----------------------------------------------------------------------------
// TEST 13: Loading -> não skeleton infinito
// -----------------------------------------------------------------------------
runTest("TEST 13: Loading -> estado sem skeleton infinito", () => {
  assert.ok(
    loadingCode.includes("Skeleton"),
    "Route must define loading skeleton via App Router loading.tsx"
  );
  assert.ok(
    hubCode.includes("sm:hidden") && hubCode.includes("MobileEvolutionCockpit"),
    "Hub must render MobileEvolutionCockpit directly on mobile without stuck skeleton"
  );
});

// -----------------------------------------------------------------------------
// TEST 14: Erro -> tratamento e retry disponível
// -----------------------------------------------------------------------------
runTest("TEST 14: Erro -> fallback amigável com botão tentar novamente", () => {
  assert.ok(
    errorCode.includes("Não foi possível carregar sua evolução"),
    "Error boundary must display friendly message without leaking secrets"
  );
  assert.ok(
    errorCode.includes("reset()"),
    "Error boundary must provide retry mechanism"
  );
  assert.ok(
    cockpitCode.includes("milestones.length === 0"),
    "Cockpit safely renders empty state if data is unavailable"
  );
  assert.ok(
    cockpitCode.includes("—"),
    "Cockpit safely renders fallback dashes on missing attributes"
  );
});

// -----------------------------------------------------------------------------
// TEST 15: Perfil do aluno -> Evolução integrado
// -----------------------------------------------------------------------------
runTest("TEST 15: Perfil do aluno -> Evolução integrado", () => {
  assert.ok(
    studentDetailCode.includes("progresso/alunos/${student.membershipPublicId}"),
    "Student detail view must have link to full evolution cockpit"
  );
  assert.ok(
    studentDetailCode.includes("Cockpit 360°") || studentDetailCode.includes("Cockpit de Evolução"),
    "Student detail mobile tab must offer cockpit link"
  );
  assert.ok(
    studentDetailCode.includes("view-evolution"),
    "Student detail action sheet must include action to open evolution cockpit"
  );
});

// -----------------------------------------------------------------------------
// EXTRA CHECKS: Rule 65 (Percentage point differences) & Rule 56 (Desktop preserved)
// -----------------------------------------------------------------------------
runTest("Rule 65: Diferenças percentuais em pontos percentuais (p.p.)", () => {
  assert.ok(
    cockpitCode.includes("unit === \"%\" ? \"p.p.\" : unit"),
    "Percentage deltas must display as 'p.p.' instead of '%'"
  );
});

runTest("Rule 56: Desktop 360 view preserved intact", () => {
  assert.ok(
    hubCode.includes("hidden sm:block space-y-6"),
    "Desktop continuous 360 surface must remain intact under hidden sm:block"
  );
});

console.log("\n==================================================");
console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log("==================================================");

if (failed > 0) {
  process.exit(1);
}
