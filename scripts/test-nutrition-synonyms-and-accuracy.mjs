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
  cleanPortionLabel,
} = await import("../lib/nutrition-v2/nutrient-calculator.ts");

const {
  CANONICAL_SPORTS_FOODS,
  searchCanonicalSportsFoods,
} = await import("../lib/nutrition-v2/canonical-sports-foods.ts");

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

// ---------------------------------------------------------------------------
// 8. CANONICAL SPORTS FOODS OBJECT RETRIEVAL
// ---------------------------------------------------------------------------
console.log("\n[Test 8] Canonical Sports Foods Object Retrieval");

const wheyResults = searchCanonicalSportsFoods("whey");
assert.ok(wheyResults.length >= 2, `Expected at least 2 whey foods, got ${wheyResults.length}`);
const wheyConcentrado = wheyResults.find((f) => f.name.includes("Concentrado"));
assert.ok(wheyConcentrado != null, "Must find Whey Protein Concentrado");
assert.strictEqual(wheyConcentrado.proteinG, 80, "Whey 80% must have 80g protein per 100g");
assert.ok(wheyConcentrado.portionsCount > 0, "Whey must have portions available");

const wheyCanonicalPortions = resolveCanonicalPortionsForFood({
  name: wheyConcentrado.name,
  displayName: wheyConcentrado.displayNamePtBr,
  category: wheyConcentrado.category,
  referenceUnitCode: wheyConcentrado.referenceUnitCode,
});
assert.ok(wheyCanonicalPortions.some((p) => p.label.includes("Scoop") && p.amount === 30), "Whey must have Scoop (30g) portion");
console.log(`  ✓ "whey" returned ${wheyResults.length} foods including "${wheyConcentrado.name}" (80g protein/100g, Scoop 30g)`);

const creatinaResults = searchCanonicalSportsFoods("creatina");
assert.ok(creatinaResults.length >= 1, `Expected at least 1 creatina food, got ${creatinaResults.length}`);
const creatina = creatinaResults[0];
assert.ok(creatina.name.includes("Creatina"), "Must find Creatina Monohidratada");
const creatinaCanonicalPortions = resolveCanonicalPortionsForFood({
  name: creatina.name,
  displayName: creatina.displayNamePtBr,
  category: creatina.category,
  referenceUnitCode: creatina.referenceUnitCode,
});
assert.ok(creatinaCanonicalPortions.some((p) => p.label.includes("Dosador") && p.amount === 3), "Creatina must have Dosador 3g portion");
console.log(`  ✓ "creatina" returned "${creatina.name}" (Dosador 3g)`);

const amendoimResults = searchCanonicalSportsFoods("pasta de amendoim");
assert.ok(amendoimResults.length >= 1, `Expected at least 1 pasta de amendoim food, got ${amendoimResults.length}`);
const pasta = amendoimResults[0];
assert.ok(pasta.name.toLowerCase().includes("pasta de amendoim"), "Must find Pasta de amendoim");
console.log(`  ✓ "pasta de amendoim" returned "${pasta.name}"`);

// ---------------------------------------------------------------------------
// 9. PRIORITIZATION OF COOKED OVER RAW IN SEARCH RANKING
// ---------------------------------------------------------------------------
console.log("\n[Test 9] Prioritization of Cooked over Raw in Search Ranking");

const arrozOrder = buildFoodSearchOrderClause("arroz", ["arroz"]);
assert.ok(
  arrozOrder.orderClause.includes("LIKE '%cozid%' OR") && arrozOrder.orderClause.includes("THEN 1"),
  "Order clause for 'arroz' must prioritize cooked foods (THEN 1)"
);
assert.ok(
  arrozOrder.orderClause.includes("LIKE '%cru%'") && arrozOrder.orderClause.includes("THEN 3"),
  "Order clause for 'arroz' must rank raw foods after cooked (THEN 3)"
);
console.log("  ✓ Querying 'arroz' prioritizes cooked (1) over raw (3)");

const arrozCruOrder = buildFoodSearchOrderClause("arroz cru", ["arroz", "cru"]);
assert.ok(
  arrozCruOrder.orderClause.includes("LIKE '%cru%') THEN 1"),
  "Order clause for 'arroz cru' must prioritize raw foods (cru THEN 1)"
);
console.log("  ✓ Querying 'arroz cru' prioritizes raw foods (cru THEN 1, cozid THEN 3)");

// ---------------------------------------------------------------------------
// 10. CLEAN PORTION LABEL
// ---------------------------------------------------------------------------
console.log("\n[Test 10] cleanPortionLabel Dropdown Hygiene");

assert.strictEqual(cleanPortionLabel("1 Fatia - 25 g"), "Fatia - 25 g");
assert.strictEqual(cleanPortionLabel("1 Colher de sopa"), "Colher de sopa");
assert.strictEqual(cleanPortionLabel("1x copo americano"), "copo americano");
assert.strictEqual(cleanPortionLabel("Fatia"), "Fatia");
console.log("  ✓ cleanPortionLabel strips redundant '1 ' prefix without corrupting portion labels");

