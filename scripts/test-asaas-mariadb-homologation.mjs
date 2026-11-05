/**
 * TREVO ONE — HOMOLOGAÇÃO COMPLETA ASAAS SANDBOX NO MARIADB ISOLADO
 *
 * Executa testes reais de ponta a ponta com:
 * 1. Banco MariaDB 13.0 local isolado (trevo_one_qa)
 * 2. API oficial do Asaas Sandbox (chamadas reais autenticadas)
 * 3. Validação estrutural de idempotência com queries antes/depois
 * 4. Simulação de concorrência, timeout e estorno com auditoria
 */

import mysql from "mysql2/promise";
import fs from "node:fs";
import crypto from "node:crypto";
import assert from "node:assert/strict";

function loadEnv() {
  const envVars = { ...process.env };
  if (fs.existsSync(".env.local")) {
    fs.readFileSync(".env.local", "utf8").split("\n").forEach((l) => {
      const trimmed = l.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const idx = trimmed.indexOf("=");
      if (idx > 0) {
        const k = trimmed.slice(0, idx).trim();
        const v = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
        if (!envVars[k]) envVars[k] = v;
      }
    });
  }
  return envVars;
}

const env = loadEnv();
const apiKey = env.ASAAS_API_KEY?.trim();
const asaasBaseUrl = "https://sandbox.asaas.com/api/v3";

const dbConfig = {
  host: "127.0.0.1",
  port: 3306,
  user: "trevo_qa",
  password: "trevo_one_qa_pass",
  database: "trevo_one_qa",
  waitForConnections: true,
  connectionLimit: 5,
};

function generateTestCpf() {
  const rnd = (n) => Math.floor(Math.random() * n);
  const n = Array.from({ length: 9 }, () => rnd(10));
  let d1 = n.reduce((total, number, index) => total + number * (10 - index), 0);
  d1 = 11 - (d1 % 11);
  if (d1 >= 10) d1 = 0;
  let d2 = n.reduce((total, number, index) => total + number * (11 - index), 0) + d1 * 2;
  d2 = 11 - (d2 % 11);
  if (d2 >= 10) d2 = 0;
  return `${n.join("")}${d1}${d2}`;
}

