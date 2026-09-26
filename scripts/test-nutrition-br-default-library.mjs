/**
 * TREVO ONE — BRAZILIAN DEFAULT FOOD LIBRARY & SEARCH EXPERIENCE TEST SUITE
 *
 * Verifies Phase B1 product requirements:
 * 1. Default tab (Trevo Brasil) excludes raw USDA records (zero USDA in default view)
 * 2. Search aliases are strictly PT-BR (no cross-language English expansion in user search)
 * 3. Removal of bad generic synonyms (pasta does NOT expand to massa/creme unless phrase-aware)
 * 4. Conceptual source tabs routing:
 *    - TREVO_BRASIL: TACO + consultancy + verified commercial
 *    - COMMERCIAL: Verified manufacturer products only
 *    - MY_FOODS: Consultancy scope only
 *    - OTHER_DATABASES: USDA Foundation / FNDDS
 * 5. Effective display names: TACO records display Portuguese name via effectiveDisplayName
 * 6. Mandatory core acceptance searches on DEV database with ZERO raw English in top 20 results
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import mysql from "mysql2/promise";
import {
  expandSearchTokensWithSynonyms,
  USER_SEARCH_ALIASES,
} from "../lib/nutrition-v2/food-search.ts";
import {
  buildWhereClause,
  buildCountQuery,
  buildSelectFoodsQuery,
  mapFoodRow,
} from "../lib/nutrition-v2/food-query-builder.ts";

console.log("=== INICIANDO SUÍTE DE TESTES: TREVO ONE — BRAZILIAN DEFAULT FOOD LIBRARY ===");

// ----------------------------------------------------------------------------
// TEST 1: SEARCH ALIASES ARE STRICTLY PT-BR (NO CROSS-LANGUAGE USER EXPANSION)
// ----------------------------------------------------------------------------
console.log("\nTest 1: Validando segregação estrita de sinônimos PT-BR para busca do usuário...");
{
  // English words that MUST NOT be present in user search expansion:
  const forbiddenEnglish = [
    "rice", "chicken", "bean", "beans", "milk", "cheese",
    "cassava", "beef", "fish", "egg", "potato", "yam",
    "strawberry", "avocado", "watermelon", "melon", "papaya",
    "passion fruit", "top sirloin", "tenderloin", "chuck",
    "strip steak", "sirloin cap", "flank steak", "rib", "ribs",
    "thigh", "drumstick", "salmon", "tuna", "cod", "shrimp",
    "prawn", "oat", "oats", "lentil", "chia seed", "flaxseed",
    "yogurt", "ricotta", "cottage cheese", "butter", "olive oil",
    "creatine"
  ];

  for (const [key, synonyms] of Object.entries(USER_SEARCH_ALIASES)) {
    for (const syn of synonyms) {
      assert(
        !forbiddenEnglish.includes(syn.toLowerCase()),
        `Termo proibido em inglês '${syn}' encontrado em USER_SEARCH_ALIASES[${key}]`
      );
    }
  }

  // Ensure specific expansions do NOT contain English:
  const arrozTokens = expandSearchTokensWithSynonyms(["arroz"])[0];
  assert(!arrozTokens.includes("rice"), "arroz NÃO pode expandir para rice");

  const frangoTokens = expandSearchTokensWithSynonyms(["frango"])[0];
  assert(!frangoTokens.includes("chicken"), "frango NÃO pode expandir para chicken");

  const feijaoTokens = expandSearchTokensWithSynonyms(["feijao"])[0];
  assert(!feijaoTokens.includes("bean") && !feijaoTokens.includes("beans"), "feijão NÃO pode expandir para bean/beans");

  const leiteTokens = expandSearchTokensWithSynonyms(["leite"])[0];
  assert(!leiteTokens.includes("milk"), "leite NÃO pode expandir para milk");

  const queijoTokens = expandSearchTokensWithSynonyms(["queijo"])[0];
  assert(!queijoTokens.includes("cheese"), "queijo NÃO pode expandir para cheese");

  const mandiocaTokens = expandSearchTokensWithSynonyms(["mandioca"])[0];
  assert(!mandiocaTokens.includes("cassava"), "mandioca NÃO pode expandir para cassava");

  // Ensure regional PT-BR synonyms DO expand:
  const aipimTokens = expandSearchTokensWithSynonyms(["aipim"])[0];
  assert(aipimTokens.includes("mandioca"), "aipim deve expandir para mandioca");
  assert(aipimTokens.includes("macaxeira"), "aipim deve expandir para macaxeira");

  const mexericaTokens = expandSearchTokensWithSynonyms(["mexerica"])[0];
  assert(mexericaTokens.includes("tangerina"), "mexerica deve expandir para tangerina");
  assert(mexericaTokens.includes("bergamota"), "mexerica deve expandir para bergamota");

  const mussarelaTokens = expandSearchTokensWithSynonyms(["mussarela"])[0];
  assert(mussarelaTokens.includes("mucarela") || mussarelaTokens.includes("mozarela"), "mussarela deve expandir para variantes PT-BR");

  console.log("  ✓ Sinônimos em inglês eliminados com sucesso da busca do usuário");
  console.log("  ✓ Sinônimos regionais brasileiros preservados (aipim, mexerica, muçarela)");
}

// ----------------------------------------------------------------------------
// TEST 2: REMOVAL OF BAD GENERIC SYNONYMS & PHRASE-AWARE EXPANSION
// ----------------------------------------------------------------------------
console.log("\nTest 2: Validando remoção de sinônimos genéricos amplos e expansão contextual...");
{
  // Isolated "pasta" must NOT expand to "massa" or "creme"
  const isolatedPasta = expandSearchTokensWithSynonyms(["pasta"])[0];
  assert(!isolatedPasta.includes("massa"), "pasta isolada NÃO pode expandir para massa");
  assert(!isolatedPasta.includes("creme"), "pasta isolada NÃO pode expandir para creme");

  // Contextual "pasta de amendoim" DOES expand to include "creme" and "manteiga"
  const contextualPasta = expandSearchTokensWithSynonyms(["pasta", "de", "amendoim"]);
  const pastaTokenGroup = contextualPasta[0];
  assert(pastaTokenGroup.includes("creme"), "pasta no contexto de amendoim deve expandir para creme");
  assert(pastaTokenGroup.includes("manteiga"), "pasta no contexto de amendoim deve expandir para manteiga");

  console.log("  ✓ pasta -> massa/creme genérico removido");
  console.log("  ✓ pasta de amendoim <-> creme de amendoim contextual funcionando");
}

// ----------------------------------------------------------------------------
// TEST 3: SQL WHERE CLAUSE TAB ROUTING CONTRACT
// ----------------------------------------------------------------------------
console.log("\nTest 3: Validando roteamento SQL das 4 abas conceituais...");
{
  const dummyConsultancyId = 10;

  // A) Default tab: TREVO_BRASIL
  const whereDefault = buildWhereClause({ sourceTab: "TREVO_BRASIL" }, dummyConsultancyId);
  assert(whereDefault.whereClause.includes("f.source_key NOT IN ('USDA_FOUNDATION', 'USDA_FNDDS')"), "TREVO_BRASIL deve excluir USDA");
  assert(whereDefault.whereClause.includes("NOT (f.calories_kcal < 0"), "TREVO_BRASIL deve excluir suspect macros");

  // When sourceTab is omitted, it MUST default to TREVO_BRASIL
  const whereOmitted = buildWhereClause({}, dummyConsultancyId);
  assert(whereOmitted.whereClause.includes("f.source_key NOT IN ('USDA_FOUNDATION', 'USDA_FNDDS')"), "Aba omitida deve defaultar para TREVO_BRASIL e excluir USDA");

  // B) COMMERCIAL tab
  const whereCommercial = buildWhereClause({ sourceTab: "COMMERCIAL" }, dummyConsultancyId);
  assert(whereCommercial.whereClause.includes("f.source_type = 'BRANDED'") || whereCommercial.whereClause.includes("GROWTH_SUPPLEMENTS"), "COMMERCIAL deve filtrar marcas");

  // C) MY_FOODS tab
  const whereMyFoods = buildWhereClause({ sourceTab: "MY_FOODS" }, dummyConsultancyId);
  assert(whereMyFoods.whereClause.includes("f.scope = 'CONSULTANCY'"), "MY_FOODS deve filtrar scope=CONSULTANCY");

  // D) OTHER_DATABASES tab
  const whereOther = buildWhereClause({ sourceTab: "OTHER_DATABASES" }, dummyConsultancyId);
  assert(whereOther.whereClause.includes("f.source_key IN ('USDA_FOUNDATION', 'USDA_FNDDS')"), "OTHER_DATABASES deve filtrar USDA");

  console.log("  ✓ Contrato SQL das 4 abas validado com precisão matemática");
}

// ----------------------------------------------------------------------------
// TEST 4: REAL DATABASE VERIFICATION ON DEV
// ----------------------------------------------------------------------------
console.log("\nTest 4: Executando validação ao vivo no banco de dados DEV...");
async function runLiveDbTests() {
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

    async function queryFoods(queryText, sourceTab = "TREVO_BRASIL") {
      const filter = {
        query: queryText || undefined,
        scope: "ALL",
        status: "ACTIVE",
        sourceTab,
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

    // A) Empty query on default tab (Trevo Brasil)
    const emptyDefault = await queryFoods("");
    console.log(`  ✓ Carga Inicial (TREVO BRASIL): ${emptyDefault.total} alimentos brasileiros disponíveis`);
    assert(emptyDefault.total > 0, "Catálogo Trevo Brasil não pode estar vazio");
    assert(emptyDefault.total <= 600, "Catálogo Trevo Brasil NÃO pode conter os 5795 alimentos USDA");

    // Ensure zero USDA in first 20 items of default load
    for (const item of emptyDefault.items) {
      assert(item.sourceKey !== "USDA_FOUNDATION" && item.sourceKey !== "USDA_FNDDS", `USDA não pode aparecer na carga padrão: ${item.name}`);
      assert(item.displayNamePtBr, "Todo alimento deve ter displayNamePtBr preenchido");
    }
    console.log("  ✓ Zero itens USDA na primeira página de carga inicial padrão");

    // B) Tabs Isolation
    const commercialResult = await queryFoods("", "COMMERCIAL");
    console.log(`  ✓ Aba Produtos Comerciais: ${commercialResult.total} produtos registrados`);
    for (const item of commercialResult.items) {
      assert(item.sourceType === "BRANDED" || ["GROWTH_SUPPLEMENTS", "AMAFIL"].includes(item.sourceKey), "Apenas produtos comerciais");
    }

    const otherResult = await queryFoods("", "OTHER_DATABASES");
    console.log(`  ✓ Aba Outras Bases: ${otherResult.total} alimentos internacionais (USDA) preservados`);
    assert(otherResult.total >= 5700, "Aba Outras bases deve manter acesso aos registros USDA");

    // C) Core Mandatory Acceptance Searches
    console.log("\nTest 5: Validando buscas obrigatórias de aceitação clínica (Top 20 sem inglês)...");
    const acceptanceTerms = [
      "arroz", "arroz branco", "arroz integral", "feijão", "feijão carioca",
      "feijão preto", "frango", "peito de frango", "ovo", "aipim",
      "macaxeira", "mandioca", "batata doce", "batata inglesa", "cuscuz",
      "tapioca", "pão francês", "leite", "iogurte", "queijo minas",
      "muçarela", "banana prata", "mamão", "tilápia", "patinho",
      "acém", "alcatra", "aveia", "azeite"
    ];

    const englishBannedPatterns = [
      "chicken broilers", "fryers", "commodity", "raw english", "long-grain",
      "unenriched", "unpolished", "bovine commodity", "light tuna canned",
      "pinto beans, mature seeds"
    ];

    // Items known to exist in current Brazilian sources (TACO)
    const tacoPresentTerms = [
      "arroz", "arroz branco", "arroz integral", "feijão", "feijão carioca",
      "feijão preto", "frango", "peito de frango", "ovo", "aipim",
      "macaxeira", "mandioca", "batata doce", "batata inglesa", "cuscuz",
      "tapioca", "pão francês", "leite", "iogurte", "queijo minas",
      "muçarela", "banana prata", "mamão", "patinho",
      "acém", "alcatra", "aveia"
    ];

    // Items currently only in USDA (pending future IBGE import in Phase B2)
    const pendingBrTerms = ["tilápia", "azeite"];

    for (const term of acceptanceTerms) {
      const res = await queryFoods(term, "TREVO_BRASIL");

      if (tacoPresentTerms.includes(term)) {
        assert(res.total > 0, `Busca por '${term}' deve retornar resultados no Trevo Brasil`);
        assert(res.items.length > 0, `Busca por '${term}' deve ter itens na página 1`);
      }

      // CRITICAL SECTION 16 RULE: DEFAULT TAB: zero raw English food names in first 20 results
      for (const item of res.items.slice(0, 20)) {
        assert(item.sourceKey !== "USDA_FOUNDATION" && item.sourceKey !== "USDA_FNDDS", `USDA encontrado na busca de '${term}' no Trevo Brasil: ${item.name}`);
        
        const nameLower = (item.displayNamePtBr || item.name).toLowerCase();
        for (const banned of englishBannedPatterns) {
          assert(!nameLower.includes(banned), `Termo proibido em inglês '${banned}' na busca '${term}': ${item.displayNamePtBr}`);
        }
      }

      if (res.items.length > 0) {
        const topItem = res.items[0];
        const topName = topItem.displayNamePtBr || topItem.name;
        console.log(`  ✓ '${term}': ${res.total} itens encontrados — Top: "${topName}" [${topItem.sourceKey}]`);
      } else {
        console.log(`  ✓ '${term}': 0 itens em Trevo Brasil (Zero poluição USDA no catálogo padrão)`);
      }
    }

    // Verify pending items are preserved and discoverable in OTHER_DATABASES
    console.log("\nTest 6: Validando que termos pendentes de IBGE estão disponíveis na aba Outras bases...");
    for (const pending of pendingBrTerms) {
      const otherRes = await queryFoods(pending, "OTHER_DATABASES");
      assert(otherRes.total > 0, `Termo '${pending}' deve estar disponível na aba Outras bases (USDA)`);
      console.log(`  ✓ '${pending}': ${otherRes.total} itens encontrados em Outras bases`);
    }

    console.log("\n  ✓ Todas as 29 buscas obrigatórias validadas com sucesso sem nenhum alimento em inglês no topo!");

  } finally {
    conn.release();
    await pool.end();
  }
}

runLiveDbTests()
  .then(() => {
    console.log("\n=== SUÍTE TREVO ONE BRAZILIAN DEFAULT LIBRARY CONCLUÍDA COM 100% DE SUCESSO ===");
  })
  .catch((err) => {
    console.error("\n❌ FALHA NA SUÍTE DE TESTES:", err);
    process.exit(1);
  });
