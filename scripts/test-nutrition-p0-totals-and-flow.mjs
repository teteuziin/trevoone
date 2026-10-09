/**
 * TREVO ONE — TEST SUITE: P0 CORREÇÃO DE TOTAIS + EQUIVALENTES AUTOMÁTICOS + FLUXO SIMPLIFICADO
 */

import assert from "node:assert/strict";
import {
  calculateMealTotals,
  calculatePlanTotals,
} from "../lib/nutrition-v2/nutrient-calculator.ts";
import {
  presentNutritionPlan,
} from "../lib/nutrition-v2/nutrition-plan-presentation.ts";
import {
  calculateNutrientEquivalence,
  normalizeCriterion,
  getTargetNutrientValue,
  EQUIVALENT_CRITERIA_LABELS,
  EQUIVALENT_CRITERIA_UNITS,
} from "../lib/nutrition-v2/equivalents.ts";

console.log("=== INICIANDO SUÍTE DE TESTES: P0 TOTAIS + EQUIVALENTES + SIMPLIFICAÇÃO ===\n");

// ----------------------------------------------------------------------------
// TEST 1 — REPRODUÇÃO DO BUG DE PRODUÇÃO: 362.8 KCAL COMO "TOTAL DIÁRIO"
// ----------------------------------------------------------------------------
{
  console.log("TEST 1: Reprodução do cenário real (362.8 kcal com itens pendentes)");

  const items = [
    // 6 itens resolvidos somando 362.8 kcal
    { foodId: 101, foodNameSnapshot: "Ovo Cozido", caloriesKcalSnapshot: 77.5, proteinGSnapshot: 6.3, carbohydrateGSnapshot: 0.6, fatGSnapshot: 5.3 },
    { foodId: 102, foodNameSnapshot: "Banana Prata", caloriesKcalSnapshot: 98.0, proteinGSnapshot: 1.3, carbohydrateGSnapshot: 26.0, fatGSnapshot: 0.1 },
    { foodId: 103, foodNameSnapshot: "Café com Leite Desnatado", caloriesKcalSnapshot: 45.3, proteinGSnapshot: 3.2, carbohydrateGSnapshot: 4.8, fatGSnapshot: 0.2 },
    { foodId: 104, foodNameSnapshot: "Iogurte Natural", caloriesKcalSnapshot: 61.0, proteinGSnapshot: 3.5, carbohydrateGSnapshot: 4.7, fatGSnapshot: 3.3 },
    { foodId: 105, foodNameSnapshot: "Aveia em Flocos", caloriesKcalSnapshot: 53.0, proteinGSnapshot: 2.1, carbohydrateGSnapshot: 9.1, fatGSnapshot: 1.1 },
    { foodId: 106, foodNameSnapshot: "Chia Sementes", caloriesKcalSnapshot: 28.0, proteinGSnapshot: 1.0, carbohydrateGSnapshot: 2.5, fatGSnapshot: 1.9 },

    // 8 itens texto livre (sem food_id)
    { foodId: null, foodNameSnapshot: "Arroz Integral Caseiro", caloriesKcalSnapshot: null, proteinGSnapshot: null, carbohydrateGSnapshot: null, fatGSnapshot: null },
    { foodId: null, foodNameSnapshot: "Feijão Preto Temperado", caloriesKcalSnapshot: null, proteinGSnapshot: null, carbohydrateGSnapshot: null, fatGSnapshot: null },
    { foodId: null, foodNameSnapshot: "Peito de Frango Grelhado", caloriesKcalSnapshot: null, proteinGSnapshot: null, carbohydrateGSnapshot: null, fatGSnapshot: null },
    { foodId: null, foodNameSnapshot: "Salada Verde Variada", caloriesKcalSnapshot: null, proteinGSnapshot: null, carbohydrateGSnapshot: null, fatGSnapshot: null },
    { foodId: null, foodNameSnapshot: "Azeite de Oliva Extra Virgem", caloriesKcalSnapshot: null, proteinGSnapshot: null, carbohydrateGSnapshot: null, fatGSnapshot: null },
    { foodId: null, foodNameSnapshot: "Batata Doce Cozida", caloriesKcalSnapshot: null, proteinGSnapshot: null, carbohydrateGSnapshot: null, fatGSnapshot: null },
    { foodId: null, foodNameSnapshot: "Whey Protein Isolado", caloriesKcalSnapshot: null, proteinGSnapshot: null, carbohydrateGSnapshot: null, fatGSnapshot: null },
    { foodId: null, foodNameSnapshot: "Castanha do Pará", caloriesKcalSnapshot: null, proteinGSnapshot: null, carbohydrateGSnapshot: null, fatGSnapshot: null },

    // 1 item vinculado mas com medida não mapeada (calorias null)
    { foodId: 200, foodNameSnapshot: "Azeite em Colher de Sopa não mapeada", prescribedQuantity: 1, prescribedUnitCode: "COLHER_SOPA", caloriesKcalSnapshot: null, proteinGSnapshot: 0, carbohydrateGSnapshot: 0, fatGSnapshot: null },
  ];

  const planTotals = calculatePlanTotals([items]);

  assert.equal(planTotals.status, "INCOMPLETE", "O plano DEVE ter status INCOMPLETE");
  assert.equal(planTotals.isComplete, false, "isComplete DEVE ser false");
  assert.equal(planTotals.incompleteItemsCount, 9, "Devem existir exatamente 9 itens pendentes");
  assert.equal(planTotals.incompleteItems.length, 9, "Lista de itens incompletos deve ter 9 itens");

  // O subtotal conhecido DEVE ser 362.8 kcal
  assert.equal(planTotals.caloriesKcal, 362.8, "Subtotal conhecido deve ser 362.8 kcal");

  // Verificar categorização dos motivos
  const unlinkedItems = planTotals.incompleteItems.filter(i => i.reasonCode === "FOOD_NOT_LINKED");
  assert.equal(unlinkedItems.length, 8, "Devem haver 8 itens com motivo FOOD_NOT_LINKED");

  const unmappedPortionItems = planTotals.incompleteItems.filter(i => i.reasonCode === "PORTION_NOT_FOUND");
  assert.equal(unmappedPortionItems.length, 1, "Deve haver 1 item com motivo PORTION_NOT_FOUND");

  // Verificar apresentação
  const presented = presentNutritionPlan(
    {
      version: { title: "Plano" },
      meals: [],
      totals: planTotals,
      assignmentPublicId: "a1",
      startsOn: "2026-10-01",
      endsOn: null,
      notesForStudent: null,
    },
    { consultancyName: "Consultoria Teste" }
  );
  assert.equal(presented.totals.status, "INCOMPLETE");
  assert.equal(presented.totals.incompleteItemsCount, 9);
  assert.equal(presented.totals.isPartial, true);

  console.log("✓ PASS TEST 1: 362.8 kcal marcado corretamente como subtotal INCOMPLETO com 9 pendências e motivos explícitos.\n");
}

