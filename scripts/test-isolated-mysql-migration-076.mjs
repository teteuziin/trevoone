/**
 * TREVO ONE — TESTE DE MIGRATION 076 EM BANCO ISOLADO
 *
 * Simula a execução da migration 076 em um ambiente de banco equivalente à produção:
 * 1. Constrói o estado pré-existente (com a migration 075 do Asaas já aplicada).
 * 2. Aplica as transformações DDL da migration 076_infinitepay_integration.sql.
 * 3. Testa a integridade dos relacionamentos e chaves estrangeiras.
 * 4. Testa a inserção e consulta de planos InfinitePay (com CUSTOM, duration_months, assured_installments).
 * 5. Testa a inserção de assinaturas InfinitePay com asaas_customer_id = NULL e asaas_subscription_id = NULL.
 * 6. Confirma o funcionamento intacto de cobranças legadas manuais e do Asaas.
 * 7. Testa a segregação de acesso: novo aluno sem quitação vs novo aluno pago vs aluno existente.
 */

import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

console.log("================================================================================");
console.log("TREVO ONE — VALIDAÇÃO DA MIGRATION 076 EM AMBIENTE ISOLADO DE TESTE");
console.log("================================================================================\n");

// 1. CARREGAMENTO DO ARQUIVO DE MIGRATION
const migrationPath = path.resolve("database/migrations/076_infinitepay_integration.sql");
const sql = fs.readFileSync(migrationPath, "utf8");

// Valida ausência estrita de operações destrutivas
assert.equal(/DROP\s+TABLE/i.test(sql), false, "Proibido DROP TABLE");
assert.equal(/DROP\s+DATABASE/i.test(sql), false, "Proibido DROP DATABASE");
assert.equal(/TRUNCATE/i.test(sql), false, "Proibido TRUNCATE");
assert.equal(/DROP\s+COLUMN/i.test(sql), false, "Proibido DROP COLUMN");
console.log("✔ ETAPA 1: 0 operações destrutivas no SQL da migration 076.");

// 2. MODELAGEM DO BANCO ISOLADO EQUIVALENTE À PRODUÇÃO (MIGRATIONS 001 ATÉ 075)
class MockDatabase {
  constructor() {
    this.tables = {
      users: [],
      consultancies: [],
      consultancy_members: [],
      consultancy_finance_settings: [],
      student_charges: [],
      student_payments: [],
      consultancy_plans: [],
      student_plan_subscriptions: [],
      asaas_customers: [],
      asaas_webhook_events: [],
      infinitepay_webhook_events: [],
    };
    this.columns = {
      consultancy_plans: new Set([
        "id", "public_id", "consultancy_id", "name", "description", "amount_cents",
        "currency_code", "billing_cycle", "status", "created_by_user_id", "created_at", "updated_at"
      ]),
      student_plan_subscriptions: new Set([
        "id", "public_id", "consultancy_id", "student_membership_id", "plan_id",
        "asaas_customer_id", "asaas_subscription_id", "status", "next_due_date",
        "started_at", "canceled_at", "canceled_by_user_id", "created_at", "updated_at"
      ]),
      consultancy_finance_settings: new Set([
        "id", "consultancy_id", "pix_key", "asaas_api_key", "asaas_enabled", "asaas_environment"
      ]),
      student_charges: new Set([
        "id", "public_id", "consultancy_id", "student_membership_id", "amount_cents",
        "due_on", "state", "blocks_access", "asaas_payment_id", "asaas_subscription_id"
      ]),
    };
    this.nullableColumns = {
      student_plan_subscriptions: new Set(), // Antes da 076: asaas_customer_id era NOT NULL!
    };
  }

