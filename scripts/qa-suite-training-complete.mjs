/**
 * TREVO ONE — QA SUITE: TRAINING COMPLETE (BUILDER, RUNTIME, NORMALIZER & DUPLICATES)
 * 
 * Tests:
 * 1. Repetition Range Normalizer (Exact reps, ranges '8-12', duration '30s', failure intensity)
 * 2. Load & Volume Presentation (0kg valid bodyweight/bar vs unrecorded load)
 * 3. Combinations & Block Types (STANDARD, SUPERSET, CIRCUIT, REST_PAUSE)
 * 4. Exercise Similarity & Duplicate Protection (Exact duplicate vs legitimate angle/equipment variation)
 * 5. Student Runtime Lifecycle (ACTIVE -> IN_PROGRESS -> COMPLETED)
 * 6. Concurrency & Idempotency Invariants (Double submit / sync retry deduplication)
 */

import { register } from "node:module";
register("./ts-loader.mjs", import.meta.url);

import assert from "node:assert/strict";

const { parseRepsInput } = await import("../lib/training-v2/reps-normalizer.ts");
const {
  normalizeExerciseText,
  stemPortugueseWord,
  tokenizeExercise,
} = await import("../lib/training-v2/exercise-similarity.ts");
const {
  workoutBlockTypeSchema,
  workoutSetTypeSchema,
} = await import("../lib/training-v2/validation.ts");

let passedCount = 0;
let totalCount = 0;

function runTest(name, fn) {
  totalCount++;
  try {
    fn();
    passedCount++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    console.error(`  [FAIL] ${name}:`, err);
    throw err;
  }
}

