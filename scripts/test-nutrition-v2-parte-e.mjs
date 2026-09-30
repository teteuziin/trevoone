import assert from "node:assert/strict";
import fs from "node:fs";
import mysql from "mysql2/promise";

function loadEnv() {
  const content = fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "";
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq !== -1) env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

const env = loadEnv();
process.env.DB_HOST = env.DB_HOST;
process.env.DB_USER = env.DB_USER;
process.env.DB_PASSWORD = env.DB_PASSWORD;
process.env.DB_NAME = env.DB_NAME;
process.env.DB_PORT = env.DB_PORT || "3306";

const {
  registerFoodManually,
  registerFoodFromLabel,
  registerRecipeFood,
} = await import("../lib/nutrition-v2/food-repository.ts");

console.log("=== TEST: PARTE E - QUALQUER ALIMENTO NO TREVO ONE (SEM DEPENDER DO IBGE) ===");

function makeContext({
  userId = 1,
  consultancyId = 1,
  consultancyPublicId = "test-consultancy",
  roles = ["NUTRITIONIST"],
} = {}) {
  const hasRole = (r) => roles.includes(r);
  return {
    userId,
    userPublicId: `usr-${userId}`,
    isPlatformAdmin: false,
    consultancyId,
    consultancyPublicId,
    consultancySlug: `consultancy-${consultancyId}`,
    membershipId: 1,
    membershipPublicId: `mem-${userId}`,
    roles,
    hasRole,
    canAuthorNutrition: true,
    canViewNutrition: true,
    canManageConsultancy: true,
    canManageGlobal: false,
    isStudent: false,
  };
}

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  const [mRows] = await pool.query(
    `SELECT cm.id as membership_id, cm.consultancy_id, cm.user_id, c.slug, c.public_id as consultancy_public_id
     FROM consultancy_members cm
     JOIN consultancies c ON c.id = cm.consultancy_id
     WHERE cm.status = 'ACTIVE'
     LIMIT 1`
  );

  if (!mRows || mRows.length === 0) {
    console.log("No active membership found. Skipping.");
    await pool.end();
    return;
  }

  const row = mRows[0];
  console.log("Using consultancy:", row.slug, "membership:", row.membership_id);

  const ctx = makeContext({
    userId: row.user_id,
    consultancyId: row.consultancy_id,
    consultancyPublicId: row.consultancy_public_id,
  });

  const createdFoodPublicIds = [];

  try {
    // ------------------------------------------------------------------------
    // TEST 1: CADASTRO MANUAL COM PROVENIENCIA
    // ------------------------------------------------------------------------
    console.log("\n[Test 1] Cadastrar alimento manualmente...");
    const manualResult = await registerFoodManually(ctx, {
      name: "Iogurte Proteico Caseiro " + Date.now(),
      brand: "Fabricacao Propria",
      category: "Laticinios",
      referenceAmount: 150,
      referenceUnitCode: "G",
      caloriesKcal: 120,
      proteinG: 15,
      carbohydrateG: 8,
      fatG: 2,
      fiberG: 0,
      sodiumMg: 50,
      dataSource: "FABRICANTE",
      sourceReference: "Laudo tecnico laboratorial Lote 442",
    });

    assert.ok(manualResult?.publicId, "Must return publicId");
    createdFoodPublicIds.push(manualResult.publicId);

    // Verify in DB
    const [dbManual] = await pool.query(
      `SELECT * FROM nutrition_v2_foods WHERE public_id = ?`,
      [manualResult.publicId]
    );
    assert.equal(dbManual.length, 1);
    assert.equal(dbManual[0].scope, "CONSULTANCY");
    assert.equal(Number(dbManual[0].calories_kcal), 120);
    assert.equal(Number(dbManual[0].protein_g), 15);
    assert.equal(Number(dbManual[0].carbohydrate_g), 8);
    assert.equal(Number(dbManual[0].fat_g), 2);
    assert.equal(dbManual[0].source_key, "FABRICANTE");
    assert.equal(dbManual[0].data_quality, "PROFESSIONAL_CONFIRMED");
    console.log("  PASS: Alimento manual cadastrado e persistido com proveniencia completa.");

    // ------------------------------------------------------------------------
    // TEST 2: CADASTRO PELO ROTULO COM MEDIDA CASEIRA
    // ------------------------------------------------------------------------
    console.log("\n[Test 2] Cadastrar alimento transcrito de rotulo...");
    const labelResult = await registerFoodFromLabel(ctx, {
      name: "Pao de Graos Especiais " + Date.now(),
      brand: "Padaria Artesanal",
      servingAmount: 50,
      servingUnitCode: "G",
      servingHouseholdMeasure: "2 fatias",
      caloriesKcal: 130,
      proteinG: 6,
      carbohydrateG: 22,
      fatG: 1.5,
      fiberG: 3.5,
      sodiumMg: 140,
      labelNotes: "Transcrito da tabela nutricional da embalagem",
    });

    assert.ok(labelResult?.publicId, "Must return publicId");
    createdFoodPublicIds.push(labelResult.publicId);

    const [dbLabel] = await pool.query(
      `SELECT f.*, p.label as portion_label, p.equivalent_reference_amount
       FROM nutrition_v2_foods f
       LEFT JOIN nutrition_v2_food_portions p ON p.food_id = f.id
       WHERE f.public_id = ?`,
      [labelResult.publicId]
    );
    assert.equal(dbLabel.length, 1);
    assert.equal(dbLabel[0].source_key, "PRODUCT_LABEL");
    assert.equal(dbLabel[0].data_quality, "LABEL_CONFIRMED");
    assert.equal(dbLabel[0].portion_label, "2 fatias");
    assert.equal(Number(dbLabel[0].equivalent_reference_amount), 50);
    console.log("  PASS: Alimento de rotulo cadastrado com medida caseira '2 fatias' em porcoes.");

    // ------------------------------------------------------------------------
    // TEST 3: CRIADOR DE RECEITAS COM AUTORIDADE DO SERVIDOR (CALCULO EXATO)
    // ------------------------------------------------------------------------
    console.log("\n[Test 3] Criar receita com autoridade server-side dos ingredientes...");
    // Manual food (ref 150g): 120 kcal, 15g P, 8g C, 2g G, 50mg Sodium
    // Label food (ref 50g): 130 kcal, 6g P, 22g C, 1.5g G, 140mg Sodium
    // Using 150g manual food + 50g label food, yield 2:
    // Total: Kcal = 250 -> Per serving = 125
    // P = 21 -> Per serving = 10.5
    // C = 30 -> Per serving = 15
    // G = 3.5 -> Per serving = 1.8
    // NA = 190 -> Per serving = 95
    const recipeResult = await registerRecipeFood(ctx, {
      name: "Receita Fit " + Date.now(),
      servingsYield: 2,
      ingredients: [
        {
          foodPublicId: manualResult.publicId,
          quantity: 150,
          unitCode: "G",
        },
        {
          foodPublicId: labelResult.publicId,
          quantity: 50,
          unitCode: "G",
        },
      ],
    });

    assert.ok(recipeResult?.publicId, "Must return publicId");
    createdFoodPublicIds.push(recipeResult.publicId);

    assert.equal(recipeResult.caloriesKcal, 125);
    assert.equal(recipeResult.proteinG, 10.5);
    assert.equal(recipeResult.carbohydrateG, 15);
    assert.equal(recipeResult.fatG, 1.8);
    assert.equal(recipeResult.sodiumMg, 95);

    const [dbRecipe] = await pool.query(
      `SELECT * FROM nutrition_v2_foods WHERE public_id = ?`,
      [recipeResult.publicId]
    );
    assert.equal(dbRecipe.length, 1);
    assert.equal(dbRecipe[0].source_key, "RECIPE");
    assert.equal(Number(dbRecipe[0].calories_kcal), 125);
    assert.equal(Number(dbRecipe[0].protein_g), 10.5);
    assert.equal(Number(dbRecipe[0].carbohydrate_g), 15);
    assert.equal(Number(dbRecipe[0].fat_g), 1.8);

    const [dbRecipeNa] = await pool.query(
      `SELECT * FROM nutrition_v2_food_nutrients WHERE food_id = ? AND nutrient_code = 'NA'`,
      [dbRecipe[0].id]
    );
    assert.equal(dbRecipeNa.length, 1);
    assert.equal(Number(dbRecipeNa[0].amount_per_reference), 95);
    console.log("  PASS: Receita calculou macros e sodio por porcao com autoridade do servidor (sem alucinacao).");

    // ------------------------------------------------------------------------
    // TEST 4: NEGATIVE VALUES REJECTED (INVARIANT SAFETY)
    // ------------------------------------------------------------------------
    console.log("\n[Test 4] Validar que macros negativos sao categoricamente rejeitados...");
    let rejected = false;
    try {
      await registerFoodManually(ctx, {
        name: "Alimento Invalido",
        referenceAmount: 100,
        referenceUnitCode: "G",
        caloriesKcal: -50,
        proteinG: 10,
        carbohydrateG: 10,
        fatG: 2,
        dataSource: "OUTRA",
      });
    } catch {
      rejected = true;
    }
    assert.equal(rejected, true, "Negative kcal must throw error");
    console.log("  PASS: Valores nutricionais negativos foram categoricamente rejeitados.");

  } finally {
    // Cleanup created test foods
    for (const pid of createdFoodPublicIds) {
      await pool.query(
        `DELETE FROM nutrition_v2_food_portions WHERE food_id IN (SELECT id FROM nutrition_v2_foods WHERE public_id = ?)`,
        [pid]
      );
      await pool.query(`DELETE FROM nutrition_v2_foods WHERE public_id = ?`, [pid]);
    }
    console.log("\n[Cleanup] Test fixtures removidos com sucesso.");
    await pool.end();
  }

  console.log("\n=== PARTE E: TODOS OS 4 TESTES PASSARAM COM 100% DE SUCESSO! ===");
}

run().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
