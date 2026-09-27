import mysql from "mysql2/promise";
import fs from "node:fs";

const env = {};
fs.readFileSync(".env.local", "utf8").split("\n").forEach(l => {
  const [k, v] = l.trim().split("=");
  if (k && v) env[k.trim()] = v.trim();
});

const EXPECTED_HOST = "srv1595.hstgr.io";
const DEV_DB_NAME = "u406031981_trevoone_dev";

if (env.DB_HOST !== EXPECTED_HOST) {
  throw new Error(`Invalid host: ${env.DB_HOST}`);
}
if (env.DB_NAME !== DEV_DB_NAME) {
  throw new Error(`ABSOLUTE GUARD: DB is NOT DEV: ${env.DB_NAME}`);
}

const pool = mysql.createPool({
  host: env.DB_HOST,
  port: Number(env.DB_PORT) || 3306,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 1
});

async function main() {
  console.log("=== DEV-SAFE MIGRATION: IBGE -> IBGE_POF_2008_2009 ===");
  const [db] = await pool.query("SELECT DATABASE() as db");
  console.log("Target Database:", db[0].db);
  if (db[0].db !== DEV_DB_NAME) {
    throw new Error("Target is NOT DEV database!");
  }

  const [current] = await pool.query(
    "SELECT COUNT(*) as c FROM nutrition_v2_foods WHERE source_key = 'IBGE'"
  );
  console.log(`Current rows with source_key = 'IBGE': ${current[0].c}`);

  if (current[0].c === 0) {
    const [versioned] = await pool.query(
      "SELECT COUNT(*) as c FROM nutrition_v2_foods WHERE source_key = 'IBGE_POF_2008_2009'"
    );
    console.log(`Rows already migrated with source_key = 'IBGE_POF_2008_2009': ${versioned[0].c}`);
    if (versioned[0].c === 1820) {
      console.log("✓ Migration already applied.");
      await pool.end();
      return;
    }
  }

  const [updateResult] = await pool.query(`
    UPDATE nutrition_v2_foods
    SET
      source_key = 'IBGE_POF_2008_2009',
      source_uid = REPLACE(source_uid, 'IBGE:POF 2008-2009:', 'IBGE_POF_2008_2009:')
    WHERE source_key = 'IBGE'
  `);
  console.log(`Rows updated: ${updateResult.affectedRows}`);

  // Verification
  const [verifyOld] = await pool.query("SELECT COUNT(*) as c FROM nutrition_v2_foods WHERE source_key = 'IBGE'");
  const [verifyNew] = await pool.query("SELECT COUNT(*) as c FROM nutrition_v2_foods WHERE source_key = 'IBGE_POF_2008_2009'");
  console.log(`Verification: Old 'IBGE' count: ${verifyOld[0].c} (expected 0)`);
  console.log(`Verification: New 'IBGE_POF_2008_2009' count: ${verifyNew[0].c} (expected 1820)`);

  if (verifyOld[0].c !== 0 || verifyNew[0].c !== 1820) {
    throw new Error("MIGRATION INTEGRITY ERROR: Unexpected row counts!");
  }

  console.log("✓ DEV-safe migration to IBGE_POF_2008_2009 completed with 100% success.");
  await pool.end();
}

main().catch(err => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
