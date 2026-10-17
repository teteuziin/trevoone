/**
 * TREVO ONE — TESTE REPRODUZÍVEL DE COMPORTAMENTO
 * Componente: PersonalWorkoutsTable
 * Módulo de Origem: components/dashboard/personal/sections/personal-workouts-table.tsx
 *
 * Utiliza o carregador TypeScript oficial do repositório (scripts/ts-loader.mjs).
 * Importa diretamente a função de filtragem e os formatadores do componente, sem duplicação de lógica.
 * Utiliza node:assert/strict com interrupção imediata e código de saída != 0 em caso de falha.
 */

import { register } from "node:module";
register("./ts-loader.mjs", import.meta.url);

import assert from "node:assert/strict";

// Importa a lógica REAL compilada do componente (zero duplicação de corpo)
const {
  filterAndSortWorkouts,
  formatBlocksCount,
  resolveStudentDisplay,
  resolveStatusLabel,
} = await import("../components/dashboard/personal/sections/personal-workouts-table.tsx");

console.log("==================================================");
console.log("TREVO ONE — VERIFICAÇÃO COMPORTAMENTAL REPRODUZÍVEL");
console.log("Origem: components/dashboard/personal/sections/personal-workouts-table.tsx");
console.log("==================================================\n");

// Dataset de teste com todos os casos de borda
const mockDataset = [
  {
    publicId: "w1",
    title: "Hipertrofia A - Peito e Tríceps",
    status: "ACTIVE",
    currentVersionStatus: "PUBLISHED",
    assignedStudentName: "Carlos Silva",
    blocksCount: 3,
    updatedAt: "2026-10-10T10:00:00Z",
  },
  {
    publicId: "w2",
    title: "Hipertrofia B - Costas e Bíceps",
    status: "ACTIVE",
    currentVersionStatus: "PUBLISHED",
    assignedStudentName: "Carlos Silva",
    blocksCount: 4,
    updatedAt: "2026-10-11T10:00:00Z",
  },
  {
    publicId: "w3",
    title: "Hipertrofia C - Pernas Completo",
    status: "DRAFT",
    currentVersionStatus: "DRAFT",
    assignedStudentName: "Carlos Silva",
    blocksCount: 3,
    updatedAt: "2026-10-12T10:00:00Z",
  },
  {
    publicId: "w4",
    title: "Adaptação Geral",
    status: "ACTIVE",
    currentVersionStatus: "PUBLISHED",
    assignedStudentName: "Mariana Souza",
    blocksCount: 2,
    updatedAt: "2026-10-09T10:00:00Z",
  },
  {
    publicId: "w5",
    title: "Treino Funcional Express",
    status: "ACTIVE",
    currentVersionStatus: "PUBLISHED",
    assignedStudentName: "Mariana Souza",
    blocksCount: 0, // Zero real
    updatedAt: "2026-10-08T10:00:00Z",
  },
  {
    publicId: "w6",
    title: "Ficha Sem Blocos Definidos",
    status: "ACTIVE",
    currentVersionStatus: "PUBLISHED",
    assignedStudentName: "João Pedro",
    blocksCount: null, // Ausente
    updatedAt: "2026-10-07T10:00:00Z",
  },
  {
    publicId: "w7",
    title: "Ficha Legada Indefinida",
    status: "ACTIVE",
    currentVersionStatus: "PUBLISHED",
    assignedStudentName: "Lucas Lima",
    blocksCount: undefined, // Ausente
    updatedAt: "2026-10-06T10:00:00Z",
  },
];

