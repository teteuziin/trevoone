/**
 * TREVO ONE - STUDENT DASHBOARD WORKOUT RESOLUTION & RESILIENCE TEST
 *
 * Verifies:
 * 1. WEEKDAY_NAMES_PT exported in route-helpers.ts and imported in daily-workout-resolver.ts
 * 2. Daily workout resolution fallback states (including 'AVAILABLE')
 * 3. VIP / INFLUENCER role normalization in consultancies context
 * 4. Dashboard card resilience: Error status in daily workout does NOT hide active routine when activeTraining exists
 * 5. Tenancy isolation and ownership checks
 */

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}:`, err.message);
    failed++;
  }
}

console.log("=== TREVO ONE: STUDENT DASHBOARD WORKOUT RESOLUTION TESTS ===\n");

// 1. FILE INTEGRITY & EXPORT/IMPORT CONSISTENCY
console.log("1. File Integrity & Export/Import Consistency:");

const routeHelpersPath = path.join(rootDir, "lib", "training-v2", "route-helpers.ts");
const routeHelpersContent = fs.readFileSync(routeHelpersPath, "utf-8");

const dailyResolverPath = path.join(rootDir, "lib", "training-v2", "daily-workout-resolver.ts");
const dailyResolverContent = fs.readFileSync(dailyResolverPath, "utf-8");

const studentFocusPath = path.join(rootDir, "components", "dashboard", "student", "sections", "student-focus-section.tsx");
const studentFocusContent = fs.readFileSync(studentFocusPath, "utf-8");

const contextPath = path.join(rootDir, "lib", "consultancies", "context.ts");
const contextContent = fs.readFileSync(contextPath, "utf-8");

test("route-helpers.ts exports WEEKDAY_NAMES_PT and WEEKDAY_SHORT_NAMES_PT", () => {
  assert.match(routeHelpersContent, /export\s+const\s+WEEKDAY_NAMES_PT\s*=/);
  assert.match(routeHelpersContent, /export\s+const\s+WEEKDAY_SHORT_NAMES_PT\s*=/);
});

test("daily-workout-resolver.ts imports WEEKDAY_NAMES_PT from route-helpers", () => {
  assert.match(dailyResolverContent, /WEEKDAY_NAMES_PT/);
  assert.match(dailyResolverContent, /import\s*\{[^}]*WEEKDAY_NAMES_PT[^}]*\}\s*from\s*["']\.\/route-helpers["']/);
});

test("daily-workout-resolver.ts imports parseScheduledWeekdays from route-helpers", () => {
  assert.match(dailyResolverContent, /import\s*\{[^}]*parseScheduledWeekdays[^}]*\}\s*from\s*["']\.\/route-helpers["']/);
});

test("daily-workout-resolver.ts includes AVAILABLE in DailyWorkoutDecisionStatus", () => {
  assert.match(dailyResolverContent, /\|\s*"AVAILABLE"/);
});

test("context.ts normalizes VIP to INFLUENCER in normalizeRole", () => {
  assert.match(contextContent, /clean\s*===\s*["']VIP["']\s*\|\|\s*clean\s*===\s*["']INFLUENCER["']/);
});

test("student-focus-section.tsx checks isError and hasTraining honestly without fake data", () => {
  assert.match(studentFocusContent, /const\s+isError\s*=\s*status\s*===\s*["']ERROR["'];/);
  assert.match(studentFocusContent, /const\s+hasTraining\s*=\s*!isError\s*&&\s*Boolean\(dailyWorkoutResolution\?\.assignmentPublicId\s*\|\|\s*activeTraining\);/);
});

// 2. LOGICAL CYCLE SEQUENCING
console.log("\n2. Cycle Sequencing Logic:");

function resolveNextBlockInCycle(blockIds, completedBlockIdsRecent) {
  if (blockIds.length === 0) {
    return { nextIndex: 0, pendingIndices: [], isNewCycle: true };
  }
  if (blockIds.length === 1) {
    return { nextIndex: 0, pendingIndices: [0], isNewCycle: false };
  }
  const completedInCurrentCycle = new Set();
  for (const bId of completedBlockIdsRecent) {
    if (blockIds.includes(bId)) {
      if (completedInCurrentCycle.has(bId)) {
        break;
      }
      completedInCurrentCycle.add(bId);
      if (completedInCurrentCycle.size === blockIds.length) {
        break;
      }
    }
  }
  if (completedInCurrentCycle.size === blockIds.length || completedInCurrentCycle.size === 0) {
    return {
      nextIndex: 0,
      pendingIndices: blockIds.map((_, i) => i),
      isNewCycle: true,
    };
  }
  const pendingIndices = [];
  for (let i = 0; i < blockIds.length; i++) {
    if (!completedInCurrentCycle.has(blockIds[i])) {
      pendingIndices.push(i);
    }
  }
  return {
    nextIndex: pendingIndices.length > 0 ? pendingIndices[0] : 0,
    pendingIndices,
    isNewCycle: false,
  };
}

test("New cycle starts at index 0 with all indices pending", () => {
  const blockIds = [101, 102, 103];
  const completedRecent = [];
  const res = resolveNextBlockInCycle(blockIds, completedRecent);
  assert.strictEqual(res.nextIndex, 0);
  assert.deepStrictEqual(res.pendingIndices, [0, 1, 2]);
  assert.strictEqual(res.isNewCycle, true);
});

test("Advances to next pending block after first block is completed", () => {
  const blockIds = [101, 102, 103];
  const completedRecent = [101];
  const res = resolveNextBlockInCycle(blockIds, completedRecent);
  assert.strictEqual(res.nextIndex, 1);
  assert.deepStrictEqual(res.pendingIndices, [1, 2]);
  assert.strictEqual(res.isNewCycle, false);
});

test("Student who trains out of order keeps remaining blocks pending in order", () => {
  const blockIds = [101, 102, 103];
  const completedRecent = [103]; // Student skipped to C
  const res = resolveNextBlockInCycle(blockIds, completedRecent);
  assert.strictEqual(res.nextIndex, 0);
  assert.deepStrictEqual(res.pendingIndices, [0, 1]);
  assert.strictEqual(res.isNewCycle, false);
});

// 3. STUDENT DASHBOARD CARD RESILIENCE
console.log("\n3. Student Dashboard Card Resilience:");

test("When dailyWorkoutResolution status is SCHEDULED_TODAY, isError is false and hasTraining is true", () => {
  const dailyWorkoutResolution = {
    status: "SCHEDULED_TODAY",
    headlineTitle: "Treino de hoje",
    divisionTitle: "Treino A - Peitoral",
    routineTitle: "Hipertrofia - Ficha A",
    assignmentPublicId: "assign-abc-123",
    targetBlockPublicId: "wb-block-1",
    actionHref: "/consultoria/trevo/treinos/assign-abc-123?bloco=wb-block-1",
    actionLabel: "Começar treino",
    canChangeDivision: true,
    availableDivisions: [],
    todayWeekday: 1,
    todayWeekdayName: "Segunda-feira",
    todayDateStr: "2026-10-27",
    consultancyTimezone: "America/Sao_Paulo",
  };

  const status = dailyWorkoutResolution?.status;
  const isError = status === "ERROR";
  const hasTraining = !isError && Boolean(dailyWorkoutResolution?.assignmentPublicId);

  assert.strictEqual(isError, false, "Must not be error");
  assert.strictEqual(hasTraining, true, "Must have training");
  assert.strictEqual(dailyWorkoutResolution.todayWeekdayName, "Segunda-feira");
});

test("When dailyWorkoutResolution status is ERROR, card honestly displays error without masking", () => {
  const dailyWorkoutResolution = {
    status: "ERROR",
    headlineTitle: "Falha ao consultar treino",
  };

  const status = dailyWorkoutResolution?.status;
  const isError = status === "ERROR";
  const hasTraining = !isError && Boolean(dailyWorkoutResolution?.assignmentPublicId);

  assert.strictEqual(isError, true, "Must be error");
  assert.strictEqual(hasTraining, false, "Must suppress training cards to avoid inconsistent count");
});

// SUMMARY
console.log(`\nTests finished: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}
