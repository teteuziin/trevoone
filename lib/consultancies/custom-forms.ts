import crypto from "node:crypto";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";
import { resolveConsultancyContext } from "./context";
import {
  createNotificationInTransaction,
  deliverNotificationAfterCommit,
} from "@/services/notification-service";

export type CustomFormFieldType =
  | "SHORT_TEXT"
  | "LONG_TEXT"
  | "NUMBER"
  | "DATE"
  | "SELECT"
  | "BOOLEAN"
  | "ACKNOWLEDGEMENT";

export interface CustomFormFieldDefinition {
  id: string;
  type: CustomFormFieldType;
  label: string;
  description?: string;
  required: boolean;
  placeholder?: string;
  options?: string[]; // For SELECT
  acknowledgementText?: string; // For ACKNOWLEDGEMENT
}

export interface CustomFormTemplateDto {
  publicId: string;
  consultancyId: number;
  title: string;
  description: string | null;
  fields: CustomFormFieldDefinition[];
  isActive: boolean;
  isOnboardingRequired: boolean;
  createdByUserId: number;
  createdAt: string;
  updatedAt: string;
}

export type CustomFormRequestStatus =
  | "PENDING"
  | "SUBMITTED"
  | "CHANGES_REQUESTED"
  | "APPROVED";

