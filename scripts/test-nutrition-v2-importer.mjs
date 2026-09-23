/**
 * TREVO ONE — NUTRITION PROFESSIONAL V2
 * RELEASE A: USDA IMPORTER & PROVENANCE TEST SUITE
 *
 * Verifies all 14+ required behaviors:
 * 1. Foundation fiber > 0
 * 2. Foundation fiber = 0
 * 3. Foundation fiber missing -> NULL
 * 4. FNDDS fiber > 0
 * 5. FNDDS fiber = 0
 * 6. FNDDS fiber missing -> NULL
 * 7. data_quality Foundation (ANALYTICAL_GOLD)
 * 8. data_quality FNDDS (SURVEY_RECIPE)
 * 9. source_uid unchanged and exact
 * 10. source_version matches dataset
 * 11. re-run idempotency (toInsert = 0, toUpdate = 0, unchanged = N)
 * 12. existing food update on change (e.g. fiber backfill or data_quality backfill)
 * 13. new food insert
 * 14. removed/obsolete handling (inactivate + preserve last-known version)
 * 15. unknown nutrient semantics (0 != null; missing -> NULL, never 0)
 */

import assert from "node:assert/strict";
import {
  extractMacros,
  prepareFoodRecords,
  reconcilePlannedWithExisting,
  SOURCE_KEY_FOUNDATION,
  SOURCE_KEY_FNDDS,
  SOURCE_VERSION_FOUNDATION,
  SOURCE_VERSION_FNDDS,
} from "./import-nutrition-v2-usda.mjs";

console.log("=== INICIANDO SUÍTE DE TESTES: USDA IMPORTER V2 (RELEASE A) ===");

let passedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${name}:`, err);
    throw err;
  }
}

// ============================================================================
// 1. FIBER & UNKNOWN NUTRIENT SEMANTICS (FOUNDATION)
// ============================================================================

runTest("1. Foundation fiber > 0", () => {
  const nutrients = [
    { nutrient: { number: "208" }, amount: 250 },
    { nutrient: { number: "203" }, amount: 10 },
    { nutrient: { number: "205" }, amount: 40 },
    { nutrient: { number: "204" }, amount: 5 },
    { nutrient: { number: "291" }, amount: 6.5 }, // Fiber, total dietary
  ];
  const macros = extractMacros(nutrients, true);
  assert.equal(macros.fiber, 6.5);
  assert.equal(macros.calories, 250);
});

runTest("2. Foundation fiber = 0 (explicit zero preserved)", () => {
  const nutrients = [
    { nutrient: { number: "208" }, amount: 120 },
    { nutrient: { number: "203" }, amount: 25 },
    { nutrient: { number: "205" }, amount: 0 },
    { nutrient: { number: "204" }, amount: 2 },
    { nutrient: { number: "291" }, amount: 0 }, // Explicit zero
  ];
  const macros = extractMacros(nutrients, true);
  assert.strictEqual(macros.fiber, 0);
  assert.notStrictEqual(macros.fiber, null);
});

runTest("3. Foundation fiber missing -> NULL (never coerced to 0)", () => {
  const nutrients = [
    { nutrient: { number: "208" }, amount: 150 },
    { nutrient: { number: "203" }, amount: 20 },
    { nutrient: { number: "205" }, amount: 10 },
    { nutrient: { number: "204" }, amount: 3 },
    // Nutrient 291 is omitted
  ];
  const macros = extractMacros(nutrients, true);
  assert.strictEqual(macros.fiber, null);
  assert.notStrictEqual(macros.fiber, 0);
});

// ============================================================================
// 2. FIBER & UNKNOWN NUTRIENT SEMANTICS (FNDDS)
// ============================================================================

runTest("4. FNDDS fiber > 0", () => {
  const nutrients = [
    { nutrient: { number: "208" }, amount: 180 },
    { nutrient: { number: "203" }, amount: 8 },
    { nutrient: { number: "205" }, amount: 30 },
    { nutrient: { number: "204" }, amount: 2 },
    { nutrient: { number: "291" }, amount: 3.2 },
  ];
  const macros = extractMacros(nutrients, false);
  assert.equal(macros.fiber, 3.2);
});

runTest("5. FNDDS fiber = 0 (explicit zero preserved)", () => {
  const nutrients = [
    { nutrient: { number: "208" }, amount: 60 },
    { nutrient: { number: "203" }, amount: 3.5 },
    { nutrient: { number: "205" }, amount: 4.8 },
    { nutrient: { number: "204" }, amount: 3.2 },
    { nutrient: { number: "291" }, amount: 0 },
  ];
  const macros = extractMacros(nutrients, false);
  assert.strictEqual(macros.fiber, 0);
  assert.notStrictEqual(macros.fiber, null);
});

runTest("6. FNDDS fiber missing -> NULL (never coerced to 0)", () => {
  const nutrients = [
    { nutrient: { number: "208" }, amount: 80 },
    { nutrient: { number: "203" }, amount: 1.5 },
    { nutrient: { number: "205" }, amount: 7.2 },
    { nutrient: { number: "204" }, amount: 4.5 },
  ];
  const macros = extractMacros(nutrients, false);
  assert.strictEqual(macros.fiber, null);
  assert.notStrictEqual(macros.fiber, 0);
});

// ============================================================================
// 3. PROVENANCE & DATA QUALITY (PREPARE FOOD RECORDS)
// ============================================================================

runTest("7. data_quality Foundation = ANALYTICAL_GOLD", () => {
  const rawItems = [
    {
      fdcId: 1001,
      description: "Apples, raw, gala",
      foodNutrients: [
        { nutrient: { number: "208" }, amount: 52 },
        { nutrient: { number: "203" }, amount: 0.3 },
        { nutrient: { number: "205" }, amount: 14 },
        { nutrient: { number: "204" }, amount: 0.2 },
        { nutrient: { number: "291" }, amount: 2.4 },
      ],
      foodCategory: { description: "Fruits and Fruit Juices" },
    },
  ];
  const result = prepareFoodRecords(rawItems, "foundation");
  assert.equal(result.records.length, 1);
  const food = result.records[0];
  assert.equal(food.dataQuality, "ANALYTICAL_GOLD");
  assert.equal(food.sourceKey, SOURCE_KEY_FOUNDATION);
  assert.equal(food.sourceVersion, SOURCE_VERSION_FOUNDATION);
  assert.equal(food.sourceUid, "USDA:FOUNDATION:1001");
  assert.equal(food.fiberG, 2.4);
});

runTest("8. data_quality FNDDS = SURVEY_RECIPE", () => {
  const rawItems = [
    {
      fdcId: 2001,
      description: "Egg, whole, boiled",
      foodNutrients: [
        { nutrient: { number: "208" }, amount: 155 },
        { nutrient: { number: "203" }, amount: 12.6 },
        { nutrient: { number: "205" }, amount: 1.1 },
        { nutrient: { number: "204" }, amount: 10.6 },
        { nutrient: { number: "291" }, amount: 0 },
      ],
      wweiaFoodCategory: { wweiaFoodCategoryDescription: "Eggs and omelets" },
    },
  ];
  const result = prepareFoodRecords(rawItems, "fndds");
  assert.equal(result.records.length, 1);
  const food = result.records[0];
  assert.equal(food.dataQuality, "SURVEY_RECIPE");
  assert.equal(food.sourceKey, SOURCE_KEY_FNDDS);
  assert.equal(food.sourceVersion, SOURCE_VERSION_FNDDS);
  assert.equal(food.sourceUid, "USDA:FNDDS:2001");
  assert.equal(food.fiberG, 0);
});

runTest("9. source_uid unchanged and exact format", () => {
  const foundation = prepareFoodRecords([{ fdcId: 325412, description: "Oats" }], "foundation");
  const fndds = prepareFoodRecords([{ fdcId: 2341255, description: "Oatmeal" }], "fndds");
  assert.equal(foundation.records[0].sourceUid, "USDA:FOUNDATION:325412");
  assert.equal(fndds.records[0].sourceUid, "USDA:FNDDS:2341255");
});

runTest("10. source_version matches exact release tag (not current date)", () => {
  assert.equal(SOURCE_VERSION_FOUNDATION, "Foundation 04/2026");
  assert.equal(SOURCE_VERSION_FNDDS, "FNDDS 2021-2023 (2024-10-31)");
});

// ============================================================================
// 4. RECONCILIATION, IDEMPOTENCY, UPDATES, INSERTS, OBSOLETES
// ============================================================================

runTest("11. Re-run idempotency (identical records -> toInsert: 0, toUpdate: 0, unchanged: 1)", () => {
  const planned = [
    {
      sourceUid: "USDA:FOUNDATION:1001",
      name: "Apples, raw, gala",
      displayNamePtBr: "Maca, crua, gala",
      category: "Frutas",
      sourceVersion: SOURCE_VERSION_FOUNDATION,
      caloriesKcal: 52,
      proteinG: 0.3,
      carbohydrateG: 14,
      fatG: 0.2,
      fiberG: 2.4,
      dataQuality: "ANALYTICAL_GOLD",
      status: "ACTIVE",
    },
  ];
  const existing = [
    {
      id: "uuid-1",
      public_id: "pub-1",
      source_uid: "USDA:FOUNDATION:1001",
      source_key: SOURCE_KEY_FOUNDATION,
      source_version: SOURCE_VERSION_FOUNDATION,
      name: "Apples, raw, gala",
      display_name_pt_br: "Maca, crua, gala",
      category: "Frutas",
      calories_kcal: 52,
      protein_g: 0.3,
      carbohydrate_g: 14,
      fat_g: 0.2,
      fiber_g: 2.4,
      data_quality: "ANALYTICAL_GOLD",
      status: "ACTIVE",
    },
  ];

  const res = reconcilePlannedWithExisting(planned, existing, [SOURCE_KEY_FOUNDATION], {
    hasFiber: true,
    hasDataQuality: true,
  });

  assert.equal(res.toInsert.length, 0, "Idempotent run must have 0 inserts");
  assert.equal(res.toUpdate.length, 0, "Idempotent run must have 0 updates");
  assert.equal(res.unchangedCount, 1, "Existing identical record must be marked unchanged");
  assert.equal(res.obsoleteToInactivate.length, 0);
});

runTest("12. Existing food update when fiber or data_quality is backfilled", () => {
  const planned = [
    {
      sourceUid: "USDA:FOUNDATION:1001",
      name: "Apples, raw, gala",
      displayNamePtBr: "Maca, crua, gala",
      category: "Frutas",
      sourceVersion: SOURCE_VERSION_FOUNDATION,
      caloriesKcal: 52,
      proteinG: 0.3,
      carbohydrateG: 14,
      fatG: 0.2,
      fiberG: 2.4, // Fiber now present
      dataQuality: "ANALYTICAL_GOLD", // Quality now classified
      status: "ACTIVE",
    },
  ];
  // DB record before migration backfill (fiber is null, data_quality is UNCLASSIFIED)
  const existing = [
    {
      id: "uuid-1",
      public_id: "pub-1",
      source_uid: "USDA:FOUNDATION:1001",
      source_key: SOURCE_KEY_FOUNDATION,
      source_version: SOURCE_VERSION_FOUNDATION,
      name: "Apples, raw, gala",
      display_name_pt_br: "Maca, crua, gala",
      category: "Frutas",
      calories_kcal: 52,
      protein_g: 0.3,
      carbohydrate_g: 14,
      fat_g: 0.2,
      fiber_g: null, // OLD: missing fiber
      data_quality: "UNCLASSIFIED", // OLD: unclassified
      status: "ACTIVE",
    },
  ];

  const res = reconcilePlannedWithExisting(planned, existing, [SOURCE_KEY_FOUNDATION], {
    hasFiber: true,
    hasDataQuality: true,
  });

  assert.equal(res.toInsert.length, 0);
  assert.equal(res.toUpdate.length, 1, "Must update record when fiber or quality differs");
  assert.equal(res.unchangedCount, 0);
});

runTest("13. New food insert (when sourceUid not in database)", () => {
  const planned = [
    {
      sourceUid: "USDA:FOUNDATION:9999",
      name: "Dragonfruit, fresh",
      displayNamePtBr: "Pitaya, fresca",
      category: "Frutas",
      sourceVersion: SOURCE_VERSION_FOUNDATION,
      caloriesKcal: 60,
      proteinG: 1.2,
      carbohydrateG: 13,
      fatG: 0.6,
      fiberG: 2.9,
      dataQuality: "ANALYTICAL_GOLD",
      status: "ACTIVE",
    },
  ];
  const existing = [];

  const res = reconcilePlannedWithExisting(planned, existing, [SOURCE_KEY_FOUNDATION], {
    hasFiber: true,
    hasDataQuality: true,
  });

  assert.equal(res.toInsert.length, 1, "Must insert new food");
  assert.equal(res.toUpdate.length, 0);
  assert.equal(res.unchangedCount, 0);
});

runTest("14. Removed / obsolete handling (inactivation without hard deletion)", () => {
  const planned = []; // No foods in new release
  const existing = [
    {
      id: "uuid-old-1",
      public_id: "pub-old-1",
      source_uid: "USDA:FOUNDATION:321358",
      source_key: SOURCE_KEY_FOUNDATION,
      source_version: "Foundation 2024-10-31",
      name: "Pork, fresh, loin, chop, bone-in",
      status: "ACTIVE",
    },
  ];

  const res = reconcilePlannedWithExisting(planned, existing, [SOURCE_KEY_FOUNDATION], {
    hasFiber: true,
    hasDataQuality: true,
  });

  assert.equal(res.obsoleteRows.length, 1);
  assert.equal(res.obsoleteToInactivate.length, 1, "Must detect obsolete food for inactivation");
});

runTest("15. Strict null vs zero nutrient semantics check", () => {
  const testItems = [
    {
      fdcId: 1,
      description: "Item with zero fiber",
      foodNutrients: [{ nutrient: { number: "291" }, amount: 0 }],
    },
    {
      fdcId: 2,
      description: "Item with missing fiber",
      foodNutrients: [{ nutrient: { number: "208" }, amount: 100 }],
    },
  ];
  const result = prepareFoodRecords(testItems, "foundation");
  assert.strictEqual(result.records[0].fiberG, 0, "Zero fiber must remain 0");
  assert.strictEqual(result.records[1].fiberG, null, "Missing fiber must remain null");
  assert.notStrictEqual(result.records[0].fiberG, result.records[1].fiberG, "0 !== null");
});

console.log(`\n=== TODOS OS ${passedTests} TESTES PASSARAM COM SUCESSO! ===`);
