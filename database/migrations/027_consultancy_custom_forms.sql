-- Migration 027: Consultancy Custom Forms
-- Multi-tenant customizable form templates, student requests, and review workflows

CREATE TABLE IF NOT EXISTS `consultancy_custom_form_templates` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `public_id` CHAR(36) NOT NULL,
  `consultancy_id` BIGINT UNSIGNED NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NULL DEFAULT NULL,
  `fields_json` JSON NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `is_onboarding_required` TINYINT(1) NOT NULL DEFAULT 0,
  `created_by_user_id` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `deleted_at` DATETIME(3) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ccft_public_id` (`public_id`),
  INDEX `idx_ccft_tenant_active` (`consultancy_id`, `is_active`, `deleted_at`),
  INDEX `idx_ccft_created_by` (`created_by_user_id`),
  CONSTRAINT `fk_ccft_consultancy` FOREIGN KEY (`consultancy_id`) REFERENCES `consultancies` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ccft_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `consultancy_custom_form_requests` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `public_id` CHAR(36) NOT NULL,
  `consultancy_id` BIGINT UNSIGNED NOT NULL,
  `template_id` BIGINT UNSIGNED NOT NULL,
  `student_membership_id` BIGINT UNSIGNED NOT NULL,
  `student_user_id` BIGINT UNSIGNED NOT NULL,
  `requested_by_user_id` BIGINT UNSIGNED NOT NULL,
  `status` VARCHAR(25) NOT NULL DEFAULT 'PENDING',
  `responses_json` JSON NULL DEFAULT NULL,
  `reviewer_notes` TEXT NULL DEFAULT NULL,
  `reviewed_by_user_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `submitted_at` DATETIME(3) NULL DEFAULT NULL,
  `reviewed_at` DATETIME(3) NULL DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ccfr_public_id` (`public_id`),
  INDEX `idx_ccfr_tenant_student_status` (`consultancy_id`, `student_membership_id`, `status`),
  INDEX `idx_ccfr_tenant_template` (`consultancy_id`, `template_id`),
  INDEX `idx_ccfr_student_user` (`student_user_id`, `status`),
  CONSTRAINT `fk_ccfr_consultancy` FOREIGN KEY (`consultancy_id`) REFERENCES `consultancies` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ccfr_template` FOREIGN KEY (`template_id`) REFERENCES `consultancy_custom_form_templates` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ccfr_student_membership` FOREIGN KEY (`student_membership_id`) REFERENCES `consultancy_members` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ccfr_student_user` FOREIGN KEY (`student_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ccfr_requested_by` FOREIGN KEY (`requested_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ccfr_reviewed_by` FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
