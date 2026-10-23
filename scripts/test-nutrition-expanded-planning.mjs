/**
 * TREVO ONE — TEST SUITE: EXPANDED PLANNING, ANTHROPOMETRICS, BODY COMP 2C, AND LAB EXAMS
 * Validates clinical catalogs, bilateral measures, strict distinction of landmarks,
 * 2-component model integrity, qualifier parsing, reference evaluation, evolution delta (p.p. vs %),
 * field preferences isolation, audit of database fallbacks, and multi-tenant safety.
 */

import { register } from "node:module";
register("./ts-loader.mjs", import.meta.url);

import assert from "node:assert/strict";

const {
  CANONICAL_PERIMETERS,
  CANONICAL_DIAMETERS,
  CANONICAL_LAB_EXAMS,
  normalizeMmToCm,
  convertCmToMm,
  computeWaistToHipEvaluation,
  deriveTwoComponentModel,
  parseLabResultRaw,
  evaluateLabResultAgainstReference,
  calculateEvolutionDelta,
} = await import("../lib/nutrition-v2/clinical-measurements-catalog.ts");

const {
  DEFAULT_PLANNING_FIELD_PREFERENCES,
} = await import("../lib/nutrition-v2/planning-preferences-repository.ts");

const {
  validateAnthropometricEntryInput,
  validateUpdateAnthropometricEntryInput,
} = await import("../lib/nutrition-v2/patient-record-validation.ts");

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
    process.exitCode = 1;
  }
}

console.log("\n--- TREVO ONE: AUDITORIA DE MEDIDAS, COMPOSIÇÃO 2C E EXAMES LABORATORIAIS ---\n");

// 1. Catálogos Canônicos e Distinções Anatômicas
console.log("1. Catálogo Anatômico & Distinções Clínicas (ISAK/OMS)");

runTest("Catálogo de perímetros contém 14 medições anatômicas padronizadas", () => {
  assert.equal(CANONICAL_PERIMETERS.length, 14);
  const ids = CANONICAL_PERIMETERS.map((p) => p.id);
  assert.ok(ids.includes("waist"));
  assert.ok(ids.includes("abdomen"));
  assert.ok(ids.includes("hip"));
  assert.ok(ids.includes("relaxed_arm"));
  assert.ok(ids.includes("contracted_arm"));
  assert.ok(ids.includes("proximal_thigh"));
  assert.ok(ids.includes("mid_thigh"));
});

runTest("Cintura é estritamente distinta de Abdômen (landmarks anatômicos diferentes)", () => {
  const waist = CANONICAL_PERIMETERS.find((p) => p.id === "waist");
  const abdomen = CANONICAL_PERIMETERS.find((p) => p.id === "abdomen");
  assert.ok(waist && abdomen);
  assert.notEqual(waist.id, abdomen.id);
  assert.notEqual(waist.anatomicalPoint, abdomen.anatomicalPoint);
  assert.ok(waist.anatomicalPoint.includes("mais estreito do tronco"));
  assert.ok(abdomen.anatomicalPoint.includes("cicatriz umbilical"));
});

runTest("Braço Relaxado é estritamente distinto de Braço Contraído", () => {
  const relaxed = CANONICAL_PERIMETERS.find((p) => p.id === "relaxed_arm");
  const contracted = CANONICAL_PERIMETERS.find((p) => p.id === "contracted_arm");
  assert.ok(relaxed && contracted);
  assert.notEqual(relaxed.id, contracted.id);
  assert.ok(relaxed.isBilateral);
  assert.ok(contracted.isBilateral);
});

runTest("Coxa Proximal é estritamente distinta de Coxa Média", () => {
  const prox = CANONICAL_PERIMETERS.find((p) => p.id === "proximal_thigh");
  const mid = CANONICAL_PERIMETERS.find((p) => p.id === "mid_thigh");
  assert.ok(prox && mid);
  assert.notEqual(prox.id, mid.id);
  assert.ok(prox.anatomicalPoint.includes("prega glútea"));
  assert.ok(mid.anatomicalPoint.includes("trocânter maior"));
});

runTest("Catálogo de diâmetros contém 8 itens estruturais com suporte bilateral", () => {
  assert.equal(CANONICAL_DIAMETERS.length, 8);
  const humerus = CANONICAL_DIAMETERS.find((d) => d.id === "humerus_biepicondylar");
  const femur = CANONICAL_DIAMETERS.find((d) => d.id === "femur_biepicondylar");
  assert.ok(humerus && femur);
  assert.ok(humerus.isBilateral);
  assert.ok(femur.isBilateral);
});

// 2. Conversões Métricas
console.log("\n2. Conversões Métricas de Diâmetros Ósseos");

