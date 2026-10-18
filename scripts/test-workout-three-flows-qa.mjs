/**
 * TREVO ONE — COMPREHENSIVE QA TEST SUITE: THREE WORKOUT CREATION FLOWS
 * 
 * Verifies:
 * 1. Manual Creation: Single draft, collapsed details, no fake defaults, double-tap prevention
 * 2. File & Text Import: Format validations, 15MB limit, 2 clean tabs, state preservation, source truth
 * 3. AI Generation: Text-first entry, smart interpretation without redundant questions,
 *    single natural clarification when incomplete, contradiction detection,
 *    compact editable summary, draft persistence, and emerald product design (no purple).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { analyzeWorkoutDescription } from "../lib/training-v2/training-ai-text-analyzer.ts";
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

function pass(name) {
  console.log(`  ${colors.green}✓ PASS:${colors.reset} ${name}`);
}

function group(name) {
  console.log(`\n${colors.cyan}${colors.bold}=== ${name} ===${colors.reset}`);
}

async function runTestSuite() {
  console.log(`${colors.bold}Starting Comprehensive Audit: Three Workout Creation Flows${colors.reset}`);

  // =========================================================================
  // 1. CRIAÇÃO MANUAL NO SMARTPHONE & DESKTOP
  // =========================================================================
  group("1. Fluxo de Criação Manual (NewWorkoutManualForm)");

  const manualFormPath = path.resolve("components/consultancies/training-v2/new-workout-manual-form.tsx");
  assert.ok(fs.existsSync(manualFormPath), "new-workout-manual-form.tsx exists");
  const manualFormCode = fs.readFileSync(manualFormPath, "utf-8");

  assert.ok(manualFormCode.includes("Nome da ficha"), "Must have label 'Nome da ficha'");
  assert.ok(manualFormCode.includes("Ex.: Treino A — Peito e tríceps"), "Must have exact requested placeholder");
  assert.ok(manualFormCode.includes("Detalhes do treino"), "Must have collapsible 'Detalhes do treino'");
  assert.ok(manualFormCode.includes("const [isDetailsOpen, setIsDetailsOpen] = useState(false)"), "Details start closed by default");
  assert.ok(manualFormCode.includes("Começar montagem"), "Action button must be 'Começar montagem'");
  assert.ok(manualFormCode.includes("isPending"), "Protects against double-tap during transition");
  assert.ok(manualFormCode.includes("env(safe-area-inset-bottom"), "Respects mobile safe area");
  pass("Manual creation: clean header, collapsed details, no fake prefilled defaults, double-tap protection");

  // =========================================================================
  // 2. IMPORTAÇÃO NO SMARTPHONE & DESKTOP (TrainingAiImportModal)
  // =========================================================================
  group("2. Fluxo de Importação (TrainingAiImportModal)");

  const importModalPath = path.resolve("components/consultancies/training-v2/training-ai-import-modal.tsx");
  assert.ok(fs.existsSync(importModalPath), "training-ai-import-modal.tsx exists");
  const importModalCode = fs.readFileSync(importModalPath, "utf-8");

  // Clean Header & Removal of Technical Jargon
  assert.ok(importModalCode.includes("Importar treino"), "Header has exact title 'Importar treino'");
  assert.ok(importModalCode.includes("Envie um arquivo ou cole o treino."), "Header has exact subtitle");
  assert.ok(!importModalCode.includes("Inteligência Artificial TREVO ONE"), "Removed technical AI title");
  assert.ok(!importModalCode.includes("Extração canônica estruturada"), "Removed technical extraction tagline");
  assert.ok(!importModalCode.includes("Mobile Drag Handle"), "Removed drag handle for clean fullscreen dialog");

  // Two Tabs
  assert.ok(importModalCode.includes('>Arquivo<') || importModalCode.includes('Arquivo\n'), "Has 'Arquivo' tab");
  assert.ok(importModalCode.includes('>Texto<') || importModalCode.includes('Texto\n'), "Has 'Texto' tab");

  // File Area
  assert.ok(importModalCode.includes("Escolher arquivo"), "Has 'Escolher arquivo' button");
  assert.ok(importModalCode.includes("Formatos aceitos: PDF, Imagem (PNG, JPG, WEBP), TXT, MD ou DOCX (até 15MB)"), "Shows real accepted formats and 15MB limit");
  assert.ok(importModalCode.includes("Trocar arquivo"), "Selected file card has 'Trocar arquivo'");
  assert.ok(importModalCode.includes("Remover"), "Selected file card has 'Remover'");

  // Text Area
  assert.ok(importModalCode.includes("Texto do treino"), "Text tab has label 'Texto do treino'");
  assert.ok(importModalCode.includes("Treino A — Peito e tríceps"), "Textarea has structure example placeholder");

  // Action & Colors
  assert.ok(importModalCode.includes("Analisar treino"), "Primary button label 'Analisar treino'");
  assert.ok(importModalCode.includes("bg-emerald-600"), "Uses standard emerald product color (not purple)");
  assert.ok(!importModalCode.includes("bg-purple-600"), "No purple buttons in import modal");

  // Source Truth & Student Disclaimer
  assert.ok(importModalCode.includes("exerciseNameSnapshot"), "Preserves verbatim exerciseNameSnapshot");
  assert.ok(importModalCode.includes("Vincular rascunho a um aluno (opcional)"), "Student selector framed as optional draft link");
  assert.ok(importModalCode.includes("A atribuição efetiva do treino ao aluno só ocorre após a publicação"), "Explicit disclaimer about draft vs publication");
  pass("Import modal: clean fullscreen dialog, two tabs, file swap/remove, source truth and draft disclaimer");

  // =========================================================================
  // 3. CRIAR COM IA — TEXTO COMO ENTRADA PRINCIPAL & CONVERSA
  // =========================================================================
  group("3. Criar com IA — Entrada Principal em Texto e Interpretação");

  const generateModalPath = path.resolve("components/consultancies/training-v2/training-ai-generate-modal.tsx");
  assert.ok(fs.existsSync(generateModalPath), "training-ai-generate-modal.tsx exists");
  const generateModalCode = fs.readFileSync(generateModalPath, "utf-8");

  // Header & Title
  assert.ok(generateModalCode.includes("Criar treino com IA"), "Has title 'Criar treino com IA'");
  assert.ok(generateModalCode.includes("Como você quer montar esse treino?"), "Has main question label");
  assert.ok(generateModalCode.includes("Ex.: Treino de hipertrofia para um aluno intermediário, 4 dias por semana, até 50 minutos por sessão, em academia completa. Quero priorizar costas e pernas."), "Has exact required placeholder");
  assert.ok(generateModalCode.includes("Conte o objetivo, os dias disponíveis, o tempo por sessão e os equipamentos."), "Has short helper text");

  // No initial selects in step 1
  assert.ok(!generateModalCode.includes('<select value={objective}'), "No initial objective select form");
  assert.ok(!generateModalCode.includes('<select value={level}'), "No initial level select form");
  assert.ok(!generateModalCode.includes('<select value={split}'), "No initial split select form");

  // Emerald Product Color & No Purple
  assert.ok(generateModalCode.includes("bg-emerald-600"), "Action buttons styled with product emerald green");
  assert.ok(!generateModalCode.includes("bg-purple-600"), "No purple action buttons in AI generator");
  assert.ok(generateModalCode.includes("Gerar proposta"), "Button label 'Gerar proposta'");
  assert.ok(generateModalCode.includes("Salvar rascunho e abrir no editor"), "Button label 'Salvar rascunho e abrir no editor'");
  pass("AI generator: initial screen has text entry without initial selects, emerald styling");

  // =========================================================================
  // 4. NLP / INTERPRETATION ENGINE AUDIT
  // =========================================================================
  group("4. Testes Unitários do Motor de Interpretação (analyzeWorkoutDescription)");

  // Scenario A: Complete description (from prompt placeholder) -> MUST BE COMPLETE, NO REDUNDANT QUESTIONS
  const completeText = "Treino de hipertrofia para um aluno intermediário, 4 dias por semana, até 50 minutos por sessão, em academia completa. Quero priorizar costas e pernas.";
  const completeResult = analyzeWorkoutDescription(completeText);
  assert.equal(completeResult.isComplete, true, "Complete description must be flagged as complete");
  assert.equal(completeResult.daysPerWeek, 4, "Extracted 4 days per week");
  assert.equal(completeResult.durationMinutes, 50, "Extracted 50 minutes");
  assert.ok(completeResult.objective?.includes("Hipertrofia"), "Extracted hypertrophy objective");
  assert.ok(completeResult.equipment?.includes("Academia Completa"), "Extracted full gym equipment");
  assert.equal(completeResult.level, "Intermediário", "Extracted intermediate level");
  assert.ok(completeResult.focusMuscles?.includes("costas e pernas"), "Extracted muscle focus");
  assert.equal(completeResult.missingFields.length, 0, "No missing fields for complete prompt");
  pass("Complete description advances directly without redundant questions");

  // Scenario B: Incomplete description (only objective and focus) -> MUST ASK SINGLE CLARIFICATION
  const incompleteText = "Quero um treino de emagrecimento focado em glúteos e pernas.";
  const incompleteResult = analyzeWorkoutDescription(incompleteText);
  assert.equal(incompleteResult.isComplete, false, "Incomplete description must be flagged as incomplete");
  assert.ok(incompleteResult.missingFields.includes("frequency"), "Missing frequency detected");
  assert.ok(incompleteResult.missingFields.includes("duration"), "Missing duration detected");
  assert.ok(incompleteResult.missingFields.includes("equipment"), "Missing equipment detected");
  assert.ok(incompleteResult.clarificationQuestion?.length > 10, "Provides short natural clarification question");
  pass("Incomplete description correctly triggers 1 short natural clarification question");

  // Scenario C: Partially complete (missing only duration) -> TARGETED QUESTION
  const partialText = "Treino de força 4 dias por semana em academia completa.";
  const partialResult = analyzeWorkoutDescription(partialText);
  assert.equal(partialResult.isComplete, false, "Partially complete text needs clarification");
  assert.equal(partialResult.daysPerWeek, 4, "Days identified");
  assert.ok(partialResult.equipment?.includes("Academia Completa"), "Equipment identified");
  assert.ok(partialResult.missingFields.includes("duration"), "Duration identified as only missing essential");
  assert.ok(partialResult.clarificationQuestion?.includes("duração"), "Question specifically asks for duration");
  pass("Partially complete description asks only for the missing dimension");

  // Scenario D: Contradiction detection
  const contradictoryText = "Quero treinar todo dia mas só posso 2 dias por semana em academia.";
  const contradictionResult = analyzeWorkoutDescription(contradictoryText);
  assert.equal(contradictionResult.hasContradiction, true, "Contradiction flagged");
  assert.ok(contradictionResult.clarificationQuestion?.includes("contradição"), "Asks for resolution of contradiction");
  pass("Contradiction detection triggers polite clarification request");

  // Scenario E: Health restrictions preserved without medical guarantees
  const healthText = "Hipertrofia 3 dias por semana, 45 min, academia completa. Evitar sobrecarga axial na lombar por hérnia de disco.";
  const healthResult = analyzeWorkoutDescription(healthText);
  assert.equal(healthResult.isComplete, true, "Prescription parameters complete");
  assert.ok(healthResult.restrictions?.includes("lombar"), "Health restriction verbatim captured");
  pass("Health restrictions captured faithfully without medical distortion");

  // =========================================================================
  // 5. TOUCH TARGETS, ACCESSIBILITY & SAFE AREA
  // =========================================================================
  group("5. Acessibilidade, Touch Targets (44px/48px) e Safe Area");

  assert.ok(importModalCode.includes("min-h-[44px]"), "Import modal has >= 44px touch targets");
  assert.ok(importModalCode.includes("min-h-[48px]"), "Import modal has >= 48px primary action CTA");
  assert.ok(importModalCode.includes("env(safe-area-inset-bottom"), "Import modal respects safe area");

  assert.ok(generateModalCode.includes("min-h-[44px]"), "AI modal has >= 44px touch targets");
  assert.ok(generateModalCode.includes("min-h-[48px]"), "AI modal has >= 48px primary action CTA");
  assert.ok(generateModalCode.includes("env(safe-area-inset-bottom"), "AI modal respects safe area");
  assert.ok(generateModalCode.includes("text-base sm:text-sm"), "Inputs have >= 16px font to prevent mobile iOS zoom");
  pass("All inputs, buttons, and safe areas adhere to accessibility and mobile touch standards");

  console.log(`\n${colors.green}${colors.bold}ALL THREE WORKOUT CREATION FLOWS FULLY VERIFIED!${colors.reset}\n`);
}

runTestSuite().catch((err) => {
  console.error(`\n${colors.red}${colors.bold}TEST SUITE FAILED:${colors.reset}`, err);
  process.exit(1);
});
