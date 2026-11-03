import crypto from "node:crypto";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";
import { resolveConsultancyContext } from "./context";
import { recordConsultancyActivity } from "./activity-log";
import { ensureConsultancyFormsSchema } from "./forms-schema-assurance";
export { ensureConsultancyFormsSchema };
import { createNotificationInTransaction } from "@/services/notification-service";
import { buildWhatsAppUrl } from "@/lib/referrals/url-utils";

export type FormQuestionType =
  | "SHORT_TEXT"
  | "LONG_TEXT"
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "SCALE"
  | "DATE"
  | "FILE_UPLOAD";

export interface FormQuestionOption {
  id: string;
  label: string;
}

export interface FormQuestionDefinition {
  id: string;
  type: FormQuestionType;
  title: string;
  description?: string;
  required: boolean;
  options?: FormQuestionOption[];
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  placeholder?: string;
  acceptedFileTypes?: string[];
  maxFileSizeMb?: number;
}

export type ConsultancyFormStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type ConsultancyFormAssignmentStatus = "PENDING" | "SUBMITTED" | "REVIEWED";

export interface ConsultancyFormDto {
  id: number;
  publicId: string;
  consultancyId: number;
  title: string;
  description: string | null;
  questions: FormQuestionDefinition[];
  status: ConsultancyFormStatus;
  isRecurring: boolean;
  recurrenceRule: string | null;
  createdByUserId: number;
  createdAt: string;
  updatedAt: string;
  assignmentsCount?: number;
  responsesCount?: number;
}

export interface ConsultancyFormAssignmentDto {
  id: number;
  publicId: string;
  consultancyId: number;
  formId: number;
  formPublicId: string;
  formTitle: string;
  formDescription: string | null;
  questions: FormQuestionDefinition[];
  studentMembershipId: number;
  studentMembershipPublicId: string;
  studentUserId: number;
  studentName: string;
  studentEmail: string;
  studentPhone?: string | null;
  assignedByUserId: number;
  assignedByName?: string | null;
  status: ConsultancyFormAssignmentStatus;
  dueDate: string | null;
  responses: Record<string, unknown> | null;
  reviewerNotes: string | null;
  reviewedByUserId: number | null;
  reviewedByName?: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConsultancyFormInput {
  title: string;
  description?: string | null;
  questions: FormQuestionDefinition[];
  isRecurring?: boolean;
  recurrenceRule?: string | null;
}

export interface UpdateConsultancyFormInput {
  title?: string;
  description?: string | null;
  questions?: FormQuestionDefinition[];
  status?: ConsultancyFormStatus;
  isRecurring?: boolean;
  recurrenceRule?: string | null;
}

export interface AssignFormInput {
  formPublicId: string;
  studentMembershipPublicIds?: string[];
  assignToAllActiveStudents?: boolean;
  dueDate?: string | null;
}

export interface ReviewFormAssignmentInput {
  decision: "APPROVE" | "REQUEST_CHANGES";
  reviewerNotes?: string | null;
}

/**
 * Defensively validates question definitions.
 */
export function validateFormQuestions(rawQuestions: unknown): FormQuestionDefinition[] {
  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
    throw new Error("O formulário precisa conter ao menos uma pergunta.");
  }

  const validTypes: FormQuestionType[] = [
    "SHORT_TEXT",
    "LONG_TEXT",
    "SINGLE_CHOICE",
    "MULTIPLE_CHOICE",
    "SCALE",
    "DATE",
    "FILE_UPLOAD",
  ];

