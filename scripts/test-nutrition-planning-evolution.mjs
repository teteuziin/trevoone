/**
 * TREVO ONE — NUTRITION PROFESSIONAL V2
 * ETAPA 11 TEST SUITE: PLANEJAMENTO E EVOLUÇÃO NUTRICIONAL
 *
 * Verifies:
 * 1. BMI Population-specific classifications (Adult WHO, Elderly Lipschitz 1991, Pregnancy, Pediatric)
 * 2. Basal Metabolic Rate (TMB) vs Resting Energy Expenditure (GER) equations:
 *    - Mifflin-St Jeor (1990)
 *    - Harris-Benedict Revised (1984)
 *    - FAO / OMS / UNU (2004) across age brackets
 *    - Katch-McArdle (1996) based on FFM
 *    - Cunningham (1980) based on FFM
 * 3. Skinfold Protocols & Body Composition (Pollock 3 M/F, Pollock 7, Faulkner 4, Petroski 4)
 *    - Density-to-%fat equations: Siri (1961) and Brozek (1963)
 *    - Strict evaluation isolation (never mix skinfolds across evaluations)
 * 4. Waist-to-Hip Ratio (RCQ / WHR) per WHO 2008 standards
 * 5. Input validation bounds (anatomical limits) and auditability constraints (mandatory editReason)
 */

import { register } from "node:module";
register("./ts-loader.mjs", import.meta.url);

import assert from "node:assert/strict";

const {
  classifyBMI,
  calculateMifflinStJeor,
  calculateHarrisBenedictRevised,
  calculateFaoOms,
  calculateKatchMcArdle,
  calculateCunningham,
  densityToFatPctSiri,
  densityToFatPctBrozek,
  calculatePollock3,
  calculatePollock7,
  calculateFaulkner4,
  calculatePetroski4,
  resolveEvaluationBodyComposition,
  calculateWaistToHipRatio,
} = await import("../lib/nutrition-v2/clinical-calculations/index.ts");

const {
  validateAnthropometricEntryInput,
  validateUpdateAnthropometricEntryInput,
} = await import("../lib/nutrition-v2/patient-record-validation.ts");

