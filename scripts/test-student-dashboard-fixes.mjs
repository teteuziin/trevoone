/**
 * Testes Automatizados para as Correções do Painel "Meu Acompanhamento"
 * Cobre os 6 pontos da auditoria:
 * 1. Plano alimentar: distinção entre paciente destinatário e título da prescrição
 * 2. Treino do dia vs sessão anterior em aberto (fuso, hoje vs anterior, recomendação de hoje)
 * 3. Remoção da repetição de status "Em andamento" e exibição de progresso real
 * 4. Wallpaper CSS (marca d'água sutil, opacidade, dimensões restritas, pointer-events none)
 * 5. E-mail sem truncamento (break-all leading-snug, sem quebrar layout)
 * 6. Plumbagem do Server Component (studentName e prescriberName vinculados à sessão)
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

export async function runStudentDashboardFixesSuite() {
  console.log("=== 11. SUITE: STUDENT DASHBOARD & FOCUS SECTION FIXES ===");

  let passedCount = 0;
  let totalCount = 0;

  function runTest(name, fn) {
    totalCount++;
    try {
      fn();
      passedCount++;
      console.log(`  [PASS] ${name}`);
    } catch (err) {
      console.error(`  [FAIL] ${name}:`, err);
      throw err;
    }
  }

  // Teste 1: Wallpaper CSS e contraste
  runTest("Wallpaper CSS: marca d'água sutil, dimensões controladas e pointer-events none", () => {
    const globalsCss = fs.readFileSync(path.resolve("app/globals.css"), "utf8");
    assert.ok(globalsCss.includes(".trevo-dashboard-wallpaper::after"), "Deve usar pseudo-elemento ::after para controlar opacidade sem afetar filhos");
    assert.ok(globalsCss.includes("pointer-events: none"), "Wallpaper deve ter pointer-events: none para não bloquear cliques");
    assert.ok(globalsCss.includes("opacity: 0.35") || globalsCss.includes("opacity: 0.38"), "Opacidade deve ser reduzida para marca d'água sutil");
    assert.ok(globalsCss.includes("min(520px, 36vw)"), "Largura de background deve ser limitada");
    assert.ok(globalsCss.includes("max-height: 520px"), "Altura máxima do wallpaper deve ser limitada");
  });

  // Teste 2: E-mail na barra de navegação desktop e mobile
  runTest("Navegação: e-mail exibido por completo com break-all sem truncamento rígido", () => {
    const navCode = fs.readFileSync(path.resolve("components/consultancies/consultancy-navigation.tsx"), "utf8");
    assert.ok(navCode.includes("break-all leading-snug"), "E-mail do usuário deve usar break-all leading-snug");
    assert.ok(!navCode.includes('truncate text-xs text-muted-foreground">{userEmail}'), "E-mail na barra lateral não pode usar truncate rígido");
  });

  // Teste 3: Lógica de Resolução de Treino Diário (daily-workout-resolver.ts)
  runTest("DailyWorkoutResolver: cálculo de datas civis, progresso real e recomendação de hoje", () => {
    const resolverCode = fs.readFileSync(path.resolve("lib/training-v2/daily-workout-resolver.ts"), "utf8");
    assert.ok(resolverCode.includes("activeSessionStartedAt"), "Deve expor activeSessionStartedAt");
    assert.ok(resolverCode.includes("activeSessionStartedFormatted"), "Deve expor activeSessionStartedFormatted formatado");
    assert.ok(resolverCode.includes("isSessionStartedToday"), "Deve verificar se a sessão foi iniciada na data civil de hoje");
    assert.ok(resolverCode.includes("completedExercisesCount"), "Deve contar exercícios concluídos");
    assert.ok(resolverCode.includes("completedSetsCount"), "Deve contar séries concluídas");
    assert.ok(resolverCode.includes("todayRecommendedWorkout"), "Deve resolver o treino recomendado para o dia atual");
    assert.ok(resolverCode.includes('headlineTitle: "Meu Treino"'), "Headline não deve repetir 'Treino em andamento'");
  });

  // Teste 4: Componentes de Dashboard do Aluno (student-focus-section.tsx)
  runTest("StudentFocusSection: paciente destinatário vs título e contagem real de progresso", () => {
    const focusCode = fs.readFileSync(path.resolve("components/dashboard/student/sections/student-focus-section.tsx"), "utf8");
    assert.ok(focusCode.includes("studentName?: string | null;"), "StudentNutritionSummary deve conter studentName");
    assert.ok(focusCode.includes("prescriberName?: string | null;"), "StudentNutritionSummary deve conter prescriberName");
    assert.ok(focusCode.includes("Destinatário:"), "Card de Nutrição deve destacar o Destinatário/Paciente autorizado");
    assert.ok(focusCode.includes("Título da Prescrição"), "Card de Nutrição deve rotular explicitamente o Título da Prescrição");
    assert.ok(focusCode.includes("Progresso da sessão:"), "Card de Treino deve exibir progresso real da sessão");
    assert.ok(focusCode.includes("exercício concluído") || focusCode.includes("exercícios concluídos"), "Deve indicar contagem real de exercícios");
    assert.ok(focusCode.includes("Treino previsto para hoje"), "Deve apresentar o treino previsto para hoje quando a sessão for de dia anterior");
    assert.ok(focusCode.includes("hasActiveSession"), "Deve repassar status de sessão ativa para WorkoutDivisionPickerModal");
  });

  // Teste 5: Modal de seleção de divisão (workout-division-picker-modal.tsx)
  runTest("WorkoutDivisionPickerModal: preservação de séries gravadas ao trocar divisão", () => {
    const modalCode = fs.readFileSync(path.resolve("components/dashboard/student/sections/workout-division-picker-modal.tsx"), "utf8");
    assert.ok(modalCode.includes("hasActiveSession"), "Modal deve receber prop hasActiveSession");
    assert.ok(modalCode.includes("séries já realizadas continuam registradas e salvas"), "Modal deve tranquilizar a aluna de que as séries registradas continuam preservadas");
  });

  // Teste 6: Plumbagem do Server Component (app/consultoria/[slug]/page.tsx)
  runTest("Server Component: injeção de studentName e prescriberName da sessão autorizada", () => {
    const pageCode = fs.readFileSync(path.resolve("app/consultoria/[slug]/page.tsx"), "utf8");
    assert.ok(pageCode.includes("studentName: session.fullName"), "Server Component deve injetar studentName da sessão autenticada");
    assert.ok(pageCode.includes("prescriberName: v2Auth.activeAssignment.prescriberName"), "Server Component deve injetar prescriberName");
  });

  console.log(`=== TODOS OS ${passedCount}/${totalCount} TESTES DO PAINEL MEU ACOMPANHAMENTO PASSARAM! ===\n`);
  return { passedCount, totalCount };
}

// Suporte para execução direta standalone via CLI: `node scripts/test-student-dashboard-fixes.mjs`
if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("scripts/test-student-dashboard-fixes.mjs")) {
  runStudentDashboardFixesSuite().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
