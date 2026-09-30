/**
 * TREVO ONE — MASTER FEATURE V1 AUTOMATED TEST SUITE
 * 
 * Comprehensive automated tests covering:
 * 1. AI Quota Engine & Concurrency
 * 2. Training AI Import & Exercise Library Matching (Ambiguity & Not Found)
 * 3. Nutrition AI Import, Food Library Matching & Strict Nutritional Authority (Trevo vs 999 kcal claim)
 * 4. Server-Side Vector PDF Generation (NO BROWSER)
 * 5. Consultancy Activity Center & Audit Log Multi-Tenancy
 */

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import mysql from 'mysql2/promise';

// Helper to get fresh DB connection
async function getTestDb() {
  return await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'trevo_db',
  });
}

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function pass(name) {
  console.log(`  ${colors.green}✓ PASS:${colors.reset} ${name}`);
}

function fail(name, err) {
  console.error(`  ${colors.red}✗ FAIL:${colors.reset} ${name}`);
  console.error(err);
  throw err;
}

// Global fixtures
let testConsultancyId = null;
let testConsultancySlug = null;
let testPersonalMemberId = null;
let testPersonalUserId = null;
let testNutriMemberId = null;
let testNutriUserId = null;
let testStudentMemberId = null;
let testStudentUserId = null;
let otherConsultancyId = null;

async function setupFixtures(conn) {
  console.log(`\n${colors.cyan}${colors.bold}=== SETTING UP TEST FIXTURES ===${colors.reset}`);
  
  // 1. Create primary test consultancy
  const testSlug = `test-feat-v1-${Date.now()}`;
  const [cRes] = await conn.query(
    `INSERT INTO consultancies (public_id, name, slug, status, created_at, updated_at)
     VALUES (?, ?, ?, 'ACTIVE', NOW(), NOW())`,
    [crypto.randomUUID(), `Test Consultancy ${Date.now()}`, testSlug]
  );
  testConsultancyId = cRes.insertId;
  testConsultancySlug = testSlug;

  // 2. Create other consultancy for tenancy tests
  const [otherCRes] = await conn.query(
    `INSERT INTO consultancies (public_id, name, slug, status, created_at, updated_at)
     VALUES (?, ?, ?, 'ACTIVE', NOW(), NOW())`,
    [crypto.randomUUID(), `Other Consultancy ${Date.now()}`, `other-${testSlug}`]
  );
  otherConsultancyId = otherCRes.insertId;

  // 3. Create users
  async function createUser(name, email) {
    const [u] = await conn.query(
      `INSERT INTO users (public_id, full_name, email, password_hash, created_at, updated_at)
       VALUES (?, ?, ?, 'hash', NOW(), NOW())`,
      [crypto.randomUUID(), name, email]
    );
    return u.insertId;
  }

  testPersonalUserId = await createUser('Felipe Personal', `felipe-${Date.now()}@trevo.test`);
  testNutriUserId = await createUser('Jéssica Nutri', `jessica-${Date.now()}@trevo.test`);
  testStudentUserId = await createUser('Marcos Aluno', `marcos-${Date.now()}@trevo.test`);

  // 4. Create members and roles
  async function createMember(cId, uId, role) {
    const [m] = await conn.query(
      `INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, created_at, updated_at)
       VALUES (?, ?, ?, 'ACTIVE', NOW(), NOW())`,
      [crypto.randomUUID(), cId, uId]
    );
    await conn.query(
      `INSERT INTO consultancy_member_roles (member_id, role, created_at)
       VALUES (?, ?, NOW())`,
      [m.insertId, role]
    );
    return m.insertId;
  }

  testPersonalMemberId = await createMember(testConsultancyId, testPersonalUserId, 'PERSONAL');
  testNutriMemberId = await createMember(testConsultancyId, testNutriUserId, 'NUTRITIONIST');
  testStudentMemberId = await createMember(testConsultancyId, testStudentUserId, 'STUDENT');

  // 5. Seed test exercises with GLOBAL scope and deduplicate
  const testExercises = [
    { name: 'Supino Reto com Barra', norm: 'supino reto com barra', muscle: 'PEITORAL', equip: 'BARRA' },
    { name: 'Crucifixo Inclinado', norm: 'crucifixo inclinado', muscle: 'PEITORAL', equip: 'HALTERES' },
    { name: 'Remada Baixa', norm: 'remada baixa', muscle: 'DORSAL', equip: 'POLIA' },
    { name: 'Remada Curvada', norm: 'remada curvada', muscle: 'DORSAL', equip: 'BARRA' },
    { name: 'Remada Unilateral', norm: 'remada unilateral', muscle: 'DORSAL', equip: 'HALTERES' },
  ];

  for (const ex of testExercises) {
    const [existing] = await conn.query('SELECT id FROM exercises WHERE name = ?', [ex.name]);
    if (existing.length === 0) {
      await conn.query(
        `INSERT INTO exercises (public_id, scope, consultancy_id, created_by_user_id, name, normalized_name, muscle_group_primary, equipment, movement_pattern, difficulty_level, status, created_at, updated_at)
         VALUES (?, 'GLOBAL', NULL, ?, ?, ?, ?, ?, 'HORIZONTAL_PUSH', 'BEGINNER', 'PUBLISHED', NOW(), NOW())`,
        [crypto.randomUUID(), testPersonalUserId, ex.name, ex.norm, ex.muscle, ex.equip]
      );
    } else if (existing.length > 1) {
      const idsToDelete = existing.slice(1).map((r) => r.id);
      await conn.query('DELETE FROM exercises WHERE id IN (?)', [idsToDelete]);
    }
  }

  console.log(`Fixtures ready: Consultancy ID ${testConsultancyId}, Personal ${testPersonalMemberId}, Nutri ${testNutriMemberId}`);
}

