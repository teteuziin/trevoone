"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ZapIcon as Zap } from "@/components/ui/icons";
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
// ICONS — INFLUENCER & VIP COCKPIT (Clean, high-contrast, linear precision)
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
      <path d="M6.5 6.5l11 11M6.5 17.5l11-11M3 8l3-3m0 0l3 3M3 16l3 3m0 0l3-3m9-8l3-3m0 0l3 3m-3 11l3-3m0 0l3 3" />
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
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function ClipboardListIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  );
}

function HelpCircleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
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
  // 1. Definition of Late: canonical isLate boolean already computed server-side per timezone
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

  // 3. Quick Actions (Operação Rápida — Exactly matching Personal pattern of 6 items)
  const quickActions = [
    {
      href: `/consultoria/${consultancySlug}/missoes`,
      title: "Minhas Missões",
      description: "Entregas & diretrizes ativas",
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
    {
      href: `/consultoria/${consultancySlug}/missoes`,
      title: "Histórico de Entregas",
      description: "Registro de missões concluídas",
      badge: "Histórico",
      icon: ClipboardListIcon,
    },
    {
      href: `/consultoria/${consultancySlug}/ajuda`,
      title: "Diretrizes & Suporte",
      description: "Manual da marca e canal direto",
      badge: "Suporte",
      icon: HelpCircleIcon,
    },
  ];

  // 4. Hero Slides (Matching Personal stature and editorial weight)
  const firstName = getFirstName(userName);

  const influencerSlides: CarouselSlide[] = [
    {
      id: "vip-missions",
      tag: consultancyName ? `PARCERIA VIP • ${consultancyName.toUpperCase()}` : "PARCERIA OFICIAL VIP",
      tagColor: "brand",
      title: firstName
        ? `Olá, ${firstName} — Central de Parceria VIP`
        : "Central de Parceria & Missões VIP",
      description:
        "Cumpra suas diretrizes de divulgação, registre comprovações oficiais e acompanhe a aprovação das suas entregas.",
      ctaText: "Acessar missões",
      ctaHref: `/consultoria/${consultancySlug}/missoes`,
      imageUrl: "/images/personal/coach-cockpit.jpg",
      meta:
        typeof totalMissions === "number" && totalMissions > 0
          ? `${totalMissions} ${totalMissions === 1 ? "missão atribuída" : "missões atribuídas"}`
          : "Parceria VIP",
    },
    {
      id: "vip-training",
      tag: "PRESCRIÇÃO VIP",
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
      title: "Planejamento Nutricional VIP",
      description:
        "Consulte seu plano alimentar prescrito, horários e orientações nutricionais desenhadas para sua performance.",
      ctaText: "Ver cardápio",
      ctaHref: `/consultoria/${consultancySlug}/nutricao`,
      imageUrl: "/images/admin/workspace.jpg",
      meta: activeNutritionPlan?.title || "Nutrição VIP",
    },
    {
      id: "vip-progress",
      tag: "ACOMPANHAMENTO",
      tagColor: "blue",
      title: "Evolução & Resultados",
      description:
        "Acompanhe suas fotos comparativas, registros de peso corporal e histórico biométrico de forma sigilosa.",
      ctaText: "Acompanhar evolução",
      ctaHref: `/consultoria/${consultancySlug}/progresso`,
      imageUrl: "/images/student/hero-athlete.webp",
    },
  ];

  return (
    <div className="space-y-7 sm:space-y-9 overflow-x-clip">
      {/* ==================================================================== */}
      {/* 0. ALERTA DE MISSÃO ATRASADA (Se houver registro com isLate)         */}
      {/* ==================================================================== */}
      {lateMission && (
        <div className="p-4 sm:p-4.5 rounded-2xl border border-red-500/30 bg-red-500/5 dark:bg-red-950/20 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div className="flex items-start gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 mt-1.5 animate-pulse" />
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
              <Button variant="danger" size="sm" className="w-full sm:w-auto font-bold min-h-[42px]">
                Submeter missão →
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 1. HERO EDITORIAL PROTAGONISTA (NetflixFeatureCarousel)               */}
      {/* ==================================================================== */}
      <NetflixFeatureCarousel
        slides={influencerSlides}
        consultancySlug={consultancySlug}
        mobileCompact={true}
      />

      {/* ==================================================================== */}
      {/* 2. COCKPIT / RESUMO (Linha de 4 indicadores sempre visíveis)          */}
      {/* ==================================================================== */}
      <div className="space-y-2.5 sm:space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Cockpit de Missões
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-tertiary)]">
              Influenciador / VIP
            </span>
          </div>
          <span className="text-[11px] text-[var(--text-tertiary)] font-medium hidden sm:inline">
            Status consolidado de entregas
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {/* Ativas */}
          <div className="p-3 sm:p-4.5 rounded-xl sm:rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs flex flex-col justify-between space-y-1.5 sm:space-y-2.5 depth-surface">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Ativas
              </span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[var(--brand)]/10 text-[var(--brand)] flex items-center justify-center">
                <TargetIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div>
              <p className="font-heading text-xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
                {activeCount}
              </p>
              <p className="text-[10px] sm:text-[11px] text-[var(--text-tertiary)] mt-0.5 truncate">
                Em andamento ou pendentes
              </p>
            </div>
          </div>

          {/* Em Revisão */}
          <div className="p-3 sm:p-4.5 rounded-xl sm:rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs flex flex-col justify-between space-y-1.5 sm:space-y-2.5 depth-surface">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Em Revisão
              </span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center">
                <ClockIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div>
              <p className="font-heading text-xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
                {reviewCount}
              </p>
              <p className="text-[10px] sm:text-[11px] text-[var(--text-tertiary)] mt-0.5 truncate">
                Submetidas à consultoria
              </p>
            </div>
          </div>

          {/* Aprovadas */}
          <div className="p-3 sm:p-4.5 rounded-xl sm:rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs flex flex-col justify-between space-y-1.5 sm:space-y-2.5 depth-surface">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Aprovadas
              </span>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <CheckCircleIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div>
              <p className="font-heading text-xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
                {approvedCount}
              </p>
              <p className="text-[10px] sm:text-[11px] text-[var(--text-tertiary)] mt-0.5 truncate">
                Entregas aprovadas
              </p>
            </div>
          </div>

          {/* Urgentes */}
          <div
            className={`p-3 sm:p-4.5 rounded-xl sm:rounded-2xl border shadow-xs flex flex-col justify-between space-y-1.5 sm:space-y-2.5 depth-surface ${
              urgentCount > 0
                ? "border-rose-500/40 bg-rose-500/5 dark:bg-rose-950/15"
                : "border-[var(--border-default)] bg-[var(--surface)]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${
                  urgentCount > 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-[var(--text-secondary)]"
                }`}
              >
                Urgência
              </span>
              <div
                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center ${
                  urgentCount > 0
                    ? "bg-rose-500/15 text-rose-500"
                    : "bg-[var(--surface-subtle)] text-[var(--text-tertiary)]"
                }`}
              >
                <AlertTriangleIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div>
              <p
                className={`font-heading text-xl sm:text-3xl font-bold tracking-tight ${
                  urgentCount > 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-[var(--text-primary)]"
                }`}
              >
                {urgentCount}
              </p>
              <p className="text-[10px] sm:text-[11px] text-[var(--text-tertiary)] mt-0.5 truncate">
                {urgentCount > 0 ? "Atrasadas ou prioridade alta" : "Sem pendências críticas"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. OPERAÇÃO RÁPIDA (6 cards no padrão Personal com snap rail mobile)  */}
      {/* ==================================================================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            Operação Rápida
          </h2>
          <span className="text-[11px] text-[var(--text-tertiary)] font-medium hidden sm:inline">
            Atalhos diretos da parceria VIP
          </span>
        </div>

        <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none gap-3 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                href={action.href}
                className={`w-[74vw] max-w-[280px] shrink-0 sm:w-auto sm:max-w-none snap-center p-4 rounded-2xl border transition-all duration-150 flex items-center justify-between gap-3 group depth-interactive ${
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
                    <p className="text-xs text-[var(--text-secondary)] font-medium truncate">
                      {action.description}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-[var(--text-tertiary)] group-hover:text-[var(--brand)] group-hover:translate-x-0.5 transition-all">
                  <ChevronRightIcon className="w-4 h-4" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. SEÇÃO PRINCIPAL: MINHAS MISSÕES ATIVAS (Cards no padrão Personal) */}
      {/* ==================================================================== */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              Minhas Missões Ativas
            </h2>
            {missions && missions.length > 0 && (
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                ({missions.length})
              </span>
            )}
          </div>
          <Link
            href={`/consultoria/${consultancySlug}/missoes`}
            className="text-xs font-bold text-[var(--brand)] hover:underline flex items-center gap-1 min-h-[44px] sm:min-h-0 items-center"
          >
            <span>Ver todas</span>
            <span>→</span>
          </Link>
        </div>

        {missions && missions.length > 0 ? (
          <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none gap-4 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-2 sm:overflow-visible">
            {missions.map((mission) => {
              const isLate = mission.isLate;
              const isHigh = mission.priority === "HIGH";

              return (
                <div
                  key={mission.publicId}
                  className="w-[84vw] max-w-[380px] shrink-0 sm:w-auto sm:max-w-none snap-center p-5 sm:p-6 rounded-3xl bg-[var(--surface)] border border-[var(--border-default)] shadow-xs hover:border-[var(--brand)] transition-all flex flex-col justify-between space-y-4 depth-surface group"
                >
                  <div className="space-y-3">
                    {/* Top Row: Status Group + Priority */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <MissionStatusGroup status={mission.status} />
                      <div className="flex items-center gap-1.5">
                        {isLate && (
                          <Badge variant="danger" size="sm">
                            Atrasada
                          </Badge>
                        )}
                        <MissionPriorityBadge priority={mission.priority} />
                      </div>
                    </div>

                    {/* Mission Title & Summary */}
                    <div className="space-y-1">
                      <h3 className="font-heading text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors line-clamp-1">
                        {mission.title}
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                        {isHigh
                          ? "Entrega prioritária da consultoria. Registre comprovações em foto ou link para homologação."
                          : "Publique conforme as diretrizes oficiais e envie seu comprovante para análise."}
                      </p>
                    </div>
                  </div>

                  {/* Bottom Row: Due date metadata + Full-width CTA */}
                  <div className="space-y-3 pt-3 border-t border-[var(--border-subtle)]">
                    <div className="flex items-center justify-between gap-2 text-xs text-[var(--text-secondary)] font-medium">
                      <div className="flex items-center gap-1.5 truncate">
                        <ClockIcon className={`w-3.5 h-3.5 ${isLate ? "text-red-500" : "text-[var(--text-tertiary)]"}`} />
                        <span className={isLate ? "text-red-600 dark:text-red-400 font-semibold truncate" : "truncate"}>
                          Prazo: {mission.formattedDueAt || "Sem prazo definido"}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-[var(--text-tertiary)] shrink-0">
                        {mission.status === "SUBMITTED"
                          ? "Em revisão"
                          : mission.status === "APPROVED"
                          ? "Aprovada"
                          : "Pendente"}
                      </span>
                    </div>

                    <Link
                      href={`/consultoria/${consultancySlug}/missoes/${mission.publicId}`}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs text-[var(--text-inverse)] bg-[var(--brand)] hover:bg-[var(--brand-hover)] active:bg-[var(--brand-active)] shadow-xs transition-all min-h-[44px] depth-interactive cursor-pointer"
                    >
                      <span>Ver detalhes da missão</span>
                      <ArrowRightIcon className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 sm:p-10 rounded-3xl border border-[var(--border-default)] bg-[var(--surface)] text-center space-y-4 shadow-xs depth-surface">
            <div className="w-12 h-12 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto text-[var(--text-tertiary)]">
              <TargetIcon className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <p className="font-heading text-sm font-bold text-[var(--text-primary)]">
                Nenhuma missão pendente
              </p>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Suas metas e diretrizes de divulgação aparecerão aqui assim que atribuídas pela consultoria.
              </p>
            </div>
            <Link href={`/consultoria/${consultancySlug}/missoes`}>
              <Button variant="secondary" size="sm" className="font-semibold min-h-[44px]">
                Acessar histórico de missões →
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* 5. SEÇÃO SECUNDÁRIA: SEU ACOMPANHAMENTO VIP (3 cards maduros)         */}
      {/* ==================================================================== */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-heading text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            Seu Acompanhamento VIP
          </h2>
          <span className="text-[11px] text-[var(--text-tertiary)] font-medium hidden sm:inline">
            Acesso direto aos seus módulos de saúde e performance
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Treinos VIP */}
          <Link
            href={`/consultoria/${consultancySlug}/treinos`}
            className="p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs hover:border-[var(--brand-soft-border)] hover:bg-[var(--surface-hover)] hover:-translate-y-0.5 transition-all duration-150 group flex flex-col justify-between space-y-4 min-h-[145px] depth-surface focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                <WorkoutIcon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-tertiary)]">
                Prescrição VIP
              </span>
            </div>
            <div className="space-y-1 min-w-0">
              <h3 className="font-heading text-sm sm:text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                {activeTrainingPlan ? activeTrainingPlan.title : "Treinos Prescritos"}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] font-normal line-clamp-2 leading-relaxed">
                Rotinas estruturadas pelo seu treinador com exercícios, séries e cargas.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-[var(--brand)] pt-0.5">
              <span>Acessar treinos</span>
              <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* Nutrição VIP */}
          <Link
            href={`/consultoria/${consultancySlug}/nutricao`}
            className="p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs hover:border-[var(--brand-soft-border)] hover:bg-[var(--surface-hover)] hover:-translate-y-0.5 transition-all duration-150 group flex flex-col justify-between space-y-4 min-h-[145px] depth-surface focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
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
              <h3 className="font-heading text-sm sm:text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                {activeNutritionPlan ? activeNutritionPlan.title : "Plano Alimentar"}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] font-normal line-clamp-2 leading-relaxed">
                Refeições prescritas, horários, macros e diretrizes nutricionais.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-[var(--brand)] pt-0.5">
              <span>Ver nutrição</span>
              <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>

          {/* Evolução */}
          <Link
            href={`/consultoria/${consultancySlug}/progresso`}
            className="p-5 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] shadow-xs hover:border-[var(--brand-soft-border)] hover:bg-[var(--surface-hover)] hover:-translate-y-0.5 transition-all duration-150 group flex flex-col justify-between space-y-4 min-h-[145px] depth-surface focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500 shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                <ProgressIcon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-tertiary)]">
                Biometria VIP
              </span>
            </div>
            <div className="space-y-1 min-w-0">
              <h3 className="font-heading text-sm sm:text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                Evolução & Resultados
              </h3>
              <p className="text-xs text-[var(--text-secondary)] font-normal line-clamp-2 leading-relaxed">
                Histórico de medições corporais, registros de peso e fotos comparativas.
              </p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-[var(--brand)] pt-0.5">
              <span>Acompanhar evolução</span>
              <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 6. PROTOCOLO DE PARCERIA VIP (Card equivalente ao rodapé do Personal) */}
      {/* ==================================================================== */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Zap className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <h3 className="font-heading text-sm font-bold text-[var(--text-primary)]">
              Diretrizes & Comprovações Oficiais
            </h3>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-xl">
            Envie links e registros das suas publicações para acompanhamento da consultoria e manutenção ativa dos seus benefícios VIP.
          </p>
        </div>
        <div className="shrink-0 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
          Parceria VIP
        </div>
      </div>
    </div>
  );
}
