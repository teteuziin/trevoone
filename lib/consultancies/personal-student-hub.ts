import { getDbConnection } from "@/lib/db/mysql";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { COMPLETE_ANAMNESIS_FORM_V1, PHYSICAL_ASSESSMENT_FORM_V1 } from "./intake-schemas";

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
}

export interface PhotoEvaluationItem {
  requestPublicId: string;
  status: string;
  submittedAt: string | null;
  reviewedAt: string | null;
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

export interface StudentFormAnswer {
  id: string;
  publicId: string;
  title: string;
  formType: "INTAKE" | "CUSTOM";
  status: string;
  submittedAt: string | null;
  questions: Array<{
    question: string;
    answer: string;
  }>;
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
}

export interface PhysicalMeasurement {
  recordedOn: string;
  weightKg: number | null;
  waistCm: number | null;
  abdomenCm: number | null;
  hipCm: number | null;
  armCm: number | null;
  thighCm: number | null;
  note: string | null;
}

export interface PersonalStudentDetail {
  student: PersonalStudentProfile;
  overview: PersonalStudentOverview;
  photos: PhotoEvaluationItem[];
  anamnesis: AnamnesisSection[];
  forms: StudentFormAnswer[];
  workouts: StudentWorkoutItem[];
  completedSessions: CompletedWorkoutSession[];
  measurements: PhysicalMeasurement[];
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

    let sql = `
      SELECT
        cm.id AS membership_id,
        cm.public_id AS membership_public_id,
        u.public_id AS user_public_id,
        u.full_name,
        u.email,
        cm.created_at AS joined_at,
        latest_w.title AS latest_workout_title,
        latest_w.status AS latest_workout_status,
        latest_wa.status AS latest_assignment_status,
        latest_wa.starts_on AS latest_assignment_starts_on,
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
        SELECT wa.student_membership_id, wa.workout_id, wa.status, wa.starts_on
        FROM workout_assignments wa
        INNER JOIN (
          SELECT student_membership_id, MAX(id) AS max_id
          FROM workout_assignments
          WHERE deleted_at IS NULL
          GROUP BY student_membership_id
        ) max_wa ON wa.id = max_wa.max_id
      ) latest_wa ON latest_wa.student_membership_id = cm.id
      LEFT JOIN workouts latest_w ON latest_w.id = latest_wa.workout_id
      WHERE cm.consultancy_id = ?
        AND cm.status = 'ACTIVE'
        AND u.deleted_at IS NULL
    `;