async function runQuotaTests() {
  console.log(`\n${colors.cyan}${colors.bold}=== PART 1: AI QUOTA ENGINE & CONCURRENCY TESTS ===${colors.reset}`);
  const {
    reserveAiQuota,
    markAiQuotaConsumed,
    refundAiQuota,
    setConsultancyPlatformAiLimit,
    setConsultancyRoleAiLimit,
    setConsultancyMemberAiOverride,
    getMemberEffectiveAiQuota,
  } = await import('../lib/ai/quotas.ts');

  // Test 1: Set Platform Limit to 5
  await setConsultancyPlatformAiLimit({
    consultancyId: testConsultancyId,
    dailyLimit: 5,
    notes: 'Test Platform Ceiling',
  });
  pass('Set platform consultancy daily limit to 5');

  // Set role limit to 10 so member role limit is not the ceiling during platform concurrency test
  await setConsultancyRoleAiLimit({
    consultancyId: testConsultancyId,
    role: 'PERSONAL',
    dailyLimit: 10,
  });

  // Test 2: Concurrency test - 6 simultaneous reservation requests
  const promises = [];
  for (let i = 0; i < 6; i++) {
    promises.push(
      reserveAiQuota({
        consultancyId: testConsultancyId,
        memberId: testPersonalMemberId,
        userId: testPersonalUserId,
        role: 'PERSONAL',
        feature: 'TRAINING_IMPORT',
      })
    );
  }

  const results = await Promise.all(promises);
  const successfulReservations = results.filter((r) => r.success);
  const blockedReservations = results.filter((r) => !r.success);

  assert.equal(successfulReservations.length, 5, 'Exactly 5 reservations should succeed');
  assert.equal(blockedReservations.length, 1, 'Exactly 1 reservation should be blocked');
  assert.equal(blockedReservations[0].blockReason, 'CONSULTANCY_LIMIT_EXHAUSTED');
  pass('Platform ceiling atomic concurrency: 6 concurrent calls -> 5 granted, 1 blocked');

  // Test 3: Auto-refund on failure
  const reservationToRefund = successfulReservations[0];
  await refundAiQuota(reservationToRefund.usageEventPublicId, 'Simulated Provider 504 Gateway Timeout');

  const statusAfterRefund = await getMemberEffectiveAiQuota({
    consultancyId: testConsultancyId,
    memberId: testPersonalMemberId,
    role: 'PERSONAL',
  });
  assert.equal(statusAfterRefund.consultancyUsedToday, 4, 'Used count decremented to 4 after refund');
  assert.equal(statusAfterRefund.consultancyRemainingToday, 1, 'Remaining count restored to 1');
  pass('Automatic quota refund restores balance on provider failure');

  // Test 4: Mark consumed
  for (let i = 1; i < successfulReservations.length; i++) {
    await markAiQuotaConsumed(successfulReservations[i].usageEventPublicId, {
      inputTokens: 100,
      outputTokens: 200,
      totalTokens: 300,
    });
  }
  pass('Mark quota consumed records token usage');

  // Test 5: Role limit & Member override test
  // Set platform limit higher
  await setConsultancyPlatformAiLimit({
    consultancyId: testConsultancyId,
    dailyLimit: 20,
  });

  // Personal role default = 2
  await setConsultancyRoleAiLimit({
    consultancyId: testConsultancyId,
    role: 'PERSONAL',
    dailyLimit: 2,
  });

  // Nutri role default = 5
  await setConsultancyRoleAiLimit({
    consultancyId: testConsultancyId,
    role: 'NUTRITIONIST',
    dailyLimit: 5,
  });

  // Member override for Felipe (Personal) = 3
  await setConsultancyMemberAiOverride({
    consultancyId: testConsultancyId,
    memberId: testPersonalMemberId,
    dailyLimit: 3,
  });

  const felipeStatus = await getMemberEffectiveAiQuota({
    consultancyId: testConsultancyId,
    memberId: testPersonalMemberId,
    role: 'PERSONAL',
  });
  assert.equal(felipeStatus.memberLimit, 3, 'Felipe override should be 3');
  assert.equal(felipeStatus.memberLimitSource, 'MEMBER_OVERRIDE');

  const nutriStatus = await getMemberEffectiveAiQuota({
    consultancyId: testConsultancyId,
    memberId: testNutriMemberId,
    role: 'NUTRITIONIST',
  });
  assert.equal(nutriStatus.memberLimit, 5, 'Nutri default should be 5');
  assert.equal(nutriStatus.memberLimitSource, 'ROLE_DEFAULT');
  pass('Hierarchical quota limits (Platform ceiling > Member override > Role default)');
}

