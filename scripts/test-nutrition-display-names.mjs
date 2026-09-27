/**
 * Test: Food Display Name Standardization & Clean PT-BR Presentation
 *
 * Product Rules Tested:
 * 1. DISPLAY_NAMES_WITH_COMMA = 0 across all Trevo Brasil (TACO + IBGE)
 * 2. DISPLAY_NAMES_WITH_ALIAS_LIST = 0 (no concatenated alias lists / parentheses)
 * 3. SOURCE_NAMES_MODIFIED = 0 (original source names strictly preserved)
 * 4. Real Search Behavior for Mandatory Acceptance Terms:
 *    - pão francês, cacetinho, pão de sal -> canonical display: Pão francês
 *    - mandioca, aipim, macaxeira -> canonical display: Mandioca cozida
 *    - tangerina, mexerica, bergamota -> canonical display: Tangerina
 *    - muçarela, mussarela -> canonical display: Muçarela
 *    - arroz, frango, abadejo, carne de sol -> clean display without commas
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import mysql from "mysql2/promise";
import {
  buildCountQuery,
  buildSelectFoodsQuery,
  mapFoodRow,
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
  console.log("=== TESTE: FOOD DISPLAY NAME STANDARDIZATION & CLEAN PT-BR ===\n");

  const pool = mysql.createPool({
    host: env.DB_HOST,
    port: Number(env.DB_PORT) || 3306,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 1,
  });

  try {
    const [dbCheck] = await pool.query("SELECT DATABASE() AS db");
    assert.equal(dbCheck[0].db, DEV_DB_NAME, "Target is NOT DEV database!");

    // 1. Audit DISPLAY_NAMES_WITH_COMMA
    console.log("Test 1: Auditando ausência de vírgulas em display_name_pt_br...");
    const [commaRows] = await pool.query(`
      SELECT COUNT(*) as count
      FROM nutrition_v2_foods
      WHERE source_key IN ('TACO', 'IBGE_POF_2008_2009')
        AND display_name_pt_br LIKE '%,%'
    `);
    const commasCount = commaRows[0].count;
    console.log(`  DISPLAY_NAMES_WITH_COMMA: ${commasCount} (expected: 0)`);
    assert.equal(commasCount, 0, "Nenhum display_name_pt_br deve conter vírgula");

    // 2. Audit DISPLAY_NAMES_WITH_ALIAS_LIST
    console.log("Test 2: Auditando ausência de listas de apelidos/parênteses...");
    const [aliasListRows] = await pool.query(`
      SELECT COUNT(*) as count
      FROM nutrition_v2_foods
      WHERE source_key IN ('TACO', 'IBGE_POF_2008_2009')
        AND (display_name_pt_br LIKE '%(%' OR display_name_pt_br LIKE '%)%' OR display_name_pt_br LIKE '%/%' OR display_name_pt_br LIKE '% etc%' OR display_name_pt_br LIKE '%etc.%')
    `);
    const aliasListCount = aliasListRows[0].count;
    console.log(`  DISPLAY_NAMES_WITH_ALIAS_LIST: ${aliasListCount} (expected: 0)`);
    assert.equal(aliasListCount, 0, "Nenhum display_name_pt_br deve conter listas de apelidos ou parênteses");

    // 3. Audit SOURCE_NAMES_MODIFIED
    console.log("Test 3: Auditando preservação integral dos nomes originais da fonte (`name`)...");
    const tacoJson = JSON.parse(fs.readFileSync("data/nutrition/taco-2011.json", "utf8"));
    const tacoFoods = tacoJson.foods || tacoJson;
    const tacoOrigMap = new Map();
    tacoFoods.forEach((f) => tacoOrigMap.set(String(f.food_code || f.id), f.name));

    const [dbTaco] = await pool.query(`
      SELECT source_external_code, name
      FROM nutrition_v2_foods
      WHERE source_key = 'TACO'
    `);

    let modifiedTacoCount = 0;
    for (const row of dbTaco) {
      const orig = tacoOrigMap.get(String(row.source_external_code));
      if (orig && orig !== row.name) {
        modifiedTacoCount++;
      }
    }
    console.log(`  SOURCE_NAMES_MODIFIED (TACO): ${modifiedTacoCount} (expected: 0)`);
    assert.equal(modifiedTacoCount, 0, "Nenhum nome original da fonte TACO deve ter sido alterado");

    // 4. Real Search Behavior Tests for Mandatory Terms
    console.log("Test 4: Executando buscas reais no catálogo DEV e validando canonical display...");

    async function queryFirstFood(term) {
      const filter = {
        query: term,
        status: "ACTIVE",
        sourceTab: "TREVO_BRASIL",
        page: 1,
        pageSize: 5,
      };
      const countQuery = buildCountQuery(filter, 1);
      const [countRows] = await pool.query(countQuery.sql, countQuery.params);
      const total = Number(countRows[0]?.total || 0);

      const selectQuery = buildSelectFoodsQuery(filter, 1, { isUnified: true });
      const [rows] = await pool.query(selectQuery.fullSql, selectQuery.selectParams);
      const items = rows.map((r) => mapFoodRow(r));
      return { total, top: items[0] };
    }

    const testCases = [
      { query: "pão francês", expectedCanonicalPrefix: "Pão francês", expectNoComma: true },
      { query: "cacetinho", expectedCanonicalPrefix: "Pão francês", expectNoComma: true },
      { query: "pão de sal", expectedCanonicalPrefix: "Pão francês", expectNoComma: true },
      { query: "mandioca", expectedCanonicalPrefix: "Mandioca", expectNoComma: true },
      { query: "aipim", expectedCanonicalPrefix: "Mandioca", expectNoComma: true },
      { query: "macaxeira", expectedCanonicalPrefix: "Mandioca", expectNoComma: true },
      { query: "tangerina", expectedCanonicalPrefix: "Tangerina", expectNoComma: true },
      { query: "mexerica", expectedCanonicalPrefix: "Tangerina", expectNoComma: true },
      { query: "bergamota", expectedCanonicalPrefix: "Tangerina", expectNoComma: true },
      { query: "muçarela", expectedCanonicalPrefix: "Muçarela", expectNoComma: true },
      { query: "mussarela", expectedCanonicalPrefix: "Muçarela", expectNoComma: true },
      { query: "arroz", expectedCanonicalPrefix: "Arroz", expectNoComma: true },
      { query: "frango", expectedCanonicalPrefix: "", expectNoComma: true },
      { query: "abadejo", expectedCanonicalPrefix: "Filé de abadejo", expectNoComma: true },
      { query: "carne de sol", expectedCanonicalPrefix: "Carne de sol", expectNoComma: true },
    ];

    for (const tc of testCases) {
      const res = await queryFirstFood(tc.query);
      assert(res.total > 0, `Busca por '${tc.query}' deve retornar ao menos 1 resultado`);
      assert(res.top, `Top resultado ausente para '${tc.query}'`);

      const displayName = res.top.displayNamePtBr;
      console.log(`  ✓ '${tc.query}' -> ${res.total} encontrados | Top Display: "${displayName}" [${res.top.sourceKey}]`);

      if (tc.expectNoComma) {
        assert(!displayName.includes(","), `Display name de '${tc.query}' contém vírgula: "${displayName}"`);
      }
      if (tc.expectedCanonicalPrefix) {
        assert(
          displayName.toLowerCase().startsWith(tc.expectedCanonicalPrefix.toLowerCase()),
          `Display name de '${tc.query}' ("${displayName}") deveria começar com "${tc.expectedCanonicalPrefix}"`
        );
      }
    }

    console.log("\n=== TESTE DE DISPLAY NAME STANDARDIZATION CONCLUÍDO COM 100% DE SUCESSO ===");
  } finally {
    await pool.end();
  }
}

run().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
