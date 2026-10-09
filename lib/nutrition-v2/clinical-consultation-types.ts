/**
 * TREVO ONE — NUTRITION V2 CLINICAL CONSULTATIONS & FOLLOW-UP TYPES
 * Phase 6 Authoritative Types
 * Rules: UNKNOWN != ZERO | No silent clinical defaults | Strict tenant isolation | Immutability on completion
 */

export type ConsultationType = "INITIAL" | "FOLLOW_UP";

export const VALID_CONSULTATION_TYPES: readonly ConsultationType[] = [
  "INITIAL",
  "FOLLOW_UP",
] as const;

export const CONSULTATION_TYPE_LABELS: Record<ConsultationType, string> = {
  INITIAL: "Consulta inicial",
  FOLLOW_UP: "Retorno",
};

export type ClinicalConsultationStatus = "DRAFT" | "COMPLETED" | "CANCELLED";

export const VALID_CLINICAL_CONSULTATION_STATUSES: readonly ClinicalConsultationStatus[] = [
  "DRAFT",
  "COMPLETED",
  "CANCELLED",
] as const;

export const CLINICAL_CONSULTATION_STATUS_LABELS: Record<ClinicalConsultationStatus, string> = {
  DRAFT: "Rascunho",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
};

export type AdherenceLevel = "NOT_ASSESSED" | "LOW" | "MODERATE" | "HIGH";

export const VALID_ADHERENCE_LEVELS: readonly AdherenceLevel[] = [
  "NOT_ASSESSED",
  "LOW",
  "MODERATE",
  "HIGH",
] as const;

export const ADHERENCE_LABELS: Record<AdherenceLevel, string> = {
  NOT_ASSESSED: "Não avaliada",
  LOW: "Baixa",
  MODERATE: "Moderada",
  HIGH: "Alta",
};

export interface ClinicalConsultationRecord {
  id: number;
  publicId: string;
  consultancyId: number;
  studentMembershipId: number;
  professionalMembershipId: number;
  patientRecordId: number | null;
  consultationAppointmentId: number | null;
  consultationType: ConsultationType;
  status: ClinicalConsultationStatus;
  consultationDate: string; // ISO 8601
  anthropometricEntryId: number | null;
  activePlanVersionId: number | null;
  planAdjusted: boolean | null;
  adherence: AdherenceLevel;
  adherenceNotes: string | null;
  difficulties: string | null;
  symptomsObservations: string | null;
  conduct: string | null;
  nextGoals: string | null;
  recommendedReturnDate: string | null; // YYYY-MM-DD
  completedAt: string | null;
  completedByMembershipId: number | null;
  canceledAt: string | null;
  canceledByMembershipId: number | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicalConsultationEvolutionComparison {
  hasComparison: boolean;
  previousWeightKg: number | null;
  currentWeightKg: number | null;
  weightDeltaKg: number | null;
  weightDeltaPercent: number | null;
  previousConsultationDate: string | null;
  previousConsultationType: ConsultationType | null;
  message?: string;
}

export interface ClinicalConsultationSummaryDto {
  publicId: string;
  consultationType: ConsultationType;
  consultationTypeLabel: string;
  status: ClinicalConsultationStatus;
  statusLabel: string;
  consultationDate: string;
  formattedDate: string; // DD/MM/AAAA
  professionalName: string;
  professionalMembershipPublicId: string;
  weightKg: number | null;
  weightDeltaKg: number | null;
  weightDeltaPercent: number | null;
  adherence: AdherenceLevel;
  adherenceLabel: string;
  conduct: string | null;
  recommendedReturnDate: string | null;
  recommendedReturnFormatted: string | null;
  appointmentPublicId: string | null;
}

export interface ClinicalConsultationDetailDto {
  consultation: ClinicalConsultationRecord;
  student: {
    membershipId: number;
    membershipPublicId: string;
    fullName: string;
    email: string;
  };
  professional: {
    membershipId: number;
    membershipPublicId: string;
    fullName: string;
  };
  evolution: ClinicalConsultationEvolutionComparison;
  anthropometricsSnapshot: {
    publicId: string;
    measurementDate: string;
    weightKg: number | null;
    heightCm: number | null;
    waistCm: number | null;
    hipCm: number | null;
    armCm: number | null;
    thighCm: number | null;
    calfCm: number | null;
    chestCm: number | null;
    notes: string | null;
  } | null;
  planSnapshot: {
    planTitle: string | null;
    planPublicId: string | null;
    versionNumber: number | null;
    isActivePublished: boolean;
  } | null;
  planningSnapshot: {
    calculatedAt: string | null;
    targetCaloriesKcal: number | null;
    targetProteinG: number | null;
    targetCarbsG: number | null;
    targetFatsG: number | null;
    goalType: string | null;
  } | null;
  realNextAppointment: {
    publicId: string;
    scheduledStartAt: string;
    formattedStart: string;
  } | null;
}

export interface PatientConsultationHubSummaryDto {
  totalCompletedConsultations: number;
  latestCompletedConsultation: ClinicalConsultationSummaryDto | null;
  recommendedReturnDate: string | null;
  recommendedReturnFormatted: string | null;
  realNextAppointment: {
    publicId: string;
    scheduledStartAt: string;
    formattedStart: string;
  } | null;
  activeDraft: ClinicalConsultationSummaryDto | null;
  consultationsTimeline: ClinicalConsultationSummaryDto[];
  suggestedNextType: ConsultationType;
}

export interface CreateClinicalConsultationInput {
  consultationType: ConsultationType;
  consultationDate: string; // ISO or local date-time string
  consultationAppointmentPublicId?: string | null;
  anthropometricEntryPublicId?: string | null;
  planAdjusted?: boolean | null;
  adherence?: AdherenceLevel;
  adherenceNotes?: string | null;
  difficulties?: string | null;
  symptomsObservations?: string | null;
  conduct?: string | null;
  nextGoals?: string | null;
  recommendedReturnDate?: string | null;
}

export interface UpdateClinicalConsultationInput {
  consultationType?: ConsultationType;
  consultationDate?: string;
  anthropometricEntryPublicId?: string | null;
  planAdjusted?: boolean | null;
  adherence?: AdherenceLevel;
  adherenceNotes?: string | null;
  difficulties?: string | null;
  symptomsObservations?: string | null;
  conduct?: string | null;
  nextGoals?: string | null;
  recommendedReturnDate?: string | null;
}

// Calculate delta and delta percent safely (UNKNOWN != ZERO)
export function computeEvolutionDelta(
  currentWeight: number | null,
  previousWeight: number | null
): {
  weightDeltaKg: number | null;
  weightDeltaPercent: number | null;
} {
  if (
    currentWeight === null ||
    previousWeight === null ||
    isNaN(currentWeight) ||
    isNaN(previousWeight)
  ) {
    return { weightDeltaKg: null, weightDeltaPercent: null };
  }

  const deltaKg = Math.round((currentWeight - previousWeight) * 100) / 100;
  let deltaPercent: number | null = null;
  if (previousWeight > 0) {
    deltaPercent = Math.round(((currentWeight - previousWeight) / previousWeight) * 1000) / 10;
  }

  return {
    weightDeltaKg: deltaKg,
    weightDeltaPercent: deltaPercent,
  };
}

// Format ISO string or Date to DD/MM/AAAA
export function formatDateToPtBr(date: Date | string | null): string | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}
