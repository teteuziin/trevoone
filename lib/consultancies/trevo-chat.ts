import crypto from "node:crypto";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { getDbPool } from "../db/mysql";
import {
  createNotificationInTransaction,
  deliverNotificationAfterCommit,
} from "@/services/notification-service";
import {
  extractAnamnesisFromChat,
  type ExtractedAnamnesisProposal,
} from "../ai/chat-anamnesis-extractor";

export type ChatConsultationStatus =
  | "PROPOSED"
  | "CONFIRMED"
  | "COMPLETED"
  | "DECLINED"
  | "CANCELED"
  | "AWAITING_STUDENT"
  | "AWAITING_PROFESSIONAL";

export function isChatMessagingUnlocked(status: ChatConsultationStatus): boolean {
  return (
    status === "CONFIRMED" ||
    status === "AWAITING_STUDENT" ||
    status === "AWAITING_PROFESSIONAL"
  );
}

export type ChatMessageType =
  | "TEXT"
  | "IMAGE"
  | "AUDIO"
  | "VIDEO"
  | "DOCUMENT";

export interface ChatConsultationDto {
  id: number;
  publicId: string;
  consultancyId: number;
  studentMembershipId: number;
  studentUserId: number;
  studentName: string;
  studentEmail: string;
  professionalMembershipId: number;
  professionalUserId: number;
  professionalName: string;
  professionalType: "PERSONAL" | "NUTRITIONIST";
  title: string;
  status: ChatConsultationStatus;
  proposedByUserId: number | null;
  proposedStartAt: string | null;
  proposedStartFormatted?: string | null;
  studentAcceptedAt: string | null;
  professionalAcceptedAt: string | null;
  declinedReason: string | null;
  declinedAt: string | null;
  canceledAt: string | null;
  topic?: string | null;
  isMutualConfirmed: boolean;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCountStudent: number;
  unreadCountProfessional: number;
  aiAnamnesisJson: ExtractedAnamnesisProposal | null;
  aiAnamnesisStatus: "PENDING" | "EXTRACTED" | "CONFIRMED";
  confirmedFormRequestId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageDto {
  id: number;
  publicId: string;
  consultationId: number;
  consultationPublicId: string;
  senderUserId: number;
  senderRole: string;
  senderName: string;
  content: string | null;
  messageType: ChatMessageType;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentSizeBytes: number | null;
  attachmentMimeType: string | null;
  audioDurationSeconds: number | null;
  readAt: string | null;
  createdAt: string;
}

let _chatSchemaChecked = false;

export async function ensureChatTablesExist(): Promise<void> {
  if (_chatSchemaChecked) return;
  const pool = getDbPool();
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`chat_consultations\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`public_id\` CHAR(36) NOT NULL,
        \`consultancy_id\` BIGINT UNSIGNED NOT NULL,
        \`student_membership_id\` BIGINT UNSIGNED NOT NULL,
        \`professional_membership_id\` BIGINT UNSIGNED NOT NULL,
        \`professional_type\` VARCHAR(32) NOT NULL,
        \`title\` VARCHAR(200) NOT NULL,
        \`status\` VARCHAR(32) NOT NULL DEFAULT 'PROPOSED',
        \`proposed_by_user_id\` BIGINT UNSIGNED NULL DEFAULT NULL,
        \`proposed_start_at\` DATETIME(3) NULL DEFAULT NULL,
        \`student_accepted_at\` DATETIME(3) NULL DEFAULT NULL,
        \`professional_accepted_at\` DATETIME(3) NULL DEFAULT NULL,
        \`declined_reason\` VARCHAR(255) NULL DEFAULT NULL,
        \`declined_at\` DATETIME(3) NULL DEFAULT NULL,
        \`canceled_at\` DATETIME(3) NULL DEFAULT NULL,
        \`last_message_at\` DATETIME(3) NULL DEFAULT NULL,
        \`last_message_preview\` VARCHAR(255) NULL DEFAULT NULL,
        \`unread_count_student\` INT UNSIGNED NOT NULL DEFAULT 0,
        \`unread_count_professional\` INT UNSIGNED NOT NULL DEFAULT 0,
        \`ai_anamnesis_json\` JSON NULL DEFAULT NULL,
        \`ai_anamnesis_status\` VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        \`confirmed_form_request_id\` BIGINT UNSIGNED NULL DEFAULT NULL,
        \`created_by_user_id\` BIGINT UNSIGNED NOT NULL,
        \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_chat_consultations_public_id\` (\`public_id\`),
        KEY \`idx_chat_consultations_tenant_student\` (\`consultancy_id\`, \`student_membership_id\`, \`status\`),
        KEY \`idx_chat_consultations_tenant_prof\` (\`consultancy_id\`, \`professional_membership_id\`, \`status\`),
        KEY \`idx_chat_consultations_last_msg\` (\`consultancy_id\`, \`last_message_at\`),
        KEY \`idx_chat_consultations_proposed\` (\`consultancy_id\`, \`proposed_start_at\`),
        KEY \`idx_chat_consultations_proposed_by\` (\`proposed_by_user_id\`),

        CONSTRAINT \`fk_chat_consultations_consultancy\` FOREIGN KEY (\`consultancy_id\`) REFERENCES \`consultancies\` (\`id\`) ON DELETE RESTRICT ON UPDATE RESTRICT,
        CONSTRAINT \`fk_chat_consultations_student\` FOREIGN KEY (\`student_membership_id\`) REFERENCES \`consultancy_members\` (\`id\`) ON DELETE RESTRICT ON UPDATE RESTRICT,
        CONSTRAINT \`fk_chat_consultations_professional\` FOREIGN KEY (\`professional_membership_id\`) REFERENCES \`consultancy_members\` (\`id\`) ON DELETE RESTRICT ON UPDATE RESTRICT,
        CONSTRAINT \`fk_chat_consultations_created_by\` FOREIGN KEY (\`created_by_user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT ON UPDATE RESTRICT,
        CONSTRAINT \`fk_chat_consultations_form_request\` FOREIGN KEY (\`confirmed_form_request_id\`) REFERENCES \`consultancy_custom_form_requests\` (\`id\`) ON DELETE SET NULL ON UPDATE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Check if migration 052 columns exist in case the table already existed
    try {
      const [cols] = await pool.query<RowDataPacket[]>(
        `SHOW COLUMNS FROM chat_consultations LIKE 'proposed_start_at'`
      );
      if (cols.length === 0) {
        await pool.query(`
          ALTER TABLE chat_consultations
            ADD COLUMN proposed_by_user_id BIGINT UNSIGNED NULL DEFAULT NULL AFTER confirmed_form_request_id,
            ADD COLUMN proposed_start_at DATETIME(3) NULL DEFAULT NULL AFTER proposed_by_user_id,
            ADD COLUMN student_accepted_at DATETIME(3) NULL DEFAULT NULL AFTER proposed_start_at,
            ADD COLUMN professional_accepted_at DATETIME(3) NULL DEFAULT NULL AFTER student_accepted_at,
            ADD COLUMN declined_reason VARCHAR(255) NULL DEFAULT NULL AFTER professional_accepted_at,
            ADD COLUMN declined_at DATETIME(3) NULL DEFAULT NULL AFTER declined_reason,
            ADD COLUMN canceled_at DATETIME(3) NULL DEFAULT NULL AFTER declined_at,
            ADD KEY idx_chat_consultations_proposed (consultancy_id, proposed_start_at),
            ADD KEY idx_chat_consultations_proposed_by (proposed_by_user_id);
        `);
      }
    } catch {}

    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`chat_messages\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`public_id\` CHAR(36) NOT NULL,
        \`consultation_id\` BIGINT UNSIGNED NOT NULL,
        \`sender_user_id\` BIGINT UNSIGNED NOT NULL,
        \`sender_role\` VARCHAR(32) NOT NULL,
        \`content\` TEXT NULL DEFAULT NULL,
        \`message_type\` VARCHAR(32) NOT NULL DEFAULT 'TEXT',
        \`attachment_url\` VARCHAR(1024) NULL DEFAULT NULL,
        \`attachment_name\` VARCHAR(255) NULL DEFAULT NULL,
        \`attachment_size_bytes\` BIGINT UNSIGNED NULL DEFAULT NULL,
        \`attachment_mime_type\` VARCHAR(128) NULL DEFAULT NULL,
        \`audio_duration_seconds\` INT UNSIGNED NULL DEFAULT NULL,
        \`read_at\` DATETIME(3) NULL DEFAULT NULL,
        \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_chat_messages_public_id\` (\`public_id\`),
        KEY \`idx_chat_messages_consultation_created\` (\`consultation_id\`, \`created_at\`),
        KEY \`idx_chat_messages_sender\` (\`sender_user_id\`, \`created_at\`),

        CONSTRAINT \`fk_chat_messages_consultation\` FOREIGN KEY (\`consultation_id\`) REFERENCES \`chat_consultations\` (\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT,
        CONSTRAINT \`fk_chat_messages_sender\` FOREIGN KEY (\`sender_user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT ON UPDATE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    try {
      await pool.query(
        `INSERT IGNORE INTO schema_migrations (migration, checksum) VALUES 
          ('051_trevo_chat_and_anamnesis.sql', 'runtime_bootstrapped'),
          ('052_trevo_chat_bilateral_appointments.sql', 'runtime_bootstrapped');`
      );
    } catch {}

    _chatSchemaChecked = true;
  } catch (schemaErr) {
    console.warn("[Trevo Chat] ensureChatTablesExist warning:", schemaErr);
  }
}

async function executeWithAutoSchema<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err: unknown) {
    const isMissingTable =
      err &&
      typeof err === "object" &&
      (("code" in err && (err as { code: string }).code === "ER_NO_SUCH_TABLE") ||
        ("message" in err && String((err as { message: string }).message).includes("doesn't exist")));

    if (isMissingTable) {
      await ensureChatTablesExist();
      return await fn();
    }
    throw err;
  }
}

/**
 * Lists all active chat consultations for a professional in a consultancy.
 */
export async function listChatConsultationsForProfessional(
  consultancyId: number,
  professionalMembershipId: number
): Promise<ChatConsultationDto[]> {
  return executeWithAutoSchema(async () => {
    const pool = getDbPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT 
      cc.id,
      cc.public_id,
      cc.consultancy_id,
      cc.student_membership_id,
      u_stud.id AS student_user_id,
      u_stud.full_name AS student_name,
      u_stud.email AS student_email,
      cc.professional_membership_id,
      u_prof.id AS professional_user_id,
      u_prof.full_name AS professional_name,
      cc.professional_type,
      cc.title,
      cc.status,
      cc.proposed_by_user_id,
      cc.proposed_start_at,
      cc.student_accepted_at,
      cc.professional_accepted_at,
      cc.declined_reason,
      cc.declined_at,
      cc.canceled_at,
      cc.last_message_at,
      cc.last_message_preview,
      cc.unread_count_student,
      cc.unread_count_professional,
      cc.ai_anamnesis_json,
      cc.ai_anamnesis_status,
      cc.confirmed_form_request_id,
      cc.created_at,
      cc.updated_at
    FROM chat_consultations cc
    INNER JOIN consultancy_members cm_stud ON cm_stud.id = cc.student_membership_id
    INNER JOIN users u_stud ON u_stud.id = cm_stud.user_id
    INNER JOIN consultancy_members cm_prof ON cm_prof.id = cc.professional_membership_id
    INNER JOIN users u_prof ON u_prof.id = cm_prof.user_id
    WHERE cc.consultancy_id = ? AND cc.professional_membership_id = ?
    ORDER BY COALESCE(cc.last_message_at, cc.created_at) DESC;`,
    [consultancyId, professionalMembershipId]
  );

