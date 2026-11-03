import { getDbConnection } from "@/lib/db/mysql";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";

let formsSchemaAssurancePromise: Promise<{
  legacyTemplatesCount: number;
  legacyRequestsCount: number;
  migrated: boolean;
}> | null = null;

/**
 * TREVO ONE - Schema Assurance & Safe Legacy Transition for Consultancy Forms (Migration 074)
 *
 * Implements ETAPA 0 data safety rules:
 * - Checks whether legacy tables (consultancy_custom_form_templates, consultancy_custom_form_requests) exist.
 * - Counts records via SELECT COUNT(*).
 * - If rows > 0: renames to _legacy_20261103 to preserve student health data under LGPD.
 * - If rows === 0: safely drops legacy tables.
 * - Creates consultancy_forms and consultancy_form_assignments.
 */
export async function ensureConsultancyFormsSchema(): Promise<{
  legacyTemplatesCount: number;
  legacyRequestsCount: number;
  migrated: boolean;
}> {
  if (formsSchemaAssurancePromise) {
    return formsSchemaAssurancePromise;
  }

  formsSchemaAssurancePromise = (async () => {
    let connection: PoolConnection | null = null;
    let legacyTemplatesCount = 0;
    let legacyRequestsCount = 0;

    try {
      connection = await getDbConnection();
      const conn = connection;

      // Helper to check table existence
      async function tableExists(tableName: string): Promise<boolean> {
        try {
          const [rows] = await conn.execute<RowDataPacket[]>(
            `SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1;`,
            [tableName]
          );
          return Array.isArray(rows) && rows.length > 0;
        } catch {
          return false;
        }
      }

      // Check legacy tables
      const hasTemplates = await tableExists("consultancy_custom_form_templates");
      const hasRequests = await tableExists("consultancy_custom_form_requests");

      if (hasTemplates) {
        try {
          const [tRows] = await conn.execute<RowDataPacket[]>(
            `SELECT COUNT(*) AS total FROM consultancy_custom_form_templates;`
          );
          legacyTemplatesCount = Number(tRows[0]?.total || 0);
        } catch {
          legacyTemplatesCount = 0;
        }
      }

      if (hasRequests) {
        try {
          const [rRows] = await conn.execute<RowDataPacket[]>(
            `SELECT COUNT(*) AS total FROM consultancy_custom_form_requests;`
          );
          legacyRequestsCount = Number(rRows[0]?.total || 0);
        } catch {
          legacyRequestsCount = 0;
        }
      }

      console.log(
        `[Forms Schema Assurance] ETAPA 0 Audit: Legacy templates count: ${legacyTemplatesCount}, Legacy requests count: ${legacyRequestsCount}`
      );

      // Handle legacy tables transition
      if (legacyTemplatesCount > 0 || legacyRequestsCount > 0) {
        console.log(
          "[Forms Schema Assurance] Records detected. Renaming legacy tables to preserve data under LGPD..."
        );
        if (hasRequests) {
          const targetLegacyRequests = "consultancy_custom_form_requests_legacy_20261103";
          const exists = await tableExists(targetLegacyRequests);
          if (!exists) {
            await conn.query(`RENAME TABLE consultancy_custom_form_requests TO ${targetLegacyRequests};`).catch((err) => {
              console.warn("[Forms Schema Assurance] Warning renaming legacy requests:", err?.message || err);
            });
          }
        }
        if (hasTemplates) {
          const targetLegacyTemplates = "consultancy_custom_form_templates_legacy_20261103";
          const exists = await tableExists(targetLegacyTemplates);
          if (!exists) {
            await conn.query(`RENAME TABLE consultancy_custom_form_templates TO ${targetLegacyTemplates};`).catch((err) => {
              console.warn("[Forms Schema Assurance] Warning renaming legacy templates:", err?.message || err);
            });
          }
        }
      } else {
        // Tables are empty or don't exist: drop safely if exists
        if (hasRequests) {
          await conn.query(`DROP TABLE IF EXISTS consultancy_custom_form_requests;`).catch(() => {});
        }
        if (hasTemplates) {
          await conn.query(`DROP TABLE IF EXISTS consultancy_custom_form_templates;`).catch(() => {});
        }
      }

      // Ensure new consultancy_forms table
      await conn.query(`
        CREATE TABLE IF NOT EXISTS consultancy_forms (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          public_id CHAR(36) NOT NULL UNIQUE,
          consultancy_id BIGINT UNSIGNED NOT NULL,
          title VARCHAR(200) NOT NULL,
          description TEXT NULL,
          questions_json JSON NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
          is_recurring TINYINT(1) NOT NULL DEFAULT 0,
          recurrence_rule VARCHAR(50) NULL,
          created_by_user_id BIGINT UNSIGNED NOT NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          deleted_at DATETIME(3) NULL,
          CONSTRAINT fk_cf_consultancy FOREIGN KEY (consultancy_id) REFERENCES consultancies(id),
          INDEX idx_cf_tenant_status (consultancy_id, status, deleted_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `).catch((err) => {
        console.warn("[Forms Schema Assurance] Warning creating consultancy_forms:", err?.message || err);
      });

      // Ensure new consultancy_form_assignments table
      await conn.query(`
        CREATE TABLE IF NOT EXISTS consultancy_form_assignments (
          id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          public_id CHAR(36) NOT NULL UNIQUE,
          consultancy_id BIGINT UNSIGNED NOT NULL,
          form_id BIGINT UNSIGNED NOT NULL,
          student_membership_id BIGINT UNSIGNED NOT NULL,
          student_user_id BIGINT UNSIGNED NOT NULL,
          assigned_by_user_id BIGINT UNSIGNED NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
          due_date DATE NULL,
          responses_json JSON NULL,
          reviewer_notes TEXT NULL,
          reviewed_by_user_id BIGINT UNSIGNED NULL,
          submitted_at DATETIME(3) NULL,
          reviewed_at DATETIME(3) NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
          CONSTRAINT fk_cfa_consultancy FOREIGN KEY (consultancy_id) REFERENCES consultancies(id),
          CONSTRAINT fk_cfa_form FOREIGN KEY (form_id) REFERENCES consultancy_forms(id),
          CONSTRAINT fk_cfa_member FOREIGN KEY (student_membership_id) REFERENCES consultancy_members(id),
          INDEX idx_cfa_tenant_status (consultancy_id, status),
          INDEX idx_cfa_student (student_user_id, status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `).catch((err) => {
        console.warn("[Forms Schema Assurance] Warning creating consultancy_form_assignments:", err?.message || err);
      });

      return {
        legacyTemplatesCount,
        legacyRequestsCount,
        migrated: true,
      };
    } catch (err: unknown) {
      console.error("[Forms Schema Assurance] Error ensuring forms schema:", err);
      return {
        legacyTemplatesCount,
        legacyRequestsCount,
        migrated: false,
      };
    } finally {
      if (connection) {
        connection.release();
      }
    }
  })();

  return formsSchemaAssurancePromise;
}
