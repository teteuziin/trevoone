-- Migration 073: Promotional Campaigns Manual Sales & Storage Hardening
-- Suporte completo a registro manual de vendas de checkouts externos pelo Administrador (sem cookies),
-- idempotência concorrente via external_reference, e campos opcionais de comprador externo.

SET @dbname = DATABASE();

-- 1. referral_commissions: buyer_name
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'referral_commissions' AND COLUMN_NAME = 'buyer_name'
);
SET @sql = IF(@col_exists = 0, 'ALTER TABLE referral_commissions ADD COLUMN buyer_name VARCHAR(191) NULL AFTER referred_member_id;', 'SELECT 1;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. referral_commissions: external_reference
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'referral_commissions' AND COLUMN_NAME = 'external_reference'
);
SET @sql = IF(@col_exists = 0, 'ALTER TABLE referral_commissions ADD COLUMN external_reference VARCHAR(191) NULL AFTER buyer_name, ADD INDEX idx_rcm_external_ref (consultancy_id, external_reference);', 'SELECT 1;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. referral_commissions: make referred_member_id NULLABLE for external sales
-- If a buyer purchases via external checkout before being invited, referred_member_id can be NULL.
SET @is_nullable = (
  SELECT IS_NULLABLE FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'referral_commissions' AND COLUMN_NAME = 'referred_member_id'
);
SET @sql = IF(@is_nullable = 'NO', 'ALTER TABLE referral_commissions MODIFY COLUMN referred_member_id BIGINT UNSIGNED NULL DEFAULT NULL;', 'SELECT 1;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. referral_attributions: buyer_name
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'referral_attributions' AND COLUMN_NAME = 'buyer_name'
);
SET @sql = IF(@col_exists = 0, 'ALTER TABLE referral_attributions ADD COLUMN buyer_name VARCHAR(191) NULL AFTER referred_member_id;', 'SELECT 1;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
