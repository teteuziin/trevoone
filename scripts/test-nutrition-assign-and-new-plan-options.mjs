import fs from "fs";
import path from "path";
import assert from "assert";

console.log("================================================================================");
console.log("TEST SUITE: ENVIAR PLANO PELA LISTA + QUATRO OPÇÕES EM NOVO PLANO");
console.log("================================================================================\n");

const ROOT = process.cwd();

function readFile(relPath) {
  const fullPath = path.join(ROOT, relPath);
  assert(fs.existsSync(fullPath), `File must exist: ${relPath}`);
  return fs.readFileSync(fullPath, "utf-8");
}

let passedTests = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// -----------------------------------------------------------------------------
// 1. DTO & Repository Contract
// -----------------------------------------------------------------------------
test("1. Plan repository extracts published version id and number", () => {
  const planRepo = readFile("lib/nutrition-v2/plan-repository.ts");

  assert(planRepo.includes("publishedVersionPublicId?: string | null;"), "PlanListItemDto must declare publishedVersionPublicId");
  assert(planRepo.includes("publishedVersionNumber?: number | null;"), "PlanListItemDto must declare publishedVersionNumber");

  assert(planRepo.includes("published_version_public_id"), "listPlansForConsultancy must query published_version_public_id");
  assert(planRepo.includes("published_version_number"), "listPlansForConsultancy must query published_version_number");
  assert(planRepo.includes("pv.status = 'PUBLISHED'"), "Query must filter by status = 'PUBLISHED'");
});

// -----------------------------------------------------------------------------
// 2. Page & Dashboard View Mapping
// -----------------------------------------------------------------------------
test("2. Page and Dashboard View pass published version through to table plans", () => {
  const pageTsx = readFile("app/consultoria/[slug]/page.tsx");
  assert(pageTsx.includes("publishedVersionPublicId: p.publishedVersionPublicId || null"), "page.tsx must pass publishedVersionPublicId");
  assert(pageTsx.includes("publishedVersionNumber: p.publishedVersionNumber"), "page.tsx must pass publishedVersionNumber");

  const dashboardView = readFile("components/dashboard/dashboard-nutritionist-view.tsx");
  assert(dashboardView.includes("publishedVersionPublicId?: string | null;"), "NutritionistPlanSummaryItem must include publishedVersionPublicId");
  assert(dashboardView.includes("publishedVersionPublicId: p.publishedVersionPublicId || null"), "tablePlans must map publishedVersionPublicId");
});

// -----------------------------------------------------------------------------
// 3. Nutrition Plans Table: "Enviar plano" + "Editar plano"
// -----------------------------------------------------------------------------
test("3. NutritionPlansTable displays 'Enviar plano' and 'Editar plano' on desktop & mobile", () => {
  const table = readFile("components/dashboard/nutrition/sections/nutrition-plans-table.tsx");

  assert(table.includes("publishedVersionPublicId?: string | null;"), "NutritionPlanRow must declare publishedVersionPublicId");
  assert(table.includes("handleOpenSendPlan"), "Table must declare handleOpenSendPlan");
  assert(table.includes("setDraftWarningPlan"), "Table must declare setDraftWarningPlan");
  assert(table.includes("setAssignPlan"), "Table must declare setAssignPlan");

  // Desktop action buttons
  assert(table.includes("Enviar plano"), "Table must render 'Enviar plano'");
  assert(table.includes("Editar plano"), "Table must render 'Editar plano'");
  assert(table.includes("e.stopPropagation()"), "Send button must stop event propagation to card");

  // Warning modal & Assign modal integrated
  assert(table.includes("<NutritionAssignModal"), "Table must render NutritionAssignModal");
  assert(table.includes("<NutritionDraftWarningModal"), "Table must render NutritionDraftWarningModal");
});

