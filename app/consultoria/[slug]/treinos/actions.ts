"use server";

/**
 * TREVO ONE — STUDENT WORKOUT EXECUTION SERVER ACTIONS
 * Safe server-side execution session controls for assigned student workouts.
 */

import { getCurrentSession } from "@/lib/auth/session";
import { evaluateStudentMonitoring } from "@/lib/monitoring/evaluator";
import { resolveTrainingAccessContext } from "@/lib/training-v2/access";
import {
  startOrResumeWorkoutExecution,
  completeWorkoutExecutionSet,
  completeWorkoutExecution,
  toggleWorkoutExecutionExercise,
  skipWorkoutExecutionExercise,
  syncOfflineWorkoutExecution,
  TrainingSessionConflictError,
  type SyncOfflineWorkoutExecutionInput,
  type ToggleExerciseCompletionResult,
} from "@/lib/training-v2/execution-repository";
import type {
  WorkoutExecutionSessionDto,
  WorkoutExecutionSetDto,
} from "@/lib/training-v2/types";

export type StartOrResumeExecutionResult = {
  success: boolean;
  session?: WorkoutExecutionSessionDto;
  conflict?: {
    activeSession: {
      publicId: string;
      workoutBlockId: number | null;
      workoutBlockPublicId: string | null;
      workoutBlockTitle: string | null;
      startedAt: Date;
    };
    targetBlock: {
      id: number;
      publicId: string;
      title: string;
    };
  };
  error?: string;
};

export type CompleteExecutionSetResult = {
  success: boolean;
  set?: WorkoutExecutionSetDto;
  error?: string;
};

export type CompleteWorkoutExecutionResult = {
  success: boolean;
  session?: WorkoutExecutionSessionDto;
  error?: string;
};

/**
 * Starts a new execution session or resumes an existing IN_PROGRESS session.
 * Fully validated server-side against student tenancy and ownership.
 */
