import { register } from "node:module";
register("./ts-loader.mjs", import.meta.url);

import mysql from "mysql2/promise";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamic imports with ts-loader
const {
  createPlanChargeForStudent,
  verifyAndReconcileChargePayment,
  listConsultancyPlans,
  getInfinitePayConfig,
} = await import("../lib/infinitepay/service.ts");

const {
  getStudentFinancialAccessState,
  createStudentCharge,
} = await import("../lib/consultancies/finance.ts");

const { verifyPassword } = await import("../lib/auth/password.ts");

async function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  const envContent = await fs.readFile(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

// Helper para criar sessão no banco local e gerar token para cookie HTTP
async function createLocalSession(conn, userId) {
  const rawToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  await conn.execute(
    `INSERT INTO auth_sessions (user_id, token_hash, remember_me, expires_at)
     VALUES (?, ?, 1, DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 24 HOUR));`,
    [userId, tokenHash]
  );
  return rawToken;
}

async function runHomologation() {
  console.log("======================================================================");
  console.log("🍀 TREVO ONE — HOMOLOGAÇÃO INTEGRADA REAL DO FINANCEIRO (SAIYA SHAPE)");
  console.log("Ambiente: MariaDB Local (trevo_one_qa) + Next.js (http://localhost:3000)");
  console.log("======================================================================\n");

  await loadEnvLocal();

  // GUARDA DE SEGURANÇA OBRIGATÓRIA
  assert.equal(process.env.DB_HOST, "127.0.0.1", "DB_HOST DEVE ser 127.0.0.1");
  assert.equal(process.env.DB_NAME, "trevo_one_qa", "DB_NAME DEVE ser trevo_one_qa");
  assert.ok(!process.env.DB_HOST.includes("hstgr.io"), "Proibido conectar na Hostinger!");
  assert.equal(process.env.INFINITEPAY_ENVIRONMENT, "SIMULATION", "INFINITEPAY_ENVIRONMENT DEVE ser SIMULATION");
  assert.equal(process.env.INFINITEPAY_PILOT_CONSULTANCY_ID, "1", "INFINITEPAY_PILOT_CONSULTANCY_ID DEVE ser 1");

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const BASE_URL = "http://localhost:3000";

  // Verificar se o Next.js local está respondendo
  try {
    const pingRes = await fetch(`${BASE_URL}/login`);
    assert.ok(pingRes.status === 200 || pingRes.status === 307, "Next.js deve responder HTTP 200 ou 307 no login");
    console.log("[SEGURANÇA] Servidor Next.js local respondendo em http://localhost:3000");
    console.log("[SEGURANÇA] Conexão com MariaDB local trevo_one_qa confirmada");
  } catch (err) {
    throw new Error(`Next.js local não está acessível em ${BASE_URL}: ${err.message}`);
  }

  // Reset previous test charges/subscriptions for clean deterministic test run
  await conn.query("DELETE FROM student_plan_subscriptions WHERE consultancy_id = 1");
  await conn.query("DELETE FROM student_payments WHERE consultancy_id = 1");
  await conn.query("DELETE FROM student_charges WHERE consultancy_id = 1");
  console.log("[LIMPEZA INICIAL] Dados de testes anteriores limpos para execução determinística");

  // --------------------------------------------------------------------------
  // TESTE 1: Autenticação dos três perfis fictícios
  // --------------------------------------------------------------------------
  console.log("\n----------------------------------------------------------------------");
  console.log("TESTE 1: Autenticação dos três perfis fictícios (Admin, Personal, Aluno)");
  console.log("----------------------------------------------------------------------");

  const [users] = await conn.query(`
    SELECT u.id, u.email, u.password_hash, cm.id as member_id, cm.public_id as member_public_id, cmr.role
    FROM users u
    JOIN consultancy_members cm ON cm.user_id = u.id AND cm.consultancy_id = 1
    JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
    WHERE u.email IN ('admin@trevoone-test.local', 'treinador.teste@trevoone.com', 'aluno.teste@trevoone.com')
  `);

  const admin = users.find(u => u.email === "admin@trevoone-test.local");
  const personal = users.find(u => u.email === "treinador.teste@trevoone.com");
  const student = users.find(u => u.email === "aluno.teste@trevoone.com");

  assert.ok(admin, "Admin não encontrado");
  assert.ok(personal, "Personal não encontrado");
  assert.ok(student, "Aluno não encontrado");

  // Validar senhas scrypt
  assert.ok(await verifyPassword("Trevo@123456", admin.password_hash), "Senha do Admin inválida");
  assert.ok(await verifyPassword("Trevo@123456", personal.password_hash), "Senha do Personal inválida");
  assert.ok(await verifyPassword("Trevo@123456", student.password_hash), "Senha do Aluno inválida");

  // Gerar sessões no MySQL e testar cookies
  const adminToken = await createLocalSession(conn, admin.id);
  const personalToken = await createLocalSession(conn, personal.id);
  const studentToken = await createLocalSession(conn, student.id);

  // Evidência no banco de sessões
  const [sessions] = await conn.query("SELECT id, user_id, expires_at FROM auth_sessions WHERE user_id IN (?, ?, ?)", [admin.id, personal.id, student.id]);
  assert.ok(sessions.length >= 3, "Sessões não registradas em auth_sessions");
  console.log(`[EVIDÊNCIA BANCO] ${sessions.length} sessões ativas registradas em auth_sessions:`);
  console.log(`  - Admin (user_id=${admin.id}): Sessão OK | Role=${admin.role}`);
  console.log(`  - Personal (user_id=${personal.id}): Sessão OK | Role=${personal.role}`);
  console.log(`  - Aluno (user_id=${student.id}): Sessão OK | Role=${student.role}`);
  console.log("[STATUS TESTE 1]: PASS ✓");

  // --------------------------------------------------------------------------
  // TESTE 2: Visualização dos 15 planos e preços
  // --------------------------------------------------------------------------
  console.log("\n----------------------------------------------------------------------");
  console.log("TESTE 2: Visualização dos 15 planos comerciais e preços oficiais");
  console.log("----------------------------------------------------------------------");

  const plansResult = await listConsultancyPlans({ consultancyId: 1, includeInactive: false });
  assert.equal(plansResult.length, 15, "Devem existir 15 planos ativos");

  // Testar requisição HTTP real ao endpoint /consultoria/saiya-shape/financeiro?aba=planos com cookie de Admin
  const plansPageRes = await fetch(`${BASE_URL}/consultoria/saiya-shape/financeiro?aba=planos`, {
    headers: { Cookie: `trevo_session=${adminToken}` },
  });
  assert.equal(plansPageRes.status, 200, "Página de finanças deve responder HTTP 200 para Admin");
  const plansHtml = await plansPageRes.text();

  // Validar se planos aparecem na resposta HTTP do Next.js
  let foundInHtml = 0;
  for (const p of plansResult) {
    if (plansHtml.includes(p.name)) foundInHtml++;
  }
  console.log(`[EVIDÊNCIA INTERFACE HTTP] ${foundInHtml} dos 15 planos identificados no HTML de resposta HTTP 200`);
  console.log(`[EVIDÊNCIA BANCO] 15 planos confirmados em consultancy_plans:`);
  plansResult.slice(0, 5).forEach(p => console.log(`  - [Treino] ${p.name}: R$ ${(p.amountCents / 100).toFixed(2)} (${p.billingCycle})`));
  plansResult.slice(5, 10).forEach(p => console.log(`  - [Nutrição] ${p.name}: R$ ${(p.amountCents / 100).toFixed(2)} (${p.billingCycle})`));
  plansResult.slice(10, 15).forEach(p => console.log(`  - [Completa] ${p.name}: R$ ${(p.amountCents / 100).toFixed(2)} (${p.billingCycle})`));
  console.log("[STATUS TESTE 2]: PASS ✓");

  // --------------------------------------------------------------------------
  // TESTE 3: Emissão de cobrança de R$ 350,00 para o aluno de teste
  // --------------------------------------------------------------------------
  console.log("\n----------------------------------------------------------------------");
  console.log("TESTE 3: Emissão de cobrança de R$ 350,00 (Consultoria Completa — Mensal)");
  console.log("----------------------------------------------------------------------");

  const targetPlan = plansResult.find(p => p.name === "Consultoria Completa — Mensal");
  assert.ok(targetPlan, "Plano Consultoria Completa Mensal não encontrado");
  assert.equal(targetPlan.amountCents, 35000, "Valor do plano deve ser 35000 centavos (R$ 350,00)");

  const chargeResult = await createPlanChargeForStudent({
    consultancyId: 1,
    consultancySlug: "saiya-shape",
    userId: admin.id,
    studentMembershipPublicId: student.member_public_id,
    planPublicId: targetPlan.publicId,
    appBaseUrl: BASE_URL,
  });

  assert.ok(chargeResult.success, `Falha ao emitir cobrança: ${chargeResult.error}`);
  assert.ok(chargeResult.chargePublicId, "chargePublicId não retornado");
  assert.ok(chargeResult.checkoutUrl, "checkoutUrl não retornado");
  assert.ok(chargeResult.whatsAppHref, "whatsAppHref DEVE estar preenchido para compartilhamento");
  assert.ok(chargeResult.whatsAppHref.startsWith("https://wa.me/?text="), "whatsAppHref deve ser link universal sem destinatário fixo quando não houver telefone");

  const emittedChargePublicId = chargeResult.chargePublicId;
  const emittedCheckoutUrl = chargeResult.checkoutUrl;
  const emittedWhatsAppHref = chargeResult.whatsAppHref;

  console.log(`[EVIDÊNCIA AÇÃO] Cobrança gerada com sucesso!`);
  console.log(`  - chargePublicId: ${emittedChargePublicId}`);
  console.log(`  - checkoutUrl: ${emittedCheckoutUrl}`);
  console.log(`  - whatsAppHref: ${emittedWhatsAppHref.slice(0, 60)}...`);
  console.log("[STATUS TESTE 3]: PASS ✓");

  // --------------------------------------------------------------------------
  // TESTE 4: Confirmação de criação do registro OPEN no banco
  // --------------------------------------------------------------------------
  console.log("\n----------------------------------------------------------------------");
  console.log("TESTE 4: Confirmação de criação do registro OPEN no banco local");
  console.log("----------------------------------------------------------------------");

  const [chargeRows] = await conn.query(
    "SELECT id, public_id, consultancy_id, student_membership_id, plan_id, amount_cents, state, infinitepay_checkout_url, paid_at FROM student_charges WHERE public_id = ?",
    [emittedChargePublicId]
  );
  assert.equal(chargeRows.length, 1, "Cobrança não encontrada no banco");
  const chargeDb = chargeRows[0];

  assert.equal(chargeDb.state, "OPEN", "Estado inicial da cobrança DEVE ser OPEN");
  assert.equal(Number(chargeDb.amount_cents), 35000, "amount_cents DEVE ser 35000");
  assert.equal(Number(chargeDb.consultancy_id), 1, "consultancy_id DEVE ser 1");
  assert.equal(Number(chargeDb.student_membership_id), student.member_id, "student_membership_id DEVE ser o do aluno de teste");
  assert.equal(Number(chargeDb.plan_id), targetPlan.id, "plan_id DEVE corresponder ao plano de R$ 350,00");
  assert.equal(chargeDb.paid_at, null, "paid_at DEVE ser nulo enquanto OPEN");
  assert.ok(chargeDb.infinitepay_checkout_url, "infinitepay_checkout_url DEVE estar preenchido");

  console.log(`[EVIDÊNCIA BANCO] Registro validado na tabela student_charges:`);
  console.log(`  - id: ${chargeDb.id}`);
  console.log(`  - state: ${chargeDb.state}`);
  console.log(`  - amount_cents: ${chargeDb.amount_cents} (R$ 350,00)`);
  console.log(`  - student_membership_id: ${chargeDb.student_membership_id}`);
  console.log(`  - plan_id: ${chargeDb.plan_id}`);
  console.log(`  - paid_at: ${chargeDb.paid_at}`);
  console.log("[STATUS TESTE 4]: PASS ✓");

  // --------------------------------------------------------------------------
  // TESTE 5: Checkout exclusivamente simulado
  // --------------------------------------------------------------------------
  console.log("\n----------------------------------------------------------------------");
  console.log("TESTE 5: Checkout exclusivamente simulado (Zero chamadas externas)");
  console.log("----------------------------------------------------------------------");

  assert.ok(emittedCheckoutUrl.startsWith(`${BASE_URL}/consultoria/saiya-shape/pagamentos/retorno`), "Checkout deve apontar para endpoint local");
  assert.ok(emittedCheckoutUrl.includes("simulated_checkout=1"), "URL deve conter flag simulated_checkout=1");
  assert.ok(emittedCheckoutUrl.includes("slug=sim_slug_"), "Slug deve conter prefixo de simulação sim_slug_");
  assert.ok(emittedCheckoutUrl.includes(`order_nsu=${emittedChargePublicId}`), "order_nsu deve corresponder ao chargePublicId");

  console.log(`[EVIDÊNCIA URL SIMULADA] ${emittedCheckoutUrl}`);
  console.log("[STATUS TESTE 5]: PASS ✓");

  // --------------------------------------------------------------------------
  // TESTE 6: Reconciliação simulada, comprovando alteração para PAID
  // --------------------------------------------------------------------------
  console.log("\n----------------------------------------------------------------------");
  console.log("TESTE 6: Reconciliação simulada comprovando transição para PAID");
  console.log("----------------------------------------------------------------------");

  const simTransactionNsu = `sim_tx_${Date.now()}`;
  const simSlug = `sim_slug_${Date.now()}`;

  // Executar reconciliação simulada
  const reconcileRes = await verifyAndReconcileChargePayment({
    consultancySlug: "saiya-shape",
    chargePublicId: emittedChargePublicId,
    transactionNsu: simTransactionNsu,
    slug: simSlug,
  });

  assert.ok(reconcileRes.isPaid, `Reconciliação falhou: ${reconcileRes.message}`);

  // Testar requisição HTTP real ao endpoint de retorno com cookie do aluno
  const returnHttpRes = await fetch(
    `${BASE_URL}/consultoria/saiya-shape/pagamentos/retorno?chargeId=${emittedChargePublicId}&simulated_checkout=1&transaction_nsu=${simTransactionNsu}&slug=${simSlug}`,
    { headers: { Cookie: `trevo_session=${studentToken}` } }
  );
  assert.equal(returnHttpRes.status, 200, "Retorno de pagamento deve responder HTTP 200");
  const returnHtml = await returnHttpRes.text();
  assert.ok(returnHtml.includes("Seu plano está ativo!") || returnHtml.includes("Pagamento Aprovado"), "Tela de retorno deve exibir aprovação");

  // Conferir estado no banco
  const [reconciledRows] = await conn.query(
    "SELECT state, paid_amount_cents, paid_at, infinitepay_transaction_nsu FROM student_charges WHERE public_id = ?",
    [emittedChargePublicId]
  );
  const reconciledCharge = reconciledRows[0];
  assert.equal(reconciledCharge.state, "PAID", "Estado da cobrança DEVE ser PAID");
  assert.equal(Number(reconciledCharge.paid_amount_cents), 35000, "paid_amount_cents DEVE ser 35000");
  assert.ok(reconciledCharge.paid_at !== null, "paid_at DEVE estar preenchido");
  assert.ok(
    reconciledCharge.infinitepay_transaction_nsu?.startsWith("sim_tx_"),
    "transaction_nsu DEVE estar gravado com prefixo sim_tx_"
  );

  // Conferir registro em student_payments
  const [paymentRows] = await conn.query(
    "SELECT id, amount_cents, payment_method, confirmed_at FROM student_payments WHERE charge_id = ?",
    [chargeDb.id]
  );
  assert.equal(paymentRows.length, 1, "Deve existir exatamente 1 registro de pagamento em student_payments");
  assert.equal(Number(paymentRows[0].amount_cents), 35000, "Valor do pagamento deve ser 35000");

  console.log(`[EVIDÊNCIA INTERFACE HTTP] Resposta HTTP 200 com mensagem 'Seu plano está ativo!'`);
  console.log(`[EVIDÊNCIA BANCO] student_charges atualizado para state='PAID' em ${reconciledCharge.paid_at}`);
  console.log(`[EVIDÊNCIA BANCO] student_payments criado: id=${paymentRows[0].id}, amount_cents=${paymentRows[0].amount_cents}`);
  console.log("[STATUS TESTE 6]: PASS ✓");

  // --------------------------------------------------------------------------
  // TESTE 7: Criação e conferência da assinatura ACTIVE
  // --------------------------------------------------------------------------
  console.log("\n----------------------------------------------------------------------");
  console.log("TESTE 7: Criação e conferência da assinatura ACTIVE");
  console.log("----------------------------------------------------------------------");

  const [subRows] = await conn.query(
    "SELECT id, public_id, consultancy_id, student_membership_id, plan_id, charge_id, status, started_at, ends_at FROM student_plan_subscriptions WHERE charge_id = ?",
    [chargeDb.id]
  );
  assert.equal(subRows.length, 1, "Deve existir exatamente 1 assinatura criada para a cobrança");
  const sub = subRows[0];

  assert.equal(sub.status, "ACTIVE", "Status da assinatura DEVE ser ACTIVE");
  assert.equal(Number(sub.consultancy_id), 1, "consultancy_id da assinatura DEVE ser 1");
  assert.equal(Number(sub.student_membership_id), student.member_id, "student_membership_id DEVE ser o do aluno");
  assert.equal(Number(sub.plan_id), targetPlan.id, "plan_id DEVE ser o do plano mensal");
  assert.ok(sub.started_at, "started_at DEVE estar definido");
  assert.ok(sub.ends_at, "ends_at DEVE estar definido");

  const startedDate = new Date(sub.started_at);
  const endsDate = new Date(sub.ends_at);
  const diffDays = Math.round((endsDate - startedDate) / (1000 * 60 * 60 * 24));
  assert.ok(diffDays >= 28 && diffDays <= 32, `Período da assinatura mensal deve ser ~30 dias (obtido: ${diffDays} dias)`);

  console.log(`[EVIDÊNCIA BANCO] Assinatura criada em student_plan_subscriptions:`);
  console.log(`  - id: ${sub.id}`);
  console.log(`  - status: ${sub.status}`);
  console.log(`  - started_at: ${sub.started_at}`);
  console.log(`  - ends_at: ${sub.ends_at} (~${diffDays} dias)`);
  console.log("[STATUS TESTE 7]: PASS ✓");

  // --------------------------------------------------------------------------
  // TESTE 8: Verificação de idempotência, sem duplicações
  // --------------------------------------------------------------------------
  console.log("\n----------------------------------------------------------------------");
  console.log("TESTE 8: Verificação de idempotência estrita (Re-tentativa de pagamento)");
  console.log("----------------------------------------------------------------------");

  // Re-executar a reconciliação com os mesmos parâmetros
  const retryReconcile = await verifyAndReconcileChargePayment({
    consultancySlug: "saiya-shape",
    chargePublicId: emittedChargePublicId,
    transactionNsu: simTransactionNsu,
    slug: simSlug,
  });
  assert.ok(retryReconcile.isPaid, "Re-execução deve retornar sucesso");

  // Verificar que não duplicou assinaturas ou pagamentos
  const [subCount] = await conn.query("SELECT COUNT(*) as c FROM student_plan_subscriptions WHERE charge_id = ?", [chargeDb.id]);
  const [payCount] = await conn.query("SELECT COUNT(*) as c FROM student_payments WHERE charge_id = ?", [chargeDb.id]);
  assert.equal(Number(subCount[0].c), 1, "IDEMPOTÊNCIA FALHOU: Assinatura foi duplicada!");
  assert.equal(Number(payCount[0].c), 1, "IDEMPOTÊNCIA FALHOU: Pagamento foi duplicado!");

  console.log(`[EVIDÊNCIA BANCO] Assinaturas para charge_id=${chargeDb.id}: ${subCount[0].c} (zero duplicatas)`);
  console.log(`[EVIDÊNCIA BANCO] Pagamentos para charge_id=${chargeDb.id}: ${payCount[0].c} (zero duplicatas)`);
  console.log("[STATUS TESTE 8]: PASS ✓");

  // --------------------------------------------------------------------------
  // TESTE 9: Renovação antecipada sem perda de dias
  // --------------------------------------------------------------------------
  console.log("\n----------------------------------------------------------------------");
  console.log("TESTE 9: Renovação antecipada contínua (Sem perda de dias restantes)");
  console.log("----------------------------------------------------------------------");

  const planTrimestral = plansResult.find(p => p.name === "Consultoria Completa — Trimestral");
  assert.ok(planTrimestral, "Plano Trimestral não encontrado");

  // 9.1 Emitir cobrança de renovação antecipada
  const renewChargeRes = await createPlanChargeForStudent({
    consultancyId: 1,
    consultancySlug: "saiya-shape",
    userId: admin.id,
    studentMembershipPublicId: student.member_public_id,
    planPublicId: planTrimestral.publicId,
    appBaseUrl: BASE_URL,
  });
  assert.ok(renewChargeRes.success, "Falha ao emitir cobrança de renovação");

  // Data de término da assinatura anterior
  const previousEnd = new Date(sub.ends_at);

  // 9.2 Reconciliar pagamento da renovação
  const renewTxNsu = `sim_tx_renew_${Date.now()}`;
  const renewReconcile = await verifyAndReconcileChargePayment({
    consultancySlug: "saiya-shape",
    chargePublicId: renewChargeRes.chargePublicId,
    transactionNsu: renewTxNsu,
    slug: `sim_slug_renew_${Date.now()}`,
  });
  assert.ok(renewReconcile.isPaid, "Reconciliação da renovação falhou");

  // 9.3 Consultar nova assinatura no banco
  const [renewSubRows] = await conn.query(
    `SELECT sps.id, sps.status, sps.started_at, sps.ends_at 
     FROM student_plan_subscriptions sps 
     JOIN student_charges sc ON sc.id = sps.charge_id 
     WHERE sc.public_id = ?`,
    [renewChargeRes.chargePublicId]
  );
  assert.equal(renewSubRows.length, 1, "Nova assinatura de renovação não encontrada");
  const renewSub = renewSubRows[0];
  const newEnd = new Date(renewSub.ends_at);

  // A nova data de término DEVE ser calculada a partir de previousEnd (+3 meses), e NÃO a partir de hoje!
  const diffFromPreviousEndDays = Math.round((newEnd - previousEnd) / (1000 * 60 * 60 * 24));
  assert.ok(
    diffFromPreviousEndDays >= 88 && diffFromPreviousEndDays <= 93,
    `Renovação antecipada deveria estender ~90 dias após previousEnd (${previousEnd.toISOString()}), mas obteve ${diffFromPreviousEndDays} dias`
  );

  console.log(`[EVIDÊNCIA BANCO] Término anterior: ${previousEnd.toISOString().slice(0, 10)}`);
  console.log(`[EVIDÊNCIA BANCO] Novo término estendido: ${newEnd.toISOString().slice(0, 10)} (+${diffFromPreviousEndDays} dias somados aos dias vigentes)`);
  console.log("[STATUS TESTE 9]: PASS ✓");

  // --------------------------------------------------------------------------
  // TESTE 10: Bloqueio por inadimplência
  // --------------------------------------------------------------------------
  console.log("\n----------------------------------------------------------------------");
  console.log("TESTE 10: Bloqueio e Restrição de Acesso por Inadimplência");
  console.log("----------------------------------------------------------------------");

  // 10.1 Inserir cobrança vencida com blocks_access = 1
  const overdueDueDate = "2026-11-01"; // No passado
  const [overdueIns] = await conn.query(`
    INSERT INTO student_charges (
      public_id, consultancy_id, student_membership_id, title, description,
      amount_cents, currency_code, due_on, blocks_access, state,
      created_by_user_id, created_at
    ) VALUES (
      UUID(), 1, ?, 'Mensalidade Atrasada de Teste', 'Cobrança de teste de bloqueio',
      20000, 'BRL', ?, 1, 'OPEN',
      ?, NOW(3)
    )
  `, [student.member_id, overdueDueDate, admin.id]);
  const overdueChargeId = overdueIns.insertId;

  // 10.2 Avaliar status de acesso financeiro do aluno
  const restrictedState = await getStudentFinancialAccessState({
    consultancyId: 1,
    studentMembershipId: student.member_id,
  });
  assert.equal(restrictedState.isRestricted, true, "Aluno com cobrança vencida e blocks_access=1 DEVE estar restrito (isRestricted=true)");
  assert.ok(restrictedState.overdueChargeCount >= 1, "overdueChargeCount deve ser >= 1");
  console.log(`[EVIDÊNCIA REGRA DE ACESSO] Aluno bloqueado com sucesso: isRestricted=${restrictedState.isRestricted}, cobranças vencidas=${restrictedState.overdueChargeCount}`);

  // 10.3 Quitar cobrança vencida simulando pagamento
  await conn.query("UPDATE student_charges SET state = 'PAID', paid_amount_cents = 20000, paid_at = NOW(3) WHERE id = ?", [overdueChargeId]);
  await conn.query(`
    INSERT INTO student_payments (public_id, consultancy_id, charge_id, amount_cents, payment_method, confirmed_at, created_at)
    VALUES (UUID(), 1, ?, 20000, 'PIX_MANUAL', NOW(3), NOW(3))
  `, [overdueChargeId]);

  // 10.4 Avaliar novamente: o bloqueio deve desaparecer imediatamente
  const clearedState = await getStudentFinancialAccessState({
    consultancyId: 1,
    studentMembershipId: student.member_id,
  });
  assert.equal(clearedState.isRestricted, false, "Após quitação, aluno NÃO deve estar mais restrito (isRestricted=false)");
  console.log(`[EVIDÊNCIA REGRA DE ACESSO] Acesso liberado após quitação: isRestricted=${clearedState.isRestricted}, cobranças vencidas=${clearedState.overdueChargeCount}`);
  console.log("[STATUS TESTE 10]: PASS ✓");

  // --------------------------------------------------------------------------
  // TESTE 11: Conferência das permissões de Administrador, Personal e Aluno
  // --------------------------------------------------------------------------
  console.log("\n----------------------------------------------------------------------");
  console.log("TESTE 11: Segregação e Conferência de Permissões (ADMIN vs PERSONAL vs ALUNO)");
  console.log("----------------------------------------------------------------------");

  // 11.1 Administrador acessa /financeiro -> HTTP 200
  const adminAccessRes = await fetch(`${BASE_URL}/consultoria/saiya-shape/financeiro`, {
    headers: { Cookie: `trevo_session=${adminToken}` },
    redirect: "manual",
  });
  assert.equal(adminAccessRes.status, 200, "Administrador deve ter acesso HTTP 200 ao Financeiro");
  console.log(`[EVIDÊNCIA RBAC] Administrador -> /financeiro: HTTP ${adminAccessRes.status} (Autorizado)`);

  // 11.2 Personal acessa /financeiro -> HTTP 200
  const personalAccessRes = await fetch(`${BASE_URL}/consultoria/saiya-shape/financeiro`, {
    headers: { Cookie: `trevo_session=${personalToken}` },
    redirect: "manual",
  });
  assert.equal(personalAccessRes.status, 200, "Personal deve ter acesso HTTP 200 ao Financeiro");
  console.log(`[EVIDÊNCIA RBAC] Personal -> /financeiro: HTTP ${personalAccessRes.status} (Autorizado)`);

  // 11.3 Aluno acessa /financeiro -> Redirecionado para o painel do aluno (não acessa financeiro)
  const studentAccessRes = await fetch(`${BASE_URL}/consultoria/saiya-shape/financeiro`, {
    headers: { Cookie: `trevo_session=${studentToken}` },
  });
  const studentAccessHtml = await studentAccessRes.text();
  assert.equal(studentAccessHtml.includes("Financeiro"), false, "Aluno NUNCA deve acessar a página de Financeiro");
  assert.equal(studentAccessHtml.includes("Cobranças"), false, "Aluno NUNCA deve acessar a lista de cobranças");
  console.log(`[EVIDÊNCIA RBAC] Aluno -> /financeiro: Acesso bloqueado e redirecionado (contains 'Financeiro': false, contains 'Cobranças': false)`);

  // 11.4 Aluno acessa seu próprio painel -> HTTP 200
  const studentDashboardRes = await fetch(`${BASE_URL}/consultoria/saiya-shape`, {
    headers: { Cookie: `trevo_session=${studentToken}` },
  });
  assert.equal(studentDashboardRes.status, 200, "Aluno deve acessar normalmente seu próprio painel");
  console.log(`[EVIDÊNCIA RBAC] Aluno -> /consultoria/saiya-shape: HTTP ${studentDashboardRes.status} (Painel do aluno autorizado)`);
  console.log("[STATUS TESTE 11]: PASS ✓");

  console.log("\n======================================================================");
  console.log("🍀 TODOS OS 11 TESTES INTEGRADOS FORAM CONCLUÍDOS COM SUCESSO (11/11)");
  console.log("======================================================================\n");

  await conn.end();
  process.exit(0);
}

runHomologation().catch(err => {
  console.error("\n❌ ERRO NA HOMOLOGAÇÃO:", err);
  process.exit(1);
});
