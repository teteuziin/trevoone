import Link from "next/link";
import { Badge } from "@/components/ui/badge";

type Props = {
  moduleType: "TRAINING" | "NUTRITION";
  consultancySlug: string;
  consultancyName: string;
  allowed: boolean;
  confirmedRequirements: number;
  totalRequirements: number;
};

export function StudentModuleAccessPanel({
  moduleType,
  consultancySlug,
  consultancyName,
  allowed,
  confirmedRequirements,
  totalRequirements,
}: Props) {
  const isTraining = moduleType === "TRAINING";
  const moduleTitle = isTraining ? "Treinos" : "Nutrição";

  const progressPercent =
    totalRequirements > 0
      ? Math.round((confirmedRequirements / totalRequirements) * 100)
      : 100;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Navigation & Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Link
            href={`/consultoria/${consultancySlug}`}
            className="inline-flex items-center text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            ← Voltar ao painel
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            {moduleTitle}
          </h1>

          <div>
            {allowed ? (
              <Badge variant="success" size="sm">
                Acesso Liberado
              </Badge>
            ) : (
              <Badge variant="warning" size="sm">
                Bloqueado
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      {allowed ? (
        <div className="p-6 sm:p-8 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-4 text-center sm:text-left">
          <div className="w-12 h-12 rounded-full bg-[var(--brand-soft)] text-[var(--brand-foreground)] mx-auto sm:mx-0 flex items-center justify-center border border-[var(--brand-soft-border)]">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              {isTraining
                ? "Seu espaço de treinamento está liberado"
                : "Seu acesso à área de Nutrição está liberado"}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {isTraining
                ? `Você concluiu seu onboarding na ${consultancyName}. As rotinas de treino, exercícios e prescrições estarão disponíveis aqui conforme forem publicadas pela sua consultoria.`
                : `Seu onboarding na ${consultancyName} foi concluído com sucesso. No momento, não há conteúdo nutricional disponível nesta área.`}
            </p>
          </div>

          <div className="pt-3 border-t border-[var(--border-subtle)]">
            <Link
              href={`/consultoria/${consultancySlug}`}
              className="inline-flex items-center justify-center px-4 py-2 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] text-[var(--text-primary)] font-semibold text-xs rounded-lg shadow-2xs transition-colors"
            >
              Voltar ao painel da consultoria
            </Link>
          </div>
        </div>
      ) : (
        <div className="p-6 sm:p-8 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-6 text-center sm:text-left">
          <div className="w-12 h-12 rounded-full bg-[var(--warning-soft)] text-[var(--warning-foreground)] mx-auto sm:mx-0 flex items-center justify-center border border-[var(--warning-border)]">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              {moduleTitle} Bloqueado
            </h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Você ainda precisa concluir seu onboarding antes de acessar este módulo na{" "}
              <span className="font-semibold text-[var(--text-primary)]">{consultancyName}</span>.
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="p-4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[var(--text-secondary)]">Etapas do Onboarding</span>
              <span className="font-bold text-[var(--text-primary)]">
                {confirmedRequirements} de {totalRequirements} confirmadas
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[var(--border-default)] overflow-hidden">
              <div
                className="h-full bg-[var(--brand-strong)] transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1 border-t border-[var(--border-subtle)]">
            <Link
              href={`/consultoria/${consultancySlug}/onboarding`}
              className="inline-flex items-center justify-center px-5 py-2.5 bg-[var(--brand-strong)] hover:bg-[var(--brand)] text-white font-semibold text-sm rounded-lg shadow-xs transition-colors"
            >
              Continuar onboarding
            </Link>

            <Link
              href={`/consultoria/${consultancySlug}`}
              className="inline-flex items-center justify-center px-4 py-2.5 bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] text-[var(--text-primary)] font-semibold text-sm rounded-lg shadow-2xs transition-colors"
            >
              Voltar ao painel
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
