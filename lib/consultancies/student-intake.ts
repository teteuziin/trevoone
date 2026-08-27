import crypto from "node:crypto";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";
import {
  getIntakeFormDefinition,
  validateIntakeDraftResponses,
  validateIntakeSubmitResponses,
  type IntakeFormDefinition,
} from "./intake-schemas";

export type IntakeSubmissionStatus = "DRAFT" | "SUBMITTED";

export type StudentIntakeSubmissionSummary = {
  formKey: string;
  formVersion: string;
  title: string;
  status: IntakeSubmissionStatus | "NOT_STARTED";
  requirementStatus: "PENDING" | "SUBMITTED" | "CONFIRMED";
  requirementPublicId: string;
  submissionPublicId: string | null;
  startedAt: Date | null;
  submittedAt: Date | null;
  confirmedAt: Date | null;
  isCompleted: boolean;
  hasNativeContent: boolean;
};

export type StudentIntakeSubmissionDetail = {
  success: boolean;
  error?: string;
  form?: IntakeFormDefinition;
  submission?: {
    publicId: string;
    formKey: string;
    formVersion: string;
    status: IntakeSubmissionStatus;
    responses: Record<string, string>;
    startedAt: Date;
    submittedAt: Date | null;
    isEditable: boolean;
  };
  requirement?: {
    publicId: string;
    status: "PENDING" | "SUBMITTED" | "CONFIRMED";
    confirmedAt: Date | null;
  };
};

export type SaveIntakeDraftResult = {
  success: boolean;
  error?: string;
  validationErrors?: Record<string, string>;
  submissionPublicId?: string;
  status?: IntakeSubmissionStatus;
};

export type SubmitIntakeResult = {
  success: boolean;
  error?: string;
  validationErrors?: Record<string, string>;
  submissionPublicId?: string;
  status?: IntakeSubmissionStatus;
  requirementStatus?: "PENDING" | "SUBMITTED" | "CONFIRMED";
};

export type AdminStudentIntakeResult = {
  authorized: boolean;
  error?: string;
  student?: {
    memberPublicId: string;
    fullName: string;
    email: string;
  };
  form?: IntakeFormDefinition;
  submission?: {
    publicId: string;
    formKey: string;
    formVersion: string;
    status: IntakeSubmissionStatus;
    responses: Record<string, string>;
    startedAt: Date;
    submittedAt: Date | null;
  };
  requirement?: {
    publicId: string;
    status: "PENDING" | "SUBMITTED" | "CONFIRMED";
    confirmedAt: Date | null;
  };
  isLegacyWithoutNativeContent?: boolean;
};

/**
 * Resolves the matching requirement record for a given formKey within a consultancy.
 * Matches explicit formKey or legacy keys (student-form-1 / student-form-2).
 */
function getRequirementKeyCandidates(formKey: string): string[] {
  if (formKey === "physical-assessment") {
    return ["physical-assessment", "student-form-1"];
  }
  if (formKey === "complete-anamnesis") {
    return ["complete-anamnesis", "student-form-2"];
  }
  return [formKey];
}

/**
 * Retrieves the intake summary for all native forms for a student.
 */
