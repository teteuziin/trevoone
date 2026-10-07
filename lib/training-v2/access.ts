/**
 * TREVO ONE — TRAINING V2 ACCESS & CONTEXT FOUNDATION
 * Resolves trusted session and tenancy context. Enforces role-based capabilities.
 */

import type { RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";
import { getCurrentSession } from "../auth/session";
import { getPlatformAdminAccess } from "../platform-admin/access";
import { cookies } from "next/headers";
import { VIEW_MODE_COOKIE_NAME } from "../consultancies/view-mode";
import type { ConsultancyRole } from "../consultancies/context";

export type TrainingAccessContext = {
  userId: number;
  userPublicId: string;
  isPlatformAdmin: boolean;
  consultancyId: number | null;
  consultancyPublicId: string | null;
  consultancySlug: string | null;
  membershipId: number | null;
  membershipPublicId: string | null;
  roles: ConsultancyRole[];
  hasRole: (role: ConsultancyRole) => boolean;
  canAuthorTraining: boolean;
  canManageConsultancy: boolean;
  canManageGlobal: boolean;
  isStudent: boolean;
};

export class TrainingAuthorizationError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string = "FORBIDDEN", statusCode: number = 403) {
    super(message);
    this.name = "TrainingAuthorizationError";
    this.code = code;
    this.statusCode = statusCode;
  }
}


export function normalizeConsultancyRole(rawRole: unknown): ConsultancyRole | null {
  if (!rawRole || typeof rawRole !== "string") return null;
  const clean = rawRole.trim().toUpperCase();
  if (
    clean === "PERSONAL" ||
    clean === "PERSONAL_TRAINER" ||
    clean === "TRAINER" ||
    clean === "PROFESSIONAL"
  ) {
    return "PERSONAL";
  }
  if (
    clean === "CONSULTANCY_ADMIN" ||
    clean === "ADMIN" ||
    clean === "OWNER"
  ) {
    return "CONSULTANCY_ADMIN";
  }
  if (clean === "NUTRITIONIST") {
    return "NUTRITIONIST";
  }
  if (clean === "STUDENT" || clean === "ALUNO") {
    return "STUDENT";
  }
  if (clean === "INFLUENCER" || clean === "VIP") {
    return "INFLUENCER";
  }
  return null;
}

/**
 * Resolves trusted Training V2 access context from the authenticated session
 * and an optional consultancy identifier (slug or public_id).
 */
