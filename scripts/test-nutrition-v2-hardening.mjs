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

console.log("=== INICIANDO SUÍTE DE TESTES: HARDENING FINAL (NUTRITION V2 & FOOD LIBRARY) ===\n");

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
    // SETUP FIXTURE FOODS FOR RECIPE TESTS
    // ------------------------------------------------------------------------
    // Food A: 100g -> 200 kcal, 20g P, 10g C, 5g G, 50mg Sodium
    const foodAPid = crypto.randomUUID();
    createdFoodPublicIds.push(foodAPid);
    const [insA] = await pool.query(
      `INSERT INTO nutrition_v2_foods (
        public_id, scope, consultancy_id, name, display_name_pt_br, normalized_name,
        reference_amount, reference_unit_code, calories_kcal, protein_g, carbohydrate_g, fat_g, fiber_g,
        status, source_type, data_quality, source_key, created_at, updated_at
      ) VALUES (?, 'CONSULTANCY', ?, 'Ingrediente Teste A', 'Ingrediente Teste A', 'ingrediente teste a',
        100, 'G', 200, 20, 10, 5, 2, 'ACTIVE', 'PROFESSIONAL_UPLOAD', 'PROFESSIONAL_CONFIRMED', 'TEST', NOW(3), NOW(3))`,
      [foodAPid, ctx.consultancyId]
    );
    await pool.query(
      `INSERT INTO nutrition_v2_food_nutrients (food_id, nutrient_code, amount_per_reference, unit_code, status, created_at, updated_at)
       VALUES (?, 'NA', 50, 'MG', 'KNOWN', NOW(3), NOW(3))`,
      [insA.insertId]
    );

    // Food B: 100g -> 100 kcal, 5g P, 15g C, 2g G, 100mg Sodium
    const foodBPid = crypto.randomUUID();
    createdFoodPublicIds.push(foodBPid);
    const [insB] = await pool.query(
      `INSERT INTO nutrition_v2_foods (
        public_id, scope, consultancy_id, name, display_name_pt_br, normalized_name,
        reference_amount, reference_unit_code, calories_kcal, protein_g, carbohydrate_g, fat_g, fiber_g,
        status, source_type, data_quality, source_key, created_at, updated_at
      ) VALUES (?, 'CONSULTANCY', ?, 'Ingrediente Teste B', 'Ingrediente Teste B', 'ingrediente teste b',
        100, 'G', 100, 5, 15, 2, 1, 'ACTIVE', 'PROFESSIONAL_UPLOAD', 'PROFESSIONAL_CONFIRMED', 'TEST', NOW(3), NOW(3))`,
      [foodBPid, ctx.consultancyId]
    );
    await pool.query(
      `INSERT INTO nutrition_v2_food_nutrients (food_id, nutrient_code, amount_per_reference, unit_code, status, created_at, updated_at)
       VALUES (?, 'NA', 100, 'MG', 'KNOWN', NOW(3), NOW(3))`,
      [insB.insertId]
    );

    // Find another real consultancy for cross-tenant test
    const [otherConsultancyRows] = await pool.query(
      `SELECT id FROM consultancies WHERE id != ? LIMIT 1`,
      [ctx.consultancyId]
    );
    const otherConsultancyId = otherConsultancyRows.length > 0 ? otherConsultancyRows[0].id : null;

    let foodCrossPid = null;
    if (otherConsultancyId) {
      foodCrossPid = crypto.randomUUID();
      createdFoodPublicIds.push(foodCrossPid);
      await pool.query(
        `INSERT INTO nutrition_v2_foods (
          public_id, scope, consultancy_id, name, display_name_pt_br, normalized_name,
          reference_amount, reference_unit_code, calories_kcal, protein_g, carbohydrate_g, fat_g,
          status, source_type, data_quality, source_key, created_at, updated_at
        ) VALUES (?, 'CONSULTANCY', ?, 'Alimento Outra Consultoria', 'Alimento Outra Consultoria', 'alimento outra consultoria',
          100, 'G', 150, 10, 10, 5, 'ACTIVE', 'PROFESSIONAL_UPLOAD', 'PROFESSIONAL_CONFIRMED', 'TEST', NOW(3), NOW(3))`,
        [foodCrossPid, otherConsultancyId]
      );
    }

    // Food Inactive / Archived:
    const foodArchivedPid = crypto.randomUUID();
    createdFoodPublicIds.push(foodArchivedPid);
    await pool.query(
      `INSERT INTO nutrition_v2_foods (
        public_id, scope, consultancy_id, name, display_name_pt_br, normalized_name,
        reference_amount, reference_unit_code, calories_kcal, protein_g, carbohydrate_g, fat_g,
        status, source_type, data_quality, source_key, created_at, updated_at, deleted_at
      ) VALUES (?, 'CONSULTANCY', ?, 'Alimento Arquivado', 'Alimento Arquivado', 'alimento arquivado',
        100, 'G', 150, 10, 10, 5, 'INACTIVE', 'PROFESSIONAL_UPLOAD', 'PROFESSIONAL_CONFIRMED', 'TEST', NOW(3), NOW(3), NOW(3))`,
      [foodArchivedPid, ctx.consultancyId]
    );

    // ------------------------------------------------------------------------
    // TEST 1: RECIPE SERVER AUTHORITY & CLIENT MACRO TAMPERING BLOCKED
    // ------------------------------------------------------------------------
    console.log("\n[Test 1] Recipe Server Authority & Client Macro Tampering Blocked...");
    // Client passes ONLY foodPublicId, quantity, unitCode
    // Even if client attempted to tamper with forged macros (e.g. caloriesKcal: 9999), server computes real values from DB!
    const recipeRes = await registerRecipeFood(ctx, {
      name: "Receita Teste Hardening " + Date.now(),
      servingsYield: 2,
      ingredients: [
        {
          foodPublicId: foodAPid,
          quantity: 100,
          unitCode: "G",
          // Forged fields that a malicious client might try to send:
          caloriesKcal: 9999,
          proteinG: 9999,
        },
        {
          foodPublicId: foodBPid,
          quantity: 100,
          unitCode: "G",
          caloriesKcal: 8888,
        },
      ],
    });

    assert.ok(recipeRes.publicId, "Must create recipe food");
    createdFoodPublicIds.push(recipeRes.publicId);

    // Expected authoritative server calculation:
    // Food A (100g) = 200 kcal, 20g P, 10g C, 5g G, 2g Fiber
    // Food B (100g) = 100 kcal, 5g P, 15g C, 2g G, 1g Fiber
    // Total = 300 kcal, 25g P, 25g C, 7g G, 3g Fiber
    // Per serving (yield 2):
    // Kcal = 150, P = 12.5, C = 12.5, G = 3.5, Fiber = 1.5
    assert.equal(recipeRes.caloriesKcal, 150, "Server must compute 150 kcal (ignoring 9999/8888 client tamper)");
    assert.equal(recipeRes.proteinG, 12.5, "Server must compute 12.5g P");
    assert.equal(recipeRes.carbohydrateG, 12.5, "Server must compute 12.5g C");
    assert.equal(recipeRes.fatG, 3.5, "Server must compute 3.5g G");
    assert.equal(recipeRes.fiberG, 1.5, "Server must compute 1.5g Fiber");
    console.log("  PASS: Client macro tampering blocked; server is 100% authoritative.");

    // ------------------------------------------------------------------------
    // TEST 2: RECIPE MICRONUTRIENT AGGREGATION (SODIUM NA PERSISTED)
    // ------------------------------------------------------------------------
    console.log("\n[Test 2] Recipe Micronutrients (Sodium NA) Aggregation and Persistence...");
    // Food A has 50mg NA, Food B has 100mg NA. Total = 150mg NA.
    // Per serving (yield 2) = 75mg NA!
    assert.equal(recipeRes.sodiumMg, 75, "Per serving sodium must be 75mg");

    const [dbNutrients] = await pool.query(
      `SELECT n.* FROM nutrition_v2_food_nutrients n
       JOIN nutrition_v2_foods f ON f.id = n.food_id
       WHERE f.public_id = ? AND n.nutrient_code = 'NA'`,
      [recipeRes.publicId]
    );
    assert.equal(dbNutrients.length, 1, "Recipe must have NA nutrient row in nutrition_v2_food_nutrients");
    assert.equal(Number(dbNutrients[0].amount_per_reference), 75, "Stored sodium must be exactly 75mg");
    assert.equal(dbNutrients[0].status, "KNOWN", "Sodium status must be KNOWN");
    console.log("  PASS: Recipe aggregated and persisted 75mg Sodium (NA) into canonical table.");

    // ------------------------------------------------------------------------
    // TEST 3: CROSS-TENANT RECIPE FOOD: STRICTLY BLOCKED
    // ------------------------------------------------------------------------
    console.log("\n[Test 3] Cross-Tenant Recipe Food: Strictly Blocked...");
    if (foodCrossPid) {
      let crossTenantBlocked = false;
      try {
        await registerRecipeFood(ctx, {
          name: "Receita Cross Tenant",
          servingsYield: 1,
          ingredients: [
            {
              foodPublicId: foodCrossPid,
              quantity: 100,
              unitCode: "G",
            },
          ],
        });
      } catch (err) {
        crossTenantBlocked = true;
        assert.match(err.message, /outra consultoria/i, "Error message must indicate cross-tenant rejection");
      }
      assert.equal(crossTenantBlocked, true, "Cross-tenant ingredient must throw authorization error");
      console.log("  PASS: Cross-tenant food in recipe strictly blocked (403/rejection).");
    } else {
      console.log("  SKIP: Apenas uma consultoria no banco, cross-tenant test skipped.");
    }

    // ------------------------------------------------------------------------
    // TEST 4: ARCHIVED / DELETED FOOD: STRICTLY BLOCKED
    // ------------------------------------------------------------------------
    console.log("\n[Test 4] Archived/Deleted Food: Strictly Blocked...");
    let archivedBlocked = false;
    try {
      await registerRecipeFood(ctx, {
        name: "Receita Com Alimento Arquivado",
        servingsYield: 1,
        ingredients: [
          {
            foodPublicId: foodArchivedPid,
            quantity: 100,
            unitCode: "G",
          },
        ],
      });
    } catch (err) {
      archivedBlocked = true;
      assert.match(err.message, /arquivado|excluído|inativo/i);
    }
    assert.equal(archivedBlocked, true, "Archived/deleted food must be rejected");
    console.log("  PASS: Archived/deleted food in recipe strictly blocked.");

    // ------------------------------------------------------------------------
    // TEST 5: UNKNOWN != ZERO PRESERVED IN RECIPE AND MANUAL FOOD
    // ------------------------------------------------------------------------
    console.log("\n[Test 5] UNKNOWN != ZERO Preserved (Null vs Zero)...");
    // Food with known_zero protein (0.00) and unknown carbs (null)
    const foodNullPid = crypto.randomUUID();
    createdFoodPublicIds.push(foodNullPid);
    await pool.query(
      `INSERT INTO nutrition_v2_foods (
        public_id, scope, consultancy_id, name, display_name_pt_br, normalized_name,
        reference_amount, reference_unit_code, calories_kcal, protein_g, carbohydrate_g, fat_g,
        status, source_type, data_quality, source_key, created_at, updated_at
      ) VALUES (?, 'CONSULTANCY', ?, 'Alimento Zero e Null', 'Alimento Zero e Null', 'alimento zero e null',
        100, 'G', 100, 0.00, NULL, 5, 'ACTIVE', 'PROFESSIONAL_UPLOAD', 'PROFESSIONAL_CONFIRMED', 'TEST', NOW(3), NOW(3))`,
      [foodNullPid, ctx.consultancyId]
    );

    const recipeNullRes = await registerRecipeFood(ctx, {
      name: "Receita Zero e Null " + Date.now(),
      servingsYield: 1,
      ingredients: [
        {
          foodPublicId: foodNullPid,
          quantity: 100,
          unitCode: "G",
        },
      ],
    });
    createdFoodPublicIds.push(recipeNullRes.publicId);

    assert.equal(recipeNullRes.proteinG, 0, "Known zero protein must remain 0");
    assert.equal(recipeNullRes.carbohydrateG, null, "Unknown carbs must remain NULL (never turned to 0)");

    // Manual registration without filling sodium or carbs
    const manualNullRes = await registerFoodManually(ctx, {
      name: "Alimento Parcial " + Date.now(),
      referenceAmount: 100,
      referenceUnitCode: "G",
      caloriesKcal: 120,
      proteinG: 10,
      carbohydrateG: null, // UNKNOWN
      fatG: 0, // KNOWN_ZERO
      sodiumMg: null, // UNKNOWN
      dataSource: "MANUAL",
    });
    createdFoodPublicIds.push(manualNullRes.publicId);

    assert.equal(manualNullRes.fatG, 0, "Known zero fat must be 0");
    assert.equal(manualNullRes.carbohydrateG, null, "Unknown carbs must be null");
    assert.equal(manualNullRes.sodiumMg, null, "Unknown sodium must be null");
    console.log("  PASS: UNKNOWN != ZERO strictly preserved across all operations.");

    // ------------------------------------------------------------------------
    // TEST 6: SODIUM PERSISTENCE IN MANUAL AND LABEL REGISTRATION
    // ------------------------------------------------------------------------
    console.log("\n[Test 6] Sodium and Micronutrients Persistence in Manual and Label Registration...");
    const manualWithSodium = await registerFoodManually(ctx, {
      name: "Alimento Com Sódio " + Date.now(),
      referenceAmount: 100,
      referenceUnitCode: "G",
      caloriesKcal: 150,
      proteinG: 12,
      carbohydrateG: 20,
      fatG: 3,
      fiberG: 2.5,
      sodiumMg: 280,
      dataSource: "FABRICANTE",
    });
    createdFoodPublicIds.push(manualWithSodium.publicId);

    const [dbManualNa] = await pool.query(
      `SELECT n.* FROM nutrition_v2_food_nutrients n
       JOIN nutrition_v2_foods f ON f.id = n.food_id
       WHERE f.public_id = ? AND n.nutrient_code = 'NA'`,
      [manualWithSodium.publicId]
    );
    assert.equal(dbManualNa.length, 1, "Manual food must have NA row");
    assert.equal(Number(dbManualNa[0].amount_per_reference), 280);
    assert.equal(dbManualNa[0].status, "KNOWN");

    const labelWithZeroSodium = await registerFoodFromLabel(ctx, {
      name: "Alimento Rótulo Zero Sódio " + Date.now(),
      servingAmount: 50,
      servingUnitCode: "G",
      caloriesKcal: 80,
      proteinG: 2,
      carbohydrateG: 18,
      fatG: 0.5,
      sodiumMg: 0, // KNOWN_ZERO sodium
      labelNotes: "Rótulo 0% sódio",
    });
    createdFoodPublicIds.push(labelWithZeroSodium.publicId);

    const [dbLabelNa] = await pool.query(
      `SELECT n.* FROM nutrition_v2_food_nutrients n
       JOIN nutrition_v2_foods f ON f.id = n.food_id
       WHERE f.public_id = ? AND n.nutrient_code = 'NA'`,
      [labelWithZeroSodium.publicId]
    );
    assert.equal(dbLabelNa.length, 1, "Label food must have NA row");
    assert.equal(Number(dbLabelNa[0].amount_per_reference), 0);
    assert.equal(dbLabelNa[0].status, "KNOWN_ZERO");
    console.log("  PASS: Sodium persisted with KNOWN (280mg) and KNOWN_ZERO (0mg) correctly.");

    // ------------------------------------------------------------------------
    // TEST 7: PROVENANCE PRESERVATION
    // ------------------------------------------------------------------------
    console.log("\n[Test 7] Provenance Preservation across all food types...");
    const [dbRecipeCheck] = await pool.query(`SELECT * FROM nutrition_v2_foods WHERE public_id = ?`, [recipeRes.publicId]);
    assert.equal(dbRecipeCheck[0].source_key, "RECIPE");
    assert.equal(dbRecipeCheck[0].data_quality, "PROFESSIONAL_CONFIRMED");
    assert.equal(dbRecipeCheck[0].scope, "CONSULTANCY");

    const [dbManualCheck] = await pool.query(`SELECT * FROM nutrition_v2_foods WHERE public_id = ?`, [manualWithSodium.publicId]);
    assert.equal(dbManualCheck[0].source_key, "FABRICANTE");
    assert.equal(dbManualCheck[0].data_quality, "PROFESSIONAL_CONFIRMED");

    const [dbLabelCheck] = await pool.query(`SELECT * FROM nutrition_v2_foods WHERE public_id = ?`, [labelWithZeroSodium.publicId]);
    assert.equal(dbLabelCheck[0].source_key, "PRODUCT_LABEL");
    assert.equal(dbLabelCheck[0].data_quality, "LABEL_CONFIRMED");
    console.log("  PASS: Provenance fields strictly preserved with exact source keys and quality tags.");

  } finally {
    // Cleanup fixtures
    for (const pid of createdFoodPublicIds) {
      await pool.query(
        `DELETE FROM nutrition_v2_food_nutrients WHERE food_id IN (SELECT id FROM nutrition_v2_foods WHERE public_id = ?)`,
        [pid]
      );
      await pool.query(
        `DELETE FROM nutrition_v2_food_portions WHERE food_id IN (SELECT id FROM nutrition_v2_foods WHERE public_id = ?)`,
        [pid]
      );
      await pool.query(`DELETE FROM nutrition_v2_foods WHERE public_id = ?`, [pid]);
    }
    console.log("\n[Cleanup] Todos os registros de teste foram removidos.");
    await pool.end();
  }

  console.log("\n==================================================================");
  console.log("HARDENING FINAL: TODOS OS 7 TESTES PASSARAM COM 100% DE SUCESSO!");
  console.log("==================================================================");
}

run().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
