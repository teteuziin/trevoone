import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

console.log("================================================================================");
console.log("TREVO ONE — GLOBAL REFINEMENTS V2 (STUDIO, MODAIS E PERFIL DO ALUNO)");
console.log("================================================================================");

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(err);
    failed++;
  }
}

const rootDir = process.cwd();
const templatePickerPath = path.join(rootDir, "components/consultancies/training-v2/workout-template-picker.tsx");
const workoutBuilderPath = path.join(rootDir, "components/consultancies/training-v2/workout-builder.tsx");
const workoutCategoryCardPath = path.join(rootDir, "components/consultancies/training-v2/workout-category-card.tsx");
const studentDetailViewPath = path.join(rootDir, "components/consultancies/personal-student-hub/personal-student-detail-view.tsx");

assert.ok(fs.existsSync(templatePickerPath), "workout-template-picker.tsx must exist");
assert.ok(fs.existsSync(workoutBuilderPath), "workout-builder.tsx must exist");
assert.ok(fs.existsSync(workoutCategoryCardPath), "workout-category-card.tsx must exist");
assert.ok(fs.existsSync(studentDetailViewPath), "personal-student-detail-view.tsx must exist");

const templatePickerContent = fs.readFileSync(templatePickerPath, "utf-8");
const builderContent = fs.readFileSync(workoutBuilderPath, "utf-8");
const categoryContent = fs.readFileSync(workoutCategoryCardPath, "utf-8");
const studentDetailContent = fs.readFileSync(studentDetailViewPath, "utf-8");

// ============================================================================
// 1. MODAL CRIAR A PARTIR DE UM MODELO (NETFLIX / APPLE FITNESS+ SOLID OVERLAY)
// ============================================================================
console.log("\n--- 1. MODAL CRIAR A PARTIR DE UM MODELO ---");

runTest("1.1 Overlay escuro opaco e imersivo com backdrop-blur-md", () => {
  assert.ok(
    templatePickerContent.includes("bg-zinc-950/80 backdrop-blur-md"),
    "Template picker overlay has solid dark background with backdrop blur"
  );
  assert.ok(
    templatePickerContent.includes("fixed inset-0 z-50"),
    "Template picker is fixed overlay at z-50"
  );
});

runTest("1.2 Container perfeitamente centralizado com max-w-xl, rounded-2xl, border-white/10 e p-6 bg-zinc-900", () => {
  assert.ok(
    templatePickerContent.includes("max-w-xl rounded-2xl bg-zinc-900 border border-white/10 shadow-2xl"),
    "Container matches premium max-w-xl rounded-2xl bg-zinc-900 with border-white/10"
  );
  assert.ok(
    templatePickerContent.includes("p-6 text-zinc-100"),
    "Container provides comfortable breathing room p-6 and clear text"
  );
});

runTest("1.3 Campo de busca e estado vazio legíveis sem sobreposições", () => {
  assert.ok(
    templatePickerContent.includes("bg-zinc-950/60") && templatePickerContent.includes("placeholder-zinc-500"),
    "Search input is clearly styled for dark container"
  );
  assert.ok(
    templatePickerContent.includes("Nenhum modelo publicado encontrado."),
    "Empty state title is present"
  );
});

// ============================================================================
// 2. PADRONIZAÇÃO ICONOGRÁFICA NO HEADER DO TRAINING STUDIO
// ============================================================================
console.log("\n--- 2. PADRONIZAÇÃO ICONOGRÁFICA NO HEADER DO STUDIO ---");

runTest("2.1 Biblioteca Studio possui BookOpenIcon e estilo consistente", () => {
  assert.ok(
    builderContent.includes("function BookOpenIcon"),
    "BookOpenIcon component is defined"
  );
  assert.ok(
    builderContent.includes("<BookOpenIcon") && builderContent.includes("Biblioteca Studio"),
    "Biblioteca Studio uses BookOpenIcon"
  );
});

runTest("2.2 Dados da ficha, Pré-visualizar e Baixar PDF possuem ícones minimalistas e min-h-[38px]", () => {
  assert.ok(
    builderContent.includes("<SlidersIcon") && builderContent.includes("Dados da ficha"),
    "Dados da ficha has SlidersIcon"
  );
  assert.ok(
    builderContent.includes("<EyeIcon") && builderContent.includes("Pré-visualizar"),
    "Pré-visualizar has EyeIcon"
  );
  assert.ok(
    builderContent.includes("<DownloadIcon") && builderContent.includes("Baixar PDF"),
    "Baixar PDF has DownloadIcon"
  );
  assert.ok(
    builderContent.includes("min-h-[38px] flex items-center gap-2"),
    "Buttons maintain consistent min-h-[38px] and gap-2"
  );
});

runTest("2.3 Atribuir ao aluno possui UserPlusIcon e Editar possui Edit3Icon", () => {
  assert.ok(
    builderContent.includes("function UserPlusIcon"),
    "UserPlusIcon component is defined"
  );
  assert.ok(
    builderContent.includes("<UserPlusIcon") && builderContent.includes("Atribuir ao aluno"),
    "Atribuir ao aluno uses UserPlusIcon"
  );
  assert.ok(
    builderContent.includes("function Edit3Icon"),
    "Edit3Icon component is defined"
  );
  assert.ok(
    builderContent.includes("<Edit3Icon") && builderContent.includes("Editar (novo rascunho)"),
    "Editar uses Edit3Icon"
  );
});

runTest("2.4 Botão primário esmeralda e secundários com glassmorphism", () => {
  assert.ok(
    builderContent.includes("bg-emerald-600 hover:bg-emerald-500 text-white"),
    "Primary button uses vibrant emerald background"
  );
  assert.ok(
    builderContent.includes("bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 border border-white/[0.1]"),
    "Secondary buttons use refined glassmorphism styling"
  );
});

