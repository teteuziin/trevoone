"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MobileDashboardCockpit } from "./mobile-dashboard-cockpit";

export interface PersonalWorkoutSummaryItem {
  publicId: string;
  title: string;
  subtitle?: string | null;
  status: "ACTIVE" | "ARCHIVED" | "DRAFT" | "PUBLISHED" | string;
  difficultyLevel?: string;
  blocksCount?: number;
  currentVersionStatus?: string | null;
  updatedAt?: Date;
}

export interface DashboardPersonalViewProps {
  consultancySlug: string;
  recentPlans?: PersonalWorkoutSummaryItem[];
  totalPlans?: number;
  totalStudents?: number;
  hideRoleBadge?: boolean;
}

export function DashboardPersonalView({
  consultancySlug,
  recentPlans = [],
  totalPlans = 0,
  totalStudents,
  hideRoleBadge,
}: DashboardPersonalViewProps) {
  return (
    <>
      {/* MOBILE NATIVE COCKPIT (< 768px) */}
      <div className="md:hidden">
        <MobileDashboardCockpit
          role="PERSONAL"
          consultancySlug={consultancySlug}
          hideRoleBadge={hideRoleBadge}
          heroActionCard={
            <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[var(--text-primary)] font-sans">
                    Prescrever treino
                  </h2>
                  <p className="text-[11px] text-[var(--text-tertiary)] font-sans">
                    Prescreva e acompanhe os treinos dos seus alunos
                  </p>
                </div>
                <span className="text-[11px] text-[var(--brand)] font-semibold px-2 py-0.5 rounded-full bg-[var(--brand-surface)] border border-[var(--brand-soft-border)] font-sans">
                  {totalPlans} ativas
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <Link
                  href={`/consultoria/${consultancySlug}/rotinas/novo`}
                  className="min-h-[46px] rounded-xl font-bold text-xs bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-inverse)] flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.98] transition-all font-sans"
                >
                  <span>+ Nova Ficha</span>
                </Link>
                <Link
                  href={`/consultoria/${consultancySlug}/rotinas?action=import`}
                  className="min-h-[46px] rounded-xl font-semibold text-xs bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] text-[var(--text-primary)] flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all font-sans"
                >
                  <span>Importar</span>
                </Link>
              </div>
            </div>
          }
          quickActions={[
            {
              id: "students",
              label: "Alunos",
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
              id: "routines",
              label: "Treinos",
              subtitle: `${totalPlans} fichas cadastradas`,
              href: `/consultoria/${consultancySlug}/rotinas`,
              icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              ),
            },
            {
              id: "exercises",
              label: "Exercícios",
              subtitle: "Biblioteca",
              href: `/consultoria/${consultancySlug}/exercicios`,
              icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
            },
            {
              id: "consultations",
              label: "Consultas",
              subtitle: "Agenda 1:1",
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
                    title: "Fichas de Treino",
                    value: totalPlans,
                    subtitle: "Rotinas cadastradas",
                    href: `/consultoria/${consultancySlug}/rotinas`,
                  },
                  {
                    title: "Alunos",
                    value: totalStudents,
                    subtitle: "Alunos vinculados",
                    href: `/consultoria/${consultancySlug}/progresso/alunos`,
                  },
                ]
              : [
                  {
                    title: "Fichas de Treino",
                    value: totalPlans,
                    subtitle: "Rotinas no catálogo",
                    href: `/consultoria/${consultancySlug}/rotinas`,
                  },
                  {
                    title: "Fichas Recentes",
                    value: recentPlans.length,
                    subtitle: "Em acompanhamento",
                    href: `/consultoria/${consultancySlug}/rotinas`,
                  },
                ]
          }
          recentSection={
            recentPlans && recentPlans.length > 0
              ? {
                  title: "Fichas Recentes",
                  viewAllHref: `/consultoria/${consultancySlug}/rotinas`,
                  items: recentPlans.slice(0, 4).map((plan) => {
                    const isArchived = plan.status === "ARCHIVED";
                    const isDraft = plan.status === "DRAFT";
                    return {
                      id: plan.publicId,
                      title: plan.title,
                      subtitle: plan.subtitle || undefined,
                      caption: plan.blocksCount ? `${plan.blocksCount} blocos de treino` : undefined,
                      href: `/consultoria/${consultancySlug}/rotinas/${plan.publicId}`,
                      statusBadge: isArchived ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-[var(--surface-subtle)] text-[var(--text-tertiary)] border border-[var(--border-subtle)] font-sans">
                          Arquivado
                        </span>
                      ) : isDraft ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-sans">
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
              Gestão de Treinos & Alunos
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans">
              Prescreva e acompanhe os treinos dos seus alunos.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link href={`/consultoria/${consultancySlug}/rotinas/novo`}>
              <Button
                variant="primary"
                size="md"
                className="font-bold text-sm rounded-xl px-5 shadow-xs hover:brightness-105 active:scale-[0.98] transition-all font-sans"
              >
                + Nova Ficha
              </Button>
            </Link>
            <Link href={`/consultoria/${consultancySlug}/rotinas?action=import`}>
              <Button
                variant="secondary"
                size="md"
                className="font-semibold text-sm rounded-xl px-4 hover:bg-[var(--surface-hover)] border border-[var(--border-default)] transition-all font-sans"
              >
                Importar Treino
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
              Alunos
            </span>
          </Link>

          <Link
            href={`/consultoria/${consultancySlug}/rotinas`}
            className="p-2 sm:px-4 sm:py-1 hover:text-[var(--brand)] transition-colors group flex flex-col justify-center"
          >
            <span className="text-lg sm:text-xl font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors font-sans tabular-nums">
              {totalPlans}
            </span>
            <span className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold font-sans mt-0.5">
              Fichas de Treino
            </span>
          </Link>

          <Link
            href={`/consultoria/${consultancySlug}/exercicios`}
            className="p-2 sm:px-4 sm:py-1 hover:text-[var(--brand)] transition-colors group flex flex-col justify-center"
          >
            <span className="text-lg sm:text-xl font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors font-sans">
              Biblioteca
            </span>
            <span className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold font-sans mt-0.5">
              Exercícios
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
          {/* COLUNA ESQUERDA (75%): FICHAS RECENTES = CONTEÚDO PRINCIPAL */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] font-sans tracking-tight">
                Fichas Recentes
              </h3>
              <Link href={`/consultoria/${consultancySlug}/rotinas`}>
                <span className="text-xs text-[var(--brand)] font-semibold hover:underline font-sans cursor-pointer">
                  Ver todas ({totalPlans}) →
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
                      href={`/consultoria/${consultancySlug}/rotinas/${plan.publicId}`}
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
                          {plan.subtitle && plan.blocksCount ? <span>•</span> : null}
                          {plan.blocksCount ? <span>{plan.blocksCount} blocos / categorias</span> : null}
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
                    Nenhuma ficha cadastrada ainda. Crie sua primeira rotina para prescrever aos alunos.
                  </p>
                  <Link href={`/consultoria/${consultancySlug}/rotinas/novo`}>
                    <Button variant="primary" size="sm" className="font-semibold rounded-lg font-sans">
                      + Criar Primeira Ficha
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
                href={`/consultoria/${consultancySlug}/rotinas?tab=templates`}
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
                href={`/consultoria/${consultancySlug}/rotinas?tab=assignments`}
                className="p-3.5 hover:bg-[var(--surface-hover)] transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="space-y-0.5 min-w-0 pr-2">
                  <h4 className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate font-sans">
                    Prescrições Ativas
                  </h4>
                  <p className="text-[11px] text-[var(--text-tertiary)] truncate font-sans">
                    Fichas em uso por alunos
                  </p>
                </div>
                <span className="text-xs text-[var(--text-tertiary)] group-hover:text-[var(--brand)] group-hover:translate-x-0.5 transition-all font-bold shrink-0">
                  →
                </span>
              </Link>

              <Link
                href={`/consultoria/${consultancySlug}/exercicios`}
                className="p-3.5 hover:bg-[var(--surface-hover)] transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="space-y-0.5 min-w-0 pr-2">
                  <h4 className="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate font-sans">
                    Catálogo de Exercícios
                  </h4>
                  <p className="text-[11px] text-[var(--text-tertiary)] truncate font-sans">
                    Biblioteca de movimentos e vídeos
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
                    Atendimentos 1:1 agendados
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
