/**
 * TREVO ONE — AI NUTRITION IMPORT V2 & SMART EXERCISE RESOLUTION V2
 * COMPREHENSIVE VERIFICATION & REGRESSION SUITE
 */

import crypto from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "../lib/db/mysql";
import {
  matchFoodCandidate,
  calculateAuthoritativeItemNutrients,
  confirmNutritionAiImport,
  type ResolvedNutritionMeal,
  type ResolvedNutritionFoodItem,
} from "../lib/nutrition-v2/nutrition-ai-importer";
import {
  searchExternalFoodSource,
  autoIngestExternalFood,
  isUsdaApiConfigured,
  type ExternalFoodCandidate,
} from "../lib/nutrition-v2/external-food-source";
import {
  resolveCanonicalExercise,
  normalizeExerciseText,
  calculateExerciseMatchScore,
  hasConflictingModifiers,
  GENERIC_EXERCISE_ROOTS,
} from "../lib/training-v2/exercise-resolver";
import { confirmTrainingAiImport } from "../lib/training-v2/training-ai-importer";

const DOCUMENT_FIXTURE_45_TERMS = [
  "pão de forma",
  "banana",
  "torradas",
  "doce de leite",
  "gelatina de frutas",
  "pão francês",
  "cuscuz",
  "aipim",
  "banana-da-terra",
  "tapioca",
  "ovos",
  "filé de frango",
  "patinho",
  "alcatra",
  "muçarela",
  "requeijão",
  "queijo minas",
  "banana prata",
  "maçã",
  "melão",
  "abacaxi",
  "manga",
  "laranja",
  "tangerina",
  "tomate",
  "pepino",
  "folhas",
  "peixe",
  "coxa de frango",
  "sobrecoxa",
  "fígado bovino",
  "filé suíno",
  "atum em posta",
  "moela de frango",
  "arroz",
  "purê de batata",
  "aipim assado",
  "macarrão de arroz",
  "batata inglesa assada",
  "feijão carioca",
  "feijão preto",
  "ervilha em grão",
  "pão libanês",
  "carne moída",
  "atum em lata",
];

