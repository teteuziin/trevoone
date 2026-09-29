import type { RowDataPacket } from "mysql2/promise";
import crypto from "node:crypto";
import { getDbPool, getDbConnection } from "../db/mysql";
import { markAsRead } from "../../repositories/notification-repository";
import { recordConsultancyActivity } from "./activity-log";
import type { ConsultancyRole } from "./context";

export interface ConsultancyAnnouncementDto {
  publicId: string;
  title: string;
  body: string;
  priority: "NORMAL" | "HIGH" | "CRITICAL";
  createdAt: string; // ISO string
  authorName: string;
  authorPublicId: string | null;
  authorHasPhoto: boolean;
  authorPhotoUpdatedAt: string | null;
}

export interface PublishAnnouncementInput {
  consultancySlug: string;
  title: string;
  body: string;
  priority?: "NORMAL" | "HIGH" | "CRITICAL";
  targetAudience: "ALL_STUDENTS" | "ALL_MEMBERS" | "SPECIFIC_USER";
  targetUserPublicId?: string | null;
}

export interface PublishAnnouncementResult {
  success: boolean;
  recipientsCount: number;
  error?: string;
}

/**
 * Fetches all unread announcements addressed to a specific user in a specific consultancy.
 * Strictly respects tenancy (un.consultancy_id = ?) and read receipts (un.read_at IS NULL).
 * Ordered chronologically ASC so the user reads older announcements first.
 */
