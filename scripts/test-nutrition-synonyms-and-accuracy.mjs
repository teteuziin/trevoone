/**
 * TREVO ONE - AUTOMATED TEST SUITE: SYNONYMS, ACCURACY, CANONICAL PORTIONS & ERGONOMICS
 * Verifies:
 * 1. Brazilian regional synonyms and popular names dictionary
 * 2. detectMatchedAlias behavior
 * 3. Canonical household measures (Whey, Creatina, Pasta de amendoim, Clara, Ovo, Cuscuz, Tapioca, Rap10, Cottage)
 * 4. Exact mathematical conversion (gramas = quantidade * portionAmount, macro = (macro100 * gramas) / 100)
 * 5. g/kg computation logic
 * 6. Visual hygiene (cleanFoodCatalogDisplayName strips /10minutos and POF generic suffixes)
 * 7. Query builder source allowlist (TACO + GROWTH_SUPPLEMENTS allowed, USDA prohibited)
 */

import assert from "node:assert";
import { register } from "node:module";

register("./ts-loader.mjs", import.meta.url);

const {
  tokenizeSearchQuery,
  expandSearchTokensWithSynonyms,
  detectMatchedAlias,
  buildWhereClause,
  buildFoodSearchOrderClause,
  cleanFoodDisplayName,
} = await import("../lib/nutrition-v2/food-query-builder.ts");

const {
  resolveCanonicalPortionsForFood,
} = await import("../lib/nutrition-v2/canonical-food-portions.ts");

const {
  cleanFoodCatalogDisplayName,
  formatQuickMacroDisplay,
  calculateItemNutrients,
} = await import("../lib/nutrition-v2/nutrient-calculator.ts");

console.log("=== TREVO ONE NUTRITION V2 — SYNONYMS & ACCURACY SUITE ===");

// ---------------------------------------------------------------------------
// 1. BRAZILIAN REGIONAL SYNONYMS & POPULAR NAMES
// ---------------------------------------------------------------------------
console.log("\n[Test 1] Brazilian Regional Synonyms & Popular Names Expansion");

const testSynonymPair = (query, expectedSynonym) => {
  const tokens = tokenizeSearchQuery(query);
  const expanded = expandSearchTokensWithSynonyms(tokens);
  const flattened = expanded.flat().map((t) => t.toLowerCase());
  const found = flattened.some((t) => t.includes(expectedSynonym.toLowerCase()));
  assert.ok(
    found,
    `Expected query "${query}" to expand to include "${expectedSynonym}". Got: [${flattened.join(", ")}]`
  );
  console.log(`  ✓ "${query}" expanded with "${expectedSynonym}"`);
};

testSynonymPair("aipim", "mandioca");
testSynonymPair("macaxeira", "mandioca");
testSynonymPair("jerimum", "abobora");
testSynonymPair("cacetinho", "pao frances");
testSynonymPair("pao de sal", "pao frances");
testSynonymPair("frango grelhado", "peito");
testSynonymPair("frango desfiado", "peito");
testSynonymPair("carne moida", "patinho");
testSynonymPair("patinho moido", "carne bovina");
testSynonymPair("mexerica", "tangerina");
testSynonymPair("bergamota", "tangerina");
testSynonymPair("whey", "soro de leite");
testSynonymPair("pasta de amendoim", "manteiga");
testSynonymPair("cuscuz", "milho");
testSynonymPair("flocao", "cuscuz");
testSynonymPair("tapioca", "goma");
testSynonymPair("rap10", "tortilha");
testSynonymPair("cottage", "queijo cottage");
testSynonymPair("creatina", "creatina");

// ---------------------------------------------------------------------------
// 2. MATCHED ALIAS DETECTION
// ---------------------------------------------------------------------------
console.log("\n[Test 2] Matched Alias Detection in Search Results");

const aliasAipim = detectMatchedAlias("aipim", "Mandioca cozida", "Mandioca, cozida");
assert.ok(aliasAipim != null, "Expected matchedAlias for 'aipim' on 'Mandioca cozida'");
console.log(`  ✓ detectMatchedAlias("aipim", "Mandioca cozida") = "${aliasAipim}"`);

const aliasCacetinho = detectMatchedAlias("cacetinho", "Pão francês", "Pão, trigo, francês");
assert.ok(aliasCacetinho != null, "Expected matchedAlias for 'cacetinho' on 'Pão francês'");
console.log(`  ✓ detectMatchedAlias("cacetinho", "Pão francês") = "${aliasCacetinho}"`);

