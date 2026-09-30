/**
 * TREVO ONE — TRAINING AI IMPORTER
 * End-to-end extraction, library matching, preview generation,
 * and authoritative routine persistence.
 */

import crypto from "node:crypto";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";
import { getAiImportProvider } from "../ai/provider";
import {
  reserveAiQuota,
  markAiQuotaConsumed,
  refundAiQuota,
} from "../ai/quotas";
import type { DocumentInput } from "../ai/openai-client";
import type { RawTrainingImportProposal } from "../ai/schemas";
import { recordConsultancyActivity } from "../consultancies/activity-log";
import { ensureAiSchemaBootstrapped } from "../db/ai-schema-bootstrap";

export type ExerciseMatchStatus = "MATCHED" | "AMBIGUOUS" | "NOT_FOUND";

export interface MatchedExerciseCandidate {
  exercisePublicId: string;
  name: string;
  muscleGroupPrimary: string;
  equipment: string;
}

export interface ResolvedTrainingExerciseItem {
  id: string; // client temporary ID
  originalText: string;
  exerciseNameCandidate: string;
  matchStatus: ExerciseMatchStatus;
  exercisePublicId: string | null;
  exerciseNameSnapshot: string;
  muscleGroupSnapshot: string | null;
  equipmentSnapshot: string | null;
  candidates: MatchedExerciseCandidate[];
  sets: number | null;
  reps: number | null;
  repsMax: number | null;
  durationSeconds: number | null;
  restSeconds: number | null;
  load: number | null;
  notes: string | null;
}

export interface ResolvedTrainingCategory {
  name: string;
  exercises: ResolvedTrainingExerciseItem[];
}

export interface ResolvedTrainingProposal {
  jobPublicId: string;
  title: string;
  studentNameCandidate: string | null;
  targetStudentMembershipId: number | null;
  targetStudentName: string | null;
  objective: string | null;
  notes: string | null;
  categories: ResolvedTrainingCategory[];
  stats: {
    totalExercises: number;
    matchedCount: number;
    ambiguousCount: number;
    notFoundCount: number;
  };
  status: "READY" | "NEEDS_REVIEW";
}

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Searches the authoritative Exercise Library (Global + Consultancy) for matches.
 */
