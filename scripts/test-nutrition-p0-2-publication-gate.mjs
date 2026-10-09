/**
 * TEST SUITE: TREVO ONE — NUTRIÇÃO P0.2
 * HARDENING FINAL — PUBLICATION GATE INTEGRITY TESTS
 */

import { register } from "node:module";
register("./ts-loader.mjs", import.meta.url);

const { validatePlanTreeForPublication } = await import("../lib/nutrition-v2/validation.ts");

let passedCount = 0;
let totalCount = 0;

function assert(condition, message) {
  totalCount++;
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`[PASS] ${message}`);
  passedCount++;
}

console.log("=== INICIANDO SUÍTE DE TESTES: NUTRIÇÃO P0.2 PUBLICATION GATE ===\n");

// 1. COMPLETE PLAN
const completeTree = {
  version: { title: "Plano Hipertrofia Fase 1" },
  meals: [
    {
      publicId: "meal-1",
      title: "Café da Manhã",
      items: [
        {
          publicId: "item-1",
          foodId: 101,
          foodNameSnapshot: "Ovo cozido",
          prescribedQuantity: 100,
          prescribedUnitCode: "G",
          caloriesKcalSnapshot: 146,
        },
      ],
    },
  ],
};
const resComplete = validatePlanTreeForPublication(completeTree);
assert(resComplete.valid === true, "PUBLISH COMPLETE PLAN: PASS");
assert(resComplete.pendingItems.length === 0, "COMPLETE PLAN has 0 pending items");

// 2. UNLINKED FOOD (foodId == null)
const unlinkedTree = {
  version: { title: "Plano com item avulso" },
  meals: [
    {
      publicId: "meal-1",
      title: "Almoço",
      items: [
        {
          publicId: "item-unlinked",
          foodId: null,
          foodNameSnapshot: "Fruta: maçã média",
          prescribedQuantity: 1,
          prescribedUnitCode: "UNIDADE",
          caloriesKcalSnapshot: null,
        },
      ],
    },
  ],
};
const resUnlinked = validatePlanTreeForPublication(unlinkedTree);
assert(resUnlinked.valid === false, "PUBLISH WITH UNLINKED FOOD: DENIED PASS");
assert(resUnlinked.pendingItems.length === 1, "Detected 1 pending unlinked item");
assert(resUnlinked.pendingItems[0].reason === "UNLINKED", "Reason is UNLINKED");
assert(resUnlinked.pendingItems[0].reasonLabel === "Sem vínculo nutricional", "Reason label is 'Sem vínculo nutricional'");

// 3. UNKNOWN NUTRITION (foodId != null, caloriesKcalSnapshot == null, standard unit)
const unknownTree = {
  version: { title: "Plano com alimento sem tabela nutricional" },
  meals: [
    {
      publicId: "meal-1",
      title: "Jantar",
      items: [
        {
          publicId: "item-unknown",
          foodId: 202,
          foodNameSnapshot: "Alimento exótico",
          prescribedQuantity: 100,
          prescribedUnitCode: "G",
          caloriesKcalSnapshot: null,
        },
      ],
    },
  ],
};
const resUnknown = validatePlanTreeForPublication(unknownTree);
assert(resUnknown.valid === false, "PUBLISH WITH UNKNOWN NUTRITION: DENIED PASS");
assert(resUnknown.pendingItems[0].reason === "UNKNOWN_NUTRITION", "Reason is UNKNOWN_NUTRITION");

// 4. UNRESOLVED PORTION (foodId != null, caloriesKcalSnapshot == null, non-standard unit)
const unresolvedPortionTree = {
  version: { title: "Plano com porção não convertida" },
  meals: [
    {
      publicId: "meal-1",
      title: "Lanche",
      items: [
        {
          publicId: "item-portion",
          foodId: 303,
          foodNameSnapshot: "Aveia em flocos",
          prescribedQuantity: 2,
          prescribedUnitCode: "PORCAO",
          caloriesKcalSnapshot: null,
        },
      ],
    },
  ],
};
const resPortion = validatePlanTreeForPublication(unresolvedPortionTree);
assert(resPortion.valid === false, "PUBLISH WITH UNRESOLVED PORTION: DENIED PASS");
assert(resPortion.pendingItems[0].reason === "UNRESOLVED_PORTION", "Reason is UNRESOLVED_PORTION");
assert(resPortion.pendingItems[0].reasonLabel === "Medida sem conversão nutricional", "Reason label is 'Medida sem conversão nutricional'");

