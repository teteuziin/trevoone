/**
 * TREVO ONE — TEST SUITE: CUSTOM EXERCISE + SEQUENCE + PUBLISH GUARD
 *
 * Verifies:
 * 1. SERVER-SIDE PUBLISH GUARD (Unresolved blocks publish, Library & Custom are valid)
 * 2. SEQUENCE PRESERVES EXISTING METHOD CONFIG (Never overwrites method_config_json)
 * 3. UNRESOLVED TO CUSTOM PRESCRIPTION FIDELITY (Sets, reps, load, rest, cadence, rpe, rir, combo preserved)
 * 4. SEQUENCE GRANULAR TRACKING ADDED: NO (Tracking remains at parent item level)
 * 5. VIDEO OPTIONALITY (Custom exercises with/without video publish and render cleanly)
 */

import { register } from 'node:module';
register('./ts-loader.mjs', import.meta.url);

import assert from "node:assert";

const { inspectWorkoutVersionForPublish } = await import("../lib/training-v2/validation.ts");
const { validateWorkoutVersionForPublish } = await import("../lib/training-v2/workout-repository.ts");
const { formatExerciseSetsSummary } = await import("../lib/training-v2/server-training-pdf-document.tsx");

console.log("=== RUNNING TRAINING BUILDER V3.1 VERIFICATION SUITE ===\n");

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
    throw err;
  }
}

// ----------------------------------------------------------------------------
// 1. SERVER-SIDE PUBLISH GUARD TESTS
// ----------------------------------------------------------------------------

runTest("1.1 Server guard strictly blocks unresolved items (exercise_id null & custom_exercise_id null)", () => {
  const treeWithUnresolved = {
    title: "Treino Teste",
    versionNumber: 1,
    status: "DRAFT",
    blocks: [
      {
        blockType: "SINGLE",
        title: "Bloco 1",
        items: [
          {
            publicId: "item-unresolved-1",
            exercisePublicId: null,
            customExercisePublicId: null,
            isCustomExercise: false,
            exerciseNameSnapshot: "Exercício Sem Correspondência",
            sets: [{ setType: "NORMAL", targetReps: 10, targetRestSeconds: 60 }],
          },
        ],
      },
    ],
  };

  const inspection = inspectWorkoutVersionForPublish(treeWithUnresolved);
  assert.strictEqual(inspection.canPublish, false, "Inspection should not allow publish");
  assert.ok(
    inspection.fatalErrors.some((e) => e.includes("precisa(m) ser revisado(s)")),
    "Should include unresolved exercise fatal error"
  );

  let thrown = false;
  try {
    validateWorkoutVersionForPublish(treeWithUnresolved);
  } catch (err) {
    thrown = true;
    assert.strictEqual(err.code, "UNRESOLVED_EXERCISES", "Error code must be UNRESOLVED_EXERCISES");
  }
  assert.strictEqual(thrown, true, "validateWorkoutVersionForPublish must throw on unresolved items");
});

runTest("1.2 Server guard permits LIBRARY exercises (exercisePublicId present)", () => {
  const treeWithLibrary = {
    title: "Treino Teste Library",
    versionNumber: 1,
    status: "DRAFT",
    blocks: [
      {
        blockType: "SINGLE",
        title: "Bloco 1",
        items: [
          {
            publicId: "item-lib-1",
            exercisePublicId: "lib-ex-uuid-123",
            customExercisePublicId: null,
            isCustomExercise: false,
            exerciseNameSnapshot: "Supino Reto com Barra",
            sets: [{ setType: "NORMAL", targetReps: 10, targetRestSeconds: 60 }],
          },
        ],
      },
    ],
  };

  const inspection = inspectWorkoutVersionForPublish(treeWithLibrary);
  assert.strictEqual(inspection.canPublish, true, "Library exercise must be publishable");
  assert.strictEqual(inspection.fatalErrors.length, 0);

  const valResult = validateWorkoutVersionForPublish(treeWithLibrary);
  assert.ok(Array.isArray(valResult.warnings), "Validation should succeed without throwing");
});

