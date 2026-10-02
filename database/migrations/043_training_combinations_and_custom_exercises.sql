-- Migration 043: Training Builder V3.1 - Combinations (Bi-set, Tri-set, Giant Set, Circuit) & Custom Exercises
-- Trevo One - Exercise Combinations and Tenancy-Isolated Custom Exercises

CREATE TABLE IF NOT EXISTS `workout_item_combinations` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `block_id` BIGINT UNSIGNED NOT NULL,
    `sub_block_id` BIGINT UNSIGNED NULL DEFAULT NULL,
    `combination_type` VARCHAR(30) NOT NULL, -- 'BI_SET', 'TRI_SET', 'GIANT_SET', 'CIRCUIT'
    `title` VARCHAR(100) NULL DEFAULT NULL,
    `sort_order` INT NOT NULL DEFAULT 0,
    `rounds` SMALLINT UNSIGNED NULL DEFAULT NULL,
    `rest_after_seconds` SMALLINT UNSIGNED NOT NULL DEFAULT 60,
    `rest_after_unit` VARCHAR(10) NOT NULL DEFAULT 'SECONDS',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),
    CONSTRAINT `uq_wic_public_id` UNIQUE (`public_id`),
    INDEX `idx_wic_block` (`block_id`),
    INDEX `idx_wic_sub_block_sort` (`sub_block_id`, `sort_order`),
    CONSTRAINT `fk_wic_block` FOREIGN KEY (`block_id`) REFERENCES `workout_blocks`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_wic_sub_block` FOREIGN KEY (`sub_block_id`) REFERENCES `workout_sub_blocks`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `workout_block_items`
  ADD COLUMN IF NOT EXISTS `combination_id` BIGINT UNSIGNED NULL DEFAULT NULL AFTER `sub_block_id`,
  ADD COLUMN IF NOT EXISTS `custom_exercise_id` BIGINT UNSIGNED NULL DEFAULT NULL AFTER `exercise_id`;

CREATE INDEX IF NOT EXISTS `idx_wbi_combination` ON `workout_block_items` (`combination_id`);
CREATE INDEX IF NOT EXISTS `idx_wbi_custom_exercise` ON `workout_block_items` (`custom_exercise_id`);