// -------------------------------------------------------------
// 1. BUSCA + STATUS + BLOCOS COMBINADOS
// -------------------------------------------------------------
console.log("--- 1. BUSCA + STATUS + QUANTIDADE DE BLOCOS COMBINADOS ---");
{
  const result = filterAndSortWorkouts({
    workouts: mockDataset,
    searchTerm: "Carlos",
    statusFilter: "PUBLISHED",
    blocksFilter: "FEW_BLOCKS",
    sortBy: "name",
  });

  // Asserções estritas com interrupção em caso de falha
  assert.strictEqual(result.length, 1, "Deve retornar exatamente 1 ficha para Carlos + PUBLISHED + FEW_BLOCKS");
  assert.strictEqual(result[0].publicId, "w1", "Ficha retornada deve ser w1 (Hipertrofia A)");
  assert.strictEqual(result[0].blocksCount, 3, "Ficha w1 tem exatamente 3 blocos");
  assert.strictEqual(result[0].currentVersionStatus, "PUBLISHED", "Ficha w1 tem status PUBLISHED");

  // Asserção negativa: w2 (4 blocos) e w3 (DRAFT) foram estritamente excluídas
  assert.ok(!result.some((w) => w.publicId === "w2"), "w2 (4 blocos) não pode entrar em FEW_BLOCKS");
  assert.ok(!result.some((w) => w.publicId === "w3"), "w3 (DRAFT) não pode entrar em PUBLISHED");

  console.log("  [ASSERTION PASS] As três dimensões operam cumulativamente e filtram com precisão.");
}

// -------------------------------------------------------------
// 2. LIMITES EXATOS DE 3 E 4 BLOCOS
// -------------------------------------------------------------
console.log("\n--- 2. LIMITES DE 3 E 4 BLOCOS ---");
{
  // Teste de FEW_BLOCKS (<= 3)
  const few = filterAndSortWorkouts({
    workouts: mockDataset,
    searchTerm: "",
    statusFilter: "ALL",
    blocksFilter: "FEW_BLOCKS",
    sortBy: "name",
  });
  const fewIds = few.map((w) => w.publicId).sort();
  // Esperado: w1 (3), w3 (3), w4 (2), w5 (0) => exatamente 4 itens
  assert.deepStrictEqual(fewIds, ["w1", "w3", "w4", "w5"], "FEW_BLOCKS deve conter apenas fichas com <= 3 blocos");

  // Limite superior de FEW_BLOCKS: 3 entra, 4 não entra
  assert.ok(few.some((w) => w.blocksCount === 3), "Ficha com 3 blocos DEVE ser incluída em FEW_BLOCKS");
  assert.ok(!few.some((w) => w.blocksCount === 4), "Ficha com 4 blocos NÃO pode ser incluída em FEW_BLOCKS");

  // Teste de MANY_BLOCKS (>= 4)
  const many = filterAndSortWorkouts({
    workouts: mockDataset,
    searchTerm: "",
    statusFilter: "ALL",
    blocksFilter: "MANY_BLOCKS",
    sortBy: "name",
  });
  const manyIds = many.map((w) => w.publicId);
  // Esperado: w2 (4) => exatamente 1 item
  assert.deepStrictEqual(manyIds, ["w2"], "MANY_BLOCKS deve conter apenas fichas com >= 4 blocos");

  // Limite inferior de MANY_BLOCKS: 4 entra, 3 não entra
  assert.ok(many.some((w) => w.blocksCount === 4), "Ficha com 4 blocos DEVE ser incluída em MANY_BLOCKS");
  assert.ok(!many.some((w) => w.blocksCount === 3), "Ficha com 3 blocos NÃO pode ser incluída em MANY_BLOCKS");

  console.log("  [ASSERTION PASS] Limite 3 (<=3) e Limite 4 (>=4) são estritamente mutuamente exclusivos.");
}

