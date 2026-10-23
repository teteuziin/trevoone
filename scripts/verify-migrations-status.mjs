/**
 * TREVO ONE — READ-ONLY MIGRATIONS STATUS VERIFIER
 *
 * This script is strictly read-only (SELECT / SHOW only). It executes schema inspection
 * to verify which database migrations (001 through 063) have been applied.
 *
 * Usage:
 *   node scripts/verify-migrations-status.mjs
 *
 * Execution Context:
 *   Designed to be run by authorized operators directly on the production host (Hostinger SSH/terminal)
 *   or in an authorized staging environment.
 */

import fs from "node:fs";
import mysql from "mysql2/promise";

console.log("================================================================================");
console.log("TREVO ONE — DIAGNÓSTICO DE STATUS DE MIGRATIONS (SOMENTE LEITURA)");
console.log("================================================================================\n");

// Read configuration from environment or .env.local
const fileEnv = {};
if (fs.existsSync(".env.local")) {
  try {
    fs.readFileSync(".env.local", "utf8").split("\n").forEach((l) => {
      const trimmed = l.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const idx = trimmed.indexOf("=");
      if (idx > 0) {
        const k = trimmed.slice(0, idx).trim();
        const v = trimmed.slice(idx + 1).trim();
        fileEnv[k] = v;
      }
    });
  } catch {
    // Non-blocking
  }
}

const host = process.env.DB_HOST || fileEnv.DB_HOST || "localhost";
const port = Number(process.env.DB_PORT || fileEnv.DB_PORT || 3306);
const database = process.env.DB_NAME || fileEnv.DB_NAME || "";
const user = process.env.DB_USER || fileEnv.DB_USER || "";
const password = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : (fileEnv.DB_PASSWORD || "");

console.log(`[Ambiente] Host: ${host} | Porta: ${port} | Banco: ${database || "(não definido)"} | Usuário: ${user || "(não definido)"}`);

if (!database || !user) {
  console.log("\n[STATUS]: APLICAÇÃO NÃO VERIFICADA");
  console.log("[Motivo]: Credenciais de banco de dados não configuradas nas variáveis de ambiente.");
  console.log("Defina DB_HOST, DB_PORT, DB_NAME, DB_USER e DB_PASSWORD antes de executar.\n");
  process.exit(0);
}

const pool = mysql.createPool({
  host,
  port,
  database,
  user,
  password,
  waitForConnections: true,
  connectionLimit: 1,
  connectTimeout: 8000,
});

