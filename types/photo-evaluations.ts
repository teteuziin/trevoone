// Pure types and constants for Physical Photo Evaluations
// Safe to import in both Client Components and Server Components

export type PhotoEvaluationPose = "FRONT" | "RIGHT_SIDE" | "BACK" | "LEFT_SIDE";

export const EVALUATION_POSES: readonly PhotoEvaluationPose[] = [
  "FRONT",
  "RIGHT_SIDE",
  "BACK",
  "LEFT_SIDE",
] as const;

export const POSE_LABELS: Record<PhotoEvaluationPose, string> = {
  FRONT: "Frente",
  RIGHT_SIDE: "Lado Direito",
  BACK: "Costas",
  LEFT_SIDE: "Lado Esquerdo",
};

export const POSE_DESCRIPTIONS: Record<PhotoEvaluationPose, string> = {
  FRONT: "Braços relaxados ao lado do corpo, postura natural, olhar para frente.",
  RIGHT_SIDE: "Perfil direito, braços ligeiramente afastados ou ao lado do corpo.",
  BACK: "Costas voltadas para a câmera, braços relaxados ao lado do corpo.",
  LEFT_SIDE: "Perfil esquerdo, alinhamento similar ao lado direito.",
};

export type PhotoEvaluationStatus =
  | "PENDING"
  | "SUBMITTED"
  | "CHANGES_REQUESTED"
  | "APPROVED";

export const STATUS_LABELS: Record<PhotoEvaluationStatus, string> = {
  PENDING: "Aguardando envio",
  SUBMITTED: "Em análise",
  CHANGES_REQUESTED: "Correção solicitada",
  APPROVED: "Aprovada",
};

export const MAX_EVALUATION_PHOTO_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB = 10,485,760 bytes

export type SupportedPhotoMime = "image/jpeg" | "image/png" | "image/webp";

export interface PhotoEvaluationImageDto {
  publicId: string;
  pose: PhotoEvaluationPose;
  poseLabel: string;
  mimeType: string;
  byteSize: number;
  uploadedAt: string;
  updatedAt: string;
  imageUrl: string;
}

export interface PhotoEvaluationRequestDto {
  publicId: string;
  consultancySlug: string;
  consultancyName: string;
  studentPublicId: string;
  studentName: string;
  studentEmail: string;
  status: PhotoEvaluationStatus;
  statusLabel: string;
  instructions: string | null;
  dueAt: string | null;
  consentAt: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewerNotes: string | null;
  requestedChangesPoses: PhotoEvaluationPose[];
  requestedByName: string;
  reviewedByName: string | null;
  createdAt: string;
  updatedAt: string;
  images: Record<PhotoEvaluationPose, PhotoEvaluationImageDto | null>;
  completedPosesCount: number;
  totalPosesCount: number;
}

export interface PhotoEvaluationComparisonPairDto {
  pose: PhotoEvaluationPose;
  poseLabel: string;
  beforeImage: PhotoEvaluationImageDto | null;
  afterImage: PhotoEvaluationImageDto | null;
}

export interface PhotoEvaluationComparisonDto {
  student: {
    publicId: string;
    fullName: string;
    email: string;
  };
  beforeEvaluation: {
    publicId: string;
    submittedAt: string | null;
    reviewedAt: string | null;
    reviewerNotes: string | null;
  } | null;
  afterEvaluation: {
    publicId: string;
    submittedAt: string | null;
    reviewedAt: string | null;
    reviewerNotes: string | null;
  } | null;
  pairs: PhotoEvaluationComparisonPairDto[];
}
