/**
 * TREVO ONE — DESTINY AI CLIENT (OPENAI-COMPATIBLE ENDPOINT)
 * 
 * Base URL: https://api.destinyai.com.br/v1
 * Private Server-Side Variable: DESTINYAI_API_KEY
 * 
 * Rules:
 * 1. Server-side only (never exposed to client, no NEXT_PUBLIC_).
 * 2. Never uses official OpenAI endpoint (api.openai.com blocked).
 * 3. Never uses Google Gemini directly.
 * 4. Discovers real models from Destiny AI endpoint; never invents model names.
 * 5. Strict 30s timeout, max 2 retries, sanitized error messages.
 * 6. Structured JSON output for workouts (Builder compatibility) and nutrition.
 */

import OpenAI from "openai";
import JSZip from "jszip";
import {
  type RawTrainingImportProposal,
  type RawNutritionImportProposal,
} from "./schemas";
import {
  SYSTEM_PROMPT,
  TRAINING_GENERATION_SYSTEM_PROMPT,
  NUTRITION_SYSTEM_PROMPT,
  type DocumentInput,
  type ExtractionMetadata,
  detectMealSectionHeaders,
  splitTextIntoMealSections,
} from "./openai-client";

export const DESTINYAI_DEFAULT_BASE_URL = "https://api.destinyai.com.br/v1";
export const DESTINYAI_CONSUMO_URL = "https://api.destinyai.com.br/api/consumo";
export const DESTINYAI_TIMEOUT_MS = 30000;
export const DESTINYAI_MAX_RETRIES = 2;

export interface DestinyAiModelQuotaLimit {
  remaining: string;
  remainingFraction: number;
  resetTime: string;
  resetInMs: number;
}

export interface DestinyAiConsumoData {
  status: string;
  timestamp: string;
  key: {
    name?: string;
    keyPrefix?: string;
    status: string;
    totalRequests: number;
    requestsToday: number;
    requestsThisMonth: number;
    limits?: {
      windowHours?: number;
      maxRequestsPerWindow?: number;
      maxRequestsPerDay?: number;
      maxRequestsPerMonth?: number;
      expiresAt?: string;
    };
    lastUsed?: string;
  };
  models: string[];
  accounts: Array<{
    email?: string;
    status: string;
    isInvalid: boolean;
    limits?: Record<string, DestinyAiModelQuotaLimit>;
  }>;
}

export interface ApprovedModelConfig {
  id: string;
  displayName: string;
  priority: number;
  role: "PRIMARY" | "BACKUP_1" | "BACKUP_2" | "RESERVE";
  tier: "FLASH" | "PRO" | "PREMIUM";
  isApprovedForTraining: boolean;
}

export const APPROVED_TRAINING_MODELS: ApprovedModelConfig[] = [
  {
    id: "gemini-2.5-flash",
    displayName: "Gemini 2.5 Flash",
    priority: 1,
    role: "PRIMARY",
    tier: "FLASH",
    isApprovedForTraining: true,
  },
  {
    id: "gemini-3-flash",
    displayName: "Gemini 3 Flash",
    priority: 2,
    role: "BACKUP_1",
    tier: "FLASH",
    isApprovedForTraining: true,
  },
  {
    id: "gemini-2.5-flash-lite",
    displayName: "Gemini 2.5 Flash Lite",
    priority: 3,
    role: "BACKUP_2",
    tier: "FLASH",
    isApprovedForTraining: true,
  },
];

interface ModelHealthRecord {
  lastErrorType?: "RATE_LIMIT" | "SERVER_ERROR" | "TIMEOUT" | "INVALID_ARGUMENT";
  lastErrorMessage?: string;
  cooldownUntil?: number;
  consecutiveFailures: number;
  totalSuccesses: number;
  totalFailures: number;
}

const modelHealthMap = new Map<string, ModelHealthRecord>();

export function getModelHealth(modelId: string): ModelHealthRecord {
  let rec = modelHealthMap.get(modelId);
  if (!rec) {
    rec = { consecutiveFailures: 0, totalSuccesses: 0, totalFailures: 0 };
    modelHealthMap.set(modelId, rec);
  }
  return rec;
}

let consumoCache: { data: DestinyAiConsumoData; timestamp: number } | null = null;
const CONSUMO_CACHE_TTL_MS = 60 * 1000;

/**
 * Queries official Destiny AI consumption endpoint: POST https://api.destinyai.com.br/api/consumo
 * Cached in-memory for 60s to avoid redundant requests.
 */
