"use client";

import React, { useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  isPlanActive,
  hasPlanDraftOrRevision,
} from "@/lib/nutrition-v2/plan-classification";
import { NutritionAssignModal } from "@/components/consultancies/nutrition-v2/nutrition-assign-modal";
import { NutritionDraftWarningModal } from "@/components/consultancies/nutrition-v2/nutrition-draft-warning-modal";

export interface NutritionPlanRow {
  publicId: string;
  title: string;
  studentName?: string | null;
  subtitle?: string | null;
  status: "ACTIVE" | "ARCHIVED" | "DRAFT" | "PUBLISHED" | string;
  planLifecycleStatus?: string;
  currentVersionStatus?: string;
  hasDraftRevision?: boolean;
  activeAssignmentsCount?: number;
  versionNumber?: number;
  updatedAt?: Date | string | null;
  mealsCount?: number;
  isTemplate?: boolean;
  publishedVersionPublicId?: string | null;
  publishedVersionNumber?: number | null;
}

export interface NutritionPlansTableProps {
  consultancySlug: string;
  plans?: NutritionPlanRow[];
  totalPlans?: number;
  isLoading?: boolean;
}

export type NutritionSortOption = "recent" | "oldest" | "name";
export type NutritionStatusFilterOption = "ALL" | "ACTIVE" | "DRAFT";

export function formatDate(val?: Date | string | null): string {
  if (!val) return "—";
  try {
    const d = typeof val === "string" ? new Date(val) : val;
    if (Number.isNaN(d.getTime())) return "—";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "—";
  }
}

export function resolvePatientDisplay(p: NutritionPlanRow): string {
  if (p.studentName && p.studentName.trim()) {
    return p.studentName.trim();
  }
  if (p.isTemplate) {
    return "Modelo";
  }
  return "Sem paciente";
}

export function formatMealsCount(mealsCount?: number | null): string {
  if (typeof mealsCount === "number" && !isNaN(mealsCount) && mealsCount > 0) {
    return `${mealsCount} ${mealsCount === 1 ? "refeição" : "refeições"}`;
  }
  return "—";
}

