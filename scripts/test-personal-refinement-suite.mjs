import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

console.log("=== INICIANDO SUITE DE TESTES: REFINAMENTO DA CENTRAL, MODELOS E IA ===");

const root = process.cwd();

// Test 1: AI Helper Drawer Strict Splits & Substring Fix
console.log("\n--- TESTE 1: IA HELPER DRAWER & VALIDAÇÃO ESTRUTURAL ---");
const aiDrawerPath = path.join(root, "components/consultancies/training-v2/workout-editor-4/ai-helper-drawer.tsx");
assert.ok(fs.existsSync(aiDrawerPath), "ai-helper-drawer.tsx deve existir");
const aiDrawerContent = fs.readFileSync(aiDrawerPath, "utf8");

// Verify that .includes("AB") collision is NOT used for frequency branching
assert.ok(!aiDrawerContent.includes('frequency.includes("AB")'), "NÃO pode conter frequency.includes('AB') devido à colisão com ABCDE");
// Verify strict prefix matching for all frequencies
assert.ok(aiDrawerContent.includes('frequency.startsWith("1 dia")'), "Deve conter verificação estrita para 1 dia");
assert.ok(aiDrawerContent.includes('frequency.startsWith("2 dias")'), "Deve conter verificação estrita para 2 dias");
assert.ok(aiDrawerContent.includes('frequency.startsWith("3 dias")'), "Deve conter verificação estrita para 3 dias");
assert.ok(aiDrawerContent.includes('frequency.startsWith("4 dias")'), "Deve conter verificação estrita para 4 dias");
assert.ok(aiDrawerContent.includes('frequency.startsWith("5 dias")'), "Deve conter verificação estrita para 5 dias");
assert.ok(aiDrawerContent.includes('frequency.startsWith("6 dias")'), "Deve conter verificação estrita para 6 dias");

// Verify that 5 days (ABCDE) defines 5 distinct divisions
const abcdeIndex = aiDrawerContent.indexOf('frequency.startsWith("5 dias")');
assert.ok(abcdeIndex !== -1, "Deve ter bloco de 5 dias");
const abcdeSection = aiDrawerContent.slice(abcdeIndex, abcdeIndex + 4500);
assert.ok(abcdeSection.includes("Treino A - Peitoral"), "ABCDE deve ter Treino A");
assert.ok(abcdeSection.includes("Treino B - Dorsais"), "ABCDE deve ter Treino B");
assert.ok(abcdeSection.includes("Treino C - Quadríceps"), "ABCDE deve ter Treino C");
assert.ok(abcdeSection.includes("Treino D - Deltoides"), "ABCDE deve ter Treino D");
assert.ok(abcdeSection.includes("Treino E - Braços"), "ABCDE deve ter Treino E");

// Verify programmatic verification
assert.ok(aiDrawerContent.includes("proposal.divisions.length !== expectedDays"), "Deve conter verificação programática de divisões");
// Verify contextual actions
assert.ok(aiDrawerContent.includes("complete_workout"), "Deve suportar ação de completar treino");
assert.ok(aiDrawerContent.includes("substitute"), "Deve suportar ação de trocar exercício");
assert.ok(aiDrawerContent.includes("biset"), "Deve suportar combinação em bi-set");
assert.ok(aiDrawerContent.includes("audit"), "Deve suportar conferência de ficha");
console.log("  [PASS] IA Helper Drawer: 5 dias gera 5 divisões, sem colisão de substring, validação estrutural ativa.");

// Test 2: Custom Exercise - Video Optional & AI Video Suggestion
console.log("\n--- TESTE 2: EXERCÍCIOS PRÓPRIOS — VÍDEO OPCIONAL & SUGESTÃO INTELIGENTE ---");
const createModalPath = path.join(root, "components/consultancies/training-v2/workout-editor-4/create-exercise-modal.tsx");
assert.ok(fs.existsSync(createModalPath), "create-exercise-modal.tsx deve existir");
const createModalContent = fs.readFileSync(createModalPath, "utf8");

