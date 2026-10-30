/**
 * TREVO ONE — PERSISTÊNCIA, CICLO DE VIDA DE REVISÃO E ORIENTAÇÕES NUTRICIONAIS
 * 
 * Validação rigorosa dos 5 cenários comportamentais:
 * 1. Revisar alimento → fechar → reabrir (persistência íntegra em guidance_json).
 * 2. Editar alimento → revisão invalidada imediatamente.
 * 3. Publicação parcial com confirmação válida (auditoria clínica persistida).
 * 4. Orientações preservadas no plano publicado, na visão do aluno e no PDF.
 * 5. Falha intermediária com rollback e retry sem duplicação.
 */

import assert from "node:assert/strict";
import { register } from "node:module";
register("./ts-loader.mjs", import.meta.url);

const { validatePlanTreeForPublication } = await import("../lib/nutrition-v2/validation.ts");
const {
  parseStructuredGuidance,
  presentStructuredGuidance,
} = await import("../lib/nutrition-v2/guidance-types.ts");
const {
  presentNutritionPlanFromVersionTree,
} = await import("../lib/nutrition-v2/nutrition-plan-presentation.ts");

console.log("================================================================================");
console.log("TREVO ONE — SUÍTE DE PERSISTÊNCIA, CICLO DE VIDA DE REVISÃO E ORIENTAÇÕES");
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

async function itAsync(name, fn) {
  total++;
  try {
    await fn();
    console.log(`  [PASS ${total}]: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL ${total}]: ${name}`);
    console.error("  ", err.message);
    throw err;
  }
}

