import fs from "fs";
import path from "path";
import assert from "assert";

console.log("=== TREVO ONE — TEST SUITE: NAVEGAÇÃO DO PATIENT HUB & RESUMO GERAL ===\n");

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

// 2. INDICADORES CLÍNICOS RÁPIDOS NO TOPO DO RESUMO
runTest("2. Indicadores clínicos rápidos no topo (Peso Atual, IMC, TMB, GET / Meta Calórica)", () => {
  const content = fs.readFileSync("components/consultancies/nutrition-v2/patient-general-summary-tab.tsx", "utf8");
  assert.ok(content.includes("INDICADORES CLÍNICOS RÁPIDOS"), "Indicators comment must exist");
  assert.ok(content.includes("data-testid=\"summary-quick-indicators\""), "Must have summary-quick-indicators testid");
  assert.ok(content.includes("Peso Atual"), "Must display Peso Atual");
  assert.ok(content.includes("IMC"), "Must display IMC");
  assert.ok(content.includes("TMB"), "Must display TMB");
  assert.ok(content.includes("GET / Meta Calórica"), "Must display GET / Meta Calórica");
});

// 3. REMOÇÃO DE IDENTIFICAÇÃO DUPLICADA E RESUMO DUPLICADO DO PLANO
runTest("3. Remoção de identificação duplicada e resumo duplicado do plano", () => {
  const content = fs.readFileSync("components/consultancies/nutrition-v2/patient-general-summary-tab.tsx", "utf8");
  // Identification header belongs exclusively to global Patient Hub header
  assert.ok(!content.includes("• Vínculo desde"), "Must NOT repeat patient join date in summary tab");
  assert.ok(!content.includes("Continuar Edição do Rascunho →"), "Must NOT duplicate draft edit button in top summary strip");
  // Strip must NOT duplicate active plan (handled by dedicated Card G)
  assert.ok(!content.includes("Plano Alimentar\n            </span>"), "Must NOT duplicate plan in quick strip");
});

// 4. BLOCK B: RESUMO CLÍNICO COM NAVEGAÇÃO "VER PRONTUÁRIO"
runTest("4. Bloco B: Resumo clínico consolidado com empty state e CTA Ver Prontuário", () => {
  const content = fs.readFileSync("components/consultancies/nutrition-v2/patient-general-summary-tab.tsx", "utf8");
  assert.ok(content.includes("BLOCO B: RESUMO CLÍNICO"), "Block B comment must exist");
  assert.ok(content.includes("Ver Prontuário →"), "Must have Ver Prontuário CTA");
  assert.ok(content.includes("onNavigateTab(\"clinico\""), "Must navigate to clinico subarea");
  assert.ok(content.includes("Condições & Diagnósticos"), "Must display diagnosed conditions");
  assert.ok(content.includes("Alergias & Intolerâncias"), "Must display allergies/intolerances");
  assert.ok(content.includes("Medicamentos & Suplementos"), "Must display medications and supplements");
  assert.ok(content.includes("Sintomas Digestivos"), "Must display gastrointestinal symptoms");
  assert.ok(content.includes("Observações Relevantes"), "Must display clinical notes");
  assert.ok(content.includes("Última Consulta"), "Must display latest consultation");
  assert.ok(content.includes("Nenhuma informação clínica registrada ainda."), "Must display elegant clinical empty state");
});

// 5. BLOCK C: HISTÓRICO ALIMENTAR COM NAVEGAÇÃO "VER DETALHES"
runTest("5. Bloco C: Histórico alimentar com empty state e CTA Ver Detalhes", () => {
  const content = fs.readFileSync("components/consultancies/nutrition-v2/patient-general-summary-tab.tsx", "utf8");
  assert.ok(content.includes("BLOCO C: HISTÓRICO ALIMENTAR"), "Block C comment must exist");
  assert.ok(content.includes("Ver Detalhes →"), "Must have Ver Detalhes CTA");
  assert.ok(content.includes("onNavigateTab(\"alimentar\""), "Must navigate to alimentar subarea");
  assert.ok(content.includes("Padrão & Rotina Alimentar"), "Must display usual eating routine");
  assert.ok(content.includes("Preferências"), "Must display food preferences");
  assert.ok(content.includes("Restrições Alimentares"), "Must display dietary restrictions");
  assert.ok(content.includes("Rejeições / Aversões"), "Must display disliked foods section");
  assert.ok(content.includes("Dificuldades de Adesão"), "Must display adherence difficulties");
  assert.ok(content.includes("Nenhum histórico alimentar registrado ainda."), "Must display elegant dietary empty state");
});

