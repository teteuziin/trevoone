-- Migration: 058_nutrition_v2_plan_versions_structured_guidance.sql
-- Description: Add structured guidance JSON column to nutrition_v2_plan_versions for recommendations, supplements, and phytotherapeutics
-- Rules: Strict multi-tenancy | Version-scoped | Non-destructive defaults | Pure clinical prescription

ALTER TABLE `nutrition_v2_plan_versions`
ADD COLUMN `guidance_json` JSON NULL DEFAULT NULL AFTER `general_guidance`;
