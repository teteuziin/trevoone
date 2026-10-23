-- Migration: 065_nutrition_v2_planning_expanded_measurements_and_exams.sql
-- Description: Expands patient planning with structured perimeters, bone diameters, detailed body composition, lab exams, and professional display preferences.
-- Rules: Strictly additive | Non-breaking | Multi-tenant isolation | MySQL 8.0+ compatible

-- 1. Add structured JSON columns to nutrition_v2_patient_anthropometrics
ALTER TABLE `nutrition_v2_patient_anthropometrics`
    ADD COLUMN `perimeters_json` JSON NULL DEFAULT NULL AFTER `notes`,
    ADD COLUMN `diameters_json` JSON NULL DEFAULT NULL AFTER `perimeters_json`,
    ADD COLUMN `body_composition_json` JSON NULL DEFAULT NULL AFTER `diameters_json`;

-- 2. Create table for patient laboratory exams (exames laboratoriais)
CREATE TABLE IF NOT EXISTS `nutrition_v2_patient_lab_exams` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `consultancy_id` BIGINT UNSIGNED NOT NULL,
    `patient_record_id` BIGINT UNSIGNED NOT NULL,
    `collection_date` DATE NOT NULL,
    `laboratory_name` VARCHAR(150) NULL DEFAULT NULL,
    `method` VARCHAR(150) NULL DEFAULT NULL,
    `notes` TEXT NULL DEFAULT NULL,
    `attachment_storage_key` VARCHAR(255) NULL DEFAULT NULL,
    `attachment_original_name` VARCHAR(255) NULL DEFAULT NULL,
    `attachment_mime_type` VARCHAR(100) NULL DEFAULT NULL,
    `attachment_size_bytes` INT UNSIGNED NULL DEFAULT NULL,
    `is_shared_with_patient` BOOLEAN NOT NULL DEFAULT FALSE,
    `results_json` JSON NOT NULL,
    `created_by_membership_id` BIGINT UNSIGNED NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    `deleted_at` DATETIME(3) NULL DEFAULT NULL,

    PRIMARY KEY (`id`),

    CONSTRAINT `uq_n2ple_public_id`
        UNIQUE (`public_id`),

    INDEX `idx_n2ple_record_date` (`patient_record_id`, `collection_date` DESC),
    INDEX `idx_n2ple_tenant` (`consultancy_id`),

    CONSTRAINT `fk_n2ple_record`
        FOREIGN KEY (`patient_record_id`)
        REFERENCES `nutrition_v2_patient_records` (`id`)
        ON DELETE CASCADE,

    CONSTRAINT `fk_n2ple_consultancy`
        FOREIGN KEY (`consultancy_id`)
        REFERENCES `consultancies` (`id`)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Create table for professional planning field display preferences
CREATE TABLE IF NOT EXISTS `nutrition_v2_planning_field_preferences` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `consultancy_id` BIGINT UNSIGNED NOT NULL,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `visible_fields_json` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),

    CONSTRAINT `uq_n2pfp_user_consultancy`
        UNIQUE (`consultancy_id`, `user_id`),

    CONSTRAINT `fk_n2pfp_consultancy`
        FOREIGN KEY (`consultancy_id`)
        REFERENCES `consultancies` (`id`)
        ON DELETE CASCADE,

    CONSTRAINT `fk_n2pfp_user`
        FOREIGN KEY (`user_id`)
        REFERENCES `users` (`id`)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
