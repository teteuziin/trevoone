/**
 * TREVO ONE — TEST SUITE: CANONICAL BRAZILIAN FOOD MEASURES
 *
 * Exercises:
 * 1. Preparation state isolation: "Arroz, tipo 2, cru" vs "Arroz cozido"
 * 2. Strict adherence to IBGE/POF and Pinheiro et al. equivalences
 * 3. Prohibition of invented measures for foods without standard data
 * 4. Deterministic RFC-4122 UUID v4 generation for portion public IDs
 * 5. Physical conversion and nutrient snapshot calculations
 */

import { register } from "node:module";
register("./ts-loader.mjs", import.meta.url);

import assert from "node:assert/strict";

const {
  resolveCanonicalPortionsForFood,
  generateDeterministicPortionPublicId,
} = await import("../lib/nutrition-v2/canonical-food-portions.ts");

const {
  calculateItemNutrients,
} = await import("../lib/nutrition-v2/nutrient-calculator.ts");

console.log("=== INICIANDO TESTES DE MEDIDAS CANÔNICAS BRASILEIRAS (ETAPA 13) ===\n");

// -----------------------------------------------------------------------------
// TEST 1: Arroz, tipo 2, cru (Caso emblemático da solicitação)
// -----------------------------------------------------------------------------
{
  const portions = resolveCanonicalPortionsForFood({
    name: "Arroz, tipo 2, cru",
    displayName: "Arroz, tipo 2, cru",
    category: "Cereais e leguminosas",
    preparationState: "Cru",
    referenceUnitCode: "G",
  });

  console.log("1. Teste Arroz, tipo 2, cru:");
  console.log("   Porções resolvidas:", portions.map((p) => `${p.label} (${p.amount}g)`).join(", "));

  assert.ok(portions.length >= 3, "Deveria ter pelo menos 3 medidas para arroz cru");

  const xicara = portions.find((p) => p.label.toLowerCase().includes("xícara"));
  assert.ok(xicara, "Deve conter Xícara de chá para arroz cru");
  assert.equal(xicara.amount, 200, "Xícara de arroz cru deve ter 200g (IBGE/POF)");

  const copo = portions.find((p) => p.label.toLowerCase().includes("copo"));
  assert.ok(copo, "Deve conter Copo americano para arroz cru");
  assert.equal(copo.amount, 165, "Copo americano de arroz cru deve ter 165g");

  const colherSopa = portions.find((p) => p.label.toLowerCase().includes("colher de sopa"));
  assert.ok(colherSopa, "Deve conter Colher de sopa para arroz cru");
  assert.equal(colherSopa.amount, 20, "Colher de sopa de arroz cru deve ter 20g");

  // CRITICAL NEGATIVE TEST: Arroz cru NUNCA deve ter colher de servir ou escumadeira
  const colherServir = portions.find((p) => p.label.toLowerCase().includes("colher de servir"));
  assert.equal(colherServir, undefined, "PROIBIDO: Arroz cru JAMAIS deve ter medida de 'Colher de servir'");

  const escumadeira = portions.find((p) => p.label.toLowerCase().includes("escumadeira"));
  assert.equal(escumadeira, undefined, "PROIBIDO: Arroz cru JAMAIS deve ter 'Escumadeira'");

  console.log("   -> PASS: Arroz cru validado estritamente com medidas de cereal cru.\n");
}

// -----------------------------------------------------------------------------
// TEST 2: Arroz, tipo 1, cozido / preparado
// -----------------------------------------------------------------------------
{
  const portions = resolveCanonicalPortionsForFood({
    name: "Arroz, tipo 1, cozido",
    displayName: "Arroz, tipo 1, cozido",
    category: "Cereais e leguminosas",
    preparationState: "Cozido",
    referenceUnitCode: "G",
  });

  console.log("2. Teste Arroz, tipo 1, cozido:");
  console.log("   Porções resolvidas:", portions.map((p) => `${p.label} (${p.amount}g)`).join(", "));

  assert.ok(portions.length >= 4, "Deveria ter pelo menos 4 medidas para arroz cozido");

  const colherServirCheia = portions.find((p) => p.label.toLowerCase().includes("colher de servir cheia"));
  assert.ok(colherServirCheia, "Deve conter Colher de servir cheia para arroz cozido");
  assert.equal(colherServirCheia.amount, 50, "Colher de servir cheia de arroz cozido deve ter 50g");

  const colherServirRasa = portions.find((p) => p.label.toLowerCase().includes("colher de servir rasa"));
  assert.ok(colherServirRasa, "Deve conter Colher de servir rasa para arroz cozido");
  assert.equal(colherServirRasa.amount, 35, "Colher de servir rasa de arroz cozido deve ter 35g");

  const escumadeira = portions.find((p) => p.label.toLowerCase().includes("escumadeira"));
  assert.ok(escumadeira, "Deve conter Escumadeira / Pegador para arroz cozido");
  assert.equal(escumadeira.amount, 60, "Escumadeira de arroz cozido deve ter 60g");

  const xicara = portions.find((p) => p.label.toLowerCase().includes("xícara"));
  assert.ok(xicara, "Deve conter Xícara de chá para arroz cozido");
  assert.equal(xicara.amount, 160, "Xícara de arroz cozido deve ter 160g (Pinheiro)");

  console.log("   -> PASS: Arroz cozido validado com medidas de culinária e consumo pronto.\n");
}

