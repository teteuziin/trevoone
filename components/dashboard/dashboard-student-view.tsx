import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Manrope } from "next/font/google";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-student-manrope",
  display: "swap",
});

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
}

// ============================================================================
// ICONS (Trevo One Art Direction — Clean, tactile, zero static duplicate IDs)
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
}: DashboardStudentViewProps) {
  const hasIncompleteOnboarding =
    onboarding && onboarding.applicable && !onboarding.isComplete;

  // Real derived metrics from authoritative payload
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
  const hasBothPlans = hasTraining && hasNutrition;

  const firstName = getFirstName(userName);

  // Weight delta calculation: strictly from baseline if 2 real entries exist
  const hasTwoWeightEntries =
    latestProgress?.weightKg !== null &&
    latestProgress?.weightKg !== undefined &&
    previousProgress?.weightKg !== null &&
    previousProgress?.weightKg !== undefined;

  const weightDelta = hasTwoWeightEntries
    ? Number((latestProgress!.weightKg! - previousProgress!.weightKg!).toFixed(1))
    : null;

  // Real workouts array (if provided) or fallback to single workout card
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
    <div className={`space-y-8 sm:space-y-10 overflow-x-clip ${manrope.variable}`}>
      {/* ==================================================================== */}
      {/* 1. ONBOARDING MANDATÓRIO (Se aplicável e incompleto)                  */}
      {/* ==================================================================== */}
      {hasIncompleteOnboarding && (
        <div className="p-4.5 sm:p-5 rounded-2xl border border-[var(--warning-border)] bg-[var(--warning-soft)] shadow-xs depth-base">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="warning" size="sm">
                  Etapa Obrigatória
                </Badge>
                <span className="text-xs font-semibold text-[var(--warning-foreground)]">
                  {onboarding.confirmedRequirements} de {onboarding.totalRequirements} etapas confirmadas
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] font-[family-name:var(--font-student-manrope)]">
                Complete seu cadastro inicial
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                Conclua os formulários obrigatórios para liberar o acesso aos módulos da sua consultoria.
              </p>
            </div>

            <div className="shrink-0 pt-1 sm:pt-0">
              <Link href={`/consultoria/${consultancySlug}/onboarding`}>
                <Button variant="primary" size="sm" className="font-semibold min-h-[44px]">
                  Continuar cadastro →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. HERO CINEMATOGRÁFICO (Apple Fitness+ / Nike Training / Apple TV)   */}
      {/* ==================================================================== */}
      <section aria-label="Destaque de Performance" className="relative rounded-3xl overflow-hidden border border-neutral-800/80 shadow-lg min-h-[380px] sm:min-h-[440px] lg:min-h-[480px] flex flex-col justify-end p-6 sm:p-8 lg:p-10 bg-neutral-950">
        {/* Background Editorial Athlete Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/student/hero-athlete.webp"
            alt="Atleta em foco durante treino de alta performance"
            fill
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1120px"
            className="object-cover object-[center_30%] opacity-90 transition-transform duration-700 hover:scale-[1.02]"
          />
          {/* Multi-directional Dark Scrim Overlay for pristine readability in Light & Dark */}
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/75 to-neutral-950/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/95 via-neutral-950/80 to-transparent hidden sm:block" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 space-y-4 sm:space-y-5 max-w-2xl">
          {/* Editorial Label (Rule 3: Non-functional branding tag, NOT an invented user status) */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900/80 border border-neutral-700/60 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[var(--brand)] animate-pulse" />
            <span className="text-[11px] font-semibold text-neutral-200 tracking-wider uppercase">
              TREVO ONE • {consultancyName ? consultancyName.toUpperCase() : "PERFORMANCE"}
            </span>
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            {firstName && (
              <p className="text-sm sm:text-base font-medium text-neutral-300">
                Olá, {firstName}
              </p>
            )}
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.1] font-[family-name:var(--font-student-manrope)]">
              {hasTraining
                ? activeTrainingPlan.title
                : hasNutrition
                ? activeNutritionPlan.title
                : "Seu Hub de Performance e Saúde"}
            </h1>
            <p className="text-sm sm:text-base text-neutral-300 max-w-xl line-clamp-2 font-normal leading-relaxed">
              {hasTraining && activeTrainingPlan.subtitle
                ? activeTrainingPlan.subtitle
                : hasNutrition && activeNutritionPlan.subtitle
                ? activeNutritionPlan.subtitle
                : "Acompanhamento profissional estruturado para seus objetivos de saúde e evolução física."}
            </p>
          </div>

          {/* Authoritative Real Metrics Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {hasTraining && workoutCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-neutral-900/80 border border-neutral-700/60 text-xs font-semibold text-neutral-200 backdrop-blur-sm">
                <WorkoutIcon className="w-3.5 h-3.5 text-[var(--brand)]" />
                {workoutCount} {workoutCount === 1 ? "rotina prescrita" : "rotinas prescritas"}
              </span>
            )}
            {hasTraining && blockCount !== undefined && blockCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-neutral-900/80 border border-neutral-700/60 text-xs font-medium text-neutral-300 backdrop-blur-sm">
                {blockCount} {blockCount === 1 ? "bloco" : "blocos de treino"}
              </span>
            )}
            {hasTraining && totalExercises !== undefined && totalExercises > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-neutral-900/80 border border-neutral-700/60 text-xs font-medium text-neutral-300 backdrop-blur-sm">
                {totalExercises} {totalExercises === 1 ? "exercício" : "exercícios"}
              </span>
            )}
            {hasNutrition && mealCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-neutral-900/80 border border-neutral-700/60 text-xs font-medium text-neutral-300 backdrop-blur-sm">
                <NutritionIcon className="w-3.5 h-3.5 text-emerald-400" />
                {mealCount} {mealCount === 1 ? "refeição" : "refeições"}
              </span>
            )}
            {latestProgress?.weightKg !== null && latestProgress?.weightKg !== undefined && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-neutral-900/80 border border-neutral-700/60 text-xs font-medium text-neutral-300 backdrop-blur-sm tabular-nums">
                <ProgressIcon className="w-3.5 h-3.5 text-neutral-400" />
                {latestProgress.weightKg} kg recente
              </span>
            )}
          </div>

          {/* Hero CTAs */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            {hasTraining ? (
              <Link href={`/consultoria/${consultancySlug}/treinos`} className="w-full sm:w-auto">
                <Button variant="primary" size="md" className="w-full sm:w-auto font-semibold min-h-[48px] px-6 text-sm shadow-md">
                  Acessar treino prescrito →
                </Button>
              </Link>
            ) : hasNutrition ? (
              <Link href={`/consultoria/${consultancySlug}/nutricao`} className="w-full sm:w-auto">
                <Button variant="primary" size="md" className="w-full sm:w-auto font-semibold min-h-[48px] px-6 text-sm shadow-md">
                  Acessar nutrição →
                </Button>
              </Link>
            ) : (
              <Link href={`/consultoria/${consultancySlug}/progresso`} className="w-full sm:w-auto">
                <Button variant="primary" size="md" className="w-full sm:w-auto font-semibold min-h-[48px] px-6 text-sm shadow-md">
                  Registrar medição →
                </Button>
              </Link>
            )}

            {hasBothPlans && (
              <Link href={`/consultoria/${consultancySlug}/nutricao`} className="w-full sm:w-auto">
                <button
                  type="button"
                  className="w-full sm:w-auto inline-flex items-center justify-center min-h-[48px] px-5 py-2.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-700/80 border border-neutral-600/70 text-white text-sm font-semibold transition-colors backdrop-blur-sm cursor-pointer"
                >
                  Ver plano alimentar
                </button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 2.5 BARRA DE JORNADA NATIVA (Live Status Briefing)                   */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Pilar 1: Treino */}
        <Link
          href={`/consultoria/${consultancySlug}/treinos`}
          className="group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] hover:border-[var(--border-strong)] shadow-xs transition-all depth-surface active:scale-[0.99]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[var(--brand)] shrink-0 shadow-2xs">
              <WorkoutIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider block">
                Prescrição
              </span>
              <p className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate font-[family-name:var(--font-student-manrope)]">
                {hasTraining ? (routineList[0]?.title || activeTrainingPlan.title) : "Sem treino ativo"}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)] shrink-0 ml-2">
            {hasTraining ? `${workoutCount} ${workoutCount === 1 ? "rotina" : "rotinas"}` : "Aguardando"}
          </span>
        </Link>

        {/* Pilar 2: Nutrição */}
        <Link
          href={`/consultoria/${consultancySlug}/nutricao`}
          className="group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] hover:border-[var(--border-strong)] shadow-xs transition-all depth-surface active:scale-[0.99]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0 shadow-2xs">
              <NutritionIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider block">
                Alimentação
              </span>
              <p className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate font-[family-name:var(--font-student-manrope)]">
                {hasNutrition ? activeNutritionPlan.title : "Sem plano ativo"}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)] shrink-0 ml-2">
            {hasNutrition ? (firstMealTime ? `1ª às ${firstMealTime}` : `${mealCount} ref.`) : "Aguardando"}
          </span>
        </Link>

        {/* Pilar 3: Evolução */}
        <Link
          href={`/consultoria/${consultancySlug}/progresso`}
          className="group flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] hover:border-[var(--border-strong)] shadow-xs transition-all depth-surface active:scale-[0.99]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-neutral-500/10 border border-neutral-500/20 flex items-center justify-center text-[var(--text-secondary)] shrink-0 shadow-2xs">
              <ProgressIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider block">
                Biometria
              </span>
              <p className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate font-[family-name:var(--font-student-manrope)]">
                {latestProgress?.weightKg ? `${latestProgress.weightKg} kg` : "Sem peso recente"}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)] shrink-0 ml-2 tabular-nums">
            {weightDelta !== null ? `${weightDelta > 0 ? `+${weightDelta}` : weightDelta} kg` : latestProgress ? "Atualizado" : "Pendente"}
          </span>
        </Link>
      </div>

      {/* ==================================================================== */}
      {/* 3. TRILHO DE TREINO (Netflix-like horizontal rail)                    */}
      {/* Strictly Rule 2: "Seu Treino Prescrito" — NEVER "Treino de hoje"     */}
      {/* ==================================================================== */}
      <section aria-label="Seu Treino Prescrito" className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight font-[family-name:var(--font-student-manrope)]">
              Seu Treino Prescrito
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-normal">
              Rotinas estruturadas pelo seu personal trainer
            </p>
          </div>
          {hasTraining && (
            <Link
              href={`/consultoria/${consultancySlug}/treinos`}
              className="text-xs sm:text-sm font-semibold text-[var(--brand)] hover:underline inline-flex items-center gap-1 shrink-0"
            >
              Ver todos <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {hasTraining && routineList.length > 0 ? (
          <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-4 overflow-x-auto pb-3 pt-1 snap-x snap-mandatory scrollbar-none">
            {routineList.map((routine, idx) => (
              <div
                key={routine.publicId || idx}
                className="w-[84vw] sm:w-[320px] md:w-[360px] shrink-0 snap-start p-5 sm:p-6 rounded-3xl border border-[var(--border-strong)] bg-[var(--surface)] shadow-xs flex flex-col justify-between space-y-4 border-specular-t depth-surface hover:border-[var(--brand)] transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-primary)] shadow-2xs">
                        <WorkoutIcon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                        Rotina {idx + 1}
                      </span>
                    </div>
                    <Badge variant="success" size="sm">
                      Ativo
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight font-[family-name:var(--font-student-manrope)] break-words">
                      {routine.title}
                    </h3>
                    {routine.subtitle && (
                      <p className="text-xs sm:text-sm text-[var(--text-secondary)] line-clamp-2">
                        {routine.subtitle}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {routine.blockCount !== undefined && routine.blockCount > 0 && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-semibold text-[var(--text-primary)]">
                        {routine.blockCount} {routine.blockCount === 1 ? "bloco" : "blocos"}
                      </span>
                    )}
                    {routine.estimatedDurationMinutes && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-medium text-[var(--text-secondary)] tabular-nums">
                        <ClockIcon className="w-3 h-3 text-[var(--text-tertiary)]" />
                        {routine.estimatedDurationMinutes} min
                      </span>
                    )}
                    {routine.difficultyLevel && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-medium text-[var(--text-secondary)]">
                        {routine.difficultyLevel}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--border-subtle)]">
                  <Link href={`/consultoria/${consultancySlug}/treinos`} className="block w-full">
                    <Button variant="primary" fullWidth size="md" className="font-semibold min-h-[44px]">
                      Acessar treino →
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 sm:p-10 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs text-center space-y-3 max-w-lg mx-auto depth-base">
            <div className="w-12 h-12 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-secondary)] mx-auto flex items-center justify-center shadow-2xs">
              <WorkoutIcon className="w-6 h-6" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] font-[family-name:var(--font-student-manrope)]">
              Aguardando prescrição de treino
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              Seu personal trainer está estruturando sua rotina personalizada de treinos. Assim que publicada, ela aparecerá aqui.
            </p>
          </div>
        )}
      </section>

      {/* ==================================================================== */}
      {/* 4. TRILHO DE NUTRIÇÃO (Editorial & Food Lifestyle Rail)               */}
      {/* ==================================================================== */}
      <section aria-label="Seu Plano Alimentar" className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight font-[family-name:var(--font-student-manrope)]">
              Seu Plano Alimentar
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-normal">
              {hasNutrition
                ? `${mealCount} ${mealCount === 1 ? "refeição estruturada" : "refeições estruturadas"} no plano ativo`
                : "Acompanhamento e orientações do nutricionista"}
            </p>
          </div>
          {hasNutrition && (
            <Link
              href={`/consultoria/${consultancySlug}/nutricao`}
              className="text-xs sm:text-sm font-semibold text-[var(--brand)] hover:underline inline-flex items-center gap-1 shrink-0"
            >
              Ver cardápio <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {hasNutrition ? (
          <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-4 overflow-x-auto pb-3 pt-1 snap-x snap-mandatory scrollbar-none">
            {/* Spotlight Editorial Card (Rule 7: Section editorial image, not meal-specific plate) */}
            <div className="relative w-[84vw] sm:w-[320px] md:w-[340px] shrink-0 snap-start rounded-3xl overflow-hidden border border-neutral-800 shadow-xs flex flex-col justify-between p-5 sm:p-6 bg-neutral-950 min-h-[260px]">
              <div className="absolute inset-0 z-0">
                <Image
                  src="/images/student/nutrition-editorial.webp"
                  alt="Alimentação saudável e consciente"
                  fill
                  sizes="(max-width: 768px) 80vw, 340px"
                  className="object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/70 to-neutral-950/30" />
              </div>

              <div className="relative z-10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-emerald-300 uppercase tracking-wider bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/60">
                    Plano Ativo
                  </span>
                  {firstMealTime && (
                    <span className="text-[10px] font-semibold text-neutral-300 bg-neutral-900/80 px-2 py-0.5 rounded-full tabular-nums">
                      1ª às {firstMealTime}
                    </span>
                  )}
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-[family-name:var(--font-student-manrope)] break-words">
                  {activeNutritionPlan.title}
                </h3>
                {activeNutritionPlan.subtitle && (
                  <p className="text-xs sm:text-sm text-neutral-300 line-clamp-2">
                    {activeNutritionPlan.subtitle}
                  </p>
                )}
              </div>

              <div className="relative z-10 pt-3">
                <Link href={`/consultoria/${consultancySlug}/nutricao`} className="block w-full">
                  <button
                    type="button"
                    className="w-full inline-flex items-center justify-center min-h-[44px] px-4 py-2 rounded-xl bg-white text-neutral-900 text-xs sm:text-sm font-semibold hover:bg-neutral-100 transition-colors shadow-sm cursor-pointer"
                  >
                    Ver cardápio completo →
                  </button>
                </Link>
              </div>
            </div>

            {/* Prescribed Meals Cards */}
            {activeNutritionPlan.meals && activeNutritionPlan.meals.length > 0 &&
              activeNutritionPlan.meals.map((meal, index) => (
                <div
                  key={meal.publicId || index}
                  className="w-[72vw] sm:w-[240px] md:w-[260px] shrink-0 snap-start p-5 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs flex flex-col justify-between space-y-4 depth-surface hover:border-[var(--border-strong)] transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                        Refeição {index + 1}
                      </span>
                      {meal.scheduledTime && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--text-secondary)] bg-[var(--surface-subtle)] border border-[var(--border-default)] px-2 py-0.5 rounded-lg tabular-nums">
                          <ClockIcon className="w-3 h-3 text-[var(--text-tertiary)]" />
                          {meal.scheduledTime}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight font-[family-name:var(--font-student-manrope)] break-words">
                        {meal.title}
                      </h4>
                      {meal.itemsCount !== undefined && meal.itemsCount > 0 && (
                        <p className="text-xs text-[var(--text-secondary)] font-medium">
                          {meal.itemsCount} {meal.itemsCount === 1 ? "item prescrito" : "itens prescritos"}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[var(--border-subtle)]">
                    <Link
                      href={`/consultoria/${consultancySlug}/nutricao`}
                      className="text-xs font-semibold text-[var(--brand)] hover:underline inline-flex items-center gap-1"
                    >
                      Ver detalhes <ArrowRightIcon className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="p-8 sm:p-10 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs text-center space-y-3 max-w-lg mx-auto depth-base">
            <div className="w-12 h-12 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-secondary)] mx-auto flex items-center justify-center shadow-2xs">
              <NutritionIcon className="w-6 h-6" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] font-[family-name:var(--font-student-manrope)]">
              Aguardando plano alimentar
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              Seu nutricionista está montando seu planejamento alimentar. As refeições e horários prescritos aparecerão organizados aqui.
            </p>
          </div>
        )}
      </section>

      {/* ==================================================================== */}
      {/* 5. SUA EVOLUÇÃO FÍSICA (WHOOP-like Quantitative Data)                 */}
      {/* ==================================================================== */}
      <section aria-label="Sua Evolução Física" className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight font-[family-name:var(--font-student-manrope)]">
              Sua Evolução
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-normal">
              {latestProgress
                ? `Último registro em ${formatDate(latestProgress.recordedOn)}`
                : "Acompanhe suas pesagens e medidas corporais"}
            </p>
          </div>
          {latestProgress && (
            <Link
              href={`/consultoria/${consultancySlug}/progresso`}
              className="text-xs sm:text-sm font-semibold text-[var(--brand)] hover:underline inline-flex items-center gap-1 shrink-0"
            >
              Histórico completo <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {latestProgress ? (
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-stretch">
            {/* Hero Biometric Card: Weight & Delta */}
            <div className="sm:col-span-5 p-6 rounded-3xl border border-[var(--border-strong)] bg-[var(--surface)] shadow-xs flex flex-col justify-between space-y-4 border-specular-t depth-surface">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-primary)] shadow-2xs">
                      <ProgressIcon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                      Peso Atual
                    </span>
                  </div>
                  <Badge variant="brand" size="sm">
                    Atualizado
                  </Badge>
                </div>

                <div className="space-y-1 pt-1">
                  {latestProgress.weightKg !== null && latestProgress.weightKg !== undefined ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl sm:text-5xl font-extrabold text-[var(--text-primary)] tabular-nums tracking-tight font-[family-name:var(--font-student-manrope)]">
                        {latestProgress.weightKg}
                      </span>
                      <span className="text-base sm:text-lg font-bold text-[var(--text-secondary)] font-[family-name:var(--font-student-manrope)]">
                        kg
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--text-secondary)]">Sem peso registrado</p>
                  )}

                  {/* Weight Delta (Strictly Rule 11: Render ONLY when 2 baseline points exist) */}
                  {weightDelta !== null && (
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-md tabular-nums ${
                          weightDelta > 0
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : weightDelta < 0
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400"
                        }`}
                      >
                        {weightDelta > 0 ? `+${weightDelta}` : weightDelta} kg
                      </span>
                      <span className="text-[11px] text-[var(--text-tertiary)]">
                        vs medição anterior ({formatDate(previousProgress!.recordedOn)})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
                <span className="text-xs text-[var(--text-tertiary)]">
                  Registro periódico
                </span>
                <Link href={`/consultoria/${consultancySlug}/progresso`}>
                  <Button variant="secondary" size="sm" className="font-semibold min-h-[40px]">
                    Nova medição →
                  </Button>
                </Link>
              </div>
            </div>

            {/* Circumferences Grid */}
            <div className="sm:col-span-7 p-6 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs flex flex-col justify-between space-y-4 depth-surface">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                    Medidas Corporais
                  </span>
                  <span className="text-xs text-[var(--text-secondary)] font-medium">
                    {formatDate(latestProgress.recordedOn)}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                  {latestProgress.waistCm !== null && latestProgress.waistCm !== undefined && (
                    <div className="p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                      <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                        Cintura
                      </span>
                      <p className="text-base sm:text-lg font-bold text-[var(--text-primary)] tabular-nums font-[family-name:var(--font-student-manrope)]">
                        {latestProgress.waistCm} <span className="text-xs font-normal text-[var(--text-secondary)]">cm</span>
                      </p>
                    </div>
                  )}

                  {latestProgress.abdomenCm !== null && latestProgress.abdomenCm !== undefined && (
                    <div className="p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                      <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                        Abdômen
                      </span>
                      <p className="text-base sm:text-lg font-bold text-[var(--text-primary)] tabular-nums font-[family-name:var(--font-student-manrope)]">
                        {latestProgress.abdomenCm} <span className="text-xs font-normal text-[var(--text-secondary)]">cm</span>
                      </p>
                    </div>
                  )}

                  {latestProgress.hipCm !== null && latestProgress.hipCm !== undefined && (
                    <div className="p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                      <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                        Quadril
                      </span>
                      <p className="text-base sm:text-lg font-bold text-[var(--text-primary)] tabular-nums font-[family-name:var(--font-student-manrope)]">
                        {latestProgress.hipCm} <span className="text-xs font-normal text-[var(--text-secondary)]">cm</span>
                      </p>
                    </div>
                  )}

                  {latestProgress.armCm !== null && latestProgress.armCm !== undefined && (
                    <div className="p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                      <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                        Braço
                      </span>
                      <p className="text-base sm:text-lg font-bold text-[var(--text-primary)] tabular-nums font-[family-name:var(--font-student-manrope)]">
                        {latestProgress.armCm} <span className="text-xs font-normal text-[var(--text-secondary)]">cm</span>
                      </p>
                    </div>
                  )}

                  {latestProgress.thighCm !== null && latestProgress.thighCm !== undefined && (
                    <div className="p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-0.5">
                      <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                        Coxa
                      </span>
                      <p className="text-base sm:text-lg font-bold text-[var(--text-primary)] tabular-nums font-[family-name:var(--font-student-manrope)]">
                        {latestProgress.thighCm} <span className="text-xs font-normal text-[var(--text-secondary)]">cm</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
                <span className="text-xs text-[var(--text-tertiary)]">
                  Evolução visual e biométrica
                </span>
                <Link
                  href={`/consultoria/${consultancySlug}/progresso`}
                  className="text-xs font-semibold text-[var(--brand)] hover:underline inline-flex items-center gap-1"
                >
                  Ver histórico completo <ArrowRightIcon className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 sm:p-10 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs text-center space-y-4 max-w-lg mx-auto depth-base">
            <div className="w-12 h-12 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-secondary)] mx-auto flex items-center justify-center shadow-2xs">
              <ProgressIcon className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] font-[family-name:var(--font-student-manrope)]">
                Inicie o registro de evolução
              </h3>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                Acompanhe seu peso e medidas corporais para visualizar seus resultados reais ao longo do tempo.
              </p>
            </div>
            <div>
              <Link href={`/consultoria/${consultancySlug}/progresso`}>
                <Button variant="primary" size="sm" className="font-semibold min-h-[44px]">
                  Registrar primeira medição →
                </Button>
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* ==================================================================== */}
      {/* 6. APOIO & SERVIÇOS (Consultas & Pagamentos — Domain Specific)        */}
      {/* Strictly Rule 10: Distinct composition per domain                    */}
      {/* ==================================================================== */}
      <section aria-label="Apoio e Serviços" className="space-y-3.5">
        <div className="px-1">
          <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] tracking-tight font-[family-name:var(--font-student-manrope)]">
            Apoio & Serviços
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-normal">
            Atendimento com profissionais e gerenciamento financeiro
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Consultas & Teleconsultas */}
          <div className="p-6 sm:p-7 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs flex flex-col justify-between space-y-5 depth-surface hover:border-[var(--border-strong)] transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-primary)] shadow-2xs">
                  <ConsultationIcon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Atendimento
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] font-[family-name:var(--font-student-manrope)]">
                  Consultas & Teleconsultas
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                  Agendamentos, horários de retorno e salas de videoconferência integradas com sua equipe.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--border-subtle)]">
              <Link href={`/consultoria/${consultancySlug}/consultas`} className="block w-full">
                <Button variant="secondary" fullWidth size="md" className="font-semibold min-h-[44px]">
                  Acessar consultas →
                </Button>
              </Link>
            </div>
          </div>

          {/* Card 2: Pagamentos & Faturas */}
          <div className="p-6 sm:p-7 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs flex flex-col justify-between space-y-5 depth-surface hover:border-[var(--border-strong)] transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-primary)] shadow-2xs">
                  <FinanceIcon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Financeiro
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] font-[family-name:var(--font-student-manrope)]">
                  Pagamentos & Faturas
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                  Controle de mensalidades, faturas em aberto e histórico de comprovantes emitidos.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--border-subtle)]">
              <Link href={`/consultoria/${consultancySlug}/pagamentos`} className="block w-full">
                <Button variant="secondary" fullWidth size="md" className="font-semibold min-h-[44px]">
                  Ver pagamentos →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
