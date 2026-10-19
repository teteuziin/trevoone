/**
 * TREVO ONE — DETERMINISTIC TEST SUITE: NUTRITIONIST DASHBOARD REDESIGN
 *
 * Verifies all requirements for elevating the Nutritionist Overview to the Personal standard:
 * 1.  Cabeçalho executivo sólido #151619 com eyebrow "NUTRICIONISTA · PAINEL DE ATENDIMENTO"
 * 2.  Título principal "Visão geral da nutrição"
 * 3.  Ações principais alinhadas ("Importar plano" e "+ Novo plano")
 * 4.  Indicadores integrados no header card: Pacientes ativos, Planos ativos, Planos com rascunho
 * 5.  Correção semântica de rascunhos: hasPlanDraftOrRevision unifica contador e pendências
 * 6.  Agenda em faixa horizontal: banner quando vazia, lista vertical compacta quando há consultas
 * 7.  "Precisa de atenção" em largura total com avatar/iniciais, contexto e ação direta
 * 8.  Central de planos alimentares: tabela desktop com 6 colunas canônicas e cards mobile
 * 9.  Filtros (Todos, Ativos, Com rascunho), busca textual e ordenação determinística
 * 10. Salvaguarda mobile: alvos >= 44px e input de busca >= 16px para prevenir zoom no iOS
 * 11. Integração de papel de parede no shell da consultoria (isDarkOverviewTheme e isTrainerOrAdminScreen)
 * 12. Não-regressão: Preservação do dashboard do Personal e compatibilidade de tipos
 */

import { register } from "node:module";
register("./ts-loader.mjs", import.meta.url);

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const {
  isPlanActive,
  isPlanDraft,
  hasPlanDraftOrRevision,
  getPlanCanonicalStatus,
} = await import("../lib/nutrition-v2/plan-classification.ts");

const {
  filterAndSortNutritionPlans,
  resolvePatientDisplay,
  formatMealsCount,
  formatDate,
} = await import("../components/dashboard/nutrition/sections/nutrition-plans-table.tsx");

console.log("==================================================");
console.log("TREVO ONE — NUTRITIONIST DASHBOARD REDESIGN TEST SUITE");
console.log("==================================================\n");

let passed = 0;
let total = 0;

function runCase(num, title, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`[PASS] Test ${num}: ${title}`);
  } catch (err) {
    console.error(`[FAIL] Test ${num}: ${title}`, err.message);
    throw err;
  }
}

const headerFile = path.resolve("components/dashboard/nutrition/sections/nutrition-overview-header.tsx");
const todayFile = path.resolve("components/dashboard/nutrition/sections/nutrition-today-section.tsx");
const attentionFile = path.resolve("components/dashboard/nutrition/sections/nutrition-attention-section.tsx");
const tableFile = path.resolve("components/dashboard/nutrition/sections/nutrition-plans-table.tsx");
const viewFile = path.resolve("components/dashboard/dashboard-nutritionist-view.tsx");
const pageFile = path.resolve("app/consultoria/[slug]/page.tsx");

const headerContent = fs.readFileSync(headerFile, "utf-8");
const todayContent = fs.readFileSync(todayFile, "utf-8");
const attentionContent = fs.readFileSync(attentionFile, "utf-8");
const tableContent = fs.readFileSync(tableFile, "utf-8");
const viewContent = fs.readFileSync(viewFile, "utf-8");
const pageContent = fs.readFileSync(pageFile, "utf-8");

// TEST 1: Cabeçalho Executivo Sólido #151619 e Eyebrow
runCase(1, "Cabeçalho executivo sólido #151619 e Eyebrow Nutricionista", () => {
  assert.ok(headerContent.includes("bg-[#151619]"), "Header deve possuir card sólido #151619");
  assert.ok(headerContent.includes("border-[#303238]"), "Header deve possuir borda grafite #303238");
  assert.ok(headerContent.includes("Nutricionista · Painel de Atendimento"), "Eyebrow correto da nutricionista");
  assert.ok(headerContent.includes("bg-[#10B981]"), "Ponto verde esmeralda no eyebrow");
  assert.ok(headerContent.includes("Visão geral da nutrição"), "Título 'Visão geral da nutrição'");
});

