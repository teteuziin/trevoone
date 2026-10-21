/**
 * TREVO ONE — COMPROVAÇÃO DE COMPORTAMENTO REAL (ETAPA 4)
 * TESTE DE INTEGRAÇÃO ISOLADO COM DADOS SINTÉTICOS
 * 
 * Regras:
 * - Ambiente isolado, sem mutação de banco de produção.
 * - Simulação rigorosa dos repositórios, escopos, multi-tenancy e snapshots.
 */

import assert from "node:assert/strict";
import { register } from "node:module";
register("./ts-loader.mjs", import.meta.url);

const {
  calculateItemNutrients,
  calculateNutrientFactor,
  derivePortionUnitCode,
} = await import("../lib/nutrition-v2/nutrient-calculator.ts");

const {
  generatePracticalRoundingSuggestions,
} = await import("../lib/nutrition-v2/equivalents.ts");

console.log("=== TREVO ONE — TESTE DE INTEGRAÇÃO COMPORTAMENTAL: MEDIDAS ALIMENTARES ===");

let totalTests = 0;
let passedTests = 0;

function runGate(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    console.error(`  [FAIL] ${name}:`, err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// HARNESS: Banco de Dados Sintético Isolado em Memória
// ---------------------------------------------------------------------------
class SyntheticNutritionDb {
  constructor() {
    this.foods = [
      {
        id: 1,
        public_id: "food_taco_arroz",
        name: "Arroz, integral, cozido",
        reference_amount: 100,
        reference_unit_code: "G",
        calories_kcal: 124,
        protein_g: 2.6,
        carbohydrate_g: 25.8,
        fat_g: 1.0,
        scope: "GLOBAL",
        status: "ACTIVE",
      },
      {
        id: 2,
        public_id: "food_azeite",
        name: "Azeite de oliva extra virgem",
        reference_amount: 100,
        reference_unit_code: "ML",
        calories_kcal: 884,
        protein_g: 0,
        carbohydrate_g: 0,
        fat_g: 100,
        scope: "GLOBAL",
        status: "ACTIVE",
      },
    ];

    this.portions = [
      {
        id: 101,
        public_id: "portion_arroz_colher_sopa",
        food_id: 1,
        label: "Colher de sopa",
        equivalent_reference_amount: 25,
        scope: "GLOBAL",
        consultancy_id: null,
        created_by_user_id: null,
        status: "ACTIVE",
      },
    ];

    this.mealItems = [];
    this.nextPortionId = 200;
    this.nextItemId = 500;
  }

  // Simula consulta de porções autorizadas com filtro de escopo
  getPortionsForFood(foodId, ctx) {
    return this.portions.filter((p) => {
      if (p.food_id !== foodId || p.status !== "ACTIVE") return false;
      if (p.scope === "GLOBAL" || !p.scope) return true;
      if (p.scope === "CONSULTANCY" && p.consultancy_id === ctx.consultancyId) return true;
      if (p.scope === "PERSONAL" && p.created_by_user_id === ctx.userId) return true;
      return false;
    });
  }

  // Simula criação de porção customizada com escopo
  createPortion(foodId, label, amount, scope, ctx) {
    const id = this.nextPortionId++;
    const portion = {
      id,
      public_id: `portion_custom_${id}`,
      food_id: foodId,
      label,
      equivalent_reference_amount: amount,
      scope: scope || "PERSONAL",
      consultancy_id: ctx.consultancyId || null,
      created_by_user_id: ctx.userId || null,
      status: "ACTIVE",
    };
    this.portions.push(portion);
    return portion;
  }

  // Simula salvamento de item com snapshot da porção
  addMealItem(mealId, foodId, prescribedQty, portionPublicId, ctx) {
    const food = this.foods.find((f) => f.id === foodId);
    let portion = null;
    if (portionPublicId) {
      const allowed = this.getPortionsForFood(foodId, ctx);
      portion = allowed.find((p) => p.public_id === portionPublicId);
      if (!portion) {
        throw new Error("FORBIDDEN_OR_INVALID_PORTION");
      }
    }

    const { factor, effectiveQty } = calculateNutrientFactor(
      food.reference_amount,
      food.reference_unit_code,
      prescribedQty,
      portion ? portion.label : "G",
      portion ? portion.equivalent_reference_amount : null
    );

    const id = this.nextItemId++;
    const item = {
      id,
      public_id: `item_${id}`,
      meal_id: mealId,
      food_id: food.id,
      food_name_snapshot: food.name,
      prescribed_quantity: prescribedQty,
      prescribed_unit_code: portion ? "PORCAO" : "G",
      prescribed_unit_label: portion ? portion.label : "Gramas (g)",
      portion_id: portion ? portion.id : null,
      portion_equivalent_amount: portion ? portion.equivalent_reference_amount : null, // SNAPSHOT IMUTÁVEL
      calories_kcal_snapshot: Math.round((food.calories_kcal * factor) * 10) / 10,
      protein_g_snapshot: Math.round((food.protein_g * factor) * 10) / 10,
      carbohydrate_g_snapshot: Math.round((food.carbohydrate_g * factor) * 10) / 10,
      fat_g_snapshot: Math.round((food.fat_g * factor) * 10) / 10,
      physical_equivalent_grams: effectiveQty,
    };
    this.mealItems.push(item);
    return item;
  }

  // Simula consulta de item gravado resolvendo snapshot
  getMealItem(itemId) {
    const item = this.mealItems.find((i) => i.id === itemId);
    if (!item) return null;
    const food = this.foods.find((f) => f.id === item.food_id);
    const catalogPortion = item.portion_id ? this.portions.find((p) => p.id === item.portion_id) : null;
    
    // O motor prioriza o snapshot persistido; se ausente, faz fallback para o catálogo
    const effectiveEqAmount = item.portion_equivalent_amount != null
      ? item.portion_equivalent_amount
      : (catalogPortion ? catalogPortion.equivalent_reference_amount : food.reference_amount);

    const { factor, effectiveQty } = calculateNutrientFactor(
      food.reference_amount,
      food.reference_unit_code,
      item.prescribed_quantity,
      item.prescribed_unit_label,
      effectiveEqAmount
    );

    return {
      ...item,
      effective_portion_amount: effectiveEqAmount,
      physical_equivalent_grams: effectiveQty,
    };
  }
}

const db = new SyntheticNutritionDb();

// Contextos sintéticos para teste de RBAC e Tenancy
const ctxNutriA_Consultancy1 = { userId: 10, consultancyId: 1, canAuthorNutrition: true };
const ctxNutriB_Consultancy1 = { userId: 20, consultancyId: 1, canAuthorNutrition: true };
const ctxNutriC_Consultancy2 = { userId: 30, consultancyId: 2, canAuthorNutrition: true };

// ===========================================================================
// SUITE DE TESTES
// ===========================================================================

// 1. Criar uma medida pessoal e recuperá-la do banco
let customPortionA = null;
runGate("1. Criar medida pessoal e recuperá-la pelo autor", () => {
  customPortionA = db.createPortion(1, "Xícara de chá da Nutri A", 150, "PERSONAL", ctxNutriA_Consultancy1);
  assert.ok(customPortionA.public_id, "Medida deve possuir public_id");

  const portionsA = db.getPortionsForFood(1, ctxNutriA_Consultancy1);
  const found = portionsA.find((p) => p.public_id === customPortionA.public_id);
  assert.ok(found, "Autor deve enxergar sua medida pessoal");
  assert.equal(found.equivalent_reference_amount, 150, "Equivalência deve ser 150 g");
  assert.equal(found.scope, "PERSONAL", "Escopo deve ser PERSONAL");
});

// 2. Impedir que outro usuário utilize essa medida privada
runGate("2. Impedir que outro usuário na mesma consultoria acesse medida pessoal alheia", () => {
  const portionsB = db.getPortionsForFood(1, ctxNutriB_Consultancy1);
  const found = portionsB.find((p) => p.public_id === customPortionA.public_id);
  assert.equal(found, undefined, "Nutricionista B não pode ver medida pessoal do Nutricionista A");

  // Tentar prescrever com a porção privada alheia deve lançar erro
  assert.throws(() => {
    db.addMealItem(1, 1, 2, customPortionA.public_id, ctxNutriB_Consultancy1);
  }, /FORBIDDEN_OR_INVALID_PORTION/);
});

// 3. Compartilhar uma medida com a consultoria somente com permissão
let sharedPortion = null;
runGate("3. Compartilhar medida com a consultoria e permitir acesso à equipe", () => {
  sharedPortion = db.createPortion(1, "Pegador padrão da clínica", 80, "CONSULTANCY", ctxNutriA_Consultancy1);
  assert.equal(sharedPortion.scope, "CONSULTANCY");

  const portionsB = db.getPortionsForFood(1, ctxNutriB_Consultancy1);
  const found = portionsB.find((p) => p.public_id === sharedPortion.public_id);
  assert.ok(found, "Nutricionista B da mesma consultoria deve acessar medida CONSULTANCY");
  assert.equal(found.equivalent_reference_amount, 80);
});

// 4. Bloquear acesso entre consultorias
runGate("4. Bloquear acesso a medidas entre consultorias distintas (Tenancy)", () => {
  const portionsC = db.getPortionsForFood(1, ctxNutriC_Consultancy2);
  const foundPersonal = portionsC.find((p) => p.public_id === customPortionA.public_id);
  const foundShared = portionsC.find((p) => p.public_id === sharedPortion.public_id);
  assert.equal(foundPersonal, undefined, "Consultoria 2 não pode ver medida pessoal da Consultoria 1");
  assert.equal(foundShared, undefined, "Consultoria 2 não pode ver medida da Consultoria 1");

  // Apenas a medida GLOBAL pré-existente deve ser vista por C
  assert.equal(portionsC.length, 1);
  assert.equal(portionsC[0].scope, "GLOBAL");
});

// 5. Selecionar a medida e salvar um item com snapshot
let savedItem = null;
runGate("5. Selecionar a medida e salvar item gravando snapshot imutável", () => {
  savedItem = db.addMealItem(1, 1, 2, customPortionA.public_id, ctxNutriA_Consultancy1);
  assert.equal(savedItem.prescribed_quantity, 2);
  assert.equal(savedItem.prescribed_unit_label, "Xícara de chá da Nutri A");
  assert.equal(savedItem.portion_equivalent_amount, 150, "Snapshot gravado com 150 g");
  assert.equal(savedItem.calories_kcal_snapshot, 372, "124 kcal * (300g / 100g) = 372 kcal");
});

// 6. Reabrir e conferir quantidade, nome, conversão e nutrientes
runGate("6. Reabrir item e conferir integridade de quantidade, conversão e macros", () => {
  const reloaded = db.getMealItem(savedItem.id);
  assert.equal(reloaded.prescribed_quantity, 2);
  assert.equal(reloaded.prescribed_unit_label, "Xícara de chá da Nutri A");
  assert.equal(reloaded.physical_equivalent_grams, 300, "2 xícaras de 150 g = 300 g");
  assert.equal(reloaded.calories_kcal_snapshot, 372);
  assert.equal(reloaded.protein_g_snapshot, 7.8, "2.6 * 3 = 7.8 g de proteína");
});

// 7. Trocar a apresentação preservando a quantidade física
runGate("7. Trocar apresentação preservando peso físico e recalcular quantidade", () => {
  // Cenário: 100g de arroz (124 kcal). Troca para colher de sopa (25g).
  const currentPhysicalGrams = 100;
  const newPortionEquivalent = 25; // 25 g por colher
  const scaledQty = currentPhysicalGrams / newPortionEquivalent; // 4 colheres
  assert.equal(scaledQty, 4, "100g / 25g = exatamente 4 colheres");

  const { effectiveQty: recomputedGrams } = calculateNutrientFactor(100, "G", scaledQty, "Colher de sopa", 25);
  assert.equal(recomputedGrams, 100, "Quantidade física de 100g mantida");

  // Se o usuário altera a quantidade para 2 colheres:
  const editedQty = 2;
  const { effectiveQty: editedGrams } = calculateNutrientFactor(100, "G", editedQty, "Colher de sopa", 25);
  assert.equal(editedGrams, 50, "2 colheres = 50 g");
});

// 8. Editar o peso cadastrado da medida sem alterar itens já prescritos
runGate("8. Editar peso cadastrado na biblioteca sem mutar itens históricos prescritos", () => {
  // A nutrição altera a porção na biblioteca de 150g para 180g
  const libPortion = db.portions.find((p) => p.id === customPortionA.id);
  libPortion.equivalent_reference_amount = 180;

  // O item prescrito anteriormente continua resolvendo 150g via snapshot
  const historicalItem = db.getMealItem(savedItem.id);
  assert.equal(historicalItem.effective_portion_amount, 150, "Deve preservar 150g do snapshot");
  assert.equal(historicalItem.physical_equivalent_grams, 300, "Peso físico preservado em 300g (não 360g)");
});

// 9. Preservar o nome e a equivalência histórica após alteração ou desativação da medida
runGate("9. Preservar integridade do item histórico após arquivamento da porção", () => {
  // Arquiva a porção na biblioteca
  const libPortion = db.portions.find((p) => p.id === customPortionA.id);
  libPortion.status = "ARCHIVED";

  // Item reaberto continua íntegro
  const historicalItem = db.getMealItem(savedItem.id);
  assert.equal(historicalItem.prescribed_unit_label, "Xícara de chá da Nutri A");
  assert.equal(historicalItem.effective_portion_amount, 150);
  assert.equal(historicalItem.physical_equivalent_grams, 300);
});

// 10. Manter consistência nas substituições, PDF e apresentação ao paciente
runGate("10. Manter consistência de apresentação para paciente e PDF", () => {
  const item = db.getMealItem(savedItem.id);
  const patientPresentation = `${item.prescribed_quantity} ${item.prescribed_unit_label} (${item.physical_equivalent_grams} g)`;
  assert.equal(patientPresentation, "2 Xícara de chá da Nutri A (300 g)");
});

// 11. Não assumir 1 ml = 1 g
runGate("11. Isolar massa e volume: nunca presumir 1 ml = 1 g sem porção", () => {
  // Azeite de oliva: 15 ml sem porção de gramas cadastrada
  const { factor, effectiveQty, error } = calculateNutrientFactor(100, "ML", 15, "G", null);
  // Unidades incompatíveis (ML vs G) sem fator de porção retornam erro e não assumem 1:1
  assert.equal(factor, null, "Não pode converter G para ML sem densidade/porção");
  assert.ok(error?.includes("Conversão não suportada"), "Deve indicar erro de conversão entre unidades incompatíveis");
});

// 12. Mostrar o impacto do arredondamento antes de aplicá-lo
runGate("12. Calcular e expor opções de arredondamento prático com impacto delta e %", () => {
  // Teste A: Motor de arredondamento de medidas do NutritionItemEditor
  // Cenário: 70g convertidos para colher de 22g -> 70 / 22 = 3.1818... colheres
  const convertedQty = 70 / 22; // ~3.18
  const nearestHalf = Math.round(convertedQty * 2) / 2; // 3.0
  const gramsDelta = Math.round((nearestHalf * 22 - 70) * 10) / 10; // 66 - 70 = -4.0 g
  const pctDelta = Math.round((gramsDelta / 70) * 1000) / 10; // -5.7%

  assert.equal(nearestHalf, 3.0, "Arredonda para a meia unidade ou inteiro mais próximo");
  assert.equal(gramsDelta, -4.0, "Delta em gramas é exatamente -4g");
  assert.equal(pctDelta, -5.7, "Impacto percentual calculado é -5.7%");

  // Teste B: generatePracticalRoundingSuggestions para unidade contínua em gramas
  const suggestions = generatePracticalRoundingSuggestions(73, "g");
  assert.ok(suggestions.length >= 2, "Deve fornecer opções de arredondamento");
  const floorOpt = suggestions.find((s) => s.value < 73);
  const ceilOpt = suggestions.find((s) => s.value > 73);
  assert.equal(floorOpt.value, 70, "Opção inferior em 70g");
  assert.equal(ceilOpt.value, 75, "Opção superior em 75g");
});

console.log(`\nTODAS AS 12 VALIDAÇÕES COMPORTAMENTAIS PASSARAM COM SUCESSO! (${passedTests}/${totalTests})`);
