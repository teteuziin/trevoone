/**
 * TREVO ONE — TRAINING V2 ROUTE HELPERS
 * Pure URL builders for training execution, blocks, and assignments.
 * Safe to import in both Client and Server Components (zero server dependencies).
 */

export function buildStudentWorkoutExecutionUrl(
  consultancySlug: string,
  assignmentPublicId: string,
  blockPublicId?: string | null
): string {
  const base = `/consultoria/${consultancySlug}/treinos/${assignmentPublicId}`;
  return blockPublicId ? `${base}?bloco=${blockPublicId}` : base;
}
