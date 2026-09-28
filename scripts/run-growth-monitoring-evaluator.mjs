import mysql from "mysql2/promise";
import crypto from "node:crypto";

/**
 * TREVO ONE — GROWTH & ADHERENCE MONITORING EVALUATOR RUNNER
 * Standalone, idempotent, bounded-batch runner for scheduled background monitoring.
 * Suitable for execution via Hostinger Cron or system scheduler.
 * Zero browser dependency, zero exposed secrets.
 */

async function main() {
  const startTime = Date.now();
  console.log("[GrowthMonitoringEvaluator] Starting background adherence evaluation...");

  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;

  if (!DB_HOST || !DB_NAME || !DB_USER || DB_PASSWORD === undefined) {
    console.error("[GrowthMonitoringEvaluator] Error: Missing database environment variables.");
    process.exit(1);
  }

  const port = Number(DB_PORT) || 3306;
  const pool = mysql.createPool({
    host: DB_HOST,
    port,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    enableKeepAlive: true,
  });

  let totalConsultancies = 0;
  let totalStudents = 0;
  let totalAlertsEvaluated = 0;
  let totalErrors = 0;

  try {
    // 1. Fetch active consultancies in bounded batch
    const [consultancies] = await pool.query(
      `SELECT id, slug, name FROM consultancies
       WHERE status = 'ACTIVE' AND deleted_at IS NULL
       ORDER BY id ASC
       LIMIT 100;`
    );

    totalConsultancies = consultancies.length;
    console.log(`[GrowthMonitoringEvaluator] Found ${totalConsultancies} active consultanc(ies) to evaluate.`);

    for (const c of consultancies) {
      const consultancyId = Number(c.id);

      // 2. Fetch active students in bounded batch
      const [students] = await pool.query(
        `SELECT cm.id AS member_id, cm.user_id, u.full_name
         FROM consultancy_members cm
         JOIN users u ON u.id = cm.user_id
         JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
         WHERE cm.consultancy_id = ? AND cm.status = 'ACTIVE' AND cmr.role = 'STUDENT'
         ORDER BY cm.id ASC
         LIMIT 200;`,
        [consultancyId]
      );

      for (const s of students) {
        totalStudents++;
        const studentMemberId = Number(s.member_id);

        try {
          // A. Workout execution activity (last 14 days)
          const [workoutRows] = await pool.query(
            `SELECT COUNT(*) AS total_completed_14d,
                    SUM(CASE WHEN completed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS total_completed_7d,
                    MAX(completed_at) AS last_completed_at
             FROM workout_execution_sessions
             WHERE consultancy_id = ? AND student_membership_id = ? AND status = 'COMPLETED'
               AND completed_at >= DATE_SUB(NOW(), INTERVAL 14 DAY);`,
            [consultancyId, studentMemberId]
          );

          const lastWorkoutDate = workoutRows[0]?.last_completed_at
            ? new Date(workoutRows[0].last_completed_at).toISOString().split("T")[0]
            : null;

          // Check active assignment
          const [assignRows] = await pool.query(
            `SELECT COUNT(*) AS has_assignment FROM workout_assignments
             WHERE consultancy_id = ? AND student_membership_id = ? AND status = 'ACTIVE' AND deleted_at IS NULL;`,
            [consultancyId, studentMemberId]
          );
          const hasActiveAssignment = Number(assignRows[0]?.has_assignment || 0) > 0;

          // B. Daily Check-ins (last 7 days)
          const [checkinRows] = await pool.query(
            `SELECT DATE_FORMAT(checkin_date, '%Y-%m-%d') AS checkin_date,
                    training_status, diet_status, energy_level, difficulty_level, has_pain
             FROM daily_student_checkins
             WHERE consultancy_id = ? AND student_member_id = ?
               AND checkin_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
             ORDER BY checkin_date DESC;`,
            [consultancyId, studentMemberId]
          );

          const checkins = Array.isArray(checkinRows) ? checkinRows : [];
          const daysSinceLastWorkout = lastWorkoutDate
            ? Math.floor((Date.now() - new Date(lastWorkoutDate).getTime()) / (1000 * 60 * 60 * 24))
            : 14;
          const daysSinceLastCheckin = checkins.length > 0
            ? Math.floor((Date.now() - new Date(checkins[0].checkin_date).getTime()) / (1000 * 60 * 60 * 24))
            : 14;

          // C. Evaluate signals
          const signals = [];

          // 1. Pain reported in recent check-ins
          const recentPain = checkins.slice(0, 3).filter((ch) => Boolean(ch.has_pain));
          if (recentPain.length > 0) {
            signals.push({
              alertType: "PAIN_REPORTED",
              severity: "CRITICAL",
              fingerprint: `student:${studentMemberId}:pain_reported`,
              statement: "Aluno relatou dor/desconforto em check-in recente no TREVO ONE.",
              evidence: { count: recentPain.length, reportedBy: "Estudante (auto-relatado)" },
            });
          }

          // 2. Persistent high difficulty
          const last5 = checkins.slice(0, 5);
          const highDiff = last5.filter((ch) => ch.difficulty_level === "HIGH").length;
          if (last5.length >= 3 && highDiff >= 3) {
            signals.push({
              alertType: "PERSISTENT_HIGH_DIFFICULTY",
              severity: "CRITICAL",
              fingerprint: `student:${studentMemberId}:persistent_high_difficulty`,
              statement: `Aluno informou dificuldade alta em ${highDiff} dos últimos ${last5.length} check-ins.`,
              evidence: { highDifficultyCount: highDiff, sampleSize: last5.length },
            });
          }

          // 3. Prolonged inactivity (> 7 days)
          if (hasActiveAssignment && daysSinceLastWorkout >= 7 && daysSinceLastCheckin >= 7) {
            signals.push({
              alertType: "PROLONGED_INACTIVITY",
              severity: "CRITICAL",
              fingerprint: `student:${studentMemberId}:prolonged_inactivity`,
              statement: "Nenhuma sessão de treino ou check-in registrado no TREVO ONE nos últimos 7 dias.",
              evidence: { daysSinceLastWorkout, daysSinceLastCheckin },
            });
          } else if (hasActiveAssignment && daysSinceLastWorkout >= 5 && daysSinceLastWorkout < 7) {
            // 4. Low adherence (5 to 6 days)
            signals.push({
              alertType: "LOW_WORKOUT_ADHERENCE",
              severity: "ATTENTION",
              fingerprint: `student:${studentMemberId}:low_workout_adherence`,
              statement: "Nenhuma sessão de treino foi concluída no TREVO ONE nos últimos 5 dias.",
              evidence: { daysSinceLastWorkout },
            });
          }

          // 5. Nutrition off plan
          const offPlan = last5.filter((ch) => ch.diet_status === "OFF_PLAN").length;
          if (last5.length >= 3 && offPlan >= 3) {
            signals.push({
              alertType: "NUTRITION_OFF_PLAN",
              severity: "ATTENTION",
              fingerprint: `student:${studentMemberId}:nutrition_off_plan`,
              statement: `Aluno informou 'SAÍ DO PLANO' em ${offPlan} dos últimos ${last5.length} check-ins.`,
              evidence: { offPlanCount: offPlan, sampleSize: last5.length, reportedBy: "Estudante (auto-relatado)" },
            });
          }

          // D. Idempotently upsert signals
          const activeFingerprints = new Set(signals.map((s) => s.fingerprint));

          for (const sig of signals) {
            totalAlertsEvaluated++;
            const publicId = crypto.randomUUID();
            const evidenceJson = JSON.stringify({ statement: sig.statement, ...sig.evidence });

            await pool.query(
              `INSERT INTO monitoring_alerts (
                 public_id, consultancy_id, subject_member_id, subject_type, alert_type,
                 severity, fingerprint, status, first_detected_at, last_detected_at, evidence_json
               ) VALUES (?, ?, ?, 'STUDENT', ?, ?, ?, 'OPEN', UTC_TIMESTAMP(3), UTC_TIMESTAMP(3), ?)
               ON DUPLICATE KEY UPDATE
                 last_detected_at = UTC_TIMESTAMP(3),
                 evidence_json = VALUES(evidence_json),
                 status = IF(status = 'RESOLVED', 'OPEN', status),
                 updated_at = UTC_TIMESTAMP(3);`,
              [publicId, consultancyId, studentMemberId, sig.alertType, sig.severity, sig.fingerprint, evidenceJson]
            );
          }

          // E. Auto-resolve alerts no longer triggered
          const [currentOpen] = await pool.query(
            `SELECT id, fingerprint FROM monitoring_alerts
             WHERE consultancy_id = ? AND subject_member_id = ? AND subject_type = 'STUDENT'
               AND status = 'OPEN';`,
            [consultancyId, studentMemberId]
          );

          for (const al of currentOpen) {
            if (!activeFingerprints.has(al.fingerprint)) {
              await pool.query(
                `UPDATE monitoring_alerts
                 SET status = 'RESOLVED', resolved_at = UTC_TIMESTAMP(3), updated_at = UTC_TIMESTAMP(3)
                 WHERE id = ?;`,
                [al.id]
              );
            }
          }
        } catch (studentErr) {
          totalErrors++;
          console.warn(`[GrowthMonitoringEvaluator] Error evaluating student ${studentMemberId}:`, studentErr?.message || studentErr);
        }
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[GrowthMonitoringEvaluator] Finished in ${elapsed}ms. Consultancies: ${totalConsultancies}, Students: ${totalStudents}, Alerts evaluated: ${totalAlertsEvaluated}, Errors: ${totalErrors}.`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[GrowthMonitoringEvaluator] Fatal error:", err?.message || err);
  process.exit(1);
});