export async function listUnreadAnnouncementsForUser(
  userId: number,
  consultancyId: number
): Promise<ConsultancyAnnouncementDto[]> {
  if (!userId || !consultancyId) {
    return [];
  }

  const pool = getDbPool();
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        un.public_id,
        un.priority,
        un.title,
        un.body,
        un.created_at,
        author.full_name AS author_name,
        author.public_id AS author_public_id,
        (author_profile.profile_photo_storage_key IS NOT NULL) AS author_has_photo,
        author_profile.profile_photo_updated_at AS author_photo_updated_at
      FROM user_notifications un
      LEFT JOIN users author ON (author.public_id = un.source_public_id OR CAST(author.id AS CHAR) = un.source_public_id)
      LEFT JOIN user_profiles author_profile ON author_profile.user_id = author.id
      WHERE un.user_id = ?
        AND un.consultancy_id = ?
        AND un.event_type IN ('ANNOUNCEMENT', 'COMUNICADO')
        AND un.read_at IS NULL
      ORDER BY un.created_at ASC;`,
      [userId, consultancyId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return [];
    }

    return rows.map((row) => ({
      publicId: String(row.public_id),
      title: String(row.title),
      body: String(row.body),
      priority: (row.priority === "CRITICAL" || row.priority === "HIGH") ? row.priority : "NORMAL",
      createdAt: new Date(row.created_at).toISOString(),
      authorName: row.author_name ? String(row.author_name) : "Equipe da consultoria",
      authorPublicId: row.author_public_id ? String(row.author_public_id) : null,
      authorHasPhoto: Boolean(row.author_has_photo),
      authorPhotoUpdatedAt: row.author_photo_updated_at
        ? new Date(row.author_photo_updated_at).toISOString()
        : null,
    }));
  } catch (err) {
    console.error("[ANNOUNCEMENTS] Error listing unread announcements:", err);
    return [];
  }
}

/**
 * Marks an announcement as read persistently in user_notifications table.
 * Strictly verifies that the announcement belongs to the requesting user.
 */
export async function markAnnouncementRead(
  userId: number,
  publicId: string
): Promise<boolean> {
  if (!userId || !publicId || typeof publicId !== "string" || publicId.trim().length === 0) {
    return false;
  }

  try {
    return await markAsRead(userId, publicId.trim());
  } catch (err) {
    console.error("[ANNOUNCEMENTS] Error marking announcement read:", err);
    return false;
  }
}

/**
 * Publishes an announcement to members of a consultancy.
 * Security & Tenancy:
 * - Actor must be an active member of this consultancy.
 * - Actor must have PERSONAL, NUTRITIONIST, or CONSULTANCY_ADMIN role.
 * - Recipients must belong to the exact same consultancy (strictly tenant-isolated).
 */
export async function publishConsultancyAnnouncement(
  actorUserId: number,
  input: PublishAnnouncementInput
): Promise<PublishAnnouncementResult> {
  const {
    consultancySlug,
    title,
    body,
    priority = "NORMAL",
    targetAudience,
    targetUserPublicId,
  } = input;

  const cleanTitle = title?.trim();
  const cleanBody = body?.trim();

  if (!cleanTitle || cleanTitle.length < 3 || cleanTitle.length > 160) {
    return { success: false, recipientsCount: 0, error: "Título deve ter entre 3 e 160 caracteres." };
  }
  if (!cleanBody || cleanBody.length < 5 || cleanBody.length > 4000) {
    return { success: false, recipientsCount: 0, error: "O texto do comunicado deve ter entre 5 e 4000 caracteres." };
  }

  const safePriority = (priority === "CRITICAL" || priority === "HIGH") ? priority : "NORMAL";

  let connection;
  try {
    connection = await getDbConnection();

    // 1. Authorize actor in consultancy
    const [actorRows] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id AS membership_id, c.id AS consultancy_id, c.name AS consultancy_name,
              u.public_id AS actor_public_id, u.full_name AS actor_name, cmr.role
       FROM consultancy_members cm
       INNER JOIN consultancies c ON c.id = cm.consultancy_id
       INNER JOIN users u ON u.id = cm.user_id
       LEFT JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.user_id = ?
         AND c.slug = ?
         AND cm.status = 'ACTIVE'
         AND c.status = 'ACTIVE'
         AND c.deleted_at IS NULL;`,
      [actorUserId, consultancySlug.trim()]
    );

    if (!Array.isArray(actorRows) || actorRows.length === 0) {
      return { success: false, recipientsCount: 0, error: "Consultoria não encontrada ou acesso não autorizado." };
    }

    const consultancyId = Number(actorRows[0].consultancy_id);
    const actorPublicId = String(actorRows[0].actor_public_id);
    const actorName = String(actorRows[0].actor_name);
    const actorRoles = actorRows.map((r) => r.role as ConsultancyRole);

    const isAuthorizedPublisher =
      actorRoles.includes("CONSULTANCY_ADMIN") ||
      actorRoles.includes("PERSONAL") ||
      actorRoles.includes("NUTRITIONIST");

    if (!isAuthorizedPublisher) {
      return {
        success: false,
        recipientsCount: 0,
        error: "Apenas Administradores, Personal Trainers ou Nutricionistas podem publicar comunicados.",
      };
    }

    // 2. Resolve recipients based on targetAudience strictly within this consultancy
    let recipientUserIds: number[] = [];

    if (targetAudience === "SPECIFIC_USER") {
      if (!targetUserPublicId || typeof targetUserPublicId !== "string") {
        return { success: false, recipientsCount: 0, error: "Destinatário específico não informado." };
      }

      const [targetRows] = await connection.execute<RowDataPacket[]>(
        `SELECT cm.user_id
         FROM consultancy_members cm
         INNER JOIN users u ON u.id = cm.user_id
         WHERE u.public_id = ?
           AND cm.consultancy_id = ?
           AND cm.status = 'ACTIVE'
           AND u.status = 'ACTIVE'
           AND u.deleted_at IS NULL
         LIMIT 1;`,
        [targetUserPublicId.trim(), consultancyId]
      );

      if (!Array.isArray(targetRows) || targetRows.length === 0) {
        return { success: false, recipientsCount: 0, error: "Destinatário não encontrado nesta consultoria." };
      }

      recipientUserIds = [Number(targetRows[0].user_id)];
    } else if (targetAudience === "ALL_STUDENTS") {
      const [studentRows] = await connection.execute<RowDataPacket[]>(
        `SELECT DISTINCT cm.user_id
         FROM consultancy_members cm
         INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
         INNER JOIN users u ON u.id = cm.user_id
         WHERE cm.consultancy_id = ?
           AND cmr.role = 'STUDENT'
           AND cm.status = 'ACTIVE'
           AND u.status = 'ACTIVE'
           AND u.deleted_at IS NULL;`,
        [consultancyId]
      );

      recipientUserIds = studentRows.map((r) => Number(r.user_id));
    } else {
      // ALL_MEMBERS
      const [memberRows] = await connection.execute<RowDataPacket[]>(
        `SELECT DISTINCT cm.user_id
         FROM consultancy_members cm
         INNER JOIN users u ON u.id = cm.user_id
         WHERE cm.consultancy_id = ?
           AND cm.status = 'ACTIVE'
           AND u.status = 'ACTIVE'
           AND u.deleted_at IS NULL;`,
        [consultancyId]
      );

      recipientUserIds = memberRows.map((r) => Number(r.user_id));
    }

    if (recipientUserIds.length === 0) {
      return { success: true, recipientsCount: 0 };
    }

    // 3. Batch insert notifications inside transaction
    await connection.beginTransaction();

    try {
      for (const recipientId of recipientUserIds) {
        const publicId = crypto.randomBytes(16).toString("hex");
        await connection.execute(
          `INSERT INTO user_notifications (
            public_id,
            user_id,
            consultancy_id,
            priority,
            event_type,
            title,
            body,
            source_type,
            source_public_id,
            created_at
          ) VALUES (?, ?, ?, ?, 'ANNOUNCEMENT', ?, ?, 'ANNOUNCEMENT', ?, UTC_TIMESTAMP(3));`,
          [
            publicId,
            recipientId,
            consultancyId,
            safePriority,
            cleanTitle,
            cleanBody,
            actorPublicId,
          ]
        );
      }

      await connection.commit();
    } catch (txError) {
      await connection.rollback();
      throw txError;
    }

    // 4. Record consultancy activity event (best-effort)
    try {
      await recordConsultancyActivity({
        consultancyId,
        actorUserId,
        actorRole: actorRoles.includes("CONSULTANCY_ADMIN")
          ? "CONSULTANCY_ADMIN"
          : actorRoles[0] || "PERSONAL",
        action: "ANNOUNCEMENT_PUBLISHED",
        module: "ADMIN",
        resourceType: "COMMUNICATION",
        resourcePublicId: actorPublicId,
        summary: `Comunicado publicado: ${cleanTitle}`,
        metadata: {
          title: cleanTitle,
          priority: safePriority,
          targetAudience,
          recipientsCount: recipientUserIds.length,
          publishedBy: actorName,
        },
      });
    } catch {
      // activity logging is non-blocking
    }

    return { success: true, recipientsCount: recipientUserIds.length };
  } catch (err: unknown) {
    console.error("[ANNOUNCEMENTS] Error publishing announcement:", err);
    return {
      success: false,
      recipientsCount: 0,
      error: err instanceof Error ? err.message : "Erro ao publicar comunicado.",
    };
  } finally {
    if (connection) connection.release();
  }
}
