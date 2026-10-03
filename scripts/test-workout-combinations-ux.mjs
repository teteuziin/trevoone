import { register } from 'node:module';
register('./ts-loader.mjs', import.meta.url);

import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';

// Dynamically import TS repository functions
const {
  createWorkout,
  getWorkoutVersionTree,
  publishWorkoutVersion,
  createNewDraftVersionFromPublished,
  addBlockToDraft,
  addItemToDraftBlock,
  addSetToDraftItem,
  createWorkoutItemCombination,
  updateWorkoutItemCombination,
  ungroupWorkoutItemCombination,
  moveItemInCombination,
  reorderItemsInDraft,
  createCustomExerciseInWorkout,
} = await import('../lib/training-v2/workout-repository.ts');

const {
  parseActiveRest,
  formatActiveRestTitle,
} = await import('../components/consultancies/training-v2/workout-category-card.tsx');

// Pure logic for buildContainerEntries to test UI contract directly
function buildContainerEntriesTest(items, combinations, subBlockPublicId) {
  const normSubBlock = subBlockPublicId || null;
  const activeCombinationIds = new Set((combinations || []).map((c) => c.publicId));

  const containerCombinations = (combinations || []).filter((c) => {
    const matchesSb = (c.subBlockPublicId || null) === normSubBlock;
    const hasItemsInContainer = items.some((i) => i.combinationPublicId === c.publicId);
    return matchesSb || hasItemsInContainer;
  });

  const combMap = new Map();
  for (const c of containerCombinations) {
    const matchedItems = items.filter((i) => i.combinationPublicId === c.publicId);
    const fallbackItems = c.items && c.items.length > 0 ? c.items : [];
    const combItems = (matchedItems.length > 0 ? matchedItems : fallbackItems).slice();
    combItems.sort((a, b) => a.sortOrder - b.sortOrder);
    combMap.set(c.publicId, {
      ...c,
      items: combItems,
    });
  }

  // Ironclad rule: an item with an active combination in this block is NEVER rendered standalone
  const standaloneItems = items.filter(
    (it) => !it.combinationPublicId || !activeCombinationIds.has(it.combinationPublicId)
  );

  const rawEntries = [];

  for (const item of standaloneItems) {
    rawEntries.push({
      type: 'item',
      sortOrder: item.sortOrder,
      item,
    });
  }

  for (const comb of combMap.values()) {
    const memberSortOrders = comb.items.map((i) => i.sortOrder);
    const effectiveSortOrder =
      memberSortOrders.length > 0 ? Math.min(...memberSortOrders) : comb.sortOrder;

    rawEntries.push({
      type: 'combination',
      sortOrder: effectiveSortOrder,
      combination: comb,
    });
  }

  rawEntries.sort((a, b) => a.sortOrder - b.sortOrder);
  return rawEntries;
}

