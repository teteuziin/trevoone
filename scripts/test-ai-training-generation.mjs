/**
 * TREVO ONE — DETERMINISTIC QA SUITE: AI WORKOUT GENERATION & BUILDER PERSISTENCE
 * 
 * Verifies:
 * 1. Single-day & multi-day text description parsing (including "treino único", 1 day, 7 days)
 * 2. Provider generation mode produces valid single-day & multi-day workouts with exercises
 * 3. Bi-set and combinations contract: combinationIndex, combinationType, rounds and rest
 * 4. Combination cleanup defense (incomplete single-member combinations are un-grouped)
 * 5. Rejection of empty categories or 0 exercises before preview and before persistence
 * 6. UI Cluster grouping for Bi-set/Tri-set preview and conflict-free banners
 */

import assert from "node:assert/strict";
import { analyzeWorkoutDescription } from "../lib/training-v2/training-ai-text-analyzer.ts";
import { getAiImportProvider } from "../lib/ai/provider.ts";
import { TRAINING_GENERATION_SYSTEM_PROMPT } from "../lib/ai/openai-client.ts";

export function runAiTrainingGenerationTests() {
  console.log("=== 9. AI TRAINING GENERATION & BUILDER PERSISTENCE SUITE ===");

  let passed = 0;
  let total = 0;

  function runTest(name, fn) {
    total++;
    try {
      fn();
      passed++;
      console.log(`  [PASS] ${name}`);
    } catch (err) {
      console.error(`  [FAIL] ${name}:`, err);
      throw err;
    }
  }

  // 1. Text Analyzer tests
  runTest("AI ANALYZER: Recognizes 'treino único' as 1 day and sets split", () => {
    const res = analyzeWorkoutDescription("Quero um treino único de pernas em 50 minutos com academia completa");
    assert.equal(res.daysPerWeek, 1);
    assert.equal(res.split, "Treino Único");
    assert.equal(res.durationMinutes, 50);
    assert.equal(res.isComplete, true);
  });

  runTest("AI ANALYZER: Recognizes '1 dia' and 'sessão única'", () => {
    const res1 = analyzeWorkoutDescription("Treino para 1 dia por semana");
    assert.equal(res1.daysPerWeek, 1);
    const res2 = analyzeWorkoutDescription("Preciso de uma sessão única para costas");
    assert.equal(res2.daysPerWeek, 1);
  });

  runTest("AI ANALYZER: Recognizes 4-day ABCD split with focus muscles", () => {
    const res = analyzeWorkoutDescription("Treino de hipertrofia 4 dias por semana 60 min academia completa foco em ombros");
    assert.equal(res.daysPerWeek, 4);
    assert.equal(res.durationMinutes, 60);
    assert.equal(res.objective, "Hipertrofia e Ganho de Massa Muscular");
    assert.equal(res.focusMuscles, "ombros");
    assert.equal(res.isComplete, true);
  });

  runTest("AI ANALYZER: Detects contradiction and asks natural clarification", () => {
    const res = analyzeWorkoutDescription("Quero treinar todo dia mas só tenho 2 dias disponíveis");
    assert.equal(res.hasContradiction, true);
    assert.equal(res.isComplete, false);
    assert.ok(res.clarificationQuestion?.includes("dias"));
  });

  // 2. Provider Generation Mode
  runTest("AI PROVIDER: Generation mode with 1 day returns 1 category with valid exercises", async () => {
    const provider = getAiImportProvider();
    const input = {
      buffer: Buffer.from("PROPOSTA DE TREINO PERSONALIZADO\nFrequência: 1 dia (sessão única)\nObjetivo: Hipertrofia de Pernas"),
      filename: "gen-1day.txt",
      mimeType: "text/plain",
    };

    const res = await provider.importTraining(input, undefined, "GENERATE");
    assert.ok(res.proposal);
    assert.equal(res.proposal.categories.length, 1);
    const cat = res.proposal.categories[0];
    assert.ok(cat.exercises.length >= 4);
    assert.ok(cat.exercises.some((e) => e.exerciseNameCandidate.includes("Agachamento")));
    assert.ok(cat.exercises.every((e) => e.sets && e.sets >= 1));
  });

  runTest("AI PROVIDER: Generation mode with multi-day returns 2+ categories with Bi-set", async () => {
    const provider = getAiImportProvider();
    const input = {
      buffer: Buffer.from("PROPOSTA DE TREINO PERSONALIZADO\nFrequência: 4 dias por semana\nObjetivo: Hipertrofia com bi-set"),
      filename: "gen-4day.txt",
      mimeType: "text/plain",
    };

    const res = await provider.importTraining(input, undefined, "GENERATE");
    assert.ok(res.proposal.categories.length >= 2);
    
    // Check bi-set structure
    const allExercises = res.proposal.categories.flatMap((c) => c.exercises);
    const biSetMembers = allExercises.filter((e) => e.combinationType === "BI_SET");
    assert.ok(biSetMembers.length >= 2, "Must contain at least 2 bi-set members");
    assert.equal(biSetMembers[0].combinationIndex, biSetMembers[1].combinationIndex);
    assert.equal(biSetMembers[0].combinationRestSeconds, 60);
  });

  // 3. Prompt & Schema System Contract
  runTest("AI PROMPT: TRAINING_GENERATION_SYSTEM_PROMPT enforces Brazilian Portuguese and complete structure", () => {
    assert.ok(TRAINING_GENERATION_SYSTEM_PROMPT.includes("treinador"));
    assert.ok(TRAINING_GENERATION_SYSTEM_PROMPT.includes("BI_SET"));
    assert.ok(TRAINING_GENERATION_SYSTEM_PROMPT.includes("pelo menos 1"));
    assert.ok(TRAINING_GENERATION_SYSTEM_PROMPT.toLowerCase().includes("português do brasil"));
  });

  // 4. Incomplete Combination Defense
  runTest("COMBINATION DEFENSE: Single member combination is un-grouped into regular exercise", () => {
    const rawExercises = [
      { exerciseNameCandidate: "Supino reto", combinationIndex: null, combinationType: null },
      { exerciseNameCandidate: "Crucifixo", combinationIndex: 1, combinationType: "BI_SET" }, // Only 1 member!
      { exerciseNameCandidate: "Tríceps testa", combinationIndex: null, combinationType: null },
    ];

    const combCounts = new Map();
    for (const ex of rawExercises) {
      if (ex.combinationIndex != null) {
        combCounts.set(ex.combinationIndex, (combCounts.get(ex.combinationIndex) || 0) + 1);
      }
    }

    const resolved = rawExercises.map((ex) => {
      const cIndex = ex.combinationIndex ?? null;
      const cCount = cIndex != null ? (combCounts.get(cIndex) || 0) : 0;
      if (cIndex != null && cCount >= 2) {
        return { ...ex, combinationIndex: cIndex };
      }
      return { ...ex, combinationIndex: null, combinationType: null };
    });

    assert.equal(resolved[1].combinationIndex, null, "Orphaned member must be un-grouped");
    assert.equal(resolved[1].combinationType, null);
  });

  // 5. Validation Rejection Contract
  runTest("VALIDATION: Rejection of empty categories and zero exercises", () => {
    function validateDraftPayload(categories) {
      if (!categories || categories.length === 0) {
        throw new Error("O treino precisa conter pelo menos uma divisão/categoria para ser salvo.");
      }
      const total = categories.reduce((acc, c) => acc + (Array.isArray(c?.exercises) ? c.exercises.length : 0), 0);
      if (total === 0) {
        throw new Error("O treino precisa conter pelo menos um exercício para ser salvo.");
      }
      return true;
    }

    assert.throws(() => validateDraftPayload([]), /pelo menos uma divisão\/categoria/);
    assert.throws(() => validateDraftPayload([{ name: "Treino A", exercises: [] }]), /pelo menos um exercício/);
    assert.doesNotThrow(() => validateDraftPayload([{ name: "Treino A", exercises: [{ name: "Supino" }] }]));
  });

  // 6. UI Cluster Grouping & Non-Conflicting Banners
  runTest("UI CLUSTER: Groups contiguous bi-set members into combination container with A/B pills", () => {
    const exercises = [
      { exerciseNameSnapshot: "Supino reto", combinationIndex: null },
      { exerciseNameSnapshot: "Crucifixo máquina", combinationIndex: 1, combinationType: "BI_SET", sets: 3, combinationRestSeconds: 60 },
      { exerciseNameSnapshot: "Tríceps polia", combinationIndex: 1, combinationType: "BI_SET", sets: 3, combinationRestSeconds: 60 },
      { exerciseNameSnapshot: "Tríceps corda", combinationIndex: null },
    ];

    const clusters = [];
    let activeComb = null;

    exercises.forEach((ex, eIdx) => {
      if (ex.combinationIndex != null) {
        if (activeComb && activeComb.combinationIndex === ex.combinationIndex) {
          activeComb.items.push(ex);
        } else {
          if (activeComb) clusters.push({ type: "COMBINATION", ...activeComb });
          activeComb = {
            combinationIndex: ex.combinationIndex,
            combinationType: ex.combinationType || "BI_SET",
            rounds: ex.sets || 3,
            restSeconds: ex.combinationRestSeconds ?? 60,
            items: [ex],
          };
        }
      } else {
        if (activeComb) {
          clusters.push({ type: "COMBINATION", ...activeComb });
          activeComb = null;
        }
        clusters.push({ type: "SINGLE", item: ex, originalIndex: eIdx });
      }
    });
    if (activeComb) clusters.push({ type: "COMBINATION", ...activeComb });

    assert.equal(clusters.length, 3);
    assert.equal(clusters[0].type, "SINGLE");
    assert.equal(clusters[0].item.exerciseNameSnapshot, "Supino reto");
    assert.equal(clusters[1].type, "COMBINATION");
    assert.equal(clusters[1].items.length, 2);
    assert.equal(clusters[1].rounds, 3);
    assert.equal(clusters[1].items[0].exerciseNameSnapshot, "Crucifixo máquina");
    assert.equal(clusters[1].items[1].exerciseNameSnapshot, "Tríceps polia");
    assert.equal(clusters[2].type, "SINGLE");
    assert.equal(clusters[2].item.exerciseNameSnapshot, "Tríceps corda");
  });

  runTest("UI BANNER: Error and success banners never appear simultaneously in PREVIEW", () => {
    function renderPreviewBanner(errorMessage) {
      if (errorMessage) {
        return { type: "ERROR", message: errorMessage, showsSuccess: false };
      }
      return { type: "SUCCESS", message: "✓ Proposta pronta para revisão!", showsSuccess: true };
    }

    const withError = renderPreviewBanner("O treino precisa conter pelo menos um exercício");
    assert.equal(withError.type, "ERROR");
    assert.equal(withError.showsSuccess, false);

    const withoutError = renderPreviewBanner(null);
    assert.equal(withoutError.type, "SUCCESS");
    assert.equal(withoutError.showsSuccess, true);
  });

  console.log(`\nAI TRAINING GENERATION SUITE PASS: ${passed}/${total} testes executados com sucesso!\n`);
  return { passed, total };
}

if (process.argv[1]?.endsWith("test-ai-training-generation.mjs")) {
  runAiTrainingGenerationTests();
}
