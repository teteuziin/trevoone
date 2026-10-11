import fs from "fs";
import path from "path";
import assert from "assert";

console.log("=== TREVO ONE — TEST SUITE: RESUMO GERAL DO PRONTUÁRIO ===\n");

let allPassed = true;
function runTest(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
  } catch (err) {
    console.error(`[FAIL] ${name} ->`, err.message);
    allPassed = false;
  }
}

// 1. COMPONENT EXISTENCE & EXPORT
runTest("1. PatientGeneralSummaryTab component exists and exports correctly", () => {
  const filePath = "components/consultancies/nutrition-v2/patient-general-summary-tab.tsx";
  assert.ok(fs.existsSync(filePath), "patient-general-summary-tab.tsx must exist");
  const content = fs.readFileSync(filePath, "utf8");
  assert.ok(content.includes("export function PatientGeneralSummaryTab"), "Must export PatientGeneralSummaryTab");
  assert.ok(content.includes("export interface PatientGeneralSummaryTabProps"), "Must export PatientGeneralSummaryTabProps");
});

// 2. BLOCK A: IDENTIFICAÇÃO E STATUS
runTest("2. Bloco A: Identificação e status do paciente", () => {
  const content = fs.readFileSync("components/consultancies/nutrition-v2/patient-general-summary-tab.tsx", "utf8");
  assert.ok(content.includes("BLOCO A: IDENTIFICAÇÃO E STATUS"), "Block A comment must exist");
  assert.ok(content.includes("detail.student.fullName"), "Must display patient full name");
  assert.ok(content.includes("detail.student.email"), "Must display patient email");
  assert.ok(content.includes("detail.student.joinedAt"), "Must display join date");
  assert.ok(content.includes("Anamnese"), "Must display anamnesis status");
  assert.ok(content.includes("Plano Alimentar"), "Must display active plan status");
  assert.ok(content.includes("Continuar Edição do Rascunho"), "Must handle draft in progress");
});

// 3. BLOCK B: RESUMO CLÍNICO
runTest("3. Bloco B: Resumo clínico consolidado com empty state", () => {
  const content = fs.readFileSync("components/consultancies/nutrition-v2/patient-general-summary-tab.tsx", "utf8");
  assert.ok(content.includes("BLOCO B: RESUMO CLÍNICO"), "Block B comment must exist");
  assert.ok(content.includes("Condições & Diagnósticos"), "Must display diagnosed conditions");
  assert.ok(content.includes("Alergias & Intolerâncias"), "Must display allergies/intolerances");
  assert.ok(content.includes("Medicamentos & Suplementos"), "Must display medications and supplements");
  assert.ok(content.includes("Sintomas Digestivos"), "Must display gastrointestinal symptoms");
  assert.ok(content.includes("Observações Relevantes"), "Must display clinical notes");
  assert.ok(content.includes("Última Consulta"), "Must display latest consultation");
  assert.ok(content.includes("Nenhuma informação clínica registrada ainda."), "Must display elegant clinical empty state");
});

// 4. BLOCK C: HISTÓRICO ALIMENTAR
runTest("4. Bloco C: Histórico alimentar com empty state", () => {
  const content = fs.readFileSync("components/consultancies/nutrition-v2/patient-general-summary-tab.tsx", "utf8");
  assert.ok(content.includes("BLOCO C: HISTÓRICO ALIMENTAR"), "Block C comment must exist");
  assert.ok(content.includes("Padrão & Rotina Alimentar"), "Must display usual eating routine");
  assert.ok(content.includes("Preferências"), "Must display food preferences");
  assert.ok(content.includes("Restrições Alimentares"), "Must display dietary restrictions");
  assert.ok(content.includes("Rejeições / Aversões"), "Must display disliked foods section");
  assert.ok(content.includes("Dificuldades de Adesão"), "Must display adherence difficulties");
  assert.ok(content.includes("Nenhum histórico alimentar registrado ainda."), "Must display elegant dietary empty state");
});

// 5. BLOCK D: ESTILO DE VIDA
runTest("5. Bloco D: Estilo de vida com empty state", () => {
  const content = fs.readFileSync("components/consultancies/nutrition-v2/patient-general-summary-tab.tsx", "utf8");
  assert.ok(content.includes("BLOCO D: ESTILO DE VIDA"), "Block D comment must exist");
  assert.ok(content.includes("Profissão / Ocupação"), "Must display occupation and routine");
  assert.ok(content.includes("Atividade Física"), "Must display physical activity");
  assert.ok(content.includes("Sono"), "Must display sleep");
  assert.ok(content.includes("Hidratação"), "Must display hydration");
  assert.ok(content.includes("Hábito Intestinal"), "Must display bowel habit");
  assert.ok(content.includes("Fumo:") && content.includes("Álcool:"), "Must display smoking and alcohol");
  assert.ok(content.includes("Nenhuma informação de estilo de vida registrada ainda."), "Must display elegant lifestyle empty state");
});