  return rawQuestions.map((q, idx) => {
    if (!q || typeof q !== "object") {
      throw new Error(`Pergunta na posição ${idx + 1} inválida.`);
    }

    const type = (q as { type?: unknown }).type as FormQuestionType;
    if (!validTypes.includes(type)) {
      throw new Error(`Tipo de pergunta '${type}' não suportado.`);
    }

    const title = String((q as { title?: unknown }).title || "").trim().slice(0, 200);
    if (!title) {
      throw new Error(`A pergunta ${idx + 1} precisa ter um título/enunciado.`);
    }

    const id = String((q as { id?: unknown }).id || `q_${Date.now()}_${idx + 1}`)
      .trim()
      .slice(0, 64);
    const required = Boolean((q as { required?: unknown }).required);

    const question: FormQuestionDefinition = {
      id,
      type,
      title,
      required,
    };

    const desc = (q as { description?: unknown }).description;
    if (desc && typeof desc === "string") {
      question.description = desc.trim().slice(0, 500);
    }

    const placeholder = (q as { placeholder?: unknown }).placeholder;
    if (placeholder && typeof placeholder === "string") {
      question.placeholder = placeholder.trim().slice(0, 100);
    }

    if (type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE") {
      const rawOptions = (q as { options?: unknown }).options;
      if (Array.isArray(rawOptions) && rawOptions.length > 0) {
        question.options = rawOptions.map((opt, oIdx) => {
          if (typeof opt === "string") {
            return { id: `opt_${oIdx + 1}`, label: opt.trim().slice(0, 150) };
          }
          const o = opt as { id?: unknown; label?: unknown };
          return {
            id: String(o.id || `opt_${oIdx + 1}`).trim().slice(0, 64),
            label: String(o.label || "").trim().slice(0, 150),
          };
        }).filter((opt) => Boolean(opt.label));
      } else {
        question.options = [
          { id: "opt_1", label: "Opção 1" },
          { id: "opt_2", label: "Opção 2" },
        ];
      }
    }

    if (type === "SCALE") {
      const sMin = Number((q as { scaleMin?: unknown }).scaleMin);
      const sMax = Number((q as { scaleMax?: unknown }).scaleMax);
      question.scaleMin = !isNaN(sMin) ? sMin : 0;
      question.scaleMax = !isNaN(sMax) ? sMax : 10;
      const sMinLbl = (q as { scaleMinLabel?: unknown }).scaleMinLabel;
      if (sMinLbl && typeof sMinLbl === "string") question.scaleMinLabel = sMinLbl.trim().slice(0, 50);
      const sMaxLbl = (q as { scaleMaxLabel?: unknown }).scaleMaxLabel;
      if (sMaxLbl && typeof sMaxLbl === "string") question.scaleMaxLabel = sMaxLbl.trim().slice(0, 50);
    }

    if (type === "FILE_UPLOAD") {
      const maxMb = Number((q as { maxFileSizeMb?: unknown }).maxFileSizeMb);
      question.maxFileSizeMb = !isNaN(maxMb) && maxMb > 0 ? maxMb : 5;
      const types = (q as { acceptedFileTypes?: unknown }).acceptedFileTypes;
      if (Array.isArray(types)) {
        question.acceptedFileTypes = types.map((t) => String(t).trim()).filter(Boolean);
      } else {
        question.acceptedFileTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
      }
    }

    return question;
  });
}

/**
 * Creates a new form model (consultancy_forms).
 */
