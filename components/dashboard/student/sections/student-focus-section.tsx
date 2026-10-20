"use client";

import React from "react";
import Link from "next/link";
import {
  DuotoneTrainingIcon,
  DuotoneNutritionIcon,
} from "@/components/ui/icons/duotone-icons";

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
}

export function StudentFocusSection({
  consultancySlug,
  activeTraining,
  hasActiveSession = false,
  activeSessionAssignmentPublicId,
  trainingServiceEnabled = true,
  activeNutrition,
  nutritionServiceEnabled = true,
}: StudentFocusSectionProps) {
  const hasTraining = Boolean(activeTraining);
  const routines = activeTraining?.workouts || [];
  const routinesCount = routines.length > 0 ? routines.length : hasTraining ? 1 : 0;
  const primaryRoutine = routines[0] || null;

  // Determinação segura da ação principal de treino
  let trainingActionHref = `/consultoria/${consultancySlug}/treinos`;
  let trainingActionLabel = "Ver treinos";

  if (hasTraining) {
    if (hasActiveSession && activeSessionAssignmentPublicId) {
      trainingActionHref = `/consultoria/${consultancySlug}/treinos/${activeSessionAssignmentPublicId}`;
      trainingActionLabel = "Continuar treino";
    } else if (routinesCount === 1 && primaryRoutine?.publicId) {
      trainingActionHref = `/consultoria/${consultancySlug}/treinos/${primaryRoutine.publicId}`;
      trainingActionLabel = "Iniciar treino";
    } else if (routinesCount > 1) {
      trainingActionHref = `/consultoria/${consultancySlug}/treinos`;
      trainingActionLabel = "Escolher treino";
    } else {
      trainingActionHref = `/consultoria/${consultancySlug}/treinos`;
      trainingActionLabel = "Iniciar treino";
    }
  }

  const hasNutrition = Boolean(activeNutrition);
  const meals = activeNutrition?.meals || [];
  const mealsCount = activeNutrition?.mealsCount || meals.length;

  return (
    <div className="w-full">
      {/* Grid: 2 Colunas lado a lado no Desktop, 1 Coluna no Smartphone */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* ================================================================= */}
        {/* PAINEL 1: MEU TREINO                                              */}
        {/* ================================================================= */}
        <div className="rounded-2xl bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] shadow-sm p-5 sm:p-6 flex flex-col justify-between space-y-5 transition-colors">
          <div className="space-y-4">
            {/* Cabeçalho do Card */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <DuotoneTrainingIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white">
                    Meu Treino
                  </h2>
                  <span className="text-xs text-zinc-500 dark:text-[#8E95A2]">
                    Prescrição da consultoria
                  </span>
                </div>
              </div>

              {/* Status Real */}
              {hasTraining ? (
                hasActiveSession ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Em andamento</span>
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
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white truncate">
                    {activeTraining?.title}
                  </h3>
                  {activeTraining?.subtitle && (
                    <p className="text-xs text-zinc-600 dark:text-[#8E95A2] mt-0.5 line-clamp-2">
                      {activeTraining.subtitle}
                    </p>
                  )}
                </div>

                {/* Detalhes da rotina com duração claramente identificada como estimativa */}
                <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-600 dark:text-[#8E95A2] pt-1 border-t border-zinc-200/60 dark:border-[#303238]/60">
                  <span>
                    {routinesCount === 1 ? "1 rotina" : `${routinesCount} rotinas`}
                  </span>
                  {primaryRoutine?.estimatedDurationMinutes && (
                    <>
                      <span>•</span>
                      <span>
                        ~{primaryRoutine.estimatedDurationMinutes} min{" "}
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          (estimativa)
                        </span>
                      </span>
                    </>
                  )}
                  {primaryRoutine?.blockCount && primaryRoutine.blockCount > 0 && (
                    <>
                      <span>•</span>
                      <span>
                        {primaryRoutine.blockCount}{" "}
                        {primaryRoutine.blockCount === 1 ? "bloco" : "blocos"}
                      </span>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-xl bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200/80 dark:border-[#303238] text-center space-y-2">
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-[#8E95A2]">
                  {trainingServiceEnabled
                    ? "Seu treino ainda não foi disponibilizado. Sua equipe está preparando sua prescrição personalizada."
                    : "O serviço de treinamento não está habilitado para o seu perfil nesta consultoria."}
                </p>
              </div>
            )}
          </div>

          {/* Ações do Card */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-zinc-100 dark:border-[#303238]/80">
            {hasTraining ? (
              <>
                <Link
                  href={trainingActionHref}
                  className="px-5 min-h-[44px] rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer select-none"
                >
                  {hasActiveSession && (
                    <span className="w-2 h-2 rounded-full bg-white animate-ping shrink-0" />
                  )}
                  <span>{trainingActionLabel}</span>
                  <span>→</span>
                </Link>
                <Link
                  href={`/consultoria/${consultancySlug}/treinos`}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline text-center sm:text-right py-2 cursor-pointer"
                >
                  Ver meus treinos →
                </Link>
              </>
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
        {/* PAINEL 2: MINHA ALIMENTAÇÃO                                       */}
        {/* ================================================================= */}
        <div className="rounded-2xl bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] shadow-sm p-5 sm:p-6 flex flex-col justify-between space-y-5 transition-colors">
          <div className="space-y-4">
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

                {/* Resumo compacto das primeiras refeições com horários quando disponíveis */}
                {meals.length > 0 && (
                  <div className="pt-2 border-t border-zinc-200/60 dark:border-[#303238]/60 space-y-1.5">
                    {meals.slice(0, 3).map((meal, idx) => (
                      <div
                        key={meal.publicId || idx}
                        className="flex items-center justify-between text-xs text-zinc-700 dark:text-zinc-300"
                      >
                        <span className="truncate font-medium">{meal.title}</span>
                        {meal.scheduledTime && (
                          <span className="text-[11px] font-mono text-zinc-500 dark:text-[#8E95A2] shrink-0 ml-2">
                            {meal.scheduledTime}
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

          {/* Ações do Card */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-zinc-100 dark:border-[#303238]/80">
            {hasNutrition ? (
              <>
                <Link
                  href={`/consultoria/${consultancySlug}/nutricao`}
                  className="px-5 min-h-[44px] rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer select-none"
                >
                  <span>Abrir plano</span>
                  <span>→</span>
                </Link>
                <Link
                  href={`/consultoria/${consultancySlug}/nutricao`}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline text-center sm:text-right py-2 cursor-pointer"
                >
                  Ver cardápio completo →
                </Link>
              </>
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
    </div>
  );
}
