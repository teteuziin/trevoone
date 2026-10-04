"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MobileDashboardCockpit } from "./mobile-dashboard-cockpit";

export interface NutritionistPlanSummaryItem {
  publicId: string;
  title: string;
  studentName?: string | null;
  subtitle?: string | null;
  status: "ACTIVE" | "ARCHIVED" | "DRAFT" | "PUBLISHED" | string;
  versionNumber?: number;
  updatedAt?: Date;
  mealsCount?: number;
}

export type NutritionPlanSummaryItem = NutritionistPlanSummaryItem;

export interface DashboardNutritionistViewProps {
  consultancySlug: string;
  recentPlans?: NutritionistPlanSummaryItem[];
  totalPlans?: number;
}

export function DashboardNutritionistView({
  consultancySlug,
  recentPlans = [],
  totalPlans = 0,
}: DashboardNutritionistViewProps) {
  return (
    <>
      {/* MOBILE NATIVE COCKPIT (< 768px) */}
      <div className="md:hidden">
        <MobileDashboardCockpit
          role="NUTRITIONIST"
          consultancySlug={consultancySlug}
          heroActionCard={
            <div className="p-3.5 sm:p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  Prescrever plano alimentar
                </h2>
                <span className="text-xs text-[var(--text-tertiary)] font-medium">
                  {totalPlans} planos cadastrados
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href={`/consultoria/${consultancySlug}/planos-v2/novo`}
                  className="min-h-[44px] rounded-lg font-semibold text-xs bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-inverse)] flex items-center justify-center gap-1.5 shadow-2xs active:scale-[0.98] transition-all"
                >
                  <span>+ Novo Plano</span>
                </Link>
                <Link
                  href={`/consultoria/${consultancySlug}/planos-v2?action=import`}
                  className="min-h-[44px] rounded-lg font-semibold text-xs bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] text-[var(--text-primary)] flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
                >
                  <span>Importar</span>
                </Link>
              </div>
            </div>
          }
          quickActions={[
            {
              id: "patients",
              label: "Pacientes",
              subtitle: "Acompanhamento",
              href: `/consultoria/${consultancySlug}/progresso/alunos`,
              highlight: true,
              icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ),
            },
            {
              id: "plans",
              label: "Dietas",
              subtitle: `${totalPlans} cadastradas`,
              href: `/consultoria/${consultancySlug}/planos-v2`,
              icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              ),
            },
            {
              id: "foods",
              label: "Alimentos",
              subtitle: "Tabelas e rótulos",
              href: `/consultoria/${consultancySlug}/alimentos-v2`,
              icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              ),
            },
            {
              id: "consultations",
              label: "Consultas",
              subtitle: "Atendimentos e retornos",
              href: `/consultoria/${consultancySlug}/consultas`,
              icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              ),
            },
          ]}
          metrics={[
            {
              title: "Planos Alimentares",
              value: totalPlans,
              subtitle: "Dietas cadastradas",
              href: `/consultoria/${consultancySlug}/planos-v2`,
            },
            {
              title: "Pacientes",
              value: "Acessar",
              subtitle: "Ver prontuários",
              href: `/consultoria/${consultancySlug}/progresso/alunos`,
            },
          ]}
          recentSection={
            recentPlans && recentPlans.length > 0
              ? {
                  title: "Planos Recentes",
                  viewAllHref: `/consultoria/${consultancySlug}/planos-v2`,
                  items: recentPlans.slice(0, 4).map((plan) => {
                    const isArchived = plan.status === "ARCHIVED";
                    const isDraft = plan.status === "DRAFT";
                    return {
                      id: plan.publicId,
                      title: plan.title,
                      subtitle: plan.subtitle || undefined,
                      caption: plan.mealsCount ? `${plan.mealsCount} refeições configuradas` : undefined,
                      href: `/consultoria/${consultancySlug}/planos-v2/${plan.publicId}`,
                      statusBadge: isArchived ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-[var(--surface-subtle)] text-[var(--text-tertiary)] border border-[var(--border-subtle)]">
                          Arquivado
                        </span>
                      ) : isDraft ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          Rascunho
                        </span>
                      ) : undefined,
                    };
                  }),
                }
              : undefined
          }
        />
      </div>

      {/* DESKTOP VIEW (>= 768px) */}
      <div className="hidden md:block space-y-6 w-full animate-in fade-in duration-150">
        {/* 1. HEADER & PRIMARY ACTIONS */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
              Gestão de Dietas & Pacientes
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/consultoria/${consultancySlug}/planos-v2?action=import`}>
              <Button variant="secondary" size="sm" className="font-semibold rounded-lg">
                Importar Plano
              </Button>
            </Link>
            <Link href={`/consultoria/${consultancySlug}/planos-v2/novo`}>
              <Button variant="primary" size="sm" className="font-semibold rounded-lg">
                + Novo Plano
              </Button>
            </Link>
          </div>
        </div>

        {/* 2. OPERATIONAL SUMMARY STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)] overflow-hidden shadow-2xs">
          <Link
            href={`/consultoria/${consultancySlug}/progresso/alunos`}
            className="p-3.5 sm:p-4 hover:bg-[var(--surface-hover)] transition-colors group flex flex-col justify-between"
          >
            <span className="text-xs text-[var(--text-tertiary)] font-medium">Pacientes</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base sm:text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                Acessar
              </span>
              <span className="text-[11px] text-[var(--text-tertiary)] hidden xl:inline">Ver prontuários e metas</span>
            </div>
          </Link>

          <Link
            href={`/consultoria/${consultancySlug}/planos-v2`}
            className="p-3.5 sm:p-4 hover:bg-[var(--surface-hover)] transition-colors group flex flex-col justify-between"
          >
            <span className="text-xs text-[var(--text-tertiary)] font-medium">Planos Alimentares</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base sm:text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                {totalPlans}
              </span>
              <span className="text-[11px] text-[var(--text-tertiary)] hidden xl:inline">Dietas cadastradas</span>
            </div>
          </Link>

          <Link
            href={`/consultoria/${consultancySlug}/alimentos-v2`}
            className="p-3.5 sm:p-4 hover:bg-[var(--surface-hover)] transition-colors group flex flex-col justify-between"
          >
            <span className="text-xs text-[var(--text-tertiary)] font-medium">Alimentos</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base sm:text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                Biblioteca
              </span>
              <span className="text-[11px] text-[var(--text-tertiary)] hidden xl:inline">Tabelas e rótulos</span>
            </div>
          </Link>

          <Link
            href={`/consultoria/${consultancySlug}/consultas`}
            className="p-3.5 sm:p-4 hover:bg-[var(--surface-hover)] transition-colors group flex flex-col justify-between"
          >
            <span className="text-xs text-[var(--text-tertiary)] font-medium">Consultas</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base sm:text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                Agenda
              </span>
              <span className="text-[11px] text-[var(--text-tertiary)] hidden xl:inline">Atendimentos e retornos</span>
            </div>
          </Link>
        </div>

        {/* 3. PLANOS RECENTES: Lista operacional limpa sem card-in-card */}
        <div className="rounded-xl bg-[var(--surface)] border border-[var(--border-default)] overflow-hidden shadow-2xs">
          <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Planos Alimentares Recentes
            </h3>
            <Link href={`/consultoria/${consultancySlug}/planos-v2`}>
              <Button variant="ghost" size="sm" className="text-xs text-[var(--brand)] font-semibold hover:bg-[var(--surface-hover)]">
                Ver todos ({totalPlans}) →
              </Button>
            </Link>
          </div>

          {recentPlans && recentPlans.length > 0 ? (
            <div className="divide-y divide-[var(--border-subtle)]">
              {recentPlans.slice(0, 6).map((plan) => {
                const isArchived = plan.status === "ARCHIVED";
                const isDraft = plan.status === "DRAFT";

                return (
                  <Link
                    key={plan.publicId}
                    href={`/consultoria/${consultancySlug}/planos-v2/${plan.publicId}`}
                    className="flex items-center justify-between p-3.5 sm:px-4 sm:py-3.5 hover:bg-[var(--surface-hover)] transition-colors group cursor-pointer"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                          {plan.title}
                        </span>
                        {isArchived && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-[var(--surface-subtle)] text-[var(--text-tertiary)] border border-[var(--border-subtle)]">
                            Arquivado
                          </span>
                        )}
                        {isDraft && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            Rascunho
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                        {plan.subtitle && <span className="truncate">{plan.subtitle}</span>}
                        {plan.subtitle && plan.mealsCount ? <span>•</span> : null}
                        {plan.mealsCount ? <span>{plan.mealsCount} refeições configuradas</span> : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-[var(--brand)] font-semibold group-hover:translate-x-0.5 transition-transform">
                        Editar →
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center space-y-3">
              <p className="text-xs text-[var(--text-secondary)]">
                Nenhum plano cadastrado ainda. Crie seu primeiro plano alimentar para prescrever aos pacientes.
              </p>
              <Link href={`/consultoria/${consultancySlug}/planos-v2/novo`}>
                <Button variant="primary" size="sm" className="font-semibold rounded-lg">
                  + Criar Primeiro Plano
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* 4. ATALHOS DIRETOS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href={`/consultoria/${consultancySlug}/planos-v2?tab=templates`}
            className="p-3.5 sm:p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] hover:border-[var(--brand)] transition-all flex items-center justify-between group shadow-2xs"
          >
            <div className="space-y-0.5">
              <h4 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                Modelos Reutilizáveis (Templates)
              </h4>
              <p className="text-xs text-[var(--text-secondary)]">
                Estruturas de cardápio prontas para clonar e prescrever rapidamente
              </p>
            </div>
            <span className="text-sm text-[var(--brand)] font-bold group-hover:translate-x-0.5 transition-transform shrink-0 ml-3">→</span>
          </Link>

          <Link
            href={`/consultoria/${consultancySlug}/planos-v2?tab=assignments`}
            className="p-3.5 sm:p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] hover:border-[var(--brand)] transition-all flex items-center justify-between group shadow-2xs"
          >
            <div className="space-y-0.5">
              <h4 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                Prescrições Ativas de Pacientes
              </h4>
              <p className="text-xs text-[var(--text-secondary)]">
                Acompanhe quem está seguindo qual plano alimentar no momento
              </p>
            </div>
            <span className="text-sm text-[var(--brand)] font-bold group-hover:translate-x-0.5 transition-transform shrink-0 ml-3">→</span>
          </Link>
        </div>
      </div>
    </>
  );
}
