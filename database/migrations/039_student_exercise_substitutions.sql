-- Migration 039: Student Exercise Substitutions
-- Trevo One - AI Intelligence V2
-- Tracks student exercise swaps during active workout execution sessions (max 3 per workout execution).
-- Prescribes original workout prescription immutably; records performed exercise, operational reason, and sequence.

CREATE TABLE IF NOT EXISTS `workout_execution_exercise_substitutions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `public_id` CHAR(36) NOT NULL,
  `consultancy_id` BIGINT UNSIGNED NOT NULL,
  `execution_session_id` BIGINT UNSIGNED NOT NULL,
  `student_membership_id` BIGINT UNSIGNED NOT NULL,
  `block_item_id` BIGINT UNSIGNED NOT NULL,
  `original_exercise_id` BIGINT UNSIGNED NOT NULL,
  `performed_exercise_id` BIGINT UNSIGNED NOT NULL,
  `reason` VARCHAR(50) NOT NULL,
  `source` VARCHAR(50) NOT NULL DEFAULT 'STUDENT_AI_SUGGESTION',
  `sequence_number` TINYINT UNSIGNED NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_wees_public_id` (`public_id`),
  UNIQUE KEY `uq_wees_session_seq` (`execution_session_id`, `sequence_number`),
  INDEX `idx_wees_session` (`execution_session_id`),
  INDEX `idx_wees_student` (`student_membership_id`),
  INDEX `idx_wees_consultancy` (`consultancy_id`),
  INDEX `idx_wees_block_item` (`block_item_id`),
  CONSTRAINT `fk_wees_consultancy` FOREIGN KEY (`consultancy_id`) REFERENCES `consultancies` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_wees_session` FOREIGN KEY (`execution_session_id`) REFERENCES `workout_execution_sessions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wees_student` FOREIGN KEY (`student_membership_id`) REFERENCES `consultancy_members` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_wees_block_item` FOREIGN KEY (`block_item_id`) REFERENCES `workout_block_items` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_wees_orig_ex` FOREIGN KEY (`original_exercise_id`) REFERENCES `exercises` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_wees_perf_ex` FOREIGN KEY (`performed_exercise_id`) REFERENCES `exercises` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
