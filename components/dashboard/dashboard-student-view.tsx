"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DailyCheckinWidget } from "@/components/checkin/daily-checkin-widget";
import { Section, ListRow } from "@/components/ui/design-system";
import { MobileDashboardCockpit } from "./mobile-dashboard-cockpit";
import type { DailyCheckinRecord } from "@/lib/checkins/service";
import type { CheckinRequestDetailDto } from "@/lib/nutrition-v2/checkin-types";

export interface StudentWorkoutRoutineSummary {
  publicId?: string;
  title: string;
  subtitle?: string | null;
  blockCount?: number;
  estimatedDurationMinutes?: number | null;
  difficultyLevel?: string | null;
}

export interface StudentActiveTrainingSummary {
  title: string;
  subtitle?: string | null;
  workoutCount?: number;
  totalExercises?: number;
  blockCount?: number;
  workouts?: StudentWorkoutRoutineSummary[];
}

export interface StudentActiveNutritionMealSummary {
  publicId?: string;
  title: string;
  scheduledTime?: string | null;
  itemsCount?: number;
}

export interface StudentActiveNutritionSummary {
  title: string;
  subtitle?: string | null;
  mealsCount?: number;
  firstMealTime?: string | null;
  meals?: StudentActiveNutritionMealSummary[];
}

interface StudentOnboardingInfo {
  applicable: boolean;
  isComplete: boolean;
  confirmedRequirements: number;
  totalRequirements: number;
}

interface LatestProgressInfo {
  recordedOn: string;
  weightKg: number | null;
  waistCm?: number | null;
  abdomenCm?: number | null;
  hipCm?: number | null;
  armCm?: number | null;
  thighCm?: number | null;
}

interface DashboardStudentViewProps {
  consultancySlug: string;
  consultancyName?: string;
  userName?: string;
  onboarding: StudentOnboardingInfo | null;
  activeTrainingPlan: StudentActiveTrainingSummary | null;
  activeNutritionPlan: StudentActiveNutritionSummary | null;
  latestProgress: LatestProgressInfo | null;
  previousProgress?: LatestProgressInfo | null;
  pendingPhotoEvaluation?: boolean;
  todayCheckin?: DailyCheckinRecord | null;
  pendingNutritionCheckin?: CheckinRequestDetailDto | null;
}

