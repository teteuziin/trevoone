-- Migration: 033_nutrition_v2_branded_foods.sql
-- Description: Minimal additive schema enhancement for Base Brasil V1 Branded Products
-- Additive only: preserves all existing foods, tenants, plans and snapshots untouched.

ALTER TABLE nutrition_v2_foods
    ADD COLUMN brand VARCHAR(100) NULL DEFAULT NULL AFTER category,
    ADD COLUMN product_line VARCHAR(100) NULL DEFAULT NULL AFTER brand,
    ADD COLUMN flavor_or_variant VARCHAR(100) NULL DEFAULT NULL AFTER product_line,
    ADD COLUMN manufacturer VARCHAR(100) NULL DEFAULT NULL AFTER flavor_or_variant;

CREATE INDEX idx_nutrition_v2_foods_brand_product
    ON nutrition_v2_foods (brand, product_line, flavor_or_variant);
