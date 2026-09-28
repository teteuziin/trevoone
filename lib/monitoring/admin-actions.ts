import crypto from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "@/lib/db/mysql";
import { recordConsultancyActivity } from "@/lib/consultancies/activity-log";

export type ProfessionalAdminActionType =
  | "SEND_WARNING"
  | "REQUEST_REVIEW"
  | "REQUEST_JUSTIFICATION"
  | "PAUSE_NEW_ASSIGNMENTS";

export const ACTION_TYPE_LABELS: Record<ProfessionalAdminActionType, string> = {
  SEND_WARNING: "Registrar aviso",
  REQUEST_REVIEW: "Solicitar revisão",
  REQUEST_JUSTIFICATION: "Solicitar justificativa",
  PAUSE_NEW_ASSIGNMENTS: "Pausar novos alunos",
};

export interface ProfessionalAdminActionRecord {
  id: number;
  publicId: string;
  consultancyId: number;
  professionalMemberId: number;
  professionalName?: string;
  professionalRole?: string;
  adminMemberId: number;
  adminName?: string;
  actionType: ProfessionalAdminActionType;
  actionTypeLabel: string;
  reason: string;
  status: "ACTIVE" | "RESOLVED" | "CANCELLED";
  expiresAt: Date | null;
  resolvedAt: Date | null;
  resolutionNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function createProfessionalAdminAction(
  consultancyId: number,
  professionalMemberId: number,
  adminMemberId: number,
  adminUserId: number,
  actionType: ProfessionalAdminActionType,
  reason: string,
  expiresAt?: Date | null
): Promise<{ success: boolean; error?: string; actionPublicId?: string }> {
  if (!reason || !reason.trim()) {
    return { success: false, error: "É obrigatório informar a justificativa/motivo da ação." };
  }

  const validActions: ProfessionalAdminActionType[] = [
    "SEND_WARNING",
    "REQUEST_REVIEW",
    "REQUEST_JUSTIFICATION",
    "PAUSE_NEW_ASSIGNMENTS",
  ];
  if (!validActions.includes(actionType)) {
    return { success: false, error: "Tipo de ação administrativa inválido." };
  }

  const connection = await getDbConnection();
  try {
    // 1. Verify target professional is an active member in this tenancy
    const [profRows] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id, u.full_name, cmr.role
       FROM consultancy_members cm
       JOIN users u ON u.id = cm.user_id
       JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.id = ? AND cm.consultancy_id = ? AND cm.status = 'ACTIVE'
         AND cmr.role IN ('PERSONAL', 'NUTRITIONIST')
       LIMIT 1;`,
      [professionalMemberId, consultancyId]
    );

    if (!Array.isArray(profRows) || profRows.length === 0) {
      return { success: false, error: "Profissional não encontrado ou inativo nesta consultoria." };
    }
    const profName = profRows[0].full_name;

    const publicId = crypto.randomUUID();

    // 2. Insert action
    await connection.execute(
      `INSERT INTO professional_admin_actions (
         public_id, consultancy_id, professional_member_id, admin_member_id,
         action_type, reason, status, expires_at
       ) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?);`,
      [
        publicId,
        consultancyId,
        professionalMemberId,
        adminMemberId,
        actionType,
        reason.trim(),
        expiresAt || null,
      ]
    );

    // 3. Record audit event
    await recordConsultancyActivity({
      consultancyId,
      actorUserId: adminUserId,
      actorMembershipId: adminMemberId,
      actorRole: "CONSULTANCY_ADMIN",
      action: `ADMIN_ACTION_${actionType}`,
      module: "ADMIN",
      resourceType: "professional_admin_actions",
      resourcePublicId: publicId,
      subjectMembershipId: professionalMemberId,
      summary: `Ação administrativa (${ACTION_TYPE_LABELS[actionType]}) registrada para ${profName}. Motivo: ${reason.trim()}`,
      metadata: { actionType, professionalMemberId, reason: reason.trim() },
    });

    return { success: true, actionPublicId: publicId };
  } finally {
    connection.release();
  }
}

export async function resolveProfessionalAdminAction(
  consultancyId: number,
  actionId: number,
  adminMemberId: number,
  adminUserId: number,
  resolutionNote?: string
): Promise<{ success: boolean; error?: string }> {
  const connection = await getDbConnection();
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, professional_member_id, action_type, status
       FROM professional_admin_actions
       WHERE id = ? AND consultancy_id = ?
       LIMIT 1;`,
      [actionId, consultancyId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return { success: false, error: "Ação não encontrada." };
    }

    const action = rows[0];
    if (action.status !== "ACTIVE") {
      return { success: false, error: "Ação já foi finalizada ou cancelada." };
    }

    await connection.execute(
      `UPDATE professional_admin_actions
       SET status = 'RESOLVED',
           resolved_at = UTC_TIMESTAMP(3),
           resolved_by_member_id = ?,
           resolution_note = ?,
           updated_at = UTC_TIMESTAMP(3)
       WHERE id = ? AND consultancy_id = ?;`,
      [adminMemberId, resolutionNote?.trim() || null, actionId, consultancyId]
    );

    await recordConsultancyActivity({
      consultancyId,
      actorUserId: adminUserId,
      actorMembershipId: adminMemberId,
      actorRole: "CONSULTANCY_ADMIN",
      action: "RESOLVE_PROFESSIONAL_ADMIN_ACTION",
      module: "ADMIN",
      resourceType: "professional_admin_actions",
      resourcePublicId: String(actionId),
      subjectMembershipId: action.professional_member_id,
      summary: "Ação administrativa resolvida pelo administrador.",
      metadata: { actionId, resolutionNote },
    });

    return { success: true };
  } finally {
    connection.release();
  }
}

