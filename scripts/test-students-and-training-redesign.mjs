import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const rootDir = process.cwd();

console.log("================================================================================");
console.log("TREVO ONE — STUDENTS & TRAINING CATALOG NETFLIX PREMIUM TEST SUITE");
console.log("================================================================================");

let passedCount = 0;
function test(desc, fn) {
  try {
    fn();
    console.log(`[PASS] ${desc}`);
    passedCount++;
  } catch (err) {
    console.error(`[FAIL] ${desc}`);
    console.error(`       Error: ${err.message}`);
    process.exit(1);
  }
}

// -----------------------------------------------------------------------------
// 1. CENTRAL DE ALUNOS (components/consultancies/personal-student-hub/personal-student-list.tsx)
// -----------------------------------------------------------------------------
const studentListPath = path.join(rootDir, "components/consultancies/personal-student-hub/personal-student-list.tsx");
assert.ok(fs.existsSync(studentListPath), "personal-student-list.tsx must exist");
const studentListCode = fs.readFileSync(studentListPath, "utf-8");

test("1.1 Hero Spotlight com superfície sólida e sem degradês decorativos", () => {
  assert.ok(
    studentListCode.includes("border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-zinc-900") &&
    !studentListCode.includes("from-zinc-900/95 via-zinc-950 to-emerald-950/30"),
    "Deve conter o container Hero com superfície sólida e sem degradês decorativos"
  );
});

test("1.2 Badge de status superior com dot pulsante 'GESTÃO DE ALUNOS ATIVA'", () => {
  assert.ok(
    studentListCode.includes("animate-pulse bg-emerald-400") &&
    studentListCode.includes("GESTÃO DE ALUNOS ATIVA"),
    "Deve conter a pílula de status superior ativa"
  );
});

test("1.3 Bento Strip compacto com 3 KPIs interativos (Total, Ativos e Pendente)", () => {
  assert.ok(
    studentListCode.includes("students.length") &&
    studentListCode.includes("withWorkoutCount") &&
    studentListCode.includes("withoutWorkoutCount"),
    "Deve exibir contadores reais para os 3 KPIs do Bento Strip"
  );
  assert.ok(
    studentListCode.includes("grid grid-cols-3 gap-2.5 sm:gap-3.5"),
    "KPIs devem estar dispostos no Bento Strip compacto"
  );
});

test("1.4 Barra de controle com busca instantânea e chips de filtro rápido", () => {
  assert.ok(
    studentListCode.includes("MobileSearchBar") &&
    studentListCode.includes("SearchIcon"),
    "Deve conter a busca instantânea live tanto no mobile quanto no desktop"
  );
  assert.ok(
    studentListCode.includes("WITH_WORKOUT") &&
    studentListCode.includes("WITHOUT_WORKOUT"),
    "Deve conter filtros por situação de treino"
  );
});

test("1.5 Cards de alunos ricos com avatar, status de treino e CTAs ergonômicos", () => {
  assert.ok(
    studentListCode.includes("data-testid=\"mobile-student-card\"") &&
    studentListCode.includes("data-testid=\"desktop-student-grid\""),
    "Deve renderizar cards dedicados para mobile e grade para desktop"
  );
  assert.ok(
    studentListCode.includes("Treino ativo:") &&
    studentListCode.includes("Sem treino prescrito"),
    "Deve exibir status claro do treino do aluno"
  );
  assert.ok(
    studentListCode.includes("href={`/consultoria/${consultancySlug}/progresso/alunos/${student.membershipPublicId}`}"),
    "Deve usar membershipPublicId estrito para o perfil do aluno"
  );
  assert.ok(
    studentListCode.includes("rotinas/novo?student=${student.membershipPublicId}"),
    "CTA + Treino deve passar membershipPublicId"
  );
});