// -----------------------------------------------------------------------------
// TEST 3: Feijão cozido (Carioca / Preto)
// -----------------------------------------------------------------------------
{
  const portions = resolveCanonicalPortionsForFood({
    name: "Feijão, carioca, cozido",
    displayName: "Feijão, carioca, cozido",
    category: "Leguminosas",
    preparationState: "Cozido",
    referenceUnitCode: "G",
  });

  console.log("3. Teste Feijão, carioca, cozido:");
  console.log("   Porções resolvidas:", portions.map((p) => `${p.label} (${p.amount}g)`).join(", "));

  const conchaMedia = portions.find((p) => p.label.toLowerCase().includes("concha média"));
  assert.ok(conchaMedia, "Deve conter Concha média");
  assert.equal(conchaMedia.amount, 130, "Concha média de feijão deve ter 130g (grãos + caldo)");

  console.log("   -> PASS: Feijão cozido possui conchas oficiais IBGE/Pinheiro.\n");
}

// -----------------------------------------------------------------------------
// TEST 4: Alimento sem medidas oficiais pré-cadastradas (Proibição de inventar)
// -----------------------------------------------------------------------------
{
  const portions = resolveCanonicalPortionsForFood({
    name: "Extrato seco especial de ervas exóticas liofilizado",
    displayName: null,
    category: "Outros",
    preparationState: null,
    referenceUnitCode: "G",
  });

  console.log("4. Teste Alimento Desconhecido / Sem medidas oficiais:");
  console.log("   Porções retornadas:", portions);

  assert.equal(portions.length, 0, "Alimento não tabelado DEVE retornar lista vazia de porções");
  console.log("   -> PASS: Nenhuma medida fictícia inventada para alimento sem referência.\n");
}

// -----------------------------------------------------------------------------
// TEST 5: Geração Determinística de UUIDs v4
// -----------------------------------------------------------------------------
{
  const foodId = 42;
  const label = "Xícara de chá";
  const uuid1 = generateDeterministicPortionPublicId(foodId, label);
  const uuid2 = generateDeterministicPortionPublicId(foodId, label);
  const uuidDiffLabel = generateDeterministicPortionPublicId(foodId, "Copo americano");
  const uuidDiffFood = generateDeterministicPortionPublicId(99, label);

  console.log("5. Teste Geração Determinística de UUID:");
  console.log("   UUID 1:", uuid1);
  console.log("   UUID 2:", uuid2);

  assert.equal(uuid1, uuid2, "Mesmo alimento e rótulo devem produzir exatamente o mesmo UUID");
  assert.notEqual(uuid1, uuidDiffLabel, "Rótulo diferente deve produzir UUID diferente");
  assert.notEqual(uuid1, uuidDiffFood, "Alimento diferente deve produzir UUID diferente");

  // Regex RFC-4122 v4
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  assert.match(uuid1, uuidV4Regex, "Deve ser um UUID v4 RFC-4122 válido");

  console.log("   -> PASS: UUID determinístico, reprodutível e compatível com chave primária pública.\n");
}

// -----------------------------------------------------------------------------
// TEST 6: Recálculo Físico e Nutricional em Tempo Real
// -----------------------------------------------------------------------------
{
  // Arroz cru (100g TACO = 358 kcal, 7.2g proteina, 78.8g carbo, 0.3g gordura)
  const tacoFood = {
    referenceAmount: 100,
    referenceUnitCode: "G",
    caloriesKcal: 358,
    proteinG: 7.2,
    carbohydrateG: 78.8,
    fatG: 0.3,
    fiberG: 1.6,
  };

  // 1 Xícara de chá de arroz cru = 200g
  const calc1Xicara = calculateItemNutrients({
    food: tacoFood,
    prescribedQuantity: 1,
    prescribedUnitCode: "PORCAO",
    portion: {
      label: "Xícara de chá",
      equivalentReferenceAmount: 200,
    },
  });

  console.log("6. Teste Recálculo Físico de 1 Xícara de arroz cru (200g):");
  console.log("   Kcal:", calc1Xicara.caloriesKcal, "Proteína:", calc1Xicara.proteinG, "Carbo:", calc1Xicara.carbohydrateG);

  assert.equal(calc1Xicara.factor, 2.0, "Fator de 200g sobre 100g de referência deve ser 2.0");
  assert.equal(calc1Xicara.caloriesKcal, 716, "358 * 2 = 716 kcal");
  assert.equal(calc1Xicara.proteinG, 14.4, "7.2 * 2 = 14.4 g");
  assert.equal(calc1Xicara.carbohydrateG, 157.6, "78.8 * 2 = 157.6 g");

  // 2 Colheres de sopa de arroz cru = 40g (2 * 20g)
  const calc2Colheres = calculateItemNutrients({
    food: tacoFood,
    prescribedQuantity: 2,
    prescribedUnitCode: "PORCAO",
    portion: {
      label: "Colher de sopa",
      equivalentReferenceAmount: 20,
    },
  });

  console.log("   2 Colheres de sopa (40g):");
  console.log("   Kcal:", calc2Colheres.caloriesKcal, "Carbo:", calc2Colheres.carbohydrateG);
  assert.equal(calc2Colheres.factor, 0.4, "40g / 100g = 0.4");
  assert.equal(calc2Colheres.caloriesKcal, 143.2, "358 * 0.4 = 143.2 kcal");

  console.log("   -> PASS: Recálculo físico de medidas proporcional e exato.\n");
}

console.log("=== TODOS OS 6 TESTES DE MEDIDAS CANÔNICAS PASSARAM COM SUCESSO! ===");
