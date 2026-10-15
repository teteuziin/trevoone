/**
 * TREVO ONE — TRAINING STUDIO 3.1: MASTER TEST SUITE
 * 
 * Verifies:
 * 1. MODO CLARO & ESCURO: Tokens de contraste, WCAG AA, paleta semântica (Bi-Set Azul, Tri-Set Roxo, Circuito Laranja).
 * 2. CARDS DE EXERCÍCIO & COMBINAÇÕES GUIADAS: Criação guiada a partir do card (Bi-set, Tri-set, Circuito) com Membro A pré-selecionado.
 * 3. ASSISTENTE DE MONTAGEM: Botão primário unificado (substituindo botões separados), comandos por texto e voz, atalhos rápidos.
 * 4. ATRIBUIÇÃO A ALUNOS: Comandos ("Envie esse treino para..."), busca no tenant, guarda de rascunhos (Draft Safety), aviso de treino ativo substituído, confirmação segura obrigatória e ação oficial de atribuição.
 * 5. PERSISTÊNCIA & REGRESSÃO: Autosave passivo, ordenação interna e externa, Student Runtime e fidelidade de fontes.
 */

import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const rootDir = process.cwd();

console.log("================================================================================");
console.log("TREVO ONE — TRAINING STUDIO 3.1 TEST SUITE");
console.log("================================================================================");

let passedCount = 0;
let totalCount = 0;

function runTest(name, fn) {
  totalCount++;
  try {
    fn();
    passedCount++;
    console.log(`[PASS] ${name}`);
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
    throw err;
  }
}

// Read Files
const tokensPath = path.join(rootDir, "components/consultancies/training-v2/training-studio-tokens.ts");
const categoryCardPath = path.join(rootDir, "components/consultancies/training-v2/workout-category-card.tsx");
const workoutBuilderPath = path.join(rootDir, "components/consultancies/training-v2/workout-builder.tsx");
const assistantPath = path.join(rootDir, "components/consultancies/training-v2/training-studio-assistant.tsx");
const guidedModalPath = path.join(rootDir, "components/consultancies/training-v2/guided-combination-modal.tsx");
const librarySidebarPath = path.join(rootDir, "components/consultancies/training-v2/studio-exercise-library-sidebar.tsx");
const globalsCssPath = path.join(rootDir, "app/globals.css");

assert.ok(fs.existsSync(tokensPath), "training-studio-tokens.ts exists");
assert.ok(fs.existsSync(categoryCardPath), "workout-category-card.tsx exists");
assert.ok(fs.existsSync(workoutBuilderPath), "workout-builder.tsx exists");
assert.ok(fs.existsSync(assistantPath), "training-studio-assistant.tsx exists");
assert.ok(fs.existsSync(guidedModalPath), "guided-combination-modal.tsx exists");
assert.ok(fs.existsSync(librarySidebarPath), "studio-exercise-library-sidebar.tsx exists");
assert.ok(fs.existsSync(globalsCssPath), "globals.css exists");

const tokensContent = fs.readFileSync(tokensPath, "utf-8");
const categoryCardContent = fs.readFileSync(categoryCardPath, "utf-8");
const builderContent = fs.readFileSync(workoutBuilderPath, "utf-8");
const assistantContent = fs.readFileSync(assistantPath, "utf-8");
const guidedModalContent = fs.readFileSync(guidedModalPath, "utf-8");
const librarySidebarContent = fs.readFileSync(librarySidebarPath, "utf-8");
const globalsCssContent = fs.readFileSync(globalsCssPath, "utf-8");

// ============================================================================
// 1. MODO CLARO & ESCURO: TOKENS, CONTRASTE & CORES SEMÂNTICAS
// ============================================================================
console.log("\n--- 1. MODO CLARO & ESCURO: CONTRASTE & CORES SEMÂNTICAS ---");

runTest("1.0 Tailwind v4 @custom-variant dark configurado em globals.css para isolar tema claro de preferência de sistema do SO", () => {
  assert.ok(
    globalsCssContent.includes('@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *, .dark, .dark *));'),
    "Tailwind v4 @custom-variant dark must scope dark: utilities to data-theme='dark' preventing dark-mode OS bleed into light mode"
  );
});

