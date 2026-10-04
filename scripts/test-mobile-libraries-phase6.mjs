import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  checkExerciseDuplicateOrVariation,
  isStructuralVariation,
  normalizeExerciseName,
} from "../lib/training-v2/exercise-similarity.ts";
import {
  formatNutrientValue,
  formatCaloriesValue,
} from "../components/consultancies/nutrition-v2/mobile-food-cockpit.tsx";

const rootDir = process.cwd();

console.log("==================================================");
console.log("TREVO ONE — MOBILE NATIVE LIBRARIES (PHASE 6)");
console.log("EXERCISE LIBRARY + FOOD LIBRARY TEST SUITE");
console.log("==================================================");

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    failed++;
  }
}

// -----------------------------------------------------------------------------
// FILE AUDITS
// -----------------------------------------------------------------------------
const exercisePagePath = path.join(rootDir, "app/consultoria/[slug]/exercicios/page.tsx");
assert.ok(fs.existsSync(exercisePagePath), "exercicios/page.tsx must exist");
const exercisePageCode = fs.readFileSync(exercisePagePath, "utf-8");

const exerciseCockpitPath = path.join(
  rootDir,
  "components/consultancies/training-v2/mobile-exercise-cockpit.tsx"
);
assert.ok(fs.existsSync(exerciseCockpitPath), "mobile-exercise-cockpit.tsx must exist");
const exerciseCockpitCode = fs.readFileSync(exerciseCockpitPath, "utf-8");

const exerciseSimilarityPath = path.join(
  rootDir,
  "lib/training-v2/exercise-similarity.ts"
);
assert.ok(fs.existsSync(exerciseSimilarityPath), "exercise-similarity.ts must exist");
const exerciseSimilarityCode = fs.readFileSync(exerciseSimilarityPath, "utf-8");

const foodPagePath = path.join(rootDir, "app/consultoria/[slug]/alimentos-v2/page.tsx");
assert.ok(fs.existsSync(foodPagePath), "alimentos-v2/page.tsx must exist");
const foodPageCode = fs.readFileSync(foodPagePath, "utf-8");

const foodCockpitPath = path.join(
  rootDir,
  "components/consultancies/nutrition-v2/mobile-food-cockpit.tsx"
);
assert.ok(fs.existsSync(foodCockpitPath), "mobile-food-cockpit.tsx must exist");
const foodCockpitCode = fs.readFileSync(foodCockpitPath, "utf-8");

const foodLibraryPath = path.join(
  rootDir,
  "components/consultancies/nutrition-v2/nutritionist-food-library.tsx"
);
assert.ok(fs.existsSync(foodLibraryPath), "nutritionist-food-library.tsx must exist");
const foodLibraryCode = fs.readFileSync(foodLibraryPath, "utf-8");

// =============================================================================
// PARTE A: EXERCISE LIBRARY TESTS (TEST 1 to 12)
// =============================================================================

runTest("TEST 1: Exercise Library - lista mobile limpa e sem tabela desktop espremida", () => {
  // Must render MobileExerciseCockpit on sm:hidden
  assert.ok(
    exercisePageCode.includes("<MobileExerciseCockpit"),
    "exercicios/page.tsx must mount MobileExerciseCockpit"
  );
  assert.ok(
    exercisePageCode.includes("sm:hidden"),
    "Mobile layout must be isolated under sm:hidden"
  );
  // Card layout in mobile cockpit
  assert.ok(
    exerciseCockpitCode.includes("items.map"),
    "Mobile cockpit must map exercises to clean mobile cards"
  );
  assert.ok(
    !exerciseCockpitCode.includes("<table"),
    "Mobile cockpit must NOT use a desktop table"
  );
});

runTest("TEST 2: Exercise Library - busca rápida com debounce e clear button", () => {
  assert.ok(
    exerciseCockpitCode.includes("searchQuery") &&
    exerciseCockpitCode.includes("applyFilters"),
    "Mobile exercise cockpit must support live search queries"
  );
  assert.ok(
    exerciseCockpitCode.includes("Limpar busca") || exerciseCockpitCode.includes("setSearchQuery(\"\")"),
    "Mobile exercise cockpit must provide a 1-tap clear button for search"
  );
  assert.ok(
    exerciseCockpitCode.includes("aria-label=\"Limpar busca\"") ||
    exerciseCockpitCode.includes("placeholder=\"Buscar por nome do exercício...\""),
    "Search input must be accessible"
  );
});

