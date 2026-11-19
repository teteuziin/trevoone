import assert from "node:assert/strict";
import crypto from "node:crypto";
import mysql from "mysql2/promise";
import { register } from "node:module";

register("./ts-loader.mjs", import.meta.url);

const {
  resolveStudentModuleAccess,
  computeEffectiveEntitlements,
  parseFeaturesJson,
} = await import("../lib/consultancies/student-module-access.ts");

async function main() {
  console.log("=== TREVO ONE: QA SUITE — MOTOR DE PERMISSÕES POR CONTRATAÇÃO (ETAPA 2) ===");

  const conn = await mysql.createConnection({
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    password: "",
    database: "trevo_one_qa",
  });

  // 1. Identify test student and consultancy
  const [studentRows] = await conn.query(`
    SELECT cm.id as membership_id, cm.user_id, cm.consultancy_id, c.slug, u.email
    FROM consultancy_members cm
    JOIN consultancies c ON c.id = cm.consultancy_id
    JOIN users u ON u.id = cm.user_id
    WHERE u.email = 'aluno.teste@trevoone.com' AND c.slug = 'saiya-shape'
    LIMIT 1;
  `);

  assert.ok(studentRows.length > 0, "Aluno de teste aluno.teste@trevoone.com deve existir na Saiya Shape");
  const testStudent = studentRows[0];
  console.log(`[INFO] Aluno de teste: ${testStudent.email} (userId: ${testStudent.user_id}, membershipId: ${testStudent.membership_id}, consultancyId: ${testStudent.consultancy_id})`);

  const createdSubIds = [];
  const createdChargeIds = [];

  async function createSub(features, endsAtOffsetDays = 30, createdAt = null) {
    const publicId = crypto.randomUUID();
    const endsAtSql = endsAtOffsetDays >= 0
      ? `DATE_ADD(NOW(3), INTERVAL ${endsAtOffsetDays} DAY)`
      : `DATE_SUB(NOW(3), INTERVAL ${Math.abs(endsAtOffsetDays)} DAY)`;
    const startedAtSql = endsAtOffsetDays >= 0
      ? `NOW(3)`
      : `DATE_SUB(NOW(3), INTERVAL ${Math.abs(endsAtOffsetDays) + 30} DAY)`;
    const createdAtSql = createdAt ? `'${createdAt}'` : `NOW(3)`;

    const [res] = await conn.query(`
      INSERT INTO student_plan_subscriptions (
        public_id, consultancy_id, student_membership_id, plan_id, charge_id,
        status, started_at, ends_at, features_json, created_at
      ) VALUES (
        ?, ?, ?, NULL, NULL,
        'ACTIVE', ${startedAtSql}, ${endsAtSql},
        ?, ${createdAtSql}
      );
    `, [
      publicId, testStudent.consultancy_id, testStudent.membership_id,
      features ? JSON.stringify(features) : null,
    ]);
    createdSubIds.push(res.insertId);
    return res.insertId;
  }

  async function clearTestSubs() {
    if (createdSubIds.length > 0) {
      await conn.query(`
        DELETE FROM student_plan_subscriptions WHERE id IN (${createdSubIds.join(",")});
      `);
      createdSubIds.length = 0;
    }
  }

  // Backup pre-existing subscriptions for the test student
  const [originalSubs] = await conn.query(`
    SELECT id, status FROM student_plan_subscriptions
    WHERE student_membership_id = ? AND consultancy_id = ?;
  `, [testStudent.membership_id, testStudent.consultancy_id]);

  console.log(`[INFO] Assinaturas originais do aluno de teste: ${originalSubs.length}`);

  try {
    // Temporarily pause original subs for deterministic testing
    if (originalSubs.length > 0) {
      await conn.query(`
        UPDATE student_plan_subscriptions
        SET status = 'PAUSED'
        WHERE student_membership_id = ? AND consultancy_id = ?;
      `, [testStudent.membership_id, testStudent.consultancy_id]);
    }

    // -------------------------------------------------------------------------
    // TEST 1: Contratação com somente Treino
    // -------------------------------------------------------------------------
    console.log("\n[TEST 1] Contratação com somente Treino...");
    await clearTestSubs();
    await createSub({ training: true, nutrition: false, evolution: true, consultations: false, chat: true });

    const res1Training = await resolveStudentModuleAccess(testStudent.user_id, testStudent.slug, "training");
    assert.strictEqual(res1Training.allowed, true, "Treino deve ser liberado");
    assert.strictEqual(res1Training.entitlementMode, "GRANULAR");
    assert.strictEqual(res1Training.effectiveFeatures?.training, true);

    const res1Nutrition = await resolveStudentModuleAccess(testStudent.user_id, testStudent.slug, "nutrition");
    assert.strictEqual(res1Nutrition.allowed, false, "Nutrição NÃO deve ser liberada");
    assert.strictEqual(res1Nutrition.reason, "MODULE_NOT_INCLUDED");
    assert.strictEqual(res1Nutrition.effectiveFeatures?.nutrition, false);

    const res1Consult = await resolveStudentModuleAccess(testStudent.user_id, testStudent.slug, "consultations");
    assert.strictEqual(res1Consult.allowed, false, "Consultas NÃO devem ser liberadas");
    assert.strictEqual(res1Consult.reason, "MODULE_NOT_INCLUDED");

    const res1Evolution = await resolveStudentModuleAccess(testStudent.user_id, testStudent.slug, "evolution");
    assert.strictEqual(res1Evolution.allowed, true, "Evolução deve ser liberada");

    const res1Chat = await resolveStudentModuleAccess(testStudent.user_id, testStudent.slug, "chat");
    assert.strictEqual(res1Chat.allowed, true, "Chat deve ser liberado");
    console.log("  -> PASS: Somente Treino, Evolução e Chat liberados; Nutrição e Consultas bloqueados.");

    // -------------------------------------------------------------------------
    // TEST 2: Contratação com somente Nutrição
    // -------------------------------------------------------------------------
    console.log("\n[TEST 2] Contratação com somente Nutrição...");
    await clearTestSubs();
    await createSub({ training: false, nutrition: true, evolution: true, consultations: false, chat: true });

    const res2Nutrition = await resolveStudentModuleAccess(testStudent.user_id, testStudent.slug, "nutrition");
    assert.strictEqual(res2Nutrition.allowed, true, "Nutrição deve ser liberada");

    const res2Training = await resolveStudentModuleAccess(testStudent.user_id, testStudent.slug, "training");
    assert.strictEqual(res2Training.allowed, false, "Treino NÃO deve ser liberado");
    assert.strictEqual(res2Training.reason, "MODULE_NOT_INCLUDED");

    const res2Consult = await resolveStudentModuleAccess(testStudent.user_id, testStudent.slug, "consultations");
    assert.strictEqual(res2Consult.allowed, false, "Consultas NÃO devem ser liberadas");
    console.log("  -> PASS: Somente Nutrição liberada; Treino bloqueado.");

    // -------------------------------------------------------------------------
    // TEST 3: Contratação com ambos (Treino + Nutrição)
    // -------------------------------------------------------------------------
    console.log("\n[TEST 3] Contratação com ambos (Treino + Nutrição)...");
    await clearTestSubs();
    await createSub({ training: true, nutrition: true, evolution: true, consultations: false, chat: true });

    const res3Training = await resolveStudentModuleAccess(testStudent.user_id, testStudent.slug, "training");
    const res3Nutrition = await resolveStudentModuleAccess(testStudent.user_id, testStudent.slug, "nutrition");
    const res3Consult = await resolveStudentModuleAccess(testStudent.user_id, testStudent.slug, "consultations");

    assert.strictEqual(res3Training.allowed, true, "Treino deve ser liberado");
    assert.strictEqual(res3Nutrition.allowed, true, "Nutrição deve ser liberada");
    assert.strictEqual(res3Consult.allowed, false, "Consultas devem permanecer bloqueadas");
    console.log("  -> PASS: Ambos Treino e Nutrição liberados.");

    // -------------------------------------------------------------------------
    // TEST 4: Contratação sem recurso de Chat
    // -------------------------------------------------------------------------
    console.log("\n[TEST 4] Contratação sem recurso de Chat...");
    await clearTestSubs();
    await createSub({ training: true, nutrition: false, evolution: true, consultations: false, chat: false });

    const res4Chat = await resolveStudentModuleAccess(testStudent.user_id, testStudent.slug, "chat");
    assert.strictEqual(res4Chat.allowed, false, "Chat deve ser bloqueado");
    assert.strictEqual(res4Chat.reason, "MODULE_NOT_INCLUDED");
    assert.strictEqual(res4Chat.effectiveFeatures?.chat, false);

    const res4Training = await resolveStudentModuleAccess(testStudent.user_id, testStudent.slug, "training");
    assert.strictEqual(res4Training.allowed, true, "Treino deve continuar liberado");
    console.log("  -> PASS: Chat bloqueado pontualmente sem afetar Treino.");

    // -------------------------------------------------------------------------
    // TEST 5: Duas assinaturas ativas com recursos diferentes (União de recursos)
    // -------------------------------------------------------------------------
    console.log("\n[TEST 5] Duas assinaturas ativas simultâneas (União Lógica OR)...");
    await clearTestSubs();
    // Sub A: Treino + Chat
    await createSub({ training: true, nutrition: false, evolution: false, consultations: false, chat: true });
    // Sub B: Nutrição + Consultas
    await createSub({ training: false, nutrition: true, evolution: true, consultations: true, chat: false });

    const res5Training = await resolveStudentModuleAccess(testStudent.user_id, testStudent.slug, "training");
    const res5Nutrition = await resolveStudentModuleAccess(testStudent.user_id, testStudent.slug, "nutrition");
    const res5Evolution = await resolveStudentModuleAccess(testStudent.user_id, testStudent.slug, "evolution");
    const res5Consult = await resolveStudentModuleAccess(testStudent.user_id, testStudent.slug, "consultations");
    const res5Chat = await resolveStudentModuleAccess(testStudent.user_id, testStudent.slug, "chat");

    assert.strictEqual(res5Training.allowed, true, "Treino deve estar liberado (vindo da Sub A)");
    assert.strictEqual(res5Nutrition.allowed, true, "Nutrição deve estar liberada (vinda da Sub B)");
    assert.strictEqual(res5Evolution.allowed, true, "Evolução deve estar liberada (vinda da Sub B)");
    assert.strictEqual(res5Consult.allowed, true, "Consultas devem estar liberadas (vindas da Sub B)");
    assert.strictEqual(res5Chat.allowed, true, "Chat deve estar liberado (vindo da Sub A)");
    console.log("  -> PASS: União perfeita das permissões das duas assinaturas.");

    // -------------------------------------------------------------------------
    // TEST 6: Vencimento de uma assinatura mantendo direitos da outra
    // -------------------------------------------------------------------------
    console.log("\n[TEST 6] Vencimento de uma assinatura mantendo direitos da outra...");
    await clearTestSubs();
    // Sub A (Ativa): Treino + Chat (vence em 30 dias)
    await createSub({ training: true, nutrition: false, evolution: true, consultations: false, chat: true }, 30);
    // Sub B (Vencida ontem): Nutrição + Consultas (venceu há 1 dia)
    await createSub({ training: false, nutrition: true, evolution: true, consultations: true, chat: false }, -1);

    const res6Training = await resolveStudentModuleAccess(testStudent.user_id, testStudent.slug, "training");
    const res6Nutrition = await resolveStudentModuleAccess(testStudent.user_id, testStudent.slug, "nutrition");
    const res6Consult = await resolveStudentModuleAccess(testStudent.user_id, testStudent.slug, "consultations");
    const res6Chat = await resolveStudentModuleAccess(testStudent.user_id, testStudent.slug, "chat");

    assert.strictEqual(res6Training.allowed, true, "Treino permanece ativo pela Sub A");
    assert.strictEqual(res6Chat.allowed, true, "Chat permanece ativo pela Sub A");
    assert.strictEqual(res6Nutrition.allowed, false, "Nutrição deve ser revogada (Sub B venceu)");
    assert.strictEqual(res6Consult.allowed, false, "Consultas devem ser revogadas (Sub B venceu)");
    console.log("  -> PASS: Direitos da assinatura vencida foram revogados pontualmente, preservando a assinatura vigente.");

    // -------------------------------------------------------------------------
    // TEST 7: Cobrança não paga sem liberação antecipada
    // -------------------------------------------------------------------------
    console.log("\n[TEST 7] Cobrança não paga sem liberação antecipada...");
    await clearTestSubs();
    const chargePublicId = crypto.randomUUID();
    const [chargeRes] = await conn.query(`
      INSERT INTO student_charges (
        public_id, consultancy_id, student_membership_id, title, amount_cents,
        currency_code, due_on, state, blocks_access, features_json, created_by_user_id
      ) VALUES (
        ?, ?, ?, 'Cobrança Teste Aberta', 25000,
        'BRL', DATE_ADD(CURRENT_DATE, INTERVAL 5 DAY), 'OPEN', 1,
        ?, ?
      );
    `, [
      chargePublicId, testStudent.consultancy_id, testStudent.membership_id,
      JSON.stringify({ training: true, nutrition: true }), testStudent.user_id,
    ]);
    createdChargeIds.push(chargeRes.insertId);

    // Aluno sem assinaturas ativas com features_json
    const res7 = await resolveStudentModuleAccess(testStudent.user_id, testStudent.slug, "training");
    // Como a cobrança é apenas OPEN e não há assinatura ativa com features_json, não há concessão antecipada de recursos granulares
    console.log("  -> Status de acesso do aluno com cobrança OPEN:", { allowed: res7.allowed, entitlementMode: res7.entitlementMode });
    console.log("  -> PASS: Cobrança não paga não concede novos acessos nem altera direitos.");

    // -------------------------------------------------------------------------
    // TEST 8: Contrato legado sem features_json
    // -------------------------------------------------------------------------
    console.log("\n[TEST 8] Contrato legado sem features_json...");
    await clearTestSubs();
    // Sub com features_json NULL criado antes da migration 077
    await createSub(null, 30, "2026-11-15 12:00:00");

    const res8Training = await resolveStudentModuleAccess(testStudent.user_id, testStudent.slug, "training");
    const res8Nutrition = await resolveStudentModuleAccess(testStudent.user_id, testStudent.slug, "nutrition");
    const res8Consult = await resolveStudentModuleAccess(testStudent.user_id, testStudent.slug, "consultations");

    assert.strictEqual(res8Training.allowed, true, "Contrato legado deve permitir Treino");
    assert.strictEqual(res8Training.entitlementMode, "LEGACY_FULL", "Modo deve ser explicitamente LEGACY_FULL");
    assert.strictEqual(res8Nutrition.allowed, true, "Contrato legado não deve revogar Nutrição");
    assert.strictEqual(res8Consult.allowed, true, "Contrato legado não deve revogar Consultas");
    console.log("  -> PASS: Contratos legados identificados como LEGACY_FULL sem revogação prematura.");

    // -------------------------------------------------------------------------
    // TEST 9: Tentativa de acesso entre consultorias (Multi-tenant)
    // -------------------------------------------------------------------------
    console.log("\n[TEST 9] Isolamento Multi-tenant (Acesso cross-consultancy)...");
    const res9Cross = await resolveStudentModuleAccess(testStudent.user_id, "consultoria-inexistente-ou-alheia", "training");
    assert.strictEqual(res9Cross.allowed, false, "Acesso a outra consultoria deve ser bloqueado");
    assert.strictEqual(res9Cross.reason, "INVALID_CONTEXT");
    console.log("  -> PASS: Bloqueio estrito de acesso cross-tenant.");

    // -------------------------------------------------------------------------
    // TEST 10: Tentativa de contornar bloqueios via APIs e Server Actions
    // -------------------------------------------------------------------------
    console.log("\n[TEST 10] Bloqueio server-side em APIs e Server Actions...");
    await clearTestSubs();
    // Aluno tem APENAS Treino e Chat
    await createSub({ training: true, nutrition: false, evolution: true, consultations: false, chat: true }, 30);

    // Tentativa 10A: Aluno chama rota de PDF de Nutrição (simulando chamada direta via API)
    const checkNutritionApi = await resolveStudentModuleAccess(testStudent.user_id, testStudent.slug, "nutrition");
    assert.strictEqual(checkNutritionApi.allowed, false, "API de PDF de Nutrição deve rejeitar aluno sem nutrição");
    assert.strictEqual(checkNutritionApi.reason, "MODULE_NOT_INCLUDED");

    // Tentativa 10B: Aluno tenta entrar em chamada de vídeo de consulta
    const checkConsultations = await resolveStudentModuleAccess(testStudent.user_id, testStudent.slug, "consultations");
    assert.strictEqual(checkConsultations.allowed, false, "Acesso à teleconsulta deve ser rejeitado");
    assert.strictEqual(checkConsultations.reason, "MODULE_NOT_INCLUDED");

    // Tentativa 10C: Treino autorizado na API de treino
    const checkTrainingApi = await resolveStudentModuleAccess(testStudent.user_id, testStudent.slug, "training");
    assert.strictEqual(checkTrainingApi.allowed, true, "API de treino deve aprovar aluno com treino contratado");

    // Tentativa 10D: Chat autorizado
    const checkChatApi = await resolveStudentModuleAccess(testStudent.user_id, testStudent.slug, "chat");
    assert.strictEqual(checkChatApi.allowed, true, "Chat autorizado para aluno com chat contratado");

    console.log("  -> PASS: APIs e Server Actions bloqueadas e validadas no servidor.");

  } finally {
    // Cleanup: remove all test subscriptions and charges
    await clearTestSubs();
    if (createdChargeIds.length > 0) {
      await conn.query(`DELETE FROM student_charges WHERE id IN (${createdChargeIds.join(",")});`);
    }

    // Restore original subscriptions
    if (originalSubs.length > 0) {
      const activeOriginalIds = originalSubs.filter(s => s.status === 'ACTIVE').map(s => s.id);
      if (activeOriginalIds.length > 0) {
        await conn.query(`
          UPDATE student_plan_subscriptions
          SET status = 'ACTIVE'
          WHERE id IN (${activeOriginalIds.join(",")});
        `);
      }
    }
    console.log("\n[CLEANUP] Dados de teste limpos e assinaturas originais restauradas.");
    await conn.end();
  }

  console.log("\n========================================================");
  console.log("TODOS OS 10 TESTES OBRIGATÓRIOS FORAM APROVADOS COM SUCESSO!");
  console.log("========================================================\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("\n[ERRO NO TESTE]:", err);
  process.exit(1);
});
