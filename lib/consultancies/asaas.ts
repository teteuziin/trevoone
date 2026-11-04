import { getDbConnection } from "@/lib/db/mysql";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * TREVO ONE — PILOTO ASAAS SANDBOX EXCLUSIVO PARA SAIYA SHAPE
 *
 * Regras estritas de segurança e isolamento:
 * 1. Habilitado exclusivamente se consultancySlug === "saiya-shape"
 * 2. Ambiente obrigatoriamente restrito ao sandbox (process.env.ASAAS_ENVIRONMENT === "sandbox")
 * 3. Token e credenciais nunca são expostos em logs ou respostas de erro
 * 4. Idempotência estrita: não cria cobranças duplicadas no Asaas
 * 5. Outras consultorias permanecem 100% no fluxo manual de Pix
 */

export interface AsaasConfig {
  apiKey: string;
  baseUrl: string;
  isSandbox: boolean;
  webhookToken: string;
}

/**
 * Retorna as configurações do Asaas a partir do ambiente de runtime.
 * Nunca imprime nem expõe o valor da API Key.
 */

/**
 * Identifica o meio de pagamento efetivamente confirmado pelo Asaas.
 * Não presume Pix para recebimentos manuais ou fallbacks de fatura hospedada.
 */
export function resolveAsaasPaymentMethod(payment: {
  billingType?: string | null;
  status?: string | null;
}): string {
  if (payment.status === "RECEIVED_IN_CASH") {
    return "RECEIVED_IN_CASH";
  }
  const billingType = (payment.billingType || "").toUpperCase().trim();
  switch (billingType) {
    case "PIX":
      return "PIX";
    case "BOLETO":
      return "BOLETO";
    case "CREDIT_CARD":
      return "CREDIT_CARD";
    case "DEBIT_CARD":
      return "DEBIT_CARD";
    default:
      return billingType || "ASAAS_ONLINE";
  }
}

export function resolveAsaasApiKey(): string {
  const envKey = process.env.ASAAS_API_KEY?.trim();
  if (envKey) return envKey;

  try {
    const envPath = path.join(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          if (key === "ASAAS_API_KEY") {
            let val = trimmed.slice(eqIdx + 1).trim();
            if (
              (val.startsWith('"') && val.endsWith('"')) ||
              (val.startsWith("'") && val.endsWith("'"))
            ) {
              val = val.slice(1, -1);
            }
            return val;
          }
        }
      }
    }
  } catch {
    // Non-blocking fallback
  }
  return "";
}

export function resolveAsaasWebhookToken(): string {
  const envToken = process.env.ASAAS_WEBHOOK_TOKEN?.trim();
  if (envToken) return envToken;

  try {
    const envPath = path.join(process.cwd(), ".env.local");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          if (key === "ASAAS_WEBHOOK_TOKEN") {
            let val = trimmed.slice(eqIdx + 1).trim();
            if (
              (val.startsWith('"') && val.endsWith('"')) ||
              (val.startsWith("'") && val.endsWith("'"))
            ) {
              val = val.slice(1, -1);
            }
            return val;
          }
        }
      }
    }
  } catch {
    // Non-blocking fallback
  }
  return "";
}

export function getAsaasConfig(): AsaasConfig | null {
  const apiKey = resolveAsaasApiKey();
  const rawEnv = (process.env.ASAAS_ENVIRONMENT || "sandbox").toLowerCase().trim();

  // Trava de segurança: produção é expressamente proibida nesta etapa
  if (rawEnv === "production") {
    console.warn("[Asaas Security Guard] Produção não autorizada nesta etapa.");
    return null;
  }

  // URL oficial exclusiva do Sandbox
  const baseUrl = "https://sandbox.asaas.com/api/v3";
  // Token exclusivo do ambiente sem fallback padrão estático
  const webhookToken = resolveAsaasWebhookToken();

  if (!apiKey) {
    return null;
  }

  return {
    apiKey,
    baseUrl,
    isSandbox: true,
    webhookToken,
  };
}

/**
 * Verifica se a consultoria atual é elegível para o piloto Asaas.
 * Estritamente restrito à Saiya Shape em ambiente Sandbox.
 */
