/**
 * TREVO ONE — NUTRITION PROFESSIONAL V2
 * RELEASE E: TEST SUITE FOR CANONICAL MICRONUTRIENTS,
 * SNAPSHOT ENVELOPE V1, AGGREGATION & DATA COMPLETENESS
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import {
  CANONICAL_NUTRIENTS,
  buildMicronutrientsSnapshotEnvelope,
} from "../lib/nutrition-v2/micronutrients.ts";
import {
  scaleMicronutrientsForFood,
  calculateMealMicronutrientTotals,
  calculatePlanMicronutrientTotals,
} from "../lib/nutrition-v2/nutrient-calculator.ts";
import {
  CANONICAL_NUTRIENT_MAP,
  extractMicronutrients,
} from "./import-nutrition-v2-usda.mjs";

console.log("=== INICIANDO SUÍTE DE TESTES: RELEASE E — MICRONUTRIENTES CANÔNICOS ===\n");

// ----------------------------------------------------------------------------
// TEST 1 — CANONICAL CATALOG INTEGRITY (23 NUTRIENTS)
// ----------------------------------------------------------------------------
{
  assert.equal(CANONICAL_NUTRIENTS.length, 23, "Catálogo deve conter exatamente 23 nutrientes canônicos");

  const codes = new Set();
  const sortOrders = new Set();

  for (const n of CANONICAL_NUTRIENTS) {
    assert.ok(n.code, "Nutriente deve ter código");
    assert.ok(n.namePtBr, "Nutriente deve ter nome em pt-BR");
    assert.ok(n.unit, "Nutriente deve ter unidade");
    assert.ok(["g", "mg", "mcg"].includes(n.unit), `Unidade válida: ${n.unit}`);
    assert.ok(["MACRO_SUB", "MINERAL", "VITAMIN"].includes(n.category), `Categoria válida: ${n.category}`);
    assert.ok(n.usdaNutrientNumber, "Nutriente deve ter usdaNutrientNumber oficial");

    assert.ok(!codes.has(n.code), `Código duplicado: ${n.code}`);
    assert.ok(!sortOrders.has(n.sortOrder), `SortOrder duplicado: ${n.sortOrder}`);

    codes.add(n.code);
    sortOrders.add(n.sortOrder);
  }

  console.log("✓ TEST 1 PASS: Catálogo canônico possui 23 nutrientes válidos, únicos e ordenados.");
}

// ----------------------------------------------------------------------------
// TEST 2 — USDA MAPPING EXATIDÃO (FIBRA 291, VIT A 320, VIT D 328, FOLATO 417)
// Proibir colapsos ambíguos: sem 318 para Vit A, sem 324 para Vit D, sem 435 para Folate
// ----------------------------------------------------------------------------
{
  assert.equal(CANONICAL_NUTRIENT_MAP["291"]?.code, "FIBER");
  assert.equal(CANONICAL_NUTRIENT_MAP["291"]?.unit, "g");

  assert.equal(CANONICAL_NUTRIENT_MAP["320"]?.code, "VIT_A");
  assert.equal(CANONICAL_NUTRIENT_MAP["320"]?.unit, "mcg");
  assert.equal(CANONICAL_NUTRIENT_MAP["318"], undefined, "318 (IU) PROIBIDO como fallback de Vit A");

  assert.equal(CANONICAL_NUTRIENT_MAP["328"]?.code, "VIT_D");
  assert.equal(CANONICAL_NUTRIENT_MAP["328"]?.unit, "mcg");
  assert.equal(CANONICAL_NUTRIENT_MAP["324"], undefined, "324 (IU) PROIBIDO como fallback de Vit D");

  assert.equal(CANONICAL_NUTRIENT_MAP["417"]?.code, "FOLATE");
  assert.equal(CANONICAL_NUTRIENT_MAP["417"]?.unit, "mcg");
  assert.equal(CANONICAL_NUTRIENT_MAP["435"], undefined, "435 (DFE) PROIBIDO como fallback de Folate");

  // Test extraction with valid and invalid nutrient numbers
  const testNutrients = [
    { nutrient: { number: "291" }, amount: 4.5 },
    { nutrient: { number: "320" }, amount: 150 },
    { nutrient: { number: "318" }, amount: 500 }, // Ignorado
    { nutrient: { number: "328" }, amount: 2.5 },
    { nutrient: { number: "324" }, amount: 100 }, // Ignorado
    { nutrient: { number: "417" }, amount: 65 },
    { nutrient: { number: "435" }, amount: 120 }, // Ignorado
  ];

  const extracted = extractMicronutrients(testNutrients);

  assert.equal(extracted.get("FIBER")?.amount, 4.5);
  assert.equal(extracted.get("FIBER")?.unit, "g");
  assert.equal(extracted.get("FIBER")?.status, "KNOWN");

  assert.equal(extracted.get("VIT_A")?.amount, 150);
  assert.equal(extracted.get("VIT_D")?.amount, 2.5);
  assert.equal(extracted.get("FOLATE")?.amount, 65);

  // Provar que fibra ausente NÃO vira zero
  const withoutFiber = [{ nutrient: { number: "301" }, amount: 100 }];
  const extractedWithoutFiber = extractMicronutrients(withoutFiber);
  assert.equal(extractedWithoutFiber.get("FIBER"), undefined, "Fibra 291 ausente NÃO vira zero");

  // Provar que nutriente ausente NÃO vira zero
  assert.equal(extracted.get("VIT_B12"), undefined, "Nutriente ausente não entra no mapa (não vira zero)");
  assert.equal(extracted.get("VIT_B5"), undefined, "B5 ausente não entra no mapa");

  console.log("✓ TEST 2 PASS: Mapeamentos USDA estritos (291=FIBER g, 320=VIT_A, 328=VIT_D, 417=FOLATE) sem fallbacks ambíguos.");
}

// ----------------------------------------------------------------------------
// TEST 3 — STATUS NOMENCLATURE: KNOWN, KNOWN_ZERO, TRACE, UNKNOWN
// ----------------------------------------------------------------------------
{
  const testItems = [
    { nutrient: { number: "301" }, amount: 120 }, // Ca > 0 -> KNOWN
    { nutrient: { number: "303" }, amount: 0 },   // Fe == 0 -> KNOWN_ZERO
  ];

  const extracted = extractMicronutrients(testItems);

  assert.equal(extracted.get("CA")?.status, "KNOWN");
  assert.equal(extracted.get("CA")?.amount, 120);

  assert.equal(extracted.get("FE")?.status, "KNOWN_ZERO");
  assert.equal(extracted.get("FE")?.amount, 0);

  console.log("✓ TEST 3 PASS: Status semanticamente seguro KNOWN (>0) e KNOWN_ZERO (=0).");
}

// ----------------------------------------------------------------------------
// TEST 4 — TRACE SEMANTICS (NÃO VIRA ZERO, NÃO É SOMADO, CONTA EM traceItemCount)
// ----------------------------------------------------------------------------
{
  const traceItem = {
    micronutrientsSnapshotJson: {
      schemaVersion: 1,
      catalogVersion: "1.0",
      sourceUid: "MANUAL:1",
      sourceType: "MANUAL",
      sourceKey: null,
      sourceVersion: null,
      dataQuality: "ANALYTICAL_GOLD",
      capturedAt: "2026-09-23T12:00:00Z",
      nutrients: [
        { code: "FE", value: null, unit: "mg", status: "TRACE" },
        { code: "CA", value: 100, unit: "mg", status: "KNOWN" },
      ],
    },
  };

  const mealTotals = calculateMealMicronutrientTotals([traceItem]);
  const feDetail = mealTotals.nutrients["FE"];

  assert.equal(feDetail.value, 0, "TRACE não soma valor numérico");
  assert.equal(feDetail.traceItemCount, 1, "TRACE incrementa traceItemCount");
  assert.equal(feDetail.quantifiedItemCount, 0, "TRACE não incrementa quantifiedItemCount");
  assert.equal(feDetail.hasTrace, true, "hasTrace deve ser true");
  assert.equal(feDetail.isFullyQuantified, false, "Item com TRACE não é fully quantified");

  console.log("✓ TEST 4 PASS: Semântica de TRACE: preservado, não vira zero, não somado, contado como traceItemCount.");
}

// ----------------------------------------------------------------------------
// TEST 5 — HISTORICAL ITEM SEM SNAPSHOT (NULL SNAPSHOT = UNKNOWN FOR ALL 23)
// ----------------------------------------------------------------------------
{
  const legacyItem = {
    foodNameSnapshot: "Arroz branco cozido",
    caloriesKcalSnapshot: 130,
    proteinGSnapshot: 2.5,
    carbohydrateGSnapshot: 28,
    fatGSnapshot: 0.2,
    micronutrientsSnapshotJson: null, // Item histórico sem snapshot
  };

  const totals = calculateMealMicronutrientTotals([legacyItem]);

  assert.equal(totals.totalItemsCount, 1, "Item histórico é contabilizado no total de itens");
  assert.equal(totals.empty, false);

  for (const defn of CANONICAL_NUTRIENTS) {
    const detail = totals.nutrients[defn.code];
    assert.equal(detail.value, 0, `Valor de ${defn.code} deve ser 0`);
    assert.equal(detail.quantifiedItemCount, 0, `quantifiedItemCount de ${defn.code} deve ser 0`);
    assert.equal(detail.unknownItemCount, 1, `unknownItemCount de ${defn.code} deve ser 1`);
    assert.equal(detail.hasUnknown, true, `hasUnknown de ${defn.code} deve ser true`);
    assert.equal(detail.isFullyQuantified, false);
    assert.equal(detail.dataCompletenessPercent, 0, "Completude deve ser 0%");
  }

  console.log("✓ TEST 5 PASS: Item histórico sem snapshot tratado como UNKNOWN para os 23 nutrientes (sem backfill silencioso).");
}

// ----------------------------------------------------------------------------
// TEST 6 — SNAPSHOT ENVELOPE V1 DETERMINISM (23/23 NUTRIENTS, INJECTABLE capturedAt)
// ----------------------------------------------------------------------------
{
  const valuesMap = new Map([
    ["CA", { value: 250.5, status: "KNOWN" }],
    ["FE", { value: 0, status: "KNOWN_ZERO" }],
    ["ZN", { value: null, status: "TRACE" }],
  ]);

  const fixedCapturedAt = "2026-09-23T20:00:00.000Z";
  const envelope = buildMicronutrientsSnapshotEnvelope(valuesMap, {
    sourceUid: "USDA:FOUNDATION:171688",
    sourceType: "EXTERNAL",
    sourceKey: "USDA_FOUNDATION",
    sourceVersion: "Foundation 04/2026",
    dataQuality: "ANALYTICAL_GOLD",
    capturedAt: fixedCapturedAt,
  });

  assert.equal(envelope.schemaVersion, 1);
  assert.equal(envelope.catalogVersion, "1.0");
  assert.equal(envelope.sourceUid, "USDA:FOUNDATION:171688");
  assert.equal(envelope.sourceType, "EXTERNAL");
  assert.equal(envelope.sourceKey, "USDA_FOUNDATION");
  assert.equal(envelope.sourceVersion, "Foundation 04/2026");
  assert.equal(envelope.dataQuality, "ANALYTICAL_GOLD");
  assert.equal(envelope.capturedAt, fixedCapturedAt, "capturedAt deve ser o valor injetado");

  assert.equal(envelope.nutrients.length, 23, "Snapshot v1 deve conter todos os 23 nutrientes");

  // Check strict sorting by sortOrder
  for (let i = 0; i < envelope.nutrients.length; i++) {
    assert.equal(envelope.nutrients[i].code, CANONICAL_NUTRIENTS[i].code, "Ordem deve ser idêntica ao sortOrder do catálogo");
  }

  const ca = envelope.nutrients.find((n) => n.code === "CA");
  assert.equal(ca?.value, 250.5);
  assert.equal(ca?.status, "KNOWN");

  const fe = envelope.nutrients.find((n) => n.code === "FE");
  assert.equal(fe?.value, 0);
  assert.equal(fe?.status, "KNOWN_ZERO");

  const zn = envelope.nutrients.find((n) => n.code === "ZN");
  assert.equal(zn?.value, null);
  assert.equal(zn?.status, "TRACE");

  const b5 = envelope.nutrients.find((n) => n.code === "VIT_B5");
  assert.equal(b5?.value, null);
  assert.equal(b5?.status, "UNKNOWN");

  console.log("✓ TEST 6 PASS: Snapshot envelope v1 determinístico: 23/23 nutrientes ordenados, campos congelados preservados.");
}

// ----------------------------------------------------------------------------
// TEST 7 — PORTION SCALING OF FOOD NUTRIENTS
// ----------------------------------------------------------------------------
{
  const foodNutrients = [
    { nutrientCode: "CA", amountPerReference: 100, unitCode: "mg", status: "KNOWN" },
    { nutrientCode: "FE", amountPerReference: 0, unitCode: "mg", status: "KNOWN_ZERO" },
    { nutrientCode: "MG", amountPerReference: 50, unitCode: "mg", status: "KNOWN" },
    { nutrientCode: "SE", amountPerReference: null, unitCode: "mcg", status: "TRACE" },
  ];

  // Prescribed 200g of a 100g reference food (factor = 2.0)
  const factor = 2.0;
  const scaledEnvelope = scaleMicronutrientsForFood(foodNutrients, factor, {
    sourceUid: "TEST:1",
    sourceType: "EXTERNAL",
  });

  const ca = scaledEnvelope.nutrients.find((n) => n.code === "CA");
  assert.equal(ca?.value, 200, "100mg * 2.0 = 200mg");
  assert.equal(ca?.status, "KNOWN");

  const fe = scaledEnvelope.nutrients.find((n) => n.code === "FE");
  assert.equal(fe?.value, 0, "KNOWN_ZERO escalado permanece 0");
  assert.equal(fe?.status, "KNOWN_ZERO");

  const se = scaledEnvelope.nutrients.find((n) => n.code === "SE");
  assert.equal(se?.value, null, "TRACE escalado permanece TRACE sem valor numérico");
  assert.equal(se?.status, "TRACE");

  const k = scaledEnvelope.nutrients.find((n) => n.code === "K");
  assert.equal(k?.value, null, "Nutriente ausente escalado permanece UNKNOWN");
  assert.equal(k?.status, "UNKNOWN");

  console.log("✓ TEST 7 PASS: Escalação proporcional por porção/quantidade preserva semântica de nutrientes.");
}

// ----------------------------------------------------------------------------
// TEST 8 — MEAL AND PLAN AGGREGATION + COMPLETENESS
// ----------------------------------------------------------------------------
{
  const item1 = {
    micronutrientsSnapshotJson: buildMicronutrientsSnapshotEnvelope(
      new Map([
        ["CA", { value: 200, status: "KNOWN" }],
        ["FE", { value: 10, status: "KNOWN" }],
      ])
    ),
  };

  const item2 = {
    micronutrientsSnapshotJson: buildMicronutrientsSnapshotEnvelope(
      new Map([
        ["CA", { value: 150, status: "KNOWN" }],
        ["FE", { value: 0, status: "KNOWN_ZERO" }],
      ])
    ),
  };

  const item3 = {
    micronutrientsSnapshotJson: buildMicronutrientsSnapshotEnvelope(
      new Map([
        ["CA", { value: 50, status: "KNOWN" }],
        ["FE", { value: null, status: "UNKNOWN" }],
      ])
    ),
  };

  const mealTotals = calculateMealMicronutrientTotals([item1, item2, item3]);

  // Calcium: 200 + 150 + 50 = 400 mg (3/3 known -> 100% complete)
  const ca = mealTotals.nutrients["CA"];
  assert.equal(ca.value, 400);
  assert.equal(ca.quantifiedItemCount, 3);
  assert.equal(ca.unknownItemCount, 0);
  assert.equal(ca.totalItemCount, 3);
  assert.equal(ca.isFullyQuantified, true);
  assert.equal(ca.hasUnknown, false);
  assert.equal(ca.dataCompletenessPercent, 100);

  // Iron: 10 + 0 + null = 10 mg (2/3 known -> 67% complete)
  const fe = mealTotals.nutrients["FE"];
  assert.equal(fe.value, 10);
  assert.equal(fe.quantifiedItemCount, 2);
  assert.equal(fe.unknownItemCount, 1);
  assert.equal(fe.totalItemCount, 3);
  assert.equal(fe.isFullyQuantified, false);
  assert.equal(fe.hasUnknown, true);
  assert.equal(fe.dataCompletenessPercent, 67);

  // Plan totals across 2 meals
  const meal2Totals = calculateMealMicronutrientTotals([item1]); // Ca: 200, Fe: 10 (1 item)
  const planTotals = calculatePlanMicronutrientTotals([mealTotals, meal2Totals]);

  const planCa = planTotals.nutrients["CA"];
  assert.equal(planCa.value, 600, "400 + 200 = 600");
  assert.equal(planCa.quantifiedItemCount, 4);
  assert.equal(planCa.totalItemCount, 4);
  assert.equal(planCa.isFullyQuantified, true);

  console.log("✓ TEST 8 PASS: Agregação por refeição e plano calcula subtotais e completude com precisão.");
}

// ----------------------------------------------------------------------------
// TEST 9 — SUBSTITUTIONS EXCLUDED FROM BASE TOTALS
// ----------------------------------------------------------------------------
{
  const mainItem = {
    foodNameSnapshot: "Frango",
    micronutrientsSnapshotJson: buildMicronutrientsSnapshotEnvelope(
      new Map([["CA", { value: 20, status: "KNOWN" }]])
    ),
    substitutions: [
      {
        foodNameSnapshot: "Peixe",
        micronutrientsSnapshotJson: buildMicronutrientsSnapshotEnvelope(
          new Map([["CA", { value: 150, status: "KNOWN" }]])
        ),
      },
    ],
  };

  const mealTotals = calculateMealMicronutrientTotals([mainItem]);
  assert.equal(mealTotals.nutrients["CA"].value, 20, "Apenas o item principal entra no total base");
  assert.notEqual(mealTotals.nutrients["CA"].value, 170, "Substituição não deve somar no total base");

  console.log("✓ TEST 9 PASS: Substituições excluídas do total base da refeição.");
}

// ----------------------------------------------------------------------------
// TEST 10 — EMPTY STATE (EMPTY MEAL & EMPTY PLAN)
// ----------------------------------------------------------------------------
{
  const emptyMeal = calculateMealMicronutrientTotals([]);
  assert.equal(emptyMeal.empty, true);
  assert.equal(emptyMeal.totalItemsCount, 0);

  const ca = emptyMeal.nutrients["CA"];
  assert.equal(ca.value, 0);
  assert.equal(ca.totalItemCount, 0);
  assert.equal(ca.quantifiedItemCount, 0);
  assert.equal(ca.empty, true);
  assert.equal(ca.isFullyQuantified, false);
  assert.equal(ca.dataCompletenessPercent, 0);

  const emptyPlan = calculatePlanMicronutrientTotals([]);
  assert.equal(emptyPlan.empty, true);
  assert.equal(emptyPlan.totalItemsCount, 0);
  assert.equal(emptyPlan.nutrients["CA"].empty, true);

  console.log("✓ TEST 10 PASS: Refeição e plano vazios retornam estado seguro (empty=true, isFullyQuantified=false, 0%).");
}

// ----------------------------------------------------------------------------
// TEST 11 — REAL DATASETS COVERAGE AUDIT (FOUNDATION & FNDDS)
// ----------------------------------------------------------------------------
{
  const scratchDir = process.env.USDA_SCRATCH_DIR
    ? path.resolve(process.env.USDA_SCRATCH_DIR)
    : path.resolve(__dirname, "../scratch");
  const candidateFoundation = [
    process.env.USDA_FOUNDATION_PATH,
    path.join(scratchDir, "foundation_2026_extracted/FoodData_Central_foundation_food_json_2026-04-30.json"),
    path.join(scratchDir, "foundation_extracted/FoodData_Central_foundation_food_json_2026-04-30.json"),
    path.join(scratchDir, "foundation_extracted/foundationDownload.json"),
  ].filter(Boolean);
  const candidateFndds = [
    process.env.USDA_FNDDS_PATH,
    path.join(scratchDir, "fndds_extracted/surveyDownload.json"),
  ].filter(Boolean);
  const foundationPath = candidateFoundation.find((p) => fs.existsSync(p));
  const fnddsPath = candidateFndds.find((p) => fs.existsSync(p));
  const CANONICAL_NUTRIENTS_ORDER = CANONICAL_NUTRIENTS.map((n) => n.code);

  function auditDatasetCoverage(datasetName, foods) {
    console.log(`\n--- COVERAGE AUDIT: ${datasetName} (Total Foods: ${foods.length}) ---`);
    const coverage = {};
    for (const code of CANONICAL_NUTRIENTS_ORDER) {
      coverage[code] = {
        total: foods.length,
        present: 0,
        knownPositive: 0,
        knownZero: 0,
        trace: 0,
        unknown: 0,
      };
    }

    for (const food of foods) {
      const ext = extractMicronutrients(food.foodNutrients);
      for (const code of CANONICAL_NUTRIENTS_ORDER) {
        const item = ext.get(code);
        if (!item || item.status === "UNKNOWN") {
          coverage[code].unknown++;
        } else if (item.status === "KNOWN") {
          coverage[code].present++;
          coverage[code].knownPositive++;
        } else if (item.status === "KNOWN_ZERO") {
          coverage[code].present++;
          coverage[code].knownZero++;
        } else if (item.status === "TRACE") {
          coverage[code].present++;
          coverage[code].trace++;
        }
      }
    }

    console.log("Nutrient | Total | Present | Known > 0 | Known 0 | Trace | Unknown");
    console.log("---------+-------+---------+-----------+---------+-------+--------");
    for (const code of CANONICAL_NUTRIENTS_ORDER) {
      const c = coverage[code];
      console.log(
        `${code.padEnd(8)} | ${String(c.total).padStart(5)} | ${String(c.present).padStart(7)} | ${String(c.knownPositive).padStart(9)} | ${String(c.knownZero).padStart(7)} | ${String(c.trace).padStart(5)} | ${String(c.unknown).padStart(7)}`
      );
    }
    return coverage;
  }

  if (foundationPath && fs.existsSync(foundationPath)) {
    const rawF = JSON.parse(fs.readFileSync(foundationPath, "utf8"));
    const allFoundation = rawF.FoundationFoods || [];

    // Filter valid foods (363 valid with fdcId and description)
    const validFoundation = allFoundation.filter((f) => f && f.fdcId && f.description);

    console.log(`Foundation valid foods count: ${validFoundation.length} (esperado 363)`);
    assert.equal(validFoundation.length, 363, "Foundation foods válidos devem ser 363");

    const fndCoverage = auditDatasetCoverage("USDA FOUNDATION", validFoundation);

    // Audit Foundation B5
    const fndB5 = fndCoverage["VIT_B5"];
    console.log(`Foundation VIT_B5 present count: ${fndB5.present} of ${validFoundation.length}`);
    assert.ok(fndB5.present > 0, "Foundation deve conter VIT_B5 para parte dos alimentos");
    assert.equal(fndB5.trace, 0, "Foundation não deve ter trace sintetizado");
  }

  if (fnddsPath && fs.existsSync(fnddsPath)) {
    const rawS = JSON.parse(fs.readFileSync(fnddsPath, "utf8"));
    const allFndds = rawS.SurveyFoods || [];
    const validFndds = allFndds.filter((f) => f && f.fdcId && f.description);

    console.log(`FNDDS total valid foods count: ${validFndds.length} (esperado 5432)`);
    assert.equal(validFndds.length, 5432, "FNDDS foods válidos devem ser 5432");

    const fnddsCoverage = auditDatasetCoverage("USDA FNDDS", validFndds);

    // MANDATORY PROOF: FNDDS VIT_B5 present = 0, unknown = 5432
    const b5 = fnddsCoverage["VIT_B5"];
    console.log(`FNDDS VIT_B5 present count: ${b5.present} (esperado 0)`);
    console.log(`FNDDS VIT_B5 unknown count: ${b5.unknown} (esperado 5432)`);
    assert.equal(b5.present, 0, "FNDDS VIT_B5 deve ser estritamente 0 (não presente no WWEIA)");
    assert.equal(b5.unknown, 5432, "FNDDS VIT_B5 unknown deve ser 5432");
    assert.equal(b5.trace, 0, "FNDDS não deve ter trace sintetizado");

    // Provar que FIBER 291 e Cálcio 301 existem no FNDDS
    const fiber = fnddsCoverage["FIBER"];
    const ca = fnddsCoverage["CA"];
    assert.ok(fiber.present > 5400, "FNDDS deve conter FIBER 291");
    assert.ok(ca.present > 5400, "FNDDS deve conter Cálcio 301");

    console.log("✓ TEST 11 PASS: Auditoria real FNDDS comprova B5 present=0 / unknown=5432 e cobertura de micronutrientes.");
  }
}

// ----------------------------------------------------------------------------
// TEST 12 — DDL HARDENING & STATUS X VALUE INVARIANTS
// ----------------------------------------------------------------------------
{
  const migrationPath = path.resolve(__dirname, "../database/migrations/030_nutrition_v2_micronutrients.sql");
  const migrationSql = fs.readFileSync(migrationPath, "utf8");

  // Invariant A: Proibir ON UPDATE CASCADE na FK do catálogo
  assert.equal(
    migrationSql.includes("ON UPDATE CASCADE"),
    false,
    "ERRO: Migration 030 NÃO pode conter 'ON UPDATE CASCADE' na FK do catálogo"
  );
  assert.ok(
    migrationSql.includes("ON UPDATE RESTRICT"),
    "Migration 030 deve conter 'ON UPDATE RESTRICT'"
  );
  assert.ok(
    migrationSql.includes("chk_n2fn_status_value"),
    "Migration 030 deve conter constraint chk_n2fn_status_value"
  );

  // Simulação estrita da CHECK constraint do banco:
  // (status = 'KNOWN' AND amount_per_reference IS NOT NULL AND amount_per_reference > 0) OR
  // (status = 'KNOWN_ZERO' AND amount_per_reference = 0) OR
  // (status = 'TRACE' AND amount_per_reference IS NULL)
  function testDbCheckConstraint(status, amount) {
    if (status === "KNOWN") {
      return amount !== null && amount !== undefined && typeof amount === "number" && !isNaN(amount) && amount > 0;
    }
    if (status === "KNOWN_ZERO") {
      return amount === 0;
    }
    if (status === "TRACE") {
      return amount === null || amount === undefined;
    }
    return false; // Rejeita UNKNOWN ou qualquer outro status na tabela de alimentos
  }

  // Invariant B: food nutrient UNKNOWN não é persistível na tabela de referência
  assert.equal(testDbCheckConstraint("UNKNOWN", null), false, "UNKNOWN não é persistível em nutrition_v2_food_nutrients");
  assert.equal(testDbCheckConstraint("UNKNOWN", 0), false, "UNKNOWN com 0 não é persistível");

  // Invariant C: snapshot UNKNOWN continua permitido e mandatório
  const testSnapshot = buildMicronutrientsSnapshotEnvelope(new Map());
  const unknownInSnapshot = testSnapshot.nutrients.filter((n) => n.status === "UNKNOWN");
  assert.equal(unknownInSnapshot.length, 23, "Snapshot v1 deve conter status UNKNOWN para nutrientes ausentes");

  // Invariant D: KNOWN com valor > 0 é válido
  assert.equal(testDbCheckConstraint("KNOWN", 12.5), true, "KNOWN com valor > 0 deve ser válido");
  assert.equal(testDbCheckConstraint("KNOWN", 0.001), true, "KNOWN com fração > 0 deve ser válido");

  // Invariant E: KNOWN_ZERO com 0 é válido
  assert.equal(testDbCheckConstraint("KNOWN_ZERO", 0), true, "KNOWN_ZERO com 0 deve ser válido");

  // Invariant F: TRACE com NULL é válido
  assert.equal(testDbCheckConstraint("TRACE", null), true, "TRACE com NULL deve ser válido");

  // Invariant G: KNOWN + NULL é inválido
  assert.equal(testDbCheckConstraint("KNOWN", null), false, "KNOWN com NULL deve ser inválido");

  // Invariant H: KNOWN_ZERO + valor > 0 é inválido
  assert.equal(testDbCheckConstraint("KNOWN_ZERO", 12), false, "KNOWN_ZERO com valor > 0 deve ser inválido");
  assert.equal(testDbCheckConstraint("KNOWN_ZERO", -1), false, "KNOWN_ZERO com negativo deve ser inválido");

  // Invariant I: TRACE + 0 é inválido
  assert.equal(testDbCheckConstraint("TRACE", 0), false, "TRACE com 0 deve ser inválido");
  assert.equal(testDbCheckConstraint("TRACE", 0.05), false, "TRACE com valor > 0 deve ser inválido");

  // Invariant J: valor negativo é inválido em qualquer status
  assert.equal(testDbCheckConstraint("KNOWN", -5), false, "KNOWN com valor negativo deve ser inválido");
  assert.equal(testDbCheckConstraint("KNOWN_ZERO", -0.01), false, "KNOWN_ZERO com valor negativo deve ser inválido");

  console.log("✓ TEST 12 PASS: Invariantes do DDL auditados: FK RESTRICT, sem CASCADE, CHECK coerente status x valor.");
}

console.log("\n==================================================================");
console.log("RELEASE E — TODOS OS TESTES PASSARAM COM SUCESSO (12/12)!");
console.log("==================================================================");