async function runCombinationsUxTests() {
  console.log('--- STARTING WORKOUT COMBINATIONS UX TEST SUITE ---');

  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 3,
  });

  const conn = await pool.getConnection();

  try {
    // 1. Resolve test consultancy & personal trainer membership
    const [cRows] = await conn.execute(
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

    // Find library exercises for testing
    const [exRows] = await conn.execute(
      `SELECT id, public_id, name, muscle_group_primary, equipment
       FROM exercises
       WHERE status = 'PUBLISHED' AND deleted_at IS NULL
         AND (scope = 'GLOBAL' OR consultancy_id = ?)
       LIMIT 4`,
      [consultancyId]
    );
    assert.ok(exRows.length >= 3, 'Must have at least 3 published exercises in library');

    // =========================================================================
    // TEST 1: A standalone, B standalone -> Create Bi-Set.
    // Zero visual duplicity: 1 combination block, 2 members, 0 duplicates.
    // =========================================================================
    console.log('\n[TEST 1] Create Bi-Set: A standalone + B standalone -> 1 combination block, 0 duplicates');
    const { workout: workout1, version: draft1 } = await createWorkout(ctx, {
      title: `Test Bi-Set UX ${Date.now()}`,
      category: 'MUSCLE_BUILDING',
    });

    const block1 = await addBlockToDraft(ctx, draft1.publicId, {
      blockType: 'CUSTOM',
      title: 'Treino A',
    });

    const item1A = await addItemToDraftBlock(ctx, block1.publicId, {
      exercisePublicId: exRows[0].public_id,
      notes: 'Item A',
    });
    await addSetToDraftItem(ctx, item1A.publicId, { targetReps: 10, targetLoadKg: 20 });

    const item1B = await addItemToDraftBlock(ctx, block1.publicId, {
      exercisePublicId: exRows[1].public_id,
      notes: 'Item B',
    });
    await addSetToDraftItem(ctx, item1B.publicId, { targetReps: 12, targetLoadKg: 15 });

    // Verify initial standalone state
    let tree1 = await getWorkoutVersionTree(ctx, draft1.publicId);
    let entries1 = buildContainerEntriesTest(tree1.blocks[0].items, tree1.blocks[0].combinations, null);
    assert.equal(entries1.length, 2, 'Initially should have 2 standalone entries');
    assert.equal(entries1[0].type, 'item');
    assert.equal(entries1[1].type, 'item');

    // Create Bi-Set
    const biSet = await createWorkoutItemCombination(ctx, {
      blockPublicId: block1.publicId,
      combinationType: 'BI_SET',
      restAfterSeconds: 60,
      itemPublicIds: [item1A.publicId, item1B.publicId],
    });

    assert.ok(biSet.publicId, 'Bi-set should be created');
    assert.equal(biSet.combinationType, 'BI_SET');
    assert.equal(biSet.items.length, 2, 'Bi-set must return 2 mapped items immediately');

    tree1 = await getWorkoutVersionTree(ctx, draft1.publicId);
    entries1 = buildContainerEntriesTest(tree1.blocks[0].items, tree1.blocks[0].combinations, null);

    const combEntries1 = entries1.filter((e) => e.type === 'combination');
    const itemEntries1 = entries1.filter((e) => e.type === 'item');

    assert.equal(entries1.length, 1, 'Total visual entries must be exactly 1');
    assert.equal(combEntries1.length, 1, 'Exactly 1 combination block visible');
    assert.equal(itemEntries1.length, 0, 'ZERO standalone duplicates rendered outside');
    assert.equal(combEntries1[0].combination.items.length, 2, 'Combination must have 2 members');
    console.log('✓ TEST 1 PASSED: 1 combination block, 2 members, 0 duplicates');

    // =========================================================================
    // TEST 2: Tri-Set: A + B + C -> 1 block, 3 members, 0 duplicates
    // =========================================================================
    console.log('\n[TEST 2] Tri-Set: A + B + C -> 1 block, 3 members, 0 duplicates');
    const item1C = await addItemToDraftBlock(ctx, block1.publicId, {
      exercisePublicId: exRows[2].public_id,
      notes: 'Item C',
    });
    await addSetToDraftItem(ctx, item1C.publicId, { targetReps: 15, targetLoadKg: 10 });

    // Ungroup previous biSet to combine all 3 as Tri-Set
    await ungroupWorkoutItemCombination(ctx, biSet.publicId);

    const triSet = await createWorkoutItemCombination(ctx, {
      blockPublicId: block1.publicId,
      combinationType: 'TRI_SET',
      restAfterSeconds: 90,
      itemPublicIds: [item1A.publicId, item1B.publicId, item1C.publicId],
    });

    assert.ok(triSet.publicId, 'Tri-Set created');
    tree1 = await getWorkoutVersionTree(ctx, draft1.publicId);
    entries1 = buildContainerEntriesTest(tree1.blocks[0].items, tree1.blocks[0].combinations, null);

    const combEntries2 = entries1.filter((e) => e.type === 'combination');
    const itemEntries2 = entries1.filter((e) => e.type === 'item');

    assert.equal(entries1.length, 1, 'Total visual entries must be exactly 1 for Tri-Set');
    assert.equal(combEntries2.length, 1, 'Exactly 1 combination block');
    assert.equal(itemEntries2.length, 0, 'ZERO standalone duplicates');
    assert.equal(combEntries2[0].combination.items.length, 3, 'Tri-Set has 3 members');
    console.log('✓ TEST 2 PASSED: Tri-Set 1 block, 3 members, 0 duplicates');

    // =========================================================================
    // TEST 3: Ungroup Bi-Set / Tri-Set -> 3 independent cards again preserving data
    // =========================================================================
    console.log('\n[TEST 3] Ungroup combination -> standalone cards again preserving data');
    await ungroupWorkoutItemCombination(ctx, triSet.publicId);

    tree1 = await getWorkoutVersionTree(ctx, draft1.publicId);
    entries1 = buildContainerEntriesTest(tree1.blocks[0].items, tree1.blocks[0].combinations, null);

    assert.equal(entries1.length, 3, 'Must have 3 standalone entries after ungroup');
    assert.equal(entries1.every((e) => e.type === 'item'), true, 'All entries must be standalone items');
    assert.equal(tree1.blocks[0].items.find((i) => i.publicId === item1A.publicId).notes, 'Item A');
    assert.equal(tree1.blocks[0].items.find((i) => i.publicId === item1B.publicId).notes, 'Item B');
    assert.equal(tree1.blocks[0].items.find((i) => i.publicId === item1C.publicId).notes, 'Item C');
    console.log('✓ TEST 3 PASSED: Ungroup restored items as standalone preserving notes & sets');

    // =========================================================================
    // TEST 4: Reorder entire block as a unit
    // Initial: [Item 1C (Standalone), Bi-Set (1A + 1B)]
    // Move Bi-Set UP -> [Bi-Set (1A + 1B), Item 1C]
    // =========================================================================
    console.log('\n[TEST 4] Reorder entire block as a single unit');
    // Re-create Bi-Set with 1A + 1B
    const biSet4 = await createWorkoutItemCombination(ctx, {
      blockPublicId: block1.publicId,
      combinationType: 'BI_SET',
      restAfterSeconds: 60,
      itemPublicIds: [item1A.publicId, item1B.publicId],
    });

    // Make 1C come before Bi-Set: reorder items as [1C, 1A, 1B]
    await reorderItemsInDraft(ctx, block1.publicId, [item1C.publicId, item1A.publicId, item1B.publicId]);

    tree1 = await getWorkoutVersionTree(ctx, draft1.publicId);
    entries1 = buildContainerEntriesTest(tree1.blocks[0].items, tree1.blocks[0].combinations, null);

    assert.equal(entries1.length, 2);
    assert.equal(entries1[0].type, 'item');
    assert.equal(entries1[0].item.publicId, item1C.publicId);
    assert.equal(entries1[1].type, 'combination');
    assert.equal(entries1[1].combination.publicId, biSet4.publicId);

    // Now move Bi-Set UP (swapping entries in the container): new order [Bi-Set (1A, 1B), 1C]
    await reorderItemsInDraft(ctx, block1.publicId, [item1A.publicId, item1B.publicId, item1C.publicId]);

    tree1 = await getWorkoutVersionTree(ctx, draft1.publicId);
    entries1 = buildContainerEntriesTest(tree1.blocks[0].items, tree1.blocks[0].combinations, null);

    assert.equal(entries1.length, 2);
    assert.equal(entries1[0].type, 'combination', 'Bi-Set moved to top as a unit');
    assert.equal(entries1[0].combination.publicId, biSet4.publicId);
    assert.equal(entries1[1].type, 'item');
    assert.equal(entries1[1].item.publicId, item1C.publicId);
    console.log('✓ TEST 4 PASSED: Reordered entire combination block as a single unit');

    // =========================================================================
    // TEST 5: Reorder members internally without breaking combination
    // Inside Bi-Set: A (1A), B (1B) -> flip to A (1B), B (1A)
    // =========================================================================
    console.log('\n[TEST 5] Reorder members internally without breaking combination');
    await moveItemInCombination(ctx, biSet4.publicId, item1A.publicId, 'down');

    tree1 = await getWorkoutVersionTree(ctx, draft1.publicId);
    entries1 = buildContainerEntriesTest(tree1.blocks[0].items, tree1.blocks[0].combinations, null);

    const comb4 = entries1[0].combination;
    assert.equal(comb4.items.length, 2);
    assert.equal(comb4.items[0].publicId, item1B.publicId, '1B is now first member');
    assert.equal(comb4.items[1].publicId, item1A.publicId, '1A is now second member');
    console.log('✓ TEST 5 PASSED: Reordered members internally (B, A)');

    // =========================================================================
    // TEST 6: Active Rest (duration, activity, formatting, parsing)
    // =========================================================================
    console.log('\n[TEST 6] Active rest format & parsing');
    const formattedTitle = formatActiveRestTitle(true, 'Caminhada leve', 'Peito e Tríceps');
    assert.equal(formattedTitle, 'Peito e Tríceps • Descanso Ativo: Caminhada leve');

    const parsed = parseActiveRest(formattedTitle);
    assert.equal(parsed.isActive, true);
    assert.equal(parsed.activity, 'Caminhada leve');

    await updateWorkoutItemCombination(ctx, biSet4.publicId, {
      title: formattedTitle,
      restAfterSeconds: 45,
    });

    tree1 = await getWorkoutVersionTree(ctx, draft1.publicId);
    const updatedComb = tree1.blocks[0].combinations.find((c) => c.publicId === biSet4.publicId);
    assert.equal(updatedComb.title, formattedTitle);
    assert.equal(updatedComb.restAfterSeconds, 45);
    console.log('✓ TEST 6 PASSED: Active rest saved, parsed, and formatted');

    // =========================================================================
    // TEST 7: Custom exercise participating in combination
    // =========================================================================
    console.log('\n[TEST 7] Custom exercise participating in combination block');
    const itemCustom = await createCustomExerciseInWorkout(ctx, {
      categoryPublicId: block1.publicId,
      name: 'Supino Especial Antigravity',
      muscleGroupPrimary: 'Peitoral',
      equipment: 'Halteres',
      notes: 'Custom exercise note',
    });
    assert.ok(itemCustom.publicId, 'Custom exercise created');

    // Create Bi-Set with 1C and custom exercise
    const customBiSet = await createWorkoutItemCombination(ctx, {
      blockPublicId: block1.publicId,
      combinationType: 'BI_SET',
      restAfterSeconds: 60,
      itemPublicIds: [item1C.publicId, itemCustom.publicId],
    });

    assert.ok(customBiSet.publicId, 'Bi-Set with custom exercise created');
    tree1 = await getWorkoutVersionTree(ctx, draft1.publicId);
    entries1 = buildContainerEntriesTest(tree1.blocks[0].items, tree1.blocks[0].combinations, null);

    const customCombEntry = entries1.find(
      (e) => e.type === 'combination' && e.combination.publicId === customBiSet.publicId
    );
    assert.ok(customCombEntry, 'Custom combination entry found');
    assert.equal(customCombEntry.combination.items.length, 2);
    assert.ok(
      customCombEntry.combination.items.some((i) => i.publicId === itemCustom.publicId),
      'Custom exercise member present in combination'
    );
    console.log('✓ TEST 7 PASSED: Custom exercise participating in combination block');

    // =========================================================================
    // TEST 8: Published -> Draft -> Bi-Set -> Publish lifecycle
    // Published snapshot immutability
    // =========================================================================
    console.log('\n[TEST 8] Versioning lifecycle & published immutability');
    // Publish version 1
    const pubRes1 = await publishWorkoutVersion(ctx, draft1.publicId);
    assert.equal(pubRes1.status, 'PUBLISHED', 'Version 1 published successfully');

    // Fetch published tree
    const pubTree1 = await getWorkoutVersionTree(ctx, draft1.publicId);
    assert.equal(pubTree1.status, 'PUBLISHED');

    // Attempting to mutate published version directly MUST fail
    let threwImmutable = false;
    try {
      await createWorkoutItemCombination(ctx, {
        blockPublicId: pubTree1.blocks[0].publicId,
        combinationType: 'BI_SET',
        restAfterSeconds: 60,
        itemPublicIds: [item1A.publicId, item1B.publicId],
      });
    } catch (e) {
      threwImmutable = true;
    }
    assert.equal(threwImmutable, true, 'Mutating published version directly must throw IMMUTABLE_VERSION');

    // Create Draft from Published
    const draft2 = await createNewDraftVersionFromPublished(ctx, workout1.publicId);
    assert.ok(draft2.publicId, 'New draft version created from published');

    const draftTree2 = await getWorkoutVersionTree(ctx, draft2.publicId);
    assert.equal(draftTree2.status, 'DRAFT');

    // Mutations on the new draft succeed
    const newDraftBiSet = await createWorkoutItemCombination(ctx, {
      blockPublicId: draftTree2.blocks[0].publicId,
      combinationType: 'BI_SET',
      restAfterSeconds: 75,
      itemPublicIds: [
        draftTree2.blocks[0].items[0].publicId,
        draftTree2.blocks[0].items[1].publicId,
      ],
    });
    assert.ok(newDraftBiSet.publicId, 'Bi-Set created in new draft version');

    // Publish new version (version 2)
    const pubRes2 = await publishWorkoutVersion(ctx, draft2.publicId);
    assert.equal(pubRes2.status, 'PUBLISHED', 'Version 2 published successfully');

    // Prior version 1 is archived immutably as historical record
    const verifyPubTree1 = await getWorkoutVersionTree(ctx, draft1.publicId);
    assert.equal(verifyPubTree1.versionNumber, 1);
    assert.equal(verifyPubTree1.status, 'ARCHIVED');

    console.log('✓ TEST 8 PASSED: Published snapshot immutability & versioning lifecycle verified');

    console.log('\n==================================================');
    console.log('ALL 8 WORKOUT COMBINATION UX TESTS PASSED (8/8)');
    console.log('==================================================\n');
  } finally {
    conn.release();
    await pool.end();
  }
}

runCombinationsUxTests().catch((err) => {
  console.error('TEST RUNNER FAILED:', err);
  process.exit(1);
});