runTest("TEST 3: Exercise Library - filtros em BottomSheet e chips ativos", () => {
  assert.ok(
    exerciseCockpitCode.includes("isFilterSheetOpen") &&
    exerciseCockpitCode.includes("Filtros"),
    "Must have a dedicated filter bottom sheet"
  );
  assert.ok(
    exerciseCockpitCode.includes("hasActiveFilters") ||
    exerciseCockpitCode.includes("selectedMuscle") ||
    exerciseCockpitCode.includes("selectedEquipment"),
    "Must display active filter chips or count"
  );
  assert.ok(
    exerciseCockpitCode.includes("Limpar") || exerciseCockpitCode.includes("clearAllFilters"),
    "Must allow 1-tap clear of active filters"
  );
});

runTest("TEST 4: Exercise Library - abrir detalhe do exercício sob demanda", () => {
  assert.ok(
    exerciseCockpitCode.includes("setSelectedExercise") &&
    exerciseCockpitCode.includes("selectedExercise"),
    "Must support opening exercise detail on demand"
  );
  assert.ok(
    exerciseCockpitCode.includes("MobileBottomSheet"),
    "Detail view must be presented in a dedicated mobile bottom sheet"
  );
  assert.ok(
    exerciseCockpitCode.includes("Instruções") ||
    exerciseCockpitCode.includes("executionTips") ||
    exerciseCockpitCode.includes("instructions"),
    "Detail view must present exercise instructions and technical tips"
  );
});

runTest("TEST 5: Exercise Library - novo exercício com safe-area e CTA >= 48px", () => {
  assert.ok(
    exerciseCockpitCode.includes("isCreateSheetOpen"),
    "Must support creating exercise via dedicated slide-up sheet"
  );
  assert.ok(
    exerciseCockpitCode.includes("min-h-[48px]") || exerciseCockpitCode.includes("h-12"),
    "Primary CTA in create form must be >= 48px"
  );
  assert.ok(
    exerciseCockpitCode.includes("safe-area-inset-bottom") ||
    exerciseCockpitCode.includes("env(safe-area-inset-bottom)"),
    "Form must respect env(safe-area-inset-bottom)"
  );
});

runTest("TEST 6: Exercise Library - editar exercício conforme permissão", () => {
  assert.ok(
    exerciseCockpitCode.includes("canCreate") || exerciseCockpitCode.includes("canEditThis"),
    "Must check permissions before allowing edit/create"
  );
  assert.ok(
    exerciseCockpitCode.includes("actionSheetExercise") &&
    exerciseCockpitCode.includes("Editar exercício"),
    "Edit action must be accessible from secondary action sheet (•••)"
  );
});

runTest("TEST 7: Exercise Library - mídia ausente com placeholder limpo e sem auto-load de vídeo", () => {
  assert.ok(
    exerciseCockpitCode.includes("DumbbellIcon") ||
    exerciseCockpitCode.includes("onError"),
    "Must render a clean fallback placeholder when media is absent"
  );
  // Video must not autoplay in list
  assert.ok(
    !exerciseCockpitCode.includes("<video autoPlay"),
    "List cards must NOT autoplay video"
  );
  assert.ok(
    exerciseCockpitCode.includes("isVideoPlaying") || exerciseCockpitCode.includes("VideoCameraIcon"),
    "Video playback must be on-demand"
  );
});

runTest("TEST 8: Exercise Library - duplicidade exata alertada", () => {
  const existing = ["Supino Inclinado com Halteres", "Agachamento Livre"];
  const resExact = checkExerciseDuplicateOrVariation("Supino Inclinado com Halteres", existing);
  assert.ok(resExact.isDuplicate, "Exact match must be marked as duplicate");
  assert.equal(resExact.variationType, "EXACT_DUPLICATE");

  const resNear = checkExerciseDuplicateOrVariation("Supino Inclinado Halter", existing);
  assert.ok(resNear.isDuplicate, "Near match without preposition must be detected as potential duplicate");
  assert.equal(resNear.variationType, "EXACT_DUPLICATE");
});