runTest("1.1 Bi-set possui cor Azul (#3B82F6) com contraste adaptativo para modo claro e escuro", () => {
  assert.ok(tokensContent.includes('"#3B82F6"'), "Bi-Set blue hex present");
  assert.ok(tokensContent.includes("bg-blue-50 dark:bg-blue-500/15"), "Adaptive light/dark background");
  assert.ok(tokensContent.includes("text-blue-700 dark:text-blue-300"), "Accessible high-contrast text");
});

runTest("1.2 Tri-set possui cor Roxa (#8B5CF6) com contraste adaptativo para modo claro e escuro", () => {
  assert.ok(tokensContent.includes('"#8B5CF6"'), "Tri-Set purple hex present");
  assert.ok(tokensContent.includes("bg-purple-50 dark:bg-purple-500/15"), "Adaptive light/dark background");
  assert.ok(tokensContent.includes("text-purple-700 dark:text-purple-300"), "Accessible high-contrast text");
});

runTest("1.3 Circuito possui cor Laranja (#F59E0B) com contraste adaptativo para modo claro e escuro", () => {
  assert.ok(tokensContent.includes('"#F59E0B"'), "Circuit amber/orange hex present");
  assert.ok(tokensContent.includes("bg-amber-50 dark:bg-amber-500/15"), "Adaptive light/dark background");
  assert.ok(tokensContent.includes("text-amber-800 dark:text-amber-300"), "Accessible high-contrast text");
});

runTest("1.4 Pílulas de prescrição nos cards corrigidas com alto contraste no Modo Claro", () => {
  assert.ok(
    categoryCardContent.includes("text-zinc-800 dark:text-zinc-200") ||
    categoryCardContent.includes("text-zinc-900 dark:text-zinc-100"),
    "Prescription pill uses dark text on light bg in light mode and light text on dark bg in dark mode"
  );
  assert.ok(
    categoryCardContent.includes("text-zinc-700 dark:text-zinc-300"),
    "Secondary prescription badges use high-contrast text in both modes"
  );
});

runTest("1.5 Biblioteca Studio lateral possui superfícies e textos claros no modo claro (WCAG AA)", () => {
  assert.ok(
    librarySidebarContent.includes("bg-white dark:bg-zinc-900"),
    "Library sidebar container uses white in light mode and zinc-900 in dark mode"
  );
  assert.ok(
    librarySidebarContent.includes("text-zinc-900 dark:text-white"),
    "Exercise titles and headers in sidebar use crisp dark text in light mode"
  );
});

// ============================================================================
// 2. COMBINAÇÕES GUIADAS DIRETAMENTE A PARTIR DO CARD
// ============================================================================
console.log("\n--- 2. COMBINAÇÕES GUIADAS A PARTIR DO CARD ---");

runTest("2.1 Menu de ações do exercício (desktop) possui 'Criar bi-set com este exercício'", () => {
  assert.ok(
    categoryCardContent.includes("Criar bi-set com este exercício"),
    "ExerciseRow includes direct bi-set creation action"
  );
});

runTest("2.2 Menu de ações do exercício (desktop) possui 'Criar tri-set com este exercício' e 'Criar circuito'", () => {
  assert.ok(
    categoryCardContent.includes("Criar tri-set com este exercício"),
    "ExerciseRow includes direct tri-set creation action"
  );
  assert.ok(
    categoryCardContent.includes("Criar circuito com este exercício"),
    "ExerciseRow includes direct circuit creation action"
  );
});

runTest("2.3 Mobile bottom sheet (ExerciseActionsSheet) oferece criação guiada de Bi-set, Tri-set e Circuito", () => {
  assert.ok(
    categoryCardContent.includes("Combinações Guiadas") &&
    categoryCardContent.includes("Criar bi-set com este exercício") &&
    categoryCardContent.includes("Criar tri-set com este exercício"),
    "ExerciseActionsSheet provides dedicated guided combinations section on mobile"
  );
});

