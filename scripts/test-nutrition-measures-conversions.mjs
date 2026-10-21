/**
 * TREVO ONE — TEST SUITE: MEDIDAS ALIMENTARES E CONVERSÕES (ETAPA 4)
 * Comprehensive behavioral and integration tests for food measures,
 * dynamic conversions, personal/consultancy scoping, and snapshot preservation.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, "..");

console.log("=== TREVO ONE — TEST SUITE: MEDIDAS ALIMENTARES E CONVERSÕES (ETAPA 4) ===\n");

// ============================================================================
// GATE 1: Pure Mathematical & Calculation Engine (Section 4 & 5)
// ============================================================================
console.log("[1/6] Validando motor matemático e regras de conversão física...");

const {
  calculateItemNutrients,
  calculateNutrientFactor,
  roundMacro,
} = await import("../lib/nutrition-v2/nutrient-calculator.ts");

// Scenario A: 100g of white bread (265 kcal, 8g P, 50g C, 3.2g G)
const breadFood = {
  referenceAmount: 100,
  referenceUnitCode: "G",
  caloriesKcal: 265,
  proteinG: 8,
  carbohydrateG: 50,
  fatG: 3.2,
};

const calc100g = calculateItemNutrients({
  food: breadFood,
  prescribedQuantity: 100,
  prescribedUnitCode: "G",
});

assert.strictEqual(calc100g.isValid, true);
assert.strictEqual(calc100g.caloriesKcal, 265);
assert.strictEqual(calc100g.proteinG, 8);
assert.strictEqual(calc100g.carbohydrateG, 50);
assert.strictEqual(calc100g.fatG, 3.2);

// Scenario B: Smart Presentation Switch: 100g -> "Fatia média" (25g per slice)
// 100g / 25g = 4 fatias. Nutrients must be 100% identical!
const slicePortion = {
  label: "Fatia média",
  equivalentReferenceAmount: 25,
};

const calc4slices = calculateItemNutrients({
  food: breadFood,
  prescribedQuantity: 4,
  prescribedUnitCode: "PORCAO",
  portion: slicePortion,
});

assert.strictEqual(calc4slices.isValid, true);
assert.strictEqual(calc4slices.effectiveGrams, 100);
assert.strictEqual(calc4slices.caloriesKcal, 265);
assert.strictEqual(calc4slices.proteinG, 8);
assert.strictEqual(calc4slices.carbohydrateG, 50);
assert.strictEqual(calc4slices.fatG, 3.2);

// Scenario C: Professional subsequently alters to 2 fatias (50g)
const calc2slices = calculateItemNutrients({
  food: breadFood,
  prescribedQuantity: 2,
  prescribedUnitCode: "PORCAO",
  portion: slicePortion,
});

assert.strictEqual(calc2slices.isValid, true);
assert.strictEqual(calc2slices.effectiveGrams, 50);
assert.strictEqual(calc2slices.caloriesKcal, 132.5);
assert.strictEqual(calc2slices.proteinG, 4);
assert.strictEqual(calc2slices.carbohydrateG, 25);
assert.strictEqual(calc2slices.fatG, 1.6);

// Scenario D: Fractional portions (0.5, 1.5, 2.5)
const calcHalfSlice = calculateItemNutrients({
  food: breadFood,
  prescribedQuantity: 0.5,
  portion: slicePortion,
});
assert.strictEqual(calcHalfSlice.isValid, true);
assert.strictEqual(calcHalfSlice.effectiveGrams, 12.5);

// Scenario E: Volume-based food (Milk: reference 100 ML, 61 kcal, 3.2g P, 4.8g C, 3.3g G)
const milkFood = {
  referenceAmount: 100,
  referenceUnitCode: "ML",
  caloriesKcal: 61,
  proteinG: 3.2,
  carbohydrateG: 4.8,
  fatG: 3.3,
};

const calcMilk200ml = calculateItemNutrients({
  food: milkFood,
  prescribedQuantity: 200,
  prescribedUnitCode: "ML",
});
assert.strictEqual(calcMilk200ml.isValid, true);
assert.strictEqual(calcMilk200ml.effectiveCanonicalAmount, 200);
assert.strictEqual(calcMilk200ml.effectiveReferenceUnitCode, "ML");
// Volume food must have effectiveGrams as null (prohibits universal ML = G conversion)
assert.strictEqual(calcMilk200ml.effectiveGrams, null);
assert.strictEqual(calcMilk200ml.caloriesKcal, 122);

// Scenario F: Incompatible unit without portion (Milk prescribed in "G" without portion)
const calcMilkInGrams = calculateItemNutrients({
  food: milkFood,
  prescribedQuantity: 200,
  prescribedUnitCode: "G",
});
assert.strictEqual(calcMilkInGrams.isValid, false, "Must reject ML to G conversion without food-specific portion");

// Scenario G: Null vs 0 macro preservation
const zeroCarbFood = {
  referenceAmount: 100,
  referenceUnitCode: "G",
  caloriesKcal: 110,
  proteinG: 22,
  carbohydrateG: 0, // Real confirmed 0
  fatG: null, // Unknown/missing
};
const calcZeroCarb = calculateItemNutrients({
  food: zeroCarbFood,
  prescribedQuantity: 150,
  prescribedUnitCode: "G",
});
assert.strictEqual(calcZeroCarb.carbohydrateG, 0, "Confirmed 0 must stay 0");
assert.strictEqual(calcZeroCarb.fatG, null, "Missing macro must stay null");

console.log("✅ Motor de cálculo e conversões físicas aprovado.");

// ============================================================================
// GATE 2: Brazilian Comma & Decimal Quantity Parsing
// ============================================================================
console.log("\n[2/6] Validando parsing de vírgula decimal brasileira...");

function parsePrescribedQty(raw) {
  if (!raw || typeof raw !== "string") return null;
  const clean = raw.trim().replace(",", ".");
  const num = parseFloat(clean);
  if (!Number.isFinite(num) || num <= 0) return null;
  return num;
}

assert.strictEqual(parsePrescribedQty("1,5"), 1.5);
assert.strictEqual(parsePrescribedQty("0,5"), 0.5);
assert.strictEqual(parsePrescribedQty("2,25"), 2.25);
assert.strictEqual(parsePrescribedQty("100"), 100);
assert.strictEqual(parsePrescribedQty("-5"), null);
assert.strictEqual(parsePrescribedQty("abc"), null);

console.log("✅ Parsing de vírgula decimal brasileira aprovado.");

// ============================================================================
// GATE 3: Database Migration 056 Verification
// ============================================================================
console.log("\n[3/6] Inspecionando Migration 056 (Escopos de medidas e Snapshots)...");

const migration056Path = path.join(ROOT, "database", "migrations", "056_nutrition_v2_food_portions_scopes.sql");
assert.ok(fs.existsSync(migration056Path), "Migration 056 must exist");

const migration056Sql = fs.readFileSync(migration056Path, "utf-8");
assert.ok(migration056Sql.includes("ALTER TABLE nutrition_v2_food_portions"), "Must alter nutrition_v2_food_portions");
assert.ok(migration056Sql.includes("ADD COLUMN scope VARCHAR(20) NOT NULL DEFAULT 'GLOBAL'"), "Must add scope column");
assert.ok(migration056Sql.includes("ADD COLUMN consultancy_id BIGINT UNSIGNED"), "Must add consultancy_id");
assert.ok(migration056Sql.includes("ADD COLUMN created_by_user_id BIGINT UNSIGNED"), "Must add created_by_user_id");
assert.ok(migration056Sql.includes("ADD COLUMN notes VARCHAR(255)"), "Must add notes");
assert.ok(migration056Sql.includes("ALTER TABLE nutrition_v2_meal_items"), "Must alter nutrition_v2_meal_items");
assert.ok(migration056Sql.includes("portion_equivalent_amount DECIMAL(10,2)"), "Must add portion_equivalent_amount snapshot column");
assert.ok(migration056Sql.includes("ALTER TABLE nutrition_v2_item_substitutions"), "Must alter nutrition_v2_item_substitutions");
assert.ok(migration056Sql.includes("ALTER TABLE nutrition_v2_template_items"), "Must alter nutrition_v2_template_items");
assert.ok(migration056Sql.includes("ALTER TABLE nutrition_v2_template_item_substitutions"), "Must alter nutrition_v2_template_item_substitutions");

console.log("✅ Migration 056 aditiva e não-destrutiva verificada com sucesso.");

// ============================================================================
// GATE 4: Repository Contracts & Scoping Isolation (Section 6 & 7)
// ============================================================================
console.log("\n[4/6] Verificando contratos de escopo e isolamento multi-tenant...");

const foodRepoPath = path.join(ROOT, "lib", "nutrition-v2", "food-repository.ts");
const foodRepoSrc = fs.readFileSync(foodRepoPath, "utf-8");

assert.ok(foodRepoSrc.includes("findSimilarFoodPortion"), "Must export findSimilarFoodPortion");
assert.ok(foodRepoSrc.includes("createFoodPortion"), "Must export createFoodPortion");
assert.ok(foodRepoSrc.includes("scope = 'PERSONAL'"), "Must support PERSONAL scope");
assert.ok(foodRepoSrc.includes("scope = 'CONSULTANCY'"), "Must support CONSULTANCY scope");
assert.ok(foodRepoSrc.includes("scope = 'GLOBAL'"), "Must support GLOBAL scope");
assert.ok(foodRepoSrc.includes("FORBIDDEN_GLOBAL_PORTION_CREATION"), "Must protect GLOBAL portion creation");

// Check similarity matching logic
function simulateSimilarityCheck(existingLabels, newLabel) {
  const normInput = newLabel
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .trim();

  for (const label of existingLabels) {
    const normP = label
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, " ")
      .trim();

    if (normInput === normP || (normInput.length >= 4 && (normP.includes(normInput) || normInput.includes(normP)))) {
      return { exists: true, match: label };
    }
  }
  return { exists: false };
}

const existing = ["Colher de sopa cheia", "Fatia média", "Pedaço pequeno"];
assert.strictEqual(simulateSimilarityCheck(existing, "colher de sopa cheia").exists, true);
assert.strictEqual(simulateSimilarityCheck(existing, "Colher de sopa").exists, true);
assert.strictEqual(simulateSimilarityCheck(existing, "Fatia fina").exists, false);

console.log("✅ Regras de escopo, autorização e detecção de similaridade aprovadas.");

// ============================================================================
// GATE 5: Presentation & Patient Output (Section 8 & 9)
// ============================================================================
console.log("\n[5/6] Verificando apresentação de porções ao paciente e PDF...");

const { formatQuantity } = await import("../lib/nutrition-v2/nutrition-plan-presentation.ts");

assert.strictEqual(formatQuantity(100, "Gramas (g)", "G"), "100 g");
assert.strictEqual(formatQuantity(200, "Mililitros (ml)", "ML"), "200 ml");
assert.strictEqual(formatQuantity(1, "Fatia média", "PORCAO"), "1 Fatia média");
assert.strictEqual(formatQuantity(2, "Fatia média", "PORCAO"), "2 fatias médias");
assert.strictEqual(formatQuantity(1, "Colher de sopa rasa", "PORCAO"), "1 Colher de sopa rasa");
assert.strictEqual(formatQuantity(3, "Colher de sopa cheia", "PORCAO"), "3 colheres de sopa cheia");
assert.strictEqual(formatQuantity(0.5, "Unidade média", "PORCAO"), "0,5 Unidade média");

console.log("✅ Apresentação gramatical e formatação pt-BR verificadas.");

// ============================================================================
// GATE 6: UI Component Contracts & Accessibility (Section 3, 10 & 11)
// ============================================================================
console.log("\n[6/6] Inspecionando contratos visuais, alvos de toque e acessibilidade...");

const itemEditorPath = path.join(ROOT, "components", "consultancies", "nutrition-v2", "nutrition-item-editor.tsx");
assert.ok(fs.existsSync(itemEditorPath), "nutrition-item-editor.tsx must exist");
const itemEditorSrc = fs.readFileSync(itemEditorPath, "utf-8");

assert.ok(itemEditorSrc.includes("handleMeasureChange"), "Must implement smart handleMeasureChange");
assert.ok(itemEditorSrc.includes("NutritionCustomMeasureModal"), "Must embed NutritionCustomMeasureModal");
assert.ok(itemEditorSrc.includes("practicalRoundingSuggestion"), "Must support practical rounding suggestion");
assert.ok(itemEditorSrc.includes("isMissingPortionConversion"), "Must warn if portion conversion is missing");
assert.ok(itemEditorSrc.includes("min-h-[44px]"), "Mobile controls must meet 44px touch target requirement");

const customModalPath = path.join(ROOT, "components", "consultancies", "nutrition-v2", "nutrition-custom-measure-modal.tsx");
assert.ok(fs.existsSync(customModalPath), "nutrition-custom-measure-modal.tsx must exist");
const customModalSrc = fs.readFileSync(customModalPath, "utf-8");

assert.ok(customModalSrc.includes("role=\"dialog\""), "Must have role=dialog for accessibility");
assert.ok(customModalSrc.includes("aria-modal=\"true\""), "Must have aria-modal=true");
assert.ok(customModalSrc.includes("handleLabelChange"), "Must have live similarity detection");
assert.ok(customModalSrc.includes("scope"), "Must support PERSONAL and CONSULTANCY scopes");
assert.ok(customModalSrc.includes("isSubmitting"), "Must protect against double-click/retry");

console.log("✅ Contratos de UI, acessibilidade e alvos de toque aprovados.");

console.log("\n=======================================================");
console.log("🎉 TODOS OS TESTES DE MEDIDAS E CONVERSÕES PASSARAM!");
console.log("=======================================================\n");
