"use client";

import React, { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  PatientRecordDetail,
  PatientAnthropometricEntry,
} from "@/lib/nutrition-v2/patient-record-types";
import type {
  PatientPlanning,
  PatientPlanningStaleStatus,
  BiologicalSex,
} from "@/lib/nutrition-v2/patient-planning-types";
import type { ActiveNutritionPlanSummary } from "@/lib/nutrition-v2/assignment-repository";
import type { PatientPlanDraftSummary } from "@/lib/nutrition-v2/patient-plan-lifecycle";
import {
  classifyBMI,
  calculateMifflinStJeor,
  calculateHarrisBenedictRevised,
  calculateFaoOms,
  calculateKatchMcArdle,
  calculateCunningham,
  calculateAgeFromBirthDate,
  normalizeBiologicalSex,
  calculateWaistToHipRatio,
  resolveEvaluationBodyComposition,
} from "@/lib/nutrition-v2/clinical-calculations";
import { deleteAnthropometricEntryAction } from "@/app/consultoria/[slug]/planos-v2/patient-actions";
import { WeightEvolutionChart } from "./weight-evolution-chart";
import { AnthropometricModal } from "./anthropometric-modal";
import { AnthropometricDetailModal } from "./anthropometric-detail-modal";
import { PatientPlanningTab } from "./patient-planning-tab";

export interface PlanningEvolutionTabProps {
  slug: string;
  detail: PatientRecordDetail;
  initialPlanning?: PatientPlanning | null;
  initialStaleStatus?: PatientPlanningStaleStatus | null;
  activePlan?: ActiveNutritionPlanSummary | null;
  draftPlan?: PatientPlanDraftSummary | null;
  canAuthorNutrition?: boolean;
  initialSubTab?: "evolucao" | "calculos" | "metas";
  onBackToOverview?: () => void;
  onStartEditPlan?: () => void;
  isStartingEditPlan?: boolean;
}

