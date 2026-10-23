/**
 * TREVO ONE — NUTRITION PROFESSIONAL V2
 * CLINICAL MEASUREMENTS CATALOG: PERIMETERS, DIAMETERS, BODY COMPOSITION & LAB EXAMS
 *
 * Technical References:
 * 1. ISAK (International Society for the Advancement of Kinanthropometry) — International Standards for Anthropometric Assessment (2001/2011).
 * 2. WHO (World Health Organization) — Waist Circumference and Waist-Hip Ratio: Report of a WHO Expert Consultation (Geneva, 2008).
 * 3. Lohman, T.G., Roche, A.F., Martorell, R. — Anthropometric Standardization Reference Manual (Human Kinetics Books, 1988).
 * 4. Brazilian Society of Clinical Pathology / Laboratory Medicine (SBPC/ML) & Diretrizes Brasileiras de Dislipidemias e Prevenção da Aterosclerose.
 */

// ============================================================================
// 1. PERÍMETROS (CIRCUNFERÊNCIAS)
// ============================================================================

export interface PerimeterDefinition {
  id: string;
  name: string;
  anatomicalPoint: string;
  defaultUnit: "cm";
  isBilateral: boolean;
  category: "TRUNK" | "UPPER_LIMB" | "LOWER_LIMB" | "HEAD_NECK";
}

export const CANONICAL_PERIMETERS: PerimeterDefinition[] = [
  {
    id: "neck",
    name: "Pescoço",
    anatomicalPoint: "Imediatamente superior à cartilagem tireoide (pomo de adão), perpendicular ao eixo do pescoço.",
    defaultUnit: "cm",
    isBilateral: false,
    category: "HEAD_NECK",
  },
  {
    id: "shoulders",
    name: "Ombros",
    anatomicalPoint: "Ponto de maior proeminência lateral dos músculos deltoides, abaixo dos acrômios.",
    defaultUnit: "cm",
    isBilateral: false,
    category: "TRUNK",
  },
  {
    id: "chest",
    name: "Tórax",
    anatomicalPoint: "Nível mesoesteronal (4º espaço intercostal / apêndice xifoide), ao final da expiração normal.",
    defaultUnit: "cm",
    isBilateral: false,
    category: "TRUNK",
  },
  {
    id: "waist",
    name: "Cintura",
    anatomicalPoint: "Ponto mais estreito do tronco, a meio caminho entre a margem inferior da última costela e a crista ilíaca.",
    defaultUnit: "cm",
    isBilateral: false,
    category: "TRUNK",
  },
  {
    id: "abdomen",
    name: "Abdômen",
    anatomicalPoint: "Perímetro horizontal ao nível da cicatriz umbilical (perímetro umbilical). Distinto da cintura.",
    defaultUnit: "cm",
    isBilateral: false,
    category: "TRUNK",
  },
  {
    id: "hip",
    name: "Quadril",
    anatomicalPoint: "Nível de maior proeminência posterior dos glúteos, com o indivíduo em postura ereta e pés juntos.",
    defaultUnit: "cm",
    isBilateral: false,
    category: "TRUNK",
  },
  {
    id: "relaxed_arm",
    name: "Braço relaxado",
    anatomicalPoint: "Ponto médio entre o acrômio e o olécrano, com o braço estendido ao longo do corpo.",
    defaultUnit: "cm",
    isBilateral: true,
    category: "UPPER_LIMB",
  },
  {
    id: "contracted_arm",
    name: "Braço contraído",
    anatomicalPoint: "Ponto de maior perímetro do bíceps, com o cotovelo flexionado a 90° e contração isométrica máxima.",
    defaultUnit: "cm",
    isBilateral: true,
    category: "UPPER_LIMB",
  },
  {
    id: "forearm",
    name: "Antebraço",
    anatomicalPoint: "Ponto de maior circunferência do antebraço, imediatamente distal aos epicôndilos do úmero.",
    defaultUnit: "cm",
    isBilateral: true,
    category: "UPPER_LIMB",
  },
  {
    id: "wrist",
    name: "Punho",
    anatomicalPoint: "Imediatamente distal aos processos estiloides do rádio e da ulna.",
    defaultUnit: "cm",
    isBilateral: true,
    category: "UPPER_LIMB",
  },
  {
    id: "proximal_thigh",
    name: "Coxa proximal",
    anatomicalPoint: "Imediatamente distal à prega glútea (1 cm abaixo do sulco infraglúteo). Distinta da coxa média.",
    defaultUnit: "cm",
    isBilateral: true,
    category: "LOWER_LIMB",
  },
  {
    id: "mid_thigh",
    name: "Coxa média",
    anatomicalPoint: "Ponto médio entre o trocânter maior (prega inguinal) e a borda superior da patela.",
    defaultUnit: "cm",
    isBilateral: true,
    category: "LOWER_LIMB",
  },
  {
    id: "calf",
    name: "Panturrilha",
    anatomicalPoint: "Ponto de maior perímetro da perna (músculos gastrocnêmio e sóleo).",
    defaultUnit: "cm",
    isBilateral: true,
    category: "LOWER_LIMB",
  },
  {
    id: "ankle",
    name: "Tornozelo",
    anatomicalPoint: "Ponto de menor circunferência imediatamente proximal aos maléolos lateral e medial.",
    defaultUnit: "cm",
    isBilateral: true,
    category: "LOWER_LIMB",
  },
];

