-- Migration: 031_nutrition_v2_plan_templates.sql
-- Description: Reusable nutrition plan templates (Release G)
-- Blueprint-only structure for meals, meal items, and substitutions with strict patient-neutrality and zero live-links.

-- 1. nutrition_v2_plan_templates: reusable template root
CREATE TABLE IF NOT EXISTS nutrition_v2_plan_templates (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    consultancy_id BIGINT UNSIGNED NOT NULL,
    created_by_membership_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL DEFAULT NULL,
    archived_at DATETIME(3) NULL DEFAULT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL DEFAULT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_nutrition_v2_plan_templates_public_id
        UNIQUE (public_id),

    INDEX idx_n2pt_consultancy_archived_del (
        consultancy_id,
        archived_at,
        deleted_at
    ),

    INDEX idx_n2pt_created_by (
        created_by_membership_id
    ),

    CONSTRAINT fk_n2pt_consultancy
        FOREIGN KEY (consultancy_id)
        REFERENCES consultancies (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_n2pt_created_by
        FOREIGN KEY (created_by_membership_id)
        REFERENCES consultancy_members (id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- 2. nutrition_v2_template_meals: ordered meals in a template blueprint
CREATE TABLE IF NOT EXISTS nutrition_v2_template_meals (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    template_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    scheduled_time TIME NULL DEFAULT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    notes TEXT NULL DEFAULT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    CONSTRAINT uq_nutrition_v2_template_meals_public_id
        UNIQUE (public_id),

    INDEX idx_n2tm_template_sort (
        template_id,
        sort_order
    ),

    CONSTRAINT fk_n2tm_template
        FOREIGN KEY (template_id)
        REFERENCES nutrition_v2_plan_templates (id)
        ON DELETE CASCADE
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- 3. nutrition_v2_template_items: structural food prescription in a template meal
CREATE TABLE IF NOT EXISTS nutrition_v2_template_items (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    template_meal_id BIGINT UNSIGNED NOT NULL,
    food_id BIGINT UNSIGNED NULL DEFAULT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    food_name_snapshot VARCHAR(255) NOT NULL,
    category_snapshot VARCHAR(100) NULL DEFAULT NULL,
    prescribed_quantity DECIMAL(10,2) NULL DEFAULT NULL,
    prescribed_unit_code VARCHAR(50) NULL DEFAULT NULL,
    prescribed_unit_label VARCHAR(100) NULL DEFAULT NULL,
    notes TEXT NULL DEFAULT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    CONSTRAINT uq_nutrition_v2_template_items_public_id
        UNIQUE (public_id),

    INDEX idx_n2ti_meal_sort (
        template_meal_id,
        sort_order
    ),

    INDEX idx_n2ti_food (
        food_id
    ),

    CONSTRAINT fk_n2ti_meal
        FOREIGN KEY (template_meal_id)
        REFERENCES nutrition_v2_template_meals (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_n2ti_food
        FOREIGN KEY (food_id)
        REFERENCES nutrition_v2_foods (id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- 4. nutrition_v2_template_item_substitutions: structural substitutions in a template item
CREATE TABLE IF NOT EXISTS nutrition_v2_template_item_substitutions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    template_meal_item_id BIGINT UNSIGNED NOT NULL,
    food_id BIGINT UNSIGNED NULL DEFAULT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    food_name_snapshot VARCHAR(255) NOT NULL,
    prescribed_quantity DECIMAL(10,2) NULL DEFAULT NULL,
    prescribed_unit_code VARCHAR(50) NULL DEFAULT NULL,
    prescribed_unit_label VARCHAR(100) NULL DEFAULT NULL,
    notes TEXT NULL DEFAULT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    CONSTRAINT uq_nutrition_v2_template_item_substitutions_public_id
        UNIQUE (public_id),

    INDEX idx_n2tis_item_sort (
        template_meal_item_id,
        sort_order
    ),

    INDEX idx_n2tis_food (
        food_id
    ),

    CONSTRAINT fk_n2tis_item
        FOREIGN KEY (template_meal_item_id)
        REFERENCES nutrition_v2_template_items (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_n2tis_food
        FOREIGN KEY (food_id)
        REFERENCES nutrition_v2_foods (id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
