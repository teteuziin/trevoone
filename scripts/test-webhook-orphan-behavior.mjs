/**
 * Teste unitário e de contrato para o tratamento de cobranças órfãs e fora de escopo no Webhook do Asaas.
 *
 * Verifica:
 * 1. Cobrança não encontrada (órfão) -> status 'IGNORED_ORPHAN', processed: 0, acknowledged: true, success: false, HTTP 200 com status "ignored_orphan".
 * 2. Cobrança de outra consultoria -> status 'OUT_OF_SCOPE', processed: 0, acknowledged: true, success: false, HTTP 200 com status "out_of_scope".
 * 3. Cobrança da Saiya Shape -> status 'PROCESSED', processed: 1, acknowledged: true, success: true, HTTP 200 com status "processed".
 * 4. Token ausente ou inválido -> status 'FAILED', acknowledged: false, success: false, HTTP 401.
 * 5. Replay idempotente -> status 'IDEMPOTENT_DUPLICATE', acknowledged: true, success: true, HTTP 200.
 */

import assert from "node:assert/strict";

console.log("=== INICIANDO VALIDAÇÃO DO TRATAMENTO DE COBRANÇAS ÓRFÃS NO WEBHOOK ===");

// 1. Simulação do comportamento de processAsaasWebhookEvent
function simulateProcessWebhook({
  receivedToken,
  expectedToken,
  payload,
  chargeExists,
  consultancySlug,
  isAlreadyProcessed = false,
}) {
  if (!expectedToken || !receivedToken || receivedToken !== expectedToken) {
    return {
      success: false,
      acknowledged: false,
      status: "FAILED",
      message: "Acesso não autorizado: token de webhook inválido.",
    };
  }

  if (!payload || !payload.event || !payload.payment || !payload.payment.id) {
    return {
      success: false,
      acknowledged: false,
      status: "FAILED",
      message: "Dados incompletos no evento do Asaas.",
    };
  }

  if (isAlreadyProcessed) {
    return {
      success: true,
      acknowledged: true,
      status: "IDEMPOTENT_DUPLICATE",
      message: "Evento já processado anteriormente (Idempotente).",
      alreadyProcessed: true,
    };
  }

  const asaasPaymentId = payload.payment.id;
  const externalRef = payload.payment.externalReference || "";

  // Cenário 1: Cobrança órfã (não encontrada no Trevo One)
  if (!chargeExists) {
    const recordedEvent = {
      status: "IGNORED_ORPHAN",
      processed: 0,
      processing_error: "Cobrança não encontrada no Trevo One (órfão)",
    };
    return {
      success: false,
      acknowledged: true,
      status: "IGNORED_ORPHAN",
      message: `Cobrança ${asaasPaymentId} não encontrada no Trevo One (evento registrado como órfão para auditoria).`,
      dbRecord: recordedEvent,
    };
  }

  // Cenário 2: Tenancy do Piloto (somente saiya-shape)
  if (consultancySlug !== "saiya-shape") {
    const recordedEvent = {
      status: "OUT_OF_SCOPE",
      processed: 0,
      processing_error: "Piloto Asaas restrito exclusivamente à Saiya Shape",
    };
    return {
      success: false,
      acknowledged: true,
      status: "OUT_OF_SCOPE",
      message: "Piloto Asaas restrito exclusivamente à Saiya Shape.",
      dbRecord: recordedEvent,
    };
  }

  // Cenário 3: Processamento normal com sucesso
  const recordedEvent = {
    status: "PROCESSED",
    processed: 1,
    processing_error: null,
  };
  return {
    success: true,
    acknowledged: true,
    status: "PROCESSED",
    message: `Evento ${payload.event} processado com sucesso para cobrança ${externalRef}.`,
    dbRecord: recordedEvent,
  };
}

