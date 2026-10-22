-- Migration: 060_nutrition_v2_patient_clinical_notes_and_provenance.sql
-- Description: Nutrition V2 Patient General Record (Etapa 9): Clinical notes, provenance, gestational reference date and field audit
-- Rules: UNKNOWN != ZERO | Field empty != "Não" | Strict tenant isolation | Historical immutability | Confidential internal notes

-- 1. Add provenance json and separate food_intolerances column to nutrition_v2_patient_records
ALTER TABLE `nutrition_v2_patient_records`
ADD COLUMN `food_intolerances` TEXT NULL DEFAULT NULL AFTER `food_allergies_intolerances`,
ADD COLUMN `field_provenance_json` JSON NULL DEFAULT NULL AFTER `work_study_routine`;

-- 2. Add gestational reference date to nutrition_v2_patient_pregnancy
ALTER TABLE `nutrition_v2_patient_pregnancy`
ADD COLUMN `gestational_reference_date` DATE NULL DEFAULT NULL AFTER `gestational_weeks`;

-- 3. nutrition_v2_patient_clinical_notes: Evolution notes, consultations notes and conduct
CREATE TABLE IF NOT EXISTS `nutrition_v2_patient_clinical_notes` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `consultancy_id` BIGINT UNSIGNED NOT NULL,
    `student_membership_id` BIGINT UNSIGNED NOT NULL,
    `author_membership_id` BIGINT UNSIGNED NOT NULL,
    `patient_record_id` BIGINT UNSIGNED NULL DEFAULT NULL,
    `note_date` DATE NOT NULL,
    `context_type` VARCHAR(50) NOT NULL DEFAULT 'ROUTINE',
    `status` VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    `conduct` TEXT NULL DEFAULT NULL,
    `content` TEXT NOT NULL,
    `confidential_internal` TINYINT(1) NOT NULL DEFAULT 1,
    `finalized_at` DATETIME(3) NULL DEFAULT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),
    CONSTRAINT `uq_n2pcn_public_id` UNIQUE (`public_id`),
    INDEX `idx_n2pcn_tenant_student` (`consultancy_id`, `student_membership_id`, `note_date` DESC),
    INDEX `idx_n2pcn_status` (`consultancy_id`, `status`),
    INDEX `idx_n2pcn_author` (`consultancy_id`, `author_membership_id`),
    INDEX `idx_n2pcn_record` (`patient_record_id`),

    CONSTRAINT `fk_n2pcn_consultancy` FOREIGN KEY (`consultancy_id`)
        REFERENCES `consultancies` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_n2pcn_student` FOREIGN KEY (`student_membership_id`)
        REFERENCES `consultancy_members` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_n2pcn_author` FOREIGN KEY (`author_membership_id`)
        REFERENCES `consultancy_members` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_n2pcn_record` FOREIGN KEY (`patient_record_id`)
        REFERENCES `nutrition_v2_patient_records` (`id`) ON DELETE SET NULL
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- 4. nutrition_v2_patient_record_audit: Full traceability of general record field updates
CREATE TABLE IF NOT EXISTS `nutrition_v2_patient_record_audit` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `consultancy_id` BIGINT UNSIGNED NOT NULL,
    `patient_record_id` BIGINT UNSIGNED NOT NULL,
    `changed_by_membership_id` BIGINT UNSIGNED NOT NULL,
    `field_name` VARCHAR(100) NOT NULL,
    `previous_value` TEXT NULL DEFAULT NULL,
    `new_value` TEXT NULL DEFAULT NULL,
    `change_source` VARCHAR(50) NOT NULL DEFAULT 'PROFESSIONAL_EDIT',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),
    CONSTRAINT `uq_n2pra_public_id` UNIQUE (`public_id`),
    INDEX `idx_n2pra_record_created` (`patient_record_id`, `created_at` DESC),
    INDEX `idx_n2pra_tenant` (`consultancy_id`, `created_at` DESC),

    CONSTRAINT `fk_n2pra_consultancy` FOREIGN KEY (`consultancy_id`)
        REFERENCES `consultancies` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_n2pra_record` FOREIGN KEY (`patient_record_id`)
        REFERENCES `nutrition_v2_patient_records` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_n2pra_changed_by` FOREIGN KEY (`changed_by_membership_id`)
        REFERENCES `consultancy_members` (`id`) ON DELETE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
