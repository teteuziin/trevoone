"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export interface NutritionistPlanSummaryItem {
  publicId: string;
  title: string;
  studentName?: string | null;
  subtitle?: string | null;
  status: "ACTIVE" | "ARCHIVED" | "DRAFT" | "PUBLISHED" | string;
  planLifecycleStatus?: string;
  currentVersionStatus?: string;
  hasDraftRevision?: boolean;
  versionNumber?: number;
  updatedAt?: Date | string;
  mealsCount?: number;
}

export type NutritionPlanSummaryItem = NutritionistPlanSummaryItem;

export interface AttentionItem {
  id: string;
  patientName: string;
  reason: string;
  actionLabel: string;
  actionHref: string;
  severity?: "warning" | "danger" | "neutral";
}

export interface TodayConsultationItem {
  publicId: string;
  patientName: string;
  timeFormatted: string;
  status: string;
  statusLabel: string;
  canJoinNow?: boolean;
  href: string;
}

export interface DashboardNutritionistViewProps {
  consultancySlug: string;
  userName?: string;
  timezone?: string;
  recentPlans?: NutritionistPlanSummaryItem[];
  totalPlans?: number;
  activePlansCount?: number | null;
  draftPlansCount?: number | null;
  totalStudents?: number | null;
  todayConsultations?: TodayConsultationItem[] | null;
  nextConsultation?: TodayConsultationItem | null;
  attentionItems?: AttentionItem[] | null;
  hideRoleBadge?: boolean;
}

import {
  isPlanActive,
  isPlanDraft,
  getPlanCanonicalStatus,
} from "@/lib/nutrition-v2/plan-classification";

function getGreeting(date: Date = new Date(), timeZone: string = "America/Sao_Paulo"): string {
  try {
    const hourStr = new Intl.DateTimeFormat("pt-BR", {
      hour: "numeric",
      hour12: false,
      timeZone,
    }).format(date);
    const hour = parseInt(hourStr, 10);
    if (hour >= 5 && hour < 12) return "Bom dia";
    if (hour >= 12 && hour < 18) return "Boa tarde";
    return "Boa noite";
  } catch {
    const hour = date.getHours();
    if (hour >= 5 && hour < 12) return "Bom dia";
    if (hour >= 12 && hour < 18) return "Boa tarde";
    return "Boa noite";
  }
}

function getFirstName(fullName?: string): string {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  return parts[0] || "";
}

function formatDateExtenso(date: Date = new Date(), timeZone: string = "America/Sao_Paulo"): string {
  try {
    const formatted = date.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone,
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  } catch {
    return "";
  }
}

