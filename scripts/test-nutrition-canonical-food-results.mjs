/**
 * Test: Canonical Result Consolidation & Non-Destructive Multi-Source Grouping (Phase B2A.3)
 *
 * Rules Tested:
 * 1. NO DUPLICATE CANONICAL CARDS IN DEFAULT RESULT SET:
 *    - Default catalog exposes exactly 1 primary card per canonical food identity + preparation.
 *    - DUPLICATE_CANONICAL_DEFAULT_RESULTS = 0.
 * 2. SOURCE RECORDS REMAIN PRESENT:
 *    - Zero source records deleted (RAW_SOURCE_RECORD_COUNT = 2368 preserved in DB).
 * 3. NO NUTRIENTS AVERAGED:
 *    - Nutrition values are NEVER averaged or merged.
 *    - Primary card carries its exact source nutritional composition.
 * 4. NO SOURCE DATA OVERWRITTEN:
 *    - Underlying alternative source records retain their original macros in the database.
 * 5. ALIASES RESOLVE TO SAME CANONICAL RESULT:
 *    - cacetinho, pão de sal -> Pão francês
 *    - aipim, macaxeira -> Mandioca cozida
 *    - mexerica, bergamota -> Tangerina
 *    - mussarela -> Muçarela
 * 6. ALTERNATE SOURCE PROVENANCE DISCOVERABLE IN REPOSITORY LAYER:
 *    - Primary canonical card contains all alternate source records with their provenance and macros.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import mysql from "mysql2/promise";
import {
  mapFoodRow,
  groupCanonicalFoods,
  getCanonicalFoodKey,
  buildSelectFoodsQuery,
  
} from "../lib/nutrition-v2/food-query-builder.ts";

const env = {};
fs.readFileSync(".env.local", "utf8").split("\n").forEach((l) => {
  const parts = l.trim().split("=");
  const k = parts[0];
  const v = parts.slice(1).join("=");
  if (k && v) env[k.trim()] = v.trim();
});

const EXPECTED_HOST = "srv1595.hstgr.io";
const DEV_DB_NAME = "u406031981_trevoone_dev";

if (env.DB_HOST !== EXPECTED_HOST) {
  throw new Error(`Invalid host: ${env.DB_HOST}`);
}
if (env.DB_NAME !== DEV_DB_NAME) {
  throw new Error(`ABSOLUTE GUARD: DB is NOT DEV: ${env.DB_NAME}`);
}

async function run() {
  console.log("=== TESTE: CANONICAL FOOD RESULTS CONSOLIDATION (B2A.3) ===\n");

  const pool = mysql.createPool({
    host: env.DB_HOST,
    port: Number(env.DB_PORT) || 3306,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 2,
  });

  try {
    const [dbCheck] = await pool.query("SELECT DATABASE() AS db");
    assert.equal(dbCheck[0].db, DEV_DB_NAME, "Target is NOT DEV database!");

    // 1. Audit RAW_SOURCE_RECORD_COUNT in Database
    console.log("Test 1: Validando preservação integral dos registros brutos das fontes...");
    const [allRows] = await pool.query(`
      SELECT f.*,
        (SELECT COUNT(*) FROM nutrition_v2_food_portions fp WHERE fp.food_id = f.id AND fp.deleted_at IS NULL AND fp.status = 'ACTIVE') AS portions_count
      FROM nutrition_v2_foods f
      WHERE f.source_key IN ('TACO', 'IBGE_POF_2008_2009')
    `);

    const rawBrSourceRecords = allRows.length;
    console.log(`  RAW_SOURCE_RECORD_COUNT: ${rawBrSourceRecords} (expected: 2368)`);
    assert.equal(rawBrSourceRecords, 2368, "RAW_SOURCE_RECORD_COUNT deve ser exatamente 2368");

    // 2. Canonical Grouping across entire Brazilian library
    console.log("\nTest 2: Aplicando agrupamento canônico não-destrutivo na biblioteca completa...");
    const dtos = allRows.map((r) => mapFoodRow(r));
    const canonicalResults = groupCanonicalFoods(dtos);

    const canonicalCount = canonicalResults.length;
    console.log(`  CANONICAL_DEFAULT_RESULT_COUNT: ${canonicalCount}`);
    assert(canonicalCount < rawBrSourceRecords, "Canonical count deve ser menor que total bruto de linhas");

    // Check for duplicate canonical visible display names in consolidated set
    const displayCountMap = new Map();
    for (const item of canonicalResults) {
      const dn = item.displayNamePtBr || item.name;
      displayCountMap.set(dn, (displayCountMap.get(dn) || 0) + 1);
    }
    const duplicateCanonical = Array.from(displayCountMap.entries()).filter(([, c]) => c > 1);
    console.log(`  DUPLICATE_CANONICAL_DEFAULT_RESULTS: ${duplicateCanonical.length} (expected: 0)`);
    if (duplicateCanonical.length > 0) {
      console.error("Duplicate canonical cards found:", duplicateCanonical);
    }
    assert.equal(duplicateCanonical.length, 0, "Nenhum card duplicado visível deve existir no resultado canônico padrão!");

    // 3. Audit Specific Multi-Source Collision Group: Mandioca Frita
    console.log("\nTest 3: Auditando consolidação de 'Mandioca frita' (TACO vs IBGE)...");
    const mandiocaFritaCard = canonicalResults.find((c) => (c.displayNamePtBr || "").toLowerCase() === "mandioca frita");
    assert(mandiocaFritaCard, "Card canônico 'Mandioca frita' deve existir");
    console.log(`  Mandioca frita Primary Source: ${mandiocaFritaCard.sourceKey} (${mandiocaFritaCard.sourceExternalCode})`);
    assert.equal(mandiocaFritaCard.sourceKey, "TACO", "TACO analítico deve ser a fonte primária de 'Mandioca frita'");

    // Verify nutrients are NOT averaged
    console.log("  Mandioca frita Primary Nutrients:", {
      kcal: mandiocaFritaCard.caloriesKcal,
      fat: mandiocaFritaCard.fatG,
      carb: mandiocaFritaCard.carbohydrateG,
      prot: mandiocaFritaCard.proteinG,
    });
    assert.equal(mandiocaFritaCard.caloriesKcal, 300, "Calorias da TACO (300 kcal) devem ser preservadas sem média!");
    assert.equal(mandiocaFritaCard.fatG, 11.2, "Gorduras da TACO (11.2g) devem ser preservadas sem média!");

    // Verify alternate sources are attached
    assert(mandiocaFritaCard.alternativeSources && mandiocaFritaCard.alternativeSources.length >= 3, "Fontes alternativas do IBGE devem estar anexadas");
    console.log(`  Alternative sources attached: ${mandiocaFritaCard.alternativeSources.length}`);
    for (const alt of mandiocaFritaCard.alternativeSources) {
      console.log(`    - [${alt.sourceKey} ${alt.sourceExternalCode}] "${alt.name}" -> ${alt.caloriesKcal} kcal, ${alt.fatG}g fat`);
      assert.equal(alt.caloriesKcal, 162.74, "Nutrientes da fonte IBGE alternativa devem estar intactos");
    }

    // 4. Verify DB Row for IBGE Mandioca Frita was NOT overwritten
    console.log("\nTest 4: Verificando que dados originais do IBGE no banco de dados NÃO foram sobrescritos...");
    const [ibgeRow] = await pool.query(`
      SELECT calories_kcal, fat_g, carbohydrate_g, protein_g
      FROM nutrition_v2_foods
      WHERE source_key = 'IBGE_POF_2008_2009' AND source_external_code = '6400601:5'
    `);
    assert(ibgeRow.length > 0, "Registro IBGE 6400601:5 deve existir no banco");
    console.log("  IBGE DB Row values:", ibgeRow[0]);
    assert.equal(Number(ibgeRow[0].calories_kcal), 162.74, "Calorias do IBGE no banco não podem ter sido alteradas!");
    assert.equal(Number(ibgeRow[0].fat_g), 5.26, "Gordura do IBGE no banco não pode ter sido alterada!");

    // 5. Test Search Aliases resolve to canonical primary
    console.log("\nTest 5: Validando que apelidos resolvem para o card canônico primário...");
    async function searchCanonicalFoods(term) {
      const filter = {
        query: term,
        status: "ACTIVE",
        sourceTab: "TREVO_BRASIL",
        page: 1,
        pageSize: 10,
      };
      const selectQuery = buildSelectFoodsQuery(filter, 1, { isUnified: true });
      const [rows] = await pool.query(selectQuery.fullSql, selectQuery.selectParams);
      const rawDtos = rows.map((r) => mapFoodRow(r));
      return groupCanonicalFoods(rawDtos);
    }

    const aliasCases = [
      { query: "cacetinho", expectedCanonical: "Pão francês" },
      { query: "pão de sal", expectedCanonical: "Pão francês" },
      { query: "aipim", expectedCanonical: "Mandioca cozida" },
      { query: "macaxeira", expectedCanonical: "Mandioca cozida" },
      { query: "mexerica", expectedCanonical: "Tangerina" },
      { query: "bergamota", expectedCanonical: "Tangerina" },
      { query: "mussarela", expectedCanonical: "Muçarela" },
    ];

    for (const ac of aliasCases) {
      const items = await searchCanonicalFoods(ac.query);
      assert(items.length > 0, `Busca por '${ac.query}' deve retornar resultados`);
      const top = items[0];
      assert.equal(top.displayNamePtBr, ac.expectedCanonical, `Apelido '${ac.query}' deveria resolver para '${ac.expectedCanonical}', got '${top.displayNamePtBr}'`);
      console.log(`  ✓ '${ac.query}' -> Top Canônico: "${top.displayNamePtBr}" [${top.sourceKey}] (card único)`);
    }

    // 6. Test Repository Layer Discoverability
    console.log("\nTest 6: Validando recuperabilidade de fontes alternativas na camada de repositório...");
    const targetKey = getCanonicalFoodKey(mandiocaFritaCard);
    const siblings = dtos.filter((it) => getCanonicalFoodKey(it) === targetKey);
    const consolidated = groupCanonicalFoods(siblings);
    const primary = consolidated[0];
    assert(primary, "Primary deve existir");
    assert.equal(primary.sourceKey, "TACO", "Primary deve ser TACO");
    assert(primary.alternativeSources && primary.alternativeSources.length >= 3, "Deve retornar as 3 alternativas do IBGE");
    console.log(`  ✓ Proveniência alternativa recuperada com sucesso (${primary.alternativeSources.length} fontes vinculadas)`);

    console.log("\n=== TESTE DE CONSOLIDAÇÃO CANÔNICA CONCLUÍDO COM 100% DE SUCESSO ===");
  } finally {
    await pool.end();
  }
}

run().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
