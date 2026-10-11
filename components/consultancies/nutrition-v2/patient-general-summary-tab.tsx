"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  PatientRecordDetail,
  UpdatePatientRecordInput,
} from "@/lib/nutrition-v2/patient-record-types";
import type { ActiveNutritionPlanSummary } from "@/lib/nutrition-v2/assignment-repository";
import type { PatientPlanDraftSummary } from "@/lib/nutrition-v2/patient-plan-lifecycle";
import type {
  PatientPlanning,
  PatientPlanningStaleStatus,
} from "@/lib/nutrition-v2/patient-planning-types";
import {
  BMR_FORMULA_METADATA,
  ACTIVITY_LEVEL_DEFINITIONS,
  GOAL_TYPE_DEFINITIONS,
} from "@/lib/nutrition-v2/patient-planning-types";
import {
  calculateAgeFromBirthDate,
  classifyBMI,
  normalizeBiologicalSex,
} from "@/lib/nutrition-v2/clinical-calculations";
import type { PatientConsultationHubSummaryDto } from "@/lib/nutrition-v2/clinical-consultation-types";
import type { PatientCheckinsHubSummaryDto } from "@/lib/nutrition-v2/checkin-types";
import { CHECKIN_ADHERENCE_LABELS } from "@/lib/nutrition-v2/checkin-types";
import type { PatientFollowupHubSummaryDto } from "@/lib/nutrition-v2/followup-types";
import { FOLLOWUP_MEAL_TYPE_LABELS } from "@/lib/nutrition-v2/followup-types";
import type { EvolutionComparisonDataDto } from "@/types/evolution";

export interface PatientGeneralSummaryTabProps {
  slug: string;
  detail: PatientRecordDetail;
  activePlan?: ActiveNutritionPlanSummary | null;
  draftPlan?: PatientPlanDraftSummary | null;
  planning?: PatientPlanning | null;
  staleStatus?: PatientPlanningStaleStatus | null;
  consultationsSummary?: PatientConsultationHubSummaryDto | null;
  checkinsSummary?: PatientCheckinsHubSummaryDto | null;
  followupSummary?: PatientFollowupHubSummaryDto | null;
  evolutionComparisonData?: EvolutionComparisonDataDto | null;
  clinicalForm?: UpdatePatientRecordInput;
  canAuthor?: boolean;
  onNavigateTab: (tab: string, subTab?: string) => void;
  onAddAnthropometry?: () => void;
  onStartEditPlan?: () => void;
  onCreatePlanFromScratch?: () => void;
  onDiscardDraft?: () => void;
  isStartingEditPlan?: boolean;
  isDiscardingDraft?: boolean;
  isCreatingScratch?: boolean;
}

function formatDate(isoStr?: string | null): string {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return isoStr;
  }
}