function formatDateShort(val?: Date | string | null): string {
  if (!val) return "—";
  try {
    const d = typeof val === "string" ? new Date(val) : val;
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
}

function BellIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ImportIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function CalendarIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function AlertTriangleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function ArrowRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

export function DashboardNutritionistView({
  consultancySlug,
  userName = "",
  timezone = "America/Sao_Paulo",
  recentPlans = [],
  totalPlans = 0,
  activePlansCount,
  draftPlansCount,
  totalStudents,
  todayConsultations = null,
  nextConsultation,
  attentionItems = null,
}: DashboardNutritionistViewProps) {
  const currentDate = new Date();
  const firstName = getFirstName(userName);
  const greeting = getGreeting(currentDate, timezone);
  const dateExtenso = formatDateExtenso(currentDate, timezone);

  // Derived counts strictly respecting UNKNOWN != ZERO (sem fallback para totalPlans)
  const displayPatients =
    totalStudents !== undefined && totalStudents !== null ? totalStudents : "—";
  const displayActivePlans =
    activePlansCount !== undefined && activePlansCount !== null ? activePlansCount : "—";
  const displayDraftPlans =
    draftPlansCount !== undefined && draftPlansCount !== null ? draftPlansCount : "—";
  const displayTodayConsultations =
    todayConsultations !== undefined && todayConsultations !== null
      ? todayConsultations.length
      : "—";

  // Derive attention items: se attentionItems for explicitamente null, a fonte falhou e não inventa dados
  const derivedAttentionItems: AttentionItem[] =
    attentionItems === null
      ? []
      : attentionItems !== undefined && attentionItems.length > 0
      ? attentionItems.slice(0, 5)
      : recentPlans
          .filter((p) => {
            const lc = p.planLifecycleStatus || p.status;
            if (lc === "ENDED" || lc === "ARCHIVED") return false;
            return isPlanDraft(p) || (isPlanActive(p) && p.currentVersionStatus === "DRAFT");
          })
          .slice(0, 5)
          .map((p) => {
            const canonical = getPlanCanonicalStatus(p);
            const reason = isPlanActive(p)
              ? canonical.subLabel || `Nova versão em rascunho (V${p.versionNumber || 2})`
              : `Rascunho não publicado${p.versionNumber ? ` (V${p.versionNumber})` : ""}`;
            return {
              id: `draft-${p.publicId}`,
              patientName: p.studentName || "Plano individual",
              reason,
              actionLabel: "Continuar edição",
              actionHref: `/consultoria/${consultancySlug}/planos-v2/${p.publicId}`,
              severity: "warning",
            };
          });

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-150">
      {/* =========================================================================
          MOBILE VIEW (< 768px)
          - Saudação + sino
          - Próxima consulta
          - "Precisa de atenção" (máx 5)
          - Botão "Novo plano" UMA vez
          - Planos recentes (3)
          - 1 coluna, alvos >= 44px
          ========================================================================= */}
      <div className="md:hidden space-y-5 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] overflow-x-hidden">
        {/* 1. Header Mobile: Saudação + Sino */}
        <div className="pt-1 px-1 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-extrabold text-[var(--text-primary)] font-sans truncate">
              {greeting}{firstName ? `, ${firstName}` : ""}
            </h1>
            <p className="text-sm text-[var(--text-secondary)] font-medium font-sans">
              {dateExtenso}
            </p>
          </div>
          <Link
            href={`/consultoria/${consultancySlug}/atividades`}
            aria-label="Ver atividades e notificações"
            className="w-11 h-11 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] transition-colors shrink-0"
          >
            <BellIcon className="w-5 h-5" />
          </Link>
        </div>

        {/* 2. Próxima Consulta */}
        <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-[var(--text-secondary)]" />
              <h2 className="text-sm font-bold text-[var(--text-secondary)] font-sans">
                Próxima consulta
              </h2>
            </div>
            <Link
              href={`/consultoria/${consultancySlug}/consultas`}
              className="text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline font-sans"
            >
              Agenda →
            </Link>
          </div>

          {todayConsultations === null && !nextConsultation ? (
            <p className="text-sm text-[var(--text-secondary)] font-medium font-sans py-1">
              Não foi possível verificar as consultas agendadas.
            </p>
          ) : nextConsultation ? (
            <div className="pt-1 flex flex-col gap-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-base font-bold text-[var(--text-primary)] font-sans truncate">
                    {nextConsultation.patientName}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)] font-medium font-sans">
                    {nextConsultation.timeFormatted}
                  </p>
                </div>
                <span className="text-sm font-medium px-2.5 py-0.5 rounded-full bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)] font-sans shrink-0">
                  {nextConsultation.statusLabel}
                </span>
              </div>
              <Link
                href={nextConsultation.href}
                className="w-full min-h-[44px] rounded-xl font-bold text-sm bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] text-[var(--text-primary)] flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] transition-all font-sans cursor-pointer active:scale-[0.99]"
              >
                <span>Abrir consulta</span>
                <ArrowRightIcon className="w-4 h-4 text-[var(--text-secondary)]" />
              </Link>
            </div>
          ) : (
            <p className="text-sm text-[var(--text-secondary)] font-medium font-sans py-1">
              Nenhuma consulta agendada para hoje.
            </p>
          )}
        </div>

        {/* 3. Bloco "Precisa de atenção" (máx 5) */}
        {attentionItems === null ? (
          <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] p-4 text-center">
            <p className="text-sm text-[var(--text-secondary)] font-medium font-sans">
              Não foi possível verificar pacientes que precisam de atenção.
            </p>
          </div>
        ) : derivedAttentionItems.length > 0 ? (
          <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] overflow-hidden">
            <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" aria-hidden="true" />
                <h2 className="text-sm font-bold text-[var(--text-primary)] font-sans">
                  Precisa de atenção
                </h2>
                <span className="text-sm font-medium px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-sans">
                  {derivedAttentionItems.length}
                </span>
              </div>
              <Link
                href={`/consultoria/${consultancySlug}/planos-v2`}
                className="text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline font-sans"
              >
                Ver todos
              </Link>
            </div>

            <div className="divide-y divide-[var(--border-subtle)]">
              {derivedAttentionItems.map((item) => (
                <div key={item.id} className="p-4 flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[var(--text-primary)] font-sans truncate">
                        {item.patientName}
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-400 font-medium font-sans flex items-center gap-1.5 mt-0.5">
                        <AlertTriangleIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{item.reason}</span>
                      </p>
                    </div>
                  </div>
                  <Link
                    href={item.actionHref}
                    className="w-full min-h-[44px] rounded-xl font-bold text-sm bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] text-[var(--text-primary)] flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] transition-all font-sans cursor-pointer active:scale-[0.99]"
                  >
                    <span>{item.actionLabel}</span>
                    <ArrowRightIcon className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* 4. Botão "Novo plano" UMA ÚNICA VEZ */}
        <div className="pt-1">
          <Link
            href={`/consultoria/${consultancySlug}/planos-v2/novo`}
            className="w-full min-h-[48px] rounded-xl font-bold text-sm bg-[var(--brand)] hover:brightness-105 active:scale-[0.98] text-[var(--text-inverse)] flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] transition-all font-sans cursor-pointer"
          >
            <PlusIcon className="w-4 h-4" />
            <span>+ Novo plano alimentar</span>
          </Link>
        </div>

        {/* 5. Planos alimentares recentes (3) */}
        <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] overflow-hidden space-y-0">
          <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-[var(--text-primary)] font-sans">
              Planos alimentares recentes
            </h2>
            <Link
              href={`/consultoria/${consultancySlug}/planos-v2`}
              className="text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline font-sans"
            >
              Ver todos ({totalPlans})
            </Link>
          </div>

          {recentPlans && recentPlans.length > 0 ? (
            <div className="divide-y divide-[var(--border-subtle)]">
              {recentPlans.slice(0, 3).map((plan) => {
                const canonicalStatus = getPlanCanonicalStatus(plan);

                return (
                  <Link
                    key={`mobile-${plan.publicId}`}
                    href={`/consultoria/${consultancySlug}/planos-v2/${plan.publicId}`}
                    className="p-4 min-h-[48px] flex flex-col gap-1.5 hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] transition-colors group cursor-pointer"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-bold text-[var(--text-primary)] font-sans truncate">
                        {plan.studentName || plan.title}
                      </p>
                      <span
                        className={`text-sm font-medium px-2.5 py-0.5 rounded-full border shrink-0 font-sans ${
                          canonicalStatus.isDraft
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                            : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)]"
                        }`}
                      >
                        {canonicalStatus.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-sm text-[var(--text-secondary)] font-medium font-sans">
                      <span className="truncate">
                        {plan.studentName ? plan.title : plan.subtitle || "Plano alimentar"}
                      </span>
                      <span className="shrink-0 ml-2">
                        {formatDateShort(plan.updatedAt)}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center text-sm text-[var(--text-secondary)] font-medium font-sans">
              Nenhum plano alimentar cadastrado ainda.
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          DESKTOP VIEW (>= 768px)
          - Um único cabeçalho: Saudação + data por extenso + [Importar plano] [+ Novo plano]
          - Faixa de 4 números reais: Pacientes ativos, Planos ativos, Rascunhos, Consultas hoje
          - Bloco "Precisa de atenção": plano terminando, paciente sem plano ativo, rascunho não publicado
          - Bloco "Hoje": consultas do dia (horário, paciente, abrir)
          - "Planos recentes": paciente, nome do plano, status textual, data de edição (linha inteira clicável)
          - Sem "Recursos rápidos"
          ========================================================================= */}
      <div className="hidden md:block space-y-6 w-full animate-in fade-in duration-150">
        {/* 1. Um único cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-2 border-b border-[var(--border-subtle)] pb-5">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] font-sans">
              {greeting}{firstName ? `, ${firstName}` : ""}
            </h1>
            <p className="text-sm text-[var(--text-secondary)] font-medium font-sans">
              {dateExtenso}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link href={`/consultoria/${consultancySlug}/planos-v2`}>
              <Button
                variant="secondary"
                size="md"
                className="font-semibold text-sm rounded-xl px-4 min-h-[44px] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] transition-all font-sans cursor-pointer"
              >
                <ImportIcon className="w-4 h-4 mr-2 text-[var(--text-secondary)]" />
                <span>Importar plano</span>
              </Button>
            </Link>
            <Link href={`/consultoria/${consultancySlug}/planos-v2/novo`}>
              <Button
                variant="primary"
                size="md"
                className="font-bold text-sm rounded-xl px-5 min-h-[44px] hover:brightness-105 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] transition-all font-sans bg-[var(--brand)] text-[var(--text-inverse)] cursor-pointer"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                <span>+ Novo plano</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* 2. Faixa de 4 números reais (Nenhum rótulo no lugar de número) */}
        <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)] overflow-hidden">
          <Link
            href={`/consultoria/${consultancySlug}/progresso/alunos`}
            className="p-5 sm:p-6 hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] transition-colors group flex flex-col justify-center cursor-pointer"
          >
            <span className="text-sm text-[var(--text-secondary)] font-medium font-sans">
              Pacientes ativos
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] transition-colors font-sans tabular-nums mt-1.5">
              {displayPatients}
            </span>
          </Link>

          <Link
            href={`/consultoria/${consultancySlug}/planos-v2`}
            className="p-5 sm:p-6 hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] transition-colors group flex flex-col justify-center cursor-pointer"
          >
            <span className="text-sm text-[var(--text-secondary)] font-medium font-sans">
              Planos ativos
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] transition-colors font-sans tabular-nums mt-1.5">
              {displayActivePlans}
            </span>
          </Link>

          <Link
            href={`/consultoria/${consultancySlug}/planos-v2`}
            className="p-5 sm:p-6 hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] transition-colors group flex flex-col justify-center cursor-pointer"
          >
            <span className="text-sm text-[var(--text-secondary)] font-medium font-sans">
              Rascunhos
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] transition-colors font-sans tabular-nums mt-1.5">
              {displayDraftPlans}
            </span>
          </Link>

          <Link
            href={`/consultoria/${consultancySlug}/consultas`}
            className="p-5 sm:p-6 hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] transition-colors group flex flex-col justify-center cursor-pointer"
          >
            <span className="text-sm text-[var(--text-secondary)] font-medium font-sans">
              Consultas hoje
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] transition-colors font-sans tabular-nums mt-1.5">
              {displayTodayConsultations}
            </span>
          </Link>
        </div>

        {/* 3. Grid Principal: Atenção + Planos Recentes (75%) e Hoje (25%) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Coluna Esquerda (8 cols): Precisa de atenção & Planos alimentares recentes */}
          <div className="lg:col-span-8 space-y-6">
            {/* Bloco "Precisa de atenção" */}
            <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] overflow-hidden">
              <div className="p-4 sm:px-5 sm:py-4 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" aria-hidden="true" />
                  <h2 className="text-base font-bold text-[var(--text-primary)] font-sans">
                    Precisa de atenção
                  </h2>
                  {derivedAttentionItems.length > 0 && (
                    <span className="text-sm font-medium px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-sans">
                      {derivedAttentionItems.length}
                    </span>
                  )}
                </div>
                <Link
                  href={`/consultoria/${consultancySlug}/planos-v2`}
                  className="text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline font-sans cursor-pointer"
                >
                  Ver todos →
                </Link>
              </div>

              {attentionItems === null ? (
                <div className="p-8 text-center space-y-1">
                  <p className="text-sm font-semibold text-[var(--text-primary)] font-sans">
                    Não foi possível verificar
                  </p>
                  <p className="text-sm text-[var(--text-secondary)] font-medium font-sans">
                    Não foi possível carregar os pacientes que precisam de atenção.
                  </p>
                </div>
              ) : derivedAttentionItems.length > 0 ? (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {derivedAttentionItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--surface-hover)] transition-colors"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-sm sm:text-base font-bold text-[var(--text-primary)] font-sans truncate">
                          {item.patientName}
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-400 font-medium font-sans flex items-center gap-1.5">
                          <AlertTriangleIcon className="w-4 h-4 shrink-0" />
                          <span>{item.reason}</span>
                        </p>
                      </div>
                      <Link href={item.actionHref} className="shrink-0">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="font-bold text-sm rounded-xl min-h-[44px] px-4 hover:bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] transition-all font-sans cursor-pointer"
                        >
                          <span>{item.actionLabel}</span>
                          <ArrowRightIcon className="w-3.5 h-3.5 ml-1.5" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center space-y-1">
                  <p className="text-sm font-semibold text-[var(--text-primary)] font-sans">
                    Tudo em dia!
                  </p>
                  <p className="text-sm text-[var(--text-secondary)] font-medium font-sans">
                    Nenhum paciente ou plano alimentar requer sua atenção no momento.
                  </p>
                </div>
              )}
            </div>

            {/* Bloco "Planos recentes" (Linha inteira clicável) */}
            <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] overflow-hidden">
              <div className="p-4 sm:px-5 sm:py-4 border-b border-[var(--border-subtle)] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-[var(--text-primary)] font-sans">
                    Planos alimentares recentes
                  </h2>
                  <span className="text-sm text-[var(--text-secondary)] font-medium font-sans">
                    ({totalPlans})
                  </span>
                </div>
                <Link
                  href={`/consultoria/${consultancySlug}/planos-v2`}
                  className="text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline font-sans cursor-pointer"
                >
                  Ver todos os planos alimentares →
                </Link>
              </div>

              {recentPlans && recentPlans.length > 0 ? (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {recentPlans.slice(0, 6).map((plan) => {
                    const canonicalStatus = getPlanCanonicalStatus(plan);

                    return (
                      <Link
                        key={plan.publicId}
                        href={`/consultoria/${consultancySlug}/planos-v2/${plan.publicId}`}
                        className="flex items-center justify-between p-4 sm:px-5 hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] transition-colors group cursor-pointer"
                      >
                        <div className="min-w-0 flex-1 space-y-1 pr-4">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-sm sm:text-base font-bold text-[var(--text-primary)] transition-colors truncate font-sans">
                              {plan.studentName || plan.title}
                            </span>
                            <span
                              className={`text-sm font-medium px-2.5 py-0.5 rounded-full border font-sans shrink-0 ${
                                canonicalStatus.isDraft
                                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                                  : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)]"
                              }`}
                            >
                              {canonicalStatus.label}
                            </span>
                            {canonicalStatus.subLabel && (
                              <span className="text-sm text-amber-700 dark:text-amber-400 font-medium font-sans">
                                • {canonicalStatus.subLabel}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] font-medium font-sans flex-wrap">
                            <span className="truncate">
                              {plan.studentName ? plan.title : plan.subtitle || "Plano alimentar"}
                            </span>
                            {plan.mealsCount ? (
                              <>
                                <span>•</span>
                                <span>{plan.mealsCount} refeições</span>
                              </>
                            ) : null}
                            <span>•</span>
                            <span>Atualizado em {formatDateShort(plan.updatedAt)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-all">
                          <span className="text-sm font-semibold hover:underline font-sans">Editar</span>
                          <ArrowRightIcon className="w-4 h-4" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center space-y-3">
                  <p className="text-sm text-[var(--text-secondary)] font-medium font-sans">
                    Nenhum plano alimentar cadastrado ainda.
                  </p>
                  <Link href={`/consultoria/${consultancySlug}/planos-v2/novo`}>
                    <Button
                      variant="primary"
                      size="sm"
                      className="font-bold text-sm rounded-xl min-h-[44px] px-4 bg-[var(--brand)] text-[var(--text-inverse)] font-sans"
                    >
                      + Criar primeiro plano alimentar
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Coluna Direita (4 cols): Bloco "Hoje" (Consultas do dia) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] overflow-hidden">
              <div className="p-4 sm:px-5 sm:py-4 border-b border-[var(--border-subtle)] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-[var(--text-secondary)]" />
                  <h2 className="text-base font-bold text-[var(--text-primary)] font-sans">
                    Hoje
                  </h2>
                </div>
                <Link
                  href={`/consultoria/${consultancySlug}/consultas`}
                  className="text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline font-sans cursor-pointer"
                >
                  Ver agenda →
                </Link>
              </div>

              {todayConsultations === null ? (
                <div className="p-8 text-center space-y-2">
                  <p className="text-sm font-medium text-[var(--text-secondary)] font-sans">
                    Não foi possível verificar as consultas de hoje.
                  </p>
                </div>
              ) : todayConsultations.length > 0 ? (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {todayConsultations.map((item) => (
                    <div
                      key={item.publicId}
                      className="p-4 sm:px-5 flex flex-col gap-2.5 hover:bg-[var(--surface-hover)] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-bold text-[var(--text-primary)] font-sans truncate">
                            {item.patientName}
                          </p>
                          <p className="text-sm font-semibold text-[var(--text-secondary)] font-sans mt-0.5">
                            {item.timeFormatted}
                          </p>
                        </div>
                        <span className="text-sm font-medium px-2.5 py-0.5 rounded-full bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-secondary)] font-sans shrink-0">
                          {item.statusLabel}
                        </span>
                      </div>
                      <Link href={item.href} className="w-full">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full font-bold text-sm rounded-xl min-h-[44px] hover:bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] transition-all font-sans cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <span>Abrir consulta</span>
                          <ArrowRightIcon className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center space-y-2">
                  <p className="text-sm font-medium text-[var(--text-secondary)] font-sans">
                    Nenhuma consulta agendada para hoje.
                  </p>
                  <Link
                    href={`/consultoria/${consultancySlug}/consultas`}
                    className="inline-block text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline font-sans cursor-pointer pt-1"
                  >
                    Ver agenda completa →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
