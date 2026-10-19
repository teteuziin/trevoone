import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

console.log("================================================================================");
console.log("TEST SUITE: NUTRITION PLANS PAGE REDESIGN (TREINOS PATTERN AUDIT)");
console.log("================================================================================\n");

function runTest(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
  } catch (error) {
    console.error(`  [FAIL] ${name}`);
    console.error(error);
    process.exit(1);
  }
}

const pagePath = path.resolve("app/consultoria/[slug]/planos-v2/page.tsx");
const controlsPath = path.resolve("components/consultancies/nutrition-v2/nutrition-plan-list-controls.tsx");
const listViewPath = path.resolve("components/consultancies/nutrition-v2/nutrition-plan-list-view.tsx");
const creationSheetPath = path.resolve("components/consultancies/nutrition-v2/nutrition-plan-creation-sheet.tsx");
const repoPath = path.resolve("lib/nutrition-v2/plan-repository.ts");

const pageContent = fs.readFileSync(pagePath, "utf-8");
const controlsContent = fs.readFileSync(controlsPath, "utf-8");
const listViewContent = fs.readFileSync(listViewPath, "utf-8");
const creationSheetContent = fs.readFileSync(creationSheetPath, "utf-8");
const repoContent = fs.readFileSync(repoPath, "utf-8");

// 1. Black Executive Header
runTest("1. Compact black executive header with nutritional icon and true count", () => {
  assert.ok(pageContent.includes("bg-[#151619]"), "Black executive header container #151619");
  assert.ok(pageContent.includes("border-[#303238]"), "Header border #303238");
  assert.ok(pageContent.includes("MealPlanIcon"), "Nutritional icon");
  assert.ok(pageContent.includes("subtitleCountText"), "Calculated true count text");
  assert.ok(pageContent.includes("plano cadastrado"), "Count label for single plan");
  assert.ok(pageContent.includes("planos cadastrados"), "Count label for multiple plans");
  assert.ok(pageContent.includes("modelo cadastrado"), "Count label for single model");
  assert.ok(pageContent.includes("modelos cadastrados"), "Count label for multiple models");
});

// 2. Removal of Technical and Generic Clutter
runTest("2. Removed technical clutter ('NUTRIÇÃO CLÍNICA V2', 'Prescrição' badge, snapshot text)", () => {
  assert.ok(!pageContent.includes("NUTRIÇÃO CLÍNICA V2"), "Removed 'NUTRIÇÃO CLÍNICA V2'");
  assert.ok(!pageContent.includes("snapshots de versão"), "Removed snapshot technical jargon");
  assert.ok(!pageContent.includes("Prescrição"), "Removed decorative 'Prescrição' badge from header");
});

// 3. Local Navigation (Planos & Modelos only)
runTest("3. Clean local navigation: 'Planos' and 'Modelos', removed redundant 'Pacientes' and 'Biblioteca de Alimentos'", () => {
  assert.ok(pageContent.includes("Planos"), "Tab 'Planos'");
  assert.ok(pageContent.includes("Modelos"), "Tab 'Modelos'");
  assert.ok(!pageContent.includes("NutritionWorkspaceNav"), "Replaced redundant NutritionWorkspaceNav on plans page");
  assert.ok(pageContent.includes("bg-emerald-500 text-zinc-950 font-bold"), "Active tab highlight in emerald");
});

// 4. Search, Filter, Sort Controls
runTest("4. NutritionPlanListControls: search debounce, status pills, sorting, and counter", () => {
  assert.ok(pageContent.includes("NutritionPlanListControls"), "Integrates NutritionPlanListControls");
  assert.ok(controlsContent.includes("Buscar plano ou paciente..."), "Search placeholder for plans");
  assert.ok(controlsContent.includes("Buscar por nome do modelo..."), "Search placeholder for models");
  assert.ok(controlsContent.includes("Com rascunho"), "Filter 'Com rascunho'");
  assert.ok(controlsContent.includes("Publicados"), "Filter 'Publicados'");
  assert.ok(controlsContent.includes("Arquivados"), "Filter 'Arquivados'");
  assert.ok(controlsContent.includes("Atualizados recentemente"), "Sort 'Atualizados recentemente'");
  assert.ok(controlsContent.includes("Atualizados há mais tempo"), "Sort 'Atualizados há mais tempo'");
  assert.ok(controlsContent.includes("Nome A-Z"), "Sort 'Nome A-Z'");
  assert.ok(controlsContent.includes("totalResults"), "Displays total results count");
});

