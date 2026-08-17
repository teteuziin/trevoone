"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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

const STATUS_BADGE_CLASSES: Record<NutritionPlanStatus, string> = {
  DRAFT: "bg-amber-50 text-amber-700 border-amber-200",
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ARCHIVED: "bg-slate-100 text-slate-600 border-slate-200",
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
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 self-start">
          {tabs.map((tab) => {
            const isActive =
              (tab.key === "ALL" && (!currentStatus || currentStatus === "ALL")) ||
              currentStatus === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleStatusTab(tab.key)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  isActive
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200/60"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
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
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo plano alimentar
        </Link>
      </div>

      {/* Plan list content */}
      {items.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-slate-900 mb-1">Nenhum plano alimentar encontrado</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            {currentStatus && currentStatus !== "ALL"
              ? `Não há planos alimentares com o status "${STATUS_LABELS[currentStatus as NutritionPlanStatus] || currentStatus}".`
              : "Comece criando o primeiro plano alimentar para um aluno ativo da sua consultoria."}
          </p>
          <Link
            href={`/consultoria/${slug}/nutricao/planos/novo`}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors border border-emerald-200/60"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Criar novo plano
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
          {items.map((plan) => {
            const badgeClass = STATUS_BADGE_CLASSES[plan.status] || "bg-slate-100 text-slate-600 border-slate-200";
            const statusLabel = STATUS_LABELS[plan.status] || plan.status;

            return (
              <div
                key={plan.publicId}
                className="p-5 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Link
                      href={`/consultoria/${slug}/nutricao/planos/${plan.publicId}`}
                      className="text-base font-semibold text-slate-900 hover:text-emerald-600 transition-colors truncate"
                    >
                      {plan.title}
                    </Link>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeClass}`}
                    >
                      {statusLabel}
                    </span>
                  </div>

                  {plan.subtitle && (
                    <p className="text-xs text-slate-500 line-clamp-1">{plan.subtitle}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 pt-1">
                    <span className="flex items-center gap-1.5 font-medium text-slate-700">
                      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      {plan.studentName}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span>
                      {plan.mealsCount} {plan.mealsCount === 1 ? "refeição" : "refeições"}
                    </span>
                    {plan.startsOn && (
                      <>
                        <span className="text-slate-400">•</span>
                        <span>Início: {plan.startsOn}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/consultoria/${slug}/nutricao/planos/${plan.publicId}`}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 rounded-lg border border-slate-200 shadow-sm transition-all"
                  >
                    {plan.status === "DRAFT" ? "Editar estrutura" : "Visualizar plano"}
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <p className="text-xs text-slate-500">
            Mostrando <span className="font-semibold text-slate-700">{(page - 1) * pageSize + 1}</span>–
            <span className="font-semibold text-slate-700">{Math.min(page * pageSize, total)}</span> de{" "}
            <span className="font-semibold text-slate-700">{total}</span> planos
          </p>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
              className="px-3 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Anterior
            </button>
            <span className="text-xs font-medium text-slate-500 px-2">
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => handlePageChange(page + 1)}
              className="px-3 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