// 6. BLOCK E: ANTROPOMETRIA COM DELTA E TENDÊNCIA
runTest("6. Bloco E: Antropometria com variação recente e tendência", () => {
  const content = fs.readFileSync("components/consultancies/nutrition-v2/patient-general-summary-tab.tsx", "utf8");
  assert.ok(content.includes("BLOCO E: ANTROPOMETRIA"), "Block E comment must exist");
  assert.ok(content.includes("Peso Atual"), "Must display current weight");
  assert.ok(content.includes("Estatura"), "Must display height");
  assert.ok(content.includes("Variação Recente de Peso"), "Must display recent weight variation");
  assert.ok(content.includes("weightDelta > 0"), "Must detect weight gain");
  assert.ok(content.includes("weightDelta < 0"), "Must detect weight loss");
  assert.ok(content.includes("Peso anterior de referência"), "Must display reference weight");
});

// 7. BLOCK F: CÁLCULOS CLÍNICOS (IMC + TMB + GET/TDEE + MACROS + UNKNOWN != ZERO)
runTest("7. Bloco F: Cálculos clínicos com TMB, GET e rigor UNKNOWN != ZERO", () => {
  const content = fs.readFileSync("components/consultancies/nutrition-v2/patient-general-summary-tab.tsx", "utf8");
  assert.ok(content.includes("BLOCO F: CÁLCULOS CLÍNICOS"), "Block F comment must exist");
  assert.ok(content.includes("IMC (WHO)"), "Must display BMI");
  assert.ok(content.includes("TMB (Basal)"), "Must display BMR");
  assert.ok(content.includes("GET (Total)"), "Must display TDEE / GET");
  assert.ok(content.includes("TMB não calculada"), "Must show TMB não calculada when absent");
  assert.ok(content.includes("GET não calculado"), "Must show GET não calculado when absent");
  assert.ok(content.includes("Meta calórica não definida"), "Must show Meta calórica não definida when absent");
  assert.ok(content.includes("Distribuição de Macronutrientes"), "Must display macro distribution");
  assert.ok(content.includes("Proteína"), "Must display protein");
  assert.ok(content.includes("Carboidrato"), "Must display carbohydrate");
  assert.ok(content.includes("Gordura"), "Must display fat");
});

// 8. BLOCK G: PLANO ALIMENTAR ATIVO
runTest("8. Bloco G: Plano alimentar ativo e ações", () => {
  const content = fs.readFileSync("components/consultancies/nutrition-v2/patient-general-summary-tab.tsx", "utf8");
  assert.ok(content.includes("BLOCO G: PLANO ALIMENTAR ATIVO"), "Block G comment must exist");
  assert.ok(content.includes("activePlan.versionTitle"), "Must display plan title");
  assert.ok(content.includes("refeições"), "Must display meals count");
  assert.ok(content.includes("activePlan.totals.caloriesKcal"), "Must display plan calories");
  assert.ok(content.includes("activePlan.totals.proteinG"), "Must display plan protein");
  assert.ok(content.includes("activePlan.totals.carbohydrateG"), "Must display plan carbohydrate");
  assert.ok(content.includes("activePlan.totals.fatG"), "Must display plan fat");
  assert.ok(content.includes("onStartEditPlan"), "Must support editing plan");
});

// 9. BLOCK H: PLANEJAMENTO NUTRICIONAL
runTest("9. Bloco H: Planejamento nutricional e comparação com o plano ativo", () => {
  const content = fs.readFileSync("components/consultancies/nutrition-v2/patient-general-summary-tab.tsx", "utf8");
  assert.ok(content.includes("BLOCO H: PLANEJAMENTO NUTRICIONAL"), "Block H comment must exist");
  assert.ok(content.includes("Status do Planejamento"), "Must display planning status");
  assert.ok(content.includes("Comparativo Meta vs Prescrição Vigente"), "Must display active plan comparison");
  assert.ok(content.includes("Diferença da prescrição"), "Must display calorie difference between plan and planning");
  assert.ok(content.includes("Cálculo desatualizado"), "Must display stale warning if anthro updated after planning");
});

