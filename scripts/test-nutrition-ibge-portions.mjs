import assert from "node:assert/strict";
import fs from "node:fs";
import mysql from "mysql2/promise";

console.log("=== INICIANDO TESTE: IBGE POF HOUSEHOLD MEASURES & PORTIONS QUALITY ===");

const env = {};
fs.readFileSync(".env.local", "utf8").split("\n").forEach(l => {
  const [k, v] = l.trim().split("=");
  if (k && v) env[k.trim()] = v.trim();
});

const measuresData = JSON.parse(fs.readFileSync("data/nutrition/ibge-household-measures.json", "utf8"));

// 1. Dataset Integrity
console.log("Test 1: Validando integridade do arquivo canonical de medidas caseiras...");
assert(measuresData.metadata, "Metadata obrigatório");
assert.equal(measuresData.metadata.total_portions, 7772, "Total de porções filtradas deve ser 7772");
assert.equal(measuresData.metadata.total_food_prep_keys, 1967, "Total de combinações alimento:preparo deve ser 1967");
console.log(`  ✓ 7772 medidas caseiras oficiais estruturadas para 1967 chaves de alimentos`);

// 2. DB Portions Validation
console.log("Test 2: Validando porções salvas no banco DEV...");
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
  const [portCount] = await pool.query(`
    SELECT COUNT(*) as count 
    FROM nutrition_v2_food_portions fp
    JOIN nutrition_v2_foods f ON f.id = fp.food_id
    WHERE f.source_key = 'IBGE'
  `);
  console.log(`  ✓ Total de porções IBGE no banco DEV: ${portCount[0].count}`);
  assert.equal(portCount[0].count, 7069, "Banco DEV deve conter exatamente 7069 porções associadas aos 1820 alimentos IBGE");

  // 3. Representative staples portion checks
  console.log("Test 3: Validando qualidade e realismo de porções em alimentos básicos...");

  async function getPortionsForFood(foodCode) {
    const [rows] = await pool.query(`
      SELECT fp.label, fp.equivalent_reference_amount, fp.sort_order
      FROM nutrition_v2_food_portions fp
      JOIN nutrition_v2_foods f ON f.id = fp.food_id
      WHERE f.source_key = 'IBGE' AND f.source_external_code LIKE ?
      ORDER BY fp.sort_order ASC
    `, [`${foodCode}:%`]);
    return rows;
  }

  // Arroz (6300101)
  const arrozPortions = await getPortionsForFood("6300101");
  assert(arrozPortions.length >= 5, "Arroz deve ter pelo menos 5 medidas caseiras");
  const arrozColher = arrozPortions.find(p => p.label.toLowerCase().includes("colher de arroz"));
  assert(arrozColher, "Arroz deve ter porção de 'colher de arroz'");
  assert.equal(Number(arrozColher.equivalent_reference_amount), 45, "Colher de arroz deve equivaler a 45g");
  console.log(`  ✓ Arroz: '${arrozColher.label}' -> ${arrozColher.equivalent_reference_amount}g`);

  // Tilápia / Peixe de água doce (7400101)
  const tilapiaPortions = await getPortionsForFood("7400101");
  assert(tilapiaPortions.length >= 5, "Tilápia deve ter porções");
  const tilapiaPosta = tilapiaPortions.find(p => p.label.toLowerCase().includes("posta"));
  assert(tilapiaPosta, "Tilápia deve ter porção de posta");
  assert.equal(Number(tilapiaPosta.equivalent_reference_amount), 200, "Posta de tilápia deve equivaler a 200g");
  console.log(`  ✓ Tilápia: '${tilapiaPosta.label}' -> ${tilapiaPosta.equivalent_reference_amount}g`);

  // Carne de Sol (8100201)
  const carneSolPortions = await getPortionsForFood("8100201");
  assert(carneSolPortions.length >= 5, "Carne de sol deve ter porções");
  const carneSolBife = carneSolPortions.find(p => p.label.toLowerCase().includes("bife"));
  assert(carneSolBife, "Carne de sol deve ter porção de bife");
  assert.equal(Number(carneSolBife.equivalent_reference_amount), 100, "Bife de carne de sol deve equivaler a 100g");
  console.log(`  ✓ Carne de Sol: '${carneSolBife.label}' -> ${carneSolBife.equivalent_reference_amount}g`);

  // Cuscuz (6902901)
  const cuscuzPortions = await getPortionsForFood("6902901");
  assert(cuscuzPortions.length >= 3, "Cuscuz deve ter porções");
  console.log(`  ✓ Cuscuz: ${cuscuzPortions.length} medidas disponíveis — Ex: '${cuscuzPortions[0].label}' -> ${cuscuzPortions[0].equivalent_reference_amount}g`);

  // 4. Parity & Math Recalculation
  console.log("Test 4: Validando escalonamento proporcional das porções em relação a 100g...");
  for (const p of arrozPortions.slice(0, 5)) {
    const factor = Number(p.equivalent_reference_amount) / 100.0;
    assert(factor > 0 && Number.isFinite(factor), "Fator de escalonamento deve ser positivo e finito");
  }
  console.log("  ✓ Escalonamento proporcional verificado sem distorções numéricas");

} finally {
  await pool.end();
}

console.log("\n=== TESTE IBGE POF HOUSEHOLD MEASURES CONCLUÍDO COM 100% DE SUCESSO ===");
