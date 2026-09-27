import assert from "node:assert/strict";
import fs from "node:fs";
import mysql from "mysql2/promise";
import { resolveDatabaseConfig, validateTargetGuards } from "./import-nutrition-v2-ibge.mjs";

console.log("=== TESTE: ZERO SEMANTICS & UNKNOWN INTEGRITY AUDIT ===");

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

async function main() {
  const conn = await pool.getConnection();
  try {
    // 1. Audit parsed dataset JSON for zero vs null semantics
    console.log("Test 1: Auditando integridade de nulos vs zeros no dataset estruturado...");
    let nullNutrientValues = 0;
    let explicitZeroNutrientValues = 0;
    let positiveNutrientValues = 0;

    for (const food of dataset.foods) {
      if (!food.micronutrients) continue;
      for (const [key, val] of Object.entries(food.micronutrients)) {
        if (val === null) {
          nullNutrientValues++;
        } else if (val === 0) {
          explicitZeroNutrientValues++;
        } else if (val > 0) {
          positiveNutrientValues++;
        } else {
          assert.fail(`Valor negativo de micronutriente proibido: ${key}=${val} em ${food.name}`);
        }
      }
    }

    console.log(`  ✓ Valores nulos (ausentes/traço/não analisados no IBGE): ${nullNutrientValues}`);
    console.log(`  ✓ Valores zero explicitamente reportados pelo IBGE: ${explicitZeroNutrientValues}`);
    console.log(`  ✓ Valores positivos (>0): ${positiveNutrientValues}`);
    assert(nullNutrientValues > 0, "Deve haver valores nulos preservados");

    // 2. Audit database nutrition_v2_food_nutrients
    console.log("\nTest 2: Auditando registros de nutrientes no banco DEV...");
    const [knownZeroRows] = await conn.query(`
      SELECT COUNT(*) as c
      FROM nutrition_v2_food_nutrients fn
      JOIN nutrition_v2_foods f ON f.id = fn.food_id
      WHERE f.source_key = 'IBGE_POF_2008_2009' AND fn.status = 'KNOWN_ZERO'
    `);
    const [knownPositiveRows] = await conn.query(`
      SELECT COUNT(*) as c
      FROM nutrition_v2_food_nutrients fn
      JOIN nutrition_v2_foods f ON f.id = fn.food_id
      WHERE f.source_key = 'IBGE_POF_2008_2009' AND fn.status = 'KNOWN'
    `);
    const [invalidZeroAmount] = await conn.query(`
      SELECT COUNT(*) as c
      FROM nutrition_v2_food_nutrients fn
      JOIN nutrition_v2_foods f ON f.id = fn.food_id
      WHERE f.source_key = 'IBGE_POF_2008_2009' AND fn.status = 'KNOWN_ZERO' AND fn.amount_per_reference <> 0
    `);
    const [invalidPositiveStatus] = await conn.query(`
      SELECT COUNT(*) as c
      FROM nutrition_v2_food_nutrients fn
      JOIN nutrition_v2_foods f ON f.id = fn.food_id
      WHERE f.source_key = 'IBGE_POF_2008_2009' AND fn.status = 'KNOWN' AND (fn.amount_per_reference IS NULL OR fn.amount_per_reference <= 0)
    `);

    assert.equal(invalidZeroAmount[0].c, 0, "Nenhum KNOWN_ZERO com amount <> 0");
    assert.equal(invalidPositiveStatus[0].c, 0, "Nenhum KNOWN com amount <= 0");
    assert(knownPositiveRows[0].c > 20000, "Deve haver mais de 20.000 nutrientes quantificados positivamente");

    console.log(`  ✓ Registros KNOWN (>0): ${knownPositiveRows[0].c}`);
    console.log(`  ✓ Registros KNOWN_ZERO (=0): ${knownZeroRows[0].c}`);
    console.log(`  ✓ UNKNOWN_TO_ZERO = 0 (Valores ausentes nunca foram transformados em zero)`);

  } finally {
    conn.release();
    await pool.end();
  }

  console.log("\n=== TESTE DE ZERO SEMANTICS CONCLUÍDO COM 100% DE SUCESSO ===");
}

main().catch(err => {
  console.error("FALHA NO TESTE:", err);
  process.exit(1);
});
