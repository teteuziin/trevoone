-- Migration 028: Student Physical Evaluation Photos
-- Multi-tenant private photo evaluation requests, 4-pose standardized image storage, review workflows, and comparison

CREATE TABLE IF NOT EXISTS `student_photo_evaluation_requests` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `public_id` CHAR(36) NOT NULL,
  `consultancy_id` BIGINT UNSIGNED NOT NULL,
  `student_membership_id` BIGINT UNSIGNED NOT NULL,
  `student_user_id` BIGINT UNSIGNED NOT NULL,
  `requested_by_user_id` BIGINT UNSIGNED NOT NULL,
  `status` VARCHAR(25) NOT NULL DEFAULT 'PENDING',
  `instructions` TEXT NULL DEFAULT NULL,
  `due_at` DATETIME(3) NULL DEFAULT NULL,
  `consent_at` DATETIME(3) NULL DEFAULT NULL,
  `submitted_at` DATETIME(3) NULL DEFAULT NULL,
  `reviewed_at` DATETIME(3) NULL DEFAULT NULL,
  `reviewed_by_user_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `reviewer_notes` TEXT NULL DEFAULT NULL,
  `requested_changes_poses_json` JSON NULL DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sper_public_id` (`public_id`),
  INDEX `idx_sper_tenant_student_status` (`consultancy_id`, `student_membership_id`, `status`),
  INDEX `idx_sper_student_user_status` (`student_user_id`, `status`),
  INDEX `idx_sper_requested_by` (`requested_by_user_id`),
  INDEX `idx_sper_reviewed_by` (`reviewed_by_user_id`),
  CONSTRAINT `fk_sper_consultancy` FOREIGN KEY (`consultancy_id`) REFERENCES `consultancies` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_sper_student_membership` FOREIGN KEY (`student_membership_id`) REFERENCES `consultancy_members` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_sper_student_user` FOREIGN KEY (`student_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_sper_requested_by` FOREIGN KEY (`requested_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_sper_reviewed_by` FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `student_photo_evaluation_images` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `public_id` CHAR(36) NOT NULL,
  `request_id` BIGINT UNSIGNED NOT NULL,
  `pose` VARCHAR(20) NOT NULL,
  `storage_key` VARCHAR(500) NOT NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `byte_size` BIGINT UNSIGNED NOT NULL,
  `checksum` CHAR(64) NULL DEFAULT NULL,
  `uploaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_spei_public_id` (`public_id`),
  UNIQUE KEY `uq_spei_request_pose` (`request_id`, `pose`),
  INDEX `idx_spei_request_id` (`request_id`),
  CONSTRAINT `fk_spei_request` FOREIGN KEY (`request_id`) REFERENCES `student_photo_evaluation_requests` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