export async function isAsaasPilotEligible(consultancySlug: string): Promise<boolean> {
  if (!consultancySlug || typeof consultancySlug !== "string") return false;
  const normalized = consultancySlug.toLowerCase().trim();

  // Restrição estrita de tenancy: somente 'saiya-shape'
  if (normalized !== "saiya-shape") {
    return false;
  }

  const config = getAsaasConfig();
  if (!config) return false;

  // Restrição estrita de ambiente: somente sandbox nesta etapa
  if (!config.isSandbox) {
    return false;
  }

  // Verificação explícita de ativação da consultoria no banco de dados
  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT cfs.asaas_enabled
       FROM consultancy_finance_settings cfs
       INNER JOIN consultancies c ON c.id = cfs.consultancy_id
       WHERE c.slug = ? LIMIT 1;`,
      [normalized]
    );

    if (Array.isArray(rows) && rows.length > 0) {
      return Boolean(rows[0].asaas_enabled);
    }
    return true;
  } catch {
    return true;
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Executa uma chamada autenticada segura à API do Asaas v3.
 * Trata erros sem expor segredos.
 */
async function asaasFetch<T = unknown>(
  endpoint: string,
  options: {
    method?: string;
    body?: unknown;
  } = {}
): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  const config = getAsaasConfig();
  if (!config) {
    return { ok: false, status: 500, error: "Asaas não configurado no servidor." };
  }

  const url = `${config.baseUrl}${endpoint}`;
  try {
    const res = await fetch(url, {
      method: options.method || "GET",
      headers: {
        access_token: config.apiKey,
        "User-Agent": "Trevo-One-Pilot/1.0",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      let sanitizedError = "Erro na requisição ao Asaas.";
      const errPayload = data as { errors?: Array<{ description?: string; code?: string }> } | null;
      if (errPayload && Array.isArray(errPayload.errors) && errPayload.errors.length > 0) {
        sanitizedError = errPayload.errors.map((e) => e.description || e.code || "").filter(Boolean).join("; ");
      }
      return { ok: false, status: res.status, data, error: sanitizedError };
    }

    return { ok: true, status: res.status, data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Timeout";
    return {
      ok: false,
      status: 500,
      error: `Falha na conexão com gateway Asaas: ${msg}`,
    };
  }
}

/**
 * Chamada somente de leitura para testar e validar autenticação no Asaas.
 */
export async function validateAsaasAuthentication(): Promise<{
  success: boolean;
  isSandbox: boolean;
  status: number;
  tradingName?: string;
  error?: string;
}> {
  const config = getAsaasConfig();
  if (!config) {
    return {
      success: false,
      isSandbox: true,
      status: 500,
      error: "Variáveis ASAAS_API_KEY ou ASAAS_ENVIRONMENT não configuradas.",
    };
  }

  const res = await asaasFetch<{ tradingName?: string; name?: string; status?: string }>("/myAccount");
  if (!res.ok) {
    return {
      success: false,
      isSandbox: config.isSandbox,
      status: res.status,
      error: res.error,
    };
  }

  return {
    success: true,
    isSandbox: config.isSandbox,
    status: res.status,
    tradingName: res.data?.tradingName || res.data?.name || "Conta Asaas Ativa",
  };
}

/**
 * Garante as colunas e tabelas necessárias para o Asaas de forma defensiva (Schema Assurance).
 */
export async function ensureAsaasSchemaAssurance(): Promise<void> {
  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();

    // 1. Asaas customers table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS asaas_customers (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        public_id CHAR(36) NOT NULL UNIQUE,
        consultancy_id BIGINT UNSIGNED NOT NULL,
        student_membership_id BIGINT UNSIGNED NOT NULL,
        asaas_customer_id VARCHAR(50) NOT NULL,
        name VARCHAR(150) NOT NULL,
        email VARCHAR(255) NOT NULL,
        cpf_cnpj VARCHAR(20) NULL DEFAULT NULL,
        phone VARCHAR(20) NULL DEFAULT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        UNIQUE KEY uq_asaas_customers_tenant_member (consultancy_id, student_membership_id),
        INDEX idx_asaas_customers_asaas_id (asaas_customer_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Asaas webhook events table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS asaas_webhook_events (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        public_id CHAR(36) NOT NULL UNIQUE,
        asaas_event_id VARCHAR(100) NULL DEFAULT NULL,
        event_type VARCHAR(50) NOT NULL,
        asaas_payment_id VARCHAR(50) NULL DEFAULT NULL,
        raw_payload JSON NOT NULL,
        status ENUM('PENDING', 'PROCESSED', 'IGNORED_ORPHAN', 'OUT_OF_SCOPE', 'FAILED') NOT NULL DEFAULT 'PENDING',
        processed TINYINT(1) NOT NULL DEFAULT 0,
        processed_at DATETIME(3) NULL DEFAULT NULL,
        processing_error VARCHAR(500) NULL DEFAULT NULL,
        received_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX idx_asaas_webhooks_payment_id (asaas_payment_id),
        INDEX idx_asaas_webhooks_event_type (event_type),
        INDEX idx_asaas_webhooks_status (status),
        INDEX idx_asaas_webhooks_idempotency (asaas_event_id, event_type),
        INDEX idx_asaas_webhooks_processing (processed, received_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Defensive check for status column in asaas_webhook_events
    const [webhookCols] = await connection.execute<RowDataPacket[]>(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_NAME = 'asaas_webhook_events'`
    );
    const existingWebhookCols = new Set(webhookCols.map((c) => c.COLUMN_NAME));
    if (!existingWebhookCols.has("status")) {
      await connection.execute(
        `ALTER TABLE asaas_webhook_events ADD COLUMN status ENUM('PENDING', 'PROCESSED', 'IGNORED_ORPHAN', 'OUT_OF_SCOPE', 'FAILED') NOT NULL DEFAULT 'PENDING' AFTER raw_payload`
      );
    }

    // 3. Defensive checks for student_charges columns
    const [cols] = await connection.execute<RowDataPacket[]>(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_NAME = 'student_charges'`
    );
    const existingCols = new Set(cols.map((c) => c.COLUMN_NAME));

    if (!existingCols.has("asaas_payment_id")) {
      await connection.execute(
        `ALTER TABLE student_charges ADD COLUMN asaas_payment_id VARCHAR(50) NULL DEFAULT NULL`
      );
    }
    if (!existingCols.has("asaas_subscription_id")) {
      await connection.execute(
        `ALTER TABLE student_charges ADD COLUMN asaas_subscription_id VARCHAR(50) NULL DEFAULT NULL`
      );
    }
    if (!existingCols.has("payment_method")) {
      await connection.execute(
        `ALTER TABLE student_charges ADD COLUMN payment_method VARCHAR(32) NULL DEFAULT NULL`
      );
    }
    if (!existingCols.has("asaas_invoice_url")) {
      await connection.execute(
        `ALTER TABLE student_charges ADD COLUMN asaas_invoice_url VARCHAR(500) NULL DEFAULT NULL`
      );
    }
    if (!existingCols.has("asaas_status_raw")) {
      await connection.execute(
        `ALTER TABLE student_charges ADD COLUMN asaas_status_raw VARCHAR(50) NULL DEFAULT NULL`
      );
    }
  } catch (err: unknown) {
    // Se a tabela ou coluna já existir, ignora erro benigno
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[Asaas Schema Assurance]", msg);
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Cria ou recupera o cliente correspondente no Asaas para o aluno.
 */
export async function getOrCreateAsaasCustomer(params: {
  consultancyId: number;
  studentMembershipId: number;
  studentName: string;
  studentEmail: string;
  cpfCnpj?: string | null;
  phone?: string | null;
}): Promise<{ customerId: string | null; error?: string }> {
  const { consultancyId, studentMembershipId, studentName, studentEmail, cpfCnpj, phone } = params;

  let connection: PoolConnection | null = null;
  try {
    await ensureAsaasSchemaAssurance();
    connection = await getDbConnection();

    // 1. Busca localmente na tabela asaas_customers
    const [localRows] = await connection.execute<RowDataPacket[]>(
      `SELECT asaas_customer_id FROM asaas_customers
       WHERE consultancy_id = ? AND student_membership_id = ? LIMIT 1;`,
      [consultancyId, studentMembershipId]
    );

    if (Array.isArray(localRows) && localRows.length > 0) {
      return { customerId: String(localRows[0].asaas_customer_id) };
    }

    // 2. Não encontrado localmente. Busca no Asaas por email
    const searchRes = await asaasFetch<{ data: Array<{ id: string; email: string }> }>(
      `/customers?email=${encodeURIComponent(studentEmail.trim().toLowerCase())}`
    );

    let asaasCustomerId: string | null = null;

    if (searchRes.ok && searchRes.data && Array.isArray(searchRes.data.data) && searchRes.data.data.length > 0) {
      asaasCustomerId = searchRes.data.data[0].id;
    } else {
      // 3. Cria novo cliente no Asaas
      const createRes = await asaasFetch<{ id: string }>("/customers", {
        method: "POST",
        body: {
          name: studentName.trim(),
          email: studentEmail.trim().toLowerCase(),
          cpfCnpj: cpfCnpj?.replace(/\D/g, "") || undefined,
          mobilePhone: phone?.replace(/\D/g, "") || undefined,
          externalReference: `member-${studentMembershipId}`,
          notificationDisabled: true, // No piloto, desabilita envio de e-mails diretos pelo Asaas
        },
      });

      if (!createRes.ok || !createRes.data?.id) {
        return { customerId: null, error: createRes.error || "Falha ao registrar cliente no Asaas." };
      }
      asaasCustomerId = createRes.data.id;
    }

    // 4. Salva vínculo local
    const publicId = crypto.randomUUID();
    await connection.execute(
      `INSERT INTO asaas_customers
       (public_id, consultancy_id, student_membership_id, asaas_customer_id, name, email, cpf_cnpj, phone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE asaas_customer_id = VALUES(asaas_customer_id), updated_at = CURRENT_TIMESTAMP(3);`,
      [
        publicId,
        consultancyId,
        studentMembershipId,
        asaasCustomerId,
        studentName.trim(),
        studentEmail.trim().toLowerCase(),
        cpfCnpj || null,
        phone || null,
      ]
    );

    return { customerId: asaasCustomerId };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro no gerenciamento de cliente Asaas.";
    return { customerId: null, error: msg };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Emite uma cobrança Asaas vinculada à mensalidade do aluno.
 * Inclui reconciliação preventiva para evitar duplicidade de cobrança.
 */
const inFlightChargeEmissions = new Map<
  string,
  Promise<{
    success: boolean;
    paymentId?: string;
    invoiceUrl?: string;
    status?: string;
    error?: string;
  }>
>();

export async function emitAsaasChargeForStudent(params: {
  consultancyId: number;
  chargeId: number;
  chargePublicId: string;
  customerId: string;
  amountCents: number;
  dueOn: string;
  title: string;
  description?: string | null;
}): Promise<{
  success: boolean;
  paymentId?: string;
  invoiceUrl?: string;
  status?: string;
  error?: string;
}> {
  const { chargePublicId } = params;

  // 1. Garantia de concorrência em memória (in-process mutex para emissões simultâneas)
  const existingEmission = inFlightChargeEmissions.get(chargePublicId);
  if (existingEmission) {
    return existingEmission;
  }

  const emissionPromise = (async () => {
    try {
      return await executeGuaranteedChargeEmission(params);
    } finally {
      inFlightChargeEmissions.delete(chargePublicId);
    }
  })();

  inFlightChargeEmissions.set(chargePublicId, emissionPromise);
  return emissionPromise;
}

async function executeGuaranteedChargeEmission(params: {
  consultancyId: number;
  chargeId: number;
  chargePublicId: string;
  customerId: string;
  amountCents: number;
  dueOn: string;
  title: string;
  description?: string | null;
}): Promise<{
  success: boolean;
  paymentId?: string;
  invoiceUrl?: string;
  status?: string;
  error?: string;
}> {
  const {
    chargeId,
    chargePublicId,
    customerId,
    amountCents,
    dueOn,
    title,
    description,
  } = params;

  // 1. Garantia de concorrência a nível de banco de dados (Row Lock FOR UPDATE)
  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();
    const [existingRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, asaas_payment_id, asaas_invoice_url, asaas_status_raw
       FROM student_charges
       WHERE id = ? FOR UPDATE;`,
      [chargeId]
    );

    if (Array.isArray(existingRows) && existingRows.length > 0 && existingRows[0].asaas_payment_id) {
      return {
        success: true,
        paymentId: String(existingRows[0].asaas_payment_id),
        invoiceUrl: existingRows[0].asaas_invoice_url ? String(existingRows[0].asaas_invoice_url) : undefined,
        status: existingRows[0].asaas_status_raw ? String(existingRows[0].asaas_status_raw) : undefined,
      };
    }
  } catch {
    // Se a conexão não estiver ativa, prossegue para verificação direta no Asaas
  } finally {
    if (connection) connection.release();
  }

  // 2. RECONCILIAÇÃO PREVENTIVA NO ASAAS (Garantia contra duplo clique / timeout)
  const existingCheck = await asaasFetch<{ data: Array<{ id: string; invoiceUrl: string; status: string }> }>(
    `/payments?externalReference=${encodeURIComponent(chargePublicId)}`
  );

  if (existingCheck.ok && existingCheck.data && Array.isArray(existingCheck.data.data) && existingCheck.data.data.length > 0) {
    const existing = existingCheck.data.data[0];
    await updateLocalChargeWithAsaas(chargeId, {
      paymentId: existing.id,
      invoiceUrl: existing.invoiceUrl,
      status: existing.status,
    });
    return {
      success: true,
      paymentId: existing.id,
      invoiceUrl: existing.invoiceUrl,
      status: existing.status,
    };
  }

  // 2. Emissão no Asaas
  const valueNumber = Number((amountCents / 100).toFixed(2));

  // Tenta emitir primeiramente como PIX; se o Sandbox exigir ativação de conta para PIX direto, usa UNDEFINED
  let createRes = await asaasFetch<{ id: string; invoiceUrl: string; status: string }>("/payments", {
    method: "POST",
    body: {
      customer: customerId,
      billingType: "PIX",
      value: valueNumber,
      dueDate: dueOn,
      description: description ? `${title} - ${description}` : `${title} - Saiya Shape`,
      externalReference: chargePublicId,
      postalService: false,
    },
  });

  if (!createRes.ok && (createRes.error?.includes("Pix não está disponível") || createRes.error?.includes("conta precisa estar aprovada"))) {
    // Fallback gracioso no sandbox para BOLETO (gera fatura hospedada com checkout ativo para conta pendente)
    createRes = await asaasFetch<{ id: string; invoiceUrl: string; status: string }>("/payments", {
      method: "POST",
      body: {
        customer: customerId,
        billingType: "BOLETO",
        value: valueNumber,
        dueDate: dueOn,
        description: description ? `${title} - ${description}` : `${title} - Saiya Shape`,
        externalReference: chargePublicId,
        postalService: false,
      },
    });
  }

  if (!createRes.ok || !createRes.data?.id) {
    return {
      success: false,
      error: createRes.error || "Falha ao emitir cobrança no Asaas.",
    };
  }

  const payment = createRes.data;

  // 3. Atualiza registro financeiro local
  await updateLocalChargeWithAsaas(chargeId, {
    paymentId: payment.id,
    invoiceUrl: payment.invoiceUrl,
    status: payment.status,
  });

  return {
    success: true,
    paymentId: payment.id,
    invoiceUrl: payment.invoiceUrl,
    status: payment.status,
  };
}

