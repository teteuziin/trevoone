import type { RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";

export type ConsultancyRole =
  | "STUDENT"
  | "PERSONAL"
  | "NUTRITIONIST"
  | "CONSULTANCY_ADMIN"
  | "INFLUENCER";

export const VALID_ROLES: readonly ConsultancyRole[] = [
  "STUDENT",
  "PERSONAL",
  "NUTRITIONIST",
  "CONSULTANCY_ADMIN",
  "INFLUENCER",
];

export const ROLE_LABELS: Record<ConsultancyRole, string> = {
  STUDENT: "Aluno",
  PERSONAL: "Personal Trainer",
  NUTRITIONIST: "Nutricionista",
  CONSULTANCY_ADMIN: "Administrador da consultoria",
  INFLUENCER: "Influenciador / VIP",
};

export type AccessibleConsultancy = {
  consultancyId: number;
  consultancyPublicId: string;
  consultancyName: string;
  consultancySlug: string;
  consultancyLogoUrl: string | null;
  consultancyTimezone: string;
  membershipId: number;
  membershipPublicId: string;
  roles: ConsultancyRole[];
};

export type ConfiguringConsultancy = {
  consultancyId: number;
  consultancyPublicId: string;
  consultancyName: string;
  consultancySlug: string;
  consultancyLogoUrl: string | null;
  consultancyTimezone: string;
  membershipId: number;
  membershipPublicId: string;
};

export type UserConsultanciesResult = {
  accessible: AccessibleConsultancy[];
  configuring: ConfiguringConsultancy[];
};

function isValidRole(role: unknown): role is ConsultancyRole {
  return typeof role === "string" && VALID_ROLES.includes(role as ConsultancyRole);
}

function sortRoles(roles: ConsultancyRole[]): ConsultancyRole[] {
  return VALID_ROLES.filter((r) => roles.includes(r));
}

export async function listUserConsultancies(
  userId: number
): Promise<UserConsultanciesResult> {
  if (!userId || typeof userId !== "number" || userId <= 0) {
    return { accessible: [], configuring: [] };
  }

  let connection;
  try {
    connection = await getDbConnection();
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        c.id AS consultancy_id,
        c.public_id AS consultancy_public_id,
        c.name AS consultancy_name,
        c.slug AS consultancy_slug,
        c.logo_url AS consultancy_logo_url,
        c.timezone AS consultancy_timezone,
        cm.id AS membership_id,
        cm.public_id AS membership_public_id,
        cmr.role
      FROM consultancy_members cm
      INNER JOIN consultancies c ON c.id = cm.consultancy_id
      LEFT JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
      WHERE cm.user_id = ?
        AND cm.status = 'ACTIVE'
        AND c.status = 'ACTIVE'
        AND c.deleted_at IS NULL
      ORDER BY c.name ASC, cm.id ASC;`,
      [userId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return { accessible: [], configuring: [] };
    }

    const map = new Map<
      number,
      {
        consultancyId: number;
        consultancyPublicId: string;
        consultancyName: string;
        consultancySlug: string;
        consultancyLogoUrl: string | null;
        consultancyTimezone: string;
        membershipId: number;
        membershipPublicId: string;
        rolesSet: Set<ConsultancyRole>;
      }
    >();

    for (const row of rows) {
      const membershipId = Number(row.membership_id);
      if (!map.has(membershipId)) {
        map.set(membershipId, {
          consultancyId: Number(row.consultancy_id),
          consultancyPublicId: String(row.consultancy_public_id),
          consultancyName: String(row.consultancy_name),
          consultancySlug: String(row.consultancy_slug),
          consultancyLogoUrl: row.consultancy_logo_url
            ? String(row.consultancy_logo_url)
            : null,
          consultancyTimezone: String(row.consultancy_timezone),
          membershipId,
          membershipPublicId: String(row.membership_public_id),
          rolesSet: new Set<ConsultancyRole>(),
        });
      }

      if (isValidRole(row.role)) {
        map.get(membershipId)?.rolesSet.add(row.role);
      }
    }

    const accessible: AccessibleConsultancy[] = [];
    const configuring: ConfiguringConsultancy[] = [];

    for (const item of map.values()) {
      const roles = sortRoles(Array.from(item.rolesSet));
      if (roles.length >= 1) {
        accessible.push({
          consultancyId: item.consultancyId,
          consultancyPublicId: item.consultancyPublicId,
          consultancyName: item.consultancyName,
          consultancySlug: item.consultancySlug,
          consultancyLogoUrl: item.consultancyLogoUrl,
          consultancyTimezone: item.consultancyTimezone,
          membershipId: item.membershipId,
          membershipPublicId: item.membershipPublicId,
          roles,
        });
      } else {
        configuring.push({
          consultancyId: item.consultancyId,
          consultancyPublicId: item.consultancyPublicId,
          consultancyName: item.consultancyName,
          consultancySlug: item.consultancySlug,
          consultancyLogoUrl: item.consultancyLogoUrl,
          consultancyTimezone: item.consultancyTimezone,
          membershipId: item.membershipId,
          membershipPublicId: item.membershipPublicId,
        });
      }
    }

    return { accessible, configuring };
  } catch {
    return { accessible: [], configuring: [] };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export async function resolveConsultancyContext(
  userId: number,
  slug: string
): Promise<AccessibleConsultancy | null> {
  if (
    !userId ||
    typeof userId !== "number" ||
    userId <= 0 ||
    !slug ||
    typeof slug !== "string" ||
    slug.trim().length === 0 ||
    slug.length > 120
  ) {
    return null;
  }

  const normalizedSlug = slug.trim();

  let connection;
  try {
    connection = await getDbConnection();
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        c.id AS consultancy_id,
        c.public_id AS consultancy_public_id,
        c.name AS consultancy_name,
        c.slug AS consultancy_slug,
        c.logo_url AS consultancy_logo_url,
        c.timezone AS consultancy_timezone,
        cm.id AS membership_id,
        cm.public_id AS membership_public_id,
        cmr.role
      FROM consultancy_members cm
      INNER JOIN consultancies c ON c.id = cm.consultancy_id
      LEFT JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
      WHERE cm.user_id = ?
        AND c.slug = ?
        AND cm.status = 'ACTIVE'
        AND c.status = 'ACTIVE'
        AND c.deleted_at IS NULL;`,
      [userId, normalizedSlug]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    const firstRow = rows[0];
    const rolesSet = new Set<ConsultancyRole>();

    for (const row of rows) {
      if (isValidRole(row.role)) {
        rolesSet.add(row.role);
      }
    }

    const roles = sortRoles(Array.from(rolesSet));
    if (roles.length === 0) {
      return null;
    }

    return {
      consultancyId: Number(firstRow.consultancy_id),
      consultancyPublicId: String(firstRow.consultancy_public_id),
      consultancyName: String(firstRow.consultancy_name),
      consultancySlug: String(firstRow.consultancy_slug),
      consultancyLogoUrl: firstRow.consultancy_logo_url
        ? String(firstRow.consultancy_logo_url)
        : null,
      consultancyTimezone: String(firstRow.consultancy_timezone),
      membershipId: Number(firstRow.membership_id),
      membershipPublicId: String(firstRow.membership_public_id),
      roles,
    };
  } catch {
    return null;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

