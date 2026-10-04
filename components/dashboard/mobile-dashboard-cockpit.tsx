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

      {/* 5. RESUMO / INDICADORES: Faixa operacional compacta em linha */}
      {metrics.length > 0 && (
        <div className="p-2.5 sm:p-3 rounded-xl bg-[var(--surface)] border border-[var(--border-default)] shadow-2xs flex items-center justify-around divide-x divide-[var(--border-subtle)]">
          {metrics.map((metric, idx) => (
            <Link
              key={idx}
              href={metric.href}
              className="flex items-center justify-center gap-2 px-2 py-1 flex-1 text-center min-h-[40px] hover:bg-[var(--surface-hover)] rounded-lg transition-colors group"
            >
              <span className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors">
                {metric.value}
              </span>
              <span className="text-xs text-[var(--text-secondary)] font-medium truncate">
                {metric.title}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* 6. ACESSOS RÁPIDOS: Lista nativa de software moderno (touch >= 48px, divisores sutis) */}
      <div className="space-y-1.5">
        <div className="px-1 flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">
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
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[var(--surface-subtle)] text-[var(--brand)] border border-[var(--border-subtle)]">
                      {action.badge}
                    </span>
                  )}
                </div>
                <div className="space-y-0.5 pt-2">
                  <span className="block text-xs font-bold text-[var(--text-primary)] leading-tight truncate">
                    {action.label}
                  </span>
                  {action.subtitle && (
                    <span className="block text-[10px] text-[var(--text-tertiary)] leading-tight truncate">
                      {action.subtitle}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-[var(--surface)] border border-[var(--border-default)] divide-y divide-[var(--border-subtle)] overflow-hidden shadow-2xs">
            {quickActions.map((action) => (
              <Link
                key={action.id}
                href={action.href}
                data-testid={`cockpit-action-${action.id}`}
                className="flex items-center justify-between px-3.5 py-3 min-h-[48px] hover:bg-[var(--surface-hover)] active:bg-[var(--surface-subtle)] transition-colors group select-none"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] group-hover:text-[var(--brand)] transition-colors shrink-0">
                    {action.icon}
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors leading-tight truncate">
                      {action.label}
                    </span>
                    {action.subtitle && (
                      <span className="block text-[10px] text-[var(--text-tertiary)] leading-tight truncate mt-0.5">
                        {action.subtitle}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {action.badge !== undefined && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--surface-subtle)] text-[var(--brand)] border border-[var(--border-subtle)]">
                      {action.badge}
                    </span>
                  )}
                  <svg
                    className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] group-hover:translate-x-0.5 transition-all"
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

      {/* 7. CONTEÚDO RECENTE: Lista limpa sem card-in-card */}
      {recentSection && (
        <div className="space-y-2 pt-1">
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
              className="text-xs font-semibold text-[var(--brand)] hover:underline min-h-[44px] flex items-center px-2 cursor-pointer"
            >
              Ver todos →
            </Link>
          </div>

          {recentSection.items.length > 0 ? (
            <div className="rounded-xl bg-[var(--surface)] border border-[var(--border-default)] divide-y divide-[var(--border-subtle)] overflow-hidden shadow-2xs">
              {recentSection.items.slice(0, 4).map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-center justify-between p-3.5 hover:bg-[var(--surface-hover)] active:bg-[var(--surface-subtle)] transition-colors group cursor-pointer"
                >
                  <div className="min-w-0 flex-1 space-y-0.5 pr-2">
                    <span className="block text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate">
                      {item.title}
                    </span>
                    {(item.subtitle || item.caption) && (
                      <span className="block text-[11px] text-[var(--text-tertiary)] truncate">
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
                  <Button variant="secondary" size="sm" className="font-semibold min-h-[44px]">
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
