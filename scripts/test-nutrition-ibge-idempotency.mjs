import assert from "node:assert/strict";
import fs from "node:fs";
import mysql from "mysql2/promise";
import { importSingleFoodAtomic, resolveDatabaseConfig, validateTargetGuards } from "./import-nutrition-v2-ibge.mjs";

console.log("=== TESTE: DETERMINISTIC IDEMPOTENCY & DUPLICATION GUARDS ===");

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

const dataset = JSON.parse(fs.readFileSync("data/nutrition/ibge-pof-2008-2009.json", "utf8"));
const measuresData = JSON.parse(fs.readFileSync("data/nutrition/ibge-household-measures.json", "utf8"));

async function main() {
  const conn = await pool.getConnection();
  try {
    // Select 5 representative foods
    const testCodes = ["6300101:99", "6300201:99", "7400101:1", "8100201:5", "6902901:99"];
    const testFoods = dataset.foods.filter(f => testCodes.includes(f.source_external_code));
    assert.equal(testFoods.length, 5, "Deveria encontrar os 5 alimentos de teste");

    console.log("Test 1: Coletando estado inicial das porções e nutrientes dos 5 alimentos...");
    const [initialFoods] = await conn.query(
      "SELECT id, source_uid, public_id FROM nutrition_v2_foods WHERE source_external_code IN (?, ?, ?, ?, ?)",
      testCodes
    );
    const initialFoodIds = initialFoods.map(f => f.id);

    const [initialPortions] = await conn.query(
      "SELECT id, public_id, food_id, label, equivalent_reference_amount FROM nutrition_v2_food_portions WHERE food_id IN (?) ORDER BY id ASC",
      [initialFoodIds]
    );
    const [initialNutrients] = await conn.query(
      "SELECT id, food_id, nutrient_code, amount_per_reference, status FROM nutrition_v2_food_nutrients WHERE food_id IN (?) ORDER BY id ASC",
      [initialFoodIds]
    );

    console.log(`  Estado inicial: ${initialFoods.length} alimentos, ${initialPortions.length} porções, ${initialNutrients.length} nutrientes`);

    // Run reimport
    console.log("\nTest 2: Executando reimportação dos mesmos alimentos para testar idempotência...");
    for (const food of testFoods) {
      const portions = measuresData.measures[food.source_external_code] || [];
      await importSingleFoodAtomic(conn, food, portions);
    }

    // Check counts after reimport
    console.log("Test 3: Verificando que nenhum registro foi duplicado após reimportação...");
    const [afterFoods] = await conn.query(
      "SELECT id, source_uid, public_id FROM nutrition_v2_foods WHERE source_external_code IN (?, ?, ?, ?, ?)",
      testCodes
    );
    const [afterPortions] = await conn.query(
      "SELECT id, public_id, food_id, label, equivalent_reference_amount FROM nutrition_v2_food_portions WHERE food_id IN (?) ORDER BY id ASC",
      [initialFoodIds]
    );
    const [afterNutrients] = await conn.query(
      "SELECT id, food_id, nutrient_code, amount_per_reference, status FROM nutrition_v2_food_nutrients WHERE food_id IN (?) ORDER BY id ASC",
      [initialFoodIds]
    );

    assert.equal(afterFoods.length, initialFoods.length, "Total de alimentos não pode mudar");
    assert.equal(afterPortions.length, initialPortions.length, "Total de porções não pode mudar (0 duplicações)");
    assert.equal(afterNutrients.length, initialNutrients.length, "Total de nutrientes não pode mudar (0 duplicações)");

    console.log(`  ✓ 0 alimentos duplicados (${afterFoods.length} == ${initialFoods.length})`);
    console.log(`  ✓ 0 porções duplicadas (${afterPortions.length} == ${initialPortions.length})`);
    console.log(`  ✓ 0 nutrientes duplicados (${afterNutrients.length} == ${initialNutrients.length})`);

    // Check deterministic public_id preservation
    console.log("\nTest 4: Verificando preservação determinística de public_id das porções...");
    const initialPortionUuids = new Set(initialPortions.map(p => p.public_id));
    for (const ap of afterPortions) {
      assert(initialPortionUuids.has(ap.public_id), `public_id da porção alterado: ${ap.public_id}`);
    }
    console.log("  ✓ Todos os public_ids das porções são 100% determinísticos e estáveis");

  } finally {
    conn.release();
    await pool.end();
  }

  console.log("\n=== TESTE DE IDEMPOTÊNCIA CONCLUÍDO COM 100% DE SUCESSO ===");
}

main().catch(err => {
  console.error("FALHA NO TESTE:", err);
  process.exit(1);
});
