-- Migration: 059_nutrition_v2_plan_update_policy.sql
-- Description: Add update_policy and auto_publish_paused to nutrition_v2_plans and default_update_policy to builder preferences
-- Rules: Strict multi-tenancy | Non-destructive defaults ('MANUAL') | Concurrency-safe | Safe rollback

ALTER TABLE `nutrition_v2_plans`
ADD COLUMN `update_policy` VARCHAR(20) NOT NULL DEFAULT 'MANUAL' AFTER `status`,
ADD COLUMN `auto_publish_paused` TINYINT(1) NOT NULL DEFAULT 0 AFTER `update_policy`,
ADD COLUMN `last_auto_published_at` DATETIME(3) NULL DEFAULT NULL AFTER `auto_publish_paused`;

ALTER TABLE `nutrition_v2_builder_preferences`
ADD COLUMN `default_update_policy` VARCHAR(20) NOT NULL DEFAULT 'MANUAL' AFTER `show_meal_micronutrients`;
