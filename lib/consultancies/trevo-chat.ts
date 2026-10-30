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
  | "DOCUMENT"
  | "FORM_REQUEST"
  | "PHOTO_REQUEST"
  | "DOCUMENT_REQUEST"
  | "CLINICAL_GUIDANCE"
  | "WORKOUT_CARD"
  | "MEAL_PLAN_CARD"
  | "CLOSURE_CARD";

export interface ClosureSummaryDto {
  summary: string;
  orientations?: string[];
  prescriptions?: string[];
  returnPredictionDays?: number | null;
  closedByName?: string;
  closedAtFormatted?: string;
}

export interface ChatConsultationDto {
  id: number;
  publicId: string;
  consultancyId: number;
  studentMembershipId: number;
  studentUserId: number;
  studentName: string;
  studentEmail: string;
  studentUserPublicId?: string | null;
  professionalMembershipId: number;
  professionalUserId: number;
  professionalName: string;
  professionalUserPublicId?: string | null;
  professionalType: "PERSONAL" | "NUTRITIONIST";
  title: string;
  status: ChatConsultationStatus;
  expectedResponseHours?: number | null;
  closedAt?: string | null;
  closedByUserId?: number | null;
  closureSummaryJson?: ClosureSummaryDto | null;
  privateNotes?: string | null;
  linkedPreviousConsultationId?: number | null;
  modality?: "CHAT" | "VIDEO";
  counterpartRole?: string;
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
  clientMessageId?: string | null;
  consultationId: number;
  consultationPublicId: string;
  senderUserId: number;
  senderRole: string;
  senderName: string;
  content: string | null;
  messageType: ChatMessageType;
  payloadJson?: Record<string, unknown> | null;
  replyToMessageId?: number | null;
  replyToSnippet?: {
    senderName: string;
    content: string;
    messageType: ChatMessageType;
  } | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentSizeBytes: number | null;
  attachmentMimeType: string | null;
  audioDurationSeconds: number | null;
  readAt: string | null;
  createdAt: string;
  deliveryStatus?: "sending" | "sent" | "read" | "error";
}

let _chatSchemaChecked = false;
let _chatSchemaCheckPromise: Promise<void> | null = null;

