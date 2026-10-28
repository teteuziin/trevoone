"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DailyWorkoutResolution, DailyWorkoutDivisionOption } from "@/lib/training-v2/daily-workout-resolver";
import type { StudentWorkoutCardDto } from "@/lib/training-v2/assignment-repository";
import type { StudentWorkoutViewContract } from "@/lib/training-v2/types";
import { parseScheduledWeekdays, formatScheduledWeekdaysLabel } from "@/lib/training-v2/route-helpers";
import { WorkoutDivisionPickerModal } from "@/components/dashboard/student/sections/workout-division-picker-modal";
import { StudentWorkoutCompletionModal } from "@/components/dashboard/student/sections/student-workout-completion-modal";
import { StudentWorkoutRestartModal } from "@/components/dashboard/student/sections/student-workout-restart-modal";
import { SessionMoreOptionsMenu } from "@/components/dashboard/student/sections/session-more-options-menu";
import { buildStudentWorkoutExecutionUrl } from "@/lib/training-v2/route-helpers";
import { DumbbellIcon as Dumbbell } from "@/components/ui/icons";

interface StudentTreinosClientViewProps {
  consultancySlug: string;
  consultancyName: string;
  dailyWorkout: DailyWorkoutResolution | null;
  assignments: StudentWorkoutCardDto[];
  primaryWorkoutDetail?: StudentWorkoutViewContract | null;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  } catch {
    // fallback
  }
  return dateStr;
}