    return (rows as RowDataPacket[]).map(mapRowToConsultationDto);
  });
}

/**
 * Lists all active chat consultations for a student in a consultancy.
 */
export async function listChatConsultationsForStudent(
  consultancyId: number,
  studentMembershipId: number
): Promise<ChatConsultationDto[]> {
  return executeWithAutoSchema(async () => {
    const pool = getDbPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT 
      cc.id,
      cc.public_id,
      cc.consultancy_id,
      cc.student_membership_id,
      u_stud.id AS student_user_id,
      u_stud.full_name AS student_name,
      u_stud.email AS student_email,
      cc.professional_membership_id,
      u_prof.id AS professional_user_id,
      u_prof.full_name AS professional_name,
      cc.professional_type,
      cc.title,
      cc.status,
      cc.proposed_by_user_id,
      cc.proposed_start_at,
      cc.student_accepted_at,
      cc.professional_accepted_at,
      cc.declined_reason,
      cc.declined_at,
      cc.canceled_at,
      cc.last_message_at,
      cc.last_message_preview,
      cc.unread_count_student,
      cc.unread_count_professional,
      cc.ai_anamnesis_json,
      cc.ai_anamnesis_status,
      cc.confirmed_form_request_id,
      cc.created_at,
      cc.updated_at
    FROM chat_consultations cc
    INNER JOIN consultancy_members cm_stud ON cm_stud.id = cc.student_membership_id
    INNER JOIN users u_stud ON u_stud.id = cm_stud.user_id
    INNER JOIN consultancy_members cm_prof ON cm_prof.id = cc.professional_membership_id
    INNER JOIN users u_prof ON u_prof.id = cm_prof.user_id
    WHERE cc.consultancy_id = ? AND cc.student_membership_id = ?
    ORDER BY COALESCE(cc.last_message_at, cc.created_at) DESC;`,
    [consultancyId, studentMembershipId]
  );

    return (rows as RowDataPacket[]).map(mapRowToConsultationDto);
  });
}

/**
 * Gets a chat consultation by publicId with full tenant isolation.
 */
export async function getChatConsultationByPublicId(
  consultancyId: number,
  chatPublicId: string
): Promise<ChatConsultationDto | null> {
  return executeWithAutoSchema(async () => {
    const pool = getDbPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        cc.id,
        cc.public_id,
        cc.consultancy_id,
        cc.student_membership_id,
        u_stud.id AS student_user_id,
        u_stud.full_name AS student_name,
        u_stud.email AS student_email,
        cc.professional_membership_id,
        u_prof.id AS professional_user_id,
        u_prof.full_name AS professional_name,
        cc.professional_type,
        cc.title,
        cc.status,
        cc.proposed_by_user_id,
        cc.proposed_start_at,
        cc.student_accepted_at,
        cc.professional_accepted_at,
        cc.declined_reason,
        cc.declined_at,
        cc.canceled_at,
        cc.last_message_at,
        cc.last_message_preview,
        cc.unread_count_student,
        cc.unread_count_professional,
        cc.ai_anamnesis_json,
        cc.ai_anamnesis_status,
        cc.confirmed_form_request_id,
        cc.created_at,
        cc.updated_at
      FROM chat_consultations cc
      INNER JOIN consultancy_members cm_stud ON cm_stud.id = cc.student_membership_id
      INNER JOIN users u_stud ON u_stud.id = cm_stud.user_id
      INNER JOIN consultancy_members cm_prof ON cm_prof.id = cc.professional_membership_id
      INNER JOIN users u_prof ON u_prof.id = cm_prof.user_id
      WHERE cc.consultancy_id = ? AND cc.public_id = ?
      LIMIT 1;`,
      [consultancyId, chatPublicId]
    );

    if (!rows || rows.length === 0) return null;
    return mapRowToConsultationDto(rows[0]);
  });
}

