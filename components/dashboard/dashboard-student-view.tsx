import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TrainingPlanDto } from "@/lib/consultancies/training";
import type { NutritionPlanDto } from "@/lib/consultancies/nutrition";

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
  activeTrainingPlan: TrainingPlanDto | null;
  activeNutritionPlan: NutritionPlanDto | null;
  latestProgress: LatestProgressInfo | null;
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

  return (
    <div className="space-y-6">
      {/* 1. Onboarding Obrigatório se Pendente */}
      {hasIncompleteOnboarding && (
        <div className="p-4 sm:p-5 rounded-2xl border border-[var(--warning-border)] bg-[var(--warning-soft)] shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="warning" size="sm">
                  Etapa Obrigatória
                </Badge>
                <span className="text-xs font-medium text-[var(--warning-foreground)]">
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
                <Button variant="primary" size="sm" className="font-semibold">
                  Continuar onboarding →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 2. Grid de Acompanhamento Ativo: Treino e Nutrição */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bloco de Treino */}
        <div className="p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs flex flex-col justify-between space-y-4 hover:border-[var(--border-strong)] transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] flex items-center justify-center text-[var(--brand)]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Treino Prescrito
                </h3>
              </div>
              <Badge variant={activeTrainingPlan ? "success" : "neutral"} size="sm">
                {activeTrainingPlan ? "Plano Ativo" : "Pendente"}
              </Badge>
            </div>

            {activeTrainingPlan ? (
              <div className="space-y-1.5">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] line-clamp-1">
                  {activeTrainingPlan.title}
                </h4>
                {activeTrainingPlan.subtitle && (
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-1">
                    {activeTrainingPlan.subtitle}
                  </p>
                )}
                <p className="text-xs text-[var(--text-tertiary)]">
                  {activeTrainingPlan.workouts.length}{" "}
                  {activeTrainingPlan.workouts.length === 1 ? "rotina cadastrada" : "rotinas cadastradas"}
                </p>
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                Nenhuma ficha de treino ativa no momento. Seu treinador prescreverá sua rotina em breve.
              </p>
            )}
          </div>

          <div className="pt-2 border-t border-[var(--border-subtle)]">
            <Link href={`/consultoria/${consultancySlug}/treinos`} className="block w-full">
              <Button variant={activeTrainingPlan ? "primary" : "secondary"} fullWidth size="sm" className="font-semibold">
                {activeTrainingPlan ? "Acessar treinos →" : "Ver módulo de treinos"}
              </Button>
            </Link>
          </div>
        </div>

        {/* Bloco de Nutrição */}
        <div className="p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs flex flex-col justify-between space-y-4 hover:border-[var(--border-strong)] transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] flex items-center justify-center text-[var(--brand)]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Plano Alimentar
                </h3>
              </div>
              <Badge variant={activeNutritionPlan ? "success" : "neutral"} size="sm">
                {activeNutritionPlan ? "Plano Ativo" : "Pendente"}
              </Badge>
            </div>

            {activeNutritionPlan ? (
              <div className="space-y-1.5">
                <h4 className="text-sm font-semibold text-[var(--text-primary)] line-clamp-1">
                  {activeNutritionPlan.title}
                </h4>
                {activeNutritionPlan.subtitle && (
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-1">
                    {activeNutritionPlan.subtitle}
                  </p>
                )}
                <p className="text-xs text-[var(--text-tertiary)]">
                  {activeNutritionPlan.meals.length}{" "}
                  {activeNutritionPlan.meals.length === 1 ? "refeição estruturada" : "refeições estruturadas"}
                </p>
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                Nenhum plano alimentar ativo no momento. Seu nutricionista disponibilizará seu cardápio em breve.
              </p>
            )}
          </div>

          <div className="pt-2 border-t border-[var(--border-subtle)]">
            <Link href={`/consultoria/${consultancySlug}/nutricao`} className="block w-full">
              <Button variant={activeNutritionPlan ? "primary" : "secondary"} fullWidth size="sm" className="font-semibold">
                {activeNutritionPlan ? "Acessar nutrição →" : "Ver módulo de nutrição"}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Bloco de Evolução / Progresso */}
      <div className="p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] flex items-center justify-center text-[var(--brand)] shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                  Sua Evolução Física
                </h3>
                {latestProgress && (
                  <Badge variant="brand" size="sm">
                    Atualizado
                  </Badge>
                )}
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                {latestProgress
                  ? `Último registro em ${latestProgress.recordedOn}${
                      latestProgress.weightKg ? ` • Peso: ${latestProgress.weightKg} kg` : ""
                    }`
                  : "Acompanhe seu histórico de medidas corporais e peso."}
              </p>
            </div>
          </div>

          <div className="shrink-0 pt-1 sm:pt-0">
            <Link href={`/consultoria/${consultancySlug}/progresso`}>
              <Button variant="secondary" size="sm" className="font-semibold">
                {latestProgress ? "Ver histórico →" : "Registrar medição →"}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
