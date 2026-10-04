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
  totalStudents?: number;
}

export function DashboardNutritionistView({
  consultancySlug,
  recentPlans = [],
  totalPlans = 0,
  totalStudents,
}: DashboardNutritionistViewProps) {
  return (
    <>
      {/* MOBILE NATIVE COCKPIT (< 768px) */}
      <div className="md:hidden">
        <MobileDashboardCockpit
          role="NUTRITIONIST"
          consultancySlug={consultancySlug}
          heroActionCard={
            <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[var(--text-primary)] font-sans">
                    Prescrever plano alimentar
                  </h2>
                  <p className="text-[11px] text-[var(--text-tertiary)] font-sans">
                    Prescreva e acompanhe dietas dos seus pacientes
                  </p>
                </div>
                <span className="text-[11px] text-[var(--brand)] font-semibold px-2 py-0.5 rounded-full bg-[var(--brand-surface)] border border-[var(--brand-soft-border)] font-sans">
                  {totalPlans} ativas
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <Link
                  href={`/consultoria/${consultancySlug}/planos-v2/novo`}
                  className="min-h-[46px] rounded-xl font-bold text-xs bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-inverse)] flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.98] transition-all font-sans"
                >
                  <span>+ Novo Plano</span>
                </Link>
                <Link
                  href={`/consultoria/${consultancySlug}/planos-v2?action=import`}
                  className="min-h-[46px] rounded-xl font-semibold text-xs bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] text-[var(--text-primary)] flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all font-sans"
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
          metrics={
            totalStudents !== undefined && totalStudents !== null
              ? [
                  {
                    title: "Planos Alimentares",
                    value: totalPlans,
                    subtitle: "Dietas cadastradas",
                    href: `/consultoria/${consultancySlug}/planos-v2`,
                  },
                  {
                    title: "Pacientes",
                    value: totalStudents,
                    subtitle: "Alunos vinculados",
                    href: `/consultoria/${consultancySlug}/progresso/alunos`,
                  },
                ]
              : [
                  {
                    title: "Planos Alimentares",
                    value: totalPlans,
                    subtitle: "Dietas cadastradas",
                    href: `/consultoria/${consultancySlug}/planos-v2`,
                  },
                  {
                    title: "Planos Recentes",
                    value: recentPlans.length,
                    subtitle: "Em acompanhamento",
                    href: `/consultoria/${consultancySlug}/planos-v2`,
                  },
                ]
          }
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
        {/* 1. NÍVEL 1 — AÇÃO PRINCIPAL */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-1">
          <div className="space-y-0.5">
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight font-sans">
              Gestão de Dietas & Pacientes
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans">
              Prescreva e acompanhe os planos alimentares dos seus pacientes.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link href={`/consultoria/${consultancySlug}/planos-v2/novo`}>
              <Button
                variant="primary"
                size="md"
                className="font-bold text-sm rounded-xl px-5 shadow-xs hover:brightness-105 active:scale-[0.98] transition-all font-sans"
              >
                + Novo Plano
              </Button>
            </Link>
            <Link href={`/consultoria/${consultancySlug}/planos-v2?action=import`}>
              <Button
                variant="secondary"
                size="md"
                className="font-semibold text-sm rounded-xl px-4 hover:bg-[var(--surface-hover)] border border-[var(--border-default)] transition-all font-sans"
              >
                Importar Plano
              </Button>
            </Link>
          </div>
        </div>

        {/* 2. NÍVEL 2 — RESUMO OPERACIONAL (Faixa leve sem cards individuais, sem sombras, sem icon boxes) */}
        <div className="py-3 px-4 sm:px-6 rounded-xl bg-[var(--surface-subtle)]/50 border border-[var(--border-subtle)] grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)] text-center sm:text-left">
          <Link
            href={`/consultoria/${consultancySlug}/progresso/alunos`}
            className="p-2 sm:px-4 sm:py-1 hover:text-[var(--brand)] transition-colors group flex flex-col justify-center"
          >
            <span className="text-lg sm:text-xl font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors font-sans tabular-nums">
              {totalStudents !== undefined && totalStudents !== null ? totalStudents : "Gestão"}
            </span>
            <span className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold font-sans mt-0.5">
              Pacientes
            </span>
          </Link>

          <Link
            href={`/consultoria/${consultancySlug}/planos-v2`}
            className="p-2 sm:px-4 sm:py-1 hover:text-[var(--brand)] transition-colors group flex flex-col justify-center"
          >
            <span className="text-lg sm:text-xl font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors font-sans tabular-nums">
              {totalPlans}
            </span>
            <span className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold font-sans mt-0.5">
              Planos Alimentares
            </span>
          </Link>

          <Link
            href={`/consultoria/${consultancySlug}/alimentos-v2`}
            className="p-2 sm:px-4 sm:py-1 hover:text-[var(--brand)] transition-colors group flex flex-col justify-center"
          >
            <span className="text-lg sm:text-xl font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors font-sans">
              Biblioteca
            </span>
            <span className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold font-sans mt-0.5">
              Alimentos
            </span>
          </Link>

          <Link
            href={`/consultoria/${consultancySlug}/consultas`}
            className="p-2 sm:px-4 sm:py-1 hover:text-[var(--brand)] transition-colors group flex flex-col justify-center"
          >
            <span className="text-lg sm:text-xl font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors font-sans">
              Agenda
            </span>
            <span className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold font-sans mt-0.5">
              Consultas 1:1
            </span>
          </Link>
        </div>

        {/* 3. GRID DESKTOP: CONTEÚDO PRINCIPAL (75%) + ATALHOS SECUNDÁRIOS (25%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* COLUNA ESQUERDA (75%): PLANOS RECENTES = CONTEÚDO PRINCIPAL */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] font-sans tracking-tight">
                Planos Alimentares Recentes
              </h3>
              <Link href={`/consultoria/${consultancySlug}/planos-v2`}>
                <span className="text-xs text-[var(--brand)] font-semibold hover:underline font-sans cursor-pointer">
                  Ver todos ({totalPlans}) →
                </span>
              </Link>
            </div>

            <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] divide-y divide-[var(--border-subtle)] overflow-hidden shadow-2xs">
              {recentPlans && recentPlans.length > 0 ? (
                recentPlans.slice(0, 6).map((plan) => {
                  const isArchived = plan.status === "ARCHIVED";
                  const isDraft = plan.status === "DRAFT";

                  return (
                    <Link
                      key={plan.publicId}
                      href={`/consultoria/${consultancySlug}/planos-v2/${plan.publicId}`}
                      className="flex items-center justify-between p-4 sm:px-5 sm:py-4 hover:bg-[var(--surface-hover)] transition-colors group cursor-pointer"
                    >
                      <div className="min-w-0 flex-1 space-y-1 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm sm:text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate font-sans">
                            {plan.title}
                          </span>
                          {isArchived && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-[var(--surface-subtle)] text-[var(--text-tertiary)] border border-[var(--border-subtle)] font-sans">
                              Arquivado
                            </span>
                          )}
                          {isDraft && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-sans">
                              Rascunho
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-sans">
                          {plan.subtitle && <span className="truncate">{plan.subtitle}</span>}
                          {plan.subtitle && plan.mealsCount ? <span>•</span> : null}
                          {plan.mealsCount ? <span>{plan.mealsCount} refeições configuradas</span> : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs text-[var(--brand)] font-semibold group-hover:translate-x-0.5 transition-transform font-sans">
                          Editar →
                        </span>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="p-8 text-center space-y-3">
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans">
                    Nenhum plano cadastrado ainda. Crie seu primeiro plano alimentar para prescrever aos pacientes.
                  </p>
                  <Link href={`/consultoria/${consultancySlug}/planos-v2/novo`}>
                    <Button variant="primary" size="sm" className="font-semibold rounded-lg font-sans">
                      + Criar Primeiro Plano
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* COLUNA DIREITA (25%): RECURSOS SECUNDÁRIOS LEVES (NÍVEL 3) */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-3">
            <div className="px-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] font-sans">
                Recursos Rápidos
              </h3>
            </div>

            <div className="rounded-xl bg-[var(--surface-subtle)]/40 border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)] overflow-hidden">
              <Link
                href={`/consultoria/${consultancySlug}/planos-v2?tab=templates`}
                className="p-3.5 hover:bg-[var(--surface-hover)] transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="space-y-0.5 min-w-0 pr-2">
                  <h4 className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate font-sans">
                    Modelos Reutilizáveis
                  </h4>
                  <p className="text-[11px] text-[var(--text-tertiary)] truncate font-sans">
                    Templates para prescrição ágil
                  </p>
                </div>
                <span className="text-xs text-[var(--text-tertiary)] group-hover:text-[var(--brand)] group-hover:translate-x-0.5 transition-all font-bold shrink-0">
                  →
                </span>
              </Link>

              <Link
                href={`/consultoria/${consultancySlug}/planos-v2?tab=assignments`}
                className="p-3.5 hover:bg-[var(--surface-hover)] transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="space-y-0.5 min-w-0 pr-2">
                  <h4 className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate font-sans">
                    Prescrições Ativas
                  </h4>
                  <p className="text-[11px] text-[var(--text-tertiary)] truncate font-sans">
                    Dietas em uso por pacientes
                  </p>
                </div>
                <span className="text-xs text-[var(--text-tertiary)] group-hover:text-[var(--brand)] group-hover:translate-x-0.5 transition-all font-bold shrink-0">
                  →
                </span>
              </Link>

              <Link
                href={`/consultoria/${consultancySlug}/alimentos-v2`}
                className="p-3.5 hover:bg-[var(--surface-hover)] transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="space-y-0.5 min-w-0 pr-2">
                  <h4 className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate font-sans">
                    Tabela de Alimentos
                  </h4>
                  <p className="text-[11px] text-[var(--text-tertiary)] truncate font-sans">
                    Rótulos e tabelas nutricionais
                  </p>
                </div>
                <span className="text-xs text-[var(--text-tertiary)] group-hover:text-[var(--brand)] group-hover:translate-x-0.5 transition-all font-bold shrink-0">
                  →
                </span>
              </Link>

              <Link
                href={`/consultoria/${consultancySlug}/consultas`}
                className="p-3.5 hover:bg-[var(--surface-hover)] transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="space-y-0.5 min-w-0 pr-2">
                  <h4 className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate font-sans">
                    Agenda de Consultas
                  </h4>
                  <p className="text-[11px] text-[var(--text-tertiary)] truncate font-sans">
                    Atendimentos e retornos 1:1
                  </p>
                </div>
                <span className="text-xs text-[var(--text-tertiary)] group-hover:text-[var(--brand)] group-hover:translate-x-0.5 transition-all font-bold shrink-0">
                  →
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
