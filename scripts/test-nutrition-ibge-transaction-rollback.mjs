import assert from "node:assert/strict";
import fs from "node:fs";
import mysql from "mysql2/promise";
import { importSingleFoodAtomic, resolveDatabaseConfig, validateTargetGuards } from "./import-nutrition-v2-ibge.mjs";

console.log("=== TESTE: TRANSACTION ROLLBACK & PARTIAL FAILURE RESILIENCE ===");

const fileEnv = {};
fs.readFileSync(".env.local", "utf8").split("\n").forEach(l => {
  const [k, v] = l.trim().split("=");
  if (k && v) fileEnv[k.trim()] = v.trim();
});

const dbConfig = resolveDatabaseConfig(process.env, fileEnv);
validateTargetGuards({ dbName: dbConfig.database, dbHost: dbConfig.host });

const pool = mysql.createPool({
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.database,
  user: dbConfig.user,
  password: dbConfig.password,
  waitForConnections: true,
  connectionLimit: 1
});

const mockFood = {
  food_code: "9999999",
  prep_code: "1",
  name: "Alimento Teste Rollback Atomico",
  display_name_pt_br: "Alimento Teste Rollback Atomico",
  category: "Teste",
  reference_amount: 100,
  reference_unit_code: "G",
  calories_kcal: 150,
  protein_g: 10,
  carbohydrate_g: 20,
  fat_g: 5,
  fiber_g: 2,
  source_key: "IBGE_POF_2008_2009",
  source_external_code: "9999999:1",
  source_uid: "IBGE_POF_2008_2009:9999999:1",
  source_version: "POF 2008-2009 (2011)",
  source_reference: "IBGE - Teste de Rollback",
  micronutrients: {
    calcium_mg: 50,
    iron_mg: 2.5,
    sodium_mg: 100
  }
};

const mockPortions = [
  { measure_code: "1", measure_name: "COLHER DE SOPA", label: "1 Colher de Sopa", grams: 15 },
  { measure_code: "2", measure_name: "XICARA", label: "1 Xícara", grams: 120 }
];

async function main() {
  const conn = await pool.getConnection();
  try {
    // Clean up any stale test record before start
    await conn.query("DELETE FROM nutrition_v2_foods WHERE source_uid = ?", [mockFood.source_uid]);

    // Stage 1: Simulate mid-transaction failure
    console.log("Test 1: Simulando falha durante inserção de nutrientes/porções...");
    let errorThrown = false;
    try {
      await importSingleFoodAtomic(conn, mockFood, mockPortions, { simulateErrorDuringTransaction: true });
    } catch (err) {
      if (err.message === "SIMULATED_TEST_ERROR_FOR_ROLLBACK") {
        errorThrown = true;
      } else {
        throw err;
      }
    }
    assert(errorThrown, "Deveria ter lançado erro simulado durante transação");

    // Stage 2: Verify zero residue in DB (complete rollback)
    console.log("Test 2: Verificando que rollback não deixou nenhum registro residual no banco...");
    const [foodCheck] = await conn.query(
      "SELECT id FROM nutrition_v2_foods WHERE source_uid = ?",
      [mockFood.source_uid]
    );
    assert.equal(foodCheck.length, 0, "Alimento não deve existir após rollback");

    const [orphanCheck] = await conn.query(
      "SELECT COUNT(*) as c FROM nutrition_v2_food_portions WHERE label LIKE '%Rollback Atomico%'"
    );
    assert.equal(orphanCheck[0].c, 0, "Nenhuma porção deve existir após rollback");

    console.log("  ✓ Rollback atômico comprovado: 0 alimentos e 0 registros órfãos residuais");

    // Stage 3: Rerun without failure
    console.log("Test 3: Reexecutando importação sem falha após rollback...");
    const result = await importSingleFoodAtomic(conn, mockFood, mockPortions, { simulateErrorDuringTransaction: false });
    assert(result.foodId > 0, "Food ID válido retornado");
    assert.equal(result.nutrientCount, 3, "3 nutrientes inseridos");
    assert.equal(result.portionCount, 2, "2 porções inseridas");

    const [afterCheck] = await conn.query(
      "SELECT id FROM nutrition_v2_foods WHERE source_uid = ?",
      [mockFood.source_uid]
    );
    assert.equal(afterCheck.length, 1, "Alimento deve existir após importação bem-sucedida");

    console.log("  ✓ Reexecução limpa e completa após falha anterior");

    // Cleanup test record
    await conn.query("DELETE FROM nutrition_v2_foods WHERE source_uid = ?", [mockFood.source_uid]);
    console.log("  ✓ Registro de teste limpo com sucesso");

  } finally {
    conn.release();
    await pool.end();
  }

  console.log("\n=== TESTE DE TRANSACTION ROLLBACK CONCLUÍDO COM 100% DE SUCESSO ===");
}

main().catch(err => {
  console.error("FALHA NO TESTE:", err);
  process.exit(1);
});
