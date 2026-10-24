-- Migration 066: Scoped Workout Execution Sessions to Division Block
-- Trevo One - Training Execution V2.1 Scoped Divisions
-- Additive only: Adds optional workout_block_id to workout_execution_sessions
-- Existing historical sessions remain fully valid with NULL workout_block_id

ALTER TABLE `workout_execution_sessions`
  ADD COLUMN IF NOT EXISTS `workout_block_id` BIGINT UNSIGNED NULL DEFAULT NULL AFTER `workout_version_id`,
  ADD INDEX `idx_wes_block` (`workout_block_id`),
  ADD CONSTRAINT `fk_wes_block`
    FOREIGN KEY (`workout_block_id`)
    REFERENCES `workout_blocks` (`id`)
    ON DELETE RESTRICT;

ALTER TABLE `workout_execution_sets`
  ADD COLUMN IF NOT EXISTS `is_skipped` TINYINT(1) NOT NULL DEFAULT 0 AFTER `completed_at`;
