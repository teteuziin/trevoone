import type {
  StructuredPerimeters,
  StructuredDiameters,
  StructuredBodyComposition,
  PatientLabExamRecord,
  PlanningFieldPreferences,
} from "./clinical-measurements-catalog";

export type {
  StructuredPerimeters,
  StructuredDiameters,
  StructuredBodyComposition,
  PatientLabExamRecord,
  PlanningFieldPreferences,
};

export type BiologicalSex = "MALE" | "FEMALE";

/**
 * TREVO ONE — NUTRITION V2 PATIENT RECORD & PREGNANCY TYPES
 * Authoritative types for clinical health history, lifestyle, anthropometrics, pregnancy, and clinical notes.
 */

export type ClinicalDataOrigin =
  | "PATIENT_REPORTED"
  | "PROFESSIONAL_RECORDED"
  | "PROFESSIONAL_REVIEWED"
  | "NOT_INFORMED"
  | "NOT_APPLICABLE";

export interface ClinicalFieldProvenance {
  origin: ClinicalDataOrigin;
  label: string;
  sourceDate?: string | null;
  reviewedBy?: string | null;
  note?: string | null;
}

export type ClinicalNoteContextType =
  | "INITIAL"
  | "FOLLOW_UP"
  | "ROUTINE"
  | "SPONTANEOUS"
  | "INTERDISCIPLINARY";

export const CLINICAL_NOTE_CONTEXT_LABELS: Record<ClinicalNoteContextType, string> = {
  INITIAL: "Consulta inicial",
  FOLLOW_UP: "Retorno / Acompanhamento",
  ROUTINE: "Observação de rotina",
  SPONTANEOUS: "Contato espontâneo / Dúvida",
  INTERDISCIPLINARY: "Alinhamento interdisciplinar",
};

export type ClinicalNoteStatus = "DRAFT" | "FINALIZED";

export const CLINICAL_NOTE_STATUS_LABELS: Record<ClinicalNoteStatus, string> = {
  DRAFT: "Rascunho",
  FINALIZED: "Finalizado",
};