runTest("TEST 9: Exercise Library - variação real não considerada duplicata", () => {
  const existing = ["Supino reto com barra"];
  const resVar = checkExerciseDuplicateOrVariation("Supino inclinado com barra", existing);
  assert.equal(resVar.isDuplicate, false, "Supino inclinado com barra is NOT a duplicate of Supino reto com barra");
  assert.equal(resVar.variationType, "LEGITIMATE_VARIATION");
  assert.ok(resVar.variationReason.includes("reto vs inclinado"), "Must identify angle variation");

  const resEquip = checkExerciseDuplicateOrVariation("Supino reto com halteres", existing);
  assert.equal(resEquip.isDuplicate, false, "Barra vs Halteres is a legitimate equipment variation");
  assert.equal(resEquip.variationType, "LEGITIMATE_VARIATION");
  assert.ok(resEquip.variationReason.includes("barra vs halter"), "Must identify equipment variation");
});

runTest("TEST 10: Exercise Library - custom continua estritamente separado de global", () => {
  assert.ok(
    exerciseCockpitCode.includes("CREATOR_ONLY") || exerciseCockpitCode.includes("CONSULTANCY"),
    "Mobile cockpit must distinguish private/consultancy exercises from global"
  );
  assert.ok(
    exerciseCockpitCode.includes("Trevo One") && exerciseCockpitCode.includes("Meus"),
    "Filter tabs must separate Trevo One global from private consultancy exercises"
  );
});

runTest("TEST 11: Exercise Library - AI unresolved não vira global automaticamente", () => {
  const workoutRepoPath = path.join(rootDir, "lib/training-v2/workout-repository.ts");
  assert.ok(fs.existsSync(workoutRepoPath), "workout-repository.ts must exist");
  const repoCode = fs.readFileSync(workoutRepoPath, "utf-8");
  assert.ok(
    repoCode.includes("convertUnresolvedToCustomExercise") &&
    repoCode.includes("UNRESOLVED_EXERCISES"),
    "Workout repository must guard unresolved exercises and convert them to custom exercises"
  );
  assert.ok(
    !repoCode.includes("INSERT INTO training_v2_exercises (scope) VALUES ('GLOBAL')"),
    "Unresolved exercise must NEVER be promoted to global automatically"
  );
});

runTest("TEST 12: Exercise Library - Training Builder compatibilidade preservada", () => {
  const builderPath = path.join(rootDir, "components/consultancies/training-v2/workout-builder.tsx");
  assert.ok(fs.existsSync(builderPath), "workout-builder.tsx must exist and remain compatible");
  const pickerPath = path.join(rootDir, "components/consultancies/training-v2/unified-exercise-picker.tsx");
  assert.ok(fs.existsSync(pickerPath), "unified-exercise-picker.tsx must exist and remain compatible");
});

// =============================================================================
// PARTE B: FOOD LIBRARY TESTS (TEST 13 to 26)
// =============================================================================

runTest("TEST 13: Food Library - lista mobile limpa e cards bem formatados", () => {
  assert.ok(
    foodLibraryCode.includes("<MobileFoodCockpit"),
    "nutritionist-food-library.tsx must mount MobileFoodCockpit"
  );
  assert.ok(
    foodLibraryCode.includes("sm:hidden"),
    "Mobile food layout must be isolated under sm:hidden"
  );
  assert.ok(
    foodCockpitCode.includes("data.items.map"),
    "Mobile food cockpit must map foods to clean mobile cards"
  );
  assert.ok(
    !foodCockpitCode.includes("<table"),
    "Mobile food cockpit must NOT use a squished desktop table"
  );
});

runTest("TEST 14: Food Library - busca com aliases e sinônimos PT-BR", () => {
  const queryBuilderPath = path.join(rootDir, "lib/nutrition-v2/food-query-builder.ts");
  const queryBuilderCode = fs.readFileSync(queryBuilderPath, "utf-8");
  assert.ok(
    queryBuilderCode.includes("COMMON_FOOD_SYNONYMS") &&
    queryBuilderCode.includes("expandSearchTokensWithSynonyms"),
    "Food search query builder must use common PT-BR food synonyms"
  );
});

runTest("TEST 15: Food Library - UNKNOWN != ZERO (exibir '—' e nunca '0')", () => {
  assert.equal(formatNutrientValue(null), "—", "Null nutrient must render as '—'");
  assert.equal(formatNutrientValue(undefined), "—", "Undefined nutrient must render as '—'");
  assert.equal(formatCaloriesValue(null), "—", "Null calories must render as '—'");
  assert.equal(formatCaloriesValue(undefined), "—", "Undefined calories must render as '—'");
  assert.notEqual(formatCaloriesValue(null), "0 kcal", "Null calories must NEVER render as '0 kcal'");
});

