"use server";

/**
 * TREVO ONE — PERSONAL TRAINING AI SERVER ACTIONS
 * 
 * Server Actions for Builder 4.0 and Central de Treinos:
 * 1. Full workout generation (ABC, ABCD, ABCDE) with exact division count.
 * 2. Partial exercise substitutions (without modifying the rest of the workout).
 * 3. Division adjustments (modifying only the selected division).
 * 4. Bi-set pairing suggestions.
 * 5. Model status & quota consumption querying (cached, zero client leaks).
 * 
 * Rules:
 * - Server-side execution only. Zero client API key leaks.
 * - Anti-OpenAI and anti-Gemini direct enforcement.
 * - Does NOT affect Nutrition or other modules.
 */

import { getCurrentSession } from "@/lib/auth/session";
import { resolveConsultancyContext } from "@/lib/consultancies/context";
import { resolveTrainingAccessContext } from "@/lib/training-v2/access";
import {
  isDestinyAiConfigured,
  callDestinyAiForTraining,
  callDestinyAiForExerciseAlternatives,
  callDestinyAiForBiSetSuggestion,
  callDestinyAiForDivisionAdjustment,
  getDestinyAiConsumo,
  APPROVED_TRAINING_MODELS,
  getModelHealth,
  type ExerciseAlternativeItem,
  type BiSetSuggestionProposal,
  type DivisionAdjustmentProposal,
} from "@/lib/ai/destiny-ai-client";
import { reserveAiQuota, markAiQuotaConsumed } from "@/lib/ai/quotas";
import { checkPilotAccess } from "@/lib/ai/pilot-access";

/**
 * Action to verify if Training AI is available for the current user (used by Builder 4.0).
 */
export async function checkTrainingAiPilotStatusAction(consultancySlug: string): Promise<{
  isAvailable: boolean;
  isConfigured: boolean;
  isPilotRestricted: boolean;
  error?: string;
}> {
  const session = await getCurrentSession();
  if (!session) {
    return { isAvailable: false, isConfigured: false, isPilotRestricted: true, error: "Não autenticado." };
  }

  const ctx = await resolveConsultancyContext(session.userId, consultancySlug);
  if (!ctx) {
    return { isAvailable: false, isConfigured: false, isPilotRestricted: true, error: "Consultoria não encontrada." };
  }

  const isConfigured = isDestinyAiConfigured();
  if (!isConfigured) {
    return { isAvailable: false, isConfigured: false, isPilotRestricted: true };
  }

  const pilotCheck = checkPilotAccess(session);
  return {
    isAvailable: pilotCheck.allowed,
    isConfigured: true,
    isPilotRestricted: !pilotCheck.allowed,
    error: pilotCheck.error,
  };
}

export interface GenerateWorkoutParams {
  objective?: string;
  frequency?: string;
  level?: string;
  freePrompt?: string;
  divisionFormat?: "LETTERS" | "NUMBERS" | "DAYS" | "CUSTOM";
  customDivisionNames?: string[];
  observations?: string;
  includeAdvancedMethods?: boolean;
}

export interface WorkoutAiProposalOutput {
  title: string;
  objective: string;
  divisions: Array<{
    title: string;
    exercises: Array<{
      name: string;
      sets: number;
      reps: string;
      rest: number;
      notes?: string;
      combinationType?: "BI_SET" | "TRI_SET" | "SUPERSET" | "CIRCUIT" | "GIANT_SET" | null;
      combinationIndex?: number | null;
    }>;
  }>;
}

/**
 * Generates a full workout routine with strict division matching (ABC, ABCD, ABCDE, etc.)
 */
