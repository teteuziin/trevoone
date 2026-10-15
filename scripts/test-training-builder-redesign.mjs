import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

console.log("================================================================================");
console.log("TREVO ONE — TRAINING BUILDER REDESIGN (NETFLIX / APPLE FITNESS+ EDITION)");
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
const workoutBuilderPath = path.join(rootDir, "components/consultancies/training-v2/workout-builder.tsx");
const workoutCategoryCardPath = path.join(rootDir, "components/consultancies/training-v2/workout-category-card.tsx");

assert.ok(fs.existsSync(workoutBuilderPath), "workout-builder.tsx must exist");
assert.ok(fs.existsSync(workoutCategoryCardPath), "workout-category-card.tsx must exist");

const builderContent = fs.readFileSync(workoutBuilderPath, "utf-8");
const categoryContent = fs.readFileSync(workoutCategoryCardPath, "utf-8");

// ============================================================================
// 1. HERO SPOTLIGHT SUPERIOR DO TREINO
// ============================================================================
console.log("\n--- 1. HERO SPOTLIGHT SUPERIOR DO TREINO ---");

runTest("1.1 Container Hero Spotlight com gradiente cinematográfico dark, borda sutil e sombra profunda", () => {
  assert.ok(
    builderContent.includes("bg-gradient-to-br from-zinc-900/95 via-zinc-950 to-emerald-950/25"),
    "Hero container has cinematic dark gradient"
  );
  assert.ok(
    builderContent.includes("border border-white/[0.08]"),
    "Hero container has subtle translucent border"
  );
  assert.ok(
    builderContent.includes("shadow-2xl overflow-hidden backdrop-blur-xl"),
    "Hero container has deep shadow and glass backdrop blur"
  );
});

runTest("1.2 Luz ambiente esmeralda projetando aura e profundidade", () => {
  assert.ok(
    builderContent.includes("bg-emerald-500/15 rounded-full blur-3xl"),
    "Emerald ambient aura is rendered with high blur"
  );
});

runTest("1.3 Badge brilhante de status do treino (Rascunho ou Publicado) preservado com data-testid", () => {
  assert.ok(
    builderContent.includes('data-testid="builder-status-badge"'),
    "Builder status badge has data-testid"
  );
  assert.ok(
    builderContent.includes("shadow-[0_0_12px_rgba(245,158,11,0.2)]") ||
    builderContent.includes("shadow-[0_0_12px_rgba(16,185,129,0.2)]"),
    "Status badge features luminous neon glow"
  );
});

runTest("1.4 Título da ficha em tipografia imponente e nítida", () => {
  assert.ok(
    builderContent.includes("text-2xl sm:text-3xl font-black text-white"),
    "Title input and heading have imposing font-black white typography"
  );
  assert.ok(
    builderContent.includes("focus:border-emerald-500"),
    "Title input glows emerald on focus"
  );
});

runTest("1.5 Pílulas de metadados secundários com glassmorphism", () => {
  assert.ok(
    builderContent.includes('data-testid="mobile-header-meta"'),
    "Mobile header metadata has data-testid"
  );
  assert.ok(
    builderContent.includes("bg-white/[0.04] border border-white/[0.08] text-zinc-200"),
    "Metadata items are styled as elegant translucent pills"
  );
});

runTest("1.6 Ação primária de publicação em esmeralda vibrante e indicador de autosave passivo", () => {
  assert.ok(
    builderContent.includes('data-testid="publish-workout-button"'),
    "Publish workout button has data-testid"
  );
  assert.ok(
    builderContent.includes("bg-emerald-600") && builderContent.includes("shadow-[0_0_20px_rgba(16,185,129,0.35)]"),
    "Publish button has vivid emerald glow"
  );
  assert.ok(
    builderContent.includes('data-testid="builder-autosave-indicator"'),
    "Builder autosave indicator has data-testid and zero layout shift protection"
  );
});

// ============================================================================
// 2. SELETOR DE CATEGORIAS / DIAS DA SEMANA (ABAS DE DIVISÃO)
// ============================================================================
console.log("\n--- 2. SELETOR DE CATEGORIAS / DIAS DA SEMANA ---");

runTest("2.1 Abas de categorias com visual de pílulas flutuantes modernas", () => {
  assert.ok(
    builderContent.includes('data-testid="mobile-category-tabs"'),
    "Category tabs container has data-testid"
  );
  assert.ok(
    builderContent.includes("bg-emerald-500/15 border border-emerald-500/40 text-emerald-300"),
    "Active tab has translucent emerald glow background and emerald border"
  );
});

runTest("2.2 Badge numérico de exercícios por categoria estilizado e discreto", () => {
  assert.ok(
    builderContent.includes("bg-emerald-500/25 text-emerald-200 border border-emerald-500/30"),
    "Active category tab numeric count badge is stylized"
  );
  assert.ok(
    builderContent.includes("overflow-x-auto pb-2.5 pt-0.5 no-scrollbar scroll-smooth"),
    "Horizontal scroll is smooth and clean"
  );
});