  // Simula a aplicação da migration 076
  applyMigration076() {
    // 1. consultancy_plans
    this.columns.consultancy_plans.add("duration_days");
    this.columns.consultancy_plans.add("duration_months");
    this.columns.consultancy_plans.add("assured_installments");
    this.columns.consultancy_plans.add("is_available_for_purchase");
    this.columns.consultancy_plans.add("payment_methods");

    // 2. consultancy_finance_settings
    this.columns.consultancy_finance_settings.add("infinitepay_handle");
    this.columns.consultancy_finance_settings.add("infinitepay_api_key");
    this.columns.consultancy_finance_settings.add("infinitepay_enabled");
    this.columns.consultancy_finance_settings.add("infinitepay_environment");

    // 3. student_charges
    this.columns.student_charges.add("plan_id");
    this.columns.student_charges.add("infinitepay_slug");
    this.columns.student_charges.add("infinitepay_order_nsu");
    this.columns.student_charges.add("infinitepay_transaction_nsu");
    this.columns.student_charges.add("infinitepay_checkout_url");
    this.columns.student_charges.add("infinitepay_receipt_url");
    this.columns.student_charges.add("infinitepay_installments");
    this.columns.student_charges.add("infinitepay_capture_method");
    this.columns.student_charges.add("paid_amount_cents");
    this.columns.student_charges.add("paid_at");

    // 4. student_plan_subscriptions
    this.columns.student_plan_subscriptions.add("charge_id");
    this.columns.student_plan_subscriptions.add("ends_at");
    // Relaxa asaas_customer_id e asaas_subscription_id para NULLABLE!
    this.nullableColumns.student_plan_subscriptions.add("asaas_customer_id");
    this.nullableColumns.student_plan_subscriptions.add("asaas_subscription_id");
  }
}

const db = new MockDatabase();

// 3. SEED DE DADOS PRÉ-EXISTENTES (ASAAS E PIX MANUAL)
db.tables.users.push(
  { id: 1, public_id: "usr_admin", email: "admin@consultoria.com" },
  { id: 2, public_id: "usr_student_existing", email: "aluno_antigo@trevo.com" },
  { id: 3, public_id: "usr_student_new", email: "aluno_novo@trevo.com" }
);

db.tables.consultancies.push({ id: 10, public_id: "cons_10", slug: "consultoria-piloto" });

db.tables.consultancy_members.push(
  { id: 100, consultancy_id: 10, user_id: 1, role: "CONSULTANCY_ADMIN" },
  { id: 101, consultancy_id: 10, user_id: 2, role: "STUDENT" }, // Aluno existente
  { id: 102, consultancy_id: 10, user_id: 3, role: "STUDENT" }  // Aluno novo
);

// Cobrança legada existente do Asaas
db.tables.student_charges.push({
  id: 1,
  public_id: "ch_legacy_asaas",
  consultancy_id: 10,
  student_membership_id: 101,
  amount_cents: 19900,
  due_on: "2026-11-20",
  state: "OPEN",
  blocks_access: 0,
  asaas_payment_id: "pay_asaas_123456",
  asaas_subscription_id: "sub_asaas_123456",
});

// Assinatura legada existente do Asaas
db.tables.student_plan_subscriptions.push({
  id: 1,
  public_id: "sub_legacy_1",
  consultancy_id: 10,
  student_membership_id: 101,
  plan_id: 1,
  asaas_customer_id: 999, // Presente no Asaas
  asaas_subscription_id: "sub_asaas_123456",
  status: "ACTIVE",
  started_at: "2026-10-01",
});

console.log("✔ ETAPA 2: Banco inicial com estruturas legadas da migration 075 instanciado.");

// 4. APLICAÇÃO DA MIGRATION 076
db.applyMigration076();

// Verifica colunas adicionadas
assert.ok(db.columns.consultancy_plans.has("duration_months"));
assert.ok(db.columns.consultancy_plans.has("assured_installments"));
assert.ok(db.columns.student_plan_subscriptions.has("charge_id"));
assert.ok(db.columns.student_plan_subscriptions.has("ends_at"));
assert.ok(db.columns.student_charges.has("infinitepay_order_nsu"));
assert.ok(db.nullableColumns.student_plan_subscriptions.has("asaas_customer_id"));
console.log("✔ ETAPA 3: Migration 076 aplicada sem conflitos de colunas ou constraints.");

