CREATE TABLE student_progress_entries (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    consultancy_id BIGINT UNSIGNED NOT NULL,
    student_membership_id BIGINT UNSIGNED NOT NULL,
    recorded_on DATE NOT NULL,
    weight_kg DECIMAL(6,2) NULL DEFAULT NULL,
    waist_cm DECIMAL(6,2) NULL DEFAULT NULL,
    abdomen_cm DECIMAL(6,2) NULL DEFAULT NULL,
    hip_cm DECIMAL(6,2) NULL DEFAULT NULL,
    arm_cm DECIMAL(6,2) NULL DEFAULT NULL,
    thigh_cm DECIMAL(6,2) NULL DEFAULT NULL,
    note VARCHAR(500) NULL DEFAULT NULL,
    created_by_user_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    CONSTRAINT uq_student_progress_entries_public_id
        UNIQUE (public_id),

    INDEX idx_student_progress_history (
        consultancy_id,
        student_membership_id,
        recorded_on,
        id
    ),

    INDEX idx_student_progress_created_by (
        created_by_user_id
    ),

    CONSTRAINT fk_student_progress_consultancy
        FOREIGN KEY (consultancy_id)
        REFERENCES consultancies(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_student_progress_student_membership
        FOREIGN KEY (student_membership_id)
        REFERENCES consultancy_members(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_student_progress_created_by
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