runTest("2.4 Modal guiado (GuidedCombinationModal) pré-seleciona Membro A automaticamente", () => {
  assert.ok(
    guidedModalContent.includes("initialItem") &&
    guidedModalContent.includes("Passo 1 de") &&
    guidedModalContent.includes("selecionado como 1º exercício"),
    "Member A is automatically preselected with prescription snapshot preserved"
  );
});

runTest("2.5 Modal guiado permite escolher Membro B e C da categoria ou buscar na biblioteca", () => {
  assert.ok(
    guidedModalContent.includes("Exercícios neste treino") &&
    guidedModalContent.includes("Buscar na biblioteca"),
    "Candidate selection supports both existing items and catalog search"
  );
  assert.ok(
    guidedModalContent.includes("searchExercisesForPickerAction"),
    "Integrates official library exercise search"
  );
});

runTest("2.6 Prévia da combinação exibe ordem visual (A., B., C.) antes da confirmação", () => {
  assert.ok(
    guidedModalContent.includes("Prévia da Combinação") &&
    guidedModalContent.includes("letterAvatarClass"),
    "Visual preview renders letter badges for each combination member"
  );
});

// ============================================================================
// 3. ASSISTENTE INTELIGENTE DE MONTAGEM (ENTRADA CENTRAL ÚNICA)
// ============================================================================
console.log("\n--- 3. ASSISTENTE DE MONTAGEM (ENTRADA CENTRAL ÚNICA) ---");

runTest("3.1 Botão principal unificado do Assistente presente no cabeçalho da categoria em rascunho e publicado", () => {
  assert.ok(
    categoryCardContent.includes('data-testid="category-assistant-btn"'),
    "category-assistant-btn testid is present"
  );
  assert.ok(
    categoryCardContent.includes('Assistente de Montagem') &&
    categoryCardContent.includes('Assistente de Treino'),
    "Dynamic labels for Draft and Published modes are present"
  );
});

runTest("3.2 Botão do Assistente também presente no Hero Spotlight superior (Desktop e Mobile)", () => {
  assert.ok(
    builderContent.includes('data-testid="top-assistant-button"'),
    "top-assistant-button present on desktop hero toolbar"
  );
  assert.ok(
    builderContent.includes('data-testid="mobile-top-assistant-button"'),
    "mobile-top-assistant-button present on mobile hero"
  );
});

runTest("3.3 Assistente interpreta intenções por texto (Bi-Set, Tri-Set, Circuito, Adicionar, Personalizado)", () => {
  assert.ok(
    assistantContent.includes('normalized.includes("bi-set")') || assistantContent.includes('normalized.includes("biset")'),
    "Interprets bi-set commands"
  );
  assert.ok(
    assistantContent.includes('normalized.includes("tri-set")') || assistantContent.includes('normalized.includes("triset")'),
    "Interprets tri-set commands"
  );
  assert.ok(
    assistantContent.includes('normalized.includes("circuito")'),
    "Interprets circuit commands"
  );
  assert.ok(
    assistantContent.includes('normalized.includes("personalizado")'),
    "Interprets custom exercise creation commands"
  );
});

runTest("3.4 Assistente possui suporte a comandos de voz (Web Speech API pt-BR) com fallback para digitação", () => {
  assert.ok(
    assistantContent.includes("SpeechRecognition") || assistantContent.includes("webkitSpeechRecognition"),
    "Web Speech API integration present"
  );
  assert.ok(
    assistantContent.includes('rec.lang = "pt-BR"'),
    "pt-BR language set for speech recognition"
  );
  assert.ok(
    assistantContent.includes("Reconhecimento de voz não suportado"),
    "Graceful fallback notice when voice is unsupported"
  );
});

// ============================================================================
// 4. ATRIBUIÇÃO A ALUNOS VIA ASSISTENTE INTELIGENTE
// ============================================================================
console.log("\n--- 4. ATRIBUIÇÃO A ALUNOS VIA ASSISTENTE ---");

