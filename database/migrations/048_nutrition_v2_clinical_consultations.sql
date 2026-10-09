-- Migration: 048_nutrition_v2_clinical_consultations.sql
-- Description: Nutrition V2 Clinical Consultations & Follow-up Timeline (Phase 6)
-- Rules: UNKNOWN != ZERO | No clinical defaults | Historical preservation | Strict multi-tenancy | No parallel agenda

CREATE TABLE IF NOT EXISTS `nutrition_v2_consultations` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `consultancy_id` BIGINT UNSIGNED NOT NULL,
    `student_membership_id` BIGINT UNSIGNED NOT NULL,
    `professional_membership_id` BIGINT UNSIGNED NOT NULL,
    
    -- Referência complementar ao prontuário (não é dono canônico)
    `patient_record_id` BIGINT UNSIGNED NULL DEFAULT NULL,
    
    -- Vínculo opcional 1:1 com a agenda oficial (teleconsulta ou presencial)
    `consultation_appointment_id` BIGINT UNSIGNED NULL DEFAULT NULL,

    -- Tipo clínico obrigatório (sem default clínico implícito)
    `consultation_type` VARCHAR(20) NOT NULL, -- 'INITIAL' | 'FOLLOW_UP'

    -- Status operacional do atendimento
    `status` VARCHAR(20) NOT NULL DEFAULT 'DRAFT', -- 'DRAFT' | 'COMPLETED' | 'CANCELLED'

    -- Data e hora em que o atendimento clínico ocorreu (sem default técnico automático)
    `consultation_date` DATETIME(3) NOT NULL,

    -- Referências canônicas associadas no momento da consulta
    `anthropometric_entry_id` BIGINT UNSIGNED NULL DEFAULT NULL,
    -- Published plan version active at consultation time (referência histórica imutável)
    `active_plan_version_id` BIGINT UNSIGNED NULL DEFAULT NULL,
    `plan_adjusted` BOOLEAN NULL DEFAULT NULL, -- NULL: não informado, FALSE: não, TRUE: sim

    -- Adesão e Dificuldades
    `adherence` VARCHAR(20) NOT NULL DEFAULT 'NOT_ASSESSED', -- 'NOT_ASSESSED' | 'LOW' | 'MODERATE' | 'HIGH'
    `adherence_notes` TEXT NULL DEFAULT NULL,
    `difficulties` TEXT NULL DEFAULT NULL,

    -- Registro Clínico e Conduta
    `symptoms_observations` TEXT NULL DEFAULT NULL,
    `conduct` TEXT NULL DEFAULT NULL,
    `next_goals` TEXT NULL DEFAULT NULL,

    -- Recomendação clínica profissional de retorno (NÃO é agendamento de agenda)
    `recommended_return_date` DATE NULL DEFAULT NULL,

    -- Auditoria e Ciclo de Vida
    `completed_at` DATETIME(3) NULL DEFAULT NULL,
    `completed_by_membership_id` BIGINT UNSIGNED NULL DEFAULT NULL,
    `canceled_at` DATETIME(3) NULL DEFAULT NULL,
    `canceled_by_membership_id` BIGINT UNSIGNED NULL DEFAULT NULL,
    `cancel_reason` TEXT NULL DEFAULT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),

    CONSTRAINT `uq_n2c_public_id` UNIQUE (`public_id`),
    CONSTRAINT `uq_n2c_appointment` UNIQUE (`consultation_appointment_id`),

    -- Índices para timeline cronológica e queries multi-tenant de alta performance
    INDEX `idx_n2c_tenant_student` (`consultancy_id`, `student_membership_id`, `consultation_date` DESC),
    INDEX `idx_n2c_patient_record` (`patient_record_id`, `consultation_date` DESC),
    INDEX `idx_n2c_professional` (`consultancy_id`, `professional_membership_id`, `consultation_date` DESC),
    INDEX `idx_n2c_status_date` (`consultancy_id`, `status`, `consultation_date` DESC),
    INDEX `idx_n2c_anthro` (`anthropometric_entry_id`),
    INDEX `idx_n2c_plan_version` (`active_plan_version_id`),

    -- Foreign Keys seguras e orientadas à preservação do histórico
    CONSTRAINT `fk_n2c_consultancy` FOREIGN KEY (`consultancy_id`)
        REFERENCES `consultancies` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_n2c_student` FOREIGN KEY (`student_membership_id`)
        REFERENCES `consultancy_members` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_n2c_professional` FOREIGN KEY (`professional_membership_id`)
        REFERENCES `consultancy_members` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_n2c_patient_record` FOREIGN KEY (`patient_record_id`)
        REFERENCES `nutrition_v2_patient_records` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_n2c_appointment` FOREIGN KEY (`consultation_appointment_id`)
        REFERENCES `consultations` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_n2c_anthro` FOREIGN KEY (`anthropometric_entry_id`)
        REFERENCES `nutrition_v2_patient_anthropometrics` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_n2c_plan_version` FOREIGN KEY (`active_plan_version_id`)
        REFERENCES `nutrition_v2_plan_versions` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_n2c_completed_by` FOREIGN KEY (`completed_by_membership_id`)
        REFERENCES `consultancy_members` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_n2c_canceled_by` FOREIGN KEY (`canceled_by_membership_id`)
        REFERENCES `consultancy_members` (`id`) ON DELETE SET NULL
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