export interface CustomMeasurementItem {
  id: string;
  name: string;
  value: number;
  unit: "cm" | "mm";
  side?: "RIGHT" | "LEFT" | "MIDLINE" | null;
  anatomicalPoint?: string | null;
  notes?: string | null;
}

export interface StructuredPerimeters {
  neckCm?: number | null;
  shouldersCm?: number | null;
  shoulderCm?: number | null;
  chestCm?: number | null;
  waistCm?: number | null;
  abdomenCm?: number | null;
  hipCm?: number | null;
  relaxedArmRightCm?: number | null;
  relaxedArmLeftCm?: number | null;
  contractedArmRightCm?: number | null;
  contractedArmLeftCm?: number | null;
  forearmRightCm?: number | null;
  forearmLeftCm?: number | null;
  wristRightCm?: number | null;
  wristLeftCm?: number | null;
  proximalThighRightCm?: number | null;
  proximalThighLeftCm?: number | null;
  midThighRightCm?: number | null;
  midThighLeftCm?: number | null;
  distalThighRightCm?: number | null;
  distalThighLeftCm?: number | null;
  calfRightCm?: number | null;
  calfLeftCm?: number | null;
  ankleRightCm?: number | null;
  ankleLeftCm?: number | null;
  customPerimeters?: CustomMeasurementItem[];
}

// ============================================================================
// 2. DIÂMETROS ÓSSEOS
// ============================================================================

export interface DiameterDefinition {
  id: string;
  name: string;
  anatomicalPoint: string;
  defaultUnit: "cm";
  isBilateral: boolean;
  instrument: string;
}

export const CANONICAL_DIAMETERS: DiameterDefinition[] = [
  {
    id: "femur_biepicondylar",
    name: "Diâmetro biepicondiliano do fêmur",
    anatomicalPoint: "Distância entre os epicôndilos lateral e medial do fêmur, com o joelho flexionado a 90°.",
    defaultUnit: "cm",
    isBilateral: true,
    instrument: "Paquímetro ósseo de ramos curvos / antropômetro",
  },
  {
    id: "humerus_biepicondylar",
    name: "Diâmetro biepicondiliano do úmero",
    anatomicalPoint: "Distância máxima entre os epicôndilos medial e lateral do úmero, cotovelo flexionado a 90°.",
    defaultUnit: "cm",
    isBilateral: true,
    instrument: "Paquímetro ósseo pequeno",
  },
  {
    id: "wrist_biastyloid",
    name: "Diâmetro biestiloide do punho",
    anatomicalPoint: "Distância entre os processos estiloides do rádio e da ulna.",
    defaultUnit: "cm",
    isBilateral: true,
    instrument: "Paquímetro ósseo pequeno",
  },
  {
    id: "ankle_bimalleolar",
    name: "Diâmetro bimaleolar do tornozelo",
    anatomicalPoint: "Distância entre as partes mais proeminentes do maléolo medial e do maléolo lateral.",
    defaultUnit: "cm",
    isBilateral: true,
    instrument: "Paquímetro ósseo",
  },
  {
    id: "biacromial",
    name: "Diâmetro biacromial",
    anatomicalPoint: "Distância entre as bordas mais laterais dos processos acromiais das escápulas.",
    defaultUnit: "cm",
    isBilateral: false,
    instrument: "Antropômetro / paquímetro ósseo de ramos retos",
  },
  {
    id: "biiliocristal",
    name: "Diâmetro biiliocristal",
    anatomicalPoint: "Distância máxima entre as bordas mais laterais das cristas ilíacas.",
    defaultUnit: "cm",
    isBilateral: false,
    instrument: "Antropômetro / paquímetro de ramos curvos",
  },
  {
    id: "chest_transverse",
    name: "Diâmetro transverso do tórax",
    anatomicalPoint: "Distância látero-lateral no nível da 4ª articulação condrosternal / xifoide ao final da expiração normal.",
    defaultUnit: "cm",
    isBilateral: false,
    instrument: "Antropômetro de ramos curvos",
  },
  {
    id: "chest_anteroposterior",
    name: "Diâmetro anteroposterior do tórax",
    anatomicalPoint: "Distância entre o esterno e a apófise espinhosa no mesmo nível torácico ao final da expiração normal.",
    defaultUnit: "cm",
    isBilateral: false,
    instrument: "Antropômetro de ramos curvos",
  },
];

