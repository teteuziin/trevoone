import { register } from 'node:module';
register('./ts-loader.mjs', import.meta.url);

import assert from 'node:assert/strict';
import mysql from 'mysql2/promise';

// Dynamically import TS repository functions
const {
  createWorkout,
  getWorkoutVersionTree,
  publishWorkoutVersion,
  validateWorkoutVersionForPublish,
  addBlockToDraft,
  addItemToDraftBlock,
  addSetToDraftItem,
  createWorkoutItemCombination,
} = await import('../lib/training-v2/workout-repository.ts');

const {
  inspectWorkoutVersionForPublish,
  isValidHttpUrl,
  sanitizeVideoUrl,
} = await import('../lib/training-v2/validation.ts');

const {
  createAssignment,
} = await import('../lib/training-v2/assignment-repository.ts');

const {
  formatExerciseSetsSummary,
} = await import('../lib/training-v2/server-training-pdf-document.tsx');

const {
  generateTrainingPlanPdfBuffer,
} = await import('../lib/training-v2/generate-training-pdf.ts');

async function runTolerantPublishTests() {
  console.log('--- STARTING TOLERANT PUBLISH & NOTES TEST SUITE ---');

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
    // 1. Resolve test consultancy, professional membership, and student membership
    const [cRows] = await conn.execute(
      `SELECT c.id, c.public_id, c.slug, cm.id AS membership_id, cm.public_id AS membership_public_id, cm.user_id
       FROM consultancies c
       INNER JOIN consultancy_members cm ON cm.consultancy_id = c.id
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cmr.role IN ('PERSONAL', 'CONSULTANCY_ADMIN') AND cm.status = 'ACTIVE'
       LIMIT 1`
    );
    assert.ok(cRows.length > 0, 'Must have at least one coach consultancy member');
    const {
      id: consultancyId,
      public_id: consultancyPublicId,
      slug: consultancySlug,
      membership_id: membershipId,
      membership_public_id: membershipPublicId,
      user_id: userId,
    } = cRows[0];

    // Find an active student in the same consultancy
    const [stRows] = await conn.execute(
      `SELECT cm.id, cm.public_id, u.full_name
       FROM consultancy_members cm
       INNER JOIN users u ON u.id = cm.user_id
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.consultancy_id = ? AND cm.status = 'ACTIVE' AND cmr.role = 'STUDENT'
       LIMIT 1`,
      [consultancyId]
    );
    assert.ok(stRows.length > 0, 'Must have at least one active student');
    const studentMembershipPublicId = stRows[0].public_id;

    // Resolve an official exercise for testing
    const [exRows] = await conn.execute(
      `SELECT public_id, name, muscle_group_primary, equipment
       FROM exercises
       WHERE status = 'PUBLISHED' AND deleted_at IS NULL
         AND (scope = 'GLOBAL' OR consultancy_id = ?)
       LIMIT 4`,
      [consultancyId]
    );
    assert.ok(exRows.length >= 2, 'Must have at least 2 published exercises');
    const ex1 = exRows[0];
    const ex2 = exRows[1];

    const ctx = {
      consultancyId: Number(consultancyId),
      consultancyPublicId: String(consultancyPublicId),
      membershipId: Number(membershipId),
      userId: Number(userId),
      roles: ['PERSONAL'],
      isPlatformAdmin: false,
      canAuthorTraining: true,
      canManageConsultancy: true,
      hasRole: (r) => r === 'PERSONAL',
      assertCanManageConsultancy: () => {},
      assertHasRole: () => {},
    };

    console.log(`[SETUP] Using Consultancy: ${consultancySlug}, Coach Membership: ${membershipId}, Student: ${studentMembershipPublicId}`);

    // ========================================================================
    // TEST 1: Treino com URL de vídeo inválida -> publicar -> PASS -> warning presente -> aluno recebe treino
    // ========================================================================
    console.log('\n[TEST 1] Treino com URL de vídeo inválida');
    const { workout: w1, version: v1 } = await createWorkout(ctx, {
      title: 'Teste Tolerante 1 - URL Vídeo Inválida',
      subtitle: 'Validação de publicação tolerante',
      objective: 'HYPERTROPHY',
      difficultyLevel: 'INTERMEDIATE',
    });

    const b1 = await addBlockToDraft(ctx, v1.publicId, {
      blockType: 'SINGLE',
      title: 'Bloco A',
      sortOrder: 0,
    });

    // Add item with invalid video URL (missing protocol, invalid format)
    const it1 = await addItemToDraftBlock(ctx, b1.publicId, {
      exercisePublicId: ex1.public_id,
      sortOrder: 0,
      customVideoUrl: 'invalid-video-url-without-protocol-404',
      notes: 'Execução controlada',
    });

    await addSetToDraftItem(ctx, it1.publicId, {
      setType: 'NORMAL',
      targetReps: 12,
      targetLoadKg: 40,
      targetRestSeconds: 60,
    });

    const tree1Before = await getWorkoutVersionTree(ctx, v1.publicId);
    const insp1 = inspectWorkoutVersionForPublish(tree1Before);
    assert.strictEqual(insp1.fatalErrors.length, 0, 'TEST 1: Must have 0 fatal errors');
    assert.ok(insp1.warnings.length > 0, 'TEST 1: Must have at least 1 warning for invalid video URL');
    assert.strictEqual(insp1.canPublish, true, 'TEST 1: canPublish must be true despite warning');
    console.log(`  ✓ Warning detected without blocking: "${insp1.warnings[0]}"`);

    // Publish must succeed
    const pub1 = await publishWorkoutVersion(ctx, v1.publicId);
    assert.strictEqual(pub1.status, 'PUBLISHED', 'TEST 1: Version must be PUBLISHED');
    assert.strictEqual(pub1.blocks[0].items[0].customVideoUrl, null, 'TEST 1: Invalid video URL must be sanitized to null in snapshot');

    // Verify DB item was also sanitized to null
    const [dbItemRows1] = await conn.execute(
      `SELECT custom_video_url FROM workout_block_items WHERE public_id = ?`,
      [it1.publicId]
    );
    assert.strictEqual(dbItemRows1[0].custom_video_url, null, 'TEST 1: DB row custom_video_url must be updated to null');

    // Assign to student must succeed
    const assign1 = await createAssignment(ctx, {
      workoutPublicId: w1.publicId,
      workoutVersionPublicId: pub1.publicId,
      studentMembershipPublicId: studentMembershipPublicId,
      startsOn: new Date().toISOString().slice(0, 10),
    });
    assert.ok(assign1.publicId, 'TEST 1: Student assignment must succeed');
    console.log(`  ✓ Treino publicado com sucesso e atribuído ao aluno (Assignment: ${assign1.publicId})`);

    // ========================================================================
    // TEST 2: Treino sem vídeo -> publicar -> PASS
    // ========================================================================
    console.log('\n[TEST 2] Treino sem vídeo');
    const { workout: w2, version: v2 } = await createWorkout(ctx, {
      title: 'Teste Tolerante 2 - Sem Vídeo',
      objective: 'STRENGTH',
    });

    const b2 = await addBlockToDraft(ctx, v2.publicId, {
      blockType: 'SINGLE',
      sortOrder: 0,
    });

    const it2 = await addItemToDraftBlock(ctx, b2.publicId, {
      exercisePublicId: ex2.public_id,
      sortOrder: 0,
      customVideoUrl: null,
    });

    await addSetToDraftItem(ctx, it2.publicId, {
      setType: 'NORMAL',
      targetReps: 8,
      targetRestSeconds: 90,
    });

    const pub2 = await publishWorkoutVersion(ctx, v2.publicId);
    assert.strictEqual(pub2.status, 'PUBLISHED', 'TEST 2: Version without video must publish successfully');
    console.log('  ✓ Treino sem vídeo publicado com sucesso');

    // ========================================================================
    // TEST 3: Treino com observação "Execução em dois tempos"
    // ========================================================================
    console.log('\n[TEST 3] Treino com observação "Execução em dois tempos"');
    const noteText = 'Execução em dois tempos';
    const { workout: w3, version: v3 } = await createWorkout(ctx, {
      title: 'Teste Tolerante 3 - Observação Técnica',
    });

    const b3 = await addBlockToDraft(ctx, v3.publicId, {
      blockType: 'SINGLE',
      sortOrder: 0,
    });

    const it3 = await addItemToDraftBlock(ctx, b3.publicId, {
      exercisePublicId: ex1.public_id,
      sortOrder: 0,
      notes: noteText,
    });

    await addSetToDraftItem(ctx, it3.publicId, {
      setType: 'NORMAL',
      targetReps: 10,
      targetRestSeconds: 60,
    });

    const pub3 = await publishWorkoutVersion(ctx, v3.publicId);
    assert.strictEqual(pub3.blocks[0].items[0].notes, noteText, 'TEST 3: Note must be preserved in published version');

    // Test PDF rendering with notes
    const plan3 = {
      title: pub3.title,
      subtitle: pub3.subtitle,
      objective: pub3.objective,
      studentName: 'Aluno Teste',
      personalTrainerName: 'Coach Teste',
      consultancyName: 'Trevo One',
      generationDateFormatted: '03/10/2026',
      notes: pub3.notes,
      isDraft: false,
      versionNumber: pub3.versionNumber,
      blocks: pub3.blocks.map((b) => ({
        name: b.title || b.blockType,
        instructions: b.instructions,
        exercises: b.items.map((i) => ({
          name: i.exerciseNameSnapshot,
          muscleGroup: i.muscleGroupSnapshot,
          equipment: i.equipmentSnapshot,
          notes: i.notes,
          summaryString: formatExerciseSetsSummary(i.sets).summaryString,
          setsDetail: formatExerciseSetsSummary(i.sets).setsDetail,
        })),
      })),
    };
    const pdfBuf3 = await generateTrainingPlanPdfBuffer(plan3);
    assert.ok(pdfBuf3.length > 500, 'TEST 3: PDF must render successfully with note');
    console.log(`  ✓ Observação "${noteText}" preservada no snapshot e renderizada no PDF (${pdfBuf3.length} bytes)`);

    // ========================================================================
    // TEST 4: Bi-Set com observação por exercício
    // ========================================================================
    console.log('\n[TEST 4] Bi-Set com observação por exercício');
    const { workout: w4, version: v4 } = await createWorkout(ctx, {
      title: 'Teste Tolerante 4 - Bi-Set com Observações',
    });

    const b4 = await addBlockToDraft(ctx, v4.publicId, {
      blockType: 'SINGLE',
      sortOrder: 0,
    });

    const it4_1 = await addItemToDraftBlock(ctx, b4.publicId, {
      exercisePublicId: ex1.public_id,
      sortOrder: 0,
      notes: 'Execução em dois tempos',
    });
    await addSetToDraftItem(ctx, it4_1.publicId, { setType: 'NORMAL', targetReps: 10, targetRestSeconds: 0 });

    const it4_2 = await addItemToDraftBlock(ctx, b4.publicId, {
      exercisePublicId: ex2.public_id,
      sortOrder: 1,
      notes: 'Rest pause',
    });
    await addSetToDraftItem(ctx, it4_2.publicId, { setType: 'NORMAL', targetReps: 12, targetRestSeconds: 60 });

    // Group into Bi-Set combination
    const comb4 = await createWorkoutItemCombination(ctx, {
      blockPublicId: b4.publicId,
      combinationType: 'BI_SET',
      itemPublicIds: [it4_1.publicId, it4_2.publicId],
      restAfterSeconds: 60,
    });
    assert.ok(comb4.publicId, 'TEST 4: Bi-Set combination created');

    const pub4 = await publishWorkoutVersion(ctx, v4.publicId);
    assert.strictEqual(pub4.status, 'PUBLISHED', 'TEST 4: Bi-Set workout must publish');

    const combBlock = pub4.blocks[0];
    const itemA = combBlock.items.find((i) => i.publicId === it4_1.publicId);
    const itemB = combBlock.items.find((i) => i.publicId === it4_2.publicId);
    assert.strictEqual(itemA.notes, 'Execução em dois tempos', 'TEST 4: Item A notes preserved');
    assert.strictEqual(itemB.notes, 'Rest pause', 'TEST 4: Item B notes preserved');

    // Test PDF rendering with Bi-Set notes
    const plan4 = {
      title: pub4.title,
      studentName: 'Aluno Teste',
      consultancyName: 'Trevo One',
      generationDateFormatted: '03/10/2026',
      isDraft: false,
      versionNumber: pub4.versionNumber,
      blocks: pub4.blocks.map((b) => ({
        name: b.title || b.blockType,
        exercises: b.items.map((i) => ({
          name: i.exerciseNameSnapshot,
          notes: i.notes,
          summaryString: formatExerciseSetsSummary(i.sets).summaryString,
          combinationId: i.combinationPublicId,
          combinationType: i.combinationType,
          combinationTitle: 'Bi-Set A',
          combinationRestSeconds: 60,
          setsDetail: formatExerciseSetsSummary(i.sets).setsDetail,
        })),
      })),
    };
    const pdfBuf4 = await generateTrainingPlanPdfBuffer(plan4);
    assert.ok(pdfBuf4.length > 500, 'TEST 4: PDF rendered successfully for Bi-Set');
    console.log(`  ✓ Bi-Set publicado com observações distintas em cada membro (Item A: "${itemA.notes}", Item B: "${itemB.notes}") e PDF gerado (${pdfBuf4.length} bytes)`);

    // ========================================================================
    // TEST 5: Treino com warnings opcionais -> botão publicar continua funcional
    // ========================================================================
    console.log('\n[TEST 5] Treino com múltiplos warnings opcionais');
    const mockTreeWithWarnings = {
      blocks: [
        {
          blockType: 'SINGLE',
          title: 'Bloco Teste',
          items: [
            {
              exercisePublicId: ex1.public_id,
              exerciseNameSnapshot: 'Supino Inclinado',
              customVideoUrl: 'https:// broken link without dot',
              notes: '   ',
              sets: [{ setType: 'NORMAL' }],
            },
          ],
        },
      ],
    };

    const insp5 = inspectWorkoutVersionForPublish(mockTreeWithWarnings);
    assert.strictEqual(insp5.fatalErrors.length, 0, 'TEST 5: Must have 0 fatal errors');
    assert.ok(insp5.warnings.length > 0, 'TEST 5: Must have warnings');
    assert.strictEqual(insp5.canPublish, true, 'TEST 5: canPublish must be true when only warnings exist');
    console.log(`  ✓ Warnings não impedem canPublish (${insp5.warnings.length} warning(s), canPublish=${insp5.canPublish})`);

    // ========================================================================
    // TEST 6: Erro estrutural real -> publicação continua bloqueada
    // ========================================================================
    console.log('\n[TEST 6] Erros estruturais reais continuam bloqueando');

    // 6a: 0 blocks
    const emptyWorkoutTree = { blocks: [] };
    const insp6a = inspectWorkoutVersionForPublish(emptyWorkoutTree);
    assert.strictEqual(insp6a.canPublish, false, 'TEST 6a: 0 blocks must not be publishable');
    assert.ok(insp6a.fatalErrors.some((e) => e.includes('ao menos 1 bloco')), 'TEST 6a: Message must mention 1 block');
    assert.throws(
      () => validateWorkoutVersionForPublish(emptyWorkoutTree),
      /ao menos 1 bloco/,
      'TEST 6a: validateWorkoutVersionForPublish must throw'
    );
    console.log('  ✓ 6a: Treino sem blocos bloqueia com mensagem correta');

    // 6b: Unresolved exercises
    const unresolvedTree = {
      blocks: [
        {
          blockType: 'SINGLE',
          items: [
            {
              exercisePublicId: null,
              customExercisePublicId: null,
              exerciseNameSnapshot: 'Exercício Desconhecido',
              sets: [{ setType: 'NORMAL' }],
            },
          ],
        },
      ],
    };
    const insp6b = inspectWorkoutVersionForPublish(unresolvedTree);
    assert.strictEqual(insp6b.canPublish, false, 'TEST 6b: Unresolved exercise must not be publishable');
    assert.ok(insp6b.fatalErrors.some((e) => e.includes('revis')), 'TEST 6b: Message must mention review/revisão');
    assert.throws(
      () => validateWorkoutVersionForPublish(unresolvedTree),
      /revis/,
      'TEST 6b: validateWorkoutVersionForPublish must throw'
    );
    console.log('  ✓ 6b: Exercício não resolvido bloqueia com mensagem correta');

    // 6c: Bi-Set with only 1 item
    const invalidBiSetTree = {
      blocks: [
        {
          blockType: 'BI_SET',
          items: [
            {
              exercisePublicId: ex1.public_id,
              exerciseNameSnapshot: ex1.name,
              sets: [{ setType: 'NORMAL' }],
            },
          ],
        },
      ],
    };
    const insp6c = inspectWorkoutVersionForPublish(invalidBiSetTree);
    assert.strictEqual(insp6c.canPublish, false, 'TEST 6c: Bi-Set with 1 item must not be publishable');
    assert.ok(insp6c.fatalErrors.some((e) => e.includes('exatamente 2 exercícios')), 'TEST 6c: Message must mention 2 exercises');
    console.log('  ✓ 6c: Bi-Set com 1 exercício bloqueia com mensagem correta');

    console.log('\n--- ALL 6 TOLERANT PUBLISH & NOTES TESTS PASSED! ---');
  } finally {
    conn.release();
    await pool.end();
  }
}

runTolerantPublishTests().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
