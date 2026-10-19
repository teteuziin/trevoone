-- Migration 053: Training V2 - Exercise Aliases and Semantic Search Foundation
-- Additive only: preserves existing exercises, media, workouts and snapshots.

CREATE TABLE IF NOT EXISTS `exercise_aliases` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `exercise_id` BIGINT UNSIGNED NOT NULL,
    `alias` VARCHAR(255) NOT NULL,
    `normalized_alias` VARCHAR(255) NOT NULL,
    `scope` VARCHAR(20) NOT NULL DEFAULT 'GLOBAL',
    `consultancy_id` BIGINT UNSIGNED NULL DEFAULT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_ea_exercise_normalized_alias` (`exercise_id`, `normalized_alias`),
    INDEX `idx_ea_normalized_alias` (`normalized_alias`),
    INDEX `idx_ea_exercise` (`exercise_id`),
    INDEX `idx_ea_scope_consultancy` (`scope`, `consultancy_id`),
    CONSTRAINT `fk_ea_exercise`
        FOREIGN KEY (`exercise_id`)
        REFERENCES `exercises`(`id`)
        ON DELETE CASCADE,
    CONSTRAINT `fk_ea_consultancy`
        FOREIGN KEY (`consultancy_id`)
        REFERENCES `consultancies`(`id`)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add indexes on search attributes if they do not exist
CREATE INDEX `idx_ex_equipment` ON `exercises` (`equipment`);
CREATE INDEX `idx_ex_movement_pattern` ON `exercises` (`movement_pattern`);