function formatDate(dateStr: string): string {
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

function getFirstName(fullName?: string): string {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  return parts[0] || "";
}

export function DashboardStudentView({
  consultancySlug,
  consultancyName,
  userName,
  onboarding,
  activeTrainingPlan,
  activeNutritionPlan,
  latestProgress,
  previousProgress,
  pendingPhotoEvaluation,
  todayCheckin,
  pendingNutritionCheckin,
}: DashboardStudentViewProps) {
  const hasIncompleteOnboarding =
    onboarding && onboarding.applicable && !onboarding.isComplete;

  const workoutCount = activeTrainingPlan?.workoutCount || 0;
  const totalExercises = activeTrainingPlan?.totalExercises;

  const mealCount =
    activeNutritionPlan?.mealsCount ||
    (activeNutritionPlan?.meals?.length || 0);
  const firstMeal = activeNutritionPlan?.meals?.[0];
  const firstMealTime =
    activeNutritionPlan?.firstMealTime || firstMeal?.scheduledTime || null;

  const hasTraining = !!activeTrainingPlan;
  const hasNutrition = !!activeNutritionPlan;
  const firstName = getFirstName(userName);

  const hasTwoWeightEntries =
    latestProgress?.weightKg !== null &&
    latestProgress?.weightKg !== undefined &&
    previousProgress?.weightKg !== null &&
    previousProgress?.weightKg !== undefined;

  const weightDelta = hasTwoWeightEntries
    ? Number((latestProgress!.weightKg! - previousProgress!.weightKg!).toFixed(1))
    : null;

  const routineList: StudentWorkoutRoutineSummary[] =
    activeTrainingPlan?.workouts && activeTrainingPlan.workouts.length > 0
      ? activeTrainingPlan.workouts
      : activeTrainingPlan
        ? [
            {
              title: activeTrainingPlan.title,
              subtitle: activeTrainingPlan.subtitle,
              blockCount: activeTrainingPlan.blockCount,
            },
          ]
        : [];

  return (
    <>
      {/* ==================================================================== */}
      {/* MOBILE NATIVE COCKPIT (< 768px)                                      */}
      {/* ==================================================================== */}
      <div className="md:hidden">
        <MobileDashboardCockpit
          role="STUDENT"
          consultancySlug={consultancySlug}
          consultancyName={consultancyName}
          userName={userName}
          urgentAlert={
            hasIncompleteOnboarding || (pendingNutritionCheckin && pendingNutritionCheckin.derivedState === "PENDING") || pendingPhotoEvaluation ? (
              <div className="space-y-3">
                {hasIncompleteOnboarding && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300">
                      <span>⚠</span>
                      <span>Anamnese Pendente ({onboarding?.confirmedRequirements || 0}/{onboarding?.totalRequirements || 0} etapas)</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                      Complete suas respostas para que sua prescrição seja personalizada.
                    </p>
                    <Link href={`/consultoria/${consultancySlug}/onboarding`}>
                      <Button variant="primary" size="sm" className="w-full min-h-[44px] font-bold text-xs mt-1">
                        Completar Anamnese →
                      </Button>
                    </Link>
                  </div>
                )}
                {pendingNutritionCheckin && pendingNutritionCheckin.derivedState === "PENDING" && (
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        <span>Check-in de acompanhamento</span>
                      </div>
                      {pendingNutritionCheckin.dueAt && (
                        <span className="text-[10px] text-[var(--text-tertiary)]">
                          Prazo: {new Date(pendingNutritionCheckin.dueAt).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                      Conte para sua nutricionista como foi seu período.
                    </p>
                    <Link href={`/consultoria/${consultancySlug}/nutricao/checkin/${pendingNutritionCheckin.publicId}`}>
                      <Button variant="primary" size="sm" className="w-full min-h-[44px] font-bold text-xs mt-1">
                        Responder agora →
                      </Button>
                    </Link>
                  </div>
                )}
                {pendingPhotoEvaluation && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                      <span className="font-bold text-amber-700 dark:text-amber-300">Avaliação física pendente</span>
                    </div>
                    <Link href={`/consultoria/${consultancySlug}/progresso`}>
                      <span className="font-bold text-[var(--brand)]">Ver →</span>
                    </Link>
                  </div>
                )}
              </div>
            ) : null
          }
          todayCheckin={todayCheckin}
          heroActionCard={
            hasTraining && routineList.length > 0 ? (
              <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--brand)]">
                    Rotina Principal
                  </span>
                  {routineList[0].estimatedDurationMinutes && (
                    <span className="text-[11px] font-semibold text-[var(--text-tertiary)]">
                      ⏱ {routineList[0].estimatedDurationMinutes} min
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--text-primary)]">
                    {routineList[0].title}
                  </h2>
                  {routineList[0].subtitle && (
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {routineList[0].subtitle}
                    </p>
                  )}
                </div>
                <Link
                  href={`/consultoria/${consultancySlug}/treinos`}
                  className="w-full min-h-[48px] rounded-xl font-bold text-xs bg-[var(--brand)] text-[var(--text-inverse)] flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] transition-transform"
                >
                  <span>Iniciar Treino de Hoje</span>
                  <span>→</span>
                </Link>
              </div>
            ) : hasNutrition && activeNutritionPlan ? (
              <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Plano Alimentar Ativo
                  </span>
                  {firstMealTime && (
                    <span className="text-[11px] font-semibold text-[var(--text-tertiary)]">
                      1ª às {firstMealTime}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--text-primary)]">
                    {activeNutritionPlan.title}
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {mealCount} refeições prescritas
                  </p>
                </div>
                <Link
                  href={`/consultoria/${consultancySlug}/nutricao`}
                  className="w-full min-h-[48px] rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] transition-transform"
                >
                  <span>Ver Cardápio Completo</span>
                  <span>→</span>
                </Link>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] space-y-2 text-center">
                <div className="w-10 h-10 mx-auto rounded-xl bg-[var(--surface-subtle)] flex items-center justify-center text-[var(--text-tertiary)]">
                  📋
                </div>
                <h2 className="text-xs font-bold text-[var(--text-primary)]">Plano em elaboração</h2>
                <p className="text-[11px] text-[var(--text-secondary)]">Sua equipe está preparando sua prescrição personalizada.</p>
              </div>
            )
          }
          quickActions={[
            {
              id: "training",
              label: "Treinos",
              subtitle: hasTraining ? `${workoutCount} rotinas ativas` : "Ver fichas",
              href: `/consultoria/${consultancySlug}/treinos`,
              highlight: true,
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              ),
            },
            {
              id: "nutrition",
              label: "Nutrição",
              subtitle: hasNutrition ? `${mealCount} refeições` : "Ver plano",
              href: `/consultoria/${consultancySlug}/nutricao`,
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ),
            },
            {
              id: "progress",
              label: "Evolução",
              subtitle: latestProgress?.weightKg ? `${latestProgress.weightKg} kg` : "Ver medidas",
              href: `/consultoria/${consultancySlug}/progresso`,
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              ),
            },
            {
              id: "consultations",
              label: "Consultas",
              subtitle: "Atendimento 1:1",
              href: `/consultoria/${consultancySlug}/consultas`,
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              ),
            },
          ]}
          metrics={[
            {
              title: "Peso Atual",
              value: latestProgress?.weightKg ? `${latestProgress.weightKg} kg` : "—",
              subtitle: weightDelta !== null ? `${weightDelta > 0 ? "+" : ""}${weightDelta} kg vs anterior` : "Sem registros",
              href: `/consultoria/${consultancySlug}/progresso`,
            },
            {
              title: "Plano Alimentar",
              value: hasNutrition ? `${mealCount} refeições` : "Pendente",
              subtitle: firstMealTime ? `1ª às ${firstMealTime}` : "Cardápio do dia",
              href: `/consultoria/${consultancySlug}/nutricao`,
            },
          ]}
          recentSection={
            routineList.length > 0
              ? {
                  title: "Fichas de Treino",
                  subtitle: "Rotinas prescritas pelo seu personal",
                  viewAllHref: `/consultoria/${consultancySlug}/treinos`,
                  items: routineList.map((r, i) => ({
                    id: r.publicId || String(i),
                    title: r.title,
                    subtitle: r.subtitle || undefined,
                    caption: r.estimatedDurationMinutes ? `⏱ ${r.estimatedDurationMinutes} min` : undefined,
                    href: `/consultoria/${consultancySlug}/treinos`,
                  })),
                }
              : undefined
          }
        />
      </div>

      {/* ==================================================================== */}
      {/* DESKTOP VIEW (>= 768px) — 100% PRESERVED                             */}
      {/* ==================================================================== */}
      <div className="hidden md:block space-y-6 w-full animate-in fade-in duration-150">
        {/* ==================================================================== */}
        {/* 1. HEADER LIMPO & STATUS                                             */}
        {/* ==================================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
            {firstName ? `Olá, ${firstName}` : "Meu Painel"}
          </h2>
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
            {consultancyName || "Acompanhamento de Treino e Saúde"}
          </p>
        </div>

        {pendingPhotoEvaluation && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Avaliação física pendente</span>
          </div>
        )}
      </div>

      {/* Onboarding Notice se aplicável */}
      {hasIncompleteOnboarding && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-300">
              Anamnese pendente ({onboarding?.confirmedRequirements || 0}/{onboarding?.totalRequirements || 0} etapas)
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              Complete suas informações para seu profissional personalizar sua prescrição.
            </p>
          </div>
          <Link href={`/consultoria/${consultancySlug}/onboarding`}>
            <Button variant="primary" size="sm" className="whitespace-nowrap rounded-lg font-semibold">
              Completar anamnese →
            </Button>
          </Link>
        </div>
      )}

      {/* Check-in de acompanhamento nutricional pendente (Fase 7) */}
      {pendingNutritionCheckin && pendingNutritionCheckin.derivedState === "PENDING" && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-300">
                Check-in de acompanhamento
              </p>
              {pendingNutritionCheckin.dueAt && (
                <span className="text-[10px] text-[var(--text-tertiary)]">
                  • Prazo: {new Date(pendingNutritionCheckin.dueAt).toLocaleDateString("pt-BR")}
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Conte para sua nutricionista como foi seu período.
            </p>
          </div>
          <Link href={`/consultoria/${consultancySlug}/nutricao/checkin/${pendingNutritionCheckin.publicId}`}>
            <Button variant="primary" size="sm" className="whitespace-nowrap rounded-lg font-semibold">
              Responder agora →
            </Button>
          </Link>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. CHECK-IN DIÁRIO                                                   */}
      {/* ==================================================================== */}
      <DailyCheckinWidget
        consultancySlug={consultancySlug}
        todayCheckin={todayCheckin || null}
      />

      {/* ==================================================================== */}
      {/* 3. METRICAS / STATUS RÁPIDO DO DIA (Unified Metric Strip)             */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)] overflow-hidden shadow-2xs">
        <Link
          href={`/consultoria/${consultancySlug}/treinos`}
          className="p-3.5 sm:p-4 hover:bg-[var(--surface-hover)] transition-colors group flex flex-col justify-between"
        >
          <span className="text-xs text-[var(--text-tertiary)] font-medium">Treino Ativo</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-base sm:text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
              {hasTraining ? `${workoutCount} rotinas` : "Nenhum"}
            </span>
            <span className="text-[11px] text-[var(--text-tertiary)] hidden xl:inline">
              {hasTraining && totalExercises ? `${totalExercises} exercícios` : "Aguardando"}
            </span>
          </div>
        </Link>

        <Link
          href={`/consultoria/${consultancySlug}/nutricao`}
          className="p-3.5 sm:p-4 hover:bg-[var(--surface-hover)] transition-colors group flex flex-col justify-between"
        >
          <span className="text-xs text-[var(--text-tertiary)] font-medium">Plano Alimentar</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-base sm:text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
              {hasNutrition ? `${mealCount} refeições` : "Nenhum"}
            </span>
            <span className="text-[11px] text-[var(--text-tertiary)] hidden xl:inline">
              {firstMealTime ? `1ª refeição às ${firstMealTime}` : "Aguardando"}
            </span>
          </div>
        </Link>

        <Link
          href={`/consultoria/${consultancySlug}/progresso`}
          className="p-3.5 sm:p-4 hover:bg-[var(--surface-hover)] transition-colors group flex flex-col justify-between"
        >
          <span className="text-xs text-[var(--text-tertiary)] font-medium">Peso Atual</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-base sm:text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
              {latestProgress?.weightKg ? `${latestProgress.weightKg} kg` : "—"}
            </span>
            <span className="text-[11px] text-[var(--text-tertiary)] hidden xl:inline">
              {weightDelta !== null
                ? `${weightDelta > 0 ? "+" : ""}${weightDelta} kg vs anterior`
                : latestProgress?.recordedOn
                ? formatDate(latestProgress.recordedOn)
                : "Sem registros"}
            </span>
          </div>
        </Link>

        <Link
          href={`/consultoria/${consultancySlug}/consultas`}
          className="p-3.5 sm:p-4 hover:bg-[var(--surface-hover)] transition-colors group flex flex-col justify-between"
        >
          <span className="text-xs text-[var(--text-tertiary)] font-medium">Atendimento</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-base sm:text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
              Consultas
            </span>
            <span className="text-[11px] text-[var(--text-tertiary)] hidden xl:inline">Agendamentos & chat</span>
          </div>
        </Link>
      </div>

      {/* ==================================================================== */}
      {/* 4. TREINO EM FOCO (O que fazer agora)                                */}
      {/* ==================================================================== */}
      <Section
        title="Treino Prescrito"
        subtitle={hasTraining ? activeTrainingPlan.title : "Rotinas e prescrições do seu personal"}
        action={
          <Link href={`/consultoria/${consultancySlug}/treinos`}>
            <Button variant="secondary" size="sm">
              Ver todos os treinos →
            </Button>
          </Link>
        }
      >
        {hasTraining && routineList.length > 0 ? (
          <div className="space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {routineList.map((routine, idx) => (
                <Link
                  key={routine.publicId || idx}
                  href={`/consultoria/${consultancySlug}/treinos`}
                  className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] hover:border-[var(--brand)] hover:shadow-xs transition-all duration-150 flex flex-col justify-between space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">
                      Rotina {idx + 1}
                    </span>
                    {routine.estimatedDurationMinutes && (
                      <span className="text-[11px] text-[var(--text-tertiary)] font-medium">
                        ⏱ {routine.estimatedDurationMinutes} min
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                      {routine.title}
                    </h3>
                    {routine.subtitle && (
                      <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                        {routine.subtitle}
                      </p>
                    )}
                  </div>
                  <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-semibold text-[var(--brand)]">
                    <span>Iniciar treino</span>
                    <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[var(--text-secondary)]">
            <p>Seu personal trainer ainda não publicou nenhuma ficha ativa para você.</p>
            <Link href={`/consultoria/${consultancySlug}/consultas`}>
              <Button variant="ghost" size="sm">
                Falar com profissional
              </Button>
            </Link>
          </div>
        )}
      </Section>

      {/* ==================================================================== */}
      {/* 5. NUTRIÇÃO EM FOCO                                                  */}
      {/* ==================================================================== */}
      <Section
        title="Plano Alimentar"
        subtitle={hasNutrition ? activeNutritionPlan.title : "Refeições e metas nutricionais prescritas"}
        action={
          <Link href={`/consultoria/${consultancySlug}/nutricao`}>
            <Button variant="secondary" size="sm">
              Ver cardápio completo →
            </Button>
          </Link>
        }
      >
        {hasNutrition && activeNutritionPlan.meals && activeNutritionPlan.meals.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {activeNutritionPlan.meals.map((meal, idx) => (
              <Link
                key={meal.publicId || idx}
                href={`/consultoria/${consultancySlug}/nutricao`}
                className="p-3.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] hover:border-emerald-500 hover:shadow-xs transition-all duration-150 flex flex-col justify-between space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Refeição {idx + 1}
                  </span>
                  {meal.scheduledTime && (
                    <span className="text-[11px] font-mono text-[var(--text-tertiary)]">
                      {meal.scheduledTime}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                  {meal.title}
                </h3>
                <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <span>Ver alimentos</span>
                  <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[var(--text-secondary)]">
            <p>Nenhum plano alimentar publicado no momento.</p>
            <Link href={`/consultoria/${consultancySlug}/consultas`}>
              <Button variant="ghost" size="sm">
                Falar com nutricionista
              </Button>
            </Link>
          </div>
        )}
      </Section>

      {/* ==================================================================== */}
      {/* 6. EVOLUÇÃO & ATALHOS RÁPIDOS                                        */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Evolução */}
        <Section
          title="Evolução Corporal"
          subtitle={
            latestProgress?.recordedOn
              ? `Último registro em ${formatDate(latestProgress.recordedOn)}`
              : "Acompanhe seu peso e medidas"
          }
          action={
            <Link href={`/consultoria/${consultancySlug}/progresso`}>
              <Button variant="secondary" size="sm">
                Histórico →
              </Button>
            </Link>
          }
        >
          <div className="space-y-3">
            <div className="flex items-baseline justify-between p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
              <div>
                <span className="text-[11px] text-[var(--text-tertiary)] block">Peso mais recente</span>
                <span className="text-lg font-extrabold text-[var(--text-primary)]">
                  {latestProgress?.weightKg ? `${latestProgress.weightKg} kg` : "—"}
                </span>
              </div>
              {weightDelta !== null && (
                <Badge
                  variant={weightDelta <= 0 ? "success" : "neutral"}
                  size="sm"
                >
                  {weightDelta > 0 ? "+" : ""}{weightDelta} kg
                </Badge>
              )}
            </div>
            <Link href={`/consultoria/${consultancySlug}/progresso`} className="block">
              <Button variant="outline" size="sm" fullWidth>
                + Registrar nova medição
              </Button>
            </Link>
          </div>
        </Section>

        {/* Atalhos Rápidos */}
        <Section
          title="Ações Frequentes"
          subtitle="Serviços rápidos da consultoria"
        >
          <div className="space-y-2">
            <ListRow
              title="Consultas e Agendamentos"
              subtitle="Horários marcados e videoconferência"
              href={`/consultoria/${consultancySlug}/consultas`}
              trailing={<span className="text-xs text-[var(--brand)] font-semibold">Acessar →</span>}
            />
            <ListRow
              title="Histórico de Pagamentos"
              subtitle="Faturas, recibos e mensalidade"
              href={`/consultoria/${consultancySlug}/pagamentos`}
              trailing={<span className="text-xs text-[var(--brand)] font-semibold">Ver faturas →</span>}
            />
          </div>
        </Section>
      </div>
      </div>
    </>
  );
}
