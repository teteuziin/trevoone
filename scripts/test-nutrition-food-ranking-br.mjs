/**
 * Test: Brazilian Food Library Professional Search Ranking & Preparation Semantics (B2A.3)
 *
 * Validates real DEV catalog searches against food/category-aware ranking:
 * 1. pão francês: top = Pão francês
 * 2. cacetinho: top = Pão francês
 * 3. pão de sal: top = Pão francês
 * 4. aipim: top = Mandioca cozida
 * 5. macaxeira: top = Mandioca cozida
 * 6. mandioca: top = Mandioca cozida (plain cooked before recipes/fried)
 * 7. arroz: cooked everyday staple rice before raw/source-lab variants
 * 8. arroz cru: raw rice prioritized when "cru" explicitly queried
 * 9. arroz cozido: cooked rice prioritized when "cozido" explicitly queried
 * 10. arroz branco: clean staple white rice
 * 11. feijão: cooked everyday staple bean (carioca) before raw or jalo
 * 12. feijão cru: raw bean prioritized when "cru" explicitly queried
 * 13. feijão cozido: cooked bean prioritized when "cozido" explicitly queried
 * 14. feijão carioca: top = Feijão carioca cozido
 * 15. feijão jalo: top = Feijão jalo cozido (explicit cultivar overrides generic)
 * 16. mandioca cozida: top = Mandioca cozida
 * 17. mandioca frita: top = Mandioca frita
 * 18. ovo: common prepared chicken egg (Ovo de galinha inteiro cozido) before raw egg
 * 19. ovo cru: raw chicken egg (Ovo de galinha inteiro cru) before quail egg
 * 20. ovo cozido: cooked chicken egg (Ovo de galinha inteiro cozido)
 * 21. frango: recognizable cooked/prepared common chicken food (not raw, not offal)
 * 22. frango cru: raw chicken food (contains "cru") before offal
 * 23. frango grelhado: Peito de frango sem pele grelhado
 * 24. peito de frango: recognizable preparation (grelhado/cozido)
 * 25. batata doce: common preparation before recipes/fried
 * 26. banana: normal fresh fruit form before processed recipes/sweets
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
  console.log("=== TESTE: BRAZILIAN FOOD SEARCH RANKING & PREPARATION SEMANTICS (B2A.3) ===\n");

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
        id: "MANDIOCA_COZIDA",
        query: "mandioca cozida",
        validate(top) {
          assert.equal(top.displayNamePtBr, "Mandioca cozida", `Expected 'Mandioca cozida', got '${top.displayNamePtBr}'`);
        },
      },
      {
        id: "MANDIOCA_FRITA",
        query: "mandioca frita",
        validate(top) {
          assert.equal(top.displayNamePtBr, "Mandioca frita", `Expected 'Mandioca frita', got '${top.displayNamePtBr}'`);
        },
      },
      {
        id: "ARROZ_GENERIC",
        query: "arroz",
        validate(top) {
          const dn = top.displayNamePtBr.toLowerCase();
          assert(dn.includes("cozido") || dn === "arroz branco", `Top rice must be everyday staple, got '${top.displayNamePtBr}'`);
          assert(!dn.includes("cru"), `Top generic rice must not be raw, got '${top.displayNamePtBr}'`);
        },
      },
      {
        id: "ARROZ_CRU",
        query: "arroz cru",
        validate(top) {
          const dn = top.displayNamePtBr.toLowerCase();
          assert(dn.includes("cru"), `Explicit 'arroz cru' must return raw rice, got '${top.displayNamePtBr}'`);
          assert(!dn.includes("cozido"), `Raw rice must not be cooked, got '${top.displayNamePtBr}'`);
        },
      },
      {
        id: "ARROZ_COZIDO",
        query: "arroz cozido",
        validate(top) {
          const dn = top.displayNamePtBr.toLowerCase();
          assert(dn.includes("cozido"), `Explicit 'arroz cozido' must return cooked rice, got '${top.displayNamePtBr}'`);
          assert(!dn.includes("cru"), `Cooked rice must not be raw, got '${top.displayNamePtBr}'`);
        },
      },
      {
        id: "ARROZ_BRANCO",
        query: "arroz branco",
        validate(top) {
          const dn = top.displayNamePtBr.toLowerCase();
          assert(dn.includes("cozido") || dn === "arroz branco", `Top white rice must be clean staple, got '${top.displayNamePtBr}'`);
          assert(!dn.includes("integral"), `White rice should not be brown rice, got '${top.displayNamePtBr}'`);
        },
      },
      {
        id: "FEIJAO_GENERIC",
        query: "feijão",
        validate(top) {
          const dn = top.displayNamePtBr.toLowerCase();
          assert(dn === "feijão" || dn === "feijão carioca cozido" || (dn.includes("cozido") && !dn.includes("jalo")), `Top generic bean must be staple generic bean or carioca, got '${top.displayNamePtBr}'`);
          assert(!dn.includes("cru"), `Generic bean must not be raw, got '${top.displayNamePtBr}'`);
          assert(!dn.includes("jalo"), `Generic bean must prefer national staple carioca before specialty jalo, got '${top.displayNamePtBr}'`);
        },
      },
      {
        id: "FEIJAO_CRU",
        query: "feijão cru",
        validate(top) {
          const dn = top.displayNamePtBr.toLowerCase();
          assert(dn.includes("cru"), `Explicit 'feijão cru' must return raw bean, got '${top.displayNamePtBr}'`);
          assert(!dn.includes("cozido"), `Raw bean must not be cooked, got '${top.displayNamePtBr}'`);
        },
      },
      {
        id: "FEIJAO_COZIDO",
        query: "feijão cozido",
        validate(top) {
          const dn = top.displayNamePtBr.toLowerCase();
          assert(dn.includes("cozido"), `Explicit 'feijão cozido' must return cooked bean, got '${top.displayNamePtBr}'`);
          assert(!dn.includes("cru"), `Cooked bean must not be raw, got '${top.displayNamePtBr}'`);
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
        id: "FEIJAO_JALO",
        query: "feijão jalo",
        validate(top) {
          assert.equal(top.displayNamePtBr, "Feijão jalo cozido", `Explicit 'feijão jalo' must return 'Feijão jalo cozido', got '${top.displayNamePtBr}'`);
        },
      },
      {
        id: "OVO_GENERIC",
        query: "ovo",
        validate(top) {
          assert.equal(top.displayNamePtBr, "Ovo de galinha inteiro cozido", `Generic 'ovo' must prefer common prepared chicken egg, got '${top.displayNamePtBr}'`);
        },
      },
      {
        id: "OVO_CRU",
        query: "ovo cru",
        validate(top) {
          assert.equal(top.displayNamePtBr, "Ovo de galinha inteiro cru", `Explicit 'ovo cru' must prioritize raw chicken egg before quail egg, got '${top.displayNamePtBr}'`);
        },
      },
      {
        id: "OVO_COZIDO",
        query: "ovo cozido",
        validate(top) {
          assert.equal(top.displayNamePtBr, "Ovo de galinha inteiro cozido", `Explicit 'ovo cozido' must return cooked chicken egg, got '${top.displayNamePtBr}'`);
        },
      },
      {
        id: "FRANGO_GENERIC",
        query: "frango",
        validate(top) {
          const dn = top.displayNamePtBr.toLowerCase();
          assert(
            dn.includes("cozido") || dn.includes("cozida") || dn.includes("assado") || dn.includes("assada") || dn.includes("grelhado") || dn.includes("grelhada"),
            `Top chicken must be cooked/assado/grelhado, got '${top.displayNamePtBr}'`
          );
          assert(!dn.includes("cru"), `Top generic chicken must not be raw, got '${top.displayNamePtBr}'`);
          assert(!dn.includes("coração") && !dn.includes("coracao") && !dn.includes("fígado") && !dn.includes("figado") && !dn.includes("moela"),
            `Top chicken must be main cut before offal/viscera, got '${top.displayNamePtBr}'`);
        },
      },
      {
        id: "FRANGO_CRU",
        query: "frango cru",
        validate(top) {
          const dn = top.displayNamePtBr.toLowerCase();
          assert(dn.includes("cru"), `Explicit 'frango cru' must return raw chicken, got '${top.displayNamePtBr}'`);
          assert(!dn.includes("coração") && !dn.includes("coracao") && !dn.includes("fígado") && !dn.includes("figado") && !dn.includes("moela"),
            `Raw chicken must be main meat cut before offal/viscera, got '${top.displayNamePtBr}'`);
        },
      },
      {
        id: "FRANGO_GRELHADO",
        query: "frango grelhado",
        validate(top) {
          assert.equal(top.displayNamePtBr, "Peito de frango sem pele grelhado", `Explicit 'frango grelhado' must return 'Peito de frango sem pele grelhado', got '${top.displayNamePtBr}'`);
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
    ];

    console.log(`Executando validações dos ${testSpecs.length} termos de busca e preparo obrigatórios:\n`);
    for (const spec of testSpecs) {
      const res = await queryFoods(spec.query);
      assert(res.total > 0, `Query '${spec.query}' should return results`);
      assert(res.top, `Query '${spec.query}' missing top result`);
      spec.validate(res.top, res.items);
      console.log(`  ✓ [${spec.id}] '${spec.query}' -> Top: "${res.top.displayNamePtBr}" [${res.top.sourceKey}] (${res.total} rows)`);
    }

    console.log(`\n=== TODAS AS ${testSpecs.length} BUSCAS ESSENCIAIS PASSARAM COM SUCESSO (100%) ===`);
  } finally {
    await pool.end();
  }
}

run().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
