/**
 * TREVO ONE — TRAINING V2 ACCESS & CONTEXT FOUNDATION
 * Resolves trusted session and tenancy context. Enforces role-based capabilities.
 */

import type { RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";
import { getCurrentSession } from "../auth/session";
import { getPlatformAdminAccess } from "../platform-admin/access";
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

  if (!consultancyIdentifier || !consultancyIdentifier.trim()) {
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

  const normalizedIdentifier = consultancyIdentifier.trim();

  let connection;
  try {
    connection = await getDbConnection();
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
      [normalizedIdentifier, normalizedIdentifier, session.userId]
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
    const roles: ConsultancyRole[] = rows
      .map((r) => r.role as ConsultancyRole)
      .filter((r): r is ConsultancyRole => Boolean(r));

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
