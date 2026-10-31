"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DuotoneTrainingIcon,
  DuotoneNutritionIcon,
} from "@/components/ui/icons/duotone-icons";
import type { DailyWorkoutResolution } from "@/lib/training-v2/daily-workout-resolver";
import { buildStudentWorkoutExecutionUrl } from "@/lib/training-v2/route-helpers";
import { startOrResumeWorkoutExecutionAction } from "@/app/consultoria/[slug]/treinos/actions";
import { WorkoutDivisionPickerModal } from "./workout-division-picker-modal";
import { StudentWorkoutCompletionModal } from "./student-workout-completion-modal";
import { StudentWorkoutRestartModal } from "./student-workout-restart-modal";
import { SessionMoreOptionsMenu } from "./session-more-options-menu";
import { StudentPendingWorkoutsDrawer } from "./student-pending-workouts-drawer";

interface SessionToComplete {
  sessionPublicId: string;
  divisionTitle: string;
  startedFormatted?: string;
  totalExercisesCount: number;
  completedExercisesCount: number;
  totalSetsCount?: number;
  completedSetsCount?: number;
}

interface SessionToRestart {
  assignmentPublicId: string;
  blockPublicId?: string | null;
  divisionTitle: string;
  startedFormatted?: string;
}

export interface StudentRoutineItem {
  publicId?: string;
  title: string;
  subtitle?: string | null;
  blockCount?: number;
  estimatedDurationMinutes?: number | null;
  difficultyLevel?: string | null;
}

export interface StudentTrainingSummary {
  title: string;
  subtitle?: string | null;
  workoutCount?: number;
  blockCount?: number;
  workouts?: StudentRoutineItem[];
}

export interface StudentMealItem {
  publicId?: string;
  title: string;
  scheduledTime?: string | null;
  itemsCount?: number;
}

export interface StudentNutritionSummary {
  title: string;
  subtitle?: string | null;
  studentName?: string | null;
  prescriberName?: string | null;
  mealsCount?: number;
  firstMealTime?: string | null;
  meals?: StudentMealItem[];
}

export interface StudentFocusSectionProps {
  consultancySlug: string;
  activeTraining: StudentTrainingSummary | null;
  hasActiveSession?: boolean;
  activeSessionAssignmentPublicId?: string | null;
  trainingServiceEnabled?: boolean;
  activeNutrition: StudentNutritionSummary | null;
  nutritionServiceEnabled?: boolean;
  dailyWorkoutResolution?: DailyWorkoutResolution | null;
  displayMode?: "all" | "workout-only" | "nutrition-only";
}

export { SessionMoreOptionsMenu };

