import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import crypto from "node:crypto";
import { getDbConnection } from "../db/mysql";
import { VALID_ROLES, type ConsultancyRole } from "./context";

export type ConsultancyAdminOverview = {
  activeMembers: number;
  students: number;
  personals: number;
  nutritionists: number;
  admins: number;
};

export type ConsultancyMemberItem = {
  membershipPublicId: string;
  fullName: string;
  email: string;
  status: "ACTIVE" | "INVITED" | "SUSPENDED" | string;
  statusLabel: string;
  roles: ConsultancyRole[];
};

export type ListConsultancyMembersResult = {
  members: ConsultancyMemberItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export const ADMIN_ROLE_LABELS: Record<ConsultancyRole, string> = {
  STUDENT: "Aluno",
  PERSONAL: "Personal",
  NUTRITIONIST: "Nutricionista",
  CONSULTANCY_ADMIN: "Administrador",
  INFLUENCER: "Influenciador / VIP",
};

export const MEMBERSHIP_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativo",
  INVITED: "Convidado",
  SUSPENDED: "Suspenso",
};

export function getMembershipStatusLabel(status: string): string {
  return MEMBERSHIP_STATUS_LABELS[status] || "Status indisponível";
}

function escapeLikePattern(str: string): string {
  return str.replace(/([\\%_])/g, "\\$1");
}

