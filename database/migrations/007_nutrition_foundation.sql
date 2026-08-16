CREATE TABLE nutrition_foods (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    consultancy_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(255) NOT NULL,
    normalized_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NULL DEFAULT NULL,
    reference_amount DECIMAL(10,2) NOT NULL DEFAULT 100.00,
    reference_unit VARCHAR(20) NOT NULL DEFAULT 'G',
    calories_kcal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    protein_g DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    carbohydrate_g DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    fat_g DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    source_label VARCHAR(100) NULL DEFAULT NULL,
    source_external_code VARCHAR(100) NULL DEFAULT NULL,
    created_by_user_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL DEFAULT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_nutrition_foods_public_id
        UNIQUE (public_id),

    INDEX idx_nf_consultancy_status_name (
        consultancy_id,
        status,
        normalized_name,
        deleted_at
    ),

    INDEX idx_nf_created_by (
        created_by_user_id
    ),

    CONSTRAINT fk_nf_consultancy
        FOREIGN KEY (consultancy_id)
        REFERENCES consultancies(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_nf_created_by
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nutrition_food_aliases (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    food_id BIGINT UNSIGNED NOT NULL,
    alias VARCHAR(255) NOT NULL,
    normalized_alias VARCHAR(255) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    INDEX idx_nfa_food (
        food_id
    ),

    INDEX idx_nfa_normalized_alias (
        normalized_alias
    ),

    CONSTRAINT fk_nfa_food
        FOREIGN KEY (food_id)
        REFERENCES nutrition_foods(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nutrition_food_portions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    food_id BIGINT UNSIGNED NOT NULL,
    label VARCHAR(100) NOT NULL,
    equivalent_reference_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL DEFAULT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_nutrition_food_portions_public_id
        UNIQUE (public_id),

    INDEX idx_nfp_food_sort (
        food_id,
        status,
        deleted_at,
        sort_order
    ),

    CONSTRAINT fk_nfp_food
        FOREIGN KEY (food_id)
        REFERENCES nutrition_foods(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nutrition_plans (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    consultancy_id BIGINT UNSIGNED NOT NULL,
    student_membership_id BIGINT UNSIGNED NOT NULL,
    nutritionist_membership_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255) NULL DEFAULT NULL,
    general_guidance TEXT NULL DEFAULT NULL,
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

    CONSTRAINT uq_nutrition_plans_public_id
        UNIQUE (public_id),

    INDEX idx_np_consultancy_student_status (
        consultancy_id,
        student_membership_id,
        status,
        deleted_at
    ),

    INDEX idx_np_nutritionist (
        nutritionist_membership_id
    ),

    CONSTRAINT fk_np_consultancy
        FOREIGN KEY (consultancy_id)
        REFERENCES consultancies(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_np_student_membership
        FOREIGN KEY (student_membership_id)
        REFERENCES consultancy_members(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_np_nutritionist_membership
        FOREIGN KEY (nutritionist_membership_id)
        REFERENCES consultancy_members(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nutrition_meals (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    nutrition_plan_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    scheduled_time TIME NULL DEFAULT NULL,
    notes TEXT NULL DEFAULT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL DEFAULT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_nutrition_meals_public_id
        UNIQUE (public_id),

    INDEX idx_nm_plan_sort (
        nutrition_plan_id,
        deleted_at,
        sort_order
    ),

    CONSTRAINT fk_nm_nutrition_plan
        FOREIGN KEY (nutrition_plan_id)
        REFERENCES nutrition_plans(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nutrition_meal_options (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    meal_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NULL DEFAULT NULL,
    description TEXT NULL DEFAULT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL DEFAULT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_nutrition_meal_options_public_id
        UNIQUE (public_id),

    INDEX idx_nmo_meal_sort (
        meal_id,
        deleted_at,
        sort_order
    ),

    CONSTRAINT fk_nmo_meal
        FOREIGN KEY (meal_id)
        REFERENCES nutrition_meals(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nutrition_meal_sections (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    option_id BIGINT UNSIGNED NOT NULL,
    category_key VARCHAR(100) NULL DEFAULT NULL,
    title VARCHAR(255) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL DEFAULT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_nutrition_meal_sections_public_id
        UNIQUE (public_id),

    INDEX idx_nms_option_sort (
        option_id,
        deleted_at,
        sort_order
    ),

    CONSTRAINT fk_nms_option
        FOREIGN KEY (option_id)
        REFERENCES nutrition_meal_options(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nutrition_meal_choice_groups (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    section_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NULL DEFAULT NULL,
    selection_min INT UNSIGNED NOT NULL DEFAULT 1,
    selection_max INT UNSIGNED NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL DEFAULT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_nutrition_meal_choice_groups_public_id
        UNIQUE (public_id),

    INDEX idx_nmcg_section_sort (
        section_id,
        deleted_at,
        sort_order
    ),

    CONSTRAINT fk_nmcg_section
        FOREIGN KEY (section_id)
        REFERENCES nutrition_meal_sections(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

CREATE TABLE nutrition_meal_items (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    choice_group_id BIGINT UNSIGNED NOT NULL,
    food_id BIGINT UNSIGNED NULL DEFAULT NULL,
    food_portion_id BIGINT UNSIGNED NULL DEFAULT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    food_name_snapshot VARCHAR(255) NOT NULL,
    category_snapshot VARCHAR(100) NULL DEFAULT NULL,
    reference_amount_snapshot DECIMAL(10,2) NULL DEFAULT NULL,
    reference_unit_snapshot VARCHAR(20) NULL DEFAULT NULL,
    calories_reference_snapshot DECIMAL(10,2) NULL DEFAULT NULL,
    protein_reference_snapshot DECIMAL(10,2) NULL DEFAULT NULL,
    carbohydrate_reference_snapshot DECIMAL(10,2) NULL DEFAULT NULL,
    fat_reference_snapshot DECIMAL(10,2) NULL DEFAULT NULL,
    portion_label_snapshot VARCHAR(100) NULL DEFAULT NULL,
    equivalent_reference_amount_snapshot DECIMAL(10,2) NULL DEFAULT NULL,
    prescribed_quantity DECIMAL(10,2) NOT NULL,
    prescribed_unit_label VARCHAR(50) NOT NULL,
    calculated_calories DECIMAL(10,2) NULL DEFAULT NULL,
    calculated_protein DECIMAL(10,2) NULL DEFAULT NULL,
    calculated_carbohydrate DECIMAL(10,2) NULL DEFAULT NULL,
    calculated_fat DECIMAL(10,2) NULL DEFAULT NULL,
    notes TEXT NULL DEFAULT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at DATETIME(3) NULL DEFAULT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_nutrition_meal_items_public_id
        UNIQUE (public_id),

    INDEX idx_nmi_choice_group_sort (
        choice_group_id,
        deleted_at,
        sort_order
    ),

    INDEX idx_nmi_food (
        food_id
    ),

    INDEX idx_nmi_portion (
        food_portion_id
    ),

    CONSTRAINT fk_nmi_choice_group
        FOREIGN KEY (choice_group_id)
        REFERENCES nutrition_meal_choice_groups(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_nmi_food
        FOREIGN KEY (food_id)
        REFERENCES nutrition_foods(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_nmi_portion
        FOREIGN KEY (food_portion_id)
        REFERENCES nutrition_food_portions(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
