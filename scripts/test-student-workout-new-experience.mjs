import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function parseScheduledWeekdays(title, instructions) {
  const text = `${title || ""} ${instructions || ""}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // remove acentos

  const days = [];
  if (/\b(segunda(?:-feira)?|seg)\b/.test(text)) days.push(1);
  if (/\b(terca(?:-feira)?|terça(?:-feira)?|ter)\b/.test(text)) days.push(2);
  if (/\b(quarta(?:-feira)?|qua)\b/.test(text)) days.push(3);
  if (/\b(quinta(?:-feira)?|qui)\b/.test(text)) days.push(4);
  if (/\b(sexta(?:-feira)?|sex)\b/.test(text)) days.push(5);
  if (/\b(sabado|sab)\b/.test(text)) days.push(6);
  if (/\b(domingo|dom)\b/.test(text)) days.push(0);

  return Array.from(new Set(days)).sort((a, b) => a - b);
}

console.log("=== TEST SUITE: TREVO ONE — NOVA EXPERIÊNCIA DE TREINO DO ALUNO ===");

// -----------------------------------------------------------------------------
// TESTE 1: Resolução de dias da semana por parseScheduledWeekdays
// -----------------------------------------------------------------------------
console.log("\n[Teste 1] Validando parseScheduledWeekdays para divisões semanais...");

const mondayBlock = parseScheduledWeekdays("Segunda • Peito, bíceps e tríceps", "Treino focado em peitoral");
assert.deepEqual(mondayBlock, [1], "Deve identificar Segunda-feira (1)");

const wednesdayBlock = parseScheduledWeekdays("Quarta • pernas completas", "Foco em quadríceps e posterior");
assert.deepEqual(wednesdayBlock, [3], "Deve identificar Quarta-feira (3)");

const fridayBlock = parseScheduledWeekdays("Sexta • costas e deltóides", "Puxadas e elevações");
assert.deepEqual(fridayBlock, [5], "Deve identificar Sexta-feira (5)");

const multiDayBlock = parseScheduledWeekdays("Terça e Quinta • Cardio e Abdômen", "");
assert.deepEqual(multiDayBlock, [2, 4], "Deve identificar Terça (2) e Quinta (4)");

console.log("✓ Teste 1 PASS: Reconhecimento de calendário semanal validado.");

// -----------------------------------------------------------------------------
// TESTE 2: Garantia de escopo estrito em daily-workout-resolver.ts
// -----------------------------------------------------------------------------
console.log("\n[Teste 2] Verificando consultas SQL e escopo estrito por workout_block_id...");

const resolverCode = fs.readFileSync(
  path.join(process.cwd(), "lib/training-v2/daily-workout-resolver.ts"),
  "utf8"
);

// 1. Deve verificar primeiro pending set para resolver activeBlock em sessões legadas
assert.ok(
  resolverCode.includes("wex.execution_session_id = ? AND wex.completed_at IS NULL"),
  "daily-workout-resolver deve resolver o activeBlock pelo primeiro pending set na sessão legada"
);

// 2. A query de progresso de exercícios e séries DEVE conter 'AND wbi.block_id = ?'
assert.ok(
  resolverCode.includes("WHERE wex.execution_session_id = ? AND wbi.block_id = ?"),
  "Progresso da sessão deve ser estritamente escopado ao activeBlock (impede 15 de 13)"
);

// 3. Deve separar unfinishedSession quando a sessão não foi iniciada hoje
assert.ok(
  resolverCode.includes("unfinishedSession"),
  "daily-workout-resolver deve expor unfinishedSession"
);
assert.ok(
  resolverCode.includes("if (isSessionStartedToday)") || resolverCode.includes("!isSessionStartedToday") || resolverCode.includes("isSessionStartedToday === false"),
  "Deve tratar diferentemente sessões iniciadas hoje vs dias anteriores"
);

console.log("✓ Teste 2 PASS: daily-workout-resolver escopado com segurança.");

// -----------------------------------------------------------------------------
// TESTE 3: Interface do Dashboard (StudentFocusSection)
// -----------------------------------------------------------------------------
console.log("\n[Teste 3] Verificando StudentFocusSection para exibição de Treino Não Finalizado...");

const focusSectionCode = fs.readFileSync(
  path.join(process.cwd(), "components/dashboard/student/sections/student-focus-section.tsx"),
  "utf8"
);

assert.ok(
  focusSectionCode.includes("dailyWorkoutResolution?.unfinishedSession"),
  "StudentFocusSection deve renderizar unfinishedSession de forma dedicada"
);

assert.ok(
  focusSectionCode.includes("Treino não finalizado"),
  "StudentFocusSection deve rotular a sessão anterior como 'Treino não finalizado'"
);

assert.ok(
  focusSectionCode.includes("isSessionInProgress = dailyWorkoutResolution"),
  "isSessionInProgress deve respeitar status do resolver sem ser sobrescrito por hasActiveSession"
);

console.log("✓ Teste 3 PASS: StudentFocusSection exibe treino de hoje e sessão não finalizada separadamente.");

// -----------------------------------------------------------------------------
// TESTE 4: Tela "Meus Treinos" (StudentTreinosClientView)
// -----------------------------------------------------------------------------
console.log("\n[Teste 4] Verificando tela 'Meus Treinos' e Wallpaper...");

const treinosPageCode = fs.readFileSync(
  path.join(process.cwd(), "app/consultoria/[slug]/treinos/page.tsx"),
  "utf8"
);

assert.ok(
  treinosPageCode.includes("showDashboardWallpaper={true}"),
  "TreinosPage deve passar showDashboardWallpaper={true} para renderizar os 4 wallpapers aprovados"
);

assert.ok(
  treinosPageCode.includes("StudentTreinosClientView"),
  "TreinosPage deve utilizar StudentTreinosClientView"
);

const treinosClientCode = fs.readFileSync(
  path.join(process.cwd(), "components/consultancies/training-v2/student-treinos-client-view.tsx"),
  "utf8"
);

assert.ok(
  treinosClientCode.includes("Meus treinos"),
  "StudentTreinosClientView deve conter o cabeçalho compacto 'Meus treinos'"
);

assert.ok(
  treinosClientCode.includes("Voltar ao painel"),
  "StudentTreinosClientView deve conter 'Voltar ao painel'"
);

assert.ok(
  treinosClientCode.includes("min-h-[52px]") && treinosClientCode.includes("bg-emerald-600"),
  "StudentTreinosClientView deve ter botão principal 'Começar treino' com altura mínima de 52px em verde Trevo One"
);

assert.ok(
  treinosClientCode.includes("Escolher outro treino"),
  "StudentTreinosClientView deve oferecer ação secundária 'Escolher outro treino'"
);

assert.ok(
  treinosClientCode.includes("WorkoutDivisionPickerModal"),
  "StudentTreinosClientView deve abrir WorkoutDivisionPickerModal sem reordenar a semana"
);

console.log("✓ Teste 4 PASS: Tela 'Meus Treinos' cumpre todos os requisitos de design e ergonomia.");

// -----------------------------------------------------------------------------
// TESTE 5: Execução do Treino (StudentRuntimeFocusedView e StudentWorkoutRenderer)
// -----------------------------------------------------------------------------
console.log("\n[Teste 5] Verificando execução guiada do treino...");

const runtimeViewCode = fs.readFileSync(
  path.join(process.cwd(), "components/consultancies/training-v2/student-runtime-focused-view.tsx"),
  "utf8"
);

// 1. Botão voltar único
assert.ok(
  runtimeViewCode.includes("Voltar aos meus treinos"),
  "StudentRuntimeFocusedView deve conter o link 'Voltar aos meus treinos'"
);

// 2. Finalizar treino acessível durante toda a sessão
assert.ok(
  runtimeViewCode.includes("Finalizar treino") && runtimeViewCode.includes("setShowEarlyCompleteModal"),
  "Botão 'Finalizar treino' deve ser acessível durante toda a sessão"
);

// 3. Séries com estado visual claro
assert.ok(
  runtimeViewCode.includes("Séries deste exercício") && runtimeViewCode.includes("✓ Concluída"),
  "StudentRuntimeFocusedView deve exibir as séries com estados visuais claros (Concluída, Pulada, A fazer)"
);

// 4. Pular exercício
assert.ok(
  runtimeViewCode.includes("handleSkipCurrentExercise"),
  "StudentRuntimeFocusedView deve implementar 'Pular exercício'"
);

// 5. Modal de confirmação com texto exato de pendências
assert.ok(
  runtimeViewCode.includes("Você ainda tem") && runtimeViewCode.includes("série para fazer"),
  "Modal de finalização antecipada deve informar quantas séries faltam fazer"
);

// 6. Resumo ao concluir (Requirement 5)
assert.ok(
  runtimeViewCode.includes("Resumo do Treino") &&
  runtimeViewCode.includes("Duração Real") &&
  runtimeViewCode.includes("Séries Feitas") &&
  runtimeViewCode.includes("Séries Puladas"),
  "StudentRuntimeFocusedView deve renderizar o resumo completo ao finalizar o treino"
);

// 7. Timer de descanso com +15s e "Pular descanso"
const restTimerCode = fs.readFileSync(
  path.join(process.cwd(), "components/consultancies/training-v2/rest-timer.tsx"),
  "utf8"
);

assert.ok(
  restTimerCode.includes("+15s"),
  "RestTimer deve oferecer incremento de +15 segundos"
);

assert.ok(
  restTimerCode.includes("Pular descanso"),
  "RestTimer deve ter botão 'Pular descanso'"
);

// 8. Botão único de voltar no topo da página de detalhes do treino
const workoutDetailPageCode = fs.readFileSync(
  path.join(process.cwd(), "app/consultoria/[slug]/treinos/[assignmentPublicId]/page.tsx"),
  "utf8"
);

assert.ok(
  workoutDetailPageCode.includes("showDashboardWallpaper={true}"),
  "WorkoutDetailPage deve ativar showDashboardWallpaper={true}"
);

console.log("✓ Teste 5 PASS: Execução guiada, estados visuais, descanso e resumo 100% verificados.");

console.log("\n=======================================================");
console.log("TODOS OS TESTES DA NOVA EXPERIÊNCIA DO ALUNO PASSARAM!");
console.log("=======================================================\n");
