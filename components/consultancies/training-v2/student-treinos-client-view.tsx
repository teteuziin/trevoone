"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { DailyWorkoutResolution } from "@/lib/training-v2/daily-workout-resolver";
import type { StudentWorkoutCardDto } from "@/lib/training-v2/assignment-repository";
import { WorkoutDivisionPickerModal } from "@/components/dashboard/student/sections/workout-division-picker-modal";
import { buildStudentWorkoutExecutionUrl } from "@/lib/training-v2/route-helpers";
import { DumbbellIcon as Dumbbell } from "@/components/ui/icons";

interface StudentTreinosClientViewProps {
  consultancySlug: string;
  consultancyName: string;
  dailyWorkout: DailyWorkoutResolution | null;
  assignments: StudentWorkoutCardDto[];
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
}: StudentTreinosClientViewProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const primaryAssignment = assignments[0] as StudentWorkoutCardDto | undefined;
  const secondaryAssignments = assignments.slice(1);

  const unfinishedSession = dailyWorkout?.unfinishedSession || null;

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
        <div className="p-5 sm:p-6 rounded-3xl bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/30 space-y-4 shadow-sm animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                Treino não finalizado
              </span>
            </div>
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
              Iniciado em {unfinishedSession.startedFormatted}
            </span>
          </div>

          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-black text-amber-950 dark:text-amber-100 tracking-tight">
              {unfinishedSession.divisionTitle}
            </h2>
            <p className="text-xs sm:text-sm text-amber-900/90 dark:text-amber-200/90 font-medium">
              Progresso salvo: <strong>{unfinishedSession.completedSetsCount} de {unfinishedSession.totalSetsCount} séries concluídas</strong>
              {unfinishedSession.totalExercisesCount > 0 && (
                <span> ({unfinishedSession.completedExercisesCount} de {unfinishedSession.totalExercisesCount} exercícios)</span>
              )}
            </p>
            <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 pt-0.5">
              Suas séries registradas anteriormente continuam salvas com total segurança. Você pode continuar esta sessão ou escolher outro treino.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href={unfinishedSession.actionHref}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-xs sm:text-sm bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white min-h-[48px] shadow-sm transition-colors cursor-pointer"
            >
              <span>Continuar treino anterior</span>
              <span>→</span>
            </Link>

            {dailyWorkout?.canChangeDivision && (
              <button
                type="button"
                onClick={() => setIsPickerOpen(true)}
                className="inline-flex items-center justify-center px-4 py-3 rounded-2xl font-semibold text-xs sm:text-sm bg-white dark:bg-[#1B1D21] hover:bg-zinc-100 dark:hover:bg-[#252830] text-amber-900 dark:text-amber-200 border border-amber-500/30 min-h-[48px] transition-colors cursor-pointer"
              >
                <span>Escolher outro treino</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. Treino Recomendado para Hoje (Destaque Principal) */}
      {dailyWorkout && dailyWorkout.assignmentPublicId && (
        <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#151619] border border-emerald-500/35 dark:border-emerald-500/25 shadow-sm space-y-4 depth-surface">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                {dailyWorkout.status === "IN_PROGRESS"
                  ? "Em andamento"
                  : dailyWorkout.status === "SCHEDULED_TODAY"
                  ? `Treino previsto para hoje (${dailyWorkout.todayWeekdayName})`
                  : dailyWorkout.status === "REST_DAY"
                  ? `Descanso (${dailyWorkout.todayWeekdayName})`
                  : dailyWorkout.headlineTitle}
              </span>
            </div>
            {dailyWorkout.exerciseCount != null && dailyWorkout.exerciseCount > 0 && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                {dailyWorkout.exerciseCount} {dailyWorkout.exerciseCount === 1 ? "exercício" : "exercícios"}
              </span>
            )}
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight font-heading">
              {dailyWorkout.divisionTitle}
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
              Ficha: <strong className="font-semibold text-[var(--text-primary)]">{dailyWorkout.routineTitle}</strong>
              {dailyWorkout.versionNumber ? ` • Versão ${dailyWorkout.versionNumber}` : ""}
            </p>
          </div>

          {dailyWorkout.contextNote && (
            <p className="text-xs text-[var(--text-secondary)] italic bg-[var(--surface-subtle)] p-3 rounded-xl border border-[var(--border-subtle)]">
              {dailyWorkout.contextNote}
            </p>
          )}

          {/* Ações: Começar treino (min-52px, verde Trevo One) + Escolher outro treino */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[var(--border-subtle)]">
            <Link
              href={dailyWorkout.actionHref}
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-extrabold text-sm sm:text-base text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 min-h-[52px] shadow-sm transition-all cursor-pointer flex-1 sm:flex-initial"
            >
              <span>{dailyWorkout.actionLabel || "Começar treino"}</span>
              <span>→</span>
            </Link>

            {dailyWorkout.canChangeDivision && (
              <button
                type="button"
                onClick={() => setIsPickerOpen(true)}
                className="inline-flex items-center justify-center px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm bg-[var(--surface-subtle)] hover:bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border-default)] min-h-[48px] transition-colors cursor-pointer"
              >
                <span>Escolher outro treino</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. Divisões da Ficha (Acesso Direto à Execução da Divisão Escolhida) */}
      {dailyWorkout?.availableDivisions && dailyWorkout.availableDivisions.length > 0 && primaryAssignment && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] font-heading">
                Divisões de Treino da Ficha
              </h2>
            </div>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {dailyWorkout.availableDivisions.length} {dailyWorkout.availableDivisions.length === 1 ? "divisão" : "divisões"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {dailyWorkout.availableDivisions.map((div, dIdx) => {
              const isTodayDiv = div.publicId === dailyWorkout.targetBlockPublicId;
              const isDoneToday = div.status === "COMPLETED_TODAY";
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
                      {isTodayDiv && (
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
                      isTodayDiv
                        ? "bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-xs"
                        : "bg-[var(--surface-subtle)] hover:bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border-default)]"
                    }`}
                  >
                    <span>{isTodayDiv ? "Treinar hoje" : "Treinar esta divisão"}</span>
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
      {dailyWorkout && dailyWorkout.availableDivisions && (
        <WorkoutDivisionPickerModal
          isOpen={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          consultancySlug={consultancySlug}
          assignmentPublicId={dailyWorkout.assignmentPublicId || primaryAssignment?.assignmentPublicId || ""}
          divisions={dailyWorkout.availableDivisions}
          currentDivisionPublicId={dailyWorkout.targetBlockPublicId}
          hasActiveSession={Boolean(unfinishedSession || dailyWorkout.status === "IN_PROGRESS")}
        />
      )}
    </div>
  );
}
