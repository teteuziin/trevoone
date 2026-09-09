-- Migration: 025_training_execution_foundation.sql
-- Description: Core schema foundation for Student Workout Execution (Execution sessions and execution set snapshots)
-- Additive only: preserves all training prescription tables and historical data untouched.

-- 1. workout_execution_sessions: student workout execution runtime sessions
CREATE TABLE workout_execution_sessions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    consultancy_id BIGINT UNSIGNED NOT NULL,
    student_membership_id BIGINT UNSIGNED NOT NULL,
    workout_assignment_id BIGINT UNSIGNED NOT NULL,
    workout_version_id BIGINT UNSIGNED NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
    started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    completed_at DATETIME(3) NULL DEFAULT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    CONSTRAINT uq_wes_public_id
        UNIQUE (public_id),

    INDEX idx_wes_assignment_status (
        workout_assignment_id,
        status
    ),

    INDEX idx_wes_consultancy_student_status (
        consultancy_id,
        student_membership_id,
        status
    ),

    INDEX idx_wes_started_at (
        started_at
    ),

    INDEX idx_wes_version (
        workout_version_id
    ),

    CONSTRAINT fk_wes_consultancy
        FOREIGN KEY (consultancy_id)
        REFERENCES consultancies(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_wes_student_membership
        FOREIGN KEY (student_membership_id)
        REFERENCES consultancy_members(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_wes_assignment
        FOREIGN KEY (workout_assignment_id)
        REFERENCES workout_assignments(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_wes_version
        FOREIGN KEY (workout_version_id)
        REFERENCES workout_versions(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- 2. workout_execution_sets: cloned snapshots of prescribed sets with runtime actuals
CREATE TABLE workout_execution_sets (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    execution_session_id BIGINT UNSIGNED NOT NULL,
    workout_item_set_id BIGINT UNSIGNED NOT NULL,
    block_item_id BIGINT UNSIGNED NOT NULL,
    set_number TINYINT UNSIGNED NOT NULL,
    set_type VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    prescribed_reps SMALLINT UNSIGNED NULL DEFAULT NULL,
    prescribed_reps_max SMALLINT UNSIGNED NULL DEFAULT NULL,
    prescribed_load_kg DECIMAL(6,2) NULL DEFAULT NULL,
    prescribed_rest_seconds SMALLINT UNSIGNED NULL DEFAULT NULL,
    actual_reps SMALLINT UNSIGNED NULL DEFAULT NULL,
    actual_load_kg DECIMAL(6,2) NULL DEFAULT NULL,
    completed_at DATETIME(3) NULL DEFAULT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    CONSTRAINT uq_wex_sets_public_id
        UNIQUE (public_id),

    CONSTRAINT uq_wex_session_item_set
        UNIQUE (execution_session_id, workout_item_set_id),

    INDEX idx_wex_session_set_order (
        execution_session_id,
        set_number
    ),

    INDEX idx_wex_block_item (
        block_item_id
    ),

    INDEX idx_wex_item_set (
        workout_item_set_id
    ),

    CONSTRAINT fk_wex_session
        FOREIGN KEY (execution_session_id)
        REFERENCES workout_execution_sessions(id)
        ON DELETE CASCADE
        ON UPDATE RESTRICT,

    CONSTRAINT fk_wex_item_set
        FOREIGN KEY (workout_item_set_id)
        REFERENCES workout_item_sets(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_wex_block_item
        FOREIGN KEY (block_item_id)
        REFERENCES workout_block_items(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
