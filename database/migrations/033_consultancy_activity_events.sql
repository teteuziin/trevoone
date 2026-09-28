-- Migration 033: Consultancy Activity Events
-- Centralized immutable audit ledger for tenancy-wide user actions

CREATE TABLE IF NOT EXISTS `consultancy_activity_events` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `public_id` CHAR(36) NOT NULL,
  `consultancy_id` BIGINT UNSIGNED NOT NULL,
  `actor_membership_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `actor_user_id` BIGINT UNSIGNED NOT NULL,
  `actor_role` VARCHAR(50) NOT NULL,
  `action` VARCHAR(80) NOT NULL,
  `module` VARCHAR(50) NOT NULL,
  `resource_type` VARCHAR(50) NOT NULL,
  `resource_public_id` VARCHAR(100) NULL DEFAULT NULL,
  `subject_membership_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `summary` VARCHAR(255) NOT NULL,
  `metadata_json` JSON NULL DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cae_public_id` (`public_id`),
  INDEX `idx_cae_consultancy_created` (`consultancy_id`, `created_at`),
  INDEX `idx_cae_actor_created` (`actor_membership_id`, `created_at`),
  INDEX `idx_cae_module_created` (`consultancy_id`, `module`, `created_at`),
  INDEX `idx_cae_subject_created` (`consultancy_id`, `subject_membership_id`, `created_at`),
  INDEX `idx_cae_action_created` (`consultancy_id`, `action`, `created_at`),
  CONSTRAINT `fk_cae_consultancy` FOREIGN KEY (`consultancy_id`) REFERENCES `consultancies` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_cae_actor_user` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