export async function ensureChatTablesExist(): Promise<void> {
  if (_chatSchemaChecked) return;
  if (_chatSchemaCheckPromise) return _chatSchemaCheckPromise;

  _chatSchemaCheckPromise = (async () => {
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
      const [existingCols] = await pool.query<RowDataPacket[]>(
        `SHOW COLUMNS FROM chat_consultations`
      );
      const colSet = new Set(
        (existingCols as Array<{ Field: string }>).map((c) => c.Field.toLowerCase())
      );

      const columnsToAdd: Array<{ name: string; ddl: string }> = [
        { name: "proposed_by_user_id", ddl: "ADD COLUMN proposed_by_user_id BIGINT UNSIGNED NULL DEFAULT NULL" },
        { name: "proposed_start_at", ddl: "ADD COLUMN proposed_start_at DATETIME(3) NULL DEFAULT NULL" },
        { name: "student_accepted_at", ddl: "ADD COLUMN student_accepted_at DATETIME(3) NULL DEFAULT NULL" },
        { name: "professional_accepted_at", ddl: "ADD COLUMN professional_accepted_at DATETIME(3) NULL DEFAULT NULL" },
        { name: "declined_reason", ddl: "ADD COLUMN declined_reason VARCHAR(255) NULL DEFAULT NULL" },
        { name: "declined_at", ddl: "ADD COLUMN declined_at DATETIME(3) NULL DEFAULT NULL" },
        { name: "canceled_at", ddl: "ADD COLUMN canceled_at DATETIME(3) NULL DEFAULT NULL" },
        { name: "confirmed_form_request_id", ddl: "ADD COLUMN confirmed_form_request_id BIGINT UNSIGNED NULL DEFAULT NULL" },
        { name: "expected_response_hours", ddl: "ADD COLUMN expected_response_hours INT UNSIGNED NULL DEFAULT 24" },
        { name: "closed_at", ddl: "ADD COLUMN closed_at DATETIME(3) NULL DEFAULT NULL" },
        { name: "closed_by_user_id", ddl: "ADD COLUMN closed_by_user_id BIGINT UNSIGNED NULL DEFAULT NULL" },
        { name: "closure_summary_json", ddl: "ADD COLUMN closure_summary_json JSON NULL DEFAULT NULL" },
        { name: "private_notes", ddl: "ADD COLUMN private_notes TEXT NULL DEFAULT NULL" },
        { name: "linked_previous_consultation_id", ddl: "ADD COLUMN linked_previous_consultation_id BIGINT UNSIGNED NULL DEFAULT NULL" },
      ];

      for (const col of columnsToAdd) {
        if (!colSet.has(col.name.toLowerCase())) {
          try {
            await pool.query(`ALTER TABLE chat_consultations ${col.ddl}`);
          } catch (colErr) {
            console.warn(`[Trevo Chat] Could not add column ${col.name}:`, colErr);
          }
        }
      }

      // Check indexes on chat_consultations
      try {
        const [existingIndexes] = await pool.query<RowDataPacket[]>(
          `SHOW INDEX FROM chat_consultations WHERE Key_name IN ('idx_chat_consultations_proposed', 'idx_chat_consultations_proposed_by', 'idx_chat_consultations_closed', 'idx_chat_consultations_linked')`
        );
        const indexSet = new Set(
          (existingIndexes as Array<{ Key_name: string }>).map((idx) => idx.Key_name)
        );

        if (!indexSet.has("idx_chat_consultations_proposed")) {
          try {
            await pool.query(
              `ALTER TABLE chat_consultations ADD KEY idx_chat_consultations_proposed (consultancy_id, proposed_start_at)`
            );
          } catch {}
        }
        if (!indexSet.has("idx_chat_consultations_proposed_by")) {
          try {
            await pool.query(
              `ALTER TABLE chat_consultations ADD KEY idx_chat_consultations_proposed_by (proposed_by_user_id)`
            );
          } catch {}
        }
        if (!indexSet.has("idx_chat_consultations_closed")) {
          try {
            await pool.query(
              `ALTER TABLE chat_consultations ADD KEY idx_chat_consultations_closed (consultancy_id, closed_at)`
            );
          } catch {}
        }
        if (!indexSet.has("idx_chat_consultations_linked")) {
          try {
            await pool.query(
              `ALTER TABLE chat_consultations ADD KEY idx_chat_consultations_linked (linked_previous_consultation_id)`
            );
          } catch {}
        }
      } catch {}
    } catch (inspectErr) {
      console.warn("[Trevo Chat] Error inspecting chat_consultations columns:", inspectErr);
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`chat_messages\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`public_id\` CHAR(36) NOT NULL,
        \`client_message_id\` VARCHAR(64) NULL DEFAULT NULL,
        \`consultation_id\` BIGINT UNSIGNED NOT NULL,
        \`reply_to_message_id\` BIGINT UNSIGNED NULL DEFAULT NULL,
        \`sender_user_id\` BIGINT UNSIGNED NOT NULL,
        \`sender_role\` VARCHAR(32) NOT NULL,
        \`content\` TEXT NULL DEFAULT NULL,
        \`payload_json\` JSON NULL DEFAULT NULL,
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
        KEY \`idx_chat_messages_client_id\` (\`client_message_id\`),
        KEY \`idx_chat_messages_reply_to\` (\`reply_to_message_id\`),

        CONSTRAINT \`fk_chat_messages_consultation\` FOREIGN KEY (\`consultation_id\`) REFERENCES \`chat_consultations\` (\`id\`) ON DELETE CASCADE ON UPDATE RESTRICT,
        CONSTRAINT \`fk_chat_messages_sender\` FOREIGN KEY (\`sender_user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT ON UPDATE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Check if migration 069 columns exist in chat_messages in case it was already created earlier
    try {
      const [existingMsgCols] = await pool.query<RowDataPacket[]>(
        `SHOW COLUMNS FROM chat_messages`
      );
      const msgColSet = new Set(
        (existingMsgCols as Array<{ Field: string }>).map((c) => c.Field.toLowerCase())
      );

      const msgColsToAdd: Array<{ name: string; ddl: string }> = [
        { name: "client_message_id", ddl: "ADD COLUMN client_message_id VARCHAR(64) NULL DEFAULT NULL" },
        { name: "reply_to_message_id", ddl: "ADD COLUMN reply_to_message_id BIGINT UNSIGNED NULL DEFAULT NULL" },
        { name: "payload_json", ddl: "ADD COLUMN payload_json JSON NULL DEFAULT NULL" },
      ];

      for (const col of msgColsToAdd) {
        if (!msgColSet.has(col.name.toLowerCase())) {
          try {
            await pool.query(`ALTER TABLE chat_messages ${col.ddl}`);
          } catch (colErr) {
            console.warn(`[Trevo Chat] Could not add column ${col.name} to chat_messages:`, colErr);
          }
        }
      }

      // Check indexes on chat_messages
      try {
        const [existingMsgIndexes] = await pool.query<RowDataPacket[]>(
          `SHOW INDEX FROM chat_messages WHERE Key_name IN ('idx_chat_messages_client_id', 'idx_chat_messages_reply_to')`
        );
        const msgIndexSet = new Set(
          (existingMsgIndexes as Array<{ Key_name: string }>).map((idx) => idx.Key_name)
        );

        if (!msgIndexSet.has("idx_chat_messages_client_id")) {
          try {
            await pool.query(
              `ALTER TABLE chat_messages ADD KEY idx_chat_messages_client_id (client_message_id)`
            );
          } catch {}
        }
        if (!msgIndexSet.has("idx_chat_messages_reply_to")) {
          try {
            await pool.query(
              `ALTER TABLE chat_messages ADD KEY idx_chat_messages_reply_to (reply_to_message_id)`
            );
          } catch {}
        }
      } catch {}
    } catch (inspectMsgErr) {
      console.warn("[Trevo Chat] Error inspecting chat_messages columns:", inspectMsgErr);
    }

    _chatSchemaChecked = true;
  } catch (schemaErr) {
    console.warn("[Trevo Chat] ensureChatTablesExist warning:", schemaErr);
  } finally {
    _chatSchemaCheckPromise = null;
  }
  })();

  return _chatSchemaCheckPromise;
}

async function executeWithAutoSchema<T>(fn: () => Promise<T>): Promise<T> {
  if (!_chatSchemaChecked) {
    await ensureChatTablesExist();
  }
  try {
    return await fn();
  } catch (err: unknown) {
    const isSchemaError =
      err &&
      typeof err === "object" &&
      (("code" in err && (
        (err as { code: string }).code === "ER_NO_SUCH_TABLE" ||
        (err as { code: string }).code === "ER_BAD_FIELD_ERROR" ||
        (err as { errno?: number }).errno === 1054 ||
        (err as { errno?: number }).errno === 1146
      )) ||
      ("message" in err && (
        String((err as { message: string }).message).includes("doesn't exist") ||
        String((err as { message: string }).message).includes("Unknown column")
      )));

    if (isSchemaError) {
      _chatSchemaChecked = false;
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
      u_stud.public_id AS student_user_public_id,
      u_stud.full_name AS student_name,
      u_stud.email AS student_email,
      cc.professional_membership_id,
      u_prof.id AS professional_user_id,
      u_prof.public_id AS professional_user_public_id,
      u_prof.full_name AS professional_name,
      cc.professional_type,
      cc.title,
      cc.status,
      cc.expected_response_hours,
      cc.closed_at,
      cc.closed_by_user_id,
      cc.closure_summary_json,
      cc.private_notes,
      cc.linked_previous_consultation_id,
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

    return (rows as RowDataPacket[]).map((r) => mapRowToConsultationDto(r, false));
  });
}

/**
 * Lists all active chat consultations for a student in a consultancy.
 * Strictly sanitizes private notes so student never sees professional private notes.
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
      u_stud.public_id AS student_user_public_id,
      u_stud.full_name AS student_name,
      u_stud.email AS student_email,
      cc.professional_membership_id,
      u_prof.id AS professional_user_id,
      u_prof.public_id AS professional_user_public_id,
      u_prof.full_name AS professional_name,
      cc.professional_type,
      cc.title,
      cc.status,
      cc.expected_response_hours,
      cc.closed_at,
      cc.closed_by_user_id,
      cc.closure_summary_json,
      cc.private_notes,
      cc.linked_previous_consultation_id,
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

    return (rows as RowDataPacket[]).map((r) => mapRowToConsultationDto(r, true));
  });
}

/**
 * Gets a chat consultation by publicId with full tenant isolation.
 */
export async function getChatConsultationByPublicId(
  consultancyId: number,
  chatPublicId: string,
  options?: { sanitizeForStudent?: boolean }
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
        u_stud.public_id AS student_user_public_id,
        u_stud.full_name AS student_name,
        u_stud.email AS student_email,
        cc.professional_membership_id,
        u_prof.id AS professional_user_id,
        u_prof.public_id AS professional_user_public_id,
        u_prof.full_name AS professional_name,
        cc.professional_type,
        cc.title,
        cc.status,
        cc.expected_response_hours,
        cc.closed_at,
        cc.closed_by_user_id,
        cc.closure_summary_json,
        cc.private_notes,
        cc.linked_previous_consultation_id,
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
    return mapRowToConsultationDto(rows[0], Boolean(options?.sanitizeForStudent));
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
  expectedResponseHours?: number;
  initialMessage?: string;
  linkedPreviousConsultationId?: number;
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
      const expectedHours = params.expectedResponseHours || 24;

      const [insertRes] = await connection.execute<ResultSetHeader>(
        `INSERT INTO chat_consultations (
          public_id,
          consultancy_id,
          student_membership_id,
          professional_membership_id,
          professional_type,
          title,
          status,
          expected_response_hours,
          linked_previous_consultation_id,
          proposed_by_user_id,
          proposed_start_at,
          student_accepted_at,
          professional_accepted_at,
          created_by_user_id,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'PROPOSED', ?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3));`,
        [
          newPublicId,
          params.consultancyId,
          params.studentMembershipId,
          params.professionalMembershipId,
          params.professionalType,
          title,
          expectedHours,
          params.linkedPreviousConsultationId || null,
          params.proposedByUserId,
          params.proposedStartAt,
          studentAcceptedAt,
          professionalAcceptedAt,
          params.proposedByUserId,
        ]
      );

      // If proposer wrote an initial message, record it in the chat
      if (params.initialMessage && params.initialMessage.trim()) {
        const initialMsgPublicId = crypto.randomUUID();
        const senderRole = isProposedByStudent ? "STUDENT" : params.professionalType;
        await connection.execute(
          `INSERT INTO chat_messages (
            public_id,
            consultation_id,
            sender_user_id,
            sender_role,
            content,
            message_type,
            created_at
          ) VALUES (?, ?, ?, ?, ?, 'TEXT', NOW(3));`,
          [
            initialMsgPublicId,
            insertRes.insertId,
            params.proposedByUserId,
            senderRole,
            params.initialMessage.trim(),
          ]
        );

        await connection.execute(
          `UPDATE chat_consultations
           SET last_message_at = NOW(3),
               last_message_preview = ?,
               updated_at = NOW(3)
           WHERE id = ?;`,
          [params.initialMessage.trim().slice(0, 100), insertRes.insertId]
        );
      }

      let notif = null;
      try {
        notif = await createNotificationInTransaction(connection, {
          userId: recipientUserId,
          consultancyId: params.consultancyId,
          priority: "HIGH",
          eventType: "CHAT_MESSAGE",
          title: "Nova proposta no Trevo Chat",
          body: "Você recebeu uma proposta de agendamento no Trevo Chat. Aceite para liberar o chat assíncrono.",
          deepLink: `/consultoria/${params.consultancySlug}/consultas?c=${newPublicId}`,
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
 * Supports pagination backwards via beforeId and limit.
 */
export async function listChatMessages(
  consultationId: number,
  limit: number = 50,
  beforeId?: number
): Promise<ChatMessageDto[]> {
  return executeWithAutoSchema(async () => {
    const pool = getDbPool();
    const queryLimit = Math.min(Math.max(limit, 1), 100);
    const sql = `SELECT 
        cm.id,
        cm.public_id,
        cm.client_message_id,
        cm.consultation_id,
        cc.public_id AS consultation_public_id,
        cm.sender_user_id,
        cm.sender_role,
        u.full_name AS sender_name,
        cm.content,
        cm.message_type,
        cm.payload_json,
        cm.reply_to_message_id,
        cm.attachment_url,
        cm.attachment_name,
        cm.attachment_size_bytes,
        cm.attachment_mime_type,
        cm.audio_duration_seconds,
        cm.read_at,
        cm.created_at,
        u_reply.full_name AS reply_sender_name,
        cm_reply.content AS reply_content,
        cm_reply.message_type AS reply_message_type
      FROM chat_messages cm
      INNER JOIN chat_consultations cc ON cc.id = cm.consultation_id
      INNER JOIN users u ON u.id = cm.sender_user_id
      LEFT JOIN chat_messages cm_reply ON cm_reply.id = cm.reply_to_message_id
      LEFT JOIN users u_reply ON u_reply.id = cm_reply.sender_user_id
      WHERE cm.consultation_id = ? ${beforeId ? "AND cm.id < ?" : ""}
      ORDER BY cm.id DESC
      LIMIT ?;`;

    const params = beforeId
      ? [consultationId, beforeId, queryLimit]
      : [consultationId, queryLimit];

    const [rows] = await pool.execute<RowDataPacket[]>(sql, params);

    const dtos = (rows as RowDataPacket[]).map(mapRowToMessageDto);
    // Reverse to return in chronological order ASC
    return dtos.reverse();
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
  clientMessageId?: string | null;
  replyToMessageId?: number | null;
  payloadJson?: Record<string, unknown> | null;
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

    // Idempotency: if clientMessageId already exists for this consultation, return existing
    if (params.clientMessageId) {
      const [existing] = await connection.execute<RowDataPacket[]>(
        `SELECT 
          cm.id,
          cm.public_id,
          cm.client_message_id,
          cm.consultation_id,
          cc.public_id AS consultation_public_id,
          cm.sender_user_id,
          cm.sender_role,
          u.full_name AS sender_name,
          cm.content,
          cm.message_type,
          cm.payload_json,
          cm.reply_to_message_id,
          cm.attachment_url,
          cm.attachment_name,
          cm.attachment_size_bytes,
          cm.attachment_mime_type,
          cm.audio_duration_seconds,
          cm.read_at,
          cm.created_at,
          u_reply.full_name AS reply_sender_name,
          cm_reply.content AS reply_content,
          cm_reply.message_type AS reply_message_type
        FROM chat_messages cm
        INNER JOIN chat_consultations cc ON cc.id = cm.consultation_id
        INNER JOIN users u ON u.id = cm.sender_user_id
        LEFT JOIN chat_messages cm_reply ON cm_reply.id = cm.reply_to_message_id
        LEFT JOIN users u_reply ON u_reply.id = cm_reply.sender_user_id
        WHERE cm.consultation_id = ? AND cm.client_message_id = ?
        LIMIT 1;`,
        [consultation.id, params.clientMessageId]
      );

      if (existing && existing.length > 0) {
        await connection.commit();
        return mapRowToMessageDto(existing[0]);
      }
    }

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
    const payloadStr = params.payloadJson ? JSON.stringify(params.payloadJson) : null;

    // Validate that reply_to_message_id strictly belongs to THIS consultation (tenancy/consultation isolation)
    let validatedReplyToId: number | null = null;
    if (params.replyToMessageId) {
      const [replyRows] = await connection.execute<RowDataPacket[]>(
        `SELECT id FROM chat_messages WHERE id = ? AND consultation_id = ? LIMIT 1;`,
        [params.replyToMessageId, consultation.id]
      );
      if (replyRows && replyRows.length > 0) {
        validatedReplyToId = Number(replyRows[0].id);
      }
    }

    // 2. Insert message
    const [msgRes] = await connection.execute<ResultSetHeader>(
      `INSERT INTO chat_messages (
        public_id,
        client_message_id,
        consultation_id,
        reply_to_message_id,
        sender_user_id,
        sender_role,
        content,
        payload_json,
        message_type,
        attachment_url,
        attachment_name,
        attachment_size_bytes,
        attachment_mime_type,
        audio_duration_seconds,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3));`,
      [
        msgPublicId,
        params.clientMessageId || null,
        consultation.id,
        validatedReplyToId,
        params.senderUserId,
        params.senderRole,
        params.content?.trim() || null,
        payloadStr,
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
    if (messageType === "FORM_REQUEST") {
      preview = "📋 Solicitação de formulário";
    } else if (messageType === "PHOTO_REQUEST") {
      preview = "📸 Solicitação de fotos";
    } else if (messageType === "DOCUMENT_REQUEST") {
      preview = "📄 Solicitação de exames/documentos";
    } else if (messageType === "CLINICAL_GUIDANCE") {
      preview = "💡 Orientação clínica";
    } else if (messageType === "WORKOUT_CARD") {
      preview = "🏋️ Treino compartilhado";
    } else if (messageType === "MEAL_PLAN_CARD") {
      preview = "🥗 Plano alimentar compartilhado";
    } else if (messageType === "CLOSURE_CARD") {
      preview = "🏁 Consulta finalizada com resumo";
    } else if (messageType === "TEXT") {
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
        deepLink: `/consultoria/${params.consultancySlug}/consultas?c=${params.consultationPublicId}`,
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
        cm.client_message_id,
        cm.consultation_id,
        cc.public_id AS consultation_public_id,
        cm.sender_user_id,
        cm.sender_role,
        u.full_name AS sender_name,
        cm.content,
        cm.message_type,
        cm.payload_json,
        cm.reply_to_message_id,
        cm.attachment_url,
        cm.attachment_name,
        cm.attachment_size_bytes,
        cm.attachment_mime_type,
        cm.audio_duration_seconds,
        cm.read_at,
        cm.created_at,
        u_reply.full_name AS reply_sender_name,
        cm_reply.content AS reply_content,
        cm_reply.message_type AS reply_message_type
      FROM chat_messages cm
      INNER JOIN chat_consultations cc ON cc.id = cm.consultation_id
      INNER JOIN users u ON u.id = cm.sender_user_id
      LEFT JOIN chat_messages cm_reply ON cm_reply.id = cm.reply_to_message_id
      LEFT JOIN users u_reply ON u_reply.id = cm_reply.sender_user_id
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

/**
 * Closes a chat consultation formally with summary, orientations, prescriptions,
 * return prediction, and pro private notes.
 */
export async function closeChatConsultation(params: {
  consultancyId: number;
  consultationPublicId: string;
  professionalUserId: number;
  summary: string;
  orientations?: string[];
  prescriptions?: string[];
  returnPredictionDays?: number | null;
  privateNotes?: string | null;
  consultancySlug: string;
}): Promise<ChatConsultationDto> {
  return executeWithAutoSchema(async () => {
    const pool = getDbPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

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
          u_prof.full_name AS professional_name,
          cc.professional_type
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
      const c = cRows[0];

      if (Number(params.professionalUserId) !== Number(c.professional_user_id)) {
        throw new Error("Apenas o profissional responsável pode finalizar o atendimento.");
      }

      const closureSummary: ClosureSummaryDto = {
        summary: params.summary.trim(),
        orientations: params.orientations || [],
        prescriptions: params.prescriptions || [],
        returnPredictionDays: params.returnPredictionDays || null,
        closedByName: c.professional_name,
        closedAtFormatted: new Date().toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      await connection.execute(
        `UPDATE chat_consultations
         SET status = 'COMPLETED',
             closed_at = NOW(3),
             closed_by_user_id = ?,
             closure_summary_json = ?,
             private_notes = ?,
             updated_at = NOW(3)
         WHERE id = ?;`,
        [
          params.professionalUserId,
          JSON.stringify(closureSummary),
          params.privateNotes?.trim() || null,
          c.id,
        ]
      );

      // Post closure message in chat transcript
      const closureMsgPublicId = crypto.randomUUID();
      await connection.execute(
        `INSERT INTO chat_messages (
          public_id,
          consultation_id,
          sender_user_id,
          sender_role,
          content,
          payload_json,
          message_type,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'CLOSURE_CARD', NOW(3));`,
        [
          closureMsgPublicId,
          c.id,
          params.professionalUserId,
          c.professional_type,
          "Consulta concluída pelo profissional. Resumo, orientações e prescrições disponíveis.",
          JSON.stringify(closureSummary),
        ]
      );

      // In-app notification to student
      try {
        const notif = await createNotificationInTransaction(connection, {
          userId: Number(c.student_user_id),
          consultancyId: params.consultancyId,
          priority: "NORMAL",
          eventType: "CHAT_MESSAGE",
          title: "Consulta Finalizada",
          body: "Seu profissional finalizou a consulta e disponibilizou o resumo com as orientações.",
          deepLink: `/consultoria/${params.consultancySlug}/consultas?c=${params.consultationPublicId}`,
          dedupeKey: `chat_close_${c.id}_${Date.now()}`,
          sourceType: "CHAT_MESSAGE",
          sourcePublicId: params.consultationPublicId,
        });
        deliverNotificationAfterCommit(notif.id).catch(() => {});
      } catch (notifErr) {
        console.warn("[Trevo Chat] Aviso ao notificar encerramento:", notifErr);
      }

      await connection.commit();

      const updated = await getChatConsultationByPublicId(params.consultancyId, params.consultationPublicId);
      if (!updated) throw new Error("Erro ao carregar consulta finalizada.");
      return updated;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  });
}

/**
 * Updates private notes for a professional on a chat consultation.
 * Private notes are NEVER visible to the student.
 */
export async function savePrivateNotes(params: {
  consultancyId: number;
  consultationPublicId: string;
  professionalUserId: number;
  notes: string;
}): Promise<{ ok: boolean }> {
  return executeWithAutoSchema(async () => {
    const pool = getDbPool();
    const [cRows] = await pool.execute<RowDataPacket[]>(
      `SELECT cc.id, cm_prof.user_id AS professional_user_id
       FROM chat_consultations cc
       INNER JOIN consultancy_members cm_prof ON cm_prof.id = cc.professional_membership_id
       WHERE cc.consultancy_id = ? AND cc.public_id = ?
       LIMIT 1;`,
      [params.consultancyId, params.consultationPublicId]
    );

    if (!cRows || cRows.length === 0) {
      throw new Error("Consulta não encontrada.");
    }
    const c = cRows[0];
    if (Number(params.professionalUserId) !== Number(c.professional_user_id)) {
      throw new Error("Apenas o profissional responsável pode editar as notas privadas.");
    }

    await pool.execute(
      `UPDATE chat_consultations
       SET private_notes = ?, updated_at = NOW(3)
       WHERE id = ?;`,
      [params.notes || null, c.id]
    );

    return { ok: true };
  });
}

/**
 * Creates a linked return proposal consultation referencing a previous consultation.
 */
export async function requestReturnConsultation(params: {
  consultancyId: number;
  previousConsultationPublicId: string;
  requestedByUserId: number;
  referenceDate: string;
  referenceTime: string;
  title?: string;
  expectedResponseHours?: number;
  consultancySlug: string;
}): Promise<ChatConsultationDto> {
  return executeWithAutoSchema(async () => {
    const pool = getDbPool();
    const [cRows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        cc.id,
        cc.student_membership_id,
        cc.professional_membership_id,
        cc.professional_type,
        cc.title
       FROM chat_consultations cc
       WHERE cc.consultancy_id = ? AND cc.public_id = ?
       LIMIT 1;`,
      [params.consultancyId, params.previousConsultationPublicId]
    );

    if (!cRows || cRows.length === 0) {
      throw new Error("Consulta anterior não encontrada.");
    }
    const prev = cRows[0];
    const proposedDate = new Date(`${params.referenceDate}T${params.referenceTime}:00`);
    if (isNaN(proposedDate.getTime())) {
      throw new Error("Data ou horário de referência inválido.");
    }

    const title = params.title || `Retorno: ${prev.title || "Consulta"}`;

    return await proposeChatConsultation({
      consultancyId: params.consultancyId,
      studentMembershipId: Number(prev.student_membership_id),
      professionalMembershipId: Number(prev.professional_membership_id),
      professionalType: prev.professional_type,
      proposedByUserId: params.requestedByUserId,
      proposedStartAt: proposedDate,
      title,
      expectedResponseHours: params.expectedResponseHours || 24,
      linkedPreviousConsultationId: Number(prev.id),
      consultancySlug: params.consultancySlug,
    });
  });
}

