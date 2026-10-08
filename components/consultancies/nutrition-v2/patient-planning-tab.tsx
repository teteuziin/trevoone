"use client";

import React, { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  PatientPlanning,
  PatientPlanningStaleStatus,
  BmrFormulaCode,
  ActivityLevelCode,
  GoalTypeCode,
  TargetCalorieSource,
} from "@/lib/nutrition-v2/patient-planning-types";
import {
  BMR_FORMULAS,
  BMR_FORMULA_METADATA,
  ACTIVITY_LEVEL_DEFINITIONS,
  GOAL_TYPE_DEFINITIONS,
} from "@/lib/nutrition-v2/patient-planning-types";

import {
  classifyBMI,
  calculateMifflinStJeor,
  calculateHarrisBenedictRevised,
  calculateAgeFromBirthDate,
  normalizeBiologicalSex,
  calculateTDEE,
  calculateTargetCalories,
  calculateMacroCalories,
  calculateMacroPercentage,
} from "@/lib/nutrition-v2/clinical-calculations";
import type { ActiveNutritionPlanSummary } from "@/lib/nutrition-v2/assignment-repository";
import type { PatientPlanDraftSummary } from "@/lib/nutrition-v2/patient-plan-lifecycle";
import { savePatientPlanningAction } from "@/app/consultoria/[slug]/planos-v2/planning-actions";

export interface PatientPlanningTabProps {
  slug: string;
  studentPublicId: string;
  studentMembershipPublicId: string;
  patientRecordId?: number | null;
  initialPlanning: PatientPlanning | null;
  initialStaleStatus: PatientPlanningStaleStatus | null;
  latestAnthro?: {
    weightKg: number | null;
    heightCm: number | null;
    measurementDate: string;
  } | null;
  onboardingRef?: {
    reportedWeightKg: number | null;
    reportedHeightCm: number | null;
    birthDate: string | null;
    sex: string | null;
  } | null;
  activePlan?: ActiveNutritionPlanSummary | null;
  draftPlan?: PatientPlanDraftSummary | null;
  canAuthor?: boolean;
  onStartEditPlan?: () => void;
  isStartingEditPlan?: boolean;
}