export interface PatientClinicalNoteDto {
  publicId: string;
  noteDate: string; // YYYY-MM-DD
  contextType: ClinicalNoteContextType;
  contextTypeLabel: string;
  status: ClinicalNoteStatus;
  statusLabel: string;
  conduct: string | null;
  content: string;
  authorName: string;
  authorMembershipPublicId: string;
  isAuthor: boolean;
  confidentialInternal: boolean;
  finalizedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaveClinicalNoteInput {
  publicId?: string | null;
  noteDate: string; // YYYY-MM-DD
  contextType: ClinicalNoteContextType;
  conduct?: string | null;
  content: string;
  status?: ClinicalNoteStatus;
}

export interface PatientRecordAuditEntryDto {
  publicId: string;
  fieldName: string;
  fieldLabel: string;
  previousValue: string | null;
  newValue: string | null;
  changeSource: string;
  changedByName: string;
  createdAt: string;
}

export type PregnancyStatus =
  | "NOT_APPLICABLE"
  | "NOT_PREGNANT"
  | "PREGNANT"
  | "POSTPARTUM";

export const ALL_PREGNANCY_STATUSES: readonly PregnancyStatus[] = [
  "NOT_APPLICABLE",
  "NOT_PREGNANT",
  "PREGNANT",
  "POSTPARTUM",
] as const;

export type PregnancyType = "SINGLETON" | "TWINS" | "TRIPLETS_PLUS" | "OTHER";
export type BreastfeedingStatus =
  | "EXCLUSIVE"
  | "PARTIAL"
  | "FORMULA_ONLY"
  | "WEANED"
  | "NOT_APPLICABLE";

export type PatientRecord = {
  id: number;
  publicId: string;
  consultancyId: number;
  studentMembershipId: number;
  createdByMembershipId: number;

  // Physiological Foundation (Migration 046)
  birthDate: string | null;
  biologicalSex: BiologicalSex | null;

  // Basic Clinical Information
  occupation: string | null;
  routineNotes: string | null;
  followUpReason: string | null;
  mainObjective: string | null;
  clinicalObservations: string | null;

  // Health History
  diagnosedConditions: string | null;
  previousSurgeries: string | null;
  hospitalizations: string | null;
  allergies: string | null;
  foodAllergiesIntolerances: string | null;
  foodIntolerances: string | null;
  currentMedications: string | null;
  supplements: string | null;
  familyHistory: string | null;
  gastrointestinalNotes: string | null;
  bowelHabit: string | null;
  sleepNotes: string | null;
  hydrationNotes: string | null;

  // Nutritional History
  foodPreferences: string | null;
  dislikedFoods: string | null;
  dietaryRestrictions: string | null;
  usualEatingRoutine: string | null;
  mealScheduleNotes: string | null;
  appetiteNotes: string | null;
  difficultiesAdherenceNotes: string | null;

  // Lifestyle
  physicalActivityNotes: string | null;
  smokingStatus: string | null;
  alcoholNotes: string | null;
  sleepRoutine: string | null;
  workStudyRoutine: string | null;

  // Provenance JSON (Release Etapa 9)
  fieldProvenanceJson: string | null;

  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type SkinfoldProtocol =
  | "POLLOCK_3"
  | "POLLOCK_7"
  | "FAULKNER_4"
  | "PETROSKI_4"
  | "DURNIN_WOMERSLEY_4"
  | "NONE";

export const SKINFOLD_PROTOCOL_LABELS: Record<SkinfoldProtocol, string> = {
  POLLOCK_3: "Pollock 3 dobras (Jackson & Pollock)",
  POLLOCK_7: "Pollock 7 dobras (Jackson & Pollock)",
  FAULKNER_4: "Faulkner 4 dobras",
  PETROSKI_4: "Petroski 4 dobras",
  DURNIN_WOMERSLEY_4: "Durnin & Womersley 4 dobras",
  NONE: "Medidas isoladas (Sem protocolo)",
};

export type AnthropometricSourceType =
  | "PROFESSIONAL_RECORDED"
  | "PATIENT_REPORTED";

export const ANTHROPOMETRIC_SOURCE_LABELS: Record<AnthropometricSourceType, string> = {
  PROFESSIONAL_RECORDED: "Avaliação Profissional",
  PATIENT_REPORTED: "Informado pelo Paciente",
};

export type PatientAnthropometricEntry = {
  id: number;
  publicId: string;
  patientRecordId: number;
  measurementDate: string; // YYYY-MM-DD
  weightKg: number | null;
  heightCm: number | null;
  waistCm: number | null;
  hipCm: number | null;
  armCm: number | null;
  thighCm: number | null;
  calfCm: number | null;
  chestCm: number | null;

  // Circunferências adicionais (cm)
  neckCm: number | null;
  forearmCm: number | null;
  abdomenCm: number | null;
  relaxedArmCm: number | null;
  contractedArmCm: number | null;

  // Dobras cutâneas (mm)
  tricepsMm: number | null;
  bicepsMm: number | null;
  subscapularMm: number | null;
  suprailiacMm: number | null;
  abdominalFoldMm: number | null;
  chestFoldMm: number | null;
  thighFoldMm: number | null;
  midaxillaryMm: number | null;
  calfFoldMm: number | null;
  skinfoldProtocol: SkinfoldProtocol | null;

  // Composição corporal informada ou medida
  bodyFatPct: number | null;
  fatMassKg: number | null;
  leanMassKg: number | null;
  muscleMassKg: number | null;
  bodyWaterPct: number | null;
  bodyWaterKg: number | null;
  boneMassValue: number | null;
  boneMassUnit: string | null;
  boneMassMethod: string | null;

  // Metadados clínicos
  sourceType: AnthropometricSourceType;
  equipmentMethod: string | null;
  notes: string | null;
  createdByMembershipId: number;
  createdByName?: string | null;
  updatedByMembershipId?: number | null;
  updatedByName?: string | null;
  editReason?: string | null;
  createdAt: string;
  updatedAt: string;

  // Medidas ampliadas estruturadas (Release Etapa 14)
  perimeters?: StructuredPerimeters | null;
  diameters?: StructuredDiameters | null;
  bodyComposition?: StructuredBodyComposition | null;
};

export type PatientPregnancyRecord = {
  id: number;
  publicId: string;
  patientRecordId: number;
  pregnancyStatus: PregnancyStatus;
  estimatedDueDate: string | null;
  gestationalWeeks: number | null;
  gestationalReferenceDate: string | null; // Reference date when gestational weeks were reported/recorded
  lastMenstrualPeriodDate: string | null;
  prePregnancyWeightKg: number | null;
  currentPregnancyWeightKg: number | null;
  pregnancyType: string | null;
  pregnancyNotes: string | null;
  obstetricNotes: string | null;
  supplementationNotes: string | null;
  deliveryDate: string | null;
  breastfeedingStatus: string | null;
  postpartumNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OnboardingReferenceData = {
  hasOnboardingData: boolean;
  fullName: string | null;
  birthDate: string | null;
  sex: string | null;
  phone: string | null;
  email: string | null;
  occupation: string | null;
  mainObjective: string | null;
  reportedWeightKg: number | null;
  reportedHeightCm: number | null;
  dietaryRestrictions: string | null;
  foodAllergies: string | null;
  foodIntolerances: string | null;
  preferredFoods: string | null;
  dislikedFoods: string | null;
  medications: string | null;
  healthConditions: string | null;
  surgeries: string | null;
  bowelHabit: string | null;
  sleepQuality: string | null;
  waterIntake: string | null;
  physicalActivity: string | null;
  alcoholFrequency: string | null;
  smoking: string | null;
  submittedAt: string | null;
};

export interface PatientRecordPreQuestionnaireItem {
  publicId: string;
  title: string;
  status: string;
  statusLabel: string;
  studentMembershipPublicId: string;
  studentName: string;
  studentEmail: string;
  requestedByName: string;
  consultationDate: string | null;
  questions: unknown[];
  responses: Record<string, unknown> | null;
  sentAt: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedByName: string | null;
  createdAt: string;
}

export type PatientRecordDetail = {
  record: PatientRecord;
  student: {
    membershipId: number;
    membershipPublicId: string;
    userId: number;
    fullName: string;
    email: string;
    joinedAt: string;
  };
  pregnancy: PatientPregnancyRecord | null;
  anthropometrics: PatientAnthropometricEntry[];
  onboardingReference: OnboardingReferenceData;

  // Canonical resolution across patient record and onboarding reference (Release 3.1)
  resolvedBirthDate: string | null;
  resolvedBiologicalSex: BiologicalSex | null;
  birthDateProvenance: "PATIENT_RECORD" | "ONBOARDING" | "MISSING";
  biologicalSexProvenance: "PATIENT_RECORD" | "ONBOARDING" | "MISSING";

  // Tri-State / Clinical Provenance Map for the 16 items (Etapa 9)
  fieldProvenance: Record<string, ClinicalFieldProvenance>;

  // Clinical Notes & History (Etapa 9)
  clinicalNotes: PatientClinicalNoteDto[];
  recentAuditTrail: PatientRecordAuditEntryDto[];

  // Pre-Questionnaires (Etapa 10)
  preQuestionnaires?: PatientRecordPreQuestionnaireItem[];

  // Exames Laboratoriais e Preferências de Exibição (Etapa 14)
  labExams?: PatientLabExamRecord[];
  isLabExamsUnavailable?: boolean;
  fieldPreferences?: PlanningFieldPreferences;
};

export type UpdatePatientRecordInput = {
  birthDate?: string | null;
  biologicalSex?: BiologicalSex | null;
  occupation?: string | null;
  routineNotes?: string | null;
  followUpReason?: string | null;
  mainObjective?: string | null;
  clinicalObservations?: string | null;
  diagnosedConditions?: string | null;
  previousSurgeries?: string | null;
  hospitalizations?: string | null;
  allergies?: string | null;
  foodAllergiesIntolerances?: string | null;
  foodIntolerances?: string | null;
  currentMedications?: string | null;
  supplements?: string | null;
  familyHistory?: string | null;
  gastrointestinalNotes?: string | null;
  bowelHabit?: string | null;
  sleepNotes?: string | null;
  hydrationNotes?: string | null;
  foodPreferences?: string | null;
  dislikedFoods?: string | null;
  dietaryRestrictions?: string | null;
  usualEatingRoutine?: string | null;
  mealScheduleNotes?: string | null;
  appetiteNotes?: string | null;
  difficultiesAdherenceNotes?: string | null;
  physicalActivityNotes?: string | null;
  smokingStatus?: string | null;
  alcoholNotes?: string | null;
  sleepRoutine?: string | null;
  workStudyRoutine?: string | null;
  fieldProvenanceJson?: string | null;
  expectedUpdatedAt?: string | null;
  clientTimestamp?: string | null;
};

export type AddAnthropometricEntryInput = {
  measurementDate: string; // YYYY-MM-DD
  weightKg?: number | null;
  heightCm?: number | null;
  waistCm?: number | null;
  hipCm?: number | null;
  armCm?: number | null;
  thighCm?: number | null;
  calfCm?: number | null;
  chestCm?: number | null;

  neckCm?: number | null;
  forearmCm?: number | null;
  abdomenCm?: number | null;
  relaxedArmCm?: number | null;
  contractedArmCm?: number | null;

  tricepsMm?: number | null;
  bicepsMm?: number | null;
  subscapularMm?: number | null;
  suprailiacMm?: number | null;
  abdominalFoldMm?: number | null;
  chestFoldMm?: number | null;
  thighFoldMm?: number | null;
  midaxillaryMm?: number | null;
  calfFoldMm?: number | null;
  skinfoldProtocol?: SkinfoldProtocol | null;

  bodyFatPct?: number | null;
  fatMassKg?: number | null;
  leanMassKg?: number | null;
  muscleMassKg?: number | null;
  bodyWaterPct?: number | null;
  bodyWaterKg?: number | null;
  boneMassValue?: number | null;
  boneMassUnit?: string | null;
  boneMassMethod?: string | null;

  sourceType?: AnthropometricSourceType;
  equipmentMethod?: string | null;
  notes?: string | null;

  // Medidas ampliadas estruturadas (Release Etapa 14)
  perimeters?: StructuredPerimeters | null;
  diameters?: StructuredDiameters | null;
  bodyComposition?: StructuredBodyComposition | null;
};

export type UpdateAnthropometricEntryInput = AddAnthropometricEntryInput & {
  entryPublicId: string;
  editReason: string;
};

export interface AnthropometricAuditEntryDto {
  publicId: string;
  fieldName: string;
  previousValue: string | null;
  newValue: string | null;
  editReason: string | null;
  changedByName: string;
  createdAt: string;
}

export type UpdatePregnancyInput = {
  pregnancyStatus: PregnancyStatus;
  estimatedDueDate?: string | null;
  gestationalWeeks?: number | null;
  gestationalReferenceDate?: string | null;
  lastMenstrualPeriodDate?: string | null;
  prePregnancyWeightKg?: number | null;
  currentPregnancyWeightKg?: number | null;
  pregnancyType?: string | null;
  pregnancyNotes?: string | null;
  obstetricNotes?: string | null;
  supplementationNotes?: string | null;
  deliveryDate?: string | null;
  breastfeedingStatus?: string | null;
  postpartumNotes?: string | null;
};

export type UpdatePatientPhysiologicalInput = {
  birthDate?: string | null;
  biologicalSex?: BiologicalSex | null;
};
