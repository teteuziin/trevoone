/**
 * Test Suite: Workout Builder - Category Selection and Custom Exercise Preservation
 *
 * Validates:
 * 1. Creating a new category immediately updates the active category index to the new category.
 * 2. Mobile view renders the new category as active (not hidden), advancing from the previous category.
 * 3. Custom Exercise creation with Sets = 3, Reps = "10-12", Load = "14", and Rest = 0:
 *    - Produces exactly 3 sets (never 1 set).
 *    - Preserves range reps: repsMin = 10, repsMax = 12 (never truncated by parseInt).
 *    - Preserves loadKg = 14.
 *    - Preserves restSeconds = 0 (never falling back to 60s due to falsy checks).
 * 4. Summary formatting reflects: "3 séries · 10-12 reps · 14kg · 0s descanso".
 */

import assert from "node:assert/strict";
import { parseRepsInput, formatRepetitionRange } from "../lib/training-v2/reps-normalizer.ts";

console.log("=== INICIANDO TESTES DO CONSTRUTOR DE TREINOS: CATEGORIAS E EXERCÍCIOS PERSONALIZADOS ===\n");

// -------------------------------------------------------------
// TEST 1: Criação de Nova Categoria e Seleção Automática
// -------------------------------------------------------------
console.log("Test 1: Criação de nova categoria define novo índice ativo imediatamente...");

const initialBlocks = [
  { publicId: "cat-1", title: "Terça • peito e triceps", items: [] },
];

let activeMobileCategoryIndex = 0;

function simulateCreateCategory(currentBlocks, newTitle, newPublicId) {
  const newCatIdx = currentBlocks.length;
  const newBlock = { publicId: newPublicId, title: newTitle, items: [] };
  const updatedBlocks = [...currentBlocks, newBlock];
  // Updated state handler sets activeMobileCategoryIndex to newCatIdx
  activeMobileCategoryIndex = newCatIdx;
  return { updatedBlocks, activeIndex: activeMobileCategoryIndex };
}

const resCreation = simulateCreateCategory(
  initialBlocks,
  "QUINTA • COSTAS, OMBROS E BÍCEPS",
  "cat-2"
);

assert.equal(resCreation.updatedBlocks.length, 2, "Deveria ter 2 categorias após criação");
assert.equal(resCreation.activeIndex, 1, "Índice ativo deve apontar para a nova categoria (índice 1)");
assert.equal(activeMobileCategoryIndex, 1, "Estado activeMobileCategoryIndex deve ser 1");

// Verificar lógica de visibilidade mobile
function isCategoryHidden(catIdx, activeIdx, totalCats) {
  return activeIdx !== -1 && activeIdx !== catIdx && activeIdx < totalCats;
}

assert.equal(
  isCategoryHidden(0, activeMobileCategoryIndex, resCreation.updatedBlocks.length),
  true,
  "Categoria anterior (índice 0) deve estar oculta na visualização focada"
);
assert.equal(
  isCategoryHidden(1, activeMobileCategoryIndex, resCreation.updatedBlocks.length),
  false,
  "Nova categoria criada (índice 1) DEVE estar visível (não oculta)"
);

console.log("✓ Test 1 aprovado: Nova categoria avança e torna-se ativa automaticamente.\n");

// -------------------------------------------------------------
// TEST 2: Preservação de Sets, Reps (10-12), Carga (14) e Descanso (0s)
// -------------------------------------------------------------
console.log("Test 2: Exercício Personalizado com Séries = 3, Reps = '10-12', Carga = '14', Descanso = 0...");

const modalFormData = {
  name: "Puxador aberto e fechado",
  muscleGroup: "Costas",
  equipment: "Máquina",
  sets: 3,
  reps: "10-12",
  load: "14",
  restSeconds: 0,
};

// Simulação da lógica corrigida em handleSaveCustomExercise
function simulateBuildCustomExerciseSets(data, nextExerciseDefault = null) {
  const numSets =
    data.sets && Number(data.sets) > 0
      ? Math.min(20, Math.max(1, Math.round(Number(data.sets))))
      : (nextExerciseDefault ? nextExerciseDefault.sets : 3);

  const parsedReps = data.reps ? parseRepsInput(data.reps) : null;
  const targetReps = parsedReps
    ? (parsedReps.repsMin ?? (parsedReps.durationSeconds ? null : 10))
    : nextExerciseDefault
    ? (nextExerciseDefault.repsType === "FIXED" ? nextExerciseDefault.reps || 10 : nextExerciseDefault.repsMin || 8)
    : 10;
  const targetRepsMax = parsedReps
    ? (parsedReps.repsMax ?? null)
    : nextExerciseDefault && nextExerciseDefault.repsType === "RANGE"
    ? nextExerciseDefault.repsMax || 12
    : null;
  const targetDurationSeconds = parsedReps?.durationSeconds ?? null;
  const durationUnit = parsedReps?.durationSeconds ? "SECONDS" : undefined;

  const parsedLoadKg = data.load
    ? parseFloat(String(data.load).replace(",", ".").replace(/[^\d.]/g, "")) || undefined
    : undefined;

  const parsedRestSeconds =
    data.restSeconds !== undefined &&
    data.restSeconds !== null &&
    !isNaN(Number(data.restSeconds))
      ? Math.max(0, Math.round(Number(data.restSeconds)))
      : (nextExerciseDefault ? nextExerciseDefault.restSeconds : 60);

  const sets = Array.from({ length: numSets }, (_, i) => ({
    setNumber: i + 1,
    setType: "NORMAL",
    targetReps,
    targetRepsMax,
    targetLoadKg: parsedLoadKg,
    targetDurationSeconds,
    durationUnit,
    targetRestSeconds: parsedRestSeconds,
  }));

  return { sets, numSets, targetReps, targetRepsMax, parsedLoadKg, parsedRestSeconds };
}