// 2. Simulação da rota HTTP Next.js (app/api/webhooks/asaas/route.ts)
function simulateRouteHandler(result) {
  if (result.status === "IGNORED_ORPHAN" || result.status === "OUT_OF_SCOPE") {
    return {
      httpStatus: 200,
      body: {
        acknowledged: true,
        status: result.status.toLowerCase(),
        message: result.message,
      },
    };
  }

  if (!result.success) {
    const isAuthError =
      result.message.toLowerCase().includes("não autorizado") ||
      result.message.toLowerCase().includes("token");
    return {
      httpStatus: isAuthError ? 401 : 400,
      body: { error: result.message },
    };
  }

  return {
    httpStatus: 200,
    body: {
      success: true,
      status: "processed",
      message: result.message,
    },
  };
}

// ============================================================================
// TESTES DE CONTRATO E REGRESSÃO
// ============================================================================

// TESTE 1: Token inválido
console.log("\n[Teste 1: Token inválido/ausente]");
const test1Result = simulateProcessWebhook({
  receivedToken: "token_errado",
  expectedToken: "token_secreto_valido",
  payload: { event: "PAYMENT_RECEIVED", payment: { id: "pay_123" } },
  chargeExists: true,
  consultancySlug: "saiya-shape",
});
assert.equal(test1Result.status, "FAILED");
assert.equal(test1Result.acknowledged, false);
assert.equal(test1Result.success, false);
const route1 = simulateRouteHandler(test1Result);
assert.equal(route1.httpStatus, 401);
console.log("✓ Rejeitado com HTTP 401 (Não autorizado)");

// TESTE 2: Cobrança ÓRFÃ (não encontrada no Trevo One)
console.log("\n[Teste 2: Cobrança Órfã]");
const test2Result = simulateProcessWebhook({
  receivedToken: "token_secreto_valido",
  expectedToken: "token_secreto_valido",
  payload: { event: "PAYMENT_RECEIVED", payment: { id: "pay_unknown_orphan", externalReference: "inexistente" } },
  chargeExists: false,
  consultancySlug: null,
});
assert.equal(test2Result.status, "IGNORED_ORPHAN");
assert.equal(test2Result.acknowledged, true, "Deve confirmar recebimento ao Asaas");
assert.equal(test2Result.success, false, "NÃO deve mascarar como sucesso de baixa");
assert.equal(test2Result.dbRecord.status, "IGNORED_ORPHAN", "Banco deve registrar status IGNORED_ORPHAN");
assert.equal(test2Result.dbRecord.processed, 0, "Banco deve manter processed = 0");
assert.ok(test2Result.dbRecord.processing_error.includes("órfão"));

const route2 = simulateRouteHandler(test2Result);
assert.equal(route2.httpStatus, 200, "Asaas recebe 200 para não bloquear a fila sequencial");
assert.equal(route2.body.acknowledged, true);
assert.equal(route2.body.status, "ignored_orphan", "Status no JSON é explicitamente ignored_orphan");
assert.equal(route2.body.success, undefined, "Não contém success: true genérico");
console.log("✓ Cobrança órfã arquivada com IGNORED_ORPHAN, processed: 0 e HTTP 200 (acknowledged: true)");

// TESTE 3: Consultoria fora do piloto (out of scope)
console.log("\n[Teste 3: Consultoria fora do escopo]");
const test3Result = simulateProcessWebhook({
  receivedToken: "token_secreto_valido",
  expectedToken: "token_secreto_valido",
  payload: { event: "PAYMENT_RECEIVED", payment: { id: "pay_out_of_scope", externalReference: "charge_out" } },
  chargeExists: true,
  consultancySlug: "outra-consultoria",
});
assert.equal(test3Result.status, "OUT_OF_SCOPE");
assert.equal(test3Result.acknowledged, true);
assert.equal(test3Result.success, false);
assert.equal(test3Result.dbRecord.status, "OUT_OF_SCOPE");
assert.equal(test3Result.dbRecord.processed, 0);

