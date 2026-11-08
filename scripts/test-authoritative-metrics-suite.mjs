/**
 * TREVO ONE — SUÍTE DE TESTES: FONTE ÚNICA DE VERDADE DAS MÉTRICAS DE TREINO
 * Valida a integridade matemática e sistêmica entre Início, Central de Treinos e Alunos.
 */

import assert from "node:assert/strict";
import { getDbConnection } from "../lib/db/mysql.ts";
import { getAuthoritativeTrainingMetrics } from "../lib/training-v2/training-metrics-service.ts";
import { listPersonalStudents } from "../lib/consultancies/personal-student-hub.ts";

async function run() {
  console.log("=== INICIANDO SUÍTE DE TESTES: MÉTRICAS AUTORITATIVAS DE TREINAMENTO ===");

  const pool = await getDbConnection();

  // Obter consultorias existentes
  const [consultancies] = await pool.query("SELECT id, slug, name FROM consultancies LIMIT 2");
  assert.ok(consultancies.length > 0, "Deve haver ao menos uma consultoria");

  for (const c of consultancies) {
    console.log(`\n--- Testando Consultoria: ${c.name} (${c.slug}, id: ${c.id}) ---`);

    // 1. Teste da fonte única de verdade
    const metrics = await getAuthoritativeTrainingMetrics(c.id);
    console.log("  [1] Métricas autoritativas retornadas:", {
      total: metrics.totalStudents,
      comTreino: metrics.comTreinoCount,
      semTreino: metrics.semTreinoCount,
      emDiaPercent: metrics.emDiaPercent,
      loadStatus: metrics.loadStatus,
    });

    assert.equal(metrics.loadStatus, "SUCCESS", "loadStatus deve ser SUCCESS");
    assert.equal(
      metrics.totalStudents,
      metrics.comTreinoCount + metrics.semTreinoCount,
      "totalStudents deve ser exatamente igual a comTreino + semTreino"
    );

    // 2. Consistência com listPersonalStudents
    const students = await listPersonalStudents({ consultancyId: c.id });
    console.log(`  [2] listPersonalStudents retornou ${students.length} alunos`);

    assert.equal(
      students.length,
      metrics.totalStudents,
      "listPersonalStudents e getAuthoritativeTrainingMetrics devem retornar o mesmo total de alunos"
    );

    const withActiveInList = students.filter(
      (s) => s.latestAssignmentStatus === "ACTIVE" && Boolean(s.latestWorkoutTitle)
    ).length;
    const withoutActiveInList = students.filter(
      (s) => !s.latestWorkoutTitle || s.latestAssignmentStatus !== "ACTIVE"
    ).length;

    assert.equal(
      withActiveInList,
      metrics.comTreinoCount,
      "Contagem de alunos 'Com treino ativo' deve ser idêntica na lista e no indicador"
    );
    assert.equal(
      withoutActiveInList,
      metrics.semTreinoCount,
      "Contagem de alunos 'Sem treino ativo' deve ser idêntica na lista e no indicador"
    );

    console.log("  [PASS] Consistência perfeita entre Início e Lista de Alunos!");
  }

  // 3. Teste de isolamento: Rascunhos e treinos sem atribuição não afetam métricas
  console.log("\n--- [3] Teste de Isolamento de Rascunhos e Modelos ---");
  const testConsultancyId = consultancies[0].id;
  const beforeMetrics = await getAuthoritativeTrainingMetrics(testConsultancyId);

  // Inserir um treino rascunho de teste sem vínculo de aluno
  const dummyWorkoutPublicId = `test_draft_${Date.now()}`;
  const dummyVersionPublicId = `test_ver_${Date.now()}`;

  await pool.execute(
    `INSERT INTO workouts (public_id, consultancy_id, created_by_membership_id, title, status, is_template)
     VALUES (?, ?, 1, 'Treino Rascunho Isolado Teste', 'DRAFT', 0)`,
    [dummyWorkoutPublicId, testConsultancyId]
  );
  const [wRow] = await pool.execute("SELECT id FROM workouts WHERE public_id = ?", [dummyWorkoutPublicId]);
  const dummyWorkoutId = wRow[0].id;

  await pool.execute(
    `INSERT INTO workout_versions (public_id, workout_id, version_number, status, title, created_by_membership_id)
     VALUES (?, ?, 1, 'DRAFT', 'Treino Rascunho Isolado Teste', 1)`,
    [dummyVersionPublicId, dummyWorkoutId]
  );

  const afterDraftMetrics = await getAuthoritativeTrainingMetrics(testConsultancyId);
  assert.equal(
    afterDraftMetrics.comTreinoCount,
    beforeMetrics.comTreinoCount,
    "Criação de rascunho de treino NÃO PODE alterar a contagem de comTreino"
  );
  assert.equal(
    afterDraftMetrics.semTreinoCount,
    beforeMetrics.semTreinoCount,
    "Criação de rascunho de treino NÃO PODE alterar a contagem de semTreino"
  );
  console.log("  [PASS] Rascunho de treino isolado não alterou os indicadores do Início!");

  // Publicar o treino sem atribuir a nenhum aluno
  await pool.execute("UPDATE workouts SET status = 'PUBLISHED' WHERE id = ?", [dummyWorkoutId]);
  await pool.execute("UPDATE workout_versions SET status = 'PUBLISHED' WHERE public_id = ?", [dummyVersionPublicId]);

  const afterPublishMetrics = await getAuthoritativeTrainingMetrics(testConsultancyId);
  assert.equal(
    afterPublishMetrics.comTreinoCount,
    beforeMetrics.comTreinoCount,
    "Publicar treino sem aluno atribuído NÃO PODE alterar a contagem de comTreino"
  );
  console.log("  [PASS] Treino publicado sem aluno não gerou falso treino ativo!");

  // 4. Teste de Atribuição Ativa e Encerramento
  console.log("\n--- [4] Teste de Atribuição e Encerramento de Aluno ---");
  const [studentRows] = await pool.execute(
    `SELECT cm.id, cm.public_id 
     FROM consultancy_members cm
     INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id AND cmr.role = 'STUDENT'
     WHERE cm.consultancy_id = ? AND cm.status = 'ACTIVE'
     LIMIT 1`,
    [testConsultancyId]
  );

  if (studentRows.length > 0) {
    const student = studentRows[0];
    const initialStudentMetrics = await getAuthoritativeTrainingMetrics(testConsultancyId);
    const assignPublicId = `test_wa_${Date.now()}`;
    const [vRow] = await pool.execute("SELECT id FROM workout_versions WHERE public_id = ?", [dummyVersionPublicId]);
    const versionId = vRow[0].id;

    // Criar prescrição ativa para o aluno
    await pool.execute(
      `INSERT INTO workout_assignments (public_id, consultancy_id, student_membership_id, workout_version_id, assigned_by_membership_id, starts_on, status)
       VALUES (?, ?, ?, ?, 1, CURRENT_DATE(), 'ACTIVE')`,
      [assignPublicId, testConsultancyId, student.id, versionId]
    );

    const withAssignMetrics = await getAuthoritativeTrainingMetrics(testConsultancyId);
    console.log("  Métricas após atribuição ativa:", {
      comTreino: withAssignMetrics.comTreinoCount,
      semTreino: withAssignMetrics.semTreinoCount,
    });
    assert.equal(
      withAssignMetrics.comTreinoCount,
      initialStudentMetrics.comTreinoCount + 1,
      "Atribuição ativa deve incrementar comTreino em 1"
    );
    assert.equal(
      withAssignMetrics.semTreinoCount,
      initialStudentMetrics.semTreinoCount - 1,
      "Atribuição ativa deve decrementar semTreino em 1"
    );
    console.log("  [PASS] Atribuição ativa incrementou comTreino com precisão matemática!");

    // Encerrar a prescrição
    await pool.execute("UPDATE workout_assignments SET status = 'ENDED' WHERE public_id = ?", [assignPublicId]);

    const endedMetrics = await getAuthoritativeTrainingMetrics(testConsultancyId);
    assert.equal(
      endedMetrics.comTreinoCount,
      initialStudentMetrics.comTreinoCount,
      "Encerrar atribuição deve retornar comTreino ao valor inicial"
    );
    assert.equal(
      endedMetrics.semTreinoCount,
      initialStudentMetrics.semTreinoCount,
      "Encerrar atribuição deve retornar semTreino ao valor inicial"
    );
    console.log("  [PASS] Encerramento da prescrição retornou o aluno a 'sem treino ativo'!");

    // Limpeza da atribuição de teste
    await pool.execute("DELETE FROM workout_assignments WHERE public_id = ?", [assignPublicId]);
  }

  // Limpeza do treino de teste
  await pool.execute("DELETE FROM workout_versions WHERE public_id = ?", [dummyVersionPublicId]);
  await pool.execute("DELETE FROM workouts WHERE id = ?", [dummyWorkoutId]);

  // 5. Teste de tratamento de erro: NUNCA produzir falsos zeros
  console.log("\n--- [5] Teste de Proteção contra Falsos Zeros em Falhas ---");
  // Chamada com ID de consultoria inválido
  const invalidMetrics = await getAuthoritativeTrainingMetrics(-999);
  assert.equal(invalidMetrics.totalStudents, 0);
  assert.equal(invalidMetrics.comTreinoCount, 0);
  assert.equal(invalidMetrics.semTreinoCount, 0);
  console.log("  [PASS] Consultoria sem alunos reporta 0 total sem mascaramento!");

  console.log("\n=== TODOS OS TESTES DA SUÍTE DE MÉTRICAS AUTORITATIVAS PASSARAM COM SUCESSO! ===");
  process.exit(0);
}

run().catch((err) => {
  console.error("FALHA NA SUÍTE DE TESTES:", err);
  process.exit(1);
});
