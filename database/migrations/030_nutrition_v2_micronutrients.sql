-- Migration: 030_nutrition_v2_micronutrients.sql
-- Description: Canonical nutrient catalog, food nutrients composition table, and immutable micronutrient snapshot columns
-- Additive only: preserves all existing foods, tenants, plans and historical snapshots untouched.

-- 1. nutrition_nutrients_catalog: canonical definition of nutrients, units and categories
CREATE TABLE IF NOT EXISTS nutrition_nutrients_catalog (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code VARCHAR(50) NOT NULL,
    display_name_pt_br VARCHAR(100) NOT NULL,
    canonical_unit_code VARCHAR(20) NOT NULL,
    category VARCHAR(30) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    CONSTRAINT uq_nnc_code UNIQUE (code),
    CONSTRAINT uq_nnc_code_unit UNIQUE (code, canonical_unit_code),
    INDEX idx_nnc_category_sort (category, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Deterministic seed for canonical 23 nutrients
INSERT INTO nutrition_nutrients_catalog (code, display_name_pt_br, canonical_unit_code, category, sort_order, is_active)
VALUES
    ('FIBER', 'Fibra Alimentar', 'g', 'MACRO_SUB', 10, TRUE),
    ('CA', 'Cálcio', 'mg', 'MINERAL', 20, TRUE),
    ('FE', 'Ferro', 'mg', 'MINERAL', 30, TRUE),
    ('MG', 'Magnésio', 'mg', 'MINERAL', 40, TRUE),
    ('P', 'Fósforo', 'mg', 'MINERAL', 50, TRUE),
    ('K', 'Potássio', 'mg', 'MINERAL', 60, TRUE),
    ('NA', 'Sódio', 'mg', 'MINERAL', 70, TRUE),
    ('ZN', 'Zinco', 'mg', 'MINERAL', 80, TRUE),
    ('CU', 'Cobre', 'mg', 'MINERAL', 90, TRUE),
    ('MN', 'Manganês', 'mg', 'MINERAL', 100, TRUE),
    ('SE', 'Selênio', 'mcg', 'MINERAL', 110, TRUE),
    ('VIT_A', 'Vitamina A (RAE)', 'mcg', 'VITAMIN', 120, TRUE),
    ('VIT_C', 'Vitamina C', 'mg', 'VITAMIN', 130, TRUE),
    ('VIT_D', 'Vitamina D', 'mcg', 'VITAMIN', 140, TRUE),
    ('VIT_E', 'Vitamina E', 'mg', 'VITAMIN', 150, TRUE),
    ('VIT_K', 'Vitamina K', 'mcg', 'VITAMIN', 160, TRUE),
    ('VIT_B1', 'Vitamina B1 (Tiamina)', 'mg', 'VITAMIN', 170, TRUE),
    ('VIT_B2', 'Vitamina B2 (Riboflavina)', 'mg', 'VITAMIN', 180, TRUE),
    ('VIT_B3', 'Vitamina B3 (Niacina)', 'mg', 'VITAMIN', 190, TRUE),
    ('VIT_B5', 'Vitamina B5 (Ácido Pantotênico)', 'mg', 'VITAMIN', 200, TRUE),
    ('VIT_B6', 'Vitamina B6', 'mg', 'VITAMIN', 210, TRUE),
    ('FOLATE', 'Folato Total', 'mcg', 'VITAMIN', 220, TRUE),
    ('VIT_B12', 'Vitamina B12', 'mcg', 'VITAMIN', 230, TRUE)
ON DUPLICATE KEY UPDATE
    display_name_pt_br = VALUES(display_name_pt_br),
    canonical_unit_code = VALUES(canonical_unit_code),
    category = VALUES(category),
    sort_order = VALUES(sort_order),
    is_active = VALUES(is_active);

-- 3. nutrition_v2_food_nutrients: normalized density of nutrients per reference amount
CREATE TABLE IF NOT EXISTS nutrition_v2_food_nutrients (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    food_id BIGINT UNSIGNED NOT NULL,
    nutrient_code VARCHAR(50) NOT NULL,
    amount_per_reference DECIMAL(12,4) NULL DEFAULT NULL,
    unit_code VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'KNOWN', -- 'KNOWN', 'KNOWN_ZERO', 'TRACE'
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    CONSTRAINT uq_n2fn_food_nutrient UNIQUE (food_id, nutrient_code),
    INDEX idx_n2fn_nutrient_code (nutrient_code),

    CONSTRAINT chk_n2fn_status_value CHECK (
        (status = 'KNOWN' AND amount_per_reference IS NOT NULL AND amount_per_reference > 0) OR
        (status = 'KNOWN_ZERO' AND amount_per_reference = 0) OR
        (status = 'TRACE' AND amount_per_reference IS NULL)
    ),

    CONSTRAINT fk_n2fn_food
        FOREIGN KEY (food_id)
        REFERENCES nutrition_v2_foods(id)
        ON DELETE CASCADE
        ON UPDATE RESTRICT,

    CONSTRAINT fk_n2fn_nutrient_catalog
        FOREIGN KEY (nutrient_code, unit_code)
        REFERENCES nutrition_nutrients_catalog(code, canonical_unit_code)
        ON UPDATE RESTRICT
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Additive snapshot column for meal items
ALTER TABLE nutrition_v2_meal_items
    ADD COLUMN micronutrients_snapshot_json JSON NULL DEFAULT NULL AFTER fat_g_snapshot;

-- 5. Additive snapshot column for item substitutions
ALTER TABLE nutrition_v2_item_substitutions
    ADD COLUMN micronutrients_snapshot_json JSON NULL DEFAULT NULL AFTER fat_g_snapshot;
