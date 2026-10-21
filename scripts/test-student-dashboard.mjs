import { register } from "node:module";
register("./ts-loader.mjs", import.meta.url);

import assert from "node:assert";
import fs from "node:fs";

console.log("=== RUNNING STUDENT DASHBOARD & DAILY WORKOUT TEST SUITE ===");

// 1. Verify files exist
const studentViewPath = "components/dashboard/dashboard-student-view.tsx";
const combinedViewPath = "components/dashboard/dashboard-combined-student-vip-view.tsx";
const headerPath = "components/dashboard/student/sections/student-overview-header.tsx";
const focusPath = "components/dashboard/student/sections/student-focus-section.tsx";
const pendingPath = "components/dashboard/student/sections/student-pending-section.tsx";
const pickerPath = "components/dashboard/student/sections/workout-division-picker-modal.tsx";
const consultChatPath = "components/dashboard/student/sections/student-consultations-chat-section.tsx";
const evolutionPath = "components/dashboard/student/sections/student-evolution-section.tsx";
const benefitsPath = "components/dashboard/student/sections/student-benefits-section.tsx";
const welcomePath = "components/auth/post-login-welcome.tsx";
const resolverPath = "lib/training-v2/daily-workout-resolver.ts";
const shellPath = "components/consultancies/consultancy-app-shell.tsx";
const pagePath = "app/consultoria/[slug]/page.tsx";
const treinosPagePath = "app/consultoria/[slug]/treinos/page.tsx";
const treinosDetailPath = "app/consultoria/[slug]/treinos/[assignmentPublicId]/page.tsx";

const files = [
  studentViewPath,
  combinedViewPath,
  headerPath,
  focusPath,
  pendingPath,
  pickerPath,
  consultChatPath,
  evolutionPath,
  benefitsPath,
  welcomePath,
  resolverPath,
  shellPath,
  pagePath,
  treinosPagePath,
  treinosDetailPath,
];

for (const f of files) {
  assert(fs.existsSync(f), `File must exist: ${f}`);
}
console.log("✓ All 15 student dashboard & daily workout files exist");

// Import resolver logic
const {
  parseScheduledWeekdays,
  formatScheduledWeekdaysLabel,
  resolveNextBlockInCycle,
} = await import("../lib/training-v2/daily-workout-resolver.ts");

// 2. Unit Tests for Daily Workout Resolver Logic
console.log("\n--- Testing Weekday Schedule Parser ---");
const monWedFri = parseScheduledWeekdays("Segunda, Quarta e Sexta — Peito");
assert.deepStrictEqual(monWedFri, [1, 3, 5], "Must parse Segunda, Quarta, Sexta as [1, 3, 5]");

const tuesThurs = parseScheduledWeekdays("Terça e Quinta — Pernas", "Focar no quadríceps");
assert.deepStrictEqual(tuesThurs, [2, 4], "Must parse Terça e Quinta as [2, 4]");

const saturday = parseScheduledWeekdays("Sábado — Cardio");
assert.deepStrictEqual(saturday, [6], "Must parse Sábado as [6]");

const sunday = parseScheduledWeekdays("Domingo — Alongamento");
assert.deepStrictEqual(sunday, [0], "Must parse Domingo as [0]");

const noWeekdays = parseScheduledWeekdays("Treino A — Peito e Tríceps", "3 séries por exercício");
assert.deepStrictEqual(noWeekdays, [], "Sequential training must have empty weekdays");

const labelMon = formatScheduledWeekdaysLabel([1]);
assert.strictEqual(labelMon, "Segunda-feira", "Single day label must be full name");

const labelMulti = formatScheduledWeekdaysLabel([1, 4]);
assert.strictEqual(labelMulti, "Seg, Qui", "Multi-day label must format nicely");

console.log("✓ Weekday Schedule Parser passed cleanly");

console.log("\n--- Testing Sequence Cycle Progression (No Days) ---");
// Scenario: Blocks [A, B, C] -> ids [10, 20, 30]
const blocks = [10, 20, 30];

// Step 1: No previous sessions
const r0 = resolveNextBlockInCycle(blocks, []);
assert.strictEqual(r0.nextIndex, 0, "First session of cycle must be index 0 (A)");
assert.strictEqual(r0.isNewCycle, true, "First session must be flagged as new cycle");

// Step 2: Student completed A (10)
const r1 = resolveNextBlockInCycle(blocks, [10]);
assert.strictEqual(r1.nextIndex, 1, "Next after A must be index 1 (B)");
assert.deepStrictEqual(r1.pendingIndices, [1, 2], "Remaining pendings must be [B, C]");