/**
 * Finds or creates a chat consultation between a student and a professional.
 */
export async function getOrCreateChatConsultation(params: {
  consultancyId: number;
  studentMembershipId: number;
  professionalMembershipId: number;
  professionalType: "PERSONAL" | "NUTRITIONIST";
  title?: string;
  createdByUserId: number;
}): Promise<ChatConsultationDto> {
  return executeWithAutoSchema(async () => {
    const pool = getDbPool();

    // Try to find existing
    const [existing] = await pool.execute<RowDataPacket[]>(
      `SELECT public_id FROM chat_consultations
       WHERE consultancy_id = ? AND student_membership_id = ? AND professional_membership_id = ?
       LIMIT 1;`,
      [params.consultancyId, params.studentMembershipId, params.professionalMembershipId]
    );

    if (existing && existing.length > 0) {
      const chat = await getChatConsultationByPublicId(params.consultancyId, existing[0].public_id);
      if (chat) return chat;
    }

    const newPublicId = crypto.randomUUID();
    const title = params.title || `Consulta ${params.professionalType === "PERSONAL" ? "Treino" : "Nutrição"}`;

    await pool.execute<ResultSetHeader>(
      `INSERT INTO chat_consultations (
        public_id,
        consultancy_id,
        student_membership_id,
        professional_membership_id,
        professional_type,
        title,
        status,
        created_by_user_id,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'AWAITING_STUDENT', ?, NOW(3), NOW(3));`,
      [
        newPublicId,
        params.consultancyId,
        params.studentMembershipId,
        params.professionalMembershipId,
        params.professionalType,
        title,
        params.createdByUserId,
      ]
    );

    const created = await getChatConsultationByPublicId(params.consultancyId, newPublicId);
    if (!created) {
      throw new Error("Falha ao inicializar o Trevo Chat.");
    }
    return created;
  });
}

/**
 * Proposes a bilateral chat consultation with a reference start date/time.
 * Starts in 'PROPOSED' state with automatic acceptance by proposer.
 */
