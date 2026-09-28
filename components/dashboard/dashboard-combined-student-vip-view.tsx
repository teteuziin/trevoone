"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DailyCheckinWidget } from "@/components/checkin/daily-checkin-widget";
import { NetflixFeatureCarousel, type CarouselSlide } from "./netflix-feature-carousel";
import type { DailyCheckinRecord } from "@/lib/checkins/service";
import type { MissionListItemView } from "@/lib/consultancies/missions";
import type { MemberPayoutProfile, CommissionStatus } from "@/lib/referrals/service";

// ============================================================================
// TYPES
// ============================================================================

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

export interface StudentOnboardingInfo {
  applicable: boolean;
  isComplete: boolean;
  confirmedRequirements: number;
  totalRequirements: number;
}

export interface LatestProgressInfo {
  recordedOn: string;
  weightKg: number | null;
  waistCm?: number | null;
  abdomenCm?: number | null;
  hipCm?: number | null;
  armCm?: number | null;
  thighCm?: number | null;
}

export interface ReferrerDashboardData {
  code: string;
  publicId: string;
  referralUrl: string;
  registrationsCount: number;
  conversionsCount: number;
  pendingAmount: number;
  approvedAmount: number;
  paidAmount: number;
  pixProfile: MemberPayoutProfile | null;
  commissions: Array<{
    id: number;
    publicId: string;
    amount: number;
    status: CommissionStatus;
    createdAt: Date;
    paidAt: Date | null;
  }>;
}

interface DashboardCombinedStudentVipViewProps {
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
  missions: MissionListItemView[];
  totalMissions?: number;
  referrerData?: ReferrerDashboardData | null;
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

function ArrowRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function TargetIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function UsersGroupIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function UserCheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="16 11 18 13 22 9" />
    </svg>
  );
}

function DollarWalletIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="14" x="2" y="5" rx="3" />
      <line x1="2" x2="22" y1="10" y2="10" />
      <circle cx="12" cy="15" r="2" />
    </svg>
  );
}

function CopyIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function SparklesIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
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

// ============================================================================
// MAIN COMPONENT: STUDENT-FIRST UNIFIED EXPERIENCE (STUDENT + INFLUENCER/VIP)
// ============================================================================

