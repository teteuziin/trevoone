-- Migration: 042_nutrition_v2_auto_enrichment.sql
-- Description: Two-tier Reference Food Catalog Auto-Enrichment and Aliases (Nutrition AI Import V1)
-- Additive only: preserves all existing foods, tenants, plans, portions, and snapshots untouched.

ALTER TABLE nutrition_v2_foods
    ADD COLUMN auto_imported_from_reference TINYINT(1) NOT NULL DEFAULT 0 AFTER deleted_at,
    ADD INDEX idx_n2f_auto_imported_ref (auto_imported_from_reference);

CREATE TABLE IF NOT EXISTS nutrition_v2_food_aliases (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    food_id BIGINT UNSIGNED NOT NULL,
    alias VARCHAR(255) NOT NULL,
    normalized_alias VARCHAR(255) NOT NULL,
    confidence VARCHAR(20) NOT NULL DEFAULT 'HIGH',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    INDEX idx_n2fa_food (food_id),
    INDEX idx_n2fa_normalized_alias (normalized_alias),
    UNIQUE KEY uq_n2fa_food_normalized_alias (food_id, normalized_alias),
    CONSTRAINT fk_n2fa_food
        FOREIGN KEY (food_id)
        REFERENCES nutrition_v2_foods(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
