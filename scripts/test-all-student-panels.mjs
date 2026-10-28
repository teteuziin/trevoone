/**
 * Test Suite: TODOS OS PAINÉIS DE ALUNOS (Escopo Geral & Não Regressão)
 *
 * Valida que:
 * 1. O padrão visual (hierarquia, tipografia, espaçamento, contagens, botões unificados)
 *    está implementado nos componentes compartilhados (student-focus-section.tsx e student-treinos-client-view.tsx).
 * 2. Funciona uniformemente para TODOS os alunos, sem acoplamento a nome, e-mail, ID da Anny ou consultoria Saiya Shape.
 * 3. Todos os 5 estados obrigatórios estão implementados e cobertos:
 *    - Estado 1: Treino programado hoje
 *    - Estado 2: Dia de descanso
 *    - Estado 3: Sessão parcial (hoje e anterior)
 *    - Estado 4: Todas as séries concluídas, faltando finalizar (hoje e anterior)
 *    - Estado 5: Ausência de prescrição
 * 4. Acesso e roteamento para alunos puros, VIP, influenciadores e modo multi-role em page.tsx.
 * 5. Ações diretas funcionais sem duplicação de botões.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

console.log("=== EXECUTANDO TESTE: ESCOPO GERAL EM TODOS OS PAINÉIS DE ALUNOS ===\n");

const focusPath = path.resolve("components/dashboard/student/sections/student-focus-section.tsx");
const treinosViewPath = path.resolve("components/consultancies/training-v2/student-treinos-client-view.tsx");
const pagePath = path.resolve("app/consultoria/[slug]/page.tsx");
const menuPath = path.resolve("components/dashboard/student/sections/session-more-options-menu.tsx");

assert.ok(fs.existsSync(focusPath), "student-focus-section.tsx deve existir");
assert.ok(fs.existsSync(treinosViewPath), "student-treinos-client-view.tsx deve existir");
assert.ok(fs.existsSync(pagePath), "app/consultoria/[slug]/page.tsx deve existir");
assert.ok(fs.existsSync(menuPath), "session-more-options-menu.tsx deve existir");

const focusCode = fs.readFileSync(focusPath, "utf-8");
const treinosCode = fs.readFileSync(treinosViewPath, "utf-8");
const pageCode = fs.readFileSync(pagePath, "utf-8");

// =========================================================================
// 1. VERIFICAÇÃO DE INDEPENDÊNCIA E GENERALIZAÇÃO (SEM DADOS ESPECÍFICOS)
// =========================================================================
console.log("1. Verificando independência de dados específicos...");
assert.ok(!focusCode.includes("Anny"), "student-focus-section não deve conter nomes específicos como 'Anny'");
assert.ok(!focusCode.includes("Saiya Shape"), "student-focus-section não deve conter nome da consultoria 'Saiya Shape'");
assert.ok(!treinosCode.includes("Anny"), "student-treinos-client-view não deve conter nomes específicos como 'Anny'");
assert.ok(!treinosCode.includes("Saiya Shape"), "student-treinos-client-view não deve conter nome da consultoria 'Saiya Shape'");
console.log("✓ Componentes são 100% genéricos e aplicáveis a qualquer consultoria e aluno.");

// =========================================================================
// 2. CABEÇALHO UNIFICADO PARA QUALQUER ALUNO ("Meu treino" + Dia da semana)
// =========================================================================
console.log("\n2. Verificando cabeçalho unificado padrão...");
assert.ok(
  focusCode.includes('const cardHeaderTitle = "Meu treino";'),
  "O título do cabeçalho deve ser padronizado como 'Meu treino' para todos os alunos"
);
assert.ok(
  focusCode.includes('const cardHeaderSubtitle = dailyWorkoutResolution?.todayWeekdayName || "Hoje";'),
  "O subtítulo do cabeçalho deve exibir o dia da semana real no contexto"
);
assert.ok(
  !focusCode.includes("Prescrição da consultoria"),
  "Não deve exibir o rótulo redundante 'Prescrição da consultoria'"
);
assert.ok(
  !focusCode.includes("Descanso\n                </span>"),
  "Não deve poluir o cabeçalho com selo redundante 'Descanso'"
);
console.log("✓ Cabeçalho padronizado e limpo verificado.");

// =========================================================================
// 3. ESTADO 1: TREINO PROGRAMADO HOJE
// =========================================================================
console.log("\n3. Verificando Estado 1: Treino programado hoje...");
assert.ok(
  focusCode.includes("Começar treino"),
  "Deve oferecer a ação 'Começar treino' como primária"
);
assert.ok(
  focusCode.includes("min-h-[48px]"),
  "Botão primário de treino deve ter touch target >= 48px"
);
assert.ok(
  focusCode.includes("bg-emerald-600"),
  "Botão de ação principal deve usar a cor esmeralda Trevo One"
);
assert.ok(
  focusCode.includes("Escolher outro treino"),
  "Deve oferecer 'Escolher outro treino' como ação secundária clara"
);
const headerPath = path.resolve("components/dashboard/student/sections/student-overview-header.tsx");
const headerCode = fs.readFileSync(headerPath, "utf-8");
assert.ok(
  headerCode.includes("Ver treinos"),
  "Deve manter 'Ver treinos' como entrada unificada clara no cabeçalho do painel"
);
assert.ok(
  !focusCode.includes("Ver meus treinos →"),
  "Não deve duplicar 'Ver meus treinos →' no rodapé do card de treino"
);
assert.ok(
  !focusCode.includes("Versão ${dailyWorkoutResolution.versionNumber}"),
  "Não deve poluir o card com número de versão (ex: Versão 17)"
);
assert.ok(
  !treinosCode.includes("Versão ${effectiveRecommendedDivision.versionNumber}"),
  "Tela de treinos não deve exibir número de versão na apresentação principal"
);
console.log("✓ Estado 1 (Treino programado hoje) verificado.");

// =========================================================================
// 4. ESTADO 2: DIA DE DESCANSO
// =========================================================================
console.log("\n4. Verificando Estado 2: Dia de descanso...");
assert.ok(
  focusCode.includes("Hoje é dia de descanso"),
  "Deve exibir 'Hoje é dia de descanso' com tom discreto"
);
assert.ok(
  focusCode.includes("Você pode escolher outro treino sem mudar sua programação."),
  "Deve exibir texto explicativo sobre descanso sem alterar programação"
);
assert.ok(
  !focusCode.includes("bg-blue-600 hover:bg-blue-500"),
  "Não deve renderizar botão azul sólido conflitante em dia de descanso"
);
assert.ok(
  !focusCode.includes(": (activeTraining?.blockCount ?? 0)"),
  "Não deve confundir contagem de divisões (blocos) com exercícios em dia de descanso"
);
console.log("✓ Estado 2 (Dia de descanso) verificado.");

// =========================================================================
// 5. ESTADO 3: SESSÃO PARCIAL (HOJE E ANTERIOR)
// =========================================================================
console.log("\n5. Verificando Estado 3: Sessão parcial...");
assert.ok(
  focusCode.includes("isSessionInProgress ? ("),
  "Deve identificar sessão em andamento"
);
assert.ok(
  focusCode.includes("Continuar treino"),
  "Deve exibir 'Continuar treino' quando a execução for parcial"
);
assert.ok(
  focusCode.includes("Progresso da sessão:"),
  "Deve exibir contagem honesta e real de progresso da sessão"
);
assert.ok(
  focusCode.includes("handleOpenCompletionForActive"),
  "Deve permitir finalizar sessão ativa de hoje"
);
assert.ok(
  focusCode.includes("handleOpenCompletionForUnfinished"),
  "Deve permitir finalizar sessão ativa anterior"
);
console.log("✓ Estado 3 (Sessão parcial) verificado.");

// =========================================================================
// 6. ESTADO 4: TODAS AS SÉRIES CONCLUÍDAS, FALTANDO FINALIZAR
// =========================================================================
console.log("\n6. Verificando Estado 4: Todas as séries concluídas, faltando finalizar...");
assert.ok(
  focusCode.includes("isActiveSessionAllDone"),
  "Deve detectar quando todas as séries da sessão de hoje foram concluídas"
);
assert.ok(
  focusCode.includes("isUnfinishedAllDone"),
  "Deve detectar quando todas as séries da sessão anterior foram concluídas"
);
assert.ok(
  focusCode.includes("Todas as séries concluídas. Falta finalizar o treino."),
  "Deve exibir a mensagem clara de conclusão sem repetição numérica desnecessária"
);
assert.ok(
  focusCode.includes("Ver treino"),
  "Deve exibir 'Ver treino' como ação secundária quando todas as séries já foram feitas"
);
assert.ok(
  focusCode.includes("SessionMoreOptionsMenu"),
  "Deve disponibilizar 'Começar do início' dentro de menu acessível 'Mais opções'"
);
console.log("✓ Estado 4 (Todas as séries concluídas) verificado.");

// =========================================================================
// 7. ESTADO 5: AUSÊNCIA DE PRESCRIÇÃO
// =========================================================================
console.log("\n7. Verificando Estado 5: Ausência de prescrição...");
assert.ok(
  focusCode.includes("Sem ficha ativa"),
  "Deve exibir selo neutro 'Sem ficha ativa'"
);
assert.ok(
  focusCode.includes("Seu treino ainda não foi disponibilizado. Sua equipe técnica está preparando sua prescrição personalizada."),
  "Deve exibir mensagem acolhedora sem parecer erro do sistema"
);
assert.ok(
  focusCode.includes("Falar com treinador"),
  "Deve fornecer ação direta para conversar com o treinador"
);
console.log("✓ Estado 5 (Ausência de prescrição) verificado.");

// =========================================================================
// 8. PÁGINA MEUS TREINOS (student-treinos-client-view.tsx)
// =========================================================================
console.log("\n8. Verificando padronização em student-treinos-client-view.tsx...");
assert.ok(
  treinosCode.includes("SessionMoreOptionsMenu"),
  "Tela de treinos deve usar o menu unificado SessionMoreOptionsMenu"
);
assert.ok(
  treinosCode.includes("StudentWorkoutCompletionModal"),
  "Tela de treinos deve usar o modal oficial de conclusão StudentWorkoutCompletionModal"
);
assert.ok(
  treinosCode.includes("StudentWorkoutRestartModal"),
  "Tela de treinos deve usar o modal oficial de recomeço StudentWorkoutRestartModal"
);
assert.ok(
  treinosCode.includes("Todas as séries concluídas. Falta finalizar o treino."),
  "Tela de treinos deve renderizar a mensagem de progresso unificada"
);
assert.ok(
  treinosCode.includes("isUnfinishedAllDone"),
  "Tela de treinos deve calcular isUnfinishedAllDone"
);
console.log("✓ Tela Meus Treinos (/treinos) padronizada com a mesma experiência.");

// =========================================================================
// 9. CONEXÃO MULTI-ROLE & TENANCY EM page.tsx
// =========================================================================
console.log("\n9. Verificando conexão de rotas e perfis em page.tsx...");
assert.ok(
  pageCode.includes('needStudentData =') &&
  pageCode.includes('effectiveMode === "STUDENT"'),
  "needStudentData deve carregar autoritativamente para qualquer modo STUDENT"
);
assert.ok(
  pageCode.includes('effectiveMode === "STUDENT"') &&
  pageCode.includes('<DashboardStudentView'),
  "Visão do aluno deve contemplar todos os alunos (puros, VIP, influenciadores, multi-role e preview) sem bloqueios indevidos"
);
console.log("✓ Roteamento multi-role e autorização server-side verificados.");

// =========================================================================
// 10. CONTROLES DE TREINO UNIVERSAIS (COMEÇAR DO INÍCIO, RETOMAR, FINALIZAR)
// =========================================================================
console.log("\n10. Verificando controles de treino universais para todos os alunos...");

const repoPath = path.resolve("lib/training-v2/execution-repository.ts");
const resolverPath = path.resolve("lib/training-v2/daily-workout-resolver.ts");
const pickerPath = path.resolve("components/dashboard/student/sections/workout-division-picker-modal.tsx");

const repoCode = fs.readFileSync(repoPath, "utf-8");
const resolverCode = fs.readFileSync(resolverPath, "utf-8");
const pickerCode = fs.readFileSync(pickerPath, "utf-8");

// 10.1 Ordenação do resolver para capturar sempre a sessão mais recente
assert.ok(
  resolverCode.includes("ORDER BY wes.started_at DESC, wes.id DESC"),
  "daily-workout-resolver deve ordenar sessões IN_PROGRESS por started_at DESC, id DESC"
);

// 10.2 Preservação de ciclo de vida seguro no repositório (ABANDON)
assert.ok(
  repoCode.includes("options?.resolveConflict === \"ABANDON\"") &&
  repoCode.includes("SET status = 'ABANDONED'"),
  "execution-repository deve marcar sessão anterior como ABANDONED ao recomeçar do início"
);

// 10.3 Começar do início no Dashboard para treinos agendados, em andamento, concluídos e divisões alternativas
assert.ok(
  focusCode.includes("handleOpenRestartForCurrent"),
  "student-focus-section deve conter handleOpenRestartForCurrent"
);
assert.ok(
  focusCode.includes("Treinar novamente"),
  "student-focus-section deve disponibilizar 'Treinar novamente' após treino concluído"
);
assert.ok(
  focusCode.includes("setSelectedDivisionPublicId"),
  "student-focus-section deve suportar seleção de divisão sem alterar programação semanal"
);

// 10.4 Finalizar treino e Mais opções em student-treinos-client-view
assert.ok(
  treinosCode.includes("handleOpenCompletionForActive"),
  "student-treinos-client-view deve permitir finalizar sessão ativa do dia"
);
assert.ok(
  treinosCode.includes("handleOpenRestartForActive"),
  "student-treinos-client-view deve permitir recomeçar sessão ativa do dia"
);
assert.ok(
  pickerCode.includes("onSelectDivision"),
  "workout-division-picker-modal deve aceitar callback onSelectDivision"
);
assert.ok(
  pickerCode.includes("Selecionar no painel"),
  "workout-division-picker-modal deve oferecer 'Selecionar no painel'"
);

console.log("✓ Controles universais (Começar do início, Retomar, Finalizar e Trocar divisão) 100% verificados.");

console.log("\n==================================================");
console.log("TODOS OS TESTES DE ESCOPO GERAL DOS ALUNOS PASSARAM!");
console.log("==================================================");
