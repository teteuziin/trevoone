import type { RowDataPacket } from "mysql2/promise";
import { getDbPool, getDbConnection } from "@/lib/db/mysql";
import {
  createNotificationInTransaction,
  deliverNotificationAfterCommit,
} from "@/services/notification-service";

export type SupportRole = "CONSULTANCY_ADMIN" | "PERSONAL" | "NUTRITIONIST";

export interface SupportRecipientDto {
  membershipPublicId: string;
  role: SupportRole;
  roleLabel: string;
  fullName: string;
  isDefaultFallback: boolean;
}

export interface SendSupportMessageInput {
  studentUserId: number;
  consultancySlug: string;
  recipientMembershipPublicId?: string | null;
  targetRole?: SupportRole | null;
  subject: string;
  message: string;
}

export interface SendSupportMessageResult {
  success: boolean;
  recipientName: string;
  recipientRoleLabel: string;
  notificationPublicId: string;
}

function getRoleLabel(role: SupportRole): string {
  switch (role) {
    case "CONSULTANCY_ADMIN":
      return "Administração da consultoria";
    case "PERSONAL":
      return "Personal Trainer";
    case "NUTRITIONIST":
      return "Nutricionista";
    default:
      return "Equipe";
  }
}

/**
 * Lists active professional recipients for the given consultancy.
 * Security: Validates that studentUserId is an active member in this consultancy.
 */
