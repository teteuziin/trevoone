-- Migration: 050_nutrition_v2_patient_followup_events.sql
-- Description: Nutrition Patient Follow-up Events & Spontaneous Clinical Timeline (V1)
-- Rules: Strict tenant isolation | Historical preservation (RESTRICT on member delete) | No check-in duplication

CREATE TABLE IF NOT EXISTS `nutrition_v2_patient_followup_events` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `consultancy_id` BIGINT UNSIGNED NOT NULL,
    `student_membership_id` BIGINT UNSIGNED NOT NULL,
    `author_membership_id` BIGINT UNSIGNED NOT NULL,

    -- Event Type V1: 'FOOD_PHOTO' ou 'PATIENT_NOTE'
    `event_type` VARCHAR(30) NOT NULL,

    -- Data/hora real do registro/refeição
    `occurred_at` DATETIME(3) NOT NULL,

    -- Refeição associada (somente FOOD_PHOTO; NULL para PATIENT_NOTE)
    `meal_type` VARCHAR(30) NULL DEFAULT NULL,

    -- Texto descritivo / anotação do paciente
    `caption` TEXT NULL DEFAULT NULL,

    -- Storage privado da foto (obrigatório para FOOD_PHOTO; NULL para PATIENT_NOTE)
    `photo_storage_key` VARCHAR(255) NULL DEFAULT NULL,
    `photo_sha256` CHAR(64) NULL DEFAULT NULL,
    `photo_size_bytes` INT UNSIGNED NULL DEFAULT NULL,
    `photo_mime_type` VARCHAR(50) NULL DEFAULT NULL,

    -- Registro imutável de criação no servidor
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),
    CONSTRAINT `uq_n2pfe_public_id` UNIQUE (`public_id`),
    INDEX `idx_n2pfe_tenant_student_occurred` (`consultancy_id`, `student_membership_id`, `occurred_at` DESC),
    INDEX `idx_n2pfe_tenant_type_occurred` (`consultancy_id`, `event_type`, `occurred_at` DESC),

    -- Política de integridade: preservação histórica clínica
    CONSTRAINT `fk_n2pfe_consultancy` FOREIGN KEY (`consultancy_id`)
        REFERENCES `consultancies` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_n2pfe_student` FOREIGN KEY (`student_membership_id`)
        REFERENCES `consultancy_members` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_n2pfe_author` FOREIGN KEY (`author_membership_id`)
        REFERENCES `consultancy_members` (`id`) ON DELETE RESTRICT,

    -- Validação semântica segura no MySQL 8
    CONSTRAINT `chk_n2pfe_event_type` CHECK (`event_type` IN ('FOOD_PHOTO', 'PATIENT_NOTE')),
    CONSTRAINT `chk_n2pfe_meal_type` CHECK (
        `meal_type` IS NULL OR
        `meal_type` IN ('BREAKFAST', 'MORNING_SNACK', 'LUNCH', 'AFTERNOON_SNACK', 'DINNER', 'SUPPER', 'OTHER')
    )
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
