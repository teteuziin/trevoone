import crypto from "node:crypto";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { getDbConnection } from "@/lib/db/mysql";

export type MonitoringSeverity = "LOW" | "ATTENTION" | "CRITICAL";
export type MonitoringStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
export type StudentRadarState = "OK" | "ATTENTION" | "CRITICAL";

export interface MonitoringAlert {
  id: number;
  publicId: string;
  consultancyId: number;
  subjectMemberId: number;
  subjectType: "STUDENT" | "PROFESSIONAL";
  alertType: string;
  severity: MonitoringSeverity;
  fingerprint: string;
  status: MonitoringStatus;
  firstDetectedAt: Date;
  lastDetectedAt: Date;
  acknowledgedAt: Date | null;
  resolvedAt: Date | null;
  evidence: Record<string, unknown>;
  statement: string;
}

export interface StudentEvaluationResult {
  studentMemberId: number;
  studentName: string;
  userPublicId: string;
  state: StudentRadarState;
  reasons: string[];
  alerts: MonitoringAlert[];
  metrics: {
    completedWorkoutsLast7d: number;
    lastWorkoutDate: string | null;
    recentCheckinsCount: number;
    painReportedCount: number;
    offPlanDietCount: number;
    lastActiveAt: Date | null;
  };
}

