import assert from "node:assert/strict";

// Helper logic tests (matching personal-student-detail-view.tsx and personal-student-hub.ts)

function formatDisplayDate(dateVal) {
  if (!dateVal) return "—";
  const str = String(dateVal).trim();
  const ymdMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    return `${d}/${m}/${y}`;
  }
  const parsed = new Date(str);
  if (isNaN(parsed.getTime())) return str;
  const d = String(parsed.getUTCDate()).padStart(2, "0");
  const m = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const y = parsed.getUTCFullYear();
  return `${d}/${m}/${y}`;
}

function calculateBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm || heightCm <= 0 || weightKg <= 0) return null;
  const heightM = heightCm > 3 ? heightCm / 100 : heightCm;
  const bmiVal = weightKg / (heightM * heightM);
  if (isNaN(bmiVal) || bmiVal <= 0 || bmiVal > 100) return null;
  const bmi = Number(bmiVal.toFixed(1));

  let label = "Peso adequado";
  let color = "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (bmi < 18.5) {
    label = "Abaixo do peso";
    color = "text-amber-700 bg-amber-50 border-amber-200";
  } else if (bmi >= 25 && bmi < 30) {
    label = "Sobrepeso";
    color = "text-amber-700 bg-amber-50 border-amber-200";
  } else if (bmi >= 30) {
    label = "Obesidade";
    color = "text-rose-700 bg-rose-50 border-rose-200";
  }
  return { bmi, label, color };
}

