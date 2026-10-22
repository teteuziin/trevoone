/**
-- TREVO ONE — NUTRITION V2 PRE-QUESTIONNAIRE VALIDATION
-- Validation logic for sending, draft autosaving, student submission, and professional diff review.
-- Enforces strict tri-state, preserves conditional branches, and rejects malicious payloads.
*/

import type {
  SendPreQuestionnaireInput,
  SavePreQuestionnaireDraftInput,
  SubmitPreQuestionnaireResponsesInput,
  ReviewPreQuestionnaireDiffInput,
  PreQuestionnaireQuestionConfig,
} from "./pre-questionnaire-types";
import type { UpdatePatientRecordInput } from "./patient-record-types";
import { CANONICAL_PRE_QUESTIONNAIRE_QUESTIONS } from "./pre-questionnaire-catalog";

export function validateSendPreQuestionnaireInput(
  raw: unknown
): SendPreQuestionnaireInput {
  if (!raw || typeof raw !== "object") {
    throw new Error("Dados de envio do questionário inválidos.");
  }

  const data = raw as Record<string, unknown>;
  const studentMembershipPublicId = String(data.studentMembershipPublicId || "").trim();
  if (!studentMembershipPublicId) {
    throw new Error("Identificador do aluno / paciente é obrigatório.");
  }

  const selectedQuestionIds = Array.isArray(data.selectedQuestionIds)
    ? data.selectedQuestionIds.map((id) => String(id).trim()).filter(Boolean)
    : [];

  if (selectedQuestionIds.length === 0) {
    throw new Error("Selecione pelo menos uma pergunta para o questionário.");
  }

  // Validate that questions belong to canonical catalog
  const catalogMap = new Map(CANONICAL_PRE_QUESTIONNAIRE_QUESTIONS.map((q) => [q.id, q]));
  for (const qId of selectedQuestionIds) {
    if (!catalogMap.has(qId)) {
      throw new Error(`A pergunta '${qId}' não foi reconhecida no catálogo oficial.`);
    }
  }

  const requiredQuestionIds = Array.isArray(data.requiredQuestionIds)
    ? data.requiredQuestionIds.map((id) => String(id).trim()).filter(Boolean)
    : [];

  const title = data.title ? String(data.title).trim().slice(0, 255) : "Pré-Questionário Nutricional";
  const instructions = data.instructions ? String(data.instructions).trim().slice(0, 2000) : null;
  const consultationPublicId = data.consultationPublicId ? String(data.consultationPublicId).trim() : null;

  return {
    studentMembershipPublicId,
    consultationPublicId,
    title,
    instructions,
    selectedQuestionIds,
    requiredQuestionIds,
  };
}

export function validateSaveDraftInput(
  raw: unknown
): SavePreQuestionnaireDraftInput {
  if (!raw || typeof raw !== "object") {
    throw new Error("Dados de rascunho inválidos.");
  }

  const data = raw as Record<string, unknown>;
  const publicId = String(data.publicId || "").trim();
  if (!publicId) {
    throw new Error("Identificador do questionário é obrigatório.");
  }

  const responses = (data.responses && typeof data.responses === "object")
    ? (data.responses as Record<string, unknown>)
    : {};

  return {
    publicId,
    responses,
  };
}

export function validateSubmitResponsesInput(
  raw: unknown,
  questions: PreQuestionnaireQuestionConfig[]
): SubmitPreQuestionnaireResponsesInput {
  if (!raw || typeof raw !== "object") {
    throw new Error("Dados de submissão do questionário inválidos.");
  }

  const data = raw as Record<string, unknown>;
  const publicId = String(data.publicId || "").trim();
  if (!publicId) {
    throw new Error("Identificador do questionário é obrigatório.");
  }

  const responses = (data.responses && typeof data.responses === "object")
    ? (data.responses as Record<string, unknown>)
    : {};

  // Check required questions, respecting conditional branching
  for (const q of questions) {
    if (!q.required) continue;

    // Check if conditional parent applies
    if (q.conditionalOn) {
      const parentVal = String(responses[q.conditionalOn.parentQuestionId] || "").trim();
      const parentMatches = q.conditionalOn.expectedValues.includes(parentVal);
      if (!parentMatches) {
        // Parent condition not met: field is not required
        continue;
      }
    }

    const val = responses[q.id];
    const isBlank = val === null || val === undefined || String(val).trim() === "";
    if (isBlank) {
      throw new Error(`A pergunta '${q.title}' é obrigatória.`);
    }
  }

  return {
    publicId,
    responses,
  };
}

export function validateReviewDiffInput(
  raw: unknown
): ReviewPreQuestionnaireDiffInput {
  if (!raw || typeof raw !== "object") {
    throw new Error("Dados de revisão do questionário inválidos.");
  }

  const data = raw as Record<string, unknown>;
  const publicId = String(data.publicId || "").trim();
  if (!publicId) {
    throw new Error("Identificador do questionário é obrigatório.");
  }

  if (!Array.isArray(data.decisions)) {
    throw new Error("Lista de decisões de revisão é obrigatória.");
  }

  const decisions = data.decisions.map((d: unknown, idx: number) => {
    if (!d || typeof d !== "object") {
      throw new Error(`Decisão na posição ${idx + 1} inválida.`);
    }
    const dec = d as Record<string, unknown>;
    const questionId = String(dec.questionId || "").trim();
    const targetField = String(dec.targetField || "").trim() as keyof UpdatePatientRecordInput;
    const accept = Boolean(dec.accept);
    const valueToApply = dec.valueToApply !== undefined ? (dec.valueToApply === null ? null : String(dec.valueToApply)) : null;

    if (!questionId || !targetField) {
      throw new Error(`Decisão ${idx + 1} incompleta: campo e pergunta são obrigatórios.`);
    }

    return {
      questionId,
      targetField,
      accept,
      valueToApply,
    };
  });

  const reviewerNotes = data.reviewerNotes ? String(data.reviewerNotes).trim().slice(0, 2000) : null;

  return {
    publicId,
    decisions,
    reviewerNotes,
  };
}
