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
}

export function DashboardPersonalView({
  consultancySlug,
  recentPlans = [],
  totalPlans = 0,
}: DashboardPersonalViewProps) {
  return (
    <>
      {/* MOBILE NATIVE COCKPIT (< 768px) */}
      <div className="md:hidden">
        <MobileDashboardCockpit
          role="PERSONAL"
          consultancySlug={consultancySlug}
          heroActionCard={
            <div className="p-3.5 sm:p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  Prescrever treino
                </h2>
                <span className="text-xs text-[var(--text-tertiary)] font-medium">
                  {totalPlans} rotinas ativas
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href={`/consultoria/${consultancySlug}/rotinas/novo`}
                  className="min-h-[44px] rounded-lg font-semibold text-xs bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-[var(--text-inverse)] flex items-center justify-center gap-1.5 shadow-2xs active:scale-[0.98] transition-all"
                >
                  <span>+ Nova Ficha</span>
                </Link>
                <Link
                  href={`/consultoria/${consultancySlug}/rotinas?action=import`}
                  className="min-h-[44px] rounded-lg font-semibold text-xs bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] text-[var(--text-primary)] flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
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
          metrics={[
            {
              title: "Fichas de Treino",
              value: totalPlans,
              subtitle: "Rotinas ativas no catálogo",
              href: `/consultoria/${consultancySlug}/rotinas`,
            },
            {
              title: "Alunos",
              value: "Acessar",
              subtitle: "Ver fichas e avaliações",
              href: `/consultoria/${consultancySlug}/progresso/alunos`,
            },
          ]}
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
              Gestão de Treinos & Alunos
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/consultoria/${consultancySlug}/rotinas?action=import`}>
              <Button variant="secondary" size="sm" className="font-semibold rounded-lg">
                Importar Treino
              </Button>
            </Link>
            <Link href={`/consultoria/${consultancySlug}/rotinas/novo`}>
              <Button variant="primary" size="sm" className="font-semibold rounded-lg">
                + Nova Ficha
              </Button>
            </Link>
          </div>
        </div>

        {/* 2. OPERATIONAL SUMMARY STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)] overflow-hidden shadow-2xs">
          <Link
            href={`/consultoria/${consultancySlug}/progresso/alunos`}
            title="Alunos"
            className="p-3.5 sm:p-4 hover:bg-[var(--surface-hover)] transition-colors group flex flex-col justify-between"
          >
            <span className="text-xs text-[var(--text-tertiary)] font-medium">Alunos</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base sm:text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                Acessar
              </span>
              <span className="text-[11px] text-[var(--text-tertiary)] hidden xl:inline">Ver fichas e avaliações</span>
            </div>
          </Link>

          <Link
            href={`/consultoria/${consultancySlug}/rotinas`}
            className="p-3.5 sm:p-4 hover:bg-[var(--surface-hover)] transition-colors group flex flex-col justify-between"
          >
            <span className="text-xs text-[var(--text-tertiary)] font-medium">Fichas de Treino</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base sm:text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                {totalPlans}
              </span>
              <span className="text-[11px] text-[var(--text-tertiary)] hidden xl:inline">Rotinas cadastradas</span>
            </div>
          </Link>

          <Link
            href={`/consultoria/${consultancySlug}/exercicios`}
            className="p-3.5 sm:p-4 hover:bg-[var(--surface-hover)] transition-colors group flex flex-col justify-between"
          >
            <span className="text-xs text-[var(--text-tertiary)] font-medium">Exercícios</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-base sm:text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                Biblioteca
              </span>
              <span className="text-[11px] text-[var(--text-tertiary)] hidden xl:inline">Catálogo</span>
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
              <span className="text-[11px] text-[var(--text-tertiary)] hidden xl:inline">Atendimentos 1:1</span>
            </div>
          </Link>
        </div>

        {/* 3. TREINOS RECENTES: Lista operacional limpa sem card-in-card */}
        <div className="rounded-xl bg-[var(--surface)] border border-[var(--border-default)] overflow-hidden shadow-2xs">
          <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Fichas de Treino Recentes
            </h3>
            <Link href={`/consultoria/${consultancySlug}/rotinas`}>
              <Button variant="ghost" size="sm" className="text-xs text-[var(--brand)] font-semibold hover:bg-[var(--surface-hover)]">
                Ver todas ({totalPlans}) →
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
                    href={`/consultoria/${consultancySlug}/rotinas/${plan.publicId}`}
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
                        {plan.subtitle && plan.blocksCount ? <span>•</span> : null}
                        {plan.blocksCount ? <span>{plan.blocksCount} blocos / categorias</span> : null}
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
                Nenhuma ficha cadastrada ainda. Crie sua primeira rotina para prescrever aos alunos.
              </p>
              <Link href={`/consultoria/${consultancySlug}/rotinas/novo`}>
                <Button variant="primary" size="sm" className="font-semibold rounded-lg">
                  + Criar Primeira Ficha
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* 4. ATALHOS DIRETOS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href={`/consultoria/${consultancySlug}/rotinas?tab=templates`}
            className="p-3.5 sm:p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] hover:border-[var(--brand)] transition-all flex items-center justify-between group shadow-2xs"
          >
            <div className="space-y-0.5">
              <h4 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                Modelos Reutilizáveis (Templates)
              </h4>
              <p className="text-xs text-[var(--text-secondary)]">
                Estruturas base prontas para clonar e prescrever rapidamente
              </p>
            </div>
            <span className="text-sm text-[var(--brand)] font-bold group-hover:translate-x-0.5 transition-transform shrink-0 ml-3">→</span>
          </Link>

          <Link
            href={`/consultoria/${consultancySlug}/rotinas?tab=assignments`}
            className="p-3.5 sm:p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] hover:border-[var(--brand)] transition-all flex items-center justify-between group shadow-2xs"
          >
            <div className="space-y-0.5">
              <h4 className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                Prescrições Ativas de Alunos
              </h4>
              <p className="text-xs text-[var(--text-secondary)]">
                Acompanhe quem está treinando com qual ficha no momento
              </p>
            </div>
            <span className="text-sm text-[var(--brand)] font-bold group-hover:translate-x-0.5 transition-transform shrink-0 ml-3">→</span>
          </Link>
        </div>
      </div>
    </>
  );
}