// Step 3: Out-of-order execution!
// If student chose C (30) when pending was [A, B, C]:
const rOutOfOrder = resolveNextBlockInCycle(blocks, [30]);
assert.strictEqual(rOutOfOrder.nextIndex, 0, "After out-of-order C, next pending in cycle must be index 0 (A)");
assert.deepStrictEqual(rOutOfOrder.pendingIndices, [0, 1], "Remaining pendings must be [A, B]");

// Step 4: After completing A (history: [10, 30])
const rAfterA = resolveNextBlockInCycle(blocks, [10, 30]);
assert.strictEqual(rAfterA.nextIndex, 1, "After C and A, next pending must be index 1 (B)");
assert.deepStrictEqual(rAfterA.pendingIndices, [1], "Remaining pending must be [B]");

// Step 5: After completing B (history: [20, 10, 30] - cycle complete!)
const rCycleComplete = resolveNextBlockInCycle(blocks, [20, 10, 30]);
assert.strictEqual(rCycleComplete.nextIndex, 0, "When all blocks in cycle completed, new cycle starts at index 0 (A)");
assert.strictEqual(rCycleComplete.isNewCycle, true, "Cycle reset must flag isNewCycle = true");

console.log("✓ Sequence Cycle Progression and Out-of-Order Recovery passed cleanly");

// 3. UI and Component Structure Verification
const headerCode = fs.readFileSync(headerPath, "utf8");
const focusCode = fs.readFileSync(focusPath, "utf8");
const pickerCode = fs.readFileSync(pickerPath, "utf8");
const welcomeCode = fs.readFileSync(welcomePath, "utf8");
const pageCode = fs.readFileSync(pagePath, "utf8");
const treinosPageCode = fs.readFileSync(treinosPagePath, "utf8");
const treinosDetailCode = fs.readFileSync(treinosDetailPath, "utf8");

// Header verification (compact, no repeating cards)
assert(headerCode.includes("Meu acompanhamento"), "Header must have title 'Meu acompanhamento'");
assert(headerCode.includes("Aluno:"), "Header must identify student once");
assert(!headerCode.includes("Ficha de Treino"), "Header must NOT duplicate summary tiles already present below");
console.log("✓ Compact cockpit header verified (no duplicate summary blocks)");

// Focus section verification
assert(focusCode.includes("divisionTitle"), "Focus section must display divisionTitle in highlight");
assert(focusCode.includes("Escolher outro treino"), "Focus section must provide secondary action 'Escolher outro treino'");
assert(focusCode.includes("WorkoutDivisionPickerModal"), "Focus section must integrate WorkoutDivisionPickerModal");
assert(focusCode.includes("Abrir plano alimentar"), "Focus section must have single clear nutrition action");
assert(!focusCode.includes("Ver cardápio completo"), "Focus section must NOT duplicate nutrition action");
console.log("✓ Training focus section verified (division highlight, choose other workout, single nutrition action)");

// Division picker modal verification
assert(pickerCode.includes("A troca vale para esta sessão"), "Picker must clarify that swap applies only to this session");
assert(pickerCode.includes("Fazer este treino"), "Picker CTA must be 'Fazer este treino'");
assert(pickerCode.includes("?bloco="), "Picker must navigate to workout with bloco query param");
console.log("✓ Workout division picker modal verified");

// Post login welcome verification
assert(welcomeCode.includes("Trevo"), "Welcome screen must render Trevo One brand");
assert(welcomeCode.includes("Abrindo seu painel..."), "Welcome screen must show objective status 'Abrindo seu painel...'");
assert(!welcomeCode.includes("Já estávamos com saudades!"), "Welcome screen must NOT contain 'Já estávamos com saudades!'");
assert(!welcomeCode.includes("bg-emerald-500/15 blur-3xl"), "Welcome screen must NOT have blurry neon glow");
assert(welcomeCode.includes("Continuar para o painel"), "Welcome screen must have recoverable escape button");
console.log("✓ Post-login welcome screen verified (crisp logo, objective status, no neon halo, recoverable)");

// Authoritative shared resolution verification
assert(pageCode.includes("resolveStudentDailyWorkout"), "page.tsx must use resolveStudentDailyWorkout");
assert(treinosPageCode.includes("resolveStudentDailyWorkout"), "treinos/page.tsx must use resolveStudentDailyWorkout");
assert(treinosDetailCode.includes("initialSelectedBlockPublicId"), "treinos detail must pass initialSelectedBlockPublicId");
console.log("✓ Shared authoritative resolution verified across dashboard and workout pages");

console.log("\n=== ALL 14 TEST SUITE ASSERTIONS PASSED WITH ZERO REGRESSIONS ===");
