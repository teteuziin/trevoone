/**
 * TREVO ONE — STUDENT EXERCISE SUBSTITUTION SERVICE
 * Implements authoritative runtime exercise swapping for students when equipment is unavailable.
 * Strictly bounded to max 3 swaps per workout execution. Original workout prescription is immutable.
 */

import crypto from "node:crypto";
import type { RowDataPacket, ResultSetHeader, PoolConnection } from "mysql2/promise";
import { getDbPool } from "../db/mysql";
import type { TrainingAccessContext } from "./access";
import { assertStudentContext, TrainingAuthorizationError } from "./access";
import type { BlockItemMediaDto, MediaRole, MediaType, StorageProvider } from "./types";
import { recordConsultancyActivity } from "../consultancies/activity-log";
import { reserveAiQuota, markAiQuotaConsumed } from "../ai/quotas";
import { getOpenAiClient, isOpenAiConfigured } from "../ai/openai-client";

export type {
  ExerciseSwapReason,
  ExerciseSwapAlternative,
  ActiveSubstitutionDetail,
  WorkoutExecutionSwapStatus,
} from "./exercise-substitution-types";

export {
  SWAP_REASON_LABELS,
  MAX_CONFIRMED_SWAPS_PER_WORKOUT,
} from "./exercise-substitution-types";

import type { ExerciseSwapReason, ExerciseSwapAlternative, ActiveSubstitutionDetail, WorkoutExecutionSwapStatus } from "./exercise-substitution-types";
import { SWAP_REASON_LABELS, MAX_CONFIRMED_SWAPS_PER_WORKOUT } from "./exercise-substitution-types";

/**
 * Normalizes text helper for deterministic filtering.
 */
function normalizeText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Fetches media for a given exercise ID.
 */
async function fetchMediaForExercise(
  connection: PoolConnection,
  exerciseId: number
): Promise<BlockItemMediaDto[]> {
  const [mediaRows] = await connection.execute<RowDataPacket[]>(
    `SELECT em.role, em.sort_order,
            ma.public_id AS media_public_id, ma.scope, ma.visibility,
            ma.media_type, ma.storage_provider, ma.mime_type,
            ma.file_size_bytes, ma.duration_seconds, ma.width, ma.height,
            ma.created_at
     FROM exercise_media em
     INNER JOIN media_assets ma ON ma.id = em.media_asset_id
     WHERE em.exercise_id = ? AND ma.deleted_at IS NULL
     ORDER BY em.sort_order ASC;`,
    [exerciseId]
  );

  return (mediaRows || []).map((m: RowDataPacket) => ({
    role: m.role as MediaRole,
    sortOrder: Number(m.sort_order),
    mediaAsset: {
      publicId: String(m.media_public_id),
      scope: m.scope,
      visibility: m.visibility,
      consultancyPublicId: null,
      mediaType: m.media_type as MediaType,
      storageProvider: m.storage_provider as StorageProvider,
      mimeType: String(m.mime_type),
      fileSizeBytes: Number(m.file_size_bytes),
      durationSeconds: m.duration_seconds != null ? Number(m.duration_seconds) : null,
      width: m.width != null ? Number(m.width) : null,
      height: m.height != null ? Number(m.height) : null,
      createdAt: new Date(m.created_at),
    },
  }));
}

/**
 * Retrieves the current swap status for a specific execution session.
 */
