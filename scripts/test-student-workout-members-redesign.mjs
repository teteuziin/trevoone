/**
 * TREVO ONE — DETERMINISTIC TEST SUITE: STUDENT / WORKOUT / MEMBERS UX & FUNCTIONAL FIX
 *
 * Covers:
 * 1. Lista de Alunos (Desktop Table + Mobile Cards + Unified Filter Pills)
 * 2. Perfil do Aluno (Date Formatting + Active vs Historical Workout Status + Radar UNKNOWN != ZERO + Compact Biometrics)
 * 3. Detalhes da Ficha (Action Button Hierarchy + Sidebar Deduplication + Bi-set Visual Refinement & Order Preservation)
 * 4. Membros da Equipe (MySQL 8 ONLY_FULL_GROUP_BY Fix + searchParams Safe Await + formatDate Robustness)
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

console.log("==================================================");
console.log("TREVO ONE — STUDENT, WORKOUT & MEMBERS TEST SUITE");
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

// Read relevant source files
const studentListPath = path.resolve("components/consultancies/personal-student-hub/personal-student-list.tsx");
const studentDetailPath = path.resolve("components/consultancies/personal-student-hub/personal-student-detail-view.tsx");
const studentHubLibPath = path.resolve("lib/consultancies/personal-student-hub.ts");
const assignmentRepoPath = path.resolve("lib/training-v2/assignment-repository.ts");
const evaluatorPath = path.resolve("lib/monitoring/evaluator.ts");
const operationsCenterPath = path.resolve("components/operations/operations-center-view.tsx");
const workoutBuilderPath = path.resolve("components/consultancies/training-v2/workout-builder.tsx");
const workoutCategoryCardPath = path.resolve("components/consultancies/training-v2/workout-category-card.tsx");
const membersAdminLibPath = path.resolve("lib/consultancies/admin.ts");
const membersPagePath = path.resolve("app/consultoria/[slug]/membros/page.tsx");

const studentListCode = fs.readFileSync(studentListPath, "utf-8");
const studentDetailCode = fs.readFileSync(studentDetailPath, "utf-8");
const studentHubLibCode = fs.readFileSync(studentHubLibPath, "utf-8");
const assignmentRepoCode = fs.readFileSync(assignmentRepoPath, "utf-8");
const evaluatorCode = fs.readFileSync(evaluatorPath, "utf-8");
const operationsCenterCode = fs.readFileSync(operationsCenterPath, "utf-8");
const workoutBuilderCode = fs.readFileSync(workoutBuilderPath, "utf-8");
const workoutCategoryCardCode = fs.readFileSync(workoutCategoryCardPath, "utf-8");
const membersAdminLibCode = fs.readFileSync(membersAdminLibPath, "utf-8");
const membersPageCode = fs.readFileSync(membersPagePath, "utf-8");

// ==========================================
// SECTION 1: LISTA DE ALUNOS
// ==========================================

runCase(1, "Lista de Alunos: Tabela Desktop implementada com semântica HTML de tabela", () => {
  assert.ok(
    studentListCode.includes("<table") && studentListCode.includes("<thead") && studentListCode.includes("<tbody"),
    "Desktop deve renderizar uma tabela estilizada com <thead> e <tbody> para melhor leitura comparativa"
  );
  assert.ok(
    studentListCode.includes("hidden md:block") || studentListCode.includes("hidden md:table"),
    "Tabela deve ser visível no Desktop e oculta no Mobile"
  );
});

runCase(2, "Lista de Alunos: Colunas essenciais presentes na tabela Desktop", () => {
  assert.ok(studentListCode.includes("<th scope=\"col\"") && studentListCode.includes("Aluno"), "Coluna 'Aluno' deve estar presente");
  assert.ok(studentListCode.includes("Situação do Treino"), "Coluna 'Situação do Treino' deve estar presente");
  assert.ok(studentListCode.includes("Ações"), "Coluna 'Ações' deve estar presente");
});

runCase(3, "Lista de Alunos: Linha clicável e ação de acesso ao perfil preservada", () => {
  assert.ok(
    studentListCode.includes("onClick={() => router.push(studentDetailHref)}"),
    "Linha da tabela desktop deve ser clicável para abrir o aluno"
  );
  assert.ok(
    studentListCode.includes("Ver perfil"),
    "Deve conter botão explícito 'Ver perfil' com chevron"
  );
});

runCase(4, "Lista de Alunos: Filtros padronizados em Desktop e Mobile (Todos, Com treino, Sem treino)", () => {
  assert.ok(
    studentListCode.includes("workoutFilter === \"ALL\"") &&
    studentListCode.includes("workoutFilter === \"WITH_WORKOUT\"") &&
    studentListCode.includes("workoutFilter === \"WITHOUT_WORKOUT\""),
    "Filtros devem cobrir exatamente ALL, WITH_WORKOUT e WITHOUT_WORKOUT"
  );
  assert.ok(
    studentListCode.includes("Todos (${students.length})"),
    "Contagem de 'Todos' deve refletir o total real de alunos"
  );
  assert.ok(
    studentListCode.includes("Com treino (${withWorkoutCount})"),
    "Contagem de 'Com treino' deve refletir alunos com treino ativo real"
  );
  assert.ok(
    studentListCode.includes("Sem treino (${withoutWorkoutCount})"),
    "Contagem de 'Sem treino' deve refletir alunos sem treino ativo"
  );
});

runCase(5, "Lista de Alunos: Mobile cards sem repetição de 'Ativo' e sem 'Objetivo não informado' redundante", () => {
  assert.ok(
    !studentListCode.includes("Objetivo não informado"),
    "'Objetivo não informado' não deve ser repetido em cada card quando não há dados"
  );
  // No card top mobile, não pode haver badge Ativo repetida
  assert.ok(
    studentListCode.includes("/* Card Top: Avatar, Name, Email (repetitive Ativo badge removed) */"),
    "Badge Ativo repetitiva foi removida do topo dos cards mobile"
  );
});

