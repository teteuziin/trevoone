import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

console.log("================================================================================");
console.log("TEST SUITE: NUTRITION FOUR IMAGE FIXES (MOBILE & DESKTOP AUDIT)");
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

// 1. Choice Modal: Spacing and Yellow Contours
runTest("1. NutritionPlanChoiceModal: correct spacing tokens and no yellow contours", () => {
  const modalPath = path.resolve("components/consultancies/nutrition-v2/nutrition-plan-choice-modal.tsx");
  const content = fs.readFileSync(modalPath, "utf-8");

  // Spacing checks
  assert.ok(content.includes("px-4 sm:px-6"), "Lateral padding 16px (px-4) equal on mobile, sm:px-6");
  assert.ok(content.includes("gap-2.5 sm:gap-4"), "Gap 10-12px (gap-2.5) on mobile");
  assert.ok(content.includes("p-3.5 sm:p-4"), "Card internal padding 12-16px (p-3.5)");
  assert.ok(content.includes("gap-3 group cursor-pointer"), "Gap 12px (gap-3) between icon and text");
  assert.ok(content.includes("pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:pb-6"), "Bottom spacing 16px + safe area");
  assert.ok(content.includes("max-h-[85dvh] sm:max-h-[90vh]"), "Flexible height max-h 85dvh / 90vh");
  assert.ok(content.includes("py-3.5 sm:py-4 border-b"), "Header compact separated from list");

  // No yellow contours
  assert.ok(!content.includes("yellow"), "No yellow class in choice modal");
  assert.ok(!content.includes("amber"), "No amber class in choice modal");
  assert.ok(content.includes("border border-emerald-500/20"), "Discrete emerald icon container border");
  assert.ok(content.includes("border border-purple-500/20"), "Discrete purple icon container border without yellow");
  assert.ok(content.includes("border border-blue-500/20"), "Discrete blue icon container border without yellow");

  // Keyboard accessibility
  assert.ok(content.includes("focus-visible:ring-2 focus-visible:ring-emerald-500"), "Keyboard accessible focus ring");

  // Supports isTemplatesTab context
  assert.ok(content.includes("isTemplatesTab"), "Modal accepts isTemplatesTab prop");
  assert.ok(content.includes("Novo modelo de plano"), "Title adaptively switches for templates");
});

// 2. Bottom Navigation: Labels Remain Visible on Scroll Up
runTest("2. Bottom Navigation: labels preserved with shrink-0, safe area, and active dot", () => {
  const navPath = path.resolve("components/consultancies/consultancy-navigation.tsx");
  const layoutPath = path.resolve("app/layout.tsx");
  const shellPath = path.resolve("components/consultancies/consultancy-app-shell.tsx");

  const navContent = fs.readFileSync(navPath, "utf-8");
  const layoutContent = fs.readFileSync(layoutPath, "utf-8");
  const shellContent = fs.readFileSync(shellPath, "utf-8");

  // Viewport fit cover in layout
  assert.ok(layoutContent.includes('viewportFit: "cover"'), "Layout includes viewportFit: 'cover' for edge-to-edge calculation");

  // Safe area bottom on nav
  assert.ok(navContent.includes("pb-[max(0.375rem,env(safe-area-inset-bottom,0px))]"), "Bottom nav guarantees minimum padding even if env is 0");
  assert.ok(navContent.includes("min-h-[58px] sm:min-h-[64px]"), "Bottom nav inner container uses min-h instead of rigid fixed height");

  // Label preservation
  assert.ok(navContent.includes("shrink-0 transition-colors duration-150"), "Text label span has shrink-0 to prevent collapsing");
  assert.ok(navContent.includes("shrink-0 transition-all duration-150"), "Icon container has shrink-0 to prevent collapsing");

  // Active state beyond color
  assert.ok(navContent.includes("font-bold text-[#065F46] dark:text-[#10B981]"), "Active state uses bold weight");
  assert.ok(navContent.includes("w-1 h-1 rounded-full mt-0.5 shrink-0"), "Active state renders tactile indicator dot");

  // Content bottom padding
  assert.ok(shellContent.includes("pb-[calc(6rem+env(safe-area-inset-bottom,0px))]"), "Shell provides at least 6rem bottom padding so cards are never covered");
});