export async function getWorkoutExecutionSwapStatus(
  ctx: TrainingAccessContext,
  sessionPublicId: string
): Promise<WorkoutExecutionSwapStatus> {
  assertStudentContext(ctx);

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    // 1. Validate session and tenant
    const [sessionRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, consultancy_id, student_membership_id, status
       FROM workout_execution_sessions
       WHERE public_id = ? LIMIT 1;`,
      [sessionPublicId]
    );

    if (!sessionRows || sessionRows.length === 0) {
      throw new TrainingAuthorizationError("Sessão de treino não encontrada.", "NOT_FOUND", 404);
    }

    const s = sessionRows[0];
    if (Number(s.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado: sessão de outra consultoria.", "FORBIDDEN", 403);
    }
    if (Number(s.student_membership_id) !== ctx.membershipId) {
      throw new TrainingAuthorizationError("Acesso negado: sessão pertence a outro aluno.", "FORBIDDEN", 403);
    }

    // 2. Fetch all substitutions for this session ordered by sequence_number
    const [subRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        wees.id,
        wees.public_id,
        wees.block_item_id,
        wees.reason,
        wees.sequence_number,
        wbi.public_id AS block_item_public_id,
        orig_ex.id AS original_exercise_id,
        orig_ex.public_id AS original_exercise_public_id,
        orig_ex.name AS original_exercise_name,
        perf_ex.id AS performed_exercise_id,
        perf_ex.public_id AS performed_exercise_public_id,
        perf_ex.name AS performed_exercise_name
       FROM workout_execution_exercise_substitutions wees
       INNER JOIN workout_block_items wbi ON wbi.id = wees.block_item_id
       INNER JOIN exercises orig_ex ON orig_ex.id = wees.original_exercise_id
       INNER JOIN exercises perf_ex ON perf_ex.id = wees.performed_exercise_id
       WHERE wees.execution_session_id = ?
       ORDER BY wees.sequence_number ASC;`,
      [s.id]
    );

    const totalConfirmedSwaps = subRows.length;
    const remainingSwaps = Math.max(0, MAX_CONFIRMED_SWAPS_PER_WORKOUT - totalConfirmedSwaps);
    const canSwap = s.status === "IN_PROGRESS" && remainingSwaps > 0;

    // Fetch media for each performed exercise
    const substitutions: ActiveSubstitutionDetail[] = [];
    for (const r of subRows) {
      const media = await fetchMediaForExercise(connection, Number(r.performed_exercise_id));
      const reasonCode = r.reason as ExerciseSwapReason;
      substitutions.push({
        substitutionPublicId: String(r.public_id),
        blockItemPublicId: String(r.block_item_public_id),
        blockItemId: Number(r.block_item_id),
        originalExercisePublicId: String(r.original_exercise_public_id),
        originalExerciseName: String(r.original_exercise_name),
        performedExercisePublicId: String(r.performed_exercise_public_id),
        performedExerciseName: String(r.performed_exercise_name),
        reason: reasonCode,
        reasonLabel: SWAP_REASON_LABELS[reasonCode] || "Operacional",
        sequenceNumber: Number(r.sequence_number),
        pinnedMedia: media,
      });
    }

    return {
      totalConfirmedSwaps,
      remainingSwaps,
      maxSwapsAllowed: MAX_CONFIRMED_SWAPS_PER_WORKOUT,
      canSwap,
      substitutions,
    };
  } finally {
    connection.release();
  }
}

/**
 * Requests up to 3 valid exercise alternatives for a block item.
 * Evaluates deterministic filters, unavailable equipment, and invokes OpenAI reorder when quota permits.
 * Does NOT consume a swap until confirmed.
 */
