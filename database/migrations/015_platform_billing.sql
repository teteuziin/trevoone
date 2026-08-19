-- Migration 015: Platform Billing (Consultancy -> Trevo One)
-- Global Platform Billing settings, Consultancy Platform Subscriptions, Charges, Receipts, Payments

CREATE TABLE IF NOT EXISTS platform_billing_settings (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    pix_key_type VARCHAR(32) NOT NULL,
    pix_key VARCHAR(255) NOT NULL,
    receiver_name VARCHAR(255) NOT NULL,
    instructions TEXT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    updated_by_user_id BIGINT UNSIGNED NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_platform_billing_settings_public_id (public_id),
    CONSTRAINT fk_platform_billing_settings_updater
        FOREIGN KEY (updated_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS consultancy_platform_subscriptions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    consultancy_id BIGINT UNSIGNED NOT NULL,
    administrative_status VARCHAR(32) NOT NULL,
    manual_suspension_reason VARCHAR(500) NULL,
    manual_suspension_by_user_id BIGINT UNSIGNED NULL,
    manual_suspension_at DATETIME(3) NULL,
    cancellation_reason VARCHAR(500) NULL,
    canceled_by_user_id BIGINT UNSIGNED NULL,
    canceled_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_platform_subscriptions_public_id (public_id),
    UNIQUE KEY uq_platform_subscriptions_consultancy (consultancy_id),
    CONSTRAINT fk_platform_subscriptions_consultancy
        FOREIGN KEY (consultancy_id) REFERENCES consultancies (id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_platform_subscriptions_suspender
        FOREIGN KEY (manual_suspension_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_platform_subscriptions_canceler
        FOREIGN KEY (canceled_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS consultancy_platform_charges (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    consultancy_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(160) NOT NULL,
    description VARCHAR(2000) NULL,
    amount_cents BIGINT UNSIGNED NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
    due_on DATE NOT NULL,
    period_start DATE NULL,
    period_end DATE NULL,
    grace_days_snapshot TINYINT UNSIGNED NOT NULL,
    status VARCHAR(32) NOT NULL,
    created_by_user_id BIGINT UNSIGNED NOT NULL,
    canceled_by_user_id BIGINT UNSIGNED NULL,
    canceled_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_platform_charges_public_id (public_id),
    INDEX idx_platform_charges_consultancy (consultancy_id, status, due_on),
    CONSTRAINT fk_platform_charges_consultancy
        FOREIGN KEY (consultancy_id) REFERENCES consultancies (id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_platform_charges_creator
        FOREIGN KEY (created_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_platform_charges_canceler
        FOREIGN KEY (canceled_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS consultancy_platform_receipts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    consultancy_id BIGINT UNSIGNED NOT NULL,
    charge_id BIGINT UNSIGNED NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes INT UNSIGNED NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    sha256_hash CHAR(64) NOT NULL,
    storage_key VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL,
    rejection_reason VARCHAR(255) NULL,
    submitted_by_user_id BIGINT UNSIGNED NOT NULL,
    reviewed_by_user_id BIGINT UNSIGNED NULL,
    reviewed_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_platform_receipts_public_id (public_id),
    INDEX idx_platform_receipts_charge (charge_id, status),
    CONSTRAINT fk_platform_receipts_consultancy
        FOREIGN KEY (consultancy_id) REFERENCES consultancies (id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_platform_receipts_charge
        FOREIGN KEY (charge_id) REFERENCES consultancy_platform_charges (id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_platform_receipts_submitter
        FOREIGN KEY (submitted_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_platform_receipts_reviewer
        FOREIGN KEY (reviewed_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS consultancy_platform_payments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    consultancy_id BIGINT UNSIGNED NOT NULL,
    charge_id BIGINT UNSIGNED NOT NULL,
    receipt_id BIGINT UNSIGNED NOT NULL,
    amount_cents BIGINT UNSIGNED NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
    method VARCHAR(32) NOT NULL DEFAULT 'PIX_MANUAL',
    confirmed_by_user_id BIGINT UNSIGNED NOT NULL,
    confirmed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uq_platform_payments_public_id (public_id),
    UNIQUE KEY uq_platform_payments_charge (charge_id),
    UNIQUE KEY uq_platform_payments_receipt (receipt_id),
    CONSTRAINT fk_platform_payments_consultancy
        FOREIGN KEY (consultancy_id) REFERENCES consultancies (id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_platform_payments_charge
        FOREIGN KEY (charge_id) REFERENCES consultancy_platform_charges (id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_platform_payments_receipt
        FOREIGN KEY (receipt_id) REFERENCES consultancy_platform_receipts (id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_platform_payments_confirmer
        FOREIGN KEY (confirmed_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Backfill platform subscription row for all existing consultancies with ACTIVE administrative status
INSERT INTO consultancy_platform_subscriptions (public_id, consultancy_id, administrative_status)
SELECT UUID(), c.id, 'ACTIVE'
FROM consultancies c
LEFT JOIN consultancy_platform_subscriptions cps ON cps.consultancy_id = c.id
WHERE cps.id IS NULL;