// ============================================================================
// 3. FACILIDADE EXTREMA NA MONTAGEM DE BI-SETS / COMBINAÇÕES
// ============================================================================
console.log("\n--- 3. FACILIDADE EXTREMA NA MONTAGEM DE BI-SETS ---");

runTest("3.1 Ação direta de conexão na linha do exercício desktop (ExerciseRow)", () => {
  assert.ok(
    categoryContent.includes("function Link2Icon"),
    "Link2Icon component is defined"
  );
  assert.ok(
    categoryContent.includes("!inCombination && onCombineFromHere && !isSelectionMode") &&
    categoryContent.includes("Combinar em Bi-Set (1 clique)"),
    "Direct combine button exists on ExerciseRow line"
  );
});

runTest("3.2 Ação direta de conexão no card mobile (MobileExerciseCard)", () => {
  assert.ok(
    categoryContent.includes("onCombineFromHere && !isSelectionMode") &&
    categoryContent.includes("Combinar em Bi-Set (1 toque)"),
    "Direct combine button exists in MobileExerciseCard toolbar"
  );
  assert.ok(
    categoryContent.includes("onCombineFromHere={() => handleCombineFromHere(item.publicId, subBlock.publicId)}"),
    "onCombineFromHere is wired to sub-block mobile cards"
  );
  assert.ok(
    categoryContent.includes("onCombineFromHere={() => handleCombineFromHere(item.publicId, undefined)}"),
    "onCombineFromHere is wired to flat root mobile cards"
  );
});

runTest("3.3 Botão flutuante inferior com label 'Agrupar em'", () => {
  assert.ok(
    categoryContent.includes("Agrupar em ${COMBINATION_TYPE_LABELS[combinationType]}"),
    "Floating action bar CTA reflects grouping into selected combination type"
  );
});

// ============================================================================
// 4. BOTÃO DE TUTORIAL INTERATIVO (GUIA RÁPIDO)
// ============================================================================
console.log("\n--- 4. BOTÃO DE TUTORIAL INTERATIVO (GUIA RÁPIDO) ---");

runTest("4.1 Botão de Guia Rápido com LightbulbIcon no header do Studio", () => {
  assert.ok(
    builderContent.includes("function LightbulbIcon"),
    "LightbulbIcon component is defined"
  );
  assert.ok(
    builderContent.includes("<LightbulbIcon") && builderContent.includes("Guia Rápido"),
    "Guia Rápido button is present in the Studio header"
  );
});

runTest("4.2 Modal do tour guiado em 4 passos explicativos", () => {
  assert.ok(
    builderContent.includes("isTutorialOpen && ("),
    "Tutorial modal is conditionally rendered"
  );
  assert.ok(
    builderContent.includes("Passo 1: Adicionar exercícios"),
    "Step 1 is present"
  );
  assert.ok(
    builderContent.includes("Passo 2: Combinar em Bi-Set"),
    "Step 2 is present"
  );
  assert.ok(
    builderContent.includes("Passo 3: Autosave em background"),
    "Step 3 is present"
  );
  assert.ok(
    builderContent.includes("Passo 4: Publicar treino"),
    "Step 4 is present"
  );
});

// ============================================================================
// 5. LIMPEZA E PRATICIDADE NO PERFIL DO ALUNO
// ============================================================================
console.log("\n--- 5. LIMPEZA E PRATICIDADE NO PERFIL DO ALUNO ---");

runTest("5.1 Ausência de duplicações de ícone (+ +) nos botões de treino", () => {
  assert.ok(
    !studentDetailContent.includes(">+ Criar treino<"),
    "No literal '+ Criar treino' text inside span alongside PlusIcon"
  );
  assert.ok(
    studentDetailContent.includes("<PlusIcon className=\"w-4 h-4\" />\n              <span>Criar treino</span>") ||
    studentDetailContent.includes("<PlusIcon className=\"w-4 h-4\" />\r\n              <span>Criar treino</span>"),
    "Criar treino renders cleanly with single PlusIcon and clean text"
  );
});

runTest("5.2 Botão de ação único e claro no topo do cockpit desktop do aluno", () => {
  assert.ok(
    !studentDetailContent.includes("<span>Ver treinos</span>"),
    "Redundant 'Ver treinos' button removed in favor of single prominent CTA"
  );
  assert.ok(
    studentDetailContent.includes("Primary CTA (Single prominent action)"),
    "Single prominent action comment/structure is present"
  );
});

runTest("5.3 Abas do perfil com LayoutGridIcon em Visão Geral e iconografia uniforme", () => {
  assert.ok(
    studentDetailContent.includes("function LayoutGridIcon"),
    "LayoutGridIcon component is defined"
  );
  assert.ok(
    studentDetailContent.includes("{ key: \"visao-geral\", label: \"Visão Geral\", icon: LayoutGridIcon }"),
    "Visão Geral tab uses LayoutGridIcon"
  );
  assert.ok(
    studentDetailContent.includes("{ id: \"resumo\", label: \"Visão Geral\", icon: <LayoutGridIcon"),
    "Mobile tab 1 uses LayoutGridIcon with Visão Geral label"
  );
});

// ============================================================================
// RESUMO GERAL
// ============================================================================
console.log("\n================================================================================");
console.log(`TOTAL: ${passed + failed} | PASSOU: ${passed} | FALHOU: ${failed}`);
console.log("================================================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("TODOS OS TESTES DE REFINAMENTO GLOBAL PASSARAM COM SUCESSO!");
}
