"use client";

import React, { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  type ActivityEventRow,
  formatActivityEventNaturalSentence,
} from "@/lib/consultancies/activity-formatters";

interface Props {
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
  CONSULTANCY_ADMIN: { label: "Administrador", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  ADMIN: { label: "Administrador", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  PERSONAL: { label: "Personal", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  NUTRITIONIST: { label: "Nutricionista", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  STUDENT: { label: "Aluno", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  INFLUENCER: { label: "Influenciador", color: "bg-pink-500/10 text-pink-400 border-pink-500/20" },
  PLATFORM_ADMIN: { label: "Plataforma", color: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
};

const MODULE_LABELS: Record<string, { label: string; icon: string }> = {
  AUTH: { label: "Autenticação", icon: "🔐" },
  MEMBERS: { label: "Membros", icon: "👥" },
  STUDENT: { label: "Aluno", icon: "🏃" },
  PERSONAL: { label: "Treinos", icon: "🏋️" },
  NUTRITION: { label: "Nutrição", icon: "🥗" },
  FORMS: { label: "Formulários", icon: "📋" },
  CONSULTATIONS: { label: "Consultas", icon: "🩺" },
  FILES: { label: "Arquivos", icon: "📁" },
  AI: { label: "Inteligência Artificial", icon: "✨" },
  ADMIN: { label: "Gestão", icon: "⚙️" },
};

export function ConsultancyActivityCenterView({
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">Central de Atividades</h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)]">
            Acompanhe em tempo real e com transparência tudo o que acontece na consultoria.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center bg-[var(--surface-subtle)] p-1 rounded-xl border border-[var(--border-default)] text-xs">
            <button
              type="button"
              onClick={() => setViewMode("TIMELINE")}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                viewMode === "TIMELINE"
                  ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-2xs"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Linha do Tempo
            </button>
            <button
              type="button"
              onClick={() => setViewMode("TABLE")}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                viewMode === "TABLE"
                  ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-2xs"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Tabela
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] bg-[var(--surface-subtle)] px-3 py-1.5 rounded-xl border border-[var(--border-default)]">
            <span>Total:</span>
            <span className="font-semibold text-[var(--text-primary)]">{totalEvents}</span>
          </div>
        </div>
      </div>

      {/* Desktop Filters Bar */}
      <div className="hidden md:block bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-4 space-y-4 shadow-2xs">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por usuário, aluno, resumo ou ID..."
              className="w-full bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-xl px-3.5 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand)] transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  applyFilters({ search: "" });
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                Limpar
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-[var(--brand)] hover:opacity-90 text-white rounded-xl text-xs font-semibold transition shadow-xs"
          >
            Filtrar
          </button>
        </form>

        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[var(--border-subtle)]">
          {/* Período */}
          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Período</label>
            <select
              value={period}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="w-full bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-xl px-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]"
            >
              <option value="ALL">Todo o histórico</option>
              <option value="TODAY">Hoje</option>
              <option value="WEEK">Últimos 7 dias</option>
              <option value="MONTH">Últimos 30 dias</option>
            </select>
          </div>

          {/* Papel */}
          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Função / Papel</label>
            <select
              value={role}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="w-full bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-xl px-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]"
            >
              <option value="ALL">Todas as funções</option>
              <option value="CONSULTANCY_ADMIN">Administrador</option>
              <option value="PERSONAL">Personal</option>
              <option value="NUTRITIONIST">Nutricionista</option>
              <option value="STUDENT">Aluno</option>
            </select>
          </div>

          {/* Módulo */}
          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Módulo</label>
            <select
              value={selectedModule}
              onChange={(e) => handleModuleChange(e.target.value)}
              className="w-full bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-xl px-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand)]"
            >
              <option value="ALL">Todos os módulos</option>
              <option value="PERSONAL">Treinos</option>
              <option value="NUTRITION">Nutrição</option>
              <option value="AI">Inteligência Artificial</option>
              <option value="STUDENT">Alunos</option>
              <option value="MEMBERS">Equipe / Membros</option>
              <option value="ADMIN">Gestão</option>
            </select>
          </div>
        </div>
      </div>

      {/* Mobile Search & Filter Action Bar */}
      <div className="md:hidden flex items-center gap-2">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar atividade..."
            className="w-full bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand)]"
          />
        </form>
        <button
          type="button"
          onClick={() => setIsMobileFilterOpen(true)}
          className="px-3 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 shrink-0 shadow-2xs"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span>Filtros</span>
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-[var(--brand)] inline-block" />
          )}
        </button>
      </div>

      {/* Mobile Filter Bottom Sheet / Modal */}
      {isMobileFilterOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setIsMobileFilterOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[var(--surface)] border border-[var(--border-default)] rounded-t-3xl sm:rounded-2xl p-5 space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 className="font-bold text-sm text-[var(--text-primary)]">Filtros da Central</h3>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Período</label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-full bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)]"
                >
                  <option value="ALL">Todo o histórico</option>
                  <option value="TODAY">Hoje</option>
                  <option value="WEEK">Últimos 7 dias</option>
                  <option value="MONTH">Últimos 30 dias</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Função / Papel</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)]"
                >
                  <option value="ALL">Todas as funções</option>
                  <option value="CONSULTANCY_ADMIN">Administrador</option>
                  <option value="PERSONAL">Personal</option>
                  <option value="NUTRITIONIST">Nutricionista</option>
                  <option value="STUDENT">Aluno</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Módulo</label>
                <select
                  value={selectedModule}
                  onChange={(e) => setSelectedModule(e.target.value)}
                  className="w-full bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)]"
                >
                  <option value="ALL">Todos os módulos</option>
                  <option value="PERSONAL">Treinos</option>
                  <option value="NUTRITION">Nutrição</option>
                  <option value="AI">Inteligência Artificial</option>
                  <option value="STUDENT">Alunos</option>
                  <option value="MEMBERS">Equipe / Membros</option>
                  <option value="ADMIN">Gestão</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-[var(--border-subtle)]">
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
                  className="px-3 py-2 rounded-xl border border-[var(--border-default)] text-xs font-semibold text-[var(--text-secondary)]"
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
                className="flex-1 py-2 bg-[var(--brand)] text-white rounded-xl text-xs font-bold hover:opacity-90"
              >
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {initialEvents.length === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border-default)] rounded-2xl p-12 text-center space-y-3 shadow-2xs">
          <span className="text-3xl">📋</span>
          <h3 className="text-base font-bold text-[var(--text-primary)]">Nenhuma atividade registrada</h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto">
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
                <span className="text-xs font-bold text-[var(--brand)] uppercase tracking-wider bg-[var(--brand)]/10 px-2.5 py-0.5 rounded-md border border-[var(--brand)]/20">
                  {dayBucket}
                </span>
                <div className="h-px flex-1 bg-[var(--border-subtle)]" />
              </div>

