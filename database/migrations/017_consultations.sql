-- Migration 017: Teleconsultation 1:1 Domain Foundation
-- Implements consultations table for Personal/Nutritionist <-> Student 1:1 sessions

CREATE TABLE IF NOT EXISTS consultations (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    consultancy_id BIGINT UNSIGNED NOT NULL,
    student_membership_id BIGINT UNSIGNED NOT NULL,
    professional_membership_id BIGINT UNSIGNED NOT NULL,
    professional_type VARCHAR(32) NOT NULL,
    title VARCHAR(200) NOT NULL,
    scheduled_start_at DATETIME(3) NOT NULL,
    scheduled_end_at DATETIME(3) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'SCHEDULED',
    started_at DATETIME(3) NULL DEFAULT NULL,
    ended_at DATETIME(3) NULL DEFAULT NULL,
    canceled_at DATETIME(3) NULL DEFAULT NULL,
    canceled_by_user_id BIGINT UNSIGNED NULL DEFAULT NULL,
    cancel_reason TEXT NULL DEFAULT NULL,
    created_by_user_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    UNIQUE KEY uq_consultations_public_id (public_id),
    KEY idx_consultations_tenant_start (consultancy_id, scheduled_start_at),
    KEY idx_consultations_tenant_status (consultancy_id, status, scheduled_start_at),
    KEY idx_consultations_student (student_membership_id, status, scheduled_start_at),
    KEY idx_consultations_professional (professional_membership_id, status, scheduled_start_at),

    CONSTRAINT fk_consultations_consultancy FOREIGN KEY (consultancy_id) REFERENCES consultancies (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_consultations_student FOREIGN KEY (student_membership_id) REFERENCES consultancy_members (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_consultations_professional FOREIGN KEY (professional_membership_id) REFERENCES consultancy_members (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_consultations_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_consultations_canceled_by FOREIGN KEY (canceled_by_user_id) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
