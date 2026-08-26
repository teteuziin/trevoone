import crypto from "node:crypto";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { getDbPool } from "../db/mysql";
import { resolveConsultationJoinAccess } from "./consultations";

export type SignalingMessageType = "OFFER" | "ANSWER" | "ICE_CANDIDATE" | "ICE_COMPLETE";
export type SignalingNegotiationRole = "OFFERER" | "ANSWERER";

export const MAX_SIGNALING_PAYLOAD_BYTES = 65536; // 64 KiB
export const SIGNALING_MESSAGE_TTL_MINUTES = 5;

export interface SignalingSessionDto {
  publicId: string;
  generation: number;
  negotiationRole: SignalingNegotiationRole;
  expiresAt: string;
}

export interface SignalingMessageDto {
  id: string;
  sender: "STUDENT" | "PROFESSIONAL";
  type: SignalingMessageType;
  payload: unknown;
  cursor: string;
  createdAt: string;
}

export type SignalingSessionResult =
  | {
      success: true;
      session: SignalingSessionDto;
    }
  | {
      success: false;
      error: string;
      message: string;
    };

export type SignalingPublishResult =
  | {
      success: true;
      messageId: string;
      cursor?: string;
    }
  | {
      success: false;
      error: string;
      message: string;
    };

export type SignalingPollResult =
  | {
      success: true;
      messages: SignalingMessageDto[];
      nextCursor: string;
    }
  | {
      success: false;
      error: string;
      message: string;
    };

interface InternalConsultationRow extends RowDataPacket {
  id: number;
  consultancy_id: number;
  scheduled_end_at: Date;
  status: string;
  student_membership_id: number;
  professional_membership_id: number;
}

interface InternalSignalingSessionRow extends RowDataPacket {
  id: number;
  public_id: string;
  generation: number;
  expires_at: Date;
  closed_at: Date | null;
}

interface InternalSignalingMessageRow extends RowDataPacket {
  id: number;
  sender_membership_id: number;
  client_message_id: string;
  message_type: string;
  payload: string;
  created_at: Date;
  expires_at: Date;
}

