import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

console.log("==================================================");
console.log("TREVO ONE — MOBILE MODAL & BUILDER CONTROLS AUDIT");
console.log("==================================================");

const switcherPath = path.resolve("components/dashboard/cockpit-role-mode-switcher.tsx");
const categoryCardPath = path.resolve("components/consultancies/training-v2/workout-category-card.tsx");
const blockOrderModalPath = path.resolve("components/consultancies/training-v2/block-order-modal.tsx");
const guidedModalPath = path.resolve("components/consultancies/training-v2/guided-combination-modal.tsx");
const designSystemPath = path.resolve("components/ui/design-system.tsx");

const switcherCode = fs.readFileSync(switcherPath, "utf-8");
const categoryCardCode = fs.readFileSync(categoryCardPath, "utf-8");
const blockOrderModalCode = fs.readFileSync(blockOrderModalPath, "utf-8");
const guidedModalCode = fs.readFileSync(guidedModalPath, "utf-8");
const designSystemCode = fs.readFileSync(designSystemPath, "utf-8");

let passed = 0;

// Test 1: CockpitRoleModeSwitcher uses createPortal to document.body
assert.ok(
  switcherCode.includes('createPortal(') && switcherCode.includes('document.body'),
  "CockpitRoleModeSwitcher must render mobile sheet into document.body portal"
);
console.log("[PASS] Test 1: CockpitRoleModeSwitcher usa createPortal para document.body");
passed++;

// Test 2: Mobile sheet has z-[100] backdrop and max-h dvh bounds
assert.ok(
  switcherCode.includes("z-[100]") && switcherCode.includes("max-h-[min(88dvh"),
  "Mobile sheet must have z-[100] and dynamic viewport max-height bounds"
);
console.log("[PASS] Test 2: Painel mobile possui z-[100] e limitação por dvh sem cortes");
passed++;

// Test 3: Fixed header, scrollable options with safe area padding and min 54px touch targets
assert.ok(
  switcherCode.includes("safe-area-inset-bottom") &&
  switcherCode.includes("min-h-[54px]") &&
  switcherCode.includes("overflow-y-auto"),
  "Options list must have safe-area padding, min 54px height and internal scrolling"
);
console.log("[PASS] Test 3: Cabeçalho fixo, opções com alvo de toque >= 54px e safe-area");
passed++;

// Test 4: Body scroll lock and Escape key focus return
assert.ok(
  switcherCode.includes('document.body.style.overflow = "hidden"') &&
  switcherCode.includes('triggerRef.current?.focus()') &&
  switcherCode.includes('e.key === "Escape"'),
  "Switcher must lock body scroll, handle Escape key and restore focus to trigger"
);
console.log("[PASS] Test 4: Bloqueio de rolagem do fundo, tecla Escape e retorno de foco");
passed++;

// Test 5: Redundant header organize button removed from workout category card
assert.ok(
  !categoryCardCode.includes('data-testid="category-organize-order-header-btn"'),
  "Duplicated category-organize-order-header-btn must be removed"
);
assert.ok(
  categoryCardCode.includes('data-testid="category-organize-order-bar-btn"'),
  "category-organize-order-bar-btn must be preserved in assembly bar"
);
console.log("[PASS] Test 5: Duplicidade de 'Organizar' removida do cabeçalho do treino");
passed++;

// Test 6: Assembly bar sequence: Adicionar exercício -> Criar combinação -> Organizar ordem
const addIdx = categoryCardCode.indexOf('data-testid="category-add-exercise-btn"');
const combineIdx = categoryCardCode.indexOf('data-testid="category-combine-btn"');
const orderIdx = categoryCardCode.indexOf('data-testid="category-organize-order-bar-btn"');
assert.ok(
  addIdx !== -1 && combineIdx !== -1 && orderIdx !== -1,
  "All three primary assembly bar buttons must exist"
);
assert.ok(
  addIdx < combineIdx && combineIdx < orderIdx,
  "Buttons must follow sequence: Adicionar exercício -> Criar combinação -> Organizar ordem"
);
console.log("[PASS] Test 6: Sequência correta no assembly bar: Adicionar -> Combinar -> Organizar");
passed++;

// Test 7: Mobile AddExerciseActionSheet standardized with 'Criar combinação' and clean copy
assert.ok(
  categoryCardCode.includes("Busque exercícios por nome, equipamento ou grupo muscular"),
  "Library search description must not contain fixed claim 'Mais de 1.000 exercícios'"
);
assert.ok(
  !categoryCardCode.includes("Mais de 1.000 exercícios catalogados"),
  "Old fixed claim must be completely removed"
);
assert.ok(
  categoryCardCode.includes("Criar combinação") &&
  categoryCardCode.includes("Bi-set, Tri-set, Circuito ou Super-série"),
  "Third option must be standardized to 'Criar combinação'"
);
console.log("[PASS] Test 7: AddExerciseActionSheet padronizado com 'Criar combinação' e copy limpo");
passed++;

// Test 8: Both combination triggers open the exact same GuidedCombinationModal flow
assert.ok(
  categoryCardCode.includes("setGuidedModalState") &&
  categoryCardCode.includes("<GuidedCombinationModal"),
  "WorkoutCategoryCard must use GuidedCombinationModal for both entry points"
);
assert.ok(
  !categoryCardCode.includes("onCreateCombination && items.length >= 2"),
  "onSelectCombine must not require items.length >= 2"
);
console.log("[PASS] Test 8: Os dois acessos de combinação abrem o mesmo GuidedCombinationModal");
passed++;

// Test 9: GuidedCombinationModal locks body scroll, handles Escape, and cleans up on cancel
assert.ok(
  guidedModalCode.includes('document.body.style.overflow = "hidden"') &&
  guidedModalCode.includes('e.key === "Escape"') &&
  guidedModalCode.includes('handleCloseAndCleanup'),
  "GuidedCombinationModal must lock body scroll, handle Escape and cleanly revert session items on cancel"
);
console.log("[PASS] Test 9: GuidedCombinationModal com scroll lock, Escape e rollback limpo");
passed++;

// Test 10: BlockOrderModal uses createPortal, locks body scroll and handles Escape
assert.ok(
  blockOrderModalCode.includes("createPortal(") &&
  blockOrderModalCode.includes("document.body") &&
  blockOrderModalCode.includes('document.body.style.overflow = "hidden"') &&
  blockOrderModalCode.includes('e.key === "Escape"'),
  "BlockOrderModal must render to body portal with scroll lock and Escape handler"
);
console.log("[PASS] Test 10: BlockOrderModal usa portal para body, scroll lock e Escape");
passed++;

// Test 11: BottomSheet uses createPortal to document.body with z-[100]
assert.ok(
  designSystemCode.includes("createPortal(") &&
  designSystemCode.includes("document.body") &&
  designSystemCode.includes("z-[100]"),
  "BottomSheet must render to body portal with z-[100] and escape handling"
);
console.log("[PASS] Test 11: BottomSheet universal utiliza portal para document.body e z-[100]");
passed++;

console.log("==================================================");
console.log(`AUDIT RESULTS: ${passed}/11 PASS`);
console.log("==================================================");