export async function requestExerciseAlternatives(params: {
  ctx: TrainingAccessContext;
  sessionPublicId: string;
  blockItemPublicId: string;
  reason: ExerciseSwapReason;
}): Promise<{
  alternatives: ExerciseSwapAlternative[];
  remainingSwaps: number;
  currentExerciseName: string;
  message?: string;
}> {
  const { ctx, sessionPublicId, blockItemPublicId, reason } = params;
  assertStudentContext(ctx);

  // Validate allowed reasons (strictly operational, no pain/injury in V1)
  const validReasons: ExerciseSwapReason[] = [
    "MACHINE_OCCUPIED",
    "EQUIPMENT_BROKEN",
    "EQUIPMENT_UNAVAILABLE",
    "OTHER_OPERATIONAL",
  ];
  if (!validReasons.includes(reason)) {
    throw new TrainingAuthorizationError(
      "Motivo de substituição inválido. Selecione um motivo operacional.",
      "INVALID_REASON",
      400
    );
  }

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    // 1. Session verification & tenancy
    const [sessionRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, consultancy_id, student_membership_id, status
       FROM workout_execution_sessions
       WHERE public_id = ? LIMIT 1;`,
      [sessionPublicId]
    );

    if (!sessionRows || sessionRows.length === 0) {
      throw new TrainingAuthorizationError("Sessão de treino não encontrada.", "NOT_FOUND", 404);
    }

    const s = sessionRows[0];
    if (Number(s.consultancy_id) !== ctx.consultancyId) {
      throw new TrainingAuthorizationError("Acesso negado: sessão de outra consultoria.", "FORBIDDEN", 403);
    }
    if (Number(s.student_membership_id) !== ctx.membershipId) {
      throw new TrainingAuthorizationError("Acesso negado: sessão pertence a outro aluno.", "FORBIDDEN", 403);
    }
    if (s.status !== "IN_PROGRESS") {
      throw new TrainingAuthorizationError(
        "Substituições só são permitidas durante um treino em andamento.",
        "INVALID_SESSION_STATUS",
        400
      );
    }

    // 2. Check current swap count for this execution session
    const [countRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM workout_execution_exercise_substitutions
       WHERE execution_session_id = ?;`,
      [s.id]
    );
    const confirmedCount = Number(countRows[0]?.total || 0);
    if (confirmedCount >= MAX_CONFIRMED_SWAPS_PER_WORKOUT) {
      throw new TrainingAuthorizationError(
        "Você já utilizou as 3 substituições disponíveis para este treino.",
        "MAX_SWAPS_EXCEEDED",
        400
      );
    }

    const remainingSwaps = MAX_CONFIRMED_SWAPS_PER_WORKOUT - confirmedCount;

    // 3. Block item & exercise resolution
    const [itemRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        wbi.id,
        wbi.exercise_id,
        wbi.exercise_name_snapshot,
        wbi.muscle_group_snapshot,
        ex.id AS db_exercise_id,
        ex.public_id AS exercise_public_id,
        ex.name AS exercise_name,
        ex.muscle_group_primary,
        ex.equipment,
        ex.movement_pattern,
        ex.category
       FROM workout_block_items wbi
       LEFT JOIN exercises ex ON ex.id = wbi.exercise_id
       WHERE wbi.public_id = ? LIMIT 1;`,
      [blockItemPublicId]
    );

    if (!itemRows || itemRows.length === 0) {
      throw new TrainingAuthorizationError("Item de treino não encontrado.", "NOT_FOUND", 404);
    }

    const item = itemRows[0];

    // 4. Verify no set of this item has already been completed in this session
    const [completedSetsRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS completed_count
       FROM workout_execution_sets
       WHERE execution_session_id = ? AND block_item_id = ? AND completed_at IS NOT NULL;`,
      [s.id, item.id]
    );
    const completedSetsCount = Number(completedSetsRows[0]?.completed_count || 0);
    if (completedSetsCount > 0) {
      throw new TrainingAuthorizationError(
        "Este exercício já foi iniciado. Finalize ou pule antes de substituir.",
        "EXERCISE_ALREADY_STARTED",
        400
      );
    }

    // 5. Check if this item was already substituted in this session
    const [prevSubRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wees.performed_exercise_id, ex.id, ex.name, ex.equipment, ex.muscle_group_primary
       FROM workout_execution_exercise_substitutions wees
       INNER JOIN exercises ex ON ex.id = wees.performed_exercise_id
       WHERE wees.execution_session_id = ? AND wees.block_item_id = ?
       ORDER BY wees.sequence_number DESC LIMIT 1;`,
      [s.id, item.id]
    );

    const currentExerciseId = prevSubRows.length > 0 ? Number(prevSubRows[0].performed_exercise_id) : (item.exercise_id ? Number(item.exercise_id) : null);
    const currentExerciseName = prevSubRows.length > 0 ? String(prevSubRows[0].name) : String(item.exercise_name_snapshot || item.exercise_name || "Exercício");
    const currentEquipment = prevSubRows.length > 0 ? String(prevSubRows[0].equipment || "") : String(item.equipment || "");
    const targetMuscleGroup = prevSubRows.length > 0 ? String(prevSubRows[0].muscle_group_primary || "") : String(item.muscle_group_primary || item.muscle_group_snapshot || "");

    const unavailableEquipmentNorm = normalizeText(currentEquipment);

    // 6. Deterministic Library Candidate Search
    const [candidateRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
        id, public_id, name, muscle_group_primary, equipment, movement_pattern, category
       FROM exercises
       WHERE status = 'PUBLISHED'
         AND deleted_at IS NULL
         AND (scope = 'GLOBAL' OR (scope = 'CONSULTANCY' AND consultancy_id = ?))
       ORDER BY name ASC;`,
      [ctx.consultancyId]
    );

    // Exclude current exercise, original exercise, and unavailable equipment
    const filteredCandidates = candidateRows.filter((c) => {
      // Must not be the current or original exercise
      if (currentExerciseId && Number(c.id) === currentExerciseId) return false;
      if (item.exercise_id && Number(c.id) === Number(item.exercise_id)) return false;

      // Filter out same equipment if equipment is unavailable
      if (
        (reason === "MACHINE_OCCUPIED" || reason === "EQUIPMENT_BROKEN" || reason === "EQUIPMENT_UNAVAILABLE") &&
        unavailableEquipmentNorm.length > 0
      ) {
        const cEquipNorm = normalizeText(c.equipment);
        if (cEquipNorm === unavailableEquipmentNorm && cEquipNorm.length > 2) {
          return false;
        }
      }

      return true;
    });

    // Score candidates by biomechanical suitability
    const normTargetMuscle = normalizeText(targetMuscleGroup);
    const scoredCandidates = filteredCandidates.map((c) => {
      let score = 0;
      const cMuscleNorm = normalizeText(c.muscle_group_primary);

      // Primary muscle group match
      if (cMuscleNorm && normTargetMuscle && (cMuscleNorm.includes(normTargetMuscle) || normTargetMuscle.includes(cMuscleNorm))) {
        score += 50;
      }

      // Movement pattern match
      if (item.movement_pattern && c.movement_pattern && normalizeText(item.movement_pattern) === normalizeText(c.movement_pattern)) {
        score += 25;
      }

      // Category match
      if (item.category && c.category && normalizeText(item.category) === normalizeText(c.category)) {
        score += 15;
      }

      return { candidate: c, score };
    });

    // Filter to those sharing muscle group if possible, sorted descending
    const viableCandidates = scoredCandidates
      .filter((s) => s.score >= 25)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.candidate);

    if (viableCandidates.length === 0) {
      return {
        alternatives: [],
        remainingSwaps,
        currentExerciseName,
        message: "Não encontramos uma substituição segura para este exercício.",
      };
    }

    // Top shortlist for OpenAI rerank (up to 8)
    const shortlist = viableCandidates.slice(0, 8);

    // 7. OpenAI Rerank with Quota check & Deterministic Fallback
    const rerankedPublicIds: string[] = [];

    if (isOpenAiConfigured()) {
      try {
        const quotaReservation = await reserveAiQuota({
          consultancyId: ctx.consultancyId,
          memberId: ctx.membershipId,
          userId: ctx.userId,
          role: "STUDENT",
          feature: "STUDENT_EXERCISE_SWAP",
          model: "gpt-4o",
        });

        if (quotaReservation.success) {
          const client = getOpenAiClient();
          const prompt = `Exercício prescrito atual: "${currentExerciseName}"
Grupo muscular: "${targetMuscleGroup}"
Equipamento atual indisponível: "${currentEquipment}"
Motivo da troca: "${SWAP_REASON_LABELS[reason]}"

Candidatos disponíveis na biblioteca da academia:
${shortlist.map((c, i) => `${i + 1}. [ID: ${c.public_id}] "${c.name}" (Equipamento: ${c.equipment || "Geral"}, Músculo: ${c.muscle_group_primary || "Geral"})`).join("\n")}

Instrução: Selecione no máximo 3 melhores alternativas em ordem de adequação biomecânica.
Retorne um JSON estrito:
{
  "alternatives": [
    { "exercisePublicId": "<ID de um dos candidatos da lista>", "explanation": "<breve justificativa biomecânica em pt-BR>" }
  ]
}`;

          const completion = await client.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: "Você é um fisiologista do exercício e especialista em musculação do Trevo One. Você só pode selecionar exercícios com os IDs estritamente presentes na lista fornecida. Nunca invente exercícios ou IDs.",
              },
              { role: "user", content: prompt },
            ],
            response_format: { type: "json_object" },
            temperature: 0.2,
          });

          const content = completion.choices[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed.alternatives)) {
              // Ensure strictly only IDs from shortlist are accepted!
              const allowedIds = new Set(shortlist.map((c) => String(c.public_id)));
              for (const alt of parsed.alternatives) {
                if (alt.exercisePublicId && allowedIds.has(String(alt.exercisePublicId))) {
                  rerankedPublicIds.push(String(alt.exercisePublicId));
                }
              }
            }
          }

          if (quotaReservation.usageEventPublicId) {
            await markAiQuotaConsumed(quotaReservation.usageEventPublicId, {
              inputTokens: completion.usage?.prompt_tokens ?? 100,
              outputTokens: completion.usage?.completion_tokens ?? 50,
              totalTokens: completion.usage?.total_tokens ?? 150,
            });
          }
        }
      } catch (aiErr) {
        // Safe fallback without interrupting student
        console.warn("[ExerciseSubstitution] AI rerank fallback to deterministic:", aiErr);
      }
    }

    // 8. Assemble final top 3 alternatives
    const finalCandidates: RowDataPacket[] = [];
    if (rerankedPublicIds.length > 0) {
      for (const id of rerankedPublicIds.slice(0, 3)) {
        const found = shortlist.find((c) => String(c.public_id) === id);
        if (found && !finalCandidates.some((fc) => fc.id === found.id)) {
          finalCandidates.push(found);
        }
      }
    }

    // Fill up to 3 from deterministic shortlist if needed
    for (const c of shortlist) {
      if (finalCandidates.length >= 3) break;
      if (!finalCandidates.some((fc) => fc.id === c.id)) {
        finalCandidates.push(c);
      }
    }

    // Attach approved media for preview
    const alternatives: ExerciseSwapAlternative[] = [];
    for (const c of finalCandidates) {
      const media = await fetchMediaForExercise(connection, Number(c.id));
      alternatives.push({
        exercisePublicId: String(c.public_id),
        name: String(c.name),
        muscleGroupPrimary: c.muscle_group_primary ? String(c.muscle_group_primary) : null,
        equipment: c.equipment ? String(c.equipment) : null,
        explanation: `Substituto equivalente para ${targetMuscleGroup || "este grupo muscular"} sem depender de ${currentEquipment || "equipamento indisponível"}.`,
        pinnedMedia: media,
      });
    }

    return {
      alternatives,
      remainingSwaps,
      currentExerciseName,
    };
  } finally {
    connection.release();
  }
}

