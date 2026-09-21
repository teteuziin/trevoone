"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  NetflixFeatureCarousel,
  type CarouselSlide,
} from "./netflix-feature-carousel";
import {
  MissionPriorityBadge,
  MissionStatusGroup,
} from "@/components/missions/mission-ui-badges";
import type { MissionListItemView } from "@/lib/consultancies/missions";

export interface InfluencerPlanSummary {
  title: string;
}

interface DashboardInfluencerViewProps {
  consultancySlug: string;
  consultancyName?: string;
  userName?: string;
  missions: MissionListItemView[];
  totalMissions?: number;
  activeTrainingPlan?: InfluencerPlanSummary | null;
  activeNutritionPlan?: InfluencerPlanSummary | null;
}

// ============================================================================
// ICONS (Trevo One Art Direction — Clean, tactile, linear precision)
// ============================================================================

function TargetIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function WorkoutIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6.5 6.5 11 11" />
      <path d="m21 21-1-1a2 2 0 0 0-2.83 0l-2.5 2.5a2 2 0 0 1-2.83 0l-.84-.84a2 2 0 0 1 0-2.83l2.5-2.5a2 2 0 0 0 0-2.83l-1-1" />
      <path d="m3 3 1 1a2 2 0 0 0 2.83 0l2.5-2.5a2 2 0 0 1 2.83 0l.84.84a2 2 0 0 1 0 2.83l-2.5 2.5a2 2 0 0 0 0 2.83l1 1" />
    </svg>
  );
}

function NutritionIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2a9 9 0 0 0-9 9c0 4.97 4.03 9 9 9s9-4.03 9-9" />
      <path d="M12 2c2.5 2.5 3 6 1 8.5" />
      <path d="M18 11c0 3.31-2.69 6-6 6s-6-2.69-6-6" />
      <path d="M12 2v4" />
    </svg>
  );
}

function ProgressIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </svg>
  );
}

function ClockIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function CheckCircleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function AlertTriangleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function ArrowRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function getFirstName(fullName?: string): string {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  return parts[0] || "";
}