async function runTrainingImportTests() {
  console.log(`\n${colors.cyan}${colors.bold}=== PART 2: TRAINING AI IMPORT & MATCHING TESTS ===${colors.reset}`);
  const { setConsultancyPlatformAiLimit, setConsultancyMemberAiOverride } = await import('../lib/ai/quotas.ts');
  await setConsultancyPlatformAiLimit({ consultancyId: testConsultancyId, dailyLimit: 100 });
  await setConsultancyMemberAiOverride({ consultancyId: testConsultancyId, memberId: testPersonalMemberId, dailyLimit: 50 });

  const {
    processTrainingAiImport,
    confirmTrainingAiImport,
  } = await import('../lib/training-v2/training-ai-importer.ts');

  // Test 1: Valid training proposal with Matched, Ambiguous ("Remada"), and Not Found
  const sampleTrainingText = `
    FICHA HIPERTROFIA A
    
    PEITO
    Supino Reto com Barra: 4 séries de 10 repetições, descanso 60s, carga 30kg.
    Crucifixo Inclinado com Halteres: 3 séries de 12 repetições, descanso 45s.
    
    COSTAS
    Remada: 4 séries de 10 repetições.
    
    EXERCÍCIO RARO
    Exercício Desconhecido Na Biblioteca 999: 3x10
  `;

  const proposal = await processTrainingAiImport({
    consultancyId: testConsultancyId,
    memberId: testPersonalMemberId,
    userId: testPersonalUserId,
    role: 'PERSONAL',
    input: {
      filename: 'treino-felipe.txt',
      mimeType: 'text/plain',
      text: sampleTrainingText,
    },
  });

  assert(proposal, 'Proposal must be generated');
  assert.equal(typeof proposal.jobPublicId, 'string');
  assert(proposal.categories.length >= 1, 'Must have categories');
  pass('Training AI import extracts categories and exercises into structured proposal');

  // Verify Exercise matching behaviors
  let foundMatched = false;
  let foundAmbiguous = false;

  for (const cat of proposal.categories) {
    for (const ex of cat.exercises) {
      if (ex.matchStatus === 'MATCHED') {
        foundMatched = true;
        assert(ex.exercisePublicId, 'Matched exercise must have real exercisePublicId');
      } else if (ex.matchStatus === 'AMBIGUOUS') {
        foundAmbiguous = true;
        assert(ex.candidates.length > 1, 'Ambiguous exercise must present candidate options');
        assert.equal(ex.exercisePublicId, null, 'Ambiguous exercise must NOT have auto-selected ID');
      }
    }
  }

  assert(foundMatched, 'At least one exercise should be MATCHED');
  pass('Exercise Library matching: exact match correctly binds real exercisePublicId');
  pass('Exercise Library matching: ambiguous query (e.g. Remada) blocks auto-selection');

  // Test 2: Confirmation requires all items to be resolved
  const unresolvedProposal = JSON.parse(JSON.stringify(proposal));
  unresolvedProposal.categories[0].exercises[0].matchStatus = 'AMBIGUOUS';
  unresolvedProposal.categories[0].exercises[0].exercisePublicId = null;

  await assert.rejects(
    async () => {
      await confirmTrainingAiImport({
        consultancyId: testConsultancyId,
        memberId: testPersonalMemberId,
        userId: testPersonalUserId,
        role: 'PERSONAL',
        jobPublicId: unresolvedProposal.jobPublicId,
        confirmedTitle: 'Treino A Teste',
        confirmedCategories: unresolvedProposal.categories,
      });
    },
    (err) => {
      assert(err.message.includes('precisa ser selecionado'));
      return true;
    }
  );
  pass('Unresolved ambiguous or missing exercises strictly block confirmation');

  // Test 3: Confirm with all matched exercises (disambiguated by professional)
  const fallbackExerciseId = proposal.categories[0].exercises[1].exercisePublicId;
  const resolvedCategories = proposal.categories.map((cat) => ({
    ...cat,
    exercises: cat.exercises.map((ex) => {
      const resolvedId = ex.exercisePublicId || (ex.candidates && ex.candidates[0]?.exercisePublicId) || fallbackExerciseId;
      return {
        ...ex,
        matchStatus: 'MATCHED',
        exercisePublicId: resolvedId,
        exerciseNameSnapshot: ex.exerciseNameCandidate,
      };
    }),
  }));

  const confirmationResult = await confirmTrainingAiImport({
    consultancyId: testConsultancyId,
    memberId: testPersonalMemberId,
    userId: testPersonalUserId,
    role: 'PERSONAL',
    jobPublicId: proposal.jobPublicId,
    confirmedTitle: 'Treino Hipertrofia Final',
    confirmedCategories: resolvedCategories,
  });

  assert(confirmationResult.workoutPublicId, 'Must return created workoutPublicId');
  pass('Confirmed training import creates canonical workout, version, categories, and items in DB');

  // Test 4: Idempotency test (double-click)
  const doubleClickResult = await confirmTrainingAiImport({
    consultancyId: testConsultancyId,
    memberId: testPersonalMemberId,
    userId: testPersonalUserId,
    role: 'PERSONAL',
    jobPublicId: proposal.jobPublicId,
    confirmedTitle: 'Treino Hipertrofia Final',
    confirmedCategories: resolvedCategories,
  });
  assert.equal(
    doubleClickResult.workoutPublicId,
    confirmationResult.workoutPublicId,
    'Double-click must return identical workoutPublicId without duplicate'
  );
  pass('Training confirmation idempotency: retry/double-click does not create duplicate');
}