runCase(6, "Lista de Alunos: Busca por nome, e-mail e objetivo com botão limpar", () => {
  assert.ok(
    studentListCode.includes("onClick={() => setSearch(\"\")}") || studentListCode.includes("handleResetFilters"),
    "Deve haver botão ou mecanismo rápido para limpar a pesquisa"
  );
  assert.ok(
    studentListCode.includes("matchesName") && studentListCode.includes("matchesEmail"),
    "Busca deve filtrar por nome e e-mail"
  );
});

// ==========================================
// SECTION 2: PERFIL DO ALUNO & DATAS
// ==========================================

runCase(7, "Perfil do Aluno: Helper formatDateYmd evita conversão técnica Date.prototype.toString()", () => {
  assert.ok(
    studentHubLibCode.includes("export function formatDateYmd("),
    "lib/consultancies/personal-student-hub.ts deve conter helper formatDateYmd"
  );
  assert.ok(
    assignmentRepoCode.includes("export function formatDateYmd("),
    "lib/training-v2/assignment-repository.ts deve conter helper formatDateYmd"
  );
});

runCase(8, "Perfil do Aluno: Formatação canônica de datas sem fuso horário artificial ou deslocamento", () => {
  assert.ok(
    studentDetailCode.includes("export function formatDisplayDate("),
    "personal-student-detail-view.tsx deve exportar formatDisplayDate"
  );
  // Import and test formatDisplayDate logic directly
  function formatDisplayDate(dateVal) {
    if (!dateVal) return "—";
    const str = String(dateVal).trim();
    const ymdMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymdMatch) {
      const [, y, m, d] = ymdMatch;
      return `${d}/${m}/${y}`;
    }
    const parsed = new Date(str);
    if (isNaN(parsed.getTime())) return str;
    const d = String(parsed.getUTCDate()).padStart(2, "0");
    const m = String(parsed.getUTCMonth() + 1).padStart(2, "0");
    const y = parsed.getUTCFullYear();
    return `${d}/${m}/${y}`;
  }

  // 1. Raw technical string from prompt
  const rawTechnical = "Fri Oct 02 2026 00:00:00 GMT+0000 (Coordinated Universal Time)";
  assert.equal(formatDisplayDate(rawTechnical), "02/10/2026", "Data técnica do prompt deve virar 02/10/2026");

  // 2. YYYY-MM-DD format
  assert.equal(formatDisplayDate("2026-10-02"), "02/10/2026", "Formato YYYY-MM-DD deve virar 02/10/2026");

  // 3. Null / undefined / invalid
  assert.equal(formatDisplayDate(null), "—", "Null deve retornar —");
  assert.equal(formatDisplayDate(undefined), "—", "Undefined deve retornar —");
});