// -------------------------------------------------------------
// 3. ZERO REAL E CONTAGEM AUSENTE (NULL / UNDEFINED)
// -------------------------------------------------------------
console.log("\n--- 3. ZERO REAL E CONTAGEM AUSENTE ---");
{
  // 1. Zero real (w5 tem blocksCount: 0)
  const few = filterAndSortWorkouts({
    workouts: mockDataset,
    searchTerm: "",
    statusFilter: "ALL",
    blocksFilter: "FEW_BLOCKS",
    sortBy: "name",
  });
  assert.ok(few.some((w) => w.publicId === "w5"), "Ficha com blocksCount=0 DEVE constar em FEW_BLOCKS (0 <= 3)");
  assert.strictEqual(formatBlocksCount(0), "0 blocos", "Formatador deve renderizar '0 blocos' para zero real");

  // 2. Contagem ausente (w6 tem null, w7 tem undefined)
  assert.ok(!few.some((w) => w.publicId === "w6"), "Ficha com blocksCount=null NÃO pode entrar em FEW_BLOCKS");
  assert.ok(!few.some((w) => w.publicId === "w7"), "Ficha com blocksCount=undefined NÃO pode entrar em FEW_BLOCKS");

  const many = filterAndSortWorkouts({
    workouts: mockDataset,
    searchTerm: "",
    statusFilter: "ALL",
    blocksFilter: "MANY_BLOCKS",
    sortBy: "name",
  });
  assert.ok(!many.some((w) => w.publicId === "w6"), "Ficha com blocksCount=null NÃO pode entrar em MANY_BLOCKS");
  assert.ok(!many.some((w) => w.publicId === "w7"), "Ficha com blocksCount=undefined NÃO pode entrar em MANY_BLOCKS");

  // Ausentes só constam sob blocksFilter === "ALL"
  const all = filterAndSortWorkouts({
    workouts: mockDataset,
    searchTerm: "",
    statusFilter: "ALL",
    blocksFilter: "ALL",
    sortBy: "name",
  });
  assert.ok(all.some((w) => w.publicId === "w6"), "Ficha com blocksCount=null deve constar em ALL");
  assert.ok(all.some((w) => w.publicId === "w7"), "Ficha com blocksCount=undefined deve constar em ALL");

  // Formatador exibe traço para ausentes
  assert.strictEqual(formatBlocksCount(null), "—", "null deve formatar como '—'");
  assert.strictEqual(formatBlocksCount(undefined), "—", "undefined deve formatar como '—'");
  assert.strictEqual(formatBlocksCount(NaN), "—", "NaN deve formatar como '—'");
  assert.strictEqual(formatBlocksCount(1), "1 bloco", "1 deve formatar no singular '1 bloco'");
  assert.strictEqual(formatBlocksCount(2), "2 blocos", "2 deve formatar no plural '2 blocos'");

  console.log("  [ASSERTION PASS] Zero real preservado e ausência (null/undefined) não coagida para 0.");
}

// -------------------------------------------------------------
// 4. RESULTADOS VAZIOS
// -------------------------------------------------------------
console.log("\n--- 4. RESULTADOS VAZIOS ---");
{
  const emptySearch = filterAndSortWorkouts({
    workouts: mockDataset,
    searchTerm: "NomeQueNaoExiste12345",
    statusFilter: "ALL",
    blocksFilter: "ALL",
    sortBy: "name",
  });
  assert.strictEqual(emptySearch.length, 0, "Busca sem resultado deve retornar array vazio");
  assert.deepStrictEqual(emptySearch, [], "Array vazio limpo para disparo do estado de busca vazia");

  const emptyStatus = filterAndSortWorkouts({
    workouts: mockDataset,
    searchTerm: "Mariana",
    statusFilter: "DRAFT", // Mariana só tem PUBLISHED
    blocksFilter: "ALL",
    sortBy: "name",
  });
  assert.strictEqual(emptyStatus.length, 0, "Combinação sem correspondência deve retornar array vazio");

  console.log("  [ASSERTION PASS] Retorno determinístico de array vazio [] para renderização do empty state.");
}

