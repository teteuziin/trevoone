-- Migration 076: Official InfinitePay (CloudWalk) Integration for Consultancy Student Payments
-- Allows consultancies to create commercial plans, issue single-payment checkout links (Pix & Credit Card Installments),
-- receive automated webhooks, verify payments via official POST /payment_check, and activate plans automatically.
-- Idempotent and compatible with existing financial and Asaas structures without destructive modifications.

SET @dbname = DATABASE();

-- ============================================================================
-- 1. TABLE: consultancy_plans
-- ============================================================================
CREATE TABLE IF NOT EXISTS consultancy_plans (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    consultancy_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(150) NOT NULL,
    description VARCHAR(500) NULL DEFAULT NULL,
    amount_cents BIGINT UNSIGNED NOT NULL,
    currency_code CHAR(3) NOT NULL DEFAULT 'BRL',
    duration_days INT UNSIGNED NULL DEFAULT NULL,
    duration_months INT UNSIGNED NULL DEFAULT NULL,
    billing_cycle ENUM('MONTHLY', 'QUARTERLY', 'SEMIANNUALLY', 'YEARLY', 'CUSTOM') NOT NULL DEFAULT 'CUSTOM',
    assured_installments INT UNSIGNED NOT NULL DEFAULT 0,
    is_available_for_purchase TINYINT(1) NOT NULL DEFAULT 1,
    payment_methods VARCHAR(50) NOT NULL DEFAULT 'PIX_AND_CARD',
    status ENUM('ACTIVE', 'INACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    created_by_user_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    CONSTRAINT uq_consultancy_plans_public_id
        UNIQUE (public_id),

    INDEX idx_consultancy_plans_tenant_status (
        consultancy_id,
        status,
        created_at
    ),

    CONSTRAINT fk_consultancy_plans_consultancy
        FOREIGN KEY (consultancy_id)
        REFERENCES consultancies (id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_consultancy_plans_created_by
        FOREIGN KEY (created_by_user_id)
        REFERENCES users (id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- Safe column additions if consultancy_plans pre-existed from migration 075
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'consultancy_plans' AND COLUMN_NAME = 'duration_days');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE consultancy_plans ADD COLUMN duration_days INT UNSIGNED NULL DEFAULT NULL AFTER currency_code;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'consultancy_plans' AND COLUMN_NAME = 'duration_months');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE consultancy_plans ADD COLUMN duration_months INT UNSIGNED NULL DEFAULT NULL AFTER duration_days;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'consultancy_plans' AND COLUMN_NAME = 'assured_installments');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE consultancy_plans ADD COLUMN assured_installments INT UNSIGNED NOT NULL DEFAULT 0 AFTER billing_cycle;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'consultancy_plans' AND COLUMN_NAME = 'is_available_for_purchase');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE consultancy_plans ADD COLUMN is_available_for_purchase TINYINT(1) NOT NULL DEFAULT 1 AFTER assured_installments;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'consultancy_plans' AND COLUMN_NAME = 'payment_methods');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE consultancy_plans ADD COLUMN payment_methods VARCHAR(50) NOT NULL DEFAULT \'PIX_AND_CARD\' AFTER is_available_for_purchase;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Ensure billing_cycle and status enums allow InfinitePay options
ALTER TABLE consultancy_plans
    MODIFY COLUMN billing_cycle ENUM('MONTHLY', 'QUARTERLY', 'SEMIANNUALLY', 'YEARLY', 'CUSTOM') NOT NULL DEFAULT 'CUSTOM',
    MODIFY COLUMN status ENUM('ACTIVE', 'INACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE';


-- ============================================================================
-- 2. TABLE: consultancy_finance_settings (InfinitePay columns)
-- ============================================================================
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'consultancy_finance_settings' AND COLUMN_NAME = 'infinitepay_handle');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE consultancy_finance_settings ADD COLUMN infinitepay_handle VARCHAR(100) NULL DEFAULT NULL;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'consultancy_finance_settings' AND COLUMN_NAME = 'infinitepay_api_key');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE consultancy_finance_settings ADD COLUMN infinitepay_api_key VARCHAR(255) NULL DEFAULT NULL;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'consultancy_finance_settings' AND COLUMN_NAME = 'infinitepay_enabled');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE consultancy_finance_settings ADD COLUMN infinitepay_enabled TINYINT(1) NOT NULL DEFAULT 0;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'consultancy_finance_settings' AND COLUMN_NAME = 'infinitepay_environment');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE consultancy_finance_settings ADD COLUMN infinitepay_environment ENUM(\'SIMULATION\', \'PRODUCTION\') NOT NULL DEFAULT \'SIMULATION\';', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- ============================================================================
-- 3. TABLE: student_charges (InfinitePay columns & indexes)
-- ============================================================================
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'student_charges' AND COLUMN_NAME = 'plan_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE student_charges ADD COLUMN plan_id BIGINT UNSIGNED NULL DEFAULT NULL AFTER student_membership_id;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'student_charges' AND COLUMN_NAME = 'infinitepay_slug');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE student_charges ADD COLUMN infinitepay_slug VARCHAR(100) NULL DEFAULT NULL;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'student_charges' AND COLUMN_NAME = 'infinitepay_order_nsu');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE student_charges ADD COLUMN infinitepay_order_nsu VARCHAR(100) NULL DEFAULT NULL;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'student_charges' AND COLUMN_NAME = 'infinitepay_transaction_nsu');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE student_charges ADD COLUMN infinitepay_transaction_nsu VARCHAR(100) NULL DEFAULT NULL;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'student_charges' AND COLUMN_NAME = 'infinitepay_checkout_url');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE student_charges ADD COLUMN infinitepay_checkout_url VARCHAR(500) NULL DEFAULT NULL;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'student_charges' AND COLUMN_NAME = 'infinitepay_receipt_url');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE student_charges ADD COLUMN infinitepay_receipt_url VARCHAR(500) NULL DEFAULT NULL;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'student_charges' AND COLUMN_NAME = 'infinitepay_installments');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE student_charges ADD COLUMN infinitepay_installments INT UNSIGNED NULL DEFAULT NULL;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'student_charges' AND COLUMN_NAME = 'infinitepay_capture_method');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE student_charges ADD COLUMN infinitepay_capture_method VARCHAR(50) NULL DEFAULT NULL;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'student_charges' AND COLUMN_NAME = 'paid_amount_cents');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE student_charges ADD COLUMN paid_amount_cents BIGINT UNSIGNED NULL DEFAULT NULL;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'student_charges' AND COLUMN_NAME = 'paid_at');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE student_charges ADD COLUMN paid_at DATETIME(3) NULL DEFAULT NULL;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Indexes for student_charges
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'student_charges' AND INDEX_NAME = 'idx_student_charges_inf_order');
SET @sql = IF(@idx_exists = 0, 'ALTER TABLE student_charges ADD INDEX idx_student_charges_inf_order (infinitepay_order_nsu);', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'student_charges' AND INDEX_NAME = 'idx_student_charges_inf_slug');
SET @sql = IF(@idx_exists = 0, 'ALTER TABLE student_charges ADD INDEX idx_student_charges_inf_slug (infinitepay_slug);', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'student_charges' AND INDEX_NAME = 'idx_student_charges_inf_tx');
SET @sql = IF(@idx_exists = 0, 'ALTER TABLE student_charges ADD INDEX idx_student_charges_inf_tx (infinitepay_transaction_nsu);', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- ============================================================================
-- 4. TABLE: student_plan_subscriptions
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_plan_subscriptions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    consultancy_id BIGINT UNSIGNED NOT NULL,
    student_membership_id BIGINT UNSIGNED NOT NULL,
    plan_id BIGINT UNSIGNED NOT NULL,
    charge_id BIGINT UNSIGNED NULL DEFAULT NULL,
    status ENUM('ACTIVE', 'PAUSED', 'CANCELED', 'OVERDUE') NOT NULL DEFAULT 'ACTIVE',
    started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ends_at DATETIME(3) NULL DEFAULT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    CONSTRAINT uq_student_subscriptions_public_id
        UNIQUE (public_id),

    INDEX idx_student_sub_member_status (
        consultancy_id,
        student_membership_id,
        status,
        ends_at
    ),

    INDEX idx_student_sub_charge (
        charge_id
    ),

    CONSTRAINT fk_student_sub_consultancy
        FOREIGN KEY (consultancy_id)
        REFERENCES consultancies (id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_student_sub_student_membership
        FOREIGN KEY (student_membership_id)
        REFERENCES consultancy_members (id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_student_sub_plan
        FOREIGN KEY (plan_id)
        REFERENCES consultancy_plans (id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- Safe additions and nullability adjustments if pre-existing from 075
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'student_plan_subscriptions' AND COLUMN_NAME = 'charge_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE student_plan_subscriptions ADD COLUMN charge_id BIGINT UNSIGNED NULL DEFAULT NULL AFTER plan_id;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'student_plan_subscriptions' AND COLUMN_NAME = 'ends_at');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE student_plan_subscriptions ADD COLUMN ends_at DATETIME(3) NULL DEFAULT NULL AFTER started_at;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Relax Asaas NOT NULL constraints if table pre-existed from migration 075
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'student_plan_subscriptions' AND COLUMN_NAME = 'asaas_customer_id');
SET @sql = IF(@col_exists > 0, 'ALTER TABLE student_plan_subscriptions MODIFY COLUMN asaas_customer_id BIGINT UNSIGNED NULL DEFAULT NULL;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'student_plan_subscriptions' AND COLUMN_NAME = 'asaas_subscription_id');
SET @sql = IF(@col_exists > 0, 'ALTER TABLE student_plan_subscriptions MODIFY COLUMN asaas_subscription_id VARCHAR(50) NULL DEFAULT NULL;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- ============================================================================
-- 5. TABLE: infinitepay_webhook_events
-- ============================================================================
CREATE TABLE IF NOT EXISTS infinitepay_webhook_events (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    order_nsu VARCHAR(100) NULL DEFAULT NULL,
    transaction_nsu VARCHAR(100) NULL DEFAULT NULL,
    invoice_slug VARCHAR(100) NULL DEFAULT NULL,
    capture_method VARCHAR(50) NULL DEFAULT NULL,
    raw_payload JSON NOT NULL,
    status ENUM('PENDING', 'PROCESSED', 'IGNORED_ORPHAN', 'FAILED', 'VERIFIED_PAID', 'VERIFIED_FAILED', 'REFUND_AUDITED') NOT NULL DEFAULT 'PENDING',
    processed TINYINT(1) NOT NULL DEFAULT 0,
    processed_at DATETIME(3) NULL DEFAULT NULL,
    processing_error VARCHAR(500) NULL DEFAULT NULL,
    received_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    CONSTRAINT uq_infinitepay_events_public_id
        UNIQUE (public_id),

    INDEX idx_inf_webhooks_order (order_nsu),
    INDEX idx_inf_webhooks_tx (transaction_nsu),
    INDEX idx_inf_webhooks_slug (invoice_slug),
    INDEX idx_inf_webhooks_status (status, processed, received_at)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