function getWhatsAppHref(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits || digits.length < 8) return null;
  const fullNumber = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${fullNumber}`;
}

function computeContractValidity(startsOn, endsOn) {
  if (!endsOn) {
    return {
      hasEndDate: false,
      startsOnFormatted: formatDisplayDate(startsOn),
      endsOnFormatted: "Contínuo",
      percentElapsed: 100,
      daysRemaining: null,
      badgeLabel: "Plano Contínuo",
    };
  }

  const startMs = new Date(startsOn).getTime();
  const endMs = new Date(endsOn).getTime();
  const nowMs = Date.now();

  const totalDuration = Math.max(1, endMs - startMs);
  const elapsed = Math.max(0, nowMs - startMs);
  const percent = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
  const daysRemaining = Math.ceil((endMs - nowMs) / (1000 * 60 * 60 * 24));

  let badgeLabel = `${daysRemaining} dias restantes`;
  if (daysRemaining < 0) {
    badgeLabel = `Vencido há ${Math.abs(daysRemaining)} dias`;
  } else if (daysRemaining <= 7) {
    badgeLabel = `Vence em ${daysRemaining} ${daysRemaining === 1 ? "dia" : "dias"}`;
  }

  return {
    hasEndDate: true,
    startsOnFormatted: formatDisplayDate(startsOn),
    endsOnFormatted: formatDisplayDate(endsOn),
    percentElapsed: percent,
    daysRemaining,
    badgeLabel,
  };
}

function computeParq(mergedResponses, anamnesisCount) {
  const boneJoint = mergedResponses.bone_joint_problems ? String(mergedResponses.bone_joint_problems).trim() : "";
  const medicalRestr = mergedResponses.medical_restrictions ? String(mergedResponses.medical_restrictions).trim() : "";
  const healthProb = mergedResponses.health_problems ? String(mergedResponses.health_problems).trim() : "";
  const surgery = mergedResponses.surgery_history ? String(mergedResponses.surgery_history).trim() : "";

  const isNegativeResponse = (val) => {
    const low = val.toLowerCase();
    return !val || low === "não" || low === "nao" || low === "nenhum" || low === "nenhuma" || low === "não possuo" || low === "nao possuo" || low.includes("sem restri");
  };

  const limitationsList = [
    !isNegativeResponse(boneJoint) ? boneJoint : null,
    !isNegativeResponse(medicalRestr) ? medicalRestr : null,
    !isNegativeResponse(healthProb) ? healthProb : null,
    !isNegativeResponse(surgery) ? `Cirurgia prévia: ${surgery}` : null,
  ].filter(Boolean);

  let parqStatus = "NAO_PREENCHIDO";
  let injuriesAndLimitations = null;

  if (limitationsList.length > 0) {
    parqStatus = "COM_ALERTAS";
    injuriesAndLimitations = limitationsList.join(" • ");
  } else if (anamnesisCount > 0 || Object.keys(mergedResponses).length > 2) {
    parqStatus = "SEM_ALERTAS";
    injuriesAndLimitations = null;
  } else {
    parqStatus = "NAO_PREENCHIDO";
    injuriesAndLimitations = null;
  }

  return { parqStatus, injuriesAndLimitations };
}

function computeSvgCoords(measurements, metricKey) {
  const validPoints = measurements
    .filter((m) => m[metricKey] != null && !isNaN(Number(m[metricKey])))
    .map((m) => ({
      date: m.recordedOn,
      value: Number(m[metricKey]),
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (validPoints.length === 0) return { empty: true };

  const minVal = Math.min(...validPoints.map((p) => p.value));
  const maxVal = Math.max(...validPoints.map((p) => p.value));
  const delta = validPoints[validPoints.length - 1].value - validPoints[0].value;

  const width = 600;
  const height = 220;
  const padTop = 25;
  const padBottom = 40;
  const padLeft = 45;
  const padRight = 30;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const yRange = maxVal === minVal ? (maxVal * 0.1 || 1) : maxVal - minVal;
  const yMin = Math.max(0, minVal - yRange * 0.15);
  const yMax = maxVal + yRange * 0.15;
  const ySpread = yMax - yMin;

  const coords = validPoints.map((p, idx) => {
    const x = validPoints.length === 1
      ? padLeft + chartW / 2
      : padLeft + (idx / (validPoints.length - 1)) * chartW;
    const y = padTop + chartH - ((p.value - yMin) / ySpread) * chartH;
    return { x, y, ...p };
  });

  return { empty: false, coords, minVal, maxVal, delta, pointsCount: validPoints.length };
}

console.log("=== EXECUTING TEST SUITE: NOVO PERFIL DO ALUNO ===");

// TEST 1: Date formatting
assert.equal(formatDisplayDate("2026-03-15"), "15/03/2026");
assert.equal(formatDisplayDate(null), "—");
console.log("✔ TEST 1: formatDisplayDate passed");

// TEST 2: BMI calculations
const bmiNormal = calculateBMI(75, 175);
assert.ok(bmiNormal);
assert.equal(bmiNormal.bmi, 24.5);
assert.equal(bmiNormal.label, "Peso adequado");

const bmiOverweight = calculateBMI(85, 175);
assert.ok(bmiOverweight);
assert.equal(bmiOverweight.bmi, 27.8);
assert.equal(bmiOverweight.label, "Sobrepeso");

const bmiObese = calculateBMI(105, 175);
assert.ok(bmiObese);
assert.equal(bmiObese.label, "Obesidade");

const bmiNull = calculateBMI(null, 175);
assert.equal(bmiNull, null);
console.log("✔ TEST 2: calculateBMI passed");

// TEST 3: WhatsApp direct link
assert.equal(getWhatsAppHref("(11) 98765-4321"), "https://wa.me/5511987654321");
assert.equal(getWhatsAppHref(null), null);
assert.equal(getWhatsAppHref(""), null);
console.log("✔ TEST 3: getWhatsAppHref passed");

// TEST 4: Contract validity calculation
const fixedContract = computeContractValidity("2026-01-01", "2026-12-31");
assert.equal(fixedContract.hasEndDate, true);
assert.equal(fixedContract.startsOnFormatted, "01/01/2026");
assert.equal(fixedContract.endsOnFormatted, "31/12/2026");
assert.ok(fixedContract.percentElapsed >= 0 && fixedContract.percentElapsed <= 100);

const continuousContract = computeContractValidity("2026-01-01", null);
assert.equal(continuousContract.hasEndDate, false);
assert.equal(continuousContract.endsOnFormatted, "Contínuo");
assert.equal(continuousContract.badgeLabel, "Plano Contínuo");
console.log("✔ TEST 4: computeContractValidity passed");

// TEST 5: PAR-Q and health restrictions evaluation
const parqFit = computeParq({
  main_goal: "Hipertrofia",
  sleep_hours: "8",
  bone_joint_problems: "Não",
  medical_restrictions: "Nenhuma",
}, 1);
assert.equal(parqFit.parqStatus, "SEM_ALERTAS");
assert.equal(parqFit.injuriesAndLimitations, null);

const parqRestricted = computeParq({
  main_goal: "Emagrecimento",
  bone_joint_problems: "Condromalácia patelar no joelho esquerdo",
}, 1);
assert.equal(parqRestricted.parqStatus, "COM_ALERTAS");
assert.ok(parqRestricted.injuriesAndLimitations.includes("Condromalácia patelar"));

const parqPending = computeParq({}, 0);
assert.equal(parqPending.parqStatus, "NAO_PREENCHIDO");
console.log("✔ TEST 5: PAR-Q and health restrictions passed");

// TEST 6: SVG Body Composition evolution math
const sampleMeasurements = [
  { recordedOn: "2026-01-10", weightKg: 82.5, waistCm: 88, abdomenCm: 92, armCm: 34, thighCm: 58 },
  { recordedOn: "2026-02-10", weightKg: 80.2, waistCm: 85, abdomenCm: 89, armCm: 34.5, thighCm: 57.5 },
  { recordedOn: "2026-03-10", weightKg: 78.4, waistCm: 82, abdomenCm: 86, armCm: 35, thighCm: 57 },
];

const svgWeight = computeSvgCoords(sampleMeasurements, "weightKg");
assert.equal(svgWeight.empty, false);
assert.equal(svgWeight.pointsCount, 3);
assert.equal(svgWeight.minVal, 78.4);
assert.equal(svgWeight.maxVal, 82.5);
assert.equal(svgWeight.delta.toFixed(1), "-4.1");
assert.equal(svgWeight.coords.length, 3);
// Check SVG bounds
svgWeight.coords.forEach((pt) => {
  assert.ok(pt.x >= 45 && pt.x <= 570, `x coord out of bounds: ${pt.x}`);
  assert.ok(pt.y >= 25 && pt.y <= 180, `y coord out of bounds: ${pt.y}`);
});

const svgEmpty = computeSvgCoords([], "weightKg");
assert.equal(svgEmpty.empty, true);
console.log("✔ TEST 6: computeSvgCoords passed");

console.log("\nALL 6 TEST CASES PASSED SUCCESSFULLY!");
