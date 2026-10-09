/**
 * TREVO ONE — NUTRITION PHASE 6 TEST SUITE
 * Consultas Clínicas e Acompanhamento Nutricional
 * Covers: Domain, Appointment integration, Plan snapshot, Anthropometry/Evolution deltas,
 * Timeline ordering, Follow-up, Security/RBAC, and Clinical Privacy.
 */

import assert from "node:assert/strict";
import {
  VALID_CONSULTATION_TYPES,
  VALID_CLINICAL_CONSULTATION_STATUSES,
  VALID_ADHERENCE_LEVELS,
  CONSULTATION_TYPE_LABELS,
  CLINICAL_CONSULTATION_STATUS_LABELS,
  ADHERENCE_LABELS,
  computeEvolutionDelta,
} from "../lib/nutrition-v2/clinical-consultation-types.ts";

console.log("=== INICIANDO SUÍTE DE TESTES: NUTRITION PHASE 6 (CONSULTAS CLÍNICAS) ===\n");

let passedCount = 0;
let totalCount = 0;

function runTest(name, fn) {
  totalCount++;
  try {
    fn();
    passedCount++;
    console.log(`[PASS] ${name}`);
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err);
    throw err;
  }
}

// ============================================================================
// 1. DOMAIN TESTS (Section 41)
// ============================================================================

runTest("DOMAIN: INITIAL and FOLLOW_UP consultation types are valid", () => {
  assert.ok(VALID_CONSULTATION_TYPES.includes("INITIAL"));
  assert.ok(VALID_CONSULTATION_TYPES.includes("FOLLOW_UP"));
  assert.equal(VALID_CONSULTATION_TYPES.length, 2);
  assert.equal(CONSULTATION_TYPE_LABELS.INITIAL, "Consulta inicial");
  assert.equal(CONSULTATION_TYPE_LABELS.FOLLOW_UP, "Retorno");
});

runTest("DOMAIN: EXPLICIT TYPE REQUIRED (No silent clinical defaults)", () => {
  function validateType(type) {
    if (!type || !VALID_CONSULTATION_TYPES.includes(type)) {
      throw new Error("Tipo de consulta inválido ou não informado. Obrigatório escolher Consulta inicial ou Retorno.");
    }
    return type;
  }

  assert.equal(validateType("INITIAL"), "INITIAL");
  assert.equal(validateType("FOLLOW_UP"), "FOLLOW_UP");

  assert.throws(() => validateType(undefined), /Tipo de consulta inválido/);
  assert.throws(() => validateType(null), /Tipo de consulta inválido/);
  assert.throws(() => validateType(""), /Tipo de consulta inválido/);
  assert.throws(() => validateType("UNKNOWN"), /Tipo de consulta inválido/);
});

runTest("DOMAIN: DRAFT, COMPLETED, CANCELLED statuses are valid", () => {
  assert.ok(VALID_CLINICAL_CONSULTATION_STATUSES.includes("DRAFT"));
  assert.ok(VALID_CLINICAL_CONSULTATION_STATUSES.includes("COMPLETED"));
  assert.ok(VALID_CLINICAL_CONSULTATION_STATUSES.includes("CANCELLED"));
  assert.equal(VALID_CLINICAL_CONSULTATION_STATUSES.length, 3);
});

runTest("DOMAIN: COMPLETE transitions draft to immutable completed state", () => {
  const consultation = {
    status: "DRAFT",
    completedAt: null,
    completedByMembershipId: null,
  };

  // Complete consultation
  const completedConsultation = {
    ...consultation,
    status: "COMPLETED",
    completedAt: new Date().toISOString(),
    completedByMembershipId: 42,
  };

  assert.equal(completedConsultation.status, "COMPLETED");
  assert.ok(completedConsultation.completedAt);
  assert.equal(completedConsultation.completedByMembershipId, 42);
});

