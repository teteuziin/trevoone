import type { RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "@/lib/db/mysql";
import { evaluateStudentMonitoring, type StudentEvaluationResult } from "./evaluator";
import { getMemberLastActive } from "./activity-tracker";
import { getProfessionalActionsHistory, type ProfessionalAdminActionRecord } from "./admin-actions";

export type ProfessionalRadarStatus = "EM_DIA" | "ATENCAO" | "CRITICO";

export interface ProfessionalRadarItem {
  professionalMemberId: number;
  userPublicId: string;
  name: string;
  role: string;
  status: ProfessionalRadarStatus;
  statusLabel: string;
  activeStudentsAssigned: number;
  studentsOkCount: number;
  studentsAttentionCount: number;
  studentsCriticalCount: number;
  openAlertsCount: number;
  criticalAlertsCount: number;
  studentsWithoutRecentInteractionCount: number;
  lastActiveAt: Date | null;
  reasons: string[];
  activeEscalation: ProfessionalAdminActionRecord | null;
}

export async function getProfessionalRadarData(
  consultancyId: number
): Promise<{
  professionals: ProfessionalRadarItem[];
  kpis: {
    totalProfessionals: number;
    inGoodStandingCount: number;
    needingAttentionCount: number;
    criticalCount: number;
    totalOpenAlerts: number;
  };
}> {
  const connection = await getDbConnection();
  let professionalRows: RowDataPacket[] = [];
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id AS member_id, u.public_id AS user_public_id, u.full_name, cmr.role
       FROM consultancy_members cm
       JOIN users u ON u.id = cm.user_id
       JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.consultancy_id = ? AND cm.status = 'ACTIVE'
         AND cmr.role IN ('PERSONAL', 'NUTRITIONIST')
       ORDER BY u.full_name ASC;`,
      [consultancyId]
    );
    professionalRows = rows;
  } finally {
    connection.release();
  }

  const items: ProfessionalRadarItem[] = [];

  for (const prof of professionalRows) {
    const profMemberId = Number(prof.member_id);

    // 1. Fetch assigned active students
    const conn = await getDbConnection();
    let assignedStudentIds: number[] = [];
    try {
      const [assignRows] = await conn.execute<RowDataPacket[]>(
        `SELECT DISTINCT student_membership_id
         FROM (
           SELECT student_membership_id FROM workout_assignments
           WHERE consultancy_id = ? AND assigned_by_membership_id = ? AND status = 'ACTIVE' AND deleted_at IS NULL
           UNION
           SELECT student_membership_id FROM nutrition_v2_assignments
           WHERE consultancy_id = ? AND assigned_by_membership_id = ? AND status = 'ACTIVE'
         ) t;`,
        [consultancyId, profMemberId, consultancyId, profMemberId]
      );
      assignedStudentIds = assignRows.map((r) => Number(r.student_membership_id));
    } finally {
      conn.release();
    }

    // 2. Evaluate monitoring for assigned students
    const studentResults: StudentEvaluationResult[] = [];
    for (const sId of assignedStudentIds) {
      try {
        const res = await evaluateStudentMonitoring(consultancyId, sId);
        studentResults.push(res);
      } catch {
        // Continue
      }
    }

    const studentsOkCount = studentResults.filter((s) => s.state === "OK").length;
    const studentsAttentionCount = studentResults.filter((s) => s.state === "ATTENTION").length;
    const studentsCriticalCount = studentResults.filter((s) => s.state === "CRITICAL").length;

    let openAlertsCount = 0;
    let criticalAlertsCount = 0;
    for (const s of studentResults) {
      for (const a of s.alerts) {
        if (a.status === "OPEN" || a.status === "ACKNOWLEDGED") {
          openAlertsCount++;
          if (a.severity === "CRITICAL") criticalAlertsCount++;
        }
      }
    }

    // 3. Check students without recorded professional interaction in TREVO ONE > 7 days
    const connInteraction = await getDbConnection();
    let studentsWithoutRecentInteractionCount = 0;
    try {
      if (assignedStudentIds.length > 0) {
        const placeholders = assignedStudentIds.map(() => "?").join(", ");
        // Interaction signals: workout assignments updated, nutrition assignments updated, photo evaluations reviewed
        const [recentInteractions] = await connInteraction.execute<RowDataPacket[]>(
          `SELECT DISTINCT student_membership_id
           FROM (
             SELECT student_membership_id FROM workout_assignments
             WHERE consultancy_id = ? AND assigned_by_membership_id = ? AND updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
               AND student_membership_id IN (${placeholders})
             UNION
             SELECT student_membership_id FROM nutrition_v2_assignments
             WHERE consultancy_id = ? AND assigned_by_membership_id = ? AND updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
               AND student_membership_id IN (${placeholders})
             UNION
             SELECT student_membership_id FROM student_photo_evaluation_requests
             WHERE consultancy_id = ? AND reviewed_by_membership_id = ? AND reviewed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
               AND student_membership_id IN (${placeholders})
           ) active_students;`,
          [
            consultancyId, profMemberId, ...assignedStudentIds,
            consultancyId, profMemberId, ...assignedStudentIds,
            consultancyId, profMemberId, ...assignedStudentIds,
          ]
        );
        const interactedStudentCount = recentInteractions.length;
        studentsWithoutRecentInteractionCount = Math.max(0, assignedStudentIds.length - interactedStudentCount);
      }
    } finally {
      connInteraction.release();
    }

    // 4. Professional's last active in TREVO ONE
    const lastActiveAt = await getMemberLastActive(consultancyId, profMemberId);

    // 5. Active admin escalations
    const actions = await getProfessionalActionsHistory(consultancyId, profMemberId);
    const activeEscalation = actions.find((a) => a.status === "ACTIVE") || null;

    // 6. Compute state & reasons
    const reasons: string[] = [];
    let status: ProfessionalRadarStatus = "EM_DIA";

    if (criticalAlertsCount > 0) {
      status = "CRITICO";
      reasons.push(`${criticalAlertsCount} alerta(s) crítico(s) sem tratamento nos alunos atribuídos`);
    } else if (studentsCriticalCount > 0) {
      status = "CRITICO";
      reasons.push(`${studentsCriticalCount} aluno(s) em estado crítico`);
    }

    if (studentsWithoutRecentInteractionCount > 0) {
      if (status !== "CRITICO") status = "ATENCAO";
      reasons.push(`${studentsWithoutRecentInteractionCount} aluno(s) sem acompanhamento registrado no TREVO ONE há mais de 7 dias`);
    }

    if (studentsAttentionCount > 0 && status === "EM_DIA") {
      status = "ATENCAO";
      reasons.push(`${studentsAttentionCount} aluno(s) demandando atenção`);
    }

    if (reasons.length === 0) {
      reasons.push("Todos os alunos acompanhados e sem alertas pendentes");
    }

    const statusLabels: Record<ProfessionalRadarStatus, string> = {
      EM_DIA: "Em dia",
      ATENCAO: "Atenção",
      CRITICO: "Crítico",
    };

    items.push({
      professionalMemberId: profMemberId,
      userPublicId: prof.user_public_id,
      name: prof.full_name,
      role: prof.role,
      status,
      statusLabel: statusLabels[status],
      activeStudentsAssigned: assignedStudentIds.length,
      studentsOkCount,
      studentsAttentionCount,
      studentsCriticalCount,
      openAlertsCount,
      criticalAlertsCount,
      studentsWithoutRecentInteractionCount,
      lastActiveAt,
      reasons,
      activeEscalation,
    });
  }

  const inGoodStandingCount = items.filter((i) => i.status === "EM_DIA").length;
  const needingAttentionCount = items.filter((i) => i.status === "ATENCAO").length;
  const criticalCount = items.filter((i) => i.status === "CRITICO").length;
  const totalOpenAlerts = items.reduce((acc, i) => acc + i.openAlertsCount, 0);

  return {
    professionals: items,
    kpis: {
      totalProfessionals: items.length,
      inGoodStandingCount,
      needingAttentionCount,
      criticalCount,
      totalOpenAlerts,
    },
  };
}

export async function getAssignedStudentsForProfessional(
  consultancyId: number,
  professionalMemberId: number
): Promise<StudentEvaluationResult[]> {
  const connection = await getDbConnection();
  let assignedStudentIds: number[] = [];
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT DISTINCT student_membership_id
       FROM (
         SELECT student_membership_id FROM workout_assignments
         WHERE consultancy_id = ? AND assigned_by_membership_id = ? AND status = 'ACTIVE' AND deleted_at IS NULL
         UNION
         SELECT student_membership_id FROM nutrition_v2_assignments
         WHERE consultancy_id = ? AND assigned_by_membership_id = ? AND status = 'ACTIVE'
       ) t;`,
      [consultancyId, professionalMemberId, consultancyId, professionalMemberId]
    );
    assignedStudentIds = rows.map((r) => Number(r.student_membership_id));
  } finally {
    connection.release();
  }

  const results: StudentEvaluationResult[] = [];
  for (const sId of assignedStudentIds) {
    try {
      const res = await evaluateStudentMonitoring(consultancyId, sId);
      results.push(res);
    } catch {
      // Continue
    }
  }

  return results;
}