function formatTime(isoStr?: string | null): string {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function PatientGeneralSummaryTab({
  slug,
  detail,
  activePlan,
  draftPlan,
  planning,
  staleStatus,
  consultationsSummary,
  checkinsSummary,
  followupSummary,
  clinicalForm,
  canAuthor = true,
  onNavigateTab,
  onAddAnthropometry,
  onStartEditPlan,
  onCreatePlanFromScratch,
  onDiscardDraft,
  isStartingEditPlan = false,
  isDiscardingDraft = false,
  isCreatingScratch = false,
}: PatientGeneralSummaryTabProps) {
  // 1. Current clinical data resolution
  const form = clinicalForm || detail.record;

  // 2. Anthropometrics & trend resolution
  const sortedAnthros = useMemo(() => {
    if (!detail.anthropometrics || detail.anthropometrics.length === 0) return [];
    return [...detail.anthropometrics].sort(
      (a, b) => new Date(b.measurementDate).getTime() - new Date(a.measurementDate).getTime()
    );
  }, [detail.anthropometrics]);

  const latestAnthro = sortedAnthros[0] || null;
  const previousAnthro = sortedAnthros[1] || null;

  const currentWeightKg =
    latestAnthro?.weightKg ?? detail.onboardingReference?.reportedWeightKg ?? null;
  const currentHeightCm =
    latestAnthro?.heightCm ?? detail.onboardingReference?.reportedHeightCm ?? null;

  const previousWeightKg =
    previousAnthro?.weightKg ??
    (latestAnthro && detail.onboardingReference?.reportedWeightKg ? detail.onboardingReference.reportedWeightKg : null);
  const previousWeightDate =
    previousAnthro?.measurementDate ??
    (previousWeightKg && detail.onboardingReference?.reportedWeightKg ? "Anamnese" : null);

  const weightDelta = useMemo(() => {
    if (currentWeightKg !== null && previousWeightKg !== null && currentWeightKg !== previousWeightKg) {
      return currentWeightKg - previousWeightKg;
    }
    return null;
  }, [currentWeightKg, previousWeightKg]);

  // 3. Physiological parameters
  const ageYears = useMemo(() => {
    return calculateAgeFromBirthDate(
      detail.resolvedBirthDate || detail.record.birthDate || detail.onboardingReference?.birthDate
    );
  }, [detail.resolvedBirthDate, detail.record.birthDate, detail.onboardingReference?.birthDate]);

  const bioSex =
    detail.resolvedBiologicalSex ||
    normalizeBiologicalSex(detail.record.biologicalSex) ||
    normalizeBiologicalSex(detail.onboardingReference?.sex);
  const bioSexLabel =
    bioSex === "MALE" ? "Masculino" : bioSex === "FEMALE" ? "Feminino" : "Não informado";

  // 4. BMI calculation & classification
  const bmiValue = useMemo(() => {
    if (currentWeightKg && currentHeightCm && currentHeightCm > 0) {
      const hM = currentHeightCm / 100;
      return currentWeightKg / (hM * hM);
    }
    return null;
  }, [currentWeightKg, currentHeightCm]);

  const bmiClassification = useMemo(() => {
    return classifyBMI(bmiValue);
  }, [bmiValue]);

  // 5. Clinical calculations (TMB, GET, Goals, Macros)
  const bmrValue = planning?.bmrKcal ?? null;
  const tdeeValue = planning?.tdeeKcal ?? null;
  const bmrFormulaName = planning?.bmrFormula
    ? BMR_FORMULA_METADATA[planning.bmrFormula]?.name || planning.bmrFormula
    : null;
  const activityDef = planning?.activityLevel
    ? ACTIVITY_LEVEL_DEFINITIONS[planning.activityLevel]
    : null;
  const goalDef = planning?.goalType ? GOAL_TYPE_DEFINITIONS[planning.goalType] : null;
  const targetCalories = planning?.targetCaloriesKcal ?? null;
  const targetProtein = planning?.targetProteinG ?? null;
  const targetCarbs = planning?.targetCarbsG ?? null;
  const targetFats = planning?.targetFatsG ?? null;

  // Macro calorie and percentage calculations
  const proteinKcal = targetProtein !== null ? Math.round(targetProtein * 4) : null;
  const carbsKcal = targetCarbs !== null ? Math.round(targetCarbs * 4) : null;
  const fatsKcal = targetFats !== null ? Math.round(targetFats * 9) : null;
  const proteinPct =
    proteinKcal !== null && targetCalories && targetCalories > 0
      ? Math.round((proteinKcal / targetCalories) * 100)
      : null;
  const carbsPct =
    carbsKcal !== null && targetCalories && targetCalories > 0
      ? Math.round((carbsKcal / targetCalories) * 100)
      : null;
  const fatsPct =
    fatsKcal !== null && targetCalories && targetCalories > 0
      ? Math.round((fatsKcal / targetCalories) * 100)
      : null;

  // 6. Recent timeline events (Acompanhamento)
  const followupTimeline = followupSummary?.timeline;
  const recentTimelineEvents = useMemo(() => {
    if (!followupTimeline || followupTimeline.length === 0) return [];
    return followupTimeline.slice(0, 3);
  }, [followupTimeline]);

  // 7. Clinical summary flags
  const hasClinicalData = Boolean(
    form.diagnosedConditions ||
      detail.onboardingReference?.healthConditions ||
      form.allergies ||
      form.foodAllergiesIntolerances ||
      form.currentMedications ||
      form.supplements ||
      form.clinicalObservations ||
      form.gastrointestinalNotes ||
      consultationsSummary?.latestCompletedConsultation
  );

  const hasDietaryData = Boolean(
    form.usualEatingRoutine ||
      form.foodPreferences ||
      form.dietaryRestrictions ||
      form.dislikedFoods ||
      form.mealScheduleNotes ||
      form.appetiteNotes ||
      form.difficultiesAdherenceNotes
  );

  const hasLifestyleData = Boolean(
    form.occupation ||
      form.workStudyRoutine ||
      form.routineNotes ||
      form.physicalActivityNotes ||
      detail.onboardingReference?.physicalActivity ||
      form.sleepNotes ||
      form.sleepRoutine ||
      form.hydrationNotes ||
      form.bowelHabit ||
      form.smokingStatus ||
      form.alcoholNotes
  );

  return (
    <div className="space-y-6" data-testid="clinical-summary-dashboard">
      {/* =================================================================== */}
      {/* BLOCO A: IDENTIFICAÇÃO E STATUS DO PACIENTE (COCKPIT CLÍNICO)       */}
      {/* =================================================================== */}
      <section
        className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] p-5 md:p-6 shadow-xs depth-surface transition-all"
        aria-label="Identificação e Status do Paciente"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-5">
          <div className="flex items-start gap-4">
            <div className="w-13 h-13 rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)] flex items-center justify-center font-heading font-extrabold text-xl shrink-0 border border-[var(--brand)]/20 shadow-xs">
              {detail.student.fullName?.charAt(0)?.toUpperCase() || "P"}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl md:text-2xl font-heading font-extrabold text-[var(--text-primary)] tracking-tight">
                  {detail.student.fullName}
                </h2>
                <Badge variant="brand" size="sm">
                  Paciente Ativo
                </Badge>
                {detail.onboardingReference?.hasOnboardingData ? (
                  <Badge variant="brand" size="sm">
                    Anamnese Vinculada
                  </Badge>
                ) : (
                  <Badge variant="neutral" size="sm">
                    Anamnese Pendente
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-x-4 gap-y-1 text-xs text-[var(--text-secondary)] flex-wrap">
                <span>{detail.student.email}</span>
                {detail.student.joinedAt && (
                  <span>
                    • Vínculo desde {formatDate(detail.student.joinedAt)}
                  </span>
                )}
                {ageYears !== null && <span>• {ageYears} anos</span>}
                <span>• Sexo: {bioSexLabel}</span>
              </div>
            </div>
          </div>

          {canAuthor && (
            <div className="flex items-center gap-2.5 flex-wrap lg:justify-end">
              {draftPlan ? (
                <>
                  <Link
                    href={`/consultoria/${slug}/planos-v2/${draftPlan.planPublicId}?v=${draftPlan.versionPublicId}&studentId=${detail.student.membershipPublicId}`}
                  >
                    <Button variant="primary" size="sm" className="font-bold text-xs min-h-[40px] shadow-xs">
                      Continuar Edição do Rascunho →
                    </Button>
                  </Link>
                  {onDiscardDraft && (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isDiscardingDraft}
                      onClick={onDiscardDraft}
                      className="font-bold text-xs min-h-[40px] text-red-600 dark:text-red-400 hover:bg-red-500/10 border border-red-500/20"
                    >
                      {isDiscardingDraft ? "Descartando..." : "Descartar"}
                    </Button>
                  )}
                </>
              ) : activePlan ? (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isStartingEditPlan}
                    onClick={onStartEditPlan}
                    className="font-bold text-xs min-h-[40px] shadow-xs"
                  >
                    {isStartingEditPlan ? "Abrindo..." : "Editar Plano Ativo"}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isCreatingScratch}
                    onClick={onCreatePlanFromScratch}
                    className="font-bold text-xs min-h-[40px]"
                  >
                    {isCreatingScratch ? "Criando..." : "+ Novo Plano"}
                  </Button>
                </>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isCreatingScratch}
                  onClick={onCreatePlanFromScratch}
                  className="font-bold text-xs min-h-[40px] shadow-xs"
                >
                  {isCreatingScratch ? "Criando..." : "+ Prescrever Primeiro Plano"}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Indicadores-chave rápidos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
          <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
            <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block tracking-wider">
              Último Peso
            </span>
            <span className="font-heading font-extrabold text-[var(--text-primary)] text-base md:text-lg tabular-nums block">
              {currentWeightKg !== null ? `${currentWeightKg} kg` : "—"}
            </span>
            <span className="text-[11px] text-[var(--text-tertiary)] block truncate">
              {latestAnthro?.measurementDate ? formatDate(latestAnthro.measurementDate) : "Sem data"}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
            <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block tracking-wider">
              IMC Atual
            </span>
            <span className="font-heading font-extrabold text-[var(--text-primary)] text-base md:text-lg tabular-nums block">
              {bmiValue !== null ? `${bmiValue.toFixed(1)} kg/m²` : "—"}
            </span>
            <span className="text-[11px] text-[var(--brand)] font-semibold block truncate">
              {bmiClassification?.category || "Pendente"}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
            <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block tracking-wider">
              Plano Alimentar
            </span>
            <span className="font-heading font-extrabold text-[var(--text-primary)] text-base md:text-lg block truncate">
              {activePlan ? `V${activePlan.versionNumber}` : "Sem plano"}
            </span>
            <span className="text-[11px] text-[var(--text-secondary)] block truncate">
              {activePlan ? activePlan.versionTitle : "Nenhuma prescrição"}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
            <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block tracking-wider">
              Meta Calórica
            </span>
            <span className="font-heading font-extrabold text-[var(--text-primary)] text-base md:text-lg tabular-nums block">
              {targetCalories !== null ? `${targetCalories} kcal` : "—"}
            </span>
            <span className="text-[11px] text-[var(--text-secondary)] block truncate">
              {goalDef?.label || "Pendente de cálculo"}
            </span>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* GRID PRINCIPAL DE CARDS CLÍNICOS CONSOLIDADOS (3 COLUNAS EM DESKTOP) */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* ================================================================= */}
        {/* COLUNA 1: CLÍNICA & HÁBITOS                                       */}
        {/* ================================================================= */}
        <div className="space-y-6">
          {/* BLOCO B: RESUMO CLÍNICO */}
          <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] p-5 space-y-4 shadow-2xs depth-surface">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="font-heading font-bold text-base text-[var(--text-primary)]">
                  Resumo Clínico
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab("clinico", "clinico")}
                className="text-xs font-bold text-[var(--brand)] hover:underline cursor-pointer min-h-[36px] flex items-center"
              >
                Ver Prontuário →
              </button>
            </div>

            {hasClinicalData ? (
              <div className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
                    Condições & Diagnósticos
                  </span>
                  <p className="font-medium text-[var(--text-primary)] leading-relaxed">
                    {form.diagnosedConditions || detail.onboardingReference?.healthConditions || "Nenhuma condição patológica registrada."}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
                    Alergias & Intolerâncias
                  </span>
                  {form.allergies || form.foodAllergiesIntolerances ? (
                    <div className="p-2.5 rounded-lg bg-red-500/5 border border-red-500/20 text-red-700 dark:text-red-300 font-semibold space-y-1">
                      {form.allergies && <p>Alergias: {form.allergies}</p>}
                      {form.foodAllergiesIntolerances && <p>Intolerâncias: {form.foodAllergiesIntolerances}</p>}
                    </div>
                  ) : (
                    <p className="text-[var(--text-secondary)]">Nenhuma alergia ou intolerância alimentar registrada.</p>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
                    Medicamentos & Suplementos
                  </span>
                  <p className="font-medium text-[var(--text-primary)] leading-relaxed">
                    {form.currentMedications
                      ? `Uso contínuo: ${form.currentMedications}`
                      : "Sem medicamentos de uso contínuo."}
                    {form.supplements && ` • Suplementos: ${form.supplements}`}
                  </p>
                </div>

                {form.gastrointestinalNotes && (
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
                      Sintomas Digestivos
                    </span>
                    <p className="text-[var(--text-secondary)] leading-relaxed">
                      {form.gastrointestinalNotes}
                    </p>
                  </div>
                )}

                {form.clinicalObservations && (
                  <div className="space-y-1 pt-1 border-t border-[var(--border-subtle)]">
                    <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
                      Observações Relevantes
                    </span>
                    <p className="text-[var(--text-secondary)] leading-relaxed line-clamp-3">
                      {form.clinicalObservations}
                    </p>
                  </div>
                )}

                <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-secondary)] flex-wrap gap-2">
                  <span>
                    Última Consulta:{" "}
                    <strong className="text-[var(--text-primary)]">
                      {consultationsSummary?.latestCompletedConsultation?.formattedDate || "Nenhuma"}
                    </strong>
                  </span>
                  <span>
                    Retorno:{" "}
                    <strong className="text-[var(--text-primary)]">
                      {consultationsSummary?.recommendedReturnFormatted || "Não definido"}
                    </strong>
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center space-y-2">
                <p className="text-xs text-[var(--text-tertiary)]">
                  Nenhuma informação clínica registrada ainda.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigateTab("clinico", "clinico")}
                  className="text-xs font-bold text-[var(--brand)] hover:underline cursor-pointer"
                >
                  + Preencher Histórico Clínico
                </button>
              </div>
            )}
          </section>

          {/* BLOCO C: HISTÓRICO ALIMENTAR */}
          <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] p-5 space-y-4 shadow-2xs depth-surface">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="font-heading font-bold text-base text-[var(--text-primary)]">
                  Histórico Alimentar
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab("alimentar", "alimentar")}
                className="text-xs font-bold text-[var(--brand)] hover:underline cursor-pointer min-h-[36px] flex items-center"
              >
                Ver Detalhes →
              </button>
            </div>

            {hasDietaryData ? (
              <div className="space-y-3 text-xs">
                {form.usualEatingRoutine && (
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
                      Padrão & Rotina Alimentar
                    </span>
                    <p className="font-medium text-[var(--text-primary)] leading-relaxed line-clamp-3">
                      {form.usualEatingRoutine}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
                      Preferências
                    </span>
                    <p className="font-medium text-[var(--text-primary)] line-clamp-2">
                      {form.foodPreferences || "Não informadas"}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
                      Rejeições / Aversões
                    </span>
                    <p className="font-medium text-[var(--text-primary)] line-clamp-2">
                      {form.dislikedFoods || "Nenhuma registrada"}
                    </p>
                  </div>
                </div>

                {form.dietaryRestrictions && (
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
                      Restrições Alimentares
                    </span>
                    <p className="text-[var(--text-secondary)] font-medium">
                      {form.dietaryRestrictions}
                    </p>
                  </div>
                )}

                {form.difficultiesAdherenceNotes && (
                  <div className="space-y-1 pt-1 border-t border-[var(--border-subtle)]">
                    <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
                      Dificuldades de Adesão
                    </span>
                    <p className="text-[var(--text-secondary)] line-clamp-2">
                      {form.difficultiesAdherenceNotes}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center space-y-2">
                <p className="text-xs text-[var(--text-tertiary)]">
                  Nenhum histórico alimentar registrado ainda.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigateTab("alimentar", "alimentar")}
                  className="text-xs font-bold text-[var(--brand)] hover:underline cursor-pointer"
                >
                  + Registrar Hábitos Alimentares
                </button>
              </div>
            )}
          </section>

          {/* BLOCO D: ESTILO DE VIDA */}
          <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] p-5 space-y-4 shadow-2xs depth-surface">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-heading font-bold text-base text-[var(--text-primary)]">
                  Estilo de Vida
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab("estilo_vida", "estilo_vida")}
                className="text-xs font-bold text-[var(--brand)] hover:underline cursor-pointer min-h-[36px] flex items-center"
              >
                Ver Detalhes →
              </button>
            </div>

            {hasLifestyleData ? (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
                      Profissão / Ocupação
                    </span>
                    <span className="font-semibold text-[var(--text-primary)] block truncate">
                      {form.occupation || "Não informada"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
                      Atividade Física
                    </span>
                    <span className="font-semibold text-[var(--text-primary)] block truncate">
                      {form.physicalActivityNotes || detail.onboardingReference?.physicalActivity || "Não informada"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
                      Sono
                    </span>
                    <span className="font-medium text-[var(--text-primary)] block truncate">
                      {form.sleepNotes || form.sleepRoutine || "Não informado"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
                      Hidratação
                    </span>
                    <span className="font-medium text-[var(--text-primary)] block truncate">
                      {form.hydrationNotes || "Não informada"}
                    </span>
                  </div>
                </div>

                {form.bowelHabit && (
                  <div className="p-2.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
                      Hábito Intestinal
                    </span>
                    <span className="font-medium text-[var(--text-primary)] block">
                      {form.bowelHabit}
                    </span>
                  </div>
                )}

                {(form.smokingStatus || form.alcoholNotes) && (
                  <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] text-[var(--text-secondary)] flex-wrap gap-2">
                    {form.smokingStatus && <span>Fumo: <strong className="text-[var(--text-primary)]">{form.smokingStatus}</strong></span>}
                    {form.alcoholNotes && <span>Álcool: <strong className="text-[var(--text-primary)]">{form.alcoholNotes}</strong></span>}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center space-y-2">
                <p className="text-xs text-[var(--text-tertiary)]">
                  Nenhuma informação de estilo de vida registrada ainda.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigateTab("estilo_vida", "estilo_vida")}
                  className="text-xs font-bold text-[var(--brand)] hover:underline cursor-pointer"
                >
                  + Registrar Estilo de Vida
                </button>
              </div>
            )}
          </section>
        </div>

        {/* ================================================================= */}
        {/* COLUNA 2: ANTROPOMETRIA & CÁLCULOS CLÍNICOS                       */}
        {/* ================================================================= */}
        <div className="space-y-6">
          {/* BLOCO E: ANTROPOMETRIA */}
          <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] p-5 space-y-4 shadow-2xs depth-surface">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                  </svg>
                </div>
                <h3 className="font-heading font-bold text-base text-[var(--text-primary)]">
                  Antropometria
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {onAddAnthropometry && (
                  <button
                    type="button"
                    onClick={onAddAnthropometry}
                    className="text-xs font-bold text-[var(--brand)] hover:underline cursor-pointer min-h-[36px] flex items-center"
                  >
                    + Medição
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onNavigateTab("antropometria", "evolucao")}
                  className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer min-h-[36px] flex items-center"
                >
                  Histórico →
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
                  Peso Atual
                </span>
                <span className="font-heading font-extrabold text-[var(--text-primary)] text-lg tabular-nums block">
                  {currentWeightKg !== null ? `${currentWeightKg} kg` : "—"}
                </span>
                <span className="text-[11px] text-[var(--text-tertiary)] block">
                  {latestAnthro?.measurementDate ? formatDate(latestAnthro.measurementDate) : "Sem registro"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
                  Estatura
                </span>
                <span className="font-heading font-extrabold text-[var(--text-primary)] text-lg tabular-nums block">
                  {currentHeightCm !== null ? `${currentHeightCm} cm` : "—"}
                </span>
                <span className="text-[11px] text-[var(--text-tertiary)] block">
                  {currentHeightCm ? `${(currentHeightCm / 100).toFixed(2)} m` : "Não informada"}
                </span>
              </div>
            </div>

            {/* Variação de peso recente & Tendência */}
            <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">
                  Variação Recente de Peso
                </span>
                {weightDelta !== null ? (
                  <div className="flex items-center gap-1.5 font-heading font-extrabold tabular-nums">
                    {weightDelta > 0 ? (
                      <span className="text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                        ↗ +{weightDelta.toFixed(1)} kg
                      </span>
                    ) : weightDelta < 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                        ↘ {weightDelta.toFixed(1)} kg
                      </span>
                    ) : (
                      <span className="text-[var(--text-secondary)]">→ 0.0 kg</span>
                    )}
                  </div>
                ) : (
                  <span className="text-[11px] text-[var(--text-tertiary)]">Primeira medição</span>
                )}
              </div>

              {previousWeightKg !== null && (
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Peso anterior de referência: <strong>{previousWeightKg} kg</strong>{" "}
                  {previousWeightDate && `(${previousWeightDate === "Anamnese" ? "Anamnese" : formatDate(previousWeightDate)})`}
                </p>
              )}
            </div>

            {/* Circunferências rápidas se disponíveis */}
            {latestAnthro && (latestAnthro.waistCm || latestAnthro.hipCm || latestAnthro.armCm) && (
              <div className="pt-2 border-t border-[var(--border-subtle)] grid grid-cols-3 gap-2 text-center text-xs">
                {latestAnthro.waistCm && (
                  <div className="p-2 rounded-lg bg-[var(--surface-subtle)]">
                    <span className="text-[10px] text-[var(--text-tertiary)] block">Cintura</span>
                    <strong className="text-[var(--text-primary)]">{latestAnthro.waistCm} cm</strong>
                  </div>
                )}
                {latestAnthro.hipCm && (
                  <div className="p-2 rounded-lg bg-[var(--surface-subtle)]">
                    <span className="text-[10px] text-[var(--text-tertiary)] block">Quadril</span>
                    <strong className="text-[var(--text-primary)]">{latestAnthro.hipCm} cm</strong>
                  </div>
                )}
                {latestAnthro.armCm && (
                  <div className="p-2 rounded-lg bg-[var(--surface-subtle)]">
                    <span className="text-[10px] text-[var(--text-tertiary)] block">Braço</span>
                    <strong className="text-[var(--text-primary)]">{latestAnthro.armCm} cm</strong>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* BLOCO F: CÁLCULOS CLÍNICOS (IMC + TMB + GET/TDEE + MACROS) */}
          <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] p-5 space-y-4 shadow-2xs depth-surface">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-[var(--text-primary)]">
                    Cálculos Clínicos & Metas
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab("planejamento", "planejamento")}
                className="text-xs font-bold text-[var(--brand)] hover:underline cursor-pointer min-h-[36px] flex items-center"
              >
                Ajustar no Planejamento →
              </button>
            </div>

            {/* Aviso de Parâmetros Desatualizados (Stale status) */}
            {staleStatus?.isStale && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2">
                <span className="shrink-0 text-amber-600 font-bold">⚠️</span>
                <div>
                  <strong className="block font-semibold">Cálculo desatualizado</strong>
                  <span>Novos dados antropométricos registrados após o último planejamento. Recomenda-se recalcular.</span>
                </div>
              </div>
            )}

            {/* Métricas Principais: IMC, TMB, GET/TDEE */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {/* IMC */}
              <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
                  IMC (WHO)
                </span>
                <span className="font-heading font-extrabold text-[var(--text-primary)] text-base tabular-nums block">
                  {bmiValue !== null ? `${bmiValue.toFixed(1)}` : "—"}
                </span>
                <span className="text-[10px] font-semibold text-[var(--text-secondary)] block truncate">
                  {bmiClassification?.category || "Não calculado"}
                </span>
              </div>

              {/* TMB */}
              <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
                  TMB (Basal)
                </span>
                <span className="font-heading font-extrabold text-[var(--text-primary)] text-base tabular-nums block">
                  {bmrValue !== null ? `${Math.round(bmrValue)} kcal` : "TMB não calculada"}
                </span>
                <span className="text-[10px] text-[var(--text-tertiary)] block truncate">
                  {bmrFormulaName || "Fórmula pendente"}
                </span>
              </div>

              {/* GET / TDEE */}
              <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
                  GET (Total)
                </span>
                <span className="font-heading font-extrabold text-[var(--text-primary)] text-base tabular-nums block">
                  {tdeeValue !== null ? `${Math.round(tdeeValue)} kcal` : "GET não calculado"}
                </span>
                <span className="text-[10px] text-[var(--text-tertiary)] block truncate">
                  {activityDef ? `×${activityDef.factor} (${activityDef.label})` : "Fator não definido"}
                </span>
              </div>
            </div>

            {/* Meta Calórica Oficial & Objetivo */}
            <div className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-2">
              <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
                    Meta Calórica Oficial
                  </span>
                  <span className="font-heading font-extrabold text-[var(--text-primary)] text-lg tabular-nums">
                    {targetCalories !== null ? `${targetCalories} kcal/dia` : "Meta calórica não definida"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
                    Objetivo
                  </span>
                  <span className="font-bold text-[var(--brand)] text-xs">
                    {goalDef?.label || "Não definido"}
                  </span>
                </div>
              </div>

              {planning?.calorieAdjustmentKcal !== null && planning?.calorieAdjustmentKcal !== undefined && (
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Ajuste metabólico aplicado:{" "}
                  <strong>
                    {planning.calorieAdjustmentKcal > 0 ? `+${planning.calorieAdjustmentKcal}` : planning.calorieAdjustmentKcal} kcal
                  </strong>{" "}
                  em relação ao GET.
                </p>
              )}
            </div>

            {/* Distribuição de Macronutrientes */}
            <div className="space-y-2 pt-1 border-t border-[var(--border-subtle)]">
              <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
                Distribuição de Macronutrientes
              </span>

              {targetProtein !== null || targetCarbs !== null || targetFats !== null ? (
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 block">
                      Proteína
                    </span>
                    <strong className="text-[var(--text-primary)] font-extrabold tabular-nums block">
                      {targetProtein !== null ? `${targetProtein} g` : "—"}
                    </strong>
                    <span className="text-[10px] text-[var(--text-tertiary)] block">
                      {proteinPct !== null ? `${proteinPct}%` : "—"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 block">
                      Carboidrato
                    </span>
                    <strong className="text-[var(--text-primary)] font-extrabold tabular-nums block">
                      {targetCarbs !== null ? `${targetCarbs} g` : "—"}
                    </strong>
                    <span className="text-[10px] text-[var(--text-tertiary)] block">
                      {carbsPct !== null ? `${carbsPct}%` : "—"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 block">
                      Gordura
                    </span>
                    <strong className="text-[var(--text-primary)] font-extrabold tabular-nums block">
                      {targetFats !== null ? `${targetFats} g` : "—"}
                    </strong>
                    <span className="text-[10px] text-[var(--text-tertiary)] block">
                      {fatsPct !== null ? `${fatsPct}%` : "—"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-2 text-center">
                  <p className="text-xs text-[var(--text-tertiary)]">
                    Metas de macronutrientes ainda não definidas no planejamento.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* BLOCO H: PLANEJAMENTO NUTRICIONAL */}
          <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] p-5 space-y-4 shadow-2xs depth-surface">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <h3 className="font-heading font-bold text-base text-[var(--text-primary)]">
                  Planejamento Nutricional
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab("planejamento", "planejamento")}
                className="text-xs font-bold text-[var(--brand)] hover:underline cursor-pointer min-h-[36px] flex items-center"
              >
                Abrir Planejamento →
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">Status do Planejamento</span>
                <Badge variant={planning?.targetCaloriesKcal ? (staleStatus?.isStale ? "warning" : "success") : "neutral"}>
                  {planning?.targetCaloriesKcal
                    ? staleStatus?.isStale
                      ? "Revisão Necessária"
                      : "Definido & Atualizado"
                    : "Pendente"}
                </Badge>
              </div>

              {/* Comparativo Meta vs Plano Ativo */}
              {activePlan && targetCalories && (
                <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
                    Comparativo Meta vs Prescrição Vigente
                  </span>
                  <div className="flex items-center justify-between text-xs">
                    <span>Meta planejada: <strong>{targetCalories} kcal</strong></span>
                    <span>Plano ativo: <strong>{activePlan.totals.caloriesKcal} kcal</strong></span>
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)]">
                    Diferença da prescrição:{" "}
                    <strong className={Math.abs((activePlan.totals.caloriesKcal || 0) - targetCalories) <= 100 ? "text-emerald-600" : "text-amber-600"}>
                      {(activePlan.totals.caloriesKcal || 0) - targetCalories > 0 ? "+" : ""}
                      {(activePlan.totals.caloriesKcal || 0) - targetCalories} kcal
                    </strong>
                  </div>
                </div>
              )}

              {planning?.clinicalNotes && (
                <div className="space-y-1 pt-1 border-t border-[var(--border-subtle)]">
                  <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
                    Diretrizes do Planejamento
                  </span>
                  <p className="text-[var(--text-secondary)] leading-relaxed line-clamp-3">
                    {planning.clinicalNotes}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ================================================================= */}
        {/* COLUNA 3: PLANO ATIVO & ACOMPANHAMENTO RECENTE                    */}
        {/* ================================================================= */}
        <div className="space-y-6">
          {/* BLOCO G: PLANO ALIMENTAR ATIVO */}
          <section className="rounded-2xl border border-[var(--brand)]/30 bg-[var(--surface)] p-5 space-y-4 shadow-2xs depth-surface">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--brand-soft)] text-[var(--brand)] flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v2m0 0a4.5 4.5 0 014.5 4.5c0 3-2 6-4.5 8.5C9.5 17 7.5 14 7.5 11a4.5 4.5 0 014.5-4.5zm0-2c1.5-1 3-.5 3-.5" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-[var(--text-primary)]">
                    Plano Alimentar Ativo
                  </h3>
                </div>
              </div>
              {activePlan ? (
                <Badge variant="brand" size="sm">
                  Ativo V{activePlan.versionNumber}
                </Badge>
              ) : (
                <Badge variant="neutral" size="sm">
                  Sem plano
                </Badge>
              )}
            </div>

            {activePlan ? (
              <div className="space-y-3.5 text-xs">
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">
                    {activePlan.versionTitle}
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    {activePlan.prescriberName && <>Prescrito por <strong>{activePlan.prescriberName}</strong> • </>}
                    Início: {formatDate(activePlan.startsOn)}
                  </p>
                </div>

                {/* Totais do Plano */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                    <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">Calorias</span>
                    <strong className="text-sm font-extrabold text-[var(--text-primary)] tabular-nums block">
                      {activePlan.totals.caloriesKcal ? `${activePlan.totals.caloriesKcal} kcal` : "—"}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                    <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">Refeições</span>
                    <strong className="text-sm font-extrabold text-[var(--text-primary)] block">
                      {activePlan.mealsCount} {activePlan.mealsCount === 1 ? "refeição" : "refeições"}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                    <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">Proteínas</span>
                    <strong className="text-sm font-extrabold text-[var(--text-primary)] tabular-nums block">
                      {activePlan.totals.proteinG ? `${activePlan.totals.proteinG} g` : "—"}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                    <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">Carboidratos</span>
                    <strong className="text-sm font-extrabold text-[var(--text-primary)] tabular-nums block">
                      {activePlan.totals.carbohydrateG ? `${activePlan.totals.carbohydrateG} g` : "—"}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] col-span-2 sm:col-span-1">
                    <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">Gorduras</span>
                    <strong className="text-sm font-extrabold text-[var(--text-primary)] tabular-nums block">
                      {activePlan.totals.fatG ? `${activePlan.totals.fatG} g` : "—"}
                    </strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => onNavigateTab("plano")}
                    className="font-bold text-[var(--brand)] hover:underline cursor-pointer min-h-[36px] flex items-center"
                  >
                    Ver todas as {activePlan.mealsCount} refeições →
                  </button>
                  {onStartEditPlan && (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isStartingEditPlan}
                      onClick={onStartEditPlan}
                      className="font-bold text-xs min-h-[36px]"
                    >
                      Editar Plano
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-6 text-center space-y-3">
                <p className="text-xs text-[var(--text-tertiary)]">
                  Nenhum plano alimentar prescrito para este paciente no momento.
                </p>
                {onCreatePlanFromScratch && (
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isCreatingScratch}
                    onClick={onCreatePlanFromScratch}
                    className="font-bold text-xs min-h-[40px]"
                  >
                    {isCreatingScratch ? "Criando..." : "+ Prescrever Primeiro Plano"}
                  </Button>
                )}
              </div>
            )}
          </section>

          {/* BLOCO I: ACOMPANHAMENTO, CONSULTAS E CHECK-INS */}
          <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] p-5 space-y-4 shadow-2xs depth-surface">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="font-heading font-bold text-base text-[var(--text-primary)]">
                  Acompanhamento & Retornos
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab("checkins")}
                className="text-xs font-bold text-[var(--brand)] hover:underline cursor-pointer min-h-[36px] flex items-center"
              >
                Abrir Linha do Tempo →
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Status de Check-ins Operacionais */}
              <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)]">
                    Último Check-in
                  </span>
                  {checkinsSummary?.latestCompletedCheckin ? (
                    <Badge variant="brand" size="sm">
                      {CHECKIN_ADHERENCE_LABELS[checkinsSummary.latestCompletedCheckin.adherence] || "Respondido"}
                    </Badge>
                  ) : (
                    <Badge variant="neutral" size="sm">
                      Sem respostas
                    </Badge>
                  )}
                </div>

                {checkinsSummary?.latestCompletedCheckin ? (
                  <div className="space-y-1">
                    <p className="text-[var(--text-secondary)]">
                      Enviado em{" "}
                      <strong className="text-[var(--text-primary)]">
                        {formatDate(checkinsSummary.latestCompletedCheckin.submittedAt)}
                      </strong>
                      {checkinsSummary.latestCompletedCheckin.selfReportedWeightKg && (
                        <span> • Peso relatado: <strong>{checkinsSummary.latestCompletedCheckin.selfReportedWeightKg} kg</strong></span>
                      )}
                    </p>
                    {checkinsSummary.latestCompletedCheckin.studentNotes && (
                      <p className="text-[11px] text-[var(--text-secondary)] italic line-clamp-2">
                        &ldquo;{checkinsSummary.latestCompletedCheckin.studentNotes}&rdquo;
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-[var(--text-tertiary)]">
                    Nenhum check-in respondido pelo paciente ainda.
                  </p>
                )}
              </div>

              {/* Status de Solicitações Pendentes */}
              {checkinsSummary?.pendingRequest && (
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-200 text-xs flex items-center justify-between">
                  <div>
                    <strong className="block font-semibold">Solicitação de Check-in Ativa</strong>
                    <span className="text-[11px]">
                      Aguardando preenchimento pelo aluno
                      {checkinsSummary.pendingRequest.dueAt && ` (Vence: ${formatDate(checkinsSummary.pendingRequest.dueAt)})`}
                    </span>
                  </div>
                  <Badge variant="brand" size="sm">
                    Pendente
                  </Badge>
                </div>
              )}

              {/* Últimos eventos de acompanhamento (Fotos / Notas) */}
              {recentTimelineEvents.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
                  <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] block">
                    Últimas Atividades Registradas
                  </span>
                  <div className="space-y-2">
                    {recentTimelineEvents.map((event) => {
                      if (event.type === "FOOD_PHOTO" && event.payload.kind === "FOOD_PHOTO") {
                        const mealLabel =
                          event.payload.data.mealType &&
                          FOLLOWUP_MEAL_TYPE_LABELS[event.payload.data.mealType]
                            ? FOLLOWUP_MEAL_TYPE_LABELS[event.payload.data.mealType]
                            : "Refeição";
                        return (
                          <div
                            key={event.id}
                            className="p-2.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-base shrink-0">📷</span>
                              <div className="min-w-0">
                                <strong className="text-[var(--text-primary)] block truncate">
                                  Foto: {mealLabel}
                                </strong>
                                <span className="text-[10px] text-[var(--text-tertiary)] block">
                                  {formatDate(event.occurredAt)} às {formatTime(event.occurredAt)}
                                </span>
                              </div>
                            </div>
                            {event.payload.data.caption && (
                              <span className="text-[10px] text-[var(--text-secondary)] truncate max-w-[120px]">
                                {event.payload.data.caption}
                              </span>
                            )}
                          </div>
                        );
                      }

                      if (event.type === "PATIENT_NOTE" && event.payload.kind === "PATIENT_NOTE") {
                        return (
                          <div
                            key={event.id}
                            className="p-2.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                                <span>📝</span> Nota do Aluno
                              </span>
                              <span className="text-[10px] text-[var(--text-tertiary)]">
                                {formatDate(event.occurredAt)}
                              </span>
                            </div>
                            <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2">
                              {event.payload.data.text}
                            </p>
                          </div>
                        );
                      }

                      return null;
                    })}
                  </div>
                </div>
              )}

              {/* Botões de navegação rápida */}
              <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => onNavigateTab("consultas")}
                  className="font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer min-h-[36px] flex items-center"
                >
                  Consultas ({consultationsSummary?.totalCompletedConsultations || 0}) →
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab("checkins")}
                  className="font-bold text-[var(--brand)] hover:underline cursor-pointer min-h-[36px] flex items-center"
                >
                  Acompanhamento →
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