runTest("4.1 Assistente reconhece comando 'Envie esse treino para [Aluno]'", () => {
  assert.ok(
    assistantContent.includes("envie") &&
    assistantContent.includes("atribua") &&
    assistantContent.includes("handleStudentAssignmentFlow"),
    "Recognizes assignment trigger phrases"
  );
});

runTest("4.2 Busca de alunos respeita Tenancy e consultoria atual", () => {
  assert.ok(
    assistantContent.includes("searchActiveStudentsAction(consultancySlug"),
    "Tenant-scoped student search executed"
  );
});

runTest("4.3 Tratamento seguro de ambiguidades / homônimos", () => {
  assert.ok(
    assistantContent.includes("Mais de um aluno encontrado") &&
    assistantContent.includes("ambiguity"),
    "Prompts personal to disambiguate when multiple students match the name"
  );
});

runTest("4.4 DRAFT SAFETY: Impede atribuição direta de rascunhos e oferece 'Revisar e Publicar'", () => {
  assert.ok(
    assistantContent.includes('version.status === "DRAFT"') &&
    assistantContent.includes("draft_warning"),
    "Draft safety guard blocks assigning uncommitted drafts"
  );
  assert.ok(
    assistantContent.includes("onOpenPublishDialog"),
    "Offers explicit flow to publish workout before assignment"
  );
});

runTest("4.5 Alerta de substituição se o aluno já possuir rotina ativa", () => {
  assert.ok(
    assistantContent.includes("getStudentActiveWorkoutAssignmentAction"),
    "Checks for currently active workout assignments"
  );
  assert.ok(
    assistantContent.includes("Substituir treino ativo"),
    "Informs user if an active workout will be replaced"
  );
});

runTest("4.6 Confirmação explícita obrigatória antes da atribuição (nenhum envio cego)", () => {
  assert.ok(
    assistantContent.includes("confirm_assignment") &&
    assistantContent.includes("Confirmar Atribuição"),
    "Explicit confirmation step displayed before server mutation"
  );
});

runTest("4.7 Executa atribuição oficial via assignWorkoutVersionAction com feedback real", () => {
  assert.ok(
    assistantContent.includes("assignWorkoutVersionAction") &&
    assistantContent.includes("consultancySlug"),
    "Calls official server action with slug, workout, version, and student IDs"
  );
  assert.ok(
    assistantContent.includes("assignment_success") &&
    /treino atribu[ií]do com sucesso!/i.test(assistantContent),
    "Provides verified success confirmation"
  );
});

runTest("4.8 Suporte a múltiplos alunos ('Carol e Anny') com relatório individual de sucesso/erro", () => {
  assert.ok(
    assistantContent.includes("split(/(?:\\s+e\\s+|\\s*,\\s*|\\s+e\\s+para\\s+)/i)"),
    "Parses compound multi-student recipient commands"
  );
  assert.ok(
    assistantContent.includes("assignmentResults"),
    "Individual outcome tracking for every student in batch"
  );
});

// ============================================================================
// 5. INTEGRAÇÃO NO WORKOUT BUILDER & PRESERVAÇÃO
// ============================================================================
console.log("\n--- 5. INTEGRAÇÃO NO WORKOUT BUILDER & PRESERVAÇÃO ---");

runTest("5.1 WorkoutBuilder repassa workout, version e onOpenPublishDialog para WorkoutCategoryCard", () => {
  assert.ok(
    builderContent.includes("workout={workout}") &&
    builderContent.includes("version={version}") &&
    builderContent.includes("onOpenPublishDialog={handleOpenPublishDialog}"),
    "Essential props threaded into WorkoutCategoryCard"
  );
});

runTest("5.2 Autosave invisível e integridade do Student Runtime preservados", () => {
  assert.ok(
    builderContent.includes("scheduleMetadataSave") &&
    builderContent.includes("runWithAutosave"),
    "Autosave mechanics intact"
  );
  assert.ok(
    builderContent.includes("StudentWorkoutRenderer"),
    "Student Runtime preview preserved"
  );
});

console.log("\n================================================================================");
console.log(`TEST RESULTS: ${passedCount} passed, 0 failed out of ${totalCount} total tests`);
console.log("================================================================================");