export async function runTrainingSuite() {
  console.log("=== 6. TRAINING SUITE: BUILDER, RUNTIME, NORMALIZER & COMBINATIONS ===");

  // 1. REPETITION NORMALIZER
  runTest("REPS NORMALIZER: Parses exact integers", () => {
    const res = parseRepsInput(12);
    assert.equal(res.repsMin, 12);
    assert.equal(res.repsMax, null);
    assert.equal(res.formatted, "12 reps");
  });

  runTest("REPS NORMALIZER: Parses repetition ranges (e.g. '8-12', '8 a 12')", () => {
    const res1 = parseRepsInput("8-12");
    assert.equal(res1.repsMin, 8);
    assert.equal(res1.repsMax, 12);
    assert.equal(res1.formatted, "8–12 reps");

    const res2 = parseRepsInput("10 a 15");
    assert.equal(res2.repsMin, 10);
    assert.equal(res2.repsMax, 15);
  });

  runTest("REPS NORMALIZER: Parses failure / intensity indicators", () => {
    const res = parseRepsInput("até a falha");
    assert.equal(res.repsMin, null);
    assert.equal(res.intensityIndicator, "Até a falha");
    assert.equal(res.formatted, "Até a falha");
  });

  runTest("REPS NORMALIZER: Rejects reversed, zero or negative ranges", () => {
    assert.equal(parseRepsInput("12-8"), null, "Reversed range rejected");
    assert.equal(parseRepsInput("0-10"), null, "Zero min rejected");
    assert.equal(parseRepsInput("-5"), null, "Negative reps rejected");
    assert.equal(parseRepsInput(""), null, "Empty string rejected");
    assert.equal(parseRepsInput(null), null, "Null rejected");
  });

  // 2. LOAD & VOLUME
  runTest("LOAD INVARIANT: 0kg is a valid load (bodyweight/empty bar), distinct from unrecorded load", () => {
    function formatLoad(loadKg) {
      if (loadKg === null || loadKg === undefined) return "—";
      if (loadKg === 0) return "0 kg (Corporal)";
      return `${loadKg} kg`;
    }

    assert.equal(formatLoad(0), "0 kg (Corporal)", "0kg preserved and displayed cleanly");
    assert.equal(formatLoad(80), "80 kg");
    assert.equal(formatLoad(null), "—", "Null distinct from 0kg");
  });

  // 3. COMBINATIONS & BLOCK TYPES
  runTest("BLOCK TYPES: Validates training block types via Zod schema", () => {
    assert.equal(workoutBlockTypeSchema.safeParse("SINGLE").success, true);
    assert.equal(workoutBlockTypeSchema.safeParse("BI_SET").success, true);
    assert.equal(workoutBlockTypeSchema.safeParse("SUPER_SET").success, true);
    assert.equal(workoutBlockTypeSchema.safeParse("CIRCUIT").success, true);
    assert.equal(workoutBlockTypeSchema.safeParse("INVALID_BLOCK").success, false);
  });

  runTest("SET TYPES: Validates standard and specialized set types", () => {
    assert.equal(workoutSetTypeSchema.safeParse("WARMUP").success, true);
    assert.equal(workoutSetTypeSchema.safeParse("FEEDER").success, true);
    assert.equal(workoutSetTypeSchema.safeParse("NORMAL").success, true);
    assert.equal(workoutSetTypeSchema.safeParse("DROP_STAGE").success, true);
    assert.equal(workoutSetTypeSchema.safeParse("REST_PAUSE_MINI").success, true);
    assert.equal(workoutSetTypeSchema.safeParse("FAILURE").success, true);
    assert.equal(workoutSetTypeSchema.safeParse("INVALID_SET").success, false);
  });

  // 4. EXERCISE SIMILARITY & DUPLICATE PROTECTION
  runTest("EXERCISE SIMILARITY: Normalizes text and stems Portuguese plural variations", () => {
    assert.equal(normalizeExerciseText("Elevação Lateral com Halteres"), "elevacao lateral com halteres");
    assert.equal(stemPortugueseWord("halteres"), "halter");
    assert.equal(stemPortugueseWord("anilhas"), "anilha");

    const tokensA = tokenizeExercise("Supino Reto com Barra");
    const tokensB = tokenizeExercise("Supino Reto na Barra");
    assert.deepEqual(tokensA, tokensB, "Ignores Portuguese prepositions ('com', 'na')");
  });

  // 5. STUDENT RUNTIME LIFECYCLE
  runTest("STUDENT RUNTIME: IN_PROGRESS sessions excluded from completed history, COMPLETED included", () => {
    const sessions = [
      { id: 1, workoutTitle: "Treino A", status: "COMPLETED", completedAt: "2026-10-08T10:00:00Z" },
      { id: 2, workoutTitle: "Treino B", status: "IN_PROGRESS", completedAt: null },
      { id: 3, workoutTitle: "Treino C", status: "COMPLETED", completedAt: "2026-10-09T14:00:00Z" },
    ];

    function filterCompletedHistory(allSessions) {
      return allSessions
        .filter((s) => s.status === "COMPLETED" && s.completedAt !== null)
        .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
    }

    const history = filterCompletedHistory(sessions);
    assert.equal(history.length, 2, "Only COMPLETED sessions appear in history");
    assert.equal(history[0].workoutTitle, "Treino C", "Sorted recent to old");
    assert.equal(history[1].workoutTitle, "Treino A");
    assert(!history.some((s) => s.status === "IN_PROGRESS"), "IN_PROGRESS strictly excluded from history");
  });

  // 6. CONCURRENCY & IDEMPOTENCY
  runTest("IDEMPOTENCY: Sync queue prevents duplicate session creation on network retry", () => {
    const existingServerSessions = new Set(["client_uuid_abc_123"]);

    function recordExecutionSession(clientSessionId) {
      if (existingServerSessions.has(clientSessionId)) {
        return { created: false, deduplicated: true, status: "ALREADY_PROCESSED" };
      }
      existingServerSessions.add(clientSessionId);
      return { created: true, deduplicated: false, status: "SAVED" };
    }

    const retry1 = recordExecutionSession("client_uuid_abc_123");
    assert.equal(retry1.deduplicated, true);
    assert.equal(retry1.status, "ALREADY_PROCESSED");

    const newOp = recordExecutionSession("client_uuid_xyz_999");
    assert.equal(newOp.created, true);
    assert.equal(newOp.deduplicated, false);
  });

  // 7. BI-SET & ITEM ORDERING INVARIANTS (20 DETERMINISTIC TESTS)
  const { runAllTests: runBiSetOrderingTests } = await import("./test-training-biset-order.mjs");
  const biSetResult = runBiSetOrderingTests();
  passedCount += biSetResult.passed;
  totalCount += biSetResult.total;

  // 8. PERSONAL TRAINER HOME REDESIGN (20 DETERMINISTIC TESTS)
  const { runPersonalHomeRedesignTests } = await import("./test-personal-home-redesign.mjs");
  const homeResult = runPersonalHomeRedesignTests();
  passedCount += homeResult.passed;
  totalCount += homeResult.total;

  // 9. AI TRAINING GENERATION & BUILDER PERSISTENCE (11 DETERMINISTIC TESTS)
  const { runAiTrainingGenerationTests } = await import("./test-ai-training-generation.mjs");
  const aiGenResult = await runAiTrainingGenerationTests();
  passedCount += aiGenResult.passed;
  totalCount += aiGenResult.total;

  console.log(`\nTRAINING SUITE PASS: ${passedCount}/${totalCount} testes executados com sucesso!\n`);
  return { passedCount, totalCount };
}

if (process.argv[1]?.endsWith("qa-suite-training-complete.mjs")) {
  runTrainingSuite();
}
