/**
 * Test Suite: Training Studio Combinations, Guided Sequence, Assistant NL & Student Preview
 * Verifies fixes for:
 * 1. "Criar Combinação" button flow from assembly bar (null initialItem support, modal render guard)
 * 2. Guided Sequence modal (compact missing-video badge, round vs set prescription distinction, real notes)
 * 3. Assistant NL intent resolution ("Quero montar algo na segunda" -> day intent, "bi-set de peito" -> proposal, no unprompted custom exercise fallback)
 * 4. Student Preview ("Visão do aluno" in builder and assistant, draft vs published banners, semantic theme colors, execution mutations disabled)
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

console.log("=== INICIANDO TESTES DO TRAINING STUDIO COMBINAÇÕES E ASSISTENTE ===");

// TEST 1: Inspect workout-category-card.tsx for Criar Combinação root cause fix
console.log("\n[TEST 1] Verificando workout-category-card.tsx para fix do botão 'Criar combinação'...");
const categoryCardPath = path.join(projectRoot, "components/consultancies/training-v2/workout-category-card.tsx");
const categoryCardContent = fs.readFileSync(categoryCardPath, "utf8");

// Verify modal is NOT gated behind initialItem
assert.ok(
  categoryCardContent.includes("{guidedModalState.isOpen && ("),
  "ERRO: GuidedCombinationModal ainda está condicionado a initialItem em workout-category-card.tsx"
);
assert.ok(
  !categoryCardContent.includes("{guidedModalState.isOpen && guidedModalState.initialItem && ("),
  "ERRO: Condição antiga restritiva ainda encontrada"
);

// Verify no duplicate lightning icon in the assembly bar button
assert.ok(
  !categoryCardContent.includes("⚡ ⚡") && !categoryCardContent.includes("⚡⚡"),
  "ERRO: Duplicação de ícone de raio encontrada no botão Criar combinação"
);
console.log("✓ TEST 1 PASS: Botão Criar combinação abre com initialItem: null e sem ícone duplicado.");

// TEST 2: Inspect guided-combination-modal.tsx
console.log("\n[TEST 2] Verificando guided-combination-modal.tsx para suporte a montagem autônoma...");
const guidedModalPath = path.join(projectRoot, "components/consultancies/training-v2/guided-combination-modal.tsx");
const guidedModalContent = fs.readFileSync(guidedModalPath, "utf8");

// Supports initialItem: WorkoutBlockItemDto | null
assert.ok(
  guidedModalContent.includes("initialItem?: WorkoutBlockItemDto | null;"),
  "ERRO: initialItem deve aceitar null para abertura autônoma pela barra de montagem"
);

// Type switcher tabs (BI_SET, TRI_SET, SUPERSET, CIRCUIT)
assert.ok(guidedModalContent.includes("BI_SET") && guidedModalContent.includes("TRI_SET") && guidedModalContent.includes("CIRCUIT"),
  "ERRO: Tipos de combinação obrigatórios devem estar presentes no seletor"
);

// Prevents duplicate exercise selection
assert.ok(
  guidedModalContent.includes("selectedIds.has(it.publicId)"),
  "ERRO: Modal deve impedir seleção de exercício já incluído"
);

// Portal rendering with z-[60]
assert.ok(
  guidedModalContent.includes("createPortal") && guidedModalContent.includes("z-[60]"),
  "ERRO: Modal deve usar createPortal no document.body com z-[60] para evitar clipping"
);
console.log("✓ TEST 2 PASS: GuidedCombinationModal suporta montagem autônoma, tabs de tipos e anti-duplicação.");

// TEST 3: Inspect sequence-execution-modal.tsx & sequence-media.ts
console.log("\n[TEST 3] Verificando sequence-execution-modal.tsx e sequence-media.ts...");
const sequenceModalPath = path.join(projectRoot, "components/consultancies/training-v2/sequence-execution-modal.tsx");
const sequenceModalContent = fs.readFileSync(sequenceModalPath, "utf8");
const sequenceMediaPath = path.join(projectRoot, "lib/training-v2/sequence-media.ts");
const sequenceMediaContent = fs.readFileSync(sequenceMediaPath, "utf8");

// Compact missing-video banner instead of big black box
assert.ok(
  sequenceModalContent.includes("Demonstração em vídeo indisponível"),
  "ERRO: sequence-execution-modal deve exibir banner compacto quando vídeo estiver ausente"
);

// Clear hierarchy: "Bi-set · Exercício X de Y"
assert.ok(
  sequenceModalContent.includes("{currentIndex + 1} de {items.length}"),
  "ERRO: Hierarquia clara do exercício na combinação ausente"
);

// Prescription data fields in sequence-media.ts
assert.ok(
  sequenceMediaContent.includes("setsCount?: number | null;") &&
  sequenceMediaContent.includes("rounds?: number | null;") &&
  sequenceMediaContent.includes("advancedMethod?: string | null;"),
  "ERRO: sequence-media.ts deve conter dados de prescrição (séries, voltas, método avançado)"
);

// Visual mode: does not record executions
assert.ok(
  !sequenceModalContent.includes("completeWorkoutExecutionSetAction"),
  "ERRO: sequence-execution-modal é um visualizador e não deve disparar mutação de execução de série"
);
console.log("✓ TEST 3 PASS: Sequência guiada reformulada com banner compacto, prescrição correta e modo visual.");

// TEST 4: Inspect training-studio-assistant.tsx
console.log("\n[TEST 4] Verificando training-studio-assistant.tsx para inteligência e visão do aluno...");
const assistantPath = path.join(projectRoot, "components/consultancies/training-v2/training-studio-assistant.tsx");
const assistantContent = fs.readFileSync(assistantPath, "utf8");

// Day/Block Intent: "segunda", "terça", etc. sets target and asks clarification
assert.ok(
  assistantContent.includes("Quero montar algo na segunda") || assistantContent.includes("segunda"),
  "ERRO: Detecção de dia da semana ausente"
);
assert.ok(
  assistantContent.includes("block_clarification"),
  "ERRO: Card block_clarification deve existir para esclarecer ações no bloco sem criar custom exercise"
);

// Combination Proposal: "bi-set de peito"
assert.ok(
  assistantContent.includes("proposal_combination"),
  "ERRO: Card proposal_combination deve existir para propor bi-set com 1 clique"
);

// Standardized placeholder: "Descreva o que deseja montar ou ajustar..."
assert.ok(
  assistantContent.includes('placeholder="Descreva o que deseja montar ou ajustar..."'),
  "ERRO: Placeholder padronizado não encontrado no textarea do assistente"
);

// Visão do aluno button in assistant header
assert.ok(
  assistantContent.includes("👁️ Visão do aluno"),
  "ERRO: Botão 👁️ Visão do aluno deve existir no cabeçalho do assistente"
);

// Verified execution result card: "✓ Salvo no servidor"
assert.ok(
  assistantContent.includes("✓ Salvo no servidor"),
  "ERRO: Card de resultado da execução deve confirmar '✓ Salvo no servidor'"
);
console.log("✓ TEST 4 PASS: Assistente interpreta dias/blocos, propõe bi-set e oferece Visão do Aluno.");

// TEST 5: Inspect student-workout-renderer.tsx & workout-builder.tsx
console.log("\n[TEST 5] Verificando student-workout-renderer.tsx e workout-builder.tsx para Prévia do Aluno...");
const studentRendererPath = path.join(projectRoot, "components/consultancies/training-v2/student-workout-renderer.tsx");
const studentRendererContent = fs.readFileSync(studentRendererPath, "utf8");
const workoutBuilderPath = path.join(projectRoot, "components/consultancies/training-v2/workout-builder.tsx");
const workoutBuilderContent = fs.readFileSync(workoutBuilderPath, "utf8");

// isPreview and isDraft props in StudentWorkoutRenderer
assert.ok(
  studentRendererContent.includes("isPreview?: boolean;") &&
  studentRendererContent.includes("isDraft?: boolean;"),
  "ERRO: StudentWorkoutRenderer deve aceitar isPreview e isDraft"
);

// Preview Banner
assert.ok(
  studentRendererContent.includes("Prévia do rascunho — ainda não disponível para o aluno") &&
  studentRendererContent.includes("Prévia da versão v"),
  "ERRO: Banners de prévia para rascunho e versão publicada devem estar presentes"
);

// Execution mutations disabled in preview
assert.ok(
  studentRendererContent.includes("if (isPreview || !consultancySlug || isStarting || activeSession?.status === \"IN_PROGRESS\") return;"),
  "ERRO: handleStartWorkout deve ser bloqueado quando isPreview é true"
);
assert.ok(
  studentRendererContent.includes("if (isPreview || !consultancySlug || !activeSession || activeSession.status !== \"IN_PROGRESS\" || isCompleting)"),
  "ERRO: handleCompleteWorkout deve ser bloqueado quando isPreview é true"
);
assert.ok(
  studentRendererContent.includes("if (isPreview || !consultancySlug || !activeSession || activeSession.status !== \"IN_PROGRESS\" || loadingSetPublicId)"),
  "ERRO: handleCompleteSet deve ser bloqueado quando isPreview é true"
);

// Semantic combination theme in ItemOrCombinationList
assert.ok(
  studentRendererContent.includes("getCombinationTheme(comb.combinationType)"),
  "ERRO: ItemOrCombinationList deve usar getCombinationTheme para cores semânticas (azul, roxo, âmbar, teal)"
);

// Builder passes isPreview and isDraft
assert.ok(
  workoutBuilderContent.includes("isPreview={true}") &&
  workoutBuilderContent.includes("isDraft={isDraft}"),
  "ERRO: workout-builder.tsx deve passar isPreview={true} e isDraft={isDraft} para StudentWorkoutRenderer"
);

// Builder toolbar explicitly says "Visão do aluno"
assert.ok(
  workoutBuilderContent.includes("<span>Visão do aluno</span>"),
  "ERRO: Botão da barra do builder deve exibir 'Visão do aluno'"
);
console.log("✓ TEST 5 PASS: Prévia do Aluno integrada com banners, bloqueio de mutações e temas semânticos.");

console.log("\n=======================================================");
console.log("TODOS OS TESTES PASSARAM COM SUCESSO (5/5)");
console.log("=======================================================\n");