export async function evaluateStudentMonitoring(
  consultancyId: number,
  studentMemberId: number
): Promise<StudentEvaluationResult> {
  const connection = await getDbConnection();
  try {
    // 1. Fetch student info
    const [studentRows] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id AS member_id, cm.user_id, cm.status, cm.joined_at, cm.created_at,
              u.public_id AS user_public_id, u.full_name
       FROM consultancy_members cm
       JOIN users u ON u.id = cm.user_id
       JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.id = ? AND cm.consultancy_id = ? AND cm.status = 'ACTIVE' AND cmr.role = 'STUDENT'
       LIMIT 1;`,
      [studentMemberId, consultancyId]
    );

    if (!Array.isArray(studentRows) || studentRows.length === 0) {
      throw new Error("Aluno não encontrado ou inativo nesta consultoria.");
    }
    const student = studentRows[0];

    // 2. Fetch completed workout execution sessions in last 14 days
    const [workoutRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total_completed_14d,
              SUM(CASE WHEN completed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS total_completed_7d,
              MAX(completed_at) AS last_completed_at
       FROM workout_execution_sessions
       WHERE consultancy_id = ? AND student_membership_id = ? AND status = 'COMPLETED'
         AND completed_at >= DATE_SUB(NOW(), INTERVAL 14 DAY);`,
      [consultancyId, studentMemberId]
    );
    const completedWorkoutsLast7d = Number(workoutRows[0]?.total_completed_7d || 0);
    const lastWorkoutDate = workoutRows[0]?.last_completed_at
      ? new Date(workoutRows[0].last_completed_at).toISOString().split("T")[0]
      : null;

    // Check if student has an active workout assignment
    const [assignmentRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS has_assignment FROM workout_assignments
       WHERE consultancy_id = ? AND student_membership_id = ? AND status = 'ACTIVE' AND deleted_at IS NULL;`,
      [consultancyId, studentMemberId]
    );
    const hasActiveAssignment = Number(assignmentRows[0]?.has_assignment || 0) > 0;

    // 3. Fetch check-ins from last 7 days
    const [checkinRows] = await connection.execute<RowDataPacket[]>(
      `SELECT DATE_FORMAT(checkin_date, '%Y-%m-%d') AS checkin_date,
              training_status, diet_status, energy_level, difficulty_level, has_pain
       FROM daily_student_checkins
       WHERE consultancy_id = ? AND student_member_id = ?
         AND checkin_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
       ORDER BY checkin_date DESC;`,
      [consultancyId, studentMemberId]
    );

    const recentCheckins = Array.isArray(checkinRows) ? checkinRows : [];
    const recentCheckinsCount = recentCheckins.length;
    const painReportedCount = recentCheckins.filter((c) => Boolean(c.has_pain)).length;
    const offPlanDietCount = recentCheckins.filter((c) => c.diet_status === "OFF_PLAN").length;

    // 4. Fetch last active timestamp
    const [actRows] = await connection.execute<RowDataPacket[]>(
      `SELECT last_active_at FROM member_activity_tracking
       WHERE consultancy_id = ? AND member_id = ? LIMIT 1;`,
      [consultancyId, studentMemberId]
    );
    const lastActiveAt = actRows[0]?.last_active_at ? new Date(actRows[0].last_active_at) : null;

    // 5. Evaluate deterministic signals
    interface SignalCandidate {
      alertType: string;
      severity: MonitoringSeverity;
      fingerprint: string;
      statement: string;
      evidence: Record<string, unknown>;
    }
    const triggeredSignals: SignalCandidate[] = [];

    // CRITICAL: Pain reported in check-ins (within last 3 days)
    const recentPainCheckins = recentCheckins.slice(0, 3).filter((c) => Boolean(c.has_pain));
    if (recentPainCheckins.length > 0) {
      triggeredSignals.push({
        alertType: "PAIN_REPORTED",
        severity: "CRITICAL",
        fingerprint: `student:${studentMemberId}:pain_reported`,
        statement: "Aluno relatou dor/desconforto em check-in recente no TREVO ONE.",
        evidence: {
          painDates: recentPainCheckins.map((c) => c.checkin_date),
          count: recentPainCheckins.length,
          reportedBy: "Estudante (auto-relatado)",
        },
      });
    }

    // CRITICAL: Persistent high difficulty (>= 3 out of last 5 check-ins)
    const last5Checkins = recentCheckins.slice(0, 5);
    const highDiffLast5 = last5Checkins.filter((c) => c.difficulty_level === "HIGH").length;
    if (last5Checkins.length >= 3 && highDiffLast5 >= 3) {
      triggeredSignals.push({
        alertType: "PERSISTENT_HIGH_DIFFICULTY",
        severity: "CRITICAL",
        fingerprint: `student:${studentMemberId}:persistent_high_difficulty`,
        statement: `Aluno informou dificuldade alta em ${highDiffLast5} dos últimos ${last5Checkins.length} check-ins.`,
        evidence: {
          highDifficultyCount: highDiffLast5,
          sampleSize: last5Checkins.length,
        },
      });
    }

    // CRITICAL: Prolonged inactivity (> 7 days without workout and without check-in)
    const daysSinceLastWorkout = lastWorkoutDate
      ? Math.floor((Date.now() - new Date(lastWorkoutDate).getTime()) / (1000 * 60 * 60 * 24))
      : 14;
    const daysSinceLastCheckin = recentCheckins.length > 0
      ? Math.floor((Date.now() - new Date(recentCheckins[0].checkin_date).getTime()) / (1000 * 60 * 60 * 24))
      : 14;

    if (hasActiveAssignment && daysSinceLastWorkout >= 7 && daysSinceLastCheckin >= 7) {
      triggeredSignals.push({
        alertType: "PROLONGED_INACTIVITY",
        severity: "CRITICAL",
        fingerprint: `student:${studentMemberId}:prolonged_inactivity`,
        statement: "Nenhuma sessão de treino ou check-in registrado no TREVO ONE nos últimos 7 dias.",
        evidence: {
          daysSinceLastWorkout,
          daysSinceLastCheckin,
          lastWorkoutDate,
        },
      });
    }

    // ATTENTION: Low workout adherence (0 completed in last 5 days with active assignment)
    if (hasActiveAssignment && daysSinceLastWorkout >= 5 && !(daysSinceLastWorkout >= 7 && daysSinceLastCheckin >= 7)) {
      triggeredSignals.push({
        alertType: "LOW_WORKOUT_ADHERENCE",
        severity: "ATTENTION",
        fingerprint: `student:${studentMemberId}:low_workout_adherence`,
        statement: "Nenhuma sessão de treino foi concluída no TREVO ONE nos últimos 5 dias.",
        evidence: {
          daysSinceLastWorkout,
          lastWorkoutDate,
        },
      });
    }

    // ATTENTION: Frequent off-plan diet (>= 3 out of last 5 check-ins)
    const offPlanLast5 = last5Checkins.filter((c) => c.diet_status === "OFF_PLAN").length;
    if (last5Checkins.length >= 3 && offPlanLast5 >= 3) {
      triggeredSignals.push({
        alertType: "NUTRITION_OFF_PLAN",
        severity: "ATTENTION",
        fingerprint: `student:${studentMemberId}:nutrition_off_plan`,
        statement: `Aluno informou 'SAÍ DO PLANO' em ${offPlanLast5} dos últimos ${last5Checkins.length} check-ins.`,
        evidence: {
          offPlanCount: offPlanLast5,
          sampleSize: last5Checkins.length,
          reportedBy: "Estudante (auto-relatado)",
        },
      });
    }

    // ATTENTION: Missing daily check-ins (no check-in in last 4 days)
    if (daysSinceLastCheckin >= 4 && daysSinceLastCheckin < 7) {
      triggeredSignals.push({
        alertType: "MISSING_CHECKINS",
        severity: "ATTENTION",
        fingerprint: `student:${studentMemberId}:missing_checkins`,
        statement: "Nenhum check-in diário foi registrado pelo aluno nos últimos 4 dias.",
        evidence: {
          daysSinceLastCheckin,
        },
      });
    }

    // 6. Idempotent upsert of triggered alerts
    const activeFingerprints = new Set(triggeredSignals.map((s) => s.fingerprint));

    for (const signal of triggeredSignals) {
      const publicId = crypto.randomUUID();
      const evidencePayload = JSON.stringify({
        statement: signal.statement,
        ...signal.evidence,
      });

      await connection.execute(
        `INSERT INTO monitoring_alerts (
           public_id, consultancy_id, subject_member_id, subject_type, alert_type,
           severity, fingerprint, status, first_detected_at, last_detected_at, evidence_json
         ) VALUES (?, ?, ?, 'STUDENT', ?, ?, ?, 'OPEN', UTC_TIMESTAMP(3), UTC_TIMESTAMP(3), ?)
         ON DUPLICATE KEY UPDATE
           last_detected_at = UTC_TIMESTAMP(3),
           evidence_json = VALUES(evidence_json),
           status = IF(status = 'RESOLVED', 'OPEN', status),
           updated_at = UTC_TIMESTAMP(3);`,
        [
          publicId,
          consultancyId,
          studentMemberId,
          signal.alertType,
          signal.severity,
          signal.fingerprint,
          evidencePayload,
        ]
      );
    }

    // 7. Auto-resolve alerts whose condition is no longer detected
    if (activeFingerprints.size === 0) {
      await connection.execute(
        `UPDATE monitoring_alerts
         SET status = 'RESOLVED',
             resolved_at = UTC_TIMESTAMP(3),
             updated_at = UTC_TIMESTAMP(3)
         WHERE consultancy_id = ? AND subject_member_id = ? AND subject_type = 'STUDENT'
           AND status IN ('OPEN', 'ACKNOWLEDGED');`,
        [consultancyId, studentMemberId]
      );
    } else {
      const placeholders = Array.from(activeFingerprints).map(() => "?").join(", ");
      await connection.execute(
        `UPDATE monitoring_alerts
         SET status = 'RESOLVED',
             resolved_at = UTC_TIMESTAMP(3),
             updated_at = UTC_TIMESTAMP(3)
         WHERE consultancy_id = ? AND subject_member_id = ? AND subject_type = 'STUDENT'
           AND status IN ('OPEN', 'ACKNOWLEDGED')
           AND fingerprint NOT IN (${placeholders});`,
        [consultancyId, studentMemberId, ...Array.from(activeFingerprints)]
      );
    }

    // 8. Fetch all currently active alerts for this student
    const [currentAlertRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, consultancy_id, subject_member_id, subject_type, alert_type,
              severity, fingerprint, status, first_detected_at, last_detected_at,
              acknowledged_at, resolved_at, evidence_json
       FROM monitoring_alerts
       WHERE consultancy_id = ? AND subject_member_id = ? AND status IN ('OPEN', 'ACKNOWLEDGED')
       ORDER BY FIELD(severity, 'CRITICAL', 'ATTENTION', 'LOW'), last_detected_at DESC;`,
      [consultancyId, studentMemberId]
    );

    const activeAlerts: MonitoringAlert[] = currentAlertRows.map((r) => {
      let ev: Record<string, unknown> = {};
      try {
        ev = typeof r.evidence_json === "string" ? JSON.parse(r.evidence_json) : r.evidence_json;
      } catch {
        ev = {};
      }
      return {
        id: Number(r.id),
        publicId: r.public_id,
        consultancyId: Number(r.consultancy_id),
        subjectMemberId: Number(r.subject_member_id),
        subjectType: r.subject_type,
        alertType: r.alert_type,
        severity: r.severity as MonitoringSeverity,
        fingerprint: r.fingerprint,
        status: r.status as MonitoringStatus,
        firstDetectedAt: new Date(r.first_detected_at),
        lastDetectedAt: new Date(r.last_detected_at),
        acknowledgedAt: r.acknowledged_at ? new Date(r.acknowledged_at) : null,
        resolvedAt: r.resolved_at ? new Date(r.resolved_at) : null,
        evidence: ev,
        statement: (ev.statement as string) || "Alerta de acompanhamento registrado.",
      };
    });

    // 9. Compute overall state
    let state: StudentRadarState = "OK";
    if (activeAlerts.some((a) => a.severity === "CRITICAL")) {
      state = "CRITICAL";
    } else if (activeAlerts.some((a) => a.severity === "ATTENTION")) {
      state = "ATTENTION";
    }

    const reasons = activeAlerts.map((a) => a.statement);

    return {
      studentMemberId,
      studentName: student.full_name,
      userPublicId: student.user_public_id,
      state,
      reasons,
      alerts: activeAlerts,
      metrics: {
        completedWorkoutsLast7d,
        lastWorkoutDate,
        recentCheckinsCount,
        painReportedCount,
        offPlanDietCount,
        lastActiveAt,
      },
    };
  } finally {
    connection.release();
  }
}