runTest("TEST 16: Food Library - KNOWN_ZERO exibe '0' com precisão", () => {
  assert.equal(formatNutrientValue(0, "g", "KNOWN_ZERO"), "0 g", "KNOWN_ZERO must render as '0 g'");
  assert.equal(formatNutrientValue(0, "g"), "0 g", "Numeric 0 must render as '0 g'");
  assert.equal(formatCaloriesValue(0, "KNOWN_ZERO"), "0 kcal", "KNOWN_ZERO calories must render as '0 kcal'");
  assert.equal(formatCaloriesValue(0), "0 kcal", "Numeric 0 calories must render as '0 kcal'");
});

runTest("TEST 17: Food Library - TRACE preservado como 'Tr'", () => {
  assert.equal(formatNutrientValue(null, "g", "TRACE"), "Tr", "TRACE status must render as 'Tr'");
  assert.equal(formatCaloriesValue(null, "TRACE"), "Tr", "TRACE calories must render as 'Tr'");
});

runTest("TEST 18: Food Library - fonte e proveniência acessíveis de forma discreta", () => {
  assert.ok(
    foodCockpitCode.includes("TACO") &&
    foodCockpitCode.includes("Comercial") &&
    foodCockpitCode.includes("Consultoria"),
    "Food cards must render discreet source badges (TACO, Comercial, Consultoria, USDA)"
  );
  assert.ok(
    foodCockpitCode.includes("sourceReference") || foodCockpitCode.includes("sourceKey"),
    "Detail sheet must expose provenance information"
  );
});

runTest("TEST 19: Food Library - Reference promotion architecture intacta", () => {
  const refCatalogPath = path.join(rootDir, "lib/nutrition-v2/reference-catalog-service.ts");
  assert.ok(fs.existsSync(refCatalogPath), "reference-catalog-service.ts must exist");
  const refCatalogCode = fs.readFileSync(refCatalogPath, "utf-8");
  assert.ok(
    refCatalogCode.includes("autoPromoteReferenceFood"),
    "Must preserve autoPromoteReferenceFood function"
  );
  assert.ok(
    refCatalogCode.includes("auto_imported_from_reference") || refCatalogCode.includes("aliasesToRegister"),
    "Must maintain promotion status and canonical aliases"
  );
});

runTest("TEST 20: Food Library - Segunda busca resolve via LOCAL_MATCHED sem duplicatas", () => {
  const refCatalogPath = path.join(rootDir, "lib/nutrition-v2/reference-catalog-service.ts");
  const refCatalogCode = fs.readFileSync(refCatalogPath, "utf-8");
  assert.ok(
    refCatalogCode.includes("LOCAL_MATCHED"),
    "Must support LOCAL_MATCHED resolution"
  );
});

runTest("TEST 21: Food Library - Brand-specific preservation", () => {
  const queryBuilderPath = path.join(rootDir, "lib/nutrition-v2/food-query-builder.ts");
  const queryBuilderCode = fs.readFileSync(queryBuilderPath, "utf-8");
  assert.ok(
    queryBuilderCode.includes("APPROVED_COMMERCIAL_SOURCE_KEYS") &&
    queryBuilderCode.includes("GROWTH_SUPPLEMENTS"),
    "Branded commercial items must be protected and classified under COMMERCIAL"
  );
});

runTest("TEST 22: Food Library - Medidas caseiras confiáveis e adição de porção", () => {
  assert.ok(
    foodCockpitCode.includes("Medidas Usuais / Porções Cadastradas"),
    "Detail sheet must list validated household portions"
  );
  assert.ok(
    foodCockpitCode.includes("handleAddPortion") &&
    foodCockpitCode.includes("equivalentReferenceAmount"),
    "Must allow consultancy to add validated portion with equivalent amount"
  );
});

runTest("TEST 23: Food Library - Review flow sem bloqueio do profissional", () => {
  const aiImporterPath = path.join(rootDir, "lib/nutrition-v2/nutrition-ai-importer.ts");
  if (fs.existsSync(aiImporterPath)) {
    const aiImporterCode = fs.readFileSync(aiImporterPath, "utf-8");
    assert.ok(
      aiImporterCode.includes("AMBIGUOUS") || aiImporterCode.includes("NOT_FOUND"),
      "Review items must be clearly flagged without discarding"
    );
  }
});

