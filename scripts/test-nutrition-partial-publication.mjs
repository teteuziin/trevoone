import assert from "node:assert/strict";
import { register } from "node:module";
register("./ts-loader.mjs", import.meta.url);

const { validatePlanTreeForPublication } = await import("../lib/nutrition-v2/validation.ts");
const { parseStructuredGuidance } = await import("../lib/nutrition-v2/guidance-types.ts");

console.log("=== SUÍTE DE TESTES: PRESERVAÇÃO DE ALIMENTOS E PUBLICAÇÃO COM DADOS PARCIAIS ===");

let passed = 0;
let total = 0;

function it(name, fn) {
  total++;
  try {
    fn();
    console.log(`  PASS [${total}]: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL [${total}]: ${name}`);
    console.error(err);
  }
}

// 1. Mock plan tree with unlinked food (no macros)
function buildMockTree(overrides = {}) {
  return {
    plan: {
      id: 101,
      publicId: "plan-mock-1",
      title: "Plano Teste",
      updatePolicy: "MANUAL",
      ...overrides.plan,
    },
    version: {
      id: 201,
      publicId: "ver-mock-1",
      title: "Versão 1",
      versionNumber: 1,
      status: "DRAFT",
      guidanceJson: {
        schemaVersion: 1,
        recommendations: [],
        supplements: [],
        phytotherapeutics: [],
        reviewedWithoutNutrition: {},
        ...overrides.guidanceJson,
      },
      ...overrides.version,
    },
    meals: overrides.meals || [
      {
        id: 301,
        publicId: "meal-mock-1",
        title: "Café da Manhã",
        sortOrder: 1,
        mealTotals: {
          caloriesKcal: 77,
          proteinG: 2.6,
          carbohydrateG: 15.9,
          fatG: 0.1,
          status: "INCOMPLETE",
          hasIncompleteData: true,
        },
        items: [
          {
            id: 401,
            publicId: "item-mock-cuscuz",
            foodId: 50,
            foodPublicId: "food-cuscuz",
            foodNameSnapshot: "Cuscuz de milho caseiro",
            prescribedQuantity: 60,
            prescribedUnitCode: "G",
            prescribedUnitLabel: "Gramas (g)",
            caloriesKcalSnapshot: 77,
            proteinGSnapshot: 2.6,
            carbohydrateGSnapshot: 15.9,
            fatGSnapshot: 0.1,
            sortOrder: 1,
            substitutions: [],
          },
          {
            id: 402,
            publicId: "item-mock-psyllium",
            foodId: null, // UNLINKED
            foodPublicId: null,
            foodNameSnapshot: "Psyllium",
            prescribedQuantity: 10,
            prescribedUnitCode: "G",
            prescribedUnitLabel: "g",
            caloriesKcalSnapshot: null, // Null honesto (sem macros)
            proteinGSnapshot: null,
            carbohydrateGSnapshot: null,
            fatGSnapshot: null,
            sortOrder: 2,
            substitutions: [],
          },
        ],
      },
    ],
  };
}

// TEST 1: Validation identifies partial nutrition as non-fatal
it("Validação identifica alimentos sem macros como pendências não fatais", () => {
  const tree = buildMockTree();
  const res = validatePlanTreeForPublication(tree);

  assert.equal(res.valid, false, "valid deve ser false pois há pendências");
  assert.equal(res.canPublishWithPartialData, true, "deve permitir publicação com dados parciais");
  assert.equal(res.hasFatalErrors, false, "não deve possuir erros fatais");
  assert.equal(res.hasPartialData, true, "deve sinalizar dados parciais");
  assert.equal(res.pendingItems.length, 1, "deve listar exatamente 1 item pendente");
  assert.equal(res.pendingItems[0].foodName, "Psyllium");
  assert.equal(res.pendingItems[0].reason, "UNLINKED");
});