export function DashboardCombinedStudentVipView({
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
  missions,
  totalMissions,
  referrerData,
}: DashboardCombinedStudentVipViewProps) {
  const [copied, setCopied] = useState(false);

  const hasIncompleteOnboarding =
    onboarding && onboarding.applicable && !onboarding.isComplete;

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

  // VIP Referral & Mission Metrics (Secondary)
  const referralCode = referrerData?.code || "";
  const referralUrl = referrerData?.referralUrl || "";
  const registrationsCount = referrerData?.registrationsCount || 0;
  const conversionsCount = referrerData?.conversionsCount || 0;
  const approvedAmount = referrerData?.approvedAmount || 0;
  const paidAmount = referrerData?.paidAmount || 0;

  const pendingMissionsCount = missions.filter(
    (m) => m.status === "PENDING" || m.status === "IN_PROGRESS"
  ).length;

  const conversionRate =
    registrationsCount > 0
      ? Math.round((conversionsCount / registrationsCount) * 100)
      : 0;


  async function handleCopyLink(e?: React.MouseEvent) {
    if (e) e.preventDefault();
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  }

  // Student Feature Carousel Slides
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
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
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

      {pendingPhotoEvaluation && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 self-start">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>Avaliação física pendente</span>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 1. CHECK-IN DIÁRIO (VISÍVEL LOGO NO TOPO - STUDENT FIRST)             */}
      {/* ==================================================================== */}
      <section aria-label="Check-in Diário" className="space-y-2">
        <DailyCheckinWidget
          consultancySlug={consultancySlug}
          todayCheckin={todayCheckin || null}
        />
      </section>

      {/* ==================================================================== */}
      {/* 2. RESUMO PRINCIPAL DO ALUNO (3 CARDS COM MÁXIMO DESTAQUE)           */}
      {/* [ TREINOS ] [ NUTRIÇÃO ] [ EVOLUÇÃO ]                                */}
      {/* ==================================================================== */}
      <section aria-label="Resumo do Aluno" className="space-y-2.5">
        <div className="px-1 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] font-heading">
            Resumo do Acompanhamento
          </h2>
          <span className="text-[11px] text-[var(--text-tertiary)]">
            {new Date().toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
          {/* Card 1: Treinos */}
          <Link
            href={`/consultoria/${consultancySlug}/treinos`}
            className="p-4 sm:p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] hover:border-[var(--border-strong)] transition-all shadow-xs group flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                Treinos
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

          {/* Card 2: Nutrição */}
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

          {/* Card 3: Evolução */}
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
      {/* 3. HERO / DESTAQUE PRINCIPAL (DO ALUNO, NÃO VIP!)                     */}
      {/* ==================================================================== */}
      <section aria-label="Destaques do Aluno">
        <NetflixFeatureCarousel
          slides={studentSlides}
          consultancySlug={consultancySlug}
          autoSlideIntervalMs={7000}
        />
      </section>

      {/* ==================================================================== */}
      {/* 4. CONTEÚDO OPERACIONAL DO ALUNO (TREINOS, REFEIÇÕES, EVOLUÇÃO)       */}
      {/* ==================================================================== */}
      <section aria-label="Rotinas do Aluno" className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] font-heading">
              Seu Treino Prescrito
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Rotinas e divisão de exercícios montados pela consultoria
            </p>
          </div>
          {hasTraining && (
            <Link
              href={`/consultoria/${consultancySlug}/treinos`}
              className="text-xs font-semibold text-[var(--brand)] hover:underline flex items-center gap-1 shrink-0"
            >
              <span>Ver todas</span>
              <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {routineList.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {routineList.map((routine, idx) => (
              <div
                key={routine.publicId || `routine-${idx}`}
                className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-bold text-[var(--brand)] uppercase tracking-wider px-2 py-0.5 rounded-md bg-[var(--brand-soft)]">
                      Rotina {idx + 1}
                    </span>
                    {routine.difficultyLevel && (
                      <span className="text-[10px] text-[var(--text-tertiary)] capitalize">
                        {routine.difficultyLevel.toLowerCase()}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">
                    {routine.title}
                  </h3>
                  {routine.subtitle && (
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-1 mt-0.5">
                      {routine.subtitle}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
                  <span className="text-[var(--text-tertiary)]">
                    {routine.estimatedDurationMinutes ? `${routine.estimatedDurationMinutes} min` : "Duração flexível"}
                  </span>
                  <Link
                    href={routine.publicId ? `/consultoria/${consultancySlug}/treinos/${routine.publicId}` : `/consultoria/${consultancySlug}/treinos`}
                    className="font-semibold text-[var(--brand)] hover:underline flex items-center gap-1"
                  >
                    <span>Iniciar</span>
                    <ArrowRightIcon className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-5 rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--surface-subtle)] text-center space-y-2">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Nenhuma rotina prescrita no momento
            </p>
            <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
              Seu personal trainer está organizando suas rotinas. Fique atento às orientações da consultoria.
            </p>
          </div>
        )}
      </section>

      {/* ==================================================================== */}
      {/* 5. ÁREA VIP / PARCERIA (SECUNDÁRIA, COMPACTA, SEM HERO GIGANTE)       */}
      {/* ==================================================================== */}
      <section
        aria-label="Benefícios VIP e Parceria"
        className="pt-4 border-t border-[var(--border-subtle)] space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)] font-heading">
                Benefícios VIP & Parceria
              </h2>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <SparklesIcon className="w-3 h-3" />
                VIP Ativo
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Acompanhe suas missões, comissões e link de indicação da consultoria.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/consultoria/${consultancySlug}/missoes`}>
              <Button variant="secondary" size="sm" className="text-xs font-semibold min-h-[34px]">
                Ver Missões
              </Button>
            </Link>
            <Link href={`/consultoria/${consultancySlug}/indicacoes`}>
              <Button variant="secondary" size="sm" className="text-xs font-semibold min-h-[34px]">
                Indicações
              </Button>
            </Link>
          </div>
        </div>

        {/* KPIs VIP Compactos */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Missões */}
          <Link
            href={`/consultoria/${consultancySlug}/missoes`}
            className="p-3 sm:p-3.5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] hover:border-[var(--border-strong)] transition-all shadow-xs group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                Missões
              </span>
              <TargetIcon className="w-3.5 h-3.5 text-[var(--brand)]" />
            </div>
            <div className="text-lg sm:text-xl font-bold text-[var(--text-primary)] font-heading tabular-nums">
              {pendingMissionsCount}
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] truncate">
              {totalMissions || missions.length} cadastradas
            </p>
          </Link>

          {/* Indicações */}
          <Link
            href={`/consultoria/${consultancySlug}/indicacoes`}
            className="p-3 sm:p-3.5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] hover:border-[var(--border-strong)] transition-all shadow-xs group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                Indicações
              </span>
              <UsersGroupIcon className="w-3.5 h-3.5 text-sky-500" />
            </div>
            <div className="text-lg sm:text-xl font-bold text-[var(--text-primary)] font-heading tabular-nums">
              {registrationsCount}
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] truncate">
              Cadastros iniciados
            </p>
          </Link>

          {/* Conversões */}
          <Link
            href={`/consultoria/${consultancySlug}/indicacoes`}
            className="p-3 sm:p-3.5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] hover:border-[var(--border-strong)] transition-all shadow-xs group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                Conversões
              </span>
              <UserCheckIcon className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-lg sm:text-xl font-bold text-[var(--text-primary)] font-heading tabular-nums">
              {conversionsCount}
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] truncate">
              {conversionRate}% conversão
            </p>
          </Link>

          {/* Comissões Aprovadas */}
          <Link
            href={`/consultoria/${consultancySlug}/indicacoes`}
            className="p-3 sm:p-3.5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] hover:border-[var(--border-strong)] transition-all shadow-xs group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                Comissão
              </span>
              <DollarWalletIcon className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-lg sm:text-xl font-bold text-emerald-500 font-heading tabular-nums">
              R$ {approvedAmount.toFixed(0)}
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] truncate">
              Aprovada para saque
            </p>
          </Link>
        </div>

        {/* Link de Indicação Rápido & PIX */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4 items-start">
          {/* Link Rápido */}
          <div className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] font-heading">
                Seu Link Exclusivo de Indicação
              </h3>
              <span className="text-[10px] font-semibold text-[var(--brand)]">
                Código: {referralCode || "—"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={referralUrl || "Link em geração..."}
                className="flex-1 min-w-0 px-3 py-2 text-xs rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-primary)] font-mono select-all focus:outline-none"
              />
              <Button
                variant={copied ? "primary" : "secondary"}
                size="sm"
                onClick={handleCopyLink}
                className="shrink-0 text-xs font-semibold gap-1 min-h-[36px]"
              >
                {copied ? <CheckIcon className="w-3.5 h-3.5" /> : <CopyIcon className="w-3.5 h-3.5" />}
                <span>{copied ? "Copiado!" : "Copiar"}</span>
              </Button>
            </div>
          </div>

          {/* Resumo PIX & Comissões */}
          <div className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs flex items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] font-heading">
                Chave PIX para Comissões
              </h3>
              <p className="text-xs text-[var(--text-primary)] font-medium truncate">
                {referrerData?.pixProfile ? (
                  `${referrerData.pixProfile.pixKeyType}: ${referrerData.pixProfile.pixKey}`
                ) : (
                  "Nenhuma chave cadastrada"
                )}
              </p>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Total já pago: R$ {paidAmount.toFixed(2)}
              </p>
            </div>

            <Link href={`/consultoria/${consultancySlug}/indicacoes`} className="shrink-0">
              <Button variant="secondary" size="sm" className="text-xs font-semibold min-h-[36px]">
                {referrerData?.pixProfile ? "Alterar PIX" : "Cadastrar PIX"}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
