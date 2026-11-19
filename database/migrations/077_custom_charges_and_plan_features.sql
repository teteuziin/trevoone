-- Migration 077: Support for Modular Plan Features, Custom Student Charges, and Subscriptions
-- Prepares schema for modular feature entitlements (features_json) on plans, charges, and subscriptions,
-- and allows subscriptions to be created from ad-hoc custom charges without requiring a commercial plan.
-- Idempotent, non-destructive, and fully compatible with existing migrations (075, 076).

SET @dbname = DATABASE();

-- ============================================================================
-- 1. TABLE: consultancy_plans (features_json column)
-- ============================================================================
SET @col_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'consultancy_plans'
      AND COLUMN_NAME = 'features_json'
);
SET @sql = IF(
    @col_exists = 0,
    'ALTER TABLE consultancy_plans ADD COLUMN features_json JSON NULL DEFAULT NULL AFTER payment_methods;',
    'SELECT 1;'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- ============================================================================
-- 2. TABLE: student_charges (features_json column)
-- ============================================================================
SET @col_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'student_charges'
      AND COLUMN_NAME = 'features_json'
);
SET @sql = IF(
    @col_exists = 0,
    'ALTER TABLE student_charges ADD COLUMN features_json JSON NULL DEFAULT NULL AFTER title;',
    'SELECT 1;'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- ============================================================================
-- 3. TABLE: student_plan_subscriptions
--    - Allow nullable plan_id for custom charges
--    - Add features_json column (after status)
--    - Add index and foreign key on existing charge_id column
-- ============================================================================
-- 3.1. Make plan_id nullable for custom charges without commercial plans
ALTER TABLE student_plan_subscriptions
    MODIFY COLUMN plan_id BIGINT UNSIGNED NULL DEFAULT NULL;

-- 3.2. Add features_json column
SET @col_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'student_plan_subscriptions'
      AND COLUMN_NAME = 'features_json'
);
SET @sql = IF(
    @col_exists = 0,
    'ALTER TABLE student_plan_subscriptions ADD COLUMN features_json JSON NULL DEFAULT NULL AFTER status;',
    'SELECT 1;'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3.3. Index for existing charge_id column
SET @idx_exists = (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'student_plan_subscriptions'
      AND (INDEX_NAME = 'idx_student_subscriptions_charge_id' OR INDEX_NAME = 'idx_student_sub_charge')
);
SET @sql = IF(
    @idx_exists = 0,
    'ALTER TABLE student_plan_subscriptions ADD INDEX idx_student_subscriptions_charge_id (charge_id);',
    'SELECT 1;'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3.4. Foreign key constraint for existing charge_id column
SET @fk_exists = (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = @dbname
      AND TABLE_NAME = 'student_plan_subscriptions'
      AND (CONSTRAINT_NAME = 'fk_student_subscriptions_charge' OR CONSTRAINT_NAME = 'fk_student_sub_charge')
);
SET @sql = IF(
    @fk_exists = 0,
    'ALTER TABLE student_plan_subscriptions ADD CONSTRAINT fk_student_subscriptions_charge FOREIGN KEY (charge_id) REFERENCES student_charges (id) ON DELETE SET NULL ON UPDATE CASCADE;',
    'SELECT 1;'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