export async function getDestinyAiConsumo(forceRefresh = false): Promise<DestinyAiConsumoData | null> {
  const apiKey = process.env.DESTINYAI_API_KEY?.trim();
  if (!apiKey) return null;

  const now = Date.now();
  if (!forceRefresh && consumoCache && (now - consumoCache.timestamp) < CONSUMO_CACHE_TTL_MS) {
    return consumoCache.data;
  }

  try {
    const res = await fetch(DESTINYAI_CONSUMO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey }),
    });

    if (!res.ok) {
      return consumoCache?.data || null;
    }

    const data = (await res.json()) as DestinyAiConsumoData;
    consumoCache = { data, timestamp: now };
    return data;
  } catch {
    return consumoCache?.data || null;
  }
}

/**
 * Returns model candidates in order of priority, checking quota remaining and cooldown.
 * Inspects all active upstream accounts (not just accounts[0]).
 */
export async function getTrainingModelCandidates(): Promise<string[]> {
  const envOverride = process.env.DESTINYAI_MODEL?.trim();
  if (envOverride) {
    return [envOverride];
  }

  const consumo = await getDestinyAiConsumo();
  const now = Date.now();

  const limitsMap: Record<string, DestinyAiModelQuotaLimit> = {};
  if (consumo?.accounts && consumo.accounts.length > 0) {
    for (const acc of consumo.accounts) {
      if (!acc.isInvalid && acc.limits) {
        for (const [modelId, limit] of Object.entries(acc.limits)) {
          if (!limitsMap[modelId] || limit.remainingFraction > (limitsMap[modelId].remainingFraction ?? 0)) {
            limitsMap[modelId] = limit;
          }
        }
      }
    }
  }

  const sorted = [...APPROVED_TRAINING_MODELS].sort((a, b) => a.priority - b.priority);
  const available: string[] = [];
  const inCooldown: string[] = [];

  for (const m of sorted) {
    const health = getModelHealth(m.id);
    const quota = limitsMap[m.id];

    if (quota && typeof quota.remainingFraction === "number" && quota.remainingFraction <= 0) {
      const resetTimeMs = quota.resetTime ? new Date(quota.resetTime).getTime() : 0;
      if (resetTimeMs > now) {
        continue;
      }
    }

    if (health.cooldownUntil && health.cooldownUntil > now) {
      inCooldown.push(m.id);
      continue;
    }

    available.push(m.id);
  }

  return [...available, ...inCooldown];
}

/**
 * Executes an operation with automatic fallback through approved models.
 * Allows reaching up to all approved models (Priority 1 -> Priority 2 -> Priority 3)
 * with bounded attempts, fast-fail on contract/auth errors, and quota exhaustion routing.
 */