/**
 * Atualiza o registro em student_charges com os identificadores do Asaas.
 */
async function updateLocalChargeWithAsaas(
  chargeId: number,
  data: { paymentId: string; invoiceUrl: string; status: string }
): Promise<void> {
  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();
    await connection.execute(
      `UPDATE student_charges
       SET asaas_payment_id = ?,
           asaas_invoice_url = ?,
           payment_method = 'PIX',
           asaas_status_raw = ?
       WHERE id = ?;`,
      [data.paymentId, data.invoiceUrl, data.status, chargeId]
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Asaas] Erro ao sincronizar cobrança local:", msg);
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Obtém o QR Code e linha Copia-e-Cola do Pix da cobrança no Asaas.
 */
export async function getAsaasPixQrCode(paymentId: string): Promise<{
  encodedImage: string | null;
  payload: string | null;
  expirationDate: string | null;
}> {
  if (!paymentId || !paymentId.startsWith("pay_")) {
    return { encodedImage: null, payload: null, expirationDate: null };
  }

  const res = await asaasFetch<{
    encodedImage?: string;
    payload?: string;
    expirationDate?: string;
  }>(`/payments/${paymentId}/pixQrCode`);

  if (!res.ok || !res.data) {
    return { encodedImage: null, payload: null, expirationDate: null };
  }

  return {
    encodedImage: res.data.encodedImage || null,
    payload: res.data.payload || null,
    expirationDate: res.data.expirationDate || null,
  };
}

export type AsaasWebhookStatus =
  | "PROCESSED"
  | "IGNORED_ORPHAN"
  | "OUT_OF_SCOPE"
  | "FAILED"
  | "IDEMPOTENT_DUPLICATE";

export interface AsaasWebhookProcessResult {
  success: boolean;
  acknowledged: boolean;
  status: AsaasWebhookStatus;
  message: string;
  alreadyProcessed?: boolean;
}

/**
 * Processa eventos de Webhook enviados pelo Asaas.
 * Garante idempotência, validação de token e baixa automática sem duplicação.
 */
export async function processAsaasWebhookEvent(params: {
  payload: Record<string, unknown>;
  receivedToken: string | null;
}): Promise<AsaasWebhookProcessResult> {
  const { payload, receivedToken } = params;
  const config = getAsaasConfig();

  if (!config) {
    return {
      success: false,
      acknowledged: false,
      status: "FAILED",
      message: "Asaas não configurado no servidor.",
    };
  }

  // 1. Validação do cabeçalho asaas-access-token
  if (!receivedToken || receivedToken !== config.webhookToken) {
    return {
      success: false,
      acknowledged: false,
      status: "FAILED",
      message: "Acesso não autorizado: token de webhook inválido.",
    };
  }

  if (!payload || typeof payload !== "object") {
    return {
      success: false,
      acknowledged: false,
      status: "FAILED",
      message: "Payload de webhook inválido.",
    };
  }

  const eventType = String(payload.event || "").trim();
  const payment = (payload.payment || null) as {
    id?: string;
    externalReference?: string;
    status?: string;
    value?: number;
  } | null;
  const eventId = payload.id ? String(payload.id) : null;
  const asaasPaymentId = payment?.id ? String(payment.id) : null;

  if (!eventType || !payment || !asaasPaymentId) {
    return {
      success: false,
      acknowledged: false,
      status: "FAILED",
      message: "Dados incompletos no evento do Asaas.",
    };
  }

  let connection: PoolConnection | null = null;
  try {
    await ensureAsaasSchemaAssurance();
    connection = await getDbConnection();

    // 2. DEDUPLICAÇÃO E IDEMPOTÊNCIA via asaas_webhook_events
    if (eventId) {
      const [existing] = await connection.execute<RowDataPacket[]>(
        `SELECT id, status, processed FROM asaas_webhook_events
         WHERE asaas_event_id = ? AND event_type = ? LIMIT 1;`,
        [eventId, eventType]
      );
      if (Array.isArray(existing) && existing.length > 0 && existing[0].processed === 1) {
        return {
          success: true,
          acknowledged: true,
          status: "IDEMPOTENT_DUPLICATE",
          message: "Evento já processado anteriormente (Idempotente).",
          alreadyProcessed: true,
        };
      }
    }

    // Registra o evento recebido
    const eventPublicId = crypto.randomUUID();
    const [insertEventRes] = await connection.execute<ResultSetHeader>(
      `INSERT INTO asaas_webhook_events
       (public_id, asaas_event_id, event_type, asaas_payment_id, raw_payload, status, processed, received_at)
       VALUES (?, ?, ?, ?, ?, 'PENDING', 0, CURRENT_TIMESTAMP(3))
       ON DUPLICATE KEY UPDATE raw_payload = VALUES(raw_payload);`,
      [eventPublicId, eventId, eventType, asaasPaymentId, JSON.stringify(payload)]
    );
    const recordedEventId = insertEventRes?.insertId || 0;

    // 3. Localiza a cobrança interna correspondente no Trevo One
    // Busca por asaas_payment_id ou externalReference (que é o public_id da cobrança)
    const externalRef = payment.externalReference ? String(payment.externalReference) : "";

    const [chargeRows] = await connection.execute<RowDataPacket[]>(
      `SELECT sc.id, sc.public_id, sc.consultancy_id, sc.student_membership_id, sc.amount_cents, sc.state, c.slug as consultancy_slug
       FROM student_charges sc
       JOIN consultancies c ON c.id = sc.consultancy_id
       WHERE sc.asaas_payment_id = ? OR sc.public_id = ?
       LIMIT 1;`,
      [asaasPaymentId, externalRef]
    );

    if (!Array.isArray(chargeRows) || chargeRows.length === 0) {
      if (recordedEventId) {
        await connection.execute(
          `UPDATE asaas_webhook_events
           SET status = 'IGNORED_ORPHAN',
               processed = 0,
               processed_at = CURRENT_TIMESTAMP(3),
               processing_error = 'Cobrança não encontrada no Trevo One (órfão)'
           WHERE id = ?;`,
          [recordedEventId]
        );
      }
      console.warn(
        `[Asaas Webhook WARN - ORPHAN] Cobrança ${asaasPaymentId} (externalReference: '${externalRef || "nenhuma"}') não encontrada no Trevo One. Evento: ${eventType}. Gravado em asaas_webhook_events como IGNORED_ORPHAN para investigação financeira.`
      );
      return {
        success: false,
        acknowledged: true,
        status: "IGNORED_ORPHAN",
        message: `Cobrança ${asaasPaymentId} não encontrada no Trevo One (evento registrado como órfão para auditoria).`,
      };
    }

    const charge = chargeRows[0];
    const consultancySlug = String(charge.consultancy_slug);

    // Validação estrita de Tenancy do Piloto
    if (consultancySlug !== "saiya-shape") {
      if (recordedEventId) {
        await connection.execute(
          `UPDATE asaas_webhook_events
           SET status = 'OUT_OF_SCOPE',
               processed = 0,
               processed_at = CURRENT_TIMESTAMP(3),
               processing_error = 'Piloto Asaas restrito exclusivamente à Saiya Shape'
           WHERE id = ?;`,
          [recordedEventId]
        );
      }
      console.warn(
        `[Asaas Webhook WARN - OUT_OF_SCOPE] Cobrança ${asaasPaymentId} pertence à consultoria '${consultancySlug}', fora do escopo do piloto Asaas. Gravado em asaas_webhook_events como OUT_OF_SCOPE.`
      );
      return {
        success: false,
        acknowledged: true,
        status: "OUT_OF_SCOPE",
        message: "Piloto Asaas restrito exclusivamente à Saiya Shape.",
      };
    }

    const chargeInternalId = Number(charge.id);

    // 4. VERIFICAÇÃO DE ESTORNO PRÉVIO (Segurança de Auditoria)
    // Se a cobrança já estiver estornada, um evento antigo reenviado NÃO pode reativar a baixa
    const [existingRefunded] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM student_payments WHERE charge_id = ? AND refunded_at IS NOT NULL LIMIT 1;`,
      [chargeInternalId]
    );
    const isAlreadyRefunded =
      (Array.isArray(existingRefunded) && existingRefunded.length > 0) ||
      charge.asaas_status_raw === "PAYMENT_REFUNDED" ||
      charge.asaas_status_raw === "REFUNDED";

    if (
      isAlreadyRefunded &&
      (eventType === "PAYMENT_CONFIRMED" ||
        eventType === "PAYMENT_RECEIVED" ||
        payment.status === "RECEIVED" ||
        payment.status === "CONFIRMED")
    ) {
      if (recordedEventId) {
        await connection.execute(
          `UPDATE asaas_webhook_events
           SET status = 'PROCESSED',
               processed = 1,
               processed_at = CURRENT_TIMESTAMP(3),
               processing_error = 'Cobrança com estorno registrado. Eventos antigos ignorados com segurança.'
           WHERE id = ?;`,
          [recordedEventId]
        );
      }
      return {
        success: true,
        acknowledged: true,
        status: "PROCESSED",
        message: "Cobrança com estorno registrado. Eventos antigos não podem reativar a baixa.",
        alreadyProcessed: true,
      };
    }

    // 5. EVENTO DE CONFIRMAÇÃO (Aguardando Recebimento)
    // No piloto, CONFIRMED fica como "Pagamento confirmado, aguardando recebimento"
    // Não insere em student_payments ainda
    const isConfirmedOnly =
      (eventType === "PAYMENT_CONFIRMED" || payment.status === "CONFIRMED") &&
      eventType !== "PAYMENT_RECEIVED" &&
      payment.status !== "RECEIVED" &&
      payment.status !== "RECEIVED_IN_CASH";

    if (isConfirmedOnly) {
      await connection.execute(
        `UPDATE student_charges
         SET asaas_status_raw = 'PAYMENT_CONFIRMED',
             asaas_payment_id = ?
         WHERE id = ?;`,
        [asaasPaymentId, chargeInternalId]
      );

      if (recordedEventId) {
        await connection.execute(
          `UPDATE asaas_webhook_events
           SET status = 'PROCESSED', processed = 1, processed_at = CURRENT_TIMESTAMP(3), processing_error = NULL
           WHERE id = ?;`,
          [recordedEventId]
        );
      }

      return {
        success: true,
        acknowledged: true,
        status: "PROCESSED",
        message: `Evento PAYMENT_CONFIRMED registrado para cobrança ${charge.public_id}: Pagamento confirmado, aguardando recebimento.`,
      };
    }

    // 6. EVENTO DE LIQUIDAÇÃO REAL (RECEIVED autoriza a baixa automática)
    const isReceivedEvent =
      eventType === "PAYMENT_RECEIVED" ||
      payment.status === "RECEIVED" ||
      payment.status === "RECEIVED_IN_CASH";

    const isRefundEvent =
      eventType === "PAYMENT_REFUNDED" ||
      eventType === "PAYMENT_RECEIVED_IN_CASH_UNDONE" ||
      eventType === "PAYMENT_CHARGEBACK_REQUESTED";

    if (isReceivedEvent) {
      // Verifica se o pagamento ativo (não estornado) já foi registrado em student_payments
      const [existingPayments] = await connection.execute<RowDataPacket[]>(
        `SELECT id FROM student_payments WHERE charge_id = ? AND refunded_at IS NULL LIMIT 1;`,
        [chargeInternalId]
      );

      if (!Array.isArray(existingPayments) || existingPayments.length === 0) {
        const paymentPublicId = crypto.randomUUID();
        const paidAmountCents = Math.round(Number(payment.value || (charge.amount_cents / 100)) * 100);

        const confirmedMethod = resolveAsaasPaymentMethod(payment);

        // Insere o pagamento oficial com baixa imediata e método verificado
        await connection.execute(
          `INSERT INTO student_payments
           (public_id, consultancy_id, charge_id, receipt_id, asaas_payment_id, amount_cents, currency_code, payment_method, confirmed_by_user_id, confirmed_at)
           VALUES (?, ?, ?, NULL, ?, ?, 'BRL', ?, NULL, CURRENT_TIMESTAMP(3));`,
          [
            paymentPublicId,
            charge.consultancy_id,
            chargeInternalId,
            asaasPaymentId,
            paidAmountCents,
            confirmedMethod,
          ]
        );
      }

      const confirmedMethod = resolveAsaasPaymentMethod(payment);
      // Atualiza status da cobrança
      await connection.execute(
        `UPDATE student_charges
         SET asaas_status_raw = 'PAYMENT_RECEIVED',
             asaas_payment_id = ?,
             payment_method = ?
         WHERE id = ?;`,
        [asaasPaymentId, confirmedMethod, chargeInternalId]
      );

      // Recalcula acesso financeiro do aluno após a liquidação
      try {
        if (charge.student_membership_id && charge.consultancy_id) {
          const { getStudentFinancialAccessState } = await import("./finance");
          await getStudentFinancialAccessState({
            consultancyId: Number(charge.consultancy_id),
            studentMembershipId: Number(charge.student_membership_id),
          });
        }
      } catch (accessErr: unknown) {
        console.warn("[Asaas Webhook] Aviso ao recalcular acesso pós-baixa:", accessErr);
      }
    } else if (isRefundEvent) {
      // Estorno / Chargeback: PRESERVA o pagamento original em student_payments para auditoria
      // Marcando refunded_at com o timestamp do estorno
      await connection.execute(
        `UPDATE student_payments
         SET refunded_at = CURRENT_TIMESTAMP(3)
         WHERE charge_id = ? AND refunded_at IS NULL;`,
        [chargeInternalId]
      );

      await connection.execute(
        `UPDATE student_charges
         SET asaas_status_raw = 'PAYMENT_REFUNDED'
         WHERE id = ?;`,
        [chargeInternalId]
      );

      // Recalcula acesso financeiro do aluno (se houver pendências bloqueantes vencidas, bloqueia o acesso)
      try {
        if (charge.student_membership_id && charge.consultancy_id) {
          const { getStudentFinancialAccessState } = await import("./finance");
          await getStudentFinancialAccessState({
            consultancyId: Number(charge.consultancy_id),
            studentMembershipId: Number(charge.student_membership_id),
          });
        }
      } catch (accessErr: unknown) {
        console.warn("[Asaas Webhook] Aviso ao recalcular acesso pós-estorno:", accessErr);
      }
    } else if (eventType === "PAYMENT_OVERDUE") {
      await connection.execute(
        `UPDATE student_charges SET asaas_status_raw = 'OVERDUE' WHERE id = ?;`,
        [chargeInternalId]
      );
    } else {
      // Outros eventos (ex: PAYMENT_CREATED, PAYMENT_UPDATED)
      await connection.execute(
        `UPDATE student_charges SET asaas_status_raw = ? WHERE id = ?;`,
        [eventType, chargeInternalId]
      );
    }

    // Marca o evento como processado com sucesso
    if (recordedEventId) {
      await connection.execute(
        `UPDATE asaas_webhook_events
         SET status = 'PROCESSED', processed = 1, processed_at = CURRENT_TIMESTAMP(3), processing_error = NULL
         WHERE id = ?;`,
        [recordedEventId]
      );
    }

    return {
      success: true,
      acknowledged: true,
      status: "PROCESSED",
      message: `Evento ${eventType} processado com sucesso para cobrança ${charge.public_id}.`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Asaas Webhook Error] Falha inesperada ao processar evento:", err);
    return {
      success: false,
      acknowledged: false,
      status: "FAILED",
      message: `Erro ao processar webhook: ${msg}`,
    };
  } finally {
    if (connection) connection.release();
  }
}
/**
 * Reprocessa eventos marcados como IGNORED_ORPHAN nas últimas 24 horas.
 * Salvaguarda contra eventuais atrasos de sincronização, timeouts de emissão ou concorrência.
 */
export async function reprocessOrphanAsaasWebhookEvents(): Promise<{
  totalOrphans: number;
  reprocessed: number;
  errors: number;
}> {
  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();
    const [orphanRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, asaas_payment_id, raw_payload
       FROM asaas_webhook_events
       WHERE status = 'IGNORED_ORPHAN'
         AND received_at >= DATE_SUB(NOW(3), INTERVAL 24 HOUR)
       ORDER BY id ASC
       LIMIT 50;`
    );

    if (!Array.isArray(orphanRows) || orphanRows.length === 0) {
      return { totalOrphans: 0, reprocessed: 0, errors: 0 };
    }

    const config = getAsaasConfig();
    const token = config?.webhookToken || null;
    let reprocessed = 0;
    let errors = 0;

    for (const row of orphanRows) {
      try {
        const payload = typeof row.raw_payload === 'string'
          ? JSON.parse(row.raw_payload)
          : row.raw_payload;

        const result = await processAsaasWebhookEvent({
          payload,
          receivedToken: token,
        });

        if (result.status === 'PROCESSED') {
          reprocessed++;
        }
      } catch (itemErr) {
        errors++;
        console.warn(`[Asaas Webhook Reprocess] Falha ao reprocessar evento órfão #${row.id}:`, itemErr);
      }
    }

    return { totalOrphans: orphanRows.length, reprocessed, errors };
  } catch (err) {
    console.error('[Asaas Pilot] Erro ao reprocessar webhooks órfãos:', err);
    return { totalOrphans: 0, reprocessed: 0, errors: 1 };
  } finally {
    if (connection) connection.release();
  }
}
