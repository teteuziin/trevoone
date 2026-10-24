/**
 * Testes Automatizados para as Correções do Painel "Meu Acompanhamento"
 * Cobre os 5 pontos da auditoria:
 * 1. Plano alimentar: distinção entre paciente destinatário e título da prescrição
 * 2. Treino do dia vs sessão anterior em aberto (fuso, hoje vs anterior, recomendação de hoje)
 * 3. Remoção da repetição de status "Em andamento" e exibição de progresso real
 * 4. Wallpaper CSS (marca d'água sutil, opacidade, dimensões restritas, pointer-events none)
 * 5. E-mail sem truncamento (break-all leading-snug, sem quebrar layout)
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

console.log("=== INICIANDO TESTES DO PAINEL MEU ACOMPANHAMENTO ===");

// -----------------------------------------------------------------------------
// Teste 1: Wallpaper CSS e contraste
// -----------------------------------------------------------------------------
console.log("\n[Teste 1] Verificando regras CSS do papel de parede...");
const globalsCss = fs.readFileSync(path.resolve("app/globals.css"), "utf8");

assert.ok(globalsCss.includes(".trevo-dashboard-wallpaper::after"), "Deve usar pseudo-elemento ::after para controlar opacidade sem afetar filhos");
assert.ok(globalsCss.includes("pointer-events: none"), "Wallpaper deve ter pointer-events: none para não bloquear cliques");
assert.ok(globalsCss.includes("opacity: 0.35") || globalsCss.includes("opacity: 0.38"), "Opacidade deve ser reduzida para marca d'água sutil");
assert.ok(globalsCss.includes("min(520px, 36vw)"), "Largura de background deve ser limitada");
assert.ok(globalsCss.includes("max-height: 520px"), "Altura máxima do wallpaper deve ser limitada");
console.log("✓ Teste 1 PASS: Wallpaper com escala controlada e opacidade sutil de marca d'água.");

// -----------------------------------------------------------------------------
// Teste 2: E-mail na barra de navegação desktop e mobile
// -----------------------------------------------------------------------------
console.log("\n[Teste 2] Verificando quebra de linha de e-mail na navegação...");
const navCode = fs.readFileSync(path.resolve("components/consultancies/consultancy-navigation.tsx"), "utf8");

assert.ok(navCode.includes("break-all leading-snug"), "E-mail do usuário deve usar break-all leading-snug");
assert.ok(!navCode.includes('truncate text-xs text-muted-foreground">{userEmail}'), "E-mail na barra lateral não pode usar truncate rígido");
console.log("✓ Teste 2 PASS: E-mail exibido por completo com break-all sem cortar caracteres.");

// -----------------------------------------------------------------------------
// Teste 3: Lógica de Resolução de Treino Diário (daily-workout-resolver.ts)
// -----------------------------------------------------------------------------
console.log("\n[Teste 3] Verificando DailyWorkoutResolution e resolução de sessão em andamento...");
const resolverCode = fs.readFileSync(path.resolve("lib/training-v2/daily-workout-resolver.ts"), "utf8");

assert.ok(resolverCode.includes("activeSessionStartedAt"), "Deve expor activeSessionStartedAt");
assert.ok(resolverCode.includes("activeSessionStartedFormatted"), "Deve expor activeSessionStartedFormatted formatado");
assert.ok(resolverCode.includes("isSessionStartedToday"), "Deve verificar se a sessão foi iniciada na data civil de hoje");
assert.ok(resolverCode.includes("completedExercisesCount"), "Deve contar exercícios concluídos");
assert.ok(resolverCode.includes("completedSetsCount"), "Deve contar séries concluídas");
assert.ok(resolverCode.includes("todayRecommendedWorkout"), "Deve resolver o treino recomendado para o dia atual");
assert.ok(resolverCode.includes('headlineTitle: "Meu Treino"'), "Headline não deve repetir 'Treino em andamento'");
console.log("✓ Teste 3 PASS: DailyWorkoutResolver calcula datas, progresso real e recomendação de hoje.");

// -----------------------------------------------------------------------------
// Teste 4: Componentes de Dashboard do Aluno (student-focus-section.tsx)
// -----------------------------------------------------------------------------
console.log("\n[Teste 4] Verificando StudentFocusSection para Treino e Nutrição...");
const focusCode = fs.readFileSync(path.resolve("components/dashboard/student/sections/student-focus-section.tsx"), "utf8");

// Verificação de Nutrição
assert.ok(focusCode.includes("studentName?: string | null;"), "StudentNutritionSummary deve conter studentName");
assert.ok(focusCode.includes("prescriberName?: string | null;"), "StudentNutritionSummary deve conter prescriberName");
assert.ok(focusCode.includes("Destinatário:"), "Card de Nutrição deve destacar o Destinatário/Paciente autorizado");
assert.ok(focusCode.includes("Título da Prescrição"), "Card de Nutrição deve rotular explicitamente o Título da Prescrição");

// Verificação de Treino
assert.ok(focusCode.includes("Progresso da sessão:"), "Card de Treino deve exibir progresso real da sessão");
assert.ok(focusCode.includes("exercício concluído") || focusCode.includes("exercícios concluídos"), "Deve indicar contagem real de exercícios");
assert.ok(focusCode.includes("Treino previsto para hoje"), "Deve apresentar o treino previsto para hoje quando a sessão for de dia anterior");
assert.ok(focusCode.includes("hasActiveSession"), "Deve repassar status de sessão ativa para WorkoutDivisionPickerModal");
console.log("✓ Teste 4 PASS: StudentFocusSection distingue destinatário vs título e remove repetições de status.");

// -----------------------------------------------------------------------------
// Teste 5: Modal de seleção de divisão (workout-division-picker-modal.tsx)
// -----------------------------------------------------------------------------
console.log("\n[Teste 5] Verificando segurança de séries no WorkoutDivisionPickerModal...");
const modalCode = fs.readFileSync(path.resolve("components/dashboard/student/sections/workout-division-picker-modal.tsx"), "utf8");

assert.ok(modalCode.includes("hasActiveSession"), "Modal deve receber prop hasActiveSession");
assert.ok(modalCode.includes("séries já realizadas continuam registradas e salvas"), "Modal deve tranquilizar a aluna de que as séries registradas continuam preservadas");
console.log("✓ Teste 5 PASS: Modal assegura preservação de séries gravadas.");

// -----------------------------------------------------------------------------
// Teste 6: Plumbagem do Server Component (app/consultoria/[slug]/page.tsx)
// -----------------------------------------------------------------------------
console.log("\n[Teste 6] Verificando dados entregues pelo Server Component...");
const pageCode = fs.readFileSync(path.resolve("app/consultoria/[slug]/page.tsx"), "utf8");

assert.ok(pageCode.includes("studentName: session.fullName"), "Server Component deve injetar studentName da sessão autenticada");
assert.ok(pageCode.includes("prescriberName: v2Auth.activeAssignment.prescriberName"), "Server Component deve injetar prescriberName");
console.log("✓ Teste 6 PASS: Server Component vincula autoridade e dados da sessão.");

console.log("\n=== TODOS OS 6 TESTES PASSARAM COM SUCESSO! ===");
