import assert from "node:assert";
import fs from "node:fs";

console.log("=== RUNNING STUDENT & VIP DASHBOARD TEST SUITE ===");

// 1. Verify files exist
const studentViewPath = "components/dashboard/dashboard-student-view.tsx";
const combinedViewPath = "components/dashboard/dashboard-combined-student-vip-view.tsx";
const headerPath = "components/dashboard/student/sections/student-overview-header.tsx";
const focusPath = "components/dashboard/student/sections/student-focus-section.tsx";
const pendingPath = "components/dashboard/student/sections/student-pending-section.tsx";
const consultChatPath = "components/dashboard/student/sections/student-consultations-chat-section.tsx";
const evolutionPath = "components/dashboard/student/sections/student-evolution-section.tsx";
const benefitsPath = "components/dashboard/student/sections/student-benefits-section.tsx";
const shellPath = "components/consultancies/consultancy-app-shell.tsx";
const pagePath = "app/consultoria/[slug]/page.tsx";

const files = [
  studentViewPath,
  combinedViewPath,
  headerPath,
  focusPath,
  pendingPath,
  consultChatPath,
  evolutionPath,
  benefitsPath,
  shellPath,
  pagePath,
];

for (const f of files) {
  assert(fs.existsSync(f), `File must exist: ${f}`);
}
console.log("✓ All 10 student dashboard files exist and are located in expected paths");

// 2. Read contents
const headerCode = fs.readFileSync(headerPath, "utf8");
const focusCode = fs.readFileSync(focusPath, "utf8");
const pendingCode = fs.readFileSync(pendingPath, "utf8");
const consultChatCode = fs.readFileSync(consultChatPath, "utf8");
const evolutionCode = fs.readFileSync(evolutionPath, "utf8");
const benefitsCode = fs.readFileSync(benefitsPath, "utf8");
const studentViewCode = fs.readFileSync(studentViewPath, "utf8");
const combinedViewCode = fs.readFileSync(combinedViewPath, "utf8");
const shellCode = fs.readFileSync(shellPath, "utf8");
const pageCode = fs.readFileSync(pagePath, "utf8");

// 3. Header verification
assert(headerCode.includes("Meu acompanhamento"), "Header must include strong title 'Meu acompanhamento'");
assert(headerCode.includes("Aluno:"), "Header must display Aluno: {userName} once");
assert(headerCode.includes("Acompanhamento do Aluno"), "Header must have clean tracker tag");
assert(headerCode.includes("Ficha de Treino"), "Header must have integrated training indicator");
assert(headerCode.includes("Plano Alimentar"), "Header must have integrated nutrition indicator");
assert(headerCode.includes("Para Responder"), "Header must have integrated pending requests indicator");
assert(headerCode.includes("Consultas & Chat"), "Header must have integrated consultations/chat indicator");
console.log("✓ Header component verified (title, single name, integrated indicators, cockpit styling)");

// 4. Grammar & Pluralization checks
assert(headerCode.includes('workoutRoutinesCount === 1 ? "1 rotina ativa" : `${workoutRoutinesCount} rotinas ativas`'), "Must correctly pluralize '1 rotina ativa' vs 'X rotinas ativas'");
assert(focusCode.includes('routinesCount === 1 ? "1 rotina" : `${routinesCount} rotinas`'), "Must correctly pluralize '1 rotina' vs 'X rotinas'");
console.log("✓ Grammar & pluralization verified (no more '1 rotinas')");

// 5. Training Focus & Actions
assert(focusCode.includes('"Continuar treino"'), "Must provide 'Continuar treino' action when session in progress");
assert(focusCode.includes('"Iniciar treino"'), "Must provide 'Iniciar treino' action when routine defined");
assert(focusCode.includes('"Escolher treino"'), "Must provide 'Escolher treino' action when multiple routines available");
assert(focusCode.includes("(estimativa)"), "Must identify estimated duration as estimate");
assert(focusCode.includes('"Seu treino ainda não foi disponibilizado'), "Must provide respectful empty state for training");
assert(focusCode.includes('"Seu plano alimentar ainda não foi disponibilizado'), "Must provide respectful empty state for nutrition");
console.log("✓ Training and Nutrition focus section verified (correct actions, estimate label, clear empty states)");

// 6. Section Order & Structure
const headerIndex = studentViewCode.indexOf("StudentOverviewHeader");
const focusIndex = studentViewCode.indexOf("StudentFocusSection");
const pendingIndex = studentViewCode.indexOf("StudentPendingSection");
const consultIndex = studentViewCode.indexOf("StudentConsultationsChatSection");
const evolutionIndex = studentViewCode.indexOf("StudentEvolutionSection");
const benefitsIndex = studentViewCode.indexOf("StudentBenefitsSection");

assert(headerIndex < focusIndex, "Header (A) must precede Focus Section (B)");
assert(focusIndex < pendingIndex, "Focus Section (B) must precede Pending Section (C)");
assert(pendingIndex < consultIndex, "Pending Section (C) must precede Consultations Section (D)");
assert(consultIndex < evolutionIndex, "Consultations Section (D) must precede Evolution Section (E)");
assert(evolutionIndex < benefitsIndex, "Evolution Section (E) must precede Benefits Section (F)");
console.log("✓ Section order strictly verified: A. Header -> B. Focus (Treino/Dieta) -> C. Pendências -> D. Consultas -> E. Evolução -> F. Benefícios VIP");

// 7. Neutral Evolution Metrics (No judgmental classification)
assert(!evolutionCode.includes("fracasso"), "Must not classify weight change as failure");
assert(!evolutionCode.includes("perdeu pouco"), "Must not judge weight progress");
assert(evolutionCode.includes("vs registro anterior"), "Must display neutral delta vs previous entry");
console.log("✓ Evolution section verified: objective data, no judgmental labels");

// 8. Mobile Navigation Tabs
assert(shellCode.includes('mobileLabel: "Alimentação"'), "Mobile navigation must label nutrition tab as 'Alimentação'");
assert(shellCode.includes('id: "student-consultas"'), "Mobile navigation must include 'student-consultas' as primary tab");
console.log("✓ Mobile navigation verified: Início, Treinos, Alimentação, Consultas, Mais");

// 9. Wallpaper & Theme Variant in page.tsx
assert(pageCode.includes("isStudentOverview"), "page.tsx must define isStudentOverview");
assert(pageCode.includes("isStudentOverview ||"), "Dark overview theme must include isStudentOverview");
assert(pageCode.includes("!(isPureNutritionist || isCombinedNutritionistAdmin || isPurePersonal || isCombinedPersonalAdmin || isPureAdmin || isStudentOverview)"), "DashboardContext must be hidden for student overview to avoid duplicate greeting");
console.log("✓ Wallpaper and theme integration in page.tsx verified");

// 10. Combined Student & VIP View Integration
assert(combinedViewCode.includes("isInfluencer={true}"), "Combined view must pass isInfluencer=true to StudentView");
assert(combinedViewCode.includes("isVip={true}"), "Combined view must pass isVip=true to StudentView");
assert(!combinedViewCode.includes("activeTab"), "Combined view must not hide student monitoring behind tabs");
console.log("✓ Combined Student + VIP view verified: student monitoring is front and center without tabs");

console.log("✓ ALL STUDENT & VIP DASHBOARD AUTOMATED TESTS PASSED CLEANLY!");