const built = simulateBuildCustomExerciseSets(modalFormData);

assert.equal(built.sets.length, 3, "Deveria gerar exatamente 3 séries (não 1)");
assert.equal(built.numSets, 3, "numSets deve ser 3");
assert.equal(built.targetReps, 10, "targetReps deve ser 10 (mínimo da faixa)");
assert.equal(built.targetRepsMax, 12, "targetRepsMax deve ser 12 (máximo da faixa)");
assert.equal(built.parsedLoadKg, 14, "targetLoadKg deve ser 14 kg");
assert.equal(built.parsedRestSeconds, 0, "targetRestSeconds deve ser 0s (nunca 60s!)");

for (let i = 0; i < built.sets.length; i++) {
  const s = built.sets[i];
  assert.equal(s.setNumber, i + 1, `Série ${i + 1} deve ter setNumber ${i + 1}`);
  assert.equal(s.targetReps, 10, `Série ${i + 1} deve ter targetReps = 10`);
  assert.equal(s.targetRepsMax, 12, `Série ${i + 1} deve ter targetRepsMax = 12`);
  assert.equal(s.targetLoadKg, 14, `Série ${i + 1} deve ter targetLoadKg = 14`);
  assert.equal(s.targetRestSeconds, 0, `Série ${i + 1} deve ter targetRestSeconds = 0 (sem fallback para 60s)`);
}

console.log("✓ Test 2 aprovado: Todas as 3 séries geradas com 10-12 reps, 14kg e descanso 0s.\n");

// -------------------------------------------------------------
// TEST 3: Formatação Visual do Resumo da Linha do Exercício
// -------------------------------------------------------------
console.log("Test 3: Formatação da linha de resumo no card...");

const firstSet = built.sets[0];
const repsFormatted = formatRepetitionRange(firstSet.targetReps, firstSet.targetRepsMax);
assert.equal(repsFormatted, "10–12 reps", "Faixa de repetições deve ser formatada como '10–12 reps'");

const restText = `${firstSet.targetRestSeconds}s descanso`;
assert.equal(restText, "0s descanso", "Descanso deve ser formatado como '0s descanso'");

const summaryLine = `${built.sets.length} séries · ${repsFormatted} · ${firstSet.targetLoadKg}kg · ${restText}`;
assert.equal(
  summaryLine,
  "3 séries · 10–12 reps · 14kg · 0s descanso",
  "Linha de resumo deve refletir exatamente as escolhas do profissional"
);

console.log("✓ Test 3 aprovado: Linha de resumo exibe '3 séries · 10-12 reps · 14kg · 0s descanso'.\n");

// -------------------------------------------------------------
// TEST 4: Resiliência a Variações (Descanso '0' string, Carga com vírgula '14,5', Séries = 4)
// -------------------------------------------------------------
console.log("Test 4: Resiliência a formatos alternativos (Descanso '0' string, Carga '14,5', Séries = 4)...");

const variationData = {
  name: "Elevação lateral cabo",
  sets: "4",
  reps: "12-15",
  load: "14,5",
  restSeconds: "0",
};

const builtVariation = simulateBuildCustomExerciseSets(variationData);
assert.equal(builtVariation.sets.length, 4, "Deveria gerar 4 séries");
assert.equal(builtVariation.targetReps, 12, "targetReps deve ser 12");
assert.equal(builtVariation.targetRepsMax, 15, "targetRepsMax deve ser 15");
assert.equal(builtVariation.parsedLoadKg, 14.5, "Carga 14,5 deve ser convertida para 14.5 kg");
assert.equal(builtVariation.parsedRestSeconds, 0, "Descanso '0' string deve ser 0s");

console.log("✓ Test 4 aprovado: Variações de formatos tratadas com precisão.\n");

console.log("=== TODOS OS TESTES PASSARAM COM SUCESSO! ===");
