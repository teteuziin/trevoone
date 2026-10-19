import fs from "fs";
import path from "path";
import assert from "assert";

console.log("================================================================================");
console.log("TEST SUITE: NUTRITION NEW PLAN CONTEXT & MULTI-ROLE ISOLATION");
console.log("================================================================================\n");

function readFile(relPath) {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf8");
}

function test(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// -----------------------------------------------------------------------------
// 1. NutritionPlanChoiceModal: Header & Title
// -----------------------------------------------------------------------------
test("1. NutritionPlanChoiceModal has title 'Novo plano alimentar'", () => {
  const code = readFile("components/consultancies/nutrition-v2/nutrition-plan-choice-modal.tsx");
  assert(code.includes("Novo plano alimentar"), "Must contain title 'Novo plano alimentar'");
  assert(!code.includes("Nova ficha"), "Must NOT contain 'Nova ficha'");
});

// -----------------------------------------------------------------------------
// 2. NutritionPlanChoiceModal: 4 Exact Options Copy
// -----------------------------------------------------------------------------
test("2. NutritionPlanChoiceModal has the 4 exact mandated copies", () => {
  const code = readFile("components/consultancies/nutrition-v2/nutrition-plan-choice-modal.tsx");

  // Option 1
  assert(code.includes("Criar manualmente"), "Option 1 title must be 'Criar manualmente'");
  assert(
    code.includes("Escolha alimentos e monte as refeições.") ||
    code.includes("Monte as refeições, escolha os alimentos e defina as porções."),
    "Option 1 copy must match"
  );

  // Option 2
  assert(code.includes("Criar do zero com IA"), "Option 2 title must be 'Criar do zero com IA'");
  assert(
    code.includes("Descreva o plano que deseja criar.") ||
    code.includes("Descreva o plano alimentar que deseja montar."),
    "Option 2 copy must match"
  );

  // Option 3
  assert(code.includes("Importar com IA"), "Option 3 title must be 'Importar com IA'");
  assert(
    code.includes("Importe um plano para revisar e editar.") ||
    code.includes("Importe um plano alimentar para revisar e editar."),
    "Option 3 copy must match"
  );

  // Option 4
  assert(code.includes("Usar modelo"), "Option 4 title must be 'Usar modelo'");
  assert(
    code.includes("Escolha um modelo e personalize.") ||
    code.includes("Escolha um modelo de plano alimentar e personalize."),
    "Option 4 copy must match"
  );
});

// -----------------------------------------------------------------------------
// 3. NutritionPlanChoiceModal: No workout/training terms in options
// -----------------------------------------------------------------------------
test("3. NutritionPlanChoiceModal options do not leak workout terms", () => {
  const code = readFile("components/consultancies/nutrition-v2/nutrition-plan-choice-modal.tsx");
  assert(!code.includes("ficha"), "Must not leak 'ficha'");
  assert(!code.includes("bloco"), "Must not leak 'bloco'");
  assert(!code.includes("treino"), "Must not leak 'treino'");
  assert(!code.includes("exercício"), "Must not leak 'exercício'");
  assert(!code.includes("repetição"), "Must not leak 'repetição'");
  assert(!code.includes("série"), "Must not leak 'série'");
});

// -----------------------------------------------------------------------------
// 4. Flow 1: Manual nutrition creation route & persistence
// -----------------------------------------------------------------------------
test("4. Manual creation links to /planos-v2/novo and supports student/studentId", () => {
  const page = readFile("app/consultoria/[slug]/planos-v2/novo/page.tsx");
  assert(
    page.includes('searchParams.get("studentId") || searchParams.get("student")'),
    "Must read student query param flexibly"
  );
  assert(page.includes("createPlanAction"), "Must invoke createPlanAction");
  assert(page.includes("createPatientPlanFromScratchAction"), "Must invoke createPatientPlanFromScratchAction");
});

// -----------------------------------------------------------------------------
// 5. Flow 2: AI from scratch nutrition domain & persistence
// -----------------------------------------------------------------------------
test("5. AI generate modal uses nutrition domain and confirms to nutrition_v2_plans", () => {
  const code = readFile("components/consultancies/nutrition-v2/nutrition-ai-generate-modal.tsx");
  assert(code.includes("Objetivo nutricional"), "Must configure nutrition objective");
  assert(code.includes("Quantidade de refeições"), "Must configure meals count");
  assert(code.includes("Restrições alimentares"), "Must configure dietary restrictions");
  assert(code.includes("/api/consultancies/${consultancySlug}/ai/nutrition-import"), "Must call nutrition endpoint");
  assert(code.includes("/api/consultancies/${consultancySlug}/ai/nutrition-import/confirm"), "Must call confirm endpoint");
});

// -----------------------------------------------------------------------------
// 6. Flow 3: AI import modal uses nutrition parser & persistence
// -----------------------------------------------------------------------------
test("6. AI import modal accepts nutrition documents and saves to nutrition_v2_plans", () => {
  const code = readFile("components/consultancies/nutrition-v2/nutrition-ai-import-modal.tsx");
  assert(code.includes("ResolvedNutritionProposal"), "Must use ResolvedNutritionProposal");
  assert(code.includes("authoritativeNutrients"), "Must compute authoritative nutrition macros");
  assert(code.includes("/api/consultancies/${consultancySlug}/ai/nutrition-import/confirm"), "Must persist to nutrition_v2_plans");
});

// -----------------------------------------------------------------------------
// 7. Flow 4: Template picker lists and applies nutrition templates
// -----------------------------------------------------------------------------
test("7. Template picker lists nutrition templates and instantiates them", () => {
  const code = readFile("components/consultancies/nutrition-v2/nutrition-template-picker-modal.tsx");
  assert(code.includes("listTemplatesAction"), "Must call listTemplatesAction");
  assert(code.includes("createPlanFromTemplateAction"), "Must call createPlanFromTemplateAction");
});

// -----------------------------------------------------------------------------
// 8. Personal trainer area preserves workout flow intact
// -----------------------------------------------------------------------------
test("8. Personal trainer area preserves Nova ficha with workout options intact", () => {
  const header = readFile("components/dashboard/personal/sections/personal-overview-header.tsx");
  assert(header.includes("Nova ficha"), "Personal must keep 'Nova ficha'");
  assert(header.includes("Monte uma ficha em branco escolhendo blocos e exercícios."), "Personal must keep workout copy");
  assert(header.includes("Descreva o treino e deixe a IA estruturar a ficha completa."), "Personal must keep AI workout copy");
  assert(header.includes("Transforme um PDF, foto ou texto em ficha de treino."), "Personal must keep import workout copy");
  assert(header.includes("Aproveite um modelo já estruturado para personalizar rapidamente."), "Personal must keep template workout copy");
});

// -----------------------------------------------------------------------------
// 9. Multi-role & Mode Isolation in Consultancy Dashboard (page.tsx)
// -----------------------------------------------------------------------------
test("9. Consultancy page does not hijack Nutritionist mode with Personal/Admin combined view", () => {
  const page = readFile("app/consultoria/[slug]/page.tsx");
  assert(
    page.includes('isCombinedPersonalAdmin = isMultiRolePersonalAdmin && effectiveMode !== "NUTRITIONIST"'),
    "isCombinedPersonalAdmin must be excluded when effectiveMode === NUTRITIONIST"
  );
  assert(
    page.includes('effectiveMode === "NUTRITIONIST" && (!isConsultancyAdmin || isPersonal)'),
    "isPureNutritionist must be true when effectiveMode === NUTRITIONIST even if user holds personal/admin roles"
  );
});

// -----------------------------------------------------------------------------
// 10. Student detail view respects effectiveMode and activeTab for nutrition
// -----------------------------------------------------------------------------
test("10. Student detail view prioritizes nutrition CTA when in nutrition mode or tab", () => {
  const view = readFile("components/consultancies/personal-student-hub/personal-student-detail-view.tsx");
  assert(
    view.includes('isNutritionist = effectiveMode === "NUTRITIONIST" || (userRoles.includes("NUTRITIONIST") && effectiveMode !== "PERSONAL")'),
    "isNutritionist must respect effectiveMode"
  );
  assert(
    view.includes('isPersonal = effectiveMode === "PERSONAL" || (userRoles.includes("PERSONAL") && effectiveMode !== "NUTRITIONIST")'),
    "isPersonal must respect effectiveMode"
  );
  assert(
    view.includes('activeTab === "nutricao" || (effectiveMode === "NUTRITIONIST" && !activeWorkout) || (isNutritionist && !isPersonal)'),
    "Must trigger Criar plano alimentar when in nutrition context"
  );
});

console.log("\nAll 10 tests passed successfully!\n");
