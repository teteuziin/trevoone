-- Migration: 062_nutrition_v2_anthropometrics_evolution_expansion.sql
-- Description: Nutrition V2 Patient Planning & Evolution (Etapa 11)
-- Rules: Additive only | Unknown != Zero | Preserve history with auditability | 
-- Strict multi-tenancy | Explicit protocol segregation | Multi-device responsiveness

-- 1. Add circumferences, skinfolds, body composition, and clinical metadata columns to nutrition_v2_patient_anthropometrics
ALTER TABLE `nutrition_v2_patient_anthropometrics`
    -- Additional circumferences (cm)
    ADD COLUMN `neck_cm` DECIMAL(6,2) NULL DEFAULT NULL AFTER `chest_cm`,
    ADD COLUMN `forearm_cm` DECIMAL(6,2) NULL DEFAULT NULL AFTER `neck_cm`,
    ADD COLUMN `abdomen_cm` DECIMAL(6,2) NULL DEFAULT NULL AFTER `forearm_cm`,
    ADD COLUMN `relaxed_arm_cm` DECIMAL(6,2) NULL DEFAULT NULL AFTER `abdomen_cm`,
    ADD COLUMN `contracted_arm_cm` DECIMAL(6,2) NULL DEFAULT NULL AFTER `relaxed_arm_cm`,

    -- Skinfolds (Dobras cutâneas em mm)
    ADD COLUMN `triceps_mm` DECIMAL(5,2) NULL DEFAULT NULL AFTER `contracted_arm_cm`,
    ADD COLUMN `biceps_mm` DECIMAL(5,2) NULL DEFAULT NULL AFTER `triceps_mm`,
    ADD COLUMN `subscapular_mm` DECIMAL(5,2) NULL DEFAULT NULL AFTER `biceps_mm`,
    ADD COLUMN `suprailiac_mm` DECIMAL(5,2) NULL DEFAULT NULL AFTER `subscapular_mm`,
    ADD COLUMN `abdominal_fold_mm` DECIMAL(5,2) NULL DEFAULT NULL AFTER `suprailiac_mm`,
    ADD COLUMN `chest_fold_mm` DECIMAL(5,2) NULL DEFAULT NULL AFTER `abdominal_fold_mm`,
    ADD COLUMN `thigh_fold_mm` DECIMAL(5,2) NULL DEFAULT NULL AFTER `chest_fold_mm`,
    ADD COLUMN `midaxillary_mm` DECIMAL(5,2) NULL DEFAULT NULL AFTER `thigh_fold_mm`,
    ADD COLUMN `calf_fold_mm` DECIMAL(5,2) NULL DEFAULT NULL AFTER `midaxillary_mm`,
    ADD COLUMN `skinfold_protocol` VARCHAR(50) NULL DEFAULT NULL AFTER `calf_fold_mm`,

    -- Body Composition (measured, calculated or equipment reported)
    ADD COLUMN `body_fat_pct` DECIMAL(5,2) NULL DEFAULT NULL AFTER `skinfold_protocol`,
    ADD COLUMN `fat_mass_kg` DECIMAL(6,2) NULL DEFAULT NULL AFTER `body_fat_pct`,
    ADD COLUMN `lean_mass_kg` DECIMAL(6,2) NULL DEFAULT NULL AFTER `fat_mass_kg`,
    ADD COLUMN `muscle_mass_kg` DECIMAL(6,2) NULL DEFAULT NULL AFTER `lean_mass_kg`,
    ADD COLUMN `body_water_pct` DECIMAL(5,2) NULL DEFAULT NULL AFTER `muscle_mass_kg`,
    ADD COLUMN `body_water_kg` DECIMAL(6,2) NULL DEFAULT NULL AFTER `body_water_pct`,
    ADD COLUMN `bone_mass_value` DECIMAL(6,2) NULL DEFAULT NULL AFTER `body_water_kg`,
    ADD COLUMN `bone_mass_unit` VARCHAR(20) NULL DEFAULT NULL AFTER `bone_mass_value`,
    ADD COLUMN `bone_mass_method` VARCHAR(100) NULL DEFAULT NULL AFTER `bone_mass_unit`,

    -- Clinical metadata, origin, and audit trail
    ADD COLUMN `source_type` VARCHAR(30) NOT NULL DEFAULT 'PROFESSIONAL_RECORDED' AFTER `bone_mass_method`,
    ADD COLUMN `equipment_method` VARCHAR(150) NULL DEFAULT NULL AFTER `source_type`,
    ADD COLUMN `updated_by_membership_id` BIGINT UNSIGNED NULL DEFAULT NULL AFTER `created_by_membership_id`,
    ADD COLUMN `edit_reason` VARCHAR(255) NULL DEFAULT NULL AFTER `updated_by_membership_id`,

    ADD INDEX `idx_n2pa_source` (`source_type`),
    ADD CONSTRAINT `fk_n2pa_updated_by` FOREIGN KEY (`updated_by_membership_id`)
        REFERENCES `consultancy_members` (`id`) ON DELETE SET NULL;

-- 2. Audit table for anthropometric edits and corrections
CREATE TABLE IF NOT EXISTS `nutrition_v2_patient_anthropometrics_audit` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `consultancy_id` BIGINT UNSIGNED NOT NULL,
    `patient_record_id` BIGINT UNSIGNED NOT NULL,
    `anthropometric_id` BIGINT UNSIGNED NOT NULL,
    `changed_by_membership_id` BIGINT UNSIGNED NOT NULL,
    `field_name` VARCHAR(100) NOT NULL,
    `previous_value` TEXT NULL DEFAULT NULL,
    `new_value` TEXT NULL DEFAULT NULL,
    `edit_reason` VARCHAR(255) NULL DEFAULT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),
    CONSTRAINT `uq_n2paa_public_id` UNIQUE (`public_id`),
    INDEX `idx_n2paa_tenant_anthro` (`consultancy_id`, `anthropometric_id`, `created_at` DESC),
    INDEX `idx_n2paa_record` (`patient_record_id`),

    CONSTRAINT `fk_n2paa_consultancy` FOREIGN KEY (`consultancy_id`)
        REFERENCES `consultancies` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_n2paa_record` FOREIGN KEY (`patient_record_id`)
        REFERENCES `nutrition_v2_patient_records` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_n2paa_anthro` FOREIGN KEY (`anthropometric_id`)
        REFERENCES `nutrition_v2_patient_anthropometrics` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_n2paa_changed_by` FOREIGN KEY (`changed_by_membership_id`)
        REFERENCES `consultancy_members` (`id`) ON DELETE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