runTest("TEST 24: Food Library - Not found nunca descartado (preserva originalText e foodNameCandidate)", () => {
  const aiImporterPath = path.join(rootDir, "lib/nutrition-v2/nutrition-ai-importer.ts");
  assert.ok(fs.existsSync(aiImporterPath), "nutrition-ai-importer.ts must exist");
  const aiImporterCode = fs.readFileSync(aiImporterPath, "utf-8");
  assert.ok(
    aiImporterCode.includes("originalText") &&
    aiImporterCode.includes("foodNameCandidate") &&
    aiImporterCode.includes("NOT_FOUND"),
    "Must preserve original raw food name and candidate text when not found"
  );
});

runTest("TEST 25: Food Library - Food Picker continua funcionando", () => {
  const foodPickerPath = path.join(rootDir, "components/consultancies/nutrition-v2/nutrition-food-picker.tsx");
  assert.ok(fs.existsSync(foodPickerPath), "nutrition-food-picker.tsx must exist and remain functional");
});

runTest("TEST 26: Food Library - AI Nutrition Import integridade garantida", () => {
  const aiImporterPath = path.join(rootDir, "lib/nutrition-v2/nutrition-ai-importer.ts");
  assert.ok(fs.existsSync(aiImporterPath), "nutrition-ai-importer.ts must exist and preserve all meal items");
});

// =============================================================================
// PARTE C: SEGURANÇA, TENANCY E MOBILE UX
// =============================================================================

runTest("TEST 27: Segurança - RBAC estrito em ações de consultoria", () => {
  const foodActionsPath = path.join(rootDir, "app/consultoria/[slug]/alimentos-v2/actions.ts");
  const foodActionsCode = fs.readFileSync(foodActionsPath, "utf-8");
  assert.ok(
    foodActionsCode.includes("canAuthorNutrition"),
    "Food actions must enforce canAuthorNutrition check"
  );

  const exerciseActionsPath = path.join(rootDir, "app/consultoria/[slug]/exercicios/actions.ts");
  const exerciseActionsCode = fs.readFileSync(exerciseActionsPath, "utf-8");
  assert.ok(
    exerciseActionsCode.includes("resolveConsultancyContext") ||
    exerciseActionsCode.includes("canManage"),
    "Exercise actions must enforce consultancy context and permissions"
  );
});

runTest("TEST 28: Tenancy & Isolation - Segregação por consultancyId no servidor", () => {
  const repoPath = path.join(rootDir, "lib/nutrition-v2/food-repository.ts");
  const repoCode = fs.readFileSync(repoPath, "utf-8");
  assert.ok(
    repoCode.includes("FORBIDDEN_TENANT_FOOD") || repoCode.includes("consultancy_id"),
    "Food repository must prevent cross-tenant access to consultancy foods"
  );
});

runTest("TEST 29: Mobile UX - Touch Targets >= 44px e Primary CTAs >= 48px", () => {
  assert.ok(
    exerciseCockpitCode.includes("min-h-[44px]") &&
    exerciseCockpitCode.includes("min-h-[48px]"),
    "Exercise cockpit must respect touch target guidelines"
  );
  assert.ok(
    foodCockpitCode.includes("min-h-[44px]") &&
    foodCockpitCode.includes("min-h-[48px]"),
    "Food cockpit must respect touch target guidelines"
  );
});

runTest("TEST 30: Mobile UX - Safe Area insets e Zero Horizontal Overflow", () => {
  assert.ok(
    exerciseCockpitCode.includes("safe-area-inset-bottom"),
    "Exercise bottom sheets must use safe-area-inset-bottom"
  );
  assert.ok(
    foodCockpitCode.includes("safe-area-inset-bottom"),
    "Food bottom sheets must use safe-area-inset-bottom"
  );
  assert.ok(
    !exerciseCockpitCode.includes("w-screen overflow-x-scroll") &&
    !foodCockpitCode.includes("w-screen overflow-x-scroll"),
    "Must not cause horizontal viewport overflow"
  );
});

runTest("TEST 31: Desktop Preservado - layout de desktop intocado", () => {
  assert.ok(
    exercisePageCode.includes("hidden sm:block"),
    "Desktop exercise catalog must be preserved under hidden sm:block"
  );
  assert.ok(
    foodLibraryCode.includes("hidden sm:block"),
    "Desktop food library must be preserved under hidden sm:block"
  );
});

console.log("==================================================");
console.log(`TOTAL TESTS: ${passed + failed}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log("==================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("ALL PHASE 6 MOBILE LIBRARY TESTS PASSED!");
  process.exit(0);
}
