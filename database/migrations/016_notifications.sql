-- TREVO ONE — MIGRATION 016: NOTIFICATION FOUNDATION + WEB PUSH
-- Cria as tabelas do sistema de notificações in-app, Web Push subscriptions e delivery attempts

CREATE TABLE IF NOT EXISTS `user_notifications` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `public_id` VARCHAR(32) NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `consultancy_id` BIGINT UNSIGNED NULL,
  `priority` VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
  `event_type` VARCHAR(80) NOT NULL,
  `title` VARCHAR(160) NOT NULL,
  `body` VARCHAR(1000) NOT NULL,
  `deep_link` VARCHAR(2048) NULL,
  `dedupe_key` VARCHAR(191) NULL,
  `source_type` VARCHAR(80) NULL,
  `source_public_id` VARCHAR(64) NULL,
  `read_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_notifications_public_id` (`public_id`),
  UNIQUE KEY `uk_user_notifications_dedupe` (`user_id`, `dedupe_key`),
  KEY `idx_user_notifications_user_read` (`user_id`, `read_at`, `created_at`),
  KEY `idx_user_notifications_user_created` (`user_id`, `created_at`),
  KEY `idx_user_notifications_consultancy` (`consultancy_id`),
  CONSTRAINT `fk_user_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_user_notifications_consultancy` FOREIGN KEY (`consultancy_id`) REFERENCES `consultancies` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `web_push_subscriptions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `public_id` VARCHAR(32) NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `endpoint` VARCHAR(2048) NOT NULL,
  `endpoint_fingerprint` VARCHAR(64) NOT NULL,
  `p256dh` VARCHAR(255) NOT NULL,
  `auth` VARCHAR(255) NOT NULL,
  `expiration_time` BIGINT NULL,
  `user_agent` VARCHAR(512) NULL,
  `revoked_at` DATETIME NULL,
  `revocation_reason` VARCHAR(80) NULL,
  `last_seen_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_push_subs_public_id` (`public_id`),
  UNIQUE KEY `uk_push_subs_fingerprint` (`endpoint_fingerprint`),
  KEY `idx_push_subs_user_active` (`user_id`, `revoked_at`),
  CONSTRAINT `fk_push_subs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notification_delivery_attempts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `public_id` VARCHAR(32) NOT NULL,
  `notification_id` BIGINT UNSIGNED NOT NULL,
  `channel` VARCHAR(20) NOT NULL,
  `subscription_id` BIGINT UNSIGNED NULL,
  `target_fingerprint` VARCHAR(64) NOT NULL,
  `status` VARCHAR(20) NOT NULL,
  `status_code` INT NULL,
  `error_message` VARCHAR(255) NULL,
  `attempted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_delivery_public_id` (`public_id`),
  UNIQUE KEY `uk_delivery_dedupe` (`notification_id`, `channel`, `target_fingerprint`),
  KEY `idx_delivery_notification_channel` (`notification_id`, `channel`),
  KEY `idx_delivery_subscription` (`subscription_id`),
  CONSTRAINT `fk_delivery_notification` FOREIGN KEY (`notification_id`) REFERENCES `user_notifications` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_delivery_subscription` FOREIGN KEY (`subscription_id`) REFERENCES `web_push_subscriptions` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
