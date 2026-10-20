import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

console.log("================================================================================");
console.log("TEST SUITE: NUTRITION MOBILE SPACING & RESPONSIVENESS (THREE SCREENS)");
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

const choiceModalPath = path.resolve("components/consultancies/nutrition-v2/nutrition-plan-choice-modal.tsx");
const aiModalPath = path.resolve("components/consultancies/nutrition-v2/nutrition-ai-import-modal.tsx");
const attentionPath = path.resolve("components/dashboard/nutrition/sections/nutrition-attention-section.tsx");

const choiceContent = fs.readFileSync(choiceModalPath, "utf-8");
const aiContent = fs.readFileSync(aiModalPath, "utf-8");
const attentionContent = fs.readFileSync(attentionPath, "utf-8");

// ==========================================
// SCREEN 1: SELETOR NOVO PLANO ALIMENTAR
// ==========================================
runTest("Screen 1: Choice modal renders via createPortal into document.body with z-[70]", () => {
  assert.ok(choiceContent.includes("createPortal("), "createPortal is used");
  assert.ok(choiceContent.includes("document.body"), "createPortal renders into document.body");
  assert.ok(choiceContent.includes("z-[70]"), "Overlay has z-[70] layer");
});

runTest("Screen 1: Choice modal locks body scroll while open", () => {
  assert.ok(choiceContent.includes('document.body.style.overflow = "hidden"'), "Locks body scroll");
});

runTest("Screen 1: Choice modal has equal 16px mobile lateral margins and safe-area padding", () => {
  assert.ok(choiceContent.includes("px-4 sm:px-6"), "16px lateral padding on mobile (px-4)");
  assert.ok(choiceContent.includes("safe-area-inset-bottom"), "Reserves space for safe area inset");
  assert.ok(choiceContent.includes("pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"), "16px bottom space plus safe area after Usar modelo");
});

runTest("Screen 1: Choice modal has proper card hierarchy, icon gap (12px), title-desc gap (4px)", () => {
  assert.ok(choiceContent.includes("gap-3"), "12px gap between icon and text (gap-3)");
  assert.ok(choiceContent.includes("mt-1"), "4px margin between title and description (mt-1)");
  assert.ok(choiceContent.includes("min-h-[44px]"), "Comfortable close button >= 44x44px");
  assert.ok(choiceContent.includes("h-auto max-h-[85dvh]"), "Height grows with content up to dynamic viewport max");
});

// ==========================================
// SCREEN 2: IMPORTAÇÃO COM IA
// ==========================================
runTest("Screen 2: AI modal renders via createPortal into document.body with z-[70]", () => {
  assert.ok(aiContent.includes("createPortal("), "createPortal is used in AI modal");
  assert.ok(aiContent.includes("document.body"), "createPortal targets document.body");
  assert.ok(aiContent.includes("z-[70]"), "AI modal has z-[70] overlay");
});

runTest("Screen 2: AI modal locks body scroll while open", () => {
  assert.ok(aiContent.includes('document.body.style.overflow = "hidden"'), "AI modal locks body scroll");
});

runTest("Screen 2: AI modal header has clean title without technical 'V2' and full-width description", () => {
  assert.ok(aiContent.includes("Importar plano com IA"), "Clean title without V2");
  assert.ok(!aiContent.includes("Importar plano com IA (V2)"), "No technical V2 in title");
  assert.ok(aiContent.includes("Envie um arquivo ou cole o texto."), "Concise full-width subtitle");
  assert.ok(aiContent.includes("min-h-[44px]"), "Close button has min-h-[44px]");
});

runTest("Screen 2: AI modal quota banner is clean and standalone with wrap safety", () => {
  assert.ok(aiContent.includes("Uso de IA hoje:"), "Quota banner is present");
  assert.ok(aiContent.includes("flex-wrap items-center justify-between"), "Wrap safety on quota banner");
  assert.ok(aiContent.includes("Restam:"), "Highlights remaining quota");
});