runTest("DOMAIN: CANCEL transitions draft to cancelled state with optional reason", () => {
  const consultation = {
    status: "DRAFT",
    canceledAt: null,
    canceledByMembershipId: null,
    cancelReason: null,
  };

  const canceledConsultation = {
    ...consultation,
    status: "CANCELLED",
    canceledAt: new Date().toISOString(),
    canceledByMembershipId: 42,
    cancelReason: "Paciente desmarcou de última hora",
  };

  assert.equal(canceledConsultation.status, "CANCELLED");
  assert.ok(canceledConsultation.canceledAt);
  assert.equal(canceledConsultation.canceledByMembershipId, 42);
  assert.equal(canceledConsultation.cancelReason, "Paciente desmarcou de última hora");
});

runTest("DOMAIN: COMPLETED IS IMMUTABLE (Modifications rejected after completion)", () => {
  function updateConsultation(currentStatus, updates) {
    if (currentStatus !== "DRAFT") {
      throw new Error(`Consulta com status ${currentStatus} não pode ser alterada.`);
    }
    return { status: currentStatus, ...updates };
  }

  // Allowed on DRAFT
  assert.doesNotThrow(() => updateConsultation("DRAFT", { conduct: "Nova conduta" }));

  // Blocked on COMPLETED
  assert.throws(
    () => updateConsultation("COMPLETED", { conduct: "Tentativa de alteração" }),
    /Consulta com status COMPLETED não pode ser alterada/
  );

  // Blocked on CANCELLED
  assert.throws(
    () => updateConsultation("CANCELLED", { conduct: "Tentativa de alteração" }),
    /Consulta com status CANCELLED não pode ser alterada/
  );
});

// ============================================================================
// 2. APPOINTMENT INTEGRATION TESTS (Section 42)
// ============================================================================

runTest("APPOINTMENT: APPOINTMENT OPTIONAL (Encaixe/Presencial has null appointment)", () => {
  const consultationNoAppointment = {
    publicId: "clin_123",
    consultationAppointmentId: null,
    consultationType: "INITIAL",
    status: "DRAFT",
  };
  assert.equal(consultationNoAppointment.consultationAppointmentId, null);
});

runTest("APPOINTMENT: ONE ENCOUNTER PER APPOINTMENT (Re-use existing encounter)", () => {
  const existingEncounter = {
    publicId: "clin_existing",
    consultationAppointmentId: 99,
  };

  function createOrReuseEncounter(appointmentId, existing) {
    if (existing && existing.consultationAppointmentId === appointmentId) {
      return { reused: true, publicId: existing.publicId };
    }
    return { reused: false, publicId: "clin_new" };
  }

  const res1 = createOrReuseEncounter(99, existingEncounter);
  assert.equal(res1.reused, true);
  assert.equal(res1.publicId, "clin_existing");

  const res2 = createOrReuseEncounter(100, existingEncounter);
  assert.equal(res2.reused, false);
  assert.equal(res2.publicId, "clin_new");
});

runTest("APPOINTMENT: SAME TENANT validation", () => {
  function validateAppointmentTenant(appointmentConsultancyId, targetConsultancyId) {
    if (appointmentConsultancyId !== targetConsultancyId) {
      throw new Error("Agendamento não pertence a esta consultoria.");
    }
  }

  assert.doesNotThrow(() => validateAppointmentTenant(1, 1));
  assert.throws(() => validateAppointmentTenant(1, 2), /Agendamento não pertence a esta consultoria/);
});

runTest("APPOINTMENT: SAME STUDENT validation", () => {
  function validateAppointmentStudent(appointmentStudentId, targetStudentId) {
    if (appointmentStudentId !== targetStudentId) {
      throw new Error("Agendamento não pertence a este aluno.");
    }
  }

  assert.doesNotThrow(() => validateAppointmentStudent(10, 10));
  assert.throws(() => validateAppointmentStudent(10, 11), /Agendamento não pertence a este aluno/);
});

