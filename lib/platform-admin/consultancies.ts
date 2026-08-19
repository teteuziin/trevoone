import { randomUUID } from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";
import { isValidIanaTimezone } from "../consultancies/timezone";

export type PlatformConsultancy = {
  publicId: string;
  name: string;
  slug: string;
  timezone: string;
  status: string;
  createdAt: Date;
};

export type CreateConsultancyParams = {
  actorUserId: number;
  name: string;
  slug: string;
  timezone: string;
  initialAdminEmail: string;
};

export type CreateConsultancyResult =
  | { success: true; consultancySlug: string }
  | {
      success: false;
      error: string;
      field?: "name" | "slug" | "initialAdminEmail" | "timezone";
    };

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function listPlatformConsultancies(): Promise<
  PlatformConsultancy[]
> {
  let connection;
  try {
    connection = await getDbConnection();
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT public_id, name, slug, timezone, status, created_at
       FROM consultancies
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC, id DESC;`
    );

    if (!Array.isArray(rows)) {
      return [];
    }

    return rows.map((r) => ({
      publicId: String(r.public_id),
      name: String(r.name),
      slug: String(r.slug),
      timezone: String(r.timezone),
      status: String(r.status),
      createdAt: new Date(r.created_at),
    }));
  } catch {
    return [];
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export async function createConsultancyWithInitialAdmin(
  params: CreateConsultancyParams
): Promise<CreateConsultancyResult> {
  const { actorUserId, name, slug, timezone, initialAdminEmail } = params;

  if (!actorUserId || typeof actorUserId !== "number" || actorUserId <= 0) {
    return {
      success: false,
      error: "Identificação do administrador da plataforma inválida.",
    };
  }

  const normalizedName = (name || "")
    .trim()
    .normalize("NFC")
    .replace(/\s+/g, " ");

  if (normalizedName.length < 2 || normalizedName.length > 160) {
    return {
      success: false,
      error: "O nome da consultoria deve ter entre 2 e 160 caracteres.",
      field: "name",
    };
  }

  const normalizedSlug = (slug || "").trim().toLowerCase();

  if (
    normalizedSlug.length < 2 ||
    normalizedSlug.length > 120 ||
    !SLUG_REGEX.test(normalizedSlug)
  ) {
    return {
      success: false,
      error:
        "O slug deve conter apenas letras minúsculas, números e hífens (ex: saiya-shape).",
      field: "slug",
    };
  }

  const rawTimezone = (timezone || "").trim();
  if (!isValidIanaTimezone(rawTimezone)) {
    return {
      success: false,
      error: "Fuso horário inválido. Informe um timezone IANA válido (ex: America/Sao_Paulo).",
      field: "timezone",
    };
  }
  const normalizedTimezone = rawTimezone;

  const normalizedEmail = (initialAdminEmail || "")
    .trim()
    .normalize("NFC")
    .toLowerCase();

  if (
    normalizedEmail.length === 0 ||
    normalizedEmail.length > 254 ||
    !normalizedEmail.includes("@")
  ) {
    return {
      success: false,
      error: "Informe um e-mail válido para o administrador inicial.",
      field: "initialAdminEmail",
    };
  }

  let connection;
  try {
    connection = await getDbConnection();

    // 1. Revalidar privilégio do PLATFORM_ADMIN antes da escrita
    const [adminRows] = await connection.execute<RowDataPacket[]>(
      `SELECT status FROM platform_admins WHERE user_id = ? LIMIT 1;`,
      [actorUserId]
    );

    if (
      !Array.isArray(adminRows) ||
      adminRows.length === 0 ||
      adminRows[0]?.status !== "ACTIVE"
    ) {
      return {
        success: false,
        error: "Acesso de administrador global inválido ou não autorizado.",
      };
    }

    // 2. Verificar duplicidade de slug
    const [existingSlugRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM consultancies WHERE slug = ? LIMIT 1;`,
      [normalizedSlug]
    );

    if (Array.isArray(existingSlugRows) && existingSlugRows.length > 0) {
      return {
        success: false,
        error: "Já existe uma consultoria com esse slug.",
        field: "slug",
      };
    }

    // 3. Buscar usuário administrador inicial
    const [userRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, status, deleted_at FROM users WHERE email = ? LIMIT 1;`,
      [normalizedEmail]
    );

    if (!Array.isArray(userRows) || userRows.length === 0) {
      return {
        success: false,
        error: "Conta do administrador inicial não encontrada no Trevo One.",
        field: "initialAdminEmail",
      };
    }

    const adminUser = userRows[0];

    if (adminUser.status !== "ACTIVE" || adminUser.deleted_at !== null) {
      return {
        success: false,
        error:
          "A conta do administrador inicial precisa estar ativa e não desativada.",
        field: "initialAdminEmail",
      };
    }

    const consultancyPublicId = randomUUID();
    const memberPublicId = randomUUID();
    const auditCreatedPublicId = randomUUID();
    const auditAdminAssignedPublicId = randomUUID();

    await connection.beginTransaction();

    try {
      // 4. Inserir consultoria com timezone canônico
      const [insertConsultancy] = await connection.execute<ResultSetHeader>(
        `INSERT INTO consultancies (public_id, name, slug, timezone, status)
         VALUES (?, ?, ?, ?, 'ACTIVE');`,
        [consultancyPublicId, normalizedName, normalizedSlug, normalizedTimezone]
      );

      if (insertConsultancy.affectedRows !== 1) {
        throw new Error("Falha ao inserir consultoria.");
      }

      const consultancyId = insertConsultancy.insertId;

      // 5. Inserir auditoria da criação da consultoria
      const [insertAudit1] = await connection.execute<ResultSetHeader>(
        `INSERT INTO audit_events (public_id, actor_user_id, consultancy_id, action, target_type, target_public_id, metadata_json)
         VALUES (?, ?, ?, 'PLATFORM_CONSULTANCY_CREATED', 'CONSULTANCY', ?, NULL);`,
        [auditCreatedPublicId, actorUserId, consultancyId, consultancyPublicId]
      );

      if (insertAudit1.affectedRows !== 1) {
        throw new Error("Falha ao registrar auditoria da consultoria.");
      }

      // 6. Inserir membership do administrador inicial
      const [insertMember] = await connection.execute<ResultSetHeader>(
        `INSERT INTO consultancy_members (public_id, consultancy_id, user_id, status, joined_at)
         VALUES (?, ?, ?, 'ACTIVE', UTC_TIMESTAMP(3));`,
        [memberPublicId, consultancyId, adminUser.id]
      );

      if (insertMember.affectedRows !== 1) {
        throw new Error("Falha ao criar membership do administrador inicial.");
      }

      const membershipId = insertMember.insertId;

      // 7. Inserir role CONSULTANCY_ADMIN
      const [insertRole] = await connection.execute<ResultSetHeader>(
        `INSERT INTO consultancy_member_roles (member_id, role)
         VALUES (?, 'CONSULTANCY_ADMIN');`,
        [membershipId]
      );

      if (insertRole.affectedRows !== 1) {
        throw new Error("Falha ao associar papel CONSULTANCY_ADMIN.");
      }

      // 8. Inserir auditoria do administrador inicial
      const [insertAudit2] = await connection.execute<ResultSetHeader>(
        `INSERT INTO audit_events (public_id, actor_user_id, consultancy_id, action, target_type, target_public_id, metadata_json)
         VALUES (?, ?, ?, 'CONSULTANCY_INITIAL_ADMIN_ASSIGNED', 'CONSULTANCY_MEMBER', ?, NULL);`,
        [
          auditAdminAssignedPublicId,
          actorUserId,
          consultancyId,
          memberPublicId,
        ]
      );

      if (insertAudit2.affectedRows !== 1) {
        throw new Error("Falha ao registrar auditoria do administrador.");
      }

      await connection.commit();
      return { success: true, consultancySlug: normalizedSlug };
    } catch (txErr) {
      try {
        await connection.rollback();
      } catch {}
      throw txErr;
    }
  } catch (err: unknown) {
    const errorObject = err as { code?: string; message?: string };
    if (errorObject?.code === "ER_DUP_ENTRY") {
      return {
        success: false,
        error: "Já existe uma consultoria com esse slug.",
        field: "slug",
      };
    }
    return {
      success: false,
      error: "Ocorreu um erro ao criar a consultoria. Tente novamente.",
    };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
