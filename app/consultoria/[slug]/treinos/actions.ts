"use server";

/**
 * TREVO ONE — STUDENT WORKOUT EXECUTION SERVER ACTIONS
 * Safe server-side execution session controls for assigned student workouts.
 */

import { getCurrentSession } from "@/lib/auth/session";
import { resolveTrainingAccessContext } from "@/lib/training-v2/access";
import {
  startOrResumeWorkoutExecution,
  completeWorkoutExecutionSet,
  completeWorkoutExecution,
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
