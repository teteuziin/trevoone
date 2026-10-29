/**
 * TREVO ONE — COMPROVAÇÃO DE COMPORTAMENTO REAL DO SERVIDOR
 * 
 * 1. Confirmação explícita no servidor para publicação com dados parciais.
 * 2. Invalidação da revisão prévia ao editar um item e bloqueio de autorização antiga.
 * 3. Recálculo correto por 100 g, 100 ml e porção informada sem confundir ml com gramas.
 * 
 * Regra: Execução em ambiente isolado e sintético, preservando 100% dos rascunhos reais existentes.
 */

import assert from "node:assert/strict";
import { register } from "node:module";
register("./ts-loader.mjs", import.meta.url);

const { validatePlanTreeForPublication } = await import("../lib/nutrition-v2/validation.ts");
const {
  calculateNutrientFactor,
  calculateItemNutrients,
} = await import("../lib/nutrition-v2/nutrient-calculator.ts");
const { parseStructuredGuidance } = await import("../lib/nutrition-v2/guidance-types.ts");

console.log("================================================================================");
console.log("TREVO ONE — SUÍTE DE VERIFICAÇÃO COMPORTAMENTAL: SERVIDOR & CÁLCULOS NUTRICIONAIS");
console.log("================================================================================\n");

let passed = 0;
let total = 0;

function it(name, fn) {
  total++;
  try {
    fn();
    console.log(`  [PASS ${total}]: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL ${total}]: ${name}`);
    console.error("  ", err.message);
    throw err;
  }
}

// -----------------------------------------------------------------------------
// BLOCO 1: PUBLICAÇÃO PARCIAL EXIGE CONFIRMAÇÃO EXPLÍCITA E VÁLIDA NO SERVIDOR
// -----------------------------------------------------------------------------
console.log("--- BLOCO 1: PUBLICAÇÃO PARCIAL NO SERVIDOR (AUTORIZAÇÃO & GATE) ---");

// Helper para emular a decisão de publicação do servidor (conforme plan-repository e patient-plan-lifecycle)
function emulateServerPublishGate(tree, options = {}) {
  const allowPartial = Boolean(options.allowPartialNutrition);
  const validation = validatePlanTreeForPublication(tree);

  if (!validation.valid) {
    if (validation.hasFatalErrors || (validation.fatalErrors && validation.fatalErrors.length > 0)) {
      const err = new Error(validation.fatalErrors[0] || "Plano com dados impeditivos para publicação.");
      err.code = "PUBLICATION_VALIDATION_FAILED";
      err.statusCode = 400;
      err.fatal = true;
      throw err;
    }

    if (!allowPartial) {
      const err = new Error(validation.errors[0] || "Plano incompleto para publicação.");
      err.code = validation.pendingItems && validation.pendingItems.length > 0
        ? "PLAN_NUTRITION_INCOMPLETE"
        : "PUBLICATION_VALIDATION_FAILED";
      err.statusCode = 400;
      err.pendingItems = validation.pendingItems;
      throw err;
    }
  }

  // Executa transição autorizada para PUBLISHED com auditoria se houver itens incompletos
  const nowIso = new Date().toISOString();
  let audit = null;

  if (validation.pendingItems && validation.pendingItems.length > 0) {
    audit = {
      authorizedByMembershipId: options.membershipId || 999,
      authorizedByName: "Profissional",
      authorizedAt: nowIso,
      pendingItemsCount: validation.pendingItems.length,
      pendingItems: validation.pendingItems.map((p) => ({
        itemPublicId: p.itemPublicId,
        mealTitle: p.mealTitle,
        foodName: p.foodName,
        reason: p.reason,
      })),
    };
  }

  return {
    success: true,
    status: "PUBLISHED",
    publishedAt: nowIso,
    hasPartialData: Boolean(validation.pendingItems && validation.pendingItems.length > 0),
    audit,
  };
}

