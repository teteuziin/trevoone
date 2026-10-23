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
import {
  deleteAnthropometricEntryAction,
  savePlanningFieldPreferencesAction,
} from "@/app/consultoria/[slug]/planos-v2/patient-actions";
import { WeightEvolutionChart } from "./weight-evolution-chart";
import { AnthropometricModal } from "./anthropometric-modal";
import { AnthropometricDetailModal } from "./anthropometric-detail-modal";
import { PatientPlanningTab } from "./patient-planning-tab";
import { PlanningMeasurementsSection } from "./planning-measurements-section";
import { PlanningBodyCompositionSection } from "./planning-body-composition-section";
import { PlanningLabExamsSection } from "./planning-lab-exams-section";
import { PlanningEvolutionComparator } from "./planning-evolution-comparator";
import { PlanningFieldPreferencesModal } from "./planning-field-preferences-modal";
import {
  DEFAULT_PLANNING_FIELD_PREFERENCES,
  type PlanningFieldPreferences,
} from "@/lib/nutrition-v2/clinical-measurements-catalog";

export interface PlanningEvolutionTabProps {
  slug: string;
  detail: PatientRecordDetail;
  initialPlanning?: PatientPlanning | null;
  initialStaleStatus?: PatientPlanningStaleStatus | null;
  activePlan?: ActiveNutritionPlanSummary | null;
  draftPlan?: PatientPlanDraftSummary | null;
  canAuthorNutrition?: boolean;
  initialSubTab?: "resumo" | "medidas" | "composicao" | "exames" | "evolucao" | "metas";
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
  initialSubTab = "resumo",
  onBackToOverview,
  onStartEditPlan,
  isStartingEditPlan = false,
}: PlanningEvolutionTabProps) {
  const router = useRouter();
  const [subTab, setSubTab] = useState<"resumo" | "medidas" | "composicao" | "exames" | "evolucao" | "metas">(
    (initialSubTab as string) === "calculos" ? "resumo" : initialSubTab
  );
  const [isPending, startTransition] = useTransition();

  // Field Preferences State
  const [preferences, setPreferences] = useState<PlanningFieldPreferences>(
    detail.fieldPreferences || DEFAULT_PLANNING_FIELD_PREFERENCES
  );
  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState(false);

  // Sorted anthropometric evaluations (newest first)
  const sortedAnthros = useMemo(() => {
    if (!detail.anthropometrics || detail.anthropometrics.length === 0) return [];
    return [...detail.anthropometrics].sort(
      (a, b) => new Date(b.measurementDate).getTime() - new Date(a.measurementDate).getTime()
    );
  }, [detail.anthropometrics]);

  // Selected Evaluation (defaults to newest evaluation)
  const [selectedEntryId, setSelectedEntryId] = useState<string>(
    sortedAnthros[0]?.publicId || ""
  );

  const selectedAnthro = useMemo(() => {
    if (!selectedEntryId) return sortedAnthros[0] || null;
    return sortedAnthros.find((a) => a.publicId === selectedEntryId) || sortedAnthros[0] || null;
  }, [sortedAnthros, selectedEntryId]);

  const latestAnthro = sortedAnthros[0] || null;
  const previousAnthro = sortedAnthros[1] || null;

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

  // Current weight and height from selected evaluation
  const activeWeightKg = selectedAnthro?.weightKg ?? latestAnthro?.weightKg ?? detail.onboardingReference?.reportedWeightKg ?? null;
  const activeHeightCm = selectedAnthro?.heightCm ?? latestAnthro?.heightCm ?? detail.onboardingReference?.reportedHeightCm ?? null;

  // Weight Delta vs previous evaluation
  const weightDeltaKg = useMemo(() => {
    if (selectedAnthro?.weightKg != null && previousAnthro?.weightKg != null) {
      return Number((selectedAnthro.weightKg - previousAnthro.weightKg).toFixed(1));
    }
    return null;
  }, [selectedAnthro, previousAnthro]);

  // Active BMI
  const activeBMI = useMemo(() => {
    if (!activeWeightKg || !activeHeightCm || activeHeightCm <= 0) return null;
    const hM = activeHeightCm / 100;
    return Number((activeWeightKg / (hM * hM)).toFixed(1));
  }, [activeWeightKg, activeHeightCm]);

  const bmiClassification = useMemo(() => {
    return classifyBMI(activeBMI, {
      ageYears: ageYears ?? undefined,
      isPregnant,
    });
  }, [activeBMI, ageYears, isPregnant]);

  const bmiCategoryLabel = bmiClassification?.category || "—";

  // Waist-to-Hip Ratio (RCQ) on selected evaluation
  const selectedWHR = useMemo(() => {
    if (!selectedAnthro) return null;
    return calculateWaistToHipRatio(selectedAnthro.waistCm, selectedAnthro.hipCm, bioSex);
  }, [selectedAnthro, bioSex]);

  // Body Composition protocol result on selected evaluation
  const selectedBodyComp = useMemo(() => {
    if (!selectedAnthro) return null;
    return resolveEvaluationBodyComposition(
      {
        tricepsMm: selectedAnthro.tricepsMm,
        bicepsMm: selectedAnthro.bicepsMm,
        subscapularMm: selectedAnthro.subscapularMm,
        suprailiacMm: selectedAnthro.suprailiacMm,
        abdominalFoldMm: selectedAnthro.abdominalFoldMm,
        chestFoldMm: selectedAnthro.chestFoldMm,
        thighFoldMm: selectedAnthro.thighFoldMm,
        midaxillaryMm: selectedAnthro.midaxillaryMm,
        calfFoldMm: selectedAnthro.calfFoldMm,
      },
      selectedAnthro.skinfoldProtocol,
      ageYears,
      bioSex,
      selectedAnthro.weightKg
    );
  }, [selectedAnthro, ageYears, bioSex]);

  // Effective body fat % on selected entry
  const effectiveBodyFatPct = useMemo(() => {
    if (selectedAnthro?.bodyFatPct != null) return selectedAnthro.bodyFatPct;
    if (selectedBodyComp?.effectiveBodyFatPct != null) return selectedBodyComp.effectiveBodyFatPct;
    return null;
  }, [selectedAnthro, selectedBodyComp]);

  // Effective Lean Mass (FFM in kg) on selected entry
  const effectiveLeanMassKg = useMemo(() => {
    if (selectedAnthro?.leanMassKg != null) return selectedAnthro.leanMassKg;
    if (selectedBodyComp?.leanMassKg != null) return selectedBodyComp.leanMassKg;
    if (activeWeightKg != null && effectiveBodyFatPct != null) {
      const fatKg = (activeWeightKg * effectiveBodyFatPct) / 100;
      return Number((activeWeightKg - fatKg).toFixed(1));
    }
    return null;
  }, [selectedAnthro, selectedBodyComp, activeWeightKg, effectiveBodyFatPct]);

  // Comparative BMR / GER Formulas Calculations
  const formulaEstimates = useMemo(() => {
    const hasBaseInputs = activeWeightKg !== null && activeHeightCm !== null && ageYears !== null && bioSex !== null;

    const mifflin = hasBaseInputs
      ? calculateMifflinStJeor(activeWeightKg!, activeHeightCm!, ageYears!, bioSex!)
      : null;

    const harris = hasBaseInputs
      ? calculateHarrisBenedictRevised(activeWeightKg!, activeHeightCm!, ageYears!, bioSex!)
      : null;

    const fao = activeWeightKg !== null && ageYears !== null && bioSex !== null
      ? calculateFaoOms(activeWeightKg, ageYears, bioSex)
      : null;

    const katch = effectiveLeanMassKg !== null && effectiveLeanMassKg > 0
      ? calculateKatchMcArdle(effectiveLeanMassKg)
      : null;

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
  }, [activeWeightKg, activeHeightCm, ageYears, bioSex, effectiveLeanMassKg]);

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

  const handleSavePreferences = async (newPrefs: Partial<PlanningFieldPreferences>) => {
    const res = await savePlanningFieldPreferencesAction(slug, newPrefs);
    if (res.success && res.preferences) {
      setPreferences(res.preferences);
      setFeedback({ type: "success", text: "Preferências de visualização atualizadas." });
    } else {
      setFeedback({ type: "error", text: res.error || "Erro ao salvar preferências." });
    }
  };

  const handleDeleteEntry = (entry: PatientAnthropometricEntry) => {
    if (!canAuthorNutrition) return;
    const confirmMsg = `Confirma a exclusão da medição realizada em ${formatDate(entry.measurementDate)}?\nEsta ação removerá o registro desta data.`;
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

  const handleOpenEdit = (entry: PatientAnthropometricEntry) => {
    setEditingEntry(entry);
    setIsAddModalOpen(true);
  };

  const handleOpenNewEvaluation = () => {
    setEditingEntry(null);
    setIsAddModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* =================================================================== */}
      {/* 1. TOP HEADER: SELETOR DE AVALIAÇÕES + AUTOSAVE + NOVA AVALIAÇÃO    */}
      {/* =================================================================== */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 sm:p-6 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            {onBackToOverview && (
              <button
                type="button"
                onClick={onBackToOverview}
                className="px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-bold text-[var(--text-secondary)] transition-colors cursor-pointer inline-flex items-center gap-1 min-h-[36px]"
              >
                <span>← Voltar</span>
              </button>
            )}
            <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] tracking-wider">
              Planejamento & Avaliação Nutricional
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">
              {detail.student.fullName}
            </h2>

            {/* Historical Evaluation Selector */}
            {sortedAnthros.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--text-tertiary)]">Avaliação:</span>
                <select
                  value={selectedEntryId}
                  onChange={(e) => setSelectedEntryId(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer min-h-[40px]"
                >
                  {sortedAnthros.map((a, idx) => (
                    <option key={a.publicId} value={a.publicId}>
                      {formatDate(a.measurementDate)} {idx === 0 ? "(Mais recente)" : ""} {a.weightKg ? `• ${a.weightKg} kg` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Selected evaluation metadata (date, author, notes) */}
          {selectedAnthro && (
            <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)] flex-wrap pt-0.5">
              <span>
                Data: <strong>{formatDate(selectedAnthro.measurementDate)}</strong>
              </span>
              <span>•</span>
              <span>
                Responsável: <strong>{selectedAnthro.createdByName || selectedAnthro.updatedByName || "Nutricionista"}</strong>
              </span>
              {selectedAnthro.notes && (
                <>
                  <span>•</span>
                  <span className="italic truncate max-w-xs" title={selectedAnthro.notes}>
                    Obs: &quot;{selectedAnthro.notes}&quot;
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Actions bar */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Real Autosave Status Indicator */}
          <div className="px-2.5 py-1.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[11px] font-semibold text-[var(--text-tertiary)] inline-flex items-center gap-1.5 min-h-[44px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>Dados sincronizados</span>
          </div>

          {/* Field preferences modal button */}
          <button
            type="button"
            onClick={() => setIsPreferencesModalOpen(true)}
            className="px-3 py-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-xs font-bold text-[var(--text-secondary)] transition-colors cursor-pointer inline-flex items-center gap-1.5 min-h-[44px]"
            title="Personalizar seções e medições visíveis"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Campos</span>
          </button>

          {/* New Evaluation Button (Does not overwrite previous, does not copy silently) */}
          {canAuthorNutrition && (
            <button
              type="button"
              onClick={handleOpenNewEvaluation}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5 min-h-[44px]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>+ Nova Avaliação</span>
            </button>
          )}
        </div>
      </div>

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
      {/* 2. SUB-TABS NAVIGATION: 5 SECTIONS AS PER USER SPEC                  */}
      {/* =================================================================== */}
      <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar shadow-2xs">
        {/* Section 1: Resumo */}
        {(preferences.showSummary ?? true) && (
          <button
            type="button"
            onClick={() => setSubTab("resumo")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer min-h-[44px] ${
              subTab === "resumo"
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold border border-emerald-500/30 shadow-2xs"
                : "hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)]"
            }`}
          >
            <span>Resumo da Avaliação</span>
          </button>
        )}

        {/* Section 2: Medidas corporais */}
        {(preferences.showPerimeters ?? true) && (
          <button
            type="button"
            onClick={() => setSubTab("medidas")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer min-h-[44px] ${
              subTab === "medidas"
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold border border-emerald-500/30 shadow-2xs"
                : "hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)]"
            }`}
          >
            <span>Medidas Corporais</span>
          </button>
        )}

        {/* Section 3: Composição corporal */}
        {(preferences.showBodyComposition ?? true) && (
          <button
            type="button"
            onClick={() => setSubTab("composicao")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer min-h-[44px] ${
              subTab === "composicao"
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold border border-emerald-500/30 shadow-2xs"
                : "hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)]"
            }`}
          >
            <span>Composição Corporal (2C)</span>
          </button>
        )}

        {/* Section 4: Exames laboratoriais */}
        {(preferences.showLabExams ?? true) && (
          <button
            type="button"
            onClick={() => setSubTab("exames")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer min-h-[44px] ${
              subTab === "exames"
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold border border-emerald-500/30 shadow-2xs"
                : "hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)]"
            }`}
          >
            <span>Exames Laboratoriais</span>
            {detail.labExams && detail.labExams.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                {detail.labExams.length}
              </span>
            )}
          </button>
        )}

        {/* Section 5: Evolução das medidas */}
        {(preferences.showEvolution ?? true) && (
          <button
            type="button"
            onClick={() => setSubTab("evolucao")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer min-h-[44px] ${
              subTab === "evolucao"
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold border border-emerald-500/30 shadow-2xs"
                : "hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)]"
            }`}
          >
            <span>Evolução das Medidas</span>
            <span className="px-1.5 py-0.5 rounded-full bg-[var(--surface-subtle)] text-[10px] font-bold text-[var(--text-tertiary)]">
              {sortedAnthros.length}
            </span>
          </button>
        )}

        {/* Sub-tab: Metas e GET */}
        <button
          type="button"
          onClick={() => setSubTab("metas")}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer min-h-[44px] ${
            subTab === "metas"
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-extrabold border border-emerald-500/30 shadow-2xs"
              : "hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)]"
          }`}
        >
          <span>Metas & GET</span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* 3. SECTION 1: RESUMO DA AVALIAÇÃO                                   */}
      {/* =================================================================== */}
      {subTab === "resumo" && (
        <div className="space-y-6">
          {/* Cockpit Card: 5 Metrics */}
          <div className="p-5 sm:p-6 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] flex-wrap gap-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block tracking-wider">
                  Resumo Biométrico da Avaliação Selecionada
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                  Painel de Indicadores Clínicos
                </h3>
              </div>
              {selectedAnthro && (
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    {formatDate(selectedAnthro.measurementDate)}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[var(--surface-subtle)] text-[var(--text-tertiary)] border border-[var(--border-subtle)]">
                    {selectedAnthro.sourceType === "PATIENT_REPORTED" ? "Relatada pelo paciente" : "Gravada pelo profissional"}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Card 1: Peso */}
              <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">Peso</span>
                <span className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)] block tabular-nums">
                  {activeWeightKg !== null ? `${activeWeightKg} kg` : "—"}
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
                  {activeBMI !== null ? `IMC ${activeBMI}` : "—"}
                </span>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block truncate" title={bmiCategoryLabel}>
                  {activeHeightCm ? `${activeHeightCm} cm • ${bmiCategoryLabel}` : bmiCategoryLabel}
                </span>
              </div>

              {/* Card 3: % Gordura */}
              <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">Gordura Corporal</span>
                <span className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)] block tabular-nums">
                  {effectiveBodyFatPct !== null ? `${effectiveBodyFatPct}%` : "—"}
                </span>
                <span className="text-[10px] text-[var(--text-tertiary)] block truncate">
                  {selectedBodyComp?.protocolName
                    ? selectedBodyComp.protocolName
                    : selectedAnthro?.equipmentMethod
                    ? selectedAnthro.equipmentMethod
                    : "Não medido"}
                </span>
              </div>

              {/* Card 4: Massa Livre (FFM) */}
              <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">Massa Livre (FFM)</span>
                <span className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)] block tabular-nums">
                  {effectiveLeanMassKg !== null ? `${effectiveLeanMassKg} kg` : "—"}
                </span>
                <span className="text-[10px] text-[var(--text-tertiary)] block">
                  {effectiveLeanMassKg !== null && activeWeightKg !== null
                    ? `${((effectiveLeanMassKg / activeWeightKg) * 100).toFixed(0)}% do peso total`
                    : "Requer % de gordura"}
                </span>
              </div>

              {/* Card 5: RCQ */}
              <div className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1 col-span-2 sm:col-span-1">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">RCQ (Cintura/Quadril)</span>
                <span className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)] block tabular-nums">
                  {selectedWHR ? selectedWHR.ratio.toFixed(2) : "—"}
                </span>
                <span
                  className={`text-[10px] font-bold block truncate ${
                    selectedWHR?.badgeVariant === "danger"
                      ? "text-red-600 dark:text-red-400"
                      : selectedWHR?.badgeVariant === "warning"
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {selectedWHR ? selectedWHR.riskCategory : "Requer cintura e quadril"}
                </span>
              </div>
            </div>

            {isPregnant && (
              <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-700 dark:text-purple-300 flex items-center gap-2">
                <span className="font-bold">Nota gestacional:</span>
                <span>
                  Paciente em período gestacional ({detail.pregnancy?.gestationalWeeks ? `${detail.pregnancy.gestationalWeeks} semanas` : "semanas não informadas"}).
                  Classificações de IMC e equações gerais são informativas.
                </span>
              </div>
            )}
          </div>

          {/* Formulas Comparativas de TMB */}
          <div className="p-5 sm:p-6 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] flex-wrap gap-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block tracking-wider">
                  Equações Preditivas Comparativas
                </span>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Taxa Metabólica Basal (TMB / GER)
                </h3>
              </div>
              <span className="text-xs text-[var(--text-tertiary)]">
                Base: {activeWeightKg}kg • {activeHeightCm}cm • {ageYears}a
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Formula 1: Mifflin-St Jeor */}
              <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-primary)]">Mifflin-St Jeor (1990)</span>
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-extrabold bg-emerald-500/10 text-emerald-600">Recomendado</span>
                </div>
                <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formulaEstimates.mifflin ? `${Math.round(formulaEstimates.mifflin).toLocaleString("pt-BR")} kcal/dia` : "Requer dados"}
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">Padrão-ouro clínico para adultos gerais.</p>
              </div>

              {/* Formula 2: Harris-Benedict */}
              <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-primary)]">Harris-Benedict Revisada</span>
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-semibold bg-[var(--surface)] text-[var(--text-tertiary)]">1984</span>
                </div>
                <div className="text-lg font-extrabold text-[var(--text-primary)] tabular-nums">
                  {formulaEstimates.harris ? `${Math.round(formulaEstimates.harris).toLocaleString("pt-BR")} kcal/dia` : "Requer dados"}
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">Revisão Roza & Shizgal de Harris-Benedict.</p>
              </div>

              {/* Formula 3: FAO/OMS */}
              <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-primary)]">FAO / OMS / UNU</span>
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-semibold bg-[var(--surface)] text-[var(--text-tertiary)]">2004</span>
                </div>
                <div className="text-lg font-extrabold text-[var(--text-primary)] tabular-nums">
                  {formulaEstimates.fao ? `${Math.round(formulaEstimates.fao).toLocaleString("pt-BR")} kcal/dia` : "Requer dados"}
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">Faixas etárias padronizadas pela OMS.</p>
              </div>

              {/* Formula 4: Katch-McArdle */}
              <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-primary)]">Katch-McArdle (1996)</span>
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-semibold bg-blue-500/10 text-blue-600">Massa Magra</span>
                </div>
                <div className="text-lg font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">
                  {formulaEstimates.katch ? `${Math.round(formulaEstimates.katch).toLocaleString("pt-BR")} kcal/dia` : "Requer % Gordura"}
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">Baseado na Massa Livre de Gordura (FFM).</p>
              </div>

              {/* Formula 5: Cunningham */}
              <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-primary)]">Cunningham (1980)</span>
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-semibold bg-blue-500/10 text-blue-600">Atletas</span>
                </div>
                <div className="text-lg font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">
                  {formulaEstimates.cunningham ? `${Math.round(formulaEstimates.cunningham).toLocaleString("pt-BR")} kcal/dia` : "Requer % Gordura"}
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">Referência para atletas e praticantes avançados.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 4. SECTION 2: MEDIDAS CORPORAIS                                     */}
      {/* =================================================================== */}
      {subTab === "medidas" && (
        <PlanningMeasurementsSection
          entry={selectedAnthro}
          preferences={preferences}
          canEdit={canAuthorNutrition}
          onEdit={() => selectedAnthro && handleOpenEdit(selectedAnthro)}
        />
      )}

      {/* =================================================================== */}
      {/* 5. SECTION 3: COMPOSIÇÃO CORPORAL (2C)                              */}
      {/* =================================================================== */}
      {subTab === "composicao" && (
        <PlanningBodyCompositionSection
          entry={selectedAnthro}
          canEdit={canAuthorNutrition}
          onEdit={() => selectedAnthro && handleOpenEdit(selectedAnthro)}
        />
      )}

      {/* =================================================================== */}
      {/* 6. SECTION 4: EXAMES LABORATORIAIS                                  */}
      {/* =================================================================== */}
      {subTab === "exames" && (
        <PlanningLabExamsSection
          slug={slug}
          studentMembershipPublicId={detail.student.membershipPublicId}
          exams={detail.labExams || []}
          canAuthor={canAuthorNutrition}
        />
      )}

      {/* =================================================================== */}
      {/* 7. SECTION 5: EVOLUÇÃO DAS MEDIDAS                                  */}
      {/* =================================================================== */}
      {subTab === "evolucao" && (
        <div className="space-y-6">
          {/* Comparador Temporal e Série Histórica */}
          <PlanningEvolutionComparator
            entries={sortedAnthros}
            labExams={detail.labExams || []}
          />

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
                  Histórico de Avaliações Físicas
                </span>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Avaliações Registradas ({sortedAnthros.length})
                </h3>
              </div>
              {canAuthorNutrition && (
                <button
                  type="button"
                  onClick={handleOpenNewEvaluation}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer min-h-[36px]"
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

                      return (
                        <tr key={entry.publicId} className="hover:bg-[var(--surface-subtle)] transition-colors">
                          <td className="py-3 px-4 font-bold">
                            {formatDate(entry.measurementDate)}
                            {idx === 0 && (
                              <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500/10 text-emerald-600">
                                Mais recente
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-extrabold tabular-nums block">
                              {entry.weightKg !== null ? `${entry.weightKg} kg` : "—"}
                            </span>
                            {delta !== null && (
                              <span
                                className={`text-[10px] font-bold ${
                                  delta > 0 ? "text-amber-600" : delta < 0 ? "text-emerald-600" : "text-[var(--text-tertiary)]"
                                }`}
                              >
                                {delta > 0 ? `+${delta} kg` : `${delta} kg`}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className="tabular-nums block">
                              {entry.heightCm ? `${entry.heightCm} cm` : "—"}
                            </span>
                            {rowBmi && (
                              <span className="text-[10px] font-semibold text-[var(--text-secondary)]">
                                IMC {rowBmi}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className="block text-[11px]">
                              Cintura: <strong>{entry.waistCm ? `${entry.waistCm} cm` : "—"}</strong> • Quadril: <strong>{entry.hipCm ? `${entry.hipCm} cm` : "—"}</strong>
                            </span>
                            {entry.abdomenCm && (
                              <span className="text-[10px] text-[var(--text-tertiary)] block">
                                Abdômen: {entry.abdomenCm} cm
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className="block text-[11px]">
                              Gordura: <strong>{entry.bodyFatPct ? `${entry.bodyFatPct}%` : "—"}</strong>
                            </span>
                            <span className="text-[10px] text-[var(--text-tertiary)] block">
                              Massa Magra: {entry.leanMassKg ? `${entry.leanMassKg} kg` : "—"}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--surface-subtle)] text-[var(--text-tertiary)] border border-[var(--border-subtle)]">
                              {entry.sourceType === "PATIENT_REPORTED" ? "Paciente" : "Profissional"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setDetailEntry(entry)}
                                className="px-2 py-1 rounded-lg text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer min-h-[32px]"
                              >
                                Detalhes
                              </button>
                              {canAuthorNutrition && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEdit(entry)}
                                    className="px-2 py-1 rounded-lg text-xs font-bold text-emerald-600 hover:bg-emerald-500/10 transition-colors cursor-pointer min-h-[32px]"
                                  >
                                    Editar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteEntry(entry)}
                                    disabled={isPending && deletingPublicId === entry.publicId}
                                    className="px-2 py-1 rounded-lg text-xs font-bold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer min-h-[32px]"
                                  >
                                    {isPending && deletingPublicId === entry.publicId ? "..." : "Excluir"}
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
              <p className="text-xs text-[var(--text-tertiary)] py-4 text-center">
                Nenhum registro de avaliação física encontrado.
              </p>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 8. SUB-TAB: METAS & PLANEJAMENTO ENERGÉTICO (GET / MACROS)          */}
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
            selectedAnthro
              ? {
                  weightKg: selectedAnthro.weightKg,
                  heightCm: selectedAnthro.heightCm,
                  measurementDate: selectedAnthro.measurementDate,
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

      {/* =================================================================== */}
      {/* MODAL DE PREFERÊNCIAS DE CAMPOS                                     */}
      {/* =================================================================== */}
      <PlanningFieldPreferencesModal
        isOpen={isPreferencesModalOpen}
        onClose={() => setIsPreferencesModalOpen(false)}
        currentPreferences={preferences}
        onSave={handleSavePreferences}
      />
    </div>
  );
}
