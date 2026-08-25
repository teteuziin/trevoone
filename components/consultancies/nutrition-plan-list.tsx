"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { NutritionPlanListItemDto, NutritionPlanStatus } from "@/lib/consultancies/nutrition";

interface NutritionPlanListProps {
  slug: string;
  items: NutritionPlanListItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  currentStatus: string;
}

const STATUS_LABELS: Record<NutritionPlanStatus, string> = {
  DRAFT: "Rascunho",
  ACTIVE: "Ativo",
  ARCHIVED: "Arquivado",
};

const STATUS_BADGE_VARIANTS: Record<NutritionPlanStatus, "warning" | "success" | "neutral"> = {
  DRAFT: "warning",
  ACTIVE: "success",
  ARCHIVED: "neutral",
};

export function NutritionPlanList({
  slug,
  items,
  total,
  page,
  pageSize,
  totalPages,
  currentStatus,
}: NutritionPlanListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleStatusTab = (status: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === "ALL") {
      params.delete("status");
    } else {
      params.set("status", status);
    }
    params.delete("page");
    router.push(`/consultoria/${slug}/nutricao/planos?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`/consultoria/${slug}/nutricao/planos?${params.toString()}`);
  };

  const tabs = [
    { key: "ALL", label: "Todos" },
    { key: "DRAFT", label: "Rascunhos" },
    { key: "ACTIVE", label: "Ativos" },
    { key: "ARCHIVED", label: "Arquivados" },
  ];

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[var(--surface-sunken)] rounded-xl border border-[var(--border-subtle)] self-start">
          {tabs.map((tab) => {
            const isActive =
              (tab.key === "ALL" && (!currentStatus || currentStatus === "ALL")) ||
              currentStatus === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleStatusTab(tab.key)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  isActive
                    ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-2xs border border-[var(--border-default)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* CTA */}
        <Link
          href={`/consultoria/${slug}/nutricao/planos/novo`}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[var(--brand)] hover:bg-[var(--brand-hover)] active:opacity-90 rounded-xl shadow-xs transition-all focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo plano alimentar
        </Link>
      </div>

      {/* Plan list content */}
      {items.length === 0 ? (
        <EmptyState
          title={
            currentStatus && currentStatus !== "ALL"
              ? `Nenhum plano alimentar ${STATUS_LABELS[currentStatus as NutritionPlanStatus]?.toLowerCase() || currentStatus}`
              : "Nenhum plano alimentar cadastrado"
          }
          description={
            currentStatus === "DRAFT"
              ? "Você não possui rascunhos de planos alimentares em edição. Crie um novo plano para começar a estruturar as refeições dos seus alunos."
              : currentStatus === "ACTIVE"
              ? "Quando você disponibilizar um plano alimentar para um aluno, ele aparecerá aqui como ativo."
              : currentStatus === "ARCHIVED"
              ? "Planos alimentares anteriores substituídos ou desativados aparecerão aqui no histórico."
              : "Comece criando o primeiro plano alimentar para acompanhar as refeições e metas nutricionais dos seus alunos."
          }
          action={
            <Link
              href={`/consultoria/${slug}/nutricao/planos/novo`}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[var(--brand-strong)] hover:bg-[var(--brand)] rounded-xl transition-colors min-h-[44px] shadow-xs focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              + Criar Novo Plano
            </Link>
          }
        />
      ) : (
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border-default)] shadow-xs overflow-hidden divide-y divide-[var(--border-subtle)]">
          {items.map((plan) => {
            const badgeVariant = STATUS_BADGE_VARIANTS[plan.status] || "neutral";
            const statusLabel = STATUS_LABELS[plan.status] || plan.status;

            return (
              <div
                key={plan.publicId}
                className="p-5 hover:bg-[var(--surface-hover)] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Link
                      href={`/consultoria/${slug}/nutricao/planos/${plan.publicId}`}
                      className="text-base font-semibold text-[var(--text-primary)] hover:text-[var(--brand-foreground)] transition-colors truncate"
                    >
                      {plan.title}
                    </Link>
                    <Badge variant={badgeVariant} size="sm">
                      {statusLabel}
                    </Badge>
                  </div>

                  {plan.subtitle && (
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-1">{plan.subtitle}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-[var(--text-secondary)] pt-1">
                    <span className="flex items-center gap-1.5 font-medium text-[var(--text-primary)]">
                      <svg className="w-3.5 h-3.5 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      {plan.studentName}
                    </span>
                    <span className="text-[var(--text-tertiary)]">•</span>
                    <span>
                      {plan.mealsCount} {plan.mealsCount === 1 ? "refeição" : "refeições"}
                    </span>
                    {plan.startsOn && (
                      <>
                        <span className="text-[var(--text-tertiary)]">•</span>
                        <span>Início: {plan.startsOn}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/consultoria/${slug}/nutricao/planos/${plan.publicId}`}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] active:opacity-90 rounded-lg border border-[var(--border-default)] shadow-2xs transition-all focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
                  >
                    {plan.status === "DRAFT" ? "Editar estrutura" : "Visualizar plano"}
                    <svg className="w-3.5 h-3.5 text-[var(--text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 pt-2">
          <p className="text-xs text-[var(--text-secondary)]">
            Mostrando <span className="font-semibold text-[var(--text-primary)]">{(page - 1) * pageSize + 1}</span>–
            <span className="font-semibold text-[var(--text-primary)]">{Math.min(page * pageSize, total)}</span> de{" "}
            <span className="font-semibold text-[var(--text-primary)]">{total}</span> planos
          </p>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
              className="px-3 py-1 text-xs font-semibold rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              Anterior
            </button>
            <span className="text-xs font-medium text-[var(--text-secondary)] px-2">
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => handlePageChange(page + 1)}
              className="px-3 py-1 text-xs font-semibold rounded-lg border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