// 5. Desktop Table (6 columns)
runTest("5. Desktop Table renders 6 columns without sports data", () => {
  assert.ok(listViewContent.includes("Plano alimentar"), "Col 1: Plano alimentar");
  assert.ok(listViewContent.includes("Paciente / Vínculo"), "Col 2: Paciente / Vínculo");
  assert.ok(listViewContent.includes("Situação & Versão"), "Col 3: Situação & Versão");
  assert.ok(listViewContent.includes("Refeições"), "Col 4: Refeições");
  assert.ok(listViewContent.includes("Atualização"), "Col 5: Atualização");
  assert.ok(listViewContent.includes("Ações"), "Col 6: Ações");
  assert.ok(!listViewContent.includes("blocos"), "No sports/training blocks in nutrition table");
  assert.ok(!listViewContent.includes("duração"), "No sports/training duration in nutrition table");
});

// 6. Simultaneous Coexistence of Published and Draft Versions
runTest("6. Displays published and draft versions distinctly when coexisting", () => {
  assert.ok(listViewContent.includes("Publicado V"), "Badge for published version");
  assert.ok(listViewContent.includes("Rascunho V"), "Badge for draft version");
  assert.ok(repoContent.includes("published_version_number"), "Repository queries published_version_number");
  assert.ok(repoContent.includes("draft_version_number"), "Repository queries draft_version_number");
});

// 7. Actions: 'Abrir plano' and 'Enviar plano'
runTest("7. Desktop and mobile provide 'Abrir plano' and 'Enviar plano' actions", () => {
  assert.ok(listViewContent.includes("Abrir plano"), "Primary action to open plan");
  assert.ok(listViewContent.includes("Enviar plano") || listViewContent.includes("Enviar"), "Action to send plan");
  assert.ok(listViewContent.includes("NutritionAssignModal"), "Integrates assign modal");
  assert.ok(listViewContent.includes("NutritionDraftWarningModal"), "Integrates draft warning modal for unpublished plans");
  assert.ok(listViewContent.includes("NutritionPlanCardActions"), "Integrates actions dropdown menu");
});

// 8. Mobile List (Compact Single-Surface Cards)
runTest("8. Mobile list uses compact single-surface cards with independent actions", () => {
  assert.ok(listViewContent.includes("sm:hidden"), "Mobile list section");
  assert.ok(listViewContent.includes("e.stopPropagation()"), "Stops propagation on Enviar plano and menu button");
  assert.ok(listViewContent.includes("handleTouchStart"), "Includes touch scroll protection");
  assert.ok(pageContent.includes("isFloating"), "Includes floating action button on smartphone");
});

// 9. Wallpaper and Shell Compatibility
runTest("9. Integrates ConsultancyAppShell with dark-overview and approved wallpaper", () => {
  assert.ok(pageContent.includes('themeVariant="dark-overview"'), "Shell uses dark-overview theme");
  assert.ok(pageContent.includes("showDashboardWallpaper={true}"), "Wallpaper mechanism active");
  assert.ok(pageContent.includes("maxWidth=\"default\""), "Constrained max width");
});

// 10. Repository Query Parameters
runTest("10. Repository supports isTemplate, query, status, and sort filters", () => {
  assert.ok(repoContent.includes("isTemplate?: boolean"), "Supports isTemplate option");
  assert.ok(repoContent.includes("pv_s.status = 'DRAFT'"), "Filters draft status");
  assert.ok(repoContent.includes("pv_s.status = 'PUBLISHED'"), "Filters published status");
  assert.ok(repoContent.includes("p.status = 'ARCHIVED'"), "Filters archived status");
  assert.ok(repoContent.includes("u_q.full_name LIKE ?"), "Searches by assigned student name");
});

console.log("\n================================================================================");
console.log("ALL 10 NUTRITION PLANS PAGE REDESIGN TESTS PASSED!");
console.log("================================================================================\n");
