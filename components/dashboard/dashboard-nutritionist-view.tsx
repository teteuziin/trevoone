import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { NutritionPlanListItemDto } from "@/lib/consultancies/nutrition";

interface DashboardNutritionistViewProps {
  consultancySlug: string;
  recentPlans: NutritionPlanListItemDto[];
  totalPlans?: number;
}

export function DashboardNutritionistView({
  consultancySlug,
  recentPlans,
  totalPlans,
}: DashboardNutritionistViewProps) {
  return (
    <div className="space-y-6">
      {/* 1. Header do Workspace & Ação Principal */}
      <div className="p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--brand)] inline-block" />
            <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
              Espaço Nutricional
            </h2>
            {typeof totalPlans === "number" && totalPlans > 0 && (
              <Badge variant="neutral" size="sm">
                {totalPlans} {totalPlans === 1 ? "plano" : "planos"}
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            Elabore cardápios, prescreva refeições e oriente a alimentação dos seus alunos.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/consultoria/${consultancySlug}/nutricao/planos/novo`}>
            <Button variant="primary" size="sm" className="font-semibold">
              + Novo plano alimentar
            </Button>
          </Link>
          <Link href={`/consultoria/${consultancySlug}/nutricao/planos`}>
            <Button variant="secondary" size="sm">
              Ver todos
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Lista de Planos Alimentares Recentes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            Planos Alimentares
          </h3>
          <Link
            href={`/consultoria/${consultancySlug}/nutricao/planos`}
            className="text-xs font-semibold text-[var(--brand)] hover:underline"
          >
            Gerenciar todos
          </Link>
        </div>

        {recentPlans && recentPlans.length > 0 ? (
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] divide-y divide-[var(--border-subtle)] shadow-xs overflow-hidden">
            {recentPlans.map((plan) => (
              <Link
                key={plan.publicId}
                href={`/consultoria/${consultancySlug}/nutricao/planos`}
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
              Nenhum plano alimentar cadastrado ainda.
            </p>
            <Link href={`/consultoria/${consultancySlug}/nutricao/planos/novo`}>
              <Button variant="secondary" size="sm">
                Criar primeiro plano alimentar
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* 3. Ações de Apoio: Alimentos (TACO) & Evolução dos Alunos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href={`/consultoria/${consultancySlug}/nutricao/alimentos`}
          className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs hover:border-[var(--brand)] transition-all group flex items-start gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-[var(--brand-soft)] border border-[var(--brand-soft-border)] flex items-center justify-center text-[var(--brand)] shrink-0 group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div className="space-y-1 min-w-0">
            <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
              Biblioteca de Alimentos
            </h4>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Consulte a Tabela TACO e cadastre alimentos customizados.
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
              Acompanhe o peso e evolução física dos alunos vinculados.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
