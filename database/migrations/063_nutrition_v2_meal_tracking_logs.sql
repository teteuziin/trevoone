-- Migration: 063_nutrition_v2_meal_tracking_logs.sql
-- Description: Creates table nutrition_v2_meal_tracking_logs for patient meal check-in, tracking, photos, and nutritionist adherence review.
-- Additive only: preserves all existing nutrition v2 tables and data untouched.

CREATE TABLE IF NOT EXISTS nutrition_v2_meal_tracking_logs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    consultancy_id BIGINT UNSIGNED NOT NULL,
    student_membership_id BIGINT UNSIGNED NOT NULL,
    author_membership_id BIGINT UNSIGNED NOT NULL,
    meal_date DATE NOT NULL,
    plan_id BIGINT UNSIGNED NULL DEFAULT NULL,
    plan_version_id BIGINT UNSIGNED NULL DEFAULT NULL,
    plan_version_number INT UNSIGNED NULL DEFAULT NULL,
    meal_id BIGINT UNSIGNED NULL DEFAULT NULL,
    meal_public_id VARCHAR(64) NOT NULL DEFAULT '',
    meal_title VARCHAR(255) NOT NULL,
    meal_scheduled_time VARCHAR(20) NULL DEFAULT NULL,
    status ENUM('COMPLETED', 'COMPLETED_WITH_CHANGES', 'NOT_DONE') NOT NULL,
    not_done_reason VARCHAR(60) NULL DEFAULT NULL,
    consumed_at_time VARCHAR(10) NULL DEFAULT NULL,
    notes TEXT NULL DEFAULT NULL,
    selected_substitutions_json JSON NULL DEFAULT NULL,
    photo_storage_key VARCHAR(255) NULL DEFAULT NULL,
    photo_sha256 CHAR(64) NULL DEFAULT NULL,
    photo_size_bytes INT UNSIGNED NULL DEFAULT NULL,
    photo_mime_type VARCHAR(50) NULL DEFAULT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL DEFAULT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_n2mtl_public_id
        UNIQUE (public_id),

    CONSTRAINT uq_n2mtl_student_date_meal
        UNIQUE (consultancy_id, student_membership_id, meal_date, meal_public_id),

    INDEX idx_n2mtl_student_period (
        consultancy_id,
        student_membership_id,
        meal_date
    ),

    INDEX idx_n2mtl_date (
        meal_date
    ),

    INDEX idx_n2mtl_plan_version (
        plan_version_id
    ),

    CONSTRAINT fk_n2mtl_consultancy
        FOREIGN KEY (consultancy_id)
        REFERENCES consultancies(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_n2mtl_student_membership
        FOREIGN KEY (student_membership_id)
        REFERENCES consultancy_members(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_n2mtl_author_membership
        FOREIGN KEY (author_membership_id)
        REFERENCES consultancy_members(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_n2mtl_plan_version
        FOREIGN KEY (plan_version_id)
        REFERENCES nutrition_v2_plan_versions(id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT,

    CONSTRAINT fk_n2mtl_meal
        FOREIGN KEY (meal_id)
        REFERENCES nutrition_v2_meals(id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