              {/* Event cards */}
              <div className="space-y-2">
                {events.map((evt) => {
                  const { fullSentence } = formatActivityEventNaturalSentence(evt);
                  const roleConfig = ROLE_LABELS[evt.actor_role] || {
                    label: evt.actor_role,
                    color: "bg-muted text-muted-foreground border-border",
                  };
                  const modConfig = MODULE_LABELS[evt.module] || {
                    label: evt.module,
                    icon: "📍",
                  };

                  return (
                    <div
                      key={evt.public_id}
                      onClick={() => setSelectedEvent(evt)}
                      className="bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)] hover:border-[var(--brand)]/30 rounded-xl p-3 sm:p-3.5 transition cursor-pointer shadow-2xs group flex items-start gap-3"
                    >
                      {/* Time pill */}
                      <div className="shrink-0 font-mono text-xs font-semibold text-[var(--text-secondary)] group-hover:text-[var(--brand)] pt-0.5">
                        {formatTimeOnly(evt.created_at)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed">
                          {fullSentence}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${roleConfig.color}`}
                          >
                            {roleConfig.label}
                          </span>
                          <span className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1">
                            <span>{modConfig.icon}</span>
                            <span>{modConfig.label}</span>
                          </span>
                        </div>
                      </div>

                      {/* Detail CTA */}
                      <div className="shrink-0 text-xs text-[var(--text-tertiary)] group-hover:text-[var(--brand)] pt-0.5">
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
        <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border/50 text-muted-foreground uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Data / Hora</th>
                  <th className="py-3 px-4">Ator</th>
                  <th className="py-3 px-4">Função</th>
                  <th className="py-3 px-4">Módulo</th>
                  <th className="py-3 px-4">Descrição da Atividade</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {initialEvents.map((evt) => {
                  const { actor, fullSentence } = formatActivityEventNaturalSentence(evt);
                  const roleConfig = ROLE_LABELS[evt.actor_role] || {
                    label: evt.actor_role,
                    color: "bg-muted text-muted-foreground border-border",
                  };
                  const modConfig = MODULE_LABELS[evt.module] || {
                    label: evt.module,
                    icon: "📍",
                  };

                  return (
                    <tr
                      key={evt.public_id}
                      onClick={() => setSelectedEvent(evt)}
                      className="hover:bg-muted/30 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                        {formatFullDate(evt.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-foreground">{actor}</div>
                        <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">
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
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <span>{modConfig.icon}</span>
                          <span>{modConfig.label}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-md text-foreground/90">
                        {fullSentence}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          className="px-2 py-1 bg-muted/60 group-hover:bg-emerald-500/20 group-hover:text-emerald-400 rounded text-[10px] font-medium transition"
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
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end animate-in fade-in duration-150"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="w-full max-w-lg bg-card border-l border-border h-full overflow-y-auto p-6 space-y-6 shadow-2xl animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-start justify-between border-b border-border/40 pb-4">
              <div>
                <span className="text-xs font-mono text-muted-foreground">
                  ID: {selectedEvent.public_id}
                </span>
                <h2 className="text-lg font-bold text-foreground mt-1">
                  Detalhes da Atividade
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            {/* Sentence Summary Callout */}
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
              {formatActivityEventNaturalSentence(selectedEvent).fullSentence}
            </div>

            {/* Details Grid */}
            <div className="space-y-4 text-xs">
              {/* Quem */}
              <div className="grid grid-cols-3 gap-2 py-2 border-b border-border/30">
                <span className="text-muted-foreground font-medium">Quem realizou</span>
                <div className="col-span-2">
                  <div className="font-semibold text-foreground">
                    {selectedEvent.actor_name || "Usuário"}
                  </div>
                  {selectedEvent.actor_email && (
                    <div className="text-muted-foreground text-[11px]">
                      {selectedEvent.actor_email}
                    </div>
                  )}
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                        ROLE_LABELS[selectedEvent.actor_role]?.color || "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {ROLE_LABELS[selectedEvent.actor_role]?.label || selectedEvent.actor_role}
                    </span>
                  </div>
                </div>
              </div>

              {/* O quê */}
              <div className="grid grid-cols-3 gap-2 py-2 border-b border-border/30">
                <span className="text-muted-foreground font-medium">Ação realizada</span>
                <div className="col-span-2 font-mono text-foreground font-semibold">
                  {selectedEvent.action}
                </div>
              </div>

              {/* Para quem */}
              {selectedEvent.subject_name && (
                <div className="grid grid-cols-3 gap-2 py-2 border-b border-border/30">
                  <span className="text-muted-foreground font-medium">Para quem</span>
                  <div className="col-span-2">
                    <div className="font-semibold text-foreground">
                      {selectedEvent.subject_name}
                    </div>
                    {selectedEvent.subject_email && (
                      <div className="text-muted-foreground text-[11px]">
                        {selectedEvent.subject_email}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Quando */}
              <div className="grid grid-cols-3 gap-2 py-2 border-b border-border/30">
                <span className="text-muted-foreground font-medium">Data e Horário</span>
                <div className="col-span-2 font-mono text-foreground">
                  {formatFullDate(selectedEvent.created_at)}
                </div>
              </div>

              {/* Módulo */}
              <div className="grid grid-cols-3 gap-2 py-2 border-b border-border/30">
                <span className="text-muted-foreground font-medium">Módulo</span>
                <div className="col-span-2 text-foreground flex items-center gap-1.5">
                  <span>{MODULE_LABELS[selectedEvent.module]?.icon || "📍"}</span>
                  <span>{MODULE_LABELS[selectedEvent.module]?.label || selectedEvent.module}</span>
                </div>
              </div>

              {/* Objeto relacionado */}
              {selectedEvent.resource_type && (
                <div className="grid grid-cols-3 gap-2 py-2 border-b border-border/30">
                  <span className="text-muted-foreground font-medium">Objeto Relacionado</span>
                  <div className="col-span-2">
                    <span className="font-mono text-foreground">
                      {selectedEvent.resource_type}
                    </span>
                    {selectedEvent.resource_public_id && (
                      <div className="font-mono text-muted-foreground text-[10px] truncate">
                        ID: {selectedEvent.resource_public_id}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sanitized Metadata */}
              {Boolean(selectedEvent.metadata_json) && (
                <div className="pt-2 space-y-2">
                  <span className="text-muted-foreground font-medium block">
                    Metadados Operacionais
                  </span>
                  <pre className="bg-muted/40 p-3 rounded-lg border border-border/40 font-mono text-[11px] text-foreground overflow-x-auto max-h-48">
                    {JSON.stringify(selectedEvent.metadata_json, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-border/40">
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="w-full py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-xs font-medium transition"
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
