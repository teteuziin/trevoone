import crypto from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "@/lib/db/mysql";
import { recordMemberActivity } from "@/lib/monitoring/activity-tracker";

export type TrainingCheckinStatus = "TRAINED" | "NOT_TRAINED" | "REST_DAY";
export type DietCheckinStatus = "FOLLOWED" | "PARTIAL" | "OFF_PLAN" | "NOT_APPLICABLE";
export type DifficultyLevel = "NONE" | "LOW" | "MEDIUM" | "HIGH";

export interface DailyCheckinInput {
  trainingStatus: TrainingCheckinStatus;
  dietStatus: DietCheckinStatus;
  energyLevel: number; // 1 to 5
  difficultyLevel: DifficultyLevel;
  hasPain: boolean;
  difficultyReasons?: string[];
  notes?: string;
}

export interface DailyCheckinRecord {
  id: number;
  publicId: string;
  consultancyId: number;
  studentMemberId: number;
  checkinDate: string; // YYYY-MM-DD
  trainingStatus: TrainingCheckinStatus;
  dietStatus: DietCheckinStatus;
  energyLevel: number;
  difficultyLevel: DifficultyLevel;
  hasPain: boolean;
  difficultyReasons: string[] | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function submitDailyCheckin(
  consultancyId: number,
  studentMemberId: number,
  studentUserId: number,
  data: DailyCheckinInput
): Promise<{ success: boolean; error?: string; checkinPublicId?: string }> {
  // Validate input
  const validTraining: TrainingCheckinStatus[] = ["TRAINED", "NOT_TRAINED", "REST_DAY"];
  const validDiet: DietCheckinStatus[] = ["FOLLOWED", "PARTIAL", "OFF_PLAN", "NOT_APPLICABLE"];
  const validDifficulty: DifficultyLevel[] = ["NONE", "LOW", "MEDIUM", "HIGH"];

  if (!validTraining.includes(data.trainingStatus)) {
    return { success: false, error: "Status de treino inválido." };
  }
  if (!validDiet.includes(data.dietStatus)) {
    return { success: false, error: "Status de alimentação inválido." };
  }
  const rawEnergy = Number(data.energyLevel);
  if (isNaN(rawEnergy) || rawEnergy < 1 || rawEnergy > 5) {
    return { success: false, error: "Nível de energia deve estar entre 1 e 5." };
  }
  const energy = Math.round(rawEnergy);
  if (!validDifficulty.includes(data.difficultyLevel)) {
    return { success: false, error: "Nível de dificuldade inválido." };
  }

  const connection = await getDbConnection();
  try {
    // 1. Verify student membership in this consultancy
    const [memberRows] = await connection.execute<RowDataPacket[]>(
      `SELECT cm.id, cm.status, cm.user_id
       FROM consultancy_members cm
       JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id
       WHERE cm.id = ? AND cm.consultancy_id = ? AND cm.status = 'ACTIVE' AND cmr.role = 'STUDENT'
       LIMIT 1;`,
      [studentMemberId, consultancyId]
    );

    if (!Array.isArray(memberRows) || memberRows.length === 0) {
      return { success: false, error: "Acesso negado: aluno não encontrado ou inativo nesta consultoria." };
    }

    if (Number(memberRows[0].user_id) !== studentUserId) {
      return { success: false, error: "Não é permitido registrar check-in para outro usuário." };
    }

    const publicId = crypto.randomUUID();
    const reasonsJson = Array.isArray(data.difficultyReasons) && data.difficultyReasons.length > 0
      ? JSON.stringify(data.difficultyReasons)
      : null;
    const cleanNotes = data.notes?.trim() || null;

    // 2. Upsert check-in for current date (CURRENT_DATE)
    await connection.execute(
      `INSERT INTO daily_student_checkins (
         public_id, consultancy_id, student_member_id, checkin_date,
         training_status, diet_status, energy_level, difficulty_level,
         has_pain, difficulty_reasons, notes
       ) VALUES (?, ?, ?, CURRENT_DATE(), ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         training_status = VALUES(training_status),
         diet_status = VALUES(diet_status),
         energy_level = VALUES(energy_level),
         difficulty_level = VALUES(difficulty_level),
         has_pain = VALUES(has_pain),
         difficulty_reasons = VALUES(difficulty_reasons),
         notes = VALUES(notes),
         updated_at = UTC_TIMESTAMP(3);`,
      [
        publicId,
        consultancyId,
        studentMemberId,
        data.trainingStatus,
        data.dietStatus,
        energy,
        data.difficultyLevel,
        data.hasPain ? 1 : 0,
        reasonsJson,
        cleanNotes,
      ]
    );

    // 3. Record lightweight member activity (throttled)
    await recordMemberActivity(consultancyId, studentMemberId);

    return { success: true, checkinPublicId: publicId };
  } finally {
    connection.release();
  }
}

export async function getTodayCheckin(
  consultancyId: number,
  studentMemberId: number
): Promise<DailyCheckinRecord | null> {
  const connection = await getDbConnection();
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, consultancy_id, student_member_id,
              DATE_FORMAT(checkin_date, '%Y-%m-%d') AS checkin_date,
              training_status, diet_status, energy_level, difficulty_level,
              has_pain, difficulty_reasons, notes, created_at, updated_at
       FROM daily_student_checkins
       WHERE consultancy_id = ? AND student_member_id = ? AND checkin_date = CURRENT_DATE()
       LIMIT 1;`,
      [consultancyId, studentMemberId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    const r = rows[0];
    let reasons: string[] | null = null;
    if (r.difficulty_reasons) {
      try {
        reasons = typeof r.difficulty_reasons === "string" ? JSON.parse(r.difficulty_reasons) : r.difficulty_reasons;
      } catch {
        reasons = null;
      }
    }

    return {
      id: Number(r.id),
      publicId: r.public_id,
      consultancyId: Number(r.consultancy_id),
      studentMemberId: Number(r.student_member_id),
      checkinDate: r.checkin_date,
      trainingStatus: r.training_status as TrainingCheckinStatus,
      dietStatus: r.diet_status as DietCheckinStatus,
      energyLevel: Number(r.energy_level),
      difficultyLevel: r.difficulty_level as DifficultyLevel,
      hasPain: Boolean(r.has_pain),
      difficultyReasons: reasons,
      notes: r.notes,
      createdAt: new Date(r.created_at),
      updatedAt: new Date(r.updated_at),
    };
  } finally {
    connection.release();
  }
}

export async function getStudentRecentCheckins(
  consultancyId: number,
  studentMemberId: number,
  daysLimit = 7
): Promise<DailyCheckinRecord[]> {
  const connection = await getDbConnection();
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, consultancy_id, student_member_id,
              DATE_FORMAT(checkin_date, '%Y-%m-%d') AS checkin_date,
              training_status, diet_status, energy_level, difficulty_level,
              has_pain, difficulty_reasons, notes, created_at, updated_at
       FROM daily_student_checkins
       WHERE consultancy_id = ? AND student_member_id = ?
         AND checkin_date >= DATE_SUB(CURRENT_DATE(), INTERVAL ? DAY)
       ORDER BY checkin_date DESC;`,
      [consultancyId, studentMemberId, daysLimit]
    );

    return rows.map((r) => {
      let reasons: string[] | null = null;
      if (r.difficulty_reasons) {
        try {
          reasons = typeof r.difficulty_reasons === "string" ? JSON.parse(r.difficulty_reasons) : r.difficulty_reasons;
        } catch {
          reasons = null;
        }
      }
      return {
        id: Number(r.id),
        publicId: r.public_id,
        consultancyId: Number(r.consultancy_id),
        studentMemberId: Number(r.student_member_id),
        checkinDate: r.checkin_date,
        trainingStatus: r.training_status as TrainingCheckinStatus,
        dietStatus: r.diet_status as DietCheckinStatus,
        energyLevel: Number(r.energy_level),
        difficultyLevel: r.difficulty_level as DifficultyLevel,
        hasPain: Boolean(r.has_pain),
        difficultyReasons: reasons,
        notes: r.notes,
        createdAt: new Date(r.created_at),
        updatedAt: new Date(r.updated_at),
      };
    });
  } finally {
    connection.release();
  }
}