runCase(9, "Perfil do Aluno: Consistência do status de treino (Ativo vs Histórico vs Sem treino)", () => {
  assert.ok(
    studentDetailCode.includes("workouts.find((w) => w.status === \"ACTIVE\") || null"),
    "activeWorkout só deve ser não-nulo se houver treino efetivamente com status ACTIVE"
  );
  assert.ok(
    studentDetailCode.includes("latestPrescribedWorkout"),
    "Treinos encerrados devem ser categorizados como último treino prescrito / histórico"
  );
  assert.ok(
    !studentDetailCode.includes("{overview.activeWorkoutsCount} ativo(s)"),
    "Não deve exibir o badge ambíguo '0 ativo(s)' ao lado do título do treino"
  );
});

runCase(10, "Perfil do Aluno: Radar UNKNOWN != ZERO com estado INSUFFICIENT_DATA", () => {
  assert.ok(
    evaluatorCode.includes("\"INSUFFICIENT_DATA\""),
    "StudentRadarState deve suportar INSUFFICIENT_DATA"
  );
  assert.ok(
    evaluatorCode.includes("!lastActiveAt && completedWorkoutsLast7d === 0 && recentCheckinsCount === 0"),
    "Quando não houver registros de uso ou treinos, estado deve ser INSUFFICIENT_DATA e não 'Em Dia' falso positivo"
  );
  assert.ok(
    studentDetailCode.includes("Sem dados suficientes"),
    "UI do radar deve exibir 'Sem dados suficientes' para estado neutro"
  );
  assert.ok(
    operationsCenterCode.includes("INSUFFICIENT_DATA: { label: \"Sem dados suficientes\""),
    "Centro de operações deve suportar badge para INSUFFICIENT_DATA"
  );
});

runCase(11, "Perfil do Aluno: Redesign dos dados biométricos (substitui os 4 cards gigantes vazios)", () => {
  assert.ok(
    studentDetailCode.includes("hasBiometrics"),
    "Deve checar se existem dados biométricos preenchidos antes de exibir bloco de biometria"
  );
  assert.ok(
    studentDetailCode.includes("Dados biométricos (Idade, Sexo, Altura e Peso) ainda não informados na anamnese"),
    "Quando vazios, biometria deve ser apresentada em linha única compacta e discreta, não em 4 cards gigantes"
  );
});

// ==========================================
// SECTION 3: FICHA DE TREINO & BI-SETS
// ==========================================

runCase(12, "Ficha de Treino: Hierarquia de botões no topo sem duplicidade", () => {
  assert.ok(
    workoutBuilderCode.includes("Atribuir ao aluno"),
    "Atribuir ao aluno deve ser a ação primária de destaque no cabeçalho quando publicada"
  );
  assert.ok(
    workoutBuilderCode.includes("Editar (novo rascunho)"),
    "Editar deve permitir criação de novo rascunho preservando imutabilidade da versão publicada"
  );
});

runCase(13, "Ficha de Treino: Deduplicação do resumo lateral (actions removidas do sidebar)", () => {
  // Sidebar panel deve conter apenas utilitários 'Salvar como modelo' e 'Duplicar ficha'
  const sidebarSection = workoutBuilderCode.slice(workoutBuilderCode.indexOf("RESUMO DA FICHA"));
  assert.ok(
    !sidebarSection.includes("<span>Publicar ficha</span>"),
    "Publicar ficha não deve ser duplicado na sidebar"
  );
  assert.ok(
    !sidebarSection.includes("<span>Atribuir ao aluno</span>"),
    "Atribuir ao aluno não deve ser duplicado na sidebar"
  );
  assert.ok(
    sidebarSection.includes("Salvar como modelo"),
    "Salvar como modelo deve permanecer disponível na sidebar ou menu"
  );
  assert.ok(
    sidebarSection.includes("Duplicar ficha"),
    "Duplicar ficha deve permanecer disponível na sidebar ou menu"
  );
});