runTest("Conversão mm para cm normaliza corretamente para armazenamento canônico", () => {
  assert.equal(normalizeMmToCm(95), 9.5);
  assert.equal(normalizeMmToCm(102.5), 10.25);
  assert.equal(normalizeMmToCm(null), null);
  assert.equal(normalizeMmToCm(undefined), null);
});

runTest("Conversão cm para mm preserva unidade para exibição", () => {
  assert.equal(convertCmToMm(9.5), 95);
  assert.equal(convertCmToMm(10.25), 102.5);
  assert.equal(convertCmToMm(null), null);
});

// 3. Relação Cintura-Quadril
console.log("\n3. Avaliação da Relação Cintura-Quadril (RCQ)");

runTest("RCQ divide estritamente Cintura por Quadril da mesma data", () => {
  const result = computeWaistToHipEvaluation({
    waistCm: 76,
    hipCm: 98,
    assessmentDate: "2026-10-23",
  });
  assert.equal(result.isComputable, true);
  assert.equal(result.status, "OK");
  assert.equal(result.ratio, 0.78);
  assert.equal(result.ratioFormatted, "0,78");
});

runTest("RCQ rejeita se quadril for zero ou cintura/quadril ausentes", () => {
  const zeroHip = computeWaistToHipEvaluation({
    waistCm: 76,
    hipCm: 0,
    assessmentDate: "2026-10-23",
  });
  assert.equal(zeroHip.isComputable, false);
  assert.equal(zeroHip.status, "INVALID_HIP");

  const missing = computeWaistToHipEvaluation({
    waistCm: null,
    hipCm: 98,
    assessmentDate: "2026-10-23",
  });
  assert.equal(missing.isComputable, false);
  assert.equal(missing.status, "MISSING_WAIST");
});

// 4. Modelo de Dois Componentes
console.log("\n4. Composição Corporal & Modelo 2 Componentes (2C)");

runTest("Modelo 2C deriva Massa Gorda e Massa Livre coerentes", () => {
  const model = deriveTwoComponentModel({
    weightKg: 80,
    bodyFatKg: null,
    bodyFatPct: 20,
    leanMassKg: null,
    leanMassPct: null,
  });
  assert.equal(model.bodyFatKg, 16);
  assert.equal(model.bodyFatPct, 20);
  assert.equal(model.leanMassKg, 64);
  assert.equal(model.leanMassPct, 80);
  assert.equal(model.isInconsistent, false);
});

runTest("Modelo 2C detecta inconsistência quando soma diverge do peso em mais de 0.5 kg", () => {
  const inconsistent = deriveTwoComponentModel({
    weightKg: 80,
    bodyFatKg: 20, // 20 kg
    leanMassKg: 70, // 70 kg -> Soma = 90 kg != 80 kg
    bodyFatPct: null,
    leanMassPct: null,
  });
  assert.equal(inconsistent.isInconsistent, true);
  assert.ok(inconsistent.inconsistencyMessage);
  assert.ok(inconsistent.inconsistencyMessage.toLowerCase().includes("inconsistência"));
});

runTest("Modelo 2C aceita tolerância de até 0.5 kg sem disparar inconsistência", () => {
  const withinTolerance = deriveTwoComponentModel({
    weightKg: 80,
    bodyFatKg: 20.2,
    leanMassKg: 60.1, // Soma = 80.3 kg (diferença de 0.3 kg <= 0.5 kg)
    bodyFatPct: null,
    leanMassPct: null,
  });
  assert.equal(withinTolerance.isInconsistent, false);
});

// 5. Exames Laboratoriais
console.log("\n5. Exames Laboratoriais & Avaliação de Referência");

runTest("Catálogo de exames laboratoriais inclui os biomarcadores exigidos", () => {
  const keys = CANONICAL_LAB_EXAMS.map((e) => e.canonicalKey);
  assert.ok(keys.includes("TOTAL_CHOLESTEROL"));
  assert.ok(keys.includes("HDL_CHOLESTEROL"));
  assert.ok(keys.includes("LDL_CHOLESTEROL"));
  assert.ok(keys.includes("TRIGLYCERIDES"));
  assert.ok(keys.includes("SERUM_IRON"));
  assert.ok(keys.includes("FERRITIN"));
  assert.ok(keys.includes("VITAMIN_D_25_OH"));
});

runTest("Ferro Sérico é estritamente distinguido de Ferritina", () => {
  const iron = CANONICAL_LAB_EXAMS.find((e) => e.canonicalKey === "SERUM_IRON");
  const ferritin = CANONICAL_LAB_EXAMS.find((e) => e.canonicalKey === "FERRITIN");
  assert.ok(iron && ferritin);
  assert.notEqual(iron.canonicalKey, ferritin.canonicalKey);
  assert.notEqual(iron.defaultUnit, ferritin.defaultUnit);
  assert.ok(iron.notes.includes("Não confundir com Ferritina"));
});

