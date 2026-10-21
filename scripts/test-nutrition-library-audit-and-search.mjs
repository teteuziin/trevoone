/**
 * TREVO ONE - AUTOMATED VERIFICATION SUITE
 * ETAPA 5: REVISÃO DA BIBLIOTECA DE ALIMENTOS & BUSCA TOLERANTE A ERROS
 */

import {
  levenshteinDistance,
  COMMON_FOOD_TYPOS,
  CANONICAL_FOOD_VOCABULARY,
  expandSearchTokensWithSynonyms,
  buildFoodSearchOrderClause,
  buildWhereClause,
  detectFoodPreparationAndBrand,
  detectMatchedAlias,
  mapFoodRow,
  tokenizeSearchQuery,
  normalizeSearchText,
  OBJECTIVE_INVALID_DATA_SQL_CONDITION,
} from "../lib/nutrition-v2/food-query-builder.ts";

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log("\n=======================================================");
console.log("TEST SUITE: NUTRITION V2 FOOD LIBRARY & SEARCH AUDIT");
console.log("=======================================================\n");

// 1. Levenshtein Distance Tests
console.log("1. Levenshtein Distance & Typo Metric:");
assert(levenshteinDistance("arroz", "arroz") === 0, "Exact match has distance 0");
assert(levenshteinDistance("aroz", "arroz") === 1, "'aroz' -> 'arroz' has distance 1 (deletion)");
assert(levenshteinDistance("frago", "frango") === 1, "'frago' -> 'frango' has distance 1");
assert(levenshteinDistance("cenora", "cenoura") === 1, "'cenora' -> 'cenoura' has distance 1");
assert(levenshteinDistance("batata", "abacate") > 2, "Distinct words have distance > 2");

// 2. Common Brazilian Typos Dictionary
console.log("\n2. Common Brazilian Food Typos Dictionary:");
assert(COMMON_FOOD_TYPOS["aroz"] === "arroz", "Typo 'aroz' maps to 'arroz'");
assert(COMMON_FOOD_TYPOS["fejao"] === "feijao", "Typo 'fejao' maps to 'feijao'");
assert(COMMON_FOOD_TYPOS["frago"] === "frango", "Typo 'frago' maps to 'frango'");
assert(COMMON_FOOD_TYPOS["mucarela"] === "mussarela", "Typo 'mucarela' maps to 'mussarela'");
assert(COMMON_FOOD_TYPOS["cosido"] === "cozido", "Typo 'cosido' maps to 'cozido'");
assert(COMMON_FOOD_TYPOS["wey"] === "whey", "Typo 'wey' maps to 'whey'");

// 3. Typo-Tolerant Token Expansion
console.log("\n3. Typo-Tolerant Token Expansion with Synonyms:");
const arozExpansion = expandSearchTokensWithSynonyms(["aroz"]);
const arozVariants = arozExpansion[0] || [];
assert(arozVariants.includes("arroz"), "'aroz' expands to include canonical 'arroz'");

const fragoExpansion = expandSearchTokensWithSynonyms(["frago"]);
const fragoVariants = fragoExpansion[0] || [];
assert(fragoVariants.includes("frango"), "'frago' expands to include canonical 'frango'");

const cacetinhoExpansion = expandSearchTokensWithSynonyms(["cacetinho"]);
const cacetinhoVariants = cacetinhoExpansion[0] || [];
assert(
  cacetinhoVariants.includes("frances") || cacetinhoVariants.includes("pao frances"),
  "'cacetinho' expands to include regional 'pao frances'"
);

const aipimExpansion = expandSearchTokensWithSynonyms(["aipim"]);
const aipimVariants = aipimExpansion[0] || [];
assert(aipimVariants.includes("mandioca"), "'aipim' expands to include 'mandioca'");

// 4. Preparation Conflict Ranking
console.log("\n4. Preparation Conflict Ranking & Priority:");
const cookedQuery = "arroz cozido";
const cookedTokens = tokenizeSearchQuery(cookedQuery);
const { orderClause: cookedOrderSql } = buildFoodSearchOrderClause(cookedQuery, cookedTokens, true);

assert(
  cookedOrderSql.includes("COALESCE(f.normalized_display_name_pt_br, f.normalized_name) LIKE '%cozid%'"),
  "Search for 'arroz cozido' generates LIKE '%cozid%' priority clause"
);
assert(
  cookedOrderSql.includes("THEN 1"),
  "Search for 'arroz cozido' assigns Rank 1 to matched preparation"
);
assert(
  cookedOrderSql.includes("THEN 3"),
  "Search for 'arroz cozido' assigns Rank 3 to conflict preparations (cru, frito, etc.)"
);

