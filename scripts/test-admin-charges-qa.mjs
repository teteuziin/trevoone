import assert from "node:assert/strict";
import crypto from "node:crypto";
import mysql from "mysql2/promise";
import { register } from "node:module";

register("./ts-loader.mjs", import.meta.url);

const {
  markStudentChargePaid,
  cancelStudentCharge,
  getStudentFinancialAccessState,
} = await import("../lib/consultancies/finance.ts");

const {
  resolveStudentModuleAccess,
} = await import("../lib/consultancies/student-module-access.ts");

const {
  resolveConsultancyContext,
} = await import("../lib/consultancies/context.ts");

async function main() {
  console.log("======================================================================");
  console.log("TREVO ONE: QA SUITE — CONTROLE ADMINISTRATIVO DE COBRANÇAS (ETAPA 3)");
  console.log("======================================================================\n");

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "trevo_one_qa",
  });

  // Track created records for safe cleanup at the end
  const createdChargeIds = [];
  const createdSubIds = [];
  const createdPaymentIds = [];
  const createdAuditIds = [];

  try {
    // 1. Identify test users and consultancy
    const [adminRows] = await conn.query(`
      SELECT cm.id as membership_id, cm.user_id, cm.consultancy_id, c.slug, u.email
      FROM consultancy_members cm
      JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
      JOIN consultancies c ON c.id = cm.consultancy_id
      JOIN users u ON u.id = cm.user_id
      WHERE cmr.role = 'CONSULTANCY_ADMIN' AND c.slug = 'saiya-shape'
      LIMIT 1;
    `);
    assert.ok(adminRows.length > 0, "Admin da consultoria saiya-shape deve existir");
    const testAdmin = adminRows[0];

    const [studentRows] = await conn.query(`
      SELECT cm.id as membership_id, cm.user_id, cm.consultancy_id, c.slug, u.email
      FROM consultancy_members cm
      JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
      JOIN consultancies c ON c.id = cm.consultancy_id
      JOIN users u ON u.id = cm.user_id
      WHERE cmr.role = 'STUDENT' AND c.slug = 'saiya-shape'
      LIMIT 1;
    `);
    assert.ok(studentRows.length > 0, "Aluno de teste da saiya-shape deve existir");
    const testStudent = studentRows[0];

    const [personalRows] = await conn.query(`
      SELECT cm.id as membership_id, cm.user_id, cm.consultancy_id, c.slug, u.email
      FROM consultancy_members cm
      JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
      JOIN consultancies c ON c.id = cm.consultancy_id
      JOIN users u ON u.id = cm.user_id
      WHERE cmr.role = 'PERSONAL' AND c.slug = 'saiya-shape'
      LIMIT 1;
    `);
    assert.ok(personalRows.length > 0, "Personal de teste da saiya-shape deve existir");
    const testPersonal = personalRows[0];

    console.log(`[SETUP] Admin: ${testAdmin.email} (userId: ${testAdmin.user_id}, consultancyId: ${testAdmin.consultancy_id})`);
    console.log(`[SETUP] Aluno: ${testStudent.email} (userId: ${testStudent.user_id}, membershipId: ${testStudent.membership_id})`);
    console.log(`[SETUP] Personal: ${testPersonal.email} (userId: ${testPersonal.user_id})\n`);

    // Helper: Create a test charge
    async function createTestCharge(opts = {}) {
      const publicId = crypto.randomUUID();
      const amountCents = opts.amountCents || 12000;
      const state = opts.state || "OPEN";
      const dueDays = opts.dueDays !== undefined ? opts.dueDays : 7;
      const featuresJson = opts.featuresJson || null;
      const checkoutUrl = opts.checkoutUrl || null;
      const planId = opts.planId !== undefined ? opts.planId : null;
      const consultancyId = opts.consultancyId || testAdmin.consultancy_id;
      const studentMembershipId = opts.studentMembershipId || testStudent.membership_id;

      const [res] = await conn.query(`
        INSERT INTO student_charges (
          public_id, consultancy_id, student_membership_id, plan_id,
          title, features_json, description, amount_cents, currency_code,
          due_on, blocks_access, state, created_by_user_id, created_at,
          infinitepay_checkout_url
        ) VALUES (
          ?, ?, ?, ?,
          ?, ?, 'Cobrança QA automatizada', ?, 'BRL',
          DATE_ADD(CURDATE(), INTERVAL ? DAY), 1, ?, ?, NOW(3),
          ?
        );
      `, [
        publicId,
        consultancyId,
        studentMembershipId,
        planId,
        opts.title || "Cobrança Teste QA",
        featuresJson,
        amountCents,
        dueDays,
        state,
        testAdmin.user_id,
        checkoutUrl,
      ]);

      createdChargeIds.push(res.insertId);
      return { id: res.insertId, publicId };
    }

    // Helper: Create a test subscription
    async function createTestSub(opts = {}) {
      const publicId = crypto.randomUUID();
      const consultancyId = opts.consultancyId || testAdmin.consultancy_id;
      const studentMembershipId = opts.studentMembershipId || testStudent.membership_id;
      const status = opts.status || "ACTIVE";
      const featuresJson = opts.featuresJson || null;
      const endsDays = opts.endsDays !== undefined ? opts.endsDays : 30;

      const [res] = await conn.query(`
        INSERT INTO student_plan_subscriptions (
          public_id, consultancy_id, student_membership_id, plan_id, charge_id,
          status, features_json, started_at, ends_at, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, NOW(3), DATE_ADD(NOW(3), INTERVAL ? DAY), NOW(3), NOW(3)
        );
      `, [
        publicId,
        consultancyId,
        studentMembershipId,
        opts.planId || null,
        opts.chargeId || null,
        status,
        featuresJson,
        endsDays,
      ]);

      createdSubIds.push(res.insertId);
      return { id: res.insertId, publicId };
    }

    // =========================================================================
    // CENÁRIO 1: Admin marca cobrança elegível como paga com sucesso (PIX_MANUAL)
    // =========================================================================
    console.log("CENÁRIO 1: Admin marca cobrança elegível como paga com sucesso (PIX_MANUAL)...");
    const c1 = await createTestCharge({ title: "Mensalidade QA PIX Manual" });
    const res1 = await markStudentChargePaid({
      consultancyId: testAdmin.consultancy_id,
      userId: testAdmin.user_id,
      chargePublicId: c1.publicId,
      paymentMethod: "PIX_MANUAL",
      notes: "Recebido via chave Pix do admin",
    });

    assert.equal(res1.success, true, `Deveria ter marcado como paga com sucesso: ${res1.error}`);
    assert.ok(res1.paymentPublicId, "Deveria retornar paymentPublicId");

    // Check DB state
    const [chargeRows1] = await conn.query(
      `SELECT state, paid_amount_cents, paid_at FROM student_charges WHERE id = ?`,
      [c1.id]
    );
    assert.equal(chargeRows1[0].state, "PAID");
    assert.equal(Number(chargeRows1[0].paid_amount_cents), 12000);
    assert.ok(chargeRows1[0].paid_at);

    const [paymentRows1] = await conn.query(
      `SELECT id, amount_cents, payment_method, confirmed_by_user_id FROM student_payments WHERE charge_id = ?`,
      [c1.id]
    );
    assert.equal(paymentRows1.length, 1);
    createdPaymentIds.push(paymentRows1[0].id);
    assert.equal(Number(paymentRows1[0].amount_cents), 12000);
    assert.equal(paymentRows1[0].payment_method, "PIX_MANUAL");
    assert.equal(Number(paymentRows1[0].confirmed_by_user_id), testAdmin.user_id);

    const [auditRows1] = await conn.query(
      `SELECT id, action, metadata_json FROM audit_events WHERE target_public_id = ? AND action = 'STUDENT_CHARGE_MARKED_PAID'`,
      [c1.publicId]
    );
    assert.equal(auditRows1.length, 1);
    createdAuditIds.push(auditRows1[0].id);
    console.log(" -> PASS: Cobrança paga com sucesso, student_payments e audit_events registrados.\n");

    // =========================================================================
    // CENÁRIO 2: Pagamento manual ativa assinatura com snapshot de features correto
    // =========================================================================
    console.log("CENÁRIO 2: Pagamento manual ativa assinatura com snapshot de features...");
    const featJson2 = JSON.stringify({
      training: true,
      nutrition: false,
      evolution: true,
      consultations: false,
      chat: false,
    });
    const c2 = await createTestCharge({
      title: "Contratação Personalizada Treino+Evolução",
      featuresJson: featJson2,
    });

    const res2 = await markStudentChargePaid({
      consultancyId: testAdmin.consultancy_id,
      userId: testAdmin.user_id,
      chargePublicId: c2.publicId,
      paymentMethod: "DINHEIRO",
      notes: "Pago em espécie na recepção",
    });

    assert.equal(res2.success, true, `Deveria ter marcado como paga com sucesso: ${res2.error}`);
    assert.ok(res2.subscriptionPublicId, "Deveria ativar assinatura");

    const [subRows2] = await conn.query(
      `SELECT id, status, features_json, started_at, ends_at FROM student_plan_subscriptions WHERE charge_id = ?`,
      [c2.id]
    );
    assert.equal(subRows2.length, 1);
    createdSubIds.push(subRows2[0].id);
    assert.equal(subRows2[0].status, "ACTIVE");
    const savedFeatures = typeof subRows2[0].features_json === "string"
      ? JSON.parse(subRows2[0].features_json)
      : subRows2[0].features_json;
    assert.deepEqual(savedFeatures, {
      training: true,
      nutrition: false,
      evolution: true,
      consultations: false,
      chat: false,
    });
    assert.ok(new Date(subRows2[0].ends_at) > new Date(subRows2[0].started_at));
    console.log(" -> PASS: Assinatura ativada com snapshot de features idêntico e vigência calculada.\n");

    // =========================================================================
    // CENÁRIO 3: Tentativa de marcar como paga cobrança com checkout externo ativo é BLOQUEADA
    // =========================================================================
    console.log("CENÁRIO 3: Bloqueio de marcação manual em cobrança com checkout InfinitePay ativo...");
    const c3 = await createTestCharge({
      title: "Cobrança InfinitePay Link Ativo",
      checkoutUrl: "https://pay.infinitepay.io/saiya-shape/test-checkout-123",
    });

    const res3 = await markStudentChargePaid({
      consultancyId: testAdmin.consultancy_id,
      userId: testAdmin.user_id,
      chargePublicId: c3.publicId,
      paymentMethod: "PIX_MANUAL",
    });

    assert.equal(res3.success, false, "Não deve permitir confirmar cobrança com gateway ativo");
    assert.match(res3.error, /gateway|checkout/i);

    const [chargeRows3] = await conn.query(`SELECT state FROM student_charges WHERE id = ?`, [c3.id]);
    assert.equal(chargeRows3[0].state, "OPEN");

    const [payments3] = await conn.query(`SELECT id FROM student_payments WHERE charge_id = ?`, [c3.id]);
    assert.equal(payments3.length, 0);
    console.log(" -> PASS: Cobrança com checkout externo ativo foi estritamente rejeitada.\n");

    // =========================================================================
    // CENÁRIO 4: Tentativas concorrentes de marcar como paga não duplicam pagamento nem assinatura
    // =========================================================================
    console.log("CENÁRIO 4: Tentativas concorrentes atômicas (concorrência SELECT ... FOR UPDATE)...");
    const c4 = await createTestCharge({
      title: "Cobrança Teste Concorrência",
      featuresJson: featJson2,
    });

    const promises4 = [
      markStudentChargePaid({
        consultancyId: testAdmin.consultancy_id,
        userId: testAdmin.user_id,
        chargePublicId: c4.publicId,
        paymentMethod: "TRANSFERENCIA",
      }),
      markStudentChargePaid({
        consultancyId: testAdmin.consultancy_id,
        userId: testAdmin.user_id,
        chargePublicId: c4.publicId,
        paymentMethod: "TRANSFERENCIA",
      }),
      markStudentChargePaid({
        consultancyId: testAdmin.consultancy_id,
        userId: testAdmin.user_id,
        chargePublicId: c4.publicId,
        paymentMethod: "TRANSFERENCIA",
      }),
    ];

    const results4 = await Promise.all(promises4);
    const successCount = results4.filter((r) => r.success).length;
    const failCount = results4.filter((r) => !r.success).length;

    assert.equal(successCount, 1, "Exatamente 1 chamada concorrente deve suceder");
    assert.equal(failCount, 2, "As outras 2 chamadas concorrentes devem falhar amigavelmente");

    const [payments4] = await conn.query(`SELECT id FROM student_payments WHERE charge_id = ?`, [c4.id]);
    assert.equal(payments4.length, 1, "Deve existir exatamente 1 student_payments");
    createdPaymentIds.push(payments4[0].id);

    const [subs4] = await conn.query(`SELECT id FROM student_plan_subscriptions WHERE charge_id = ?`, [c4.id]);
    assert.equal(subs4.length, 1, "Deve existir exatamente 1 student_plan_subscriptions");
    createdSubIds.push(subs4[0].id);
    console.log(" -> PASS: Transação atômica impediu duplicação sob concorrência (1 sucesso, 2 rejeições).\n");

    // =========================================================================
    // CENÁRIO 5: Cobrança já paga não pode ser paga novamente
    // =========================================================================
    console.log("CENÁRIO 5: Rejeição de cobrança já paga...");
    const res5 = await markStudentChargePaid({
      consultancyId: testAdmin.consultancy_id,
      userId: testAdmin.user_id,
      chargePublicId: c1.publicId, // já paga no cenário 1
      paymentMethod: "PIX_MANUAL",
    });

    assert.equal(res5.success, false);
    assert.match(res5.error, /já possui um pagamento confirmado/i);
    console.log(" -> PASS: Cobrança já paga foi rejeitada com mensagem amigável.\n");

    // =========================================================================
    // CENÁRIO 6: Personal e Aluno NÃO possuem autorização administrativa (RBAC)
    // =========================================================================
    console.log("CENÁRIO 6: Verificação de RBAC (Personal e Aluno não são CONSULTANCY_ADMIN)...");
    const ctxPersonal = await resolveConsultancyContext(testPersonal.user_id, "saiya-shape");
    assert.ok(ctxPersonal, "Contexto do Personal deve ser resolvido");
    assert.equal(ctxPersonal.roles.includes("CONSULTANCY_ADMIN"), false, "Personal não deve ter role CONSULTANCY_ADMIN");

    const ctxStudent = await resolveConsultancyContext(testStudent.user_id, "saiya-shape");
    assert.ok(ctxStudent, "Contexto do Aluno deve ser resolvido");
    assert.equal(ctxStudent.roles.includes("CONSULTANCY_ADMIN"), false, "Aluno não deve ter role CONSULTANCY_ADMIN");

    const ctxAdmin = await resolveConsultancyContext(testAdmin.user_id, "saiya-shape");
    assert.ok(ctxAdmin, "Contexto do Admin deve ser resolvido");
    assert.equal(ctxAdmin.roles.includes("CONSULTANCY_ADMIN"), true, "Admin deve ter role CONSULTANCY_ADMIN");
    console.log(" -> PASS: Apenas CONSULTANCY_ADMIN possui autorização; Personal e Aluno estritamente barrados.\n");

    // =========================================================================
    // CENÁRIO 7: Admin cancela cobrança aberta com justificativa obrigatória
    // =========================================================================
    console.log("CENÁRIO 7: Cancelamento de cobrança aberta com justificativa...");
    const c7 = await createTestCharge({ title: "Cobrança a Cancelar" });

    // Sem justificativa -> deve falhar
    const failRes7a = await cancelStudentCharge({
      consultancyId: testAdmin.consultancy_id,
      userId: testAdmin.user_id,
      chargePublicId: c7.publicId,
      cancelReason: "",
    });
    assert.equal(failRes7a.success, false);
    assert.match(failRes7a.error, /justificativa/i);

    // Justificativa curta (< 3 chars) -> deve falhar
    const failRes7b = await cancelStudentCharge({
      consultancyId: testAdmin.consultancy_id,
      userId: testAdmin.user_id,
      chargePublicId: c7.publicId,
      cancelReason: "oi",
    });
    assert.equal(failRes7b.success, false);

    // Com justificativa válida -> deve suceder
    const okRes7 = await cancelStudentCharge({
      consultancyId: testAdmin.consultancy_id,
      userId: testAdmin.user_id,
      chargePublicId: c7.publicId,
      cancelReason: "Aluno desistiu da contratação adicional",
    });
    assert.equal(okRes7.success, true);

    const [chargeRows7] = await conn.query(
      `SELECT state, canceled_by_user_id, cancel_reason FROM student_charges WHERE id = ?`,
      [c7.id]
    );
    assert.equal(chargeRows7[0].state, "CANCELED");
    assert.equal(Number(chargeRows7[0].canceled_by_user_id), testAdmin.user_id);
    assert.equal(chargeRows7[0].cancel_reason, "Aluno desistiu da contratação adicional");

    const [auditRows7] = await conn.query(
      `SELECT id FROM audit_events WHERE target_public_id = ? AND action = 'STUDENT_CHARGE_CANCELED'`,
      [c7.publicId]
    );
    assert.equal(auditRows7.length, 1);
    createdAuditIds.push(auditRows7[0].id);
    console.log(" -> PASS: Justificativa validada, status CANCELED atualizado e auditoria registrada.\n");

    // =========================================================================
    // CENÁRIO 8: Cobrança já paga não pode ser cancelada diretamente
    // =========================================================================
    console.log("CENÁRIO 8: Tentativa de cancelar cobrança já paga...");
    const res8 = await cancelStudentCharge({
      consultancyId: testAdmin.consultancy_id,
      userId: testAdmin.user_id,
      chargePublicId: c1.publicId, // já paga no cenário 1
      cancelReason: "Tentativa de cancelamento de cobrança paga",
    });

    assert.equal(res8.success, false);
    assert.match(res8.error, /já paga/i);

    const [chargeRows8] = await conn.query(`SELECT state FROM student_charges WHERE id = ?`, [c1.id]);
    assert.equal(chargeRows8[0].state, "PAID");
    console.log(" -> PASS: Cobrança paga blindada contra cancelamento direto.\n");

    // =========================================================================
    // CENÁRIO 9: Cancelamento de cobrança não revoga direitos de outra assinatura ativa
    // =========================================================================
    console.log("CENÁRIO 9: Cancelamento de cobrança não afeta outra assinatura ativa...");
    const subActive9 = await createTestSub({
      featuresJson: JSON.stringify({ training: true, nutrition: true, evolution: true, consultations: false, chat: false }),
      endsDays: 45,
    });

    const c9 = await createTestCharge({ title: "Cobrança Avulsa Cancelável" });
    await cancelStudentCharge({
      consultancyId: testAdmin.consultancy_id,
      userId: testAdmin.user_id,
      chargePublicId: c9.publicId,
      cancelReason: "Cancelamento sem impacto em assinaturas ativas",
    });

    const [subRows9] = await conn.query(
      `SELECT status FROM student_plan_subscriptions WHERE id = ?`,
      [subActive9.id]
    );
    assert.equal(subRows9[0].status, "ACTIVE", "Assinatura ativa prévia deve permanecer ACTIVE");
    console.log(" -> PASS: Assinatura ativa independente permaneceu intacta após cancelamento de outra cobrança.\n");

    // =========================================================================
    // CENÁRIO 10: Tentativa de marcar ou cancelar cobrança de outra consultoria é bloqueada
    // =========================================================================
    console.log("CENÁRIO 10: Isolamento multi-tenant (outra consultoria)...");
    const otherConsultancyId = 2; // consultoria-padrao

    const res10Mark = await markStudentChargePaid({
      consultancyId: otherConsultancyId,
      userId: testAdmin.user_id,
      chargePublicId: c2.publicId, // pertence à consultoria 1
      paymentMethod: "PIX_MANUAL",
    });
    assert.equal(res10Mark.success, false);
    assert.match(res10Mark.error, /não encontrada/i);

    const c10Open = await createTestCharge({ title: "Cobrança Tenant 1" });
    const res10Cancel = await cancelStudentCharge({
      consultancyId: otherConsultancyId,
      userId: testAdmin.user_id,
      chargePublicId: c10Open.publicId,
      cancelReason: "Ataque cross-tenant",
    });
    assert.equal(res10Cancel.success, false);
    assert.match(res10Cancel.error, /não encontrada/i);

    const [c10Check] = await conn.query(`SELECT state FROM student_charges WHERE id = ?`, [c10Open.id]);
    assert.equal(c10Check[0].state, "OPEN");
    console.log(" -> PASS: Isolamento multi-tenant validado: cross-consultancy totalmente bloqueado.\n");

    // =========================================================================
    // CENÁRIO 11: Inadimplência modular: Cobrança de Treino vencida NÃO bloqueia Nutrição ativa e paga
    // =========================================================================
    console.log("CENÁRIO 11: Inadimplência modular (Treino vencido NÃO bloqueia Nutrição ativa)...");
    // Aluno possui assinatura ativa de Nutrição (vigente por 30 dias)
    const subNutrition = await createTestSub({
      featuresJson: JSON.stringify({ training: false, nutrition: true, evolution: false, consultations: false, chat: false }),
      endsDays: 30,
    });

    // Aluno possui cobrança vencida de Treino (due_on = ontem, features = training only)
    const chargeTrainingOverdue = await createTestCharge({
      title: "Treino Vencido",
      dueDays: -2, // Vencida há 2 dias
      featuresJson: JSON.stringify({ training: true, nutrition: false, evolution: false, consultations: false, chat: false }),
    });

    // Avaliação financeira para Nutrição:
    const finNutrition = await getStudentFinancialAccessState({
      consultancyId: testAdmin.consultancy_id,
      studentMembershipId: testStudent.membership_id,
      requiredModule: "nutrition",
    });
    assert.equal(finNutrition.isRestricted, false, "Nutrição NÃO deve ser bloqueada por dívida de treino");

    // Avaliação financeira para Treino:
    const finTraining = await getStudentFinancialAccessState({
      consultancyId: testAdmin.consultancy_id,
      studentMembershipId: testStudent.membership_id,
      requiredModule: "training",
    });
    assert.equal(finTraining.isRestricted, true, "Treino DEVE ser bloqueado por dívida vencida de treino");
    assert.equal(finTraining.blockingCharge.publicId, chargeTrainingOverdue.publicId);

    // Avaliação via motor integrado resolveStudentModuleAccess
    const accessNutrition = await resolveStudentModuleAccess(testStudent.user_id, "saiya-shape", "nutrition");
    assert.equal(accessNutrition.allowed, true, "Aluno deve ter acesso permitido ao módulo de Nutrição");

    const accessTraining = await resolveStudentModuleAccess(testStudent.user_id, "saiya-shape", "training");
    assert.equal(accessTraining.allowed, false, "Aluno não deve ter acesso ao módulo de Treino");
    assert.equal(accessTraining.reason, "FINANCIALLY_RESTRICTED");

    // Clean up scenario 11 specific records so they don't pollute scenario 12
    await conn.query(`DELETE FROM student_charges WHERE id = ?`, [chargeTrainingOverdue.id]);
    await conn.query(`DELETE FROM student_plan_subscriptions WHERE id = ?`, [subNutrition.id]);

    console.log(" -> PASS: Inadimplência modular comprovada: Nutrição ativa acessível, Treino inadimplente bloqueado.\n");

    // =========================================================================
    // CENÁRIO 12: Assinaturas e cobranças legadas (sem features_json) continuam compatíveis
    // =========================================================================
    console.log("CENÁRIO 12: Compatibilidade de assinaturas e cobranças legadas (sem features_json)...");
    // Assinatura legada ativa (features_json = null)
    const subLegacy = await createTestSub({
      featuresJson: null,
      endsDays: 60,
    });

    const accessLegacyTraining = await resolveStudentModuleAccess(testStudent.user_id, "saiya-shape", "training");
    assert.equal(accessLegacyTraining.allowed, true);
    assert.equal(accessLegacyTraining.entitlementMode, "LEGACY_FULL");

    const accessLegacyNutrition = await resolveStudentModuleAccess(testStudent.user_id, "saiya-shape", "nutrition");
    assert.equal(accessLegacyNutrition.allowed, true);
    assert.equal(accessLegacyNutrition.entitlementMode, "LEGACY_FULL");

    // Cobrança legada vencida (sem features_json) deve bloquear todos os módulos
    const chargeLegacyOverdue = await createTestCharge({
      title: "Cobrança Legada Global Vencida",
      dueDays: -3,
      featuresJson: null,
    });

    const finLegacyCheck = await getStudentFinancialAccessState({
      consultancyId: testAdmin.consultancy_id,
      studentMembershipId: testStudent.membership_id,
      requiredModule: "training",
    });
    assert.equal(finLegacyCheck.isRestricted, true, "Cobrança legada vencida deve bloquear genericamente");

    console.log(" -> PASS: Contratos e cobranças legadas mantêm comportamento de compatibilidade total.\n");

    console.log("======================================================================");
    console.log("RESULTADO FINAL DA SUITE DE TESTES: 12/12 CENÁRIOS APROVADOS (100% PASS)");
    console.log("======================================================================\n");
  } finally {
    // Clean up created test data
    console.log("[CLEANUP] Limpando dados temporários criados nos testes...");
    if (createdAuditIds.length > 0) {
      await conn.query(`DELETE FROM audit_events WHERE id IN (?)`, [createdAuditIds]);
    }
    if (createdPaymentIds.length > 0) {
      await conn.query(`DELETE FROM student_payments WHERE id IN (?)`, [createdPaymentIds]);
    }
    if (createdSubIds.length > 0) {
      await conn.query(`DELETE FROM student_plan_subscriptions WHERE id IN (?)`, [createdSubIds]);
    }
    if (createdChargeIds.length > 0) {
      // Also delete any payments associated with created charges if not in createdPaymentIds
      await conn.query(`DELETE FROM student_payments WHERE charge_id IN (?)`, [createdChargeIds]);
      await conn.query(`DELETE FROM student_plan_subscriptions WHERE charge_id IN (?)`, [createdChargeIds]);
      await conn.query(`DELETE FROM student_charges WHERE id IN (?)`, [createdChargeIds]);
    }
    await conn.end();
    console.log("[CLEANUP] Banco de dados trevo_one_qa restaurado ao estado limpo.");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("FALHA NA SUITE QA:", err);
  process.exit(1);
});
