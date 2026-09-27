/**
 * Test: Nutrition V2 Canonical Food Pagination & Result Set Integrity (Phase B2A.4)
 *
 * Rules Tested:
 * 1. TOTALS MATCH USER EXPERIENCE:
 *    - API returns canonical total, not raw database row count.
 *    - DEV baseline: TACO + IBGE raw source records = 2368 -> canonical count = 2334.
 *    - Total active candidates with approved BR sources (TACO + IBGE + Growth):
 *      raw = 2375, canonical total = 2341.
 *    - totalPages = Math.ceil(canonicalTotal / pageSize).
 * 2. PAGE SIZE CORRECTNESS:
 *    - For pageSize in [1, 2, 3, 5, 20], normal non-final pages contain EXACTLY pageSize distinct canonical foods.
 * 3. NO DUPLICATES ACROSS PAGES:
 *    - DUPLICATE_CANONICAL_IDS_ACROSS_PAGES = 0 across iterated pages.
 *    - Tested on: default catalog, mandioca, tangerina, muçarela, arroz, feijão.
 * 4. COMPLETE ALTERNATIVE SOURCES:
 *    - Alternative sources are never truncated or affected by raw SQL page boundaries.
 *    - "Mandioca frita" exposes 1 primary + 3 IBGE alternatives (MANDIOCA_FRITA_TOTAL_SOURCES = 4) even at pageSize = 1.
 */

import { register } from "node:module";
register("./ts-loader.mjs", import.meta.url);

import assert from "node:assert/strict";
import fs from "node:fs";
import mysql from "mysql2/promise";

const {
  listUnifiedFoodsForNutritionist,
  getFoodSourceAlternatives,
} = await import("../lib/nutrition-v2/food-repository.ts");

const {
  groupCanonicalFoods,
  mapFoodRow,
} = await import("../lib/nutrition-v2/food-query-builder.ts");

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

process.env.DB_HOST = env.DB_HOST;
process.env.DB_USER = env.DB_USER;
process.env.DB_PASSWORD = env.DB_PASSWORD;
process.env.DB_NAME = env.DB_NAME;
process.env.DB_PORT = env.DB_PORT || "3306";

function makeContext(consultancyId = 1) {
  const roles = ["NUTRITIONIST"];
  const hasRole = (r) => roles.includes(r);
  return {
    userId: 101,
    userPublicId: "usr-101",
    isPlatformAdmin: false,
    consultancyId,
    consultancyPublicId: "edccc5a2-748c-49da-91b0-81c5140049c6",
    consultancySlug: `consultancy-${consultancyId}`,
    membershipId: 1010,
    membershipPublicId: "mem-101",
    roles,
    hasRole,
    canAuthorNutrition: true,
    canViewNutrition: true,
    canManageConsultancy: false,
    canManageGlobal: false,
    isStudent: false,
  };
}