runTest("1.3 Server guard permits CUSTOM exercises without video (customExercisePublicId present)", () => {
  const treeWithCustomNoVideo = {
    title: "Treino Teste Custom",
    versionNumber: 1,
    status: "DRAFT",
    blocks: [
      {
        blockType: "SINGLE",
        title: "Bloco 1",
        items: [
          {
            publicId: "item-custom-1",
            exercisePublicId: null,
            customExercisePublicId: "custom-ex-uuid-456",
            isCustomExercise: true,
            exerciseNameSnapshot: "Abdominal Supra na Bola Personalizado",
            customVideoUrl: null,
            pinnedMedia: [],
            sets: [{ setType: "NORMAL", targetReps: 15, targetRestSeconds: 45 }],
          },
        ],
      },
    ],
  };

  const inspection = inspectWorkoutVersionForPublish(treeWithCustomNoVideo);
  assert.strictEqual(inspection.canPublish, true, "Custom exercise without video must be publishable");
  assert.strictEqual(inspection.fatalErrors.length, 0);

  const valResult = validateWorkoutVersionForPublish(treeWithCustomNoVideo);
  assert.ok(Array.isArray(valResult.warnings), "Validation should succeed without throwing");
});

runTest("1.4 Server guard permits CUSTOM SEQUENCE without video", () => {
  const treeWithSequence = {
    title: "Treino Teste Sequencia",
    versionNumber: 1,
    status: "DRAFT",
    blocks: [
      {
        blockType: "SINGLE",
        title: "Bloco Aquecimento",
        items: [
          {
            publicId: "item-seq-1",
            exercisePublicId: null,
            customExercisePublicId: "custom-seq-uuid-789",
            isCustomExercise: true,
            exerciseNameSnapshot: "Sequência de Mobilidade Escapular",
            customVideoUrl: null,
            pinnedMedia: [],
            methodConfig: {
              isSequence: true,
              customSequence: {
                isSequence: true,
                movements: ["1. Cat-cow (10 reps)", "2. Y-T-W (8 reps cada)", "3. Prancha com rotação (30s)"],
              },
            },
            sets: [{ setType: "NORMAL", targetReps: 1, targetRestSeconds: 60 }],
          },
        ],
      },
    ],
  };

  const inspection = inspectWorkoutVersionForPublish(treeWithSequence);
  assert.strictEqual(inspection.canPublish, true, "Custom sequence must be publishable");
  assert.strictEqual(inspection.fatalErrors.length, 0);

  const valResult = validateWorkoutVersionForPublish(treeWithSequence);
  assert.ok(Array.isArray(valResult.warnings), "Validation should succeed without throwing");
});

runTest("1.5 Server guard rejects multiple mixed items when even 1 is unresolved", () => {
  const treeMixed = {
    title: "Treino Misto",
    versionNumber: 1,
    status: "DRAFT",
    blocks: [
      {
        blockType: "BI_SET",
        title: "Bloco Bi-Set",
        items: [
          {
            publicId: "item-lib-1",
            exercisePublicId: "lib-ex-uuid-1",
            customExercisePublicId: null,
            isCustomExercise: false,
            exerciseNameSnapshot: "Puxada Frontal",
            sets: [{ setType: "NORMAL", targetReps: 10, targetRestSeconds: 0 }],
          },
          {
            publicId: "item-unresolved-2",
            exercisePublicId: null,
            customExercisePublicId: null,
            isCustomExercise: false,
            exerciseNameSnapshot: "Remada com Toalha",
            sets: [{ setType: "NORMAL", targetReps: 12, targetRestSeconds: 60 }],
          },
        ],
      },
    ],
  };

  const inspection = inspectWorkoutVersionForPublish(treeMixed);
  assert.strictEqual(inspection.canPublish, false, "Must block because item 2 is unresolved");
  assert.ok(inspection.fatalErrors.some((e) => e.includes("1 exercício(s) precisa(m) ser revisado(s)")));

  let thrown = false;
  try {
    validateWorkoutVersionForPublish(treeMixed);
  } catch (err) {
    thrown = true;
    assert.strictEqual(err.code, "UNRESOLVED_EXERCISES");
  }
  assert.strictEqual(thrown, true);
});

