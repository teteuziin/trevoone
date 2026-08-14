import crypto from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";
import { VALID_ROLES, type ConsultancyRole } from "./context";

export type InvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";

export type ConsultancyInvitationItem = {
  publicId: string;
  email: string;
  roles: ConsultancyRole[];
  createdAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  status: InvitationStatus;
  statusLabel: string;
};

export const INVITATION_STATUS_LABELS: Record<InvitationStatus, string> = {
  PENDING: "Pendente",
  ACCEPTED: "Aceito",
  EXPIRED: "Expirado",
  REVOKED: "Revogado",
};

export async function createConsultancyInvitation(params: {
  consultancyId: number;
  actorUserId: number;
  email: string;
  roles: string[];
}): Promise<{ success: true; invitationPath: string } | { success: false; error: string }> {
  const { consultancyId, actorUserId, email: rawEmail, roles: rawRoles } = params;

  if (!consultancyId || typeof consultancyId !== "number" || consultancyId <= 0) {
    return { success: false, error: "Consultoria inválida." };
  }
  if (!actorUserId || typeof actorUserId !== "number" || actorUserId <= 0) {
    return { success: false, error: "Usuário não autenticado." };
  }

  // 1. Normalização e validação de e-mail
  const email = (rawEmail || "").trim().normalize("NFC").toLowerCase();
  const emailParts = email.split("@");
  if (
    email.length === 0 ||
    email.length > 254 ||
    emailParts.length !== 2 ||
    !emailParts[0] ||
    !emailParts[1] ||
    !emailParts[1].includes(".")
  ) {
    return { success: false, error: "Informe um e-mail válido." };
  }

  // 2. Validação e deduplicação de roles
  if (!Array.isArray(rawRoles) || rawRoles.length === 0) {
    return { success: false, error: "Selecione pelo menos uma função." };
  }

  for (const r of rawRoles) {
    if (!VALID_ROLES.includes(r as ConsultancyRole)) {
      return { success: false, error: "Função inválida selecionada." };
    }
  }

  const validatedRoles = Array.from(new Set(rawRoles as ConsultancyRole[])).sort(
    (a, b) => VALID_ROLES.indexOf(a) - VALID_ROLES.indexOf(b)
  );

  if (validatedRoles.length === 0) {
    return { success: false, error: "Selecione pelo menos uma função." };
  }

  // 3. Named Lock para evitar concorrência por tenant + e-mail
  const lockKey = "trevo_inv:" + crypto.createHash("sha256").update(`${consultancyId}:${email}`).digest("hex").slice(0, 40);

  let connection;
  let lockAcquired = false;

  try {
    connection = await getDbConnection();

    const [lockRows] = await connection.execute<RowDataPacket[]>(
      `SELECT GET_LOCK(?, 5) AS lock_acquired;`,
      [lockKey]
    );

    if (
      !Array.isArray(lockRows) ||
      lockRows.length === 0 ||
      Number(lockRows[0].lock_acquired) !== 1
    ) {
      return {
        success: false,
        error: "Não foi possível criar o convite agora. Tente novamente.",
      };
    }

    lockAcquired = true;

    // 4. Transação
    await connection.beginTransaction();

    // 4.1 Revalidar permissão do ator dentro da transação
    const [actorRows] = await connection.execute<RowDataPacket[]>(
      `SELECT c.id
       FROM consultancies c
       INNER JOIN consultancy_members cm ON cm.consultancy_id = c.id
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE c.id = ?
         AND c.status = 'ACTIVE'
         AND c.deleted_at IS NULL
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
        error: "Você não possui permissão para convidar membros nesta consultoria.",
      };
    }

    // 4.2 Verificar se usuário já possui qualquer membership nesta consultoria
    const [memberRows] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id
       FROM users u
       INNER JOIN consultancy_members cm ON cm.user_id = u.id
       WHERE u.email = ?
         AND cm.consultancy_id = ?
       LIMIT 1
       FOR UPDATE;`,
      [email, consultancyId]
    );

    if (Array.isArray(memberRows) && memberRows.length > 0) {
      await connection.rollback();
      return {
        success: false,
        error: "Esta pessoa já possui um vínculo com a consultoria.",
      };
    }

    // 4.3 Verificar se já existe convite pendente para este e-mail nesta consultoria
    const [existingInvRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id
       FROM consultancy_invitations
       WHERE consultancy_id = ?
         AND email = ?
         AND accepted_at IS NULL
         AND revoked_at IS NULL
         AND expires_at > UTC_TIMESTAMP(3)
       LIMIT 1
       FOR UPDATE;`,
      [consultancyId, email]
    );

    if (Array.isArray(existingInvRows) && existingInvRows.length > 0) {
      await connection.rollback();
      return {
        success: false,
        error: "Já existe um convite pendente para este e-mail.",
      };
    }

    // 4.4 Gerar token de alta entropia e hash SHA-256
    const rawToken = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const invitationPublicId = crypto.randomUUID();

    // 4.5 Inserir convite (validade: 7 dias)
    const [invInsertResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO consultancy_invitations (
        public_id,
        consultancy_id,
        email,
        token_hash,
        created_by_user_id,
        expires_at
      ) VALUES (
        ?,
        ?,
        ?,
        ?,
        ?,
        DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 7 DAY)
      );`,
      [invitationPublicId, consultancyId, email, tokenHash, actorUserId]
    );

    if (invInsertResult.affectedRows !== 1) {
      await connection.rollback();
      return {
        success: false,
        error: "Não foi possível criar o convite agora. Tente novamente.",
      };
    }

    const invitationId = invInsertResult.insertId;

    // 4.6 Inserir roles do convite
    for (const role of validatedRoles) {
      const [roleInsertResult] = await connection.execute<ResultSetHeader>(
        `INSERT INTO consultancy_invitation_roles (invitation_id, role)
         VALUES (?, ?);`,
        [invitationId, role]
      );

      if (roleInsertResult.affectedRows !== 1) {
        await connection.rollback();
        return {
          success: false,
          error: "Não foi possível associar as funções ao convite.",
        };
      }
    }

    // 4.7 Registrar evento de auditoria
    const auditPublicId = crypto.randomUUID();
    await connection.execute<ResultSetHeader>(
      `INSERT INTO audit_events (
        public_id,
        actor_user_id,
        consultancy_id,
        action,
        target_type,
        target_public_id,
        metadata_json
      ) VALUES (
        ?,
        ?,
        ?,
        'CONSULTANCY_INVITATION_CREATED',
        'CONSULTANCY_INVITATION',
        ?,
        NULL
      );`,
      [auditPublicId, actorUserId, consultancyId, invitationPublicId]
    );

    await connection.commit();

    return {
      success: true,
      invitationPath: `/convite/${rawToken}`,
    };
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
      error: "Não foi possível criar o convite agora. Tente novamente.",
    };
  } finally {
    if (connection) {
      if (lockAcquired) {
        try {
          await connection.execute(`SELECT RELEASE_LOCK(?);`, [lockKey]);
        } catch {
          // Ignorado
        }
      }
      connection.release();
    }
  }
}

