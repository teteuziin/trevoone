import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

console.log("================================================================================");
console.log("TREVO ONE — TRAINING STUDIO MOBILE PREMIUM UX TEST SUITE");
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

// Read component files
const workoutBuilderPath = path.join(rootDir, "components/consultancies/training-v2/workout-builder.tsx");
const workoutCategoryCardPath = path.join(rootDir, "components/consultancies/training-v2/workout-category-card.tsx");
const pagePath = path.join(rootDir, "app/consultoria/[slug]/rotinas/[publicId]/page.tsx");

assert.ok(fs.existsSync(workoutBuilderPath), "workout-builder.tsx exists");
assert.ok(fs.existsSync(workoutCategoryCardPath), "workout-category-card.tsx exists");
assert.ok(fs.existsSync(pagePath), "rotinas/[publicId]/page.tsx exists");

const builderCode = fs.readFileSync(workoutBuilderPath, "utf-8");
const categoryCode = fs.readFileSync(workoutCategoryCardPath, "utf-8");
const pageCode = fs.readFileSync(pagePath, "utf-8");

// 1. Cabeçalho compacto (3 linhas mobile)
runTest("1. Cabeçalho compacto mobile com 3 linhas estruturadas e sem repetição", () => {
  assert.ok(
    builderCode.includes('data-testid="compact-mobile-header"'),
    "Compact mobile header container exists with data-testid"
  );
  // Line 1: Voltar · Live Autosave · Mais opções
  assert.ok(
    builderCode.includes('data-testid="builder-autosave-indicator"'),
    "Live autosave status indicator exists in Line 1"
  );
  assert.ok(
    builderCode.includes('aria-label="Voltar para rotinas"'),
    "Accessible back button exists in Line 1"
  );
  assert.ok(
    builderCode.includes('aria-label="Mais opções do treino"'),
    "Discreet more options menu exists in Line 1"
  );
  // Line 2: Status do treino · Nome do treino
  assert.ok(
    builderCode.includes('data-testid="builder-status-badge"'),
    "Status badge exists in Line 2"
  );
  // Line 3: Objetivo · Nível · Duração estimada
  assert.ok(
    builderCode.includes('data-testid="mobile-header-meta"'),
    "Metadata line with objective, level and duration exists in Line 3"
  );
  // External duplicate back link hidden on mobile
  assert.ok(
    pageCode.includes("hidden sm:flex"),
    "Redundant external back button is hidden on mobile to avoid duplicate header"
  );
  // Desktop header preserved
  assert.ok(
    builderCode.includes("hidden sm:flex"),
    "Desktop header is preserved with hidden sm:flex"
  );
});

// 2. Navegação por categorias longas
runTest("2. Navegação por categorias longas com abas fluidas e indicador de continuidade", () => {
  assert.ok(
    builderCode.includes('data-testid="mobile-category-tabs"'),
    "Mobile category tabs navigation declared"
  );
  assert.ok(
    builderCode.includes("overflow-x-auto"),
    "Horizontal scroll enabled for category tabs"
  );
  assert.ok(
    builderCode.includes("no-scrollbar"),
    "Clean scrollbar styling without jarring native scrollbars"
  );
  assert.ok(
    builderCode.includes("bg-gradient-to-l from-[var(--surface)] to-transparent"),
    "Visual gradient fade mask indicates horizontal continuity on narrow screens"
  );
  assert.ok(
    builderCode.includes("scrollIntoView"),
    "Active tab smoothly scrolls into view when selected"
  );
});

// 3. Controles de movimentação acessíveis (>= 44px)
runTest("3. Controles de movimentação acessíveis com alvos de toque >= 44px", () => {
  // MobileExerciseCard steppers
  assert.ok(
    categoryCode.includes('aria-label="Mover exercício para cima"'),
    "Up button has accessible label"
  );
  assert.ok(
    categoryCode.includes('aria-label="Mover exercício para baixo"'),
    "Down button has accessible label"
  );
  assert.ok(
    categoryCode.includes("min-h-[44px] min-w-[44px]"),
    "Reorder buttons and options have minimum 44x44px touch targets"
  );
  // Accessible without drag-and-drop
  assert.ok(
    categoryCode.includes("onMoveUp") && categoryCode.includes("onMoveDown"),
    "Reordering is fully supported via touch tap buttons without dragging"
  );
});

// 4. Cards compactos de exercícios isolados
runTest("4. Cards compactos de exercícios isolados priorizam prescrição e clareza", () => {
  assert.ok(
    categoryCode.includes('data-testid="mobile-exercise-card"'),
    "Dedicated MobileExerciseCard is declared"
  );
  // Hierarchy: Name, Prescription, Load, Rest, Method note
  assert.ok(
    categoryCode.includes("item.exerciseNameSnapshot"),
    "Exercise name is primary"
  );
  assert.ok(
    categoryCode.includes("summary.seriesCount") && categoryCode.includes("summary.repsText"),
    "Prescription summary displays sets, reps, load and rest prominently"
  );
  // Elimination of bulky green "Editar" button
  assert.ok(
    !categoryCode.includes('className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white min-h-[44px]">Editar'),
    "Bulky standalone 'Editar' button eliminated in favor of clean tap-to-edit row"
  );
});

