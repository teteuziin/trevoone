-- Migration 070: Trevo Chat & Consultation User Visibility (Excluir da minha lista)
-- Permite que alunos, profissionais, VIPs e influenciadores excluam conversas e consultas da própria lista.
-- A exclusão é estritamente pessoal (por participante/usuário) e não afeta a visibilidade nem os dados do outro participante.
-- O histórico integral permanece preservado para auditoria e consultas futuras.
-- Suporta restauração manual via "Conversas removidas" e restauração automática ao receber nova mensagem.

CREATE TABLE IF NOT EXISTS `consultation_user_visibility` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `consultancy_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `membership_id` BIGINT UNSIGNED NOT NULL,
  `target_type` VARCHAR(32) NOT NULL,
  `target_public_id` VARCHAR(64) NOT NULL,
  `hidden_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `restored_at` DATETIME(3) NULL DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_target_vis` (`consultancy_id`, `user_id`, `target_type`, `target_public_id`),
  KEY `idx_vis_user` (`consultancy_id`, `user_id`, `target_type`, `restored_at`),
  KEY `idx_vis_target` (`consultancy_id`, `target_type`, `target_public_id`),
  KEY `idx_vis_membership` (`consultancy_id`, `membership_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