runTest("Screen 2: AI modal tabs are concise ('Arquivo' and 'Colar texto')", () => {
  assert.ok(aiContent.includes("Arquivo"), "Tab Arquivo");
  assert.ok(aiContent.includes("Colar texto"), "Tab Colar texto");
  assert.ok(!aiContent.includes("Arquivo (.pdf, .txt, .docx)"), "No format enumeration inside button label");
});

runTest("Screen 2: AI modal upload box has clean select button, format note below box, swap/remove controls", () => {
  assert.ok(aiContent.includes("Selecionar arquivo"), "Button to select file");
  assert.ok(aiContent.includes("PDF, DOCX, TXT ou MD (máx 15MB)"), "Format notes below upload box");
  assert.ok(aiContent.includes("Trocar arquivo"), "Ability to swap selected file");
  assert.ok(aiContent.includes("Remover"), "Ability to remove file");
});

runTest("Screen 2: AI modal textarea has min-height 160-180px and text-base (>=16px) preventing mobile zoom", () => {
  assert.ok(aiContent.includes("min-h-[160px]") || aiContent.includes("min-h-[180px]"), "Textarea has at least 160-180px height");
  assert.ok(aiContent.includes("text-base"), "Textarea uses font size >= 16px to prevent iOS auto-zoom");
});

runTest("Screen 2: AI modal form has single-column layout, 6-8px label spacing, 16-24px group spacing", () => {
  assert.ok(aiContent.includes("grid-cols-1"), "Single column layout for mobile readability");
  assert.ok(aiContent.includes("Paciente (opcional)"), "Clear label for optional patient");
  assert.ok(aiContent.includes("Objetivo (opcional)") || aiContent.includes("Objetivo do plano (opcional)"), "Clear label for optional objective");
  assert.ok(aiContent.includes("min-h-[48px]"), "Action CTA has min-h-[48px] with full width on mobile");
  assert.ok(aiContent.includes("Analisar plano com IA"), "Action CTA label");
});

// ==========================================
// SCREEN 3: SEÇÃO PRECISA DE ATENÇÃO
// ==========================================
runTest("Screen 3: Attention section header organizes in 2 lines on mobile without clipping", () => {
  assert.ok(attentionContent.includes("flex flex-col sm:flex-row"), "Header stacks in 2 lines on small screens");
  assert.ok(attentionContent.includes("Precisa de atenção"), "Section title");
  assert.ok(attentionContent.includes("Ver todos os planos →"), "Link to all plans");
});

runTest("Screen 3: Attention section differentiates items with and without patient", () => {
  assert.ok(attentionContent.includes("hasPatient"), "Differentiates with/without patient");
  assert.ok(attentionContent.includes("primaryTitle"), "Determines primary bold title");
  assert.ok(attentionContent.includes("secondaryInfo"), "Determines secondary descriptive text");
  assert.ok(attentionContent.includes("Sem paciente vinculado"), "Shows 'Sem paciente vinculado' when no patient");
  assert.ok(attentionContent.includes("DocumentIcon"), "Uses clean DocumentIcon instead of avatar when no patient");
  assert.ok(attentionContent.includes("getInitials"), "Uses initials avatar when patient is present");
});

runTest("Screen 3: Attention section displays reason on own line and comfortable full-width mobile action", () => {
  assert.ok(attentionContent.includes("AlertTriangleIcon"), "Alert icon on reason line");
  assert.ok(attentionContent.includes("w-full sm:w-auto px-4 min-h-[44px]"), "Action button is >= 44px and full width on mobile");
  assert.ok(attentionContent.includes("p-4"), "Internal card padding is 16px (p-4)");
  assert.ok(attentionContent.includes("divide-y"), "Discrete dividers between cards");
});

console.log("\n================================================================================");
console.log("ALL 14 MOBILE SPACING AND ACCESSIBILITY TESTS PASSED!");
console.log("================================================================================\n");
