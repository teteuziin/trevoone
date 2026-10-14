"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// MobileDashboardCockpit responsive layout architecture (mobile-first cockpit composition)

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
  consultancyName?: string;
  userName?: string;
  recentPlans?: PersonalWorkoutSummaryItem[];
  totalPlans?: number;
  totalStudents?: number | null;
  hideRoleBadge?: boolean;
}

function getGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

function getFirstName(fullName?: string): string {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  return parts[0] || "";
}

export function DashboardPersonalView({
  consultancySlug,
  consultancyName,
  userName = "",
  recentPlans = [],
  totalPlans = 0,
  totalStudents,
  hideRoleBadge = false,
}: DashboardPersonalViewProps) {
  const firstName = getFirstName(userName);
  const greeting = getGreeting();

  // UNKNOWN != ZERO: if undefined or null, render "—"
  const displayStudents =
    totalStudents !== undefined && totalStudents !== null ? totalStudents : "—";
  const displayPlans =
    totalPlans !== undefined && totalPlans !== null ? totalPlans : "—";

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* MOBILE NATIVE COMPOSITION (< 768px)                                */}
      {/* ------------------------------------------------------------------ */}
      <div
        data-testid="personal-mobile-view"
        className="block md:hidden space-y-4 w-full pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]"
      >
        {/* 1. Cabeçalho compacto da consultoria (apenas visão pura de personal) */}
        {consultancyName && !hideRoleBadge && (
          <div className="px-1 flex items-center justify-between text-xs text-[var(--text-tertiary)] font-medium font-sans">
            <span className="truncate max-w-[200px]">{consultancyName}</span>
            <span>Personal Trainer</span>
          </div>
        )}

        {/* 2. Saudação curta */}
        <div className="px-1 space-y-0.5">
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight font-sans">
            {greeting}{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-xs text-[var(--text-secondary)] font-sans">
            Seus treinos em um só lugar.
          </p>
        </div>

        {/* 3. Ações principais (lado a lado) */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Link
            href={`/consultoria/${consultancySlug}/rotinas/novo`}
            className="min-h-[48px] rounded-xl font-bold text-xs bg-[var(--brand)] hover:brightness-105 active:scale-[0.98] text-[var(--text-inverse)] flex items-center justify-center gap-1.5 shadow-xs transition-all font-sans"
          >
            <span>+ Nova ficha</span>
          </Link>
          <Link
            href={`/consultoria/${consultancySlug}/rotinas?action=import`}
            className="min-h-[48px] rounded-xl font-semibold text-xs bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] text-[var(--text-primary)] flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all font-sans"
          >
            <span>Importar</span>
          </Link>
        </div>

        {/* 4. Dois indicadores operacionais */}
        <div className="grid grid-cols-2 gap-2">
          <Link
            href={`/consultoria/${consultancySlug}/progresso/alunos`}
            title="Alunos"
            className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] flex flex-col justify-between min-h-[82px] active:scale-[0.98] transition-all group"
          >
            <span className="text-xl sm:text-2xl font-black text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors font-sans tabular-nums">
              {displayStudents}
            </span>
            <span className="text-[11px] font-semibold text-[var(--text-secondary)] font-sans">
              Alunos
            </span>
          </Link>

          <Link
            href={`/consultoria/${consultancySlug}/rotinas`}
            title="Fichas de treino"
            className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] flex flex-col justify-between min-h-[82px] active:scale-[0.98] transition-all group"
          >
            <span className="text-xl sm:text-2xl font-black text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors font-sans tabular-nums">
              {displayPlans}
            </span>
            <span className="text-[11px] font-semibold text-[var(--text-secondary)] font-sans">
              Fichas de treino
            </span>
          </Link>
        </div>

        {/* 5. Fichas recentes */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-[var(--text-primary)] font-sans">
              Fichas recentes
            </h2>
            <Link
              href={`/consultoria/${consultancySlug}/rotinas`}
              className="text-xs text-[var(--brand)] font-semibold font-sans hover:underline"
            >
              Ver todas {totalPlans !== undefined && totalPlans !== null ? `(${totalPlans})` : ""} →
            </Link>
          </div>

          <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] divide-y divide-[var(--border-subtle)] overflow-hidden">
            {recentPlans && recentPlans.length > 0 ? (
              recentPlans.slice(0, 4).map((plan) => {
                const isArchived = plan.status === "ARCHIVED";
                const isDraft = plan.status === "DRAFT";

                return (
                  <Link
                    key={`mob-${plan.publicId}`}
                    href={`/consultoria/${consultancySlug}/rotinas/${plan.publicId}`}
                    className="p-3.5 flex items-center justify-between gap-3 active:bg-[var(--surface-hover)] transition-colors min-h-[52px] group"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5 pr-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate font-sans">
                          {plan.title}
                        </span>
                        {isDraft && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-sans">
                            Rascunho
                          </span>
                        )}
                        {isArchived && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-[var(--surface-subtle)] text-[var(--text-tertiary)] border border-[var(--border-subtle)] font-sans">
                            Arquivada
                          </span>
                        )}
                      </div>
                      {plan.blocksCount ? (
                        <p className="text-[11px] text-[var(--text-tertiary)] font-sans">
                          {plan.blocksCount} {plan.blocksCount === 1 ? "bloco" : "blocos"}
                        </p>
                      ) : null}
                    </div>
                    <span className="text-xs text-[var(--text-tertiary)] group-hover:text-[var(--brand)] group-hover:translate-x-0.5 transition-all font-bold shrink-0">
                      →
                    </span>
                  </Link>
                );
              })
            ) : (
              <div className="p-6 text-center space-y-2">
                <p className="text-xs text-[var(--text-secondary)] font-sans">
                  Nenhuma ficha cadastrada ainda.
                </p>
                <Link href={`/consultoria/${consultancySlug}/rotinas/novo`}>
                  <Button variant="primary" size="sm" className="font-semibold text-xs rounded-xl font-sans">
                    + Nova ficha
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* DESKTOP COMPOSITION (>= 768px)                                     */}
      {/* ------------------------------------------------------------------ */}
      <div
        data-testid="personal-desktop-view"
        className="hidden md:block space-y-6 w-full animate-in fade-in duration-150"
      >
        {/* 1. Cabeçalho funcional da página */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-1">
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight font-sans">
              Visão geral dos treinos
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans mt-0.5">
              {firstName ? `Olá, ${firstName}. ` : ""}Gerencie suas fichas e acompanhe seus alunos.
            </p>
          </div>

          {/* Ações principais no mesmo cabeçalho */}
          <div className="flex items-center gap-2.5 shrink-0">
            <Link href={`/consultoria/${consultancySlug}/rotinas/novo`}>
              <Button
                variant="primary"
                size="md"
                className="font-bold text-sm rounded-xl px-5 shadow-xs hover:brightness-105 active:scale-[0.98] transition-all font-sans min-h-[44px]"
              >
                + Nova ficha
              </Button>
            </Link>
            <Link href={`/consultoria/${consultancySlug}/rotinas?action=import`}>
              <Button
                variant="secondary"
                size="md"
                className="font-semibold text-sm rounded-xl px-4 hover:bg-[var(--surface-hover)] border border-[var(--border-default)] transition-all font-sans min-h-[44px]"
              >
                Importar treino
              </Button>
            </Link>
          </div>
        </div>

        {/* 2. Indicadores operacionais (Cards discretos) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href={`/consultoria/${consultancySlug}/progresso/alunos`}
            title="Alunos"
            className="p-5 sm:p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] hover:border-[var(--brand-soft-border)] hover:bg-[var(--surface-hover)] transition-all group flex flex-col justify-between min-h-[104px]"
          >
            <span className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors font-sans tabular-nums">
              {displayStudents}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] font-sans mt-2">
              Alunos
            </span>
          </Link>

          <Link
            href={`/consultoria/${consultancySlug}/rotinas`}
            title="Fichas de treino"
            className="p-5 sm:p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] hover:border-[var(--brand-soft-border)] hover:bg-[var(--surface-hover)] transition-all group flex flex-col justify-between min-h-[104px]"
          >
            <span className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors font-sans tabular-nums">
              {displayPlans}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] font-sans mt-2">
              Fichas de treino
            </span>
          </Link>
        </div>

        {/* 3. Fichas recentes (Protagonismo total) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] font-sans tracking-tight">
              Fichas recentes
            </h2>
            <Link href={`/consultoria/${consultancySlug}/rotinas`}>
              <span className="text-xs text-[var(--brand)] font-semibold hover:underline font-sans cursor-pointer">
                Ver todas {totalPlans !== undefined && totalPlans !== null ? `(${totalPlans})` : ""} →
              </span>
            </Link>
          </div>

          <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] divide-y divide-[var(--border-subtle)] overflow-hidden shadow-2xs">
            {recentPlans && recentPlans.length > 0 ? (
              recentPlans.slice(0, 6).map((plan) => {
                const isArchived = plan.status === "ARCHIVED";
                const isDraft = plan.status === "DRAFT";

                return (
                  <Link
                    key={plan.publicId}
                    href={`/consultoria/${consultancySlug}/rotinas/${plan.publicId}`}
                    className="flex items-center justify-between p-4 sm:px-5 sm:py-4 hover:bg-[var(--surface-hover)] transition-colors group cursor-pointer min-h-[56px]"
                  >
                    <div className="min-w-0 flex-1 space-y-1 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm sm:text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand)] transition-colors truncate font-sans">
                          {plan.title}
                        </span>
                        {isDraft && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-sans">
                            Rascunho
                          </span>
                        )}
                        {isArchived && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-[var(--surface-subtle)] text-[var(--text-tertiary)] border border-[var(--border-subtle)] font-sans">
                            Arquivada
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-sans">
                        {plan.subtitle && <span className="truncate">{plan.subtitle}</span>}
                        {plan.subtitle && plan.blocksCount ? <span>•</span> : null}
                        {plan.blocksCount ? (
                          <span>
                            {plan.blocksCount} {plan.blocksCount === 1 ? "bloco" : "blocos"}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs text-[var(--text-tertiary)] group-hover:text-[var(--brand)] group-hover:translate-x-0.5 transition-all font-bold pr-1 select-none">
                        →
                      </span>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="p-8 sm:p-12 text-center space-y-3">
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans">
                  Nenhuma ficha cadastrada ainda. Crie sua primeira rotina para prescrever aos alunos.
                </p>
                <Link href={`/consultoria/${consultancySlug}/rotinas/novo`}>
                  <Button variant="primary" size="sm" className="font-semibold rounded-xl font-sans mt-1">
                    + Nova ficha
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
