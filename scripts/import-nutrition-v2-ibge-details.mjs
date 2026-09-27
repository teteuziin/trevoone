import mysql from "mysql2/promise";
import crypto from "node:crypto";
import fs from "node:fs";

const env = {};
fs.readFileSync(".env.local", "utf8").split("\n").forEach(l => {
  const [k, v] = l.trim().split("=");
  if (k && v) env[k.trim()] = v.trim();
});

const DEV_DB_NAME = "u406031981_trevoone_dev";
const EXPECTED_HOST = "srv1595.hstgr.io";

if (env.DB_HOST !== EXPECTED_HOST) {
  throw new Error(`Invalid host: ${env.DB_HOST}`);
}
if (env.DB_NAME !== DEV_DB_NAME) {
  throw new Error(`ABSOLUTE SAFETY GUARD: target is NOT DEV: ${env.DB_NAME}`);
}

const isApply = process.argv.includes("--apply");

const dataset = JSON.parse(fs.readFileSync("data/nutrition/ibge-pof-2008-2009.json", "utf8"));
const measuresData = JSON.parse(fs.readFileSync("data/nutrition/ibge-household-measures.json", "utf8"));

const pool = mysql.createPool({
  host: env.DB_HOST,
  port: Number(env.DB_PORT) || 3306,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 4
});

const NUTR_MAP = {
  calcium_mg: { code: "CA", unit: "mg" },
  iron_mg: { code: "FE", unit: "mg" },
  magnesium_mg: { code: "MG", unit: "mg" },
  phosphorus_mg: { code: "P", unit: "mg" },
  potassium_mg: { code: "K", unit: "mg" },
  sodium_mg: { code: "NA", unit: "mg" },
  zinc_mg: { code: "ZN", unit: "mg" },
  vitamin_a_mcg: { code: "VIT_A", unit: "mcg" },
  vitamin_c_mg: { code: "VIT_C", unit: "mg" },
  vitamin_d_mcg: { code: "VIT_D", unit: "mcg" },
  vitamin_e_mg: { code: "VIT_E", unit: "mg" },
  vitamin_b1_mg: { code: "VIT_B1", unit: "mg" },
  vitamin_b2_mg: { code: "VIT_B2", unit: "mg" },
  vitamin_b3_mg: { code: "VIT_B3", unit: "mg" },
  vitamin_b6_mg: { code: "VIT_B6", unit: "mg" },
  folate_mcg: { code: "FOLATE", unit: "mcg" },
  vitamin_b12_mcg: { code: "VIT_B12", unit: "mcg" }
};

async function main() {
  console.log("=== ENRICHING IBGE FOODS WITH NUTRIENTS & HOUSEHOLD MEASURES ===");
  console.log("Target DB:", env.DB_NAME);
  console.log("Mode:", isApply ? "APPLY (Write to DEV DB)" : "DRY RUN");

  const [foods] = await pool.query("SELECT id, source_external_code FROM nutrition_v2_foods WHERE source_key = 'IBGE'");
  console.log(`IBGE foods found in DB: ${foods.length}`);

  const foodMap = new Map();
  foods.forEach(f => foodMap.set(f.source_external_code, f.id));

  const nutrientRows = [];
  const portionRows = [];

  for (const item of dataset.foods) {
    const foodId = foodMap.get(item.source_external_code);
    if (!foodId) continue;

    // Micronutrients
    if (item.micronutrients) {
      for (const [key, mapping] of Object.entries(NUTR_MAP)) {
        const val = item.micronutrients[key];
        if (val !== null && val !== undefined) {
          const num = Number(val);
          const status = num > 0 ? "KNOWN" : "KNOWN_ZERO";
          nutrientRows.push([
            foodId,
            mapping.code,
            num,
            mapping.unit,
            status
          ]);
        }
      }
    }

    // Household measures
    const portions = measuresData.measures[item.source_external_code];
    if (portions && portions.length > 0) {
      portions.forEach((p, idx) => {
        portionRows.push([
          crypto.randomUUID(),
          foodId,
          p.label.slice(0, 100),
          p.grams,
          idx + 1,
          "ACTIVE"
        ]);
      });
    }
  }

  console.log(`Nutrient rows prepared: ${nutrientRows.length}`);
  console.log(`Portion rows prepared: ${portionRows.length}`);

  if (!isApply) {
    console.log("DRY RUN completed. Run with --apply to insert into DEV DB.");
    await pool.end();
    return;
  }

  // Insert Nutrients in batches of 500
  console.log("\nInserting nutrients in batches of 500...");
  const batchSize = 500;
  let insertedNutr = 0;
  for (let i = 0; i < nutrientRows.length; i += batchSize) {
    const chunk = nutrientRows.slice(i, i + batchSize);
    const placeholders = chunk.map(() => "(?, ?, ?, ?, ?)").join(", ");
    const flat = chunk.flat();
    await pool.query(
      `INSERT INTO nutrition_v2_food_nutrients (food_id, nutrient_code, amount_per_reference, unit_code, status)
       VALUES ${placeholders}
       ON DUPLICATE KEY UPDATE amount_per_reference = VALUES(amount_per_reference), status = VALUES(status)`,
      flat
    );
    insertedNutr += chunk.length;
  }
  console.log(`✓ Nutrients inserted: ${insertedNutr}`);

  // Insert Portions in batches of 500
  console.log("\nInserting portions in batches of 500...");
  let insertedPort = 0;
  for (let i = 0; i < portionRows.length; i += batchSize) {
    const chunk = portionRows.slice(i, i + batchSize);
    const placeholders = chunk.map(() => "(?, ?, ?, ?, ?, ?)").join(", ");
    const flat = chunk.flat();
    await pool.query(
      `INSERT INTO nutrition_v2_food_portions (public_id, food_id, label, equivalent_reference_amount, sort_order, status)
       VALUES ${placeholders}`,
      flat
    );
    insertedPort += chunk.length;
  }
  console.log(`✓ Portions inserted: ${insertedPort}`);

  // Integrity checks
  console.log("\nRunning post-import integrity checks...");
  const [orphanNutr] = await pool.query(
    "SELECT COUNT(*) as count FROM nutrition_v2_food_nutrients fn LEFT JOIN nutrition_v2_foods f ON f.id = fn.food_id WHERE f.id IS NULL"
  );
  const [orphanPort] = await pool.query(
    "SELECT COUNT(*) as count FROM nutrition_v2_food_portions fp LEFT JOIN nutrition_v2_foods f ON f.id = fp.food_id WHERE f.id IS NULL"
  );
  const [foodsWithoutPortions] = await pool.query(`
    SELECT COUNT(*) as count 
    FROM nutrition_v2_foods f
    LEFT JOIN nutrition_v2_food_portions fp ON fp.food_id = f.id
    WHERE f.source_key = 'IBGE' AND fp.id IS NULL
  `);

  console.log(`ORPHAN_NUTRIENTS: ${orphanNutr[0].count}`);
  console.log(`ORPHAN_PORTIONS: ${orphanPort[0].count}`);
  console.log(`IBGE_FOODS_WITHOUT_PORTIONS: ${foodsWithoutPortions[0].count}`);

  await pool.end();
  console.log("=== ENRICHMENT COMPLETE ===");
}

main().catch(err => { console.error("Error:", err); process.exit(1); });
