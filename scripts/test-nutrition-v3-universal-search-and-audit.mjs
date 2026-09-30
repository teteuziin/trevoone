/**
 * TREVO ONE — FOOD LIBRARY V3
 * UNIVERSAL SEARCH ENGINE & COMPLETE NUTRITIONAL CATALOG AUDIT
 *
 * Parameterized testing suite:
 * - Lemmatizer & De-pluralization
 * - Semantic Concept Resolution
 * - Preparation-Aware & Attribute-Aware Search
 * - Word Order Independence & Hyphen/Accent Tolerance
 * - Negative Preparation Isolation Tests
 * - Deep Catalog Audit & Classification (Complete, Partial, Unknown, Suspicious, Invalid)
 * - Traceability & Source Sample Recalculation (50%, 100%, 150%, 200%)
 */

import { register } from "node:module";
register("./ts-loader.mjs", import.meta.url);

import assert from "node:assert/strict";
import fs from "node:fs";
import mysql from "mysql2/promise";

const env = {};
if (fs.existsSync(".env.local")) {
  fs.readFileSync(".env.local", "utf8").split("\n").forEach((l) => {
    const [k, ...v] = l.trim().split("=");
    if (k) env[k.trim()] = v.join("=").trim();
  });
}

const pool = mysql.createPool({
  host: env.DB_HOST,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  port: Number(env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 5,
});

const {
  normalizeSearchText,
  tokenizeSearchQuery,
  getPortugueseWordRoots,
  expandSearchTokensWithSynonyms,
  buildFoodSearchOrderClause,
  USER_SEARCH_ALIASES,
} = await import("../lib/nutrition-v2/food-search.ts");

const {
  buildSelectFoodsQuery,
} = await import("../lib/nutrition-v2/food-query-builder.ts");

const {
  calculateItemNutrients,
} = await import("../lib/nutrition-v2/nutrient-calculator.ts");

async function main() {
  console.log("==================================================================");
  console.log("TREVO ONE — FOOD LIBRARY V3: UNIVERSAL SEARCH & CATALOG AUDIT");
  console.log("==================================================================\n");

  // -------------------------------------------------------------------------
  // SECTION 1: LEMMATIZATION & DE-PLURALIZATION UNIT TESTS
  // -------------------------------------------------------------------------
  console.log("--- PART 1: PORTUGUESE LEMMATIZER & DE-PLURALIZER ---");

  const lemmatizerCases = [
    { input: "ovos", expectedRoots: ["ovos", "ovo"] },
    { input: "mexidos", expectedRoots: ["mexidos", "mexido", "mexida"] },
    { input: "feijoes", expectedRoots: ["feijoes", "feijao"] },
    { input: "paes", expectedRoots: ["paes", "pao"] },
    { input: "arrozes", expectedRoots: ["arrozes", "arroz"] },
    { input: "bananas", expectedRoots: ["bananas", "banana"] },
    { input: "amendoins", expectedRoots: ["amendoins", "amendoim"] },
    { input: "grelhadas", expectedRoots: ["grelhadas", "grelhada", "grelhado"] },
    { input: "cozidas", expectedRoots: ["cozidas", "cozida", "cozido"] },
    { input: "fritas", expectedRoots: ["fritas", "frita", "frito"] },
    { input: "cruas", expectedRoots: ["cruas", "crua", "cru"] },
    { input: "moidas", expectedRoots: ["moidas", "moida", "moido"] },
    { input: "desnatadas", expectedRoots: ["desnatadas", "desnatada", "desnatado"] },
  ];

  for (const tc of lemmatizerCases) {
    const roots = getPortugueseWordRoots(tc.input);
    for (const exp of tc.expectedRoots) {
      assert(
        roots.includes(exp),
        `Lemmatizer for "${tc.input}" must include root "${exp}", got: ${roots.join(", ")}`
      );
    }
  }
  console.log(`  ✓ All ${lemmatizerCases.length} lemmatization inflection cases passed!\n`);

  // -------------------------------------------------------------------------
  // SECTION 2: PARAMETERIZED UNIVERSAL SEARCH CASES
  // -------------------------------------------------------------------------
  console.log("--- PART 2: PARAMETERIZED UNIVERSAL SEARCH ON LIVE CATALOG ---");

  const searchTestCases = [
    // Regionalisms (Tubers & Roots)
    { query: "aipim", expectedWord: ["mandioca", "aipim"] },
    { query: "macaxeira", expectedWord: ["mandioca", "macaxeira"] },
    { query: "mandioca", expectedWord: "mandioca" },
    { query: "cassava", expectedWord: ["mandioca", "cassava"] },
    { query: "aipim cozido", expectedWord: ["mandioca", "aipim"], expectedPrep: "cozid" },
    { query: "aipim cru", expectedWord: ["mandioca", "aipim"], expectedPrep: "cru" },
    { query: "macaxeira cozida", expectedWord: ["mandioca", "macaxeira"], expectedPrep: "cozid" },
    { query: "mandioquinha", expectedWord: ["mandioquinha", "baroa"] },
    { query: "batata baroa", expectedWord: ["baroa", "mandioquinha"] },
    { query: "batata-baroa", expectedWord: ["baroa", "mandioquinha"] },

    // Regionalisms (Squash / Pumpkin)
    { query: "jerimum", expectedWord: ["jerimum", "abobora"] },
    { query: "abobora", expectedWord: ["abobora", "jerimum"] },
    { query: "jerimum cozido", expectedWord: ["abobora", "jerimum"], expectedPrep: "cozid" },

    // Regionalisms (Citrus)
    { query: "mexerica", expectedWord: ["mexerica", "tangerina", "bergamota"] },
    { query: "bergamota", expectedWord: ["bergamota", "tangerina", "mexerica"] },
    { query: "tangerina", expectedWord: ["tangerina", "mexerica", "bergamota"] },

    // Regionalisms (Breads)
    { query: "pao frances", expectedWord: ["pao frances", "frances"] },
    { query: "pao de sal", expectedWord: ["pao frances", "frances"] },
    { query: "cacetinho", expectedWord: ["pao frances", "frances"] },
    { query: "pao careca", expectedWord: ["pao frances", "frances"] },

    // Regionalisms (Beans & Corn)
    { query: "feijao fradinho", expectedWord: ["fradinho", "corda"] },
    { query: "feijao de corda", expectedWord: ["corda", "fradinho"] },
    { query: "milho verde", expectedWord: "milho" },
    { query: "cuscuz", expectedWord: "cuscuz" },
    { query: "flocao", expectedWord: "cuscuz" },

    // Plurals & Inflections
    { query: "ovos mexidos", expectedWord: "ovo", expectedPrep: "mexid" },
    { query: "feijoes cozidos", expectedWord: "feijao", expectedPrep: "cozid" },
    { query: "bananas pratas", expectedWord: "banana" },
    { query: "carnes moidas", expectedWord: ["moido", "moida", "carne"] },
    { query: "paes franceses", expectedWord: ["pao frances", "frances"] },

    // Preparations & Attributes
    { query: "frango grelhado", expectedWord: "frango", expectedPrep: "grelhad" },
    { query: "peito de frango grelhado", expectedWord: "peito de frango", expectedPrep: "grelhad" },
    { query: "frango frito", expectedWord: "frango", expectedPrep: "frit" },
    { query: "leite desnatado", expectedWord: "leite", expectedPrep: "desnatad" },
    { query: "leite integral", expectedWord: "leite", expectedPrep: "integral" },
    { query: "arroz integral cozido", expectedWord: "arroz integral", expectedPrep: "cozid" },
    { query: "arroz branco cozido", expectedWord: "arroz", expectedPrep: "cozid" },

    // Word Order Independence
    { query: "grelhado peito de frango", expectedWord: "peito de frango", expectedPrep: "grelhad" },
    { query: "cozida mandioca", expectedWord: "mandioca", expectedPrep: "cozid" },

    // Commercial / Branded Food
    { query: "whey growth", expectedWord: "whey" },
  ];

  let passedSearchCount = 0;

  for (const tc of searchTestCases) {
    const built = buildSelectFoodsQuery({ query: tc.query, source: 'ALL', pageSize: 5 }, null, { isUnified: true });
    const [rows] = await pool.query(built.fullSql, built.selectParams);

    assert(rows.length > 0, `Query "${tc.query}" must return at least 1 food result`);

    const topFood = rows[0];
    const topName = (topFood.display_name_pt_br || topFood.name || "").toLowerCase();
    const normalizedTop = normalizeSearchText(topName);

    const expWords = Array.isArray(tc.expectedWord) ? tc.expectedWord : [tc.expectedWord];
    const matchesExpected = expWords.some((w) => normalizedTop.includes(normalizeSearchText(w)));
    assert(
      matchesExpected,
      `Query "${tc.query}" expected one of [${expWords.join(", ")}], but top result was: "${topFood.display_name_pt_br || topFood.name}"`
    );

    if (tc.expectedPrep) {
      const expPreps = Array.isArray(tc.expectedPrep) ? tc.expectedPrep : [tc.expectedPrep];
      const matchesPrep = expPreps.some((p) => normalizedTop.includes(normalizeSearchText(p)));
      assert(
        matchesPrep,
        `Query "${tc.query}" expected preparation one of [${expPreps.join(", ")}], but top result was: "${topFood.display_name_pt_br || topFood.name}"`
      );
    }

    passedSearchCount++;
  }

  console.log(`  ✓ All ${passedSearchCount}/${searchTestCases.length} universal search test cases passed!\n`);

  // -------------------------------------------------------------------------
  // SECTION 3: NEGATIVE PREPARATION & ATTRIBUTE ISOLATION TESTS
  // -------------------------------------------------------------------------
  console.log("--- PART 3: NEGATIVE PREPARATION TESTS (NO CROSS-PREP MISMATCH) ---");

  const negativeTests = [
    { query: "mandioca crua", mustContain: "crua", mustNotContain: "cozida" },
    { query: "mandioca cozida", mustContain: "cozida", mustNotContain: "crua" },
    { query: "aipim cozido", mustContain: "cozida", mustNotContain: "crua" },
    { query: "aipim cru", mustContain: "crua", mustNotContain: "cozida" },
    { query: "frango grelhado", mustContain: "grelhado", mustNotContain: "frito" },
    { query: "frango frito", mustContain: "frit", mustNotContain: "grelhad" },
    { query: "leite desnatado", mustContain: "desnatado", mustNotContain: "integral" },
    { query: "leite integral", mustContain: "integral", mustNotContain: "desnatado" },
    { query: "arroz integral", mustContain: "integral", mustNotContain: "tipo 1" },
  ];

  for (const nt of negativeTests) {
    const built = buildSelectFoodsQuery({ query: nt.query, source: 'ALL', pageSize: 5 }, null, { isUnified: true });
    const [rows] = await pool.query(built.fullSql, built.selectParams);
    assert(rows.length > 0, `Negative test query "${nt.query}" must return results`);

    const topName = normalizeSearchText(rows[0].display_name_pt_br || rows[0].name);
    assert(
      topName.includes(normalizeSearchText(nt.mustContain)),
      `Query "${nt.query}" Top 1 must contain "${nt.mustContain}", got: "${rows[0].display_name_pt_br || rows[0].name}"`
    );
    assert(
      !topName.includes(normalizeSearchText(nt.mustNotContain)),
      `Query "${nt.query}" Top 1 must NOT contain "${nt.mustNotContain}", got: "${rows[0].display_name_pt_br || rows[0].name}"`
    );
  }
  console.log(`  ✓ All ${negativeTests.length} negative preparation tests passed!\n`);

  // -------------------------------------------------------------------------
  // SECTION 4: COMPLETE CATALOG NUTRITIONAL AUDIT & CLASSIFICATION
  // -------------------------------------------------------------------------
  console.log("--- PART 4: CATALOG NUTRITIONAL AUDIT & CLASSIFICATION ---");

  const [allFoods] = await pool.query(
    `SELECT id, public_id, name, display_name_pt_br, source_key, source_type, source_uid,
            reference_amount, reference_unit_code, calories_kcal, protein_g, carbohydrate_g, fat_g, fiber_g,
            data_quality
     FROM nutrition_v2_foods
     WHERE deleted_at IS NULL AND status = 'ACTIVE'`
  );

  const totalFoods = allFoods.length;

  let completeCount = 0;
  let partialValidCount = 0;
  let unknownCount = 0;
  let suspiciousCount = 0;
  let invalidCount = 0;

  const foodsWithoutMacrosList = [];
  const partialBreakdown = { "IBGE_POF_2008_2009": 0, "USDA_FOUNDATION": 0 };

  for (const f of allFoods) {
    const refAmt = Number(f.reference_amount);
    const refUnit = f.reference_unit_code ? String(f.reference_unit_code).trim().toUpperCase() : "";
    const kcal = f.calories_kcal != null ? Number(f.calories_kcal) : null;
    const p = f.protein_g != null ? Number(f.protein_g) : null;
    const c = f.carbohydrate_g != null ? Number(f.carbohydrate_g) : null;
    const g = f.fat_g != null ? Number(f.fat_g) : null;

    // Check INVALID
    if (!refAmt || Number.isNaN(refAmt) || refAmt <= 0 || !refUnit ||
        (kcal != null && kcal < 0) || (p != null && p < 0) || (c != null && c < 0) || (g != null && g < 0) ||
        Number.isNaN(kcal) || Number.isNaN(p) || Number.isNaN(c) || Number.isNaN(g)) {
      invalidCount++;
      continue;
    }

    // Check UNKNOWN (all 4 macros null)
    if (kcal == null && p == null && c == null && g == null) {
      unknownCount++;
      foodsWithoutMacrosList.push({
        publicId: f.public_id,
        name: f.name,
        source: f.source_key || f.source_type,
        cause: "Fonte original publicou apenas minerais/sódio sem dados de macronutrientes (legítimo UNKNOWN)",
      });
      continue;
    }

    // Check PARTIAL
    const isPartial = (kcal == null || p == null || c == null || g == null);
    if (isPartial) {
      partialValidCount++;
      const src = f.source_key || "OTHER";
      partialBreakdown[src] = (partialBreakdown[src] || 0) + 1;
      continue;
    }

    // Check SUSPICIOUS (Physical sanity + Atwater divergence)
    let isSuspicious = false;
    if (refAmt > 0 && (refUnit === "G" || refUnit === "ML")) {
      const f100 = 100 / refAmt;
      const sum100 = (p * f100) + (c * f100) + (g * f100);
      if (sum100 > 105) {
        isSuspicious = true;
      }
    }

    if (kcal >= 30) {
      const atwater = p * 4 + c * 4 + g * 9;
      const diff = Math.abs(kcal - atwater);
      if (diff > 50 && diff / kcal > 0.40) {
        isSuspicious = true;
      }
    }

    if (p === 0 && c === 0 && g === 0 && kcal > 50) {
      isSuspicious = true;
    }

    if (isSuspicious) {
      suspiciousCount++;
    } else {
      completeCount++;
    }
  }

  assert.equal(invalidCount, 0, "INVALID foods must be 0");
  assert.equal(unknownCount, 16, "Foods without macros must be 16");
  assert.equal(partialValidCount, 637, "Foods with partial macros must be 637");
  assert.equal(totalFoods, completeCount + partialValidCount + unknownCount + suspiciousCount + invalidCount);

  console.log(`  FOODS TOTAL:        ${totalFoods}`);
  console.log(`  COMPLETE:           ${completeCount}`);
  console.log(`  PARTIAL_VALID:      ${partialValidCount}`);
  console.log(`  UNKNOWN:            ${unknownCount}`);
  console.log(`  SUSPICIOUS:         ${suspiciousCount}`);
  console.log(`  INVALID:            ${invalidCount}`);
  console.log(`  FOODS WITHOUT MACROS: ${unknownCount}`);
  console.log(`  FOODS WITH PARTIAL:   ${partialValidCount}`);
  console.log(`  Partial causes: IBGE POF 2008-2009 (${partialBreakdown["IBGE_POF_2008_2009"]}) + USDA Foundation (${partialBreakdown["USDA_FOUNDATION"]})\n`);

  // -------------------------------------------------------------------------
  // SECTION 5: NUTRIENT SCALING ACROSS REPRESENTATIVE SOURCES (50%, 100%, 150%, 200%)
  // -------------------------------------------------------------------------
  console.log("--- PART 5: NUTRIENT QUANTITY RESCALING (50%, 100%, 150%, 200%) ---");

  // Representative source foods:
  // 1. TACO: Mandioca cozida (ID 124) -> 100g = 125 kcal, 1.0g P, 30.0g C, 0.3g G
  const tacoFood = allFoods.find((f) => f.source_key === "TACO" && f.name.includes("Mandioca, cozida"));
  assert(tacoFood, "TACO Mandioca cozida must exist in catalog");

  const scales = [0.5, 1.0, 1.5, 2.0];
  for (const factor of scales) {
    const qty = 100 * factor;
    const calc = calculateItemNutrients({
      food: {
        referenceAmount: Number(tacoFood.reference_amount),
        referenceUnitCode: tacoFood.reference_unit_code,
        caloriesKcal: Number(tacoFood.calories_kcal),
        proteinG: Number(tacoFood.protein_g),
        carbohydrateG: Number(tacoFood.carbohydrate_g),
        fatG: Number(tacoFood.fat_g),
        fiberG: tacoFood.fiber_g != null ? Number(tacoFood.fiber_g) : null,
      },
      prescribedQuantity: qty,
      prescribedUnitCode: "G",
    });

    assert.equal(calc.caloriesKcal, Math.round(Number(tacoFood.calories_kcal) * factor * 100) / 100);
    assert.equal(calc.proteinG, Math.round(Number(tacoFood.protein_g) * factor * 100) / 100);
    assert.equal(calc.carbohydrateG, Math.round(Number(tacoFood.carbohydrate_g) * factor * 100) / 100);
    assert.equal(calc.fatG, Math.round(Number(tacoFood.fat_g) * factor * 100) / 100);
  }
  console.log("  ✓ Strict mathematical proportionality verified across 50%, 100%, 150%, 200% prescriptions!\n");

  // -------------------------------------------------------------------------
  // SECTION 6: UNKNOWN != ZERO ENFORCEMENT
  // -------------------------------------------------------------------------
  console.log("--- PART 6: UNKNOWN != ZERO ENFORCEMENT ---");

  const partialFood = allFoods.find((f) => f.calories_kcal != null && f.carbohydrate_g == null);
  assert(partialFood, "A partial food with null carbs must exist");

  const partialCalc = calculateItemNutrients({
    food: {
      referenceAmount: Number(partialFood.reference_amount),
      referenceUnitCode: partialFood.reference_unit_code,
      caloriesKcal: Number(partialFood.calories_kcal),
      proteinG: partialFood.protein_g != null ? Number(partialFood.protein_g) : null,
      carbohydrateG: null, // UNKNOWN
      fatG: partialFood.fat_g != null ? Number(partialFood.fat_g) : null,
      fiberG: null,
    },
    prescribedQuantity: 150,
    prescribedUnitCode: "G",
  });

  assert.equal(partialCalc.carbohydrateG, null, "UNKNOWN carbs must remain null and NEVER become 0");
  console.log("  ✓ UNKNOWN != ZERO strictly preserved in nutrient calculations!\n");

  console.log("==================================================================");
  console.log("FOOD LIBRARY V3: ALL TESTS AND AUDIT INVARIANTS PASSED 100%!");
  console.log("==================================================================");
}

main()
  .catch((err) => {
    console.error("TEST FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