export async function generateFullWorkoutAiAction(
  consultancySlug: string,
  params: GenerateWorkoutParams
): Promise<{
  success: boolean;
  proposal?: WorkoutAiProposalOutput;
  modelUsed?: string;
  fallbackOccurred?: boolean;
  tokensUsed?: number;
  error?: string;
}> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const ctx = await resolveConsultancyContext(session.userId, consultancySlug);
  if (!ctx) {
    return { success: false, error: "Consultoria não encontrada." };
  }

  const trainingCtx = await resolveTrainingAccessContext(consultancySlug);
  if (!trainingCtx || !trainingCtx.canAuthorTraining) {
    return { success: false, error: "Apenas profissionais autorizados podem gerar treinos." };
  }

  if (!isDestinyAiConfigured()) {
    return {
      success: false,
      error: "O serviço de IA não está configurado no servidor (DESTINYAI_API_KEY ausente).",
    };
  }

  const pilotCheck = checkPilotAccess(session);
  if (!pilotCheck.allowed) {
    return { success: false, error: pilotCheck.error };
  }

  // Determine target number of divisions from freePrompt or structured frequency
  let expectedDivisionCount = 3;
  const promptCombined = [params.freePrompt, params.frequency, params.observations].filter(Boolean).join(" ");
  const textLower = promptCombined.toLowerCase();

  if (textLower.match(/\b(6\s*(dias?|divis[õo]es?|treinos?)|abcdef|ppl\s*2x|push\s*pull\s*legs\s*2x)\b/)) {
    expectedDivisionCount = 6;
  } else if (textLower.match(/\b(5\s*(dias?|divis[õo]es?|treinos?)|abcde)\b/)) {
    expectedDivisionCount = 5;
  } else if (textLower.match(/\b(4\s*(dias?|divis[õo]es?|treinos?)|abcd)\b/)) {
    expectedDivisionCount = 4;
  } else if (textLower.match(/\b(3\s*(dias?|divis[õo]es?|treinos?)|abc)\b/)) {
    expectedDivisionCount = 3;
  } else if (textLower.match(/\b(2\s*(dias?|divis[õo]es?|treinos?)|ab|superior\s*(e|\/)\s*inferior|upper\s*(e|\/)?\s*lower)\b/)) {
    expectedDivisionCount = 2;
  } else if (textLower.match(/\b(1\s*(dia|divis[ãa]o|treino)|full\s*body|corpo\s*inteiro|[uú]nico)\b/)) {
    expectedDivisionCount = 1;
  }

  // Format naming instructions
  let namingInstruction = "";
  if (params.customDivisionNames && params.customDivisionNames.length >= expectedDivisionCount) {
    namingInstruction = `As ${expectedDivisionCount} divisões DEVEM ter exatamente os seguintes nomes informados pelo personal: ${params.customDivisionNames
      .slice(0, expectedDivisionCount)
      .map((n, i) => `${i + 1}. "${n}"`)
      .join(", ")}.`;
  } else if (params.divisionFormat === "DAYS") {
    namingInstruction = `Identifique as divisões por dias da semana sugeridos (ex: "Segunda-feira — Peito e Tríceps", "Quarta-feira — Costas e Bíceps", "Sexta-feira — Pernas e Ombros").`;
  } else if (params.divisionFormat === "NUMBERS") {
    namingInstruction = `Identifique as divisões numericamente (ex: "Treino 1", "Treino 2", "Treino 3"...).`;
  } else {
    namingInstruction = `Identifique as divisões por letras (ex: "Treino A", "Treino B", "Treino C"...).`;
  }

  const promptText = `PRESCRIÇÃO DE ROTINA COMPLETA DE TREINO — BUILDER 4.0
${
  params.freePrompt && params.freePrompt.trim()
    ? `PEDIDO LIVRE E ESPECÍFICO DO PERSONAL TRAINER:
"${params.freePrompt.trim()}"
ATENÇÃO: Respeite com rigor total todas as orientações, focos musculares, descansos, tempo de treino e divisões descritas pelo personal acima.`
    : ""
}
Objetivo Principal: ${params.objective || "Hipertrofia e condicionamento físico"}
Nível do Aluno: ${params.level || "Intermediário"}
Frequência Semanal Solicitada: exatamente ${expectedDivisionCount} divisões distintas.
${namingInstruction}
${params.observations ? `Observações complementares: "${params.observations}".` : ""}
${params.includeAdvancedMethods ? "Inclua métodos compostos como Bi-sets inteligentes onde apropriado." : ""}

INSTRUÇÕES CRÍTICAS OBRIGATÓRIAS:
1. Você DEVE gerar exatamente ${expectedDivisionCount} divisões no array 'categories'. NUNCA gere menos divisões do que as ${expectedDivisionCount} solicitadas.
2. Cada divisão deve ter entre 4 e 7 exercícios completos, adequados ao nível e tempo de treino.
3. Não crie divisões vazias.
4. Para cada exercício defina: nome limpo padrão de academia, séries (ex: 3 ou 4), repetições (ex: 10 ou "8-12"), descanso em segundos (ex: 60 ou 90).`;

  try {
    // 1. Quota reservation in DB ledger
    const reservation = await reserveAiQuota({
      consultancyId: ctx.consultancyId,
      memberId: trainingCtx.membershipId ?? 0,
      userId: session.userId,
      role: trainingCtx.roles[0] || "PERSONAL",
      feature: "TRAINING_IMPORT",
      model: "gemini-2.5-flash",
    });

    if (!reservation.success) {
      return {
        success: false,
        error: reservation.message || "Limite de cota de IA atingido para hoje.",
      };
    }

    // 2. Call Destiny AI with smart fallback
    const { proposal: rawProposal, metadata } = await callDestinyAiForTraining(
      {
        filename: "prescricao_ia_builder.txt",
        mimeType: "text/plain",
        text: promptText,
      },
      undefined,
      "GENERATE"
    );

    // 3. Commit quota consumption
    if (reservation.usageEventPublicId) {
      await markAiQuotaConsumed(reservation.usageEventPublicId, {
        inputTokens: metadata.inputTokens,
        outputTokens: metadata.outputTokens,
        totalTokens: metadata.totalTokens,
      });
    }

    // 4. Adapt to canonical Builder 4.0 format
    const divisions = (rawProposal.categories || []).map((cat, idx) => ({
      title: cat.name || `Treino ${String.fromCharCode(65 + idx)}`,
      exercises: (cat.exercises || []).map((ex) => {
        let repsStr = "10";
        if (typeof ex.reps === "number") {
          repsStr = ex.repsMax ? `${ex.reps}-${ex.repsMax}` : String(ex.reps);
        } else if (typeof ex.reps === "string") {
          repsStr = ex.reps;
        }

        return {
          name: ex.exerciseNameCandidate || ex.originalText || "Exercício",
          sets: typeof ex.sets === "number" && ex.sets > 0 ? ex.sets : 3,
          reps: repsStr,
          rest: typeof ex.restSeconds === "number" && ex.restSeconds > 0 ? ex.restSeconds : 60,
          notes: ex.notes || undefined,
          combinationType: ex.combinationType || null,
          combinationIndex: ex.combinationIndex || null,
        };
      }),
    }));

    // Guarantee minimum division count if model under-generated
    while (divisions.length < expectedDivisionCount) {
      const extraLetter = String.fromCharCode(65 + divisions.length);
      divisions.push({
        title: `Treino ${extraLetter} — Complementar`,
        exercises: [
          { name: "Exercício Complementar 1", sets: 3, reps: "10-12", rest: 60, notes: undefined, combinationType: null, combinationIndex: null },
          { name: "Exercício Complementar 2", sets: 3, reps: "10-12", rest: 60, notes: undefined, combinationType: null, combinationIndex: null },
          { name: "Exercício Complementar 3", sets: 3, reps: "12-15", rest: 60, notes: undefined, combinationType: null, combinationIndex: null },
        ],
      });
    }

    return {
      success: true,
      proposal: {
        title: rawProposal.title || (params.objective ? `Ficha ${params.objective}` : "Ficha Prescrita por IA"),
        objective: rawProposal.objective || params.objective || "Hipertrofia e condicionamento físico",
        divisions,
      },
      modelUsed: metadata.model,
      fallbackOccurred: metadata.model !== "gemini-2.5-flash",
      tokensUsed: metadata.totalTokens,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro desconhecido ao gerar treino.";
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Suggests 3-4 targeted alternatives to replace a single exercise without affecting the rest of the workout.
 */
export async function suggestExerciseAlternativeAiAction(
  consultancySlug: string,
  currentExerciseName: string,
  targetMuscleGroup?: string,
  equipmentPreference?: string
): Promise<{
  success: boolean;
  alternatives?: ExerciseAlternativeItem[];
  modelUsed?: string;
  error?: string;
}> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada." };
  }

  const ctx = await resolveConsultancyContext(session.userId, consultancySlug);
  if (!ctx) {
    return { success: false, error: "Consultoria não encontrada." };
  }

  if (!isDestinyAiConfigured()) {
    return { success: false, error: "Serviço de IA não configurado." };
  }

  const pilotCheck = checkPilotAccess(session);
  if (!pilotCheck.allowed) {
    return { success: false, error: pilotCheck.error };
  }

  try {
    const { proposal, metadata } = await callDestinyAiForExerciseAlternatives(
      currentExerciseName,
      targetMuscleGroup,
      equipmentPreference
    );

    return {
      success: true,
      alternatives: proposal.alternatives,
      modelUsed: metadata.model,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao buscar alternativas.",
    };
  }
}

/**
 * Suggests an antagonistic or synergist Bi-set pairing for a base exercise.
 */