export async function matchExerciseCandidate(
  consultancyId: number | bigint,
  candidateName: string
): Promise<{
  status: ExerciseMatchStatus;
  matched?: MatchedExerciseCandidate;
  candidates: MatchedExerciseCandidate[];
}> {
  const normCandidate = normalize(candidateName);
  if (!normCandidate) {
    return { status: "NOT_FOUND", candidates: [] };
  }

  const db = await getDbConnection();
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
        public_id, name, normalized_name, muscle_group_primary, equipment
       FROM exercises
       WHERE status = 'PUBLISHED'
         AND deleted_at IS NULL
         AND (scope = 'GLOBAL' OR (scope = 'CONSULTANCY' AND consultancy_id = ?))`,
      [consultancyId]
    );

    const exactMatches: MatchedExerciseCandidate[] = [];
    const partialMatches: MatchedExerciseCandidate[] = [];

    for (const r of rows) {
      const candidateObj: MatchedExerciseCandidate = {
        exercisePublicId: String(r.public_id),
        name: String(r.name),
        muscleGroupPrimary: String(r.muscle_group_primary),
        equipment: String(r.equipment),
      };

      const normDb = normalize(String(r.name));

      if (normDb === normCandidate) {
        exactMatches.push(candidateObj);
      } else if (normDb.includes(normCandidate) || normCandidate.includes(normDb)) {
        partialMatches.push(candidateObj);
      }
    }

    // 1. Exact match takes precedence
    if (exactMatches.length === 1) {
      return {
        status: "MATCHED",
        matched: exactMatches[0],
        candidates: exactMatches,
      };
    }

    if (exactMatches.length > 1) {
      return {
        status: "AMBIGUOUS",
        candidates: exactMatches,
      };
    }

    // 2. Partial matches
    if (partialMatches.length === 1) {
      // If partial match is distinct and high confidence
      const p = partialMatches[0];
      const pNorm = normalize(p.name);
      // If candidate is a prefix like "supino reto" and match is "supino reto com barra"
      if (pNorm.startsWith(normCandidate) || normCandidate.startsWith(pNorm)) {
        return {
          status: "MATCHED",
          matched: p,
          candidates: partialMatches,
        };
      }
      return {
        status: "AMBIGUOUS",
        candidates: partialMatches,
      };
    }

    if (partialMatches.length > 1) {
      return {
        status: "AMBIGUOUS",
        candidates: partialMatches.slice(0, 10),
      };
    }

    return {
      status: "NOT_FOUND",
      candidates: [],
    };
  } finally {
    db.release();
  }
}

/**
 * Initiates AI training import:
 * 1. Quota reservation (atomic server-side)
 * 2. OpenAI provider extraction
 * 3. Quota consumption or refund
 * 4. Exercise matching against Trevo Exercise Library
 * 5. Builds structured proposal preview
 */
export async function processTrainingAiImport(params: {
  consultancyId: number | bigint;
  memberId: number | bigint;
  userId: number | bigint;
  role: string;
  input: DocumentInput;
  targetStudentMembershipId?: number | bigint | null;
  idempotencyKey?: string;
}): Promise<ResolvedTrainingProposal> {
  const {
    consultancyId,
    memberId,
    userId,
    role,
    input,
    targetStudentMembershipId,
    idempotencyKey = crypto.randomUUID(),
  } = params;

  // Ensure database tables exist
  await ensureAiSchemaBootstrapped();

  // 1. Compute file hash
  const fileBuffer = input.buffer || Buffer.from(input.text || "", "utf8");
  const sourceHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
  const importJobPublicId = crypto.randomUUID();

  // Check idempotency if key provided
  const db = await getDbConnection();
  try {
    const [existingJobs] = await db.query<RowDataPacket[]>(
      `SELECT public_id, resolved_proposal_json, status
       FROM ai_import_jobs
       WHERE consultancy_id = ? AND idempotency_key = ? LIMIT 1`,
      [consultancyId, idempotencyKey]
    );

    if (existingJobs.length > 0 && existingJobs[0].resolved_proposal_json) {
      return JSON.parse(String(existingJobs[0].resolved_proposal_json));
    }
  } finally {
    db.release();
  }

  // 2. Atomic Quota Reservation
  const quotaReservation = await reserveAiQuota({
    consultancyId,
    memberId,
    userId,
    role,
    feature: "TRAINING_IMPORT",
    model: "gpt-4o",
    importJobPublicId,
  });

  if (!quotaReservation.success) {
    throw new Error(quotaReservation.message || "Limite de cota de IA atingido.");
  }

  const usageEventPublicId = quotaReservation.usageEventPublicId!;

  // 3. Create initial import job record
  const sourceType = input.filename.endsWith(".pdf")
    ? "PDF"
    : input.filename.endsWith(".docx")
    ? "DOCX"
    : input.filename.endsWith(".md")
    ? "MARKDOWN"
    : "TEXT";

  const dbJob = await getDbConnection();
  try {
    await dbJob.query(
      `INSERT INTO ai_import_jobs (
        public_id, idempotency_key, consultancy_id, member_id, user_id,
        feature, status, source_filename, source_hash, source_type,
        file_size_bytes, target_student_membership_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'TRAINING_IMPORT', 'PROCESSING', ?, ?, ?, ?, ?, NOW(3), NOW(3))`,
      [
        importJobPublicId,
        idempotencyKey,
        consultancyId,
        memberId,
        userId,
        input.filename,
        sourceHash,
        sourceType,
        fileBuffer.length,
        targetStudentMembershipId || null,
      ]
    );
  } finally {
    dbJob.release();
  }

  // Record activity start
  await recordConsultancyActivity({
    consultancyId,
    actorUserId: userId,
    actorMembershipId: memberId,
    actorRole: role,
    action: "AI_TRAINING_IMPORT_STARTED",
    module: "AI",
    resourceType: "AI_IMPORT_JOB",
    resourcePublicId: importJobPublicId,
    summary: `Iniciou a importação com IA do treino a partir de ${input.filename}`,
    metadata: {
      filename: input.filename,
      sourceType,
      fileSizeBytes: fileBuffer.length,
    },
  });

  // 4. Invoke OpenAI provider with automatic refund on failure
  let rawProposal: RawTrainingImportProposal;
  let metadata: { inputTokens: number; outputTokens: number; totalTokens: number };

  try {
    const provider = getAiImportProvider();
    const result = await provider.importTraining(input);
    rawProposal = result.proposal;
    metadata = result.metadata;

    // Quota consumed permanently because OpenAI successfully processed the document
    await markAiQuotaConsumed(usageEventPublicId, {
      inputTokens: metadata.inputTokens,
      outputTokens: metadata.outputTokens,
      totalTokens: metadata.totalTokens,
    });
  } catch (providerErr: unknown) {
    const errorMsg = providerErr instanceof Error ? providerErr.message : String(providerErr);
    // Automatic refund on network, timeout, or 5xx provider failure
    await refundAiQuota(usageEventPublicId);

    const dbFail = await getDbConnection();
    try {
      await dbFail.query(
        `UPDATE ai_import_jobs SET status = 'FAILED', error_message = ?, updated_at = NOW(3) WHERE public_id = ?`,
        [(errorMsg || "Falha na chamada da OpenAI").slice(0, 500), importJobPublicId]
      );
    } finally {
      dbFail.release();
    }

    await recordConsultancyActivity({
      consultancyId,
      actorUserId: userId,
      actorMembershipId: memberId,
      actorRole: role,
      action: "AI_TRAINING_IMPORT_FAILED",
      module: "AI",
      resourceType: "AI_IMPORT_JOB",
      resourcePublicId: importJobPublicId,
      summary: `Falha ao processar o arquivo ${input.filename} com IA`,
      metadata: { error: errorMsg },
    });

    throw new Error(`Falha no processamento com IA: ${errorMsg}`);
  }

  // 5. Match Exercises against Library
  let totalExercises = 0;
  let matchedCount = 0;
  let ambiguousCount = 0;
  let notFoundCount = 0;

  const resolvedCategories: ResolvedTrainingCategory[] = [];

  for (const cat of rawProposal.categories || []) {
    const resolvedExercises: ResolvedTrainingExerciseItem[] = [];

    for (const ex of cat.exercises || []) {
      totalExercises++;
      const matchResult = await matchExerciseCandidate(consultancyId, ex.exerciseNameCandidate);

      let exercisePublicId: string | null = null;
      let exerciseNameSnapshot = ex.exerciseNameCandidate;
      let muscleGroupSnapshot: string | null = null;
      let equipmentSnapshot: string | null = null;

      if (matchResult.status === "MATCHED" && matchResult.matched) {
        matchedCount++;
        exercisePublicId = matchResult.matched.exercisePublicId;
        exerciseNameSnapshot = matchResult.matched.name;
        muscleGroupSnapshot = matchResult.matched.muscleGroupPrimary;
        equipmentSnapshot = matchResult.matched.equipment;
      } else if (matchResult.status === "AMBIGUOUS") {
        ambiguousCount++;
      } else {
        notFoundCount++;
      }

      resolvedExercises.push({
        id: crypto.randomUUID(),
        originalText: ex.originalText,
        exerciseNameCandidate: ex.exerciseNameCandidate,
        matchStatus: matchResult.status,
        exercisePublicId,
        exerciseNameSnapshot,
        muscleGroupSnapshot,
        equipmentSnapshot,
        candidates: matchResult.candidates,
        sets: ex.sets,
        reps: ex.reps,
        repsMax: ex.repsMax || null,
        durationSeconds: ex.durationSeconds,
        restSeconds: ex.restSeconds,
        load: ex.load,
        notes: ex.notes,
      });
    }

    resolvedCategories.push({
      name: cat.name || "Geral",
      exercises: resolvedExercises,
    });
  }

  // Resolve target student if provided or candidate
  let targetStudentName: string | null = null;
  const dbStudent = await getDbConnection();
  try {
    if (targetStudentMembershipId) {
      const [sRows] = await dbStudent.query<RowDataPacket[]>(
        `SELECT u.full_name FROM consultancy_members cm
         INNER JOIN users u ON u.id = cm.user_id
         WHERE cm.id = ? AND cm.consultancy_id = ? LIMIT 1`,
        [targetStudentMembershipId, consultancyId]
      );
      if (sRows.length > 0) {
        targetStudentName = String(sRows[0].full_name);
      }
    }
  } finally {
    dbStudent.release();
  }

  const proposalStatus: "READY" | "NEEDS_REVIEW" =
    ambiguousCount > 0 || notFoundCount > 0 ? "NEEDS_REVIEW" : "READY";

  const resolvedProposal: ResolvedTrainingProposal = {
    jobPublicId: importJobPublicId,
    title: rawProposal.title || `Ficha de Treino - ${input.filename}`,
    studentNameCandidate: rawProposal.studentNameCandidate,
    targetStudentMembershipId: targetStudentMembershipId ? Number(targetStudentMembershipId) : null,
    targetStudentName,
    objective: rawProposal.objective,
    notes: rawProposal.notes,
    categories: resolvedCategories,
    stats: {
      totalExercises,
      matchedCount,
      ambiguousCount,
      notFoundCount,
    },
    status: proposalStatus,
  };

  // Update import job with proposals
  const dbSave = await getDbConnection();
  try {
    await dbSave.query(
      `UPDATE ai_import_jobs
       SET raw_proposal_json = ?,
           resolved_proposal_json = ?,
           status = ?,
           updated_at = NOW(3)
       WHERE public_id = ?`,
      [
        JSON.stringify(rawProposal),
        JSON.stringify(resolvedProposal),
        proposalStatus,
        importJobPublicId,
      ]
    );
  } finally {
    dbSave.release();
  }

  await recordConsultancyActivity({
    consultancyId,
    actorUserId: userId,
    actorMembershipId: memberId,
    actorRole: role,
    action: "AI_TRAINING_IMPORT_COMPLETED",
    module: "AI",
    resourceType: "AI_IMPORT_JOB",
    resourcePublicId: importJobPublicId,
    summary: `Concluiu a leitura com IA de ${input.filename}: ${totalExercises} exercícios identificados (${matchedCount} encontrados)`,
    metadata: {
      filename: input.filename,
      totalExercises,
      matchedCount,
      ambiguousCount,
      notFoundCount,
    },
  });

  return resolvedProposal;
}

/**
 * Confirms and persists the resolved Training routine into the authoritative Trevo database.
 */
export async function confirmTrainingAiImport(params: {
  consultancyId: number | bigint;
  memberId: number | bigint;
  userId: number | bigint;
  role: string;
  jobPublicId: string;
  targetStudentMembershipId?: number | bigint | null;
  confirmedTitle?: string;
  confirmedCategories: ResolvedTrainingCategory[];
}): Promise<{
  workoutPublicId: string;
  versionPublicId: string;
  assignmentPublicId?: string;
}> {
  const {
    consultancyId,
    memberId,
    userId,
    role,
    jobPublicId,
    targetStudentMembershipId,
    confirmedTitle,
    confirmedCategories,
  } = params;

  // Validate no unresolved exercises exist
  for (const cat of confirmedCategories) {
    for (const ex of cat.exercises) {
      if (ex.matchStatus !== "MATCHED" || !ex.exercisePublicId) {
        throw new Error(
          `O exercício "${ex.exerciseNameCandidate}" na categoria "${cat.name}" precisa ser selecionado ou removido antes de confirmar.`
        );
      }
    }
  }

  const db = await getDbConnection();
  try {
    await db.beginTransaction();

    // Check job and idempotency
    const [jobRows] = await db.query<RowDataPacket[]>(
      `SELECT id, status, created_plan_public_id, source_filename
       FROM ai_import_jobs
       WHERE public_id = ? AND consultancy_id = ? FOR UPDATE`,
      [jobPublicId, consultancyId]
    );

    if (jobRows.length === 0) {
      await db.rollback();
      throw new Error("Job de importação não encontrado nesta consultoria.");
    }

    if (jobRows[0].status === "CONFIRMED" && jobRows[0].created_plan_public_id) {
      // Return existing plan idempotently
      await db.rollback();
      return {
        workoutPublicId: String(jobRows[0].created_plan_public_id),
        versionPublicId: "",
      };
    }

    const title = (confirmedTitle || "Treino Importado com IA").trim();
    const workoutPublicId = crypto.randomUUID();
    const versionPublicId = crypto.randomUUID();

    // 1. Insert workout root
    const [wRes] = await db.query<ResultSetHeader>(
      `INSERT INTO workouts (
        public_id, consultancy_id, created_by_membership_id, title, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'ACTIVE', NOW(3), NOW(3))`,
      [workoutPublicId, consultancyId, memberId, title]
    );
    const workoutId = wRes.insertId;

    // 2. Insert draft version (version 1)
    const [vRes] = await db.query<ResultSetHeader>(
      `INSERT INTO workout_versions (
        public_id, workout_id, version_number, status, title,
        created_by_membership_id, created_at, updated_at
      ) VALUES (?, ?, 1, 'DRAFT', ?, ?, NOW(3), NOW(3))`,
      [versionPublicId, workoutId, title, memberId]
    );
    const versionId = vRes.insertId;

    let exercisesCreated = 0;

    // 3. Insert categories as workout_blocks
    let blockSort = 0;
    for (const cat of confirmedCategories) {
      blockSort++;
      const blockPublicId = crypto.randomUUID();
      const [bRes] = await db.query<ResultSetHeader>(
        `INSERT INTO workout_blocks (
          public_id, workout_version_id, block_type, title, sort_order, created_at, updated_at
        ) VALUES (?, ?, 'NORMAL', ?, ?, NOW(3), NOW(3))`,
        [blockPublicId, versionId, cat.name, blockSort]
      );
      const blockId = bRes.insertId;

      let itemSort = 0;
      for (const ex of cat.exercises) {
        itemSort++;
        exercisesCreated++;
        const itemPublicId = crypto.randomUUID();

        // Resolve exercise DB id from publicId
        const [exRows] = await db.query<RowDataPacket[]>(
          `SELECT id, name, muscle_group_primary, equipment FROM exercises WHERE public_id = ? LIMIT 1`,
          [ex.exercisePublicId]
        );
        const exerciseId = exRows.length > 0 ? exRows[0].id : null;
        const nameSnapshot = exRows.length > 0 ? String(exRows[0].name) : ex.exerciseNameSnapshot;
        const muscleSnapshot = exRows.length > 0 ? String(exRows[0].muscle_group_primary) : ex.muscleGroupSnapshot;
        const equipSnapshot = exRows.length > 0 ? String(exRows[0].equipment) : ex.equipmentSnapshot;

        const [iRes] = await db.query<ResultSetHeader>(
          `INSERT INTO workout_block_items (
            public_id, block_id, exercise_id, sort_order, exercise_name_snapshot,
            muscle_group_snapshot, equipment_snapshot, prescription_mode, notes,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'SETS', ?, NOW(3), NOW(3))`,
          [
            itemPublicId,
            blockId,
            exerciseId,
            itemSort,
            nameSnapshot,
            muscleSnapshot,
            equipSnapshot,
            ex.notes || null,
          ]
        );
        const itemId = iRes.insertId;

        // Insert sets
        const numSets = Math.max(1, ex.sets || 3);
        for (let s = 1; s <= numSets; s++) {
          await db.query(
            `INSERT INTO workout_item_sets (
              block_item_id, set_number, set_type, target_reps, target_reps_max, target_load_kg,
              target_duration_seconds, target_rest_seconds, created_at, updated_at
            ) VALUES (?, ?, 'NORMAL', ?, ?, ?, ?, ?, NOW(3), NOW(3))`,
            [
              itemId,
              s,
              ex.reps || null,
              ex.repsMax || null,
              ex.load || null,
              ex.durationSeconds || null,
              ex.restSeconds || null,
            ]
          );
        }
      }
    }

    // 4. If target student assigned, create assignment
    let assignmentPublicId: string | undefined;
    let studentFullName: string | null = null;

    if (targetStudentMembershipId) {
      const [sRows] = await db.query<RowDataPacket[]>(
        `SELECT u.full_name FROM consultancy_members cm
         INNER JOIN users u ON u.id = cm.user_id
         INNER JOIN consultancy_member_roles cmr ON cmr.member_id = cm.id AND cmr.role IN ('STUDENT', 'INFLUENCER')
         WHERE cm.id = ? AND cm.consultancy_id = ? AND cm.status = 'ACTIVE' AND u.deleted_at IS NULL LIMIT 1`,
        [targetStudentMembershipId, consultancyId]
      );
      if (sRows.length === 0) {
        await db.rollback();
        throw new Error("Aluno selecionado não é válido ou não pertence a esta consultoria.");
      }
      studentFullName = String(sRows[0].full_name);
      assignmentPublicId = crypto.randomUUID();

        // Publish version for the assignment
        await db.query(
          `UPDATE workout_versions SET status = 'PUBLISHED', published_at = NOW(3) WHERE id = ?`,
          [versionId]
        );

        await db.query(
          `INSERT INTO workout_assignments (
            public_id, consultancy_id, student_membership_id, workout_version_id,
            assigned_by_membership_id, starts_on, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, CURDATE(), 'ACTIVE', NOW(3), NOW(3))`,
          [
            assignmentPublicId,
            consultancyId,
            targetStudentMembershipId,
            versionId,
            memberId,
          ]
        );
      }

    // 5. Update job status to CONFIRMED
    await db.query(
      `UPDATE ai_import_jobs
       SET status = 'CONFIRMED',
           created_plan_public_id = ?,
           updated_at = NOW(3)
       WHERE public_id = ?`,
      [workoutPublicId, jobPublicId]
    );

    await db.commit();

    // 6. Record audit activity event
    const summary = studentFullName
      ? `importou com IA a ficha de treino "${title}" para ${studentFullName}`
      : `importou com IA a ficha de treino "${title}"`;

    await recordConsultancyActivity({
      consultancyId,
      actorUserId: userId,
      actorMembershipId: memberId,
      actorRole: role,
      action: "AI_TRAINING_IMPORT_CONFIRMED",
      module: "PERSONAL",
      resourceType: "WORKOUT",
      resourcePublicId: workoutPublicId,
      subjectMembershipId: targetStudentMembershipId || null,
      summary,
      metadata: {
        importJobPublicId: jobPublicId,
        workoutPublicId,
        workoutTitle: title,
        categoriesCount: confirmedCategories.length,
        exercisesCreated,
        targetStudentName: studentFullName,
      },
    });

    return {
      workoutPublicId,
      versionPublicId,
      assignmentPublicId,
    };
  } catch (err) {
    await db.rollback();
    throw err;
  } finally {
    db.release();
  }
}
