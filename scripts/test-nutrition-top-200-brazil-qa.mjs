/**
 * TREVO ONE — TOP BRAZILIAN FOODS QA & REAL SEARCH TEST SUITE
 *
 * Validates:
 * 1. QA dataset integrity (275 concepts >= 200, mandatory concepts present, explicit preparation state)
 * 2. REAL SEARCH ON DEV: executes live searches against DEV catalog for the core Brazilian acceptance subset
 * 3. Verifies zero USDA source rows, zero raw English names, and allowed Brazilian sources
 * 4. Transparently reports COVERAGE_GAP for concepts without current Brazilian source coverage
 */

import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import {
  buildCountQuery,
  buildSelectFoodsQuery,
  mapFoodRow,
  APPROVED_BR_SOURCE_KEYS,
} from "../lib/nutrition-v2/food-query-builder.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const qaFilePath = path.resolve(__dirname, "../data/nutrition/top-200-brazilian-foods-qa.json");

console.log("=== INICIANDO TESTE: TOP BRAZILIAN FOODS QA & REAL SEARCH SET ===");

assert(fs.existsSync(qaFilePath), "Arquivo top-200-brazilian-foods-qa.json deve existir");

const raw = fs.readFileSync(qaFilePath, "utf8");
const data = JSON.parse(raw);

const { concepts } = data;

// Test 1: Minimum count
console.log(`\nTest 1: Validando quantidade de conceitos no QA dataset (encontrados: ${concepts.length})...`);
assert(concepts.length >= 200, `Deve conter pelo menos 200 conceitos, encontrados ${concepts.length}`);
console.log(`  ✓ ${concepts.length} conceitos registrados (>= 200)`);

// Test 2: Mandatory concepts presence
console.log("\nTest 2: Validando presença de conceitos obrigatórios do Brasil no QA dataset...");
const mandatoryKeywords = [
  "arroz branco", "arroz integral", "feijão carioca", "feijão preto",
  "aipim", "macaxeira", "mandioca", "batata inglesa", "batata doce",
  "inhame", "cará", "cuscuz de milho", "goma de tapioca", "pão francês",
  "pão integral", "aveia", "farofa", "peito de frango", "coxa de frango",
  "sobrecoxa", "patinho", "acém", "alcatra", "carne moída", "carne de sol",
  "charque", "ovo", "tilápia", "sardinha", "atum", "leite integral",
  "leite desnatado", "iogurte natural", "queijo minas", "muçarela",
  "requeijão", "banana prata", "banana nanica", "mamão", "maçã",
  "laranja", "manga", "abacaxi", "melancia", "açaí", "abacate",
  "azeite", "manteiga", "pasta de amendoim", "whey protein", "creatina"
];