export async function evaluateConsultancyStudents(
  consultancyId: number
): Promise<{
  totalStudents: number;
  studentsOk: number;
  studentsAttention: number;
  studentsCritical: number;
  criticalAlertsCount: number;
  openAlertsCount: number;
  students: StudentEvaluationResult[];
}> {
  const connection = await getDbConnection();
  let studentIds: number[] = [];
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id
       FROM consultancy_members cm
       JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.consultancy_id = ? AND cm.status = 'ACTIVE' AND cmr.role = 'STUDENT'
       ORDER BY cm.id ASC;`,
      [consultancyId]
    );
    studentIds = rows.map((r) => Number(r.id));
  } finally {
    connection.release();
  }

  const results: StudentEvaluationResult[] = [];
  for (const id of studentIds) {
    try {
      const res = await evaluateStudentMonitoring(consultancyId, id);
      results.push(res);
    } catch {
      // Continue next student
    }
  }

  const studentsOk = results.filter((r) => r.state === "OK").length;
  const studentsAttention = results.filter((r) => r.state === "ATTENTION").length;
  const studentsCritical = results.filter((r) => r.state === "CRITICAL").length;

  let openAlertsCount = 0;
  let criticalAlertsCount = 0;
  for (const r of results) {
    for (const a of r.alerts) {
      if (a.status === "OPEN" || a.status === "ACKNOWLEDGED") {
        openAlertsCount++;
        if (a.severity === "CRITICAL") criticalAlertsCount++;
      }
    }
  }

  return {
    totalStudents: results.length,
    studentsOk,
    studentsAttention,
    studentsCritical,
    criticalAlertsCount,
    openAlertsCount,
    students: results,
  };
}

export async function acknowledgeAlert(
  consultancyId: number,
  alertId: number,
  adminMemberId: number
): Promise<{ success: boolean; error?: string }> {
  const connection = await getDbConnection();
  try {
    const [result] = await connection.execute<ResultSetHeader>(
      `UPDATE monitoring_alerts
       SET status = 'ACKNOWLEDGED',
           acknowledged_at = UTC_TIMESTAMP(3),
           acknowledged_by_member_id = ?,
           updated_at = UTC_TIMESTAMP(3)
       WHERE id = ? AND consultancy_id = ?;`,
      [adminMemberId, alertId, consultancyId]
    );

    if (result.affectedRows === 0) {
      return { success: false, error: "Alerta não encontrado ou não pertence a esta consultoria." };
    }
    return { success: true };
  } finally {
    connection.release();
  }
}

export async function resolveAlert(
  consultancyId: number,
  alertId: number,
  adminMemberId: number
): Promise<{ success: boolean; error?: string }> {
  const connection = await getDbConnection();
  try {
    const [result] = await connection.execute<ResultSetHeader>(
      `UPDATE monitoring_alerts
       SET status = 'RESOLVED',
           resolved_at = UTC_TIMESTAMP(3),
           resolved_by_member_id = ?,
           updated_at = UTC_TIMESTAMP(3)
       WHERE id = ? AND consultancy_id = ?;`,
      [adminMemberId, alertId, consultancyId]
    );

    if (result.affectedRows === 0) {
      return { success: false, error: "Alerta não encontrado ou não pertence a esta consultoria." };
    }
    return { success: true };
  } finally {
    connection.release();
  }
}