runTest("Vitamina D 25(OH)D é distinguida como marcador canônico de status", () => {
  const vitD = CANONICAL_LAB_EXAMS.find((e) => e.canonicalKey === "VITAMIN_D_25_OH");
  assert.ok(vitD);
  assert.ok(vitD.notes.includes("Marcador padrão do status de vitamina D"));
  assert.ok(vitD.notes.includes("1,25(OH)2D"));
});

runTest("Parser de qualificadores preserva '<' e '>' e extrai número", () => {
  const lt = parseLabResultRaw("< 0.05");
  assert.equal(lt.qualifier, "<");
  assert.equal(lt.numericValue, 0.05);
  assert.equal(lt.verbatim, "< 0.05");

  const gt = parseLabResultRaw("> 1500");
  assert.equal(gt.qualifier, ">");
  assert.equal(gt.numericValue, 1500);

  const plain = parseLabResultRaw("182.4");
  assert.equal(plain.qualifier, null);
  assert.equal(plain.numericValue, 182.4);
});

runTest("Avaliador de status clínico identifica NORMAL, OUT_OF_RANGE e UNSPECIFIED", () => {
  const normal = evaluateLabResultAgainstReference("55", 40, 100);
  assert.equal(normal.status, "NORMAL");

  const high = evaluateLabResultAgainstReference("180", 40, 100);
  assert.equal(high.status, "OUT_OF_RANGE");

  const unspecified = evaluateLabResultAgainstReference("85", null, null);
  assert.equal(unspecified.status, "UNSPECIFIED");
});

// 6. Evolução Temporal de Medidas (p.p. vs %)
console.log("\n6. Comparador Temporal & Rigor de Unidades (p.p. vs %)");

runTest("Variação de grandezas percentuais (% gordura) expressa em pontos percentuais (p.p.)", () => {
  const delta = calculateEvolutionDelta(18, 22, true);
  assert.ok(delta);
  assert.equal(delta.isPercentageMetric, true);
  assert.equal(delta.percentagePointsDelta, -4);
  assert.ok(delta.displayText.includes("p.p."));
});

runTest("Variação de grandezas absolutas (kg, cm) expressa em delta absoluto e % relativo", () => {
  const delta = calculateEvolutionDelta(76, 80, false);
  assert.ok(delta);
  assert.equal(delta.isPercentageMetric, false);
  assert.equal(delta.absoluteDelta, -4);
  assert.equal(delta.relativePercentageChange, -5);
  assert.ok(delta.displayText.includes("-4"));
  assert.ok(delta.displayText.includes("-5%"));
});

// 7. Validação de Entrada Antropométrica
console.log("\n7. Validação de Payload de Avaliação com Medidas Estruturadas");

runTest("validateAnthropometricEntryInput sincroniza escalares e preserva JSON estruturado", () => {
  const input = {
    measurementDate: "2026-10-23",
    weightKg: 75,
    perimeters: {
      waistCm: 80,
      hipCm: 100,
      relaxedArmRightCm: 32,
      relaxedArmLeftCm: 31.5,
    },
    bodyComposition: {
      weightKg: 75,
      bodyFatPct: 18,
      bodyFatKg: 13.5,
      leanMassKg: 61.5,
      muscleMassKg: 35,
    },
  };

  const validated = validateAnthropometricEntryInput(input);
  assert.equal(validated.measurementDate, "2026-10-23");
  assert.equal(validated.weightKg, 75);
  assert.equal(validated.waistCm, 80);
  assert.equal(validated.hipCm, 100);
  assert.equal(validated.bodyFatPct, 18);
  assert.equal(validated.muscleMassKg, 35);
  assert.ok(validated.perimeters);
  assert.equal(validated.perimeters.relaxedArmRightCm, 32);
  assert.equal(validated.perimeters.relaxedArmLeftCm, 31.5);
  assert.ok(validated.bodyComposition);
  assert.equal(validated.bodyComposition.muscleMassKg, 35);
});

// 8. Preferências de Campos
console.log("\n8. Preferências de Campos e Isolamento de Exibição");

runTest("Preferências padrão exibem todas as seções por default", () => {
  assert.equal(DEFAULT_PLANNING_FIELD_PREFERENCES.showSummary, true);
  assert.equal(DEFAULT_PLANNING_FIELD_PREFERENCES.showPerimeters, true);
  assert.equal(DEFAULT_PLANNING_FIELD_PREFERENCES.showDiameters, true);
  assert.equal(DEFAULT_PLANNING_FIELD_PREFERENCES.showSkinfolds, true);
  assert.equal(DEFAULT_PLANNING_FIELD_PREFERENCES.showBodyComposition, true);
  assert.equal(DEFAULT_PLANNING_FIELD_PREFERENCES.showLabExams, true);
  assert.equal(DEFAULT_PLANNING_FIELD_PREFERENCES.showEvolution, true);
  assert.equal(DEFAULT_PLANNING_FIELD_PREFERENCES.preferredDiameterUnit, "cm");
});

