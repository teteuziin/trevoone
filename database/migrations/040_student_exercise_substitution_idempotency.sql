-- Migration 040: Student Exercise Substitution Idempotency Key
-- Trevo One - AI Intelligence V2 Post-Deploy Hardening
-- Adds idempotency_key column and unique constraint on (execution_session_id, idempotency_key)
-- Safe for fresh runs, existing databases with manual ALTER, and reruns.

ALTER TABLE `workout_execution_exercise_substitutions`
  ADD COLUMN IF NOT EXISTS `idempotency_key` VARCHAR(100) NULL AFTER `sequence_number`;

CREATE UNIQUE INDEX IF NOT EXISTS `uq_wees_idempotency`
  ON `workout_execution_exercise_substitutions` (`execution_session_id`, `idempotency_key`);
