/**
 * TREVO ONE — TEST SUITE: WORKOUT SCHEMA RESILIENCE & ERROR CARD INTEGRITY
 * 
 * Verifies:
 * 1. Schema resilience detector (isMissingColumnError): errno 1054, ER_BAD_FIELD_ERROR, 42S22.
 * 2. Canonical Migration 066 Checksum verification (sha256).
 * 3. SQL fallback branches in daily-workout-resolver, assignment-repository, and execution-repository.
 * 4. Dashboard student focus section error card integrity (no "Ativo", no "3 exercícios", no "~40 min").
 * 5. Workout detail page crash prevention (defensive execution/history loading).
 */

import assert from "node:assert";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("TREVO ONE — TEST SUITE: WORKOUT SCHEMA RESILIENCE & ERROR CARD INTEGRITY");
console.log("================================================================================\n");

let passedTests = 0;
let totalTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  [PASS] ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${testName}`);
    console.error(err);
    process.exitCode = 1;
  }
}

// -----------------------------------------------------------------------------
// 1. Schema Resilience Error Detection
// -----------------------------------------------------------------------------
console.log("1. Schema Resilience Error Detection");

function mockIsMissingColumnError(err, columnNames) {
  if (!err || typeof err !== "object") return false;
  const e = err;
  const isBadFieldCode =
    e.code === "ER_BAD_FIELD_ERROR" ||
    e.errno === 1054 ||
    e.sqlState === "42S22";

  if (!isBadFieldCode) return false;
  if (!columnNames || columnNames.length === 0) return true;

  const msg = String(e.message || "").toLowerCase();
  const sqlMsg = String(e.sqlMessage || "").toLowerCase();
  return columnNames.some((col) => {
    const target = col.toLowerCase();
    return msg.includes(target) || sqlMsg.includes(target);
  });
}

runTest("isMissingColumnError detects MySQL errno 1054 with ER_BAD_FIELD_ERROR", () => {
  const err = {
    code: "ER_BAD_FIELD_ERROR",
    errno: 1054,
    sqlState: "42S22",
    sqlMessage: "Unknown column 'wes.workout_block_id' in 'field list'",
  };
  assert.strictEqual(mockIsMissingColumnError(err), true);
  assert.strictEqual(mockIsMissingColumnError(err, ["workout_block_id"]), true);
  assert.strictEqual(mockIsMissingColumnError(err, ["is_skipped"]), false);
  assert.strictEqual(mockIsMissingColumnError(err, ["workout_block_id", "is_skipped"]), true);
});

runTest("isMissingColumnError detects missing is_skipped column", () => {
  const err = {
    code: "ER_BAD_FIELD_ERROR",
    errno: 1054,
    sqlState: "42S22",
    sqlMessage: "Unknown column 'wex.is_skipped' in 'field list'",
  };
  assert.strictEqual(mockIsMissingColumnError(err), true);
  assert.strictEqual(mockIsMissingColumnError(err, ["is_skipped"]), true);
  assert.strictEqual(mockIsMissingColumnError(err, ["workout_block_id"]), false);
});

runTest("isMissingColumnError rejects unrelated MySQL errors", () => {
  const tableErr = { code: "ER_NO_SUCH_TABLE", errno: 1146, sqlMessage: "Table doesn't exist" };
  const connErr = { code: "ECONNREFUSED", errno: -4078 };
  assert.strictEqual(mockIsMissingColumnError(tableErr), false);
  assert.strictEqual(mockIsMissingColumnError(connErr), false);
  assert.strictEqual(mockIsMissingColumnError(null), false);
});

// -----------------------------------------------------------------------------
// 2. Canonical Migration 066 Checksum & File Verification
// -----------------------------------------------------------------------------
console.log("\n2. Canonical Migration 066 Checksum & File Verification");

const migration066Path = path.join(
  rootDir,
  "database/migrations/066_workout_execution_sessions_scoped_block.sql"
);

runTest("Migration 066 file exists and matches canonical sha256 checksum", () => {
  assert.strictEqual(fs.existsSync(migration066Path), true, "Migration 066 file must exist");
  const rawBytes = fs.readFileSync(migration066Path);
  const normalizedLf = fs.readFileSync(migration066Path, "utf8").replace(/\r\n/g, "\n");

  const rawChecksum = crypto.createHash("sha256").update(rawBytes).digest("hex");
  const lfChecksum = crypto.createHash("sha256").update(normalizedLf, "utf8").digest("hex");

  const EXPECTED_CANONICAL_CHECKSUM = "5eb54322a3435b86706d35b6b64b239cfeea789e57797019fa76faa75f01550d";

  console.log(`    - Migration 066 RAW SHA256: ${rawChecksum}`);
  console.log(`    - Migration 066 LF  SHA256: ${lfChecksum}`);
  console.log(`    - Canonical Expected:      ${EXPECTED_CANONICAL_CHECKSUM}`);

  assert.strictEqual(
    lfChecksum,
    EXPECTED_CANONICAL_CHECKSUM,
    "Normalized LF checksum must match canonical checksum"
  );
});

runTest("Migration 066 DDL contents contain required additions and foreign keys", () => {
  const sql = fs.readFileSync(migration066Path, "utf8");
  assert.ok(sql.includes("workout_block_id"), "Must add workout_block_id column");
  assert.ok(sql.includes("idx_wes_block"), "Must add idx_wes_block index");
  assert.ok(sql.includes("fk_wes_block"), "Must add fk_wes_block constraint");
  assert.ok(sql.includes("workout_blocks"), "FK must reference workout_blocks");
  assert.ok(sql.includes("is_skipped"), "Must add is_skipped column");
});

// -----------------------------------------------------------------------------
// 3. Fallback Query Coverage in Repositories
// -----------------------------------------------------------------------------
console.log("\n3. Fallback Query Coverage in Repositories");

runTest("daily-workout-resolver.ts has fallback queries for missing 066 columns", () => {
  const code = fs.readFileSync(path.join(rootDir, "lib/training-v2/daily-workout-resolver.ts"), "utf8");
  assert.ok(code.includes("isMissingColumnError"), "daily-workout-resolver must import/use isMissingColumnError");
  assert.ok(code.includes("NULL AS workout_block_id"), "Must have fallback query providing NULL AS workout_block_id");
  assert.ok(
    code.includes("COUNT(CASE WHEN wex.completed_at IS NOT NULL THEN 1 END) AS completed_sets"),
    "Must have fallback query counting completed sets without is_skipped"
  );
});

runTest("assignment-repository.ts has fallback queries for missing 066 columns", () => {
  const code = fs.readFileSync(path.join(rootDir, "lib/training-v2/assignment-repository.ts"), "utf8");
  assert.ok(code.includes("isMissingColumnError"), "assignment-repository must import/use isMissingColumnError");
  assert.ok(code.includes("NULL AS workout_block_id"), "Must have fallback query providing NULL AS workout_block_id");
  assert.ok(
    code.includes("COUNT(CASE WHEN wex.completed_at IS NOT NULL THEN 1 END) AS completed_sets"),
    "Must have fallback query counting completed sets without is_skipped"
  );
});

runTest("execution-repository.ts has fallback queries for missing 066 columns", () => {
  const code = fs.readFileSync(path.join(rootDir, "lib/training-v2/execution-repository.ts"), "utf8");
  assert.ok(code.includes("queryExecutionSessionWithBlock"), "Must use queryExecutionSessionWithBlock helper");
  assert.ok(code.includes("queryExecutionSetsBySessionId"), "Must use queryExecutionSetsBySessionId helper");
  assert.ok(code.includes("queryExecutionSetsBySessionIdsBatch"), "Must use queryExecutionSetsBySessionIdsBatch helper");
  assert.ok(code.includes("insertExecutionSessionSafely"), "Must use insertExecutionSessionSafely helper");
  assert.ok(code.includes("0 AS is_skipped"), "Must have fallback query projecting 0 AS is_skipped");
});

// -----------------------------------------------------------------------------
// 4. Dashboard Student Focus Section Error State Integrity
// -----------------------------------------------------------------------------
console.log("\n4. Dashboard Student Focus Section Error State Integrity");

runTest("student-focus-section.tsx suppresses 'Ativo', exercise count, and duration in error state", () => {
  const code = fs.readFileSync(
    path.join(rootDir, "components/dashboard/student/sections/student-focus-section.tsx"),
    "utf8"
  );

  // Check variable definitions
  assert.ok(code.includes('const isError = status === "ERROR";'), "Must define isError");
  assert.ok(
    code.includes('const hasTraining = !isError && Boolean(dailyWorkoutResolution?.assignmentPublicId || activeTraining);'),
    "hasTraining must be false when isError is true"
  );
  assert.ok(
    code.includes('const exerciseCount = isError'),
    "exerciseCount must be 0 when isError is true"
  );
  assert.ok(
    code.includes('const durationEstimate = isError'),
    "durationEstimate must be null when isError is true"
  );

  // Check Badge logic: must render 'Atenção' and NEVER 'Ativo' when isError
  assert.ok(code.includes("isError ? ("), "Must check isError before rendering Ativo");
  assert.ok(code.includes("Atenção"), "Must render 'Atenção' badge in error state");

  // Check Content logic: must render dedicated notice and not the normal workout card
  assert.ok(
    code.includes("Consulta de treino indisponível no momento"),
    "Must render clear error notice heading"
  );

  // Check Action logic: must offer 'Ver meus treinos' and 'Tentar novamente'
  assert.ok(code.includes("Ver meus treinos"), "Must render action to view all workouts");
  assert.ok(code.includes("Tentar novamente"), "Must render retry action");
});

// -----------------------------------------------------------------------------
// 5. Workout Detail Page Defensive Error Handling
// -----------------------------------------------------------------------------
console.log("\n5. Workout Detail Page Defensive Error Handling");

runTest("workout detail page ([assignmentPublicId]/page.tsx) wraps execution loading in try/catch", () => {
  const code = fs.readFileSync(
    path.join(rootDir, "app/consultoria/[slug]/treinos/[assignmentPublicId]/page.tsx"),
    "utf8"
  );

  assert.ok(
    code.includes("let initialExecution = null;"),
    "initialExecution must default to null safely"
  );
  assert.ok(
    code.includes("let executionHistory: Awaited<ReturnType<typeof listStudentWorkoutExecutionHistory>> = [];"),
    "executionHistory must default to empty array safely"
  );
  assert.ok(
    code.includes("try {"),
    "Must wrap execution/history loading in try block"
  );
  assert.ok(
    code.includes("[StudentWorkoutDetailPage] Failed to load execution/history state:"),
    "Must log failure gracefully without crashing shell"
  );
});

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log("\n================================================================================");
console.log(`TEST RESULTS: ${passedTests}/${totalTests} tests passed.`);
console.log("================================================================================\n");

if (passedTests !== totalTests) {
  process.exit(1);
}