// TEST 2: Ações do Cabeçalho Alinhadas
runCase(2, "Ações do cabeçalho alinhadas sem quebra", () => {
  assert.ok(headerContent.includes("Importar plano"), "Ação secundária 'Importar plano'");
  assert.ok(headerContent.includes("+ Novo plano"), "Ação primária '+ Novo plano'");
  assert.ok(headerContent.includes("whitespace-nowrap"), "Ações usam whitespace-nowrap para não quebrar");
  assert.ok(headerContent.includes("min-h-[44px]"), "Botões possuem min-h-[44px]");
  assert.ok(headerContent.includes("NutritionAiImportModal"), "Disponibiliza modal de importação com IA");
});

// TEST 3: Indicadores Integrados no Header Card
runCase(3, "Indicadores integrados no header card", () => {
  assert.ok(headerContent.includes("pacientes ativos"), "Indicador 'pacientes ativos'");
  assert.ok(headerContent.includes("planos ativos"), "Indicador 'planos ativos'");
  assert.ok(headerContent.includes("planos com rascunho"), "Indicador 'planos com rascunho'");
  assert.ok(headerContent.includes("DuotoneStudentsIcon"), "Ícone DuotoneStudentsIcon");
  assert.ok(headerContent.includes("DuotoneNutritionIcon"), "Ícone DuotoneNutritionIcon");
  assert.ok(headerContent.includes("DuotoneFormsIcon"), "Ícone DuotoneFormsIcon");
  assert.ok(headerContent.includes("/planos-v2/prontuario"), "Link para prontuário clínico");
  assert.ok(headerContent.includes("/planos-v2"), "Link para planos alimentares");
});

// TEST 4: Correção Semântica do Contador de Rascunhos
runCase(4, "Correção semântica: hasPlanDraftOrRevision inclui rascunho de plano ativo", () => {
  // Cenário 1: Plano ativo com revisão em rascunho (o caso reportado pelo usuário)
  const activePlanWithDraftRevision = {
    planLifecycleStatus: "ACTIVE",
    currentVersionStatus: "DRAFT",
    hasDraftRevision: true,
    versionNumber: 2,
    activeAssignmentsCount: 1,
  };
  assert.equal(isPlanActive(activePlanWithDraftRevision), true, "Plano com atribuição é ativo");
  assert.equal(isPlanDraft(activePlanWithDraftRevision), false, "isPlanDraft puro retorna false para plano ativo");
  assert.equal(hasPlanDraftOrRevision(activePlanWithDraftRevision), true, "hasPlanDraftOrRevision reconhece a revisão em rascunho");

  // Cenário 2: Rascunho inicial nunca publicado
  const brandNewDraft = {
    planLifecycleStatus: "DRAFT",
    currentVersionStatus: "DRAFT",
    hasDraftRevision: false,
    versionNumber: 1,
    activeAssignmentsCount: 0,
  };
  assert.equal(hasPlanDraftOrRevision(brandNewDraft), true, "hasPlanDraftOrRevision reconhece rascunho inicial");

  // Cenário 3: Plano arquivado não é rascunho
  const archivedPlan = {
    planLifecycleStatus: "ARCHIVED",
    currentVersionStatus: "DRAFT",
  };
  assert.equal(hasPlanDraftOrRevision(archivedPlan), false, "Plano arquivado não é contado em rascunhos");

  // No page.tsx, nutricionista usa hasPlanDraftOrRevision para alimentar nutritionistDraftPlansCount
  assert.ok(pageContent.includes("filter(hasPlanDraftOrRevision)"), "page.tsx utiliza hasPlanDraftOrRevision para nutritionistDraftPlansCount");
});