// 6. BLOCK D: ESTILO DE VIDA COM NAVEGAÇÃO "VER DETALHES"
runTest("6. Bloco D: Estilo de vida com empty state e CTA Ver Detalhes", () => {
  const content = fs.readFileSync("components/consultancies/nutrition-v2/patient-general-summary-tab.tsx", "utf8");
  assert.ok(content.includes("BLOCO D: ESTILO DE VIDA"), "Block D comment must exist");
  assert.ok(content.includes("onNavigateTab(\"estilo_vida\""), "Must navigate to estilo_vida subarea");
  assert.ok(content.includes("Profissão / Ocupação"), "Must display occupation and routine");
  assert.ok(content.includes("Atividade Física"), "Must display physical activity");
  assert.ok(content.includes("Sono"), "Must display sleep");
  assert.ok(content.includes("Hidratação"), "Must display hydration");
  assert.ok(content.includes("Hábito Intestinal"), "Must display bowel habit");
  assert.ok(content.includes("Fumo:") && content.includes("Álcool:"), "Must display smoking and alcohol");
  assert.ok(content.includes("Nenhuma informação de estilo de vida registrada ainda."), "Must display elegant lifestyle empty state");
});

// 7. BLOCK E: ANTROPOMETRIA COM CTAS "+ MEDIÇÃO" E "HISTÓRICO"
runTest("7. Bloco E: Antropometria com CTAs + Medição e Histórico e exibição de idade/sexo", () => {
  const content = fs.readFileSync("components/consultancies/nutrition-v2/patient-general-summary-tab.tsx", "utf8");
  assert.ok(content.includes("BLOCO E: ANTROPOMETRIA"), "Block E comment must exist");
  assert.ok(content.includes("+ Medição"), "Must have + Medição CTA");
  assert.ok(content.includes("Histórico →"), "Must have Histórico CTA");
  assert.ok(content.includes("onNavigateTab(\"antropometria\""), "Must navigate to antropometria subarea");
  assert.ok(content.includes("Peso Atual"), "Must display current weight");
  assert.ok(content.includes("Estatura"), "Must display height");
  assert.ok(content.includes("Idade:"), "Must display age");
  assert.ok(content.includes("Sexo:"), "Must display biological sex");
  assert.ok(content.includes("Variação Recente de Peso"), "Must display recent weight variation");
  assert.ok(content.includes("weightDelta > 0"), "Must detect weight gain");
  assert.ok(content.includes("weightDelta < 0"), "Must detect weight loss");
});

// 8. UNIFICAÇÃO DE CÁLCULOS CLÍNICOS: CARD REDUNDANTE REMOVIDO DO RESUMO GERAL
runTest("8. Unificação de Cálculos Clínicos: card redundante removido em favor de Planejamento", () => {
  const content = fs.readFileSync("components/consultancies/nutrition-v2/patient-general-summary-tab.tsx", "utf8");
  assert.ok(!content.includes("Cálculos Clínicos & Metas"), "Card redundante Cálculos Clínicos & Metas deve ser removido do Resumo Geral");
  assert.ok(content.includes("Planejamento Nutricional"), "Deve ter seção de Planejamento Nutricional");
  assert.ok(content.includes("onNavigateTab(\"planejamento\""), "Deve navegar para planejamento");
});

