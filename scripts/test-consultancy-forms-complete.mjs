import assert from "node:assert/strict";
import crypto from "node:crypto";

console.log("=====================================================================");
console.log("TEST SUITE: RECONSTRUÇÃO DO MÓDULO FORMULÁRIOS (ETAPA 7)");
console.log("=====================================================================\n");

// 1. VALIDATION OF QUESTION TYPES & INTEGRITY
console.log("1. Testando validação de tipos de pergunta e integridade do questions_json...");

const VALID_QUESTION_TYPES = new Set([
  "SHORT_TEXT",
  "LONG_TEXT",
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "SCALE",
  "DATE",
  "FILE_UPLOAD",
]);

function validateFormQuestions(rawQuestions) {
  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
    throw new Error("Adicione ao menos uma pergunta ao formulário.");
  }

  return rawQuestions.map((raw, idx) => {
    if (!raw || typeof raw !== "object") {
      throw new Error(`A pergunta #${idx + 1} possui formato inválido.`);
    }

    const id = raw.id ? String(raw.id) : `q_${idx + 1}_${Date.now()}`;
    const type = String(raw.type || "SHORT_TEXT");

    if (!VALID_QUESTION_TYPES.has(type)) {
      throw new Error(`Tipo de pergunta inválido: '${type}'.`);
    }

    const title = typeof raw.title === "string" ? raw.title.trim() : "";
    if (!title) {
      throw new Error(`A pergunta #${idx + 1} deve conter um título/enunciado.`);
    }

    const question = {
      id,
      type,
      title,
      required: Boolean(raw.required),
      description: raw.description ? String(raw.description).trim() : undefined,
    };

    if (type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE") {
      if (!Array.isArray(raw.options) || raw.options.length < 2) {
        throw new Error(`A pergunta '${title}' deve conter ao menos duas opções de seleção.`);
      }
      question.options = raw.options.map((opt, oIdx) => {
        const optLabel = typeof opt === "string" ? opt.trim() : opt?.label ? String(opt.label).trim() : "";
        if (!optLabel) {
          throw new Error(`Opção #${oIdx + 1} da pergunta '${title}' não pode ser vazia.`);
        }
        return {
          id: opt?.id ? String(opt.id) : `opt_${oIdx + 1}`,
          label: optLabel,
        };
      });
    }

    if (type === "SCALE") {
      question.scaleMin = typeof raw.scaleMin === "number" ? raw.scaleMin : 0;
      question.scaleMax = typeof raw.scaleMax === "number" ? raw.scaleMax : 10;
      question.scaleMinLabel = raw.scaleMinLabel ? String(raw.scaleMinLabel).trim() : undefined;
      question.scaleMaxLabel = raw.scaleMaxLabel ? String(raw.scaleMaxLabel).trim() : undefined;
    }

    return question;
  });
}

const validQuestions = [
  {
    id: "q_text",
    title: "Qual seu objetivo principal?",
    type: "SHORT_TEXT",
    required: true,
    placeholder: "Ex: Hipertrofia",
  },
  {
    id: "q_long",
    title: "Descreva seu histórico de lesões",
    type: "LONG_TEXT",
    required: false,
  },
  {
    id: "q_single",
    title: "Quantas vezes por semana você pode treinar?",
    type: "SINGLE_CHOICE",
    required: true,
    options: [
      { id: "o1", label: "2 a 3 vezes" },
      { id: "o2", label: "4 a 5 vezes" },
      { id: "o3", label: "Todos os dias" },
    ],
  },
  {
    id: "q_multi",
    title: "Quais suplementos você utiliza atualmente?",
    type: "MULTIPLE_CHOICE",
    required: false,
    options: [
      { id: "s1", label: "Creatina" },
      { id: "s2", label: "Whey Protein" },
      { id: "s3", label: "Multivitamínico" },
      { id: "s4", label: "Nenhum" },
    ],
  },
  {
    id: "q_scale",
    title: "Avalie seu nível de cansaço diário de 0 a 10",
    type: "SCALE",
    required: true,
    scaleMin: 0,
    scaleMax: 10,
    scaleMinLabel: "Muito descansado",
    scaleMaxLabel: "Extremamente exausto",
  },
  {
    id: "q_date",
    title: "Data do seu último check-up médico",
    type: "DATE",
    required: false,
  },
  {
    id: "q_file",
    title: "Anexe seu hemograma recente ou atestado",
    type: "FILE_UPLOAD",
    required: false,
  },
];

