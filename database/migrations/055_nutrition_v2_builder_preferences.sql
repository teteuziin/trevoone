-- Migration: 055_nutrition_v2_builder_preferences.sql
-- Description: Individual nutritionist workspace view preferences for nutrition plan builder
-- Rules: Strict multi-tenancy | User-scoped | Non-destructive defaults | No cross-tenant leak

CREATE TABLE IF NOT EXISTS `nutrition_v2_builder_preferences` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `consultancy_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `show_student_preview` TINYINT(1) NOT NULL DEFAULT 1,
    `show_version_history` TINYINT(1) NOT NULL DEFAULT 1,
    `show_template_actions` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_nutrition_builder_pref_user_consultancy` (`consultancy_id`, `user_id`),
    INDEX `idx_nutrition_builder_pref_user` (`user_id`),

    CONSTRAINT `fk_nutrition_builder_pref_consultancy`
        FOREIGN KEY (`consultancy_id`) REFERENCES `consultancies` (`id`)
        ON DELETE CASCADE,

    CONSTRAINT `fk_nutrition_builder_pref_user`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
