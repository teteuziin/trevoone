/**
 * TREVO ONE — TEST SUITE: NUTRITION TACO UNIFICATION & DECIMAL FORMATTING
 *
 * Verifies:
 * 1. buildWhereClause enforces TACO (GLOBAL) + Consultancy custom foods isolation
 * 2. buildWhereClause blocks filter.source = "USDA" with 1=0
 * 3. buildOrderByClause prioritizes TACO first, then Consultancy foods
 * 4. evaluateNutrientCompleteness formats macros to max 1 decimal place and kcal as integer
 * 5. cleanFoodCatalogDisplayName cleans TACO inverted commas and IBGE POF suffixes while preserving custom names
 */

import assert from "node:assert";
import { register } from "node:module";

register("./ts-loader.mjs", import.meta.url);

const {
  buildWhereClause,
  buildSelectFoodsQuery,
  buildCountQuery,
  buildFoodSearchOrderClause,
} = await import("../lib/nutrition-v2/food-query-builder.ts");

const {
  evaluateNutrientCompleteness,
  cleanFoodCatalogDisplayName,
} = await import("../lib/nutrition-v2/nutrient-calculator.ts");

console.log("================================================================================");
console.log("TREVO ONE — TEST SUITE: NUTRITION TACO UNIFICATION");
console.log("================================================================================");

// -----------------------------------------------------------------------------
// Test 1: buildWhereClause — Unified Search Isolation (TACO + Active Consultancy)
// -----------------------------------------------------------------------------
console.log("\n[Test 1] buildWhereClause — Unified Search Isolation");

// Scenario A: Default unified search with consultancyId = 42
const searchUnified = buildWhereClause({ query: "arroz" }, 42);
assert.ok(
  searchUnified.whereClause.includes("(f.source_key = 'TACO' AND f.scope = 'GLOBAL' AND f.status = 'ACTIVE')"),
  "Must include TACO GLOBAL ACTIVE condition"
);
assert.ok(
  searchUnified.whereClause.includes("(f.scope = 'CONSULTANCY' AND f.consultancy_id = ? AND f.status = 'ACTIVE')"),
  "Must include consultancy custom food condition with param placeholder"
);
assert.ok(!searchUnified.whereClause.includes("USDA"), "Must NOT query USDA in unified search");
assert.ok(!searchUnified.whereClause.includes("auto_imported_from_reference"), "Must NOT leak auto_imported allowlist");
assert.strictEqual(searchUnified.params[0], 42, "First parameter must be consultancyId");
console.log("  ✅ Busca unificada restringe a TACO e alimentos da consultoria 42.");

// Scenario B: Empty query with consultancyId = 15
const searchEmpty = buildWhereClause({}, 15);
assert.ok(
  searchEmpty.whereClause.includes("(f.source_key = 'TACO' AND f.scope = 'GLOBAL' AND f.status = 'ACTIVE')"),
  "Empty query must restrict to TACO"
);
assert.strictEqual(searchEmpty.params[0], 15, "Parameter must be consultancyId");
console.log("  ✅ Busca sem termo (listagem padrão) restringe a TACO + consultoria 15.");

// Scenario C: Search without consultancy (public / anonymous fallback)
const searchNoConsultancy = buildWhereClause({ query: "frango" }, null);
assert.ok(
  searchNoConsultancy.whereClause.includes("f.source_key = 'TACO' AND f.scope = 'GLOBAL' AND f.status = 'ACTIVE'"),
  "Fallback without consultancy must be strictly TACO GLOBAL"
);
assert.ok(!searchNoConsultancy.whereClause.includes("f.scope = 'CONSULTANCY'"), "Must NOT allow consultancy foods when consultancyId is null");
console.log("  ✅ Busca sem consultoria selecionada restringe estritamente a TACO GLOBAL.");

// Scenario D: Explicit filter.source = "USDA" must be prohibited (1=0)
const searchUsda = buildWhereClause({ source: "USDA" }, 42);
assert.ok(searchUsda.whereClause.includes("1=0"), "USDA source must be blocked with 1=0");
console.log("  ✅ Filtro direto por USDA bloqueado com 1=0.");

// Scenario E: Explicit filter.source = "CONSULTANCY"
const searchConsultancyOnly = buildWhereClause({ source: "CONSULTANCY" }, 77);
assert.ok(
  searchConsultancyOnly.whereClause.includes("f.scope = 'CONSULTANCY' AND f.consultancy_id = ?"),
  "Must restrict to consultancy 77 only"
);
assert.strictEqual(searchConsultancyOnly.params[0], 77);
console.log("  ✅ Filtro por CONSULTANCY isola estritamente a consultoria 77.");