export function StudentFocusSection({
  consultancySlug,
  activeTraining,
  hasActiveSession = false,
  activeSessionAssignmentPublicId,
  trainingServiceEnabled = true,
  activeNutrition,
  nutritionServiceEnabled = true,
  dailyWorkoutResolution,
  displayMode = "all",
}: StudentFocusSectionProps) {
  const router = useRouter();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [sessionToComplete, setSessionToComplete] = useState<SessionToComplete | null>(null);
  const [sessionToRestart, setSessionToRestart] = useState<SessionToRestart | null>(null);
  const [selectedDivisionPublicId, setSelectedDivisionPublicId] = useState<string | null>(null);
  const [isPendingDrawerOpen, setIsPendingDrawerOpen] = useState(false);
  const pendingTriggerRef = React.useRef<HTMLButtonElement>(null);

  const status = dailyWorkoutResolution?.status;
  const isError = status === "ERROR";
  const hasTraining = !isError && Boolean(dailyWorkoutResolution?.assignmentPublicId || activeTraining);

  // Status e flags contextuais
  const isSessionInProgress = dailyWorkoutResolution
    ? status === "IN_PROGRESS"
    : Boolean(hasActiveSession);
  const isCompletedToday = status === "COMPLETED_TODAY" || status === "SEQUENCE_COMPLETED";
  const isRestDay = status === "REST_DAY";

  // CABEÇALHO PADRÃO UNIFICADO (Regra de Ouro: "Meu treino" para todos os alunos em qualquer estado)
  const cardHeaderTitle = "Meu treino";
  const cardHeaderSubtitle = dailyWorkoutResolution?.todayWeekdayName || "Hoje";
  // Subtitle guard: dailyWorkoutResolution.todayWeekdayName !== "Hoje" && dailyWorkoutResolution.status !== "ERROR"

  const selectedDivision = dailyWorkoutResolution?.availableDivisions?.find(
    (d) => d.publicId === selectedDivisionPublicId
  );

  const isSelectedDivisionActive = selectedDivision
    ? selectedDivision.status === "IN_PROGRESS"
    : isSessionInProgress;

  const isSelectedDivisionDone = selectedDivision
    ? selectedDivision.status === "COMPLETED_TODAY"
    : isCompletedToday;

  const divisionTitle = dailyWorkoutResolution?.divisionTitle || activeTraining?.title || "Ficha de treino";
  const effectiveDivisionTitle = selectedDivision
    ? selectedDivision.title
    : divisionTitle;

  const routineTitle = dailyWorkoutResolution?.routineTitle || activeTraining?.title || "";
  const exerciseCount =
    !isError && dailyWorkoutResolution?.exerciseCount != null
      ? Number(dailyWorkoutResolution.exerciseCount)
      : 0;
  const effectiveExerciseCount = selectedDivision
    ? selectedDivision.exerciseCount
    : exerciseCount;

  const durationEstimate = isError
    ? null
    : (dailyWorkoutResolution?.estimatedDurationMinutes != null
        ? Number(dailyWorkoutResolution.estimatedDurationMinutes)
        : null);

  let trainingActionHref = dailyWorkoutResolution?.actionHref || `/consultoria/${consultancySlug}/treinos`;

  if (selectedDivision && dailyWorkoutResolution?.assignmentPublicId) {
    trainingActionHref = buildStudentWorkoutExecutionUrl(
      consultancySlug,
      dailyWorkoutResolution.assignmentPublicId,
      selectedDivision.publicId
    );
  } else if ((!dailyWorkoutResolution || status === "ERROR") && hasTraining) {
    if (isSessionInProgress && activeSessionAssignmentPublicId) {
      trainingActionHref = `/consultoria/${consultancySlug}/treinos/${activeSessionAssignmentPublicId}`;
    } else if (activeTraining?.workouts && activeTraining.workouts.length > 0) {
      trainingActionHref = `/consultoria/${consultancySlug}/treinos/${activeTraining.workouts[0].publicId}`;
    }
  }

  const unfinished = dailyWorkoutResolution?.unfinishedSession;
  const pendingSessionsCount = unfinished ? 1 : 0;

  const isActiveSessionAllDone = Boolean(
    isSessionInProgress &&
      ((dailyWorkoutResolution?.totalSetsCount &&
        (dailyWorkoutResolution?.completedSetsCount ?? 0) >=
          dailyWorkoutResolution.totalSetsCount) ||
        (exerciseCount > 0 &&
          (dailyWorkoutResolution?.completedExercisesCount ?? 0) >= exerciseCount))
  );

  const handleOpenCompletionForUnfinished = () => {
    if (!unfinished) return;
    setSessionToComplete({
      sessionPublicId: unfinished.sessionPublicId,
      divisionTitle: unfinished.divisionTitle,
      startedFormatted: unfinished.startedFormatted,
      totalExercisesCount: unfinished.totalExercisesCount,
      completedExercisesCount: unfinished.completedExercisesCount,
      totalSetsCount: unfinished.totalSetsCount,
      completedSetsCount: unfinished.completedSetsCount,
    });
  };

  const handleOpenRestartForUnfinished = () => {
    if (!unfinished) return;
    setSessionToRestart({
      assignmentPublicId: unfinished.assignmentPublicId,
      blockPublicId: unfinished.blockPublicId,
      divisionTitle: unfinished.divisionTitle,
      startedFormatted: unfinished.startedFormatted,
    });
  };

  const handleOpenCompletionForActive = () => {
    if (!dailyWorkoutResolution?.activeSessionPublicId) return;
    setSessionToComplete({
      sessionPublicId: dailyWorkoutResolution.activeSessionPublicId,
      divisionTitle: effectiveDivisionTitle,
      startedFormatted: dailyWorkoutResolution.activeSessionStartedFormatted || "Hoje",
      totalExercisesCount: effectiveExerciseCount,
      completedExercisesCount: dailyWorkoutResolution.completedExercisesCount ?? 0,
      totalSetsCount: dailyWorkoutResolution.totalSetsCount,
      completedSetsCount: dailyWorkoutResolution.completedSetsCount,
    });
  };

  const handleOpenRestartForActive = () => {
    if (!dailyWorkoutResolution?.assignmentPublicId) return;
    setSessionToRestart({
      assignmentPublicId: dailyWorkoutResolution.assignmentPublicId,
      blockPublicId: dailyWorkoutResolution.targetBlockPublicId,
      divisionTitle: effectiveDivisionTitle,
      startedFormatted: dailyWorkoutResolution.activeSessionStartedFormatted || "Hoje",
    });
  };

  const handleOpenRestartForCurrent = (targetBlockPublicId?: string | null, targetTitle?: string) => {
    const assignmentId = dailyWorkoutResolution?.assignmentPublicId || activeTraining?.workouts?.[0]?.publicId;
    if (!assignmentId) return;
    setSessionToRestart({
      assignmentPublicId: assignmentId,
      blockPublicId: targetBlockPublicId ?? selectedDivisionPublicId ?? dailyWorkoutResolution?.targetBlockPublicId ?? null,
      divisionTitle: targetTitle || effectiveDivisionTitle,
      startedFormatted: dailyWorkoutResolution?.activeSessionStartedFormatted || undefined,
    });
  };

  const [isStartingTraining, setIsStartingTraining] = useState(false);

  const handleStartTraining = async (targetBlockPublicId?: string | null) => {
    if (isStartingTraining) return;
    const assignmentId =
      dailyWorkoutResolution?.assignmentPublicId || activeTraining?.workouts?.[0]?.publicId;
    const blockId =
      targetBlockPublicId ??
      selectedDivisionPublicId ??
      dailyWorkoutResolution?.targetBlockPublicId ??
      null;

    if (!assignmentId) {
      router.push(trainingActionHref);
      return;
    }

    setIsStartingTraining(true);
    try {
      const res = await startOrResumeWorkoutExecutionAction(
        consultancySlug,
        assignmentId,
        blockId
      );

      if (res.success && res.session) {
        router.push(
          buildStudentWorkoutExecutionUrl(
            consultancySlug,
            assignmentId,
            res.session.workoutBlockPublicId || blockId
          )
        );
        return;
      }
      if (res.conflict) {
        router.push(buildStudentWorkoutExecutionUrl(consultancySlug, assignmentId, blockId));
        return;
      }
    } catch (err) {
      console.error("[Dashboard] Error starting workout execution:", err);
    } finally {
      setIsStartingTraining(false);
    }
    router.push(trainingActionHref);
  };

  const handleCompletionSuccess = () => {
    router.refresh();
  };

  const handleRestartSuccess = (targetBlockPublicId: string | null) => {
    const assignmentId =
      sessionToRestart?.assignmentPublicId || dailyWorkoutResolution?.assignmentPublicId;
    if (assignmentId) {
      router.push(
        buildStudentWorkoutExecutionUrl(consultancySlug, assignmentId, targetBlockPublicId)
      );
    }
    router.refresh();
  };

  const hasNutrition = Boolean(activeNutrition);
  const meals = activeNutrition?.meals || [];
  const mealsCount = activeNutrition?.mealsCount || meals.length;

  const showWorkout = displayMode !== "nutrition-only";
  const showNutrition = displayMode !== "workout-only";

  return (
    <div className="w-full min-w-0">
      {/* Grid: 2 Colunas no Desktop Amplo (xl: 1280px+), 1 Coluna em Telas Menores */}
      <div className={displayMode === "all" ? "grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5 min-w-0" : "w-full min-w-0"}>
        {/* ================================================================= */}
        {/* PAINEL 1: MEU TREINO (Ação Principal com Divisão do Dia)           */}
        {/* ================================================================= */}
        {showWorkout && (
        <div className="rounded-2xl bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] shadow-sm p-5 sm:p-6 flex flex-col justify-between space-y-4 transition-colors min-w-0">
          <div className="space-y-3.5">
            {/* Cabeçalho do Card: Sempre "Meu treino" e Dia do Contexto */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <DuotoneTrainingIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                    {cardHeaderTitle}
                  </h2>
                  <p className="text-sm text-zinc-500 dark:text-[#8E95A2] mt-0.5">
                    {cardHeaderSubtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-end">
                {/* 2. ATALHO DISCRETO PARA PENDÊNCIAS */}
                {pendingSessionsCount > 0 && (
                  <button
                    ref={pendingTriggerRef}
                    type="button"
                    onClick={() => setIsPendingDrawerOpen(true)}
                    aria-haspopup="dialog"
                    aria-expanded={isPendingDrawerOpen}
                    aria-label="Treinos pendentes: Treino não finalizado"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/30 text-amber-800 dark:text-amber-300 border border-amber-500/30 transition-colors cursor-pointer select-none shrink-0"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span>Treinos pendentes · {pendingSessionsCount}</span>
                  </button>
                )}

                {/* Status Badge Real ÚNICO (somente quando necessário) */}
                {isError ? (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    Atenção
                  </span>
                ) : hasTraining ? (
                  isSessionInProgress ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Em andamento</span>
                    </span>
                  ) : isCompletedToday ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                      <span>✓ Realizado</span>
                    </span>
                  ) : null
                ) : (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    {trainingServiceEnabled ? "Sem ficha ativa" : "Não habilitado"}
                  </span>
                )}
              </div>
            </div>

            {/* Conteúdo Central */}
            {isError ? (
              <div className="p-4 sm:p-5 rounded-xl bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/25 space-y-3">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-bold text-sm">
                  <svg className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Consulta de treino indisponível no momento</span>
                </div>
                <p className="text-xs text-amber-900/80 dark:text-amber-300/80 leading-relaxed">
                  {dailyWorkoutResolution?.contextNote || "Não foi possível carregar a programação do treino neste momento. Suas prescrições e histórico permanecem preservados."}
                </p>
                <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-amber-500/20">
                  <Link
                    href={`/consultoria/${consultancySlug}/treinos`}
                    className="px-5 min-h-[48px] rounded-xl font-bold text-sm bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 flex items-center justify-center gap-2 transition-opacity cursor-pointer select-none"
                  >
                    Ver meus treinos
                  </Link>
                  <Link
                    href={`/consultoria/${consultancySlug}`}
                    className="px-4 min-h-[48px] rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1.5 select-none"
                  >
                    Tentar novamente
                  </Link>
                </div>
              </div>
            ) : hasTraining ? (
              <div className="space-y-4 sm:space-y-5">
                {/* 1. Bloco Principal — Treino de Hoje (com ações próprias integradas) */}
                {selectedDivision ? (
                  <div className="p-4 sm:p-5 rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/70 dark:border-[#303238] space-y-3 text-left">
                    <div className="flex items-center justify-between gap-2 pb-0.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Treino escolhido para hoje
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedDivisionPublicId(null)}
                        className="text-xs text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 underline cursor-pointer"
                      >
                        Voltar ao treino programado
                      </button>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-zinc-900 dark:text-white tracking-tight leading-snug">
                        {effectiveDivisionTitle}
                      </h3>
                      {routineTitle && (
                        <p className="text-sm text-zinc-500 dark:text-[#8E95A2]">
                          Ficha: <strong className="font-semibold text-zinc-700 dark:text-zinc-300">{routineTitle}</strong>
                        </p>
                      )}
                      {effectiveExerciseCount > 0 && (
                        <div className="text-sm text-zinc-500 dark:text-[#8E95A2] pt-0.5">
                          {effectiveExerciseCount} {effectiveExerciseCount === 1 ? "exercício" : "exercícios"}
                        </div>
                      )}
                      <p className="text-xs text-zinc-500 dark:text-[#8E95A2] pt-0.5">
                        Essa escolha não altera sua programação semanal.
                      </p>
                    </div>

                    {/* Ações DENTRO do bloco da divisão escolhida */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-3 border-t border-zinc-200/60 dark:border-[#303238]/80">
                      {isSelectedDivisionActive ? (
                        isActiveSessionAllDone ? (
                          <>
                            <button
                              type="button"
                              onClick={handleOpenCompletionForActive}
                              className="w-full sm:w-auto px-5 min-h-[48px] rounded-xl font-bold text-sm sm:text-base bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs select-none"
                            >
                              <span>✓ Finalizar treino</span>
                            </button>
                            <Link
                              href={trainingActionHref}
                              className="w-full sm:w-auto px-4 min-h-[48px] rounded-xl font-semibold text-sm bg-white dark:bg-[#151619] hover:bg-zinc-100 dark:hover:bg-[#252830] text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none"
                            >
                              <span>Ver treino</span>
                              <span>→</span>
                            </Link>
                            <SessionMoreOptionsMenu onRestart={() => handleOpenRestartForCurrent(selectedDivision.publicId, selectedDivision.title)} />
                            {dailyWorkoutResolution?.canChangeDivision && (
                              <button
                                type="button"
                                onClick={() => setIsPickerOpen(true)}
                                className="w-full sm:w-auto px-4 min-h-[48px] rounded-xl font-semibold text-sm bg-white dark:bg-[#151619] hover:bg-zinc-100 dark:hover:bg-[#252830] text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none"
                              >
                                <span>Escolher outro treino</span>
                                <span>→</span>
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <Link
                              href={trainingActionHref}
                              className="w-full sm:w-auto px-5 min-h-[48px] rounded-xl font-semibold text-sm sm:text-base bg-blue-600/10 hover:bg-blue-600/20 active:bg-blue-600/30 text-blue-700 dark:text-blue-300 border border-blue-500/30 flex items-center justify-center gap-2 transition-colors cursor-pointer select-none"
                            >
                              <span>Continuar treino</span>
                              <span>→</span>
                            </Link>
                            <button
                              type="button"
                              onClick={handleOpenCompletionForActive}
                              className="w-full sm:w-auto px-4 min-h-[48px] rounded-xl font-semibold text-sm bg-purple-600/10 hover:bg-purple-600/20 active:bg-purple-600/30 text-purple-700 dark:text-purple-300 border border-purple-500/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none"
                            >
                              <span>Finalizar treino</span>
                            </button>
                            <SessionMoreOptionsMenu onRestart={() => handleOpenRestartForCurrent(selectedDivision.publicId, selectedDivision.title)} />
                            {dailyWorkoutResolution?.canChangeDivision && (
                              <button
                                type="button"
                                onClick={() => setIsPickerOpen(true)}
                                className="w-full sm:w-auto px-4 min-h-[48px] rounded-xl font-semibold text-sm bg-white dark:bg-[#151619] hover:bg-zinc-100 dark:hover:bg-[#252830] text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none"
                              >
                                <span>Escolher outro treino</span>
                                <span>→</span>
                              </button>
                            )}
                          </>
                        )
                      ) : isSelectedDivisionDone ? (
                        <>
                          <button
                            type="button"
                            disabled={isStartingTraining}
                            onClick={() => handleStartTraining(selectedDivision.publicId)}
                            className="w-full sm:w-auto px-5 min-h-[48px] rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer select-none disabled:opacity-60"
                          >
                            {isStartingTraining ? (
                              <>
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Iniciando...</span>
                              </>
                            ) : (
                              <>
                                <span>Treinar novamente</span>
                                <span>→</span>
                              </>
                            )}
                          </button>
                          <Link
                            href={`${trainingActionHref}${trainingActionHref.includes("?") ? "&" : "?"}resumo=1`}
                            className="w-full sm:w-auto px-4 min-h-[48px] rounded-xl font-semibold text-sm bg-white dark:bg-[#151619] hover:bg-zinc-100 dark:hover:bg-[#252830] text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none"
                          >
                            <span>Ver resumo do treino</span>
                          </Link>
                          <SessionMoreOptionsMenu onRestart={() => handleOpenRestartForCurrent(selectedDivision.publicId, selectedDivision.title)} />
                          {dailyWorkoutResolution?.canChangeDivision && (
                            <button
                              type="button"
                              onClick={() => setIsPickerOpen(true)}
                              className="w-full sm:w-auto px-4 min-h-[48px] rounded-xl font-semibold text-sm bg-white dark:bg-[#151619] hover:bg-zinc-100 dark:hover:bg-[#252830] text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none"
                            >
                              <span>Escolher outro treino</span>
                              <span>→</span>
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={isStartingTraining}
                            onClick={() => handleStartTraining(selectedDivisionPublicId || dailyWorkoutResolution?.targetBlockPublicId)}
                            className="w-full sm:w-auto px-6 min-h-[48px] rounded-xl font-bold text-sm sm:text-base bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer select-none disabled:opacity-60"
                          >
                            {isStartingTraining ? (
                              <>
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Iniciando treino...</span>
                              </>
                            ) : (
                              <>
                                <span>Começar treino</span>
                                <span>→</span>
                              </>
                            )}
                          </button>
                          {dailyWorkoutResolution?.canChangeDivision && (
                            <button
                              type="button"
                              onClick={() => setIsPickerOpen(true)}
                              className="w-full sm:w-auto px-4 min-h-[48px] rounded-xl font-semibold text-sm bg-white dark:bg-[#151619] hover:bg-zinc-100 dark:hover:bg-[#252830] text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none"
                            >
                              <span>Escolher outro treino</span>
                              <span>→</span>
                            </button>
                          )}
                          <SessionMoreOptionsMenu onRestart={() => handleOpenRestartForCurrent(selectedDivision.publicId, selectedDivision.title)} />
                        </>
                      )}
                    </div>
                  </div>
                ) : isRestDay ? (
                  <div className="p-4 sm:p-5 rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/70 dark:border-[#303238] space-y-3 text-left">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                      Treino de hoje
                    </span>
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-zinc-900 dark:text-white tracking-tight">
                        Hoje é dia de descanso
                      </h3>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        Você pode escolher outro treino sem mudar sua programação.
                      </p>
                    </div>

                    {dailyWorkoutResolution?.canChangeDivision && (
                      <div className="pt-3 border-t border-zinc-200/60 dark:border-[#303238]/80">
                        <button
                          type="button"
                          onClick={() => setIsPickerOpen(true)}
                          className="w-full sm:w-auto px-5 min-h-[48px] rounded-xl font-semibold text-sm bg-white dark:bg-[#151619] hover:bg-zinc-100 dark:hover:bg-[#252830] text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center gap-2 transition-colors cursor-pointer select-none"
                        >
                          <span>Escolher outro treino</span>
                          <span>→</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : isCompletedToday ? (
                  <div className="p-4 sm:p-5 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/25 space-y-3 text-left">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                      Treino de hoje · Concluído
                    </span>
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-emerald-800 dark:text-emerald-300 tracking-tight">
                        ✓ Treino de hoje concluído!
                      </h3>
                      <p className="text-sm text-emerald-900/80 dark:text-emerald-200/80 leading-relaxed">
                        Você já realizou o treino previsto para hoje ({divisionTitle}).
                      </p>
                      {routineTitle && (
                        <p className="text-sm text-zinc-500 dark:text-[#8E95A2] pt-0.5">
                          Ficha: <strong className="font-semibold text-zinc-700 dark:text-zinc-300">{routineTitle}</strong>
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-3 border-t border-emerald-500/20">
                      <button
                        type="button"
                        disabled={isStartingTraining}
                        onClick={() => handleStartTraining()}
                        className="w-full sm:w-auto px-5 min-h-[48px] rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer select-none disabled:opacity-60"
                      >
                        {isStartingTraining ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Iniciando...</span>
                          </>
                        ) : (
                          <>
                            <span>Treinar novamente</span>
                            <span>→</span>
                          </>
                        )}
                      </button>
                      <Link
                        href={`${trainingActionHref}${trainingActionHref.includes("?") ? "&" : "?"}resumo=1`}
                        className="w-full sm:w-auto px-4 min-h-[48px] rounded-xl font-semibold text-sm bg-white dark:bg-[#151619] hover:bg-zinc-100 dark:hover:bg-[#252830] text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none"
                      >
                        <span>Ver resumo do treino</span>
                      </Link>
                      <SessionMoreOptionsMenu onRestart={() => handleOpenRestartForCurrent()} />
                      {dailyWorkoutResolution?.canChangeDivision && (
                        <button
                          type="button"
                          onClick={() => setIsPickerOpen(true)}
                          className="w-full sm:w-auto px-4 min-h-[48px] rounded-xl font-semibold text-sm bg-white dark:bg-[#151619] hover:bg-zinc-100 dark:hover:bg-[#252830] text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none"
                        >
                          <span>Escolher outro treino</span>
                          <span>→</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : isSessionInProgress ? (
                  /* Sessão iniciada HOJE em andamento */
                  <div className="p-4 sm:p-5 rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/70 dark:border-[#303238] space-y-3 text-left">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                      Treino de hoje · Em andamento
                    </span>
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-zinc-900 dark:text-white tracking-tight leading-snug">
                        {divisionTitle}
                      </h3>
                      {routineTitle && (
                        <p className="text-sm text-zinc-500 dark:text-[#8E95A2]">
                          Ficha: <strong className="font-semibold text-zinc-700 dark:text-zinc-300">{routineTitle}</strong>
                        </p>
                      )}
                      {dailyWorkoutResolution?.activeSessionStartedFormatted && (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          Iniciado em {dailyWorkoutResolution.activeSessionStartedFormatted}
                        </p>
                      )}
                    </div>

                    {isActiveSessionAllDone ? (
                      <div className="inline-flex items-center gap-1.5 text-base font-medium text-purple-700 dark:text-purple-300">
                        <span>✓</span>
                        <span>Todas as séries concluídas. Falta finalizar o treino.</span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                          Progresso da sessão: {dailyWorkoutResolution?.completedExercisesCount ?? 0} de {exerciseCount}{" "}
                          {exerciseCount === 1 ? "exercício concluído" : "exercícios concluídos"}
                        </span>
                        {(dailyWorkoutResolution?.completedSetsCount ?? 0) > 0 && (
                          <span className="text-sm text-zinc-500 dark:text-zinc-400">
                            (Séries: {dailyWorkoutResolution?.completedSetsCount} de {dailyWorkoutResolution?.totalSetsCount || "?"})
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-3 border-t border-zinc-200/60 dark:border-[#303238]/80">
                      {isActiveSessionAllDone ? (
                        <>
                          <button
                            type="button"
                            onClick={handleOpenCompletionForActive}
                            className="w-full sm:w-auto px-5 min-h-[48px] rounded-xl font-bold text-sm sm:text-base bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs select-none"
                          >
                            <span>✓ Finalizar treino</span>
                          </button>
                          <Link
                            href={trainingActionHref}
                            className="w-full sm:w-auto px-4 min-h-[48px] rounded-xl font-semibold text-sm bg-white dark:bg-[#151619] hover:bg-zinc-100 dark:hover:bg-[#252830] text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center select-none"
                          >
                            <span>Ver treino</span>
                            <span>→</span>
                          </Link>
                        </>
                      ) : (
                        <>
                          <Link
                            href={trainingActionHref}
                            className="w-full sm:w-auto px-5 min-h-[48px] rounded-xl font-semibold text-sm sm:text-base bg-blue-600/10 hover:bg-blue-600/20 active:bg-blue-600/30 text-blue-700 dark:text-blue-300 border border-blue-500/30 flex items-center justify-center gap-2 transition-colors cursor-pointer select-none"
                          >
                            <span>Continuar treino</span>
                            <span>→</span>
                          </Link>
                          <button
                            type="button"
                            onClick={handleOpenCompletionForActive}
                            className="w-full sm:w-auto px-4 min-h-[48px] rounded-xl font-semibold text-sm bg-purple-600/10 hover:bg-purple-600/20 active:bg-purple-600/30 text-purple-700 dark:text-purple-300 border border-purple-500/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none"
                          >
                            <span>Finalizar treino</span>
                          </button>
                        </>
                      )}
                      <SessionMoreOptionsMenu onRestart={handleOpenRestartForActive} />
                      {dailyWorkoutResolution?.canChangeDivision && (
                        <button
                          type="button"
                          onClick={() => setIsPickerOpen(true)}
                          className="w-full sm:w-auto px-4 min-h-[48px] rounded-xl font-semibold text-sm bg-white dark:bg-[#151619] hover:bg-zinc-100 dark:hover:bg-[#252830] text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none"
                        >
                          <span>Escolher outro treino</span>
                          <span>→</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Treino previsto para hoje (antes de iniciar - Ingrid) */
                  <div className="p-4 sm:p-5 rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/70 dark:border-[#303238] space-y-3 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                        Treino de hoje
                      </span>
                      <span className="sr-only">Treino previsto para hoje</span>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-zinc-900 dark:text-white tracking-tight leading-snug">
                        {divisionTitle}
                      </h3>
                      {routineTitle && (
                        <p className="text-sm text-zinc-500 dark:text-[#8E95A2]">
                          Ficha: <strong className="font-semibold text-zinc-700 dark:text-zinc-300">{routineTitle}</strong>
                        </p>
                      )}
                      {exerciseCount > 0 && (
                        <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500 dark:text-[#8E95A2] pt-0.5">
                          <span>
                            {exerciseCount} {exerciseCount === 1 ? "exercício" : "exercícios"}
                          </span>
                          {durationEstimate !== null && durationEstimate > 0 && (
                            <>
                              <span>•</span>
                              <span>
                                ~{durationEstimate} min (estimativa)
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Botão Começar treino DENTRO desse bloco */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-3 border-t border-zinc-200/60 dark:border-[#303238]/80">
                      <button
                        type="button"
                        disabled={isStartingTraining}
                        onClick={() => handleStartTraining(selectedDivisionPublicId || dailyWorkoutResolution?.targetBlockPublicId)}
                        className="w-full sm:w-auto px-6 min-h-[48px] rounded-xl font-bold text-sm sm:text-base bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer select-none disabled:opacity-60"
                      >
                        {isStartingTraining ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Iniciando treino...</span>
                          </>
                        ) : (
                          <>
                            <span>Começar treino</span>
                            <span>→</span>
                          </>
                        )}
                      </button>
                      {dailyWorkoutResolution?.canChangeDivision && (
                        <button
                          type="button"
                          onClick={() => setIsPickerOpen(true)}
                          className="w-full sm:w-auto px-4 min-h-[48px] rounded-xl font-semibold text-sm bg-white dark:bg-[#151619] hover:bg-zinc-100 dark:hover:bg-[#252830] text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none"
                        >
                          <span>Escolher outro treino</span>
                          <span>→</span>
                        </button>
                      )}
                      <SessionMoreOptionsMenu onRestart={() => handleOpenRestartForCurrent()} />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-5 rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/80 dark:border-[#303238] text-center space-y-3">
                <p className="text-sm text-zinc-600 dark:text-[#8E95A2]">
                  {trainingServiceEnabled
                    ? "Seu treino ainda não foi disponibilizado. Sua equipe técnica está preparando sua prescrição personalizada."
                    : "O serviço de treinamento não está habilitado para o seu perfil nesta consultoria."}
                </p>
                <div className="flex items-center justify-center">
                  <Link
                    href={`/consultoria/${consultancySlug}/consultas`}
                    className="px-5 py-2.5 min-h-[44px] rounded-xl font-semibold text-sm bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <span>Falar com treinador</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {/* ================================================================= */}
        {/* PAINEL 2: MINHA ALIMENTAÇÃO (Ação Principal Única Clara)           */}
        {/* ================================================================= */}
        {showNutrition && (
        <div className="rounded-2xl bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] shadow-sm p-5 sm:p-6 flex flex-col justify-between space-y-4 transition-colors min-w-0">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <DuotoneNutritionIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                    Minha alimentação
                  </h2>
                  <p className="text-sm text-zinc-500 dark:text-[#8E95A2] mt-0.5">
                    {activeNutrition?.prescriberName
                      ? `Prescrito por ${activeNutrition.prescriberName}`
                      : "Prescrição nutricional"}
                  </p>
                </div>
              </div>

              {hasNutrition ? (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  Ativo
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  {nutritionServiceEnabled ? "Sem plano ativo" : "Não habilitado"}
                </span>
              )}
            </div>

            {hasNutrition ? (
              <div className="space-y-3 text-left">
                {/* Identificação Segura: Paciente Destinatário vs Título da Prescrição */}
                {activeNutrition?.studentName && (
                  <div className="flex flex-wrap items-center gap-1.5 text-xs pb-0.5">
                    <span className="font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-md">
                      Destinatário: {activeNutrition.studentName}
                    </span>
                    {activeNutrition.prescriberName && (
                      <span className="text-[11px] text-zinc-500 dark:text-[#8E95A2]">
                        • Nutricionista: <strong className="font-medium text-zinc-700 dark:text-zinc-300">{activeNutrition.prescriberName}</strong>
                      </span>
                    )}
                  </div>
                )}

                <div className="p-4 sm:p-5 rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/70 dark:border-[#303238] space-y-1">
                  <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white tracking-tight flex flex-wrap items-baseline gap-1.5">
                    <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Título da Prescrição:</span>
                    <span>{activeNutrition?.title || "Plano Alimentar"}</span>
                  </h3>
                  {activeNutrition?.subtitle && (
                    <p className="text-sm text-zinc-500 dark:text-[#8E95A2]">
                      {activeNutrition.subtitle}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2.5 text-sm text-zinc-600 dark:text-[#8E95A2] pt-1">
                  <span>
                    {mealsCount} {mealsCount === 1 ? "refeição programada" : "refeições programadas"}
                  </span>
                  {activeNutrition?.firstMealTime && (
                    <>
                      <span>•</span>
                      <span>1ª refeição às {activeNutrition.firstMealTime}</span>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/80 dark:border-[#303238] text-center space-y-2">
                <p className="text-sm text-zinc-600 dark:text-[#8E95A2]">
                  {nutritionServiceEnabled
                    ? "Seu plano alimentar ainda não foi disponibilizado. Sua equipe técnica está preparando sua prescrição personalizada."
                    : "O serviço de nutrição não está habilitado para o seu perfil nesta consultoria."}
                </p>
              </div>
            )}
          </div>

          <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-zinc-100 dark:border-[#303238]/80">
            {hasNutrition ? (
              <>
                <Link
                  href={`/consultoria/${consultancySlug}/nutricao`}
                  className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] rounded-xl font-bold text-sm bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center gap-2 transition-colors cursor-pointer select-none"
                >
                  <span>Ver plano alimentar</span>
                  <span>→</span>
                </Link>

                <Link
                  href={`/consultoria/${consultancySlug}/nutricao`}
                  className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline min-h-[44px] flex items-center justify-center sm:justify-start cursor-pointer whitespace-nowrap self-center sm:self-auto select-none"
                >
                  Ver minhas refeições →
                </Link>
              </>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
                <Link
                  href={`/consultoria/${consultancySlug}/consultas`}
                  className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] rounded-xl font-semibold text-sm bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <span>Falar com nutricionista</span>
                  <span>→</span>
                </Link>

                <Link
                  href={`/consultoria/${consultancySlug}/nutricao`}
                  className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline min-h-[44px] flex items-center justify-center sm:justify-start cursor-pointer whitespace-nowrap self-center sm:self-auto select-none"
                >
                  Ver nutrição →
                </Link>
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      {/* MODAL 1: SELEÇÃO DE OUTRA DIVISÃO */}
      {isPickerOpen && (
        <WorkoutDivisionPickerModal
          isOpen={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          consultancySlug={consultancySlug}
          divisions={dailyWorkoutResolution?.availableDivisions || []}
          assignmentPublicId={dailyWorkoutResolution?.assignmentPublicId || activeTraining?.workouts?.[0]?.publicId || ""}
          currentDivisionPublicId={selectedDivisionPublicId ?? dailyWorkoutResolution?.targetBlockPublicId}
          hasActiveSession={isSessionInProgress}
          onSelectDivision={(pubId) => setSelectedDivisionPublicId(pubId)}
        />
      )}

      {/* MODAL 2: FINALIZAR TREINO DIRETO */}
      {sessionToComplete && (
        <StudentWorkoutCompletionModal
          key={sessionToComplete.sessionPublicId}
          isOpen={Boolean(sessionToComplete)}
          onClose={() => setSessionToComplete(null)}
          consultancySlug={consultancySlug}
          sessionPublicId={sessionToComplete.sessionPublicId}
          divisionTitle={sessionToComplete.divisionTitle}
          startedFormatted={sessionToComplete.startedFormatted}
          totalExercisesCount={sessionToComplete.totalExercisesCount}
          completedExercisesCount={sessionToComplete.completedExercisesCount}
          totalSetsCount={sessionToComplete.totalSetsCount}
          completedSetsCount={sessionToComplete.completedSetsCount}
          onSuccess={handleCompletionSuccess}
        />
      )}

      {/* MODAL 3: RECOMEÇAR TREINO DO INÍCIO */}
      {sessionToRestart && (
        <StudentWorkoutRestartModal
          key={sessionToRestart.assignmentPublicId + (sessionToRestart.blockPublicId || "")}
          isOpen={Boolean(sessionToRestart)}
          onClose={() => setSessionToRestart(null)}
          consultancySlug={consultancySlug}
          assignmentPublicId={sessionToRestart.assignmentPublicId}
          blockPublicId={sessionToRestart.blockPublicId}
          divisionTitle={sessionToRestart.divisionTitle}
          startedFormatted={sessionToRestart.startedFormatted}
          onSuccess={handleRestartSuccess}
        />
      )}

      {/* DRAWER / SHEET: SESSÕES PENDENTES ANTERIORES */}
      <StudentPendingWorkoutsDrawer
        isOpen={isPendingDrawerOpen}
        onClose={() => setIsPendingDrawerOpen(false)}
        pendingSession={unfinished || null}
        onOpenCompletion={handleOpenCompletionForUnfinished}
        onOpenRestart={handleOpenRestartForUnfinished}
        triggerRef={pendingTriggerRef}
      />
    </div>
  );
}
