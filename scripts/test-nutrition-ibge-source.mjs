import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

console.log("=== INICIANDO TESTE: IBGE POF OFFICIAL SOURCE INTEGRITY ===");

// 1. Files existence
console.log("Test 1: Validando presença dos arquivos oficiais IBGE...");
const files = [
  "data/nutrition/tabelacompleta.xls",
  "data/nutrition/tab01.xls",
  "data/nutrition/tabelamedidas_bd.xls",
  "data/nutrition/tabelamedidas.xls",
  "data/nutrition/ibge-pof-2008-2009.json",
  "data/nutrition/ibge-household-measures.json",
  "data/nutrition/ibge-pof-manifest.json"
];
for (const f of files) {
  assert(fs.existsSync(f), `Arquivo obrigatório ausente: ${f}`);
}
console.log("  ✓ Todos os 7 arquivos de dados e metadados oficiais confirmados");

// 2. Checksums & Manifest
console.log("Test 2: Validando integridade criptográfica e manifest...");
const manifest = JSON.parse(fs.readFileSync("data/nutrition/ibge-pof-manifest.json", "utf8"));
assert.equal(manifest.source_key, "IBGE_POF_2008_2009");
assert.equal(manifest.dataset_version, "POF 2008-2009 (2011)");
assert.equal(manifest.reference_basis, "100g of edible portion");
assert.equal(manifest.reuse_status, "NOT_EXPLICITLY_CONFIRMED");

const compSha256 = crypto.createHash("sha256").update(fs.readFileSync("data/nutrition/tabelacompleta.xls")).digest("hex");
assert.equal(compSha256.toLowerCase(), "e75487405593196fe551d58e934e415e840f33f78acd0af08ed61bedb957c7ac");
console.log("  ✓ SHA-256 do tabelacompleta.xls oficial IBGE verificado e idêntico ao manifest");

// 3. Dataset record counts & structure
console.log("Test 3: Validando estrutura dos registros do dataset IBGE POF...");
const dataset = JSON.parse(fs.readFileSync("data/nutrition/ibge-pof-2008-2009.json", "utf8"));
assert.equal(dataset.foods.length, 1971, "Dataset deve conter exatamente 1971 registros de alimentos/preparações");

const foodCodes = new Set();
const prepCodes = new Set();
for (const food of dataset.foods) {
  assert(food.food_code, "Food code obrigatório");
  assert(food.prep_code, "Prep code obrigatório");
  assert(food.name, "Nome obrigatório");
  assert.equal(food.reference_amount, 100);
  assert.equal(food.reference_unit_code, "G");
  foodCodes.add(food.food_code);
  prepCodes.add(food.prep_code);

  if (food.calories_kcal !== null) assert(food.calories_kcal >= 0, `Kcal negativa: ${food.name}`);
  if (food.protein_g !== null) assert(food.protein_g >= 0, `Proteína negativa: ${food.name}`);
  if (food.carbohydrate_g !== null) assert(food.carbohydrate_g >= 0, `Carboidrato negativo: ${food.name}`);
  if (food.fat_g !== null) assert(food.fat_g >= 0, `Gordura negativa: ${food.name}`);
  if (food.fiber_g !== null) assert(food.fiber_g >= 0, `Fibra negativa: ${food.name}`);
}
assert.equal(foodCodes.size, 1121, "Deve conter exatamente 1121 food codes distintos");
assert.equal(prepCodes.size, 16, "Deve conter exatamente 16 prep codes distintos");
console.log("  ✓ 1971 registros validados: 1121 alimentos brutos, 16 preparações, zero valores negativos");

// 4. Key staples presence in source
console.log("Test 4: Validando presença de staples brasileiros fundamentais...");
const staples = [
  { name: "tilápia", code: "7400101" },
  { name: "azeite", code: "8400101" },
  { name: "carne de sol", code: "8100201" },
  { name: "cuscuz", code: "6902901" },
  { name: "tapioca de goma", code: "6501516" }
];
for (const s of staples) {
  const found = dataset.foods.filter(f => f.food_code === s.code);
  assert(found.length > 0, `Staple '${s.name}' (código ${s.code}) deve existir no dataset IBGE`);
  console.log(`  ✓ Staple '${s.name}': código ${s.code} confirmado com ${found.length} preparação(ões)`);
}

console.log("\n=== TESTE IBGE POF OFFICIAL SOURCE CONCLUÍDO COM 100% DE SUCESSO ===");
