-- Migration 069: Trevo Chat Consultation Evolution
-- Evolução completa do Trevo Chat como espaço principal de consultas assíncronas.
-- Suporte a:
-- 1. Expectativa de resposta configurável (expected_response_hours).
-- 2. Encerramento formal com resumo compartilhado e notas privadas do profissional (closed_at, closed_by_user_id, closure_summary_json, private_notes).
-- 3. Solicitação de retorno vinculada (linked_previous_consultation_id).
-- 4. Idempotência de mensagens (client_message_id).
-- 5. Respostas / Citações vinculadas a mensagem anterior (reply_to_message_id).
-- 6. Conteúdos e solicitações estruturadas no chat (payload_json).

ALTER TABLE `chat_consultations`
  ADD COLUMN `expected_response_hours` INT UNSIGNED NULL DEFAULT 24 AFTER `canceled_at`,
  ADD COLUMN `closed_at` DATETIME(3) NULL DEFAULT NULL AFTER `expected_response_hours`,
  ADD COLUMN `closed_by_user_id` BIGINT UNSIGNED NULL DEFAULT NULL AFTER `closed_at`,
  ADD COLUMN `closure_summary_json` JSON NULL DEFAULT NULL AFTER `closed_by_user_id`,
  ADD COLUMN `private_notes` TEXT NULL DEFAULT NULL AFTER `closure_summary_json`,
  ADD COLUMN `linked_previous_consultation_id` BIGINT UNSIGNED NULL DEFAULT NULL AFTER `private_notes`,
  ADD KEY `idx_chat_consultations_closed` (`consultancy_id`, `closed_at`),
  ADD KEY `idx_chat_consultations_linked` (`linked_previous_consultation_id`);

ALTER TABLE `chat_messages`
  ADD COLUMN `client_message_id` VARCHAR(64) NULL DEFAULT NULL AFTER `public_id`,
  ADD COLUMN `reply_to_message_id` BIGINT UNSIGNED NULL DEFAULT NULL AFTER `consultation_id`,
  ADD COLUMN `payload_json` JSON NULL DEFAULT NULL AFTER `content`,
  ADD KEY `idx_chat_messages_client_id` (`client_message_id`),
  ADD KEY `idx_chat_messages_reply_to` (`reply_to_message_id`);