async function run() {
  console.log("=== TESTE: CANONICAL FOOD PAGINATION & INTEGRITY (B2A.4) ===\n");

  const pool = mysql.createPool({
    host: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    port: Number(env.DB_PORT || 3306),
  });

  try {
    const [dbCheck] = await pool.query("SELECT DATABASE() as db");
    assert.equal(dbCheck[0].db, DEV_DB_NAME, "Target DB must be DEV");
    console.log(`Database verified: ${dbCheck[0].db}`);

    const ctx = makeContext(1);

    // =========================================================================
    // TEST 1: TOTALS MUST MATCH CANONICAL EXPERIENCE
    // =========================================================================
    console.log("\nTest 1: Validando totais canônicos na listagem unificada...");
    const [tacoIbgeRows] = await pool.query(
      "SELECT COUNT(*) as raw_total FROM nutrition_v2_foods WHERE source_key IN ('TACO', 'IBGE_POF_2008_2009') AND deleted_at IS NULL AND status = 'ACTIVE'"
    );
    const rawBrSourceRecords = Number(tacoIbgeRows[0].raw_total);
    console.log(`  RAW_BR_SOURCE_RECORDS (TACO + IBGE): ${rawBrSourceRecords} (expected: 2368)`);
    assert.equal(rawBrSourceRecords, 2368, "RAW_BR_SOURCE_RECORDS deve ser exatamente 2368");

    const defaultList = await listUnifiedFoodsForNutritionist(ctx, { pageSize: 20, page: 1 });
    console.log(`  API_DEFAULT_TOTAL (canonical total): ${defaultList.total}`);

    // Verify canonical calculation matches in-memory grouping of all active candidates
    const [allCandidateRows] = await pool.query(`
      SELECT f.*,
        (SELECT COUNT(*) FROM nutrition_v2_food_portions fp WHERE fp.food_id = f.id AND fp.deleted_at IS NULL AND fp.status = 'ACTIVE') AS portions_count
      FROM nutrition_v2_foods f
      WHERE f.deleted_at IS NULL AND f.status = 'ACTIVE'
        AND (f.source_key IN ('TACO', 'IBGE_POF_2008_2009', 'GROWTH_SUPPLEMENTS') OR (f.scope = 'CONSULTANCY' AND f.consultancy_id = 1))
    `);
    const mappedCandidates = allCandidateRows.map((r) => mapFoodRow(r));
    const expectedCanonicalTotal = groupCanonicalFoods(mappedCandidates).length;
    console.log(`  Calculated canonical total from candidates: ${expectedCanonicalTotal}`);

    assert.equal(defaultList.total, expectedCanonicalTotal, "Total retornado pela API deve ser exatamente o total canônico calculado");
    assert.equal(defaultList.totalPages, Math.ceil(defaultList.total / 20), "totalPages deve ser ceil(canonicalTotal / pageSize)");
    console.log(`  totalPages para pageSize 20: ${defaultList.totalPages} (esperado: ${Math.ceil(defaultList.total / 20)})`);
    console.log("  CANONICAL_TOTAL_MATCH = YES");

    // =========================================================================
    // TEST 2: PAGE SIZE CORRECTNESS (1, 2, 3, 5, 20)
    // =========================================================================
    console.log("\nTest 2: Validando exatidão de pageSize para páginas normais...");
    const pageSizes = [1, 2, 3, 5, 20];
    for (const ps of pageSizes) {
      const pageResult = await listUnifiedFoodsForNutritionist(ctx, { pageSize: ps, page: 1 });
      assert.equal(pageResult.items.length, ps, `Página inicial com pageSize=${ps} deve conter exatamente ${ps} itens (got ${pageResult.items.length})`);

      const distinctIds = new Set(pageResult.items.map((it) => it.canonicalId));
      assert.equal(distinctIds.size, ps, `Todos os ${ps} itens da página devem ser canonicamente distintos`);
      console.log(`  ✓ pageSize=${ps}: Retornou exatamente ${pageResult.items.length} itens canônicos distintos`);
    }
    console.log("  FULL_PAGE_SIZE = PASS");

    // =========================================================================
    // TEST 3: NO DUPLICATE CANONICAL IDS ACROSS PAGES
    // =========================================================================
    console.log("\nTest 3: Validando ausência de alimentos duplicados entre páginas...");
    const queriesToTest = [
      { label: "default catalog", query: undefined, maxPages: 5, pageSize: 20 },
      { label: "mandioca", query: "mandioca", maxPages: 10, pageSize: 5 },
      { label: "tangerina", query: "tangerina", maxPages: 10, pageSize: 2 },
      { label: "muçarela", query: "muçarela", maxPages: 10, pageSize: 2 },
      { label: "arroz", query: "arroz", maxPages: 10, pageSize: 5 },
      { label: "feijão", query: "feijão", maxPages: 10, pageSize: 5 },
    ];

    let totalDuplicateCountAcrossAll = 0;

    for (const qt of queriesToTest) {
      const seenIds = new Set();
      let duplicatesForQuery = 0;

      const firstPage = await listUnifiedFoodsForNutritionist(ctx, {
        query: qt.query,
        pageSize: qt.pageSize,
        page: 1,
      });

      const pagesToFetch = Math.min(firstPage.totalPages, qt.maxPages);

      for (let p = 1; p <= pagesToFetch; p++) {
        const pageRes = p === 1 ? firstPage : await listUnifiedFoodsForNutritionist(ctx, {
          query: qt.query,
          pageSize: qt.pageSize,
          page: p,
        });

        for (const item of pageRes.items) {
          const id = item.canonicalId || item.publicId;
          if (seenIds.has(id)) {
            duplicatesForQuery++;
            console.error(`    ALERTA DUPLICADO na busca '${qt.label}': ${id} ("${item.displayNamePtBr}")`);
          } else {
            seenIds.add(id);
          }
        }
      }

      console.log(`  ✓ '${qt.label}': ${seenIds.size} itens canônicos coletados ao longo de ${pagesToFetch} páginas (duplicatas: ${duplicatesForQuery})`);
      assert.equal(duplicatesForQuery, 0, `Nenhum ID canônico duplicado pode ocorrer na busca '${qt.label}'`);
      totalDuplicateCountAcrossAll += duplicatesForQuery;
    }

    assert.equal(totalDuplicateCountAcrossAll, 0, "DUPLICATE_CANONICAL_IDS_ACROSS_PAGES deve ser 0");
    console.log("  DUPLICATE_CANONICAL_IDS_ACROSS_PAGES = 0");
    console.log("  CANONICAL_PAGINATION = PASS");

    // =========================================================================
    // TEST 4: ALTERNATIVE SOURCES MUST BE COMPLETE (PAGE SIZE INDEPENDENT)
    // =========================================================================
    console.log("\nTest 4: Validando integridade de fontes alternativas independente do tamanho de página...");

    // Search with pageSize = 1
    const p1 = await listUnifiedFoodsForNutritionist(ctx, {
      query: "mandioca frita",
      pageSize: 1,
      page: 1,
    });
    assert.equal(p1.items.length, 1, "Deve retornar 1 card");
    const mfCardP1 = p1.items[0];
    console.log(`  Mandioca frita card (pageSize=1):`);
    console.log(`    Primary: "${mfCardP1.displayNamePtBr}" [${mfCardP1.sourceKey}]`);
    console.log(`    totalAvailableSources: ${mfCardP1.totalAvailableSources}`);
    console.log(`    alternativeSources length: ${mfCardP1.alternativeSources?.length}`);

    assert.equal(mfCardP1.totalAvailableSources, 4, "Mandioca frita deve reportar totalAvailableSources = 4 mesmo com pageSize=1");
    assert.equal(mfCardP1.alternativeSources?.length, 3, "Mandioca frita deve conter as 3 fontes alternativas mesmo com pageSize=1");
    assert.equal(mfCardP1.sourceKey, "TACO", "Primary deve ser TACO");

    // Repository getFoodSourceAlternatives call
    const altsDirect = await getFoodSourceAlternatives(ctx, mfCardP1.publicId);
    assert(altsDirect, "getFoodSourceAlternatives deve retornar proveniência");
    assert.equal(altsDirect.alternatives.length, 3, "Repositório deve retornar 3 alternativas do IBGE");
    console.log("  ✓ getFoodSourceAlternatives confirma 3 fontes alternativas vinculadas");

    console.log("  MANDIOCA_FRITA_TOTAL_SOURCES = 4");
    console.log("  ALTERNATIVE_SOURCES_COMPLETE = PASS");

    console.log("\n=== TESTE DE PAGINAÇÃO CANÔNICA CONCLUÍDO COM 100% DE SUCESSO ===");
  } finally {
    await pool.end();
  }
}

run().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