export async function proposeChatConsultation(params: {
  consultancyId: number;
  studentMembershipId: number;
  professionalMembershipId: number;
  professionalType: "PERSONAL" | "NUTRITIONIST";
  proposedByUserId: number;
  proposedStartAt: Date;
  title?: string;
  consultancySlug: string;
}): Promise<ChatConsultationDto> {
  return executeWithAutoSchema(async () => {
    const pool = getDbPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Check participants exist
      const [members] = await connection.execute<RowDataPacket[]>(
        `SELECT id, user_id FROM consultancy_members
         WHERE consultancy_id = ? AND id IN (?, ?)`,
        [params.consultancyId, params.studentMembershipId, params.professionalMembershipId]
      );

      const studentMember = members.find((m) => Number(m.id) === Number(params.studentMembershipId));
      const profMember = members.find((m) => Number(m.id) === Number(params.professionalMembershipId));

      if (!studentMember || !profMember) {
        throw new Error("Participantes não encontrados na consultoria.");
      }

      const isProposedByStudent = Number(params.proposedByUserId) === Number(studentMember.user_id);
      const studentAcceptedAt = isProposedByStudent ? new Date() : null;
      const professionalAcceptedAt = !isProposedByStudent ? new Date() : null;
      const recipientUserId = isProposedByStudent ? Number(profMember.user_id) : Number(studentMember.user_id);

      const newPublicId = crypto.randomUUID();
      const title = params.title || `Consulta ${params.professionalType === "PERSONAL" ? "Treino" : "Nutrição"}`;

      await connection.execute<ResultSetHeader>(
        `INSERT INTO chat_consultations (
          public_id,
          consultancy_id,
          student_membership_id,
          professional_membership_id,
          professional_type,
          title,
          status,
          proposed_by_user_id,
          proposed_start_at,
          student_accepted_at,
          professional_accepted_at,
          created_by_user_id,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'PROPOSED', ?, ?, ?, ?, ?, NOW(3), NOW(3));`,
        [
          newPublicId,
          params.consultancyId,
          params.studentMembershipId,
          params.professionalMembershipId,
          params.professionalType,
          title,
          params.proposedByUserId,
          params.proposedStartAt,
          studentAcceptedAt,
          professionalAcceptedAt,
          params.proposedByUserId,
        ]
      );

      let notif = null;
      try {
        notif = await createNotificationInTransaction(connection, {
          userId: recipientUserId,
          consultancyId: params.consultancyId,
          priority: "HIGH",
          eventType: "CHAT_MESSAGE",
          title: "Nova proposta no Trevo Chat",
          body: "Você recebeu uma proposta de agendamento no Trevo Chat. Aceite para liberar o chat assíncrono.",
          deepLink: `/consultoria/${params.consultancySlug}/consultas?tab=chat&c=${newPublicId}`,
          dedupeKey: `chat_prop_${newPublicId}`,
          sourceType: "CHAT_MESSAGE",
          sourcePublicId: newPublicId,
        });
      } catch (err) {
        console.warn("[Trevo Chat] Aviso ao criar notificação de proposta:", err);
      }

      await connection.commit();

      if (notif) {
        deliverNotificationAfterCommit(notif.id).catch(() => {});
      }

      const created = await getChatConsultationByPublicId(params.consultancyId, newPublicId);
      if (!created) throw new Error("Erro ao carregar proposta criada.");
      return created;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  });
}

/**
 * Responds to a bilateral chat consultation proposal (ACCEPT, COUNTER, DECLINE).
 */