export async function startOrResumeWorkoutExecutionAction(
  slug: string,
  assignmentPublicId: string,
  targetBlockPublicId?: string | null,
  options?: { resolveConflict?: "COMPLETE_EARLY" | "ABANDON" | "RESUME" }
): Promise<StartOrResumeExecutionResult> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Não autenticado." };
  }

  const ctx = await resolveTrainingAccessContext(slug);
  if (!ctx) {
    return { success: false, error: "Acesso não autorizado à consultoria." };
  }

  if (!ctx.isStudent && !ctx.hasRole("STUDENT")) {
    return { success: false, error: "Apenas alunos podem iniciar execução de treinos." };
  }

  try {
    const executionSession = await startOrResumeWorkoutExecution(
      ctx,
      assignmentPublicId,
      targetBlockPublicId,
      options
    );
    return {
      success: true,
      session: executionSession,
    };
  } catch (err: unknown) {
    if (err instanceof TrainingSessionConflictError) {
      return {
        success: false,
        conflict: {
          activeSession: err.activeSession,
          targetBlock: err.targetBlock,
        },
        error: err.message,
      };
    }
    const message = err instanceof Error ? err.message : "Erro ao iniciar treino.";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Concludes an individual execution set in an active workout session.
 * Fully validated server-side against student role, tenancy, and session ownership.
 */
export async function completeWorkoutExecutionSetAction(
  slug: string,
  sessionPublicId: string,
  setPublicId: string,
  input: {
    actualReps?: number | string | null;
    actualLoadKg?: number | string | null;
    isSkipped?: boolean;
  }
): Promise<CompleteExecutionSetResult> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Não autenticado." };
  }

  const ctx = await resolveTrainingAccessContext(slug);
  if (!ctx) {
    return { success: false, error: "Acesso não autorizado à consultoria." };
  }

  if (!ctx.isStudent && !ctx.hasRole("STUDENT")) {
    return { success: false, error: "Apenas alunos podem concluir séries de treino." };
  }

  if (input == null || typeof input !== "object") {
    return { success: false, error: "Dados de realização da série são obrigatórios." };
  }

  // Server-side validation of actualReps (optional: null or integer between 0 and 65535)
  let validatedActualReps: number | null = null;
  if (input.actualReps !== undefined && input.actualReps !== null && String(input.actualReps).trim() !== "") {
    const r = typeof input.actualReps === "string" ? Number(input.actualReps.trim()) : input.actualReps;
    if (typeof r !== "number" || !Number.isFinite(r) || !Number.isInteger(r) || r < 0 || r > 65535) {
      return { success: false, error: "Repetições devem ser um número inteiro entre 0 e 65535." };
    }
    validatedActualReps = r;
  }

  // Server-side validation of actualLoadKg (optional: null or number between 0 and 9999.99 with at most 2 decimals)
  let validatedActualLoadKg: number | null = null;
  if (input.actualLoadKg !== null && input.actualLoadKg !== undefined && String(input.actualLoadKg).trim() !== "") {
    let l = input.actualLoadKg;
    if (typeof l === "string") {
      l = Number(l.trim().replace(",", "."));
    }
    if (typeof l !== "number" || !Number.isFinite(l) || l < 0 || l > 9999.99) {
      return { success: false, error: "Carga realizada deve ser um valor entre 0 e 9999,99 kg." };
    }
    const rounded = Math.round(l * 100) / 100;
    if (Math.abs(l - rounded) > 1e-7) {
      return { success: false, error: "Carga deve ter no máximo 2 casas decimais." };
    }
    validatedActualLoadKg = rounded;
  }

  const isSkipped = Boolean(input.isSkipped);

  try {
    const completedSet = await completeWorkoutExecutionSet(
      ctx,
      sessionPublicId,
      setPublicId,
      {
        actualReps: validatedActualReps,
        actualLoadKg: validatedActualLoadKg,
        isSkipped,
      }
    );
    return {
      success: true,
      set: completedSet,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao concluir série.";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Concludes a workout execution session when all sets are completed.
 * Fully validated server-side against student role, tenancy, and session ownership.
 */
export async function completeWorkoutExecutionAction(
  slug: string,
  sessionPublicId: string,
  options?: {
    allowEarlyCompletion?: boolean;
    studentCompletionState?: "ALL" | "PARTIAL" | "NONE" | null;
    studentFeedbackNotes?: string | null;
  }
): Promise<CompleteWorkoutExecutionResult> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Não autenticado." };
  }

  const ctx = await resolveTrainingAccessContext(slug);
  if (!ctx) {
    return { success: false, error: "Acesso não autorizado à consultoria." };
  }

  if (!ctx.isStudent && !ctx.hasRole("STUDENT")) {
    return { success: false, error: "Apenas alunos podem finalizar treinos." };
  }

  try {
    const completedSession = await completeWorkoutExecution(ctx, sessionPublicId, options);
    if (ctx.consultancyId && ctx.membershipId) {
      evaluateStudentMonitoring(ctx.consultancyId, ctx.membershipId).catch((evalErr) => {
        console.warn("[Monitoring] Opportunistic evaluation after workout completion failed:", evalErr);
      });
    }
    return {
      success: true,
      session: completedSession,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao finalizar treino.";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Toggles exercise completion on the student checklist without fabricating reps or load.
 */
export async function toggleWorkoutExecutionExerciseAction(
  slug: string,
  sessionPublicId: string,
  blockItemPublicId: string,
  completed: boolean
): Promise<{ success: boolean; data?: ToggleExerciseCompletionResult; error?: string }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Não autenticado." };
  }

  const ctx = await resolveTrainingAccessContext(slug);
  if (!ctx) {
    return { success: false, error: "Acesso não autorizado à consultoria." };
  }

  if (!ctx.isStudent && !ctx.hasRole("STUDENT")) {
    return { success: false, error: "Apenas alunos podem marcar exercícios de treino." };
  }

  try {
    const res = await toggleWorkoutExecutionExercise(
      ctx,
      sessionPublicId,
      blockItemPublicId,
      completed
    );
    return {
      success: true,
      data: res,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao marcar exercício.";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Marks an exercise as skipped on the student checklist.
 */
export async function skipWorkoutExecutionExerciseAction(
  slug: string,
  sessionPublicId: string,
  blockItemPublicId: string,
  reason?: string | null
): Promise<{ success: boolean; data?: ToggleExerciseCompletionResult; error?: string }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Não autenticado." };
  }

  const ctx = await resolveTrainingAccessContext(slug);
  if (!ctx) {
    return { success: false, error: "Acesso não autorizado à consultoria." };
  }

  if (!ctx.isStudent && !ctx.hasRole("STUDENT")) {
    return { success: false, error: "Apenas alunos podem pular exercícios de treino." };
  }

  try {
    const res = await skipWorkoutExecutionExercise(
      ctx,
      sessionPublicId,
      blockItemPublicId,
      reason
    );
    return {
      success: true,
      data: res,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao pular exercício.";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Idempotently synchronizes a workout execution completed offline by a student.
 */
export async function syncOfflineWorkoutExecutionAction(
  slug: string,
  input: SyncOfflineWorkoutExecutionInput
): Promise<{ success: boolean; sessionPublicId?: string; error?: string }> {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false, error: "Não autenticado." };
  }

  const ctx = await resolveTrainingAccessContext(slug);
  if (!ctx) {
    return { success: false, error: "Acesso não autorizado à consultoria." };
  }

  if (!ctx.isStudent && !ctx.hasRole("STUDENT")) {
    return { success: false, error: "Apenas alunos podem sincronizar treinos." };
  }

  try {
    const res = await syncOfflineWorkoutExecution(ctx, input);
    if (ctx.consultancyId && ctx.membershipId) {
      evaluateStudentMonitoring(ctx.consultancyId, ctx.membershipId).catch((evalErr) => {
        console.warn("[Monitoring] Opportunistic evaluation after offline workout sync failed:", evalErr);
      });
    }
    return {
      success: true,
      sessionPublicId: res.sessionPublicId,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao sincronizar treino offline.";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Retrieves the current swap status and active substitutions for an in-progress session.
 */
export async function getWorkoutExecutionSwapStatusAction(
  slug: string,
  sessionPublicId: string
) {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false as const, error: "Não autenticado." };
  }

  const ctx = await resolveTrainingAccessContext(slug);
  if (!ctx) {
    return { success: false as const, error: "Acesso não autorizado à consultoria." };
  }

  if (!ctx.isStudent && !ctx.hasRole("STUDENT")) {
    return { success: false as const, error: "Apenas alunos podem consultar substituições." };
  }

  try {
    const { getWorkoutExecutionSwapStatus } = await import(
      "@/lib/training-v2/exercise-substitution-service"
    );
    const status = await getWorkoutExecutionSwapStatus(ctx, sessionPublicId);
    return {
      success: true as const,
      status,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao consultar substituições.";
    return {
      success: false as const,
      error: message,
    };
  }
}

/**
 * Requests up to 3 candidate exercise alternatives for a block item.
 */
export async function requestExerciseAlternativesAction(
  slug: string,
  sessionPublicId: string,
  blockItemPublicId: string,
  reason: import("@/lib/training-v2/exercise-substitution-service").ExerciseSwapReason
) {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false as const, error: "Não autenticado." };
  }

  const ctx = await resolveTrainingAccessContext(slug);
  if (!ctx) {
    return { success: false as const, error: "Acesso não autorizado à consultoria." };
  }

  if (!ctx.isStudent && !ctx.hasRole("STUDENT")) {
    return { success: false as const, error: "Apenas alunos podem solicitar substituições." };
  }

  try {
    const { requestExerciseAlternatives } = await import(
      "@/lib/training-v2/exercise-substitution-service"
    );
    const result = await requestExerciseAlternatives({
      ctx,
      sessionPublicId,
      blockItemPublicId,
      reason,
    });
    return {
      success: true as const,
      ...result,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao buscar alternativas de exercícios.";
    return {
      success: false as const,
      error: message,
    };
  }
}

/**
 * Confirms an exercise substitution atomically in an active session.
 */
export async function confirmExerciseSubstitutionAction(
  slug: string,
  sessionPublicId: string,
  blockItemPublicId: string,
  performedExercisePublicId: string,
  reason: import("@/lib/training-v2/exercise-substitution-service").ExerciseSwapReason,
  idempotencyKey?: string
) {
  const session = await getCurrentSession();
  if (!session) {
    return { success: false as const, error: "Não autenticado." };
  }

  const ctx = await resolveTrainingAccessContext(slug);
  if (!ctx) {
    return { success: false as const, error: "Acesso não autorizado à consultoria." };
  }

  if (!ctx.isStudent && !ctx.hasRole("STUDENT")) {
    return { success: false as const, error: "Apenas alunos podem confirmar substituições." };
  }

  try {
    const { confirmExerciseSubstitution } = await import(
      "@/lib/training-v2/exercise-substitution-service"
    );
    const result = await confirmExerciseSubstitution({
      ctx,
      sessionPublicId,
      blockItemPublicId,
      performedExercisePublicId,
      reason,
      idempotencyKey,
    });
    return {
      ...result,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro ao confirmar substituição.";
    return {
      success: false as const,
      error: message,
    };
  }
}
