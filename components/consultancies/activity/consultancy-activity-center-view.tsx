"use client";

import React, { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  type ActivityEventRow,
  formatActivityEventNaturalSentence,
} from "@/lib/consultancies/activity-formatters";
import { AdminExecutiveHeader } from "@/components/admin/admin-executive-header";

interface Props {
  consultancySlug?: string;
  initialEvents: ActivityEventRow[];
  totalEvents: number;
  initialFilters: {
    period?: string;
    role?: string;
    module?: string;
    action?: string;
    search?: string;
  };
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  CONSULTANCY_ADMIN: { label: "Administrador", color: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20" },
  ADMIN: { label: "Administrador", color: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20" },
  PERSONAL: { label: "Personal", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
  NUTRITIONIST: { label: "Nutricionista", color: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" },
  STUDENT: { label: "Aluno", color: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20" },
  INFLUENCER: { label: "Influenciador", color: "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20" },
  PLATFORM_ADMIN: { label: "Plataforma", color: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20" },
};

function renderModuleIcon(mod: string) {
  switch (mod) {
    case "AUTH":
      return (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      );
    case "MEMBERS":
      return (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
    case "STUDENT":
      return (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    case "PERSONAL":
      return (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    case "NUTRITION":
      return (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
      );
    case "FORMS":
      return (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      );
    case "CONSULTATIONS":
      return (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      );
    case "FILES":
      return (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
        </svg>
      );
    case "AI":
      return (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      );
    case "ADMIN":
    default:
      return (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
  }
}

const MODULE_NAMES: Record<string, string> = {
  AUTH: "Autenticação",
  MEMBERS: "Membros",
  STUDENT: "Aluno",
  PERSONAL: "Treinos",
  NUTRITION: "Nutrição",
  FORMS: "Formulários",
  CONSULTATIONS: "Consultas",
  FILES: "Arquivos",
  AI: "Inteligência Artificial",
  ADMIN: "Gestão",
};

export function ConsultancyActivityCenterView({
  consultancySlug,
  initialEvents,
  totalEvents,
  initialFilters,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [period, setPeriod] = useState(initialFilters.period || "ALL");
  const [role, setRole] = useState(initialFilters.role || "ALL");
  const [selectedModule, setSelectedModule] = useState(initialFilters.module || "ALL");
  const [searchTerm, setSearchTerm] = useState(initialFilters.search || "");
  const [selectedEvent, setSelectedEvent] = useState<ActivityEventRow | null>(null);
  const [viewMode, setViewMode] = useState<"TIMELINE" | "TABLE">("TIMELINE");

  const applyFilters = (newFilters: {
    period?: string;
    role?: string;
    module?: string;
    search?: string;
  }) => {
    const params = new URLSearchParams(searchParams?.toString() || "");

    const p = newFilters.period !== undefined ? newFilters.period : period;
    const r = newFilters.role !== undefined ? newFilters.role : role;
    const m = newFilters.module !== undefined ? newFilters.module : selectedModule;
    const s = newFilters.search !== undefined ? newFilters.search : searchTerm;

    if (p && p !== "ALL") params.set("period", p);
    else params.delete("period");

    if (r && r !== "ALL") params.set("role", r);
    else params.delete("role");

    if (m && m !== "ALL") params.set("module", m);
    else params.delete("module");

    if (s && s.trim()) params.set("search", s.trim());
    else params.delete("search");

    params.delete("page");

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handlePeriodChange = (val: string) => {
    setPeriod(val);
    applyFilters({ period: val });
  };

  const handleRoleChange = (val: string) => {
    setRole(val);
    applyFilters({ role: val });
  };

  const handleModuleChange = (val: string) => {
    setSelectedModule(val);
    applyFilters({ module: val });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters({ search: searchTerm });
  };

  const formatTimeOnly = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    } catch {
      return "--:--";
    }
  };

  const formatFullDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    } catch {
      return isoString;
    }
  };

  const getDayBucket = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      if (d.toDateString() === today.toDateString()) return "Hoje";
      if (d.toDateString() === yesterday.toDateString()) return "Ontem";

      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(d);
    } catch {
      return "Outros";
    }
  };

  // Group events by day bucket for timeline view
  const groupedEvents: Record<string, ActivityEventRow[]> = {};
  for (const evt of initialEvents) {
    const bucket = getDayBucket(evt.created_at);
    if (!groupedEvents[bucket]) groupedEvents[bucket] = [];
    groupedEvents[bucket].push(evt);
  }

  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const hasActiveFilters = period !== "ALL" || role !== "ALL" || selectedModule !== "ALL" || Boolean(searchTerm.trim());

  return (
    <div className="space-y-6 pb-12">
      {/* Executive Header */}
      <AdminExecutiveHeader
        eyebrow="● ADMINISTRAÇÃO · AUDITORIA"
        title="Central de atividades"
        subtitle="Acompanhe com transparência e rastreabilidade tudo o que acontece na consultoria."
        backHref={consultancySlug ? `/consultoria/${consultancySlug}` : undefined}
        backLabel="Voltar ao Painel"
        badge={`${totalEvents} ${totalEvents === 1 ? "evento" : "eventos"}`}
        badgeVariant="neutral"
      >
        <div className="flex items-center justify-between sm:justify-end gap-3 w-full border-t border-[#303238] pt-3 mt-1">
          {/* View toggle */}
          <div className="flex items-center bg-[#1B1D21] p-1 rounded-xl border border-[#303238] text-xs">
            <button
              type="button"
              onClick={() => setViewMode("TIMELINE")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                viewMode === "TIMELINE"
                  ? "bg-zinc-800 text-white shadow-xs"
                  : "text-[#8E95A2] hover:text-white"
              }`}
            >
              Linha do Tempo
            </button>
            <button
              type="button"
              onClick={() => setViewMode("TABLE")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                viewMode === "TABLE"
                  ? "bg-zinc-800 text-white shadow-xs"
                  : "text-[#8E95A2] hover:text-white"
              }`}
            >
              Tabela
            </button>
          </div>
        </div>
      </AdminExecutiveHeader>

      {/* Compact Filters Bar (Desktop) */}
      <div className="hidden md:block bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] rounded-2xl p-4 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por usuário, aluno, ação ou resumo..."
              className="w-full bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200 dark:border-[#303238] rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-[#8E95A2] focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[40px]"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  applyFilters({ search: "" });
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Compact Dropdowns in same line */}
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={period}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200 dark:border-[#303238] rounded-xl px-3 py-2.5 text-xs text-zinc-800 dark:text-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[40px]"
            >
              <option value="ALL">Todo período</option>
              <option value="TODAY">Hoje</option>
              <option value="WEEK">Últimos 7 dias</option>
              <option value="MONTH">Últimos 30 dias</option>
            </select>

            <select
              value={role}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200 dark:border-[#303238] rounded-xl px-3 py-2.5 text-xs text-zinc-800 dark:text-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[40px]"
            >
              <option value="ALL">Todas funções</option>
              <option value="CONSULTANCY_ADMIN">Administrador</option>
              <option value="PERSONAL">Personal</option>
              <option value="NUTRITIONIST">Nutricionista</option>
              <option value="STUDENT">Aluno</option>
            </select>

            <select
              value={selectedModule}
              onChange={(e) => handleModuleChange(e.target.value)}
              className="bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200 dark:border-[#303238] rounded-xl px-3 py-2.5 text-xs text-zinc-800 dark:text-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[40px]"
            >
              <option value="ALL">Todos módulos</option>
              <option value="PERSONAL">Treinos</option>
              <option value="NUTRITION">Nutrição</option>
              <option value="AI">IA</option>
              <option value="STUDENT">Alunos</option>
              <option value="MEMBERS">Equipe</option>
              <option value="ADMIN">Gestão</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm min-h-[40px] cursor-pointer"
            >
              Filtrar
            </button>
          </div>
        </form>
      </div>

      {/* Mobile Search & Filter Action Bar */}
      <div className="md:hidden flex items-center gap-2">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar atividade..."
            className="w-full bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] rounded-xl px-3 py-2.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-[#8E95A2] focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[40px]"
          />
        </form>
        <button
          type="button"
          onClick={() => setIsMobileFilterOpen(true)}
          className="px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-[#303238] bg-white dark:bg-[#151619] text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1.5 shrink-0 shadow-sm min-h-[40px]"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span>Filtros</span>
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          )}
        </button>
      </div>

      {/* Mobile Filter Bottom Sheet / Modal */}
      {isMobileFilterOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setIsMobileFilterOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] rounded-t-3xl sm:rounded-2xl p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-[#303238] pb-3">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Filtros da Central</h3>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 dark:text-[#8E95A2] uppercase tracking-wider mb-1">Período</label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200 dark:border-[#303238] rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white min-h-[44px]"
                >
                  <option value="ALL">Todo período</option>
                  <option value="TODAY">Hoje</option>
                  <option value="WEEK">Últimos 7 dias</option>
                  <option value="MONTH">Últimos 30 dias</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 dark:text-[#8E95A2] uppercase tracking-wider mb-1">Função / Papel</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200 dark:border-[#303238] rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white min-h-[44px]"
                >
                  <option value="ALL">Todas funções</option>
                  <option value="CONSULTANCY_ADMIN">Administrador</option>
                  <option value="PERSONAL">Personal</option>
                  <option value="NUTRITIONIST">Nutricionista</option>
                  <option value="STUDENT">Aluno</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 dark:text-[#8E95A2] uppercase tracking-wider mb-1">Módulo</label>
                <select
                  value={selectedModule}
                  onChange={(e) => setSelectedModule(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-[#1B1D21] border border-zinc-200 dark:border-[#303238] rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white min-h-[44px]"
                >
                  <option value="ALL">Todos módulos</option>
                  <option value="PERSONAL">Treinos</option>
                  <option value="NUTRITION">Nutrição</option>
                  <option value="AI">IA</option>
                  <option value="STUDENT">Alunos</option>
                  <option value="MEMBERS">Equipe</option>
                  <option value="ADMIN">Gestão</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-zinc-100 dark:border-[#303238]">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setPeriod("ALL");
                    setRole("ALL");
                    setSelectedModule("ALL");
                    setSearchTerm("");
                    applyFilters({ period: "ALL", role: "ALL", module: "ALL", search: "" });
                    setIsMobileFilterOpen(false);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-[#303238] text-xs font-semibold text-zinc-700 dark:text-zinc-200 min-h-[44px]"
                >
                  Limpar
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  applyFilters({ period, role, module: selectedModule, search: searchTerm });
                  setIsMobileFilterOpen(false);
                }}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 min-h-[44px]"
              >
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {initialEvents.length === 0 ? (
        <div className="bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] rounded-2xl p-12 text-center space-y-3 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-[#1B1D21] text-zinc-400 dark:text-[#8E95A2] flex items-center justify-center mx-auto">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">Nenhuma atividade registrada</h3>
          <p className="text-xs text-zinc-500 dark:text-[#8E95A2] max-w-sm mx-auto">
            Nenhuma ação encontrada com os filtros selecionados. Altere os filtros ou aguarde novas atividades na consultoria.
          </p>
        </div>
      ) : viewMode === "TIMELINE" ? (
        /* Timeline View */
        <div className="space-y-6">
          {Object.entries(groupedEvents).map(([dayBucket, events]) => (
            <div key={dayBucket} className="space-y-2.5">
              {/* Day header */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider bg-zinc-100 dark:bg-[#1B1D21] px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-[#303238]">
                  {dayBucket}
                </span>
                <div className="h-px flex-1 bg-zinc-200 dark:bg-[#303238]" />
              </div>

              {/* Event cards */}
              <div className="space-y-2">
                {events.map((evt) => {
                  const { fullSentence } = formatActivityEventNaturalSentence(evt);
                  const roleConfig = ROLE_LABELS[evt.actor_role] || {
                    label: evt.actor_role,
                    color: "bg-zinc-100 dark:bg-[#1B1D21] text-zinc-600 dark:text-[#8E95A2] border-zinc-200 dark:border-[#303238]",
                  };
                  const modName = MODULE_NAMES[evt.module] || evt.module;

                  return (
                    <div
                      key={evt.public_id}
                      onClick={() => setSelectedEvent(evt)}
                      className="bg-white dark:bg-[#151619] hover:bg-zinc-50/80 dark:hover:bg-[#1B1D21] border border-zinc-200 dark:border-[#303238] hover:border-zinc-300 dark:hover:border-[#40434C] rounded-xl p-3 sm:p-3.5 transition cursor-pointer shadow-sm group flex items-start gap-3"
                    >
                      {/* Time pill */}
                      <div className="shrink-0 font-mono text-xs font-semibold text-zinc-500 dark:text-[#8E95A2] pt-0.5">
                        {formatTimeOnly(evt.created_at)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm text-zinc-900 dark:text-white leading-relaxed">
                          {fullSentence}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${roleConfig.color}`}
                          >
                            {roleConfig.label}
                          </span>
                          <span className="text-[11px] text-zinc-500 dark:text-[#8E95A2] flex items-center gap-1">
                            <span className="text-zinc-400 dark:text-[#8E95A2]">{renderModuleIcon(evt.module)}</span>
                            <span>{modName}</span>
                          </span>
                        </div>
                      </div>

                      {/* Detail CTA */}
                      <div className="shrink-0 text-xs text-zinc-400 dark:text-[#8E95A2] group-hover:text-zinc-700 dark:group-hover:text-white pt-0.5 font-bold">
                        ›
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white dark:bg-[#151619] border border-zinc-200 dark:border-[#303238] rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-[#1B1D21] border-b border-zinc-200 dark:border-[#303238] text-zinc-500 dark:text-[#8E95A2] uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Data / Hora</th>
                  <th className="py-3 px-4">Ator</th>
                  <th className="py-3 px-4">Função</th>
                  <th className="py-3 px-4">Módulo</th>
                  <th className="py-3 px-4">Descrição da Atividade</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-[#303238]">
                {initialEvents.map((evt) => {
                  const { actor, fullSentence } = formatActivityEventNaturalSentence(evt);
                  const roleConfig = ROLE_LABELS[evt.actor_role] || {
                    label: evt.actor_role,
                    color: "bg-zinc-100 dark:bg-[#1B1D21] text-zinc-600 dark:text-[#8E95A2] border-zinc-200 dark:border-[#303238]",
                  };
                  const modName = MODULE_NAMES[evt.module] || evt.module;

                  return (
                    <tr
                      key={evt.public_id}
                      onClick={() => setSelectedEvent(evt)}
                      className="hover:bg-zinc-50/50 dark:hover:bg-[#1B1D21]/50 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 whitespace-nowrap text-zinc-500 dark:text-[#8E95A2] font-mono text-[11px]">
                        {formatFullDate(evt.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-zinc-900 dark:text-white">{actor}</div>
                        <div className="text-[10px] text-zinc-500 dark:text-[#8E95A2] truncate max-w-[140px]">
                          {evt.actor_email}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${roleConfig.color}`}
                        >
                          {roleConfig.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-300">
                          <span className="text-zinc-400 dark:text-[#8E95A2]">{renderModuleIcon(evt.module)}</span>
                          <span>{modName}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-md text-zinc-800 dark:text-zinc-200">
                        {fullSentence}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          className="px-2.5 py-1 bg-zinc-100 dark:bg-[#1B1D21] group-hover:bg-zinc-200 dark:group-hover:bg-[#252830] text-zinc-800 dark:text-zinc-200 rounded text-[11px] font-medium transition cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(evt);
                          }}
                        >
                          Detalhes
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Event Details Drawer */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex justify-end animate-in fade-in duration-150"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-[#151619] border-l border-zinc-200 dark:border-[#303238] h-full overflow-y-auto p-6 space-y-6 shadow-2xl animate-in slide-in-from-right duration-200 text-zinc-900 dark:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-start justify-between border-b border-zinc-100 dark:border-[#303238] pb-4">
              <div>
                <span className="text-xs font-mono text-zinc-400 dark:text-[#8E95A2]">
                  ID: {selectedEvent.public_id}
                </span>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white mt-1">
                  Detalhes da Atividade
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-[#1B1D21] text-zinc-400 hover:text-zinc-900 dark:hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Sentence Summary Callout */}
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-medium leading-relaxed">
              {formatActivityEventNaturalSentence(selectedEvent).fullSentence}
            </div>

            {/* Details Grid */}
            <div className="space-y-4 text-xs">
              {/* Quem */}
              <div className="grid grid-cols-3 gap-2 py-2 border-b border-zinc-100 dark:border-[#303238]">
                <span className="text-zinc-500 dark:text-[#8E95A2] font-medium">Quem realizou</span>
                <div className="col-span-2">
                  <div className="font-semibold text-zinc-900 dark:text-white">
                    {selectedEvent.actor_name || "Usuário"}
                  </div>
                  {selectedEvent.actor_email && (
                    <div className="text-zinc-500 dark:text-[#8E95A2] text-[11px]">
                      {selectedEvent.actor_email}
                    </div>
                  )}
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                        ROLE_LABELS[selectedEvent.actor_role]?.color || "bg-zinc-100 dark:bg-[#1B1D21] text-zinc-600 dark:text-[#8E95A2] border-zinc-200 dark:border-[#303238]"
                      }`}
                    >
                      {ROLE_LABELS[selectedEvent.actor_role]?.label || selectedEvent.actor_role}
                    </span>
                  </div>
                </div>
              </div>

              {/* O quê */}
              <div className="grid grid-cols-3 gap-2 py-2 border-b border-zinc-100 dark:border-[#303238]">
                <span className="text-zinc-500 dark:text-[#8E95A2] font-medium">Ação realizada</span>
                <div className="col-span-2 font-mono text-zinc-900 dark:text-white font-semibold">
                  {selectedEvent.action}
                </div>
              </div>

              {/* Para quem */}
              {selectedEvent.subject_name && (
                <div className="grid grid-cols-3 gap-2 py-2 border-b border-zinc-100 dark:border-[#303238]">
                  <span className="text-zinc-500 dark:text-[#8E95A2] font-medium">Para quem</span>
                  <div className="col-span-2">
                    <div className="font-semibold text-zinc-900 dark:text-white">
                      {selectedEvent.subject_name}
                    </div>
                    {selectedEvent.subject_email && (
                      <div className="text-zinc-500 dark:text-[#8E95A2] text-[11px]">
                        {selectedEvent.subject_email}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Quando */}
              <div className="grid grid-cols-3 gap-2 py-2 border-b border-zinc-100 dark:border-[#303238]">
                <span className="text-zinc-500 dark:text-[#8E95A2] font-medium">Data e Horário</span>
                <div className="col-span-2 font-mono text-zinc-900 dark:text-white">
                  {formatFullDate(selectedEvent.created_at)}
                </div>
              </div>

              {/* Módulo */}
              <div className="grid grid-cols-3 gap-2 py-2 border-b border-zinc-100 dark:border-[#303238]">
                <span className="text-zinc-500 dark:text-[#8E95A2] font-medium">Módulo</span>
                <div className="col-span-2 text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <span className="text-zinc-400 dark:text-[#8E95A2]">{renderModuleIcon(selectedEvent.module)}</span>
                  <span>{MODULE_NAMES[selectedEvent.module] || selectedEvent.module}</span>
                </div>
              </div>

              {/* Objeto relacionado */}
              {selectedEvent.resource_type && (
                <div className="grid grid-cols-3 gap-2 py-2 border-b border-zinc-100 dark:border-[#303238]">
                  <span className="text-zinc-500 dark:text-[#8E95A2] font-medium">Objeto Relacionado</span>
                  <div className="col-span-2">
                    <span className="font-mono text-zinc-900 dark:text-white">
                      {selectedEvent.resource_type}
                    </span>
                    {selectedEvent.resource_public_id && (
                      <div className="font-mono text-zinc-500 dark:text-[#8E95A2] text-[10px] truncate">
                        ID: {selectedEvent.resource_public_id}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sanitized Metadata */}
              {Boolean(selectedEvent.metadata_json) && (
                <div className="pt-2 space-y-2">
                  <span className="text-zinc-500 dark:text-[#8E95A2] font-medium block">
                    Metadados Operacionais
                  </span>
                  <pre className="bg-zinc-50 dark:bg-[#1B1D21] p-3 rounded-xl border border-zinc-200 dark:border-[#303238] font-mono text-[11px] text-zinc-800 dark:text-zinc-200 overflow-x-auto max-h-48">
                    {JSON.stringify(selectedEvent.metadata_json, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-zinc-100 dark:border-[#303238]">
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-[#1B1D21] dark:hover:bg-[#252830] text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-semibold transition min-h-[44px] cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
