/**
 * TREVO ONE ? NUTRITION V2 PATIENT RECORD & PREGNANCY TYPES
 * Authoritative types for clinical health history, lifestyle, anthropometrics, and pregnancy.
 */

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

  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
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
  notes: string | null;
  createdByMembershipId: number;
  createdAt: string;
  updatedAt: string;
};

export type PatientPregnancyRecord = {
  id: number;
  publicId: string;
  patientRecordId: number;
  pregnancyStatus: PregnancyStatus;
  estimatedDueDate: string | null;
  gestationalWeeks: number | null;
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
};

export type UpdatePatientRecordInput = {
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
  notes?: string | null;
};

export type UpdatePregnancyInput = {
  pregnancyStatus: PregnancyStatus;
  estimatedDueDate?: string | null;
  gestationalWeeks?: number | null;
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