export interface StructuredDiameters {
  femurBiepicondylarRightCm?: number | null;
  femurBiepicondylarLeftCm?: number | null;
  humerusBiepicondylarRightCm?: number | null;
  humerusBiepicondylarLeftCm?: number | null;
  wristBiastyloidRightCm?: number | null;
  wristBiastyloidLeftCm?: number | null;
  bistyloidRightCm?: number | null;
  bistyloidLeftCm?: number | null;
  ankleBimalleolarRightCm?: number | null;
  ankleBimalleolarLeftCm?: number | null;
  bimalleolarRightCm?: number | null;
  bimalleolarLeftCm?: number | null;
  biacromialCm?: number | null;
  biiliocristalCm?: number | null;
  bitrochantericCm?: number | null;
  chestDepthCm?: number | null;
  chestTransverseCm?: number | null;
  chestAnteroposteriorCm?: number | null;
  instrument?: string | null;
  customDiameters?: CustomMeasurementItem[];
}

/**
 * Normalizes millimeter input to centimeters for canonical storage.
 */
export function normalizeMmToCm(val: number | null | undefined): number | null {
  if (val === null || val === undefined || isNaN(val)) return null;
  return Number((val / 10).toFixed(2));
}

/**
 * Converts centimeters to millimeters for presentation when preferred.
 */
export function convertCmToMm(val: number | null | undefined): number | null {
  if (val === null || val === undefined || isNaN(val)) return null;
  return Number((val * 10).toFixed(1));
}

// ============================================================================
// 3. RELAÇÃO CINTURA-QUADRIL (RCQ)
// ============================================================================

export interface WaistToHipEvaluation {
  waistCm: number | null;
  hipCm: number | null;
  ratio: number | null;
  ratioFormatted: string;
  isComputable: boolean;
  status: "OK" | "MISSING_WAIST" | "MISSING_HIP" | "MISSING_BOTH" | "INVALID_HIP";
  statusMessage: string;
  assessmentDate: string;
}

export function computeWaistToHipEvaluation(params: {
  waistCm: number | null | undefined;
  hipCm: number | null | undefined;
  assessmentDate: string;
}): WaistToHipEvaluation {
  const { waistCm, hipCm, assessmentDate } = params;

  const hasWaist = waistCm !== null && waistCm !== undefined && Number(waistCm) > 0;
  const hasHip = hipCm !== null && hipCm !== undefined && Number(hipCm) > 0;

  if (!hasWaist && !hasHip) {
    return {
      waistCm: null,
      hipCm: null,
      ratio: null,
      ratioFormatted: "—",
      isComputable: false,
      status: "MISSING_BOTH",
      statusMessage: "Preencha a cintura e o quadril para calcular o RCQ.",
      assessmentDate,
    };
  }

  if (!hasWaist) {
    return {
      waistCm: null,
      hipCm: Number(hipCm),
      ratio: null,
      ratioFormatted: "—",
      isComputable: false,
      status: "MISSING_WAIST",
      statusMessage: "Preencha o perímetro da cintura.",
      assessmentDate,
    };
  }

  if (!hasHip) {
    return {
      waistCm: Number(waistCm),
      hipCm: null,
      ratio: null,
      ratioFormatted: "—",
      isComputable: false,
      status: "MISSING_HIP",
      statusMessage: "Preencha o perímetro do quadril.",
      assessmentDate,
    };
  }

  const w = Number(waistCm);
  const h = Number(hipCm);

  if (h <= 0) {
    return {
      waistCm: w,
      hipCm: h,
      ratio: null,
      ratioFormatted: "—",
      isComputable: false,
      status: "INVALID_HIP",
      statusMessage: "O perímetro do quadril deve ser maior que zero.",
      assessmentDate,
    };
  }

  const rawRatio = w / h;
  const ratio = Number(rawRatio.toFixed(2));

  return {
    waistCm: w,
    hipCm: h,
    ratio,
    ratioFormatted: ratio.toFixed(2).replace(".", ","),
    isComputable: true,
    status: "OK",
    statusMessage: "Cálculo realizado com sucesso.",
    assessmentDate,
  };
}