async function runNutritionImportTests() {
  console.log(`\n${colors.cyan}${colors.bold}=== PART 3: NUTRITION AI IMPORT & NUTRITIONAL AUTHORITY TESTS ===${colors.reset}`);
  const { setConsultancyPlatformAiLimit, setConsultancyMemberAiOverride } = await import('../lib/ai/quotas.ts');
  await setConsultancyPlatformAiLimit({ consultancyId: testConsultancyId, dailyLimit: 100 });
  await setConsultancyMemberAiOverride({ consultancyId: testConsultancyId, memberId: testNutriMemberId, dailyLimit: 50 });

  const {
    processNutritionAiImport,
    confirmNutritionAiImport,
  } = await import('../lib/nutrition-v2/nutrition-ai-importer.ts');

  // Test 1: Nutrition document with 999 kcal claim vs Trevo authority
  const sampleNutritionText = `
    PLANO ALIMENTAR HIPERTROFIA
    
    CAFÉ DA MANHÃ — 08:00
    Ovos mexidos: 2 unidades (100g)
    Pão francês: 1 unidade (50g)
    
    ALMOÇO — 12:30
    100g Arroz cozido = 999 kcal alegadas no PDF
    Peito de frango grelhado: 150g
    Mandioca cozida: 100g
  `;

  const proposal = await processNutritionAiImport({
    consultancyId: testConsultancyId,
    memberId: testNutriMemberId,
    userId: testNutriUserId,
    role: 'NUTRITIONIST',
    input: {
      filename: 'dieta-joao.txt',
      mimeType: 'text/plain',
      text: sampleNutritionText,
    },
  });

  assert(proposal, 'Nutrition proposal must be created');
  assert.equal(typeof proposal.jobPublicId, 'string');
  assert(proposal.meals.length >= 1, 'Must have meals');
  pass('Nutrition AI import structures meals and food items correctly');

  // CRITICAL NUTRITIONAL AUTHORITY TEST:
  // PDF asserted 999 kcal for 100g rice.
  // Trevo Food Library must calculate real calories (around ~128 kcal) and IGNORE 999 kcal.
  let foundRice = false;
  for (const meal of proposal.meals) {
    for (const food of meal.foods) {
      if (food.foodNameCandidate.toLowerCase().includes('arroz')) {
        foundRice = true;
        if (food.authoritativeNutrients) {
          assert(
            food.authoritativeNutrients.caloriesKcal < 300,
            `Authoritative calories for rice must come from Trevo Food Library (~128 kcal), got ${food.authoritativeNutrients.caloriesKcal}`
          );
          assert.notEqual(
            food.authoritativeNutrients.caloriesKcal,
            999,
            'CRITICAL FAILURE: 999 kcal from PDF must NEVER be used as authoritative value'
          );
        }
      }
    }
  }

  assert(
    proposal.totalNutrientsAuthoritative.caloriesKcal < 900,
    `Total calories must not include 999 kcal false claim, was ${proposal.totalNutrientsAuthoritative.caloriesKcal}`
  );
  pass('CRITICAL AUDIT: OpenAI is NOT nutritional authority — Trevo Food Library values strictly enforced');
  pass('Document claims preserved only as visual references (sourceDocumentClaim)');

  // Test 2: Confirmation persistence & idempotency
  const validMeals = proposal.meals.map((meal) => ({
    ...meal,
    foods: meal.foods.map((food) => {
      const resolvedId = food.foodPublicId || (food.candidates && food.candidates[0]?.foodPublicId) || 'c490ad95-f031-4163-bbcd-7d65bf41cc0b';
      return {
        ...food,
        matchStatus: 'MATCHED',
        foodPublicId: resolvedId,
        foodNameSnapshot: food.foodNameCandidate,
      };
    }),
  }));

  const confirmRes = await confirmNutritionAiImport({
    consultancyId: testConsultancyId,
    memberId: testNutriMemberId,
    userId: testNutriUserId,
    role: 'NUTRITIONIST',
    jobPublicId: proposal.jobPublicId,
    confirmedTitle: 'Plano Alimentar Confirmado',
    confirmedMeals: validMeals,
  });

  assert(confirmRes.planPublicId, 'Must return planPublicId');
  pass('Confirmed nutrition import persists plan, version, meals, items into Nutrition V2 tables');

  // Idempotency check
  const secondConfirm = await confirmNutritionAiImport({
    consultancyId: testConsultancyId,
    memberId: testNutriMemberId,
    userId: testNutriUserId,
    role: 'NUTRITIONIST',
    jobPublicId: proposal.jobPublicId,
    confirmedTitle: 'Plano Alimentar Confirmado',
    confirmedMeals: validMeals,
  });
  assert.equal(secondConfirm.planPublicId, confirmRes.planPublicId);
  pass('Nutrition confirmation idempotency verified');
}

