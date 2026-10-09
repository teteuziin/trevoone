/**
-- TREVO ONE — NUTRITION V2 CHECK-INS & ADHERENCE (PHASE 7)
-- Types, Enums, DTOs and Invariant Helpers
-- Rules: Request-driven MVP | Strict 1:1 request-response | UNKNOWN != ZERO | UNKNOWN != FALSE | Immutable responses | Strict multi-tenancy
*/

export const PERSISTED_CHECKIN_REQUEST_STATUSES = ["PENDING", "COMPLETED", "CANCELED"] as const;
export const VALID_PERSISTED_REQUEST_STATUSES = PERSISTED_CHECKIN_REQUEST_STATUSES;
export type PersistedCheckinRequestStatus = (typeof PERSISTED_CHECKIN_REQUEST_STATUSES)[number];

export const DERIVED_CHECKIN_REQUEST_STATES = ["PENDING", "COMPLETED", "CANCELED", "EXPIRED"] as const;
export const VALID_DERIVED_REQUEST_STATES = DERIVED_CHECKIN_REQUEST_STATES;
export type DerivedCheckinRequestState = (typeof DERIVED_CHECKIN_REQUEST_STATES)[number];

export const CHECKIN_ADHERENCE_LEVELS = ["LOW", "MODERATE", "HIGH"] as const;
export const VALID_ADHERENCE_LEVELS = CHECKIN_ADHERENCE_LEVELS;
export type CheckinAdherenceLevel = (typeof CHECKIN_ADHERENCE_LEVELS)[number];

export const CHECKIN_ADHERENCE_LABELS: Record<CheckinAdherenceLevel, string> = {
  LOW: "Baixa",
  MODERATE: "Moderada",
  HIGH: "Alta",
};

export const CHECKIN_RATING_LABELS: Record<number, string> = {
  1: "Muito baixa",
  2: "Baixa",
  3: "Adequada",
  4: "Alta",
  5: "Muito alta",
};

export const CHECKIN_ENERGY_LABELS: Record<number, string> = {
  1: "Muito baixa",
  2: "Baixa",
  3: "Moderada",
  4: "Boa",
  5: "Excelente",
};

export const CHECKIN_SLEEP_LABELS: Record<number, string> = {
  1: "Muito ruim",
  2: "Ruim",
  3: "Regular",
  4: "Bom",
  5: "Excelente",
};

export const CHECKIN_TRAINING_LABELS: Record<number, string> = {
  1: "Muito abaixo",
  2: "Abaixo",
  3: "Dentro do plano",
  4: "Acima",
  5: "Excelente",
};

/**
 * Derives the operational presentation state of a checkin request.
 * EXPIRED is strictly derived in runtime when status is PENDING and dueAt has passed.
 * EXPIRED is NEVER persisted to the database.
 */
export function deriveCheckinRequestState(
  status: PersistedCheckinRequestStatus,
  dueAt: Date | string | null,
  now = new Date()
): DerivedCheckinRequestState {
  if (status === "PENDING" && dueAt) {
    const dueTime = typeof dueAt === "string" ? new Date(dueAt).getTime() : dueAt.getTime();
    if (!isNaN(dueTime) && dueTime < now.getTime()) {
      return "EXPIRED";
    }
  }
  return status;
}

// ============================================================================
// DTOs & Records
// ============================================================================

export interface CheckinRequestDto {
  id: number;
  publicId: string;
  consultancyId: number;
  studentMembershipId: number;
  studentName?: string;
  studentPublicId?: string;
  requestedByMembershipId: number;
  requestedByName?: string;
  status: PersistedCheckinRequestStatus;
  derivedState: DerivedCheckinRequestState;
  requestedAt: string;
  dueAt: string | null;
  canceledAt: string | null;
  canceledByMembershipId: number | null;
  createdAt: string;
  updatedAt: string;
  hasResponse: boolean;
  responsePublicId?: string | null;
}
export type CheckinRequestDetailDto = CheckinRequestDto;

export interface CheckinResponseDto {
  id: number;
  publicId: string;
  requestId: number;
  requestPublicId: string;
  consultancyId: number;
  studentMembershipId: number;
  studentName?: string;
  submittedAt: string;
  adherence: CheckinAdherenceLevel;
  hungerRating: number | null;
  energyRating: number | null;
  sleepRating: number | null;
  trainingRating: number | null;
  hydrationLiters: number | null;
  selfReportedWeightKg: number | null;
  difficultyText: string | null;
  studentNotes: string | null;
  requestsHelp: boolean | null;
  createdAt: string;
}
export type CheckinResponseSummaryDto = CheckinResponseDto;

export interface CheckinDetailDto {
  request: CheckinRequestDto;
  response: CheckinResponseDto | null;
  previousResponseSummary?: {
    submittedAt: string;
    adherence: CheckinAdherenceLevel;
    hungerRating: number | null;
    energyRating: number | null;
    sleepRating: number | null;
    trainingRating: number | null;
    hydrationLiters: number | null;
    selfReportedWeightKg: number | null;
  } | null;
}

export interface PatientCheckinsHubSummaryDto {
  latestCompletedCheckin: CheckinResponseDto | null;
  pendingRequest: CheckinRequestDto | null;
  recentResponses: CheckinResponseDto[];
  totalCompletedCount: number;
  requestsHelpCount: number;
}

// ============================================================================
// Input Types
// ============================================================================

export interface CreateCheckinRequestInput {
  consultancyId: number;
  studentMembershipId: number;
  requestedByMembershipId: number;
  dueAt?: string | Date | null;
}

export interface SubmitCheckinResponseInput {
  adherence: CheckinAdherenceLevel;
  hungerRating?: number | null;
  energyRating?: number | null;
  sleepRating?: number | null;
  trainingRating?: number | null;
  hydrationLiters?: number | null;
  selfReportedWeightKg?: number | null;
  difficultyText?: string | null;
  studentNotes?: string | null;
  requestsHelp?: boolean | null;
}

export interface CancelCheckinRequestInput {
  consultancyId: number;
  requestPublicId: string;
  canceledByMembershipId: number;
}
