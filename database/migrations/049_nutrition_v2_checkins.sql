-- Migration: 049_nutrition_v2_checkins.sql
-- Description: Nutrition V2 Patient Check-ins & Adherence Tracking (Phase 7)
-- Rules: Request-driven MVP | Strict 1:1 request-response | UNKNOWN != ZERO | UNKNOWN != FALSE | Immutable responses | Strict multi-tenancy

-- 1. Solicitações de Check-in Clínico emitidas pela Nutricionista
CREATE TABLE IF NOT EXISTS `nutrition_v2_checkin_requests` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    `consultancy_id` BIGINT UNSIGNED NOT NULL,
    `student_membership_id` BIGINT UNSIGNED NOT NULL,
    `requested_by_membership_id` BIGINT UNSIGNED NOT NULL,
    
    -- Status do ciclo de vida persistido ('PENDING', 'COMPLETED', 'CANCELED')
    -- 'EXPIRED' é estritamente derivado em runtime: status = 'PENDING' AND due_at < CURRENT_TIMESTAMP
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    
    `requested_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `due_at` DATETIME(3) NULL DEFAULT NULL,
    `canceled_at` DATETIME(3) NULL DEFAULT NULL,
    `canceled_by_membership_id` BIGINT UNSIGNED NULL DEFAULT NULL,
    
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),
    CONSTRAINT `uq_n2cr_public_id` UNIQUE (`public_id`),
    INDEX `idx_n2cr_tenant_student_status` (`consultancy_id`, `student_membership_id`, `status`, `requested_at` DESC),
    INDEX `idx_n2cr_requested_by` (`consultancy_id`, `requested_by_membership_id`, `requested_at` DESC),

    CONSTRAINT `fk_n2cr_consultancy` FOREIGN KEY (`consultancy_id`)
        REFERENCES `consultancies` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_n2cr_student` FOREIGN KEY (`student_membership_id`)
        REFERENCES `consultancy_members` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_n2cr_requested_by` FOREIGN KEY (`requested_by_membership_id`)
        REFERENCES `consultancy_members` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_n2cr_canceled_by` FOREIGN KEY (`canceled_by_membership_id`)
        REFERENCES `consultancy_members` (`id`) ON DELETE SET NULL
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- 2. Respostas Estruturadas do Aluno (Imutáveis após envio)
CREATE TABLE IF NOT EXISTS `nutrition_v2_checkins` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `public_id` CHAR(36) NOT NULL,
    
    -- Vínculo obrigatório 1:1 com a solicitação (MVP estritamente request-driven)
    `request_id` BIGINT UNSIGNED NOT NULL,
    
    `consultancy_id` BIGINT UNSIGNED NOT NULL,
    `student_membership_id` BIGINT UNSIGNED NOT NULL,
    `submitted_at` DATETIME(3) NOT NULL,
    
    -- Adesão obrigatória ao plano (LOW | MODERATE | HIGH — sem default)
    `adherence` VARCHAR(20) NOT NULL,

    -- Percepções autorrelatadas (1 a 5 validados no servidor; NULL se não preenchido)
    `hunger_rating` TINYINT UNSIGNED NULL DEFAULT NULL,
    `energy_rating` TINYINT UNSIGNED NULL DEFAULT NULL,
    `sleep_rating` TINYINT UNSIGNED NULL DEFAULT NULL,
    `training_rating` TINYINT UNSIGNED NULL DEFAULT NULL,

    -- Métricas físicas autorreferidas (UNKNOWN != ZERO, NULL se ausente)
    `hydration_liters` DECIMAL(4,2) NULL DEFAULT NULL,
    `self_reported_weight_kg` DECIMAL(5,2) NULL DEFAULT NULL,

    -- Campos textuais de autorrelato (origem clara)
    `difficulty_text` TEXT NULL DEFAULT NULL,
    `student_notes` TEXT NULL DEFAULT NULL,

    -- Solicitação de contato/ajuda (UNKNOWN != FALSE: NULL = não respondeu, FALSE = não, TRUE = sim)
    `requests_help` BOOLEAN NULL DEFAULT NULL,

    -- Registro imutável: apenas created_at (sem updated_at)
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),
    CONSTRAINT `uq_n2c_resp_public_id` UNIQUE (`public_id`),
    CONSTRAINT `uq_n2c_resp_request` UNIQUE (`request_id`), -- Garante 1 resposta por solicitação
    INDEX `idx_n2c_resp_tenant_student_date` (`consultancy_id`, `student_membership_id`, `submitted_at` DESC),
    INDEX `idx_n2c_resp_requests_help` (`consultancy_id`, `requests_help`, `submitted_at` DESC),

    -- ON DELETE RESTRICT preserva a origem da resposta e impede perda de rastreabilidade
    CONSTRAINT `fk_n2c_resp_request` FOREIGN KEY (`request_id`)
        REFERENCES `nutrition_v2_checkin_requests` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_n2c_resp_consultancy` FOREIGN KEY (`consultancy_id`)
        REFERENCES `consultancies` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_n2c_resp_student` FOREIGN KEY (`student_membership_id`)
        REFERENCES `consultancy_members` (`id`) ON DELETE CASCADE
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