    const queryParams: (string | number)[] = [consultancyId];

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
      latestAssignmentStatus: r.latest_assignment_status as "ACTIVE" | "ENDED" | null,
      latestAssignmentStartsOn: r.latest_assignment_starts_on ? String(r.latest_assignment_starts_on) : null,
    }));
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
  studentPublicId: string;
}): Promise<PersonalStudentDetail | null> {
  const { consultancyId, consultancySlug, studentPublicId } = params;
  let connection: PoolConnection | null = null;

  try {
    connection = await getDbConnection();

    // 1. Authenticate student membership in this consultancy
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
        u.phone_number
       FROM consultancy_members cm
       INNER JOIN users u ON u.id = cm.user_id
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id AND cmr.role = 'STUDENT'
       WHERE cm.consultancy_id = ?
         AND (cm.public_id = ? OR u.public_id = ?)
         AND cm.status = 'ACTIVE'
         AND u.deleted_at IS NULL
       LIMIT 1;`,
      [consultancyId, studentPublicId, studentPublicId]
    );

    if (!Array.isArray(members) || members.length === 0) {
      return null;
    }

    const member = members[0];
    const membershipId = Number(member.membership_id);

    const student: PersonalStudentProfile = {
      membershipPublicId: String(member.membership_public_id),
      userPublicId: String(member.user_public_id),
      name: String(member.full_name),
      email: String(member.email),
      phone: member.phone_number ? String(member.phone_number) : null,
      joinedAt: member.joined_at ? new Date(member.joined_at).toISOString() : new Date().toISOString(),
      status: String(member.membership_status),
    };

    // 2. Fetch Intake Submissions (Anamnesis & Questionnaires)
    const [intakes] = await connection.execute<RowDataPacket[]>(
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

    let mergedResponses: Record<string, unknown> = {};
    const forms: StudentFormAnswer[] = [];

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
          parsed = typeof row.responses_json === "string"
            ? JSON.parse(row.responses_json)
            : (row.responses_json || {});
          mergedResponses = { ...parsed, ...mergedResponses };
        } catch {
          // Safe fallback for JSON parse error
        }

        const questions: Array<{ question: string; answer: string }> = [];
        for (const [k, v] of Object.entries(parsed)) {
          if (v !== null && v !== undefined && v !== "") {
            const label = fieldLabelMap.get(k) || k.replace(/_/g, " ");
            questions.push({
              question: label,
              answer: String(v),
            });
          }
        }

        const isAnamnesis = String(row.form_key).includes("anamnesis");
        const title = isAnamnesis ? "Anamnese Inicial" : "Avaliação Física / Questionário";

        forms.push({
          id: String(row.id),
          publicId: String(row.public_id),
          title,
          formType: "INTAKE",
          status: "Preenchido",
          submittedAt: row.submitted_at ? new Date(row.submitted_at).toISOString() : null,
          questions,
        });
      }
    }

    // 3. Fetch Custom Forms (consultancy_custom_form_requests)
    const [customForms] = await connection.execute<RowDataPacket[]>(
      `SELECT
        r.id,
        r.public_id,
        r.status,
        r.responses_json,
        r.submitted_at,
        t.title AS template_title,
        t.fields_json
       FROM consultancy_custom_form_requests r
       INNER JOIN consultancy_custom_form_templates t ON t.id = r.template_id
       WHERE r.consultancy_id = ?
         AND r.student_membership_id = ?
         AND r.status IN ('SUBMITTED', 'REVIEWED')
       ORDER BY r.submitted_at DESC, r.id DESC;`,
      [consultancyId, membershipId]
    );

    if (Array.isArray(customForms) && customForms.length > 0) {
      for (const row of customForms) {
        let parsedAnswers: Record<string, unknown> = {};
        let parsedFields: Array<{ id: string; label: string }> = [];
        try {
          parsedAnswers = typeof row.responses_json === "string"
            ? JSON.parse(row.responses_json)
            : (row.responses_json || {});
          parsedFields = typeof row.fields_json === "string"
            ? JSON.parse(row.fields_json)
            : (row.fields_json || []);
        } catch {
          // ignore malformed
        }

        const customFieldLabelMap = new Map<string, string>();
        for (const f of parsedFields) {
          if (f.id && f.label) customFieldLabelMap.set(f.id, f.label);
        }

        const questions: Array<{ question: string; answer: string }> = [];
        for (const [k, v] of Object.entries(parsedAnswers)) {
          if (v !== null && v !== undefined && v !== "") {
            const label = customFieldLabelMap.get(k) || k;
            questions.push({
              question: label,
              answer: String(v),
            });
          }
        }

        forms.push({
          id: String(row.id),
          publicId: String(row.public_id),
          title: String(row.template_title || "Formulário Personalizado"),
          formType: "CUSTOM",
          status: row.status === "REVIEWED" ? "Revisado" : "Respondido",
          submittedAt: row.submitted_at ? new Date(row.submitted_at).toISOString() : null,
          questions,
        });
      }
    }

    // 4. Fetch Physical Progress Entries (weight & measurements)
    const [progressRows] = await connection.execute<RowDataPacket[]>(
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
       LIMIT 10;`,
      [consultancyId, membershipId]
    );

    const measurements: PhysicalMeasurement[] = (progressRows || []).map((r) => ({
      recordedOn: String(r.recorded_on),
      weightKg: r.weight_kg != null ? Number(r.weight_kg) : null,
      waistCm: r.waist_cm != null ? Number(r.waist_cm) : null,
      abdomenCm: r.abdomen_cm != null ? Number(r.abdomen_cm) : null,
      hipCm: r.hip_cm != null ? Number(r.hip_cm) : null,
      armCm: r.arm_cm != null ? Number(r.arm_cm) : null,
      thighCm: r.thigh_cm != null ? Number(r.thigh_cm) : null,
      note: r.note ? String(r.note) : null,
    }));

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
    const [photoRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        r.id AS request_id,
        r.public_id AS request_public_id,
        r.status,
        r.reviewer_notes,
        r.submitted_at,
        r.reviewed_at,
        i.pose,
        i.public_id AS image_public_id
       FROM student_photo_evaluation_requests r
       LEFT JOIN student_photo_evaluation_images i ON i.request_id = r.id
       WHERE r.consultancy_id = ?
         AND r.student_membership_id = ?
       ORDER BY r.submitted_at DESC, r.id DESC;`,
      [consultancyId, membershipId]
    );

    const photosMap = new Map<string, PhotoEvaluationItem>();
    if (Array.isArray(photoRows)) {
      for (const r of photoRows) {
        const reqPubId = String(r.request_public_id);
        if (!photosMap.has(reqPubId)) {
          photosMap.set(reqPubId, {
            requestPublicId: reqPubId,
            status: String(r.status),
            submittedAt: r.submitted_at ? new Date(r.submitted_at).toISOString() : null,
            reviewedAt: r.reviewed_at ? new Date(r.reviewed_at).toISOString() : null,
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
    const [workoutRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        wa.public_id AS assignment_public_id,
        wa.status AS assignment_status,
        wa.starts_on,
        wa.ends_on,
        wa.notes_for_student,
        wa.created_at AS assigned_at,
        w.public_id AS workout_public_id,
        w.title AS workout_title,
        w.subtitle AS workout_subtitle,
        w.objective AS workout_objective,
        w.difficulty_level,
        wv.public_id AS version_public_id,
        wv.version_number
       FROM workout_assignments wa
       INNER JOIN workouts w ON w.id = wa.workout_id
       INNER JOIN workout_versions wv ON wv.id = wa.workout_version_id
       WHERE wa.consultancy_id = ?
         AND wa.student_membership_id = ?
         AND wa.deleted_at IS NULL
       ORDER BY wa.status = 'ACTIVE' DESC, wa.created_at DESC;`,
      [consultancyId, membershipId]
    );

    const workouts: StudentWorkoutItem[] = (workoutRows || []).map((r) => ({
      assignmentPublicId: String(r.assignment_public_id),
      workoutPublicId: String(r.workout_public_id),
      versionPublicId: String(r.version_public_id),
      title: String(r.workout_title),
      subtitle: r.workout_subtitle ? String(r.workout_subtitle) : null,
      objective: r.workout_objective ? String(r.workout_objective) : null,
      difficultyLevel: String(r.difficulty_level || "INTERMEDIATE"),
      versionNumber: Number(r.version_number || 1),
      status: r.assignment_status as "ACTIVE" | "ENDED",
      startsOn: String(r.starts_on),
      endsOn: r.ends_on ? String(r.ends_on) : null,
      notesForStudent: r.notes_for_student ? String(r.notes_for_student) : null,
      assignedAt: r.assigned_at ? new Date(r.assigned_at).toISOString() : new Date().toISOString(),
    }));

    // 7. Fetch Completed Workout Sessions
    const [completedRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        wes.public_id,
        wes.started_at,
        wes.completed_at,
        w.title AS workout_title,
        (
          SELECT COUNT(*)
          FROM workout_execution_sets weset
          WHERE weset.execution_session_id = wes.id
            AND weset.completed_at IS NOT NULL
        ) AS completed_sets_count
       FROM workout_execution_sessions wes
       INNER JOIN workout_assignments wa ON wa.id = wes.workout_assignment_id
       INNER JOIN workouts w ON w.id = wa.workout_id
       WHERE wes.consultancy_id = ?
         AND wes.student_membership_id = ?
         AND wes.status = 'COMPLETED'
       ORDER BY wes.completed_at DESC, wes.id DESC
       LIMIT 10;`,
      [consultancyId, membershipId]
    );

    const completedSessions: CompletedWorkoutSession[] = (completedRows || []).map((r) => ({
      publicId: String(r.public_id),
      workoutTitle: String(r.workout_title),
      startedAt: new Date(r.started_at).toISOString(),
      completedAt: new Date(r.completed_at).toISOString(),
      completedSetsCount: Number(r.completed_sets_count || 0),
    }));

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

    // 9. Overview Metrics
    const latestWorkout = workouts.length > 0 ? workouts[0] : null;
    const activeWorkoutsCount = workouts.filter((w) => w.status === "ACTIVE").length;

    const overview: PersonalStudentOverview = {
      objective: mergedResponses.main_goal ? String(mergedResponses.main_goal) : (latestWorkout?.objective || null),
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
    };

    return {
      student,
      overview,
      photos,
      anamnesis,
      forms,
      workouts,
      completedSessions,
      measurements,
    };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
