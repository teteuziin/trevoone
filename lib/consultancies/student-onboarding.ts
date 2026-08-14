import type { RowDataPacket } from "mysql2/promise";
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
