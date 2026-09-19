// Pure domain types and DTOs for Evolução 360°
// Safe to import in both Client Components and Server Components

import type {
  PhotoEvaluationPose,
  PhotoEvaluationStatus,
  PhotoEvaluationImageDto,
} from "./photo-evaluations";

export type MetricChangeDirection = "INCREASED" | "DECREASED" | "UNCHANGED";

export interface MetricDeltaDto {
  previousValue: number;
  currentValue: number;
  diff: number; // currentValue - previousValue
  diffFormatted: string; // e.g., "-1,5 kg" or "+2,0 cm"
  diffPercentage?: number | null; // e.g., -1.82
  diffPercentageFormatted?: string | null; // e.g., "-1,82%"
  direction: MetricChangeDirection;
  directionLabel: "Aumentou" | "Reduziu" | "Sem alteração";
}

export interface StudentProgressMetricsDto {
  publicId: string;
  recordedOn: string; // YYYY-MM-DD
  weightKg: number | null;
  waistCm: number | null;
  abdomenCm: number | null;
  hipCm: number | null;
  armCm: number | null;
  thighCm: number | null;
  note: string | null;
  createdByName?: string;
  createdAt: string;
}

export interface MilestonePhotoEvaluationDto {
  publicId: string;
  status: PhotoEvaluationStatus;
  statusLabel: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewerNotes: string | null;
  requestedChangesPoses: PhotoEvaluationPose[];
  images: Record<PhotoEvaluationPose, PhotoEvaluationImageDto | null>;
  completedPosesCount: number;
}

export interface EvolutionMilestoneDto {
  id: string; // Unique milestone key (e.g., "milestone-2026-09-18-combined" or publicId)
  date: string; // YYYY-MM-DD
  dateDisplay: string; // DD/MM/AAAA
  hasMeasurement: boolean;
  hasPhotos: boolean;
  measurement: StudentProgressMetricsDto | null;
  photos: MilestonePhotoEvaluationDto | null;
  // Deltas calculated against the immediately preceding milestone that had corresponding data
  weightDelta?: MetricDeltaDto | null;
  waistDelta?: MetricDeltaDto | null;
  abdomenDelta?: MetricDeltaDto | null;
  hipDelta?: MetricDeltaDto | null;
  armDelta?: MetricDeltaDto | null;
  thighDelta?: MetricDeltaDto | null;
}

export interface StudentEvolutionSummaryDto {
  firstRecordedDate: string | null; // DD/MM/AAAA
  latestRecordedDate: string | null; // DD/MM/AAAA
  initialWeightKg: number | null;
  currentWeightKg: number | null;
  totalWeightDelta: MetricDeltaDto | null;
  totalMilestonesCount: number;
  totalApprovedPhotoEvaluationsCount: number;
}

export interface MetricComparisonItemDto {
  label: string;
  unit: string;
  beforeValue: number | null;
  afterValue: number | null;
  delta: MetricDeltaDto | null;
}

export interface EvolutionComparisonDataDto {
  student: {
    publicId: string;
    fullName: string;
    email: string;
  };
  beforeMilestone: {
    date: string;
    dateDisplay: string;
    measurement: StudentProgressMetricsDto | null;
    photos: MilestonePhotoEvaluationDto | null;
  } | null;
  afterMilestone: {
    date: string;
    dateDisplay: string;
    measurement: StudentProgressMetricsDto | null;
    photos: MilestonePhotoEvaluationDto | null;
  } | null;
  daysBetween: number | null;
  metricsComparison: MetricComparisonItemDto[];
  photoPairs: Array<{
    pose: PhotoEvaluationPose;
    poseLabel: string;
    beforeImage: PhotoEvaluationImageDto | null;
    afterImage: PhotoEvaluationImageDto | null;
  }>;
}

export interface ChartDataPointDto {
  date: string; // YYYY-MM-DD
  dateDisplay: string; // DD/MM
  value: number;
  formattedValue: string;
}

export interface EvolutionChartSeriesDto {
  weightSeries: ChartDataPointDto[];
  waistSeries: ChartDataPointDto[];
  abdomenSeries: ChartDataPointDto[];
}

export interface EvolutionHubDataDto {
  student: {
    publicId: string;
    fullName: string;
    email: string;
  };
  summary: StudentEvolutionSummaryDto;
  milestones: EvolutionMilestoneDto[];
  activePendingPhotoRequest: {
    publicId: string;
    status: PhotoEvaluationStatus;
    statusLabel: string;
    dueAt: string | null;
    instructions: string | null;
    requestedChangesPoses: PhotoEvaluationPose[];
    completedPosesCount: number;
  } | null;
  chartSeries: EvolutionChartSeriesDto;
  // Dates eligible for photo comparison (strictly APPROVED)
  eligibleComparisonDates: Array<{
    date: string;
    dateDisplay: string;
    milestoneId: string;
    hasApprovedPhotos: boolean;
    hasMeasurement: boolean;
  }>;
}