// -----------------------------------------------------------------------------
// Test 2: buildFoodSearchOrderClause — Ranking Prioritizes TACO then Consultancy
// -----------------------------------------------------------------------------
console.log("\n[Test 2] buildFoodSearchOrderClause — Prioridade TACO e Consultoria");
const { orderClause } = buildFoodSearchOrderClause("banana", ["banana"], true);
assert.ok(orderClause.includes("WHEN f.source_key = 'TACO' THEN 1"), "TACO must have top priority ranking (1)");
assert.ok(orderClause.includes("WHEN f.scope = 'CONSULTANCY' THEN 2"), "Consultancy must have ranking 2");
console.log("  ✅ buildFoodSearchOrderClause prioriza TACO (1) e Consultoria (2).");

// -----------------------------------------------------------------------------
// Test 3: buildSelectFoodsQuery & buildCountQuery
// -----------------------------------------------------------------------------
console.log("\n[Test 3] buildSelectFoodsQuery & buildCountQuery integridade SQL");
const selectResult = buildSelectFoodsQuery({ query: "feijao", page: 1, pageSize: 20 }, 42);
assert.ok(selectResult.fullSql.startsWith("SELECT"), "Must generate SELECT query");
assert.ok(selectResult.fullSql.includes("LIMIT ? OFFSET ?"), "Must contain limit/offset placeholders");
assert.ok(selectResult.fullSql.includes("f.source_key = 'TACO'"), "Must contain TACO guard");

const countResult = buildCountQuery({ query: "feijao" }, 42);
assert.ok(countResult.sql.startsWith("SELECT COUNT(*)"), "Must generate COUNT query");
assert.ok(countResult.sql.includes("f.source_key = 'TACO'"), "Must contain TACO guard");
console.log("  ✅ SELECT e COUNT gerados com integridade e guardas TACO.");

// -----------------------------------------------------------------------------
// Test 4: evaluateNutrientCompleteness — Formatação Decimal Limpa
// -----------------------------------------------------------------------------
console.log("\n[Test 4] evaluateNutrientCompleteness — Formatação de Decimais");

// Case A: Carbohydrates with many decimals (e.g. 200.5 + 25.39 = 225.89 g)
const completenessCarbs = evaluateNutrientCompleteness([200.5, 25.39], "g");
assert.strictEqual(completenessCarbs.value, 225.9, "Value must be rounded to 1 decimal place (225.9)");
assert.strictEqual(completenessCarbs.displayText, "225,9 g", "DisplayText must be '225,9 g' (never '225.89 g')");
assert.strictEqual(completenessCarbs.isComplete, true);
console.log("  ✅ Carboidratos formatados como '225,9 g' (arredondamento 1 casa).");

// Case B: Energy/Calories with decimals (e.g. 1500.2 + 1532.34 = 3032.54 kcal)
const completenessKcal = evaluateNutrientCompleteness([1500.2, 1532.34], "kcal");
assert.strictEqual(completenessKcal.value, 3033, "Kcal value must be rounded to whole integer (3033)");
assert.strictEqual(completenessKcal.displayText, "3033 kcal", "DisplayText must be '3033 kcal'");
console.log("  ✅ Calorias formatadas como inteiro '3033 kcal'.");

// Case C: Incomplete nutrient (e.g. dietary fiber with missing info)
const completenessFiber = evaluateNutrientCompleteness([2.41, null, undefined], "g");
assert.strictEqual(completenessFiber.value, 2.4);
assert.strictEqual(completenessFiber.displayText, "2,4 g", "Fiber displayed with 1 decimal place");
assert.strictEqual(completenessFiber.isComplete, false, "Fiber missing info must be marked incomplete");
assert.strictEqual(completenessFiber.missingItemCount, 2);
console.log("  ✅ Fibras com dados parciais formatadas com 1 casa e marcadas como incompletas.");

// -----------------------------------------------------------------------------
// Test 5: cleanFoodCatalogDisplayName — Higiene Visual
// -----------------------------------------------------------------------------
console.log("\n[Test 5] cleanFoodCatalogDisplayName — Higiene Visual");
assert.strictEqual(cleanFoodCatalogDisplayName("Doce, de leite, cremoso"), "Doce de leite cremoso");
assert.strictEqual(
  cleanFoodCatalogDisplayName("Geleia de Frutas de Qualquer Marca ou Sabor"),
  "Geleia de Frutas"
);
assert.strictEqual(
  cleanFoodCatalogDisplayName("Pão de Forma Tradicional"),
  "Pão de Forma Tradicional"
);
console.log("  ✅ Nomes limpos com sucesso preservando nomes válidos.");

console.log("\n================================================================================");
console.log("TODOS OS TESTES DE UNIFICAÇÃO TACO PASSARAM COM SUCESSO! ✅");
console.log("================================================================================");
