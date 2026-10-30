-- Migration 071: Trevo Chat Welcome Introduction Tracking
-- Registra a conclusão ou dispensa da apresentação de introdução do Trevo Chat por usuário, consultoria e perfil (STUDENT vs PROFESSIONAL).
-- Evita exibições repetidas automáticas em múltiplos dispositivos, preservando histórico e suporte a reabertura manual sob demanda.

CREATE TABLE IF NOT EXISTS `trevo_chat_intro_views` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `consultancy_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `audience_role` VARCHAR(32) NOT NULL, -- 'STUDENT' ou 'PROFESSIONAL'
  `status` VARCHAR(20) NOT NULL, -- 'COMPLETED' ou 'DISMISSED'
  `completed_at` DATETIME(3) NULL DEFAULT NULL,
  `dismissed_at` DATETIME(3) NULL DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_intro_role` (`consultancy_id`, `user_id`, `audience_role`),
  KEY `idx_intro_lookup` (`consultancy_id`, `user_id`, `audience_role`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