export async function prepareSignalingSession(
  actorUserId: number,
  consultancySlug: string,
  consultationPublicId: string,
  action: "PREPARE" | "RESET" = "PREPARE"
): Promise<SignalingSessionResult> {
  const access = await resolveConsultationJoinAccess(
    actorUserId,
    consultancySlug,
    consultationPublicId
  );

  if (!access.allowed) {
    return {
      success: false,
      error: access.reason,
      message: "Acesso não autorizado para a sessão de sinalização.",
    };
  }

  const isProfessional = access.participantKind === "PROFESSIONAL";
  const negotiationRole: SignalingNegotiationRole = isProfessional ? "OFFERER" : "ANSWERER";

  if (action === "RESET" && !isProfessional) {
    return {
      success: false,
      error: "SIGNALING_FORBIDDEN",
      message: "Apenas o profissional pode reiniciar a negociação da consulta.",
    };
  }

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await connection.query("SET SESSION time_zone = '+00:00';");

    // 1. Lock consultation row & get internal IDs
    const [consRows] = await connection.query<InternalConsultationRow[]>(
      `SELECT c.id, c.consultancy_id, c.scheduled_end_at, c.status,
              sm.id AS student_membership_id, pm.id AS professional_membership_id
       FROM consultations c
       JOIN consultancy_members sm ON sm.public_id = ?
       JOIN consultancy_members pm ON pm.public_id = ?
       WHERE c.public_id = ?
       FOR UPDATE`,
      [
        access.consultation.student.membershipPublicId,
        access.consultation.professional.membershipPublicId,
        consultationPublicId,
      ]
    );

    if (consRows.length === 0) {
      await connection.rollback();
      return {
        success: false,
        error: "CONSULTATION_NOT_FOUND",
        message: "Consulta não encontrada.",
      };
    }

    const cons = consRows[0];
    if (cons.status === "CANCELED" || cons.status === "COMPLETED") {
      await connection.rollback();
      return {
        success: false,
        error: `CONSULTATION_${cons.status}`,
        message: `Consulta está com status ${cons.status}.`,
      };
    }

    // Check expiration (scheduled_end_at + 30 min)
    const scheduledEnd = new Date(cons.scheduled_end_at);
    const sessionExpiresAt = new Date(scheduledEnd.getTime() + 30 * 60 * 1000);
    if (Date.now() > sessionExpiresAt.getTime()) {
      await connection.rollback();
      return {
        success: false,
        error: "JOIN_WINDOW_CLOSED",
        message: "Janela de atendimento expirada.",
      };
    }

    // If RESET action, close all current active sessions
    if (action === "RESET") {
      await connection.query(
        `UPDATE consultation_signaling_sessions
         SET closed_at = CURRENT_TIMESTAMP(3)
         WHERE consultation_id = ? AND closed_at IS NULL`,
        [cons.id]
      );
    } else {
      // If PREPARE action, check if an active non-expired session already exists
      const [existingSessions] = await connection.query<InternalSignalingSessionRow[]>(
        `SELECT id, public_id, generation, expires_at
         FROM consultation_signaling_sessions
         WHERE consultation_id = ? AND closed_at IS NULL AND expires_at > ?
         ORDER BY generation DESC
         LIMIT 1
         FOR UPDATE`,
        [cons.id, new Date()]
      );

      if (existingSessions.length > 0) {
        const existing = existingSessions[0];
        await connection.commit();
        return {
          success: true,
          session: {
            publicId: existing.public_id,
            generation: Number(existing.generation),
            negotiationRole,
            expiresAt: new Date(existing.expires_at).toISOString(),
          },
        };
      }
    }

    // Determine next generation number
    const [genRows] = await connection.query<RowDataPacket[]>(
      `SELECT COALESCE(MAX(generation), 0) + 1 AS next_gen
       FROM consultation_signaling_sessions
       WHERE consultation_id = ?
       FOR UPDATE`,
      [cons.id]
    );
    const nextGen = Number(genRows[0]?.next_gen || 1);

    const newPublicId = crypto.randomUUID();

    await connection.query(
      `INSERT INTO consultation_signaling_sessions (
        public_id, consultancy_id, consultation_id, generation, expires_at
      ) VALUES (?, ?, ?, ?, ?)`,
      [newPublicId, cons.consultancy_id, cons.id, nextGen, sessionExpiresAt]
    );

    await connection.commit();

    return {
      success: true,
      session: {
        publicId: newPublicId,
        generation: nextGen,
        negotiationRole,
        expiresAt: sessionExpiresAt.toISOString(),
      },
    };
  } catch {
    await connection.rollback();
    return {
      success: false,
      error: "SIGNALING_INTERNAL_ERROR",
      message: "Erro interno ao preparar sessão de sinalização.",
    };
  } finally {
    connection.release();
  }
}