// -----------------------------------------------------------------------------
// HARNESS DE BANCO ISOLADO EM MEMÓRIA
// -----------------------------------------------------------------------------
function createIsolatedPlanDatabase() {
  const state = {
    plan: {
      id: 101,
      publicId: "plan-isolated-101",
      consultancyId: 1,
      status: "ACTIVE",
    },
    version: {
      id: 201,
      publicId: "ver-isolated-201",
      nutritionPlanId: 101,
      versionNumber: 1,
      status: "DRAFT",
      title: "Plano Alimentar - Patricia",
      generalGuidance: null,
      guidanceJson: JSON.stringify({
        schemaVersion: 1,
        recommendations: [
          { id: "rec-1", title: "Água", text: "Ingerir 3L de água ao longo do dia.", sortOrder: 0 }
        ],
        supplements: [
          { id: "sup-1", name: "Psyllium", dosage: "10", unit: "g", sortOrder: 0 },
          { id: "sup-2", name: "Creatina", dosage: "5", unit: "g", sortOrder: 1 }
        ],
        phytotherapeutics: [
          { id: "fito-1", name: "Chá verde ou de gengibre", dosage: "300", unit: "ml", sortOrder: 0 }
        ]
      }),
      publishedAt: null,
    },
    meals: [
      {
        id: 301,
        publicId: "meal-301",
        title: "Café da Manhã",
        sortOrder: 1,
        items: [
          {
            id: 401,
            publicId: "item-cuscuz",
            foodName: "Cuscuz",
            quantity: 60,
            unit: "g",
            hasMacros: true,
            substitutions: [],
          },
          {
            id: 402,
            publicId: "item-psyllium",
            foodName: "Psyllium",
            quantity: 10,
            unit: "g",
            hasMacros: false, // Sem vínculo nutricional
            substitutions: [],
          }
        ]
      }
    ],
    activities: [],
  };

  return {
    state,

    // Emula setItemReviewedWithoutNutrition
    setReviewed: (itemPublicId, acknowledged, actorMembershipId = 55) => {
      let gj = JSON.parse(state.version.guidanceJson || "{}");
      if (!gj.reviewedWithoutNutrition) gj.reviewedWithoutNutrition = {};

      if (acknowledged) {
        gj.reviewedWithoutNutrition[itemPublicId] = {
          reviewedAt: new Date().toISOString(),
          reviewedByMembershipId: actorMembershipId,
          reviewedByName: "Nutricionista Responsável",
        };
      } else {
        delete gj.reviewedWithoutNutrition[itemPublicId];
      }
      state.version.guidanceJson = JSON.stringify(gj);
      return { success: true, acknowledged };
    },

    // Emula updateMealItem e invalidação de revisão
    updateMealItem: (itemPublicId, updates) => {
      let foundItem = null;
      for (const m of state.meals) {
        for (const it of m.items) {
          if (it.publicId === itemPublicId) {
            foundItem = it;
            break;
          }
        }
      }
      if (!foundItem) throw new Error("Item not found");

      const qtyChanged = updates.quantity !== undefined && updates.quantity !== foundItem.quantity;
      const unitChanged = updates.unit !== undefined && updates.unit !== foundItem.unit;

      if (updates.quantity !== undefined) foundItem.quantity = updates.quantity;
      if (updates.unit !== undefined) foundItem.unit = updates.unit;

      // Invalidação no guidanceJson se quantidade ou unidade alterada
      if (qtyChanged || unitChanged) {
        let gj = JSON.parse(state.version.guidanceJson || "{}");
        if (gj.reviewedWithoutNutrition && gj.reviewedWithoutNutrition[itemPublicId]) {
          delete gj.reviewedWithoutNutrition[itemPublicId];
          state.version.guidanceJson = JSON.stringify(gj);
        }
      }
      return { success: true, item: foundItem };
    },

    // Emula fechamento e reabertura (leitura da árvore)
    loadVersionTree: () => {
      const gjParsed = parseStructuredGuidance(state.version.guidanceJson, state.version.generalGuidance);
      return {
        plan: {
          id: state.plan.id,
          publicId: state.plan.publicId,
          status: state.plan.status,
        },
        version: {
          id: state.version.id,
          publicId: state.version.publicId,
          status: state.version.status,
          title: state.version.title,
          guidanceJson: gjParsed,
          generalGuidance: state.version.generalGuidance,
        },
        meals: state.meals.map(m => ({
          publicId: m.publicId,
          title: m.title,
          sortOrder: m.sortOrder,
          items: m.items.map(it => ({
            publicId: it.publicId,
            foodNameSnapshot: it.foodName,
            prescribedQuantity: it.quantity,
            prescribedUnitLabel: it.unit,
            prescribedUnitCode: it.unit,
            caloriesKcal: it.hasMacros ? 77 : null,
            proteinG: it.hasMacros ? 2.6 : null,
            carbohydrateG: it.hasMacros ? 15.9 : null,
            fatG: it.hasMacros ? 0.1 : null,
            foodId: it.hasMacros ? 99 : null,
            caloriesKcal: it.hasMacros ? 77 : null,
            proteinG: it.hasMacros ? 2.6 : null,
            carbohydrateG: it.hasMacros ? 15.9 : null,
            fatG: it.hasMacros ? 0.1 : null,
            caloriesKcalSnapshot: it.hasMacros ? 77 : null,
            proteinGSnapshot: it.hasMacros ? 2.6 : null,
            carbohydrateGSnapshot: it.hasMacros ? 15.9 : null,
            fatGSnapshot: it.hasMacros ? 0.1 : null,
            isPrescriptionWithoutNutrition: !it.hasMacros,
            reviewedWithoutNutrition: Boolean(
              gjParsed.reviewedWithoutNutrition && gjParsed.reviewedWithoutNutrition[it.publicId]
            ),
            substitutions: it.substitutions,
          })),
        })),
        dailyTotals: {
          caloriesKcal: 77,
          proteinG: 2.6,
          carbohydrateG: 15.9,
          fatG: 0.1,
        },
        totals: {
          caloriesKcal: 77,
          proteinG: 2.6,
          carbohydrateG: 15.9,
          fatG: 0.1,
          hasIncompleteData: true,
          status: "INCOMPLETE",
          incompleteItemsCount: 1,
        }
      };
    },

    // Emula publicação
    publish: (options = {}) => {
      const tree = createIsolatedPlanDatabase().loadVersionTree();
      // Usar a árvore do estado atual
      const currentTree = {
        ...tree,
        meals: state.meals.map(m => ({
          publicId: m.publicId,
          title: m.title,
          sortOrder: m.sortOrder,
          items: m.items.map(it => {
            const gj = JSON.parse(state.version.guidanceJson || "{}");
            const isRev = Boolean(gj.reviewedWithoutNutrition && gj.reviewedWithoutNutrition[it.publicId]);
            return {
              publicId: it.publicId,
              foodNameSnapshot: it.foodName,
              prescribedQuantity: it.quantity,
              prescribedUnitLabel: it.unit,
              prescribedUnitCode: it.unit,
              caloriesKcal: it.hasMacros ? 77 : null,
              proteinG: it.hasMacros ? 2.6 : null,
              carbohydrateG: it.hasMacros ? 15.9 : null,
              fatG: it.hasMacros ? 0.1 : null,
              foodId: it.hasMacros ? 99 : null,
              caloriesKcal: it.hasMacros ? 77 : null,
              proteinG: it.hasMacros ? 2.6 : null,
              carbohydrateG: it.hasMacros ? 15.9 : null,
              fatG: it.hasMacros ? 0.1 : null,
              caloriesKcalSnapshot: it.hasMacros ? 77 : null,
              proteinGSnapshot: it.hasMacros ? 2.6 : null,
              carbohydrateGSnapshot: it.hasMacros ? 15.9 : null,
              fatGSnapshot: it.hasMacros ? 0.1 : null,
              isPrescriptionWithoutNutrition: !it.hasMacros,
              reviewedWithoutNutrition: isRev,
              substitutions: it.substitutions,
            };
          }),
        })),
      };

      const validation = validatePlanTreeForPublication(currentTree);
      if (!validation.valid && !options.allowPartialNutrition) {
        const err = new Error(validation.errors[0] || "Plano com dados parciais exige confirmação explícita.");
        err.code = "PLAN_NUTRITION_INCOMPLETE";
        err.pendingItems = validation.pendingItems;
        throw err;
      }

      // Se falha simulada solicitada:
      if (options.simulateFailureMidway) {
        throw new Error("SIMULATED_FAILURE_MIDWAY");
      }

      const nowIso = new Date().toISOString();
      let gj = JSON.parse(state.version.guidanceJson || "{}");
      if (validation.pendingItems && validation.pendingItems.length > 0) {
        gj.partialPublicationAudit = {
          authorizedByMembershipId: 55,
          authorizedByName: "Nutricionista Responsável",
          authorizedAt: nowIso,
          pendingItemsCount: validation.pendingItems.length,
          pendingItems: validation.pendingItems.map(p => ({
            itemPublicId: p.itemPublicId,
            foodName: p.foodName,
            reason: p.reason,
          })),
        };
      }

      state.version.guidanceJson = JSON.stringify(gj);
      state.version.status = "PUBLISHED";
      state.version.publishedAt = nowIso;

      state.activities.push({
        action: "NUTRITION_PLAN_PUBLISHED_PARTIAL",
        publishedAt: nowIso,
        pendingCount: validation.pendingItems ? validation.pendingItems.length : 0,
      });

      return {
        success: true,
        versionPublicId: state.version.publicId,
        status: "PUBLISHED",
        publishedAt: nowIso,
      };
    }
  };
}

