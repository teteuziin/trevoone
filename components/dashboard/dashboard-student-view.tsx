"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DailyCheckinWidget } from "@/components/checkin/daily-checkin-widget";
import { NetflixFeatureCarousel, type CarouselSlide } from "./netflix-feature-carousel";
import type { DailyCheckinRecord } from "@/lib/checkins/service";

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
}

// ============================================================================
// ICONS
// ============================================================================

function WorkoutIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6.5 6.5 11 11" />
      <path d="m21 21-1-1a2 2 0 0 0-2.83 0l-2.5 2.5a2 2 0 0 1-2.83 0l-.84-.84a2 2 0 0 1 0-2.83l2.5-2.5a2 2 0 0 0 0-2.83l-1-1" />
      <path d="m3 3 1 1a2 2 0 0 0 2.83 0l2.5-2.5a2 2 0 0 1 2.83 0l.84.84a2 2 0 0 1 0 2.83l-2.5 2.5a2 2 0 0 0 0 2.83l1 1" />
    </svg>
  );
}

function NutritionIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2a9 9 0 0 0-9 9c0 4.97 4.03 9 9 9s9-4.03 9-9" />
      <path d="M12 2c2.5 2.5 3 6 1 8.5" />
      <path d="M18 11c0 3.31-2.69 6-6 6s-6-2.69-6-6" />
      <path d="M12 2v4" />
    </svg>
  );
}

function ProgressIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </svg>
  );
}

function FinanceIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="14" x="2" y="5" rx="3" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  );
}

function ConsultationIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.934a.5.5 0 0 0-.777-.416L16 11" />
      <rect width="14" height="12" x="2" y="6" rx="3" />
    </svg>
  );
}

function ClockIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function ArrowRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  } catch {
    // Ignore fallback
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
}: DashboardStudentViewProps) {
  const hasIncompleteOnboarding =
    onboarding && onboarding.applicable && !onboarding.isComplete;

  // Real derived metrics
  const workoutCount = activeTrainingPlan?.workoutCount || 0;
  const blockCount = activeTrainingPlan?.blockCount;
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

  const studentSlides: CarouselSlide[] = [
    {
      id: "student-training",
      tag: consultancyName ? `TREINOS • ${consultancyName.toUpperCase()}` : "TREINOS",
      tagColor: "brand",
      title: hasTraining
        ? activeTrainingPlan.title
        : firstName
        ? `Olá, ${firstName} — Treinos Prescritos`
        : "Rotinas e Exercícios Prescritos",
      description: hasTraining && activeTrainingPlan.subtitle
        ? activeTrainingPlan.subtitle
        : "Acesse suas rotinas de treino personalizadas, exercícios e orientações do seu personal trainer.",
      ctaText: "Acessar treinos",
      ctaHref: `/consultoria/${consultancySlug}/treinos`,
      imageUrl: "/images/student/workout-editorial.webp",
      meta:
        hasTraining && workoutCount > 0
          ? `${workoutCount} ${workoutCount === 1 ? "rotina ativa" : "rotinas ativas"}${blockCount ? ` • ${blockCount} blocos` : ""}${totalExercises ? ` • ${totalExercises} ex.` : ""}`
          : undefined,
    },
    {
      id: "student-nutrition",
      tag: "NUTRIÇÃO",
      tagColor: "emerald",
      title: hasNutrition ? activeNutritionPlan.title : "Planejamento Alimentar",
      description: hasNutrition && activeNutritionPlan.subtitle
        ? activeNutritionPlan.subtitle
        : "Consulte suas refeições prescritas, horários e diretrizes nutricionais personalizadas.",
      ctaText: "Ver plano alimentar",
      ctaHref: `/consultoria/${consultancySlug}/nutricao`,
      imageUrl: "/images/student/nutrition-editorial.webp",
      meta: hasNutrition && mealCount > 0 ? `${mealCount} refeições` : undefined,
    },
    {
      id: "student-progress",
      tag: "EVOLUÇÃO",
      tagColor: "neutral",
      title: latestProgress?.weightKg
        ? `Peso atual: ${latestProgress.weightKg} kg`
        : "Acompanhe sua Evolução",
      description: latestProgress
        ? `Última medição registrada em ${formatDate(latestProgress.recordedOn)}. Mantenha seus registros atualizados.`
        : "Acompanhe seu peso, medidas e fotos de evolução corporal para monitorar seus resultados reais.",
      ctaText: "Ver evolução",
      ctaHref: `/consultoria/${consultancySlug}/progresso`,
      imageUrl: "/images/student/hero-athlete.webp",
      meta:
        weightDelta !== null
          ? `${weightDelta > 0 ? "+" : ""}${weightDelta} kg desde a última medição`
          : undefined,
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* ==================================================================== */}
      {/* 1. HEADER                                                            */}
      {/* ==================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1 border-b border-[var(--border-subtle)]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] font-heading tracking-tight">
            {firstName ? `Olá, ${firstName}` : "Visão Geral do Aluno"}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            {consultancyName ? `${consultancyName} • Acompanhamento Pessoal` : "Painel de acompanhamento pessoal"}
          </p>
        </div>

        {pendingPhotoEvaluation && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Avaliação física pendente</span>
          </div>
        )}
      </div>

      {/* Onboarding Notice */}
      {hasIncompleteOnboarding && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-bold text-amber-500 font-heading">
              Complete sua ficha de anamnese
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              Você preencheu {onboarding?.confirmedRequirements || 0} de {onboarding?.totalRequirements || 0} etapas necessárias.
            </p>
          </div>
          <Link href={`/consultoria/${consultancySlug}/onboarding`}>
            <Button variant="primary" size="sm" className="font-bold whitespace-nowrap min-h-[40px]">
              Completar anamnese →
            </Button>
          </Link>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. CHECK-IN COMPACTO                                                 */}
      {/* Requirement 5: Fechado por padrão, compacto, no topo do dashboard    */}
      {/* ==================================================================== */}
      <section aria-label="Check-in Diário" className="space-y-2">
        <DailyCheckinWidget
          consultancySlug={consultancySlug}
          todayCheckin={todayCheckin || null}
        />
      </section>

      {/* ==================================================================== */}
      {/* 3. RESUMO DO DIA (3 CARDS PRINCIPAIS)                                */}
      {/* Requirement 5: [ Treino ] [ Nutrição ] [ Evolução ]                  */}
      {/* ==================================================================== */}
      <section aria-label="Resumo do Dia" className="space-y-2">
        <div className="px-1 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] font-heading">
            Resumo do Dia
          </h2>
          <span className="text-[11px] text-[var(--text-tertiary)]">
            {new Date().toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
          {/* Card 1: Treino do Dia */}
          <Link
            href={`/consultoria/${consultancySlug}/treinos`}
            className="p-4 sm:p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] hover:border-[var(--border-strong)] transition-all shadow-xs group flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                Treino
              </span>
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
                <WorkoutIcon className="w-4.5 h-4.5" />
              </div>
            </div>

            <div className="space-y-0.5">
              <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                {hasTraining ? activeTrainingPlan.title : "Treino Prescrito"}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] font-medium truncate">
                {hasTraining && workoutCount > 0
                  ? `${workoutCount} rotinas ativas`
                  : "Aguardando publicação"}
              </p>
            </div>

            <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-semibold text-[var(--brand)]">
              <span>{hasTraining ? "Acessar treino" : "Ver treinos"}</span>
              <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* Card 2: Nutrição de Hoje */}
          <Link
            href={`/consultoria/${consultancySlug}/nutricao`}
            className="p-4 sm:p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] hover:border-[var(--border-strong)] transition-all shadow-xs group flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                Nutrição
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <NutritionIcon className="w-4.5 h-4.5" />
              </div>
            </div>

            <div className="space-y-0.5">
              <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                {hasNutrition ? activeNutritionPlan.title : "Plano Alimentar"}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] font-medium truncate">
                {hasNutrition && mealCount > 0
                  ? firstMealTime
                    ? `${mealCount} refeições • 1ª às ${firstMealTime}`
                    : `${mealCount} refeições diárias`
                  : "Aguardando plano"}
              </p>
            </div>

            <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-semibold text-[var(--brand)]">
              <span>{hasNutrition ? "Ver cardápio" : "Ver nutrição"}</span>
              <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* Card 3: Última Medição */}
          <Link
            href={`/consultoria/${consultancySlug}/progresso`}
            className="p-4 sm:p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] hover:border-[var(--border-strong)] transition-all shadow-xs group flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                Evolução
              </span>
              <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center">
                <ProgressIcon className="w-4.5 h-4.5" />
              </div>
            </div>

            <div className="space-y-0.5">
              <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors tabular-nums">
                {latestProgress?.weightKg ? `${latestProgress.weightKg} kg` : "Sem medições"}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] font-medium truncate">
                {latestProgress
                  ? `Registrado em ${formatDate(latestProgress.recordedOn)}`
                  : "Nenhum registro ainda"}
              </p>
            </div>

            <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-semibold text-[var(--brand)]">
              <span>{latestProgress ? "Ver progresso" : "Registrar peso"}</span>
              <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 4. HERO / DESTAQUE (FEATURE CAROUSEL)                                */}
      {/* ==================================================================== */}
      <section aria-label="Destaques">
        <NetflixFeatureCarousel
          slides={studentSlides}
          consultancySlug={consultancySlug}
          autoSlideIntervalMs={7000}
        />
      </section>

      {/* ==================================================================== */}
      {/* 5. CONTEÚDO DETALHADO (COM EMPTY STATES COMPACTOS)                   */}
      {/* Requirement 6: Quando não houver conteúdo, usar cards compactos      */}
      {/* ==================================================================== */}

      {/* 5.1 SEU TREINO PRESCRITO */}
      <section aria-label="Treino Prescrito" className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] font-heading">
              Seu Treino Prescrito
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Rotinas e divisão de exercícios montados pela consultoria
            </p>
          </div>
          <Link
            href={`/consultoria/${consultancySlug}/treinos`}
            className="text-xs font-bold text-[var(--brand)] hover:underline flex items-center gap-1"
          >
            <span>Ver treinos</span>
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        </div>

        {hasTraining ? (
          <div className="p-5 sm:p-6 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] font-heading">
                  {activeTrainingPlan.title}
                </h3>
                {activeTrainingPlan.subtitle && (
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                    {activeTrainingPlan.subtitle}
                  </p>
                )}
              </div>
              <Badge variant="brand" size="sm" className="self-start sm:self-auto">
                {workoutCount} {workoutCount === 1 ? "rotina" : "rotinas"}
              </Badge>
            </div>

            {routineList.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {routineList.map((routine, idx) => (
                  <Link
                    key={routine.publicId || idx}
                    href={`/consultoria/${consultancySlug}/treinos`}
                    className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-[var(--brand)] uppercase tracking-wider">
                        Rotina {idx + 1}
                      </span>
                      {routine.estimatedDurationMinutes && (
                        <span className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1">
                          <ClockIcon className="w-3 h-3" />
                          {routine.estimatedDurationMinutes} min
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                      {routine.title}
                    </h4>
                    {routine.subtitle && (
                      <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">
                        {routine.subtitle}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Requirement 6: Compact empty state */
          <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-tertiary)] flex items-center justify-center shrink-0">
                <WorkoutIcon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
                  Seu personal ainda não publicou um treino.
                </p>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Assim que sua rotina for prescrita, ela aparecerá aqui.
                </p>
              </div>
            </div>
            <span className="self-start sm:self-auto inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
              Aguardando
            </span>
          </div>
        )}
      </section>

      {/* 5.2 SEU PLANO ALIMENTAR */}
      <section aria-label="Plano Alimentar" className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] font-heading">
              Seu Plano Alimentar
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Horários de refeições e diretrizes nutricionais
            </p>
          </div>
          <Link
            href={`/consultoria/${consultancySlug}/nutricao`}
            className="text-xs font-bold text-[var(--brand)] hover:underline flex items-center gap-1"
          >
            <span>Ver plano</span>
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        </div>

        {hasNutrition ? (
          <div className="p-5 sm:p-6 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] font-heading">
                  {activeNutritionPlan.title}
                </h3>
                {activeNutritionPlan.subtitle && (
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                    {activeNutritionPlan.subtitle}
                  </p>
                )}
              </div>
              <Badge variant="brand" size="sm" className="self-start sm:self-auto">
                {mealCount} {mealCount === 1 ? "refeição" : "refeições"}
              </Badge>
            </div>

            {activeNutritionPlan.meals && activeNutritionPlan.meals.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeNutritionPlan.meals.map((meal, idx) => (
                  <Link
                    key={meal.publicId || idx}
                    href={`/consultoria/${consultancySlug}/nutricao`}
                    className="p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] transition-all group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                        Refeição {idx + 1}
                      </span>
                      {meal.scheduledTime && (
                        <span className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1 font-mono">
                          <ClockIcon className="w-3 h-3" />
                          {meal.scheduledTime}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                      {meal.title}
                    </h4>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Requirement 6: Compact empty state */
          <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-tertiary)] flex items-center justify-center shrink-0">
                <NutritionIcon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
                  Seu plano alimentar ainda está sendo preparado.
                </p>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Suas refeições e metas de nutrientes estarão disponíveis em breve.
                </p>
              </div>
            </div>
            <span className="self-start sm:self-auto inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
              Aguardando
            </span>
          </div>
        )}
      </section>

      {/* 5.3 SUA EVOLUÇÃO */}
      <section aria-label="Sua Evolução" className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] font-heading">
              Sua Evolução
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Histórico de pesagem e circunferências corporais
            </p>
          </div>
          <Link
            href={`/consultoria/${consultancySlug}/progresso`}
            className="text-xs font-bold text-[var(--brand)] hover:underline flex items-center gap-1"
          >
            <span>Ver evolução</span>
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        </div>

        {latestProgress ? (
          <div className="p-5 sm:p-6 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-3">
                <span className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] font-heading tabular-nums">
                  {latestProgress.weightKg} <span className="text-sm font-normal text-[var(--text-secondary)]">kg</span>
                </span>
                {weightDelta !== null && (
                  <Badge variant={weightDelta <= 0 ? "success" : "warning"} size="sm">
                    {weightDelta > 0 ? `+${weightDelta}` : weightDelta} kg
                  </Badge>
                )}
              </div>
              <span className="text-xs text-[var(--text-tertiary)]">
                Última medição: {formatDate(latestProgress.recordedOn)}
              </span>
            </div>

            {/* Medidas corporais */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {latestProgress.waistCm !== null && latestProgress.waistCm !== undefined && (
                <div className="p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                  <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Cintura</span>
                  <p className="text-base font-bold text-[var(--text-primary)] tabular-nums">{latestProgress.waistCm} <span className="text-xs font-normal text-[var(--text-secondary)]">cm</span></p>
                </div>
              )}
              {latestProgress.abdomenCm !== null && latestProgress.abdomenCm !== undefined && (
                <div className="p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                  <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Abdômen</span>
                  <p className="text-base font-bold text-[var(--text-primary)] tabular-nums">{latestProgress.abdomenCm} <span className="text-xs font-normal text-[var(--text-secondary)]">cm</span></p>
                </div>
              )}
              {latestProgress.hipCm !== null && latestProgress.hipCm !== undefined && (
                <div className="p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                  <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Quadril</span>
                  <p className="text-base font-bold text-[var(--text-primary)] tabular-nums">{latestProgress.hipCm} <span className="text-xs font-normal text-[var(--text-secondary)]">cm</span></p>
                </div>
              )}
              {latestProgress.armCm !== null && latestProgress.armCm !== undefined && (
                <div className="p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                  <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Braço</span>
                  <p className="text-base font-bold text-[var(--text-primary)] tabular-nums">{latestProgress.armCm} <span className="text-xs font-normal text-[var(--text-secondary)]">cm</span></p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Requirement 6: Compact empty state */
          <div className="p-4 sm:p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-tertiary)] flex items-center justify-center shrink-0">
                <ProgressIcon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
                  Você ainda não registrou medidas.
                </p>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Registre seu peso e medidas para acompanhar sua evolução biométrica.
                </p>
              </div>
            </div>
            <Link href={`/consultoria/${consultancySlug}/progresso`} className="self-start sm:self-auto">
              <Button variant="secondary" size="sm" className="text-xs font-semibold px-3 py-1.5 min-h-[36px]">
                Registrar evolução →
              </Button>
            </Link>
          </div>
        )}
      </section>

      {/* 5.4 APOIO & SERVIÇOS */}
      <section aria-label="Apoio e Serviços" className="space-y-3.5">
        <div className="px-1">
          <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] font-heading">
            Apoio &amp; Serviços
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Atendimento com profissionais e gerenciamento financeiro
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Consultas */}
          <div className="p-5 sm:p-6 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-primary)]">
                  <ConsultationIcon className="w-4.5 h-4.5" />
                </div>
                <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Atendimento
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] font-heading">
                  Consultas &amp; Teleconsultas
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-0.5">
                  Agendamentos, horários de retorno e salas de videoconferência.
                </p>
              </div>
            </div>

            <Link href={`/consultoria/${consultancySlug}/consultas`} className="block w-full">
              <Button variant="secondary" fullWidth size="sm" className="text-xs font-semibold min-h-[38px]">
                Acessar consultas →
              </Button>
            </Link>
          </div>

          {/* Card 2: Pagamentos */}
          <div className="p-5 sm:p-6 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-primary)]">
                  <FinanceIcon className="w-4.5 h-4.5" />
                </div>
                <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Financeiro
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] font-heading">
                  Pagamentos &amp; Faturas
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-0.5">
                  Controle de mensalidades, faturas em aberto e comprovantes emitidos.
                </p>
              </div>
            </div>

            <Link href={`/consultoria/${consultancySlug}/pagamentos`} className="block w-full">
              <Button variant="secondary" fullWidth size="sm" className="text-xs font-semibold min-h-[38px]">
                Ver pagamentos →
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