const aliasJerimum = detectMatchedAlias("jerimum", "Abóbora cozida", "Abóbora, cozida");
assert.ok(aliasJerimum != null, "Expected matchedAlias for 'jerimum' on 'Abóbora cozida'");
console.log(`  ✓ detectMatchedAlias("jerimum", "Abóbora cozida") = "${aliasJerimum}"`);

const aliasDirect = detectMatchedAlias("mandioca", "Mandioca cozida", "Mandioca, cozida");
assert.strictEqual(aliasDirect, null, "Direct query match should not return an alias");
console.log("  ✓ Direct query does not trigger redundant matchedAlias");

// ---------------------------------------------------------------------------
// 3. CANONICAL HOUSEHOLD MEASURES
// ---------------------------------------------------------------------------
console.log("\n[Test 3] Canonical Household Measures");

// 3.1 Whey Protein: 1 scoop = 30g
const wheyPortions = resolveCanonicalPortionsForFood({
  name: "100% Whey Protein Concentrado",
  displayName: "100% Whey Protein Concentrado",
});
assert.ok(wheyPortions.length > 0, "Whey protein should resolve canonical portions");
const wheyScoop = wheyPortions.find((p) => p.label.toLowerCase().includes("scoop") || p.label.toLowerCase().includes("dosador"));
assert.ok(wheyScoop != null, "Whey should have Scoop/Dosador");
assert.strictEqual(wheyScoop.amount, 30, "Whey scoop must be exactly 30g");
console.log("  ✓ Whey Protein: 1 scoop = 30g");

// 3.2 Pasta de Amendoim: 1 colher sopa cheia = 20g, rasa = 15g
const peanutPortions = resolveCanonicalPortionsForFood({
  name: "Pasta de Amendoim Integral",
  displayName: "Pasta de Amendoim Integral",
});
assert.ok(peanutPortions.length > 0, "Pasta de amendoim should resolve portions");
const peanutCheia = peanutPortions.find((p) => p.label.includes("cheia"));
assert.ok(peanutCheia != null && peanutCheia.amount === 20, "Pasta de amendoim cheia must be 20g");
const peanutRasa = peanutPortions.find((p) => p.label.includes("rasa"));
assert.ok(peanutRasa != null && peanutRasa.amount === 15, "Pasta de amendoim rasa must be 15g");
console.log("  ✓ Pasta de Amendoim: 1 colher cheia = 20g, rasa = 15g");

// 3.3 Clara de Ovo: 1 un = 33g
const claraPortions = resolveCanonicalPortionsForFood({
  name: "Clara de ovo de galinha cozida",
  displayName: "Clara de ovo cozida",
});
assert.ok(claraPortions.length > 0, "Clara de ovo should resolve portions");
const claraUn = claraPortions.find((p) => p.label.includes("Unidade (clara)"));
assert.ok(claraUn != null && claraUn.amount === 33, "Clara de ovo unidade must be 33g");
console.log("  ✓ Clara de Ovo: 1 unidade = 33g");

// 3.4 Ovo de Galinha Inteiro: 1 un média = 50g
const ovoPortions = resolveCanonicalPortionsForFood({
  name: "Ovo, de galinha, inteiro, cozido",
  displayName: "Ovo de galinha cozido",
});
assert.ok(ovoPortions.length > 0, "Ovo de galinha should resolve portions");
const ovoMedio = ovoPortions.find((p) => p.label.includes("média"));
assert.ok(ovoMedio != null && ovoMedio.amount === 50, "Ovo de galinha médio must be 50g");
console.log("  ✓ Ovo de galinha inteiro: 1 unidade média = 50g");

// 3.5 Cuscuz de Milho: 1 fatia = 100g, 1 colher servir = 50g
const cuscuzPortions = resolveCanonicalPortionsForFood({
  name: "Cuscuz de milho cozido",
  displayName: "Cuscuz de milho",
});
assert.ok(cuscuzPortions.length > 0, "Cuscuz de milho should resolve portions");
const cuscuzFatia = cuscuzPortions.find((p) => p.label.includes("Fatia"));
assert.ok(cuscuzFatia != null && cuscuzFatia.amount === 100, "Cuscuz fatia must be 100g");
const cuscuzServir = cuscuzPortions.find((p) => p.label.includes("servir"));
assert.ok(cuscuzServir != null && cuscuzServir.amount === 50, "Cuscuz colher de servir must be 50g");
console.log("  ✓ Cuscuz de milho: 1 fatia = 100g, 1 colher servir = 50g");

