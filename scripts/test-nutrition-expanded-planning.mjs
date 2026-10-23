/**
 * TREVO ONE — TEST SUITE: EXPANDED PLANNING, ANTHROPOMETRICS, BODY COMP 2C, AND LAB EXAMS
 * Validates clinical catalogs, bilateral measures, strict distinction of landmarks,
 * 2-component model integrity, qualifier parsing, reference evaluation, evolution delta (p.p. vs %),
 * and field preferences isolation.
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

// 2. Conversões e Normalizações de Diâmetros
console.log("\n2. Conversões Métricas de Diâmetros Ósseos");

runTest("Conversão mm para cm normaliza corretamente para armazenamento canônico", () => {
  assert.equal(normalizeMmToCm(65), 6.5);
  assert.equal(normalizeMmToCm(98.4), 9.84);
  assert.equal(normalizeMmToCm(null), null);
  assert.equal(normalizeMmToCm(undefined), null);
});

runTest("Conversão cm para mm preserva unidade para exibição", () => {
  assert.equal(convertCmToMm(6.5), 65);
  assert.equal(convertCmToMm(9.84), 98.4);
  assert.equal(convertCmToMm(null), null);
});

// 3. Relação Cintura-Quadril (RCQ)
console.log("\n3. Avaliação da Relação Cintura-Quadril (RCQ)");

runTest("RCQ divide estritamente Cintura por Quadril da mesma data", () => {
  const res = computeWaistToHipEvaluation({
    waistCm: 70,
    hipCm: 100,
    assessmentDate: "2026-10-23",
  });
  assert.ok(res);
  assert.equal(res.ratio, 0.7);
  assert.equal(res.isComputable, true);
  assert.equal(res.status, "OK");
});

runTest("RCQ rejeita se quadril for zero ou cintura/quadril ausentes", () => {
  const zeroHip = computeWaistToHipEvaluation({ waistCm: 70, hipCm: 0, assessmentDate: "2026-10-23" });
  assert.equal(zeroHip.isComputable, false);
  assert.equal(zeroHip.ratio, null);

  const missingWaist = computeWaistToHipEvaluation({ waistCm: null, hipCm: 100, assessmentDate: "2026-10-23" });
  assert.equal(missingWaist.isComputable, false);
  assert.equal(missingWaist.status, "MISSING_WAIST");

  const missingBoth = computeWaistToHipEvaluation({ waistCm: null, hipCm: null, assessmentDate: "2026-10-23" });
  assert.equal(missingBoth.isComputable, false);
  assert.equal(missingBoth.status, "MISSING_BOTH");
});

// 4. Composição Corporal & Modelo 2 Componentes (2C)
console.log("\n4. Composição Corporal & Modelo 2 Componentes (2C)");

runTest("Modelo 2C deriva Massa Gorda e Massa Livre coerentes", () => {
  const model = deriveTwoComponentModel({
    weightKg: 70,
    bodyFatKg: 14,
    leanMassKg: 56,
    bodyFatPct: 20,
    leanMassPct: 80,
  });
  assert.equal(model.bodyFatKg, 14);
  assert.equal(model.leanMassKg, 56);
  assert.equal(model.bodyFatPct, 20);
  assert.equal(model.leanMassPct, 80);
  assert.equal(model.isInconsistent, false);
});

runTest("Modelo 2C detecta inconsistência quando soma diverge do peso em mais de 0.5 kg", () => {
  // 70 kg total, mas fatMass=20 kg e leanMass=55 kg -> soma = 75 kg (divergência de 5 kg)
  const model = deriveTwoComponentModel({
    weightKg: 70,
    bodyFatKg: 20,
    leanMassKg: 55,
    bodyFatPct: null,
    leanMassPct: null,
  });
  assert.equal(model.isInconsistent, true);
  assert.ok(model.inconsistencyDetails?.includes("divergindo"));
  assert.ok(model.inconsistencyDetails?.includes("75.0 kg"));
  // Valores digitados são PRESERVADOS sem alteração silenciosa
  assert.equal(model.bodyFatKg, 20);
  assert.equal(model.leanMassKg, 55);
});

runTest("Modelo 2C aceita tolerância de até 0.5 kg sem disparar inconsistência", () => {
  // 70 kg total, soma = 70.3 kg (diferença de 0.3 kg, dentro da tolerância)
  const model = deriveTwoComponentModel({
    weightKg: 70,
    bodyFatKg: 15.1,
    leanMassKg: 55.2,
    bodyFatPct: null,
    leanMassPct: null,
  });
  assert.equal(model.isInconsistent, false);
});

// 5. Exames Laboratoriais, Qualificadores e Referências
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
  assert.equal(iron.defaultUnit, "mcg/dL");
  assert.equal(ferritin.defaultUnit, "ng/mL");
  assert.ok(iron.notes.includes("circulante ligado à transferrina"));
  assert.ok(ferritin.notes.includes("reserva tecidual de ferro"));
});

runTest("Vitamina D 25(OH)D é distinguida como marcador canônico de status", () => {
  const vitD = CANONICAL_LAB_EXAMS.find((e) => e.canonicalKey === "VITAMIN_D_25_OH");
  assert.ok(vitD);
  assert.equal(vitD.name, "Vitamina D — 25(OH)D");
  assert.ok(vitD.notes.includes("25-hidroxivitamina D"));
});

runTest("Parser de qualificadores preserva '<' e '>' e extrai número", () => {
  const lt = parseLabResultRaw("< 0.05");
  assert.equal(lt.qualifier, "<");
  assert.equal(lt.numericValue, 0.05);

  const gt = parseLabResultRaw("> 250");
  assert.equal(gt.qualifier, ">");
  assert.equal(gt.numericValue, 250);

  const clean = parseLabResultRaw("142.5");
  assert.equal(clean.qualifier, null);
  assert.equal(clean.numericValue, 142.5);
});

runTest("Avaliador de status clínico identifica NORMAL, OUT_OF_RANGE e UNSPECIFIED", () => {
  const normal = evaluateLabResultAgainstReference("85", 70, 99);
  assert.equal(normal.status, "NORMAL");

  const low = evaluateLabResultAgainstReference("60", 70, 99);
  assert.equal(low.status, "OUT_OF_RANGE");

  const high = evaluateLabResultAgainstReference("110", 70, 99);
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
  assert.equal(delta.relativePercentageChange, -5); // ( -4 / 80 ) * 100 = -5%
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

console.log(`\n========================================`);
console.log(`TOTAL DE TESTES: ${totalTests}`);
console.log(`TESTES APROVADOS: ${passedTests}`);
console.log(`RESULTADO: ${passedTests === totalTests ? "PASS" : "FAIL"}`);
console.log(`========================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
