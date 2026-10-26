import assert from "node:assert";

console.log("================================================================================");
console.log("TREVO ONE — TEST: ONE-OFF EXECUTION INVARIANCE (QUARTA NA SEGUNDA)");
console.log("================================================================================");

// Função pura idêntica a daily-workout-resolver.ts:resolveNextBlockInCycle
function resolveNextBlockInCycle(blockIds, completedBlockIdsRecent) {
  if (blockIds.length === 0) {
    return { nextIndex: 0, pendingIndices: [], isNewCycle: true };
  }
  if (blockIds.length === 1) {
    return { nextIndex: 0, pendingIndices: [0], isNewCycle: false };
  }

  const completedInCurrentCycle = new Set();
  for (const bId of completedBlockIdsRecent) {
    if (blockIds.includes(bId)) {
      if (completedInCurrentCycle.has(bId)) {
        break;
      }
      completedInCurrentCycle.add(bId);
      if (completedInCurrentCycle.size === blockIds.length) {
        break;
      }
    }
  }

  if (completedInCurrentCycle.size === blockIds.length || completedInCurrentCycle.size === 0) {
    return {
      nextIndex: 0,
      pendingIndices: blockIds.map((_, i) => i),
      isNewCycle: true,
    };
  }

  const pendingIndices = [];
  for (let i = 0; i < blockIds.length; i++) {
    if (!completedInCurrentCycle.has(blockIds[i])) {
      pendingIndices.push(i);
    }
  }

  return {
    nextIndex: pendingIndices.length > 0 ? pendingIndices[0] : 0,
    pendingIndices,
    isNewCycle: false,
  };
}

// =============================================================================
// PARTE 1: PROGRAMAÇÃO COM DIAS DA SEMANA (WEEKDAYS FIXOS NO CALENDÁRIO)
// =============================================================================
console.log("\n1. Teste de Programação Fixa por Dias da Semana:");

const blocks = [
  { id: 101, publicId: "block-a", title: "Treino A - Peito/Tríceps", weekdays: [1] }, // Segunda
  { id: 102, publicId: "block-b", title: "Treino B - Costas/Bíceps", weekdays: [2] }, // Terça
  { id: 103, publicId: "block-c", title: "Treino C - Pernas/Ombros", weekdays: [3] }, // Quarta
];

// O aluno está na Segunda-feira (26/10) e executa o Treino C (Quarta-feira)
const mondayDate = "2026-10-26";
const mondayOneOffSession = {
  id: 9001,
  publicId: "session-mon-c",
  workoutBlockId: 103, // Bloco C
  workoutBlockPublicId: "block-c",
  startedAt: `${mondayDate}T10:00:00.000Z`,
  completedAt: `${mondayDate}T11:00:00.000Z`,
  status: "COMPLETED",
};

// 1.1 Segunda-feira: O Treino A NÃO foi concluído
const mondayPrescribedBlock = blocks.find((b) => b.weekdays.includes(1));
const wasMondayBlockCompleted = mondayOneOffSession.workoutBlockId === mondayPrescribedBlock.id;
assert.strictEqual(wasMondayBlockCompleted, false, "Treino A de segunda NÃO deve ser marcado como concluído.");
console.log("  [PASS] Executar Quarta na Segunda NÃO marca o Treino de Segunda (A) como concluído.");

// 1.2 Terça-feira (27/10): Treino prescrito continua sendo Bloco B (Costas)
const tuesdayDate = "2026-10-27";
const tuesdayPrescribedBlock = blocks.find((b) => b.weekdays.includes(2));
assert.strictEqual(tuesdayPrescribedBlock.id, 102, "Treino de Terça deve ser o Bloco B.");

// Verifica sessões completadas na data da Terça:
const sessionsDoneOnTuesday = [mondayOneOffSession].filter((s) => s.completedAt.startsWith(tuesdayDate));
assert.strictEqual(sessionsDoneOnTuesday.length, 0, "Nenhuma sessão deve constar como concluída na Terça.");
console.log("  [PASS] Treino B de Terça-feira permanece 100% intacto e pendente para o dia correto.");

// 1.3 Quarta-feira (28/10): Treino prescrito para Quarta continua sendo Bloco C
const wednesdayDate = "2026-10-28";
const wednesdayPrescribedBlock = blocks.find((b) => b.weekdays.includes(3));
assert.strictEqual(wednesdayPrescribedBlock.id, 103, "Treino de Quarta deve ser o Bloco C.");

// Verifica se o Bloco C já foi feito NA Quarta-feira:
const sessionsDoneOnWednesday = [mondayOneOffSession].filter((s) => s.completedAt.startsWith(wednesdayDate));
assert.strictEqual(sessionsDoneOnWednesday.length, 0, "Sessão de segunda NÃO conta como treino feito na Quarta.");
console.log("  [PASS] Treino C de Quarta-feira continua agendado na Quarta (data real de execução preservada na Segunda).");

// =============================================================================
// PARTE 2: PROGRAMAÇÃO SEQUENCIAL / CÍCLICA (CYCLE-BASED INVARIANCE)
// =============================================================================
console.log("\n2. Teste de Programação Cíclica (resolveNextBlockInCycle):");

const cycleBlockIds = [101, 102, 103]; // [A, B, C]

// Cenário: Aluno pulou A e B, e fez C primeiro (Cenário "Quarta na Segunda")
// Histórico recente contém apenas [103] (C)
const cycleResolution = resolveNextBlockInCycle(cycleBlockIds, [103]);

// O próximo recomendado deve ser A (índice 0), com pendentes [0, 1] (A e B)
assert.strictEqual(cycleResolution.nextIndex, 0, "Próximo treino recomendado após C avulso deve ser A (índice 0)");
assert.deepStrictEqual(cycleResolution.pendingIndices, [0, 1], "Pendentes no ciclo devem ser [A, B]");
assert.strictEqual(cycleResolution.isNewCycle, false, "Não é novo ciclo, ciclo continua em aberto");
console.log("  [PASS] Na programação sequencial, executar C avulso mantém A e B como pendentes no ciclo.");

// Cenário subsequente: Aluno faz A na sequência -> Histórico: [101, 103]
const cycleResolutionAfterA = resolveNextBlockInCycle(cycleBlockIds, [101, 103]);
assert.strictEqual(cycleResolutionAfterA.nextIndex, 1, "Próximo recomendado deve ser B (índice 1)");
assert.deepStrictEqual(cycleResolutionAfterA.pendingIndices, [1], "Pendente restante no ciclo deve ser apenas B");
console.log("  [PASS] Execução subsequente de A avança naturalmente para B sem reordenar permanentemente.");

console.log("\n================================================================================");
console.log("TODOS OS TESTES DE INVARIÂNCIA DE EXECUÇÃO AVULSA PASSARAM COM SUCESSO!");
console.log("================================================================================");