export async function executeWithDestinyAiFallback<T>(
  operationName: string,
  fn: (model: string) => Promise<T>
): Promise<{ result: T; modelUsed: string; fallbackOccurred: boolean; attempts: number }> {
  const candidates = await getTrainingModelCandidates();
  if (candidates.length === 0) {
    throw new Error(
      "Não conseguimos utilizar a IA agora. Você pode tentar novamente ou continuar montando o treino manualmente."
    );
  }

  // Budget allows attempting up to all 3 approved training models in priority order
  const maxAttempts = Math.min(candidates.length, APPROVED_TRAINING_MODELS.length);
  let lastError: unknown = null;
  let attempts = 0;

  for (let i = 0; i < maxAttempts; i++) {
    const model = candidates[i];
    attempts++;
    const health = getModelHealth(model);

    try {
      const result = await fn(model);
      health.consecutiveFailures = 0;
      health.totalSuccesses++;
      delete health.cooldownUntil;
      delete health.lastErrorType;
      delete health.lastErrorMessage;

      return {
        result,
        modelUsed: model,
        fallbackOccurred: i > 0,
        attempts,
      };
    } catch (err: unknown) {
      lastError = err;
      const errMsg = err instanceof Error ? err.message : String(err);
      health.consecutiveFailures++;
      health.totalFailures++;

      const isAuthError = /authentication|unauthorized|401|403|invalid api key/i.test(errMsg);
      const isResourceExhausted = /resource[-_\s]*exhausted|quota[-_\s]*exceeded/i.test(errMsg);
      const isRateLimit = /rate[-_\s]*limit|429/i.test(errMsg) || isResourceExhausted;
      const isBadRequest = (/invalid[-_\s]*argument|bad request|400/i.test(errMsg)) && !isResourceExhausted;
      const isNoAccountsAvailable = /no accounts available|all accounts are invalid/i.test(errMsg);
      const isServerError = (/500|502|503|504|internal server error/i.test(errMsg)) || isNoAccountsAvailable;
      const isTimeout = /timeout|timed\s*out/i.test(errMsg);

      // Fast-fail: Auth or client/contract error. DO NOT cycle through other models.
      if (isAuthError) {
        throw sanitizeDestinyAiError(err, `${operationName}: Falha de autenticação na Destiny AI`);
      }
      if (isBadRequest) {
        throw sanitizeDestinyAiError(err, `${operationName}: Erro na estrutura da requisição (INVALID_ARGUMENT)`);
      }
      if (isNoAccountsAvailable) {
        // Global gateway outage: all upstream accounts invalid. Stop immediately without cycling models.
        console.error(`[DestinyAiRouter] Indisponibilidade global na Destiny AI: nenhuma conta ativa.`);
        throw new Error("Não conseguimos utilizar a IA agora. O gateway de IA está temporariamente indisponível.");
      }

      if (isRateLimit) {
        health.lastErrorType = "RATE_LIMIT";
        health.lastErrorMessage = errMsg;
        health.cooldownUntil = Date.now() + 5 * 60 * 1000;
        console.warn(
          `[DestinyAiRouter] Modelo ${model} atingiu limite de cota (${
            isResourceExhausted ? "400 RESOURCE_EXHAUSTED" : "429"
          }). Alternando para próximo modelo aprovado.`
        );
      } else if (isServerError || isTimeout) {
        health.lastErrorType = isTimeout ? "TIMEOUT" : "SERVER_ERROR";
        health.lastErrorMessage = errMsg;
        health.cooldownUntil = Date.now() + 2 * 60 * 1000;
        console.warn(
          `[DestinyAiRouter] Modelo ${model} falhou com ${health.lastErrorType}. Alternando para próximo modelo aprovado.`
        );
      }
    }
  }

  console.error(`[DestinyAiRouter] Todos os modelos aprovados tentados falharam para ${operationName}:`, lastError);
  throw new Error(
    "Não conseguimos utilizar a IA agora. Você pode tentar novamente ou continuar montando o treino manualmente."
  );
}

/**
 * Checks if Destiny AI is configured on the server.
 */
export function isDestinyAiConfigured(): boolean {
  const key = process.env.DESTINYAI_API_KEY?.trim();
  return Boolean(key && key.length > 0);
}

/**
 * Returns the configured Base URL for Destiny AI.
 */
export function getDestinyAiBaseUrl(): string {
  const url = process.env.DESTINYAI_BASE_URL?.trim() || DESTINYAI_DEFAULT_BASE_URL;
  // Hard safeguard: forbidden to point to official OpenAI endpoint or direct Gemini endpoint
  if (url.includes("api.openai.com")) {
    throw new Error(
      "Configuração inválida: O Trevo One proíbe o uso do endpoint oficial da OpenAI. Configure DESTINYAI_BASE_URL para a Destiny AI."
    );
  }
  if (url.includes("googleapis.com") || url.includes("gemini")) {
    throw new Error(
      "Configuração inválida: Proibido utilizar o endpoint Google Gemini diretamente. Utilize o endpoint da Destiny AI."
    );
  }
  return url;
}

/**
 * Initializes the OpenAI-compatible SDK instance for Destiny AI.
 */
export function getDestinyAiClient(): OpenAI {
  const apiKey = process.env.DESTINYAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("DESTINYAI_API_KEY não configurada no servidor.");
  }

  const baseURL = getDestinyAiBaseUrl();

  return new OpenAI({
    apiKey,
    baseURL,
    timeout: DESTINYAI_TIMEOUT_MS,
    maxRetries: DESTINYAI_MAX_RETRIES,
  });
}

/**
 * Queries the Destiny AI /v1/models endpoint to identify real available models.
 * Never invents model names.
 */
export async function listDestinyAiModels(): Promise<Array<{ id: string; created?: number; owned_by?: string }>> {
  const client = getDestinyAiClient();
  try {
    const list = await client.models.list();
    const models: Array<{ id: string; created?: number; owned_by?: string }> = [];
    for await (const model of list) {
      models.push({
        id: model.id,
        created: model.created,
        owned_by: model.owned_by,
      });
    }
    return models;
  } catch (err: unknown) {
    throw sanitizeDestinyAiError(err, "Falha ao listar modelos na Destiny AI");
  }
}