// 5. Commercial Branded Product Ranking
console.log("\n5. Commercial Branded Product Ranking:");
const brandQuery = "growth whey";
const brandTokens = tokenizeSearchQuery(brandQuery);
const { orderClause: brandOrderSql } = buildFoodSearchOrderClause(brandQuery, brandTokens, true);

assert(
  brandOrderSql.includes("f.source_key = 'GROWTH_SUPPLEMENTS'"),
  "Search for 'growth whey' prioritizes GROWTH_SUPPLEMENTS source_key at Rank 1"
);

// 6. Food Preparation and Brand Detection
console.log("\n6. Food Preparation and Brand Metadata Detection:");
const chickenGrilled = detectFoodPreparationAndBrand("Peito de frango grelhado", "Frango peito sem pele grelhado", "TACO", "SURVEY");
assert(chickenGrilled.preparationState === "Grelhado", "Detects 'Grelhado' preparation correctly");
assert(chickenGrilled.brandName === null, "Brand is null when not branded (never invent data)");

const growthProduct = detectFoodPreparationAndBrand("100% Whey Protein Concentrado", "100% Whey Protein Concentrado", "GROWTH_SUPPLEMENTS", "BRANDED");
assert(growthProduct.brandName === "Growth Supplements", "Detects 'Growth Supplements' brand from source_key");

const rawBeef = detectFoodPreparationAndBrand("Carne bovina acém cru", "Carne, bovina, acém, cru", "TACO", "SURVEY");
assert(rawBeef.preparationState === "Cru", "Detects 'Cru' preparation correctly");

const plainRice = detectFoodPreparationAndBrand("Arroz polido", "Arroz tipo 1 polido", "TACO", "SURVEY");
assert(plainRice.preparationState === null, "Unstated preparation returns null (never invent data)");

// 7. Matched Alias Detection
console.log("\n7. Matched Alias Detection (Também encontrado como):");
const aliasMatch1 = detectMatchedAlias("cacetinho", "Pão francês", "Pão, trigo, francês");
assert(aliasMatch1 === "cacetinho", "Detects alias 'cacetinho' for 'Pão francês'");

const aliasMatch2 = detectMatchedAlias("aipim", "Mandioca cozida", "Mandioca, cozida");
assert(aliasMatch2 === "aipim", "Detects alias 'aipim' for 'Mandioca cozida'");

const aliasMatch3 = detectMatchedAlias("arroz", "Arroz cozido", "Arroz, tipo 1, cozido");
assert(aliasMatch3 === null, "Direct match does NOT flag as alias match");

// 8. Row Mapping & Invariants Preservation
console.log("\n8. Row Mapping & Invariants Preservation:");
const sampleDbRow = {
  public_id: "food_test_123",
  scope: "GLOBAL",
  name: "Arroz, tipo 1, cozido",
  display_name_pt_br: "Arroz cozido",
  normalized_name: "arroz tipo 1 cozido",
  category: "Cereais e derivados",
  reference_amount: 100,
  reference_unit_code: "G",
  calories_kcal: 128.4,
  proteinG: 2.5,
  carbohydrate_g: 28.1,
  fat_g: 0.2,
  fiber_g: 1.6,
  status: "ACTIVE",
  source_type: "SURVEY",
  source_key: "TACO",
  portions_count: 2,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const mapped = mapFoodRow(sampleDbRow, "aroz");
assert(mapped.publicId === "food_test_123", "Mapped publicId is preserved");
assert(mapped.preparationState === "Cozido", "Mapped preparationState is 'Cozido'");
assert(mapped.referenceAmount === 100, "Reference amount preserved (100)");
assert(mapped.referenceUnitCode === "G", "Reference unit code preserved (G)");
assert(mapped.caloriesKcal === 128.4, "Calories preserved exactly (128.4)");
assert(mapped.carbohydrateG === 28.1, "Carbs preserved exactly (28.1)");

// Test null preservation (null != 0)
const sampleIncompleteRow = {
  ...sampleDbRow,
  public_id: "food_incomplete_456",
  protein_g: null,
};
const mappedIncomplete = mapFoodRow(sampleIncompleteRow);
assert(mappedIncomplete.proteinG === null, "Null protein remains null (never converted to 0)");

// 9. Objective SQL Guard
console.log("\n9. Objective Data Invariants SQL Guard:");
assert(
  OBJECTIVE_INVALID_DATA_SQL_CONDITION.includes("f.reference_amount <= 0"),
  "OBJECTIVE_INVALID_DATA_SQL_CONDITION blocks non-positive reference_amount"
);
assert(
  OBJECTIVE_INVALID_DATA_SQL_CONDITION.includes("COALESCE(f.calories_kcal, 0) < 0"),
  "OBJECTIVE_INVALID_DATA_SQL_CONDITION blocks negative calories"
);

// Summary
console.log("\n=======================================================");
console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log("=======================================================\n");

if (failed > 0) {
  process.exit(1);
}