// ----------------------------------------------------------------------------
// TEST 2 — PLANO 100% COMPLETO
// ----------------------------------------------------------------------------
{
  console.log("TEST 2: Plano 100% completo");

  const meal1 = [
    { foodId: 1, foodNameSnapshot: "Pão Francês", caloriesKcalSnapshot: 150, proteinGSnapshot: 4, carbohydrateGSnapshot: 29.3, fatGSnapshot: 1.5 },
    { foodId: 2, foodNameSnapshot: "Ovo Cozido", caloriesKcalSnapshot: 77.5, proteinGSnapshot: 6.3, carbohydrateGSnapshot: 0.6, fatGSnapshot: 5.3 },
  ];
  const meal2 = [
    { foodId: 3, foodNameSnapshot: "Frango Grelhado", caloriesKcalSnapshot: 165, proteinGSnapshot: 31, carbohydrateGSnapshot: 0, fatGSnapshot: 3.6 },
    { foodId: 4, foodNameSnapshot: "Arroz Branco", caloriesKcalSnapshot: 130, proteinGSnapshot: 2.7, carbohydrateGSnapshot: 28.2, fatGSnapshot: 0.3 },
  ];

  const planTotals = calculatePlanTotals([meal1, meal2]);

  assert.equal(planTotals.status, "COMPLETE", "Status deve ser COMPLETE");
  assert.equal(planTotals.isComplete, true, "isComplete deve ser true");
  assert.equal(planTotals.hasIncompleteData, false, "hasIncompleteData deve ser false");
  assert.equal(planTotals.incompleteItemsCount, 0, "Sem itens pendentes");
  assert.equal(planTotals.incompleteItems.length, 0);
  assert.equal(planTotals.caloriesKcal, 522.5, "Total calórico exato: 522.5");
  assert.equal(planTotals.proteinG, 44, "Total proteína exato: 44.0");

  const presented = presentNutritionPlan(
    {
      version: { title: "Plano" },
      meals: [],
      totals: planTotals,
      assignmentPublicId: "a1",
      startsOn: "2026-10-01",
      endsOn: null,
      notesForStudent: null,
    },
    { consultancyName: "Consultoria Teste" }
  );
  assert.equal(presented.totals.status, "COMPLETE");
  assert.equal(presented.totals.incompleteItemsCount, 0);

  console.log("✓ PASS TEST 2: Plano completo retorna status COMPLETE com 0 pendências.\n");
}

