/**
 * Test: Brazilian Food Library Professional Search Ranking (Phase B2A.2)
 *
 * Validates real DEV catalog searches against food/category-aware ranking:
 * 1. pão francês: top = Pão francês
 * 2. cacetinho: top = Pão francês
 * 3. pão de sal: top = Pão francês
 * 4. aipim: top = Mandioca cozida
 * 5. macaxeira: top = Mandioca cozida
 * 6. mandioca: top = Mandioca cozida (plain cooked before recipes/fried)
 * 7. arroz: cooked everyday rice before raw/source-lab variants
 * 8. arroz branco: cooked white rice highly ranked
 * 9. feijão: cooked bean highly ranked before raw
 * 10. feijão carioca: top = Feijão carioca cozido
 * 11. frango: recognizable common chicken food
 * 12. peito de frango: recognizable preparation (grelhado/cozido)
 * 13. batata doce: common preparation before recipes
 * 14. banana: normal fresh fruit form before processed recipes
 * 15. ovo: common chicken egg preparation
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
  console.log("=== TESTE: BRAZILIAN FOOD SEARCH RANKING & CANONICAL RESOLUTION (B2A.2) ===\n");

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

    async function queryFoods(term, pageSize = 5) {
      const filter = {
        query: term,
        status: "ACTIVE",
        sourceTab: "TREVO_BRASIL",
        page: 1,
        pageSize,
      };
      const countQuery = buildCountQuery(filter, 1);
      const [countRows] = await pool.query(countQuery.sql, countQuery.params);
      const total = Number(countRows[0]?.total || 0);

      const selectQuery = buildSelectFoodsQuery(filter, 1, { isUnified: true });
      const [rows] = await pool.query(selectQuery.fullSql, selectQuery.selectParams);
      const items = rows.map((r) => mapFoodRow(r));
      return { total, items, top: items[0] };
    }

    const testSpecs = [
      {
        id: "PAO_FRANCES",
        query: "pão francês",
        validate(top) {
          assert.equal(top.displayNamePtBr, "Pão francês", `Expected 'Pão francês', got '${top.displayNamePtBr}'`);
        },
      },
      {
        id: "CACETINHO",
        query: "cacetinho",
        validate(top) {
          assert.equal(top.displayNamePtBr, "Pão francês", `Expected 'Pão francês' for cacetinho, got '${top.displayNamePtBr}'`);
        },
      },
      {
        id: "PAO_DE_SAL",
        query: "pão de sal",
        validate(top) {
          assert.equal(top.displayNamePtBr, "Pão francês", `Expected 'Pão francês' for pão de sal, got '${top.displayNamePtBr}'`);
        },
      },
      {
        id: "AIPIM",
        query: "aipim",
        validate(top) {
          assert.equal(top.displayNamePtBr, "Mandioca cozida", `Expected 'Mandioca cozida' for aipim, got '${top.displayNamePtBr}'`);
        },
      },
      {
        id: "MACAXEIRA",
        query: "macaxeira",
        validate(top) {
          assert.equal(top.displayNamePtBr, "Mandioca cozida", `Expected 'Mandioca cozida' for macaxeira, got '${top.displayNamePtBr}'`);
        },
      },
      {
        id: "MANDIOCA",
        query: "mandioca",
        validate(top) {
          assert.equal(top.displayNamePtBr, "Mandioca cozida", `Expected 'Mandioca cozida' for mandioca, got '${top.displayNamePtBr}'`);
        },
      },
      {
        id: "ARROZ",
        query: "arroz",
        validate(top) {
          const dn = top.displayNamePtBr.toLowerCase();
          assert(dn.includes("cozido"), `Top rice must be cooked, got '${top.displayNamePtBr}'`);
          assert(!dn.includes("cru"), `Top rice must not be raw, got '${top.displayNamePtBr}'`);
        },
      },
      {
        id: "ARROZ_BRANCO",
        query: "arroz branco",
        validate(top) {
          const dn = top.displayNamePtBr.toLowerCase();
          assert(dn.includes("cozido"), `Top white rice must be cooked, got '${top.displayNamePtBr}'`);
          assert(!dn.includes("integral"), `White rice should not be brown rice, got '${top.displayNamePtBr}'`);
        },
      },
      {
        id: "FEIJAO",
        query: "feijão",
        validate(top) {
          const dn = top.displayNamePtBr.toLowerCase();
          assert(dn.includes("cozido"), `Top bean must be cooked, got '${top.displayNamePtBr}'`);
          assert(!dn.includes("cru"), `Top bean must not be raw, got '${top.displayNamePtBr}'`);
        },
      },
      {
        id: "FEIJAO_CARIOCA",
        query: "feijão carioca",
        validate(top) {
          assert.equal(top.displayNamePtBr, "Feijão carioca cozido", `Expected 'Feijão carioca cozido', got '${top.displayNamePtBr}'`);
        },
      },
      {
        id: "FRANGO",
        query: "frango",
        validate(top) {
          const dn = top.displayNamePtBr.toLowerCase();
          assert(
            dn.includes("cozido") || dn.includes("cozida") || dn.includes("assado") || dn.includes("assada") || dn.includes("grelhado") || dn.includes("grelhada"),
            `Top chicken must be cooked/assado/grelhado, got '${top.displayNamePtBr}'`
          );
          assert(!dn.includes("cru"), `Top chicken must not be raw, got '${top.displayNamePtBr}'`);
        },
      },
      {
        id: "PEITO_DE_FRANGO",
        query: "peito de frango",
        validate(top) {
          const dn = top.displayNamePtBr.toLowerCase();
          assert(
            dn.includes("grelhado") || dn.includes("cozido"),
            `Top peito de frango should be grelhado or cozido, got '${top.displayNamePtBr}'`
          );
          assert(!dn.includes("cru"), `Top peito de frango must not be raw, got '${top.displayNamePtBr}'`);
        },
      },
      {
        id: "BATATA_DOCE",
        query: "batata doce",
        validate(top) {
          const dn = top.displayNamePtBr.toLowerCase();
          assert(!dn.includes("frita"), `Top sweet potato must not be fried, got '${top.displayNamePtBr}'`);
          assert(!dn.includes("ensopada"), `Top sweet potato must not be stewed, got '${top.displayNamePtBr}'`);
        },
      },
      {
        id: "BANANA",
        query: "banana",
        validate(top) {
          const dn = top.displayNamePtBr.toLowerCase();
          assert(!dn.includes("bolo"), `Top banana must not be cake, got '${top.displayNamePtBr}'`);
          assert(!dn.includes("farofa"), `Top banana must not be farofa, got '${top.displayNamePtBr}'`);
          assert(!dn.includes("frita"), `Top banana must not be fried, got '${top.displayNamePtBr}'`);
          assert(!dn.includes("doce"), `Top banana must not be sweet/jam, got '${top.displayNamePtBr}'`);
        },
      },
      {
        id: "OVO",
        query: "ovo",
        validate(top) {
          const dn = top.displayNamePtBr.toLowerCase();
          assert(dn.includes("galinha"), `Top egg must be chicken egg, got '${top.displayNamePtBr}'`);
          assert(!dn.includes("codorna"), `Top egg must not be quail egg, got '${top.displayNamePtBr}'`);
        },
      },
    ];

    console.log("Executando validações dos 15 termos de busca obrigatórios:\n");
    for (const spec of testSpecs) {
      const res = await queryFoods(spec.query);
      assert(res.total > 0, `Query '${spec.query}' should return results`);
      assert(res.top, `Query '${spec.query}' missing top result`);
      spec.validate(res.top, res.items);
      console.log(`  ✓ [${spec.id}] '${spec.query}' -> Top: "${res.top.displayNamePtBr}" [${res.top.sourceKey}] (${res.total} rows)`);
    }

    console.log("\n=== TODAS AS 15 BUSCAS ESSENCIAIS PASSARAM COM SUCESSO (100%) ===");
  } finally {
    await pool.end();
  }
}

run().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