// ============================================================================
// 4. COMPOSIÇÃO CORPORAL (MODELO DE DOIS COMPONENTES & CONSISTÊNCIA)
// ============================================================================

export type BodyCompositionMethod = "BIOIMPEDANCE" | "DXA" | "SKINFOLDS" | "OTHER";
export type BodyCompositionOrigin = "RECORDED" | "CALCULATED" | "IMPORTED";

export interface StructuredBodyComposition {
  method?: BodyCompositionMethod | string | null;
  equipmentProtocol?: string | null;
  equipment?: string | null;
  protocol?: string | null;
  origin?: BodyCompositionOrigin | string | null;
  weightKg?: number | null;
  bodyFatKg?: number | null;
  bodyFatPct?: number | null;
  leanMassKg?: number | null;
  leanMassPct?: number | null;
  muscleMassKg?: number | null;
  bodyWaterKg?: number | null;
  bodyWaterPct?: number | null;
  boneMassValue?: number | null;
  boneMassUnit?: string | null;
  boneMassMethod?: string | null;
  notes?: string | null;
  isInconsistent?: boolean;
  inconsistencyMessage?: string | null;
}

export interface TwoComponentModelDerivation {
  bodyFatKg: number | null;
  bodyFatPct: number | null;
  leanMassKg: number | null;
  leanMassPct: number | null;
  derivedFatKg: boolean;
  derivedFatPct: boolean;
  derivedLeanKg: boolean;
  derivedLeanPct: boolean;
  isInconsistent: boolean;
  inconsistencyDetails: string | null;
}

/**
 * Calculates derived 2-component values (fat mass and lean mass) from available inputs
 * and checks for mathematical and physiological inconsistencies without silently overriding values.
 */
