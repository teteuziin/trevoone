-- Migration: 023_training_v2_core.sql
-- Description: Core schema foundation for Training V2 (Media assets, unified exercises, workouts, immutable versions, blocks, items, item media snapshots, normalized sets, assignments)
-- Additive only: preserves Training V1 tables and existing data untouched.

-- 1. media_assets: binary media asset registry
CREATE TABLE media_assets (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    scope VARCHAR(20) NOT NULL,
    visibility VARCHAR(20) NOT NULL,
    consultancy_id BIGINT UNSIGNED NULL DEFAULT NULL,
    media_type VARCHAR(20) NOT NULL,
    storage_provider VARCHAR(50) NOT NULL DEFAULT 'HOSTINGER_LOCAL',
    storage_key VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT UNSIGNED NOT NULL,
    duration_seconds SMALLINT UNSIGNED NULL DEFAULT NULL,
    width SMALLINT UNSIGNED NULL DEFAULT NULL,
    height SMALLINT UNSIGNED NULL DEFAULT NULL,
    created_by_user_id BIGINT UNSIGNED NOT NULL,
    created_by_membership_id BIGINT UNSIGNED NULL DEFAULT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL DEFAULT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_media_assets_public_id
        UNIQUE (public_id),

    INDEX idx_ma_scope_consultancy_vis_del (
        scope,
        consultancy_id,
        visibility,
        deleted_at
    ),

    INDEX idx_ma_user (
        created_by_user_id
    ),

    INDEX idx_ma_membership (
        created_by_membership_id
    ),

    CONSTRAINT fk_ma_consultancy
        FOREIGN KEY (consultancy_id)
        REFERENCES consultancies(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_ma_user
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_ma_membership
        FOREIGN KEY (created_by_membership_id)
        REFERENCES consultancy_members(id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- 2. exercises: unified official and consultancy exercise catalog
CREATE TABLE exercises (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    scope VARCHAR(20) NOT NULL,
    consultancy_id BIGINT UNSIGNED NULL DEFAULT NULL,
    visibility VARCHAR(20) NOT NULL DEFAULT 'CREATOR_ONLY',
    created_by_user_id BIGINT UNSIGNED NOT NULL,
    created_by_membership_id BIGINT UNSIGNED NULL DEFAULT NULL,
    name VARCHAR(255) NOT NULL,
    normalized_name VARCHAR(255) NOT NULL,
    description TEXT NULL DEFAULT NULL,
    muscle_group_primary VARCHAR(100) NOT NULL,
    muscle_groups_secondary JSON NULL DEFAULT NULL,
    equipment VARCHAR(100) NOT NULL,
    movement_pattern VARCHAR(50) NULL DEFAULT NULL,
    difficulty_level VARCHAR(20) NOT NULL DEFAULT 'INTERMEDIATE',
    instructions TEXT NULL DEFAULT NULL,
    execution_tips TEXT NULL DEFAULT NULL,
    common_mistakes TEXT NULL DEFAULT NULL,
    progressions TEXT NULL DEFAULT NULL,
    regressions TEXT NULL DEFAULT NULL,
    rights_notes TEXT NULL DEFAULT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL DEFAULT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_exercises_public_id
        UNIQUE (public_id),

    INDEX idx_ex_scope_consultancy_vis_status_del (
        scope,
        consultancy_id,
        visibility,
        status,
        deleted_at
    ),

    INDEX idx_ex_normalized_name (
        normalized_name
    ),

    INDEX idx_ex_muscle_primary (
        muscle_group_primary
    ),

    INDEX idx_ex_created_by_user (
        created_by_user_id
    ),

    INDEX idx_ex_created_by_mem (
        created_by_membership_id
    ),

    CONSTRAINT fk_ex_consultancy
        FOREIGN KEY (consultancy_id)
        REFERENCES consultancies(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_ex_user
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_ex_membership
        FOREIGN KEY (created_by_membership_id)
        REFERENCES consultancy_members(id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- 3. exercise_media: 1:N media association per exercise
CREATE TABLE exercise_media (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    exercise_id BIGINT UNSIGNED NOT NULL,
    media_asset_id BIGINT UNSIGNED NOT NULL,
    role VARCHAR(30) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    CONSTRAINT uq_em_exercise_role_order
        UNIQUE (exercise_id, role, sort_order),

    INDEX idx_em_media_asset (
        media_asset_id
    ),

    CONSTRAINT fk_em_exercise
        FOREIGN KEY (exercise_id)
        REFERENCES exercises(id)
        ON DELETE CASCADE
        ON UPDATE RESTRICT,

    CONSTRAINT fk_em_media_asset
        FOREIGN KEY (media_asset_id)
        REFERENCES media_assets(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- 4. workouts: stable routine identity
CREATE TABLE workouts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    consultancy_id BIGINT UNSIGNED NOT NULL,
    created_by_membership_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255) NULL DEFAULT NULL,
    objective VARCHAR(100) NULL DEFAULT NULL,
    estimated_duration_minutes SMALLINT UNSIGNED NULL DEFAULT NULL,
    difficulty_level VARCHAR(20) NOT NULL DEFAULT 'INTERMEDIATE',
    is_template BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL DEFAULT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_workouts_public_id
        UNIQUE (public_id),

    INDEX idx_w_consultancy_template_status_del (
        consultancy_id,
        is_template,
        status,
        deleted_at
    ),

    INDEX idx_w_created_by (
        created_by_membership_id
    ),

    CONSTRAINT fk_w_consultancy
        FOREIGN KEY (consultancy_id)
        REFERENCES consultancies(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_w_created_by
        FOREIGN KEY (created_by_membership_id)
        REFERENCES consultancy_members(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- 5. workout_versions: immutable prescription snapshots
CREATE TABLE workout_versions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    workout_id BIGINT UNSIGNED NOT NULL,
    version_number INT UNSIGNED NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    published_at DATETIME(3) NULL DEFAULT NULL,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255) NULL DEFAULT NULL,
    objective VARCHAR(100) NULL DEFAULT NULL,
    estimated_duration_minutes SMALLINT UNSIGNED NULL DEFAULT NULL,
    difficulty_level VARCHAR(20) NULL DEFAULT NULL,
    notes TEXT NULL DEFAULT NULL,
    created_by_membership_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    CONSTRAINT uq_workout_versions_public_id
        UNIQUE (public_id),

    CONSTRAINT uq_wv_workout_version
        UNIQUE (workout_id, version_number),

    INDEX idx_wv_workout_status (
        workout_id,
        status
    ),

    INDEX idx_wv_created_by (
        created_by_membership_id
    ),

    CONSTRAINT fk_wv_workout
        FOREIGN KEY (workout_id)
        REFERENCES workouts(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_wv_created_by
        FOREIGN KEY (created_by_membership_id)
        REFERENCES consultancy_members(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- 6. workout_blocks: methodological groupings within a version
CREATE TABLE workout_blocks (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    workout_version_id BIGINT UNSIGNED NOT NULL,
    block_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NULL DEFAULT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    rounds SMALLINT UNSIGNED NULL DEFAULT NULL,
    rest_between_items_seconds SMALLINT UNSIGNED NULL DEFAULT NULL,
    rest_between_rounds_seconds SMALLINT UNSIGNED NULL DEFAULT NULL,
    rest_after_block_seconds SMALLINT UNSIGNED NULL DEFAULT NULL,
    instructions TEXT NULL DEFAULT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    CONSTRAINT uq_workout_blocks_public_id
        UNIQUE (public_id),

    INDEX idx_wb_version_sort (
        workout_version_id,
        sort_order
    ),

    CONSTRAINT fk_wb_version
        FOREIGN KEY (workout_version_id)
        REFERENCES workout_versions(id)
        ON DELETE CASCADE
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- 7. workout_block_items: ordered exercise line items
CREATE TABLE workout_block_items (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    block_id BIGINT UNSIGNED NOT NULL,
    exercise_id BIGINT UNSIGNED NULL DEFAULT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    exercise_name_snapshot VARCHAR(255) NOT NULL,
    muscle_group_snapshot VARCHAR(100) NULL DEFAULT NULL,
    equipment_snapshot VARCHAR(100) NULL DEFAULT NULL,
    instructions_snapshot TEXT NULL DEFAULT NULL,
    prescription_mode VARCHAR(20) NOT NULL DEFAULT 'SETS',
    target_cadence VARCHAR(20) NULL DEFAULT NULL,
    target_rpe DECIMAL(3,1) NULL DEFAULT NULL,
    target_rir TINYINT UNSIGNED NULL DEFAULT NULL,
    method_config_json JSON NULL DEFAULT NULL,
    custom_video_url VARCHAR(1000) NULL DEFAULT NULL,
    notes TEXT NULL DEFAULT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    CONSTRAINT uq_workout_block_items_public_id
        UNIQUE (public_id),

    INDEX idx_wbi_block_sort (
        block_id,
        sort_order
    ),

    INDEX idx_wbi_exercise (
        exercise_id
    ),

    CONSTRAINT fk_wbi_block
        FOREIGN KEY (block_id)
        REFERENCES workout_blocks(id)
        ON DELETE CASCADE
        ON UPDATE RESTRICT,

    CONSTRAINT fk_wbi_exercise
        FOREIGN KEY (exercise_id)
        REFERENCES exercises(id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- 8. workout_block_item_media: pinned media assets for immutable versions
CREATE TABLE workout_block_item_media (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    block_item_id BIGINT UNSIGNED NOT NULL,
    media_asset_id BIGINT UNSIGNED NOT NULL,
    role VARCHAR(30) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    CONSTRAINT uq_wbim_item_role_order
        UNIQUE (block_item_id, role, sort_order),

    INDEX idx_wbim_media_asset (
        media_asset_id
    ),

    CONSTRAINT fk_wbim_item
        FOREIGN KEY (block_item_id)
        REFERENCES workout_block_items(id)
        ON DELETE CASCADE
        ON UPDATE RESTRICT,

    CONSTRAINT fk_wbim_media_asset
        FOREIGN KEY (media_asset_id)
        REFERENCES media_assets(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- 9. workout_item_sets: normalized per-set prescription
CREATE TABLE workout_item_sets (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    block_item_id BIGINT UNSIGNED NOT NULL,
    set_number TINYINT UNSIGNED NOT NULL,
    set_type VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    parent_set_id BIGINT UNSIGNED NULL DEFAULT NULL,
    target_reps SMALLINT UNSIGNED NULL DEFAULT NULL,
    target_reps_max SMALLINT UNSIGNED NULL DEFAULT NULL,
    target_load_kg DECIMAL(6,2) NULL DEFAULT NULL,
    target_duration_seconds SMALLINT UNSIGNED NULL DEFAULT NULL,
    target_distance_meters INT UNSIGNED NULL DEFAULT NULL,
    target_rest_seconds SMALLINT UNSIGNED NULL DEFAULT NULL,
    intensity_indicator VARCHAR(50) NULL DEFAULT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    CONSTRAINT uq_wis_item_set_number
        UNIQUE (block_item_id, set_number),

    INDEX idx_wis_parent (
        parent_set_id
    ),

    CONSTRAINT fk_wis_item
        FOREIGN KEY (block_item_id)
        REFERENCES workout_block_items(id)
        ON DELETE CASCADE
        ON UPDATE RESTRICT,

    CONSTRAINT fk_wis_parent
        FOREIGN KEY (parent_set_id)
        REFERENCES workout_item_sets(id)
        ON DELETE CASCADE
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- 10. workout_assignments: binds an immutable version to a student
CREATE TABLE workout_assignments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    consultancy_id BIGINT UNSIGNED NOT NULL,
    student_membership_id BIGINT UNSIGNED NOT NULL,
    workout_version_id BIGINT UNSIGNED NOT NULL,
    assigned_by_membership_id BIGINT UNSIGNED NOT NULL,
    starts_on DATE NOT NULL,
    ends_on DATE NULL DEFAULT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    notes_for_student TEXT NULL DEFAULT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL DEFAULT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_workout_assignments_public_id
        UNIQUE (public_id),

    INDEX idx_wa_consultancy_student_status_del (
        consultancy_id,
        student_membership_id,
        status,
        deleted_at
    ),

    INDEX idx_wa_version (
        workout_version_id
    ),

    INDEX idx_wa_assigned_by (
        assigned_by_membership_id
    ),

    CONSTRAINT fk_wa_consultancy
        FOREIGN KEY (consultancy_id)
        REFERENCES consultancies(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_wa_student_membership
        FOREIGN KEY (student_membership_id)
        REFERENCES consultancy_members(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_wa_version
        FOREIGN KEY (workout_version_id)
        REFERENCES workout_versions(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_wa_assigned_by
        FOREIGN KEY (assigned_by_membership_id)
        REFERENCES consultancy_members(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