// 9. BLOCK G: PLANO ALIMENTAR ATIVO COMPLETO
runTest("9. Bloco G: Plano alimentar ativo completo", () => {
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

// 10. BLOCK H & I: PLANEJAMENTO E ACOMPANHAMENTO
runTest("10. Blocos H e I: Planejamento e Acompanhamento", () => {
  const content = fs.readFileSync("components/consultancies/nutrition-v2/patient-general-summary-tab.tsx", "utf8");
  assert.ok(content.includes("BLOCO H: PLANEJAMENTO NUTRICIONAL"), "Block H comment must exist");
  assert.ok(content.includes("BLOCO I: ACOMPANHAMENTO"), "Block I comment must exist");
  assert.ok(content.includes("Última Consulta"), "Must display last consultation");
  assert.ok(content.includes("Último Check-in"), "Must display last check-in");
  assert.ok(content.includes("Linha do Tempo"), "Must display recent timeline events");
});

// 11. MAIN NAV SIMPLIFICATION IN PATIENT-RECORD-VIEW (DESKTOP)
runTest("11. Barra principal do desktop simplificada para 5 abas principais", () => {
  const viewContent = fs.readFileSync("components/consultancies/nutrition-v2/patient-record-view.tsx", "utf8");

  // The 5 main navigation tabs must be present
  assert.ok(viewContent.includes('{ id: "resumo", label: "Resumo Geral" }'), "Must have Resumo Geral in main nav");
  assert.ok(viewContent.includes('{ id: "consultas", label: "Consultas" }'), "Must have Consultas in main nav");
  assert.ok(viewContent.includes('{ id: "checkins", label: "Acompanhamento" }'), "Must have Acompanhamento in main nav");
  assert.ok(viewContent.includes('{ id: "planejamento", label: "Planejamento" }'), "Must have Planejamento in main nav");
  assert.ok(viewContent.includes('{ id: "plano", label: activePlan ? "Plano Ativo" : "Plano Alimentar" }'), "Must have Plano Ativo in main nav");

  // Detailed clinical tabs must be REMOVED from the main nav array
  assert.ok(!viewContent.includes('{ id: "clinico", label: "Histórico Clínico" }'), "Histórico Clínico must NOT be in main nav array");
  assert.ok(!viewContent.includes('{ id: "alimentar", label: "Histórico Alimentar" }'), "Histórico Alimentar must NOT be in main nav array");
  assert.ok(!viewContent.includes('{ id: "estilo_vida", label: "Estilo de Vida" }'), "Estilo de Vida must NOT be in main nav array");
  assert.ok(!viewContent.includes('{ id: "calculos", label: "Cálculos Clínicos" }'), "Cálculos Clínicos must NOT be in main nav array");
});

// 12. PRESERVATION OF CLINICAL DETAIL SECTIONS AND RETURN BREADCRUMB
runTest("12. Preservação de subáreas clínicas e cabeçalho de retorno ao Resumo Geral", () => {
  const viewContent = fs.readFileSync("components/consultancies/nutrition-v2/patient-record-view.tsx", "utf8");

  // Sub-area header with back button
  assert.ok(viewContent.includes("Voltar ao Resumo Geral"), "Must have Voltar ao Resumo Geral link");
  assert.ok(viewContent.includes("Fechar detalhes ✕"), "Must have Fechar detalhes button");

  // Sub-areas must remain fully functional
  assert.ok(viewContent.includes('activeTab === "clinico"'), "Must preserve clinico subarea view");
  assert.ok(viewContent.includes('activeTab === "alimentar"'), "Must preserve alimentar subarea view");
  assert.ok(viewContent.includes('activeTab === "estilo_vida"'), "Must preserve estilo_vida subarea view");
  assert.ok(viewContent.includes('activeTab === "antropometria"'), "Must preserve antropometria subarea view");
  assert.ok(viewContent.includes('activeTab === "gestacao"'), "Must preserve gestacao subarea view");
  assert.ok(viewContent.includes('activeTab === "calculos"'), "Must preserve calculos subarea view");
});

// 13. MOBILE INTEGRATION WITH 5 CORE TABS AND BACK BUTTON
runTest("13. Integração mobile com 5 abas principais e retorno ao Resumo Geral", () => {
  const hubContent = fs.readFileSync("components/consultancies/nutrition-v2/mobile-patient-hub.tsx", "utf8");
  assert.ok(hubContent.includes('{ id: "resumo", label: "Resumo Geral" }'), "Mobile must have Resumo Geral");
  assert.ok(hubContent.includes('{ id: "consultas", label: "Consultas" }'), "Mobile must have Consultas");
  assert.ok(hubContent.includes('{ id: "checkins", label: "Acompanhamento" }'), "Mobile must have Acompanhamento");
  assert.ok(hubContent.includes('{ id: "planejamento", label: "Planejamento" }'), "Mobile must have Planejamento");
  assert.ok(hubContent.includes('{ id: "plano", label: "Plano Ativo" }'), "Mobile must have Plano Ativo");
  assert.ok(hubContent.includes("Voltar ao Resumo Geral"), "Mobile prontuario must have back button to Resumo Geral");
  assert.ok(hubContent.includes("data-testid=\"mobile-tab-resumo\""), "Must preserve mobile-tab-resumo testid");
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
  console.log("TODOS OS 14 TESTES DE NAVEGAÇÃO E RESUMO GERAL PASSARAM COM SUCESSO!");
  console.log("========================================\n");
}
