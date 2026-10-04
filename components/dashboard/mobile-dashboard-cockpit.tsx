"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  MobileListItem,
  MobileSectionHeader,
  MobileEmptyState,
} from "@/components/ui/mobile";
import { DailyCheckinWidget } from "@/components/checkin/daily-checkin-widget";
import type { DailyCheckinRecord } from "@/lib/checkins/service";

// ============================================================================
// TYPES
// ============================================================================

export interface QuickActionItem {
  id: string;
  label: string;
  subtitle: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
  highlight?: boolean;
}

export interface MetricHighlightItem {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  href: string;
  icon?: React.ReactNode;
  trend?: string;
}

export interface MobileDashboardCockpitProps {
  role: "STUDENT" | "PERSONAL" | "NUTRITIONIST" | "ADMIN" | "INFLUENCER";
  consultancySlug: string;
  consultancyName?: string;
  userName?: string;
  urgentAlert?: React.ReactNode;
  quickActions: QuickActionItem[];
  heroActionCard?: React.ReactNode;
  metrics?: MetricHighlightItem[];
  recentSection?: {
    title: string;
    subtitle?: string;
    viewAllHref: string;
    items: Array<{
      id: string;
      title: string;
      subtitle?: string;
      caption?: string;
      href: string;
      statusBadge?: React.ReactNode;
    }>;
    emptyText?: string;
  };
  todayCheckin?: DailyCheckinRecord | null;
  className?: string;
}