/**
 * Resolves the model to use:
 * 1. Checks DESTINYAI_MODEL environment variable if set by user.
 * 2. If not set, queries Destiny AI models endpoint and picks the first available.
 */
export async function resolveDestinyAiModel(): Promise<string> {
  const envModel = process.env.DESTINYAI_MODEL?.trim();
  if (envModel) {
    return envModel;
  }

  // Discover dynamically from Destiny AI endpoint
  const models = await listDestinyAiModels();
  if (models.length === 0) {
    throw new Error("Nenhum modelo disponível foi retornado pela Destiny AI.");
  }

  // Prefer economical, high-speed models with high structured JSON fidelity
  const preferred =
    models.find((m) => m.id === "gemini-2.5-flash") ||
    models.find((m) => m.id === "gemini-3-flash") ||
    models.find((m) => m.id === "gemini-2.5-flash-lite") ||
    models.find((m) => /flash/i.test(m.id) && !/image|thinking/i.test(m.id)) ||
    models[0];

  return preferred.id;
}

/**
 * Helper to reliably parse JSON from AI completions,
 * stripping Markdown code blocks or extraneous text boundaries if present,
 * and resilient against trailing commas or minor JSON quirks.
 */
export function parseJsonFromAiResponse<T>(content: string): T {
  let cleaned = content.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Attempt removing trailing commas
    const withoutTrailingCommas = cleaned.replace(/,\s*([}\]])/g, "$1");
    try {
      return JSON.parse(withoutTrailingCommas) as T;
    } catch (parseErr) {
      console.error(
        "[parseJsonFromAiResponse] Erro ao parsear JSON retornado. Trecho inicial:",
        cleaned.slice(0, 200),
        "\nTrecho final:",
        cleaned.slice(-200)
      );
      throw parseErr;
    }
  }
}

/**
 * Sanitizes errors to prevent leaking API keys, Bearer tokens, or internal URLs.
 */
export function sanitizeDestinyAiError(err: unknown, prefix = "Erro na chamada de IA"): Error {
  const original = err instanceof Error ? err.message : String(err);
  // Strip Bearer tokens, keys, query params
  const sanitized = original
    .replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, "Bearer [REDACTED]")
    .replace(/(?:api[-_]?key|key|token)=([A-Za-z0-9_\-\.]+)/gi, "$1=[REDACTED]")
    .replace(/https?:\/\/[^\s]+/gi, "[DESTINY_AI_ENDPOINT]");

  if (/timeout|timed\s*out/i.test(original)) {
    return new Error(`${prefix}: O serviço da Destiny AI demorou para responder (tempo limite de 30s excedido).`);
  }
  if (/authentication|unauthorized|401/i.test(original)) {
    return new Error(`${prefix}: Chave de autenticação da Destiny AI inválida ou não autorizada.`);
  }
  if (/rate[-_\s]*limit|429/i.test(original)) {
    return new Error(`${prefix}: Limite de requisições excedido na Destiny AI. Tente novamente em instantes.`);
  }

  return new Error(`${prefix}: ${sanitized}`);
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const docXml = await zip.file("word/document.xml")?.async("text");
  if (!docXml) return "";
  return docXml
    .replace(/<w:tab[^>]*\/>/g, " ")
    .replace(/<w:br[^>]*\/>/g, "\n")
    .replace(/<w:cr[^>]*\/>/g, "\n")
    .replace(/<w:p[^>]*>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .trim();
}

/**
 * Calls Destiny AI for Training Import or Generation.
 * Ensures compatibility with Workout Builder 4.0 with automatic model fallback.
 */