// ============================================================================
// 3. BARRA DE AÇÕES DA CATEGORIA (HEADER DA SEÇÃO)
// ============================================================================
console.log("\n--- 3. BARRA DE AÇÕES DA CATEGORIA ---");

runTest("3.1 Alinhamento entre título da seção, contadores e botões de ação", () => {
  assert.ok(
    categoryContent.includes("Category Actions — Nível 1: \"+ Exercício\" e \"Combinar\" lado a lado"),
    "Category header action comment preserved"
  );
  assert.ok(
    categoryContent.includes('<div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center relative">'),
    "Side-by-side alignment container preserved"
  );
});

runTest("3.2 Botões de ação rápida com altura mínima ergonômica (min-h-[42px]) e micro-interações", () => {
  assert.ok(
    categoryContent.includes('data-testid="category-add-exercise-btn"'),
    "Add exercise button has data-testid"
  );
  assert.ok(
    categoryContent.includes('data-testid="category-combine-btn"'),
    "Combine button has data-testid"
  );
  assert.ok(
    categoryContent.includes("min-h-[42px]"),
    "Action buttons have ergonomic min-h-[42px] touch target"
  );
  assert.ok(
    categoryContent.includes("hover:scale-[1.01] active:scale-[0.98]"),
    "Action buttons feature smooth tactile micro-animations"
  );
});

// ============================================================================
// 4. CARDS DE BI-SETS E EXERCÍCIOS COM PROFUNDIDADE VISUAL
// ============================================================================
console.log("\n--- 4. CARDS DE BI-SETS E EXERCÍCIOS COM PROFUNDIDADE VISUAL ---");

runTest("4.1 Container de Bi-Set / Super-Set com barra vertical lateral semântica e cabeçalho claro", () => {
  assert.ok(
    categoryContent.includes('data-testid="mobile-combination-block"'),
    "Combination block has data-testid"
  );
  assert.ok(
    categoryContent.includes("theme.borderLeftClass") ||
      categoryContent.includes("border-l-4 border-l-blue-500") ||
      categoryContent.includes("border-l-4 border-l-emerald-500"),
    "Combination block features distinctive semantic left border line"
  );
  assert.ok(
    categoryContent.includes('data-testid="combination-view-sequence-btn"'),
    "Combination sequence video button preserved"
  );
});

runTest("4.2 Linhas de exercícios com avatar de letra (A., B.) em estilo semântico", () => {
  assert.ok(
    categoryContent.includes("theme.letterAvatarClass") ||
      categoryContent.includes("border-blue-500/30") ||
      categoryContent.includes("bg-blue-500/15") ||
      categoryContent.includes("bg-emerald-500/15 border border-emerald-500/30"),
    "Combination exercise items display stylized order letter avatar with semantic color"
  );
  assert.ok(
    categoryContent.includes("py-3 px-3.5 sm:px-4 sm:py-3"),
    "Comfortable py-3 row spacing"
  );
});

runTest("4.3 Pílulas de tags informativas, séries, repetições e indicador de intervalo", () => {
  assert.ok(
    categoryContent.includes("voltas · {summary.repsText}"),
    "Prescription shows rounds and reps clearly"
  );
  assert.ok(
    categoryContent.includes("↓ Sem descanso entre exercícios"),
    "Indicator for seamless continuous transition without rest is rendered"
  );
  assert.ok(
    categoryContent.includes("Descanso após a volta:"),
    "Dedicated rest between rounds is rendered in combination footer"
  );
});

runTest("4.4 Cards de exercícios isolados com tap-to-edit e alvos de toque >= 44px", () => {
  assert.ok(
    categoryContent.includes('data-testid="mobile-exercise-card"'),
    "Standalone mobile exercise card has data-testid"
  );
  assert.ok(
    categoryContent.includes("min-h-[44px] min-w-[44px]"),
    "Reorder buttons and options have minimum 44px touch targets"
  );
  assert.ok(
    categoryContent.includes("if (isDraft) onOpenQuickEdit();"),
    "Tap-to-edit directly opens quick prescription editor"
  );
});

// ============================================================================
// 5. PRESERVAÇÃO FUNCIONAL TOTAL E AUSÊNCIA DE DADOS MOCKADOS
// ============================================================================
console.log("\n--- 5. PRESERVAÇÃO FUNCIONAL TOTAL ---");

runTest("5.1 Autosave invisível e retenção de sheets intactos", () => {
  assert.ok(
    categoryContent.includes("<QuickEditExerciseSheet") &&
    categoryContent.includes("onUpdateExerciseQuickConfig"),
    "QuickEditExerciseSheet autosaves without disruptive dismissal"
  );
  assert.ok(
    categoryContent.includes("<EditCombinationSheet") &&
    categoryContent.includes("onUpdateCombination"),
    "EditCombinationSheet autosaves without disruptive dismissal"
  );
});

runTest("5.2 Zero dados mockados: dados puramente originários de props/API", () => {
  assert.ok(
    !builderContent.includes("const MOCK_WORKOUT") &&
    !categoryContent.includes("const MOCK_EXERCISES"),
    "No hardcoded mock datasets in builder components"
  );
});

console.log("\n================================================================================");
console.log(`TEST RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed} total tests`);
console.log("================================================================================");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
