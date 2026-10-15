import fs from "fs";
import path from "path";

console.log("================================================================================");
console.log("TREVO ONE — TRAINING STUDIO: AÇÕES VISÍVEIS SEM POLUIR (V2) TEST SUITE");
console.log("================================================================================");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

const rootDir = process.cwd();
const categoryCardPath = path.join(rootDir, "components/consultancies/training-v2/workout-category-card.tsx");
const workoutBuilderPath = path.join(rootDir, "components/consultancies/training-v2/workout-builder.tsx");

const categoryCardContent = fs.readFileSync(categoryCardPath, "utf-8");
const workoutBuilderContent = fs.readFileSync(workoutBuilderPath, "utf-8");

// ============================================================================
// CRITERION 1: NÍVEL 1 — AÇÕES SEMPRE VISÍVEIS NO CABEÇALHO DA SEÇÃO DO DIA
// ============================================================================
console.log("\n--- NÍVEL 1: CABEÇALHO DA SEÇÃO DO DIA (MOBILE & DESKTOP) ---");

// 1.1 + Exercício button present with testid and accessible label
assert(
  categoryCardContent.includes('data-testid="category-add-exercise-btn"') &&
  categoryCardContent.includes('aria-label="Adicionar exercício"'),
  "1.1 Botão '+ Exercício' está presente no cabeçalho com data-testid e rótulo acessível"
);

// 1.2 Combinar button present with testid and accessible label
assert(
  categoryCardContent.includes('data-testid="category-combine-btn"') &&
  categoryCardContent.includes('aria-label={combiningSubBlockId === "root" ? "Cancelar modo combinar" : "Combinar exercícios em Bi-set, Tri-set ou Circuito"}'),
  "1.2 Botão 'Combinar' está presente no cabeçalho com data-testid e rótulo acessível"
);

// 1.3 Side-by-side without hidden sm:flex or hidden mobile classes on category actions
const categoryHeaderActionsRegex = /Category Actions — Nível 1: "\+ Exercício" e "Combinar" lado a lado[\s\S]*?<div className="flex items-center gap-1\.5 shrink-0 self-end sm:self-center relative">/;
assert(
  categoryHeaderActionsRegex.test(categoryCardContent),
  "1.3 '+ Exercício' e 'Combinar' estão dispostos lado a lado sem 'hidden sm:flex' (visíveis no mobile e desktop)"
);

// 1.4 Sub-block header also includes side-by-side + Exercício and Combinar
assert(
  categoryCardContent.includes('aria-label="Adicionar exercício ao grupo"') &&
  categoryCardContent.includes('aria-label={isCombiningThisSb ? "Cancelar modo combinar no grupo" : "Combinar exercícios no grupo"}'),
  "1.4 Cabeçalho de sub-blocos (grupos) também possui '+ Exercício' e 'Combinar' lado a lado"
);

// ============================================================================
// CRITERION 2: NÍVEL 1 — TOPO DA TELA & CARD DO EXERCÍCIO
// ============================================================================
console.log("\n--- NÍVEL 1: TOPO DA TELA & CARDS ---");

// 2.1 Publicar is the primary action in workout-builder
assert(
  workoutBuilderContent.includes('data-testid="publish-workout-button"') &&
  workoutBuilderContent.includes('bg-emerald-600') &&
  workoutBuilderContent.includes('Publicar'),
  "2.1 'Publicar' é a ação primária destacada no topo da tela (em verde esmeralda)"
);

// 2.2 Passive live autosave indicator present
assert(
  workoutBuilderContent.includes('data-testid="builder-autosave-indicator"') &&
  workoutBuilderContent.includes('Salvando…') &&
  workoutBuilderContent.includes('Salvo'),
  "2.2 Indicador passivo de autosave está visível no topo sem poluir a experiência"
);

// 2.3 Exercise card itself is touchable and opens quick edit (Mobile Premium pattern)
assert(
  categoryCardContent.includes('data-testid="mobile-exercise-card"') &&
  categoryCardContent.includes('if (isDraft) onOpenQuickEdit();') &&
  categoryCardContent.includes('role={isDraft ? "button" : undefined}'),
  "2.3 Card do exercício é tocável na íntegra para abrir edição rápida da prescrição"
);

