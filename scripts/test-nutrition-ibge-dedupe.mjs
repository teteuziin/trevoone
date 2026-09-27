import assert from "node:assert/strict";
import fs from "node:fs";

console.log("=== INICIANDO TESTE: IBGE POF DEDUPLICATION & TACO INTEGRITY ===");

const dataset = JSON.parse(fs.readFileSync("data/nutrition/ibge-pof-2008-2009.json", "utf8"));
const taco = JSON.parse(fs.readFileSync("data/nutrition/taco-2011.json", "utf8"));

function normalizeSearchText(text) {
  if (!text || typeof text !== "string") return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// 1. TACO Preservation
console.log("Test 1: Validando preservação integral do acervo TACO...");
const tacoFoods = taco.foods || taco;
assert.equal(tacoFoods.length, 548, "TACO deve manter exatamente 548 alimentos canônicos");
const tacoNormSet = new Set(tacoFoods.map(t => normalizeSearchText(t.name)));
console.log(`  ✓ Acervo TACO íntegro com ${tacoFoods.length} alimentos de base laboratorial analítica`);

// 2. IBGE Deduplication Rules
console.log("Test 2: Validando regras de deduplicação IBGE contra TACO...");
let skippedTacoDerived = 0;
let skippedExactTacoDuplicate = 0;
const validCandidates = [];

for (const food of dataset.foods) {
  // Rule 1: Skip TACO-derived references in IBGE
  if (food.ibge_meta?.is_taco_derived) {
    skippedTacoDerived++;
    continue;
  }

  const normName = normalizeSearchText(food.name);

  // Rule 2: Skip exact duplicates using generic name matching (no hardcoded food code exceptions)
  if (tacoNormSet.has(normName)) {
    skippedExactTacoDuplicate++;
    continue;
  }

  validCandidates.push(food);
}

console.log(`  ✓ Deduplicação Regra 1 (derivados de TACO): ${skippedTacoDerived} alimentos ignorados`);
assert.equal(skippedTacoDerived, 127, "Deveria identificar exatamente 127 alimentos IBGE derivados de TACO (Ref 2)");

console.log(`  ✓ Deduplicação Regra 2 (match exato com TACO): ${skippedExactTacoDuplicate} alimentos ignorados`);
assert.equal(skippedExactTacoDuplicate, 24, "Deveria identificar exatamente 24 alimentos duplicados com TACO");

console.log(`  ✓ Candidatos finais IBGE para expansão: ${validCandidates.length} alimentos`);
assert.equal(validCandidates.length, 1820, "Total de alimentos IBGE válidos deve ser exatamente 1820");

// 3. Staple gaps filled
console.log("Test 3: Validando que lacunas críticas foram preservadas no IBGE...");
const tilapia = validCandidates.filter(f => f.food_code === "7400101");
assert(tilapia.length > 0, "Tilápia deve ser preservada na seleção IBGE");
const azeite = validCandidates.filter(f => f.food_code === "8400101");
assert(azeite.length > 0, "Azeite deve ser preservado na seleção IBGE");
const carneDeSol = validCandidates.filter(f => f.food_code === "8100201");
assert(carneDeSol.length > 0, "Carne de sol deve ser preservada na seleção IBGE");
const cuscuz = validCandidates.filter(f => f.food_code === "6902901");
assert(cuscuz.length > 0, "Cuscuz deve ser preservado na seleção IBGE");

console.log("  ✓ Tilápia, Azeite, Carne de Sol e Cuscuz garantidos na biblioteca final");

// 4. Source UID uniqueness
console.log("Test 4: Validando unicidade estrita de source_uid...");
const uidSet = new Set();
for (const f of validCandidates) {
  assert(!uidSet.has(f.source_uid), `UID duplicado: ${f.source_uid}`);
  uidSet.add(f.source_uid);
}
console.log(`  ✓ Todos os ${uidSet.size} source_uids são únicos e determinísticos`);

console.log("\n=== TESTE IBGE POF DEDUPLICATION CONCLUÍDO COM 100% DE SUCESSO ===");
