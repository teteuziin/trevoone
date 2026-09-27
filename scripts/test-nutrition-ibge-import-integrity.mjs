import assert from "node:assert/strict";
import fs from "node:fs";
import mysql from "mysql2/promise";

console.log("=== INICIANDO TESTE: IBGE IMPORT INTEGRITY & RELATIONAL SAFETY ===");

const env = {};
fs.readFileSync(".env.local", "utf8").split("\n").forEach(l => {
  const [k, v] = l.trim().split("=");
  if (k && v) env[k.trim()] = v.trim();
});

assert.equal(env.DB_NAME, "u406031981_trevoone_dev", "ABSOLUTE GUARD: Deve estar conectado no banco DEV");

const pool = mysql.createPool({
  host: env.DB_HOST,
  port: Number(env.DB_PORT) || 3306,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 1
});

try {
  // 1. Food count and identity integrity
  console.log("Test 1: Validando registros de alimentos IBGE em nutrition_v2_foods...");
  const [foods] = await pool.query(`
    SELECT id, public_id, name, display_name_pt_br, reference_amount, reference_unit_code, status, data_quality
    FROM nutrition_v2_foods
    WHERE source_key = 'IBGE_POF_2008_2009'
  `);
  assert.equal(foods.length, 1820, "Deve haver exatamente 1820 alimentos IBGE");
  for (const f of foods) {
    assert(f.public_id, "public_id obrigatório");
    assert(f.name, "name obrigatório");
    assert(f.display_name_pt_br, "display_name_pt_br obrigatório");
    assert.equal(Number(f.reference_amount), 100);
    assert.equal(f.reference_unit_code, "G");
    assert.equal(f.status, "ACTIVE");
    assert.equal(f.data_quality, "SURVEY_RECIPE");
  }
  console.log(`  ✓ 1820 alimentos IBGE com integridade cadastral e metadados completos`);

  // 2. Orphan portions check
  console.log("Test 2: Validando ausência de porções órfãs...");
  const [orphanPort] = await pool.query(`
    SELECT COUNT(*) as count
    FROM nutrition_v2_food_portions fp
    LEFT JOIN nutrition_v2_foods f ON f.id = fp.food_id
    WHERE f.id IS NULL
  `);
  assert.equal(orphanPort[0].count, 0, "NÃO deve haver nenhuma porção órfã");
  console.log("  ✓ ORPHAN_PORTIONS = 0 confirmado");

  // 3. Orphan nutrients check
  console.log("Test 3: Validando ausência de nutrientes órfãos...");
  const [orphanNutr] = await pool.query(`
    SELECT COUNT(*) as count
    FROM nutrition_v2_food_nutrients fn
    LEFT JOIN nutrition_v2_foods f ON f.id = fn.food_id
    WHERE f.id IS NULL
  `);
  assert.equal(orphanNutr[0].count, 0, "NÃO deve haver nenhum nutriente órfão");
  console.log("  ✓ ORPHAN_NUTRIENTS = 0 confirmado");

  // 4. Quantidades totais inseridas
  console.log("Test 4: Validando quantidades totais inseridas e consistência relacional...");
  const [portCount] = await pool.query(`
    SELECT COUNT(*) as count
    FROM nutrition_v2_food_portions fp
    JOIN nutrition_v2_foods f ON f.id = fp.food_id
    WHERE f.source_key = 'IBGE_POF_2008_2009'
  `);
  const [nutrCount] = await pool.query(`
    SELECT COUNT(*) as count
    FROM nutrition_v2_food_nutrients fn
    JOIN nutrition_v2_foods f ON f.id = fn.food_id
    WHERE f.source_key = 'IBGE_POF_2008_2009'
  `);
  assert.equal(portCount[0].count, 7069, "Deve haver exatamente 7069 porções IBGE");
  assert.equal(nutrCount[0].count, 26942, "Deve haver exatamente 26942 nutrientes IBGE");
  console.log(`  ✓ 7069 porções e 26942 nutrientes validados no banco relacional DEV`);

  // 5. Foods with zero portions
  const [foodsNoPortions] = await pool.query(`
    SELECT COUNT(*) as count
    FROM nutrition_v2_foods f
    LEFT JOIN nutrition_v2_food_portions fp ON fp.food_id = f.id
    WHERE f.source_key = 'IBGE_POF_2008_2009' AND fp.id IS NULL
  `);
  assert(foodsNoPortions[0].count <= 10, "Apenas uma minoria ínfima (< 10) de alimentos sem porção declarada na pesquisa");
  console.log(`  ✓ Alimentos IBGE sem porção declarada na pesquisa oficial: ${foodsNoPortions[0].count} (99.8% de cobertura)`);

} finally {
  await pool.end();
}

console.log("\n=== TESTE IBGE IMPORT INTEGRITY CONCLUÍDO COM 100% DE SUCESSO ===");