let totalTests = 0;
let passedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    Error: ${err.message}`);
    throw err;
  }
}

console.log("\n=======================================================");
console.log("TREVO ONE — ETAPA 11 TEST SUITE: PLANEJAMENTO & EVOLUÇÃO");
console.log("=======================================================\n");

// ============================================================================
// 1. BMI CLASSIFICATION WITH POPULATION CONTEXT
// ============================================================================
console.log("--- 1. Classificação de IMC & Contextos Populacionais ---");

test("Adulto Geral (WHO): classifica corretamente faixas eutrófica, sobrepeso e obesidade", () => {
  assert.equal(classifyBMI(22.5, { ageYears: 30 })?.category, "Eutrofia");
  assert.equal(classifyBMI(17.5, { ageYears: 25 })?.category, "Magreza leve");
  assert.equal(classifyBMI(27.0, { ageYears: 40 })?.category, "Sobrepeso");
  assert.equal(classifyBMI(32.0, { ageYears: 35 })?.category, "Obesidade Grau I");
  assert.equal(classifyBMI(37.5, { ageYears: 45 })?.category, "Obesidade Grau II");
  assert.equal(classifyBMI(42.0, { ageYears: 50 })?.category, "Obesidade Grau III");
});

test("Idoso (≥60 anos, Critérios de Lipschitz 1991): faixas adaptadas para senescência", () => {
  // < 22: Baixo peso (Idoso)
  assert.equal(classifyBMI(21.5, { ageYears: 65 })?.category, "Baixo peso (Idoso)");
  // 22 a 27: Adequado / Eutrófico (Idoso)
  assert.equal(classifyBMI(24.5, { ageYears: 70 })?.category, "Adequado / Eutrófico (Idoso)");
  // > 27: Excesso de peso (Idoso)
  assert.equal(classifyBMI(28.0, { ageYears: 75 })?.category, "Excesso de peso (Idoso)");
});

test("Contexto Gestacional: emite aviso de que curvas gerais não se aplicam", () => {
  const res = classifyBMI(24.0, { isPregnant: true });
  assert.match(res?.category, /Gestante/);
  assert.match(res?.referenceStandard, /Atalah/);
});

test("Contexto Pediátrico (< 18 anos): emite aviso de percentis/escore-z", () => {
  const res = classifyBMI(19.0, { ageYears: 14 });
  assert.match(res?.category, /Pediátrico/);
  assert.match(res?.referenceStandard, /Percentil/);
});

// ============================================================================
// 2. BASAL METABOLIC RATE (TMB) & RESTING ENERGY EXPENDITURE (GER) EQUATIONS
// ============================================================================
console.log("\n--- 2. Fórmulas de Necessidades Energéticas (TMB vs GER) ---");

test("Mifflin-St Jeor (1990): cálculo determinístico para homens e mulheres", () => {
  // Homem: 75kg, 178cm, 30 anos -> 10*75 + 6.25*178 - 5*30 + 5 = 750 + 1112.5 - 150 + 5 = 1717.5
  const tmbMale = calculateMifflinStJeor(75, 178, 30, "MALE");
  assert.equal(tmbMale, 1717.5);

  // Mulher: 60kg, 165cm, 28 anos -> 10*60 + 6.25*165 - 5*28 - 161 = 600 + 1031.25 - 140 - 161 = 1330.25
  const tmbFemale = calculateMifflinStJeor(60, 165, 28, "FEMALE");
  assert.equal(tmbFemale, 1330.25);
});

test("Harris-Benedict Revisada (Roza & Shizgal 1984): precisão dos coeficientes", () => {
  // Homem: 75kg, 178cm, 30 anos -> 88.362 + 13.397*75 + 4.799*178 - 5.677*30
  // = 88.362 + 1004.775 + 854.222 - 170.31 = 1777.05
  const hbMale = calculateHarrisBenedictRevised(75, 178, 30, "MALE");
  assert.equal(Math.round(hbMale), 1777);

  // Mulher: 60kg, 165cm, 28 anos -> 447.593 + 9.247*60 + 3.098*165 - 4.330*28
  // = 447.593 + 554.82 + 511.17 - 121.24 = 1392.34
  const hbFemale = calculateHarrisBenedictRevised(60, 165, 28, "FEMALE");
  assert.equal(Math.round(hbFemale), 1392);
});

test("FAO/OMS/UNU (2004): faixas etárias específicas", () => {
  // Homem 25 anos (<30): 15.057 * 70 + 692.2 = 1053.99 + 692.2 = 1746.19
  const faoYoung = calculateFaoOms(70, 25, "MALE");
  assert.equal(Math.round(faoYoung), 1746);

  // Homem 45 anos (30-60): 11.472 * 70 + 873.1 = 803.04 + 873.1 = 1676.14
  const faoMid = calculateFaoOms(70, 45, "MALE");
  assert.equal(Math.round(faoMid), 1676);

  // Homem 65 anos (>60): 11.711 * 70 + 587.7 = 819.77 + 587.7 = 1407.47
  const faoSenior = calculateFaoOms(70, 65, "MALE");
  assert.equal(Math.round(faoSenior), 1407);

  // Mulher 35 anos (30-60): 8.126 * 60 + 845.6 = 487.56 + 845.6 = 1333.16
  const faoFemMid = calculateFaoOms(60, 35, "FEMALE");
  assert.equal(Math.round(faoFemMid), 1333);
});

test("Katch-McArdle (1996) - GER baseado em Massa Livre de Gordura (FFM)", () => {
  // FFM = 60kg -> GER = 370 + 21.6 * 60 = 370 + 1296 = 1666 kcal/dia
  const gerKatch = calculateKatchMcArdle(60);
  assert.equal(gerKatch, 1666);
});

test("Cunningham (1980) - GER baseado em Massa Livre de Gordura (FFM)", () => {
  // FFM = 60kg -> GER = 500 + 22 * 60 = 500 + 1320 = 1820 kcal/dia
  const gerCunn = calculateCunningham(60);
  assert.equal(gerCunn, 1820);
});

// ============================================================================
// 3. SKINFOLD PROTOCOLS & BODY COMPOSITION
// ============================================================================
console.log("\n--- 3. Protocolos de Dobras Cutâneas & Composição Corporal ---");

test("Siri (1961) e Brozek (1963): conversão de densidade corporal para % de gordura", () => {
  const density = 1.055;
  const siri = densityToFatPctSiri(density);
  const brozek = densityToFatPctBrozek(density);

  // Siri: (4.95 / 1.055 - 4.5) * 100 = 19.19%
  assert.equal(siri, 19.19);
  // Brozek: (4.57 / 1.055 - 4.142) * 100 = 18.98%
  assert.equal(brozek, 18.98);
});

test("Pollock 3 Dobras (Homens: Peitoral, Abdômen, Coxa)", () => {
  const skinfolds = {
    chestFoldMm: 12,
    abdominalFoldMm: 22,
    thighFoldMm: 16,
  };
  const res = calculatePollock3(skinfolds, 30, "MALE", 80);
  assert.equal(res.isComplete, true);
  assert.equal(res.sumSkinfoldsMm, 50);
  assert.ok(res.bodyDensity !== null && res.bodyDensity > 1.0);
  assert.ok(res.effectiveBodyFatPct !== null && res.effectiveBodyFatPct > 10 && res.effectiveBodyFatPct < 25);
  assert.ok(res.fatMassKg !== null && res.leanMassKg !== null);
  assert.equal(Number((res.fatMassKg + res.leanMassKg).toFixed(1)), 80);
});

test("Pollock 3 Dobras (Mulheres: Tríceps, Suprailíaca, Coxa)", () => {
  const skinfolds = {
    tricepsMm: 18,
    suprailiacMm: 16,
    thighFoldMm: 24,
  };
  const res = calculatePollock3(skinfolds, 28, "FEMALE", 60);
  assert.equal(res.isComplete, true);
  assert.equal(res.sumSkinfoldsMm, 58);
  assert.ok(res.effectiveBodyFatPct !== null && res.effectiveBodyFatPct > 18 && res.effectiveBodyFatPct < 30);
  assert.ok(res.fatMassKg !== null && res.leanMassKg !== null);
  assert.equal(Number((res.fatMassKg + res.leanMassKg).toFixed(1)), 60);
});

test("Faulkner 4 Dobras: cálculo direto de percentual com somatório", () => {
  const skinfolds = {
    tricepsMm: 14,
    subscapularMm: 16,
    suprailiacMm: 18,
    abdominalFoldMm: 20,
  };
  const res = calculateFaulkner4(skinfolds, 75);
  assert.equal(res.isComplete, true);
  assert.equal(res.sumSkinfoldsMm, 68);
  // %G = (68 * 0.153) + 5.783 = 10.404 + 5.783 = 16.19%
  assert.equal(res.effectiveBodyFatPct, 16.19);
});

test("Petroski 4 Dobras (População Brasileira): equações validadas", () => {
  // Homens: Tríceps, Subescapular, Suprailíaca, Panturrilha
  const skinfoldsMale = {
    tricepsMm: 12,
    subscapularMm: 15,
    suprailiacMm: 14,
    calfFoldMm: 10,
  };
  const resMale = calculatePetroski4(skinfoldsMale, 32, "MALE", 78);
  assert.equal(resMale.isComplete, true);
  assert.equal(resMale.sumSkinfoldsMm, 51);
  assert.ok(resMale.effectiveBodyFatPct !== null);

  // Mulheres: Axilar Média, Suprailíaca, Coxa, Panturrilha Medial
  const skinfoldsFem = {
    midaxillaryMm: 14,
    suprailiacMm: 20,
    thighFoldMm: 24,
    calfFoldMm: 16,
  };
  const resFem = calculatePetroski4(skinfoldsFem, 29, "FEMALE", 62);
  assert.equal(resFem.isComplete, true);
  assert.equal(resFem.sumSkinfoldsMm, 74);
  assert.ok(resFem.effectiveBodyFatPct !== null);
});

test("Isolamento estrito de avaliação: NUNCA mistura dobras e rejeita protocolos incompletos", () => {
  // Se faltar a coxa em Pollock 3 Homens, NÃO completa e relata a dobra faltante
  const incompleteSkinfolds = {
    chestFoldMm: 12,
    abdominalFoldMm: 22,
    // thighFoldMm ausente!
  };
  const res = calculatePollock3(incompleteSkinfolds, 30, "MALE", 80);
  assert.equal(res.isComplete, false);
  assert.deepEqual(res.missingSkinfolds, ["Coxa"]);
  assert.equal(res.effectiveBodyFatPct, null);
  assert.equal(res.fatMassKg, null);
  assert.equal(res.leanMassKg, null);
});

test("resolveEvaluationBodyComposition: respeita protocolo informado ou detecta automaticamente", () => {
  const skinfolds = {
    tricepsMm: 15,
    subscapularMm: 18,
    suprailiacMm: 16,
    abdominalFoldMm: 22,
  };
  // Com essas 4 dobras, o protocolo Faulkner 4 deve ser resolvido com sucesso
  const res = resolveEvaluationBodyComposition(skinfolds, "FAULKNER_4", 30, "MALE", 75);
  assert.ok(res !== null);
  assert.equal(res.protocolName, "Faulkner 4 Dobras");
  assert.equal(res.isComplete, true);
});

// ============================================================================
// 4. WAIST-TO-HIP RATIO (RCQ / WHR)
// ============================================================================
console.log("\n--- 4. Relação Cintura-Quadril (RCQ / WHR) ---");

test("RCQ Homens: Baixo (<0.90), Moderado (0.90-0.94), Risco Aumentado (≥0.95)", () => {
  // Cintura 80, Quadril 100 -> 0.80 -> Baixo risco
  const r1 = calculateWaistToHipRatio(80, 100, "MALE");
  assert.equal(r1.ratio, 0.8);
  assert.equal(r1.riskCategory, "Baixo risco");

  // Cintura 92, Quadril 100 -> 0.92 -> Risco moderado
  const r2 = calculateWaistToHipRatio(92, 100, "MALE");
  assert.equal(r2.ratio, 0.92);
  assert.equal(r2.riskCategory, "Risco moderado");

  // Cintura 98, Quadril 100 -> 0.98 -> Risco cardiovascular aumentado
  const r3 = calculateWaistToHipRatio(98, 100, "MALE");
  assert.equal(r3.ratio, 0.98);
  assert.equal(r3.riskCategory, "Risco cardiovascular aumentado");
});

test("RCQ Mulheres: Baixo (<0.80), Moderado (0.80-0.84), Risco Aumentado (≥0.85)", () => {
  // Cintura 70, Quadril 100 -> 0.70 -> Baixo risco
  const r1 = calculateWaistToHipRatio(70, 100, "FEMALE");
  assert.equal(r1.ratio, 0.7);
  assert.equal(r1.riskCategory, "Baixo risco");

  // Cintura 82, Quadril 100 -> 0.82 -> Risco moderado
  const r2 = calculateWaistToHipRatio(82, 100, "FEMALE");
  assert.equal(r2.ratio, 0.82);
  assert.equal(r2.riskCategory, "Risco moderado");

  // Cintura 88, Quadril 100 -> 0.88 -> Risco cardiovascular aumentado
  const r3 = calculateWaistToHipRatio(88, 100, "FEMALE");
  assert.equal(r3.ratio, 0.88);
  assert.equal(r3.riskCategory, "Risco cardiovascular aumentado");
});

// ============================================================================
// 5. INPUT VALIDATION BOUNDS & AUDITABILITY CONSTRAINTS
// ============================================================================
console.log("\n--- 5. Validação de Limites Anatômicos & Auditoria de Correções ---");

test("Validação de nova medição: aceita entradas anatômicas válidas", () => {
  const valid = validateAnthropometricEntryInput({
    measurementDate: "2026-10-22",
    weightKg: 78.5,
    heightCm: 180,
    waistCm: 84,
    hipCm: 102,
    tricepsMm: 14,
    bodyFatPct: 16.5,
    sourceType: "PROFESSIONAL_RECORDED",
    equipmentMethod: "Balança Digital Tanita + Adipômetro Harpenden",
    notes: "Primeira avaliação pós-consulta",
  });
  assert.equal(valid.weightKg, 78.5);
  assert.equal(valid.heightCm, 180);
  assert.equal(valid.bodyFatPct, 16.5);
});

test("Validação de nova medição: rejeita limites biologicamente impossíveis", () => {
  // Peso absurdo (>500kg ou negativo)
  assert.throws(() => {
    validateAnthropometricEntryInput({
      measurementDate: "2026-10-22",
      weightKg: -5,
    });
  }, /peso/i);

  // Dobra absurda (>80mm)
  assert.throws(() => {
    validateAnthropometricEntryInput({
      measurementDate: "2026-10-22",
      tricepsMm: 95,
    });
  }, /tríceps/i);

  // % de Gordura absurdo (>75%)
  assert.throws(() => {
    validateAnthropometricEntryInput({
      measurementDate: "2026-10-22",
      bodyFatPct: 85,
    });
  }, /gordura/i);
});

test("Validação de correção: exige obrigatoriamente justificativa clínica (editReason)", () => {
  // Sem justificativa -> lança erro
  assert.throws(() => {
    validateUpdateAnthropometricEntryInput({
      entryPublicId: "anthro_abc123",
      measurementDate: "2026-10-22",
      weightKg: 75,
      editReason: "  ",
    });
  }, /justificativa/i);

  // Justificativa válida -> aceita
  const validUpdate = validateUpdateAnthropometricEntryInput({
    entryPublicId: "anthro_abc123",
    measurementDate: "2026-10-22",
    weightKg: 74.8,
    editReason: "Correção de digitação do peso aferido na ficha física.",
  });
  assert.equal(validUpdate.entryPublicId, "anthro_abc123");
  assert.equal(validUpdate.editReason, "Correção de digitação do peso aferido na ficha física.");
});

console.log("\n=======================================================");
console.log(`ETAPA 11 TEST SUITE PASSED: ${passedTests}/${totalTests} testes bem-sucedidos!`);
console.log("=======================================================\n");
