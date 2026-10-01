"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Section, CompactCard, ListRow, StatusBadge } from "@/components/ui/design-system";

export interface NutritionistPlanSummaryItem {
  publicId: string;
  title: string;
  studentName?: string | null;
  status: string;
  versionNumber?: number | null;
  mealsCount?: number;
}

interface DashboardNutritionistViewProps {
  consultancySlug: string;
  recentPlans: NutritionistPlanSummaryItem[];
  totalPlans?: number;
}

export function DashboardNutritionistView({
  consultancySlug,
  recentPlans = [],
  totalPlans = 0,
}: DashboardNutritionistViewProps) {
  return (
    <div className="space-y-5 sm:space-y-6 max-w-5xl mx-auto animate-in fade-in duration-150">
      {/* 1. HEADER & PRIMARY ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
        <div>
          <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Área de Nutrição
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight font-heading">
            Gestão de Dietas & Pacientes
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/consultoria/${consultancySlug}/planos-v2?action=import`}>
            <Button variant="secondary" size="sm">
              Importar Plano
            </Button>
          </Link>
          <Link href={`/consultoria/${consultancySlug}/planos-v2/novo`}>
            <Button variant="primary" size="sm">
              + Novo Plano
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. OPERATIONAL COCKPIT STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <CompactCard
          title="Pacientes"
          value="Acessar"
          subtitle="Ver prontuários e metas"
          href={`/consultoria/${consultancySlug}/progresso/alunos`}
          icon={
            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
        />
        <CompactCard
          title="Planos Alimentares"
          value={totalPlans}
          subtitle="Dietas cadastradas"
          href={`/consultoria/${consultancySlug}/planos-v2`}
          icon={
            <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <CompactCard
          title="Alimentos"
          value="Biblioteca V3"
          subtitle="Tabelas e rótulos"
          href={`/consultoria/${consultancySlug}/alimentos-v2`}
          icon={
            <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          }
        />
        <CompactCard
          title="Consultas"
          value="Agenda"
          subtitle="Atendimentos e retornos"
          href={`/consultoria/${consultancySlug}/consultas`}
          icon={
            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
      </div>

      {/* 3. PLANOS RECENTES */}
      <Section
        title="Planos Alimentares Recentes"
        subtitle="Últimos cardápios criados ou editados"
        action={
          <Link href={`/consultoria/${consultancySlug}/planos-v2`}>
            <Button variant="ghost" size="sm">
              Ver todos ({totalPlans}) →
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
                  subtitle={plan.studentName ? `Paciente: ${plan.studentName}` : "Sem paciente vinculado (Modelo)"}
                  caption={plan.mealsCount ? `${plan.mealsCount} refeições diárias` : undefined}
                  href={`/consultoria/${consultancySlug}/planos-v2/${plan.publicId}`}
                  trailing={
                    <div className="flex items-center gap-2">
                      <StatusBadge status={status} />
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hidden sm:inline">
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
              Nenhum plano alimentar cadastrado ainda. Crie seu primeiro plano para prescrever aos pacientes.
            </p>
            <Link href={`/consultoria/${consultancySlug}/planos-v2/novo`}>
              <Button variant="primary" size="sm">
                + Criar Primeiro Plano
              </Button>
            </Link>
          </div>
        )}
      </Section>

      {/* 4. ATALHOS DIRETOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href={`/consultoria/${consultancySlug}/planos-v2?tab=templates`}
          className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] hover:border-emerald-500 transition-all flex items-center justify-between group"
        >
          <div>
            <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
              Modelos de Cardápio (Templates)
            </h4>
            <p className="text-xs text-[var(--text-secondary)]">
              Dietas base hipertróficas, de emagrecimento e manutenção para clonar
            </p>
          </div>
          <span className="text-sm text-emerald-600 font-bold">→</span>
        </Link>

        <Link
          href={`/consultoria/${consultancySlug}/planos-v2/prontuario`}
          className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] hover:border-emerald-500 transition-all flex items-center justify-between group"
        >
          <div>
            <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
              Prontuários Nutricionais
            </h4>
            <p className="text-xs text-[var(--text-secondary)]">
              Anamneses clínicas, recordatórios e histórico de adesão
            </p>
          </div>
          <span className="text-sm text-emerald-600 font-bold">→</span>
        </Link>
      </div>
    </div>
  );
}