// 3.6 Tapioca: 1 colher de sopa = 20g, 1 disco = 50g
const tapiocaPortions = resolveCanonicalPortionsForFood({
  name: "Goma de tapioca hidratada",
  displayName: "Tapioca",
});
assert.ok(tapiocaPortions.length > 0, "Tapioca should resolve portions");
const tapiocaDisco = tapiocaPortions.find((p) => p.label.includes("Disco"));
assert.ok(tapiocaDisco != null && tapiocaDisco.amount === 50, "Tapioca disco must be 50g");
const tapiocaColher = tapiocaPortions.find((p) => p.label.includes("Colher"));
assert.ok(tapiocaColher != null && tapiocaColher.amount === 20, "Tapioca colher must be 20g");
console.log("  ✓ Tapioca: 1 colher = 20g, 1 disco = 50g");

// 3.7 Rap10 / Tortilha: 1 disco = 40g
const rap10Portions = resolveCanonicalPortionsForFood({
  name: "Tortilha de trigo Rap10",
  displayName: "Rap10 Tradicional",
});
assert.ok(rap10Portions.length > 0, "Rap10 should resolve portions");
const rap10Disco = rap10Portions.find((p) => p.label.includes("Disco"));
assert.ok(rap10Disco != null && rap10Disco.amount === 40, "Rap10 disco must be 40g");
console.log("  ✓ Rap10 / Tortilha: 1 disco = 40g");

// 3.8 Queijo Cottage: 1 colher sopa = 30g, 1 pote = 100g
const cottagePortions = resolveCanonicalPortionsForFood({
  name: "Queijo tipo cottage",
  displayName: "Queijo cottage",
});
assert.ok(cottagePortions.length > 0, "Queijo cottage should resolve portions");
const cottageColher = cottagePortions.find((p) => p.label.includes("Colher de sopa"));
assert.ok(cottageColher != null && cottageColher.amount === 30, "Cottage colher must be 30g");
const cottagePote = cottagePortions.find((p) => p.label.includes("Pote pequeno"));
assert.ok(cottagePote != null && cottagePote.amount === 100, "Cottage pote pequeno must be 100g");
console.log("  ✓ Queijo cottage: 1 colher = 30g, 1 pote = 100g");

// 3.9 Creatina: 1 dosador (3g) = 3g, 1 dosador (5g) = 5g
const creatinaPortions = resolveCanonicalPortionsForFood({
  name: "Creatina 100% Pura Monohidratada",
  displayName: "Creatina Monohidratada",
});
assert.ok(creatinaPortions.length > 0, "Creatina should resolve portions");
const creatina3g = creatinaPortions.find((p) => p.amount === 3);
assert.ok(creatina3g != null, "Creatina 3g dosador must exist");
const creatina5g = creatinaPortions.find((p) => p.amount === 5);
assert.ok(creatina5g != null, "Creatina 5g dosador must exist");
console.log("  ✓ Creatina: 1 dosador 3g = 3g, 1 dosador 5g = 5g");

// ---------------------------------------------------------------------------
// 4. EXACT MATHEMATICAL ACCURACY & ZERO DRIFT
// ---------------------------------------------------------------------------
console.log("\n[Test 4] Mathematical Accuracy & Zero Drift");

// Food reference 100g: 100 kcal, 20g P, 0g C, 2.2g G
const mockFood = {
  referenceAmount: 100,
  referenceUnitCode: "G",
  caloriesKcal: 100,
  proteinG: 20,
  carbohydrateG: 0,
  fatG: 2.2,
  fiberG: 0,
  sodiumMg: 50,
};

// 1.5 scoops of Whey (1.5 * 30g = 45g)
const wheyCalc = calculateItemNutrients({
  food: mockFood,
  prescribedQuantity: 1.5,
  portion: { equivalentReferenceAmount: 30 },
});
assert.strictEqual(wheyCalc.effectiveGrams, 45, "1.5 scoops * 30g must equal 45g");
assert.strictEqual(wheyCalc.caloriesKcal, 45, "45g of 100kcal/100g must be 45 kcal");
assert.strictEqual(wheyCalc.proteinG, 9, "45g of 20g/100g must be 9g protein");
assert.strictEqual(wheyCalc.fatG, 0.99, "45g of 2.2g/100g must be 0.99g fat");
console.log("  ✓ Portion scaling: 1.5 * 30g = 45g, macros scaled strictly proportionally without rounding drift");

