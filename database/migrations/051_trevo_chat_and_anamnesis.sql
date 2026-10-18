-- Migration 051: Trevo Chat and Asynchronous Consultations with AI Anamnesis
-- Dedicated async messaging foundation between Professional and Student
-- with voice recordings, media attachments, unread counters, in-app notifications,
-- and traceable AI structured anamnesis extraction.

CREATE TABLE IF NOT EXISTS `chat_consultations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `public_id` CHAR(36) NOT NULL,
  `consultancy_id` BIGINT UNSIGNED NOT NULL,
  `student_membership_id` BIGINT UNSIGNED NOT NULL,
  `professional_membership_id` BIGINT UNSIGNED NOT NULL,
  `professional_type` VARCHAR(32) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'AWAITING_STUDENT',
  `last_message_at` DATETIME(3) NULL DEFAULT NULL,
  `last_message_preview` VARCHAR(255) NULL DEFAULT NULL,
  `unread_count_student` INT UNSIGNED NOT NULL DEFAULT 0,
  `unread_count_professional` INT UNSIGNED NOT NULL DEFAULT 0,
  `ai_anamnesis_json` JSON NULL DEFAULT NULL,
  `ai_anamnesis_status` VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  `confirmed_form_request_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `created_by_user_id` BIGINT UNSIGNED NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_chat_consultations_public_id` (`public_id`),
  KEY `idx_chat_consultations_tenant_student` (`consultancy_id`, `student_membership_id`, `status`),
  KEY `idx_chat_consultations_tenant_prof` (`consultancy_id`, `professional_membership_id`, `status`),
  KEY `idx_chat_consultations_last_msg` (`consultancy_id`, `last_message_at`),

  CONSTRAINT `fk_chat_consultations_consultancy` FOREIGN KEY (`consultancy_id`) REFERENCES `consultancies` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_chat_consultations_student` FOREIGN KEY (`student_membership_id`) REFERENCES `consultancy_members` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_chat_consultations_professional` FOREIGN KEY (`professional_membership_id`) REFERENCES `consultancy_members` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_chat_consultations_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_chat_consultations_form_request` FOREIGN KEY (`confirmed_form_request_id`) REFERENCES `consultancy_custom_form_requests` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `public_id` CHAR(36) NOT NULL,
  `consultation_id` BIGINT UNSIGNED NOT NULL,
  `sender_user_id` BIGINT UNSIGNED NOT NULL,
  `sender_role` VARCHAR(32) NOT NULL,
  `content` TEXT NULL DEFAULT NULL,
  `message_type` VARCHAR(32) NOT NULL DEFAULT 'TEXT',
  `attachment_url` VARCHAR(1024) NULL DEFAULT NULL,
  `attachment_name` VARCHAR(255) NULL DEFAULT NULL,
  `attachment_size_bytes` BIGINT UNSIGNED NULL DEFAULT NULL,
  `attachment_mime_type` VARCHAR(128) NULL DEFAULT NULL,
  `audio_duration_seconds` INT UNSIGNED NULL DEFAULT NULL,
  `read_at` DATETIME(3) NULL DEFAULT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_chat_messages_public_id` (`public_id`),
  KEY `idx_chat_messages_consultation_created` (`consultation_id`, `created_at`),
  KEY `idx_chat_messages_sender` (`sender_user_id`, `created_at`),

  CONSTRAINT `fk_chat_messages_consultation` FOREIGN KEY (`consultation_id`) REFERENCES `chat_consultations` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_chat_messages_sender` FOREIGN KEY (`sender_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