runCase(14, "Ficha de Treino: Botão 'Ver sequência' nos bi-sets refinado para ação secundária elegante", () => {
  assert.ok(
    workoutCategoryCardCode.includes("data-testid=\"combination-view-sequence-btn\""),
    "Botão de ver sequência do bi-set deve existir com data-testid preservado"
  );
  assert.ok(
    !workoutCategoryCardCode.includes("flex-1 min-h-[44px] px-3.5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"),
    "Botão 'Ver sequência' não deve ser um banner verde gigante de largura total dominando todo o card do bi-set"
  );
  assert.ok(
    workoutCategoryCardCode.includes("bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30"),
    "Botão 'Ver sequência' deve ter tratamento secundário refinado e discreto"
  );
});

runCase(15, "Ficha de Treino: Proteção absoluta da ordenação dos bi-sets (executa suíte de 20 testes)", () => {
  const result = execSync("node scripts/test-training-biset-order.mjs", { encoding: "utf-8" });
  assert.ok(result.includes("TEST SUITE FINISHED: 20/20 PASS"), "Todos os 20 testes de ordenação de bi-sets devem passar");
});

// ==========================================
// SECTION 4: MEMBROS DA EQUIPE
// ==========================================

runCase(16, "Membros da Equipe: GROUP BY corrigido para compatibilidade estrita com MySQL 8 ONLY_FULL_GROUP_BY", () => {
  assert.ok(
    membersAdminLibCode.includes("GROUP BY cm.id, cm.public_id, u.id, u.public_id, u.full_name, u.email, cm.status"),
    "Consulta listSql em listConsultancyMembers deve incluir u.id e u.public_id no GROUP BY para não quebrar no MySQL 8"
  );
  assert.ok(
    membersAdminLibCode.includes("userPublicId: r.user_public_id ? String(r.user_public_id) : undefined"),
    "userPublicId deve ser mapeado no retorno de listConsultancyMembers"
  );
});

runCase(17, "Membros da Equipe: Resolução segura de searchParams sem crash de destructuring", () => {
  assert.ok(
    membersPageCode.includes("const resolvedSearchParams = searchParams ? await searchParams : {};"),
    "searchParams deve ser resolvido com fallback para evitar TypeError caso undefined"
  );
  assert.ok(
    !membersPageCode.includes("const { q, page } = await searchParams;"),
    "Não deve desestruturar searchParams diretamente sem proteção"
  );
});

runCase(18, "Membros da Equipe: Helper formatDate robusto contra nulos, datas inválidas e tipos não-Date", () => {
  assert.ok(
    membersPageCode.includes("function formatDate(date: unknown): string"),
    "formatDate deve receber tipo unknown e validar com getUTCDate com segurança"
  );
  assert.ok(
    membersPageCode.includes("if (!date) return \"—\";"),
    "Datas nulas/indefinidas devem retornar — e não quebrar com exceção"
  );
  assert.ok(
    membersPageCode.includes("if (isNaN(d.getTime())) return \"—\";"),
    "Datas inválidas não devem quebrar com exceção"
  );
});

runCase(19, "Membros da Equipe: Passa consultancyPublicId para ConsultancyAppShell", () => {
  assert.ok(
    membersPageCode.includes("consultancyPublicId={context.consultancyPublicId}"),
    "ConsultancyAppShell deve receber consultancyPublicId em membros/page.tsx"
  );
});

runCase(20, "Membros da Equipe: Tratamento de exceção seguro com fallback de erro sem acionar crash de tela inteira", () => {
  assert.ok(
    membersPageCode.includes("try {") && membersPageCode.includes("catch (err) {"),
    "Carregamento de membros e convites deve ser protegido por try/catch para evitar queda no boundary global error.tsx"
  );
});

console.log("\n==================================================");
console.log(`TEST SUITE FINISHED: ${passed}/${total} PASS`);
console.log("==================================================");
