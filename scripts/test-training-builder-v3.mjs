import { register } from 'node:module';
register('./ts-loader.mjs', import.meta.url);

import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
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

// Dynamically import TS modules now that loader is registered
const { formatDurationNatural } = await import('../lib/training-v2/reps-normalizer.ts');
const {
  createWorkout,
  getWorkoutWithDraft,
  addBlockToDraft,
  createWorkoutSubBlock,
  renameWorkoutSubBlock,
  reorderWorkoutSubBlocks,
  duplicateWorkoutSubBlock,
  deleteWorkoutSubBlock,
  addItemToDraftBlock,
  resolveUnmatchedExerciseItem,
  validateWorkoutVersionForPublish,
  deleteWorkout,
  deleteWorkoutDraft,
} = await import('../lib/training-v2/workout-repository.ts');

console.log('=== TEST SUITE: TRAINING BUILDER V3 ===');
console.log('Sub-blocks (Grupos) + Duration Units (Min/Seg) + Resilient Draft + Publish Guard + Simple Deletion\n');

async function run() {
  // 1. Format Duration Natural Unit Tests
  console.log('[1/5] Testing formatDurationNatural...');
  assert.equal(formatDurationNatural(null), '');
  assert.equal(formatDurationNatural(0), '');
  assert.equal(formatDurationNatural(45, 'SECONDS'), '45 segundos');
  assert.equal(formatDurationNatural(1, 'SECONDS'), '1 segundo');
  assert.equal(formatDurationNatural(60, 'MINUTES'), '1 minuto');
  assert.equal(formatDurationNatural(120, 'MINUTES'), '2 minutos');
  assert.equal(formatDurationNatural(600, 'MINUTES'), '10 minutos');
  assert.equal(formatDurationNatural(90, 'SECONDS'), '90 segundos');
  assert.equal(formatDurationNatural(90), '90 segundos'); // Natural seconds
  assert.equal(formatDurationNatural(120), '2 minutos'); // Multiple of 60 fallback to minutes

  console.log('  PASS: formatDurationNatural tests passed.');

  // 2. Database Schema Verification
  console.log('\n[2/5] Verifying DB Schema (Migration 041)...');
  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;
  const pool = mysql.createPool({
    host: DB_HOST,
    port: Number(DB_PORT) || 3306,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
  });

  const [subBlockTable] = await pool.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'workout_sub_blocks'`,
    [DB_NAME]
  );
  assert.equal(subBlockTable.length, 1, 'Table workout_sub_blocks must exist');

  const [itemCols] = await pool.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'workout_block_items' AND COLUMN_NAME IN ('sub_block_id', 'duration_unit')`,
    [DB_NAME]
  );
  const itemColNames = itemCols.map((c) => c.COLUMN_NAME);
  assert.ok(itemColNames.includes('sub_block_id'), 'workout_block_items.sub_block_id must exist');
  assert.ok(itemColNames.includes('duration_unit'), 'workout_block_items.duration_unit must exist');

  const [setCols] = await pool.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'workout_item_sets' AND COLUMN_NAME = 'duration_unit'`,
    [DB_NAME]
  );
  assert.equal(setCols.length, 1, 'workout_item_sets.duration_unit must exist');
  console.log('  PASS: DB schema verification passed.');

  // 3. Setup Context
  const [mRows] = await pool.query(
    `SELECT cm.id as membership_id, cm.consultancy_id, cm.user_id, c.slug
     FROM consultancy_members cm
     JOIN consultancies c ON c.id = cm.consultancy_id
     WHERE cm.status = 'ACTIVE'
     LIMIT 1`
  );
  if (!mRows || mRows.length === 0) {
    console.log('No active membership found. Skipping DB integration test.');
    await pool.end();
    return;
  }

  const row = mRows[0];
  console.log('\nUsing consultancy:', row.slug, 'membership:', row.membership_id);

  const [eRows] = await pool.query(
    `SELECT public_id, name FROM exercises WHERE deleted_at IS NULL AND status = 'PUBLISHED' AND (consultancy_id IS NULL OR consultancy_id = ?) LIMIT 2`,
    [row.consultancy_id]
  );
  if (!eRows || eRows.length === 0) {
    console.log('No exercises found in DB. Skipping integration.');
    await pool.end();
    return;
  }
  const realEx = eRows[0];
  console.log('Sample exercise for linking:', realEx.public_id, realEx.name);

  const ctx = {
    userId: row.user_id,
    userPublicId: 'usr_' + row.user_id,
    isPlatformAdmin: false,
    consultancyId: row.consultancy_id,
    consultancyPublicId: 'cons_' + row.consultancy_id,
    consultancySlug: row.slug,
    membershipId: row.membership_id,
    membershipPublicId: 'mbr_' + row.membership_id,
    roles: ['PERSONAL', 'CONSULTANCY_ADMIN'],
    hasRole: (role) => role === 'PERSONAL' || role === 'CONSULTANCY_ADMIN',
    canAuthorTraining: true,
    canManageConsultancy: true,
    canManageGlobal: false,
    isStudent: false,
  };

  // 4. Sub-blocks & Duration Units Flow
  console.log('\n[3/5] Testing Sub-blocks (Grupos) hierarchy & Duration Units...');
  const { workout, version } = await createWorkout(ctx, {
    title: 'V3 Test Ficha — ' + Date.now(),
    description: 'Teste automatizado de sub-blocos e unidades de tempo',
    difficultyLevel: 'INTERMEDIATE',
    estimatedDurationMinutes: 45,
  });
  console.log('  Created workout:', workout.publicId, 'version:', version.publicId);

  // Add Block (Treino A)
  const blockA = await addBlockToDraft(ctx, version.publicId, {
    blockType: 'CUSTOM',
    title: 'Treino A - Peito e Tríceps',
  });
  console.log('  Created block:', blockA.title, blockA.publicId);

  // Create Sub-block (Grupo 1)
  const subBlock1 = await createWorkoutSubBlock(ctx, blockA.publicId, {
    title: 'Aquecimento Específico',
  });
  assert.ok(subBlock1.publicId, 'Sub-block 1 must have publicId');
  assert.equal(subBlock1.title, 'Aquecimento Específico');
  console.log('  Created sub-block 1:', subBlock1.title, subBlock1.publicId);

  // Add Item inside Sub-block 1 with MINUTES duration unit
  const item1 = await addItemToDraftBlock(ctx, blockA.publicId, {
    exercisePublicId: realEx.public_id,
    subBlockPublicId: subBlock1.publicId,
    prescriptionMode: 'SETS',
    durationUnit: 'MINUTES',
    sets: [
      {
        setType: 'NORMAL',
        repsCount: 1,
        targetDurationSeconds: 600, // 10 minutes
        durationUnit: 'MINUTES',
      },
    ],
  });
  assert.ok(item1.publicId, 'Item 1 must have publicId');
  assert.equal(item1.subBlockPublicId, subBlock1.publicId);
  assert.equal(item1.durationUnit, 'MINUTES');
  console.log('  Added item to sub-block 1 with MINUTES duration unit (600s = 10 min)');

  // Rename Sub-block 1
  const renamedSubBlock = await renameWorkoutSubBlock(
    ctx,
    subBlock1.publicId,
    'Aquecimento Articular e Mobilidade'
  );
  assert.equal(renamedSubBlock.title, 'Aquecimento Articular e Mobilidade');
  console.log('  PASS: Renamed sub-block 1 to:', renamedSubBlock.title);

  // Create Sub-block 2
  const subBlock2 = await createWorkoutSubBlock(ctx, blockA.publicId, {
    title: 'Série Principal',
  });
  console.log('  Created sub-block 2:', subBlock2.title, subBlock2.publicId);

  // Duplicate Sub-block 1
  const duplicatedSubBlock = await duplicateWorkoutSubBlock(ctx, subBlock1.publicId);
  assert.ok(duplicatedSubBlock.publicId);
  assert.ok(duplicatedSubBlock.title.includes('(Cópia)'));
  console.log('  PASS: Duplicated sub-block:', duplicatedSubBlock.title);

  // Reorder Sub-blocks
  await reorderWorkoutSubBlocks(ctx, blockA.publicId, [
    subBlock2.publicId,
    subBlock1.publicId,
    duplicatedSubBlock.publicId,
  ]);
  console.log('  PASS: Reordered sub-blocks successfully.');

  // Delete duplicated Sub-block
  await deleteWorkoutSubBlock(ctx, duplicatedSubBlock.publicId);
  console.log('  PASS: Deleted duplicated sub-block.');

  // 5. Resilient Draft & Publish Guard
  console.log('\n[4/5] Testing Resilient Draft & Publish Guard (Unresolved items)...');
  // Add an unresolved item (exercise_id is NULL) simulating AI import
  const [draftTree] = await pool.query(
    `SELECT wb.id as block_id FROM workout_blocks wb JOIN workout_versions wv ON wv.id = wb.workout_version_id WHERE wv.public_id = ? AND wb.public_id = ?`,
    [version.publicId, blockA.publicId]
  );
  const blockDbId = draftTree[0].block_id;

  const unresolvedItemPublicId = 'wbi_unresolved_' + Date.now();
  await pool.query(
    `INSERT INTO workout_block_items (public_id, block_id, exercise_id, exercise_name_snapshot, prescription_mode, duration_unit, sort_order)
     VALUES (?, ?, NULL, ?, 'SETS', 'MINUTES', 99)`,
    [unresolvedItemPublicId, blockDbId, 'Exercício AI Desconhecido']
  );
  await pool.query(
    `INSERT INTO workout_item_sets (block_item_id, set_number, set_type, target_reps)
     SELECT id, 1, 'NORMAL', 10 FROM workout_block_items WHERE public_id = ?`,
    [unresolvedItemPublicId]
  );
  console.log('  Inserted unresolved draft item with exercise_id = NULL');

  // Verify tree includes unresolved item with null exercisePublicId
  const draftWithUnresolved = await getWorkoutWithDraft(ctx, workout.publicId);
  const unresolvedInTree = draftWithUnresolved.draftVersion.blocks
    .flatMap((b) => b.items)
    .find((it) => it.publicId === unresolvedItemPublicId);
  assert.ok(unresolvedInTree, 'Unresolved item must be in draft tree');
  assert.equal(unresolvedInTree.exercisePublicId, null, 'exercisePublicId must be null');
  console.log('  PASS: Draft tree successfully hydrides unresolved item with exercisePublicId = null');

  // Validate publish MUST FAIL
  let publishFailedAsExpected = false;
  try {
    validateWorkoutVersionForPublish(draftWithUnresolved.draftVersion);
  } catch (err) {
    publishFailedAsExpected = true;
    console.log('  PASS: Publish guard caught unresolved exercise as expected:', err.message);
  }
  assert.ok(publishFailedAsExpected, 'validateWorkoutVersionForPublish must reject draft with unresolved exercises');
  console.log('  [PUBLISH WITH UNRESOLVED: BLOCKED] => VERIFIED PASS');

  // Now resolve the unresolved item
  console.log('  Resolving item with real library exercise:', realEx.name);
  const resolvedItem = await resolveUnmatchedExerciseItem(
    ctx,
    unresolvedItemPublicId,
    realEx.public_id
  );
  assert.equal(resolvedItem.exercisePublicId, realEx.public_id);
  console.log('  PASS: Item successfully resolved to:', resolvedItem.exerciseNameSnapshot);

  // Validate publish MUST NOW PASS
  const updatedWorkout = await getWorkoutWithDraft(ctx, workout.publicId);
  validateWorkoutVersionForPublish(updatedWorkout.draftVersion);
  console.log('  PASS: Publish validation passed after resolution.');

  // 6. Simple Deletion & History Preservation
  console.log('\n[5/5] Testing Deletion & Completed History Preservation...');
  // Find or use any membership in the consultancy to simulate a student assignment & execution
  const [sRows] = await pool.query(
    `SELECT cm.id as membership_id, cm.user_id
     FROM consultancy_members cm
     WHERE cm.consultancy_id = ?
     LIMIT 1`,
    [row.consultancy_id]
  );

  const student = sRows[0];
  const assignPublicId = 'wa_test_' + Date.now();
  const execPublicId = 'wes_test_' + Date.now();

  // Create an active assignment
  const [assignResult] = await pool.query(
    `INSERT INTO workout_assignments (
      public_id, consultancy_id, student_membership_id, workout_version_id,
      assigned_by_membership_id, starts_on, status
    )
    SELECT ?, ?, ?, wv.id, ?, CURDATE(), 'ACTIVE'
    FROM workout_versions wv
    WHERE wv.public_id = ?`,
    [assignPublicId, row.consultancy_id, student.membership_id, row.membership_id, version.publicId]
  );
  const testAssignmentId = assignResult.insertId;
  console.log('  Created simulated active assignment for student, id:', testAssignmentId);

  // Simulate a completed workout execution session for student
  const [execResult] = await pool.query(
    `INSERT INTO workout_execution_sessions (
      public_id, consultancy_id, student_membership_id, workout_assignment_id,
      workout_version_id, status, started_at, completed_at
    )
    SELECT ?, ?, ?, ?, wv.id, 'COMPLETED', NOW() - INTERVAL 1 HOUR, NOW()
    FROM workout_versions wv
    WHERE wv.public_id = ?`,
    [execPublicId, row.consultancy_id, student.membership_id, testAssignmentId, version.publicId]
  );
  const testExecutionId = execResult.insertId;
  console.log('  Created simulated COMPLETED execution session for student, id:', testExecutionId);

  // Delete workout
  console.log('  Deleting workout via deleteWorkout...');
  const deleteResult = await deleteWorkout(ctx, workout.publicId);
  assert.equal(deleteResult, true, 'Workout deletion should return true');

  // Verify workout is soft-deleted
  const [deletedWorkoutRows] = await pool.query(
    `SELECT id, deleted_at FROM workouts WHERE public_id = ?`,
    [workout.publicId]
  );
  assert.ok(deletedWorkoutRows[0].deleted_at !== null, 'Workout deleted_at must not be null');
  console.log('  PASS: Workout soft-deleted successfully (deleted_at set).');

  // Verify assignment was set to ARCHIVED
  const [assignCheck] = await pool.query(
    `SELECT id, status FROM workout_assignments WHERE id = ?`,
    [testAssignmentId]
  );
  assert.equal(assignCheck[0].status, 'ARCHIVED', 'Active assignment should be archived upon workout deletion');
  console.log('  PASS: Active assignment was safely archived.');

  // Verify completed execution session is 100% PRESERVED
  const [execCheck] = await pool.query(
    `SELECT id, status FROM workout_execution_sessions WHERE id = ?`,
    [testExecutionId]
  );
  assert.equal(execCheck.length, 1, 'Completed execution session must STILL EXIST');
  assert.equal(execCheck[0].status, 'COMPLETED', 'Completed execution session status must still be COMPLETED');
  console.log('  [COMPLETED HISTORY PRESERVED: PASS] => VERIFIED! Execution history 100% preserved.');

  // Clean up test execution and assignment
  await pool.query(`DELETE FROM workout_execution_sessions WHERE id = ?`, [testExecutionId]);
  await pool.query(`DELETE FROM workout_assignments WHERE id = ?`, [testAssignmentId]);
  console.log('  Cleaned up test execution and assignment records.');

  await pool.end();
  console.log('\n========================================');
  console.log('ALL TESTS PASSED SUCCESSFULLY! (5/5)');
  console.log('========================================');
}

run().catch((err) => {
  console.error('\nTEST FAILED WITH ERROR:', err);
  process.exit(1);
});
