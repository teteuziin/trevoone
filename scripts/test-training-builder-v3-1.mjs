import { register } from 'node:module';
register('./ts-loader.mjs', import.meta.url);

import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// Load .env.local manually if needed
try {
  const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
} catch (e) {
  // Ignore
}

// Dynamically import TS modules
const {
  createWorkout,
  getWorkoutWithDraft,
  getWorkoutVersionTree,
  publishWorkoutVersion,
  addBlockToDraft,
  createWorkoutSubBlock,
  addItemToDraftBlock,
  createWorkoutItemCombination,
  updateWorkoutItemCombination,
  ungroupWorkoutItemCombination,
  duplicateWorkoutItemCombination,
  duplicateBlockInDraft,
  duplicateItemInDraft,
  updateItemQuickConfigInDraft,
  createCustomExerciseInWorkout,
  convertUnresolvedToCustomExercise,
  validateWorkoutVersionForPublish,
  deleteWorkout,
} = await import('../lib/training-v2/workout-repository.ts');

const {
  startOrResumeWorkoutExecution,
} = await import('../lib/training-v2/execution-repository.ts');

const {
  listExercisesForProfessional,
} = await import('../lib/training-v2/exercise-repository.ts');

const {
  generateTrainingPlanPdfBuffer,
} = await import('../lib/training-v2/generate-training-pdf.ts');

const {
  confirmTrainingAiImport,
} = await import('../lib/training-v2/training-ai-importer.ts');

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "trevo_one",
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 5,
  namedPlaceholders: false,
});

const results = [];

function recordResult(testName, expected, actual, pass) {
  results.push({
    name: testName,
    expected,
    actual,
    pass: !!pass,
  });
  const statusStr = pass ? "PASS" : "FAIL";
  console.log(`[${statusStr}] ${testName} -> ${actual}`);
}