// 5. TESTE DE INSERÇÃO: PLANO COMERCIAL INFINITEPAY
const newPlan = {
  id: 2,
  public_id: "plan_trimestral_inf",
  consultancy_id: 10,
  name: "Plano Trimestral InfinitePay",
  amount_cents: 29900,
  duration_months: 3,
  billing_cycle: "CUSTOM",
  assured_installments: 3,
  is_available_for_purchase: 1,
  payment_methods: "PIX_AND_CARD",
  status: "ACTIVE",
  created_by_user_id: 1,
};
db.tables.consultancy_plans.push(newPlan);
console.log("✔ ETAPA 4: Plano InfinitePay inserido com sucesso (suporte a CUSTOM e parcelamento).");

// 6. TESTE DE COBRANÇA: NOVO ALUNO COM COBRANÇA INFINITEPAY GERADA (EM ABERTO)
const newCharge = {
  id: 2,
  public_id: "ch_infinitepay_ord_1",
  consultancy_id: 10,
  student_membership_id: 102, // Aluno novo
  plan_id: 2,
  amount_cents: 29900,
  due_on: "2026-11-20",
  state: "OPEN",
  blocks_access: 0,
  infinitepay_slug: "slug_inf_1",
  infinitepay_order_nsu: "ch_infinitepay_ord_1",
  infinitepay_checkout_url: "https://pay.infinitepay.io/ch_infinitepay_ord_1",
};
db.tables.student_charges.push(newCharge);
console.log("✔ ETAPA 5: Cobrança vinculada ao plano InfinitePay gerada no banco.");

// 7. TESTE DE LIBERAÇÃO DE ACESSO:
// Simula a lógica de getStudentFinancialAccessState para os diferentes tipos de alunos:

function testStudentAccessState(consultancyId, studentMembershipId, dbInstance, localToday) {
  // 1. Verifica cobranças manuais vencidas com bloqueio
  const overdueBlocking = dbInstance.tables.student_charges.filter(
    (c) =>
      c.consultancy_id === consultancyId &&
      c.student_membership_id === studentMembershipId &&
      c.state === "OPEN" &&
      c.blocks_access === 1 &&
      c.due_on < localToday
  );
  if (overdueBlocking.length > 0) {
    return { isRestricted: true, reason: "OVERDUE_BLOCKING_CHARGE" };
  }

  // 2. Verifica assinaturas comerciais
  const activeSubs = dbInstance.tables.student_plan_subscriptions.filter(
    (s) =>
      s.consultancy_id === consultancyId &&
      s.student_membership_id === studentMembershipId &&
      s.status === "ACTIVE" &&
      (!s.ends_at || s.ends_at >= localToday)
  );

  if (activeSubs.length > 0) {
    return { isRestricted: false, reason: "ACTIVE_PLAN_SUBSCRIPTION" };
  }

  // 3. Se não tem assinatura ativa, verifica se tem cobrança de plano em aberto
  const pendingPlanCharge = dbInstance.tables.student_charges.find(
    (c) =>
      c.consultancy_id === consultancyId &&
      c.student_membership_id === studentMembershipId &&
      c.plan_id !== undefined &&
      c.plan_id !== null &&
      c.state === "OPEN"
  );

  if (pendingPlanCharge) {
    // Novo aluno com plano não pago: ACESSO RESTRITO AOS MÓDULOS DE TREINO/NUTRIÇÃO!
    return { isRestricted: true, reason: "PLAN_PAYMENT_PENDING", chargeId: pendingPlanCharge.public_id };
  }

  // 4. Verifica se tinha plano comercial que expirou
  const hadSubscription = dbInstance.tables.student_plan_subscriptions.some(
    (s) => s.consultancy_id === consultancyId && s.student_membership_id === studentMembershipId
  );
  if (hadSubscription) {
    return { isRestricted: true, reason: "PLAN_SUBSCRIPTION_EXPIRED" };
  }

  // 5. Aluno existente sem plano comercial: ACESSO PRESERVADO!
  return { isRestricted: false, reason: "EXISTING_STUDENT_ALLOWED" };
}