export async function listConsultancySupportRecipients(
  consultancySlug: string,
  studentUserId: number
): Promise<SupportRecipientDto[]> {
  const pool = getDbPool();

  // 1. Verify student membership in this consultancy
  const [studentRows] = await pool.execute<RowDataPacket[]>(
    `SELECT cm.id
     FROM consultancy_members cm
     INNER JOIN consultancies c ON c.id = cm.consultancy_id
     INNER JOIN users u ON u.id = cm.user_id
     WHERE c.slug = ?
       AND cm.user_id = ?
       AND cm.status = 'ACTIVE'
       AND c.status = 'ACTIVE'
       AND c.deleted_at IS NULL
       AND u.status = 'ACTIVE'
       AND u.deleted_at IS NULL
     LIMIT 1`,
    [consultancySlug, studentUserId]
  );

  if (studentRows.length === 0) {
    return [];
  }

  // 2. Query active professionals in the SAME consultancy
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT
       cm.public_id AS membership_public_id,
       cmr.role,
       u.full_name
     FROM consultancy_members cm
     INNER JOIN consultancies c ON c.id = cm.consultancy_id
     INNER JOIN users u ON u.id = cm.user_id
     INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
     WHERE c.slug = ?
       AND c.status = 'ACTIVE'
       AND c.deleted_at IS NULL
       AND cm.status = 'ACTIVE'
       AND u.status = 'ACTIVE'
       AND u.deleted_at IS NULL
       AND cmr.role IN ('CONSULTANCY_ADMIN', 'PERSONAL', 'NUTRITIONIST')
     ORDER BY
       CASE cmr.role
         WHEN 'CONSULTANCY_ADMIN' THEN 1
         WHEN 'PERSONAL' THEN 2
         WHEN 'NUTRITIONIST' THEN 3
         ELSE 4
       END,
       u.full_name ASC`,
    [consultancySlug]
  );

  let hasFoundAdmin = false;

  return rows.map((r) => {
    const role = r.role as SupportRole;
    const isFallback = !hasFoundAdmin && role === "CONSULTANCY_ADMIN";
    if (isFallback) {
      hasFoundAdmin = true;
    }

    return {
      membershipPublicId: r.membership_public_id,
      role,
      roleLabel: getRoleLabel(role),
      fullName: r.full_name,
      isDefaultFallback: isFallback,
    };
  });
}

/**
 * Sends a real support message from a student to an active staff member of the consultancy.
 * Security & Tenant Rules:
 * - studentUserId is derived exclusively from server-side session.
 * - Validates student is active in consultancySlug.
 * - Recipient must be an active member of the SAME consultancy with role CONSULTANCY_ADMIN, PERSONAL, or NUTRITIONIST.
 * - Fallback: If chosen recipient is missing or invalid, directs to active CONSULTANCY_ADMIN.
 * - If no active CONSULTANCY_ADMIN exists in the consultancy, fails clearly (no arbitrary or cross-tenant dispatch).
 * - Persists message via official user_notifications infrastructure.
 */
export async function sendStudentSupportMessage(
  input: SendSupportMessageInput
): Promise<SendSupportMessageResult> {
  const trimmedSubject = input.subject?.trim();
  const trimmedMessage = input.message?.trim();

  if (!trimmedSubject || trimmedSubject.length < 3 || trimmedSubject.length > 120) {
    throw new Error("SUBJECT_INVALID");
  }
  if (!trimmedMessage || trimmedMessage.length < 5 || trimmedMessage.length > 1000) {
    throw new Error("MESSAGE_INVALID");
  }

  const connection = await getDbConnection();

  try {
    // 1. Verify student membership and retrieve student info
    const [studentRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
         c.id AS consultancy_id,
         c.name AS consultancy_name,
         c.slug AS consultancy_slug,
         cm.id AS student_membership_id,
         cm.public_id AS student_membership_public_id,
         u.id AS student_user_id,
         u.public_id AS student_public_id,
         u.full_name AS student_name,
         u.email AS student_email
       FROM consultancy_members cm
       INNER JOIN consultancies c ON c.id = cm.consultancy_id
       INNER JOIN users u ON u.id = cm.user_id
       WHERE c.slug = ?
         AND cm.user_id = ?
         AND cm.status = 'ACTIVE'
         AND c.status = 'ACTIVE'
         AND c.deleted_at IS NULL
         AND u.status = 'ACTIVE'
         AND u.deleted_at IS NULL
       LIMIT 1`,
      [input.consultancySlug, input.studentUserId]
    );

    if (studentRows.length === 0) {
      throw new Error("NOT_AUTHORIZED_STUDENT");
    }

    const student = studentRows[0];
    const consultancyId = Number(student.consultancy_id);

    // 2. Fetch all active professional candidates strictly in THIS consultancy
    const [recipientRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
         cm.id AS membership_id,
         cm.public_id AS membership_public_id,
         cm.user_id,
         cmr.role,
         u.full_name,
         u.email
       FROM consultancy_members cm
       INNER JOIN users u ON u.id = cm.user_id
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.consultancy_id = ?
         AND cm.status = 'ACTIVE'
         AND u.status = 'ACTIVE'
         AND u.deleted_at IS NULL
         AND cmr.role IN ('CONSULTANCY_ADMIN', 'PERSONAL', 'NUTRITIONIST')
       ORDER BY
         CASE cmr.role
           WHEN 'CONSULTANCY_ADMIN' THEN 1
           WHEN 'PERSONAL' THEN 2
           WHEN 'NUTRITIONIST' THEN 3
           ELSE 4
         END,
         u.full_name ASC`,
      [consultancyId]
    );

    if (recipientRows.length === 0) {
      throw new Error("NO_ACTIVE_ADMIN_AVAILABLE");
    }

    // 3. Resolve target recipient with fallback logic
    let targetRecipient: RowDataPacket | null = null;

    if (input.recipientMembershipPublicId) {
      targetRecipient =
        recipientRows.find((r) => r.membership_public_id === input.recipientMembershipPublicId) ||
        null;
    }

    if (!targetRecipient && input.targetRole) {
      targetRecipient = recipientRows.find((r) => r.role === input.targetRole) || null;
    }

    // Fallback: Must direct to an active CONSULTANCY_ADMIN
    if (!targetRecipient) {
      targetRecipient = recipientRows.find((r) => r.role === "CONSULTANCY_ADMIN") || null;
    }

    // If no active admin is available, fail clearly (strictly no arbitrary or cross-tenant dispatch)
    if (!targetRecipient) {
      throw new Error("NO_ACTIVE_ADMIN_AVAILABLE");
    }

    const role = targetRecipient.role as SupportRole;
    const roleLabel = getRoleLabel(role);

    // 4. Begin transaction & persist in user_notifications
    await connection.beginTransaction();

    const title = `[Suporte] ${trimmedSubject} — ${student.student_name}`.slice(0, 160);
    const body = `Mensagem enviada por ${student.student_name} (${student.student_email}) para ${roleLabel}:\n\n${trimmedMessage}`.slice(
      0,
      1000
    );
    const studentMemberId = student.student_membership_public_id
      ? String(student.student_membership_public_id)
      : "";
    const studentQuery = encodeURIComponent(
      String(student.student_email || student.student_name || "").trim()
    );

    let deepLink: string;
    if (role === "CONSULTANCY_ADMIN") {
      deepLink = studentQuery
        ? `/consultoria/${encodeURIComponent(input.consultancySlug)}/membros?q=${studentQuery}`
        : `/consultoria/${encodeURIComponent(input.consultancySlug)}/membros`;
    } else {
      // PERSONAL or NUTRITIONIST
      deepLink = studentMemberId
        ? `/consultoria/${encodeURIComponent(input.consultancySlug)}/progresso/alunos/${encodeURIComponent(studentMemberId)}`
        : `/consultoria/${encodeURIComponent(input.consultancySlug)}/progresso/alunos`;
    }

    const notification = await createNotificationInTransaction(connection, {
      userId: Number(targetRecipient.user_id),
      consultancyId,
      priority: "NORMAL",
      eventType: "SUPPORT_REQUEST",
      title,
      body,
      deepLink,
      dedupeKey: `support:${input.studentUserId}:${Date.now()}`,
      sourceType: "STUDENT_SUPPORT_MESSAGE",
      sourcePublicId: String(student.student_public_id),
    });

    await connection.commit();

    // 5. Trigger Web Push delivery after commit if active subscriptions exist
    try {
      await deliverNotificationAfterCommit(notification.id);
    } catch {
      // Non-blocking for Web Push external delivery
    }

    return {
      success: true,
      recipientName: targetRecipient.full_name,
      recipientRoleLabel: roleLabel,
      notificationPublicId: notification.public_id,
    };
  } catch (err) {
    try {
      await connection.rollback();
    } catch {
      // Ignore rollback failure if not in transaction
    }
    throw err;
  } finally {
    connection.release();
  }
}
