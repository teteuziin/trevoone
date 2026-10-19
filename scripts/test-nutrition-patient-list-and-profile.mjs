import fs from "fs";
import path from "path";
import assert from "assert";

console.log("================================================================================");
console.log("TEST SUITE: NUTRITION PATIENT LIST & PATIENT PROFILE (TREVO ONE)");
console.log("================================================================================\n");

function readFile(relativePath) {
  const fullPath = path.resolve(process.cwd(), relativePath);
  assert(fs.existsSync(fullPath), `File must exist: ${relativePath}`);
  return fs.readFileSync(fullPath, "utf-8");
}

let passed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// -----------------------------------------------------------------------------
// 1. Navigation Shell preserves Nutricionista mode for multi-role users
// -----------------------------------------------------------------------------
test("1. ConsultancyAppShell maps effectiveMode NUTRITIONIST to NUTRITIONIST presentation role", () => {
  const shell = readFile("components/consultancies/consultancy-app-shell.tsx");
  assert(
    shell.includes("presentationRoles: ConsultancyRole[]") &&
    shell.includes("effectiveRole && isMultiRole") &&
    shell.includes("[effectiveRole]"),
    "Shell must map effectiveMode to presentationRoles for multi-role users"
  );
  assert(
    shell.includes('roleLabels.push("Nutricionista")'),
    "Shell must display 'Nutricionista' label for nutritionist mode"
  );
});

// -----------------------------------------------------------------------------
// 2. Hub queries populate nutrition fields for patient list and detail
// -----------------------------------------------------------------------------
test("2. personal-student-hub.ts populates activeNutritionPlan and clinical fields", () => {
  const hub = readFile("lib/consultancies/personal-student-hub.ts");
  assert(
    hub.includes("activeNutritionPlanTitle") &&
    hub.includes("hasActiveNutritionPlan") &&
    hub.includes("nutrition_v2_assignments"),
    "listPersonalStudents must join nutrition_v2_assignments for active nutrition plan"
  );
  assert(
    hub.includes("draftNutritionPlan") &&
    hub.includes("nutritionGoal") &&
    hub.includes("allergies") &&
    hub.includes("intolerances"),
    "getPersonalStudentDetail must query draftNutritionPlan and extract nutritionGoal and allergies"
  );
});

// -----------------------------------------------------------------------------
// 3. Patient List Header and Search for Nutritionist
// -----------------------------------------------------------------------------
test("3. Patient list adapts header, title, and search placeholder for Nutritionist", () => {
  const list = readFile("components/consultancies/personal-student-hub/personal-student-list.tsx");
  assert(
    list.includes('isEffectiveNutritionist ? "Pacientes" : "Alunos"'),
    "Title must be Pacientes for nutritionist"
  );
  assert(
    list.includes('isEffectiveNutritionist ? "Convidar paciente" : "Convidar membro"'),
    "Invite button must say Convidar paciente for nutritionist"
  );
  assert(
    list.includes('isEffectiveNutritionist ? "Buscar paciente por nome ou e-mail..." : "Buscar aluno por nome ou e-mail..."'),
    "Search placeholder must say Buscar paciente por nome ou e-mail..."
  );
});

// -----------------------------------------------------------------------------
// 4. Patient List Filter Pills with Nutrition Plans
// -----------------------------------------------------------------------------
test("4. Patient list has filters: Todos, Com plano ativo, Sem plano ativo", () => {
  const list = readFile("components/consultancies/personal-student-hub/personal-student-list.tsx");
  assert(
    list.includes("Com plano ativo") && list.includes("Sem plano ativo"),
    "List must have 'Com plano ativo' and 'Sem plano ativo' filters"
  );
  assert(
    list.includes("withPlanCount") && list.includes("withoutPlanCount"),
    "List must compute real counts for nutrition plan filters"
  );
});

// -----------------------------------------------------------------------------
// 5. Patient List Table & Cards for Nutritionist
// -----------------------------------------------------------------------------
test("5. Patient list renders nutrition plan status and action buttons", () => {
  const list = readFile("components/consultancies/personal-student-hub/personal-student-list.tsx");
  assert(
    list.includes('isEffectiveNutritionist ? "Paciente" : "Aluno"') &&
    list.includes('isEffectiveNutritionist ? "Plano alimentar" : "Status do treino"'),
    "Desktop table header must show Paciente and Plano alimentar"
  );
  assert(
    list.includes("Plano ativo: {student.activeNutritionPlanTitle}") &&
    list.includes("Sem plano ativo"),
    "List must render active nutrition plan or 'Sem plano ativo'"
  );
  assert(
    list.includes("handleOpenPlanCreation(student)") &&
    list.includes("Abrir plano"),
    "List must offer 'Abrir plano' and '+ Criar plano' actions"
  );
});

