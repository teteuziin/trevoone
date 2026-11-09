import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "@/lib/db/mysql";
export * from "./physical-assessments-types";
export { computeMetricDelta } from "./physical-assessments-types";
import type {
  PhysicalAssessmentItem,
  StudentAssessmentSummary,
  ConsultancyPhysicalAssessmentsStats,
} from "./physical-assessments-types";

/**
 * Retorna as estatísticas agregadas de avaliações físicas para o card do dashboard Início.
 * Consulta exclusivamente a tabela student_progress_entries no escopo da consultoria.
 */
export async function getConsultancyPhysicalAssessmentsStats(
  consultancyId: number
): Promise<ConsultancyPhysicalAssessmentsStats> {
  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT
         COUNT(DISTINCT spe.student_membership_id) AS evaluated_students_count,
         COUNT(spe.id) AS total_assessments_count,
         DATE_FORMAT(MAX(spe.recorded_on), '%Y-%m-%d') AS latest_recorded_on
       FROM student_progress_entries spe
       INNER JOIN consultancy_members cm ON cm.id = spe.student_membership_id
       WHERE spe.consultancy_id = ?
         AND cm.status = 'ACTIVE';`,
      [consultancyId]
    );

    const r = rows?.[0];
    return {
      evaluatedStudentsCount: Number(r?.evaluated_students_count || 0),
      totalAssessmentsCount: Number(r?.total_assessments_count || 0),
      latestRecordedOn: r?.latest_recorded_on ? String(r.latest_recorded_on) : null,
      loadStatus: "SUCCESS",
    };
  } catch (err: unknown) {
    console.error("[Physical Assessments] Error fetching consultancy stats:", err);
    return {
      evaluatedStudentsCount: 0,
      totalAssessmentsCount: 0,
      latestRecordedOn: null,
      loadStatus: "ERROR",
      errorMessage: err instanceof Error ? err.message : "Erro ao carregar avaliações",
    };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Retorna a lista de todos os alunos ativos da consultoria com o status das suas avaliações físicas.
 */
export async function listStudentsPhysicalAssessments(
  consultancyId: number
): Promise<StudentAssessmentSummary[]> {
  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();

    // 1. Fetch active students in tenancy
    const [students] = await connection.execute<RowDataPacket[]>(
      `SELECT
         cm.id AS membership_id,
         cm.public_id AS student_public_id,
         u.public_id AS user_public_id,
         u.full_name,
         u.email,
         u.phone
       FROM consultancy_members cm
       INNER JOIN users u ON u.id = cm.user_id
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id AND cmr.role = 'STUDENT'
       WHERE cm.consultancy_id = ?
         AND cm.status = 'ACTIVE'
         AND u.deleted_at IS NULL
       ORDER BY u.full_name ASC;`,
      [consultancyId]
    );

    if (!Array.isArray(students) || students.length === 0) {
      return [];
    }

    // 2. Fetch all progress entries for this tenancy ordered by recorded_on DESC, id DESC
    const [entries] = await connection.execute<RowDataPacket[]>(
      `SELECT
         spe.id,
         spe.public_id,
         spe.student_membership_id,
         DATE_FORMAT(spe.recorded_on, '%Y-%m-%d') AS recorded_on,
         spe.weight_kg,
         spe.waist_cm,
         spe.abdomen_cm,
         spe.hip_cm,
         spe.arm_cm,
         spe.thigh_cm,
         spe.note,
         spe.created_at,
         u_creator.full_name AS creator_name
       FROM student_progress_entries spe
       LEFT JOIN users u_creator ON u_creator.id = spe.created_by_user_id
       WHERE spe.consultancy_id = ?
       ORDER BY spe.recorded_on DESC, spe.id DESC;`,
      [consultancyId]
    );

    // Group entries by student membership id
    const entriesByStudent = new Map<number, PhysicalAssessmentItem[]>();
    for (const row of entries) {
      const mId = Number(row.student_membership_id);
      if (!entriesByStudent.has(mId)) {
        entriesByStudent.set(mId, []);
      }
      entriesByStudent.get(mId)!.push({
        publicId: String(row.public_id),
        recordedOn: String(row.recorded_on),
        weightKg: row.weight_kg != null ? Number(row.weight_kg) : null,
        waistCm: row.waist_cm != null ? Number(row.waist_cm) : null,
        abdomenCm: row.abdomen_cm != null ? Number(row.abdomen_cm) : null,
        hipCm: row.hip_cm != null ? Number(row.hip_cm) : null,
        armCm: row.arm_cm != null ? Number(row.arm_cm) : null,
        thighCm: row.thigh_cm != null ? Number(row.thigh_cm) : null,
        note: row.note ? String(row.note) : null,
        createdByName: row.creator_name ? String(row.creator_name) : null,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : "",
      });
    }

    // Assemble result
    const results: StudentAssessmentSummary[] = students.map((s) => {
      const mId = Number(s.membership_id);
      const studentEntries = entriesByStudent.get(mId) || [];
      const latest = studentEntries.length > 0 ? studentEntries[0] : null;

      return {
        membershipId: mId,
        studentPublicId: String(s.student_public_id),
        userPublicId: String(s.user_public_id),
        name: String(s.full_name || "Aluno"),
        email: String(s.email || ""),
        phone: s.phone ? String(s.phone) : null,
        assessmentsCount: studentEntries.length,
        latestAssessment: latest,
        assessments: studentEntries,
      };
    });

    // Order: Avaliados primeiro (com avaliação mais recente primeiro), depois não avaliados
    return results.sort((a, b) => {
      if (a.latestAssessment && !b.latestAssessment) return -1;
      if (!a.latestAssessment && b.latestAssessment) return 1;
      if (a.latestAssessment && b.latestAssessment) {
        return b.latestAssessment.recordedOn.localeCompare(a.latestAssessment.recordedOn);
      }
      return a.name.localeCompare(b.name, "pt-BR");
    });
  } catch (err: unknown) {
    console.error("[Physical Assessments] Error listing students assessments:", err);
    return [];
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Retorna o histórico completo de avaliações físicas de um aluno específico.
 */
export async function getStudentPhysicalAssessments(params: {
  consultancyId: number;
  studentMembershipPublicId: string;
}): Promise<{
  student: {
    membershipPublicId: string;
    name: string;
    email: string;
  };
  assessments: PhysicalAssessmentItem[];
} | null> {
  const { consultancyId, studentMembershipPublicId } = params;
  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();

    // Verify student membership in tenancy
    const [students] = await connection.execute<RowDataPacket[]>(
      `SELECT
         cm.id AS membership_id,
         cm.public_id AS student_public_id,
         u.full_name,
         u.email
       FROM consultancy_members cm
       INNER JOIN users u ON u.id = cm.user_id
       INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id AND cmr.role = 'STUDENT'
       WHERE cm.consultancy_id = ?
         AND (cm.public_id = ? OR u.public_id = ?)
         AND cm.status = 'ACTIVE'
         AND u.deleted_at IS NULL
       LIMIT 1;`,
      [consultancyId, studentMembershipPublicId, studentMembershipPublicId]
    );

    if (!Array.isArray(students) || students.length === 0) {
      return null;
    }

    const student = students[0];
    const membershipId = Number(student.membership_id);

    // Fetch entries
    const [entries] = await connection.execute<RowDataPacket[]>(
      `SELECT
         spe.public_id,
         DATE_FORMAT(spe.recorded_on, '%Y-%m-%d') AS recorded_on,
         spe.weight_kg,
         spe.waist_cm,
         spe.abdomen_cm,
         spe.hip_cm,
         spe.arm_cm,
         spe.thigh_cm,
         spe.note,
         spe.created_at,
         u_creator.full_name AS creator_name
       FROM student_progress_entries spe
       LEFT JOIN users u_creator ON u_creator.id = spe.created_by_user_id
       WHERE spe.consultancy_id = ?
         AND spe.student_membership_id = ?
       ORDER BY spe.recorded_on DESC, spe.id DESC;`,
      [consultancyId, membershipId]
    );

    const assessments: PhysicalAssessmentItem[] = (entries || []).map((row) => ({
      publicId: String(row.public_id),
      recordedOn: String(row.recorded_on),
      weightKg: row.weight_kg != null ? Number(row.weight_kg) : null,
      waistCm: row.waist_cm != null ? Number(row.waist_cm) : null,
      abdomenCm: row.abdomen_cm != null ? Number(row.abdomen_cm) : null,
      hipCm: row.hip_cm != null ? Number(row.hip_cm) : null,
      armCm: row.arm_cm != null ? Number(row.arm_cm) : null,
      thighCm: row.thigh_cm != null ? Number(row.thigh_cm) : null,
      note: row.note ? String(row.note) : null,
      createdByName: row.creator_name ? String(row.creator_name) : null,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : "",
    }));

    return {
      student: {
        membershipPublicId: String(student.student_public_id),
        name: String(student.full_name || "Aluno"),
        email: String(student.email || ""),
      },
      assessments,
    };
  } catch (err: unknown) {
    console.error("[Physical Assessments] Error fetching student assessments:", err);
    return null;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
