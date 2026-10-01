"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Section, CompactCard, ListRow, StatusBadge } from "@/components/ui/design-system";

export interface PersonalWorkoutSummaryItem {
  publicId: string;
  title: string;
  subtitle?: string | null;
  status: string;
  difficultyLevel?: string | null;
  blocksCount?: number;
  currentVersionStatus?: string | null;
}

interface DashboardPersonalViewProps {
  consultancySlug: string;
  recentPlans: PersonalWorkoutSummaryItem[];
  totalPlans?: number;
}

export function DashboardPersonalView({
  consultancySlug,
  recentPlans = [],
  totalPlans = 0,
}: DashboardPersonalViewProps) {
  return (
    <div className="space-y-5 sm:space-y-6 max-w-5xl mx-auto animate-in fade-in duration-150">
      {/* 1. HEADER & PRIMARY ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
        <div>
          <div className="text-[11px] font-semibold text-[var(--brand)] uppercase tracking-wider">
            Área do Treinador
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight font-heading">
            Gestão de Treinos & Alunos
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/consultoria/${consultancySlug}/rotinas?action=import`}>
            <Button variant="secondary" size="sm">
              Importar Treino
            </Button>
          </Link>
          <Link href={`/consultoria/${consultancySlug}/rotinas/novo`}>
            <Button variant="primary" size="sm">
              + Nova Ficha
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. OPERATIONAL COCKPIT STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <CompactCard
          title="Alunos"
          value="Acessar"
          subtitle="Ver fichas e avaliações"
          href={`/consultoria/${consultancySlug}/progresso/alunos`}
          icon={
            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
        />
        <CompactCard
          title="Fichas de Treino"
          value={totalPlans}
          subtitle="Rotinas cadastradas"
          href={`/consultoria/${consultancySlug}/rotinas`}
          icon={
            <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
        />
        <CompactCard
          title="Exercícios"
          value="Biblioteca"
          subtitle="Catálogo de execução"
          href={`/consultoria/${consultancySlug}/exercicios`}
          icon={
            <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <CompactCard
          title="Consultas"
          value="Agenda"
          subtitle="Atendimentos 1:1"
          href={`/consultoria/${consultancySlug}/consultas`}
          icon={
            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
      </div>

      {/* 3. TREINOS RECENTES & MODELOS */}
      <Section
        title="Fichas de Treino Recentes"
        subtitle="Últimas rotinas criadas ou atualizadas"
        action={
          <Link href={`/consultoria/${consultancySlug}/rotinas`}>
            <Button variant="ghost" size="sm">
              Ver todas ({totalPlans}) →
            </Button>
          </Link>
        }
      >
        {recentPlans && recentPlans.length > 0 ? (
          <div className="space-y-2">
            {recentPlans.slice(0, 6).map((plan) => {
              const status =
                plan.status === "ACTIVE" || plan.status === "PUBLISHED"
                  ? "active"
                  : plan.status === "ARCHIVED"
                  ? "archived"
                  : "draft";

              return (
                <ListRow
                  key={plan.publicId}
                  title={plan.title}
                  subtitle={plan.subtitle || "Sem descrição"}
                  caption={plan.blocksCount ? `${plan.blocksCount} blocos / categorias` : undefined}
                  href={`/consultoria/${consultancySlug}/rotinas/${plan.publicId}`}
                  trailing={
                    <div className="flex items-center gap-2">
                      <StatusBadge status={status} />
                      <span className="text-xs text-[var(--brand)] font-semibold hidden sm:inline">
                        Editar →
                      </span>
                    </div>
                  }
                />
              );
            })}
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-center space-y-3">
            <p className="text-xs text-[var(--text-secondary)]">
              Nenhuma ficha cadastrada ainda. Crie sua primeira rotina para prescrever aos alunos.
            </p>
            <Link href={`/consultoria/${consultancySlug}/rotinas/novo`}>
              <Button variant="primary" size="sm">
                + Criar Primeira Ficha
              </Button>
            </Link>
          </div>
        )}
      </Section>

      {/* 4. ATALHOS DIRETOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href={`/consultoria/${consultancySlug}/rotinas?tab=templates`}
          className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] hover:border-[var(--brand)] transition-all flex items-center justify-between group"
        >
          <div>
            <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)]">
              Modelos Reutilizáveis (Templates)
            </h4>
            <p className="text-xs text-[var(--text-secondary)]">
              Estruturas base prontas para clonar e prescrever rapidamente
            </p>
          </div>
          <span className="text-sm text-[var(--brand)] font-bold">→</span>
        </Link>

        <Link
          href={`/consultoria/${consultancySlug}/rotinas?tab=assignments`}
          className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] hover:border-[var(--brand)] transition-all flex items-center justify-between group"
        >
          <div>
            <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)]">
              Prescrições Ativas de Alunos
            </h4>
            <p className="text-xs text-[var(--text-secondary)]">
              Acompanhe quem está treinando com qual ficha no momento
            </p>
          </div>
          <span className="text-sm text-[var(--brand)] font-bold">→</span>
        </Link>
      </div>
    </div>
  );
}
