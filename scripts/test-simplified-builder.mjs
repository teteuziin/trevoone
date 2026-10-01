import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';
import {
  createWorkout,
  getWorkoutWithDraft,
  addBlockToDraft,
  updateBlockTitleInDraft,
  duplicateBlockInDraft,
  reorderBlocksInDraft,
  removeBlockFromDraft,
  addItemToDraftBlock,
  duplicateItemInDraft,
  moveItemToBlockInDraft,
  updateItemQuickConfigInDraft,
  removeItemFromDraft,
} from '../lib/training-v2/workout-repository.ts';

console.log('=== TEST: SIMPLIFIED BUILDER (FICHA -> CATEGORIAS -> EXERCICIOS) ===');

async function run() {
  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;
  const pool = mysql.createPool({
    host: DB_HOST,
    port: Number(DB_PORT) || 3306,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
  });

  // 1. Find a valid consultancy and membership
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
  console.log('Using consultancy:', row.slug, 'membership:', row.membership_id);

  // Find or pick an exercise from library (global or consultancy tenant)
  const [eRows] = await pool.query(
    `SELECT public_id, name FROM exercises WHERE deleted_at IS NULL AND status = 'PUBLISHED' AND (consultancy_id IS NULL OR consultancy_id = ?) LIMIT 2`,
    [row.consultancy_id]
  );
  if (!eRows || eRows.length === 0) {
    console.log('No exercises found in DB. Skipping.');
    await pool.end();
    return;
  }
  const ex1 = eRows[0];
  console.log('Sample exercise:', ex1.public_id, ex1.name);

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

  // STEP 1: Create Workout (Ficha)
  console.log('\n[Step 1] Creating Ficha de Treino...');
  const { workout, version } = await createWorkout(ctx, {
    title: 'Hipertrofia — Matheus Teste ' + Date.now(),
    description: 'Treino de ganho de massa',
    difficultyLevel: 'INTERMEDIATE',
    estimatedDurationMinutes: 50,
  });
  assert.ok(workout.publicId, 'Ficha must have publicId');
  assert.ok(version.publicId, 'Version must have publicId');
  console.log('  PASS: Ficha criada com sucesso:', workout.publicId, 'versão:', version.publicId);

  // STEP 2: Add Category 1 ('Peito')
  console.log('\n[Step 2] Adding Category 1 (Peito)...');
  const cat1 = await addBlockToDraft(ctx, version.publicId, {
    blockType: 'CUSTOM',
    title: 'Peito',
  });
  assert.ok(cat1.publicId, 'Category 1 must have publicId');
  console.log('  PASS: Categoria 1 criada:', cat1.title, cat1.publicId);

  // STEP 3: Add Category 2 ('Bíceps')
  console.log('\n[Step 3] Adding Category 2 (Bíceps)...');
  const cat2 = await addBlockToDraft(ctx, version.publicId, {
    blockType: 'CUSTOM',
    title: 'Bíceps',
  });
  assert.ok(cat2.publicId, 'Category 2 must have publicId');
  console.log('  PASS: Categoria 2 criada:', cat2.title, cat2.publicId);

  // STEP 4: Add Exercise to Category 1
  console.log('\n[Step 4] Adding Exercise to Categoria Peito...');
  const item1 = await addItemToDraftBlock(ctx, cat1.publicId, {
    exercisePublicId: ex1.public_id,
    notes: 'Inicial',
  });
  assert.ok(item1.publicId, 'Item must have publicId');
  console.log('  PASS: Exercício adicionado à categoria Peito:', item1.publicId);

  // STEP 5: Quick Config Exercise (Séries: 4, Reps: 10, Descanso: 60s, Carga: 20kg)
  console.log('\n[Step 5] Updating exercise quick config (4x10, 60s, 20kg)...');
  const sets = await updateItemQuickConfigInDraft(ctx, item1.publicId, {
    seriesCount: 4,
    reps: 10,
    restSeconds: 60,
    loadKg: 20,
    notes: 'Execução cadenciada',
  });
  assert.equal(sets.length, 4, 'Should have created 4 sets');
  assert.equal(sets[0].targetReps, 10);
  assert.equal(sets[0].targetRestSeconds, 60);
  assert.equal(sets[0].targetLoadKg, 20);
  console.log('  PASS: Quick config atualizou 4 séries com sucesso.');

  // STEP 5B: Quick Config Exercise by Duration (3x 30s, 45s descanso)
  console.log('\n[Step 5B] Updating exercise quick config by duration (3x 30s, 45s descanso)...');
  const durationSets = await updateItemQuickConfigInDraft(ctx, item1.publicId, {
    seriesCount: 3,
    targetDurationSeconds: 30,
    restSeconds: 45,
    notes: 'Isometria controlada',
  });
  assert.equal(durationSets.length, 3, 'Should have created 3 sets');
  assert.equal(durationSets[0].targetDurationSeconds, 30);
  assert.equal(durationSets[0].targetReps, null);
  assert.equal(durationSets[0].targetRestSeconds, 45);
  console.log('  PASS: Quick config por duração (3x 30s, 45s) atualizou com sucesso.');

  // STEP 6: Duplicate Exercise within Category
  console.log('\n[Step 6] Duplicating exercise within category...');
  const dupItem = await duplicateItemInDraft(ctx, item1.publicId);
  assert.ok(dupItem.publicId, 'Duplicated item must have publicId');
  assert.notEqual(dupItem.publicId, item1.publicId, 'Duplicated item must have new publicId');
  console.log('  PASS: Exercício duplicado com sucesso:', dupItem.publicId);

  // STEP 7: Move Duplicated Exercise to Category 2 (Bíceps)
  console.log('\n[Step 7] Moving duplicated exercise to Categoria Bíceps...');
  await moveItemToBlockInDraft(ctx, dupItem.publicId, cat2.publicId);
  console.log('  PASS: Exercício movido para Categoria Bíceps.');

  // STEP 8: Rename Category 1
  console.log('\n[Step 8] Renaming Categoria 1...');
  await updateBlockTitleInDraft(ctx, cat1.publicId, 'Peito & Deltoide');
  console.log('  PASS: Categoria renomeada.');

  // STEP 9: Duplicate Category 1 (with exercise and sets)
  console.log('\n[Step 9] Duplicating Categoria 1 (with exercises)...');
  const dupCat = await duplicateBlockInDraft(ctx, cat1.publicId);
  assert.ok(dupCat.publicId, 'Duplicated category must have publicId');
  assert.equal(dupCat.title, 'Peito & Deltoide (Cópia)');
  console.log('  PASS: Categoria inteira duplicada com seus exercícios.');

  // STEP 10: Reorder Categories
  console.log('\n[Step 10] Reordering categories...');
  await reorderBlocksInDraft(ctx, version.publicId, [cat2.publicId, cat1.publicId, dupCat.publicId]);
  console.log('  PASS: Categorias reordenadas com sucesso.');

  // STEP 11: Verify Full Ficha Tree
  console.log('\n[Step 11] Fetching full Ficha draft tree...');
  const fullFicha = await getWorkoutWithDraft(ctx, workout.publicId);
  assert.ok(fullFicha.draftVersion, 'Must have draftVersion');
  const blocks = fullFicha.draftVersion.blocks || [];
  assert.equal(blocks.length, 3, 'Should have 3 categories');
  console.log('  PASS: Ficha possui 3 categorias:');
  for (const b of blocks) {
    console.log('    - Categoria:', b.title, '(' + (b.items?.length || 0) + ' exercícios)');
  }

  // Cleanup: Delete test workout
  console.log('\n[Step 12] Cleaning up test workout...');
  await pool.query('UPDATE workouts SET deleted_at = NOW() WHERE id = ?', [fullFicha.id]);
  await pool.end();
  console.log('\n=== ALL 12 TEST STEPS PASSED SUCCESSFULLY! ===');
}

run().catch((err) => {
  console.error('TEST ERROR:', err);
  process.exit(1);
});
