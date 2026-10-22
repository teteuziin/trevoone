import { register } from "node:module";
register("./ts-loader.mjs", import.meta.url);

import assert from "node:assert/strict";

const {
  CANONICAL_PRE_QUESTIONNAIRE_QUESTIONS,
  getQuestionsByCategory,
  findCanonicalQuestionById,
} = await import("../lib/nutrition-v2/pre-questionnaire-catalog.ts");

const {
  validateSendPreQuestionnaireInput,
  validateSaveDraftInput,
  validateSubmitResponsesInput,
  validateReviewDiffInput,
} = await import("../lib/nutrition-v2/pre-questionnaire-validation.ts");

const {
  PRE_QUESTIONNAIRE_STATUS_LABELS,
} = await import("../lib/nutrition-v2/pre-questionnaire-types.ts");

console.log("==================================================");
console.log("TREVO ONE — ETAPA 10: PRÉ-QUESTIONÁRIO NUTRICIONAL TEST SUITE");
console.log("==================================================");

let passed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}:`, err.message);
    process.exit(1);
  }
}

// ----------------------------------------------------------------------------
// 1. CANONICAL CATALOG INTEGRITY & MAPPING TO REGISTRO GERAL
// ----------------------------------------------------------------------------
runTest("CANONICAL CATALOG: Covers all categories required by Registro Geral", () => {
  assert.ok(CANONICAL_PRE_QUESTIONNAIRE_QUESTIONS.length >= 16, "Must contain at least 16 canonical questions");

  const categories = new Set(CANONICAL_PRE_QUESTIONNAIRE_QUESTIONS.map((q) => q.category));
  assert.ok(categories.has("OBJETIVO"), "Must have OBJETIVO category");
  assert.ok(categories.has("HISTORICO_MEDICO"), "Must have HISTORICO_MEDICO category");
  assert.ok(categories.has("MEDICAMENTOS_SUPLEMENTOS"), "Must have MEDICAMENTOS_SUPLEMENTOS category");
  assert.ok(categories.has("HABITOS_ROTINA"), "Must have HABITOS_ROTINA category");
  assert.ok(categories.has("PREFERENCIAS_ALIMENTARES"), "Must have PREFERENCIAS_ALIMENTARES category");
  assert.ok(categories.has("SAUDE_FEMININA"), "Must have SAUDE_FEMININA category");
});

runTest("CANONICAL CATALOG: Strict separation between Allergies and Food Intolerances", () => {
  const allergyQuestion = findCanonicalQuestionById("allergies");
  const intoleranceQuestion = findCanonicalQuestionById("foodIntolerances");

  assert.ok(allergyQuestion, "Allergies question must exist");
  assert.ok(intoleranceQuestion, "Food intolerances question must exist");
  assert.notEqual(allergyQuestion.targetRecordField, intoleranceQuestion.targetRecordField, "Allergies and intolerances must map to distinct fields");
  assert.equal(allergyQuestion.targetRecordField, "allergies");
  assert.equal(intoleranceQuestion.targetRecordField, "foodIntolerances");
});

runTest("CANONICAL CATALOG: Diagnosed conditions includes non-diagnosis disclaimer", () => {
  const condQuestion = findCanonicalQuestionById("diagnosedConditions");
  assert.ok(condQuestion, "diagnosedConditions question must exist");
  assert.ok(
    condQuestion.clinicalNotice && condQuestion.clinicalNotice.includes("Não configura diagnóstico médico"),
    "Must contain disclaimer that patient report is not a formal diagnosis"
  );
});

runTest("CANONICAL CATALOG: Gestational weeks is conditional on pregnancy status and restricted by sex", () => {
  const weeksQuestion = findCanonicalQuestionById("gestationalWeeks");
  assert.ok(weeksQuestion, "gestationalWeeks question must exist");
  assert.ok(weeksQuestion.conditionalOn, "Must have conditionalOn defined");
  assert.equal(weeksQuestion.conditionalOn.parentQuestionId, "pregnancyStatus");
  assert.ok(weeksQuestion.conditionalOn.expectedValues.includes("PREGNANT"));
  assert.equal(weeksQuestion.biologicalSexRestriction, "FEMALE");
});

// ----------------------------------------------------------------------------
// 2. INPUT VALIDATION: SENDING PRE-QUESTIONNAIRE
// ----------------------------------------------------------------------------
runTest("VALIDATION: Send input requires valid student identifier and non-empty questions", () => {
  assert.throws(
    () => validateSendPreQuestionnaireInput({ studentMembershipPublicId: "", selectedQuestionIds: ["mainObjective"] }),
    /Identificador do aluno \/ paciente é obrigatório/
  );

  assert.throws(
    () => validateSendPreQuestionnaireInput({ studentMembershipPublicId: "stu-123", selectedQuestionIds: [] }),
    /Selecione pelo menos uma pergunta/
  );

  assert.throws(
    () => validateSendPreQuestionnaireInput({ studentMembershipPublicId: "stu-123", selectedQuestionIds: ["invalid_fake_question"] }),
    /não foi reconhecida no catálogo oficial/
  );

  const valid = validateSendPreQuestionnaireInput({
    studentMembershipPublicId: "stu-123",
    selectedQuestionIds: ["mainObjective", "hydrationNotes"],
    requiredQuestionIds: ["mainObjective"],
    title: "Anamnese Prévia",
    instructions: "Por favor responda antes da consulta.",
  });
  assert.equal(valid.studentMembershipPublicId, "stu-123");
  assert.equal(valid.selectedQuestionIds.length, 2);
  assert.equal(valid.requiredQuestionIds.length, 1);
  assert.equal(valid.title, "Anamnese Prévia");
});

// ----------------------------------------------------------------------------
// 3. INPUT VALIDATION: DRAFT AUTOSAVE & SUBMISSION
// ----------------------------------------------------------------------------
runTest("VALIDATION: Draft autosave accepts partial responses and validates publicId", () => {
  assert.throws(
    () => validateSaveDraftInput({ publicId: "", responses: {} }),
    /Identificador do questionário é obrigatório/
  );

  const draft = validateSaveDraftInput({
    publicId: "pq-uuid-123",
    responses: {
      mainObjective: "Hipertrofia e melhora no rendimento",
      bowelHabit: "NORMAL",
    },
  });
  assert.equal(draft.publicId, "pq-uuid-123");
  assert.equal(draft.responses.mainObjective, "Hipertrofia e melhora no rendimento");
});

runTest("VALIDATION: Submission enforces required questions but respects conditional branching", () => {
  const dummyQuestions = [
    {
      id: "mainObjective",
      targetRecordField: "mainObjective",
      category: "OBJETIVO",
      title: "Objetivo Principal",
      fieldType: "TEXT",
      required: true,
    },
    {
      id: "pregnancyStatus",
      targetRecordField: "pregnancyStatus",
      category: "SAUDE_FEMININA",
      title: "Está gestante?",
      fieldType: "RADIO",
      required: true,
    },
    {
      id: "gestationalWeeks",
      targetRecordField: "gestationalWeeks",
      category: "SAUDE_FEMININA",
      title: "Quantas semanas?",
      fieldType: "NUMBER",
      required: true,
      conditionalOn: {
        parentQuestionId: "pregnancyStatus",
        expectedValues: ["SIM"],
      },
    },
  ];

  // Missing required mainObjective
  assert.throws(
    () =>
      validateSubmitResponsesInput(
        {
          publicId: "pq-1",
          responses: { pregnancyStatus: "NAO" },
        },
        dummyQuestions
      ),
    /A pergunta 'Objetivo Principal' é obrigatória/
  );

  // When pregnancyStatus is 'NAO', gestationalWeeks is NOT required despite required: true
  const validNonPregnant = validateSubmitResponsesInput(
    {
      publicId: "pq-1",
      responses: {
        mainObjective: "Emagrecimento",
        pregnancyStatus: "NAO",
        // gestationalWeeks omitted
      },
    },
    dummyQuestions
  );
  assert.ok(validNonPregnant);

  // When pregnancyStatus is 'SIM', gestationalWeeks IS required
  assert.throws(
    () =>
      validateSubmitResponsesInput(
        {
          publicId: "pq-1",
          responses: {
            mainObjective: "Emagrecimento",
            pregnancyStatus: "SIM",
            gestationalWeeks: "", // blank
          },
        },
        dummyQuestions
      ),
    /A pergunta 'Quantas semanas\?' é obrigatória/
  );
});

runTest("VALIDATION: Allows neutral answers (Não sei informar / Prefiro não responder / Não informado)", () => {
  const dummyQuestions = [
    {
      id: "familyHistory",
      targetRecordField: "familyHistory",
      category: "HISTORICO_MEDICO",
      title: "Histórico Familiar",
      fieldType: "TEXTAREA",
      required: true,
    },
  ];

  // Student answers with neutral response
  const validSubmission = validateSubmitResponsesInput(
    {
      publicId: "pq-1",
      responses: {
        familyHistory: "Não sei informar / Não tenho contato com familiares",
      },
    },
    dummyQuestions
  );
  assert.equal(
    validSubmission.responses.familyHistory,
    "Não sei informar / Não tenho contato com familiares"
  );
});

// ----------------------------------------------------------------------------
// 4. LIFECYCLE & STATUS DICTIONARY
// ----------------------------------------------------------------------------
runTest("LIFECYCLE: All pre-questionnaire statuses have friendly labels", () => {
  const expectedStatuses = ["DRAFT", "SENT", "IN_PROGRESS", "ANSWERED", "REVIEWED", "CANCELLED"];
  for (const st of expectedStatuses) {
    assert.ok(PRE_QUESTIONNAIRE_STATUS_LABELS[st], `Status label for ${st} must exist`);
  }
});

// ----------------------------------------------------------------------------
// 5. REVIEW DIFF & SELECTIVE ACCEPTANCE LOGIC
// ----------------------------------------------------------------------------
runTest("REVIEW DIFF: Selective acceptance generates precise updates and applied log", () => {
  const input = {
    publicId: "pq-100",
    decisions: [
      {
        questionId: "mainObjective",
        targetField: "mainObjective",
        accept: true,
        valueToApply: "Ganho de massa magra e recomposição",
      },
      {
        questionId: "smokingStatus",
        targetField: "smokingStatus",
        accept: false, // Professional chooses not to apply
        valueToApply: "NAO_FUMANTE",
      },
    ],
    reviewerNotes: "Paciente informou novos objetivos em consulta.",
  };

  const validated = validateReviewDiffInput(input);
  assert.equal(validated.publicId, "pq-100");
  assert.equal(validated.decisions.length, 2);
  assert.equal(validated.decisions[0].accept, true);
  assert.equal(validated.decisions[1].accept, false);

  // Simulate repository building updates object
  const updates = {};
  const appliedDiff = [];

  for (const decision of validated.decisions) {
    if (decision.accept && decision.targetField) {
      updates[decision.targetField] = decision.valueToApply;
      appliedDiff.push({
        questionId: decision.questionId,
        targetField: decision.targetField,
        accepted: true,
        appliedValue: decision.valueToApply,
      });
    } else {
      appliedDiff.push({
        questionId: decision.questionId,
        targetField: decision.targetField,
        accepted: false,
        appliedValue: null,
      });
    }
  }

  assert.equal(updates.mainObjective, "Ganho de massa magra e recomposição");
  assert.equal(updates.smokingStatus, undefined, "Rejected field must not be in updates");
  assert.equal(appliedDiff[0].accepted, true);
  assert.equal(appliedDiff[1].accepted, false);
});

// ----------------------------------------------------------------------------
// 6. QUESTION FILTERING BY BIOLOGICAL SEX & CATEGORIES
// ----------------------------------------------------------------------------
runTest("PRESENTATION: Category grouping and biological sex filtering function cleanly", () => {
  const femaleQuestions = CANONICAL_PRE_QUESTIONNAIRE_QUESTIONS.filter(
    (q) => !q.biologicalSexRestriction || q.biologicalSexRestriction === "FEMALE"
  );
  const maleQuestions = CANONICAL_PRE_QUESTIONNAIRE_QUESTIONS.filter(
    (q) => !q.biologicalSexRestriction || q.biologicalSexRestriction === "MALE"
  );

  assert.ok(femaleQuestions.some((q) => q.id === "pregnancyStatus"), "Female questions must include pregnancy");
  assert.ok(!maleQuestions.some((q) => q.id === "pregnancyStatus"), "Male questions must exclude pregnancy");

  const habitQuestions = getQuestionsByCategory("HABITOS_ROTINA");
  assert.ok(habitQuestions.length > 0, "Must have questions in HABITOS_ROTINA");
  assert.ok(habitQuestions.some((q) => q.id === "hydrationNotes"), "Must include hydration in habits");
});

console.log("--------------------------------------------------");
console.log(`TOTAL TESTS: ${passed}`);
console.log(`ALL ${passed} TESTS PASSED CLEANLY!`);
console.log("==================================================");