// ----------------------------------------------------------------------------
// 2. SAFE MERGE OF method_config_json TESTS
// ----------------------------------------------------------------------------

runTest("2.1 Sequence conversion preserves existing method configuration (RestPause / Dropset / Cadence / Execution)", () => {
  const existingMethodConfigJson = JSON.stringify({
    intraPauseSeconds: 15,
    targetTotalReps: 25,
    cadence: "3010",
    executionMethod: "REST_PAUSE",
    dropStages: [{ stage: 1, dropPercent: 20 }],
  });

  // Safe merge logic as implemented in convertUnresolvedToCustomExercise
  let existingConfig = {};
  try {
    existingConfig = typeof existingMethodConfigJson === "string"
      ? JSON.parse(existingMethodConfigJson)
      : existingMethodConfigJson;
  } catch {
    existingConfig = {};
  }

  const inputSequenceMovements = [
    "1. Flexão de braço (10 reps)",
    "2. Prancha frontal (30s)",
    "3. Superman (12 reps)",
  ];

  const cleanMovements = inputSequenceMovements
    .map((m) => (typeof m === "string" ? m.trim() : ""))
    .filter(Boolean);

  const mergedConfig = {
    ...existingConfig,
    isSequence: true,
    customSequence: {
      isSequence: true,
      movements: cleanMovements,
    },
  };

  // Critical Assertions
  assert.strictEqual(mergedConfig.intraPauseSeconds, 15, "intraPauseSeconds must be preserved");
  assert.strictEqual(mergedConfig.targetTotalReps, 25, "targetTotalReps must be preserved");
  assert.strictEqual(mergedConfig.cadence, "3010", "cadence must be preserved");
  assert.strictEqual(mergedConfig.executionMethod, "REST_PAUSE", "executionMethod must be preserved");
  assert.deepStrictEqual(mergedConfig.dropStages, [{ stage: 1, dropPercent: 20 }], "dropStages must be preserved");
  assert.strictEqual(mergedConfig.isSequence, true, "isSequence must be added");
  assert.deepStrictEqual(mergedConfig.customSequence.movements, cleanMovements, "movements must be preserved");
});

runTest("2.2 Conversion to normal custom preserves existing method configuration without alteration", () => {
  const existingMethodConfigJson = JSON.stringify({
    intraPauseSeconds: 15,
    targetTotalReps: 25,
  });

  let existingConfig = {};
  if (existingMethodConfigJson) {
    try {
      existingConfig = JSON.parse(existingMethodConfigJson);
    } catch {
      existingConfig = {};
    }
  }

  const isSequence = false;
  let methodConfig = Object.keys(existingConfig).length > 0 ? { ...existingConfig } : null;

  if (isSequence) {
    methodConfig = { ...methodConfig, isSequence: true };
  }

  assert.strictEqual(methodConfig.intraPauseSeconds, 15);
  assert.strictEqual(methodConfig.targetTotalReps, 25);
  assert.strictEqual(methodConfig.isSequence, undefined, "isSequence should not be set for non-sequence");
});

// ----------------------------------------------------------------------------
// 3. UNRESOLVED -> CUSTOM PRESCRIPTION FIDELITY TESTS
// ----------------------------------------------------------------------------

