-- Migration: 061_nutrition_v2_patient_pre_questionnaires.sql
-- Description: Nutrition V2 Patient Pre-Questionnaires (Etapa 10)
-- Rules: Professional customizable questions | Strict tri-state & neutral options | 
-- Autosave in-progress | Patient-reported provenance | Side-by-side diff review |
-- Immutable snapshot preservation | Tenant isolation | Secure authenticated access only

CREATE TABLE IF NOT EXISTS `nutrition_v2_pre_questionnaires` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `consultancy_id` BIGINT UNSIGNED NOT NULL,
    `student_membership_id` BIGINT UNSIGNED NOT NULL,
    `requested_by_membership_id` BIGINT UNSIGNED NOT NULL,
    `consultation_id` BIGINT UNSIGNED NULL DEFAULT NULL,
    
    `title` VARCHAR(255) NOT NULL DEFAULT 'Pré-Questionário Nutricional',
    `instructions` TEXT NULL DEFAULT NULL,
    
    -- Status do ciclo de vida: 'DRAFT', 'SENT', 'IN_PROGRESS', 'ANSWERED', 'REVIEWED', 'CANCELLED'
    `status` VARCHAR(25) NOT NULL DEFAULT 'SENT',
    
    -- Snapshot imutável da estrutura de perguntas selecionadas pelo profissional
    `questions_json` JSON NOT NULL,
    
    -- Rascunho de preenchimento salvo automaticamente pelo paciente (autosave)
    `draft_responses_json` JSON NULL DEFAULT NULL,
    
    -- Respostas definitivas submetidas pelo paciente
    `responses_json` JSON NULL DEFAULT NULL,
    
    -- Registro dos campos aceitos e aplicados ao Registro Geral durante a revisão do profissional
    `applied_diff_json` JSON NULL DEFAULT NULL,
    `reviewer_notes` TEXT NULL DEFAULT NULL,
    
    -- Timestamps auditáveis
    `sent_at` DATETIME(3) NULL DEFAULT NULL,
    `started_at` DATETIME(3) NULL DEFAULT NULL,
    `submitted_at` DATETIME(3) NULL DEFAULT NULL,
    `reviewed_at` DATETIME(3) NULL DEFAULT NULL,
    `reviewed_by_membership_id` BIGINT UNSIGNED NULL DEFAULT NULL,
    `canceled_at` DATETIME(3) NULL DEFAULT NULL,
    `canceled_by_membership_id` BIGINT UNSIGNED NULL DEFAULT NULL,
    `cancel_reason` VARCHAR(255) NULL DEFAULT NULL,
    
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),
    CONSTRAINT `uq_n2pq_public_id` UNIQUE (`public_id`),
    INDEX `idx_n2pq_tenant_student_status` (`consultancy_id`, `student_membership_id`, `status`),
    INDEX `idx_n2pq_tenant_requested` (`consultancy_id`, `requested_by_membership_id`, `created_at` DESC),
    INDEX `idx_n2pq_consultation` (`consultation_id`),

    CONSTRAINT `fk_n2pq_consultancy` FOREIGN KEY (`consultancy_id`)
        REFERENCES `consultancies` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_n2pq_student` FOREIGN KEY (`student_membership_id`)
        REFERENCES `consultancy_members` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_n2pq_requested_by` FOREIGN KEY (`requested_by_membership_id`)
        REFERENCES `consultancy_members` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_n2pq_consultation` FOREIGN KEY (`consultation_id`)
        REFERENCES `nutrition_v2_consultations` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_n2pq_reviewed_by` FOREIGN KEY (`reviewed_by_membership_id`)
        REFERENCES `consultancy_members` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_n2pq_canceled_by` FOREIGN KEY (`canceled_by_membership_id`)
        REFERENCES `consultancy_members` (`id`) ON DELETE SET NULL
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
