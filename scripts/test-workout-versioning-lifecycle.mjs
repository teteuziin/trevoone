import { register } from 'node:module';
register('./ts-loader.mjs', import.meta.url);

import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';

const {
  createWorkout,
  getWorkoutVersionTree,
  listWorkoutVersions,
  publishWorkoutVersion,
  createNewDraftVersionFromPublished,
  addBlockToDraft,
  addItemToDraftBlock,
  addSetToDraftItem,
  createWorkoutItemCombination,
  assignTemplateToStudent,
} = await import('../lib/training-v2/workout-repository.ts');

async function runLifecycleTests() {
  console.log('==================================================');
  console.log('TREVO ONE — RIGOROUS WORKOUT VERSIONING LIFECYCLE AUDIT');
  console.log('==================================================\n');

  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 3,
  });

  let tempStudentMemberId = null;
  let tempStudentUserId = null;

  try {
    // 1. Resolve test consultancy and personal coach context
    const [cRows] = await pool.execute(
      `SELECT c.id, c.public_id, c.slug, cm.id AS membership_id, cm.user_id
       FROM consultancies c
       INNER JOIN consultancy_members cm ON cm.consultancy_id = c.id
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cmr.role IN ('PERSONAL', 'CONSULTANCY_ADMIN') AND cm.status = 'ACTIVE'
       LIMIT 1`
    );
    assert.ok(cRows.length > 0, 'Must have at least one coach consultancy member');
    const { id: consultancyId, public_id: consultancyPublicId, membership_id: membershipId, user_id: userId } = cRows[0];

    const ctx = {
      consultancyId: Number(consultancyId),
      consultancyPublicId: String(consultancyPublicId),
      membershipId: Number(membershipId),
      userId: Number(userId),
      roles: ['PERSONAL'],
      isPlatformAdmin: false,
      canAuthorTraining: true,
      canManageConsultancy: true,
    };

    // Find student member for template assignment test
    let studentMemberPublicId = null;

    const [stRows] = await pool.execute(
      `SELECT cm.id, cm.public_id, cm.user_id
       FROM consultancy_members cm
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.consultancy_id = ? AND cmr.role = 'STUDENT' AND cm.status = 'ACTIVE'
       LIMIT 1`,
      [consultancyId]
    );

    if (stRows.length > 0) {
      studentMemberPublicId = stRows[0].public_id;
    } else {
      const uSuffix = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      const stPublicId = crypto.randomUUID();
      const [uRes] = await pool.execute(
        `INSERT INTO users (public_id, email, password_hash, full_name, created_at, updated_at)
         VALUES (?, ?, 'hash', 'Aluno Lifecycle', NOW(3), NOW(3))`,
        [crypto.randomUUID(), `student-lc-${uSuffix}@test.com`]
      );
      tempStudentUserId = uRes.insertId;
      const [mRes] = await pool.execute(
        `INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, created_at, updated_at)
         VALUES (?, ?, ?, 'ACTIVE', NOW(3), NOW(3))`,
        [stPublicId, consultancyId, tempStudentUserId]
      );
      tempStudentMemberId = mRes.insertId;
      await pool.execute(
        `INSERT INTO consultancy_member_roles (member_id, role, created_at)
         VALUES (?, 'STUDENT', NOW(3))`,
        [tempStudentMemberId]
      );
      studentMemberPublicId = stPublicId;
    }

    // Find library exercises for testing
    const [exRows] = await pool.execute(
      `SELECT id, public_id, name, muscle_group_primary, equipment
       FROM exercises
       WHERE status = 'PUBLISHED' AND deleted_at IS NULL
         AND (scope = 'GLOBAL' OR consultancy_id = ?)
       LIMIT 4`,
      [consultancyId]
    );
    assert.ok(exRows.length >= 2, 'Must have at least 2 published exercises in library');

    // =========================================================================
    // STEP 1: Create Workout & Initial Draft V1
    // =========================================================================
    console.log('[STEP 1] Creating workout with initial Draft V1...');
    const { workout, version: v1Draft } = await createWorkout(ctx, {
      title: `Test Lifecycle ${Date.now()}`,
      category: 'MUSCLE_BUILDING',
    });
    assert.equal(v1Draft.versionNumber, 1);
    assert.equal(v1Draft.status, 'DRAFT');

    const blockV1 = await addBlockToDraft(ctx, v1Draft.publicId, {
      blockType: 'CUSTOM',
      title: 'Treino A',
    });

    const itemV1A = await addItemToDraftBlock(ctx, blockV1.publicId, {
      exercisePublicId: exRows[0].public_id,
      notes: 'Exercício A V1',
    });
    await addSetToDraftItem(ctx, itemV1A.publicId, { targetReps: 10, targetLoadKg: 20 });

    const itemV1B = await addItemToDraftBlock(ctx, blockV1.publicId, {
      exercisePublicId: exRows[1].public_id,
      notes: 'Exercício B V1',
    });
    await addSetToDraftItem(ctx, itemV1B.publicId, { targetReps: 12, targetLoadKg: 25 });

    // =========================================================================
    // STEP 2: Publish V1 (V1 becomes PUBLISHED snapshot)
    // =========================================================================
    console.log('[STEP 2] Publishing V1...');
    const v1Published = await publishWorkoutVersion(ctx, v1Draft.publicId);
    assert.equal(v1Published.versionNumber, 1);
    assert.equal(v1Published.status, 'PUBLISHED');
    assert.ok(v1Published.publishedAt != null);
    console.log('✓ V1 successfully PUBLISHED');

    // =========================================================================
    // TEST: PUBLISHED_TO_DRAFT
    // =========================================================================
    console.log('\n[TEST 1: PUBLISHED_TO_DRAFT] Creating new draft from PUBLISHED V1...');
    const v2Draft = await createNewDraftVersionFromPublished(ctx, workout.publicId);
    assert.ok(v2Draft.publicId, 'V2 Draft must have a public ID');
    assert.notEqual(v2Draft.publicId, v1Published.publicId, 'V2 must have a distinct public ID from V1');
    assert.equal(v2Draft.versionNumber, 2, 'V2 versionNumber must be 2');
    assert.equal(v2Draft.status, 'DRAFT', 'V2 status must be DRAFT');
    assert.equal(v2Draft.blocks.length, 1, 'V2 must clone blocks from V1');
    assert.equal(v2Draft.blocks[0].items.length, 2, 'V2 must clone items from V1');
    console.log('✓ PUBLISHED_TO_DRAFT: PASS (V2 DRAFT created)');

    // =========================================================================
    // TEST: DRAFT_REUSED (Idempotency)
    // =========================================================================
    console.log('\n[TEST 2: DRAFT_REUSED] Reusing existing DRAFT when another edit is initiated...');
    const v2DraftAgain = await createNewDraftVersionFromPublished(ctx, workout.publicId);
    assert.equal(v2DraftAgain.publicId, v2Draft.publicId, 'Must return the exact same V2 DRAFT');
    assert.equal(v2DraftAgain.versionNumber, 2);
    assert.equal(v2DraftAgain.status, 'DRAFT');

    const allVersionsStep2 = await listWorkoutVersions(ctx, workout.publicId);
    assert.equal(allVersionsStep2.length, 2, 'Total versions must be exactly 2 (V1 PUBLISHED, V2 DRAFT)');
    console.log('✓ DRAFT_REUSED: PASS (Reused existing V2 DRAFT without duplicate creation)');

    // =========================================================================
    // TEST: BISET_WRITTEN_TO_DRAFT_ONLY
    // =========================================================================
    console.log('\n[TEST 3: BISET_WRITTEN_TO_DRAFT_ONLY] Creating Bi-Set in V2 DRAFT...');
    const v2Block = v2Draft.blocks[0];
    const v2ItemA = v2Block.items[0];
    const v2ItemB = v2Block.items[1];

    const biSetV2 = await createWorkoutItemCombination(ctx, {
      blockPublicId: v2Block.publicId,
      combinationType: 'BI_SET',
      restAfterSeconds: 60,
      itemPublicIds: [v2ItemA.publicId, v2ItemB.publicId],
    });
    assert.ok(biSetV2.publicId);
    assert.equal(biSetV2.combinationType, 'BI_SET');

    // Direct DB check: verify the combination is linked to V2 DRAFT block and version
    const [combDbRows] = await pool.execute(
      `SELECT wic.id, wic.public_id, wic.block_id, wb.workout_version_id, wv.version_number, wv.status
       FROM workout_item_combinations wic
       INNER JOIN workout_blocks wb ON wb.id = wic.block_id
       INNER JOIN workout_versions wv ON wv.id = wb.workout_version_id
       WHERE wic.public_id = ?`,
      [biSetV2.publicId]
    );
    assert.equal(combDbRows.length, 1);
    assert.equal(combDbRows[0].version_number, 2, 'Combination must be recorded in version 2');
    assert.equal(combDbRows[0].status, 'DRAFT', 'Combination must be recorded in DRAFT version');
    console.log('✓ BISET_WRITTEN_TO_DRAFT_ONLY: PASS (Bi-set exists strictly in V2 DRAFT)');

    // =========================================================================
    // TEST: V1_UNCHANGED
    // =========================================================================
    console.log('\n[TEST 4: V1_UNCHANGED] Verifying V1 snapshot immutability...');
    const v1Tree = await getWorkoutVersionTree(ctx, v1Published.publicId);
    assert.equal(v1Tree.versionNumber, 1);
    assert.equal(v1Tree.status, 'PUBLISHED', 'V1 is still PUBLISHED until V2 publishes');
    assert.equal(v1Tree.blocks.length, 1);
    assert.equal(v1Tree.blocks[0].combinations.length, 0, 'V1 MUST HAVE ZERO COMBINATIONS');
    assert.equal(v1Tree.blocks[0].items[0].combinationPublicId, null, 'V1 items must have null combinationPublicId');
    assert.equal(v1Tree.blocks[0].items[1].combinationPublicId, null, 'V1 items must have null combinationPublicId');
    console.log('✓ V1_UNCHANGED: PASS (V1 has 0 combinations and items are standalone)');

    // =========================================================================
    // TEST: V2_PUBLISH
    // =========================================================================
    console.log('\n[TEST 5: V2_PUBLISH] Publishing V2 (with Bi-Set)...');
    const v2Published = await publishWorkoutVersion(ctx, v2Draft.publicId);
    assert.equal(v2Published.versionNumber, 2);
    assert.equal(v2Published.status, 'PUBLISHED');
    assert.equal(v2Published.blocks[0].combinations.length, 1, 'V2 has Bi-Set published');

    // When V2 is published, V1 must transition to ARCHIVED
    const v1AfterV2Publish = await getWorkoutVersionTree(ctx, v1Published.publicId);
    assert.equal(v1AfterV2Publish.versionNumber, 1);
    assert.equal(v1AfterV2Publish.status, 'ARCHIVED', 'V1 is now ARCHIVED immutable snapshot');
    assert.equal(v1AfterV2Publish.blocks[0].combinations.length, 0, 'V1 STILL HAS ZERO COMBINATIONS');
    console.log('✓ V2_PUBLISH: PASS (V2 published, V1 archived immutably)');

    // =========================================================================
    // TEST: REEDIT_CREATES_V3
    // =========================================================================
    console.log('\n[TEST 6: REEDIT_CREATES_V3] Initiating another edit after V2 published...');
    const v3Draft = await createNewDraftVersionFromPublished(ctx, workout.publicId);
    assert.ok(v3Draft.publicId);
    assert.notEqual(v3Draft.publicId, v2Published.publicId);
    assert.equal(v3Draft.versionNumber, 3, 'Must create version 3');
    assert.equal(v3Draft.status, 'DRAFT');
    assert.equal(v3Draft.blocks[0].combinations.length, 1, 'V3 inherits V2 bi-set cleanly');

    // V2 must remain PUBLISHED
    const v2Check = await getWorkoutVersionTree(ctx, v2Published.publicId);
    assert.equal(v2Check.status, 'PUBLISHED', 'V2 remains PUBLISHED while V3 is DRAFT');
    console.log('✓ REEDIT_CREATES_V3: PASS (V3 DRAFT created, V2 unchanged)');

    // =========================================================================
    // TEST: ONLY_ONE_DRAFT
    // =========================================================================
    console.log('\n[TEST 7: ONLY_ONE_DRAFT] Calling create draft repeatedly...');
    const v3Again1 = await createNewDraftVersionFromPublished(ctx, workout.publicId);
    const v3Again2 = await createNewDraftVersionFromPublished(ctx, workout.publicId);
    assert.equal(v3Again1.publicId, v3Draft.publicId);
    assert.equal(v3Again2.publicId, v3Draft.publicId);

    const [wIdRows] = await pool.execute(`SELECT workout_id FROM workout_versions WHERE public_id = ?`, [v3Draft.publicId]);
    const workoutDbId = wIdRows[0].workout_id;
    const [draftCountRows] = await pool.execute(
      `SELECT COUNT(*) as draft_count FROM workout_versions WHERE workout_id = ? AND status = 'DRAFT'`,
      [workoutDbId]
    );
    assert.equal(draftCountRows[0].draft_count, 1, 'Must have strictly 1 active DRAFT at all times');
    console.log('✓ ONLY_ONE_DRAFT: PASS (Exactly 1 active draft exists)');

    // =========================================================================
    // TEST: PUBLISH_PUBLISHED_REJECTED
    // =========================================================================
    console.log('\n[TEST 8: PUBLISH_PUBLISHED_REJECTED] Attempting to publish non-draft versions...');
    let rejectedV2 = false;
    try {
      await publishWorkoutVersion(ctx, v2Published.publicId);
    } catch (err) {
      if (err.message.includes('Apenas versões em rascunho (DRAFT) podem ser publicadas') || err.code === 'INVALID_STATUS') {
        rejectedV2 = true;
      }
    }
    assert.equal(rejectedV2, true, 'Publishing V2 (PUBLISHED) must be rejected');

    let rejectedV1 = false;
    try {
      await publishWorkoutVersion(ctx, v1Published.publicId);
    } catch (err) {
      if (err.message.includes('Apenas versões em rascunho (DRAFT) podem ser publicadas') || err.code === 'INVALID_STATUS') {
        rejectedV1 = true;
      }
    }
    assert.equal(rejectedV1, true, 'Publishing V1 (ARCHIVED) must be rejected');
    console.log('✓ PUBLISH_PUBLISHED_REJECTED: PASS (Backend strictly blocks non-draft publish)');

    // =========================================================================
    // TEST: TEMPLATE_COPY_ISOLATION
    // =========================================================================
    console.log('\n[TEST 9: TEMPLATE_COPY_ISOLATION] Testing template -> student copy lifecycle...');
    const { workout: templateWorkout, version: templateV1Draft } = await createWorkout(ctx, {
      title: `Template Base ${Date.now()}`,
      category: 'MUSCLE_BUILDING',
      isTemplate: true,
    });

    const tplBlock = await addBlockToDraft(ctx, templateV1Draft.publicId, {
      blockType: 'CUSTOM',
      title: 'Treino Base',
    });

    const tplItem1 = await addItemToDraftBlock(ctx, tplBlock.publicId, {
      exercisePublicId: exRows[0].public_id,
      notes: 'Template Item 1',
    });
    await addSetToDraftItem(ctx, tplItem1.publicId, { targetReps: 10, targetLoadKg: 30 });

    const tplItem2 = await addItemToDraftBlock(ctx, tplBlock.publicId, {
      exercisePublicId: exRows[1].public_id,
      notes: 'Template Item 2',
    });
    await addSetToDraftItem(ctx, tplItem2.publicId, { targetReps: 12, targetLoadKg: 35 });

    const tplPublished = await publishWorkoutVersion(ctx, templateV1Draft.publicId);
    assert.equal(tplPublished.status, 'PUBLISHED');

    // Copy template to student (assign creates independent workout copy)
    const assigned = await assignTemplateToStudent(ctx, templateWorkout.publicId, studentMemberPublicId);
    assert.ok(assigned.workout.publicId);
    assert.notEqual(assigned.workout.publicId, templateWorkout.publicId);

    // Student workout has its initial published/draft copy. Edit student workout:
    const studentDraft = await createNewDraftVersionFromPublished(ctx, assigned.workout.publicId);
    assert.equal(studentDraft.status, 'DRAFT');

    // Create Bi-Set on student draft
    const stBlock = studentDraft.blocks[0];
    const stBiSet = await createWorkoutItemCombination(ctx, {
      blockPublicId: stBlock.publicId,
      combinationType: 'BI_SET',
      restAfterSeconds: 45,
      itemPublicIds: [stBlock.items[0].publicId, stBlock.items[1].publicId],
    });
    assert.ok(stBiSet.publicId);

    // Publish student workout
    const studentPublished = await publishWorkoutVersion(ctx, studentDraft.publicId);
    assert.equal(studentPublished.status, 'PUBLISHED');
    assert.equal(studentPublished.blocks[0].combinations.length, 1);

    // Template must be 100% UNTOUCHED
    const templateAfter = await getWorkoutVersionTree(ctx, tplPublished.publicId);
    assert.equal(templateAfter.status, 'PUBLISHED');
    assert.equal(templateAfter.blocks[0].combinations.length, 0, 'Template MUST REMAIN UNTOUCHED (0 combinations)');
    console.log('✓ TEMPLATE_COPY_ISOLATION: PASS (Student customized & published without altering template)');

    console.log('\n==================================================');
    console.log('ALL WORKOUT VERSIONING LIFECYCLE TESTS PASSED!');
    console.log('==================================================\n');
  } finally {
    if (tempStudentMemberId) {
      await pool.execute(`DELETE FROM consultancy_member_roles WHERE member_id = ?`, [tempStudentMemberId]).catch(() => {});
      await pool.execute(`DELETE FROM consultancy_members WHERE id = ?`, [tempStudentMemberId]).catch(() => {});
    }
    if (tempStudentUserId) {
      await pool.execute(`DELETE FROM users WHERE id = ?`, [tempStudentUserId]).catch(() => {});
    }
    await pool.end();
  }
}

runLifecycleTests().catch((err) => {
  console.error('TEST RUNNER FAILED:', err);
  process.exit(1);
});