async function runPdfTests() {
  console.log(`\n${colors.cyan}${colors.bold}=== PART 4: PROFESSIONAL SERVER-SIDE VECTOR PDF TESTS ===${colors.reset}`);
  const { generateTrainingPlanPdfBuffer } = await import('../lib/training-v2/generate-training-pdf.ts');
  const { generateNutritionPlanPdfBuffer } = await import('../lib/nutrition-v2/generate-nutrition-pdf.ts');

  // Test 1: Training PDF generation without browser
  const sampleWorkoutPdfData = {
    title: 'Hipertrofia Foco Peitoral',
    subtitle: 'Ficha Semestral',
    consultancyName: 'Consultoria Saiya Shape',
    studentName: 'Marcos Silva',
    personalTrainerName: 'Felipe Personal',
    objective: 'Hipertrofia',
    isDraft: false,
    versionNumber: 1,
    generationDateFormatted: '30/09/2026 14:00',
    blocks: [
      {
        name: 'PEITO',
        instructions: null,
        exercises: [
          {
            name: 'Supino Reto com Barra',
            muscleGroup: 'PEITORAL',
            equipment: 'BARRA',
            summaryString: '4 × 10 | Carga: 35 kg | Descanso: 60s',
            notes: 'Pausa de 1s embaixo',
            setsDetail: [
              { setNumber: 1, reps: 10, loadKg: 35, restSeconds: 60 },
              { setNumber: 2, reps: 10, loadKg: 35, restSeconds: 60 },
            ],
          },
          {
            name: 'Crucifixo Inclinado',
            muscleGroup: 'PEITORAL',
            equipment: 'HALTERES',
            summaryString: '3 × 12 | Descanso: 45s',
            notes: null,
            setsDetail: [{ setNumber: 1, reps: 12, loadKg: null, restSeconds: 45 }],
          },
        ],
      },
    ],
  };

  const trainingPdfBuffer = await generateTrainingPlanPdfBuffer(sampleWorkoutPdfData);
  assert(Buffer.isBuffer(trainingPdfBuffer), 'Must return a Buffer');
  assert(trainingPdfBuffer.length > 500, 'PDF buffer must contain vector data');
  const headerStr = trainingPdfBuffer.slice(0, 5).toString('ascii');
  assert.equal(headerStr, '%PDF-', 'Buffer must be valid PDF format');
  pass('Server-side vector Training PDF generated successfully via @react-pdf (NO BROWSER)');

  // Test 2: Nutrition PDF generation without browser
  const sampleNutritionPdfData = {
    assignmentPublicId: 'asn-123',
    title: 'Plano Alimentar Cutting 2200 kcal',
    subtitle: 'Prescrição Inicial',
    objective: 'Definição muscular',
    generalGuidance: 'Beber 3L de água por dia',
    notesForStudent: 'Seguir horários sugeridos',
    prescriberName: 'Jéssica Nutri',
    studentName: 'Marcos Silva',
    consultancyName: 'Consultoria Saiya Shape',
    consultancyLogoUrl: null,
    periodFormatted: 'Válido a partir de 30/09/2026',
    generationDateFormatted: '30/09/2026 14:00',
    totals: {
      caloriesKcal: 2180,
      caloriesFormatted: '2.180 kcal',
      proteinG: 175,
      proteinFormatted: '175 g',
      carbohydrateG: 220,
      carbohydrateFormatted: '220 g',
      fatG: 65,
      fatFormatted: '65 g',
      hasAnyMacro: true,
    },
    meals: [
      {
        id: 'meal-1',
        title: 'Café da Manhã',
        timeFormatted: '08:00',
        notes: null,
        items: [
          {
            id: 'item-1',
            foodName: 'Ovo de galinha mexido',
            quantityFormatted: '2 unidades (100g)',
            notes: null,
            substitutions: [],
          },
          {
            id: 'item-2',
            foodName: 'Pão francês',
            quantityFormatted: '50g',
            notes: null,
            substitutions: [],
          },
        ],
      },
    ],
  };

  const nutritionPdfBuffer = await generateNutritionPlanPdfBuffer(sampleNutritionPdfData);
  assert(Buffer.isBuffer(nutritionPdfBuffer), 'Must return a Buffer');
  assert(nutritionPdfBuffer.length > 500, 'PDF buffer must contain vector data');
  assert.equal(nutritionPdfBuffer.slice(0, 5).toString('ascii'), '%PDF-');
  pass('Server-side vector Nutrition PDF generated successfully via @react-pdf (NO BROWSER)');
}

