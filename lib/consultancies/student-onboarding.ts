import crypto from "node:crypto";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";

export type OnboardingRequirementStatus = "PENDING" | "SUBMITTED" | "CONFIRMED";

export type StudentOnboardingRequirementItem = {
  publicId: string;
  key: string;
  title: string;
  type: string;
  externalUrl: string;
  sortOrder: number;
  status: OnboardingRequirementStatus;
  submittedAt: Date | null;
  confirmedAt: Date | null;
};

export type StudentOnboardingStatusResult = {
  applicable: boolean;
  totalRequirements: number;
  confirmedRequirements: number;
  isComplete: boolean;
  requirements: StudentOnboardingRequirementItem[];
};

export type SubmitStudentOnboardingResult = {
  success: boolean;
  error?: string;
  status?: OnboardingRequirementStatus;
  message?: string;
};

export async function getStudentOnboardingStatus(
  userId: number,
  consultancySlug: string
): Promise<StudentOnboardingStatusResult> {
  const fallbackResult: StudentOnboardingStatusResult = {
    applicable: false,
    totalRequirements: 0,
    confirmedRequirements: 0,
    isComplete: false,
    requirements: [],
  };

  if (!userId || typeof userId !== "number" || userId <= 0) {
    return fallbackResult;
  }

  if (!consultancySlug || typeof consultancySlug !== "string" || !consultancySlug.trim()) {
    return fallbackResult;
  }

  const slug = consultancySlug.trim();

  let connection;
  try {
    connection = await getDbConnection();

    // 1. Validar consultoria ativa, usuário ativo e obter membership + roles
    const [membershipRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        cm.id AS membership_id,
        c.id AS consultancy_id,
        GROUP_CONCAT(DISTINCT cmr.role SEPARATOR ',') AS roles_csv
       FROM consultancies c
       INNER JOIN consultancy_members cm ON cm.consultancy_id = c.id
       INNER JOIN users u ON u.id = cm.user_id
       LEFT JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE c.slug = ?
         AND c.status = 'ACTIVE'
         AND c.deleted_at IS NULL
         AND u.id = ?
         AND u.status = 'ACTIVE'
         AND u.deleted_at IS NULL
         AND cm.status = 'ACTIVE'
       GROUP BY cm.id, c.id
       LIMIT 1;`,
      [slug, userId]
    );

    if (!Array.isArray(membershipRows) || membershipRows.length === 0) {
      return fallbackResult;
    }

    const membership = membershipRows[0];
    const membershipId = Number(membership.membership_id);
    const consultancyId = Number(membership.consultancy_id);
    const rawRoles = membership.roles_csv ? String(membership.roles_csv).split(",") : [];

    // Onboarding obrigatório aplica-se a quem possui a role STUDENT
    const isStudent = rawRoles.includes("STUDENT");

    if (!isStudent) {
      return {
        applicable: false,
        totalRequirements: 0,
        confirmedRequirements: 0,
        isComplete: true,
        requirements: [],
      };
    }

    // 2. Buscar requisitos ativos para role STUDENT e progresso correspondente em uma única query (sem N+1)
    const [reqRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        cor.public_id,
        cor.requirement_key,
        cor.title,
        cor.requirement_type,
        cor.external_url,
        cor.sort_order,
        cmor.status AS progress_status,
        cmor.submitted_at,
        cmor.confirmed_at,
        cmor.confirmed_by_user_id
       FROM consultancy_onboarding_requirements cor
       LEFT JOIN consultancy_member_onboarding_requirements cmor
         ON cmor.requirement_id = cor.id
        AND cmor.membership_id = ?
       WHERE cor.consultancy_id = ?
         AND cor.applies_to_role = 'STUDENT'
         AND cor.status = 'ACTIVE'
         AND cor.deleted_at IS NULL
       ORDER BY cor.sort_order ASC, cor.id ASC;`,
      [membershipId, consultancyId]
    );

    if (!Array.isArray(reqRows) || reqRows.length === 0) {
      return {
        applicable: true,
        totalRequirements: 0,
        confirmedRequirements: 0,
        isComplete: true,
        requirements: [],
      };
    }

    const requirements: StudentOnboardingRequirementItem[] = reqRows.map((r) => {
      let derivedStatus: OnboardingRequirementStatus = "PENDING";

      if (r.progress_status === "CONFIRMED") {
        // Confirmação válida exige confirmed_at e confirmed_by_user_id consistentes
        if (r.confirmed_at !== null && r.confirmed_by_user_id !== null) {
          derivedStatus = "CONFIRMED";
        } else {
          derivedStatus = "PENDING";
        }
      } else if (r.progress_status === "SUBMITTED") {
        derivedStatus = "SUBMITTED";
      } else {
        derivedStatus = "PENDING";
      }

      return {
        publicId: String(r.public_id),
        key: String(r.requirement_key),
        title: String(r.title),
        type: String(r.requirement_type),
        externalUrl: String(r.external_url),
        sortOrder: Number(r.sort_order),
        status: derivedStatus,
        submittedAt: r.submitted_at ? new Date(r.submitted_at) : null,
        confirmedAt: r.confirmed_at ? new Date(r.confirmed_at) : null,
      };
    });

    const totalRequirements = requirements.length;
    const confirmedRequirements = requirements.filter((r) => r.status === "CONFIRMED").length;
    const isComplete = totalRequirements > 0 && confirmedRequirements === totalRequirements;

    return {
      applicable: true,
      totalRequirements,
      confirmedRequirements,
      isComplete,
      requirements,
    };
  } catch {
    return fallbackResult;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export async function isStudentOnboardingComplete(
  userId: number,
  consultancySlug: string
): Promise<boolean> {
  const result = await getStudentOnboardingStatus(userId, consultancySlug);
  if (!result.applicable) {
    return true;
  }
  return result.isComplete;
}

export async function submitStudentOnboardingRequirement(
  userId: number,
  consultancySlug: string,
  requirementPublicId: string
): Promise<SubmitStudentOnboardingResult> {
  if (!userId || typeof userId !== "number" || userId <= 0) {
    return { success: false, error: "Usuário inválido ou não autenticado." };
  }

  if (!consultancySlug || typeof consultancySlug !== "string" || !consultancySlug.trim()) {
    return { success: false, error: "Consultoria inválida." };
  }

  if (
    !requirementPublicId ||
    typeof requirementPublicId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      requirementPublicId.trim()
    )
  ) {
    return { success: false, error: "Requisito de onboarding inválido." };
  }

  const slug = consultancySlug.trim();
  const reqPublicId = requirementPublicId.trim();

  let connection;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 1. Revalidar consultoria ativa
    const [consultancyRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, name, slug, status
       FROM consultancies
       WHERE slug = ?
         AND status = 'ACTIVE'
         AND deleted_at IS NULL
       LIMIT 1;`,
      [slug]
    );

    if (!Array.isArray(consultancyRows) || consultancyRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Consultoria não encontrada ou inativa." };
    }

    const consultancyId = Number(consultancyRows[0].id);

    // 2. Revalidar usuário ativo
    const [userRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, status
       FROM users
       WHERE id = ?
         AND status = 'ACTIVE'
         AND deleted_at IS NULL
       LIMIT 1;`,
      [userId]
    );

    if (!Array.isArray(userRows) || userRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Usuário não encontrado ou inativo." };
    }

    // 3. Revalidar membership ativa com lock FOR UPDATE e verificar role STUDENT
    const [membershipRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        cm.id AS membership_id,
        GROUP_CONCAT(DISTINCT cmr.role SEPARATOR ',') AS roles_csv
       FROM consultancy_members cm
       LEFT JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.consultancy_id = ?
         AND cm.user_id = ?
         AND cm.status = 'ACTIVE'
       GROUP BY cm.id
       FOR UPDATE;`,
      [consultancyId, userId]
    );

    if (!Array.isArray(membershipRows) || membershipRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Acesso à consultoria não autorizado." };
    }

    const membership = membershipRows[0];
    const membershipId = Number(membership.membership_id);
    const rawRoles = membership.roles_csv ? String(membership.roles_csv).split(",") : [];

    if (!rawRoles.includes("STUDENT")) {
      await connection.rollback();
      return { success: false, error: "Apenas alunos podem submeter requisitos de onboarding." };
    }

    // 4. Revalidar requisito ativo no tenant com role STUDENT e tipo EXTERNAL_FORM
    const [requirementRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        id,
        public_id,
        requirement_key,
        requirement_type,
        status,
        deleted_at
       FROM consultancy_onboarding_requirements
       WHERE public_id = ?
         AND consultancy_id = ?
         AND applies_to_role = 'STUDENT'
         AND status = 'ACTIVE'
         AND deleted_at IS NULL
       FOR UPDATE;`,
      [reqPublicId, consultancyId]
    );

    if (!Array.isArray(requirementRows) || requirementRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Requisito de onboarding não encontrado ou inativo." };
    }

    const requirement = requirementRows[0];
    const requirementId = Number(requirement.id);

    if (requirement.requirement_type !== "EXTERNAL_FORM") {
      await connection.rollback();
      return { success: false, error: "Tipo de requisito não suportado para submissão." };
    }

    // 5. Buscar progresso existente com lock FOR UPDATE
    const [progressRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        id,
        public_id,
        status
       FROM consultancy_member_onboarding_requirements
       WHERE membership_id = ?
         AND requirement_id = ?
       FOR UPDATE;`,
      [membershipId, requirementId]
    );

    const hasProgress = Array.isArray(progressRows) && progressRows.length > 0;

    let targetPublicId: string;

    if (!hasProgress) {
      // Cria nova linha de progresso com status SUBMITTED
      targetPublicId = crypto.randomUUID();

      const [insertResult] = await connection.execute<ResultSetHeader>(
        `INSERT INTO consultancy_member_onboarding_requirements (
          public_id,
          membership_id,
          requirement_id,
          status,
          submitted_at,
          confirmed_at,
          confirmed_by_user_id,
          created_at,
          updated_at
        ) VALUES (
          ?,
          ?,
          ?,
          'SUBMITTED',
          UTC_TIMESTAMP(3),
          NULL,
          NULL,
          UTC_TIMESTAMP(3),
          UTC_TIMESTAMP(3)
        );`,
        [targetPublicId, membershipId, requirementId]
      );

      if (insertResult.affectedRows !== 1) {
        await connection.rollback();
        return { success: false, error: "Falha ao registrar envio do formulário." };
      }
    } else {
      const currentProgress = progressRows[0];
      targetPublicId = String(currentProgress.public_id);
      const currentStatus = String(currentProgress.status);

      if (currentStatus === "SUBMITTED") {
        // Já está aguardando confirmação (idempotente)
        await connection.rollback();
        return {
          success: true,
          status: "SUBMITTED",
          message: "Este formulário já está aguardando confirmação.",
        };
      }

      if (currentStatus === "CONFIRMED") {
        // Já confirmado, não pode ser alterado pelo aluno
        await connection.rollback();
        return {
          success: true,
          status: "CONFIRMED",
          message: "Este requisito já foi confirmado pela consultoria.",
        };
      }

      if (currentStatus === "PENDING") {
        // Atualiza de PENDING para SUBMITTED
        const [updateResult] = await connection.execute<ResultSetHeader>(
          `UPDATE consultancy_member_onboarding_requirements
           SET status = 'SUBMITTED',
               submitted_at = UTC_TIMESTAMP(3),
               updated_at = UTC_TIMESTAMP(3)
           WHERE id = ?;`,
          [Number(currentProgress.id)]
        );

        if (updateResult.affectedRows !== 1) {
          await connection.rollback();
          return { success: false, error: "Falha ao atualizar status do formulário." };
        }
      } else {
        // Status desconhecido -> fail closed
        await connection.rollback();
        return { success: false, error: "Status de progresso inválido." };
      }
    }

    // 6. Gravar evento de auditoria
    const auditPublicId = crypto.randomUUID();
    const [auditResult] = await connection.execute<ResultSetHeader>(
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
        'STUDENT_ONBOARDING_REQUIREMENT_SUBMITTED',
        'MEMBER_ONBOARDING_REQUIREMENT',
        ?,
        NULL,
        UTC_TIMESTAMP(3)
      );`,
      [auditPublicId, userId, consultancyId, targetPublicId]
    );

    if (auditResult.affectedRows !== 1) {
      await connection.rollback();
      return { success: false, error: "Falha ao registrar auditoria de envio." };
    }

    await connection.commit();

    return {
      success: true,
      status: "SUBMITTED",
      message: "Preenchimento registrado com sucesso. Aguardando confirmação da consultoria.",
    };
  } catch {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    return { success: false, error: "Erro interno ao registrar envio do formulário." };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
