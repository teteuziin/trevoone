import { register } from 'node:module';
register('./ts-loader.mjs', import.meta.url);

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Load .env.local
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
} catch (e) {}

const {
  confirmNutritionAiImport,
  normalizePrescribedUnitCode,
} = await import('../lib/nutrition-v2/nutrition-ai-importer.ts');

const {
  getPlanVersionTreeByPlanPublicId,
  updateMealItem,
  publishPlanVersion,
} = await import('../lib/nutrition-v2/plan-repository.ts');

const { getDbPool } = await import('../lib/db/mysql.ts');

async function runSuite() {
  console.log("==================================================");
  console.log("TREVO ONE — NUTRITION V2 NON-BLOCKING REVIEW SUITE");
  console.log("==================================================\n");

  const db = getDbPool();
  let c1Id = null;
  let c2Id = null;
  let coachMemberId = null;
  let coachUserId = null;
  let coachMemberPublicId = null;
  let studentMemberId = null;
  let studentUserId = null;

  // Track initial counts
  const [initFoodRows] = await db.query('SELECT COUNT(*) as cnt FROM nutrition_v2_foods');
  const [initAliasRows] = await db.query('SELECT COUNT(*) as cnt FROM nutrition_v2_food_aliases');
  const [initPlanRows] = await db.query('SELECT COUNT(*) as cnt FROM nutrition_v2_plans');
  const initialFoodCount = Number(initFoodRows[0].cnt);
  const initialAliasCount = Number(initAliasRows[0].cnt);
  const initialPlanCount = Number(initPlanRows[0].cnt);

  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      passed++;
      console.log(`[PASS] ${name}`);
    } catch (err) {
      console.error(`[FAIL] ${name}: ${err.message}`);
      throw err;
    }
  }

  try {
    // Setup Test Consultancy & Member
    const uniqueSuffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const slug1 = `test-cons-a-${uniqueSuffix}`;
    const slug2 = `test-cons-b-${uniqueSuffix}`;

    const [c1Res] = await db.query(
      `INSERT INTO consultancies (public_id, name, slug, status, created_at, updated_at)
       VALUES (?, ?, ?, 'ACTIVE', NOW(3), NOW(3))`,
      [crypto.randomUUID(), `Consultoria A ${uniqueSuffix}`, slug1]
    );
    c1Id = c1Res.insertId;

    const [c2Res] = await db.query(
      `INSERT INTO consultancies (public_id, name, slug, status, created_at, updated_at)
       VALUES (?, ?, ?, 'ACTIVE', NOW(3), NOW(3))`,
      [crypto.randomUUID(), `Consultoria B ${uniqueSuffix}`, slug2]
    );
    c2Id = c2Res.insertId;

    const [uCoachRes] = await db.query(
      `INSERT INTO users (public_id, email, password_hash, full_name, created_at, updated_at)
       VALUES (?, ?, 'hash', 'Nutricionista Teste', NOW(3), NOW(3))`,
      [crypto.randomUUID(), `nutri-${uniqueSuffix}@test.com`]
    );
    coachUserId = uCoachRes.insertId;

    coachMemberPublicId = crypto.randomUUID();
    const [mCoachRes] = await db.query(
      `INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, created_at, updated_at)
       VALUES (?, ?, ?, 'ACTIVE', NOW(3), NOW(3))`,
      [coachMemberPublicId, c1Id, coachUserId]
    );
    coachMemberId = mCoachRes.insertId;

    await db.query(
      `INSERT INTO consultancy_member_roles (member_id, role, created_at)
       VALUES (?, 'NUTRITIONIST', NOW(3))`,
      [coachMemberId]
    );

    const mockCtx = {
      consultancyId: Number(c1Id),
      membershipId: Number(coachMemberId),
      userId: Number(coachUserId),
      activeRole: 'NUTRITIONIST',
      hasRole: (r) => r === 'NUTRITIONIST',
      canViewNutrition: true,
      canAuthorNutrition: true,
    };

    const mockCtxB = {
      consultancyId: Number(c2Id),
      membershipId: 999999,
      userId: 999999,
      activeRole: 'NUTRITIONIST',
      hasRole: (r) => r === 'NUTRITIONIST',
      canViewNutrition: true,
      canAuthorNutrition: true,
    };

    // Grab a known library food for reference
    const [sampleFoods] = await db.query(
      `SELECT id, public_id, name, display_name_pt_br, calories_kcal, protein_g, carbohydrate_g, fat_g, reference_amount, reference_unit_code
       FROM nutrition_v2_foods WHERE status = 'ACTIVE' AND calories_kcal > 0 LIMIT 15`
    );
    assert.ok(sampleFoods.length >= 10, 'Must have at least 10 sample foods in Food Library');
    const food0 = sampleFoods[0];
    const food1 = sampleFoods[1];

    // =========================================================================
    // 1. BASELINE REAL 114 FOODS TEST
    // =========================================================================
    await test("Baseline 114 foods: 83 matched, 30 review, 1 not found -> SAVE DRAFT PASS, 114 preserved, 0 lost", async () => {
      const fixturePath = path.resolve(process.cwd(), 'data/fixtures/nutrition-baseline-114.json');
      assert.ok(fs.existsSync(fixturePath), 'Baseline fixture must exist');
      const baseline = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

      assert.equal(baseline.stats.totalFoods, 114);
      assert.equal(baseline.stats.matchedCount, 83);
      assert.equal(baseline.stats.ambiguousCount, 30);
      assert.equal(baseline.stats.notFoundCount, 1);

      const jobPublicId = crypto.randomUUID();
      await db.query(
        `INSERT INTO ai_import_jobs (public_id, idempotency_key, consultancy_id, member_id, user_id, feature, status, source_filename, source_hash, source_type, file_size_bytes, target_student_membership_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'NUTRITION_IMPORT', 'PROCESSED', 'baseline-114.pdf', 'hash114', 'PDF', 2048, NULL, NOW(3), NOW(3))`,
        [jobPublicId, crypto.randomUUID(), c1Id, coachMemberId, coachUserId]
      );

      // Confirm import with all 114 items (non-blocking!)
      const confirmRes = await confirmNutritionAiImport({
        consultancyId: c1Id,
        memberId: coachMemberId,
        userId: coachUserId,
        role: 'NUTRITIONIST',
        jobPublicId,
        targetPatientMembershipId: null,
        confirmedTitle: 'Plano Baseline 114 Itens',
        confirmedMeals: baseline.meals,
      });

      assert.ok(confirmRes.planPublicId, 'Plan public ID must be created');
      assert.ok(confirmRes.versionPublicId, 'Version public ID must be created');

      // Verify DB persistence of all 114 items
      const [itemRows] = await db.query(
        `SELECT mi.id, mi.food_id, mi.food_name_snapshot, mi.calories_kcal_snapshot, mi.prescribed_quantity, mi.prescribed_unit_code
         FROM nutrition_v2_meal_items mi
         INNER JOIN nutrition_v2_meals m ON m.id = mi.meal_id
         INNER JOIN nutrition_v2_plan_versions pv ON pv.id = m.nutrition_plan_version_id
         WHERE pv.public_id = ?`,
        [confirmRes.versionPublicId]
      );

      const [subRows] = await db.query(
        `SELECT s.id, s.food_id, s.food_name_snapshot, s.calories_kcal_snapshot
         FROM nutrition_v2_item_substitutions s
         INNER JOIN nutrition_v2_meal_items mi ON mi.id = s.meal_item_id
         INNER JOIN nutrition_v2_meals m ON m.id = mi.meal_id
         INNER JOIN nutrition_v2_plan_versions pv ON pv.id = m.nutrition_plan_version_id
         WHERE pv.public_id = ?`,
        [confirmRes.versionPublicId]
      );

      const totalPersisted = itemRows.length + subRows.length;
      assert.equal(totalPersisted, 114, `Expected exactly 114 items persisted, got ${totalPersisted}`);

      // Count resolved vs unresolved
      let persistedResolved = 0;
      let persistedUnresolved = 0;
      for (const row of [...itemRows, ...subRows]) {
        if (row.food_id != null) {
          persistedResolved++;
        } else {
          persistedUnresolved++;
          assert.equal(row.calories_kcal_snapshot, null, 'Unresolved food must have NULL calories, never fabricated zero');
        }
      }

      assert.equal(persistedResolved, 83, `Expected exactly 83 resolved items, got ${persistedResolved}`);
      assert.equal(persistedUnresolved, 31, `Expected exactly 31 unresolved items (30 review + 1 not found), got ${persistedUnresolved}`);

      // Verify reopen via getPlanVersionTreeByPlanPublicId
      const tree = await getPlanVersionTreeByPlanPublicId(mockCtx, confirmRes.planPublicId, confirmRes.versionPublicId);
      assert.ok(tree, 'Plan tree must load successfully upon reopen');
      assert.equal(tree.version.status, 'DRAFT');
      assert.equal(tree.dailyTotals.hasIncompleteData, true, 'Daily totals must indicate incomplete data');
      assert.ok(tree.dailyTotals.caloriesKcal > 0, 'Subtotal of known items must be computed');
    });

    // =========================================================================
    // 2. TEST A: 10 FOUND, 0 REVIEW, 0 NOT_FOUND -> CREATE PASS
    // =========================================================================
    await test("Test A: 10 FOUND, 0 REVIEW, 0 NOT_FOUND -> CREATE PASS", async () => {
      const jobA = crypto.randomUUID();
      await db.query(
        `INSERT INTO ai_import_jobs (public_id, idempotency_key, consultancy_id, member_id, user_id, feature, status, source_filename, source_hash, source_type, file_size_bytes, target_student_membership_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'NUTRITION_IMPORT', 'PROCESSED', 'test-a.pdf', 'hashA', 'PDF', 1000, NULL, NOW(3), NOW(3))`,
        [jobA, crypto.randomUUID(), c1Id, coachMemberId, coachUserId]
      );

      const foodsA = sampleFoods.slice(0, 10).map((sf, idx) => ({
        id: `f-${idx}`,
        originalText: sf.name,
        foodNameCandidate: sf.name,
        foodNameSnapshot: sf.display_name_pt_br || sf.name,
        matchStatus: 'MATCHED',
        foodPublicId: sf.public_id,
        quantity: 100,
        unitCandidate: 'g',
        notes: null,
        candidates: [],
        authoritativeNutrients: {
          caloriesKcal: Number(sf.calories_kcal),
          proteinG: Number(sf.protein_g),
          carbsG: Number(sf.carbohydrate_g),
          fatG: Number(sf.fat_g),
          fiberG: null,
        },
        sourceDocumentClaim: null,
      }));

      const resA = await confirmNutritionAiImport({
        consultancyId: c1Id,
        memberId: coachMemberId,
        userId: coachUserId,
        role: 'NUTRITIONIST',
        jobPublicId: jobA,
        confirmedTitle: 'Plano Test A',
        confirmedMeals: [{ name: 'Refeição 1', time: '08:00', notes: null, foods: foodsA }],
      });

      assert.ok(resA.planPublicId);
      const treeA = await getPlanVersionTreeByPlanPublicId(mockCtx, resA.planPublicId, resA.versionPublicId);
      assert.equal(treeA.meals[0].items.length, 10);
      assert.equal(treeA.dailyTotals.hasIncompleteData, false);
      assert.ok(treeA.dailyTotals.caloriesKcal > 0);
    });

    // =========================================================================
    // 3. TEST B: 8 FOUND, 2 NEEDS_REVIEW -> CREATE PASS
    // =========================================================================
    await test("Test B: 8 FOUND, 2 NEEDS_REVIEW -> CREATE PASS", async () => {
      const jobB = crypto.randomUUID();
      await db.query(
        `INSERT INTO ai_import_jobs (public_id, idempotency_key, consultancy_id, member_id, user_id, feature, status, source_filename, source_hash, source_type, file_size_bytes, target_student_membership_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'NUTRITION_IMPORT', 'PROCESSED', 'test-b.pdf', 'hashB', 'PDF', 1000, NULL, NOW(3), NOW(3))`,
        [jobB, crypto.randomUUID(), c1Id, coachMemberId, coachUserId]
      );

      const foodsB = [
        ...sampleFoods.slice(0, 8).map((sf, idx) => ({
          id: `fb-${idx}`,
          originalText: sf.name,
          foodNameCandidate: sf.name,
          foodNameSnapshot: sf.display_name_pt_br || sf.name,
          matchStatus: 'MATCHED',
          foodPublicId: sf.public_id,
          quantity: 100,
          unitCandidate: 'g',
          notes: null,
          candidates: [],
          authoritativeNutrients: { caloriesKcal: 100, proteinG: 5, carbsG: 10, fatG: 2, fiberG: null },
          sourceDocumentClaim: null,
        })),
        {
          id: 'fb-rev-1',
          originalText: 'Peixe branco grelhado',
          foodNameCandidate: 'peixe',
          foodNameSnapshot: 'Peixe branco grelhado',
          matchStatus: 'AMBIGUOUS',
          foodPublicId: null,
          quantity: 150,
          unitCandidate: 'g',
          notes: 'Preferir tilápia ou pescada',
          candidates: [],
          authoritativeNutrients: null,
          sourceDocumentClaim: null,
        },
        {
          id: 'fb-rev-2',
          originalText: 'Queijo branco',
          foodNameCandidate: 'queijo',
          foodNameSnapshot: 'Queijo branco',
          matchStatus: 'AMBIGUOUS',
          foodPublicId: null,
          quantity: 2,
          unitCandidate: 'fatias',
          notes: null,
          candidates: [],
          authoritativeNutrients: null,
          sourceDocumentClaim: null,
        },
      ];

      const resB = await confirmNutritionAiImport({
        consultancyId: c1Id,
        memberId: coachMemberId,
        userId: coachUserId,
        role: 'NUTRITIONIST',
        jobPublicId: jobB,
        confirmedTitle: 'Plano Test B',
        confirmedMeals: [{ name: 'Almoço', time: '12:00', notes: null, foods: foodsB }],
      });

      assert.ok(resB.planPublicId);
      const treeB = await getPlanVersionTreeByPlanPublicId(mockCtx, resB.planPublicId, resB.versionPublicId);
      assert.equal(treeB.meals[0].items.length, 10);
      assert.equal(treeB.dailyTotals.hasIncompleteData, true);
    });

    // =========================================================================
    // 4. TEST C: 8 FOUND, 1 REVIEW, 1 NOT_FOUND -> CREATE PASS
    // =========================================================================
    await test("Test C: 8 FOUND, 1 REVIEW, 1 NOT_FOUND -> CREATE PASS", async () => {
      const jobC = crypto.randomUUID();
      await db.query(
        `INSERT INTO ai_import_jobs (public_id, idempotency_key, consultancy_id, member_id, user_id, feature, status, source_filename, source_hash, source_type, file_size_bytes, target_student_membership_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'NUTRITION_IMPORT', 'PROCESSED', 'test-c.pdf', 'hashC', 'PDF', 1000, NULL, NOW(3), NOW(3))`,
        [jobC, crypto.randomUUID(), c1Id, coachMemberId, coachUserId]
      );

      const foodsC = [
        ...sampleFoods.slice(0, 8).map((sf, idx) => ({
          id: `fc-${idx}`,
          originalText: sf.name,
          foodNameCandidate: sf.name,
          foodNameSnapshot: sf.display_name_pt_br || sf.name,
          matchStatus: 'MATCHED',
          foodPublicId: sf.public_id,
          quantity: 100,
          unitCandidate: 'g',
          notes: null,
          candidates: [],
          authoritativeNutrients: { caloriesKcal: 100, proteinG: 5, carbsG: 10, fatG: 2, fiberG: null },
          sourceDocumentClaim: null,
        })),
        {
          id: 'fc-rev-1',
          originalText: 'Carne vermelha',
          foodNameCandidate: 'carne',
          foodNameSnapshot: 'Carne vermelha',
          matchStatus: 'AMBIGUOUS',
          foodPublicId: null,
          quantity: 120,
          unitCandidate: 'g',
          notes: null,
          candidates: [],
          authoritativeNutrients: null,
          sourceDocumentClaim: null,
        },
        {
          id: 'fc-not-1',
          originalText: 'Fruta Exótica da Micronésia',
          foodNameCandidate: 'fruta exótica da micronésia',
          foodNameSnapshot: 'Fruta Exótica da Micronésia',
          matchStatus: 'NOT_FOUND',
          foodPublicId: null,
          quantity: 1,
          unitCandidate: 'unidade',
          notes: null,
          candidates: [],
          authoritativeNutrients: null,
          sourceDocumentClaim: null,
        },
      ];

      const resC = await confirmNutritionAiImport({
        consultancyId: c1Id,
        memberId: coachMemberId,
        userId: coachUserId,
        role: 'NUTRITIONIST',
        jobPublicId: jobC,
        confirmedTitle: 'Plano Test C',
        confirmedMeals: [{ name: 'Jantar', time: '20:00', notes: null, foods: foodsC }],
      });

      assert.ok(resC.planPublicId);
      const treeC = await getPlanVersionTreeByPlanPublicId(mockCtx, resC.planPublicId, resC.versionPublicId);
      assert.equal(treeC.meals[0].items.length, 10);
      assert.equal(treeC.dailyTotals.hasIncompleteData, true);
    });

    // =========================================================================
    // 5. TEST D: 0 FOUND, 3 NEEDS_REVIEW -> SAVE DRAFT PASS
    // =========================================================================
    await test("Test D: 0 FOUND, 3 NEEDS_REVIEW -> SAVE DRAFT PASS", async () => {
      const jobD = crypto.randomUUID();
      await db.query(
        `INSERT INTO ai_import_jobs (public_id, idempotency_key, consultancy_id, member_id, user_id, feature, status, source_filename, source_hash, source_type, file_size_bytes, target_student_membership_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'NUTRITION_IMPORT', 'PROCESSED', 'test-d.pdf', 'hashD', 'PDF', 1000, NULL, NOW(3), NOW(3))`,
        [jobD, crypto.randomUUID(), c1Id, coachMemberId, coachUserId]
      );

      const foodsD = [
        { id: 'd-1', originalText: 'Carne', foodNameCandidate: 'carne', foodNameSnapshot: 'Carne', matchStatus: 'AMBIGUOUS', foodPublicId: null, quantity: 100, unitCandidate: 'g', notes: null, candidates: [], authoritativeNutrients: null, sourceDocumentClaim: null },
        { id: 'd-2', originalText: 'Queijo', foodNameCandidate: 'queijo', foodNameSnapshot: 'Queijo', matchStatus: 'AMBIGUOUS', foodPublicId: null, quantity: 30, unitCandidate: 'g', notes: null, candidates: [], authoritativeNutrients: null, sourceDocumentClaim: null },
        { id: 'd-3', originalText: 'Peixe', foodNameCandidate: 'peixe', foodNameSnapshot: 'Peixe', matchStatus: 'AMBIGUOUS', foodPublicId: null, quantity: 150, unitCandidate: 'g', notes: null, candidates: [], authoritativeNutrients: null, sourceDocumentClaim: null },
      ];

      const resD = await confirmNutritionAiImport({
        consultancyId: c1Id,
        memberId: coachMemberId,
        userId: coachUserId,
        role: 'NUTRITIONIST',
        jobPublicId: jobD,
        confirmedTitle: 'Plano Test D',
        confirmedMeals: [{ name: 'Lanche', time: '16:00', notes: null, foods: foodsD }],
      });

      assert.ok(resD.planPublicId);
      const treeD = await getPlanVersionTreeByPlanPublicId(mockCtx, resD.planPublicId, resD.versionPublicId);
      assert.equal(treeD.meals[0].items.length, 3);
      assert.equal(treeD.dailyTotals.hasIncompleteData, true);
      assert.equal(treeD.dailyTotals.caloriesKcal, 0); // 0 because 0 known foods, but empty = false, hasIncompleteData = true
    });

    // =========================================================================
    // 6. TEST E: 0 FOUND, 3 NOT_FOUND -> SAVE DRAFT PASS
    // =========================================================================
    await test("Test E: 0 FOUND, 3 NOT_FOUND -> SAVE DRAFT PASS", async () => {
      const jobE = crypto.randomUUID();
      await db.query(
        `INSERT INTO ai_import_jobs (public_id, idempotency_key, consultancy_id, member_id, user_id, feature, status, source_filename, source_hash, source_type, file_size_bytes, target_student_membership_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'NUTRITION_IMPORT', 'PROCESSED', 'test-e.pdf', 'hashE', 'PDF', 1000, NULL, NOW(3), NOW(3))`,
        [jobE, crypto.randomUUID(), c1Id, coachMemberId, coachUserId]
      );

      const foodsE = [
        { id: 'e-1', originalText: 'Fruta Alienígena 1', foodNameCandidate: 'fruta alien 1', foodNameSnapshot: 'Fruta Alienígena 1', matchStatus: 'NOT_FOUND', foodPublicId: null, quantity: 1, unitCandidate: 'unidade', notes: null, candidates: [], authoritativeNutrients: null, sourceDocumentClaim: null },
        { id: 'e-2', originalText: 'Fruta Alienígena 2', foodNameCandidate: 'fruta alien 2', foodNameSnapshot: 'Fruta Alienígena 2', matchStatus: 'NOT_FOUND', foodPublicId: null, quantity: 1, unitCandidate: 'unidade', notes: null, candidates: [], authoritativeNutrients: null, sourceDocumentClaim: null },
        { id: 'e-3', originalText: 'Fruta Alienígena 3', foodNameCandidate: 'fruta alien 3', foodNameSnapshot: 'Fruta Alienígena 3', matchStatus: 'NOT_FOUND', foodPublicId: null, quantity: 1, unitCandidate: 'unidade', notes: null, candidates: [], authoritativeNutrients: null, sourceDocumentClaim: null },
      ];

      const resE = await confirmNutritionAiImport({
        consultancyId: c1Id,
        memberId: coachMemberId,
        userId: coachUserId,
        role: 'NUTRITIONIST',
        jobPublicId: jobE,
        confirmedTitle: 'Plano Test E',
        confirmedMeals: [{ name: 'Ceia', time: '22:00', notes: null, foods: foodsE }],
      });

      assert.ok(resE.planPublicId);
      const treeE = await getPlanVersionTreeByPlanPublicId(mockCtx, resE.planPublicId, resE.versionPublicId);
      assert.equal(treeE.meals[0].items.length, 3);
      assert.equal(treeE.dailyTotals.hasIncompleteData, true);
    });

    // =========================================================================
    // 7. TEST F: RESOLVE AFTER SAVE (FULL REOPEN + RESOLUTION CYCLE)
    // =========================================================================
    await test("Test F: Resolve After Save (Draft with unresolved -> Reopen -> Resolve to Food Library -> Recalculates)", async () => {
      const jobF = crypto.randomUUID();
      await db.query(
        `INSERT INTO ai_import_jobs (public_id, idempotency_key, consultancy_id, member_id, user_id, feature, status, source_filename, source_hash, source_type, file_size_bytes, target_student_membership_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'NUTRITION_IMPORT', 'PROCESSED', 'test-f.pdf', 'hashF', 'PDF', 1000, NULL, NOW(3), NOW(3))`,
        [jobF, crypto.randomUUID(), c1Id, coachMemberId, coachUserId]
      );

      const foodsF = [
        {
          id: 'f-item-unresolved',
          originalText: 'Pão caseiro integral',
          foodNameCandidate: 'pão caseiro integral',
          foodNameSnapshot: 'Pão caseiro integral',
          matchStatus: 'AMBIGUOUS',
          foodPublicId: null,
          quantity: 50,
          unitCandidate: 'g',
          notes: 'Receita caseira',
          candidates: [],
          authoritativeNutrients: null,
          sourceDocumentClaim: null,
        },
      ];

      const resF = await confirmNutritionAiImport({
        consultancyId: c1Id,
        memberId: coachMemberId,
        userId: coachUserId,
        role: 'NUTRITIONIST',
        jobPublicId: jobF,
        confirmedTitle: 'Plano Test F - Resolve After Save',
        confirmedMeals: [{ name: 'Café da Manhã', time: '07:30', notes: null, foods: foodsF }],
      });

      // 1. Initial reopen: food_id is NULL, calories null
      const treeBefore = await getPlanVersionTreeByPlanPublicId(mockCtx, resF.planPublicId, resF.versionPublicId);
      assert.equal(treeBefore.meals[0].items.length, 1);
      const itemBefore = treeBefore.meals[0].items[0];
      assert.equal(itemBefore.foodId, null, 'Before resolution, foodId must be null');
      assert.equal(itemBefore.caloriesKcalSnapshot, null, 'Before resolution, calories must be null');
      assert.equal(treeBefore.dailyTotals.hasIncompleteData, true);

      // 2. Professional resolves the item by selecting a real Food from Food Library
      const targetFood = sampleFoods[0];
      const updateRes = await updateMealItem(mockCtx, itemBefore.publicId, {
        foodPublicId: targetFood.public_id,
        prescribedQuantity: 100,
        prescribedUnitCode: 'G',
        prescribedUnitLabel: 'g',
      });
      assert.equal(updateRes.success, true);

      // 3. Second reopen: food_id is now real, calories & macros recalculated from Food Library!
      const treeAfter = await getPlanVersionTreeByPlanPublicId(mockCtx, resF.planPublicId, resF.versionPublicId);
      const itemAfter = treeAfter.meals[0].items[0];
      assert.ok(itemAfter.foodId != null, 'After resolution, foodId must be non-null');
      assert.equal(itemAfter.foodPublicId, targetFood.public_id);
      assert.ok(itemAfter.caloriesKcalSnapshot > 0, 'After resolution, calories must be calculated');
      assert.equal(treeAfter.dailyTotals.hasIncompleteData, false, 'Daily totals are now complete');
      assert.equal(treeAfter.dailyTotals.caloriesKcal, itemAfter.caloriesKcalSnapshot);
    });

    // =========================================================================
    // 8. TEST G: PUBLISH PLAN VERSION WITH REVIEW ITEMS
    // =========================================================================
    await test("Test G: Publish Plan Version with Review Items (Allowed with non-blocking warning condition)", async () => {
      const jobG = crypto.randomUUID();
      await db.query(
        `INSERT INTO ai_import_jobs (public_id, idempotency_key, consultancy_id, member_id, user_id, feature, status, source_filename, source_hash, source_type, file_size_bytes, target_student_membership_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'NUTRITION_IMPORT', 'PROCESSED', 'test-g.pdf', 'hashG', 'PDF', 1000, NULL, NOW(3), NOW(3))`,
        [jobG, crypto.randomUUID(), c1Id, coachMemberId, coachUserId]
      );

      const foodsG = [
        ...sampleFoods.slice(0, 8).map((sf, idx) => ({
          id: `fg-${idx}`,
          originalText: sf.name,
          foodNameCandidate: sf.name,
          foodNameSnapshot: sf.display_name_pt_br || sf.name,
          matchStatus: 'MATCHED',
          foodPublicId: sf.public_id,
          quantity: 100,
          unitCandidate: 'g',
          notes: null,
          candidates: [],
          authoritativeNutrients: { caloriesKcal: 100, proteinG: 5, carbsG: 10, fatG: 2, fiberG: null },
          sourceDocumentClaim: null,
        })),
        {
          id: 'fg-rev-1',
          originalText: 'Suplemento proteico especial',
          foodNameCandidate: 'suplemento proteico especial',
          foodNameSnapshot: 'Suplemento proteico especial',
          matchStatus: 'AMBIGUOUS',
          foodPublicId: null,
          quantity: 30,
          unitCandidate: 'g',
          notes: 'Aguardando definição da marca',
          candidates: [],
          authoritativeNutrients: null,
          sourceDocumentClaim: null,
        },
      ];

      const resG = await confirmNutritionAiImport({
        consultancyId: c1Id,
        memberId: coachMemberId,
        userId: coachUserId,
        role: 'NUTRITIONIST',
        jobPublicId: jobG,
        confirmedTitle: 'Plano Para Publicação com Review',
        confirmedMeals: [{ name: 'Lanche da Tarde', time: '15:30', notes: null, foods: foodsG }],
      });

      // Publish draft version with review item
      const pubRes = await publishPlanVersion(mockCtx, resG.planPublicId, resG.versionPublicId);
      assert.equal(pubRes.success, true);
      assert.equal(pubRes.status, 'PUBLISHED');

      // Verify status in DB
      const [vRows] = await db.query(
        'SELECT status, published_at FROM nutrition_v2_plan_versions WHERE public_id = ?',
        [resG.versionPublicId]
      );
      assert.equal(vRows[0].status, 'PUBLISHED');
      assert.ok(vRows[0].published_at != null);

      // Verify tree retains pending review status and partial totals
      const publishedTree = await getPlanVersionTreeByPlanPublicId(mockCtx, resG.planPublicId, resG.versionPublicId);
      assert.equal(publishedTree.version.status, 'PUBLISHED');
      assert.equal(publishedTree.dailyTotals.hasIncompleteData, true);
      assert.ok(publishedTree.meals[0].items.some(it => it.foodId == null), 'Pending review item preserved in published version');
    });

    // =========================================================================
    // 9. TEST H: TENANCY & CROSS-TENANT ISOLATION
    // =========================================================================
    await test("Test H: Tenancy & Isolation (Cross-tenant access strictly denied)", async () => {
      const jobH = crypto.randomUUID();
      await db.query(
        `INSERT INTO ai_import_jobs (public_id, idempotency_key, consultancy_id, member_id, user_id, feature, status, source_filename, source_hash, source_type, file_size_bytes, target_student_membership_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'NUTRITION_IMPORT', 'PROCESSED', 'test-h.pdf', 'hashH', 'PDF', 1000, NULL, NOW(3), NOW(3))`,
        [jobH, crypto.randomUUID(), c1Id, coachMemberId, coachUserId]
      );

      // Try confirming Consultancy A's job using Consultancy B context -> must fail
      let deniedConfirm = false;
      try {
        await confirmNutritionAiImport({
          consultancyId: c2Id, // Cross-tenant!
          memberId: 999999,
          userId: 999999,
          role: 'NUTRITIONIST',
          jobPublicId: jobH,
          confirmedMeals: [{ name: 'Café', time: null, notes: null, foods: [] }],
        });
      } catch (e) {
        deniedConfirm = true;
      }
      assert.equal(deniedConfirm, true, 'Confirming import job of another consultancy must be denied');
    });

    // =========================================================================
    // 10. TEST I: UNIT NORMALIZATION IN IMPORT
    // =========================================================================
    await test("Test I: Prescribed Unit Normalization (Colheres, fatias, à vontade)", () => {
      assert.equal(normalizePrescribedUnitCode('colher de sopa'), 'COLHER_SOPA');
      assert.equal(normalizePrescribedUnitCode('colheres de sopa'), 'COLHER_SOPA');
      assert.equal(normalizePrescribedUnitCode('fatia'), 'FATIA');
      assert.equal(normalizePrescribedUnitCode('fatias'), 'FATIA');
      assert.equal(normalizePrescribedUnitCode('g'), 'G');
      assert.equal(normalizePrescribedUnitCode('gramas'), 'G');
      assert.equal(normalizePrescribedUnitCode('ml'), 'ML');
      assert.equal(normalizePrescribedUnitCode('xícara'), 'XICARA');
      assert.equal(normalizePrescribedUnitCode('scoop'), 'SCOOP');
      assert.equal(normalizePrescribedUnitCode('à vontade'), 'PORCAO');
      assert.equal(normalizePrescribedUnitCode('a gosto'), 'PORCAO');
    });

  } finally {
    // Teardown test fixtures cleanly
    try {
      console.log("\n--- Cleaning up test fixtures ---");
      if (c1Id && c2Id) {
        await db.query(`DELETE FROM nutrition_v2_item_substitutions WHERE meal_item_id IN (SELECT id FROM nutrition_v2_meal_items WHERE meal_id IN (SELECT id FROM nutrition_v2_meals WHERE nutrition_plan_version_id IN (SELECT id FROM nutrition_v2_plan_versions WHERE nutrition_plan_id IN (SELECT id FROM nutrition_v2_plans WHERE consultancy_id IN (?, ?)))))`, [c1Id, c2Id]);
        await db.query(`DELETE FROM nutrition_v2_meal_items WHERE meal_id IN (SELECT id FROM nutrition_v2_meals WHERE nutrition_plan_version_id IN (SELECT id FROM nutrition_v2_plan_versions WHERE nutrition_plan_id IN (SELECT id FROM nutrition_v2_plans WHERE consultancy_id IN (?, ?))))`, [c1Id, c2Id]);
        await db.query(`DELETE FROM nutrition_v2_meals WHERE nutrition_plan_version_id IN (SELECT id FROM nutrition_v2_plan_versions WHERE nutrition_plan_id IN (SELECT id FROM nutrition_v2_plans WHERE consultancy_id IN (?, ?)))`, [c1Id, c2Id]);
        await db.query(`DELETE FROM nutrition_v2_plan_versions WHERE nutrition_plan_id IN (SELECT id FROM nutrition_v2_plans WHERE consultancy_id IN (?, ?))`, [c1Id, c2Id]);
        await db.query(`DELETE FROM nutrition_v2_plans WHERE consultancy_id IN (?, ?)`, [c1Id, c2Id]);
        await db.query(`DELETE FROM ai_import_jobs WHERE consultancy_id IN (?, ?)`, [c1Id, c2Id]);
        await db.query(`DELETE FROM consultancy_activity_events WHERE consultancy_id IN (?, ?)`, [c1Id, c2Id]);

        if (coachMemberId) {
          await db.query(`DELETE FROM consultancy_member_roles WHERE member_id = ?`, [coachMemberId]);
          await db.query(`DELETE FROM consultancy_members WHERE id = ?`, [coachMemberId]);
        }
        if (coachUserId) {
          await db.query(`DELETE FROM users WHERE id = ?`, [coachUserId]);
        }
        await db.query(`DELETE FROM consultancies WHERE id IN (?, ?)`, [c1Id, c2Id]);
        console.log("Fixtures cleaned up successfully.");
      }
    } catch (cleanErr) {
      console.warn("Cleanup warning:", cleanErr.message);
    }

    // Measure delta
    const [finalFoodRows] = await db.query('SELECT COUNT(*) as cnt FROM nutrition_v2_foods');
    const [finalAliasRows] = await db.query('SELECT COUNT(*) as cnt FROM nutrition_v2_food_aliases');
    const [finalPlanRows] = await db.query('SELECT COUNT(*) as cnt FROM nutrition_v2_plans');
    const deltaFood = Number(finalFoodRows[0].cnt) - initialFoodCount;
    const deltaAlias = Number(finalAliasRows[0].cnt) - initialAliasCount;
    const deltaPlan = Number(finalPlanRows[0].cnt) - initialPlanCount;

    console.log(`\nDB DELTA AFTER TEST:`);
    console.log(`FOOD COUNT DELTA: ${deltaFood}`);
    console.log(`ALIAS COUNT DELTA: ${deltaAlias}`);
    console.log(`PLAN COUNT DELTA: ${deltaPlan}`);

    assert.equal(deltaFood, 0, 'Food count delta must be 0');
    assert.equal(deltaAlias, 0, 'Alias count delta must be 0');
    assert.equal(deltaPlan, 0, 'Plan count delta must be 0');

    if (typeof db.release === 'function') {
      db.release();
    }
  }

  console.log(`\n==================================================`);
  console.log(`ALL ${passed}/${total} NUTRITION V2 TESTS PASSED!`);
  console.log(`==================================================\n`);
}

runSuite().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