// TEST 2: Fatal error (zero quantity) blocks publication even with partial data option
it("Quantidade zero ou negativa é estritamente fatal e bloqueia publicação parcial", () => {
  const tree = buildMockTree({
    meals: [
      {
        id: 301,
        publicId: "meal-mock-1",
        title: "Café da Manhã",
        sortOrder: 1,
        mealTotals: { caloriesKcal: 0, proteinG: 0, carbohydrateG: 0, fatG: 0, status: "COMPLETE", hasIncompleteData: false },
        items: [
          {
            id: 401,
            publicId: "item-zero",
            foodId: 50,
            foodPublicId: "food-cuscuz",
            foodNameSnapshot: "Cuscuz",
            prescribedQuantity: 0, // FATAL!
            prescribedUnitCode: "G",
            prescribedUnitLabel: "g",
            caloriesKcalSnapshot: null,
            proteinGSnapshot: null,
            carbohydrateGSnapshot: null,
            fatGSnapshot: null,
            sortOrder: 1,
            substitutions: [],
          },
        ],
      },
    ],
  });

  const res = validatePlanTreeForPublication(tree);
  assert.equal(res.canPublishWithPartialData, false, "não deve permitir publicação quando há quantidade zero");
  assert.equal(res.hasFatalErrors, true, "deve indicar erro fatal");
  assert.ok(res.fatalErrors.some((e) => e.includes("Cuscuz")), "deve listar o alimento com erro de quantidade");
});

// TEST 3: Guidance JSON preserves reviewedWithoutNutrition and partialPublicationAudit
it("Guidance parser preserva reviewedWithoutNutrition e partialPublicationAudit", () => {
  const parsed = parseStructuredGuidance({
    schemaVersion: 1,
    recommendations: [],
    supplements: [],
    phytotherapeutics: [],
    reviewedWithoutNutrition: {
      "item-mock-psyllium": {
        reviewedAt: "2026-10-29T21:00:00.000Z",
        reviewedByMembershipId: 42,
        reviewedByName: "Dra. Patricia",
      },
    },
    partialPublicationAudit: {
      authorizedByMembershipId: 42,
      authorizedByName: "Dra. Patricia",
      authorizedAt: "2026-10-29T21:05:00.000Z",
      pendingItemsCount: 1,
      pendingItems: [{ itemPublicId: "item-mock-psyllium", mealTitle: "Café", foodName: "Psyllium", reason: "UNLINKED" }],
    },
  });

  assert.ok(parsed.reviewedWithoutNutrition?.["item-mock-psyllium"], "deve manter registro de item revisado");
  assert.equal(parsed.reviewedWithoutNutrition["item-mock-psyllium"].reviewedByName, "Dra. Patricia");
  assert.ok(parsed.partialPublicationAudit, "deve manter auditoria de publicação parcial");
  assert.equal(parsed.partialPublicationAudit.pendingItemsCount, 1);
});

// TEST 4: Clean tree publishes cleanly without partial flag
it("Plano 100% completo com todos os macros é válido sem pendências", () => {
  const tree = buildMockTree({
    meals: [
      {
        id: 301,
        publicId: "meal-mock-1",
        title: "Café da Manhã",
        sortOrder: 1,
        mealTotals: { caloriesKcal: 154, proteinG: 5.2, carbohydrateG: 31.8, fatG: 0.2, status: "COMPLETE", hasIncompleteData: false },
        items: [
          {
            id: 401,
            publicId: "item-mock-cuscuz",
            foodId: 50,
            foodPublicId: "food-cuscuz",
            foodNameSnapshot: "Cuscuz de milho",
            prescribedQuantity: 60,
            prescribedUnitCode: "G",
            prescribedUnitLabel: "g",
            caloriesKcalSnapshot: 77,
            proteinGSnapshot: 2.6,
            carbohydrateGSnapshot: 15.9,
            fatGSnapshot: 0.1,
            sortOrder: 1,
            substitutions: [],
          },
          {
            id: 402,
            publicId: "item-mock-cuscuz-2",
            foodId: 50,
            foodPublicId: "food-cuscuz",
            foodNameSnapshot: "Cuscuz de milho 2",
            prescribedQuantity: 60,
            prescribedUnitCode: "G",
            prescribedUnitLabel: "g",
            caloriesKcalSnapshot: 77,
            proteinGSnapshot: 2.6,
            carbohydrateGSnapshot: 15.9,
            fatGSnapshot: 0.1,
            sortOrder: 2,
            substitutions: [],
          },
        ],
      },
    ],
  });

  const res = validatePlanTreeForPublication(tree);
  assert.equal(res.valid, true);
  assert.equal(res.canPublishWithPartialData, true);
  assert.equal(res.hasFatalErrors, false);
  assert.equal(res.hasPartialData, false);
  assert.equal(res.pendingItems.length, 0);
});

console.log(`\nResultado da suíte: ${passed}/${total} PASS`);
if (passed !== total) {
  process.exit(1);
}