export async function respondToChatProposal(params: {
  consultancyId: number;
  consultationPublicId: string;
  responderUserId: number;
  response: "ACCEPT" | "COUNTER" | "DECLINE";
  counterProposedStartAt?: Date;
  declineReason?: string;
  consultancySlug: string;
}): Promise<{ ok: boolean; error?: string }> {
  return executeWithAutoSchema(async () => {
    const pool = getDbPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [cRows] = await connection.execute<RowDataPacket[]>(
        `SELECT cc.id, cc.public_id, cc.status, cc.student_membership_id, cc.professional_membership_id,
                cc.proposed_by_user_id, cm_stud.user_id AS student_user_id, cm_prof.user_id AS professional_user_id,
                u_responder.full_name AS responder_name
         FROM chat_consultations cc
         INNER JOIN consultancy_members cm_stud ON cm_stud.id = cc.student_membership_id
         INNER JOIN consultancy_members cm_prof ON cm_prof.id = cc.professional_membership_id
         INNER JOIN users u_responder ON u_responder.id = ?
         WHERE cc.consultancy_id = ? AND cc.public_id = ?
         LIMIT 1 FOR UPDATE;`,
        [params.responderUserId, params.consultancyId, params.consultationPublicId]
      );

      if (!cRows || cRows.length === 0) {
        throw new Error("Atendimento não encontrado.");
      }

      const c = cRows[0];
      const isStudent = Number(params.responderUserId) === Number(c.student_user_id);
      const isProf = Number(params.responderUserId) === Number(c.professional_user_id);

      if (!isStudent && !isProf) {
        throw new Error("Apenas os participantes da conversa podem responder à proposta.");
      }

      const otherUserId = isStudent ? Number(c.professional_user_id) : Number(c.student_user_id);
      const responderName = c.responder_name || "O outro participante";

      if (params.response === "ACCEPT") {
        if (isStudent) {
          await connection.execute(
            `UPDATE chat_consultations
             SET student_accepted_at = NOW(3),
                 status = 'CONFIRMED',
                 updated_at = NOW(3)
             WHERE id = ?;`,
            [c.id]
          );
        } else {
          await connection.execute(
            `UPDATE chat_consultations
             SET professional_accepted_at = NOW(3),
                 status = 'CONFIRMED',
                 updated_at = NOW(3)
             WHERE id = ?;`,
            [c.id]
          );
        }

        try {
          const notif = await createNotificationInTransaction(connection, {
            userId: otherUserId,
            consultancyId: params.consultancyId,
            priority: "HIGH",
            eventType: "CHAT_MESSAGE",
            title: "Trevo Chat Confirmado",
            body: `${responderName} aceitou a proposta. O chat está liberado para vocês responderem quando puderem!`,
            deepLink: `/consultoria/${params.consultancySlug}/consultas?tab=chat&c=${params.consultationPublicId}`,
            dedupeKey: `chat_acc_${c.id}_${Date.now()}`,
            sourceType: "CHAT_MESSAGE",
            sourcePublicId: params.consultationPublicId,
          });
          deliverNotificationAfterCommit(notif.id).catch(() => {});
        } catch {}
      } else if (params.response === "COUNTER") {
        if (!params.counterProposedStartAt) {
          throw new Error("Novo horário de referência é obrigatório.");
        }

        const studentAcceptedAt = isStudent ? new Date() : null;
        const professionalAcceptedAt = isProf ? new Date() : null;

        await connection.execute(
          `UPDATE chat_consultations
           SET proposed_by_user_id = ?,
               proposed_start_at = ?,
               student_accepted_at = ?,
               professional_accepted_at = ?,
               status = 'PROPOSED',
               updated_at = NOW(3)
           WHERE id = ?;`,
          [params.responderUserId, params.counterProposedStartAt, studentAcceptedAt, professionalAcceptedAt, c.id]
        );

        try {
          const notif = await createNotificationInTransaction(connection, {
            userId: otherUserId,
            consultancyId: params.consultancyId,
            priority: "NORMAL",
            eventType: "CHAT_MESSAGE",
            title: "Novo horário no Trevo Chat",
            body: `${responderName} sugeriu outro horário de referência para o atendimento.`,
            deepLink: `/consultoria/${params.consultancySlug}/consultas?tab=chat&c=${params.consultationPublicId}`,
            dedupeKey: `chat_counter_${c.id}_${Date.now()}`,
            sourceType: "CHAT_MESSAGE",
            sourcePublicId: params.consultationPublicId,
          });
          deliverNotificationAfterCommit(notif.id).catch(() => {});
        } catch {}
      } else if (params.response === "DECLINE") {
        await connection.execute(
          `UPDATE chat_consultations
           SET status = 'DECLINED',
               declined_reason = ?,
               declined_at = NOW(3),
               updated_at = NOW(3)
           WHERE id = ?;`,
          [params.declineReason || null, c.id]
        );

        try {
          const notif = await createNotificationInTransaction(connection, {
            userId: otherUserId,
            consultancyId: params.consultancyId,
            priority: "NORMAL",
            eventType: "CHAT_MESSAGE",
            title: "Atendimento no Trevo Chat recusado",
            body: `${responderName} não pôde aceitar a proposta de atendimento.`,
            deepLink: `/consultoria/${params.consultancySlug}/consultas?tab=chat`,
            dedupeKey: `chat_decl_${c.id}_${Date.now()}`,
            sourceType: "CHAT_MESSAGE",
            sourcePublicId: params.consultationPublicId,
          });
          deliverNotificationAfterCommit(notif.id).catch(() => {});
        } catch {}
      }

      await connection.commit();
      return { ok: true };
    } catch (err: unknown) {
      await connection.rollback();
      const msg = err instanceof Error ? err.message : "Erro ao responder à proposta.";
      return { ok: false, error: msg };
    } finally {
      connection.release();
    }
  });
}

/**
 * Cancels a chat consultation (either proposed or active).
 */
export async function cancelChatConsultation(params: {
  consultancyId: number;
  consultationPublicId: string;
  userId: number;
}): Promise<{ ok: boolean; error?: string }> {
  return executeWithAutoSchema(async () => {
    const pool = getDbPool();
    const [cRows] = await pool.execute<RowDataPacket[]>(
      `SELECT cc.id, cm_stud.user_id AS student_user_id, cm_prof.user_id AS professional_user_id
       FROM chat_consultations cc
       INNER JOIN consultancy_members cm_stud ON cm_stud.id = cc.student_membership_id
       INNER JOIN consultancy_members cm_prof ON cm_prof.id = cc.professional_membership_id
       WHERE cc.consultancy_id = ? AND cc.public_id = ?
       LIMIT 1;`,
      [params.consultancyId, params.consultationPublicId]
    );

    if (!cRows || cRows.length === 0) {
      throw new Error("Atendimento não encontrado.");
    }

    const c = cRows[0];
    const isStudent = Number(params.userId) === Number(c.student_user_id);
    const isProf = Number(params.userId) === Number(c.professional_user_id);
    if (!isStudent && !isProf) {
      throw new Error("Não autorizado.");
    }

    await pool.execute(
      `UPDATE chat_consultations
       SET status = 'CANCELED',
           canceled_at = NOW(3),
           updated_at = NOW(3)
       WHERE id = ?;`,
      [c.id]
    );

    return { ok: true };
  });
}

/**
 * Lists messages in a consultation ordered chronologically.
 */
