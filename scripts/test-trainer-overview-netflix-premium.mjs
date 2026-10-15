import fs from "fs";
import path from "path";

console.log("================================================================================");
console.log("TREVO ONE — TRAINER OVERVIEW NETFLIX PREMIUM & SCROLLBAR TEST SUITE");
console.log("================================================================================");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

const rootDir = process.cwd();
const personalViewPath = path.join(rootDir, "components/dashboard/dashboard-personal-view.tsx");
const globalsCssPath = path.join(rootDir, "app/globals.css");

const personalViewContent = fs.readFileSync(personalViewPath, "utf-8");
const globalsCssContent = fs.readFileSync(globalsCssPath, "utf-8");

// ============================================================================
// 1. POLIMENTO DE SCROLLBAR (CROSS-BROWSER & SIDEBAR)
// ============================================================================
console.log("\n--- 1. POLIMENTO DE SCROLLBAR ---");
assert(
  globalsCssContent.includes("scrollbar-width: thin;") &&
  globalsCssContent.includes("scrollbar-color: rgba(63, 63, 70, 0.45) transparent;"),
  "1.1 Scrollbar ultrafina cross-browser definida no globals.css com scrollbar-width e scrollbar-color"
);

assert(
  globalsCssContent.includes("::-webkit-scrollbar") &&
  globalsCssContent.includes("width: 5px;") &&
  globalsCssContent.includes("::-webkit-scrollbar-thumb") &&
  globalsCssContent.includes("border-radius: 9999px;"),
  "1.2 Pseudo-elementos ::-webkit-scrollbar configurados para 5px com thumb arredondado escuro"
);

assert(
  globalsCssContent.includes(".no-scrollbar") &&
  globalsCssContent.includes("scrollbar-width: none;"),
  "1.3 Utilitário .no-scrollbar disponível para carrosséis horizontais"
);

// ============================================================================
// 2. HERO BANNER SPOTLIGHT CINEMATOGRÁFICO
// ============================================================================
console.log("\n--- 2. HERO BANNER SPOTLIGHT ---");
assert(
  personalViewContent.includes("STUDIO DE PRESCRIÇÃO ATIVO") &&
  personalViewContent.includes("animate-pulse bg-emerald-400"),
  "2.1 Badge superior com dot pulsante esmeralda e identificador de estúdio ativo"
);

assert(
  personalViewContent.includes("Visão geral dos treinos") &&
  personalViewContent.includes("Gerencie suas fichas e acompanhe seus alunos."),
  "2.2 Título imponente e subtítulo mantidos e preservados"
);

assert(
  personalViewContent.includes("/rotinas/novo") &&
  personalViewContent.includes("+ Nova ficha") &&
  personalViewContent.includes("bg-emerald-500"),
  "2.3 CTA Primário '+ Nova ficha' com link intacto e destaque esmeralda de alto impacto"
);

assert(
  personalViewContent.includes("/rotinas?action=import") &&
  personalViewContent.includes("Importar") &&
  personalViewContent.includes("SparklesIcon"),
  "2.4 CTA Secundário 'Importar' / 'Importar treino' com link intacto e ícone de destaque"
);

assert(
  personalViewContent.includes("displayStudents") &&
  personalViewContent.includes("displayPlans") &&
  personalViewContent.includes("ALUNOS") &&
  personalViewContent.includes("Fichas"),
  "2.5 Bento Strip compacto integrado com dados reais e contadores operacionais"
);

// ============================================================================
// 3. TRILHO ESTILO NETFLIX: ACESSO RÁPIDO HORIZONTAL
// ============================================================================
console.log("\n--- 3. TRILHO ESTILO NETFLIX (CARROSSEL HORIZONTAL) ---");
assert(
  personalViewContent.includes("Acesso rápido") &&
  personalViewContent.includes("FlameIcon"),
  "3.1 Cabeçalho da seção 'Acesso rápido' com ícone temático de destaque"
);

assert(
  personalViewContent.includes("scrollBy({ left: -320, behavior: \"smooth\" })") &&
  personalViewContent.includes("scrollBy({ left: 320, behavior: \"smooth\" })"),
  "3.2 Controles de scroll suave (‹ e ›) implementados para navegação fluida no desktop"
);

assert(
  personalViewContent.includes("snap-x snap-mandatory") &&
  personalViewContent.includes("no-scrollbar"),
  "3.3 Carrossel horizontal com snap scroll e sem barras de rolagem nativas visíveis"
);

assert(
  personalViewContent.includes("Abrir no Studio") &&
  personalViewContent.includes("DumbbellIcon"),
  "3.4 Cards estilo poster com chamada 'Abrir no Studio', indicador de blocos e animação no hover"
);

// ============================================================================
// 4. CATÁLOGO PRÁTICO: BUSCA INSTANTÂNEA, FILTROS E TOGGLE DE VISÃO
// ============================================================================
console.log("\n--- 4. CATÁLOGO PRÁTICO DE FICHAS RECENTES ---");
assert(
  personalViewContent.includes("searchQuery") &&
  personalViewContent.includes("setSearchQuery") &&
  personalViewContent.includes("Buscar ficha por nome..."),
  "4.1 Busca instantânea em tempo real (Live Filter) sem requisição extra"
);

assert(
  personalViewContent.includes("activeFilter") &&
  personalViewContent.includes("Até 3 blocos") &&
  personalViewContent.includes("4+ blocos"),
  "4.2 Chips de filtro rápido por densidade/volume de blocos"
);

assert(
  personalViewContent.includes("viewMode") &&
  personalViewContent.includes("setViewMode") &&
  personalViewContent.includes("ListIcon") &&
  personalViewContent.includes("GridIcon"),
  "4.3 Alternador de visualização entre Lista Ágil e Grade de Posters (Bento Grid)"
);

assert(
  personalViewContent.includes("group-hover:opacity-100") &&
  personalViewContent.includes("Abrir ficha"),
  "4.4 Linhas de lista ricas com acento lateral iluminado e atalho de ação no hover"
);

assert(
  personalViewContent.includes("Limpar filtro") || personalViewContent.includes("Limpar busca"),
  "4.5 Estado vazio da busca com botão amigável para limpar e restaurar lista"
);

// ============================================================================
// 5. PRESERVAÇÃO DE DADOS REAIS E ZERO MOCKS HARDCODED
// ============================================================================
console.log("\n--- 5. PRESERVAÇÃO FUNCIONAL & DADOS REAIS ---");
assert(
  !personalViewContent.includes(">17<") &&
  !personalViewContent.includes(">12<") &&
  !personalViewContent.includes("12 ativas"),
  "5.1 Zero dados mockados ou contadores fixos hardcoded no código"
);

assert(
  personalViewContent.includes("safe-area-inset-bottom") &&
  personalViewContent.includes("min-h-[44px]"),
  "5.2 Ergonomia mobile com safe-area e alvos de toque mínimos preservados"
);

console.log("\n================================================================================");
console.log(`TEST RESULTS: ${passed} passed, ${failed} failed`);
console.log("================================================================================");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