export async function resolveTrainingAccessContext(
  consultancyIdentifier?: string | null
): Promise<TrainingAccessContext | null> {
  const session = await getCurrentSession();
  if (!session) {
    return null;
  }

  const { isPlatformAdmin } = await getPlatformAdminAccess(session.userId);

  let targetIdentifier = consultancyIdentifier?.trim() || null;

  // 1. Fallback: resolve from active view mode cookie if identifier not explicitly provided
  if (!targetIdentifier) {
    try {
      const cookieStore = await cookies();
      const viewModeCookie = cookieStore.get(VIEW_MODE_COOKIE_NAME)?.value;
      if (viewModeCookie && viewModeCookie.includes(":")) {
        const [cookieSlug] = viewModeCookie.split(":");
        if (cookieSlug && cookieSlug.trim()) {
          targetIdentifier = cookieSlug.trim();
        }
      }
    } catch {
      // Cookies not available outside request context
    }
  }

  let connection;
  try {
    connection = await getDbConnection();

    // 2. Fallback: inspect user's active consultancy memberships if identifier still unresolved
    if (!targetIdentifier) {
      const [userConsultancies] = await connection.execute<RowDataPacket[]>(
        `SELECT DISTINCT
          c.id AS consultancy_id,
          c.slug AS consultancy_slug,
          c.public_id AS consultancy_public_id,
          cmr.role
        FROM consultancies c
        INNER JOIN consultancy_members cm ON cm.consultancy_id = c.id
        LEFT JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
        WHERE cm.user_id = ?
          AND cm.status = 'ACTIVE'
          AND c.status = 'ACTIVE'
          AND c.deleted_at IS NULL;`,
        [session.userId]
      );

      if (Array.isArray(userConsultancies) && userConsultancies.length > 0) {
        // Prioritize consultancy where user has training authoring role (PERSONAL or ADMIN)
        const professionalRow = userConsultancies.find((r) => {
          const normalized = normalizeConsultancyRole(r.role);
          return normalized === "PERSONAL" || normalized === "CONSULTANCY_ADMIN";
        });

        if (professionalRow?.consultancy_slug) {
          targetIdentifier = String(professionalRow.consultancy_slug);
        } else if (userConsultancies[0]?.consultancy_slug) {
          targetIdentifier = String(userConsultancies[0].consultancy_slug);
        }
      }
    }

    if (!targetIdentifier) {
      // Global context without a specific consultancy active
      return {
        userId: session.userId,
        userPublicId: session.userPublicId,
        isPlatformAdmin,
        consultancyId: null,
        consultancyPublicId: null,
        consultancySlug: null,
        membershipId: null,
        membershipPublicId: null,
        roles: [],
        hasRole: () => false,
        canAuthorTraining: false,
        canManageConsultancy: false,
        canManageGlobal: isPlatformAdmin,
        isStudent: false,
      };
    }

    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        c.id AS consultancy_id,
        c.public_id AS consultancy_public_id,
        c.slug AS consultancy_slug,
        cm.id AS membership_id,
        cm.public_id AS membership_public_id,
        cmr.role
      FROM consultancies c
      INNER JOIN consultancy_members cm ON cm.consultancy_id = c.id
      LEFT JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
      WHERE (c.slug = ? OR c.public_id = ?)
        AND cm.user_id = ?
        AND cm.status = 'ACTIVE'
        AND c.status = 'ACTIVE'
        AND c.deleted_at IS NULL;`,
      [targetIdentifier, targetIdentifier, session.userId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      // User is not an active member of this consultancy
      if (isPlatformAdmin) {
        // Platform admin without direct membership gets global management capabilities
        return {
          userId: session.userId,
          userPublicId: session.userPublicId,
          isPlatformAdmin: true,
          consultancyId: null,
          consultancyPublicId: null,
          consultancySlug: null,
          membershipId: null,
          membershipPublicId: null,
          roles: [],
          hasRole: () => false,
          canAuthorTraining: false,
          canManageConsultancy: false,
          canManageGlobal: true,
          isStudent: false,
        };
      }
      return null;
    }

    const first = rows[0];
    const roles: ConsultancyRole[] = Array.from(
      new Set(
        rows
          .map((r) => normalizeConsultancyRole(r.role))
          .filter((r): r is ConsultancyRole => Boolean(r))
      )
    );

    const hasRole = (role: ConsultancyRole) => roles.includes(role);
    const canManageConsultancy = hasRole("CONSULTANCY_ADMIN");
    const canAuthorTraining = canManageConsultancy || hasRole("PERSONAL");
    const isStudent = hasRole("STUDENT");

    return {
      userId: session.userId,
      userPublicId: session.userPublicId,
      isPlatformAdmin,
      consultancyId: Number(first.consultancy_id),
      consultancyPublicId: String(first.consultancy_public_id),
      consultancySlug: String(first.consultancy_slug),
      membershipId: Number(first.membership_id),
      membershipPublicId: String(first.membership_public_id),
      roles,
      hasRole,
      canAuthorTraining,
      canManageConsultancy,
      canManageGlobal: isPlatformAdmin,
      isStudent,
    };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

export function assertCanManageGlobal(ctx: TrainingAccessContext): void {
  if (!ctx.canManageGlobal) {
    throw new TrainingAuthorizationError(
      "Acesso restrito ao Administrador da Plataforma.",
      "UNAUTHORIZED_GLOBAL_MANAGEMENT",
      403
    );
  }
}

export function assertCanAuthorTraining(ctx: TrainingAccessContext): void {
  if (!ctx.consultancyId || !ctx.membershipId || !ctx.canAuthorTraining) {
    throw new TrainingAuthorizationError(
      "Acesso negado: apenas Personal Trainers ou Administradores da consultoria podem prescrever treinos.",
      "UNAUTHORIZED_TRAINING_AUTHOR",
      403
    );
  }
}

export function assertConsultancyContext(ctx: TrainingAccessContext): void {
  if (!ctx.consultancyId || !ctx.membershipId) {
    throw new TrainingAuthorizationError(
      "Operação requer contexto ativo de consultoria.",
      "MISSING_CONSULTANCY_CONTEXT",
      400
    );
  }
}

export function assertStudentContext(ctx: TrainingAccessContext): void {
  if (!ctx.consultancyId || !ctx.membershipId || !ctx.isStudent) {
    throw new TrainingAuthorizationError(
      "Acesso negado: usuário não possui papel de aluno nesta consultoria.",
      "UNAUTHORIZED_STUDENT",
      403
    );
  }
}
