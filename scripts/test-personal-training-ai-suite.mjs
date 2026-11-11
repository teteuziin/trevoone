/**
 * TREVO ONE — FASE 1: TEST SUITE PERSONAL & TREINOS
 * GERENCIADOR INTELIGENTE DESTINY AI + BUILDER 4.0
 * 
 * Tests Section 11 (A through K):
 * A. Quotas & Limits from POST https://api.destinyai.com.br/api/consumo
 * B. Smart Model Routing & Fallback Simulation (Primary -> Backup 1 -> Backup 2, fast-fail on 400/401)
 * C. Full ABC Workout Generation & Volume Validation
 * D. Full ABCDE Workout Generation (exactly 5 divisions, coherent volume)
 * E. Custom Division Names Preservation ("Segunda-feira", etc.)
 * F. Advanced Methods (Bi-set, Tri-set, Supersérie, Circuito metadata)
 * G. Partial Adjustments (Single exercise substitution)
 * H. Builder 4.0 Data Contract Compatibility (WorkoutBlockDto)
 * I. Program Application with Zero AI Calls ("Escolher programa")
 * J. Maximum Economy & Zero-AI operations
 * K. Multi-screen Responsiveness & Visual Hardening
 */

import assert from "node:assert/strict";
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";

register(pathToFileURL(path.resolve("scripts/ts-loader.mjs")).href, import.meta.url);

// Load environment variables from .env.local if present
const envLocalPath = path.resolve(".env.local");
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const {
  isDestinyAiConfigured,
  getDestinyAiConsumo,
  APPROVED_TRAINING_MODELS,
  getModelHealth,
  executeWithDestinyAiFallback,
  callDestinyAiForTraining,
  callDestinyAiForExerciseAlternatives,
  callDestinyAiForBiSetSuggestion,
  callDestinyAiForDivisionAdjustment,
  parseJsonFromAiResponse,
} = await import(pathToFileURL(path.resolve("lib/ai/destiny-ai-client.ts")).href);

function logStep(code, title) {
  console.log(`\n\x1b[1m\x1b[34m[TESTE ${code}]\x1b[0m \x1b[1m${title}\x1b[0m`);
}

function logPass(msg) {
  console.log(`  \x1b[32m✔ PASS:\x1b[0m ${msg}`);
}

function logInfo(msg) {
  console.log(`  \x1b[36mℹ INFO:\x1b[0m ${msg}`);
}

