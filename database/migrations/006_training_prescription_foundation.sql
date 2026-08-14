CREATE TABLE training_exercises (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    consultancy_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL DEFAULT NULL,
    muscle_group VARCHAR(100) NULL DEFAULT NULL,
    equipment VARCHAR(100) NULL DEFAULT NULL,
    instructions TEXT NULL DEFAULT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_by_user_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL DEFAULT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_training_exercises_public_id
        UNIQUE (public_id),

    INDEX idx_te_consultancy_status (
        consultancy_id,
        status,
        deleted_at
    ),

    INDEX idx_te_created_by (
        created_by_user_id
    ),

    CONSTRAINT fk_te_consultancy
        FOREIGN KEY (consultancy_id)
        REFERENCES consultancies(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_te_created_by
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

CREATE TABLE training_plans (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    consultancy_id BIGINT UNSIGNED NOT NULL,
    student_membership_id BIGINT UNSIGNED NOT NULL,
    created_by_user_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255) NULL DEFAULT NULL,
    description TEXT NULL DEFAULT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    starts_on DATE NULL DEFAULT NULL,
    ends_on DATE NULL DEFAULT NULL,
    activated_at DATETIME(3) NULL DEFAULT NULL,
    archived_at DATETIME(3) NULL DEFAULT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL DEFAULT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_training_plans_public_id
        UNIQUE (public_id),

    INDEX idx_tp_consultancy_student_status (
        consultancy_id,
        student_membership_id,
        status,
        deleted_at
    ),

    INDEX idx_tp_created_by (
        created_by_user_id
    ),

    CONSTRAINT fk_tp_consultancy
        FOREIGN KEY (consultancy_id)
        REFERENCES consultancies(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_tp_student_membership
        FOREIGN KEY (student_membership_id)
        REFERENCES consultancy_members(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_tp_created_by
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

CREATE TABLE training_workouts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    training_plan_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255) NULL DEFAULT NULL,
    scheduled_weekday TINYINT UNSIGNED NULL DEFAULT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    notes TEXT NULL DEFAULT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL DEFAULT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_training_workouts_public_id
        UNIQUE (public_id),

    INDEX idx_tw_plan_sort (
        training_plan_id,
        deleted_at,
        sort_order
    ),

    CONSTRAINT fk_tw_training_plan
        FOREIGN KEY (training_plan_id)
        REFERENCES training_plans(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

CREATE TABLE training_workout_sections (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    workout_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL DEFAULT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL DEFAULT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_training_workout_sections_public_id
        UNIQUE (public_id),

    INDEX idx_tws_workout_sort (
        workout_id,
        deleted_at,
        sort_order
    ),

    CONSTRAINT fk_tws_workout
        FOREIGN KEY (workout_id)
        REFERENCES training_workouts(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

CREATE TABLE training_workout_blocks (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    section_id BIGINT UNSIGNED NOT NULL,
    block_type VARCHAR(50) NOT NULL DEFAULT 'SINGLE',
    title VARCHAR(255) NULL DEFAULT NULL,
    rounds INT UNSIGNED NULL DEFAULT NULL,
    rest_between_exercises_seconds INT UNSIGNED NULL DEFAULT NULL,
    rest_after_block_seconds INT UNSIGNED NULL DEFAULT NULL,
    instructions TEXT NULL DEFAULT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL DEFAULT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_training_workout_blocks_public_id
        UNIQUE (public_id),

    INDEX idx_twb_section_sort (
        section_id,
        deleted_at,
        sort_order
    ),

    CONSTRAINT fk_twb_section
        FOREIGN KEY (section_id)
        REFERENCES training_workout_sections(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

CREATE TABLE training_workout_block_exercises (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    block_id BIGINT UNSIGNED NOT NULL,
    exercise_id BIGINT UNSIGNED NULL DEFAULT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    exercise_name_snapshot VARCHAR(255) NOT NULL,
    description_snapshot TEXT NULL DEFAULT NULL,
    muscle_group_snapshot VARCHAR(100) NULL DEFAULT NULL,
    equipment_snapshot VARCHAR(100) NULL DEFAULT NULL,
    instructions_snapshot TEXT NULL DEFAULT NULL,
    sets INT UNSIGNED NULL DEFAULT NULL,
    repetitions_text VARCHAR(255) NULL DEFAULT NULL,
    rest_seconds INT UNSIGNED NULL DEFAULT NULL,
    load_guidance VARCHAR(255) NULL DEFAULT NULL,
    technique VARCHAR(255) NULL DEFAULT NULL,
    notes TEXT NULL DEFAULT NULL,
    video_url VARCHAR(1000) NULL DEFAULT NULL,
    video_provider VARCHAR(50) NULL DEFAULT NULL,
    video_external_id VARCHAR(255) NULL DEFAULT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL DEFAULT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_twbe_public_id
        UNIQUE (public_id),

    INDEX idx_twbe_block_sort (
        block_id,
        deleted_at,
        sort_order
    ),

    INDEX idx_twbe_exercise (
        exercise_id
    ),

    CONSTRAINT fk_twbe_block
        FOREIGN KEY (block_id)
        REFERENCES training_workout_blocks(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_twbe_exercise
        FOREIGN KEY (exercise_id)
        REFERENCES training_exercises(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