export async function callDestinyAiForTraining(
  input: DocumentInput | string,
  modelOverride?: string,
  mode: "IMPORT" | "GENERATE" = "IMPORT"
): Promise<{ proposal: RawTrainingImportProposal; metadata: ExtractionMetadata }> {
  const normalizedInput: DocumentInput =
    typeof input === "string"
      ? { filename: "solicitacao_treino.txt", mimeType: "text/plain", text: input }
      : input;

  const runner = async (model: string) => {
    const client = getDestinyAiClient();

    let userPromptText = "";
    if (normalizedInput.buffer && (normalizedInput.filename.endsWith(".docx") || normalizedInput.mimeType.includes("wordprocessingml"))) {
      userPromptText = await extractDocxText(normalizedInput.buffer);
    } else if (normalizedInput.text) {
      userPromptText = normalizedInput.text;
    } else if (normalizedInput.buffer && (normalizedInput.filename.endsWith(".txt") || normalizedInput.filename.endsWith(".md") || normalizedInput.mimeType.startsWith("text/"))) {
      userPromptText = normalizedInput.buffer.toString("utf8");
    } else if (normalizedInput.buffer && normalizedInput.filename.endsWith(".pdf")) {
      userPromptText = normalizedInput.buffer.toString("utf8").replace(/[^\x20-\x7E\xC0-\xFF\n\r\t]/g, " ").trim();
      if (!userPromptText || userPromptText.length < 20) {
        userPromptText = `Documento de treino recebido em arquivo PDF (${normalizedInput.filename}).`;
      }
    }

    const activeSystemPrompt = mode === "GENERATE" ? TRAINING_GENERATION_SYSTEM_PROMPT : SYSTEM_PROMPT;
    const userRoleContent =
      mode === "GENERATE"
        ? `Solicitação do profissional de educação física para prescrição de nova rotina de treino:\n\n${userPromptText}`
        : `Documento de treino recebido (${normalizedInput.filename}):\n\n${userPromptText}`;
    const temperature = mode === "GENERATE" ? 0.2 : 0.1;

    let parsedContent: string | null = null;
    let inputTokens = 0;
    let outputTokens = 0;
    let providerRequestId: string | undefined;

    try {
      let response;
      try {
        response = await client.chat.completions.create({
          model,
          messages: [
            {
              role: "system",
              content: `${activeSystemPrompt}\n\nResponda estritamente em formato JSON válido contendo o objeto de treino com a propriedade 'categories'.`,
            },
            { role: "user", content: userRoleContent },
          ],
          response_format: { type: "json_object" },
          temperature,
          max_tokens: 4096,
        });
      } catch {
        // Fallback without response_format if json_object encounters provider quirks
        response = await client.chat.completions.create({
          model,
          messages: [
            {
              role: "system",
              content: `${activeSystemPrompt}\n\nResponda estritamente em formato JSON contendo o objeto com a propriedade 'categories'.`,
            },
            { role: "user", content: userRoleContent },
          ],
          temperature,
          max_tokens: 4096,
        });
      }

      parsedContent = response.choices[0]?.message?.content || null;
      inputTokens = response.usage?.prompt_tokens ?? 0;
      outputTokens = response.usage?.completion_tokens ?? 0;
      providerRequestId = response.id;
    } catch (err: unknown) {
      throw sanitizeDestinyAiError(err, "Falha na geração de treino com a Destiny AI");
    }

    if (!parsedContent) {
      throw new Error("A Destiny AI não retornou conteúdo estruturado válido para o treino.");
    }

    let proposal: RawTrainingImportProposal;
    try {
      proposal = parseJsonFromAiResponse<RawTrainingImportProposal>(parsedContent);
    } catch {
      throw new Error("A Destiny AI retornou uma resposta que não pôde ser interpretada como JSON.");
    }

    // Normalize top-level fields
    const anyProp = proposal as unknown as Record<string, unknown>;
    if (!proposal.title && anyProp.routineName) {
      proposal.title = String(anyProp.routineName);
    }
    if (!proposal.objective && anyProp.goal) {
      proposal.objective = String(anyProp.goal);
    }
    if (!proposal.notes && anyProp.description) {
      proposal.notes = String(anyProp.description);
    }

    // Ensure minimum categories array structure for Workout Builder compatibility
    if (!proposal || !Array.isArray(proposal.categories)) {
      throw new Error("Estrutura de treino inválida retornada pela IA: 'categories' ausente.");
    }

    // Normalize categories and exercises for Workout Builder 4.0
    for (let cIdx = 0; cIdx < proposal.categories.length; cIdx++) {
      const cat = proposal.categories[cIdx];
      const anyCat = cat as unknown as Record<string, unknown>;
      if (!cat.name) {
        const found =
          anyCat.title ||
          anyCat.division ||
          anyCat.divisionName ||
          anyCat.category ||
          anyCat.group ||
          anyCat.day ||
          anyCat.dia ||
          anyCat.split ||
          anyCat.nome;
        cat.name = found ? String(found) : `Treino ${String.fromCharCode(65 + cIdx)}`;
      }
      if (!Array.isArray(cat.exercises)) {
        cat.exercises = [];
      }
      for (const ex of cat.exercises) {
        const anyEx = ex as unknown as Record<string, unknown>;
        if (!ex.exerciseNameCandidate && anyEx.name) {
          ex.exerciseNameCandidate = String(anyEx.name);
        }
        if (!ex.originalText) {
          ex.originalText = ex.exerciseNameCandidate || "Exercício";
        }
        if (typeof ex.sets !== "number" || ex.sets <= 0) {
          ex.sets = Number(ex.sets) || 3;
        }
        if (ex.reps === undefined || ex.reps === null) {
          ex.reps = 10;
        }
      }
    }

    return {
      proposal,
      metadata: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        model,
        providerRequestId,
      },
    };
  };

  if (modelOverride) {
    return await runner(modelOverride);
  }

  const { result } = await executeWithDestinyAiFallback("Geração/Importação de Treino", runner);
  return result;
}

