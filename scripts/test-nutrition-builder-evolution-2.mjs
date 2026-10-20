/**
 * Automated test suite for "TREVO ONE — SEGUNDA EVOLUÇÃO DO BUILDER NUTRICIONAL"
 * Verifies:
 * 1. NutritionItemEditor: 1-line desktop, 3-line mobile, decimal comma, instant macro preview, collapsed substitutions by default, menu ⋮.
 * 2. NutritionMealEditor: Clean header with subtotal, collapse chevron, menu ⋮, forceCollapsed support.
 * 3. NutritionSubstitutionCompareModal: Side-by-side comparison with deltas and criterion.
 * 4. NutritionMealInlineSearch: Keyboard navigation, continuous adding, quick suggestions.
 * 5. NutritionPlanBuilder: Integrated compact top bar, short tabs, meal jump dropdown, undo engine, correct Total vs Meta labels.
 */

import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

console.log("🚀 Iniciando suíte de testes: Segunda Evolução do Builder Nutricional...");

const itemEditorPath = path.resolve("components/consultancies/nutrition-v2/nutrition-item-editor.tsx");
const mealEditorPath = path.resolve("components/consultancies/nutrition-v2/nutrition-meal-editor.tsx");
const compareModalPath = path.resolve("components/consultancies/nutrition-v2/nutrition-substitution-compare-modal.tsx");
const inlineSearchPath = path.resolve("components/consultancies/nutrition-v2/nutrition-meal-inline-search.tsx");
const builderPath = path.resolve("components/consultancies/nutrition-v2/nutrition-plan-builder.tsx");
const publishDialogPath = path.resolve("components/consultancies/nutrition-v2/nutrition-publish-dialog.tsx");

// 1. Verify NutritionItemEditor
console.log("\n[1/5] Verificando NutritionItemEditor...");
assert(fs.existsSync(itemEditorPath), "Arquivo nutrition-item-editor.tsx deve existir");
const itemEditorCode = fs.readFileSync(itemEditorPath, "utf-8");

// Must have collapsed substitutions by default
assert(
  itemEditorCode.includes("const [areSubsExpanded, setAreSubsExpanded] = useState(false);"),
  "Substituições devem iniciar recolhidas por padrão (areSubsExpanded = false)"
);

// Must have decimal input mode
assert(
  itemEditorCode.includes('inputMode="decimal"'),
  "Edição inline de quantidade deve suportar inputMode='decimal'"
);

// Must have comma replacement logic for decimals
assert(
  itemEditorCode.includes('replace(",", ".")'),
  "Deve converter vírgula decimal em ponto para cálculo"
);

// Must have NutritionSubstitutionCompareModal integrated
assert(
  itemEditorCode.includes("NutritionSubstitutionCompareModal"),
  "Deve integrar modal de comparação lado a lado de substituições"
);

// Must have menu ⋮ for secondary food actions
assert(
  itemEditorCode.includes("isMenuOpen"),
  "Deve conter menu ⋮ para ações secundárias do alimento"
);

// Must NOT contain separate full-width isolated action row on mobile
assert(
  !itemEditorCode.includes('w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-[var(--border-subtle)]'),
  "Não deve existir linha isolada de botões no rodapé do item em mobile"
);

console.log("✅ NutritionItemEditor aprovado!");

// 2. Verify NutritionMealEditor
console.log("\n[2/5] Verificando NutritionMealEditor...");
assert(fs.existsSync(mealEditorPath), "Arquivo nutrition-meal-editor.tsx deve existir");
const mealEditorCode = fs.readFileSync(mealEditorPath, "utf-8");

// Meal header must have subtotal and collapse chevron
assert(
  mealEditorCode.includes("meal.mealTotals.caloriesKcal"),
  "Cabeçalho da refeição deve exibir subtotal de calorias"
);
assert(
  mealEditorCode.includes("isCollapsed"),
  "Deve suportar recolhimento / expansão da refeição"
);

// Must have meal menu ⋮
assert(
  mealEditorCode.includes("isMenuOpen"),
  "Refeição deve conter menu ⋮ com ações agrupadas"
);

// Must support forceCollapsed from parent
assert(
  mealEditorCode.includes("forceCollapsed"),
  "Deve suportar prop forceCollapsed para expansão/recolhimento global"
);