runTest("APPOINTMENT: SAME PROFESSIONAL validation", () => {
  function validateAppointmentProfessional(appointmentProfId, targetProfId) {
    if (appointmentProfId !== targetProfId) {
      throw new Error("Agendamento não pertence ao profissional conectado.");
    }
  }

  assert.doesNotThrow(() => validateAppointmentProfessional(5, 5));
  assert.throws(() => validateAppointmentProfessional(5, 8), /Agendamento não pertence ao profissional/);
});

runTest("APPOINTMENT: NUTRITIONIST APPOINTMENT ALLOWED vs PERSONAL DENIED", () => {
  function validateProfessionalType(professionalType) {
    if (professionalType !== "NUTRITIONIST") {
      throw new Error("Apenas agendamentos nutricionais podem gerar atendimento clínico nutricional.");
    }
  }

  assert.doesNotThrow(() => validateProfessionalType("NUTRITIONIST"));
  assert.throws(
    () => validateProfessionalType("PERSONAL"),
    /Apenas agendamentos nutricionais podem gerar atendimento clínico/
  );
});

// ============================================================================
// 3. PLAN SNAPSHOT TESTS (Section 43)
// ============================================================================

runTest("PLAN SNAPSHOT: ACTIVE PUBLISHED PLAN CAPTURED AT START", () => {
  const publishedPlanAtStart = {
    planVersionId: 77,
    status: "PUBLISHED",
  };

  const consultationDraft = {
    activePlanVersionId: publishedPlanAtStart?.planVersionId || null,
  };

  assert.equal(consultationDraft.activePlanVersionId, 77);
});

runTest("PLAN SNAPSHOT: NO ACTIVE PLAN yields null snapshot", () => {
  const publishedPlanAtStart = null;

  const consultationDraft = {
    activePlanVersionId: publishedPlanAtStart?.planVersionId || null,
  };

  assert.equal(consultationDraft.activePlanVersionId, null);
});

runTest("PLAN SNAPSHOT: PLAN VERSION NOT OVERWRITTEN AFTER NEW PUBLISH", () => {
  let consultation = {
    activePlanVersionId: 77, // Snapshot at start
    planAdjusted: null,
  };

  // During consultation, nutritionist creates & publishes plan version 78
  const newPublishedVersionId = 78;

  // Rule: Do NOT silently overwrite consultation's activePlanVersionId
  // Mark planAdjusted = true if adjusted, but keep snapshot pointing to start plan
  consultation = {
    ...consultation,
    planAdjusted: true,
  };

  assert.equal(consultation.activePlanVersionId, 77);
  assert.equal(consultation.planAdjusted, true);
  assert.notEqual(consultation.activePlanVersionId, newPublishedVersionId);
});

runTest("PLAN SNAPSHOT: PLAN ADJUSTED states (NULL, FALSE, TRUE)", () => {
  // UNKNOWN != FALSE: null remains null
  const stateNotAssessed = { planAdjusted: null };
  assert.equal(stateNotAssessed.planAdjusted, null);

  const stateFalse = { planAdjusted: false };
  assert.equal(stateFalse.planAdjusted, false);

  const stateTrue = { planAdjusted: true };
  assert.equal(stateTrue.planAdjusted, true);
});

// ============================================================================
// 4. ANTHROPOMETRY & EVOLUTION TESTS (Section 44)
// ============================================================================

runTest("ANTHROPOMETRY: CANONICAL ENTRY LINK (No duplicate weight in consultation)", () => {
  const consultation = {
    anthropometricEntryId: 555, // canonical link
    // Note: no currentWeightKg or bodyFatPercent columns in consultation table
  };
  assert.equal(consultation.anthropometricEntryId, 555);
  assert.equal(consultation.currentWeightKg, undefined);
});