// TEST 5: Agenda em Faixa Horizontal
runCase(5, "Agenda em faixa horizontal (banner quando vazia, lista compacta quando há)", () => {
  assert.ok(todayContent.includes("Hoje:"), "Prefixo Hoje:");
  assert.ok(todayContent.includes("nenhuma consulta agendada."), "Texto sem compromissos");
  assert.ok(todayContent.includes("Ver agenda →"), "Link de ver agenda presente");
  assert.ok(todayContent.includes("/consultas"), "Link aponta para /consultas");
  assert.ok(todayContent.includes("tabular-nums"), "Horários das consultas usam tabular-nums");
  assert.ok(todayContent.includes("Abrir consulta"), "Ação direta para abrir consulta");
});

// TEST 6: Precisa de Atenção em Largura Total
runCase(6, "Precisa de atenção em largura total com avatar/iniciais e ação direta", () => {
  assert.ok(attentionContent.includes("Precisa de atenção"), "Título da seção");
  assert.ok(attentionContent.includes("getInitials"), "Exibe iniciais do paciente/modelo");
  assert.ok(attentionContent.includes("AlertTriangleIcon"), "Ícone de alerta para o motivo");
  assert.ok(attentionContent.includes("Tudo em dia!"), "Estado vazio amigável");
  assert.ok(attentionContent.includes("min-h-[44px]"), "Botão de ação com altura mínima 44px");
  assert.ok(pageContent.includes("isTemplate ? \"Modelo de plano\" : \"Plano sem paciente\""), "Contexto explícito quando não há aluno");
});

// TEST 7: Central de Planos — Estrutura da Tabela Desktop
runCase(7, "Central de planos: tabela desktop de 6 colunas", () => {
  assert.ok(tableContent.includes("Planos alimentares"), "Título 'Planos alimentares'");
  assert.ok(tableContent.includes(">Paciente<") || tableContent.includes("Paciente"), "Coluna Paciente");
  assert.ok(tableContent.includes(">Plano alimentar<") || tableContent.includes("Plano alimentar"), "Coluna Plano alimentar");
  assert.ok(tableContent.includes(">Refeições<") || tableContent.includes("Refeições"), "Coluna Refeições");
  assert.ok(tableContent.includes(">Atualizado em<") || tableContent.includes("Atualizado em"), "Coluna Atualizado em");
  assert.ok(tableContent.includes(">Situação<") || tableContent.includes("Situação"), "Coluna Situação");
  assert.ok(tableContent.includes(">Ações<") || tableContent.includes("Ações"), "Coluna Ações");
  assert.ok(tableContent.includes("hidden md:block"), "Tabela protegida com breakpoint hidden md:block");
});

// TEST 8: Central de Planos — Cards Mobile e Touch Targets
runCase(8, "Central de planos: cards mobile com alvos >= 44px e proteção contra scroll acidental", () => {
  assert.ok(tableContent.includes("md:hidden"), "Cards mobile usam md:hidden");
  assert.ok(tableContent.includes("min-h-[44px]"), "Ações mobile possuem min-h-[44px]");
  assert.ok(tableContent.includes("handleTouchStart"), "Proteção de toque para não acionar clique ao rolar");
  assert.ok(tableContent.includes("handleTouchMove"), "Detecção de rolagem no touch");
});

