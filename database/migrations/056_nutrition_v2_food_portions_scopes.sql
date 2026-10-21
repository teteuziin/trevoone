-- Migration: 056_nutrition_v2_food_portions_scopes.sql
-- Description: Food measures scoping (Personal, Consultancy, Global) and snapshot preservation in meal items
-- Rules: Non-breaking, strictly additive, non-destructive defaults

-- 1. Additive scoping and metadata columns in nutrition_v2_food_portions
ALTER TABLE nutrition_v2_food_portions
    ADD COLUMN scope VARCHAR(20) NOT NULL DEFAULT 'GLOBAL' AFTER status,
    ADD COLUMN consultancy_id BIGINT UNSIGNED NULL DEFAULT NULL AFTER scope,
    ADD COLUMN created_by_user_id BIGINT UNSIGNED NULL DEFAULT NULL AFTER consultancy_id,
    ADD COLUMN notes VARCHAR(255) NULL DEFAULT NULL AFTER created_by_user_id,
    ADD INDEX idx_n2fp_scope_consultancy (scope, consultancy_id),
    ADD INDEX idx_n2fp_user (created_by_user_id),
    ADD CONSTRAINT fk_n2fp_consultancy
        FOREIGN KEY (consultancy_id)
        REFERENCES consultancies(id)
        ON DELETE CASCADE
        ON UPDATE RESTRICT,
    ADD CONSTRAINT fk_n2fp_user
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT;

-- 2. Additive snapshot columns in nutrition_v2_meal_items
ALTER TABLE nutrition_v2_meal_items
    ADD COLUMN portion_id BIGINT UNSIGNED NULL DEFAULT NULL AFTER food_id,
    ADD COLUMN portion_equivalent_amount DECIMAL(10,2) NULL DEFAULT NULL AFTER prescribed_unit_label,
    ADD INDEX idx_n2mi_portion (portion_id),
    ADD CONSTRAINT fk_n2mi_portion
        FOREIGN KEY (portion_id)
        REFERENCES nutrition_v2_food_portions(id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT;

-- 3. Additive snapshot columns in nutrition_v2_item_substitutions
ALTER TABLE nutrition_v2_item_substitutions
    ADD COLUMN portion_id BIGINT UNSIGNED NULL DEFAULT NULL AFTER food_id,
    ADD COLUMN portion_equivalent_amount DECIMAL(10,2) NULL DEFAULT NULL AFTER prescribed_unit_label,
    ADD INDEX idx_n2is_portion (portion_id),
    ADD CONSTRAINT fk_n2is_portion
        FOREIGN KEY (portion_id)
        REFERENCES nutrition_v2_food_portions(id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT;

-- 4. Additive snapshot columns in nutrition_v2_template_items
ALTER TABLE nutrition_v2_template_items
    ADD COLUMN portion_id BIGINT UNSIGNED NULL DEFAULT NULL AFTER food_id,
    ADD COLUMN portion_equivalent_amount DECIMAL(10,2) NULL DEFAULT NULL AFTER prescribed_unit_label,
    ADD INDEX idx_n2ti_portion (portion_id),
    ADD CONSTRAINT fk_n2ti_portion
        FOREIGN KEY (portion_id)
        REFERENCES nutrition_v2_food_portions(id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT;

-- 5. Additive snapshot columns in nutrition_v2_template_item_substitutions
ALTER TABLE nutrition_v2_template_item_substitutions
    ADD COLUMN portion_id BIGINT UNSIGNED NULL DEFAULT NULL AFTER food_id,
    ADD COLUMN portion_equivalent_amount DECIMAL(10,2) NULL DEFAULT NULL AFTER prescribed_unit_label,
    ADD INDEX idx_n2tis_portion (portion_id),
    ADD CONSTRAINT fk_n2tis_portion
        FOREIGN KEY (portion_id)
        REFERENCES nutrition_v2_food_portions(id)
        ON DELETE SET NULL
        ON UPDATE RESTRICT;
