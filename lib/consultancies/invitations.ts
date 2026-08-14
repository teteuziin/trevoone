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

export type InvitationPreviewResult =
  | {
      status: "PENDING";
      invitationPublicId: string;
      consultancyName: string;
      consultancySlug: string;
      consultancyLogoUrl: string | null;
      invitedEmail: string;
      roles: ConsultancyRole[];
      createdAt: Date;
      expiresAt: Date;
    }
  | {
      status: "ACCEPTED" | "REVOKED" | "EXPIRED";
      consultancyName: string;
      consultancySlug: string;
      consultancyLogoUrl: string | null;
      invitedEmail: string;
      roles: ConsultancyRole[];
    }
  | {
      status: "INVALID";
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

export async function getInvitationPreviewByToken(
  token: string
): Promise<InvitationPreviewResult> {
  if (!token || typeof token !== "string") {
    return { status: "INVALID" };
  }

  const trimmedToken = token.trim();
  if (!/^[A-Za-z0-9_-]{43}$/.test(trimmedToken)) {
    return { status: "INVALID" };
  }

  const tokenHash = crypto.createHash("sha256").update(trimmedToken).digest("hex");

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
        c.name AS consultancy_name,
        c.slug AS consultancy_slug,
        c.logo_url AS consultancy_logo_url,
        c.status AS consultancy_status,
        c.deleted_at AS consultancy_deleted_at,
        GROUP_CONCAT(DISTINCT cir.role ORDER BY cir.role ASC SEPARATOR ',') AS roles_csv,
        CASE
          WHEN ci.accepted_at IS NOT NULL THEN 'ACCEPTED'
          WHEN ci.revoked_at IS NOT NULL THEN 'REVOKED'
          WHEN ci.expires_at <= UTC_TIMESTAMP(3) THEN 'EXPIRED'
          ELSE 'PENDING'
        END AS derived_status
      FROM consultancy_invitations ci
      INNER JOIN consultancies c ON c.id = ci.consultancy_id
      LEFT JOIN consultancy_invitation_roles cir ON cir.invitation_id = ci.id
      WHERE ci.token_hash = ?
      GROUP BY ci.id, ci.public_id, ci.email, ci.created_at, ci.expires_at, ci.accepted_at, ci.revoked_at, c.name, c.slug, c.logo_url, c.status, c.deleted_at;`,
      [tokenHash]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return { status: "INVALID" };
    }

    const row = rows[0];
    if (row.consultancy_status !== "ACTIVE" || row.consultancy_deleted_at !== null) {
      return { status: "INVALID" };
    }

    const rawRolesCsv = row.roles_csv ? String(row.roles_csv).split(",").map((s) => s.trim()).filter(Boolean) : [];
    if (rawRolesCsv.length === 0) {
      return { status: "INVALID" };
    }

    for (const r of rawRolesCsv) {
      if (!VALID_ROLES.includes(r as ConsultancyRole)) {
        return { status: "INVALID" };
      }
    }

    const roles = Array.from(new Set(rawRolesCsv as ConsultancyRole[])).sort(
      (a, b) => VALID_ROLES.indexOf(a) - VALID_ROLES.indexOf(b)
    );

    const derivedStatus = String(row.derived_status) as InvitationStatus;

    if (derivedStatus === "PENDING") {
      return {
        status: "PENDING",
        invitationPublicId: String(row.public_id),
        consultancyName: String(row.consultancy_name),
        consultancySlug: String(row.consultancy_slug),
        consultancyLogoUrl: row.consultancy_logo_url ? String(row.consultancy_logo_url) : null,
        invitedEmail: String(row.email),
        roles,
        createdAt: new Date(row.created_at),
        expiresAt: new Date(row.expires_at),
      };
    }

    return {
      status: derivedStatus,
      consultancyName: String(row.consultancy_name),
      consultancySlug: String(row.consultancy_slug),
      consultancyLogoUrl: row.consultancy_logo_url ? String(row.consultancy_logo_url) : null,
      invitedEmail: String(row.email),
      roles,
    };
  } catch {
    return { status: "INVALID" };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export async function acceptConsultancyInvitation(params: {
  token: string;
  userId: number;
}): Promise<{ success: true; consultancySlug: string } | { success: false; error: string }> {
  const { token, userId } = params;

  if (!token || typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token.trim())) {
    return { success: false, error: "Convite inválido." };
  }
  if (!userId || typeof userId !== "number" || userId <= 0) {
    return { success: false, error: "Usuário não autenticado." };
  }

  const tokenHash = crypto.createHash("sha256").update(token.trim()).digest("hex");

  let connection;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 1. Localizar convite com FOR UPDATE
    const [invRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        ci.id,
        ci.public_id,
        ci.consultancy_id,
        ci.email,
        ci.expires_at,
        ci.accepted_at,
        ci.revoked_at,
        (ci.expires_at <= UTC_TIMESTAMP(3)) AS is_expired
       FROM consultancy_invitations ci
       WHERE ci.token_hash = ?
       LIMIT 1
       FOR UPDATE;`,
      [tokenHash]
    );

    if (!Array.isArray(invRows) || invRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Convite inválido ou não disponível." };
    }

    const inv = invRows[0];
    if (inv.accepted_at !== null) {
      await connection.rollback();
      return { success: false, error: "Este convite já foi utilizado." };
    }
    if (inv.revoked_at !== null) {
      await connection.rollback();
      return { success: false, error: "Este convite foi revogado." };
    }
    if (Number(inv.is_expired) === 1) {
      await connection.rollback();
      return { success: false, error: "Este convite expirou." };
    }

    const invitationId = Number(inv.id);
    const consultancyId = Number(inv.consultancy_id);
    const invitationEmail = String(inv.email).trim().normalize("NFC").toLowerCase();

    // 2. Revalidar consultoria
    const [consultancyRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, name, slug
       FROM consultancies
       WHERE id = ?
         AND status = 'ACTIVE'
         AND deleted_at IS NULL
       LIMIT 1
       FOR UPDATE;`,
      [consultancyId]
    );

    if (!Array.isArray(consultancyRows) || consultancyRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "A consultoria associada não está ativa." };
    }

    const consultancySlug = String(consultancyRows[0].slug);

    // 3. Revalidar usuário autenticado
    const [userRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, email
       FROM users
       WHERE id = ?
         AND status = 'ACTIVE'
         AND deleted_at IS NULL
       LIMIT 1
       FOR UPDATE;`,
      [userId]
    );

    if (!Array.isArray(userRows) || userRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Usuário inválido ou inativo." };
    }

    const userEmail = String(userRows[0].email).trim().normalize("NFC").toLowerCase();

    // 4. Comparar e-mails normalizados
    if (userEmail !== invitationEmail) {
      await connection.rollback();
      return { success: false, error: "Este convite pertence a outro e-mail." };
    }

    // 5. Obter e validar roles do convite
    const [roleRows] = await connection.execute<RowDataPacket[]>(
      `SELECT role
       FROM consultancy_invitation_roles
       WHERE invitation_id = ?
       FOR UPDATE;`,
      [invitationId]
    );

    if (!Array.isArray(roleRows) || roleRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "O convite não possui funções válidas." };
    }

    const rawRoles = roleRows.map((r) => String(r.role));
    for (const r of rawRoles) {
      if (!VALID_ROLES.includes(r as ConsultancyRole)) {
        await connection.rollback();
        return { success: false, error: "Função inválida detectada no convite." };
      }
    }

    const validatedRoles = Array.from(new Set(rawRoles as ConsultancyRole[]));
    if (validatedRoles.length === 0) {
      await connection.rollback();
      return { success: false, error: "O convite não possui funções válidas." };
    }

    // 6. Verificar se o usuário já possui membership nesta consultoria
    const [existingMemberRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id
       FROM consultancy_members
       WHERE consultancy_id = ?
         AND user_id = ?
       LIMIT 1
       FOR UPDATE;`,
      [consultancyId, userId]
    );

    if (Array.isArray(existingMemberRows) && existingMemberRows.length > 0) {
      await connection.rollback();
      return {
        success: false,
        error: "Já existe um vínculo entre esta conta e a consultoria.",
      };
    }

    // 7. Inserir membership ativa
    const membershipPublicId = crypto.randomUUID();
    const [memberInsertResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO consultancy_members (
        public_id,
        consultancy_id,
        user_id,
        status,
        joined_at
      ) VALUES (
        ?,
        ?,
        ?,
        'ACTIVE',
        UTC_TIMESTAMP(3)
      );`,
      [membershipPublicId, consultancyId, userId]
    );

    if (memberInsertResult.affectedRows !== 1) {
      await connection.rollback();
      return { success: false, error: "Não foi possível registrar o membro." };
    }

    const memberId = memberInsertResult.insertId;

    // 8. Inserir roles da membership
    for (const role of validatedRoles) {
      const [roleInsertResult] = await connection.execute<ResultSetHeader>(
        `INSERT INTO consultancy_member_roles (member_id, role)
         VALUES (?, ?);`,
        [memberId, role]
      );

      if (roleInsertResult.affectedRows !== 1) {
        await connection.rollback();
        return { success: false, error: "Não foi possível registrar os papéis do membro." };
      }
    }

    // 9. Marcar convite como aceito
    const [updateInvResult] = await connection.execute<ResultSetHeader>(
      `UPDATE consultancy_invitations
       SET accepted_at = UTC_TIMESTAMP(3),
           accepted_by_user_id = ?
       WHERE id = ?
         AND accepted_at IS NULL
         AND revoked_at IS NULL
         AND expires_at > UTC_TIMESTAMP(3);`,
      [userId, invitationId]
    );

    if (updateInvResult.affectedRows !== 1) {
      await connection.rollback();
      return { success: false, error: "Não foi possível concluir o aceite do convite." };
    }

    // 10. Registrar evento de auditoria
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
        'CONSULTANCY_INVITATION_ACCEPTED',
        'CONSULTANCY_INVITATION',
        ?,
        NULL
      );`,
      [auditPublicId, userId, consultancyId, String(inv.public_id)]
    );

    await connection.commit();

    return {
      success: true,
      consultancySlug,
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
      error: "Não foi possível aceitar o convite agora. Tente novamente.",
    };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