export interface CustomFormRequestDto {
  publicId: string;
  consultancyId: number;
  templatePublicId: string;
  templateTitle: string;
  templateDescription: string | null;
  fields: CustomFormFieldDefinition[];
  studentMembershipId: number;
  studentPublicId: string;
  studentName: string;
  studentEmail: string;
  requestedByUserId: number;
  requestedByName: string | null;
  status: CustomFormRequestStatus;
  responses: Record<string, unknown> | null;
  reviewerNotes: string | null;
  reviewedByUserId: number | null;
  reviewedByName: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFormTemplateInput {
  title: string;
  description?: string | null;
  fields: CustomFormFieldDefinition[];
  isOnboardingRequired?: boolean;
}

export interface UpdateFormTemplateInput {
  title?: string;
  description?: string | null;
  fields?: CustomFormFieldDefinition[];
  isActive?: boolean;
  isOnboardingRequired?: boolean;
}

export interface SubmitFormResponsesInput {
  responses: Record<string, unknown>;
}

export interface ReviewFormRequestInput {
  decision: "APPROVE" | "REQUEST_CHANGES";
  notes?: string | null;
}

/**
 * Validates field definitions defensively.
 */
function validateFields(fields: unknown): CustomFormFieldDefinition[] {
  if (!Array.isArray(fields) || fields.length === 0) {
    throw new Error("O formulário deve conter pelo menos um campo.");
  }

  const validTypes: CustomFormFieldType[] = [
    "SHORT_TEXT",
    "LONG_TEXT",
    "NUMBER",
    "DATE",
    "SELECT",
    "BOOLEAN",
    "ACKNOWLEDGEMENT",
  ];

  return fields.map((f, idx) => {
    if (!f || typeof f !== "object") {
      throw new Error(`Campo na posição ${idx + 1} inválido.`);
    }
    const id = String(f.id || `field_${idx + 1}`).trim().slice(0, 64);
    const type = f.type as CustomFormFieldType;
    if (!validTypes.includes(type)) {
      throw new Error(`Tipo de campo '${type}' não suportado.`);
    }
    const label = String(f.label || "").trim().slice(0, 200);
    if (!label) {
      throw new Error(`O campo ${idx + 1} precisa ter um rótulo/pergunta.`);
    }

    const item: CustomFormFieldDefinition = {
      id,
      type,
      label,
      required: Boolean(f.required),
    };

    if (f.description && typeof f.description === "string") {
      item.description = f.description.trim().slice(0, 500);
    }
    if (f.placeholder && typeof f.placeholder === "string") {
      item.placeholder = f.placeholder.trim().slice(0, 100);
    }
    if (type === "SELECT" && Array.isArray(f.options)) {
      item.options = f.options.map((opt: unknown) => String(opt).trim()).filter(Boolean);
    }
    if (type === "ACKNOWLEDGEMENT" && f.acknowledgementText) {
      item.acknowledgementText = String(f.acknowledgementText).trim().slice(0, 1000);
    }

    return item;
  });
}

/**
 * Creates a new custom form template for a consultancy.
 * Restricted to CONSULTANCY_ADMIN.
 */
export async function createFormTemplate(
  userId: number,
  consultancySlug: string,
  input: CreateFormTemplateInput
): Promise<CustomFormTemplateDto> {
  const context = await resolveConsultancyContext(userId, consultancySlug);
  if (!context || !context.roles.includes("CONSULTANCY_ADMIN")) {
    throw new Error("Apenas administradores da consultoria podem criar formulários.");
  }

  const title = String(input.title || "").trim().slice(0, 200);
  if (!title) {
    throw new Error("O título do formulário é obrigatório.");
  }

  const validatedFields = validateFields(input.fields);
  const description = input.description ? String(input.description).trim().slice(0, 2000) : null;
  const isOnboardingRequired = Boolean(input.isOnboardingRequired);
  const publicId = crypto.randomUUID();

  const connection = await getDbConnection();
  try {
    await connection.execute<ResultSetHeader>(
      `INSERT INTO consultancy_custom_form_templates (
        public_id, consultancy_id, title, description, fields_json,
        is_active, is_onboarding_required, created_by_user_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, NOW(3), NOW(3));`,
      [
        publicId,
        context.consultancyId,
        title,
        description,
        JSON.stringify(validatedFields),
        isOnboardingRequired ? 1 : 0,
        userId,
      ]
    );

    return {
      publicId,
      consultancyId: context.consultancyId,
      title,
      description,
      fields: validatedFields,
      isActive: true,
      isOnboardingRequired,
      createdByUserId: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } finally {
    connection.release();
  }
}

/**
 * Lists form templates for a consultancy.
 * Admins see all (active/inactive); others see active only.
 */
export async function listFormTemplates(
  userId: number,
  consultancySlug: string
): Promise<CustomFormTemplateDto[]> {
  const context = await resolveConsultancyContext(userId, consultancySlug);
  if (!context) {
    throw new Error("Acesso negado à consultoria.");
  }

  const isAdmin = context.roles.includes("CONSULTANCY_ADMIN");
  const connection = await getDbConnection();
  try {
    const whereSql = isAdmin
      ? `WHERE consultancy_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`
      : `WHERE consultancy_id = ? AND is_active = 1 AND deleted_at IS NULL ORDER BY created_at DESC`;

    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        public_id, consultancy_id, title, description, fields_json,
        is_active, is_onboarding_required, created_by_user_id, created_at, updated_at
      FROM consultancy_custom_form_templates
      ${whereSql};`,
      [context.consultancyId]
    );

    return rows.map((r) => {
      let fields: CustomFormFieldDefinition[] = [];
      try {
        fields = typeof r.fields_json === "string" ? JSON.parse(r.fields_json) : r.fields_json;
      } catch {
        fields = [];
      }

      return {
        publicId: String(r.public_id),
        consultancyId: Number(r.consultancy_id),
        title: String(r.title),
        description: r.description ? String(r.description) : null,
        fields,
        isActive: Boolean(r.is_active),
        isOnboardingRequired: Boolean(r.is_onboarding_required),
        createdByUserId: Number(r.created_by_user_id),
        createdAt: new Date(r.created_at).toISOString(),
        updatedAt: new Date(r.updated_at).toISOString(),
      };
    });
  } finally {
    connection.release();
  }
}

/**
 * Updates a form template.
 * Restricted to CONSULTANCY_ADMIN.
 */
export async function updateFormTemplate(
  userId: number,
  consultancySlug: string,
  templatePublicId: string,
  input: UpdateFormTemplateInput
): Promise<boolean> {
  const context = await resolveConsultancyContext(userId, consultancySlug);
  if (!context || !context.roles.includes("CONSULTANCY_ADMIN")) {
    throw new Error("Apenas administradores podem editar formulários.");
  }

  const connection = await getDbConnection();
  try {
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (input.title !== undefined) {
      const title = String(input.title).trim().slice(0, 200);
      if (!title) throw new Error("O título não pode ser vazio.");
      updates.push("title = ?");
      values.push(title);
    }
    if (input.description !== undefined) {
      updates.push("description = ?");
      values.push(input.description ? String(input.description).trim().slice(0, 2000) : null);
    }
    if (input.fields !== undefined) {
      const validatedFields = validateFields(input.fields);
      updates.push("fields_json = ?");
      values.push(JSON.stringify(validatedFields));
    }
    if (input.isActive !== undefined) {
      updates.push("is_active = ?");
      values.push(input.isActive ? 1 : 0);
    }
    if (input.isOnboardingRequired !== undefined) {
      updates.push("is_onboarding_required = ?");
      values.push(input.isOnboardingRequired ? 1 : 0);
    }

    if (updates.length === 0) return true;

    values.push(templatePublicId, context.consultancyId);

    const [res] = await connection.execute<ResultSetHeader>(
      `UPDATE consultancy_custom_form_templates
       SET ${updates.join(", ")}, updated_at = NOW(3)
       WHERE public_id = ? AND consultancy_id = ? AND deleted_at IS NULL;`,
      values
    );

    return res.affectedRows > 0;
  } finally {
    connection.release();
  }
}

/**
 * Requests a form from a student.
 * CONSULTANCY_ADMIN can request from any student in the consultancy.
 * PERSONAL / NUTRITIONIST can request from assigned students.
 */
export async function requestFormForStudent(
  userId: number,
  consultancySlug: string,
  templatePublicId: string,
  studentMembershipPublicId: string
): Promise<CustomFormRequestDto> {
  const context = await resolveConsultancyContext(userId, consultancySlug);
  if (!context) {
    throw new Error("Acesso negado à consultoria.");
  }

  const isAdmin = context.roles.includes("CONSULTANCY_ADMIN");
  const isProfessional = context.roles.includes("PERSONAL") || context.roles.includes("NUTRITIONIST");

  if (!isAdmin && !isProfessional) {
    throw new Error("Você não possui permissão para solicitar formulários.");
  }

  const connection = await getDbConnection();
  try {
    // 1. Verify template belongs to tenant and is active
    const [templates] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, title, description, fields_json
       FROM consultancy_custom_form_templates
       WHERE public_id = ? AND consultancy_id = ? AND is_active = 1 AND deleted_at IS NULL
       LIMIT 1;`,
      [templatePublicId, context.consultancyId]
    );

    if (templates.length === 0) {
      throw new Error("Formulário não encontrado ou inativo nesta consultoria.");
    }
    const template = templates[0];

    // 2. Verify target student belongs to tenant and has STUDENT role
    const [students] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id, cm.public_id, cm.user_id, u.name, u.email
       FROM consultancy_members cm
       JOIN users u ON u.id = cm.user_id
       JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.public_id = ? AND cm.consultancy_id = ? AND cm.status = 'ACTIVE'
         AND cmr.role IN ('STUDENT', 'INFLUENCER')
       LIMIT 1;`,
      [studentMembershipPublicId, context.consultancyId]
    );

    if (students.length === 0) {
      throw new Error("Aluno não encontrado ou inativo nesta consultoria.");
    }
    const student = students[0];

    // 3. If professional (not admin), verify active assignment / relationship exists
    if (!isAdmin) {
      const [assignments] = await connection.execute<RowDataPacket[]>(
        `SELECT 1 FROM (
          SELECT 1 FROM workout_assignments
          WHERE consultancy_id = ? AND student_membership_id = ? AND assigned_by_user_id = ? AND status = 'ACTIVE'
          UNION
          SELECT 1 FROM nutrition_v2_assignments
          WHERE consultancy_id = ? AND student_membership_id = ? AND assigned_by_user_id = ? AND status = 'ACTIVE'
        ) rel LIMIT 1;`,
        [
          context.consultancyId, student.id, userId,
          context.consultancyId, student.id, userId,
        ]
      );

      if (assignments.length === 0) {
        throw new Error("Você só pode solicitar formulários para alunos com prescrições ativas sob sua responsabilidade.");
      }
    }

    // 4. Create request row
    const requestPublicId = crypto.randomUUID();
    await connection.beginTransaction();

    await connection.execute<ResultSetHeader>(
      `INSERT INTO consultancy_custom_form_requests (
        public_id, consultancy_id, template_id, student_membership_id,
        student_user_id, requested_by_user_id, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', NOW(3), NOW(3));`,
      [
        requestPublicId,
        context.consultancyId,
        template.id,
        student.id,
        student.user_id,
        userId,
      ]
    );

    // 5. Create notification for the student
    let notifId: number | null = null;
    try {
      const notif = await createNotificationInTransaction(connection, {
        userId: Number(student.user_id),
        consultancyId: context.consultancyId,
        title: "Novo formulário solicitado",
        body: `A consultoria solicitou o preenchimento do formulário: "${template.title}".`,
        eventType: "CUSTOM_FORM_REQUESTED",
        priority: "NORMAL",
        deepLink: `/consultoria/${consultancySlug}/formularios/${requestPublicId}`,
        dedupeKey: `form_req:${requestPublicId}`,
      });
      notifId = notif.id;
    } catch {
      // Non-blocking notification creation
    }

    await connection.commit();

    if (notifId) {
      await deliverNotificationAfterCommit(notifId);
    }

    let fields: CustomFormFieldDefinition[] = [];
    try {
      fields = typeof template.fields_json === "string" ? JSON.parse(template.fields_json) : template.fields_json;
    } catch {
      fields = [];
    }

    return {
      publicId: requestPublicId,
      consultancyId: context.consultancyId,
      templatePublicId: String(template.public_id),
      templateTitle: String(template.title),
      templateDescription: template.description ? String(template.description) : null,
      fields,
      studentMembershipId: Number(student.id),
      studentPublicId: String(student.public_id),
      studentName: String(student.name),
      studentEmail: String(student.email),
      requestedByUserId: userId,
      requestedByName: null,
      status: "PENDING",
      responses: null,
      reviewerNotes: null,
      reviewedByUserId: null,
      reviewedByName: null,
      submittedAt: null,
      reviewedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Lists form requests.
 * - Students see their own requests.
 * - Admins see all requests in the consultancy.
 * - Professionals see requests they created or for students they mentor.
 */
export async function listFormRequests(
  userId: number,
  consultancySlug: string,
  options?: { status?: CustomFormRequestStatus; studentPublicId?: string }
): Promise<CustomFormRequestDto[]> {
  const context = await resolveConsultancyContext(userId, consultancySlug);
  if (!context) {
    throw new Error("Acesso negado à consultoria.");
  }

  const isStudent = context.roles.includes("STUDENT") || context.roles.includes("INFLUENCER");
  const isAdmin = context.roles.includes("CONSULTANCY_ADMIN");
  const connection = await getDbConnection();

  try {
    const conditions: string[] = ["r.consultancy_id = ?"];
    const params: (string | number | null)[] = [context.consultancyId];

    if (isStudent && !isAdmin) {
      conditions.push("r.student_user_id = ?");
      params.push(userId);
    } else if (options?.studentPublicId) {
      conditions.push("cm.public_id = ?");
      params.push(options.studentPublicId);
    }

    if (options?.status) {
      conditions.push("r.status = ?");
      params.push(options.status);
    }

    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        r.public_id, r.consultancy_id, r.status, r.responses_json,
        r.reviewer_notes, r.submitted_at, r.reviewed_at, r.created_at, r.updated_at,
        t.public_id AS template_public_id, t.title AS template_title,
        t.description AS template_description, t.fields_json,
        cm.id AS student_membership_id, cm.public_id AS student_public_id,
        u_student.full_name AS student_name, u_student.email AS student_email,
        r.requested_by_user_id, u_req.name AS requested_by_name,
        r.reviewed_by_user_id, u_rev.name AS reviewed_by_name
       FROM consultancy_custom_form_requests r
       JOIN consultancy_custom_form_templates t ON t.id = r.template_id
       JOIN consultancy_members cm ON cm.id = r.student_membership_id
       JOIN users u_student ON u_student.id = r.student_user_id
       JOIN users u_req ON u_req.id = r.requested_by_user_id
       LEFT JOIN users u_rev ON u_rev.id = r.reviewed_by_user_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY r.created_at DESC;`,
      params
    );

    return rows.map((r) => {
      let fields: CustomFormFieldDefinition[] = [];
      try {
        fields = typeof r.fields_json === "string" ? JSON.parse(r.fields_json) : r.fields_json;
      } catch {
        fields = [];
      }

      let responses: Record<string, unknown> | null = null;
      if (r.responses_json) {
        try {
          responses = typeof r.responses_json === "string" ? JSON.parse(r.responses_json) : r.responses_json;
        } catch {
          responses = null;
        }
      }

      return {
        publicId: String(r.public_id),
        consultancyId: Number(r.consultancy_id),
        templatePublicId: String(r.template_public_id),
        templateTitle: String(r.template_title),
        templateDescription: r.template_description ? String(r.template_description) : null,
        fields,
        studentMembershipId: Number(r.student_membership_id),
        studentPublicId: String(r.student_public_id),
        studentName: String(r.student_name),
        studentEmail: String(r.student_email),
        requestedByUserId: Number(r.requested_by_user_id),
        requestedByName: String(r.requested_by_name),
        status: r.status as CustomFormRequestStatus,
        responses,
        reviewerNotes: r.reviewer_notes ? String(r.reviewer_notes) : null,
        reviewedByUserId: r.reviewed_by_user_id ? Number(r.reviewed_by_user_id) : null,
        reviewedByName: r.reviewed_by_name ? String(r.reviewed_by_name) : null,
        submittedAt: r.submitted_at ? new Date(r.submitted_at).toISOString() : null,
        reviewedAt: r.reviewed_at ? new Date(r.reviewed_at).toISOString() : null,
        createdAt: new Date(r.created_at).toISOString(),
        updatedAt: new Date(r.updated_at).toISOString(),
      };
    });
  } finally {
    connection.release();
  }
}

/**
 * Retrieves a single form request with full template details.
 * Strictly verifies tenant and authorization.
 */
export async function getFormRequest(
  userId: number,
  consultancySlug: string,
  requestPublicId: string
): Promise<CustomFormRequestDto | null> {
  const list = await listFormRequests(userId, consultancySlug);
  return list.find((r) => r.publicId === requestPublicId) || null;
}

/**
 * Submits student responses for a pending or changes-requested form.
 * Status becomes 'SUBMITTED'.
 */
export async function submitFormResponses(
  userId: number,
  consultancySlug: string,
  requestPublicId: string,
  input: SubmitFormResponsesInput
): Promise<boolean> {
  const context = await resolveConsultancyContext(userId, consultancySlug);
  if (!context) {
    throw new Error("Acesso negado à consultoria.");
  }

  const connection = await getDbConnection();
  try {
    await connection.beginTransaction();

    const [requests] = await connection.execute<RowDataPacket[]>(
      `SELECT r.id, r.consultancy_id, r.status, r.student_user_id, r.requested_by_user_id, t.title AS template_title
       FROM consultancy_custom_form_requests r
       JOIN consultancy_custom_form_templates t ON t.id = r.template_id
       WHERE r.public_id = ? AND r.consultancy_id = ?
       LIMIT 1
       FOR UPDATE;`,
      [requestPublicId, context.consultancyId]
    );

    if (requests.length === 0) {
      await connection.rollback();
      throw new Error("Solicitação de formulário não encontrada.");
    }

    const req = requests[0];
    if (Number(req.student_user_id) !== userId) {
      await connection.rollback();
      throw new Error("Apenas o aluno destinatário pode responder a este formulário.");
    }

    if (req.status !== "PENDING" && req.status !== "CHANGES_REQUESTED") {
      await connection.rollback();
      throw new Error("Este formulário já foi enviado e está sob análise ou aprovado.");
    }

    await connection.execute<ResultSetHeader>(
      `UPDATE consultancy_custom_form_requests
       SET status = 'SUBMITTED', responses_json = ?, submitted_at = NOW(3), updated_at = NOW(3)
       WHERE id = ?;`,
      [JSON.stringify(input.responses || {}), req.id]
    );

    // Notify requester (Admin or Professional)
    let notifId: number | null = null;
    try {
      const notif = await createNotificationInTransaction(connection, {
        userId: Number(req.requested_by_user_id),
        consultancyId: context.consultancyId,
        title: "Formulário respondido pelo aluno",
        body: `O aluno enviou as respostas para o formulário: "${req.template_title}".`,
        eventType: "CUSTOM_FORM_SUBMITTED",
        priority: "NORMAL",
        deepLink: `/consultoria/${consultancySlug}/formularios/${requestPublicId}`,
        dedupeKey: `form_sub:${requestPublicId}`,
      });
      notifId = notif.id;
    } catch {
      // Non-blocking notification
    }

    await connection.commit();

    if (notifId) {
      await deliverNotificationAfterCommit(notifId);
    }

    return true;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Reviews a submitted form: APPROVE or REQUEST_CHANGES.
 */
export async function reviewFormRequest(
  userId: number,
  consultancySlug: string,
  requestPublicId: string,
  input: ReviewFormRequestInput
): Promise<boolean> {
  const context = await resolveConsultancyContext(userId, consultancySlug);
  if (!context) {
    throw new Error("Acesso negado à consultoria.");
  }

  const isAdmin = context.roles.includes("CONSULTANCY_ADMIN");
  const isProfessional = context.roles.includes("PERSONAL") || context.roles.includes("NUTRITIONIST");

  if (!isAdmin && !isProfessional) {
    throw new Error("Permissão insuficiente para avaliar formulários.");
  }

  const newStatus: CustomFormRequestStatus =
    input.decision === "APPROVE" ? "APPROVED" : "CHANGES_REQUESTED";

  const notes = input.notes ? String(input.notes).trim().slice(0, 2000) : null;

  const connection = await getDbConnection();
  try {
    await connection.beginTransaction();

    const [requests] = await connection.execute<RowDataPacket[]>(
      `SELECT r.id, r.consultancy_id, r.status, r.student_user_id, t.title AS template_title
       FROM consultancy_custom_form_requests r
       JOIN consultancy_custom_form_templates t ON t.id = r.template_id
       WHERE r.public_id = ? AND r.consultancy_id = ?
       LIMIT 1
       FOR UPDATE;`,
      [requestPublicId, context.consultancyId]
    );

    if (requests.length === 0) {
      await connection.rollback();
      throw new Error("Solicitação de formulário não encontrada.");
    }

    const req = requests[0];
    if (req.status !== "SUBMITTED") {
      await connection.rollback();
      throw new Error("Apenas formulários com status SUBMITTED podem ser avaliados.");
    }

    await connection.execute<ResultSetHeader>(
      `UPDATE consultancy_custom_form_requests
       SET status = ?, reviewer_notes = ?, reviewed_by_user_id = ?, reviewed_at = NOW(3), updated_at = NOW(3)
       WHERE id = ?;`,
      [newStatus, notes, userId, req.id]
    );

    // Notify student about the decision
    let notifId: number | null = null;
    try {
      const title =
        newStatus === "APPROVED"
          ? "Formulário aprovado"
          : "Alterações solicitadas no formulário";
      const body =
        newStatus === "APPROVED"
          ? `Suas respostas para o formulário "${req.template_title}" foram aprovadas.`
          : `A consultoria solicitou ajustes no formulário "${req.template_title}".${notes ? ` Observação: ${notes}` : ""}`;

      const notif = await createNotificationInTransaction(connection, {
        userId: Number(req.student_user_id),
        consultancyId: context.consultancyId,
        title,
        body,
        eventType: `CUSTOM_FORM_${newStatus}`,
        priority: "NORMAL",
        deepLink: `/consultoria/${consultancySlug}/formularios/${requestPublicId}`,
        dedupeKey: `form_rev:${requestPublicId}:${newStatus}`,
      });
      notifId = notif.id;
    } catch {
      // Non-blocking notification
    }

    await connection.commit();

    if (notifId) {
      await deliverNotificationAfterCommit(notifId);
    }

    return true;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}
