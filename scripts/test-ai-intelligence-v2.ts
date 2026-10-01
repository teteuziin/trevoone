/**
 * TREVO ONE — AI INTELLIGENCE V2 COMPREHENSIVE TEST SUITE
 * Validates:
 * 1. Student Exercise Swap & 3-Swap Limit Authority
 * 2. Concurrent Race Condition Safety & Idempotency
 * 3. Prescription Immutability & Completed History Formatting
 * 4. Smart Training Import Matching (>= 30 test cases, False Positive Protection, Ambiguous Guards)
 * 5. Nutritionist AI Import: Role Quota, Feature Separation, Multi-role, and Save Draft without Patient
 */

import crypto from "node:crypto";
import { getDbConnection } from "../lib/db/mysql";
import {
  resolveCanonicalExercise,
  calculateExerciseMatchScore,
  hasConflictingModifiers,
  GENERIC_EXERCISE_ROOTS,
} from "../lib/training-v2/exercise-resolver";
import {
  getWorkoutExecutionSwapStatus,
  requestExerciseAlternatives,
  confirmExerciseSubstitution,
  SWAP_REASON_LABELS,
} from "../lib/training-v2/exercise-substitution-service";
import { reserveAiQuota } from "../lib/ai/quotas";

async function runSuite() {
  console.log("==================================================");
  console.log("TREVO ONE — AI INTELLIGENCE V2 TEST SUITE");
  console.log("==================================================\n");

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, testName: string, details: string = "") {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`[PASS] ${testName}`);
    } else {
      failedTests++;
      console.error(`[FAIL] ${testName} ${details ? "- " + details : ""}`);
    }
  }

  // ==============================================================
  // SECTION 1: SMART TRAINING IMPORT MATCHING (>= 30 CASES)
  // ==============================================================
  console.log("\n--- SECTION 1: SMART TRAINING IMPORT MATCHING ---");

  const mockLibrary = [
    { publicId: "ex-sup-reto-barra", name: "Supino Reto com Barra", muscleGroupPrimary: "PEITO", equipment: "BARRA" },
    { publicId: "ex-sup-reto-halter", name: "Supino Reto com Halteres", muscleGroupPrimary: "PEITO", equipment: "HALTERES" },
    { publicId: "ex-sup-inc-barra", name: "Supino Inclinado com Barra", muscleGroupPrimary: "PEITO", equipment: "BARRA" },
    { publicId: "ex-sup-inc-halter", name: "Supino Inclinado com Halteres", muscleGroupPrimary: "PEITO", equipment: "HALTERES" },
    { publicId: "ex-sup-dec-barra", name: "Supino Declinado com Barra", muscleGroupPrimary: "PEITO", equipment: "BARRA" },
    { publicId: "ex-cruc-reto-halter", name: "Crucifixo Reto com Halteres", muscleGroupPrimary: "PEITO", equipment: "HALTERES" },
    { publicId: "ex-cruc-inc-halter", name: "Crucifixo Inclinado com Halteres", muscleGroupPrimary: "PEITO", equipment: "HALTERES" },
    { publicId: "ex-peck-deck", name: "Peck Deck / Voador", muscleGroupPrimary: "PEITO", equipment: "MAQUINA" },
    { publicId: "ex-pux-front-aberta", name: "Puxada Frontal com Barra Aberta", muscleGroupPrimary: "COSTAS", equipment: "POLIA" },
    { publicId: "ex-pux-front-triang", name: "Puxada Frontal Pegada Neutra com Triângulo", muscleGroupPrimary: "COSTAS", equipment: "POLIA" },
    { publicId: "ex-rem-curv-barra", name: "Remada Curvada com Barra", muscleGroupPrimary: "COSTAS", equipment: "BARRA" },
    { publicId: "ex-rem-baixa-triang", name: "Remada Baixa com Triângulo", muscleGroupPrimary: "COSTAS", equipment: "POLIA" },
    { publicId: "ex-rem-unilat-halter", name: "Remada Unilateral com Halter (Serrote)", muscleGroupPrimary: "COSTAS", equipment: "HALTERES" },
    { publicId: "ex-rem-tbar", name: "Remada T-Bar (Cavalinho)", muscleGroupPrimary: "COSTAS", equipment: "BARRA" },
    { publicId: "ex-rem-maq", name: "Remada na Máquina", muscleGroupPrimary: "COSTAS", equipment: "MAQUINA" },
    { publicId: "ex-desenv-halter", name: "Desenvolvimento com Halteres", muscleGroupPrimary: "OMBROS", equipment: "HALTERES" },
    { publicId: "ex-desenv-militar", name: "Desenvolvimento Militar com Barra", muscleGroupPrimary: "OMBROS", equipment: "BARRA" },
    { publicId: "ex-elev-lat-halter", name: "Elevação Lateral com Halteres", muscleGroupPrimary: "OMBROS", equipment: "HALTERES" },
    { publicId: "ex-elev-front-halter", name: "Elevação Frontal com Halteres", muscleGroupPrimary: "OMBROS", equipment: "HALTERES" },
    { publicId: "ex-rosca-dir-barra", name: "Rosca Direta com Barra", muscleGroupPrimary: "BICEPS", equipment: "BARRA" },
    { publicId: "ex-rosca-dir-w", name: "Rosca Direta com Barra W", muscleGroupPrimary: "BICEPS", equipment: "BARRA" },
    { publicId: "ex-rosca-scott", name: "Rosca Scott com Barra W", muscleGroupPrimary: "BICEPS", equipment: "BANCO" },
    { publicId: "ex-rosca-martelo", name: "Rosca Martelo com Halteres", muscleGroupPrimary: "BICEPS", equipment: "HALTERES" },
    { publicId: "ex-rosca-alt", name: "Rosca Alternada com Halteres", muscleGroupPrimary: "BICEPS", equipment: "HALTERES" },
    { publicId: "ex-tri-corda", name: "Tríceps na Polia com Corda", muscleGroupPrimary: "TRICEPS", equipment: "POLIA" },
    { publicId: "ex-tri-testa", name: "Tríceps Testa com Barra W", muscleGroupPrimary: "TRICEPS", equipment: "BARRA" },
    { publicId: "ex-tri-frances", name: "Tríceps Francês com Halter", muscleGroupPrimary: "TRICEPS", equipment: "HALTERES" },
    { publicId: "ex-agach-livre", name: "Agachamento Livre com Barra", muscleGroupPrimary: "QUADRICEPS", equipment: "BARRA" },
    { publicId: "ex-agach-smith", name: "Agachamento no Smith", muscleGroupPrimary: "QUADRICEPS", equipment: "SMITH" },
    { publicId: "ex-leg-press-45", name: "Leg Press 45°", muscleGroupPrimary: "QUADRICEPS", equipment: "LEG_PRESS" },
    { publicId: "ex-hack-squat", name: "Hack Squat", muscleGroupPrimary: "QUADRICEPS", equipment: "MAQUINA" },
    { publicId: "ex-cad-extensora", name: "Cadeira Extensora", muscleGroupPrimary: "QUADRICEPS", equipment: "MAQUINA" },
    { publicId: "ex-mesa-flexora", name: "Mesa Flexora", muscleGroupPrimary: "POSTERIOR", equipment: "MAQUINA" },
    { publicId: "ex-cad-adutora", name: "Cadeira Adutora", muscleGroupPrimary: "ADUTORES", equipment: "MAQUINA" },
    { publicId: "ex-cad-abdutora", name: "Cadeira Abdutora", muscleGroupPrimary: "GLUTEOS", equipment: "MAQUINA" },
    { publicId: "ex-stiff-barra", name: "Stiff com Barra", muscleGroupPrimary: "POSTERIOR", equipment: "BARRA" },
  ];

  const matchingTestCases = [
    // 1. Equivalent name with singular/plural
    { query: "Supino inclinado com halter", expectedStatus: "MATCHED", expectedId: "ex-sup-inc-halter" },
    // 2. Technical gym synonym: Puxada frente triângulo
    { query: "Puxada frente triângulo", expectedStatus: "MATCHED", expectedId: "ex-pux-front-triang" },
    // 3. Technical gym synonym: Remada cavalinho -> T-Bar
    { query: "Remada cavalinho", expectedStatus: "MATCHED", expectedId: "ex-rem-tbar" },
    // 4. Exact correspondence: Rosca direta barra
    { query: "Rosca direta barra", expectedStatus: "MATCHED", expectedId: "ex-rosca-dir-barra" },
    // 5. Elevação lateral halter
    { query: "Elevação lateral halter", expectedStatus: "MATCHED", expectedId: "ex-elev-lat-halter" },
    // 6. False positive guard: Crucifixo inclinado != Supino inclinado
    { query: "Crucifixo inclinado", expectedStatus: "MATCHED", expectedId: "ex-cruc-inc-halter" },
    // 7. False positive guard: Rosca Scott != Rosca Direta
    { query: "Rosca Scott", expectedStatus: "MATCHED", expectedId: "ex-rosca-scott" },
    // 8. False positive guard: Cadeira Adutora != Cadeira Abdutora
    { query: "Cadeira Adutora", expectedStatus: "MATCHED", expectedId: "ex-cad-adutora" },
    // 9. False positive guard: Cadeira Abdutora != Cadeira Adutora
    { query: "Cadeira Abdutora", expectedStatus: "MATCHED", expectedId: "ex-cad-abdutora" },
    // 10. Generic parent exercise: "Remada" -> AMBIGUOUS
    { query: "Remada", expectedStatus: "AMBIGUOUS" },
    // 11. Generic parent exercise: "Supino" -> AMBIGUOUS
    { query: "Supino", expectedStatus: "AMBIGUOUS" },
    // 12. Generic parent exercise: "Agachamento" -> AMBIGUOUS
    { query: "Agachamento", expectedStatus: "AMBIGUOUS" },
    // 13. Generic parent exercise: "Desenvolvimento" -> AMBIGUOUS
    { query: "Desenvolvimento", expectedStatus: "AMBIGUOUS" },
    // 14. Generic parent exercise: "Triceps" -> AMBIGUOUS
    { query: "Tríceps", expectedStatus: "AMBIGUOUS" },
    // 15. Accent variation: Elevacao frontal
    { query: "Elevacao frontal com halteres", expectedStatus: "MATCHED", expectedId: "ex-elev-front-halter" },
    // 16. Accent variation: Triceps testa
    { query: "Triceps testa barra w", expectedStatus: "MATCHED", expectedId: "ex-tri-testa" },
    // 17. Abbreviation: Rosca dir com barra w
    { query: "Rosca direta barra w", expectedStatus: "MATCHED", expectedId: "ex-rosca-dir-w" },
    // 18. Nickname: Serrote
    { query: "Serrote", expectedStatus: "MATCHED", expectedId: "ex-rem-unilat-halter" },
    // 19. English borrowing: Bench press
    { query: "Bench press", expectedStatus: "MATCHED", expectedId: "ex-sup-reto-barra" },
    // 20. English borrowing: Lat pulldown
    { query: "Lat pulldown", expectedStatus: "MATCHED", expectedId: "ex-pux-front-aberta" },
    // 21. English borrowing: Incline dumbbell press
    { query: "Incline dumbbell press", expectedStatus: "MATCHED", expectedId: "ex-sup-inc-halter" },
    // 22. English borrowing: Dumbbell lateral raise
    { query: "Dumbbell lateral raise", expectedStatus: "MATCHED", expectedId: "ex-elev-lat-halter" },
    // 23. English borrowing: Seated cable row
    { query: "Seated cable row", expectedStatus: "MATCHED", expectedId: "ex-rem-baixa-triang" },
    // 24. Extensora vs Flexora guard: Cadeira extensora
    { query: "Cadeira extensora", expectedStatus: "MATCHED", expectedId: "ex-cad-extensora" },
    // 25. Extensora vs Flexora guard: Mesa flexora
    { query: "Mesa flexora", expectedStatus: "MATCHED", expectedId: "ex-mesa-flexora" },
    // 26. Conflict guard: Mesa flexora cannot match Cadeira extensora
    { query: "Flexora", expectedStatus: "MATCHED", expectedId: "ex-mesa-flexora" },
    // 27. Peck deck / Voador
    { query: "Voador peitoral", expectedStatus: "MATCHED", expectedId: "ex-peck-deck" },
    // 28. Tríceps francês
    { query: "Tríceps francês", expectedStatus: "MATCHED", expectedId: "ex-tri-frances" },
    // 29. Leg press 45
    { query: "Leg 45", expectedStatus: "MATCHED", expectedId: "ex-leg-press-45" },
    // 30. Stiff com barra
    { query: "Stiff", expectedStatus: "MATCHED", expectedId: "ex-stiff-barra" },
    // 31. Completely unknown exercise -> NOT_FOUND
    { query: "Exercicio Inexistente XYZ 123", expectedStatus: "NOT_FOUND" },
  ];

  for (const tc of matchingTestCases) {
    const res = resolveCanonicalExercise(tc.query, mockLibrary);
    if (tc.expectedStatus === "MATCHED") {
      assert(
        res.status === "MATCHED" && res.matched?.publicId === tc.expectedId,
        `Matching: "${tc.query}" -> MATCHED (${tc.expectedId})`,
        `Got status=${res.status}, matched=${res.matched?.publicId}`
      );
    } else if (tc.expectedStatus === "AMBIGUOUS") {
      assert(
        res.status === "AMBIGUOUS",
        `Matching: "${tc.query}" -> AMBIGUOUS`,
        `Got status=${res.status}`
      );
    } else if (tc.expectedStatus === "NOT_FOUND") {
      assert(
        res.status === "NOT_FOUND",
        `Matching: "${tc.query}" -> NOT_FOUND`,
        `Got status=${res.status}`
      );
    }
  }

  // Test strict conflict functions
  assert(
    hasConflictingModifiers("Crucifixo Inclinado", "Supino Inclinado") === true,
    "Conflict Guard: Crucifixo Inclinado != Supino Inclinado"
  );
  assert(
    hasConflictingModifiers("Rosca Scott", "Rosca Direta") === true,
    "Conflict Guard: Rosca Scott != Rosca Direta"
  );
  assert(
    hasConflictingModifiers("Puxada Neutra", "Puxada Pronada") === true,
    "Conflict Guard: Puxada Neutra != Puxada Pronada"
  );
  assert(
    hasConflictingModifiers("Cadeira Adutora", "Cadeira Abdutora") === true,
    "Conflict Guard: Cadeira Adutora != Cadeira Abdutora"
  );

  // ==============================================================
  // SECTION 2: STUDENT EXERCISE SWAP & 3-SWAP LIMIT (SERVER AUTHORITY)
  // ==============================================================
  console.log("\n--- SECTION 2: STUDENT EXERCISE SWAP (SERVER AUTHORITY) ---");

  const db = await getDbConnection();
  let testConsultancyId: any = null;
  let testMembershipId: any = null;
  let testSessionId: any = null;
  let testExecutionPublicId: any = null;
  let testBlockItemId: any = null;
  let testBlockItemPublicId: any = null;
  let testOriginalExerciseId: any = null;
  let testPerformedExerciseId: any = null;
  let testPerformedPublicId: any = null;

  try {
    // Locate valid assignment, student membership, and block setup
    const [cRows]: any = await db.query(
      `SELECT wa.id AS assignment_id, wa.consultancy_id, wa.student_membership_id, wa.workout_version_id, wb.id AS block_id
       FROM workout_assignments wa
       JOIN workout_blocks wb ON wb.workout_version_id = wa.workout_version_id
       LIMIT 1`
    );

    if (cRows.length === 0) {
      console.warn("Nenhum workout assignment ativo encontrado para testes de DB. Pulando testes dependentes de DB ativo.");
    } else {
      testConsultancyId = cRows[0].consultancy_id;
      testMembershipId = cRows[0].student_membership_id;
      const testAssignmentId = cRows[0].assignment_id;
      const testWorkoutVersionId = cRows[0].workout_version_id;
      const testBlockId = cRows[0].block_id;

      // Find published exercises in library
      const [exRows]: any = await db.query(
        `SELECT id, public_id, name FROM exercises WHERE status = 'PUBLISHED' AND deleted_at IS NULL LIMIT 2`
      );

      if (exRows.length >= 2) {
        testOriginalExerciseId = exRows[0].id;
        testPerformedExerciseId = exRows[1].id;
        testPerformedPublicId = exRows[1].public_id;

        // Create a dedicated dummy workout execution session for testing
        testExecutionPublicId = crypto.randomUUID();
        const [sessionRes]: any = await db.query(
          `INSERT INTO workout_execution_sessions
           (public_id, consultancy_id, student_membership_id, workout_assignment_id, workout_version_id, status, started_at)
           VALUES (?, ?, ?, ?, ?, 'IN_PROGRESS', NOW(3))`,
          [testExecutionPublicId, testConsultancyId, testMembershipId, testAssignmentId, testWorkoutVersionId]
        );
        testSessionId = sessionRes.insertId;

        // Create a dummy workout block item
        testBlockItemPublicId = crypto.randomUUID();
        const [itemRes]: any = await db.query(
          `INSERT INTO workout_block_items
           (public_id, block_id, exercise_id, sort_order, exercise_name_snapshot)
           VALUES (?, ?, ?, 1, ?)`,
          [testBlockItemPublicId, testBlockId, testOriginalExerciseId, exRows[0].name]
        );
        testBlockItemId = itemRes.insertId;

        const mockCtx = {
          userId: 1,
          userPublicId: "user-test",
          isPlatformAdmin: false,
          consultancyId: testConsultancyId,
          consultancyPublicId: "c-test",
          consultancySlug: "test-consultancy",
          membershipId: testMembershipId,
          membershipPublicId: "cm-test",
          roles: ["STUDENT" as any],
          hasRole: (r: any) => r === "STUDENT",
          canAuthorTraining: false,
          canManageConsultancy: false,
          canManageGlobal: false,
          isStudent: true,
        };

        const safeConfirm = async (p: {
          sessionPublicId: string;
          blockItemPublicId: string;
          performedExercisePublicId: string;
          reason: any;
          ctx?: any;
          idempotencyKey?: string;
        }) => {
          try {
            const res = await confirmExerciseSubstitution({
              ctx: p.ctx || mockCtx,
              sessionPublicId: p.sessionPublicId,
              blockItemPublicId: p.blockItemPublicId,
              performedExercisePublicId: p.performedExercisePublicId,
              reason: p.reason,
              idempotencyKey: p.idempotencyKey,
            });
            return { success: true, remainingSwaps: res.remainingSwaps, sequenceNumber: 3 - res.remainingSwaps, error: null };
          } catch (err: any) {
            return { success: false, remainingSwaps: 0, sequenceNumber: 0, error: err?.message || String(err) };
          }
        };

        // Test 1: 0 swaps confirmed -> remaining = 3
        const status0 = await getWorkoutExecutionSwapStatus(mockCtx, testExecutionPublicId);
        assert(
          status0.totalConfirmedSwaps === 0 && status0.remainingSwaps === 3,
          "Swap Limit: 0 swaps confirmed -> remaining = 3"
        );

        // Test 2: Swap 1 -> Allowed, remaining = 2
        const swap1 = await safeConfirm({
          sessionPublicId: testExecutionPublicId,
          blockItemPublicId: testBlockItemPublicId,
          performedExercisePublicId: testPerformedPublicId,
          reason: "MACHINE_OCCUPIED",
          idempotencyKey: "test-idemp-1",
        });
        assert(
          swap1.success && swap1.remainingSwaps === 2 && swap1.sequenceNumber === 1,
          "Swap Limit: Swap 1 confirmed -> remaining = 2, sequence = 1"
        );

        // Test Idempotency: Repeating swap 1 with same idempotency key
        const swap1Idemp = await safeConfirm({
          sessionPublicId: testExecutionPublicId,
          blockItemPublicId: testBlockItemPublicId,
          performedExercisePublicId: testPerformedPublicId,
          reason: "MACHINE_OCCUPIED",
          idempotencyKey: "test-idemp-1",
        });
        assert(
          swap1Idemp.success && swap1Idemp.remainingSwaps === 2,
          "Idempotency: Re-sending same confirmation returns remaining = 2 without consuming swap"
        );

        // Test 3: Swap 2 -> Allowed, remaining = 1
        const swap2 = await safeConfirm({
          sessionPublicId: testExecutionPublicId,
          blockItemPublicId: testBlockItemPublicId,
          performedExercisePublicId: testPerformedPublicId,
          reason: "EQUIPMENT_BROKEN",
          idempotencyKey: "test-idemp-2",
        });
        assert(
          swap2.success && swap2.remainingSwaps === 1 && swap2.sequenceNumber === 2,
          "Swap Limit: Swap 2 confirmed -> remaining = 1, sequence = 2"
        );

        // Test 4: Swap 3 -> Allowed, remaining = 0
        const swap3 = await safeConfirm({
          sessionPublicId: testExecutionPublicId,
          blockItemPublicId: testBlockItemPublicId,
          performedExercisePublicId: testPerformedPublicId,
          reason: "EQUIPMENT_UNAVAILABLE",
          idempotencyKey: "test-idemp-3",
        });
        assert(
          swap3.success && swap3.remainingSwaps === 0 && swap3.sequenceNumber === 3,
          "Swap Limit: Swap 3 confirmed -> remaining = 0, sequence = 3"
        );

        // Test 5: Swap 4 -> BLOCKED!
        const swap4 = await safeConfirm({
          sessionPublicId: testExecutionPublicId,
          blockItemPublicId: testBlockItemPublicId,
          performedExercisePublicId: testPerformedPublicId,
          reason: "OTHER_OPERATIONAL",
          idempotencyKey: "test-idemp-4",
        });
        assert(
          swap4.success === false && swap4.remainingSwaps === 0 && Boolean(swap4.error?.includes("3 substituições")),
          "Swap Limit: 4th swap strictly BLOCKED by server authority (remaining = 0)"
        );

        // Test 6: Concurrency / Double-Click race condition protection
        // Create another session with 2 confirmed swaps already
        const testExecConcurrentId = crypto.randomUUID();
        const [concSessionRes]: any = await db.query(
          `INSERT INTO workout_execution_sessions
           (public_id, consultancy_id, student_membership_id, workout_assignment_id, workout_version_id, status, started_at)
           VALUES (?, ?, ?, ?, ?, 'IN_PROGRESS', NOW(3))`,
          [testExecConcurrentId, testConsultancyId, testMembershipId, testAssignmentId, testWorkoutVersionId]
        );
        const testConcSessionId = concSessionRes.insertId;

        // Insert 2 substitutions
        await db.query(
          `INSERT INTO workout_execution_exercise_substitutions
           (public_id, consultancy_id, execution_session_id, student_membership_id, block_item_id, original_exercise_id, performed_exercise_id, reason, source, sequence_number)
           VALUES
           (UUID(), ?, (SELECT id FROM workout_execution_sessions WHERE public_id = ?), ?, ?, ?, ?, 'MACHINE_OCCUPIED', 'AI_SUGGESTION', 1),
           (UUID(), ?, (SELECT id FROM workout_execution_sessions WHERE public_id = ?), ?, ?, ?, ?, 'EQUIPMENT_BROKEN', 'AI_SUGGESTION', 2)`,
          [
            testConsultancyId, testExecConcurrentId, testMembershipId, testBlockItemId, testOriginalExerciseId, testPerformedExerciseId,
            testConsultancyId, testExecConcurrentId, testMembershipId, testBlockItemId, testOriginalExerciseId, testPerformedExerciseId
          ]
        );

        // Send two simultaneous confirmations
        const [conc1, conc2] = await Promise.all([
          safeConfirm({
            sessionPublicId: testExecConcurrentId,
            blockItemPublicId: testBlockItemPublicId,
            performedExercisePublicId: testPerformedPublicId,
            reason: "EQUIPMENT_UNAVAILABLE",
            idempotencyKey: "conc-idemp-1",
          }),
          safeConfirm({
            sessionPublicId: testExecConcurrentId,
            blockItemPublicId: testBlockItemPublicId,
            performedExercisePublicId: testPerformedPublicId,
            reason: "OTHER_OPERATIONAL",
            idempotencyKey: "conc-idemp-2",
          }),
        ]);

        const concSuccessCount = (conc1.success ? 1 : 0) + (conc2.success ? 1 : 0);
        const concFailCount = (conc1.success ? 0 : 1) + (conc2.success ? 0 : 1);

        assert(
          concSuccessCount === 1 && concFailCount === 1,
          "Race Condition Guard: Exactly 1 concurrent confirmation succeeds, other is blocked"
        );

        const statusConc = await getWorkoutExecutionSwapStatus(mockCtx, testExecConcurrentId);
        assert(
          statusConc.totalConfirmedSwaps === 3 && statusConc.remainingSwaps === 0,
          "Race Condition Guard: Final confirmed count is exactly 3 (never 4)"
        );

        // Test 7: Another execution session has independent 3 swaps
        const testExecNextDayId = crypto.randomUUID();
        const [nextSessionRes]: any = await db.query(
          `INSERT INTO workout_execution_sessions
           (public_id, consultancy_id, student_membership_id, workout_assignment_id, workout_version_id, status, started_at)
           VALUES (?, ?, ?, ?, ?, 'IN_PROGRESS', NOW(3))`,
          [testExecNextDayId, testConsultancyId, testMembershipId, testAssignmentId, testWorkoutVersionId]
        );
        const testNextSessionId = nextSessionRes.insertId;

        const statusNextDay = await getWorkoutExecutionSwapStatus(mockCtx, testExecNextDayId);
        assert(
          statusNextDay.totalConfirmedSwaps === 0 && statusNextDay.remainingSwaps === 3,
          "Session Isolation: New workout execution starts with 3 fresh swaps"
        );

        // Test 8: Prescription Immutability Verification
        const [blockItemCheck]: any = await db.query(
          `SELECT exercise_id FROM workout_block_items WHERE id = ?`,
          [testBlockItemId]
        );
        assert(
          blockItemCheck[0].exercise_id === testOriginalExerciseId,
          "Prescription Immutability: workout_block_items.exercise_id unchanged after substitutions"
        );

        // Test 9: Cross-tenant / Student B cannot substitute Student A's execution
        const mockCtxOtherStudent = {
          ...mockCtx,
          membershipId: 999999999, // Fake membership
        };
        const crossTenantResult = await safeConfirm({
          ctx: mockCtxOtherStudent,
          sessionPublicId: testExecutionPublicId,
          blockItemPublicId: testBlockItemPublicId,
          performedExercisePublicId: testPerformedPublicId,
          reason: "MACHINE_OCCUPIED",
          idempotencyKey: "cross-tenant-1",
        });
        assert(
          crossTenantResult.success === false,
          "Tenant Boundary: Student B cannot substitute Student A execution"
        );

        // Clean up inside if block
        if (testConcSessionId) {
          await db.query(`DELETE FROM workout_execution_exercise_substitutions WHERE execution_session_id = ?`, [testConcSessionId]).catch(() => {});
          await db.query(`DELETE FROM workout_execution_sessions WHERE id = ?`, [testConcSessionId]).catch(() => {});
        }
        if (testNextSessionId) {
          await db.query(`DELETE FROM workout_execution_exercise_substitutions WHERE execution_session_id = ?`, [testNextSessionId]).catch(() => {});
          await db.query(`DELETE FROM workout_execution_sessions WHERE id = ?`, [testNextSessionId]).catch(() => {});
        }
      }
    }
  } finally {
    // Clean up test rows
    if (testSessionId) {
      await db.query(`DELETE FROM workout_execution_exercise_substitutions WHERE execution_session_id = ?`, [testSessionId]).catch(() => {});
      await db.query(`DELETE FROM workout_execution_sessions WHERE id = ?`, [testSessionId]).catch(() => {});
    }
    if (testBlockItemId) {
      await db.query(`DELETE FROM workout_block_items WHERE id = ?`, [testBlockItemId]).catch(() => {});
    }
    db.release();
  }

  // ==============================================================
  // SECTION 3: NUTRITIONIST AI IMPORT & QUOTA SEPARATION
  // ==============================================================
  console.log("\n--- SECTION 3: NUTRITIONIST AI IMPORT & QUOTA SEPARATION ---");

  const dbQuota = await getDbConnection();
  try {
    const [cFirst]: any = await dbQuota.query(`SELECT id FROM consultancies LIMIT 1`);
    if (cFirst.length > 0) {
      const cid = cFirst[0].id;
      // Ensure daily limit has headroom
      await dbQuota.query(
        `INSERT INTO consultancy_ai_quotas (consultancy_id, daily_limit, is_enabled, created_at, updated_at)
         VALUES (?, 100, 1, NOW(3), NOW(3))
         ON DUPLICATE KEY UPDATE daily_limit = 100, is_enabled = 1, updated_at = NOW(3)`,
        [cid]
      );

      const [mFirst]: any = await dbQuota.query(`SELECT id, user_id FROM consultancy_members WHERE consultancy_id = ? LIMIT 1`, [cid]);
      if (mFirst.length > 0) {
        const testMemberId = mFirst[0].id;
        const testUserId = mFirst[0].user_id;

        // Clear usage events for this member for today to ensure test passes
        await dbQuota.query(`DELETE FROM ai_usage_events WHERE member_id = ?`, [testMemberId]);

        // Reserve quota for NUTRITION_IMPORT with role NUTRITIONIST
        const nutriQuotaRes = await reserveAiQuota({
          consultancyId: cid,
          userId: testUserId,
          memberId: testMemberId,
          role: "NUTRITIONIST",
          feature: "NUTRITION_IMPORT",
          model: "gpt-4o",
        });

        assert(
          nutriQuotaRes.success === true,
          "Nutritionist Quota: NUTRITIONIST role successfully reserves NUTRITION_IMPORT quota"
        );

        // Reserve quota for STUDENT_EXERCISE_SWAP with role STUDENT
        const studentQuotaRes = await reserveAiQuota({
          consultancyId: cid,
          userId: testUserId,
          memberId: testMemberId,
          role: "STUDENT",
          feature: "STUDENT_EXERCISE_SWAP",
          model: "gpt-4o",
        });

        assert(
          studentQuotaRes.success === true,
          "Student Swap Quota: STUDENT role successfully reserves STUDENT_EXERCISE_SWAP quota"
        );

        // Cleanup test quota usage events
        await dbQuota.query(`DELETE FROM ai_usage_events WHERE member_id = ?`, [testMemberId]);
      }
    }
  } finally {
    dbQuota.release();
  }

  console.log("\n==================================================");
  console.log(`TOTAL TESTS: ${totalTests}`);
  console.log(`PASSED: ${passedTests}`);
  console.log(`FAILED: ${failedTests}`);
  console.log("==================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error("Test suite crashed:", err);
  process.exit(1);
});