/**
 * On-Demand AI: Generates a concise summary of the consultation messages.
 * Only executes when explicitly requested by the professional.
 */
export async function generateAiConsultationSummary(
  consultancyId: number,
  consultationPublicId: string
): Promise<{ summary: string; topics: string[]; nextSteps: string[] }> {
  const chat = await getChatConsultationByPublicId(consultancyId, consultationPublicId);
  if (!chat) throw new Error("Consulta não encontrada.");

  const messages = await listChatMessages(chat.id, 100);
  const textMessages = messages
    .filter((m) => m.content && m.content.trim())
    .map((m) => `[${m.senderRole} - ${m.senderName}]: ${m.content}`);

  if (textMessages.length === 0) {
    return {
      summary: "Ainda não há mensagens suficientes para gerar um resumo.",
      topics: [],
      nextSteps: [],
    };
  }

  // Try OpenAI if configured
  try {
    const { getOpenAiClient, isOpenAiConfigured } = await import("../ai/openai-client");
    if (isOpenAiConfigured()) {
      const openai = getOpenAiClient();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Você é o assistente de resumo clínico do Trevo One. Analise as mensagens da consulta assíncrona e responda estritamente em JSON no formato: { \"summary\": \"resumo em até 3 frases\", \"topics\": [\"tópico 1\", \"tópico 2\"], \"nextSteps\": [\"passo 1\", \"passo 2\"] }.",
          },
          {
            role: "user",
            content: textMessages.join("\n"),
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      });

      const raw = completion.choices[0]?.message?.content;
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          summary: parsed.summary || "Resumo gerado.",
          topics: Array.isArray(parsed.topics) ? parsed.topics : [],
          nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [],
        };
      }
    }
  } catch (err) {
    console.warn("[Trevo Chat AI] Falha ao chamar OpenAI para resumo, aplicando fallback determinístico:", err);
  }

  // Deterministic fallback
  const recentTexts = textMessages.slice(-5).map((t) => t.replace(/^\[.*?\]:\s*/, ""));
  return {
    summary: `Atendimento em andamento com ${messages.length} mensagens trocadas. Principais assuntos abordados recentemente: ${recentTexts.slice(0, 2).join("; ")}.`,
    topics: ["Acompanhamento da rotina", "Ajustes de prescrição e orientações"],
    nextSteps: ["Confirmar respostas do aluno", "Revisar metas clínicas no próximo contato"],
  };
}