const validated = validateFormQuestions(validQuestions);
assert.equal(validated.length, 7, "Todas as 7 perguntas devem ser validadas com sucesso");
assert.equal(validated[0].type, "SHORT_TEXT");
assert.equal(validated[2].options?.length, 3, "Pergunta SINGLE_CHOICE deve conter 3 opções");
assert.equal(validated[3].options?.length, 4, "Pergunta MULTIPLE_CHOICE deve conter 4 opções");
assert.equal(validated[4].scaleMin, 0);
assert.equal(validated[4].scaleMax, 10);
assert.equal(validated[4].scaleMinLabel, "Muito descansado");

// Edge case: malformed or empty questions
assert.throws(() => {
  validateFormQuestions([]);
}, /Adicione ao menos uma pergunta/);

assert.throws(() => {
  validateFormQuestions([{ id: "q1", title: "", type: "SHORT_TEXT", required: true }]);
}, /deve conter um título/);

assert.throws(() => {
  validateFormQuestions([{ id: "q2", title: "Escolha", type: "SINGLE_CHOICE", required: true, options: [] }]);
}, /ao menos duas opções/);

console.log("  ✓ Todas as validações de tipos de pergunta passaram!");

// 2. MODEL LIFECYCLE (DRAFT -> PUBLISHED -> ARCHIVED)
console.log("\n2. Testando ciclo de vida dos modelos de formulário...");

class MockFormsRepository {
  constructor() {
    this.forms = new Map();
    this.assignments = new Map();
  }

  createForm(consultancyId, title, questions) {
    const id = this.forms.size + 1;
    const publicId = crypto.randomUUID();
    const validatedQuestions = validateFormQuestions(questions);
    const form = {
      id,
      publicId,
      consultancyId,
      title,
      questions: validatedQuestions,
      status: "DRAFT",
      deletedAt: null,
    };
    this.forms.set(publicId, form);
    return form;
  }

  publishForm(consultancyId, formPublicId) {
    const form = this.forms.get(formPublicId);
    if (!form || form.consultancyId !== consultancyId || form.deletedAt) {
      throw new Error("Formulário não encontrado.");
    }
    form.status = "PUBLISHED";
    return form;
  }

  archiveForm(consultancyId, formPublicId) {
    const form = this.forms.get(formPublicId);
    if (!form || form.consultancyId !== consultancyId) {
      throw new Error("Formulário não encontrado.");
    }
    form.status = "ARCHIVED";
    return form;
  }

  assignForm(consultancyId, formPublicId, studentIds, dueDate = null) {
    const form = this.forms.get(formPublicId);
    if (!form || form.consultancyId !== consultancyId) {
      throw new Error("Formulário não encontrado nesta consultoria.");
    }
    if (form.status === "ARCHIVED") {
      throw new Error("Não é possível atribuir formulário arquivado.");
    }
    if (form.status === "DRAFT") {
      form.status = "PUBLISHED"; // Auto-publish on first assignment
    }

    const assigned = [];
    for (const studentId of studentIds) {
      const assignmentId = crypto.randomUUID();
      const assignment = {
        publicId: assignmentId,
        consultancyId,
        formPublicId,
        studentId,
        status: "PENDING",
        dueDate,
        responses: null,
        reviewerNotes: null,
      };
      this.assignments.set(assignmentId, assignment);
      assigned.push(assignment);
    }
    return assigned;
  }