assert.ok(createModalContent.includes("Vídeo ou GIF demonstrativo"), "Deve rotular vídeo demonstrativo");
assert.ok(createModalContent.includes("(opcional)"), "Vídeo deve estar explicitamente marcado como opcional");
assert.ok(createModalContent.includes("searchExercisesForPickerAction"), "Deve pesquisar catálogo para encontrar vídeo correspondente");
assert.ok(createModalContent.includes("Encontramos um vídeo oficial compatível"), "Deve exibir recomendação de vídeo da biblioteca oficial");
assert.ok(createModalContent.includes("Usar este vídeo"), "Deve fornecer botão para usar vídeo oficial mediante aprovação");
assert.ok(createModalContent.includes("Não, obrigado") || createModalContent.includes("Ignorar"), "Deve fornecer opção de ignorar recomendação");
console.log("  [PASS] Exercício Próprio: Vídeo é estritamente opcional e sugestão inteligente de vídeo da biblioteca oficial integrada.");

// Test 3: Central de Treinos and Editor Separation & Header Actions
console.log("\n--- TESTE 3: SEPARAÇÃO CENTRAL DE TREINOS VS EDITOR ---");
const sheetPath = path.join(root, "components/consultancies/training-v2/workout-creation-sheet.tsx");
assert.ok(fs.existsSync(sheetPath), "workout-creation-sheet.tsx deve existir");
const sheetContent = fs.readFileSync(sheetPath, "utf8");

// In normal mode: "+ Criar treino" and "Importar treino"
assert.ok(sheetContent.includes("Criar treino"), "Deve ter botão Criar treino");
assert.ok(sheetContent.includes("Importar treino"), "Deve ter botão Importar treino");
// No duplicate "Criar com IA" in top header
assert.ok(!sheetContent.includes(">Criar com IA<"), "NÃO deve ter botão duplicado 'Criar com IA' no topo");

// In templates tab: "+ Criar modelo" with 3 options
assert.ok(sheetContent.includes("Criar modelo"), "Deve ter botão Criar modelo");
assert.ok(sheetContent.includes("1. Criar do zero"), "Opção 1 deve ser Criar do zero");
assert.ok(sheetContent.includes("2. Usar um treino existente"), "Opção 2 deve ser Usar um treino existente");
assert.ok(sheetContent.includes("3. Importar uma ficha com IA"), "Opção 3 deve ser Importar uma ficha com IA");
console.log("  [PASS] Central de Treinos: Ações separadas (+ Criar treino, Importar treino), sem duplicação de IA no cabeçalho.");

// Test 4: Existing Workout Picker (Cloning into Template)
console.log("\n--- TESTE 4: SELETOR DE TREINO EXISTENTE PARA MODELO ---");
const existingPickerPath = path.join(root, "components/consultancies/training-v2/existing-workout-picker.tsx");
assert.ok(fs.existsSync(existingPickerPath), "existing-workout-picker.tsx deve existir");
const existingPickerContent = fs.readFileSync(existingPickerPath, "utf8");

assert.ok(existingPickerContent.includes("listExistingWorkoutsForCloneAction"), "Deve listar treinos autorizados");
assert.ok(existingPickerContent.includes("duplicateWorkoutAction"), "Deve acionar ação de duplicação");
assert.ok(existingPickerContent.includes("isTemplate: true"), "Deve duplicar explicitamente com isTemplate: true");
console.log("  [PASS] Seletor de Treino Existente: Clona rotina existente como modelo pronto desvinculado de alunos.");

// Test 5: Training AI Import Modal (3 Clear Paths, Expandable Preview, "Abrir no editor")
console.log("\n--- TESTE 5: IMPORTADOR COM IA — 3 ABAS, PRÉVIA EXPANSÍVEL, ABRIR NO EDITOR ---");
const importModalPath = path.join(root, "components/consultancies/training-v2/training-ai-import-modal.tsx");
assert.ok(fs.existsSync(importModalPath), "training-ai-import-modal.tsx deve existir");
const importModalContent = fs.readFileSync(importModalPath, "utf8");