/**
 * On-Demand AI: Generates SOAP format clinical notes from the conversation.
 * Strictly on-demand.
 */
export async function generateAiProntuarioNotes(
  consultancyId: number,
  consultationPublicId: string
): Promise<{ subjective: string; objective: string; assessment: string; plan: string }> {
  const chat = await getChatConsultationByPublicId(consultancyId, consultationPublicId);
  if (!chat) throw new Error("Consulta não encontrada.");

  const messages = await listChatMessages(chat.id, 100);
  const textMessages = messages
    .filter((m) => m.content && m.content.trim())
    .map((m) => `[${m.senderRole} - ${m.senderName}]: ${m.content}`);

  if (textMessages.length === 0) {
    return {
      subjective: "Sem relatos registrados pelo aluno até o momento.",
      objective: "Dados objetivos não coletados.",
      assessment: "Aguardando interação clínica.",
      plan: "Aguardar retorno do paciente.",
    };
  }

  try {
    const { getOpenAiClient, isOpenAiConfigured } = await import("../ai/openai-client");
    if (isOpenAiConfigured()) {
      const openai = getOpenAiClient();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Você é o assistente de prontuário do Trevo One. Estruture a conversa em formato SOAP (Subjetivo, Objetivo, Avaliação, Plano) e responda estritamente em JSON: { \"subjective\": \"...\", \"objective\": \"...\", \"assessment\": \"...\", \"plan\": \"...\" }.",
          },
          {
            role: "user",
            content: textMessages.join("\n"),
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      });

      const raw = completion.choices[0]?.message?.content;
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          subjective: parsed.subjective || "",
          objective: parsed.objective || "",
          assessment: parsed.assessment || "",
          plan: parsed.plan || "",
        };
      }
    }
  } catch (err) {
    console.warn("[Trevo Chat AI] Falha ao chamar OpenAI para SOAP:", err);
  }

  // Deterministic Fallback: Never invent diagnoses, conclusions or clinical evaluations
  const studentMsgs = messages
    .filter((m) => m.senderRole === "STUDENT" && m.content)
    .map((m) => m.content!.trim());
  const hasAttachments = messages.some((m) => m.attachmentUrl);

  return {
    subjective: studentMsgs.length > 0
      ? `Relatos textuais do aluno no chat: ${studentMsgs.slice(-3).join(" | ")}`
      : "Nenhum relato textual do aluno registrado nesta consulta.",
    objective: hasAttachments
      ? `Dados objetivos compartilhados no chat (${messages.filter((m) => m.attachmentUrl).length} mídias/anexos).`
      : "Nenhum anexo clínico objetivo compartilhado até o momento.",
    assessment: "Análise por IA indisponível. Pendente de avaliação clínica do profissional responsável.",
    plan: "Definir conduta e orientações clínicas no fechamento do ciclo de atendimento.",
  };
}

