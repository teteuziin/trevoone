-- Migration 075: Asaas Payment Gateway Integration (Flow 1: Consultancy -> Student)
-- Prepares the database schema for automated payments, recurring subscriptions, and webhook processing via Asaas.
-- Preserves existing manual Pix history (student_charges, student_payment_receipts, student_payments) without regressions.

-- ============================================================================
-- 1. ALTER TABLE consultancy_finance_settings
-- Adds optional Asaas credentials and environment per consultancy for future Phase 2.
-- ============================================================================
ALTER TABLE consultancy_finance_settings
    ADD COLUMN asaas_api_key VARCHAR(255) NULL DEFAULT NULL AFTER payment_instructions,
    ADD COLUMN asaas_environment ENUM('SANDBOX', 'PRODUCTION') NULL DEFAULT 'SANDBOX' AFTER asaas_api_key,
    ADD COLUMN asaas_wallet_id VARCHAR(100) NULL DEFAULT NULL AFTER asaas_environment;

-- ============================================================================
-- 2. CREATE TABLE asaas_customers
-- Links a student membership in a consultancy to their Asaas customer ID.
-- Ensures 1:1 mapping between student membership and Asaas customer per tenancy.
-- ============================================================================
CREATE TABLE IF NOT EXISTS asaas_customers (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    consultancy_id BIGINT UNSIGNED NOT NULL,
    student_membership_id BIGINT UNSIGNED NOT NULL,
    asaas_customer_id VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    cpf_cnpj VARCHAR(20) NULL DEFAULT NULL,
    phone VARCHAR(20) NULL DEFAULT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    CONSTRAINT uq_asaas_customers_public_id
        UNIQUE (public_id),

    CONSTRAINT uq_asaas_customers_tenant_member
        UNIQUE (consultancy_id, student_membership_id),

    INDEX idx_asaas_customers_asaas_id (
        asaas_customer_id
    ),

    INDEX idx_asaas_customers_tenant_lookup (
        consultancy_id,
        asaas_customer_id
    ),

    CONSTRAINT fk_asaas_customers_consultancy
        FOREIGN KEY (consultancy_id)
        REFERENCES consultancies (id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_asaas_customers_student_membership
        FOREIGN KEY (student_membership_id)
        REFERENCES consultancy_members (id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. CREATE TABLE consultancy_plans
-- Catalog of recurring plans offered by the consultancy to students.
-- ============================================================================
CREATE TABLE IF NOT EXISTS consultancy_plans (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    consultancy_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(150) NOT NULL,
    description VARCHAR(500) NULL DEFAULT NULL,
    amount_cents BIGINT UNSIGNED NOT NULL,
    currency_code CHAR(3) NOT NULL DEFAULT 'BRL',
    billing_cycle ENUM('MONTHLY', 'QUARTERLY', 'SEMIANNUALLY', 'YEARLY') NOT NULL,
    status ENUM('ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
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

-- ============================================================================
-- 4. CREATE TABLE student_plan_subscriptions
-- Active recurring subscriptions between student and consultancy, mirroring Asaas.
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_plan_subscriptions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    consultancy_id BIGINT UNSIGNED NOT NULL,
    student_membership_id BIGINT UNSIGNED NOT NULL,
    plan_id BIGINT UNSIGNED NOT NULL,
    asaas_customer_id BIGINT UNSIGNED NOT NULL,
    asaas_subscription_id VARCHAR(50) NOT NULL,
    status ENUM('ACTIVE', 'PAUSED', 'CANCELED', 'OVERDUE') NOT NULL DEFAULT 'ACTIVE',
    next_due_date DATE NULL DEFAULT NULL,
    started_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    canceled_at DATETIME(3) NULL DEFAULT NULL,
    canceled_by_user_id BIGINT UNSIGNED NULL DEFAULT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    CONSTRAINT uq_student_subscriptions_public_id
        UNIQUE (public_id),

    INDEX idx_student_subscriptions_tenant_member (
        consultancy_id,
        student_membership_id,
        status
    ),

    INDEX idx_student_subscriptions_asaas_sub_id (
        asaas_subscription_id
    ),

    INDEX idx_student_subscriptions_next_due (
        status,
        next_due_date
    ),

    CONSTRAINT fk_student_subscriptions_consultancy
        FOREIGN KEY (consultancy_id)
        REFERENCES consultancies (id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_student_subscriptions_student_membership
        FOREIGN KEY (student_membership_id)
        REFERENCES consultancy_members (id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_student_subscriptions_plan
        FOREIGN KEY (plan_id)
        REFERENCES consultancy_plans (id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_student_subscriptions_customer
        FOREIGN KEY (asaas_customer_id)
        REFERENCES asaas_customers (id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_student_subscriptions_canceled_by
        FOREIGN KEY (canceled_by_user_id)
        REFERENCES users (id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 5. ALTER TABLE student_charges
-- Extends charges to store Asaas payment identifier, subscription origin,
-- payment method (PIX, BOLETO, CREDIT_CARD, PIX_MANUAL), invoice URL, and raw status.
-- ============================================================================
ALTER TABLE student_charges
    ADD COLUMN asaas_payment_id VARCHAR(50) NULL DEFAULT NULL AFTER cancel_reason,
    ADD COLUMN asaas_subscription_id VARCHAR(50) NULL DEFAULT NULL AFTER asaas_payment_id,
    ADD COLUMN payment_method ENUM('PIX', 'BOLETO', 'CREDIT_CARD', 'PIX_MANUAL') NULL DEFAULT NULL AFTER asaas_subscription_id,
    ADD COLUMN asaas_invoice_url VARCHAR(500) NULL DEFAULT NULL AFTER payment_method,
    ADD COLUMN asaas_status_raw VARCHAR(50) NULL DEFAULT NULL AFTER asaas_invoice_url,
    ADD INDEX idx_student_charges_asaas_payment (asaas_payment_id),
    ADD INDEX idx_student_charges_asaas_subscription (asaas_subscription_id);

-- ============================================================================
-- 6. CREATE TABLE asaas_webhook_events
-- Idempotency ledger and audit log for webhooks received from Asaas.
-- Prevents duplicate event processing and provides forensic traceability.
-- ============================================================================
CREATE TABLE IF NOT EXISTS asaas_webhook_events (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    asaas_event_id VARCHAR(100) NULL DEFAULT NULL,
    event_type VARCHAR(50) NOT NULL,
    asaas_payment_id VARCHAR(50) NULL DEFAULT NULL,
    raw_payload JSON NOT NULL,
    processed TINYINT(1) NOT NULL DEFAULT 0,
    processed_at DATETIME(3) NULL DEFAULT NULL,
    processing_error VARCHAR(500) NULL DEFAULT NULL,
    received_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    CONSTRAINT uq_asaas_webhook_events_public_id
        UNIQUE (public_id),

    INDEX idx_asaas_webhooks_payment_id (
        asaas_payment_id
    ),

    INDEX idx_asaas_webhooks_event_type (
        event_type
    ),

    INDEX idx_asaas_webhooks_idempotency (
        asaas_event_id,
        event_type
    ),

    INDEX idx_asaas_webhooks_processing (
        processed,
        received_at
    )
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
