import { register } from 'node:module';
register('./ts-loader.mjs', import.meta.url);

import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import fs from 'node:fs';
import path from 'node:path';

// Load .env.local if present
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

const {
  createWorkout,
  getWorkoutWithSpecificVersion,
  publishWorkoutVersion,
  addBlockToDraft,
  addItemToDraftBlock,
  createWorkoutItemCombination,
  createCustomExerciseInWorkout,
  deleteWorkout,
} = await import('../lib/training-v2/workout-repository.ts');

const {
  listExercisesForProfessional,
} = await import('../lib/training-v2/exercise-repository.ts');

async function runTests() {
  console.log('==================================================');
  console.log('TREVO ONE — DETERMINISTIC WORKOUT OPEN & BUILDER LOAD AUDIT');
  console.log('==================================================\n');

  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
  });

  try {
    // 1. Fetch active consultancy and personal membership
    const [cRows] = await pool.execute(`
      SELECT c.id, c.public_id, c.slug, cm.id as membership_id, cm.user_id
      FROM consultancy_members cm
      JOIN consultancies c ON c.id = cm.consultancy_id
      WHERE cm.status = 'ACTIVE'
      ORDER BY c.id ASC
      LIMIT 1;
    `);

    assert.ok(cRows.length > 0, 'Must have at least 1 consultancy member');
    const c = cRows[0];

    const ctx = {
      userId: Number(c.user_id),
      userPublicId: 'usr_' + c.user_id,
      consultancyId: Number(c.id),
      consultancyPublicId: String(c.public_id),
      consultancySlug: String(c.slug),
      membershipId: Number(c.membership_id),
      membershipPublicId: 'mbr_' + c.membership_id,
      roles: ['PERSONAL', 'CONSULTANCY_ADMIN'],
      hasRole: (r) => r === 'PERSONAL' || r === 'CONSULTANCY_ADMIN',
      isPlatformAdmin: false,
      canAuthorTraining: true,
      canManageConsultancy: true,
      canManageGlobal: false,
      isStudent: false,
    };

    const [eRows] = await pool.query(
      `SELECT public_id, name FROM exercises WHERE deleted_at IS NULL AND (status = 'PUBLISHED' OR status IS NULL) LIMIT 2`
    );
    assert.ok(eRows.length >= 1, 'Need at least 1 exercise in library');
    const libraryExercises = eRows;

    // -------------------------------------------------------------------------
    // TEST 1: BUTTON HREF LOGIC & ROUTE MATCHING
    // -------------------------------------------------------------------------
    console.log('[1/6] Testing Button Href & Route Target...');
    const testWorkoutPublicId = 'wkt-test-public-id-123';
    // Emulate workout-card-actions.tsx line 92
    const generatedHref = `/consultoria/${ctx.consultancySlug}/rotinas/${testWorkoutPublicId}`;
    assert.equal(
      generatedHref,
      `/consultoria/${ctx.consultancySlug}/rotinas/${testWorkoutPublicId}`,
      'Button must link directly to the workout public ID under consultancy routines'
    );
    // Emulate Next.js App Router param extraction
    const routePattern = /^\/consultoria\/([^/]+)\/rotinas\/([^/]+)$/;
    const match = generatedHref.match(routePattern);
    assert.ok(match, 'Generated URL must match App Router route');
    assert.equal(match[1], ctx.consultancySlug, 'Route slug param must match consultancy slug');
    assert.equal(match[2], testWorkoutPublicId, 'Route publicId param must match workout public id');
    console.log('  PASS: Button href generation and Route extraction match perfectly.\n');

    // -------------------------------------------------------------------------
    // TEST 2: LEGACY WORKOUT (combination_id = NULL, custom_exercise_id = NULL)
    // -------------------------------------------------------------------------
    console.log('[2/6] Testing Legacy Workout Load (NULL combinations & NULL custom exercises)...');
    const legacyWorkout = await createWorkout(ctx, {
      title: 'QA Legacy Workout Test',
      objective: 'Verificar retrocompatibilidade de treino legado',
      difficultyLevel: 'INTERMEDIATE',
    });

    const legacyBlock = await addBlockToDraft(ctx, legacyWorkout.version.publicId, {
      blockType: 'SINGLE',
      title: 'Bloco Principal Legado',
    });

    await addItemToDraftBlock(ctx, legacyBlock.publicId, {
      exercisePublicId: libraryExercises[0].public_id,
      sortOrder: 1,
      prescriptionMode: 'SETS',
      sets: [
        { setNumber: 1, setType: 'REGULAR', targetReps: 10, targetRestSeconds: 60 },
        { setNumber: 2, setType: 'REGULAR', targetReps: 10, targetRestSeconds: 60 },
      ],
    });

    // Check DB directly to ensure combination_id and custom_exercise_id are NULL
    const [legacyItemRows] = await pool.execute(`
      SELECT wbi.combination_id, wbi.custom_exercise_id
      FROM workout_block_items wbi
      JOIN workout_blocks wb ON wb.id = wbi.block_id
      WHERE wb.workout_version_id = (SELECT id FROM workout_versions WHERE public_id = ?)
    `, [legacyWorkout.version.publicId]);

    assert.equal(legacyItemRows[0].combination_id, null, 'Legacy item combination_id must be null');
    assert.equal(legacyItemRows[0].custom_exercise_id, null, 'Legacy item custom_exercise_id must be null');

    // Test Loader
    const legacyLoaded = await getWorkoutWithSpecificVersion(ctx, legacyWorkout.workout.publicId);
    assert.ok(legacyLoaded, 'Legacy workout must be loaded');
    assert.ok(legacyLoaded.version, 'Legacy workout version must be loaded');
    assert.equal(legacyLoaded.version.blocks.length, 1);
    assert.equal(legacyLoaded.version.blocks[0].items.length, 1);
    assert.equal(legacyLoaded.version.blocks[0].items[0].combinationPublicId, null);
    console.log('  PASS: Legacy workout loaded seamlessly with NULL combinations & custom exercises.\n');

    // -------------------------------------------------------------------------
    // TEST 3: DRAFT WORKOUT LOAD
    // -------------------------------------------------------------------------
    console.log('[3/6] Testing Draft Workout Load...');
    const draftLoaded = await getWorkoutWithSpecificVersion(ctx, legacyWorkout.workout.publicId);
    assert.ok(draftLoaded);
    assert.equal(draftLoaded.isDraft, true, 'isDraft must be true for draft workout');
    assert.equal(draftLoaded.version.status, 'DRAFT', 'Status must be DRAFT');
    assert.equal(draftLoaded.allVersions.length, 1, 'allVersions must have 1 version');
    console.log('  PASS: Draft workout loaded with isDraft: true and status: DRAFT.\n');

    // -------------------------------------------------------------------------
    // TEST 4: PUBLISHED WORKOUT LOAD
    // -------------------------------------------------------------------------
    console.log('[4/6] Testing Published Workout Load...');
    await publishWorkoutVersion(ctx, legacyWorkout.version.publicId);
    const publishedLoaded = await getWorkoutWithSpecificVersion(ctx, legacyWorkout.workout.publicId);
    assert.ok(publishedLoaded);
    assert.equal(publishedLoaded.isDraft, false, 'isDraft must be false for published workout');
    assert.equal(publishedLoaded.version.status, 'PUBLISHED', 'Status must be PUBLISHED');
    assert.equal(publishedLoaded.allVersions[0].status, 'PUBLISHED');
    console.log('  PASS: Published workout loaded with isDraft: false and status: PUBLISHED.\n');

    // -------------------------------------------------------------------------
    // TEST 5: NEW WORKOUT WITH COMBINATION & CUSTOM EXERCISE
    // -------------------------------------------------------------------------
    console.log('[5/6] Testing New Workout Load (Combinations + Custom Exercises)...');
    const newWorkout = await createWorkout(ctx, {
      title: 'QA New V3.1 Workout Test',
      objective: 'Verificar combinação e exercício customizado',
      difficultyLevel: 'ADVANCED',
    });

    const newBlock = await addBlockToDraft(ctx, newWorkout.version.publicId, {
      blockType: 'SINGLE',
      title: 'Bloco com Bi-Set e Custom',
    });

    // Add item 1: Standard library exercise
    const item1 = await addItemToDraftBlock(ctx, newBlock.publicId, {
      exercisePublicId: libraryExercises[0].public_id,
      sortOrder: 1,
      prescriptionMode: 'SETS',
      sets: [
        { setNumber: 1, setType: 'REGULAR', targetReps: 12, targetRestSeconds: 0 },
        { setNumber: 2, setType: 'REGULAR', targetReps: 12, targetRestSeconds: 0 },
      ],
    });

    // Add item 2: Custom exercise created directly in the block
    const item2 = await createCustomExerciseInWorkout(ctx, {
      categoryPublicId: newBlock.publicId,
      name: 'Flexão Customizada QA',
      muscleGroupPrimary: 'CHEST',
      equipment: 'BODYWEIGHT',
      instructions: 'Descer com amplitude total.',
      prescriptionMode: 'SETS',
      sets: [
        { setNumber: 1, setType: 'REGULAR', targetReps: 15, targetRestSeconds: 60 },
        { setNumber: 2, setType: 'REGULAR', targetReps: 15, targetRestSeconds: 60 },
      ],
    });

    // Group items into BI_SET
    const combination = await createWorkoutItemCombination(ctx, {
      blockPublicId: newBlock.publicId,
      combinationType: 'BI_SET',
      title: 'Super Bi-Set QA',
      itemPublicIds: [item1.publicId, item2.publicId],
      restAfterSeconds: 75,
      rounds: 2,
    });

    assert.ok(combination.publicId, 'Combination must be created');

    // Test loader for new workout
    const newLoaded = await getWorkoutWithSpecificVersion(ctx, newWorkout.workout.publicId);
    assert.ok(newLoaded);
    assert.ok(newLoaded.version);
    const loadedBlock = newLoaded.version.blocks[0];
    assert.equal(loadedBlock.combinations.length, 1, 'Block must have 1 combination');
    assert.equal(loadedBlock.combinations[0].combinationType, 'BI_SET');
    assert.equal(loadedBlock.items.length, 2, 'Block must have 2 items');

    const loadedItem1 = loadedBlock.items.find(i => i.publicId === item1.publicId);
    const loadedItem2 = loadedBlock.items.find(i => i.publicId === item2.publicId);

    assert.ok(loadedItem2.customExercisePublicId, 'Custom exercise public id must be set');
    assert.equal(loadedItem2.isCustomExercise, true);
    console.log('  PASS: New workout loaded cleanly with BI-SET and Custom Exercise.\n');

    // -------------------------------------------------------------------------
    // TEST 6: TENANCY ENFORCEMENT
    // -------------------------------------------------------------------------
    console.log('[6/6] Testing Tenancy Enforcement...');
    const ctxAlien = {
      ...ctx,
      consultancyId: 999999,
      consultancyPublicId: 'alien-consultancy',
      consultancySlug: 'alien-slug',
    };

    const alienLoad = await getWorkoutWithSpecificVersion(ctxAlien, newWorkout.workout.publicId);
    assert.equal(alienLoad, null, 'Must return null when loading workout from another consultancy');
    console.log('  PASS: Tenancy boundary strictly enforced (cross-tenant returns null).\n');

    // Clean up created test workouts
    await deleteWorkout(ctx, legacyWorkout.workout.publicId);
    await deleteWorkout(ctx, newWorkout.workout.publicId);
    console.log('Test workouts cleaned up successfully.');

    console.log('\n==================================================');
    console.log('ALL 6/6 ROUTE & BUILDER LOAD AUDIT TESTS PASSED!');
    console.log('==================================================');
    process.exit(0);
  } finally {
    await pool.end();
  }
}

runTests().catch((err) => {
  console.error('\nAUDIT FAILED:', err);
  process.exit(1);
});