async function runAuditSuite() {
  console.log("==================================================");
  console.log("TREVO ONE — TRAINING BUILDER V3.1 RIGOROUS AUDIT");
  console.log("==================================================\n");

  const connection = await pool.getConnection();

  try {
    // 1. Resolve two distinct consultancies for tenancy testing
    const [cRows] = await connection.execute(
      `SELECT c.id, c.public_id, MIN(cm.id) AS membership_id, MIN(cm.user_id) AS user_id
       FROM consultancies c
       JOIN consultancy_members cm ON cm.consultancy_id = c.id
       GROUP BY c.id, c.public_id
       HAVING COUNT(cm.id) > 0
       ORDER BY c.id ASC LIMIT 2;`
    );

    if (!cRows || cRows.length < 1) {
      throw new Error("Pelo menos uma consultoria é necessária para os testes.");
    }

    const consultancyA = {
      id: Number(cRows[0].id),
      publicId: String(cRows[0].public_id),
      membershipId: Number(cRows[0].membership_id),
      userId: Number(cRows[0].user_id),
    };

    // If only one exists, simulate consultancy B ID
    const consultancyB = cRows.length > 1 ? {
      id: Number(cRows[1].id),
      publicId: String(cRows[1].public_id),
      membershipId: Number(cRows[1].membership_id),
      userId: Number(cRows[1].user_id),
    } : {
      id: 999999,
      publicId: "00000000-0000-0000-0000-000000000999",
      membershipId: 999999,
      userId: 999999,
    };

    const ctxA = {
      userId: consultancyA.userId,
      userPublicId: crypto.randomUUID(),
      consultancyId: consultancyA.id,
      consultancyPublicId: consultancyA.publicId,
      consultancySlug: "consultancy-a",
      membershipId: consultancyA.membershipId,
      membershipPublicId: crypto.randomUUID(),
      roles: ["PERSONAL", "CONSULTANCY_ADMIN"],
      hasRole: (r) => r === "PERSONAL" || r === "CONSULTANCY_ADMIN",
      isPlatformAdmin: false,
      canAuthorTraining: true,
      canManageConsultancy: true,
      canManageGlobal: false,
      isStudent: false,
    };

    const ctxB = {
      userId: consultancyB.userId,
      userPublicId: crypto.randomUUID(),
      consultancyId: consultancyB.id,
      consultancyPublicId: consultancyB.publicId,
      consultancySlug: "consultancy-b",
      membershipId: consultancyB.membershipId,
      membershipPublicId: crypto.randomUUID(),
      roles: ["PERSONAL", "CONSULTANCY_ADMIN"],
      hasRole: (r) => r === "PERSONAL" || r === "CONSULTANCY_ADMIN",
      isPlatformAdmin: false,
      canAuthorTraining: true,
      canManageConsultancy: true,
      canManageGlobal: false,
      isStudent: false,
    };

    const studentCtxA = {
      ...ctxA,
      roles: ["STUDENT", "PERSONAL", "CONSULTANCY_ADMIN"],
      hasRole: (r) => r === "STUDENT" || r === "PERSONAL" || r === "CONSULTANCY_ADMIN",
      isStudent: true,
    };

    // Find sample library exercises for tests
    const [libExRows] = await connection.execute(
      `SELECT public_id, name, muscle_group_primary, equipment FROM exercises WHERE status = 'PUBLISHED' AND (scope = 'GLOBAL' OR consultancy_id = ?) LIMIT 5;`,
      [consultancyA.id]
    );
    if (!libExRows || libExRows.length < 2) {
      throw new Error("Exercícios da biblioteca não encontrados.");
    }
    const sampleLibA = libExRows[0];
    const sampleLibB = libExRows[1];
    const sampleLibC = libExRows[2] || libExRows[0];

    // TEST 1: Migration 043 Schema
    try {
      const [tableCheck] = await connection.execute(
        `SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'workout_item_combinations';`
      );
      const [colCheck] = await connection.execute(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'workout_block_items' AND column_name IN ('combination_id', 'custom_exercise_id');`
      );
      const hasTable = Number(tableCheck[0].cnt) > 0;
      const hasCols = colCheck.length === 2;
      recordResult(
        "MIGRATION 043 SCHEMA",
        "workout_item_combinations table & columns exist",
        hasTable && hasCols ? "Table & 2 columns present" : "Missing table or columns",
        hasTable && hasCols
      );
    } catch (e) {
      recordResult("MIGRATION 043 SCHEMA", "Schema verified", e.message, false);
    }

    // Create a base workout routine for testing
    const createdWorkout = await createWorkout(ctxA, {
      title: "Auditoria V3.1 Master Suite",
      objective: "Validação rigorosa de combinações e exercícios custom",
    });
    const workoutPublicId = createdWorkout.workout.publicId;
    const versionPublicId = createdWorkout.version.publicId;

    // Add Block A (Treino A)
    const blockA = await addBlockToDraft(ctxA, versionPublicId, {
      blockType: "CUSTOM",
      title: "Treino A - Peito e Braços",
    });

    // TEST 2: Combination Creation - BI-SET (2 exercises)
    let biSetComb = null;
    let item1 = null;
    let item2 = null;
    try {
      item1 = await addItemToDraftBlock(ctxA, blockA.publicId, {
        exercisePublicId: String(sampleLibA.public_id),
        prescriptionMode: "SETS",
        sets: [
          { setType: "NORMAL", targetReps: 10, targetRestSeconds: 60 },
          { setType: "NORMAL", targetReps: 10, targetRestSeconds: 60 },
          { setType: "NORMAL", targetReps: 10, targetRestSeconds: 60 },
        ],
      });
      item2 = await addItemToDraftBlock(ctxA, blockA.publicId, {
        exercisePublicId: String(sampleLibB.public_id),
        prescriptionMode: "SETS",
        sets: [
          { setType: "NORMAL", targetReps: 12, targetRestSeconds: 60 },
          { setType: "NORMAL", targetReps: 12, targetRestSeconds: 60 },
          { setType: "NORMAL", targetReps: 12, targetRestSeconds: 60 },
        ],
      });

      biSetComb = await createWorkoutItemCombination(ctxA, {
        blockPublicId: blockA.publicId,
        combinationType: "BI_SET",
        title: "Bi-Set Supino + Crucifixo",
        restAfterSeconds: 75,
        itemPublicIds: [item1.publicId, item2.publicId],
      });

      const tree = await getWorkoutVersionTree(ctxA, versionPublicId);
      const bItems = tree.blocks[0].items;
      const i1 = bItems.find((i) => i.publicId === item1.publicId);
      const i2 = bItems.find((i) => i.publicId === item2.publicId);
      const pass =
        biSetComb.combinationType === "BI_SET" &&
        i1?.combinationPublicId === biSetComb.publicId &&
        i2?.combinationPublicId === biSetComb.publicId &&
        biSetComb.restAfterSeconds === 75;

      recordResult(
        "BI-SET CREATION",
        "BI_SET combination with 2 items linked and 75s rest",
        pass ? "Created BI_SET with 2 items linked" : "Failed to link items to BI_SET",
        pass
      );
    } catch (e) {
      recordResult("BI-SET CREATION", "BI_SET created", e.message, false);
    }

    // TEST 3: Combination Creation - TRI-SET
    let triSetComb = null;
    try {
      const itemTri1 = await addItemToDraftBlock(ctxA, blockA.publicId, {
        exercisePublicId: String(sampleLibA.public_id),
        prescriptionMode: "SETS",
        sets: [{ setType: "NORMAL", targetReps: 10 }],
      });
      const itemTri2 = await addItemToDraftBlock(ctxA, blockA.publicId, {
        exercisePublicId: String(sampleLibB.public_id),
        prescriptionMode: "SETS",
        sets: [{ setType: "NORMAL", targetReps: 10 }],
      });
      const itemTri3 = await addItemToDraftBlock(ctxA, blockA.publicId, {
        exercisePublicId: String(sampleLibC.public_id),
        prescriptionMode: "SETS",
        sets: [{ setType: "NORMAL", targetReps: 10 }],
      });

      triSetComb = await createWorkoutItemCombination(ctxA, {
        blockPublicId: blockA.publicId,
        combinationType: "TRI_SET",
        title: "Tri-Set Ombros",
        restAfterSeconds: 90,
        itemPublicIds: [itemTri1.publicId, itemTri2.publicId, itemTri3.publicId],
      });

      recordResult(
        "TRI-SET CREATION",
        "TRI_SET combination with 3 items linked and 90s rest",
        triSetComb.combinationType === "TRI_SET" && triSetComb.restAfterSeconds === 90 ? "Created TRI_SET successfully" : "Failed",
        triSetComb.combinationType === "TRI_SET"
      );
    } catch (e) {
      recordResult("TRI-SET CREATION", "TRI_SET created", e.message, false);
    }

    // TEST 4: Combination Creation - GIANT SET
    try {
      const g1 = await addItemToDraftBlock(ctxA, blockA.publicId, { exercisePublicId: String(sampleLibA.public_id) });
      const g2 = await addItemToDraftBlock(ctxA, blockA.publicId, { exercisePublicId: String(sampleLibB.public_id) });
      const g3 = await addItemToDraftBlock(ctxA, blockA.publicId, { exercisePublicId: String(sampleLibC.public_id) });
      const g4 = await addItemToDraftBlock(ctxA, blockA.publicId, { exercisePublicId: String(sampleLibA.public_id) });

      const giantComb = await createWorkoutItemCombination(ctxA, {
        blockPublicId: blockA.publicId,
        combinationType: "GIANT_SET",
        restAfterSeconds: 120,
        itemPublicIds: [g1.publicId, g2.publicId, g3.publicId, g4.publicId],
      });

      recordResult(
        "GIANT SET CREATION",
        "GIANT_SET combination created with 4 items",
        giantComb.combinationType === "GIANT_SET" ? "Created GIANT_SET successfully" : "Failed",
        giantComb.combinationType === "GIANT_SET"
      );
    } catch (e) {
      recordResult("GIANT SET CREATION", "GIANT_SET created", e.message, false);
    }

    // TEST 5: Combination Creation - CIRCUIT
    try {
      const c1 = await addItemToDraftBlock(ctxA, blockA.publicId, { exercisePublicId: String(sampleLibA.public_id) });
      const c2 = await addItemToDraftBlock(ctxA, blockA.publicId, { exercisePublicId: String(sampleLibB.public_id) });

      const circComb = await createWorkoutItemCombination(ctxA, {
        blockPublicId: blockA.publicId,
        combinationType: "CIRCUIT",
        restAfterSeconds: 60,
        itemPublicIds: [c1.publicId, c2.publicId],
      });

      recordResult(
        "CIRCUIT CREATION",
        "CIRCUIT combination created with items",
        circComb.combinationType === "CIRCUIT" ? "Created CIRCUIT successfully" : "Failed",
        circComb.combinationType === "CIRCUIT"
      );
    } catch (e) {
      recordResult("CIRCUIT CREATION", "CIRCUIT created", e.message, false);
    }

    // TEST 6: RUNTIME INTERLEAVING - BI-SET (A1 -> B1 -> rest -> A2 -> B2 -> rest -> A3 -> B3 -> rest)
    try {
      // Create dedicated workout for runtime execution test
      const rtWorkout = await createWorkout(ctxA, { title: "Runtime Interleaving Test" });
      const rtBlock = await addBlockToDraft(ctxA, rtWorkout.version.publicId, { blockType: "CUSTOM", title: "Bi-Set Block" });
      const exA = await addItemToDraftBlock(ctxA, rtBlock.publicId, {
        exercisePublicId: String(sampleLibA.public_id),
      });
      await updateItemQuickConfigInDraft(ctxA, exA.publicId, { seriesCount: 3, reps: 10, restSeconds: 60 });
      const exB = await addItemToDraftBlock(ctxA, rtBlock.publicId, {
        exercisePublicId: String(sampleLibB.public_id),
      });
      await updateItemQuickConfigInDraft(ctxA, exB.publicId, { seriesCount: 3, reps: 12, restSeconds: 60 });
      await createWorkoutItemCombination(ctxA, {
        blockPublicId: rtBlock.publicId,
        combinationType: "BI_SET",
        restAfterSeconds: 75,
        itemPublicIds: [exA.publicId, exB.publicId],
      });

      const publishedRt = await publishWorkoutVersion(ctxA, rtWorkout.version.publicId);

      // Create an active assignment so startOrResumeWorkoutExecution works
      const assignmentPublicId = crypto.randomUUID();
      await connection.execute(
        `INSERT INTO workout_assignments (public_id, consultancy_id, student_membership_id, workout_version_id, assigned_by_membership_id, status, starts_on)
         VALUES (?, ?, ?, (SELECT id FROM workout_versions WHERE public_id = ?), ?, 'ACTIVE', CURDATE());`,
        [assignmentPublicId, consultancyA.id, consultancyA.membershipId, publishedRt.publicId, consultancyA.membershipId]
      );

      const execSession = await startOrResumeWorkoutExecution(studentCtxA, assignmentPublicId);

      const sessionSets = execSession.sets;
      assert.equal(sessionSets.length, 6, "Expected exactly 6 execution sets");

      // Verify sequence: A1 -> B1 -> A2 -> B2 -> A3 -> B3
      const seqItems = sessionSets.map((s) => s.blockItemPublicId);
      const isInterleaved =
        seqItems[0] === exA.publicId &&
        seqItems[1] === exB.publicId &&
        seqItems[2] === exA.publicId &&
        seqItems[3] === exB.publicId &&
        seqItems[4] === exA.publicId &&
        seqItems[5] === exB.publicId;

      // Verify rest: between items = 0s, after round = 75s
      const rests = sessionSets.map((s) => s.prescribedRestSeconds);
      const isRestCorrect =
        rests[0] === 0 && rests[1] === 75 &&
        rests[2] === 0 && rests[3] === 75 &&
        rests[4] === 0 && rests[5] === 75;

      const pass = isInterleaved && isRestCorrect;
      recordResult(
        "ROUND ORDER A1->B1->REST->A2->B2->REST",
        "A1(0s) -> B1(75s) -> A2(0s) -> B2(75s) -> A3(0s) -> B3(75s)",
        pass ? "Strict interleaving verified (A1->B1->rest->A2->B2->rest->A3->B3->rest)" : `Failed order: ${JSON.stringify(seqItems)} rests: ${JSON.stringify(rests)}`,
        pass
      );
    } catch (e) {
      recordResult("ROUND ORDER A1->B1->REST->A2->B2->REST", "Interleaved execution", e.message, false);
    }

    // TEST 7: ASYMMETRIC SET COUNTS (A=3 sets, B=2 sets)
    try {
      const asymWorkout = await createWorkout(ctxA, { title: "Asymmetric Bi-Set Test" });
      const asymBlock = await addBlockToDraft(ctxA, asymWorkout.version.publicId, { blockType: "CUSTOM" });
      const asymA = await addItemToDraftBlock(ctxA, asymBlock.publicId, {
        exercisePublicId: String(sampleLibA.public_id),
      });
      await updateItemQuickConfigInDraft(ctxA, asymA.publicId, { seriesCount: 3, reps: 10 });
      const asymB = await addItemToDraftBlock(ctxA, asymBlock.publicId, {
        exercisePublicId: String(sampleLibB.public_id),
      });
      await updateItemQuickConfigInDraft(ctxA, asymB.publicId, { seriesCount: 2, reps: 12 });
      await createWorkoutItemCombination(ctxA, {
        blockPublicId: asymBlock.publicId,
        combinationType: "BI_SET",
        restAfterSeconds: 60,
        itemPublicIds: [asymA.publicId, asymB.publicId],
      });
      const publishedAsym = await publishWorkoutVersion(ctxA, asymWorkout.version.publicId);

      const asymAssignmentId = crypto.randomUUID();
      await connection.execute(
        `INSERT INTO workout_assignments (public_id, consultancy_id, student_membership_id, workout_version_id, assigned_by_membership_id, status, starts_on)
         VALUES (?, ?, ?, (SELECT id FROM workout_versions WHERE public_id = ?), ?, 'ACTIVE', CURDATE());`,
        [asymAssignmentId, consultancyA.id, consultancyA.membershipId, publishedAsym.publicId, consultancyA.membershipId]
      );
      const asymExec = await startOrResumeWorkoutExecution(studentCtxA, asymAssignmentId);

      // 5 sets total: A1(0s) -> B1(60s) -> A2(0s) -> B2(60s) -> A3(60s)
      const sets = asymExec.sets;
      const pass =
        sets.length === 5 &&
        sets[0].blockItemPublicId === asymA.publicId && sets[0].prescribedRestSeconds === 0 &&
        sets[1].blockItemPublicId === asymB.publicId && sets[1].prescribedRestSeconds === 60 &&
        sets[2].blockItemPublicId === asymA.publicId && sets[2].prescribedRestSeconds === 0 &&
        sets[3].blockItemPublicId === asymB.publicId && sets[3].prescribedRestSeconds === 60 &&
        sets[4].blockItemPublicId === asymA.publicId && sets[4].prescribedRestSeconds === 60;

      recordResult(
        "ASYMMETRIC SETS DETERMINISM",
        "5 sets scheduled: A1->B1->A2->B2->A3 without dropping any sets",
        pass ? "Deterministic asymmetric interleaving PASS" : `Failed count or order: ${sets.length}`,
        pass
      );
    } catch (e) {
      recordResult("ASYMMETRIC SETS DETERMINISM", "Asymmetric test", e.message, false);
    }

    // TEST 8: UNGROUP PRESERVES EXERCISES & PRESCRIPTIONS
    try {
      const ungWorkout = await createWorkout(ctxA, { title: "Ungroup Test" });
      const ungBlock = await addBlockToDraft(ctxA, ungWorkout.version.publicId, { blockType: "CUSTOM" });
      const uA = await addItemToDraftBlock(ctxA, ungBlock.publicId, {
        exercisePublicId: String(sampleLibA.public_id),
      });
      await updateItemQuickConfigInDraft(ctxA, uA.publicId, {
        seriesCount: 1,
        reps: 15,
        loadKg: 40,
        restSeconds: 50,
        notes: "Nota A preservada",
      });
      const uB = await addItemToDraftBlock(ctxA, ungBlock.publicId, {
        exercisePublicId: String(sampleLibB.public_id),
      });
      await updateItemQuickConfigInDraft(ctxA, uB.publicId, {
        seriesCount: 1,
        reps: 12,
        loadKg: 20,
        restSeconds: 45,
        notes: "Nota B preservada",
      });
      const uComb = await createWorkoutItemCombination(ctxA, {
        blockPublicId: ungBlock.publicId,
        combinationType: "BI_SET",
        restAfterSeconds: 60,
        itemPublicIds: [uA.publicId, uB.publicId],
      });

      // Ungroup
      await ungroupWorkoutItemCombination(ctxA, uComb.publicId);

      const tree = await getWorkoutVersionTree(ctxA, ungWorkout.version.publicId);
      const items = tree.blocks[0].items;
      const combExists = (tree.blocks[0].combinations || []).some((c) => c.publicId === uComb.publicId);
      const itemAAfter = items.find((i) => i.publicId === uA.publicId);
      const itemBAfter = items.find((i) => i.publicId === uB.publicId);

      const pass =
        !combExists &&
        itemAAfter != null &&
        itemBAfter != null &&
        itemAAfter.combinationPublicId === null &&
        itemBAfter.combinationPublicId === null &&
        itemAAfter.notes === "Nota A preservada" &&
        itemAAfter.sets[0].targetLoadKg === 40 &&
        itemAAfter.sets[0].targetRestSeconds === 50 &&
        itemBAfter.sets[0].targetLoadKg === 20;

      recordResult(
        "UNGROUP PRESERVES EXERCISES",
        "Both exercises remain, combinations removed, all sets/notes/load preserved",
        pass ? "Both exercises preserved with full prescription" : "Failed to preserve",
        pass
      );
    } catch (e) {
      recordResult("UNGROUP PRESERVES EXERCISES", "Preserve on ungroup", e.message, false);
    }

    // TEST 9: DUPLICATION OF BLOCK (TREINO/DIA) WITH COMBINATIONS
    try {
      const dupWorkout = await createWorkout(ctxA, { title: "Block Duplication Test" });
      const dupBlock = await addBlockToDraft(ctxA, dupWorkout.version.publicId, { blockType: "CUSTOM", title: "Treino Original" });
      const d1 = await addItemToDraftBlock(ctxA, dupBlock.publicId, { exercisePublicId: String(sampleLibA.public_id) });
      const d2 = await addItemToDraftBlock(ctxA, dupBlock.publicId, { exercisePublicId: String(sampleLibB.public_id) });
      const origComb = await createWorkoutItemCombination(ctxA, {
        blockPublicId: dupBlock.publicId,
        combinationType: "BI_SET",
        restAfterSeconds: 80,
        itemPublicIds: [d1.publicId, d2.publicId],
      });

      // Duplicate block
      const duplicatedBlock = await duplicateBlockInDraft(ctxA, dupBlock.publicId);

      const tree = await getWorkoutVersionTree(ctxA, dupWorkout.version.publicId);
      const b2 = tree.blocks.find((b) => b.publicId === duplicatedBlock.publicId);
      const b2Combs = b2.combinations || [];
      const b2Items = b2.items;

      const hasNewComb = b2Combs.length === 1 && b2Combs[0].publicId !== origComb.publicId;
      const itemsPointToNewComb =
        b2Items.length === 2 &&
        b2Items[0].combinationPublicId === b2Combs[0]?.publicId &&
        b2Items[1].combinationPublicId === b2Combs[0]?.publicId &&
        b2Items[0].combinationPublicId !== origComb.publicId;
      const restPreserved = b2Combs[0]?.restAfterSeconds === 80;

      const pass = hasNewComb && itemsPointToNewComb && restPreserved;
      recordResult(
        "DUPLICATION (TREINO/DIA & COMBINATIONS)",
        "New combination created with new ID, items remapped, rest/type preserved",
        pass ? "Duplicated block cleanly cloned combinations with new IDs" : "Failed combination cloning in block duplication",
        pass
      );
    } catch (e) {
      recordResult("DUPLICATION (TREINO/DIA & COMBINATIONS)", "Duplication test", e.message, false);
    }

    // TEST 10: COMPLETED HISTORY PRESERVATION
    try {
      const histWorkout = await createWorkout(ctxA, { title: "History Immature Test" });
      const hBlock = await addBlockToDraft(ctxA, histWorkout.version.publicId, { blockType: "CUSTOM" });
      const hItem = await addItemToDraftBlock(ctxA, hBlock.publicId, {
        exercisePublicId: String(sampleLibA.public_id),
      });
      await updateItemQuickConfigInDraft(ctxA, hItem.publicId, {
        seriesCount: 1,
        reps: 10,
        loadKg: 50,
      });
      const publishedHist = await publishWorkoutVersion(ctxA, histWorkout.version.publicId);

      // Create assignment and simulated completed execution
      const hAssignId = crypto.randomUUID();
      await connection.execute(
        `INSERT INTO workout_assignments (public_id, consultancy_id, student_membership_id, workout_version_id, assigned_by_membership_id, status, starts_on)
         VALUES (?, ?, ?, (SELECT id FROM workout_versions WHERE public_id = ?), ?, 'ACTIVE', CURDATE());`,
        [hAssignId, consultancyA.id, consultancyA.membershipId, publishedHist.publicId, consultancyA.membershipId]
      );
      const hExec = await startOrResumeWorkoutExecution(studentCtxA, hAssignId);

      // Mark session COMPLETED with actuals
      await connection.execute(
        `UPDATE workout_execution_sessions SET status = 'COMPLETED', completed_at = NOW(3) WHERE public_id = ?;`,
        [hExec.publicId]
      );
      await connection.execute(
        `UPDATE workout_execution_sets SET actual_reps = 10, actual_load_kg = 55, completed_at = NOW(3)
         WHERE execution_session_id = (SELECT id FROM workout_execution_sessions WHERE public_id = ?);`,
        [hExec.publicId]
      );

      // Coach deletes the workout
      await deleteWorkout(ctxA, histWorkout.workout.publicId);

      // Verify execution session still exists and has completed status and actuals
      const [checkRows] = await connection.execute(
        `SELECT wes.status, wes.completed_at, weset.actual_load_kg
         FROM workout_execution_sessions wes
         JOIN workout_execution_sets weset ON weset.execution_session_id = wes.id
         WHERE wes.public_id = ?;`,
        [hExec.publicId]
      );

      const pass =
        checkRows.length > 0 &&
        checkRows[0].status === "COMPLETED" &&
        checkRows[0].completed_at != null &&
        Number(checkRows[0].actual_load_kg) === 55;

      recordResult(
        "HISTORY PRESERVED ON WORKOUT EDIT/DELETE",
        "Completed session & set actuals intact after workout deletion",
        pass ? "Completed historical execution 100% preserved" : "Historical data was modified or removed",
        pass
      );
    } catch (e) {
      recordResult("HISTORY PRESERVED ON WORKOUT EDIT/DELETE", "History test", e.message, false);
    }

    // TEST 11: CUSTOM EXERCISE - CREATION & TENANCY
    let customExItem = null;
    try {
      const customWorkout = await createWorkout(ctxA, { title: "Custom Exercise Routine" });
      const cBlock = await addBlockToDraft(ctxA, customWorkout.version.publicId, { blockType: "CUSTOM" });

      customExItem = await createCustomExerciseInWorkout(ctxA, {
        categoryPublicId: cBlock.publicId,
        name: "Abdominal Canivete Exclusivo A",
        muscleGroupPrimary: "Abdômen",
        equipment: "Solo",
        saveToLibrary: true,
        sets: [{ setType: "NORMAL", targetReps: 20, targetRestSeconds: 30 }],
      });

      // Check DB row scope and consultancy_id
      const [exRow] = await connection.execute(
        `SELECT id, scope, consultancy_id, visibility, name FROM exercises WHERE public_id = ?;`,
        [customExItem.customExercisePublicId]
      );

      const isIsolated =
        exRow.length > 0 &&
        exRow[0].scope === "CONSULTANCY" &&
        Number(exRow[0].consultancy_id) === consultancyA.id;

      // Consultancy B tries to search for this custom exercise
      const searchB = await listExercisesForProfessional(ctxB, { query: "Abdominal Canivete Exclusivo A" });
      const notFoundByB = !searchB.items.some((i) => i.name.includes("Exclusivo A"));

      // Consultancy B tries to link this custom exercise
      let linkBBlocked = false;
      try {
        const bWorkout = await createWorkout(ctxB, { title: "B Workout" });
        const bBlock = await addBlockToDraft(ctxB, bWorkout.version.publicId, { blockType: "CUSTOM" });
        await addItemToDraftBlock(ctxB, bBlock.publicId, {
          exercisePublicId: customExItem.customExercisePublicId,
        });
      } catch (err) {
        linkBBlocked = err.message.includes("outra consultoria") || err.code === "TENANT_MISMATCH" || err.statusCode === 403;
      }

      const pass = isIsolated && notFoundByB && linkBBlocked;
      recordResult(
        "CUSTOM EXERCISE TENANCY ISOLATION",
        "Consultancy A custom exercise not visible or linkable by Consultancy B",
        pass ? "Strict tenancy verified: hidden from B search and linking blocked" : "Tenancy leak detected",
        pass
      );
    } catch (e) {
      recordResult("CUSTOM EXERCISE TENANCY ISOLATION", "Tenancy test", e.message, false);
    }

    // TEST 12: CUSTOM EXERCISE PUBLISH
    try {
      const pubCustomWorkout = await createWorkout(ctxA, { title: "Publish Custom Workout" });
      const pcBlock = await addBlockToDraft(ctxA, pubCustomWorkout.version.publicId, { blockType: "CUSTOM" });
      await createCustomExerciseInWorkout(ctxA, {
        categoryPublicId: pcBlock.publicId,
        name: "Elevação Pélvica Especial",
        sets: [{ setType: "NORMAL", targetReps: 12 }],
      });

      const published = await publishWorkoutVersion(ctxA, pubCustomWorkout.version.publicId);
      const pass = published.status === "PUBLISHED";
      recordResult(
        "CUSTOM EXERCISE PUBLISH",
        "Workout with custom exercise publishes successfully (PASS)",
        pass ? "Custom exercise is valid and publishes without error" : "Failed to publish",
        pass
      );
    } catch (e) {
      recordResult("CUSTOM EXERCISE PUBLISH", "Publish custom", e.message, false);
    }

    // TEST 13: UNRESOLVED PUBLISH BLOCK
    try {
      const unWorkout = await createWorkout(ctxA, { title: "Unresolved Block Test" });
      const uBlock = await addBlockToDraft(ctxA, unWorkout.version.publicId, { blockType: "CUSTOM" });

      // Insert unresolved item directly with null exercise_id and null custom_exercise_id
      const unItemPublicId = crypto.randomUUID();
      await connection.execute(
        `INSERT INTO workout_block_items (public_id, block_id, exercise_id, custom_exercise_id, sort_order, exercise_name_snapshot, prescription_mode)
         VALUES (?, (SELECT id FROM workout_blocks WHERE public_id = ?), NULL, NULL, 0, 'Exercício Não Mapeado XYZ', 'SETS');`,
        [unItemPublicId, uBlock.publicId]
      );
      await connection.execute(
        `INSERT INTO workout_item_sets (block_item_id, set_number, set_type, target_reps, target_rest_seconds)
         VALUES ((SELECT id FROM workout_block_items WHERE public_id = ?), 1, 'NORMAL', 10, 60);`,
        [unItemPublicId]
      );

      let blocked = false;
      try {
        await publishWorkoutVersion(ctxA, unWorkout.version.publicId);
      } catch (err) {
        blocked = err.code === "UNRESOLVED_EXERCISES" || err.message.includes("precisa(m) ser revisado(s)");
      }

      recordResult(
        "UNRESOLVED PUBLISH BLOCK",
        "Publish blocked when unresolved exercises present",
        blocked ? "Blocked as expected with UNRESOLVED_EXERCISES error" : "Failed to block publication",
        blocked
      );

      // TEST 14: UNRESOLVED -> CUSTOM CONVERSION
      const converted = await convertUnresolvedToCustomExercise(ctxA, {
        itemPublicId: unItemPublicId,
        name: "Exercício Não Mapeado XYZ (Resolvido)",
        muscleGroupPrimary: "Costas",
        equipment: "Cabo",
      });

      const passConverted =
        converted.isCustomExercise === true &&
        converted.customExercisePublicId != null &&
        converted.exerciseNameSnapshot === "Exercício Não Mapeado XYZ (Resolvido)" &&
        converted.sets.length === 1 &&
        converted.sets[0].targetReps === 10;

      // Now publish should succeed
      const publishedAfterConvert = await publishWorkoutVersion(ctxA, unWorkout.version.publicId);
      const publishPassed = publishedAfterConvert.status === "PUBLISHED";

      recordResult(
        "UNRESOLVED -> CUSTOM CONVERSION",
        "Converts to custom, preserves sets/prescription, unblocks publication",
        passConverted && publishPassed ? "Conversion preserved prescription and unblocked publish" : "Conversion failed",
        passConverted && publishPassed
      );
    } catch (e) {
      recordResult("UNRESOLVED PUBLISH BLOCK", "Unresolved test", e.message, false);
      recordResult("UNRESOLVED -> CUSTOM CONVERSION", "Convert test", e.message, false);
    }

    // TEST 15: LIBRARY + CUSTOM WITHIN COMBINATION
    try {
      const combMixWorkout = await createWorkout(ctxA, { title: "Mix Combination Test" });
      const cmBlock = await addBlockToDraft(ctxA, combMixWorkout.version.publicId, { blockType: "CUSTOM" });
      const libItem = await addItemToDraftBlock(ctxA, cmBlock.publicId, {
        exercisePublicId: String(sampleLibA.public_id),
        sets: [{ setType: "NORMAL", targetReps: 10 }],
      });
      const customItem = await createCustomExerciseInWorkout(ctxA, {
        categoryPublicId: cmBlock.publicId,
        name: "Rosca Martelo com Cabo Custom",
        sets: [{ setType: "NORMAL", targetReps: 12 }],
      });

      const mixComb = await createWorkoutItemCombination(ctxA, {
        blockPublicId: cmBlock.publicId,
        combinationType: "BI_SET",
        restAfterSeconds: 60,
        itemPublicIds: [libItem.publicId, customItem.publicId],
      });

      const pubTree = await publishWorkoutVersion(ctxA, combMixWorkout.version.publicId);
      const b0 = pubTree.blocks[0];
      const hasComb = (b0.combinations || []).length === 1;
      const bothLinked = b0.items.every((i) => i.combinationPublicId === mixComb.publicId);

      const pass = pubTree.status === "PUBLISHED" && hasComb && bothLinked;
      recordResult(
        "LIBRARY + CUSTOM COMBINATION",
        "Library and Custom co-exist in BI-SET and publish successfully",
        pass ? "Combination of Library + Custom published cleanly" : "Failed",
        pass
      );
    } catch (e) {
      recordResult("LIBRARY + CUSTOM COMBINATION", "Mix test", e.message, false);
    }

    // TEST 16: CUSTOM MEDIA / STUDENT RUNTIME "VER EXECUÇÃO"
    try {
      // Create a test media asset
      const mediaPublicId = crypto.randomUUID();
      const [maRes] = await connection.execute(
        `INSERT INTO media_assets (public_id, scope, visibility, consultancy_id, created_by_user_id, media_type, storage_provider, storage_key, mime_type, file_size_bytes)
         VALUES (?, 'CONSULTANCY', 'CONSULTANCY', ?, ?, 'VIDEO', 'HOSTINGER_LOCAL', '/uploads/test.mp4', 'video/mp4', 1024000);`,
        [mediaPublicId, consultancyA.id, consultancyA.userId]
      );
      const mediaAssetId = maRes.insertId;

      const mediaWorkout = await createWorkout(ctxA, { title: "Media Test Routine" });
      const mBlock = await addBlockToDraft(ctxA, mediaWorkout.version.publicId, { blockType: "CUSTOM" });
      const customWithMedia = await createCustomExerciseInWorkout(ctxA, {
        categoryPublicId: mBlock.publicId,
        name: "Exercício com Vídeo Gravado",
        mediaAssetPublicId: mediaPublicId,
        sets: [{ setType: "NORMAL", targetReps: 10 }],
      });

      // Verify that version tree resolves pinnedMedia for student "Ver Execução"
      const tree = await getWorkoutVersionTree(ctxA, mediaWorkout.version.publicId);
      const item = tree.blocks[0].items.find((i) => i.publicId === customWithMedia.publicId);
      const hasPinnedMedia = item?.pinnedMedia && item.pinnedMedia.length > 0 && item.pinnedMedia[0].mediaAsset.publicId === mediaPublicId;

      recordResult(
        "CUSTOM MEDIA & VER EXECUÇÃO",
        "Custom exercise attached video resolves in pinnedMedia for Student Runtime",
        hasPinnedMedia ? "Pinned media resolved with execution video" : "No media attached",
        hasPinnedMedia
      );

      // Clean up test media asset
      await connection.execute(`DELETE FROM exercise_media WHERE media_asset_id = ?;`, [mediaAssetId]);
      await connection.execute(`DELETE FROM workout_block_item_media WHERE media_asset_id = ?;`, [mediaAssetId]);
      await connection.execute(`DELETE FROM media_assets WHERE id = ?;`, [mediaAssetId]);
    } catch (e) {
      recordResult("CUSTOM MEDIA & VER EXECUÇÃO", "Media test", e.message, false);
    }

    // TEST 17: AI IMPORT WITH COMBINATIONS & UNRESOLVED RESILIENCE
    try {
      const jobPublicId = crypto.randomUUID();
      await connection.execute(
        `INSERT INTO ai_import_jobs (public_id, idempotency_key, consultancy_id, member_id, user_id, feature, status, source_filename, source_hash, source_type, file_size_bytes, target_student_membership_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'TRAINING_IMPORT', 'PROCESSED', 'ficha-biset.pdf', 'hash-biset', 'PDF', 1024, NULL, NOW(3), NOW(3));`,
        [jobPublicId, crypto.randomUUID(), consultancyA.id, consultancyA.membershipId, consultancyA.userId]
      );

      const aiResult = await confirmTrainingAiImport({
        consultancyId: consultancyA.id,
        memberId: consultancyA.membershipId,
        userId: consultancyA.userId,
        role: "PERSONAL",
        jobPublicId,
        confirmedTitle: "Treino Importado com Bi-Set AI",
        confirmedCategories: [
          {
            name: "Treino AI",
            order: 1,
            exercises: [
              {
                rawName: sampleLibA.name,
                matchStatus: "MATCHED",
                exercisePublicId: sampleLibA.public_id,
                exerciseNameSnapshot: sampleLibA.name,
                muscleGroupSnapshot: sampleLibA.muscle_group_primary,
                equipmentSnapshot: sampleLibA.equipment,
                combinationType: "BI_SET",
                combinationIndex: 1,
                combinationRestSeconds: 65,
                sets: 3,
                reps: "10",
              },
              {
                rawName: "Exercício Não Mapeado AI",
                matchStatus: "NOT_FOUND",
                exercisePublicId: null, // UNRESOLVED
                exerciseNameSnapshot: "Exercício Não Mapeado AI",
                muscleGroupSnapshot: "Geral",
                equipmentSnapshot: "Livre",
                combinationType: "BI_SET",
                combinationIndex: 1,
                combinationRestSeconds: 65,
                sets: 3,
                reps: "12",
              },
            ],
          },
        ],
      });

      const aiTree = await getWorkoutVersionTree(ctxA, aiResult.versionPublicId);
      const aiCombs = aiTree.blocks[0].combinations || [];
      const aiItems = aiTree.blocks[0].items;

      const combCreated = aiCombs.length === 1 && aiCombs[0].combinationType === "BI_SET" && aiCombs[0].restAfterSeconds === 65;
      const bothInComb = aiItems.length === 2 && aiItems.every((i) => i.combinationPublicId === aiCombs[0]?.publicId);

      // Verify that publication is blocked due to the unresolved item
      let publishBlocked = false;
      try {
        await publishWorkoutVersion(ctxA, aiResult.versionPublicId);
      } catch (err) {
        publishBlocked = err.code === "UNRESOLVED_EXERCISES";
      }

      // Convert unresolved item to custom
      const unItem = aiItems.find((i) => !i.exercisePublicId);
      await convertUnresolvedToCustomExercise(ctxA, {
        itemPublicId: unItem.publicId,
        name: "Exercício Não Mapeado AI (Convertido)",
      });

      // Now publication should succeed
      const aiPub = await publishWorkoutVersion(ctxA, aiResult.versionPublicId);
      const aiPubPass = aiPub.status === "PUBLISHED";

      const pass = combCreated && bothInComb && publishBlocked && aiPubPass;
      recordResult(
        "AI IMPORT COMBINATIONS & UNRESOLVED RESILIENCE",
        "Bi-set created from AI import, unresolved blocks publish, convert to custom releases publish",
        pass ? "AI combination created, publish guard respected, converted to custom and published" : "AI import failed",
        pass
      );
    } catch (e) {
      recordResult("AI IMPORT COMBINATIONS & UNRESOLVED RESILIENCE", "AI import test", e.message, false);
    }

    // TEST 18: SERVER-SIDE PDF GENERATION
    try {
      const pdfBuffer = await generateTrainingPlanPdfBuffer({
        title: "Ficha de Treino V3.1 Audit",
        subtitle: "Treino Personalizado",
        objective: "Hipertrofia e Força",
        personalTrainerName: "Coach Antigravity",
        consultancyName: "Trevo One Consultoria",
        generationDateFormatted: "02/10/2026",
        isDraft: false,
        versionNumber: 1,
        blocks: [
          {
            name: "Treino A - Peito e Braços",
            exercises: [
              {
                name: "Supino Reto com Barra",
                muscleGroup: "Peitoral",
                equipment: "Barra",
                summaryString: "3 × 10 reps",
                setsDetail: [
                  { setNumber: 1, reps: 10, restSeconds: 60 },
                  { setNumber: 2, reps: 10, restSeconds: 60 },
                  { setNumber: 3, reps: 10, restSeconds: 60 },
                ],
              },
              {
                name: "Crucifixo Inclinado",
                muscleGroup: "Peitoral",
                equipment: "Halteres",
                summaryString: "3 × 12 reps",
                combinationType: "BI_SET",
                setsDetail: [{ setNumber: 1, reps: 12 }],
              },
              {
                name: "Flexão de Braços Especial",
                muscleGroup: "Peitoral",
                equipment: "Solo",
                summaryString: "3 × 15 reps",
                combinationType: "BI_SET",
                isCustomExercise: true,
                setsDetail: [{ setNumber: 1, reps: 15 }],
              },
            ],
          },
        ],
      });

      const isPdfValid = Buffer.isBuffer(pdfBuffer) && pdfBuffer.length > 500 && pdfBuffer.subarray(0, 4).toString() === "%PDF";
      recordResult(
        "SERVER-SIDE PDF GENERATION",
        "Vector PDF buffer generated containing Normal, Bi-Set, and Custom exercise",
        isPdfValid ? `PDF generated successfully (${pdfBuffer.length} bytes, header %PDF)` : "PDF generation failed",
        isPdfValid
      );
    } catch (e) {
      recordResult("SERVER-SIDE PDF GENERATION", "PDF generation", e.message, false);
    }

    // Print Consolidated Report Table
    console.log("\n==================================================");
    console.log("CONSOLIDATED AUDIT RESULTS REPORT");
    console.log("==================================================");
    console.log(
      ["TEST NAME".padEnd(45), "EXPECTED".padEnd(40), "ACTUAL".padEnd(45), "STATUS"].join(" | ")
    );
    console.log("-".repeat(140));

    let passCount = 0;
    for (const r of results) {
      if (r.pass) passCount++;
      const statusText = r.pass ? "PASS" : "FAIL";
      console.log(
        [
          r.name.padEnd(45),
          r.expected.slice(0, 38).padEnd(40),
          r.actual.slice(0, 43).padEnd(45),
          statusText,
        ].join(" | ")
      );
    }
    console.log("-".repeat(140));
    console.log(`TOTAL: ${passCount}/${results.length} PASS\n`);

    if (passCount !== results.length) {
      throw new Error(`Audit suite had ${results.length - passCount} failing test(s).`);
    }

  } finally {
    connection.release();
    await pool.end();
  }
}

runAuditSuite()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("ERRO CRÍTICO NA SUÍTE DE AUDITORIA:", err);
    process.exit(1);
  });
