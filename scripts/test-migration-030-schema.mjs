/**
 * TREVO ONE — PHASE 20 REGRESSION TEST
 * Validates Migration 030 micronutrient schema objects, canonical catalog entries,
 * and runtime graceful degradation when micronutrient table is absent.
 */

import { register } from "node:module";
register("./ts-loader.mjs", import.meta.url);

import assert from "node:assert/strict";
import fs from "node:fs";
import mysql from "mysql2/promise";

const { CANONICAL_NUTRIENTS } = await import("../lib/nutrition-v2/micronutrients.ts");
const { captureMicronutrientsSnapshotForFood } = await import("../lib/nutrition-v2/plan-repository.ts");

console.log("=== PHASE 20: REGRESSION TEST FOR MIGRATION 030 MICRONUTRIENT SCHEMA ===");

const fileEnv = {};
if (fs.existsSync(".env.local")) {
  fs.readFileSync(".env.local", "utf8").split("\n").forEach((l) => {
    const parts = l.trim().split("=");
    const k = parts[0];
    const v = parts.slice(1).join("=");
    if (k && v) fileEnv[k.trim()] = v.trim();
  });
}

function resolveDatabaseConfig(procEnv = process.env, fEnv = {}) {
  const host = procEnv.DB_HOST || fEnv.DB_HOST;
  const portStr = procEnv.DB_PORT || fEnv.DB_PORT;
  const database = procEnv.DB_NAME || fEnv.DB_NAME;
  const user = procEnv.DB_USER || fEnv.DB_USER;
  const password = procEnv.DB_PASSWORD !== undefined ? procEnv.DB_PASSWORD : fEnv.DB_PASSWORD;
  return { host, port: Number(portStr || 3306), database, user, password };
}

const dbConfig = resolveDatabaseConfig(process.env, fileEnv);

const pool = mysql.createPool({
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.database,
  user: dbConfig.user,
  password: dbConfig.password,
  waitForConnections: true,
  connectionLimit: 1,
});