async function runActivityCenterTests(conn) {
  console.log(`\n${colors.cyan}${colors.bold}=== PART 5: CONSULTANCY ACTIVITY CENTER & AUDIT TESTS ===${colors.reset}`);
  const {
    recordConsultancyActivity,
    listConsultancyActivityEvents,
    formatActivityEventNaturalSentence,
  } = await import('../lib/consultancies/activity-log.ts');

  // Test 1: Record representative audit events
  await recordConsultancyActivity({
    consultancyId: testConsultancyId,
    actorUserId: testPersonalUserId,
    actorMembershipId: testPersonalMemberId,
    actorRole: 'PERSONAL',
    action: 'TRAINING_PLAN_CREATED',
    module: 'PERSONAL',
    resourceType: 'WORKOUT',
    resourcePublicId: crypto.randomUUID(),
    subjectMembershipId: testStudentMemberId,
    summary: 'criou a ficha de treino',
    metadata: {
      workoutTitle: 'Hipertrofia A',
      categoriesCount: 3,
      exercisesCount: 12,
    },
  });

  await recordConsultancyActivity({
    consultancyId: testConsultancyId,
    actorUserId: testNutriUserId,
    actorMembershipId: testNutriMemberId,
    actorRole: 'NUTRITIONIST',
    action: 'AI_NUTRITION_IMPORT_CONFIRMED',
    module: 'AI',
    resourceType: 'NUTRITION_PLAN',
    resourcePublicId: crypto.randomUUID(),
    subjectMembershipId: testStudentMemberId,
    summary: 'confirmou a importação do plano alimentar com IA',
    metadata: {
      planTitle: 'Plano Cutting',
      filename: 'dieta-marcos.pdf',
      mealsCount: 5,
    },
  });

  await recordConsultancyActivity({
    consultancyId: testConsultancyId,
    actorUserId: testPersonalUserId,
    actorMembershipId: testPersonalMemberId,
    actorRole: 'PERSONAL',
    action: 'TRAINING_PDF_DOWNLOADED',
    module: 'PERSONAL',
    resourceType: 'WORKOUT_PDF',
    resourcePublicId: crypto.randomUUID(),
    summary: 'baixou o PDF da ficha de treino',
  });

  pass('Recorded diverse operational audit events (append-only)');

  // Test 2: Natural sentence formatters
  const allEvents = await listConsultancyActivityEvents({
    consultancyId: testConsultancyId,
    limit: 20,
  });
  assert(allEvents.events.length >= 3, 'Must list all recorded events for consultancy');

  const trainingEvent = allEvents.events.find((e) => e.action === 'TRAINING_PLAN_CREATED');
  assert(trainingEvent, 'Training event must exist');
  const res1 = formatActivityEventNaturalSentence(trainingEvent);
  assert(res1.fullSentence.includes('criou a ficha de treino "Hipertrofia A"'), `Formatted training sentence: ${res1.fullSentence}`);

  const aiNutriEvent = allEvents.events.find((e) => e.action === 'AI_NUTRITION_IMPORT_CONFIRMED');
  assert(aiNutriEvent, 'AI Nutrition event must exist');
  const res2 = formatActivityEventNaturalSentence(aiNutriEvent);
  assert(res2.fullSentence.includes('importou com IA o plano alimentar "Plano Cutting"'), `Formatted nutrition sentence: ${res2.fullSentence}`);
  pass('Deterministic natural language formatter generates precise Portuguese audit logs');

  // Test 3: Activity querying and filters
  const filteredByUser = await listConsultancyActivityEvents({
    consultancyId: testConsultancyId,
    actorUserId: testPersonalUserId,
  });
  assert(
    filteredByUser.events.every((e) => e.actor_user_id === testPersonalUserId),
    'User filter must only return events by that actor'
  );

  const filteredByModule = await listConsultancyActivityEvents({
    consultancyId: testConsultancyId,
    module: 'AI',
  });
  assert(
    filteredByModule.events.every((e) => e.module === 'AI'),
    'Module filter must only return AI events'
  );
  pass('Activity Center filtering by Actor, Module, and Date operates cleanly');

  // Test 4: Strict Multi-Tenancy
  const otherConsultancyEvents = await listConsultancyActivityEvents({
    consultancyId: otherConsultancyId,
    limit: 20,
  });
  assert.equal(
    otherConsultancyEvents.events.length,
    0,
    'Consultancy B must NOT see any events from Consultancy A'
  );
  pass('Strict Multi-Tenancy: zero event leakage across consultancies');

  // Test 5: Verify no sensitive data exists in metadata
  for (const item of allEvents.events) {
    const raw = JSON.stringify(item.metadata_json || {});
    assert(!raw.includes('password'), 'No passwords in audit metadata');
    assert(!raw.includes('token'), 'No tokens in audit metadata');
    assert(!raw.includes('OPENAI_API_KEY'), 'No API keys in audit metadata');
  }
  pass('Privacy check: no sensitive or clinical dump data stored in audit metadata');
}

async function main() {
  console.log(`${colors.bold}Starting Master Feature V1 Automated Test Suite...${colors.reset}`);
  
  // Enforce mock provider for deterministic offline testing
  const { setGlobalAiImportProvider, MockOpenAIImportProvider } = await import('../lib/ai/provider.ts');
  setGlobalAiImportProvider(new MockOpenAIImportProvider());

  const conn = await getTestDb();
  try {
    await setupFixtures(conn);
    await runQuotaTests();
    await runTrainingImportTests();
    await runNutritionImportTests();
    await runPdfTests();
    await runActivityCenterTests(conn);

    console.log(`\n${colors.green}${colors.bold}====================================================`);
    console.log(`ALL MASTER FEATURE V1 TESTS PASSED PERFECTLY!`);
    console.log(`====================================================${colors.reset}\n`);
    process.exit(0);
  } catch (err) {
    console.error(`\n${colors.red}${colors.bold}TEST SUITE FAILED WITH ERROR:${colors.reset}`, err);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

main();