export interface ExerciseAlternativeItem {
  name: string;
  targetMuscleGroup: string;
  rationale: string;
  equipment?: string;
}

export interface ExerciseAlternativesProposal {
  currentExercise: string;
  alternatives: ExerciseAlternativeItem[];
}

export async function callDestinyAiForExerciseAlternatives(
  currentExercise: string,
  muscleGroup?: string,
  equipment?: string,
  modelOverride?: string
): Promise<{ proposal: ExerciseAlternativesProposal; metadata: ExtractionMetadata }> {
  const runner = async (model: string) => {
    const client = getDestinyAiClient();
    const systemPrompt = `Você é um especialista em biomecânica e treinamento de força do Trevo One.
Sua função é sugerir alternativas imediatas e inteligentes para substituição de um exercício específico de uma ficha de treino.
Regras:
1. Responda estritamente em JSON no formato:
{
  "currentExercise": "${currentExercise}",
  "alternatives": [
    {
      "name": "Nome do Exercício Alternativo",
      "targetMuscleGroup": "Grupo Muscular Principal",
      "rationale": "Breve justificativa biomecânica ou de conveniência",
      "equipment": "Equipamento necessário"
    }
  ]
}
2. Sugira entre 3 e 4 alternativas viáveis com boa variedade de equipamentos.
3. Preserve a coerência com o grupo muscular solicitado.`;

    const userPrompt = `Exercício atual: "${currentExercise}".
Grupo muscular: ${muscleGroup || "Não especificado"}.
Equipamento disponível/preferência: ${equipment || "Geral de academia"}.
Sugira opções inteligentes de substituição.`;

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 1000,
    });

    const parsedContent = response.choices[0]?.message?.content || "{}";
    const proposal = parseJsonFromAiResponse<ExerciseAlternativesProposal>(parsedContent);

    if (!Array.isArray(proposal.alternatives) || proposal.alternatives.length === 0) {
      throw new Error("A IA não retornou alternativas válidas para o exercício.");
    }

    const inputTokens = response.usage?.prompt_tokens ?? 0;
    const outputTokens = response.usage?.completion_tokens ?? 0;

    return {
      proposal,
      metadata: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        model,
        providerRequestId: response.id,
      },
    };
  };

  if (modelOverride) {
    return await runner(modelOverride);
  }

  const { result } = await executeWithDestinyAiFallback("Substituição de Exercício", runner);
  return result;
}

export interface BiSetSuggestionProposal {
  baseExercise: string;
  pairedExercise: string;
  pairingType: "ANTAGONIST" | "AGONIST" | "SYNERGIST" | "PRE_EXHAUSTION";
  rationale: string;
  restBetweenSeconds: number;
}

export async function callDestinyAiForBiSetSuggestion(
  baseExercise: string,
  muscleGroup?: string,
  modelOverride?: string
): Promise<{ proposal: BiSetSuggestionProposal; metadata: ExtractionMetadata }> {
  const runner = async (model: string) => {
    const client = getDestinyAiClient();
    const systemPrompt = `Você é um especialista em treinamento de força do Trevo One.
Sua função é propor um exercício complementar para formar um Bi-set / Supersérie perfeito com o exercício base informado.
Regras:
1. Responda estritamente em JSON no formato:
{
  "baseExercise": "${baseExercise}",
  "pairedExercise": "Nome do Exercício Complementar",
  "pairingType": "ANTAGONIST",
  "rationale": "Justificativa da combinação",
  "restBetweenSeconds": 60
}
2. O exercício deve ser compatível com academia comercial padrão.`;

    const userPrompt = `Exercício base para o Bi-set: "${baseExercise}".
Grupo muscular: ${muscleGroup || "Geral"}.`;

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 600,
    });

    const parsedContent = response.choices[0]?.message?.content || "{}";
    const proposal = parseJsonFromAiResponse<BiSetSuggestionProposal>(parsedContent);

    if (!proposal.pairedExercise) {
      throw new Error("A IA não retornou um exercício complementar válido para o Bi-set.");
    }

    const inputTokens = response.usage?.prompt_tokens ?? 0;
    const outputTokens = response.usage?.completion_tokens ?? 0;

    return {
      proposal,
      metadata: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        model,
        providerRequestId: response.id,
      },
    };
  };

  if (modelOverride) {
    return await runner(modelOverride);
  }

  const { result } = await executeWithDestinyAiFallback("Sugestão de Bi-set", runner);
  return result;
}

