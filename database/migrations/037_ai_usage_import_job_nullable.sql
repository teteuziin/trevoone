-- Migration 037: AI Usage Import Job Nullable
-- Trevo One - Master Feature V1 Post-Deploy Fix
-- Makes import_job_public_id nullable to allow quota reservations and direct AI usage events prior to job binding

ALTER TABLE `ai_usage_events`
    MODIFY COLUMN `import_job_public_id` CHAR(36) NULL DEFAULT NULL;
