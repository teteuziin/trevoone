-- Migration 019: Student Intake Submissions
-- Native versioned intake form submissions for Trevo One student onboarding

CREATE TABLE `student_intake_submissions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `public_id` char(36) NOT NULL,
  `consultancy_id` bigint(20) unsigned NOT NULL,
  `membership_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `onboarding_requirement_id` bigint(20) unsigned NOT NULL,
  `form_key` varchar(64) NOT NULL,
  `form_version` varchar(32) NOT NULL DEFAULT '1.0',
  `status` varchar(20) NOT NULL DEFAULT 'DRAFT',
  `responses_json` json NOT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `submitted_at` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT current_timestamp(3),
  `updated_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_student_intake_public_id` (`public_id`),
  UNIQUE KEY `uq_student_intake_membership_req_form_version` (`membership_id`, `onboarding_requirement_id`, `form_key`, `form_version`),
  KEY `idx_student_intake_tenant_member` (`consultancy_id`, `membership_id`),
  KEY `idx_student_intake_user` (`user_id`),
  KEY `idx_student_intake_status` (`status`),
  CONSTRAINT `fk_sis_consultancy` FOREIGN KEY (`consultancy_id`) REFERENCES `consultancies` (`id`),
  CONSTRAINT `fk_sis_membership` FOREIGN KEY (`membership_id`) REFERENCES `consultancy_members` (`id`),
  CONSTRAINT `fk_sis_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_sis_requirement` FOREIGN KEY (`onboarding_requirement_id`) REFERENCES `consultancy_onboarding_requirements` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