export interface DivisionAdjustmentProposal {
  divisionTitle: string;
  summary: string;
  exercises: Array<{
    name: string;
    sets: number;
    reps: string;
    rest: number;
    notes?: string;
  }>;
}

export async function callDestinyAiForDivisionAdjustment(
  divisionTitle: string,
  currentExercises: string[],
  instruction: string,
  modelOverride?: string
): Promise<{ proposal: DivisionAdjustmentProposal; metadata: ExtractionMetadata }> {
  const runner = async (model: string) => {
    const client = getDestinyAiClient();
    const systemPrompt = `Você é um treinador de alto nível do Trevo One.
Sua missão é realizar um ajuste localizado e cirúrgico em UMA ÚNICA divisão de treino, mantendo a coerência de volume e intensidade.
Regras:
1. Responda estritamente em JSON:
{
  "divisionTitle": "${divisionTitle}",
  "summary": "Breve resumo do ajuste realizado",
  "exercises": [
    {
      "name": "Nome do Exercício",
      "sets": 4,
      "reps": "8-12",
      "rest": 60,
      "notes": "Observação técnica se relevante"
    }
  ]
}
2. NÃO adicione ou remova exercícios sem necessidade; atenda com precisão ao pedido do personal.`;

    const userPrompt = `Divisão a ser ajustada: "${divisionTitle}".
Exercícios atuais da divisão:
${currentExercises.map((e, i) => `${i + 1}. ${e}`).join("\n")}

Instrução do personal:
"${instruction}"`;

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 1200,
    });

    const parsedContent = response.choices[0]?.message?.content || "{}";
    const proposal = parseJsonFromAiResponse<DivisionAdjustmentProposal>(parsedContent);

    if (!Array.isArray(proposal.exercises) || proposal.exercises.length === 0) {
      throw new Error("A IA não retornou exercícios válidos para o ajuste da divisão.");
    }

    const inputTokens = response.usage?.prompt_tokens ?? 0;
    const outputTokens = response.usage?.completion_tokens ?? 0;

    return {
      proposal,
      metadata: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        model,
        providerRequestId: response.id,
      },
    };
  };

  if (modelOverride) {
    return await runner(modelOverride);
  }

  const { result } = await executeWithDestinyAiFallback("Ajuste de Divisão de Treino", runner);
  return result;
}

/**
 * Calls Destiny AI for Nutrition Import or Meal Plan Generation.
 * Ensures strict meal continuity and separation of supplements/orientations.
 */