// -----------------------------------------------------------------------------
// 2. CATÁLOGO DE TREINOS E ROTINAS (app/consultoria/[slug]/rotinas/page.tsx)
// -----------------------------------------------------------------------------
const rotinasPagePath = path.join(rootDir, "app/consultoria/[slug]/rotinas/page.tsx");
assert.ok(fs.existsSync(rotinasPagePath), "rotinas/page.tsx must exist");
const rotinasCode = fs.readFileSync(rotinasPagePath, "utf-8");

test("2.1 Hero Spotlight com título imponente e badge 'MÓDULO DE TREINAMENTO · PERSONAL TRAINER'", () => {
  assert.ok(
    rotinasCode.includes("MÓDULO DE TREINAMENTO · PERSONAL TRAINER") &&
    rotinasCode.includes("animate-pulse bg-emerald-400"),
    "Deve conter a badge de status e luz ambiente no topo do catálogo"
  );
  assert.ok(
    rotinasCode.includes("border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-zinc-900"),
    "Deve utilizar superfícies sólidas adaptáveis sem degradês decorativos no Hero de Treinos"
  );
});

test("2.2 CTAs principais integrados com WorkoutCreationSheet (+ Nova ficha e Importar)", () => {
  assert.ok(
    rotinasCode.includes("<WorkoutCreationSheet consultancySlug={slug}"),
    "Deve preservar a integração completa com o WorkoutCreationSheet"
  );
});

test("2.3 Abas superiores de contexto (Treinos, Modelos e Prescrições)", () => {
  assert.ok(
    rotinasCode.includes("Treinos") &&
    rotinasCode.includes("Modelos") &&
    rotinasCode.includes("Prescrições"),
    "Deve fornecer navegação rápida entre Treinos, Modelos e Prescrições"
  );
});

test("2.4 Barra de busca e chips de filtro por status (Todos, Rascunhos, Publicados, Arquivados)", () => {
  assert.ok(
    rotinasCode.includes('name="q"') &&
    rotinasCode.includes("SearchIcon"),
    "Deve manter o input de busca funcional"
  );
  assert.ok(
    rotinasCode.includes("Rascunhos") &&
    rotinasCode.includes("Publicados") &&
    rotinasCode.includes("Arquivados"),
    "Deve conter os chips de filtro por status da ficha"
  );
});

test("2.5 Cards de fichas estilo poster / rich rows com metadata detalhado e WorkoutCardActions", () => {
  assert.ok(
    rotinasCode.includes("sm:hidden") &&
    rotinasCode.includes("hidden sm:flex"),
    "Deve manter composições responsivas distintas para mobile e desktop"
  );
  assert.ok(
    rotinasCode.includes("<WorkoutCardActions"),
    "Deve delegar ações rápidas ao WorkoutCardActions"
  );
  assert.ok(
    rotinasCode.includes("min-h-[44px]"),
    "Deve respeitar alvos ergonômicos de toque no mobile"
  );
});

// -----------------------------------------------------------------------------
// 3. PÁGINA DE ALUNOS (app/consultoria/[slug]/progresso/alunos/page.tsx)
// -----------------------------------------------------------------------------
const alunosPagePath = path.join(rootDir, "app/consultoria/[slug]/progresso/alunos/page.tsx");
assert.ok(fs.existsSync(alunosPagePath), "progresso/alunos/page.tsx must exist");
const alunosCode = fs.readFileSync(alunosPagePath, "utf-8");

test("3.1 Integração limpa e direta com PersonalStudentList sem cabeçalho duplicado", () => {
  assert.ok(
    alunosCode.includes("<PersonalStudentList"),
    "Deve renderizar o PersonalStudentList"
  );
  assert.ok(
    !alunosCode.includes("<PageHeader"),
    "Não deve conter PageHeader redundante já que PersonalStudentList provê o Spotlight Hero"
  );
});

console.log("================================================================================");
console.log(`TEST RESULTS: ${passedCount} passed, 0 failed`);
console.log("================================================================================");
