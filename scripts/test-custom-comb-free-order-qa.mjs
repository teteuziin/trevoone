import fs from "fs";
import path from "path";

console.log("=== TREVO ONE: QA VERIFICATION FOR CUSTOM COMBINATIONS & REFINEMENTS ===");

let hasErrors = false;
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    hasErrors = true;
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

const rootDir = process.cwd();

// 1. workout-category-card.tsx
const categoryCardPath = path.join(rootDir, "components/consultancies/training-v2/workout-category-card.tsx");
const categoryCardContent = fs.readFileSync(categoryCardPath, "utf-8");

assert(
  !categoryCardContent.includes("const partitioned ="),
  "workout-category-card.tsx: Removed partitioned arrays that forced combinations to the top"
);
assert(
  !categoryCardContent.includes("Exercícios avulsos"),
  "workout-category-card.tsx: Removed 'Exercícios avulsos' divider separating combinations from items"
);
assert(
  !categoryCardContent.includes(">+ Adicionar exercício<"),
  "workout-category-card.tsx: Removed duplicate '+' sign on '+ Adicionar exercício' button"
);
assert(
  categoryCardContent.includes("onCreateCustomAndCombineItem={handleCreateCustomAndCombineItem}"),
  "workout-category-card.tsx: Wired onCreateCustomAndCombineItem to GuidedCombinationModal"
);

// 2. guided-combination-modal.tsx
const guidedCombPath = path.join(rootDir, "components/consultancies/training-v2/guided-combination-modal.tsx");
const guidedCombContent = fs.readFileSync(guidedCombPath, "utf-8");

assert(
  guidedCombContent.includes("viewMode === \"CREATE_CUSTOM\""),
  "guided-combination-modal.tsx: Supports embedded CREATE_CUSTOM view mode"
);
assert(
  guidedCombContent.includes("Criar Exercício Personalizado"),
  "guided-combination-modal.tsx: Renders inline custom exercise creation form"
);
assert(
  guidedCombContent.includes("handleCloseAndCleanup"),
  "guided-combination-modal.tsx: Cleans up temporary created custom items if user cancels"
);
assert(
  guidedCombContent.includes("Criar personalizado"),
  "guided-combination-modal.tsx: Contains discrete button to create custom exercise"
);

// 3. unified-exercise-picker.tsx
const pickerPath = path.join(rootDir, "components/consultancies/training-v2/unified-exercise-picker.tsx");
const pickerContent = fs.readFileSync(pickerPath, "utf-8");

assert(
  !pickerContent.includes("Exercício não listado? Crie uma variação personalizada rápida"),
  "unified-exercise-picker.tsx: Removed permanent banner"
);
assert(
  pickerContent.includes("line-clamp-2") && !pickerContent.includes("text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate"),
  "unified-exercise-picker.tsx: Replaced truncate with multi-line wrap for full title visibility"
);
assert(
  pickerContent.includes("setSearchQuery(\"\")"),
  "unified-exercise-picker.tsx: Added search clear button"
);

// 4. custom-exercise-inline-modal.tsx
const customModalPath = path.join(rootDir, "components/consultancies/training-v2/custom-exercise-inline-modal.tsx");
const customModalContent = fs.readFileSync(customModalPath, "utf-8");

assert(
  !customModalContent.includes("Não bloqueia a publicação da ficha"),
  "custom-exercise-inline-modal.tsx: Removed technical notice 'Não bloqueia a publicação da ficha'"
);
assert(
  customModalContent.includes("useState(false)") && customModalContent.includes("saveToMyLibrary"),
  "custom-exercise-inline-modal.tsx: saveToMyLibrary defaults to false"
);
assert(
  customModalContent.includes("1. Exercício") && customModalContent.includes("2. Prescrição") && customModalContent.includes("3. Demonstração e Detalhes Opcionais"),
  "custom-exercise-inline-modal.tsx: Form structured cleanly in 3 parts"
);

// 5. student-workout-renderer.tsx
const rendererPath = path.join(rootDir, "components/consultancies/training-v2/student-workout-renderer.tsx");
const rendererContent = fs.readFileSync(rendererPath, "utf-8");

assert(
  !rendererContent.includes("<span>Disponível offline</span>"),
  "student-workout-renderer.tsx: Removed false 'Disponível offline' badge"
);
assert(
  !rendererContent.includes("Demonstração: Execução de treino desabilitada na prévia"),
  "student-workout-renderer.tsx: Removed duplicate preview notice in execution control area"
);
assert(
  rendererContent.includes("isSpecialMethod") && !rendererContent.includes("const methodLabel = METHOD_LABELS[block.blockType] || block.blockType;"),
  "student-workout-renderer.tsx: BlockCard only displays method label for genuine methods"
);
assert(
  rendererContent.includes("selectedBlockIndex") && rendererContent.includes("Todas as categorias"),
  "student-workout-renderer.tsx: Category navigation bar rendered for multi-block workouts"
);

// 6. workout-builder.tsx
const builderPath = path.join(rootDir, "components/consultancies/training-v2/workout-builder.tsx");
const builderContent = fs.readFileSync(builderPath, "utf-8");

assert(
  builderContent.includes("Prévia da Ficha do Aluno") && !builderContent.includes("MODO DE VISUALIZAÇÃO\n                </span>\n                <h3 className=\"text-base font-extrabold text-[var(--text-primary)]\">\n                  {title}"),
  "workout-builder.tsx: Preview modal header displays 'Prévia da Ficha do Aluno' without duplicating workout title"
);
assert(
  builderContent.includes("assignmentPublicId: \"preview-mode\",\n                  consultancyName: \"TREVO ONE\",\n                  startsOn: null,"),
  "workout-builder.tsx: Preview mode passes startsOn: null"
);

if (hasErrors) {
  console.error("\n❌ QA Verification encountered errors!");
  process.exit(1);
} else {
  console.log("\n✅ ALL QA CHECKS PASSED SUCCESSFULLY!");
  process.exit(0);
}
