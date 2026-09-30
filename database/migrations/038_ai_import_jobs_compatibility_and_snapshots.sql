-- Migration 038: AI Import Jobs Compatibility Columns, Snapshots, and View Aliases
-- Trevo One - Master Feature V1 Post-Deploy Hardening

ALTER TABLE `ai_import_jobs`
  ADD COLUMN `created_by_user_id` BIGINT UNSIGNED NULL DEFAULT NULL AFTER `user_id`,
  ADD COLUMN `target_type` VARCHAR(50) NULL DEFAULT NULL AFTER `feature`,
  ADD COLUMN `linked_student_id` BIGINT UNSIGNED NULL DEFAULT NULL AFTER `target_student_membership_id`,
  ADD COLUMN `parsed_result_json` MEDIUMTEXT NULL DEFAULT NULL AFTER `raw_proposal_json`,
  ADD COLUMN `validation_errors_json` MEDIUMTEXT NULL DEFAULT NULL AFTER `parsed_result_json`,
  ADD COLUMN `model_used` VARCHAR(100) NULL DEFAULT NULL AFTER `created_plan_public_id`,
  ADD COLUMN `tokens_in` INT UNSIGNED NULL DEFAULT NULL AFTER `model_used`,
  ADD COLUMN `tokens_out` INT UNSIGNED NULL DEFAULT NULL AFTER `tokens_in`,
  ADD COLUMN `estimated_cost` DECIMAL(10, 4) NULL DEFAULT NULL AFTER `tokens_out`,
  ADD COLUMN `completed_at` DATETIME(3) NULL DEFAULT NULL AFTER `error_message`;

CREATE TABLE IF NOT EXISTS `ai_daily_usage_snapshots` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `consultancy_id` BIGINT UNSIGNED NOT NULL,
  `date_bucket` VARCHAR(10) NOT NULL,
  `total_requests` INT UNSIGNED NOT NULL DEFAULT 0,
  `total_tokens` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `total_cost_usd` DECIMAL(10, 4) NOT NULL DEFAULT 0.0000,
  `active_members_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_daily_usage_cons_date` (`consultancy_id`, `date_bucket`),
  CONSTRAINT `fk_daily_usage_consultancy` FOREIGN KEY (`consultancy_id`) REFERENCES `consultancies` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE OR REPLACE VIEW `ai_consultancy_quota_limits` AS
SELECT id, consultancy_id, daily_limit, is_enabled, notes, created_at, updated_at
FROM `consultancy_ai_quotas`;

CREATE OR REPLACE VIEW `ai_member_quota_overrides` AS
SELECT id, consultancy_id, membership_id, daily_limit, created_at, updated_at
FROM `consultancy_ai_member_limits`;
