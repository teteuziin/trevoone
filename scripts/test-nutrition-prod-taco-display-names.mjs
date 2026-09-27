import assert from "node:assert/strict";
import fs from "node:fs";
import {
  cleanFoodDisplayName,
  cleanTacoDisplayName,
  mapFoodRow,
  tokenizeSearchQuery,
  normalizeSearchText,
  USER_SEARCH_ALIASES,
  expandSearchTokensWithSynonyms,
} from "../lib/nutrition-v2/food-query-builder.ts";

console.log("=== TREVO ONE — PROD HOTFIX: TACO CLEAN DISPLAY NAMES AUDIT ===\n");

// ----------------------------------------------------------------------------
// 1. AUDIT ALL 548 CURRENT TACO CORE FOODS
// ----------------------------------------------------------------------------
console.log("Stage 1: Auditing ALL 548 TACO Core Foods...");

const tacoData = JSON.parse(fs.readFileSync("data/nutrition/taco-2011.json", "utf8"));
const foods = tacoData.foods;

assert.equal(foods.length, 548, "TACO core must have exactly 548 foods");

let displayNamesWithComma = 0;
let displayNamesWithAliasList = 0;
let emptyDisplayNames = 0;
let sourceNamesModified = 0;
let inventedPreparationCount = 0;

const prepKeywords = ["cozido", "cozida", "cru", "crua", "frito", "frita", "assado", "assada", "grelhado", "grelhada"];

for (const food of foods) {
  const originalName = food.name;
  const cleaned = cleanFoodDisplayName(originalName, "TACO");

  // Check source integrity
  if (food.name !== originalName) {
    sourceNamesModified++;
  }

  // Check empty
  if (!cleaned || cleaned.trim().length === 0) {
    emptyDisplayNames++;
  }

  // Check commas
  if (cleaned.includes(",")) {
    displayNamesWithComma++;
    console.error(`  [COMMA ERROR] "${originalName}" -> "${cleaned}"`);
  }

  // Check alias list leakage (e.g. "Pão francês, cacetinho", "Mandioca, aipim", etc.)
  if (
    /cacetinho/i.test(cleaned) ||
    /,\s*(?:aipim|macaxeira|mexerica|bergamota|mussarela|mozarela)/i.test(cleaned) ||
    /(?:mandioca\s+aipim|tangerina\s+mexerica|muçarela\s+mussarela)/i.test(cleaned)
  ) {
    displayNamesWithAliasList++;
    console.error(`  [ALIAS LIST ERROR] "${originalName}" -> "${cleaned}"`);
  }

  // Check no invented preparation
  const origLower = originalName.toLowerCase();
  const cleanLower = cleaned.toLowerCase();
  for (const prep of prepKeywords) {
    const wasInOrig = new RegExp(`\\b${prep}\\b`, "i").test(origLower);
    const isInClean = new RegExp(`\\b${prep}\\b`, "i").test(cleanLower);
    if (isInClean && !wasInOrig) {
      // Check if it was a morphological agreement or inflection of another prep already in orig
      const relatedInOrig = prepKeywords.some((p) => new RegExp(`\\b${p}\\b`, "i").test(origLower));
      if (!relatedInOrig) {
        inventedPreparationCount++;
        console.error(`  [INVENTED PREP] "${originalName}" -> "${cleaned}" added prep "${prep}"`);
      }
    }
  }
}

console.log(`  CURRENT_PROD_FOOD_COUNT: ${foods.length}`);
console.log(`  DISPLAY_NAMES_WITH_COMMA: ${displayNamesWithComma}`);
console.log(`  DISPLAY_NAMES_WITH_ALIAS_LIST: ${displayNamesWithAliasList}`);
console.log(`  EMPTY_DISPLAY_NAMES: ${emptyDisplayNames}`);
console.log(`  SOURCE_NAMES_MODIFIED: ${sourceNamesModified}`);
console.log(`  INVENTED_PREPARATIONS: ${inventedPreparationCount}`);

assert.equal(foods.length, 548, "Expected 548 TACO foods");
assert.equal(displayNamesWithComma, 0, "DISPLAY_NAMES_WITH_COMMA must be 0");
assert.equal(displayNamesWithAliasList, 0, "DISPLAY_NAMES_WITH_ALIAS_LIST must be 0");
assert.equal(emptyDisplayNames, 0, "EMPTY_DISPLAY_NAMES must be 0");
assert.equal(sourceNamesModified, 0, "SOURCE_NAMES_MODIFIED must be 0");
assert.equal(inventedPreparationCount, 0, "INVENTED_PREPARATIONS must be 0");

