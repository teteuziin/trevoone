-- Migration 068: Workout Assignment Custom Title, Execution Checklist and Student Feedback
-- Trevo One - Training V2
-- Additive only: Adds custom_title to workout_assignments, student feedback to workout_execution_sessions,
-- and creates workout_execution_items for exercise-level checklist completion.

ALTER TABLE `workout_assignments`
  ADD COLUMN IF NOT EXISTS `custom_title` VARCHAR(255) NULL DEFAULT NULL AFTER `student_membership_id`;

ALTER TABLE `workout_execution_sessions`
  ADD COLUMN IF NOT EXISTS `student_completion_state` ENUM('ALL', 'PARTIAL', 'NONE') NULL DEFAULT NULL AFTER `status`,
  ADD COLUMN IF NOT EXISTS `student_feedback_notes` TEXT NULL DEFAULT NULL AFTER `student_completion_state`,
  ADD COLUMN IF NOT EXISTS `student_feedback_at` DATETIME NULL DEFAULT NULL AFTER `student_feedback_notes`;

CREATE TABLE IF NOT EXISTS `workout_execution_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `public_id` VARCHAR(36) NOT NULL,
  `execution_session_id` BIGINT UNSIGNED NOT NULL,
  `block_item_id` BIGINT UNSIGNED NOT NULL,
  `status` ENUM('COMPLETED', 'SKIPPED') NOT NULL DEFAULT 'COMPLETED',
  `skip_reason` VARCHAR(255) NULL DEFAULT NULL,
  `completed_at` DATETIME NULL DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_wei_session_item` (`execution_session_id`, `block_item_id`),
  INDEX `idx_wei_session` (`execution_session_id`),
  INDEX `idx_wei_item` (`block_item_id`),
  CONSTRAINT `fk_wei_session` FOREIGN KEY (`execution_session_id`) REFERENCES `workout_execution_sessions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wei_item` FOREIGN KEY (`block_item_id`) REFERENCES `workout_block_items` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
