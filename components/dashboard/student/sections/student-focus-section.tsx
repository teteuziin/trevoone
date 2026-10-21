"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  DuotoneTrainingIcon,
  DuotoneNutritionIcon,
} from "@/components/ui/icons/duotone-icons";
import type { DailyWorkoutResolution } from "@/lib/training-v2/daily-workout-resolver";
import { WorkoutDivisionPickerModal } from "./workout-division-picker-modal";

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
}: StudentFocusSectionProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const hasTraining = Boolean(dailyWorkoutResolution?.assignmentPublicId || activeTraining);

  // Status tag e cores contextuais de Treino
  const status = dailyWorkoutResolution?.status;
  const isSessionInProgress = status === "IN_PROGRESS" || hasActiveSession;
  const isCompletedToday = status === "COMPLETED_TODAY" || status === "SEQUENCE_COMPLETED";
  const isRestDay = status === "REST_DAY";

  const headlineTitle = dailyWorkoutResolution?.headlineTitle || (isSessionInProgress ? "Treino em andamento" : "Meu Treino");
  const divisionTitle = dailyWorkoutResolution?.divisionTitle || activeTraining?.title || "Ficha de treino";
  const routineTitle = dailyWorkoutResolution?.routineTitle || activeTraining?.title || "";
  const exerciseCount = dailyWorkoutResolution?.exerciseCount ?? activeTraining?.blockCount ?? 0;
  const durationEstimate = dailyWorkoutResolution?.estimatedDurationMinutes || 40;

  let trainingActionHref = dailyWorkoutResolution?.actionHref || `/consultoria/${consultancySlug}/treinos`;
  let trainingActionLabel = dailyWorkoutResolution?.actionLabel || "Iniciar treino";

  if (!dailyWorkoutResolution && hasTraining) {
    if (isSessionInProgress && activeSessionAssignmentPublicId) {
      trainingActionHref = `/consultoria/${consultancySlug}/treinos/${activeSessionAssignmentPublicId}`;
      trainingActionLabel = "Continuar treino";
    }
  }

  const hasNutrition = Boolean(activeNutrition);
  const meals = activeNutrition?.meals || [];
  const mealsCount = activeNutrition?.mealsCount || meals.length;

  return (
    <div className="w-full">
      {/* Grid: 2 Colunas no Desktop, 1 Coluna no Smartphone */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* ================================================================= */}
        {/* PAINEL 1: MEU TREINO (Ação Principal com Divisão do Dia)           */}
        {/* ================================================================= */}
        <div className="rounded-2xl bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] shadow-sm p-5 sm:p-6 flex flex-col justify-between space-y-4 transition-colors">
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
                    {dailyWorkoutResolution?.todayWeekdayName ? `${dailyWorkoutResolution.todayWeekdayName} · ` : ""}
                    Prescrição da consultoria
                  </span>
                </div>
              </div>

              {/* Status Badge Real */}
              {hasTraining ? (
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
            {hasTraining ? (
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/80 dark:border-[#303238] space-y-2.5">
                <div>
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

                {/* Resumo da Sessão */}
                <div className="flex flex-wrap items-center gap-2.5 text-xs text-zinc-600 dark:text-[#8E95A2] pt-2 border-t border-zinc-200/60 dark:border-[#303238]/60">
                  {exerciseCount > 0 && (
                    <span>
                      {exerciseCount} {exerciseCount === 1 ? "exercício" : "exercícios"}
                    </span>
                  )}
                  {durationEstimate > 0 && (
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
            {hasTraining ? (
              <div className="flex flex-wrap items-center gap-2.5 w-full justify-between">
                <div className="flex items-center gap-2 flex-wrap flex-1">
                  {/* Ação Principal: Iniciar / Continuar / Treinar Novamente */}
                  <Link
                    href={trainingActionHref}
                    className="px-5 min-h-[44px] rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer select-none"
                  >
                    {isSessionInProgress && (
                      <span className="w-2 h-2 rounded-full bg-white animate-ping shrink-0" />
                    )}
                    <span>{trainingActionLabel}</span>
                    <span>→</span>
                  </Link>

                  {/* Ação Secundária: Escolher Outro Treino (Abre Modal de Divisões) */}
                  {dailyWorkoutResolution?.canChangeDivision && (
                    <button
                      type="button"
                      onClick={() => setIsPickerOpen(true)}
                      className="px-3.5 min-h-[44px] rounded-xl font-semibold text-xs sm:text-sm bg-zinc-100 hover:bg-zinc-200 dark:bg-[#1B1D21] dark:hover:bg-[#252830] text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-[#303238] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Escolher outro treino</span>
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

        {/* ================================================================= */}
        {/* PAINEL 2: MINHA ALIMENTAÇÃO (Ação Principal Única Clara)           */}
        {/* ================================================================= */}
        <div className="rounded-2xl bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] shadow-sm p-5 sm:p-6 flex flex-col justify-between space-y-4 transition-colors">
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
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/80 dark:border-[#303238] space-y-2.5">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white truncate">
                    {activeNutrition?.title}
                  </h3>
                  {activeNutrition?.subtitle && (
                    <p className="text-xs text-zinc-600 dark:text-[#8E95A2] mt-0.5 line-clamp-2">
                      {activeNutrition.subtitle}
                    </p>
                  )}
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
        />
      )}
    </div>
  );
}
