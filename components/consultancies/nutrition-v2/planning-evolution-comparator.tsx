"use client";

import React, { useState, useMemo } from "react";
import type { PatientAnthropometricEntry } from "@/lib/nutrition-v2/patient-record-types";
import type { PatientLabExamRecord } from "@/lib/nutrition-v2/clinical-measurements-catalog";
import {
  CANONICAL_LAB_EXAMS,
  calculateEvolutionDelta,
  parseLabResultRaw,
} from "@/lib/nutrition-v2/clinical-measurements-catalog";

interface PlanningEvolutionComparatorProps {
  entries: PatientAnthropometricEntry[];
  labExams?: PatientLabExamRecord[];
}

export function PlanningEvolutionComparator({
  entries,
  labExams = [],
}: PlanningEvolutionComparatorProps) {
  // Sort entries newest first for compare mode, and oldest first for timeline
  const sortedDesc = useMemo(() => {
    return [...entries].sort(
      (a, b) => new Date(b.measurementDate).getTime() - new Date(a.measurementDate).getTime()
    );
  }, [entries]);

  const sortedAsc = useMemo(() => {
    return [...entries].sort(
      (a, b) => new Date(a.measurementDate).getTime() - new Date(b.measurementDate).getTime()
    );
  }, [entries]);

  // Mode: "history" (evolucao histórica por medida/exame) vs "compare" (comparador direto entre 2 datas)
  const [activeView, setActiveView] = useState<"history" | "compare">("history");

  // State for direct compare mode
  const [currentId, setCurrentId] = useState<string>(sortedDesc[0]?.publicId || "");
  const [baseId, setBaseId] = useState<string>(sortedDesc[1]?.publicId || sortedDesc[0]?.publicId || "");

  const currentEntry = useMemo(
    () => sortedDesc.find((e) => e.publicId === currentId) || sortedDesc[0] || null,
    [sortedDesc, currentId]
  );
  const baseEntry = useMemo(
    () => sortedDesc.find((e) => e.publicId === baseId) || sortedDesc[1] || sortedDesc[0] || null,
    [sortedDesc, baseId]
  );

  // State for selectable metric historical series
  const [selectedCategory, setSelectedCategory] = useState<
    "composition" | "perimeters" | "diameters" | "skinfolds" | "rcq" | "exams"
  >("composition");
  const [selectedMetricKey, setSelectedMetricKey] = useState<string>("weight");

  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return "—";
    try {
      const d = new Date(isoStr.includes("T") ? isoStr : `${isoStr}T12:00:00`);
      return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return isoStr;
    }
  };

  // --------------------------------------------------------------------------
  // Catalog of Historical Selectable Metrics
  // --------------------------------------------------------------------------
  interface HistoricalDataPoint {
    date: string;
    value: number | null;
    rawText: string;
    unit: string;
    side?: string | null;
    method?: string | null;
    notes?: string | null;
    isOutOfRange?: boolean | null;
  }

  // Build the historical timeline for the currently selected metric
  const historicalTimeline = useMemo((): {
    title: string;
    unit: string;
    isPercentage: boolean;
    anatomicalPoint?: string;
    instrumentMethod?: string;
    side?: string;
    dataPoints: HistoricalDataPoint[];
  } => {
    // 1. LAB EXAMS
    if (selectedCategory === "exams") {
      const canonical = CANONICAL_LAB_EXAMS.find((c) => c.canonicalKey === selectedMetricKey);
      const points: HistoricalDataPoint[] = [];

      // Sort exams chronologically (oldest first)
      const sortedExams = [...labExams].sort(
        (a, b) => new Date(a.collectionDate).getTime() - new Date(b.collectionDate).getTime()
      );

      for (const ex of sortedExams) {
        for (const res of ex.results) {
          const match =
            (canonical && res.canonicalKey === canonical.canonicalKey) ||
            (!canonical && (res.canonicalKey === selectedMetricKey || res.name.toLowerCase() === selectedMetricKey.toLowerCase()));

          if (match) {
            const num = res.resultNumeric ?? parseLabResultRaw(res.resultRaw).numericValue;
            points.push({
              date: ex.collectionDate,
              value: num,
              rawText: res.resultRaw || (num != null ? String(num) : "—"),
              unit: res.unit || canonical?.defaultUnit || "",
              method:
                res.isMeasuredDirectly !== null && res.isMeasuredDirectly !== undefined
                  ? res.isMeasuredDirectly
                    ? "Medido diretamente"
                    : "Calculado pelo laudo"
                  : ex.method || null,
              notes: ex.laboratoryName ? `Lab: ${ex.laboratoryName}` : null,
              isOutOfRange: res.isOutOfRange,
            });
          }
        }
      }

      return {
        title: canonical?.name || selectedMetricKey,
        unit: canonical?.defaultUnit || points[0]?.unit || "",
        isPercentage: false,
        anatomicalPoint: canonical?.specimen ? `Amostra: ${canonical.specimen}` : undefined,
        instrumentMethod: canonical?.notes || undefined,
        dataPoints: points,
      };
    }

    // 2. RCQ (Relação Cintura-Quadril)
    if (selectedCategory === "rcq") {
      const points: HistoricalDataPoint[] = [];
      for (const e of sortedAsc) {
        const w = e.perimeters?.waistCm ?? e.waistCm;
        const h = e.perimeters?.hipCm ?? e.hipCm;
        if (w != null && h != null && h > 0) {
          const ratio = Number((w / h).toFixed(2));
          points.push({
            date: e.measurementDate,
            value: ratio,
            rawText: ratio.toFixed(2).replace(".", ","),
            unit: "",
            method: `Cintura: ${w} cm | Quadril: ${h} cm`,
            notes: e.notes || null,
          });
        }
      }
      return {
        title: "Relação Cintura-Quadril (RCQ)",
        unit: "",
        isPercentage: false,
        anatomicalPoint: "Cintura (menor perímetro) dividida pelo Quadril (maior circunferência glútea)",
        instrumentMethod: "Índice de risco cardiometabólico (OMS)",
        dataPoints: points,
      };
    }

    // 3. ANTHROPOMETRIC EVALUATIONS
    const points: HistoricalDataPoint[] = [];
    let title = "";
    let unit = "cm";
    let isPercentage = false;
    let anatomicalPoint: string | undefined;
    let instrumentMethod: string | undefined;
    let side: string | undefined;

    for (const e of sortedAsc) {
      const p = e.perimeters;
      const d = e.diameters;
      const bc = e.bodyComposition;

      let val: number | null = null;
      let pointSide: string | null = null;

      switch (selectedMetricKey) {
        // Composition
        case "weight":
          title = "Peso Corporal";
          unit = "kg";
          val = bc?.weightKg ?? e.weightKg ?? null;
          break;
        case "bodyFatPct":
          title = "Gordura Corporal";
          unit = "%";
          isPercentage = true;
          val = bc?.bodyFatPct ?? e.bodyFatPct ?? null;
          break;
        case "fatMassKg":
          title = "Massa Gorda";
          unit = "kg";
          val = bc?.bodyFatKg ?? e.fatMassKg ?? null;
          break;
        case "leanMassKg":
          title = "Massa Livre de Gordura (FFM)";
          unit = "kg";
          val = bc?.leanMassKg ?? e.leanMassKg ?? null;
          break;
        case "muscleMassKg":
          title = "Massa Muscular Esquelética";
          unit = "kg";
          val = bc?.muscleMassKg ?? e.muscleMassKg ?? null;
          break;
        case "bodyWaterKg":
          title = "Água Corporal Total";
          unit = "kg";
          val = bc?.bodyWaterKg ?? e.bodyWaterKg ?? null;
          break;

        // Perimeters
        case "neck":
          title = "Perímetro do Pescoço";
          anatomicalPoint = "Imediatamente superior à cartilagem tireoide";
          val = p?.neckCm ?? e.neckCm ?? null;
          break;
        case "shoulders":
          title = "Perímetro dos Ombros";
          anatomicalPoint = "Proeminência lateral máxima dos deltoides";
          val = p?.shouldersCm ?? p?.shoulderCm ?? null;
          break;
        case "chest":
          title = "Perímetro do Tórax";
          anatomicalPoint = "Nível mesoesteronal ao final da expiração normal";
          val = p?.chestCm ?? e.chestCm ?? null;
          break;
        case "waist":
          title = "Perímetro da Cintura";
          anatomicalPoint = "Menor circunferência do tronco entre as costelas e a crista ilíaca";
          val = p?.waistCm ?? e.waistCm ?? null;
          break;
        case "abdomen":
          title = "Perímetro do Abdômen";
          anatomicalPoint = "Nível da cicatriz umbilical";
          val = p?.abdomenCm ?? e.abdomenCm ?? null;
          break;
        case "hip":
          title = "Perímetro do Quadril";
          anatomicalPoint = "Maior proeminência dos músculos glúteos";
          val = p?.hipCm ?? e.hipCm ?? null;
          break;
        case "relaxed_arm_r":
          title = "Braço Relaxado (Direito)";
          side = "Direito";
          pointSide = "Direito";
          anatomicalPoint = "Ponto acromiale-radiale médio, braço solto";
          val = p?.relaxedArmRightCm ?? e.relaxedArmCm ?? e.armCm ?? null;
          break;
        case "relaxed_arm_l":
          title = "Braço Relaxado (Esquerdo)";
          side = "Esquerdo";
          pointSide = "Esquerdo";
          anatomicalPoint = "Ponto acromiale-radiale médio, braço solto";
          val = p?.relaxedArmLeftCm ?? null;
          break;
        case "contracted_arm_r":
          title = "Braço Contraído (Direito)";
          side = "Direito";
          pointSide = "Direito";
          anatomicalPoint = "Ponto de maior perímetro do braço em contração máxima";
          val = p?.contractedArmRightCm ?? e.contractedArmCm ?? null;
          break;
        case "contracted_arm_l":
          title = "Braço Contraído (Esquerdo)";
          side = "Esquerdo";
          pointSide = "Esquerdo";
          anatomicalPoint = "Ponto de maior perímetro do braço em contração máxima";
          val = p?.contractedArmLeftCm ?? null;
          break;
        case "forearm_r":
          title = "Antebraço (Direito)";
          side = "Direito";
          pointSide = "Direito";
          val = p?.forearmRightCm ?? e.forearmCm ?? null;
          break;
        case "forearm_l":
          title = "Antebraço (Esquerdo)";
          side = "Esquerdo";
          pointSide = "Esquerdo";
          val = p?.forearmLeftCm ?? null;
          break;
        case "wrist_r":
          title = "Punho (Direito)";
          side = "Direito";
          pointSide = "Direito";
          val = p?.wristRightCm ?? null;
          break;
        case "wrist_l":
          title = "Punho (Esquerdo)";
          side = "Esquerdo";
          pointSide = "Esquerdo";
          val = p?.wristLeftCm ?? null;
          break;
        case "proximal_thigh_r":
          title = "Coxa Proximal (Direita)";
          side = "Direito";
          pointSide = "Direito";
          anatomicalPoint = "1 cm abaixo da prega glútea";
          val = p?.proximalThighRightCm ?? null;
          break;
        case "proximal_thigh_l":
          title = "Coxa Proximal (Esquerda)";
          side = "Esquerdo";
          pointSide = "Esquerdo";
          anatomicalPoint = "1 cm abaixo da prega glútea";
          val = p?.proximalThighLeftCm ?? null;
          break;
        case "mid_thigh_r":
          title = "Coxa Média (Direita)";
          side = "Direito";
          pointSide = "Direito";
          anatomicalPoint = "Ponto médio entre o trocânter maior e a borda superior da patela";
          val = p?.midThighRightCm ?? e.thighCm ?? null;
          break;
        case "mid_thigh_l":
          title = "Coxa Média (Esquerda)";
          side = "Esquerdo";
          pointSide = "Esquerdo";
          anatomicalPoint = "Ponto médio entre o trocânter maior e a borda superior da patela";
          val = p?.midThighLeftCm ?? null;
          break;
        case "calf_r":
          title = "Panturrilha (Direita)";
          side = "Direito";
          pointSide = "Direito";
          anatomicalPoint = "Maior circunferência da perna";
          val = p?.calfRightCm ?? e.calfCm ?? null;
          break;
        case "calf_l":
          title = "Panturrilha (Esquerda)";
          side = "Esquerdo";
          pointSide = "Esquerdo";
          anatomicalPoint = "Maior circunferência da perna";
          val = p?.calfLeftCm ?? null;
          break;
        case "ankle_r":
          title = "Tornozelo (Direito)";
          side = "Direito";
          pointSide = "Direito";
          val = p?.ankleRightCm ?? null;
          break;
        case "ankle_l":
          title = "Tornozelo (Esquerdo)";
          side = "Esquerdo";
          pointSide = "Esquerdo";
          val = p?.ankleLeftCm ?? null;
          break;

        // Diameters
        case "femur_biepicondylar_r":
          title = "Fêmur Biepicondiliano (Direito)";
          side = "Direito";
          pointSide = "Direito";
          instrumentMethod = "Paquímetro ósseo / ramos curvos";
          val = d?.femurBiepicondylarRightCm ?? null;
          break;
        case "femur_biepicondylar_l":
          title = "Fêmur Biepicondiliano (Esquerdo)";
          side = "Esquerdo";
          pointSide = "Esquerdo";
          instrumentMethod = "Paquímetro ósseo / ramos curvos";
          val = d?.femurBiepicondylarLeftCm ?? null;
          break;
        case "humerus_biepicondylar_r":
          title = "Úmero Biepicondiliano (Direito)";
          side = "Direito";
          pointSide = "Direito";
          instrumentMethod = "Paquímetro ósseo pequeno";
          val = d?.humerusBiepicondylarRightCm ?? null;
          break;
        case "humerus_biepicondylar_l":
          title = "Úmero Biepicondiliano (Esquerdo)";
          side = "Esquerdo";
          pointSide = "Esquerdo";
          instrumentMethod = "Paquímetro ósseo pequeno";
          val = d?.humerusBiepicondylarLeftCm ?? null;
          break;
        case "wrist_biastyloid_r":
          title = "Biestiloide do Punho (Direito)";
          side = "Direito";
          pointSide = "Direito";
          instrumentMethod = "Paquímetro ósseo pequeno";
          val = d?.wristBiastyloidRightCm ?? d?.bistyloidRightCm ?? null;
          break;
        case "wrist_biastyloid_l":
          title = "Biestiloide do Punho (Esquerdo)";
          side = "Esquerdo";
          pointSide = "Esquerdo";
          instrumentMethod = "Paquímetro ósseo pequeno";
          val = d?.wristBiastyloidLeftCm ?? d?.bistyloidLeftCm ?? null;
          break;
        case "ankle_bimalleolar_r":
          title = "Bimaleolar do Tornozelo (Direito)";
          side = "Direito";
          pointSide = "Direito";
          instrumentMethod = "Paquímetro ósseo";
          val = d?.ankleBimalleolarRightCm ?? d?.bimalleolarRightCm ?? null;
          break;
        case "ankle_bimalleolar_l":
          title = "Bimaleolar do Tornozelo (Esquerdo)";
          side = "Esquerdo";
          pointSide = "Esquerdo";
          instrumentMethod = "Paquímetro ósseo";
          val = d?.ankleBimalleolarLeftCm ?? d?.bimalleolarLeftCm ?? null;
          break;
        case "biacromial":
          title = "Diâmetro Biacromial";
          instrumentMethod = "Antropômetro / ramos retos";
          val = d?.biacromialCm ?? null;
          break;
        case "biiliocristal":
          title = "Diâmetro Bi-iliocristal";
          instrumentMethod = "Antropômetro / ramos curvos";
          val = d?.biiliocristalCm ?? null;
          break;

        // Skinfolds
        case "triceps":
          title = "Dobra Cutânea Tricipital";
          unit = "mm";
          anatomicalPoint = "Ponto médio da face posterior do braço";
          val = e.tricepsMm ?? null;
          break;
        case "biceps":
          title = "Dobra Cutânea Bicipital";
          unit = "mm";
          anatomicalPoint = "Ponto de maior volume do ventre do bíceps";
          val = e.bicepsMm ?? null;
          break;
        case "subscapular":
          title = "Dobra Cutânea Subescapular";
          unit = "mm";
          anatomicalPoint = "2 cm abaixo do ângulo inferior da escápula, oblíqua a 45°";
          val = e.subscapularMm ?? null;
          break;
        case "suprailiac":
          title = "Dobra Cutânea Suprailíaca";
          unit = "mm";
          anatomicalPoint = "Imediatamente acima da crista ilíaca na linha axilar média";
          val = e.suprailiacMm ?? null;
          break;
        case "abdominal_fold":
          title = "Dobra Cutânea Abdominal";
          unit = "mm";
          anatomicalPoint = "2 cm lateralmente à cicatriz umbilical, dobra vertical";
          val = e.abdominalFoldMm ?? null;
          break;
        case "thigh_fold":
          title = "Dobra Cutânea da Coxa";
          unit = "mm";
          anatomicalPoint = "Ponto médio entre a dobra inguinal e a patela";
          val = e.thighFoldMm ?? null;
          break;
        case "calf_fold":
          title = "Dobra Cutânea da Panturrilha";
          unit = "mm";
          anatomicalPoint = "Ponto de maior circunferência da perna na face medial";
          val = e.calfFoldMm ?? null;
          break;

        default:
          val = null;
      }

      if (val !== null && !isNaN(val)) {
        points.push({
          date: e.measurementDate,
          value: val,
          rawText: `${val}`,
          unit,
          side: pointSide,
          method: e.equipmentMethod || e.skinfoldProtocol || null,
          notes: e.notes || null,
        });
      }
    }

    return {
      title,
      unit,
      isPercentage,
      anatomicalPoint,
      instrumentMethod,
      side,
      dataPoints: points,
    };
  }, [selectedCategory, selectedMetricKey, sortedAsc, labExams]);

  // Historical summary statistics
  const historicalStats = useMemo(() => {
    const pts = historicalTimeline.dataPoints;
    if (pts.length === 0) return null;

    const first = pts[0];
    const last = pts[pts.length - 1];
    const numericValues = pts.map((p) => p.value).filter((v): v is number => v !== null);

    const minVal = numericValues.length > 0 ? Math.min(...numericValues) : null;
    const maxVal = numericValues.length > 0 ? Math.max(...numericValues) : null;

    const totalDelta = calculateEvolutionDelta(
      last.value,
      first.value,
      historicalTimeline.isPercentage
    );

    return {
      first,
      last,
      count: pts.length,
      minVal,
      maxVal,
      totalDelta,
    };
  }, [historicalTimeline]);

  if (sortedDesc.length === 0 && labExams.length === 0) {
    return (
      <div className="p-6 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] text-xs text-[var(--text-tertiary)] text-center">
        Nenhuma avaliação ou exame laboratorial registrado ainda para este paciente.
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Metrics for the Direct Compare Mode
  // --------------------------------------------------------------------------
  const compareMetrics = [
    { label: "Peso Corporal", current: currentEntry?.weightKg, base: baseEntry?.weightKg, isPercentage: false, unit: "kg" },
    { label: "Gordura Corporal", current: currentEntry?.bodyFatPct, base: baseEntry?.bodyFatPct, isPercentage: true, unit: "%" },
    { label: "Massa Gorda (kg)", current: currentEntry?.fatMassKg, base: baseEntry?.fatMassKg, isPercentage: false, unit: "kg" },
    { label: "Massa Livre de Gordura", current: currentEntry?.leanMassKg, base: baseEntry?.leanMassKg, isPercentage: false, unit: "kg" },
    { label: "Massa Muscular", current: currentEntry?.muscleMassKg, base: baseEntry?.muscleMassKg, isPercentage: false, unit: "kg" },
    { label: "Cintura", current: currentEntry?.waistCm, base: baseEntry?.waistCm, isPercentage: false, unit: "cm" },
    { label: "Abdômen", current: currentEntry?.abdomenCm, base: baseEntry?.abdomenCm, isPercentage: false, unit: "cm" },
    { label: "Quadril", current: currentEntry?.hipCm, base: baseEntry?.hipCm, isPercentage: false, unit: "cm" },
    { label: "Braço Relaxado (D)", current: currentEntry?.perimeters?.relaxedArmRightCm ?? currentEntry?.relaxedArmCm ?? currentEntry?.armCm, base: baseEntry?.perimeters?.relaxedArmRightCm ?? baseEntry?.relaxedArmCm ?? baseEntry?.armCm, isPercentage: false, unit: "cm" },
    { label: "Braço Relaxado (E)", current: currentEntry?.perimeters?.relaxedArmLeftCm, base: baseEntry?.perimeters?.relaxedArmLeftCm, isPercentage: false, unit: "cm" },
    { label: "Coxa Média (D)", current: currentEntry?.perimeters?.midThighRightCm ?? currentEntry?.thighCm, base: baseEntry?.perimeters?.midThighRightCm ?? baseEntry?.thighCm, isPercentage: false, unit: "cm" },
    { label: "Coxa Média (E)", current: currentEntry?.perimeters?.midThighLeftCm, base: baseEntry?.perimeters?.midThighLeftCm, isPercentage: false, unit: "cm" },
    { label: "Panturrilha (D)", current: currentEntry?.perimeters?.calfRightCm ?? currentEntry?.calfCm, base: baseEntry?.perimeters?.calfRightCm ?? baseEntry?.calfCm, isPercentage: false, unit: "cm" },
    { label: "Panturrilha (E)", current: currentEntry?.perimeters?.calfLeftCm, base: baseEntry?.perimeters?.calfLeftCm, isPercentage: false, unit: "cm" },
  ];

  return (
    <div className="p-5 sm:p-6 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-5">
      {/* View Switcher: Série Histórica vs Comparador Direto */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[var(--border-subtle)] gap-3">
        <div>
          <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block tracking-wider">
            Evolução das Medidas & Parâmetros
          </span>
          <h4 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
            Acompanhamento Temporal Completo
          </h4>
        </div>

        <div className="inline-flex rounded-xl bg-[var(--surface-subtle)] p-1 border border-[var(--border-subtle)] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveView("history")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[36px] ${
              activeView === "history"
                ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-xs"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Série Histórica por Medida / Exame
          </button>
          <button
            type="button"
            onClick={() => setActiveView("compare")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[36px] ${
              activeView === "compare"
                ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-xs"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            }`}
          >
            Comparador Entre 2 Datas
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* VIEW 1: SÉRIE HISTÓRICA POR MEDIDA OU EXAME                         */}
      {/* =================================================================== */}
      {activeView === "history" && (
        <div className="space-y-4">
          {/* Selectors Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
            <div>
              <label className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block mb-1">
                Categoria da Métrica
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  const cat = e.target.value as typeof selectedCategory;
                  setSelectedCategory(cat);
                  // Set default metric key for each category
                  if (cat === "composition") setSelectedMetricKey("weight");
                  else if (cat === "perimeters") setSelectedMetricKey("waist");
                  else if (cat === "diameters") setSelectedMetricKey("femur_biepicondylar_r");
                  else if (cat === "skinfolds") setSelectedMetricKey("triceps");
                  else if (cat === "rcq") setSelectedMetricKey("rcq");
                  else if (cat === "exams") setSelectedMetricKey("TOTAL_CHOLESTEROL");
                }}
                className="w-full px-3 py-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-xs font-bold text-[var(--text-primary)] min-h-[40px] focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="composition">Composição Corporal & Peso</option>
                <option value="perimeters">Perímetros / Circunferências (ISAK)</option>
                <option value="diameters">Diâmetros Ósseos (Estrutural)</option>
                <option value="skinfolds">Dobras Cutâneas (mm)</option>
                <option value="rcq">Relação Cintura-Quadril (RCQ)</option>
                <option value="exams">Exames Laboratoriais</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block mb-1">
                Medida ou Exame Específico
              </label>
              <select
                value={selectedMetricKey}
                onChange={(e) => setSelectedMetricKey(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-xs font-bold text-[var(--text-primary)] min-h-[40px] focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {selectedCategory === "composition" && (
                  <>
                    <option value="weight">Peso Corporal (kg)</option>
                    <option value="bodyFatPct">% de Gordura Corporal</option>
                    <option value="fatMassKg">Massa Gorda (kg)</option>
                    <option value="leanMassKg">Massa Livre de Gordura (kg)</option>
                    <option value="muscleMassKg">Massa Muscular Esquelética (kg)</option>
                    <option value="bodyWaterKg">Água Corporal Total (kg)</option>
                  </>
                )}

                {selectedCategory === "perimeters" && (
                  <>
                    <option value="waist">Cintura (menor circunferência)</option>
                    <option value="abdomen">Abdômen (cicatriz umbilical)</option>
                    <option value="hip">Quadril (glúteos)</option>
                    <option value="neck">Pescoço</option>
                    <option value="shoulders">Ombros</option>
                    <option value="chest">Tórax</option>
                    <option value="relaxed_arm_r">Braço Relaxado — Direito</option>
                    <option value="relaxed_arm_l">Braço Relaxado — Esquerdo</option>
                    <option value="contracted_arm_r">Braço Contraído — Direito</option>
                    <option value="contracted_arm_l">Braço Contraído — Esquerdo</option>
                    <option value="forearm_r">Antebraço — Direito</option>
                    <option value="forearm_l">Antebraço — Esquerdo</option>
                    <option value="wrist_r">Punho — Direito</option>
                    <option value="wrist_l">Punho — Esquerdo</option>
                    <option value="proximal_thigh_r">Coxa Proximal — Direita</option>
                    <option value="proximal_thigh_l">Coxa Proximal — Esquerda</option>
                    <option value="mid_thigh_r">Coxa Média — Direita</option>
                    <option value="mid_thigh_l">Coxa Média — Esquerda</option>
                    <option value="calf_r">Panturrilha — Direita</option>
                    <option value="calf_l">Panturrilha — Esquerda</option>
                    <option value="ankle_r">Tornozelo — Direito</option>
                    <option value="ankle_l">Tornozelo — Esquerdo</option>
                  </>
                )}

                {selectedCategory === "diameters" && (
                  <>
                    <option value="femur_biepicondylar_r">Fêmur Biepicondiliano — Direito</option>
                    <option value="femur_biepicondylar_l">Fêmur Biepicondiliano — Esquerdo</option>
                    <option value="humerus_biepicondylar_r">Úmero Biepicondiliano — Direito</option>
                    <option value="humerus_biepicondylar_l">Úmero Biepicondiliano — Esquerdo</option>
                    <option value="wrist_biastyloid_r">Biestiloide do Punho — Direito</option>
                    <option value="wrist_biastyloid_l">Biestiloide do Punho — Esquerdo</option>
                    <option value="ankle_bimalleolar_r">Bimaleolar do Tornozelo — Direito</option>
                    <option value="ankle_bimalleolar_l">Bimaleolar do Tornozelo — Esquerdo</option>
                    <option value="biacromial">Biacromial (ombros)</option>
                    <option value="biiliocristal">Bi-iliocristal (quadril)</option>
                  </>
                )}

                {selectedCategory === "skinfolds" && (
                  <>
                    <option value="triceps">Tríceps (mm)</option>
                    <option value="biceps">Bíceps (mm)</option>
                    <option value="subscapular">Subescapular (mm)</option>
                    <option value="suprailiac">Suprailíaca (mm)</option>
                    <option value="abdominal_fold">Abdominal (mm)</option>
                    <option value="thigh_fold">Coxa (mm)</option>
                    <option value="calf_fold">Panturrilha (mm)</option>
                  </>
                )}

                {selectedCategory === "rcq" && (
                  <option value="rcq">Relação Cintura-Quadril</option>
                )}

                {selectedCategory === "exams" && (
                  <>
                    <option value="TOTAL_CHOLESTEROL">Colesterol Total</option>
                    <option value="HDL_CHOLESTEROL">HDL (Colesterol Bom)</option>
                    <option value="LDL_CHOLESTEROL">LDL (Medido / Calculado)</option>
                    <option value="TRIGLYCERIDES">Triglicerídeos</option>
                    <option value="SERUM_IRON">Ferro Sérico</option>
                    <option value="FERRITIN">Ferritina (Reserva)</option>
                    <option value="VITAMIN_D_25_OH">Vitamina D — 25(OH)D</option>
                    {/* Dynamic options for custom exams found in patient records */}
                    {Array.from(
                      new Set(
                        labExams.flatMap((ex) =>
                          ex.results
                            .filter((r) => !CANONICAL_LAB_EXAMS.some((c) => c.canonicalKey === r.canonicalKey))
                            .map((r) => r.canonicalKey || r.name)
                        )
                      )
                    ).map((customKey) => (
                      <option key={customKey} value={customKey}>
                        {customKey} (Personalizado)
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Metric Clinical Card Summary */}
          {historicalStats ? (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h5 className="text-sm font-extrabold text-[var(--text-primary)]">
                      {historicalTimeline.title}
                    </h5>
                    {historicalTimeline.side && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        Lado {historicalTimeline.side}
                      </span>
                    )}
                  </div>
                  {historicalTimeline.anatomicalPoint && (
                    <p className="text-[11px] text-[var(--text-secondary)]">
                      {historicalTimeline.anatomicalPoint}
                    </p>
                  )}
                  {historicalTimeline.instrumentMethod && (
                    <p className="text-[10px] text-[var(--text-tertiary)]">
                      {historicalTimeline.instrumentMethod}
                    </p>
                  )}
                </div>

                {/* Key Summary Stats */}
                <div className="flex items-center gap-3 flex-wrap text-xs">
                  <div className="p-2 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)]">
                    <span className="text-[9px] uppercase font-bold text-[var(--text-tertiary)] block">
                      Inicial ({formatDate(historicalStats.first.date)})
                    </span>
                    <span className="text-xs font-extrabold text-[var(--text-primary)] tabular-nums">
                      {historicalStats.first.rawText} {historicalTimeline.unit}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)]">
                    <span className="text-[9px] uppercase font-bold text-[var(--text-tertiary)] block">
                      Mais Recente ({formatDate(historicalStats.last.date)})
                    </span>
                    <span className="text-xs font-extrabold text-[var(--text-primary)] tabular-nums">
                      {historicalStats.last.rawText} {historicalTimeline.unit}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-[var(--surface)] border border-[var(--border-subtle)]">
                    <span className="text-[9px] uppercase font-bold text-[var(--text-tertiary)] block">
                      Evolução Total Acumulada
                    </span>
                    <span
                      className={`text-xs font-extrabold tabular-nums ${
                        historicalStats.totalDelta.absoluteDelta !== null &&
                        historicalStats.totalDelta.absoluteDelta !== 0
                          ? historicalStats.totalDelta.absoluteDelta > 0
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-emerald-600 dark:text-emerald-400"
                          : "text-[var(--text-tertiary)]"
                      }`}
                    >
                      {historicalStats.totalDelta.displayText}
                    </span>
                  </div>
                </div>
              </div>

              {/* Complete Chronological Table of Entries */}
              <div className="overflow-x-auto rounded-2xl border border-[var(--border-subtle)]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--surface-subtle)] text-[10px] uppercase font-bold text-[var(--text-tertiary)] border-b border-[var(--border-subtle)]">
                    <tr>
                      <th className="py-2.5 px-3">Data</th>
                      <th className="py-2.5 px-3">Valor Aferido</th>
                      <th className="py-2.5 px-3">Variação vs Anterior</th>
                      <th className="py-2.5 px-3">Variação Total (Inicial)</th>
                      <th className="py-2.5 px-3">Método / Observações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {historicalTimeline.dataPoints.map((pt, idx) => {
                      const prevPt = idx > 0 ? historicalTimeline.dataPoints[idx - 1] : null;
                      const deltaPrev = calculateEvolutionDelta(
                        pt.value,
                        prevPt ? prevPt.value : null,
                        historicalTimeline.isPercentage
                      );
                      const deltaInit = calculateEvolutionDelta(
                        pt.value,
                        historicalStats.first.value,
                        historicalTimeline.isPercentage
                      );

                      return (
                        <tr key={idx} className="hover:bg-[var(--surface-subtle)]/50 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-[var(--text-primary)] whitespace-nowrap">
                            {formatDate(pt.date)}
                          </td>
                          <td className="py-2.5 px-3 font-extrabold text-[var(--text-primary)] tabular-nums whitespace-nowrap">
                            {pt.rawText} {pt.unit}
                            {pt.isOutOfRange && (
                              <span className="ml-1.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                                Fora Ref.
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 tabular-nums whitespace-nowrap">
                            {idx === 0 ? (
                              <span className="text-[10px] text-[var(--text-tertiary)]">Ponto inicial</span>
                            ) : deltaPrev.absoluteDelta !== null ? (
                              <span
                                className={`font-bold ${
                                  deltaPrev.absoluteDelta > 0
                                    ? "text-blue-600 dark:text-blue-400"
                                    : deltaPrev.absoluteDelta < 0
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-[var(--text-tertiary)]"
                                }`}
                              >
                                {deltaPrev.displayText}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="py-2.5 px-3 tabular-nums whitespace-nowrap">
                            {idx === 0 ? (
                              <span className="text-[10px] text-[var(--text-tertiary)]">—</span>
                            ) : deltaInit.absoluteDelta !== null ? (
                              <span
                                className={`font-bold ${
                                  deltaInit.absoluteDelta > 0
                                    ? "text-blue-600 dark:text-blue-400"
                                    : deltaInit.absoluteDelta < 0
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-[var(--text-tertiary)]"
                                }`}
                              >
                                {deltaInit.displayText}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-[var(--text-secondary)]">
                            {pt.method ? <span className="font-semibold block">{pt.method}</span> : null}
                            {pt.notes ? <span className="text-[10px] text-[var(--text-tertiary)] block">{pt.notes}</span> : null}
                            {!pt.method && !pt.notes && "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] text-xs text-[var(--text-tertiary)] text-center">
              Nenhuma medição registrada ainda para o parâmetro selecionado (
              <strong>{historicalTimeline.title || selectedMetricKey}</strong>).
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW 2: COMPARADOR DIRETO ENTRE DUAS DATAS                          */}
      {/* =================================================================== */}
      {activeView === "compare" && (
        <div className="space-y-4">
          {sortedDesc.length < 2 ? (
            <div className="p-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] text-xs text-[var(--text-tertiary)] text-center">
              Registre pelo menos duas avaliações físicas para comparar a evolução entre duas datas.
            </div>
          ) : (
            <>
              {/* Selectors Bar */}
              <div className="flex items-center gap-2 flex-wrap pb-2 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[var(--text-tertiary)] font-bold">Base:</span>
                  <select
                    value={baseId}
                    onChange={(e) => setBaseId(e.target.value)}
                    className="px-2.5 py-1 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-emerald-500 min-h-[36px]"
                  >
                    {sortedDesc.map((e) => (
                      <option key={e.publicId} value={e.publicId}>
                        {formatDate(e.measurementDate)} {e.weightKg ? `(${e.weightKg} kg)` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <span className="text-[var(--text-tertiary)]">→</span>

                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-[var(--text-tertiary)] font-bold">Atual:</span>
                  <select
                    value={currentId}
                    onChange={(e) => setCurrentId(e.target.value)}
                    className="px-2.5 py-1 rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-emerald-500 min-h-[36px]"
                  >
                    {sortedDesc.map((e) => (
                      <option key={e.publicId} value={e.publicId}>
                        {formatDate(e.measurementDate)} {e.weightKg ? `(${e.weightKg} kg)` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Comparison Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {compareMetrics.map((m, idx) => {
                  const delta = calculateEvolutionDelta(m.current, m.base, m.isPercentage);
                  const hasValues = m.current != null || m.base != null;

                  if (!hasValues) return null;

                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] space-y-1"
                    >
                      <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
                        {m.label}
                      </span>

                      <div className="flex items-baseline justify-between">
                        <span className="text-base font-extrabold text-[var(--text-primary)] tabular-nums">
                          {m.current != null ? `${m.current} ${m.unit}` : "—"}
                        </span>
                        <span className="text-[11px] text-[var(--text-tertiary)] tabular-nums">
                          antes: {m.base != null ? `${m.base} ${m.unit}` : "—"}
                        </span>
                      </div>

                      {/* Delta with distinction of p.p. vs % */}
                      <div className="pt-1 border-t border-[var(--border-subtle)] text-[11px] font-bold">
                        {delta.absoluteDelta !== null ? (
                          <span
                            className={
                              delta.absoluteDelta > 0
                                ? "text-blue-600 dark:text-blue-400"
                                : delta.absoluteDelta < 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-[var(--text-tertiary)]"
                            }
                          >
                            {delta.displayText}
                          </span>
                        ) : (
                          <span className="text-[10px] text-[var(--text-tertiary)]">{delta.displayText}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-[10px] text-[var(--text-tertiary)] pt-1">
                * Diferença percentual em grandezas como % de Gordura é expressa em <strong>pontos percentuais (p.p.)</strong> para rigor clínico.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
