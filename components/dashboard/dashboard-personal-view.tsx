"use client";

import React, { useState, useMemo, useRef } from "react";
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

  // Scroll Rail Refs for Desktop Netflix Carousel
  const desktopRailRef = useRef<HTMLDivElement>(null);
  const mobileRailRef = useRef<HTMLDivElement>(null);

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

        {/* 2. Hero Spotlight Compacto Mobile - Verde-Escuro Sólido */}
        <div className="relative overflow-hidden rounded-2xl border border-[#1e4738] bg-[#10271F] p-4.5 space-y-3.5 shadow-sm text-white">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#18352C] border border-[#234e3e] text-[#80E8B3] text-[10px] font-bold tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-emerald-400" />
            <span>STUDIO DE PRESCRIÇÃO ATIVO</span>
          </div>

          {/* Saudação */}
          <div className="space-y-0.5">
            <h1 className="text-xl font-black text-white tracking-tight font-sans">
              {greeting}{firstName ? `, ${firstName}` : ""}
            </h1>
            <p className="text-xs text-[#CBDDD3] font-sans">
              Gerencie suas fichas e acompanhe seus alunos.
            </p>
          </div>

          {/* Ações principais (Lado a lado, min-h-[48px]) */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Link
              href={`/consultoria/${consultancySlug}/rotinas/novo`}
              className="min-h-[48px] rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-zinc-950 flex items-center justify-center gap-1.5 shadow-sm transition-all font-sans"
            >
              <PlusIcon className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>+ Nova ficha</span>
            </Link>
            <Link
              href={`/consultoria/${consultancySlug}/rotinas?action=import`}
              className="min-h-[48px] rounded-xl font-semibold text-xs bg-[#18352C] hover:bg-[#1B382D] border border-[#234e3e] text-white flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all font-sans"
            >
              <SparklesIcon className="w-3.5 h-3.5 text-[#80E8B3]" />
              <span>Importar</span>
            </Link>
          </div>

          {/* Bento Strip Compacto Mobile (3 Cards Verde-Escuros Sólidos) */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <Link
              href={`/consultoria/${consultancySlug}/progresso/alunos`}
              title="Alunos"
              className="p-2.5 rounded-xl bg-[#18352C] hover:bg-[#1B382D] border border-[#234e3e] hover:border-emerald-500/50 flex flex-col justify-between min-h-[72px] active:scale-[0.98] transition-all group"
            >
              <div className="flex items-center justify-between">
                <UsersIcon className="w-3.5 h-3.5 text-[#80E8B3]" />
                <span className="text-[10px] text-[#CBDDD3] font-bold">→</span>
              </div>
              <div>
                <span className="text-lg font-black text-white group-hover:text-[#80E8B3] transition-colors font-sans tabular-nums leading-none block">
                  {displayStudents}
                </span>
                <span className="text-[9px] font-bold text-[#CBDDD3] uppercase tracking-wider block mt-1">
                  ALUNOS ATIVOS
                </span>
              </div>
            </Link>

            <Link
              href={`/consultoria/${consultancySlug}/rotinas`}
              title="Fichas de treino"
              className="p-2.5 rounded-xl bg-[#18352C] hover:bg-[#1B382D] border border-[#234e3e] hover:border-emerald-500/50 flex flex-col justify-between min-h-[72px] active:scale-[0.98] transition-all group"
            >
              <div className="flex items-center justify-between">
                <DumbbellIcon className="w-3.5 h-3.5 text-[#80E8B3]" />
                <span className="text-[10px] text-[#CBDDD3] font-bold">→</span>
              </div>
              <div>
                <span className="text-lg font-black text-white group-hover:text-[#80E8B3] transition-colors font-sans tabular-nums leading-none block">
                  {displayPlans}
                </span>
                <span className="text-[9px] font-bold text-[#CBDDD3] uppercase tracking-wider block mt-1">
                  Fichas
                </span>
              </div>
            </Link>

            <Link
              href={`/consultoria/${consultancySlug}/rotinas?action=import`}
              title="Inteligência de Prescrição"
              className="p-2.5 rounded-xl bg-[#18352C] hover:bg-[#1B382D] border border-[#234e3e] hover:border-emerald-500/50 flex flex-col justify-between min-h-[72px] active:scale-[0.98] transition-all group"
            >
              <div className="flex items-center justify-between">
                <FlameIcon className="w-3.5 h-3.5 text-[#80E8B3]" />
                <span className="text-[10px] text-[#CBDDD3] font-bold">IA</span>
              </div>
              <div>
                <span className="text-lg font-black text-white group-hover:text-[#80E8B3] transition-colors font-sans tabular-nums leading-none block">
                  {totalRecentBlocks > 0 ? totalRecentBlocks : "Studio"}
                </span>
                <span className="text-[9px] font-bold text-[#CBDDD3] uppercase tracking-wider block mt-1">
                  {totalRecentBlocks > 0 ? "Blocos" : "Importar"}
                </span>
              </div>
            </Link>
          </div>
        </div>

        {/* 3. Trilho Estilo Netflix: Acesso Rápido Mobile (Cards Verde-Escuros Sólidos) */}
        {recentPlans && recentPlans.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <FlameIcon className="w-3 h-3" />
                </div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] font-sans">
                  Acesso rápido
                </h2>
              </div>
              <span className="text-[11px] text-[var(--text-tertiary)] font-semibold">
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
                    className="min-w-[240px] max-w-[260px] snap-start shrink-0 rounded-2xl border border-[#1e4738] bg-[#10271F] p-3.5 flex flex-col justify-between min-h-[150px] shadow-sm active:scale-[0.98] transition-all group hover:border-emerald-500/50 text-white"
                  >
                    <div>
                      {/* Top Meta Line */}
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#18352C] text-[#CBDDD3] border border-[#234e3e]">
                          <DumbbellIcon className="w-2.5 h-2.5 text-[#80E8B3]" />
                          <span>{blocks} {blocks === 1 ? "bloco" : "blocos"}</span>
                        </span>
                        {isDraft && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Rascunho
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-xs font-bold text-white line-clamp-2 mt-2 group-hover:text-[#80E8B3] transition-colors">
                        {plan.title}
                      </h3>
                      {plan.subtitle && (
                        <p className="text-[10px] text-[#CBDDD3] truncate mt-0.5">
                          {plan.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Density indicator & CTA with explicit semantics */}
                    <div className="pt-2 border-t border-[#1e4738] space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-[#CBDDD3] font-medium">
                        <span>Densidade</span>
                        <span>{blocks} {blocks === 1 ? "bloco" : "blocos"}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4].map((seg) => (
                          <div
                            key={seg}
                            className={`h-1 flex-1 rounded-full ${
                              seg <= blocks ? "bg-emerald-400" : "bg-[#18352C]"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#80E8B3]">
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
              <h2 className="text-sm font-bold text-[var(--text-primary)] font-sans">
                Fichas recentes
              </h2>
              {filteredPlans.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                  {filteredPlans.length}
                </span>
              )}
            </div>
            <Link
              href={`/consultoria/${consultancySlug}/rotinas`}
              className="text-xs text-[var(--brand)] font-semibold font-sans hover:underline"
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
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[38px]"
              />
              <SearchIcon className="w-3.5 h-3.5 text-[var(--text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                >
                  <XIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* List of Recent Plans */}
          <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] divide-y divide-[var(--border-subtle)] overflow-hidden shadow-2xs">
            {recentPlans && recentPlans.length > 0 ? (
              filteredPlans.length > 0 ? (
                // recentPlans.slice(0, 4) contract preserved for base slice
                (searchQuery ? filteredPlans : recentPlans.slice(0, 4)).map((plan) => {
                  const isArchived = plan.status === "ARCHIVED";
                  const isDraft = plan.status === "DRAFT";

                  return (
                    <Link
                      key={`mob-${plan.publicId}`}
                      href={`/consultoria/${consultancySlug}/rotinas/${plan.publicId}`}
                      className="p-3.5 flex items-center justify-between gap-3 active:bg-[var(--surface-hover)] transition-colors min-h-[56px] group"
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
                    Nenhuma ficha encontrada para &ldquo;{searchQuery}&rdquo;.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-xs font-bold text-emerald-600 hover:underline"
                  >
                    Limpar busca
                  </button>
                </div>
              )
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
        {/* 1. Hero Banner "Spotlight" - Painel Verde-Escuro Sólido Executivo */}
        <div className="relative overflow-hidden rounded-3xl border border-[#1e4738] bg-[#10271F] p-6 sm:p-7 shadow-sm transition-all text-white">
          {/* Top Row: Pill Badge + Context */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#18352C] border border-[#234e3e] text-[#80E8B3] text-xs font-bold tracking-wider uppercase">
                <span className="w-2 h-2 rounded-full animate-pulse bg-emerald-400" />
                <span>STUDIO DE PRESCRIÇÃO ATIVO</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-sans">
                Visão geral dos treinos
              </h1>
              <p className="text-xs sm:text-sm text-[#CBDDD3] font-sans leading-relaxed">
                {firstName ? `Olá, ${firstName}. ` : ""}Gerencie suas fichas e acompanhe seus alunos.
              </p>
            </div>

            {/* CTAs de Alto Impacto */}
            <div className="flex items-center gap-3 shrink-0">
              <Link href={`/consultoria/${consultancySlug}/rotinas/novo`}>
                <Button
                  variant="primary"
                  size="md"
                  className="font-bold text-sm rounded-xl px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all font-sans min-h-[44px] flex items-center gap-2"
                >
                  <PlusIcon className="w-4 h-4 stroke-[2.5]" />
                  <span>+ Nova ficha</span>
                </Button>
              </Link>
              <Link href={`/consultoria/${consultancySlug}/rotinas?action=import`}>
                <Button
                  variant="secondary"
                  size="md"
                  className="font-semibold text-sm rounded-xl px-4 py-2.5 bg-[#18352C] hover:bg-[#1B382D] border border-[#234e3e] hover:border-emerald-500/50 text-white transition-all font-sans min-h-[44px] flex items-center gap-2 active:scale-[0.98]"
                >
                  <SparklesIcon className="w-4 h-4 text-[#80E8B3]" />
                  <span>Importar treino</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Bento Strip Compacto (3 Cards Integrados Verde-Escuros Sólidos) */}
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-6 mt-6 border-t border-[#1e4738]">
            {/* Card 1: Alunos */}
            <Link
              href={`/consultoria/${consultancySlug}/progresso/alunos`}
              title="Alunos"
              className="p-4 rounded-2xl bg-[#18352C] hover:bg-[#1B382D] border border-[#234e3e] hover:border-emerald-500/50 transition-all group flex flex-col justify-between min-h-[96px] cursor-pointer text-white"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-[#10271F] border border-[#1e4738] text-[#80E8B3] flex items-center justify-center">
                  <UsersIcon className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-[#CBDDD3] group-hover:text-[#80E8B3] group-hover:translate-x-0.5 transition-all">
                  Ver alunos →
                </span>
              </div>
              <div className="pt-2">
                <span className="text-2xl sm:text-3xl font-black text-white group-hover:text-[#80E8B3] transition-colors font-sans tabular-nums leading-none block">
                  {displayStudents}
                </span>
                <span className="text-[11px] font-bold text-[#CBDDD3] uppercase tracking-wider block mt-1">
                  ALUNOS ATIVOS
                </span>
              </div>
            </Link>

            {/* Card 2: Fichas de Treino */}
            <Link
              href={`/consultoria/${consultancySlug}/rotinas`}
              title="Fichas de treino"
              className="p-4 rounded-2xl bg-[#18352C] hover:bg-[#1B382D] border border-[#234e3e] hover:border-emerald-500/50 transition-all group flex flex-col justify-between min-h-[96px] cursor-pointer text-white"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-[#10271F] border border-[#1e4738] text-[#80E8B3] flex items-center justify-center">
                  <DumbbellIcon className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-[#CBDDD3] group-hover:text-[#80E8B3] group-hover:translate-x-0.5 transition-all">
                  Ver todas →
                </span>
              </div>
              <div className="pt-2">
                <span className="text-2xl sm:text-3xl font-black text-white group-hover:text-[#80E8B3] transition-colors font-sans tabular-nums leading-none block">
                  {displayPlans}
                </span>
                <span className="text-[11px] font-bold text-[#CBDDD3] uppercase tracking-wider block mt-1">
                  Fichas de treino
                </span>
              </div>
            </Link>

            {/* Card 3: Volume Recente / Inteligência */}
            <Link
              href={`/consultoria/${consultancySlug}/rotinas?action=import`}
              title="Importar treino com IA"
              className="p-4 rounded-2xl bg-[#18352C] hover:bg-[#1B382D] border border-[#234e3e] hover:border-emerald-500/50 transition-all group flex flex-col justify-between min-h-[96px] cursor-pointer col-span-1 sm:col-span-2 lg:col-span-1 text-white"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-[#10271F] border border-[#1e4738] text-[#80E8B3] flex items-center justify-center">
                  <FlameIcon className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-[#CBDDD3] group-hover:text-[#80E8B3] group-hover:translate-x-0.5 transition-all">
                  Importar com IA →
                </span>
              </div>
              <div className="pt-2">
                <span className="text-2xl sm:text-3xl font-black text-white group-hover:text-[#80E8B3] transition-colors font-sans tabular-nums leading-none block">
                  {totalRecentBlocks > 0 ? `${totalRecentBlocks}` : "IA Studio"}
                </span>
                <span className="text-[11px] font-bold text-[#CBDDD3] uppercase tracking-wider block mt-1">
                  {totalRecentBlocks > 0 ? "Blocos Prescritos" : "Importador Rápido"}
                </span>
              </div>
            </Link>
          </div>
        </div>

        {/* 2. Trilho Estilo Netflix: "Em Destaque / Acesso Rápido" (Cards Verde-Escuros Sólidos) */}
        {recentPlans && recentPlans.length > 0 && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-xs">
                  <FlameIcon className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] font-sans tracking-tight">
                    Acesso rápido
                  </h2>
                </div>
              </div>

              {/* Botões de Navegação Lateral Suave */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => desktopRailRef.current?.scrollBy({ left: -320, behavior: "smooth" })}
                  aria-label="Rolar para esquerda"
                  className="w-8 h-8 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => desktopRailRef.current?.scrollBy({ left: 320, behavior: "smooth" })}
                  aria-label="Rolar para direita"
                  className="w-8 h-8 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Poster Cards Carrossel - Verde-Escuro Sólido */}
            <div
              ref={desktopRailRef}
              className="flex gap-3.5 overflow-x-auto snap-x snap-mandatory pb-2 no-scrollbar scroll-smooth"
            >
              {recentPlans.slice(0, 6).map((plan) => {
                const isDraft = plan.status === "DRAFT";
                const isArchived = plan.status === "ARCHIVED";
                const blocks = plan.blocksCount || 1;

                return (
                  <Link
                    key={`rail-${plan.publicId}`}
                    href={`/consultoria/${consultancySlug}/rotinas/${plan.publicId}`}
                    className="min-w-[270px] sm:min-w-[290px] max-w-[320px] snap-start shrink-0 group relative overflow-hidden rounded-2xl border border-[#1e4738] bg-[#10271F] p-4.5 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/50 hover:shadow-md flex flex-col justify-between min-h-[175px] cursor-pointer text-white"
                  >
                    <div className="space-y-2.5 relative z-10">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#18352C] text-[#CBDDD3] border border-[#234e3e]">
                          <DumbbellIcon className="w-3 h-3 text-[#80E8B3]" />
                          <span>{blocks} {blocks === 1 ? "bloco" : "blocos"}</span>
                        </span>
                        {isDraft && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Rascunho
                          </span>
                        )}
                        {isArchived && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-[#18352C] text-[#CBDDD3] border border-[#234e3e]">
                            Arquivada
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm sm:text-base font-bold text-white line-clamp-2 group-hover:text-[#80E8B3] transition-colors leading-snug">
                        {plan.title}
                      </h3>
                      {plan.subtitle && (
                        <p className="text-xs text-[#CBDDD3] truncate">
                          {plan.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Density indicator & CTA with explicit semantics */}
                    <div className="pt-3 border-t border-[#1e4738] space-y-2 mt-3 relative z-10">
                      <div className="flex items-center justify-between text-[11px] text-[#CBDDD3] font-medium">
                        <span>Densidade de blocos</span>
                        <span className="text-white font-bold">{blocks} {blocks === 1 ? "bloco" : "blocos"}</span>
                      </div>
                      {/* Segmented Density Bar */}
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((seg) => (
                          <div
                            key={seg}
                            className={`h-1 flex-1 rounded-full transition-all ${
                              seg <= blocks
                                ? "bg-emerald-400 group-hover:bg-emerald-300"
                                : "bg-[#18352C]"
                            }`}
                          />
                        ))}
                      </div>

                      <div className="flex items-center justify-between text-xs font-bold text-[#80E8B3] group-hover:text-emerald-300 transition-colors">
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
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] font-sans tracking-tight">
                Fichas recentes
              </h2>
              {filteredPlans.length > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                  {filteredPlans.length}
                </span>
              )}
            </div>

            <Link href={`/consultoria/${consultancySlug}/rotinas`}>
              <span className="text-xs text-[var(--brand)] font-semibold hover:underline font-sans cursor-pointer">
                Ver todas {totalPlans !== undefined && totalPlans !== null ? `(${totalPlans})` : ""} →
              </span>
            </Link>
          </div>

          {/* Search Bar + Chips Filter + View Mode Toggle */}
          {recentPlans && recentPlans.length > 0 && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-2 rounded-2xl bg-[var(--surface)] border border-[var(--border-default)]">
              {/* Input de Busca Instantânea */}
              <div className="relative flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar ficha por nome..."
                  className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl border border-[var(--border-default)] bg-[var(--surface-sunken)] text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[38px]"
                />
                <SearchIcon className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer"
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
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)]"
                  }`}
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("FEW_BLOCKS")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer min-h-[34px] ${
                    activeFilter === "FEW_BLOCKS"
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)]"
                  }`}
                >
                  Até 3 blocos
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("MANY_BLOCKS")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer min-h-[34px] ${
                    activeFilter === "MANY_BLOCKS"
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)]"
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
                        ? "bg-amber-500 text-white shadow-2xs"
                        : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)]"
                    }`}
                  >
                    Rascunhos
                  </button>
                )}

                {/* Alternador de Visualização (Lista vs Grade) */}
                <div className="flex items-center gap-1 pl-1 ml-1 border-l border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    aria-label="Ver em lista"
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer min-h-[34px] min-w-[34px] flex items-center justify-center ${
                      viewMode === "list"
                        ? "bg-[var(--surface-hover)] text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                        : "text-[var(--text-tertiary)] border-transparent hover:text-[var(--text-primary)]"
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
                        ? "bg-[var(--surface-hover)] text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                        : "text-[var(--text-tertiary)] border-transparent hover:text-[var(--text-primary)]"
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
                /* Rich Interactive Rows */
                <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] divide-y divide-[var(--border-subtle)] overflow-hidden shadow-2xs">
                  {/* recentPlans.slice(0, 6) preserved as base contract */}
                  {(searchQuery || activeFilter !== "ALL" ? filteredPlans : recentPlans.slice(0, 6)).map((plan) => {
                    const isArchived = plan.status === "ARCHIVED";
                    const isDraft = plan.status === "DRAFT";

                    return (
                      <Link
                        key={plan.publicId}
                        href={`/consultoria/${consultancySlug}/rotinas/${plan.publicId}`}
                        className="flex items-center justify-between p-4 sm:px-5 sm:py-3.5 hover:bg-[var(--surface-hover)] transition-colors group cursor-pointer min-h-[60px] relative"
                      >
                        {/* Hover Left Accent Line */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-r" />

                        {/* Left: Avatar Icon + Info */}
                        <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-4">
                          <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-white/[0.06] group-hover:border-emerald-500/30 group-hover:bg-emerald-500/10 flex items-center justify-center transition-colors shrink-0 text-zinc-300 group-hover:text-emerald-400">
                            <DumbbellIcon className="w-5 h-5" />
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm sm:text-base font-semibold text-[var(--text-primary)] group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate font-sans">
                                {plan.title}
                              </span>
                              {isDraft && (
                                <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-sans shrink-0">
                                  Rascunho
                                </span>
                              )}
                              {isArchived && (
                                <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-[var(--surface-subtle)] text-[var(--text-tertiary)] border border-[var(--border-subtle)] font-sans shrink-0">
                                  Arquivada
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-sans flex-wrap">
                              {plan.subtitle && <span className="truncate max-w-sm">{plan.subtitle}</span>}
                              {plan.subtitle && plan.blocksCount ? <span>•</span> : null}
                              {plan.blocksCount ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                                  {plan.blocksCount} {plan.blocksCount === 1 ? "bloco" : "blocos"}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        {/* Right: Quick Action Hint & Arrow */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="hidden sm:inline-block text-xs font-semibold text-zinc-400 group-hover:text-emerald-500 transition-colors">
                            Abrir ficha
                          </span>
                          <span className="text-sm text-[var(--text-tertiary)] group-hover:text-emerald-500 group-hover:translate-x-1 transition-all font-bold pr-1 select-none">
                            →
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                /* Grid Mode (Netflix Bento Grid) */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {(searchQuery || activeFilter !== "ALL" ? filteredPlans : recentPlans.slice(0, 6)).map((plan) => {
                    const isDraft = plan.status === "DRAFT";
                    const isArchived = plan.status === "ARCHIVED";
                    const blocks = plan.blocksCount || 1;

                    return (
                      <Link
                        key={`grid-${plan.publicId}`}
                        href={`/consultoria/${consultancySlug}/rotinas/${plan.publicId}`}
                        className="p-4 rounded-2xl bg-[#10271F] hover:bg-[#18352C] border border-[#1e4738] hover:border-emerald-500/50 transition-all group flex flex-col justify-between min-h-[140px] shadow-sm text-white cursor-pointer"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#18352C] text-[#CBDDD3] border border-[#234e3e]">
                              <DumbbellIcon className="w-3 h-3 text-[#80E8B3]" />
                              <span>{blocks} {blocks === 1 ? "bloco" : "blocos"}</span>
                            </span>
                            {isDraft && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Rascunho
                              </span>
                            )}
                            {isArchived && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-[#18352C] text-[#CBDDD3] border border-[#234e3e]">
                                Arquivada
                              </span>
                            )}
                          </div>

                          <h3 className="text-sm font-bold text-white group-hover:text-[#80E8B3] transition-colors line-clamp-2 mt-1">
                            {plan.title}
                          </h3>
                          {plan.subtitle && (
                            <p className="text-xs text-[#CBDDD3] truncate">
                              {plan.subtitle}
                            </p>
                          )}
                        </div>

                        <div className="pt-2 border-t border-[#1e4738] flex items-center justify-between text-xs font-semibold text-[#80E8B3] group-hover:text-emerald-300 transition-colors">
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
              <div className="p-8 sm:p-12 text-center rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] space-y-3">
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans">
                  Nenhuma ficha encontrada para &ldquo;{searchQuery}&rdquo;.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setActiveFilter("ALL");
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors cursor-pointer"
                  >
                    Limpar filtro
                  </button>
                  <Link
                    href={`/consultoria/${consultancySlug}/rotinas`}
                    className="text-xs font-semibold text-[var(--brand)] hover:underline"
                  >
                    Ver todas as fichas ({totalPlans})
                  </Link>
                </div>
              </div>
            )
          ) : (
            /* General Empty State */
            <div className="p-8 sm:p-12 text-center rounded-2xl bg-[var(--surface)] border border-[var(--border-default)] space-y-3 shadow-2xs">
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
    </>
  );
}