export async function listChatMessages(
  consultationId: number,
  limit: number = 100
): Promise<ChatMessageDto[]> {
  return executeWithAutoSchema(async () => {
    const pool = getDbPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        cm.id,
        cm.public_id,
        cm.consultation_id,
        cc.public_id AS consultation_public_id,
        cm.sender_user_id,
        cm.sender_role,
        u.full_name AS sender_name,
        cm.content,
        cm.message_type,
        cm.attachment_url,
        cm.attachment_name,
        cm.attachment_size_bytes,
        cm.attachment_mime_type,
        cm.audio_duration_seconds,
        cm.read_at,
        cm.created_at
      FROM chat_messages cm
      INNER JOIN chat_consultations cc ON cc.id = cm.consultation_id
      INNER JOIN users u ON u.id = cm.sender_user_id
      WHERE cm.consultation_id = ?
      ORDER BY cm.created_at ASC
      LIMIT ?;`,
      [consultationId, limit]
    );

    return (rows as RowDataPacket[]).map(mapRowToMessageDto);
  });
}

/**
 * Sends a chat message, updates consultation previews/counters, and notifies recipient.
 */
export async function sendChatMessage(params: {
  consultancyId: number;
  consultationPublicId: string;
  senderUserId: number;
  senderRole: string;
  content?: string | null;
  messageType?: ChatMessageType;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentSizeBytes?: number | null;
  attachmentMimeType?: string | null;
  audioDurationSeconds?: number | null;
  consultancySlug: string;
}): Promise<ChatMessageDto> {
  await ensureChatTablesExist();
  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Fetch consultation
    const [cRows] = await connection.execute<RowDataPacket[]>(
      `SELECT 
        cc.id,
        cc.public_id,
        cc.consultancy_id,
        cc.status,
        cc.student_membership_id,
        cm_stud.user_id AS student_user_id,
        u_stud.full_name AS student_name,
        cc.professional_membership_id,
        cm_prof.user_id AS professional_user_id,
        u_prof.full_name AS professional_name
       FROM chat_consultations cc
       INNER JOIN consultancy_members cm_stud ON cm_stud.id = cc.student_membership_id
       INNER JOIN users u_stud ON u_stud.id = cm_stud.user_id
       INNER JOIN consultancy_members cm_prof ON cm_prof.id = cc.professional_membership_id
       INNER JOIN users u_prof ON u_prof.id = cm_prof.user_id
       WHERE cc.consultancy_id = ? AND cc.public_id = ?
       LIMIT 1 FOR UPDATE;`,
      [params.consultancyId, params.consultationPublicId]
    );

    if (!cRows || cRows.length === 0) {
      throw new Error("Consulta não encontrada.");
    }
    const consultation = cRows[0];

    // Validate that bilateral acceptance has occurred before messages can be sent
    if (!isChatMessagingUnlocked(consultation.status as ChatConsultationStatus)) {
      throw new Error(
        consultation.status === "PROPOSED"
          ? "O agendamento precisa ser aceito por ambos os participantes antes de iniciar o envio de mensagens."
          : "Este atendimento está encerrado ou cancelado."
      );
    }

    const messageType = params.messageType || "TEXT";
    const msgPublicId = crypto.randomUUID();

    // 2. Insert message
    const [msgRes] = await connection.execute<ResultSetHeader>(
      `INSERT INTO chat_messages (
        public_id,
        consultation_id,
        sender_user_id,
        sender_role,
        content,
        message_type,
        attachment_url,
        attachment_name,
        attachment_size_bytes,
        attachment_mime_type,
        audio_duration_seconds,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3));`,
      [
        msgPublicId,
        consultation.id,
        params.senderUserId,
        params.senderRole,
        params.content?.trim() || null,
        messageType,
        params.attachmentUrl || null,
        params.attachmentName || null,
        params.attachmentSizeBytes || null,
        params.attachmentMimeType || null,
        params.audioDurationSeconds || null,
      ]
    );
    const messageId = msgRes.insertId;

    // 3. Build preview string
    let preview = "";
    if (messageType === "TEXT") {
      preview = (params.content || "").slice(0, 100);
    } else if (messageType === "AUDIO") {
      const dur = params.audioDurationSeconds ? `${params.audioDurationSeconds}s` : "áudio";
      preview = `🎤 Mensagem de voz (${dur})`;
    } else if (messageType === "IMAGE") {
      preview = "📷 Foto";
    } else if (messageType === "VIDEO") {
      preview = "🎥 Vídeo";
    } else if (messageType === "DOCUMENT") {
      preview = `📄 Documento: ${params.attachmentName || "anexo"}`;
    }

    const isSenderStudent = Number(params.senderUserId) === Number(consultation.student_user_id);
    const recipientUserId = isSenderStudent ? consultation.professional_user_id : consultation.student_user_id;
    const currentStatus = consultation.status as ChatConsultationStatus;
    const newStatus = currentStatus === "CONFIRMED" ? "CONFIRMED" : isSenderStudent ? "AWAITING_PROFESSIONAL" : "AWAITING_STUDENT";

    // 4. Update consultation counters
    if (isSenderStudent) {
      await connection.execute(
        `UPDATE chat_consultations
         SET last_message_at = NOW(3),
             last_message_preview = ?,
             unread_count_professional = unread_count_professional + 1,
             status = ?,
             updated_at = NOW(3)
         WHERE id = ?;`,
        [preview, newStatus, consultation.id]
      );
    } else {
      await connection.execute(
        `UPDATE chat_consultations
         SET last_message_at = NOW(3),
             last_message_preview = ?,
             unread_count_student = unread_count_student + 1,
             status = ?,
             updated_at = NOW(3)
         WHERE id = ?;`,
        [preview, newStatus, consultation.id]
      );
    }

    // 5. In-app notification with strict privacy (LGPD: no health details on lock-screen)
    let createdNotification = null;
    try {
      createdNotification = await createNotificationInTransaction(connection, {
        userId: recipientUserId,
        consultancyId: params.consultancyId,
        priority: "NORMAL",
        eventType: "CHAT_MESSAGE",
        title: "Trevo Chat",
        body: "Você recebeu uma nova mensagem no atendimento.",
        deepLink: `/consultoria/${params.consultancySlug}/consultas?tab=chat&c=${params.consultationPublicId}`,
        dedupeKey: `chat_msg_${msgPublicId}`,
        sourceType: "CHAT_MESSAGE",
        sourcePublicId: msgPublicId,
      });
    } catch (notifErr) {
      console.warn("[Trevo Chat] Erro não bloqueante ao criar notificação:", notifErr);
    }

    await connection.commit();

    // 6. Deliver external push if configured
    if (createdNotification) {
      deliverNotificationAfterCommit(createdNotification.id).catch((e) =>
        console.warn("[Trevo Chat] Push delivery warning:", e)
      );
    }

    // 7. Return inserted message
    const [inserted] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        cm.id,
        cm.public_id,
        cm.consultation_id,
        cc.public_id AS consultation_public_id,
        cm.sender_user_id,
        cm.sender_role,
        u.full_name AS sender_name,
        cm.content,
        cm.message_type,
        cm.attachment_url,
        cm.attachment_name,
        cm.attachment_size_bytes,
        cm.attachment_mime_type,
        cm.audio_duration_seconds,
        cm.read_at,
        cm.created_at
      FROM chat_messages cm
      INNER JOIN chat_consultations cc ON cc.id = cm.consultation_id
      INNER JOIN users u ON u.id = cm.sender_user_id
      WHERE cm.id = ?
      LIMIT 1;`,
      [messageId]
    );

    return mapRowToMessageDto(inserted[0]);
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Marks messages in a consultation as read for the current user.
 */
export async function markChatMessagesAsRead(
  consultancyId: number,
  consultationPublicId: string,
  userId: number,
  isProfessional: boolean
): Promise<void> {
  const pool = getDbPool();

  const [cRows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, student_membership_id, professional_membership_id FROM chat_consultations
     WHERE consultancy_id = ? AND public_id = ? LIMIT 1;`,
    [consultancyId, consultationPublicId]
  );
  if (!cRows || cRows.length === 0) return;
  const cId = cRows[0].id;

  if (isProfessional) {
    await pool.execute(
      `UPDATE chat_consultations SET unread_count_professional = 0, updated_at = NOW(3) WHERE id = ?;`,
      [cId]
    );
  } else {
    await pool.execute(
      `UPDATE chat_consultations SET unread_count_student = 0, updated_at = NOW(3) WHERE id = ?;`,
      [cId]
    );
  }

  // Mark other party's messages as read
  await pool.execute(
    `UPDATE chat_messages
     SET read_at = NOW(3)
     WHERE consultation_id = ? AND sender_user_id != ? AND read_at IS NULL;`,
    [cId, userId]
  );
}

/**
 * Triggers or updates AI Anamnesis extraction from the consultation messages.
 */
export async function refreshAiAnamnesisForConsultation(
  consultancyId: number,
  consultationPublicId: string
): Promise<ExtractedAnamnesisProposal | null> {
  const chat = await getChatConsultationByPublicId(consultancyId, consultationPublicId);
  if (!chat) return null;

  const messages = await listChatMessages(chat.id, 150);
  const formattedForAi = messages.map((m) => ({
    publicId: m.publicId,
    senderRole: m.senderRole,
    senderName: m.senderName,
    content: m.content,
    messageType: m.messageType,
    createdAt: m.createdAt,
  }));

  const proposal = await extractAnamnesisFromChat(consultationPublicId, formattedForAi);

  const pool = getDbPool();
  await pool.execute(
    `UPDATE chat_consultations
     SET ai_anamnesis_json = ?,
         ai_anamnesis_status = 'EXTRACTED',
         updated_at = NOW(3)
     WHERE id = ?;`,
    [JSON.stringify(proposal), chat.id]
  );

  return proposal;
}

/**
 * Professional reviews and confirms the AI Anamnesis proposal.
 * Persists into official consultancy form requests and links back.
 */
export async function confirmAiAnamnesisProposal(params: {
  consultancyId: number;
  consultationPublicId: string;
  professionalUserId: number;
  confirmedResponses: Record<string, unknown>;
  reviewerNotes?: string | null;
}): Promise<{ success: boolean; formRequestId?: number; error?: string }> {
  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [cRows] = await connection.execute<RowDataPacket[]>(
      `SELECT cc.id, cc.student_membership_id, cm.user_id AS student_user_id
       FROM chat_consultations cc
       INNER JOIN consultancy_members cm ON cm.id = cc.student_membership_id
       WHERE cc.consultancy_id = ? AND cc.public_id = ?
       LIMIT 1 FOR UPDATE;`,
      [params.consultancyId, params.consultationPublicId]
    );

    if (!cRows || cRows.length === 0) {
      throw new Error("Consulta não encontrada.");
    }
    const c = cRows[0];

    // Find default anamnesis template or create a form request
    const [tRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM consultancy_custom_form_templates
       WHERE consultancy_id = ? AND is_active = 1 AND deleted_at IS NULL
       ORDER BY id ASC LIMIT 1;`,
      [params.consultancyId]
    );

    let templateId: number | null = null;
    if (tRows && tRows.length > 0) {
      templateId = tRows[0].id;
    } else {
      // Create a default anamnesis template if none exists
      const templatePublicId = crypto.randomUUID();
      const defaultFields = [
        { id: "main_goal", label: "Objetivo Principal", type: "SHORT_TEXT", required: false },
        { id: "health_history", label: "Histórico Clínico e Lesões", type: "LONG_TEXT", required: false },
        { id: "lifestyle", label: "Rotina e Estilo de Vida", type: "LONG_TEXT", required: false },
        { id: "nutrition", label: "Alimentação e Restrições", type: "LONG_TEXT", required: false },
      ];

      const [resT] = await connection.execute<ResultSetHeader>(
        `INSERT INTO consultancy_custom_form_templates (
          public_id, consultancy_id, title, description, fields_json, is_active, created_by_user_id, created_at, updated_at
        ) VALUES (?, ?, 'Anamnese Geral', 'Formulário padrão de anamnese', ?, 1, ?, NOW(3), NOW(3));`,
        [templatePublicId, params.consultancyId, JSON.stringify(defaultFields), params.professionalUserId]
      );
      templateId = resT.insertId;
    }

    const requestPublicId = crypto.randomUUID();
    const [resReq] = await connection.execute<ResultSetHeader>(
      `INSERT INTO consultancy_custom_form_requests (
        public_id,
        consultancy_id,
        template_id,
        student_membership_id,
        student_user_id,
        requested_by_user_id,
        status,
        responses_json,
        reviewer_notes,
        reviewed_by_user_id,
        submitted_at,
        reviewed_at,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'APPROVED', ?, ?, ?, NOW(3), NOW(3), NOW(3), NOW(3));`,
      [
        requestPublicId,
        params.consultancyId,
        templateId,
        c.student_membership_id,
        c.student_user_id,
        params.professionalUserId,
        JSON.stringify(params.confirmedResponses),
        params.reviewerNotes || "Anamnese estruturada e confirmada via Trevo Chat.",
        params.professionalUserId,
      ]
    );

    const formRequestId = resReq.insertId;

    // Update chat consultation
    await connection.execute(
      `UPDATE chat_consultations
       SET ai_anamnesis_status = 'CONFIRMED',
           confirmed_form_request_id = ?,
           updated_at = NOW(3)
       WHERE id = ?;`,
      [formRequestId, c.id]
    );

    await connection.commit();
    return { success: true, formRequestId };
  } catch (err: unknown) {
    await connection.rollback();
    const errorMsg = err instanceof Error ? err.message : "Erro ao confirmar anamnese.";
    return { success: false, error: errorMsg };
  } finally {
    connection.release();
  }
}