export async function createConsultancyForm(
  consultancySlug: string,
  userId: number,
  input: CreateConsultancyFormInput
): Promise<ConsultancyFormDto> {
  await ensureConsultancyFormsSchema();
  const context = await resolveConsultancyContext(userId, consultancySlug);
  const isAllowed =
    Boolean(context) &&
    (context!.roles.includes("CONSULTANCY_ADMIN") ||
      context!.roles.includes("PERSONAL") ||
      context!.roles.includes("NUTRITIONIST"));

  if (!context || !isAllowed) {
    throw new Error("Permissão insuficiente para criar formulários.");
  }

  const title = String(input.title || "").trim().slice(0, 200);
  if (!title) {
    throw new Error("O título do formulário é obrigatório.");
  }

  const validatedQuestions = validateFormQuestions(input.questions);
  const description = input.description ? String(input.description).trim().slice(0, 2000) : null;
  const isRecurring = Boolean(input.isRecurring);
  const recurrenceRule = isRecurring && input.recurrenceRule ? input.recurrenceRule.trim().slice(0, 50) : null;
  const publicId = crypto.randomUUID();

  const connection = await getDbConnection();
  try {
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO consultancy_forms (
        public_id, consultancy_id, title, description, questions_json,
        status, is_recurring, recurrence_rule, created_by_user_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'DRAFT', ?, ?, ?, NOW(3), NOW(3));`,
      [
        publicId,
        context.consultancyId,
        title,
        description ?? null,
        JSON.stringify(validatedQuestions),
        isRecurring ? 1 : 0,
        recurrenceRule ?? null,
        userId,
      ]
    );

    await recordConsultancyActivity({
      consultancyId: context.consultancyId,
      actorUserId: userId,
      actorMembershipId: context.membershipId,
      actorRole: context.roles[0],
      action: "CREATE_FORM_TEMPLATE",
      module: "ADMIN",
      resourceType: "consultancy_forms",
      summary: `Modelo de formulário "${title}" foi criado.`,
      metadata: { formPublicId: publicId, questionsCount: validatedQuestions.length },
    });

    return {
      id: Number(result.insertId),
      publicId,
      consultancyId: context.consultancyId,
      title,
      description,
      questions: validatedQuestions,
      status: "DRAFT",
      isRecurring,
      recurrenceRule,
      createdByUserId: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignmentsCount: 0,
      responsesCount: 0,
    };
  } finally {
    connection.release();
  }
}

/**
 * Updates a form model.
 */
export async function updateConsultancyForm(
  consultancySlug: string,
  userId: number,
  formPublicId: string,
  input: UpdateConsultancyFormInput
): Promise<boolean> {
  await ensureConsultancyFormsSchema();
  const context = await resolveConsultancyContext(userId, consultancySlug);
  const isAllowed =
    Boolean(context) &&
    (context!.roles.includes("CONSULTANCY_ADMIN") ||
      context!.roles.includes("PERSONAL") ||
      context!.roles.includes("NUTRITIONIST"));

  if (!context || !isAllowed) {
    throw new Error("Permissão insuficiente para editar formulários.");
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

    if (input.questions !== undefined) {
      const validated = validateFormQuestions(input.questions);
      updates.push("questions_json = ?");
      values.push(JSON.stringify(validated));
    }

    if (input.status !== undefined) {
      updates.push("status = ?");
      values.push(input.status);
    }

    if (input.isRecurring !== undefined) {
      updates.push("is_recurring = ?");
      values.push(input.isRecurring ? 1 : 0);
    }

    if (input.recurrenceRule !== undefined) {
      updates.push("recurrence_rule = ?");
      values.push(input.recurrenceRule ? input.recurrenceRule.trim().slice(0, 50) : null);
    }

    if (updates.length === 0) return true;

    values.push(formPublicId, context.consultancyId);

    const [res] = await connection.execute<ResultSetHeader>(
      `UPDATE consultancy_forms
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
 * Publishes a form making it available for assignment.
 */
export async function publishConsultancyForm(
  consultancySlug: string,
  userId: number,
  formPublicId: string
): Promise<boolean> {
  return updateConsultancyForm(consultancySlug, userId, formPublicId, { status: "PUBLISHED" });
}

/**
 * Archives a form model.
 */
export async function archiveConsultancyForm(
  consultancySlug: string,
  userId: number,
  formPublicId: string
): Promise<boolean> {
  return updateConsultancyForm(consultancySlug, userId, formPublicId, { status: "ARCHIVED" });
}

/**
 * Lists all form models for the consultancy (Admin view).
 */
export async function listConsultancyForms(
  consultancySlug: string,
  userId: number
): Promise<ConsultancyFormDto[]> {
  await ensureConsultancyFormsSchema();
  const context = await resolveConsultancyContext(userId, consultancySlug);
  if (!context) {
    throw new Error("Acesso negado à consultoria.");
  }

  const connection = await getDbConnection();
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
         cf.id,
         cf.public_id,
         cf.consultancy_id,
         cf.title,
         cf.description,
         cf.questions_json,
         cf.status,
         cf.is_recurring,
         cf.recurrence_rule,
         cf.created_by_user_id,
         cf.created_at,
         cf.updated_at,
         (SELECT COUNT(*) FROM consultancy_form_assignments cfa WHERE cfa.form_id = cf.id) AS assignments_count,
         (SELECT COUNT(*) FROM consultancy_form_assignments cfa WHERE cfa.form_id = cf.id AND cfa.status IN ('SUBMITTED', 'REVIEWED')) AS responses_count
       FROM consultancy_forms cf
       WHERE cf.consultancy_id = ? AND cf.deleted_at IS NULL
       ORDER BY (cf.status = 'PUBLISHED') DESC, cf.created_at DESC;`,
      [context.consultancyId]
    );

    return rows.map((r) => {
      let questions: FormQuestionDefinition[] = [];
      try {
        questions = typeof r.questions_json === "string" ? JSON.parse(r.questions_json) : r.questions_json;
      } catch {
        questions = [];
      }

      return {
        id: Number(r.id),
        publicId: String(r.public_id),
        consultancyId: Number(r.consultancy_id),
        title: String(r.title),
        description: r.description ? String(r.description) : null,
        questions,
        status: r.status as ConsultancyFormStatus,
        isRecurring: Boolean(r.is_recurring),
        recurrenceRule: r.recurrence_rule ? String(r.recurrence_rule) : null,
        createdByUserId: Number(r.created_by_user_id),
        createdAt: new Date(r.created_at).toISOString(),
        updatedAt: new Date(r.updated_at).toISOString(),
        assignmentsCount: Number(r.assignments_count || 0),
        responsesCount: Number(r.responses_count || 0),
      };
    });
  } finally {
    connection.release();
  }
}

export interface ActiveStudentOption {
  membershipId: number;
  membershipPublicId: string;
  userId: number;
  name: string;
  email: string;
  phone?: string | null;
}

/**
 * Lists active students eligible to receive forms.
 */
export async function listActiveStudentsForForms(
  consultancySlug: string,
  userId: number
): Promise<ActiveStudentOption[]> {
  await ensureConsultancyFormsSchema();
  const context = await resolveConsultancyContext(userId, consultancySlug);
  if (!context) {
    throw new Error("Acesso negado à consultoria.");
  }

  const connection = await getDbConnection();
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id AS membership_id, cm.public_id AS membership_public_id, u.id AS user_id, u.full_name, u.email, up.phone
       FROM consultancy_members cm
       JOIN users u ON u.id = cm.user_id
       JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       LEFT JOIN user_profiles up ON up.user_id = u.id
       WHERE cm.consultancy_id = ? AND cm.status = 'ACTIVE'
         AND cmr.role IN ('STUDENT', 'INFLUENCER')
       GROUP BY cm.id, cm.public_id, u.id, u.full_name, u.email, up.phone
       ORDER BY u.full_name ASC;`,
      [context.consultancyId]
    );

    return rows.map((s) => ({
      membershipId: Number(s.membership_id),
      membershipPublicId: String(s.membership_public_id),
      userId: Number(s.user_id),
      name: String(s.full_name),
      email: String(s.email),
      phone: s.phone ? String(s.phone) : null,
    }));
  } finally {
    connection.release();
  }
}

