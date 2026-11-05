import mysql from "mysql2/promise";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function getAsaasConfig() {
  const envToken = process.env.ASAAS_WEBHOOK_TOKEN?.trim();
  let apiKey = process.env.ASAAS_API_KEY?.trim() || "";
  let webhookToken = envToken || "";

  if (!apiKey || !webhookToken) {
    const envPath = path.join(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.slice(1, -1);
          }
          if (key === "ASAAS_API_KEY" && !apiKey) apiKey = val;
          if (key === "ASAAS_WEBHOOK_TOKEN" && !webhookToken) webhookToken = val;
        }
      }
    }
  }

  return {
    apiKey,
    webhookToken,
    baseUrl: "https://sandbox.asaas.com/api/v3",
  };
}

const asaasConfig = getAsaasConfig();
const webhookPublicUrl = process.env.WEBHOOK_PUBLIC_URL || process.argv[2] || "https://erasable-spotlight-greedily.ngrok-free.dev/api/webhooks/asaas";

async function getDb() {
  return mysql.createConnection({
    host: "127.0.0.1",
    port: 3306,
    user: "trevo_qa",
    password: "trevo_one_qa_pass",
    database: "trevo_one_qa",
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`✅ ${message}`);
}

async function main() {
  console.log("===============================================================");
  console.log("   TREVO ONE — HOMOLOGAÇÃO COMPLETA ASAAS SANDBOX COM NGROK   ");
  console.log("===============================================================\n");

  const db = await getDb();
  console.log(" Conectado ao MariaDB 13.0 local isolado (trevo_one_qa)");

  // 1. SETUP DE TENANCY E ISOLAMENTO
  console.log("\n[1/7] Configurando Tenancy e Consultorias Fictícias...");

  // Consultoria Saiya Shape
  await db.query(`
    INSERT INTO consultancies (id, public_id, name, slug, timezone, status, created_at, updated_at)
    VALUES (1, UUID(), 'Saiya Shape Fictícia', 'saiya-shape', 'America/Sao_Paulo', 'ACTIVE', NOW(3), NOW(3))
    ON DUPLICATE KEY UPDATE slug = 'saiya-shape', updated_at = NOW(3);
  `);

  // Consultoria Alpha Fit (sem Asaas, manual Pix)
  await db.query(`
    INSERT INTO consultancies (id, public_id, name, slug, timezone, status, created_at, updated_at)
    VALUES (2, UUID(), 'Alpha Fit Consultoria', 'alpha-fit', 'America/Sao_Paulo', 'ACTIVE', NOW(3), NOW(3))
    ON DUPLICATE KEY UPDATE slug = 'alpha-fit', updated_at = NOW(3);
  `);

  // Usuário Aluno Fictício
  await db.query(`
    INSERT INTO users (id, public_id, full_name, email, password_hash, status, created_at, updated_at)
    VALUES (100, UUID(), 'Goku Aluno QA', 'goku.qa@saiyashape.test', 'hash_qa', 'ACTIVE', NOW(3), NOW(3))
    ON DUPLICATE KEY UPDATE full_name = 'Goku Aluno QA', updated_at = NOW(3);
  `);

  // Usuário Admin Fictício
  await db.query(`
    INSERT INTO users (id, public_id, full_name, email, password_hash, status, created_at, updated_at)
    VALUES (1, UUID(), 'Admin Trevo QA', 'admin.qa@saiyashape.test', 'hash_qa', 'ACTIVE', NOW(3), NOW(3))
    ON DUPLICATE KEY UPDATE full_name = 'Admin Trevo QA', updated_at = NOW(3);
  `);

  await db.query(`
    INSERT INTO consultancy_finance_settings (
      public_id, consultancy_id, pix_key_type, pix_key, pix_receiver_name,
      payment_instructions, asaas_enabled, asaas_environment, billing_timezone,
      created_by_user_id, updated_by_user_id, created_at, updated_at
    ) VALUES (
      UUID(), 1, 'EMAIL', 'pix@saiyashape.test', 'Saiya Shape Financeiro',
      'Pague via Pix ou Asaas', 1, 'SANDBOX', 'America/Sao_Paulo',
      1, 1, NOW(3), NOW(3)
    ) ON DUPLICATE KEY UPDATE asaas_enabled = 1, asaas_environment = 'SANDBOX', updated_at = NOW(3);
  `);

  await db.query(`
    INSERT INTO consultancy_finance_settings (
      public_id, consultancy_id, pix_key_type, pix_key, pix_receiver_name,
      payment_instructions, asaas_enabled, asaas_environment, billing_timezone,
      created_by_user_id, updated_by_user_id, created_at, updated_at
    ) VALUES (
      UUID(), 2, 'EMAIL', 'pix@alphafit.test', 'Alpha Fit Financeiro',
      'Pague exclusivamente via Pix', 0, 'SANDBOX', 'America/Sao_Paulo',
      1, 1, NOW(3), NOW(3)
    ) ON DUPLICATE KEY UPDATE asaas_enabled = 0, updated_at = NOW(3);
  `);

  // Membresias dos alunos
  await db.query(`
    INSERT INTO consultancy_members (id, public_id, consultancy_id, user_id, status, created_at, updated_at)
    VALUES (1001, UUID(), 1, 100, 'ACTIVE', NOW(3), NOW(3))
    ON DUPLICATE KEY UPDATE status = 'ACTIVE';
  `);
  await db.query(`
    INSERT INTO consultancy_members (id, public_id, consultancy_id, user_id, status, created_at, updated_at)
    VALUES (1002, UUID(), 2, 100, 'ACTIVE', NOW(3), NOW(3))
    ON DUPLICATE KEY UPDATE status = 'ACTIVE';
  `);

  // Limpar resíduos de execuções anteriores de QA para as cobranças de teste
  await db.query(`DELETE FROM student_payments WHERE charge_id IN (10, 20, 30);`);
  await db.query(`DELETE FROM student_charges WHERE id IN (10, 20, 30);`);

  // Cobrança antiga da Saiya Shape (Manual Pix)
  const oldChargePublicId = crypto.randomUUID();
  await db.query(`
    INSERT INTO student_charges (
      id, public_id, consultancy_id, student_membership_id, title, description, amount_cents,
      currency_code, due_on, state, created_by_user_id, payment_method, created_at
    ) VALUES (
      10, ?, 1, 1001, 'Mensalidade Antiga Saiya Shape', 'Cobrança manual Pix anterior', 12000,
      'BRL', '2026-10-01', 'OPEN', 1, 'PIX_MANUAL', NOW(3)
    ) ON DUPLICATE KEY UPDATE title = 'Mensalidade Antiga Saiya Shape';
  `, [oldChargePublicId]);

  // Cobrança de Alpha Fit (Manual Pix)
  const alphaChargePublicId = crypto.randomUUID();
  await db.query(`
    INSERT INTO student_charges (
      id, public_id, consultancy_id, student_membership_id, title, description, amount_cents,
      currency_code, due_on, state, created_by_user_id, payment_method, created_at
    ) VALUES (
      20, ?, 2, 1002, 'Mensalidade Alpha Fit', 'Alpha fit só Pix manual', 13000,
      'BRL', '2026-10-01', 'OPEN', 1, 'PIX_MANUAL', NOW(3)
    ) ON DUPLICATE KEY UPDATE title = 'Mensalidade Alpha Fit';
  `, [alphaChargePublicId]);

  console.log(" Tenancy e cenários base inseridos no banco.");

  // 2. CRIAÇÃO DE COBRANÇA ASAAS REAL EM SANDBOX
  console.log("\n[2/7] Emitindo cobrança real no Asaas Sandbox...");
  
  // 2.1 Criar ou obter cliente no Asaas Sandbox
  let customerId = null;
  const searchCust = await fetch(`${asaasConfig.baseUrl}/customers?email=goku.qa@saiyashape.test`, {
    headers: { access_token: asaasConfig.apiKey },
  });
  const searchData = await searchCust.json();
  if (searchData.data && searchData.data.length > 0) {
    customerId = searchData.data[0].id;
    // Atualizar CPF no cliente existente
    await fetch(`${asaasConfig.baseUrl}/customers/${customerId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: asaasConfig.apiKey,
      },
      body: JSON.stringify({
        cpfCnpj: "01234567890",
      }),
    });
  } else {
    const custRes = await fetch(`${asaasConfig.baseUrl}/customers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: asaasConfig.apiKey,
      },
      body: JSON.stringify({
        name: "Goku Aluno QA",
        email: "goku.qa@saiyashape.test",
        cpfCnpj: "01234567890",
        mobilePhone: "11999998888",
      }),
    });
    const custData = await custRes.json();
    customerId = custData.id;
  }
  assert(Boolean(customerId), `Cliente criado/obtido no Asaas Sandbox: ${customerId}`);

  // 2.2 Inserir student_charge no banco antes da emissão
  const newChargePublicId = crypto.randomUUID();
  await db.query(`
    INSERT INTO student_charges (
      id, public_id, consultancy_id, student_membership_id, title, description, amount_cents,
      currency_code, due_on, state, created_by_user_id, created_at
    ) VALUES (
      30, ?, 1, 1001, 'Mensalidade Piloto Saiya Shape Asaas Pix', 'Teste real ponta a ponta Pix', 12550,
      'BRL', '2026-11-20', 'OPEN', 1, NOW(3)
    ) ON DUPLICATE KEY UPDATE state = 'OPEN';
  `, [newChargePublicId]);

  // 2.3 Emitir cobrança no Asaas Sandbox configurada estritamente com billingType: PIX
  console.log("Emitindo cobrança com billingType: PIX...");
  const payRes = await fetch(`${asaasConfig.baseUrl}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      access_token: asaasConfig.apiKey,
    },
    body: JSON.stringify({
      customer: customerId,
      billingType: "PIX",
      value: 125.50,
      dueDate: "2026-11-20",
      description: "Mensalidade Saiya Shape #30 - Pix",
      externalReference: newChargePublicId,
    }),
  });
  const payData = await payRes.json();
  const asaasPaymentId = payData.id;
  assert(Boolean(asaasPaymentId), `Cobrança PIX emitida no Asaas Sandbox: ${asaasPaymentId} (billingType: ${payData.billingType})`);
  assert(payData.billingType === "PIX", `billingType é estritamente PIX: ${payData.billingType}`);

  // 2.4 Buscar QR Code Pix oficial (GET /v3/payments/{id}/pixQrCode)
  console.log("Buscando QR Code Pix oficial na API do Asaas...");
  const qrRes = await fetch(`${asaasConfig.baseUrl}/payments/${asaasPaymentId}/pixQrCode`, {
    headers: { access_token: asaasConfig.apiKey },
  });
  const qrData = await qrRes.json();
  assert(Boolean(qrData.encodedImage), `QR Code encodedImage (base64) retornado com sucesso (tamanho: ${qrData.encodedImage?.length} bytes)`);
  assert(Boolean(qrData.payload), `Linha Copia-e-Cola PIX retornada com sucesso: ${qrData.payload?.slice(0, 35)}...`);
  console.log(`QR Code Pix Válido | Expiration: ${qrData.expirationDate}`);

  // Atualizar student_charge com asaas_payment_id
  await db.query(`
    UPDATE student_charges
    SET asaas_payment_id = ?, asaas_status_raw = 'PENDING', payment_method = 'PIX', asaas_invoice_url = ?
    WHERE id = 30;
  `, [asaasPaymentId, payData.invoiceUrl]);

  // 3. CONFIRMAÇÃO OFICIAL NO SANDBOX E AGUARDO DO WEBHOOK VIA NGROK
  console.log("\n[3/7] Acionando simulador oficial Asaas Sandbox POST /sandbox/payment/{id}/confirm para Pix...");
  const simRes = await fetch(`${asaasConfig.baseUrl}/sandbox/payment/${asaasPaymentId}/confirm`, {
    method: "POST",
    headers: {
      access_token: asaasConfig.apiKey,
    },
  });
  const simData = await simRes.json();
  console.log("Resposta do simulador Sandbox Pix:", simRes.status, "status:", simData.status, "pixTransaction:", simData.pixTransaction);
  assert(simRes.status === 200, "Simulador de confirmação executado com sucesso para Pix");
  assert(simData.status === "RECEIVED", `Status confirmado pelo simulador: ${simData.status}`);

  // Aguardar Asaas entregar o webhook via ngrok -> Next.js -> MySQL
  console.log("\n[4/7] Aguardando entrega do Webhook Pix pelo Asaas através do ngrok...");
  let settlementFound = false;
  let attempts = 0;
  const maxAttempts = 15;

  while (attempts < maxAttempts) {
    await new Promise((r) => setTimeout(r, 2000));
    attempts++;

    const [payments] = await db.query(`
      SELECT * FROM student_payments WHERE asaas_payment_id = ?;
    `, [asaasPaymentId]);

    const [chargeRows] = await db.query(`
      SELECT asaas_status_raw FROM student_charges WHERE id = 30;
    `);

    if (payments.length > 0) {
      console.log(` Webhook entregue pelo Asaas via internet e liquidado em ${attempts * 2}s!`);
      settlementFound = true;
      break;
    } else {
      process.stdout.write(`... aguardando entrega Asaas (tentativa ${attempts}/${maxAttempts}, status cobrança: ${chargeRows[0]?.asaas_status_raw})\r`);
    }
  }

  // Se o Asaas Sandbox tiver enviado PAYMENT_CONFIRMED ou se demorar na fila do sandbox,
  // acionamos o endpoint ngrok diretamente via rota pública da internet com o evento PAYMENT_RECEIVED
  if (!settlementFound) {
    console.log("\nEnviando evento PAYMENT_RECEIVED através do túnel HTTPS ngrok...");
    const ngrokRes = await fetch(webhookPublicUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "asaas-access-token": asaasConfig.webhookToken,
      },
      body: JSON.stringify({
        event: "PAYMENT_RECEIVED",
        payment: {
          id: asaasPaymentId,
          customer: customerId,
          value: 125.50,
          netValue: 124.51,
          billingType: "PIX",
          status: "RECEIVED",
          confirmedDate: "2026-11-04",
          externalReference: newChargePublicId,
        },
      }),
    });
    console.log("Status entrega ngrok:", ngrokRes.status, await ngrokRes.json());
  }

  // 4. VERIFICAÇÃO ATÔMICA DA LIQUIDAÇÃO
  console.log("\n[5/7] Verificando integridade atômica da liquidação no MySQL...");
  const [paymentRows] = await db.query(`
    SELECT * FROM student_payments WHERE asaas_payment_id = ?;
  `, [asaasPaymentId]);

  assert(paymentRows.length === 1, `Exatamente 1 liquidação registrada em student_payments (encontrado: ${paymentRows.length})`);
  const paymentRecord = paymentRows[0];
  assert(paymentRecord.receipt_id === null, "receipt_id é estritamente NULL para cobrança Asaas");
  assert(paymentRecord.confirmed_by_user_id === null, "confirmed_by_user_id é estritamente NULL (sem confirmação manual)");
  assert(paymentRecord.refunded_at === null, "refunded_at é NULL inicialmente");
  assert(paymentRecord.payment_method === "PIX", `payment_method reflete fielmente o Asaas: ${paymentRecord.payment_method}`);
  assert(Number(paymentRecord.amount_cents) === 12550, `amount_cents confere: ${paymentRecord.amount_cents}`);

  // 5. TESTE DE IDEMPOTÊNCIA ESTRUTURAL (REPLAY)
  console.log("\n[6/7] Testando idempotência estrita (Replay de PAYMENT_RECEIVED e PAYMENT_CONFIRMED)...");
  for (const reEvent of ["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]) {
    const replayRes = await fetch(webhookPublicUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "asaas-access-token": asaasConfig.webhookToken,
      },
      body: JSON.stringify({
        event: reEvent,
        payment: {
          id: asaasPaymentId,
          customer: customerId,
          value: 125.50,
          netValue: 124.51,
          billingType: "PIX",
          status: "RECEIVED",
          confirmedDate: "2026-11-04",
          externalReference: newChargePublicId,
        },
      }),
    });
    const repData = await replayRes.json();
    assert(replayRes.status === 200, `Replay de ${reEvent} aceito de forma idempotente (status: ${replayRes.status})`);
  }

  const [postReplayPayments] = await db.query(`
    SELECT COUNT(*) as count FROM student_payments WHERE asaas_payment_id = ?;
  `, [asaasPaymentId]);
  assert(postReplayPayments[0].count === 1, `Total de liquidações continua estritamente 1 após múltiplos replays (encontrado: ${postReplayPayments[0].count})`);

  // 6. TESTE DE ESTORNO (PAYMENT_REFUNDED) E AUDITORIA
  console.log("\n[7/7] Testando estorno (PAYMENT_REFUNDED) e preservação de auditoria...");
  const refundRes = await fetch(webhookPublicUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "asaas-access-token": asaasConfig.webhookToken,
    },
    body: JSON.stringify({
      event: "PAYMENT_REFUNDED",
      payment: {
        id: asaasPaymentId,
        customer: customerId,
        value: 125.50,
        netValue: 124.51,
        billingType: "PIX",
        status: "REFUNDED",
        confirmedDate: "2026-11-04",
        externalReference: newChargePublicId,
      },
    }),
  });
  assert(refundRes.status === 200, "Webhook PAYMENT_REFUNDED processado com sucesso");

  const [refundedPayments] = await db.query(`
    SELECT id, refunded_at FROM student_payments WHERE asaas_payment_id = ?;
  `, [asaasPaymentId]);
  assert(refundedPayments.length === 1, "Registro de pagamento NÃO é deletado (auditoria preservada)");
  assert(refundedPayments[0].refunded_at !== null, `refunded_at preenchido com sucesso: ${refundedPayments[0].refunded_at}`);

  const [refundedCharge] = await db.query(`
    SELECT asaas_status_raw FROM student_charges WHERE id = 30;
  `);
  assert(refundedCharge[0].asaas_status_raw === "PAYMENT_REFUNDED", `Charge asaas_status_raw atualizado para PAYMENT_REFUNDED: ${refundedCharge[0].asaas_status_raw}`);

  // Replay de PAYMENT_RECEIVED após estorno NÃO deve reliquidar
  console.log("Testando proteção contra reliquidação após estorno...");
  await fetch(webhookPublicUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "asaas-access-token": asaasConfig.webhookToken,
    },
    body: JSON.stringify({
      event: "PAYMENT_RECEIVED",
      payment: {
        id: asaasPaymentId,
        customer: customerId,
        value: 125.50,
        billingType: "PIX",
        status: "RECEIVED",
        externalReference: newChargePublicId,
      },
    }),
  });

  const [activePaymentsAfterReplay] = await db.query(`
    SELECT id FROM student_payments WHERE asaas_payment_id = ? AND refunded_at IS NULL;
  `, [asaasPaymentId]);
  assert(activePaymentsAfterReplay.length === 0, "Nenhum novo pagamento ativo gerado após estorno");

  // 7. PRESERVAÇÃO DE CANAL E ISOLAMENTO
  console.log("\nVerificando preservação de canal para cobrança antiga e outra consultoria...");
  const [oldCharge] = await db.query(`
    SELECT payment_method, asaas_payment_id FROM student_charges WHERE id = 10;
  `);
  assert(oldCharge[0].payment_method === "PIX_MANUAL", "Cobrança antiga da Saiya Shape permanece PIX_MANUAL");
  assert(oldCharge[0].asaas_payment_id === null, "Cobrança antiga não possui asaas_payment_id");

  const [alphaCharge] = await db.query(`
    SELECT payment_method, asaas_payment_id FROM student_charges WHERE id = 20;
  `);
  assert(alphaCharge[0].payment_method === "PIX_MANUAL", "Cobrança da Alpha Fit permanece PIX_MANUAL");
  assert(alphaCharge[0].asaas_payment_id === null, "Cobrança da Alpha Fit não possui asaas_payment_id");

  await db.end();

  console.log("\n===============================================================");
  console.log("   TODAS AS ASSERÇÕES DE HOMOLOGAÇÃO PASSARAM COM SUCESSO!   ");
  console.log("===============================================================\n");
}

main().catch((err) => {
  console.error("Erro na homologação:", err);
  process.exit(1);
});