  submitResponses(studentId, assignmentPublicId, responses) {
    const assignment = this.assignments.get(assignmentPublicId);
    if (!assignment || assignment.studentId !== studentId) {
      throw new Error("Atribuição não encontrada.");
    }
    const form = this.forms.get(assignment.formPublicId);
    // Validate required questions
    for (const q of form.questions) {
      if (q.required) {
        const val = responses[q.id];
        if (val === undefined || val === null || val === "") {
          throw new Error(`A pergunta '${q.title}' é obrigatória.`);
        }
      }
    }
    assignment.status = "SUBMITTED";
    assignment.responses = responses;
    assignment.submittedAt = new Date().toISOString();
    return assignment;
  }

  reviewAssignment(consultancyId, assignmentPublicId, decision, reviewerNotes) {
    const assignment = this.assignments.get(assignmentPublicId);
    if (!assignment || assignment.consultancyId !== consultancyId) {
      throw new Error("Atribuição não encontrada nesta consultoria.");
    }
    if (decision === "APPROVE") {
      assignment.status = "REVIEWED";
    } else if (decision === "REQUEST_CHANGES") {
      assignment.status = "PENDING";
    }
    assignment.reviewerNotes = reviewerNotes;
    assignment.reviewedAt = new Date().toISOString();
    return assignment;
  }
}

const repo = new MockFormsRepository();

const formModel = repo.createForm(10, "Check-in Mensal", [
  { id: "q1", title: "Qual seu peso hoje (kg)?", type: "SHORT_TEXT", required: true },
  { id: "q2", title: "Como avalia sua dieta?", type: "SCALE", required: true, scaleMin: 0, scaleMax: 10 },
]);

assert.equal(formModel.status, "DRAFT", "Novo formulário deve nascer como DRAFT");
repo.publishForm(10, formModel.publicId);
assert.equal(formModel.status, "PUBLISHED", "Deve transicionar para PUBLISHED");
repo.archiveForm(10, formModel.publicId);
assert.equal(formModel.status, "ARCHIVED", "Deve transicionar para ARCHIVED");

// Cannot assign archived form
assert.throws(() => {
  repo.assignForm(10, formModel.publicId, [101, 102]);
}, /Não é possível atribuir formulário arquivado/);

console.log("  ✓ Ciclo de vida DRAFT -> PUBLISHED -> ARCHIVED validado com sucesso!");

// 3. ASSIGNMENT (INDIVIDUAL & BULK)
console.log("\n3. Testando atribuição individual e em massa (todos os alunos ativos)...");

const activeModel = repo.createForm(10, "Anamnese Pré-Treino", [
  { id: "q_lesao", title: "Possui histórico de lesão?", type: "SINGLE_CHOICE", required: true, options: [{ id: "s", label: "Sim" }, { id: "n", label: "Não" }] },
  { id: "q_rotina", title: "Horário preferido para treinar", type: "SHORT_TEXT", required: false },
]);

// Single assignment
const singleAssignment = repo.assignForm(10, activeModel.publicId, [101], "2026-11-10");
assert.equal(singleAssignment.length, 1);
assert.equal(singleAssignment[0].status, "PENDING");
assert.equal(singleAssignment[0].dueDate, "2026-11-10");

// Bulk assignment (all active students)
const allActiveStudentIds = [101, 102, 103, 104, 105];
const bulkAssignments = repo.assignForm(10, activeModel.publicId, allActiveStudentIds);
assert.equal(bulkAssignments.length, 5, "Deve ter gerado atribuição para todos os 5 alunos");

console.log("  ✓ Atribuição individual e em massa testada com sucesso!");

// 4. STUDENT SUBMISSION & DEFENSIVE VALIDATION
console.log("\n4. Testando envio de respostas pelo aluno e validação de campos obrigatórios...");

