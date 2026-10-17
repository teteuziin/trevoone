import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

console.log("================================================================================");
console.log("TREVO ONE — CENTRAL DE ALUNOS TEST SUITE (PROFISSIONAL & DIRETA)");
console.log("================================================================================");

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(`       ${err instanceof Error ? err.message : String(err)}`);
    failed++;
  }
}

const listFile = path.resolve("components/consultancies/personal-student-hub/personal-student-list.tsx");
const pageFile = path.resolve("app/consultoria/[slug]/progresso/alunos/page.tsx");
const detailPageFile = path.resolve("app/consultoria/[slug]/progresso/alunos/[studentPublicId]/page.tsx");
const detailViewFile = path.resolve("components/consultancies/personal-student-hub/personal-student-detail-view.tsx");

assert.ok(fs.existsSync(listFile), "personal-student-list.tsx must exist");
assert.ok(fs.existsSync(pageFile), "alunos/page.tsx must exist");
assert.ok(fs.existsSync(detailPageFile), "alunos/[studentPublicId]/page.tsx must exist");
assert.ok(fs.existsSync(detailViewFile), "personal-student-detail-view.tsx must exist");

const listCode = fs.readFileSync(listFile, "utf-8");
const pageCode = fs.readFileSync(pageFile, "utf-8");
const detailPageCode = fs.readFileSync(detailPageFile, "utf-8");
const detailViewCode = fs.readFileSync(detailViewFile, "utf-8");

// -----------------------------------------------------------------------------
// 1. CABEÇALHO COMPACTO & AUSÊNCIA DE CHATBOT / HERO GIGANTE
// -----------------------------------------------------------------------------
runTest("1.1 Cabeçalho compacto com ícone azul e contagem real", () => {
  assert.ok(
    listCode.includes("DuotoneStudentsIcon"),
    "Deve conter o ícone azul da área (DuotoneStudentsIcon)"
  );
  assert.ok(
    /<h1[^>]*>\s*Alunos\s*<\/h1>/.test(listCode),
    "Título 'Alunos' direto sem floreios"
  );
  assert.ok(
    listCode.includes("aluno cadastrado") || listCode.includes("alunos cadastrados"),
    "Contagem real em texto secundário"
  );
});

runTest("1.2 Ausência de saudações, perguntas conversacionais e hero gigante", () => {
  assert.ok(
    !listCode.includes("Qual aluno você gostaria de ver?"),
    "Removida pergunta conversacional 'Qual aluno você gostaria de ver?'"
  );
  assert.ok(
    !listCode.includes("Olá,") && !listCode.includes("Olá!"),
    "Sem saudações motivacionais ou artificiais"
  );
  assert.ok(
    !listCode.includes("Digite o nome do aluno"),
    "Sem campo fixo de chat no rodapé"
  );
});

// -----------------------------------------------------------------------------
// 2. BUSCA E FILTROS OPERACIONAIS
// -----------------------------------------------------------------------------
runTest("2.1 Busca única com botão de limpar e placeholder objetivo", () => {
  assert.ok(
    listCode.includes("Buscar aluno por nome ou e-mail"),
    "Placeholder objetivo 'Buscar aluno por nome ou e-mail...'"
  );
  assert.ok(
    listCode.includes("handleClearSearch") || listCode.includes('aria-label="Limpar busca"'),
    "Botão de limpar busca presente com acessibilidade"
  );
});

runTest("2.2 Filtros com contagens reais e ordenação por nome como padrão", () => {
  assert.ok(
    listCode.includes("withWorkoutCount") && listCode.includes("withoutWorkoutCount"),
    "Contagens dinâmicas reais de alunos com e sem treino"
  );
  assert.ok(
    listCode.includes("Com treino") && listCode.includes("Sem treino"),
    "Filtros explícitos 'Todos', 'Com treino' e 'Sem treino'"
  );
  assert.ok(
    listCode.includes('"name_asc"') && listCode.includes("Nome (A–Z)"),
    "Ordenação por nome A-Z como padrão"
  );
});

