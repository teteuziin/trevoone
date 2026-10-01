/**
 * TREVO ONE — IDEMPOTENT AI & AUDIT SCHEMA BOOTSTRAP
 * Ensures core tables for AI import jobs, quotas, ledger and audit exist in MySQL
 * regardless of whether CLI migrations were manually executed on Hostinger production.
 */

import { getDbPool } from "./mysql";
import type { RowDataPacket } from "mysql2/promise";

let _bootstrapPromise: Promise<void> | null = null;

export async function ensureAiSchemaBootstrapped(): Promise<void> {
  if (_bootstrapPromise) {
    return _bootstrapPromise;
  }

  _bootstrapPromise = (async () => {
    let pool;
    try {
      pool = getDbPool();
    } catch (err) {
      console.warn("[SchemaBootstrap] Skipping bootstrap: Database pool not initialized", err);
      return;
    }

    let conn;
    try {
      conn = await pool.getConnection();

      // 1. consultancy_ai_quotas
      await conn.query(`
        CREATE TABLE IF NOT EXISTS \`consultancy_ai_quotas\` (
          \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          \`consultancy_id\` BIGINT UNSIGNED NOT NULL,
          \`daily_limit\` INT NOT NULL DEFAULT 20,
          \`is_enabled\` TINYINT(1) NOT NULL DEFAULT 1,
          \`notes\` VARCHAR(255) NULL DEFAULT NULL,
          \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`uq_caiq_consultancy\` (\`consultancy_id\`),
          CONSTRAINT \`fk_caiq_consultancy\` FOREIGN KEY (\`consultancy_id\`) REFERENCES \`consultancies\` (\`id\`) ON DELETE RESTRICT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 2. consultancy_ai_role_limits
      await conn.query(`
        CREATE TABLE IF NOT EXISTS \`consultancy_ai_role_limits\` (
          \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          \`consultancy_id\` BIGINT UNSIGNED NOT NULL,
          \`role\` VARCHAR(50) NOT NULL,
          \`daily_limit\` INT NOT NULL DEFAULT 5,
          \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`uq_cairl_consultancy_role\` (\`consultancy_id\`, \`role\`),
          CONSTRAINT \`fk_cairl_consultancy\` FOREIGN KEY (\`consultancy_id\`) REFERENCES \`consultancies\` (\`id\`) ON DELETE RESTRICT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 3. consultancy_ai_member_limits
      await conn.query(`
        CREATE TABLE IF NOT EXISTS \`consultancy_ai_member_limits\` (
          \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          \`consultancy_id\` BIGINT UNSIGNED NOT NULL,
          \`membership_id\` BIGINT UNSIGNED NOT NULL,
          \`daily_limit\` INT NOT NULL,
          \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`uq_caiml_consultancy_member\` (\`consultancy_id\`, \`membership_id\`),
          CONSTRAINT \`fk_caiml_consultancy\` FOREIGN KEY (\`consultancy_id\`) REFERENCES \`consultancies\` (\`id\`) ON DELETE RESTRICT,
          CONSTRAINT \`fk_caiml_member\` FOREIGN KEY (\`membership_id\`) REFERENCES \`consultancy_members\` (\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 4. ai_usage_events
      await conn.query(`
        CREATE TABLE IF NOT EXISTS \`ai_usage_events\` (
          \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          \`public_id\` CHAR(36) NOT NULL,
          \`consultancy_id\` BIGINT UNSIGNED NOT NULL,
          \`member_id\` BIGINT UNSIGNED NOT NULL,
          \`user_id\` BIGINT UNSIGNED NOT NULL,
          \`role\` VARCHAR(50) NOT NULL,
          \`feature\` VARCHAR(50) NOT NULL,
          \`provider\` VARCHAR(50) NOT NULL DEFAULT 'OPENAI',
          \`model\` VARCHAR(100) NOT NULL,
          \`import_job_public_id\` CHAR(36) NULL DEFAULT NULL,
          \`status\` VARCHAR(30) NOT NULL DEFAULT 'RESERVED',
          \`input_tokens\` INT UNSIGNED NULL DEFAULT NULL,
          \`output_tokens\` INT UNSIGNED NULL DEFAULT NULL,
          \`total_tokens\` INT UNSIGNED NULL DEFAULT NULL,
          \`date_bucket\` VARCHAR(10) NOT NULL,
          \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`uq_ai_usage_public_id\` (\`public_id\`),
          INDEX \`idx_ai_usage_cons_date_status\` (\`consultancy_id\`, \`date_bucket\`, \`status\`),
          INDEX \`idx_ai_usage_mem_date_status\` (\`member_id\`, \`date_bucket\`, \`status\`),
          INDEX \`idx_ai_usage_job\` (\`import_job_public_id\`),
          CONSTRAINT \`fk_ai_usage_consultancy\` FOREIGN KEY (\`consultancy_id\`) REFERENCES \`consultancies\` (\`id\`) ON DELETE RESTRICT,
          CONSTRAINT \`fk_ai_usage_member\` FOREIGN KEY (\`member_id\`) REFERENCES \`consultancy_members\` (\`id\`) ON DELETE RESTRICT,
          CONSTRAINT \`fk_ai_usage_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 5. ai_import_jobs
      await conn.query(`
        CREATE TABLE IF NOT EXISTS \`ai_import_jobs\` (
          \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          \`public_id\` CHAR(36) NOT NULL,
          \`idempotency_key\` VARCHAR(100) NOT NULL,
          \`consultancy_id\` BIGINT UNSIGNED NOT NULL,
          \`member_id\` BIGINT UNSIGNED NOT NULL,
          \`user_id\` BIGINT UNSIGNED NOT NULL,
          \`created_by_user_id\` BIGINT UNSIGNED NULL DEFAULT NULL,
          \`feature\` VARCHAR(50) NOT NULL,
          \`target_type\` VARCHAR(50) NULL DEFAULT NULL,
          \`status\` VARCHAR(30) NOT NULL DEFAULT 'UPLOADED',
          \`source_filename\` VARCHAR(255) NOT NULL,
          \`source_hash\` VARCHAR(64) NOT NULL,
          \`source_type\` VARCHAR(30) NOT NULL,
          \`file_size_bytes\` INT UNSIGNED NULL DEFAULT NULL,
          \`target_student_membership_id\` BIGINT UNSIGNED NULL DEFAULT NULL,
          \`linked_student_id\` BIGINT UNSIGNED NULL DEFAULT NULL,
          \`raw_proposal_json\` MEDIUMTEXT NULL DEFAULT NULL,
          \`parsed_result_json\` MEDIUMTEXT NULL DEFAULT NULL,
          \`validation_errors_json\` MEDIUMTEXT NULL DEFAULT NULL,
          \`resolved_proposal_json\` MEDIUMTEXT NULL DEFAULT NULL,
          \`created_plan_public_id\` VARCHAR(100) NULL DEFAULT NULL,
          \`model_used\` VARCHAR(100) NULL DEFAULT NULL,
          \`tokens_in\` INT UNSIGNED NULL DEFAULT NULL,
          \`tokens_out\` INT UNSIGNED NULL DEFAULT NULL,
          \`estimated_cost\` DECIMAL(10, 4) NULL DEFAULT NULL,
          \`error_message\` VARCHAR(500) NULL DEFAULT NULL,
          \`completed_at\` DATETIME(3) NULL DEFAULT NULL,
          \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`uq_ai_import_jobs_public_id\` (\`public_id\`),
          UNIQUE KEY \`uq_ai_import_jobs_idempotency\` (\`consultancy_id\`, \`idempotency_key\`),
          INDEX \`idx_ai_import_jobs_cons_status\` (\`consultancy_id\`, \`status\`),
          INDEX \`idx_ai_import_jobs_member\` (\`member_id\`),
          CONSTRAINT \`fk_ai_import_jobs_consultancy\` FOREIGN KEY (\`consultancy_id\`) REFERENCES \`consultancies\` (\`id\`) ON DELETE RESTRICT,
          CONSTRAINT \`fk_ai_import_jobs_member\` FOREIGN KEY (\`member_id\`) REFERENCES \`consultancy_members\` (\`id\`) ON DELETE RESTRICT,
          CONSTRAINT \`fk_ai_import_jobs_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 6. Ensure optional compatibility columns on ai_import_jobs if table already existed previously
      const [colRows] = await conn.query<RowDataPacket[]>(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_import_jobs';`
      );
      const existingCols = new Set(colRows.map((r) => String(r.COLUMN_NAME).toLowerCase()));

      const columnsToAdd = [
        { name: "created_by_user_id", def: "BIGINT UNSIGNED NULL DEFAULT NULL" },
        { name: "target_type", def: "VARCHAR(50) NULL DEFAULT NULL" },
        { name: "linked_student_id", def: "BIGINT UNSIGNED NULL DEFAULT NULL" },
        { name: "parsed_result_json", def: "MEDIUMTEXT NULL DEFAULT NULL" },
        { name: "validation_errors_json", def: "MEDIUMTEXT NULL DEFAULT NULL" },
        { name: "model_used", def: "VARCHAR(100) NULL DEFAULT NULL" },
        { name: "tokens_in", def: "INT UNSIGNED NULL DEFAULT NULL" },
        { name: "tokens_out", def: "INT UNSIGNED NULL DEFAULT NULL" },
        { name: "estimated_cost", def: "DECIMAL(10, 4) NULL DEFAULT NULL" },
        { name: "completed_at", def: "DATETIME(3) NULL DEFAULT NULL" },
      ];

      for (const col of columnsToAdd) {
        if (!existingCols.has(col.name.toLowerCase())) {
          try {
            await conn.query(`ALTER TABLE \`ai_import_jobs\` ADD COLUMN \`${col.name}\` ${col.def};`);
          } catch {
            // Safe ignore if column was added concurrently
          }
        }
      }

      // 7. ai_daily_usage_snapshots
      await conn.query(`
        CREATE TABLE IF NOT EXISTS \`ai_daily_usage_snapshots\` (
          \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          \`consultancy_id\` BIGINT UNSIGNED NOT NULL,
          \`date_bucket\` VARCHAR(10) NOT NULL,
          \`total_requests\` INT UNSIGNED NOT NULL DEFAULT 0,
          \`total_tokens\` BIGINT UNSIGNED NOT NULL DEFAULT 0,
          \`total_cost_usd\` DECIMAL(10, 4) NOT NULL DEFAULT 0.0000,
          \`active_members_count\` INT UNSIGNED NOT NULL DEFAULT 0,
          \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`uq_daily_usage_cons_date\` (\`consultancy_id\`, \`date_bucket\`),
          CONSTRAINT \`fk_daily_usage_consultancy\` FOREIGN KEY (\`consultancy_id\`) REFERENCES \`consultancies\` (\`id\`) ON DELETE RESTRICT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 8. Views
      try {
        await conn.query(`
          CREATE OR REPLACE VIEW \`ai_consultancy_quota_limits\` AS
          SELECT id, consultancy_id, daily_limit, is_enabled, notes, created_at, updated_at
          FROM \`consultancy_ai_quotas\`;
        `);
      } catch {}

      try {
        await conn.query(`
          CREATE OR REPLACE VIEW \`ai_member_quota_overrides\` AS
          SELECT id, consultancy_id, membership_id, daily_limit, created_at, updated_at
          FROM \`consultancy_ai_member_limits\`;
        `);
      } catch {}

      // 9. workout_execution_exercise_substitutions
      await conn.query(`
        CREATE TABLE IF NOT EXISTS \`workout_execution_exercise_substitutions\` (
          \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          \`public_id\` CHAR(36) NOT NULL,
          \`consultancy_id\` BIGINT UNSIGNED NOT NULL,
          \`execution_session_id\` BIGINT UNSIGNED NOT NULL,
          \`student_membership_id\` BIGINT UNSIGNED NOT NULL,
          \`block_item_id\` BIGINT UNSIGNED NOT NULL,
          \`original_exercise_id\` BIGINT UNSIGNED NOT NULL,
          \`performed_exercise_id\` BIGINT UNSIGNED NOT NULL,
          \`reason\` VARCHAR(50) NOT NULL,
          \`source\` VARCHAR(50) NOT NULL DEFAULT 'STUDENT_AI_SUGGESTION',
          \`sequence_number\` TINYINT UNSIGNED NOT NULL,
          \`idempotency_key\` VARCHAR(100) NULL,
          \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`uq_wees_public_id\` (\`public_id\`),
          UNIQUE KEY \`uq_wees_session_seq\` (\`execution_session_id\`, \`sequence_number\`),
          UNIQUE KEY \`uq_wees_idempotency\` (\`execution_session_id\`, \`idempotency_key\`),
          INDEX \`idx_wees_session\` (\`execution_session_id\`),
          INDEX \`idx_wees_student\` (\`student_membership_id\`),
          INDEX \`idx_wees_consultancy\` (\`consultancy_id\`),
          INDEX \`idx_wees_block_item\` (\`block_item_id\`),
          CONSTRAINT \`fk_wees_consultancy\` FOREIGN KEY (\`consultancy_id\`) REFERENCES \`consultancies\` (\`id\`) ON DELETE RESTRICT,
          CONSTRAINT \`fk_wees_session\` FOREIGN KEY (\`execution_session_id\`) REFERENCES \`workout_execution_sessions\` (\`id\`) ON DELETE CASCADE,
          CONSTRAINT \`fk_wees_student\` FOREIGN KEY (\`student_membership_id\`) REFERENCES \`consultancy_members\` (\`id\`) ON DELETE RESTRICT,
          CONSTRAINT \`fk_wees_block_item\` FOREIGN KEY (\`block_item_id\`) REFERENCES \`workout_block_items\` (\`id\`) ON DELETE RESTRICT,
          CONSTRAINT \`fk_wees_orig_ex\` FOREIGN KEY (\`original_exercise_id\`) REFERENCES \`exercises\` (\`id\`) ON DELETE RESTRICT,
          CONSTRAINT \`fk_wees_perf_ex\` FOREIGN KEY (\`performed_exercise_id\`) REFERENCES \`exercises\` (\`id\`) ON DELETE RESTRICT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 10. Synchronize schema_migrations table so scripts/migrate-db.mjs reflects reality
      try {
        await conn.query(`
          CREATE TABLE IF NOT EXISTS \`schema_migrations\` (
            \`migration\` VARCHAR(255) NOT NULL,
            \`checksum\` CHAR(64) NOT NULL,
            \`applied_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            PRIMARY KEY (\`migration\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await conn.query(`
          INSERT IGNORE INTO \`schema_migrations\` (migration, checksum)
          VALUES 
            ('036_ai_import_quotas_and_audit.sql', 'auto_bootstrapped'),
            ('037_ai_usage_import_job_nullable.sql', 'auto_bootstrapped'),
            ('038_ai_import_jobs_compatibility_and_snapshots.sql', 'auto_bootstrapped'),
            ('039_student_exercise_substitutions.sql', 'auto_bootstrapped');
        `);
      } catch {}

    } catch (err) {
      console.error("[SchemaBootstrap] Error during AI schema bootstrap:", err);
    } finally {
      if (conn) conn.release();
    }
  })();

  return _bootstrapPromise;
}
