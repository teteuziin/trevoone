/**
 * TREVO ONE — AUTHORITATIVE TRAINING METRICS SERVICE
 * 
 * Fonte ÚNICA e canônica de verdade para métricas de treinamento:
 * - Situação dos treinos (Início / Dashboard)
 * - Indicadores operacionais do Personal e Administrador
 * - Central de Alunos e filtros de prescrição ativa
 * 
 * Regra de Ouro:
 * Uma prescrição ativa exige:
 * 1. Associação com aluno elegível ativo (consultancy_members status = 'ACTIVE' e role = 'STUDENT')
 * 2. Vínculo ativo em workout_assignments (status = 'ACTIVE' e deleted_at IS NULL)
 * 3. Título de ficha válido (custom_title, wv.title ou w.title)
 * 4. Validade temporal (se ends_on for preenchido, verificar data)
 * 
 * Rascunhos, modelos desvinculados e fichas publicadas sem aluno atribuído
 * JAMAIS representam prescrições ativas de alunos.
 */

import { getDbConnection } from "@/lib/db/mysql";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";

export interface AuthoritativeTrainingMetrics {
  totalStudents: number;
  comTreinoCount: number;
  semTreinoCount: number;
  vencidosCount: number;
  aVencerCount: number;
  emDiaCount: number;
  emDiaPercent: number;
  studentsWithoutWorkout: {
    membershipPublicId: string;
    userPublicId: string;
    name: string;
    email: string;
    joinedAt: string;
  }[];
  loadStatus: "SUCCESS" | "ERROR";
  errorMessage?: string;
}

function formatDateYmd(val: unknown): string {
  if (!val) return "";
  if (typeof val === "string") return val.slice(0, 10);
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  return String(val).slice(0, 10);
}

/**
 * Consulta autoritativa e centralizada das métricas de treino de uma consultoria.
 * Nunca mascara falhas de banco com contagens falsas.
 */
export async function getAuthoritativeTrainingMetrics(
  consultancyId: number,
  todayDateStr = new Date().toISOString().slice(0, 10)
): Promise<AuthoritativeTrainingMetrics> {
  let connection: PoolConnection | null = null;
  try {
    connection = await getDbConnection();

    // Query estrita e isolada: busca todos os membros STUDENT ativos da consultoria
    // e resolve autoritativamente a prescrição mais recente de cada um.
    const sql = `
      SELECT
        cm.id AS membership_id,
        cm.public_id AS membership_public_id,
        u.public_id AS user_public_id,
        u.full_name,
        u.email,
        cm.created_at AS joined_at,
        active_wa.id AS assignment_id,
        active_wa.status AS assignment_status,
        active_wa.starts_on AS assignment_starts_on,
        active_wa.ends_on AS assignment_ends_on,
        COALESCE(NULLIF(TRIM(active_wa.custom_title), ''), wv.title, w.title) AS workout_title
      FROM consultancy_members cm
      INNER JOIN users u ON u.id = cm.user_id
      INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id AND cmr.role = 'STUDENT'
      LEFT JOIN (
        SELECT
          wa_inner.id,
          wa_inner.student_membership_id,
          wa_inner.workout_version_id,
          wa_inner.custom_title,
          wa_inner.status,
          wa_inner.starts_on,
          wa_inner.ends_on
        FROM (
          SELECT
            wa_sub.*,
            ROW_NUMBER() OVER (
              PARTITION BY wa_sub.student_membership_id
              ORDER BY
                (wa_sub.status = 'ACTIVE' AND wa_sub.deleted_at IS NULL AND (wa_sub.ends_on IS NULL OR wa_sub.ends_on >= CURRENT_DATE())) DESC,
                (wa_sub.status = 'ACTIVE' AND wa_sub.deleted_at IS NULL) DESC,
                wa_sub.id DESC
            ) AS rn
          FROM workout_assignments wa_sub
          WHERE wa_sub.deleted_at IS NULL
            AND wa_sub.consultancy_id = ?
        ) wa_inner
        WHERE wa_inner.rn = 1 AND wa_inner.status = 'ACTIVE'
      ) active_wa ON active_wa.student_membership_id = cm.id
      LEFT JOIN workout_versions wv ON wv.id = active_wa.workout_version_id
      LEFT JOIN workouts w ON w.id = wv.workout_id
      WHERE cm.consultancy_id = ?
        AND cm.status = 'ACTIVE'
        AND u.deleted_at IS NULL
      ORDER BY u.full_name ASC;
    `;

    const [rows] = await connection.execute<RowDataPacket[]>(sql, [consultancyId, consultancyId]);

    const totalStudents = rows.length;
    let comTreinoCount = 0;
    let semTreinoCount = 0;
    let vencidosCount = 0;
    let aVencerCount = 0;
    let emDiaCount = 0;
    const studentsWithoutWorkout: AuthoritativeTrainingMetrics["studentsWithoutWorkout"] = [];

    const today = new Date(todayDateStr);
    const next7Days = new Date(today);
    next7Days.setDate(next7Days.getDate() + 7);
    const next7DaysStr = next7Days.toISOString().slice(0, 10);

    for (const r of rows) {
      const hasActiveWorkout = Boolean(
        r.assignment_id &&
        r.assignment_status === "ACTIVE" &&
        r.workout_title
      );
      const endsOnStr = r.assignment_ends_on ? formatDateYmd(r.assignment_ends_on) : null;

      if (!hasActiveWorkout) {
        semTreinoCount++;
        studentsWithoutWorkout.push({
          membershipPublicId: String(r.membership_public_id),
          userPublicId: String(r.user_public_id),
          name: String(r.full_name),
          email: String(r.email),
          joinedAt: r.joined_at ? new Date(r.joined_at).toISOString() : new Date().toISOString(),
        });
      } else {
        comTreinoCount++;
        if (endsOnStr && endsOnStr < todayDateStr) {
          vencidosCount++;
        } else if (endsOnStr && endsOnStr >= todayDateStr && endsOnStr <= next7DaysStr) {
          aVencerCount++;
        } else {
          emDiaCount++;
        }
      }
    }

    const emDiaPercent = totalStudents > 0 ? Math.round((comTreinoCount / totalStudents) * 100) : 0;

    return {
      totalStudents,
      comTreinoCount,
      semTreinoCount,
      vencidosCount,
      aVencerCount,
      emDiaCount,
      emDiaPercent,
      studentsWithoutWorkout,
      loadStatus: "SUCCESS",
    };
  } catch (error) {
    console.error("[AuthoritativeTrainingMetrics] Erro ao consultar métricas:", error);
    return {
      totalStudents: 0,
      comTreinoCount: 0,
      semTreinoCount: 0,
      vencidosCount: 0,
      aVencerCount: 0,
      emDiaCount: 0,
      emDiaPercent: 0,
      studentsWithoutWorkout: [],
      loadStatus: "ERROR",
      errorMessage: error instanceof Error ? error.message : "Erro no banco de dados ao consultar situação dos treinos",
    };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
