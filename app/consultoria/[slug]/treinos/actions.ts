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
  syncOfflineWorkoutExecution,
  type SyncOfflineWorkoutExecutionInput,
} from "@/lib/training-v2/execution-repository";
import type {
  WorkoutExecutionSessionDto,
  WorkoutExecutionSetDto,
} from "@/lib/training-v2/types";

export type StartOrResumeExecutionResult = {
  success: boolean;
  session?: WorkoutExecutionSessionDto;
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
  assignmentPublicId: string
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
    const executionSession = await startOrResumeWorkoutExecution(ctx, assignmentPublicId);
    return {
      success: true,
      session: executionSession,
    };
  } catch (err: unknown) {
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
    actualReps: number;
    actualLoadKg: number | null;
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

  // Server-side validation of actualReps (mandatory for completion)
  if (input.actualReps === undefined || input.actualReps === null) {
    return { success: false, error: "Informe o número de repetições realizadas." };
  }
  if (
    typeof input.actualReps !== "number" ||
    !Number.isFinite(input.actualReps) ||
    !Number.isInteger(input.actualReps)
  ) {
    return { success: false, error: "Repetições devem ser um número inteiro." };
  }
  if (input.actualReps < 0) {
    return { success: false, error: "Repetições não podem ser negativas." };
  }
  if (input.actualReps > 65535) {
    return { success: false, error: "Repetições não podem exceder 65535." };
  }
  const validatedActualReps = input.actualReps;

  // Server-side validation of actualLoadKg (optional, null allowed for bodyweight/empty)
  let validatedActualLoadKg: number | null = null;
  if (input.actualLoadKg !== null && input.actualLoadKg !== undefined) {
    if (typeof input.actualLoadKg !== "number" || !Number.isFinite(input.actualLoadKg)) {
      return { success: false, error: "Carga realizada deve ser um valor numérico." };
    }
    if (input.actualLoadKg < 0) {
      return { success: false, error: "Carga não pode ser negativa." };
    }
    if (input.actualLoadKg > 9999.99) {
      return { success: false, error: "Carga não pode exceder 9999,99 kg." };
    }
    const rounded = Math.round(input.actualLoadKg * 100) / 100;
    if (Math.abs(input.actualLoadKg - rounded) > 1e-7) {
      return { success: false, error: "Carga deve ter no máximo 2 casas decimais." };
    }
    validatedActualLoadKg = rounded;
  }

  try {
    const completedSet = await completeWorkoutExecutionSet(
      ctx,
      sessionPublicId,
      setPublicId,
      { actualReps: validatedActualReps, actualLoadKg: validatedActualLoadKg }
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
  sessionPublicId: string
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
    const completedSession = await completeWorkoutExecution(ctx, sessionPublicId);
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