export async function getStudentIntakeSummary(
  userId: number,
  consultancySlug: string
): Promise<{ success: boolean; error?: string; summary?: StudentIntakeSubmissionSummary[] }> {
  if (!userId || typeof userId !== "number" || userId <= 0) {
    return { success: false, error: "Usuário inválido ou não autenticado." };
  }
  if (!consultancySlug || typeof consultancySlug !== "string" || !consultancySlug.trim()) {
    return { success: false, error: "Consultoria inválida." };
  }

  const slug = consultancySlug.trim();
  let connection;
  try {
    connection = await getDbConnection();

    // 1. Resolve student membership
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
      return { success: false, error: "Vínculo com a consultoria não encontrado." };
    }

    const membership = membershipRows[0];
    const membershipId = Number(membership.membership_id);
    const consultancyId = Number(membership.consultancy_id);
    const roles = membership.roles_csv ? String(membership.roles_csv).split(",") : [];

    if (!roles.includes("STUDENT")) {
      return { success: false, error: "Apenas alunos possuem formulários de intake." };
    }

    // 2. Query all active STUDENT requirements + member progress + native submissions
    const [reqRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        cor.id AS requirement_id,
        cor.public_id AS requirement_public_id,
        cor.requirement_key,
        cor.title,
        cor.sort_order,
        cmor.status AS progress_status,
        cmor.submitted_at AS req_submitted_at,
        cmor.confirmed_at AS req_confirmed_at,
        sis.public_id AS submission_public_id,
        sis.form_key,
        sis.form_version,
        sis.status AS submission_status,
        sis.started_at AS submission_started_at,
        sis.submitted_at AS submission_submitted_at
       FROM consultancy_onboarding_requirements cor
       LEFT JOIN consultancy_member_onboarding_requirements cmor
         ON cmor.requirement_id = cor.id
        AND cmor.membership_id = ?
       LEFT JOIN student_intake_submissions sis
         ON sis.onboarding_requirement_id = cor.id
        AND sis.membership_id = ?
       WHERE cor.consultancy_id = ?
         AND cor.applies_to_role = 'STUDENT'
         AND cor.status = 'ACTIVE'
         AND cor.deleted_at IS NULL
       ORDER BY cor.sort_order ASC, cor.id ASC;`,
      [membershipId, membershipId, consultancyId]
    );

    const summary: StudentIntakeSubmissionSummary[] = (Array.isArray(reqRows) ? reqRows : []).map((r) => {
      // Determine canonical formKey
      let formKey = String(r.form_key || "");
      if (!formKey) {
        const reqKey = String(r.requirement_key || "");
        if (reqKey === "student-form-1" || reqKey === "physical-assessment") {
          formKey = "physical-assessment";
        } else if (reqKey === "student-form-2" || reqKey === "complete-anamnesis") {
          formKey = "complete-anamnesis";
        } else {
          formKey = reqKey;
        }
      }

      const formDef = getIntakeFormDefinition(formKey);
      const title = formDef ? formDef.title : String(r.title);
      const formVersion = String(r.form_version || (formDef ? formDef.version : "1.0"));

      let subStatus: IntakeSubmissionStatus | "NOT_STARTED" = "NOT_STARTED";
      if (r.submission_status === "SUBMITTED") {
        subStatus = "SUBMITTED";
      } else if (r.submission_status === "DRAFT") {
        subStatus = "DRAFT";
      }

      let reqStatus: "PENDING" | "SUBMITTED" | "CONFIRMED" = "PENDING";
      if (r.progress_status === "CONFIRMED") {
        reqStatus = "CONFIRMED";
      } else if (r.progress_status === "SUBMITTED") {
        reqStatus = "SUBMITTED";
      }

      const hasNative = Boolean(r.submission_public_id);
      const isCompleted = reqStatus === "CONFIRMED" || subStatus === "SUBMITTED";

      return {
        formKey,
        formVersion,
        title,
        status: subStatus,
        requirementStatus: reqStatus,
        requirementPublicId: String(r.requirement_public_id),
        submissionPublicId: r.submission_public_id ? String(r.submission_public_id) : null,
        startedAt: r.submission_started_at ? new Date(r.submission_started_at) : null,
        submittedAt: r.submission_submitted_at ? new Date(r.submission_submitted_at) : null,
        confirmedAt: r.req_confirmed_at ? new Date(r.req_confirmed_at) : null,
        isCompleted,
        hasNativeContent: hasNative,
      };
    });

    return { success: true, summary };
  } catch {
    return { success: false, error: "Falha ao carregar resumo de formulários." };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Retrieves the detailed submission or draft for a specific formKey.
 */
export async function getStudentIntakeSubmission(
  userId: number,
  consultancySlug: string,
  formKey: string
): Promise<StudentIntakeSubmissionDetail> {
  if (!userId || typeof userId !== "number" || userId <= 0) {
    return { success: false, error: "Usuário inválido ou não autenticado." };
  }
  if (!consultancySlug || typeof consultancySlug !== "string" || !consultancySlug.trim()) {
    return { success: false, error: "Consultoria inválida." };
  }
  if (!formKey || typeof formKey !== "string" || !formKey.trim()) {
    return { success: false, error: "Formulário não informado." };
  }

  const cleanFormKey = formKey.trim();
  const formDef = getIntakeFormDefinition(cleanFormKey);
  if (!formDef) {
    return { success: false, error: "Formulário não encontrado ou não suportado." };
  }

  const slug = consultancySlug.trim();
  let connection;
  try {
    connection = await getDbConnection();

    // 1. Resolve membership
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
      return { success: false, error: "Vínculo com a consultoria não encontrado." };
    }

    const membership = membershipRows[0];
    const membershipId = Number(membership.membership_id);
    const consultancyId = Number(membership.consultancy_id);
    const roles = membership.roles_csv ? String(membership.roles_csv).split(",") : [];

    if (!roles.includes("STUDENT")) {
      return { success: false, error: "Apenas alunos podem preencher formulários de intake." };
    }

    // 2. Find matching requirement in consultancy
    const candidateKeys = getRequirementKeyCandidates(cleanFormKey);
    const placeholders = candidateKeys.map(() => "?").join(",");
    const [reqRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, requirement_key, status
       FROM consultancy_onboarding_requirements
       WHERE consultancy_id = ?
         AND requirement_key IN (${placeholders})
         AND applies_to_role = 'STUDENT'
         AND status = 'ACTIVE'
         AND deleted_at IS NULL
       LIMIT 1;`,
      [consultancyId, ...candidateKeys]
    );

    if (!Array.isArray(reqRows) || reqRows.length === 0) {
      return { success: false, error: "Requisito de onboarding correspondente não encontrado." };
    }

    const req = reqRows[0];
    const requirementId = Number(req.id);
    const requirementPublicId = String(req.public_id);

    // 3. Query member requirement progress & native submission
    const [progressRows] = await connection.execute<RowDataPacket[]>(
      `SELECT status, submitted_at, confirmed_at
       FROM consultancy_member_onboarding_requirements
       WHERE membership_id = ?
         AND requirement_id = ?
       LIMIT 1;`,
      [membershipId, requirementId]
    );

    let reqStatus: "PENDING" | "SUBMITTED" | "CONFIRMED" = "PENDING";
    let reqConfirmedAt: Date | null = null;
    if (Array.isArray(progressRows) && progressRows.length > 0) {
      const p = progressRows[0];
      if (p.status === "CONFIRMED") reqStatus = "CONFIRMED";
      else if (p.status === "SUBMITTED") reqStatus = "SUBMITTED";
      if (p.confirmed_at) reqConfirmedAt = new Date(p.confirmed_at);
    }

    const [subRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        public_id,
        form_key,
        form_version,
        status,
        responses_json,
        started_at,
        submitted_at
       FROM student_intake_submissions
       WHERE membership_id = ?
         AND onboarding_requirement_id = ?
         AND form_key = ?
         AND form_version = ?
       LIMIT 1;`,
      [membershipId, requirementId, cleanFormKey, formDef.version]
    );

    if (!Array.isArray(subRows) || subRows.length === 0) {
      return {
        success: true,
        form: formDef,
        submission: undefined,
        requirement: {
          publicId: requirementPublicId,
          status: reqStatus,
          confirmedAt: reqConfirmedAt,
        },
      };
    }

    const sub = subRows[0];
    let parsedResponses: Record<string, string> = {};
    if (sub.responses_json) {
      try {
        parsedResponses = typeof sub.responses_json === "string"
          ? JSON.parse(sub.responses_json)
          : sub.responses_json;
      } catch {
        parsedResponses = {};
      }
    }

    const subStatus: IntakeSubmissionStatus = sub.status === "SUBMITTED" ? "SUBMITTED" : "DRAFT";
    // Student can only edit if status is DRAFT and requirement is not CONFIRMED
    const isEditable = subStatus === "DRAFT" && reqStatus !== "CONFIRMED";

    return {
      success: true,
      form: formDef,
      submission: {
        publicId: String(sub.public_id),
        formKey: String(sub.form_key),
        formVersion: String(sub.form_version),
        status: subStatus,
        responses: parsedResponses,
        startedAt: new Date(sub.started_at),
        submittedAt: sub.submitted_at ? new Date(sub.submitted_at) : null,
        isEditable,
      },
      requirement: {
        publicId: requirementPublicId,
        status: reqStatus,
        confirmedAt: reqConfirmedAt,
      },
    };
  } catch {
    return { success: false, error: "Falha ao carregar submissão de formulário." };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Saves or updates a DRAFT response for a student intake form.
 * Does not change the requirement status from PENDING.
 */
export async function saveStudentIntakeDraft(
  userId: number,
  consultancySlug: string,
  formKey: string,
  responses: Record<string, unknown>
): Promise<SaveIntakeDraftResult> {
  if (!userId || typeof userId !== "number" || userId <= 0) {
    return { success: false, error: "Usuário inválido ou não autenticado." };
  }
  if (!consultancySlug || typeof consultancySlug !== "string" || !consultancySlug.trim()) {
    return { success: false, error: "Consultoria inválida." };
  }
  if (!formKey || typeof formKey !== "string" || !formKey.trim()) {
    return { success: false, error: "Formulário não informado." };
  }

  const cleanFormKey = formKey.trim();
  const formDef = getIntakeFormDefinition(cleanFormKey);
  if (!formDef) {
    return { success: false, error: "Formulário não encontrado ou não suportado." };
  }

  // 1. Validate draft responses format
  const validation = validateIntakeDraftResponses(formDef, responses);
  if (!validation.valid) {
    return {
      success: false,
      error: "Existem campos com formato inválido no rascunho.",
      validationErrors: validation.errors,
    };
  }

  const slug = consultancySlug.trim();
  let connection;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 2. Resolve membership with lock FOR UPDATE
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
       FOR UPDATE;`,
      [slug, userId]
    );

    if (!Array.isArray(membershipRows) || membershipRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Vínculo com a consultoria não encontrado." };
    }

    const membership = membershipRows[0];
    const membershipId = Number(membership.membership_id);
    const consultancyId = Number(membership.consultancy_id);
    const roles = membership.roles_csv ? String(membership.roles_csv).split(",") : [];

    if (!roles.includes("STUDENT")) {
      await connection.rollback();
      return { success: false, error: "Apenas alunos podem salvar rascunho de intake." };
    }

    // 3. Find matching requirement
    const candidateKeys = getRequirementKeyCandidates(cleanFormKey);
    const placeholders = candidateKeys.map(() => "?").join(",");
    const [reqRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, status
       FROM consultancy_onboarding_requirements
       WHERE consultancy_id = ?
         AND requirement_key IN (${placeholders})
         AND applies_to_role = 'STUDENT'
         AND status = 'ACTIVE'
         AND deleted_at IS NULL
       FOR UPDATE;`,
      [consultancyId, ...candidateKeys]
    );

    if (!Array.isArray(reqRows) || reqRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Requisito de onboarding não encontrado." };
    }

    const requirementId = Number(reqRows[0].id);

    // 4. Check existing submission
    const [subRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, status
       FROM student_intake_submissions
       WHERE membership_id = ?
         AND onboarding_requirement_id = ?
         AND form_key = ?
         AND form_version = ?
       FOR UPDATE;`,
      [membershipId, requirementId, cleanFormKey, formDef.version]
    );

    const serializedJson = JSON.stringify(responses);
    let submissionPublicId: string;

    if (Array.isArray(subRows) && subRows.length > 0) {
      const existing = subRows[0];
      if (existing.status === "SUBMITTED") {
        await connection.rollback();
        return {
          success: false,
          error: "Este formulário já foi submetido e não pode ser editado.",
          status: "SUBMITTED",
        };
      }

      submissionPublicId = String(existing.public_id);
      const [updateResult] = await connection.execute<ResultSetHeader>(
        `UPDATE student_intake_submissions
         SET responses_json = ?,
             updated_at = UTC_TIMESTAMP(3)
         WHERE id = ?;`,
        [serializedJson, Number(existing.id)]
      );

      if (updateResult.affectedRows !== 1) {
        await connection.rollback();
        return { success: false, error: "Falha ao atualizar rascunho." };
      }
    } else {
      submissionPublicId = crypto.randomUUID();
      const [insertResult] = await connection.execute<ResultSetHeader>(
        `INSERT INTO student_intake_submissions (
          public_id,
          consultancy_id,
          membership_id,
          user_id,
          onboarding_requirement_id,
          form_key,
          form_version,
          status,
          responses_json,
          started_at,
          submitted_at,
          created_at,
          updated_at
        ) VALUES (
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          'DRAFT',
          ?,
          UTC_TIMESTAMP(3),
          NULL,
          UTC_TIMESTAMP(3),
          UTC_TIMESTAMP(3)
        );`,
        [
          submissionPublicId,
          consultancyId,
          membershipId,
          userId,
          requirementId,
          cleanFormKey,
          formDef.version,
          serializedJson,
        ]
      );

      if (insertResult.affectedRows !== 1) {
        await connection.rollback();
        return { success: false, error: "Falha ao criar rascunho." };
      }
    }

    await connection.commit();
    return {
      success: true,
      submissionPublicId,
      status: "DRAFT",
    };
  } catch {
    if (connection) await connection.rollback();
    return { success: false, error: "Erro interno ao salvar rascunho." };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Submits a completed student intake form.
 * Validates all required fields, creates/updates submission to SUBMITTED,
 * and atomically updates the matching consultancy_member_onboarding_requirements to SUBMITTED.
 */
export async function submitStudentIntake(
  userId: number,
  consultancySlug: string,
  formKey: string,
  responses: Record<string, unknown>
): Promise<SubmitIntakeResult> {
  if (!userId || typeof userId !== "number" || userId <= 0) {
    return { success: false, error: "Usuário inválido ou não autenticado." };
  }
  if (!consultancySlug || typeof consultancySlug !== "string" || !consultancySlug.trim()) {
    return { success: false, error: "Consultoria inválida." };
  }
  if (!formKey || typeof formKey !== "string" || !formKey.trim()) {
    return { success: false, error: "Formulário não informado." };
  }

  const cleanFormKey = formKey.trim();
  const formDef = getIntakeFormDefinition(cleanFormKey);
  if (!formDef) {
    return { success: false, error: "Formulário não encontrado ou não suportado." };
  }

  // 1. Full validation (all required fields must be present and valid)
  const validation = validateIntakeSubmitResponses(formDef, responses);
  if (!validation.valid) {
    return {
      success: false,
      error: "Por favor, preencha todos os campos obrigatórios corretamente.",
      validationErrors: validation.errors,
    };
  }

  const slug = consultancySlug.trim();
  let connection;
  try {
    connection = await getDbConnection();
    await connection.beginTransaction();

    // 2. Resolve membership with lock FOR UPDATE
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
       FOR UPDATE;`,
      [slug, userId]
    );

    if (!Array.isArray(membershipRows) || membershipRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Vínculo com a consultoria não encontrado." };
    }

    const membership = membershipRows[0];
    const membershipId = Number(membership.membership_id);
    const consultancyId = Number(membership.consultancy_id);
    const roles = membership.roles_csv ? String(membership.roles_csv).split(",") : [];

    if (!roles.includes("STUDENT")) {
      await connection.rollback();
      return { success: false, error: "Apenas alunos podem submeter formulários de intake." };
    }

    // 3. Find matching requirement
    const candidateKeys = getRequirementKeyCandidates(cleanFormKey);
    const placeholders = candidateKeys.map(() => "?").join(",");
    const [reqRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, status
       FROM consultancy_onboarding_requirements
       WHERE consultancy_id = ?
         AND requirement_key IN (${placeholders})
         AND applies_to_role = 'STUDENT'
         AND status = 'ACTIVE'
         AND deleted_at IS NULL
       FOR UPDATE;`,
      [consultancyId, ...candidateKeys]
    );

    if (!Array.isArray(reqRows) || reqRows.length === 0) {
      await connection.rollback();
      return { success: false, error: "Requisito de onboarding não encontrado." };
    }

    const requirementId = Number(reqRows[0].id);

    // 4. Lock and check submission state
    const [subRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, status, submitted_at
       FROM student_intake_submissions
       WHERE membership_id = ?
         AND onboarding_requirement_id = ?
         AND form_key = ?
         AND form_version = ?
       FOR UPDATE;`,
      [membershipId, requirementId, cleanFormKey, formDef.version]
    );

    let submissionPublicId: string;
    const serializedJson = JSON.stringify(responses);

    if (Array.isArray(subRows) && subRows.length > 0) {
      const existing = subRows[0];
      submissionPublicId = String(existing.public_id);

      if (existing.status === "SUBMITTED") {
        // Idempotent retry: do not overwrite submitted_at or responses
        await connection.commit();
        return {
          success: true,
          submissionPublicId,
          status: "SUBMITTED",
          requirementStatus: "SUBMITTED",
        };
      }

      // Transition DRAFT -> SUBMITTED
      const [updateSubResult] = await connection.execute<ResultSetHeader>(
        `UPDATE student_intake_submissions
         SET status = 'SUBMITTED',
             responses_json = ?,
             submitted_at = UTC_TIMESTAMP(3),
             updated_at = UTC_TIMESTAMP(3)
         WHERE id = ?;`,
        [serializedJson, Number(existing.id)]
      );

      if (updateSubResult.affectedRows !== 1) {
        await connection.rollback();
        return { success: false, error: "Falha ao submeter formulário." };
      }
    } else {
      // First save is directly SUBMITTED
      submissionPublicId = crypto.randomUUID();
      const [insertSubResult] = await connection.execute<ResultSetHeader>(
        `INSERT INTO student_intake_submissions (
          public_id,
          consultancy_id,
          membership_id,
          user_id,
          onboarding_requirement_id,
          form_key,
          form_version,
          status,
          responses_json,
          started_at,
          submitted_at,
          created_at,
          updated_at
        ) VALUES (
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          'SUBMITTED',
          ?,
          UTC_TIMESTAMP(3),
          UTC_TIMESTAMP(3),
          UTC_TIMESTAMP(3),
          UTC_TIMESTAMP(3)
        );`,
        [
          submissionPublicId,
          consultancyId,
          membershipId,
          userId,
          requirementId,
          cleanFormKey,
          formDef.version,
          serializedJson,
        ]
      );

      if (insertSubResult.affectedRows !== 1) {
        await connection.rollback();
        return { success: false, error: "Falha ao registrar submissão." };
      }
    }

    // 5. Atomically transition member requirement progress to SUBMITTED
    const [progressRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, status
       FROM consultancy_member_onboarding_requirements
       WHERE membership_id = ?
         AND requirement_id = ?
       FOR UPDATE;`,
      [membershipId, requirementId]
    );

    let finalReqStatus: "PENDING" | "SUBMITTED" | "CONFIRMED" = "SUBMITTED";

    if (Array.isArray(progressRows) && progressRows.length > 0) {
      const prog = progressRows[0];
      if (prog.status === "CONFIRMED") {
        // Preserve CONFIRMED if previously approved
        finalReqStatus = "CONFIRMED";
      } else if (prog.status === "PENDING") {
        const [updateProgResult] = await connection.execute<ResultSetHeader>(
          `UPDATE consultancy_member_onboarding_requirements
           SET status = 'SUBMITTED',
               submitted_at = UTC_TIMESTAMP(3),
               updated_at = UTC_TIMESTAMP(3)
           WHERE id = ?;`,
          [Number(prog.id)]
        );

        if (updateProgResult.affectedRows !== 1) {
          await connection.rollback();
          return { success: false, error: "Falha ao atualizar requisito de onboarding." };
        }
      }
    } else {
      const progPublicId = crypto.randomUUID();
      const [insertProgResult] = await connection.execute<ResultSetHeader>(
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
        [progPublicId, membershipId, requirementId]
      );

      if (insertProgResult.affectedRows !== 1) {
        await connection.rollback();
        return { success: false, error: "Falha ao vincular requisito de onboarding." };
      }
    }

    // 6. Record audit event
    const auditPublicId = crypto.randomUUID();
    await connection.execute<ResultSetHeader>(
      `INSERT INTO audit_events (
        public_id,
        actor_user_id,
        consultancy_id,
        event_type,
        target_type,
        target_id,
        payload,
        ip_address,
        user_agent,
        created_at
      ) VALUES (
        ?,
        ?,
        ?,
        'STUDENT_INTAKE_SUBMITTED',
        'STUDENT_INTAKE_SUBMISSION',
        ?,
        ?,
        NULL,
        NULL,
        UTC_TIMESTAMP(3)
      );`,
      [
        auditPublicId,
        userId,
        consultancyId,
        submissionPublicId,
        JSON.stringify({
          formKey: cleanFormKey,
          formVersion: formDef.version,
          status: "SUBMITTED",
        }),
      ]
    );

    await connection.commit();
    return {
      success: true,
      submissionPublicId,
      status: "SUBMITTED",
      requirementStatus: finalReqStatus,
    };
  } catch {
    if (connection) await connection.rollback();
    return { success: false, error: "Erro interno ao submeter formulário." };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Retrieves student intake submission details for consultancy administration and review.
 * Only authorized for active CONSULTANCY_ADMIN members of the exact tenant.
 */
export async function getAdminStudentIntakeSubmission(
  actorUserId: number,
  consultancySlug: string,
  memberPublicId: string,
  formKey: string
): Promise<AdminStudentIntakeResult> {
  if (!actorUserId || typeof actorUserId !== "number" || actorUserId <= 0) {
    return { authorized: false, error: "Usuário inválido ou não autenticado." };
  }
  if (!consultancySlug || typeof consultancySlug !== "string" || !consultancySlug.trim()) {
    return { authorized: false, error: "Consultoria inválida." };
  }
  if (!memberPublicId || typeof memberPublicId !== "string" || !memberPublicId.trim()) {
    return { authorized: false, error: "Membro não informado." };
  }
  if (!formKey || typeof formKey !== "string" || !formKey.trim()) {
    return { authorized: false, error: "Formulário não informado." };
  }

  const cleanFormKey = formKey.trim();
  const formDef = getIntakeFormDefinition(cleanFormKey);
  if (!formDef) {
    return { authorized: false, error: "Formulário não encontrado ou não suportado." };
  }

  const slug = consultancySlug.trim();
  const targetMemberPublicId = memberPublicId.trim();

  let connection;
  try {
    connection = await getDbConnection();

    // 1. Verify actor has CONSULTANCY_ADMIN role in the tenancy
    const [adminRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
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
       GROUP BY c.id
       LIMIT 1;`,
      [slug, actorUserId]
    );

    if (!Array.isArray(adminRows) || adminRows.length === 0) {
      return { authorized: false, error: "Acesso não autorizado." };
    }

    const consultancyId = Number(adminRows[0].consultancy_id);
    const adminRoles = adminRows[0].roles_csv ? String(adminRows[0].roles_csv).split(",") : [];

    if (!adminRoles.includes("CONSULTANCY_ADMIN")) {
      return { authorized: false, error: "Apenas administradores da consultoria podem visualizar formulários dos alunos." };
    }

    // 2. Fetch target student member
    const [studentRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        cm.id AS membership_id,
        u.id AS user_id,
        u.full_name,
        u.email,
        GROUP_CONCAT(DISTINCT cmr.role SEPARATOR ',') AS roles_csv
       FROM consultancy_members cm
       INNER JOIN users u ON u.id = cm.user_id
       LEFT JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.public_id = ?
         AND cm.consultancy_id = ?
         AND cm.status = 'ACTIVE'
         AND u.deleted_at IS NULL
       GROUP BY cm.id, u.id
       LIMIT 1;`,
      [targetMemberPublicId, consultancyId]
    );

    if (!Array.isArray(studentRows) || studentRows.length === 0) {
      return { authorized: false, error: "Aluno não encontrado neste ambiente." };
    }

    const student = studentRows[0];
    const membershipId = Number(student.membership_id);
    const studentRoles = student.roles_csv ? String(student.roles_csv).split(",") : [];

    if (!studentRoles.includes("STUDENT")) {
      return { authorized: false, error: "O membro informado não possui papel de aluno." };
    }

    // 3. Find matching requirement
    const candidateKeys = getRequirementKeyCandidates(cleanFormKey);
    const placeholders = candidateKeys.map(() => "?").join(",");
    const [reqRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, status
       FROM consultancy_onboarding_requirements
       WHERE consultancy_id = ?
         AND requirement_key IN (${placeholders})
         AND applies_to_role = 'STUDENT'
         AND status = 'ACTIVE'
         AND deleted_at IS NULL
       LIMIT 1;`,
      [consultancyId, ...candidateKeys]
    );

    if (!Array.isArray(reqRows) || reqRows.length === 0) {
      return { authorized: false, error: "Requisito de onboarding não encontrado." };
    }

    const requirementId = Number(reqRows[0].id);
    const requirementPublicId = String(reqRows[0].public_id);

    // 4. Fetch requirement progress
    const [progressRows] = await connection.execute<RowDataPacket[]>(
      `SELECT status, confirmed_at
       FROM consultancy_member_onboarding_requirements
       WHERE membership_id = ?
         AND requirement_id = ?
       LIMIT 1;`,
      [membershipId, requirementId]
    );

    let reqStatus: "PENDING" | "SUBMITTED" | "CONFIRMED" = "PENDING";
    let reqConfirmedAt: Date | null = null;
    if (Array.isArray(progressRows) && progressRows.length > 0) {
      const p = progressRows[0];
      if (p.status === "CONFIRMED") reqStatus = "CONFIRMED";
      else if (p.status === "SUBMITTED") reqStatus = "SUBMITTED";
      if (p.confirmed_at) reqConfirmedAt = new Date(p.confirmed_at);
    }

    // 5. Fetch submission if exists
    const [subRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        public_id,
        form_key,
        form_version,
        status,
        responses_json,
        started_at,
        submitted_at
       FROM student_intake_submissions
       WHERE membership_id = ?
         AND onboarding_requirement_id = ?
         AND form_key = ?
         AND form_version = ?
       LIMIT 1;`,
      [membershipId, requirementId, cleanFormKey, formDef.version]
    );

    if (!Array.isArray(subRows) || subRows.length === 0) {
      return {
        authorized: true,
        student: {
          memberPublicId: targetMemberPublicId,
          fullName: String(student.full_name),
          email: String(student.email),
        },
        form: formDef,
        submission: undefined,
        requirement: {
          publicId: requirementPublicId,
          status: reqStatus,
          confirmedAt: reqConfirmedAt,
        },
        isLegacyWithoutNativeContent: true,
      };
    }

    const sub = subRows[0];
    let parsedResponses: Record<string, string> = {};
    if (sub.responses_json) {
      try {
        parsedResponses = typeof sub.responses_json === "string"
          ? JSON.parse(sub.responses_json)
          : sub.responses_json;
      } catch {
        parsedResponses = {};
      }
    }

    return {
      authorized: true,
      student: {
        memberPublicId: targetMemberPublicId,
        fullName: String(student.full_name),
        email: String(student.email),
      },
      form: formDef,
      submission: {
        publicId: String(sub.public_id),
        formKey: String(sub.form_key),
        formVersion: String(sub.form_version),
        status: sub.status === "SUBMITTED" ? "SUBMITTED" : "DRAFT",
        responses: parsedResponses,
        startedAt: new Date(sub.started_at),
        submittedAt: sub.submitted_at ? new Date(sub.submitted_at) : null,
      },
      requirement: {
        publicId: requirementPublicId,
        status: reqStatus,
        confirmedAt: reqConfirmedAt,
      },
      isLegacyWithoutNativeContent: false,
    };
  } catch {
    return { authorized: false, error: "Falha ao consultar formulário do aluno." };
  } finally {
    if (connection) connection.release();
  }
}
