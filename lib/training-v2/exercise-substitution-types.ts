/**
 * TREVO ONE — STUDENT EXERCISE SUBSTITUTION TYPES & CONSTANTS
 * Shared types and constants safe for both Client and Server Components.
 */

import type { BlockItemMediaDto } from "./types";

export type ExerciseSwapReason =
  | "MACHINE_OCCUPIED"
  | "EQUIPMENT_BROKEN"
  | "EQUIPMENT_UNAVAILABLE"
  | "OTHER_OPERATIONAL";

export const SWAP_REASON_LABELS: Record<ExerciseSwapReason, string> = {
  MACHINE_OCCUPIED: "Máquina ocupada",
  EQUIPMENT_BROKEN: "Equipamento quebrado",
  EQUIPMENT_UNAVAILABLE: "Equipamento indisponível",
  OTHER_OPERATIONAL: "Outro motivo operacional",
};

export const MAX_CONFIRMED_SWAPS_PER_WORKOUT = 3;

export interface ExerciseSwapAlternative {
  exercisePublicId: string;
  name: string;
  muscleGroupPrimary: string | null;
  equipment: string | null;
  explanation: string;
  pinnedMedia: BlockItemMediaDto[];
}

export interface ActiveSubstitutionDetail {
  substitutionPublicId: string;
  blockItemPublicId: string;
  blockItemId: number;
  originalExercisePublicId: string;
  originalExerciseName: string;
  performedExercisePublicId: string;
  performedExerciseName: string;
  reason: ExerciseSwapReason;
  reasonLabel: string;
  sequenceNumber: number;
  pinnedMedia: BlockItemMediaDto[];
}

export interface WorkoutExecutionSwapStatus {
  totalConfirmedSwaps: number;
  remainingSwaps: number;
  maxSwapsAllowed: number;
  canSwap: boolean;
  substitutions: ActiveSubstitutionDetail[];
}
