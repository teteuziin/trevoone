-- Migration 072: Influencer Promotional Campaigns & Marketing Materials
-- Suporte completo a múltiplos links individuais por participante (VIPs, influenciadores e alunos),
-- materiais de divulgação (Stories, Feed, legendas e download), atribuição por campanha e comissões associadas.

CREATE TABLE IF NOT EXISTS `promotional_campaign_links` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `public_id` CHAR(36) NOT NULL,
  `consultancy_id` BIGINT UNSIGNED NOT NULL,
  `referrer_member_id` BIGINT UNSIGNED NOT NULL,
  `code` VARCHAR(32) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `destination_url` VARCHAR(2048) NOT NULL,
  `announced_discount_type` VARCHAR(20) NOT NULL DEFAULT 'PERCENTAGE',
  `announced_discount_value` VARCHAR(64) NULL,
  `eligible_plans` VARCHAR(255) NULL,
  `commission_type` VARCHAR(20) NOT NULL DEFAULT 'PERCENTAGE',
  `commission_amount_cents` BIGINT NULL DEFAULT NULL,
  `commission_rate_basis_points` INT NULL DEFAULT NULL,
  `commission_conditions` TEXT NULL,
  `starts_at` DATETIME(3) NULL DEFAULT NULL,
  `ends_at` DATETIME(3) NULL DEFAULT NULL,
  `max_uses` INT UNSIGNED NULL DEFAULT NULL,
  `current_uses` INT UNSIGNED NOT NULL DEFAULT 0,
  `click_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  `created_by_member_id` BIGINT UNSIGNED NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pcl_public_id` (`public_id`),
  UNIQUE KEY `uq_pcl_code` (`code`),
  KEY `idx_pcl_consultancy_member` (`consultancy_id`, `referrer_member_id`),
  KEY `idx_pcl_status` (`consultancy_id`, `status`),
  CONSTRAINT `fk_pcl_consultancy` FOREIGN KEY (`consultancy_id`) REFERENCES `consultancies` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_pcl_referrer_member` FOREIGN KEY (`referrer_member_id`) REFERENCES `consultancy_members` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `promotional_marketing_materials` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `public_id` CHAR(36) NOT NULL,
  `consultancy_id` BIGINT UNSIGNED NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` TEXT NULL,
  `media_format` VARCHAR(20) NOT NULL DEFAULT 'STORY',
  `file_url` VARCHAR(2048) NULL,
  `storage_key` VARCHAR(512) NULL,
  `file_size_bytes` BIGINT UNSIGNED NULL,
  `mime_type` VARCHAR(100) NULL,
  `suggested_caption` TEXT NULL,
  `is_global` BOOLEAN NOT NULL DEFAULT TRUE,
  `target_member_id` BIGINT UNSIGNED NULL,
  `campaign_link_id` BIGINT UNSIGNED NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  `created_by_member_id` BIGINT UNSIGNED NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pmm_public_id` (`public_id`),
  KEY `idx_pmm_consultancy_status` (`consultancy_id`, `status`),
  KEY `idx_pmm_member` (`consultancy_id`, `target_member_id`),
  CONSTRAINT `fk_pmm_consultancy` FOREIGN KEY (`consultancy_id`) REFERENCES `consultancies` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `promotional_campaign_link_materials` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `campaign_link_id` BIGINT UNSIGNED NOT NULL,
  `material_id` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pclm_link_material` (`campaign_link_id`, `material_id`),
  KEY `idx_pclm_link` (`campaign_link_id`),
  CONSTRAINT `fk_pclm_link` FOREIGN KEY (`campaign_link_id`) REFERENCES `promotional_campaign_links` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_pclm_material` FOREIGN KEY (`material_id`) REFERENCES `promotional_marketing_materials` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Adições seguras e aditivas nas tabelas existentes (com verificação de existência para idempotência)
SET @dbname = DATABASE();

-- referral_attributions: campaign_link_id
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'referral_attributions' AND COLUMN_NAME = 'campaign_link_id'
);
SET @sql = IF(@col_exists = 0, 'ALTER TABLE referral_attributions ADD COLUMN campaign_link_id BIGINT UNSIGNED NULL AFTER referral_code_id, ADD INDEX idx_ra_campaign_link (campaign_link_id);', 'SELECT 1;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- referral_commissions: campaign_link_id
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'referral_commissions' AND COLUMN_NAME = 'campaign_link_id'
);
SET @sql = IF(@col_exists = 0, 'ALTER TABLE referral_commissions ADD COLUMN campaign_link_id BIGINT UNSIGNED NULL AFTER referred_member_id, ADD INDEX idx_rcm_campaign_link (campaign_link_id);', 'SELECT 1;');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