/**
 * Confirms an exercise substitution atomically.
 * Updates swap count strictly server-side with FOR UPDATE lock (max 3 per session).
 * Preserves prescription, sets and rep range; sets actual loads to empty.
 * Records audit event STUDENT_EXERCISE_SUBSTITUTED.
 */
export async function confirmExerciseSubstitution(params: {
  ctx: TrainingAccessContext;
  sessionPublicId: string;
  blockItemPublicId: string;
  performedExercisePublicId: string;
  reason: ExerciseSwapReason;
  idempotencyKey?: string;
}): Promise<{
  success: boolean;
  substitutionPublicId: string;
  remainingSwaps: number;
  performedExercise: {
    publicId: string;
    name: string;
    muscleGroupPrimary: string | null;
    equipment: string | null;
    pinnedMedia: BlockItemMediaDto[];
  };
}> {
  const { ctx, sessionPublicId, blockItemPublicId, performedExercisePublicId, reason } = params;
  assertStudentContext(ctx);

  const validReasons: ExerciseSwapReason[] = [
    "MACHINE_OCCUPIED",
    "EQUIPMENT_BROKEN",
    "EQUIPMENT_UNAVAILABLE",
    "OTHER_OPERATIONAL",
  ];
  if (!validReasons.includes(reason)) {
    throw new TrainingAuthorizationError(
      "Motivo de substituição inválido. Selecione um motivo operacional.",
      "INVALID_REASON",
      400
    );
  }

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Lock and validate execution session
    const [sessionRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, consultancy_id, student_membership_id, status
       FROM workout_execution_sessions
       WHERE public_id = ?
       LIMIT 1
       FOR UPDATE;`,
      [sessionPublicId]
    );

    if (!sessionRows || sessionRows.length === 0) {
      await connection.rollback();
      throw new TrainingAuthorizationError("Sessão de treino não encontrada.", "NOT_FOUND", 404);
    }

    const s = sessionRows[0];
    if (Number(s.consultancy_id) !== ctx.consultancyId) {
      await connection.rollback();
      throw new TrainingAuthorizationError("Acesso negado: sessão de outra consultoria.", "FORBIDDEN", 403);
    }
    if (Number(s.student_membership_id) !== ctx.membershipId) {
      await connection.rollback();
      throw new TrainingAuthorizationError("Acesso negado: sessão pertence a outro aluno.", "FORBIDDEN", 403);
    }
    if (s.status !== "IN_PROGRESS") {
      await connection.rollback();
      throw new TrainingAuthorizationError(
        "Substituições só são permitidas durante um treino em andamento.",
        "INVALID_SESSION_STATUS",
        400
      );
    }

    // 1.5. Idempotency check: if already confirmed with this key, return existing without consuming extra swap
    if (params.idempotencyKey) {
      const [existingIdempRows] = await connection.execute<RowDataPacket[]>(
        `SELECT
          wees.public_id,
          wees.sequence_number,
          ex.public_id AS performed_exercise_public_id,
          ex.name AS performed_exercise_name,
          ex.muscle_group_primary,
          ex.equipment,
          ex.id AS performed_exercise_id
         FROM workout_execution_exercise_substitutions wees
         INNER JOIN exercises ex ON ex.id = wees.performed_exercise_id
         WHERE wees.execution_session_id = ? AND wees.idempotency_key = ?
         LIMIT 1;`,
        [s.id, params.idempotencyKey]
      );

      if (existingIdempRows && existingIdempRows.length > 0) {
        const row = existingIdempRows[0];
        const media = await fetchMediaForExercise(connection, Number(row.performed_exercise_id));
        await connection.commit();
        const seq = Number(row.sequence_number);
        return {
          success: true,
          substitutionPublicId: String(row.public_id),
          remainingSwaps: Math.max(0, MAX_CONFIRMED_SWAPS_PER_WORKOUT - seq),
          performedExercise: {
            publicId: String(row.performed_exercise_public_id),
            name: String(row.performed_exercise_name),
            muscleGroupPrimary: row.muscle_group_primary ? String(row.muscle_group_primary) : null,
            equipment: row.equipment ? String(row.equipment) : null,
            pinnedMedia: media,
          },
        };
      }
    }

    // 2. Lock and check confirmed swap count strictly server-side
    const [countRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM workout_execution_exercise_substitutions
       WHERE execution_session_id = ?
       FOR UPDATE;`,
      [s.id]
    );

    const currentTotal = Number(countRows[0]?.total || 0);
    if (currentTotal >= MAX_CONFIRMED_SWAPS_PER_WORKOUT) {
      await connection.rollback();
      throw new TrainingAuthorizationError(
        "Você já utilizou as 3 substituições disponíveis para este treino.",
        "MAX_SWAPS_EXCEEDED",
        400
      );
    }

    const nextSequenceNumber = currentTotal + 1;

    // 3. Lock and validate block item
    const [itemRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, exercise_id, exercise_name_snapshot, muscle_group_snapshot
       FROM workout_block_items
       WHERE public_id = ?
       LIMIT 1
       FOR UPDATE;`,
      [blockItemPublicId]
    );

    if (!itemRows || itemRows.length === 0) {
      await connection.rollback();
      throw new TrainingAuthorizationError("Item de treino não encontrado.", "NOT_FOUND", 404);
    }

    const item = itemRows[0];

    // 4. Verify no set of this item has already been completed in this session
    const [completedSetsRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS completed_count
       FROM workout_execution_sets
       WHERE execution_session_id = ? AND block_item_id = ? AND completed_at IS NOT NULL
       FOR UPDATE;`,
      [s.id, item.id]
    );
    const completedSetsCount = Number(completedSetsRows[0]?.completed_count || 0);
    if (completedSetsCount > 0) {
      await connection.rollback();
      throw new TrainingAuthorizationError(
        "Este exercício já foi iniciado. Finalize ou pule antes de substituir.",
        "EXERCISE_ALREADY_STARTED",
        400
      );
    }

    // 5. Validate performed exercise from library (Exercise Library is authority!)
    const [performedRows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, public_id, name, muscle_group_primary, equipment
       FROM exercises
       WHERE public_id = ?
         AND status = 'PUBLISHED'
         AND deleted_at IS NULL
         AND (scope = 'GLOBAL' OR (scope = 'CONSULTANCY' AND consultancy_id = ?))
       LIMIT 1;`,
      [performedExercisePublicId, ctx.consultancyId]
    );

    if (!performedRows || performedRows.length === 0) {
      await connection.rollback();
      throw new TrainingAuthorizationError(
        "Exercício substituto inválido ou indisponível na biblioteca.",
        "INVALID_EXERCISE",
        400
      );
    }

    const performed = performedRows[0];

    // 6. Resolve original prescribed exercise ID
    let originalExerciseId: number;
    const originalExerciseName: string = item.exercise_name_snapshot || "Exercício Prescrito";

    if (item.exercise_id) {
      originalExerciseId = Number(item.exercise_id);
    } else {
      // If custom without exercise_id, fallback to first substitution's original or performed id
      originalExerciseId = Number(performed.id);
    }

    const substitutionPublicId = crypto.randomUUID();

    // 7. Insert substitution record atomically
    await connection.execute<ResultSetHeader>(
      `INSERT INTO workout_execution_exercise_substitutions (
        public_id,
        consultancy_id,
        execution_session_id,
        student_membership_id,
        block_item_id,
        original_exercise_id,
        performed_exercise_id,
        reason,
        source,
        sequence_number,
        idempotency_key,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'STUDENT_AI_SUGGESTION', ?, ?, NOW(3));`,
      [
        substitutionPublicId,
        ctx.consultancyId,
        s.id,
        ctx.membershipId,
        item.id,
        originalExerciseId,
        performed.id,
        reason,
        nextSequenceNumber,
        params.idempotencyKey || null,
      ]
    );

    // 8. Fetch media for the performed exercise
    const media = await fetchMediaForExercise(connection, Number(performed.id));

    await connection.commit();

    const remainingSwaps = MAX_CONFIRMED_SWAPS_PER_WORKOUT - nextSequenceNumber;

    // 9. Dispatch audit activity event
    await recordConsultancyActivity({
      consultancyId: ctx.consultancyId,
      actorUserId: ctx.userId,
      actorMembershipId: ctx.membershipId,
      actorRole: "STUDENT",
      action: "STUDENT_EXERCISE_SUBSTITUTED",
      module: "STUDENT",
      resourceType: "WORKOUT_EXECUTION_SESSION",
      resourcePublicId: String(s.public_id),
      summary: `Substituiu o exercício "${originalExerciseName}" por "${performed.name}" no treino (Motivo: ${SWAP_REASON_LABELS[reason]} · Troca #${nextSequenceNumber})`,
      metadata: {
        workoutExecutionPublicId: String(s.public_id),
        blockItemPublicId,
        prescribedExercisePublicId: item.exercise_id ? String(item.exercise_id) : null,
        prescribedExerciseName: originalExerciseName,
        performedExercisePublicId: String(performed.public_id),
        performedExerciseName: String(performed.name),
        reason,
        reasonLabel: SWAP_REASON_LABELS[reason],
        swapSequence: nextSequenceNumber,
      },
    });

    return {
      success: true,
      substitutionPublicId,
      remainingSwaps,
      performedExercise: {
        publicId: String(performed.public_id),
        name: String(performed.name),
        muscleGroupPrimary: performed.muscle_group_primary ? String(performed.muscle_group_primary) : null,
        equipment: performed.equipment ? String(performed.equipment) : null,
        pinnedMedia: media,
      },
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}