/**
 * Assigns a form to one or multiple students.
 * Supports single assignment or bulk assignment to all active students.
 */
export async function assignFormToStudents(
  consultancySlug: string,
  userId: number,
  input: AssignFormInput
): Promise<{ success: boolean; assignedCount: number; whatsappLinks?: { name: string; url: string }[]; error?: string }> {
  await ensureConsultancyFormsSchema();
  const context = await resolveConsultancyContext(userId, consultancySlug);
  const isAllowed =
    Boolean(context) &&
    (context!.roles.includes("CONSULTANCY_ADMIN") ||
      context!.roles.includes("PERSONAL") ||
      context!.roles.includes("NUTRITIONIST"));

  if (!context || !isAllowed) {
    return { success: false, assignedCount: 0, error: "Permissão insuficiente para atribuir formulários." };
  }

  const connection = await getDbConnection();
  try {
    // 1. Fetch form
    const [formRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, title, status FROM consultancy_forms
       WHERE public_id = ? AND consultancy_id = ? AND deleted_at IS NULL LIMIT 1;`,
      [input.formPublicId, context.consultancyId]
    );

    if (formRows.length === 0) {
      return { success: false, assignedCount: 0, error: "Formulário não encontrado nesta consultoria." };
    }

    const form = formRows[0];
    if (form.status === "ARCHIVED") {
      return { success: false, assignedCount: 0, error: "Não é possível atribuir um formulário arquivado." };
    }

    // Auto-publish if draft
    if (form.status === "DRAFT") {
      await connection.execute(
        `UPDATE consultancy_forms SET status = 'PUBLISHED', updated_at = NOW(3) WHERE id = ?;`,
        [form.id]
      );
    }

    // 2. Resolve target students
    let targetStudents: Array<{ membershipId: number; membershipPublicId: string; userId: number; name: string; email: string; phone?: string | null }> = [];

    if (input.assignToAllActiveStudents) {
      const [allStudents] = await connection.execute<RowDataPacket[]>(
        `SELECT cm.id AS membership_id, cm.public_id AS membership_public_id, u.id AS user_id, u.full_name, u.email, up.phone
         FROM consultancy_members cm
         JOIN users u ON u.id = cm.user_id
         JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
         LEFT JOIN user_profiles up ON up.user_id = u.id
         WHERE cm.consultancy_id = ? AND cm.status = 'ACTIVE'
           AND cmr.role IN ('STUDENT', 'INFLUENCER')
         GROUP BY cm.id, cm.public_id, u.id, u.full_name, u.email, up.phone
         ORDER BY u.full_name ASC;`,
        [context.consultancyId]
      );

      targetStudents = allStudents.map((s) => ({
        membershipId: Number(s.membership_id),
        membershipPublicId: String(s.membership_public_id),
        userId: Number(s.user_id),
        name: String(s.full_name),
        email: String(s.email),
        phone: s.phone ? String(s.phone) : null,
      }));
    } else {
      if (!input.studentMembershipPublicIds || input.studentMembershipPublicIds.length === 0) {
        return { success: false, assignedCount: 0, error: "Selecione ao menos um aluno para receber o formulário." };
      }

      const placeholders = input.studentMembershipPublicIds.map(() => "?").join(",");
      const [selStudents] = await connection.execute<RowDataPacket[]>(
        `SELECT cm.id AS membership_id, cm.public_id AS membership_public_id, u.id AS user_id, u.full_name, u.email, up.phone
         FROM consultancy_members cm
         JOIN users u ON u.id = cm.user_id
         JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
         LEFT JOIN user_profiles up ON up.user_id = u.id
         WHERE cm.consultancy_id = ? AND cm.status = 'ACTIVE'
           AND cmr.role IN ('STUDENT', 'INFLUENCER')
           AND cm.public_id IN (${placeholders})
         GROUP BY cm.id, cm.public_id, u.id, u.full_name, u.email, up.phone;`,
        [context.consultancyId, ...input.studentMembershipPublicIds]
      );

      targetStudents = selStudents.map((s) => ({
        membershipId: Number(s.membership_id),
        membershipPublicId: String(s.membership_public_id),
        userId: Number(s.user_id),
        name: String(s.full_name),
        email: String(s.email),
        phone: s.phone ? String(s.phone) : null,
      }));
    }

    if (targetStudents.length === 0) {
      return { success: false, assignedCount: 0, error: "Nenhum aluno elegível encontrado." };
    }

    const dueDate = input.dueDate ? input.dueDate.trim().slice(0, 10) : null;
    const whatsappLinks: { name: string; url: string }[] = [];
    let assignedCount = 0;

    for (const student of targetStudents) {
      const assignmentPublicId = crypto.randomUUID();

      await connection.execute<ResultSetHeader>(
        `INSERT INTO consultancy_form_assignments (
          public_id, consultancy_id, form_id, student_membership_id,
          student_user_id, assigned_by_user_id, status, due_date,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, NOW(3), NOW(3));`,
        [
          assignmentPublicId,
          context.consultancyId,
          form.id,
          student.membershipId,
          student.userId,
          userId,
          dueDate ?? null,
        ]
      );

      assignedCount++;

      // In-app Notification
      try {
        await createNotificationInTransaction(connection, {
          userId: student.userId,
          consultancyId: context.consultancyId,
          title: "Novo formulário para preenchimento",
          body: `Você recebeu o formulário "${form.title}" para responder.`,
          eventType: "FORM_ASSIGNED",
          priority: "NORMAL",
          deepLink: `/consultoria/${consultancySlug}/formularios/${assignmentPublicId}`,
          dedupeKey: `form_assign_${assignmentPublicId}`,
        });
      } catch {
        // Non-blocking notification
      }

      // Generate WhatsApp Link
      if (student.phone) {
        const msg = `Olá, ${student.name}! Você tem um novo formulário ("${form.title}") para responder no Trevo One. Acesse pelo link: https://trevoone.com/consultoria/${consultancySlug}/formularios/${assignmentPublicId}`;
        const waUrl = buildWhatsAppUrl(student.phone, msg);
        if (waUrl) {
          whatsappLinks.push({ name: student.name, url: waUrl });
        }
      }
    }

    await recordConsultancyActivity({
      consultancyId: context.consultancyId,
      actorUserId: userId,
      actorMembershipId: context.membershipId,
      actorRole: context.roles[0],
      action: "ASSIGN_FORM",
      module: "ADMIN",
      resourceType: "consultancy_form_assignments",
      summary: `Formulário "${form.title}" foi atribuído a ${assignedCount} aluno(s).`,
      metadata: { formId: form.id, assignedCount, dueDate },
    });

    return { success: true, assignedCount, whatsappLinks };
  } finally {
    connection.release();
  }
}