// -----------------------------------------------------------------------------
// 4. Draft Warning Modal
// -----------------------------------------------------------------------------
test("4. NutritionDraftWarningModal prevents silent sending of drafts and prompts review", () => {
  const warningModal = readFile("components/consultancies/nutrition-v2/nutrition-draft-warning-modal.tsx");

  assert(warningModal.includes("Plano em rascunho"), "Modal must have title 'Plano em rascunho'");
  assert(warningModal.includes("Este plano precisa ser revisado e publicado antes do envio"), "Modal must explain publication requirement");
  assert(warningModal.includes("Revisar plano"), "Modal must have CTA 'Revisar plano'");
  assert(warningModal.includes("Voltar"), "Modal must have secondary button 'Voltar'");
});

// -----------------------------------------------------------------------------
// 5. NutritionAssignModal: Header and published version clarity
// -----------------------------------------------------------------------------
test("5. NutritionAssignModal clearly identifies version and has dark mode styling", () => {
  const assignModal = readFile("components/consultancies/nutrition-v2/nutrition-assign-modal.tsx");

  assert(assignModal.includes("Enviar Plano Alimentar"), "Header must say 'Enviar Plano Alimentar'");
  assert(assignModal.includes("Versão {versionNumber} (Publicada)"), "Must clearly identify published version");
  assert(assignModal.includes("dark:bg-[#151619]"), "Must have dark mode background");
  assert(assignModal.includes("forceReplace"), "Must verify active assignment replacement");
  assert(assignModal.includes("Confirmar Envio"), "Submit button must confirm sending");
});

// -----------------------------------------------------------------------------
// 6. Header Fix: No more duplicate "+ +" and unified "Novo plano" button
// -----------------------------------------------------------------------------
test("6. NutritionOverviewHeader fixes duplicate '+' and opens choice modal", () => {
  const header = readFile("components/dashboard/nutrition/sections/nutrition-overview-header.tsx");

  // Check no "+ + Novo plano" in rendered text span
  assert(!header.includes("<span>+ Novo plano</span>"), "Must not have '<span>+ Novo plano</span>' duplicating the '+' icon");
  assert(header.includes("<span>Novo plano</span>"), "Button text must be 'Novo plano'");
  assert(header.includes("setIsChoiceModalOpen(true)"), "Button click must open choice modal");

  // All 4 modals rendered
  assert(header.includes("<NutritionPlanChoiceModal"), "Header must render NutritionPlanChoiceModal");
  assert(header.includes("<NutritionAiGenerateModal"), "Header must render NutritionAiGenerateModal");
  assert(header.includes("<NutritionAiImportModal"), "Header must render NutritionAiImportModal");
  assert(header.includes("<NutritionTemplatePickerModal"), "Header must render NutritionTemplatePickerModal");
});

// -----------------------------------------------------------------------------
// 7. NutritionPlanChoiceModal: 4 options with exact copy and responsive layout
// -----------------------------------------------------------------------------
test("7. NutritionPlanChoiceModal renders 4 clear options with responsive layout and exact copy", () => {
  const choiceModal = readFile("components/consultancies/nutrition-v2/nutrition-plan-choice-modal.tsx");

  assert(choiceModal.includes("Novo plano alimentar"), "Title must be 'Novo plano alimentar'");

  // Option 1
  assert(choiceModal.includes("Criar manualmente"), "Option 1 title must be 'Criar manualmente'");
  assert(
    choiceModal.includes("Escolha alimentos e monte as refeições.") ||
    choiceModal.includes("Monte as refeições, escolha os alimentos e defina as porções."),
    "Option 1 copy must match"
  );

  // Option 2
  assert(choiceModal.includes("Criar do zero com IA"), "Option 2 title must be 'Criar do zero com IA'");
  assert(
    choiceModal.includes("Descreva o plano que deseja criar.") ||
    choiceModal.includes("Descreva o plano alimentar que deseja montar."),
    "Option 2 copy must match"
  );

  // Option 3
  assert(choiceModal.includes("Importar com IA"), "Option 3 title must be 'Importar com IA'");
  assert(
    choiceModal.includes("Importe um plano para revisar e editar.") ||
    choiceModal.includes("Importe um plano alimentar para revisar e editar."),
    "Option 3 copy must match"
  );

  // Option 4
  assert(choiceModal.includes("Usar modelo"), "Option 4 title must be 'Usar modelo'");
  assert(
    choiceModal.includes("Escolha um modelo e personalize.") ||
    choiceModal.includes("Escolha um modelo de plano alimentar e personalize."),
    "Option 4 copy must match"
  );

  // Strict check: no workout terms in nutrition choice modal options
  assert(!choiceModal.includes("exercício"), "Must not include workout terms like exercício");
  assert(!choiceModal.includes("ficha"), "Must not include workout terms like ficha");
  assert(!choiceModal.includes("série"), "Must not include workout terms like série");

  // Responsive grid
  assert(choiceModal.includes("grid-cols-1 sm:grid-cols-2"), "Desktop must be 2 cols, mobile 1 col");
});