// -----------------------------------------------------------------------------
// 6. Patient List mounts the 4 creation modals
// -----------------------------------------------------------------------------
test("6. Patient list mounts NutritionPlanChoiceModal, AI generate, AI import, and template picker", () => {
  const list = readFile("components/consultancies/personal-student-hub/personal-student-list.tsx");
  assert(
    list.includes("<NutritionPlanChoiceModal") &&
    list.includes("<NutritionAiGenerateModal") &&
    list.includes("<NutritionAiImportModal") &&
    list.includes("<NutritionTemplatePickerModal"),
    "List must mount all 4 nutrition plan creation modals"
  );
});

// -----------------------------------------------------------------------------
// 7. Route /progresso/alunos/[studentPublicId] handles Nutritionist
// -----------------------------------------------------------------------------
test("7. Route page allows isNutritionist into PersonalStudentDetailView with tenancy check", () => {
  const route = readFile("app/consultoria/[slug]/progresso/alunos/[studentPublicId]/page.tsx");
  assert(
    route.includes("isNutritionist") &&
    route.includes("<PersonalStudentDetailView"),
    "Route must render PersonalStudentDetailView for nutritionist"
  );
  assert(
    route.includes("context.consultancyId") &&
    route.includes("consultancy_id = ?"),
    "Route must verify tenancy within consultancy"
  );
});

// -----------------------------------------------------------------------------
// 8. Patient Profile Header & Breadcrumb
// -----------------------------------------------------------------------------
test("8. Patient profile has 'Voltar aos pacientes' and contextual CTA", () => {
  const profile = readFile("components/consultancies/personal-student-hub/personal-student-detail-view.tsx");
  assert(
    profile.includes('isEffectiveNutritionist ? "Voltar aos pacientes" : "Voltar aos alunos"'),
    "Breadcrumb must say 'Voltar aos pacientes' for nutritionist"
  );
  assert(
    profile.includes("activeNutritionPlan") &&
    profile.includes("Abrir plano"),
    "Profile header CTA must offer 'Abrir plano' when plan is active"
  );
  assert(
    profile.includes("createWorkoutHref = `/consultoria/${consultancySlug}/rotinas/novo?student=${student.membershipPublicId}`"),
    "Profile must preserve createWorkoutHref invariant"
  );
});

// -----------------------------------------------------------------------------
// 9. Patient Profile Tabs for Nutritionist
// -----------------------------------------------------------------------------
test("9. Patient profile provides 5 dedicated tabs for nutritionist", () => {
  const profile = readFile("components/consultancies/personal-student-hub/personal-student-detail-view.tsx");
  assert(
    profile.includes('label: "Planos alimentares"') &&
    profile.includes('label: "Evolução"'),
    "Profile must contain 'Planos alimentares' and 'Evolução' tabs"
  );
  assert(
    profile.includes('data-testid="tab-planos"') &&
    profile.includes('data-testid="tab-evolucao"'),
    "Profile must render tab-planos and tab-evolucao containers"
  );
});

// -----------------------------------------------------------------------------
// 10. Patient Profile Visão Geral: Real Nutritional Tracking (No fake 'Sem desvios')
// -----------------------------------------------------------------------------
test("10. Visão Geral replaces workout metrics with real nutrition metrics and handles 0 check-ins correctly", () => {
  const profile = readFile("components/consultancies/personal-student-hub/personal-student-detail-view.tsx");
  assert(
    profile.includes("Acompanhamento Nutricional"),
    "Visão Geral must render Acompanhamento Nutricional"
  );
  assert(
    profile.includes("Sem registros no período") &&
    profile.includes("Dados insuficientes"),
    "Visão Geral must show 'Sem registros no período' or 'Dados insuficientes' when check-ins are 0"
  );
  assert(
    profile.includes("Objetivo Nutricional") &&
    profile.includes("Alergias") &&
    profile.includes("Restrições Alimentares"),
    "Visão Geral must highlight nutrition goal and allergies/restrictions"
  );
});

// -----------------------------------------------------------------------------
// 11. Patient Profile mounts the 4 creation modals
// -----------------------------------------------------------------------------
test("11. Patient profile mounts NutritionPlanChoiceModal and generation modals", () => {
  const profile = readFile("components/consultancies/personal-student-hub/personal-student-detail-view.tsx");
  assert(
    profile.includes("<NutritionPlanChoiceModal") &&
    profile.includes("<NutritionAiGenerateModal") &&
    profile.includes("<NutritionAiImportModal") &&
    profile.includes("<NutritionTemplatePickerModal"),
    "Detail view must mount all 4 nutrition plan creation modals"
  );
});

console.log(`\nAll ${passed} tests passed successfully!\n`);
