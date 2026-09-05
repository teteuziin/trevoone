-- Migration: 024_nutrition_v2_core.sql
-- Description: Core schema foundation for Nutrition V2 (Unified food library, portions, plans, immutable versions, meals, meal items, substitutions, student assignments)
-- Additive only: preserves Nutrition V1 tables and existing data untouched.

-- 1. nutrition_v2_foods: unified food library (GLOBAL Trevo One foods and CONSULTANCY custom foods)
CREATE TABLE nutrition_v2_foods (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    scope VARCHAR(20) NOT NULL,
    consultancy_id BIGINT UNSIGNED NULL DEFAULT NULL,
    name VARCHAR(255) NOT NULL,
    normalized_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NULL DEFAULT NULL,
    reference_amount DECIMAL(10,2) NOT NULL DEFAULT 100.00,
    reference_unit_code VARCHAR(20) NOT NULL DEFAULT 'G',
    calories_kcal DECIMAL(8,2) NULL DEFAULT NULL,
    protein_g DECIMAL(8,2) NULL DEFAULT NULL,
    carbohydrate_g DECIMAL(8,2) NULL DEFAULT NULL,
    fat_g DECIMAL(8,2) NULL DEFAULT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    source_type VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
    source_key VARCHAR(100) NULL DEFAULT NULL,
    source_external_code VARCHAR(100) NULL DEFAULT NULL,
    source_version VARCHAR(50) NULL DEFAULT NULL,
    source_reference VARCHAR(255) NULL DEFAULT NULL,
    source_imported_at DATETIME(3) NULL DEFAULT NULL,
    source_uid VARCHAR(255) NULL DEFAULT NULL,
    created_by_user_id BIGINT UNSIGNED NULL DEFAULT NULL,
    created_by_membership_id BIGINT UNSIGNED NULL DEFAULT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL DEFAULT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_nutrition_v2_foods_public_id
        UNIQUE (public_id),

    CONSTRAINT uq_nutrition_v2_foods_source_uid
        UNIQUE (source_uid),

    INDEX idx_n2f_scope_consultancy_status_del (
        scope,
        consultancy_id,
        status,
        deleted_at
    ),

    INDEX idx_n2f_normalized_name (
        normalized_name
    ),

    INDEX idx_n2f_category (
        category
    ),

    INDEX idx_n2f_created_by_user (
        created_by_user_id
    ),

    INDEX idx_n2f_created_by_membership (
        created_by_membership_id
    ),

    CONSTRAINT fk_n2f_consultancy
        FOREIGN KEY (consultancy_id)
        REFERENCES consultancies(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_n2f_user
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_n2f_membership
        FOREIGN KEY (created_by_membership_id)
        REFERENCES consultancy_members(id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- 2. nutrition_v2_food_portions: household/serving measurements attached to a library food
CREATE TABLE nutrition_v2_food_portions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    food_id BIGINT UNSIGNED NOT NULL,
    label VARCHAR(100) NOT NULL,
    equivalent_reference_amount DECIMAL(10,2) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL DEFAULT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_nutrition_v2_food_portions_public_id
        UNIQUE (public_id),

    INDEX idx_n2fp_food_sort (
        food_id,
        sort_order
    ),

    CONSTRAINT fk_n2fp_food
        FOREIGN KEY (food_id)
        REFERENCES nutrition_v2_foods(id)
        ON DELETE CASCADE
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- 3. nutrition_v2_plans: stable nutrition plan root identity
CREATE TABLE nutrition_v2_plans (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    consultancy_id BIGINT UNSIGNED NOT NULL,
    created_by_membership_id BIGINT UNSIGNED NOT NULL,
    is_template BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL DEFAULT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_nutrition_v2_plans_public_id
        UNIQUE (public_id),

    INDEX idx_n2p_consultancy_template_status_del (
        consultancy_id,
        is_template,
        status,
        deleted_at
    ),

    INDEX idx_n2p_created_by (
        created_by_membership_id
    ),

    CONSTRAINT fk_n2p_consultancy
        FOREIGN KEY (consultancy_id)
        REFERENCES consultancies(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_n2p_created_by
        FOREIGN KEY (created_by_membership_id)
        REFERENCES consultancy_members(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- 4. nutrition_v2_plan_versions: historical immutable prescription snapshots
CREATE TABLE nutrition_v2_plan_versions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    nutrition_plan_id BIGINT UNSIGNED NOT NULL,
    version_number INT UNSIGNED NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255) NULL DEFAULT NULL,
    objective VARCHAR(100) NULL DEFAULT NULL,
    general_guidance TEXT NULL DEFAULT NULL,
    notes TEXT NULL DEFAULT NULL,
    published_at DATETIME(3) NULL DEFAULT NULL,
    created_by_membership_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL DEFAULT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_nutrition_v2_plan_versions_public_id
        UNIQUE (public_id),

    CONSTRAINT uq_n2pv_plan_version
        UNIQUE (nutrition_plan_id, version_number),

    INDEX idx_n2pv_plan_status (
        nutrition_plan_id,
        status
    ),

    INDEX idx_n2pv_created_by (
        created_by_membership_id
    ),

    CONSTRAINT fk_n2pv_plan
        FOREIGN KEY (nutrition_plan_id)
        REFERENCES nutrition_v2_plans(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_n2pv_created_by
        FOREIGN KEY (created_by_membership_id)
        REFERENCES consultancy_members(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- 5. nutrition_v2_meals: ordered meals directly under a plan version
CREATE TABLE nutrition_v2_meals (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    nutrition_plan_version_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    scheduled_time TIME NULL DEFAULT NULL,
    notes TEXT NULL DEFAULT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL DEFAULT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_nutrition_v2_meals_public_id
        UNIQUE (public_id),

    INDEX idx_n2m_version_sort (
        nutrition_plan_version_id,
        sort_order
    ),

    CONSTRAINT fk_n2m_version
        FOREIGN KEY (nutrition_plan_version_id)
        REFERENCES nutrition_v2_plan_versions(id)
        ON DELETE CASCADE
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- 6. nutrition_v2_meal_items: direct ordered prescribed items in a meal
CREATE TABLE nutrition_v2_meal_items (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    meal_id BIGINT UNSIGNED NOT NULL,
    food_id BIGINT UNSIGNED NULL DEFAULT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    food_name_snapshot VARCHAR(255) NOT NULL,
    category_snapshot VARCHAR(100) NULL DEFAULT NULL,
    prescribed_quantity DECIMAL(10,2) NULL DEFAULT NULL,
    prescribed_unit_code VARCHAR(50) NULL DEFAULT NULL,
    prescribed_unit_label VARCHAR(100) NULL DEFAULT NULL,
    calories_kcal_snapshot DECIMAL(8,2) NULL DEFAULT NULL,
    protein_g_snapshot DECIMAL(8,2) NULL DEFAULT NULL,
    carbohydrate_g_snapshot DECIMAL(8,2) NULL DEFAULT NULL,
    fat_g_snapshot DECIMAL(8,2) NULL DEFAULT NULL,
    notes TEXT NULL DEFAULT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL DEFAULT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_nutrition_v2_meal_items_public_id
        UNIQUE (public_id),

    INDEX idx_n2mi_meal_sort (
        meal_id,
        sort_order
    ),

    INDEX idx_n2mi_food (
        food_id
    ),

    CONSTRAINT fk_n2mi_meal
        FOREIGN KEY (meal_id)
        REFERENCES nutrition_v2_meals(id)
        ON DELETE CASCADE
        ON UPDATE RESTRICT,

    CONSTRAINT fk_n2mi_food
        FOREIGN KEY (food_id)
        REFERENCES nutrition_v2_foods(id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- 7. nutrition_v2_item_substitutions: normalized direct 1:N alternatives for a meal item
CREATE TABLE nutrition_v2_item_substitutions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    meal_item_id BIGINT UNSIGNED NOT NULL,
    food_id BIGINT UNSIGNED NULL DEFAULT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    food_name_snapshot VARCHAR(255) NOT NULL,
    prescribed_quantity DECIMAL(10,2) NULL DEFAULT NULL,
    prescribed_unit_code VARCHAR(50) NULL DEFAULT NULL,
    prescribed_unit_label VARCHAR(100) NULL DEFAULT NULL,
    calories_kcal_snapshot DECIMAL(8,2) NULL DEFAULT NULL,
    protein_g_snapshot DECIMAL(8,2) NULL DEFAULT NULL,
    carbohydrate_g_snapshot DECIMAL(8,2) NULL DEFAULT NULL,
    fat_g_snapshot DECIMAL(8,2) NULL DEFAULT NULL,
    notes TEXT NULL DEFAULT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL DEFAULT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_nutrition_v2_item_substitutions_public_id
        UNIQUE (public_id),

    INDEX idx_n2is_item_sort (
        meal_item_id,
        sort_order
    ),

    INDEX idx_n2is_food (
        food_id
    ),

    CONSTRAINT fk_n2is_item
        FOREIGN KEY (meal_item_id)
        REFERENCES nutrition_v2_meal_items(id)
        ON DELETE CASCADE
        ON UPDATE RESTRICT,

    CONSTRAINT fk_n2is_food
        FOREIGN KEY (food_id)
        REFERENCES nutrition_v2_foods(id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- 8. nutrition_v2_assignments: binds an immutable version to a student
CREATE TABLE nutrition_v2_assignments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    consultancy_id BIGINT UNSIGNED NOT NULL,
    student_membership_id BIGINT UNSIGNED NOT NULL,
    nutrition_plan_version_id BIGINT UNSIGNED NOT NULL,
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

    CONSTRAINT uq_nutrition_v2_assignments_public_id
        UNIQUE (public_id),

    INDEX idx_n2a_consultancy_student_status_del (
        consultancy_id,
        student_membership_id,
        status,
        deleted_at
    ),

    INDEX idx_n2a_version (
        nutrition_plan_version_id
    ),

    INDEX idx_n2a_assigned_by (
        assigned_by_membership_id
    ),

    CONSTRAINT fk_n2a_consultancy
        FOREIGN KEY (consultancy_id)
        REFERENCES consultancies(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_n2a_student_membership
        FOREIGN KEY (student_membership_id)
        REFERENCES consultancy_members(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_n2a_version
        FOREIGN KEY (nutrition_plan_version_id)
        REFERENCES nutrition_v2_plan_versions(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_n2a_assigned_by
        FOREIGN KEY (assigned_by_membership_id)
        REFERENCES consultancy_members(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