/**
 * Lists assignments for admin review.
 */
export async function listAssignmentsForAdmin(
  consultancySlug: string,
  userId: number,
  filter?: { status?: string; formId?: number }
): Promise<ConsultancyFormAssignmentDto[]> {
  await ensureConsultancyFormsSchema();
  const context = await resolveConsultancyContext(userId, consultancySlug);
  if (!context) {
    throw new Error("Acesso negado à consultoria.");
  }

  const connection = await getDbConnection();
  try {
    const params: (number | string)[] = [context.consultancyId];
    let whereExtra = "";

    if (filter?.status && filter.status !== "ALL") {
      whereExtra += " AND cfa.status = ?";
      params.push(filter.status);
    }

    if (filter?.formId) {
      whereExtra += " AND cfa.form_id = ?";
      params.push(filter.formId);
    }

    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
         cfa.id,
         cfa.public_id,
         cfa.consultancy_id,
         cfa.form_id,
         cf.public_id AS form_public_id,
         cf.title AS form_title,
         cf.description AS form_description,
         cf.questions_json,
         cfa.student_membership_id,
         cm.public_id AS student_membership_public_id,
         cfa.student_user_id,
         u_stud.full_name AS student_name,
         u_stud.email AS student_email,
         up.phone AS student_phone,
         cfa.assigned_by_user_id,
         u_assign.full_name AS assigned_by_name,
         cfa.status,
         cfa.due_date,
         cfa.responses_json,
         cfa.reviewer_notes,
         cfa.reviewed_by_user_id,
         u_rev.full_name AS reviewed_by_name,
         cfa.submitted_at,
         cfa.reviewed_at,
         cfa.created_at,
         cfa.updated_at
       FROM consultancy_form_assignments cfa
       JOIN consultancy_forms cf ON cf.id = cfa.form_id
       JOIN consultancy_members cm ON cm.id = cfa.student_membership_id
       JOIN users u_stud ON u_stud.id = cfa.student_user_id
       LEFT JOIN user_profiles up ON up.user_id = u_stud.id
       JOIN users u_assign ON u_assign.id = cfa.assigned_by_user_id
       LEFT JOIN users u_rev ON u_rev.id = cfa.reviewed_by_user_id
       WHERE cfa.consultancy_id = ?
         ${whereExtra}
       ORDER BY (cfa.status = 'SUBMITTED') DESC, (cfa.status = 'PENDING') DESC, cfa.created_at DESC;`,
      params
    );

    return rows.map((r) => {
      let questions: FormQuestionDefinition[] = [];
      try {
        questions = typeof r.questions_json === "string" ? JSON.parse(r.questions_json) : r.questions_json;
      } catch {
        questions = [];
      }

      let responses: Record<string, unknown> | null = null;
      try {
        responses = typeof r.responses_json === "string" ? JSON.parse(r.responses_json) : r.responses_json;
      } catch {
        responses = null;
      }

      return {
        id: Number(r.id),
        publicId: String(r.public_id),
        consultancyId: Number(r.consultancy_id),
        formId: Number(r.form_id),
        formPublicId: String(r.form_public_id),
        formTitle: String(r.form_title),
        formDescription: r.form_description ? String(r.form_description) : null,
        questions,
        studentMembershipId: Number(r.student_membership_id),
        studentMembershipPublicId: String(r.student_membership_public_id),
        studentUserId: Number(r.student_user_id),
        studentName: String(r.student_name),
        studentEmail: String(r.student_email),
        studentPhone: r.student_phone ? String(r.student_phone) : null,
        assignedByUserId: Number(r.assigned_by_user_id),
        assignedByName: r.assigned_by_name ? String(r.assigned_by_name) : null,
        status: r.status as ConsultancyFormAssignmentStatus,
        dueDate: r.due_date ? new Date(r.due_date).toISOString().split("T")[0] : null,
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
 * Lists assignments for the student view in this consultancy.
 */
export async function listAssignmentsForStudent(
  consultancySlug: string,
  studentUserId: number
): Promise<ConsultancyFormAssignmentDto[]> {
  await ensureConsultancyFormsSchema();
  const context = await resolveConsultancyContext(studentUserId, consultancySlug);
  if (!context) {
    throw new Error("Acesso negado à consultoria.");
  }

  const connection = await getDbConnection();
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
         cfa.id,
         cfa.public_id,
         cfa.consultancy_id,
         cfa.form_id,
         cf.public_id AS form_public_id,
         cf.title AS form_title,
         cf.description AS form_description,
         cf.questions_json,
         cfa.student_membership_id,
         cm.public_id AS student_membership_public_id,
         cfa.student_user_id,
         u_stud.full_name AS student_name,
         u_stud.email AS student_email,
         cfa.assigned_by_user_id,
         u_assign.full_name AS assigned_by_name,
         cfa.status,
         cfa.due_date,
         cfa.responses_json,
         cfa.reviewer_notes,
         cfa.reviewed_by_user_id,
         cfa.submitted_at,
         cfa.reviewed_at,
         cfa.created_at,
         cfa.updated_at
       FROM consultancy_form_assignments cfa
       JOIN consultancy_forms cf ON cf.id = cfa.form_id
       JOIN consultancy_members cm ON cm.id = cfa.student_membership_id
       JOIN users u_stud ON u_stud.id = cfa.student_user_id
       JOIN users u_assign ON u_assign.id = cfa.assigned_by_user_id
       WHERE cfa.consultancy_id = ? AND cfa.student_user_id = ?
       ORDER BY (cfa.status = 'PENDING') DESC, (cfa.status = 'SUBMITTED') DESC, cfa.created_at DESC;`,
      [context.consultancyId, studentUserId]
    );

    return rows.map((r) => {
      let questions: FormQuestionDefinition[] = [];
      try {
        questions = typeof r.questions_json === "string" ? JSON.parse(r.questions_json) : r.questions_json;
      } catch {
        questions = [];
      }

      let responses: Record<string, unknown> | null = null;
      try {
        responses = typeof r.responses_json === "string" ? JSON.parse(r.responses_json) : r.responses_json;
      } catch {
        responses = null;
      }

      return {
        id: Number(r.id),
        publicId: String(r.public_id),
        consultancyId: Number(r.consultancy_id),
        formId: Number(r.form_id),
        formPublicId: String(r.form_public_id),
        formTitle: String(r.form_title),
        formDescription: r.form_description ? String(r.form_description) : null,
        questions,
        studentMembershipId: Number(r.student_membership_id),
        studentMembershipPublicId: String(r.student_membership_public_id),
        studentUserId: Number(r.student_user_id),
        studentName: String(r.student_name),
        studentEmail: String(r.student_email),
        assignedByUserId: Number(r.assigned_by_user_id),
        assignedByName: r.assigned_by_name ? String(r.assigned_by_name) : null,
        status: r.status as ConsultancyFormAssignmentStatus,
        dueDate: r.due_date ? new Date(r.due_date).toISOString().split("T")[0] : null,
        responses,
        reviewerNotes: r.reviewer_notes ? String(r.reviewer_notes) : null,
        reviewedByUserId: r.reviewed_by_user_id ? Number(r.reviewed_by_user_id) : null,
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
 * Fetches a single assignment by publicId with tenancy validation.
 */
export async function getAssignmentByPublicId(
  consultancySlug: string,
  assignmentPublicId: string,
  userId: number
): Promise<ConsultancyFormAssignmentDto | null> {
  await ensureConsultancyFormsSchema();
  const context = await resolveConsultancyContext(userId, consultancySlug);
  if (!context) return null;

  const connection = await getDbConnection();
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
         cfa.id,
         cfa.public_id,
         cfa.consultancy_id,
         cfa.form_id,
         cf.public_id AS form_public_id,
         cf.title AS form_title,
         cf.description AS form_description,
         cf.questions_json,
         cfa.student_membership_id,
         cm.public_id AS student_membership_public_id,
         cfa.student_user_id,
         u_stud.full_name AS student_name,
         u_stud.email AS student_email,
         up.phone AS student_phone,
         cfa.assigned_by_user_id,
         u_assign.full_name AS assigned_by_name,
         cfa.status,
         cfa.due_date,
         cfa.responses_json,
         cfa.reviewer_notes,
         cfa.reviewed_by_user_id,
         u_rev.full_name AS reviewed_by_name,
         cfa.submitted_at,
         cfa.reviewed_at,
         cfa.created_at,
         cfa.updated_at
       FROM consultancy_form_assignments cfa
       JOIN consultancy_forms cf ON cf.id = cfa.form_id
       JOIN consultancy_members cm ON cm.id = cfa.student_membership_id
       JOIN users u_stud ON u_stud.id = cfa.student_user_id
       LEFT JOIN user_profiles up ON up.user_id = u_stud.id
       JOIN users u_assign ON u_assign.id = cfa.assigned_by_user_id
       LEFT JOIN users u_rev ON u_rev.id = cfa.reviewed_by_user_id
       WHERE cfa.public_id = ? AND cfa.consultancy_id = ? LIMIT 1;`,
      [assignmentPublicId, context.consultancyId]
    );

    if (rows.length === 0) return null;
    const r = rows[0];

    // Authorization: User must be consultancy staff OR the assigned student
    const isStaff =
      context.roles.includes("CONSULTANCY_ADMIN") ||
      context.roles.includes("PERSONAL") ||
      context.roles.includes("NUTRITIONIST");
    const isOwnerStudent = Number(r.student_user_id) === userId;

    if (!isStaff && !isOwnerStudent) {
      return null;
    }

    let questions: FormQuestionDefinition[] = [];
    try {
      questions = typeof r.questions_json === "string" ? JSON.parse(r.questions_json) : r.questions_json;
    } catch {
      questions = [];
    }

    let responses: Record<string, unknown> | null = null;
    try {
      responses = typeof r.responses_json === "string" ? JSON.parse(r.responses_json) : r.responses_json;
    } catch {
      responses = null;
    }

    return {
      id: Number(r.id),
      publicId: String(r.public_id),
      consultancyId: Number(r.consultancy_id),
      formId: Number(r.form_id),
      formPublicId: String(r.form_public_id),
      formTitle: String(r.form_title),
      formDescription: r.form_description ? String(r.form_description) : null,
      questions,
      studentMembershipId: Number(r.student_membership_id),
      studentMembershipPublicId: String(r.student_membership_public_id),
      studentUserId: Number(r.student_user_id),
      studentName: String(r.student_name),
      studentEmail: String(r.student_email),
      studentPhone: r.student_phone ? String(r.student_phone) : null,
      assignedByUserId: Number(r.assigned_by_user_id),
      assignedByName: r.assigned_by_name ? String(r.assigned_by_name) : null,
      status: r.status as ConsultancyFormAssignmentStatus,
      dueDate: r.due_date ? new Date(r.due_date).toISOString().split("T")[0] : null,
      responses,
      reviewerNotes: r.reviewer_notes ? String(r.reviewer_notes) : null,
      reviewedByUserId: r.reviewed_by_user_id ? Number(r.reviewed_by_user_id) : null,
      reviewedByName: r.reviewed_by_name ? String(r.reviewed_by_name) : null,
      submittedAt: r.submitted_at ? new Date(r.submitted_at).toISOString() : null,
      reviewedAt: r.reviewed_at ? new Date(r.reviewed_at).toISOString() : null,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    };
  } finally {
    connection.release();
  }
}

/**
 * Submits form responses by the student.
 * Validates required questions defensively.
 */
export async function submitFormResponses(
  consultancySlug: string,
  studentUserId: number,
  assignmentPublicId: string,
  responses: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  await ensureConsultancyFormsSchema();
  const context = await resolveConsultancyContext(studentUserId, consultancySlug);
  if (!context) {
    return { success: false, error: "Acesso negado à consultoria." };
  }

  const connection = await getDbConnection();
  try {
    // 1. Fetch assignment and questions
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT cfa.id, cfa.consultancy_id, cfa.status, cfa.form_id, cfa.assigned_by_user_id,
              cf.title AS form_title, cf.questions_json, u.full_name AS student_name
       FROM consultancy_form_assignments cfa
       JOIN consultancy_forms cf ON cf.id = cfa.form_id
       JOIN users u ON u.id = cfa.student_user_id
       WHERE cfa.public_id = ? AND cfa.consultancy_id = ? AND cfa.student_user_id = ? LIMIT 1;`,
      [assignmentPublicId, context.consultancyId, studentUserId]
    );

    if (rows.length === 0) {
      return { success: false, error: "Atribuição de formulário não encontrada." };
    }

    const assignment = rows[0];

    // 2. Validate required questions
    let questions: FormQuestionDefinition[] = [];
    try {
      questions = typeof assignment.questions_json === "string" ? JSON.parse(assignment.questions_json) : assignment.questions_json;
    } catch {
      questions = [];
    }

    for (const q of questions) {
      if (q.required) {
        const val = responses[q.id];
        const isEmpty =
          val === undefined ||
          val === null ||
          (typeof val === "string" && !val.trim()) ||
          (Array.isArray(val) && val.length === 0);

        if (isEmpty) {
          return { success: false, error: `A pergunta obrigatória "${q.title}" não foi respondida.` };
        }
      }
    }

    // 3. Update assignment
    await connection.execute<ResultSetHeader>(
      `UPDATE consultancy_form_assignments
       SET status = 'SUBMITTED', responses_json = ?, submitted_at = NOW(3), updated_at = NOW(3)
       WHERE id = ?;`,
      [JSON.stringify(responses), assignment.id]
    );

    // 4. Notify admin / assigner
    try {
      await createNotificationInTransaction(connection, {
        userId: Number(assignment.assigned_by_user_id),
        consultancyId: context.consultancyId,
        title: "Novo formulário respondido",
        body: `${assignment.student_name} respondeu ao formulário "${assignment.form_title}".`,
        eventType: "FORM_SUBMITTED",
        priority: "NORMAL",
        deepLink: `/consultoria/${consultancySlug}/formularios?tab=sent&assignment=${assignmentPublicId}`,
        dedupeKey: `form_sub_${assignment.id}_${Date.now()}`,
      });
    } catch {
      // Non-blocking notification
    }

    return { success: true };
  } finally {
    connection.release();
  }
}

/**
 * Reviews a submitted form assignment (Approve or Request Changes).
 */
export async function reviewFormAssignment(
  consultancySlug: string,
  userId: number,
  assignmentPublicId: string,
  input: ReviewFormAssignmentInput
): Promise<{ success: boolean; error?: string }> {
  await ensureConsultancyFormsSchema();
  const context = await resolveConsultancyContext(userId, consultancySlug);
  const isAllowed =
    Boolean(context) &&
    (context!.roles.includes("CONSULTANCY_ADMIN") ||
      context!.roles.includes("PERSONAL") ||
      context!.roles.includes("NUTRITIONIST"));

  if (!context || !isAllowed) {
    return { success: false, error: "Permissão insuficiente para revisar formulários." };
  }

  const connection = await getDbConnection();
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT cfa.id, cfa.student_user_id, cf.title AS form_title
       FROM consultancy_form_assignments cfa
       JOIN consultancy_forms cf ON cf.id = cfa.form_id
       WHERE cfa.public_id = ? AND cfa.consultancy_id = ? LIMIT 1;`,
      [assignmentPublicId, context.consultancyId]
    );

    if (rows.length === 0) {
      return { success: false, error: "Atribuição não encontrada." };
    }

    const assignment = rows[0];
    const newStatus: ConsultancyFormAssignmentStatus =
      input.decision === "APPROVE" ? "REVIEWED" : "PENDING";
    const reviewerNotes = input.reviewerNotes ? input.reviewerNotes.trim().slice(0, 2000) : null;

    await connection.execute<ResultSetHeader>(
      `UPDATE consultancy_form_assignments
       SET status = ?, reviewer_notes = ?, reviewed_by_user_id = ?, reviewed_at = NOW(3), updated_at = NOW(3)
       WHERE id = ?;`,
      [newStatus, reviewerNotes ?? null, userId, assignment.id]
    );

    // Notify student about feedback
    try {
      const isApproved = input.decision === "APPROVE";
      await createNotificationInTransaction(connection, {
        userId: Number(assignment.student_user_id),
        consultancyId: context.consultancyId,
        title: isApproved ? "Formulário aprovado" : "Ajustes solicitados no formulário",
        body: isApproved
          ? `Seu formulário "${assignment.form_title}" foi revisado e aprovado pela consultoria.`
          : `A consultoria solicitou ajustes no formulário "${assignment.form_title}": ${reviewerNotes || "Verifique as observações."}`,
        eventType: "FORM_REVIEWED",
        priority: "NORMAL",
        deepLink: `/consultoria/${consultancySlug}/formularios/${assignmentPublicId}`,
        dedupeKey: `form_rev_${assignment.id}_${Date.now()}`,
      });
    } catch {
      // Non-blocking notification
    }

    return { success: true };
  } finally {
    connection.release();
  }
}
