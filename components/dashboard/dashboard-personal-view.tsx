import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PersonalTrainingPlanItemDto } from "@/lib/consultancies/training";

interface DashboardPersonalViewProps {
  consultancySlug: string;
  recentPlans: PersonalTrainingPlanItemDto[];
  totalPlans?: number;
}

export function DashboardPersonalView({
  consultancySlug,
  recentPlans,
  totalPlans,
}: DashboardPersonalViewProps) {
  return (
    <div className="space-y-6">
      {/* 1. Header do Workspace & CTA Principal */}
      <div className="p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--brand)] inline-block" />
            <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
              Espaço de Prescrição
            </h2>
            {typeof totalPlans === "number" && totalPlans > 0 && (
              <Badge variant="neutral" size="sm">
                {totalPlans} {totalPlans === 1 ? "plano" : "planos"}
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            Crie, edite e acompanhe as rotinas de treino dos seus alunos vinculados.
          </p>
        </div>

        <div className="shrink-0">
          <Link href={`/consultoria/${consultancySlug}/personal/treinos`}>
            <Button variant="primary" size="sm" className="font-semibold">
              Gerenciar planos de treino →
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Lista Compacta de Planos de Treino */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            Planos de Treino
          </h3>
          <Link
            href={`/consultoria/${consultancySlug}/personal/treinos`}
            className="text-xs font-semibold text-[var(--brand)] hover:underline"
          >
            Ver todos
          </Link>
        </div>

        {recentPlans && recentPlans.length > 0 ? (
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] divide-y divide-[var(--border-subtle)] shadow-xs overflow-hidden">
            {recentPlans.map((plan) => (
              <Link
                key={plan.publicId}
                href={`/consultoria/${consultancySlug}/personal/treinos`}
                className="p-4 flex items-center justify-between gap-3 hover:bg-[var(--surface-hover)] transition-colors group"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--brand)] transition-colors">
                      {plan.studentName || "Aluno"}
                    </span>
                    <Badge
                      variant={plan.status === "ACTIVE" ? "success" : plan.status === "DRAFT" ? "warning" : "neutral"}
                      size="sm"
                    >
                      {plan.status === "ACTIVE" ? "Ativo" : plan.status === "DRAFT" ? "Rascunho" : "Arquivado"}
                    </Badge>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] truncate">
                    {plan.title}
                  </p>
                </div>

                <div className="shrink-0 text-xs font-semibold text-[var(--text-tertiary)] group-hover:text-[var(--brand)] flex items-center gap-1">
                  <span>Abrir</span>
                  <span>→</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] text-center space-y-2">
            <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
              Nenhum plano de treino cadastrado ainda.
            </p>
            <Link href={`/consultoria/${consultancySlug}/personal/treinos`}>
              <Button variant="secondary" size="sm">
                Criar primeiro plano
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* 3. Ações de Apoio: Exercícios & Evolução */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href={`/consultoria/${consultancySlug}/personal/exercicios`}
          className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs hover:border-[var(--brand)] transition-all group flex items-start gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] flex items-center justify-center text-[var(--brand)] shrink-0 group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div className="space-y-1 min-w-0">
            <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
              Biblioteca de Exercícios
            </h4>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Consulte o catálogo de movimentos, vídeos de execução e instruções.
            </p>
          </div>
        </Link>

        <Link
          href={`/consultoria/${consultancySlug}/progresso/alunos`}
          className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs hover:border-[var(--brand)] transition-all group flex items-start gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] flex items-center justify-center text-[var(--brand)] shrink-0 group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="space-y-1 min-w-0">
            <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
              Evolução dos Alunos
            </h4>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Acompanhe o histórico de medições corporais e fotos dos alunos.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