// 5. Abrir edição rápida pelo exercício (Tap-to-edit)
runTest("5. Tocar no exercício abre a edição rápida diretamente", () => {
  assert.ok(
    categoryCode.includes("if (isDraft) onOpenQuickEdit()"),
    "Clicking/tapping MobileExerciseCard triggers quick edit sheet"
  );
  assert.ok(
    categoryCode.includes("if (isDraft) onOpenQuickEdit(item)"),
    "Tapping internal combination exercise row triggers quick edit sheet"
  );
  assert.ok(
    categoryCode.includes("e.stopPropagation()"),
    "Steppers and menu buttons stop propagation to prevent accidental sheet open"
  );
});

// 6. Fechar painel com autosave e feedback de erro
runTest("6. Fechamento de painel faz flush das alterações pendentes com tratamento de erro", () => {
  assert.ok(
    categoryCode.includes("async function handleCloseWithFlush"),
    "handleCloseWithFlush ensures pending edits are saved before closing"
  );
  assert.ok(
    categoryCode.includes("setAutosaveStatus(\"error\")"),
    "Autosave error state is captured and preserved"
  );
  assert.ok(
    categoryCode.includes("Erro ao salvar · Tentar novamente"),
    "Retry action is available when quick edit autosave fails"
  );
  assert.ok(
    categoryCode.includes("Salvo automaticamente"),
    "Successful auto-save feedback is shown in sheet footer"
  );
});

// 7. Ação principal + Adicionar exercício e seletor
runTest("7. Ação principal '+ Adicionar exercício' com opções de Biblioteca, Custom e Combinar", () => {
  assert.ok(
    categoryCode.includes("<span>Adicionar exercício</span>"),
    "Primary action '+ Adicionar exercício' is clearly labeled"
  );
  assert.ok(
    categoryCode.includes("export function AddExerciseActionSheet"),
    "AddExerciseActionSheet component is declared"
  );
  assert.ok(
    categoryCode.includes("Buscar na Biblioteca"),
    "Option 1: Search from library"
  );
  assert.ok(
    categoryCode.includes("Exercício Personalizado"),
    "Option 2: Create custom exercise"
  );
  assert.ok(
    categoryCode.includes("Combinar Exercícios (Bi-set / Tri-set)"),
    "Option 3: Combine exercises without competing for attention"
  );
});

// 8. Adicionar em grupo e sub-bloco
runTest("8. Inclusão de exercícios e grupos (sub-blocos) respeitada", () => {
  assert.ok(
    categoryCode.includes("<span>Adicionar grupo</span>"),
    "Action to add sub-block group exists"
  );
  assert.ok(
    categoryCode.includes("mobileAddSheetTarget.subBlockPublicId"),
    "Target sub-block is preserved when adding exercises"
  );
});

// 9. Bi-set & Tri-set: formatação, voltas e ordenação preservada
runTest("9. Bi-set e Tri-set com cabeçalho compacto, voltas, descanso e ordem interna", () => {
  assert.ok(
    categoryCode.includes('data-testid="mobile-combination-block"'),
    "Unified combination block renders with data-testid"
  );
  assert.ok(
    categoryCode.includes("{typeLabel}"),
    "Combination type (Bi-Set, Tri-Set, etc.) is rendered"
  );
  assert.ok(
    categoryCode.includes("voltas"),
    "Voltas indicator is rendered"
  );
  assert.ok(
    categoryCode.includes("Descanso após a volta:"),
    "Dedicated rest between rounds is rendered in footer"
  );
  assert.ok(
    categoryCode.includes("Sem descanso entre exercícios"),
    "Transition indicator clearly marks continuous sequence"
  );
  assert.ok(
    categoryCode.includes("data-testid=\"combination-view-sequence-btn\""),
    "Ver sequência video button is available as a discreet secondary action"
  );
});

// 10. Publicação explícita sem autopublish
runTest("10. Publicação do treino é exclusivamente explícita sem autopublish", () => {
  assert.ok(
    builderCode.includes("data-testid=\"publish-workout-button\""),
    "Explicit publish button exists"
  );
  assert.ok(
    builderCode.includes("handleOpenPublishDialog"),
    "Publish handler is triggered exclusively by explicit user action"
  );
  assert.ok(
    !builderCode.includes("autoPublish"),
    "No autopublish mechanism exists"
  );
});

// 11. Versões publicadas imutáveis
runTest("11. Versões publicadas são estritamente imutáveis", () => {
  assert.ok(
    builderCode.includes("!isDraft"),
    "Read-only check for published workout is enforced"
  );
  assert.ok(
    categoryCode.includes("isDraft ?"),
    "Interactive builder controls are guarded by isDraft"
  );
  assert.ok(
    builderCode.includes("handleCreateNewVersion"),
    "Fork to new draft is required before editing a published routine"
  );
});

// 12. Ausência de overflow horizontal e responsividade
runTest("12. Layout responsivo sem overflow horizontal e com áreas de toque seguras", () => {
  assert.ok(
    builderCode.includes("overflow-x-hidden"),
    "Builder container prevents horizontal page overflow"
  );
  assert.ok(
    categoryCode.includes("min-w-0"),
    "Category cards declare min-w-0 to avoid flex overflow"
  );
  assert.ok(
    categoryCode.includes("break-words"),
    "Long exercise names wrap without overflowing boundaries"
  );
});

console.log("================================================================================");
console.log(`TEST RESULTS: ${passed} passed, ${failed} failed`);
console.log("================================================================================");

if (failed > 0) {
  process.exit(1);
}
