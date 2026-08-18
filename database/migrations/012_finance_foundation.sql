CREATE TABLE consultancy_finance_settings (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    consultancy_id BIGINT UNSIGNED NOT NULL,
    pix_key_type VARCHAR(20) NOT NULL,
    pix_key VARCHAR(255) NOT NULL,
    pix_receiver_name VARCHAR(150) NOT NULL,
    payment_instructions VARCHAR(1000) NULL DEFAULT NULL,
    billing_timezone VARCHAR(64) NOT NULL,
    created_by_user_id BIGINT UNSIGNED NOT NULL,
    updated_by_user_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    CONSTRAINT uq_consultancy_finance_settings_public_id
        UNIQUE (public_id),

    CONSTRAINT uq_consultancy_finance_settings_consultancy
        UNIQUE (consultancy_id),

    CONSTRAINT fk_finance_settings_consultancy
        FOREIGN KEY (consultancy_id)
        REFERENCES consultancies(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_finance_settings_created_by
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_finance_settings_updated_by
        FOREIGN KEY (updated_by_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

CREATE TABLE student_charges (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    consultancy_id BIGINT UNSIGNED NOT NULL,
    student_membership_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(150) NOT NULL,
    description VARCHAR(500) NULL DEFAULT NULL,
    amount_cents BIGINT UNSIGNED NOT NULL,
    currency_code CHAR(3) NOT NULL DEFAULT 'BRL',
    due_on DATE NOT NULL,
    reference_period_start DATE NULL DEFAULT NULL,
    reference_period_end DATE NULL DEFAULT NULL,
    blocks_access TINYINT(1) NOT NULL DEFAULT 1,
    state VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    created_by_user_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    canceled_by_user_id BIGINT UNSIGNED NULL DEFAULT NULL,
    canceled_at DATETIME(3) NULL DEFAULT NULL,
    cancel_reason VARCHAR(255) NULL DEFAULT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_student_charges_public_id
        UNIQUE (public_id),

    INDEX idx_student_charges_access (
        consultancy_id,
        student_membership_id,
        state,
        due_on,
        id
    ),

    INDEX idx_student_charges_created_by (
        created_by_user_id
    ),

    CONSTRAINT fk_student_charges_consultancy
        FOREIGN KEY (consultancy_id)
        REFERENCES consultancies(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_student_charges_student_membership
        FOREIGN KEY (student_membership_id)
        REFERENCES consultancy_members(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_student_charges_created_by
        FOREIGN KEY (created_by_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_student_charges_canceled_by
        FOREIGN KEY (canceled_by_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

CREATE TABLE student_payment_receipts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    consultancy_id BIGINT UNSIGNED NOT NULL,
    charge_id BIGINT UNSIGNED NOT NULL,
    submitted_by_user_id BIGINT UNSIGNED NOT NULL,
    file_storage_key VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT UNSIGNED NOT NULL,
    file_sha256 CHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED',
    submitted_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    reviewed_by_user_id BIGINT UNSIGNED NULL DEFAULT NULL,
    reviewed_at DATETIME(3) NULL DEFAULT NULL,
    rejection_reason VARCHAR(255) NULL DEFAULT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_student_payment_receipts_public_id
        UNIQUE (public_id),

    INDEX idx_student_payment_receipts_review (
        consultancy_id,
        charge_id,
        status,
        submitted_at,
        id
    ),

    INDEX idx_student_payment_receipts_submitted_by (
        submitted_by_user_id
    ),

    CONSTRAINT fk_payment_receipts_consultancy
        FOREIGN KEY (consultancy_id)
        REFERENCES consultancies(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_payment_receipts_charge
        FOREIGN KEY (charge_id)
        REFERENCES student_charges(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_payment_receipts_submitted_by
        FOREIGN KEY (submitted_by_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_payment_receipts_reviewed_by
        FOREIGN KEY (reviewed_by_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

CREATE TABLE student_payments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    consultancy_id BIGINT UNSIGNED NOT NULL,
    charge_id BIGINT UNSIGNED NOT NULL,
    receipt_id BIGINT UNSIGNED NOT NULL,
    amount_cents BIGINT UNSIGNED NOT NULL,
    currency_code CHAR(3) NOT NULL DEFAULT 'BRL',
    payment_method VARCHAR(20) NOT NULL DEFAULT 'PIX_MANUAL',
    confirmed_by_user_id BIGINT UNSIGNED NOT NULL,
    confirmed_at DATETIME(3) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    CONSTRAINT uq_student_payments_public_id
        UNIQUE (public_id),

    CONSTRAINT uq_student_payments_charge_id
        UNIQUE (charge_id),

    CONSTRAINT uq_student_payments_receipt_id
        UNIQUE (receipt_id),

    INDEX idx_student_payments_consultancy (
        consultancy_id,
        confirmed_at,
        id
    ),

    CONSTRAINT fk_student_payments_consultancy
        FOREIGN KEY (consultancy_id)
        REFERENCES consultancies(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_student_payments_charge
        FOREIGN KEY (charge_id)
        REFERENCES student_charges(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_student_payments_receipt
        FOREIGN KEY (receipt_id)
        REFERENCES student_payment_receipts(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT,

    CONSTRAINT fk_student_payments_confirmed_by
        FOREIGN KEY (confirmed_by_user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