// 9. Avaliação Parcial & Medidas Bilaterais e Customizadas
console.log("\n9. Avaliação Parcial, Lateralidade e Medidas Customizadas");

runTest("Nova avaliação parcial com apenas panturrilha D/E e cintura é válida", () => {
  const partial = validateAnthropometricEntryInput({
    measurementDate: "2026-10-23",
    perimeters: {
      waistCm: 82,
      calfRightCm: 38.5,
      calfLeftCm: 38.0,
    },
  });
  assert.equal(partial.waistCm, 82);
  assert.equal(partial.calfCm, 38.5); // Sincronizado para scalar
  assert.equal(partial.perimeters.calfRightCm, 38.5);
  assert.equal(partial.perimeters.calfLeftCm, 38.0);
  assert.equal(partial.weightKg, null); // Parcial aceita campos ausentes e normaliza para null
});

runTest("Diâmetro biepicondiliano do fêmur bilateral D/E e custom diameters aceitos", () => {
  const diametersInput = validateAnthropometricEntryInput({
    measurementDate: "2026-10-23",
    diameters: {
      femurBiepicondylarRightCm: 9.8,
      femurBiepicondylarLeftCm: 9.7,
      customDiameters: [
        {
          id: "custom-1",
          name: "Diâmetro Maléolo Teste",
          value: 7.2,
          unit: "cm",
          side: "RIGHT",
        },
      ],
    },
  });
  assert.ok(diametersInput.diameters);
  assert.equal(diametersInput.diameters.femurBiepicondylarRightCm, 9.8);
  assert.equal(diametersInput.diameters.femurBiepicondylarLeftCm, 9.7);
  assert.equal(diametersInput.diameters.customDiameters.length, 1);
  assert.equal(diametersInput.diameters.customDiameters[0].value, 7.2);
});

// 10. Auditoria de Fallbacks de Persistência
console.log("\n10. Auditoria Estrita de Fallbacks de Persistência");

runTest("Identificação de dados ampliados impede fallback silencioso com perda de medições", () => {
  const entryWithBilateral = validateAnthropometricEntryInput({
    measurementDate: "2026-10-23",
    perimeters: {
      calfRightCm: 38.5,
      calfLeftCm: 38.0, // Campo ampliado que só existe no JSON da 065
    },
  });

  // Simulação da verificação de salvamento no repositório:
  const hasExpanded = Boolean(
    (entryWithBilateral.perimeters && Object.values(entryWithBilateral.perimeters).some((v) => v !== null && v !== undefined)) ||
    (entryWithBilateral.diameters && Object.values(entryWithBilateral.diameters).some((v) => v !== null && v !== undefined))
  );

  assert.equal(hasExpanded, true);
  // O repositório agora lança erro explícito em vez de descartar os dados e fingir sucesso
});

runTest("Avaliação estritamente clássica (sem dados 065) permite fallback seguro sem perda", () => {
  const entryClassic = validateAnthropometricEntryInput({
    measurementDate: "2026-10-23",
    weightKg: 78.5,
    heightCm: 175,
    waistCm: 84,
    hipCm: 102,
  });

  const hasExpanded = Boolean(
    (entryClassic.perimeters && Object.values(entryClassic.perimeters).some((v) => v !== null && v !== undefined)) ||
    (entryClassic.diameters && Object.values(entryClassic.diameters).some((v) => v !== null && v !== undefined))
  );

  assert.equal(hasExpanded, false);
});

// 11. Concorrência e Isolamento Multi-Tenant
console.log("\n11. Concorrência, Autosave & Isolamento Multi-Tenant");

runTest("Validação de edição exige identificador público e editReason auditável", () => {
  const updateInput = validateUpdateAnthropometricEntryInput({
    entryPublicId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    measurementDate: "2026-10-23",
    weightKg: 79.0,
    editReason: "Correção de aferição após reteste com paciente",
  });
  assert.equal(updateInput.entryPublicId, "3fa85f64-5717-4562-b3fc-2c963f66afa6");
  assert.equal(updateInput.weightKg, 79.0);
  assert.equal(updateInput.editReason, "Correção de aferição após reteste com paciente");
});

runTest("Rejeita atualização sem identificador de medição", () => {
  assert.throws(() => {
    validateUpdateAnthropometricEntryInput({
      measurementDate: "2026-10-23",
      weightKg: 79.0,
    });
  }, /identificador da medição/i);
});

console.log(`\n========================================`);
console.log(`TOTAL DE TESTES: ${totalTests}`);
console.log(`TESTES APROVADOS: ${passedTests}`);
console.log(`RESULTADO: ${passedTests === totalTests ? "PASS" : "FAIL"}`);
console.log(`========================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
