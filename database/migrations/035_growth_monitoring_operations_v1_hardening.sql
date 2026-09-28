-- Migration 035: Growth, Monitoring and Operations Hardening V1
-- Enforces:
-- 1. Referral program default is_enabled = FALSE
-- 2. Exact integer cents and basis points for monetary safety (no floating point)
-- 3. Anonymous first-touch token hash and 30-day expiration tracking
-- 4. Eligible base amount snapshot for percentage commissions

-- 1. Consultancy Referral Settings hardening
ALTER TABLE consultancy_referral_settings
    MODIFY COLUMN is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN commission_amount_cents BIGINT NOT NULL DEFAULT 5000 AFTER commission_value,
    ADD COLUMN commission_rate_basis_points INT NOT NULL DEFAULT 1000 AFTER commission_amount_cents;

-- 2. Referral Attributions hardening
ALTER TABLE referral_attributions
    ADD COLUMN visitor_token_hash CHAR(64) NULL AFTER referrer_member_id,
    ADD COLUMN expires_at DATETIME(3) NULL AFTER first_click_at,
    ADD INDEX idx_ra_consultancy_token_hash (consultancy_id, visitor_token_hash),
    ADD INDEX idx_ra_consultancy_user (consultancy_id, referred_user_id);

-- 3. Referral Commissions hardening
ALTER TABLE referral_commissions
    MODIFY COLUMN final_amount DECIMAL(10, 2) NULL,
    ADD COLUMN base_amount_cents BIGINT NULL AFTER commission_rate_snapshot,
    ADD COLUMN rate_basis_points INT NULL AFTER base_amount_cents,
    ADD COLUMN final_amount_cents BIGINT NULL AFTER rate_basis_points;
