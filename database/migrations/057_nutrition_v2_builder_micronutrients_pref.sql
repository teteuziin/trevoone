-- Migration: 057_nutrition_v2_builder_micronutrients_pref.sql
-- Description: Add show_meal_micronutrients preference toggle for nutrition builder
-- Rules: Strict multi-tenancy | User-scoped | Non-destructive defaults | No cross-tenant leak

ALTER TABLE `nutrition_v2_builder_preferences`
ADD COLUMN `show_meal_micronutrients` TINYINT(1) NOT NULL DEFAULT 0 AFTER `show_template_actions`;

-- Preserve existing users who were in full preset (all 1s) to also have meal micronutrients enabled
UPDATE `nutrition_v2_builder_preferences`
SET `show_meal_micronutrients` = 1
WHERE `show_student_preview` = 1
  AND `show_version_history` = 1
  AND `show_template_actions` = 1;
