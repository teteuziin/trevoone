-- Migration: 026_nutrition_v2_food_ptbr_display_name.sql
-- Description: Add localized PT-BR display name and normalized search field to nutrition_v2_foods.
-- Additive only: preserves name, macros, source_uid, FDC ID, reference amount, status and tenant data untouched.

ALTER TABLE nutrition_v2_foods
    ADD COLUMN display_name_pt_br VARCHAR(255) NULL DEFAULT NULL AFTER name,
    ADD COLUMN normalized_display_name_pt_br VARCHAR(255) NULL DEFAULT NULL AFTER display_name_pt_br,
    ADD INDEX idx_n2f_normalized_display_name_pt_br (normalized_display_name_pt_br);