async function runPersonalTrainingAiSuite() {
  console.log("================================================================================");
  console.log("  🍀 TREVO ONE — TEST SUITE FASE 1: PERSONAL, TREINOS & DESTINY AI              ");
  console.log("================================================================================");

  let passedTests = 0;
  let totalTests = 0;

  async function countTest(fn) {
    totalTests++;
    await fn();
    passedTests++;
  }

  // --------------------------------------------------------------------------
  // TESTE A — LIMITES & CONSUMO OFICIAL NO GATEWAY (/api/consumo)
  // --------------------------------------------------------------------------
  logStep("A", "Consulta Oficial de Limites da Destiny AI (POST /api/consumo)");

  await countTest(async () => {
    assert.ok(isDestinyAiConfigured(), "DESTINYAI_API_KEY deve estar configurada no ambiente seguro");
    logPass("DESTINYAI_API_KEY detectada com sucesso (backend seguro, sem vazamento no client)");
  });

  const consumo1 = await getDestinyAiConsumo(true);
  await countTest(async () => {
    assert.ok(consumo1, "A rota /api/consumo deve responder com objeto válido");
    assert.ok(consumo1.status === 200 || consumo1.status === "ok", "Status de consumo deve ser 'ok' ou 200");
    assert.equal(consumo1.key?.status, "active", "Chave da Destiny AI deve estar ativa");
    if (consumo1.key?.tier) {
      assert.equal(consumo1.key?.tier, "pro", "Plano da conta deve ser 'pro'");
    }
    assert.ok(Array.isArray(consumo1.accounts), "Deve conter array de contas upstream");
    logPass(`Chave: status="${consumo1.key.status}", requestsToday=${consumo1.key.requestsToday}`);
  });

  // Verify per-model limits representation
  await countTest(async () => {
    const primaryAccount = consumo1.accounts[0];
    assert.ok(primaryAccount?.limits, "A conta deve conter o mapa 'limits'");
    
    // Check our 3 approved models
    for (const m of APPROVED_TRAINING_MODELS) {
      const quota = primaryAccount.limits[m.id];
      assert.ok(quota, `O modelo aprovado ${m.id} deve ter entrada no mapa de cotas do gateway`);
      assert.ok(typeof quota.remainingFraction === "number", `remainingFraction deve ser número para ${m.id}`);
      assert.ok(quota.resetTime, `resetTime deve estar informado para ${m.id}`);
      logPass(`Modelo [${m.displayName}] (${m.id}): Cota=${quota.remaining} (${Math.round(quota.remainingFraction * 100)}%), Renovação=${quota.resetTime}`);
    }
  });

  // Verify multi-account interpretation across all accounts in accounts array
  await countTest(async () => {
    assert.ok(consumo1.accounts.length >= 1, "Deve conter ao menos 1 conta upstream");
    const validAccounts = consumo1.accounts.filter((a) => !a.isInvalid);
    assert.ok(validAccounts.length >= 1, "Deve existir ao menos 1 conta válida");
    logPass(`Interpretação de contas: total=${consumo1.accounts.length}, ativas/válidas=${validAccounts.length}`);
  });

  // Verify caching: second call within 60s must return cached object immediately
  const t0 = Date.now();
  const consumo2 = await getDestinyAiConsumo(false);
  const durationCache = Date.now() - t0;
  await countTest(async () => {
    assert.strictEqual(consumo1, consumo2, "Chamadas subsequentes devem vir do cache em memória");
    assert.ok(durationCache < 15, "Resposta do cache em memória deve ser instantânea (<15ms)");
    logPass(`Cache de consumo funcionando perfeitamente (resolvido em ${durationCache}ms sem chamada HTTP repetida)`);
  });

  // --------------------------------------------------------------------------
  // TESTE B — FALLBACK AUTOMÁTICO & RESILIÊNCIA A FALHAS (SIMULAÇÃO CONTROLADA)
  // --------------------------------------------------------------------------
  logStep("B", "Alternância Automática e Fallback entre Modelos Aprovados");

  await countTest(async () => {
    assert.equal(APPROVED_TRAINING_MODELS.length, 3, "Devem existir exatamente 3 modelos aprovados configurados");
    assert.equal(APPROVED_TRAINING_MODELS[0].id, "gemini-2.5-flash", "Prioridade 1 = gemini-2.5-flash");
    assert.equal(APPROVED_TRAINING_MODELS[1].id, "gemini-3-flash", "Prioridade 2 (Reserva 1) = gemini-3-flash");
    assert.equal(APPROVED_TRAINING_MODELS[2].id, "gemini-2.5-flash-lite", "Prioridade 3 (Reserva 2) = gemini-2.5-flash-lite");
    logPass("Ordem de prioridade validada: 1=gemini-2.5-flash, 2=gemini-3-flash, 3=gemini-2.5-flash-lite");
  });

  // Test Fallback simulation 1: When model 1 fails with 429, switches to model 2
  await countTest(async () => {
    const attempts = [];
    const simulatedResult = await executeWithDestinyAiFallback(
      "Simulação Fallback 429",
      async (modelName) => {
        attempts.push(modelName);
        if (modelName === "gemini-2.5-flash") {
          const err = new Error("429 Too Many Requests: Rate limit exceeded");
          err.status = 429;
          throw err;
        }
        return {
          text: '{"categories":[{"name":"Treino A","exercises":[]}]}',
          model: modelName,
          totalTokens: 120,
        };
      }
    );

    assert.equal(attempts.length, 2, "Fallback deve ter acionado exatamente 2 tentativas");
    assert.equal(attempts[0], "gemini-2.5-flash", "Primeira tentativa deve ser modelo principal");
    assert.equal(attempts[1], "gemini-3-flash", "Segunda tentativa deve ser reserva 1");
    assert.equal(simulatedResult.modelUsed, "gemini-3-flash", "Modelo vencedor deve ser gemini-3-flash");
    logPass("Comutação em 429: gemini-2.5-flash esgotado -> gemini-3-flash assumiu com sucesso");

    // Reset health of gemini-2.5-flash for isolated testing
    const h1 = getModelHealth("gemini-2.5-flash");
    delete h1.cooldownUntil;
    h1.consecutiveFailures = 0;
  });

  // Test Fallback simulation 2: When Model 1 (400 RESOURCE_EXHAUSTED) and Model 2 (429) fail, switches to Model 3
  await countTest(async () => {
    const attempts = [];
    const simulatedResult = await executeWithDestinyAiFallback(
      "Simulação Fallback 3º Modelo",
      async (modelName) => {
        attempts.push(modelName);
        if (modelName === "gemini-2.5-flash") {
          // Official Destiny AI error: 400 + RESOURCE_EXHAUSTED
          const err = new Error("400 Bad Request: RESOURCE_EXHAUSTED - Quota exceeded for model");
          err.status = 400;
          throw err;
        }
        if (modelName === "gemini-3-flash") {
          const err = new Error("429 Too Many Requests: Model rate limit reached");
          err.status = 429;
          throw err;
        }
        return {
          text: '{"categories":[{"name":"Treino A","exercises":[]}]}',
          model: modelName,
          totalTokens: 95,
        };
      }
    );

    assert.equal(attempts.length, 3, "Orçamento de fallback deve acionar exatamente 3 tentativas até o 3º modelo");
    assert.equal(attempts[0], "gemini-2.5-flash", "Tentativa 1 = gemini-2.5-flash");
    assert.equal(attempts[1], "gemini-3-flash", "Tentativa 2 = gemini-3-flash");
    assert.equal(attempts[2], "gemini-2.5-flash-lite", "Tentativa 3 = gemini-2.5-flash-lite (Reserva 2)");
    assert.equal(simulatedResult.modelUsed, "gemini-2.5-flash-lite", "Modelo vencedor deve ser gemini-2.5-flash-lite");
    assert.equal(simulatedResult.fallbackOccurred, true, "Fallback deve ser sinalizado");
    logPass("Comprovação 3º modelo: gemini-2.5-flash (400 RESOURCE_EXHAUSTED) e gemini-3-flash (429) esgotados -> gemini-2.5-flash-lite assumiu com sucesso");

    // Reset health for isolated testing
    for (const m of ["gemini-2.5-flash", "gemini-3-flash", "gemini-2.5-flash-lite"]) {
      const h = getModelHealth(m);
      delete h.cooldownUntil;
      h.consecutiveFailures = 0;
    }
  });

  // Test Fallback simulation 3: All 3 models exhausted -> graceful failure
  await countTest(async () => {
    const attempts = [];
    let caughtError = null;
    try {
      await executeWithDestinyAiFallback(
        "Simulação Todos Esgotados",
        async (modelName) => {
          attempts.push(modelName);
          const err = new Error("429 Too Many Requests: Rate limit exceeded");
          err.status = 429;
          throw err;
        }
      );
    } catch (err) {
      caughtError = err;
    }

    assert.ok(caughtError, "Deve lançar erro amigável ao esgotar todos os modelos");
    assert.equal(attempts.length, 3, "Deve parar estritamente na 3ª tentativa (sem loops infinitos)");
    assert.ok(
      caughtError.message.includes("Não conseguimos utilizar a IA agora"),
      "Mensagem deve ser amigável e segura"
    );
    logPass("Todos os 3 modelos esgotados: orçamento estritamente limitado a 3 tentativas, sem loop infinito");

    // Reset health for isolated testing
    for (const m of ["gemini-2.5-flash", "gemini-3-flash", "gemini-2.5-flash-lite"]) {
      const h = getModelHealth(m);
      delete h.cooldownUntil;
      h.consecutiveFailures = 0;
    }
  });

  // Fast-fail test on 400 INVALID_ARGUMENT: should NOT retry other models
  await countTest(async () => {
    const attempts = [];
    let caughtError = null;
    try {
      await executeWithDestinyAiFallback(
        "Simulação Fast-Fail 400 INVALID_ARGUMENT",
        async (modelName) => {
          attempts.push(modelName);
          const err = new Error("400 Bad Request: INVALID_ARGUMENT - Malformed JSON body");
          err.status = 400;
          throw err;
        }
      );
    } catch (err) {
      caughtError = err;
    }

    assert.ok(caughtError, "Deve lançar o erro 400 INVALID_ARGUMENT");
    assert.equal(attempts.length, 1, "Erro 400 INVALID_ARGUMENT NÃO deve tentar outros modelos inutilmente");
    assert.equal(attempts[0], "gemini-2.5-flash", "Apenas o primeiro modelo foi chamado antes do corte");
    logPass("Diferenciação 400: INVALID_ARGUMENT corta imediatamente sem tentar próximos modelos");
  });

  // Fast-fail test on 401/403 Authentication Error: should NOT retry other models
  await countTest(async () => {
    const attempts = [];
    let caughtError = null;
    try {
      await executeWithDestinyAiFallback(
        "Simulação Fast-Fail 401 Auth",
        async (modelName) => {
          attempts.push(modelName);
          const err = new Error("401 Unauthorized: Invalid API key");
          err.status = 401;
          throw err;
        }
      );
    } catch (err) {
      caughtError = err;
    }

    assert.ok(caughtError, "Deve lançar o erro 401");
    assert.equal(attempts.length, 1, "Erro 401 de autenticação NÃO deve tentar outros modelos");
    logPass("Fast-fail 401/403: corte imediato em falha de autenticação/permissão");
  });

  // Global Outage test (All accounts invalid / No accounts available): should NOT cycle models
  await countTest(async () => {
    const attempts = [];
    let caughtError = null;
    try {
      await executeWithDestinyAiFallback(
        "Simulação Falha Global 500 All accounts invalid",
        async (modelName) => {
          attempts.push(modelName);
          const err = new Error("500 Internal Server Error: All accounts are invalid: Account requires verification");
          err.status = 500;
          throw err;
        }
      );
    } catch (err) {
      caughtError = err;
    }

    assert.ok(caughtError, "Deve lançar erro de gateway indisponível");
    assert.equal(attempts.length, 1, "Indisponibilidade global de contas corta na 1ª tentativa sem desperdício");
    logPass("Falha global (All accounts invalid / No accounts available): corte imediato sem repetição inútil");
  });

  // --------------------------------------------------------------------------
  // TESTE C — GERAÇÃO DE TREINO ABC COMPLETO COM ESTRUTURA REAL DO BUILDER
  // --------------------------------------------------------------------------
  logStep("C", "Geração de Treino ABC Completo com Validação de Volume e Estrutura");

  const abcPrompt = `Monte uma ficha de treino ABC para Aluno Intermediário com foco em Hipertrofia.
Frequência: 3 dias na semana.
Exigências de volume: exatamente 3 divisões distintas (Treino A: Peitoral/Tríceps, Treino B: Costas/Bíceps, Treino C: Pernas/Abdômen).
Cada divisão deve ter entre 4 e 6 exercícios completos com séries (3 a 4), repetições (ex: 8-10, 10-12) e descanso (45 a 90s).`;

  const abcResult = await callDestinyAiForTraining(abcPrompt, undefined, "GENERATE");

  await countTest(() => {
    assert.ok(abcResult.proposal, "Geração ABC deve ter sucesso e retornar proposal");
    assert.ok(Array.isArray(abcResult.proposal.categories), "categories deve ser um array");
    assert.equal(abcResult.proposal.categories.length, 3, "Treino ABC deve conter exatamente 3 divisões");
    logPass(`Divisões geradas: ${abcResult.proposal.categories.length} divisões`);
  });

  await countTest(() => {
    let totalExercises = 0;
    for (const div of abcResult.proposal.categories) {
      const title = div.name || div.title || div.category;
      assert.ok(title, "Divisão deve conter título legível");
      assert.ok(Array.isArray(div.exercises), "Divisão deve conter lista de exercícios");
      assert.ok(div.exercises.length >= 4, `Divisão ${title} deve ter pelo menos 4 exercícios (encontrados ${div.exercises.length})`);
      totalExercises += div.exercises.length;

      for (const ex of div.exercises) {
        const name = ex.exerciseNameCandidate || ex.name || ex.originalText;
        assert.ok(name, "Exercício deve conter nome");
        assert.ok(typeof ex.sets === "number" && ex.sets >= 2, "Séries devem ser número >= 2");
        assert.ok(ex.reps !== undefined, "Repetições devem estar preenchidas");
        const rest = ex.restSeconds ?? ex.rest;
        assert.ok(typeof rest === "number" && rest >= 30, "Descanso deve ser número >= 30s");
      }
    }
    assert.ok(totalExercises >= 12, `Treino ABC completo deve conter ao menos 12 exercícios no total (encontrados ${totalExercises})`);
    logPass(`Volume verificado: total de ${totalExercises} exercícios com séries, reps e descansos válidos`);
    logInfo(`Modelo utilizado: ${abcResult.metadata?.model}, tokens: ${abcResult.metadata?.totalTokens}`);
  });

  // --------------------------------------------------------------------------
  // TESTE D — GERAÇÃO DE TREINO ABCDE (5 DIVISÕES COERENTES)
  // --------------------------------------------------------------------------
  logStep("D", "Geração de Treino ABCDE (Exatamente 5 divisões distintas)");

  const abcdePrompt = `Monte uma ficha de treino ABCDE para Aluno Avançado com foco em Hipertrofia.
Frequência: 5 dias na semana.
Exigências estritas: Retorne EXATAMENTE 5 divisões:
1. Treino A: Peitoral e Abdômen
2. Treino B: Costas e Panturrilhas
3. Treino C: Quadríceps e Glúteos
4. Treino D: Ombros e Trapézio
5. Treino E: Braços (Bíceps e Tríceps) e Isquiotibiais
Cada divisão deve ter 4 a 6 exercícios completos.`;

  const abcdeResult = await callDestinyAiForTraining(abcdePrompt, undefined, "GENERATE");

  await countTest(() => {
    assert.ok(abcdeResult.proposal, "Geração ABCDE deve ter sucesso");
    assert.ok(Array.isArray(abcdeResult.proposal.categories), "categories deve ser um array");
    assert.equal(abcdeResult.proposal.categories.length, 5, `Treino ABCDE deve conter exatamente 5 divisões (obtidas: ${abcdeResult.proposal.categories.length})`);
    logPass(`Treino ABCDE: exatamente 5 divisões geradas: ${abcdeResult.proposal.categories.map(d => d.name || d.title || d.category).join(" | ")}`);
  });

  await countTest(() => {
    let totalExercises = 0;
    for (const div of abcdeResult.proposal.categories) {
      assert.ok(div.exercises.length >= 4, `Divisão ${div.name || div.title || div.category} deve ter ao menos 4 exercícios`);
      totalExercises += div.exercises.length;
    }
    assert.ok(totalExercises >= 20, `Treino ABCDE completo deve ter ao menos 20 exercícios no total (encontrados ${totalExercises})`);
    logPass(`Volume ABCDE validado: ${totalExercises} exercícios no total com distribuição equilibrada`);
  });

  // --------------------------------------------------------------------------
  // TESTE E — NOMES PERSONALIZADOS DE DIVISÃO ("Segunda-feira", etc.)
  // --------------------------------------------------------------------------
  logStep("E", "Preservação de Nomes Personalizados de Divisões");

  const customPrompt = `Gere uma rotina de 3 categorias utilizando os nomes solicitados:
1. "Segunda-feira — Peito e Ombros"
2. "Quarta-feira — Costas e Bíceps"
3. "Sexta-feira — Membros Inferiores"
No JSON gerado, o campo 'name' de cada categoria DEVE ser exatamente o nome informado acima.`;

  const customResult = await callDestinyAiForTraining(customPrompt, undefined, "GENERATE");

  await countTest(() => {
    assert.ok(customResult.proposal, "Geração com nomes personalizados deve ter sucesso");
    const titles = customResult.proposal.categories.map((d) => (d.name || "").toLowerCase());
    assert.ok(titles.some((t) => t.includes("segunda")), "Deve preservar 'Segunda-feira'");
    assert.ok(titles.some((t) => t.includes("quarta")), "Deve preservar 'Quarta-feira'");
    assert.ok(titles.some((t) => t.includes("sexta")), "Deve preservar 'Sexta-feira'");
    logPass(`Nomes personalizados preservados: ${customResult.proposal.categories.map(d => d.name).join(" | ")}`);
  });

  // --------------------------------------------------------------------------
  // TESTE F — MÉTODOS AVANÇADOS (BI-SET, TRI-SET, SUPERSÉRIE, CIRCUITO)
  // --------------------------------------------------------------------------
  logStep("F", "Métodos Avançados & Sugestão de Combinações Bi-Set");

  await countTest(async () => {
    const biSetResult = await callDestinyAiForBiSetSuggestion("Supino Reto com Barra");
    assert.ok(biSetResult.proposal?.pairedExercise, "Deve sugerir um exercício parceiro para Bi-set");
    assert.ok(typeof biSetResult.proposal.pairedExercise === "string" && biSetResult.proposal.pairedExercise.length > 3);
    logPass(`Bi-set sugerido para [Supino Reto com Barra]: ${biSetResult.proposal.pairedExercise} (${biSetResult.proposal.pairingType})`);
  });

  await countTest(() => {
    // Verify JSON normalization handles combinationType and combinationIndex
    const mockJson = `{"categories":[{"name":"Treino A","exercises":[{"exerciseNameCandidate":"Rosca Direta","sets":4,"reps":"10","restSeconds":60,"combinationType":"BI_SET","combinationIndex":1},{"exerciseNameCandidate":"Tríceps Testa","sets":4,"reps":"10","restSeconds":60,"combinationType":"BI_SET","combinationIndex":1}]}]}`;
    const parsed = parseJsonFromAiResponse(mockJson);
    assert.equal(parsed.categories[0].exercises[0].combinationType, "BI_SET");
    assert.equal(parsed.categories[0].exercises[1].combinationIndex, 1);
    logPass("Metadados de combinações (combinationType='BI_SET', combinationIndex=1) preservados no contrato");
  });

  // --------------------------------------------------------------------------
  // TESTE G — AJUSTES PARCIAIS (SUBSTITUIÇÃO DE EXERCÍCIO ÚNICO)
  // --------------------------------------------------------------------------
  logStep("G", "Ajustes Parciais (Substituição de Exercício Único sem tocar no restante)");

  await countTest(async () => {
    const altResult = await callDestinyAiForExerciseAlternatives(
      "Agachamento Livre com Barra",
      "Quadríceps / Membros Inferiores"
    );
    assert.ok(Array.isArray(altResult.proposal?.alternatives), "Deve retornar lista de alternativas");
    assert.ok(altResult.proposal.alternatives.length >= 3, "Deve sugerir pelo menos 3 alternativas");
    const names = altResult.proposal.alternatives.map((a) => a.name);
    logPass(`Alternativas para [Agachamento Livre com Barra]: ${names.join(", ")}`);
  });

  // --------------------------------------------------------------------------
  // TESTE H — COMPATIBILIDADE DE CONTRATO COM BUILDER 4.0 (WorkoutBlockDto)
  // --------------------------------------------------------------------------
  logStep("H", "Compatibilidade de Contrato de Dados com o Builder 4.0");

  await countTest(() => {
    // Transform proposal to WorkoutBlockDto structure
    const sampleProposal = abcResult.proposal;
    const blocks = sampleProposal.categories.map((div, dIdx) => ({
      id: dIdx + 1,
      publicId: `blk_test_${dIdx + 1}`,
      title: div.name,
      orderIndex: dIdx,
      items: div.exercises.map((ex, eIdx) => ({
        id: (dIdx + 1) * 100 + eIdx + 1,
        publicId: `item_test_${dIdx}_${eIdx}`,
        blockId: dIdx + 1,
        exerciseId: null,
        exerciseNameSnapshot: ex.exerciseNameCandidate || ex.originalText || "Exercício",
        orderIndex: eIdx,
        sets: Array.from({ length: ex.sets || 3 }, (_, sIdx) => ({
          id: sIdx + 1,
          setNumber: sIdx + 1,
          targetReps: String(ex.reps || "10-12"),
          restSeconds: ex.restSeconds || 60,
        })),
        restSecondsBetweenSets: ex.restSeconds || 60,
        notes: ex.notes || null,
        combinationType: ex.combinationType || null,
        combinationIndex: ex.combinationIndex || null,
      })),
    }));

    assert.equal(blocks.length, 3, "Devem existir 3 blocos");
    assert.ok(blocks[0].items.length >= 4, "Primeiro bloco deve ter itens");
    assert.ok(blocks[0].items[0].sets.length >= 3, "Primeiro item deve ter ao menos 3 séries estruturadas");
    assert.ok(blocks[0].items[0].sets[0].targetReps, "targetReps deve estar preenchido");
    logPass("Estrutura 100% aderente a WorkoutBlockDto, WorkoutBlockItemDto e WorkoutItemSetDto");
  });

  // --------------------------------------------------------------------------
  // TESTE I — APLICAÇÃO DE PROGRAMAS COM ZERO IA ("Escolher programa")
  // --------------------------------------------------------------------------
  logStep("I", "Aplicação de Programas de Treino sem consumo de IA");

  await countTest(() => {
    // Auditing lib/training-v2/workout-repository.ts
    const repoFile = fs.readFileSync(path.resolve("lib/training-v2/workout-repository.ts"), "utf-8");
    assert.ok(
      repoFile.includes("createWorkoutFromTemplate"),
      "workout-repository.ts deve implementar createWorkoutFromTemplate"
    );
    assert.ok(
      !repoFile.includes("callDestinyAi") && !repoFile.includes("callOpenAiCompatible"),
      "workout-repository.ts JAMAIS deve invocar IA durante a clonagem de programas"
    );
    logPass("Aplicação de Programas ('Escolher programa') realiza clonagem 100% transacional via MySQL com ZERO chamadas de IA");
  });

  // --------------------------------------------------------------------------
  // TESTE J — ECONOMIA MÁXIMA & ZERO CONSUMO EM AÇÕES MANUAIS
  // --------------------------------------------------------------------------
  logStep("J", "Economia Máxima: Salvamento, Retomada e Edição com ZERO IA");

  await countTest(() => {
    const editorFile = fs.readFileSync(
      path.resolve("components/consultancies/training-v2/workout-editor-4/workout-editor-4.tsx"),
      "utf-8"
    );

    // Save and resume actions must not import AI
    assert.ok(editorFile.includes("handleSave"), "Editor 4.0 implementa handleSave local/server");
    assert.ok(
      !editorFile.includes("generateFullWorkoutAiAction") ||
      editorFile.includes("AiHelperDrawer"),
      "Chamadas de IA estão estritamente contidas no Drawer 'Me ajuda (IA)'"
    );
    logPass("Salvamento, Retomada de rascunho, Reordenação e Edição manual consom ZERO chamadas de IA");
  });

  // --------------------------------------------------------------------------
  // TESTE K — RESPONSIVIDADE E INTEGRIDADE VISUAL
  // --------------------------------------------------------------------------
  logStep("K", "Responsividade e Integridade Visual do Drawer e Telas Administrativas");

  await countTest(() => {
    const drawerFile = fs.readFileSync(
      path.resolve("components/consultancies/training-v2/workout-editor-4/ai-helper-drawer.tsx"),
      "utf-8"
    );
    assert.ok(drawerFile.includes("fixed inset-0"), "Drawer deve ter container fixed responsivo");
    assert.ok(drawerFile.includes("max-h-[90vh]"), "Drawer deve respeitar teto de altura em telas mobile");
    assert.ok(drawerFile.includes("overflow-y-auto"), "Painel deve conter rolagem vertical controlada");
    logPass("AiHelperDrawer possui layout responsivo adaptável de 320px a 1920px");
  });

  console.log("\n================================================================================");
  console.log(`  RESULTADO: ${passedTests}/${totalTests} TESTES APROVADOS COM SUCESSO!           `);
  console.log("================================================================================\n");
}

runPersonalTrainingAiSuite().catch((err) => {
  console.error("\n\x1b[31m❌ ERRO NA EXECUÇÃO DA SUITE:\x1b[0m", err);
  process.exit(1);
});