// 3. Patients Header Reorganization
runTest("3. Patients: clean header without truncated subtitle, proper mobile wrapping", () => {
  const listPath = path.resolve("components/consultancies/personal-student-hub/personal-student-list.tsx");
  const pagePath = path.resolve("app/consultoria/[slug]/progresso/alunos/page.tsx");

  const listContent = fs.readFileSync(listPath, "utf-8");
  const pageContent = fs.readFileSync(pagePath, "utf-8");

  // Top line: Back arrow + Voltar
  assert.ok(listContent.includes("ArrowLeftIcon"), "Back arrow icon present");
  assert.ok(listContent.includes("Voltar"), "Voltar text present");
  assert.ok(listContent.includes("min-h-[44px] min-w-[44px]"), "Comfortable touch target >= 44x44px for back button");

  // Title + Count in clean flex column on mobile
  assert.ok(listContent.includes("flex-col sm:flex-row sm:items-baseline sm:gap-2.5"), "Title and count break into secondary line on mobile without ellipsis");
  assert.ok(listContent.includes("paciente cadastrado"), "Count label for patients");

  // Truncated subtitle removed
  assert.ok(!listContent.includes("Gestão e acompanhamento direto"), "Removed generic truncated subtitle");

  // Invite action on own row on mobile
  assert.ok(listContent.includes("w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#10B981]"), "Invite action takes full width on mobile without clipping");

  // No excessive page padding
  assert.ok(!pageContent.includes("py-6 sm:py-8"), "Removed duplicate excessive vertical padding on page wrapper");
});

// 4. Duplicate Import Button Removal & Template Import Persistence
runTest("4. Modelos & Planos: remove duplicate import shortcuts, keep inside Novo modelo/plano", () => {
  const creationSheetPath = path.resolve("components/consultancies/nutrition-v2/nutrition-plan-creation-sheet.tsx");
  const plansPagePath = path.resolve("app/consultoria/[slug]/planos-v2/page.tsx");
  const overviewHeaderPath = path.resolve("components/dashboard/nutrition/sections/nutrition-overview-header.tsx");
  const importerPath = path.resolve("lib/nutrition-v2/nutrition-ai-importer.ts");
  const modalPath = path.resolve("components/consultancies/nutrition-v2/nutrition-ai-import-modal.tsx");
  const routePath = path.resolve("app/api/consultancies/[slug]/ai/nutrition-import/confirm/route.ts");

  const creationContent = fs.readFileSync(creationSheetPath, "utf-8");
  const pageContent = fs.readFileSync(plansPagePath, "utf-8");
  const headerContent = fs.readFileSync(overviewHeaderPath, "utf-8");
  const importerContent = fs.readFileSync(importerPath, "utf-8");
  const modalContent = fs.readFileSync(modalPath, "utf-8");
  const routeContent = fs.readFileSync(routePath, "utf-8");

  // Standalone import button removed from creation sheet desktop row
  assert.ok(!creationContent.includes("<NutritionAiImportModal consultancySlug={consultancySlug} />"), "Removed standalone import button from creation sheet desktop row");

  // Overview header removed standalone import button
  assert.ok(!headerContent.includes("<span>Importar plano</span>"), "Removed standalone Importar plano button from nutrition overview header");

  // Empty state in planos-v2
  assert.ok(pageContent.includes("Nenhum modelo criado"), "Clean empty state title for models");
  assert.ok(pageContent.includes("Use Novo modelo para começar."), "Clean empty state description for models");
  assert.ok(pageContent.includes("Nenhum plano alimentar criado"), "Clean empty state title for plans");
  assert.ok(pageContent.includes("Use Novo plano para começar."), "Clean empty state description for plans");

  // Backend importer supports isTemplate
  assert.ok(importerContent.includes("isTemplate = false"), "confirmNutritionAiImport accepts isTemplate");
  assert.ok(importerContent.includes("is_template, status, created_at, updated_at"), "confirmNutritionAiImport inserts is_template into nutrition_v2_plans");
  assert.ok(importerContent.includes("isTemplate ? 1 : 0"), "Inserts 1 for template and 0 for normal plan");
  assert.ok(importerContent.includes("if (!isTemplate && targetPatientMembershipId)"), "Skips patient check when isTemplate is true");

  // API route passes isTemplate
  assert.ok(routeContent.includes("isTemplate: Boolean(isTemplate)"), "Confirm API route passes isTemplate to importer");

  // AI Import modal passes isTemplate and hides patient selector
  assert.ok(modalContent.includes("isTemplate = false"), "NutritionAiImportModal accepts isTemplate");
  assert.ok(modalContent.includes("!isTemplate && ("), "Hides patient selector when isTemplate is true");
  assert.ok(modalContent.includes("isTemplate: Boolean(isTemplate)"), "Modal sends isTemplate to confirm endpoint");
});

console.log("\n================================================================================");
console.log("ALL 4 IMAGE FIXES TEST SUITES PASSED SUCCESSFULLY!");
console.log("================================================================================\n");