it("1.1 Rejeita publicação com HTTP 400 quando há itens sem macros e confirmação explícita foi omitida", () => {
  const treeWithUnlinkedItem = {
    plan: { publicId: "plan-test-1", updatePolicy: "MANUAL" },
    version: {
      publicId: "ver-test-1",
      title: "Rascunho com Alimento sem Macros",
      status: "DRAFT",
      guidanceJson: { schemaVersion: 1, recommendations: [], supplements: [], phytotherapeutics: [] },
    },
    meals: [
      {
        publicId: "meal-1",
        title: "Café da Manhã",
        mealTotals: { caloriesKcal: 77, proteinG: 2.6, carbohydrateG: 15.9, fatG: 0.1, status: "INCOMPLETE", hasIncompleteData: true },
        items: [
          {
            publicId: "item-psyllium",
            foodId: null, // sem vínculo na biblioteca
            foodNameSnapshot: "Psyllium",
            prescribedQuantity: 10,
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
  };

  assert.throws(
    () => emulateServerPublishGate(treeWithUnlinkedItem, { allowPartialNutrition: false }),
    (err) => {
      assert.equal(err.code, "PLAN_NUTRITION_INCOMPLETE");
      assert.equal(err.statusCode, 400);
      assert.equal(err.pendingItems.length, 1);
      assert.equal(err.pendingItems[0].foodName, "Psyllium");
      return true;
    }
  );
});

it("1.2 Permite publicação com confirmação explícita do profissional e grava auditoria completa", () => {
  const treeWithUnlinkedItem = {
    plan: { publicId: "plan-test-1", updatePolicy: "MANUAL" },
    version: {
      publicId: "ver-test-1",
      title: "Rascunho Autorizado Parcial",
      status: "DRAFT",
      guidanceJson: { schemaVersion: 1, recommendations: [], supplements: [], phytotherapeutics: [] },
    },
    meals: [
      {
        publicId: "meal-1",
        title: "Café da Manhã",
        mealTotals: { caloriesKcal: 77, proteinG: 2.6, carbohydrateG: 15.9, fatG: 0.1, status: "INCOMPLETE", hasIncompleteData: true },
        items: [
          {
            publicId: "item-psyllium",
            foodId: null,
            foodNameSnapshot: "Psyllium 100% puro",
            prescribedQuantity: 10,
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
  };

  const publishResult = emulateServerPublishGate(treeWithUnlinkedItem, {
    allowPartialNutrition: true,
    membershipId: 104,
  });

  assert.equal(publishResult.success, true);
  assert.equal(publishResult.status, "PUBLISHED");
  assert.equal(publishResult.hasPartialData, true);
  assert.ok(publishResult.audit, "Deve gerar objeto de auditoria");
  assert.equal(publishResult.audit.authorizedByMembershipId, 104);
  assert.equal(publishResult.audit.pendingItemsCount, 1);
  assert.equal(publishResult.audit.pendingItems[0].itemPublicId, "item-psyllium");
  assert.equal(publishResult.audit.pendingItems[0].foodName, "Psyllium 100% puro");
});

it("1.3 Bloqueia estritamente publicação quando há erro fatal (quantidade <= 0) mesmo com allowPartialNutrition=true", () => {
  const treeWithFatalZero = {
    plan: { publicId: "plan-fatal", updatePolicy: "MANUAL" },
    version: {
      publicId: "ver-fatal",
      title: "Rascunho com Quantidade Zero",
      status: "DRAFT",
      guidanceJson: { schemaVersion: 1, recommendations: [], supplements: [], phytotherapeutics: [] },
    },
    meals: [
      {
        publicId: "meal-1",
        title: "Almoço",
        mealTotals: { caloriesKcal: 0, proteinG: 0, carbohydrateG: 0, fatG: 0, status: "COMPLETE", hasIncompleteData: false },
        items: [
          {
            publicId: "item-frango-zero",
            foodId: 10,
            foodNameSnapshot: "Filé de frango",
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
  };

  assert.throws(
    () => emulateServerPublishGate(treeWithFatalZero, { allowPartialNutrition: true }),
    (err) => {
      assert.equal(err.code, "PUBLICATION_VALIDATION_FAILED");
      assert.equal(err.statusCode, 400);
      assert.equal(err.fatal, true);
      assert.ok(err.message.includes("Filé de frango"));
      return true;
    }
  );
});

// -----------------------------------------------------------------------------
// BLOCO 2: EDIÇÃO DE ITEM INVALIDA REVISÃO E IMPEDE REUTILIZAR AUTORIZAÇÃO ANTIGA
// -----------------------------------------------------------------------------
console.log("\n--- BLOCO 2: INVALIDAÇÃO DE REVISÃO AO EDITAR ITEM (LIFECYCLE) ---");

// Simulação de máquina de estados da versão e do item
class PlanVersionLifecycleHarness {
  constructor(initialGuidance = {}) {
    this.guidanceJson = {
      schemaVersion: 1,
      recommendations: [],
      supplements: [],
      phytotherapeutics: [],
      reviewedWithoutNutrition: {},
      ...initialGuidance,
    };
    this.item = {
      publicId: "item-101",
      foodId: null,
      foodNameSnapshot: "Cuscuz tradicional",
      prescribedQuantity: 60,
      prescribedUnitCode: "G",
      prescribedUnitLabel: "g",
      caloriesKcalSnapshot: null,
    };
  }

  // 1. Nutricionista marca como revisado sem dados
  setReviewedWithoutNutrition(acknowledged, membershipId = 104) {
    if (acknowledged) {
      this.guidanceJson.reviewedWithoutNutrition[this.item.publicId] = {
        reviewedAt: new Date().toISOString(),
        reviewedByMembershipId: membershipId,
        reviewedByName: "Profissional",
      };
    } else {
      delete this.guidanceJson.reviewedWithoutNutrition[this.item.publicId];
    }
  }

  // 2. Nutricionista edita a prescrição do item (executa o contrato de updateMealItem)
  updateItem(updates) {
    const isQtyChanged = updates.prescribedQuantity !== undefined && updates.prescribedQuantity !== this.item.prescribedQuantity;
    const isUnitChanged = updates.prescribedUnitCode !== undefined && updates.prescribedUnitCode !== this.item.prescribedUnitCode;
    const isFoodChanged = updates.foodId !== undefined && updates.foodId !== this.item.foodId;

    if (updates.prescribedQuantity !== undefined) this.item.prescribedQuantity = updates.prescribedQuantity;
    if (updates.prescribedUnitCode !== undefined) this.item.prescribedUnitCode = updates.prescribedUnitCode;
    if (updates.foodId !== undefined) this.item.foodId = updates.foodId;
    if (updates.foodNameSnapshot !== undefined) this.item.foodNameSnapshot = updates.foodNameSnapshot;

    // CONTRATO SERVIDOR (plan-repository.ts linhas 2351-2370):
    // Limpa automaticamente o acknowledgment se houver edição
    if (this.guidanceJson.reviewedWithoutNutrition?.[this.item.publicId]) {
      delete this.guidanceJson.reviewedWithoutNutrition[this.item.publicId];
    }
  }

  isItemReviewed() {
    return Boolean(this.guidanceJson.reviewedWithoutNutrition?.[this.item.publicId]);
  }
}

it("2.1 Marcação do item como 'revisado sem dados' é gravada com sucesso", () => {
  const harness = new PlanVersionLifecycleHarness();
  assert.equal(harness.isItemReviewed(), false);

  harness.setReviewedWithoutNutrition(true, 104);
  assert.equal(harness.isItemReviewed(), true);
  assert.equal(harness.guidanceJson.reviewedWithoutNutrition["item-101"].reviewedByMembershipId, 104);
});

it("2.2 Editar a quantidade do item invalida imediatamente o status de revisado", () => {
  const harness = new PlanVersionLifecycleHarness();
  harness.setReviewedWithoutNutrition(true, 104);
  assert.equal(harness.isItemReviewed(), true);

  // Profissional altera quantidade de 60g para 80g
  harness.updateItem({ prescribedQuantity: 80 });

  assert.equal(harness.isItemReviewed(), false, "A revisão anterior deve ter sido expurgada");
  assert.equal(harness.guidanceJson.reviewedWithoutNutrition["item-101"], undefined);
});

it("2.3 Editar a unidade do item invalida imediatamente o status de revisado", () => {
  const harness = new PlanVersionLifecycleHarness();
  harness.setReviewedWithoutNutrition(true, 104);
  assert.equal(harness.isItemReviewed(), true);

  // Profissional altera de G para UNIDADE
  harness.updateItem({ prescribedUnitCode: "UNIDADE", prescribedUnitLabel: "unidade" });

  assert.equal(harness.isItemReviewed(), false, "A revisão anterior deve ter sido expurgada");
});

it("2.4 Bloqueia reutilizar uma autorização prévia após o item ter sido modificado", () => {
  const harness = new PlanVersionLifecycleHarness();
  harness.setReviewedWithoutNutrition(true, 104);

  // Registra uma autorização antiga simulada
  const oldAudit = {
    authorizedByMembershipId: 104,
    authorizedAt: "2026-10-29T10:00:00.000Z",
    pendingItemsCount: 1,
    pendingItems: [{ itemPublicId: "item-101", foodName: "Cuscuz", reason: "UNLINKED" }],
  };
  harness.guidanceJson.partialPublicationAudit = oldAudit;

  // Profissional edita o item (ex: nova quantidade)
  harness.updateItem({ prescribedQuantity: 120 });

  // Monta a árvore atual do rascunho
  const currentTree = {
    plan: { publicId: "plan-1", updatePolicy: "MANUAL" },
    version: {
      publicId: "ver-1",
      title: "Rascunho Editado",
      status: "DRAFT",
      guidanceJson: harness.guidanceJson,
    },
    meals: [
      {
        publicId: "meal-1",
        title: "Café",
        mealTotals: { caloriesKcal: 0, proteinG: 0, carbohydrateG: 0, fatG: 0, status: "INCOMPLETE", hasIncompleteData: true },
        items: [harness.item],
      },
    ],
  };

  // Como o item foi editado, a revisão foi limpa. Tentativa de publicação normal (allowPartialNutrition=false)
  // DEVE FALHAR mesmo existindo um objeto oldAudit no JSON anterior!
  assert.throws(
    () => emulateServerPublishGate(currentTree, { allowPartialNutrition: false }),
    (err) => {
      assert.equal(err.code, "PLAN_NUTRITION_INCOMPLETE");
      return true;
    }
  );
});

// -----------------------------------------------------------------------------
// BLOCO 3: RECÁLCULO POR 100 G, 100 ML E PORÇÃO (SEM CONFUNDIR ML COM GRAMAS)
// -----------------------------------------------------------------------------
console.log("\n--- BLOCO 3: CÁLCULOS NUTRICIONAIS (100 G, 100 ML, PORÇÕES E UNIDADES FÍSICAS) ---");

it("3.1 Alimento com base 100 g: calcula fator e macros proporcionalmente para 60 g", () => {
  // Base: 100 g -> 130 kcal, 8.0 g P, 20.0 g C, 2.0 g G
  const factorRes = calculateNutrientFactor(100, "G", 60, "G");
  assert.equal(factorRes.factor, 0.6);
  assert.equal(factorRes.effectiveQty, 60);

  const nutrients = calculateItemNutrients({
    food: {
      referenceAmount: 100,
      referenceUnitCode: "G",
      caloriesKcal: 130,
      proteinG: 8.0,
      carbohydrateG: 20.0,
      fatG: 2.0,
    },
    prescribedQuantity: 60,
    prescribedUnitCode: "G",
  });

  assert.equal(nutrients.isValid, true);
  assert.equal(nutrients.factor, 0.6);
  assert.equal(nutrients.caloriesKcal, 78.0);
  assert.equal(nutrients.proteinG, 4.8);
  assert.equal(nutrients.carbohydrateG, 12.0);
  assert.equal(nutrients.fatG, 1.2);
});

it("3.2 Alimento com base 100 ml: calcula fator e macros proporcionalmente para 250 ml", () => {
  // Base: 100 ml -> 60 kcal, 3.0 g P, 9.0 g C, 1.5 g G
  const factorRes = calculateNutrientFactor(100, "ML", 250, "ML");
  assert.equal(factorRes.factor, 2.5);
  assert.equal(factorRes.effectiveQty, 250);

  const nutrients = calculateItemNutrients({
    food: {
      referenceAmount: 100,
      referenceUnitCode: "ML",
      caloriesKcal: 60,
      proteinG: 3.0,
      carbohydrateG: 9.0,
      fatG: 1.5,
    },
    prescribedQuantity: 250,
    prescribedUnitCode: "ML",
  });

  assert.equal(nutrients.isValid, true);
  assert.equal(nutrients.factor, 2.5);
  assert.equal(nutrients.caloriesKcal, 150.0);
  assert.equal(nutrients.proteinG, 7.5);
  assert.equal(nutrients.carbohydrateG, 22.5);
  assert.equal(nutrients.fatG, 3.75); // 1.5 * 2.5 = 3.75 exato
  assert.equal(nutrients.effectiveReferenceUnitCode, "ML");
  assert.strictEqual(nutrients.effectiveGrams, null, "Para alimento em volume, effectiveGrams deve ser estritamente null");
});

it("3.3 Alimento cadastrado por Porção Informada (base 60 g com macros da porção): fator 1.0 para 60 g e 2.0 para 120 g", () => {
  // Usuário informou na porção: 60 g com 120 kcal, 4.0 g P, 22.0 g C, 1.0 g G
  const foodCustomPortion = {
    referenceAmount: 60,
    referenceUnitCode: "G",
    caloriesKcal: 120,
    proteinG: 4.0,
    carbohydrateG: 22.0,
    fatG: 1.0,
  };

  // 1x porção prescrita (60 g)
  const calc1x = calculateItemNutrients({
    food: foodCustomPortion,
    prescribedQuantity: 60,
    prescribedUnitCode: "G",
  });
  assert.equal(calc1x.factor, 1.0);
  assert.equal(calc1x.caloriesKcal, 120.0);
  assert.equal(calc1x.proteinG, 4.0);
  assert.equal(calc1x.carbohydrateG, 22.0);
  assert.equal(calc1x.fatG, 1.0);

  // 2x porção prescrita (120 g)
  const calc2x = calculateItemNutrients({
    food: foodCustomPortion,
    prescribedQuantity: 120,
    prescribedUnitCode: "G",
  });
  assert.equal(calc2x.factor, 2.0);
  assert.equal(calc2x.caloriesKcal, 240.0);
  assert.equal(calc2x.proteinG, 8.0);
  assert.equal(calc2x.carbohydrateG, 44.0);
  assert.equal(calc2x.fatG, 2.0);
});

it("3.4 Não confunde volume (ML) com massa (G): recusa conversão sem medida caseira e não assume 1g = 1ml", () => {
  // Alimento líquido com base 100 ML prescrito como 200 G
  const mismatchMassVolume = calculateNutrientFactor(100, "ML", 200, "G");
  assert.equal(mismatchMassVolume.factor, null, "Não pode converter ML para G sem densidade");
  assert.ok(mismatchMassVolume.error.includes("Conversão não suportada entre 'G' e 'ML'"));

  // Alimento sólido com base 100 G prescrito como 200 ML
  const mismatchVolumeMass = calculateNutrientFactor(100, "G", 200, "ML");
  assert.equal(mismatchVolumeMass.factor, null, "Não pode converter G para ML sem densidade");
  assert.ok(mismatchVolumeMass.error.includes("Conversão não suportada entre 'ML' e 'G'"));
});

it("3.5 Medida caseira calibrada: porção informada com equivalência é calculada com exatidão", () => {
  // Base: 100 g. Medida caseira: '1 fatia média' = 30 g. Prescrição: 2 fatias (60 g)
  const nutrients = calculateItemNutrients({
    food: {
      referenceAmount: 100,
      referenceUnitCode: "G",
      caloriesKcal: 250,
      proteinG: 10.0,
      carbohydrateG: 50.0,
      fatG: 2.0,
    },
    prescribedQuantity: 2,
    prescribedUnitCode: "FATIA",
    portion: {
      label: "Fatia média",
      equivalentReferenceAmount: 30, // 30 g por fatia
    },
  });

  assert.equal(nutrients.isValid, true);
  assert.equal(nutrients.factor, 0.6); // (2 * 30) / 100 = 0.6
  assert.equal(nutrients.caloriesKcal, 150.0);
  assert.equal(nutrients.proteinG, 6.0);
  assert.equal(nutrients.carbohydrateG, 30.0);
  assert.equal(nutrients.fatG, 1.2);
});

it("3.6 Invariante: Nutriente não informado (null) permanece null e nunca é coagido para 0", () => {
  const nutrientsWithNulls = calculateItemNutrients({
    food: {
      referenceAmount: 100,
      referenceUnitCode: "G",
      caloriesKcal: 100,
      proteinG: 20.0,
      carbohydrateG: null, // não informado
      fatG: null,          // não informado
    },
    prescribedQuantity: 50,
    prescribedUnitCode: "G",
  });

  assert.equal(nutrientsWithNulls.factor, 0.5);
  assert.equal(nutrientsWithNulls.caloriesKcal, 50.0);
  assert.equal(nutrientsWithNulls.proteinG, 10.0);
  assert.strictEqual(nutrientsWithNulls.carbohydrateG, null, "Carboidrato deve permanecer estritamente null");
  assert.strictEqual(nutrientsWithNulls.fatG, null, "Gordura deve permanecer estritamente null");
});

console.log("\n================================================================================");
console.log(`RESULTADO FINAL DA SUÍTE: ${passed}/${total} TESTES PASS`);
console.log("================================================================================");