// 5. KNOWN ZERO (caloriesKcalSnapshot === 0 is valid and NOT blocked)
const knownZeroTree = {
  version: { title: "Plano com item zero calorias" },
  meals: [
    {
      publicId: "meal-1",
      title: "Hidratação",
      items: [
        {
          publicId: "item-zero",
          foodId: 404,
          foodNameSnapshot: "Água mineral / Chá verde sem açúcar",
          prescribedQuantity: 200,
          prescribedUnitCode: "ML",
          caloriesKcalSnapshot: 0,
        },
      ],
    },
  ],
};
const resZero = validatePlanTreeForPublication(knownZeroTree);
assert(resZero.valid === true, "KNOWN ZERO: PUBLISH ALLOWED PASS");
assert(resZero.pendingItems.length === 0, "Known zero produces 0 pending items");

// 6. INVALID QUANTITY (prescribedQuantity <= 0)
const invalidQtyTree = {
  version: { title: "Plano com quantidade zero" },
  meals: [
    {
      publicId: "meal-1",
      title: "Refeição",
      items: [
        {
          publicId: "item-qty-zero",
          foodId: 505,
          foodNameSnapshot: "Arroz",
          prescribedQuantity: 0,
          prescribedUnitCode: "G",
          caloriesKcalSnapshot: 130,
        },
      ],
    },
  ],
};
const resQty = validatePlanTreeForPublication(invalidQtyTree);
assert(resQty.valid === false, "INVALID QUANTITY: DENIED PASS");
assert(resQty.pendingItems[0].reason === "INVALID_QUANTITY", "Reason is INVALID_QUANTITY");

// 7. AFTER LINKING (Unlinked item gets linked to canonical food)
const resolvedAfterLinkingTree = {
  version: { title: "Plano após vinculação" },
  meals: [
    {
      publicId: "meal-1",
      title: "Almoço",
      items: [
        {
          publicId: "item-unlinked",
          foodId: 606, // now linked!
          foodNameSnapshot: "Maçã Fuji fresca",
          prescribedQuantity: 150,
          prescribedUnitCode: "G",
          caloriesKcalSnapshot: 78, // now calculated!
        },
      ],
    },
  ],
};
const resResolved = validatePlanTreeForPublication(resolvedAfterLinkingTree);
assert(resResolved.valid === true, "AFTER LINKING: PUBLISH PASS");
assert(resResolved.pendingItems.length === 0, "0 pending items after linking");

// 8. MULTIPLE PENDING ITEMS (Mixed unlinked + unresolved portion)
const mixedTree = {
  version: { title: "Plano misto com 2 pendências" },
  meals: [
    {
      publicId: "meal-1",
      title: "Café da manhã",
      items: [
        {
          publicId: "item-1",
          foodId: null,
          foodNameSnapshot: "Pão artesanal",
          prescribedQuantity: 50,
          prescribedUnitCode: "G",
          caloriesKcalSnapshot: null,
        },
        {
          publicId: "item-2",
          foodId: 707,
          foodNameSnapshot: "Aveia",
          prescribedQuantity: 1,
          prescribedUnitCode: "PORCAO",
          caloriesKcalSnapshot: null,
        },
      ],
    },
  ],
};
const resMixed = validatePlanTreeForPublication(mixedTree);
assert(resMixed.valid === false, "MULTIPLE PENDING: DENIED PASS");
assert(resMixed.pendingItems.length === 2, "Accurately detects both pending items");
assert(resMixed.errors.some((e) => e.includes("Existem 2 alimento(s)")), "Error message summarizes count");

console.log(`\n==================================================`);
console.log(`P0.2 PUBLICATION GATE: ${passedCount}/${totalCount} TESTES PASS!`);
console.log(`==================================================`);