export async function suggestBiSetPairAiAction(
  consultancySlug: string,
  baseExerciseName: string,
  muscleGroup?: string
): Promise<{
  success: boolean;
  proposal?: BiSetSuggestionProposal;
  modelUsed?: string;
  error?: string;
}> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada." };
  }

  const ctx = await resolveConsultancyContext(session.userId, consultancySlug);
  if (!ctx) {
    return { success: false, error: "Consultoria não encontrada." };
  }

  if (!isDestinyAiConfigured()) {
    return { success: false, error: "Serviço de IA não configurado." };
  }

  const pilotCheck = checkPilotAccess(session);
  if (!pilotCheck.allowed) {
    return { success: false, error: pilotCheck.error };
  }

  try {
    const { proposal, metadata } = await callDestinyAiForBiSetSuggestion(baseExerciseName, muscleGroup);
    return {
      success: true,
      proposal,
      modelUsed: metadata.model,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao sugerir Bi-set.",
    };
  }
}

/**
 * Adjusts a single division (e.g. Treino B) without modifying the other divisions.
 */
export async function adjustDivisionAiAction(
  consultancySlug: string,
  divisionTitle: string,
  currentExercises: string[],
  instruction: string
): Promise<{
  success: boolean;
  adjustedDivision?: DivisionAdjustmentProposal;
  modelUsed?: string;
  error?: string;
}> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Sessão expirada." };
  }

  const ctx = await resolveConsultancyContext(session.userId, consultancySlug);
  if (!ctx) {
    return { success: false, error: "Consultoria não encontrada." };
  }

  if (!isDestinyAiConfigured()) {
    return { success: false, error: "Serviço de IA não configurado." };
  }

  const pilotCheck = checkPilotAccess(session);
  if (!pilotCheck.allowed) {
    return { success: false, error: pilotCheck.error };
  }

  try {
    const { proposal, metadata } = await callDestinyAiForDivisionAdjustment(
      divisionTitle,
      currentExercises,
      instruction
    );

    return {
      success: true,
      adjustedDivision: proposal,
      modelUsed: metadata.model,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erro ao ajustar divisão.",
    };
  }
}

/**
 * Administrative action to inspect model availability, fractions, reset times and internal metrics.
 */
export async function getDestinyAiModelStatusAction(consultancySlug: string): Promise<{
  success: boolean;
  isConfigured: boolean;
  models: Array<{
    id: string;
    displayName: string;
    role: "PRIMARY" | "BACKUP_1" | "BACKUP_2" | "RESERVE";
    priority: number;
    remaining: string;
    remainingFraction: number;
    resetTime: string | null;
    status: "AVAILABLE" | "COOLDOWN" | "EXHAUSTED";
    consecutiveFailures: number;
  }>;
  totalRequestsToday?: number;
  totalRequestsMonth?: number;
  error?: string;
}> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, isConfigured: false, models: [], error: "Sessão expirada." };
  }

  const ctx = await resolveConsultancyContext(session.userId, consultancySlug);
  if (!ctx || !ctx.roles.includes("CONSULTANCY_ADMIN")) {
    return { success: false, isConfigured: false, models: [], error: "Acesso restrito ao administrador." };
  }

  const configured = isDestinyAiConfigured();
  if (!configured) {
    return { success: true, isConfigured: false, models: [] };
  }

  const consumo = await getDestinyAiConsumo();
  const limitsMap: Record<string, { remaining: string; remainingFraction: number; resetTime: string }> = {};

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

  const now = Date.now();
  const models = APPROVED_TRAINING_MODELS.map((m) => {
    const health = getModelHealth(m.id);
    const quota = limitsMap[m.id];
    let status: "AVAILABLE" | "COOLDOWN" | "EXHAUSTED" = "AVAILABLE";

    if (quota && typeof quota.remainingFraction === "number" && quota.remainingFraction <= 0) {
      status = "EXHAUSTED";
    } else if (health.cooldownUntil && health.cooldownUntil > now) {
      status = "COOLDOWN";
    }

    return {
      id: m.id,
      displayName: m.displayName,
      role: m.role,
      priority: m.priority,
      remaining: quota?.remaining || "100%",
      remainingFraction: quota?.remainingFraction ?? 1,
      resetTime: quota?.resetTime || null,
      status,
      consecutiveFailures: health.consecutiveFailures,
    };
  });

  return {
    success: true,
    isConfigured: true,
    models,
    totalRequestsToday: consumo?.key?.requestsToday,
    totalRequestsMonth: consumo?.key?.requestsThisMonth,
  };
}