export function deriveTwoComponentModel(params: {
  weightKg: number | null | undefined;
  bodyFatPct: number | null | undefined;
  bodyFatKg: number | null | undefined;
  leanMassKg: number | null | undefined;
  leanMassPct: number | null | undefined;
}): TwoComponentModelDerivation {
  const w = params.weightKg !== null && params.weightKg !== undefined && Number(params.weightKg) > 0 ? Number(params.weightKg) : null;
  let fatPct = params.bodyFatPct !== null && params.bodyFatPct !== undefined ? Number(params.bodyFatPct) : null;
  let fatKg = params.bodyFatKg !== null && params.bodyFatKg !== undefined ? Number(params.bodyFatKg) : null;
  let leanKg = params.leanMassKg !== null && params.leanMassKg !== undefined ? Number(params.leanMassKg) : null;
  let leanPct = params.leanMassPct !== null && params.leanMassPct !== undefined ? Number(params.leanMassPct) : null;

  let derivedFatKg = false;
  let derivedFatPct = false;
  let derivedLeanKg = false;
  let derivedLeanPct = false;
  let isInconsistent = false;
  let inconsistencyDetails: string | null = null;

  // 1. Boundary checks
  if (fatPct !== null && (fatPct < 0 || fatPct > 100)) {
    isInconsistent = true;
    inconsistencyDetails = `Percentual de gordura informado (${fatPct}%) está fora dos limites fisiológicos possíveis (0 a 100%).`;
  }
  if (w !== null && fatKg !== null && fatKg > w) {
    isInconsistent = true;
    inconsistencyDetails = `Massa gorda (${fatKg} kg) não pode ser superior ao peso total corporal (${w} kg).`;
  }
  if (w !== null && leanKg !== null && leanKg > w) {
    isInconsistent = true;
    inconsistencyDetails = `Massa livre de gordura (${leanKg} kg) não pode ser superior ao peso total corporal (${w} kg).`;
  }

  // 2. Direct derivations if base weight exists
  if (w !== null && !isInconsistent) {
    // Derive fatKg from fatPct
    if (fatKg === null && fatPct !== null) {
      fatKg = Number(((w * fatPct) / 100).toFixed(2));
      derivedFatKg = true;
    }
    // Derive fatPct from fatKg
    else if (fatPct === null && fatKg !== null) {
      fatPct = Number(((fatKg / w) * 100).toFixed(1));
      derivedFatPct = true;
    }

    // Derive leanKg from weight - fatKg
    if (leanKg === null && fatKg !== null) {
      leanKg = Number((w - fatKg).toFixed(2));
      derivedLeanKg = true;
    }

    // Derive leanPct from 100 - fatPct or leanKg / w
    if (leanPct === null) {
      if (fatPct !== null) {
        leanPct = Number((100 - fatPct).toFixed(1));
        derivedLeanPct = true;
      } else if (leanKg !== null) {
        leanPct = Number(((leanKg / w) * 100).toFixed(1));
        derivedLeanPct = true;
      }
    }

    // 3. Consistency cross-check between provided values (tolerance: 0.5 kg or 1.0%)
    if (!derivedFatKg && !derivedLeanKg && fatKg !== null && leanKg !== null) {
      const sum = fatKg + leanKg;
      if (Math.abs(sum - w) > 0.5) {
        isInconsistent = true;
        inconsistencyDetails = `Inconsistência identificada: a soma de gordura (${fatKg} kg) e massa livre de gordura (${leanKg} kg) resulta em ${sum.toFixed(1)} kg, divergindo do peso total informado (${w} kg).`;
      }
    }

    if (!derivedFatPct && !derivedLeanPct && fatPct !== null && leanPct !== null) {
      const sumPct = fatPct + leanPct;
      if (Math.abs(sumPct - 100) > 1.0) {
        isInconsistent = true;
        inconsistencyDetails = `Inconsistência identificada: a soma de % gordura (${fatPct}%) e % massa livre (${leanPct}%) resulta em ${sumPct.toFixed(1)}%, divergindo de 100%.`;
      }
    }
  }

  return {
    bodyFatKg: fatKg,
    bodyFatPct: fatPct,
    leanMassKg: leanKg,
    leanMassPct: leanPct,
    derivedFatKg,
    derivedFatPct,
    derivedLeanKg,
    derivedLeanPct,
    isInconsistent,
    inconsistencyDetails,
  };
}

// ============================================================================
// 5. EXAMES LABORATORIAIS
// ============================================================================

export interface LabExamCanonicalDefinition {
  canonicalKey: string;
  name: string;
  defaultUnit: string;
  allowedUnits: string[];
  specimen: string;
  notes: string;
}

export const CANONICAL_LAB_EXAMS: LabExamCanonicalDefinition[] = [
  {
    canonicalKey: "TOTAL_CHOLESTEROL",
    name: "Colesterol total",
    defaultUnit: "mg/dL",
    allowedUnits: ["mg/dL", "mmol/L"],
    specimen: "Soro",
    notes: "Dosagem enzimática automatizada do colesterol sérico total.",
  },
  {
    canonicalKey: "HDL_CHOLESTEROL",
    name: "HDL (Colesterol bom)",
    defaultUnit: "mg/dL",
    allowedUnits: ["mg/dL", "mmol/L"],
    specimen: "Soro",
    notes: "Lipoproteína de alta densidade.",
  },
  {
    canonicalKey: "LDL_CHOLESTEROL",
    name: "LDL (Colesterol ruim)",
    defaultUnit: "mg/dL",
    allowedUnits: ["mg/dL", "mmol/L"],
    specimen: "Soro",
    notes: "Lipoproteína de baixa densidade. Registrar se foi medido diretamente ou calculado pelo laudo.",
  },
  {
    canonicalKey: "TRIGLYCERIDES",
    name: "Triglicerídeos",
    defaultUnit: "mg/dL",
    allowedUnits: ["mg/dL", "mmol/L"],
    specimen: "Soro",
    notes: "Concentração sérica de triglicerídeos.",
  },
  {
    canonicalKey: "SERUM_IRON",
    name: "Ferro sérico",
    defaultUnit: "mcg/dL",
    allowedUnits: ["mcg/dL", "µg/dL", "umol/L"],
    specimen: "Soro",
    notes: "Ferro circulante ligado à transferrina. Não confundir com Ferritina.",
  },
  {
    canonicalKey: "FERRITIN",
    name: "Ferritina",
    defaultUnit: "ng/mL",
    allowedUnits: ["ng/mL", "mcg/L", "pmol/L"],
    specimen: "Soro",
    notes: "Principal proteína de reserva tecidual de ferro. Exame separado do ferro sérico.",
  },
  {
    canonicalKey: "VITAMIN_D_25_OH",
    name: "Vitamina D — 25(OH)D",
    defaultUnit: "ng/mL",
    allowedUnits: ["ng/mL", "nmol/L"],
    specimen: "Soro",
    notes: "25-hidroxivitamina D. Marcador padrão do status de vitamina D. Distinta da forma ativa 1,25(OH)2D.",
  },
];