function getInitials(name: string): string {
  const clean = name.trim();
  if (!clean) return "PL";
  const parts = clean.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export interface FilterAndSortNutritionPlansParams {
  plans: NutritionPlanRow[];
  searchTerm: string;
  statusFilter: NutritionStatusFilterOption;
  sortBy: NutritionSortOption;
}

export function filterAndSortNutritionPlans({
  plans,
  searchTerm,
  statusFilter,
  sortBy,
}: FilterAndSortNutritionPlansParams): NutritionPlanRow[] {
  let result = [...plans];

  // 1. Busca textual (nome do plano ou paciente)
  if (searchTerm.trim()) {
    const q = searchTerm.trim().toLowerCase();
    result = result.filter((p) => {
      const titleMatch = (p.title || "").toLowerCase().includes(q);
      const subtitleMatch = (p.subtitle || "").toLowerCase().includes(q);
      const patient = resolvePatientDisplay(p).toLowerCase();
      const patientMatch = patient.includes(q);
      return titleMatch || subtitleMatch || patientMatch;
    });
  }

  // 2. Filtro por situação
  if (statusFilter !== "ALL") {
    result = result.filter((p) => {
      const hasDraft = hasPlanDraftOrRevision(p);
      const active = isPlanActive(p);

      if (statusFilter === "DRAFT") return hasDraft;
      if (statusFilter === "ACTIVE") return active;
      return true;
    });
  }

  // 3. Ordenação
  result.sort((a, b) => {
    if (sortBy === "name") {
      return (a.title || "").localeCompare(b.title || "", "pt-BR", { sensitivity: "base" });
    }
    const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;

    if (sortBy === "oldest") {
      return timeA - timeB;
    }
    return timeB - timeA;
  });

  return result;
}

export function NutritionPlansTable({
  consultancySlug,
  plans = [],
  totalPlans,
  isLoading = false,
}: NutritionPlansTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<NutritionSortOption>("recent");
  const [statusFilter, setStatusFilter] = useState<NutritionStatusFilterOption>("ALL");

  // Assignment & Draft Warning states
  const [assignPlan, setAssignPlan] = useState<NutritionPlanRow | null>(null);
  const [draftWarningPlan, setDraftWarningPlan] = useState<NutritionPlanRow | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);

  // Mobile Touch Scroll Guard
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const isScrollingRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    isScrollingRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    if (deltaX > 10 || deltaY > 10) {
      isScrollingRef.current = true;
    }
  };

  const handleCardClick = (publicId: string) => {
    if (isScrollingRef.current) return;
    router.push(`/consultoria/${consultancySlug}/planos-v2/${publicId}`);
  };

  const handleOpenSendPlan = (plan: NutritionPlanRow) => {
    if (!plan.publishedVersionPublicId) {
      setDraftWarningPlan(plan);
    } else {
      setAssignPlan(plan);
    }
  };

  const filteredPlans = useMemo(() => {
    return filterAndSortNutritionPlans({
      plans,
      searchTerm,
      statusFilter,
      sortBy,
    });
  }, [plans, searchTerm, statusFilter, sortBy]);

  if (isLoading) {
    return (
      <section aria-label="Planos alimentares" className="w-full space-y-4">
        <h2 className="text-base sm:text-lg font-bold text-[#17191D] dark:text-white">
          Planos alimentares
        </h2>
        <div className="bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#303238] rounded-2xl p-5 space-y-3 animate-pulse">
          <div className="h-10 bg-[#F3F4F6] dark:bg-[#1B1D21] rounded w-full" />
          <div className="h-12 bg-[#F3F4F6] dark:bg-[#1B1D21] rounded w-full" />
        </div>
      </section>
    );
  }

  return (
    <section id="planos-alimentares" aria-label="Planos alimentares" className="w-full space-y-3.5">
      {/* 1. Header e Controles da Seção */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#303238] shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <h2 className="text-base sm:text-lg font-bold text-[#17191D] dark:text-white leading-tight">
              Planos alimentares
            </h2>
            <span className="text-xs text-[#6B7280] dark:text-[#8E95A2] font-semibold tabular-nums font-mono">
              ({totalPlans !== undefined ? totalPlans : plans.length})
            </span>
          </div>

          {/* Filtros e Ordenação */}
          <div className="flex flex-wrap items-center gap-2 max-w-full">
            {/* Seletor de Ordenação */}
            <div className="flex items-center gap-1.5 text-xs text-[#6B7280] dark:text-[#8E95A2] shrink-0 font-medium">
              <span className="hidden sm:inline">Ordem:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as NutritionSortOption)}
                className="min-h-[44px] px-3 bg-[#F9FAFB] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] rounded-xl text-xs font-semibold text-[#17191D] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#10B981] cursor-pointer"
                aria-label="Critério de ordenação dos planos"
              >
                <option value="recent">Atualizados recentemente</option>
                <option value="oldest">Mais antigos</option>
                <option value="name">Ordem alfabética (A-Z)</option>
              </select>
            </div>

            {/* Filtros Rápidos de Status */}
            <div className="inline-flex flex-wrap rounded-xl p-1 bg-[#F3F4F6] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] max-w-full">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 min-h-[36px] flex items-center justify-center text-xs font-semibold rounded-lg transition-all select-none cursor-pointer whitespace-nowrap shrink-0 ${
                  statusFilter === "ALL"
                    ? "bg-white dark:bg-[#282B32] text-[#17191D] dark:text-white border border-[#D1D5DB] dark:border-[#3E424B] shadow-xs"
                    : "text-[#374151] hover:text-[#111827] dark:text-[#C2C8CF] dark:hover:text-white"
                } active:translate-y-[1px]`}
              >
                Todos status
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("ACTIVE")}
                className={`px-3 min-h-[36px] flex items-center justify-center text-xs font-semibold rounded-lg transition-all select-none cursor-pointer whitespace-nowrap shrink-0 ${
                  statusFilter === "ACTIVE"
                    ? "bg-white dark:bg-[#282B32] text-[#17191D] dark:text-white border border-[#D1D5DB] dark:border-[#3E424B] shadow-xs"
                    : "text-[#374151] hover:text-[#111827] dark:text-[#C2C8CF] dark:hover:text-white"
                } active:translate-y-[1px]`}
              >
                Ativos
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("DRAFT")}
                className={`px-3 min-h-[36px] flex items-center justify-center text-xs font-semibold rounded-lg transition-all select-none cursor-pointer whitespace-nowrap shrink-0 ${
                  statusFilter === "DRAFT"
                    ? "bg-white dark:bg-[#282B32] text-[#17191D] dark:text-white border border-[#D1D5DB] dark:border-[#3E424B] shadow-xs"
                    : "text-[#374151] hover:text-[#111827] dark:text-[#C2C8CF] dark:hover:text-white"
                } active:translate-y-[1px]`}
              >
                Com rascunho
              </button>
            </div>
          </div>
        </div>

        {/* Campo de Busca (font >= 16px no mobile evita zoom automático no iOS) */}
        <div className="w-full">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome do plano ou paciente..."
              className="w-full h-[44px] pl-9 pr-12 text-base sm:text-sm font-medium bg-[#F9FAFB] dark:bg-[#1B1D21] border border-[#E5E7EB] dark:border-[#303238] rounded-xl text-[#17191D] dark:text-white placeholder:text-[#9CA3AF] dark:placeholder:text-[#8E95A2] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
            />
            <svg
              className="w-4 h-4 text-[#9CA3AF] dark:text-[#8E95A2] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            {searchTerm.trim().length > 0 && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                aria-label="Limpar busca"
                className="absolute right-0 top-0 h-full w-[44px] min-h-[44px] min-w-[44px] flex items-center justify-center rounded-r-xl text-[#9CA3AF] dark:text-[#8E95A2] hover:text-[#17191D] dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Visualização dos Planos: Tabela Desktop / Cards Mobile */}
      {filteredPlans.length === 0 ? (
        <div className="p-8 rounded-2xl bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#303238] text-center space-y-2">
          <p className="text-sm font-semibold text-[#17191D] dark:text-white">
            Nenhum plano alimentar encontrado
          </p>
          <p className="text-xs text-[#6B7280] dark:text-[#8E95A2]">
            {searchTerm.trim() || statusFilter !== "ALL"
              ? "Tente ajustar seus termos de busca ou remover os filtros ativos."
              : "Nenhum plano alimentar cadastrado ainda."}
          </p>
          {!searchTerm.trim() && statusFilter === "ALL" && (
            <Link
              href={`/consultoria/${consultancySlug}/planos-v2/novo`}
              prefetch={false}
              className="inline-flex mt-2 px-5 min-h-[44px] items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs active:translate-y-[1px] transition-colors cursor-pointer"
            >
              + Criar primeiro plano alimentar
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* VISÃO DESKTOP: TABELA DE 6 COLUNAS */}
          <div className="hidden md:block bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#303238] rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#F9FAFB] dark:bg-[#1B1D21] border-b border-[#E5E7EB] dark:border-[#303238]">
                <tr>
                  <th scope="col" className="py-3 px-4 text-xs font-bold text-[#4B5563] dark:text-[#8E95A2] uppercase tracking-wider">
                    Paciente
                  </th>
                  <th scope="col" className="py-3 px-4 text-xs font-bold text-[#4B5563] dark:text-[#8E95A2] uppercase tracking-wider">
                    Plano alimentar
                  </th>
                  <th scope="col" className="py-3 px-4 text-xs font-bold text-[#4B5563] dark:text-[#8E95A2] uppercase tracking-wider">
                    Refeições
                  </th>
                  <th scope="col" className="py-3 px-4 text-xs font-bold text-[#4B5563] dark:text-[#8E95A2] uppercase tracking-wider">
                    Atualizado em
                  </th>
                  <th scope="col" className="py-3 px-4 text-xs font-bold text-[#4B5563] dark:text-[#8E95A2] uppercase tracking-wider">
                    Situação
                  </th>
                  <th scope="col" className="py-3 px-4 text-xs font-bold text-[#4B5563] dark:text-[#8E95A2] uppercase tracking-wider text-right">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#303238]">
                {filteredPlans.map((plan) => {
                  const hasDraft = hasPlanDraftOrRevision(plan);
                  const active = isPlanActive(plan);
                  const patientDisplay = resolvePatientDisplay(plan);

                  return (
                    <tr
                      key={plan.publicId}
                      className="h-auto min-h-[52px] hover:bg-[#F9FAFB] dark:hover:bg-[#1B1D21]/50 transition-colors"
                    >
                      {/* PACIENTE */}
                      <td className="py-3.5 px-4 text-sm font-semibold text-[#17191D] dark:text-white break-words">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-[#1B1D21] border border-slate-200 dark:border-[#303238] flex items-center justify-center text-[10px] font-bold text-slate-800 dark:text-white shrink-0">
                            {getInitials(patientDisplay)}
                          </div>
                          <span className="truncate">{patientDisplay}</span>
                        </div>
                      </td>

                      {/* PLANO ALIMENTAR */}
                      <td className="py-3.5 px-4 text-sm font-bold text-[#17191D] dark:text-white max-w-xs break-words">
                        <div>
                          <p className="truncate">{plan.title}</p>
                          {plan.subtitle && (
                            <p className="text-xs text-[#6B7280] dark:text-[#8E95A2] font-normal truncate">
                              {plan.subtitle}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* REFEIÇÕES */}
                      <td className="py-3.5 px-4 text-xs font-bold text-emerald-700 dark:text-[#10B981] tabular-nums font-mono">
                        {formatMealsCount(plan.mealsCount)}
                      </td>

                      {/* ATUALIZADO EM */}
                      <td className="py-3.5 px-4 text-xs font-normal text-[#4B5563] dark:text-[#C2C8CF] tabular-nums font-mono">
                        {formatDate(plan.updatedAt)}
                      </td>

                      {/* SITUAÇÃO */}
                      <td className="py-3.5 px-4">
                        {hasDraft ? (
                          <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20 dark:border-amber-500/30 select-none">
                            {active ? "Com rascunho" : "Rascunho"}
                          </span>
                        ) : active ? (
                          <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 dark:border-emerald-500/30 select-none">
                            Ativo
                          </span>
                        ) : plan.status === "ARCHIVED" ? (
                          <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20 select-none">
                            Arquivado
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20 select-none">
                            Encerrado
                          </span>
                        )}
                      </td>

                      {/* AÇÕES */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenSendPlan(plan);
                            }}
                            className="inline-flex items-center justify-center min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-xs select-none cursor-pointer"
                          >
                            Enviar plano
                          </button>
                          <Link
                            href={`/consultoria/${consultancySlug}/planos-v2/${plan.publicId}`}
                            prefetch={false}
                            className="inline-flex items-center justify-center min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold text-[#374151] dark:text-[#C2C8CF] bg-[#F3F4F6] dark:bg-[#1B1D21] hover:bg-[#E5E7EB] dark:hover:bg-[#252830] border border-[#D1D5DB] dark:border-[#303238] transition-colors select-none cursor-pointer"
                          >
                            Editar plano
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* VISÃO MOBILE: CARDS COM TOQUE DIRETO E BOTÃO DE AÇÃO */}
          <div className="md:hidden bg-white dark:bg-[#151619] border border-[#E5E7EB] dark:border-[#303238] rounded-2xl divide-y divide-[#E5E7EB] dark:divide-[#303238] overflow-hidden shadow-xs">
            {filteredPlans.map((plan) => {
              const hasDraft = hasPlanDraftOrRevision(plan);
              const active = isPlanActive(plan);
              const patientDisplay = resolvePatientDisplay(plan);

              return (
                <div
                  key={plan.publicId}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onClick={() => handleCardClick(plan.publicId)}
                  className="p-4 min-h-[72px] flex flex-col justify-between gap-3 active:bg-[#F3F4F6] dark:active:bg-[#1B1D21]/60 cursor-pointer transition-colors relative"
                  role="button"
                  tabIndex={0}
                  aria-label={`Abrir plano ${plan.title}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/consultoria/${consultancySlug}/planos-v2/${plan.publicId}`);
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-[#1B1D21] border border-slate-200 dark:border-[#303238] flex items-center justify-center text-[10px] font-bold text-slate-800 dark:text-white shrink-0">
                          {getInitials(patientDisplay)}
                        </div>
                        <span className="text-xs font-semibold text-[#17191D] dark:text-white truncate">
                          {patientDisplay}
                        </span>
                      </div>

                      <p className="text-sm font-bold text-[#17191D] dark:text-white leading-snug break-words">
                        {plan.title}
                      </p>

                      <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#4B5563] dark:text-[#C2C8CF] font-medium">
                        <span className="tabular-nums font-bold text-emerald-700 dark:text-[#10B981] font-mono">
                          {formatMealsCount(plan.mealsCount)}
                        </span>
                        <span>·</span>
                        <span className="tabular-nums font-mono">
                          {formatDate(plan.updatedAt)}
                        </span>
                      </div>
                    </div>

                    {hasDraft ? (
                      <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20 dark:border-amber-500/30 shrink-0 select-none">
                        {active ? "Com rascunho" : "Rascunho"}
                      </span>
                    ) : active ? (
                      <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 dark:border-emerald-500/30 shrink-0 select-none">
                        Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/20 shrink-0 select-none">
                        {plan.status === "ARCHIVED" ? "Arquivado" : "Encerrado"}
                      </span>
                    )}
                  </div>

                  {/* Linha de Ação Mobile (alvo mínimo de toque >= 44px) */}
                  <div className="pt-2.5 flex items-center justify-between gap-2 border-t border-[#F3F4F6] dark:border-[#222429]">
                    <div className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] truncate">
                      {hasDraft ? (
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          Rascunho em edição
                        </span>
                      ) : active ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          Plano ativo
                        </span>
                      ) : (
                        <span className="text-slate-500 font-medium">
                          Histórico
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenSendPlan(plan);
                        }}
                        className="inline-flex items-center justify-center px-3.5 py-2 min-h-[44px] rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-xs select-none cursor-pointer"
                      >
                        Enviar plano
                      </button>
                      <Link
                        href={`/consultoria/${consultancySlug}/planos-v2/${plan.publicId}`}
                        prefetch={false}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center justify-center px-3 py-2 min-h-[44px] rounded-lg text-xs font-semibold text-[#374151] dark:text-[#C2C8CF] bg-[#F3F4F6] dark:bg-[#1B1D21] hover:bg-[#E5E7EB] dark:hover:bg-[#252830] border border-[#D1D5DB] dark:border-[#303238] transition-colors shadow-xs select-none cursor-pointer"
                      >
                        Editar plano
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Feedback Toast */}
      {successFeedback && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span>{successFeedback}</span>
        </div>
      )}

      {/* Modal de Atribuição / Envio */}
      {assignPlan && assignPlan.publishedVersionPublicId && (
        <NutritionAssignModal
          slug={consultancySlug}
          planPublicId={assignPlan.publicId}
          planTitle={assignPlan.title}
          versionPublicId={assignPlan.publishedVersionPublicId}
          versionNumber={assignPlan.publishedVersionNumber || assignPlan.versionNumber || 1}
          isOpen={true}
          onClose={() => setAssignPlan(null)}
          onSuccess={() => {
            setAssignPlan(null);
            setSuccessFeedback("Plano alimentar enviado com sucesso!");
            setTimeout(() => setSuccessFeedback(null), 4000);
            router.refresh();
          }}
        />
      )}

      {/* Modal de Aviso de Rascunho Não Publicado */}
      {draftWarningPlan && (
        <NutritionDraftWarningModal
          isOpen={true}
          onClose={() => setDraftWarningPlan(null)}
          planTitle={draftWarningPlan.title}
          editorHref={`/consultoria/${consultancySlug}/planos-v2/${draftWarningPlan.publicId}`}
        />
      )}
    </section>
  );
}