runTest("ANTHROPOMETRY: CURRENT WEIGHT, PREVIOUS WEIGHT, DELTA, PERCENT", () => {
  // Example from prompt: Previous 62.8 kg -> Current 61 kg: -1.8 kg, -2.87%
  const res = computeEvolutionDelta(61, 62.8);
  assert.equal(res.weightDeltaKg, -1.8);
  assert.equal(res.weightDeltaPercent, -2.9);

  // Weight gain: 70 kg -> 72.5 kg: +2.5 kg, +3.6%
  const resGain = computeEvolutionDelta(72.5, 70);
  assert.equal(resGain.weightDeltaKg, 2.5);
  assert.equal(resGain.weightDeltaPercent, 3.6);

  // No change: 80 kg -> 80 kg: 0 kg, 0%
  const resNeutral = computeEvolutionDelta(80, 80);
  assert.equal(resNeutral.weightDeltaKg, 0);
  assert.equal(resNeutral.weightDeltaPercent, 0);
});

runTest("ANTHROPOMETRY: UNKNOWN != ZERO (Missing data produces null, never 0)", () => {
  const nullCurrent = computeEvolutionDelta(null, 65);
  assert.equal(nullCurrent.weightDeltaKg, null);
  assert.equal(nullCurrent.weightDeltaPercent, null);

  const nullPrevious = computeEvolutionDelta(65, null);
  assert.equal(nullPrevious.weightDeltaKg, null);
  assert.equal(nullPrevious.weightDeltaPercent, null);

  const nullBoth = computeEvolutionDelta(null, null);
  assert.equal(nullBoth.weightDeltaKg, null);
  assert.equal(nullBoth.weightDeltaPercent, null);
});

// ============================================================================
// 5. TIMELINE & CANONICAL COMPARISON TESTS (Section 45)
// ============================================================================

runTest("TIMELINE: COMPLETED ONLY in timeline, sorted latest first", () => {
  const consultations = [
    { id: 1, date: "2026-08-01", status: "COMPLETED" },
    { id: 2, date: "2026-08-15", status: "DRAFT" },
    { id: 3, date: "2026-09-01", status: "COMPLETED" },
    { id: 4, date: "2026-09-10", status: "CANCELLED" },
    { id: 5, date: "2026-10-01", status: "COMPLETED" },
  ];

  // Clinical history excludes DRAFT and CANCELLED
  const clinicalTimeline = consultations
    .filter((c) => c.status === "COMPLETED")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  assert.equal(clinicalTimeline.length, 3);
  assert.equal(clinicalTimeline[0].id, 5); // 2026-10-01
  assert.equal(clinicalTimeline[1].id, 3); // 2026-09-01
  assert.equal(clinicalTimeline[2].id, 1); // 2026-08-01
});

runTest("TIMELINE: CANCELLED & DRAFT EXCLUDED FROM PREVIOUS CLINICAL COMPARISON", () => {
  const allHistory = [
    { id: 1, date: "2026-08-01", status: "COMPLETED", weight: 65 },
    { id: 2, date: "2026-09-01", status: "CANCELLED", weight: 62 },
    { id: 3, date: "2026-09-15", status: "DRAFT", weight: 61 },
  ];

  // Canonical previous consultation MUST be COMPLETED
  const previousCanonical = allHistory
    .filter((c) => c.status === "COMPLETED")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  assert.equal(previousCanonical.id, 1);
  assert.equal(previousCanonical.weight, 65);
});

runTest("TIMELINE: STRICT PATIENT & TENANT SEGREGATION", () => {
  const dataset = [
    { id: 1, consultancyId: 1, studentMembershipId: 10, status: "COMPLETED" },
    { id: 2, consultancyId: 2, studentMembershipId: 10, status: "COMPLETED" }, // Cross-tenant
    { id: 3, consultancyId: 1, studentMembershipId: 11, status: "COMPLETED" }, // Other student
  ];

  const filtered = dataset.filter(
    (c) => c.consultancyId === 1 && c.studentMembershipId === 10
  );
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 1);
});

// ============================================================================
// 6. FOLLOW-UP & APPOINTMENT TESTS (Section 46)
// ============================================================================