export interface LabExamResultItem {
  id: string;
  name: string;
  canonicalKey?: string | null;
  resultRaw: string; // Accepts "< 0.1", "> 1000", "145.2", etc.
  resultNumeric?: number | null;
  unit: string;
  referenceText?: string | null; // As stated on patient's laboratory report
  referenceMin?: number | null;
  referenceMax?: number | null;
  method?: string | null;
  isMeasuredDirectly?: boolean | null; // For LDL: true=medido, false=calculado
  isOutOfRange?: boolean | null;
  notes?: string | null;
}

export interface PatientLabExamRecord {
  id: number;
  publicId: string;
  patientRecordId: number;
  collectionDate: string; // YYYY-MM-DD
  laboratoryName?: string | null;
  method?: string | null;
  notes?: string | null;
  attachmentStorageKey?: string | null;
  attachmentOriginalName?: string | null;
  attachmentMimeType?: string | null;
  attachmentSizeBytes?: number | null;
  isSharedWithPatient: boolean;
  results: LabExamResultItem[];
  createdByMembershipId: number;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Parses raw text input for a lab result, extracting any qualifier (<, >)
 * and the numeric portion without altering the verbatim string.
 */
export function parseLabResultRaw(raw: string): {
  verbatim: string;
  qualifier: "<" | ">" | null;
  numericValue: number | null;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { verbatim: "", qualifier: null, numericValue: null };
  }

  let qualifier: "<" | ">" | null = null;
  let cleanStr = trimmed;

  if (trimmed.startsWith("<")) {
    qualifier = "<";
    cleanStr = trimmed.slice(1).trim();
  } else if (trimmed.startsWith(">")) {
    qualifier = ">";
    cleanStr = trimmed.slice(1).trim();
  }

  const normalizedNumber = cleanStr.replace(",", ".");
  const num = parseFloat(normalizedNumber);
  const numericValue = !isNaN(num) && isFinite(num) ? num : null;

  return {
    verbatim: trimmed,
    qualifier,
    numericValue,
  };
}

/**
 * Checks whether a lab result is out of the reference range informed on the lab report.
 * Returns null if reference is unstated.
 */
export function evaluateLabResultAgainstReference(
  resultRaw: string,
  referenceMin?: number | null,
  referenceMax?: number | null,
  referenceText?: string | null
): {
  status: "NORMAL" | "OUT_OF_RANGE" | "UNSPECIFIED";
  label: string;
} {
  const { numericValue, qualifier } = parseLabResultRaw(resultRaw);

  const hasMin = referenceMin !== null && referenceMin !== undefined;
  const hasMax = referenceMax !== null && referenceMax !== undefined;

  if (!hasMin && !hasMax) {
    // If no numeric range is registered, check if referenceText was provided
    if (referenceText && referenceText.trim().length > 0) {
      return {
        status: "UNSPECIFIED",
        label: `Referência informada: ${referenceText.trim()}`,
      };
    }
    return {
      status: "UNSPECIFIED",
      label: "Referência não informada",
    };
  }

  if (numericValue === null) {
    return {
      status: "UNSPECIFIED",
      label: "Referência não avaliável numericamente",
    };
  }

  let isOut = false;
  if (hasMin && numericValue < referenceMin!) isOut = true;
  if (hasMax && numericValue > referenceMax!) isOut = true;
  if (qualifier === ">" && hasMax && numericValue >= referenceMax!) isOut = true;
  if (qualifier === "<" && hasMin && numericValue <= referenceMin!) isOut = true;

  if (isOut) {
    return {
      status: "OUT_OF_RANGE",
      label: "Fora do intervalo informado pelo laboratório",
    };
  }

  return {
    status: "NORMAL",
    label: "Dentro do intervalo informado pelo laboratório",
  };
}

