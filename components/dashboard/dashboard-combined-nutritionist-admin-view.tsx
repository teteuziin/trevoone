"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NetflixFeatureCarousel, type CarouselSlide } from "./netflix-feature-carousel";
import type { ConsultancyAdminOverview } from "@/lib/consultancies/admin";
import type { PlatformEffectiveAccessState } from "@/lib/platform-admin/billing";
import type { NutritionistPlanSummaryItem } from "./dashboard-nutritionist-view";

interface DashboardCombinedNutritionistAdminViewProps {
  consultancySlug: string;
  consultancyName?: string;
  overview: ConsultancyAdminOverview | null;
  platformAccess?: PlatformEffectiveAccessState;
  recentPlans: NutritionistPlanSummaryItem[];
  totalPlans?: number;
}

function AppleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a9 9 0 0 0-9 9c0 4.97 4.03 9 9 9s9-4.03 9-9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2c2.5 2.5 3 6 1 8.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 11c0 3.31-2.69 6-6 6s-6-2.69-6-6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4" />
    </svg>
  );
}

function UsersIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function VideoIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

function FinanceIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 10h19M6 15h3m4 0h5" />
    </svg>
  );
}

function ActivityIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ChevronRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function DashboardCombinedNutritionistAdminView({
  consultancySlug,
  consultancyName,
  overview,
  platformAccess,
  recentPlans,
  totalPlans = 0,
}: DashboardCombinedNutritionistAdminViewProps) {
  const isSuspended = platformAccess && !platformAccess.isOperationalAllowed;

  const slides: CarouselSlide[] = [
    {
      id: "slide-nutrition",
      tag: "PRESCRIÇÃO",
      tagColor: "emerald",
      title: "Planos Alimentares & Pacientes",
      description: "Monte cardápios clínicos, metas de macronutrientes e acompanhe a evolução alimentar.",
      ctaText: "Acessar planos",
      ctaHref: `/consultoria/${consultancySlug}/planos-v2`,
      imageUrl: "/images/student/nutrition-editorial.webp",
      meta: totalPlans > 0 ? `${totalPlans} planos cadastrados` : "Prescrição nutricional",
    },
    {
      id: "slide-admin",
      tag: "GESTÃO",
      tagColor: "brand",
      title: "Gestão Integrada da Consultoria",
      description: "Coordene equipe técnica, pacientes, mensalidades e controle operacional.",
      ctaText: "Gerenciar membros",
      ctaHref: `/consultoria/${consultancySlug}/membros`,
      imageUrl: "/images/admin/workspace.jpg",
      meta: overview?.activeMembers ? `${overview.activeMembers} membros ativos` : undefined,
    },
    {
      id: "slide-operations",
      tag: "OPERAÇÕES",
      tagColor: "blue",
      title: "Central de Operações da Consultoria",
      description: "Monitore a saúde operacional, aderência dos alunos e indicadores de retenção.",
      ctaText: "Abrir operações",
      ctaHref: `/consultoria/${consultancySlug}/operacoes`,
      imageUrl: "/images/admin/finance.jpg",
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {isSuspended && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold">
          Atenção: Acesso operacional da consultoria suspenso por pendência na assinatura.
        </div>
      )}

      {/* 1. HERO / DESTAQUE */}
      <section aria-label="Destaques">
        <NetflixFeatureCarousel
          slides={slides}
          consultancySlug={consultancySlug}
          autoSlideIntervalMs={7000}
        />
      </section>

      {/* 2. RESUMO OPERACIONAL (6 Cards Rápidos) */}
      <section aria-label="Resumo Operacional" className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] font-heading">
            Resumo Operacional
          </h2>
          <span className="text-[11px] text-[var(--text-tertiary)]">
            Nutricionista + Gestão da Consultoria
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {/* Card 1: Pacientes / Alunos */}
          <Link
            href={`/consultoria/${consultancySlug}/progresso/alunos`}
            className="p-4 sm:p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] hover:border-[var(--border-strong)] transition-all shadow-xs group flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                Pacientes
              </span>
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
                <UsersIcon className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="text-2xl font-bold text-[var(--text-primary)] font-heading tabular-nums">
                {overview?.students ?? 0}
              </span>
              <p className="text-xs text-[var(--text-secondary)] font-medium truncate">
                Pacientes cadastrados
              </p>
            </div>
            <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-semibold text-[var(--brand)]">
              <span>Ver pacientes</span>
              <ChevronRightIcon className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* Card 2: Planos Alimentares */}
          <Link
            href={`/consultoria/${consultancySlug}/planos-v2`}
            className="p-4 sm:p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] hover:border-[var(--border-strong)] transition-all shadow-xs group flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                Planos
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <AppleIcon className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="text-2xl font-bold text-[var(--text-primary)] font-heading tabular-nums">
                {totalPlans || recentPlans.length}
              </span>
              <p className="text-xs text-[var(--text-secondary)] font-medium truncate">
                Dietas prescritas
              </p>
            </div>
            <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-semibold text-[var(--brand)]">
              <span>Gerenciar planos</span>
              <ChevronRightIcon className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* Card 3: Consultas */}
          <Link
            href={`/consultoria/${consultancySlug}/consultas`}
            className="p-4 sm:p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] hover:border-[var(--border-strong)] transition-all shadow-xs group flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                Consultas
              </span>
              <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center">
                <VideoIcon className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="text-2xl font-bold text-[var(--text-primary)] font-heading">
                1:1
              </span>
              <p className="text-xs text-[var(--text-secondary)] font-medium truncate">
                Retornos e teleconsultas
              </p>
            </div>
            <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-semibold text-[var(--brand)]">
              <span>Ver agenda</span>
              <ChevronRightIcon className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* Card 4: Membros */}
          <Link
            href={`/consultoria/${consultancySlug}/membros`}
            className="p-4 sm:p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] hover:border-[var(--border-strong)] transition-all shadow-xs group flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                Equipe
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <UsersIcon className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="text-2xl font-bold text-[var(--text-primary)] font-heading tabular-nums">
                {overview?.activeMembers ?? 0}
              </span>
              <p className="text-xs text-[var(--text-secondary)] font-medium truncate">
                Membros da consultoria
              </p>
            </div>
            <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-semibold text-[var(--brand)]">
              <span>Gerenciar membros</span>
              <ChevronRightIcon className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* Card 5: Financeiro */}
          <Link
            href={`/consultoria/${consultancySlug}/financeiro`}
            className="p-4 sm:p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] hover:border-[var(--border-strong)] transition-all shadow-xs group flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                Financeiro
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <FinanceIcon className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="text-2xl font-bold text-[var(--text-primary)] font-heading">
                Fluxo
              </span>
              <p className="text-xs text-[var(--text-secondary)] font-medium truncate">
                Mensalidades e faturas
              </p>
            </div>
            <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-semibold text-[var(--brand)]">
              <span>Acessar faturamento</span>
              <ChevronRightIcon className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* Card 6: Operações */}
          <Link
            href={`/consultoria/${consultancySlug}/operacoes`}
            className="p-4 sm:p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] hover:border-[var(--border-strong)] transition-all shadow-xs group flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                Operações
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                <ActivityIcon className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="text-2xl font-bold text-[var(--text-primary)] font-heading">
                Radar
              </span>
              <p className="text-xs text-[var(--text-secondary)] font-medium truncate">
                Monitoramento &amp; risco
              </p>
            </div>
            <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-semibold text-[var(--brand)]">
              <span>Ver radar</span>
              <ChevronRightIcon className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        </div>
      </section>

      {/* 3. ATIVIDADE PRIORITÁRIA */}
      <section aria-label="Atividade Prioritária" className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] font-heading">
              Planos Alimentares Recentes
            </h2>
            <Link
              href={`/consultoria/${consultancySlug}/planos-v2`}
              className="text-xs font-bold text-[var(--brand)] hover:underline flex items-center gap-1"
            >
              <span>Ver todos</span>
              <ChevronRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentPlans.length > 0 ? (
            <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] divide-y divide-[var(--border-subtle)] shadow-xs overflow-hidden">
              {recentPlans.slice(0, 3).map((plan) => (
                <div key={plan.publicId} className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate">
                      {plan.title}
                    </h3>
                    <p className="text-[11px] text-[var(--text-secondary)] truncate">
                      {plan.studentName ? `Paciente: ${plan.studentName}` : "Prescrição alimentar"}
                    </p>
                  </div>
                  <Badge variant={plan.status === "ACTIVE" ? "success" : "neutral"} size="sm">
                    {plan.status === "ACTIVE" ? "Ativo" : "Rascunho"}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-5 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] text-center space-y-2 shadow-xs">
              <p className="text-xs font-bold text-[var(--text-primary)]">
                Nenhum plano alimentar prescrito recentemente
              </p>
              <Link href={`/consultoria/${consultancySlug}/planos-v2/novo`}>
                <Button variant="secondary" size="sm" className="text-xs font-semibold mt-1">
                  Criar plano alimentar
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Coluna 2: Status da Consultoria */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)] font-heading">
              Status da Consultoria
            </h2>
            <Link
              href={`/consultoria/${consultancySlug}/membros`}
              className="text-xs font-bold text-[var(--brand)] hover:underline flex items-center gap-1"
            >
              <span>Gerenciar</span>
              <ChevronRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-5 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] font-heading">
                  {consultancyName || "Consultoria Trevo One"}
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Painel executivo da operação
                </p>
              </div>
              <Badge variant="brand" size="sm">
                Plano Ativo
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold block">Pacientes</span>
                <span className="text-base font-bold text-[var(--text-primary)] font-heading tabular-nums">
                  {overview?.students ?? 0}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold block">Nutricionistas</span>
                <span className="text-base font-bold text-[var(--text-primary)] font-heading tabular-nums">
                  {overview?.nutritionists ?? 0}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold block">Equipe</span>
                <span className="text-base font-bold text-[var(--text-primary)] font-heading tabular-nums">
                  {overview?.activeMembers ?? 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