export function StudentTreinosClientView({
  consultancySlug,
  consultancyName,
  dailyWorkout,
  assignments,
  primaryWorkoutDetail = null,
}: StudentTreinosClientViewProps) {
  const router = useRouter();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [sessionToComplete, setSessionToComplete] = useState<{
    sessionPublicId: string;
    divisionTitle: string;
    startedFormatted?: string;
    totalExercisesCount: number;
    completedExercisesCount: number;
    totalSetsCount?: number;
    completedSetsCount?: number;
  } | null>(null);
  const [sessionToRestart, setSessionToRestart] = useState<{
    assignmentPublicId: string;
    blockPublicId?: string | null;
    divisionTitle: string;
    startedFormatted?: string;
  } | null>(null);

  const primaryAssignment = assignments[0] as StudentWorkoutCardDto | undefined;
  const secondaryAssignments = assignments.slice(1);

  const unfinishedSession = dailyWorkout?.unfinishedSession || null;

  const isUnfinishedAllDone = Boolean(
    unfinishedSession &&
      ((unfinishedSession.totalSetsCount > 0 &&
        unfinishedSession.completedSetsCount >= unfinishedSession.totalSetsCount) ||
        (unfinishedSession.totalExercisesCount > 0 &&
          unfinishedSession.completedExercisesCount >= unfinishedSession.totalExercisesCount))
  );

  const handleOpenCompletionForUnfinished = () => {
    if (!unfinishedSession) return;
    setSessionToComplete({
      sessionPublicId: unfinishedSession.sessionPublicId,
      divisionTitle: unfinishedSession.divisionTitle,
      startedFormatted: unfinishedSession.startedFormatted,
      totalExercisesCount: unfinishedSession.totalExercisesCount,
      completedExercisesCount: unfinishedSession.completedExercisesCount,
      totalSetsCount: unfinishedSession.totalSetsCount,
      completedSetsCount: unfinishedSession.completedSetsCount,
    });
  };

  const handleOpenRestartForUnfinished = () => {
    if (!unfinishedSession) return;
    setSessionToRestart({
      assignmentPublicId: unfinishedSession.assignmentPublicId,
      blockPublicId: unfinishedSession.blockPublicId,
      divisionTitle: unfinishedSession.divisionTitle,
      startedFormatted: unfinishedSession.startedFormatted,
    });
  };

  const handleOpenCompletionForActive = () => {
    if (!dailyWorkout?.activeSessionPublicId) return;
    setSessionToComplete({
      sessionPublicId: dailyWorkout.activeSessionPublicId,
      divisionTitle: effectiveRecommendedDivision?.divisionTitle || dailyWorkout.divisionTitle,
      startedFormatted: dailyWorkout.activeSessionStartedFormatted || "Hoje",
      totalExercisesCount: effectiveRecommendedDivision?.exerciseCount || 0,
      completedExercisesCount: dailyWorkout.completedExercisesCount ?? 0,
      totalSetsCount: dailyWorkout.totalSetsCount,
      completedSetsCount: dailyWorkout.completedSetsCount,
    });
  };

  const handleOpenRestartForActive = (targetBlockPublicId?: string | null, targetTitle?: string) => {
    const assignmentId = dailyWorkout?.assignmentPublicId || primaryAssignment?.assignmentPublicId;
    if (!assignmentId) return;
    setSessionToRestart({
      assignmentPublicId: assignmentId,
      blockPublicId: targetBlockPublicId ?? dailyWorkout?.targetBlockPublicId ?? null,
      divisionTitle: targetTitle || effectiveRecommendedDivision?.divisionTitle || "Ficha de treino",
      startedFormatted: dailyWorkout?.activeSessionStartedFormatted || undefined,
    });
  };

  const handleCompletionSuccess = () => {
    router.refresh();
  };

  const handleRestartSuccess = (targetBlockPublicId: string | null) => {
    const assignmentId =
      sessionToRestart?.assignmentPublicId || dailyWorkout?.assignmentPublicId;
    if (assignmentId) {
      router.push(
        buildStudentWorkoutExecutionUrl(consultancySlug, assignmentId, targetBlockPublicId)
      );
    }
    router.refresh();
  };

  // Derivação infalível das divisões da ficha: usa dailyWorkout ou primaryWorkoutDetail
  const derivedDivisions: DailyWorkoutDivisionOption[] = useMemo(() => {
    if (dailyWorkout?.availableDivisions && dailyWorkout.availableDivisions.length > 0) {
      return dailyWorkout.availableDivisions;
    }
    if (primaryWorkoutDetail?.blocks && primaryWorkoutDetail.blocks.length > 0) {
      const todayWeekday = new Date().getDay();
      return primaryWorkoutDetail.blocks.map((b, idx) => {
        const weekdays = parseScheduledWeekdays(b.title, b.instructions);
        const isScheduledToday = weekdays.includes(todayWeekday);
        return {
          publicId: b.publicId,
          blockIndex: idx,
          title: b.title || `Divisão ${String.fromCharCode(65 + idx)}`,
          scheduledDaysLabel: formatScheduledWeekdaysLabel(weekdays),
          scheduledWeekdays: weekdays,
          exerciseCount: b.items?.length || 0,
          status: isScheduledToday ? ("SCHEDULED_TODAY" as const) : ("AVAILABLE" as const),
        };
      });
    }
    return [];
  }, [dailyWorkout, primaryWorkoutDetail]);

  // Divisão recomendada para hoje infalível
  const effectiveRecommendedDivision = (() => {
    if (dailyWorkout && dailyWorkout.targetBlockPublicId && dailyWorkout.status !== "ERROR") {
      return {
        divisionTitle: dailyWorkout.divisionTitle,
        routineTitle: dailyWorkout.routineTitle,
        versionNumber: dailyWorkout.versionNumber,
        assignmentPublicId: dailyWorkout.assignmentPublicId,
        exerciseCount: dailyWorkout.exerciseCount,
        actionHref: dailyWorkout.actionHref,
        actionLabel: dailyWorkout.actionLabel || "Começar treino",
        contextNote: dailyWorkout.contextNote,
        todayWeekdayName: dailyWorkout.todayWeekdayName,
        status: dailyWorkout.status,
        canChangeDivision: dailyWorkout.canChangeDivision || derivedDivisions.length > 1,
      };
    }
    if (primaryAssignment && derivedDivisions.length > 0) {
      const todayWeekday = new Date().getDay();
      const match = derivedDivisions.find((d) => d.scheduledWeekdays.includes(todayWeekday)) || derivedDivisions[0];
      return {
        divisionTitle: match.title,
        routineTitle: primaryAssignment.workoutTitle,
        versionNumber: primaryAssignment.versionNumber,
        assignmentPublicId: primaryAssignment.assignmentPublicId,
        exerciseCount: match.exerciseCount,
        actionHref: buildStudentWorkoutExecutionUrl(consultancySlug, primaryAssignment.assignmentPublicId, match.publicId),
        actionLabel: "Começar treino",
        contextNote: match.scheduledDaysLabel ? `Programado para ${match.scheduledDaysLabel}.` : "Divisão pronta para realização.",
        todayWeekdayName: "",
        status: "SCHEDULED_TODAY" as const,
        canChangeDivision: derivedDivisions.length > 1,
      };
    }
    return null;
  })();

  const isActiveSessionAllDone = Boolean(
    dailyWorkout?.status === "IN_PROGRESS" &&
      ((dailyWorkout?.totalSetsCount &&
        (dailyWorkout?.completedSetsCount ?? 0) >= dailyWorkout.totalSetsCount) ||
        ((effectiveRecommendedDivision?.exerciseCount ?? 0) > 0 &&
          (dailyWorkout?.completedExercisesCount ?? 0) >= (effectiveRecommendedDivision?.exerciseCount ?? 0)))
  );

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-20 overflow-x-hidden">
      {/* 1. Header Compacto */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div>
          <Link
            href={`/consultoria/${consultancySlug}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-subtle)] hover:bg-[var(--surface)] border border-[var(--border-subtle)] transition-all min-h-[44px]"
          >
            ← Voltar ao painel
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight font-heading mt-2">
            Meus treinos
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            {consultancyName} • Acompanhe e execute suas fichas prescritas
          </p>
        </div>
      </div>

      {/* 2. Treino Não Finalizado (se houver sessão aberta de data anterior) */}
      {unfinishedSession && (
        <div className="p-4 sm:p-5 rounded-xl bg-amber-500/8 dark:bg-amber-500/5 border border-amber-500/25 space-y-3.5 text-left">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                Treino não finalizado
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white tracking-tight leading-snug">
              {unfinishedSession.divisionTitle}
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Iniciado em {unfinishedSession.startedFormatted}
            </p>
          </div>

          {/* Progresso sem repetição de números */}
          <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {isUnfinishedAllDone ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                <span>✓</span>
                <span>Todas as séries concluídas. Falta finalizar o treino.</span>
              </span>
            ) : (
              <span>
                Progresso:{" "}
                <strong>
                  {unfinishedSession.completedSetsCount} de {unfinishedSession.totalSetsCount} séries concluídas
                </strong>
                {unfinishedSession.totalExercisesCount > 0 && (
                  <span className="text-zinc-600 dark:text-zinc-400 ml-1">
                    ({unfinishedSession.completedExercisesCount} de {unfinishedSession.totalExercisesCount} exercícios)
                  </span>
                )}
              </span>
            )}
          </div>

          {/* Ações da Sessão Anterior */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
            {isUnfinishedAllDone ? (
              <>
                <button
                  type="button"
                  onClick={handleOpenCompletionForUnfinished}
                  className="w-full sm:w-auto px-5 py-3 min-h-[48px] sm:min-h-[50px] rounded-xl font-bold text-sm sm:text-base bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs select-none"
                >
                  <span>✓ Finalizar treino</span>
                </button>
                <Link
                  href={unfinishedSession.actionHref}
                  className="w-full sm:w-auto px-4 py-2.5 min-h-[48px] rounded-xl font-semibold text-sm bg-white dark:bg-[#151619] hover:bg-zinc-100 dark:hover:bg-[#252830] text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center select-none"
                >
                  <span>Ver treino</span>
                  <span>→</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href={unfinishedSession.actionHref}
                  className="w-full sm:w-auto px-5 py-3 min-h-[48px] sm:min-h-[50px] rounded-xl font-bold text-sm sm:text-base bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs select-none"
                >
                  <span>Continuar treino</span>
                  <span>→</span>
                </Link>
                <button
                  type="button"
                  onClick={handleOpenCompletionForUnfinished}
                  className="w-full sm:w-auto px-4 py-2.5 min-h-[48px] rounded-xl font-semibold text-sm bg-white dark:bg-[#151619] hover:bg-zinc-100 dark:hover:bg-[#252830] text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none"
                >
                  <span>Finalizar treino</span>
                </button>
              </>
            )}

            <SessionMoreOptionsMenu onRestart={handleOpenRestartForUnfinished} />
          </div>
        </div>
      )}

      {/* 3. Treino Recomendado para Hoje (Destaque Principal) */}
      {effectiveRecommendedDivision && effectiveRecommendedDivision.assignmentPublicId && (
        <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#151619] border border-emerald-500/35 dark:border-emerald-500/25 shadow-sm space-y-4 depth-surface">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                {effectiveRecommendedDivision.status === "IN_PROGRESS"
                  ? "Em andamento"
                  : effectiveRecommendedDivision.status === "SCHEDULED_TODAY"
                  ? `Treino previsto para hoje ${effectiveRecommendedDivision.todayWeekdayName ? `(${effectiveRecommendedDivision.todayWeekdayName})` : ""}`
                  : effectiveRecommendedDivision.status === "REST_DAY"
                  ? `Descanso ${effectiveRecommendedDivision.todayWeekdayName ? `(${effectiveRecommendedDivision.todayWeekdayName})` : ""}`
                  : "Treino do dia"}
              </span>
            </div>
            {effectiveRecommendedDivision.exerciseCount != null && effectiveRecommendedDivision.exerciseCount > 0 && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                {effectiveRecommendedDivision.exerciseCount} {effectiveRecommendedDivision.exerciseCount === 1 ? "exercício" : "exercícios"}
              </span>
            )}
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight font-heading">
              {effectiveRecommendedDivision.divisionTitle}
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
              Ficha: <strong className="font-semibold text-[var(--text-primary)]">{effectiveRecommendedDivision.routineTitle}</strong>
            </p>
          </div>

          {effectiveRecommendedDivision.contextNote && (
            <p className="text-xs text-[var(--text-secondary)] italic bg-[var(--surface-subtle)] p-3 rounded-xl border border-[var(--border-subtle)]">
              {effectiveRecommendedDivision.contextNote}
            </p>
          )}

          {/* Ações: Começar treino (min-52px, verde Trevo One) + Escolher outro treino */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[var(--border-subtle)]">
            {effectiveRecommendedDivision.status === "IN_PROGRESS" ? (
              isActiveSessionAllDone ? (
                <>
                  <button
                    type="button"
                    onClick={handleOpenCompletionForActive}
                    className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-extrabold text-sm sm:text-base text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 min-h-[52px] shadow-sm transition-all cursor-pointer flex-1 sm:flex-initial select-none"
                  >
                    <span>✓ Finalizar treino</span>
                  </button>
                  <Link
                    href={effectiveRecommendedDivision.actionHref}
                    className="inline-flex items-center justify-center px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm bg-[var(--surface-subtle)] hover:bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border-default)] min-h-[48px] transition-colors cursor-pointer select-none"
                  >
                    <span>Ver treino</span>
                    <span>→</span>
                  </Link>
                  <SessionMoreOptionsMenu onRestart={() => handleOpenRestartForActive()} />
                </>
              ) : (
                <>
                  <Link
                    href={effectiveRecommendedDivision.actionHref}
                    className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-extrabold text-sm sm:text-base text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 min-h-[52px] shadow-sm transition-all cursor-pointer flex-1 sm:flex-initial select-none"
                  >
                    <span className="w-2 h-2 rounded-full bg-white animate-ping shrink-0" />
                    <span>Continuar treino</span>
                    <span>→</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleOpenCompletionForActive}
                    className="inline-flex items-center justify-center px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm bg-[var(--surface-subtle)] hover:bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border-default)] min-h-[48px] transition-colors cursor-pointer select-none"
                  >
                    <span>Finalizar treino</span>
                  </button>
                  <SessionMoreOptionsMenu onRestart={() => handleOpenRestartForActive()} />
                </>
              )
            ) : effectiveRecommendedDivision.status === "COMPLETED_TODAY" ? (
              <>
                <button
                  type="button"
                  onClick={() => handleOpenRestartForActive()}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-extrabold text-sm sm:text-base text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 min-h-[52px] shadow-sm transition-all cursor-pointer flex-1 sm:flex-initial select-none"
                >
                  <span>Treinar novamente</span>
                  <span>→</span>
                </button>
                <Link
                  href={effectiveRecommendedDivision.actionHref}
                  className="inline-flex items-center justify-center px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm bg-[var(--surface-subtle)] hover:bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border-default)] min-h-[48px] transition-colors cursor-pointer select-none"
                >
                  <span>Ver resumo</span>
                </Link>
                <SessionMoreOptionsMenu onRestart={() => handleOpenRestartForActive()} />
              </>
            ) : (
              <>
                <Link
                  href={effectiveRecommendedDivision.actionHref}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-extrabold text-sm sm:text-base text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 min-h-[52px] shadow-sm transition-all cursor-pointer flex-1 sm:flex-initial select-none"
                >
                  <span>{effectiveRecommendedDivision.actionLabel || "Começar treino"}</span>
                  <span>→</span>
                </Link>
                <SessionMoreOptionsMenu onRestart={() => handleOpenRestartForActive()} />
              </>
            )}

            {effectiveRecommendedDivision.canChangeDivision && (
              <button
                type="button"
                onClick={() => setIsPickerOpen(true)}
                className="inline-flex items-center justify-center px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm bg-[var(--surface-subtle)] hover:bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border-default)] min-h-[48px] transition-colors cursor-pointer select-none"
              >
                <span>Escolher outro treino</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. Divisões da Ficha (Acesso Direto à Execução da Divisão Escolhida) */}
      {derivedDivisions.length > 0 && primaryAssignment && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] font-heading">
                Divisões de Treino da Ficha
              </h2>
            </div>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {derivedDivisions.length} {derivedDivisions.length === 1 ? "divisão" : "divisões"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {derivedDivisions.map((div, dIdx) => {
              const isTodayDiv = div.publicId === effectiveRecommendedDivision?.assignmentPublicId || div.status === "SCHEDULED_TODAY";
              const isDoneToday = div.status === "COMPLETED_TODAY";
              const isInProgress = div.status === "IN_PROGRESS";
              const href = buildStudentWorkoutExecutionUrl(
                consultancySlug,
                primaryAssignment.assignmentPublicId,
                div.publicId
              );

              return (
                <div
                  key={div.publicId}
                  className={`p-5 rounded-3xl border transition-all depth-surface flex flex-col justify-between space-y-4 ${
                    isTodayDiv
                      ? "bg-white dark:bg-[#151619] border-emerald-500/50 shadow-sm ring-1 ring-emerald-500/25"
                      : "bg-[var(--surface)] border-[var(--border-default)]"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center">
                        {String.fromCharCode(65 + dIdx)}
                      </span>
                      {isInProgress && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Em andamento
                        </span>
                      )}
                      {isTodayDiv && !isInProgress && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                          Previsto para hoje
                        </span>
                      )}
                      {isDoneToday && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          ✓ Realizado hoje
                        </span>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-black text-[var(--text-primary)] tracking-tight">
                      {div.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                      {div.scheduledDaysLabel && (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {div.scheduledDaysLabel}
                        </span>
                      )}
                      <span>•</span>
                      <span>
                        {div.exerciseCount} {div.exerciseCount === 1 ? "exercício" : "exercícios"}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={href}
                    className={`w-full min-h-[48px] rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isTodayDiv || isInProgress
                        ? "bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-xs"
                        : "bg-[var(--surface-subtle)] hover:bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border-default)]"
                    }`}
                  >
                    <span>
                      {isInProgress
                        ? "Continuar treino"
                        : isDoneToday
                        ? "Treinar novamente"
                        : isTodayDiv
                        ? "Treinar hoje"
                        : "Treinar esta divisão"}
                    </span>
                    <span>→</span>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Ficha Principal com Metadados */}
      {primaryAssignment && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] font-heading">
                Ficha Prescrita Atual
              </h2>
            </div>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Versão {primaryAssignment.versionNumber}
            </span>
          </div>

          <div className="p-6 sm:p-7 rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-5 depth-surface">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-primary)]">
                    {primaryAssignment.blockCount} {primaryAssignment.blockCount === 1 ? "divisão" : "divisões"} de treino
                  </span>
                  {primaryAssignment.difficultyLevel && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                      Nível {primaryAssignment.difficultyLevel === "BEGINNER"
                        ? "Iniciante"
                        : primaryAssignment.difficultyLevel === "ADVANCED"
                          ? "Avançado"
                          : "Intermediário"}
                    </span>
                  )}
                </div>

                <h3 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight font-heading">
                  {primaryAssignment.workoutTitle}
                </h3>
                {primaryAssignment.subtitle && (
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium">
                    {primaryAssignment.subtitle}
                  </p>
                )}
              </div>

              <div className="shrink-0">
                <Link
                  href={buildStudentWorkoutExecutionUrl(consultancySlug, primaryAssignment.assignmentPublicId)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-xs sm:text-sm text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 min-h-[48px] transition-colors cursor-pointer"
                >
                  <span>Abrir treino →</span>
                </Link>
              </div>
            </div>

            {/* Objetivo */}
            {primaryAssignment.objective && (
              <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Objetivo
                </span>
                <p className="text-xs sm:text-sm font-medium text-[var(--text-primary)] leading-relaxed">
                  {primaryAssignment.objective}
                </p>
              </div>
            )}

            {/* Metadados */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1 border-t border-[var(--border-subtle)]">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-semibold text-[var(--text-primary)]">
                <Dumbbell className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
                {primaryAssignment.blockCount} {primaryAssignment.blockCount === 1 ? "divisão prescrita" : "divisões prescritas"}
              </span>
              <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-medium text-[var(--text-secondary)]">
                Início: {formatDate(primaryAssignment.startsOn)}
              </span>
              {primaryAssignment.endsOn && (
                <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-medium text-[var(--text-secondary)]">
                  Término: {formatDate(primaryAssignment.endsOn)}
                </span>
              )}
            </div>

            {/* Orientações do Treinador */}
            {primaryAssignment.notesForStudent && (
              <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 text-xs text-[var(--text-primary)] space-y-1">
                <p className="font-bold text-emerald-700 dark:text-emerald-400">
                  Orientações do seu treinador:
                </p>
                <p className="text-[var(--text-secondary)] italic leading-relaxed">
                  &ldquo;{primaryAssignment.notesForStudent}&rdquo;
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Outras Rotinas Prescritas (se houver) */}
      {secondaryAssignments.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] font-heading">
              Outras Fichas & Rotinas
            </h2>
            <span className="text-xs font-semibold text-[var(--text-tertiary)]">
              {secondaryAssignments.length} {secondaryAssignments.length === 1 ? "opção" : "opções"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {secondaryAssignments.map((assignment) => (
              <div
                key={assignment.assignmentPublicId}
                className="p-5 sm:p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs flex flex-col justify-between space-y-4 depth-surface"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-primary)]">
                      Versão {assignment.versionNumber}
                    </span>
                    {assignment.difficultyLevel && (
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        {assignment.difficultyLevel === "BEGINNER"
                          ? "Iniciante"
                          : assignment.difficultyLevel === "ADVANCED"
                            ? "Avançado"
                            : "Intermediário"}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-[var(--text-primary)] font-heading">
                    {assignment.workoutTitle}
                  </h3>
                  {assignment.subtitle && (
                    <p className="text-xs text-[var(--text-secondary)]">
                      {assignment.subtitle}
                    </p>
                  )}
                  {assignment.objective && (
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                      <strong className="text-[var(--text-primary)]">Objetivo: </strong>
                      {assignment.objective}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-[var(--border-subtle)] space-y-3">
                  <span className="text-xs text-[var(--text-secondary)] block">
                    {assignment.blockCount} {assignment.blockCount === 1 ? "divisão" : "divisões"} • Início: {formatDate(assignment.startsOn)}
                  </span>
                  <Link
                    href={buildStudentWorkoutExecutionUrl(consultancySlug, assignment.assignmentPublicId)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-500 min-h-[44px] transition-colors cursor-pointer"
                  >
                    Acessar este treino →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Escolha de Divisão ("Escolher outro treino") */}
      {derivedDivisions.length > 0 && (
        <WorkoutDivisionPickerModal
          isOpen={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          consultancySlug={consultancySlug}
          assignmentPublicId={primaryAssignment?.assignmentPublicId || dailyWorkout?.assignmentPublicId || ""}
          divisions={derivedDivisions}
          currentDivisionPublicId={effectiveRecommendedDivision?.assignmentPublicId ? dailyWorkout?.targetBlockPublicId || null : null}
          hasActiveSession={Boolean(unfinishedSession || dailyWorkout?.status === "IN_PROGRESS")}
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
    </div>
  );
}