// -----------------------------------------------------------------------------
// 3. LISTA PRINCIPAL EM SUPERFÍCIE CONTÍNUA
// -----------------------------------------------------------------------------
runTest("3.1 Superfície contínua com linhas separadas por bordas discretas", () => {
  assert.ok(
    listCode.includes("divide-y") && listCode.includes("rounded-2xl"),
    "Superfície contínua com divisores sutis sem coleções de cards aninhados"
  );
  assert.ok(
    listCode.includes("hidden md:grid") && listCode.includes("md:hidden"),
    "Layout dual com colunas alinhadas no desktop e blocos compactos no celular"
  );
});

runTest("3.2 Dados do aluno com avatar, nome, email e status de treino não crítico", () => {
  assert.ok(
    listCode.includes("UserAvatar"),
    "Avatar com fotos reais ou iniciais padronizadas"
  );
  assert.ok(
    listCode.includes("Treino ativo:") && listCode.includes("Sem treino prescrito"),
    "Status real do treino e título da ficha ativa"
  );
  assert.ok(
    !listCode.includes("bg-red-500/10 text-red-700") || !listCode.includes("Crítico: Sem treino"),
    "'Sem treino' não deve ser tratado como situação crítica ou aluno inativo"
  );
  assert.ok(
    listCode.includes("Abrir perfil"),
    "Ação explícita 'Abrir perfil' presente em cada aluno"
  );
});

// -----------------------------------------------------------------------------
// 4. PAGINAÇÃO ERGONÔMICA & RESET DE PÁGINA
// -----------------------------------------------------------------------------
runTest("4.1 Paginação com intervalo, total e botões de toque acessíveis", () => {
  assert.ok(
    listCode.includes("Mostrando") && listCode.includes("alunos"),
    "Exibe intervalo de resultados e total (ex: Mostrando 1–10 de 17 alunos)"
  );
  assert.ok(
    listCode.includes("Anterior") && listCode.includes("Próxima"),
    "Controles 'Anterior' e 'Próxima' com acessibilidade"
  );
  assert.ok(
    listCode.includes("min-h-[44px]") && listCode.includes("min-w-[44px]"),
    "Alvos de toque ergonômicos de pelo menos 44px"
  );
});

runTest("4.2 Reset automático de página ao alterar busca ou filtro", () => {
  assert.ok(
    listCode.includes("setCurrentPage(1)"),
    "Ajusta a página ao mudar busca ou filtro"
  );
});

// -----------------------------------------------------------------------------
// 5. PERFIL DO ALUNO & NAVEGAÇÃO SEM PERDER CONTEXTO
// -----------------------------------------------------------------------------
runTest("5.1 Reuso da rota existente com preservação de busca e página", () => {
  assert.ok(
    pageCode.includes("redirect(`/consultoria/${slug}/progresso/alunos/${initialStudentPublicId}`)") ||
    pageCode.includes("initialStudentPublicId"),
    "Aproveita rota existente /progresso/alunos/[studentPublicId]"
  );
  assert.ok(
    detailPageCode.includes("backHref") && detailPageCode.includes("fromPage"),
    "Preserva página, busca e filtro no retorno aos alunos"
  );
  assert.ok(
    detailViewCode.includes("Voltar aos alunos"),
    "Botão 'Voltar aos alunos' consistente e acessível"
  );
});

runTest("5.2 Abas desktop claras e seletor compacto no mobile sem abas comprimidas", () => {
  assert.ok(
    detailViewCode.includes('key: "visao-geral"') &&
    detailViewCode.includes('key: "treinos"') &&
    detailViewCode.includes('key: "fotos"') &&
    detailViewCode.includes('key: "anamnese"') &&
    detailViewCode.includes('key: "formularios"'),
    "5 seções principais organizadas perfeitamente no perfil"
  );
  assert.ok(
    detailViewCode.includes("mobileSections") &&
    detailViewCode.includes("isMobileSectionMenuOpen"),
    "Seletor compacto de seção no mobile com ícone e texto evitando 5 abas ilegíveis"
  );
});

