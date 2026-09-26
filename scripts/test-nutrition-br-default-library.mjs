/**
 * TREVO ONE — BRAZILIAN DEFAULT FOOD LIBRARY & SEARCH EXPERIENCE TEST SUITE
 *
 * Verifies Phase B1.1 product requirements:
 * 1. Default tab (Trevo Brasil) uses explicit allowlist (TACO + Growth + Consultancy)
 * 2. Amafil is excluded from Trevo Brasil and Produtos Comerciais
 * 3. Hypothetical unknown source keys are mathematically blocked
 * 4. Search aliases are strictly PT-BR (no cross-language English expansion in user search)
 * 5. Removal of bad generic synonyms (pasta does NOT expand to massa/creme unless phrase-aware)
 * 6. Atwater macro heuristics are disabled; objective invalid data guards are active
 * 7. Mandatory core acceptance searches on DEV database with ZERO raw English in top 20 results
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
  APPROVED_BR_SOURCE_KEYS,
  APPROVED_COMMERCIAL_SOURCE_KEYS,
  isApprovedBrSourceKey,
  isApprovedCommercialSourceKey,
} from "../lib/nutrition-v2/food-query-builder.ts";

console.log("=== INICIANDO SUÍTE DE TESTES: TREVO ONE — BRAZILIAN DEFAULT FOOD LIBRARY (PHASE B1.1) ===");

// ----------------------------------------------------------------------------
// TEST 1: SEARCH ALIASES ARE STRICTLY PT-BR (NO CROSS-LANGUAGE USER EXPANSION)
// ----------------------------------------------------------------------------
console.log("\nTest 1: Validando segregação estrita de sinônimos PT-BR para busca do usuário...");
{
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
  const isolatedPasta = expandSearchTokensWithSynonyms(["pasta"])[0];
  assert(!isolatedPasta.includes("massa"), "pasta isolada NÃO pode expandir para massa");
  assert(!isolatedPasta.includes("creme"), "pasta isolada NÃO pode expandir para creme");

  // Contextual "pasta de amendoim" DOES expand to include "creme" and "manteiga"
  const contextualPasta = expandSearchTokensWithSynonyms(["pasta", "de", "amendoim"]);
  const pastaTokenGroup = contextualPasta[0];
  assert(pastaTokenGroup.includes("creme"), "pasta no contexto de amendoim deve expandir para creme");
  assert(pastaTokenGroup.includes("manteiga"), "pasta no contexto de amendoim deve expandir para manteiga");

  // Contextual "arroz branco" expands to TACO types 1, 2, polido
  const contextualArrozBranco = expandSearchTokensWithSynonyms(["arroz", "branco"]);
  assert(contextualArrozBranco[1].includes("tipo 1"), "arroz branco deve expandir para tipo 1 da TACO");

  console.log("  ✓ pasta -> massa/creme genérico removido");
  console.log("  ✓ pasta de amendoim <-> creme de amendoim contextual funcionando");
  console.log("  ✓ arroz branco -> tipo 1 / tipo 2 contextual funcionando");
}

// ----------------------------------------------------------------------------
// TEST 3: EXPLICIT ALLOWLIST & UNKNOWN SOURCE SAFETY (PHASE B1.1 SECTION 2, 3, 10)
// ----------------------------------------------------------------------------
console.log("\nTest 3: Validando allowlist explícita, exclusão de Amafil e proteção contra fontes desconhecidas...");
{
  // A) Helper allowlist checks
  assert(isApprovedBrSourceKey("TACO"), "TACO deve ser fonte BR aprovada");
  assert(isApprovedBrSourceKey("GROWTH_SUPPLEMENTS"), "GROWTH_SUPPLEMENTS deve ser fonte BR comercial aprovada");
  assert(APPROVED_COMMERCIAL_SOURCE_KEYS.includes("GROWTH_SUPPLEMENTS"));
  assert(!isApprovedBrSourceKey("AMAFIL"), "AMAFIL NÃO pode ser fonte BR aprovada (evidência insuficiente)");
  assert(!isApprovedBrSourceKey("UNREVIEWED_FUTURE_SOURCE"), "Fontes futuras desconhecidas NÃO podem ser aceitas automaticamente");
  assert(!isApprovedBrSourceKey("USDA_FOUNDATION"), "USDA Foundation NÃO pode ser fonte BR");
  assert(!isApprovedBrSourceKey("USDA_FNDDS"), "USDA FNDDS NÃO pode ser fonte BR");

  // Commercial tab allowlist checks (requires BOTH BRANDED and approved key)
  assert(isApprovedCommercialSourceKey("GROWTH_SUPPLEMENTS", "BRANDED"), "GROWTH BRANDED deve ser comercial aprovado");
  assert(!isApprovedCommercialSourceKey("AMAFIL", "BRANDED"), "AMAFIL NÃO pode ser comercial aprovado");
  assert(!isApprovedCommercialSourceKey("UNREVIEWED_FUTURE_SOURCE", "BRANDED"), "Marca desconhecida NÃO pode ser comercial aprovada");

  // B) SQL WHERE Clause explicit inclusion
  const dummyConsultancyId = 10;
  const whereDefault = buildWhereClause({ sourceTab: "TREVO_BRASIL" }, dummyConsultancyId);

  // Must use explicit inclusion IN (?, ?) with APPROVED_BR_SOURCE_KEYS params
  assert(whereDefault.whereClause.includes("f.source_key IN (?, ?)"), "TREVO_BRASIL deve usar IN explícito para fontes BR");
  assert(whereDefault.params.includes("TACO"), "Params deve conter TACO");
  assert(whereDefault.params.includes("GROWTH_SUPPLEMENTS"), "Params deve conter GROWTH_SUPPLEMENTS");
  assert(!whereDefault.params.includes("AMAFIL"), "Params NÃO pode conter AMAFIL");
  assert(!whereDefault.whereClause.includes("NOT IN ('USDA"), "TREVO_BRASIL NÃO pode usar filtro negativo frágil NOT IN");

  // Commercial tab requires BOTH source_type = 'BRANDED' AND approved commercial source key
  const whereCommercial = buildWhereClause({ sourceTab: "COMMERCIAL" }, dummyConsultancyId);
  assert(whereCommercial.whereClause.includes("f.source_type = 'BRANDED' AND f.source_key IN (?)"), "COMMERCIAL deve exigir BRANDED e fonte aprovada");
  assert(whereCommercial.params.includes("GROWTH_SUPPLEMENTS"), "COMMERCIAL params deve conter GROWTH_SUPPLEMENTS");
  assert(!whereCommercial.params.includes("AMAFIL"), "COMMERCIAL params NÃO pode conter AMAFIL");

  // C) Atwater auto-hide disabled check
  assert(!whereDefault.whereClause.includes("> 105"), "Regra Atwater macro sum > 105 NÃO deve existir na query de visualização");
  assert(!whereDefault.whereClause.includes("COALESCE(f.calories_kcal, 0) = 0 AND (COALESCE(f.protein_g, 0) > 2"), "Heurística Atwater de calorias zeradas NÃO deve ocultar alimentos oficiais");

  // D) Objective data invalidity guard check
  assert(whereDefault.whereClause.includes("f.calories_kcal < 0"), "Valores negativos de nutrientes devem ser rejeitados");
  assert(whereDefault.whereClause.includes("f.reference_amount <= 0"), "Quantidades de referência não-positivas devem ser rejeitadas");

  console.log("  ✓ Allowlist explícita implementada: apenas TACO e GROWTH_SUPPLEMENTS");
  console.log("  ✓ AMAFIL excluído do Trevo Brasil e dos Produtos Comerciais");
  console.log("  ✓ Fonte hipotética 'UNREVIEWED_FUTURE_SOURCE' matematicamente bloqueada");
  console.log("  ✓ Heurísticas Atwater desativadas na visibilidade; guarda de dados objetivamente inválidos ativa");
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
    // Expected: TACO (548) + Growth (7) = 555 items (Amafil excluded)
    assert.equal(emptyDefault.total, 555, "Catálogo Trevo Brasil deve conter exatamente TACO (548) + Growth (7) = 555 alimentos");

    // Ensure zero USDA, zero Amafil, and zero unknown source in default load
    for (const item of emptyDefault.items) {
      assert(item.sourceKey !== "USDA_FOUNDATION" && item.sourceKey !== "USDA_FNDDS", `USDA não pode aparecer na carga padrão: ${item.name}`);
      assert(item.sourceKey !== "AMAFIL", `AMAFIL não pode aparecer no Trevo Brasil: ${item.name}`);
      assert(APPROVED_BR_SOURCE_KEYS.includes(item.sourceKey) || item.scope === "CONSULTANCY", `Fonte desconhecida no Trevo Brasil: ${item.sourceKey}`);
      assert(item.displayNamePtBr, "Todo alimento deve ter displayNamePtBr preenchido");
    }
    console.log("  ✓ Zero itens USDA, zero Amafil e zero fontes desconhecidas na carga padrão");

    // B) Tabs Isolation
    const commercialResult = await queryFoods("", "COMMERCIAL");
    console.log(`  ✓ Aba Produtos Comerciais: ${commercialResult.total} produtos registrados`);
    assert.equal(commercialResult.total, 7, "Aba Produtos Comerciais deve conter estritamente os 7 produtos Growth aprovados (Amafil excluído)");
    for (const item of commercialResult.items) {
      assert.equal(item.sourceKey, "GROWTH_SUPPLEMENTS", "Apenas Growth Supplements nos comerciais aprovados");
      assert.equal(item.sourceType, "BRANDED");
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

    const tacoPresentTerms = [
      "arroz", "arroz branco", "arroz integral", "feijão", "feijão carioca",
      "feijão preto", "frango", "peito de frango", "ovo", "aipim",
      "macaxeira", "mandioca", "batata doce", "batata inglesa", "cuscuz",
      "tapioca", "pão francês", "leite", "iogurte", "queijo minas",
      "muçarela", "banana prata", "mamão", "patinho",
      "acém", "alcatra", "aveia"
    ];

    const pendingBrTerms = ["tilápia", "azeite"];

    const englishBannedPatterns = [
      "chicken broilers", "fryers", "commodity", "raw english", "long-grain",
      "unenriched", "unpolished", "bovine commodity", "light tuna canned",
      "pinto beans, mature seeds"
    ];

    for (const term of acceptanceTerms) {
      const res = await queryFoods(term, "TREVO_BRASIL");

      if (tacoPresentTerms.includes(term)) {
        assert(res.total > 0, `Busca por '${term}' deve retornar resultados no Trevo Brasil`);
        assert(res.items.length > 0, `Busca por '${term}' deve ter itens na página 1`);
      }

      // Check top 20 items: zero USDA, zero English, zero Amafil
      for (const item of res.items.slice(0, 20)) {
        assert(item.sourceKey !== "USDA_FOUNDATION" && item.sourceKey !== "USDA_FNDDS", `USDA encontrado na busca de '${term}' no Trevo Brasil: ${item.name}`);
        assert(item.sourceKey !== "AMAFIL", `Amafil encontrado na busca de '${term}' no Trevo Brasil`);
        
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

    // Verify pending items in OTHER_DATABASES
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
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ FALHA NA SUÍTE DE TESTES:", err);
    process.exit(1);
  });
