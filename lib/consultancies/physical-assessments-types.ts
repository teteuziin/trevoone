export interface PhysicalAssessmentItem {
  publicId: string;
  recordedOn: string; // YYYY-MM-DD
  weightKg: number | null;
  waistCm: number | null;
  abdomenCm: number | null;
  hipCm: number | null;
  armCm: number | null;
  thighCm: number | null;
  note: string | null;
  createdByName?: string | null;
  createdAt: string;
}

export interface StudentAssessmentSummary {
  membershipId: number;
  studentPublicId: string;
  userPublicId: string;
  name: string;
  email: string;
  phone: string | null;
  assessmentsCount: number;
  latestAssessment: PhysicalAssessmentItem | null;
  assessments: PhysicalAssessmentItem[];
}

export interface ConsultancyPhysicalAssessmentsStats {
  evaluatedStudentsCount: number;
  totalAssessmentsCount: number;
  latestRecordedOn: string | null;
  loadStatus: "SUCCESS" | "ERROR";
  errorMessage?: string;
}

export interface MetricDelta {
  diff: number;
  diffFormatted: string;
  direction: "INCREASED" | "DECREASED" | "UNCHANGED";
}

export function computeMetricDelta(
  prev: number | null | undefined,
  curr: number | null | undefined,
  unit: string
): MetricDelta | null {
  if (prev === null || prev === undefined || curr === null || curr === undefined) {
    return null;
  }
  const diff = Math.round((curr - prev) * 100) / 100;
  const direction = diff > 0 ? "INCREASED" : diff < 0 ? "DECREASED" : "UNCHANGED";
  const sign = diff > 0 ? "+" : "";
  const diffFormatted = `${sign}${diff.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  })} ${unit}`;

  return {
    diff,
    diffFormatted,
    direction,
  };
}