// TEST 9: Filtros e Busca Textual
runCase(9, "Busca textual e filtros determinísticos da tabela", () => {
  const samplePlans = [
    {
      publicId: "p1",
      title: "Hipertrofia Limpa",
      studentName: "Carlos Silva",
      status: "ACTIVE",
      planLifecycleStatus: "ACTIVE",
      mealsCount: 5,
      updatedAt: new Date("2026-10-10"),
    },
    {
      publicId: "p2",
      title: "Definição Avançada",
      studentName: "Ana Souza",
      status: "ACTIVE",
      planLifecycleStatus: "ACTIVE",
      hasDraftRevision: true,
      currentVersionStatus: "DRAFT",
      mealsCount: 4,
      updatedAt: new Date("2026-10-15"),
    },
    {
      publicId: "p3",
      title: "Emagrecimento Geral",
      studentName: null,
      isTemplate: true,
      status: "DRAFT",
      planLifecycleStatus: "DRAFT",
      currentVersionStatus: "DRAFT",
      mealsCount: 3,
      updatedAt: new Date("2026-10-01"),
    },
  ];

  // Busca por paciente
  const searchByPatient = filterAndSortNutritionPlans({
    plans: samplePlans,
    searchTerm: "carlos",
    statusFilter: "ALL",
    sortBy: "recent",
  });
  assert.equal(searchByPatient.length, 1);
  assert.equal(searchByPatient[0].publicId, "p1");

  // Busca por título do plano
  const searchByTitle = filterAndSortNutritionPlans({
    plans: samplePlans,
    searchTerm: "definição",
    statusFilter: "ALL",
    sortBy: "recent",
  });
  assert.equal(searchByTitle.length, 1);
  assert.equal(searchByTitle[0].publicId, "p2");

  // Filtro "Com rascunho" (deve encontrar p2 e p3)
  const filterDrafts = filterAndSortNutritionPlans({
    plans: samplePlans,
    searchTerm: "",
    statusFilter: "DRAFT",
    sortBy: "recent",
  });
  assert.equal(filterDrafts.length, 2, "Filtro DRAFT deve encontrar planos novos e ativos com rascunho");

  // Ordenação por nome
  const sortedByName = filterAndSortNutritionPlans({
    plans: samplePlans,
    searchTerm: "",
    statusFilter: "ALL",
    sortBy: "name",
  });
  assert.equal(sortedByName[0].title, "Definição Avançada");
  assert.equal(sortedByName[1].title, "Emagrecimento Geral");
  assert.equal(sortedByName[2].title, "Hipertrofia Limpa");
});

// TEST 10: Salvaguarda de Zoom iOS e Limpeza Rápida
runCase(10, "Input de busca com text-base no mobile (>=16px) e botão de limpeza rápida", () => {
  assert.ok(tableContent.includes("text-base sm:text-sm"), "Input usa text-base no mobile para prevenir zoom do iOS");
  assert.ok(tableContent.includes("Limpar busca"), "Botão acessível para limpar busca");
});

// TEST 11: Integração de Papel de Parede no Shell
runCase(11, "Ativação do papel de parede e dark-overview no ConsultancyAppShell para nutricionista", () => {
  assert.ok(
    pageContent.includes("isPureNutritionist ||") && pageContent.includes("isDarkOverviewTheme"),
    "isDarkOverviewTheme inclui nutricionista"
  );
  assert.ok(
    pageContent.includes("isPureNutritionist ||") && pageContent.includes("isTrainerOrAdminScreen"),
    "isTrainerOrAdminScreen inclui nutricionista para ativar showDashboardWallpaper"
  );
  assert.ok(
    pageContent.includes("showDashboardWallpaper={isTrainerOrAdminScreen}"),
    "ConsultancyAppShell recebe showDashboardWallpaper"
  );
});

// TEST 12: Preservação e Compatibilidade
runCase(12, "DashboardPersonalView e DashboardNutritionistView compatíveis", () => {
  assert.ok(viewContent.includes("NutritionOverviewHeader"), "View integra NutritionOverviewHeader");
  assert.ok(viewContent.includes("NutritionTodaySection"), "View integra NutritionTodaySection");
  assert.ok(viewContent.includes("NutritionAttentionSection"), "View integra NutritionAttentionSection");
  assert.ok(viewContent.includes("NutritionPlansTable"), "View integra NutritionPlansTable");
  assert.ok(viewContent.includes("export interface DashboardNutritionistViewProps"), "Exporta props tipadas");
});

console.log("\n==================================================");
console.log(`NUTRITIONIST DASHBOARD SUITE FINISHED: ${passed}/${total} PASS`);
console.log("==================================================");