/**
 * Updates the status of a chat consultation.
 */
export async function updateChatConsultationStatus(
  consultancyId: number,
  consultationPublicId: string,
  newStatus: ChatConsultationStatus
): Promise<boolean> {
  const pool = getDbPool();
  const [res] = await pool.execute<ResultSetHeader>(
    `UPDATE chat_consultations
     SET status = ?, updated_at = NOW(3)
     WHERE consultancy_id = ? AND public_id = ?;`,
    [newStatus, consultancyId, consultationPublicId]
  );
  return res.affectedRows > 0;
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function mapRowToConsultationDto(row: RowDataPacket): ChatConsultationDto {
  let parsedAi = null;
  if (row.ai_anamnesis_json) {
    try {
      parsedAi = typeof row.ai_anamnesis_json === "string"
        ? JSON.parse(row.ai_anamnesis_json)
        : row.ai_anamnesis_json;
    } catch {
      parsedAi = null;
    }
  }

  return {
    id: Number(row.id),
    publicId: String(row.public_id),
    consultancyId: Number(row.consultancy_id),
    studentMembershipId: Number(row.student_membership_id),
    studentUserId: Number(row.student_user_id),
    studentName: String(row.student_name || "Aluno"),
    studentEmail: String(row.student_email || ""),
    professionalMembershipId: Number(row.professional_membership_id),
    professionalUserId: Number(row.professional_user_id),
    professionalName: String(row.professional_name || "Profissional"),
    professionalType: row.professional_type as "PERSONAL" | "NUTRITIONIST",
    title: String(row.title || "Consulta"),
    status: row.status as ChatConsultationStatus,
    proposedByUserId: row.proposed_by_user_id ? Number(row.proposed_by_user_id) : null,
    proposedStartAt: row.proposed_start_at ? new Date(row.proposed_start_at).toISOString() : null,
    proposedStartFormatted: row.proposed_start_at
      ? new Date(row.proposed_start_at).toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null,
    topic: row.title || null,
    studentAcceptedAt: row.student_accepted_at ? new Date(row.student_accepted_at).toISOString() : null,
    professionalAcceptedAt: row.professional_accepted_at ? new Date(row.professional_accepted_at).toISOString() : null,
    declinedReason: row.declined_reason || null,
    declinedAt: row.declined_at ? new Date(row.declined_at).toISOString() : null,
    canceledAt: row.canceled_at ? new Date(row.canceled_at).toISOString() : null,
    isMutualConfirmed:
      row.status === "CONFIRMED" ||
      row.status === "AWAITING_STUDENT" ||
      row.status === "AWAITING_PROFESSIONAL" ||
      Boolean(row.student_accepted_at && row.professional_accepted_at),
    lastMessageAt: row.last_message_at ? new Date(row.last_message_at).toISOString() : null,
    lastMessagePreview: row.last_message_preview || null,
    unreadCountStudent: Number(row.unread_count_student || 0),
    unreadCountProfessional: Number(row.unread_count_professional || 0),
    aiAnamnesisJson: parsedAi,
    aiAnamnesisStatus: row.ai_anamnesis_status || "PENDING",
    confirmedFormRequestId: row.confirmed_form_request_id ? Number(row.confirmed_form_request_id) : null,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function mapRowToMessageDto(row: RowDataPacket): ChatMessageDto {
  return {
    id: Number(row.id),
    publicId: String(row.public_id),
    consultationId: Number(row.consultation_id),
    consultationPublicId: String(row.consultation_public_id || ""),
    senderUserId: Number(row.sender_user_id),
    senderRole: String(row.sender_role || "STUDENT"),
    senderName: String(row.sender_name || "Usuário"),
    content: row.content || null,
    messageType: (row.message_type || "TEXT") as ChatMessageType,
    attachmentUrl: row.attachment_url || null,
    attachmentName: row.attachment_name || null,
    attachmentSizeBytes: row.attachment_size_bytes ? Number(row.attachment_size_bytes) : null,
    attachmentMimeType: row.attachment_mime_type || null,
    audioDurationSeconds: row.audio_duration_seconds ? Number(row.audio_duration_seconds) : null,
    readAt: row.read_at ? new Date(row.read_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export interface ActiveStudentForChatDto {
  membershipId: number;
  membershipPublicId: string;
  userPublicId: string;
  name: string;
  email: string;
}

/**
 * Lists active students in the consultancy with membershipId, userPublicId, name and email.
 */
export async function listActiveStudentsForChat(
  consultancyId: number
): Promise<ActiveStudentForChatDto[]> {
  const pool = getDbPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT cm.id AS membership_id,
            cm.public_id AS membership_public_id,
            u.public_id AS user_public_id,
            COALESCE(u.full_name, 'Aluno') AS name,
            COALESCE(u.email, '') AS email
     FROM consultancy_members cm
     JOIN users u ON u.id = cm.user_id
     JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
     WHERE cm.consultancy_id = ?
       AND cm.status = 'ACTIVE'
       AND u.status = 'ACTIVE'
       AND cmr.role = 'STUDENT'
     GROUP BY cm.id, cm.public_id, u.public_id, u.full_name, u.email
     ORDER BY u.full_name ASC;`,
    [consultancyId]
  );

  return (rows as RowDataPacket[]).map((r) => ({
    membershipId: Number(r.membership_id),
    membershipPublicId: String(r.membership_public_id),
    userPublicId: String(r.user_public_id),
    name: String(r.name || "Aluno"),
    email: String(r.email || ""),
  }));
}