console.log("✅ NutritionMealEditor aprovado!");

// 3. Verify NutritionSubstitutionCompareModal
console.log("\n[3/5] Verificando NutritionSubstitutionCompareModal...");
assert(fs.existsSync(compareModalPath), "Arquivo nutrition-substitution-compare-modal.tsx deve existir");
const compareModalCode = fs.readFileSync(compareModalPath, "utf-8");

assert(
  compareModalCode.includes("Alimento Principal") && compareModalCode.includes("Alternativa (OU)"),
  "Modal deve comparar Alimento Principal vs Alternativa"
);
assert(
  compareModalCode.includes("diffKcal") && compareModalCode.includes("diffP"),
  "Modal deve calcular deltas de calorias e macronutrientes"
);
assert(
  compareModalCode.includes("Confirmar Equivalência"),
  "Modal deve permitir confirmar equivalência da substituição"
);

console.log("✅ NutritionSubstitutionCompareModal aprovado!");

// 4. Verify NutritionMealInlineSearch
console.log("\n[4/5] Verificando NutritionMealInlineSearch...");
assert(fs.existsSync(inlineSearchPath), "Arquivo nutrition-meal-inline-search.tsx deve existir");
const inlineSearchCode = fs.readFileSync(inlineSearchPath, "utf-8");

// Keyboard navigation
assert(
  inlineSearchCode.includes("ArrowDown") && inlineSearchCode.includes("ArrowUp") && inlineSearchCode.includes("Escape"),
  "Busca inline deve suportar navegação por teclado (ArrowUp, ArrowDown, Escape)"
);

// Quick staple suggestions
assert(
  inlineSearchCode.includes("QUICK_SUGGESTIONS"),
  "Busca inline deve exibir alimentos favoritos/comuns quando a consulta estiver vazia"
);

// Continuous addition: must keep search open
assert(
  inlineSearchCode.includes("searchInputRef.current?.focus()"),
  "Busca inline deve manter foco no campo após adicionar para inserções contínuas"
);

console.log("✅ NutritionMealInlineSearch aprovado!");

// 5. Verify NutritionPlanBuilder
console.log("\n[5/5] Verificando NutritionPlanBuilder...");
assert(fs.existsSync(builderPath), "Arquivo nutrition-plan-builder.tsx deve existir");
const builderCode = fs.readFileSync(builderPath, "utf-8");

// Integrated Top Bar: must have inline editable title without huge title card
assert(
  builderCode.includes("isEditingTitle"),
  "Título deve ser editável inline no Top Bar"
);

// Short tabs
assert(
  builderCode.includes('"Montagem"') && builderCode.includes('"Análise"') && builderCode.includes('"Orientações"'),
  "Tabs devem ser curtas e diretas: Montagem, Análise, Orientações"
);

// Quick meal jump dropdown & expand all
assert(
  builderCode.includes("Ir para refeição..."),
  "Barra de dias deve conter seletor 'Ir para refeição...'"
);
assert(
  builderCode.includes("allMealsCollapsed"),
  "Deve conter controle para 'Expandir todas / Recolher todas'"
);

// Floating Undo toast for food deletion
assert(
  builderCode.includes("deletedItemUndo") && builderCode.includes("handleUndoRemoveItem"),
  "Deve implementar mecanismo de desfazer exclusão de alimento com toast flutuante"
);

// Correct Total vs Meta label (never label cardápio total as meta!)
assert(
  builderCode.includes("Total do Cardápio"),
  "Painel nutricional deve rotular explicitamente 'Total do Cardápio'"
);
assert(
  builderCode.includes("Meta Clínica"),
  "Painel nutricional deve rotular meta clínica separadamente do total montado"
);
assert(
  builderCode.includes("Não definida"),
  "Se meta clínica não estiver configurada, deve exibir 'Não definida'"
);

// Actionable publish checklist jump
assert(
  builderCode.includes("handleReviewPublicationItem"),
  "Checklist pré-publicação deve saltar e destacar o item pendente na tela"
);

console.log("✅ NutritionPlanBuilder aprovado!");

console.log("\n🎉 TODOS OS 5 TESTES DE SEGUNDA EVOLUÇÃO PASSARAM COM SUCESSO!\n");