export async function isProfessionalAssignmentPaused(
  consultancyId: number,
  professionalMemberId: number
): Promise<boolean> {
  const connection = await getDbConnection();
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM professional_admin_actions
       WHERE consultancy_id = ? AND professional_member_id = ?
         AND action_type = 'PAUSE_NEW_ASSIGNMENTS' AND status = 'ACTIVE'
         AND (expires_at IS NULL OR expires_at > UTC_TIMESTAMP(3))
       LIMIT 1;`,
      [consultancyId, professionalMemberId]
    );
    return Array.isArray(rows) && rows.length > 0;
  } finally {
    connection.release();
  }
}

export async function getProfessionalActionsHistory(
  consultancyId: number,
  professionalMemberId?: number
): Promise<ProfessionalAdminActionRecord[]> {
  const connection = await getDbConnection();
  try {
    let sql = `SELECT paa.id, paa.public_id, paa.consultancy_id, paa.professional_member_id,
                     paa.admin_member_id, paa.action_type, paa.reason, paa.status,
                     paa.expires_at, paa.resolved_at, paa.resolution_note, paa.created_at, paa.updated_at,
                     u_prof.full_name AS professional_name, cmr_prof.role AS professional_role,
                     u_admin.full_name AS admin_name
              FROM professional_admin_actions paa
              JOIN consultancy_members cm_prof ON cm_prof.id = paa.professional_member_id
              JOIN users u_prof ON u_prof.id = cm_prof.user_id
              JOIN consultancy_member_roles cmr_prof ON cmr_prof.member_id = cm_prof.id
              JOIN consultancy_members cm_admin ON cm_admin.id = paa.admin_member_id
              JOIN users u_admin ON u_admin.id = cm_admin.user_id
              WHERE paa.consultancy_id = ?`;

    const params: any[] = [consultancyId];
    if (professionalMemberId) {
      sql += ` AND paa.professional_member_id = ?`;
      params.push(professionalMemberId);
    }
    sql += ` ORDER BY paa.created_at DESC LIMIT 50;`;

    const [rows] = await connection.execute<RowDataPacket[]>(sql, params);

    return rows.map((r) => ({
      id: Number(r.id),
      publicId: r.public_id,
      consultancyId: Number(r.consultancy_id),
      professionalMemberId: Number(r.professional_member_id),
      professionalName: r.professional_name,
      professionalRole: r.professional_role,
      adminMemberId: Number(r.admin_member_id),
      adminName: r.admin_name,
      actionType: r.action_type as ProfessionalAdminActionType,
      actionTypeLabel: ACTION_TYPE_LABELS[r.action_type as ProfessionalAdminActionType] || r.action_type,
      reason: r.reason,
      status: r.status,
      expiresAt: r.expires_at ? new Date(r.expires_at) : null,
      resolvedAt: r.resolved_at ? new Date(r.resolved_at) : null,
      resolutionNote: r.resolution_note,
      createdAt: new Date(r.created_at),
      updatedAt: new Date(r.updated_at),
    }));
  } finally {
    connection.release();
  }
}

export const listProfessionalAdminActions = getProfessionalActionsHistory;