// ============================================================================
// 6. EVOLUÇÃO TEMPORAL & DELTAS
// ============================================================================

export interface MetricEvolutionDelta {
  currentValue: number | null;
  previousValue: number | null;
  absoluteDelta: number | null;
  isPercentageMetric: boolean;
  percentagePointsDelta: number | null; // e.g. -2.5 p.p.
  relativePercentageChange: number | null; // e.g. -10.0%
  displayText: string;
}

/**
 * Computes comparative deltas between two chronological evaluations,
 * explicitly distinguishing percentage points (p.p.) from relative percentage change (%).
 */
export function calculateEvolutionDelta(
  current: number | null | undefined,
  previous: number | null | undefined,
  isPercentageMetric = false
): MetricEvolutionDelta {
  const cur = current !== null && current !== undefined && !isNaN(current) ? Number(current) : null;
  const prev = previous !== null && previous !== undefined && !isNaN(previous) ? Number(previous) : null;

  if (cur === null || prev === null) {
    return {
      currentValue: cur,
      previousValue: prev,
      absoluteDelta: null,
      isPercentageMetric,
      percentagePointsDelta: null,
      relativePercentageChange: null,
      displayText: "Sem medição anterior comparável",
    };
  }

  const diff = Number((cur - prev).toFixed(2));

  if (isPercentageMetric) {
    const pp = diff;
    let relChange: number | null = null;
    if (prev !== 0) {
      relChange = Number((((cur - prev) / prev) * 100).toFixed(1));
    }

    const sign = pp > 0 ? "+" : "";
    const relSign = relChange !== null && relChange > 0 ? "+" : "";
    const relText = relChange !== null ? ` (${relSign}${relChange}% rel.)` : "";

    return {
      currentValue: cur,
      previousValue: prev,
      absoluteDelta: diff,
      isPercentageMetric: true,
      percentagePointsDelta: pp,
      relativePercentageChange: relChange,
      displayText: `${sign}${pp.toFixed(1).replace(".", ",")} p.p.${relText}`,
    };
  }

  const sign = diff > 0 ? "+" : "";
  let relChange: number | null = null;
  if (prev !== 0) {
    relChange = Number((((cur - prev) / Math.abs(prev)) * 100).toFixed(1));
  }
  const relSign = relChange !== null && relChange > 0 ? "+" : "";
  const relText = relChange !== null ? ` (${relSign}${relChange}%)` : "";

  return {
    currentValue: cur,
    previousValue: prev,
    absoluteDelta: diff,
    isPercentageMetric: false,
    percentagePointsDelta: null,
    relativePercentageChange: relChange,
    displayText: `${sign}${diff.toFixed(1).replace(".", ",")}${relText}`,
  };
}

// ============================================================================
// 7. PREFERÊNCIAS DE EXIBIÇÃO DE CAMPOS DE PLANEJAMENTO
// ============================================================================

export interface PlanningFieldPreferences {
  showSummary: boolean;
  showPerimeters: boolean;
  showDiameters: boolean;
  showSkinfolds: boolean;
  showBodyComposition: boolean;
  showLabExams: boolean;
  showEvolution: boolean;
  visiblePerimeters: string[];
  visibleDiameters: string[];
  preferredDiameterUnit: "cm" | "mm";
}

export const DEFAULT_PLANNING_FIELD_PREFERENCES: PlanningFieldPreferences = {
  showSummary: true,
  showPerimeters: true,
  showDiameters: true,
  showSkinfolds: true,
  showBodyComposition: true,
  showLabExams: true,
  showEvolution: true,
  visiblePerimeters: CANONICAL_PERIMETERS.map((p) => p.id),
  visibleDiameters: CANONICAL_DIAMETERS.map((d) => d.id),
  preferredDiameterUnit: "cm",
};