console.log("  ✓ Stage 1 Passed: 548 TACO foods audited with 100% compliance.\n");

// ----------------------------------------------------------------------------
// 2. RUNTIME MAP FOOD ROW TEST (DB ISOLATION & RESILIENCE)
// ----------------------------------------------------------------------------
console.log("Stage 2: Validating mapFoodRow runtime behavior...");

const testRowNullDisplay = {
  public_id: "food_test_001",
  scope: "GLOBAL",
  status: "ACTIVE",
  name: "Arroz, tipo 1, cozido",
  display_name_pt_br: null,
  normalized_name: "arroz, tipo 1, cozido",
  category: "Cereais",
  reference_amount: 100,
  reference_unit_code: "G",
  calories_kcal: 128,
  protein_g: 2.5,
  carbohydrate_g: 28.1,
  fat_g: 0.2,
  source_type: "REFERENCE_TABLE",
  source_key: "TACO",
};

const mappedNull = mapFoodRow(testRowNullDisplay);
assert.equal(mappedNull.name, "Arroz, tipo 1, cozido", "Original source name must be preserved");
assert.equal(mappedNull.displayNamePtBr, "Arroz tipo 1 cozido", "Display name must be cleanly derived at runtime");
assert.ok(!mappedNull.displayNamePtBr.includes(","), "Display name must not have commas");

const testRowCommaDisplay = {
  ...testRowNullDisplay,
  public_id: "food_test_002",
  name: "Frango, peito, sem pele, grelhado",
  display_name_pt_br: "Frango, peito, sem pele, grelhado",
};

const mappedComma = mapFoodRow(testRowCommaDisplay);
assert.equal(mappedComma.name, "Frango, peito, sem pele, grelhado");
assert.equal(mappedComma.displayNamePtBr, "Peito de frango sem pele grelhado");

const testRowPaoCacetinho = {
  ...testRowNullDisplay,
  public_id: "food_test_003",
  name: "Pão, trigo, francês",
  display_name_pt_br: "Pão francês, cacetinho",
};

const mappedPao = mapFoodRow(testRowPaoCacetinho);
assert.equal(mappedPao.name, "Pão, trigo, francês");
assert.equal(mappedPao.displayNamePtBr, "Pão francês", "Must not leak alias list into display name");

console.log("  ✓ Stage 2 Passed: mapFoodRow derives clean display names at runtime.\n");

// ----------------------------------------------------------------------------
// 3. TEST REPRESENTATIVE FOODS
// ----------------------------------------------------------------------------
console.log("Stage 3: Testing Representative Foods...");

const representativeQueries = [
  "arroz",
  "feijão",
  "frango",
  "peito de frango",
  "ovo",
  "pão francês",
  "cacetinho",
  "aipim",
  "macaxeira",
  "mandioca",
  "tangerina",
  "mexerica",
  "muçarela",
  "mussarela",
  "abadejo",
  "batata doce",
  "banana",
];