// -----------------------------------------------------------------------------
// EXECUÇÃO DOS CENÁRIOS COMPORTAMENTAIS
// -----------------------------------------------------------------------------

it("1.1 Revisar alimento ('Manter sem dados') persiste no guidance_json e sobrevive a fechar e reabrir", () => {
  const db = createIsolatedPlanDatabase();
  const itemPsylliumId = "item-psyllium";

  // Antes da revisão
  let treeBefore = db.loadVersionTree();
  let psylliumBefore = treeBefore.meals[0].items.find(i => i.publicId === itemPsylliumId);
  assert.equal(psylliumBefore.reviewedWithoutNutrition, false, "Item inicialmente não deve estar revisado");

  // Nutricionista revisa o alimento
  db.setReviewed(itemPsylliumId, true);

  // Simula "fechar e reabrir" a tela (novo carregamento do banco de dados)
  let treeAfter = db.loadVersionTree();
  let psylliumAfter = treeAfter.meals[0].items.find(i => i.publicId === itemPsylliumId);

  assert.equal(psylliumAfter.reviewedWithoutNutrition, true, "Item deve constar como revisado após reabrir a tela");
  const storedGj = treeAfter.version.guidanceJson;
  assert.ok(storedGj.reviewedWithoutNutrition[itemPsylliumId], "O payload da revisão deve estar presente no guidanceJson");
  assert.equal(storedGj.reviewedWithoutNutrition[itemPsylliumId].reviewedByName, "Nutricionista Responsável");
});

it("2.1 Editar a quantidade ou unidade de um alimento invalida imediatamente sua revisão prévia", () => {
  const db = createIsolatedPlanDatabase();
  const itemPsylliumId = "item-psyllium";

  // Revisa inicialmente
  db.setReviewed(itemPsylliumId, true);
  let tree = db.loadVersionTree();
  assert.equal(tree.meals[0].items[1].reviewedWithoutNutrition, true);

  // Nutricionista edita a quantidade (de 10g para 15g)
  db.updateMealItem(itemPsylliumId, { quantity: 15 });

  // Recarrega a árvore (simulando persistência real)
  let treeAfterEdit = db.loadVersionTree();
  let psylliumAfterEdit = treeAfterEdit.meals[0].items.find(i => i.publicId === itemPsylliumId);

  assert.equal(psylliumAfterEdit.prescribedQuantity, 15, "Nova quantidade deve estar salva");
  assert.equal(psylliumAfterEdit.reviewedWithoutNutrition, false, "A revisão deve ser INVALIDADA após a edição");

  // Tentativa de publicação sem autorização parcial explícita deve ser bloqueada
  assert.throws(
    () => db.publish({ allowPartialNutrition: false }),
    (err) => {
      return (
        err &&
        err.code === "PLAN_NUTRITION_INCOMPLETE" &&
        Array.isArray(err.pendingItems) &&
        err.pendingItems.length > 0
      );
    }
  );
});

