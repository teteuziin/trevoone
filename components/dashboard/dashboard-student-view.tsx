import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface StudentActiveTrainingSummary {
  title: string;
  subtitle?: string | null;
  workoutCount?: number;
  totalExercises?: number;
  blockCount?: number;
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
  onboarding: StudentOnboardingInfo | null;
  activeTrainingPlan: StudentActiveTrainingSummary | null;
  activeNutritionPlan: StudentActiveNutritionSummary | null;
  latestProgress: LatestProgressInfo | null;
}

// ============================================================================
// CLEAN TACTILE ICONS (Trevo One Art Direction — Zero static duplicate gradient IDs)
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

export function DashboardStudentView({
  consultancySlug,
  onboarding,
  activeTrainingPlan,
  activeNutritionPlan,
  latestProgress,
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
  const hasBothHeroes = hasTraining && hasNutrition;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 1. ONBOARDING MANDATÓRIO (Se aplicável e incompleto) */}
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
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
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

      {/* 2. ÁREA DE PLANOS ATIVOS (Hero touch-first composition) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
            Planos Ativos
          </h2>
          {hasTraining && (
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">
              Prescrição atualizada
            </span>
          )}
        </div>

        {hasBothHeroes ? (
          <>
            {/* Mobile & Tablet: Vertical Stack (100% width, Treino first, Nutrição second) */}
            <div className="lg:hidden flex flex-col gap-4">
              {/* Card 1: Treino Prescrito (Hero Protagonista) */}
              <div className="p-5 sm:p-6 rounded-3xl border border-[var(--border-strong)] bg-[var(--surface)] shadow-xs flex flex-col justify-between space-y-5 border-specular-t depth-surface">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-primary)] shadow-2xs">
                        <WorkoutIcon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                        Seu Treino Prescrito
                      </span>
                    </div>
                    <Badge variant="success" size="sm">
                      Ativo
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight break-words">
                      {activeTrainingPlan.title}
                    </h3>
                    {activeTrainingPlan.subtitle && (
                      <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium line-clamp-2">
                        {activeTrainingPlan.subtitle}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-semibold text-[var(--text-primary)]">
                      {workoutCount} {workoutCount === 1 ? "rotina prescrita" : "rotinas prescritas"}
                    </span>
                    {blockCount !== undefined && blockCount > 0 && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-medium text-[var(--text-secondary)]">
                        {blockCount} {blockCount === 1 ? "bloco de treino" : "blocos de treino"}
                      </span>
                    )}
                    {totalExercises !== undefined && totalExercises > 0 && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-medium text-[var(--text-secondary)]">
                        {totalExercises} {totalExercises === 1 ? "exercício" : "exercícios no plano"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end">
                  <Link href={`/consultoria/${consultancySlug}/treinos`} className="w-full sm:w-auto">
                    <Button variant="primary" fullWidth size="md" className="font-semibold min-h-[48px] sm:px-6 shadow-xs">
                      Acessar treino →
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Card 2: Plano Alimentar (Apoio Nutricional) */}
              <div className="p-5 sm:p-6 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs flex flex-col justify-between space-y-5 depth-surface">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-primary)] shadow-2xs">
                        <NutritionIcon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                        Plano Alimentar
                      </span>
                    </div>
                    <Badge variant="success" size="sm">
                      Ativo
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight break-words">
                      {activeNutritionPlan.title}
                    </h3>
                    {activeNutritionPlan.subtitle && (
                      <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium line-clamp-2">
                        {activeNutritionPlan.subtitle}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-semibold text-[var(--text-primary)]">
                      {mealCount} {mealCount === 1 ? "refeição estruturada" : "refeições estruturadas"}
                    </span>
                    {firstMealTime && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-medium text-[var(--text-secondary)]">
                        1ª às {firstMealTime}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end">
                  <Link href={`/consultoria/${consultancySlug}/nutricao`} className="w-full sm:w-auto">
                    <Button variant="secondary" fullWidth size="md" className="font-semibold min-h-[48px] sm:px-6 shadow-xs">
                      Ver alimentação →
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Desktop: Grid de 12 Colunas (7/12 Treino Hero + 5/12 Nutrição) */}
            <div className="hidden lg:grid lg:grid-cols-12 lg:gap-6 items-stretch">
              {/* Card 1: Treino Prescrito (Hero Protagonista) */}
              <div className="lg:col-span-7 p-6 sm:p-7 rounded-3xl border border-[var(--border-strong)] bg-[var(--surface)] shadow-xs flex flex-col justify-between space-y-6 border-specular-t depth-surface hover:border-[var(--brand)] transition-all">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-primary)] shadow-2xs">
                        <WorkoutIcon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                        Seu Treino Prescrito
                      </span>
                    </div>
                    <Badge variant="success" size="sm">
                      Ativo
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-2xl xl:text-3xl font-bold text-[var(--text-primary)] tracking-tight break-words">
                      {activeTrainingPlan.title}
                    </h3>
                    {activeTrainingPlan.subtitle && (
                      <p className="text-sm text-[var(--text-secondary)] font-medium line-clamp-2">
                        {activeTrainingPlan.subtitle}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="inline-flex items-center px-3 py-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-semibold text-[var(--text-primary)]">
                      {workoutCount} {workoutCount === 1 ? "rotina prescrita" : "rotinas prescritas"}
                    </span>
                    {blockCount !== undefined && blockCount > 0 && (
                      <span className="inline-flex items-center px-3 py-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-medium text-[var(--text-secondary)]">
                        {blockCount} {blockCount === 1 ? "bloco de treino" : "blocos de treino"}
                      </span>
                    )}
                    {totalExercises !== undefined && totalExercises > 0 && (
                      <span className="inline-flex items-center px-3 py-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-medium text-[var(--text-secondary)]">
                        {totalExercises} {totalExercises === 1 ? "exercício" : "exercícios no plano"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-end">
                  <Link href={`/consultoria/${consultancySlug}/treinos`} className="shrink-0">
                    <Button variant="primary" size="md" className="font-semibold min-h-[44px] px-6 shadow-xs">
                      Acessar treino →
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Card 2: Plano Alimentar (Apoio Nutricional) */}
              <div className="lg:col-span-5 p-6 sm:p-7 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs flex flex-col justify-between space-y-6 depth-surface hover:border-[var(--border-strong)] transition-all">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-primary)] shadow-2xs">
                        <NutritionIcon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                        Plano Alimentar
                      </span>
                    </div>
                    <Badge variant="success" size="sm">
                      Ativo
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl xl:text-2xl font-bold text-[var(--text-primary)] tracking-tight break-words">
                      {activeNutritionPlan.title}
                    </h3>
                    {activeNutritionPlan.subtitle && (
                      <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium line-clamp-2">
                        {activeNutritionPlan.subtitle}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="inline-flex items-center px-3 py-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-semibold text-[var(--text-primary)]">
                      {mealCount} {mealCount === 1 ? "refeição estruturada" : "refeições estruturadas"}
                    </span>
                    {firstMealTime && (
                      <span className="inline-flex items-center px-3 py-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-medium text-[var(--text-secondary)]">
                        1ª às {firstMealTime}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-end">
                  <Link href={`/consultoria/${consultancySlug}/nutricao`} className="shrink-0">
                    <Button variant="secondary" size="md" className="font-semibold min-h-[44px] px-5 shadow-xs">
                      Ver alimentação →
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </>
        ) : hasTraining ? (
          /* Apenas Treino Ativo */
          <div className="p-6 sm:p-7 rounded-3xl border border-[var(--border-strong)] bg-[var(--surface)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-specular-t depth-surface hover:border-[var(--brand)] transition-all">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-primary)] shadow-2xs">
                  <WorkoutIcon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Seu Treino Prescrito
                </span>
                <Badge variant="success" size="sm">
                  Ativo
                </Badge>
              </div>

              <div className="space-y-1">
                <h3 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight break-words">
                  {activeTrainingPlan.title}
                </h3>
                {activeTrainingPlan.subtitle && (
                  <p className="text-sm text-[var(--text-secondary)] font-medium">
                    {activeTrainingPlan.subtitle}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="inline-flex items-center px-3 py-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-semibold text-[var(--text-primary)]">
                  {workoutCount} {workoutCount === 1 ? "rotina prescrita" : "rotinas prescritas"}
                </span>
                {blockCount !== undefined && blockCount > 0 && (
                  <span className="inline-flex items-center px-3 py-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-medium text-[var(--text-secondary)]">
                    {blockCount} {blockCount === 1 ? "bloco de treino" : "blocos de treino"}
                  </span>
                )}
                {totalExercises !== undefined && totalExercises > 0 && (
                  <span className="inline-flex items-center px-3 py-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-medium text-[var(--text-secondary)]">
                    {totalExercises} {totalExercises === 1 ? "exercício" : "exercícios no plano"}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center shrink-0 pt-2 sm:pt-0">
              <Link href={`/consultoria/${consultancySlug}/treinos`}>
                <Button variant="primary" size="md" className="font-semibold min-h-[44px] px-6 shadow-xs">
                  Acessar treino →
                </Button>
              </Link>
            </div>
          </div>
        ) : hasNutrition ? (
          /* Apenas Nutrição Ativa */
          <div className="p-6 sm:p-7 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6 depth-surface hover:border-[var(--border-strong)] transition-all">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-primary)] shadow-2xs">
                  <NutritionIcon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Plano Alimentar
                </span>
                <Badge variant="success" size="sm">
                  Ativo
                </Badge>
              </div>

              <div className="space-y-1">
                <h3 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight break-words">
                  {activeNutritionPlan.title}
                </h3>
                {activeNutritionPlan.subtitle && (
                  <p className="text-sm text-[var(--text-secondary)] font-medium">
                    {activeNutritionPlan.subtitle}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="inline-flex items-center px-3 py-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-semibold text-[var(--text-primary)]">
                  {mealCount} {mealCount === 1 ? "refeição estruturada" : "refeições estruturadas"}
                </span>
                {firstMealTime && (
                  <span className="inline-flex items-center px-3 py-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-medium text-[var(--text-secondary)]">
                    1ª às {firstMealTime}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center shrink-0 pt-2 sm:pt-0">
              <Link href={`/consultoria/${consultancySlug}/nutricao`}>
                <Button variant="secondary" size="md" className="font-semibold min-h-[44px] px-6 shadow-xs">
                  Ver alimentação →
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          /* Estado Vazio Harmonioso e Monocromático (Sem planos prescritos ainda) */
          <div className="p-8 sm:p-10 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs text-center space-y-4 max-w-md mx-auto depth-base">
            <div className="w-12 h-12 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-secondary)] mx-auto flex items-center justify-center shadow-2xs">
              <WorkoutIcon className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                Aguardando prescrições
              </h3>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                Sua equipe da consultoria está preparando sua rotina de treinos e planejamento nutricional personalizado.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 3. ATALHOS DE ACESSO RÁPIDO (Tactile 3D Cards com ícones lineares monocromáticos) */}
      <div className="space-y-3">
        <h2 className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider px-1">
          Acesso Rápido
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Tile: Evolução */}
          <Link
            href={`/consultoria/${consultancySlug}/progresso`}
            className="group flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl border border-[var(--border-default)] hover:border-[var(--border-strong)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] shadow-xs hover:shadow-sm transition-all duration-150 min-h-[44px] depth-interactive"
          >
            <div className="w-10 h-10 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] shrink-0 shadow-2xs transition-colors">
              <ProgressIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-semibold text-[var(--text-primary)] transition-colors truncate">
                Evolução
              </p>
              <p className="text-[11px] text-[var(--text-tertiary)] font-medium truncate">
                Medidas e peso
              </p>
            </div>
          </Link>

          {/* Tile: Pagamentos */}
          <Link
            href={`/consultoria/${consultancySlug}/pagamentos`}
            className="group flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl border border-[var(--border-default)] hover:border-[var(--border-strong)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] shadow-xs hover:shadow-sm transition-all duration-150 min-h-[44px] depth-interactive"
          >
            <div className="w-10 h-10 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] shrink-0 shadow-2xs transition-colors">
              <FinanceIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-semibold text-[var(--text-primary)] transition-colors truncate">
                Pagamentos
              </p>
              <p className="text-[11px] text-[var(--text-tertiary)] font-medium truncate">
                Faturas e recibos
              </p>
            </div>
          </Link>

          {/* Tile: Consultas */}
          <Link
            href={`/consultoria/${consultancySlug}/consultas`}
            className="group flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl border border-[var(--border-default)] hover:border-[var(--border-strong)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] shadow-xs hover:shadow-sm transition-all duration-150 min-h-[44px] col-span-2 sm:col-span-1 depth-interactive"
          >
            <div className="w-10 h-10 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] shrink-0 shadow-2xs transition-colors">
              <ConsultationIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-semibold text-[var(--text-primary)] transition-colors truncate">
                Consultas
              </p>
              <p className="text-[11px] text-[var(--text-tertiary)] font-medium truncate">
                Teleconsultas
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* 4. SEGUNDA SEÇÃO: DUAS COLUNAS (Evolução Física + Estrutura de Refeições) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Coluna 1: Sua Evolução Física */}
        <div className="p-6 sm:p-7 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs flex flex-col justify-between space-y-5 depth-surface">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                    Sua Evolução Física
                  </h3>
                  {latestProgress && (
                    <Badge variant="brand" size="sm">
                      Atualizado
                    </Badge>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium">
                  {latestProgress
                    ? `Último registro em ${formatDate(latestProgress.recordedOn)}`
                    : "Acompanhe seu peso e medidas corporais."}
                </p>
              </div>

              {latestProgress && (
                <Link href={`/consultoria/${consultancySlug}/progresso`}>
                  <Button variant="ghost" size="sm" className="font-semibold text-xs text-[var(--text-primary)] hover:text-[var(--brand)] p-0 h-auto">
                    Histórico →
                  </Button>
                </Link>
              )}
            </div>

            {latestProgress ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                {latestProgress.weightKg !== null && latestProgress.weightKg !== undefined && (
                  <div className="p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                    <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                      Peso
                    </span>
                    <p className="text-base sm:text-lg font-bold text-[var(--text-primary)] tabular-nums">
                      {latestProgress.weightKg} <span className="text-xs font-semibold text-[var(--text-secondary)]">kg</span>
                    </p>
                  </div>
                )}

                {latestProgress.waistCm !== null && latestProgress.waistCm !== undefined && (
                  <div className="p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                    <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                      Cintura
                    </span>
                    <p className="text-base sm:text-lg font-bold text-[var(--text-primary)] tabular-nums">
                      {latestProgress.waistCm} <span className="text-xs font-semibold text-[var(--text-secondary)]">cm</span>
                    </p>
                  </div>
                )}

                {latestProgress.abdomenCm !== null && latestProgress.abdomenCm !== undefined && (
                  <div className="p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                    <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                      Abdômen
                    </span>
                    <p className="text-base sm:text-lg font-bold text-[var(--text-primary)] tabular-nums">
                      {latestProgress.abdomenCm} <span className="text-xs font-semibold text-[var(--text-secondary)]">cm</span>
                    </p>
                  </div>
                )}

                {latestProgress.hipCm !== null && latestProgress.hipCm !== undefined && (
                  <div className="p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                    <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                      Quadril
                    </span>
                    <p className="text-base sm:text-lg font-bold text-[var(--text-primary)] tabular-nums">
                      {latestProgress.hipCm} <span className="text-xs font-semibold text-[var(--text-secondary)]">cm</span>
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-3 text-center sm:text-left">
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                  Acompanhe seu peso e medidas corporais para visualizar seus resultados ao longo do tempo.
                </p>
                <div>
                  <Link href={`/consultoria/${consultancySlug}/progresso`}>
                    <Button variant="secondary" size="sm" className="font-semibold min-h-[44px]">
                      Registrar primeira medição →
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {latestProgress && (
            <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
              <span className="text-xs text-[var(--text-tertiary)]">
                Medições periódicas
              </span>
              <Link href={`/consultoria/${consultancySlug}/progresso`}>
                <Button variant="secondary" size="sm" className="font-semibold min-h-[40px]">
                  Nova medição →
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Coluna 2: Estrutura de Refeições ou Apoio Nutricional */}
        <div className="p-6 sm:p-7 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs flex flex-col justify-between space-y-5 depth-surface">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                  Estrutura de Refeições
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium">
                  {hasNutrition && activeNutritionPlan.meals && activeNutritionPlan.meals.length > 0
                    ? `${activeNutritionPlan.meals.length} ${activeNutritionPlan.meals.length === 1 ? "refeição prescrita" : "refeições prescritas"} no plano atual`
                    : "Cardápio e orientações do nutricionista."}
                </p>
              </div>

              <Link
                href={`/consultoria/${consultancySlug}/nutricao`}
                className="text-xs font-semibold text-[var(--brand)] hover:underline shrink-0"
              >
                Ver cardápio completo →
              </Link>
            </div>

            {hasNutrition && activeNutritionPlan.meals && activeNutritionPlan.meals.length > 0 ? (
              <div className="space-y-2 pt-1">
                {activeNutritionPlan.meals.slice(0, 3).map((meal, index) => (
                  <div
                    key={meal.publicId || index}
                    className="p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-between gap-3 depth-interactive"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                        {meal.title}
                      </p>
                      {meal.itemsCount != null && meal.itemsCount > 0 && (
                        <p className="text-[11px] text-[var(--text-tertiary)]">
                          {meal.itemsCount} {meal.itemsCount === 1 ? "item prescrito" : "itens prescritos"}
                        </p>
                      )}
                    </div>

                    {meal.scheduledTime && (
                      <span className="text-[10px] font-semibold text-[var(--text-secondary)] bg-[var(--surface)] border border-[var(--border-default)] px-2 py-0.5 rounded-lg shrink-0 shadow-2xs tabular-nums">
                        {meal.scheduledTime}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-3 text-center sm:text-left">
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                  Assim que seu nutricionista prescrever seu plano, as refeições e horários recomendados aparecerão organizados aqui.
                </p>
                <div>
                  <Link href={`/consultoria/${consultancySlug}/nutricao`}>
                    <Button variant="secondary" size="sm" className="font-semibold min-h-[44px]">
                      Acessar nutrição →
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <span className="text-xs text-[var(--text-tertiary)]">
              Plano alimentar personalizado
            </span>
            <Link href={`/consultoria/${consultancySlug}/nutricao`}>
              <Button variant="ghost" size="sm" className="font-semibold text-xs text-[var(--text-primary)] hover:text-[var(--brand)] p-0 h-auto">
                Consultar detalhes →
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