export function DashboardInfluencerView({
  consultancySlug,
  consultancyName,
  userName,
  missions = [],
  totalMissions,
  activeTrainingPlan,
  activeNutritionPlan,
}: DashboardInfluencerViewProps) {
  // 1. Definition of Late & Priority: canonical isLate boolean already computed server-side per timezone
  const lateMission = missions.find((m) => m.isLate);

  // 2. Cockpit Metrics: calculated strictly and deduplicated from authoritative missions list
  const activeCount = missions.filter(
    (m) =>
      m.status === "PENDING" ||
      m.status === "IN_PROGRESS" ||
      m.status === "REVISION_REQUESTED"
  ).length;

  const reviewCount = missions.filter((m) => m.status === "SUBMITTED").length;
  const approvedCount = missions.filter((m) => m.status === "APPROVED").length;

  // Urgent: unique missions that are late OR high priority, among non-terminal missions (not APPROVED and not CANCELED)
  const urgentMissionPublicIds = new Set(
    missions
      .filter(
        (m) =>
          (m.isLate || m.priority === "HIGH") &&
          m.status !== "APPROVED" &&
          m.status !== "CANCELED"
      )
      .map((m) => m.publicId)
  );
  const urgentCount = urgentMissionPublicIds.size;

  // 3. Quick Actions Configuration (Canonical existing routes)
  const quickActions = [
    {
      href: `/consultoria/${consultancySlug}/missoes`,
      title: "Minhas Missões",
      description: "Entregas & diretrizes VIP",
      badge: "Missões",
      icon: TargetIcon,
      accent: true,
    },
    {
      href: `/consultoria/${consultancySlug}/treinos`,
      title: "Treinos VIP",
      description: "Rotinas prescritas",
      badge: "Treinos",
      icon: WorkoutIcon,
    },
    {
      href: `/consultoria/${consultancySlug}/nutricao`,
      title: "Nutrição VIP",
      description: "Plano alimentar",
      badge: "Nutrição",
      icon: NutritionIcon,
    },
    {
      href: `/consultoria/${consultancySlug}/progresso`,
      title: "Evolução",
      description: "Medições & biometria",
      badge: "Resultados",
      icon: ProgressIcon,
    },
  ];

  // 4. Hero Slides (Reusing NetflixFeatureCarousel with verified local photography)
  const firstName = getFirstName(userName);

  const influencerSlides: CarouselSlide[] = [
    {
      id: "vip-missions",
      tag: consultancyName ? `PARCERIA VIP • ${consultancyName.toUpperCase()}` : "PARCERIA VIP",
      tagColor: "brand",
      title: firstName
        ? `Olá, ${firstName} — Central de Parceria VIP`
        : "Central de Parceria & Missões VIP",
      description:
        "Cumpra suas diretrizes de divulgação, registre comprovações oficiais e acompanhe a aprovação das suas entregas.",
      ctaText: "Ver missões",
      ctaHref: `/consultoria/${consultancySlug}/missoes`,
      imageUrl: "/images/personal/coach-cockpit.jpg",
      meta:
        typeof totalMissions === "number" && totalMissions > 0
          ? `${totalMissions} ${totalMissions === 1 ? "missão atribuída" : "missões atribuídas"}`
          : undefined,
    },
    {
      id: "vip-training",
      tag: "TREINOS VIP",
      tagColor: "emerald",
      title: "Rotinas de Treino Prescritas",
      description:
        "Acesse seus treinos personalizados elaborados pelo seu treinador, com orientações completas de exercícios e cargas.",
      ctaText: "Acessar treinos",
      ctaHref: `/consultoria/${consultancySlug}/treinos`,
      imageUrl: "/images/student/workout-editorial.webp",
      meta: activeTrainingPlan?.title || "Treinos VIP",
    },
    {
      id: "vip-nutrition",
      tag: "NUTRIÇÃO VIP",
      tagColor: "amber",
      title: "Planejamento Nutricional",
      description:
        "Consulte seu cardápio, horários e diretrizes alimentares formuladas para apoiar sua performance e estética.",
      ctaText: "Ver plano alimentar",
      ctaHref: `/consultoria/${consultancySlug}/nutricao`,
      imageUrl: "/images/student/nutrition-editorial.webp",
      meta: activeNutritionPlan?.title || "Nutrição VIP",
    },
    {
      id: "vip-progress",
      tag: "EVOLUÇÃO",
      tagColor: "blue",
      title: "Registro de Evolução & Resultados",
      description:
        "Monitore suas medições corporais, registros de peso e evolução estética ao longo do período de acompanhamento.",
      ctaText: "Acessar evolução",
      ctaHref: `/consultoria/${consultancySlug}/progresso`,
      imageUrl: "/images/student/hero-athlete.webp",
      meta: "Acompanhamento VIP",
    },
  ];

  return (
    <div className="space-y-7 sm:space-y-9 overflow-x-clip">
      {/* ==================================================================== */}
      {/* 1. ALERTA P0: MISSÃO ATRASADA (Se houver registro com isLate)         */}
      {/* ==================================================================== */}
      {lateMission && (
        <div className="p-4.5 sm:p-5 rounded-2xl border border-red-500/30 bg-red-500/5 dark:bg-red-950/20 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <span className="w-3 h-3 rounded-full bg-red-500 shrink-0 mt-1 animate-pulse" />
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                  Prazo Excedido
                </span>
                <Badge variant="danger" size="sm">
                  Atrasada
                </Badge>
              </div>
              <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                {lateMission.title}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] font-medium">
                <ClockIcon className="w-3.5 h-3.5 text-red-500" />
                <span>Vencimento oficial: {lateMission.formattedDueAt}</span>
              </div>
            </div>
          </div>

          <div className="shrink-0">
            <Link href={`/consultoria/${consultancySlug}/missoes/${lateMission.publicId}`}>
              <Button variant="danger" size="sm" className="w-full sm:w-auto font-bold min-h-[44px]">
                Submeter missão →
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. HERO EDITORIAL PROTAGONISTA (NetflixFeatureCarousel)               */}
      {/* ==================================================================== */}
      <NetflixFeatureCarousel
        slides={influencerSlides}
        consultancySlug={consultancySlug}
      />

      {/* ==================================================================== */}
      {/* 3. OPERAÇÃO RÁPIDA (Snap rail no mobile, grid 4 cols no desktop)      */}
      {/* ==================================================================== */}
      <section aria-label="Operação Rápida" className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Operação Rápida
            </h2>
            <Badge variant="brand" size="sm">
              Influenciador / VIP
            </Badge>
          </div>
          <span className="text-[11px] text-[var(--text-tertiary)] font-medium hidden sm:inline">
            Acesso prioritário às rotinas e entregas
          </span>
        </div>

        <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none gap-3 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className={`w-[74vw] max-w-[280px] shrink-0 sm:w-auto sm:max-w-none snap-center p-4 rounded-2xl border transition-all duration-150 flex items-center justify-between gap-3 group depth-interactive min-h-[44px] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--brand)] ${
                  action.accent
                    ? "bg-[var(--surface-subtle)] border-[var(--brand)]/40 hover:border-[var(--brand)] shadow-2xs"
                    : "bg-[var(--surface)] border-[var(--border-default)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] shadow-xs"
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs transition-transform group-hover:scale-105 ${
                      action.accent
                        ? "bg-[var(--brand)] text-white"
                        : "bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--brand)]"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                      {action.title}
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] font-medium truncate">
                      {action.description}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-xs font-semibold text-[var(--text-tertiary)] group-hover:text-[var(--brand)] group-hover:translate-x-0.5 transition-all">
                  <ArrowRightIcon className="w-4 h-4" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 4. COCKPIT DE MISSÕES (4 Métricas Táteis: Ativas, Revisão, Aprovadas, Urgência) */}
      {/* ==================================================================== */}
      <section aria-label="Cockpit de Missões" className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            Cockpit de Missões
          </h2>
          <span className="text-[11px] text-[var(--text-tertiary)] font-medium hidden sm:inline">
            Status consolidado de entregas
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* 1. Ativas */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Ativas
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[var(--brand)]">
                <TargetIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-0.5">
              <p className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] font-heading tabular-nums">
                {activeCount}
              </p>
              <p className="text-[11px] text-[var(--text-tertiary)] font-medium">
                Em andamento ou pendentes
              </p>
            </div>
          </div>

          {/* 2. Aguardando Revisão */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Em Revisão
              </span>
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500">
                <ClockIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-0.5">
              <p className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] font-heading tabular-nums">
                {reviewCount}
              </p>
              <p className="text-[11px] text-[var(--text-tertiary)] font-medium">
                Submetidas à consultoria
              </p>
            </div>
          </div>

          {/* 3. Aprovadas */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Aprovadas
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                <CheckCircleIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-0.5">
              <p className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] font-heading tabular-nums">
                {approvedCount}
              </p>
              <p className="text-[11px] text-[var(--text-tertiary)] font-medium">
                Entregas homologadas
              </p>
            </div>
          </div>

          {/* 4. Urgência (Deduplicada) */}
          <div
            className={`p-4 sm:p-5 rounded-2xl border shadow-xs flex flex-col justify-between space-y-3 ${
              urgentCount > 0
                ? "bg-red-500/5 dark:bg-red-950/20 border-red-500/30"
                : "bg-[var(--surface)] border-[var(--border-default)]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-xs font-bold uppercase tracking-wider ${
                  urgentCount > 0 ? "text-red-600 dark:text-red-400" : "text-[var(--text-secondary)]"
                }`}
              >
                Urgência
              </span>
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  urgentCount > 0
                    ? "bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400"
                    : "bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-tertiary)]"
                }`}
              >
                <AlertTriangleIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="space-y-0.5">
              <p
                className={`text-2xl sm:text-3xl font-extrabold font-heading tabular-nums ${
                  urgentCount > 0 ? "text-red-600 dark:text-red-400" : "text-[var(--text-primary)]"
                }`}
              >
                {urgentCount}
              </p>
              <p className="text-[11px] text-[var(--text-tertiary)] font-medium">
                {urgentCount > 0 ? "Atrasadas ou prioridade alta" : "Sem pendências críticas"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 5. FILA DE MISSÕES ATRIBUÍDAS                                         */}
      {/* ==================================================================== */}
      <section aria-label="Fila de Missões Atribuídas" className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Fila de Missões Atribuídas
            </h2>
            {missions.length > 0 && (
              <Badge variant="neutral" size="sm">
                {missions.length}
              </Badge>
            )}
          </div>
          <Link
            href={`/consultoria/${consultancySlug}/missoes`}
            className="text-xs sm:text-sm font-semibold text-[var(--brand)] hover:underline inline-flex items-center gap-1 shrink-0"
          >
            <span>Ver todas</span>
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        </div>

        {missions.length > 0 ? (
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] divide-y divide-[var(--border-subtle)] shadow-xs overflow-hidden">
            {missions.map((mission) => (
              <Link
                key={mission.publicId}
                href={`/consultoria/${consultancySlug}/missoes/${mission.publicId}`}
                className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-[var(--surface-hover)] transition-all duration-150 group min-h-[64px] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm sm:text-base font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--brand)] transition-colors">
                      {mission.title}
                    </p>
                    <MissionStatusGroup status={mission.status} isLate={mission.isLate} size="sm" />
                    {mission.priority && mission.priority !== "NORMAL" && (
                      <MissionPriorityBadge priority={mission.priority} size="sm" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] font-medium">
                    <ClockIcon className="w-3.5 h-3.5 shrink-0 text-[var(--text-tertiary)]" />
                    <span>Prazo de entrega: {mission.formattedDueAt}</span>
                  </div>
                </div>

                <div className="shrink-0 text-xs font-semibold text-[var(--text-tertiary)] group-hover:text-[var(--brand)] group-hover:translate-x-0.5 transition-all flex items-center gap-1">
                  <span className="hidden sm:inline">Ver detalhes</span>
                  <ArrowRightIcon className="w-4 h-4" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<TargetIcon className="w-6 h-6" />}
            title="Nenhuma missão pendente"
            description="Você não possui missões ativas no momento. Novas diretrizes e metas de divulgação aparecerão aqui assim que atribuídas pela consultoria."
            action={
              <Link href={`/consultoria/${consultancySlug}/missoes`}>
                <Button variant="secondary" size="sm" className="font-semibold min-h-[44px]">
                  Acessar histórico de missões
                </Button>
              </Link>
            }
          />
        )}
      </section>

      {/* ==================================================================== */}
      {/* 6. MÓDULOS DE APOIO: SEU ACOMPANHAMENTO VIP                           */}
      {/* ==================================================================== */}
      <section aria-label="Seu Acompanhamento VIP" className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Seu Acompanhamento VIP
            </h2>
          </div>
          <span className="text-[11px] text-[var(--text-tertiary)] font-medium hidden sm:inline">
            Acesso direto aos seus módulos de saúde e performance
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
          {/* Treinos VIP */}
          <Link
            href={`/consultoria/${consultancySlug}/treinos`}
            className="p-4.5 sm:p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs hover:border-[var(--brand-soft-border)] hover:bg-[var(--surface-hover)] hover:-translate-y-0.5 transition-all duration-150 group flex flex-col justify-between space-y-4 min-h-[140px] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[var(--brand)] shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                <WorkoutIcon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-tertiary)]">
                Treinos VIP
              </span>
            </div>
            <div className="space-y-1 min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                {activeTrainingPlan ? activeTrainingPlan.title : "Treinos Prescritos"}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] font-normal line-clamp-2">
                Acesse suas rotinas personalizadas, séries e orientações do treinador.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-[var(--brand)] pt-1">
              <span>Acessar rotinas</span>
              <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* Nutrição VIP */}
          <Link
            href={`/consultoria/${consultancySlug}/nutricao`}
            className="p-4.5 sm:p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs hover:border-[var(--brand-soft-border)] hover:bg-[var(--surface-hover)] hover:-translate-y-0.5 transition-all duration-150 group flex flex-col justify-between space-y-4 min-h-[140px] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                <NutritionIcon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-tertiary)]">
                Nutrição VIP
              </span>
            </div>
            <div className="space-y-1 min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                {activeNutritionPlan ? activeNutritionPlan.title : "Plano Alimentar"}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] font-normal line-clamp-2">
                Consulte seu cardápio prescrito, horários e diretrizes nutricionais.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-[var(--brand)] pt-1">
              <span>Ver refeições</span>
              <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* Evolução */}
          <Link
            href={`/consultoria/${consultancySlug}/progresso`}
            className="p-4.5 sm:p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs hover:border-[var(--brand-soft-border)] hover:bg-[var(--surface-hover)] hover:-translate-y-0.5 transition-all duration-150 group flex flex-col justify-between space-y-4 min-h-[140px] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500 shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                <ProgressIcon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-tertiary)]">
                Biometria
              </span>
            </div>
            <div className="space-y-1 min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                Evolução & Resultados
              </h3>
              <p className="text-xs text-[var(--text-secondary)] font-normal line-clamp-2">
                Acompanhe seu histórico de medições corporais, registros e fotos.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-[var(--brand)] pt-1">
              <span>Ver evolução</span>
              <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
