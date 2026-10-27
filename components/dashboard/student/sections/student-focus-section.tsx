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
import { WorkoutDivisionPickerModal } from "./workout-division-picker-modal";
import { StudentWorkoutCompletionModal } from "./student-workout-completion-modal";
import { StudentWorkoutRestartModal } from "./student-workout-restart-modal";

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

  const status = dailyWorkoutResolution?.status;
  const isError = status === "ERROR";
  const hasTraining = !isError && Boolean(dailyWorkoutResolution?.assignmentPublicId || activeTraining);

  // Status tag e cores contextuais de Treino
  const isSessionInProgress = dailyWorkoutResolution
    ? status === "IN_PROGRESS"
    : Boolean(hasActiveSession);
  const isCompletedToday = status === "COMPLETED_TODAY" || status === "SEQUENCE_COMPLETED";
  const isRestDay = status === "REST_DAY";

  // Título e divisão sem repetição de "Em andamento"
  const headlineTitle = isError
    ? "Treino de hoje"
    : (dailyWorkoutResolution?.headlineTitle || "Treino de hoje");
  const divisionTitle = dailyWorkoutResolution?.divisionTitle || activeTraining?.title || "Ficha de treino";
  const routineTitle = dailyWorkoutResolution?.routineTitle || activeTraining?.title || "";
  const exerciseCount = isError
    ? 0
    : (dailyWorkoutResolution?.exerciseCount != null
        ? Number(dailyWorkoutResolution.exerciseCount)
        : (activeTraining?.blockCount ?? 0));
  const durationEstimate = isError
    ? null
    : (dailyWorkoutResolution?.estimatedDurationMinutes != null
        ? Number(dailyWorkoutResolution.estimatedDurationMinutes)
        : null);

  let trainingActionHref = dailyWorkoutResolution?.actionHref || `/consultoria/${consultancySlug}/treinos`;
  let trainingActionLabel = isSessionInProgress
    ? "Continuar treino"
    : isCompletedToday
    ? "Ver resumo do treino"
    : isRestDay
    ? "Escolher um treino"
    : (dailyWorkoutResolution?.actionLabel === "Iniciar treino" ? "Começar treino" : dailyWorkoutResolution?.actionLabel || "Começar treino");

  if ((!dailyWorkoutResolution || status === "ERROR") && hasTraining) {
    if (isSessionInProgress && activeSessionAssignmentPublicId) {
      trainingActionHref = `/consultoria/${consultancySlug}/treinos/${activeSessionAssignmentPublicId}`;
      trainingActionLabel = "Continuar treino";
    } else if (activeTraining?.workouts && activeTraining.workouts.length > 0) {
      trainingActionHref = `/consultoria/${consultancySlug}/treinos/${activeTraining.workouts[0].publicId}`;
      trainingActionLabel = "Começar treino";
    }
  }

  const unfinished = dailyWorkoutResolution?.unfinishedSession;
  const isUnfinishedAllDone = Boolean(
    unfinished &&
      ((unfinished.totalSetsCount > 0 &&
        unfinished.completedSetsCount >= unfinished.totalSetsCount) ||
        (unfinished.totalExercisesCount > 0 &&
          unfinished.completedExercisesCount >= unfinished.totalExercisesCount))
  );

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
      divisionTitle: divisionTitle,
      startedFormatted: dailyWorkoutResolution.activeSessionStartedFormatted || "Hoje",
      totalExercisesCount: exerciseCount,
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
      divisionTitle: divisionTitle,
      startedFormatted: dailyWorkoutResolution.activeSessionStartedFormatted || "Hoje",
    });
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
            {/* Cabeçalho do Card */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <DuotoneTrainingIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
                    {headlineTitle}
                  </h2>
                  <span className="text-xs text-zinc-500 dark:text-[#8E95A2]">
{isSessionInProgress ? (
                      dailyWorkoutResolution?.activeSessionStartedFormatted ? (
                        <span>{dailyWorkoutResolution.activeSessionStartedFormatted}</span>
                      ) : (
                        <span>Sessão em andamento</span>
                      )
                    ) : (
                      <span>
                        {dailyWorkoutResolution?.todayWeekdayName &&
                        dailyWorkoutResolution.todayWeekdayName !== "Hoje" &&
                        dailyWorkoutResolution.status !== "ERROR"
                          ? `${dailyWorkoutResolution.todayWeekdayName} · `
                          : ""}
                        Prescrição da consultoria
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Status Badge Real ÚNICO (sem repetição de status no card) */}
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
                ) : isRestDay ? (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                    Descanso
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                    Ativo
                  </span>
                )
              ) : (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  {trainingServiceEnabled ? "Sem ficha ativa" : "Não habilitado"}
                </span>
              )}
            </div>

            {/* Conteúdo Central */}
            {isError ? (
              <div className="p-4 rounded-xl bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/25 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-bold text-sm">
                  <svg className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Consulta de treino indisponível no momento</span>
                </div>
                <p className="text-xs text-amber-900/80 dark:text-amber-300/80 leading-relaxed">
                  {dailyWorkoutResolution?.contextNote || "Não foi possível carregar a programação do treino neste momento. Suas prescrições e histórico permanecem preservados."}
                </p>
              </div>
            ) : hasTraining ? (
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/80 dark:border-[#303238] space-y-3">
                {isRestDay ? (
                  <div className="p-3.5 rounded-xl bg-blue-500/10 dark:bg-blue-500/5 border border-blue-500/25 space-y-1.5">
                    <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-bold text-sm">
                      <span>Hoje não há treino programado.</span>
                    </div>
                    <p className="text-xs text-blue-900/80 dark:text-blue-200/80 leading-relaxed">
                      Hoje é dia de descanso. Você pode escolher e realizar outro treino da sua ficha sem alterar a programação semanal.
                    </p>
                  </div>
                ) : isCompletedToday ? (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/25 space-y-1.5">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                      <span>✓ Treino de hoje concluído!</span>
                    </div>
                    <p className="text-xs text-emerald-900/80 dark:text-emerald-200/80 leading-relaxed">
                      Você já realizou o treino previsto para hoje ({divisionTitle}).
                    </p>
                    {routineTitle && (
                      <p className="text-xs text-zinc-500 dark:text-[#8E95A2] mt-0.5">
                        Ficha: <strong className="font-semibold text-zinc-700 dark:text-zinc-300">{routineTitle}</strong>
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    {dailyWorkoutResolution?.unfinishedSession && (
                      <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                        Treino previsto para hoje
                      </span>
                    )}
                    {/* Nome da Divisão em Destaque Forte */}
                    <h3 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white tracking-tight">
                      {divisionTitle}
                    </h3>
                    {/* Nome da Ficha como Informação Secundária */}
                    {routineTitle && (
                      <p className="text-xs text-zinc-500 dark:text-[#8E95A2] mt-0.5">
                        Ficha: <strong className="font-semibold text-zinc-700 dark:text-zinc-300">{routineTitle}</strong>
                        {dailyWorkoutResolution?.versionNumber ? ` • Versão ${dailyWorkoutResolution.versionNumber}` : ""}
                      </p>
                    )}
                  </div>
                )}

                {/* Progresso Real da Sessão em Andamento */}
                {isSessionInProgress && (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span>
                      Progresso da sessão:{" "}
                      <strong>
                        {dailyWorkoutResolution?.completedExercisesCount ?? 0} de {exerciseCount}{" "}
                        {exerciseCount === 1 ? "exercício concluído" : "exercícios concluídos"}
                      </strong>
                      {(dailyWorkoutResolution?.completedSetsCount ?? 0) > 0 && (
                        <span className="text-zinc-500 dark:text-zinc-400 ml-1">
                          ({dailyWorkoutResolution?.completedSetsCount}{" "}
                          {dailyWorkoutResolution?.completedSetsCount === 1 ? "série gravada" : "séries gravadas"})
                        </span>
                      )}
                    </span>
                  </div>
                )}

                {/* Se houver sessão aberta anterior: mostrar separadamente com divisão e data real de início */}
                {unfinished && (
                  <div className="p-3.5 sm:p-4 rounded-xl bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/30 text-xs space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        <span>Treino não finalizado</span>
                      </span>
                      <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                        Iniciado em {unfinished.startedFormatted}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-amber-950 dark:text-amber-100">
                        {unfinished.divisionTitle}
                      </h4>
                      <p className="text-[11px] text-amber-900/80 dark:text-amber-200/80 mt-0.5">
                        Progresso:{" "}
                        <strong>
                          {unfinished.completedSetsCount} de {unfinished.totalSetsCount} séries concluídas
                        </strong>
                        {unfinished.totalExercisesCount > 0 && (
                          <span>
                            {" "}
                            ({unfinished.completedExercisesCount} de {unfinished.totalExercisesCount} exercícios)
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {isUnfinishedAllDone ? (
                        <>
                          <button
                            type="button"
                            onClick={handleOpenCompletionForUnfinished}
                            className="px-4 py-2 min-h-[44px] rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs select-none"
                          >
                            <span>✓ Finalizar treino</span>
                          </button>
                          <Link
                            href={unfinished.actionHref}
                            className="px-3.5 py-2 min-h-[44px] rounded-xl font-semibold text-xs bg-white dark:bg-[#1B1D21] hover:bg-zinc-100 dark:hover:bg-[#252830] text-amber-900 dark:text-amber-200 border border-amber-500/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <span>Continuar</span>
                            <span>→</span>
                          </Link>
                          <button
                            type="button"
                            onClick={handleOpenRestartForUnfinished}
                            className="px-3.5 py-2 min-h-[44px] rounded-xl font-semibold text-xs bg-white dark:bg-[#1B1D21] hover:bg-zinc-100 dark:hover:bg-[#252830] text-amber-900 dark:text-amber-200 border border-amber-500/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <span>Começar do início</span>
                          </button>
                          {dailyWorkoutResolution?.canChangeDivision && (
                            <button
                              type="button"
                              onClick={() => setIsPickerOpen(true)}
                              className="px-3.5 py-2 min-h-[44px] rounded-xl font-semibold text-xs bg-white dark:bg-[#1B1D21] hover:bg-zinc-100 dark:hover:bg-[#252830] text-amber-900 dark:text-amber-200 border border-amber-500/30 transition-colors cursor-pointer"
                            >
                              Escolher outro
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <Link
                            href={unfinished.actionHref}
                            className="px-4 py-2 min-h-[44px] rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs select-none"
                          >
                            <span>Continuar treino anterior</span>
                            <span>→</span>
                          </Link>
                          <button
                            type="button"
                            onClick={handleOpenCompletionForUnfinished}
                            className="px-3.5 py-2 min-h-[44px] rounded-xl font-semibold text-xs bg-white dark:bg-[#1B1D21] hover:bg-zinc-100 dark:hover:bg-[#252830] text-amber-900 dark:text-amber-200 border border-amber-500/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <span>Finalizar treino</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleOpenRestartForUnfinished}
                            className="px-3.5 py-2 min-h-[44px] rounded-xl font-semibold text-xs bg-white dark:bg-[#1B1D21] hover:bg-zinc-100 dark:hover:bg-[#252830] text-amber-900 dark:text-amber-200 border border-amber-500/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <span>Começar do início</span>
                          </button>
                          {dailyWorkoutResolution?.canChangeDivision && (
                            <button
                              type="button"
                              onClick={() => setIsPickerOpen(true)}
                              className="px-3.5 py-2 min-h-[44px] rounded-xl font-semibold text-xs bg-white dark:bg-[#1B1D21] hover:bg-zinc-100 dark:hover:bg-[#252830] text-amber-900 dark:text-amber-200 border border-amber-500/30 transition-colors cursor-pointer"
                            >
                              Escolher outro
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Resumo da Sessão */}
                <div className="flex flex-wrap items-center gap-2.5 text-xs text-zinc-600 dark:text-[#8E95A2] pt-2 border-t border-zinc-200/60 dark:border-[#303238]/60">
                  {exerciseCount > 0 && (
                    <span>
                      {exerciseCount} {exerciseCount === 1 ? "exercício" : "exercícios"}
                    </span>
                  )}
                  {durationEstimate !== null && durationEstimate > 0 && (
                    <>
                      {exerciseCount > 0 && <span>•</span>}
                      <span>
                        ~{durationEstimate} min{" "}
                        <span className="text-[11px] text-zinc-400">
                          (estimativa)
                        </span>
                      </span>
                    </>
                  )}
                  {dailyWorkoutResolution?.availableDivisions && dailyWorkoutResolution.availableDivisions.length > 1 && (
                    <>
                      <span>•</span>
                      <span>
                        {dailyWorkoutResolution.availableDivisions.length} divisões na ficha
                      </span>
                    </>
                  )}
                </div>

                {/* Nota Contextual */}
                {dailyWorkoutResolution?.contextNote && (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic pt-1">
                    {dailyWorkoutResolution.contextNote}
                  </p>
                )}
              </div>
            ) : (
              <div className="p-5 rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/80 dark:border-[#303238] text-center space-y-2">
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-[#8E95A2]">
                  {trainingServiceEnabled
                    ? "Seu treino ainda não foi disponibilizado. Sua equipe técnica está preparando sua prescrição personalizada."
                    : "O serviço de treinamento não está habilitado para o seu perfil nesta consultoria."}
                </p>
              </div>
            )}
          </div>

          {/* Ações do Card de Treino */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-t border-zinc-100 dark:border-[#303238]/80">
            {isError ? (
              <div className="flex flex-wrap items-center gap-2.5 w-full justify-between">
                <Link
                  href={`/consultoria/${consultancySlug}/treinos`}
                  className="px-4 min-h-[44px] rounded-xl font-bold text-xs sm:text-sm bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 flex items-center justify-center gap-2 transition-opacity cursor-pointer"
                >
                  Ver meus treinos
                </Link>
                <Link
                  href={`/consultoria/${consultancySlug}`}
                  className="px-3.5 min-h-[44px] rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1.5"
                >
                  Tentar novamente
                </Link>
              </div>
            ) : hasTraining ? (
              <div className="flex flex-wrap items-center gap-2.5 w-full justify-between">
                <div className="flex items-center gap-2 flex-wrap flex-1">
                  {/* Ação Principal e Secundárias de Execução */}
                  {isRestDay ? (
                    <button
                      type="button"
                      onClick={() => setIsPickerOpen(true)}
                      className="px-5 min-h-[44px] rounded-xl font-bold text-xs sm:text-sm bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer select-none"
                    >
                      <span>Escolher um treino</span>
                      <span>→</span>
                    </button>
                  ) : isCompletedToday ? (
                    <Link
                      href={trainingActionHref}
                      className="px-5 min-h-[44px] rounded-xl font-bold text-xs sm:text-sm bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer select-none"
                    >
                      <span>Ver resumo do treino</span>
                      <span>→</span>
                    </Link>
                  ) : isSessionInProgress ? (
                    <>
                      {isActiveSessionAllDone ? (
                        <>
                          <button
                            type="button"
                            onClick={handleOpenCompletionForActive}
                            className="px-5 min-h-[44px] rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer select-none"
                          >
                            <span>✓ Finalizar treino</span>
                          </button>
                          <Link
                            href={trainingActionHref}
                            className="px-4 min-h-[44px] rounded-xl font-semibold text-xs sm:text-sm bg-zinc-100 hover:bg-zinc-200 dark:bg-[#1B1D21] dark:hover:bg-[#252830] text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-[#303238] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <span>Continuar treino</span>
                            <span>→</span>
                          </Link>
                        </>
                      ) : (
                        <>
                          <Link
                            href={trainingActionHref}
                            className="px-5 min-h-[44px] rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer select-none"
                          >
                            <span className="w-2 h-2 rounded-full bg-white animate-ping shrink-0" />
                            <span>Continuar treino</span>
                            <span>→</span>
                          </Link>
                          <button
                            type="button"
                            onClick={handleOpenCompletionForActive}
                            className="px-3.5 min-h-[44px] rounded-xl font-semibold text-xs sm:text-sm bg-zinc-100 hover:bg-zinc-200 dark:bg-[#1B1D21] dark:hover:bg-[#252830] text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-[#303238] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <span>Finalizar treino</span>
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={handleOpenRestartForActive}
                        className="px-3.5 min-h-[44px] rounded-xl font-semibold text-xs sm:text-sm bg-zinc-100 hover:bg-zinc-200 dark:bg-[#1B1D21] dark:hover:bg-[#252830] text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-[#303238] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>Começar do início</span>
                      </button>
                    </>
                  ) : (
                    <Link
                      href={trainingActionHref}
                      className="px-5 min-h-[44px] rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer select-none"
                    >
                      <span>{trainingActionLabel}</span>
                      <span>→</span>
                    </Link>
                  )}

                  {/* Ação Secundária: Escolher Outro Dia (Abre Modal de Divisões) */}
                  {dailyWorkoutResolution?.canChangeDivision && !isRestDay && (
                    <button
                      type="button"
                      onClick={() => setIsPickerOpen(true)}
                      className="px-3.5 min-h-[44px] rounded-xl font-semibold text-xs sm:text-sm bg-zinc-100 hover:bg-zinc-200 dark:bg-[#1B1D21] dark:hover:bg-[#252830] text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-[#303238] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Escolher outro dia</span>
                    </button>
                  )}
                </div>

                {/* Link Secundário: Ver todos os treinos */}
                <Link
                  href={`/consultoria/${consultancySlug}/treinos`}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline py-2 cursor-pointer whitespace-nowrap"
                >
                  Ver meus treinos →
                </Link>
              </div>
            ) : (
              <Link
                href={`/consultoria/${consultancySlug}/consultas`}
                className="w-full min-h-[44px] rounded-xl font-semibold text-xs sm:text-sm bg-zinc-100 hover:bg-zinc-200 dark:bg-[#1B1D21] dark:hover:bg-[#252830] text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-[#303238] flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>Falar com treinador</span>
                <span>→</span>
              </Link>
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
            {/* Cabeçalho do Card */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <DuotoneNutritionIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
                    Minha Alimentação
                  </h2>
                  <span className="text-xs text-zinc-500 dark:text-[#8E95A2]">
                    Plano alimentar ativo
                  </span>
                </div>
              </div>

              {/* Status Real */}
              {hasNutrition ? (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                  {mealsCount} {mealsCount === 1 ? "refeição" : "refeições"}
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  {nutritionServiceEnabled ? "Sem plano ativo" : "Não habilitado"}
                </span>
              )}
            </div>

            {/* Conteúdo Central */}
            {hasNutrition ? (
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/80 dark:border-[#303238] space-y-3">
                {/* Identificação Segura: Paciente Destinatário vs Título da Prescrição */}
                <div className="space-y-1.5">
                  {activeNutrition?.studentName && (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
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
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500 block">
                      Título da Prescrição
                    </span>
                    <h3 className="text-base font-bold text-zinc-900 dark:text-white truncate">
                      {activeNutrition?.title}
                    </h3>
                    {activeNutrition?.subtitle && (
                      <p className="text-xs text-zinc-600 dark:text-[#8E95A2] mt-0.5 line-clamp-2">
                        {activeNutrition.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                {/* Lista de Refeições */}
                {meals.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-zinc-200/60 dark:border-[#303238]/60">
                    {meals.slice(0, 3).map((m, idx) => (
                      <div
                        key={m.publicId || idx}
                        className="flex items-center justify-between text-xs text-zinc-700 dark:text-zinc-300"
                      >
                        <span className="font-medium truncate">{m.title}</span>
                        {m.scheduledTime && (
                          <span className="text-zinc-400 dark:text-[#8E95A2] ml-2 text-[11px] shrink-0">
                            {m.scheduledTime}
                          </span>
                        )}
                      </div>
                    ))}
                    {meals.length > 3 && (
                      <p className="text-[11px] text-zinc-500 dark:text-[#8E95A2] pt-0.5">
                        + {meals.length - 3} refeições no cardápio
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-5 rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/80 dark:border-[#303238] text-center space-y-2">
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-[#8E95A2]">
                  {nutritionServiceEnabled
                    ? "Seu plano alimentar ainda não foi disponibilizado. Sua nutricionista está elaborando seu cardápio."
                    : "O serviço de nutrição não está habilitado para o seu perfil nesta consultoria."}
                </p>
              </div>
            )}
          </div>

          {/* Ações do Card de Alimentação: UMA ÚNICA AÇÃO CLARA */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-zinc-100 dark:border-[#303238]/80">
            {hasNutrition ? (
              <Link
                href={`/consultoria/${consultancySlug}/nutricao`}
                className="w-full sm:w-auto px-5 min-h-[44px] rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer select-none"
              >
                <span>Abrir plano alimentar</span>
                <span>→</span>
              </Link>
            ) : (
              <Link
                href={`/consultoria/${consultancySlug}/consultas`}
                className="w-full min-h-[44px] rounded-xl font-semibold text-xs sm:text-sm bg-zinc-100 hover:bg-zinc-200 dark:bg-[#1B1D21] dark:hover:bg-[#252830] text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-[#303238] flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>Falar com nutricionista</span>
                <span>→</span>
              </Link>
            )}
          </div>
        </div>
        )}
      </div>

      {/* Modal para Trocar de Divisão nesta Sessão */}
      {dailyWorkoutResolution?.assignmentPublicId && (
        <WorkoutDivisionPickerModal
          isOpen={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          consultancySlug={consultancySlug}
          assignmentPublicId={dailyWorkoutResolution.assignmentPublicId}
          divisions={dailyWorkoutResolution.availableDivisions}
          currentDivisionPublicId={dailyWorkoutResolution.targetBlockPublicId}
          hasActiveSession={isSessionInProgress}
        />
      )}

      {/* Modal para Finalizar Treino Diretamente com Relato Fiel */}
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

      {/* Modal para Reiniciar Execução com Confirmação e Preservação de Histórico */}
      {sessionToRestart && (
        <StudentWorkoutRestartModal
          key={`${sessionToRestart.assignmentPublicId}-${sessionToRestart.blockPublicId || "default"}`}
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
    </div>
  );
}