// -----------------------------------------------------------------------------
// 8. NutritionAiGenerateModal: Prompt description, context, proposal & draft
// -----------------------------------------------------------------------------
test("8. NutritionAiGenerateModal handles free text, context, preview and draft saving", () => {
  const aiGenerateModal = readFile("components/consultancies/nutrition-v2/nutrition-ai-generate-modal.tsx");

  assert(aiGenerateModal.includes("Descrição do plano alimentar em texto livre"), "Must have free text description label");
  assert(aiGenerateModal.includes("Objetivo nutricional"), "Must have objective select");
  assert(aiGenerateModal.includes("Quantidade de refeições"), "Must have meals count select");
  assert(aiGenerateModal.includes("Restrições alimentares"), "Must have restrictions input");
  assert(aiGenerateModal.includes("Paciente (opcional"), "Must have optional patient picker");

  // Endpoint calls
  assert(aiGenerateModal.includes("/api/consultancies/${consultancySlug}/ai/nutrition-import"), "Must call nutrition-import endpoint");
  assert(aiGenerateModal.includes("/api/consultancies/${consultancySlug}/ai/nutrition-import/confirm"), "Must call confirm endpoint");
  assert(aiGenerateModal.includes("Salvar como rascunho e abrir no editor"), "Must save as draft and open in editor");
});

// -----------------------------------------------------------------------------
// 9. NutritionTemplatePickerModal: List, search and apply
// -----------------------------------------------------------------------------
test("9. NutritionTemplatePickerModal allows searching and creates decoupled draft", () => {
  const templatePicker = readFile("components/consultancies/nutrition-v2/nutrition-template-picker-modal.tsx");

  assert(templatePicker.includes("listTemplatesAction"), "Must call listTemplatesAction");
  assert(templatePicker.includes("createPlanFromTemplateAction"), "Must call createPlanFromTemplateAction");
  assert(templatePicker.includes("Usar este modelo"), "Must have button 'Usar este modelo'");
  assert(templatePicker.includes("Pesquisar modelo por nome..."), "Must have search placeholder");
});

// -----------------------------------------------------------------------------
// 10. Unified Entry Points in NutritionPlanCreationSheet
// -----------------------------------------------------------------------------
test("10. NutritionPlanCreationSheet unifies entry points to 4-options modal", () => {
  const sheet = readFile("components/consultancies/nutrition-v2/nutrition-plan-creation-sheet.tsx");

  assert(sheet.includes("<NutritionPlanChoiceModal"), "Must render NutritionPlanChoiceModal");
  assert(sheet.includes("<NutritionAiGenerateModal"), "Must render NutritionAiGenerateModal");
  assert(sheet.includes("<NutritionAiImportModal"), "Must render NutritionAiImportModal");
  assert(sheet.includes("<NutritionTemplatePickerModal"), "Must render NutritionTemplatePickerModal");
});

console.log(`\nAll ${passedTests} tests passed successfully!\n`);