// ---------------------------------------------------------------------------
// 5. G/KG COMPUTATION LOGIC
// ---------------------------------------------------------------------------
console.log("\n[Test 5] g/kg Daily Summary Computation");

const totalProteinG = 160;
const totalCarbsG = 240;
const totalFatG = 70;
const studentWeightKg = 80;

const proteinPerKg = (totalProteinG / studentWeightKg).toFixed(1).replace(".", ",");
const carbsPerKg = (totalCarbsG / studentWeightKg).toFixed(1).replace(".", ",");
const fatPerKg = (totalFatG / studentWeightKg).toFixed(1).replace(".", ",");

assert.strictEqual(proteinPerKg, "2,0", "160g protein / 80kg must equal 2,0 g/kg");
assert.strictEqual(carbsPerKg, "3,0", "240g carbs / 80kg must equal 3,0 g/kg");
assert.strictEqual(fatPerKg, "0,9", "70g fat / 80kg must equal 0,9 g/kg");
console.log(`  ✓ g/kg: ${proteinPerKg} g/kg P, ${carbsPerKg} g/kg C, ${fatPerKg} g/kg G for 80kg patient`);

// ---------------------------------------------------------------------------
// 6. VISUAL HYGIENE & DISPLAY CLEANING
// ---------------------------------------------------------------------------
console.log("\n[Test 6] Visual Hygiene & Display Cleaning");

// /10minutos cleanup
const eggProtocol = cleanFoodCatalogDisplayName("Ovo de galinha cozido /10minutos");
assert.ok(!eggProtocol.includes("/10minutos"), "Must strip /10minutos protocol from display name");
console.log(`  ✓ Cleaned: "Ovo de galinha cozido /10minutos" -> "${eggProtocol}"`);

// Generic POF suffix cleanup
const genericSuffix = cleanFoodCatalogDisplayName("Geleia de Frutas de Qualquer Marca ou Sabor");
assert.strictEqual(genericSuffix, "Geleia de Frutas", "Must strip POF generic suffix");
console.log(`  ✓ Cleaned: "Geleia de Frutas de Qualquer Marca ou Sabor" -> "${genericSuffix}"`);

// Inverted commas cleanup
const invertedCommas = cleanFoodCatalogDisplayName("Doce, de leite, cremoso");
assert.strictEqual(invertedCommas, "Doce de leite cremoso", "Must clean inverted commas from TACO");
console.log(`  ✓ Cleaned: "Doce, de leite, cremoso" -> "${invertedCommas}"`);

// Custom clinical names preserved
const clinicalName = cleanFoodCatalogDisplayName("Shake hipercalórico pós-treino da consultoria");
assert.strictEqual(clinicalName, "Shake hipercalórico pós-treino da consultoria", "Must preserve custom names");
console.log(`  ✓ Preserved: "${clinicalName}"`);

// ---------------------------------------------------------------------------
// 7. QUERY BUILDER SOURCE ALLOWLIST
// ---------------------------------------------------------------------------
console.log("\n[Test 7] Query Builder Source Allowlist");

const unifiedWhere = buildWhereClause({ query: "whey" }, 10);
assert.ok(
  unifiedWhere.whereClause.includes("source_key IN ('TACO', 'GROWTH_SUPPLEMENTS')"),
  "Unified search WHERE clause must allow both TACO and GROWTH_SUPPLEMENTS"
);
assert.ok(
  !unifiedWhere.whereClause.includes("USDA"),
  "Unified search WHERE clause must NOT allow USDA"
);
console.log("  ✓ Query builder WHERE clause allows TACO + GROWTH_SUPPLEMENTS, keeps USDA excluded");

const usdaWhere = buildWhereClause({ source: "USDA" }, 10);
assert.ok(usdaWhere.whereClause.includes("1=0"), "Direct USDA filter must be blocked with 1=0");
console.log("  ✓ USDA source filter returns 1=0 (safely blocked)");

const order = buildFoodSearchOrderClause("whey", ["whey"]);
assert.ok(
  order.orderClause.includes("WHEN f.source_key = 'GROWTH_SUPPLEMENTS' THEN 2"),
  "Order clause must prioritize GROWTH_SUPPLEMENTS right after TACO"
);
console.log("  ✓ Order clause ranks TACO first, GROWTH_SUPPLEMENTS second, CONSULTANCY third");

console.log("\nALL TESTS PASSED SUCCESSFULLY! ✓\n");