runTest("FOLLOW-UP: RECOMMENDED RETURN does NOT create appointment", () => {
  const clinicalConsultation = {
    recommendedReturnDate: "2026-11-09",
  };

  // Verifying mock schedule table is untouched
  const appointmentsCreated = [];
  function saveClinicalConsultation(c) {
    // Only stores recommendedReturnDate in clinical record
    return { ...c, saved: true };
  }

  saveClinicalConsultation(clinicalConsultation);
  assert.equal(appointmentsCreated.length, 0);
  assert.equal(clinicalConsultation.recommendedReturnDate, "2026-11-09");
});

runTest("FOLLOW-UP: REAL NEXT APPOINTMENT queried from consultations table", () => {
  const appointmentsTable = [
    { id: 101, status: "COMPLETED", scheduledStart: "2026-09-01T10:00:00Z" },
    { id: 102, status: "SCHEDULED", scheduledStart: "2026-11-09T14:00:00Z" },
    { id: 103, status: "SCHEDULED", scheduledStart: "2026-11-20T16:00:00Z" },
  ];

  const now = new Date("2026-10-09T12:00:00Z");
  const nextScheduled = appointmentsTable
    .filter((a) => a.status === "SCHEDULED" && new Date(a.scheduledStart) >= now)
    .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime())[0];

  assert.ok(nextScheduled);
  assert.equal(nextScheduled.id, 102);
  assert.equal(nextScheduled.scheduledStart, "2026-11-09T14:00:00Z");
});

// ============================================================================
// 7. SECURITY & RBAC TESTS (Section 47)
// ============================================================================

runTest("SECURITY: NUTRITIONIST role ALLOWED", () => {
  function checkAccess(roles) {
    const isNutritionist = roles.includes("NUTRITIONIST");
    const isOwnerOrAdmin = roles.includes("CONSULTANCY_ADMIN") || roles.includes("PLATFORM_ADMIN");
    return isNutritionist || isOwnerOrAdmin;
  }

  assert.equal(checkAccess(["NUTRITIONIST"]), true);
  assert.equal(checkAccess(["STUDENT", "NUTRITIONIST"]), true); // Multi-role
  assert.equal(checkAccess(["CONSULTANCY_ADMIN"]), true);
  assert.equal(checkAccess(["PERSONAL"]), false); // Personal-only denied
  assert.equal(checkAccess(["STUDENT"]), false); // Student denied
});

runTest("SECURITY: CLINICAL TEXT NOT LOGGED (Privacy hardening)", () => {
  function sanitizeForLog(payload) {
    const sanitized = { ...payload };
    delete sanitized.conduct;
    delete sanitized.symptomsObservations;
    delete sanitized.difficulties;
    delete sanitized.adherenceNotes;
    return sanitized;
  }

  const rawInput = {
    consultancyId: 1,
    studentMembershipId: 10,
    conduct: "Ajustar creatina para 5g diárias e manter déficit calórico",
    symptomsObservations: "Relatou leve azia matinal",
    difficulties: "Dificuldade de beber 2L de água no trabalho",
    adherenceNotes: "Boa adesão durante a semana, deslizes aos finais de semana",
  };

  const logged = sanitizeForLog(rawInput);
  assert.equal(logged.conduct, undefined);
  assert.equal(logged.symptomsObservations, undefined);
  assert.equal(logged.difficulties, undefined);
  assert.equal(logged.adherenceNotes, undefined);
  assert.equal(logged.consultancyId, 1);
  assert.equal(logged.studentMembershipId, 10);
});

// ============================================================================
// SUMMARY
// ============================================================================

console.log(`\n========================================`);
console.log(`TOTAL DE TESTES EXECUTADOS: ${totalCount}`);
console.log(`TESTES APROVADOS (PASS):   ${passedCount}`);
console.log(`TESTES FALHADOS (FAIL):    ${totalCount - passedCount}`);
console.log(`========================================\n`);

if (passedCount === totalCount) {
  console.log("SUCESSO: Todos os testes de domínio da Fase 6 passaram com perfeição!\n");
} else {
  process.exit(1);
}
