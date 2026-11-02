import { getDbConnection } from "@/lib/db/mysql";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";

let schemaAssurancePromise: Promise<void> | null = null;

/**
 * TREVO ONE — Schema Assurance for Promotional Campaigns & Materials (Migrations 072/073)
 *
 * Runs idempotently at runtime on the first read/write operation.
 * Ensures all required tables and columns exist in production database
 * without depending on external manual migrations or downtime.
 */
export async function ensurePromotionalCampaignsSchema(): Promise<void> {
  if (schemaAssurancePromise) {
    return schemaAssurancePromise;
  }

  schemaAssurancePromise = (async () => {
    let connection: PoolConnection | null = null;
    try {
      connection = await getDbConnection();

      // 1. Table: promotional_campaign_links (Migration 072)
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS promotional_campaign_links (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          public_id CHAR(36) NOT NULL,
          consultancy_id BIGINT UNSIGNED NOT NULL,
          referrer_member_id BIGINT UNSIGNED NOT NULL,
          code VARCHAR(32) NOT NULL,
          title VARCHAR(191) NOT NULL,
          description TEXT NULL,
          destination_url VARCHAR(2048) NOT NULL,
          announced_discount_type VARCHAR(20) NOT NULL DEFAULT 'PERCENTAGE',
          announced_discount_value VARCHAR(64) NULL,
          eligible_plans VARCHAR(255) NULL,
          commission_type VARCHAR(20) NOT NULL DEFAULT 'PERCENTAGE',
          commission_amount_cents BIGINT NULL DEFAULT NULL,
          commission_rate_basis_points INT NULL DEFAULT NULL,
          commission_conditions TEXT NULL,
          starts_at DATETIME(3) NULL DEFAULT NULL,
          ends_at DATETIME(3) NULL DEFAULT NULL,
          max_uses INT UNSIGNED NULL DEFAULT NULL,
          current_uses INT UNSIGNED NOT NULL DEFAULT 0,
          click_count INT UNSIGNED NOT NULL DEFAULT 0,
          status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
          created_by_member_id BIGINT UNSIGNED NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          PRIMARY KEY (id),
          UNIQUE KEY uq_pcl_public_id (public_id),
          UNIQUE KEY uq_pcl_code (code),
          KEY idx_pcl_consultancy_member (consultancy_id, referrer_member_id),
          KEY idx_pcl_status (consultancy_id, status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 2. Table: promotional_marketing_materials (Migration 072 & 073 storage fields)
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS promotional_marketing_materials (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          public_id CHAR(36) NOT NULL,
          consultancy_id BIGINT UNSIGNED NOT NULL,
          title VARCHAR(191) NOT NULL,
          description TEXT NULL,
          media_format VARCHAR(20) NOT NULL DEFAULT 'STORY',
          file_url VARCHAR(2048) NULL,
          storage_key VARCHAR(512) NULL,
          file_storage_path VARCHAR(500) NULL,
          file_original_name VARCHAR(255) NULL,
          file_mime_type VARCHAR(100) NULL,
          file_size_bytes BIGINT UNSIGNED NULL,
          suggested_caption TEXT NULL,
          is_global BOOLEAN NOT NULL DEFAULT TRUE,
          target_member_id BIGINT UNSIGNED NULL,
          campaign_link_id BIGINT UNSIGNED NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
          created_by_member_id BIGINT UNSIGNED NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          PRIMARY KEY (id),
          UNIQUE KEY uq_pmm_public_id (public_id),
          KEY idx_pmm_consultancy_status (consultancy_id, status),
          KEY idx_pmm_member (consultancy_id, target_member_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 3. Table: promotional_campaign_link_materials (Migration 072)
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS promotional_campaign_link_materials (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          campaign_link_id BIGINT UNSIGNED NOT NULL,
          material_id BIGINT UNSIGNED NOT NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          PRIMARY KEY (id),
          UNIQUE KEY uq_pclm_link_material (campaign_link_id, material_id),
          KEY idx_pclm_link (campaign_link_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      const conn = connection;
      // Helper to check column existence safely
      async function columnExists(table: string, column: string): Promise<boolean> {
        if (!conn) return false;
        try {
          const [rows] = await conn.execute<RowDataPacket[]>(
            `SELECT 1 FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1;`,
            [table, column]
          );
          return Array.isArray(rows) && rows.length > 0;
        } catch {
          return false;
        }
      }

      // 4. Check & add columns to promotional_marketing_materials
      if (!(await columnExists("promotional_marketing_materials", "file_storage_path"))) {
        await connection.execute("ALTER TABLE promotional_marketing_materials ADD COLUMN file_storage_path VARCHAR(500) NULL;").catch(() => null);
      }
      if (!(await columnExists("promotional_marketing_materials", "file_original_name"))) {
        await connection.execute("ALTER TABLE promotional_marketing_materials ADD COLUMN file_original_name VARCHAR(255) NULL;").catch(() => null);
      }
      if (!(await columnExists("promotional_marketing_materials", "file_mime_type"))) {
        await connection.execute("ALTER TABLE promotional_marketing_materials ADD COLUMN file_mime_type VARCHAR(100) NULL;").catch(() => null);
      }
      if (!(await columnExists("promotional_marketing_materials", "file_size_bytes"))) {
        await connection.execute("ALTER TABLE promotional_marketing_materials ADD COLUMN file_size_bytes BIGINT UNSIGNED NULL;").catch(() => null);
      }
      if (!(await columnExists("promotional_marketing_materials", "target_member_id"))) {
        await connection.execute("ALTER TABLE promotional_marketing_materials ADD COLUMN target_member_id BIGINT UNSIGNED NULL;").catch(() => null);
      }

      // 5. Check & add columns to referral_attributions
      if (!(await columnExists("referral_attributions", "campaign_link_id"))) {
        await connection.execute("ALTER TABLE referral_attributions ADD COLUMN campaign_link_id BIGINT UNSIGNED NULL;").catch(() => null);
      }
      if (!(await columnExists("referral_attributions", "buyer_name"))) {
        await connection.execute("ALTER TABLE referral_attributions ADD COLUMN buyer_name VARCHAR(191) NULL;").catch(() => null);
      }

      // 6. Check & add columns to referral_commissions
      if (!(await columnExists("referral_commissions", "campaign_link_id"))) {
        await connection.execute("ALTER TABLE referral_commissions ADD COLUMN campaign_link_id BIGINT UNSIGNED NULL;").catch(() => null);
      }
      if (!(await columnExists("referral_commissions", "buyer_name"))) {
        await connection.execute("ALTER TABLE referral_commissions ADD COLUMN buyer_name VARCHAR(191) NULL;").catch(() => null);
      }
      if (!(await columnExists("referral_commissions", "external_reference"))) {
        await connection.execute("ALTER TABLE referral_commissions ADD COLUMN external_reference VARCHAR(191) NULL;").catch(() => null);
      }

      // 7. Make referred_member_id in referral_commissions nullable
      try {
        const [nullabilityRows] = await connection.execute<RowDataPacket[]>(
          `SELECT IS_NULLABLE FROM information_schema.COLUMNS
           WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'referral_commissions' AND COLUMN_NAME = 'referred_member_id' LIMIT 1;`
        );
        if (Array.isArray(nullabilityRows) && nullabilityRows[0]?.IS_NULLABLE === "NO") {
          await connection.execute(
            "ALTER TABLE referral_commissions MODIFY COLUMN referred_member_id BIGINT UNSIGNED NULL DEFAULT NULL;"
          ).catch(() => null);
        }
      } catch {
        // safe fallback
      }
    } catch (err) {
      console.error("[Schema Assurance] Error verifying promotional campaign schema:", err);
      // Reset promise so subsequent requests can retry
      schemaAssurancePromise = null;
      throw err;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  })();

  return schemaAssurancePromise;
}
