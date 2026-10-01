-- Migration 041: Training Builder V3 - Sub-blocks & Duration Units
-- Trevo One - Training Builder V3 Resilient Hierarchy & Time Unit Expansion

CREATE TABLE IF NOT EXISTS `workout_sub_blocks` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `block_id` BIGINT UNSIGNED NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `sort_order` INT NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),
    CONSTRAINT `uq_workout_sub_blocks_public_id` UNIQUE (`public_id`),
    INDEX `idx_wsb_block_sort` (`block_id`, `sort_order`),
    CONSTRAINT `fk_wsb_block` FOREIGN KEY (`block_id`) REFERENCES `workout_blocks`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `workout_block_items`
  ADD COLUMN IF NOT EXISTS `sub_block_id` BIGINT UNSIGNED NULL DEFAULT NULL AFTER `block_id`,
  ADD COLUMN IF NOT EXISTS `duration_unit` VARCHAR(10) NULL DEFAULT 'SECONDS' AFTER `prescription_mode`;

CREATE INDEX IF NOT EXISTS `idx_wbi_sub_block` ON `workout_block_items` (`sub_block_id`);

ALTER TABLE `workout_item_sets`
  ADD COLUMN IF NOT EXISTS `duration_unit` VARCHAR(10) NULL DEFAULT 'SECONDS' AFTER `target_duration_seconds`;