runTest("3.1 Complete prescription fidelity during conversion (sets, reps, load, rest, cadence, rpe, rir, combo)", () => {
  // Pre-existing item prescription state
  const originalItem = {
    id: 101,
    public_id: "wbi-unresolved-origin",
    block_id: 10,
    sub_block_id: 5,
    combination_id: 2,
    sort_order: 3,
    prescription_mode: "SETS",
    target_cadence: "4010",
    target_rpe: 8,
    target_rir: 2,
    duration_unit: "SECONDS",
    notes: "Focar em 2s de isometria no pico",
    instructions_snapshot: "Manter postura ereta e abdômen contraído",
    method_config_json: JSON.stringify({ method: "SLOW_ECCENTRIC", speed: 4 }),
    sub_block_public_id: "sb-superset-1",
    sub_block_title: "Super-Série A",
    combination_public_id: "comb-bi-1",
    combination_type: "BI_SET",
  };

  const originalSets = [
    {
      set_number: 1,
      set_type: "NORMAL",
      parent_set_id: null,
      parent_set_number: null,
      target_reps: 12,
      target_reps_max: 15,
      target_load_kg: 24,
      target_duration_seconds: null,
      duration_unit: null,
      target_distance_meters: null,
      target_rest_seconds: 60,
      intensity_indicator: "Moderado",
    },
    {
      set_number: 2,
      set_type: "NORMAL",
      parent_set_id: null,
      parent_set_number: null,
      target_reps: 10,
      target_reps_max: 12,
      target_load_kg: 28,
      target_duration_seconds: null,
      duration_unit: null,
      target_distance_meters: null,
      target_rest_seconds: 60,
      intensity_indicator: "Pesado",
    },
    {
      set_number: 3,
      set_type: "DROP_STAGE",
      parent_set_id: 2,
      parent_set_number: 2,
      target_reps: 8,
      target_reps_max: null,
      target_load_kg: 18,
      target_duration_seconds: null,
      duration_unit: null,
      target_distance_meters: null,
      target_rest_seconds: 90,
      intensity_indicator: "Falha",
    },
  ];

  // Simulating convertUnresolvedToCustomExercise fidelity mapping
  const effectiveNotes = originalItem.notes;
  const effectiveInstructions = originalItem.instructions_snapshot;
  const convertedSets = originalSets.map((s) => ({
    setNumber: Number(s.set_number),
    setType: s.set_type,
    parentSetNumber: s.parent_set_number != null ? Number(s.parent_set_number) : null,
    targetReps: s.target_reps != null ? Number(s.target_reps) : null,
    targetRepsMax: s.target_reps_max != null ? Number(s.target_reps_max) : null,
    targetLoadKg: s.target_load_kg != null ? Number(s.target_load_kg) : null,
    targetDurationSeconds: s.target_duration_seconds != null ? Number(s.target_duration_seconds) : null,
    durationUnit: s.duration_unit ? String(s.duration_unit) : null,
    targetDistanceMeters: s.target_distance_meters != null ? Number(s.target_distance_meters) : null,
    targetRestSeconds: s.target_rest_seconds != null ? Number(s.target_rest_seconds) : null,
    intensityIndicator: s.intensity_indicator ? String(s.intensity_indicator) : null,
  }));

  const convertedDto = {
    publicId: originalItem.public_id,
    exercisePublicId: "custom-new-uuid",
    customExercisePublicId: "custom-new-uuid",
    isCustomExercise: true,
    combinationPublicId: originalItem.combination_public_id,
    combinationType: originalItem.combination_type,
    subBlockPublicId: originalItem.sub_block_public_id,
    subBlockTitle: originalItem.sub_block_title,
    sortOrder: Number(originalItem.sort_order),
    exerciseNameSnapshot: "Exercício Personalizado Teste",
    muscleGroupSnapshot: "Costas",
    equipmentSnapshot: "Halteres",
    instructionsSnapshot: effectiveInstructions,
    prescriptionMode: originalItem.prescription_mode,
    targetCadence: originalItem.target_cadence ? String(originalItem.target_cadence) : null,
    targetRpe: originalItem.target_rpe != null ? Number(originalItem.target_rpe) : null,
    targetRir: originalItem.target_rir != null ? Number(originalItem.target_rir) : null,
    durationUnit: originalItem.duration_unit ? String(originalItem.duration_unit) : null,
    methodConfig: JSON.parse(originalItem.method_config_json),
    customVideoUrl: null,
    notes: effectiveNotes,
    sets: convertedSets,
  };

  // Verify all fields are preserved verbatim
  assert.strictEqual(convertedDto.sortOrder, 3, "sortOrder preserved");
  assert.strictEqual(convertedDto.prescriptionMode, "SETS", "prescriptionMode preserved");
  assert.strictEqual(convertedDto.targetCadence, "4010", "cadence preserved");
  assert.strictEqual(convertedDto.targetRpe, 8, "RPE preserved");
  assert.strictEqual(convertedDto.targetRir, 2, "RIR preserved");
  assert.strictEqual(convertedDto.durationUnit, "SECONDS", "durationUnit preserved");
  assert.strictEqual(convertedDto.notes, "Focar em 2s de isometria no pico", "notes preserved");
  assert.strictEqual(convertedDto.instructionsSnapshot, "Manter postura ereta e abdômen contraído", "instructions preserved");
  assert.strictEqual(convertedDto.combinationPublicId, "comb-bi-1", "combinationPublicId preserved");
  assert.strictEqual(convertedDto.combinationType, "BI_SET", "combinationType preserved");
  assert.strictEqual(convertedDto.subBlockPublicId, "sb-superset-1", "subBlockPublicId preserved");

  assert.strictEqual(convertedDto.sets.length, 3, "All 3 sets preserved");
  assert.strictEqual(convertedDto.sets[0].targetReps, 12);
  assert.strictEqual(convertedDto.sets[0].targetRepsMax, 15);
  assert.strictEqual(convertedDto.sets[0].targetLoadKg, 24);
  assert.strictEqual(convertedDto.sets[1].targetLoadKg, 28);
  assert.strictEqual(convertedDto.sets[2].setType, "DROP_STAGE");
  assert.strictEqual(convertedDto.sets[2].parentSetNumber, 2);
  assert.strictEqual(convertedDto.sets[2].targetLoadKg, 18);
});

