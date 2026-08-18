import type { RowDataPacket } from "mysql2/promise";
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