runTest("5.3 Cabeçalho executivo preto/grafite (#151619) com CTA contextual e menu secundário", () => {
  assert.ok(
    detailViewCode.includes("bg-[#151619]") && detailViewCode.includes("border-[#303238]"),
    "Cabeçalho no padrão executivo preto/grafite (#151619, border #303238)"
  );
  assert.ok(
    detailViewCode.includes("Abrir treino") && detailViewCode.includes("Criar treino"),
    "Ação principal única e contextual: 'Abrir treino' se ativo, 'Criar treino' se nenhum"
  );
  assert.ok(
    detailViewCode.includes("isSecondaryMenuOpen") && detailViewCode.includes("MoreDotsIcon"),
    "Menu de ações secundárias acessível para fotos, anamnese e formulários"
  );
});

runTest("5.4 Ícones duotone coloridos oficiais nas 5 seções do perfil", () => {
  assert.ok(
    detailViewCode.includes("DuotoneOverviewIcon") &&
    detailViewCode.includes("DuotoneTrainingIcon") &&
    detailViewCode.includes("DuotonePhotosIcon") &&
    detailViewCode.includes("DuotoneAnamnesisIcon") &&
    detailViewCode.includes("DuotoneFormsIcon"),
    "Utiliza os ícones duotone coloridos oficiais para Visão Geral, Treinos, Fotos, Anamnese e Formulários"
  );
});

runTest("5.5 Visão Geral com Radar objetivo e campos em branco com 'Não informado'", () => {
  assert.ok(
    detailViewCode.includes("Não informado"),
    "Exibe 'Não informado' para campos de objetivo ou biometria em branco"
  );
  assert.ok(
    !detailViewCode.includes('"Massa Magra + Definição"'),
    "Não inventa metas falsas ou hardcoded como 'Massa Magra + Definição'"
  );
  assert.ok(
    detailViewCode.includes("grid-cols-1 lg:grid-cols-2"),
    "Distribuição da Visão Geral em 2 colunas no desktop e 1 no mobile"
  );
});

runTest("5.6 Treinos: Destaque moderado no ativo e histórico em lista discreta", () => {
  assert.ok(
    detailViewCode.includes("Treino Ativo Atual") || detailViewCode.includes("activeWorkout"),
    "Destaque moderado para treino ativo atual"
  );
  assert.ok(
    detailViewCode.includes("Histórico de Treinos Anteriores") || detailViewCode.includes("endedWorkouts"),
    "Histórico de treinos anteriores em lista discreta sem competir visualmente com o atual"
  );
  assert.ok(
    !detailViewCode.includes("Abrir no Criador"),
    "Substituído 'Abrir no Criador' por destinos claros como 'Abrir treino'"
  );
});

runTest("5.7 Fotos com miniaturas proporcionais 3:4 e modal lightbox", () => {
  assert.ok(
    detailViewCode.includes("aspect-[3/4]"),
    "Miniaturas fotográficas nas proporções 3:4 padronizadas"
  );
  assert.ok(
    detailViewCode.includes("lightboxImage") && detailViewCode.includes("setLightboxImage"),
    "Visualização ampliada (lightbox) ao clicar em qualquer foto"
  );
});

runTest("5.8 Anamnese e Formulários refletem dados reais com 'Ver respostas'", () => {
  assert.ok(
    detailViewCode.includes("selectedFormForModal") && detailViewCode.includes("Ver respostas"),
    "Modal de ver respostas presente na aba Formulários"
  );
  assert.ok(
    detailViewCode.includes("tab-anamnese") && detailViewCode.includes("Histórico Clínico"),
    "Seção Anamnese estruturada com perguntas e respostas limpas"
  );
});

// -----------------------------------------------------------------------------
// 6. VISUAL & PAPEL DE PAREDE
// -----------------------------------------------------------------------------
runTest("6.1 Fundo com wallpaper e container de 1280px", () => {
  assert.ok(
    pageCode.includes("showDashboardWallpaper={true}") &&
    pageCode.includes("max-w-[1280px]"),
    "Papel de parede oficial com container de largura máxima 1280px"
  );
  assert.ok(
    detailPageCode.includes("showDashboardWallpaper={true}") &&
    detailPageCode.includes("max-w-[1280px]"),
    "Papel de parede oficial mantido no detalhe com largura de 1280px"
  );
});

console.log("================================================================================");
console.log(`RESULTADO: ${passed} testes passaram, ${failed} falharam.`);
console.log("================================================================================");

if (failed > 0) {
  process.exit(1);
}