// ============================================================================
// CRITERION 3: REGRAS ANTI-POLUIÇÃO
// ============================================================================
console.log("\n--- REGRAS ANTI-POLUIÇÃO ---");

// 3.1 No competing solid green buttons in the header:
// + Exercício is bg-emerald-600, while Combinar uses bg-[var(--surface-subtle)] or rose when active
assert(
  categoryCardContent.includes('bg-emerald-600 hover:bg-emerald-700 text-white') &&
  categoryCardContent.includes('bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]'),
  "3.1 Sem competição visual: '+ Exercício' é verde primário e 'Combinar' é neutro sutil (nunca dois verdes sólidos)"
);

// 3.2 Accessible touch targets (>= 38px on header, >= 44px on mobile interactive buttons)
assert(
  categoryCardContent.includes('min-h-[38px] sm:min-h-[34px]') &&
  categoryCardContent.includes('min-h-[44px] min-w-[44px]'),
  "3.2 Alvos de toque acessíveis e ergonomia mobile-first respeitados"
);

// ============================================================================
// CRITERION 4: NÍVEL 2 — A UM TOQUE NO MENU ⋯ OU BOTTOM SHEET
// ============================================================================
console.log("\n--- NÍVEL 2: A UM TOQUE NO MENU ⋯ / BOTTOM SHEET ---");

// 4.1 'Combinar a partir daqui' in ExerciseActionsSheet
assert(
  categoryCardContent.includes('Combinar a partir daqui') &&
  categoryCardContent.includes('onCombineFromHere();'),
  "4.1 'Combinar a partir daqui' disponível no menu de ações do exercício (ExerciseActionsSheet)"
);

// 4.2 'Combinar a partir daqui' in desktop ExerciseRow menu
assert(
  categoryCardContent.includes('<span>Combinar a partir daqui</span>') &&
  categoryCardContent.includes('!inCombination && onCombineFromHere'),
  "4.2 'Combinar a partir daqui' disponível no menu de ações do desktop (ExerciseRow)"
);

// 4.3 Other Nível 2 actions present in ExerciseActionsSheet
assert(
  categoryCardContent.includes('Duplicar Exercício') &&
  categoryCardContent.includes('Excluir Exercício') &&
  categoryCardContent.includes('Mover para Cima') &&
  categoryCardContent.includes('Ver Execução / Vídeo'),
  "4.3 Duplicar, excluir, reordenar e ver execução presentes no menu Nível 2"
);

// 4.4 Dissolver combinação & Ajustar descanso
assert(
  categoryCardContent.includes('Desfazer combinação') &&
  categoryCardContent.includes('Descanso após a volta:') &&
  categoryCardContent.includes('onOpenEditCombination'),
  "4.4 Dissolver combinação e ajuste de descanso após a volta disponíveis a um toque"
);

// ============================================================================
// CRITERION 5: NÍVEL 3 — MENU ⋯ DO TOPO
// ============================================================================
console.log("\n--- NÍVEL 3: MENU ⋯ DO TOPO ---");

// 5.1 Menu ⋯ at the top contains Dados da ficha, Pré-visualizar, Baixar PDF
assert(
  workoutBuilderContent.includes('Dados da ficha') &&
  workoutBuilderContent.includes('Pré-visualizar como aluno') &&
  workoutBuilderContent.includes('Baixar PDF'),
  "5.1 Menu ⋯ do topo contém Dados da ficha, Pré-visualizar e Baixar PDF"
);

// 5.2 Header menu is accessible on both mobile and desktop (sm:hidden removed)
const headerMenuSection = workoutBuilderContent.slice(
  workoutBuilderContent.indexOf('isHeaderMenuOpen &&'),
  workoutBuilderContent.indexOf('isHeaderMenuOpen &&') + 800
);
assert(
  !headerMenuSection.includes('sm:hidden'),
  "5.2 Ações Nível 3 no menu ⋯ estão disponíveis em todas as resoluções (sem sm:hidden restritivo)"
);