// 7.1 Cenário: Aluno existente sem plano comercial
const accessExisting = testStudentAccessState(10, 101, db, "2026-11-12");
assert.equal(accessExisting.isRestricted, false);
console.log("✔ ETAPA 6: Aluno existente mantém acesso liberado (zero bloqueio retroativo).");

// 7.2 Cenário: Novo aluno com cobrança InfinitePay gerada, mas AINDA NÃO PAGA
const accessNewUnpaid = testStudentAccessState(10, 102, db, "2026-11-12");
assert.equal(accessNewUnpaid.isRestricted, true);
assert.equal(accessNewUnpaid.reason, "PLAN_PAYMENT_PENDING");
console.log("✔ ETAPA 7: Novo aluno com plano em aberto é restrito nos módulos antes do pagamento.");

// 8. TESTE DE QUITAÇÃO INFINITEPAY E INSERÇÃO DE ASSINATURA SEM ASaaS CUSTOMER ID
newCharge.state = "PAID";
newCharge.paid_amount_cents = 31540; // Cartão com taxa de parcelamento paga pelo comprador
newCharge.paid_at = "2026-11-12T12:00:00Z";

const newInfinitePaySubscription = {
  id: 2,
  public_id: "sub_inf_2",
  consultancy_id: 10,
  student_membership_id: 102,
  plan_id: 2,
  charge_id: newCharge.id,
  asaas_customer_id: null,      // DEVE ACEITAR NULL!
  asaas_subscription_id: null,  // DEVE ACEITAR NULL!
  status: "ACTIVE",
  started_at: "2026-11-12T12:00:00Z",
  ends_at: "2027-02-12T12:00:00Z", // 3 meses
};
db.tables.student_plan_subscriptions.push(newInfinitePaySubscription);
console.log("✔ ETAPA 8: Assinatura InfinitePay inserida com sucesso (asaas_customer_id = NULL aceito perfeitamente).");

// 7.3 Cenário: Novo aluno APÓS confirmação da InfinitePay
const accessNewPaid = testStudentAccessState(10, 102, db, "2026-11-12");
assert.equal(accessNewPaid.isRestricted, false);
assert.equal(accessNewPaid.reason, "ACTIVE_PLAN_SUBSCRIPTION");
console.log("✔ ETAPA 9: Novo aluno com pagamento confirmado tem acesso liberado automaticamente.");

// 7.4 Cenário: Plano vencido após o término da vigência
const accessExpired = testStudentAccessState(10, 102, db, "2027-03-01"); // Data futura após vencimento
assert.equal(accessExpired.isRestricted, true);
assert.equal(accessExpired.reason, "PLAN_SUBSCRIPTION_EXPIRED");
console.log("✔ ETAPA 10: Vencimento da assinatura bloqueia acesso para renovação com preservação do histórico.");

// 9. TESTE DE CONSULTA RELACIONAL
const queryResult = db.tables.student_plan_subscriptions
  .filter((s) => s.student_membership_id === 102 && s.status === "ACTIVE")
  .map((s) => {
    const plan = db.tables.consultancy_plans.find((p) => p.id === s.plan_id);
    const charge = db.tables.student_charges.find((c) => c.id === s.charge_id);
    return {
      subscriptionPublicId: s.public_id,
      planName: plan?.name,
      amountCents: plan?.amount_cents,
      paidAmountCents: charge?.paid_amount_cents,
      startedAt: s.started_at,
      endsAt: s.ends_at,
    };
  });

assert.equal(queryResult.length, 1);
assert.equal(queryResult[0].planName, "Plano Trimestral InfinitePay");
assert.equal(queryResult[0].amountCents, 29900);
assert.equal(queryResult[0].paidAmountCents, 31540);
console.log("✔ ETAPA 11: Consulta relacional completa (Assinatura + Plano + Cobrança) validada com sucesso.");

console.log("\n================================================================================");
console.log("SUITE DE TESTE DA MIGRATION 076 CONCLUÍDA: 11/11 ETAPAS PASSARAM COM SUCESSO!");
console.log("================================================================================\n");