export function PlanningEvolutionTab({
  slug,
  detail,
  initialPlanning = null,
  initialStaleStatus = null,
  activePlan = null,
  draftPlan = null,
  canAuthorNutrition = true,
  initialSubTab = "evolucao",
  onBackToOverview,
  onStartEditPlan,
  isStartingEditPlan = false,
}: PlanningEvolutionTabProps) {
  const router = useRouter();
  const [subTab, setSubTab] = useState<"evolucao" | "calculos" | "metas">(initialSubTab);
  const [isPending, startTransition] = useTransition();

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PatientAnthropometricEntry | null>(null);
  const [detailEntry, setDetailEntry] = useState<PatientAnthropometricEntry | null>(null);
  const [deletingPublicId, setDeletingPublicId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Patient core physiological data
  const birthDateStr = detail.resolvedBirthDate || detail.record.birthDate || detail.onboardingReference?.birthDate;
  const ageYears = useMemo(() => calculateAgeFromBirthDate(birthDateStr), [birthDateStr]);
  const bioSex = useMemo(() => {
    return (
      (detail.resolvedBiologicalSex as BiologicalSex) ||
      normalizeBiologicalSex(detail.record.biologicalSex) ||
      normalizeBiologicalSex(detail.onboardingReference?.sex) ||
      null
    );
  }, [detail.resolvedBiologicalSex, detail.record.biologicalSex, detail.onboardingReference?.sex]);

  const isPregnant = detail.pregnancy?.pregnancyStatus === "PREGNANT";

  // Sorted anthropometric evaluations (newest first for tables/cards)
  const sortedAnthros = useMemo(() => {
    if (!detail.anthropometrics || detail.anthropometrics.length === 0) return [];
    return [...detail.anthropometrics].sort(
      (a, b) => new Date(b.measurementDate).getTime() - new Date(a.measurementDate).getTime()
    );
  }, [detail.anthropometrics]);

  const latestAnthro = sortedAnthros[0] || null;
  const previousAnthro = sortedAnthros[1] || null;

  // Current weight and height
  const currentWeightKg = latestAnthro?.weightKg ?? detail.onboardingReference?.reportedWeightKg ?? null;
  const currentHeightCm = latestAnthro?.heightCm ?? detail.onboardingReference?.reportedHeightCm ?? null;

  // Weight Delta
  const weightDeltaKg = useMemo(() => {
    if (latestAnthro?.weightKg !== null && latestAnthro?.weightKg !== undefined && previousAnthro?.weightKg !== null && previousAnthro?.weightKg !== undefined) {
      return Number((latestAnthro.weightKg - previousAnthro.weightKg).toFixed(1));
    }
    return null;
  }, [latestAnthro, previousAnthro]);

  // Current BMI
  const currentBMI = useMemo(() => {
    if (!currentWeightKg || !currentHeightCm || currentHeightCm <= 0) return null;
    const hM = currentHeightCm / 100;
    return Number((currentWeightKg / (hM * hM)).toFixed(1));
  }, [currentWeightKg, currentHeightCm]);

  const bmiClassification = useMemo(() => {
    return classifyBMI(currentBMI, {
      ageYears: ageYears ?? undefined,
      isPregnant,
    });
  }, [currentBMI, ageYears, isPregnant]);

  const bmiCategoryLabel = bmiClassification?.category || "—";

  // Waist-to-Hip Ratio (RCQ) on latest entry
  const latestWHR = useMemo(() => {
    if (!latestAnthro) return null;
    return calculateWaistToHipRatio(latestAnthro.waistCm, latestAnthro.hipCm, bioSex);
  }, [latestAnthro, bioSex]);

  // Body Composition protocol result on latest entry
  const latestBodyComp = useMemo(() => {
    if (!latestAnthro) return null;
    return resolveEvaluationBodyComposition(
      {
        tricepsMm: latestAnthro.tricepsMm,
        bicepsMm: latestAnthro.bicepsMm,
        subscapularMm: latestAnthro.subscapularMm,
        suprailiacMm: latestAnthro.suprailiacMm,
        abdominalFoldMm: latestAnthro.abdominalFoldMm,
        chestFoldMm: latestAnthro.chestFoldMm,
        thighFoldMm: latestAnthro.thighFoldMm,
        midaxillaryMm: latestAnthro.midaxillaryMm,
        calfFoldMm: latestAnthro.calfFoldMm,
      },
      latestAnthro.skinfoldProtocol,
      ageYears,
      bioSex,
      latestAnthro.weightKg
    );
  }, [latestAnthro, ageYears, bioSex]);

  // Effective body fat % (measured directly, via protocol, or via bioimpedance)
  const effectiveBodyFatPct = useMemo(() => {
    if (latestAnthro?.bodyFatPct !== null && latestAnthro?.bodyFatPct !== undefined) {
      return latestAnthro.bodyFatPct;
    }
    if (latestBodyComp?.effectiveBodyFatPct !== null && latestBodyComp?.effectiveBodyFatPct !== undefined) {
      return latestBodyComp.effectiveBodyFatPct;
    }
    return null;
  }, [latestAnthro, latestBodyComp]);

  // Effective Lean Mass (FFM in kg)
  const effectiveLeanMassKg = useMemo(() => {
    if (latestAnthro?.leanMassKg !== null && latestAnthro?.leanMassKg !== undefined) {
      return latestAnthro.leanMassKg;
    }
    if (latestBodyComp?.leanMassKg !== null && latestBodyComp?.leanMassKg !== undefined) {
      return latestBodyComp.leanMassKg;
    }
    if (currentWeightKg !== null && effectiveBodyFatPct !== null) {
      const fatKg = (currentWeightKg * effectiveBodyFatPct) / 100;
      return Number((currentWeightKg - fatKg).toFixed(1));
    }
    return null;
  }, [latestAnthro, latestBodyComp, currentWeightKg, effectiveBodyFatPct]);

  // Comparative BMR / GER Formulas Calculations
  const formulaEstimates = useMemo(() => {
    const hasBaseInputs = currentWeightKg !== null && currentHeightCm !== null && ageYears !== null && bioSex !== null;

    // 1. Mifflin-St Jeor (1990)
    const mifflin = hasBaseInputs
      ? calculateMifflinStJeor(currentWeightKg!, currentHeightCm!, ageYears!, bioSex!)
      : null;

    // 2. Harris-Benedict Revisada (1984)
    const harris = hasBaseInputs
      ? calculateHarrisBenedictRevised(currentWeightKg!, currentHeightCm!, ageYears!, bioSex!)
      : null;

    // 3. FAO/OMS/UNU (2004)
    const fao = currentWeightKg !== null && ageYears !== null && bioSex !== null
      ? calculateFaoOms(currentWeightKg, ageYears, bioSex)
      : null;

    // 4. Katch-McArdle (1996)
    const katch = effectiveLeanMassKg !== null && effectiveLeanMassKg > 0
      ? calculateKatchMcArdle(effectiveLeanMassKg)
      : null;

    // 5. Cunningham (1980)
    const cunningham = effectiveLeanMassKg !== null && effectiveLeanMassKg > 0
      ? calculateCunningham(effectiveLeanMassKg)
      : null;

    return {
      mifflin,
      harris,
      fao,
      katch,
      cunningham,
      hasBaseInputs,
      hasLeanMass: effectiveLeanMassKg !== null && effectiveLeanMassKg > 0,
    };
  }, [currentWeightKg, currentHeightCm, ageYears, bioSex, effectiveLeanMassKg]);

  // Format date helper
  const formatDate = (isoStr?: string | null): string => {
    if (!isoStr) return "—";
    try {
      const d = new Date(isoStr.includes("T") ? isoStr : `${isoStr}T12:00:00`);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return isoStr;
    }
  };

  // Delete evaluation handler
  const handleDeleteEntry = (entry: PatientAnthropometricEntry) => {
    if (!canAuthorNutrition) return;
    const confirmMsg = `Confirma a exclusão da medição realizada em ${formatDate(entry.measurementDate)}?\nEsta ação removerá o registro de peso e composição desta data.`;
    if (!window.confirm(confirmMsg)) return;

    setDeletingPublicId(entry.publicId);
    setFeedback(null);

    startTransition(async () => {
      const res = await deleteAnthropometricEntryAction(slug, detail.student.membershipPublicId, entry.publicId);
      setDeletingPublicId(null);
      if (res.success) {
        setFeedback({ type: "success", text: "Medição excluída com sucesso." });
        router.refresh();
      } else {
        setFeedback({ type: "error", text: res.error || "Erro ao excluir medição." });
      }
    });
  };

  // Open Edit Modal with selected entry
  const handleOpenEdit = (entry: PatientAnthropometricEntry) => {
    setEditingEntry(entry);
    setIsAddModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top action bar: Back to overview + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          {onBackToOverview && (
            <button
              type="button"
              onClick={onBackToOverview}
              className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-bold text-[var(--text-secondary)] transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <span>← Voltar à visão geral</span>
            </button>
          )}
          <span className="text-xs font-bold text-[var(--text-tertiary)]">
            Prontuário de {detail.student.fullName}
          </span>
        </div>

        {canAuthorNutrition && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingEntry(null);
                setIsAddModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>+ Nova Avaliação Física</span>
            </button>
          </div>
        )}
      </div>

      {/* Notifications */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs sm:text-sm border font-medium ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* =================================================================== */}
      {/* HERO COCKPIT: DADOS ATUAIS DA ÚLTIMA AVALIAÇÃO                      */}
      {/* =================================================================== */}
      <div className="p-5 sm:p-6 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] flex-wrap gap-2">
          <div>
            <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block tracking-wider">
              Painel Biométrico & Composição Corporal
            </span>
            <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
              Estado Atual do Paciente
            </h2>
          </div>
          {latestAnthro && (
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Avaliação em {formatDate(latestAnthro.measurementDate)}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[var(--surface-subtle)] text-[var(--text-tertiary)] border border-[var(--border-subtle)]">
                {latestAnthro.sourceType === "PATIENT_REPORTED" ? "Relatada pelo paciente" : "Gravada pelo profissional"}
              </span>
            </div>
          )}
        </div>

        {/* 5 Biometric Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Card 1: Peso Atual */}
          <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
            <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">Peso Atual</span>
            <span className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)] block tabular-nums">
              {currentWeightKg !== null ? `${currentWeightKg} kg` : "—"}
            </span>
            {weightDeltaKg !== null ? (
              <span className="text-[11px] font-bold text-[var(--text-secondary)] block">
                {weightDeltaKg > 0 ? `+${weightDeltaKg} kg vs anterior` : `${weightDeltaKg} kg vs anterior`}
              </span>
            ) : (
              <span className="text-[10px] text-[var(--text-tertiary)] block">Sem registro anterior</span>
            )}
          </div>

          {/* Card 2: Altura & IMC */}
          <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
            <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">Altura & IMC</span>
            <span className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)] block tabular-nums">
              {currentBMI !== null ? `IMC ${currentBMI}` : "—"}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block truncate" title={bmiCategoryLabel}>
              {currentHeightCm ? `${currentHeightCm} cm • ${bmiCategoryLabel}` : bmiCategoryLabel}
            </span>
          </div>

          {/* Card 3: % Gordura Corporal */}
          <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
            <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">Gordura Corporal</span>
            <span className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)] block tabular-nums">
              {effectiveBodyFatPct !== null ? `${effectiveBodyFatPct}%` : "—"}
            </span>
            <span className="text-[10px] text-[var(--text-tertiary)] block truncate">
              {latestBodyComp?.protocolName
                ? latestBodyComp.protocolName
                : latestAnthro?.equipmentMethod
                ? latestAnthro.equipmentMethod
                : "Não medido"}
            </span>
          </div>

          {/* Card 4: Massa Magra (FFM) */}
          <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
            <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">Massa Magra (FFM)</span>
            <span className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)] block tabular-nums">
              {effectiveLeanMassKg !== null ? `${effectiveLeanMassKg} kg` : "—"}
            </span>
            <span className="text-[10px] text-[var(--text-tertiary)] block">
              {effectiveLeanMassKg !== null && currentWeightKg !== null
                ? `${((effectiveLeanMassKg / currentWeightKg) * 100).toFixed(0)}% do peso total`
                : "Requer % de gordura"}
            </span>
          </div>

          {/* Card 5: RCQ (Relação Cintura-Quadril) */}
          <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1 col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">RCQ (Cintura/Quadril)</span>
            <span className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)] block tabular-nums">
              {latestWHR ? latestWHR.ratio.toFixed(2) : "—"}
            </span>
            <span
              className={`text-[10px] font-bold block truncate ${
                latestWHR?.badgeVariant === "danger"
                  ? "text-red-600 dark:text-red-400"
                  : latestWHR?.badgeVariant === "warning"
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {latestWHR ? latestWHR.riskCategory : "Requer cintura e quadril"}
            </span>
          </div>
        </div>

        {/* Gestational Notice if pregnant */}
        {isPregnant && (
          <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-700 dark:text-purple-300 flex items-center gap-2">
            <span className="font-bold">Nota gestacional:</span>
            <span>
              Paciente em período gestacional ({detail.pregnancy?.gestationalWeeks ? `${detail.pregnancy.gestationalWeeks} semanas` : "semanas não informadas"}).
              Classificações de IMC e equações preditivas para adultos gerais têm caráter puramente informativo e devem ser ajustadas pelo nutricionista.
            </span>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* SUB-TABS NAVIGATION (PILL BAR)                                      */}
      {/* =================================================================== */}
      <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar shadow-2xs">
        <button
          type="button"
          onClick={() => setSubTab("evolucao")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            subTab === "evolucao"
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold border border-emerald-500/30 shadow-2xs"
              : "hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)]"
          }`}
        >
          <span>Evolução Corporal & Medidas</span>
          <span className="px-1.5 py-0.5 rounded-full bg-[var(--surface-subtle)] text-[10px] font-bold text-[var(--text-tertiary)]">
            {sortedAnthros.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab("calculos")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            subTab === "calculos"
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold border border-emerald-500/30 shadow-2xs"
              : "hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)]"
          }`}
        >
          <span>Cálculos Metabólicos & Dobras</span>
          <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            Comparativo
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab("metas")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            subTab === "metas"
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold border border-emerald-500/30 shadow-2xs"
              : "hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)]"
          }`}
        >
          <span>Metas & Planejamento Energético</span>
          <span className="px-1.5 py-0.5 rounded-full bg-[var(--surface-subtle)] text-[10px] font-bold text-[var(--text-tertiary)]">
            GET / Macros
          </span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* SUB-TAB 1: EVOLUÇÃO CORPORAL & MEDIDAS                              */}
      {/* =================================================================== */}
      {subTab === "evolucao" && (
        <div className="space-y-6">
          {/* Gráfico Responsivo de Peso */}
          <WeightEvolutionChart
            entries={detail.anthropometrics || []}
            reportedWeightKg={detail.onboardingReference?.reportedWeightKg}
            reportedWeightDate={detail.onboardingReference?.submittedAt}
          />

          {/* Histórico Completo de Medições Datadas */}
          <div className="p-5 sm:p-6 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] flex-wrap gap-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block tracking-wider">
                  Registros Históricos
                </span>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Avaliações Físicas do Paciente ({sortedAnthros.length})
                </h3>
              </div>
              {canAuthorNutrition && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingEntry(null);
                    setIsAddModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  + Nova Avaliação
                </button>
              )}
            </div>

            {sortedAnthros.length > 0 ? (
              <div className="overflow-x-auto -mx-5 sm:mx-0">
                <table className="w-full text-left border-collapse min-w-[720px]">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
                      <th className="py-2.5 px-4 font-bold">Data</th>
                      <th className="py-2.5 px-3 font-bold">Peso & Evolução</th>
                      <th className="py-2.5 px-3 font-bold">Altura & IMC</th>
                      <th className="py-2.5 px-3 font-bold">Circunferências</th>
                      <th className="py-2.5 px-3 font-bold">Composição Corporal</th>
                      <th className="py-2.5 px-3 font-bold">Origem</th>
                      <th className="py-2.5 px-4 font-bold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)] text-xs text-[var(--text-primary)]">
                    {sortedAnthros.map((entry, idx) => {
                      const nextEntry = sortedAnthros[idx + 1];
                      const delta =
                        entry.weightKg !== null && nextEntry?.weightKg !== null && nextEntry?.weightKg !== undefined
                          ? Number((entry.weightKg - nextEntry.weightKg).toFixed(1))
                          : null;

                      const rowBmi =
                        entry.weightKg && entry.heightCm
                          ? Number((entry.weightKg / Math.pow(entry.heightCm / 100, 2)).toFixed(1))
                          : null;

                      const rowComp = resolveEvaluationBodyComposition(
                        {
                          tricepsMm: entry.tricepsMm,
                          bicepsMm: entry.bicepsMm,
                          subscapularMm: entry.subscapularMm,
                          suprailiacMm: entry.suprailiacMm,
                          abdominalFoldMm: entry.abdominalFoldMm,
                          chestFoldMm: entry.chestFoldMm,
                          thighFoldMm: entry.thighFoldMm,
                          midaxillaryMm: entry.midaxillaryMm,
                          calfFoldMm: entry.calfFoldMm,
                        },
                        entry.skinfoldProtocol,
                        ageYears,
                        bioSex,
                        entry.weightKg
                      );

                      const fatPct = entry.bodyFatPct ?? rowComp?.effectiveBodyFatPct ?? null;
                      const isDeletingThis = deletingPublicId === entry.publicId;

                      return (
                        <tr key={entry.publicId || idx} className="hover:bg-[var(--surface-subtle)] transition-colors">
                          <td className="py-3 px-4 font-semibold whitespace-nowrap">
                            <span className="block">{formatDate(entry.measurementDate)}</span>
                            {entry.editReason && (
                              <span
                                className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                                title={`Motivo da correção: ${entry.editReason}`}
                              >
                                Corrigida
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="font-bold tabular-nums">
                              {entry.weightKg !== null ? `${entry.weightKg} kg` : "—"}
                            </span>
                            {delta !== null && (
                              <span className="text-[10px] text-[var(--text-tertiary)] block tabular-nums">
                                {delta > 0 ? `+${delta} kg` : `${delta} kg`}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="tabular-nums">
                              {entry.heightCm !== null ? `${entry.heightCm} cm` : "—"}
                            </span>
                            {rowBmi !== null && (
                              <span className="text-[10px] text-[var(--text-tertiary)] block tabular-nums">
                                IMC {rowBmi}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <div className="space-y-0.5 text-[11px] text-[var(--text-secondary)]">
                              {entry.waistCm && <span>Cintura: {entry.waistCm}cm </span>}
                              {entry.hipCm && <span>• Quadril: {entry.hipCm}cm </span>}
                              {entry.abdomenCm && <span>• Abd: {entry.abdomenCm}cm</span>}
                              {!entry.waistCm && !entry.hipCm && !entry.abdomenCm && (
                                <span className="text-[var(--text-tertiary)]">—</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            {fatPct !== null ? (
                              <div>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                  {fatPct}% Gordura
                                </span>
                                {rowComp?.protocolName && (
                                  <span className="text-[10px] text-[var(--text-tertiary)] block truncate max-w-[140px]" title={rowComp.protocolName}>
                                    {rowComp.protocolName}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[var(--text-tertiary)]">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              entry.sourceType === "PATIENT_REPORTED"
                                ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                            }`}>
                              {entry.sourceType === "PATIENT_REPORTED" ? "Paciente" : "Profissional"}
                            </span>
                            {entry.createdByName && (
                              <span className="text-[10px] text-[var(--text-tertiary)] block truncate max-w-[120px]" title={entry.createdByName}>
                                {entry.createdByName}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setDetailEntry(entry)}
                                className="px-2.5 py-1 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] text-[11px] font-bold text-[var(--text-secondary)] transition-colors cursor-pointer"
                              >
                                Detalhes
                              </button>

                              {canAuthorNutrition && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEdit(entry)}
                                    className="px-2.5 py-1 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] text-[11px] font-bold text-amber-600 dark:text-amber-400 transition-colors cursor-pointer"
                                  >
                                    Corrigir
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isDeletingThis || isPending}
                                    onClick={() => handleDeleteEntry(entry)}
                                    className="px-2 py-1 rounded-lg hover:bg-destructive/10 text-[11px] font-bold text-destructive transition-colors cursor-pointer disabled:opacity-50"
                                    title="Excluir medição"
                                  >
                                    {isDeletingThis ? "..." : "✕"}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 px-4 text-center space-y-3">
                <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                  Nenhuma avaliação física registrada até o momento.
                </p>
                {canAuthorNutrition && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEntry(null);
                      setIsAddModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    + Registrar Primeira Avaliação
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-TAB 2: CÁLCULOS METABÓLICOS & DOBRAS (COMPARATIVO RIGOROSO)     */}
      {/* =================================================================== */}
      {subTab === "calculos" && (
        <div className="space-y-6">
          {/* Clarifying Clinical Banner: TMB vs GER */}
          <div className="p-4 sm:p-5 rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Diferença Clínica entre TMB e GER
              </h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              <strong>Taxa Metabólica Basal (TMB):</strong> Mensura a energia gasta em condições basais estritas (após jejum prolongado, repouso absoluto acordado e neutralidade térmica). Equações como <em>Mifflin-St Jeor</em>, <em>Harris-Benedict</em> e <em>FAO/OMS</em> predizem TMB a partir de peso, altura, idade e sexo.
            </p>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              <strong>Gasto Energético de Repouso (GER):</strong> Refere-se à energia despendida em repouso sem os requisitos estritos de jejum das condições basais. Equações como <em>Katch-McArdle</em> e <em>Cunningham</em> predizem GER diretamente com base na Massa Livre de Gordura (FFM), sendo altamente indicadas para atletas e indivíduos com massa muscular elevada.
            </p>
            <p className="text-[11px] text-[var(--text-tertiary)] italic pt-1 border-t border-[var(--border-subtle)]">
              Nota ética e de segurança: Nenhuma estimativa prescreve calorias automaticamente. O nutricionista define a conduta terapêutica e a meta calórica no plano do paciente.
            </p>
          </div>

          {/* Comparative Grid of 5 Formulas */}
          <div className="p-5 sm:p-6 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block tracking-wider">
                Comparativo Deterministico de Necessidades Energéticas
              </span>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Equações de Predição Metabólica Aplicadas ao Paciente
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Formula 1: Mifflin-St Jeor */}
              <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                      TMB (Basal)
                    </span>
                    <span className="text-[11px] text-[var(--text-tertiary)]">Padrão AND</span>
                  </div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">
                    Mifflin-St Jeor (1990)
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Recomendada para adultos saudáveis e obesos.
                  </p>
                  <p className="text-[10px] text-[var(--text-tertiary)] font-mono">
                    H: 10×P + 6,25×A - 5×I + 5 | M: 10×P + 6,25×A - 5×I - 161
                  </p>
                </div>
                <div className="pt-2 border-t border-[var(--border-subtle)]">
                  {formulaEstimates.mifflin !== null ? (
                    <div>
                      <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {Math.round(formulaEstimates.mifflin).toLocaleString("pt-BR")} kcal/dia
                      </span>
                      <span className="text-[10px] text-[var(--text-tertiary)] block">
                        Base: Peso {currentWeightKg}kg • Altura {currentHeightCm}cm • Idade {ageYears}a
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-amber-600 font-medium">
                      Requer peso, altura, idade e sexo
                    </span>
                  )}
                </div>
              </div>

              {/* Formula 2: Harris-Benedict Revisada */}
              <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                      TMB (Basal)
                    </span>
                    <span className="text-[11px] text-[var(--text-tertiary)]">Roza & Shizgal 1984</span>
                  </div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">
                    Harris-Benedict Revisada
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Reavaliação moderna dos coeficientes clássicos.
                  </p>
                  <p className="text-[10px] text-[var(--text-tertiary)] font-mono">
                    H: 88,362 + 13,397×P + 4,799×A - 5,677×I
                  </p>
                </div>
                <div className="pt-2 border-t border-[var(--border-subtle)]">
                  {formulaEstimates.harris !== null ? (
                    <div>
                      <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {Math.round(formulaEstimates.harris).toLocaleString("pt-BR")} kcal/dia
                      </span>
                      <span className="text-[10px] text-[var(--text-tertiary)] block">
                        Base: Peso {currentWeightKg}kg • Altura {currentHeightCm}cm • Idade {ageYears}a
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-amber-600 font-medium">
                      Requer peso, altura, idade e sexo
                    </span>
                  )}
                </div>
              </div>

              {/* Formula 3: FAO/OMS/UNU (2004) */}
              <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                      TMB (Faixa Etária)
                    </span>
                    <span className="text-[11px] text-[var(--text-tertiary)]">FAO/WHO/UNU 2004</span>
                  </div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">
                    FAO / OMS / UNU (2004)
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Padrão internacional por faixas etárias específicas.
                  </p>
                  <p className="text-[10px] text-[var(--text-tertiary)] font-mono">
                    {ageYears && ageYears < 30 ? "18-29 anos" : ageYears && ageYears <= 60 ? "30-60 anos" : ">60 anos"}
                  </p>
                </div>
                <div className="pt-2 border-t border-[var(--border-subtle)]">
                  {formulaEstimates.fao !== null ? (
                    <div>
                      <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {Math.round(formulaEstimates.fao).toLocaleString("pt-BR")} kcal/dia
                      </span>
                      <span className="text-[10px] text-[var(--text-tertiary)] block">
                        Base: Peso {currentWeightKg}kg • Idade {ageYears}a
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-amber-600 font-medium">
                      Requer peso, idade e sexo
                    </span>
                  )}
                </div>
              </div>

              {/* Formula 4: Katch-McArdle (1996) */}
              <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                      GER (Massa Magra)
                    </span>
                    <span className="text-[11px] text-[var(--text-tertiary)]">Katch & McArdle 1996</span>
                  </div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">
                    Katch-McArdle (1996)
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Baseada exclusivamente na massa livre de gordura (FFM).
                  </p>
                  <p className="text-[10px] text-[var(--text-tertiary)] font-mono">
                    GER = 370 + (21,6 × Massa Magra kg)
                  </p>
                </div>
                <div className="pt-2 border-t border-[var(--border-subtle)]">
                  {formulaEstimates.katch !== null ? (
                    <div>
                      <span className="text-lg font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">
                        {Math.round(formulaEstimates.katch).toLocaleString("pt-BR")} kcal/dia
                      </span>
                      <span className="text-[10px] text-[var(--text-tertiary)] block">
                        Base: FFM {effectiveLeanMassKg}kg
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <span className="text-xs text-amber-600 font-medium block">
                        Requer Massa Magra (FFM)
                      </span>
                      <span className="text-[10px] text-[var(--text-tertiary)] block">
                        Registre dobras ou bioimpedância na avaliação.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Formula 5: Cunningham (1980) */}
              <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                      GER (Atletas)
                    </span>
                    <span className="text-[11px] text-[var(--text-tertiary)]">Cunningham 1980</span>
                  </div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">
                    Cunningham (1980)
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Padrão de referência para atletas e adultos hipertrofiados.
                  </p>
                  <p className="text-[10px] text-[var(--text-tertiary)] font-mono">
                    GER = 500 + (22 × Massa Magra kg)
                  </p>
                </div>
                <div className="pt-2 border-t border-[var(--border-subtle)]">
                  {formulaEstimates.cunningham !== null ? (
                    <div>
                      <span className="text-lg font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">
                        {Math.round(formulaEstimates.cunningham).toLocaleString("pt-BR")} kcal/dia
                      </span>
                      <span className="text-[10px] text-[var(--text-tertiary)] block">
                        Base: FFM {effectiveLeanMassKg}kg
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <span className="text-xs text-amber-600 font-medium block">
                        Requer Massa Magra (FFM)
                      </span>
                      <span className="text-[10px] text-[var(--text-tertiary)] block">
                        Registre dobras ou bioimpedância na avaliação.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Skinfold Protocol Analysis Card on Latest Evaluation */}
          {latestAnthro && (
            <div className="p-5 sm:p-6 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] flex-wrap gap-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block tracking-wider">
                    Análise Antropométrica Detalhada
                  </span>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    Dobras Cutâneas & Composição da Última Avaliação ({formatDate(latestAnthro.measurementDate)})
                  </h3>
                </div>
                {latestBodyComp?.protocolName && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Protocolo: {latestBodyComp.protocolName}
                  </span>
                )}
              </div>

              {/* Skinfolds Measured Chips */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-[var(--text-secondary)] block">
                  Dobras Cutâneas Registradas (mm)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                    <span className="text-[10px] text-[var(--text-tertiary)] block">Tríceps</span>
                    <span className="text-sm font-extrabold text-[var(--text-primary)] tabular-nums">
                      {latestAnthro.tricepsMm !== null ? `${latestAnthro.tricepsMm} mm` : "—"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                    <span className="text-[10px] text-[var(--text-tertiary)] block">Bíceps</span>
                    <span className="text-sm font-extrabold text-[var(--text-primary)] tabular-nums">
                      {latestAnthro.bicepsMm !== null ? `${latestAnthro.bicepsMm} mm` : "—"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                    <span className="text-[10px] text-[var(--text-tertiary)] block">Subescapular</span>
                    <span className="text-sm font-extrabold text-[var(--text-primary)] tabular-nums">
                      {latestAnthro.subscapularMm !== null ? `${latestAnthro.subscapularMm} mm` : "—"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                    <span className="text-[10px] text-[var(--text-tertiary)] block">Suprailíaca</span>
                    <span className="text-sm font-extrabold text-[var(--text-primary)] tabular-nums">
                      {latestAnthro.suprailiacMm !== null ? `${latestAnthro.suprailiacMm} mm` : "—"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                    <span className="text-[10px] text-[var(--text-tertiary)] block">Abdominal</span>
                    <span className="text-sm font-extrabold text-[var(--text-primary)] tabular-nums">
                      {latestAnthro.abdominalFoldMm !== null ? `${latestAnthro.abdominalFoldMm} mm` : "—"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                    <span className="text-[10px] text-[var(--text-tertiary)] block">Peitoral</span>
                    <span className="text-sm font-extrabold text-[var(--text-primary)] tabular-nums">
                      {latestAnthro.chestFoldMm !== null ? `${latestAnthro.chestFoldMm} mm` : "—"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                    <span className="text-[10px] text-[var(--text-tertiary)] block">Coxa</span>
                    <span className="text-sm font-extrabold text-[var(--text-primary)] tabular-nums">
                      {latestAnthro.thighFoldMm !== null ? `${latestAnthro.thighFoldMm} mm` : "—"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                    <span className="text-[10px] text-[var(--text-tertiary)] block">Axilar Média</span>
                    <span className="text-sm font-extrabold text-[var(--text-primary)] tabular-nums">
                      {latestAnthro.midaxillaryMm !== null ? `${latestAnthro.midaxillaryMm} mm` : "—"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                    <span className="text-[10px] text-[var(--text-tertiary)] block">Panturrilha</span>
                    <span className="text-sm font-extrabold text-[var(--text-primary)] tabular-nums">
                      {latestAnthro.calfFoldMm !== null ? `${latestAnthro.calfFoldMm} mm` : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Protocol Isolation Note */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                <span className="font-bold">Regra de integridade antropométrica:</span> As equações de densidade corporal e % de gordura exigem que todas as dobras tenham sido coletadas no mesmo exame. Dobras de datas distintas nunca são combinadas.
              </div>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-TAB 3: METAS & PLANEJAMENTO ENERGÉTICO (PLANNING TAB ENGINE)     */}
      {/* =================================================================== */}
      {subTab === "metas" && (
        <PatientPlanningTab
          slug={slug}
          studentPublicId={detail.student.membershipPublicId}
          studentMembershipPublicId={detail.student.membershipPublicId}
          patientRecordId={detail.record.id}
          initialPlanning={initialPlanning}
          initialStaleStatus={initialStaleStatus}
          initialResolvedBirthDate={birthDateStr}
          initialResolvedBiologicalSex={bioSex}
          latestAnthro={
            latestAnthro
              ? {
                  weightKg: latestAnthro.weightKg,
                  heightCm: latestAnthro.heightCm,
                  measurementDate: latestAnthro.measurementDate,
                }
              : null
          }
          onboardingRef={detail.onboardingReference}
          activePlan={activePlan}
          draftPlan={draftPlan}
          canAuthor={canAuthorNutrition}
          onStartEditPlan={onStartEditPlan}
          isStartingEditPlan={isStartingEditPlan}
        />
      )}

      {/* =================================================================== */}
      {/* MODAL DE ADIÇÃO / CORREÇÃO DE MEDIÇÃO ANTROPOMÉTRICA                */}
      {/* =================================================================== */}
      <AnthropometricModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingEntry(null);
        }}
        slug={slug}
        studentMembershipPublicId={detail.student.membershipPublicId}
        editingEntry={editingEntry}
        patientAgeYears={ageYears}
        patientSex={bioSex}
        onSuccess={() => {
          setIsAddModalOpen(false);
          setEditingEntry(null);
          setFeedback({
            type: "success",
            text: editingEntry ? "Medição corrigida com sucesso." : "Nova avaliação física registrada com sucesso.",
          });
          router.refresh();
        }}
      />

      {/* =================================================================== */}
      {/* MODAL DE DETALHES COMPLETOS DE UMA AVALIAÇÃO                       */}
      {/* =================================================================== */}
      <AnthropometricDetailModal
        isOpen={Boolean(detailEntry)}
        onClose={() => setDetailEntry(null)}
        entry={detailEntry}
        patientAgeYears={ageYears}
        patientSex={bioSex}
        canEdit={canAuthorNutrition}
        onEdit={(entry) => {
          setDetailEntry(null);
          handleOpenEdit(entry);
        }}
      />
    </div>
  );
}