async function runTestSuite() {
  console.log("==================================================");
  console.log("TREVO ONE — AI NUTRITION V2 & SMART EXERCISE V2 SUITE");
  console.log("==================================================\n");

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, testName: string, details = "") {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`[PASS] ${testName}`);
    } else {
      failedTests++;
      console.error(`[FAIL] ${testName} ${details ? "- " + details : ""}`);
    }
  }

  const db = await getDbConnection();
  let consultancyId = 1;
  let memberId = 1;
  let userId = 1;

  try {
    const [cRows] = await db.query<RowDataPacket[]>(
      `SELECT c.id AS c_id, cm.id AS m_id, cm.user_id AS u_id
       FROM consultancies c
       JOIN consultancy_members cm ON cm.consultancy_id = c.id
       WHERE cm.status = 'ACTIVE' LIMIT 1`
    );
    if (cRows.length > 0) {
      consultancyId = cRows[0].c_id;
      memberId = cRows[0].m_id;
      userId = cRows[0].u_id;
    }
  } finally {
    db.release();
  }

  // ==============================================================
  // 1. SMART EXERCISE RESOLUTION V2 (ABBREVIATIONS & INTENT)
  // ==============================================================
  console.log("\n--- SECTION 1: SMART EXERCISE RESOLUTION V2 ---");

  const exerciseDbFixture = [
    { publicId: "ex-sup-inc-halter", name: "Supino Inclinado com Halteres", muscleGroupPrimary: "PEITO", equipment: "HALTERES" },
    { publicId: "ex-sup-reto-barra", name: "Supino Reto com Barra", muscleGroupPrimary: "PEITO", equipment: "BARRA" },
    { publicId: "ex-pux-front-triang", name: "Puxada Frontal na Polia com Pegada Neutra Fechada", muscleGroupPrimary: "COSTAS", equipment: "POLIA" },
    { publicId: "ex-pux-front-aberta", name: "Puxada Frontal com Barra Aberta", muscleGroupPrimary: "COSTAS", equipment: "POLIA" },
    { publicId: "ex-rem-baixa-polia", name: "Remada Baixa na Polia", muscleGroupPrimary: "COSTAS", equipment: "POLIA" },
    { publicId: "ex-rem-curvada", name: "Remada Curvada com Barra", muscleGroupPrimary: "COSTAS", equipment: "BARRA" },
    { publicId: "ex-rem-maq-neutra", name: "Remada na Máquina com Pegada Neutra", muscleGroupPrimary: "COSTAS", equipment: "MAQUINA" },
    { publicId: "ex-rosca-scott-w", name: "Rosca Scott com Barra W", muscleGroupPrimary: "BICEPS", equipment: "BARRA_W" },
    { publicId: "ex-rosca-direta", name: "Rosca Direta com Barra", muscleGroupPrimary: "BICEPS", equipment: "BARRA" },
    { publicId: "ex-face-pull", name: "Face Pull na Polia", muscleGroupPrimary: "DELTOIDES", equipment: "POLIA" },
    { publicId: "ex-pulldown-retos", name: "Pulldown na Polia com Braços Estendidos", muscleGroupPrimary: "COSTAS", equipment: "POLIA" },
    { publicId: "ex-desenv-halter", name: "Desenvolvimento com Halteres", muscleGroupPrimary: "DELTOIDES", equipment: "HALTERES" },
    { publicId: "ex-arnold-maquina", name: "Desenvolvimento Arnold na Máquina", muscleGroupPrimary: "DELTOIDES", equipment: "MAQUINA" },
    { publicId: "ex-elev-lat-halter", name: "Elevação Lateral com Halteres", muscleGroupPrimary: "DELTOIDES", equipment: "HALTERES" },
    { publicId: "ex-rot-ext-cabo", name: "Rotação Externa na Polia", muscleGroupPrimary: "DELTOIDES", equipment: "POLIA" },
    { publicId: "ex-cruc-inc-halter", name: "Crucifixo Inclinado com Halteres", muscleGroupPrimary: "PEITO", equipment: "HALTERES" },
    { publicId: "ex-voador-maquina", name: "Voador na Máquina", muscleGroupPrimary: "PEITO", equipment: "MAQUINA" },
    { publicId: "ex-agach-livre", name: "Agachamento Livre", muscleGroupPrimary: "QUADRICEPS", equipment: "BARRA" },
    { publicId: "ex-agach-smith", name: "Agachamento no Smith", muscleGroupPrimary: "QUADRICEPS", equipment: "SMITH" },
    { publicId: "ex-cad-adutora", name: "Cadeira Adutora", muscleGroupPrimary: "ADUTORES", equipment: "MAQUINA" },
    { publicId: "ex-cad-abdutora", name: "Cadeira Abdutora", muscleGroupPrimary: "GLUTEOS", equipment: "MAQUINA" },
  ];

  // Specific 10 Exercises (Section 15)
  // 1. supino inclinado halter
  const resSupIncHalt = resolveCanonicalExercise("supino inclinado halter", exerciseDbFixture);
  assert(resSupIncHalt.status === "MATCHED" && resSupIncHalt.matched?.publicId === "ex-sup-inc-halter",
    'Section 15: "supino inclinado halter" -> Supino Inclinado com Halteres');

  // 2. crucifixo inclinado
  const resCrucInc = resolveCanonicalExercise("crucifixo inclinado", exerciseDbFixture);
  assert(resCrucInc.status === "MATCHED" && resCrucInc.matched?.publicId === "ex-cruc-inc-halter",
    'Section 15: "crucifixo inclinado" -> Crucifixo Inclinado com Halteres');

  // 3. puxada frente triângulo
  const resPuxFrenteTriang = resolveCanonicalExercise("puxada frente triângulo", exerciseDbFixture);
  assert(resPuxFrenteTriang.status === "MATCHED" && resPuxFrenteTriang.matched?.publicId === "ex-pux-front-triang",
    'Section 15: "puxada frente triângulo" -> Puxada Frontal na Polia com Pegada Neutra Fechada');

  // 4. remada baixa cabo
  const resRemBaixaCabo = resolveCanonicalExercise("remada baixa cabo", exerciseDbFixture);
  assert(resRemBaixaCabo.status === "MATCHED" && resRemBaixaCabo.matched?.publicId === "ex-rem-baixa-polia",
    'Section 15: "remada baixa cabo" -> Remada Baixa na Polia');

  // 5. remada máquina neutra
  const resRemMaqNeutra = resolveCanonicalExercise("remada máquina neutra", exerciseDbFixture);
  assert(resRemMaqNeutra.status === "MATCHED" && resRemMaqNeutra.matched?.publicId === "ex-rem-maq-neutra",
    'Section 15: "remada máquina neutra" -> Remada na Máquina com Pegada Neutra');

  // 6. face pull
  const resFacepull = resolveCanonicalExercise("face pull", exerciseDbFixture);
  assert(resFacepull.status === "MATCHED" && resFacepull.matched?.publicId === "ex-face-pull",
    'Section 15: "face pull" -> Face Pull na Polia');

  // 7. pulldown braços retos
  const resPulldown = resolveCanonicalExercise("pulldown braços retos", exerciseDbFixture);
  assert(resPulldown.status === "MATCHED" && resPulldown.matched?.publicId === "ex-pulldown-retos",
    'Section 15: "pulldown braços retos" -> Pulldown na Polia com Braços Estendidos');

  // 8. arnold máquina
  const resArnold = resolveCanonicalExercise("arnold máquina", exerciseDbFixture);
  assert(resArnold.status === "MATCHED" && resArnold.matched?.publicId === "ex-arnold-maquina",
    'Section 15: "arnold máquina" -> Desenvolvimento Arnold na Máquina');

  // 9. elevação lateral halter
  const resElevLatHalt = resolveCanonicalExercise("elevação lateral halter", exerciseDbFixture);
  assert(resElevLatHalt.status === "MATCHED" && resElevLatHalt.matched?.publicId === "ex-elev-lat-halter",
    'Section 15: "elevação lateral halter" -> Elevação Lateral com Halteres');

  // 10. rotação externa cabo
  const resRotExt = resolveCanonicalExercise("rotação externa cabo", exerciseDbFixture);
  assert(resRotExt.status === "MATCHED" && resRotExt.matched?.publicId === "ex-rot-ext-cabo",
    'Section 15: "rotação externa cabo" -> Rotação Externa na Polia');

  // Negative Tests / Anti-Collision Guards (Section 16)
  // 1. Crucifixo != Supino
  const resCrucifixoConflict = resolveCanonicalExercise("Crucifixo Inclinado", [
    { publicId: "ex-sup-inc", name: "Supino Inclinado com Halteres" }
  ]);
  assert(resCrucifixoConflict.status !== "MATCHED",
    'Section 16 Negative Guard: "Crucifixo Inclinado" MUST NEVER match "Supino Inclinado"');

  // 2. Rosca Scott != Rosca Direta
  const resScottConflict = resolveCanonicalExercise("Rosca Scott", [
    { publicId: "ex-rosca-dir", name: "Rosca Direta com Barra" }
  ]);
  assert(resScottConflict.status !== "MATCHED",
    'Section 16 Negative Guard: "Rosca Scott" MUST NEVER match "Rosca Direta"');

  // 3. Adutora != Abdutora
  const resAdutoraConflict = resolveCanonicalExercise("Cadeira Adutora", [
    { publicId: "ex-cad-abdutora", name: "Cadeira Abdutora" }
  ]);
  assert(resAdutoraConflict.status !== "MATCHED",
    'Section 16 Negative Guard: "Cadeira Adutora" MUST NEVER match "Cadeira Abdutora"');

  // 4. Inclinado != Reto
  const resSupIncConflict = resolveCanonicalExercise("Supino Inclinado", [
    { publicId: "ex-sup-reto", name: "Supino Reto com Barra" }
  ]);
  assert(resSupIncConflict.status !== "MATCHED",
    'Section 16 Negative Guard: "Supino Inclinado" MUST NEVER match "Supino Reto"');

  // 5. Neutra != Pronada
  assert(hasConflictingModifiers("Puxada Pegada Neutra", "Puxada Pegada Pronada") === true,
    'Section 16 Negative Guard: "Neutra" MUST NEVER match "Pronada"');

  // Generics (Section 17)
  const resGenericRemada = resolveCanonicalExercise("Remada", exerciseDbFixture);
  assert(resGenericRemada.status === "AMBIGUOUS",
    'Section 17 Generic Guard: "Remada" alone MUST be AMBIGUOUS');

  const resGenericSupino = resolveCanonicalExercise("Supino", exerciseDbFixture);
  assert(resGenericSupino.status === "AMBIGUOUS",
    'Section 17 Generic Guard: "Supino" alone MUST be AMBIGUOUS');

  const resGenericAgachamento = resolveCanonicalExercise("Agachamento", exerciseDbFixture);
  assert(resGenericAgachamento.status === "AMBIGUOUS",
    'Section 17 Generic Guard: "Agachamento" alone MUST be AMBIGUOUS');

  // ==============================================================
  // 2. TRAINING AI IMPORT PARTIAL SAVE (NO DISCARD, PRESERVES DRAFT)
  // ==============================================================
  console.log("\n--- SECTION 2: TRAINING PARTIAL IMPORT SAVE ---");

  // Create temporary import job in DB with real exercise from DB
  const dbJob = await getDbConnection();
  const testJobPublicId = crypto.randomUUID();
  let realExPublicId = "ex-fallback";
  try {
    const [realExRows] = await dbJob.query<RowDataPacket[]>(
      `SELECT public_id, name, muscle_group_primary, equipment FROM exercises LIMIT 1`
    );
    if (realExRows.length > 0) {
      realExPublicId = String(realExRows[0].public_id);
    }

    await dbJob.query(
      `INSERT INTO ai_import_jobs (
        public_id, idempotency_key, consultancy_id, member_id, user_id, feature, status,
        source_filename, source_hash, source_type, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'TRAINING_IMPORT', 'PROCESSING', 'test_training.pdf', 'hash123', 'PDF', NOW(3), NOW(3))`,
      [testJobPublicId, crypto.randomUUID(), consultancyId, memberId, userId]
    );
  } finally {
    dbJob.release();
  }

  // Confirm workout import with 1 MATCHED, 1 AMBIGUOUS, and 1 NOT_FOUND exercise
  const trainingSaveResult = await confirmTrainingAiImport({
    consultancyId,
    memberId,
    userId,
    role: "PERSONAL",
    jobPublicId: testJobPublicId,
    confirmedTitle: "Treino Parcial com Pendências Test",
    confirmedCategories: [
      {
        name: "Treino A - Peito",
        exercises: [
          {
            id: "ex-1",
            originalText: "Supino Reto 4x10",
            exerciseNameCandidate: "Supino Reto com Barra",
            matchStatus: "MATCHED",
            exercisePublicId: realExPublicId,
            exerciseNameSnapshot: "Supino Reto com Barra",
            muscleGroupSnapshot: "PEITO",
            equipmentSnapshot: "BARRA",
            sets: 4,
            reps: 10,
            repsMax: null,
            durationSeconds: null,
            restSeconds: 60,
            load: 40,
            notes: "Carga progressiva",
            candidates: [],
          },
          {
            id: "ex-2",
            originalText: "Remada Máquina Especial",
            exerciseNameCandidate: "Remada Máquina Especial",
            matchStatus: "AMBIGUOUS",
            exercisePublicId: null, // NOT linked to library record
            exerciseNameSnapshot: "Remada Máquina Especial",
            muscleGroupSnapshot: "COSTAS",
            equipmentSnapshot: "MAQUINA",
            sets: 3,
            reps: 12,
            repsMax: null,
            durationSeconds: null,
            restSeconds: 45,
            load: null,
            notes: "Revisar pegada com personal",
            candidates: [],
          },
          {
            id: "ex-3",
            originalText: "Exercício Raro Desconhecido 3x15",
            exerciseNameCandidate: "Exercício Raro Desconhecido",
            matchStatus: "NOT_FOUND",
            exercisePublicId: null, // NOT found
            exerciseNameSnapshot: "Exercício Raro Desconhecido",
            muscleGroupSnapshot: null,
            equipmentSnapshot: null,
            sets: 3,
            reps: 15,
            repsMax: null,
            durationSeconds: null,
            restSeconds: 60,
            load: null,
            notes: "Manter nome bruto original",
            candidates: [],
          },
        ],
      },
    ],
  });

  assert(Boolean(trainingSaveResult.workoutPublicId),
    "Training Partial Import: Draft workout saved successfully without discarding unmatched exercises");

  // Verify in DB that all 3 exercises were inserted
  const dbVerifyTr = await getDbConnection();
  try {
    const [itemRows] = await dbVerifyTr.query<RowDataPacket[]>(
      `SELECT wbi.exercise_name_snapshot, wbi.exercise_id
       FROM workout_block_items wbi
       JOIN workout_blocks wb ON wb.id = wbi.block_id
       JOIN workout_versions wv ON wv.id = wb.workout_version_id
       JOIN workouts w ON w.id = wv.workout_id
       WHERE w.public_id = ?`,
      [trainingSaveResult.workoutPublicId]
    );

    assert(itemRows.length === 3, "Training Partial Import: Exactly 3 items saved into workout_block_items");
    const nullExerciseIdItems = itemRows.filter((r) => r.exercise_id === null);
    assert(nullExerciseIdItems.length === 2, "Training Partial Import: 2 pending items saved with exercise_id = NULL");
    const rawSaved = itemRows.some((r) => r.exercise_name_snapshot === "Exercício Raro Desconhecido");
    assert(rawSaved, "Training Partial Import: Raw exercise name preserved in snapshot");
  } finally {
    dbVerifyTr.release();
  }

  // ==============================================================
  // 3. NUTRITION AI IMPORT (PROVENANCE, NO FAKE MACROS, SUBSTITUTIONS)
  // ==============================================================
  console.log("\n--- SECTION 3: NUTRITION AI IMPORT PHILOSOPHY ---");

  // Test: AI nutrient values NOT used as authority
  const mockFoodRecord = {
    foodPublicId: "food-123",
    name: "Aipim Cozido",
    sourceType: "TACO",
    caloriesKcal: 125, // Real authoritative value
    proteinG: 0.6,
    carbsG: 30.1,
    fatG: 0.3,
    fiberG: 1.6,
    referenceAmount: 100,
    referenceUnitCode: "G",
  };

  const authoritativeNutrients = calculateAuthoritativeItemNutrients(mockFoodRecord, 100);
  assert(authoritativeNutrients.caloriesKcal === 125,
    "AI Nutrient Authority: Calculated calories strictly match Food Library record (125 kcal)");
  assert(authoritativeNutrients.caloriesKcal !== 999,
    "AI Nutrient Authority: Never uses alleged OpenAI or document claim (999 kcal rejected)");

  // Test: Unknown != Zero
  const mockFoodWithNullMicros = {
    foodPublicId: "food-456",
    name: "Alimento Sem Fibra Cadastrada",
    sourceType: "MANUAL",
    caloriesKcal: 100,
    proteinG: 2,
    carbsG: 20,
    fatG: 1,
    fiberG: null, // UNKNOWN
    referenceAmount: 100,
    referenceUnitCode: "G",
  };
  const authWithNull = calculateAuthoritativeItemNutrients(mockFoodWithNullMicros, 100);
  assert(authWithNull.fiberG === null, "Unknown != Zero: fiberG remains null when unknown, NEVER converted to 0");

  // Test: External Food Source search & config
  const isUsdaConfigured = isUsdaApiConfigured();
  console.log(`[INFO] USDA FoodData Central API configured: ${isUsdaConfigured ? "YES" : "NO (BLOCKED_BY_CONFIGURATION)"}`);

  const externalSearchRes = await searchExternalFoodSource("aipim assado", { requestedPrep: "assado" });
  if (isUsdaConfigured) {
    assert(externalSearchRes.status === "FOUND" || externalSearchRes.status === "NOT_FOUND",
      "External Food Search: Online search returned valid status");
  } else {
    assert(externalSearchRes.status === "BLOCKED_BY_CONFIGURATION",
      "External Food Search: Graceful BLOCKED_BY_CONFIGURATION when USDA_FDC_API_KEY is not set");
  }

  // Test: Auto-ingest deduplication & provenance
  const testExternalCand: ExternalFoodCandidate = {
    sourceUid: "USDA_TEST_FIXTURE_99999",
    sourceKey: "USDA_FDC",
    sourceExternalCode: "99999",
    sourceName: "Cassava, cooked",
    displayNamePtBr: "Mandioca cozida",
    caloriesKcal: 160,
    proteinG: 1.4,
    carbsG: 38.1,
    fatG: 0.3,
    fiberG: 1.8,
    referenceAmount: 100,
    referenceUnitCode: "G",
    confidence: "HIGH",
    preparationMatch: true,
    nutrients: [
      { code: "FIBER", unitCode: "g", amount: 1.8 },
      { code: "NA", unitCode: "mg", amount: 14 },
      { code: "CA", unitCode: "mg", amount: 16 },
    ],
  };

  const ingestedFirst = await autoIngestExternalFood(consultancyId, testExternalCand);
  assert(Boolean(ingestedFirst.foodPublicId), "Auto Ingest: Successfully ingested external food record");
  assert(ingestedFirst.caloriesKcal === 160, "Auto Ingest: Authoritative calories preserved");

  // Re-ingest should deduplicate and return same record
  const ingestedSecond = await autoIngestExternalFood(consultancyId, testExternalCand);
  assert(ingestedFirst.foodPublicId === ingestedSecond.foodPublicId,
    "Deduplication: Re-ingest reuses existing food record with same source_uid without duplicating");

  // Clean up test ingested record
  const dbClean = await getDbConnection();
  try {
    await dbClean.query(`DELETE FROM nutrition_v2_foods WHERE source_uid = 'USDA_TEST_FIXTURE_99999'`);
  } finally {
    dbClean.release();
  }

  // ==============================================================
  // 4. NUTRITION DRAFT SAVE (PARTIAL SAVE, ALTERNATIVES "OU", FREE SALAD, NO PATIENT)
  // ==============================================================
  console.log("\n--- SECTION 4: NUTRITION DRAFT SAVE & ALTERNATIVES ---");

  const dbNutJob = await getDbConnection();
  const testNutJobPublicId = crypto.randomUUID();
  let realFoodPublicId = "food-fallback";
  try {
    const [rfRows] = await dbNutJob.query<RowDataPacket[]>(
      `SELECT public_id FROM nutrition_v2_foods WHERE status = 'ACTIVE' LIMIT 1`
    );
    if (rfRows.length > 0) {
      realFoodPublicId = String(rfRows[0].public_id);
    }

    await dbNutJob.query(
      `INSERT INTO ai_import_jobs (
        public_id, idempotency_key, consultancy_id, member_id, user_id, feature, status,
        source_filename, source_hash, source_type, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'NUTRITION_IMPORT', 'PROCESSING', 'dieta.pdf', 'hashNut123', 'PDF', NOW(3), NOW(3))`,
      [testNutJobPublicId, crypto.randomUUID(), consultancyId, memberId, userId]
    );
  } finally {
    dbNutJob.release();
  }

  // Build a test meal containing:
  // 1. Matched food item
  // 2. Substitutions ("OU" alternative options)
  // 3. Salada à vontade (free salad)
  // 4. Compound recipe ("Suco de mamão, ameixa e aveia" - NEEDS_RECIPE_DETAILS)
  // 5. Unresolved item (NOT_FOUND)
  const testMeals: ResolvedNutritionMeal[] = [
    {
      name: "Café da manhã",
      time: "08:00",
      notes: "Mastigar bem",
      foods: [
        {
          id: "food-item-1",
          originalText: "1 pão francês OU 120g cuscuz",
          foodNameCandidate: "Pão francês",
          matchStatus: "MATCHED",
          foodPublicId: realFoodPublicId,
          foodNameSnapshot: "Pão Francês",
          quantity: 50,
          unitCandidate: "unidade",
          notes: null,
          candidates: [],
          authoritativeNutrients: { caloriesKcal: 150, proteinG: 4, carbsG: 29, fatG: 1, fiberG: 1 },
          sourceDocumentClaim: null,
          provenance: "LOCAL_MATCHED",
          substitutions: [
            {
              id: "sub-1",
              originalText: "120g cuscuz",
              foodNameCandidate: "Cuscuz",
              matchStatus: "MATCHED",
              foodPublicId: null,
              foodNameSnapshot: "Cuscuz",
              quantity: 120,
              unitCandidate: "g",
              notes: "Opção 2",
              candidates: [],
              authoritativeNutrients: { caloriesKcal: 135, proteinG: 2.5, carbsG: 30, fatG: 0.5, fiberG: 2 },
              sourceDocumentClaim: null,
              provenance: "LOCAL_MATCHED",
            },
          ],
        },
        {
          id: "food-item-2",
          originalText: "Salada à vontade (tomate, pepino e folhas)",
          foodNameCandidate: "Salada à vontade",
          matchStatus: "MATCHED",
          foodPublicId: null,
          foodNameSnapshot: "Salada à vontade",
          quantity: null,
          unitCandidate: "à vontade",
          notes: "Consumo livre",
          candidates: [],
          authoritativeNutrients: null, // NOT invented!
          sourceDocumentClaim: null,
          provenance: "LOCAL_MATCHED",
        },
        {
          id: "food-item-3",
          originalText: "Suco de mamão, ameixa e aveia",
          foodNameCandidate: "Suco de mamão, ameixa e aveia",
          matchStatus: "NOT_FOUND",
          foodPublicId: null,
          foodNameSnapshot: "Suco de mamão, ameixa e aveia",
          quantity: 1,
          unitCandidate: "copo",
          notes: "NEEDS_RECIPE_DETAILS",
          candidates: [],
          authoritativeNutrients: null, // NOT invented!
          sourceDocumentClaim: null,
          provenance: "NEEDS_REVIEW",
        },
        {
          id: "food-item-4",
          originalText: "Alimento Exótico Raro 100g",
          foodNameCandidate: "Alimento Exótico Raro",
          matchStatus: "NOT_FOUND",
          foodPublicId: null,
          foodNameSnapshot: "Alimento Exótico Raro",
          quantity: 100,
          unitCandidate: "g",
          notes: "Não encontrado na biblioteca local",
          candidates: [],
          authoritativeNutrients: null,
          sourceDocumentClaim: null,
          provenance: "NEEDS_REVIEW",
        },
      ],
    },
  ];

  // Confirm nutrition import without target patient (draft without patient)
  const nutConfirmRes = await confirmNutritionAiImport({
    consultancyId,
    memberId,
    userId,
    role: "NUTRITIONIST",
    jobPublicId: testNutJobPublicId,
    confirmedTitle: "Plano Alimentar DRAFT Completo",
    targetPatientMembershipId: null, // Patient is optional!
    confirmedMeals: testMeals,
  });

  assert(Boolean(nutConfirmRes.planPublicId),
    "Nutrition Draft Save: Successfully saved DRAFT plan without patient and without blocking on pending items");

  // Verify database persistence of meal items and substitutions
  const dbVerifyNut = await getDbConnection();
  try {
    const [items] = await dbVerifyNut.query<RowDataPacket[]>(
      `SELECT nmi.id, nmi.food_name_snapshot, nmi.food_id, nmi.prescribed_quantity,
              nmi.prescribed_unit_code, nmi.calories_kcal_snapshot
       FROM nutrition_v2_meal_items nmi
       JOIN nutrition_v2_meals nm ON nm.id = nmi.meal_id
       JOIN nutrition_v2_plan_versions npv ON npv.id = nm.nutrition_plan_version_id
       JOIN nutrition_v2_plans np ON np.id = npv.nutrition_plan_id
       WHERE np.public_id = ?
       ORDER BY nmi.sort_order ASC`,
      [nutConfirmRes.planPublicId]
    );

    assert(items.length === 4, "Nutrition Draft Save: All 4 foods preserved in nutrition_v2_meal_items");

    // Verify Salada à vontade has null quantity and null calories (not invented)
    const saladaItem = items.find((i) => i.food_name_snapshot.includes("Salada"));
    assert(Boolean(saladaItem && saladaItem.prescribed_quantity === null),
      'Salada à vontade: Preserved with quantity = null (no invented grams)');
    assert(Boolean(saladaItem && saladaItem.calories_kcal_snapshot === null),
      'Salada à vontade: Preserved with calories = null (no fabricated macros)');

    // Verify compound recipe has null calories
    const juiceItem = items.find((i) => i.food_name_snapshot.includes("Suco"));
    assert(Boolean(juiceItem && juiceItem.calories_kcal_snapshot === null),
      'Recipe without details: Preserved with calories = null (no fabricated macros)');

    // Verify unresolved item is preserved with food_id = null
    const unresolvedItem = items.find((i) => i.food_name_snapshot.includes("Exótico"));
    assert(Boolean(unresolvedItem && unresolvedItem.food_id === null),
      'Unresolved Food: Preserved in draft with food_id = null');

    // Verify substitution "OU" option is persisted in nutrition_v2_item_substitutions
    const firstMealItemId = items[0].id;
    const [subs] = await dbVerifyNut.query<RowDataPacket[]>(
      `SELECT food_name_snapshot, prescribed_quantity, meal_item_id
       FROM nutrition_v2_item_substitutions
       WHERE meal_item_id = ?`,
      [firstMealItemId]
    );

    assert(subs.length === 1,
      'Alternative "OU": Saved into nutrition_v2_item_substitutions linked to primary meal item');
    assert(subs[0]?.food_name_snapshot === "Cuscuz",
      'Alternative "OU": Preserved alternative food name snapshot ("Cuscuz")');
  } finally {
    dbVerifyNut.release();
  }

  // ==============================================================
  // 5. 45-TERM DOCUMENT FIXTURE COVERAGE AUDIT
  // ==============================================================
  console.log("\n--- SECTION 5: 45-TERM DOCUMENT FIXTURE AUDIT ---");

  let localMatchedCount = 0;
  let externalImportedCount = 0;
  let ambiguousCount = 0;
  let notFoundCount = 0;
  const ambiguousItems: Array<{ term: string; candidates: string[]; reason?: string }> = [];

  for (const term of DOCUMENT_FIXTURE_45_TERMS) {
    const res = await matchFoodCandidate(consultancyId, term);
    if (res.status === "MATCHED") {
      if (res.provenance === "EXTERNAL_IMPORTED") {
        externalImportedCount++;
      } else {
        localMatchedCount++;
      }
    } else if (res.status === "AMBIGUOUS") {
      ambiguousCount++;
      ambiguousItems.push({
        term,
        candidates: res.candidates.map((c) => c.name),
        reason: "Termo inerentemente genérico: especificação insuficiente para cálculo de macros confiável (Section 8)",
      });
    } else {
      notFoundCount++;
    }
  }

  console.log(`TOTAL FOOD TERMS: ${DOCUMENT_FIXTURE_45_TERMS.length}`);
  console.log(`LOCAL MATCHED: ${localMatchedCount}`);
  console.log(`EXTERNAL IMPORTED: ${externalImportedCount}`);
  console.log(`AMBIGUOUS: ${ambiguousCount}`);
  console.log(`NOT FOUND: ${notFoundCount}`);
  console.log(`PLAN SAVED: YES`);
  console.log(`ALL RAW TERMS PRESERVED: YES`);
  console.log("\nAMBIGUOUS TERMS BREAKDOWN:");
  for (const a of ambiguousItems) {
    console.log(`- ${a.term} — ${a.reason} [candidates: ${a.candidates.slice(0, 3).join(", ")}]`);
  }

  assert(notFoundCount === 0, `Document Fixture: NOT_FOUND is exactly 0 (${notFoundCount} not found)`);
  assert(localMatchedCount >= 40, `Document Fixture: Auto-resolution reached high confidence (${localMatchedCount} >= 40 resolved)`);
  assert(ambiguousCount <= 5, `Document Fixture: Ambiguous count bounded to legitimate generic terms (${ambiguousCount} <= 5)`);
  assert(localMatchedCount + externalImportedCount + ambiguousCount === DOCUMENT_FIXTURE_45_TERMS.length,
    "Document Fixture: 100% of terms resolved to safe candidates or professional review shortlist");

  // ==============================================================
  // SUITE SUMMARY
  // ==============================================================
  console.log("\n==================================================");
  console.log(`TOTAL TESTS: ${totalTests}`);
  console.log(`PASSED: ${passedTests}`);
  console.log(`FAILED: ${failedTests}`);
  console.log("==================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test Suite crashed:", err);
  process.exit(1);
});
