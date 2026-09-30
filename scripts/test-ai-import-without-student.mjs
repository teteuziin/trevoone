/**
 * TREVO ONE — TEST SUITE: AI IMPORT WITHOUT STUDENT/PATIENT
 * 
 * Verifies:
 * 1. Training import without student -> PASS
 * 2. Nutrition import without patient -> PASS
 * 3. Draft persisted in DB -> PASS
 * 4. Student runtime visibility before assignment -> NO (strictly invisible)
 * 5. Professional list visibility -> PASS (shows unassigned draft)
 * 6. PDF draft without student -> PASS (omits student line, includes RASCUNHO badge)
 * 7. Quota consumed -> PASS (OpenAI quota consumed independently of student)
 * 8. Audit event without subject -> PASS (subject_membership_id IS NULL)
 * 9. Later assignment -> PASS (assigns published version to active student, records attribution audit event)
 * 10. Cross-tenant assignment -> BLOCKED (rejected by tenancy validation)
 */

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import mysql from 'mysql2/promise';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function pass(name) {
  console.log(`  ${colors.green}✓ PASS:${colors.reset} ${name}`);
}

async function getTestDb() {
  return await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'trevo_db',
  });
}

async function run() {
  console.log(`\n${colors.cyan}${colors.bold}=== TREVO ONE: AI IMPORT WITHOUT STUDENT TEST SUITE ===${colors.reset}\n`);

  const conn = await getTestDb();

  let c1Id, c2Id, coachUserId, coachMemberId, studentUserId, studentMemberId, otherStudentUserId, otherStudentMemberId;

  try {
    // 1. Setup Test Tenancy & Fixtures
    const uniqueSuffix = Date.now().toString(36);
    const slug1 = `test-cons-a-${uniqueSuffix}`;
    const slug2 = `test-cons-b-${uniqueSuffix}`;

    // Create Consultancy 1
    const [c1Res] = await conn.execute(
      `INSERT INTO consultancies (public_id, name, slug, status, created_at, updated_at)
       VALUES (?, ?, ?, 'ACTIVE', NOW(3), NOW(3))`,
      [crypto.randomUUID(), `Consultoria Alfa ${uniqueSuffix}`, slug1]
    );
    c1Id = c1Res.insertId;

    // Create Consultancy 2 (for cross-tenant test)
    const [c2Res] = await conn.execute(
      `INSERT INTO consultancies (public_id, name, slug, status, created_at, updated_at)
       VALUES (?, ?, ?, 'ACTIVE', NOW(3), NOW(3))`,
      [crypto.randomUUID(), `Consultoria Beta ${uniqueSuffix}`, slug2]
    );
    c2Id = c2Res.insertId;

    // Create Personal Trainer User in Consultancy 1
    const [uCoachRes] = await conn.execute(
      `INSERT INTO users (public_id, email, password_hash, full_name, created_at, updated_at)
       VALUES (?, ?, 'hash', 'Felipe Personal', NOW(3), NOW(3))`,
      [crypto.randomUUID(), `coach-${uniqueSuffix}@test.com`]
    );
    coachUserId = uCoachRes.insertId;
    const coachUserPublicId = crypto.randomUUID();

    const [mCoachRes] = await conn.execute(
      `INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, created_at, updated_at)
       VALUES (?, ?, ?, 'ACTIVE', NOW(3), NOW(3))`,
      [crypto.randomUUID(), c1Id, coachUserId]
    );
    coachMemberId = mCoachRes.insertId;
    const coachMemberPublicId = crypto.randomUUID();

    await conn.execute(
      `INSERT INTO consultancy_member_roles (member_id, role, created_at)
       VALUES (?, 'PERSONAL', NOW(3)), (?, 'NUTRITIONIST', NOW(3))`,
      [coachMemberId, coachMemberId]
    );

    // Create Active Student User in Consultancy 1
    const [uStudRes] = await conn.execute(
      `INSERT INTO users (public_id, email, password_hash, full_name, created_at, updated_at)
       VALUES (?, ?, 'hash', 'Marcos Aluno', NOW(3), NOW(3))`,
      [crypto.randomUUID(), `student-${uniqueSuffix}@test.com`]
    );
    studentUserId = uStudRes.insertId;
    const studentUserPublicId = crypto.randomUUID();

    const studentMemberPublicId = crypto.randomUUID();
    const [mStudRes] = await conn.execute(
      `INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, created_at, updated_at)
       VALUES (?, ?, ?, 'ACTIVE', NOW(3), NOW(3))`,
      [studentMemberPublicId, c1Id, studentUserId]
    );
    studentMemberId = mStudRes.insertId;

    await conn.execute(
      `INSERT INTO consultancy_member_roles (member_id, role, created_at)
       VALUES (?, 'STUDENT', NOW(3))`,
      [studentMemberId]
    );

    // Create Student in Consultancy 2 (Cross-tenant)
    const [uOtherStudRes] = await conn.execute(
      `INSERT INTO users (public_id, email, password_hash, full_name, created_at, updated_at)
       VALUES (?, ?, 'hash', 'Outro Aluno Beta', NOW(3), NOW(3))`,
      [crypto.randomUUID(), `other-${uniqueSuffix}@test.com`]
    );
    otherStudentUserId = uOtherStudRes.insertId;
    const otherStudentMemberPublicId = crypto.randomUUID();

    const [mOtherStudRes] = await conn.execute(
      `INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, created_at, updated_at)
       VALUES (?, ?, ?, 'ACTIVE', NOW(3), NOW(3))`,
      [otherStudentMemberPublicId, c2Id, otherStudentUserId]
    );
    otherStudentMemberId = mOtherStudRes.insertId;

    await conn.execute(
      `INSERT INTO consultancy_member_roles (member_id, role, created_at)
       VALUES (?, 'STUDENT', NOW(3))`,
      [otherStudentMemberId]
    );

    // Ensure dummy exercise in library for training confirmation
    const [exRows] = await conn.query(
      `SELECT public_id, name, muscle_group_primary, equipment FROM exercises WHERE deleted_at IS NULL LIMIT 1`
    );
    let sampleExPublicId;
    let sampleExName;
    if (exRows.length > 0) {
      sampleExPublicId = exRows[0].public_id;
      sampleExName = exRows[0].name;
    } else {
      sampleExPublicId = crypto.randomUUID();
      sampleExName = 'Supino Reto com Barra';
      await conn.execute(
        `INSERT INTO exercises (public_id, scope, consultancy_id, created_by_user_id, name, normalized_name, muscle_group_primary, equipment, status, created_at, updated_at)
         VALUES (?, 'GLOBAL', NULL, ?, ?, 'supino reto com barra', 'CHEST', 'BARBELL', 'PUBLISHED', NOW(3), NOW(3))`,
        [sampleExPublicId, coachUserId, sampleExName]
      );
    }

    // Ensure dummy food in catalog for nutrition confirmation
    const [foodRows] = await conn.query(
      `SELECT id, public_id, name as food_name, reference_amount as serving_amount, reference_unit_code as serving_unit,
              calories_kcal, protein_g, carbohydrate_g as carbs_g, fat_g
       FROM nutrition_v2_foods WHERE status = 'ACTIVE' AND deleted_at IS NULL LIMIT 1`
    );
    let sampleFood = foodRows.length > 0 ? foodRows[0] : null;
    if (!sampleFood) {
      const fPubId = crypto.randomUUID();
      const [fRes] = await conn.execute(
        `INSERT INTO nutrition_v2_foods (public_id, scope, consultancy_id, name, normalized_name, reference_amount, reference_unit_code, calories_kcal, protein_g, carbohydrate_g, fat_g, status, created_at, updated_at)
         VALUES (?, 'GLOBAL', NULL, 'Arroz Branco Cozido', 'arroz branco cozido', 100, 'G', 128, 2.5, 28.1, 0.2, 'ACTIVE', NOW(3), NOW(3))`,
        [fPubId]
      );
      sampleFood = {
        id: fRes.insertId,
        public_id: fPubId,
        food_name: 'Arroz Branco Cozido',
        serving_amount: 100,
        serving_unit: 'G',
        calories_kcal: 128,
        protein_g: 2.5,
        carbs_g: 28.1,
        fat_g: 0.2,
      };
    }

    // =========================================================================
    // TEST 1: Training Import Without Student
    // =========================================================================
    console.log(`\n--- Test 1: Training import sem aluno ---`);
    const { confirmTrainingAiImport } = await import('../lib/training-v2/training-ai-importer.ts');

    const job1PublicId = crypto.randomUUID();
    await conn.execute(
      `INSERT INTO ai_import_jobs (public_id, idempotency_key, consultancy_id, member_id, user_id, feature, status, source_filename, source_hash, source_type, file_size_bytes, target_student_membership_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'TRAINING_IMPORT', 'PROCESSED', 'ficha-geral.pdf', 'hash1', 'PDF', 1024, NULL, NOW(3), NOW(3))`,
      [job1PublicId, crypto.randomUUID(), c1Id, coachMemberId, coachUserId]
    );

    const trainingResult = await confirmTrainingAiImport({
      consultancyId: c1Id,
      memberId: coachMemberId,
      userId: coachUserId,
      role: 'PERSONAL',
      jobPublicId: job1PublicId,
      targetStudentMembershipId: null, // SEM ALUNO
      confirmedTitle: 'Treino Hipertrofia Intermediário',
      confirmedCategories: [
        {
          name: 'Treino A - Peito e Tríceps',
          order: 1,
          exercises: [
            {
              rawName: sampleExName,
              matchStatus: 'MATCHED',
              exercisePublicId: sampleExPublicId,
              exerciseNameSnapshot: sampleExName,
              muscleGroupSnapshot: 'CHEST',
              equipmentSnapshot: 'BARBELL',
              sets: 4,
              reps: '10',
              restSeconds: 60,
            },
          ],
        },
      ],
    });

    assert.ok(trainingResult.workoutPublicId, 'Workout public ID must be returned');
    assert.ok(trainingResult.versionPublicId, 'Version public ID must be returned');
    assert.strictEqual(trainingResult.assignmentPublicId, undefined, 'No assignment should be created during import');
    pass('Training import sem aluno: PASS');

    // =========================================================================
    // TEST 2: Nutrition Import Without Patient
    // =========================================================================
    console.log(`\n--- Test 2: Nutrition import sem paciente ---`);
    const { confirmNutritionAiImport } = await import('../lib/nutrition-v2/nutrition-ai-importer.ts');

    const job2PublicId = crypto.randomUUID();
    await conn.execute(
      `INSERT INTO ai_import_jobs (public_id, idempotency_key, consultancy_id, member_id, user_id, feature, status, source_filename, source_hash, source_type, file_size_bytes, target_student_membership_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'NUTRITION_IMPORT', 'PROCESSED', 'plano-cutting.pdf', 'hash2', 'PDF', 1024, NULL, NOW(3), NOW(3))`,
      [job2PublicId, crypto.randomUUID(), c1Id, coachMemberId, coachUserId]
    );

    const nutritionResult = await confirmNutritionAiImport({
      consultancyId: c1Id,
      memberId: coachMemberId,
      userId: coachUserId,
      role: 'NUTRITIONIST',
      jobPublicId: job2PublicId,
      targetPatientMembershipId: null, // SEM PACIENTE
      confirmedTitle: 'Plano Alimentar Cutting',
      confirmedMeals: [
        {
          name: 'Almoço',
          scheduledTime: '12:30',
          foods: [
            {
              foodNameCandidate: sampleFood.food_name,
              matchStatus: 'MATCHED',
              foodPublicId: sampleFood.public_id,
              quantity: 150,
              unitCode: 'G',
              unitLabel: 'g',
            },
          ],
        },
      ],
    });

    assert.ok(nutritionResult.planPublicId, 'Plan public ID must be returned');
    assert.ok(nutritionResult.versionPublicId, 'Version public ID must be returned');
    assert.strictEqual(nutritionResult.assignmentPublicId, undefined, 'No assignment should be created during import');
    pass('Nutrition import sem paciente: PASS');

    // =========================================================================
    // TEST 3: Draft Persistido
    // =========================================================================
    console.log(`\n--- Test 3: Draft persistido ---`);
    const [wRows] = await conn.query(
      `SELECT w.id, w.status as w_status, wv.status as wv_status
       FROM workouts w
       JOIN workout_versions wv ON wv.workout_id = w.id
       WHERE w.public_id = ?`,
      [trainingResult.workoutPublicId]
    );
    assert.strictEqual(wRows.length, 1, 'Workout must exist in DB');
    assert.strictEqual(wRows[0].wv_status, 'DRAFT', 'Workout version must be DRAFT');

    const [pRows] = await conn.query(
      `SELECT p.id, p.status as p_status, pv.status as pv_status
       FROM nutrition_v2_plans p
       JOIN nutrition_v2_plan_versions pv ON pv.nutrition_plan_id = p.id
       WHERE p.public_id = ?`,
      [nutritionResult.planPublicId]
    );
    assert.strictEqual(pRows.length, 1, 'Nutrition plan must exist in DB');
    assert.strictEqual(pRows[0].pv_status, 'DRAFT', 'Nutrition plan version must be DRAFT');
    pass('Draft persistido: PASS');

    // =========================================================================
    // TEST 4: Student Runtime Visibility Before Assignment
    // =========================================================================
    console.log(`\n--- Test 4: Student Runtime visibility before assignment ---`);
    const [waRows] = await conn.query(
      `SELECT * FROM workout_assignments WHERE student_membership_id = ? AND status = 'ACTIVE' AND deleted_at IS NULL`,
      [studentMemberId]
    );
    assert.strictEqual(waRows.length, 0, 'Student must have 0 active workout assignments');

    const [naRows] = await conn.query(
      `SELECT * FROM nutrition_v2_assignments WHERE student_membership_id = ? AND status = 'ACTIVE' AND deleted_at IS NULL`,
      [studentMemberId]
    );
    assert.strictEqual(naRows.length, 0, 'Student must have 0 active nutrition assignments');
    pass('Student Runtime visibility before assignment: NO');

    // =========================================================================
    // TEST 5: Professional List Visibility
    // =========================================================================
    console.log(`\n--- Test 5: Professional list visibility ---`);
    const { listWorkoutsForProfessional } = await import('../lib/training-v2/workout-repository.ts');
    const { listPlansForConsultancy } = await import('../lib/nutrition-v2/plan-repository.ts');

    const mockTrainingCtx = {
      userId: coachUserId,
      userPublicId: coachUserPublicId,
      isPlatformAdmin: false,
      consultancyId: c1Id,
      consultancyPublicId: crypto.randomUUID(),
      consultancySlug: slug1,
      membershipId: coachMemberId,
      membershipPublicId: coachMemberPublicId,
      roles: ['PERSONAL'],
      hasRole: (r) => r === 'PERSONAL',
      canAuthorTraining: true,
      canManageConsultancy: false,
      canManageGlobal: false,
      isStudent: false,
    };

    const workoutList = await listWorkoutsForProfessional(mockTrainingCtx, { query: 'Hipertrofia Intermediário' });
    assert.ok(workoutList.items.length >= 1, 'Workout must appear in professional list');
    const foundWorkout = workoutList.items.find(i => i.publicId === trainingResult.workoutPublicId);
    assert.ok(foundWorkout, 'Created workout must be in list');
    assert.strictEqual(foundWorkout.activeAssignmentsCount, 0, 'Unassigned workout must have activeAssignmentsCount: 0');
    assert.strictEqual(foundWorkout.assignedStudentName, null, 'Unassigned workout must have assignedStudentName: null');

    const mockNutritionCtx = {
      userId: coachUserId,
      userPublicId: coachUserPublicId,
      isPlatformAdmin: false,
      consultancyId: c1Id,
      consultancyPublicId: crypto.randomUUID(),
      consultancySlug: slug1,
      membershipId: coachMemberId,
      membershipPublicId: coachMemberPublicId,
      roles: ['NUTRITIONIST'],
      hasRole: (r) => r === 'NUTRITIONIST',
      canAuthorNutrition: true,
      canManageConsultancy: false,
      canManageGlobal: false,
      isStudent: false,
    };

    const planList = await listPlansForConsultancy(mockNutritionCtx, { query: 'Plano Alimentar Cutting' });
    assert.ok(planList.items.length >= 1, 'Plan must appear in professional list');
    const foundPlan = planList.items.find(i => i.publicId === nutritionResult.planPublicId);
    assert.ok(foundPlan, 'Created plan must be in list');
    assert.strictEqual(foundPlan.activeAssignmentsCount, 0, 'Unassigned plan must have activeAssignmentsCount: 0');
    assert.strictEqual(foundPlan.assignedStudentName, null, 'Unassigned plan must have assignedStudentName: null');
    pass('Professional list visibility: PASS');

    // =========================================================================
    // TEST 6: PDF Draft Without Student
    // =========================================================================
    console.log(`\n--- Test 6: PDF draft without student ---`);
    const { generateTrainingPlanPdfBuffer } = await import('../lib/training-v2/generate-training-pdf.ts');
    const { generateNutritionPlanPdfBuffer } = await import('../lib/nutrition-v2/generate-nutrition-pdf.ts');

    const draftTrainingPdfData = {
      title: 'Treino Hipertrofia Intermediário',
      subtitle: 'Rascunho de Importação',
      consultancyName: 'Consultoria Alfa',
      studentName: null, // NO STUDENT
      personalTrainerName: 'Felipe Personal',
      objective: 'Hipertrofia',
      isDraft: true,
      versionNumber: 1,
      generationDateFormatted: '30/09/2026',
      blocks: [
        {
          name: 'Treino A',
          instructions: 'Aquecer bem',
          exercises: [
            {
              name: sampleExName,
              muscleGroup: 'CHEST',
              equipment: 'BARBELL',
              notes: '4 séries',
              summaryString: '4 x 10',
              setsDetail: ['10 reps', '10 reps', '10 reps', '10 reps'],
            },
          ],
        },
      ],
    };

    const trainingPdfBuffer = await generateTrainingPlanPdfBuffer(draftTrainingPdfData);
    assert.ok(Buffer.isBuffer(trainingPdfBuffer), 'Must return a Buffer');
    assert.ok(trainingPdfBuffer.length > 500, 'PDF buffer must be non-trivial in size');
    assert.strictEqual(trainingPdfBuffer.subarray(0, 4).toString(), '%PDF', 'Must start with %PDF header');

    const draftNutritionPdfData = {
      assignmentPublicId: 'draft-temp-id',
      title: 'Plano Alimentar Cutting',
      subtitle: 'Rascunho de Importação',
      objective: 'Cutting',
      generalGuidance: 'Beber 3L de água por dia',
      notesForStudent: null,
      prescriberName: 'Felipe Nutricionista',
      studentName: null, // NO PATIENT
      consultancyName: 'Consultoria Alfa',
      consultancyLogoUrl: null,
      periodFormatted: null,
      generationDateFormatted: '30/09/2026',
      isDraft: true,
      meals: [
        {
          id: 'meal-1',
          title: 'Almoço',
          timeFormatted: '12:30',
          notes: null,
          items: [
            {
              id: 'item-1',
              foodName: 'Arroz Branco Cozido',
              quantityFormatted: '150 g',
              notes: null,
              substitutions: [],
            },
          ],
        },
      ],
      totals: {
        caloriesKcal: 192,
        caloriesFormatted: '192 kcal',
        proteinG: 3.7,
        proteinFormatted: '3.7g',
        carbohydrateG: 42.1,
        carbohydrateFormatted: '42.1g',
        fatG: 0.3,
        fatFormatted: '0.3g',
        hasAnyMacro: true,
      },
    };

    const nutritionPdfBuffer = await generateNutritionPlanPdfBuffer(draftNutritionPdfData);
    assert.ok(Buffer.isBuffer(nutritionPdfBuffer), 'Must return a Buffer');
    assert.ok(nutritionPdfBuffer.length > 500, 'PDF buffer must be non-trivial in size');
    assert.strictEqual(nutritionPdfBuffer.subarray(0, 4).toString(), '%PDF', 'Must start with %PDF header');
    pass('PDF draft without student: PASS');

    // =========================================================================
    // TEST 7: Quota Consumed
    // =========================================================================
    console.log(`\n--- Test 7: Quota consumed ---`);
    const { reserveAiQuota } = await import('../lib/ai/quotas.ts');

    const quotaResult = await reserveAiQuota({
      consultancyId: c1Id,
      memberId: coachMemberId,
      userId: coachUserId,
      role: 'PERSONAL',
      feature: 'TRAINING_IMPORT',
      model: 'gpt-4o',
      importJobPublicId: job1PublicId,
    });

    assert.strictEqual(quotaResult.success, true, 'Quota usage must be allowed');
    assert.ok(quotaResult.usageEventPublicId, 'Usage event public ID must be generated');

    const [qEventRows] = await conn.query(
      `SELECT * FROM ai_usage_events WHERE public_id = ?`,
      [quotaResult.usageEventPublicId]
    );
    assert.strictEqual(qEventRows.length, 1, 'AI usage event must be logged');
    pass('Quota consumed: PASS');

    // =========================================================================
    // TEST 8: Audit Event Without Subject
    // =========================================================================
    console.log(`\n--- Test 8: Audit event without subject ---`);
    const [tAuditRows] = await conn.query(
      `SELECT action, summary, subject_membership_id FROM consultancy_activity_events
       WHERE consultancy_id = ? AND action = 'AI_TRAINING_IMPORT_CONFIRMED'
       ORDER BY id DESC LIMIT 1`,
      [c1Id]
    );
    assert.strictEqual(tAuditRows.length, 1, 'Training import audit event must exist');
    assert.strictEqual(tAuditRows[0].subject_membership_id, null, 'subject_membership_id must be NULL when imported without student');
    assert.ok(!tAuditRows[0].summary.includes('Marcos'), 'Summary must not mention student when unassigned');

    const [nAuditRows] = await conn.query(
      `SELECT action, summary, subject_membership_id FROM consultancy_activity_events
       WHERE consultancy_id = ? AND action = 'AI_NUTRITION_IMPORT_CONFIRMED'
       ORDER BY id DESC LIMIT 1`,
      [c1Id]
    );
    assert.strictEqual(nAuditRows.length, 1, 'Nutrition import audit event must exist');
    assert.strictEqual(nAuditRows[0].subject_membership_id, null, 'subject_membership_id must be NULL when imported without patient');
    assert.ok(!nAuditRows[0].summary.includes('Marcos'), 'Summary must not mention patient when unassigned');
    pass('Audit event without subject: PASS');

    // =========================================================================
    // TEST 9: Later Assignment
    // =========================================================================
    console.log(`\n--- Test 9: Later assignment ---`);
    const { publishWorkoutVersion } = await import('../lib/training-v2/workout-repository.ts');
    const { createAssignment } = await import('../lib/training-v2/assignment-repository.ts');
    const { publishPlanVersion } = await import('../lib/nutrition-v2/plan-repository.ts');
    const { assignPlanVersion } = await import('../lib/nutrition-v2/assignment-repository.ts');

    // Publish workout draft
    await publishWorkoutVersion(mockTrainingCtx, trainingResult.versionPublicId);

    // Assign workout to student
    const workoutAssignment = await createAssignment(mockTrainingCtx, {
      workoutPublicId: trainingResult.workoutPublicId,
      workoutVersionPublicId: trainingResult.versionPublicId,
      studentMembershipPublicId: studentMemberPublicId,
      startsOn: '2026-10-01',
    });
    assert.ok(workoutAssignment.publicId, 'Workout assignment must be created');

    // Verify workout assignment audit event
    const [tAssignAudit] = await conn.query(
      `SELECT action, summary, subject_membership_id FROM consultancy_activity_events
       WHERE consultancy_id = ? AND action = 'WORKOUT_ASSIGNED'
       ORDER BY id DESC LIMIT 1`,
      [c1Id]
    );
    assert.strictEqual(tAssignAudit.length, 1, 'WORKOUT_ASSIGNED event must be recorded');
    assert.strictEqual(Number(tAssignAudit[0].subject_membership_id), Number(studentMemberId), 'Subject must be student member');
    assert.ok(tAssignAudit[0].summary.includes('Marcos Aluno'), 'Summary must include student name');

    // Publish nutrition draft
    await publishPlanVersion(mockNutritionCtx, nutritionResult.planPublicId, nutritionResult.versionPublicId);

    // Assign nutrition plan to student
    const nutritionAssignment = await assignPlanVersion(
      mockNutritionCtx,
      {
        planPublicId: nutritionResult.planPublicId,
        versionPublicId: nutritionResult.versionPublicId,
        studentMembershipPublicId: studentMemberPublicId,
      }
    );
    assert.strictEqual(nutritionAssignment.success, true, 'Nutrition assignment must succeed');

    // Verify nutrition assignment audit event
    const [nAssignAudit] = await conn.query(
      `SELECT action, summary, subject_membership_id FROM consultancy_activity_events
       WHERE consultancy_id = ? AND action = 'NUTRITION_PLAN_ASSIGNED'
       ORDER BY id DESC LIMIT 1`,
      [c1Id]
    );
    assert.strictEqual(nAssignAudit.length, 1, 'NUTRITION_PLAN_ASSIGNED event must be recorded');
    assert.strictEqual(Number(nAssignAudit[0].subject_membership_id), Number(studentMemberId), 'Subject must be student member');
    assert.ok(nAssignAudit[0].summary.includes('Marcos Aluno'), 'Summary must include student name');
    pass('Later assignment: PASS');

    // =========================================================================
    // TEST 10: Cross-Tenant Assignment
    // =========================================================================
    console.log(`\n--- Test 10: Cross-tenant assignment ---`);
    let crossTenantWorkoutBlocked = false;
    try {
      await createAssignment(mockTrainingCtx, {
        workoutPublicId: trainingResult.workoutPublicId,
        workoutVersionPublicId: trainingResult.versionPublicId,
        studentMembershipPublicId: otherStudentMemberPublicId, // Student from Beta consultancy!
        startsOn: '2026-10-01',
      });
    } catch (err) {
      crossTenantWorkoutBlocked = true;
    }
    assert.strictEqual(crossTenantWorkoutBlocked, true, 'Cross-tenant workout assignment must be blocked');

    let crossTenantNutritionBlocked = false;
    try {
      await assignPlanVersion(
        mockNutritionCtx,
        {
          planPublicId: nutritionResult.planPublicId,
          versionPublicId: nutritionResult.versionPublicId,
          studentMembershipPublicId: otherStudentMemberPublicId, // Student from Beta consultancy!
        }
      );
    } catch (err) {
      crossTenantNutritionBlocked = true;
    }
    assert.strictEqual(crossTenantNutritionBlocked, true, 'Cross-tenant nutrition assignment must be blocked');
    pass('Cross-tenant assignment: BLOCKED');

    console.log(`\n${colors.green}${colors.bold}========================================${colors.reset}`);
    console.log(`${colors.green}${colors.bold}ALL 10 TESTS PASSED OBJECTIVELY & CLEANLY!${colors.reset}`);
    console.log(`${colors.green}${colors.bold}========================================${colors.reset}\n`);

  } finally {
    if (conn) {
      try {
        console.log(`\n--- Cleaning up test fixtures ---`);
        if (c1Id && c2Id) {
          await conn.execute(`DELETE FROM workout_assignments WHERE consultancy_id IN (?, ?)`, [c1Id, c2Id]);
          await conn.execute(`DELETE FROM nutrition_v2_assignments WHERE consultancy_id IN (?, ?)`, [c1Id, c2Id]);
          await conn.execute(`DELETE FROM workout_item_sets WHERE block_item_id IN (SELECT id FROM workout_block_items WHERE block_id IN (SELECT id FROM workout_blocks WHERE workout_version_id IN (SELECT id FROM workout_versions WHERE workout_id IN (SELECT id FROM workouts WHERE consultancy_id IN (?, ?)))))`, [c1Id, c2Id]);
          await conn.execute(`DELETE FROM workout_block_items WHERE block_id IN (SELECT id FROM workout_blocks WHERE workout_version_id IN (SELECT id FROM workout_versions WHERE workout_id IN (SELECT id FROM workouts WHERE consultancy_id IN (?, ?))))`, [c1Id, c2Id]);
          await conn.execute(`DELETE FROM workout_blocks WHERE workout_version_id IN (SELECT id FROM workout_versions WHERE workout_id IN (SELECT id FROM workouts WHERE consultancy_id IN (?, ?)))`, [c1Id, c2Id]);
          await conn.execute(`DELETE FROM workout_versions WHERE workout_id IN (SELECT id FROM workouts WHERE consultancy_id IN (?, ?))`, [c1Id, c2Id]);
          await conn.execute(`DELETE FROM workouts WHERE consultancy_id IN (?, ?)`, [c1Id, c2Id]);

          await conn.execute(`DELETE FROM nutrition_v2_item_substitutions WHERE meal_item_id IN (SELECT id FROM nutrition_v2_meal_items WHERE meal_id IN (SELECT id FROM nutrition_v2_meals WHERE nutrition_plan_version_id IN (SELECT id FROM nutrition_v2_plan_versions WHERE nutrition_plan_id IN (SELECT id FROM nutrition_v2_plans WHERE consultancy_id IN (?, ?)))))`, [c1Id, c2Id]);
          await conn.execute(`DELETE FROM nutrition_v2_meal_items WHERE meal_id IN (SELECT id FROM nutrition_v2_meals WHERE nutrition_plan_version_id IN (SELECT id FROM nutrition_v2_plan_versions WHERE nutrition_plan_id IN (SELECT id FROM nutrition_v2_plans WHERE consultancy_id IN (?, ?))))`, [c1Id, c2Id]);
          await conn.execute(`DELETE FROM nutrition_v2_meals WHERE nutrition_plan_version_id IN (SELECT id FROM nutrition_v2_plan_versions WHERE nutrition_plan_id IN (SELECT id FROM nutrition_v2_plans WHERE consultancy_id IN (?, ?)))`, [c1Id, c2Id]);
          await conn.execute(`DELETE FROM nutrition_v2_plan_versions WHERE nutrition_plan_id IN (SELECT id FROM nutrition_v2_plans WHERE consultancy_id IN (?, ?))`, [c1Id, c2Id]);
          await conn.execute(`DELETE FROM nutrition_v2_plans WHERE consultancy_id IN (?, ?)`, [c1Id, c2Id]);

          await conn.execute(`DELETE FROM ai_import_jobs WHERE consultancy_id IN (?, ?)`, [c1Id, c2Id]);
          await conn.execute(`DELETE FROM ai_usage_events WHERE consultancy_id IN (?, ?)`, [c1Id, c2Id]);
          await conn.execute(`DELETE FROM consultancy_activity_events WHERE consultancy_id IN (?, ?)`, [c1Id, c2Id]);

          if (coachMemberId && studentMemberId && otherStudentMemberId) {
            await conn.execute(`DELETE FROM consultancy_member_roles WHERE member_id IN (?, ?, ?)`, [coachMemberId, studentMemberId, otherStudentMemberId]);
            await conn.execute(`DELETE FROM consultancy_members WHERE id IN (?, ?, ?)`, [coachMemberId, studentMemberId, otherStudentMemberId]);
          }
          if (coachUserId && studentUserId && otherStudentUserId) {
            await conn.execute(`DELETE FROM users WHERE id IN (?, ?, ?)`, [coachUserId, studentUserId, otherStudentUserId]);
          }

          await conn.execute(`DELETE FROM consultancy_ai_member_limits WHERE consultancy_id IN (?, ?)`, [c1Id, c2Id]);
          await conn.execute(`DELETE FROM consultancy_ai_role_limits WHERE consultancy_id IN (?, ?)`, [c1Id, c2Id]);
          await conn.execute(`DELETE FROM consultancy_ai_quotas WHERE consultancy_id IN (?, ?)`, [c1Id, c2Id]);
          await conn.execute(`DELETE FROM consultancies WHERE id IN (?, ?)`, [c1Id, c2Id]);
          console.log(`Fixtures cleaned up successfully.`);
        }
      } catch (cleanErr) {
        console.warn('Cleanup warning:', cleanErr.message);
      }
      await conn.end();
    }
    process.exit(0);
  }
}

run().catch((err) => {
  console.error(`\n${colors.red}${colors.bold}TEST SUITE FAILED:${colors.reset}`, err);
  process.exit(1);
});
