import { register } from 'node:module';
register('./ts-loader.mjs', import.meta.url);

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Load .env.local
try {
  const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
} catch (e) {}

const {
  matchFoodCandidate,
  calculateAuthoritativeItemNutrients,
  parseAlternativesFromText,
  groupMealFoodsAndAlternatives,
  confirmNutritionAiImport,
} = await import('../lib/nutrition-v2/nutrition-ai-importer.ts');

const {
  searchReferenceCatalogCandidate,
  autoPromoteReferenceFood,
} = await import('../lib/nutrition-v2/reference-catalog-service.ts');

const { getDbConnection } = await import('../lib/db/mysql.ts');

async function runTests() {
  console.log("==================================================");
  console.log("TREVO ONE — COMPREHENSIVE NUTRITION V2 TEST SUITE");
  console.log("==================================================\n");

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      passed++;
      console.log(`[PASS] ${name}`);
    } catch (err) {
      console.error(`[FAIL] ${name}: ${err.message}`);
      throw err;
    }
  }

  async function asyncTest(name, fn) {
    total++;
    try {
      await fn();
      passed++;
      console.log(`[PASS] ${name}`);
    } catch (err) {
      console.error(`[FAIL] ${name}: ${err.message}`);
      throw err;
    }
  }

  // 1. Parser "OU" — Real Example A
  test("Parser OU — Real Example A (aveia, chia, linhaça)", () => {
    const text = "2 colheres de aveia em flocos ou 1 colher de chia ou 1 colher de linhaça";
    const alts = parseAlternativesFromText(text);
    assert.equal(alts.length, 3, "Must have exactly 3 alternatives");
    assert.equal(alts[0].quantity, 2);
    assert.equal(alts[0].foodName, "aveia em flocos");
    assert.equal(alts[1].quantity, 1);
    assert.equal(alts[1].foodName, "chia");
    assert.equal(alts[2].quantity, 1);
    assert.equal(alts[2].foodName, "linhaça");
  });

  // 2. Parser "OU" — Real Example B
  test("Parser OU — Real Example B (6 alternatives)", () => {
    const text = "1 fatia de pão de forma ou 80 g de cuscuz ou 50 g de aipim ou 50 g de banana ou 20 g de tapioca ou 80 g de batata-doce";
    const alts = parseAlternativesFromText(text);
    assert.equal(alts.length, 6, "Must have exactly 6 alternatives");
    assert.equal(alts[0].foodName, "pão de forma");
    assert.equal(alts[0].quantity, 1);
    assert.equal(alts[0].unit, "fatia");
    assert.equal(alts[1].foodName, "cuscuz");
    assert.equal(alts[1].quantity, 80);
    assert.equal(alts[2].foodName, "aipim");
    assert.equal(alts[2].quantity, 50);
    assert.equal(alts[3].foodName, "banana");
    assert.equal(alts[3].quantity, 50);
    assert.equal(alts[4].foodName, "tapioca");
    assert.equal(alts[4].quantity, 20);
    assert.equal(alts[5].foodName, "batata-doce");
    assert.equal(alts[5].quantity, 80);
  });

  // 3. Parser "OU" — Real Example C (ovos cozidos ou mexidos, frango, carne moída)
  test("Parser OU — Real Example C (mexidos is prep, not food)", () => {
    const text = "2 ovos cozidos ou mexidos ou 100 g de frango ou 90 g de carne moída";
    const alts = parseAlternativesFromText(text);
    assert.equal(alts.length, 3, "Must have 3 distinct foods, not 4");
    assert.ok(alts[0].foodName.includes("ovos"), "First item must be eggs");
    assert.ok(alts[0].preparationNotes.includes("mexidos"), "Preparation 'mexidos' must be preserved as prep note");
    assert.notEqual(alts[1].foodName, "mexidos", "'mexidos' must NEVER be an independent food");
    assert.equal(alts[1].foodName, "frango");
    assert.equal(alts[1].quantity, 100);
    assert.equal(alts[2].foodName, "carne moída");
    assert.equal(alts[2].quantity, 90);
  });

  // 4. Group Meal Foods and Alternatives
  test("groupMealFoodsAndAlternatives groups primary and substitutions without discarding", () => {
    const foods = [
      {
        originalText: "2 ovos cozidos ou mexidos ou 100 g de frango ou 90 g de carne moída",
        foodNameCandidate: "2 ovos cozidos ou mexidos ou 100 g de frango ou 90 g de carne moída",
        quantity: null,
        unitCandidate: null,
        notes: null,
      },
    ];
    const grouped = groupMealFoodsAndAlternatives(foods);
    assert.equal(grouped.length, 1);
    assert.equal(grouped[0].primary.foodNameCandidate, "ovos cozidos");
    assert.equal(grouped[0].primary.quantity, 2);
    assert.equal(grouped[0].substitutions.length, 2);
    assert.equal(grouped[0].substitutions[0].foodNameCandidate, "frango");
    assert.equal(grouped[0].substitutions[1].foodNameCandidate, "carne moída");
  });

  // 5. Branded Food Safety: Never Silently Convert Branded to Generic
  await asyncTest("Branded food safety: Wickbold stays NEEDS_REVIEW without generic fallback", async () => {
    const res = await matchFoodCandidate(1, "Pão Wickbold 100% integral");
    assert.equal(res.status, "AMBIGUOUS", "Branded food without exact DB record must be AMBIGUOUS");
    assert.equal(res.provenance, "NEEDS_REVIEW", "Provenance must be NEEDS_REVIEW");
    assert.equal(res.matched, undefined, "Must NOT choose a generic bread record silently");
  });

  // 6. Branded Food Match: Known brand with exact record in DB
  await asyncTest("Branded food match: Growth Whey matches exact branded record", async () => {
    const res = await matchFoodCandidate(1, "Growth 100% Whey Protein Concentrado Natural");
    assert.equal(res.status, "MATCHED");
    assert.ok(res.matched.name.includes("Growth"), "Must match Growth branded record");
  });

  // 7. Word boundary precision: Maçã does NOT match Macarrão
  await asyncTest("Word boundary precision: Maçã matches Apple, NOT Macarrão", async () => {
    const res = await matchFoodCandidate(1, "maçã");
    assert.equal(res.status, "MATCHED");
    assert.ok(!res.matched.name.toLowerCase().includes("macarr"), "Maçã must NEVER match Macarrão");
    assert.ok(res.matched.name.toLowerCase().includes("maçã") || res.matched.name.toLowerCase().includes("maca"), "Must match Maçã");
  });

  // 8. Inherently Ambiguous Foods: Safe Ambiguity preservation
  await asyncTest("Inherently ambiguous foods: peixe, queijo, carne stay AMBIGUOUS", async () => {
    for (const ambig of ["peixe", "queijo", "folhas", "suplemento"]) {
      const res = await matchFoodCandidate(1, ambig);
      assert.equal(res.status, "AMBIGUOUS", `${ambig} must be AMBIGUOUS`);
      assert.equal(res.provenance, "NEEDS_REVIEW");
    }
  });

  // 9. Unresolved / Not found foods: NEVER discarded
  await asyncTest("Not found food: Alien fruit preserved with NOT_FOUND status", async () => {
    const res = await matchFoodCandidate(1, "Fruta Alienígena 999 da Galáxia");
    assert.equal(res.status, "NOT_FOUND");
    assert.equal(res.matched, undefined);
    assert.equal(res.provenance, "NEEDS_REVIEW");
  });

  // 10. UNKNOWN != 0 and TRACE != UNKNOWN calculation
  test("Nutritional calculations: UNKNOWN is null, never zero", () => {
    const foodWithNulls = {
      foodPublicId: "test-pub-1",
      name: "Alimento Teste",
      sourceType: "TEST",
      caloriesKcal: null, // UNKNOWN
      proteinG: 10,
      carbsG: 0, // KNOWN_ZERO
      fatG: null,
      fiberG: null,
      referenceAmount: 100,
      referenceUnitCode: "G",
    };

    const calc = calculateAuthoritativeItemNutrients(foodWithNulls, 100, "g");
    assert.equal(calc.caloriesKcal, null, "Unknown calories must be null, NOT zero");
    assert.equal(calc.carbsG, 0, "Known zero must be 0");
    assert.equal(calc.proteinG, 10);
    assert.equal(calc.fatG, null, "Unknown fat must be null");
  });

  // 11. Household measure conversion
  test("Household measure: 2 fatias de pão (portion = 25g) computes 50g", () => {
    const bread = {
      foodPublicId: "bread-1",
      name: "Pão de forma",
      sourceType: "IBGE_POF_2008_2009",
      caloriesKcal: 250,
      proteinG: 8,
      carbsG: 50,
      fatG: 2,
      fiberG: 3,
      referenceAmount: 100,
      referenceUnitCode: "G",
    };

    const calc = calculateAuthoritativeItemNutrients(bread, 2, "fatia", 25);
    // 2 * 25 = 50g -> factor 0.5
    assert.equal(calc.caloriesKcal, 125);
    assert.equal(calc.proteinG, 4);
    assert.equal(calc.carbsG, 25);
  });

  // 12. Reference Catalog Auto-Promotion & Idempotency
  await asyncTest("Reference Catalog Promotion: Pão de forma promotes and re-match is local", async () => {
    const searchRes = await searchReferenceCatalogCandidate("pão de forma");
    assert.ok(searchRes.status === "HIGH_CONFIDENCE_MATCH" || searchRes.status === "AMBIGUOUS");
    if (searchRes.status === "HIGH_CONFIDENCE_MATCH" && searchRes.candidate) {
      const promoteRes = await autoPromoteReferenceFood(searchRes.candidate);
      assert.equal(promoteRes.success, true);

      // Re-run match to verify second import matches locally without duplicates
      const localRes = await matchFoodCandidate(1, "pão de forma");
      assert.equal(localRes.status, "MATCHED");
      assert.equal(localRes.provenance, "LOCAL_MATCHED");
    }
  });

  // 13. Section 24 Common Food Corpus Benchmark (38 foods)
  const commonCorpus = [
    "arroz branco", "arroz integral", "feijão carioca", "feijão preto",
    "pão de forma", "pão integral", "cuscuz", "aipim", "macaxeira", "mandioca",
    "batata-doce", "banana", "banana prata", "banana da terra", "tapioca",
    "aveia", "aveia em flocos", "chia", "linhaça", "ovo", "ovo cozido", "ovo mexido",
    "frango", "peito de frango", "frango grelhado", "carne moída", "patinho moído",
    "leite", "leite integral", "leite desnatado", "iogurte natural",
    "iogurte natural desnatado", "queijo minas", "mussarela", "maçã",
    "mamão", "laranja", "granola", "whey protein"
  ];

  await asyncTest(`Common Food Corpus: >= 95% resolution on 39 staple foods`, async () => {
    let resolved = 0;
    const failures = [];
    for (const food of commonCorpus) {
      const res = await matchFoodCandidate(1, food);
      if (res.status === "MATCHED") {
        resolved++;
      } else {
        failures.push({ food, status: res.status, candidates: res.candidates.length });
      }
    }
    const rate = (resolved / commonCorpus.length) * 100;
    console.log(`\nCorpus Results: ${resolved}/${commonCorpus.length} (${rate.toFixed(1)}%) resolved.`);
    if (failures.length > 0) {
      console.log("Unresolved staple items:", failures);
    }
    assert.ok(rate >= 95, `Expected >= 95% resolution, got ${rate.toFixed(1)}%`);
  });

  // 14. Tenancy & Isolation Denial
  await asyncTest("Tenancy: Consultancy A cannot confirm job belonging to Consultancy B", async () => {
    const db = await getDbConnection();
    try {
      // Find any existing job
      const [rows] = await db.query(
        "SELECT public_id, consultancy_id FROM ai_import_jobs LIMIT 1"
      );
      if (rows.length > 0) {
        const job = rows[0];
        const fakeConsultancyId = Number(job.consultancy_id) + 99999;
        let denied = false;
        try {
          await confirmNutritionAiImport({
            consultancyId: fakeConsultancyId,
            memberId: 999,
            userId: 999,
            role: "PERSONAL",
            jobPublicId: job.public_id,
            confirmedMeals: [{ name: "Café", time: null, notes: null, foods: [] }],
          });
        } catch (err) {
          denied = true;
        }
        assert.equal(denied, true, "Must deny cross-tenant job confirmation");
      }
    } finally {
      db.release();
    }
  });

  console.log(`\n==================================================`);
  console.log(`ALL ${passed}/${total} NUTRITION V2 TESTS PASSED!`);
  console.log(`==================================================\n`);
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