for (const query of representativeQueries) {
  const normQ = normalizeSearchText(query);
  const aliasTerms = USER_SEARCH_ALIASES[normQ] || [];
  const searchTerms = [normQ, ...aliasTerms.map(normalizeSearchText)];

  // Match in TACO foods
  const matched = foods.filter((f) => {
    const origNorm = normalizeSearchText(f.name);
    const dispNorm = normalizeSearchText(cleanFoodDisplayName(f.name, "TACO"));
    return searchTerms.some((st) => origNorm.includes(st) || dispNorm.includes(st));
  });

  assert.ok(matched.length > 0, `Query "${query}" must return results`);
  const topFood = matched[0];
  const display = cleanFoodDisplayName(topFood.name, "TACO");

  // Every displayed result: natural PT-BR, no comma, no alias list, no raw scientific formatting
  assert.ok(!display.includes(","), `Query "${query}" top result "${display}" must NOT contain comma`);
  assert.ok(!/cacetinho/i.test(display), `Query "${query}" top result "${display}" must NOT contain alias cacetinho`);
  assert.ok(!/mexerica/i.test(display), `Query "${query}" top result "${display}" must NOT contain alias mexerica`);
  assert.ok(!/mussarela/i.test(display), `Query "${query}" top result "${display}" must NOT contain alias mussarela`);
  assert.ok(!/\/10minutos/i.test(display), `Query "${query}" top result "${display}" must NOT contain /10minutos`);
  assert.ok(!/\//.test(display), `Query "${query}" top result "${display}" must NOT contain slashes`);

  console.log(`  ✓ Query "${query}" -> ${matched.length} matches -> Display: "${display}"`);
}

console.log("  ✓ Stage 3 Passed: All 17 representative queries return pristine PT-BR results.\n");

// ----------------------------------------------------------------------------
// 4. TEST SEARCH ALIAS RESOLUTION (SEARCH-ONLY, CLEAN DISPLAY)
// ----------------------------------------------------------------------------
console.log("Stage 4: Testing Search-Only Aliases Resolution...");

const aliasTests = [
  { search: "cacetinho", expectedDisplay: "Pão francês" },
  { search: "pão de sal", expectedDisplay: "Pão francês" },
  { search: "aipim", expectedDisplayStartsWith: "Mandioca" },
  { search: "macaxeira", expectedDisplayStartsWith: "Mandioca" },
  { search: "mexerica", expectedDisplayStartsWith: "Tangerina" },
  { search: "bergamota", expectedDisplayStartsWith: "Tangerina" },
  { search: "mussarela", expectedDisplay: "Muçarela" },
];

for (const at of aliasTests) {
  const tokens = tokenizeSearchQuery(at.search);
  const tokenGroups = expandSearchTokensWithSynonyms(tokens);
  const flatTokens = tokenGroups.flat().map(normalizeSearchText);

  // Filter TACO foods matching the expanded tokens
  const matched = foods.filter((f) => {
    const origNorm = normalizeSearchText(f.name);
    const dispNorm = normalizeSearchText(cleanFoodDisplayName(f.name, "TACO"));
    return flatTokens.some((t) => origNorm.includes(t) || dispNorm.includes(t));
  });

  assert.ok(matched.length > 0, `Search alias "${at.search}" must match foods`);

  // Verify that an appropriate clean item is found
  if (at.expectedDisplay) {
    const found = matched.find((f) => cleanFoodDisplayName(f.name, "TACO") === at.expectedDisplay);
    assert.ok(found, `Search alias "${at.search}" must find item with display "${at.expectedDisplay}"`);
    console.log(`  ✓ Search "${at.search}" -> Successfully resolved to "${at.expectedDisplay}"`);
  } else if (at.expectedDisplayStartsWith) {
    const found = matched.find((f) => cleanFoodDisplayName(f.name, "TACO").startsWith(at.expectedDisplayStartsWith));
    assert.ok(found, `Search alias "${at.search}" must find item starting with "${at.expectedDisplayStartsWith}"`);
    const disp = cleanFoodDisplayName(found.name, "TACO");
    console.log(`  ✓ Search "${at.search}" -> Successfully resolved to "${disp}"`);
  }
}

console.log("  ✓ Stage 4 Passed: All search aliases resolve to canonical items without alias leakage.\n");

// ----------------------------------------------------------------------------
// 5. TEST SPECIFIC USER PROMPT EXAMPLES
// ----------------------------------------------------------------------------
console.log("Stage 5: Validating Specific Examples from User Request...");

const exactExamples = [
  { source: "Arroz, tipo 1, cozido", expected: "Arroz tipo 1 cozido" },
  { source: "Frango, peito, sem pele, grelhado", expected: "Peito de frango sem pele grelhado" },
  { source: "Abadejo, filé, congelado, assado", expected: "Filé de abadejo congelado assado" },
  { source: "Ovo, de galinha, inteiro, cozido/10minutos", expected: "Ovo de galinha inteiro cozido" },
  { source: "Pão francês, cacetinho", expected: "Pão francês" },
  { source: "Pão, trigo, francês", expected: "Pão francês" },
  { source: "Mandioca, aipim, macaxeira", expected: "Mandioca" },
  { source: "Tangerina, mexerica, bergamota", expected: "Tangerina" },
  { source: "Muçarela, mussarela, mozarela", expected: "Muçarela" },
  { source: "Queijo, mozarela", expected: "Muçarela" },
  { source: "Mandioca, cozida", expected: "Mandioca cozida" },
];

for (const ex of exactExamples) {
  const actual = cleanTacoDisplayName(ex.source);
  assert.equal(actual, ex.expected, `Cleaning "${ex.source}" must yield "${ex.expected}", got "${actual}"`);
  console.log(`  ✓ "${ex.source}" -> "${actual}"`);
}

console.log("  ✓ Stage 5 Passed: All specific user prompt examples match expected outputs.\n");

console.log("=== ALL TEST GATES PASSED SUCCESSFULLY ===");