function getFirstName(fullName?: string): string {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  return parts[0] || "";
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

const roleBadgeLabels: Record<string, string> = {
  STUDENT: "Aluno",
  PERSONAL: "Personal Trainer",
  NUTRITIONIST: "Nutricionista",
  ADMIN: "Administrador",
  INFLUENCER: "VIP / Parceiro",
};

export function MobileDashboardCockpit({
  role,
  consultancySlug,
  consultancyName,
  userName,
  urgentAlert,
  quickActions,
  heroActionCard,
  metrics = [],
  recentSection,
  todayCheckin,
  className = "",
}: MobileDashboardCockpitProps) {
  const firstName = getFirstName(userName);
  const greeting = getGreeting();
  const roleLabel = roleBadgeLabels[role] || "Membro";
  const [showAllMetrics, setShowAllMetrics] = useState(false);

  const displayedMetrics = showAllMetrics ? metrics : metrics.slice(0, 2);

  return (
    <div
      data-testid="mobile-dashboard-cockpit"
      className={`space-y-4 pb-6 select-none ${className}`.trim()}
    >
      {/* 1. COCKPIT HEADER */}
      <div className="space-y-1.5 pt-1 px-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[var(--brand)]/15 text-[var(--brand)] border border-[var(--brand)]/25">
              {roleLabel}
            </span>
            {consultancyName && (
              <span className="text-[11px] font-semibold text-[var(--text-tertiary)] truncate max-w-[180px]">
                {consultancyName}
              </span>
            )}
          </div>
        </div>

        <h1 className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight font-heading">
          {greeting}{firstName ? `, ${firstName}` : ""}
        </h1>
      </div>

      {/* 2. URGENT / PRIORITY ALERT (Anamnese, Avaliação pendente, Carência) */}
      {urgentAlert && (
        <div data-testid="cockpit-urgent-alert" className="animate-in fade-in duration-200">
          {urgentAlert}
        </div>
      )}

      {/* 3. DAILY CHECKIN (Para Aluno) */}
      {role === "STUDENT" && todayCheckin !== undefined && (
        <div className="py-0.5">
          <DailyCheckinWidget
            consultancySlug={consultancySlug}
            todayCheckin={todayCheckin}
          />
        </div>
      )}

      {/* 4. HERO FOCUS CARD (O que fazer agora) */}
      {heroActionCard && (
        <div data-testid="cockpit-hero-focus" className="animate-in fade-in duration-150">
          {heroActionCard}
        </div>
      )}

      {/* 5. QUICK ACTIONS (Atalhos do Cockpit em cards grandes >= 64px) */}
      <div className="space-y-2">
        <MobileSectionHeader
          title="Atalhos Rápidos"
        />

        <div className="grid grid-cols-2 gap-2.5">
          {quickActions.map((action) => (
            <Link
              key={action.id}
              href={action.href}
              data-testid={`cockpit-action-${action.id}`}
              className={`p-3.5 rounded-xl border transition-all duration-150 flex flex-col justify-between min-h-[72px] active:scale-[0.98] select-none ${
                action.highlight
                  ? "bg-[var(--brand)]/10 border-[var(--brand)]/30 hover:border-[var(--brand)]"
                  : "bg-[var(--surface)] border-[var(--border-default)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] shadow-2xs"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    action.highlight
                      ? "bg-[var(--brand)] text-[var(--text-inverse)]"
                      : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                  }`}
                >
                  {action.icon}
                </div>
                {action.badge !== undefined && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[var(--surface-subtle)] text-[var(--brand)] border border-[var(--border-subtle)]">
                    {action.badge}
                  </span>
                )}
              </div>

              <div className="space-y-0.5 pt-2">
                <span className="block text-xs font-bold text-[var(--text-primary)] leading-tight truncate">
                  {action.label}
                </span>
                <span className="block text-[10px] text-[var(--text-tertiary)] leading-tight truncate">
                  {action.subtitle}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 6. KEY METRICS HIGHLIGHTS (Resumo sem poluição visual) */}
      {metrics.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] tracking-tight">
              Indicadores Principais
            </h2>
            {metrics.length > 2 && (
              <button
                type="button"
                onClick={() => setShowAllMetrics((prev) => !prev)}
                className="text-[11px] font-bold text-[var(--brand)] hover:underline min-h-[36px] flex items-center px-1"
              >
                {showAllMetrics ? "Mostrar menos" : `Ver todos (${metrics.length})`}
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {displayedMetrics.map((metric, idx) => (
              <Link
                key={idx}
                href={metric.href}
                className="p-3.5 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] hover:border-[var(--border-strong)] active:scale-[0.98] transition-all duration-150 flex flex-col justify-between min-h-[72px] shadow-2xs group"
              >
                <div className="flex items-center justify-between gap-1 text-[11px] font-semibold text-[var(--text-secondary)]">
                  <span className="truncate">{metric.title}</span>
                  {metric.icon && <span className="shrink-0">{metric.icon}</span>}
                </div>
                <div className="space-y-0.5 pt-1.5">
                  <div className="text-lg font-extrabold text-[var(--text-primary)] tracking-tight truncate">
                    {metric.value}
                  </div>
                  {metric.subtitle && (
                    <div className="text-[10px] text-[var(--text-tertiary)] truncate">
                      {metric.subtitle}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 7. RECENT SECTION (Fichas, Alunos ou Planos Recentes) */}
      {recentSection && (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between px-1">
            <div className="space-y-0.5">
              <h2 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] tracking-tight">
                {recentSection.title}
              </h2>
              {recentSection.subtitle && (
                <p className="text-[11px] text-[var(--text-tertiary)]">
                  {recentSection.subtitle}
                </p>
              )}
            </div>
            <Link
              href={recentSection.viewAllHref}
              className="text-xs font-bold text-[var(--brand)] hover:underline min-h-[44px] flex items-center px-2 cursor-pointer"
            >
              Ver todos →
            </Link>
          </div>

          {recentSection.items.length > 0 ? (
            <div className="space-y-2">
              {recentSection.items.slice(0, 4).map((item) => (
                <MobileListItem
                  key={item.id}
                  title={item.title}
                  subtitle={item.subtitle}
                  caption={item.caption}
                  href={item.href}
                  trailing={item.statusBadge}
                />
              ))}
            </div>
          ) : (
            <MobileEmptyState
              title={recentSection.title}
              description={recentSection.emptyText || "Nenhum item recente encontrado."}
              action={
                <Link href={recentSection.viewAllHref}>
                  <Button variant="secondary" size="sm" className="font-bold min-h-[44px]">
                    Explorar
                  </Button>
                </Link>
              }
            />
          )}
        </div>
      )}
    </div>
  );
}
