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
// VOLUMETRIC SVG ICONS (Trevo One Art Direction)
// ============================================================================

function DumbbellIcon({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6.5 6.5 11 11" />
      <path d="m21 21-1-1a2 2 0 0 0-2.83 0l-2.5 2.5a2 2 0 0 1-2.83 0l-.84-.84a2 2 0 0 1 0-2.83l2.5-2.5a2 2 0 0 0 0-2.83l-1-1" />
      <path d="m3 3 1 1a2 2 0 0 0 2.83 0l2.5-2.5a2 2 0 0 1 2.83 0l.84.84a2 2 0 0 1 0 2.83l-2.5 2.5a2 2 0 0 0 0 2.83l1 1" />
    </svg>
  );
}

function ProgressVolumetricIcon({ className = "w-10 h-10 shrink-0" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="p-grad-chart" x1="8" y1="36" x2="40" y2="12" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
        <radialGradient id="p-rad-glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(24 24) rotate(90) scale(20)">
          <stop stopColor="#3b82f6" stopOpacity="0.25" />
          <stop offset="1" stopColor="#3b82f6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="20" fill="url(#p-rad-glow)" />
      <rect x="10" y="26" width="6" height="12" rx="3" fill="url(#p-grad-chart)" fillOpacity="0.6" />
      <rect x="19" y="18" width="6" height="20" rx="3" fill="url(#p-grad-chart)" fillOpacity="0.8" />
      <rect x="28" y="12" width="6" height="26" rx="3" fill="url(#p-grad-chart)" />
      <path d="M12 22L21 14L28 17L37 8" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="37" cy="8" r="3" fill="#93c5fd" />
    </svg>
  );
}

function FinanceVolumetricIcon({ className = "w-10 h-10 shrink-0" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="f-grad-card" x1="8" y1="12" x2="40" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#6d28d9" />
        </linearGradient>
        <radialGradient id="f-rad-glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(24 24) rotate(90) scale(20)">
          <stop stopColor="#8b5cf6" stopOpacity="0.25" />
          <stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="20" fill="url(#f-rad-glow)" />
      <rect x="8" y="14" width="32" height="22" rx="4" fill="url(#f-grad-card)" />
      <rect x="8" y="19" width="32" height="5" fill="#4c1d95" />
      <rect x="13" y="27" width="6" height="5" rx="1" fill="#fde047" />
      <rect x="22" y="28" width="12" height="2" rx="1" fill="#c4b5fd" />
    </svg>
  );
}

function ConsultationVolumetricIcon({ className = "w-10 h-10 shrink-0" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="c-grad-cam" x1="8" y1="12" x2="40" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#06b6d4" />
          <stop offset="1" stopColor="#0891b2" />
        </linearGradient>
        <radialGradient id="c-rad-glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(24 24) rotate(90) scale(20)">
          <stop stopColor="#06b6d4" stopOpacity="0.25" />
          <stop offset="1" stopColor="#06b6d4" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="20" fill="url(#c-rad-glow)" />
      <rect x="8" y="14" width="22" height="20" rx="4" fill="url(#c-grad-cam)" />
      <path d="M30 20L38 15V33L30 28V20Z" fill="url(#c-grad-cam)" />
      <circle cx="19" cy="24" r="4" fill="#cffafe" fillOpacity="0.8" />
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
        <div className="p-4.5 sm:p-5 rounded-2xl border border-[var(--warning-border)] bg-[var(--warning-soft)] shadow-xs">
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
                <Button variant="primary" size="sm" className="font-bold min-h-[44px]">
                  Continuar cadastro →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 2. ÁREA DE PLANOS ATIVOS */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider px-1">
          Planos Ativos
        </h2>

        {hasBothHeroes ? (
          <>
            {/* Mobile & Tablet: Vertical Stack (100% width, Treino first, Nutrição second, zero horizontal scroll) */}
            <div className="lg:hidden flex flex-col gap-4">
              {/* Card 1: Treino Prescrito (Protagonista) */}
              <div className="p-5 sm:p-6 rounded-3xl border border-[var(--brand-soft-border)] bg-[var(--surface)] shadow-xs flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-[var(--brand-foreground)] uppercase tracking-wider">
                      Seu Treino Prescrito
                    </span>
                    <Badge variant="success" size="sm">
                      Plano Ativo
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight break-words">
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
                      <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-semibold text-[var(--text-primary)]">
                        {blockCount} {blockCount === 1 ? "bloco de treino" : "blocos de treino"}
                      </span>
                    )}
                    {totalExercises !== undefined && totalExercises > 0 && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-semibold text-[var(--text-primary)]">
                        {totalExercises} {totalExercises === 1 ? "exercício" : "exercícios no plano"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end">
                  <Link href={`/consultoria/${consultancySlug}/treinos`} className="w-full sm:w-auto">
                    <Button variant="primary" fullWidth size="md" className="font-bold min-h-[44px] sm:px-6">
                      Acessar treino →
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Card 2: Plano Alimentar (Apoio) */}
              <div className="p-5 sm:p-6 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs flex flex-col justify-between space-y-4">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                      Plano Alimentar
                    </span>
                    <Badge variant="success" size="sm">
                      Plano Ativo
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight break-words">
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
                      <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-semibold text-[var(--text-primary)]">
                        1ª às {firstMealTime}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end">
                  <Link href={`/consultoria/${consultancySlug}/nutricao`} className="w-full sm:w-auto">
                    <Button variant="secondary" fullWidth size="md" className="font-bold min-h-[44px] sm:px-6">
                      Ver alimentação →
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Desktop: Grid de 2 Colunas com Prioridade para Treino (7/12 e 5/12) */}
            <div className="hidden lg:grid lg:grid-cols-12 lg:gap-6 items-stretch">
              {/* Card 1: Treino Prescrito (Protagonista) */}
              <div className="lg:col-span-7 p-6 sm:p-7 rounded-3xl border border-[var(--brand-soft-border)] bg-[var(--surface)] shadow-xs flex flex-col justify-between space-y-5 hover:border-[var(--brand)] transition-colors">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-[var(--brand-foreground)] uppercase tracking-wider">
                      Seu Treino Prescrito
                    </span>
                    <Badge variant="success" size="sm">
                      Plano Ativo
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-2xl xl:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight break-words">
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
                      <span className="inline-flex items-center px-3 py-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-semibold text-[var(--text-primary)]">
                        {blockCount} {blockCount === 1 ? "bloco de treino" : "blocos de treino"}
                      </span>
                    )}
                    {totalExercises !== undefined && totalExercises > 0 && (
                      <span className="inline-flex items-center px-3 py-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-semibold text-[var(--text-primary)]">
                        {totalExercises} {totalExercises === 1 ? "exercício" : "exercícios no plano"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-end">
                  <Link href={`/consultoria/${consultancySlug}/treinos`} className="shrink-0">
                    <Button variant="primary" size="md" className="font-bold min-h-[44px] px-6">
                      Acessar treino →
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Card 2: Plano Alimentar (Apoio) */}
              <div className="lg:col-span-5 p-6 sm:p-7 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs flex flex-col justify-between space-y-5 hover:border-[var(--border-strong)] transition-colors">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                      Plano Alimentar
                    </span>
                    <Badge variant="success" size="sm">
                      Plano Ativo
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl xl:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight break-words">
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
                      <span className="inline-flex items-center px-3 py-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-semibold text-[var(--text-primary)]">
                        1ª às {firstMealTime}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-end">
                  <Link href={`/consultoria/${consultancySlug}/nutricao`} className="shrink-0">
                    <Button variant="secondary" size="md" className="font-bold min-h-[44px] px-5">
                      Ver alimentação →
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </>
        ) : hasTraining ? (
          /* Apenas Treino Ativo */
          <div className="p-6 sm:p-7 rounded-3xl border border-[var(--brand-soft-border)] bg-[var(--surface)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:border-[var(--brand)] transition-colors">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[var(--brand-foreground)] uppercase tracking-wider">
                  Seu Treino Prescrito
                </span>
                <Badge variant="success" size="sm">
                  Plano Ativo
                </Badge>
              </div>

              <div className="space-y-1">
                <h3 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight break-words">
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
                  <span className="inline-flex items-center px-3 py-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-semibold text-[var(--text-primary)]">
                    {blockCount} {blockCount === 1 ? "bloco de treino" : "blocos de treino"}
                  </span>
                )}
                {totalExercises !== undefined && totalExercises > 0 && (
                  <span className="inline-flex items-center px-3 py-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-semibold text-[var(--text-primary)]">
                    {totalExercises} {totalExercises === 1 ? "exercício" : "exercícios no plano"}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center shrink-0 pt-2 sm:pt-0">
              <Link href={`/consultoria/${consultancySlug}/treinos`}>
                <Button variant="primary" size="md" className="font-bold min-h-[44px] px-6">
                  Acessar treino →
                </Button>
              </Link>
            </div>
          </div>
        ) : hasNutrition ? (
          /* Apenas Nutrição Ativa */
          <div className="p-6 sm:p-7 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:border-[var(--border-strong)] transition-colors">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                  Plano Alimentar
                </span>
                <Badge variant="success" size="sm">
                  Plano Ativo
                </Badge>
              </div>

              <div className="space-y-1">
                <h3 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight break-words">
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
                  <span className="inline-flex items-center px-3 py-1 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-xs font-semibold text-[var(--text-primary)]">
                    1ª às {firstMealTime}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center shrink-0 pt-2 sm:pt-0">
              <Link href={`/consultoria/${consultancySlug}/nutricao`}>
                <Button variant="secondary" size="md" className="font-bold min-h-[44px] px-6">
                  Ver alimentação →
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          /* Estado Vazio Harmonioso e Acolhedor (Sem planos ainda) */
          <div className="p-7 sm:p-8 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs text-center space-y-4 max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] text-[var(--brand-foreground)] mx-auto flex items-center justify-center">
              <DumbbellIcon className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">
                Aguardando prescrições
              </h3>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                Sua equipe da consultoria está preparando sua rotina de treinos e planejamento nutricional personalizado.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 3. ATALHOS DE ACESSO RÁPIDO */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider px-1">
          Acesso Rápido
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Tile: Evolução */}
          <Link
            href={`/consultoria/${consultancySlug}/progresso`}
            className="group flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl border border-[var(--border-default)] hover:border-[var(--brand-soft-border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] shadow-xs hover:shadow-sm hover:-translate-y-0.5 transition-all duration-150 min-h-[44px]"
          >
            <ProgressVolumetricIcon className="w-10 h-10 shrink-0" />
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                Evolução
              </p>
              <p className="text-[11px] text-[var(--text-secondary)] font-medium truncate">
                Medidas e peso
              </p>
            </div>
          </Link>

          {/* Tile: Pagamentos */}
          <Link
            href={`/consultoria/${consultancySlug}/pagamentos`}
            className="group flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl border border-[var(--border-default)] hover:border-[var(--brand-soft-border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] shadow-xs hover:shadow-sm hover:-translate-y-0.5 transition-all duration-150 min-h-[44px]"
          >
            <FinanceVolumetricIcon className="w-10 h-10 shrink-0" />
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                Pagamentos
              </p>
              <p className="text-[11px] text-[var(--text-secondary)] font-medium truncate">
                Faturas e recibos
              </p>
            </div>
          </Link>

          {/* Tile: Consultas */}
          <Link
            href={`/consultoria/${consultancySlug}/consultas`}
            className="group flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl border border-[var(--border-default)] hover:border-[var(--brand-soft-border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] shadow-xs hover:shadow-sm hover:-translate-y-0.5 transition-all duration-150 min-h-[44px] col-span-2 sm:col-span-1"
          >
            <ConsultationVolumetricIcon className="w-10 h-10 shrink-0" />
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                Consultas
              </p>
              <p className="text-[11px] text-[var(--text-secondary)] font-medium truncate">
                Videochamadas
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* 4. SEGUNDA SEÇÃO: DUAS COLUNAS (Evolução Física + Estrutura de Refeições) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Coluna 1: Sua Evolução Física */}
        <div className="p-6 sm:p-7 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs flex flex-col justify-between space-y-5">
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
                  <Button variant="ghost" size="sm" className="font-semibold text-xs text-[var(--brand)] hover:text-[var(--brand-hover)] p-0 h-auto">
                    Histórico →
                  </Button>
                </Link>
              )}
            </div>

            {latestProgress ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                {latestProgress.weightKg !== null && latestProgress.weightKg !== undefined && (
                  <div className="p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                    <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                      Peso
                    </span>
                    <p className="text-base sm:text-lg font-extrabold text-[var(--text-primary)]">
                      {latestProgress.weightKg} <span className="text-xs font-semibold text-[var(--text-secondary)]">kg</span>
                    </p>
                  </div>
                )}

                {latestProgress.waistCm !== null && latestProgress.waistCm !== undefined && (
                  <div className="p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                    <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                      Cintura
                    </span>
                    <p className="text-base sm:text-lg font-extrabold text-[var(--text-primary)]">
                      {latestProgress.waistCm} <span className="text-xs font-semibold text-[var(--text-secondary)]">cm</span>
                    </p>
                  </div>
                )}

                {latestProgress.abdomenCm !== null && latestProgress.abdomenCm !== undefined && (
                  <div className="p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                    <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                      Abdômen
                    </span>
                    <p className="text-base sm:text-lg font-extrabold text-[var(--text-primary)]">
                      {latestProgress.abdomenCm} <span className="text-xs font-semibold text-[var(--text-secondary)]">cm</span>
                    </p>
                  </div>
                )}

                {latestProgress.hipCm !== null && latestProgress.hipCm !== undefined && (
                  <div className="p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-1">
                    <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                      Quadril
                    </span>
                    <p className="text-base sm:text-lg font-extrabold text-[var(--text-primary)]">
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
        <div className="p-6 sm:p-7 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs flex flex-col justify-between space-y-5">
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
                className="text-xs font-bold text-[var(--brand)] hover:underline shrink-0"
              >
                Ver cardápio completo →
              </Link>
            </div>

            {hasNutrition && activeNutritionPlan.meals && activeNutritionPlan.meals.length > 0 ? (
              <div className="space-y-2 pt-1">
                {activeNutritionPlan.meals.slice(0, 3).map((meal, index) => (
                  <div
                    key={meal.publicId || index}
                    className="p-3 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                        {meal.title}
                      </p>
                      {meal.itemsCount != null && meal.itemsCount > 0 && (
                        <p className="text-[11px] text-[var(--text-secondary)]">
                          {meal.itemsCount} {meal.itemsCount === 1 ? "item prescrito" : "itens prescritos"}
                        </p>
                      )}
                    </div>

                    {meal.scheduledTime && (
                      <span className="text-[11px] font-bold text-[var(--brand-foreground)] bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] px-2.5 py-1 rounded-xl shrink-0">
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
              <Button variant="ghost" size="sm" className="font-semibold text-xs text-[var(--brand)] hover:text-[var(--brand-hover)] p-0 h-auto">
                Consultar detalhes →
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
