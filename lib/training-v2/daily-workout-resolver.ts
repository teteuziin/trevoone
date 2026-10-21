import type { RowDataPacket } from "mysql2/promise";
import { getDbConnection } from "../db/mysql";
import { assertStudentContext, type TrainingAccessContext } from "./access";
import { getConsultancyLocalDate } from "../consultancies/timezone";

export type DailyWorkoutDecisionStatus =
  | "IN_PROGRESS"        // Prioridade A: Sessão atualmente em andamento
  | "SCHEDULED_TODAY"     // Prioridade B: Calendário com divisão prescrita para hoje
  | "COMPLETED_TODAY"     // Prioridade B: Divisão do dia já realizada hoje
  | "REST_DAY"            // Prioridade B: Calendário ativo, mas hoje é dia de descanso
  | "NEXT_IN_SEQUENCE"    // Prioridade C: Próxima divisão na sequência de ciclos
  | "SEQUENCE_COMPLETED"  // Prioridade C: Treino sequencial concluído hoje
  | "CHOOSE_WORKOUT"      // Prioridade D: Prescrição sem programação clara ou ambígua
  | "NO_ASSIGNMENT"       // Sem ficha/rotina atribuída
  | "ERROR";              // Falha ao carregar

export interface DailyWorkoutDivisionOption {
  publicId: string;
  blockIndex: number;
  title: string;
  subtitle?: string | null;
  scheduledDaysLabel?: string | null;
  scheduledWeekdays: number[];
  exerciseCount: number;
  status:
    | "SCHEDULED_TODAY"
    | "IN_PROGRESS"
    | "COMPLETED_TODAY"
    | "PENDING_CYCLE"
    | "COMPLETED_CYCLE"
    | "AVAILABLE";
}

export interface DailyWorkoutResolution {
  status: DailyWorkoutDecisionStatus;
  headlineTitle: string; // "Treino em andamento", "Treino de hoje", "Próximo treino", "Dia de descanso", "Escolher treino"
  divisionTitle: string; // Ex: "Treino A — Peitoral e Tríceps" ou "Recuperação muscular"
  routineTitle: string; // Ex: "Treino de reabilitação"
  versionNumber?: number;
  assignmentPublicId: string | null;
  activeSessionPublicId?: string | null;
  targetBlockPublicId?: string | null;
  targetBlockIndex?: number | null;
  actionHref: string;
  actionLabel: string; // "Continuar treino", "Iniciar treino", "Treinar novamente", "Escolher treino"
  canChangeDivision: boolean;
  contextNote?: string | null;
  exerciseCount?: number;
  estimatedDurationMinutes?: number | null;
  availableDivisions: DailyWorkoutDivisionOption[];
  todayWeekday: number; // 0 (Dom) a 6 (Sáb)
  todayWeekdayName: string;
  todayDateStr: string; // YYYY-MM-DD
  consultancyTimezone: string;
}

import { buildStudentWorkoutExecutionUrl } from "./route-helpers";
export { buildStudentWorkoutExecutionUrl };

const WEEKDAY_NAMES_PT = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

const WEEKDAY_SHORT_NAMES_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/**
 * Normaliza texto e extrai os dias da semana prescritos (0 = Domingo ... 6 = Sábado).
 */
