"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DailyCheckinWidget } from "@/components/checkin/daily-checkin-widget";
import { Section, CompactCard, ListRow } from "@/components/ui/design-system";
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
    <div className="space-y-5 sm:space-y-6 max-w-5xl mx-auto animate-in fade-in duration-150">
      {/* ==================================================================== */}
      {/* 1. HEADER LIMPO & STATUS                                             */}
      {/* ==================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
        <div>
          <div className="text-[11px] font-semibold text-[var(--brand)] uppercase tracking-wider">
            {consultancyName || "Acompanhamento"}
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight font-heading">
            {firstName ? `Olá, ${firstName}` : "Meu Painel"}
          </h1>
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
            <Button variant="primary" size="sm" className="whitespace-nowrap">
              Completar anamnese →
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
      {/* 3. METRICAS / STATUS RÁPIDO DO DIA                                   */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <CompactCard
          title="Treino Ativo"
          value={hasTraining ? `${workoutCount} rotinas` : "Nenhum"}
          subtitle={hasTraining && totalExercises ? `${totalExercises} exercícios` : "Aguardando"}
          href={`/consultoria/${consultancySlug}/treinos`}
          icon={
            <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
        />
        <CompactCard
          title="Plano Alimentar"
          value={hasNutrition ? `${mealCount} refeições` : "Nenhum"}
          subtitle={firstMealTime ? `1ª refeição às ${firstMealTime}` : "Aguardando"}
          href={`/consultoria/${consultancySlug}/nutricao`}
          icon={
            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
        />
        <CompactCard
          title="Peso Atual"
          value={latestProgress?.weightKg ? `${latestProgress.weightKg} kg` : "—"}
          subtitle={
            weightDelta !== null
              ? `${weightDelta > 0 ? "+" : ""}${weightDelta} kg vs anterior`
              : latestProgress?.recordedOn
              ? formatDate(latestProgress.recordedOn)
              : "Sem registros"
          }
          href={`/consultoria/${consultancySlug}/progresso`}
          icon={
            <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />
        <CompactCard
          title="Atendimento"
          value="Consultas"
          subtitle="Agendamentos & chat"
          href={`/consultoria/${consultancySlug}/consultas`}
          icon={
            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          }
        />
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
  );
}
