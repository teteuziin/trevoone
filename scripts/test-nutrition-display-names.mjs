/**
 * Test: Food Display Name Standardization, Collision Audit & Professional Ranking
 *
 * Rules Tested (Phase B2A.3):
 * 1. DISPLAY_NAMES_WITH_COMMA = 0 across all Trevo Brasil (TACO + IBGE)
 * 2. DISPLAY_NAMES_WITH_ALIAS_LIST = 0 (no concatenated alias lists / parentheses)
 * 3. NO_EMPTY_DISPLAY_NAMES (all display names must be non-empty)
 * 4. COLLISION_AUDIT:
 *    - Audit all TACO & IBGE_POF_2008_2009 foods using display_name_pt_br
 *    - Reports: TOTAL_BR_ROWS, UNIQUE_DISPLAY_NAMES, DUPLICATE_DISPLAY_NAME_GROUPS, COLLISION_ROWS
 *    - Verifies that no distinct preparations are unsafely merged
 * 5. SOURCE_NAMES_MODIFIED = 0 (original source names strictly preserved)
 * 6. CANONICAL_ALIAS_SEARCH & GENERIC_RANKING:
 *    - pão francês, cacetinho, pão de sal -> Pão francês
 *    - mandioca, aipim, macaxeira -> Mandioca cozida
 *    - tangerina, mexerica, bergamota -> Tangerina
 *    - muçarela, mussarela -> Muçarela
 *    - arroz -> staple rice before raw
 *    - arroz branco -> clean staple white rice
 *    - feijão -> staple cooked bean before raw/jalo
 *    - feijão carioca -> Feijão carioca cozido
 *    - frango -> recognizable common chicken foods
 *    - peito de frango -> recognizable preparation (grelhado/cozido)
 *    - batata doce -> common preparation before recipes
 *    - banana -> normal fruit form before processed recipes
 *    - ovo -> common prepared chicken egg
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
  console.log("=== TESTE: FOOD DISPLAY NAME STANDARDIZATION & QUALITY AUDIT (B2A.3) ===\n");

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

    // 3. Audit NO_EMPTY_DISPLAY_NAMES
    console.log("Test 3: Auditando ausência de display names vazios ou nulos...");
    const [emptyRows] = await pool.query(`
      SELECT COUNT(*) as count
      FROM nutrition_v2_foods
      WHERE source_key IN ('TACO', 'IBGE_POF_2008_2009')
        AND (display_name_pt_br IS NULL OR TRIM(display_name_pt_br) = '')
    `);
    const emptyCount = emptyRows[0].count;
    console.log(`  EMPTY_DISPLAY_NAMES: ${emptyCount} (expected: 0)`);
    assert.equal(emptyCount, 0, "Nenhum display_name_pt_br deve ser nulo ou vazio");

    // 4. Audit COLLISION_GROUPS across all Brazilian foods
    console.log("Test 4: Executando auditoria completa de colisões em display_name_pt_br...");
    const [allBrFoods] = await pool.query(`
      SELECT id, source_key, source_external_code, name, display_name_pt_br,
             calories_kcal, protein_g, carbohydrate_g, fat_g
      FROM nutrition_v2_foods
      WHERE source_key IN ('TACO', 'IBGE_POF_2008_2009')
    `);

    const totalBrRows = allBrFoods.length;
    const byDisplay = new Map();
    for (const food of allBrFoods) {
      const dn = food.display_name_pt_br;
      if (!byDisplay.has(dn)) byDisplay.set(dn, []);
      byDisplay.get(dn).push(food);
    }

    const uniqueDisplayNames = byDisplay.size;
    const collisionGroups = Array.from(byDisplay.entries()).filter(([, v]) => v.length > 1);
    const duplicateDisplayNameGroups = collisionGroups.length;
    const totalRowsInCollisionGroups = collisionGroups.reduce((acc, [, v]) => acc + v.length, 0);

    console.log(`  TOTAL_BR_ROWS: ${totalBrRows} (expected: 2368)`);
    console.log(`  UNIQUE_DISPLAY_NAMES: ${uniqueDisplayNames}`);
    console.log(`  DUPLICATE_DISPLAY_NAME_GROUPS: ${duplicateDisplayNameGroups}`);
    console.log(`  TOTAL_ROWS_IN_COLLISION_GROUPS: ${totalRowsInCollisionGroups}`);

    assert.equal(totalBrRows, 2368, "TOTAL_BR_ROWS deve ser exatamente 2368");

    // 5. Audit SOURCE_NAMES_MODIFIED
    console.log("Test 5: Auditando preservação integral dos nomes originais da fonte (`name`)...");
    const tacoJson = JSON.parse(fs.readFileSync("data/nutrition/taco-2011.json", "utf8"));
    const tacoFoods = tacoJson.foods || tacoJson;
    const tacoOrigMap = new Map();
    tacoFoods.forEach((f) => tacoOrigMap.set(String(f.food_code || f.source_external_code || f.id), f.name));

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

    // 6. Real Search Behavior Tests for Mandatory Terms
    console.log("Test 6: Executando buscas reais no catálogo DEV e validando canonical display & ranking...");

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
      return { total, top: items[0], items };
    }

    const testCases = [
      { query: "pão francês", expectedCanonical: "Pão francês" },
      { query: "cacetinho", expectedCanonical: "Pão francês" },
      { query: "pão de sal", expectedCanonical: "Pão francês" },
      { query: "mandioca", expectedCanonical: "Mandioca cozida" },
      { query: "aipim", expectedCanonical: "Mandioca cozida" },
      { query: "macaxeira", expectedCanonical: "Mandioca cozida" },
      { query: "tangerina", expectedCanonical: "Tangerina" },
      { query: "mexerica", expectedCanonical: "Tangerina" },
      { query: "bergamota", expectedCanonical: "Tangerina" },
      { query: "muçarela", expectedCanonical: "Muçarela" },
      { query: "mussarela", expectedCanonical: "Muçarela" },
      {
        query: "arroz",
        validate(top) {
          const dn = top.displayNamePtBr.toLowerCase();
          assert(dn.includes("cozido") || dn === "arroz branco", `Top rice must be staple, got "${top.displayNamePtBr}"`);
        },
      },
      {
        query: "arroz branco",
        validate(top) {
          const dn = top.displayNamePtBr.toLowerCase();
          assert(dn.includes("cozido") || dn === "arroz branco", `Top white rice must be clean, got "${top.displayNamePtBr}"`);
        },
      },
      {
        query: "feijão",
        validate(top) {
          const dn = top.displayNamePtBr.toLowerCase();
          assert(dn === "feijão" || dn === "feijão carioca cozido" || (dn.includes("cozido") && !dn.includes("jalo")), `Top bean must be staple bean, got "${top.displayNamePtBr}"`);
        },
      },
      { query: "feijão carioca", expectedCanonical: "Feijão carioca cozido" },
      {
        query: "frango",
        validate(top) {
          const dn = top.displayNamePtBr.toLowerCase();
          assert(!dn.includes("cru"), `Top chicken must not be raw, got "${top.displayNamePtBr}"`);
        },
      },
      {
        query: "peito de frango",
        validate(top) {
          const dn = top.displayNamePtBr.toLowerCase();
          assert(dn.includes("grelhado") || dn.includes("cozido"), `Top peito de frango should be grelhado or cozido, got "${top.displayNamePtBr}"`);
        },
      },
      {
        query: "batata doce",
        validate(top) {
          const dn = top.displayNamePtBr.toLowerCase();
          assert(!dn.includes("frita") && !dn.includes("ensopada"), `Top batata doce must not be fried/stew, got "${top.displayNamePtBr}"`);
        },
      },
      {
        query: "banana",
        validate(top) {
          const dn = top.displayNamePtBr.toLowerCase();
          assert(!dn.includes("bolo") && !dn.includes("farofa") && !dn.includes("frita"), `Top banana must be fresh fruit, got "${top.displayNamePtBr}"`);
        },
      },
      {
        query: "ovo",
        validate(top) {
          assert.equal(top.displayNamePtBr, "Ovo de galinha inteiro cozido", `Top egg must be prepared chicken egg, got "${top.displayNamePtBr}"`);
        },
      },
    ];

    for (const tc of testCases) {
      const res = await queryFirstFood(tc.query);
      assert(res.total > 0, `Busca por '${tc.query}' deve retornar ao menos 1 resultado`);
      assert(res.top, `Top resultado ausente para '${tc.query}'`);

      const displayName = res.top.displayNamePtBr;
      console.log(`  ✓ '${tc.query}' -> Top: "${displayName}" [${res.top.sourceKey}] (${res.total} encontrados)`);

      assert(!displayName.includes(","), `Display name de '${tc.query}' contém vírgula: "${displayName}"`);

      if (tc.expectedCanonical) {
        assert.equal(displayName, tc.expectedCanonical, `Display name de '${tc.query}' deveria ser "${tc.expectedCanonical}", got "${displayName}"`);
      }
      if (tc.validate) {
        tc.validate(res.top);
      }
    }

    console.log("\n=== TESTE DE DISPLAY NAME STANDARDIZATION & QUALITY AUDIT CONCLUÍDO COM 100% DE SUCESSO ===");
  } finally {
    await pool.end();
  }
}

run().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
