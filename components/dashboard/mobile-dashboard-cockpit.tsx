"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DailyCheckinWidget } from "@/components/checkin/daily-checkin-widget";
import { MobileEmptyState } from "@/components/ui/mobile";
import type { DailyCheckinRecord } from "@/lib/checkins/service";

export interface QuickActionItem {
  id: string;
  label: string;
  subtitle?: string;
  href: string;
  icon: React.ReactNode;
  badge?: number | string;
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
  actionLayout?: "list" | "grid";
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
  actionLayout = "list",
  recentSection,
  todayCheckin,
  className = "",
}: MobileDashboardCockpitProps) {
  const firstName = getFirstName(userName);
  const greeting = getGreeting();
  const roleLabel = roleBadgeLabels[role] || "Membro";

  return (
    <div
      data-testid="mobile-dashboard-cockpit"
      className={`space-y-4 pb-6 select-none ${className}`.trim()}
    >
      {/* 1. COCKPIT HEADER: Saudação e contexto direto sem camadas redundantes */}
      <div className="pt-1 px-1 flex items-baseline justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">
          {greeting}{firstName ? `, ${firstName}` : ""}
        </h1>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs text-[var(--text-tertiary)] font-medium">
            {roleLabel}
          </span>
          {consultancyName && (
            <>
              <span className="text-xs text-[var(--text-muted)]">•</span>
              <span className="text-xs text-[var(--text-tertiary)] font-medium truncate max-w-[120px]">
                {consultancyName}
              </span>
            </>
          )}
        </div>
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

      {/* 4. HERO FOCUS CARD: Ação principal focada e limpa */}
      {heroActionCard && (
        <div data-testid="cockpit-hero-focus" className="animate-in fade-in duration-150">
          {heroActionCard}
        </div>
      )}

      {/* 5. RESUMO / INDICADORES: Faixa operacional leve inline (NÍVEL 2 — Telemetria) */}
      {metrics.length > 0 && (
        <div className="py-2.5 px-3 rounded-xl bg-[var(--surface-subtle)]/60 border border-[var(--border-subtle)] flex items-center justify-around divide-x divide-[var(--border-subtle)]">
          {metrics.map((metric, idx) => (
            <Link
              key={idx}
              href={metric.href}
              className="flex items-center justify-center gap-2 px-3 py-1 flex-1 text-center min-h-[38px] hover:text-[var(--brand)] transition-colors group"
            >
              <span className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors font-sans tabular-nums">
                {metric.value}
              </span>
              <span className="text-xs text-[var(--text-secondary)] font-medium truncate font-sans">
                {metric.title}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* 6. CONTEÚDO RECENTE: Lista operacional com destaque e surface próprio (NÍVEL 2 — Conteúdo) */}
      {recentSection && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between px-1">
            <div className="space-y-0.5">
              <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)] tracking-tight font-sans">
                {recentSection.title}
              </h2>
              {recentSection.subtitle && (
                <p className="text-[11px] text-[var(--text-tertiary)] font-sans">
                  {recentSection.subtitle}
                </p>
              )}
            </div>
            <Link
              href={recentSection.viewAllHref}
              className="text-xs font-semibold text-[var(--brand)] hover:underline min-h-[44px] flex items-center px-1 cursor-pointer font-sans"
            >
              Ver todos →
            </Link>
          </div>

          {recentSection.items.length > 0 ? (
            <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] divide-y divide-[var(--border-subtle)] overflow-hidden shadow-2xs">
              {recentSection.items.slice(0, 4).map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-center justify-between p-3.5 hover:bg-[var(--surface-hover)] active:bg-[var(--surface-subtle)] transition-colors group cursor-pointer"
                >
                  <div className="min-w-0 flex-1 space-y-0.5 pr-2">
                    <span className="block text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate font-sans">
                      {item.title}
                    </span>
                    {(item.subtitle || item.caption) && (
                      <span className="block text-[11px] text-[var(--text-tertiary)] truncate font-sans">
                        {item.subtitle || item.caption}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.statusBadge}
                    <svg
                      className="w-3.5 h-3.5 text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] group-hover:translate-x-0.5 transition-all"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <MobileEmptyState
              title={recentSection.title}
              description={recentSection.emptyText || "Nenhum item recente encontrado."}
              action={
                <Link href={recentSection.viewAllHref}>
                  <Button variant="secondary" size="sm" className="font-semibold min-h-[44px] font-sans">
                    Explorar
                  </Button>
                </Link>
              }
            />
          )}
        </div>
      )}

      {/* 7. ACESSOS RÁPIDOS: Navegação secundária leve (NÍVEL 3 — Atalhos auxiliares) */}
      <div className="space-y-1 pt-1">
        <div className="px-1 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] font-sans">
            Acesso rápido
          </span>
        </div>

        {actionLayout === "grid" ? (
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
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[var(--surface-subtle)] text-[var(--brand)] border border-[var(--border-subtle)] font-sans">
                      {action.badge}
                    </span>
                  )}
                </div>
                <div className="space-y-0.5 pt-2">
                  <span className="block text-xs font-bold text-[var(--text-primary)] leading-tight truncate font-sans">
                    {action.label}
                  </span>
                  {action.subtitle && (
                    <span className="block text-[10px] text-[var(--text-tertiary)] leading-tight truncate font-sans">
                      {action.subtitle}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]/70">
            {quickActions.map((action) => (
              <Link
                key={action.id}
                href={action.href}
                data-testid={`cockpit-action-${action.id}`}
                className="flex items-center justify-between py-2.5 px-1 min-h-[46px] hover:text-[var(--brand)] active:bg-[var(--surface-subtle)]/40 rounded-lg transition-colors group select-none"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-md bg-[var(--surface-subtle)]/80 flex items-center justify-center text-[var(--text-secondary)] group-hover:text-[var(--brand)] transition-colors shrink-0">
                    {action.icon}
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs font-medium text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate font-sans">
                      {action.label}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {action.subtitle && (
                    <span className="text-[11px] text-[var(--text-tertiary)] hidden xs:inline font-sans">
                      {action.subtitle}
                    </span>
                  )}
                  {action.badge !== undefined && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--surface-subtle)] text-[var(--brand)] border border-[var(--border-subtle)] font-sans">
                      {action.badge}
                    </span>
                  )}
                  <svg
                    className="w-3.5 h-3.5 text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] group-hover:translate-x-0.5 transition-all"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
