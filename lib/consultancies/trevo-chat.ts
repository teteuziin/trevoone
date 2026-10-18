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
  | "AWAITING_STUDENT"
  | "AWAITING_PROFESSIONAL"
  | "COMPLETED";

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

/**
 * Lists all active chat consultations for a professional in a consultancy.
 */
export async function listChatConsultationsForProfessional(
  consultancyId: number,
  professionalMembershipId: number
): Promise<ChatConsultationDto[]> {
  const pool = getDbPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT 
      cc.id,
      cc.public_id,
      cc.consultancy_id,
      cc.student_membership_id,
      u_stud.id AS student_user_id,
      u_stud.name AS student_name,
      u_stud.email AS student_email,
      cc.professional_membership_id,
      u_prof.id AS professional_user_id,
      u_prof.name AS professional_name,
      cc.professional_type,
      cc.title,
      cc.status,
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
}

/**
 * Lists all active chat consultations for a student in a consultancy.
 */
export async function listChatConsultationsForStudent(
  consultancyId: number,
  studentMembershipId: number
): Promise<ChatConsultationDto[]> {
  const pool = getDbPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT 
      cc.id,
      cc.public_id,
      cc.consultancy_id,
      cc.student_membership_id,
      u_stud.id AS student_user_id,
      u_stud.name AS student_name,
      u_stud.email AS student_email,
      cc.professional_membership_id,
      u_prof.id AS professional_user_id,
      u_prof.name AS professional_name,
      cc.professional_type,
      cc.title,
      cc.status,
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
}

/**
 * Gets a chat consultation by publicId with full tenant isolation.
 */
export async function getChatConsultationByPublicId(
  consultancyId: number,
  chatPublicId: string
): Promise<ChatConsultationDto | null> {
  const pool = getDbPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT 
      cc.id,
      cc.public_id,
      cc.consultancy_id,
      cc.student_membership_id,
      u_stud.id AS student_user_id,
      u_stud.name AS student_name,
      u_stud.email AS student_email,
      cc.professional_membership_id,
      u_prof.id AS professional_user_id,
      u_prof.name AS professional_name,
      cc.professional_type,
      cc.title,
      cc.status,
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
}

/**
 * Lists messages in a consultation ordered chronologically.
 */
export async function listChatMessages(
  consultationId: number,
  limit: number = 100
): Promise<ChatMessageDto[]> {
  const pool = getDbPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT 
      cm.id,
      cm.public_id,
      cm.consultation_id,
      cc.public_id AS consultation_public_id,
      cm.sender_user_id,
      cm.sender_role,
      u.name AS sender_name,
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
        cc.student_membership_id,
        cm_stud.user_id AS student_user_id,
        u_stud.name AS student_name,
        cc.professional_membership_id,
        cm_prof.user_id AS professional_user_id,
        u_prof.name AS professional_name
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
    const newStatus = isSenderStudent ? "AWAITING_PROFESSIONAL" : "AWAITING_STUDENT";

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
        u.name AS sender_name,
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
            COALESCE(u.name, 'Aluno') AS name,
            COALESCE(u.email, '') AS email
     FROM consultancy_members cm
     JOIN users u ON u.id = cm.user_id
     JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
     WHERE cm.consultancy_id = ?
       AND cm.status = 'ACTIVE'
       AND u.status = 'ACTIVE'
       AND cmr.role = 'STUDENT'
     GROUP BY cm.id, cm.public_id, u.public_id, u.name, u.email
     ORDER BY u.name ASC;`,
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
