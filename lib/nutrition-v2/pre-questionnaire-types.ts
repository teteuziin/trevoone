/**
-- TREVO ONE — NUTRITION V2 PRE-QUESTIONNAIRE TYPES (ETAPA 10)
-- Clinical pre-consultation questionnaires with draft autosave,
-- tri-state patient-reported answers, side-by-side diff review,
-- and selective integration into the Patient General Record.
*/

import type { UpdatePatientRecordInput } from "./patient-record-types";

export type PreQuestionnaireStatus =
  | "DRAFT"
  | "SENT"
  | "IN_PROGRESS"
  | "ANSWERED"
  | "REVIEWED"
  | "CANCELLED";

export const PRE_QUESTIONNAIRE_STATUS_LABELS: Record<PreQuestionnaireStatus, string> = {
  DRAFT: "Rascunho",
  SENT: "Enviado ao paciente",
  IN_PROGRESS: "Em preenchimento",
  ANSWERED: "Respondido pelo paciente",
  REVIEWED: "Revisado pelo profissional",
  CANCELLED: "Cancelado",
};

export type PreQuestionnaireCategory =
  | "OBJETIVO"
  | "HISTORICO_MEDICO"
  | "MEDICAMENTOS_SUPLEMENTOS"
  | "HABITOS_ROTINA"
  | "PREFERENCIAS_ALIMENTARES"
  | "SAUDE_FEMININA";

export const PRE_QUESTIONNAIRE_CATEGORY_LABELS: Record<PreQuestionnaireCategory, string> = {
  OBJETIVO: "1. Objetivo & Demanda Clínica",
  HISTORICO_MEDICO: "2. Patologias & Histórico Familiar",
  MEDICAMENTOS_SUPLEMENTOS: "3. Medicamentos & Suplementos Habituais",
  HABITOS_ROTINA: "4. Hidratação, Sono & Rotina",
  PREFERENCIAS_ALIMENTARES: "5. Preferências & Restrições Alimentares",
  SAUDE_FEMININA: "6. Saúde Feminina & Gestação",
};

export type PreQuestionnaireFieldType =
  | "TEXT"
  | "TEXTAREA"
  | "SELECT"
  | "RADIO"
  | "NUMBER";

export interface PreQuestionnaireOption {
  value: string;
  label: string;
  isNeutralOrNegative?: boolean; // e.g. "Não sei", "Prefiro não responder"
}

export interface PreQuestionnaireConditionalRule {
  parentQuestionId: string;
  expectedValues: string[];
}

export interface PreQuestionnaireQuestionConfig {
  id: string; // matches UpdatePatientRecordInput key where applicable
  targetRecordField: keyof UpdatePatientRecordInput | null;
  category: PreQuestionnaireCategory;
  title: string;
  description?: string;
  fieldType: PreQuestionnaireFieldType;
  options?: PreQuestionnaireOption[];
  placeholder?: string;
  required: boolean;
  conditionalOn?: PreQuestionnaireConditionalRule;
  biologicalSexRestriction?: "FEMALE" | "MALE";
  clinicalNotice?: string;
}

export interface PreQuestionnaireResponseItem {
  questionId: string;
  value: string | number | boolean | null;
  notApplicableOrUnknown?: boolean;
}

export interface PreQuestionnaireAppliedDiffItem {
  questionId: string;
  targetField: string;
  accepted: boolean;
  appliedValue: string | null;
  appliedAt: string;
}

export interface PreQuestionnaireDto {
  publicId: string;
  consultancyId: number;
  studentMembershipId: number;
  studentMembershipPublicId: string;
  studentName: string;
  studentEmail: string;
  requestedByMembershipId: number;
  requestedByName: string;
  consultationId: number | null;
  consultationPublicId: string | null;
  consultationDate: string | null;
  title: string;
  instructions: string | null;
  status: PreQuestionnaireStatus;
  statusLabel: string;
  questions: PreQuestionnaireQuestionConfig[];
  draftResponses: Record<string, unknown> | null;
  responses: Record<string, unknown> | null;
  appliedDiff: PreQuestionnaireAppliedDiffItem[] | null;
  reviewerNotes: string | null;
  sentAt: string | null;
  startedAt: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedByName: string | null;
  canceledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PreQuestionnaireSummaryDto {
  publicId: string;
  title: string;
  status: PreQuestionnaireStatus;
  statusLabel: string;
  studentName: string;
  requestedByName: string;
  consultationDate: string | null;
  sentAt: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  questionsCount: number;
}

export interface SendPreQuestionnaireInput {
  studentMembershipPublicId: string;
  consultationPublicId?: string | null;
  title?: string;
  instructions?: string | null;
  selectedQuestionIds: string[];
  requiredQuestionIds?: string[];
}

export interface SavePreQuestionnaireDraftInput {
  publicId: string;
  responses: Record<string, unknown>;
}

export interface SubmitPreQuestionnaireResponsesInput {
  publicId: string;
  responses: Record<string, unknown>;
}

export interface ReviewPreQuestionnaireDiffItemDecision {
  questionId: string;
  targetField: keyof UpdatePatientRecordInput;
  accept: boolean;
  valueToApply?: string | null;
}

export interface ReviewPreQuestionnaireDiffInput {
  publicId: string;
  decisions: ReviewPreQuestionnaireDiffItemDecision[];
  reviewerNotes?: string | null;
}

export interface PreQuestionnaireDiffComparisonItem {
  questionId: string;
  questionTitle: string;
  categoryLabel: string;
  targetField: keyof UpdatePatientRecordInput | null;
  currentValue: string | null;
  currentProvenanceLabel?: string | null;
  newValue: string | null;
  isDifferent: boolean;
  canAccept: boolean;
  clinicalNotice?: string;
}