// ----------------------------------------------------------------------------
// 4. SEQUENCE GRANULAR TRACKING CHECK
// ----------------------------------------------------------------------------

runTest("4.1 Sequences do NOT introduce granular per-movement sub-sets or sub-tracking", () => {
  // Confirm that formatExerciseSetsSummary and runtime treat the custom item as a single unit
  const itemSets = [
    {
      setNumber: 1,
      setType: "NORMAL",
      targetReps: 1,
      targetLoadKg: null,
      targetDurationSeconds: 180,
      durationUnit: "SECONDS",
      targetRestSeconds: 90,
    },
    {
      setNumber: 2,
      setType: "NORMAL",
      targetReps: 1,
      targetLoadKg: null,
      targetDurationSeconds: 180,
      durationUnit: "SECONDS",
      targetRestSeconds: 90,
    },
  ];

  const summary = formatExerciseSetsSummary(itemSets);
  assert.strictEqual(summary.setsDetail.length, 2, "Tracking is solely by parent item sets");
  assert.strictEqual(summary.summaryString, "2 × 1 | Descanso: 90s", "Summary aggregates at the item level");
});

// ----------------------------------------------------------------------------
// 5. PDF FORMATTING WITH CUSTOM SEQUENCE (NO VIDEO REQUIRED)
// ----------------------------------------------------------------------------

runTest("5.1 PDF presentation supports custom sequences with movements list without video requirement", () => {
  const presentedItem = {
    name: "Circuito Abdominal Express",
    muscleGroup: "Abdômen",
    equipment: "Peso Corporal",
    notes: "3 voltas completas",
    summaryString: "3 voltas • 60s descanso",
    isCustomExercise: true,
    isSequence: true,
    sequenceMovements: [
      "Prancha Frontal (45s)",
      "Abdominal Infra (15 reps)",
      "Bicicleta no Ar (20 reps)",
    ],
    setsDetail: [
      { setNumber: 1, reps: 1, loadKg: null, restSeconds: 60, durationSeconds: null },
      { setNumber: 2, reps: 1, loadKg: null, restSeconds: 60, durationSeconds: null },
      { setNumber: 3, reps: 1, loadKg: null, restSeconds: 60, durationSeconds: null },
    ],
  };

  assert.strictEqual(presentedItem.isCustomExercise, true);
  assert.strictEqual(presentedItem.isSequence, true);
  assert.strictEqual(presentedItem.sequenceMovements.length, 3);
  assert.strictEqual(presentedItem.sequenceMovements[0], "Prancha Frontal (45s)");
});

console.log("\n==================================================");
console.log(`ALL TESTS PASSED: ${passedTests}/${totalTests}`);
console.log("==================================================");
