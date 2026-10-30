/**
 * TREVO ONE — Workout Assignment Title Resolver
 *
 * Single source of truth for resolving workout assignment titles across all views:
 * - Student Overview (StudentFocusSection)
 * - My Workouts (StudentTreinosClientView)
 * - Workout Detail & Execution (StudentWorkoutRenderer / StudentRuntimeFocusedView)
 * - Personal Trainer Student Hub & Assignments List
 * - Student PDF Exports (Vector PDF)
 * - Execution Sessions & Notification Logs
 *
 * Precedence Rules:
 * 1. Explicit Custom Title: If wa.custom_title is set, non-empty, and NOT identical
 *    to the model/workout base title (case-insensitive trim), use it.
 * 2. Automatic Title: In the absence of an explicit custom title (or if wa.custom_title
 *    merely echoed the model title), resolve dynamically to "Treino de {studentName}".
 * 3. Fallback: If studentName is missing or unassigned, fallback to baseTitle or "Treino do Aluno".
 */

export interface ResolveWorkoutTitleParams {
  customTitle?: string | null;
  studentName?: string | null;
  baseTitle?: string | null;
}

export function formatAutomaticWorkoutTitle(studentName: string | null | undefined): string {
  const cleanName = (studentName || "").trim();
  if (!cleanName) return "Treino do Aluno";
  return `Treino de ${cleanName}`;
}

export function isInheritedModelTitle(
  customTitle: string | null | undefined,
  baseTitle: string | null | undefined
): boolean {
  const cleanCustom = (customTitle || "").trim().toLowerCase();
  const cleanBase = (baseTitle || "").trim().toLowerCase();
  if (!cleanCustom || !cleanBase) return false;
  return cleanCustom === cleanBase;
}

export function resolveWorkoutAssignmentTitle(params: ResolveWorkoutTitleParams): string {
  const cleanCustom = (params.customTitle || "").trim();
  const cleanBase = (params.baseTitle || "").trim();
  const cleanStudent = (params.studentName || "").trim();

  // 1. Explicit customization chosen by the professional
  // (A title that is identical to the model/base title was inherited automatically, not customized)
  if (cleanCustom && (!cleanBase || cleanCustom.toLowerCase() !== cleanBase.toLowerCase())) {
    return cleanCustom;
  }

  // 2. Default automatic title for the recipient student
  if (cleanStudent) {
    return `Treino de ${cleanStudent}`;
  }

  // 3. Fallback to base title or generic label
  return cleanBase || "Treino do Aluno";
}
