-- Migration 036: AI Import Quotas, Usage Ledger, and Import Jobs
-- Trevo One - Master Feature V1

CREATE TABLE IF NOT EXISTS `consultancy_ai_quotas` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `consultancy_id` BIGINT UNSIGNED NOT NULL,
  `daily_limit` INT NOT NULL DEFAULT 20,
  `is_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `notes` VARCHAR(255) NULL DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_caiq_consultancy` (`consultancy_id`),
  CONSTRAINT `fk_caiq_consultancy` FOREIGN KEY (`consultancy_id`) REFERENCES `consultancies` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `consultancy_ai_role_limits` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `consultancy_id` BIGINT UNSIGNED NOT NULL,
  `role` VARCHAR(50) NOT NULL,
  `daily_limit` INT NOT NULL DEFAULT 5,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cairl_consultancy_role` (`consultancy_id`, `role`),
  CONSTRAINT `fk_cairl_consultancy` FOREIGN KEY (`consultancy_id`) REFERENCES `consultancies` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `consultancy_ai_member_limits` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `consultancy_id` BIGINT UNSIGNED NOT NULL,
  `membership_id` BIGINT UNSIGNED NOT NULL,
  `daily_limit` INT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_caiml_consultancy_member` (`consultancy_id`, `membership_id`),
  CONSTRAINT `fk_caiml_consultancy` FOREIGN KEY (`consultancy_id`) REFERENCES `consultancies` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_caiml_member` FOREIGN KEY (`membership_id`) REFERENCES `consultancy_members` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ai_usage_events` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `public_id` CHAR(36) NOT NULL,
  `consultancy_id` BIGINT UNSIGNED NOT NULL,
  `member_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `role` VARCHAR(50) NOT NULL,
  `feature` VARCHAR(50) NOT NULL,
  `provider` VARCHAR(50) NOT NULL DEFAULT 'OPENAI',
  `model` VARCHAR(100) NOT NULL,
  `import_job_public_id` CHAR(36) NOT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'RESERVED',
  `input_tokens` INT UNSIGNED NULL DEFAULT NULL,
  `output_tokens` INT UNSIGNED NULL DEFAULT NULL,
  `total_tokens` INT UNSIGNED NULL DEFAULT NULL,
  `date_bucket` VARCHAR(10) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ai_usage_public_id` (`public_id`),
  INDEX `idx_ai_usage_cons_date_status` (`consultancy_id`, `date_bucket`, `status`),
  INDEX `idx_ai_usage_mem_date_status` (`member_id`, `date_bucket`, `status`),
  INDEX `idx_ai_usage_job` (`import_job_public_id`),
  CONSTRAINT `fk_ai_usage_consultancy` FOREIGN KEY (`consultancy_id`) REFERENCES `consultancies` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_ai_usage_member` FOREIGN KEY (`member_id`) REFERENCES `consultancy_members` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_ai_usage_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ai_import_jobs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `public_id` CHAR(36) NOT NULL,
  `idempotency_key` VARCHAR(100) NOT NULL,
  `consultancy_id` BIGINT UNSIGNED NOT NULL,
  `member_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `feature` VARCHAR(50) NOT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'UPLOADED',
  `source_filename` VARCHAR(255) NOT NULL,
  `source_hash` VARCHAR(64) NOT NULL,
  `source_type` VARCHAR(30) NOT NULL,
  `file_size_bytes` INT UNSIGNED NULL DEFAULT NULL,
  `target_student_membership_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `raw_proposal_json` MEDIUMTEXT NULL DEFAULT NULL,
  `resolved_proposal_json` MEDIUMTEXT NULL DEFAULT NULL,
  `created_plan_public_id` VARCHAR(100) NULL DEFAULT NULL,
  `error_message` VARCHAR(500) NULL DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ai_import_jobs_public_id` (`public_id`),
  UNIQUE KEY `uq_ai_import_jobs_idempotency` (`consultancy_id`, `idempotency_key`),
  INDEX `idx_ai_import_jobs_cons_status` (`consultancy_id`, `status`),
  INDEX `idx_ai_import_jobs_member` (`member_id`),
  CONSTRAINT `fk_ai_import_jobs_consultancy` FOREIGN KEY (`consultancy_id`) REFERENCES `consultancies` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_ai_import_jobs_member` FOREIGN KEY (`member_id`) REFERENCES `consultancy_members` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_ai_import_jobs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