export async function getConsultancyAdminOverview(
  consultancyId: number
): Promise<ConsultancyAdminOverview> {
  if (!consultancyId || typeof consultancyId !== "number" || consultancyId <= 0) {
    return {
      activeMembers: 0,
      students: 0,
      personals: 0,
      nutritionists: 0,
      admins: 0,
    };
  }

  let connection;
  try {
    connection = await getDbConnection();
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        COUNT(DISTINCT CASE WHEN cm.status = 'ACTIVE' AND u.status = 'ACTIVE' AND u.deleted_at IS NULL THEN cm.id END) AS active_members,
        COUNT(DISTINCT CASE WHEN cm.status = 'ACTIVE' AND u.status = 'ACTIVE' AND u.deleted_at IS NULL AND cmr.role = 'STUDENT' THEN cm.id END) AS students,
        COUNT(DISTINCT CASE WHEN cm.status = 'ACTIVE' AND u.status = 'ACTIVE' AND u.deleted_at IS NULL AND cmr.role = 'PERSONAL' THEN cm.id END) AS personals,
        COUNT(DISTINCT CASE WHEN cm.status = 'ACTIVE' AND u.status = 'ACTIVE' AND u.deleted_at IS NULL AND cmr.role = 'NUTRITIONIST' THEN cm.id END) AS nutritionists,
        COUNT(DISTINCT CASE WHEN cm.status = 'ACTIVE' AND u.status = 'ACTIVE' AND u.deleted_at IS NULL AND cmr.role = 'CONSULTANCY_ADMIN' THEN cm.id END) AS admins
      FROM consultancy_members cm
      INNER JOIN users u ON u.id = cm.user_id
      LEFT JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
      WHERE cm.consultancy_id = ?;`,
      [consultancyId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return {
        activeMembers: 0,
        students: 0,
        personals: 0,
        nutritionists: 0,
        admins: 0,
      };
    }

    const row = rows[0];
    return {
      activeMembers: Number(row.active_members) || 0,
      students: Number(row.students) || 0,
      personals: Number(row.personals) || 0,
      nutritionists: Number(row.nutritionists) || 0,
      admins: Number(row.admins) || 0,
    };
  } catch {
    return {
      activeMembers: 0,
      students: 0,
      personals: 0,
      nutritionists: 0,
      admins: 0,
    };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export async function listConsultancyMembers(params: {
  consultancyId: number;
  query?: string;
  page?: number;
  pageSize?: number;
}): Promise<ListConsultancyMembersResult> {
  const { consultancyId } = params;
  if (!consultancyId || typeof consultancyId !== "number" || consultancyId <= 0) {
    return {
      members: [],
      total: 0,
      page: 1,
      pageSize: 25,
      totalPages: 1,
    };
  }

  const pageSize = 25;
  const rawPage = Number(params.page);
  const page = !isNaN(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const offset = (page - 1) * pageSize;

  const rawQuery = params.query ? String(params.query).trim().normalize("NFC") : "";
  const query = rawQuery.slice(0, 100);

  let connection;
  try {
    connection = await getDbConnection();

    // 1. Total count query
    let countSql = `
      SELECT COUNT(DISTINCT cm.id) AS total
      FROM consultancy_members cm
      INNER JOIN users u ON u.id = cm.user_id
      WHERE cm.consultancy_id = ?
        AND cm.status != 'REMOVED'
        AND u.deleted_at IS NULL
    `;
    const countParams: (number | string)[] = [consultancyId];

    if (query.length > 0) {
      const escaped = escapeLikePattern(query);
      countSql += ` AND (u.full_name LIKE ? ESCAPE '\\\\' OR u.email LIKE ? ESCAPE '\\\\')`;
      countParams.push(`%${escaped}%`, `%${escaped}%`);
    }

    const [countRows] = await connection.execute<RowDataPacket[]>(countSql, countParams);
    const total = Array.isArray(countRows) && countRows.length > 0 ? Number(countRows[0].total) || 0 : 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    if (total === 0) {
      return {
        members: [],
        total: 0,
        page,
        pageSize,
        totalPages: 1,
      };
    }

    // 2. Paginated members query
    let listSql = `
      SELECT
        cm.id AS membership_id,
        cm.public_id AS membership_public_id,
        u.full_name,
        u.email,
        cm.status AS membership_status,
        GROUP_CONCAT(DISTINCT cmr.role ORDER BY cmr.role ASC SEPARATOR ',') AS roles_csv
      FROM consultancy_members cm
      INNER JOIN users u ON u.id = cm.user_id
      LEFT JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
      WHERE cm.consultancy_id = ?
        AND cm.status != 'REMOVED'
        AND u.deleted_at IS NULL
    `;
    const listParams: (number | string)[] = [consultancyId];

    if (query.length > 0) {
      const escaped = escapeLikePattern(query);
      listSql += ` AND (u.full_name LIKE ? ESCAPE '\\\\' OR u.email LIKE ? ESCAPE '\\\\')`;
      listParams.push(`%${escaped}%`, `%${escaped}%`);
    }

    listSql += `
      GROUP BY cm.id, cm.public_id, u.full_name, u.email, cm.status
      ORDER BY u.full_name ASC, cm.id ASC
      LIMIT ${pageSize} OFFSET ${offset};
    `;

    const [rows] = await connection.execute<RowDataPacket[]>(listSql, listParams);

    if (!Array.isArray(rows)) {
      return {
        members: [],
        total,
        page,
        pageSize,
        totalPages,
      };
    }

    const members: ConsultancyMemberItem[] = rows.map((r) => {
      const rawRolesCsv = r.roles_csv ? String(r.roles_csv).split(",") : [];
      const roles = VALID_ROLES.filter((role) => rawRolesCsv.includes(role));
      const status = String(r.membership_status);

      return {
        membershipPublicId: String(r.membership_public_id),
        fullName: String(r.full_name),
        email: String(r.email),
        status,
        statusLabel: getMembershipStatusLabel(status),
        roles,
      };
    });

    return {
      members,
      total,
      page,
      pageSize,
      totalPages,
    };
  } catch {
    return {
      members: [],
      total: 0,
      page,
      pageSize,
      totalPages: 1,
    };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export type DeactivateConsultancyMemberParams = {
  consultancyId: number;
  actorUserId: number;
  memberPublicId: string;
};

export type DeactivateConsultancyMemberResult = {
  success: boolean;
  error?: string;
};

/**
 * Encerra com segurança o vínculo de um membro da consultoria.
 *
 * Princípios aplicados:
 * 1. Não executa DELETE físico; atualiza logicamente cm.status para 'SUSPENDED'.
 * 2. Bloqueia auto-remoção do usuário autenticado.
 * 3. Bloqueia desligamento se for o último CONSULTANCY_ADMIN ativo.
 * 4. Bloqueia operação sobre membership já inativo/inexistente ou cross-tenant.
 * 5. Preserva histórico intacto (não remove roles, treinos, dietas, fotos ou cobranças).
 * 6. Registra evento imutável em audit_events ('CONSULTANCY_MEMBER_DEACTIVATED').
 */
export async function deactivateConsultancyMember(
  params: DeactivateConsultancyMemberParams
): Promise<DeactivateConsultancyMemberResult> {
  const { consultancyId, actorUserId, memberPublicId } = params;

  if (!consultancyId || typeof consultancyId !== "number" || consultancyId <= 0) {
    return { success: false, error: "Consultoria inválida." };
  }
  if (!actorUserId || typeof actorUserId !== "number" || actorUserId <= 0) {
    return { success: false, error: "Usuário não autenticado." };
  }
  if (
    !memberPublicId ||
    typeof memberPublicId !== "string" ||
    memberPublicId.trim().length === 0 ||
    memberPublicId.trim().length > 36
  ) {
    return { success: false, error: "Identificador de membro inválido." };
  }

  const cleanMemberPublicId = memberPublicId.trim();

  let connection;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 1. Validar se o autor possui papel de CONSULTANCY_ADMIN ativo nesta consultoria
    const [actorRows] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id
       FROM consultancy_members cm
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.consultancy_id = ?
         AND cm.user_id = ?
         AND cm.status = 'ACTIVE'
         AND cmr.role = 'CONSULTANCY_ADMIN'
       LIMIT 1
       FOR UPDATE;`,
      [consultancyId, actorUserId]
    );

    if (!Array.isArray(actorRows) || actorRows.length === 0) {
      await connection.rollback();
      return {
        success: false,
        error: "Você não possui permissão de administrador nesta consultoria.",
      };
    }

    // 2. Localizar membership alvo dentro do mesmo tenant
    const [targetRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
         cm.id AS membership_id,
         cm.public_id AS membership_public_id,
         cm.user_id,
         cm.status,
         u.full_name,
         u.email,
         GROUP_CONCAT(DISTINCT cmr.role) AS roles_csv
       FROM consultancy_members cm
       INNER JOIN users u ON u.id = cm.user_id
       LEFT JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.public_id = ?
         AND cm.consultancy_id = ?
       GROUP BY cm.id, cm.public_id, cm.user_id, cm.status, u.full_name, u.email
       LIMIT 1
       FOR UPDATE;`,
      [cleanMemberPublicId, consultancyId]
    );

    if (!Array.isArray(targetRows) || targetRows.length === 0) {
      await connection.rollback();
      return {
        success: false,
        error: "Membro não encontrado nesta consultoria.",
      };
    }

    const target = targetRows[0];
    const targetUserId = Number(target.user_id);
    const targetMembershipId = Number(target.membership_id);
    const currentStatus = String(target.status);

    // 3. Regra B: Bloquear auto-remoção
    if (targetUserId === actorUserId) {
      await connection.rollback();
      return {
        success: false,
        error: "Não é permitido desligar o próprio usuário nesta ação administrativa.",
      };
    }

    // 4. Regra: Membro já inativo (idempotência segura / bloqueio)
    if (currentStatus !== "ACTIVE") {
      await connection.rollback();
      return {
        success: false,
        error: "Este membro já se encontra inativo ou desligado.",
      };
    }

    // 5. Regra A: Proteção do último administrador ativo
    const rawRoles = target.roles_csv ? String(target.roles_csv).split(",") : [];
    const isTargetAdmin = rawRoles.includes("CONSULTANCY_ADMIN");

    if (isTargetAdmin) {
      const [adminCountRows] = await connection.execute<RowDataPacket[]>(
        `SELECT COUNT(DISTINCT cm.id) AS active_admins
         FROM consultancy_members cm
         INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
         INNER JOIN users u ON u.id = cm.user_id
         WHERE cm.consultancy_id = ?
           AND cm.status = 'ACTIVE'
           AND cmr.role = 'CONSULTANCY_ADMIN'
           AND u.status = 'ACTIVE'
           AND u.deleted_at IS NULL
         FOR UPDATE;`,
        [consultancyId]
      );

      const activeAdmins =
        Array.isArray(adminCountRows) && adminCountRows.length > 0
          ? Number(adminCountRows[0].active_admins) || 0
          : 0;

      if (activeAdmins <= 1) {
        await connection.rollback();
        return {
          success: false,
          error: "Não é possível remover o último administrador ativo da consultoria.",
        };
      }
    }

    // 6. Atualizar status para SUSPENDED (sem apagar histórico nem roles)
    const [updateResult] = await connection.execute<ResultSetHeader>(
      `UPDATE consultancy_members
       SET status = 'SUSPENDED',
           updated_at = UTC_TIMESTAMP(3)
       WHERE id = ?
         AND consultancy_id = ?
         AND status = 'ACTIVE';`,
      [targetMembershipId, consultancyId]
    );

    if (updateResult.affectedRows !== 1) {
      await connection.rollback();
      return {
        success: false,
        error: "Não foi possível atualizar o status do membro. Tente novamente.",
      };
    }

    // 7. Registrar evento de auditoria
    const auditPublicId = crypto.randomUUID();
    await connection.execute<ResultSetHeader>(
      `INSERT INTO audit_events (
        public_id,
        actor_user_id,
        consultancy_id,
        action,
        target_type,
        target_public_id,
        metadata_json,
        created_at
      ) VALUES (
        ?,
        ?,
        ?,
        'CONSULTANCY_MEMBER_DEACTIVATED',
        'CONSULTANCY_MEMBER',
        ?,
        ?,
        UTC_TIMESTAMP(3)
      );`,
      [
        auditPublicId,
        actorUserId,
        consultancyId,
        cleanMemberPublicId,
        JSON.stringify({
          previousStatus: currentStatus,
          newStatus: "SUSPENDED",
          targetUserId,
          targetRoles: rawRoles,
        }),
      ]
    );

    await connection.commit();
    return { success: true };
  } catch {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        // Ignorado
      }
    }
    return {
      success: false,
      error: "Ocorreu um erro interno ao processar o desligamento do membro.",
    };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