// 10. BLOCK I: ACOMPANHAMENTO RECENTE
runTest("10. Bloco I: Acompanhamento recente e linha do tempo", () => {
  const content = fs.readFileSync("components/consultancies/nutrition-v2/patient-general-summary-tab.tsx", "utf8");
  assert.ok(content.includes("BLOCO I: ACOMPANHAMENTO"), "Block I comment must exist");
  assert.ok(content.includes("Última Consulta"), "Must display last consultation");
  assert.ok(content.includes("Último Check-in"), "Must display last check-in");
  assert.ok(content.includes("Linha do Tempo"), "Must display recent timeline events");
  assert.ok(content.includes("Abrir Linha do Tempo"), "Must provide CTA to full timeline");
});

// 11. DESKTOP INTEGRATION IN PATIENT-RECORD-VIEW
runTest("11. Integração desktop em PatientRecordView", () => {
  const content = fs.readFileSync("components/consultancies/nutrition-v2/patient-record-view.tsx", "utf8");
  assert.ok(content.includes("<PatientGeneralSummaryTab"), "Must render PatientGeneralSummaryTab");
  assert.ok(content.includes("activeTab === \"resumo\""), "Must render on activeTab === resumo");
  assert.ok(content.includes("initialFollowupSummary"), "Must pass initialFollowupSummary");
  assert.ok(content.includes("Taxa Metabólica Basal (TMB) & Gasto Energético Total (GET)"), "Must enhance calculos tab with TMB and GET");
  assert.ok(content.includes("Meta Calórica Oficial & Distribuição de Macronutrientes"), "Must enhance calculos tab with Macros");
});

// 12. MOBILE INTEGRATION IN MOBILE-PATIENT-HUB
runTest("12. Integração mobile em MobilePatientHub", () => {
  const content = fs.readFileSync("components/consultancies/nutrition-v2/mobile-patient-hub.tsx", "utf8");
  assert.ok(content.includes("<PatientGeneralSummaryTab"), "Must render PatientGeneralSummaryTab on mobile");
  assert.ok(content.includes("data-testid=\"mobile-tab-resumo\""), "Must preserve mobile-tab-resumo testid");
  assert.ok(content.includes("initialFollowupSummary"), "Must pass initialFollowupSummary");
  assert.ok(content.includes("Taxa Metabólica Basal (TMB)"), "Must enhance mobile calculos tab with TMB");
  assert.ok(content.includes("Gasto Energético Total (GET)"), "Must enhance mobile calculos tab with GET");
});

// 13. PRESERVATION OF DETAILED TABS (NON-REGRESSION)
runTest("13. Preservação de todas as abas detalhadas existentes", () => {
  const viewContent = fs.readFileSync("components/consultancies/nutrition-v2/patient-record-view.tsx", "utf8");
  const hubContent = fs.readFileSync("components/consultancies/nutrition-v2/mobile-patient-hub.tsx", "utf8");

  // Detailed tabs in desktop
  const expectedDesktopTabs = [
    "consultas",
    "checkins",
    "planejamento",
    "plano",
    "clinico",
    "alimentar",
    "estilo_vida",
    "antropometria",
    "gestacao",
    "calculos",
  ];
  for (const tab of expectedDesktopTabs) {
    assert.ok(viewContent.includes(`activeTab === "${tab}"`), `Desktop must preserve tab '${tab}'`);
  }

  // Detailed sub-tabs in mobile
  const expectedMobileSubTabs = [
    "clinico",
    "alimentar",
    "estilo_vida",
    "antropometria",
    "gestacao",
    "calculos",
  ];
  for (const subTab of expectedMobileSubTabs) {
    assert.ok(hubContent.includes(`clinicalSubTab === "${subTab}"`), `Mobile must preserve sub-tab '${subTab}'`);
  }
});

// 14. SERVER PAGE DATA LOADER
runTest("14. Carregamento de dados unificado na página de prontuário", () => {
  const pageContent = fs.readFileSync("app/consultoria/[slug]/planos-v2/prontuario/[studentPublicId]/page.tsx", "utf8");
  assert.ok(pageContent.includes("getPatientFollowupTimelineAction"), "Must import getPatientFollowupTimelineAction");
  assert.ok(pageContent.includes("followupRes"), "Must load followup timeline in Promise.all");
  assert.ok(pageContent.includes("initialFollowupSummary={followupRes"), "Must pass initialFollowupSummary to PatientRecordView");
});

console.log("\n========================================");
if (!allPassed) {
  console.error("ALGUNS TESTES FALHARAM!");
  process.exit(1);
} else {
  console.log("TODOS OS 14 TESTES DE RESUMO GERAL PASSARAM COM SUCESSO!");
  console.log("========================================\n");
}