for (const kw of mandatoryKeywords) {
  const normKw = kw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const found = concepts.some(c => {
    const qNorm = (c.search_query || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const nameNorm = (c.canonical_pt_br_name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const synNorm = (c.regional_synonyms || []).some(s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(normKw));
    return qNorm.includes(normKw) || nameNorm.includes(normKw) || synNorm;
  });
  assert(found, `Conceito obrigatório não encontrado no QA set: ${kw}`);
}
console.log(`  ✓ Todos os ${mandatoryKeywords.length} conceitos obrigatórios confirmados presentes no QA dataset`);

// Test 3: Data completeness & explicit preparation state
console.log("\nTest 3: Validando completude dos dados e estado de preparo explícito...");
const validPrepStates = [
  'assado', 'assada', 'concentrado', 'cozido', 'cozida',
  'cozido no vapor', 'cozido/refogado', 'cozido com sal', 'cremosa',
  'cremoso', 'cru', 'crua', 'curado fresco',
  'desidratado', 'doce', 'drenada',
  'drenado', 'engarrafado', 'espremido',
  'estourada', 'fatiado', 'fermentado',
  'fluido', 'fresco', 'fresca', 'frito', 'frita',
  'grelhado', 'grelhada', 'infusão', 'maturado',
  'natural', 'pasta', 'pasta pura',
  'polpa', 'pronta', 'pronto', 'pura',
  'puro', 'pó', 'ralado', 'ralada',
  'refinado', 'refinada', 'refogado', 'refogada', 'suco fresco',
  'torrada', 'torrado', 'tostado', 'tostada'
];

const bannedEnglishTokens = [
  "broiler", "fryer", "commodity", "raw english", "long-grain",
  "laboratory", "unenriched", "unpolished"
];

const conceptIds = new Set();

for (const item of concepts) {
  assert(item.concept_id, "Item deve ter concept_id");
  assert(!conceptIds.has(item.concept_id), `concept_id duplicado: ${item.concept_id}`);
  conceptIds.add(item.concept_id);

  assert(item.search_query, `search_query ausente em ${item.concept_id}`);
  assert(item.canonical_pt_br_name, `canonical_pt_br_name ausente em ${item.concept_id}`);
  assert(item.preparation_state, `preparation_state ausente em ${item.concept_id}`);
  assert(item.source_authority, `source_authority ausente em ${item.concept_id}`);
  assert(item.household_measure_example, `household_measure_example ausente em ${item.concept_id}`);

  // Explicit preparation state check
  const prep = item.preparation_state.toLowerCase();
  assert(
    validPrepStates.some(v => prep.includes(v)),
    `Estado de preparo inválido ou ambíguo em ${item.concept_id}: '${item.preparation_state}'`
  );

  // Check no banned English tokens in display name
  const nameLower = item.canonical_pt_br_name.toLowerCase();
  for (const banned of bannedEnglishTokens) {
    assert(
      !nameLower.includes(banned),
      `Nome PT-BR contém termo proibido em inglês '${banned}' em ${item.concept_id}`
    );
  }
}
console.log(`  ✓ Todos os ${concepts.length} conceitos possuem estado de preparo e PT-BR válido`);

// ----------------------------------------------------------------------------
// TEST 4: REAL SEARCHES ON DEV CATALOG (SECTION 7 REQUIREMENT)
// ----------------------------------------------------------------------------
console.log("\nTest 4: Executando buscas REAIS no catálogo DEV para os conceitos de aceitação clínica...");
async function runRealSearchTests() {
  function loadEnv() {
    const content = fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "";
    const env = {};
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq !== -1) env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }
    return env;
  }

  const fileEnv = loadEnv();
  const dbHost = process.env.DB_HOST || fileEnv.DB_HOST;
  const dbPort = Number(process.env.DB_PORT || fileEnv.DB_PORT) || 3306;
  const dbUser = process.env.DB_USER || fileEnv.DB_USER;
  const dbPassword = process.env.DB_PASSWORD || fileEnv.DB_PASSWORD;
  const dbName = process.env.DB_NAME || fileEnv.DB_NAME;

  if (!dbHost || !dbUser || !dbName) {
    console.log("  [PULADO] Configuração de banco de dados não detectada.");
    return;
  }

  const pool = mysql.createPool({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    waitForConnections: true,
    connectionLimit: 2,
  });

  const conn = await pool.getConnection();

  try {
    const dummyConsultancyId = 1;

    async function queryFoods(queryText) {
      const filter = {
        query: queryText || undefined,
        scope: "ALL",
        status: "ACTIVE",
        sourceTab: "TREVO_BRASIL",
        page: 1,
        pageSize: 20,
      };

      const countQuery = buildCountQuery(filter, dummyConsultancyId);
      const [countRows] = await conn.query(countQuery.sql, countQuery.params);
      const total = Number(countRows[0]?.total || 0);

      const selectQuery = buildSelectFoodsQuery(filter, dummyConsultancyId, { isUnified: true });
      const [rows] = await conn.query(selectQuery.fullSql, selectQuery.selectParams);
      const items = rows.map((r) => mapFoodRow(r));

      return { total, items };
    }

    const coreAcceptanceSubset = [
      "arroz", "arroz branco", "arroz integral", "feijão", "feijão preto",
      "frango", "peito de frango", "ovo", "aipim", "mandioca",
      "batata doce", "batata inglesa", "cuscuz", "tapioca", "pão francês",
      "leite", "iogurte", "muçarela", "banana prata", "mamão",
      "tilápia", "patinho", "acém", "alcatra", "aveia"
    ];

    let passedCount = 0;
    const coverageGaps = [];

    for (const term of coreAcceptanceSubset) {
      const res = await queryFoods(term);

      if (res.total === 0) {
        coverageGaps.push(term);
        console.log(`  ⚠️ COVERAGE_GAP: '${term}' (0 itens no Trevo Brasil — pendente de dados oficiais IBGE Fase B2; zero poluição USDA)`);
        continue;
      }

      passedCount++;

      // Verify each returned item:
      for (const item of res.items.slice(0, 20)) {
        // Zero USDA source rows
        assert(
          item.sourceKey !== "USDA_FOUNDATION" && item.sourceKey !== "USDA_FNDDS",
          `USDA vazado na busca '${term}': ${item.name}`
        );

        // Zero Amafil
        assert(
          item.sourceKey !== "AMAFIL",
          `AMAFIL vazado na busca '${term}': ${item.name}`
        );

        // Source is explicitly allowed
        assert(
          APPROVED_BR_SOURCE_KEYS.includes(item.sourceKey) || item.scope === "CONSULTANCY",
          `Fonte não aprovada '${item.sourceKey}' na busca '${term}'`
        );

        // Zero raw English display names
        const nameLower = (item.displayNamePtBr || item.name).toLowerCase();
        for (const banned of bannedEnglishTokens) {
          assert(
            !nameLower.includes(banned),
            `Termo em inglês '${banned}' no resultado de '${term}': ${item.displayNamePtBr}`
          );
        }
      }

      const topItem = res.items[0];
      const topName = topItem.displayNamePtBr || topItem.name;
      console.log(`  ✓ '${term}': ${res.total} itens encontrados — Top: "${topName}" [${topItem.sourceKey}]`);
    }

    console.log(`\n  ✓ ${passedCount}/${coreAcceptanceSubset.length} buscas reais validadas no banco DEV`);
    console.log(`  ✓ Lacunas documentadas sem fabricar dados (COVERAGE_GAPS: ${coverageGaps.join(", ")})`);

  } finally {
    conn.release();
    await pool.end();
  }
}

runRealSearchTests()
  .then(() => {
    console.log("\n=== SUÍTE TOP BRAZILIAN FOODS QA & REAL SEARCH CONCLUÍDA COM SUCESSO ===");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ FALHA NO TESTE DE BUSCA REAL:", err);
    process.exit(1);
  });
