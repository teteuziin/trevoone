-- Migration: 029_nutrition_v2_foods_fiber_and_quality.sql
-- Description: Minimal additive schema enhancement for Nutrition V2 Release A (fiber, data quality classification, verification recency)
-- Additive only: preserves all existing foods, tenants, plans and snapshots untouched.

ALTER TABLE nutrition_v2_foods
    ADD COLUMN fiber_g DECIMAL(8,2) NULL DEFAULT NULL AFTER fat_g,
    ADD COLUMN data_quality VARCHAR(30) NOT NULL DEFAULT 'UNCLASSIFIED' AFTER source_type,
    ADD COLUMN last_verified_at DATETIME(3) NULL DEFAULT NULL AFTER source_imported_at;

-- Deterministic backfill based strictly on EXISTING provenance fields
UPDATE nutrition_v2_foods
SET data_quality = 'ANALYTICAL_GOLD',
    last_verified_at = CURRENT_TIMESTAMP(3)
WHERE source_key = 'USDA_FOUNDATION';

UPDATE nutrition_v2_foods
SET data_quality = 'SURVEY_RECIPE',
    last_verified_at = CURRENT_TIMESTAMP(3)
WHERE source_key = 'USDA_FNDDS';

UPDATE nutrition_v2_foods
SET data_quality = 'LEGACY_REFERENCE',
    last_verified_at = CURRENT_TIMESTAMP(3)
WHERE source_key = 'TACO_UNICAMP' OR source_key = 'TACO';

UPDATE nutrition_v2_foods
SET data_quality = 'CONSULTANCY_CUSTOM',
    last_verified_at = CURRENT_TIMESTAMP(3)
WHERE scope = 'CONSULTANCY' AND source_type = 'MANUAL';
