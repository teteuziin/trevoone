"use client";

import React, { useState, useMemo, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// MobileDashboardCockpit responsive layout architecture (mobile-first cockpit composition)
// Theme tokens for CSS compatibility: var(--surface) var(--text-primary) var(--text-secondary) var(--border-default) var(--brand)

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

// Inline SVGs for crisp, zero-dependency visual styling
function PlusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function SparklesIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}

function UsersIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function DumbbellIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 5v14M18 5v14M4 8h4M16 8h4M4 16h4M16 16h4M8 12h8" />
    </svg>
  );
}

function FlameIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
    </svg>
  );
}

function SearchIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function XIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ListIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function GridIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function ArrowRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );
}

function ChevronLeftIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
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

  // State for Instant Live Search, Filter Chips and View Toggle
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "FEW_BLOCKS" | "MANY_BLOCKS" | "DRAFT">("ALL");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Scroll Rail Refs & Bounds for Desktop Netflix Carousel
  const desktopRailRef = useRef<HTMLDivElement>(null);
  const mobileRailRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollBounds = React.useCallback(() => {
    const el = desktopRailRef.current;
    if (!el) return;
    const atStart = el.scrollLeft <= 5;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 5;
    setCanScrollLeft(!atStart);
    setCanScrollRight(!atEnd);
  }, []);

  React.useEffect(() => {
    checkScrollBounds();
    const el = desktopRailRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScrollBounds, { passive: true });
    window.addEventListener("resize", checkScrollBounds);
    return () => {
      el.removeEventListener("scroll", checkScrollBounds);
      window.removeEventListener("resize", checkScrollBounds);
    };
  }, [recentPlans, checkScrollBounds]);

  // Total blocks prescribed across loaded recent workouts
  const totalRecentBlocks = useMemo(() => {
    return (recentPlans || []).reduce((acc, p) => acc + (p.blocksCount || 0), 0);
  }, [recentPlans]);

  // Filtered recent plans
  const filteredPlans = useMemo(() => {
    return (recentPlans || []).filter((p) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = p.title?.toLowerCase().includes(q);
        const matchSubtitle = p.subtitle?.toLowerCase().includes(q);
        if (!matchTitle && !matchSubtitle) return false;
      }
      if (activeFilter === "FEW_BLOCKS") {
        return (p.blocksCount || 0) <= 3;
      }
      if (activeFilter === "MANY_BLOCKS") {
        return (p.blocksCount || 0) >= 4;
      }
      if (activeFilter === "DRAFT") {
        return p.status === "DRAFT";
      }
      return true;
    });
  }, [recentPlans, searchQuery, activeFilter]);

  const hasDraftsInRecent = useMemo(() => {
    return (recentPlans || []).some((p) => p.status === "DRAFT");
  }, [recentPlans]);

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

        {/* 2. Hero Spotlight Compacto Mobile - Preto Sólido #0B0C0E */}
        <div className="relative overflow-hidden rounded-2xl border border-[#303238] bg-[#0B0C0E] p-4.5 space-y-3.5 shadow-sm text-white">
          {/* Badge decorativo 'STUDIO DE PRESCRIÇÃO ATIVO' com 'animate-pulse bg-emerald-400' removido para priorizar leitura direta */}

          {/* Título & Saudação */}
          <div className="space-y-0.5">
            <h1 className="text-xl font-black text-white tracking-tight font-sans">
              Visão geral dos treinos
            </h1>
            <p className="text-xs text-[#C2C8CF] font-sans">
              {greeting}{firstName ? `, ${firstName}` : ""}. Gerencie suas fichas e acompanhe seus alunos.
            </p>
          </div>

          {/* Ações principais (Lado a lado, min-h-[48px], botões padronizados) */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Link
              href={`/consultoria/${consultancySlug}/rotinas/novo`}
              title="+ Nova ficha"
              className="min-h-[48px] rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-zinc-950 flex items-center justify-center gap-1.5 shadow-sm transition-all font-sans cursor-pointer focus-visible:ring-2 focus-visible:ring-[#10B981] focus-visible:outline-none"
            >
              <PlusIcon className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
              <span>Nova ficha</span>
            </Link>
            <Link
              href={`/consultoria/${consultancySlug}/rotinas?action=import`}
              title="Importar treino"
              className="min-h-[48px] rounded-xl font-semibold text-xs bg-[#1B1D21] hover:bg-[#252830] border border-[#303238] text-white flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all font-sans cursor-pointer focus-visible:ring-2 focus-visible:ring-[#10B981] focus-visible:outline-none"
            >
              <SparklesIcon className="w-4 h-4 text-[#10B981]" aria-hidden="true" />
              <span>Importar</span>
            </Link>
          </div>

          {/* Bento Strip Compacto Mobile (3 Cards Grafite #151619) */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <Link
              href={`/consultoria/${consultancySlug}/progresso/alunos`}
              title="Alunos ativos"
              className="p-2.5 rounded-xl bg-[#151619] hover:bg-[#1B1D21] border border-[#303238] hover:border-[#10B981]/50 flex flex-col justify-between min-h-[72px] active:scale-[0.98] transition-all group"
            >
              <div className="flex items-center justify-between">
                <UsersIcon className="w-3.5 h-3.5 text-[#10B981]" />
                <span className="text-[10px] text-[#C2C8CF] font-bold">→</span>
              </div>
              <div>
                <span className="text-lg font-black text-white group-hover:text-[#10B981] transition-colors font-sans tabular-nums leading-none block">
                  {displayStudents}
                </span>
                <span className="text-[9px] font-bold text-[#C2C8CF] uppercase tracking-wider block mt-1">
                  ALUNOS
                </span>
              </div>
            </Link>

            <Link
              href={`/consultoria/${consultancySlug}/rotinas`}
              title="Fichas de treino"
              className="p-2.5 rounded-xl bg-[#151619] hover:bg-[#1B1D21] border border-[#303238] hover:border-[#10B981]/50 flex flex-col justify-between min-h-[72px] active:scale-[0.98] transition-all group"
            >
              <div className="flex items-center justify-between">
                <DumbbellIcon className="w-3.5 h-3.5 text-[#10B981]" />
                <span className="text-[10px] text-[#C2C8CF] font-bold">→</span>
              </div>
              <div>
                <span className="text-lg font-black text-white group-hover:text-[#10B981] transition-colors font-sans tabular-nums leading-none block">
                  {displayPlans}
                </span>
                <span className="text-[9px] font-bold text-[#C2C8CF] uppercase tracking-wider block mt-1">
                  FICHAS
                </span>
              </div>
            </Link>

            <Link
              href={`/consultoria/${consultancySlug}/rotinas?action=import`}
              title="Inteligência de Prescrição"
              className="p-2.5 rounded-xl bg-[#151619] hover:bg-[#1B1D21] border border-[#303238] hover:border-[#10B981]/50 flex flex-col justify-between min-h-[72px] active:scale-[0.98] transition-all group"
            >
              <div className="flex items-center justify-between">
                <FlameIcon className="w-3.5 h-3.5 text-[#10B981]" />
                <span className="text-[10px] text-[#C2C8CF] font-bold">IA</span>
              </div>
              <div>
                <span className="text-lg font-black text-white group-hover:text-[#10B981] transition-colors font-sans tabular-nums leading-none block">
                  {totalRecentBlocks > 0 ? totalRecentBlocks : "Studio"}
                </span>
                <span className="text-[9px] font-bold text-[#C2C8CF] uppercase tracking-wider block mt-1">
                  {totalRecentBlocks > 0 ? "BLOCOS" : "IMPORTAR"}
                </span>
              </div>
            </Link>
          </div>
        </div>

        {/* 3. Trilho Estilo Netflix: Acesso Rápido Mobile (Cards Grafite Sólidos #151619) */}
        {recentPlans && recentPlans.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-md bg-[#ECEFF2] border border-[#C5CBD3] text-[#065F46] dark:bg-[#151619] dark:border-[#303238] dark:text-[#10B981] flex items-center justify-center">
                  <FlameIcon className="w-3 h-3" />
                </div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#17191D] dark:text-white font-sans">
                  Acesso rápido
                </h2>
              </div>
              <span className="text-[11px] text-[#4B5563] dark:text-[#C2C8CF] font-semibold">
                Deslize para ver →
              </span>
            </div>

            <div
              ref={mobileRailRef}
              className="flex gap-2.5 overflow-x-auto snap-x snap-mandatory pb-1 no-scrollbar scroll-smooth"
            >
              {recentPlans.slice(0, 6).map((plan) => {
                const isDraft = plan.status === "DRAFT";
                const blocks = plan.blocksCount || 1;

                return (
                  <Link
                    key={`mob-rail-${plan.publicId}`}
                    href={`/consultoria/${consultancySlug}/rotinas/${plan.publicId}`}
                    className="min-w-[240px] max-w-[260px] snap-start shrink-0 rounded-2xl border border-[#303238] bg-[#151619] p-3.5 flex flex-col justify-between min-h-[150px] shadow-sm active:scale-[0.98] transition-all group hover:border-[#10B981]/50 text-white"
                  >
                    <div>
                      {/* Top Meta Line */}
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1B1D21] text-[#C2C8CF] border border-[#303238]">
                          <DumbbellIcon className="w-2.5 h-2.5 text-[#10B981]" />
                          <span>{blocks} {blocks === 1 ? "bloco" : "blocos"}</span>
                        </span>
                        {isDraft && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Rascunho
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-xs font-bold text-white line-clamp-2 mt-2 group-hover:text-[#10B981] transition-colors leading-snug">
                        {plan.title}
                      </h3>
                      {plan.subtitle && (
                        <p className="text-[10px] text-[#C2C8CF] truncate mt-0.5">
                          {plan.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Meta info & CTA direta */}
                    <div className="pt-2 border-t border-[#303238] flex items-center justify-between text-[11px] mt-2">
                      <span className="text-[#C2C8CF] font-medium text-[10px]">
                        {blocks} {blocks === 1 ? "bloco" : "blocos"}
                      </span>
                      <div className="flex items-center gap-1 font-bold text-[#10B981] group-hover:text-emerald-300 transition-colors">
                        <span>Abrir no Studio</span>
                        <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Catálogo: Fichas recentes com busca rápida */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold text-[#17191D] dark:text-white font-sans">
                Fichas recentes
              </h2>
              {filteredPlans.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-[#1B1D21] text-[#17191D] dark:text-[#C2C8CF] border border-[#C5CBD3] dark:border-[#303238]">
                  {filteredPlans.length}
                </span>
              )}
            </div>
            <Link
              href={`/consultoria/${consultancySlug}/rotinas`}
              className="text-xs text-[#065F46] dark:text-[#10B981] font-semibold font-sans hover:underline"
            >
              Ver todas {totalPlans !== undefined && totalPlans !== null ? `(${totalPlans})` : ""} →
            </Link>
          </div>

          {/* Mobile Search Input */}
          {recentPlans && recentPlans.length > 0 && (
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar ficha por nome..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-[#C5CBD3] dark:border-[#303238] bg-white dark:bg-[#1B1D21] text-[#17191D] dark:text-white placeholder:text-[#6B7280] dark:placeholder:text-[#C2C8CF]/60 focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981] focus:outline-none min-h-[38px]"
              />
              <SearchIcon className="w-3.5 h-3.5 text-[#6B7280] dark:text-[#C2C8CF] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#6B7280] hover:text-[#17191D] dark:text-[#C2C8CF] dark:hover:text-white cursor-pointer"
                >
                  <XIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* List of Recent Plans (Mobile) - Grafite Sólido #151619 */}
          <div className="rounded-2xl bg-[#151619] border border-[#303238] divide-y divide-[#303238] overflow-hidden shadow-2xs">
            {recentPlans && recentPlans.length > 0 ? (
              filteredPlans.length > 0 ? (
                (searchQuery ? filteredPlans : recentPlans.slice(0, 4)).map((plan) => {
                  const isArchived = plan.status === "ARCHIVED";
                  const isDraft = plan.status === "DRAFT";

                  return (
                    <Link
                      key={`mob-${plan.publicId}`}
                      href={`/consultoria/${consultancySlug}/rotinas/${plan.publicId}`}
                      className="p-3.5 flex items-center justify-between gap-3 active:bg-[#1B1D21] transition-colors min-h-[56px] group"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5 pr-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-semibold text-white group-hover:text-[#10B981] transition-colors truncate font-sans">
                            {plan.title}
                          </span>
                          {isDraft && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-sans">
                              Rascunho
                            </span>
                          )}
                          {isArchived && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-[#1B1D21] text-[#C2C8CF] border border-[#303238] font-sans">
                              Arquivada
                            </span>
                          )}
                        </div>
                        {plan.blocksCount ? (
                          <p className="text-[11px] text-[#C2C8CF] font-sans">
                            {plan.blocksCount} {plan.blocksCount === 1 ? "bloco" : "blocos"}
                          </p>
                        ) : null}
                      </div>
                      <span className="text-xs text-[#C2C8CF] group-hover:text-[#10B981] group-hover:translate-x-0.5 transition-all font-bold shrink-0">
                        →
                      </span>
                    </Link>
                  );
                })
              ) : (
                <div className="p-6 text-center space-y-2">
                  <p className="text-xs text-[#C2C8CF] font-sans">
                    Nenhuma ficha encontrada para &ldquo;{searchQuery}&rdquo;.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-xs font-bold text-[#10B981] hover:underline cursor-pointer"
                  >
                    Limpar busca
                  </button>
                </div>
              )
            ) : (
              <div className="p-6 text-center space-y-2">
                <p className="text-xs text-[#C2C8CF] font-sans">
                  Nenhuma ficha cadastrada ainda.
                </p>
                <Link href={`/consultoria/${consultancySlug}/rotinas/novo`} title="+ Nova ficha">
                  <Button variant="primary" size="sm" className="font-semibold text-xs rounded-xl font-sans">
                    Nova ficha
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
        {/* 1. Hero Banner "Spotlight" - Cabeçalho Preto Sólido Executivo #0B0C0E */}
        <div className="relative overflow-hidden rounded-3xl border border-[#303238] bg-[#0B0C0E] p-6 sm:p-7 shadow-sm transition-all text-white">
          {/* Badge decorativo 'STUDIO DE PRESCRIÇÃO ATIVO' com 'animate-pulse bg-emerald-400' removido para priorizar hierarquia direta */}

          {/* Top Row: Título & Subtítulo + CTAs Primário e Secundário */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-sans">
                Visão geral dos treinos
              </h1>
              <p className="text-xs sm:text-sm text-[#C2C8CF] font-sans leading-relaxed">
                {firstName ? `Olá, ${firstName}. ` : ""}Gerencie suas fichas e acompanhe seus alunos.
              </p>
            </div>

            {/* CTAs de Alto Impacto e Alto Contraste */}
            <div className="flex items-center gap-3 shrink-0">
              <Link href={`/consultoria/${consultancySlug}/rotinas/novo`}>
                <button
                  type="button"
                  title="+ Nova ficha"
                  aria-label="Nova ficha"
                  className="font-bold text-sm rounded-xl px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-sm hover:scale-[1.01] active:scale-[0.98] transition-all font-sans min-h-[44px] flex items-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#10B981] focus-visible:outline-none"
                >
                  <PlusIcon className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
                  <span>Nova ficha</span>
                </button>
              </Link>
              <Link href={`/consultoria/${consultancySlug}/rotinas?action=import`}>
                <button
                  type="button"
                  title="Importar treino"
                  aria-label="Importar treino"
                  className="font-semibold text-sm rounded-xl px-4 py-2.5 bg-[#1B1D21] hover:bg-[#252830] border border-[#303238] hover:border-[#10B981]/50 text-white transition-all font-sans min-h-[44px] flex items-center gap-2 active:scale-[0.98] cursor-pointer focus-visible:ring-2 focus-visible:ring-[#10B981] focus-visible:outline-none"
                >
                  <SparklesIcon className="w-4 h-4 text-[#10B981]" aria-hidden="true" />
                  <span>Importar treino</span>
                </button>
              </Link>
            </div>
          </div>

          {/* Bento Strip Compacto (3 Cards Integrados Grafite Sólidos #151619) */}
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-5 mt-5 border-t border-[#303238]">
            {/* Card 1: Alunos */}
            <Link
              href={`/consultoria/${consultancySlug}/progresso/alunos`}
              title="Alunos"
              className="p-4 rounded-2xl bg-[#151619] hover:bg-[#1B1D21] border border-[#303238] hover:border-[#10B981]/50 transition-all group flex flex-col justify-between min-h-[96px] cursor-pointer text-white"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-[#1B1D21] border border-[#303238] text-[#10B981] flex items-center justify-center">
                  <UsersIcon className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-[#C2C8CF] group-hover:text-white group-hover:translate-x-0.5 transition-all">
                  Ver alunos →
                </span>
              </div>
              <div className="pt-2">
                <span className="text-2xl sm:text-3xl font-black text-white group-hover:text-[#10B981] transition-colors font-sans tabular-nums leading-none block">
                  {displayStudents}
                </span>
                <span className="text-[11px] font-bold text-[#C2C8CF] uppercase tracking-wider block mt-1">
                  ALUNOS ATIVOS
                </span>
              </div>
            </Link>

            {/* Card 2: Fichas de Treino */}
            <Link
              href={`/consultoria/${consultancySlug}/rotinas`}
              title="Fichas de treino"
              className="p-4 rounded-2xl bg-[#151619] hover:bg-[#1B1D21] border border-[#303238] hover:border-[#10B981]/50 transition-all group flex flex-col justify-between min-h-[96px] cursor-pointer text-white"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-[#1B1D21] border border-[#303238] text-[#10B981] flex items-center justify-center">
                  <DumbbellIcon className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-[#C2C8CF] group-hover:text-white group-hover:translate-x-0.5 transition-all">
                  Ver todas →
                </span>
              </div>
              <div className="pt-2">
                <span className="text-2xl sm:text-3xl font-black text-white group-hover:text-[#10B981] transition-colors font-sans tabular-nums leading-none block">
                  {displayPlans}
                </span>
                <span className="text-[11px] font-bold text-[#C2C8CF] uppercase tracking-wider block mt-1">
                  FICHAS DE TREINO
                </span>
              </div>
            </Link>

            {/* Card 3: Volume Recente / Inteligência */}
            <Link
              href={`/consultoria/${consultancySlug}/rotinas?action=import`}
              title="Importar treino com IA"
              className="p-4 rounded-2xl bg-[#151619] hover:bg-[#1B1D21] border border-[#303238] hover:border-[#10B981]/50 transition-all group flex flex-col justify-between min-h-[96px] cursor-pointer col-span-1 sm:col-span-2 lg:col-span-1 text-white"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-[#1B1D21] border border-[#303238] text-[#10B981] flex items-center justify-center">
                  <FlameIcon className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-[#C2C8CF] group-hover:text-white group-hover:translate-x-0.5 transition-all">
                  Importar com IA →
                </span>
              </div>
              <div className="pt-2">
                <span className="text-2xl sm:text-3xl font-black text-white group-hover:text-[#10B981] transition-colors font-sans tabular-nums leading-none block">
                  {totalRecentBlocks > 0 ? `${totalRecentBlocks}` : "IA Studio"}
                </span>
                <span className="text-[11px] font-bold text-[#C2C8CF] uppercase tracking-wider block mt-1">
                  {totalRecentBlocks > 0 ? "BLOCOS PRESCRITOS" : "IMPORTADOR RÁPIDO"}
                </span>
              </div>
            </Link>
          </div>
        </div>

        {/* 2. Trilho Estilo Netflix: "Em Destaque / Acesso Rápido" (Cards Grafite Sólidos #151619) */}
        {recentPlans && recentPlans.length > 0 && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-[#ECEFF2] border border-[#C5CBD3] text-[#065F46] dark:bg-[#151619] dark:border-[#303238] dark:text-[#10B981] flex items-center justify-center shadow-xs">
                  <FlameIcon className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[#17191D] dark:text-white font-sans tracking-tight">
                    Acesso rápido
                  </h2>
                </div>
              </div>

              {/* Botões de Navegação Lateral Suave com limites detectados */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={!canScrollLeft}
                  onClick={() => desktopRailRef.current?.scrollBy({ left: -320, behavior: "smooth" })}
                  aria-label="Rolar para esquerda"
                  className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all ${
                    !canScrollLeft
                      ? "bg-[#ECEFF2] border-[#C5CBD3] text-zinc-400 dark:bg-[#151619] dark:border-[#303238] dark:text-zinc-600 opacity-40 cursor-not-allowed"
                      : "bg-[#ECEFF2] hover:bg-[#DFE3E8] border-[#C5CBD3] hover:border-[#10B981] text-[#17191D] dark:bg-[#151619] dark:hover:bg-[#1B1D21] dark:border-[#303238] dark:hover:border-[#10B981]/50 dark:text-[#C2C8CF] dark:hover:text-white cursor-pointer active:scale-95"
                  }`}
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={!canScrollRight}
                  onClick={() => desktopRailRef.current?.scrollBy({ left: 320, behavior: "smooth" })}
                  aria-label="Rolar para direita"
                  className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all ${
                    !canScrollRight
                      ? "bg-[#ECEFF2] border-[#C5CBD3] text-zinc-400 dark:bg-[#151619] dark:border-[#303238] dark:text-zinc-600 opacity-40 cursor-not-allowed"
                      : "bg-[#ECEFF2] hover:bg-[#DFE3E8] border-[#C5CBD3] hover:border-[#10B981] text-[#17191D] dark:bg-[#151619] dark:hover:bg-[#1B1D21] dark:border-[#303238] dark:hover:border-[#10B981]/50 dark:text-[#C2C8CF] dark:hover:text-white cursor-pointer active:scale-95"
                  }`}
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Poster Cards Carrossel - Grafite Sólido #151619 */}
            <div
              ref={desktopRailRef}
              tabIndex={0}
              aria-label="Carrossel de acesso rápido às fichas recentes"
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft") {
                  desktopRailRef.current?.scrollBy({ left: -320, behavior: "smooth" });
                } else if (e.key === "ArrowRight") {
                  desktopRailRef.current?.scrollBy({ left: 320, behavior: "smooth" });
                }
              }}
              className="flex gap-3.5 overflow-x-auto snap-x snap-mandatory pb-2 no-scrollbar scroll-smooth focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none rounded-2xl"
            >
              {recentPlans.slice(0, 6).map((plan) => {
                const isDraft = plan.status === "DRAFT";
                const isArchived = plan.status === "ARCHIVED";
                const blocks = plan.blocksCount || 1;

                return (
                  <Link
                    key={`rail-${plan.publicId}`}
                    href={`/consultoria/${consultancySlug}/rotinas/${plan.publicId}`}
                    className="min-w-[270px] sm:min-w-[290px] max-w-[320px] snap-start shrink-0 group relative overflow-hidden rounded-2xl border border-[#303238] bg-[#151619] p-4.5 transition-all duration-300 hover:-translate-y-1 hover:border-[#10B981]/50 hover:bg-[#1B1D21] hover:shadow-md flex flex-col justify-between min-h-[175px] cursor-pointer text-white"
                  >
                    <div className="space-y-2.5 relative z-10">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#1B1D21] text-[#C2C8CF] border border-[#303238]">
                          <DumbbellIcon className="w-3 h-3 text-[#10B981]" />
                          <span>{blocks} {blocks === 1 ? "bloco" : "blocos"}</span>
                        </span>
                        {isDraft && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Rascunho
                          </span>
                        )}
                        {isArchived && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-[#1B1D21] text-[#C2C8CF] border border-[#303238]">
                            Arquivada
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm sm:text-base font-bold text-white line-clamp-2 group-hover:text-[#10B981] transition-colors leading-snug">
                        {plan.title}
                      </h3>
                      {plan.subtitle && (
                        <p className="text-xs text-[#C2C8CF] truncate">
                          {plan.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Meta info & CTA clara */}
                    <div className="pt-3 border-t border-[#303238] flex items-center justify-between text-xs mt-3 relative z-10">
                      <span className="text-[#C2C8CF] font-medium">
                        {blocks} {blocks === 1 ? "bloco prescrito" : "blocos prescritos"}
                      </span>
                      <div className="flex items-center gap-1 font-bold text-[#10B981] group-hover:text-emerald-300 transition-colors">
                        <span>Abrir no Studio</span>
                        <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Catálogo Prático: Fichas Recentes com Busca Instantânea e Filtros */}
        <div className="space-y-3.5 pt-1">
          {/* Header & Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-[#17191D] dark:text-white font-sans tracking-tight">
                Fichas recentes
              </h2>
              {filteredPlans.length > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white dark:bg-[#1B1D21] text-[#17191D] dark:text-[#C2C8CF] border border-[#C5CBD3] dark:border-[#303238]">
                  {filteredPlans.length}
                </span>
              )}
            </div>

            <Link href={`/consultoria/${consultancySlug}/rotinas`}>
              <span className="text-xs text-[#065F46] dark:text-[#10B981] font-semibold hover:underline font-sans cursor-pointer">
                Ver todas {totalPlans !== undefined && totalPlans !== null ? `(${totalPlans})` : ""} →
              </span>
            </Link>
          </div>

          {/* Search Bar + Chips Filter + View Mode Toggle */}
          {recentPlans && recentPlans.length > 0 && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2 rounded-2xl bg-[#ECEFF2] border border-[#C5CBD3] dark:bg-[#151619] dark:border-[#303238]">
              {/* Input de Busca Instantânea */}
              <div className="relative flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar ficha por nome..."
                  className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl border border-[#C5CBD3] dark:border-[#303238] bg-white dark:bg-[#1B1D21] text-[#17191D] dark:text-white placeholder:text-[#6B7280] dark:placeholder:text-[#C2C8CF]/60 focus:ring-1 focus:ring-[#10B981] focus:border-[#10B981] focus:outline-none min-h-[38px]"
                />
                <SearchIcon className="w-4 h-4 text-[#6B7280] dark:text-[#C2C8CF] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#6B7280] hover:text-[#17191D] dark:text-[#C2C8CF] dark:hover:text-white cursor-pointer"
                  >
                    <XIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Chips de Filtro Rápido */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setActiveFilter("ALL")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer min-h-[34px] ${
                    activeFilter === "ALL"
                      ? "bg-emerald-500 text-zinc-950 font-bold shadow-2xs"
                      : "bg-white hover:bg-[#DFE3E8] text-[#4B5563] hover:text-[#17191D] border border-[#C5CBD3] dark:bg-[#1B1D21] dark:hover:bg-[#252830] dark:text-[#C2C8CF] dark:hover:text-white dark:border-[#303238]"
                  }`}
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("FEW_BLOCKS")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer min-h-[34px] ${
                    activeFilter === "FEW_BLOCKS"
                      ? "bg-emerald-500 text-zinc-950 font-bold shadow-2xs"
                      : "bg-white hover:bg-[#DFE3E8] text-[#4B5563] hover:text-[#17191D] border border-[#C5CBD3] dark:bg-[#1B1D21] dark:hover:bg-[#252830] dark:text-[#C2C8CF] dark:hover:text-white dark:border-[#303238]"
                  }`}
                >
                  Até 3 blocos
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("MANY_BLOCKS")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer min-h-[34px] ${
                    activeFilter === "MANY_BLOCKS"
                      ? "bg-emerald-500 text-zinc-950 font-bold shadow-2xs"
                      : "bg-white hover:bg-[#DFE3E8] text-[#4B5563] hover:text-[#17191D] border border-[#C5CBD3] dark:bg-[#1B1D21] dark:hover:bg-[#252830] dark:text-[#C2C8CF] dark:hover:text-white dark:border-[#303238]"
                  }`}
                >
                  4+ blocos
                </button>
                {hasDraftsInRecent && (
                  <button
                    type="button"
                    onClick={() => setActiveFilter("DRAFT")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer min-h-[34px] ${
                      activeFilter === "DRAFT"
                        ? "bg-amber-500 text-white shadow-2xs font-bold"
                        : "bg-white hover:bg-[#DFE3E8] text-[#4B5563] hover:text-[#17191D] border border-[#C5CBD3] dark:bg-[#1B1D21] dark:hover:bg-[#252830] dark:text-[#C2C8CF] dark:hover:text-white dark:border-[#303238]"
                    }`}
                  >
                    Rascunhos
                  </button>
                )}

                {/* Alternador de Visualização (Lista vs Grade) */}
                <div className="flex items-center gap-1 pl-1 ml-1 border-l border-[#C5CBD3] dark:border-[#303238]">
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    aria-label="Ver em lista"
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer min-h-[34px] min-w-[34px] flex items-center justify-center ${
                      viewMode === "list"
                        ? "bg-white text-[#065F46] border-[#C5CBD3] dark:bg-[#1B1D21] dark:text-[#10B981] dark:border-[#10B981]/50 shadow-2xs"
                        : "text-[#4B5563] border-transparent hover:text-[#17191D] hover:bg-[#DFE3E8] dark:text-[#C2C8CF] dark:border-transparent dark:hover:text-white dark:hover:bg-[#1B1D21]"
                    }`}
                    title="Visualização em lista"
                  >
                    <ListIcon className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    aria-label="Ver em grade"
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer min-h-[34px] min-w-[34px] flex items-center justify-center ${
                      viewMode === "grid"
                        ? "bg-white text-[#065F46] border-[#C5CBD3] dark:bg-[#1B1D21] dark:text-[#10B981] dark:border-[#10B981]/50 shadow-2xs"
                        : "text-[#4B5563] border-transparent hover:text-[#17191D] hover:bg-[#DFE3E8] dark:text-[#C2C8CF] dark:border-transparent dark:hover:text-white dark:hover:bg-[#1B1D21]"
                    }`}
                    title="Visualização em grade"
                  >
                    <GridIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Renderização de Fichas Recentes */}
          {recentPlans && recentPlans.length > 0 ? (
            filteredPlans.length > 0 ? (
              viewMode === "list" ? (
                /* Rich Interactive Rows - Fichas Recentes Grafite Sólido #151619 */
                <div className="rounded-2xl bg-[#151619] border border-[#303238] divide-y divide-[#303238] overflow-hidden shadow-2xs">
                  {(searchQuery || activeFilter !== "ALL" ? filteredPlans : recentPlans.slice(0, 6)).map((plan) => {
                    const isArchived = plan.status === "ARCHIVED";
                    const isDraft = plan.status === "DRAFT";

                    return (
                      <Link
                        key={plan.publicId}
                        href={`/consultoria/${consultancySlug}/rotinas/${plan.publicId}`}
                        className="flex items-center justify-between p-4 sm:px-5 sm:py-3.5 hover:bg-[#1B1D21] transition-colors group cursor-pointer min-h-[60px] relative text-white"
                      >
                        {/* Hover Left Accent Line */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#10B981] opacity-0 group-hover:opacity-100 transition-opacity rounded-r" />

                        {/* Left: Avatar Icon + Info */}
                        <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-4">
                          <div className="w-10 h-10 rounded-xl bg-[#1B1D21] border border-[#303238] group-hover:border-[#10B981]/40 flex items-center justify-center transition-colors shrink-0 text-[#C2C8CF] group-hover:text-[#10B981]">
                            <DumbbellIcon className="w-5 h-5" />
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm sm:text-base font-semibold text-white group-hover:text-[#10B981] transition-colors truncate font-sans">
                                {plan.title}
                              </span>
                              {isDraft && (
                                <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-sans shrink-0">
                                  Rascunho
                                </span>
                              )}
                              {isArchived && (
                                <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-[#1B1D21] text-[#C2C8CF] border border-[#303238] font-sans shrink-0">
                                  Arquivada
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-[#C2C8CF] font-sans flex-wrap">
                              {plan.subtitle && <span className="truncate max-w-sm">{plan.subtitle}</span>}
                              {plan.subtitle && plan.blocksCount ? <span>•</span> : null}
                              {plan.blocksCount ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-[#10B981]">
                                  {plan.blocksCount} {plan.blocksCount === 1 ? "bloco" : "blocos"}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        {/* Right: Quick Action Hint & Arrow */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="hidden sm:inline-block text-xs font-semibold text-[#C2C8CF] group-hover:text-[#10B981] transition-colors">
                            Abrir ficha
                          </span>
                          <span className="text-sm text-[#C2C8CF] group-hover:text-[#10B981] group-hover:translate-x-1 transition-all font-bold pr-1 select-none">
                            →
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                /* Grid Mode (Netflix Bento Grid) - Grafite Sólido #151619 */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {(searchQuery || activeFilter !== "ALL" ? filteredPlans : recentPlans.slice(0, 6)).map((plan) => {
                    const isDraft = plan.status === "DRAFT";
                    const isArchived = plan.status === "ARCHIVED";
                    const blocks = plan.blocksCount || 1;

                    return (
                      <Link
                        key={`grid-${plan.publicId}`}
                        href={`/consultoria/${consultancySlug}/rotinas/${plan.publicId}`}
                        className="p-4 rounded-2xl bg-[#151619] hover:bg-[#1B1D21] border border-[#303238] hover:border-[#10B981]/50 transition-all group flex flex-col justify-between min-h-[140px] shadow-sm text-white cursor-pointer"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#1B1D21] text-[#C2C8CF] border border-[#303238]">
                              <DumbbellIcon className="w-3 h-3 text-[#10B981]" />
                              <span>{blocks} {blocks === 1 ? "bloco" : "blocos"}</span>
                            </span>
                            {isDraft && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Rascunho
                              </span>
                            )}
                            {isArchived && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-[#1B1D21] text-[#C2C8CF] border border-[#303238]">
                                Arquivada
                              </span>
                            )}
                          </div>

                          <h3 className="text-sm font-bold text-white group-hover:text-[#10B981] transition-colors line-clamp-2 mt-1">
                            {plan.title}
                          </h3>
                          {plan.subtitle && (
                            <p className="text-xs text-[#C2C8CF] truncate">
                              {plan.subtitle}
                            </p>
                          )}
                        </div>

                        <div className="pt-2 border-t border-[#303238] flex items-center justify-between text-xs font-semibold text-[#10B981] group-hover:text-emerald-300 transition-colors">
                          <span>Abrir ficha</span>
                          <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )
            ) : (
              /* Search Empty State */
              <div className="p-8 sm:p-12 text-center rounded-2xl bg-[#151619] border border-[#303238] space-y-3 text-white">
                <p className="text-xs sm:text-sm text-[#C2C8CF] font-sans">
                  Nenhuma ficha encontrada para &ldquo;{searchQuery}&rdquo;.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setActiveFilter("ALL");
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    Limpar filtro
                  </button>
                  <Link
                    href={`/consultoria/${consultancySlug}/rotinas`}
                    className="text-xs font-semibold text-[#10B981] hover:underline"
                  >
                    Ver todas as fichas ({totalPlans})
                  </Link>
                </div>
              </div>
            )
          ) : (
            /* General Empty State */
            <div className="p-8 sm:p-12 text-center rounded-2xl bg-[#151619] border border-[#303238] space-y-3 shadow-2xs text-white">
              <p className="text-xs sm:text-sm text-[#C2C8CF] font-sans">
                Nenhuma ficha cadastrada ainda. Crie sua primeira rotina para prescrever aos alunos.
              </p>
              <Link href={`/consultoria/${consultancySlug}/rotinas/novo`} title="+ Nova ficha" className="inline-flex mt-1">
                <Button variant="primary" size="sm" className="font-semibold rounded-xl font-sans">
                  Nova ficha
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
