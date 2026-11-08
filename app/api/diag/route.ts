import { NextResponse } from "next/server";
import { execSync } from "node:child_process";
import { getDbConnection } from "@/lib/db/mysql";
import type { RowDataPacket } from "mysql2/promise";

export const dynamic = "force-dynamic";

export async function GET() {
  let commit = "unknown";
  let branch = "unknown";
  try {
    commit = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
    branch = execSync("git branch --show-current", { encoding: "utf8" }).trim();
  } catch {
    commit = process.env.GIT_COMMIT_SHA || process.env.DEPLOYMENT_ID || "unknown";
  }

  const dbHost = process.env.DB_HOST || "not set";
  const dbName = process.env.DB_NAME || "not set";

  let auditStats: unknown = null;
  try {
    const conn = await getDbConnection();
    try {
      const [consultancies] = await conn.execute<RowDataPacket[]>(
        `SELECT id, slug, name, status FROM consultancies WHERE status = 'ACTIVE';`
      );

      const stats = [];
      for (const c of consultancies) {
        // 1. Total alunos ativos elegíveis
        const [studentRows] = await conn.execute<RowDataPacket[]>(
          `SELECT COUNT(DISTINCT cm.id) AS total_students
           FROM consultancy_members cm
           INNER JOIN users u ON u.id = cm.user_id
           INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id AND cmr.role = 'STUDENT'
           WHERE cm.consultancy_id = ? AND cm.status = 'ACTIVE' AND u.deleted_at IS NULL;`,
          [c.id]
        );

        // 2. Prescrições ativas
        const [activeWaRows] = await conn.execute<RowDataPacket[]>(
          `SELECT 
             COUNT(DISTINCT wa.id) AS active_assignments_count,
             COUNT(DISTINCT wa.student_membership_id) AS students_with_active_wa,
             COUNT(DISTINCT CASE WHEN wa.ends_on IS NOT NULL AND wa.ends_on < CURRENT_DATE() THEN wa.id END) AS expired_assignments_count
           FROM workout_assignments wa
           WHERE wa.consultancy_id = ? AND wa.status = 'ACTIVE' AND wa.deleted_at IS NULL;`,
          [c.id]
        );

        // 3. Prescrições encerradas
        const [endedWaRows] = await conn.execute<RowDataPacket[]>(
          `SELECT COUNT(DISTINCT wa.id) AS ended_assignments_count
           FROM workout_assignments wa
           WHERE wa.consultancy_id = ? AND wa.status = 'ENDED' AND wa.deleted_at IS NULL;`,
          [c.id]
        );

        // 4. Treinos e versões
        const [workoutRows] = await conn.execute<RowDataPacket[]>(
          `SELECT 
             COUNT(DISTINCT w.id) AS total_workouts,
             COUNT(DISTINCT CASE WHEN w.is_template = 1 THEN w.id END) AS template_workouts,
             COUNT(DISTINCT CASE WHEN w.is_template = 0 THEN w.id END) AS routine_workouts,
             COUNT(DISTINCT CASE WHEN EXISTS (SELECT 1 FROM workout_versions wv WHERE wv.workout_id = w.id AND wv.status = 'PUBLISHED') THEN w.id END) AS published_workouts,
             COUNT(DISTINCT CASE WHEN NOT EXISTS (
               SELECT 1 FROM workout_assignments wa 
               INNER JOIN workout_versions wv ON wv.id = wa.workout_version_id 
               WHERE wv.workout_id = w.id AND wa.deleted_at IS NULL
             ) AND w.is_template = 0 THEN w.id END) AS unassigned_workouts
           FROM workouts w
           WHERE w.consultancy_id = ? AND w.deleted_at IS NULL;`,
          [c.id]
        );

        stats.push({
          consultancyId: c.id,
          consultancySlug: c.slug,
          consultancyName: c.name,
          totalEligibleStudents: Number(studentRows[0]?.total_students || 0),
          activeAssignmentsCount: Number(activeWaRows[0]?.active_assignments_count || 0),
          studentsWithActivePrescription: Number(activeWaRows[0]?.students_with_active_wa || 0),
          expiredAssignmentsCount: Number(activeWaRows[0]?.expired_assignments_count || 0),
          endedAssignmentsCount: Number(endedWaRows[0]?.ended_assignments_count || 0),
          totalWorkouts: Number(workoutRows[0]?.total_workouts || 0),
          templateWorkouts: Number(workoutRows[0]?.template_workouts || 0),
          routineWorkouts: Number(workoutRows[0]?.routine_workouts || 0),
          publishedWorkouts: Number(workoutRows[0]?.published_workouts || 0),
          unassignedWorkouts: Number(workoutRows[0]?.unassigned_workouts || 0),
        });
      }

      auditStats = stats;
    } finally {
      conn.release();
    }
  } catch (err: unknown) {
    auditStats = { error: err instanceof Error ? err.message : String(err) };
  }

  return NextResponse.json({
    activeCommit: commit,
    activeBranch: branch,
    databaseHost: dbHost,
    databaseName: dbName,
    nodeEnv: process.env.NODE_ENV,
    serverTimestamp: new Date().toISOString(),
    auditStats,
  });
}