export async function callDestinyAiForNutrition(
  input: DocumentInput,
  modelOverride?: string
): Promise<{ proposal: RawNutritionImportProposal; metadata: ExtractionMetadata }> {
  const client = getDestinyAiClient();
  const model = modelOverride || (await resolveDestinyAiModel());

  let userPromptText = "";
  if (input.buffer && (input.filename.endsWith(".docx") || input.mimeType.includes("wordprocessingml"))) {
    userPromptText = await extractDocxText(input.buffer);
  } else if (input.text) {
    userPromptText = input.text;
  } else if (input.buffer && (input.filename.endsWith(".txt") || input.filename.endsWith(".md") || input.mimeType.startsWith("text/"))) {
    userPromptText = input.buffer.toString("utf8");
  } else if (input.buffer && input.filename.endsWith(".pdf")) {
    userPromptText = input.buffer.toString("utf8").replace(/[^\x20-\x7E\xC0-\xFF\n\r\t]/g, " ").trim();
    if (!userPromptText || userPromptText.length < 20) {
      userPromptText = `Documento de plano alimentar recebido em arquivo PDF (${input.filename}).`;
    }
  }

  const detectedHeaders = userPromptText ? detectMealSectionHeaders(userPromptText) : [];
  const headerListInstruction =
    detectedHeaders.length > 0
      ? `\n\nREFEIÇÕES IDENTIFICADAS NO DOCUMENTO (${detectedHeaders.length}):\n${detectedHeaders
          .map((h, i) => `${i + 1}. ${h.title}`)
          .join("\n")}\n\nINSTRUÇÃO CRÍTICA OBRIGATÓRIA: Você DEVE gerar exatamente um objeto em 'meals' para CADA UMA das ${
          detectedHeaders.length
        } refeições listadas acima, na ordem original exata. NUNCA pare na primeira refeição.`
      : "";

  let parsedContent: string | null = null;
  let inputTokens = 0;
  let outputTokens = 0;
  let providerRequestId: string | undefined;

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: NUTRITION_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Documento de plano alimentar recebido (${input.filename}):\n\n${userPromptText}${headerListInstruction}\n\nINSTRUÇÕES DE EXTRAÇÃO:\n- Extraia TODAS as refeições presentes no documento para a lista 'meals' na ordem original exata. NUNCA pare na primeira refeição.\n- Se uma refeição começou em uma página e continuou na seguinte, todos os alimentos pertencem à MESMA refeição em andamento.\n- Separe alternativas 'OU' no campo 'substitutions' de cada alimento correspondente com suas respectivas quantidades e unidades.\n- Reúna suplementações e recomendações/sucos opcionais no campo 'notes' do plano alimentar.\n- Nomes de alimentos devem ser limpos: adjetivos de tamanho pertencem à porção/unidade, nunca ao nome do alimento.`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_completion_tokens: 16384,
    });

    parsedContent = response.choices[0]?.message?.content || null;
    inputTokens = response.usage?.prompt_tokens ?? 0;
    outputTokens = response.usage?.completion_tokens ?? 0;
    providerRequestId = response.id;
  } catch (err: unknown) {
    throw sanitizeDestinyAiError(err, "Falha na extração de nutrição com a Destiny AI");
  }

  if (!parsedContent) {
    throw new Error("A Destiny AI não retornou conteúdo estruturado válido para a nutrição.");
  }

  let proposal: RawNutritionImportProposal;
  try {
    proposal = parseJsonFromAiResponse<RawNutritionImportProposal>(parsedContent);
  } catch {
    throw new Error("A Destiny AI retornou uma resposta que não pôde ser interpretada como JSON de nutrição.");
  }

  // Section recovery: if headers detected but missing in response, attempt targeted extraction
  if (detectedHeaders.length > 1 && (!proposal.meals || proposal.meals.length < detectedHeaders.length) && userPromptText) {
    const split = splitTextIntoMealSections(userPromptText);
    if (split.sections.length > (proposal.meals?.length || 0)) {
      const existingMealNames = new Set((proposal.meals || []).map((m) => m.name.toLowerCase().trim()));

      for (const sec of split.sections) {
        const secNorm = sec.title.toLowerCase().trim();
        const alreadyExtracted = Array.from(existingMealNames).some(
          (em) => em.includes(secNorm) || secNorm.includes(em)
        );

        if (!alreadyExtracted) {
          try {
            const secResp = await client.chat.completions.create({
              model,
              messages: [
                {
                  role: "system",
                  content: `${NUTRITION_SYSTEM_PROMPT}\nExtraia a seção específica de refeição fornecida para o array 'meals'.`,
                },
                {
                  role: "user",
                  content: `Seção de refeição:\n${sec.sectionText}`,
                },
              ],
              response_format: { type: "json_object" },
              temperature: 0.1,
              max_completion_tokens: 4096,
            });
            const secJson = JSON.parse(secResp.choices[0]?.message?.content || "{}");
            if (Array.isArray(secJson.meals) && secJson.meals.length > 0) {
              proposal.meals = proposal.meals || [];
              for (const recoveredMeal of secJson.meals) {
                proposal.meals.push(recoveredMeal);
                existingMealNames.add(recoveredMeal.name.toLowerCase().trim());
              }
            }
          } catch {
            // Non-blocking recovery
          }
        }
      }
    }
  }

  // Strict non-loss guarantee: prevent partial nutrition plans
  if (detectedHeaders.length > 1 && (proposal.meals || []).length < detectedHeaders.length) {
    const extractedTitles = (proposal.meals || []).map((m) => m.name).join(", ");
    const expectedTitles = detectedHeaders.map((h) => h.title).join(", ");
    throw new Error(
      `Falha na extração de nutrição com IA: o documento contém ${detectedHeaders.length} refeições (${expectedTitles}), mas foram extraídas apenas ${(proposal.meals || []).length} (${extractedTitles}). Operação interrompida para evitar salvamento parcial de dados de saúde.`
    );
  }

  return {
    proposal,
    metadata: {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      model,
      providerRequestId,
    },
  };
}
