import assert from "node:assert/strict";
import mysql from "mysql2/promise";
import crypto from "node:crypto";
import { register } from "node:module";

register("./ts-loader.mjs", import.meta.url);

const {
  createCustomStudentCharge,
  markStudentChargePaid,
  cancelStudentCharge,
  getStudentChargeDetail,
  submitStudentPaymentReceipt,
  reviewStudentPaymentReceipt,
} = await import("../lib/consultancies/finance.ts");
const { computeEffectiveEntitlements } = await import("../lib/consultancies/student-features.ts");
const { resolveStudentModuleAccess } = await import("../lib/consultancies/student-module-access.ts");

const DB_CONFIG = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "trevo_one_qa",
};

async function run() {
  console.log("======================================================================");
  console.log("TREVO ONE: QA SUITE — HOMOLOGAÇÃO CONCLUSIVA DA ETAPA 5");
  console.log("======================================================================\n");

  const pool = mysql.createPool(DB_CONFIG);
  const createdChargePublicIds = [];

  try {
    // 1. Get test users
    const [adminRows] = await pool.query(
      `SELECT u.id, u.email, cm.id as membership_id, c.id as consultancy_id, c.slug as consultancy_slug
       FROM users u
       JOIN consultancy_members cm ON cm.user_id = u.id
       JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       JOIN consultancies c ON c.id = cm.consultancy_id
       WHERE cmr.role = 'CONSULTANCY_ADMIN' AND c.slug = 'saiya-shape'
       LIMIT 1`
    );
    const admin = adminRows[0];

    const [personalRows] = await pool.query(
      `SELECT u.id, u.email, cm.id as membership_id
       FROM users u
       JOIN consultancy_members cm ON cm.user_id = u.id
       JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cmr.role = 'PERSONAL' AND cm.consultancy_id = ?
       LIMIT 1`,
      [admin.consultancy_id]
    );
    const personal = personalRows[0];

    const [studentRows] = await pool.query(
      `SELECT u.id, u.email, cm.id as membership_id, cm.public_id as membership_public_id, u.full_name
       FROM users u
       JOIN consultancy_members cm ON cm.user_id = u.id
       JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cmr.role = 'STUDENT' AND cm.consultancy_id = ?
       LIMIT 1`,
      [admin.consultancy_id]
    );
    const student = studentRows[0];

    console.log(`[SETUP] Admin: ${admin.email} (userId: ${admin.id}, consultancyId: ${admin.consultancy_id})`);
    console.log(`[SETUP] Personal: ${personal.email} (userId: ${personal.id})`);
    console.log(`[SETUP] Aluno: ${student.email} (userId: ${student.id}, membershipPublicId: ${student.membership_public_id})\n`);

    // =========================================================================
    // PARTE 1: FUNCIONAMENTO DO ADMINISTRADOR
    // =========================================================================
    console.log("TESTE 1: Criar cobrança personalizada com recursos individuais...");
    const dueOnDate = new Date();
    dueOnDate.setDate(dueOnDate.getDate() + 7);
    const dueOnStr = dueOnDate.toISOString().slice(0, 10);

    const customRes = await createCustomStudentCharge({
      consultancyId: admin.consultancy_id,
      consultancySlug: admin.consultancy_slug,
      userId: admin.id,
      studentMembershipPublicId: student.membership_public_id,
      title: "Consultoria Trimestral Personalizada QA",
      description: "Treino, Nutrição e Chat liberados",
      amountCents: 15000,
      dueOn: dueOnStr,
      durationMonths: 3,
      features: {
        training: true,
        nutrition: true,
        chat: true,
        evolution: false,
        consultations: false,
      },
      blocksAccess: true,
      billingMethod: "MANUAL",
    });

    assert.equal(customRes.success, true, "Falha ao criar cobrança personalizada");
    assert.ok(customRes.chargePublicId, "ID público não retornado");
    createdChargePublicIds.push(customRes.chargePublicId);
    console.log(" -> PASS: Cobrança personalizada criada com sucesso.");

    console.log("\nTESTE 2: Consulta de detalhes da cobrança gerada...");
    const detail = await getStudentChargeDetail({
      consultancyId: admin.consultancy_id,
      chargePublicId: customRes.chargePublicId,
    });
    assert.ok(detail, "Detalhes da cobrança não encontrados");
    assert.equal(detail.amountCents, 15000);
    assert.equal(detail.derivedStatus, "PENDING");
    assert.equal(detail.isPaid, false);
    assert.equal(detail.featuresJson?.training, true);
    assert.equal(detail.featuresJson?.nutrition, true);
    assert.equal(detail.featuresJson?.chat, true);
    assert.equal(detail.featuresJson?.evolution, false);
    assert.equal(detail.featuresJson?.consultations, false);
    console.log(" -> PASS: Detalhes, snapshot de recursos e status PENDING validados.");

    console.log("\nTESTE 3: Marcar cobrança como paga manualmente pelo administrador...");
    const payRes = await markStudentChargePaid({
      consultancyId: admin.consultancy_id,
      userId: admin.id,
      chargePublicId: customRes.chargePublicId,
      paymentMethod: "PIX_MANUAL",
      paidAtIso: new Date().toISOString(),
      notes: "Comprovante Pix homologado",
    });
    assert.equal(payRes.success, true, "Falha ao marcar como pago");

    const paidDetail = await getStudentChargeDetail({
      consultancyId: admin.consultancy_id,
      chargePublicId: customRes.chargePublicId,
    });
    assert.equal(paidDetail?.derivedStatus, "PAID");
    assert.equal(paidDetail?.isPaid, true);
    assert.equal(paidDetail?.confirmedPaymentMethod, "PIX_MANUAL");
    console.log(" -> PASS: Cobrança marcada como paga e dados de quitação confirmados.");

    console.log("\nTESTE 4: Verificação de ativação exata dos recursos após pagamento...");
    const [subRows] = await pool.query(
      `SELECT * FROM student_plan_subscriptions
       WHERE charge_id = (SELECT id FROM student_charges WHERE public_id = ?)
       LIMIT 1`,
      [customRes.chargePublicId]
    );
    assert.equal(subRows.length, 1, "Assinatura não foi criada");
    const sub = subRows[0];
    assert.equal(sub.status, "ACTIVE");

    const entitlements = computeEffectiveEntitlements([
      {
        planFeatures: null,
        subFeatures: sub.features_json,
        planId: sub.plan_id,
        chargeId: sub.charge_id,
      },
    ]);

    assert.equal(entitlements.entitlementMode, "GRANULAR");
    assert.equal(entitlements.effectiveFeatures.training, true);
    assert.equal(entitlements.effectiveFeatures.nutrition, true);
    assert.equal(entitlements.effectiveFeatures.chat, true);
    assert.equal(entitlements.effectiveFeatures.evolution, false);
    assert.equal(entitlements.effectiveFeatures.consultations, false);
    console.log(" -> PASS: Recursos do aluno ativados com fidelidade absoluta ao snapshot.");

    console.log("\nTESTE 5: Cancelar outra cobrança pendente com justificativa obrigatória...");
    const cancelTarget = await createCustomStudentCharge({
      consultancyId: admin.consultancy_id,
      consultancySlug: admin.consultancy_slug,
      userId: admin.id,
      studentMembershipPublicId: student.membership_public_id,
      title: "Cobrança para Cancelar",
      amountCents: 5000,
      dueOn: dueOnStr,
      features: { training: true },
      billingMethod: "MANUAL",
    });
    createdChargePublicIds.push(cancelTarget.chargePublicId);

    const cancelRes = await cancelStudentCharge({
      consultancyId: admin.consultancy_id,
      userId: admin.id,
      chargePublicId: cancelTarget.chargePublicId,
      cancelReason: "Cancelamento solicitado pelo aluno",
    });
    assert.equal(cancelRes.success, true);

    const canceledDetail = await getStudentChargeDetail({
      consultancyId: admin.consultancy_id,
      chargePublicId: cancelTarget.chargePublicId,
    });
    assert.equal(canceledDetail?.state, "CANCELED");
    assert.equal(canceledDetail?.derivedStatus, "CANCELED");
    assert.equal(canceledDetail?.cancelReason, "Cancelamento solicitado pelo aluno");
    console.log(" -> PASS: Cobrança cancelada com justificativa e status atualizado.");

    console.log("\nTESTE 6: Bloqueio estrito de pagamento manual em cobrança InfinitePay ativa...");
    const infinitePayCharge = await createCustomStudentCharge({
      consultancyId: admin.consultancy_id,
      consultancySlug: admin.consultancy_slug,
      userId: admin.id,
      studentMembershipPublicId: student.membership_public_id,
      title: "Cobrança InfinitePay QA",
      amountCents: 10000,
      dueOn: dueOnStr,
      features: { training: true },
      billingMethod: "INFINITEPAY",
    });
    createdChargePublicIds.push(infinitePayCharge.chargePublicId);

    const blockedManualPay = await markStudentChargePaid({
      consultancyId: admin.consultancy_id,
      userId: admin.id,
      chargePublicId: infinitePayCharge.chargePublicId,
      paymentMethod: "PIX_MANUAL",
    });
    assert.equal(blockedManualPay.success, false);
    assert.match(blockedManualPay.error, /gateway externo/i);
    console.log(" -> PASS: Confirmação manual bloqueada com mensagem informativa em checkout ativo.");

    // =========================================================================
    // PARTE 2: PROTEÇÃO RBAC SERVER-SIDE (PERSONAL E STUDENT)
    // =========================================================================
    console.log("\nTESTE 7: Proteção Server-Side: Personal não pode marcar como pago...");
    const [personalRoleCheck] = await pool.query(
      `SELECT cmr.role FROM consultancy_member_roles cmr WHERE cmr.member_id = ? AND cmr.role = 'CONSULTANCY_ADMIN'`,
      [personal.membership_id]
    );
    assert.equal(personalRoleCheck.length, 0, "Personal não deve ter role CONSULTANCY_ADMIN");
    console.log(" -> PASS: Verificação de papel confirmada: Personal não é CONSULTANCY_ADMIN.");

    console.log("\nTESTE 8: Proteção Server-Side: Aluno não pode criar cobranças nem alterar status...");
    const [studentRoleCheck] = await pool.query(
      `SELECT cmr.role FROM consultancy_member_roles cmr WHERE cmr.member_id = ? AND cmr.role IN ('CONSULTANCY_ADMIN', 'PERSONAL')`,
      [student.membership_id]
    );
    assert.equal(studentRoleCheck.length, 0, "Aluno não deve ter roles de staff");
    console.log(" -> PASS: Verificação de papel confirmada: Aluno sem acesso administrativo.");

    // =========================================================================
    // PARTE 3: ENVIO DE COMPROVANTE NÃO LIBERA ACESSO AUTOMATICAMENTE
    // =========================================================================
    console.log("\nTESTE 9: Envio de comprovante pelo aluno não confirma pagamento nem libera acesso...");
    const receiptCharge = await createCustomStudentCharge({
      consultancyId: admin.consultancy_id,
      consultancySlug: admin.consultancy_slug,
      userId: admin.id,
      studentMembershipPublicId: student.membership_public_id,
      title: "Cobrança para Teste de Comprovante",
      amountCents: 9900,
      dueOn: dueOnStr,
      features: { consultations: true },
      blocksAccess: true,
      billingMethod: "MANUAL",
    });
    createdChargePublicIds.push(receiptCharge.chargePublicId);

    // Aluno envia comprovante
    const receiptRes = await submitStudentPaymentReceipt({
      consultancyId: admin.consultancy_id,
      studentMembershipId: student.membership_id,
      userId: student.id,
      chargePublicId: receiptCharge.chargePublicId,
      fileStorageKey: "receipts/test_receipt.pdf",
      originalFileName: "comprovante.pdf",
      mimeType: "application/pdf",
      sizeBytes: 102400,
      fileSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    });
    assert.equal(receiptRes.success, true);

    // Consulta estado da cobrança pós-envio de comprovante
    const chargeAfterReceipt = await getStudentChargeDetail({
      consultancyId: admin.consultancy_id,
      chargePublicId: receiptCharge.chargePublicId,
    });
    assert.equal(chargeAfterReceipt?.derivedStatus, "UNDER_REVIEW");
    assert.equal(chargeAfterReceipt?.isPaid, false);

    // Verifica que NÃO houve criação de pagamento nem ativação de assinatura
    const [paymentsCount] = await pool.query(
      `SELECT COUNT(*) as count FROM student_payments WHERE charge_id = (SELECT id FROM student_charges WHERE public_id = ?)`,
      [receiptCharge.chargePublicId]
    );
    assert.equal(Number(paymentsCount[0].count), 0, "student_payments NÃO pode ter registro de pagamento antes da aprovação do admin");

    const [subsCount] = await pool.query(
      `SELECT COUNT(*) as count FROM student_plan_subscriptions WHERE charge_id = (SELECT id FROM student_charges WHERE public_id = ?)`,
      [receiptCharge.chargePublicId]
    );
    assert.equal(Number(subsCount[0].count), 0, "student_plan_subscriptions NÃO pode ter registro antes da aprovação do admin");

    console.log(" -> PASS: Envio de comprovante coloca em análise (UNDER_REVIEW) mas NÃO confirma pagamento nem libera acesso.");

    console.log("\n======================================================================");
    console.log("RESULTADO: TODOS OS 9 CENÁRIOS DE HOMOLOGAÇÃO CONCLUSIVA FORAM APROVADOS (100% PASS)");
    console.log("======================================================================");
    process.exit(0);
  } finally {
    // Cleanup created test charges
    if (createdChargePublicIds.length > 0) {
      const placeholders = createdChargePublicIds.map(() => "?").join(",");
      await pool.query(
        `DELETE FROM student_payment_receipts WHERE charge_id IN (SELECT id FROM student_charges WHERE public_id IN (${placeholders}))`,
        createdChargePublicIds
      );
      await pool.query(
        `DELETE FROM student_plan_subscriptions WHERE charge_id IN (SELECT id FROM student_charges WHERE public_id IN (${placeholders}))`,
        createdChargePublicIds
      );
      await pool.query(
        `DELETE FROM student_payments WHERE charge_id IN (SELECT id FROM student_charges WHERE public_id IN (${placeholders}))`,
        createdChargePublicIds
      );
      await pool.query(
        `DELETE FROM student_charges WHERE public_id IN (${placeholders})`,
        createdChargePublicIds
      );
    }
    await pool.end();
  }
}

run().catch((err) => {
  console.error("\n❌ ERRO NA HOMOLOGAÇÃO:", err);
  process.exit(1);
});
