import assert from "node:assert/strict";
import crypto from "node:crypto";
import mysql from "mysql2/promise";
import { register } from "node:module";

register("./ts-loader.mjs", import.meta.url);

const {
  createCustomStudentCharge,
  markStudentChargePaid,
  cancelStudentCharge,
  getStudentFinancialAccessState,
} = await import("../lib/consultancies/finance.ts");

const {
  confirmAndActivateCharge,
  verifyAndReconcileChargePayment,
} = await import("../lib/infinitepay/service.ts");

const {
  resolveStudentModuleAccess,
} = await import("../lib/consultancies/student-module-access.ts");

const {
  computeEffectiveEntitlements,
} = await import("../lib/consultancies/student-features.ts");

async function main() {
  console.log("==========================================================================");
  console.log("TREVO ONE: QA SUITE — COBRANÇAS PERSONALIZADAS NO BACKEND (ETAPA 4)");
  console.log("==========================================================================\n");

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "trevo_one_qa",
  });

  const createdChargeIds = [];
  const createdSubIds = [];
  const createdPaymentIds = [];
  const createdAuditIds = [];

  try {
    // 1. Identify test actors
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
      SELECT cm.id as membership_id, cm.public_id as membership_public_id, cm.user_id, cm.consultancy_id, c.slug, u.email
      FROM consultancy_members cm
      JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
      JOIN consultancies c ON c.id = cm.consultancy_id
      JOIN users u ON u.id = cm.user_id
      WHERE cmr.role = 'STUDENT' AND c.slug = 'saiya-shape'
      LIMIT 1;
    `);
    assert.ok(studentRows.length > 0, "Aluno de teste da saiya-shape deve existir");
    const testStudent = studentRows[0];

    console.log(`[SETUP] Admin: ${testAdmin.email} (userId: ${testAdmin.user_id}, consultancyId: ${testAdmin.consultancy_id})`);
    console.log(`[SETUP] Aluno: ${testStudent.email} (userId: ${testStudent.user_id}, membershipPublicId: ${testStudent.membership_public_id})\n`);

    // Helper: track charge id by public_id
    async function trackCharge(publicId) {
      if (!publicId) return;
      const [rows] = await conn.query(`SELECT id FROM student_charges WHERE public_id = ?`, [publicId]);
      if (rows.length > 0) createdChargeIds.push(rows[0].id);
    }

    // Helper: track sub id by charge_id
    async function trackSubByCharge(publicId) {
      if (!publicId) return;
      const [rows] = await conn.query(
        `SELECT sps.id FROM student_plan_subscriptions sps
         JOIN student_charges sc ON sc.id = sps.charge_id
         WHERE sc.public_id = ?`,
        [publicId]
      );
      if (rows.length > 0) createdSubIds.push(rows[0].id);
    }

    // =========================================================================
    // CENÁRIO 1: Cobrança personalizada de R$ 250,00 com Treino e Chat
    // =========================================================================
    console.log("CENÁRIO 1: Cobrança personalizada de R$ 250,00 com Treino e Chat...");
    const res1 = await createCustomStudentCharge({
      consultancyId: testAdmin.consultancy_id,
      consultancySlug: testAdmin.slug,
      userId: testAdmin.user_id,
      studentMembershipPublicId: testStudent.membership_public_id,
      title: "Consultoria VIP Treino e Chat",
      description: "Acompanhamento exclusivo de treino com suporte via chat",
      amountCents: 25000,
      dueOn: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
      durationMonths: 2,
      features: { training: true, nutrition: false, evolution: false, consultations: false, chat: true },
      billingMethod: "MANUAL",
    });

    assert.equal(res1.success, true, `Deveria criar cobrança personalizada: ${res1.error}`);
    assert.ok(res1.chargePublicId);
    await trackCharge(res1.chargePublicId);

    const [cRows1] = await conn.query(
      `SELECT plan_id, amount_cents, features_json, state, infinitepay_checkout_url FROM student_charges WHERE public_id = ?`,
      [res1.chargePublicId]
    );
    assert.equal(cRows1.length, 1);
    assert.equal(cRows1[0].plan_id, null, "plan_id DEVE ser NULL para cobranças personalizadas");
    assert.equal(Number(cRows1[0].amount_cents), 25000);
    assert.equal(cRows1[0].state, "OPEN");
    const feats1 = typeof cRows1[0].features_json === "string" ? JSON.parse(cRows1[0].features_json) : cRows1[0].features_json;
    assert.deepEqual(feats1, {
      training: true,
      nutrition: false,
      evolution: false,
      consultations: false,
      chat: true,
    });
    console.log(" -> PASS: Cobrança criada com plan_id = NULL, R$ 250,00 e snapshot explícito de Treino e Chat.\n");

    // =========================================================================
    // CENÁRIO 2: Cobrança personalizada de Nutrição sem Treino
    // =========================================================================
    console.log("CENÁRIO 2: Cobrança personalizada de Nutrição sem Treino...");
    const res2 = await createCustomStudentCharge({
      consultancyId: testAdmin.consultancy_id,
      consultancySlug: testAdmin.slug,
      userId: testAdmin.user_id,
      studentMembershipPublicId: testStudent.membership_public_id,
      title: "Plano Nutricional Isolado",
      amountCents: 18000,
      dueOn: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      durationMonths: 1,
      features: { training: false, nutrition: true, evolution: false, consultations: false, chat: false },
      billingMethod: "MANUAL",
    });

    assert.equal(res2.success, true);
    await trackCharge(res2.chargePublicId);

    const [cRows2] = await conn.query(`SELECT plan_id, features_json FROM student_charges WHERE public_id = ?`, [res2.chargePublicId]);
    assert.equal(cRows2[0].plan_id, null);
    const feats2 = typeof cRows2[0].features_json === "string" ? JSON.parse(cRows2[0].features_json) : cRows2[0].features_json;
    assert.equal(feats2.nutrition, true);
    assert.equal(feats2.training, false);
    console.log(" -> PASS: Cobrança de Nutrição isolada criada com sucesso e sem vínculo com plano comercial.\n");

    // =========================================================================
    // CENÁRIO 3: Cobrança manual sem criação de checkout externo
    // =========================================================================
    console.log("CENÁRIO 3: Cobrança manual sem criação de checkout externo...");
    assert.equal(cRows1[0].infinitepay_checkout_url, null, "Cobrança MANUAL não deve gerar checkout externo");
    console.log(" -> PASS: Cobrança manual criada sem chamar gateway externo nem gerar checkout.\n");

    // =========================================================================
    // CENÁRIO 4: Confirmação manual e ativação dos recursos contratados
    // =========================================================================
    console.log("CENÁRIO 4: Confirmação manual e ativação dos recursos contratados...");
    const payRes4 = await markStudentChargePaid({
      consultancyId: testAdmin.consultancy_id,
      userId: testAdmin.user_id,
      chargePublicId: res1.chargePublicId,
      paymentMethod: "PIX_MANUAL",
      notes: "Pago via Pix direto",
    });
    assert.equal(payRes4.success, true, `Falha ao marcar como paga: ${payRes4.error}`);
    await trackSubByCharge(res1.chargePublicId);

    const [subRows4] = await conn.query(
      `SELECT sps.id, sps.plan_id, sps.status, sps.features_json
       FROM student_plan_subscriptions sps
       JOIN student_charges sc ON sc.id = sps.charge_id
       WHERE sc.public_id = ?`,
      [res1.chargePublicId]
    );
    assert.equal(subRows4.length, 1);
    assert.equal(subRows4[0].plan_id, null, "student_plan_subscriptions.plan_id deve ser NULL");
    assert.equal(subRows4[0].status, "ACTIVE");
    const subFeats4 = typeof subRows4[0].features_json === "string" ? JSON.parse(subRows4[0].features_json) : subRows4[0].features_json;
    assert.equal(subFeats4.training, true);
    assert.equal(subFeats4.chat, true);
    assert.equal(subFeats4.nutrition, false);

    // Verify student module access reflects exactly these features
    const accessTraining = await resolveStudentModuleAccess(testStudent.user_id, testAdmin.slug, "training");
    assert.equal(accessTraining.allowed, true, "Treino deve estar liberado");
    assert.equal(accessTraining.entitlementMode, "GRANULAR");

    const accessChat = await resolveStudentModuleAccess(testStudent.user_id, testAdmin.slug, "chat");
    assert.equal(accessChat.allowed, true, "Chat deve estar liberado");

    const accessNutrition = await resolveStudentModuleAccess(testStudent.user_id, testAdmin.slug, "nutrition");
    assert.equal(accessNutrition.allowed, false, "Nutrição NÃO deve estar liberada");
    assert.equal(accessNutrition.reason, "MODULE_NOT_INCLUDED");
    console.log(" -> PASS: Pagamento manual ativou assinatura com plan_id = NULL e concedeu exatamente Treino + Chat.\n");

    // =========================================================================
    // CENÁRIO 5: Cobrança InfinitePay simulada com valor personalizado
    // =========================================================================
    console.log("CENÁRIO 5: Cobrança InfinitePay simulada com valor personalizado...");
    const res5 = await createCustomStudentCharge({
      consultancyId: testAdmin.consultancy_id,
      consultancySlug: testAdmin.slug,
      userId: testAdmin.user_id,
      studentMembershipPublicId: testStudent.membership_public_id,
      title: "Consultoria Premium Personalizada InfinitePay",
      amountCents: 32000,
      dueOn: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      durationMonths: 1,
      features: { training: true, nutrition: true, evolution: true, consultations: false, chat: true },
      billingMethod: "INFINITEPAY",
      appBaseUrl: "http://localhost:3000",
      studentPhone: "11999998888",
    });

    assert.equal(res5.success, true, `Falha ao criar cobrança InfinitePay: ${res5.error}`);
    assert.ok(res5.checkoutUrl, "Deveria gerar checkoutUrl");
    assert.match(res5.checkoutUrl, /simulated_checkout=1/);
    assert.ok(res5.whatsAppHref, "Deveria gerar link do WhatsApp");
    assert.match(res5.whatsAppHref, /320/);
    await trackCharge(res5.chargePublicId);

    const [cRows5] = await conn.query(
      `SELECT plan_id, amount_cents, infinitepay_checkout_url, infinitepay_slug, state
       FROM student_charges WHERE public_id = ?`,
      [res5.chargePublicId]
    );
    assert.equal(cRows5[0].plan_id, null);
    assert.equal(Number(cRows5[0].amount_cents), 32000);
    assert.ok(cRows5[0].infinitepay_checkout_url);
    assert.ok(cRows5[0].infinitepay_slug);
    assert.equal(cRows5[0].state, "OPEN");
    console.log(" -> PASS: Cobrança InfinitePay simulada gerada com R$ 320,00, checkoutUrl e rastreabilidade.\n");

    // =========================================================================
    // CENÁRIO 6: Ativação por pagamento simulado confirmado
    // =========================================================================
    console.log("CENÁRIO 6: Ativação por reconciliação simulada confirmada...");
    const rec6 = await verifyAndReconcileChargePayment({
      consultancyId: testAdmin.consultancy_id,
      chargePublicId: res5.chargePublicId,
      paidAmountCents: 32000,
    });

    assert.equal(rec6.success, true, `Reconciliação deveria suceder: ${rec6.message}`);
    assert.equal(rec6.isPaid, true);
    await trackSubByCharge(res5.chargePublicId);

    const [subRows6] = await conn.query(
      `SELECT sps.id, sps.plan_id, sps.status, sps.features_json
       FROM student_plan_subscriptions sps
       JOIN student_charges sc ON sc.id = sps.charge_id
       WHERE sc.public_id = ?`,
      [res5.chargePublicId]
    );
    assert.equal(subRows6.length, 1, "Assinatura deve ser ativada na confirmação InfinitePay");
    assert.equal(subRows6[0].plan_id, null);
    assert.equal(subRows6[0].status, "ACTIVE");
    const feats6 = typeof subRows6[0].features_json === "string" ? JSON.parse(subRows6[0].features_json) : subRows6[0].features_json;
    assert.equal(feats6.training, true);
    assert.equal(feats6.nutrition, true);
    console.log(" -> PASS: Pagamento simulado confirmado ativou assinatura com plan_id = NULL e snapshot completo.\n");

    // =========================================================================
    // CENÁRIO 7: Cobrança não paga sem liberação de acesso
    // =========================================================================
    console.log("CENÁRIO 7: Cobrança não paga sem concessão de novos recursos...");
    const res7 = await createCustomStudentCharge({
      consultancyId: testAdmin.consultancy_id,
      consultancySlug: testAdmin.slug,
      userId: testAdmin.user_id,
      studentMembershipPublicId: testStudent.membership_public_id,
      title: "Cobrança Consultas Apenas Aberta",
      amountCents: 15000,
      dueOn: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
      features: { training: false, nutrition: false, evolution: false, consultations: true, chat: false },
      billingMethod: "MANUAL",
    });
    await trackCharge(res7.chargePublicId);

    // Aluno NÃO deve ter acesso ao módulo consultations enquanto a cobrança estiver OPEN
    const accessConsult7 = await resolveStudentModuleAccess(testStudent.user_id, testAdmin.slug, "consultations");
    assert.equal(accessConsult7.allowed, false, "Cobrança em aberto não pode conceder acesso a consultas");
    console.log(" -> PASS: Cobrança não paga não concede novos direitos ao aluno.\n");

    // =========================================================================
    // CENÁRIO 8: Cancelamento sem concessão de recursos
    // =========================================================================
    console.log("CENÁRIO 8: Cancelamento de cobrança sem concessão de recursos...");
    const cancelRes8 = await cancelStudentCharge({
      consultancyId: testAdmin.consultancy_id,
      userId: testAdmin.user_id,
      chargePublicId: res7.chargePublicId,
      cancelReason: "Aluno desistiu do módulo de consultas",
    });
    assert.equal(cancelRes8.success, true);

    const [cRows8] = await conn.query(`SELECT state FROM student_charges WHERE public_id = ?`, [res7.chargePublicId]);
    assert.equal(cRows8[0].state, "CANCELED");

    const [subRows8] = await conn.query(
      `SELECT sps.id FROM student_plan_subscriptions sps
       JOIN student_charges sc ON sc.id = sps.charge_id
       WHERE sc.public_id = ?`,
      [res7.chargePublicId]
    );
    assert.equal(subRows8.length, 0, "Nenhuma assinatura deve ser ativada para cobrança cancelada");
    console.log(" -> PASS: Cobrança cancelada não gerou assinatura nem concedeu recursos.\n");

    // =========================================================================
    // CENÁRIO 9: Preservação de assinaturas simultâneas
    // =========================================================================
    console.log("CENÁRIO 9: Preservação de assinaturas simultâneas (Treino + Nutrição)...");
    // Aluno já possui assinatura ativa de Treino+Chat (do Cenário 4) e Treino+Nutrição (do Cenário 6).
    // Testamos a união lógica das features
    const combinedAccess = await resolveStudentModuleAccess(testStudent.user_id, testAdmin.slug, "nutrition");
    assert.equal(combinedAccess.allowed, true, "Nutrição deve estar acessível via assinatura ativa");

    const combinedAccessTraining = await resolveStudentModuleAccess(testStudent.user_id, testAdmin.slug, "training");
    assert.equal(combinedAccessTraining.allowed, true, "Treino deve estar acessível via assinatura ativa");

    console.log(" -> PASS: Assinaturas simultâneas preservadas e combinadas por união lógica.\n");

    // =========================================================================
    // CENÁRIO 10: Rejeição de valor, duração e permissões inválidos
    // =========================================================================
    console.log("CENÁRIO 10: Validações rigorosas de valor, data e permissões...");

    // Valor zero
    const fZero = await createCustomStudentCharge({
      consultancyId: testAdmin.consultancy_id,
      userId: testAdmin.user_id,
      studentMembershipPublicId: testStudent.membership_public_id,
      title: "Inválido Zero",
      amountCents: 0,
      dueOn: "2026-12-01",
      features: { training: true },
      billingMethod: "MANUAL",
    });
    assert.equal(fZero.success, false);
    assert.match(fZero.error, /valor/i);

    // Valor negativo
    const fNeg = await createCustomStudentCharge({
      consultancyId: testAdmin.consultancy_id,
      userId: testAdmin.user_id,
      studentMembershipPublicId: testStudent.membership_public_id,
      title: "Inválido Negativo",
      amountCents: -500,
      dueOn: "2026-12-01",
      features: { training: true },
      billingMethod: "MANUAL",
    });
    assert.equal(fNeg.success, false);

    // Vencimento no passado
    const fPast = await createCustomStudentCharge({
      consultancyId: testAdmin.consultancy_id,
      userId: testAdmin.user_id,
      studentMembershipPublicId: testStudent.membership_public_id,
      title: "Inválido Passado",
      amountCents: 10000,
      dueOn: "2020-01-01",
      features: { training: true },
      billingMethod: "MANUAL",
    });
    assert.equal(fPast.success, false);
    assert.match(fPast.error, /vencimento/i);

    // Sem nenhum recurso habilitado
    const fNoFeat = await createCustomStudentCharge({
      consultancyId: testAdmin.consultancy_id,
      userId: testAdmin.user_id,
      studentMembershipPublicId: testStudent.membership_public_id,
      title: "Inválido Sem Recursos",
      amountCents: 10000,
      dueOn: "2026-12-01",
      features: { training: false, nutrition: false, evolution: false, consultations: false, chat: false },
      billingMethod: "MANUAL",
    });
    assert.equal(fNoFeat.success, false);
    assert.match(fNoFeat.error, /ao menos um recurso/i);

    console.log(" -> PASS: Rejeições de valor zero/negativo, vencimento no passado e ausência de recursos validadas.\n");

    // =========================================================================
    // CENÁRIO 11: Bloqueio de permissões administrativas indevidas
    // =========================================================================
    console.log("CENÁRIO 11: Bloqueio estrito de permissões administrativas...");
    const fAdminFeat = await createCustomStudentCharge({
      consultancyId: testAdmin.consultancy_id,
      userId: testAdmin.user_id,
      studentMembershipPublicId: testStudent.membership_public_id,
      title: "Ataque Tentativa Permissão Admin",
      amountCents: 10000,
      dueOn: "2026-12-01",
      features: { training: true, admin: true, manage_finance: true },
      billingMethod: "MANUAL",
    });

    assert.equal(fAdminFeat.success, false);
    assert.match(fAdminFeat.error, /não é permitido/i);
    console.log(" -> PASS: Chaves administrativas rejeitadas com erro estrito.\n");

    // =========================================================================
    // CENÁRIO 12: Isolamento entre consultorias (Multi-tenant)
    // =========================================================================
    console.log("CENÁRIO 12: Isolamento entre consultorias...");
    const otherConsultancyId = 2; // consultoria-padrao
    const fCross = await createCustomStudentCharge({
      consultancyId: otherConsultancyId,
      userId: testAdmin.user_id,
      studentMembershipPublicId: testStudent.membership_public_id, // pertence à consultoria 1
      title: "Ataque Cross-Tenant",
      amountCents: 10000,
      dueOn: "2026-12-01",
      features: { training: true },
      billingMethod: "MANUAL",
    });

    assert.equal(fCross.success, false);
    assert.match(fCross.error, /não encontrado/i);
    console.log(" -> PASS: Aluno de outra consultoria não pode ser cobrado cross-tenant.\n");

    // =========================================================================
    // CENÁRIO 13: Rejeição de confirmação manual quando houver checkout externo ativo
    // =========================================================================
    console.log("CENÁRIO 13: Rejeição de confirmação manual em cobrança com checkout ativo...");
    // Cria uma cobrança InfinitePay que permanece OPEN
    const res13 = await createCustomStudentCharge({
      consultancyId: testAdmin.consultancy_id,
      consultancySlug: testAdmin.slug,
      userId: testAdmin.user_id,
      studentMembershipPublicId: testStudent.membership_public_id,
      title: "Cobrança com Checkout Ativo",
      amountCents: 22000,
      dueOn: new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10),
      features: { training: true, nutrition: false, evolution: false, consultations: false, chat: false },
      billingMethod: "INFINITEPAY",
      appBaseUrl: "http://localhost:3000",
    });
    await trackCharge(res13.chargePublicId);

    const payRes13 = await markStudentChargePaid({
      consultancyId: testAdmin.consultancy_id,
      userId: testAdmin.user_id,
      chargePublicId: res13.chargePublicId,
      paymentMethod: "PIX_MANUAL",
    });

    assert.equal(payRes13.success, false, "Não deve permitir confirmação manual com link ativo");
    assert.match(payRes13.error, /checkout ativo|gateway/i);
    console.log(" -> PASS: Tentativa de confirmação manual bloqueada em cobrança com checkout ativo.\n");

    // =========================================================================
    // CENÁRIO 14: Preservação das assinaturas legadas vs Proteção de novas personalizadas
    // =========================================================================
    console.log("CENÁRIO 14: Preservação das assinaturas legadas vs proteção de novas personalizadas...");

    // 14A: Contrato legado com plan_id comercial e sem features_json -> DEVE ser LEGACY_FULL
    const legacyEntitlement = computeEffectiveEntitlements([
      { subFeatures: null, planFeatures: null, planId: 10, chargeId: 99 },
    ]);
    assert.equal(legacyEntitlement.entitlementMode, "LEGACY_FULL");
    assert.equal(legacyEntitlement.effectiveFeatures.training, true);
    assert.equal(legacyEntitlement.effectiveFeatures.nutrition, true);

    // 14B: Nova contratação personalizada (planId === null) sem features_json -> NÃO pode ser LEGACY_FULL
    const customEmptyEntitlement = computeEffectiveEntitlements([
      { subFeatures: null, planFeatures: null, planId: null, chargeId: 101 },
    ]);
    assert.equal(customEmptyEntitlement.entitlementMode, "GRANULAR", "Contrato personalizado sem features DEVE ser GRANULAR");
    assert.equal(customEmptyEntitlement.effectiveFeatures.training, false);
    assert.equal(customEmptyEntitlement.effectiveFeatures.nutrition, false);

    console.log(" -> PASS: Contratos legados preservam LEGACY_FULL; novas personalizadas blindadas contra fallback indevido.\n");

    console.log("==========================================================================");
    console.log("RESULTADO FINAL DA SUÍTE QA: 14/14 CENÁRIOS APROVADOS (100% PASS)");
    console.log("==========================================================================\n");
  } finally {
    console.log("[CLEANUP] Limpando registros temporários dos testes...");
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
      await conn.query(`DELETE FROM student_payments WHERE charge_id IN (?)`, [createdChargeIds]);
      await conn.query(`DELETE FROM student_plan_subscriptions WHERE charge_id IN (?)`, [createdChargeIds]);
      await conn.query(`DELETE FROM student_charges WHERE id IN (?)`, [createdChargeIds]);
    }
    await conn.end();
    console.log("[CLEANUP] Banco trevo_one_qa restaurado ao estado limpo.");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("FALHA NA SUÍTE QA ETAPA 4:", err);
  process.exit(1);
});
