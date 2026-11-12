import { getDbConnection } from "@/lib/db/mysql";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { COMPLETE_ANAMNESIS_FORM_V1, PHYSICAL_ASSESSMENT_FORM_V1 } from "./intake-schemas";
import { resolveWorkoutAssignmentTitle } from "../training-v2/title-resolver";
import { isMissingColumnError } from "../training-v2/schema-resilience";
import type {
  ConsultancyFormDto,
  ConsultancyFormAssignmentDto,
  FormQuestionDefinition,
  ConsultancyFormStatus,
} from "./forms";
import { ensureConsultancyFormsSchema } from "./forms-schema-assurance";

export function formatDateYmd(val: unknown): string {
  if (!val) return "";
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return "";
    const y = val.getUTCFullYear();
    const m = String(val.getUTCMonth() + 1).padStart(2, "0");
    const d = String(val.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getUTCFullYear();
    const m = String(parsed.getUTCMonth() + 1).padStart(2, "0");
    const d = String(parsed.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return str;
}

export function safeToIsoString(val: unknown, fallback?: string): string {
  if (!val) return fallback || new Date().toISOString();
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? (fallback || new Date().toISOString()) : val.toISOString();
  }
  const parsed = new Date(String(val));
  return isNaN(parsed.getTime()) ? (fallback || new Date().toISOString()) : parsed.toISOString();
}

export interface PersonalStudentSummary {
  membershipPublicId: string;
  userPublicId: string;
  name: string;
  email: string;
  joinedAt: string;
  objective: string | null;
  latestWorkoutTitle: string | null;
  latestWorkoutStatus: string | null;
  latestAssignmentStatus: "ACTIVE" | "ENDED" | null;
  latestAssignmentStartsOn: string | null;
  latestAssignmentEndsOn?: string | null;
  latestAssignmentPublicId?: string | null;
  latestWorkoutPublicId?: string | null;
  activeNutritionPlanTitle?: string | null;
  activeNutritionPlanPublicId?: string | null;
  activeNutritionVersionPublicId?: string | null;
  activeNutritionVersionNumber?: number | null;
  activeNutritionStartsOn?: string | null;
  hasActiveNutritionPlan?: boolean;
}

export interface PersonalStudentProfile {
  membershipPublicId: string;
  userPublicId: string;
  name: string;
  email: string;
  phone: string | null;
  joinedAt: string;
  status: string;
}

export interface PersonalStudentOverview {
  objective: string | null;
  nutritionGoal?: string | null;
  allergies?: string | null;
  intolerances?: string | null;
  dietaryRestrictions?: string | null;
  birthDate: string | null;
  age: string | null;
  sex: string | null;
  heightCm: number | null;
  weightKg: number | null;
  lastWeightRecordedOn: string | null;
  latestWorkoutTitle: string | null;
  latestWorkoutDifficulty: string | null;
  activeWorkoutsCount: number;
  completedWorkoutsCount: number;
  hasAnamnesis: boolean;
  hasPhotos: boolean;
  hasForms: boolean;
  latestNutritionTitle?: string | null;
  activeNutritionCount?: number;
  hasPendingPhotos?: boolean;
  hasPendingAnamnesis?: boolean;
  hasPendingAssessment?: boolean;
  coachName?: string | null;
  studentLevel?: "INICIANTE" | "INTERMEDIARIO" | "AVANCADO" | null;
  discProfile?: string | null;
  parqStatus?: "SEM_ALERTAS" | "COM_ALERTAS" | "NAO_PREENCHIDO";
  injuriesAndLimitations?: string | null;
  latestBodyFatPct?: number | null;
  latestMuscleMassKg?: number | null;
  completedLast30DaysCount?: number;
  last30DaysActivityDates?: string[];
  contractPlanTitle?: string | null;
  contractStartsOn?: string | null;
  contractEndsOn?: string | null;
  contractDaysRemaining?: number | null;
  contractPercentElapsed?: number | null;
  last30DaysSummary?: Array<{ dateStr: string; dayNumber: number; trained: boolean }>;
}

export interface PhotoEvaluationItem {
  requestPublicId: string;
  status: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt?: string | null;
  evaluationDate?: string | null;
  reviewerNotes: string | null;
  images: Array<{
    pose: string;
    imagePublicId: string;
    imageUrl: string;
  }>;
}

export interface AnamnesisSection {
  title: string;
  items: Array<{
    label: string;
    value: string;
  }>;
}

export interface StudentFormFieldItem {
  id: string;
  label: string;
  type: string;
  options?: string[];
  required?: boolean;
  placeholder?: string;
}

export interface StudentFormAnswer {
  id: string;
  publicId: string;
  templatePublicId?: string;
  title: string;
  description?: string | null;
  formType: "INTAKE" | "CUSTOM";
  status: string;
  rawStatus?: string;
  authorOrigin?: "STUDENT" | "PROFESSIONAL";
  submittedAt: string | null;
  requestedAt?: string | null;
  reviewedAt?: string | null;
  dueDate?: string | null;
  reviewerNotes?: string | null;
  questions: Array<{
    id?: string;
    question: string;
    answer: string;
    fieldType?: string;
  }>;
  fields?: StudentFormFieldItem[];
  assignmentDto?: ConsultancyFormAssignmentDto;
}

export interface FormTemplateSummary {
  publicId: string;
  title: string;
  description: string | null;
  isAnamnesis: boolean;
  fieldsCount: number;
  fields: StudentFormFieldItem[];
}

export interface StudentWorkoutItem {
  assignmentPublicId: string;
  workoutPublicId: string;
  versionPublicId: string;
  title: string;
  subtitle: string | null;
  objective: string | null;
  difficultyLevel: string;
  versionNumber: number;
  status: "ACTIVE" | "ENDED";
  startsOn: string;
  endsOn: string | null;
  notesForStudent: string | null;
  assignedAt: string;
}

export interface CompletedWorkoutSession {
  publicId: string;
  workoutTitle: string;
  startedAt: string;
  completedAt: string;
  completedSetsCount: number;
  studentCompletionState?: "ALL" | "PARTIAL" | "NONE" | null;
  studentFeedbackNotes?: string | null;
  substitutions?: Array<{
    originalExerciseName: string;
    performedExerciseName: string;
    reason: string;
  }>;
}

export interface PhysicalMeasurement {
  recordedOn: string;
  weightKg: number | null;
  waistCm: number | null;
  abdomenCm: number | null;
  hipCm: number | null;
  armCm: number | null;
  thighCm: number | null;
  bodyFatPct?: number | null;
  muscleMassKg?: number | null;
  note: string | null;
}

export interface StudentNutritionItem {
  assignmentPublicId: string;
  planPublicId: string;
  versionPublicId: string;
  title: string;
  versionNumber: number;
  status: "ACTIVE" | "ENDED";
  startsOn: string;
  endsOn: string | null;
  notesForStudent: string | null;
  assignedAt: string;
}

export interface StudentChargeHistoryItem {
  publicId: string;
  title: string;
  amountCents: number;
  dueOn: string;
  state: string;
  derivedStatus: "PENDING" | "OVERDUE" | "UNDER_REVIEW" | "PAID" | "CANCELED";
  paymentMethod?: string | null;
  checkoutUrl?: string | null;
  receiptUrl?: string | null;
  installments?: number | null;
  paidAt?: string | null;
  createdAt: string;
}

export interface StudentPlanSummaryItem {
  publicId: string;
  name: string;
  description: string | null;
  amountCents: number;
  durationMonths: number | null;
  durationDays: number | null;
  assuredInstallments: number;
  paymentMethods: string;
}

export interface StudentFinancialHubData {
  activeSubscription?: {
    planName: string;
    amountCents: number;
    startedAt: string;
    endsAt: string | null;
    status: string;
  } | null;
  charges: StudentChargeHistoryItem[];
  availablePlans: StudentPlanSummaryItem[];
}

export interface PersonalStudentDetail {
  student: PersonalStudentProfile;
  overview: PersonalStudentOverview;
  photos: PhotoEvaluationItem[];
  anamnesis: AnamnesisSection[];
  forms: StudentFormAnswer[];
  anamnesisList?: StudentFormAnswer[];
  formsList?: StudentFormAnswer[];
  availableTemplates?: FormTemplateSummary[];
  publishedForms?: ConsultancyFormDto[];
  workouts: StudentWorkoutItem[];
  completedSessions: CompletedWorkoutSession[];
  measurements: PhysicalMeasurement[];
  nutrition?: StudentNutritionItem[];
  financial?: StudentFinancialHubData;
  draftNutritionPlan?: {
    planPublicId: string;
    versionPublicId: string;
    versionNumber: number;
    title: string;
    updatedAt: string;
  } | null;
}

/**
 * Lists active students within a consultancy for the PERSONAL cockpit.
 * Returns clean summary data with zero N+1 overhead.
 */
export async function listPersonalStudents(params: {
  consultancyId: number;
  search?: string;
}): Promise<PersonalStudentSummary[]> {
  const { consultancyId, search } = params;
  let connection: PoolConnection | null = null;

  try {
    connection = await getDbConnection();

    try {
      // 1. Primary enriched query with latest assignment, workout and intake objective
      let sql = `
        SELECT
          cm.id AS membership_id,
          cm.public_id AS membership_public_id,
          u.public_id AS user_public_id,
          u.full_name,
          u.email,
          cm.created_at AS joined_at,
          COALESCE(NULLIF(TRIM(latest_wa.custom_title), ''), wv.title, w.title) AS latest_workout_title,
          COALESCE(w.status, wv.status) AS latest_workout_status,
          latest_wa.status AS latest_assignment_status,
          latest_wa.starts_on AS latest_assignment_starts_on,
          latest_wa.ends_on AS latest_assignment_ends_on,
          latest_wa.public_id AS latest_assignment_public_id,
          COALESCE(w.public_id, wv.public_id) AS latest_workout_public_id,
          curr_nutri.plan_title AS active_nutrition_plan_title,
          curr_nutri.plan_public_id AS active_nutrition_plan_public_id,
          curr_nutri.version_public_id AS active_nutrition_version_public_id,
          curr_nutri.version_number AS active_nutrition_version_number,
          curr_nutri.starts_on AS active_nutrition_starts_on,
          IF(curr_nutri.assignment_public_id IS NOT NULL, 1, 0) AS has_active_nutrition_plan,
          (
            SELECT JSON_UNQUOTE(JSON_EXTRACT(sis.responses_json, '$.main_goal'))
            FROM student_intake_submissions sis
            WHERE sis.consultancy_id = cm.consultancy_id
              AND sis.membership_id = cm.id
              AND sis.status = 'SUBMITTED'
            ORDER BY sis.submitted_at DESC, sis.id DESC
            LIMIT 1
          ) AS intake_objective
        FROM consultancy_members cm
        INNER JOIN users u ON u.id = cm.user_id
        INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id AND cmr.role = 'STUDENT'
        LEFT JOIN (
          SELECT
            wa.student_membership_id,
            wa.public_id,
            wa.workout_version_id,
            wa.custom_title,
            wa.status,
            wa.starts_on,
            wa.ends_on
          FROM (
            SELECT
              wa_inner.*,
              ROW_NUMBER() OVER (
                PARTITION BY wa_inner.student_membership_id
                ORDER BY
                  (wa_inner.status = 'ACTIVE' AND wa_inner.deleted_at IS NULL AND (wa_inner.ends_on IS NULL OR wa_inner.ends_on >= CURRENT_DATE())) DESC,
                  (wa_inner.status = 'ACTIVE' AND wa_inner.deleted_at IS NULL) DESC,
                  wa_inner.id DESC
              ) AS rn
            FROM workout_assignments wa_inner
            WHERE wa_inner.deleted_at IS NULL
              AND wa_inner.consultancy_id = ?
          ) wa
          WHERE wa.rn = 1
        ) latest_wa ON latest_wa.student_membership_id = cm.id
        LEFT JOIN workout_versions wv ON wv.id = latest_wa.workout_version_id
        LEFT JOIN workouts w ON w.id = wv.workout_id
        LEFT JOIN (
          SELECT
            a.student_membership_id,
            a.public_id AS assignment_public_id,
            p.public_id AS plan_public_id,
            v.title AS plan_title,
            v.version_number,
            v.public_id AS version_public_id,
            a.starts_on
          FROM nutrition_v2_assignments a
          INNER JOIN nutrition_v2_plan_versions v ON v.id = a.nutrition_plan_version_id
          INNER JOIN nutrition_v2_plans p ON p.id = v.nutrition_plan_id
          WHERE a.consultancy_id = ?
            AND a.status = 'ACTIVE'
            AND a.deleted_at IS NULL
        ) curr_nutri ON curr_nutri.student_membership_id = cm.id
        WHERE cm.consultancy_id = ?
          AND cm.status = 'ACTIVE'
          AND u.deleted_at IS NULL
      `;

      const queryParams: (string | number)[] = [consultancyId, consultancyId, consultancyId];

      if (search && search.trim()) {
        const q = `%${search.trim()}%`;
        sql += ` AND (u.full_name LIKE ? OR u.email LIKE ?)`;
        queryParams.push(q, q);
      }

      sql += ` ORDER BY u.full_name ASC;`;

      const [rows] = await connection.execute<RowDataPacket[]>(sql, queryParams);

      return (rows || []).map((r) => ({
        membershipPublicId: String(r.membership_public_id),
        userPublicId: String(r.user_public_id),
        name: String(r.full_name),
        email: String(r.email),
        joinedAt: r.joined_at ? new Date(r.joined_at).toISOString() : new Date().toISOString(),
        objective: r.intake_objective ? String(r.intake_objective) : null,
        latestWorkoutTitle: r.latest_workout_title ? String(r.latest_workout_title) : null,
        latestWorkoutStatus: r.latest_workout_status ? String(r.latest_workout_status) : null,
        latestAssignmentStatus: (r.latest_assignment_status as "ACTIVE" | "ENDED") || null,
        latestAssignmentStartsOn: r.latest_assignment_starts_on ? formatDateYmd(r.latest_assignment_starts_on) : null,
        latestAssignmentEndsOn: r.latest_assignment_ends_on ? formatDateYmd(r.latest_assignment_ends_on) : null,
        latestAssignmentPublicId: r.latest_assignment_public_id ? String(r.latest_assignment_public_id) : null,
        latestWorkoutPublicId: r.latest_workout_public_id ? String(r.latest_workout_public_id) : null,
        activeNutritionPlanTitle: r.active_nutrition_plan_title ? String(r.active_nutrition_plan_title) : null,
        activeNutritionPlanPublicId: r.active_nutrition_plan_public_id ? String(r.active_nutrition_plan_public_id) : null,
        activeNutritionVersionPublicId: r.active_nutrition_version_public_id ? String(r.active_nutrition_version_public_id) : null,
        activeNutritionVersionNumber: r.active_nutrition_version_number ? Number(r.active_nutrition_version_number) : null,
        activeNutritionStartsOn: r.active_nutrition_starts_on ? formatDateYmd(r.active_nutrition_starts_on) : null,
        hasActiveNutritionPlan: Boolean(r.has_active_nutrition_plan),
      }));
    } catch (enrichmentError) {
      console.error("[PersonalStudentHub] Enriched list query failed, falling back to core list:", enrichmentError);

      // 2. Fail-safe core student list (guarantees Alunos page never crashes on optional summary queries)
      let fallbackSql = `
        SELECT
          cm.id AS membership_id,
          cm.public_id AS membership_public_id,
          u.public_id AS user_public_id,
          u.full_name,
          u.email,
          cm.created_at AS joined_at
        FROM consultancy_members cm
        INNER JOIN users u ON u.id = cm.user_id
        INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id AND cmr.role = 'STUDENT'
        WHERE cm.consultancy_id = ?
          AND cm.status = 'ACTIVE'
          AND u.deleted_at IS NULL
      `;

      const fallbackParams: (string | number)[] = [consultancyId];

      if (search && search.trim()) {
        const q = `%${search.trim()}%`;
        fallbackSql += ` AND (u.full_name LIKE ? OR u.email LIKE ?)`;
        fallbackParams.push(q, q);
      }

      fallbackSql += ` ORDER BY u.full_name ASC;`;

      const [rows] = await connection.execute<RowDataPacket[]>(fallbackSql, fallbackParams);

      return (rows || []).map((r) => ({
        membershipPublicId: String(r.membership_public_id),
        userPublicId: String(r.user_public_id),
        name: String(r.full_name),
        email: String(r.email),
        joinedAt: r.joined_at ? new Date(r.joined_at).toISOString() : new Date().toISOString(),
        objective: null,
        latestWorkoutTitle: null,
        latestWorkoutStatus: null,
        latestAssignmentStatus: null,
        latestAssignmentStartsOn: null,
        latestAssignmentEndsOn: null,
        latestAssignmentPublicId: null,
        latestWorkoutPublicId: null,
        activeNutritionPlanTitle: null,
        activeNutritionPlanPublicId: null,
        activeNutritionVersionPublicId: null,
        activeNutritionVersionNumber: null,
        activeNutritionStartsOn: null,
        hasActiveNutritionPlan: false,
      }));
    }
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Loads comprehensive, authoritative student detail for Central do Aluno.
 * Strict multi-tenant verification: returns null if student not found in this consultancy.
 */
export async function getPersonalStudentDetail(params: {
  consultancyId: number;
  consultancySlug: string;
  studentMembershipPublicId: string;
}): Promise<PersonalStudentDetail | null> {
  const { consultancyId, consultancySlug, studentMembershipPublicId } = params;
  let connection: PoolConnection | null = null;
  let resolvedStudent: PersonalStudentProfile | null = null;

  try {
    connection = await getDbConnection();

    // 1. Authenticate student membership supporting both cm.public_id and u.public_id
    const [members] = await connection.execute<RowDataPacket[]>(
      `SELECT
        cm.id AS membership_id,
        cm.public_id AS membership_public_id,
        cm.status AS membership_status,
        cm.created_at AS joined_at,
        u.id AS user_id,
        u.public_id AS user_public_id,
        u.full_name,
        u.email,
        u.phone
       FROM consultancy_members cm
       INNER JOIN users u ON u.id = cm.user_id
       LEFT JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id AND cmr.role = 'STUDENT'
       WHERE cm.consultancy_id = ?
         AND (cm.public_id = ? OR u.public_id = ?)
         AND cm.status != 'DELETED'
         AND u.deleted_at IS NULL
       LIMIT 1;`,
      [consultancyId, studentMembershipPublicId, studentMembershipPublicId]
    );

    if (!Array.isArray(members) || members.length === 0) {
      return null;
    }

    const member = members[0];
    const membershipId = Number(member.membership_id);

    const student: PersonalStudentProfile = {
      membershipPublicId: String(member.membership_public_id),
      userPublicId: String(member.user_public_id),
      name: String(member.full_name || "Aluno"),
      email: String(member.email || ""),
      phone: member.phone ? String(member.phone) : null,
      joinedAt: safeToIsoString(member.joined_at),
      status: String(member.membership_status || "ACTIVE"),
    };
    resolvedStudent = student;

    // 2. Fetch Intake Submissions (Anamnesis & Questionnaires)
    let intakes: RowDataPacket[] = [];
    try {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT
          id,
          public_id,
          form_key,
          form_version,
          status,
          responses_json,
          submitted_at
         FROM student_intake_submissions
         WHERE consultancy_id = ?
           AND membership_id = ?
           AND status = 'SUBMITTED'
         ORDER BY submitted_at DESC, id DESC;`,
        [consultancyId, membershipId]
      );
      intakes = rows;
    } catch (err: unknown) {
      console.error("[Personal Student Hub] Error fetching intake submissions:", err instanceof Error ? err.message : err);
      intakes = [];
    }

    let mergedResponses: Record<string, unknown> = {};
    const forms: StudentFormAnswer[] = [];
    const formsList: StudentFormAnswer[] = [];
    const anamnesisList: StudentFormAnswer[] = [];

    const fieldLabelMap = new Map<string, string>();
    for (const f of COMPLETE_ANAMNESIS_FORM_V1.fields) {
      fieldLabelMap.set(f.key, f.label);
    }
    for (const f of PHYSICAL_ASSESSMENT_FORM_V1.fields) {
      if (!fieldLabelMap.has(f.key)) {
        fieldLabelMap.set(f.key, f.label);
      }
    }

    if (Array.isArray(intakes) && intakes.length > 0) {
      for (const row of intakes) {
        let parsed: Record<string, unknown> = {};
        try {
          const raw = typeof row.responses_json === "string"
            ? JSON.parse(row.responses_json)
            : (row.responses_json || {});
          if (raw && typeof raw === "object" && !Array.isArray(raw)) {
            parsed = raw;
          }
          mergedResponses = { ...parsed, ...mergedResponses };
        } catch {
          // Safe fallback for JSON parse error
        }

        const questions: Array<{ id?: string; question: string; answer: string }> = [];
        for (const [k, v] of Object.entries(parsed)) {
          if (v !== null && v !== undefined && v !== "") {
            const label = fieldLabelMap.get(k) || k.replace(/_/g, " ");
            questions.push({
              id: k,
              question: label,
              answer: String(v),
            });
          }
        }

        const isAnamnesis =
          String(row.form_key).toLowerCase().includes("anamnesis") ||
          String(row.form_key).toLowerCase().includes("anamnese");

        if (isAnamnesis) {
          anamnesisList.push({
            id: `intake-${row.id}`,
            publicId: String(row.public_id),
            title: "Anamnese & Histórico Clínico (Inicial)",
            formType: "INTAKE",
            status: "Respondido",
            rawStatus: "SUBMITTED",
            authorOrigin: "STUDENT",
            submittedAt: row.submitted_at ? safeToIsoString(row.submitted_at) : null,
            questions,
          });
        }
        if (!isAnamnesis) {
          const title = String(row.form_key).toLowerCase().includes("physical")
            ? "Questionário de Avaliação Física"
            : `Questionário / ${String(row.form_key).replace(/_/g, " ")}`;

          const intakeItem: StudentFormAnswer = {
            id: String(row.id),
            publicId: String(row.public_id),
            title,
            formType: "INTAKE",
            status: "Respondido",
            rawStatus: "SUBMITTED",
            authorOrigin: "STUDENT",
            submittedAt: row.submitted_at ? safeToIsoString(row.submitted_at) : null,
            questions,
          };
          forms.push(intakeItem);
          formsList.push(intakeItem);
        }
      }
    }

    // 3. Fetch Modern Form Assignments (consultancy_form_assignments & consultancy_forms)
    try {
      await ensureConsultancyFormsSchema();
    } catch {
      // safe fallback
    }

    let modernAssignments: RowDataPacket[] = [];
    try {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT
           cfa.id,
           cfa.public_id,
           cfa.form_id,
           cfa.status,
           cfa.due_date,
           cfa.responses_json,
           cfa.reviewer_notes,
           cfa.submitted_at,
           cfa.reviewed_at,
           cfa.created_at,
           cfa.updated_at,
           cf.public_id AS form_public_id,
           cf.title AS form_title,
           cf.description AS form_description,
           cf.questions_json,
           u_assign.full_name AS assigned_by_name,
           u_rev.full_name AS reviewed_by_name
         FROM consultancy_form_assignments cfa
         INNER JOIN consultancy_forms cf ON cf.id = cfa.form_id
         LEFT JOIN users u_assign ON u_assign.id = cfa.assigned_by_user_id
         LEFT JOIN users u_rev ON u_rev.id = cfa.reviewed_by_user_id
         WHERE cfa.consultancy_id = ?
           AND cfa.student_membership_id = ?
         ORDER BY (cfa.status = 'SUBMITTED') DESC, (cfa.status = 'PENDING') DESC, cfa.created_at DESC;`,
        [consultancyId, membershipId]
      );
      modernAssignments = rows;
    } catch (err: unknown) {
      console.warn("[Personal Student Hub] Warning querying consultancy_form_assignments:", err instanceof Error ? err.message : err);
      modernAssignments = [];
    }

    if (Array.isArray(modernAssignments) && modernAssignments.length > 0) {
      for (const row of modernAssignments) {
        let parsedQuestions: FormQuestionDefinition[] = [];
        let parsedResponses: Record<string, unknown> | null = null;
        try {
          parsedQuestions = typeof row.questions_json === "string" ? JSON.parse(row.questions_json) : (row.questions_json || []);
        } catch {
          parsedQuestions = [];
        }
        try {
          parsedResponses = typeof row.responses_json === "string" ? JSON.parse(row.responses_json) : row.responses_json;
        } catch {
          parsedResponses = null;
        }

        const questionsList: Array<{ id?: string; question: string; answer: string; fieldType?: string }> = [];
        for (const q of parsedQuestions) {
          const val = parsedResponses ? parsedResponses[q.id] : undefined;
          let answerText = "Não respondido";
          if (val !== undefined && val !== null && val !== "") {
            if (Array.isArray(val)) {
              answerText = val.join(", ");
            } else if (typeof val === "object") {
              const fileObj = val as { name?: string; url?: string };
              answerText = fileObj.name || JSON.stringify(val);
            } else {
              answerText = String(val);
            }
          }
          questionsList.push({
            id: q.id,
            question: q.title,
            answer: answerText,
            fieldType: q.type,
          });
        }

        let statusLabel = "Aguardando resposta";
        if (row.status === "SUBMITTED") {
          statusLabel = "Respondido";
        } else if (row.status === "REVIEWED") {
          statusLabel = "Revisado";
        }

        const authorOrigin: "STUDENT" | "PROFESSIONAL" =
          row.status === "REVIEWED" || row.reviewed_at
            ? "PROFESSIONAL"
            : "STUDENT";

        const titleLower = String(row.form_title).toLowerCase();
        const isCustomAnamnesis =
          titleLower.includes("anamnes") ||
          titleLower.includes("saúde") ||
          titleLower.includes("saude") ||
          titleLower.includes("histórico") ||
          titleLower.includes("historico");

        const assignmentDto: ConsultancyFormAssignmentDto = {
          id: Number(row.id),
          publicId: String(row.public_id),
          consultancyId,
          formId: Number(row.form_id),
          formPublicId: String(row.form_public_id),
          formTitle: String(row.form_title),
          formDescription: row.form_description ? String(row.form_description) : null,
          questions: parsedQuestions,
          studentMembershipId: membershipId,
          studentMembershipPublicId: student.membershipPublicId,
          studentUserId: 0,
          studentName: student.name,
          studentEmail: student.email,
          studentPhone: student.phone,
          assignedByUserId: 0,
          assignedByName: row.assigned_by_name ? String(row.assigned_by_name) : null,
          status: row.status as "PENDING" | "SUBMITTED" | "REVIEWED",
          dueDate: row.due_date ? String(row.due_date).slice(0, 10) : null,
          responses: parsedResponses,
          reviewerNotes: row.reviewer_notes ? String(row.reviewer_notes) : null,
          reviewedByUserId: null,
          reviewedByName: row.reviewed_by_name ? String(row.reviewed_by_name) : null,
          submittedAt: row.submitted_at ? safeToIsoString(row.submitted_at) : null,
          reviewedAt: row.reviewed_at ? safeToIsoString(row.reviewed_at) : null,
          createdAt: safeToIsoString(row.created_at),
          updatedAt: safeToIsoString(row.updated_at || row.created_at),
        };

        const formItem: StudentFormAnswer = {
          id: String(row.id),
          publicId: String(row.public_id),
          templatePublicId: String(row.form_public_id),
          title: String(row.form_title),
          description: row.form_description ? String(row.form_description) : null,
          formType: "CUSTOM",
          status: statusLabel,
          rawStatus: String(row.status),
          authorOrigin,
          submittedAt: row.submitted_at ? safeToIsoString(row.submitted_at) : null,
          requestedAt: row.created_at ? safeToIsoString(row.created_at) : null,
          reviewedAt: row.reviewed_at ? safeToIsoString(row.reviewed_at) : null,
          dueDate: row.due_date ? String(row.due_date).slice(0, 10) : null,
          reviewerNotes: row.reviewer_notes ? String(row.reviewer_notes) : null,
          questions: questionsList,
          fields: parsedQuestions.map((q) => ({
            id: q.id,
            label: q.title,
            type: q.type,
            required: q.required,
            options: q.options?.map((o) => o.label),
            placeholder: q.placeholder,
          })),
          assignmentDto,
        };

        forms.push(formItem);
        formsList.push(formItem);
        if (isCustomAnamnesis) {
          anamnesisList.push(formItem);
        }
      }
    }

    // 3.1. Fetch Legacy Custom Forms (consultancy_custom_form_requests) as fallback
    let customForms: RowDataPacket[] = [];
    try {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT
          r.id,
          r.public_id,
          r.status,
          r.responses_json,
          r.submitted_at,
          r.created_at,
          r.reviewed_at,
          t.public_id AS template_public_id,
          t.title AS template_title,
          t.description AS template_description,
          t.fields_json
         FROM consultancy_custom_form_requests r
         INNER JOIN consultancy_custom_form_templates t ON t.id = r.template_id
         WHERE r.consultancy_id = ?
           AND r.student_membership_id = ?
           AND r.status IN ('PENDING', 'SUBMITTED', 'REVIEWED', 'CHANGES_REQUESTED')
         ORDER BY COALESCE(r.submitted_at, r.created_at) DESC, r.id DESC;`,
        [consultancyId, membershipId]
      );
      customForms = rows;
    } catch {
      // Legacy table may not exist
      customForms = [];
    }

    if (Array.isArray(customForms) && customForms.length > 0) {
      for (const row of customForms) {
        if (forms.some((f) => f.publicId === String(row.public_id))) continue;

        let parsedAnswers: Record<string, unknown> = {};
        let parsedFields: StudentFormFieldItem[] = [];
        try {
          const rawAns = typeof row.responses_json === "string"
            ? JSON.parse(row.responses_json)
            : (row.responses_json || {});
          if (rawAns && typeof rawAns === "object" && !Array.isArray(rawAns)) {
            parsedAnswers = rawAns;
          }
          const rawFields = typeof row.fields_json === "string"
            ? JSON.parse(row.fields_json)
            : (row.fields_json || []);
          if (Array.isArray(rawFields)) {
            parsedFields = rawFields;
          }
        } catch {
          // ignore malformed
        }

        const customFieldLabelMap = new Map<string, string>();
        for (const f of parsedFields) {
          if (f.id && f.label) customFieldLabelMap.set(f.id, f.label);
        }

        const questions: Array<{ id?: string; question: string; answer: string; fieldType?: string }> = [];
        for (const f of parsedFields) {
          const val = parsedAnswers[f.id] ?? parsedAnswers[f.label];
          if (val !== null && val !== undefined && val !== "") {
            questions.push({
              id: f.id,
              question: f.label,
              answer: String(val),
              fieldType: f.type,
            });
          }
        }
        for (const [k, v] of Object.entries(parsedAnswers)) {
          if (k.startsWith("_")) continue;
          if (!questions.some((q) => q.id === k || q.question === k)) {
            if (v !== null && v !== undefined && v !== "") {
              const label = customFieldLabelMap.get(k) || k;
              questions.push({
                id: k,
                question: label,
                answer: String(v),
              });
            }
          }
        }

        const authorOrigin: "STUDENT" | "PROFESSIONAL" =
          parsedAnswers._filledBy === "PROFESSIONAL" || (row.reviewed_at && row.status === "REVIEWED")
            ? "PROFESSIONAL"
            : "STUDENT";

        let statusLabel = "Aguardando resposta";
        if (row.status === "SUBMITTED") {
          statusLabel = "Respondido";
        } else if (row.status === "REVIEWED") {
          statusLabel = authorOrigin === "PROFESSIONAL" ? "Preenchido pelo profissional" : "Revisado";
        } else if (row.status === "CHANGES_REQUESTED") {
          statusLabel = "Correção solicitada";
        }

        const isCustomAnamnesis =
          String(row.template_title).toLowerCase().includes("anamnes") ||
          String(row.template_title).toLowerCase().includes("saúde") ||
          String(row.template_title).toLowerCase().includes("saude") ||
          String(row.template_title).toLowerCase().includes("histórico") ||
          String(row.template_title).toLowerCase().includes("historico");

        const formItem: StudentFormAnswer = {
          id: String(row.id),
          publicId: String(row.public_id),
          templatePublicId: String(row.template_public_id),
          title: String(row.template_title || (isCustomAnamnesis ? "Anamnese" : "Formulário Personalizado")),
          description: row.template_description ? String(row.template_description) : null,
          formType: "CUSTOM",
          status: statusLabel,
          rawStatus: String(row.status),
          authorOrigin,
          submittedAt: row.submitted_at ? safeToIsoString(row.submitted_at) : null,
          requestedAt: row.created_at ? safeToIsoString(row.created_at) : null,
          reviewedAt: row.reviewed_at ? safeToIsoString(row.reviewed_at) : null,
          questions,
          fields: parsedFields,
        };

        forms.push(formItem);
        if (isCustomAnamnesis) {
          anamnesisList.push(formItem);
        } else {
          formsList.push(formItem);
        }
      }
    }

    // 3.4. Fetch Available Published and Draft Templates from consultancy_forms
    let publishedFormRows: RowDataPacket[] = [];
    try {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT id, public_id, title, description, questions_json, status, created_by_user_id, created_at, updated_at
         FROM consultancy_forms
         WHERE consultancy_id = ? AND status IN ('PUBLISHED', 'DRAFT') AND deleted_at IS NULL
         ORDER BY (status = 'PUBLISHED') DESC, created_at DESC;`,
        [consultancyId]
      );
      publishedFormRows = rows;
    } catch {
      publishedFormRows = [];
    }

    const availableTemplates: FormTemplateSummary[] = [];
    const publishedForms: ConsultancyFormDto[] = [];

    if (Array.isArray(publishedFormRows) && publishedFormRows.length > 0) {
      for (const t of publishedFormRows) {
        let questions: FormQuestionDefinition[] = [];
        try {
          questions = typeof t.questions_json === "string" ? JSON.parse(t.questions_json) : (t.questions_json || []);
        } catch {
          questions = [];
        }
        const titleLower = String(t.title).toLowerCase();
        const isAnamnesis =
          titleLower.includes("anamnes") ||
          titleLower.includes("saúde") ||
          titleLower.includes("saude") ||
          titleLower.includes("histórico") ||
          titleLower.includes("historico");

        availableTemplates.push({
          publicId: String(t.public_id),
          title: String(t.title),
          description: t.description ? String(t.description) : null,
          isAnamnesis,
          fieldsCount: questions.length,
          fields: questions.map((q) => ({
            id: q.id,
            label: q.title,
            type: q.type,
            required: q.required,
            options: q.options?.map((o) => o.label),
            placeholder: q.placeholder,
          })),
        });

        publishedForms.push({
          id: Number(t.id),
          publicId: String(t.public_id),
          consultancyId,
          title: String(t.title),
          description: t.description ? String(t.description) : null,
          questions,
          status: (t.status as ConsultancyFormStatus) || "PUBLISHED",
          isRecurring: false,
          recurrenceRule: null,
          createdByUserId: Number(t.created_by_user_id || 0),
          createdAt: safeToIsoString(t.created_at),
          updatedAt: safeToIsoString(t.updated_at || t.created_at),
        });
      }
    }

    // 3.5. Fallback templates from consultancy_custom_form_templates (if any)
    try {
      const [legacyTemplates] = await connection.execute<RowDataPacket[]>(
        `SELECT public_id, title, description, fields_json
         FROM consultancy_custom_form_templates
         WHERE consultancy_id = ? AND is_active = 1 AND deleted_at IS NULL
         ORDER BY created_at DESC;`,
        [consultancyId]
      );
      if (Array.isArray(legacyTemplates)) {
        for (const t of legacyTemplates) {
          if (availableTemplates.some((at) => at.publicId === String(t.public_id))) continue;
          let fields: StudentFormFieldItem[] = [];
          try {
            fields = typeof t.fields_json === "string" ? JSON.parse(t.fields_json) : (t.fields_json || []);
          } catch {
            fields = [];
          }
          const titleLower = String(t.title).toLowerCase();
          const isAnamnesis =
            titleLower.includes("anamnes") ||
            titleLower.includes("saúde") ||
            titleLower.includes("saude") ||
            titleLower.includes("histórico") ||
            titleLower.includes("historico");

          availableTemplates.push({
            publicId: String(t.public_id),
            title: String(t.title),
            description: t.description ? String(t.description) : null,
            isAnamnesis,
            fieldsCount: fields.length,
            fields,
          });
        }
      }
    } catch {
      // ignore
    }

    // 3.5. Detect submitted custom anamnesis forms to populate anamnesis sections and biometrics if not set by intake
    const customAnamnesisQuestions: Array<{ label: string; value: string }> = [];
    let customAnamnesisTitle = "Anamnese & Histórico de Saúde";

    if (Array.isArray(customForms) && customForms.length > 0) {
      for (const row of customForms) {
        const isCustomAnamnesis =
          String(row.template_title).toLowerCase().includes("anamnes") ||
          String(row.template_title).toLowerCase().includes("saúde") ||
          String(row.template_title).toLowerCase().includes("saude") ||
          String(row.template_title).toLowerCase().includes("histórico") ||
          String(row.template_title).toLowerCase().includes("historico");

        if (isCustomAnamnesis && (row.status === "SUBMITTED" || row.status === "REVIEWED" || row.status === "APPROVED")) {
          customAnamnesisTitle = String(row.template_title || "Anamnese & Histórico de Saúde");
          let parsedAnswers: Record<string, unknown> = {};
          let parsedFields: Array<{ id: string; label: string }> = [];
          try {
            const rawAns = typeof row.responses_json === "string"
              ? JSON.parse(row.responses_json)
              : (row.responses_json || {});
            if (rawAns && typeof rawAns === "object" && !Array.isArray(rawAns)) {
              parsedAnswers = rawAns;
            }
            const rawFields = typeof row.fields_json === "string"
              ? JSON.parse(row.fields_json)
              : (row.fields_json || []);
            if (Array.isArray(rawFields)) {
              parsedFields = rawFields;
            }
          } catch {
            // ignore malformed
          }

          const labelMap = new Map<string, string>();
          for (const f of parsedFields) {
            if (f.id && f.label) labelMap.set(f.id, f.label);
          }

          for (const [k, v] of Object.entries(parsedAnswers)) {
            if (v !== null && v !== undefined && v !== "") {
              const label = labelMap.get(k) || k;
              const valStr = String(v).trim();
              if (valStr) {
                customAnamnesisQuestions.push({ label, value: valStr });

                const lowerL = label.toLowerCase();
                if (!mergedResponses.main_goal && (lowerL.includes("objetivo") || lowerL.includes("meta"))) {
                  mergedResponses.main_goal = valStr;
                }
                if (!mergedResponses.weight && lowerL.includes("peso")) {
                  mergedResponses.weight = valStr;
                }
                if (!mergedResponses.height && lowerL.includes("altura")) {
                  mergedResponses.height = valStr;
                }
                if (!mergedResponses.birth_date && (lowerL.includes("nascimento") || lowerL.includes("data de nasc"))) {
                  mergedResponses.birth_date = valStr;
                }
                if (!mergedResponses.age && lowerL.includes("idade")) {
                  mergedResponses.age = valStr;
                }
                if (!mergedResponses.sex && (lowerL.includes("sexo") || lowerL.includes("gênero") || lowerL.includes("genero"))) {
                  mergedResponses.sex = valStr;
                }
              }
            }
          }
        }
      }
    }

    // 4. Fetch Physical Progress Entries (weight & measurements)
    let progressRows: RowDataPacket[] = [];
    try {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT
          recorded_on,
          weight_kg,
          waist_cm,
          abdomen_cm,
          hip_cm,
          arm_cm,
          thigh_cm,
          note
         FROM student_progress_entries
         WHERE consultancy_id = ?
           AND student_membership_id = ?
         ORDER BY recorded_on DESC, id DESC
         LIMIT 50;`,
        [consultancyId, membershipId]
      );
      progressRows = rows;
    } catch (err: unknown) {
      console.error("[Personal Student Hub] Error fetching progress entries:", err instanceof Error ? err.message : err);
      progressRows = [];
    }

    const measurements: PhysicalMeasurement[] = (progressRows || []).map((r) => ({
      recordedOn: formatDateYmd(r.recorded_on),
      weightKg: r.weight_kg != null ? Number(r.weight_kg) : null,
      waistCm: r.waist_cm != null ? Number(r.waist_cm) : null,
      abdomenCm: r.abdomen_cm != null ? Number(r.abdomen_cm) : null,
      hipCm: r.hip_cm != null ? Number(r.hip_cm) : null,
      armCm: r.arm_cm != null ? Number(r.arm_cm) : null,
      thighCm: r.thigh_cm != null ? Number(r.thigh_cm) : null,
      bodyFatPct: null,
      muscleMassKg: null,
      note: r.note ? String(r.note) : null,
    }));

    // 4.1. Also fetch Nutrition V2 patient anthropometrics (which includes body_fat_pct, muscle_mass_kg)
    try {
      const [anthroRows] = await connection.execute<RowDataPacket[]>(
        `SELECT
          pa.measurement_date,
          pa.weight_kg,
          pa.waist_cm,
          pa.abdomen_cm,
          pa.hip_cm,
          COALESCE(pa.contracted_arm_cm, pa.relaxed_arm_cm) AS arm_cm,
          pa.thigh_cm,
          pa.body_fat_pct,
          pa.muscle_mass_kg,
          pa.routine_notes AS note
         FROM nutrition_v2_patient_anthropometrics pa
         INNER JOIN nutrition_v2_patient_records pr ON pr.id = pa.patient_record_id
         WHERE pr.consultancy_id = ?
           AND pr.student_membership_id = ?
         ORDER BY pa.measurement_date DESC, pa.id DESC
         LIMIT 50;`,
        [consultancyId, membershipId]
      );

      if (Array.isArray(anthroRows) && anthroRows.length > 0) {
        for (const ar of anthroRows) {
          const recDate = formatDateYmd(ar.measurement_date);
          const existing = measurements.find((m) => m.recordedOn === recDate);
          if (existing) {
            if (existing.bodyFatPct == null && ar.body_fat_pct != null) {
              existing.bodyFatPct = Number(ar.body_fat_pct);
            }
            if (existing.muscleMassKg == null && ar.muscle_mass_kg != null) {
              existing.muscleMassKg = Number(ar.muscle_mass_kg);
            }
          } else {
            measurements.push({
              recordedOn: recDate,
              weightKg: ar.weight_kg != null ? Number(ar.weight_kg) : null,
              waistCm: ar.waist_cm != null ? Number(ar.waist_cm) : null,
              abdomenCm: ar.abdomen_cm != null ? Number(ar.abdomen_cm) : null,
              hipCm: ar.hip_cm != null ? Number(ar.hip_cm) : null,
              armCm: ar.arm_cm != null ? Number(ar.arm_cm) : null,
              thighCm: ar.thigh_cm != null ? Number(ar.thigh_cm) : null,
              bodyFatPct: ar.body_fat_pct != null ? Number(ar.body_fat_pct) : null,
              muscleMassKg: ar.muscle_mass_kg != null ? Number(ar.muscle_mass_kg) : null,
              note: ar.note ? String(ar.note) : null,
            });
          }
        }
        measurements.sort((a, b) => new Date(b.recordedOn).getTime() - new Date(a.recordedOn).getTime());
      }
    } catch {
      // Safe fallback if table not yet populated or column differences
    }

    // Resolve weight & height
    const latestProgressWeight = measurements.length > 0 && measurements[0].weightKg
      ? measurements[0].weightKg
      : null;
    const intakeRawWeight = mergedResponses.weight
      ? Number(String(mergedResponses.weight).replace(/[^0-9.]/g, ""))
      : null;
    const finalWeightKg = latestProgressWeight || (intakeRawWeight && !Number.isNaN(intakeRawWeight) ? intakeRawWeight : null);

    const intakeRawHeight = mergedResponses.height
      ? Number(String(mergedResponses.height).replace(/[^0-9.]/g, ""))
      : null;
    const finalHeightCm = intakeRawHeight && !Number.isNaN(intakeRawHeight) ? intakeRawHeight : null;

    // 5. Fetch Photo Evaluations
    let photoRows: RowDataPacket[] = [];
    try {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT
          r.id AS request_id,
          r.public_id AS request_public_id,
          r.status,
          r.reviewer_notes,
          r.submitted_at,
          r.reviewed_at,
          r.created_at,
          i.pose,
          i.public_id AS image_public_id
         FROM student_photo_evaluation_requests r
         LEFT JOIN student_photo_evaluation_images i ON i.request_id = r.id
         WHERE r.consultancy_id = ?
           AND r.student_membership_id = ?
         ORDER BY COALESCE(r.submitted_at, r.created_at) DESC, r.id DESC;`,
        [consultancyId, membershipId]
      );
      photoRows = rows;
    } catch (err: unknown) {
      console.error("[Personal Student Hub] Error fetching photo evaluations:", err instanceof Error ? err.message : err);
      photoRows = [];
    }

    const photosMap = new Map<string, PhotoEvaluationItem>();
    if (Array.isArray(photoRows)) {
      for (const r of photoRows) {
        const reqPubId = String(r.request_public_id);
        if (!photosMap.has(reqPubId)) {
          const evalDate = r.submitted_at
            ? safeToIsoString(r.submitted_at)
            : r.created_at
            ? safeToIsoString(r.created_at)
            : null;

          photosMap.set(reqPubId, {
            requestPublicId: reqPubId,
            status: String(r.status),
            submittedAt: r.submitted_at ? safeToIsoString(r.submitted_at) : null,
            reviewedAt: r.reviewed_at ? safeToIsoString(r.reviewed_at) : null,
            createdAt: r.created_at ? safeToIsoString(r.created_at) : null,
            evaluationDate: evalDate,
            reviewerNotes: r.reviewer_notes ? String(r.reviewer_notes) : null,
            images: [],
          });
        }
        if (r.pose && r.image_public_id) {
          photosMap.get(reqPubId)!.images.push({
            pose: String(r.pose),
            imagePublicId: String(r.image_public_id),
            imageUrl: `/api/consultancies/${consultancySlug}/photo-evaluations/${reqPubId}/images/${r.pose}`,
          });
        }
      }
    }
    const photos = Array.from(photosMap.values());

    // 6. Fetch Prescribed Workouts
    let workoutRows: RowDataPacket[] = [];
    try {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT
          wa.public_id AS assignment_public_id,
          wa.status AS assignment_status,
          wa.starts_on,
          wa.ends_on,
          wa.notes_for_student,
          wa.custom_title,
          wa.created_at AS assigned_at,
          w.public_id AS workout_public_id,
          COALESCE(wv.title, w.title) AS base_workout_title,
          COALESCE(NULLIF(TRIM(wa.custom_title), ''), wv.title, w.title) AS workout_title,
          COALESCE(wv.subtitle, w.subtitle) AS workout_subtitle,
          COALESCE(wv.objective, w.objective) AS workout_objective,
          COALESCE(wv.difficulty_level, w.difficulty_level) AS difficulty_level,
          wv.public_id AS version_public_id,
          wv.version_number,
          u_coach.full_name AS coach_name
         FROM workout_assignments wa
         INNER JOIN workout_versions wv ON wv.id = wa.workout_version_id
         INNER JOIN workouts w ON w.id = wv.workout_id
         LEFT JOIN consultancy_members cm_coach ON cm_coach.id = w.created_by_membership_id
         LEFT JOIN users u_coach ON u_coach.id = cm_coach.user_id
         WHERE wa.consultancy_id = ?
           AND wa.student_membership_id = ?
           AND wa.deleted_at IS NULL
         ORDER BY wa.status = 'ACTIVE' DESC, wa.created_at DESC;`,
        [consultancyId, membershipId]
      );
      workoutRows = rows;
    } catch (err: unknown) {
      if (isMissingColumnError(err, ["custom_title"])) {
        try {
          const [rows] = await connection.execute<RowDataPacket[]>(
            `SELECT
              wa.public_id AS assignment_public_id,
              wa.status AS assignment_status,
              wa.starts_on,
            wa.ends_on,
              wa.ends_on,
              wa.notes_for_student,
              NULL AS custom_title,
              wa.created_at AS assigned_at,
              w.public_id AS workout_public_id,
              COALESCE(wv.title, w.title) AS base_workout_title,
              COALESCE(wv.title, w.title) AS workout_title,
              COALESCE(wv.subtitle, w.subtitle) AS workout_subtitle,
              COALESCE(wv.objective, w.objective) AS workout_objective,
              COALESCE(wv.difficulty_level, w.difficulty_level) AS difficulty_level,
              wv.public_id AS version_public_id,
              wv.version_number
             FROM workout_assignments wa
             INNER JOIN workout_versions wv ON wv.id = wa.workout_version_id
             INNER JOIN workouts w ON w.id = wv.workout_id
             WHERE wa.consultancy_id = ?
               AND wa.student_membership_id = ?
               AND wa.deleted_at IS NULL
             ORDER BY wa.status = 'ACTIVE' DESC, wa.created_at DESC;`,
            [consultancyId, membershipId]
          );
          workoutRows = rows;
        } catch (innerErr: unknown) {
          console.error("[Personal Student Hub] Error in workout assignments fallback query:", innerErr instanceof Error ? innerErr.message : innerErr);
          workoutRows = [];
        }
      } else {
        console.error("[Personal Student Hub] Error fetching workout assignments:", err instanceof Error ? err.message : err);
        workoutRows = [];
      }
    }

    const workouts: StudentWorkoutItem[] = (workoutRows || []).map((r) => ({
      assignmentPublicId: String(r.assignment_public_id),
      workoutPublicId: String(r.workout_public_id),
      versionPublicId: String(r.version_public_id),
      title: resolveWorkoutAssignmentTitle({
        customTitle: r.custom_title,
        studentName: student.name,
        baseTitle: r.base_workout_title || r.workout_title,
      }),
      subtitle: r.workout_subtitle ? String(r.workout_subtitle) : null,
      objective: r.workout_objective ? String(r.workout_objective) : null,
      difficultyLevel: String(r.difficulty_level || "INTERMEDIATE"),
      versionNumber: Number(r.version_number || 1),
      status: r.assignment_status as "ACTIVE" | "ENDED",
      startsOn: formatDateYmd(r.starts_on),
      endsOn: r.ends_on ? formatDateYmd(r.ends_on) : null,
      notesForStudent: r.notes_for_student ? String(r.notes_for_student) : null,
      assignedAt: safeToIsoString(r.assigned_at),
    }));

    // 7. Fetch Completed Workout Sessions
    let completedRows: RowDataPacket[] = [];
    try {
      const [rows] = await connection.execute<RowDataPacket[]>(
        `SELECT
          wes.public_id,
          wes.started_at,
          wes.completed_at,
          wes.student_completion_state,
          wes.student_feedback_notes,
          wa.custom_title,
          COALESCE(wv.title, w.title) AS base_workout_title,
          COALESCE(NULLIF(TRIM(wa.custom_title), ''), wv.title, w.title) AS workout_title,
          (
            SELECT COUNT(*)
            FROM workout_execution_sets weset
            WHERE weset.execution_session_id = wes.id
              AND weset.completed_at IS NOT NULL
              AND (weset.is_skipped = 0 OR weset.is_skipped IS NULL)
          ) AS completed_sets_count
         FROM workout_execution_sessions wes
         INNER JOIN workout_assignments wa ON wa.id = wes.workout_assignment_id
         INNER JOIN workout_versions wv ON wv.id = wa.workout_version_id
         INNER JOIN workouts w ON w.id = wv.workout_id
         WHERE wes.consultancy_id = ?
           AND wes.student_membership_id = ?
           AND wes.status = 'COMPLETED'
         ORDER BY wes.completed_at DESC, wes.id DESC
         LIMIT 10;`,
        [consultancyId, membershipId]
      );
      completedRows = rows;
    } catch {
      // Defensive fallback if 068 columns are missing
      try {
        const [rows] = await connection.execute<RowDataPacket[]>(
          `SELECT
            wes.public_id,
            wes.started_at,
            wes.completed_at,
            NULL AS student_completion_state,
            NULL AS student_feedback_notes,
            NULL AS custom_title,
            COALESCE(wv.title, w.title) AS base_workout_title,
            COALESCE(wv.title, w.title) AS workout_title,
            (
              SELECT COUNT(*)
              FROM workout_execution_sets weset
              WHERE weset.execution_session_id = wes.id
                AND weset.completed_at IS NOT NULL
            ) AS completed_sets_count
           FROM workout_execution_sessions wes
           INNER JOIN workout_assignments wa ON wa.id = wes.workout_assignment_id
           INNER JOIN workout_versions wv ON wv.id = wa.workout_version_id
           INNER JOIN workouts w ON w.id = wv.workout_id
           WHERE wes.consultancy_id = ?
             AND wes.student_membership_id = ?
             AND wes.status = 'COMPLETED'
           ORDER BY wes.completed_at DESC, wes.id DESC
           LIMIT 10;`,
          [consultancyId, membershipId]
        );
        completedRows = rows;
      } catch (err2: unknown) {
        console.error("[Personal Student Hub] Error in completed sessions fallback query:", err2 instanceof Error ? err2.message : err2);
        completedRows = [];
      }
    }

    const sessionSubstitutionsMap = new Map<string, Array<{ originalExerciseName: string; performedExerciseName: string; reason: string }>>();
    if (completedRows && completedRows.length > 0) {
      try {
        const sessionPublicIds = completedRows
          .map((r) => String(r.public_id))
          .filter(Boolean);
        if (sessionPublicIds.length > 0) {
          const [subRows] = await connection.query<RowDataPacket[]>(
            `SELECT
              wes.public_id AS session_public_id,
              wees.reason,
              orig_ex.name AS original_exercise_name,
              perf_ex.name AS performed_exercise_name
             FROM workout_execution_exercise_substitutions wees
             INNER JOIN workout_execution_sessions wes ON wes.id = wees.execution_session_id
             INNER JOIN exercises orig_ex ON orig_ex.id = wees.original_exercise_id
             INNER JOIN exercises perf_ex ON perf_ex.id = wees.performed_exercise_id
             WHERE wes.public_id IN (?)
             ORDER BY wees.sequence_number ASC;`,
            [sessionPublicIds]
          );

          for (const sub of subRows) {
            const sPubId = String(sub.session_public_id);
            if (!sessionSubstitutionsMap.has(sPubId)) {
              sessionSubstitutionsMap.set(sPubId, []);
            }
            sessionSubstitutionsMap.get(sPubId)!.push({
              originalExerciseName: String(sub.original_exercise_name),
              performedExerciseName: String(sub.performed_exercise_name),
              reason: String(sub.reason),
            });
          }
        }
      } catch {
        // Table or records safe fallback
      }
    }

    const completedSessions: CompletedWorkoutSession[] = (completedRows || []).map((r) => {
      const pubId = String(r.public_id);
      const subs = sessionSubstitutionsMap.get(pubId);
      return {
        publicId: pubId,
        workoutTitle: resolveWorkoutAssignmentTitle({
          customTitle: r.custom_title,
          studentName: student.name,
          baseTitle: r.base_workout_title || r.workout_title,
        }),
        startedAt: safeToIsoString(r.started_at),
        completedAt: safeToIsoString(r.completed_at),
        completedSetsCount: Number(r.completed_sets_count || 0),
        studentCompletionState: (r.student_completion_state as "ALL" | "PARTIAL" | "NONE") || null,
        studentFeedbackNotes: r.student_feedback_notes ? String(r.student_feedback_notes) : null,
        substitutions: subs && subs.length > 0 ? subs : undefined,
      };
    });

    // 8. Build Anamnesis Sections (clean, categorized)
    const anamnesis: AnamnesisSection[] = [];

    const healthItems: Array<{ label: string; value: string }> = [];
    if (mergedResponses.health_problems) {
      healthItems.push({ label: "Problemas ou condições de saúde", value: String(mergedResponses.health_problems) });
    }
    if (mergedResponses.bone_joint_problems) {
      healthItems.push({ label: "Problemas ósseos ou articulares", value: String(mergedResponses.bone_joint_problems) });
    }
    if (mergedResponses.surgery_history) {
      healthItems.push({ label: "Cirurgias prévias", value: String(mergedResponses.surgery_history) });
    }
    if (mergedResponses.continuous_medications) {
      healthItems.push({ label: "Medicamentos contínuos", value: String(mergedResponses.continuous_medications) });
    }
    if (mergedResponses.medical_restrictions) {
      healthItems.push({ label: "Recomendações ou restrições médicas", value: String(mergedResponses.medical_restrictions) });
    }
    if (healthItems.length > 0) {
      anamnesis.push({ title: "Histórico de Saúde & Limitações", items: healthItems });
    }

    const activityItems: Array<{ label: string; value: string }> = [];
    if (mergedResponses.physical_activity) {
      activityItems.push({ label: "Atividade física atual", value: String(mergedResponses.physical_activity) });
    }
    if (mergedResponses.training_time) {
      activityItems.push({ label: "Tempo de treino", value: String(mergedResponses.training_time) });
    }
    if (mergedResponses.training_frequency) {
      activityItems.push({ label: "Frequência de treino", value: String(mergedResponses.training_frequency) });
    }
    if (mergedResponses.cardio_frequency) {
      activityItems.push({ label: "Exercícios aeróbicos / cardio", value: String(mergedResponses.cardio_frequency) });
    }
    if (mergedResponses.training_schedule) {
      activityItems.push({ label: "Horário habitual de treino", value: String(mergedResponses.training_schedule) });
    }
    if (activityItems.length > 0) {
      anamnesis.push({ title: "Atividade Física & Rotina de Treino", items: activityItems });
    }

    const goalItems: Array<{ label: string; value: string }> = [];
    if (mergedResponses.main_goal) {
      goalItems.push({ label: "Objetivo principal", value: String(mergedResponses.main_goal) });
    }
    if (mergedResponses.consultancy_expectations) {
      goalItems.push({ label: "Expectativas com a consultoria", value: String(mergedResponses.consultancy_expectations) });
    }
    if (goalItems.length > 0) {
      anamnesis.push({ title: "Objetivos & Metas", items: goalItems });
    }

    const lifestyleItems: Array<{ label: string; value: string }> = [];
    if (mergedResponses.sleep_quality) {
      lifestyleItems.push({ label: "Qualidade do sono", value: String(mergedResponses.sleep_quality) });
    }
    if (mergedResponses.sleep_hours) {
      lifestyleItems.push({ label: "Horas de sono", value: String(mergedResponses.sleep_hours) });
    }
    if (mergedResponses.daily_water_intake) {
      lifestyleItems.push({ label: "Ingestão hídrica diária", value: String(mergedResponses.daily_water_intake) });
    }
    if (mergedResponses.smoking) {
      lifestyleItems.push({ label: "Tabagismo", value: String(mergedResponses.smoking) });
    }
    if (mergedResponses.alcohol_consumption_frequency) {
      lifestyleItems.push({ label: "Consumo de álcool", value: String(mergedResponses.alcohol_consumption_frequency) });
    }
    if (lifestyleItems.length > 0) {
      anamnesis.push({ title: "Estilo de Vida & Hábitos", items: lifestyleItems });
    }

    // If intake submissions didn't yield anamnesis sections, build from custom anamnesis responses
    if (anamnesis.length === 0 && customAnamnesisQuestions.length > 0) {
      const healthKeywords = ["saúde", "saude", "doença", "doenca", "problema", "lesão", "lesao", "lesões", "lesoes", "cirurgia", "medicamento", "remedio", "remédio", "restrição", "restricao", "dor", "médic", "medic", "patologia", "cardíac", "cardiac", "pressão", "pressao", "articula"];
      const activityKeywords = ["atividade", "treino", "exercício", "exercicio", "frequência", "frequencia", "tempo", "aeróbic", "aerobic", "cardio", "esporte", "modalidade", "academia", "horário", "horario"];
      const goalKeywords = ["objetivo", "meta", "expectativa", "resultado", "foco", "desejo", "alvo"];
      const lifestyleKeywords = ["sono", "dormir", "água", "agua", "hídric", "hidric", "fumo", "fumar", "tabagismo", "álcool", "alcool", "bebida", "alimenta", "dieta", "refeição", "refeicao", "estresse", "rotina"];

      const cHealth: Array<{ label: string; value: string }> = [];
      const cActivity: Array<{ label: string; value: string }> = [];
      const cGoals: Array<{ label: string; value: string }> = [];
      const cLifestyle: Array<{ label: string; value: string }> = [];
      const cGeneral: Array<{ label: string; value: string }> = [];

      for (const item of customAnamnesisQuestions) {
        const l = item.label.toLowerCase();
        if (healthKeywords.some((k) => l.includes(k))) {
          cHealth.push(item);
        } else if (activityKeywords.some((k) => l.includes(k))) {
          cActivity.push(item);
        } else if (goalKeywords.some((k) => l.includes(k))) {
          cGoals.push(item);
        } else if (lifestyleKeywords.some((k) => l.includes(k))) {
          cLifestyle.push(item);
        } else {
          cGeneral.push(item);
        }
      }

      if (cHealth.length > 0) anamnesis.push({ title: "Histórico de Saúde & Limitações", items: cHealth });
      if (cActivity.length > 0) anamnesis.push({ title: "Atividade Física & Rotina de Treino", items: cActivity });
      if (cGoals.length > 0) anamnesis.push({ title: "Objetivos & Metas", items: cGoals });
      if (cLifestyle.length > 0) anamnesis.push({ title: "Estilo de Vida & Hábitos", items: cLifestyle });
      if (cGeneral.length > 0) {
        if (anamnesis.length === 0) {
          anamnesis.push({ title: customAnamnesisTitle, items: cGeneral });
        } else {
          anamnesis.push({ title: "Informações Gerais & Complementares", items: cGeneral });
        }
      }
    }

    // 8.5. Fetch Prescribed Nutrition V2 Plans
    let nutritionPlans: StudentNutritionItem[] = [];
    try {
      const [nutritionRows] = await connection.execute<RowDataPacket[]>(
        `SELECT
          na.public_id AS assignment_public_id,
          na.status AS assignment_status,
          na.starts_on,
          na.ends_on,
          na.notes_for_student,
          na.created_at AS assigned_at,
          p.public_id AS plan_public_id,
          nv.title AS plan_title,
          nv.public_id AS version_public_id,
          nv.version_number
         FROM nutrition_v2_assignments na
         INNER JOIN nutrition_v2_plan_versions nv ON nv.id = na.nutrition_plan_version_id
         INNER JOIN nutrition_v2_plans p ON p.id = nv.nutrition_plan_id
         WHERE na.consultancy_id = ?
           AND na.student_membership_id = ?
           AND na.status IN ('ACTIVE', 'ENDED')
           AND na.deleted_at IS NULL
         ORDER BY na.status = 'ACTIVE' DESC, na.created_at DESC;`,
        [consultancyId, membershipId]
      );

      nutritionPlans = (nutritionRows || []).map((r) => ({
        assignmentPublicId: String(r.assignment_public_id),
        planPublicId: String(r.plan_public_id),
        versionPublicId: String(r.version_public_id),
        title: String(r.plan_title),
        versionNumber: Number(r.version_number || 1),
        status: (r.assignment_status as "ACTIVE" | "ENDED") || "ACTIVE",
        startsOn: formatDateYmd(r.starts_on),
        endsOn: r.ends_on ? formatDateYmd(r.ends_on) : null,
        notesForStudent: r.notes_for_student ? String(r.notes_for_student) : null,
        assignedAt: safeToIsoString(r.assigned_at),
      }));
    } catch {
      nutritionPlans = [];
    }

    // 8.6. Fetch Draft Nutrition V2 Plan if any
    let draftNutritionPlan: PersonalStudentDetail["draftNutritionPlan"] = null;
    try {
      const [draftRows] = await connection.execute<RowDataPacket[]>(
        `SELECT
          p.public_id AS plan_public_id,
          v.public_id AS version_public_id,
          v.version_number,
          v.title AS draft_title,
          v.updated_at
         FROM nutrition_v2_assignments a
         INNER JOIN nutrition_v2_plan_versions v ON v.id = a.nutrition_plan_version_id
         INNER JOIN nutrition_v2_plans p ON p.id = v.nutrition_plan_id
         WHERE a.consultancy_id = ?
           AND a.student_membership_id = ?
           AND a.status = 'DRAFT'
           AND a.deleted_at IS NULL
           AND v.status = 'DRAFT'
           AND v.deleted_at IS NULL
         ORDER BY a.id DESC
         LIMIT 1;`,
        [consultancyId, membershipId]
      );
      if (Array.isArray(draftRows) && draftRows.length > 0) {
        const dr = draftRows[0];
        draftNutritionPlan = {
          planPublicId: String(dr.plan_public_id),
          versionPublicId: String(dr.version_public_id),
          versionNumber: Number(dr.version_number || 1),
          title: String(dr.draft_title),
          updatedAt: safeToIsoString(dr.updated_at),
        };
      }
    } catch {
      draftNutritionPlan = null;
    }

    // 9. Overview Metrics
    const latestWorkout = workouts.length > 0 ? workouts[0] : null;
    const activeWorkoutsCount = workouts.filter((w) => w.status === "ACTIVE").length;

    // 9.1. Coach / Personal Trainer Resolution
    let coachName: string | null = (workoutRows.length > 0 && workoutRows[0].coach_name)
      ? String(workoutRows[0].coach_name)
      : null;
    if (!coachName) {
      try {
        const [cRows] = await connection.execute<RowDataPacket[]>(
          `SELECT u.full_name
           FROM consultancy_members cm
           INNER JOIN users u ON u.id = cm.user_id
           INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
           WHERE cm.consultancy_id = ?
             AND cmr.role IN ('PERSONAL', 'CONSULTANCY_ADMIN')
             AND cm.status = 'ACTIVE'
           ORDER BY (cmr.role = 'PERSONAL') DESC, cm.id ASC
           LIMIT 1;`,
          [consultancyId]
        );
        if (Array.isArray(cRows) && cRows.length > 0) {
          coachName = String(cRows[0].full_name || "");
        }
      } catch {
        coachName = null;
      }
    }

    // 9.2. Last 30 Days Frequency & Consistency Map
    let completedLast30DaysCount = 0;
    const last30DaysActivityDates: string[] = [];
    try {
      const [sessions30] = await connection.execute<RowDataPacket[]>(
        `SELECT DATE(wes.completed_at) AS session_date, COUNT(*) AS cnt
         FROM workout_execution_sessions wes
         WHERE wes.consultancy_id = ?
           AND wes.student_membership_id = ?
           AND wes.status = 'COMPLETED'
           AND wes.completed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
         GROUP BY DATE(wes.completed_at)
         ORDER BY session_date ASC;`,
        [consultancyId, membershipId]
      );
      if (Array.isArray(sessions30)) {
        for (const s of sessions30) {
          completedLast30DaysCount += Number(s.cnt || 0);
          if (s.session_date) {
            const dStr = formatDateYmd(s.session_date);
            if (dStr) last30DaysActivityDates.push(dStr);
          }
        }
      }
    } catch {
      completedLast30DaysCount = 0;
    }

    // 9.3. Student Level
    let studentLevel: "INICIANTE" | "INTERMEDIARIO" | "AVANCADO" = "INICIANTE";
    const rawLvl = String(mergedResponses.student_level || latestWorkout?.difficultyLevel || "").toUpperCase();
    if (rawLvl.includes("ADVANCED") || rawLvl.includes("AVAN")) {
      studentLevel = "AVANCADO";
    } else if (rawLvl.includes("INTERMEDIATE") || rawLvl.includes("INTER")) {
      studentLevel = "INTERMEDIARIO";
    } else {
      studentLevel = "INICIANTE";
    }

    // 9.4. DISC Profile
    const discProfile = mergedResponses.disc_profile
      ? String(mergedResponses.disc_profile)
      : mergedResponses.disc
      ? String(mergedResponses.disc)
      : mergedResponses.perfil_disc
      ? String(mergedResponses.perfil_disc)
      : null;

    // 9.5. PAR-Q Readiness Status & Health Limitations
    const boneJoint = mergedResponses.bone_joint_problems ? String(mergedResponses.bone_joint_problems).trim() : "";
    const medicalRestr = mergedResponses.medical_restrictions ? String(mergedResponses.medical_restrictions).trim() : "";
    const healthProb = mergedResponses.health_problems ? String(mergedResponses.health_problems).trim() : "";
    const surgery = mergedResponses.surgery_history ? String(mergedResponses.surgery_history).trim() : "";

    const isNegativeResponse = (val: string) => {
      const low = val.toLowerCase();
      return !val || low === "não" || low === "nao" || low === "nenhum" || low === "nenhuma" || low === "não possuo" || low === "nao possuo" || low.includes("sem restri");
    };

    const limitationsList = [
      !isNegativeResponse(boneJoint) ? boneJoint : null,
      !isNegativeResponse(medicalRestr) ? medicalRestr : null,
      !isNegativeResponse(healthProb) ? healthProb : null,
      !isNegativeResponse(surgery) ? `Cirurgia prévia: ${surgery}` : null,
    ].filter(Boolean) as string[];

    let parqStatus: "SEM_ALERTAS" | "COM_ALERTAS" | "NAO_PREENCHIDO" = "NAO_PREENCHIDO";
    let injuriesAndLimitations: string | null = null;

    if (limitationsList.length > 0) {
      parqStatus = "COM_ALERTAS";
      injuriesAndLimitations = limitationsList.join(" • ");
    } else if (anamnesis.length > 0 || Object.keys(mergedResponses).length > 2) {
      parqStatus = "SEM_ALERTAS";
      injuriesAndLimitations = null;
    } else {
      parqStatus = "NAO_PREENCHIDO";
      injuriesAndLimitations = null;
    }

    const latestBodyFatPct = measurements.find((m) => m.bodyFatPct != null)?.bodyFatPct ?? null;
    const latestMuscleMassKg = measurements.find((m) => m.muscleMassKg != null)?.muscleMassKg ?? null;

    // 9.6. Contract / Plan & Validity
    let activeSubPlanName: string | null = null;
    let activeSubStartsOn: string | null = null;
    let activeSubEndsOn: string | null = null;
    let activeSubscriptionData = null;

    try {
      const [subRows] = await connection.execute<RowDataPacket[]>(
        `SELECT
           sps.id,
           sps.status,
           DATE_FORMAT(sps.started_at, '%Y-%m-%d') AS started_at,
           DATE_FORMAT(sps.ends_at, '%Y-%m-%d') AS ends_at,
           cp.name AS plan_name,
           cp.amount_cents
         FROM student_plan_subscriptions sps
         INNER JOIN consultancy_plans cp ON cp.id = sps.plan_id
         WHERE sps.consultancy_id = ?
           AND sps.student_membership_id = ?
           AND sps.status = 'ACTIVE'
         ORDER BY sps.id DESC
         LIMIT 1;`,
        [consultancyId, membershipId]
      );
      if (Array.isArray(subRows) && subRows.length > 0) {
        const sr = subRows[0];
        activeSubPlanName = String(sr.plan_name);
        activeSubStartsOn = String(sr.started_at);
        activeSubEndsOn = sr.ends_at ? String(sr.ends_at) : null;
        activeSubscriptionData = {
          planName: activeSubPlanName,
          amountCents: Number(sr.amount_cents),
          startedAt: activeSubStartsOn,
          endsAt: activeSubEndsOn,
          status: String(sr.status),
        };
      }
    } catch {
      // Non-blocking fallback
    }

    // 9.7. Student Financial Charges History & Available Plans
    const studentChargesList: StudentChargeHistoryItem[] = [];
    const availablePlansList: StudentPlanSummaryItem[] = [];

    try {
      const [chRows] = await connection.execute<RowDataPacket[]>(
        `SELECT
           sc.public_id,
           sc.title,
           sc.amount_cents,
           DATE_FORMAT(sc.due_on, '%Y-%m-%d') AS due_on,
           sc.state,
           sc.infinitepay_checkout_url,
           sc.infinitepay_receipt_url,
           sc.infinitepay_installments,
           sc.infinitepay_capture_method,
           DATE_FORMAT(sc.paid_at, '%Y-%m-%dT%H:%i:%sZ') AS paid_at,
           DATE_FORMAT(sc.created_at, '%Y-%m-%dT%H:%i:%sZ') AS created_at,
           (sc.due_on < CURDATE()) AS is_overdue
         FROM student_charges sc
         WHERE sc.consultancy_id = ? AND sc.student_membership_id = ?
         ORDER BY sc.id DESC
         LIMIT 50;`,
        [consultancyId, membershipId]
      );
      if (Array.isArray(chRows)) {
        for (const cr of chRows) {
          const state = String(cr.state);
          let derivedStatus: "PENDING" | "OVERDUE" | "UNDER_REVIEW" | "PAID" | "CANCELED" = "PENDING";
          if (state === "PAID") {
            derivedStatus = "PAID";
          } else if (state === "CANCELED") {
            derivedStatus = "CANCELED";
          } else if (cr.is_overdue) {
            derivedStatus = "OVERDUE";
          }
          studentChargesList.push({
            publicId: String(cr.public_id),
            title: String(cr.title),
            amountCents: Number(cr.amount_cents),
            dueOn: String(cr.due_on),
            state,
            derivedStatus,
            paymentMethod: cr.infinitepay_capture_method ? String(cr.infinitepay_capture_method) : null,
            checkoutUrl: cr.infinitepay_checkout_url ? String(cr.infinitepay_checkout_url) : null,
            receiptUrl: cr.infinitepay_receipt_url ? String(cr.infinitepay_receipt_url) : null,
            installments: cr.infinitepay_installments ? Number(cr.infinitepay_installments) : null,
            paidAt: cr.paid_at ? String(cr.paid_at) : null,
            createdAt: String(cr.created_at),
          });
        }
      }

      const [pRows] = await connection.execute<RowDataPacket[]>(
        `SELECT
           public_id,
           name,
           description,
           amount_cents,
           duration_months,
           duration_days,
           assured_installments,
           payment_methods
         FROM consultancy_plans
         WHERE consultancy_id = ? AND status = 'ACTIVE'
         ORDER BY amount_cents ASC;`,
        [consultancyId]
      );
      if (Array.isArray(pRows)) {
        for (const pr of pRows) {
          availablePlansList.push({
            publicId: String(pr.public_id),
            name: String(pr.name),
            description: pr.description ? String(pr.description) : null,
            amountCents: Number(pr.amount_cents),
            durationMonths: pr.duration_months ? Number(pr.duration_months) : null,
            durationDays: pr.duration_days ? Number(pr.duration_days) : null,
            assuredInstallments: Number(pr.assured_installments || 0),
            paymentMethods: String(pr.payment_methods || "PIX_AND_CARD"),
          });
        }
      }
    } catch {
      // Non-blocking fallback
    }

    const activeWorkoutItem = workouts.find((w) => w.status === "ACTIVE") || null;
    const contractPlanTitle = activeSubPlanName
      ? activeSubPlanName
      : activeWorkoutItem
      ? activeWorkoutItem.title
      : (workouts.length > 0 ? workouts[0].title : "Consultoria de Treino");
    const contractStartsOn = activeSubStartsOn || activeWorkoutItem?.startsOn || (workouts.length > 0 ? workouts[0].startsOn : student.joinedAt);
    const contractEndsOn = activeSubEndsOn || activeWorkoutItem?.endsOn || (workouts.length > 0 ? workouts[0].endsOn : null);
    let contractDaysRemaining: number | null = null;
    let contractPercentElapsed: number | null = 100;
    if (contractEndsOn) {
      const startMs = new Date(contractStartsOn).getTime();
      const endMs = new Date(contractEndsOn).getTime();
      const nowMs = Date.now();
      contractDaysRemaining = Math.ceil((endMs - nowMs) / (1000 * 60 * 60 * 24));
      const totalDuration = Math.max(1, endMs - startMs);
      const elapsed = Math.max(0, nowMs - startMs);
      contractPercentElapsed = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
    }

    // 9.7. Last 30 Days Summary Calendar
    const last30DaysSummary: Array<{ dateStr: string; dayNumber: number; trained: boolean }> = [];
    const activeDatesSet = new Set(last30DaysActivityDates);
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const ymd = `${y}-${m}-${day}`;
      last30DaysSummary.push({
        dateStr: ymd,
        dayNumber: d.getDate(),
        trained: activeDatesSet.has(ymd),
      });
    }

    const nutritionGoal = mergedResponses.main_goal ? String(mergedResponses.main_goal) : null;
    const allergies = mergedResponses.food_allergies ? String(mergedResponses.food_allergies) : null;
    const intolerances = mergedResponses.food_intolerances ? String(mergedResponses.food_intolerances) : null;
    const dietaryRestrictions = mergedResponses.medical_restrictions ? String(mergedResponses.medical_restrictions) : null;

    const overview: PersonalStudentOverview = {
      objective: mergedResponses.main_goal ? String(mergedResponses.main_goal) : (latestWorkout?.objective || null),
      nutritionGoal,
      allergies,
      intolerances,
      dietaryRestrictions,
      birthDate: mergedResponses.birth_date ? String(mergedResponses.birth_date) : null,
      age: mergedResponses.age ? String(mergedResponses.age) : null,
      sex: mergedResponses.sex ? String(mergedResponses.sex) : null,
      heightCm: finalHeightCm,
      weightKg: finalWeightKg,
      lastWeightRecordedOn: measurements.length > 0 ? measurements[0].recordedOn : null,
      latestWorkoutTitle: latestWorkout?.title || null,
      latestWorkoutDifficulty: latestWorkout?.difficultyLevel || null,
      activeWorkoutsCount,
      completedWorkoutsCount: completedSessions.length,
      hasAnamnesis: anamnesis.length > 0,
      hasPhotos: photos.length > 0,
      hasForms: forms.length > 0,
      latestNutritionTitle: nutritionPlans.length > 0 ? nutritionPlans[0].title : null,
      activeNutritionCount: nutritionPlans.filter((n) => n.status === "ACTIVE").length,
      hasPendingPhotos: photos.some((p) => p.status === "PENDING"),
      hasPendingAnamnesis: Array.isArray(customForms) && customForms.some((r) => String(r.template_title).toLowerCase().includes("anamnes") && r.status === "PENDING"),
      hasPendingAssessment: Array.isArray(customForms) && customForms.some((r) => (String(r.template_title).toLowerCase().includes("avalia") || String(r.template_title).toLowerCase().includes("medid")) && r.status === "PENDING"),
      coachName,
      studentLevel,
      discProfile,
      parqStatus,
      injuriesAndLimitations,
      latestBodyFatPct,
      latestMuscleMassKg,
      completedLast30DaysCount,
      last30DaysActivityDates,
      contractPlanTitle,
      contractStartsOn,
      contractEndsOn,
      contractDaysRemaining,
      contractPercentElapsed,
      last30DaysSummary,
    };

    return {
      student,
      overview,
      photos,
      anamnesis,
      forms,
      anamnesisList,
      formsList,
      availableTemplates,
      publishedForms,
      workouts,
      completedSessions,
      measurements,
      nutrition: nutritionPlans,
      draftNutritionPlan,
      financial: {
        activeSubscription: activeSubscriptionData,
        charges: studentChargesList,
        availablePlans: availablePlansList,
      },
    };
  } catch (err: unknown) {
    console.error("[Personal Student Hub] Error in getPersonalStudentDetail:", err instanceof Error ? err.message : err);
    if (resolvedStudent) {
      return {
        student: resolvedStudent,
        overview: {
          objective: null,
          nutritionGoal: null,
          allergies: null,
          intolerances: null,
          dietaryRestrictions: null,
          birthDate: null,
          age: null,
          sex: null,
          heightCm: null,
          weightKg: null,
          lastWeightRecordedOn: null,
          latestWorkoutTitle: null,
          latestWorkoutDifficulty: null,
          activeWorkoutsCount: 0,
          completedWorkoutsCount: 0,
          hasAnamnesis: false,
          hasPhotos: false,
          hasForms: false,
          latestNutritionTitle: null,
          activeNutritionCount: 0,
          hasPendingPhotos: false,
          hasPendingAnamnesis: false,
          hasPendingAssessment: false,
          coachName: null,
          studentLevel: "INICIANTE",
          discProfile: null,
          parqStatus: "NAO_PREENCHIDO",
          injuriesAndLimitations: null,
          latestBodyFatPct: null,
          latestMuscleMassKg: null,
          completedLast30DaysCount: 0,
          last30DaysActivityDates: [],
          contractPlanTitle: null,
          contractStartsOn: null,
          contractEndsOn: null,
          contractDaysRemaining: null,
          contractPercentElapsed: null,
          last30DaysSummary: [],
        },
        photos: [],
        anamnesis: [],
        forms: [],
        anamnesisList: [],
        formsList: [],
        availableTemplates: [],
        publishedForms: [],
        workouts: [],
        completedSessions: [],
        measurements: [],
        nutrition: [],
        draftNutritionPlan: null,
      };
    }
    return null;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}


export interface PersonalTrainingMetrics {
  totalStudents: number;
  emDiaCount: number;
  aVencerCount: number;
  vencidosCount: number;
  semTreinoCount: number;
  emDiaPercent: number;
  comTreinoCount?: number;
  loadStatus?: "SUCCESS" | "ERROR" | "LOADING";
  errorMessage?: string;
}

export function computePersonalTrainingMetrics(
  students: PersonalStudentSummary[],
  todayStr = new Date().toISOString().slice(0, 10)
): PersonalTrainingMetrics {
  const totalStudents = students.length;
  let semTreinoCount = 0;
  let vencidosCount = 0;
  let aVencerCount = 0;
  let emDiaCount = 0;

  const today = new Date(todayStr);
  const next7Days = new Date(today);
  next7Days.setDate(next7Days.getDate() + 7);
  const next7DaysStr = next7Days.toISOString().slice(0, 10);

  for (const s of students) {
    if (!s.latestWorkoutTitle || s.latestAssignmentStatus !== "ACTIVE") {
      semTreinoCount++;
    } else if (s.latestAssignmentEndsOn && s.latestAssignmentEndsOn < todayStr) {
      vencidosCount++;
    } else if (
      s.latestAssignmentEndsOn &&
      s.latestAssignmentEndsOn >= todayStr &&
      s.latestAssignmentEndsOn <= next7DaysStr
    ) {
      aVencerCount++;
    } else {
      emDiaCount++;
    }
  }

  const emDiaPercent = totalStudents > 0 ? Math.round((emDiaCount / totalStudents) * 100) : 0;

  return {
    totalStudents,
    emDiaCount,
    comTreinoCount: emDiaCount + aVencerCount + vencidosCount,
    aVencerCount,
    vencidosCount,
    semTreinoCount,
    emDiaPercent,
    loadStatus: "SUCCESS",
  };
}

export async function getPersonalAssessmentsCount(consultancyId: number): Promise<{
  pendingAssessmentsCount: number;
  completedAssessmentsCount: number;
}> {
  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
         COUNT(CASE WHEN r.status = 'PENDING' OR r.status = 'SUBMITTED' THEN 1 END) AS pending_count,
         COUNT(CASE WHEN r.status = 'REVIEWED' THEN 1 END) AS completed_count
       FROM student_photo_evaluation_requests r
       INNER JOIN consultancy_members cm ON cm.id = r.student_membership_id
       WHERE cm.consultancy_id = ? AND r.deleted_at IS NULL;`,
      [consultancyId]
    ).catch(() => [[{ pending_count: 0, completed_count: 0 }]] as unknown as [RowDataPacket[]]);

    const r = rows?.[0] || { pending_count: 0, completed_count: 0 };
    return {
      pendingAssessmentsCount: Number(r.pending_count || 0),
      completedAssessmentsCount: Number(r.completed_count || 0),
    };
  } catch {
    return {
      pendingAssessmentsCount: 0,
      completedAssessmentsCount: 0,
    };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