export function parseScheduledWeekdays(
  title?: string | null,
  instructions?: string | null
): number[] {
  const text = `${title || ""} ${instructions || ""}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // remove acentos

  const days: number[] = [];

  if (/\b(segunda(?:-feira)?|seg)\b/.test(text)) days.push(1);
  if (/\b(terca(?:-feira)?|terça(?:-feira)?|ter)\b/.test(text)) days.push(2);
  if (/\b(quarta(?:-feira)?|qua)\b/.test(text)) days.push(3);
  if (/\b(quinta(?:-feira)?|qui)\b/.test(text)) days.push(4);
  if (/\b(sexta(?:-feira)?|sex)\b/.test(text)) days.push(5);
  if (/\b(sabado|sab)\b/.test(text)) days.push(6);
  if (/\b(domingo|dom)\b/.test(text)) days.push(0);

  return Array.from(new Set(days)).sort((a, b) => a - b);
}

export function formatScheduledWeekdaysLabel(days: number[]): string | null {
  if (!days || days.length === 0) return null;
  if (days.length === 1) {
    return WEEKDAY_NAMES_PT[days[0]];
  }
  return days.map((d) => WEEKDAY_SHORT_NAMES_PT[d]).join(", ");
}

/**
 * Calcula o próximo bloco na sequência considerando os treinos já concluídos no ciclo atual.
 * Preserva a sequência pendente quando o aluno escolhe uma divisão fora de ordem.
 *
 * Exemplo: Blocos [A, B, C]. Aluno escolhe C e conclui.
 * Restam pendentes no ciclo: [A, B].
 * Próximo sugerido: A.
 * Após concluir A, próximo: B.
 * Após concluir B, todos concluídos -> ciclo reinicia com A.
 */
export function resolveNextBlockInCycle(
  blockIds: number[],
  completedBlockIdsRecent: number[]
): { nextIndex: number; pendingIndices: number[]; isNewCycle: boolean } {
  if (blockIds.length === 0) {
    return { nextIndex: 0, pendingIndices: [], isNewCycle: true };
  }
  if (blockIds.length === 1) {
    return { nextIndex: 0, pendingIndices: [0], isNewCycle: false };
  }

  // Descobre quais blocos do ciclo atual já foram executados
  // Varre o histórico do mais recente ao mais antigo para delimitar o ciclo
  const completedInCurrentCycle = new Set<number>();
  for (const bId of completedBlockIdsRecent) {
    if (blockIds.includes(bId)) {
      if (completedInCurrentCycle.has(bId)) {
        // Encontrou repetição do mesmo bloco, significa que delimitamos o início do ciclo mais recente
        break;
      }
      completedInCurrentCycle.add(bId);
      // Se todos os blocos já foram contemplados, o ciclo fechou
      if (completedInCurrentCycle.size === blockIds.length) {
        break;
      }
    }
  }

  // Se todos os blocos do ciclo foram concluídos, inicia um novo ciclo no índice 0
  if (completedInCurrentCycle.size === blockIds.length || completedInCurrentCycle.size === 0) {
    return {
      nextIndex: 0,
      pendingIndices: blockIds.map((_, i) => i),
      isNewCycle: true,
    };
  }

  // Caso haja pendentes, pega o primeiro índice da ordem natural que ainda não foi executado
  const pendingIndices: number[] = [];
  for (let i = 0; i < blockIds.length; i++) {
    if (!completedInCurrentCycle.has(blockIds[i])) {
      pendingIndices.push(i);
    }
  }

  return {
    nextIndex: pendingIndices.length > 0 ? pendingIndices[0] : 0,
    pendingIndices,
    isNewCycle: false,
  };
}

/**
 * Autoridade central compartilhada para resolver o treino do dia do aluno.
 * Usado pelo Dashboard, tela de Treinos e Retomada de sessão.
 */
export async function resolveStudentDailyWorkout(
  ctx: TrainingAccessContext,
  options?: { consultancyTimezone?: string; consultancySlug?: string }
): Promise<DailyWorkoutResolution> {
  assertStudentContext(ctx);

  let connection;
  try {
    connection = await getDbConnection();

    // 1. Resolução do Fuso Horário e Data Civil Local
    let timeZone = options?.consultancyTimezone;
    if (!timeZone && ctx.consultancyId) {
      const [consRows] = await connection.execute<RowDataPacket[]>(
        `SELECT timezone FROM consultancies WHERE id = ? LIMIT 1;`,
        [ctx.consultancyId]
      );
      timeZone = consRows && consRows[0]?.timezone ? String(consRows[0].timezone) : "America/Sao_Paulo";
    }
    if (!timeZone) timeZone = "America/Sao_Paulo";

    const todayDateStr = getConsultancyLocalDate(timeZone);
    const [tY, tM, tD] = todayDateStr.split("-").map(Number);
    // Data UTC ao meio-dia para calcular weekday de forma infalível
    const localRefDate = new Date(Date.UTC(tY, tM - 1, tD, 12, 0, 0));
    const todayWeekday = localRefDate.getUTCDay();
    const todayWeekdayName = WEEKDAY_NAMES_PT[todayWeekday];
    const consultancySlug = options?.consultancySlug || "";

    // 2. PRIORIDADE A: Sessão em andamento
    const [inProgressRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
         wes.id AS session_id,
         wes.public_id AS session_public_id,
         wes.workout_assignment_id,
         wes.workout_version_id,
         wes.started_at,
         wa.public_id AS assignment_public_id,
         wa.status AS assignment_status,
         wv.title AS routine_title,
         wv.version_number
       FROM workout_execution_sessions wes
       INNER JOIN workout_assignments wa ON wa.id = wes.workout_assignment_id
       INNER JOIN workout_versions wv ON wv.id = wes.workout_version_id
       WHERE wes.consultancy_id = ?
         AND (wes.student_membership_id = ? OR wes.student_membership_id IN (SELECT id FROM consultancy_members WHERE user_id = ? AND consultancy_id = ?))
         AND wes.status = 'IN_PROGRESS'
         AND wa.deleted_at IS NULL
       LIMIT 1;`,
      [ctx.consultancyId!, ctx.membershipId!, ctx.userId, ctx.consultancyId!]
    );

    if (inProgressRows && inProgressRows.length > 0) {
      const activeSession = inProgressRows[0];

      // Busca qual bloco está sendo executado nesta sessão
      const [blockInExecRows] = await connection.execute<RowDataPacket[]>(
        `SELECT wb.id, wb.public_id, wb.title, wb.sort_order
         FROM workout_execution_sets wex
         INNER JOIN workout_block_items wbi ON wbi.id = wex.block_item_id
         INNER JOIN workout_blocks wb ON wb.id = wbi.block_id
         WHERE wex.execution_session_id = ?
         ORDER BY wex.completed_at DESC, wex.set_number ASC
         LIMIT 1;`,
        [activeSession.session_id]
      );

      const activeBlock = blockInExecRows && blockInExecRows.length > 0 ? blockInExecRows[0] : null;

      // Carrega blocos para opções de troca
      const [allBlocksRows] = await connection.execute<RowDataPacket[]>(
        `SELECT wb.id, wb.public_id, wb.title, wb.sort_order, wb.instructions,
                (SELECT COUNT(*) FROM workout_block_items wbi WHERE wbi.block_id = wb.id) AS exercise_count
         FROM workout_blocks wb
         WHERE wb.workout_version_id = ?
         ORDER BY wb.sort_order ASC;`,
        [activeSession.workout_version_id]
      );

      const availableDivisions: DailyWorkoutDivisionOption[] = (allBlocksRows || []).map((b, idx) => {
        const weekdays = parseScheduledWeekdays(b.title, b.instructions);
        const isThisBlockActive = activeBlock && activeBlock.id === b.id;
        return {
          publicId: String(b.public_id),
          blockIndex: idx,
          title: b.title ? String(b.title) : `Divisão ${String.fromCharCode(65 + idx)}`,
          scheduledDaysLabel: formatScheduledWeekdaysLabel(weekdays),
          scheduledWeekdays: weekdays,
          exerciseCount: Number(b.exercise_count || 0),
          status: isThisBlockActive
            ? "IN_PROGRESS"
            : weekdays.includes(todayWeekday)
            ? "SCHEDULED_TODAY"
            : "AVAILABLE",
        };
      });

      const divisionTitle = activeBlock?.title
        ? String(activeBlock.title)
        : availableDivisions[0]?.title || "Sessão em andamento";

      return {
        status: "IN_PROGRESS",
        headlineTitle: "Treino em andamento",
        divisionTitle,
        routineTitle: String(activeSession.routine_title),
        versionNumber: Number(activeSession.version_number),
        assignmentPublicId: String(activeSession.assignment_public_id),
        activeSessionPublicId: String(activeSession.session_public_id),
        targetBlockPublicId: activeBlock ? String(activeBlock.public_id) : null,
        targetBlockIndex: activeBlock ? availableDivisions.findIndex((d) => d.publicId === activeBlock.public_id) : 0,
        actionHref: buildStudentWorkoutExecutionUrl(
          consultancySlug,
          String(activeSession.assignment_public_id),
          activeBlock ? String(activeBlock.public_id) : null
        ),
        actionLabel: "Continuar treino",
        canChangeDivision: availableDivisions.length > 1,
        contextNote: "Você possui uma sessão em andamento. Continue de onde parou.",
        exerciseCount: activeBlock
          ? availableDivisions.find((d) => d.publicId === activeBlock.public_id)?.exerciseCount
          : undefined,
        availableDivisions,
        todayWeekday,
        todayWeekdayName,
        todayDateStr,
        consultancyTimezone: timeZone,
      };
    }

    // 3. Busca prescrição ativa do aluno
    const [assignRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
         wa.id AS assignment_id,
         wa.public_id AS assignment_public_id,
         wa.notes_for_student,
         DATE_FORMAT(wa.starts_on, '%Y-%m-%d') AS starts_on,
         DATE_FORMAT(wa.ends_on, '%Y-%m-%d') AS ends_on,
         wv.id AS version_id,
         wv.public_id AS version_public_id,
         wv.title AS routine_title,
         wv.subtitle,
         wv.version_number,
         wv.estimated_duration_minutes,
         wv.difficulty_level
       FROM workout_assignments wa
       INNER JOIN workout_versions wv ON wv.id = wa.workout_version_id
       INNER JOIN workouts w ON w.id = wv.workout_id
       WHERE wa.consultancy_id = ?
         AND wa.student_membership_id = ?
         AND wa.status = 'ACTIVE'
         AND wa.deleted_at IS NULL
         AND w.deleted_at IS NULL
       ORDER BY wa.starts_on DESC, wa.created_at DESC
       LIMIT 1;`,
      [ctx.consultancyId!, ctx.membershipId!]
    );

    if (!assignRows || assignRows.length === 0) {
      return {
        status: "NO_ASSIGNMENT",
        headlineTitle: "Sem treino atribuído",
        divisionTitle: "Nenhuma ficha ativa",
        routineTitle: "Nenhuma prescrição no momento",
        assignmentPublicId: null,
        actionHref: `/consultoria/${consultancySlug}/treinos`,
        actionLabel: "Ver treinos",
        canChangeDivision: false,
        contextNote: "Seu treinador ainda não liberou sua ficha de treino.",
        availableDivisions: [],
        todayWeekday,
        todayWeekdayName,
        todayDateStr,
        consultancyTimezone: timeZone,
      };
    }

    const currentAssign = assignRows[0];

    // 4. Carrega os blocos da versão
    const [blockRows] = await connection.execute<RowDataPacket[]>(
      `SELECT wb.id, wb.public_id, wb.title, wb.sort_order, wb.instructions,
              (SELECT COUNT(*) FROM workout_block_items wbi WHERE wbi.block_id = wb.id) AS exercise_count
       FROM workout_blocks wb
       WHERE wb.workout_version_id = ?
       ORDER BY wb.sort_order ASC;`,
      [currentAssign.version_id]
    );

    if (!blockRows || blockRows.length === 0) {
      return {
        status: "CHOOSE_WORKOUT",
        headlineTitle: "Ficha em elaboração",
        divisionTitle: String(currentAssign.routine_title),
        routineTitle: String(currentAssign.routine_title),
        versionNumber: Number(currentAssign.version_number),
        assignmentPublicId: String(currentAssign.assignment_public_id),
        actionHref: `/consultoria/${consultancySlug}/treinos/${currentAssign.assignment_public_id}`,
        actionLabel: "Abrir ficha",
        canChangeDivision: false,
        contextNote: "Esta ficha ainda não possui divisões com exercícios cadastrados.",
        availableDivisions: [],
        todayWeekday,
        todayWeekdayName,
        todayDateStr,
        consultancyTimezone: timeZone,
      };
    }

    // 5. Histórico de sessões concluídas desta prescrição
    const [historyRows] = await connection.execute<RowDataPacket[]>(
      `SELECT
         wes.id AS session_id,
         wes.public_id AS session_public_id,
         wes.started_at,
         wes.completed_at,
         (
           SELECT wb.id
           FROM workout_execution_sets wex
           INNER JOIN workout_block_items wbi ON wbi.id = wex.block_item_id
           INNER JOIN workout_blocks wb ON wb.id = wbi.block_id
           WHERE wex.execution_session_id = wes.id AND wex.completed_at IS NOT NULL
           ORDER BY wex.completed_at DESC, wex.id DESC
           LIMIT 1
         ) AS completed_block_id,
         (
           SELECT wb.public_id
           FROM workout_execution_sets wex
           INNER JOIN workout_block_items wbi ON wbi.id = wex.block_item_id
           INNER JOIN workout_blocks wb ON wb.id = wbi.block_id
           WHERE wex.execution_session_id = wes.id AND wex.completed_at IS NOT NULL
           ORDER BY wex.completed_at DESC, wex.id DESC
           LIMIT 1
         ) AS completed_block_public_id
       FROM workout_execution_sessions wes
       WHERE wes.workout_assignment_id = ?
         AND wes.status = 'COMPLETED'
       ORDER BY wes.completed_at DESC
       LIMIT 30;`,
      [currentAssign.assignment_id]
    );

    // Mapeia histórico com data civil no fuso da consultoria
    const recentCompletedSessions = (historyRows || []).map((r) => {
      const completedDateUtc = r.completed_at ? new Date(r.completed_at) : null;
      const localDate = completedDateUtc ? getConsultancyLocalDate(timeZone, completedDateUtc) : "";
      return {
        sessionId: Number(r.session_id),
        sessionPublicId: String(r.session_public_id),
        localDateStr: localDate,
        completedBlockId: r.completed_block_id != null ? Number(r.completed_block_id) : null,
        completedBlockPublicId: r.completed_block_public_id ? String(r.completed_block_public_id) : null,
      };
    });

    const sessionCompletedToday = recentCompletedSessions.find((s) => s.localDateStr === todayDateStr);

    // 6. Analisa se há programação de Calendário (Dias da semana explícitos)
    const blocksWithSchedule = blockRows.map((b) => ({
      id: Number(b.id),
      publicId: String(b.public_id),
      title: b.title ? String(b.title) : "",
      instructions: b.instructions ? String(b.instructions) : null,
      exerciseCount: Number(b.exercise_count || 0),
      weekdays: parseScheduledWeekdays(b.title, b.instructions),
    }));

    const hasCalendarSchedule = blocksWithSchedule.some((b) => b.weekdays.length > 0);

    // 7. PRIORIDADE B: Programação com dias definidos (Calendário)
    if (hasCalendarSchedule) {
      const scheduledBlockToday = blocksWithSchedule.find((b) => b.weekdays.includes(todayWeekday));

      // Monta lista de divisões com badges informativos
      const availableDivisions: DailyWorkoutDivisionOption[] = blocksWithSchedule.map((b, idx) => {
        const isScheduledToday = b.weekdays.includes(todayWeekday);
        const wasCompletedToday = sessionCompletedToday?.completedBlockPublicId === b.publicId;

        let divisionStatus: DailyWorkoutDivisionOption["status"] = "AVAILABLE";
        if (wasCompletedToday) {
          divisionStatus = "COMPLETED_TODAY";
        } else if (isScheduledToday) {
          divisionStatus = "SCHEDULED_TODAY";
        }

        return {
          publicId: b.publicId,
          blockIndex: idx,
          title: b.title || `Divisão ${String.fromCharCode(65 + idx)}`,
          scheduledDaysLabel: formatScheduledWeekdaysLabel(b.weekdays),
          scheduledWeekdays: b.weekdays,
          exerciseCount: b.exerciseCount,
          status: divisionStatus,
        };
      });

      if (scheduledBlockToday) {
        // Bloco previsto para hoje existe
        const wasCompletedToday = sessionCompletedToday?.completedBlockPublicId === scheduledBlockToday.publicId;
        const blockIdx = availableDivisions.findIndex((d) => d.publicId === scheduledBlockToday.publicId);

        if (wasCompletedToday) {
          return {
            status: "COMPLETED_TODAY",
            headlineTitle: "Treino de hoje (concluído)",
            divisionTitle: scheduledBlockToday.title || `Divisão ${String.fromCharCode(65 + blockIdx)}`,
            routineTitle: String(currentAssign.routine_title),
            versionNumber: Number(currentAssign.version_number),
            assignmentPublicId: String(currentAssign.assignment_public_id),
            targetBlockPublicId: scheduledBlockToday.publicId,
            targetBlockIndex: blockIdx,
            actionHref: buildStudentWorkoutExecutionUrl(
              consultancySlug,
              String(currentAssign.assignment_public_id),
              scheduledBlockToday.publicId
            ),
            actionLabel: "Treinar novamente",
            canChangeDivision: availableDivisions.length > 1,
            contextNote: "Você já realizou este treino hoje. Sua programação semanal permanece mantida.",
            exerciseCount: scheduledBlockToday.exerciseCount,
            estimatedDurationMinutes: currentAssign.estimated_duration_minutes != null ? Number(currentAssign.estimated_duration_minutes) : null,
            availableDivisions,
            todayWeekday,
            todayWeekdayName,
            todayDateStr,
            consultancyTimezone: timeZone,
          };
        }

        return {
          status: "SCHEDULED_TODAY",
          headlineTitle: "Treino de hoje",
          divisionTitle: scheduledBlockToday.title || `Divisão ${String.fromCharCode(65 + blockIdx)}`,
          routineTitle: String(currentAssign.routine_title),
          versionNumber: Number(currentAssign.version_number),
          assignmentPublicId: String(currentAssign.assignment_public_id),
          targetBlockPublicId: scheduledBlockToday.publicId,
          targetBlockIndex: blockIdx,
          actionHref: buildStudentWorkoutExecutionUrl(
            consultancySlug,
            String(currentAssign.assignment_public_id),
            scheduledBlockToday.publicId
          ),
          actionLabel: "Iniciar treino",
          canChangeDivision: availableDivisions.length > 1,
          contextNote: `Programado para ${todayWeekdayName}.`,
          exerciseCount: scheduledBlockToday.exerciseCount,
          estimatedDurationMinutes: currentAssign.estimated_duration_minutes != null ? Number(currentAssign.estimated_duration_minutes) : null,
          availableDivisions,
          todayWeekday,
          todayWeekdayName,
          todayDateStr,
          consultancyTimezone: timeZone,
        };
      }

      // Hoje não há treino programado no calendário -> Dia de descanso
      return {
        status: "REST_DAY",
        headlineTitle: "Dia de descanso",
        divisionTitle: "Recuperação muscular",
        routineTitle: String(currentAssign.routine_title),
        versionNumber: Number(currentAssign.version_number),
        assignmentPublicId: String(currentAssign.assignment_public_id),
        targetBlockPublicId: availableDivisions[0]?.publicId || null,
        targetBlockIndex: 0,
        actionHref: buildStudentWorkoutExecutionUrl(
          consultancySlug,
          String(currentAssign.assignment_public_id)
        ),
        actionLabel: "Escolher treino",
        canChangeDivision: availableDivisions.length > 0,
        contextNote: "Nenhum treino programado para hoje no seu calendário. Se desejar treinar, escolha uma divisão.",
        exerciseCount: 0,
        availableDivisions,
        todayWeekday,
        todayWeekdayName,
        todayDateStr,
        consultancyTimezone: timeZone,
      };
    }

    // 8. PRIORIDADE C: Programação Sequencial sem dias fixos
    const blockIds = blocksWithSchedule.map((b) => b.id);
    const completedBlockIdsRecent = recentCompletedSessions
      .map((s) => s.completedBlockId)
      .filter((id): id is number => id !== null);

    const { nextIndex, pendingIndices } = resolveNextBlockInCycle(blockIds, completedBlockIdsRecent);

    const targetBlock = blocksWithSchedule[nextIndex] || blocksWithSchedule[0];
    const isCompletedToday = Boolean(sessionCompletedToday);

    const availableDivisions: DailyWorkoutDivisionOption[] = blocksWithSchedule.map((b, idx) => {
      const wasCompletedToday = sessionCompletedToday?.completedBlockPublicId === b.publicId;
      const isPendingInCycle = pendingIndices.includes(idx);

      let divisionStatus: DailyWorkoutDivisionOption["status"] = "AVAILABLE";
      if (wasCompletedToday) {
        divisionStatus = "COMPLETED_TODAY";
      } else if (idx === nextIndex) {
        divisionStatus = "PENDING_CYCLE";
      } else if (!isPendingInCycle) {
        divisionStatus = "COMPLETED_CYCLE";
      } else {
        divisionStatus = "PENDING_CYCLE";
      }

      return {
        publicId: b.publicId,
        blockIndex: idx,
        title: b.title || `Divisão ${String.fromCharCode(65 + idx)}`,
        scheduledDaysLabel: null,
        scheduledWeekdays: [],
        exerciseCount: b.exerciseCount,
        status: divisionStatus,
      };
    });

    const divisionTitle = targetBlock.title || `Divisão ${String.fromCharCode(65 + nextIndex)}`;

    return {
      status: isCompletedToday ? "SEQUENCE_COMPLETED" : "NEXT_IN_SEQUENCE",
      headlineTitle: isCompletedToday ? "Próximo treino (já treinou hoje)" : "Próximo treino",
      divisionTitle,
      routineTitle: String(currentAssign.routine_title),
      versionNumber: Number(currentAssign.version_number),
      assignmentPublicId: String(currentAssign.assignment_public_id),
      targetBlockPublicId: targetBlock.publicId,
      targetBlockIndex: nextIndex,
      actionHref: buildStudentWorkoutExecutionUrl(
        consultancySlug,
        String(currentAssign.assignment_public_id),
        targetBlock.publicId
      ),
      actionLabel: isCompletedToday ? "Treinar novamente" : "Iniciar treino",
      canChangeDivision: availableDivisions.length > 1,
      contextNote: isCompletedToday
        ? `Você já completou um treino hoje. O próximo na sua sequência é a divisão ${nextIndex + 1} de ${blocksWithSchedule.length}.`
        : `Divisão ${nextIndex + 1} de ${blocksWithSchedule.length} da sua sequência.`,
      exerciseCount: targetBlock.exerciseCount,
      estimatedDurationMinutes: currentAssign.estimated_duration_minutes != null ? Number(currentAssign.estimated_duration_minutes) : null,
      availableDivisions,
      todayWeekday,
      todayWeekdayName,
      todayDateStr,
      consultancyTimezone: timeZone,
    };
  } catch (error) {
    console.error("[DailyWorkoutResolver] Error resolving daily workout:", error);
    return {
      status: "ERROR",
      headlineTitle: "Falha ao consultar treino",
      divisionTitle: "Não foi possível carregar",
      routineTitle: "Erro na sincronização",
      assignmentPublicId: null,
      actionHref: `/consultoria/${options?.consultancySlug || ""}/treinos`,
      actionLabel: "Tentar novamente",
      canChangeDivision: false,
      contextNote: "Ocorreu uma instabilidade momentânea ao carregar a programação do seu treino.",
      availableDivisions: [],
      todayWeekday: 0,
      todayWeekdayName: "Hoje",
      todayDateStr: "",
      consultancyTimezone: "America/Sao_Paulo",
    };
  } finally {
    if (connection) connection.release();
  }
}
