"use server";

/**
 * TREVO ONE — STUDENT WORKOUT EXECUTION SERVER ACTIONS
 * Safe server-side execution session controls for assigned student workouts.
 */

import { getCurrentSession } from "@/lib/auth/session";
import { resolveTrainingAccessContext } from "@/lib/training-v2/access";
import { startOrResumeWorkoutExecution } from "@/lib/training-v2/execution-repository";
import type { WorkoutExecutionSessionDto } from "@/lib/training-v2/types";

export type StartOrResumeExecutionResult = {
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