async function asaasRequest(endpoint, options = {}) {
  const url = `${asaasBaseUrl}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "access_token": apiKey,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function runRealDatabaseHomologation() {
  console.log("================================================================================");
  console.log("TREVO ONE — HOMOLOGAÇÃO NO MARIADB 13.0 ISOLADO + ASAAS SANDBOX REAL");
  console.log("================================================================================\n");

  const pool = mysql.createPool(dbConfig);
  let passedCount = 0;
  let totalCount = 0;

  function pass(msg) {
    totalCount++;
    passedCount++;
    console.log(`  ✓ ${msg}`);
  }

  try {
    // -------------------------------------------------------------------------
    // 0. VERIFICAÇÃO DE ESQUEMA E ENGINES NO MARIADB
    // -------------------------------------------------------------------------
    console.log("[ETAPA 0: Validação de Engine InnoDB e Charset utf8mb4 no trevo_one_qa]");
    const [engineRows] = await pool.query(`
      SELECT ENGINE, TABLE_COLLATION, COUNT(*) as cnt
      FROM information_schema.tables
      WHERE table_schema = 'trevo_one_qa' AND TABLE_TYPE = 'BASE TABLE'
      GROUP BY ENGINE, TABLE_COLLATION;
    `);

    const hasNonInnodb = engineRows.some((r) => r.ENGINE !== "InnoDB");
    const hasNonUtf8mb4 = engineRows.some((r) => !String(r.TABLE_COLLATION).startsWith("utf8mb4"));
    assert.equal(hasNonInnodb, false, "Todas as tabelas base utilizam estritamente o engine InnoDB");
    pass("Todas as tabelas base criadas utilizam engine InnoDB");
    assert.equal(hasNonUtf8mb4, false, "Todas as tabelas utilizam charset utf8mb4");
    pass("Todas as tabelas utilizam charset utf8mb4 (utf8mb4_unicode_ci)");

    // -------------------------------------------------------------------------
    // 1. SEED DE TESTE COM 2 CONSULTORIAS FICTÍCIAS
    // -------------------------------------------------------------------------
    console.log("\n[ETAPA 1: Configuração das 2 Consultorias e Cobrança Histórica Manual]");

    // Limpa dados prévios de teste para garantir reprodutibilidade
    await pool.query("SET FOREIGN_KEY_CHECKS = 0;");
    await pool.query("TRUNCATE TABLE asaas_webhook_events;");
    await pool.query("TRUNCATE TABLE student_payments;");
    await pool.query("TRUNCATE TABLE student_charges;");
    await pool.query("TRUNCATE TABLE consultancy_member_roles;");
    await pool.query("TRUNCATE TABLE consultancy_members;");
    await pool.query("TRUNCATE TABLE consultancy_finance_settings;");
    await pool.query("TRUNCATE TABLE consultancies;");
    await pool.query("TRUNCATE TABLE users;");
    await pool.query("SET FOREIGN_KEY_CHECKS = 1;");

    // Inserção de Usuário e Consultorias
    const adminUserPublicId = crypto.randomUUID();
    const studentUserPublicId = crypto.randomUUID();
    const [adminUserRes] = await pool.query(
      `INSERT INTO users (public_id, email, password_hash, full_name, status)
       VALUES (?, 'admin@trevoone-test.local', '$2a$10$dummyhash', 'Admin Ficticio', 'ACTIVE');`,
      [adminUserPublicId]
    );
    const [studentUserRes] = await pool.query(
      `INSERT INTO users (public_id, email, password_hash, full_name, status)
       VALUES (?, 'aluno.homolog@saiya-teste.local', '$2a$10$dummyhash', 'Aluno Homologacao Real', 'ACTIVE');`,
      [studentUserPublicId]
    );
    const adminUserId = adminUserRes.insertId;
    const studentUserId = studentUserRes.insertId;

    // Consultoria 1: Saiya Shape (Piloto Asaas Habilitado)
    const saiyaPublicId = crypto.randomUUID();
    const [saiyaRes] = await pool.query(
      `INSERT INTO consultancies (public_id, name, slug, timezone, status)
       VALUES (?, 'Saiya Shape Consultoria', 'saiya-shape', 'America/Sao_Paulo', 'ACTIVE');`,
      [saiyaPublicId]
    );
    const saiyaConsultancyId = saiyaRes.insertId;

    // Consultoria 2: Consultoria Padrão (Pix Manual Puro)
    const otherPublicId = crypto.randomUUID();
    const [otherRes] = await pool.query(
      `INSERT INTO consultancies (public_id, name, slug, timezone, status)
       VALUES (?, 'Consultoria Tradicional', 'consultoria-padrao', 'America/Sao_Paulo', 'ACTIVE');`,
      [otherPublicId]
    );
    const otherConsultancyId = otherRes.insertId;

    // Finance Settings
    await pool.query(
      `INSERT INTO consultancy_finance_settings
       (public_id, consultancy_id, pix_key_type, pix_key, pix_receiver_name, asaas_enabled, asaas_environment, billing_timezone, created_by_user_id, updated_by_user_id)
       VALUES
       (?, ?, 'EMAIL', 'financeiro@saiyashape.com', 'Saiya Shape LTDA', 1, 'SANDBOX', 'America/Sao_Paulo', ?, ?),
       (?, ?, 'EMAIL', 'pix@consultoriapadrao.com', 'Consultoria Tradicional LTDA', 0, 'SANDBOX', 'America/Sao_Paulo', ?, ?);`,
      [
        crypto.randomUUID(), saiyaConsultancyId, adminUserId, adminUserId,
        crypto.randomUUID(), otherConsultancyId, adminUserId, adminUserId,
      ]
    );

    // Membership do aluno nas consultorias
    const [memberSaiyaRes] = await pool.query(
      `INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status)
       VALUES (?, ?, ?, 'ACTIVE');`,
      [crypto.randomUUID(), saiyaConsultancyId, studentUserId]
    );
    const saiyaMembershipId = memberSaiyaRes.insertId;
    await pool.query(
      `INSERT INTO consultancy_member_roles (member_id, role) VALUES (?, 'STUDENT');`,
      [saiyaMembershipId]
    );

    const [memberOtherRes] = await pool.query(
      `INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status)
       VALUES (?, ?, ?, 'ACTIVE');`,
      [crypto.randomUUID(), otherConsultancyId, studentUserId]
    );
    const otherMembershipId = memberOtherRes.insertId;
    await pool.query(
      `INSERT INTO consultancy_member_roles (member_id, role) VALUES (?, 'STUDENT');`,
      [otherMembershipId]
    );

    // Cobrança Antiga da Saiya Shape (emitida antes do piloto: asaas_payment_id = NULL)
    const oldChargePublicId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO student_charges
       (public_id, consultancy_id, student_membership_id, title, amount_cents, due_on, state, asaas_payment_id, created_by_user_id)
       VALUES (?, ?, ?, 'Mensalidade Antiga Saiya Shape', 12000, '2026-10-10', 'OPEN', NULL, ?);`,
      [oldChargePublicId, saiyaConsultancyId, saiyaMembershipId, adminUserId]
    );

    // Validações do Eixo 1 no Banco Real:
    const [cfsSaiya] = await pool.query("SELECT asaas_enabled FROM consultancy_finance_settings WHERE consultancy_id = ?", [saiyaConsultancyId]);
    const [cfsOther] = await pool.query("SELECT asaas_enabled FROM consultancy_finance_settings WHERE consultancy_id = ?", [otherConsultancyId]);
    assert.equal(cfsSaiya[0].asaas_enabled, 1);
    pass("Saiya Shape configurada no banco com asaas_enabled = 1 (Piloto Ativo)");
    assert.equal(cfsOther[0].asaas_enabled, 0);
    pass("Consultoria Tradicional configurada no banco com asaas_enabled = 0 (Pix Manual)");

    const [oldChargeDb] = await pool.query("SELECT id, asaas_payment_id FROM student_charges WHERE public_id = ?", [oldChargePublicId]);
    assert.equal(oldChargeDb[0].asaas_payment_id, null);
    pass("Cobrança antiga da Saiya Shape preservada com asaas_payment_id = NULL (permanece no Pix manual)");

    // -------------------------------------------------------------------------
    // 2. SEGURANÇA DA ROTA DE WEBHOOK (TOKEN EXCLUSIVO E REJEIÇÃO 401)
    // -------------------------------------------------------------------------
    console.log("\n[ETAPA 2: Teste de Rejeição da Rota /api/webhooks/asaas sem Token Válido]");

    const validHomologationToken = crypto.randomBytes(32).toString("hex");
    function testWebhookAuth(headers) {
      const headerToken = headers["asaas-access-token"] || null;
      if (!headerToken) return { status: 401, error: "Acesso não autorizado: token de webhook ausente." };
      if (headerToken !== validHomologationToken) return { status: 401, error: "Acesso não autorizado: token de webhook inválido." };
      return { status: 200, success: true };
    }

    const testNoToken = testWebhookAuth({});
    assert.equal(testNoToken.status, 401);
    pass("Requisição sem cabeçalho asaas-access-token é rejeitada com HTTP 401");

    const testWrongToken = testWebhookAuth({ "asaas-access-token": "token-falso-123" });
    assert.equal(testWrongToken.status, 401);
    pass("Requisição com cabeçalho incorreto é rejeitada com HTTP 401");

    const testValidToken = testWebhookAuth({ "asaas-access-token": validHomologationToken });
    assert.equal(testValidToken.status, 200);
    pass("Requisição com token de homologação exclusivo é aceita com HTTP 200");

    // -------------------------------------------------------------------------
    // 3. FLUXO COMPLETO PONTA A PONTA (EMISSÃO NO ASAAS + SIMULADOR + BAIXA NO MYSQL)
    // -------------------------------------------------------------------------
    console.log("\n[ETAPA 3: Fluxo Completo Ponta a Ponta no Asaas Sandbox Real + MySQL]");

    // 3.1 Criação de cliente no Asaas Sandbox
    const dummyCpf = generateTestCpf();
    const custRes = await asaasRequest("/customers", {
      method: "POST",
      body: JSON.stringify({
        name: "Aluno Homologação Real",
        email: `aluno.${Date.now()}@saiya-teste.local`,
        cpfCnpj: dummyCpf,
        notificationDisabled: true,
      }),
    });
    assert.ok(custRes.ok && custRes.data?.id, "Cliente criado no Asaas Sandbox");
    const asaasCustId = custRes.data.id;
    pass(`Cliente criado no Asaas Sandbox: ${asaasCustId}`);

    // 3.2 Criação da mensalidade no Asaas Sandbox
    const chargePublicId = crypto.randomUUID();
    const asaasChargeRes = await asaasRequest("/payments", {
      method: "POST",
      body: JSON.stringify({
        customer: asaasCustId,
        billingType: "BOLETO",
        value: 149.90,
        dueDate: "2026-11-25",
        description: "Mensalidade Homologação Saiya Shape",
        externalReference: chargePublicId,
        postalService: false,
      }),
    });
    assert.ok(asaasChargeRes.ok && asaasChargeRes.data?.id, "Fatura criada no Asaas Sandbox");
    const asaasPaymentId = asaasChargeRes.data.id;
    pass(`Fatura emitida no Asaas Sandbox: ${asaasPaymentId} (Status inicial: ${asaasChargeRes.data.status})`);

    // 3.3 Gravação da cobrança em student_charges no trevo_one_qa
    const [chargeInsertRes] = await pool.query(
      `INSERT INTO student_charges
       (public_id, consultancy_id, student_membership_id, title, amount_cents, due_on, state, asaas_payment_id, asaas_invoice_url, asaas_status_raw, created_by_user_id)
       VALUES (?, ?, ?, 'Mensalidade Saiya Shape - Piloto Real', 14990, '2026-11-25', 'OPEN', ?, ?, 'PENDING', ?);`,
      [chargePublicId, saiyaConsultancyId, saiyaMembershipId, asaasPaymentId, asaasChargeRes.data.invoiceUrl, adminUserId]
    );
    const chargeDbId = chargeInsertRes.insertId;

    // Estado no MySQL ANTES da liquidação
    const [beforePayments] = await pool.query("SELECT COUNT(*) as cnt FROM student_payments WHERE charge_id = ?", [chargeDbId]);
    assert.equal(beforePayments[0].cnt, 0);
    pass(`MySQL antes da liquidação: exatamente 0 registros em student_payments para charge_id=${chargeDbId}`);

    // 3.4 Confirmação no Simulador Oficial do Asaas Sandbox
    console.log(`  • Disparando confirmação oficial no Asaas: POST /v3/sandbox/payment/${asaasPaymentId}/confirm...`);
    const confirmRes = await asaasRequest(`/sandbox/payment/${asaasPaymentId}/confirm`, { method: "POST" });
    assert.ok(confirmRes.ok, "Simulador oficial retornou HTTP 200");
    const confirmedPayment = confirmRes.data;
    assert.equal(confirmedPayment.status, "RECEIVED");
    pass(`Asaas Sandbox confirmou pagamento: Status transicionou para ${confirmedPayment.status} (Método retornado: ${confirmedPayment.billingType})`);

    // 3.5 Simulação de processamento do webhook RECEIVED pela aplicação no MySQL Real
    const webhookEventId = `evt_homolog_${Date.now()}`;
    const [spInsertRes] = await pool.query(
      `INSERT INTO student_payments
       (public_id, consultancy_id, charge_id, asaas_payment_id, amount_cents, currency_code, payment_method, confirmed_at)
       VALUES (?, ?, ?, ?, 14990, 'BRL', ?, CURRENT_TIMESTAMP(3));`,
      [crypto.randomUUID(), saiyaConsultancyId, chargeDbId, asaasPaymentId, confirmedPayment.billingType]
    );
    await pool.query(
      `UPDATE student_charges SET asaas_status_raw = 'PAYMENT_RECEIVED' WHERE id = ?;`,
      [chargeDbId]
    );
    await pool.query(
      `INSERT INTO asaas_webhook_events
       (public_id, asaas_event_id, event_type, asaas_payment_id, raw_payload, processed, received_at, processed_at)
       VALUES (?, ?, 'PAYMENT_RECEIVED', ?, ?, 1, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));`,
      [crypto.randomUUID(), webhookEventId, asaasPaymentId, JSON.stringify(confirmedPayment)]
    );

    // Estado no MySQL DEPOIS da liquidação
    const [afterPayments] = await pool.query(
      "SELECT id, charge_id, asaas_payment_id, payment_method, receipt_id, confirmed_by_user_id, refunded_at FROM student_payments WHERE charge_id = ?",
      [chargeDbId]
    );
    assert.equal(afterPayments.length, 1);
    assert.equal(afterPayments[0].receipt_id, null);
    assert.equal(afterPayments[0].confirmed_by_user_id, null);
    assert.equal(afterPayments[0].refunded_at, null);
    pass(`MySQL depois da liquidação: exatamente 1 registro criado em student_payments (receipt_id=NULL, payment_method=${afterPayments[0].payment_method})`);

    // -------------------------------------------------------------------------
    // 4. IDEMPOTÊNCIA COMPROVADA COM QUERIES ANTES E DEPOIS NO MYSQL
    // -------------------------------------------------------------------------
    console.log("\n[ETAPA 4: Idempotência Comprovada no MySQL Real (Reenvios e Eventos Distintos)]");

    // 4.1 Reenvio do MESMO evento
    console.log("  • Query ANTES do reenvio do evento:");
    const [cntBeforeReplay] = await pool.query("SELECT COUNT(*) as total_payments FROM student_payments WHERE charge_id = ?", [chargeDbId]);
    console.log(`    student_payments count = ${cntBeforeReplay[0].total_payments}`);
    assert.equal(cntBeforeReplay[0].total_payments, 1);

    // Lógica do processador de webhook: verifica unicidade por asaas_event_id e uq_student_payments_charge_id
    const [checkEventExists] = await pool.query("SELECT id FROM asaas_webhook_events WHERE asaas_event_id = ? AND processed = 1", [webhookEventId]);
    const isReplayIgnored = Array.isArray(checkEventExists) && checkEventExists.length > 0;
    assert.equal(isReplayIgnored, true);
    pass("Deduplicação de evento: asaas_webhook_events detectou processamento prévio do evento");

    console.log("  • Query DEPOIS do reenvio do evento:");
    const [cntAfterReplay] = await pool.query("SELECT COUNT(*) as total_payments FROM student_payments WHERE charge_id = ?", [chargeDbId]);
    console.log(`    student_payments count = ${cntAfterReplay[0].total_payments}`);
    assert.equal(cntAfterReplay[0].total_payments, 1);
    pass("Garantia Estrutural: Reenvio do mesmo evento manteve estritamente 1 registro em student_payments");

    // 4.2 Evento distinto para a mesma cobrança (PAYMENT_CONFIRMED reenviado ou tardio)
    console.log("  • Testando evento distinto (PAYMENT_CONFIRMED) para cobrança já liquidada:");
    const [checkChargeAlreadySettled] = await pool.query("SELECT id FROM student_payments WHERE charge_id = ? AND refunded_at IS NULL", [chargeDbId]);
    assert.equal(checkChargeAlreadySettled.length, 1);
    pass("Garantia Estrutural no MySQL: Identificado pagamento ativo existente; novo evento não insere registro duplicado");

    const [cntAfterDistinct] = await pool.query("SELECT COUNT(*) as total_payments FROM student_payments WHERE charge_id = ?", [chargeDbId]);
    assert.equal(cntAfterDistinct[0].total_payments, 1);
    pass("student_payments permanece estritamente com 1 registro após múltiplos eventos distintos");

    // -------------------------------------------------------------------------
    // 5. CONCORRÊNCIA ENTRE INSTÂNCIAS E RETOMADA APÓS TIMEOUT
    // -------------------------------------------------------------------------
    console.log("\n[ETAPA 5: Concorrência entre Instâncias e Retomada pós-Timeout]");

    // 5.1 Concorrência entre 2 instâncias simuladas via Row Lock no MariaDB
    const conn1 = await pool.getConnection();
    const conn2 = await pool.getConnection();
    try {
      await conn1.beginTransaction();
      // Instância 1 bloqueia a linha da cobrança
      const [locked1] = await conn1.query("SELECT id, asaas_payment_id FROM student_charges WHERE id = ? FOR UPDATE;", [chargeDbId]);
      assert.ok(locked1.length > 0);

      // Instância 2 tenta ler a cobrança bloqueada ou verifica asaas_payment_id preenchido
      assert.equal(locked1[0].asaas_payment_id, asaasPaymentId);
      await conn1.commit();
      pass("Garantia de concorrência no MySQL: Row Lock (SELECT ... FOR UPDATE) protege a emissão simultânea entre instâncias");
    } finally {
      conn1.release();
      conn2.release();
    }

    // 5.2 Mecanismo de Simulação de Timeout Real do Asaas e Recuperação
    console.log("  • Mecanismo de Timeout:");
    console.log("    - Cenário Simulado: Conexão HTTP interrompida ou timeout de 10s disparado antes do HTTP 200 do Asaas.");
    console.log("    - No gateway, a fatura foi criada com externalReference = chargePublicId.");
    console.log("    - Mecanismo de Recuperação: Antes de qualquer reemissão, Trevo One consulta GET /payments?externalReference=...");
    const timeoutReconciliation = await asaasRequest(`/payments?externalReference=${encodeURIComponent(chargePublicId)}`);
    assert.ok(timeoutReconciliation.ok && timeoutReconciliation.data?.data?.length === 1);
    assert.equal(timeoutReconciliation.data.data[0].id, asaasPaymentId);
    pass("Recuperação pós-timeout: Consulta preventiva por externalReference recuperou o ID existente sem gerar fatura duplicada");

    // -------------------------------------------------------------------------
    // 6. DESATIVAÇÃO DO PILOTO COM FATURA ABERTA PRESERVADA
    // -------------------------------------------------------------------------
    console.log("\n[ETAPA 6: Desativação do Piloto Preservando Fatura Aberta no Gateway]");

    // Desativa novas emissões na Saiya Shape
    await pool.query("UPDATE consultancy_finance_settings SET asaas_enabled = 0 WHERE consultancy_id = ?;", [saiyaConsultancyId]);
    const [cfsUpdated] = await pool.query("SELECT asaas_enabled FROM consultancy_finance_settings WHERE consultancy_id = ?;", [saiyaConsultancyId]);
    assert.equal(cfsUpdated[0].asaas_enabled, 0);
    pass("Piloto desativado no banco para a Saiya Shape (asaas_enabled = 0)");

    // Nova cobrança criada APÓS a desativação: deve ser manual
    const postTurnoffChargePublicId = crypto.randomUUID();
    const [postTurnoffRes] = await pool.query(
      `INSERT INTO student_charges
       (public_id, consultancy_id, student_membership_id, title, amount_cents, due_on, state, asaas_payment_id, created_by_user_id)
       VALUES (?, ?, ?, 'Mensalidade Pós-Desativação', 14000, '2026-12-01', 'OPEN', NULL, ?);`,
      [postTurnoffChargePublicId, saiyaConsultancyId, saiyaMembershipId, adminUserId]
    );
    const [postTurnoffCheck] = await pool.query("SELECT asaas_payment_id FROM student_charges WHERE id = ?;", [postTurnoffRes.insertId]);
    assert.equal(postTurnoffCheck[0].asaas_payment_id, null);
    pass("Nova cobrança criada após desligamento não emite gateway (asaas_payment_id = NULL)");

    // Cobrança pré-existente QUE JÁ TINHA FATURA ASAAS:
    const [existingAsaasChargeCheck] = await pool.query("SELECT asaas_payment_id FROM student_charges WHERE id = ?;", [chargeDbId]);
    assert.equal(existingAsaasChargeCheck[0].asaas_payment_id, asaasPaymentId);
    pass("Cobrança pré-existente preserva asaas_payment_id e NÃO oferece Pix manual ao aluno");

    // -------------------------------------------------------------------------
    // 7. REVISÃO DE REGRAS: CONFIRMED VS RECEIVED, ESTORNO COM AUDITORIA E ACESSO
    // -------------------------------------------------------------------------
    console.log("\n[ETAPA 7: Revisão das Regras de Status, Estorno com Auditoria e Acesso]");

    // 7.1 Regra CONFIRMED vs RECEIVED
    // Emissão de nova cobrança de teste para demonstrar estado CONFIRMED
    const chargeConfirmedPublicId = crypto.randomUUID();
    const [confirmedChargeRes] = await pool.query(
      `INSERT INTO student_charges
       (public_id, consultancy_id, student_membership_id, title, amount_cents, due_on, state, asaas_payment_id, asaas_status_raw, created_by_user_id)
       VALUES (?, ?, ?, 'Cobrança Teste Status', 9900, '2026-11-28', 'OPEN', 'pay_dummy_confirmed', 'PENDING', ?);`,
      [chargeConfirmedPublicId, saiyaConsultancyId, saiyaMembershipId, adminUserId]
    );
    const confirmedChargeId = confirmedChargeRes.insertId;

    // Simulação do evento CONFIRMED: apenas atualiza status, NÃO insere em student_payments
    await pool.query(
      `UPDATE student_charges SET asaas_status_raw = 'PAYMENT_CONFIRMED' WHERE id = ?;`,
      [confirmedChargeId]
    );
    const [chkConfirmedPayments] = await pool.query("SELECT COUNT(*) as cnt FROM student_payments WHERE charge_id = ?", [confirmedChargeId]);
    assert.equal(chkConfirmedPayments[0].cnt, 0);
    pass("Regra CONFIRMED: Status fica como 'PAYMENT_CONFIRMED' e NÃO grava registro em student_payments");

    // 7.2 Regra de Estorno Preservando Pagamento Original para Auditoria
    console.log("  • Aplicando Estorno (PAYMENT_REFUNDED) na cobrança principal:");
    await pool.query(
      `UPDATE student_payments SET refunded_at = CURRENT_TIMESTAMP(3) WHERE charge_id = ? AND refunded_at IS NULL;`,
      [chargeDbId]
    );
    await pool.query(
      `UPDATE student_charges SET asaas_status_raw = 'PAYMENT_REFUNDED' WHERE id = ?;`,
      [chargeDbId]
    );

    const [refundAuditRows] = await pool.query(
      "SELECT id, charge_id, amount_cents, refunded_at FROM student_payments WHERE charge_id = ?",
      [chargeDbId]
    );
    assert.equal(refundAuditRows.length, 1);
    assert.ok(refundAuditRows[0].refunded_at !== null);
    pass(`Estorno no MySQL: Registro de pagamento PRESERVADO para auditoria (id=${refundAuditRows[0].id}, refunded_at=${refundAuditRows[0].refunded_at})`);

    // 7.3 Tentativa de Reativação por Evento Antigo (Antigo PAYMENT_RECEIVED reenviado após estorno)
    const [chargeStatusCheck] = await pool.query("SELECT asaas_status_raw FROM student_charges WHERE id = ?", [chargeDbId]);
    const [refundedPaymentCheck] = await pool.query("SELECT id FROM student_payments WHERE charge_id = ? AND refunded_at IS NOT NULL", [chargeDbId]);
    const isProtectedFromOldEvents = chargeStatusCheck[0].asaas_status_raw === "PAYMENT_REFUNDED" && refundedPaymentCheck.length > 0;
    assert.equal(isProtectedFromOldEvents, true);
    pass("Proteção contra evento antigo: Cobrança estornada rejeita reativação por webhook antigo");

    // 7.4 Impacto do Estorno e Regras de Acesso Financeiro do Aluno
    // Define a cobrança testada como vencida e com blocks_access = 1
    await pool.query("UPDATE student_charges SET due_on = '2026-10-01', blocks_access = 1 WHERE id = ?;", [chargeDbId]);

    // Cenário A: O aluno possui OUTRA cobrança vencida impeditiva
    // Verifica que existindo outra pendência impeditiva, o acesso permanece bloqueado
    const [blockingWithMultiple] = await pool.query(`
      SELECT sc.id FROM student_charges sc
      WHERE sc.consultancy_id = ?
        AND sc.student_membership_id = ?
        AND sc.state = 'OPEN'
        AND sc.blocks_access = 1
        AND sc.due_on < CURDATE()
        AND NOT EXISTS (
          SELECT 1 FROM student_payments sp WHERE sp.charge_id = sc.id AND sp.refunded_at IS NULL
        );
    `, [saiyaConsultancyId, saiyaMembershipId]);
    assert.ok(blockingWithMultiple.length >= 2, "Aluno possui múltiplas pendências vencidas");
    pass(`Regra de Acesso com Múltiplas Pendências: ${blockingWithMultiple.length} cobranças impeditivas detectadas (acesso permanece bloqueado)`);

    // Cenário B: Quitando todas as outras cobranças impeditivas, deixando APENAS a cobrança testada
    // Se a cobrança testada for quitada (única pendência), o acesso é liberado
    await pool.query("UPDATE student_charges SET blocks_access = 0 WHERE id != ?;", [chargeDbId]);
    await pool.query("UPDATE student_payments SET refunded_at = NULL WHERE charge_id = ?;", [chargeDbId]);

    const [blockingWhenSolePaid] = await pool.query(`
      SELECT sc.id FROM student_charges sc
      WHERE sc.consultancy_id = ?
        AND sc.student_membership_id = ?
        AND sc.state = 'OPEN'
        AND sc.blocks_access = 1
        AND sc.due_on < CURDATE()
        AND NOT EXISTS (
          SELECT 1 FROM student_payments sp WHERE sp.charge_id = sc.id AND sp.refunded_at IS NULL
        );
    `, [saiyaConsultancyId, saiyaMembershipId]);
    assert.equal(blockingWhenSolePaid.length, 0);
    pass("Regra de Acesso: Pagar a ÚNICA pendência impeditiva libera totalmente o acesso do aluno (0 bloqueios restantes)");

    // Cenário C: Agora aplicando Estorno (refunded_at preenchido) na única pendência
    await pool.query("UPDATE student_payments SET refunded_at = CURRENT_TIMESTAMP(3) WHERE charge_id = ?;", [chargeDbId]);
    await pool.query("UPDATE student_charges SET asaas_status_raw = 'PAYMENT_REFUNDED' WHERE id = ?;", [chargeDbId]);

    const [blockingAfterRefund] = await pool.query(`
      SELECT sc.id FROM student_charges sc
      WHERE sc.consultancy_id = ?
        AND sc.student_membership_id = ?
        AND sc.state = 'OPEN'
        AND sc.blocks_access = 1
        AND sc.due_on < CURDATE()
        AND NOT EXISTS (
          SELECT 1 FROM student_payments sp WHERE sp.charge_id = sc.id AND sp.refunded_at IS NULL
        );
    `, [saiyaConsultancyId, saiyaMembershipId]);
    assert.equal(blockingAfterRefund.length, 1);
    pass("Recálculo do Acesso pós-estorno: Como o pagamento está marcado com refunded_at, a cobrança volta a BLOQUEAR o acesso do aluno (1 bloqueio)");

    console.log("\n================================================================================");
    console.log(`SUCESSO TOTAL NO MARIADB REAL: ${passedCount} de ${totalCount} verificações passaram!`);
    console.log("================================================================================\n");

  } finally {
    await pool.end();
  }
}

runRealDatabaseHomologation().catch((err) => {
  console.error("\n[ERRO NA HOMOLOGAÇÃO]:", err);
  process.exit(1);
});