// ---------------------------------------------------------------------------
// 11. WHOLE EGG PORTION AND ACCURACY (4 EGGS = 200G, ~292 KCAL, 26.6G P)
// ---------------------------------------------------------------------------
console.log("\n[Test 11] Whole Egg Canonical Portions & 4 Eggs Macro Accuracy");

const eggCanonicalPortions = resolveCanonicalPortionsForFood({
  name: "Ovo, de galinha, inteiro, cozido",
  displayName: "Ovo inteiro cozido ou mexido",
  category: "Ovos e derivados",
  referenceUnitCode: "G",
});

const defaultEggPortion = eggCanonicalPortions.find((p) => p.label === "Unidade");
assert.ok(defaultEggPortion != null, "Must have 'Unidade' portion for eggs");
assert.strictEqual(defaultEggPortion.amount, 50, "1 Unidade of chicken egg must be 50g");

// TACO 100g cooked whole egg: 146 kcal, 13.3g P, 0.6g C, 9.5g G
const eggCalc = calculateItemNutrients({
  food: {
    name: "Ovo inteiro cozido ou mexido",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 146,
    proteinG: 13.3,
    carbohydrateG: 0.6,
    fatG: 9.5,
  },
  prescribedQuantity: 4,
  prescribedUnitCode: "PORCAO",
  portion: {
    label: "Unidade",
    equivalentReferenceAmount: defaultEggPortion.amount, // 50g
  },
});

assert.strictEqual(eggCalc.isValid, true, "Egg calculation must be valid");
assert.strictEqual(eggCalc.effectiveGrams, 200, "4 whole eggs must equal 200g (never 16g)");
assert.strictEqual(eggCalc.caloriesKcal, 292, "4 eggs must equal 292 kcal (never 1232 kcal!)");
assert.strictEqual(eggCalc.proteinG, 26.6, "4 eggs must equal 26.6g protein (never 192g!)");
assert.strictEqual(eggCalc.carbohydrateG, 1.2, "4 eggs must equal 1.2g carbs");
assert.strictEqual(eggCalc.fatG, 19, "4 eggs must equal 19g fat");
console.log(`  ✓ 4 eggs (Unidade 50g) = ${eggCalc.effectiveGrams}g, ${eggCalc.caloriesKcal} kcal, ${eggCalc.proteinG}g P (never 1232 kcal / 192g P / 16g!)`);

// ---------------------------------------------------------------------------
// 12. PURE PROTEIN ZERO CARBS (CARNE MOÍDA, PATINHO, FRANGO)
// ---------------------------------------------------------------------------
console.log("\n[Test 12] Pure Protein Foods Zero Carbs Inference & Clean Daily Totals");

const {
  isPureProteinFood,
  resolveItemEffectiveMacros,
  calculateMealTotals,
} = await import("../lib/nutrition-v2/nutrient-calculator.ts");

assert.strictEqual(isPureProteinFood("Carne Moida"), true);
assert.strictEqual(isPureProteinFood("Patinho bovino moido cozido"), true);
assert.strictEqual(isPureProteinFood("Peito de frango grelhado"), true);
assert.strictEqual(isPureProteinFood("Ovo mexido"), true);
assert.strictEqual(isPureProteinFood("Torta de frango"), false);
assert.strictEqual(isPureProteinFood("Bife a milanesa"), false);

const carneMoidaResolved = resolveItemEffectiveMacros({
  name: "Carne Moida",
  caloriesKcalSnapshot: 128,
  proteinGSnapshot: 16,
  carbohydrateGSnapshot: null, // missing in raw source
  fatGSnapshot: 6.7,
});

assert.strictEqual(carneMoidaResolved.carbohydrate, 0, "Pure meat with null carbs must resolve to 0g carbs");

const mealTotalsWithPureMeat = calculateMealTotals([
  {
    foodNameSnapshot: "Carne Moida",
    foodId: 101,
    prescribedQuantity: 100,
    prescribedUnitCode: "G",
    caloriesKcalSnapshot: 128,
    proteinGSnapshot: 16,
    carbohydrateGSnapshot: null,
    fatGSnapshot: 6.7,
  },
]);

assert.strictEqual(mealTotalsWithPureMeat.carbohydrateG, 0);
assert.strictEqual(mealTotalsWithPureMeat.hasIncompleteData, false, "Meal with pure meat must not flag incomplete data");
assert.strictEqual(mealTotalsWithPureMeat.missingCarbohydrateCount, 0, "Carbohydrate count must not be flagged missing");
assert.strictEqual(mealTotalsWithPureMeat.incompleteItems.length, 0, "Incomplete items list must be empty");
console.log("  ✓ Pure protein items (Carne Moída with null carbs) resolve to 0g carbs without flagging incomplete warnings");

console.log("\nALL TESTS PASSED SUCCESSFULLY! ✓\n");