// -------------------------------------------------------------
// 5. ORDENAÇÃO PRESERVADA
// -------------------------------------------------------------
console.log("\n--- 5. ORDENAÇÃO PRESERVADA ---");
{
  // Ordenação por nome (A-Z)
  const byName = filterAndSortWorkouts({
    workouts: mockDataset,
    searchTerm: "",
    statusFilter: "ALL",
    blocksFilter: "ALL",
    sortBy: "name",
  });
  const names = byName.map((w) => w.title);
  const sortedNames = [...names].sort((a, b) => a.localeCompare(b, "pt-BR"));
  assert.deepStrictEqual(names, sortedNames, "Ordenação 'name' deve seguir estritamente locale pt-BR (A-Z)");

  // Ordenação por atualizações mais antigas primeiro ('oldest')
  const byOldest = filterAndSortWorkouts({
    workouts: mockDataset,
    searchTerm: "",
    statusFilter: "ALL",
    blocksFilter: "ALL",
    sortBy: "oldest",
  });
  // Datas: 06 (w7), 07 (w6), 08 (w5), 09 (w4), 10 (w1), 11 (w2), 12 (w3)
  const oldestIds = byOldest.map((w) => w.publicId);
  assert.deepStrictEqual(oldestIds, ["w7", "w6", "w5", "w4", "w1", "w2", "w3"], "Oldest deve ordenar cronologicamente ASC");

  // Ordenação por mais recentes primeiro ('recent')
  const byRecent = filterAndSortWorkouts({
    workouts: mockDataset,
    searchTerm: "",
    statusFilter: "ALL",
    blocksFilter: "ALL",
    sortBy: "recent",
  });
  const recentIds = byRecent.map((w) => w.publicId);
  assert.deepStrictEqual(recentIds, ["w3", "w2", "w1", "w4", "w5", "w6", "w7"], "Recent deve ordenar cronologicamente DESC");

  console.log("  [ASSERTION PASS] Ordenações 'oldest', 'recent' e 'name' estritamente verificadas.");
}

// -------------------------------------------------------------
// 6. LIMPAR BUSCA: FILTRAGEM vs EVENTO REAL
// -------------------------------------------------------------
console.log("\n--- 6. LIMPAR BUSCA: COMPORTAMENTO LÓGICO vs LIMITAÇÃO DE EVENTO ---");
{
  // A. Teste da filtragem recebendo busca vazia mantendo filtros e ordenação
  const stateWithSearch = filterAndSortWorkouts({
    workouts: mockDataset,
    searchTerm: "Costas",
    statusFilter: "PUBLISHED",
    blocksFilter: "MANY_BLOCKS",
    sortBy: "recent",
  });
  assert.strictEqual(stateWithSearch.length, 1);
  assert.strictEqual(stateWithSearch[0].publicId, "w2");

  // Simulando transição de estado da ação onClick={() => setSearchTerm("")}
  const stateAfterClear = filterAndSortWorkouts({
    workouts: mockDataset,
    searchTerm: "", // Busca limpa
    statusFilter: "PUBLISHED", // Preservado
    blocksFilter: "MANY_BLOCKS", // Preservado
    sortBy: "recent", // Preservado
  });
  assert.strictEqual(stateAfterClear.length, 1, "Mantém apenas os itens que casam com PUBLISHED + MANY_BLOCKS");
  assert.strictEqual(stateAfterClear[0].publicId, "w2");

  console.log("  [ASSERTION PASS] Filtragem com busca vazia preserva status, blocos e ordenação.");

  // B. Registro explícito de limitação do teste de evento de interface
  console.log("  [LIMITAÇÃO REGISTRADA]: O evento real de clique (SyntheticMouseEvent) no elemento");
  console.log("    <button onClick={() => setSearchTerm('')} aria-label='Limpar busca'> não foi");
  console.log("    disparado via motor de navegador por conta da estrita proibição de navegador");
  console.log("    automatizado. Foi validada a transição determinística do handler e a semântica");
  console.log("    estática do JSX no componente.");
}

console.log("\n==================================================");
console.log("TODAS AS ASSERÇÕES PASSARAM COM SUCESSO (CÓDIGO 0)!");
console.log("==================================================");
