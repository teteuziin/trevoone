-- Migration 034: Growth, Monitoring and Operations Foundation V1
-- Supports:
-- 1. Consultancy Referral Program (settings, codes, first-touch attributions, immutable snapshot commissions)
-- 2. PIX Payout Profiles for referrers (masked display, sensitive data isolation)
-- 3. Daily Student 10-Second Check-ins
-- 4. Lightweight Member Activity Tracking (last active timestamp)
-- 5. Deterministic Monitoring Alerts Engine (student and team supervision)
-- 6. Professional Admin Escalations (manual audit-logged actions)

-- 1. Consultancy Referral Settings
CREATE TABLE IF NOT EXISTS consultancy_referral_settings (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    consultancy_id BIGINT UNSIGNED NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    commission_type VARCHAR(20) NOT NULL DEFAULT 'FIXED_AMOUNT',
    commission_value DECIMAL(10, 2) NOT NULL DEFAULT 50.00,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    CONSTRAINT uq_crs_consultancy_id UNIQUE (consultancy_id),
    CONSTRAINT fk_crs_consultancy FOREIGN KEY (consultancy_id)
        REFERENCES consultancies (id) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- 2. Referral Codes (Unique per consultancy membership)
CREATE TABLE IF NOT EXISTS referral_codes (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    consultancy_id BIGINT UNSIGNED NOT NULL,
    referrer_member_id BIGINT UNSIGNED NOT NULL,
    code VARCHAR(32) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    CONSTRAINT uq_rc_public_id UNIQUE (public_id),
    CONSTRAINT uq_rc_code UNIQUE (code),
    CONSTRAINT uq_rc_consultancy_member UNIQUE (consultancy_id, referrer_member_id),
    INDEX idx_rc_consultancy_active (consultancy_id, is_active),
    CONSTRAINT fk_rc_consultancy FOREIGN KEY (consultancy_id)
        REFERENCES consultancies (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_rc_referrer_member FOREIGN KEY (referrer_member_id)
        REFERENCES consultancy_members (id) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- 3. Referral Attributions (First-touch attribution with 30-day window)
CREATE TABLE IF NOT EXISTS referral_attributions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    consultancy_id BIGINT UNSIGNED NOT NULL,
    referral_code_id BIGINT UNSIGNED NOT NULL,
    referrer_member_id BIGINT UNSIGNED NOT NULL,
    referred_user_id BIGINT UNSIGNED NULL DEFAULT NULL,
    referred_member_id BIGINT UNSIGNED NULL DEFAULT NULL,
    first_click_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    registered_at DATETIME(3) NULL DEFAULT NULL,
    converted_at DATETIME(3) NULL DEFAULT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    CONSTRAINT uq_ra_public_id UNIQUE (public_id),
    CONSTRAINT uq_ra_referred_member UNIQUE (consultancy_id, referred_member_id),
    INDEX idx_ra_consultancy_code (consultancy_id, referral_code_id),
    INDEX idx_ra_referrer (referrer_member_id),
    INDEX idx_ra_referred_user (referred_user_id),
    INDEX idx_ra_status (consultancy_id, status),
    CONSTRAINT fk_ra_consultancy FOREIGN KEY (consultancy_id)
        REFERENCES consultancies (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_ra_code FOREIGN KEY (referral_code_id)
        REFERENCES referral_codes (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_ra_referrer_member FOREIGN KEY (referrer_member_id)
        REFERENCES consultancy_members (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_ra_referred_user FOREIGN KEY (referred_user_id)
        REFERENCES users (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_ra_referred_member FOREIGN KEY (referred_member_id)
        REFERENCES consultancy_members (id) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- 4. Referral Commissions (Immutable snapshot at creation)
CREATE TABLE IF NOT EXISTS referral_commissions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    consultancy_id BIGINT UNSIGNED NOT NULL,
    attribution_id BIGINT UNSIGNED NOT NULL,
    referrer_member_id BIGINT UNSIGNED NOT NULL,
    referred_member_id BIGINT UNSIGNED NOT NULL,
    commission_type_snapshot VARCHAR(20) NOT NULL,
    commission_rate_snapshot DECIMAL(10, 2) NOT NULL,
    final_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    approved_at DATETIME(3) NULL DEFAULT NULL,
    approved_by_member_id BIGINT UNSIGNED NULL DEFAULT NULL,
    paid_at DATETIME(3) NULL DEFAULT NULL,
    paid_by_member_id BIGINT UNSIGNED NULL DEFAULT NULL,
    cancelled_at DATETIME(3) NULL DEFAULT NULL,
    cancelled_by_member_id BIGINT UNSIGNED NULL DEFAULT NULL,
    cancellation_reason TEXT NULL DEFAULT NULL,
    payment_note TEXT NULL DEFAULT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    CONSTRAINT uq_rcm_public_id UNIQUE (public_id),
    CONSTRAINT uq_rcm_attribution_id UNIQUE (attribution_id),
    INDEX idx_rcm_consultancy_status (consultancy_id, status),
    INDEX idx_rcm_referrer (referrer_member_id, status),
    CONSTRAINT fk_rcm_consultancy FOREIGN KEY (consultancy_id)
        REFERENCES consultancies (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_rcm_attribution FOREIGN KEY (attribution_id)
        REFERENCES referral_attributions (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_rcm_referrer_member FOREIGN KEY (referrer_member_id)
        REFERENCES consultancy_members (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_rcm_referred_member FOREIGN KEY (referred_member_id)
        REFERENCES consultancy_members (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_rcm_approved_by FOREIGN KEY (approved_by_member_id)
        REFERENCES consultancy_members (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_rcm_paid_by FOREIGN KEY (paid_by_member_id)
        REFERENCES consultancy_members (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_rcm_cancelled_by FOREIGN KEY (cancelled_by_member_id)
        REFERENCES consultancy_members (id) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- 5. Member Payout Profiles (PIX)
CREATE TABLE IF NOT EXISTS member_payout_profiles (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    consultancy_id BIGINT UNSIGNED NOT NULL,
    member_id BIGINT UNSIGNED NOT NULL,
    pix_key_type VARCHAR(20) NOT NULL,
    pix_key VARCHAR(255) NOT NULL,
    receiver_name VARCHAR(150) NULL DEFAULT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    CONSTRAINT uq_mpp_public_id UNIQUE (public_id),
    CONSTRAINT uq_mpp_consultancy_member UNIQUE (consultancy_id, member_id),
    CONSTRAINT fk_mpp_consultancy FOREIGN KEY (consultancy_id)
        REFERENCES consultancies (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_mpp_member FOREIGN KEY (member_id)
        REFERENCES consultancy_members (id) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- 6. Daily Student Check-ins (10-second check-in)
CREATE TABLE IF NOT EXISTS daily_student_checkins (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    consultancy_id BIGINT UNSIGNED NOT NULL,
    student_member_id BIGINT UNSIGNED NOT NULL,
    checkin_date DATE NOT NULL,
    training_status VARCHAR(32) NOT NULL,
    diet_status VARCHAR(32) NOT NULL,
    energy_level TINYINT UNSIGNED NOT NULL,
    difficulty_level VARCHAR(32) NOT NULL,
    has_pain BOOLEAN NOT NULL DEFAULT FALSE,
    difficulty_reasons JSON NULL DEFAULT NULL,
    notes TEXT NULL DEFAULT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    CONSTRAINT uq_dsc_public_id UNIQUE (public_id),
    CONSTRAINT uq_dsc_student_date UNIQUE (student_member_id, checkin_date),
    INDEX idx_dsc_consultancy_date (consultancy_id, checkin_date),
    INDEX idx_dsc_student_created (student_member_id, created_at),
    CONSTRAINT fk_dsc_consultancy FOREIGN KEY (consultancy_id)
        REFERENCES consultancies (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_dsc_student_member FOREIGN KEY (student_member_id)
        REFERENCES consultancy_members (id) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- 7. Member Activity Tracking (Lightweight last active signal)
CREATE TABLE IF NOT EXISTS member_activity_tracking (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    consultancy_id BIGINT UNSIGNED NOT NULL,
    member_id BIGINT UNSIGNED NOT NULL,
    last_active_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    CONSTRAINT uq_mat_consultancy_member UNIQUE (consultancy_id, member_id),
    INDEX idx_mat_consultancy_last_active (consultancy_id, last_active_at),
    CONSTRAINT fk_mat_consultancy FOREIGN KEY (consultancy_id)
        REFERENCES consultancies (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_mat_member FOREIGN KEY (member_id)
        REFERENCES consultancy_members (id) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- 8. Monitoring Alerts Engine
CREATE TABLE IF NOT EXISTS monitoring_alerts (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    consultancy_id BIGINT UNSIGNED NOT NULL,
    subject_member_id BIGINT UNSIGNED NOT NULL,
    subject_type VARCHAR(20) NOT NULL,
    alert_type VARCHAR(64) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    fingerprint VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    first_detected_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    last_detected_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    acknowledged_at DATETIME(3) NULL DEFAULT NULL,
    acknowledged_by_member_id BIGINT UNSIGNED NULL DEFAULT NULL,
    resolved_at DATETIME(3) NULL DEFAULT NULL,
    resolved_by_member_id BIGINT UNSIGNED NULL DEFAULT NULL,
    evidence_json JSON NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    CONSTRAINT uq_ma_public_id UNIQUE (public_id),
    CONSTRAINT uq_ma_consultancy_fingerprint UNIQUE (consultancy_id, fingerprint),
    INDEX idx_ma_consultancy_status_severity (consultancy_id, status, severity),
    INDEX idx_ma_subject_status (subject_member_id, status),
    CONSTRAINT fk_mon_alerts_consultancy FOREIGN KEY (consultancy_id)
        REFERENCES consultancies (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_mon_alerts_subject_member FOREIGN KEY (subject_member_id)
        REFERENCES consultancy_members (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_mon_alerts_acknowledged_by FOREIGN KEY (acknowledged_by_member_id)
        REFERENCES consultancy_members (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_mon_alerts_resolved_by FOREIGN KEY (resolved_by_member_id)
        REFERENCES consultancy_members (id) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;

-- 9. Professional Admin Actions (Manual escalation ledger)
CREATE TABLE IF NOT EXISTS professional_admin_actions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    public_id CHAR(36) NOT NULL,
    consultancy_id BIGINT UNSIGNED NOT NULL,
    professional_member_id BIGINT UNSIGNED NOT NULL,
    admin_member_id BIGINT UNSIGNED NOT NULL,
    action_type VARCHAR(32) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    expires_at DATETIME(3) NULL DEFAULT NULL,
    resolved_at DATETIME(3) NULL DEFAULT NULL,
    resolved_by_member_id BIGINT UNSIGNED NULL DEFAULT NULL,
    resolution_note TEXT NULL DEFAULT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    CONSTRAINT uq_paa_public_id UNIQUE (public_id),
    INDEX idx_paa_consultancy_prof_status (consultancy_id, professional_member_id, status),
    CONSTRAINT fk_paa_consultancy FOREIGN KEY (consultancy_id)
        REFERENCES consultancies (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_paa_professional_member FOREIGN KEY (professional_member_id)
        REFERENCES consultancy_members (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_paa_admin_member FOREIGN KEY (admin_member_id)
        REFERENCES consultancy_members (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_paa_resolved_by FOREIGN KEY (resolved_by_member_id)
        REFERENCES consultancy_members (id) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci;