// ----------------------------------------------------------------------------
// TEST 3 — PLANO VAZIO
// ----------------------------------------------------------------------------
{
  console.log("TEST 3: Plano vazio");

  const planTotals = calculatePlanTotals([]);

  assert.equal(planTotals.status, "EMPTY", "Status de plano vazio deve ser EMPTY");
  assert.equal(planTotals.isComplete, false);
  assert.equal(planTotals.caloriesKcal, 0);
  assert.equal(planTotals.incompleteItemsCount, 0);

  const presented = presentNutritionPlan(
    {
      version: { title: "Plano" },
      meals: [],
      totals: planTotals,
      assignmentPublicId: "a1",
      startsOn: "2026-10-01",
      endsOn: null,
      notesForStudent: null,
    },
    { consultancyName: "Consultoria Teste" }
  );
  assert.equal(presented.totals.status, "EMPTY");

  console.log("✓ PASS TEST 3: Plano vazio retorna status EMPTY de forma segura.\n");
}

// ----------------------------------------------------------------------------
// TEST 4 — EQUIVALENTES AUTOMÁTICOS: 4 CRITÉRIOS (PÃO FRANCÊS -> CUSCUZ)
// ----------------------------------------------------------------------------
{
  console.log("TEST 4: Equivalentes automáticos nos 4 critérios principais");

  // Pão Francês (50g)
  // 50g = 150 kcal, 29.3g carb, 4g protein, 1.5g fat
  const refPrescription = {
    foodId: 10,
    foodName: "Pão Francês",
    prescribedQuantity: 50,
    prescribedUnitCode: "G",
    caloriesKcalSnapshot: 150,
    carbohydrateGSnapshot: 29.3,
    proteinGSnapshot: 4.0,
    fatGSnapshot: 1.5,
  };

  // Cuscuz Cozido (100g = 112 kcal, 25.5g carb, 2.2g protein, 0.7g fat)
  const candidateFood = {
    publicId: "food-cuscuz-20",
    name: "Cuscuz Cozido",
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 112,
    carbohydrateG: 25.5,
    proteinG: 2.2,
    fatG: 0.7,
  };

  // 4.1 CRITÉRIO: CALORIES (Padrão)
  const eqCalories = calculateNutrientEquivalence(refPrescription, candidateFood, "CALORIES");
  assert.equal(eqCalories.status, "READY");
  assert.equal(eqCalories.criterion, "CALORIES");
  // 150 kcal / (112 / 100) = 133.93g -> arredondado para 134g
  assert.ok(eqCalories.roundedQuantity >= 133 && eqCalories.roundedQuantity <= 135, "Quantidade em gramas deve ser ~134g");
  assert.ok(eqCalories.differenceMetrics.absoluteDifference <= 1.5, "Diferença calórica deve ser mínima (<=1.5 kcal)");
  console.log(`  -> Critério CALORIES: ${eqCalories.roundedQuantity}g cuscuz (${eqCalories.macroSnapshotsForEquivalent.caloriesKcal} kcal, diff: ${eqCalories.differenceMetrics.absoluteDifference} kcal)`);

  // 4.2 CRITÉRIO: CARBOHYDRATE
  const eqCarb = calculateNutrientEquivalence(refPrescription, candidateFood, "CARBOHYDRATE");
  assert.equal(eqCarb.status, "READY");
  assert.equal(eqCarb.criterion, "CARBOHYDRATE");
  // 29.3g carb / (25.5 / 100) = 114.9g -> arredondado para 115g
  assert.ok(eqCarb.roundedQuantity >= 114 && eqCarb.roundedQuantity <= 116, "Quantidade em gramas deve ser ~115g");
  assert.ok(eqCarb.differenceMetrics.absoluteDifference <= 0.5, "Diferença de carboidratos deve ser mínima (<=0.5g)");
  console.log(`  -> Critério CARBOHYDRATE: ${eqCarb.roundedQuantity}g cuscuz (${eqCarb.macroSnapshotsForEquivalent.carbohydrateG}g carb, diff: ${eqCarb.differenceMetrics.absoluteDifference}g)`);

  // 4.3 CRITÉRIO: PROTEIN
  const eqProtein = calculateNutrientEquivalence(refPrescription, candidateFood, "PROTEIN");
  assert.equal(eqProtein.status, "READY");
  assert.equal(eqProtein.criterion, "PROTEIN");
  // 4.0g prot / (2.2 / 100) = 181.8g -> arredondado para 182g
  assert.ok(eqProtein.roundedQuantity >= 180 && eqProtein.roundedQuantity <= 183, "Quantidade em gramas deve ser ~182g");
  assert.ok(eqProtein.differenceMetrics.absoluteDifference <= 0.2, "Diferença de proteína deve ser mínima (<=0.2g)");
  console.log(`  -> Critério PROTEIN: ${eqProtein.roundedQuantity}g cuscuz (${eqProtein.macroSnapshotsForEquivalent.proteinG}g prot, diff: ${eqProtein.differenceMetrics.absoluteDifference}g)`);

  // 4.4 CRITÉRIO: FAT
  const eqFat = calculateNutrientEquivalence(refPrescription, candidateFood, "FAT");
  assert.equal(eqFat.status, "READY");
  assert.equal(eqFat.criterion, "FAT");
  // 1.5g fat / (0.7 / 100) = 214.28g -> arredondado para 214g
  assert.ok(eqFat.roundedQuantity >= 213 && eqFat.roundedQuantity <= 216, "Quantidade em gramas deve ser ~214g");
  assert.ok(eqFat.differenceMetrics.absoluteDifference <= 0.2, "Diferença de gordura deve ser mínima (<=0.2g)");
  console.log(`  -> Critério FAT: ${eqFat.roundedQuantity}g cuscuz (${eqFat.macroSnapshotsForEquivalent.fatG}g fat, diff: ${eqFat.differenceMetrics.absoluteDifference}g)`);

  // 4.5 AJUSTE MANUAL (Ajustar porção manualmente)
  const eqManual = calculateNutrientEquivalence(refPrescription, candidateFood, "MANUAL", 100);
  assert.equal(eqManual.status, "READY");
  assert.equal(eqManual.criterion, "MANUAL");
  assert.equal(eqManual.roundedQuantity, 100);
  assert.equal(eqManual.macroSnapshotsForEquivalent.caloriesKcal, 112);
  console.log(`  -> Ajuste MANUAL: 100g cuscuz -> ${eqManual.macroSnapshotsForEquivalent.caloriesKcal} kcal`);

  console.log("✓ PASS TEST 4: Todos os 4 critérios de equivalência calculados instantaneamente com precisão clínica.\n");
}

console.log("==================================================================");
console.log("P0 CORREÇÃO DE TOTAIS + EQUIVALENTES: TODOS OS TESTES PASSARAM!");
console.log("==================================================================");
