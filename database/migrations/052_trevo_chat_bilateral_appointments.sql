-- Migration 052: Bilateral Acceptance and Reference Scheduling for Trevo Chat
-- DECISÕES DEFINITIVAS:
-- 1. Trevo Chat exige agendamento e aceite de ambos os participantes (aluno e profissional).
-- 2. Horário é apenas uma referência na agenda (sem corte, presença simultânea ou janela obrigatória).
-- 3. Mensagens liberadas imediatamente após confirmação bilateral; cada um responde quando puder.
-- 4. Anamnese IA exclusivamente sob demanda do profissional.

ALTER TABLE `chat_consultations`
  ADD COLUMN `proposed_by_user_id` BIGINT UNSIGNED NULL DEFAULT NULL AFTER `confirmed_form_request_id`,
  ADD COLUMN `proposed_start_at` DATETIME(3) NULL DEFAULT NULL AFTER `proposed_by_user_id`,
  ADD COLUMN `student_accepted_at` DATETIME(3) NULL DEFAULT NULL AFTER `proposed_start_at`,
  ADD COLUMN `professional_accepted_at` DATETIME(3) NULL DEFAULT NULL AFTER `student_accepted_at`,
  ADD COLUMN `declined_reason` VARCHAR(255) NULL DEFAULT NULL AFTER `professional_accepted_at`,
  ADD COLUMN `declined_at` DATETIME(3) NULL DEFAULT NULL AFTER `declined_reason`,
  ADD COLUMN `canceled_at` DATETIME(3) NULL DEFAULT NULL AFTER `declined_at`,
  ADD KEY `idx_chat_consultations_proposed` (`consultancy_id`, `proposed_start_at`),
  ADD KEY `idx_chat_consultations_proposed_by` (`proposed_by_user_id`);