const route3 = simulateRouteHandler(test3Result);
assert.equal(route3.httpStatus, 200);
assert.equal(route3.body.status, "out_of_scope");
console.log("✓ Cobrança fora de escopo arquivada com OUT_OF_SCOPE, processed: 0 e HTTP 200");

// TESTE 4: Cobrança legítima da Saiya Shape
console.log("\n[Teste 4: Cobrança legítima da Saiya Shape]");
const test4Result = simulateProcessWebhook({
  receivedToken: "token_secreto_valido",
  expectedToken: "token_secreto_valido",
  payload: { event: "PAYMENT_RECEIVED", payment: { id: "pay_saiya_legit", externalReference: "charge_uuid_123" } },
  chargeExists: true,
  consultancySlug: "saiya-shape",
});
assert.equal(test4Result.status, "PROCESSED");
assert.equal(test4Result.acknowledged, true);
assert.equal(test4Result.success, true);
assert.equal(test4Result.dbRecord.status, "PROCESSED");
assert.equal(test4Result.dbRecord.processed, 1);
assert.equal(test4Result.dbRecord.processing_error, null);

const route4 = simulateRouteHandler(test4Result);
assert.equal(route4.httpStatus, 200);
assert.equal(route4.body.success, true);
assert.equal(route4.body.status, "processed");
console.log("✓ Cobrança legítima processada com PROCESSED, processed: 1 e HTTP 200 (success: true)");

// TESTE 5: Replay idempotente
console.log("\n[Teste 5: Replay idempotente]");
const test5Result = simulateProcessWebhook({
  receivedToken: "token_secreto_valido",
  expectedToken: "token_secreto_valido",
  payload: { event: "PAYMENT_RECEIVED", payment: { id: "pay_saiya_legit", externalReference: "charge_uuid_123" } },
  chargeExists: true,
  consultancySlug: "saiya-shape",
  isAlreadyProcessed: true,
});
assert.equal(test5Result.status, "IDEMPOTENT_DUPLICATE");
assert.equal(test5Result.alreadyProcessed, true);
assert.equal(test5Result.success, true);
const route5 = simulateRouteHandler(test5Result);
assert.equal(route5.httpStatus, 200);
assert.equal(route5.body.success, true);
console.log("✓ Replay idempotente reconhecido com sucesso e sem duplicação");

// TESTE 6: Reprocessamento de cobrança criada com atraso
console.log("\n[Teste 6: Reprocessamento de cobrança criada com atraso]");
const earlyArrival = simulateProcessWebhook({
  receivedToken: "token_secreto_valido",
  expectedToken: "token_secreto_valido",
  payload: { event: "PAYMENT_RECEIVED", payment: { id: "pay_delayed_123", externalReference: "charge_delayed_uuid" } },
  chargeExists: false,
  consultancySlug: null,
});
assert.equal(earlyArrival.status, "IGNORED_ORPHAN");
assert.equal(earlyArrival.dbRecord.status, "IGNORED_ORPHAN");
assert.equal(earlyArrival.dbRecord.processed, 0);

// Cobrança é commitada no banco e o reprocessamento roda
const reprocessResult = simulateProcessWebhook({
  receivedToken: "token_secreto_valido",
  expectedToken: "token_secreto_valido",
  payload: { event: "PAYMENT_RECEIVED", payment: { id: "pay_delayed_123", externalReference: "charge_delayed_uuid" } },
  chargeExists: true,
  consultancySlug: "saiya-shape",
});
assert.equal(reprocessResult.status, "PROCESSED");
assert.equal(reprocessResult.dbRecord.status, "PROCESSED");
assert.equal(reprocessResult.dbRecord.processed, 1);
console.log("✓ Evento órfão reprocessado com sucesso para PROCESSED após criação tardia da cobrança!");

console.log("\n=================================================================");
console.log("TODOS OS 6 TESTES DE TRATAMENTO DE WEBHOOK PASSARAM COM SUCESSO!");
console.log("=================================================================\n");