export function PatientPlanningTab({
  slug,
  studentPublicId,
  studentMembershipPublicId,
  patientRecordId,
  initialPlanning,
  initialStaleStatus,
  latestAnthro,
  onboardingRef,
  activePlan,
  draftPlan,
  canAuthor = true,
  onStartEditPlan,
  isStartingEditPlan = false,
}: PatientPlanningTabProps) {
  const [planning, setPlanning] = useState<PatientPlanning | null>(initialPlanning);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // 1. Current clinical data resolution
  const currentWeightKg = latestAnthro?.weightKg ?? onboardingRef?.reportedWeightKg ?? null;
  const currentHeightCm = latestAnthro?.heightCm ?? onboardingRef?.reportedHeightCm ?? null;
  const currentAgeYears = calculateAgeFromBirthDate(onboardingRef?.birthDate);
  const currentBiologicalSex = normalizeBiologicalSex(onboardingRef?.sex);

  // BMI of current data
  const currentBMI = useMemo(() => {
    if (!currentWeightKg || !currentHeightCm || currentWeightKg <= 0 || currentHeightCm <= 0) return null;
    const hM = currentHeightCm / 100;
    return Number((currentWeightKg / (hM * hM)).toFixed(1));
  }, [currentWeightKg, currentHeightCm]);

  const bmiClassification = useMemo(() => classifyBMI(currentBMI), [currentBMI]);

  // Form states for planning
  const [bmrFormula, setBmrFormula] = useState<BmrFormulaCode>(
    planning?.bmrFormula || BMR_FORMULAS.MIFFLIN_ST_JEOR_V1
  );
  const [activityLevel, setActivityLevel] = useState<ActivityLevelCode | "">(
    planning?.activityLevel || ""
  );
  const [goalType, setGoalType] = useState<GoalTypeCode | "">(
    planning?.goalType || ""
  );
  const [calorieAdjustment, setCalorieAdjustment] = useState<string>(
    planning?.calorieAdjustmentKcal !== null && planning?.calorieAdjustmentKcal !== undefined
      ? String(planning.calorieAdjustmentKcal)
      : ""
  );
  const [manualCalorieTarget, setManualCalorieTarget] = useState<string>(
    planning?.targetCaloriesSource === "MANUAL" && planning?.targetCaloriesKcal !== null && planning?.targetCaloriesKcal !== undefined
      ? String(planning.targetCaloriesKcal)
      : ""
  );
  const [isManualOverride, setIsManualOverride] = useState<boolean>(
    planning?.targetCaloriesSource === "MANUAL"
  );

  // Macros
  const [proteinG, setProteinG] = useState<string>(
    planning?.targetProteinG !== null && planning?.targetProteinG !== undefined ? String(planning.targetProteinG) : ""
  );
  const [carbsG, setCarbsG] = useState<string>(
    planning?.targetCarbsG !== null && planning?.targetCarbsG !== undefined ? String(planning.targetCarbsG) : ""
  );
  const [fatsG, setFatsG] = useState<string>(
    planning?.targetFatsG !== null && planning?.targetFatsG !== undefined ? String(planning.targetFatsG) : ""
  );

  const [clinicalNotes, setClinicalNotes] = useState<string>(
    planning?.clinicalNotes || ""
  );

  // Recalculate trigger flag (when user explicitly clicks [Recalcular])
  const [forcedRecalcSnapshot, setForcedRecalcSnapshot] = useState(false);

  // Dynamic calculations based on current inputs and selections
  const computedBMR = useMemo(() => {
    if (!currentWeightKg || !currentHeightCm || currentAgeYears === null || !currentBiologicalSex) {
      return null;
    }
    if (bmrFormula === BMR_FORMULAS.HARRIS_BENEDICT_REVISED_1984_V1) {
      return calculateHarrisBenedictRevised(currentWeightKg, currentHeightCm, currentAgeYears, currentBiologicalSex);
    }
    return calculateMifflinStJeor(currentWeightKg, currentHeightCm, currentAgeYears, currentBiologicalSex);
  }, [currentWeightKg, currentHeightCm, currentAgeYears, currentBiologicalSex, bmrFormula]);

  const selectedActivityFactor = useMemo(() => {
    if (!activityLevel) return null;
    return ACTIVITY_LEVEL_DEFINITIONS[activityLevel]?.factor ?? null;
  }, [activityLevel]);

  const computedTDEE = useMemo(() => {
    return calculateTDEE(computedBMR, selectedActivityFactor);
  }, [computedBMR, selectedActivityFactor]);

  const parsedAdjustment = useMemo(() => {
    if (goalType === "MAINTENANCE") return 0;
    const v = parseFloat(calorieAdjustment);
    return isNaN(v) ? null : v;
  }, [goalType, calorieAdjustment]);

  const computedCalculatedTarget = useMemo(() => {
    return calculateTargetCalories(computedTDEE, parsedAdjustment, goalType || null);
  }, [computedTDEE, parsedAdjustment, goalType]);

  const parsedManualTarget = useMemo(() => {
    const v = parseFloat(manualCalorieTarget);
    return isNaN(v) || v <= 0 ? null : v;
  }, [manualCalorieTarget]);

  // Final Target Calories official
  const effectiveTargetCalories = useMemo(() => {
    if (isManualOverride && parsedManualTarget !== null) {
      return parsedManualTarget;
    }
    return computedCalculatedTarget;
  }, [isManualOverride, parsedManualTarget, computedCalculatedTarget]);

  const effectiveTargetSource: TargetCalorieSource | null = useMemo(() => {
    if (isManualOverride && parsedManualTarget !== null) return "MANUAL";
    if (computedCalculatedTarget !== null) return "CALCULATED";
    return null;
  }, [isManualOverride, parsedManualTarget, computedCalculatedTarget]);

  // Helper to format ISO measurement date to PT-BR (DD/MM/AAAA)
  const formatMeasurementDate = (dateStr?: string | null): string | null => {
    if (!dateStr) return null;
    const trimmed = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      const [y, m, d] = trimmed.slice(0, 10).split("-");
      return `${d}/${m}/${y}`;
    }
    return trimmed;
  };

  // Macros calculations: empty inputs strictly evaluate to null (UNKNOWN != ZERO)
  const parsedProteinG = useMemo(() => {
    if (!proteinG || proteinG.trim() === "") return null;
    const v = parseFloat(proteinG);
    return isNaN(v) || v < 0 ? null : v;
  }, [proteinG]);

  const parsedCarbsG = useMemo(() => {
    if (!carbsG || carbsG.trim() === "") return null;
    const v = parseFloat(carbsG);
    return isNaN(v) || v < 0 ? null : v;
  }, [carbsG]);

  const parsedFatsG = useMemo(() => {
    if (!fatsG || fatsG.trim() === "") return null;
    const v = parseFloat(fatsG);
    return isNaN(v) || v < 0 ? null : v;
  }, [fatsG]);

  const macroTotals = useMemo(() => {
    return calculateMacroCalories(parsedProteinG, parsedCarbsG, parsedFatsG);
  }, [parsedProteinG, parsedCarbsG, parsedFatsG]);

  const proteinPct = useMemo(() => {
    return calculateMacroPercentage(macroTotals.proteinKcal, effectiveTargetCalories);
  }, [macroTotals.proteinKcal, effectiveTargetCalories]);

  const carbsPct = useMemo(() => {
    return calculateMacroPercentage(macroTotals.carbsKcal, effectiveTargetCalories);
  }, [macroTotals.carbsKcal, effectiveTargetCalories]);

  const fatsPct = useMemo(() => {
    return calculateMacroPercentage(macroTotals.fatsKcal, effectiveTargetCalories);
  }, [macroTotals.fatsKcal, effectiveTargetCalories]);

  // Stale status check
  const staleStatus = useMemo(() => {
    if (forcedRecalcSnapshot) {
      return { isStale: false, reasons: [], currentInputs: null, snapshotInputs: null };
    }
    return initialStaleStatus || { isStale: false, reasons: [], currentInputs: null, snapshotInputs: null };
  }, [initialStaleStatus, forcedRecalcSnapshot]);

  // Missing data indicators
  const missingInputs = useMemo(() => {
    const list: string[] = [];
    if (!currentWeightKg) list.push("Peso corporal");
    if (!currentHeightCm) list.push("Altura");
    if (currentAgeYears === null) list.push("Data de nascimento / Idade");
    if (!currentBiologicalSex) list.push("Sexo biológico");
    return list;
  }, [currentWeightKg, currentHeightCm, currentAgeYears, currentBiologicalSex]);

  // Goal selection handler
  const handleSelectGoal = (type: GoalTypeCode) => {
    setGoalType(type);
    const def = GOAL_TYPE_DEFINITIONS[type];
    if (def.defaultAdjustmentKcal !== null) {
      setCalorieAdjustment(String(def.defaultAdjustmentKcal));
    } else {
      setCalorieAdjustment("");
    }
  };

  // Recalculate handler
  const handleRecalculate = () => {
    setForcedRecalcSnapshot(true);
    setFeedback({
      type: "success",
      message: "Cálculos atualizados com base nos dados clínicos atuais do paciente. Clique em 'Salvar Planejamento' para persistir a nova base.",
    });
  };

  // Save handler
  const handleSave = () => {
    startTransition(async () => {
      setFeedback(null);
      const res = await savePatientPlanningAction(slug, studentPublicId, {
        patientRecordId,
        calculatedAt: computedBMR ? new Date().toISOString() : planning?.calculatedAt || null,
        snapshotWeightKg: currentWeightKg,
        snapshotHeightCm: currentHeightCm,
        snapshotAgeYears: currentAgeYears,
        snapshotBiologicalSex: currentBiologicalSex,
        bmrFormula: computedBMR ? bmrFormula : planning?.bmrFormula || null,
        bmrKcal: computedBMR ?? planning?.bmrKcal ?? null,
        activityLevel: activityLevel || null,
        activityFactor: selectedActivityFactor,
        tdeeKcal: computedTDEE ?? planning?.tdeeKcal ?? null,
        goalType: goalType || null,
        calorieAdjustmentKcal: parsedAdjustment,
        calculatedTargetCaloriesKcal: computedCalculatedTarget,
        targetCaloriesKcal: effectiveTargetCalories,
        targetCaloriesSource: effectiveTargetSource,
        targetProteinG: parsedProteinG,
        targetCarbsG: parsedCarbsG,
        targetFatsG: parsedFatsG,
        clinicalNotes: clinicalNotes.trim() || null,
      });

      if (res.success && res.data) {
        setPlanning(res.data);
        setForcedRecalcSnapshot(false);
        setFeedback({ type: "success", message: "Planejamento nutricional salvo com sucesso!" });
      } else {
        setFeedback({ type: "error", message: res.error || "Erro ao salvar planejamento." });
      }
    });
  };

  // Divergence check between macro total kcal and target calories
  const macroDivergence = useMemo(() => {
    if (!effectiveTargetCalories || !macroTotals.totalKcal || !macroTotals.allDefined) {
      return null;
    }
    const diff = Math.round(macroTotals.totalKcal - effectiveTargetCalories);
    return diff;
  }, [effectiveTargetCalories, macroTotals]);

  // Plan comparison values
  const planComparison = useMemo(() => {
    const publishedKcal = activePlan?.totals?.caloriesKcal ?? null;
    const publishedP = activePlan?.totals?.proteinG ?? null;
    const publishedC = activePlan?.totals?.carbohydrateG ?? null;
    const publishedF = activePlan?.totals?.fatG ?? null;

    const draftKcal = draftPlan?.totals?.caloriesKcal ?? null;

    const publishedKcalDiff =
      publishedKcal !== null && effectiveTargetCalories !== null
        ? Math.round(publishedKcal - effectiveTargetCalories)
        : null;

    const draftKcalDiff =
      draftKcal !== null && effectiveTargetCalories !== null
        ? Math.round(draftKcal - effectiveTargetCalories)
        : null;

    const pDiff =
      publishedP !== null && parsedProteinG !== null ? Math.round(publishedP - parsedProteinG) : null;
    const cDiff =
      publishedC !== null && parsedCarbsG !== null ? Math.round(publishedC - parsedCarbsG) : null;
    const fDiff =
      publishedF !== null && parsedFatsG !== null ? Math.round(publishedF - parsedFatsG) : null;

    return {
      publishedKcal,
      publishedP,
      publishedC,
      publishedF,
      draftKcal,
      publishedKcalDiff,
      draftKcalDiff,
      pDiff,
      cDiff,
      fDiff,
    };
  }, [activePlan, draftPlan, effectiveTargetCalories, parsedProteinG, parsedCarbsG, parsedFatsG]);

  return (
    <div className="space-y-6">
      {/* HEADER / STALE ALERT / FEEDBACK */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">Planejamento Nutricional</h2>
          <p className="text-xs text-muted-foreground">
            Definição determinística de necessidades energéticas, metas calóricas e distribuição de macronutrientes.
          </p>
        </div>

        {canAuthor && (
          <div className="flex items-center gap-2">
            {staleStatus.isStale && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRecalculate}
                className="text-amber-600 border-amber-300 hover:bg-amber-50 dark:border-amber-700 dark:hover:bg-amber-950/40 text-xs font-semibold"
              >
                ↻ Recalcular
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4"
            >
              {isPending ? "Salvando..." : "Salvar Planejamento"}
            </Button>
          </div>
        )}
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs font-medium border ${
            feedback.type === "success"
              ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300"
              : "bg-red-500/10 text-red-700 border-red-500/20 dark:text-red-300"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {staleStatus.isStale && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
              Planejamento Desatualizado
            </span>
            <Badge variant="warning" className="text-[10px]">
              Dados alterados
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Os dados antropométricos ou fisiológicos do paciente foram atualizados desde o último cálculo deste planejamento:
          </p>
          <ul className="text-xs text-amber-800 dark:text-amber-200 list-disc list-inside space-y-0.5">
            {staleStatus.reasons.map((r, idx) => (
              <li key={idx}>{r}</li>
            ))}
          </ul>
          <p className="text-[11px] text-muted-foreground italic">
            O sistema preserva a decisão profissional e não altera as metas salvas. Clique em &ldquo;Recalcular&rdquo; se desejar sincronizar com as medidas atuais.
          </p>
        </div>
      )}

      {/* TWO COLUMN GRID DESKTOP / 1 COLUMN MOBILE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN: DADOS ATUAIS + GASTO ENERGÉTICO */}
        <div className="space-y-6">
          {/* CARD 1: DADOS ATUAIS & IMC */}
          <div className="rounded-xl border border-border/50 bg-card p-4 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/40 pb-2 gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground truncate">
                Dados Atuais & Proporção Corporal
              </h3>
              {latestAnthro ? (
                <span className="text-[11px] text-muted-foreground shrink-0 whitespace-nowrap">
                  Medição: {formatMeasurementDate(latestAnthro.measurementDate)}
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground shrink-0 whitespace-nowrap">Anamnese do Aluno</span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-muted/30 rounded-lg p-2.5">
                <span className="text-[10px] text-muted-foreground block uppercase font-medium">Peso</span>
                <span className="text-base font-bold text-foreground">
                  {currentWeightKg !== null ? `${currentWeightKg} kg` : <span className="text-xs text-amber-600 font-normal">Não informado</span>}
                </span>
              </div>
              <div className="bg-muted/30 rounded-lg p-2.5">
                <span className="text-[10px] text-muted-foreground block uppercase font-medium">Altura</span>
                <span className="text-base font-bold text-foreground">
                  {currentHeightCm !== null ? `${currentHeightCm} cm` : <span className="text-xs text-amber-600 font-normal">Não informada</span>}
                </span>
              </div>
              <div className="bg-muted/30 rounded-lg p-2.5">
                <span className="text-[10px] text-muted-foreground block uppercase font-medium">Idade</span>
                <span className="text-base font-bold text-foreground">
                  {currentAgeYears !== null ? `${currentAgeYears} anos` : <span className="text-xs text-amber-600 font-normal">Não informada</span>}
                </span>
              </div>
              <div className="bg-muted/30 rounded-lg p-2.5">
                <span className="text-[10px] text-muted-foreground block uppercase font-medium">Sexo</span>
                <span className="text-base font-bold text-foreground">
                  {currentBiologicalSex ? (
                    currentBiologicalSex === "MALE" ? "Masc." : "Fem."
                  ) : (
                    <span className="text-xs text-muted-foreground font-normal">Não informado</span>
                  )}
                </span>
              </div>
            </div>

            {/* IMC */}
            <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">
                  Índice de Massa Corporal (IMC)
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-lg font-bold text-foreground">
                    {currentBMI !== null ? `${currentBMI} kg/m²` : <span className="text-xs text-muted-foreground font-normal">Dados insuficientes para calcular</span>}
                  </span>
                  {bmiClassification && (
                    <Badge variant={bmiClassification.badgeVariant} className="text-[10px]">
                      {bmiClassification.category}
                    </Badge>
                  )}
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground text-right hidden sm:block">
                Fórmula padrão: OMS
              </span>
            </div>

            {missingInputs.length > 0 && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                ⚠ Para calcular TMB e GET, informe: {missingInputs.join(", ")}.
              </p>
            )}
          </div>

          {/* CARD 2: GASTO ENERGÉTICO (TMB & GET) */}
          <div className="rounded-xl border border-border/50 bg-card p-4 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Gasto Energético & Fator de Atividade
              </h3>
              <span className="text-[11px] text-muted-foreground">Auditável</span>
            </div>

            {/* FÓRMULA TMB SELETOR */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Fórmula de Taxa Metabólica Basal (TMB)
              </label>
              <select
                value={bmrFormula}
                disabled={!canAuthor}
                onChange={(e) => setBmrFormula(e.target.value as BmrFormulaCode)}
                className="w-full text-xs rounded-lg border border-border/60 bg-background p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {Object.values(BMR_FORMULA_METADATA).map((f) => (
                  <option key={f.code} value={f.code}>
                    {f.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">
                {BMR_FORMULA_METADATA[bmrFormula]?.description}
              </p>
            </div>

            {/* RESULTADO TMB */}
            <div className="rounded-lg bg-muted/30 p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  TMB Calculada
                </span>
                <span className="text-base font-bold text-foreground">
                  {computedBMR !== null ? `${Math.round(computedBMR).toLocaleString("pt-BR")} kcal/dia` : "Não calculada"}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground text-right">
                {computedBMR !== null ? BMR_FORMULA_METADATA[bmrFormula]?.name : "Requer peso, altura, idade e sexo"}
              </span>
            </div>

            {/* NÍVEL DE ATIVIDADE */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Nível de Atividade Física (Fator de Atividade)
              </label>
              <select
                value={activityLevel}
                disabled={!canAuthor}
                onChange={(e) => setActivityLevel(e.target.value as ActivityLevelCode)}
                className="w-full text-xs rounded-lg border border-border/60 bg-background p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">Selecione o nível de atividade...</option>
                {Object.values(ACTIVITY_LEVEL_DEFINITIONS).map((lvl) => (
                  <option key={lvl.code} value={lvl.code}>
                    {lvl.label} — Fator {lvl.factor.toFixed(2)} ({lvl.description})
                  </option>
                ))}
              </select>
              {activityLevel && (
                <p className="text-[11px] text-muted-foreground">
                  Multiplicador selecionado: <strong className="text-foreground">{selectedActivityFactor?.toFixed(3)}</strong>
                </p>
              )}
            </div>

            {/* RESULTADO GET / TDEE */}
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">
                  Gasto Energético Total (GET / TDEE)
                </span>
                <span className="text-lg font-bold text-foreground">
                  {computedTDEE !== null ? `${Math.round(computedTDEE).toLocaleString("pt-BR")} kcal/dia` : "Não calculado"}
                </span>
              </div>
              <div className="text-right text-[10px] text-muted-foreground">
                {computedTDEE !== null && computedBMR !== null && selectedActivityFactor !== null ? (
                  <span>TMB ({Math.round(computedBMR)}) × {selectedActivityFactor}</span>
                ) : (
                  <span>Requer TMB + Fator</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: OBJETIVO + META DIÁRIA + MACROS + COMPARAÇÃO */}
        <div className="space-y-6">
          {/* CARD 3: OBJETIVO & META CALÓRICA */}
          <div className="rounded-xl border border-border/50 bg-card p-4 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Objetivo & Meta Calórica Diária
              </h3>
              <Badge variant="neutral" className="text-[10px]">
                {effectiveTargetSource === "MANUAL" ? "Meta Manual" : "Meta Calculada"}
              </Badge>
            </div>

            {/* SELEÇÃO DE OBJETIVO */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Objetivo Nutricional
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.values(GOAL_TYPE_DEFINITIONS).map((g) => (
                  <button
                    key={g.code}
                    type="button"
                    disabled={!canAuthor}
                    onClick={() => handleSelectGoal(g.code)}
                    className={`text-xs py-2 px-2.5 rounded-lg border font-medium transition-all text-center ${
                      goalType === g.code
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                        : "bg-background border-border/60 hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    {g.label.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* AJUSTE CALÓRICO */}
            {goalType && goalType !== "MAINTENANCE" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Ajuste Calórico (+/- kcal)</span>
                  <span className="text-[11px] text-muted-foreground">Déficit ou Superávit</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="50"
                    disabled={!canAuthor}
                    value={calorieAdjustment}
                    onChange={(e) => setCalorieAdjustment(e.target.value)}
                    placeholder="Ex: -300 ou +250"
                    className="w-full text-xs rounded-lg border border-border/60 bg-background p-2.5 pr-14 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">kcal</span>
                </div>
              </div>
            )}

            {/* META CALCULADA PREVIEW */}
            <div className="rounded-lg bg-muted/20 p-2.5 text-xs flex items-center justify-between">
              <span className="text-muted-foreground">Meta Sugerida pelo Cálculo:</span>
              <span className="font-semibold text-foreground">
                {computedCalculatedTarget !== null
                  ? `${Math.round(computedCalculatedTarget).toLocaleString("pt-BR")} kcal/dia`
                  : "Não definida"}
              </span>
            </div>

            {/* OVERRIDE MANUAL PELO PROFISSIONAL */}
            <div className="pt-2 border-t border-border/40 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Ajuste Manual da Meta Final
                </label>
                <button
                  type="button"
                  disabled={!canAuthor}
                  onClick={() => setIsManualOverride(!isManualOverride)}
                  className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                >
                  {isManualOverride ? "Usar Meta Calculada" : "Definir Valor Manual"}
                </button>
              </div>

              {isManualOverride && (
                <div className="relative">
                  <input
                    type="number"
                    step="50"
                    disabled={!canAuthor}
                    value={manualCalorieTarget}
                    onChange={(e) => setManualCalorieTarget(e.target.value)}
                    placeholder="Defina o valor exato..."
                    className="w-full text-xs rounded-lg border border-emerald-500/50 bg-background p-2.5 pr-14 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-semibold"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">kcal</span>
                </div>
              )}
            </div>

            {/* META DIÁRIA FINAL OFICIAL */}
            <div className="rounded-xl bg-emerald-600 text-white p-3.5 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-100 block">
                  Meta Calórica Oficial
                </span>
                <span className="text-xl font-extrabold">
                  {effectiveTargetCalories !== null
                    ? `${Math.round(effectiveTargetCalories).toLocaleString("pt-BR")} kcal/dia`
                    : "Não definida"}
                </span>
              </div>
              <div className="text-right text-[11px] text-emerald-100">
                {effectiveTargetSource === "MANUAL" ? (
                  <span>Origem: Ajuste Manual</span>
                ) : effectiveTargetSource === "CALCULATED" ? (
                  <span>Origem: Cálculo Clínico</span>
                ) : (
                  <span>Aguardando seleção</span>
                )}
              </div>
            </div>
          </div>

          {/* CARD 4: MACRONUTRIENTES */}
          <div className="rounded-xl border border-border/50 bg-card p-4 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Distribuição de Macronutrientes
              </h3>
              <span className="text-[11px] text-muted-foreground">g/dia, kcal e %</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* PROTEÍNA */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                  <span>Proteína</span>
                  <span className="text-[10px] text-muted-foreground">4 kcal/g</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    disabled={!canAuthor}
                    value={proteinG}
                    onChange={(e) => setProteinG(e.target.value)}
                    placeholder="—"
                    className="w-full text-xs rounded-lg border border-border/60 bg-background p-2 pr-7 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-semibold"
                  />
                  <span className="absolute right-2 top-2 text-[11px] text-muted-foreground">g</span>
                </div>
                <div className="text-[10px] text-muted-foreground flex justify-between">
                  <span>{macroTotals.proteinKcal !== null ? `${Math.round(macroTotals.proteinKcal)} kcal` : "—"}</span>
                  <span className="font-semibold text-foreground">{proteinPct !== null ? `${proteinPct}%` : ""}</span>
                </div>
              </div>

              {/* CARBOIDRATO */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                  <span>Carboidrato</span>
                  <span className="text-[10px] text-muted-foreground">4 kcal/g</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    disabled={!canAuthor}
                    value={carbsG}
                    onChange={(e) => setCarbsG(e.target.value)}
                    placeholder="—"
                    className="w-full text-xs rounded-lg border border-border/60 bg-background p-2 pr-7 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-semibold"
                  />
                  <span className="absolute right-2 top-2 text-[11px] text-muted-foreground">g</span>
                </div>
                <div className="text-[10px] text-muted-foreground flex justify-between">
                  <span>{macroTotals.carbsKcal !== null ? `${Math.round(macroTotals.carbsKcal)} kcal` : "—"}</span>
                  <span className="font-semibold text-foreground">{carbsPct !== null ? `${carbsPct}%` : ""}</span>
                </div>
              </div>

              {/* GORDURA */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                  <span>Gordura</span>
                  <span className="text-[10px] text-muted-foreground">9 kcal/g</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    disabled={!canAuthor}
                    value={fatsG}
                    onChange={(e) => setFatsG(e.target.value)}
                    placeholder="—"
                    className="w-full text-xs rounded-lg border border-border/60 bg-background p-2 pr-7 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-semibold"
                  />
                  <span className="absolute right-2 top-2 text-[11px] text-muted-foreground">g</span>
                </div>
                <div className="text-[10px] text-muted-foreground flex justify-between">
                  <span>{macroTotals.fatsKcal !== null ? `${Math.round(macroTotals.fatsKcal)} kcal` : "—"}</span>
                  <span className="font-semibold text-foreground">{fatsPct !== null ? `${fatsPct}%` : ""}</span>
                </div>
              </div>
            </div>

            {/* SOMA DOS MACROS & AVISO DE DIVERGÊNCIA */}
            <div className="rounded-lg bg-muted/20 p-2.5 text-xs flex items-center justify-between">
              <span className="text-muted-foreground">Soma Energética dos Macros:</span>
              <span className="font-bold text-foreground">
                {macroTotals.totalKcal !== null
                  ? `${Math.round(macroTotals.totalKcal).toLocaleString("pt-BR")} kcal`
                  : "Não definidos"}
              </span>
            </div>

            {macroDivergence !== null && Math.abs(macroDivergence) > 10 && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-200">
                ℹ Os macronutrientes somam <strong>{Math.round(macroTotals.totalKcal!)} kcal</strong>,{" "}
                {macroDivergence > 0 ? (
                  <span><strong>{macroDivergence} kcal</strong> acima da meta oficial ({Math.round(effectiveTargetCalories!)} kcal).</span>
                ) : (
                  <span><strong>{Math.abs(macroDivergence)} kcal</strong> abaixo da meta oficial ({Math.round(effectiveTargetCalories!)} kcal).</span>
                )}
              </div>
            )}
          </div>

          {/* CARD 5: COMPARAÇÃO COM PLANO ALIMENTAR & CTAS */}
          <div className="rounded-xl border border-border/50 bg-card p-4 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Comparação com o Plano Alimentar
              </h3>
              <span className="text-[11px] text-muted-foreground">Apoio Clínico</span>
            </div>

            <div className="space-y-3">
              {/* PLANO PUBLICADO ATIVO */}
              <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                    Plano Ativo (Publicado)
                    <Badge variant="success" className="text-[9px]">Aluno Visualiza</Badge>
                  </span>
                  <span className="text-xs font-bold text-foreground">
                    {planComparison.publishedKcal !== null ? `${Math.round(planComparison.publishedKcal)} kcal` : "Sem plano publicado"}
                  </span>
                </div>

                {effectiveTargetCalories !== null && planComparison.publishedKcal !== null && (
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/30">
                    <span className="text-muted-foreground">Diferença em relação à meta:</span>
                    <span
                      className={`font-bold ${
                        planComparison.publishedKcalDiff === 0
                          ? "text-emerald-600"
                          : planComparison.publishedKcalDiff! > 0
                          ? "text-amber-600"
                          : "text-blue-600"
                      }`}
                    >
                      {planComparison.publishedKcalDiff! > 0 ? `+${planComparison.publishedKcalDiff}` : planComparison.publishedKcalDiff} kcal
                    </span>
                  </div>
                )}

                {/* MACROS DO PLANO PUBLICADO VS META */}
                {planComparison.publishedP !== null && parsedProteinG !== null && (
                  <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-border/30 text-[10px] text-center">
                    <div>
                      <span className="text-muted-foreground block">P (Meta: {parsedProteinG}g)</span>
                      <span className="font-semibold text-foreground">{planComparison.publishedP}g</span>
                      <span className="block text-[9px] text-muted-foreground">
                        {planComparison.pDiff! > 0 ? `+${planComparison.pDiff}g` : `${planComparison.pDiff}g`}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">C (Meta: {parsedCarbsG}g)</span>
                      <span className="font-semibold text-foreground">{planComparison.publishedC}g</span>
                      <span className="block text-[9px] text-muted-foreground">
                        {planComparison.cDiff! > 0 ? `+${planComparison.cDiff}g` : `${planComparison.cDiff}g`}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">G (Meta: {parsedFatsG}g)</span>
                      <span className="font-semibold text-foreground">{planComparison.publishedF}g</span>
                      <span className="block text-[9px] text-muted-foreground">
                        {planComparison.fDiff! > 0 ? `+${planComparison.fDiff}g` : `${planComparison.fDiff}g`}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* RASCUNHO EM ANDAMENTO SE EXISTIR */}
              {draftPlan && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      Rascunho em Andamento
                      <Badge variant="warning" className="text-[9px]">Não Publicado</Badge>
                    </span>
                    <span className="text-xs font-bold text-foreground">
                      {planComparison.draftKcal !== null ? `${Math.round(planComparison.draftKcal)} kcal` : "Em edição"}
                    </span>
                  </div>

                  {effectiveTargetCalories !== null && planComparison.draftKcal !== null && (
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-amber-500/20">
                      <span className="text-muted-foreground">Diferença em relação à meta:</span>
                      <span className="font-bold text-foreground">
                        {planComparison.draftKcalDiff! > 0 ? `+${planComparison.draftKcalDiff}` : planComparison.draftKcalDiff} kcal
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* CTAS CONTEXTUAIS PRESERVANDO PACIENTE */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                {draftPlan ? (
                  <Link
                    href={`/consultoria/${slug}/planos-v2/${draftPlan.planPublicId}?v=${draftPlan.versionPublicId}&studentId=${studentMembershipPublicId}`}
                    className="w-full"
                  >
                    <Button variant="outline" size="sm" className="w-full text-xs font-semibold text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10">
                      Continuar Edição do Rascunho →
                    </Button>
                  </Link>
                ) : activePlan ? (
                  <>
                    <Link
                      href={`/consultoria/${slug}/planos-v2/${activePlan.planPublicId}?v=${activePlan.versionPublicId}&studentId=${studentMembershipPublicId}`}
                      className="w-full sm:w-1/2"
                    >
                      <Button variant="outline" size="sm" className="w-full text-xs font-medium">
                        Ver Plano Alimentar
                      </Button>
                    </Link>
                    {canAuthor && onStartEditPlan && (
                      <Button
                        size="sm"
                        onClick={onStartEditPlan}
                        disabled={isStartingEditPlan}
                        className="w-full sm:w-1/2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {isStartingEditPlan ? "Abrindo..." : "Editar Plano"}
                      </Button>
                    )}
                  </>
                ) : (
                  <Link
                    href={`/consultoria/${slug}/planos-v2?studentId=${studentMembershipPublicId}&create=1`}
                    className="w-full"
                  >
                    <Button size="sm" className="w-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white">
                      + Criar Plano Alimentar para o Aluno
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* CARD 6: OBSERVAÇÕES CLÍNICAS */}
          <div className="rounded-xl border border-border/50 bg-card p-4 space-y-2 shadow-xs">
            <label className="text-xs font-semibold text-foreground block">
              Observações Clínicas do Planejamento
            </label>
            <textarea
              rows={3}
              disabled={!canAuthor}
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Justificativas clínicas, conduta energética, divisão de refeições..."
              className="w-full text-xs rounded-lg border border-border/60 bg-background p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