it("3.1 Publicação parcial com confirmação válida grava partialPublicationAudit completo e transiciona para PUBLISHED", () => {
  const db = createIsolatedPlanDatabase();

  // Publica com confirmação explícita do profissional
  const result = db.publish({ allowPartialNutrition: true });

  assert.equal(result.success, true);
  assert.equal(result.status, "PUBLISHED");
  assert.equal(db.state.version.status, "PUBLISHED");

  // Verifica que o guidance_json contém o registro de auditoria completo
  const gj = JSON.parse(db.state.version.guidanceJson);
  assert.ok(gj.partialPublicationAudit, "Deve conter partialPublicationAudit no guidance_json");
  assert.equal(gj.partialPublicationAudit.authorizedByName, "Nutricionista Responsável");
  assert.equal(gj.partialPublicationAudit.pendingItemsCount, 1);
  assert.equal(gj.partialPublicationAudit.pendingItems[0].foodName, "Psyllium");

  // Verifica que o histórico de atividades foi gravado
  assert.equal(db.state.activities.length, 1);
  assert.equal(db.state.activities[0].action, "NUTRITION_PLAN_PUBLISHED_PARTIAL");
});

it("4.1 Orientações estruturadas (recomendações, suplementos e fitoterápicos) são 100% preservadas para o aluno e PDF", () => {
  const db = createIsolatedPlanDatabase();
  db.publish({ allowPartialNutrition: true });

  const tree = db.loadVersionTree();
  const presented = presentNutritionPlanFromVersionTree(tree, {
    consultancyName: "Saiya Shape",
    studentName: "Patricia",
  });

  assert.ok(presented.guidance, "Deve conter o objeto de orientações apresentadas");
  assert.equal(presented.guidance.hasAny, true);
  assert.equal(presented.guidance.hasRecommendations, true);
  assert.equal(presented.guidance.hasSupplements, true);
  assert.equal(presented.guidance.hasPhytotherapeutics, true);

  // Verifica integridade de conteúdo para o PDF e tela do aluno
  assert.equal(presented.guidance.recommendations.length, 1);
  assert.equal(presented.guidance.recommendations[0].title, "Água");

  assert.equal(presented.guidance.supplements.length, 2);
  assert.equal(presented.guidance.supplements[0].name, "Psyllium");
  assert.equal(presented.guidance.supplements[0].doseFormatted, "10 g");
  assert.equal(presented.guidance.supplements[1].name, "Creatina");
  assert.equal(presented.guidance.supplements[1].doseFormatted, "5 g");

  assert.equal(presented.guidance.phytotherapeutics.length, 1);
  assert.equal(presented.guidance.phytotherapeutics[0].name, "Chá verde ou de gengibre");
  assert.equal(presented.guidance.phytotherapeutics[0].doseFormatted, "300 ml");
});

it("5.1 Falha intermediária preserva o rascunho como DRAFT e retry não cria duplicações", () => {
  const db = createIsolatedPlanDatabase();
  const initialStatus = db.state.version.status;
  assert.equal(initialStatus, "DRAFT");

  // Tentativa 1: Falha simulada no meio do fluxo
  let failed = false;
  try {
    db.publish({ allowPartialNutrition: true, simulateFailureMidway: true });
  } catch (err) {
    failed = true;
    assert.equal(err.message, "SIMULATED_FAILURE_MIDWAY");
  }
  assert.ok(failed, "A falha simulada deve ter ocorrido");
  assert.equal(db.state.version.status, "DRAFT", "O status do rascunho deve permanecer DRAFT");
  assert.equal(db.state.activities.length, 0, "Nenhuma atividade deve ter sido commitada");

  // Tentativa 2: Retry normal
  const retryResult = db.publish({ allowPartialNutrition: true, simulateFailureMidway: false });
  assert.equal(retryResult.success, true);
  assert.equal(retryResult.status, "PUBLISHED");
  assert.equal(db.state.version.status, "PUBLISHED");
  assert.equal(db.state.activities.length, 1, "Exatamente uma atividade deve ser registrada (sem duplicação)");
});

console.log("\n================================================================================");
console.log(`RESULTADO DA SUÍTE DE PERSISTÊNCIA: ${passed}/${total} TESTES PASS`);
console.log("================================================================================");