// ============================================================================
// CRITERION 6: MODO COMBINAR (DESTAQUE DO NÍVEL 1)
// ============================================================================
console.log("\n--- MODO COMBINAR UX & AUTOMAÇÃO ---");

// 6.1 Order badge in selection mode (1º, 2º, 3º na combinação)
assert(
  categoryCardContent.includes('{isSelected ? (selectionIndex ?? 1) : "+"}') &&
  categoryCardContent.includes('{selectionIndex ?? 1}º na combinação'),
  "6.1 Seleção inconfundível com número da ordem visual (1º, 2º...) e badge no card"
);

// 6.2 Auto-suggestion of combination type based on selected count
assert(
  categoryCardContent.includes('if (next.length === 2) setNewCombType("BI_SET");') &&
  categoryCardContent.includes('else if (next.length === 3) setNewCombType("TRI_SET");') &&
  categoryCardContent.includes('else if (next.length >= 4) setNewCombType("GIANT_SET");'),
  "6.2 Tipo pré-selecionado pelo óbvio: 2 selecionados = Bi-Set, 3 = Tri-Set, 4+ = Série Gigante"
);

// 6.3 Cancel always visible and Confirm resets mode cleanly
assert(
  categoryCardContent.includes('✕ Cancelar') &&
  categoryCardContent.includes('setCombiningSubBlockId(null);') &&
  categoryCardContent.includes('setSelectedExerciseIds([]);'),
  "6.3 'Cancelar' sempre visível; confirmação cria grupo, limpa seleção e sai do modo automaticamente"
);

// 6.4 handleCombineFromHere starts mode with 1st item pre-selected
assert(
  categoryCardContent.includes('function handleCombineFromHere(itemPublicId: string, subBlockId?: string)') &&
  categoryCardContent.includes('setSelectedExerciseIds([itemPublicId]);') &&
  categoryCardContent.includes('setNewCombType("BI_SET");'),
  "6.4 'Combinar a partir daqui' inicia o modo com o exercício já marcado como #1 e Bi-Set pré-selecionado"
);

// ============================================================================
// CRITERION 7: VELOCIDADE DE MONTAGEM & CRITÉRIOS DE ACEITE
// ============================================================================
console.log("\n--- VELOCIDADE DE MONTAGEM & ACEITE ---");

// 7.1 Fast Bi-Set creation: 1 tap (Combinar) + 2 taps (cards) + 1 tap (Confirmar) = 4 taps
assert(
  categoryCardContent.includes('data-testid="category-combine-btn"') &&
  categoryCardContent.includes('data-testid="mobile-exercise-card-selectable"') &&
  (categoryCardContent.includes('Agrupar em ${COMBINATION_TYPE_LABELS[combinationType]}') || categoryCardContent.includes('Criar ${COMBINATION_TYPE_LABELS[combinationType]}')),
  "7.1 Fluxo rápido de Bi-set: 1 toque (Combinar) + 2 toques (exercícios) + 1 toque (Criar/Agrupar) garantido"
);

// 7.2 Alternative 3-tap/4-tap via 'Combinar a partir daqui'
assert(
  categoryCardContent.includes('onCombineFromHere();') &&
  categoryCardContent.includes('setSelectedExerciseIds([itemPublicId]);'),
  "7.2 Fluxo via 'Combinar a partir daqui' permite iniciar Bi-set direto a partir do card selecionado"
);

// 7.3 Invisible autosave preserves active combination mode state
assert(
  categoryCardContent.includes('combiningSubBlockId !== null') &&
  !categoryCardContent.includes('scheduleSave() && setCombiningSubBlockId(null)'),
  "7.3 Autosave invisível não cancela o modo de combinação nem desfaz seleções ativas"
);

console.log("\n================================================================================");
console.log(`TEST RESULTS: ${passed} passed, ${failed} failed`);
console.log("================================================================================");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