export async function listConsultancyInvitations(
  consultancyId: number
): Promise<ConsultancyInvitationItem[]> {
  if (!consultancyId || typeof consultancyId !== "number" || consultancyId <= 0) {
    return [];
  }

  let connection;
  try {
    connection = await getDbConnection();
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        ci.public_id,
        ci.email,
        ci.created_at,
        ci.expires_at,
        ci.accepted_at,
        ci.revoked_at,
        GROUP_CONCAT(DISTINCT cir.role ORDER BY cir.role ASC SEPARATOR ',') AS roles_csv,
        CASE
          WHEN ci.accepted_at IS NOT NULL THEN 'ACCEPTED'
          WHEN ci.revoked_at IS NOT NULL THEN 'REVOKED'
          WHEN ci.expires_at <= UTC_TIMESTAMP(3) THEN 'EXPIRED'
          ELSE 'PENDING'
        END AS derived_status
      FROM consultancy_invitations ci
      LEFT JOIN consultancy_invitation_roles cir ON cir.invitation_id = ci.id
      WHERE ci.consultancy_id = ?
      GROUP BY ci.id, ci.public_id, ci.email, ci.created_at, ci.expires_at, ci.accepted_at, ci.revoked_at
      ORDER BY ci.created_at DESC, ci.id DESC
      LIMIT 25;`,
      [consultancyId]
    );

    if (!Array.isArray(rows)) {
      return [];
    }

    return rows.map((r) => {
      const rawRolesCsv = r.roles_csv ? String(r.roles_csv).split(",") : [];
      const roles = VALID_ROLES.filter((role) => rawRolesCsv.includes(role));
      const status = String(r.derived_status) as InvitationStatus;
      const statusLabel = INVITATION_STATUS_LABELS[status] || "Pendente";

      return {
        publicId: String(r.public_id),
        email: String(r.email),
        roles,
        createdAt: new Date(r.created_at),
        expiresAt: new Date(r.expires_at),
        acceptedAt: r.accepted_at ? new Date(r.accepted_at) : null,
        revokedAt: r.revoked_at ? new Date(r.revoked_at) : null,
        status,
        statusLabel,
      };
    });
  } catch {
    return [];
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export async function revokeConsultancyInvitation(params: {
  consultancyId: number;
  actorUserId: number;
  invitationPublicId: string;
}): Promise<{ success: boolean; error?: string }> {
  const { consultancyId, actorUserId, invitationPublicId } = params;

  if (!consultancyId || typeof consultancyId !== "number" || consultancyId <= 0) {
    return { success: false, error: "Consultoria inválida." };
  }
  if (!actorUserId || typeof actorUserId !== "number" || actorUserId <= 0) {
    return { success: false, error: "Usuário não autenticado." };
  }
  if (!invitationPublicId || typeof invitationPublicId !== "string" || invitationPublicId.trim().length === 0) {
    return { success: false, error: "Convite inválido." };
  }

  let connection;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 1. Revalidar permissão do ator
    const [actorRows] = await connection.execute<RowDataPacket[]>(
      `SELECT c.id
       FROM consultancies c
       INNER JOIN consultancy_members cm ON cm.consultancy_id = c.id
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE c.id = ?
         AND c.status = 'ACTIVE'
         AND c.deleted_at IS NULL
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
        error: "Você não possui permissão para revogar convites nesta consultoria.",
      };
    }

    // 2. Localizar convite pendente dentro da mesma consultoria
    const [invRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, accepted_at, revoked_at, expires_at, (expires_at <= UTC_TIMESTAMP(3)) AS is_expired
       FROM consultancy_invitations
       WHERE public_id = ?
         AND consultancy_id = ?
       LIMIT 1
       FOR UPDATE;`,
      [invitationPublicId, consultancyId]
    );

    if (!Array.isArray(invRows) || invRows.length === 0) {
      await connection.rollback();
      return {
        success: false,
        error: "Convite não encontrado nesta consultoria.",
      };
    }

    const inv = invRows[0];
    if (inv.accepted_at !== null || inv.revoked_at !== null || Number(inv.is_expired) === 1) {
      await connection.rollback();
      return {
        success: false,
        error: "Este convite não está mais pendente.",
      };
    }

    const invitationId = inv.id;

    // 3. Atualizar revoked_at
    const [updateResult] = await connection.execute<ResultSetHeader>(
      `UPDATE consultancy_invitations
       SET revoked_at = UTC_TIMESTAMP(3)
       WHERE id = ?
         AND accepted_at IS NULL
         AND revoked_at IS NULL
         AND expires_at > UTC_TIMESTAMP(3);`,
      [invitationId]
    );

    if (updateResult.affectedRows !== 1) {
      await connection.rollback();
      return {
        success: false,
        error: "Este convite não pôde ser revogado.",
      };
    }

    // 4. Registrar evento de auditoria
    const auditPublicId = crypto.randomUUID();
    await connection.execute<ResultSetHeader>(
      `INSERT INTO audit_events (
        public_id,
        actor_user_id,
        consultancy_id,
        action,
        target_type,
        target_public_id,
        metadata_json
      ) VALUES (
        ?,
        ?,
        ?,
        'CONSULTANCY_INVITATION_REVOKED',
        'CONSULTANCY_INVITATION',
        ?,
        NULL
      );`,
      [auditPublicId, actorUserId, consultancyId, invitationPublicId]
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
      error: "Não foi possível revogar o convite agora. Tente novamente.",
    };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