/**
 * On-Demand AI: Detects unanswered questions in the conversation.
 */
export async function generateAiPendingQuestions(
  consultancyId: number,
  consultationPublicId: string
): Promise<Array<{ question: string; askedBy: string; messagePublicId: string }>> {
  const chat = await getChatConsultationByPublicId(consultancyId, consultationPublicId);
  if (!chat) throw new Error("Consulta não encontrada.");

  const messages = await listChatMessages(chat.id, 50);
  const pending: Array<{ question: string; askedBy: string; messagePublicId: string }> = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.content && msg.content.includes("?")) {
      // Check if subsequent message is from the other party
      const subsequentFromOther = messages.slice(i + 1).some((m) => m.senderUserId !== msg.senderUserId);
      if (!subsequentFromOther) {
        pending.push({
          question: msg.content.trim(),
          askedBy: msg.senderName,
          messagePublicId: msg.publicId,
        });
      }
    }
  }

  return pending;
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function mapRowToConsultationDto(row: RowDataPacket, sanitizeForStudent = false): ChatConsultationDto {
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

  let parsedClosure: ClosureSummaryDto | null = null;
  if (row.closure_summary_json) {
    try {
      parsedClosure = typeof row.closure_summary_json === "string"
        ? JSON.parse(row.closure_summary_json)
        : row.closure_summary_json;
    } catch {
      parsedClosure = null;
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
    studentUserPublicId: row.student_user_public_id ? String(row.student_user_public_id) : null,
    professionalMembershipId: Number(row.professional_membership_id),
    professionalUserId: Number(row.professional_user_id),
    professionalName: String(row.professional_name || "Profissional"),
    professionalUserPublicId: row.professional_user_public_id ? String(row.professional_user_public_id) : null,
    professionalType: row.professional_type as "PERSONAL" | "NUTRITIONIST",
    title: String(row.title || "Consulta"),
    status: row.status as ChatConsultationStatus,
    expectedResponseHours: row.expected_response_hours ? Number(row.expected_response_hours) : 24,
    closedAt: row.closed_at ? new Date(row.closed_at).toISOString() : null,
    closedByUserId: row.closed_by_user_id ? Number(row.closed_by_user_id) : null,
    closureSummaryJson: parsedClosure,
    privateNotes: sanitizeForStudent ? null : (row.private_notes ? String(row.private_notes) : null),
    linkedPreviousConsultationId: row.linked_previous_consultation_id ? Number(row.linked_previous_consultation_id) : null,
    modality: "CHAT",
    counterpartRole: row.professional_type === "PERSONAL" ? "Personal Trainer" : "Nutricionista",
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
  let parsedPayload = null;
  if (row.payload_json) {
    try {
      parsedPayload = typeof row.payload_json === "string" ? JSON.parse(row.payload_json) : row.payload_json;
    } catch {
      parsedPayload = null;
    }
  }

  let replySnippet = null;
  if (row.reply_sender_name || row.reply_content) {
    replySnippet = {
      senderName: String(row.reply_sender_name || "Usuário"),
      content: String(row.reply_content || ""),
      messageType: (row.reply_message_type || "TEXT") as ChatMessageType,
    };
  }

  return {
    id: Number(row.id),
    publicId: String(row.public_id),
    clientMessageId: row.client_message_id ? String(row.client_message_id) : null,
    consultationId: Number(row.consultation_id),
    consultationPublicId: String(row.consultation_public_id || ""),
    senderUserId: Number(row.sender_user_id),
    senderRole: String(row.sender_role || "STUDENT"),
    senderName: String(row.sender_name || "Usuário"),
    content: row.content || null,
    messageType: (row.message_type || "TEXT") as ChatMessageType,
    payloadJson: parsedPayload,
    replyToMessageId: row.reply_to_message_id ? Number(row.reply_to_message_id) : null,
    replyToSnippet: replySnippet,
    attachmentUrl: row.attachment_url || null,
    attachmentName: row.attachment_name || null,
    attachmentSizeBytes: row.attachment_size_bytes ? Number(row.attachment_size_bytes) : null,
    attachmentMimeType: row.attachment_mime_type || null,
    audioDurationSeconds: row.audio_duration_seconds ? Number(row.audio_duration_seconds) : null,
    readAt: row.read_at ? new Date(row.read_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString(),
    deliveryStatus: row.read_at ? "read" : "sent",
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
  try {
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
  } catch (err: unknown) {
    console.warn("[Trevo Chat] Erro ao listar alunos ativos para chat:", err);
    return [];
  }
}

export interface ActiveProfessionalForChatDto {
  membershipId: number;
  membershipPublicId: string;
  userPublicId: string;
  name: string;
  email: string;
  role: "PERSONAL" | "NUTRITIONIST";
}

/**
 * Lists active professionals (Personal / Nutritionist) in the consultancy for student chat scheduling.
 */
export async function listActiveProfessionalsForChat(
  consultancyId: number
): Promise<ActiveProfessionalForChatDto[]> {
  try {
    const pool = getDbPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT cm.id AS membership_id,
              cm.public_id AS membership_public_id,
              u.public_id AS user_public_id,
              COALESCE(u.full_name, 'Profissional') AS name,
              COALESCE(u.email, '') AS email,
              cmr.role AS role
       FROM consultancy_members cm
       JOIN users u ON u.id = cm.user_id
       JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.consultancy_id = ?
         AND cm.status = 'ACTIVE'
         AND u.status = 'ACTIVE'
         AND cmr.role IN ('PERSONAL', 'NUTRITIONIST')
       ORDER BY u.full_name ASC;`,
      [consultancyId]
    );

    return (rows as RowDataPacket[]).map((r) => ({
      membershipId: Number(r.membership_id),
      membershipPublicId: String(r.membership_public_id),
      userPublicId: String(r.user_public_id),
      name: String(r.name || "Profissional"),
      email: String(r.email || ""),
      role: r.role === "NUTRITIONIST" ? "NUTRITIONIST" : "PERSONAL",
    }));
  } catch (err: unknown) {
    console.warn("[Trevo Chat] Erro ao listar profissionais ativos para chat:", err);
    return [];
  }
}

