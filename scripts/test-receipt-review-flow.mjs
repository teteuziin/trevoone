import assert from "node:assert/strict";
import mysql from "mysql2/promise";
import crypto from "node:crypto";
import { register } from "node:module";

register("./ts-loader.mjs", import.meta.url);

const {
  createCustomStudentCharge,
  markStudentChargePaid,
  getStudentChargeDetail,
  submitStudentPaymentReceipt,
  approveStudentPaymentReceipt,
  rejectStudentPaymentReceipt,
} = await import("../lib/consultancies/finance.ts");
const { computeEffectiveEntitlements } = await import("../lib/consultancies/student-features.ts");

const DB_CONFIG = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "trevo_one_qa",
};

async function run() {
  console.log("======================================================================");
  console.log("TREVO ONE: QA SUITE — FLUXO ADMINISTRATIVO DE COMPROVANTES EM ANÁLISE");
  console.log("======================================================================\n");

  const pool = mysql.createPool(DB_CONFIG);
  const createdChargePublicIds = [];

  try {
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

    const [studentRows] = await pool.query(
      `SELECT u.id, u.email, cm.id as membership_id, cm.public_id as membership_public_id
       FROM users u
       JOIN consultancy_members cm ON cm.user_id = u.id
       JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cmr.role = 'STUDENT' AND cm.consultancy_id = ?
       LIMIT 1`,
      [admin.consultancy_id]
    );
    const student = studentRows[0];

    const dueOnDate = new Date();
    dueOnDate.setDate(dueOnDate.getDate() + 7);
    const dueOnStr = dueOnDate.toISOString().slice(0, 10);

    // =========================================================================
    // CENÁRIO 1: ENVIO DE COMPROVANTE E REJEIÇÃO PELO ADMINISTRADOR
    // =========================================================================
    console.log("CENÁRIO 1: Aluno envia comprovante e administrador rejeita...");
    const charge1 = await createCustomStudentCharge({
      consultancyId: admin.consultancy_id,
      consultancySlug: admin.consultancy_slug,
      userId: admin.id,
      studentMembershipPublicId: student.membership_public_id,
      title: "Cobrança QA Rejeição Comprovante",
      amountCents: 12000,
      dueOn: dueOnStr,
      features: { training: true, nutrition: true },
      billingMethod: "MANUAL",
    });
    createdChargePublicIds.push(charge1.chargePublicId);

    const receipt1Res = await submitStudentPaymentReceipt({
      consultancyId: admin.consultancy_id,
      studentMembershipId: student.membership_id,
      userId: student.id,
      chargePublicId: charge1.chargePublicId,
      fileStorageKey: "receipts/test_reject.pdf",
      originalFileName: "comprovante_ilegivel.pdf",
      mimeType: "application/pdf",
      sizeBytes: 50000,
      fileSha256: "a".repeat(64),
    });
    assert.equal(receipt1Res.success, true);
    assert.ok(receipt1Res.receiptPublicId);

    // Estado da cobrança em análise
    const detailAfterSubmit = await getStudentChargeDetail({
      consultancyId: admin.consultancy_id,
      chargePublicId: charge1.chargePublicId,
    });
    assert.equal(detailAfterSubmit?.derivedStatus, "UNDER_REVIEW");
    assert.equal(detailAfterSubmit?.isPaid, false);

    // Rejeição pelo admin com justificativa
    const rejectRes = await rejectStudentPaymentReceipt({
      consultancyId: admin.consultancy_id,
      userId: admin.id,
      receiptPublicId: receipt1Res.receiptPublicId,
      rejectionReason: "Comprovante ilegível. Favor reenviar com imagem nítida.",
    });
    assert.equal(rejectRes.success, true);

    // Verifica que NÃO houve pagamento nem ativação de assinatura
    const [p1Rows] = await pool.query(
      `SELECT COUNT(*) as count FROM student_payments WHERE charge_id = (SELECT id FROM student_charges WHERE public_id = ?)`,
      [charge1.chargePublicId]
    );
    assert.equal(Number(p1Rows[0].count), 0, "Nenhum pagamento deve existir após rejeição");

    const [s1Rows] = await pool.query(
      `SELECT COUNT(*) as count FROM student_plan_subscriptions WHERE charge_id = (SELECT id FROM student_charges WHERE public_id = ?)`,
      [charge1.chargePublicId]
    );
    assert.equal(Number(s1Rows[0].count), 0, "Nenhuma assinatura deve existir após rejeição");

    // Verifica que cobrança retornou para PENDING
    const detailAfterReject = await getStudentChargeDetail({
      consultancyId: admin.consultancy_id,
      chargePublicId: charge1.chargePublicId,
    });
    assert.equal(detailAfterReject?.derivedStatus, "PENDING");
    assert.equal(detailAfterReject?.isPaid, false);
    console.log(" -> PASS: Comprovante rejeitado com sucesso, sem pagamento e sem liberação indevida.");

    // =========================================================================
    // CENÁRIO 2: ENVIO DE COMPROVANTE E APROVAÇÃO PELO ADMINISTRADOR
    // =========================================================================
    console.log("\nCENÁRIO 2: Aluno envia novo comprovante e administrador aprova...");
    const receipt2Res = await submitStudentPaymentReceipt({
      consultancyId: admin.consultancy_id,
      studentMembershipId: student.membership_id,
      userId: student.id,
      chargePublicId: charge1.chargePublicId,
      fileStorageKey: "receipts/test_approve.pdf",
      originalFileName: "comprovante_valido.pdf",
      mimeType: "application/pdf",
      sizeBytes: 80000,
      fileSha256: "b".repeat(64),
    });
    assert.equal(receipt2Res.success, true);

    const approveRes = await approveStudentPaymentReceipt({
      consultancyId: admin.consultancy_id,
      userId: admin.id,
      receiptPublicId: receipt2Res.receiptPublicId,
    });
    assert.equal(approveRes.success, true);
    assert.ok(approveRes.paymentPublicId);

    // Verifica que student_payments foi inserido com receipt_id vinculado
    const [p2Rows] = await pool.query(
      `SELECT sp.*, spr.status as receipt_status FROM student_payments sp
       JOIN student_payment_receipts spr ON spr.id = sp.receipt_id
       WHERE sp.charge_id = (SELECT id FROM student_charges WHERE public_id = ?)`,
      [charge1.chargePublicId]
    );
    assert.equal(p2Rows.length, 1, "Exatamente 1 pagamento deve ter sido criado");
    assert.equal(p2Rows[0].payment_method, "PIX_MANUAL");
    assert.equal(p2Rows[0].receipt_status, "APPROVED");

    // Verifica que student_charges foi atualizada para PAID
    const detailAfterApprove = await getStudentChargeDetail({
      consultancyId: admin.consultancy_id,
      chargePublicId: charge1.chargePublicId,
    });
    assert.equal(detailAfterApprove?.derivedStatus, "PAID");
    assert.equal(detailAfterApprove?.isPaid, true);
    assert.equal(detailAfterApprove?.state, "PAID");

    // Verifica que a assinatura foi ativada com snapshot exato
    const [s2Rows] = await pool.query(
      `SELECT * FROM student_plan_subscriptions WHERE charge_id = (SELECT id FROM student_charges WHERE public_id = ?)`,
      [charge1.chargePublicId]
    );
    assert.equal(s2Rows.length, 1, "Assinatura deve ter sido ativada");
    assert.equal(s2Rows[0].status, "ACTIVE");

    const entitlements = computeEffectiveEntitlements([
      {
        planFeatures: null,
        subFeatures: s2Rows[0].features_json,
        planId: s2Rows[0].plan_id,
        chargeId: s2Rows[0].charge_id,
      },
    ]);
    assert.equal(entitlements.entitlementMode, "GRANULAR");
    assert.equal(entitlements.effectiveFeatures.training, true);
    assert.equal(entitlements.effectiveFeatures.nutrition, true);
    assert.equal(entitlements.effectiveFeatures.chat, false);
    console.log(" -> PASS: Comprovante aprovado, pagamento vinculado, cobrança PAID e assinatura ativada com precisão.");

    // =========================================================================
    // CENÁRIO 3: BLOQUEIO DE DUPLICIDADE (TENTATIVA DE REAPROVAÇÃO)
    // =========================================================================
    console.log("\nCENÁRIO 3: Tentativa de reaprovar comprovante já processado...");
    const reApprove = await approveStudentPaymentReceipt({
      consultancyId: admin.consultancy_id,
      userId: admin.id,
      receiptPublicId: receipt2Res.receiptPublicId,
    });
    assert.equal(reApprove.success, false);
    assert.equal(reApprove.code, "ALREADY_REVIEWED");
    console.log(" -> PASS: Tentativa de reaprovação bloqueada com ALREADY_REVIEWED.");

    // =========================================================================
    // CENÁRIO 4: BLOQUEIO DE APROVAÇÃO EM COBRANÇA INFINITEPAY ATIVA
    // =========================================================================
    console.log("\nCENÁRIO 4: Bloqueio de aprovação manual em cobrança InfinitePay ativa...");
    const infinitePayCharge = await createCustomStudentCharge({
      consultancyId: admin.consultancy_id,
      consultancySlug: admin.consultancy_slug,
      userId: admin.id,
      studentMembershipPublicId: student.membership_public_id,
      title: "Cobrança InfinitePay com Comprovante Fictício",
      amountCents: 15000,
      dueOn: dueOnStr,
      features: { training: true },
      billingMethod: "INFINITEPAY",
    });
    createdChargePublicIds.push(infinitePayCharge.chargePublicId);

    // Inserção controlada de comprovante simulado
    const [chargeRow] = await pool.query(
      `SELECT id FROM student_charges WHERE public_id = ?`,
      [infinitePayCharge.chargePublicId]
    );
    const mockReceiptPublicId = crypto.randomUUID();
    const sha = "c".repeat(64);
    await pool.query(
      `INSERT INTO student_payment_receipts (
         public_id, consultancy_id, charge_id, submitted_by_user_id,
         file_storage_key, original_file_name, mime_type, size_bytes, file_sha256,
         status, submitted_at
       ) VALUES (?, ?, ?, ?, 'mock/path.pdf', 'mock.pdf', 'application/pdf', 1000, ?, 'SUBMITTED', UTC_TIMESTAMP(3))`,
      [mockReceiptPublicId, admin.consultancy_id, chargeRow[0].id, student.id, sha]
    );

    const blockGatewayRes = await approveStudentPaymentReceipt({
      consultancyId: admin.consultancy_id,
      userId: admin.id,
      receiptPublicId: mockReceiptPublicId,
    });
    assert.equal(blockGatewayRes.success, false);
    assert.equal(blockGatewayRes.code, "GATEWAY_ACTIVE");
    assert.match(blockGatewayRes.error, /gateway externo/i);
    console.log(" -> PASS: Bloqueio estrito de aprovação manual em cobrança com checkout externo ativo.");

    // =========================================================================
    // CENÁRIO 5: MARCAÇÃO MANUAL DIRETA ATUALIZA COMPROVANTE SUBMETIDO EM SINCRONIA
    // =========================================================================
    console.log("\nCENÁRIO 5: Marcar como Paga via rota direta sincroniza comprovante pendente...");
    const charge3 = await createCustomStudentCharge({
      consultancyId: admin.consultancy_id,
      consultancySlug: admin.consultancy_slug,
      userId: admin.id,
      studentMembershipPublicId: student.membership_public_id,
      title: "Cobrança QA Sincronia Receipt",
      amountCents: 7500,
      dueOn: dueOnStr,
      features: { chat: true },
      billingMethod: "MANUAL",
    });
    createdChargePublicIds.push(charge3.chargePublicId);

    const receipt3Res = await submitStudentPaymentReceipt({
      consultancyId: admin.consultancy_id,
      studentMembershipId: student.membership_id,
      userId: student.id,
      chargePublicId: charge3.chargePublicId,
      fileStorageKey: "receipts/test_sync.pdf",
      originalFileName: "comprovante_sync.pdf",
      mimeType: "application/pdf",
      sizeBytes: 60000,
      fileSha256: "d".repeat(64),
    });
    assert.equal(receipt3Res.success, true);

    // Admin clica em "Marcar como Paga" diretamente na página da cobrança
    const payDirectRes = await markStudentChargePaid({
      consultancyId: admin.consultancy_id,
      userId: admin.id,
      chargePublicId: charge3.chargePublicId,
      paymentMethod: "TRANSFERENCIA",
      paidAtIso: new Date().toISOString(),
      notes: "Conferido diretamente pelo extrato bancário",
    });
    assert.equal(payDirectRes.success, true);

    // Verifica que o comprovante foi atualizado para APPROVED em sincronia
    const [receiptCheck] = await pool.query(
      `SELECT status, reviewed_by_user_id FROM student_payment_receipts WHERE public_id = ?`,
      [receipt3Res.receiptPublicId]
    );
    assert.equal(receiptCheck[0].status, "APPROVED");
    assert.equal(Number(receiptCheck[0].reviewed_by_user_id), admin.id);

    // Verifica vínculo do receipt_id no student_payments
    const [paymentCheck] = await pool.query(
      `SELECT receipt_id FROM student_payments WHERE charge_id = (SELECT id FROM student_charges WHERE public_id = ?)`,
      [charge3.chargePublicId]
    );
    assert.ok(paymentCheck[0].receipt_id, "receipt_id deve estar vinculado no pagamento");

    console.log(" -> PASS: Sincronia perfeita: Marcar como Paga aprovou e vinculou comprovante pendente.");

    console.log("\n======================================================================");
    console.log("RESULTADO: TODOS OS 5 CENÁRIOS DE COMPROVANTES FORAM APROVADOS (100% PASS)");
    console.log("======================================================================");
    process.exit(0);
  } finally {
    if (createdChargePublicIds.length > 0) {
      const placeholders = createdChargePublicIds.map(() => "?").join(",");
      await pool.query(
        `DELETE FROM student_payments WHERE charge_id IN (SELECT id FROM student_charges WHERE public_id IN (${placeholders}))`,
        createdChargePublicIds
      );
      await pool.query(
        `DELETE FROM student_payment_receipts WHERE charge_id IN (SELECT id FROM student_charges WHERE public_id IN (${placeholders}))`,
        createdChargePublicIds
      );
      await pool.query(
        `DELETE FROM student_plan_subscriptions WHERE charge_id IN (SELECT id FROM student_charges WHERE public_id IN (${placeholders}))`,
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
  console.error("\n❌ ERRO NA SUÍTE DE COMPROVANTES:", err);
  process.exit(1);
});