async function runVerification() {
  let conn;
  try {
    conn = await pool.getConnection();
    console.log("[Conexão]: Conexão estabelecida com sucesso.");

    // 1. Inspect schema_migrations table
    console.log("\n--- 1. TABELA schema_migrations ---");
    let schemaRows = [];
    const [smTables] = await conn.query("SHOW TABLES LIKE 'schema_migrations';");
    if (Array.isArray(smTables) && smTables.length > 0) {
      const [rows] = await conn.query("SELECT * FROM schema_migrations;");
      schemaRows = rows;
      console.log(`Encontrados ${rows.length} registros em schema_migrations:`);
      for (const r of rows) {
        const migName = r.migration || r.name || r.version || JSON.stringify(r);
        const appliedAt = r.applied_at || r.created_at || "data desconhecida";
        console.log(`  - ${migName} (${appliedAt})`);
      }
    } else {
      console.log("Tabela 'schema_migrations' não encontrada neste banco.");
    }

    // 2. Inspect key Nutrition V2 tables & columns (056 to 063)
    console.log("\n--- 2. OBJETOS DO ESQUEMA DE NUTRIÇÃO V2 ---");

    // 056: nutrition_v2_food_portions scopes
    const [fpCols] = await conn.query(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'nutrition_v2_food_portions'
         AND COLUMN_NAME IN ('scope', 'consultancy_id', 'created_by_user_id', 'notes');`,
      [database]
    );
    console.log(`[056] nutrition_v2_food_portions (colunas de escopo): ${fpCols.length}/4 colunas detectadas`);
    for (const c of fpCols) {
      console.log(`      - ${c.COLUMN_NAME} (${c.DATA_TYPE}, nullable: ${c.IS_NULLABLE}, default: ${c.COLUMN_DEFAULT})`);
    }

    // 060: nutrition_v2_patient_records new columns & clinical notes table
    const [prCols] = await conn.query(
      `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'nutrition_v2_patient_records'
         AND COLUMN_NAME IN ('food_intolerances', 'field_provenance_json');`,
      [database]
    );
    console.log(`[060] nutrition_v2_patient_records (colunas estendidas): ${prCols.length}/2 colunas detectadas`);

    const [cnTable] = await conn.query("SHOW TABLES LIKE 'nutrition_v2_patient_clinical_notes';");
    console.log(`[060] nutrition_v2_patient_clinical_notes: ${cnTable.length > 0 ? "PRESENTE" : "AUSENTE"}`);

    // 061: nutrition_v2_patient_pre_questionnaires
    const [pqTable] = await conn.query("SHOW TABLES LIKE 'nutrition_v2_patient_pre_questionnaires';");
    console.log(`[061] nutrition_v2_patient_pre_questionnaires: ${pqTable.length > 0 ? "PRESENTE" : "AUSENTE"}`);

    // 062: nutrition_v2_patient_anthropometrics extended columns
    const [antCols] = await conn.query(
      `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'nutrition_v2_patient_anthropometrics'
         AND COLUMN_NAME IN ('neck_cm', 'forearm_cm', 'bone_mass_kg', 'residual_mass_kg');`,
      [database]
    );
    console.log(`[062] nutrition_v2_patient_anthropometrics (colunas estendidas): ${antCols.length}/4 colunas detectadas`);

    // 063: nutrition_v2_meal_tracking_logs
    const [mtTable] = await conn.query("SHOW TABLES LIKE 'nutrition_v2_meal_tracking_logs';");
    console.log(`[063] nutrition_v2_meal_tracking_logs: ${mtTable.length > 0 ? "PRESENTE" : "AUSENTE"}`);

    // 065: nutrition_v2_patient_anthropometrics JSON columns + lab exams + planning preferences
    const [antJsonCols] = await conn.query(
      `SELECT COLUMN_NAME
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'nutrition_v2_patient_anthropometrics'
         AND COLUMN_NAME IN ('perimeters_json', 'diameters_json', 'body_composition_json');`,
      [database]
    );
    console.log(`[065] nutrition_v2_patient_anthropometrics (colunas JSON estruturadas): ${antJsonCols.length}/3 colunas detectadas`);
    for (const c of antJsonCols) {
      console.log(`      - ${c.COLUMN_NAME}`);
    }

    const [labExamsTable] = await conn.query("SHOW TABLES LIKE 'nutrition_v2_patient_lab_exams';");
    console.log(`[065] nutrition_v2_patient_lab_exams: ${labExamsTable.length > 0 ? "PRESENTE" : "AUSENTE"}`);

    const [planningPrefsTable] = await conn.query("SHOW TABLES LIKE 'nutrition_v2_planning_field_preferences';");
    console.log(`[065] nutrition_v2_planning_field_preferences: ${planningPrefsTable.length > 0 ? "PRESENTE" : "AUSENTE"}`);

    // Avaliação do status da Migration 065
    const is065InSchema = Array.isArray(schemaRows) && schemaRows.some((r) => (r.migration || r.name || "").includes("065"));
    const isAllColsPresent = antJsonCols.length === 3;
    const isLabExamsPresent = labExamsTable.length > 0;
    const isPlanningPrefsPresent = planningPrefsTable.length > 0;

    let status065 = "NÃO APLICADA";
    if (is065InSchema && isAllColsPresent && isLabExamsPresent && isPlanningPrefsPresent) {
      status065 = "APLICADA E VERIFICADA (INTEGRAL)";
    } else if (isAllColsPresent || isLabExamsPresent || isPlanningPrefsPresent || is065InSchema) {
      status065 = "PARCIALMENTE APLICADA (DIVERGÊNCIA)";
    }

    console.log("\n--------------------------------------------------------------------------------");
    console.log(`STATUS DA MIGRATION 065: ${status065}`);
    console.log("--------------------------------------------------------------------------------");
    console.log(`  - Colunas JSON (perimeters_json, diameters_json, body_composition_json): ${isAllColsPresent ? "PRESENTE (3/3)" : `${antJsonCols.length}/3`}`);
    console.log(`  - Tabela nutrition_v2_patient_lab_exams: ${isLabExamsPresent ? "PRESENTE" : "AUSENTE"}`);
    console.log(`  - Tabela nutrition_v2_planning_field_preferences: ${isPlanningPrefsPresent ? "PRESENTE" : "AUSENTE"}`);
    console.log(`  - Registro em schema_migrations: ${is065InSchema ? "PRESENTE" : "AUSENTE"}`);

    console.log("\n================================================================================");
    console.log("STATUS DAS MIGRATIONS: VERIFICAÇÃO CONCLUÍDA NO AMBIENTE AUTORIZADO");
    console.log("================================================================================\n");
  } catch (err) {
    console.log("\n================================================================================");
    console.log("STATUS DAS MIGRATIONS: APLICAÇÃO NÃO VERIFICADA");
    console.log("================================================================================");
    console.log(`[Erro]: ${(err && err.message) || String(err)}`);
    console.log("[Código]:", (err && err.code) || "DESCONHECIDO");
    console.log("\n[Causa do Bloqueio]: INDETERMINADA");
    console.log("O erro ER_ACCESS_DENIED_ERROR (ou timeout/recusa de rede) comprova a rejeição da conexão,");
    console.log("mas não identifica isoladamente a causa concreta a partir deste cliente (pode ser restrição");
    console.log("de host/IP do MySQL da Hostinger, firewall de borda ou credencial restrita a conexões internas/localhost).");
    console.log("\n[Ação Recomendada para o Operador Autorizado]:");
    console.log("Execute este script diretamente no servidor via SSH ou painel da Hostinger onde a");
    console.log("conexão interna local é permitida:\n  node scripts/verify-migrations-status.mjs\n");
  } finally {
    if (conn) conn.release();
    await pool.end();
  }
}

runVerification();