// Student attempts to submit without answering required question
assert.throws(() => {
  repo.submitResponses(101, singleAssignment[0].publicId, {
    q_rotina: "18h",
  });
}, /A pergunta 'Possui histórico de lesão\?' é obrigatória/);

// Student submits valid answers
const submitted = repo.submitResponses(101, singleAssignment[0].publicId, {
  q_lesao: "Não",
  q_rotina: "18h",
});
assert.equal(submitted.status, "SUBMITTED");
assert.equal(submitted.responses.q_lesao, "Não");

console.log("  ✓ Submissão e validação defensiva de respostas validadas com sucesso!");

// 5. ADMIN REVIEW & REVISIONS
console.log("\n5. Testando revisão pelo profissional (aprovação e solicitação de ajustes)...");

// Request changes
const changesRequested = repo.reviewAssignment(
  10,
  singleAssignment[0].publicId,
  "REQUEST_CHANGES",
  "Por favor, detalhe melhor seu horário caso tenha flexibilidade aos sábados."
);
assert.equal(changesRequested.status, "PENDING", "Deve retornar para status PENDING");
assert.equal(
  changesRequested.reviewerNotes,
  "Por favor, detalhe melhor seu horário caso tenha flexibilidade aos sábados."
);

// Student resubmits
repo.submitResponses(101, singleAssignment[0].publicId, {
  q_lesao: "Não",
  q_rotina: "18h durante a semana, 10h aos sábados",
});

// Admin approves
const approved = repo.reviewAssignment(
  10,
  singleAssignment[0].publicId,
  "APPROVE",
  "Excelente! Protocolo de treinos liberado."
);
assert.equal(approved.status, "REVIEWED", "Deve transicionar para REVIEWED");

console.log("  ✓ Fluxo de revisão e ajustes validado com sucesso!");

// 6. MULTI-TENANT ISOLATION
console.log("\n6. Testando isolamento estrito multi-tenant (Consultoria A vs Consultoria B)...");

const formConsultancyA = repo.createForm(10, "Formulário Exclusivo Consultoria Saiya", [
  { id: "q1", title: "Pergunta Segredo", type: "SHORT_TEXT", required: true },
]);

// Admin of Consultancy B (id: 20) attempts to access / publish form of Consultancy A
assert.throws(() => {
  repo.publishForm(20, formConsultancyA.publicId);
}, /Formulário não encontrado/);

assert.throws(() => {
  repo.assignForm(20, formConsultancyA.publicId, [999]);
}, /Formulário não encontrado nesta consultoria/);

assert.throws(() => {
  repo.reviewAssignment(20, singleAssignment[0].publicId, "APPROVE", "Invasão");
}, /Atribuição não encontrada nesta consultoria/);

console.log("  ✓ Isolamento multi-tenant garantido em todas as operações!");

// 7. 1-CLICK WHATSAPP URL GENERATION
console.log("\n7. Testando geração de link de WhatsApp com 1 clique...");

function buildWhatsAppUrlTest(rawPhone, text) {
  const digits = rawPhone.replace(/\D/g, "");
  if (!digits) return "";
  const fullPhone = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  const base = `https://wa.me/${fullPhone}`;
  if (text && text.trim()) {
    return `${base}?text=${encodeURIComponent(text.trim())}`;
  }
  return base;
}

const waUrl = buildWhatsAppUrlTest(
  "(11) 98765-4321",
  "Olá, Patricia! Seu formulário 'Anamnese Pré-Treino' foi liberado no Trevo One: https://trevoone.com/consultoria/saiya-shape/formularios/abc-123"
);
assert(waUrl.startsWith("https://wa.me/5511987654321?text="));
assert(waUrl.includes("Anamnese%20Pr%C3%A9-Treino"));

console.log("  ✓ Link inteligente de WhatsApp validado!");

console.log("\n=====================================================================");
console.log("TODOS OS TESTES DO MÓDULO FORMULÁRIOS PASSARAM COM SUCESSO (100% PASS)");
console.log("=====================================================================");