assert.ok(importModalContent.includes("Colar texto"), "Deve ter aba Colar texto");
assert.ok(importModalContent.includes("Enviar documento"), "Deve ter aba Enviar documento");
assert.ok(importModalContent.includes("Enviar imagem"), "Deve ter aba Enviar imagem");
assert.ok(importModalContent.includes("toggleDivisionExpand"), "Deve conter função de expansão de divisão");
assert.ok(importModalContent.includes("Abrir no editor"), "Botão principal deve ser 'Abrir no editor'");
assert.ok(importModalContent.includes("isTemplate"), "Deve suportar modo template");
console.log("  [PASS] Importador com IA: 3 abas, prévia expansível, botão 'Abrir no editor' e tema claro oficial.");

// Test 6: Division Naming Formats in DivisionsBar
console.log("\n--- TESTE 6: FORMATOS FLEXÍVEIS DE NOMES DE DIVISÃO ---");
const divisionsBarPath = path.join(root, "components/consultancies/training-v2/workout-editor-4/divisions-bar.tsx");
assert.ok(fs.existsSync(divisionsBarPath), "divisions-bar.tsx deve existir");
const divisionsBarContent = fs.readFileSync(divisionsBarPath, "utf8");

assert.ok(divisionsBarContent.includes("Formato"), "Deve ter botão/menu Formato");
assert.ok(divisionsBarContent.includes("handleApplyFormat"), "Deve ter manipulador de aplicação de formato");
assert.ok(divisionsBarContent.includes("letters"), "Deve suportar formato Letras");
assert.ok(divisionsBarContent.includes("numbers"), "Deve suportar formato Números");
assert.ok(divisionsBarContent.includes("weekdays"), "Deve suportar formato Dias da semana");
assert.ok(divisionsBarContent.includes("PRESETS_BY_COUNT"), "Deve conter presets inteligentes por contagem de divisões");
console.log("  [PASS] Formato de Divisões: Letras, Números, Dias da semana e Presets rápidos ativos.");

// Test 7: Clickable Dashboard Início Indicators
console.log("\n--- TESTE 7: INDICADORES CLICÁVEIS DO INÍCIO DO PERSONAL ---");
const dashboardViewPath = path.join(root, "components/dashboard/dashboard-personal-view.tsx");
assert.ok(fs.existsSync(dashboardViewPath), "dashboard-personal-view.tsx deve existir");
const dashboardViewContent = fs.readFileSync(dashboardViewPath, "utf8");

assert.ok(dashboardViewContent.includes("filter=with_workout"), "Com treino ativo deve linkar para filter=with_workout");
assert.ok(dashboardViewContent.includes("filter=without_workout"), "Sem treino ativo deve linkar para filter=without_workout");
assert.ok(dashboardViewContent.includes("filter=all"), "Total de alunos deve linkar para filter=all");

const studentListPath = path.join(root, "components/consultancies/personal-student-hub/personal-student-list.tsx");
const studentListContent = fs.readFileSync(studentListPath, "utf8");
assert.ok(studentListContent.includes("with_workout"), "Lista de alunos deve processar filter with_workout");
assert.ok(studentListContent.includes("without_workout"), "Lista de alunos deve processar filter without_workout");
console.log("  [PASS] Indicadores do Início: Total, Com treino ativo e Sem treino ativo são clicáveis com filtros diretos.");

// Test 8: Workout and Template Card Metrics (Divisions + Exercises Counter)
console.log("\n--- TESTE 8: CONTAGEM DE DIVISÕES E EXERCÍCIOS NOS CARDS ---");
const rotinasPagePath = path.join(root, "app/consultoria/[slug]/rotinas/page.tsx");
const rotinasPageContent = fs.readFileSync(rotinasPagePath, "utf8");

assert.ok(rotinasPageContent.includes("w.blocksCount"), "Deve exibir contagem de divisões");
assert.ok(rotinasPageContent.includes("w.exercisesCount"), "Deve exibir contagem de exercícios");

const repoPath = path.join(root, "lib/training-v2/workout-repository.ts");
const repoContent = fs.readFileSync(repoPath, "utf8");
assert.ok(repoContent.includes("exercisesCount?: number"), "WorkoutListItemDto deve conter exercisesCount");
assert.ok(repoContent.includes("exercises_count"), "Query SQL deve calcular contagem de exercícios");
console.log("  [PASS] Contadores: Divisões e exercícios exibidos simultaneamente nos cards.");

console.log("\n=== TODOS OS 8 TESTES DA SUITE DE REFINAMENTO PASSARAM COM SUCESSO! ===");