export async function publishSignalingMessage(
  actorUserId: number,
  consultancySlug: string,
  consultationPublicId: string,
  input: {
    sessionPublicId: string;
    clientMessageId: string;
    type: SignalingMessageType;
    payload: unknown;
  }
): Promise<SignalingPublishResult> {
  const { sessionPublicId, clientMessageId, type, payload } = input;

  if (!sessionPublicId || typeof sessionPublicId !== "string") {
    return { success: false, error: "SIGNALING_INVALID_SESSION", message: "Identificador da sessão inválido." };
  }

  if (!clientMessageId || typeof clientMessageId !== "string" || clientMessageId.length > 36) {
    return { success: false, error: "SIGNALING_INVALID_MESSAGE_ID", message: "Identificador da mensagem inválido." };
  }

  if (!["OFFER", "ANSWER", "ICE_CANDIDATE", "ICE_COMPLETE"].includes(type)) {
    return { success: false, error: "SIGNALING_INVALID_TYPE", message: "Tipo de mensagem de sinalização desconhecido." };
  }

  const payloadString = typeof payload === "string" ? payload : JSON.stringify(payload ?? {});
  if (Buffer.byteLength(payloadString, "utf8") > MAX_SIGNALING_PAYLOAD_BYTES) {
    return { success: false, error: "SIGNALING_PAYLOAD_TOO_LARGE", message: "Tamanho do payload excede o limite permitido (64KB)." };
  }

  const access = await resolveConsultationJoinAccess(actorUserId, consultancySlug, consultationPublicId);
  if (!access.allowed) {
    return {
      success: false,
      error: access.reason,
      message: "Acesso não autorizado para envio de sinalização.",
    };
  }

  const isProfessional = access.participantKind === "PROFESSIONAL";

  // Validate message direction
  if (type === "OFFER" && !isProfessional) {
    return {
      success: false,
      error: "SIGNALING_INVALID_ROLE",
      message: "Apenas o profissional pode publicar OFFER.",
    };
  }

  if (type === "ANSWER" && isProfessional) {
    return {
      success: false,
      error: "SIGNALING_INVALID_ROLE",
      message: "Apenas o aluno pode publicar ANSWER.",
    };
  }

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await connection.query("SET SESSION time_zone = '+00:00';");

    // 1. Fetch consultation internal IDs
    const [consRows] = await connection.query<InternalConsultationRow[]>(
      `SELECT c.id, c.consultancy_id,
              sm.id AS student_membership_id, pm.id AS professional_membership_id
       FROM consultations c
       JOIN consultancy_members sm ON sm.public_id = ?
       JOIN consultancy_members pm ON pm.public_id = ?
       WHERE c.public_id = ?
       FOR UPDATE`,
      [
        access.consultation.student.membershipPublicId,
        access.consultation.professional.membershipPublicId,
        consultationPublicId,
      ]
    );

    if (consRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "CONSULTATION_NOT_FOUND", message: "Consulta não encontrada." };
    }

    const cons = consRows[0];
    const actorMembershipId = isProfessional
      ? cons.professional_membership_id
      : cons.student_membership_id;

    // 2. Verify signaling session
    const [sessRows] = await connection.query<InternalSignalingSessionRow[]>(
      `SELECT id, consultation_id, closed_at, expires_at
       FROM consultation_signaling_sessions
       WHERE public_id = ? AND consultation_id = ?
       FOR UPDATE`,
      [sessionPublicId, cons.id]
    );

    if (sessRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "SIGNALING_SESSION_NOT_FOUND", message: "Sessão de sinalização não encontrada para esta consulta." };
    }

    const sessionRow = sessRows[0];
    if (sessionRow.closed_at !== null) {
      await connection.rollback();
      return { success: false, error: "SIGNALING_SESSION_CLOSED", message: "Esta sessão de sinalização já foi encerrada." };
    }

    if (new Date(sessionRow.expires_at).getTime() <= Date.now()) {
      await connection.rollback();
      return { success: false, error: "SIGNALING_SESSION_EXPIRED", message: "Sessão de sinalização expirada." };
    }

    // 3. Cardinality check for OFFER / ANSWER (only 1 per session unless same clientMessageId)
    if (type === "OFFER" || type === "ANSWER") {
      const [existingSdp] = await connection.query<RowDataPacket[]>(
        `SELECT client_message_id FROM consultation_signaling_messages
         WHERE signaling_session_id = ? AND message_type = ?
         LIMIT 1
         FOR UPDATE`,
        [sessionRow.id, type]
      );

      if (existingSdp.length > 0 && existingSdp[0].client_message_id !== clientMessageId) {
        await connection.rollback();
        return {
          success: false,
          error: "SIGNALING_SDP_ALREADY_EXISTS",
          message: `Já existe um ${type} ativo para esta sessão de sinalização.`,
        };
      }
    }

    // 4. Insert message with idempotency
    const messageExpiresAt = new Date(Date.now() + SIGNALING_MESSAGE_TTL_MINUTES * 60 * 1000);

    const [insertRes] = await connection.query<ResultSetHeader>(
      `INSERT INTO consultation_signaling_messages (
        signaling_session_id, sender_membership_id, client_message_id, message_type, payload, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,
      [sessionRow.id, actorMembershipId, clientMessageId, type, payloadString, messageExpiresAt]
    );

    await connection.commit();

    return {
      success: true,
      messageId: clientMessageId,
      cursor: String(insertRes.insertId),
    };
  } catch {
    await connection.rollback();
    return {
      success: false,
      error: "SIGNALING_INTERNAL_ERROR",
      message: "Erro interno ao publicar mensagem de sinalização.",
    };
  } finally {
    connection.release();
  }
}

export async function pollSignalingMessages(
  actorUserId: number,
  consultancySlug: string,
  consultationPublicId: string,
  sessionPublicId: string,
  afterCursor?: string,
  limit: number = 50
): Promise<SignalingPollResult> {
  if (!sessionPublicId || typeof sessionPublicId !== "string") {
    return { success: false, error: "SIGNALING_INVALID_SESSION", message: "Identificador da sessão inválido." };
  }

  const access = await resolveConsultationJoinAccess(actorUserId, consultancySlug, consultationPublicId);
  if (!access.allowed) {
    return {
      success: false,
      error: access.reason,
      message: "Acesso não autorizado para consulta de sinalização.",
    };
  }

  const isProfessional = access.participantKind === "PROFESSIONAL";
  const pool = getDbPool();

  // 1. Fetch consultation internal IDs
  const [consRows] = await pool.query<InternalConsultationRow[]>(
    `SELECT c.id, sm.id AS student_membership_id, pm.id AS professional_membership_id
     FROM consultations c
     JOIN consultancy_members sm ON sm.public_id = ?
     JOIN consultancy_members pm ON pm.public_id = ?
     WHERE c.public_id = ?`,
    [
      access.consultation.student.membershipPublicId,
      access.consultation.professional.membershipPublicId,
      consultationPublicId,
    ]
  );

  if (consRows.length === 0) {
    return { success: false, error: "CONSULTATION_NOT_FOUND", message: "Consulta não encontrada." };
  }

  const cons = consRows[0];
  const actorMembershipId = isProfessional
    ? cons.professional_membership_id
    : cons.student_membership_id;

  // 2. Validate session
  const [sessRows] = await pool.query<InternalSignalingSessionRow[]>(
    `SELECT id, consultation_id, closed_at, expires_at
     FROM consultation_signaling_sessions
     WHERE public_id = ? AND consultation_id = ?`,
    [sessionPublicId, cons.id]
  );

  if (sessRows.length === 0) {
    return { success: false, error: "SIGNALING_SESSION_NOT_FOUND", message: "Sessão de sinalização não encontrada." };
  }

  const sessionRow = sessRows[0];
  if (sessionRow.closed_at !== null) {
    return { success: false, error: "SIGNALING_SESSION_CLOSED", message: "Sessão de sinalização encerrada." };
  }

  if (new Date(sessionRow.expires_at).getTime() <= Date.now()) {
    return { success: false, error: "SIGNALING_SESSION_EXPIRED", message: "Sessão de sinalização expirada." };
  }

  // 3. Fetch remote messages (exclude actor's own messages)
  const safeCursor = afterCursor ? BigInt(afterCursor) : BigInt("0");
  const boundedLimit = Math.max(1, Math.min(limit, 50));
  const queryNow = new Date();

  const [msgRows] = await pool.query<InternalSignalingMessageRow[]>(
    `SELECT id, sender_membership_id, client_message_id, message_type, payload, created_at, expires_at
     FROM consultation_signaling_messages
     WHERE signaling_session_id = ?
       AND sender_membership_id != ?
       AND id > ?
       AND expires_at > ?
     ORDER BY id ASC
     LIMIT ?`,
    [sessionRow.id, actorMembershipId, safeCursor.toString(), queryNow, boundedLimit]
  );

  const studentMemberId = cons.student_membership_id;

  const messages: SignalingMessageDto[] = msgRows.map((row: InternalSignalingMessageRow) => {
    let parsedPayload: unknown = row.payload;
    try {
      parsedPayload = JSON.parse(row.payload);
    } catch {}

    return {
      id: row.client_message_id,
      sender: row.sender_membership_id === studentMemberId ? "STUDENT" : "PROFESSIONAL",
      type: row.message_type as SignalingMessageType,
      payload: parsedPayload,
      cursor: String(row.id),
      createdAt: new Date(row.created_at).toISOString(),
    };
  });

  const nextCursor = messages.length > 0 ? messages[messages.length - 1].cursor : (afterCursor || "0");

  // Non-blocking request-driven cleanup of expired messages in this session
  pool.query(
    `DELETE FROM consultation_signaling_messages
     WHERE signaling_session_id = ? AND expires_at <= ?`,
    [sessionRow.id, queryNow]
  ).catch(() => {});

  return {
    success: true,
    messages,
    nextCursor,
  };
}