async function main() {
  const conn = await pool.getConnection();
  try {
    const [dbRows] = await conn.query("SELECT DATABASE() as db");
    const activeDb = dbRows[0].db;
    console.log(`Connected to database: ${activeDb}`);

    // 1. Check nutrition_nutrients_catalog table exists
    console.log("\nTest 1: Validating nutrition_nutrients_catalog table exists...");
    const [catTable] = await conn.query("SHOW TABLES LIKE 'nutrition_nutrients_catalog'");
    assert.equal(catTable.length, 1, "Tabela 'nutrition_nutrients_catalog' deve existir no banco");
    console.log("  ✓ nutrition_nutrients_catalog exists");

    // 2. Check nutrition_v2_food_nutrients table exists
    console.log("\nTest 2: Validating nutrition_v2_food_nutrients table exists...");
    const [fnTable] = await conn.query("SHOW TABLES LIKE 'nutrition_v2_food_nutrients'");
    assert.equal(fnTable.length, 1, "Tabela 'nutrition_v2_food_nutrients' deve existir no banco");
    console.log("  ✓ nutrition_v2_food_nutrients exists");

    // 3. Check micronutrients_snapshot_json on nutrition_v2_meal_items
    console.log("\nTest 3: Validating micronutrients_snapshot_json on nutrition_v2_meal_items...");
    const [miCol] = await conn.query(
      "SHOW COLUMNS FROM nutrition_v2_meal_items LIKE 'micronutrients_snapshot_json'"
    );
    assert.equal(miCol.length, 1, "Coluna 'micronutrients_snapshot_json' deve existir em nutrition_v2_meal_items");
    console.log("  ✓ micronutrients_snapshot_json on nutrition_v2_meal_items exists");

    // 4. Check micronutrients_snapshot_json on nutrition_v2_item_substitutions
    console.log("\nTest 4: Validating micronutrients_snapshot_json on nutrition_v2_item_substitutions...");
    const [subCol] = await conn.query(
      "SHOW COLUMNS FROM nutrition_v2_item_substitutions LIKE 'micronutrients_snapshot_json'"
    );
    assert.equal(subCol.length, 1, "Coluna 'micronutrients_snapshot_json' deve existir em nutrition_v2_item_substitutions");
    console.log("  ✓ micronutrients_snapshot_json on nutrition_v2_item_substitutions exists");

    // 5. Check catalog contains 23 canonical nutrients
    console.log("\nTest 5: Validating 23 canonical nutrients in catalog...");
    const [catalogRows] = await conn.query(
      "SELECT code, canonical_unit_code, category, sort_order, is_active FROM nutrition_nutrients_catalog ORDER BY sort_order ASC"
    );
    assert.equal(catalogRows.length, 23, "Catálogo deve conter exatamente 23 nutrientes canônicos");

    const dbCodes = new Set(catalogRows.map((r) => r.code));
    for (const defn of CANONICAL_NUTRIENTS) {
      assert.ok(dbCodes.has(defn.code), `Nutriente canônico ausente no catálogo: ${defn.code}`);
      const row = catalogRows.find((r) => r.code === defn.code);
      assert.equal(row.canonical_unit_code, defn.unit, `Unidade incorreta para ${defn.code}`);
      assert.equal(row.category, defn.category, `Categoria incorreta para ${defn.code}`);
      assert.equal(Number(row.is_active), 1, `Nutriente deve estar ativo: ${defn.code}`);
    }
    console.log("  ✓ All 23 canonical nutrients present and valid in catalog");

    // 6. Test runtime graceful degradation when table is missing
    console.log("\nTest 6: Validating runtime graceful degradation when nutrition_v2_food_nutrients throws ER_NO_SUCH_TABLE...");
    const mockConnMissingTable = {
      async query(sql, params) {
        if (typeof sql === "string" && sql.includes("nutrition_v2_food_nutrients")) {
          const err = new Error("Table 'u406031981_trevoone.nutrition_v2_food_nutrients' doesn't exist");
          err.code = "ER_NO_SUCH_TABLE";
          err.errno = 1146;
          throw err;
        }
        return conn.query(sql, params);
      },
    };

    const mockFoodRow = {
      id: 1,
      public_id: "test-food-public-id",
      scope: "GLOBAL",
      source_type: "TACO",
      source_uid: "1",
      source_key: "TACO",
      source_version: "4.0",
      data_quality: "OFFICIAL_ANALYZED",
    };

    const degradedEnvelope = await captureMicronutrientsSnapshotForFood(
      mockConnMissingTable,
      1,
      mockFoodRow,
      1.0
    );

    assert.ok(degradedEnvelope, "Envelope deve ser retornado mesmo em degradação graciosa");
    assert.equal(degradedEnvelope.schemaVersion, 1);
    assert.equal(degradedEnvelope.catalogVersion, "1.0");
    assert.equal(degradedEnvelope.nutrients.length, 23, "Envelope degradado deve conter 23 nutrientes");

    for (const n of degradedEnvelope.nutrients) {
      assert.equal(n.status, "UNKNOWN", `Nutriente ${n.code} em fallback deve ter status UNKNOWN`);
      assert.equal(n.value, null, `Nutriente ${n.code} em fallback deve ter valor null (NUNCA ZERO)`);
    }
    console.log("  ✓ Graceful degradation safely returns 23 UNKNOWN/null nutrients without error");

    // 7. Verify non-ER_NO_SUCH_TABLE errors are NOT swallowed
    console.log("\nTest 7: Validating arbitrary DB errors are NOT swallowed...");
    const mockConnArbitraryError = {
      async query(sql, params) {
        if (typeof sql === "string" && sql.includes("nutrition_v2_food_nutrients")) {
          const err = new Error("Access denied for user");
          err.code = "ER_ACCESS_DENIED_ERROR";
          err.errno = 1045;
          throw err;
        }
        return conn.query(sql, params);
      },
    };

    let caughtArbitrary = false;
    try {
      await captureMicronutrientsSnapshotForFood(mockConnArbitraryError, 1, mockFoodRow, 1.0);
    } catch (err) {
      caughtArbitrary = true;
      assert.equal(err.code, "ER_ACCESS_DENIED_ERROR");
    }
    assert.ok(caughtArbitrary, "Erros arbitrários de DB não devem ser silenciados");
    console.log("  ✓ Arbitrary database errors rethrown correctly");

    console.log("\n=== ALL PHASE 20 REGRESSION TESTS PASSED (100%) ===");
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR IN TEST:", err);
  process.exit(1);
});