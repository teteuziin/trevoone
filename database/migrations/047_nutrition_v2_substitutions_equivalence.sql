-- Migration: 047_nutrition_v2_substitutions_equivalence.sql
-- Description: Substitutions & Nutritional Equivalence (Phase 5)
-- Rules: Non-breaking, strictly additive, UNKNOWN != MANUAL, UNKNOWN != FALSE, safe NULL defaults for legacy records

-- 1. Campos aditivos em nutrition_v2_item_substitutions
ALTER TABLE nutrition_v2_item_substitutions
    ADD COLUMN equivalence_criterion VARCHAR(20) NULL DEFAULT NULL AFTER notes,
    ADD COLUMN is_stale BOOLEAN NULL DEFAULT NULL AFTER equivalence_criterion,
    ADD COLUMN stale_reason VARCHAR(100) NULL DEFAULT NULL AFTER is_stale,
    ADD COLUMN base_food_id_snapshot BIGINT UNSIGNED NULL DEFAULT NULL AFTER stale_reason,
    ADD COLUMN base_quantity_snapshot DECIMAL(10,2) NULL DEFAULT NULL AFTER base_food_id_snapshot,
    ADD COLUMN base_unit_code_snapshot VARCHAR(50) NULL DEFAULT NULL AFTER base_quantity_snapshot,
    ADD COLUMN equivalence_target_value_snapshot DECIMAL(8,2) NULL DEFAULT NULL AFTER base_unit_code_snapshot,
    ADD INDEX idx_n2is_base_food_snapshot (base_food_id_snapshot);

-- 2. Campos aditivos em nutrition_v2_template_item_substitutions (Paridade total com ciclo de templates)
ALTER TABLE nutrition_v2_template_item_substitutions
    ADD COLUMN equivalence_criterion VARCHAR(20) NULL DEFAULT NULL AFTER notes,
    ADD COLUMN is_stale BOOLEAN NULL DEFAULT NULL AFTER equivalence_criterion,
    ADD COLUMN stale_reason VARCHAR(100) NULL DEFAULT NULL AFTER is_stale,
    ADD COLUMN base_food_id_snapshot BIGINT UNSIGNED NULL DEFAULT NULL AFTER stale_reason,
    ADD COLUMN base_quantity_snapshot DECIMAL(10,2) NULL DEFAULT NULL AFTER base_food_id_snapshot,
    ADD COLUMN base_unit_code_snapshot VARCHAR(50) NULL DEFAULT NULL AFTER base_quantity_snapshot,
    ADD COLUMN equivalence_target_value_snapshot DECIMAL(8,2) NULL DEFAULT NULL AFTER base_unit_code_snapshot,
    ADD INDEX idx_n2tis_base_food_snapshot (base_food_id_snapshot);
